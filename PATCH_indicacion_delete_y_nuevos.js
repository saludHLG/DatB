/* =========================================================
   PATCH para indicacion.js
   Instrucciones:
   1. Reemplazar la función _bindIndCardBtns completa.
   2. Dentro de _renderIndCard, añadir los bloques eid===4 y eid===6
      en el bucle de resultados inline (junto a los bloques eid===1,2,3,5).
   ========================================================= */

/* ══════════════════════════════════════════════════════════════
   REEMPLAZAR _bindIndCardBtns completa
   ══════════════════════════════════════════════════════════════ */
function _bindIndCardBtns(user, el) {
    const listWrap = document.getElementById('ind-list-wrap');
    if (!listWrap) return;

    listWrap.querySelectorAll('.btn-ind-action.del').forEach(btn => {
        btn.addEventListener('click', () => {
            _appConfirm(
                'La indicación y todos sus resultados asociados serán eliminados. Esta acción no se puede deshacer.',
                async () => {
                    const id = btn.dataset.id;

                    /* 1. Limpiar store local (recepciones + resultados) */
                    _purgeIndicacionLocal(id);

                    /* 2. Borrar en Supabase — el CASCADE en BD elimina recepciones
                          y sus resultados automáticamente */
                    if (typeof sbDeleteRow === 'function') {
                        sbDeleteRow('indicaciones_examen', id).catch(e =>
                            console.error('delete indicacion:', e)
                        );
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
   DENTRO de _renderIndCard, en el bucle for (const eid of ...)
   AÑADIR los siguientes bloques else if DESPUÉS del bloque eid===3
   y ANTES del bloque eid===5:
   ══════════════════════════════════════════════════════════════ */

// ------ Bloque eid === 4 (MF-LED) ------
/*
} else if (Number(eid) === 4) {
    const rm = _store.res_mf_led.find(r => r.recepcion_id === rec.id);
    if (rm) {
        const info = _MFLED_LECTURAS[rm.lectura] || { label: rm.lectura, cls: 'res-contam' };
        let lbl = info.label;
        if (rm.lectura === 'confirmacion') {
            const conf = _mfLedIsConfirmed(ind.id);
            lbl += conf ? ' <em style="color:#065f46">(confirmado +)</em>' : ' <em style="color:#92400e">(pendiente confirmación)</em>';
        }
        parts.push(`<div class="ind-res-item">
            <span class="ind-res-label">${exNom}</span>
            <span class="res-cod ${info.cls} ind-res-cod-wrap">${lbl}</span>
            <small class="text-muted">N°${rm.numero_muestra} · ${_formatDate(rm.fecha)}</small>
        </div>`);
    } else {
        parts.push(`<div class="ind-res-item"><span class="ind-res-label">${exNom}</span><span class="text-muted" style="font-size:.78rem">Pendiente resultado</span></div>`);
    }
*/

// ------ Bloque eid === 6 (TB-LAM) ------
/*
} else if (Number(eid) === 6) {
    const rl = _store.res_tb_lam.find(r => r.recepcion_id === rec.id);
    if (rl) {
        const cls2 = rl.resultado === 'POSITIVO' ? 'res-pos' : 'res-neg';
        parts.push(`<div class="ind-res-item">
            <span class="ind-res-label">${exNom}</span>
            <span class="res-cod ${cls2}">${rl.resultado}</span>
            <small class="text-muted">N°${rl.numero_muestra} · ${_formatDate(rl.fecha)}</small>
        </div>`);
    } else {
        parts.push(`<div class="ind-res-item"><span class="ind-res-label">${exNom}</span><span class="text-muted" style="font-size:.78rem">Pendiente resultado</span></div>`);
    }
*/

/* ══════════════════════════════════════════════════════════════
   En _EXAMENES_CAT de indicacion.js, añadir TB-LAM:
   (reemplazar el array existente)
   ══════════════════════════════════════════════════════════════ */
/*
const EXAMENES_TB_CAT = [
    { id: 1, nombre: 'Baciloscopia',          codigo: 'BACI' },
    { id: 2, nombre: 'Cultivo',               codigo: 'CULT' },
    { id: 3, nombre: 'Xpert MTB/RIF (Ultra)', codigo: 'XPERT-ULTRA' },
    { id: 4, nombre: 'MF-LED',                codigo: 'MF-LED' },
    { id: 5, nombre: 'Xpert MTB/XDR',         codigo: 'XPERT-XDR' },
    { id: 6, nombre: 'TB-LAM',                codigo: 'TB-LAM' },
];
*/
