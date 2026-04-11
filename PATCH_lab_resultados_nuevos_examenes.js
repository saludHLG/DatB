/* =========================================================
   PATCH para lab_resultados.js
   Añadir ANTES del cierre del archivo (antes del último comentario)
   las siguientes funciones, y reemplazar _despacharResModal y
   _vistaSoloLectura con las versiones actualizadas.
   ========================================================= */

/* ══════════════════════════════════════════════════════════════
   REEMPLAZAR _despacharResModal existente con esta versión
   ══════════════════════════════════════════════════════════════ */
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
        else if (n === 4) _formMfLed(rec, user, body, onSuccess);
        else if (n === 5) _formXpertXDR(rec, user, body, onSuccess);
        else if (n === 6) _formTbLam(rec, user, body, onSuccess);
    } else {
        _vistaSoloLectura(n, rec, body);
    }
}

/* ══════════════════════════════════════════════════════════════
   NUEVO: Formulario MF-LED
   ══════════════════════════════════════════════════════════════ */
function _formMfLed(rec, user, body, onSuccess) {
    const existing = _getResMfLed().find(r => r.recepcion_id === rec.id) || null;
    const hoy = _todayLab();

    const opciones = [
        { value: 'negativo',        label: '0 BAAR en 1 línea — No se observan BAAR',              cls: 'btn-outline-success' },
        { value: 'confirmacion',    label: '1–2 BAAR en 1 línea — Requiere confirmación',           cls: 'btn-outline-warning' },
        { value: 'positivo_escaso', label: '3–24 BAAR en una línea — Positivo escaso (paucibacilar)', cls: 'btn-outline-danger' },
        { value: 'positivo_1',      label: '1–6 BAAR/campo óptico — Positivo +',                    cls: 'btn-outline-danger' },
        { value: 'positivo_2',      label: '7–60 BAAR/campo óptico — Positivo ++',                  cls: 'btn-outline-danger' },
        { value: 'positivo_3',      label: '>60 BAAR/campo óptico — Positivo +++',                  cls: 'btn-outline-danger' },
    ];

    body.innerHTML = `
    ${existing?.lectura === 'confirmacion' ? `
    <div class="step-note mb-3" style="border-left-color:#f0a500">
        <i class="bi bi-exclamation-triangle-fill" style="color:#f0a500"></i>
        <span>Este resultado <strong>requiere confirmación</strong>.
        Se considerará positivo automáticamente si existe un Cultivo o Xpert Ultra positivo
        para la misma indicación.</span>
    </div>` : ''}
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-microscope"></i> Datos del análisis</div>
        <div class="row g-2">
            <div class="col-5">
                <label class="admin-label">N.° de muestra <span class="required">*</span></label>
                <input type="number" id="mfled-nmuestra" class="form-control" min="1" max="99"
                       value="${existing?.numero_muestra ?? ''}">
                <div class="invalid-feedback" id="err-mfled-nmuestra"></div>
            </div>
            <div class="col-7">
                <label class="admin-label">Fecha <span class="required">*</span></label>
                <input type="date" id="mfled-fecha" class="form-control"
                       value="${existing?.fecha || hoy}" max="${hoy}">
                <div class="invalid-feedback" id="err-mfled-fecha"></div>
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-clipboard2-pulse"></i> Lectura</div>
        <div class="d-flex flex-column gap-2" id="mfled-opciones">
            ${opciones.map(op => `
            <label class="d-flex align-items-center gap-2 p-2 border rounded cursor-pointer mfled-opt"
                   style="cursor:pointer;font-size:.88rem;border-color:#dce8f5;transition:background .15s"
                   data-value="${op.value}">
                <input type="radio" name="mfled-lectura" value="${op.value}"
                       ${existing?.lectura === op.value ? 'checked' : ''}
                       style="accent-color:#0b1e3d;flex-shrink:0">
                ${op.label}
            </label>`).join('')}
        </div>
        <div class="invalid-feedback d-block mt-2" id="err-mfled-lectura"></div>
    </div>
    <div id="mfled-alert" class="alert-custom d-none"></div>`;

    /* Highlight seleccionada */
    body.querySelectorAll('.mfled-opt').forEach(lbl => {
        lbl.addEventListener('click', () => {
            body.querySelectorAll('.mfled-opt').forEach(l =>
                l.style.background = '');
            lbl.style.background = '#f0f4fa';
        });
        if (lbl.querySelector('input')?.checked) lbl.style.background = '#f0f4fa';
    });

    _activateModalFooter(existing ? 'Actualizar resultado' : 'Guardar resultado', async () => {
        const nMuestra = parseInt(document.getElementById('mfled-nmuestra').value);
        const fecha    = document.getElementById('mfled-fecha').value;
        const lectura  = document.querySelector('input[name="mfled-lectura"]:checked')?.value;
        let ok = true;

        [['mfled-nmuestra','err-mfled-nmuestra',!nMuestra||nMuestra<1,'Requerido (≥ 1).'],
         ['mfled-fecha','err-mfled-fecha',!fecha,'Fecha requerida.'],
        ].forEach(([id,errId,cond,msg]) => {
            const inp=document.getElementById(id),err=document.getElementById(errId);
            if(cond){inp.classList.add('is-invalid');err.textContent=msg;err.classList.add('show');ok=false;}
            else{inp.classList.remove('is-invalid');err.classList.remove('show');}
        });
        if (!lectura) {
            const errEl = document.getElementById('err-mfled-lectura');
            errEl.textContent = 'Seleccione una lectura.'; errEl.style.display = 'block'; ok = false;
        } else {
            document.getElementById('err-mfled-lectura').style.display = 'none';
        }
        if (!ok) return;

        const arr = _getResMfLed(), idx = arr.findIndex(r => r.recepcion_id === rec.id);
        const entry = {
            id: existing?.id || _genId(), recepcion_id: rec.id,
            numero_muestra: nMuestra, fecha, lectura,
            registrado_por: user.id,
            registrado_en: existing?.registrado_en || new Date().toISOString(),
            ...(existing && { editado_en: new Date().toISOString() })
        };
        if (idx !== -1) arr[idx] = entry; else arr.push(entry);
        _saveResMfLed(arr);

        document.getElementById('lab-modal-save-btn').disabled = true;
        if (typeof sbUpsertRow === 'function')
            await sbUpsertRow('resultados_mf_led', entry).catch(e => console.error('mfled upsert:', e));

        await _recalcIndEstado(rec.indicacion_id);
        _showModalSuccess('mfled-alert');
        setTimeout(() => onSuccess(), 1400);
    });
}

