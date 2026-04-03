/* =========================================================
   lab_resumen.js — Tab "Resumen de laboratorio"
   Índice de proceso y control de calidad por laboratorio.
   Las cards de Tipos de muestra, Pirámide y Grupos de
   vulnerabilidad tienen selector de tipo de examen.

   Requiere (cargados antes):
     laboratorio_core.js  — _getResBaci, _getResCultivo, etc.
     home_lab.js          — _hl_charts, _hl_ensureChartJS, _hl_destroyCharts
     indicacion.js        — _getGVCat, _getTMCat  (opcionales, con fallback)
   ========================================================= */

/* ══════════════════════════════════════════════════════════
   PUNTO DE ENTRADA
   ══════════════════════════════════════════════════════════ */
function renderLabResumen(user, content) {
    _hl_ensureChartJS(() => _lr_buildShell(user, content));
}

/* ══════════════════════════════════════════════════════════
   SHELL — selector de laboratorio y filtros de fecha
   ══════════════════════════════════════════════════════════ */
function _lr_buildShell(user, content) {
    const permLabIds = [...new Set([
        ..._labsConPermiso(user.id, 'puede_emitir'),
        ..._labsConPermiso(user.id, 'puede_editar'),
        ..._labsConPermiso(user.id, 'puede_eliminar'),
    ])];

    if (!permLabIds.length) {
        content.innerHTML = `<div class="modulo-placeholder">
            <i class="bi bi-bar-chart-line"></i>
            <p>No tiene laboratorios asignados para generar estadísticas.</p>
        </div>`;
        return;
    }

    const allLabs = (window._store.geo_labs && window._store.geo_labs.length)
                  ? window._store.geo_labs
                  : (typeof DATOS_GEO !== 'undefined' ? (DATOS_GEO.laboratorios || []) : []);
    const labs = permLabIds.map(id => allLabs.find(l => l.id === id)).filter(Boolean);

    content.innerHTML = `
    <div style="background:#fff;border:1px solid var(--border,#e2e8f0);border-radius:12px;
                padding:.9rem 1.25rem;margin-bottom:1.5rem">
        <div class="d-flex gap-3 align-items-end flex-wrap">
            <div style="flex: 1 1 240px; min-width: 200px;">
                <label class="d-block mb-1"
                    style="font-size:.7rem;font-weight:700;text-transform:uppercase;
                           letter-spacing:.07em;color:var(--text-muted,#6b7280)">
                    Laboratorio
                </label>
                <input type="text" id="lr-lab-input" class="form-control form-control-sm"
                       list="lr-lab-list" placeholder="— Todos mis laboratorios —" style="width: 100%;">
                <datalist id="lr-lab-list">
                    ${labs.map(l => `<option value="${l.nombre}${l.nivel_referencia ? ' — ' + l.nivel_referencia : ''}"></option>`).join('')}
                </datalist>
            </div>
            <div>
                <label class="d-block mb-1"
                    style="font-size:.7rem;font-weight:700;text-transform:uppercase;
                           letter-spacing:.07em;color:var(--text-muted,#6b7280)">Desde</label>
                <input type="date" id="lr-from" class="form-control form-control-sm"
                       style="min-width:148px">
            </div>
            <div>
                <label class="d-block mb-1"
                    style="font-size:.7rem;font-weight:700;text-transform:uppercase;
                           letter-spacing:.07em;color:var(--text-muted,#6b7280)">Hasta</label>
                <input type="date" id="lr-to" class="form-control form-control-sm"
                       style="min-width:148px">
            </div>
            <button class="btn-primary-custom" id="lr-apply"
                    style="padding:.42rem 1rem;font-size:.84rem">
                <i class="bi bi-funnel"></i> Aplicar
            </button>
            <button class="btn-secondary-custom" id="lr-clear"
                    style="padding:.42rem 1rem;font-size:.84rem">
                <i class="bi bi-arrow-counterclockwise"></i> Todo
            </button>
        </div>
    </div>
    <div id="lr-panel"></div>`;

    if (labs.length === 1) {
        const l = labs[0];
        document.getElementById('lr-lab-input').value = `${l.nombre}${l.nivel_referencia ? ' — ' + l.nivel_referencia : ''}`;
    }

    const _run = () => {
        const labText = document.getElementById('lr-lab-input')?.value.trim();
        let ids = permLabIds;
        if (labText) {
            const matched = labs.find(l => {
                const nc = `${l.nombre}${l.nivel_referencia ? ' — ' + l.nivel_referencia : ''}`;
                return nc.toLowerCase() === labText.toLowerCase();
            });
            ids = matched ? [matched.id] : [];
        }
        const from = document.getElementById('lr-from')?.value  || null;
        const to   = document.getElementById('lr-to')?.value    || null;
        _lr_renderPanel(document.getElementById('lr-panel'), ids, from, to);
    };

    document.getElementById('lr-apply').addEventListener('click', _run);
    document.getElementById('lr-clear').addEventListener('click', () => {
        document.getElementById('lr-lab-input').value = '';
        document.getElementById('lr-from').value = '';
        document.getElementById('lr-to').value   = '';
        _run();
    });
    document.getElementById('lr-lab-input').addEventListener('change', _run);
    _run();
}

/* ══════════════════════════════════════════════════════════
   PANEL PRINCIPAL
   ══════════════════════════════════════════════════════════ */
