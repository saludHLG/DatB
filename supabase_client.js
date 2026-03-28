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
    geo_labs:           [],
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
   ================================================================ */
window.sbInitAll = async function () {
    const sb = _client();
    if (!sb) { console.warn('Supabase no configurado — store vacío.'); return; }

    try {
        const [
            rProv, rMun, rCent, rLabs,
            rUsers, rPerms, rAccesos,
            rPacs, rInds, rIndEx, rRecs,
            rBaci, rCult, rXU, rXDR,
            rGV, rTM, rMicro
        ] = await Promise.allSettled([
            sb.from('provincias').select('*').order('nombre'),
            sb.from('municipios').select('*').order('nombre'),
            sb.from('centros_salud').select('*').order('nombre'),
            sb.from('laboratorios').select('*').order('nombre'),
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
            sb.from('grupos_vulnerables').select('*'),
            sb.from('tipos_muestra').select('*'),
            sb.from('microorganismos').select('*'),
        ]);

        const d = r => (r.status === 'fulfilled' && r.value.data) ? r.value.data : null;

        if (d(rProv))    _store.geo_provincias     = d(rProv);
        if (d(rMun))     _store.geo_municipios      = d(rMun);
        if (d(rCent))    _store.geo_centros          = d(rCent);
        if (d(rLabs))    _store.geo_labs             = d(rLabs);
        if (d(rUsers))   _store.usuarios             = d(rUsers);
        if (d(rPerms))   _store.permisos_lab         = d(rPerms);
        if (d(rAccesos)) _store.accesos_temp         = d(rAccesos);
        if (d(rPacs))    _store.pacientes            = d(rPacs);
        if (d(rRecs))    _store.recepciones          = d(rRecs);
        if (d(rBaci))    _store.res_baci             = d(rBaci);
        if (d(rCult))    _store.res_cultivo          = d(rCult);
        if (d(rXU))      _store.res_xpert_ultra      = d(rXU);
        if (d(rXDR))     _store.res_xpert_xdr        = d(rXDR);
        if (d(rGV))      _store.grupos_vulnerables   = d(rGV);
        if (d(rTM))      _store.tipos_muestra        = d(rTM);
        if (d(rMicro))   _store.microorganismos      = d(rMicro);

        // Indicaciones: merge examenes_ids desde tabla junction si falta en columna jsonb
        if (d(rInds)) {
            const indExams = d(rIndEx) || [];
            _store.indicaciones = d(rInds).map(ind => ({
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
   AUTH — directo a tabla usuarios (sin Supabase Auth)
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

    // Intentar desde store (ya cargado por sbInitAll)
    let user = _store.usuarios.find(u => u.id === uid && u.activo);
    if (user) return user;

    // Fallback: consulta directa
    if (!sb) return null;
    const { data } = await sb.from('usuarios').select('*').eq('id', uid).single();
    if (data && data.activo) {
        const idx = _store.usuarios.findIndex(u => u.id === uid);
        if (idx !== -1) _store.usuarios[idx] = data; else _store.usuarios.push(data);
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
    const { error } = await sb.from(tabla).update(changes).eq(campo, id);
    if (error) console.error('sbUpdateRow:', tabla, error.message);
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
        sr_microorganismos:    { key: 'microorganismos',     store: 'microorganismos' },
    };
    const m = MAP[lsKey]; if (!m) return;
    _store[m.store] = data;
    const sb = _client(); if (!sb) return;
    const { error } = await sb.from(m.key).upsert(data);
    if (error) console.error('sbSyncCatalogo:', m.key, error.message);
};
