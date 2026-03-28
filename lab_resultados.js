/* =========================================================
   lab_resultados.js — Modal de resultados, formularios por
   tipo de examen y vista de solo lectura.
   Sin localStorage. Requiere: laboratorio_core.js
   ========================================================= */

/* ══════════════════════════════════════════════════════════════
   MODAL DE RESULTADOS
   ══════════════════════════════════════════════════════════════ */

function _ensureResultModal() {
    if (document.getElementById('lab-result-modal'))
        return document.getElementById('lab-result-modal');

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id        = 'lab-result-modal';
    modal.tabIndex  = -1;
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:540px">
        <div class="modal-content" style="border-radius:14px;border:none;color:#0b1e3d;background:#fff">
            <div class="modal-header" style="background:#f8fbff;border-bottom:1.5px solid #dce8f5;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:.85rem">
                    <div id="lab-modal-avatar"
                         style="width:3rem;height:3rem;border-radius:50%;background:#0b1e3d;color:#00c6b8;
                                font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:-.02em;
                                display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
                    <div>
                        <h5 class="modal-title mb-0" id="lab-modal-title"
                            style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#0b1e3d"></h5>
                        <span id="lab-modal-ci"
                              style="font-family:'IBM Plex Mono',monospace;font-size:.75rem;color:#8fa3bf;display:block;margin:.15rem 0"></span>
                        <span id="lab-modal-badge"
                              style="font-family:'IBM Plex Mono',monospace;font-size:.7rem;background:#eef3fb;color:#122952;padding:.15rem .5rem;border-radius:5px"></span>
                    </div>
                </div>
                <button type="button" class="modal-close-btn" data-bs-dismiss="modal"
                        style="background:none;border:none;color:#8fa3bf;font-size:1.1rem;cursor:pointer;padding:.25rem;line-height:1">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div id="lab-modal-tabs-wrap"
                 style="display:none;background:#f8fbff;border-bottom:1.5px solid #dce8f5;padding:.55rem 1.25rem .45rem">
                <div id="lab-modal-tabs" class="lab-tabs" style="margin-bottom:0"></div>
            </div>
            <div class="modal-body" id="lab-modal-body"
                 style="padding:1.1rem 1.25rem;color:#0b1e3d;background:#fff"></div>
            <div id="lab-modal-footer"
                 style="display:none;background:#f8fbff;border-top:1.5px solid #dce8f5;
                        padding:.85rem 1.25rem;align-items:center;justify-content:flex-end;gap:.5rem">
                <button type="button" data-bs-dismiss="modal"
                        style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;
                               background:transparent;color:#122952;border:1.5px solid #dce8f5;
                               border-radius:8px;font-size:.875rem;cursor:pointer;font-family:inherit">
                    <i class="bi bi-x-lg"></i> Cancelar
                </button>
                <button type="button" id="lab-modal-save-btn"
                        style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;
                               background:#0b1e3d;color:#fff;border:none;border-radius:8px;
                               font-size:.875rem;font-weight:600;cursor:pointer;font-family:inherit">
                    <i class="bi bi-floppy"></i> Guardar
                </button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modal);

    if (!document.getElementById('lab-modal-styles')) {
        const st = document.createElement('style');
        st.id = 'lab-modal-styles';
        st.textContent = `
        #lab-result-modal .modal-body,
        #lab-result-modal .modal-body * { color: #0b1e3d; }
        #lab-result-modal .modal-section-title { font-family:'Syne',sans-serif; font-size:.9rem; font-weight:700; color:#0b1e3d; margin-bottom:.75rem; display:flex; align-items:center; gap:.4rem; }
        #lab-result-modal .admin-label { font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#122952; margin-bottom:.3rem; display:block; }
        #lab-result-modal .modal-section { margin-bottom:1.25rem; }
        #lab-result-modal .modal-section-sub { font-size:.75rem; font-weight:400; color:#8fa3bf; margin-left:.25rem; }
        #lab-result-modal .modal-hint { font-size:.78rem; color:#8fa3bf; margin:.35rem 0 0; }
        #lab-result-modal .form-control,
        #lab-result-modal .form-select { color:#0b1e3d !important; background:#fff !important; border-color:#dce8f5 !important; }
        #lab-result-modal .form-control:focus,
        #lab-result-modal .form-select:focus { border-color:#00c6b8 !important; box-shadow:0 0 0 3px rgba(0,198,184,.15) !important; }
        #lab-result-modal .invalid-feedback { color:#e0435a; font-size:.78rem; }
        #lab-result-modal .invalid-feedback.show { display:block; }
        #lab-result-modal .required { color:#e0435a; }
        #lab-result-modal .step-note { background:#f0f9ff; border-left:3px solid #00c6b8; border-radius:0 8px 8px 0; padding:.65rem 1rem; font-size:.85rem; color:#0b1e3d; display:flex; align-items:flex-start; gap:.55rem; }
        #lab-result-modal .step-note i { color:#00c6b8; flex-shrink:0; }
        #lab-result-modal .ri-label { font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#8fa3bf; margin-bottom:.2rem; }
        #lab-result-modal .ri-val { color:#0b1e3d; font-size:.9rem; font-weight:500; }
        #lab-result-modal .res-ro-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem 1.25rem; margin-top:.75rem; }
        #lab-result-modal .alert-custom.alert-success { background:#e6faf4; color:#007a52; border:1px solid rgba(0,184,122,.2); padding:.65rem .9rem; border-radius:8px; font-size:.85rem; }
        #lab-result-modal .res-resultado-opt { display:inline-flex; align-items:center; gap:.45rem; padding:.45rem .9rem; border:1.5px solid #dce8f5; border-radius:8px; cursor:pointer; font-size:.84rem; font-weight:500; color:#0b1e3d; transition:border-color .15s,background .15s; user-select:none; }
        #lab-result-modal .res-resultado-opt.active,
        #lab-result-modal .res-resultado-opt:has(input:checked) { border-color:#0369a1; background:#e0f2fe; }
        #lab-result-modal .res-resultado-opt input { display:none; }
        #lab-result-modal .lab-prox-notice { display:flex; flex-direction:column; align-items:center; gap:.75rem; padding:2.5rem 1rem; color:#8fa3bf; font-size:.9rem; text-align:center; }
        #lab-result-modal .lab-prox-notice i { font-size:2rem; opacity:.5; }
        `;
        document.head.appendChild(st);
    }

    return modal;
}