function _lr_renderPanel(el, labIds, dateFrom, dateTo) {
    if (!el) return;
    _hl_destroyCharts();

    const d     = _lr_computeData(labIds, dateFrom, dateTo);
    const total = d.counts.pendiente + d.counts.recibida + d.counts.rechazada + d.counts.completada;

    el.innerHTML = `

    <div class="row row-cols-2 row-cols-sm-3 row-cols-lg-5 g-2 mb-4">
        ${_lr_pill('Total',       total,               '#0b1e3d', 'bi-collection')}
        ${_lr_pill('Pendientes',  d.counts.pendiente,  '#f0a500', 'bi-hourglass-split')}
        ${_lr_pill('Recibidas',   d.counts.recibida,   '#1a56db', 'bi-flask')}
        ${_lr_pill('Rechazadas',  d.counts.rechazada,  '#e0435a', 'bi-x-circle')}
        ${_lr_pill('Completadas', d.counts.completada, '#00b87a', 'bi-check-circle-fill')}
    </div>

    <div class="col-12 col-lg-8">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="mb-3 lr-card-title">Tipo de examen según estado de la muestra</p>
                    ${Object.keys(d.byExamen).length === 0
                        ? _lr_empty('Sin resultados.')
                        : `<div style="position:relative;flex:1;min-height:220px;width:100%">
                               <canvas id="lr-c-examenes"></canvas>
                           </div>`}
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-4">
    <div class="col-12 col-md-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="mb-3 lr-card-title">Resultados según tipo de examen</p>
                    <div id="lr-resultados"></div>
                </div>
            </div>
        </div>
        <div class="col-12 col-md-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="mb-1 lr-card-title">Tipos de muestra y resultados</p>
                    <p class="mb-2" style="font-size:.75rem;color:#8fa3bf;line-height:1.5">
                        * En "Todos" se excluye Xpert MTB/XDR, cuyo fin es clasificar
                        la resistencia en cepas ya confirmadas.
                    </p>
                    <div id="lr-tm-filter" class="d-flex flex-wrap gap-1 mb-2"></div>
                    <div id="lr-tm-content" style="position:relative;flex:1;min-height:260px;width:100%"></div>
                </div>
            </div>
        </div>
        
    </div>

    <div class="row g-3 mb-4">
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="mb-1 lr-card-title">Pirámide de pacientes — edad, sexo y resultado</p>
                    <div id="lr-pyramid-filter" class="d-flex flex-wrap gap-1 mb-2"></div>
                    <div id="lr-pyramid-content"></div>
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="mb-1 lr-card-title">Grupos de vulnerabilidad</p>
                    <p class="mb-2" style="font-size:.75rem;color:#8fa3bf">
                        Solo indicaciones con resultado definitivo.
                        <span style="color:#e0435a;font-weight:600">+</span> pos. /
                        <span style="color:#00b87a;font-weight:600">−</span> neg.
                    </p>
                    <div id="lr-gv-filter" class="d-flex flex-wrap gap-1 mb-2"></div>
                    <div id="lr-gv-content"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="mb-1 lr-card-title">Casos positivos por microorganismo</p>
                    <p class="mb-3" style="font-size:.75rem;color:#8fa3bf">
                        Género y especie identificada mediante cultivo o Xpert.
                        Baciloscopia positiva sin confirmación: BAAR+ (Indeterminado).
                    </p>
                    ${d.microorganisms.total === 0
                        ? _lr_empty('Sin microorganismos identificados en el período.')
                        : `<div style="position:relative;min-height:220px;width:100%">
                               <canvas id="lr-c-micro"></canvas>
                           </div>`}
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="mb-1 lr-card-title">Resistencia antimicrobiana (marcadores)</p>
                    <p class="mb-3" style="font-size:.75rem;color:#8fa3bf">
                        Rifampicina: Xpert MTB/RIF (Ultra) ★ · Demás marcadores: Xpert MTB/XDR.
                    </p>
                    ${d.amr.total === 0
                        ? _lr_empty('Sin datos de resistencia antimicrobiana en el período.')
                        : `<div id="lr-amr-wrapper" style="position:relative;width:100%">
                               <canvas id="lr-c-amr"></canvas>
                           </div>`}
                </div>
            </div>
        </div>
    </div>

    <style>
        .lr-card-title {
            font-family: 'Syne', sans-serif;
            font-size: .88rem;
            font-weight: 700;
            color: #0b1e3d;
            margin-bottom: 0;
        }
        .lr-exam-pill {
            display: inline-flex;
            align-items: center;
            padding: .18rem .6rem;
            border: 1.5px solid #dce8f5;
            border-radius: 20px;
            background: transparent;
            color: #8fa3bf;
            font-size: .72rem;
            font-family: 'IBM Plex Mono', monospace;
            font-weight: 600;
            cursor: pointer;
            transition: border-color .15s, background .15s, color .15s;
            white-space: nowrap;
        }
        .lr-exam-pill:hover:not(.active) {
            border-color: #1a3a6b;
            color: #0b1e3d;
            background: #f0f4fa;
        }
        .lr-exam-pill.active {
            border-color: #0b1e3d;
            background: #0b1e3d;
            color: #fff;
        }
    </style>`;

    requestAnimationFrame(() => {
        /* ── Selectores de examen para las 3 cards ── */
        _lr_buildExamFilter('lr-tm-filter', d.availableExams, eid => {
            const sub = eid === 0 ? d.byTMResult : (d.perExamStats[eid]?.byTMResult || {});
            _lr_renderTMContent(document.getElementById('lr-tm-content'), sub, d.tmCat);
        });
        _lr_buildExamFilter('lr-pyramid-filter', d.availableExams, eid => {
            const sub = eid === 0 ? d.pyramid : (d.perExamStats[eid]?.pyramid || null);
            _lr_renderPyramidContent(document.getElementById('lr-pyramid-content'), sub);
        });
        _lr_buildExamFilter('lr-gv-filter', d.availableExams, eid => {
            const sub = eid === 0 ? d.gvStats : (d.perExamStats[eid]?.gvStats || {});
            _lr_renderGVContent(document.getElementById('lr-gv-content'), sub, d.gvCat);
        });

        /* ── Renders iniciales ── */
        if (total > 0)                           _lr_chartEstados(d);
        if (Object.keys(d.byExamen).length > 0)  _lr_chartExamenes(d);
        _lr_renderTMContent(document.getElementById('lr-tm-content'), d.byTMResult, d.tmCat);
        _lr_renderResultados(d, document.getElementById('lr-resultados'));
        _lr_renderPyramidContent(document.getElementById('lr-pyramid-content'), d.pyramid);
        _lr_renderGVContent(document.getElementById('lr-gv-content'), d.gvStats, d.gvCat);
        if (d.microorganisms.total > 0)          _lr_chartMicro(d);
        if (d.amr.total > 0)                     _lr_chartAMR(d);
    });
}

