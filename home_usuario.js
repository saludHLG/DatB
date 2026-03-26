/* =========================================================
   home_usuario.js — Dashboard "Inicio" del usuario autenticado.
   Estadísticas propias: indicaciones, resultados, casos positivos
   por especie/género y resistencia antimicrobiana.

   Requiere: utils.js, data.js, home_lab.js (_hl_charts, _hl_ensureChartJS,
             _hl_destroyCharts), indicacion.js (_getGVCat, _getTMCat)
   ========================================================= */

/* ── Catálogo local de exámenes ─────────────────────────── */
const _HU_EXAMENES = [
    { id: 1, nombre: 'Baciloscopia',          codigo: 'BACI'        },
    { id: 2, nombre: 'Cultivo',               codigo: 'CULT'        },
    { id: 3, nombre: 'Xpert MTB/RIF (Ultra)', codigo: 'XPERT-ULTRA' },
    { id: 4, nombre: 'MF-LED',                codigo: 'MF-LED'      },
    { id: 5, nombre: 'Xpert MTB/XDR',         codigo: 'XPERT-XDR'   },
];

/* ══════════════════════════════════════════════════════════
   PUNTO DE ENTRADA
   ══════════════════════════════════════════════════════════ */
function renderHomeUsuario(user, el) {
    if (!user.aprobado) {
        el.innerHTML = `
            <div class="modulo-header">
                <h2 class="modulo-title">Bienvenido/a, ${user.nombres}</h2>
                <p class="modulo-sub">Su cuenta está en espera de aprobación por un administrador.</p>
            </div>
            <div class="pending-card">
                <i class="bi bi-hourglass-split pending-big-icon"></i>
                <p>Un administrador verificará sus datos y habilitará el acceso a los módulos.<br>
                Puede cerrar esta ventana y volver más tarde.</p>
            </div>
            <div class="pilot-notice"><i class="bi bi-info-circle"></i> Estudio piloto — datos en almacenamiento local.</div>`;
        return;
    }

    el.innerHTML = `
        <div class="modulo-header">
            <h2 class="modulo-title">Bienvenido/a, ${user.nombres}</h2>
            <p class="modulo-sub">Actividad clínica acumulada — sus indicaciones y resultados recibidos.</p>
        </div>
        <div id="hu-content"></div>`;

    _hl_ensureChartJS(() => _hu_render(user, document.getElementById('hu-content'), null, null));
}

/* ══════════════════════════════════════════════════════════
   RENDER PRINCIPAL (contenido reemplazable por filtro)
   ══════════════════════════════════════════════════════════ */
