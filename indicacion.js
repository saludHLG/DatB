/* =========================================================
   indicacion.js  —  Módulo de Indicaciones de Examen
   Requiere: app.js (funciones $ show hide), data.js (DATOS_GEO)
   Bootstrap 5, Bootstrap Icons
   ========================================================= */

/* ── Catálogos: se leen desde localStorage si el admin los ha modificado,
      de lo contrario se usan los valores por defecto ── */

const _GV_DEFAULTS = [
    { id: 1,  nombre: 'Antiguo caso de TB' },
    { id: 2,  nombre: 'Contacto TB' },
    { id: 3,  nombre: 'Cubano viviendo en países de alta carga de TB' },
    { id: 4,  nombre: 'Desnutrición' },
    { id: 5,  nombre: 'Diabetes mellitus' },
    { id: 6,  nombre: 'Enfermedad respiratoria crónica' },
    { id: 7,  nombre: 'Extranjero proveniente de país de alta carga de TB' },
    { id: 8,  nombre: 'Fumador' },
    { id: 9,  nombre: 'Insuficiencia renal crónica' },
    { id: 10, nombre: 'Lesiones radiográficas antiguas' },
    { id: 11, nombre: 'Minero' },
    { id: 12, nombre: 'Niños ≤ 5 años' },
    { id: 13, nombre: 'Persona que consume drogas' },
    { id: 14, nombre: 'Personas en internamiento prolongado' },
    { id: 15, nombre: 'Recluso o Exrecluso' },
    { id: 16, nombre: 'Sin hogar' },
    { id: 17, nombre: 'Trabajador de salud relacionado con la atención a pacientes' },
    { id: 18, nombre: 'Trabajador de unidad penitenciaria' },
    { id: 19, nombre: 'Trastornos por consumo de alcohol' },
    { id: 20, nombre: 'Vivir en hacinamiento, poca ventilación y luz solar, barrios marginales' },
    { id: 21, nombre: 'VIH' },
    { id: 22, nombre: 'Adulto ≥ 60 años' },
];

const _TM_DEFAULTS = [
    { id: 1,  nombre: 'Aspirado bronquial' },
    { id: 2,  nombre: 'BAAF ganglio' },
    { id: 3,  nombre: 'Biopsias de tejido' },
    { id: 4,  nombre: 'Broncoscopía' },
    { id: 5,  nombre: 'Contenido gástrico' },
    { id: 6,  nombre: 'Esputo 1' },
    { id: 7,  nombre: 'Esputo 2' },
    { id: 8,  nombre: 'Esputo 3' },
    { id: 9,  nombre: 'Esputo evolutivo' },
    { id: 10, nombre: 'Exudado de lesión' },
    { id: 11, nombre: 'Exudado faríngeo' },
    { id: 12, nombre: 'Ganglio mesentérico' },
    { id: 13, nombre: 'L. Articular' },
    { id: 14, nombre: 'L. Ascítico' },
    { id: 15, nombre: 'L. Pericárdico' },
    { id: 16, nombre: 'L. Peritoneal' },
    { id: 17, nombre: 'L. Pleural' },
    { id: 18, nombre: 'Lavado bronquial' },
    { id: 19, nombre: 'LCR' },
    { id: 20, nombre: 'Líquido sinovial' },
    { id: 21, nombre: 'Médula ósea' },
    { id: 22, nombre: 'Orina' },
    { id: 23, nombre: 'Pus de lesión' },
    { id: 24, nombre: 'Secreción' },
];

function _getGVCat() {
    const stored = JSON.parse(localStorage.getItem('sr_grupos_vulnerables') || 'null');
    return (stored || _GV_DEFAULTS).filter(x => x.activo !== false);
}
function _getTMCat() {
    const stored = JSON.parse(localStorage.getItem('sr_tipos_muestra') || 'null');
    return (stored || _TM_DEFAULTS).filter(x => x.activo !== false);
}

// Aliases para compatibilidad con el resto del módulo
const GRUPOS_VULNERABLES_CAT = _GV_DEFAULTS;  // referencia estática para hint de edad
const TIPOS_MUESTRA_CAT      = _TM_DEFAULTS;  // referencia estática para resumen

const EXAMENES_TB_CAT = [
    { id: 1, nombre: 'Baciloscopia',          codigo: 'BACI' },
    { id: 2, nombre: 'Cultivo',               codigo: 'CULT' },
    { id: 3, nombre: 'Xpert MTB/RIF (Ultra)', codigo: 'XPERT-ULTRA' },
    { id: 4, nombre: 'MF-LED',                codigo: 'MF-LED' },
    { id: 5, nombre: 'Xpert MTB/XDR',         codigo: 'XPERT-XDR' },
];

/* ── localStorage helpers ─────────────────────────────────── */

const LS_PACIENTES    = 'sr_pacientes';
const LS_INDICACIONES = 'sr_indicaciones';

function _getPacientes()     { return JSON.parse(localStorage.getItem(LS_PACIENTES)    || '[]'); }
function _savePacientes(p)   { localStorage.setItem(LS_PACIENTES, JSON.stringify(p));            }
function _getIndicaciones()  { return JSON.parse(localStorage.getItem(LS_INDICACIONES) || '[]'); }
function _saveIndicaciones(i){ localStorage.setItem(LS_INDICACIONES, JSON.stringify(i));         }

/* _genUUID → alias de genIdShared (utils.js) */
function _genUUID() { return genIdShared(); }

/* ── Utilidades ───────────────────────────────────────────── */

function _calcEdad(fechaNac) {
    const hoy = new Date(), nac = new Date(fechaNac + 'T00:00:00');
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--;
    return edad;
}

/**
 * Extrae fecha de nacimiento de un CI cubano (formato YYMMDD en primeros 6 dígitos).
 * Devuelve string 'YYYY-MM-DD' o null si no aplica.
 */
function _parseCIFechaNac(ci) {
    if (!/^\d{11}$/.test(ci)) return null;
    const yy = parseInt(ci.substring(0, 2));
    const mm = parseInt(ci.substring(2, 4)) - 1;
    const dd = parseInt(ci.substring(4, 6));
    const year = (yy + 2000 <= new Date().getFullYear()) ? 2000 + yy : 1900 + yy;
    const d = new Date(year, mm, dd);
    if (isNaN(d) || d.getMonth() !== mm) return null;
    return `${year}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/* _today → alias de todayShared (utils.js) */
function _today() { return todayShared(); }

/* Clasificación CSS para resultados Xpert (usado en _renderIndCard) */
function _resultadoXpertClsInd(r) {
    if (r === 'MTB NO DETECTADO') return 'res-neg';
    if (r === 'MTB DETECTADO')    return 'res-pos';
    return 'res-contam';
}

/* _formatDate → alias de fmtDateShared (utils.js) */
function _formatDate(d) { return fmtDateShared(d); }

function _getUserProvinciaId(user) {
    // provincia_id está guardado directamente en el objeto usuario
    if (user.provincia_id) return Number(user.provincia_id);
    // fallback: inferir desde municipio_id
    const mun = getGeoMuns().find(m => m.id === Number(user.municipio_id));
    return mun ? mun.provincia_id : null;
}

/* ══════════════════════════════════════════════════════════════
   VISTA PRINCIPAL — lista de indicaciones del usuario
   ══════════════════════════════════════════════════════════════ */

function renderIndicaciones(user, el) {
    const todas = _getIndicaciones()
        .filter(i =>
            i.indicado_por === user.id ||
            (i.medico?.usuario_id && i.medico.usuario_id === user.id)
        )
        .sort((a, b) => b.creado_en?.localeCompare(a.creado_en));

    const puedeCrear = [1, 2].includes(user.rol_profesional_id);

    const _filtrar = q => {
        if (!q) return todas;
        const norm = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        return todas.filter(ind => {
            const pac = _getPacientes().find(p => p.id === ind.paciente_id);
            const hayPac = pac && (
                `${pac.nombres} ${pac.apellidos}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(norm) ||
                pac.carnet_identidad.toLowerCase().includes(norm)
            );
            return hayPac;
        });
    };

    const _rebuild = q => {
        const inds = _filtrar(q);
        const listEl = document.getElementById('ind-list-wrap');
        if (!listEl) return;
        listEl.innerHTML = inds.length
            ? `<div class="ind-list">${inds.map(ind => _renderIndCard(ind, user)).join('')}</div>`
            : `<div class="modulo-placeholder"><i class="bi bi-funnel"></i><p>Sin resultados para esa búsqueda.</p></div>`;
        _bindIndCardBtns(user, el);
    };

    el.innerHTML = `
    <div class="modulo-header">
        <div class="d-flex align-items-start justify-content-between flex-wrap gap-2">
            <div>
                <h2 class="modulo-title">Indicaciones de examen</h2>
                <p class="modulo-sub">Gestione las indicaciones de laboratorio para TB.</p>
            </div>
            ${puedeCrear ? `<button class="btn-primary-custom" id="btn-nueva-ind">
                <i class="bi bi-plus-circle"></i> Nueva indicación
            </button>` : ''}
        </div>
    </div>

    <div class="filters-bar mb-3" style="display:flex;gap:.65rem;align-items:center">
        <div style="position:relative;flex:1;min-width:200px;max-width:380px">
            <i class="bi bi-search" style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none"></i>
            <input type="text" id="ind-search" class="form-control"
                   style="padding-left:2.2rem" placeholder="Buscar por nombre o CI del paciente…">
        </div>
    </div>

    <div id="ind-list-wrap">
        ${todas.length === 0
            ? `<div class="modulo-placeholder"><i class="bi bi-clipboard2-pulse"></i>
               <p>No hay indicaciones registradas${puedeCrear ? '. Cree la primera con el botón superior.' : '.'}</p></div>`
            : `<div class="ind-list">${todas.map(ind => _renderIndCard(ind, user)).join('')}</div>`}
    </div>`;

    document.getElementById('btn-nueva-ind')?.addEventListener('click', () => {
        _renderNuevaIndicacion(user, el);
    });

    document.getElementById('ind-search')?.addEventListener('input', function () {
        _rebuild(this.value.trim());
    });

    _bindIndCardBtns(user, el);
}

