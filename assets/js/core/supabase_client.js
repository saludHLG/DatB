/* ================================================================
   supabase_client.js — Capa de datos DatB
   Store en memoria (_store) + Supabase. Sin localStorage.
   ================================================================ */

/* ── Store global en memoria ─────────────────────────────────── */
window._store = {
    usuarios:           [],
    permisos_lab:       [],
    accesos_temp:       [],
    pacientes:          [],
    indicaciones:       [],
    recepciones:        [],
    res_baci:           [],
    res_cultivo:        [],
    res_xpert_ultra:    [],
    res_xpert_xdr:      [],
    geo_provincias:     [],
    geo_municipios:     [],
    geo_centros:        [],
    geo_labs:            [],
    grupos_vulnerables: [],
    tipos_muestra:      [],
    microorganismos:    [],
};

/* ── Cliente singleton ──────────────────────────────────────── */
let _sb = null;
function _client() {
    if (_sb) return _sb;
    if (
        typeof supabase    === 'undefined' ||
        typeof SUPABASE_URL  === 'undefined' ||
        typeof SUPABASE_ANON === 'undefined' ||
        SUPABASE_URL.includes('TU_PROYECTO')
    ) return null;
    try { _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON); }
    catch (e) { console.warn('supabase_client: init error', e); }
    return _sb;
}

window.IS_ONLINE = () => !!_client();

/* ================================================================
   CARGA COMPLETA — sbInitAll

   Importante: el arranque anónimo solo carga catálogos y geografía.
   Tablas de usuarios/datos operativos se consultan únicamente cuando
   Supabase Auth ya tiene una sesión válida. Así el login no dispara
   401 por RLS antes de autenticar al usuario.
   ================================================================ */
window.sbInitAll = async function () {
    const sb = _client();
    if (!sb) { console.warn('Supabase no configurado — store vacío.'); return; }

    try {
        const { data: authData } = await sb.auth.getUser();
        const authenticated = !!authData?.user;

        const publicLoads = await Promise.allSettled([
            sb.from('provincias').select('*').order('nombre'),
            sb.from('municipios').select('*').order('nombre'),
            sb.from('centros_salud').select('*').order('nombre'),
            sb.from('laboratorios').select('*').order('nombre'),
            sb.from('grupos_vulnerables').select('*'),
            sb.from('tipos_muestra').select('*'),
            sb.from('microorganismos').select('*'),
        ]);

        const d = r => (r.status === 'fulfilled' && r.value.data) ? r.value.data : null;

        if (d(publicLoads[0])) _store.geo_provincias   = d(publicLoads[0]);
        if (d(publicLoads[1])) _store.geo_municipios   = d(publicLoads[1]);
        if (d(publicLoads[2])) _store.geo_centros      = d(publicLoads[2]);
        if (d(publicLoads[3])) _store.geo_labs         = d(publicLoads[3]);
        if (d(publicLoads[4])) _store.grupos_vulnerables = d(publicLoads[4]);
        if (d(publicLoads[5])) _store.tipos_muestra    = d(publicLoads[5]);
        if (d(publicLoads[6])) _store.microorganismos  = d(publicLoads[6]);

        if (!authenticated) return;

        const protectedLoads = await Promise.allSettled([
            sb.from('usuarios').select('*'),
            sb.from('permisos_lab').select('*'),
            sb.from('accesos_temporales').select('*'),
            sb.from('pacientes').select('*'),
            sb.from('indicaciones_examen').select('*'),
            sb.from('indicacion_examenes').select('*'),
            sb.from('recepciones_muestra').select('*'),
            sb.from('resultados_baciloscopia').select('*'),
            sb.from('resultados_cultivo').select('*'),
            sb.from('resultados_xpert_ultra').select('*'),
            sb.from('resultados_xpert_xdr').select('*'),
        ]);

        if (d(protectedLoads[0])) _store.usuarios       = d(protectedLoads[0]);
        if (d(protectedLoads[1])) _store.permisos_lab   = d(protectedLoads[1]);
        if (d(protectedLoads[2])) _store.accesos_temp   = d(protectedLoads[2]);
        if (d(protectedLoads[3])) _store.pacientes      = d(protectedLoads[3]);
        if (d(protectedLoads[6])) _store.recepciones    = d(protectedLoads[6]);
        if (d(protectedLoads[7])) _store.res_baci       = d(protectedLoads[7]);
        if (d(protectedLoads[8])) _store.res_cultivo    = d(protectedLoads[8]);
        if (d(protectedLoads[9])) _store.res_xpert_ultra = d(protectedLoads[9]);
        if (d(protectedLoads[10])) _store.res_xpert_xdr  = d(protectedLoads[10]);

        if (d(protectedLoads[4])) {
            const indExams = d(protectedLoads[5]) || [];
            _store.indicaciones = d(protectedLoads[4]).map(ind => ({
                ...ind,
                examenes_ids: (ind.examenes_ids && ind.examenes_ids.length > 0)
                    ? ind.examenes_ids
                    : indExams
                        .filter(ie => ie.indicacion_id === ind.id)
                        .map(ie => ie.examen_id),
            }));
        }
    } catch (e) {
        console.error('sbInitAll error:', e);
    }
};

/* ================================================================
   AUTH — compatibilidad legacy. El bridge Auth (`auth_bridge.js`)
   reemplaza estas funciones en el runtime principal.
   ================================================================ */
