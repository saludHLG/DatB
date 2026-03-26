/* =========================================================
   lab_pendientes.js — Tab "Pendientes" del módulo de Lab.
   Gestiona la lista de indicaciones por recepcionar y el
   formulario de recepción / rechazo de muestra.
   Requiere: laboratorio_core.js
   ========================================================= */

function _renderPendientes(inds, content, user, rootEl, emitirIds) {
    const _norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (!inds.length) {
        content.innerHTML = `<div class="modulo-placeholder">
            <i class="bi bi-inbox"></i>
            <p>No hay indicaciones pendientes de recepción para sus laboratorios.</p>
        </div>`;
        return;
    }

    content.innerHTML = `
    <div style="display:flex;gap:.65rem;margin-bottom:.85rem">
        <div style="position:relative;flex:1;min-width:200px;max-width:360px">
            <i class="bi bi-search" style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none"></i>
            <input type="text" id="lab-pend-search" class="form-control"
                   style="padding-left:2.2rem" placeholder="Buscar por nombre o CI…">
        </div>
    </div>
    <div id="lab-pend-list"></div>`;

    const _filtrar = q => {
        if (!q) return inds;
        const pacs = JSON.parse(localStorage.getItem('sr_pacientes') || '[]');
        return inds.filter(ind => {
            const pac = pacs.find(p => p.id === ind.paciente_id);
            return pac && (
                _norm(`${pac.nombres} ${pac.apellidos}`).includes(_norm(q)) ||
                _norm(pac.carnet_identidad).includes(_norm(q))
            );
        });
    };

    const _renderList = q => {
        const filtered = _filtrar(q);
        const wrap = document.getElementById('lab-pend-list');
        if (!wrap) return;
        if (!filtered.length) {
            wrap.innerHTML = `<div class="modulo-placeholder" style="padding:2rem">
                <i class="bi bi-funnel"></i><p>Sin resultados para esa búsqueda.</p></div>`;
            return;
        }
        wrap.innerHTML = `<div class="lab-list">${filtered.map(ind => _cardPendiente(ind, emitirIds)).join('')}</div>`;
        wrap.querySelectorAll('.btn-recibir').forEach(btn =>
            btn.addEventListener('click', () => {
                const ind = inds.find(i => i.id === btn.dataset.id && i._examen_id === Number(btn.dataset.exId));
                if (ind) _renderFormRecepcion(ind, user, rootEl);
            })
        );
    };

    document.getElementById('lab-pend-search').addEventListener('input', function () {
        _renderList(this.value.trim());
    });
    _renderList('');
}

function _cardPendiente(ind, emitirIds) {
    const pac    = (JSON.parse(localStorage.getItem('sr_pacientes') || '[]')).find(p => p.id === ind.paciente_id);
    const centro = _centroNombreDeIndicador(ind.indicado_por);
    const ex     = _examenNombre(ind._examen_id);
    const medNom = ind.medico ? `Dr./Dra. ${ind.medico.nombres} ${ind.medico.apellidos}` : '—';
    const puedeRecepcionar = emitirIds && emitirIds.includes(ind.laboratorio_id);
    return `
    <div class="lab-card">
        <div class="lab-card-main">
            <span class="lab-pac-name">${pac ? pac.apellidos + ', ' + pac.nombres : '—'}</span>
            <span class="lab-pac-ci">CI: ${pac?.carnet_identidad || '—'}</span>
            <div class="lab-card-meta">
                <span><i class="bi bi-calendar3"></i> ${_fmtDate(ind.fecha_indicacion)}</span>
                <span><i class="bi bi-hospital"></i> ${centro || '—'}</span>
                <span><i class="bi bi-person-badge"></i> ${medNom}</span>
            </div>
            <div class="lab-card-tags mt-1"><span class="exam-tag">${ex.codigo}</span></div>
        </div>
        <div class="lab-card-actions">
            ${puedeRecepcionar
                ? `<button class="btn-primary-custom btn-sm-lab btn-recibir"
                       data-id="${ind.id}" data-ex-id="${ind._examen_id}">
                       <i class="bi bi-box-arrow-in-down"></i> Recepcionar
                   </button>`
                : `<span style="font-size:.75rem;color:var(--text-muted)"><i class="bi bi-eye"></i> Pendiente recepción</span>`}
        </div>
    </div>`;
}