function _setModalHeader(pacNom, pacCI, labNom, exNom, esEdicion) {
    const initials = pacNom.split(',').map(s => s.trim()[0] || '').slice(0, 2).join('').toUpperCase() || '??';
    document.getElementById('lab-modal-avatar').textContent = initials;
    document.getElementById('lab-modal-title').textContent  = pacNom || '—';
    document.getElementById('lab-modal-ci').textContent     =
        [pacCI ? `CI: ${pacCI}` : '', labNom].filter(Boolean).join('  ·  ');
    const badge = document.getElementById('lab-modal-badge');
    badge.textContent        = exNom;
    badge.style.background   = esEdicion ? 'rgba(0,198,184,.15)' : '#eef3fb';
    badge.style.color        = esEdicion ? 'var(--a-cyan,#00c6b8)' : 'var(--a-navy-mid,#122952)';
}

function _activateModalFooter(label, saveFn) {
    const footer = document.getElementById('lab-modal-footer');
    const btn    = document.getElementById('lab-modal-save-btn');
    btn.innerHTML = `<i class="bi bi-floppy"></i> ${label}`;
    btn.disabled  = false;
    btn.onclick   = saveFn;
    footer.style.display = 'flex';
}

function _showModalSuccess(alertId) {
    const el = document.getElementById(alertId);
    if (!el) return;
    el.className = 'alert-custom alert-success';
    el.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Resultado guardado correctamente.';
    el.classList.remove('d-none');
}

/* ══════════════════════════════════════════════════════════════
   APERTURA Y ENRUTADO DEL MODAL
   ══════════════════════════════════════════════════════════════ */

function _abrirModalResultados(rec, ind, user, rootEl, emitirIds, editarIds) {
    /* ── Buscar paciente en _store (sin localStorage) ── */
    const pac     = (window._store.pacientes || []).find(p => p.id === ind.paciente_id) || null;
    const snap    = rec.snap || {};
    const pacSnap = snap.paciente || null;
    const pacNom  = pac ? `${pac.apellidos}, ${pac.nombres}` : pacSnap ? `${pacSnap.apellidos}, ${pacSnap.nombres}` : '—';
    const pacCI   = pac?.carnet_identidad || pacSnap?.carnet_identidad || '';
    const exId    = rec.examen_id || (ind.examenes_ids || [])[0];
    const exNom   = _examenNombre(exId)?.nombre || '—';
    const labNom  = _labNombre(rec.laboratorio_id);
    const puedeEmitir  = (emitirIds || []).includes(rec.laboratorio_id);
    const puedeEditar  = (editarIds || []).includes(rec.laboratorio_id);
    const puedeEdicion = puedeEmitir || puedeEditar;

    const modalEl = _ensureResultModal();
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);

    _setModalHeader(pacNom, pacCI, labNom, exNom, puedeEdicion);
    document.getElementById('lab-modal-title').textContent =
        puedeEdicion ? 'Registrar / editar resultado' : 'Resultado del examen';
    document.getElementById('lab-modal-footer').style.display = 'none';

    const examenes = exId ? [_examenNombre(exId)] : [];
    const tabsWrap = document.getElementById('lab-modal-tabs-wrap');
    const tabsEl   = document.getElementById('lab-modal-tabs');

    if (examenes.length <= 1) {
        tabsWrap.style.display = 'none';
    } else {
        tabsWrap.style.display = '';
        tabsEl.innerHTML = examenes.map((ex, i) => `
            <button class="lab-tab-btn${i === 0 ? ' active' : ''} res-modal-tab" data-ex-id="${ex.id}">
                <span class="exam-tag">${ex.codigo}</span> ${ex.nombre}
                ${!_SOPORTADOS.has(Number(ex.id)) ? '<span class="lab-badge-prox">Prox.</span>' : ''}
            </button>`).join('');
        tabsEl.querySelectorAll('.res-modal-tab').forEach(btn =>
            btn.addEventListener('click', function () {
                tabsEl.querySelectorAll('.res-modal-tab').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                _despacharResModal(parseInt(this.dataset.exId), rec, user, rootEl, bsModal, puedeEdicion);
            })
        );
    }

    _despacharResModal(examenes[0]?.id, rec, user, rootEl, bsModal, puedeEdicion);
    bsModal.show();
}

