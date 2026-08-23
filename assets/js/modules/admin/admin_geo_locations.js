/* DatB admin geography locations: provinces, municipalities and health centers. */
function renderLocPanel(panel){
    ({provincias:renderProvs,municipios:renderMuns,centros:renderCentros,laboratorios:renderLabs}[panel]||(()=>{}))();
}

function renderProvs(){
    const p=GEO.getProvs(),m=GEO.getMuns(),c=GEO.getCentros(),l=GEO.getLabs(),tb=$a('tbody-provincias');
    if(!tb)return;
    $a('count-provincias').textContent=`${p.length} provincia(s)`;
    tb.innerHTML='';
    p.forEach(x=>{
        const ids=m.filter(y=>y.provincia_id===x.id).map(y=>y.id),tr=document.createElement('tr');
        tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td style="font-family:var(--font-mono);font-size:.78rem">${x.codigo}</td><td class="td-muted">${ids.length}</td><td class="td-muted">${c.filter(y=>ids.includes(y.municipio_id)).length}</td><td class="td-muted">${l.filter(y=>y.provincia_id===x.id).length}</td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openProvModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="provincia" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;
        tb.appendChild(tr);
    });
}

function renderMuns(){
    const s=($a('filter-mun')?.value||'').toLowerCase(),pf=$a('filter-mun-prov')?.value;
    let m=GEO.getMuns();
    const c=GEO.getCentros(),l=GEO.getLabs();
    if(s)m=m.filter(x=>x.nombre.toLowerCase().includes(s));
    if(pf)m=m.filter(x=>String(x.provincia_id)===pf);
    $a('count-municipios').textContent=`${m.length} municipio(s)`;
    const tb=$a('tbody-municipios');if(!tb)return;
    tb.innerHTML='';
    m.forEach(x=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td class="td-muted">${geoProvName(x.provincia_id)}</td><td class="td-muted">${c.filter(y=>y.municipio_id===x.id).length}</td><td class="td-muted">${l.filter(y=>y.municipio_id===x.id).length}</td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openMunModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="municipio" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;
        tb.appendChild(tr);
    });
    const f=$a('filter-mun-prov');if(f&&f.options.length===1)fillProvSelect(f);
}

function renderCentros(){
    const s=($a('filter-centro')?.value||'').toLowerCase(),pf=$a('filter-centro-prov')?.value,mf=$a('filter-centro-mun')?.value;
    let c=GEO.getCentros();const m=GEO.getMuns();
    if(s)c=c.filter(x=>x.nombre.toLowerCase().includes(s));
    if(pf){const ids=m.filter(x=>String(x.provincia_id)===pf).map(x=>x.id);c=c.filter(x=>ids.includes(x.municipio_id));}
    if(mf)c=c.filter(x=>String(x.municipio_id)===mf);
    $a('count-centros').textContent=`${c.length} centro(s)`;
    const tb=$a('tbody-centros');if(!tb)return;
    tb.innerHTML='';
    c.forEach(x=>{
        const mun=m.find(y=>y.id===x.municipio_id),tr=document.createElement('tr');
        tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td class="td-muted">${x.tipo||'—'}</td><td class="td-muted">${mun?.nombre||'—'}</td><td class="td-muted">${geoProvName(mun?.provincia_id)}</td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openCentroModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="centro" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;
        tb.appendChild(tr);
    });
    const f=$a('filter-centro-prov');if(f&&f.options.length===1)fillProvSelect(f);
}

function openProvModal(id){
    const x=GEO.getProvs().find(p=>p.id===id);if(!x)return;
    $a('modal-provincia-title').innerHTML='<i class="bi bi-pencil"></i> Editar provincia';
    $a('prov-edit-id').value=x.id;$a('prov-nombre').value=x.nombre;$a('prov-codigo').value=x.codigo;$a('prov-err').classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance($a('modal-provincia')).show();
}
function openMunModal(id){
    const x=GEO.getMuns().find(m=>m.id===id);if(!x)return;
    $a('modal-municipio-title').innerHTML='<i class="bi bi-pencil"></i> Editar municipio';
    $a('mun-edit-id').value=x.id;$a('mun-nombre').value=x.nombre;fillProvSelect($a('mun-provincia'),x.provincia_id);$a('mun-err').classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance($a('modal-municipio')).show();
}
function openCentroModal(id){
    const x=GEO.getCentros().find(c=>c.id===id);if(!x)return;
    const m=GEO.getMuns().find(y=>y.id===x.municipio_id);
    $a('modal-centro-title').innerHTML='<i class="bi bi-pencil"></i> Editar centro de salud';
    $a('centro-edit-id').value=x.id;$a('centro-nombre').value=x.nombre;$a('centro-tipo').value=x.tipo||'';
    fillProvSelect($a('centro-provincia'),m?.provincia_id);fillMunSelect($a('centro-municipio'),m?.provincia_id,x.municipio_id);$a('centro-municipio').disabled=false;$a('centro-err').classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance($a('modal-centro')).show();
}