/* ══════════════════════════════════════════════════════════
   SELECTOR DE EXAMEN (helper para las 3 cards con filtro)
   ══════════════════════════════════════════════════════════ */
function _lr_buildExamFilter(containerId, availableExams, onSelect) {
    const container = document.getElementById(containerId);
    if (!container || availableExams.length <= 1) return; // No se necesita con 0-1 exámenes

    const examCodes = { 1: 'BACI', 2: 'CULT', 3: 'XPERT-U', 5: 'XPERT-XDR' };
    let currentEid = 0;

    const render = () => {
        const opts = [{ id: 0, label: 'Todos' }].concat(
            availableExams.map(eid => ({ id: eid, label: examCodes[eid] || `Ex.${eid}` }))
        );
        container.innerHTML = opts.map(opt => `
            <button class="lr-exam-pill${currentEid === opt.id ? ' active' : ''}"
                    data-eid="${opt.id}">${opt.label}</button>
        `).join('');
        container.querySelectorAll('.lr-exam-pill').forEach(btn => {
            btn.addEventListener('click', function () {
                currentEid = parseInt(this.dataset.eid);
                render();
                onSelect(currentEid);
            });
        });
    };

    render();
}

/* ══════════════════════════════════════════════════════════
   CÓMPUTO DE DATOS
   ══════════════════════════════════════════════════════════ */