function _despacharResModal(exId, rec, user, rootEl, bsModal, puedeEdicion) {
    const body = document.getElementById('lab-modal-body');
    if (!body) return;
    const n         = Number(exId);
    const onSuccess = () => { bsModal.hide(); renderLaboratorio(user, rootEl); };

    document.getElementById('lab-modal-footer').style.display = 'none';

    if (!_SOPORTADOS.has(n)) {
        body.innerHTML = `<div class="lab-prox-notice">
            <i class="bi bi-tools"></i>
            <p>El registro de resultados para este examen estará disponible en una próxima versión.</p>
        </div>`;
        return;
    }

    if (puedeEdicion) {
        if      (n === 1) _formBaciloscopia(rec, user, body, onSuccess);
        else if (n === 2) _formCultivo(rec, user, body, onSuccess);
        else if (n === 3) _formXpertUltra(rec, user, body, onSuccess);
        else if (n === 5) _formXpertXDR(rec, user, body, onSuccess);
    } else {
        _vistaSoloLectura(n, rec, body);
    }
}

/* ══════════════════════════════════════════════════════════════
   FORMULARIOS DE RESULTADOS
   ══════════════════════════════════════════════════════════════ */

function _formBaciloscopia(rec, user, body, onSuccess) {
    const existing = _getResBaci().find(r => r.recepcion_id === rec.id) || null;
    const codOpts  = Array.from({ length: 10 }, (_, i) =>
        `<option value="${i}" ${existing?.codificacion === i ? 'selected' : ''}>${i}${i === 0 ? ' — Negativo' : ''}</option>`).join('');

    body.innerHTML = `
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-droplet-half"></i> Datos del análisis</div>
        <div class="row g-3">
            <div class="col-5">
                <label class="admin-label">N.° de muestra <span class="required">*</span></label>
                <input type="number" id="baci-nmuestra" class="form-control" min="1" max="99"
                       value="${existing?.numero_muestra ?? ''}">
                <div class="invalid-feedback" id="err-baci-nmuestra"></div>
            </div>
            <div class="col-7">
                <label class="admin-label">Fecha de análisis <span class="required">*</span></label>
                <input type="date" id="baci-fecha" class="form-control"
                       value="${existing?.fecha_analisis || _todayLab()}" max="${_todayLab()}">
                <div class="invalid-feedback" id="err-baci-fecha"></div>
            </div>
            <div class="col-12">
                <label class="admin-label">Codificación <span class="required">*</span></label>
                <select id="baci-cod" class="form-select admin-select">
                    <option value="">— Seleccione —</option>${codOpts}
                </select>
                <p class="modal-hint">0 = Negativo &nbsp;·&nbsp; 1–9 = Positivo (número de cruces)</p>
                <div class="invalid-feedback" id="err-baci-cod"></div>
            </div>
        </div>
    </div>
    <div id="baci-alert" class="alert-custom d-none"></div>`;

    _activateModalFooter(existing ? 'Actualizar resultado' : 'Guardar resultado', () => {
        const nMuestra = parseInt(document.getElementById('baci-nmuestra').value);
        const fecha    = document.getElementById('baci-fecha').value;
        const cod      = document.getElementById('baci-cod').value;
        let ok = true;
        [['baci-nmuestra', 'err-baci-nmuestra', !nMuestra || nMuestra < 1, 'Requerido (≥ 1).'],
         ['baci-fecha',    'err-baci-fecha',    !fecha,                    'Fecha requerida.'],
         ['baci-cod',      'err-baci-cod',       cod === '',               'Seleccione codificación.'],
        ].forEach(([id, errId, cond, msg]) => {
            const inp = document.getElementById(id), err = document.getElementById(errId);
            if (cond) { inp.classList.add('is-invalid'); err.textContent = msg; err.classList.add('show'); ok = false; }
            else      { inp.classList.remove('is-invalid'); err.classList.remove('show'); }
        });
        if (!ok) return;
        const arr = _getResBaci(), idx = arr.findIndex(r => r.recepcion_id === rec.id);
        const entry = {
            id: existing?.id || _genId(), recepcion_id: rec.id,
            numero_muestra: nMuestra, fecha_analisis: fecha, codificacion: parseInt(cod),
            registrado_por: user.id, registrado_en: existing?.registrado_en || new Date().toISOString(),
            editado_en: existing ? new Date().toISOString() : undefined
        };
        if (idx !== -1) arr[idx] = entry; else arr.push(entry);
        _saveResBaci(arr);
        if (typeof sbUpsertRow === 'function') sbUpsertRow('resultados_baciloscopia', entry).catch(console.error);
        _recalcIndEstado(rec.indicacion_id);
        _showModalSuccess('baci-alert');
        document.getElementById('lab-modal-save-btn').disabled = true;
        setTimeout(() => onSuccess(), 1400);
    });
}