function saveProvincia(){
    const n=$a('prov-nombre').value.trim(),c=$a('prov-codigo').value.trim().toUpperCase();$a('prov-err').classList.add('d-none');
    if(!n||!c)return showLocErr('prov-err','Nombre y código son obligatorios.');
    if(!/^[A-Z]{2,3}$/.test(c))return showLocErr('prov-err','El código debe tener 2–3 letras mayúsculas.');
    const a=GEO.getProvs(),id=Number($a('prov-edit-id').value);
    if(a.some(x=>x.nombre.toLowerCase()===n.toLowerCase()&&x.id!==id))return showLocErr('prov-err','Ya existe una provincia con ese nombre.');
    if(a.some(x=>x.codigo===c&&x.id!==id))return showLocErr('prov-err','Ese código ya está en uso.');
    if(id){const i=a.findIndex(x=>x.id===id);a[i]={...a[i],nombre:n,codigo:c};}else a.push({id:nextGeoId(a),nombre:n,codigo:c});
    GEO.saveProvs(a);bootstrap.Modal.getInstance($a('modal-provincia'))?.hide();renderProvs();toast(id?'Provincia actualizada.':'Provincia creada.');
}
function saveMunicipio(){
    const n=$a('mun-nombre').value.trim(),p=Number($a('mun-provincia').value);$a('mun-err').classList.add('d-none');
    if(!n)return showLocErr('mun-err','El nombre es obligatorio.');if(!p)return showLocErr('mun-err','Seleccione una provincia.');
    const a=GEO.getMuns(),id=Number($a('mun-edit-id').value);
    if(a.some(x=>x.nombre.toLowerCase()===n.toLowerCase()&&x.provincia_id===p&&x.id!==id))return showLocErr('mun-err','Ya existe ese municipio en esa provincia.');
    if(id){const i=a.findIndex(x=>x.id===id);a[i]={...a[i],nombre:n,provincia_id:p};}else a.push({id:nextMunId(a,p),nombre:n,provincia_id:p});
    GEO.saveMuns(a);bootstrap.Modal.getInstance($a('modal-municipio'))?.hide();renderMuns();toast(id?'Municipio actualizado.':'Municipio creado.');
}
function saveCentro(){
    const n=$a('centro-nombre').value.trim(),t=$a('centro-tipo').value,m=Number($a('centro-municipio').value);$a('centro-err').classList.add('d-none');
    if(!n)return showLocErr('centro-err','El nombre es obligatorio.');if(!t)return showLocErr('centro-err','Seleccione el tipo de centro.');if(!m)return showLocErr('centro-err','Seleccione el municipio.');
    const a=GEO.getCentros(),id=Number($a('centro-edit-id').value);
    if(id){const i=a.findIndex(x=>x.id===id);a[i]={...a[i],nombre:n,tipo:t,municipio_id:m};}else a.push({id:nextGeoId(a),nombre:n,tipo:t,municipio_id:m});
    GEO.saveCentros(a);bootstrap.Modal.getInstance($a('modal-centro'))?.hide();renderCentros();toast(id?'Centro actualizado.':'Centro creado.');
}

document.addEventListener('DOMContentLoaded',()=>{
    $a('btn-new-provincia')?.addEventListener('click',()=>{$a('modal-provincia-title').innerHTML='<i class="bi bi-map"></i> Nueva provincia';$a('prov-edit-id').value='';$a('prov-nombre').value='';$a('prov-codigo').value='';$a('prov-err').classList.add('d-none');bootstrap.Modal.getOrCreateInstance($a('modal-provincia')).show();});
    $a('btn-save-provincia')?.addEventListener('click',saveProvincia);
    $a('btn-new-municipio')?.addEventListener('click',()=>{$a('modal-municipio-title').innerHTML='<i class="bi bi-signpost-split"></i> Nuevo municipio';$a('mun-edit-id').value='';$a('mun-nombre').value='';fillProvSelect($a('mun-provincia'));$a('mun-err').classList.add('d-none');bootstrap.Modal.getOrCreateInstance($a('modal-municipio')).show();});
    $a('btn-save-municipio')?.addEventListener('click',saveMunicipio);
    $a('btn-new-centro')?.addEventListener('click',()=>{$a('modal-centro-title').innerHTML='<i class="bi bi-hospital"></i> Nuevo centro de salud';$a('centro-edit-id').value='';$a('centro-nombre').value='';$a('centro-tipo').value='';fillProvSelect($a('centro-provincia'));$a('centro-municipio').innerHTML='<option value="">— Seleccione provincia —</option>';$a('centro-municipio').disabled=true;$a('centro-err').classList.add('d-none');bootstrap.Modal.getOrCreateInstance($a('modal-centro')).show();});
    $a('centro-provincia')?.addEventListener('change',function(){fillMunSelect($a('centro-municipio'),this.value);$a('centro-municipio').disabled=!this.value;});
    $a('btn-save-centro')?.addEventListener('click',saveCentro);
    $a('filter-mun')?.addEventListener('input',renderMuns);$a('filter-mun-prov')?.addEventListener('change',renderMuns);
    $a('filter-centro')?.addEventListener('input',renderCentros);
    $a('filter-centro-prov')?.addEventListener('change',function(){const s=$a('filter-centro-mun');if(s){s.innerHTML='<option value="">Todos los municipios</option>';if(this.value)GEO.getMuns().filter(m=>String(m.provincia_id)===this.value).forEach(m=>s.appendChild(new Option(m.nombre,m.id)));}renderCentros();});
    $a('filter-centro-mun')?.addEventListener('change',renderCentros);
    document.querySelectorAll('.loc-subtab').forEach(btn=>btn.addEventListener('click',function(){document.querySelectorAll('.loc-subtab').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.querySelectorAll('.loc-panel').forEach(p=>p.classList.add('d-none'));$a(`loc-${this.dataset.loc}`)?.classList.remove('d-none');renderLocPanel(this.dataset.loc);}));
});
