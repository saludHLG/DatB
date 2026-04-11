/* =========================================================
   PATCH: _bindIndCardBtns — indicacion.js
   
   CAMBIO: El solicitante elimina su indicación sin borrar
   las recepciones/resultados del laboratorio.
   - _store: solo elimina la indicación; las recepciones
     quedan con indicacion_id = null (usan snap para display).
   - Supabase: con FK ON DELETE SET NULL, las recepciones
     quedan huérfanas automáticamente.
   ========================================================= */

function _bindIndCardBtns(user, el) {
    const listWrap = document.getElementById('ind-list-wrap');
    if (!listWrap) return;

    listWrap.querySelectorAll('.btn-ind-action.del').forEach(btn => {
        btn.addEventListener('click', () => {
            _appConfirm(
                'Se eliminará su solicitud. Los registros ya procesados por el laboratorio se conservarán.',
                async () => {
                    const id = btn.dataset.id;

                    /* 1. Quitar la indicación del store local */
                    window._store.indicaciones = (window._store.indicaciones || [])
                        .filter(i => i.id !== id);

                    /* 2. Orfenar las recepciones en el store local
                          (el laboratorio sigue viéndolas via snap) */
                    const recs = window._store.recepciones || [];
                    recs.forEach(r => {
                        if (r.indicacion_id === id) r.indicacion_id = null;
                    });

                    /* 3. Supabase: DELETE en indicaciones_examen.
                          Con FK SET NULL, recepciones_muestra.indicacion_id
                          pasa a NULL automáticamente en BD. */
                    if (typeof sbDeleteRow === 'function') {
                        sbDeleteRow('indicaciones_examen', id)
                            .catch(e => console.error('delete indicacion:', e));
                    }

                    /* 4. Limpiar tabla junction indicacion_examenes */
                    const sb = typeof _client === 'function' ? _client() : null;
                    if (sb) {
                        sb.from('indicacion_examenes')
                          .delete()
                          .eq('indicacion_id', id)
                          .catch(e => console.error('delete indicacion_examenes:', e));
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
