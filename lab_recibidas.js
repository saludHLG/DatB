/* =========================================================
   lab_recibidas.js — Tabs "Muestras recibidas" y "Rechazadas".
   Requiere: laboratorio_core.js, lab_resultados.js
   ========================================================= */

/* ── Tab: Muestras rechazadas ─────────────────────────────── */
function _renderRechazadas(rechazadas, content, user, rootEl, emitirIds, editarIds) {
    if (!rechazadas.length) {
        content.innerHTML = `<div class="modulo-placeholder">
            <i class="bi bi-check-circle"></i><p>No hay muestras rechazadas registradas.</p></div>`;
        return;
    }

    const inds = JSON.parse(localStorage.getItem('sr_indicaciones') || '[]');
    const pacs = JSON.parse(localStorage.getItem('sr_pacientes')    || '[]');
    const _norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const _buildRows = q => {
        const filtered = rechazadas.filter(rec => {
            if (!q) return true;
            const ind = inds.find(i => i.id === rec.indicacion_id);
            const pac = (ind ? pacs.find(p => p.id === ind.paciente_id) : null) || rec.snap?.paciente || null;
            return pac && (
                _norm(`${pac.nombres} ${pac.apellidos}`).includes(_norm(q)) ||
                _norm(pac.carnet_identidad).includes(_norm(q))
            );
        }).sort((a, b) => (b.fecha_recepcion || '').localeCompare(a.fecha_recepcion || ''));

        if (!filtered.length)
            return `<tr><td colspan="9" class="text-center text-muted py-3">Sin resultados para esa búsqueda.</td></tr>`;

        return filtered.map(rec => {
            const ind    = inds.find(i => i.id === rec.indicacion_id) || null;
            const snap   = rec.snap || {};
            const pac    = (ind ? pacs.find(p => p.id === ind.paciente_id) : null) || snap.paciente || null;
            const centro = ind ? _centroNombreDeIndicador(ind.indicado_por) : (snap.centro_nombre || snap.indicador_nombre || '—');
            const tmId   = ind ? ind.tipo_muestra_id : (snap.tipo_muestra_id || null);
            const tm     = tmId ? _tipoMuestraNombreById(tmId) : '—';
            const ex     = _examenNombre(rec.examen_id || snap.examen_id || 0);
            const puedeEl = (emitirIds || []).includes(rec.laboratorio_id) || (editarIds || []).includes(rec.laboratorio_id);
            return `<tr>
                <td style="font-family:var(--font-mono);font-size:.78rem;white-space:nowrap">${_fmtDate(rec.fecha_recepcion?.slice(0, 10) || '')}</td>
                <td><span class="exam-tag">${ex.codigo}</span></td>
                <td><span class="lab-pac-name" style="font-size:.88rem">${pac ? pac.apellidos + ', ' + pac.nombres : '—'}</span></td>
                <td style="font-family:var(--font-mono);font-size:.78rem">${pac?.carnet_identidad || '—'}</td>
                <td style="font-size:.82rem">${tm}</td>
                <td style="font-size:.82rem;max-width:180px">
                    <span title="${centro}" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">${centro}</span>
                </td>
                <td style="font-size:.82rem">
                    <span style="color:#92400e;background:#fef3c7;padding:.2em .6em;border-radius:6px;display:inline-block">${rec.motivo_rechazo || '—'}</span>
                </td>
                <td style="font-size:.75rem;color:var(--text-muted)">${_userName(rec.recibida_por)}</td>
                <td class="text-end">
                    ${puedeEl ? `<button class="btn-danger-custom btn-sm-lab btn-del-rechazada"
                        data-rec-id="${rec.id}"><i class="bi bi-trash"></i></button>` : ''}
                </td>
            </tr>`;
        }).join('');
    };

    content.innerHTML = `
    <div style="display:flex;gap:.65rem;margin-bottom:.85rem">
        <div style="position:relative;flex:1;min-width:200px;max-width:360px">
            <i class="bi bi-search" style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none"></i>
            <input type="text" id="lab-rech-search" class="form-control" style="padding-left:2.2rem" placeholder="Buscar por nombre o CI…">
        </div>
    </div>
    <div class="table-responsive">
        <table class="lab-result-table">
            <thead><tr>
                <th>Fecha rec.</th><th>Examen</th><th>Paciente</th><th>CI</th>
                <th>Tipo muestra</th><th>Centro remitente</th>
                <th>Motivo de rechazo</th><th>Recibido por</th><th></th>
            </tr></thead>
            <tbody id="lab-rech-tbody">${_buildRows('')}</tbody>
        </table>
    </div>`;

    const _rebind = () => content.querySelectorAll('.btn-del-rechazada').forEach(btn =>
        btn.addEventListener('click', () => _appConfirm(
            'Se eliminará este registro de rechazo. Esta acción no se puede deshacer.',
            () => { _saveRecepciones(_getRecepciones().filter(r => r.id !== btn.dataset.recId)); renderLaboratorio(user, rootEl); }
        ))
    );
    document.getElementById('lab-rech-search').addEventListener('input', function () {
        document.getElementById('lab-rech-tbody').innerHTML = _buildRows(this.value.trim());
        _rebind();
    });
    _rebind();
}

