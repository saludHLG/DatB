/* DatB admin geography location rendering and tab wiring. */
function renderLocPanel(panel){({provincias:renderProvs,municipios:renderMuns,centros:renderCentros,laboratorios:renderLabs}[panel]||(()=>{}))();}

function renderProvs(){
    const p=GEO.getProvs(),m=GEO.getMuns(),c=GEO.getCentros(),l=GEO.getLabs(),tb=$a('tbody-provincias');if(!tb)return;
    $a('count-provincias').textContent=`${p.length} provincia(s)`;tb.innerHTML='';
    p.forEach(x=>{const ids=m.filter(y=>y.provincia_id===x.id).map(y=>y.id),tr=document.createElement('tr');tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td style="font-family:var(--font-mono);font-size:.78rem">${x.codigo}</td><td class="td-muted">${ids.length}</td><td class="td-muted">${c.filter(y=>ids.includes(y.municipio_id)).length}</td><td class="td-muted">${l.filter(y=>y.provincia_id===x.id).length}</td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openProvModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="provincia" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;tb.appendChild(tr);});
}
function renderMuns(){
    const s=($a('filter-mun')?.value||'').toLowerCase(),pf=$a('filter-mun-prov')?.value;let m=GEO.getMuns();const c=GEO.getCentros(),l=GEO.getLabs();
    if(s)m=m.filter(x=>x.nombre.toLowerCase().includes(s));if(pf)m=m.filter(x=>String(x.provincia_id)===pf);
    $a('count-municipios').textContent=`${m.length} municipio(s)`;const tb=$a('tbody-municipios');if(!tb)return;tb.innerHTML='';
    m.forEach(x=>{const tr=document.createElement('tr');tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td class="td-muted">${geoProvName(x.provincia_id)}</td><td class="td-muted">${c.filter(y=>y.municipio_id===x.id).length}</td><td class="td-muted">${l.filter(y=>y.municipio_id===x.id).length}</td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openMunModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="municipio" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;tb.appendChild(tr);});
    const f=$a('filter-mun-prov');if(f&&f.options.length===1)fillProvSelect(f);
}
function renderCentros(){
    const s=($a('filter-centro')?.value||'').toLowerCase(),pf=$a('filter-centro-prov')?.value,mf=$a('filter-centro-mun')?.value;let c=GEO.getCentros();const m=GEO.getMuns();
    if(s)c=c.filter(x=>x.nombre.toLowerCase().includes(s));if(pf){const ids=m.filter(x=>String(x.provincia_id)===pf).map(x=>x.id);c=c.filter(x=>ids.includes(x.municipio_id));}if(mf)c=c.filter(x=>String(x.municipio_id)===mf);
    $a('count-centros').textContent=`${c.length} centro(s)`;const tb=$a('tbody-centros');if(!tb)return;tb.innerHTML='';
    c.forEach(x=>{const mun=m.find(y=>y.id===x.municipio_id),tr=document.createElement('tr');tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td class="td-muted">${x.tipo||'—'}</td><td class="td-muted">${mun?.nombre||'—'}</td><td class="td-muted">${geoProvName(mun?.provincia_id)}</td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openCentroModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="centro" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;tb.appendChild(tr);});
    const f=$a('filter-centro-prov');if(f&&f.options.length===1)fillProvSelect(f);
}

document.addEventListener('DOMContentLoaded',()=>{
    $a('filter-mun')?.addEventListener('input',renderMuns);$a('filter-mun-prov')?.addEventListener('change',renderMuns);$a('filter-centro')?.addEventListener('input',renderCentros);
    $a('filter-centro-prov')?.addEventListener('change',function(){const s=$a('filter-centro-mun');if(s){s.innerHTML='<option value="">Todos los municipios</option>';if(this.value)GEO.getMuns().filter(m=>String(m.provincia_id)===this.value).forEach(m=>s.appendChild(new Option(m.nombre,m.id)));}renderCentros();});
    $a('filter-centro-mun')?.addEventListener('change',renderCentros);
    document.querySelectorAll('.loc-subtab').forEach(btn=>btn.addEventListener('click',function(){document.querySelectorAll('.loc-subtab').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.querySelectorAll('.loc-panel').forEach(p=>p.classList.add('d-none'));$a(`loc-${this.dataset.loc}`)?.classList.remove('d-none');renderLocPanel(this.dataset.loc);}));
});