function _hu_render(user, el, dateFrom, dateTo) {
    if (!el) return;
    if (typeof _hl_destroyCharts === 'function') _hl_destroyCharts();

    const d     = _hu_computeStats(user, dateFrom, dateTo);
    const total = d.counts.pendiente + d.counts.recibida + d.counts.rechazada + d.counts.completada;

    el.innerHTML = `

    <div class="row g-3 mb-4 align-items-stretch">
        <div class="col-md-5 col-lg-4">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column justify-content-center gap-3 p-3">
                    <p class="mb-0" style="font-family:'Syne',sans-serif;font-size:.82rem;font-weight:700;color:#0b1e3d;text-transform:uppercase;letter-spacing:.06em">
                        <i class="bi bi-funnel me-1" style="color:#00c6b8"></i>Filtrar por fecha
                    </p>
                    <div class="row g-2">
                        <div class="col-12">
                            <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8fa3bf;display:block;margin-bottom:.2rem">Desde</label>
                            <input type="date" id="hu-from" class="form-control form-control-sm" value="${dateFrom || ''}">
                        </div>
                        <div class="col-12">
                            <label style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8fa3bf;display:block;margin-bottom:.2rem">Hasta</label>
                            <input type="date" id="hu-to" class="form-control form-control-sm" value="${dateTo || ''}">
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn-primary-custom w-100" id="hu-apply" style="padding:.45rem .5rem;font-size:.82rem;justify-content:center">
                            <i class="bi bi-check-lg"></i> Aplicar
                        </button>
                        <button class="btn-secondary-custom w-100" id="hu-clear" style="padding:.45rem .5rem;font-size:.82rem;justify-content:center">
                            <i class="bi bi-arrow-counterclockwise"></i> Todo
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-7 col-lg-8">
            <div class="row g-2 h-100 align-content-between">
                ${_hu_pill('Total indicaciones', total,               '#0b1e3d', 'bi-collection')}
                ${_hu_pill('Pendientes',          d.counts.pendiente,  '#f0a500', 'bi-hourglass-split')}
                ${_hu_pill('Recibidas',           d.counts.recibida,   '#1a56db', 'bi-flask')}
                ${_hu_pill('Rechazadas',          d.counts.rechazada,  '#e0435a', 'bi-x-circle')}
                ${_hu_pill('Completadas',         d.counts.completada, '#00b87a', 'bi-check-circle')}
                <div class="col-6">
                    <div class="card border-0 h-100" style="border-radius:10px;background:#f8fbff;border:1.5px solid #dce8f5">
                        <div class="card-body py-2 px-3 d-flex align-items-center gap-2">
                            <i class="bi bi-info-circle" style="color:#00c6b8;font-size:1rem;flex-shrink:0"></i>
                            <span style="font-size:.7rem;color:#8fa3bf;line-height:1.35">Estudio piloto — datos en almacenamiento local</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-3">
        <div class="col-12 col-lg-5">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="hu-card-title mb-3">Distribución por estado</p>
                    ${total === 0
                        ? _hu_empty('Sin indicaciones en el período.')
                        : '<div style="position:relative; flex:1; min-height:220px; display:flex; align-items:center; justify-content:center;"><canvas id="hu-c-estados"></canvas></div>'}
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-7">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="hu-card-title mb-3">Por tipo de examen</p>
                    ${Object.keys(d.byExamen).length === 0
                        ? _hu_empty('Sin exámenes en el período.')
                        : '<div style="position:relative; flex:1; min-height:220px; width:100%;"><canvas id="hu-c-examenes"></canvas></div>'}
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="hu-card-title mb-1">Tipos de muestra</p>
                    <p class="mb-3" style="font-size:.75rem;color:#8fa3bf">Positivos y negativos por tipo de muestra (resultados definitivos).</p>
                    ${Object.keys(d.byTMResult).length === 0
                        ? _hu_empty('Sin resultados definitivos por tipo de muestra.')
                        : '<div style="position: relative; height: 300px; width: 100%;"><canvas id="hu-c-tm"></canvas></div>'}
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="hu-card-title mb-3">Resultados recibidos</p>
                    <div id="hu-resultados"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="hu-card-title mb-1">Casos positivos por microorganismo (género y especie)</p>
                    <p class="mb-3" style="font-size:.75rem;color:#8fa3bf">
                        Baciloscopia positiva: BAAR+ (Indeterminado) hasta confirmación por Cultivo o Xpert.
                    </p>
                    ${d.microorganisms.total === 0
                        ? _hu_empty('Sin microorganismos identificados.')
                        : '<div style="position: relative; height: 300px; width: 100%;"><canvas id="hu-c-species"></canvas></div>'}
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="hu-card-title mb-1">Resistencia antimicrobiana (Marcadores)</p>
                    <p class="mb-3" style="font-size:.75rem;color:#8fa3bf">
                        Rifampicina: Xpert MTB/RIF (Ultra). Demás marcadores: Xpert MTB/XDR.
                    </p>
                    ${d.amr.total === 0
    ? _hu_empty('Sin datos de resistencia antimicrobiana.')
    : '<div id="hu-amr-wrapper" style="position: relative; width: 100%;"><canvas id="hu-c-amr"></canvas></div>'}
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3">
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="hu-card-title mb-3">
                        Pacientes por edad y resultados
                        <span style="font-size:.75rem;font-weight:400;color:#8fa3bf;margin-left:.4rem">${d.pyramid.total} paciente(s) c/resultados</span>
                    </p>
                    <div id="hu-pyramid"></div>
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="hu-card-title mb-1">Grupos de vulnerabilidad</p>
                    <p class="mb-3" style="font-size:.75rem;color:#8fa3bf">Solo indicaciones con resultado definitivo.
                        <span style="color:#e0435a;font-weight:600">+</span> pos. /
                        <span style="color:#00b87a;font-weight:600">−</span> neg.
                    </p>
                    <div id="hu-gv"></div>
                </div>
            </div>
        </div>
    </div>

    <style>
        .hu-card-title { font-family:'Syne',sans-serif; font-size:.88rem; font-weight:700; color:#0b1e3d; }
    </style>`;

    /* ── Listeners de filtro ── */
    document.getElementById('hu-apply')?.addEventListener('click', () => {
        const from = document.getElementById('hu-from')?.value || null;
        const to   = document.getElementById('hu-to')?.value   || null;
        _hu_render(user, el, from, to);
    });
    document.getElementById('hu-clear')?.addEventListener('click', () => {
        _hu_render(user, el, null, null);
    });

    /* ── Renderizado de gráficos ── */
    requestAnimationFrame(() => {
        if (total > 0 && window.Chart)                             _hu_chartEstados(d);
        if (Object.keys(d.byExamen).length > 0 && window.Chart)   _hu_chartExamenes(d);
        if (Object.keys(d.byTMResult).length > 0 && window.Chart) _hu_chartTM(d);
        if (d.microorganisms.total > 0 && window.Chart)           _hu_chartSpecies(d);
        if (d.amr.total > 0 && window.Chart)                      _hu_chartAMR(d);
        _hu_renderResultados(d, document.getElementById('hu-resultados'));
        _hu_renderPyramid(d.pyramid, document.getElementById('hu-pyramid'));
        _hu_renderGV(d, document.getElementById('hu-gv'));
    });
}

/* ══════════════════════════════════════════════════════════
   CÓMPUTO DE ESTADÍSTICAS
   ══════════════════════════════════════════════════════════ */
