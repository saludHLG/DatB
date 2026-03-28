/* ================================================================
   supabase_client.js — Capa de datos DatB
   Sin Supabase Auth: login/registro directo sobre tabla usuarios.
   Requiere: patch_no_auth.sql aplicado.
   ================================================================ */

(function (global) {
    'use strict';

    /* ── Cliente singleton ──────────────────────────────────── */
    let _sb = null;
    function _client() {
        if (_sb) return _sb;
        if (
            typeof supabase === 'undefined' ||
            typeof SUPABASE_URL  === 'undefined' ||
            typeof SUPABASE_ANON === 'undefined' ||
            SUPABASE_URL.includes('TU_PROYECTO')
        ) return null;
        try {
            _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        } catch (e) {
            console.warn('supabase_client: no se pudo inicializar.', e);
        }
        return _sb;
    }

    /** true cuando Supabase está configurado y disponible */
    global.IS_ONLINE = () => !!_client();

    /* ================================================================
       HELPERS GENÉRICOS
       ================================================================ */

    /** Upsert de un array completo a una tabla de Supabase */
    global.sbUpsertRows = async function (tabla, rows) {
        const sb = _client();
        if (!sb || !rows?.length) return;
        const { error } = await sb.from(tabla).upsert(rows);
        if (error) console.error('sbUpsertRows:', tabla, error.message);
    };

    /** Eliminar una fila por campo=valor */
    global.sbDeleteRow = async function (tabla, id, campo = 'id') {
        const sb = _client();
        if (!sb || id === undefined || id === null) return;
        const { error } = await sb.from(tabla).delete().eq(campo, id);
        if (error) console.error('sbDeleteRow:', tabla, campo, '=', id, error.message);
    };

    /**
     * Reemplaza todos los permisos de laboratorio de un usuario.
     * Hace DELETE + INSERT para garantizar consistencia (evita duplicados
     * causados por permisos creados sin id en localStorage).
     */
    global.sbReplaceUserPerms = async function (userId, perms) {
        const sb = _client();
        if (!sb) return;
        const { error: delErr } = await sb
            .from('permisos_lab').delete().eq('usuario_id', userId);
        if (delErr) { console.error('sbReplaceUserPerms delete:', delErr.message); return; }
        if (!perms?.length) return;
        // Quitar id local (puede ser undefined o un id viejo que ya no existe)
        const toInsert = perms.map(({ id, ...rest }) => rest);
        const { error: insErr } = await sb.from('permisos_lab').insert(toInsert);
        if (insErr) console.error('sbReplaceUserPerms insert:', insErr.message);
    };

    /* ================================================================
       AUTH — directo sobre tabla usuarios (sin Supabase Auth)
       ================================================================ */

    global.sbLogin = async function (ci, pin) {
        const sb = _client();
        const pinHash = hashPin(String(pin));

        if (!sb) {
            const user = (typeof getUsers === 'function' ? getUsers() : [])
                .find(u => u.ci === ci && u.pin_hash === pinHash);
            if (!user)        return { user: null, error: 'CI o PIN incorrecto.' };
            if (!user.activo) return { user: null, error: 'Cuenta desactivada.' };
            return { user, error: null };
        }

        const { data, error } = await sb
            .from('usuarios')
            .select('*')
            .eq('ci', ci)
            .eq('pin_hash', pinHash)
            .single();

        if (error || !data) return { user: null, error: 'CI o PIN incorrecto.' };
        if (!data.activo)   return { user: null, error: 'Cuenta desactivada.' };

        _cacheUser(data);
        sessionStorage.setItem('sr_active_user', data.id);
        return { user: data, error: null };
    };

    global.sbRegister = async function (perfil, pin) {
        const sb = _client();
        const pinHash = hashPin(String(pin));

        if (!sb) {
            const users = typeof getUsers === 'function' ? getUsers() : [];
            if (users.find(u => u.ci === perfil.ci))
                return { error: 'Este CI ya está registrado.' };
            if (typeof saveUsers === 'function')
                saveUsers([...users, { ...perfil, pin_hash: pinHash }]);
            return { error: null };
        }

        // Verificar CI duplicado
        const { data: existing } = await sb
            .from('usuarios')
            .select('id')
            .eq('ci', perfil.ci)
            .maybeSingle();

        if (existing) return { error: 'Este CI ya está registrado.' };

        const nuevoId = perfil.id || crypto.randomUUID();
        const { error: insErr } = await sb.from('usuarios').insert({
            ...perfil,
            id       : nuevoId,
            pin_hash : pinHash,
            creado_en: new Date().toISOString(),
        });

        if (insErr) return { error: insErr.message };
        return { error: null };
    };

    global.sbLogout = async function () {
        sessionStorage.removeItem('sr_active_user');
    };

    global.sbGetSession = async function () {
        const sb = _client();
        const uid = sessionStorage.getItem('sr_active_user');

        if (!sb) {
            if (!uid) return null;
            return (typeof getUsers === 'function' ? getUsers() : [])
                .find(u => u.id === uid && u.activo) || null;
        }

        if (!uid) return null;

        const { data } = await sb
            .from('usuarios').select('*').eq('id', uid).single();

        if (data && data.activo) {
            _cacheUser(data);
            return data;
        }
        return null;
    };

    global.sbChangePin = async function (userId, newPin) {
        const sb = _client();
        const newHash = hashPin(String(newPin));

        // Actualizar localStorage
        if (typeof getUsers === 'function' && typeof saveUsers === 'function') {
            const users = getUsers();
            const idx = users.findIndex(u => u.id === userId);
            if (idx !== -1) { users[idx].pin_hash = newHash; saveUsers(users); }
        }

        if (!sb) return { error: null };

        const { error } = await sb
            .from('usuarios').update({ pin_hash: newHash }).eq('id', userId);
        return { error: error?.message || null };
    };

    /* ================================================================
       USUARIOS
       ================================================================ */

    /**
     * Carga usuarios desde Supabase y actualiza localStorage directamente
     * (sin llamar a saveUsers para evitar un upsert circular).
     */
    global.sbGetUsers = async function () {
        const sb = _client();
        if (!sb) return typeof getUsers === 'function' ? getUsers() : [];
        const { data, error } = await sb.from('usuarios').select('*');
        if (error) { console.error('sbGetUsers:', error.message); return []; }
        localStorage.setItem('sr_usuarios', JSON.stringify(data));
        return data;
    };

    global.sbUpsertUser = async function (user) {
        if (typeof getUsers === 'function' && typeof saveUsers === 'function') {
            const users = getUsers();
            const idx = users.findIndex(u => u.id === user.id);
            if (idx !== -1) users[idx] = user; else users.push(user);
            saveUsers(users);
        }
        const sb = _client();
        if (!sb) return;
        const { error } = await sb.from('usuarios').upsert(user);
        if (error) console.error('sbUpsertUser:', error.message);
    };

    global.sbDeleteUser = async function (userId) {
        if (typeof getUsers === 'function' && typeof saveUsers === 'function')
            saveUsers(getUsers().filter(u => u.id !== userId));
        const sb = _client();
        if (!sb) return;
        await sb.from('usuarios').delete().eq('id', userId);
    };

    /* ================================================================
       PERMISOS DE LABORATORIO
       ================================================================ */

    global.sbGetPermisos = async function () {
        const sb = _client();
        const LS = 'sr_permisos_lab';
        if (!sb) return JSON.parse(localStorage.getItem(LS) || '[]');
        const { data } = await sb.from('permisos_lab').select('*');
        if (data) localStorage.setItem(LS, JSON.stringify(data));
        return data || [];
    };

    global.sbSavePermisos = async function (perms) {
        localStorage.setItem('sr_permisos_lab', JSON.stringify(perms));
        const sb = _client();
        if (!sb || !perms.length) return;
        const { error } = await sb.from('permisos_lab').upsert(perms);
        if (error) console.error('sbSavePermisos:', error.message);
    };

    /* ================================================================
       DATOS GEOGRÁFICOS
       ================================================================ */

    global.sbInitGeo = async function () {
        const sb = _client();
        if (!sb) return;

        const [p, m, c, l] = await Promise.all([
            sb.from('provincias').select('*').order('nombre'),
            sb.from('municipios').select('*').order('nombre'),
            sb.from('centros_salud').select('*').order('nombre'),
            sb.from('laboratorios').select('*').order('nombre'),
        ]);

        if (p.data?.length) localStorage.setItem('sr_geo_provincias', JSON.stringify(p.data));
        if (m.data?.length) localStorage.setItem('sr_geo_municipios',  JSON.stringify(m.data));
        if (c.data?.length) localStorage.setItem('sr_geo_centros',     JSON.stringify(c.data));
        if (l.data?.length) localStorage.setItem('sr_geo_labs',        JSON.stringify(l.data));
    };

    global.sbUpsertGeo = async function (tabla, item) {
        const sb = _client();
        if (!sb) return;
        const { error } = await sb.from(tabla).upsert(item);
        if (error) console.error('sbUpsertGeo:', tabla, error.message);
    };

    global.sbDeleteGeo = async function (tabla, id) {
        const sb = _client();
        if (!sb) return;
        await sb.from(tabla).delete().eq('id', id);
    };

    /* ================================================================
       CATÁLOGOS
       ================================================================ */

    const _CAT_TABLA = {
        sr_grupos_vulnerables: 'grupos_vulnerables',
        sr_tipos_muestra      : 'tipos_muestra',
        sr_microorganismos    : 'microorganismos',
    };

    global.sbSyncCatalogo = async function (lsKey, data) {
        localStorage.setItem(lsKey, JSON.stringify(data));
        const sb    = _client();
        const tabla = _CAT_TABLA[lsKey];
        if (!sb || !tabla) return;
        const { error } = await sb.from(tabla).upsert(data);
        if (error) console.error('sbSyncCatalogo:', tabla, error.message);
    };

    /* ================================================================
       PACIENTES
       ================================================================ */

    global.sbGetPacientes = async function () {
        const sb = _client();
        const LS = 'sr_pacientes';
        if (!sb) return JSON.parse(localStorage.getItem(LS) || '[]');
        const { data } = await sb.from('pacientes').select('*');
        if (data) localStorage.setItem(LS, JSON.stringify(data));
        return data || [];
    };

    global.sbSavePaciente = async function (pac) {
        const LS = 'sr_pacientes';
        const arr = JSON.parse(localStorage.getItem(LS) || '[]');
        const idx = arr.findIndex(p => p.id === pac.id);
        if (idx !== -1) arr[idx] = pac; else arr.push(pac);
        localStorage.setItem(LS, JSON.stringify(arr));
        const sb = _client();
        if (!sb) return;
        const { error } = await sb.from('pacientes').upsert(pac);
        if (error) console.error('sbSavePaciente:', error.message);
    };

    /* ================================================================
       INDICACIONES
       ================================================================ */

    global.sbGetIndicaciones = async function () {
        const sb = _client();
        const LS = 'sr_indicaciones';
        if (!sb) return JSON.parse(localStorage.getItem(LS) || '[]');
        const { data } = await sb.from('indicaciones_examen')
            .select('*, indicacion_examenes(examen_id)');
        if (data) {
            const adapted = data.map(ind => ({
                ...ind,
                examenes_ids: (ind.indicacion_examenes || []).map(r => r.examen_id),
            }));
            localStorage.setItem(LS, JSON.stringify(adapted));
            return adapted;
        }
        return [];
    };

    global.sbSaveIndicacion = async function (ind, exIds) {
        const LS = 'sr_indicaciones';
        const arr = JSON.parse(localStorage.getItem(LS) || '[]');
        const idx = arr.findIndex(i => i.id === ind.id);
        if (idx !== -1) arr[idx] = ind; else arr.push(ind);
        localStorage.setItem(LS, JSON.stringify(arr));
        const sb = _client();
        if (!sb) return;
        const { error } = await sb.from('indicaciones_examen').upsert(ind);
        if (error) { console.error('sbSaveIndicacion:', error.message); return; }
        if (exIds?.length) {
            await sb.from('indicacion_examenes').delete().eq('indicacion_id', ind.id);
            await sb.from('indicacion_examenes')
                .insert(exIds.map(eid => ({ indicacion_id: ind.id, examen_id: eid })));
        }
    };

    global.sbDeleteIndicacion = async function (indId) {
        const LS = 'sr_indicaciones';
        localStorage.setItem(LS, JSON.stringify(
            JSON.parse(localStorage.getItem(LS) || '[]').filter(i => i.id !== indId)
        ));
        const sb = _client();
        if (sb) await sb.from('indicaciones_examen').delete().eq('id', indId);
    };

    /* ================================================================
       RECEPCIONES DE MUESTRA
       ================================================================ */

    global.sbGetRecepciones = async function () {
        const sb = _client();
        const LS = 'sr_recepciones';
        if (!sb) return JSON.parse(localStorage.getItem(LS) || '[]');
        const { data } = await sb.from('recepciones_muestra').select('*');
        if (data) localStorage.setItem(LS, JSON.stringify(data));
        return data || [];
    };

    global.sbSaveRecepcion = async function (rec) {
        const LS = 'sr_recepciones';
        const arr = JSON.parse(localStorage.getItem(LS) || '[]');
        const idx = arr.findIndex(r => r.id === rec.id);
        if (idx !== -1) arr[idx] = rec; else arr.push(rec);
        localStorage.setItem(LS, JSON.stringify(arr));
        const sb = _client();
        if (!sb) return;
        const { error } = await sb.from('recepciones_muestra').upsert(rec);
        if (error) console.error('sbSaveRecepcion:', error.message);
    };

    global.sbDeleteRecepcion = async function (recId) {
        const LS = 'sr_recepciones';
        localStorage.setItem(LS, JSON.stringify(
            JSON.parse(localStorage.getItem(LS) || '[]').filter(r => r.id !== recId)
        ));
        const sb = _client();
        if (sb) await sb.from('recepciones_muestra').delete().eq('id', recId);
    };

    /* ================================================================
       RESULTADOS DE LABORATORIO
       ================================================================ */

    const _RES_MAP = {
        baci        : { ls: 'sr_res_baci',        tabla: 'resultados_baciloscopia' },
        cultivo     : { ls: 'sr_res_cultivo',      tabla: 'resultados_cultivo'     },
        xpert_ultra : { ls: 'sr_res_xpert_ultra',  tabla: 'resultados_xpert_ultra' },
        xpert_xdr   : { ls: 'sr_res_xpert_xdr',    tabla: 'resultados_xpert_xdr'   },
    };

    global.sbSaveResultado = async function (tipo, item) {
        const m = _RES_MAP[tipo]; if (!m) return;
        const arr = JSON.parse(localStorage.getItem(m.ls) || '[]');
        const idx = arr.findIndex(r => r.id === item.id);
        if (idx !== -1) arr[idx] = item; else arr.push(item);
        localStorage.setItem(m.ls, JSON.stringify(arr));
        const sb = _client();
        if (!sb) return;
        const { error } = await sb.from(m.tabla).upsert(item);
        if (error) console.error('sbSaveResultado:', tipo, error.message);
    };

    global.sbDeleteResultado = async function (tipo, id) {
        const m = _RES_MAP[tipo]; if (!m) return;
        localStorage.setItem(m.ls, JSON.stringify(
            JSON.parse(localStorage.getItem(m.ls) || '[]').filter(r => r.id !== id)
        ));
        const sb = _client();
        if (sb) await sb.from(m.tabla).delete().eq('id', id);
    };

    /* ================================================================
       ACCESOS TEMPORALES
       ================================================================ */

    global.sbGetAccesos = async function () {
        const sb = _client();
        const LS = 'sr_accesos_temp';
        if (!sb) return JSON.parse(localStorage.getItem(LS) || '[]');
        const { data } = await sb.from('accesos_temporales').select('*');
        if (data) localStorage.setItem(LS, JSON.stringify(data));
        return data || [];
    };

    global.sbSaveAcceso = async function (acc) {
        const LS = 'sr_accesos_temp';
        const arr = JSON.parse(localStorage.getItem(LS) || '[]');
        const idx = arr.findIndex(a => a.id === acc.id);
        if (idx !== -1) arr[idx] = acc; else arr.push(acc);
        localStorage.setItem(LS, JSON.stringify(arr));
        const sb = _client();
        if (!sb) return;
        await sb.from('accesos_temporales').upsert(acc);
    };

    /* ================================================================
       HELPER INTERNO
       ================================================================ */

    function _cacheUser(user) {
        if (typeof getUsers !== 'function' || typeof saveUsers !== 'function') return;
        const users = getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) users[idx] = user; else users.push(user);
        // Actualizar localStorage directamente para no disparar upsert circular
        localStorage.setItem('sr_usuarios', JSON.stringify(users));
    }

}(window));