function _renderFormRecepcion(ind, user, rootEl) {
    const pac   = (JSON.parse(localStorage.getItem('sr_pacientes') || '[]')).find(p => p.id === ind.paciente_id);
    const lab   = _labNombre(ind.laboratorio_id);
    const tmAll = JSON.parse(localStorage.getItem('sr_tipos_muestra') || 'null') || [];
    const tm    = tmAll.find(m => m.id === ind.tipo_muestra_id)?.nombre || `Muestra #${ind.tipo_muestra_id}`;
    const exNom = _examenNombre(ind._examen_id);

    rootEl.innerHTML = `
    <div class="modulo-header">
        <div class="d-flex align-items-center gap-2">
            <button class="btn-back-mod" id="btn-volver-lab"><i class="bi bi-arrow-left"></i></button>
            <div>
                <h2 class="modulo-title">Recepción de muestra</h2>
                <p class="modulo-sub">Registre la recepción o rechazo de la muestra.</p>
            </div>
        </div>
    </div>
    <div class="wizard-card" style="max-width:680px">
        <div class="rec-resumen mb-4">
            <div class="rec-resumen-row"><span class="rec-label">Paciente</span>
                <span>${pac ? pac.apellidos + ', ' + pac.nombres : '—'} &nbsp;<code class="small">${pac?.carnet_identidad || ''}</code></span></div>
            <div class="rec-resumen-row"><span class="rec-label">Laboratorio</span><span>${lab}</span></div>
            <div class="rec-resumen-row"><span class="rec-label">Tipo de muestra</span><span>${tm}</span></div>
            <div class="rec-resumen-row"><span class="rec-label">Examen</span>
                <span><span class="exam-tag">${exNom.codigo}</span>&nbsp;${exNom.nombre}</span></div>
            <div class="rec-resumen-row"><span class="rec-label">Fecha indicación</span><span>${_fmtDate(ind.fecha_indicacion)}</span></div>
        </div>
        <div class="mb-3">
            <label class="form-label fw-semibold">Decisión <span class="required">*</span></label>
            <div class="d-flex gap-4 flex-wrap">
                <label class="rec-radio-opt"><input type="radio" name="rec-decision" value="recibida" checked>
                    <span><i class="bi bi-check-circle text-success"></i> Recibida</span></label>
                <label class="rec-radio-opt"><input type="radio" name="rec-decision" value="rechazada">
                    <span><i class="bi bi-x-circle text-danger"></i> Rechazada</span></label>
            </div>
        </div>
        <div id="block-motivo" class="d-none mb-3">
            <label for="rec-motivo" class="form-label">Motivo de rechazo <span class="required">*</span></label>
            <textarea id="rec-motivo" class="form-control" rows="3"
                placeholder="Muestra insuficiente, recipiente inadecuado…"></textarea>
            <div class="invalid-feedback" id="err-rec-motivo"></div>
        </div>
        <div id="rec-alert" class="alert-custom d-none mt-2"></div>
        <div class="paso-actions">
            <div></div>
            <button type="button" class="btn-primary-custom" id="btn-confirmar-rec">
                <i class="bi bi-floppy"></i> Confirmar recepción
            </button>
        </div>
    </div>`;

    document.getElementById('btn-volver-lab').addEventListener('click', () =>
        renderLaboratorio(user, rootEl)
    );
    document.querySelectorAll('input[name="rec-decision"]').forEach(r =>
        r.addEventListener('change', function () {
            document.getElementById('block-motivo').classList.toggle('d-none', this.value !== 'rechazada');
        })
    );

    document.getElementById('btn-confirmar-rec').addEventListener('click', () => {
        const decision = document.querySelector('input[name="rec-decision"]:checked')?.value;
        const motivo   = document.getElementById('rec-motivo').value.trim();
        const errEl    = document.getElementById('err-rec-motivo');
        if (decision === 'rechazada' && !motivo) {
            document.getElementById('rec-motivo').classList.add('is-invalid');
            errEl.textContent = 'El motivo de rechazo es obligatorio.'; errEl.classList.add('show');
            return;
        }
        document.getElementById('rec-motivo').classList.remove('is-invalid');
        errEl.classList.remove('show');

        const _pacSnap   = (JSON.parse(localStorage.getItem('sr_pacientes') || '[]')).find(p => p.id === ind.paciente_id) || null;
        const _indUsers  = JSON.parse(localStorage.getItem('sr_usuarios') || '[]');
        const _indicador = _indUsers.find(u => u.id === ind.indicado_por) || null;

        const nueva = {
            id: _genId(), indicacion_id: ind.id, examen_id: ind._examen_id,
            laboratorio_id: ind.laboratorio_id, estado: decision,
            motivo_rechazo: decision === 'rechazada' ? motivo : null,
            recibida_por: user.id, fecha_recepcion: new Date().toISOString(),
            snap: {
                fecha_indicacion: ind.fecha_indicacion, tipo_muestra_id: ind.tipo_muestra_id,
                examen_id: ind._examen_id, examenes_ids: [ind._examen_id],
                paciente: _pacSnap ? {
                    nombres: _pacSnap.nombres, apellidos: _pacSnap.apellidos,
                    carnet_identidad: _pacSnap.carnet_identidad, municipio_id: _pacSnap.municipio_id,
                } : null,
                centro_nombre: _indicador?.centro_texto ||
                    getGeoCentros().find(c => c.id === Number(_indicador?.centro_salud_id))?.nombre || null,
                indicador_nombre: _indicador ? `${_indicador.nombres} ${_indicador.apellidos}` : null,
            },
        };
        const recs = _getRecepciones(); recs.push(nueva); _saveRecepciones(recs);
        _recalcIndEstado(ind.id);

        const alertEl = document.getElementById('rec-alert');
        alertEl.className = `alert-custom alert-${decision === 'recibida' ? 'success' : 'warning'}`;
        alertEl.innerHTML = decision === 'recibida'
            ? '<i class="bi bi-check-circle-fill me-2"></i>Muestra recibida correctamente.'
            : '<i class="bi bi-x-circle-fill me-2"></i>Muestra rechazada registrada.';
        alertEl.classList.remove('d-none');
        document.getElementById('btn-confirmar-rec').disabled = true;
        setTimeout(() => renderLaboratorio(user, rootEl), 1600);
    });
}