/* ══════════════════════════════════════════════════════════════
   NUEVO: Formulario TB-LAM
   ══════════════════════════════════════════════════════════════ */
function _formTbLam(rec, user, body, onSuccess) {
    const existing = _getResTbLam().find(r => r.recepcion_id === rec.id) || null;
    const hoy = _todayLab();

    body.innerHTML = `
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-droplet-half"></i> Datos del análisis</div>
        <div class="row g-2">
            <div class="col-5">
                <label class="admin-label">N.° de muestra <span class="required">*</span></label>
                <input type="number" id="tblam-nmuestra" class="form-control" min="1" max="99"
                       value="${existing?.numero_muestra ?? ''}">
                <div class="invalid-feedback" id="err-tblam-nmuestra"></div>
            </div>
            <div class="col-7">
                <label class="admin-label">Fecha <span class="required">*</span></label>
                <input type="date" id="tblam-fecha" class="form-control"
                       value="${existing?.fecha || hoy}" max="${hoy}">
                <div class="invalid-feedback" id="err-tblam-fecha"></div>
            </div>
        </div>
    </div>
    <div class="modal-section">
        <div class="modal-section-title"><i class="bi bi-clipboard2-pulse"></i> Resultado</div>
        <div class="res-resultado-group">
            <label class="res-resultado-opt${existing?.resultado === 'NEGATIVO' || !existing ? ' active' : ''}">
                <input type="radio" name="tblam-resultado" value="NEGATIVO"
                       ${existing?.resultado === 'NEGATIVO' || !existing ? 'checked' : ''}>
                <span><i class="bi bi-check-circle text-success me-1"></i> Negativo</span>
            </label>
            <label class="res-resultado-opt${existing?.resultado === 'POSITIVO' ? ' active' : ''}">
                <input type="radio" name="tblam-resultado" value="POSITIVO"
                       ${existing?.resultado === 'POSITIVO' ? 'checked' : ''}>
                <span><i class="bi bi-exclamation-circle text-danger me-1"></i> Positivo</span>
            </label>
        </div>
        <div class="invalid-feedback d-block mt-2" id="err-tblam-resultado"></div>
    </div>
    <div id="tblam-alert" class="alert-custom d-none"></div>`;

    document.querySelectorAll('input[name="tblam-resultado"]').forEach(r =>
        r.addEventListener('change', function () {
            document.querySelectorAll('.res-resultado-opt').forEach(l => l.classList.remove('active'));
            this.closest('.res-resultado-opt').classList.add('active');
        })
    );

    _activateModalFooter(existing ? 'Actualizar resultado' : 'Guardar resultado', async () => {
        const nMuestra  = parseInt(document.getElementById('tblam-nmuestra').value);
        const fecha     = document.getElementById('tblam-fecha').value;
        const resultado = document.querySelector('input[name="tblam-resultado"]:checked')?.value;
        let ok = true;

        [['tblam-nmuestra','err-tblam-nmuestra',!nMuestra||nMuestra<1,'Requerido (≥ 1).'],
         ['tblam-fecha','err-tblam-fecha',!fecha,'Fecha requerida.'],
        ].forEach(([id,errId,cond,msg]) => {
            const inp=document.getElementById(id),err=document.getElementById(errId);
            if(cond){inp.classList.add('is-invalid');err.textContent=msg;err.classList.add('show');ok=false;}
            else{inp.classList.remove('is-invalid');err.classList.remove('show');}
        });
        if (!ok) return;

        const arr = _getResTbLam(), idx = arr.findIndex(r => r.recepcion_id === rec.id);
        const entry = {
            id: existing?.id || _genId(), recepcion_id: rec.id,
            numero_muestra: nMuestra, fecha, resultado,
            registrado_por: user.id,
            registrado_en: existing?.registrado_en || new Date().toISOString(),
        };
        if (idx !== -1) arr[idx] = entry; else arr.push(entry);
        _saveResTbLam(arr);

        document.getElementById('lab-modal-save-btn').disabled = true;
        if (typeof sbUpsertRow === 'function')
            await sbUpsertRow('resultados_tb_lam', entry).catch(e => console.error('tblam upsert:', e));

        await _recalcIndEstado(rec.indicacion_id);
        _showModalSuccess('tblam-alert');
        setTimeout(() => onSuccess(), 1400);
    });
}