function _lr_computeData(labIds, dateFrom, dateTo) {
    const allInds   = window._store.indicaciones      || [];
    const recs      = _getRecepciones();
    const baci      = _getResBaci();
    const cult      = _getResCultivo();
    const xpertU    = _getResXpertUltra();
    const xpertXDR  = _getResXpertXDR();
    const pacs      = window._store.pacientes         || [];
    const microCat  = _getMicroCat();
    const gvCat     = typeof _getGVCat  === 'function' ? _getGVCat()  : [];
    const tmCat     = typeof _getTMCat  === 'function' ? _getTMCat()  : [];

    const inds = allInds.filter(ind => {
        if (!labIds.includes(Number(ind.laboratorio_id))) return false;
        const f = ind.fecha_indicacion || '';
        if (dateFrom && f < dateFrom) return false;
        if (dateTo   && f > dateTo)   return false;
        return true;
    });

    const getRec = (indId, eid) =>
        recs.find(r => r.indicacion_id === indId && Number(r.examen_id) === eid)
     || recs.find(r => r.indicacion_id === indId && !r.examen_id)
     || null;

    const recIdSet = new Set();
    inds.forEach(ind => recs.filter(r => r.indicacion_id === ind.id).forEach(r => recIdSet.add(r.id)));

    /* Conteos por estado y por examen */
    const counts   = { pendiente: 0, recibida: 0, rechazada: 0, completada: 0 };
    const byExamen = {};
    inds.forEach(ind => {
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            const rec = getRec(ind.id, eid);
            let est;
            if (!rec)                        est = 'pendiente';
            else if (rec.estado === 'rechazada') est = 'rechazada';
            else est = _lr_hasResult(rec.id, eid, baci, cult, xpertU, xpertXDR) ? 'completada' : 'recibida';
            counts[est]++;
            if (!byExamen[eid]) byExamen[eid] = { pendiente:0, recibida:0, rechazada:0, completada:0 };
            byExamen[eid][est]++;
        });
    });

    /* Tipos de muestra × resultado (excluye XDR en vista "Todos") */
    const byTMResult = {};
    inds.forEach(ind => {
        if (!ind.tipo_muestra_id) return;
        const tmId = ind.tipo_muestra_id;
        let hasPos = false, hasNeg = false;
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            if (eid === 5) return;
            const rec = getRec(ind.id, eid);
            if (!rec || rec.estado === 'rechazada') return;
            if (_lr_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasPos = true;
            if (_lr_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasNeg = true;
        });
        if (!hasPos && !hasNeg) return;
        if (!byTMResult[tmId]) byTMResult[tmId] = { pos: 0, neg: 0 };
        if (hasPos) byTMResult[tmId].pos++;
        if (hasNeg) byTMResult[tmId].neg++;
    });

    /* Resultados emitidos */
    const baciF = baci.filter(r => recIdSet.has(r.recepcion_id));
    const cultF = cult.filter(r => recIdSet.has(r.recepcion_id));
    const xpertUF   = xpertU.filter(r => recIdSet.has(r.recepcion_id));
    const xpertXDRF = xpertXDR.filter(r => recIdSet.has(r.recepcion_id));
    const resultados = {};
    if (baciF.length) {
        resultados[1] = { 'Negativo': 0, 'Positivo': 0 };
        baciF.forEach(r => { if (r.codificacion === 0) resultados[1].Negativo++; else resultados[1].Positivo++; });
    }
    if (cultF.length) {
        resultados[2] = { 'Sin crecimiento': 0, 'Positivo': 0, 'Contaminado': 0, 'En estudio': 0 };
        cultF.forEach(r => {
            if      (r.resultado === '0')           resultados[2]['Sin crecimiento']++;
            else if (r.resultado === 'contaminado') resultados[2].Contaminado++;
            else if (r.resultado === 'en_estudio')  resultados[2]['En estudio']++;
            else                                    resultados[2].Positivo++;
        });
    }
    if (xpertUF.length) {
        resultados[3] = {};
        xpertUF.forEach(r => { resultados[3][r.resultado] = (resultados[3][r.resultado] || 0) + 1; });
    }
    if (xpertXDRF.length) {
        resultados[5] = {};
        xpertXDRF.forEach(r => { resultados[5][r.resultado] = (resultados[5][r.resultado] || 0) + 1; });
    }

    /* Microorganismos */
    const microorganisms = { total: 0, data: {} };
    inds.forEach(ind => {
        let species = null;
        if (!species) {
            const rec = getRec(ind.id, 3);
            if (rec && rec.estado !== 'rechazada') {
                const xu = xpertU.find(r => r.recepcion_id === rec.id);
                if (xu && xu.resultado === 'MTB DETECTADO') species = 'M. tuberculosis';
            }
        }
        if (!species) {
            const rec = getRec(ind.id, 5);
            if (rec && rec.estado !== 'rechazada') {
                const xdr = xpertXDR.find(r => r.recepcion_id === rec.id);
                if (xdr && xdr.resultado === 'MTB DETECTADO') species = 'M. tuberculosis';
            }
        }
        if (!species) {
            const rec = getRec(ind.id, 2);
            if (rec && rec.estado !== 'rechazada') {
                const cr = cult.find(r => r.recepcion_id === rec.id);
                if (cr && /^[1-9]$/.test(cr.resultado)) {
                    if (cr.microorganismo_id) {
                        const m = microCat.find(x => x.id === cr.microorganismo_id);
                        species = m ? m.nombre : 'Microorganismo no identificado';
                    } else {
                        species = 'Positivo (microorg. sin identificar)';
                    }
                }
            }
        }
        if (!species) {
            const rec = getRec(ind.id, 1);
            if (rec && rec.estado !== 'rechazada') {
                const br = baci.find(r => r.recepcion_id === rec.id);
                if (br && br.codificacion > 0) species = 'BAAR+ (Indeterminado)';
            }
        }
        if (!species) return;
        microorganisms.data[species] = (microorganisms.data[species] || 0) + 1;
        microorganisms.total++;
    });

    /* Clasificación TB Resistente */
    const tbClass = { 'Sensible': 0, 'Monoresistente': 0, 'Polirresistente': 0, 'TB-MDR': 0, 'TB pre-XDR': 0, 'TB-XDR': 0 };
    inds.forEach(ind => {
        const uRec = getRec(ind.id, 3), xRec = getRec(ind.id, 5);
        const uRes = uRec ? xpertU.find(r => r.recepcion_id === uRec.id) : null;
        const xRes = xRec ? xpertXDR.find(r => r.recepcion_id === xRec.id) : null;
        if ((uRes && uRes.resultado === 'MTB DETECTADO') || (xRes && xRes.resultado === 'MTB DETECTADO')) {
            let rR = false, rH = false, rFq = false, rSli = false;
            let tested = false, resistCount = 0;
            const check = (val) => {
                if (!val || val === 'NO PROCEDE' || val === 'INDETERMINADO') return false;
                tested = true;
                if (val.includes('DETECTADO') && !val.includes('NO DETECTADO')) { resistCount++; return true; }
                return false;
            };
            if (uRes) rR = check(uRes.resistencia_rifampicina);
            if (xRes) {
                rH   = check(xRes.resistencia_isoniazida);
                rFq  = check(xRes.resistencia_fluorquinolona);
                const amk = check(xRes.resistencia_amikacina);
                const kan = check(xRes.resistencia_kanamicina);
                const cap = check(xRes.resistencia_capreomicina);
                rSli = amk || kan || cap;
            }
            if (!tested) return;
            const isMDR = rR && rH, isPreXDR = isMDR && (rFq || rSli), isXDR = isMDR && rFq && rSli;
            if      (isXDR)            tbClass['TB-XDR']++;
            else if (isPreXDR)         tbClass['TB pre-XDR']++;
            else if (isMDR)            tbClass['TB-MDR']++;
            else if (resistCount >= 2) tbClass['Polirresistente']++;
            else if (resistCount === 1) tbClass['Monoresistente']++;
            else                       tbClass['Sensible']++;
        }
    });

    /* AMR */
    const amr = {
        total: 0,
        markers: {
            'Rifampicina':    { detected:0, not_detected:0, indeterminate:0, source:'Ultra' },
            'Isoniazida':     { detected:0, not_detected:0, indeterminate:0, source:'XDR'   },
            'Fluorquinolona': { detected:0, not_detected:0, indeterminate:0, source:'XDR'   },
            'Amikacina':      { detected:0, not_detected:0, indeterminate:0, source:'XDR'   },
            'Kanamicina':     { detected:0, not_detected:0, indeterminate:0, source:'XDR'   },
            'Capreomicina':   { detected:0, not_detected:0, indeterminate:0, source:'XDR'   },
            'Etionamida':     { detected:0, not_detected:0, indeterminate:0, source:'XDR'   },
        }
    };
    const _amrClass = (marker, val) => {
        if (!val || val === 'NO PROCEDE') return;
        const m = amr.markers[marker];
        if (val.includes('NO DETECTADO')) { m.not_detected++;  return; }
        if (val.includes('INDETERMINADO')){ m.indeterminate++; return; }
        if (val.includes('DETECTADO'))    { m.detected++;      return; }
    };
    xpertUF.forEach(r => {
        if (r.resultado === 'MTB DETECTADO') _amrClass('Rifampicina', r.resistencia_rifampicina);
    });
    xpertXDRF.forEach(r => {
        if (r.resultado !== 'MTB DETECTADO') return;
        _amrClass('Isoniazida',     r.resistencia_isoniazida);
        _amrClass('Fluorquinolona', r.resistencia_fluorquinolona);
        _amrClass('Amikacina',      r.resistencia_amikacina);
        _amrClass('Kanamicina',     r.resistencia_kanamicina);
        _amrClass('Capreomicina',   r.resistencia_capreomicina);
        _amrClass('Etionamida',     r.resistencia_etionamida);
    });
    amr.total = Object.values(amr.markers)
        .reduce((s, v) => s + v.detected + v.not_detected + v.indeterminate, 0);

    /* Pirámide (todos los exámenes) */
    const ageGroups = ['< 14', '15–29', '30–44', '45–59', '≥ 60'];
    const pyramid   = {
        total: 0,
        M_pos: [0,0,0,0,0], M_neg: [0,0,0,0,0],
        F_pos: [0,0,0,0,0], F_neg: [0,0,0,0,0],
        ageGroups
    };
    const pacIds = new Set(inds.map(i => i.paciente_id));
    pacIds.forEach(pid => {
        const p = pacs.find(x => x.id === pid);
        if (!p || !p.fecha_nacimiento) return;
        let pPos = false, pNeg = false;
        inds.filter(i => i.paciente_id === pid).forEach(ind => {
            (ind.examenes_ids || []).forEach(eidRaw => {
                const eid = Number(eidRaw);
                const rec = getRec(ind.id, eid);
                if (!rec || rec.estado === 'rechazada') return;
                if (_lr_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR)) pPos = true;
                if (_lr_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) pNeg = true;
            });
        });
        if (!pPos && !pNeg) return;
        const e   = _lr_edad(p.fecha_nacimiento);
        const g   = e < 14 ? 0 : e <= 29 ? 1 : e <= 44 ? 2 : e <= 59 ? 3 : 4;
        const cat = pPos ? 'pos' : 'neg';
        if      (p.sexo === 'M') { if (cat === 'pos') pyramid.M_pos[g]++; else pyramid.M_neg[g]++; }
        else if (p.sexo === 'F') { if (cat === 'pos') pyramid.F_pos[g]++; else pyramid.F_neg[g]++; }
        pyramid.total++;
    });

    /* Grupos de vulnerabilidad */
    const gvStats = {};
    inds.forEach(ind => {
        const pac = pacs.find(p => p.id === ind.paciente_id);
        if (!pac || !(pac.grupos_ids || []).length) return;
        let hasPos = false, hasNeg = false;
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            const rec = getRec(ind.id, eid);
            if (!rec || rec.estado === 'rechazada') return;
            if (_lr_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasPos = true;
            if (_lr_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasNeg = true;
        });
        if (!hasPos && !hasNeg) return;
        pac.grupos_ids.forEach(gid => {
            if (!gvStats[gid]) gvStats[gid] = { pos: 0, neg: 0 };
            if (hasPos) gvStats[gid].pos++;
            if (hasNeg) gvStats[gid].neg++;
        });
    });

    /* ── Subconjuntos por examen (para los selectores de filtro) ── */
    const availableExams = [1, 2, 3, 5].filter(eid =>
        inds.some(ind => {
            if (!(ind.examenes_ids || []).map(Number).includes(eid)) return false;
            const rec = getRec(ind.id, eid);
            return rec && rec.estado !== 'rechazada';
        })
    );

    const perExamStats = { 0: { byTMResult, pyramid, gvStats } };
    availableExams.forEach(eid => {
        perExamStats[eid] = _lr_computeSubset(eid, inds, recs, baci, cult, xpertU, xpertXDR, pacs);
    });

    return {
        counts, byExamen, byTMResult, resultados,
        microorganisms, amr, pyramid, gvStats,
        gvCat, tmCat, tbClass,
        availableExams, perExamStats
    };
}

