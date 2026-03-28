/* =========================================================
   home_lab.js — Dashboard "Inicio" del módulo de Laboratorio.
   Muestra estadísticas de muestras, resultados, pacientes y
   grupos de vulnerabilidad con filtro por rango de fechas.

   Requiere (cargados antes en index.html):
     utils.js · data.js · laboratorio_core.js
   Debe cargarse ANTES de laboratorio.js en index.html.
   ========================================================= */

/* ── Instancias activas de Chart.js ─────────────────────── */
const _hl_charts = {};

/* ══════════════════════════════════════════════════════════
   PUNTO DE ENTRADA
   ══════════════════════════════════════════════════════════ */
function renderHomeLabDashboard(user, rootEl) {
    _hl_ensureChartJS(() => _hl_buildShell(user, rootEl));
}

/* ── Carga diferida de Chart.js ─────────────────────────── */
function _hl_ensureChartJS(cb) {
    if (window.Chart) { cb(); return; }
    if (_hl_ensureChartJS._loading) {
        _hl_ensureChartJS._queue = _hl_ensureChartJS._queue || [];
        _hl_ensureChartJS._queue.push(cb);
        return;
    }
    _hl_ensureChartJS._loading = true;
    _hl_ensureChartJS._queue  = [cb];
    const s  = document.createElement('script');
    s.src    = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => {
        _hl_ensureChartJS._loading = false;
        (_hl_ensureChartJS._queue || []).forEach(f => f());
        _hl_ensureChartJS._queue = [];
    };
    document.head.appendChild(s);
}

/* ── Destruir instancias previas (llamado desde laboratorio.js) */
function _hl_destroyCharts() {
    Object.values(_hl_charts).forEach(c => { try { c.destroy(); } catch(e){} });
    Object.keys(_hl_charts).forEach(k => delete _hl_charts[k]);
}

/* ══════════════════════════════════════════════════════════
   SHELL — filtros de fecha
   ══════════════════════════════════════════════════════════ */
function _hl_buildShell(user, rootEl) {
    rootEl.innerHTML = `
    <div class="modulo-header">
        <h2 class="modulo-title">Estadísticas del laboratorio</h2>
        <p class="modulo-sub">Actividad de muestras en los laboratorios asignados.</p>
    </div>

    <div style="background:#fff;border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:.9rem 1.25rem;margin-bottom:1.5rem">
        <div class="d-flex gap-3 align-items-end flex-wrap">
            <div>
                <label class="d-block mb-1" style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted,#6b7280)">Desde</label>
                <input type="date" id="hl-from" class="form-control form-control-sm" style="min-width:148px">
            </div>
            <div>
                <label class="d-block mb-1" style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted,#6b7280)">Hasta</label>
                <input type="date" id="hl-to" class="form-control form-control-sm" style="min-width:148px">
            </div>
            <button class="btn-primary-custom" id="hl-btn-apply" style="padding:.42rem 1rem;font-size:.84rem">
                <i class="bi bi-funnel"></i> Aplicar
            </button>
            <button class="btn-secondary-custom" id="hl-btn-clear" style="padding:.42rem 1rem;font-size:.84rem">
                <i class="bi bi-arrow-counterclockwise"></i> Todo
            </button>
        </div>
    </div>

    <div id="hl-content"></div>`;

    const render = () => {
        const from = document.getElementById('hl-from')?.value || null;
        const to   = document.getElementById('hl-to')?.value   || null;
        _hl_renderContent(user, document.getElementById('hl-content'), from, to);
    };

    document.getElementById('hl-btn-apply').addEventListener('click', render);
    document.getElementById('hl-btn-clear').addEventListener('click', () => {
        document.getElementById('hl-from').value = '';
        document.getElementById('hl-to').value   = '';
        _hl_renderContent(user, document.getElementById('hl-content'), null, null);
    });

    _hl_renderContent(user, document.getElementById('hl-content'), null, null);
}

/* ══════════════════════════════════════════════════════════
   RENDERIZADO PRINCIPAL
   ══════════════════════════════════════════════════════════ */
