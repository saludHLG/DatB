/* =========================================================
   laboratorio_core.js — Núcleo compartido del módulo de Lab.
   Arquitectura en Memoria (Stateless Browser) + Red (Supabase)
   ========================================================= */

/* ── Estado Global en Memoria ───────────────────────────── */
window._store = window._store || {
    pacientes: [],
    indicaciones: [],
    recepciones: [],
    res_baci: [],
    res_cultivo: [],
    res_xpert_ultra: [],
    res_xpert_xdr: [],
    usuarios: [],
    laboratorios: [],
    permisos_lab: [],
    tipos_muestra: [],
    microorganismos: [],
    grupos_vulnerables: [],
    geo_labs: [],
    firmas: {}, // Reemplaza localStorage para las firmas
    active_user: null // Reemplaza sessionStorage
};

/* ── Accesores (Leen de la memoria RAM) ─────────────────── */
function _getRecepciones()       { return window._store.recepciones || []; }
function _getResBaci()           { return window._store.res_baci || []; }
function _getResCultivo()        { return window._store.res_cultivo || []; }
function _getResXpertUltra()     { return window._store.res_xpert_ultra || []; }
function _getResXpertXDR()       { return window._store.res_xpert_xdr || []; }

/* ── Escritores (Async: Actualizan Memoria y luego Red) ─── */
async function _saveRecepciones(arr) {
    window._store.recepciones = arr;
    if (typeof sbUpsertRow === 'function') await sbUpsertRow('recepciones_muestra', arr);
}
async function _saveResBaci(arr) { 
    window._store.res_baci = arr; 
    if (typeof sbUpsertRow === 'function') await sbUpsertRow('resultados_baciloscopia', arr); 
}
async function _saveResCultivo(arr) { 
    window._store.res_cultivo = arr; 
    if (typeof sbUpsertRow === 'function') await sbUpsertRow('resultados_cultivo', arr); 
}
async function _saveResXpertUltra(arr) { 
    window._store.res_xpert_ultra = arr; 
    if (typeof sbUpsertRow === 'function') await sbUpsertRow('resultados_xpert_ultra', arr); 
}
async function _saveResXpertXDR(arr) { 
    window._store.res_xpert_xdr = arr; 
    if (typeof sbUpsertRow === 'function') await sbUpsertRow('resultados_xpert_xdr', arr); 
}

/* ── Catálogos y Aliases ────────────────────────────────── */
const _MICRO_DEFAULTS = [
    { id: 1, nombre: 'Mycobacterium tuberculosis',         sistema: true, activo: true },
    { id: 2, nombre: 'MNTB (Micobacteria No Tuberculosa)', sistema: true, activo: true },
];

function _getMicroCat() {
    const stored = window._store.microorganismos || [];
    return (stored.length ? stored : _MICRO_DEFAULTS).filter(x => x.activo !== false);
}

function _addDays(dateStr, days) { return addDaysShared(dateStr, days); }
function _todayLab()             { return todayShared(); }
function _fmtDate(d)             { return fmtDateShared(d); }
function _genId()                { return genIdShared(); }

const _EXAMENES_CAT = [
    { id: 1, nombre: 'Baciloscopia',          codigo: 'BACI'        },
    { id: 2, nombre: 'Cultivo',               codigo: 'CULT'        },
    { id: 3, nombre: 'Xpert MTB/RIF (Ultra)', codigo: 'XPERT-ULTRA' },
    { id: 4, nombre: 'MF-LED',                codigo: 'MF-LED'      },
    { id: 5, nombre: 'Xpert MTB/XDR',         codigo: 'XPERT-XDR'   },
];
const _SOPORTADOS = new Set([1, 2, 3, 5]);

/* ── Resolutores de Nombres y Lógicas de Negocio ────────── */
function _labsConPermiso(userId, campo = 'puede_emitir') {
    return (window._store.permisos_lab || [])
        .filter(p => p.usuario_id === userId && p[campo] && p.activo)
        .map(p => p.laboratorio_id);
}

function _recepcionesDelLab(userId) {
    const labIds = [...new Set([
        ..._labsConPermiso(userId, 'puede_emitir'),
        ..._labsConPermiso(userId, 'puede_editar'),
        ..._labsConPermiso(userId, 'puede_eliminar'),
    ])];
    return _getRecepciones().filter(r => labIds.includes(r.laboratorio_id));
}

function _userName(userId) {
    if (!userId) return '—';
    const u = (window._store.usuarios || []).find(x => x.id === userId);
    return u ? `${u.nombres} ${u.apellidos}` : '—';
}