/* ── Cómputo de subconjunto para un examen específico ── */
function _lr_computeSubset(eid, inds, recs, baci, cult, xpertU, xpertXDR, pacs) {
    const getRec = (indId, e) =>
        recs.find(r => r.indicacion_id === indId && Number(r.examen_id) === e)
     || recs.find(r => r.indicacion_id === indId && !r.examen_id)
     || null;

    const byTMResult = {};
    const ageGroups  = ['< 14', '15–29', '30–44', '45–59', '≥ 60'];
    const pyramid    = {
        total: 0,
        M_pos: [0,0,0,0,0], M_neg: [0,0,0,0,0],
        F_pos: [0,0,0,0,0], F_neg: [0,0,0,0,0],
        ageGroups
    };
    const gvStats = {};

    inds.forEach(ind => {
        if (!(ind.examenes_ids || []).map(Number).includes(eid)) return;
        const rec = getRec(ind.id, eid);
        if (!rec || rec.estado === 'rechazada') return;

        const hasPos = _lr_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR);
        const hasNeg = _lr_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR);
        if (!hasPos && !hasNeg) return;

        /* TM */
        if (ind.tipo_muestra_id) {
            const tmId = ind.tipo_muestra_id;
            if (!byTMResult[tmId]) byTMResult[tmId] = { pos: 0, neg: 0 };
            if (hasPos) byTMResult[tmId].pos++;
            if (hasNeg) byTMResult[tmId].neg++;
        }

        /* Pirámide y GV */
        const pac = pacs.find(p => p.id === ind.paciente_id);
        if (pac) {
            if (pac.fecha_nacimiento) {
                const e   = _lr_edad(pac.fecha_nacimiento);
                const g   = e < 14 ? 0 : e <= 29 ? 1 : e <= 44 ? 2 : e <= 59 ? 3 : 4;
                const cat = hasPos ? 'pos' : 'neg';
                if      (pac.sexo === 'M') { if (cat === 'pos') pyramid.M_pos[g]++; else pyramid.M_neg[g]++; }
                else if (pac.sexo === 'F') { if (cat === 'pos') pyramid.F_pos[g]++; else pyramid.F_neg[g]++; }
                pyramid.total++;
            }
            (pac.grupos_ids || []).forEach(gid => {
                if (!gvStats[gid]) gvStats[gid] = { pos: 0, neg: 0 };
                if (hasPos) gvStats[gid].pos++;
                if (hasNeg) gvStats[gid].neg++;
            });
        }
    });

    return { byTMResult, pyramid, gvStats };
}

/* ══════════════════════════════════════════════════════════
   HELPERS DE RESULTADO
   ══════════════════════════════════════════════════════════ */

function _lr_hasResult(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) return baci.some(r => r.recepcion_id === recId);
    if (eid === 2) return cult.some(r => r.recepcion_id === recId);
    if (eid === 3) return xpertU.some(r => r.recepcion_id === recId);
    if (eid === 5) return xpertXDR.some(r => r.recepcion_id === recId);
    return false;
}

function _lr_isPositive(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) { const r = baci.find(x => x.recepcion_id === recId);    return !!(r && r.codificacion > 0); }
    if (eid === 2) { const r = cult.find(x => x.recepcion_id === recId);    return !!(r && /^[1-9]$/.test(r.resultado)); }
    if (eid === 3) { const r = xpertU.find(x => x.recepcion_id === recId);  return !!(r && r.resultado === 'MTB DETECTADO'); }
    if (eid === 5) {
        const r = xpertXDR.find(x => x.recepcion_id === recId);
        if (!r || r.resultado !== 'MTB DETECTADO') return false;
        return [r.resistencia_isoniazida, r.resistencia_fluorquinolona, r.resistencia_amikacina,
                r.resistencia_kanamicina, r.resistencia_capreomicina, r.resistencia_etionamida]
            .some(v => v && v.includes('DETECTADO') && !v.includes('NO DETECTADO'));
    }
    return false;
}