function _formCultivo(rec, user, body, onSuccess) {
    const existing = _getResCultivo().find(r => r.recepcion_id === rec.id) || null;
    const micros   = _getMicroCat();
    const hoy      = _todayLab();
    const resDef   = existing?.resultado || 'en_estudio';
    const fCult    = existing?.fecha_cultivo || hoy;
    const fRes     = existing?.fecha_resultado || _addDays(fCult, 56);
    const showMicro  = existing && /^[1-9]$/.test(existing.resultado);
    const showAntigen = showMicro;

    const codOpts   = Array.from({ length: 10 }, (_, i) =>
        `<option value="${i}" ${resDef === String(i) ? 'selected' : ''}>${i}${i === 0 ? ' — Sin crecimiento' : ''}</option>`).join('');
    const microOpts = micros.map(m =>
        `<option value="${m.id}" ${existing?.microorganismo_id === m.id ? 'selected' : ''}>${m.nombre}</option>`).join('');

    body.innerHTML = `
    ${!existing || existing.resultado === 'en_estudio' ? `
    <div class="step-note mb-3">
        <i class="bi bi-info-circle-fill"></i>
        El resultado queda <strong>En estudio</strong> hasta registrar un resultado definitivo.
    </div>` : ''}
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-flask"></i> Datos del cultivo</div>
        <div class="row g-2">
            <div class="col-4">
                <label class="admin-label">N.° muestra <span class="required">*</span></label>
                <input type="number" id="cult-nmuestra" class="form-control" min="1" max="99"
                       value="${existing?.numero_muestra ?? ''}">
                <div class="invalid-feedback" id="err-cult-nmuestra"></div>
            </div>
            <div class="col-4">
                <label class="admin-label">Siembra <span class="required">*</span></label>
                <input type="date" id="cult-fecha-cult" class="form-control" value="${fCult}" max="${hoy}">
                <div class="invalid-feedback" id="err-cult-fecha-cult"></div>
            </div>
            <div class="col-4">
                <label class="admin-label">Resultado <span class="modal-section-sub">(+56 d.)</span></label>
                <input type="date" id="cult-fecha-res" class="form-control" value="${fRes}">
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-clipboard2-pulse"></i> Resultado</div>
        <div class="row g-2">
            <div class="col-12">
                <label class="admin-label">Tipo <span class="required">*</span></label>
                <div class="res-resultado-group">
                    <label class="res-resultado-opt${resDef === 'en_estudio' ? ' active' : ''}">
                        <input type="radio" name="cult-res" value="en_estudio" ${resDef === 'en_estudio' ? 'checked' : ''}>
                        <span><i class="bi bi-hourglass-split"></i> En estudio</span>
                    </label>
                    <label class="res-resultado-opt${resDef === 'contaminado' ? ' active' : ''}">
                        <input type="radio" name="cult-res" value="contaminado" ${resDef === 'contaminado' ? 'checked' : ''}>
                        <span><i class="bi bi-biohazard"></i> Contaminado</span>
                    </label>
                    <label class="res-resultado-opt${/^[0-9]$/.test(resDef) ? ' active' : ''}">
                        <input type="radio" name="cult-res" value="codificacion" ${/^[0-9]$/.test(resDef) ? 'checked' : ''}>
                        <span><i class="bi bi-123"></i> Codificación</span>
                    </label>
                </div>
            </div>
            <div class="col-4 ${/^[0-9]$/.test(resDef) ? '' : 'd-none'}" id="block-codif">
                <label class="admin-label">Código <span class="required">*</span></label>
                <select id="cult-cod" class="form-select admin-select">${codOpts}</select>
                <div class="invalid-feedback" id="err-cult-cod"></div>
            </div>
            <div class="col-4 ${showAntigen ? '' : 'd-none'}" id="block-antigeno">
                <label class="admin-label">Antígeno MTP-94</label>
                <select id="cult-antigeno" class="form-select admin-select">
                    <option value="no_realizado" ${(existing?.antigeno_mtp94 || 'no_realizado') === 'no_realizado' ? 'selected' : ''}>No realizado</option>
                    <option value="positivo"     ${existing?.antigeno_mtp94 === 'positivo' ? 'selected' : ''}>Positivo</option>
                    <option value="negativo"     ${existing?.antigeno_mtp94 === 'negativo' ? 'selected' : ''}>Negativo</option>
                </select>
            </div>
            <div class="col-4 ${showMicro ? '' : 'd-none'}" id="block-micro">
                <label class="admin-label">Microorganismo <span class="required">*</span></label>
                <select id="cult-micro" class="form-select admin-select">
                    <option value="">— Seleccione —</option>${microOpts}
                </select>
                <div class="invalid-feedback" id="err-cult-micro"></div>
            </div>
        </div>
    </div>
    <div id="cult-alert" class="alert-custom d-none"></div>`;

    document.getElementById('cult-fecha-cult').addEventListener('change', function () {
        const fr = document.getElementById('cult-fecha-res');
        if (!fr.dataset.manual) fr.value = _addDays(this.value, 56);
    });
    document.getElementById('cult-fecha-res').addEventListener('change', function () { this.dataset.manual = '1'; });
    document.querySelectorAll('input[name="cult-res"]').forEach(r =>
        r.addEventListener('change', function () {
            document.querySelectorAll('.res-resultado-opt').forEach(l => l.classList.remove('active'));
            this.closest('.res-resultado-opt').classList.add('active');
            const esCodif  = this.value === 'codificacion';
            document.getElementById('block-codif').classList.toggle('d-none', !esCodif);
            const cod = parseInt(document.getElementById('cult-cod')?.value || '0');
            const hasGrowth = esCodif && cod > 0;
            document.getElementById('block-antigeno').classList.toggle('d-none', !hasGrowth);
            document.getElementById('block-micro').classList.toggle('d-none', !hasGrowth);
        })
    );
    document.getElementById('cult-cod')?.addEventListener('change', function () {
        const pos = parseInt(this.value) > 0;
        document.getElementById('block-antigeno').classList.toggle('d-none', !pos);
        document.getElementById('block-micro').classList.toggle('d-none', !pos);
    });

    _activateModalFooter(existing ? 'Actualizar resultado' : 'Guardar resultado',
        () => _guardarCultivo(rec, user, existing, onSuccess));
}