function _hl_renderContent(user, el, dateFrom, dateTo) {
    _hl_destroyCharts();

    const d = _hl_computeData(user, dateFrom, dateTo);

    el.innerHTML = `
    <!-- Pills de resumen -->
    <div class="row g-3 mb-4">
        ${_hl_pill('Total',       d.total,                '#0b1e3d', 'bi-collection')}
        ${_hl_pill('Pendientes',  d.counts.pendiente,     '#f0a500', 'bi-hourglass-split')}
        ${_hl_pill('Recibidas',   d.counts.recibida,      '#1a56db', 'bi-flask')}
        ${_hl_pill('Rechazadas',  d.counts.rechazada,     '#e0435a', 'bi-x-circle')}
        ${_hl_pill('Completadas', d.counts.completada,    '#00b87a', 'bi-check-circle-fill')}
    </div>

    <!-- Fila 1: doughnut estados + stacked bar exámenes -->
    <div class="row g-3 mb-4">
        <div class="col-12 col-lg-4">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="mb-3 hl-card-title">Distribución por estado</p>
                    ${d.total === 0 ? _hl_empty('Sin muestras en el período.') :
                    `<div style="position:relative; flex:1; min-height:220px; display:flex; align-items:center; justify-content:center;"><canvas id="hl-c-estados"></canvas></div>`}
                </div>
            </div>
        </div>
        <div class="col-12 col-lg-8">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="mb-3 hl-card-title">Por tipo de examen</p>
                    ${Object.keys(d.byExamen).length === 0 ? _hl_empty('Sin exámenes en el período.') :
                    `<div style="position:relative; flex:1; min-height:220px; width:100%;"><canvas id="hl-c-examenes"></canvas></div>`}
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-12 col-md-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body d-flex flex-column">
                    <p class="mb-3 hl-card-title">Tipos de muestra</p>
                    ${Object.keys(d.byTM).length === 0 ? _hl_empty('Sin datos.') :
                    `<div style="position:relative; flex:1; min-height:250px; width:100%;"><canvas id="hl-c-tm"></canvas></div>`}
                </div>
            </div>
        </div>
        <div class="col-12 col-md-6">
            <div class="card border-0 shadow-sm h-100" style="border-radius:12px">
                <div class="card-body">
                    <p class="mb-3 hl-card-title">Resultados emitidos</p>
                    <div id="hl-resultados"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Pirámide poblacional -->
    <div class="card border-0 shadow-sm mb-4" style="border-radius:12px">
        <div class="card-body">
            <p class="mb-3 hl-card-title">
                Pirámide de pacientes por edad y sexo
                <span style="font-size:.75rem;font-weight:400;color:var(--text-muted,#6b7280);margin-left:.5rem">${d.pyramid.total} paciente(s)</span>
            </p>
            ${d.pyramid.total === 0 ? _hl_empty('Sin pacientes en el período.') : `
            <div style="max-width:620px;margin:0 auto"><canvas id="hl-c-piramide"></canvas></div>`}
        </div>
    </div>

    <!-- Grupos de vulnerabilidad -->
    <div class="card border-0 shadow-sm mb-4" style="border-radius:12px">
        <div class="card-body">
            <p class="mb-1 hl-card-title">Positivos / Negativos por grupo de vulnerabilidad</p>
            <p class="mb-3" style="font-size:.78rem;color:var(--text-muted,#6b7280)">Solo indicaciones con resultado definitivo (excluye en estudio, contaminados y sin resultado).</p>
            ${Object.keys(d.gvStats).length === 0 ? _hl_empty('Sin resultados definitivos registrados.') :
            `<canvas id="hl-c-gv" style="max-height:360px"></canvas>`}
        </div>
    </div>

    <style>
        .hl-card-title {
            font-family: 'Syne', sans-serif;
            font-size: .88rem;
            font-weight: 700;
            color: #0b1e3d;
            margin-bottom: 0;
        }
    </style>`;

    /* Render charts en el siguiente frame para asegurar DOM visible */
    requestAnimationFrame(() => {
        if (d.total > 0)                           _hl_chartEstados(d);
        if (Object.keys(d.byExamen).length > 0)    _hl_chartExamenes(d);
        if (Object.keys(d.byTM).length > 0)        _hl_chartTM(d);
        _hl_renderResultados(d, document.getElementById('hl-resultados'));
        if (d.pyramid.total > 0)                   _hl_chartPiramide(d);
        if (Object.keys(d.gvStats).length > 0)     _hl_chartGV(d);
    });
}