/* ── Tab: Muestras recibidas ──────────────────────────────── */
function _renderRecibidas(recepciones, content, user, rootEl, emitirIds, editarIds) {
    if (!recepciones.length) {
        content.innerHTML = `<div class="modulo-placeholder">
            <i class="bi bi-flask"></i><p>No hay muestras recibidas aún.</p></div>`;
        return;
    }

    const inds = JSON.parse(localStorage.getItem('sr_indicaciones') || '[]');
    const pacs = JSON.parse(localStorage.getItem('sr_pacientes')    || '[]');
    const baci = _getResBaci();
    const cult = _getResCultivo();

    const examIdsPresentes = new Set();
    recepciones.forEach(rec => {
        if (rec.examen_id) { examIdsPresentes.add(Number(rec.examen_id)); return; }
        const snapIds = rec.snap?.examenes_ids || [];
        if (snapIds.length) { snapIds.forEach(eid => examIdsPresentes.add(Number(eid))); return; }
        if (baci.some(r => r.recepcion_id === rec.id)) examIdsPresentes.add(1);
        if (cult.some(r => r.recepcion_id === rec.id)) examIdsPresentes.add(2);
        const ind = inds.find(i => i.id === rec.indicacion_id);
        (ind?.examenes_ids || []).forEach(eid => examIdsPresentes.add(Number(eid)));
    });

    const examCat = _EXAMENES_CAT.filter(e => examIdsPresentes.has(e.id));
    if (!content._exActivo || !examCat.find(e => e.id === content._exActivo))
        content._exActivo = examCat[0]?.id || 1;

    const subTabs = examCat.map(e => `
        <button class="lab-subtab-btn${content._exActivo === e.id ? ' active' : ''}" data-ex-id="${e.id}">
            <span class="exam-tag">${e.codigo}</span>
            <span>${e.nombre}</span>
            ${!_SOPORTADOS.has(e.id) ? '<span class="lab-badge-prox">Prox.</span>' : ''}
        </button>`).join('');

    content.innerHTML = `
    <div style="display:flex;gap:.65rem;margin-bottom:.85rem">
        <div style="position:relative;flex:1;min-width:200px;max-width:360px">
            <i class="bi bi-search" style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none"></i>
            <input type="text" id="lab-rec-search" class="form-control"
                   style="padding-left:2.2rem" placeholder="Buscar por nombre o CI…"
                   value="${content._searchQ || ''}">
        </div>
    </div>
    <div class="lab-subtabs mb-3">${subTabs}</div>
    <div id="lab-exam-table-wrap"></div>`;

    document.getElementById('lab-rec-search').addEventListener('input', function () {
        content._searchQ = this.value.trim();
        content._page = 1;
        _renderExamTable(content._exActivo, recepciones, inds, pacs, baci, cult, user, rootEl, emitirIds, editarIds, content._searchQ, content);
    });
    content.querySelectorAll('.lab-subtab-btn').forEach(btn =>
        btn.addEventListener('click', function () {
            content._exActivo = parseInt(this.dataset.exId);
            content._page = 1;
            content.querySelectorAll('.lab-subtab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            _renderExamTable(content._exActivo, recepciones, inds, pacs, baci, cult, user, rootEl, emitirIds, editarIds, content._searchQ || '', content);
        })
    );
    _renderExamTable(content._exActivo, recepciones, inds, pacs, baci, cult, user, rootEl, emitirIds, editarIds, content._searchQ || '', content);
}

const _LAB_PAGE_SIZE = 50;

function _buildPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';
    const MAX_BTNS = 7;
    let pages = [];
    if (totalPages <= MAX_BTNS) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        const half = Math.floor(MAX_BTNS / 2);
        let start = Math.max(1, currentPage - half);
        let end   = Math.min(totalPages, start + MAX_BTNS - 1);
        if (end - start < MAX_BTNS - 1) start = Math.max(1, end - MAX_BTNS + 1);
        pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        if (pages[0] > 1)              pages = [1, '…', ...pages.slice(pages[0] === 2 ? 0 : 1)];
        if (pages[pages.length-1] < totalPages) pages = [...pages.slice(0, pages[pages.length-1] === totalPages-1 ? pages.length : -1), '…', totalPages];
    }
    const items = pages.map(p => {
        if (p === '…') return `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        return `<li class="page-item ${p === currentPage ? 'active' : ''}">
            <button class="page-link lab-page-btn" data-page="${p}">${p}</button>
        </li>`;
    }).join('');
    return `
    <nav class="mt-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <small class="text-muted" style="font-size:.78rem">
            Página ${currentPage} de ${totalPages}
            &nbsp;·&nbsp; ${_LAB_PAGE_SIZE * (currentPage - 1) + 1}–${Math.min(_LAB_PAGE_SIZE * currentPage, _LAB_PAGE_SIZE * totalPages)} registros
        </small>
        <ul class="pagination pagination-sm mb-0">
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link lab-page-btn" data-page="${currentPage - 1}">‹</button>
            </li>
            ${items}
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link lab-page-btn" data-page="${currentPage + 1}">›</button>
            </li>
        </ul>
    </nav>`;
}

function _renderExamTable(exId, recepciones, inds, pacs, baci, cult, user, rootEl, emitirIds, editarIds, searchQ, contentEl) {
    const wrap = document.getElementById('lab-exam-table-wrap');
    if (!wrap) return;
    const _norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = _norm(searchQ || '');

    const rows = recepciones
        .filter(rec => {
            const exMatch = (() => {
                if (rec.examen_id) return Number(rec.examen_id) === exId;
                const snapExIds = (rec.snap?.examenes_ids || []).map(Number);
                if (snapExIds.length) return snapExIds.includes(exId);
                const ind2 = inds.find(i => i.id === rec.indicacion_id);
                if (ind2) return (ind2.examenes_ids || []).map(Number).includes(exId);
                return (exId === 1 && baci.some(r => r.recepcion_id === rec.id)) ||
                       (exId === 2 && cult.some(r => r.recepcion_id === rec.id));
            })();
            if (!exMatch) return false;
            if (!q) return true;
            const ind2 = inds.find(i => i.id === rec.indicacion_id);
            const pac2 = (ind2 ? pacs.find(p => p.id === ind2.paciente_id) : null) || rec.snap?.paciente || null;
            return pac2 && (
                _norm(`${pac2.nombres} ${pac2.apellidos}`).includes(q) ||
                _norm(pac2.carnet_identidad).includes(q)
            );
        })
        .map(rec => {
            let nMuestra = null;
            if (exId === 1) nMuestra = baci.find(r => r.recepcion_id === rec.id)?.numero_muestra ?? null;
            if (exId === 2) nMuestra = cult.find(r => r.recepcion_id === rec.id)?.numero_muestra ?? null;
            if (exId === 3) nMuestra = _getResXpertUltra().find(r => r.recepcion_id === rec.id)?.numero_muestra ?? null;
            if (exId === 5) nMuestra = _getResXpertXDR().find(r => r.recepcion_id === rec.id)?.numero_muestra ?? null;
            const ind = inds.find(i => i.id === rec.indicacion_id) || null;
            return { rec, ind, nMuestra };
        })
        .sort((a, b) => {
            const fa = a.ind?.fecha_indicacion || a.rec.fecha_recepcion?.slice(0, 10) || '';
            const fb = b.ind?.fecha_indicacion || b.rec.fecha_recepcion?.slice(0, 10) || '';
            const fd = fb.localeCompare(fa); if (fd !== 0) return fd;
            if (a.nMuestra === null && b.nMuestra === null) return 0;
            if (a.nMuestra === null) return 1; if (b.nMuestra === null) return -1;
            return b.nMuestra - a.nMuestra;
        });

    if (!rows.length) {
        wrap.innerHTML = `<div class="modulo-placeholder" style="padding:2rem">
            <i class="bi bi-inbox"></i><p>No hay muestras recibidas para este examen.</p></div>`;
        return;
    }

    const currentPage  = (contentEl && contentEl._page) ? contentEl._page : 1;
    const totalPages   = Math.max(1, Math.ceil(rows.length / _LAB_PAGE_SIZE));
    const safePage     = Math.min(currentPage, totalPages);
    const paginated    = rows.slice((safePage - 1) * _LAB_PAGE_SIZE, safePage * _LAB_PAGE_SIZE);

    const tbody = paginated.map(({ rec, ind, nMuestra }) => {
        const snap   = rec.snap || {};
        const pac    = (ind?.paciente_id ? pacs.find(p => p.id === ind.paciente_id) : null) || snap.paciente || null;
        const centro = ind ? _centroNombreDeIndicador(ind.indicado_por) : (snap.centro_nombre || snap.indicador_nombre || '—');
        const tmId   = ind ? ind.tipo_muestra_id : snap.tipo_muestra_id;
        const tm     = tmId ? _tipoMuestraNombreById(tmId) : '—';
        const fInd   = ind?.fecha_indicacion || snap.fecha_indicacion || rec.fecha_recepcion?.slice(0, 10) || '';

        let resHtml = '<span class="text-muted" style="font-size:.78rem">Pendiente</span>';
        if (exId === 1) { const r = baci.find(x => x.recepcion_id === rec.id); if (r) { const cls = r.codificacion === 0 ? 'res-neg' : 'res-pos'; resHtml = `<span class="res-cod ${cls}">${r.codificacion} — ${r.codificacion === 0 ? 'Neg.' : 'Pos.'}</span>`; } }
        else if (exId === 2) { const r = cult.find(x => x.recepcion_id === rec.id); if (r) { const cls = r.resultado === 'en_estudio' ? 'res-estudio' : r.resultado === 'contaminado' ? 'res-contam' : r.resultado === '0' ? 'res-neg' : 'res-pos'; const lbl = r.resultado === 'en_estudio' ? 'En estudio' : r.resultado === 'contaminado' ? 'Contam.' : r.resultado === '0' ? 'Sin crec.' : `Pos.(${r.resultado})`; const fS = r.fecha_resultado ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:.15rem"><i class="bi bi-calendar-check me-1"></i>Salida: ${_fmtDate(r.fecha_resultado)}</div>` : ''; resHtml = `<div><span class="res-cod ${cls}">${lbl}</span>${fS}</div>`; } }
        else if (exId === 3) { const r = _getResXpertUltra().find(x => x.recepcion_id === rec.id); if (r) resHtml = `<span class="res-cod ${_resultadoXpertCls(r.resultado)}" style="font-size:.72rem">${r.resultado}</span>`; }
        else if (exId === 5) { const r = _getResXpertXDR().find(x => x.recepcion_id === rec.id); if (r) resHtml = `<span class="res-cod ${_resultadoXpertCls(r.resultado)}" style="font-size:.72rem">${r.resultado}</span>`; }

        const puedeEmitir = (emitirIds || []).includes(rec.laboratorio_id);
        const puedeEditar = (editarIds || []).includes(rec.laboratorio_id);
        const tieneRes    = _tieneAlgunResultado(rec.id);

        let btnHtml = '';
        if (!_SOPORTADOS.has(exId)) { btnHtml = `<span class="lab-badge-prox">Prox.</span>`; }
        else if (!tieneRes && puedeEmitir) { btnHtml = `<button class="btn-primary-custom btn-sm-lab btn-resultados" data-rec-id="${rec.id}"><i class="bi bi-plus-circle"></i> Registrar</button>`; }
        else if (tieneRes && (puedeEmitir || puedeEditar)) { btnHtml = `<button class="btn-primary-custom btn-sm-lab btn-resultados" data-rec-id="${rec.id}"><i class="bi bi-pencil"></i> Editar</button>`; }
        else if (tieneRes) { btnHtml = `<button class="btn-secondary-custom btn-sm-lab btn-resultados" data-rec-id="${rec.id}"><i class="bi bi-eye"></i> Ver</button>`; }
        if (_SOPORTADOS.has(exId) && (puedeEmitir || puedeEditar))
            btnHtml += ` <button class="btn-danger-custom btn-sm-lab btn-del-resultado" data-rec-id="${rec.id}"><i class="bi bi-trash"></i></button>`;

        let regPor = null;
        if (exId === 1) { const r = baci.find(x => x.recepcion_id === rec.id); regPor = r?.registrado_por ?? null; }
        if (exId === 2) { const r = cult.find(x => x.recepcion_id === rec.id); regPor = r?.registrado_por ?? null; }
        if (exId === 3) { const r = _getResXpertUltra().find(x => x.recepcion_id === rec.id); regPor = r?.registrado_por ?? null; }
        if (exId === 5) { const r = _getResXpertXDR().find(x => x.recepcion_id === rec.id); regPor = r?.registrado_por ?? null; }

        return `<tr>
            <td style="white-space:nowrap;font-family:var(--font-mono);font-size:.78rem">${_fmtDate(fInd)}</td>
            <td style="font-family:var(--font-mono);text-align:center">${nMuestra !== null ? nMuestra : '<span class="text-muted">—</span>'}</td>
            <td><span class="lab-pac-name" style="font-size:.88rem">${pac ? pac.apellidos + ', ' + pac.nombres : '—'}</span></td>
            <td style="font-family:var(--font-mono);font-size:.78rem">${pac?.carnet_identidad || '—'}</td>
            <td style="font-size:.82rem">${tm}</td>
            <td style="font-size:.82rem;max-width:180px">
                <span title="${ind ? centro : ''}" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">${centro}</span>
            </td>
            <td>${resHtml}</td>
            <td style="font-size:.75rem;color:var(--text-muted)">
                <div><i class="bi bi-box-arrow-in-down me-1"></i>${_userName(rec.recibida_por)}</div>
                ${regPor ? `<div><i class="bi bi-pencil-square me-1"></i>${_userName(regPor)}</div>` : ''}
            </td>
            <td class="text-end">${btnHtml}</td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
    <div class="table-responsive">
        <table class="lab-result-table">
            <thead><tr>
                <th>Fecha</th><th>N° muestra</th><th>Paciente</th><th>CI</th>
                <th>Tipo muestra</th><th>Centro remitente</th>
                <th>Resultado</th><th>Recibido / Registrado</th><th></th>
            </tr></thead>
            <tbody>${tbody}</tbody>
        </table>
    </div>
    ${_buildPagination(safePage, totalPages)}`;

    wrap.querySelectorAll('.lab-page-btn').forEach(btn =>
        btn.addEventListener('click', () => {
            const newPage = parseInt(btn.dataset.page);
            if (!newPage || newPage < 1 || newPage > totalPages) return;
            if (contentEl) contentEl._page = newPage;
            _renderExamTable(exId, recepciones, inds, pacs, baci, cult, user, rootEl, emitirIds, editarIds, searchQ, contentEl);
            wrap.closest('.app-content')?.scrollTo({ top: 0, behavior: 'smooth' });
        })
    );

    wrap.querySelectorAll('.btn-resultados').forEach(btn =>
        btn.addEventListener('click', () => {
            const rec = recepciones.find(r => r.id === btn.dataset.recId);
            if (!rec) return;
            const ind = inds.find(i => i.id === rec.indicacion_id) || null;
            const proxy = ind || {
                id: rec.indicacion_id, paciente_id: null,
                examenes_ids: rec.examen_id ? [rec.examen_id] : (rec.snap?.examenes_ids || []),
                tipo_muestra_id: rec.snap?.tipo_muestra_id || null,
                laboratorio_id: rec.laboratorio_id,
                fecha_indicacion: rec.snap?.fecha_indicacion || rec.fecha_recepcion?.slice(0, 10),
            };
            _abrirModalResultados(rec, proxy, user, rootEl, emitirIds, editarIds);
        })
    );

    wrap.querySelectorAll('.btn-del-resultado').forEach(btn =>
        btn.addEventListener('click', () => {
            const recId = btn.dataset.recId;
            _appConfirm('Se eliminará la recepción y sus resultados asociados. Esta acción no se puede deshacer.', () => {
                _saveResBaci(_getResBaci().filter(r => r.recepcion_id !== recId));
                _saveResCultivo(_getResCultivo().filter(r => r.recepcion_id !== recId));
                _saveResXpertUltra(_getResXpertUltra().filter(r => r.recepcion_id !== recId));
                _saveResXpertXDR(_getResXpertXDR().filter(r => r.recepcion_id !== recId));
                _saveRecepciones(_getRecepciones().filter(r => r.id !== recId));
                renderLaboratorio(user, rootEl);
            });
        })
    );
}