function _lr_isNegative(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) { const r = baci.find(x => x.recepcion_id === recId);    return !!(r && r.codificacion === 0); }
    if (eid === 2) { const r = cult.find(x => x.recepcion_id === recId);    return !!(r && r.resultado === '0'); }
    if (eid === 3) { const r = xpertU.find(x => x.recepcion_id === recId);  return !!(r && r.resultado === 'MTB NO DETECTADO'); }
    if (eid === 5) {
        const r = xpertXDR.find(x => x.recepcion_id === recId);
        if (!r || r.resultado !== 'MTB DETECTADO') return false;
        const marcadores = [r.resistencia_isoniazida, r.resistencia_fluorquinolona, r.resistencia_amikacina,
                            r.resistencia_kanamicina, r.resistencia_capreomicina, r.resistencia_etionamida]
            .filter(v => v && v !== 'NO PROCEDE');
        return marcadores.length > 0 && marcadores.every(v => v.includes('NO DETECTADO'));
    }
    return false;
}

function _lr_edad(fechaNac) {
    const hoy = new Date(), nac = new Date(fechaNac + 'T00:00:00');
    let e = hoy.getFullYear() - nac.getFullYear();
    if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) e--;
    return e;
}

/* ── Componentes de UI ── */
function _lr_pill(label, value, color, icon) {
    return `<div class="col-6 col-md">
        <div class="card border-0 shadow-sm" style="border-radius:10px;border-left:4px solid ${color}">
            <div class="card-body py-3 px-3">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:1.6rem;
                            font-weight:600;line-height:1;color:${color}">${value}</div>
                <div style="font-size:.71rem;color:var(--text-muted,#6b7280);
                            text-transform:uppercase;letter-spacing:.06em;margin-top:.3rem">
                    <i class="bi ${icon} me-1"></i>${label}
                </div>
            </div>
        </div>
    </div>`;
}

function _lr_empty(msg) {
    return `<p class="text-center py-3 mb-0" style="font-size:.84rem;color:#8fa3bf">
        <i class="bi bi-inbox me-1"></i>${msg}
    </p>`;
}

/* ══════════════════════════════════════════════════════════
   RENDERS DE CARDS (manejan su propio estado vacío)
   ══════════════════════════════════════════════════════════ */

/* Tipos de muestra por resultado — reemplaza _lr_chartTM */
function _lr_renderTMContent(el, byTMResult, tmCat) {
    if (!el) return;
    if (_hl_charts['lr-tm']) { _hl_charts['lr-tm'].destroy(); delete _hl_charts['lr-tm']; }

    const entries = Object.entries(byTMResult || {})
        .map(([id, v]) => ({
            label: tmCat.find(m => m.id === Number(id))?.nombre || `Muestra #${id}`,
            pos: v.pos, neg: v.neg
        }))
        .filter(e => e.pos + e.neg > 0)
        .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg))
        .slice(0, 12);

    if (!entries.length) {
        el.innerHTML = _lr_empty('Sin resultados definitivos en el período.');
        return;
    }

    el.innerHTML = '<canvas id="lr-c-tm"></canvas>';
    const c = document.getElementById('lr-c-tm');
    if (!c) return;

    _hl_charts['lr-tm'] = new Chart(c, {
        type: 'bar',
        data: { labels: entries.map(e => e.label), datasets: [
            { label:'Positivos', data:entries.map(e=>e.pos), backgroundColor:'rgba(224,67,90,.85)', borderRadius:3 },
            { label:'Negativos', data:entries.map(e=>e.neg), backgroundColor:'rgba(0,184,122,.85)', borderRadius:3 }
        ]},
        options: {
            indexAxis:'y', responsive:true,
            scales: {
                x:{ stacked:true, ticks:{ precision:0, color:'#64748b' }, grid:{ color:'rgba(0,0,0,.05)' } },
                y:{ stacked:true, ticks:{ font:{size:10}, color:'#334155' }, grid:{ display:false } }
            },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:12, color:'#334155' } } }
        }
    });
}