/* ══════════════════════════════════════════════════════════
   CÁLCULO DE DATOS
   ══════════════════════════════════════════════════════════ */
function _hl_computeData(user, dateFrom, dateTo) {
    /* Labs donde el usuario tiene algún permiso explícito */
    const labIds = [...new Set([
        ..._labsConPermiso(user.id, 'puede_emitir'),
        ..._labsConPermiso(user.id, 'puede_editar'),
        ..._labsConPermiso(user.id, 'puede_eliminar'),
    ])];

    /* Fuentes de datos */
    const allInds   = JSON.parse(localStorage.getItem('_store.indicaciones') || '[]');
    const recs      = _getRecepciones();
    const baci      = _getResBaci();
    const cult      = _getResCultivo();
    const xpertU    = _getResXpertUltra();
    const xpertXDR  = _getResXpertXDR();
    const pacs      = JSON.parse(localStorage.getItem('_store.pacientes') || '[]');

    /* Filtrar indicaciones por laboratorio y fechas */
    const inds = allInds.filter(ind => {
        if (!labIds.includes(Number(ind.laboratorio_id))) return false;
        const f = ind.fecha_indicacion || '';
        if (dateFrom && f < dateFrom) return false;
        if (dateTo   && f > dateTo)   return false;
        return true;
    });

    /* IDs de recepciones relacionadas (para filtrar resultados) */
    const recIdSet = new Set(
        recs.filter(r => inds.some(i => i.id === r.indicacion_id)).map(r => r.id)
    );

    /* ── Conteo por estado, por examen ──────────────────── */
    const counts   = { pendiente: 0, recibida: 0, rechazada: 0, completada: 0 };
    const byExamen = {}; // exId → { pendiente, recibida, rechazada, completada }

    inds.forEach(ind => {
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            /* Buscar recepción: primero con examen_id explícito, luego legacy sin examen_id */
            const rec = recs.find(r =>
                r.indicacion_id === ind.id && Number(r.examen_id) === eid
            ) || recs.find(r =>
                r.indicacion_id === ind.id && !r.examen_id
            ) || null;

            let est;
            if (!rec) {
                est = 'pendiente';
            } else if (rec.estado === 'rechazada') {
                est = 'rechazada';
            } else {
                est = _hl_hasResult(rec.id, eid, baci, cult, xpertU, xpertXDR)
                    ? 'completada' : 'recibida';
            }

            counts[est]++;
            if (!byExamen[eid])
                byExamen[eid] = { pendiente:0, recibida:0, rechazada:0, completada:0 };
            byExamen[eid][est]++;
        });
    });

    /* ── Tipos de muestra ───────────────────────────────── */
    const byTM = {};
    inds.forEach(ind => {
        if (!ind.tipo_muestra_id) return;
        byTM[ind.tipo_muestra_id] = (byTM[ind.tipo_muestra_id] || 0) + 1;
    });

    /* ── Resultados emitidos por examen ─────────────────── */
    const resultados = {};

    const baciF    = baci.filter(r => recIdSet.has(r.recepcion_id));
    const cultF    = cult.filter(r => recIdSet.has(r.recepcion_id));
    const xpertUF  = xpertU.filter(r => recIdSet.has(r.recepcion_id));
    const xpertXDRF = xpertXDR.filter(r => recIdSet.has(r.recepcion_id));

    if (baciF.length) {
        resultados[1] = { 'Negativo': 0, 'Positivo': 0 };
        baciF.forEach(r => {
            if (r.codificacion === 0) resultados[1].Negativo++;
            else                      resultados[1].Positivo++;
        });
    }
    if (cultF.length) {
        resultados[2] = { 'Sin crecimiento': 0, 'Positivo': 0, 'Contaminado': 0, 'En estudio': 0 };
        cultF.forEach(r => {
            if      (r.resultado === '0')             resultados[2]['Sin crecimiento']++;
            else if (r.resultado === 'contaminado')   resultados[2].Contaminado++;
            else if (r.resultado === 'en_estudio')    resultados[2]['En estudio']++;
            else                                      resultados[2].Positivo++;
        });
    }
    if (xpertUF.length) {
        resultados[3] = {};
        xpertUF.forEach(r => {
            resultados[3][r.resultado] = (resultados[3][r.resultado] || 0) + 1;
        });
    }
    if (xpertXDRF.length) {
        resultados[5] = {};
        xpertXDRF.forEach(r => {
            resultados[5][r.resultado] = (resultados[5][r.resultado] || 0) + 1;
        });
    }

    /* ── Pirámide poblacional ───────────────────────────── */
    const pacIds   = new Set(inds.map(i => i.paciente_id));
    const filtPacs = pacs.filter(p => pacIds.has(p.id));
    const ageGroups = ['< 14', '15–29', '30–44', '45–59', '≥ 60'];
    const pyramid  = { total: filtPacs.length, M: [0,0,0,0,0], F: [0,0,0,0,0], ageGroups };

    filtPacs.forEach(p => {
        if (!p.fecha_nacimiento) return;
        const e  = _hl_edad(p.fecha_nacimiento);
        const g  = e < 14 ? 0 : e <= 29 ? 1 : e <= 44 ? 2 : e <= 59 ? 3 : 4;
        if      (p.sexo === 'M') pyramid.M[g]++;
        else if (p.sexo === 'F') pyramid.F[g]++;
    });

    /* ── Positivos / negativos por grupo de vulnerabilidad */
    const gvStats = {}; // gvId → { pos, neg }

    inds.forEach(ind => {
        const pac = pacs.find(p => p.id === ind.paciente_id);
        if (!pac || !(pac.grupos_ids || []).length) return;

        let hasPos = false, hasNeg = false;

        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            const rec = recs.find(r =>
                r.indicacion_id === ind.id &&
                (Number(r.examen_id) === eid || !r.examen_id)
            );
            if (!rec || rec.estado !== 'recibida') return;

            if (eid === 1) {
                const r = baci.find(x => x.recepcion_id === rec.id);
                if (r) { if (r.codificacion > 0) hasPos = true; else hasNeg = true; }
            } else if (eid === 2) {
                const r = cult.find(x => x.recepcion_id === rec.id);
                if (r && r.resultado !== 'en_estudio' && r.resultado !== 'contaminado') {
                    if (r.resultado === '0') hasNeg = true; else hasPos = true;
                }
            } else if (eid === 3) {
                const r = xpertU.find(x => x.recepcion_id === rec.id);
                if (r) {
                    if (r.resultado === 'MTB DETECTADO')    hasPos = true;
                    else if (r.resultado === 'MTB NO DETECTADO') hasNeg = true;
                }
            } else if (eid === 5) {
                const r = xpertXDR.find(x => x.recepcion_id === rec.id);
                if (r) {
                    if (r.resultado === 'MTB DETECTADO')    hasPos = true;
                    else if (r.resultado === 'MTB NO DETECTADO') hasNeg = true;
                }
            }
        });

        if (!hasPos && !hasNeg) return;
        pac.grupos_ids.forEach(gid => {
            if (!gvStats[gid]) gvStats[gid] = { pos: 0, neg: 0 };
            if (hasPos) gvStats[gid].pos++;
            if (hasNeg) gvStats[gid].neg++;
        });
    });

    return {
        total: counts.pendiente + counts.recibida + counts.rechazada + counts.completada,
        counts, byExamen, byTM, resultados, pyramid, gvStats,
        gvCat: _hl_getGVCat(),
        tmCat: _hl_getTMCat(),
    };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function _hl_hasResult(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) return baci.some(r => r.recepcion_id === recId);
    if (eid === 2) return cult.some(r => r.recepcion_id === recId);
    if (eid === 3) return xpertU.some(r => r.recepcion_id === recId);
    if (eid === 5) return xpertXDR.some(r => r.recepcion_id === recId);
    return false;
}