/* ══════════════════════════════════════════════════════════════
   REEMPLAZAR _vistaSoloLectura existente con esta versión
   ══════════════════════════════════════════════════════════════ */
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
        body.innerHTML = _grid([
            ['N.° muestra',     res.numero_muestra],
            ['Fecha siembra',   _fmtDate(res.fecha_cultivo)],
            ['Fecha resultado', _fmtDate(res.fecha_resultado)],
            ['Resultado',       `<span class="res-cod ${resCls}">${resLbl}</span>`],
            ['Antígeno MTP-94', { no_realizado:'No realizado', positivo:'Positivo', negativo:'Negativo' }[res.antigeno_mtp94]||'—'],
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

    } else if (n === 4) {
        const res = _getResMfLed().find(r => r.recepcion_id === rec.id);
        if (!res) { body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-hourglass"></i><p>Resultado pendiente.</p></div>`; return; }
        const info = _MFLED_LECTURAS[res.lectura] || { label: res.lectura, cls: 'res-contam' };
        const esConfirmado = res.lectura === 'confirmacion' ? _mfLedIsConfirmed(rec.indicacion_id) : null;
        let lbl = `<span class="res-cod ${info.cls}">${info.label}</span>`;
        if (res.lectura === 'confirmacion') {
            lbl += esConfirmado
                ? `<span class="ms-2 res-cod res-pos" style="font-size:.78rem">Confirmado positivo</span>`
                : `<span class="ms-2 res-cod res-estudio" style="font-size:.78rem">No confirmado aún</span>`;
        }
        body.innerHTML = _grid([
            ['N.° muestra', res.numero_muestra],
            ['Fecha',       _fmtDate(res.fecha)],
            ['Lectura',     lbl],
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

    } else if (n === 6) {
        const res = _getResTbLam().find(r => r.recepcion_id === rec.id);
        if (!res) { body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-hourglass"></i><p>Resultado pendiente.</p></div>`; return; }
        body.innerHTML = _grid([
            ['N.° muestra', res.numero_muestra],
            ['Fecha',       _fmtDate(res.fecha)],
            ['Resultado',   `<span class="res-cod ${res.resultado === 'POSITIVO' ? 'res-pos' : 'res-neg'}">${res.resultado}</span>`],
        ]);

    } else {
        body.innerHTML = `<div class="lab-prox-notice"><i class="bi bi-tools"></i><p>Disponible en próxima versión.</p></div>`;
    }
}