function _bindIndCardBtns(user, el) {
    const listWrap = document.getElementById('ind-list-wrap');
    if (!listWrap) return;

    listWrap.querySelectorAll('.btn-ind-action.del').forEach(btn => {
        btn.addEventListener('click', () => {
            _appConfirm(
                'La indicación y sus datos asociados serán eliminados. Esta acción no se puede deshacer.',
                () => {
                    _saveIndicaciones(_getIndicaciones().filter(i => i.id !== btn.dataset.id));
                    renderIndicaciones(user, el);
                }
            );
        });
    });

    listWrap.querySelectorAll('.btn-ind-action.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const ind = _getIndicaciones().find(i => i.id === btn.dataset.id);
            if (ind) _renderEditarIndicacion(user, el, ind);
        });
    });
}

function _renderIndCard(ind, currentUser) {
    const pac     = _getPacientes().find(p => p.id === ind.paciente_id);
    const allLabs = JSON.parse(localStorage.getItem('sr_geo_labs') || 'null') || (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.laboratorios : []);
    const lab     = allLabs.find(l => l.id === ind.laboratorio_id);
    const allTM   = _getTMCat().concat(TIPOS_MUESTRA_CAT);
    const muestra = allTM.find(m => m.id === ind.tipo_muestra_id);
    const tags    = (ind.examenes_ids || []).map(eid => {
        const ex = EXAMENES_TB_CAT.find(e => e.id === eid);
        return ex ? `<span class="exam-tag">${ex.codigo}</span>` : '';
    }).join('');

    const statusMap = {
        pendiente:   ['badge-estado pendiente',  'Pendiente'],
        recibida:    ['badge-estado recibida',   'Recibida'],
        en_proceso:  ['badge-estado en-proceso', 'En proceso'],
        completada:  ['badge-estado completada', 'Completada'],
        anulada:     ['badge-estado anulada',    'Anulada'],
    };
    const [cls, label] = statusMap[ind.estado] || ['badge-estado', ind.estado];

    // Solo el creador puede editar. Creador O médico referenciado pueden eliminar.
    const esCreador   = ind.indicado_por === currentUser.id;
    const esMedRef    = !esCreador && ind.medico?.usuario_id === currentUser.id;
    const puedeEliminar = esCreador || esMedRef;
    const editable    = ['pendiente', 'recibida'].includes(ind.estado) && esCreador;

    // ── Fila de contexto: enfermera ↔ médico ─────────────────────────────
    let contextoHtml = '';
    const allUsers = JSON.parse(localStorage.getItem('sr_usuarios') || '[]');

    if (esCreador && ind.medico) {
        // La enfermera ve el médico responsable
        const medNom = `Dr./Dra. ${ind.medico.nombres} ${ind.medico.apellidos}`;
        const regStr = ind.medico.registro_prof ? ` — Reg. ${ind.medico.registro_prof}` : '';
        contextoHtml = `<div class="ind-ctx ind-ctx-medico">
            <i class="bi bi-person-badge"></i>
            <span><strong>Médico responsable:</strong> ${medNom}${regStr}</span>
        </div>`;
    } else if (esMedRef) {
        // El médico ve quién solicitó (puede eliminar, no editar)
        const nurse = allUsers.find(u => u.id === ind.indicado_por);
        const nurseNom = nurse ? `Enf. ${nurse.nombres} ${nurse.apellidos}` : '—';
        contextoHtml = `<div class="ind-ctx ind-ctx-enfermera">
            <i class="bi bi-person-heart"></i>
            <span><strong>Solicitada por:</strong> ${nurseNom}</span>
        </div>`;
    }

    // ── Resultados inline (solo lectura) ─────────────────────────────────
    const recepciones = JSON.parse(localStorage.getItem('sr_recepciones') || '[]');
    const baci        = JSON.parse(localStorage.getItem('sr_res_baci')    || '[]');
    const cult        = JSON.parse(localStorage.getItem('sr_res_cultivo') || '[]');
    // Modelo nuevo: una recepción por (indicación × examen)
    const recsByExam = recepciones.filter(r => r.indicacion_id === ind.id);
    let resBlock = '';

    if (recsByExam.length) {
        const parts = [];
        for (const eid of (ind.examenes_ids || [])) {
            const rec = recsByExam.find(r => r.examen_id === Number(eid))
                     || (recsByExam.length === 1 && !recsByExam[0].examen_id ? recsByExam[0] : null);
            if (!rec) continue;
            const exNom = EXAMENES_TB_CAT.find(e => e.id === Number(eid))?.nombre || `Examen ${eid}`;

            if (rec.estado === 'rechazada') {
                parts.push(`<div class="ind-res-item">
                    <span class="ind-res-label">${exNom}</span>
                    <span class="res-cod res-contam">Muestra rechazada</span>
                    ${rec.motivo_rechazo ? `<small class="text-muted ind-res-motivo">${rec.motivo_rechazo}</small>` : ''}
                </div>`);
                continue;
            }

            // recibida — buscar resultado del examen específico
            if (Number(eid) === 1) {
                const rb = baci.find(r => r.recepcion_id === rec.id);
                if (rb) {
                    const cls2 = rb.codificacion === 0 ? 'res-neg' : 'res-pos';
                    const lbl  = rb.codificacion === 0
                        ? 'Negativo (0)'
                        : `Positivo (${rb.codificacion})`;
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="res-cod ${cls2}">${lbl}</span>
                        <small class="text-muted">N°${rb.numero_muestra} · ${_formatDate(rb.fecha_analisis)}</small>
                    </div>`);
                } else {
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="text-muted" style="font-size:.78rem">Pendiente resultado</span>
                    </div>`);
                }
            } else if (Number(eid) === 2) {
                const rc = cult.find(r => r.recepcion_id === rec.id);
                if (rc) {
                    const r2   = rc.resultado;
                    const cls2 = r2 === 'en_estudio' ? 'res-estudio' : r2 === 'contaminado' ? 'res-contam'
                               : r2 === '0' ? 'res-neg' : 'res-pos';
                    const lbl  = r2 === 'en_estudio' ? 'En estudio' : r2 === 'contaminado' ? 'Contaminado'
                               : r2 === '0' ? 'Sin crecimiento (0)' : `Positivo (${r2})`;
                    const fSalida = rc.fecha_resultado
                        ? ` · Salida: ${_formatDate(rc.fecha_resultado)}` : '';
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="res-cod ${cls2}">${lbl}</span>
                        <small class="text-muted">N°${rc.numero_muestra} · Siembra: ${_formatDate(rc.fecha_cultivo)}${fSalida}</small>
                    </div>`);
                } else {
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="text-muted" style="font-size:.78rem">Pendiente resultado</span>
                    </div>`);
                }
            } else if (Number(eid) === 3) {
                const xu = JSON.parse(localStorage.getItem('sr_res_xpert_ultra') || '[]').find(r => r.recepcion_id === rec.id);
                if (xu) {
                    const cls2 = _resultadoXpertClsInd(xu.resultado);
                    let lbl = xu.resultado;
                    if (xu.resultado === 'MTB DETECTADO') {
                        const adnPart = xu.adn && xu.adn !== 'NO PROCEDE' ? ` · ADN: ${xu.adn}` : '';
                        const rifPart = xu.resistencia_rifampicina && xu.resistencia_rifampicina !== 'NO PROCEDE'
                            ? ` · Rifampicina: ${xu.resistencia_rifampicina}` : '';
                        lbl = `MTB DETECTADO${adnPart}${rifPart}`;
                    }
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="res-cod ${cls2} ind-res-cod-wrap">${lbl}</span>
                        <small class="text-muted">N°${xu.numero_muestra} · ${_formatDate(xu.fecha)}</small>
                    </div>`);
                } else {
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="text-muted" style="font-size:.78rem">Pendiente resultado</span>
                    </div>`);
                }
            } else if (Number(eid) === 5) {
                const xdr = JSON.parse(localStorage.getItem('sr_res_xpert_xdr') || '[]').find(r => r.recepcion_id === rec.id);
                if (xdr) {
                    const cls2 = _resultadoXpertClsInd(xdr.resultado);
                    let lbl = xdr.resultado;
                    if (xdr.resultado === 'MTB DETECTADO') {
                        const antibioticos = [
                            ['Isoniazida',     xdr.resistencia_isoniazida],
                            ['Fluorquinolona', xdr.resistencia_fluorquinolona],
                            ['Amikacina',      xdr.resistencia_amikacina],
                            ['Kanamicina',     xdr.resistencia_kanamicina],
                            ['Capreomicina',   xdr.resistencia_capreomicina],
                            ['Etionamida',     xdr.resistencia_etionamida],
                        ].filter(([, v]) => v && v !== 'NO DETECTADO')
                         .map(([k, v]) => `${k}: ${v}`).join(' · ');
                        lbl = antibioticos
                            ? `MTB DETECTADO · ${antibioticos}`
                            : 'MTB DETECTADO';
                    }
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="res-cod ${cls2} ind-res-cod-wrap">${lbl}</span>
                        <small class="text-muted">N°${xdr.numero_muestra} · ${_formatDate(xdr.fecha)}</small>
                    </div>`);
                } else {
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="text-muted" style="font-size:.78rem">Pendiente resultado</span>
                    </div>`);
                }
            }
        }
        if (parts.length) resBlock = `<div class="ind-res-block mt-2">${parts.join('')}</div>`;
    }

    return `
    <div class="ind-card${!esCreador ? ' ind-card-readonly' : ''}" data-ind-id="${ind.id}">
        <div class="ind-card-header">
            <div class="ind-pac-info">
                <span class="ind-pac-name">${pac ? pac.apellidos + ', ' + pac.nombres : '—'}</span>
                <span class="ind-pac-ci">CI: ${pac?.carnet_identidad || '—'}</span>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="${cls}">${label}</span>
                ${editable ? `<button class="btn-ind-action edit" data-id="${ind.id}" title="Editar examen y firma">
                    <i class="bi bi-pencil"></i></button>` : ''}
                ${puedeEliminar ? `<button class="btn-ind-action del" data-id="${ind.id}" title="Eliminar indicación">
                    <i class="bi bi-trash"></i></button>` : ''}
            </div>
        </div>
        ${contextoHtml}
        <div class="ind-card-body">
            <span><i class="bi bi-calendar3"></i> ${_formatDate(ind.fecha_indicacion)}</span>
            <span><i class="bi bi-hospital"></i> ${lab?.nombre || '—'}</span>
            <span><i class="bi bi-droplet-half"></i> ${muestra?.nombre || '—'}</span>
        </div>
        <div class="ind-card-tags">${tags}</div>
        ${resBlock}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   WIZARD — NUEVA INDICACIÓN (4 pasos)
   ══════════════════════════════════════════════════════════════ */

// Estado compartido entre pasos
let _st = {};
// Signature pad
let _sigCtx = null, _sigDrawing = false, _sigHasContent = false;

function _renderNuevaIndicacion(user, el) {
    _st = {
        user,
        paso: 1,
        medico: null,
        paciente: null,
        esNuevo: true,
        laboratorio_id: null,
        tipo_muestra_id: null,
        examenes_ids: [],
        observaciones: '',
        firma: null,   // se asignará en paso 4 desde perfil o canvas
        fecha_indicacion: _today(),
    };
    _sigHasContent = false;
    _sigCtx = null;

    el.innerHTML = `
    <div class="modulo-header">
        <div class="d-flex align-items-center gap-2">
            <button class="btn-back-mod" id="btn-volver-lista" title="Volver a la lista">
                <i class="bi bi-arrow-left"></i>
            </button>
            <div>
                <h2 class="modulo-title">Nueva indicación</h2>
                <p class="modulo-sub">Complete los cuatro pasos para registrar la solicitud.</p>
            </div>
        </div>
    </div>

    <div class="wizard-card">
        <div class="steps-bar" id="ind-steps-bar">
            <div class="step active" data-step="1">
                <span class="step-num">1</span><span class="step-label">Médico indicante</span>
            </div>
            <div class="step-line"></div>
            <div class="step" data-step="2">
                <span class="step-num">2</span><span class="step-label">Paciente</span>
            </div>
            <div class="step-line"></div>
            <div class="step" data-step="3">
                <span class="step-num">3</span><span class="step-label">Examen</span>
            </div>
            <div class="step-line"></div>
            <div class="step" data-step="4">
                <span class="step-num">4</span><span class="step-label">Firma</span>
            </div>
        </div>
        <div id="ind-step-content"></div>
    </div>`;

    document.getElementById('btn-volver-lista').addEventListener('click', () => {
        renderIndicaciones(_st.user, document.getElementById('app-content-inner'));
    });

    _goToPaso(1);
}

function _goToPaso(n) {
    _st.paso = n;

    document.querySelectorAll('#ind-steps-bar .step[data-step]').forEach(s => {
        const sn = parseInt(s.dataset.step);
        s.classList.toggle('active', sn === n);
        s.classList.toggle('done',   sn < n);
    });

    const el = document.getElementById('ind-step-content');
    if (!el) return;

    if (n === 1) { el.innerHTML = _htmlPaso1(); _initPaso1(); }
    if (n === 2) { el.innerHTML = _htmlPaso2(); _initPaso2(); }
    if (n === 3) { el.innerHTML = _htmlPaso3(); _initPaso3(); }
    if (n === 4) { el.innerHTML = _htmlPaso4(); _initPaso4(); }
}

/* ── Paso 1: Médico indicante ─────────────────────────────── */

function _htmlPaso1() {
    const u = _st.user;
    const esMedico = u.rol_profesional_id === 1;

    if (esMedico) {
        return `
        <div class="paso-inner">
            <div class="step-note">
                <i class="bi bi-info-circle-fill"></i>
                La indicación quedará registrada a su nombre como médico responsable.
            </div>
            <div class="row g-3 mt-1">
                <div class="col-12 col-md-6">
                    <label class="form-label">Nombres</label>
                    <input class="form-control" value="${u.nombres}" readonly>
                </div>
                <div class="col-12 col-md-6">
                    <label class="form-label">Apellidos</label>
                    <input class="form-control" value="${u.apellidos}" readonly>
                </div>
                <div class="col-12 col-md-6">
                    <label class="form-label">Registro profesional</label>
                    <input class="form-control ctrl-mono" value="${u.registro_profesional || '—'}" readonly>
                </div>
                <div class="col-12 col-md-5">
                    <label for="ind-fecha" class="form-label">Fecha de indicación</label>
                    <input type="date" id="ind-fecha" class="form-control"
                           value="${_today()}" max="${_today()}">
                </div>
            </div>
            <div class="paso-actions">
                <div></div>
                <button type="button" class="btn-primary-custom" id="p1-next">
                    Siguiente <i class="bi bi-arrow-right"></i>
                </button>
            </div>
        </div>`;
    }

    // Enfermero/a
    return `
    <div class="paso-inner">
        <div class="step-note">
            <i class="bi bi-info-circle-fill"></i>
            Como enfermero/a, debe indicar el médico que autoriza y se responsabiliza de la solicitud.
        </div>

        <div class="mb-3 mt-2">
            <label class="form-label fw-semibold">Tipo de referencia médica</label>
            <div class="d-flex flex-wrap gap-4">
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="medref-tipo"
                           id="medref-manual" value="manual" checked>
                    <label class="form-check-label" for="medref-manual">Ingresar datos manualmente</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="medref-tipo"
                           id="medref-sistema" value="sistema">
                    <label class="form-check-label" for="medref-sistema">Médico registrado en el sistema</label>
                </div>
            </div>
        </div>

        <div id="block-manual">
            <div class="row g-3">
                <div class="col-12 col-md-6">
                    <label for="med-nombres" class="form-label">Nombres del médico <span class="required">*</span></label>
                    <input type="text" id="med-nombres" class="form-control" placeholder="Ej: Roberto Carlos">
                    <div class="invalid-feedback" id="err-med-nombres"></div>
                </div>
                <div class="col-12 col-md-6">
                    <label for="med-apellidos" class="form-label">Apellidos <span class="required">*</span></label>
                    <input type="text" id="med-apellidos" class="form-control" placeholder="Ej: Pérez Ávila">
                    <div class="invalid-feedback" id="err-med-apellidos"></div>
                </div>
                <div class="col-12 col-md-6">
                    <label for="med-ci" class="form-label">Carnet de identidad <span class="required">*</span></label>
                    <input type="text" id="med-ci" class="form-control ctrl-mono" maxlength="20">
                    <div class="invalid-feedback" id="err-med-ci"></div>
                </div>
                <div class="col-12 col-md-6">
                    <label for="med-regpro" class="form-label">Registro profesional <span class="required">*</span></label>
                    <input type="text" id="med-regpro" class="form-control ctrl-mono" placeholder="Ej: RP-1234">
                    <div class="invalid-feedback" id="err-med-regpro"></div>
                </div>
            </div>
        </div>

        <div id="block-sistema" class="d-none">
            <div class="row g-3">
                <div class="col-12 col-md-8">
                    <label for="med-buscar-rp" class="form-label">Buscar médico por registro profesional</label>
                    <div class="input-group">
                        <input type="text" id="med-buscar-rp" class="form-control ctrl-mono"
                               placeholder="Ej: M20005464" maxlength="30">
                        <button class="btn-buscar" type="button" id="btn-buscar-med">
                            <i class="bi bi-search"></i> Buscar
                        </button>
                    </div>
                    <div class="invalid-feedback d-block mt-1" id="err-med-sistema"></div>
                </div>
            </div>
            <div id="med-found-card" class="d-none found-card mt-2"></div>
        </div>

        <div class="row mt-3">
            <div class="col-12 col-md-5">
                <label for="ind-fecha" class="form-label">Fecha de indicación</label>
                <input type="date" id="ind-fecha" class="form-control"
                       value="${_today()}" max="${_today()}">
            </div>
        </div>

        <div class="paso-actions">
            <div></div>
            <button type="button" class="btn-primary-custom" id="p1-next">
                Siguiente <i class="bi bi-arrow-right"></i>
            </button>
        </div>
    </div>`;
}

function _initPaso1() {
    const u = _st.user;
    const esMedico = u.rol_profesional_id === 1;

    if (esMedico) {
        _st.medico = {
            nombres: u.nombres, apellidos: u.apellidos,
            ci: u.ci, registro_prof: u.registro_profesional || '',
            usuario_id: u.id,
        };
        document.getElementById('p1-next').addEventListener('click', () => {
            _st.fecha_indicacion = document.getElementById('ind-fecha').value || _today();
            _goToPaso(2);
        });
        return;
    }

    // Enfermero/a: toggle entre bloques
    document.querySelectorAll('input[name="medref-tipo"]').forEach(r => {
        r.addEventListener('change', function () {
            document.getElementById('block-manual') .classList.toggle('d-none', this.value === 'sistema');
            document.getElementById('block-sistema').classList.toggle('d-none', this.value === 'manual');
            _st.medico = null;
            document.getElementById('med-found-card').classList.add('d-none');
            const errSis = document.getElementById('err-med-sistema');
            errSis.textContent = ''; errSis.style.display = 'none';
        });
    });

    document.getElementById('btn-buscar-med').addEventListener('click', _buscarMedicoSistema);
    document.getElementById('med-buscar-rp').addEventListener('keydown', e => {
        if (e.key === 'Enter') _buscarMedicoSistema();
    });
    document.getElementById('p1-next').addEventListener('click', _validarPaso1);
}

function _buscarMedicoSistema() {
    const rp    = document.getElementById('med-buscar-rp').value.trim();
    const errEl = document.getElementById('err-med-sistema');
    const card  = document.getElementById('med-found-card');

    errEl.textContent = ''; errEl.style.display = 'none';
    card.classList.add('d-none');

    if (!rp) { errEl.textContent = 'Ingrese un registro profesional.'; errEl.style.display = 'block'; return; }

    const users = JSON.parse(localStorage.getItem('sr_usuarios') || '[]');
    const med = users.find(u =>
        u.registro_profesional &&
        u.registro_profesional.trim().toLowerCase() === rp.toLowerCase() &&
        u.rol_profesional_id === 1 &&
        u.aprobado && u.activo
    );

    if (!med) {
        errEl.textContent = `No se encontró médico activo con registro profesional "${rp}".`;
        errEl.style.display = 'block';
        _st.medico = null;
        return;
    }

    _st.medico = {
        nombres: med.nombres, apellidos: med.apellidos,
        ci: med.ci, registro_prof: med.registro_profesional || '',
        usuario_id: med.id,
    };

    card.classList.remove('d-none');
    card.innerHTML = `
        <i class="bi bi-person-check text-success me-2"></i>
        <strong>Dr./Dra. ${med.nombres} ${med.apellidos}</strong>
        &nbsp;·&nbsp; Reg. prof.: ${med.registro_profesional}`;
}

function _validarPaso1() {
    const tipo = document.querySelector('input[name="medref-tipo"]:checked')?.value || 'manual';

    if (tipo === 'manual') {
        const campos = [
            ['med-nombres',   'err-med-nombres'],
            ['med-apellidos', 'err-med-apellidos'],
            ['med-ci',        'err-med-ci'],
            ['med-regpro',    'err-med-regpro'],
        ];
        let ok = true;
        campos.forEach(([id, errId]) => {
            const el = document.getElementById(id);
            const errEl = document.getElementById(errId);
            if (!el.value.trim()) {
                el.classList.add('is-invalid');
                errEl.textContent = 'Campo requerido.'; errEl.classList.add('show');
                ok = false;
            } else {
                el.classList.remove('is-invalid'); errEl.classList.remove('show');
            }
        });
        if (!ok) return;

        _st.medico = {
            nombres:      document.getElementById('med-nombres').value.trim(),
            apellidos:    document.getElementById('med-apellidos').value.trim(),
            ci:           document.getElementById('med-ci').value.trim(),
            registro_prof:document.getElementById('med-regpro').value.trim(),
            usuario_id:   null,
        };
    } else {
        if (!_st.medico) {
            const errEl = document.getElementById('err-med-sistema');
            errEl.textContent = 'Busque y seleccione un médico registrado en el sistema.';
            errEl.style.display = 'block';
            return;
        }
    }

    _st.fecha_indicacion = document.getElementById('ind-fecha').value || _today();
    _goToPaso(2);
}

/* ── Paso 2: Paciente ─────────────────────────────────────── */

function _htmlPaso2() {
    const allProvs = (typeof getGeoProvs !== 'undefined') ? getGeoProvs() : [];
    
    const provOpts = allProvs
        .map(p => `<option value="${p.nombre}"></option>`).join('');

    const gvHtml = _getGVCat().map(g => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="form-check">
                <input class="form-check-input gv-chk" type="checkbox"
                       id="gv-${g.id}" value="${g.id}">
                <label class="form-check-label" for="gv-${g.id}">${g.nombre}</label>
            </div>
        </div>`).join('');

    return `
    <div class="paso-inner">
        <div id="pac-form-block">
            <div class="row g-3">
                <div class="col-12 col-md-6" style="position:relative">
                    <label for="pac-ci" class="form-label">Carnet de identidad <span class="required">*</span></label>
                    <input type="text" id="pac-ci" class="form-control ctrl-mono" maxlength="20"
                           placeholder="Ej: 90061245678" autocomplete="off">
                    <div id="pac-ci-dropdown" class="pac-autocomplete-dropdown d-none"></div>
                    <div class="invalid-feedback" id="err-pac-ci"></div>
                    <div id="pac-found-banner" class="d-none mt-2"></div>
                </div>
                <div class="col-12 col-md-6">
                    <label for="pac-fnac" class="form-label">Fecha de nacimiento <span class="required">*</span></label>
                    <input type="date" id="pac-fnac" class="form-control" max="${_today()}">
                    <div class="invalid-feedback" id="err-pac-fnac"></div>
                </div>
                <div class="col-12 col-md-6">
                    <label for="pac-nombres" class="form-label">Nombres <span class="required">*</span></label>
                    <input type="text" id="pac-nombres" class="form-control" placeholder="Ej: Ana María">
                    <div class="invalid-feedback" id="err-pac-nombres"></div>
                </div>
                <div class="col-12 col-md-6">
                    <label for="pac-apellidos" class="form-label">Apellidos <span class="required">*</span></label>
                    <input type="text" id="pac-apellidos" class="form-control" placeholder="Ej: López Torres">
                    <div class="invalid-feedback" id="err-pac-apellidos"></div>
                </div>
                
                <div class="col-12 col-md-4">
                    <label for="pac-sexo-input" class="form-label">Sexo biológico <span class="required">*</span></label>
                    <input type="text" id="pac-sexo-input" class="form-control" list="dl-sexo" placeholder="— Seleccione —" autocomplete="off">
                    <datalist id="dl-sexo">
                        <option value="Masculino"></option>
                        <option value="Femenino"></option>
                    </datalist>
                    <input type="hidden" id="pac-sexo">
                    <div class="invalid-feedback" id="err-pac-sexo"></div>
                </div>
                
                <div class="col-12 col-md-4">
                    <label for="pac-prov-input" class="form-label">Provincia <span class="required">*</span></label>
                    <input type="text" id="pac-prov-input" class="form-control" list="dl-prov" placeholder="— Seleccione —" autocomplete="off">
                    <datalist id="dl-prov">${provOpts}</datalist>
                    <input type="hidden" id="pac-prov">
                    <div class="invalid-feedback" id="err-pac-prov"></div>
                </div>
                
                <div class="col-12 col-md-4">
                    <label for="pac-mun-input" class="form-label">Municipio <span class="required">*</span></label>
                    <input type="text" id="pac-mun-input" class="form-control" list="dl-mun" placeholder="— Seleccione provincia —" autocomplete="off" disabled>
                    <datalist id="dl-mun"></datalist>
                    <input type="hidden" id="pac-mun">
                    <div class="invalid-feedback" id="err-pac-mun"></div>
                </div>
            </div>

            <div class="mt-4">
                <label class="form-label fw-semibold">Grupos de vulnerabilidad</label>
                <p class="form-text mt-0 mb-2">Seleccione todos los aplicables al paciente.</p>
                <div id="gv-edad-hint" class="d-none mb-2"></div>
                <div class="row g-2" id="gv-grid">${gvHtml}</div>
            </div>
        </div>

        <div class="paso-actions">
            <button type="button" class="btn-secondary-custom" id="p2-back">
                <i class="bi bi-arrow-left"></i> Anterior
            </button>
            <button type="button" class="btn-primary-custom" id="p2-next">
                Siguiente <i class="bi bi-arrow-right"></i>
            </button>
        </div>
    </div>`;
}