window.sbLogin = async function (ci, pin) {
    const sb = _client();
    if (!sb) return { user: null, error: 'Sin conexión a Supabase.' };
    const pinHash = hashPin(String(pin));

    const { data, error } = await sb
        .from('usuarios').select('*')
        .eq('ci', ci).eq('pin_hash', pinHash).single();

    if (error || !data) return { user: null, error: 'CI o PIN incorrecto.' };
    if (!data.activo)   return { user: null, error: 'Cuenta desactivada.' };

    const idx = _store.usuarios.findIndex(u => u.id === data.id);
    if (idx !== -1) _store.usuarios[idx] = data; else _store.usuarios.push(data);
    if (!_store.firmas) _store.firmas = {};
    if (data.firma_perfil) _store.firmas[`sr_firma_${data.id}`] = data.firma_perfil;
    sessionStorage.setItem('sr_active_user', data.id);
    return { user: data, error: null };
};

window.sbRegister = async function (perfil, pin) {
    const sb = _client();
    if (!sb) return { error: 'Sin conexión a Supabase.' };
    const pinHash = hashPin(String(pin));

    const { data: existing } = await sb
        .from('usuarios').select('id').eq('ci', perfil.ci).maybeSingle();
    if (existing) return { error: 'Este CI ya está registrado.' };

    const nuevoId = perfil.id || crypto.randomUUID();
    const row = { ...perfil, id: nuevoId, pin_hash: pinHash, creado_en: new Date().toISOString() };
    const { error } = await sb.from('usuarios').insert(row);
    if (error) return { error: error.message };

    _store.usuarios.push(row);
    return { error: null };
};

window.sbLogout = async function () {
    sessionStorage.removeItem('sr_active_user');
};

window.sbGetSession = async function () {
    const sb = _client();
    const uid = sessionStorage.getItem('sr_active_user');
    if (!uid) return null;

    let user = _store.usuarios.find(u => u.id === uid && u.activo);
    if (user) {
        if (!_store.firmas) _store.firmas = {};
        if (user.firma_perfil) _store.firmas[`sr_firma_${user.id}`] = user.firma_perfil;
        return user;
    }

    if (!sb) return null;
    const { data } = await sb.from('usuarios').select('*').eq('id', uid).single();
    if (data && data.activo) {
        const idx = _store.usuarios.findIndex(u => u.id === uid);
        if (idx !== -1) _store.usuarios[idx] = data; else _store.usuarios.push(data);
        if (!_store.firmas) _store.firmas = {};
        if (data.firma_perfil) _store.firmas[`sr_firma_${data.id}`] = data.firma_perfil;
        return data;
    }
    return null;
};

window.sbChangePin = async function (userId, newPin) {
    const sb = _client();
    const newHash = hashPin(String(newPin));
    const idx = _store.usuarios.findIndex(u => u.id === userId);
    if (idx !== -1) _store.usuarios[idx].pin_hash = newHash;
    if (!sb) return { error: null };
    const { error } = await sb.from('usuarios').update({ pin_hash: newHash }).eq('id', userId);
    return { error: error?.message || null };
};

/* ================================================================
   HELPERS CRUD GENÉRICOS
   ================================================================ */
window.sbUpsertRow = async function (tabla, row) {
    const sb = _client(); if (!sb || !row) return;
    const { error } = await sb.from(tabla).upsert(row);
    if (error) console.error('sbUpsertRow:', tabla, error.message);
};

window.sbUpsertRows = async function (tabla, rows) {
    const sb = _client(); if (!sb || !rows?.length) return;
    const { error } = await sb.from(tabla).upsert(rows);
    if (error) console.error('sbUpsertRows:', tabla, error.message);
};

window.sbUpdateRow = async function (tabla, id, changes, campo = 'id') {
    const sb = _client(); if (!sb) return;
    console.log('[UPDATE]', tabla, id, Object.keys(changes));
    const { error } = await sb.from(tabla).update(changes).eq(campo, id);
    if (error) console.error('[UPDATE ERROR]', tabla, error.message, error.code);
    else console.log('[UPDATE OK]', tabla);
};

window.sbDeleteRow = async function (tabla, id, campo = 'id') {
    const sb = _client(); if (!sb) return;
    const { error } = await sb.from(tabla).delete().eq(campo, id);
    if (error) console.error('sbDeleteRow:', tabla, error.message);
};

window.sbReplaceUserPerms = async function (userId, newPerms) {
    const sb = _client(); if (!sb) return;
    await sb.from('permisos_lab').delete().eq('usuario_id', userId);
    if (newPerms?.length) {
        const { error } = await sb.from('permisos_lab').insert(newPerms);
        if (error) console.error('sbReplaceUserPerms:', error.message);
    }
    _store.permisos_lab = _store.permisos_lab
        .filter(p => p.usuario_id !== userId)
        .concat(newPerms || []);
};

window.sbSyncCatalogo = async function (lsKey, data) {
    const MAP = {
        sr_grupos_vulnerables: { key: 'grupos_vulnerables', store: 'grupos_vulnerables' },
        sr_tipos_muestra:      { key: 'tipos_muestra',      store: 'tipos_muestra' },
        sr_microorganismos:    { key: 'microorganismos',   store: 'microorganismos' },
    };
    const m = MAP[lsKey]; if (!m) return;
    _store[m.store] = data;
    const sb = _client(); if (!sb) return;
    const { error } = await sb.from(m.key).upsert(data);
    if (error) console.error('sbSyncCatalogo:', m.key, error.message);
};