function _hu_computeStats(user, dateFrom, dateTo) {
    const allInds   = JSON.parse(localStorage.getItem('sr_indicaciones')         || '[]');
    const recs      = JSON.parse(localStorage.getItem('sr_recepciones')           || '[]');
    const baci      = JSON.parse(localStorage.getItem('sr_res_baci')              || '[]');
    const cult      = JSON.parse(localStorage.getItem('sr_res_cultivo')           || '[]');
    const xpertU    = JSON.parse(localStorage.getItem('sr_res_xpert_ultra')       || '[]');
    const xpertXDR  = JSON.parse(localStorage.getItem('sr_res_xpert_xdr')         || '[]');
    const pacs      = JSON.parse(localStorage.getItem('sr_pacientes')             || '[]');
    const gvCat     = typeof _getGVCat  === 'function' ? _getGVCat()  : [];
    const tmCat     = typeof _getTMCat  === 'function' ? _getTMCat()  : [];
    const microCat  = typeof _getMicroCat === 'function' ? _getMicroCat() : [];

    /* ── Filtrar indicaciones propias y por fecha ── */
    const inds = allInds.filter(ind => {
        if (ind.indicado_por !== user.id && ind.medico?.usuario_id !== user.id) return false;
        const f = ind.fecha_indicacion || '';
        if (dateFrom && f < dateFrom) return false;
        if (dateTo   && f > dateTo)   return false;
        return true;
    });

    /* ── Mapa de recepciones ── */
    const recMap = {};
    recs.forEach(r => {
        if (!recMap[r.indicacion_id]) recMap[r.indicacion_id] = [];
        recMap[r.indicacion_id].push(r);
    });

    /* Obtiene recepción para una indicación y examen específico */
    const getRec = (indId, eid) => {
        const indRecs = recMap[indId] || [];
        return indRecs.find(r => Number(r.examen_id) === eid)
            || (indRecs.length === 1 && !indRecs[0].examen_id ? indRecs[0] : null);
    };

    /* ── Conteo por estado y por examen ── */
    const counts   = { pendiente: 0, recibida: 0, rechazada: 0, completada: 0 };
    const byExamen = {};

    inds.forEach(ind => {
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            const rec = getRec(ind.id, eid);
            let est;
            if (!rec)                        est = 'pendiente';
            else if (rec.estado === 'rechazada') est = 'rechazada';
            else est = _hu_hasResult(rec.id, eid, baci, cult, xpertU, xpertXDR) ? 'completada' : 'recibida';
            counts[est]++;
            if (!byExamen[eid]) byExamen[eid] = { pendiente:0, recibida:0, rechazada:0, completada:0 };
            byExamen[eid][est]++;
        });
    });

    /* ── IDs de recepciones para filtrar resultados ── */
    const recIdSet = new Set();
    inds.forEach(ind => (recMap[ind.id] || []).forEach(r => recIdSet.add(r.id)));

    const baciF     = baci.filter(r => recIdSet.has(r.recepcion_id));
    const cultF     = cult.filter(r => recIdSet.has(r.recepcion_id));
    const xpertUF   = xpertU.filter(r => recIdSet.has(r.recepcion_id));
    const xpertXDRF = xpertXDR.filter(r => recIdSet.has(r.recepcion_id));

    /* ── Resultados por examen (barras de progreso) ── */
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

    /* ── Tipos de muestra × positivos/negativos ── */
    const byTMResult = {};
    inds.forEach(ind => {
        if (!ind.tipo_muestra_id) return;
        const tmId = ind.tipo_muestra_id;
        let hasPos = false, hasNeg = false;
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            const rec = getRec(ind.id, eid);
            if (!rec || rec.estado === 'rechazada') return;
            if (_hu_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasPos = true;
            if (_hu_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasNeg = true;
        });
        if (!hasPos && !hasNeg) return;
        if (!byTMResult[tmId]) byTMResult[tmId] = { pos: 0, neg: 0 };
        if (hasPos) byTMResult[tmId].pos++;
        if (hasNeg) byTMResult[tmId].neg++;
    });

    /* ── Casos positivos: taxonomía del microorganismo ────────────────── */
    const microorganisms = { total: 0, data: {} };

    inds.forEach(ind => {
        let species = null;

        /* 1 — Xpert MTB/RIF (Ultra) */
        if (!species) {
            const rec = getRec(ind.id, 3);
            if (rec && rec.estado !== 'rechazada') {
                const xu = xpertU.find(r => r.recepcion_id === rec.id);
                if (xu && xu.resultado === 'MTB DETECTADO') species = 'M. tuberculosis';
            }
        }
        /* 2 — Xpert MTB/XDR (implica M. tuberculosis) */
        if (!species) {
            const rec = getRec(ind.id, 5);
            if (rec && rec.estado !== 'rechazada') {
                const xdr = xpertXDR.find(r => r.recepcion_id === rec.id);
                if (xdr && xdr.resultado === 'MTB DETECTADO') species = 'M. tuberculosis';
            }
        }
        /* 3 — Cultivo con crecimiento */
        if (!species) {
            const rec = getRec(ind.id, 2);
            if (rec && rec.estado !== 'rechazada') {
                const cr = cult.find(r => r.recepcion_id === rec.id);
                if (cr && /^[1-9]$/.test(cr.resultado)) {
                    if (cr.microorganismo_id) {
                        const micro = microCat.find(m => m.id === cr.microorganismo_id);
                        species = micro ? micro.nombre : 'Microorganismo no identificado';
                    } else {
                        species = 'Positivo (microorg. sin identificar)';
                    }
                }
            }
        }
        /* 4 — Baciloscopia positiva sin confirmación de especie */
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

    /* ── Clasificación TB Resistente ───────────────────────── */
    const tbClass = { 'Sensible': 0, 'Monoresistente': 0, 'Polirresistente': 0, 'TB-MDR': 0, 'TB pre-XDR': 0, 'TB-XDR': 0 };
    
    inds.forEach(ind => {
        const uRec = getRec(ind.id, 3);
        const xRec = getRec(ind.id, 5);

        const uRes = uRec ? xpertU.find(r => r.recepcion_id === uRec.id) : null;
        const xRes = xRec ? xpertXDR.find(r => r.recepcion_id === xRec.id) : null;

        if ((uRes && uRes.resultado === 'MTB DETECTADO') || (xRes && xRes.resultado === 'MTB DETECTADO')) {
            let rR = false, rH = false, rFq = false, rSli = false;
            let tested = false;
            let resistCount = 0;

            const check = (val) => {
                if (!val || val === 'NO PROCEDE' || val === 'INDETERMINADO') return false;
                tested = true;
                if (val.includes('DETECTADO') && !val.includes('NO DETECTADO')) {
                    resistCount++;
                    return true;
                }
                return false;
            };

            if (uRes) rR = check(uRes.resistencia_rifampicina);
            if (xRes) {
                rH = check(xRes.resistencia_isoniazida);
                rFq = check(xRes.resistencia_fluorquinolona);
                const amk = check(xRes.resistencia_amikacina);
                const kan = check(xRes.resistencia_kanamicina);
                const cap = check(xRes.resistencia_capreomicina);
                rSli = amk || kan || cap;
            }

            if (!tested) return;

            const isMDR = rR && rH;
            const isPreXDR = isMDR && (rFq || rSli);
            const isXDR = isMDR && rFq && rSli;

            if (isXDR) {
                tbClass['TB-XDR']++;
            } else if (isPreXDR) {
                tbClass['TB pre-XDR']++;
            } else if (isMDR) {
                tbClass['TB-MDR']++;
            } else if (resistCount >= 2) {
                tbClass['Polirresistente']++;
            } else if (resistCount === 1) {
                tbClass['Monoresistente']++;
            } else {
                tbClass['Sensible']++;
            }
        }
    });

    /* ── Resistencia antimicrobiana (Marcadores) ───────────────────────── */
    const amr = {
        total: 0,
        markers: {
            'Rifampicina':   { detected: 0, not_detected: 0, indeterminate: 0, source: 'Ultra'  },
            'Isoniazida':    { detected: 0, not_detected: 0, indeterminate: 0, source: 'XDR'    },
            'Fluorquinolona':{ detected: 0, not_detected: 0, indeterminate: 0, source: 'XDR'    },
            'Amikacina':     { detected: 0, not_detected: 0, indeterminate: 0, source: 'XDR'    },
            'Kanamicina':    { detected: 0, not_detected: 0, indeterminate: 0, source: 'XDR'    },
            'Capreomicina':  { detected: 0, not_detected: 0, indeterminate: 0, source: 'XDR'    },
            'Etionamida':    { detected: 0, not_detected: 0, indeterminate: 0, source: 'XDR'    },
        }
    };

    const classifyAMR = (marker, val) => {
        if (!val || val === 'NO PROCEDE') return;
        const m = amr.markers[marker];
        if (val.includes('NO DETECTADO')) { m.not_detected++; return; }
        if (val.includes('INDETERMINADO')){ m.indeterminate++; return; }
        if (val.includes('DETECTADO'))    { m.detected++;      return; }
    };

    xpertUF.forEach(r => { if (r.resultado === 'MTB DETECTADO') classifyAMR('Rifampicina', r.resistencia_rifampicina); });
    xpertXDRF.forEach(r => {
        if (r.resultado !== 'MTB DETECTADO') return;
        classifyAMR('Isoniazida',     r.resistencia_isoniazida);
        classifyAMR('Fluorquinolona', r.resistencia_fluorquinolona);
        classifyAMR('Amikacina',      r.resistencia_amikacina);
        classifyAMR('Kanamicina',     r.resistencia_kanamicina);
        classifyAMR('Capreomicina',   r.resistencia_capreomicina);
        classifyAMR('Etionamida',     r.resistencia_etionamida);
    });
    amr.total = Object.values(amr.markers).reduce((s, v) => s + v.detected + v.not_detected + v.indeterminate, 0);

    /* ── Pirámide poblacional (Pos/Neg) ── */
    const pacIds   = new Set(inds.map(i => i.paciente_id));
    const ageGroups = ['< 14', '15–29', '30–44', '45–59', '≥ 60'];
    const pyramid   = { total: 0, M_pos: [0,0,0,0,0], M_neg: [0,0,0,0,0], F_pos: [0,0,0,0,0], F_neg: [0,0,0,0,0], ageGroups };
    
    pacIds.forEach(pid => {
        const p = pacs.find(x => x.id === pid);
        if (!p || !p.fecha_nacimiento) return;

        let pPos = false, pNeg = false;
        inds.filter(i => i.paciente_id === pid).forEach(ind => {
            (ind.examenes_ids || []).forEach(eidRaw => {
                const eid = Number(eidRaw);
                const rec = getRec(ind.id, eid);
                if (!rec || rec.estado === 'rechazada') return;
                if (_hu_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR)) pPos = true;
                if (_hu_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) pNeg = true;
            });
        });

        if (!pPos && !pNeg) return; // Solo incluir pacientes con resultado
        let cat = pPos ? 'pos' : 'neg'; // Positivo tiene prioridad

        const e = _hu_edad(p.fecha_nacimiento);
        const g = e < 14 ? 0 : e <= 29 ? 1 : e <= 44 ? 2 : e <= 59 ? 3 : 4;
        
        if (p.sexo === 'M') {
            if (cat === 'pos') pyramid.M_pos[g]++; else pyramid.M_neg[g]++;
        } else if (p.sexo === 'F') {
            if (cat === 'pos') pyramid.F_pos[g]++; else pyramid.F_neg[g]++;
        }
        pyramid.total++;
    });

    /* ── Grupos de vulnerabilidad × pos/neg ── */
    const gvStats = {};
    inds.forEach(ind => {
        const pac = pacs.find(p => p.id === ind.paciente_id);
        if (!pac || !(pac.grupos_ids || []).length) return;
        let hasPos = false, hasNeg = false;
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            const rec = getRec(ind.id, eid);
            if (!rec || rec.estado === 'rechazada') return;
            if (_hu_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasPos = true;
            if (_hu_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasNeg = true;
        });
        if (!hasPos && !hasNeg) return;
        pac.grupos_ids.forEach(gid => {
            if (!gvStats[gid]) gvStats[gid] = { pos: 0, neg: 0 };
            if (hasPos) gvStats[gid].pos++;
            if (hasNeg) gvStats[gid].neg++;
        });
    });

    return { counts, byExamen, byTMResult, resultados, pyramid, gvStats, gvCat, tmCat, microorganisms, amr, tbClass };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function _hu_hasResult(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) return baci.some(r => r.recepcion_id === recId);
    if (eid === 2) return cult.some(r => r.recepcion_id === recId);
    if (eid === 3) return xpertU.some(r => r.recepcion_id === recId);
    if (eid === 5) return xpertXDR.some(r => r.recepcion_id === recId);
    return false;
}