function _guardarCultivo(rec, user, existing, onSuccess) {
    const nMuestra = parseInt(document.getElementById('cult-nmuestra').value);
    const fCult    = document.getElementById('cult-fecha-cult').value;
    const fRes     = document.getElementById('cult-fecha-res').value;
    const tipoRes  = document.querySelector('input[name="cult-res"]:checked')?.value;
    const antigeno = document.getElementById('cult-antigeno').value;
    const codVal   = document.getElementById('cult-cod')?.value;
    const microId  = document.getElementById('cult-micro')?.value;
    let ok = true;

    [['cult-nmuestra',   'err-cult-nmuestra',   !nMuestra || nMuestra < 1, 'N.° de muestra requerido.'],
     ['cult-fecha-cult', 'err-cult-fecha-cult', !fCult,                    'Fecha de siembra requerida.'],
    ].forEach(([id, errId, cond, msg]) => {
        const inp = document.getElementById(id), err = document.getElementById(errId);
        if (cond) { inp.classList.add('is-invalid'); err.textContent = msg; err.classList.add('show'); ok = false; }
        else      { inp.classList.remove('is-invalid'); err.classList.remove('show'); }
    });
    if (!tipoRes) ok = false;
    if (tipoRes === 'codificacion' && parseInt(codVal) > 0 && !microId) {
        const errM = document.getElementById('err-cult-micro');
        document.getElementById('cult-micro').classList.add('is-invalid');
        errM.textContent = 'Identifique el microorganismo.'; errM.classList.add('show'); ok = false;
    } else {
        document.getElementById('cult-micro')?.classList.remove('is-invalid');
        document.getElementById('err-cult-micro')?.classList.remove('show');
    }
    if (!ok) return;

    const resultado = tipoRes === 'en_estudio' ? 'en_estudio' : tipoRes === 'contaminado' ? 'contaminado' : codVal;
    const arr = _getResCultivo(), idx = arr.findIndex(r => r.recepcion_id === rec.id);
    const entry = {
        id: existing?.id || _genId(), recepcion_id: rec.id,
        numero_muestra: nMuestra, fecha_cultivo: fCult,
        fecha_resultado: fRes || _addDays(fCult, 56), resultado, antigeno_mtp94: antigeno,
        microorganismo_id: (tipoRes === 'codificacion' && parseInt(codVal) > 0) ? parseInt(microId) : null,
        registrado_por: user.id, registrado_en: existing?.registrado_en || new Date().toISOString(),
        editado_en: existing ? new Date().toISOString() : undefined
    };
    if (idx !== -1) arr[idx] = entry; else arr.push(entry);
    _saveResCultivo(arr);
    if (typeof sbUpsertRow === 'function') sbUpsertRow('resultados_cultivo', entry).catch(console.error);
    _recalcIndEstado(rec.indicacion_id);
    _showModalSuccess('cult-alert');
    document.getElementById('lab-modal-save-btn').disabled = true;
    setTimeout(() => onSuccess(), 1400);
}

