/* =========================================================
   lab_pendientes.js — Tab "Pendientes" del módulo de Lab.
   Recepción y rechazo inline en cada card, sin navegación.
   Sin localStorage. Requiere: laboratorio_core.js
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
        const pacs = window._store.pacientes || [];
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
        _bindCardActions(wrap, filtered, user, rootEl, _renderList, q);
    };

    document.getElementById('lab-pend-search').addEventListener('input', function () {
        _renderList(this.value.trim());
    });
    _renderList('');
}

/* ── HTML de cada card ───────────────────────────────────── */
function _cardPendiente(ind, emitirIds) {
    const pac    = (window._store.pacientes || []).find(p => p.id === ind.paciente_id);
    const centro = _centroNombreDeIndicador(ind.indicado_por);
    const ex     = _examenNombre(ind._examen_id);
    const medNom = ind.medico ? `Dr./Dra. ${ind.medico.nombres} ${ind.medico.apellidos}` : '—';
    const puedeRecepcionar = emitirIds && emitirIds.includes(ind.laboratorio_id);
    const uid = `${ind.id}_${ind._examen_id}`;   /* identificador único por card */

    return `
    <div class="lab-card lab-pend-card" id="pcard-${uid}"
         data-id="${ind.id}" data-ex-id="${ind._examen_id}">

        <!-- ── Cabecera ── -->
        <div class="lab-card-main" style="flex:1;min-width:0">
            <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                <div style="min-width:0">
                    <span class="lab-pac-name">${pac ? pac.apellidos + ', ' + pac.nombres : '—'}</span>
                    <span class="lab-pac-ci">CI: ${pac?.carnet_identidad || '—'}</span>
                </div>
                <span class="exam-tag" style="flex-shrink:0">${ex.codigo}</span>
            </div>
            <div class="lab-card-meta mt-1">
                <span><i class="bi bi-calendar3"></i> ${_fmtDate(ind.fecha_indicacion)}</span>
                <span><i class="bi bi-hospital"></i> ${centro || '—'}</span>
                <span><i class="bi bi-person-badge"></i> ${medNom}</span>
            </div>
        </div>

        <!-- ── Zona de acción inline ── -->
        ${puedeRecepcionar ? `
        <div class="lab-pend-actions" id="pactions-${uid}">

            <!-- Botones principales -->
            <div class="d-flex gap-2 flex-wrap" id="pbtn-${uid}">
                <button class="btn-pend-accept" data-uid="${uid}"
                        title="Aceptar muestra">
                    <i class="bi bi-check-circle-fill"></i> Recibir
                </button>
                <button class="btn-pend-reject" data-uid="${uid}"
                        title="Rechazar muestra">
                    <i class="bi bi-x-circle"></i> Rechazar
                </button>
            </div>

            <!-- Bloque de rechazo (oculto inicialmente) -->
            <div class="pend-reject-block d-none" id="preject-${uid}">
                <textarea class="form-control pend-motivo-input" id="pmotivo-${uid}"
                          rows="2" placeholder="Motivo de rechazo (obligatorio)…"></textarea>
                <div class="invalid-feedback" id="perr-${uid}"></div>
                <div class="d-flex gap-2 mt-2 flex-wrap">
                    <button class="btn-pend-confirm-reject" data-uid="${uid}">
                        <i class="bi bi-floppy"></i> Confirmar rechazo
                    </button>
                    <button class="btn-pend-cancel-reject" data-uid="${uid}">
                        Cancelar
                    </button>
                </div>
            </div>

            <!-- Feedback de resultado -->
            <div class="pend-result-msg d-none" id="presult-${uid}"></div>
        </div>
        ` : `
        <div style="font-size:.75rem;color:var(--text-muted);padding:.5rem 0">
            <i class="bi bi-eye"></i> Pendiente recepción
        </div>`}
    </div>`;
}