function _hu_isPositive(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) { const r = baci.find(x => x.recepcion_id === recId);    return !!(r && r.codificacion > 0); }
    if (eid === 2) { const r = cult.find(x => x.recepcion_id === recId);    return !!(r && /^[1-9]$/.test(r.resultado)); }
    if (eid === 3) { const r = xpertU.find(x => x.recepcion_id === recId);  return !!(r && r.resultado === 'MTB DETECTADO'); }
    if (eid === 5) { const r = xpertXDR.find(x => x.recepcion_id === recId);return !!(r && r.resultado === 'MTB DETECTADO'); }
    return false;
}

function _hu_isNegative(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) { const r = baci.find(x => x.recepcion_id === recId);    return !!(r && r.codificacion === 0); }
    if (eid === 2) { const r = cult.find(x => x.recepcion_id === recId);    return !!(r && r.resultado === '0'); }
    if (eid === 3) { const r = xpertU.find(x => x.recepcion_id === recId);  return !!(r && r.resultado === 'MTB NO DETECTADO'); }
    if (eid === 5) { const r = xpertXDR.find(x => x.recepcion_id === recId);return !!(r && r.resultado === 'MTB NO DETECTADO'); }
    return false;
}

function _hu_edad(fechaNac) {
    const hoy = new Date(), nac = new Date(fechaNac + 'T00:00:00');
    let e = hoy.getFullYear() - nac.getFullYear();
    if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) e--;
    return e;
}

