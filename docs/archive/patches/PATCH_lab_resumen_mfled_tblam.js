/* =========================================================
   PATCH: lab_resumen.js — soporte MF-LED (4) y TB-LAM (6)
   
   REEMPLAZAR las siguientes funciones completas en lab_resumen.js:
     · _lr_hasResult
     · _lr_isPositive
     · _lr_isNegative
     · _lr_computeSubset  (función interna)
   
   MODIFICAR en _lr_computeData:
     · recIdSet-filtered arrays: añadir mfLedF y tbLamF
     · resultados: añadir casos 4 y 6
     · availableExams: extender a [1,2,3,4,5,6]
   ========================================================= */

/* ── 1. Reemplazar _lr_hasResult ── */
function _lr_hasResult(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) return baci.some(r => r.recepcion_id === recId);
    if (eid === 2) return cult.some(r => r.recepcion_id === recId);
    if (eid === 3) return xpertU.some(r => r.recepcion_id === recId);
    if (eid === 4) return _getResMfLed().some(r => r.recepcion_id === recId);
    if (eid === 5) return xpertXDR.some(r => r.recepcion_id === recId);
    if (eid === 6) return _getResTbLam().some(r => r.recepcion_id === recId);
    return false;
}

/* ── 2. Reemplazar _lr_isPositive ── */
function _lr_isPositive(recId, eid, baci, cult, xpertU, xpertXDR, indicacionId) {
    if (eid === 1) { const r = baci.find(x => x.recepcion_id === recId);    return !!(r && r.codificacion > 0); }
    if (eid === 2) { const r = cult.find(x => x.recepcion_id === recId);    return !!(r && /^[1-9]$/.test(r.resultado)); }
    if (eid === 3) { const r = xpertU.find(x => x.recepcion_id === recId);  return !!(r && r.resultado === 'MTB DETECTADO'); }
    if (eid === 4) {
        const r = _getResMfLed().find(x => x.recepcion_id === recId);
        if (!r) return false;
        if (['positivo_escaso','positivo_1','positivo_2','positivo_3'].includes(r.lectura)) return true;
        if (r.lectura === 'confirmacion' && indicacionId) return _mfLedIsConfirmed(indicacionId);
        return false;
    }
    if (eid === 5) { const r = xpertXDR.find(x => x.recepcion_id === recId); return !!(r && r.resultado === 'MTB DETECTADO'); }
    if (eid === 6) { const r = _getResTbLam().find(x => x.recepcion_id === recId); return !!(r && r.resultado === 'POSITIVO'); }
    return false;
}

/* ── 3. Reemplazar _lr_isNegative ── */
function _lr_isNegative(recId, eid, baci, cult, xpertU, xpertXDR) {
    if (eid === 1) { const r = baci.find(x => x.recepcion_id === recId);    return !!(r && r.codificacion === 0); }
    if (eid === 2) { const r = cult.find(x => x.recepcion_id === recId);    return !!(r && r.resultado === '0'); }
    if (eid === 3) { const r = xpertU.find(x => x.recepcion_id === recId);  return !!(r && r.resultado === 'MTB NO DETECTADO'); }
    if (eid === 4) { const r = _getResMfLed().find(x => x.recepcion_id === recId); return !!(r && r.lectura === 'negativo'); }
    if (eid === 5) {
        const r = xpertXDR.find(x => x.recepcion_id === recId);
        if (!r || r.resultado !== 'MTB DETECTADO') return false;
        const marcadores = [r.resistencia_isoniazida, r.resistencia_fluorquinolona, r.resistencia_amikacina,
                            r.resistencia_kanamicina, r.resistencia_capreomicina, r.resistencia_etionamida]
            .filter(v => v && v !== 'NO PROCEDE');
        return marcadores.length > 0 && marcadores.every(v => v.includes('NO DETECTADO'));
    }
    if (eid === 6) { const r = _getResTbLam().find(x => x.recepcion_id === recId); return !!(r && r.resultado === 'NEGATIVO'); }
    return false;
}