function _initPaso2() {
    document.getElementById('p2-back').addEventListener('click', () => _goToPaso(1));
    document.getElementById('p2-next').addEventListener('click', _validarPaso2);

    const ciInput  = document.getElementById('pac-ci');
    const dropdown = document.getElementById('pac-ci-dropdown');
    const banner   = document.getElementById('pac-found-banner');
    
    // Configurar autocompletados (Sexo, Provincia, Municipio)
    const sexoInp = document.getElementById('pac-sexo-input');
    const sexoHid = document.getElementById('pac-sexo');
    sexoInp.addEventListener('input', () => {
        const v = sexoInp.value.toLowerCase().trim();
        sexoHid.value = v === 'masculino' ? 'M' : v === 'femenino' ? 'F' : '';
    });
    sexoInp.addEventListener('change', () => { if (!sexoHid.value) sexoInp.value = ''; });

    const provInp = document.getElementById('pac-prov-input');
    const provHid = document.getElementById('pac-prov');
    const munInp  = document.getElementById('pac-mun-input');
    const munHid  = document.getElementById('pac-mun');
    const munDl   = document.getElementById('dl-mun');

    provInp.addEventListener('input', () => {
        const p = getGeoProvs().find(x => x.nombre.toLowerCase() === provInp.value.toLowerCase().trim());
        provHid.value = p ? p.id : '';
    });
    
    provInp.addEventListener('change', () => {
        if (!provHid.value) {
            provInp.value = '';
            munInp.disabled = true;
            munInp.value = ''; munInp.placeholder = '— Seleccione provincia —';
            munHid.value = ''; munDl.innerHTML = '';
        } else {
            munInp.disabled = false;
            munInp.value = ''; munHid.value = ''; munInp.placeholder = '— Seleccione —';
            const muns = getGeoMuns().filter(m => m.provincia_id === Number(provHid.value));
            munDl.innerHTML = muns.map(m => `<option value="${m.nombre}"></option>`).join('');
        }
    });

    munInp.addEventListener('input', () => {
        const pId = Number(provHid.value);
        const m = getGeoMuns().find(x => x.provincia_id === pId && x.nombre.toLowerCase() === munInp.value.toLowerCase().trim());
        munHid.value = m ? m.id : '';
    });
    munInp.addEventListener('change', () => { if (!munHid.value) munInp.value = ''; });


    function _restFields(locked) {
        ['pac-fnac','pac-nombres','pac-apellidos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) locked ? el.setAttribute('readonly','') : el.removeAttribute('readonly');
        });
        ['pac-sexo-input','pac-prov-input','pac-mun-input'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = locked || (id === 'pac-mun-input' && !document.getElementById('pac-prov').value);
        });
        document.querySelectorAll('.gv-chk').forEach(c => c.disabled = locked);
    }

    function _resetForm() {
        ['pac-fnac','pac-nombres','pac-apellidos'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('pac-sexo').value = '';
        document.getElementById('pac-sexo-input').value = '';
        document.getElementById('pac-prov').value = '';
        document.getElementById('pac-prov-input').value = '';
        
        const mun = document.getElementById('pac-mun-input');
        mun.value = '';
        mun.placeholder = '— Seleccione provincia —';
        mun.disabled = true;
        document.getElementById('pac-mun').value = '';
        document.getElementById('dl-mun').innerHTML = '';
        
        document.querySelectorAll('.gv-chk').forEach(c => { c.checked = false; c.disabled = false; });
        document.getElementById('gv-edad-hint')?.classList.add('d-none');
        banner.classList.add('d-none');
        banner.innerHTML = '';
        _st.paciente = null; _st.esNuevo = true;
    }

    function _lockPaciente(pac) {
        _st.paciente = { ...pac }; _st.esNuevo = false;
        ciInput.value = pac.carnet_identidad;
        _rellenarFormPaciente(pac);
        _restFields(true);
        const edad = _calcEdad(pac.fecha_nacimiento);
        const munObj  = getGeoMuns().find(m => m.id === pac.municipio_id);
        const munStr = munObj ? munObj.nombre : '—';
        banner.innerHTML = `
            <div class="found-card">
                <i class="bi bi-person-check text-success me-2"></i>
                <strong>${pac.apellidos}, ${pac.nombres}</strong>
                &nbsp;·&nbsp; ${edad} a.
                &nbsp;·&nbsp; ${pac.sexo === 'M' ? 'Masc.' : 'Fem.'}
                &nbsp;·&nbsp; ${munStr}
                <span class="badge bg-success ms-2">Paciente existente</span>
                <button class="btn-link ms-3 text-danger" id="btn-cambiar-pac" style="font-size:.8rem;border:none;background:none;padding:0">
                    <i class="bi bi-x-circle"></i> Cambiar
                </button>
            </div>`;
        banner.classList.remove('d-none');
        document.getElementById('btn-cambiar-pac').addEventListener('click', () => {
            ciInput.removeAttribute('readonly');
            ciInput.value = '';
            ciInput.focus();
            _resetForm();
            _restFields(false);
        });
        ciInput.setAttribute('readonly','');
        dropdown.classList.add('d-none');
        dropdown.innerHTML = '';
    }

    function _renderDropdown(val) {
        const q = val.toLowerCase().trim();
        dropdown.classList.add('d-none');
        dropdown.innerHTML = '';
        if (q.length < 2) return;
        const matches = _getPacientes()
            .filter(p => p.carnet_identidad.toLowerCase().includes(q))
            .slice(0, 6);
        if (!matches.length) return;
        dropdown.innerHTML = matches.map((p, i) => {
            const edad = _calcEdad(p.fecha_nacimiento);
            const hi = txt => txt.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<mark>$1</mark>');
            return `<div class="pac-ac-item" data-idx="${i}" tabindex="0">
                <span class="pac-ac-name">${p.apellidos}, ${p.nombres}</span>
                <span class="pac-ac-meta">CI: ${hi(p.carnet_identidad)} · ${edad} a. · ${p.sexo === 'M' ? 'M' : 'F'}</span>
            </div>`;
        }).join('');
        dropdown.classList.remove('d-none');
        dropdown.querySelectorAll('.pac-ac-item').forEach((item, i) => {
            item.addEventListener('mousedown', e => { e.preventDefault(); _lockPaciente(matches[i]); });
            item.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _lockPaciente(matches[i]); } });
        });
    }

    ciInput.addEventListener('input', function () {
        _resetForm();
        _restFields(false);
        _renderDropdown(this.value);
        // Inferir fecha de nacimiento desde CI cubano mientras escribe
        if (this.value.length >= 6) {
            const fnac = _parseCIFechaNac(this.value.trim());
            if (fnac) {
                const fnacEl = document.getElementById('pac-fnac');
                if (!fnacEl.value) { fnacEl.value = fnac; _mostrarHintEdad(fnac); }
            }
        }
    });

    ciInput.addEventListener('keydown', e => {
        const items = [...dropdown.querySelectorAll('.pac-ac-item')];
        if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); }
        if (e.key === 'Escape') { dropdown.classList.add('d-none'); }
    });
    dropdown.addEventListener('keydown', e => {
        const items = [...dropdown.querySelectorAll('.pac-ac-item')];
        const idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown')  { e.preventDefault(); items[idx + 1]?.focus(); }
        if (e.key === 'ArrowUp')    { e.preventDefault(); idx > 0 ? items[idx - 1].focus() : ciInput.focus(); }
        if (e.key === 'Escape')     { dropdown.classList.add('d-none'); ciInput.focus(); }
    });
    document.addEventListener('click', e => {
        if (!ciInput.contains(e.target) && !dropdown.contains(e.target))
            dropdown.classList.add('d-none');
    }, { capture: false });

    document.getElementById('pac-fnac').addEventListener('change', function () {
        _mostrarHintEdad(this.value);
    });

    // Restaurar si se vuelve desde paso posterior
    if (_st.paciente) {
        if (_st.paciente.id) {
            _lockPaciente(_st.paciente);
        } else {
            _rellenarFormPaciente(_st.paciente);
        }
    }
}

