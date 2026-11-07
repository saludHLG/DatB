/**
 * Edge Function: datb-profile
 *
 * Acciones de perfil. Se invoca desde el cliente con la sesión del usuario.
 * Este archivo refleja la version desplegada y anade la accion
 * `admin_reset_pin`, que permite a un administrador restablecer el PIN de
 * otro usuario.
 *
 * Por que hace falta el servidor
 * La contrasena real vive en auth.users, no en public.usuarios. Cambiarla
 * por otra persona exige la Admin API con la service_role, que nunca debe
 * llegar al navegador. Por eso la comprobacion de permisos y el cambio se
 * hacen aqui.
 *
 * Despliegue:
 *   supabase functions deploy datb-profile --project-ref <ref>
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
 *
 * Variables disponibles en el runtime de Supabase:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Correo tecnico con el que Auth identifica al usuario. */
const technicalEmail = (nombreUsuario: string) =>
  `${String(nombreUsuario).trim().toLowerCase()}@auth.datb.invalid`

/** Hash del PIN, igual que en el cliente: SHA-256 de "DatB:usuario:pin". */
async function pinHash(nombreUsuario: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(
    `DatB:${String(nombreUsuario).trim().toLowerCase()}:${pin}`,
  )
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Sesión no válida.' }, 401)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Cliente con la sesion del llamante: sirve para saber quien es.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: authData, error: authError } = await asUser.auth.getUser()
    if (authError || !authData?.user) {
      return json({ error: 'Sesión no válida.' }, 401)
    }

    const callerId = authData.user.user_metadata?.usuario_id as string | undefined
    if (!callerId) {
      return json({ error: 'La identidad no está vinculada a un usuario DatB.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')

    // Cliente administrativo: solo dentro de esta funcion.
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Comprobar que el llamante es administrador activo ────────
    const { data: caller, error: callerError } = await admin
      .from('usuarios')
      .select('id, rol_sistema_id, activo, aprobado, nombres, apellidos')
      .eq('id', callerId)
      .maybeSingle()

    if (callerError || !caller) {
      return json({ error: 'No se pudo cargar el perfil del solicitante.' }, 403)
    }
    const esAdmin =
      Number(caller.rol_sistema_id) === 6 && caller.activo && caller.aprobado

    /* ── admin_reset_pin ──────────────────────────────────────── */
    if (action === 'admin_reset_pin') {
      if (!esAdmin) {
        return json({ error: 'Solo un administrador puede restablecer PIN.' }, 403)
      }

      const usuarioId = String(body.usuario_id ?? '')
      const newPin = String(body.new_pin ?? '')

      if (!usuarioId) return json({ error: 'Falta el usuario.' }, 400)
      if (!/^\d{4}$/.test(newPin)) {
        return json({ error: 'El PIN debe tener exactamente 4 dígitos.' }, 400)
      }
      if (usuarioId === callerId) {
        return json({ error: 'No puede restablecer su propio PIN; use Mi perfil.' }, 400)
      }

      const { data: target, error: targetError } = await admin
        .from('usuarios')
        .select('id, nombre_usuario, ci, pin_hash')
        .eq('id', usuarioId)
        .maybeSingle()

      if (targetError || !target) {
        return json({ error: 'Usuario no encontrado.' }, 404)
      }

      // El usuario debe existir en Auth. Se busca por id; si no hay
      // nombre_usuario no se puede derivar la contraseña.
      const username = target.nombre_usuario || target.ci
      if (!username) {
        return json(
          { error: 'El usuario no tiene nombre de usuario; no se puede autenticar.' },
          409,
        )
      }

      const hash = await pinHash(username, newPin)

      const { error: updateAuthError } = await admin.auth.admin.updateUserById(
        usuarioId,
        {
          email: technicalEmail(username),
          password: hash,
          email_confirm: true,
        },
      )
      if (updateAuthError) {
        return json(
          { error: `No se pudo actualizar la contraseña: ${updateAuthError.message}` },
          502,
        )
      }

      // pin_hash de public.usuarios es informativo: la autenticacion real
      // la hace Auth. Se mantiene sincronizado por coherencia.
      await admin.from('usuarios').update({ pin_hash: hash }).eq('id', usuarioId)

      console.log(
        `admin_reset_pin: ${caller.nombres} ${caller.apellidos} -> usuario ${usuarioId}`,
      )

      return json({ ok: true, usuario_id: usuarioId })
    }

    /* ── Acciones existentes del propio usuario ─────────────────── */

    if (action === 'change_pin') {
      const oldPin = String(body.old_pin ?? '')
      const newPin = String(body.new_pin ?? '')
      if (!/^\d{4}$/.test(newPin)) {
        return json({ error: 'El PIN nuevo debe tener 4 dígitos.' }, 400)
      }

      const { data: me } = await admin
        .from('usuarios')
        .select('id, nombre_usuario, ci')
        .eq('id', callerId)
        .maybeSingle()
      if (!me) return json({ error: 'Usuario no encontrado.' }, 404)

      const username = me.nombre_usuario || me.ci
      // Verificar el PIN anterior contra lo guardado.
      const { data: stored } = await admin
        .from('usuarios')
        .select('pin_hash')
        .eq('id', callerId)
        .maybeSingle()
      if (stored?.pin_hash && stored.pin_hash !== (await pinHash(username, oldPin))) {
        return json({ error: 'El PIN actual no es correcto.' }, 400)
      }

      const hash = await pinHash(username, newPin)
      const { error } = await admin.auth.admin.updateUserById(callerId, {
        password: hash,
      })
      if (error) return json({ error: error.message }, 502)
      await admin.from('usuarios').update({ pin_hash: hash }).eq('id', callerId)
      return json({ ok: true })
    }

    if (action === 'change_username') {
      const nuevo = String(body.new_nombre_usuario ?? '').trim().toLowerCase()
      const pin = String(body.pin ?? '')
      if (!/^[a-z0-9]{5,24}$/.test(nuevo)) {
        return json({ error: 'El nombre de usuario debe usar minúsculas y dígitos (5–24).' }, 400)
      }
      const hash = await pinHash(nuevo, pin)
      const { error } = await admin.auth.admin.updateUserById(callerId, {
        email: technicalEmail(nuevo),
        password: hash,
      })
      if (error) return json({ error: error.message }, 502)
      await admin
        .from('usuarios')
        .update({ nombre_usuario: nuevo, pin_hash: hash })
        .eq('id', callerId)
      return json({ ok: true })
    }

    return json({ error: 'Acción no reconocida.' }, 400)
  } catch (e) {
    console.error('datb-profile error:', e)
    return json({ error: 'Error interno.' }, 500)
  }
})
