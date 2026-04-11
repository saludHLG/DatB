/* =========================================================
   PATCH: indicacion.js — 3 cambios
   
   1. _bindIndCardBtns: soft-delete correcto
      - Solo elimina de _store.indicaciones (NO purga recepciones)
      - Las recepciones quedan con indicacion_id = null en BD (SET NULL)
      - El laboratorio las sigue viendo por snap
   
   2. EXAMENES_TB_CAT: añadir TB-LAM (id=6)
   
   3. _renderIndCard: bloques de display para eid===4 y eid===6
   ========================================================= */

/* ══════════════════════════════════════════════════════════════
   1. REEMPLAZAR _bindIndCardBtns
   ══════════════════════════════════════════════════════════════ */
function _bindIndCardBtns(user, el) {
    const listWrap = document.getElementById('ind-list-wrap');
    if (!listWrap) return;

    listWrap.querySelectorAll('.btn-ind-action.del').forEach(btn => {
        btn.addEventListener('click', () => {
            _appConfirm(
                'Se eliminará su solicitud. Los registros ya procesados por el laboratorio se conservarán.',
                async () => {
                    const id = btn.dataset.id;

                    /* 1. Quitar solo la indicación del store local.
                          Las recepciones NO se tocan — el laboratorio
                          las sigue viendo mediante su campo snap. */
                    window._store.indicaciones = (window._store.indicaciones || [])
                        .filter(i => i.id !== id);

                    /* 2. Dejar las recepciones en el store local como huérfanas
                          para que el lab las siga mostrando en su sesión actual. */
                    (window._store.recepciones || []).forEach(r => {
                        if (r.indicacion_id === id) r.indicacion_id = null;
                    });

                    /* 3. DELETE en Supabase.
                          Con FK SET NULL: recepciones_muestra.indicacion_id → NULL
                          Con FK CASCADE:  indicacion_examenes se limpia solo */
                    if (typeof sbDeleteRow === 'function') {
                        sbDeleteRow('indicaciones_examen', id)
                            .catch(e => console.error('delete indicacion:', e));
                    }

                    renderIndicaciones(user, document.getElementById('app-content-inner'));
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

/* ══════════════════════════════════════════════════════════════
   2. REEMPLAZAR EXAMENES_TB_CAT (incluye TB-LAM id=6)
   ══════════════════════════════════════════════════════════════ */
const EXAMENES_TB_CAT = [
    { id: 1, nombre: 'Baciloscopia',          codigo: 'BACI'        },
    { id: 2, nombre: 'Cultivo',               codigo: 'CULT'        },
    { id: 3, nombre: 'Xpert MTB/RIF (Ultra)', codigo: 'XPERT-ULTRA' },
    { id: 4, nombre: 'MF-LED',                codigo: 'MF-LED'      },
    { id: 5, nombre: 'Xpert MTB/XDR',         codigo: 'XPERT-XDR'   },
    { id: 6, nombre: 'TB-LAM',                codigo: 'TB-LAM'      },
];

/* ══════════════════════════════════════════════════════════════
   3. EN _renderIndCard — dentro del bucle for (const eid of ...)
   
   AÑADIR después del bloque  } else if (Number(eid) === 3) { ... }
   y ANTES de                  } else if (Number(eid) === 5) { ... }
   los dos bloques siguientes:
   ══════════════════════════════════════════════════════════════ */

/*
            } else if (Number(eid) === 4) {
                // ── MF-LED ──────────────────────────────────────
                const rm = (_store.res_mf_led || []).find(r => r.recepcion_id === rec.id);
                if (rm) {
                    const info = _MFLED_LECTURAS[rm.lectura] || { label: rm.lectura, cls: 'res-contam' };
                    let lbl = info.label;
                    if (rm.lectura === 'confirmacion') {
                        const conf = _mfLedIsConfirmed(ind.id);
                        lbl += conf
                            ? ' <em style="color:#065f46">(confirmado +)</em>'
                            : ' <em style="color:#92400e">(pendiente confirmación)</em>';
                    }
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="res-cod ${info.cls} ind-res-cod-wrap">${lbl}</span>
                        <small class="text-muted">N°${rm.numero_muestra} · ${_formatDate(rm.fecha)}</small>
                    </div>`);
                } else {
                    parts.push(`<div class="ind-res-item"><span class="ind-res-label">${exNom}</span>
                        <span class="text-muted" style="font-size:.78rem">Pendiente resultado</span></div>`);
                }

            } else if (Number(eid) === 6) {
                // ── TB-LAM ───────────────────────────────────────
                const rl = (_store.res_tb_lam || []).find(r => r.recepcion_id === rec.id);
                if (rl) {
                    const cls2 = rl.resultado === 'POSITIVO' ? 'res-pos' : 'res-neg';
                    parts.push(`<div class="ind-res-item">
                        <span class="ind-res-label">${exNom}</span>
                        <span class="res-cod ${cls2}">${rl.resultado}</span>
                        <small class="text-muted">N°${rl.numero_muestra} · ${_formatDate(rl.fecha)}</small>
                    </div>`);
                } else {
                    parts.push(`<div class="ind-res-item"><span class="ind-res-label">${exNom}</span>
                        <span class="text-muted" style="font-size:.78rem">Pendiente resultado</span></div>`);
                }
*/