function _formXpertUltra(rec, user, body, onSuccess) {
    const existing   = _getResXpertUltra().find(r => r.recepcion_id === rec.id) || null;
    const hoy        = _todayLab();
    const resultados = ['MTB NO DETECTADO', 'MTB DETECTADO', 'ERROR AL CORRER LA PRUEBA', 'RESULTADO INVALIDADO', 'SIN RESULTADO'];
    const adnVals    = ['NO PROCEDE', 'TRAZAS', 'MUY BAJO', 'BAJO', 'MEDIO', 'ALTO'];
    const rifVals    = ['NO PROCEDE', 'RESISTENCIA A RIFAMPICINA NO DETECTADO', 'RESISTENCIA A RIFAMPICINA DETECTADO', 'RESISTENCIA A RIFAMPICINA INDETERMINADO'];
    const errVals    = ['NO ERROR', 'Error 2127', 'Error 2008', 'Error 2037', 'Error 2014', 'Error 4006', 'Error 1001', 'Error 2035', 'Error 4017', 'Error 5007'];
    const sel = (arr, val) => arr.map(v => `<option value="${v}" ${val === v ? 'selected' : ''}>${v}</option>`).join('');

    body.innerHTML = `
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-cpu"></i> Identificación</div>
        <div class="row g-2">
            <div class="col-6">
                <label class="admin-label">N.° muestra <span class="required">*</span></label>
                <input type="number" id="xu-nmuestra" class="form-control" min="1" max="99"
                       value="${existing?.numero_muestra ?? ''}">
                <div class="invalid-feedback" id="err-xu-nmuestra"></div>
            </div>
            <div class="col-6">
                <label class="admin-label">Fecha <span class="required">*</span></label>
                <input type="date" id="xu-fecha" class="form-control"
                       value="${existing?.fecha || hoy}" max="${hoy}">
                <div class="invalid-feedback" id="err-xu-fecha"></div>
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-clipboard2-pulse"></i> Resultado</div>
        <div class="row g-2">
            <div class="col-12">
                <label class="admin-label">Resultado <span class="required">*</span></label>
                <select id="xu-resultado" class="form-select admin-select">
                    <option value="">— Seleccione —</option>${sel(resultados, existing?.resultado || '')}
                </select>
                <div class="invalid-feedback" id="err-xu-resultado"></div>
            </div>
            <div class="col-5">
                <label class="admin-label">ADN</label>
                <select id="xu-adn" class="form-select admin-select">${sel(adnVals, existing?.adn || 'NO PROCEDE')}</select>
                <p class="modal-hint">Solo relevante si MTB DETECTADO.</p>
            </div>
            <div class="col-7">
                <label class="admin-label">Resistencia a rifampicina</label>
                <select id="xu-rifampicina" class="form-select admin-select">${sel(rifVals, existing?.resistencia_rifampicina || 'NO PROCEDE')}</select>
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-tools"></i> Datos técnicos</div>
        <div class="row g-2">
            <div class="col-8">
                <label class="admin-label">Tipo de error</label>
                <select id="xu-error" class="form-select admin-select">${sel(errVals, existing?.tipo_error || 'NO ERROR')}</select>
            </div>
            <div class="col-4">
                <label class="admin-label">Módulo</label>
                <input type="text" id="xu-modulo" class="form-control ctrl-mono"
                       placeholder="Ej: A1, B2…" value="${existing?.modulo || ''}">
            </div>
        </div>
    </div>
    <div id="xu-alert" class="alert-custom d-none"></div>`;

    document.getElementById('xu-resultado').addEventListener('change', function () {
        if (this.value !== 'MTB DETECTADO') {
            document.getElementById('xu-adn').value = 'NO PROCEDE';
            document.getElementById('xu-rifampicina').value = 'NO PROCEDE';
        }
    });

    _activateModalFooter(existing ? 'Actualizar resultado' : 'Guardar resultado', () => {
        const nMuestra  = parseInt(document.getElementById('xu-nmuestra').value);
        const fecha     = document.getElementById('xu-fecha').value;
        const resultado = document.getElementById('xu-resultado').value;
        let ok = true;
        [['xu-nmuestra',  'err-xu-nmuestra',  !nMuestra || nMuestra < 1, 'Requerido (≥ 1).'],
         ['xu-fecha',     'err-xu-fecha',     !fecha,                    'Fecha requerida.'],
         ['xu-resultado', 'err-xu-resultado', !resultado,                'Seleccione un resultado.'],
        ].forEach(([id, errId, cond, msg]) => {
            const inp = document.getElementById(id), err = document.getElementById(errId);
            if (cond) { inp.classList.add('is-invalid'); err.textContent = msg; err.classList.add('show'); ok = false; }
            else      { inp.classList.remove('is-invalid'); err.classList.remove('show'); }
        });
        if (!ok) return;
        const arr = _getResXpertUltra(), idx = arr.findIndex(r => r.recepcion_id === rec.id);
        const entry = {
            id: existing?.id || _genId(), recepcion_id: rec.id,
            numero_muestra: nMuestra, fecha, resultado,
            adn:                     document.getElementById('xu-adn').value,
            resistencia_rifampicina: document.getElementById('xu-rifampicina').value,
            tipo_error:              document.getElementById('xu-error').value,
            modulo:                  document.getElementById('xu-modulo').value.trim(),
            registrado_por: user.id, registrado_en: existing?.registrado_en || new Date().toISOString(),
            editado_en: existing ? new Date().toISOString() : undefined
        };
        if (idx !== -1) arr[idx] = entry; else arr.push(entry);
        _saveResXpertUltra(arr);
        if (typeof sbUpsertRow === 'function') sbUpsertRow('resultados_xpert_ultra', entry).catch(console.error);
        _recalcIndEstado(rec.indicacion_id);
        _showModalSuccess('xu-alert');
        document.getElementById('lab-modal-save-btn').disabled = true;
        setTimeout(() => onSuccess(), 1400);
    });
}