function _hu_pill(label, value, color, icon) {
    return `<div class="col-6">
        <div class="card border-0 shadow-sm h-100" style="border-radius:10px;border-left:4px solid ${color}">
            <div class="card-body py-2 px-3">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:1.3rem;font-weight:600;line-height:1;color:${color}">${value}</div>
                <div style="font-size:.67rem;color:#8fa3bf;text-transform:uppercase;letter-spacing:.05em;margin-top:.25rem">
                    <i class="bi ${icon} me-1"></i>${label}
                </div>
            </div>
        </div>
    </div>`;
}

function _hu_empty(msg) {
    return `<p class="text-center py-4 mb-0" style="font-size:.84rem;color:#8fa3bf"><i class="bi bi-inbox me-1"></i>${msg}</p>`;
}

/* ══════════════════════════════════════════════════════════
   GRÁFICOS (Chart.js — almacenados en _hl_charts para gestión unificada)
   ══════════════════════════════════════════════════════════ */

/* Doughnut — estados */
function _hu_chartEstados(d) {
    const c = document.getElementById('hu-c-estados'); if (!c) return;
    _hl_charts['hu-estados'] = new Chart(c, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Recibidas', 'Rechazadas', 'Completadas'],
            datasets: [{ data: [d.counts.pendiente, d.counts.recibida, d.counts.rechazada, d.counts.completada],
                backgroundColor: ['#f0a500','#1a56db','#e0435a','#00b87a'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true,
            plugins: { legend: { position: 'bottom', labels: { font:{size:11}, padding:8, boxWidth:12, color:'#334155' } } } }
    });
}

/* Bar apilada horizontal — por tipo de examen */
function _hu_chartExamenes(d) {
    const c = document.getElementById('hu-c-examenes'); if (!c) return;
    const examIds = Object.keys(d.byExamen).map(Number).filter(id => Object.values(d.byExamen[id]).some(v => v > 0));
    const labels  = examIds.map(id => _HU_EXAMENES.find(e => e.id === id)?.nombre || `Examen ${id}`);
    const mk = (label, key, bg) => ({ label, backgroundColor: bg, borderRadius: 3, maxBarThickness: 32, // <--- Límite
        data: examIds.map(id => d.byExamen[id][key] || 0) });
    
    _hl_charts['hu-examenes'] = new Chart(c, {
        type: 'bar',
        data: { labels, datasets: [mk('Pendientes','pendiente','#f0a500'), mk('Recibidas','recibida','#1a56db'),
            mk('Rechazadas','rechazada','#e0435a'), mk('Completadas','completada','#00b87a')] },
        options: { 
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false, //
            scales: {
                x: { stacked: true, ticks:{precision:0, color:'#64748b'}, grid:{color:'rgba(0,0,0,.05)'} },
                y: { stacked: true, grid:{display:false}, ticks:{font:{size:10}, color:'#334155'} }
            },
            plugins: { legend: { position:'bottom', labels:{font:{size:11}, padding:6, boxWidth:12, color:'#334155'} } }
        }
    });
}

/* Bar horizontal AGRUPADA (stacked) — tipos de muestra × positivos/negativos */
function _hu_chartTM(d) {
    const c = document.getElementById('hu-c-tm'); if (!c) return;
    const entries = Object.entries(d.byTMResult)
        .map(([id, v]) => ({ label: d.tmCat.find(m => m.id === Number(id))?.nombre || `Muestra #${id}`, pos: v.pos, neg: v.neg }))
        .filter(e => e.pos + e.neg > 0)
        .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg))
        .slice(0, 12);
    _hl_charts['hu-tm'] = new Chart(c, {
        type: 'bar',
        data: { labels: entries.map(e => e.label), datasets: [
            { label:'Positivos', data: entries.map(e => e.pos), backgroundColor:'rgba(224,67,90,.85)',  borderRadius:3 },
            { label:'Negativos', data: entries.map(e => e.neg), backgroundColor:'rgba(0,184,122,.85)',  borderRadius:3 }
        ]},
        options: { 
            indexAxis:'y', 
            responsive:true,
            scales: {
                x: { stacked:true, ticks:{precision:0,color:'#64748b'}, grid:{color:'rgba(0,0,0,.05)'} },
                y: { stacked:true, ticks:{font:{size:10},color:'#334155'}, grid:{display:false} }
            },
            plugins: { legend:{position:'bottom', labels:{font:{size:11},padding:8,boxWidth:12,color:'#334155'}} }
        }
    });
}