function _mostrarHintEdad(fechaNac) {
    if (!fechaNac) return;
    const edad = _calcEdad(fechaNac);
    const hintEl = document.getElementById('gv-edad-hint');
    if (!hintEl) return;

    if (edad < 5) {
        hintEl.className = 'alert-custom alert-warning mb-2';
        hintEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>
            Edad calculada: <strong>${edad} año(s)</strong>. Se sugiere marcar <em>Niños ≤ 5 años</em>.`;
        const chk = document.getElementById('gv-12');
        if (chk) chk.checked = true;
    } else if (edad >= 60) {
        hintEl.className = 'alert-custom alert-warning mb-2';
        hintEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>
            Edad calculada: <strong>${edad} años</strong>. Se sugiere marcar <em>Adulto ≥ 60 años</em>.`;
        const chk = document.getElementById('gv-22');
        if (chk) chk.checked = true;
    } else {
        hintEl.className = 'alert-custom alert-info mb-2';
        hintEl.innerHTML = `<i class="bi bi-info-circle me-1"></i>
            Edad calculada: <strong>${edad} años</strong>.`;
    }
    hintEl.classList.remove('d-none');
}

function _rellenarFormPaciente(pac) {
    document.getElementById('pac-ci').value       = pac.carnet_identidad || '';
    document.getElementById('pac-nombres').value  = pac.nombres  || '';
    document.getElementById('pac-apellidos').value= pac.apellidos || '';
    document.getElementById('pac-fnac').value     = pac.fecha_nacimiento || '';
    
    if (pac.sexo) {
        document.getElementById('pac-sexo').value = pac.sexo;
        document.getElementById('pac-sexo-input').value = pac.sexo === 'M' ? 'Masculino' : 'Femenino';
    }

    if (pac.municipio_id) {
        const mun = getGeoMuns().find(m => m.id === pac.municipio_id);
        if (mun) {
            const prov = getGeoProvs().find(p => p.id === mun.provincia_id);
            document.getElementById('pac-prov').value = mun.provincia_id;
            document.getElementById('pac-prov-input').value = prov ? prov.nombre : '';

            const selInp = document.getElementById('pac-mun-input');
            const selHid = document.getElementById('pac-mun');
            const dlMun  = document.getElementById('dl-mun');
            selHid.value = pac.municipio_id;
            selInp.value = mun.nombre;
            selInp.disabled = false;
            
            const muns = getGeoMuns().filter(m => m.provincia_id === mun.provincia_id);
            dlMun.innerHTML = muns.map(m => `<option value="${m.nombre}"></option>`).join('');
        }
    }

    (pac.grupos_ids || []).forEach(gid => {
        const chk = document.getElementById(`gv-${gid}`);
        if (chk) chk.checked = true;
    });

    if (pac.fecha_nacimiento) _mostrarHintEdad(pac.fecha_nacimiento);
}