function _formXpertXDR(rec, user, body, onSuccess) {
    const existing   = _getResXpertXDR().find(r => r.recepcion_id === rec.id) || null;
    const hoy        = _todayLab();
    const resultados = ['MTB NO DETECTADO', 'MTB DETECTADO', 'ERROR AL CORRER LA PRUEBA', 'RESULTADO INVALIDADO', 'SIN RESULTADO'];
    const isoVals    = ['NO DETECTADO', 'DETECTADO BAJO', 'DETECTADO INDETERMINADO'];
    const floqVals   = ['NO DETECTADO', 'DETECTADO BAJO', 'DETECTADO', 'INDETERMINADO'];
    const amiVals    = ['NO DETECTADO', 'DETECTADO', 'INDETERMINADO'];
    const kanVals    = ['NO DETECTADO', 'DETECTADO', 'INDETERMINADO'];
    const capVals    = ['NO DETECTADO', 'DETECTADO', 'INDETERMINADO'];
    const etioVals   = ['NO DETECTADO', 'DETECTADO'];
    const errVals    = ['NO ERROR', 'Error 2127', 'Error 2008', 'Error 2037', 'Error 2014', 'Error 4006', 'Error 1001', 'Error 2035', 'Error 4017', 'Error 5007'];
    const sel = (arr, val, id) =>
        `<select id="${id}" class="form-select admin-select">${arr.map(v => `<option value="${v}" ${val === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`;

    body.innerHTML = `
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-cpu"></i> Identificación</div>
        <div class="row g-2">
            <div class="col-6">
                <label class="admin-label">N.° muestra <span class="required">*</span></label>
                <input type="number" id="xdr-nmuestra" class="form-control" min="1" max="99"
                       value="${existing?.numero_muestra ?? ''}">
                <div class="invalid-feedback" id="err-xdr-nmuestra"></div>
            </div>
            <div class="col-6">
                <label class="admin-label">Fecha <span class="required">*</span></label>
                <input type="date" id="xdr-fecha" class="form-control"
                       value="${existing?.fecha || hoy}" max="${hoy}">
                <div class="invalid-feedback" id="err-xdr-fecha"></div>
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-clipboard2-pulse"></i> Resultado</div>
        <div class="row g-2">
            <div class="col-12">
                <label class="admin-label">Resultado <span class="required">*</span></label>
                <select id="xdr-resultado" class="form-select admin-select">
                    <option value="">— Seleccione —</option>
                    ${resultados.map(v => `<option value="${v}" ${(existing?.resultado || '') === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                <div class="invalid-feedback" id="err-xdr-resultado"></div>
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title">
            <i class="bi bi-shield-exclamation"></i> Perfiles de resistencia
            <span class="modal-section-sub">Solo cuando MTB DETECTADO</span>
        </div>
        <div class="row g-2">
            <div class="col-6"><label class="admin-label">Isoniazida</label>    ${sel(isoVals,  existing?.resistencia_isoniazida     || 'NO DETECTADO', 'xdr-iso')}</div>
            <div class="col-6"><label class="admin-label">Fluorquinolona</label>${sel(floqVals, existing?.resistencia_fluorquinolona  || 'NO DETECTADO', 'xdr-floq')}</div>
            <div class="col-6"><label class="admin-label">Amikacina</label>     ${sel(amiVals,  existing?.resistencia_amikacina       || 'NO DETECTADO', 'xdr-ami')}</div>
            <div class="col-6"><label class="admin-label">Kanamicina</label>    ${sel(kanVals,  existing?.resistencia_kanamicina       || 'NO DETECTADO', 'xdr-kan')}</div>
            <div class="col-6"><label class="admin-label">Capreomicina</label>  ${sel(capVals,  existing?.resistencia_capreomicina     || 'NO DETECTADO', 'xdr-cap')}</div>
            <div class="col-6"><label class="admin-label">Etionamida</label>    ${sel(etioVals, existing?.resistencia_etionamida       || 'NO DETECTADO', 'xdr-etio')}</div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-tools"></i> Datos técnicos</div>
        <div class="row g-2">
            <div class="col-8"><label class="admin-label">Tipo de error</label>${sel(errVals, existing?.tipo_error || 'NO ERROR', 'xdr-error')}</div>
            <div class="col-4">
                <label class="admin-label">Módulo</label>
                <input type="text" id="xdr-modulo" class="form-control ctrl-mono"
                       placeholder="Ej: A1, B2…" value="${existing?.modulo || ''}">
            </div>
        </div>
    </div>
    <div id="xdr-alert" class="alert-custom d-none"></div>`;

    document.getElementById('xdr-resultado').addEventListener('change', function () {
        if (this.value !== 'MTB DETECTADO') {
            ['xdr-iso', 'xdr-floq', 'xdr-ami', 'xdr-kan', 'xdr-cap'].forEach(id => {
                const s = document.getElementById(id); if (s) s.value = 'NO DETECTADO';
            });
            const etio = document.getElementById('xdr-etio'); if (etio) etio.value = 'NO DETECTADO';
        }
    });

    _activateModalFooter(existing ? 'Actualizar resultado' : 'Guardar resultado', () => {
        const nMuestra  = parseInt(document.getElementById('xdr-nmuestra').value);
        const fecha     = document.getElementById('xdr-fecha').value;
        const resultado = document.getElementById('xdr-resultado').value;
        let ok = true;
        [['xdr-nmuestra',  'err-xdr-nmuestra',  !nMuestra || nMuestra < 1, 'Requerido (≥ 1).'],
         ['xdr-fecha',     'err-xdr-fecha',     !fecha,                    'Fecha requerida.'],
         ['xdr-resultado', 'err-xdr-resultado', !resultado,                'Seleccione un resultado.'],
        ].forEach(([id, errId, cond, msg]) => {
            const inp = document.getElementById(id), err = document.getElementById(errId);
            if (cond) { inp.classList.add('is-invalid'); err.textContent = msg; err.classList.add('show'); ok = false; }
            else      { inp.classList.remove('is-invalid'); err.classList.remove('show'); }
        });
        if (!ok) return;
        const get = id => document.getElementById(id)?.value || '';
        const arr = _getResXpertXDR(), idx = arr.findIndex(r => r.recepcion_id === rec.id);
        const entry = {
            id: existing?.id || _genId(), recepcion_id: rec.id,
            numero_muestra: nMuestra, fecha, resultado,
            resistencia_isoniazida:     get('xdr-iso'),
            resistencia_fluorquinolona: get('xdr-floq'),
            resistencia_amikacina:      get('xdr-ami'),
            resistencia_kanamicina:     get('xdr-kan'),
            resistencia_capreomicina:   get('xdr-cap'),
            resistencia_etionamida:     get('xdr-etio'),
            tipo_error: get('xdr-error'),
            modulo: document.getElementById('xdr-modulo').value.trim(),
            registrado_por: user.id, registrado_en: existing?.registrado_en || new Date().toISOString(),
            editado_en: existing ? new Date().toISOString() : undefined
        };
        if (idx !== -1) arr[idx] = entry; else arr.push(entry);
        _saveResXpertXDR(arr);
        if (typeof sbUpsertRow === 'function') sbUpsertRow('resultados_xpert_xdr', entry).catch(console.error);
        _recalcIndEstado(rec.indicacion_id);
        _showModalSuccess('xdr-alert');
        document.getElementById('lab-modal-save-btn').disabled = true;
        setTimeout(() => onSuccess(), 1400);
    });
}

/* ── Vista solo lectura ───────────────────────────────────── */
function _vistaSoloLectura(exId, rec, body) {
    const n = Number(exId);
    const _grid = items => `<div class="res-ro-grid">${items.map(([l, v]) =>
        `<div class="res-ro-item"><span class="ri-label">${l}</span><span class="ri-val">${v}</span></div>`
    ).join('')}</div>`;

    if (n === 1) {
        const res = _getResBaci().find(r => r.recepcion_id === rec.id);
        body.innerHTML = res ? _grid([
            ['N.° muestra',    res.numero_muestra],
            ['Fecha análisis', _fmtDate(res.fecha_analisis)],
            ['Codificación',   `<span class="res-cod ${res.codificacion === 0 ? 'res-neg' : 'res-pos'}">${res.codificacion} — ${res.codificacion === 0 ? 'Negativo' : 'Positivo'}</span>`],
        ]) : `<div class="lab-prox-notice"><i class="bi bi-hourglass"></i><p>Resultado pendiente.</p></div>`;

    } else if (n === 2) {
        const res = _getResCultivo().find(r => r.recepcion_id === rec.id);
        if (!res) { body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-hourglass"></i><p>Resultado pendiente.</p></div>`; return; }
        const micNom = res.microorganismo_id ? _getMicroCat().find(m => m.id === res.microorganismo_id)?.nombre || '—' : null;
        const resCls = res.resultado === 'en_estudio' ? 'res-estudio' : res.resultado === 'contaminado' ? 'res-contam' : res.resultado === '0' ? 'res-neg' : 'res-pos';
        const resLbl = res.resultado === 'en_estudio' ? 'En estudio' : res.resultado === 'contaminado' ? 'Contaminado' : `${res.resultado} (${res.resultado === '0' ? 'Sin crecimiento' : 'Positivo'})`;
        const antLbl = { no_realizado: 'No realizado', positivo: 'Positivo', negativo: 'Negativo' }[res.antigeno_mtp94] || '—';
        body.innerHTML = _grid([
            ['N.° muestra',     res.numero_muestra],
            ['Fecha siembra',   _fmtDate(res.fecha_cultivo)],
            ['Fecha resultado',  _fmtDate(res.fecha_resultado)],
            ['Resultado',       `<span class="res-cod ${resCls}">${resLbl}</span>`],
            ['Antígeno MTP-94', antLbl],
            ...(micNom ? [['Microorganismo', micNom]] : []),
        ]);

    } else if (n === 3) {
        const res = _getResXpertUltra().find(r => r.recepcion_id === rec.id);
        if (!res) { body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-hourglass"></i><p>Resultado pendiente.</p></div>`; return; }
        body.innerHTML = _grid([
            ['N.° muestra',     res.numero_muestra],
            ['Fecha',           _fmtDate(res.fecha)],
            ['Resultado',       `<span class="res-cod ${_resultadoXpertCls(res.resultado)}">${res.resultado}</span>`],
            ['ADN',             res.adn],
            ['Resistencia RIF', res.resistencia_rifampicina],
            ['Error',           res.tipo_error],
            ...(res.modulo ? [['Módulo', res.modulo]] : []),
        ]);

    } else if (n === 5) {
        const res = _getResXpertXDR().find(r => r.recepcion_id === rec.id);
        if (!res) { body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-hourglass"></i><p>Resultado pendiente.</p></div>`; return; }
        body.innerHTML = _grid([
            ['N.° muestra',    res.numero_muestra],
            ['Fecha',          _fmtDate(res.fecha)],
            ['Resultado',      `<span class="res-cod ${_resultadoXpertCls(res.resultado)}">${res.resultado}</span>`],
            ['Isoniazida',     res.resistencia_isoniazida],
            ['Fluorquinolona', res.resistencia_fluorquinolona],
            ['Amikacina',      res.resistencia_amikacina],
            ['Kanamicina',     res.resistencia_kanamicina],
            ['Capreomicina',   res.resistencia_capreomicina],
            ['Etionamida',     res.resistencia_etionamida],
            ['Error',          res.tipo_error],
            ...(res.modulo ? [['Módulo', res.modulo]] : []),
        ]);

    } else {
        body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-tools"></i><p>Disponible en próxima versión.</p></div>`;
    }
}