/* Bar horizontal — casos positivos por género y especie del microorganismo */
function _hu_chartSpecies(d) {
    const c = document.getElementById('hu-c-species'); if (!c) return;
    const entries = Object.entries(d.microorganisms.data).sort((a,b)=>b[1]-a[1]);
    _hl_charts['hu-species'] = new Chart(c, {
        type: 'bar',
        data: {
            labels: entries.map(e => e[0].length > 38 ? e[0].slice(0, 35) + '…' : e[0]),
            datasets: [
                { label:'Casos aislados', data: entries.map(e => e[1]), backgroundColor:'rgba(26,86,219,.75)',  borderRadius:3 }
            ]
        },
        options: { indexAxis:'y', responsive:true,
            scales: {
                x: { ticks:{precision:0,color:'#64748b'}, grid:{color:'rgba(0,0,0,.05)'} },
                y: { ticks:{font:{size:10,style:'italic'},color:'#334155'}, grid:{display:false} }
            },
            plugins: { legend:{display:false} }
        }
    });
}

/* Bar horizontal apilada — resistencia antimicrobiana */
function _hu_chartAMR(d) {
    const c = document.getElementById('hu-c-amr'); if (!c) return;
    const markers = Object.entries(d.amr.markers)
        .filter(([, v]) => v.detected + v.not_detected + v.indeterminate > 0);
    const labels = markers.map(([k, v]) => `${k}${v.source === 'Ultra' ? ' ★' : ''}`);
 
    /* Altura dinámica: 52 px por marcador, mínimo 220 px.
       Garantiza que las etiquetas del eje Y sean visibles en
       cualquier ancho de pantalla, incluido teléfono vertical. */
    /* Altura dinámica: 52 px por marcador, mínimo 220 px. ... */
	const h = Math.max(220, markers.length * 52); // <-- ¡Corregido de 5.2 a 52!
	const wrapper = document.getElementById('hu-amr-wrapper');
	if (wrapper) {
    wrapper.style.height = h + 'px';
}
// Ya no modificamos 'c.style' directamente
 
    _hl_charts['hu-amr'] = new Chart(c, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Resistencia detectada', data: markers.map(([, v]) => v.detected),      backgroundColor: 'rgba(224,67,90,.85)', borderRadius: 3 },
                { label: 'Indeterminado',          data: markers.map(([, v]) => v.indeterminate), backgroundColor: 'rgba(240,165,0,.80)', borderRadius: 3 },
                { label: 'No detectada',           data: markers.map(([, v]) => v.not_detected),  backgroundColor: 'rgba(0,184,122,.80)', borderRadius: 3 },
            ]
        },
        options: {
            indexAxis          : 'y',
            responsive         : true,
            maintainAspectRatio: false,   // permite controlar la altura manualmente
            scales: {
                x: {
                    stacked: true,
                    ticks  : { precision: 0, color: '#64748b' },
                    grid   : { color: 'rgba(0,0,0,.05)' },
                },
                y: {
                    stacked: true,
                    ticks  : { font: { size: 11 }, color: '#334155' },
                    grid   : { display: false },
                    /* Reservar anchura mínima para las etiquetas de fármaco */
                    afterFit(scale) {
                        scale.width = Math.max(scale.width, 128);
                    },
                },
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels  : { font: { size: 11 }, padding: 8, boxWidth: 12, color: '#334155' },
                },
                tooltip: {
                    callbacks: {
                        title: ctx => {
                            const lbl = ctx[0].label.replace(' ★', '');
                            const src = d.amr.markers[lbl]?.source;
                            return `${lbl}${src ? ' (' + src + ')' : ''}`;
                        },
                    },
                },
            },
        },
    });
}

