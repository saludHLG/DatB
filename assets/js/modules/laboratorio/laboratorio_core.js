/* =========================================================
   laboratorio_core.js — Núcleo compartido del módulo de Lab.
   Arquitectura en Memoria (_store) + Red (Supabase).
   Sin localStorage.
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
    res_mf_led: [],
    res_tb_lam: [],
    usuarios: [],
    laboratorios: [],
    permisos_lab: [],
    tipos_muestra: [],
    microorganismos: [],
    grupos_vulnerables: [],
    geo_labs: [],
    firmas: {},
    active_user: null
};

/* ── Accesores (leen de _store) ─────────────────────────── */
function _getRecepciones()       { return window._store.recepciones       || []; }
function _getResBaci()           { return window._store.res_baci          || []; }
function _getResCultivo()        { return window._store.res_cultivo       || []; }
function _getResXpertUltra()     { return window._store.res_xpert_ultra   || []; }
function _getResXpertXDR()       { return window._store.res_xpert_xdr     || []; }
function _getResMfLed()          { return window._store.res_mf_led        || []; }
function _getResTbLam()          { return window._store.res_tb_lam        || []; }

/* ── Escritores síncronos ─────────────────────────────────── */
function _saveRecepciones(arr)   { window._store.recepciones     = arr; }
function _saveResBaci(arr)       { window._store.res_baci        = arr; }
function _saveResCultivo(arr)    { window._store.res_cultivo     = arr; }
function _saveResXpertUltra(arr) { window._store.res_xpert_ultra = arr; }
function _saveResXpertXDR(arr)   { window._store.res_xpert_xdr   = arr; }
function _saveResMfLed(arr)      { window._store.res_mf_led      = arr; }
function _saveResTbLam(arr)      { window._store.res_tb_lam      = arr; }

/* ── Catálogos ──────────────────────────────────────────── */
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
    { id: 6, nombre: 'TB-LAM',                codigo: 'TB-LAM'      },
];

/* IDs con formulario de resultados implementado */
const _SOPORTADOS = new Set([1, 2, 3, 4, 5, 6]);

/* ── Tablas de resultados MF-LED ──────────────────────────
   lectura → etiqueta / clase CSS
   ──────────────────────────────────────────────────────── */
const _MFLED_LECTURAS = {
    negativo:         { label: 'No se observan BAAR',              cls: 'res-neg',    positivo: false, negativo: true  },
    confirmacion:     { label: 'Requiere confirmación (1–2 BAAR)', cls: 'res-estudio',positivo: null,  negativo: false },
    positivo_escaso:  { label: 'Positivo escaso (paucibacilar)',   cls: 'res-pos',    positivo: true,  negativo: false },
    positivo_1:       { label: 'Positivo + (1–6 BAAR/campo)',      cls: 'res-pos',    positivo: true,  negativo: false },
    positivo_2:       { label: 'Positivo ++ (7–60 BAAR/campo)',    cls: 'res-pos',    positivo: true,  negativo: false },
    positivo_3:       { label: 'Positivo +++ (>60 BAAR/campo)',    cls: 'res-pos',    positivo: true,  negativo: false },
};

/**
 * Para lectura 'confirmacion', verifica si la misma indicación
 * tiene un cultivo positivo (resultado 1–9) o un Xpert Ultra positivo.
 * Si es así, el MF-LED se considera positivo.
 */
function _mfLedIsConfirmed(indicacionId) {
    const recs = _getRecepciones().filter(r => r.indicacion_id === indicacionId);
    return recs.some(rec => {
        const cr = _getResCultivo().find(r => r.recepcion_id === rec.id);
        if (cr && /^[1-9]$/.test(cr.resultado)) return true;
        const xr = _getResXpertUltra().find(r => r.recepcion_id === rec.id);
        if (xr && xr.resultado === 'MTB DETECTADO') return true;
        return false;
    });
}

/* ── Helpers de positivo/negativo por examen ─────────────── */

/**
 * Devuelve true si el resultado de la recepción para ese examen
 * es definitivamente positivo.
 * Para MF-LED 'confirmacion' se necesita el indicacionId.
 */
function _examenIsPositive(recId, eid, indicacionId) {
    const n = Number(eid);
    if (n === 1) {
        const r = _getResBaci().find(x => x.recepcion_id === recId);
        return !!(r && r.codificacion > 0);
    }
    if (n === 2) {
        const r = _getResCultivo().find(x => x.recepcion_id === recId);
        return !!(r && /^[1-9]$/.test(r.resultado));
    }
    if (n === 3) {
        const r = _getResXpertUltra().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === 'MTB DETECTADO');
    }
    if (n === 4) {
        const r = _getResMfLed().find(x => x.recepcion_id === recId);
        if (!r) return false;
        const info = _MFLED_LECTURAS[r.lectura];
        if (!info) return false;
        if (info.positivo === true) return true;
        if (info.positivo === null && indicacionId) return _mfLedIsConfirmed(indicacionId);
        return false;
    }
    if (n === 5) {
        const r = _getResXpertXDR().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === 'MTB DETECTADO');
    }
    if (n === 6) {
        const r = _getResTbLam().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === 'POSITIVO');
    }
    return false;
}