function _indicacionesPendientes(userId) {
    const labIds = _labsConPermiso(userId, 'puede_emitir');
    if (!labIds.length) return [];
    const recepciones = _getRecepciones();
    const inds = (window._store.indicaciones || []).filter(i => labIds.includes(i.laboratorio_id));
    const result = [];
    inds.forEach(ind => {
        (ind.examenes_ids || []).forEach(eid => {
            const yaRecepcionado = recepciones.some(
                r => r.indicacion_id === ind.id && r.examen_id === Number(eid)
            );
            if (!yaRecepcionado) result.push({ ...ind, _examen_id: Number(eid) });
        });
    });
    return result.sort((a, b) => (b.fecha_indicacion || '').localeCompare(a.fecha_indicacion || ''));
}

function _labNombre(id) {
    const all = (window._store.geo_labs && window._store.geo_labs.length) ? window._store.geo_labs : (typeof DATOS_GEO !== 'undefined' ? (DATOS_GEO.laboratorios || []) : []);
    return all.find(l => l.id === Number(id))?.nombre || `Lab #${id}`;
}

function _examenNombre(id) {
    return _EXAMENES_CAT.find(e => e.id === Number(id)) || { nombre: `Examen #${id}`, codigo: '?' };
}

function _centroNombreDeIndicador(userId) {
    const u = (window._store.usuarios || []).find(x => x.id === userId);
    if (!u) return '—';
    if (u.centro_salud_id) {
        const c = getGeoCentros().find(x => x.id === Number(u.centro_salud_id));
        if (c) return c.nombre;
    }
    return u.centro_texto || '—';
}

function _tipoMuestraNombreById(id) {
    if (typeof _getTMCat === 'function') {
        const f = _getTMCat().find(m => m.id === Number(id));
        if (f) return f.nombre;
    }
    const cat = (window._store.tipos_muestra && window._store.tipos_muestra.length) ? window._store.tipos_muestra : (typeof _TM_DEFAULTS !== 'undefined' ? _TM_DEFAULTS : []);
    return cat.find(m => m.id === Number(id))?.nombre || `Muestra #${id}`;
}

function _tieneAlgunResultado(recId) {
    return _getResBaci().some(r => r.recepcion_id === recId)       ||
           _getResCultivo().some(r => r.recepcion_id === recId)    ||
           _getResXpertUltra().some(r => r.recepcion_id === recId) ||
           _getResXpertXDR().some(r => r.recepcion_id === recId);
}

function _resultadoXpertCls(resultado) {
    if (resultado === 'MTB NO DETECTADO') return 'res-neg';
    if (resultado === 'MTB DETECTADO')    return 'res-pos';
    return 'res-contam';
}

function _tieneResultadoFinal(recId, exId) {
    const n = Number(exId);
    if (n === 1) return _getResBaci().some(r => r.recepcion_id === recId);
    if (n === 2) { const r = _getResCultivo().find(r => r.recepcion_id === recId); return r ? r.resultado !== 'en_estudio' : false; }
    if (n === 3) return _getResXpertUltra().some(r => r.recepcion_id === recId);
    if (n === 5) return _getResXpertXDR().some(r => r.recepcion_id === recId);
    return false;
}

async function _recalcIndEstado(indId) {
    const idx = (window._store.indicaciones || []).findIndex(i => i.id === indId);
    if (idx === -1) return;
    const ind     = window._store.indicaciones[idx];
    const recs    = _getRecepciones().filter(r => r.indicacion_id === indId);
    const examIds = (ind.examenes_ids || []).map(Number);
    if (!examIds.length) return;

    let hasPending = false, hasAccepted = false, allRejected = true, allFinal = true;
    for (const eid of examIds) {
        const rec = recs.find(r => r.examen_id === eid);
        if (!rec) { hasPending = true; allRejected = false; allFinal = false; continue; }
        if (rec.estado === 'rechazada') continue;
        allRejected = false; hasAccepted = true;
        if (!_tieneResultadoFinal(rec.id, eid)) allFinal = false;
    }

    const nuevoEstado = hasPending ? 'pendiente'
        : allRejected              ? 'rechazada'
        : (hasAccepted && allFinal) ? 'completada'
        : 'recibida';

    window._store.indicaciones[idx].estado = nuevoEstado;
    if (typeof sbUpdateRow === 'function') {
        await sbUpdateRow('indicaciones_examen', indId, { estado: nuevoEstado }).catch(console.error);
    }
}