/* ── Binding de eventos en todas las cards ───────────────── */
function _bindCardActions(wrap, inds, user, rootEl, rerenderFn, currentQ) {
    /* Aceptar directamente */
    wrap.querySelectorAll('.btn-pend-accept').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uid = btn.dataset.uid;
            const ind = _indFromUid(uid, inds);
            if (!ind) return;
            await _guardarRecepcion(ind, user, 'recibida', null, uid);
            setTimeout(() => renderLaboratorio(user, rootEl), 1400);
        });
    });

    /* Mostrar bloque de rechazo */
    wrap.querySelectorAll('.btn-pend-reject').forEach(btn => {
        btn.addEventListener('click', () => {
            const uid = btn.dataset.uid;
            document.getElementById(`pbtn-${uid}`)?.classList.add('d-none');
            document.getElementById(`preject-${uid}`)?.classList.remove('d-none');
            document.getElementById(`pmotivo-${uid}`)?.focus();
        });
    });

    /* Cancelar rechazo */
    wrap.querySelectorAll('.btn-pend-cancel-reject').forEach(btn => {
        btn.addEventListener('click', () => {
            const uid = btn.dataset.uid;
            document.getElementById(`preject-${uid}`)?.classList.add('d-none');
            document.getElementById(`pbtn-${uid}`)?.classList.remove('d-none');
            const motivo = document.getElementById(`pmotivo-${uid}`);
            if (motivo) { motivo.value = ''; motivo.classList.remove('is-invalid'); }
            const err = document.getElementById(`perr-${uid}`);
            if (err) err.classList.remove('show');
        });
    });

    /* Confirmar rechazo */
    wrap.querySelectorAll('.btn-pend-confirm-reject').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uid    = btn.dataset.uid;
            const motivo = document.getElementById(`pmotivo-${uid}`)?.value.trim();
            const errEl  = document.getElementById(`perr-${uid}`);
            const motiEl = document.getElementById(`pmotivo-${uid}`);

            if (!motivo) {
                motiEl?.classList.add('is-invalid');
                if (errEl) { errEl.textContent = 'El motivo de rechazo es obligatorio.'; errEl.classList.add('show'); }
                return;
            }
            motiEl?.classList.remove('is-invalid');
            if (errEl) errEl.classList.remove('show');

            const ind = _indFromUid(uid, inds);
            if (!ind) return;
            btn.disabled = true;
            await _guardarRecepcion(ind, user, 'rechazada', motivo, uid);
            setTimeout(() => renderLaboratorio(user, rootEl), 1600);
        });
    });
}

/* ── Obtener indicación a partir del uid de la card ─────── */
function _indFromUid(uid, inds) {
    const [id, exId] = uid.split('_');
    return inds.find(i => i.id === id && i._examen_id === Number(exId)) || null;
}

/* ── Guardar recepción (acepta y rechaza) ────────────────── */
async function _guardarRecepcion(ind, user, decision, motivo, uid) {
    /* Feedback inmediato en la card */
    const actionsEl = document.getElementById(`pactions-${uid}`);
    const resultEl  = document.getElementById(`presult-${uid}`);
    if (actionsEl) actionsEl.classList.add('d-none');
    if (resultEl) {
        resultEl.className = `pend-result-msg pend-result-${decision === 'recibida' ? 'ok' : 'warn'}`;
        resultEl.innerHTML = decision === 'recibida'
            ? '<i class="bi bi-check-circle-fill"></i> Muestra recibida correctamente.'
            : '<i class="bi bi-x-circle-fill"></i> Muestra rechazada registrada.';
        resultEl.classList.remove('d-none');
    }

    /* Construir snapshot */
    const _indUsers  = window._store.usuarios  || [];
    const _pacSnap   = (window._store.pacientes || []).find(p => p.id === ind.paciente_id) || null;
    const _indicador = _indUsers.find(u => u.id === ind.indicado_por) || null;

    const nueva = {
        id: _genId(),
        indicacion_id:   ind.id,
        examen_id:       ind._examen_id,
        laboratorio_id:  ind.laboratorio_id,
        estado:          decision,
        motivo_rechazo:  decision === 'rechazada' ? motivo : null,
        recibida_por:    user.id,
        fecha_recepcion: new Date().toISOString(),
        snap: {
            fecha_indicacion: ind.fecha_indicacion,
            tipo_muestra_id:  ind.tipo_muestra_id,
            examen_id:        ind._examen_id,
            examenes_ids:     [ind._examen_id],
            paciente: _pacSnap ? {
                nombres:          _pacSnap.nombres,
                apellidos:        _pacSnap.apellidos,
                carnet_identidad: _pacSnap.carnet_identidad,
                municipio_id:     _pacSnap.municipio_id,
            } : null,
            centro_nombre:    _indicador?.centro_texto ||
                              getGeoCentros().find(c => c.id === Number(_indicador?.centro_salud_id))?.nombre || null,
            indicador_nombre: _indicador ? `${_indicador.nombres} ${_indicador.apellidos}` : null,
        },
    };

    /* Actualizar store */
    const recs = _getRecepciones();
    recs.push(nueva);
    _saveRecepciones(recs);

    /* Sincronizar con Supabase */
    if (typeof sbUpsertRow === 'function') {
        sbUpsertRow('recepciones_muestra', nueva).catch(e => console.error('rec sync:', e.message));
    }
}
