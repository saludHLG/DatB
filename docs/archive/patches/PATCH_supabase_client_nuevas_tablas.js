/* =========================================================
   PATCH para supabase_client.js — función sbInitAll
   Reemplazar la función completa con esta versión
   que incluye las nuevas tablas res_mf_led y res_tb_lam.
   ========================================================= */

window.sbInitAll = async function () {
    const sb = _client();
    if (!sb) { console.warn('Supabase no configurado — store vacío.'); return; }

    try {
        const [
            rProv, rMun, rCent, rLabs,
            rUsers, rPerms, rAccesos,
            rPacs, rInds, rIndEx, rRecs,
            rBaci, rCult, rXU, rXDR,
            rMfLed, rTbLam,
            rGV, rTM, rMicro
        ] = await Promise.allSettled([
            sb.from('provincias').select('*').order('nombre'),
            sb.from('municipios').select('*').order('nombre'),
            sb.from('centros_salud').select('*').order('nombre'),
            sb.from('laboratorios').select('*').order('nombre'),
            sb.from('usuarios').select('*'),
            sb.from('permisos_lab').select('*'),
            sb.from('accesos_temporales').select('*'),
            sb.from('pacientes').select('*'),
            sb.from('indicaciones_examen').select('*'),
            sb.from('indicacion_examenes').select('*'),
            sb.from('recepciones_muestra').select('*'),
            sb.from('resultados_baciloscopia').select('*'),
            sb.from('resultados_cultivo').select('*'),
            sb.from('resultados_xpert_ultra').select('*'),
            sb.from('resultados_xpert_xdr').select('*'),
            sb.from('resultados_mf_led').select('*'),
            sb.from('resultados_tb_lam').select('*'),
            sb.from('grupos_vulnerables').select('*'),
            sb.from('tipos_muestra').select('*'),
            sb.from('microorganismos').select('*'),
        ]);

        const d = r => (r.status === 'fulfilled' && r.value.data) ? r.value.data : null;

        if (d(rProv))    _store.geo_provincias     = d(rProv);
        if (d(rMun))     _store.geo_municipios      = d(rMun);
        if (d(rCent))    _store.geo_centros          = d(rCent);
        if (d(rLabs))    _store.geo_labs             = d(rLabs);
        if (d(rUsers))   _store.usuarios             = d(rUsers);
        if (d(rPerms))   _store.permisos_lab         = d(rPerms);
        if (d(rAccesos)) _store.accesos_temp         = d(rAccesos);
        if (d(rPacs))    _store.pacientes            = d(rPacs);
        if (d(rRecs))    _store.recepciones          = d(rRecs);
        if (d(rBaci))    _store.res_baci             = d(rBaci);
        if (d(rCult))    _store.res_cultivo          = d(rCult);
        if (d(rXU))      _store.res_xpert_ultra      = d(rXU);
        if (d(rXDR))     _store.res_xpert_xdr        = d(rXDR);
        if (d(rMfLed))   _store.res_mf_led           = d(rMfLed);
        if (d(rTbLam))   _store.res_tb_lam           = d(rTbLam);
        if (d(rGV))      _store.grupos_vulnerables   = d(rGV);
        if (d(rTM))      _store.tipos_muestra        = d(rTM);
        if (d(rMicro))   _store.microorganismos      = d(rMicro);

        // Indicaciones: merge examenes_ids desde tabla junction si falta en columna jsonb
        if (d(rInds)) {
            const indExams = d(rIndEx) || [];
            _store.indicaciones = d(rInds).map(ind => ({
                ...ind,
                examenes_ids: (ind.examenes_ids && ind.examenes_ids.length > 0)
                    ? ind.examenes_ids
                    : indExams
                        .filter(ie => ie.indicacion_id === ind.id)
                        .map(ie => ie.examen_id),
            }));
        }

    } catch (e) {
        console.error('sbInitAll error:', e);
    }
};

/* ═══════════════════════════════════════════════════════════
   PATCH para renderLaboratorio en laboratorio.js
   Dentro del bloque try del fetch de Supabase, añadir
   las dos líneas siguientes junto a las otras promesas:
   ═══════════════════════════════════════════════════════════

   sb.from('resultados_mf_led').select('*'),
   sb.from('resultados_tb_lam').select('*'),

   Y en la sección de asignación:

   if (d(rMfLed))   window._store.res_mf_led = d(rMfLed);
   if (d(rTbLam))   window._store.res_tb_lam = d(rTbLam);

   (ajustar los índices del array de promesas en Promise.allSettled)
*/

/* ═══════════════════════════════════════════════════════════
   PATCH para admin.html y admin.js — añadir TB-LAM (id=6)

   En admin.html, dentro de #lab-examenes-grid, añadir:
   <label class="perm-check-label lab-ex-item">
       <input type="checkbox" class="lab-ex-chk" value="6"> TB-LAM <code class="exam-cod ms-1">TB-LAM</code>
   </label>

   En admin.js, función renderLabs(), en el array de códigos:
   { id:6, codigo:'TB-LAM' }
   ═══════════════════════════════════════════════════════════ */