function _validarPaso2() {
    const campos = [
        [document.getElementById('pac-ci').value.trim(),        'pac-ci',         'err-pac-ci',        'Requerido'],
        [document.getElementById('pac-nombres').value.trim(),   'pac-nombres',    'err-pac-nombres',   'Requerido'],
        [document.getElementById('pac-apellidos').value.trim(), 'pac-apellidos',  'err-pac-apellidos', 'Requerido'],
        [document.getElementById('pac-fnac').value,             'pac-fnac',       'err-pac-fnac',      'Requerido'],
        [document.getElementById('pac-sexo').value,             'pac-sexo-input', 'err-pac-sexo',      'Requerido'],
        [document.getElementById('pac-prov').value,             'pac-prov-input', 'err-pac-prov',      'Requerido'],
        [document.getElementById('pac-mun').value,              'pac-mun-input',  'err-pac-mun',       'Requerido'],
    ];
    let ok = true;
    campos.forEach(([val, inputId, errId, msg]) => {
        const inp = document.getElementById(inputId);
        const err = document.getElementById(errId);
        if (!val) {
            inp?.classList.add('is-invalid');
            if (err) { err.textContent = msg; err.classList.add('show'); }
            ok = false;
        } else {
            inp?.classList.remove('is-invalid');
            err?.classList.remove('show');
        }
    });
    if (!ok) return;

    const grupos_ids = [...document.querySelectorAll('.gv-chk:checked')].map(c => parseInt(c.value));
    const munId = parseInt(document.getElementById('pac-mun').value);

    _st.paciente = {
        ...(_st.paciente || {}),
        carnet_identidad: document.getElementById('pac-ci').value.trim(),
        nombres:          document.getElementById('pac-nombres').value.trim(),
        apellidos:        document.getElementById('pac-apellidos').value.trim(),
        fecha_nacimiento: document.getElementById('pac-fnac').value,
        sexo:             document.getElementById('pac-sexo').value,
        municipio_id:     munId,
        grupos_ids,
    };
    _st.esNuevo = !_st.paciente.id;

    _goToPaso(3);
}