function _hl_edad(fechaNac) {
    const hoy = new Date(), nac = new Date(fechaNac + 'T00:00:00');
    let e = hoy.getFullYear() - nac.getFullYear();
    if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) e--;
    return e;
}

function _hl_getGVCat() {
    if (typeof _getGVCat === 'function') return _getGVCat();
    return JSON.parse(localStorage.getItem('_store.grupos_vulnerables') || '[]') || [];
}

function _hl_getTMCat() {
    if (typeof _getTMCat === 'function') return _getTMCat();
    return JSON.parse(localStorage.getItem('_store.tipos_muestra') || '[]') || [];
}

function _hl_pill(label, value, color, icon) {
    return `<div class="col-6 col-md">
        <div class="card border-0 shadow-sm" style="border-radius:10px;border-left:4px solid ${color}">
            <div class="card-body py-3 px-3">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:1.6rem;font-weight:600;line-height:1;color:${color}">${value}</div>
                <div style="font-size:.71rem;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-top:.3rem">
                    <i class="bi ${icon} me-1"></i>${label}
                </div>
            </div>
        </div>
    </div>`;
}

function _hl_empty(msg) {
    return `<p class="text-center py-3 mb-0" style="font-size:.84rem;color:var(--text-muted,#6b7280)"><i class="bi bi-inbox me-1"></i>${msg}</p>`;
}

