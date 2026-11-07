# Edge Functions

Código de las funciones que se ejecutan en Supabase. **Deben desplegarse
después de cualquier cambio**: sin ello, el frontend llama a una versión
antigua.

## Datos

| Función | Qué hace |
|---|---|
| `datb-provision` | Alta de cuentas y verificación de credenciales |
| `datb-profile` | Cambio de PIN, de nombre de usuario y **reseteo de PIN por el administrador** |

> `datb-provision` no está versionada todavía. Descárguela con
> `supabase functions download datb-provision` y hágala commit para que el
> despliegue sea reproducible.

## Requisitos

Ambas necesitan la `service_role` key, que **nunca** debe llegar al
navegador. Configúrela como secreto del proyecto:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
```

Supabase inyecta además `SUPABASE_URL` y `SUPABASE_ANON_KEY` de forma
automática.

## Desplegar

```bash
supabase login
supabase link --project-ref arbdhyeycvyskjgpjlmn
supabase functions deploy datb-profile
```

Para probar en local antes de publicar:

```bash
supabase functions serve datb-profile
```

## `datb-profile`

### `admin_reset_pin`

Permite a un administrador restablecer el PIN de otro usuario que no
puede hacerlo por sí mismo.

**Por qué en el servidor.** La contraseña real vive en `auth.users`, no en
`public.usuarios`. Cambiarla por otra persona exige la Admin API con la
`service_role`. `usuarios.pin_hash` es solo informativo: la autenticación
la hace Supabase Auth.

**Cuerpo:**

```json
{ "action": "admin_reset_pin", "usuario_id": "<uuid>", "new_pin": "1234" }
```

**Comprobaciones, todas en el servidor:**

1. Sesión válida (`auth.users`).
2. El solicitante tiene `rol_sistema_id = 6`, `activo` y `aprobado`.
3. El PIN destino tiene exactamente 4 dígitos.
4. No puede restablecer su propio PIN (para eso está «Mi perfil»).
5. El usuario destino existe y tiene nombre de usuario.

Después actualiza la contraseña en Auth y sincroniza `pin_hash`. Deja
constancia en el log de la función con el nombre del administrador y el
id del usuario afectado.

### `change_pin` y `change_username`

Acciones del propio usuario. `change_pin` exige el PIN anterior.

## Firma digital

No pasa por aquí. `usuarios.firma_perfil` se escribe desde el cliente y
RLS ya permite al administrador modificarla; el panel ofrece borrarla
para que el usuario la vuelva a crear.