/* ── Paso 3: Examen ───────────────────────────────────────── */

function _htmlPaso3() {
    const provId   = _getUserProvinciaId(_st.user);
    const allLabs  = JSON.parse(localStorage.getItem('sr_geo_labs') || 'null') || (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.laboratorios : []);
    const labs     = allLabs.filter(l => l.provincia_id === provId && l.activo !== false);
    const allProvs = JSON.parse(localStorage.getItem('sr_geo_provincias') || 'null') || (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.provincias : []);
    const prov     = allProvs.find(p => p.id === provId)?.nombre || '—';

    const labsHtml = labs.map(l => `<option value="${l.nombre}${l.nivel_referencia ? ' — ' + l.nivel_referencia : ''}"></option>`).join('');
    const muestrasHtml = _getTMCat().map(m => `<option value="${m.nombre}"></option>`).join('');

    const examenesHtml = EXAMENES_TB_CAT.map(e => `
        <div class="col-12 col-sm-6 col-xl-4">
            <div class="exam-card">
                <input class="form-check-input exam-chk" type="checkbox"
                       id="ex-${e.id}" value="${e.id}">
                <label class="exam-label" for="ex-${e.id}">
                    <span class="exam-nombre">${e.nombre}</span>
                    <code class="exam-cod">${e.codigo}</code>
                </label>
            </div>
        </div>`).join('');

    return `
    <div class="paso-inner">
        <div class="row g-3">
            <div class="col-12 col-md-6">
                <label for="ind-lab-input" class="form-label">Laboratorio receptor <span class="required">*</span></label>
                <input type="text" id="ind-lab-input" class="form-control" list="dl-lab" placeholder="— Seleccione —" autocomplete="off">
                <datalist id="dl-lab">${labsHtml}</datalist>
                <input type="hidden" id="ind-lab">
                <div class="form-text">Laboratorios de la provincia <em>${prov}</em>.</div>
                <div class="invalid-feedback" id="err-ind-lab"></div>
            </div>
            <div class="col-12 col-md-6">
                <label for="ind-muestra-input" class="form-label">Tipo de muestra <span class="required">*</span></label>
                <input type="text" id="ind-muestra-input" class="form-control" list="dl-muestra" placeholder="— Seleccione —" autocomplete="off">
                <datalist id="dl-muestra">${muestrasHtml}</datalist>
                <input type="hidden" id="ind-muestra">
                <div class="invalid-feedback" id="err-ind-muestra"></div>
            </div>

            <div class="col-12">
                <label class="form-label fw-semibold">Exámenes indicados <span class="required">*</span></label>
                <p class="form-text mt-0">Seleccione uno o más. Pueden indicarse simultáneamente sobre la misma muestra.</p>
                <div class="row g-2" id="examenes-grid">${examenesHtml}</div>
                <div class="invalid-feedback d-block" id="err-ind-examenes"></div>
            </div>

            <div class="col-12">
                <label for="ind-obs" class="form-label">
                    Observaciones clínicas
                    <span class="text-muted fw-normal">(opcional)</span>
                </label>
                <textarea id="ind-obs" class="form-control" rows="3"
                    placeholder="Datos clínicos relevantes, motivo de la indicación…"></textarea>
            </div>
        </div>

        <div class="paso-actions">
            <button type="button" class="btn-secondary-custom" id="p3-back">
                <i class="bi bi-arrow-left"></i> Anterior
            </button>
            <button type="button" class="btn-primary-custom" id="p3-next">
                Siguiente <i class="bi bi-arrow-right"></i>
            </button>
        </div>
    </div>`;
}

function _initPaso3() {
    document.getElementById('p3-back').addEventListener('click', () => _goToPaso(2));
    document.getElementById('p3-next').addEventListener('click', _validarPaso3);

    const provId   = _getUserProvinciaId(_st.user);
    const allLabs  = JSON.parse(localStorage.getItem('sr_geo_labs') || 'null') || (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.laboratorios : []);
    const labs     = allLabs.filter(l => l.provincia_id === provId && l.activo !== false);
    const tmCat    = _getTMCat();

    const labInp = document.getElementById('ind-lab-input');
    const labHid = document.getElementById('ind-lab');
    labInp.addEventListener('input', () => {
        const v = labInp.value.toLowerCase().trim();
        const l = labs.find(x => {
            const nom = `${x.nombre}${x.nivel_referencia ? ' — ' + x.nivel_referencia : ''}`.toLowerCase();
            return nom === v;
        });
        labHid.value = l ? l.id : '';
    });
    labInp.addEventListener('change', () => { if (!labHid.value) labInp.value = ''; });

    const mInp = document.getElementById('ind-muestra-input');
    const mHid = document.getElementById('ind-muestra');
    mInp.addEventListener('input', () => {
        const v = mInp.value.toLowerCase().trim();
        const m = tmCat.find(x => x.nombre.toLowerCase() === v);
        mHid.value = m ? m.id : '';
    });
    mInp.addEventListener('change', () => { if (!mHid.value) mInp.value = ''; });

    // Restaurar selecciones al volver
    if (_st.laboratorio_id) {
        const l = labs.find(x => x.id === Number(_st.laboratorio_id));
        if(l) { labInp.value = `${l.nombre}${l.nivel_referencia ? ' — ' + l.nivel_referencia : ''}`; labHid.value = l.id; }
    }
    if (_st.tipo_muestra_id) {
        const m = tmCat.find(x => x.id === Number(_st.tipo_muestra_id));
        if(m) { mInp.value = m.nombre; mHid.value = m.id; }
    }

    _st.examenes_ids.forEach(eid => {
        const chk = document.getElementById(`ex-${eid}`);
        if (chk) chk.checked = true;
    });
    if (_st.observaciones) document.getElementById('ind-obs').value = _st.observaciones;
}

function _validarPaso3() {
    const lab    = document.getElementById('ind-lab').value;
    const muestra= document.getElementById('ind-muestra').value;
    const exams  = [...document.querySelectorAll('.exam-chk:checked')].map(c => parseInt(c.value));
    let ok = true;

    const labEl  = document.getElementById('ind-lab-input');
    const errLab = document.getElementById('err-ind-lab');
    if (!lab)    { labEl.classList.add('is-invalid');    errLab.textContent = 'Seleccione un laboratorio válido.';   errLab.classList.add('show'); ok = false; }
    else         { labEl.classList.remove('is-invalid'); errLab.classList.remove('show'); }

    const munEl  = document.getElementById('ind-muestra-input');
    const errMun = document.getElementById('err-ind-muestra');
    if (!muestra){ munEl.classList.add('is-invalid');    errMun.textContent = 'Seleccione un tipo de muestra válido.'; errMun.classList.add('show'); ok = false; }
    else         { munEl.classList.remove('is-invalid'); errMun.classList.remove('show'); }

    const errExEl = document.getElementById('err-ind-examenes');
    if (exams.length === 0) { errExEl.textContent = 'Seleccione al menos un examen.'; errExEl.style.display = 'block'; ok = false; }
    else                    { errExEl.style.display = 'none'; }

    if (!ok) return;

    _st.laboratorio_id  = parseInt(lab);
    _st.tipo_muestra_id = parseInt(muestra);
    _st.examenes_ids    = exams;
    _st.observaciones   = document.getElementById('ind-obs').value.trim();
    _goToPaso(4);
}

/* ── Paso 4: Resumen + Firma ──────────────────────────────── */