function _examenIsNegative(recId, eid) {
    const n = Number(eid);
    if (n === 1) {
        const r = _getResBaci().find(x => x.recepcion_id === recId);
        return !!(r && r.codificacion === 0);
    }
    if (n === 2) {
        const r = _getResCultivo().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === '0');
    }
    if (n === 3) {
        const r = _getResXpertUltra().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === 'MTB NO DETECTADO');
    }
    if (n === 4) {
        const r = _getResMfLed().find(x => x.recepcion_id === recId);
        return !!(r && _MFLED_LECTURAS[r.lectura]?.negativo === true);
    }
    if (n === 5) {
        const r = _getResXpertXDR().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === 'MTB NO DETECTADO');
    }
    if (n === 6) {
        const r = _getResTbLam().find(x => x.recepcion_id === recId);
        return !!(r && r.resultado === 'NEGATIVO');
    }
    return false;
}

/* ── Resolvedores de nombres / lógicas de negocio ────────── */
function _labsConPermiso(userId, campo = 'puede_emitir') {
    return (window._store.permisos_lab || [])
        .filter(p => p.usuario_id === userId && p[campo] && p.activo)
        .map(p => Number(p.laboratorio_id));
}

function _recepcionesDelLab(userId) {
    const labIds = [...new Set([
        ..._labsConPermiso(userId, 'puede_emitir'),
        ..._labsConPermiso(userId, 'puede_editar'),
        ..._labsConPermiso(userId, 'puede_eliminar'),
    ])];
    return _getRecepciones().filter(r => labIds.includes(Number(r.laboratorio_id)));
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
    const inds = (window._store.indicaciones || [])
        .filter(i => labIds.includes(Number(i.laboratorio_id)));
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
    const all = (window._store.geo_labs && window._store.geo_labs.length)
        ? window._store.geo_labs
        : (typeof DATOS_GEO !== 'undefined' ? (DATOS_GEO.laboratorios || []) : []);
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
    const cat = (window._store.tipos_muestra && window._store.tipos_muestra.length)
        ? window._store.tipos_muestra
        : (typeof _TM_DEFAULTS !== 'undefined' ? _TM_DEFAULTS : []);
    return cat.find(m => m.id === Number(id))?.nombre || `Muestra #${id}`;
}

function _tieneAlgunResultado(recId) {
    return _getResBaci().some(r => r.recepcion_id === recId)       ||
           _getResCultivo().some(r => r.recepcion_id === recId)    ||
           _getResXpertUltra().some(r => r.recepcion_id === recId) ||
           _getResXpertXDR().some(r => r.recepcion_id === recId)   ||
           _getResMfLed().some(r => r.recepcion_id === recId)      ||
           _getResTbLam().some(r => r.recepcion_id === recId);
}

function _resultadoXpertCls(resultado) {
    if (resultado === 'MTB NO DETECTADO') return 'res-neg';
    if (resultado === 'MTB DETECTADO')    return 'res-pos';
    return 'res-contam';
}

function _tieneResultadoFinal(recId, exId) {
    const n = Number(exId);
    if (n === 1) return _getResBaci().some(r => r.recepcion_id === recId);
    if (n === 2) {
        const r = _getResCultivo().find(r => r.recepcion_id === recId);
        return r ? r.resultado !== 'en_estudio' : false;
    }
    if (n === 3) return _getResXpertUltra().some(r => r.recepcion_id === recId);
    if (n === 4) return _getResMfLed().some(r => r.recepcion_id === recId);
    if (n === 5) return _getResXpertXDR().some(r => r.recepcion_id === recId);
    if (n === 6) return _getResTbLam().some(r => r.recepcion_id === recId);
    return false;
}

/**
 * Elimina del store local todos los resultados asociados a una recepción.
 */
function _purgeResultadosDeRecepcion(recId) {
    _saveResBaci(_getResBaci().filter(r => r.recepcion_id !== recId));
    _saveResCultivo(_getResCultivo().filter(r => r.recepcion_id !== recId));
    _saveResXpertUltra(_getResXpertUltra().filter(r => r.recepcion_id !== recId));
    _saveResXpertXDR(_getResXpertXDR().filter(r => r.recepcion_id !== recId));
    _saveResMfLed(_getResMfLed().filter(r => r.recepcion_id !== recId));
    _saveResTbLam(_getResTbLam().filter(r => r.recepcion_id !== recId));
}

/**
 * Elimina del store local una indicación completa con todas sus dependencias.
 * Supabase se encarga del cascade en BD; aquí actualizamos _store.
 */
function _purgeIndicacionLocal(indId) {
    const recs = _getRecepciones().filter(r => r.indicacion_id === indId);
    recs.forEach(rec => _purgeResultadosDeRecepcion(rec.id));
    _saveRecepciones(_getRecepciones().filter(r => r.indicacion_id !== indId));
    window._store.indicaciones = (window._store.indicaciones || []).filter(i => i.id !== indId);
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
