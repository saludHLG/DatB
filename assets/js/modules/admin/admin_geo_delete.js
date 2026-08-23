/* DatB admin geography deletion and cascades. */
function deleteGeo(tipo,id){
    const m=GEO.getMuns(),c=GEO.getCentros(),l=GEO.getLabs();
    if(tipo==='provincia'){
        const mi=m.filter(x=>x.provincia_id===id).map(x=>x.id),ci=c.filter(x=>mi.includes(x.municipio_id)).map(x=>x.id),li=l.filter(x=>x.provincia_id===id||mi.includes(x.municipio_id)).map(x=>x.id);
        GEO.saveProvs(GEO.getProvs().filter(x=>x.id!==id));GEO.saveMuns(m.filter(x=>!mi.includes(x.id)));GEO.saveCentros(c.filter(x=>!mi.includes(x.municipio_id)));GEO.saveLabs(l.filter(x=>!li.includes(x.id)));savePerms(getPerms().filter(x=>!li.includes(x.laboratorio_id)));
        if(typeof sbDeleteRow==='function'){li.forEach(x=>sbDeleteRow('laboratorios',x));ci.forEach(x=>sbDeleteRow('centros_salud',x));mi.forEach(x=>sbDeleteRow('municipios',x));sbDeleteRow('provincias',id);}return renderProvs();
    }
    if(tipo==='municipio'){
        const li=l.filter(x=>x.municipio_id===id).map(x=>x.id),ci=c.filter(x=>x.municipio_id===id).map(x=>x.id);
        GEO.saveMuns(m.filter(x=>x.id!==id));GEO.saveCentros(c.filter(x=>x.municipio_id!==id));GEO.saveLabs(l.filter(x=>x.municipio_id!==id));savePerms(getPerms().filter(x=>!li.includes(x.laboratorio_id)));
        if(typeof sbDeleteRow==='function'){li.forEach(x=>sbDeleteRow('laboratorios',x));ci.forEach(x=>sbDeleteRow('centros_salud',x));sbDeleteRow('municipios',id);}return renderMuns();
    }
    if(tipo==='centro'){GEO.saveCentros(c.filter(x=>x.id!==id));if(typeof sbDeleteRow==='function')sbDeleteRow('centros_salud',id);return renderCentros();}
    if(tipo==='laboratorio'){GEO.saveLabs(l.filter(x=>x.id!==id));savePerms(getPerms().filter(x=>x.laboratorio_id!==id));if(typeof sbDeleteRow==='function')sbDeleteRow('laboratorios',id);renderLabs();}
}

function requestGeoDelete(btn){
    const tipo=btn.dataset.tipo,id=Number(btn.dataset.id);if(!tipo||!id)return;
    const nombre=({provincia:()=>GEO.getProvs().find(x=>x.id===id)?.nombre,municipio:()=>GEO.getMuns().find(x=>x.id===id)?.nombre,centro:()=>GEO.getCentros().find(x=>x.id===id)?.nombre,laboratorio:()=>GEO.getLabs().find(x=>x.id===id)?.nombre}[tipo]?.()||`#${id}`),m=GEO.getMuns(),c=GEO.getCentros(),l=GEO.getLabs();let extra='';
    if(tipo==='provincia'){const ids=m.filter(x=>x.provincia_id===id).map(x=>x.id),nc=c.filter(x=>ids.includes(x.municipio_id)).length,nl=l.filter(x=>x.provincia_id===id||ids.includes(x.municipio_id)).length;extra=ids.length?`<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán en cascada: <strong>${ids.length}</strong> municipio(s), <strong>${nc}</strong> centro(s) y <strong>${nl}</strong> laboratorio(s).</small>`:'';}
    else if(tipo==='municipio'){const nc=c.filter(x=>x.municipio_id===id).length,nl=l.filter(x=>x.municipio_id===id).length;extra=nc||nl?`<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán en cascada: <strong>${nc}</strong> centro(s) y <strong>${nl}</strong> laboratorio(s).</small>`:'';}
    $a('delete-confirm-msg').innerHTML={provincia:`¿Eliminar la provincia <strong>"${nombre}"</strong>?${extra}`,municipio:`¿Eliminar el municipio <strong>"${nombre}"</strong>?${extra}`,centro:`¿Eliminar el centro de salud <strong>"${nombre}"</strong>?`,laboratorio:`¿Eliminar el laboratorio <strong>"${nombre}"</strong>?<br><small>Los permisos de laboratorio asociados también serán eliminados.</small>`}[tipo];
    window._pendingGeoDelete={tipo,id};bootstrap.Modal.getOrCreateInstance($a('modal-delete')).show();
}

document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('click',e=>{const btn=e.target.closest('.btn-delete-geo');if(btn)requestGeoDelete(btn);});
    $a('btn-confirm-delete')?.addEventListener('click',()=>{const p=window._pendingGeoDelete;if(!p)return;window._pendingGeoDelete=null;deleteGeo(p.tipo,p.id);bootstrap.Modal.getInstance($a('modal-delete'))?.hide();toast('Registro eliminado.','info');});
});