function _htmlPaso4() {
    const pac     = _st.paciente;
    const medico  = _st.medico;
    const allLabs = JSON.parse(localStorage.getItem('sr_geo_labs') || 'null') || (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.laboratorios : []);
    const lab     = allLabs.find(l => l.id === _st.laboratorio_id);
    const allMuns = JSON.parse(localStorage.getItem('sr_geo_municipios') || 'null') || (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.municipios : []);
    const muestra = _getTMCat().find(m => m.id === _st.tipo_muestra_id)
                 || TIPOS_MUESTRA_CAT.find(m => m.id === _st.tipo_muestra_id);
    const mun     = allMuns.find(m => m.id === pac?.municipio_id)?.nombre || '—';
    const edad    = pac?.fecha_nacimiento ? _calcEdad(pac.fecha_nacimiento) : '—';
    const sexoStr = pac?.sexo === 'M' ? 'Masculino' : 'Femenino';
    const allGV   = _getGVCat().concat(GRUPOS_VULNERABLES_CAT);
    const gvNom   = [...new Set(pac?.grupos_ids || [])].map(gid =>
        allGV.find(g => g.id === gid)?.nombre || '?');
    const examTags = _st.examenes_ids
        .map(eid => `<span class="exam-tag">${EXAMENES_TB_CAT.find(e => e.id === eid)?.codigo || '?'}</span>`)
        .join('');
    const nuevoLabel = _st.esNuevo
        ? '<span class="badge bg-info ms-2">Nuevo registro</span>'
        : '<span class="badge bg-secondary ms-2">Paciente existente</span>';

    return `
    <div class="paso-inner">

        <div class="ind-resumen">
            <h6 class="resumen-titulo">
                <i class="bi bi-clipboard2-check me-2"></i>Resumen de la indicación
            </h6>

            <div class="resumen-grid">
                <div class="resumen-item">
                    <div class="ri-label">Médico indicante</div>
                    <div class="ri-val">Dr./Dra. ${medico?.nombres} ${medico?.apellidos}</div>
                    <div class="ri-sub">Reg. prof.: ${medico?.registro_prof || '—'}</div>
                </div>
                <div class="resumen-item">
                    <div class="ri-label">Paciente ${nuevoLabel}</div>
                    <div class="ri-val">${pac?.apellidos}, ${pac?.nombres}</div>
                    <div class="ri-sub">
                        CI: ${pac?.carnet_identidad}&nbsp;·&nbsp;${edad} años&nbsp;·&nbsp;${sexoStr}&nbsp;·&nbsp;${mun}
                    </div>
                    ${gvNom.length ? `<div class="ri-gv">
                        <i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                        ${gvNom.join(' · ')}
                    </div>` : ''}
                </div>
                <div class="resumen-item">
                    <div class="ri-label">Laboratorio</div>
                    <div class="ri-val">${lab?.nombre || '—'}</div>
                </div>
                <div class="resumen-item">
                    <div class="ri-label">Tipo de muestra</div>
                    <div class="ri-val">${muestra?.nombre || '—'}</div>
                </div>
                <div class="resumen-item">
                    <div class="ri-label">Exámenes indicados</div>
                    <div class="ri-val">${examTags}</div>
                </div>
                <div class="resumen-item">
                    <div class="ri-label">Fecha</div>
                    <div class="ri-val">${_formatDate(_st.fecha_indicacion)}</div>
                </div>
                ${_st.observaciones ? `
                <div class="resumen-item resumen-full">
                    <div class="ri-label">Observaciones</div>
                    <div class="ri-val">${_st.observaciones}</div>
                </div>` : ''}
            </div>
        </div>

        <div class="firma-block mt-4" id="firma-block-wrapper">
            </div>

        <div id="ind-submit-alert" class="alert-custom d-none mt-3"></div>

        <div class="paso-actions">
            <button type="button" class="btn-secondary-custom" id="p4-back">
                <i class="bi bi-arrow-left"></i> Anterior
            </button>
            <button type="button" class="btn-primary-custom" id="p4-submit">
                <i class="bi bi-check-circle"></i> Confirmar y guardar
            </button>
        </div>
    </div>`;
}

function _initPaso4() {
    document.getElementById('p4-back').addEventListener('click', () => _goToPaso(3));
    document.getElementById('p4-submit').addEventListener('click', _submitIndicacion);
    _renderFirmaBlock();
}

/**
 * Inyecta el bloque de firma en paso 4:
 * - Si el usuario tiene firma guardada en su perfil → la muestra como
 * vista previa y la pre-carga en _st.firma. El canvas queda oculto
 * detrás de un enlace opcional "Usar firma diferente".
 * - Si no tiene firma guardada → muestra el canvas pad con nota
 * orientativa para que guarde una en Mi perfil.
 */
function _renderFirmaBlock() {
    const wrapper  = document.getElementById('firma-block-wrapper');
    if (!wrapper) return;

    const savedFirma = localStorage.getItem(`sr_firma_${_st.user.id}`);

    if (savedFirma) {
        // Pre-cargar firma del perfil; no se pedirá al usuario que dibuje
        _st.firma      = savedFirma;
        _sigHasContent = true;

        wrapper.innerHTML = `
            <label class="form-label fw-semibold">
                <i class="bi bi-pen"></i> Firma de quien indica
            </label>
            <div class="firma-perfil-preview">
                <img id="firma-preview-img" src="${savedFirma}" alt="Firma del perfil"
                     class="firma-preview-img">
                <p class="form-text mb-1">
                    <i class="bi bi-check-circle-fill text-success me-1"></i>
                    Se usará la firma registrada en su perfil.
                </p>
                <button type="button" class="btn-link-sm" id="btn-usar-otra-firma">
                    <i class="bi bi-pencil-square me-1"></i>Usar una firma diferente para esta indicación
                </button>
            </div>
            <div id="firma-canvas-wrap" class="d-none mt-3">
                <div class="firma-wrapper">
                    <canvas id="firma-canvas" width="520" height="160"
                            aria-label="Área de firma digital"></canvas>
                </div>
                <div class="mt-2 d-flex align-items-center gap-3">
                    <button type="button" class="btn-secondary-custom btn-sm" id="btn-clear-firma">
                        <i class="bi bi-eraser"></i> Limpiar
                    </button>
                    <button type="button" class="btn-link-sm text-muted" id="btn-cancelar-otra-firma">
                        <i class="bi bi-x-circle me-1"></i>Cancelar — usar firma del perfil
                    </button>
                </div>
            </div>
            <div class="invalid-feedback d-block mt-1" id="err-firma"></div>`;

        document.getElementById('btn-usar-otra-firma').addEventListener('click', () => {
            document.getElementById('firma-canvas-wrap').classList.remove('d-none');
            document.getElementById('btn-usar-otra-firma').classList.add('d-none');
            _st.firma      = null;   // resetear: se usará lo que dibuje el canvas
            _sigHasContent = false;
            _initSignaturePad('firma-canvas');
        });

        document.getElementById('btn-cancelar-otra-firma').addEventListener('click', () => {
            document.getElementById('firma-canvas-wrap').classList.add('d-none');
            document.getElementById('btn-usar-otra-firma').classList.remove('d-none');
            _clearFirma();
            _st.firma      = savedFirma;
            _sigHasContent = true;
        });

    } else {
        // Sin firma en perfil — mostrar canvas obligatorio con nota orientativa
        _st.firma      = null;
        _sigHasContent = false;

        wrapper.innerHTML = `
            <label class="form-label fw-semibold">
                <i class="bi bi-pen"></i> Firma de quien indica
            </label>
            <div class="step-note mb-2">
                <i class="bi bi-info-circle-fill"></i>
                No tiene firma registrada en su perfil. Puede guardar una permanente en
                <strong>Mi perfil → Firma digital</strong> para no tener que dibujarla
                en cada indicación.
            </div>
            <p class="form-text mt-0">Trace su firma en el recuadro para esta indicación.</p>
            <div class="firma-wrapper">
                <canvas id="firma-canvas" width="520" height="160"
                        aria-label="Área de firma digital"></canvas>
            </div>
            <div class="mt-2 d-flex align-items-center gap-3">
                <button type="button" class="btn-secondary-custom btn-sm" id="btn-clear-firma">
                    <i class="bi bi-eraser"></i> Limpiar
                </button>
            </div>
            <div class="invalid-feedback d-block mt-1" id="err-firma"></div>`;

        document.getElementById('btn-clear-firma').addEventListener('click', _clearFirma);
        _initSignaturePad('firma-canvas');
    }
}

/* ── Signature Pad ────────────────────────────────────────── */