/* ── 4. Reemplazar _lr_computeSubset ── */
function _lr_computeSubset(eid, inds, recs, baci, cult, xpertU, xpertXDR, pacs) {
    const recMap = {};
    recs.forEach(r => {
        if (!recMap[r.indicacion_id]) recMap[r.indicacion_id] = [];
        recMap[r.indicacion_id].push(r);
    });
    const getRec = (indId, e) => {
        const indRecs = recMap[indId] || [];
        return indRecs.find(r => Number(r.examen_id) === e)
            || (indRecs.length === 1 && !indRecs[0].examen_id ? indRecs[0] : null);
    };

    const byTMResult = {};
    const ageGroups  = ['< 14', '15–29', '30–44', '45–59', '≥ 60'];
    const pyramid    = { total:0, M_pos:[0,0,0,0,0], M_neg:[0,0,0,0,0], F_pos:[0,0,0,0,0], F_neg:[0,0,0,0,0], ageGroups };
    const gvStats    = {};

    inds.forEach(ind => {
        if (!(ind.examenes_ids || []).map(Number).includes(eid)) return;
        const rec = getRec(ind.id, eid);
        if (!rec || rec.estado === 'rechazada') return;

        const hasPos = _lr_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR, ind.id);
        const hasNeg = _lr_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR);
        if (!hasPos && !hasNeg) return;

        if (ind.tipo_muestra_id) {
            const tmId = ind.tipo_muestra_id;
            if (!byTMResult[tmId]) byTMResult[tmId] = { pos:0, neg:0 };
            if (hasPos) byTMResult[tmId].pos++;
            if (hasNeg) byTMResult[tmId].neg++;
        }

        const pac = pacs.find(p => p.id === ind.paciente_id);
        if (pac) {
            if (pac.fecha_nacimiento) {
                const e   = _lr_edad(pac.fecha_nacimiento);
                const g   = e < 14 ? 0 : e <= 29 ? 1 : e <= 44 ? 2 : e <= 59 ? 3 : 4;
                const cat = hasPos ? 'pos' : 'neg';
                if      (pac.sexo === 'M') { if (cat === 'pos') pyramid.M_pos[g]++; else pyramid.M_neg[g]++; }
                else if (pac.sexo === 'F') { if (cat === 'pos') pyramid.F_pos[g]++; else pyramid.F_neg[g]++; }
                pyramid.total++;
            }
            (pac.grupos_ids || []).forEach(gid => {
                if (!gvStats[gid]) gvStats[gid] = { pos:0, neg:0 };
                if (hasPos) gvStats[gid].pos++;
                if (hasNeg) gvStats[gid].neg++;
            });
        }
    });

    return { byTMResult, pyramid, gvStats };
}

/* ── 5. En _lr_computeData, añadir estas líneas DESPUÉS de xpertXDRF ──
        y ANTES del bloque "resultados":

        const mfLedF  = _getResMfLed().filter(r => recIdSet.has(r.recepcion_id));
        const tbLamF  = _getResTbLam().filter(r => recIdSet.has(r.recepcion_id));

   Luego añadir los nuevos bloques de resultados (después del bloque xpertXDRF):

        if (mfLedF.length) {
            resultados[4] = { 'Positivo': 0, 'Requiere confirmación': 0, 'Negativo': 0 };
            mfLedF.forEach(r => {
                if (['positivo_escaso','positivo_1','positivo_2','positivo_3'].includes(r.lectura))
                    resultados[4].Positivo++;
                else if (r.lectura === 'confirmacion')
                    resultados[4]['Requiere confirmación']++;
                else
                    resultados[4].Negativo++;
            });
        }
        if (tbLamF.length) {
            resultados[6] = { 'Negativo': 0, 'Positivo': 0 };
            tbLamF.forEach(r => {
                if (r.resultado === 'POSITIVO') resultados[6].Positivo++;
                else                            resultados[6].Negativo++;
            });
        }

   Cambiar la línea de availableExams de:
        const availableExams = [1, 2, 3, 5].filter(...)
   a:
        const availableExams = [1, 2, 3, 4, 5, 6].filter(...)

   Y en el byTMResult (vista "Todos"), cambiar la condición
        if (eid === 5) return;   ← excluye XDR (correcto)
   para que siga igual. MF-LED (4) y TB-LAM (6) SÍ se incluyen en "Todos".

   Cambiar el filtro de la sección byTMResult:
   
   ANTES:
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            if (eid === 5) return;   // excluye XDR en "Todos"
            ...
        });

   DESPUÉS (sin cambio de lógica, solo verificar que eid===5 excluye XDR,
   y 4 y 6 pasan normalmente):
        (ind.examenes_ids || []).forEach(eidRaw => {
            const eid = Number(eidRaw);
            if (eid === 5) return;  // XDR solo clasifica resistencia, no diagnóstico primario
            const rec = getRec(ind.id, eid);
            if (!rec || rec.estado === 'rechazada') return;
            if (_lr_isPositive(rec.id, eid, baci, cult, xpertU, xpertXDR, ind.id)) hasPos = true;
            if (_lr_isNegative(rec.id, eid, baci, cult, xpertU, xpertXDR)) hasNeg = true;
        });

   Nota: añadir ind.id como último argumento de _lr_isPositive en todos
   los sitios donde se llama dentro de _lr_computeData para que el
   MF-LED "confirmacion" se resuelva correctamente.
   ──────────────────────────────────────────────────────────────── */

/* ── 6. También en home_lab.js (_hl_computeData) hay el mismo patrón.
   Si se quieren reflejar MF-LED y TB-LAM en el dashboard del laboratorio
   se deben aplicar cambios análogos. El parche anterior cubre lab_resumen. ── */