/* ── Opciones globales de Chart.js ──────────────────────── */
function _hl_defaults() {
    return {
        font: { family: "'DM Sans', sans-serif", size: 11 },
        color: '#64748b',
    };
}

/* ══════════════════════════════════════════════════════════
   GRÁFICOS
   ══════════════════════════════════════════════════════════ */

/* Doughnut — distribución por estado */
function _hl_chartEstados(d) {
    const c = document.getElementById('hl-c-estados');
    if (!c) return;
    _hl_charts.estados = new Chart(c, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Recibidas', 'Rechazadas', 'Completadas'],
            datasets: [{
                data: [d.counts.pendiente, d.counts.recibida, d.counts.rechazada, d.counts.completada],
                backgroundColor: ['#f0a500', '#1a56db', '#e0435a', '#00b87a'],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 8, boxWidth: 12, color: '#334155' }
                }
            }
        }
    });
}

/* Bar apilada — por tipo de examen */
function _hl_chartExamenes(d) {
    const c = document.getElementById('hl-c-examenes');
    if (!c) return;
    const examIds = Object.keys(d.byExamen).map(Number)
        .filter(id => Object.values(d.byExamen[id]).some(v => v > 0));
    const labels  = examIds.map(id => _EXAMENES_CAT.find(e => e.id === id)?.codigo || `Ex.${id}`);
    const mk = (label, key, bg) => ({
        label, backgroundColor: bg, borderRadius: 3, maxBarThickness: 40, // <--- Límite
        data: examIds.map(id => d.byExamen[id][key] || 0)
    });
    _hl_charts.examenes = new Chart(c, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                mk('Pendientes', 'pendiente', '#f0a500'),
                mk('Recibidas',  'recibida',  '#1a56db'),
                mk('Rechazadas', 'rechazada', '#e0435a'),
                mk('Completadas','completada','#00b87a'),
            ]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
		scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, ticks: { precision: 0, color: '#64748b' }, grid: { color: 'rgba(0,0,0,.05)' } }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 6, boxWidth: 12, color: '#334155' }
                }
            }
        }
    });
}