/* ══════════════════════════════════════════════════════════
   RENDERIZADOS NO-CHART
   ══════════════════════════════════════════════════════════ */

/* Barras de progreso — resultados por examen y Clasificación de Resistencia */
function _hu_renderResultados(d, el) {
    if (!el) return;
    const exIds = Object.keys(d.resultados).map(Number);
    if (!exIds.length) { el.innerHTML = _hu_empty('Sin resultados recibidos en el período.'); return; }

    const posKeys = new Set(['Positivo','MTB DETECTADO']);
    const negKeys = new Set(['Negativo','Sin crecimiento','MTB NO DETECTADO']);

    let html = exIds.map((eid, i) => {
        const res   = d.resultados[eid];
        const total = Object.values(res).reduce((s,v) => s+v, 0);
        const ex    = _HU_EXAMENES.find(e => e.id === eid);
        const bars  = Object.entries(res).map(([label, cnt]) => {
            const pct = total > 0 ? Math.round(cnt / total * 100) : 0;
            const col = posKeys.has(label) ? '#e0435a' : negKeys.has(label) ? '#00b87a' : '#8fa3bf';
            return `<div class="mb-2">
                <div class="d-flex justify-content-between" style="font-size:.77rem;margin-bottom:3px">
                    <span style="color:#475569">${label}</span>
                    <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:#0b1e3d">${cnt}</span>
                </div>
                <div style="height:5px;background:#f1f5f9;border-radius:3px">
                    <div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .4s ease"></div>
                </div>
            </div>`;
        }).join('');
        const sep = i > 0 ? 'style="margin-top:.85rem;padding-top:.85rem;border-top:1px solid #f1f5f9"' : '';
        return `<div ${sep}>
            <div class="d-flex align-items-center gap-2 mb-2">
                <span style="padding:.12em .55em;border-radius:5px;background:#e0f2fe;color:#0369a1;font-family:'IBM Plex Mono',monospace;font-size:.7rem;font-weight:700">${ex?.codigo || eid}</span>
                <span style="font-size:.82rem;font-weight:600;color:#0b1e3d">${ex?.nombre || `Examen ${eid}`}</span>
                <span style="font-size:.72rem;color:#8fa3bf;margin-left:auto">n=${total}</span>
            </div>
            ${bars}
        </div>`;
    }).join('');

    /* Añadir Perfil de Farmacorresistencia TB al final */
    const tc = d.tbClass;
    const totalRes = Object.values(tc).reduce((a,b)=>a+b, 0);
    if (totalRes > 0) {
        const mapColors = {
            'Sensible': '#00b87a',
            'Monoresistente': '#f0a500',
            'Polirresistente': '#f97316',
            'TB-MDR': '#e0435a',
            'TB pre-XDR': '#be123c',
            'TB-XDR': '#881337'
        };
        let resHtml = `<div style="margin-top:1.2rem;padding-top:1rem;border-top:1.5px dashed #cbd5e1">
            <div class="d-flex align-items-center gap-2 mb-2">
                <span style="font-size:.82rem;font-weight:700;color:#0b1e3d"><i class="bi bi-shield-virus me-1"></i>Perfil de Farmacorresistencia (TB)</span>
                <span style="font-size:.72rem;color:#8fa3bf;margin-left:auto">n=${totalRes}</span>
            </div>`;

        Object.entries(tc).forEach(([label, cnt]) => {
            if (cnt === 0) return;
            const pct = Math.round(cnt / totalRes * 100);
            const col = mapColors[label];
            resHtml += `<div class="mb-2">
                <div class="d-flex justify-content-between" style="font-size:.77rem;margin-bottom:3px">
                    <span style="color:#475569;font-weight:600">${label}</span>
                    <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:#0b1e3d">${cnt}</span>
                </div>
                <div style="height:6px;background:#f1f5f9;border-radius:3px">
                    <div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .4s ease"></div>
                </div>
            </div>`;
        });
        resHtml += `</div>`;
        html += resHtml;
    }

    el.innerHTML = html;
}