/* Pirámide poblacional — reemplaza _lr_renderPyramid */
function _lr_renderPyramidContent(el, pyramid) {
    if (!el) return;
    if (!pyramid || pyramid.total === 0) {
        el.innerHTML = _lr_empty('Sin pacientes con resultados en el período.');
        return;
    }

    const max = Math.max(
        ...pyramid.ageGroups.map((_, i) => Math.max(
            pyramid.M_pos[i] + pyramid.M_neg[i],
            pyramid.F_pos[i] + pyramid.F_neg[i]
        )), 1
    );

    el.innerHTML = `
    <p style="font-size:.73rem;color:#8fa3bf;margin:0 0 .5rem">${pyramid.total} paciente(s)</p>
    <div>
        <div class="d-flex justify-content-between mb-3" style="font-size:.72rem;font-weight:700">
            <span style="color:#334155"><i class="bi bi-gender-male me-1"></i>Hombres</span>
            <span style="font-size:.68rem">
                <span style="color:#e0435a;margin-right:2px">■ Pos</span>
                <span style="color:#00b87a;margin-left:4px">■ Neg</span>
            </span>
            <span style="color:#334155">Mujeres<i class="bi bi-gender-female ms-1"></i></span>
        </div>
        ${pyramid.ageGroups.map((g, i) => {
            const mP = pyramid.M_pos[i], mN = pyramid.M_neg[i];
            const fP = pyramid.F_pos[i], fN = pyramid.F_neg[i];
            const mTotal = mP + mN, fTotal = fP + fN;
            const mPPct = (mP / max * 100).toFixed(1), mNPct = (mN / max * 100).toFixed(1);
            const fPPct = (fP / max * 100).toFixed(1), fNPct = (fN / max * 100).toFixed(1);
            return `<div class="d-flex align-items-center" style="gap:6px;margin-bottom:6px">
                <div style="flex:1;display:flex;justify-content:flex-end;align-items:center;gap:2px">
                    <span style="font-size:.7rem;color:#334155;font-family:'IBM Plex Mono',monospace;margin-right:4px">${mTotal || ''}</span>
                    <div style="height:20px;width:${mPPct}%;background:rgba(224,67,90,.85);border-radius:3px 0 0 3px;min-width:${mP>0?3:0}px" title="M pos: ${mP}"></div>
                    <div style="height:20px;width:${mNPct}%;background:rgba(0,184,122,.85);border-radius:${mP>0?0:3}px 0 0 ${mP>0?0:3}px;min-width:${mN>0?3:0}px" title="M neg: ${mN}"></div>
                </div>
                <div style="min-width:68px;text-align:center;font-size:.77rem;font-weight:600;color:#475569;white-space:nowrap">${g}</div>
                <div style="flex:1;display:flex;align-items:center;gap:2px">
                    <div style="height:20px;width:${fNPct}%;background:rgba(0,184,122,.85);border-radius:0 ${fP>0?0:3}px ${fP>0?0:3}px 0;min-width:${fN>0?3:0}px" title="F neg: ${fN}"></div>
                    <div style="height:20px;width:${fPPct}%;background:rgba(224,67,90,.85);border-radius:0 3px 3px 0;min-width:${fP>0?3:0}px" title="F pos: ${fP}"></div>
                    <span style="font-size:.7rem;color:#334155;font-family:'IBM Plex Mono',monospace;margin-left:4px">${fTotal || ''}</span>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

/* Grupos de vulnerabilidad — reemplaza _lr_renderGV */
function _lr_renderGVContent(el, gvStats, gvCat) {
    if (!el) return;
    const entries = Object.entries(gvStats || {})
        .map(([id, v]) => ({
            label: gvCat.find(g => g.id === Number(id))?.nombre || `Grupo ${id}`,
            pos: v.pos, neg: v.neg
        }))
        .filter(e => e.pos + e.neg > 0)
        .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg));

    if (!entries.length) {
        el.innerHTML = _lr_empty('Sin resultados definitivos registrados.');
        return;
    }

    el.innerHTML = entries.slice(0, 12).map(e => {
        const total  = e.pos + e.neg;
        const posPct = total > 0 ? Math.round(e.pos / total * 100) : 0;
        const negPct = 100 - posPct;
        const lbl    = e.label.length > 40 ? e.label.slice(0, 37) + '…' : e.label;
        return `<div style="margin-bottom:.6rem">
            <div class="d-flex justify-content-between" style="font-size:.75rem;margin-bottom:3px">
                <span style="color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72%">${lbl}</span>
                <span style="font-family:'IBM Plex Mono',monospace;white-space:nowrap;margin-left:.4rem">
                    <span style="color:#e0435a;font-weight:700">${e.pos}</span><span style="color:#ccc;font-size:.65rem">+</span>
                    <span style="color:#00b87a;font-weight:700;margin-left:.2rem">${e.neg}</span><span style="color:#ccc;font-size:.65rem">−</span>
                </span>
            </div>
            <div style="height:6px;background:#f1f5f9;border-radius:3px;display:flex;overflow:hidden">
                ${e.pos > 0 ? `<div style="width:${posPct}%;background:#e0435a;border-radius:${e.neg?'3px 0 0 3px':'3px'}"></div>` : ''}
                ${e.neg > 0 ? `<div style="width:${negPct}%;background:#00b87a;border-radius:${e.pos?'0 3px 3px 0':'3px'}"></div>` : ''}
            </div>
        </div>`;
    }).join('');
}

/* ══════════════════════════════════════════════════════════
   GRÁFICOS (Chart.js)
   ══════════════════════════════════════════════════════════ */

function _lr_chartEstados(d) {
    const c = document.getElementById('lr-c-estados'); if (!c) return;
    _hl_charts['lr-estados'] = new Chart(c, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Recibidas', 'Rechazadas', 'Completadas'],
            datasets: [{ data: [d.counts.pendiente, d.counts.recibida, d.counts.rechazada, d.counts.completada],
                backgroundColor: ['#f0a500','#1a56db','#e0435a','#00b87a'], borderWidth:2, borderColor:'#fff' }]
        },
        options: { responsive:true, plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:12, color:'#334155' } } } }
    });
}

function _lr_chartExamenes(d) {
    const c = document.getElementById('lr-c-examenes'); if (!c) return;
    const examIds = Object.keys(d.byExamen).map(Number).filter(id => Object.values(d.byExamen[id]).some(v => v > 0));
    const labels  = examIds.map(id => _EXAMENES_CAT.find(e => e.id === id)?.codigo || `Ex.${id}`);
    const mk = (label, key, bg) => ({ label, backgroundColor: bg, borderRadius:3, maxBarThickness:40, data: examIds.map(id => d.byExamen[id][key] || 0) });
    _hl_charts['lr-examenes'] = new Chart(c, {
        type: 'bar',
        data: { labels, datasets: [ mk('Pendientes','pendiente','#f0a500'), mk('Recibidas','recibida','#1a56db'), mk('Rechazadas','rechazada','#e0435a'), mk('Completadas','completada','#00b87a') ] },
        options: { responsive:true, maintainAspectRatio:false, scales: { x:{stacked:true,grid:{display:false}}, y:{stacked:true,ticks:{precision:0,color:'#64748b'},grid:{color:'rgba(0,0,0,.05)'}} }, plugins:{ legend:{ position:'bottom', labels:{font:{size:11},padding:6,boxWidth:12,color:'#334155'} } } }
    });
}

function _lr_chartMicro(d) {
    const c = document.getElementById('lr-c-micro'); if (!c) return;
    const entries = Object.entries(d.microorganisms.data).sort((a, b) => b[1] - a[1]);
    _hl_charts['lr-micro'] = new Chart(c, {
        type: 'bar',
        data: {
            labels: entries.map(e => e[0].length > 38 ? e[0].slice(0,35)+'…' : e[0]),
            datasets: [{ label:'Casos identificados', data:entries.map(e=>e[1]), backgroundColor:'rgba(26,86,219,.75)', borderRadius:3 }]
        },
        options: {
            indexAxis:'y', responsive:true,
            scales: { x:{ticks:{precision:0,color:'#64748b'},grid:{color:'rgba(0,0,0,.05)'}}, y:{ticks:{font:{size:10,style:'italic'},color:'#334155'},grid:{display:false}} },
            plugins:{ legend:{ display:false } }
        }
    });
}