function _initSignaturePad(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    _sigCtx = canvas.getContext('2d');
    _sigCtx.strokeStyle = '#1a1a2e';
    _sigCtx.lineWidth   = 2.2;
    _sigCtx.lineCap     = 'round';
    _sigCtx.lineJoin    = 'round';
    _sigDrawing = false; _sigHasContent = false;

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const sx = canvas.width  / r.width;
        const sy = canvas.height / r.height;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
    }

    canvas.addEventListener('mousedown', e => {
        _sigDrawing = true;
        const p = pos(e); _sigCtx.beginPath(); _sigCtx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('mousemove', e => {
        if (!_sigDrawing) return;
        const p = pos(e); _sigCtx.lineTo(p.x, p.y); _sigCtx.stroke();
        _sigHasContent = true;
    });
    canvas.addEventListener('mouseup',    () => { _sigDrawing = false; });
    canvas.addEventListener('mouseleave', () => { _sigDrawing = false; });

    canvas.addEventListener('touchstart', e => {
        e.preventDefault(); _sigDrawing = true;
        const p = pos(e); _sigCtx.beginPath(); _sigCtx.moveTo(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!_sigDrawing) return;
        const p = pos(e); _sigCtx.lineTo(p.x, p.y); _sigCtx.stroke();
        _sigHasContent = true;
    }, { passive: false });
    canvas.addEventListener('touchend', () => { _sigDrawing = false; });
}

function _clearFirma() {
    const canvas = document.getElementById('firma-canvas');
    if (_sigCtx && canvas) _sigCtx.clearRect(0, 0, canvas.width, canvas.height);
    _sigHasContent = false;
}

/* ── Submit ───────────────────────────────────────────────── */

function _submitIndicacion() {
    const errFirma = document.getElementById('err-firma');
    if (!_sigHasContent && !_st.firma) {
        errFirma.textContent = 'La firma es obligatoria. Trace su firma en el recuadro.';
        errFirma.style.display = 'block';
        return;
    }
    errFirma.style.display = 'none';

    const btn = document.getElementById('p4-submit');
    btn.disabled = true;

    const pacientes    = _getPacientes();
    const indicaciones = _getIndicaciones();
    let pacienteId;

    if (_st.paciente?.id) {
        // Paciente existente: actualizar grupos de vulnerabilidad
        pacienteId = _st.paciente.id;
        const idx = pacientes.findIndex(p => p.id === pacienteId);
        if (idx !== -1) {
            pacientes[idx].grupos_ids = _st.paciente.grupos_ids;
            _savePacientes(pacientes);
        }
    } else {
        // Nuevo paciente
        const nuevo = {
            id:          _genUUID(),
            ..._st.paciente,
            creado_por:  _st.user.id,
            creado_en:   new Date().toISOString(),
        };
        pacienteId = nuevo.id;
        _st.paciente.id = pacienteId;
        pacientes.push(nuevo);
        _savePacientes(pacientes);
    }

    // Obtener firma: si hay una pre-cargada del perfil, usarla;
    // si el usuario dibujó una nueva en el canvas, tomarla del canvas.
    let firmaDataUrl = _st.firma || null;
    if (_sigHasContent) {
        const canvas = document.getElementById('firma-canvas');
        if (canvas) firmaDataUrl = canvas.toDataURL('image/png');
    }

    const nuevaInd = {
        id:              _genUUID(),
        paciente_id:     pacienteId,
        indicado_por:    _st.user.id,
        medico:          _st.medico,
        laboratorio_id:  _st.laboratorio_id,
        tipo_muestra_id: _st.tipo_muestra_id,
        examenes_ids:    _st.examenes_ids,
        observaciones:   _st.observaciones,
        fecha_indicacion:_st.fecha_indicacion,
        firma_digital:   firmaDataUrl,
        estado:          'pendiente',
        creado_en:       new Date().toISOString(),
    };

    indicaciones.push(nuevaInd);
    _saveIndicaciones(indicaciones);

    const alertEl = document.getElementById('ind-submit-alert');
    alertEl.className = 'alert-custom alert-success';
    alertEl.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Indicación registrada correctamente.';
    alertEl.classList.remove('d-none');

    setTimeout(() => {
        const el = document.getElementById('app-content-inner');
        if (el) renderIndicaciones(_st.user, el);
    }, 1400);
}

/* ══════════════════════════════════════════════════════════════
   EDITAR INDICACIÓN — solo pasos Examen (3) y Firma (4)
   ══════════════════════════════════════════════════════════════ */

function _renderEditarIndicacion(user, el, ind) {
    _st = {
        user,
        modo: 'editar',
        indId: ind.id,
        medico:          ind.medico,
        paciente:        _getPacientes().find(p => p.id === ind.paciente_id) || {},
        esNuevo:         false,
        laboratorio_id:  ind.laboratorio_id,
        tipo_muestra_id: ind.tipo_muestra_id,
        examenes_ids:    ind.examenes_ids || [],
        observaciones:   ind.observaciones || '',
        firma:           ind.firma_digital || null,
        fecha_indicacion:ind.fecha_indicacion,
        paso: 3,
    };
    _sigHasContent = !!ind.firma_digital;
    _sigCtx = null;

    el.innerHTML = `
    <div class="modulo-header">
        <div class="d-flex align-items-center gap-2">
            <button class="btn-back-mod" id="btn-volver-lista" title="Volver a la lista">
                <i class="bi bi-arrow-left"></i>
            </button>
            <div>
                <h2 class="modulo-title">Editar indicación</h2>
                <p class="modulo-sub">Solo puede modificar el examen y la firma.</p>
            </div>
        </div>
    </div>

    <div class="wizard-card">
        <div class="steps-bar" id="ind-steps-bar">
            <div class="step active" data-step="3">
                <span class="step-num">3</span><span class="step-label">Examen</span>
            </div>
            <div class="step-line"></div>
            <div class="step" data-step="4">
                <span class="step-num">4</span><span class="step-label">Firma</span>
            </div>
        </div>
        <div id="ind-step-content"></div>
    </div>`;

    document.getElementById('btn-volver-lista').addEventListener('click', () => {
        renderIndicaciones(user, document.getElementById('app-content-inner'));
    });

    _goToEditPaso(3);
}

function _goToEditPaso(n) {
    _st.paso = n;
    document.querySelectorAll('#ind-steps-bar .step[data-step]').forEach(s => {
        const sn = parseInt(s.dataset.step);
        s.classList.toggle('active', sn === n);
        s.classList.toggle('done',   sn < n);
    });
    const el = document.getElementById('ind-step-content');
    if (!el) return;
    if (n === 3) { el.innerHTML = _htmlPaso3(); _initPaso3Edit(); }
    if (n === 4) { el.innerHTML = _htmlPaso4(); _initPaso4Edit(); }
}

function _initPaso3Edit() {
    _initPaso3(); // Utiliza las funciones de renderizado y eventos de lista que ya creamos para nueva indicación.
    
    // Sobrescribir el evento del botón Next para que dirija a paso 4 en modo edición.
    const btnNext = document.getElementById('p3-next');
    // clonamos el botón para quitarle el event listener previo
    const newBtnNext = btnNext.cloneNode(true);
    btnNext.parentNode.replaceChild(newBtnNext, btnNext);

    document.getElementById('p3-back').addEventListener('click', () => {
        renderIndicaciones(_st.user, document.getElementById('app-content-inner'));
    });
    
    newBtnNext.addEventListener('click', () => {
        const lab    = document.getElementById('ind-lab').value;
        const muestra= document.getElementById('ind-muestra').value;
        const exams  = [...document.querySelectorAll('.exam-chk:checked')].map(c => parseInt(c.value));
        let ok = true;

        const labEl  = document.getElementById('ind-lab-input');
        const errLab = document.getElementById('err-ind-lab');
        if (!lab)    { labEl.classList.add('is-invalid');    errLab.textContent = 'Seleccione un laboratorio.';   errLab.classList.add('show'); ok = false; }
        else         { labEl.classList.remove('is-invalid'); errLab.classList.remove('show'); }

        const munEl  = document.getElementById('ind-muestra-input');
        const errMun = document.getElementById('err-ind-muestra');
        if (!muestra){ munEl.classList.add('is-invalid');    errMun.textContent = 'Seleccione tipo de muestra.'; errMun.classList.add('show'); ok = false; }
        else         { munEl.classList.remove('is-invalid'); errMun.classList.remove('show'); }

        const errExEl = document.getElementById('err-ind-examenes');
        if (exams.length === 0) { errExEl.textContent = 'Seleccione al menos un examen.'; errExEl.style.display = 'block'; ok = false; }
        else                    { errExEl.style.display = 'none'; }

        if (!ok) return;
        _st.laboratorio_id  = parseInt(lab);
        _st.tipo_muestra_id = parseInt(muestra);
        _st.examenes_ids    = exams;
        _st.observaciones   = document.getElementById('ind-obs').value.trim();
        _goToEditPaso(4);
    });
}

function _initPaso4Edit() {
    document.getElementById('p4-back').addEventListener('click', () => _goToEditPaso(3));
    document.getElementById('p4-submit').addEventListener('click', _submitEdicion);
    // Reutilizar _renderFirmaBlock: gestiona la firma del perfil y el canvas
    // igual que en el flujo de nueva indicación.
    _renderFirmaBlock();
}

function _submitEdicion() {
    const btn = document.getElementById('p4-submit');
    const errFirma = document.getElementById('err-firma');

    if (!_sigHasContent && !_st.firma) {
        errFirma.textContent = 'La firma es obligatoria.';
        errFirma.style.display = 'block';
        return;
    }
    errFirma.style.display = 'none';
    btn.disabled = true;

    // Misma lógica que _submitIndicacion: canvas dibujado tiene prioridad
    let firmaDataUrl = _st.firma || null;
    if (_sigHasContent) {
        const canvas = document.getElementById('firma-canvas');
        if (canvas) firmaDataUrl = canvas.toDataURL('image/png');
    }

    const inds = _getIndicaciones();
    const idx  = inds.findIndex(i => i.id === _st.indId);
    if (idx !== -1) {
        inds[idx].laboratorio_id  = _st.laboratorio_id;
        inds[idx].tipo_muestra_id = _st.tipo_muestra_id;
        inds[idx].examenes_ids    = _st.examenes_ids;
        inds[idx].observaciones   = _st.observaciones;
        inds[idx].firma_digital   = firmaDataUrl;
        inds[idx].editado_en      = new Date().toISOString();
    }
    _saveIndicaciones(inds);

    const alertEl = document.getElementById('ind-submit-alert');
    alertEl.className = 'alert-custom alert-success';
    alertEl.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Indicación actualizada correctamente.';
    alertEl.classList.remove('d-none');

    setTimeout(() => {
        const el = document.getElementById('app-content-inner');
        if (el) renderIndicaciones(_st.user, el);
    }, 1400);
}