/* Pirámide poblacional agrupada por Pos/Neg — CSS puro */
function _hu_renderPyramid(pyramid, el) {
    if (!el) return;
    if (pyramid.total === 0) { el.innerHTML = _hu_empty('Sin pacientes c/resultados en el período.'); return; }
    
    // Calcular max basado en la suma de pos+neg en ambos géneros
    const max = Math.max(...pyramid.ageGroups.map((g,i) => Math.max(pyramid.M_pos[i]+pyramid.M_neg[i], pyramid.F_pos[i]+pyramid.F_neg[i])), 1);
    
    el.innerHTML = `
    <div>
        <div class="d-flex justify-content-between mb-3" style="font-size:.72rem;font-weight:700">
            <span style="color:#334155"><i class="bi bi-gender-male me-1"></i>Hombres</span>
            <span style="font-size:.68rem;">
                <span style="color:#e0435a;margin-right:2px">■ Pos</span> <span style="color:#00b87a;margin-left:4px">■ Neg</span>
            </span>
            <span style="color:#334155">Mujeres<i class="bi bi-gender-female ms-1"></i></span>
        </div>
        ${pyramid.ageGroups.map((g, i) => {
            const mP = pyramid.M_pos[i], mN = pyramid.M_neg[i];
            const fP = pyramid.F_pos[i], fN = pyramid.F_neg[i];
            const mTotal = mP + mN, fTotal = fP + fN;
            const mPPct = mTotal > 0 ? (mP / max * 100) : 0;
            const mNPct = mTotal > 0 ? (mN / max * 100) : 0;
            const fPPct = fTotal > 0 ? (fP / max * 100) : 0;
            const fNPct = fTotal > 0 ? (fN / max * 100) : 0;

            return `<div class="d-flex align-items-center" style="gap:6px;margin-bottom:6px">
                <div style="flex:1;display:flex;justify-content:flex-end;align-items:center;gap:2px">
                    <span style="font-size:.7rem;color:#334155;font-family:'IBM Plex Mono',monospace;margin-right:4px">${mTotal > 0 ? mTotal : ''}</span>
                    <div style="height:20px;width:${mPPct}%;background:rgba(224,67,90,.85);border-radius:3px 0 0 3px;min-width:${mP > 0 ? 3 : 0}px" title="Hombres Positivos: ${mP}"></div>
                    <div style="height:20px;width:${mNPct}%;background:rgba(0,184,122,.85);border-radius:${mP > 0 ? 0 : 3}px 0 0 ${mP > 0 ? 0 : 3}px;min-width:${mN > 0 ? 3 : 0}px" title="Hombres Negativos: ${mN}"></div>
                </div>
                
                <div style="min-width:68px;text-align:center;font-size:.77rem;font-weight:600;color:#475569;white-space:nowrap">${g}</div>
                
                <div style="flex:1;display:flex;align-items:center;gap:2px">
                    <div style="height:20px;width:${fNPct}%;background:rgba(0,184,122,.85);border-radius:0 ${fP > 0 ? 0 : 3}px ${fP > 0 ? 0 : 3}px 0;min-width:${fN > 0 ? 3 : 0}px" title="Mujeres Negativas: ${fN}"></div>
                    <div style="height:20px;width:${fPPct}%;background:rgba(224,67,90,.85);border-radius:0 3px 3px 0;min-width:${fP > 0 ? 3 : 0}px" title="Mujeres Positivas: ${fP}"></div>
                    <span style="font-size:.7rem;color:#334155;font-family:'IBM Plex Mono',monospace;margin-left:4px">${fTotal > 0 ? fTotal : ''}</span>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

/* Grupos de vulnerabilidad — barras CSS */
function _hu_renderGV(d, el) {
    if (!el) return;
    const entries = Object.entries(d.gvStats)
        .map(([id, v]) => ({
            label: d.gvCat.find(g => g.id === Number(id))?.nombre || `Grupo ${id}`,
            pos: v.pos, neg: v.neg
        }))
        .filter(e => e.pos + e.neg > 0)
        .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg));

    if (!entries.length) { el.innerHTML = _hu_empty('Sin resultados definitivos registrados.'); return; }

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
                ${e.pos > 0 ? `<div style="width:${posPct}%;background:#e0435a;border-radius:${e.neg ? '3px 0 0 3px':'3px'}"></div>` : ''}
                ${e.neg > 0 ? `<div style="width:${negPct}%;background:#00b87a;border-radius:${e.pos ? '0 3px 3px 0':'3px'}"></div>` : ''}
            </div>
        </div>`;
    }).join('');
}