function _lr_chartAMR(d) {
    const c = document.getElementById('lr-c-amr'); if (!c) return;
    const markers = Object.entries(d.amr.markers)
        .filter(([, v]) => v.detected + v.not_detected + v.indeterminate > 0);
    const labels = markers.map(([k, v]) => `${k}${v.source === 'Ultra' ? ' ★' : ''}`);

    const h = Math.max(220, markers.length * 52);
    const wrapper = document.getElementById('lr-amr-wrapper');
    if (wrapper) wrapper.style.height = h + 'px';

    _hl_charts['lr-amr'] = new Chart(c, {
        type: 'bar',
        data: { labels, datasets: [
            { label:'Resistencia detectada', data:markers.map(([,v])=>v.detected),      backgroundColor:'rgba(224,67,90,.85)', borderRadius:3 },
            { label:'Indeterminado',          data:markers.map(([,v])=>v.indeterminate), backgroundColor:'rgba(240,165,0,.80)', borderRadius:3 },
            { label:'No detectada',           data:markers.map(([,v])=>v.not_detected),  backgroundColor:'rgba(0,184,122,.80)', borderRadius:3 },
        ]},
        options: {
            indexAxis:'y', responsive:true, maintainAspectRatio:false,
            scales: {
                x:{ stacked:true, ticks:{ precision:0, color:'#64748b' }, grid:{ color:'rgba(0,0,0,.05)' } },
                y:{ stacked:true, ticks:{ font:{size:11}, color:'#334155' }, grid:{ display:false },
                    afterFit(scale) { scale.width = Math.max(scale.width, 128); } }
            },
            plugins: {
                legend:{ position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:12, color:'#334155' } },
                tooltip:{ callbacks:{ title: ctx => {
                    const lbl = ctx[0].label.replace(' ★','');
                    const src = d.amr.markers[lbl]?.source;
                    return `${lbl}${src ? ' (' + src + ')' : ''}`;
                }}}
            }
        }
    });
}

/* ══════════════════════════════════════════════════════════
   RENDERIZADO DE RESULTADOS EMITIDOS (sin cambios)
   ══════════════════════════════════════════════════════════ */
function _lr_renderResultados(d, el) {
    if (!el) return;
    const exIds = Object.keys(d.resultados).map(Number);
    if (!exIds.length) { el.innerHTML = _lr_empty('Sin resultados emitidos en el período.'); return; }

    const posKeys = new Set(['Positivo','MTB DETECTADO']), negKeys = new Set(['Negativo','Sin crecimiento','MTB NO DETECTADO']);
    let html = exIds.map((eid, i) => {
        const res = d.resultados[eid], total = Object.values(res).reduce((s,v)=>s+v,0), ex = _EXAMENES_CAT.find(e=>e.id===eid);
        const bars = Object.entries(res).map(([label,cnt]) => {
            const pct = total>0 ? Math.round(cnt/total*100) : 0;
            const col = posKeys.has(label)?'#e0435a':negKeys.has(label)?'#00b87a':'#8fa3bf';
            return `<div class="mb-2"><div class="d-flex justify-content-between" style="font-size:.77rem;margin-bottom:3px"><span style="color:#475569">${label}</span><span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:#0b1e3d">${cnt}</span></div><div style="height:5px;background:#f1f5f9;border-radius:3px"><div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .4s ease"></div></div></div>`;
        }).join('');
        const sep = i>0 ? 'style="margin-top:.9rem;padding-top:.9rem;border-top:1px solid #f1f5f9"' : '';
        return `<div ${sep}><div class="d-flex align-items-center gap-2 mb-2"><span style="padding:.12em .55em;border-radius:5px;background:#e0f2fe;color:#0369a1;font-family:'IBM Plex Mono',monospace;font-size:.7rem;font-weight:700">${ex?.codigo||eid}</span><span style="font-size:.82rem;font-weight:600;color:#0b1e3d">${ex?.nombre||`Examen ${eid}`}</span><span style="font-size:.72rem;color:#8fa3bf;margin-left:auto">n=${total}</span></div>${bars}</div>`;
    }).join('');

    /* Perfil de Farmacorresistencia TB */
    const tc = d.tbClass;
    const totalRes = Object.values(tc).reduce((a,b)=>a+b,0);
    if (totalRes > 0) {
        const mapColors = { 'Sensible':'#00b87a','Monoresistente':'#f0a500','Polirresistente':'#f97316','TB-MDR':'#e0435a','TB pre-XDR':'#be123c','TB-XDR':'#881337' };
        let resHtml = `<div style="margin-top:1.2rem;padding-top:1rem;border-top:1.5px dashed #cbd5e1"><div class="d-flex align-items-center gap-2 mb-2"><span style="font-size:.82rem;font-weight:700;color:#0b1e3d"><i class="bi bi-shield-virus me-1"></i>Perfil de Farmacorresistencia (TB)</span><span style="font-size:.72rem;color:#8fa3bf;margin-left:auto">n=${totalRes}</span></div>`;
        Object.entries(tc).forEach(([label,cnt]) => {
            if (cnt===0) return;
            const pct = Math.round(cnt/totalRes*100);
            resHtml += `<div class="mb-2"><div class="d-flex justify-content-between" style="font-size:.77rem;margin-bottom:3px"><span style="color:#475569;font-weight:600">${label}</span><span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:#0b1e3d">${cnt}</span></div><div style="height:6px;background:#f1f5f9;border-radius:3px"><div style="height:100%;width:${pct}%;background:${mapColors[label]};border-radius:3px;transition:width .4s ease"></div></div></div>`;
        });
        resHtml += `</div>`;
        html += resHtml;
    }
    el.innerHTML = html;
}
