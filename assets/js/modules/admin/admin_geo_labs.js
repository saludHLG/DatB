/* DatB admin geography laboratories. */
function renderLabs(){
    const s=($a('filter-lab')?.value||'').toLowerCase(),pf=$a('filter-lab-prov')?.value,nf=$a('filter-lab-nivel')?.value;
    let l=GEO.getLabs();
    if(s)l=l.filter(x=>x.nombre.toLowerCase().includes(s));if(pf)l=l.filter(x=>String(x.provincia_id)===pf);if(nf)l=l.filter(x=>x.nivel_referencia===nf);
    $a('count-laboratorios').textContent=`${l.length} laboratorio(s)`;
    const tb=$a('tbody-laboratorios');if(!tb)return;tb.innerHTML='';
    const ex=[{id:1,codigo:'BACI'},{id:2,codigo:'CULT'},{id:3,codigo:'XPERT-U'},{id:4,codigo:'MF-LED'},{id:5,codigo:'XPERT-XDR'},{id:6,codigo:'TB-LAM'}];
    l.forEach(x=>{
        const ids=x.examenes_ids?.length?x.examenes_ids:[1,2,3,4,5];
        const tags=ids.map(i=>{const e=ex.find(y=>y.id===Number(i));return e?`<span class="exam-tag" style="font-size:.65rem;padding:.12em .5em">${e.codigo}</span>`:''}).join(' ');
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="td-muted" style="font-family:var(--font-mono)">${x.id}</td><td style="font-weight:500">${x.nombre}</td><td>${levelBadge(x.nivel_referencia)}</td><td class="td-muted">${geoMunName(x.municipio_id)}</td><td class="td-muted">${geoProvName(x.provincia_id)}</td><td style="white-space:nowrap">${tags}</td><td><span class="status-badge ${x.activo?'aprobado':'rechazado'}">${x.activo?'Activo':'Inactivo'}</span></td><td class="text-end"><div class="table-actions justify-content-end"><button class="btn-table-action" title="Editar" onclick="openLabModal(${x.id})"><i class="bi bi-pencil"></i></button><button class="btn-table-action reject btn-delete-geo" title="Eliminar" data-tipo="laboratorio" data-id="${x.id}"><i class="bi bi-trash"></i></button></div></td>`;
        tb.appendChild(tr);
    });
    const f=$a('filter-lab-prov');if(f&&f.options.length===1)fillProvSelect(f);
}

function openLabModal(id){
    const x=GEO.getLabs().find(l=>l.id===id);if(!x)return;
    $a('modal-lab-title').innerHTML='<i class="bi bi-pencil"></i> Editar laboratorio';
    $a('lab-edit-id').value=x.id;$a('lab-nombre').value=x.nombre;$a('lab-nivel').value=x.nivel_referencia;
    fillProvSelect($a('lab-provincia'),x.provincia_id);fillMunSelect($a('lab-municipio'),x.provincia_id,x.municipio_id);$a('lab-municipio').disabled=false;
    const a=document.querySelector(`input[name="lab-activo"][value="${x.activo}"]`);if(a)a.checked=true;
    const ids=x.examenes_ids?.length?x.examenes_ids.map(Number):[1,2,3,4,5];
    document.querySelectorAll('.lab-ex-chk').forEach(c=>c.checked=ids.includes(parseInt(c.value)));
    hideLabExErr();$a('lab-err').classList.add('d-none');bootstrap.Modal.getOrCreateInstance($a('modal-laboratorio')).show();
}

function saveLab(){
    const n=$a('lab-nombre').value.trim(),nivel=$a('lab-nivel').value,p=Number($a('lab-provincia').value),m=Number($a('lab-municipio').value),activo=document.querySelector('input[name="lab-activo"]:checked')?.value==='true',ids=[...document.querySelectorAll('.lab-ex-chk:checked')].map(c=>parseInt(c.value));
    $a('lab-err').classList.add('d-none');hideLabExErr();
    if(!n)return showLocErr('lab-err','El nombre es obligatorio.');if(!p)return showLocErr('lab-err','Seleccione la provincia.');if(!m)return showLocErr('lab-err','Seleccione el municipio.');
    if(!ids.length){const e=$a('err-lab-examenes');if(e){e.textContent='Seleccione al menos un examen disponible.';e.style.display='block';}return;}
    const a=GEO.getLabs(),id=Number($a('lab-edit-id').value);
    if(id){const i=a.findIndex(x=>x.id===id);a[i]={...a[i],nombre:n,nivel_referencia:nivel,provincia_id:p,municipio_id:m,activo,examenes_ids:ids};}
    else a.push({id:nextGeoId(a),nombre:n,nivel_referencia:nivel,provincia_id:p,municipio_id:m,activo,examenes_ids:ids});
    GEO.saveLabs(a);bootstrap.Modal.getInstance($a('modal-laboratorio'))?.hide();renderLabs();toast(id?'Laboratorio actualizado.':'Laboratorio creado.');
}

document.addEventListener('DOMContentLoaded',()=>{
    $a('btn-new-lab')?.addEventListener('click',()=>{$a('modal-lab-title').innerHTML='<i class="bi bi-flask"></i> Nuevo laboratorio';$a('lab-edit-id').value='';$a('lab-nombre').value='';$a('lab-nivel').value='local';fillProvSelect($a('lab-provincia'));$a('lab-municipio').innerHTML='<option value="">— Seleccione provincia —</option>';$a('lab-municipio').disabled=true;document.querySelector('input[name="lab-activo"][value="true"]')?.click();document.querySelectorAll('.lab-ex-chk').forEach(c=>c.checked=true);hideLabExErr();$a('lab-err').classList.add('d-none');bootstrap.Modal.getOrCreateInstance($a('modal-laboratorio')).show();});
    $a('lab-provincia')?.addEventListener('change',function(){fillMunSelect($a('lab-municipio'),this.value);$a('lab-municipio').disabled=!this.value;});
    $a('btn-save-lab')?.addEventListener('click',saveLab);
    $a('filter-lab')?.addEventListener('input',renderLabs);$a('filter-lab-prov')?.addEventListener('change',renderLabs);$a('filter-lab-nivel')?.addEventListener('change',renderLabs);
});