/* Bar horizontal — tipos de muestra */
function _hl_chartTM(d) {
    const c = document.getElementById('hl-c-tm');
    if (!c) return;
    const entries = Object.entries(d.byTM)
        .map(([id, n]) => ({
            label: d.tmCat.find(m => m.id === Number(id))?.nombre || `Muestra #${id}`,
            n
        }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 12);

    _hl_charts.tm = new Chart(c, {
        type: 'bar',
        data: {
            labels: entries.map(e => e.label),
            datasets: [{
                label: 'Indicaciones',
                data: entries.map(e => e.n),
                backgroundColor: '#00c6b8',
                borderRadius: 3,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { precision: 0, color: '#64748b' }, grid: { color: 'rgba(0,0,0,.05)' } },
                y: { ticks: { font: { size: 11 }, color: '#334155' }, grid: { display: false } }
            }
        }
    });
}

/* Barras de progreso — resultados emitidos por examen */
function _hl_renderResultados(d, el) {
    if (!el) return;
    const exIds = Object.keys(d.resultados).map(Number);
    if (!exIds.length) {
        el.innerHTML = _hl_empty('Sin resultados emitidos en el período.');
        return;
    }

    const posKeys = new Set(['Positivo', 'MTB DETECTADO']);
    const negKeys = new Set(['Negativo', 'Sin crecimiento', 'MTB NO DETECTADO']);

    el.innerHTML = exIds.map((eid, i) => {
        const res   = d.resultados[eid];
        const total = Object.values(res).reduce((s, v) => s + v, 0);
        const ex    = _EXAMENES_CAT.find(e => e.id === eid);
        const bars  = Object.entries(res).map(([label, cnt]) => {
            const pct = total > 0 ? Math.round(cnt / total * 100) : 0;
            const col = posKeys.has(label) ? '#e0435a'
                      : negKeys.has(label) ? '#00b87a'
                      : '#8fa3bf';
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

        const sep = i > 0 ? 'style="margin-top:.9rem;padding-top:.9rem;border-top:1px solid #f1f5f9"' : '';
        return `<div ${sep}>
            <div class="d-flex align-items-center gap-2 mb-2">
                <span style="padding:.12em .55em;border-radius:5px;background:#e0f2fe;color:#0369a1;font-family:'IBM Plex Mono',monospace;font-size:.7rem;font-weight:700">${ex?.codigo || eid}</span>
                <span style="font-size:.82rem;font-weight:600;color:#0b1e3d">${ex?.nombre || `Examen ${eid}`}</span>
                <span style="font-size:.72rem;color:#8fa3bf;margin-left:auto">n=${total}</span>
            </div>
            ${bars}
        </div>`;
    }).join('');
}

/* Bar horizontal (espejada) — pirámide poblacional */
function _hl_chartPiramide(d) {
    const c = document.getElementById('hl-c-piramide');
    if (!c) return;
    const { pyramid } = d;
    _hl_charts.piramide = new Chart(c, {
        type: 'bar',
        data: {
            labels: pyramid.ageGroups,
            datasets: [
                {
                    label: 'Masculino',
                    data: pyramid.M.map(v => -v),
                    backgroundColor: 'rgba(26,86,219,.72)',
                    borderRadius: 3,
                },
                {
                    label: 'Femenino',
                    data: pyramid.F,
                    backgroundColor: 'rgba(224,67,90,.72)',
                    borderRadius: 3,
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        callback: v => Math.abs(v),
                        precision: 0,
                        color: '#64748b',
                    },
                    grid: { color: 'rgba(0,0,0,.05)' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#334155' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 10, boxWidth: 12, color: '#334155' }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${Math.abs(ctx.raw)}`
                    }
                }
            }
        }
    });
}

/* Bar horizontal agrupada — positivos/negativos por GV */
function _hl_chartGV(d) {
    const c = document.getElementById('hl-c-gv');
    if (!c) return;
    const entries = Object.entries(d.gvStats)
        .map(([id, v]) => ({
            label: d.gvCat.find(g => g.id === Number(id))?.nombre || `Grupo ${id}`,
            pos: v.pos,
            neg: v.neg,
        }))
        .filter(e => e.pos + e.neg > 0)
        .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg))
        .slice(0, 15);

    _hl_charts.gv = new Chart(c, {
        type: 'bar',
        data: {
            labels: entries.map(e => e.label.length > 42 ? e.label.slice(0, 39) + '…' : e.label),
            datasets: [
                {
                    label: 'Positivos',
                    data: entries.map(e => e.pos),
                    backgroundColor: 'rgba(224,67,90,.8)',
                    borderRadius: 3,
                },
                {
                    label: 'Negativos',
                    data: entries.map(e => e.neg),
                    backgroundColor: 'rgba(0,184,122,.8)',
                    borderRadius: 3,
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    ticks: { precision: 0, color: '#64748b' },
                    grid: { color: 'rgba(0,0,0,.05)' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#334155' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 10, boxWidth: 12, color: '#334155' }
                }
            }
        }
    });
}
