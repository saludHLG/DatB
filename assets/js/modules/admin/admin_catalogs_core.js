/* DatB admin catalog shared helpers/defaults. */
window.ADMIN_CAT = window.ADMIN_CAT || {
    tables:{grupos_vulnerables:'grupos_vulnerables',tipos_muestra:'tipos_muestra',microorganismos:'microorganismos'},
    sync:{grupos_vulnerables:'sr_grupos_vulnerables',tipos_muestra:'sr_tipos_muestra',microorganismos:'sr_microorganismos'},
    gv:['Antiguo caso de TB','Contacto TB','Cubano viviendo en países de alta carga de TB','Desnutrición','Diabetes mellitus','Enfermedad respiratoria crónica','Extranjero proveniente de país de alta carga de TB','Fumador','Insuficiencia renal crónica','Lesiones radiográficas antiguas','Minero','Niños ≤ 5 años','Persona que consume drogas','Personas en internamiento prolongado','Recluso o Exrecluso','Sin hogar','Trabajador de salud relacionado con la atención a pacientes','Trabajador de unidad penitenciaria','Trastornos por consumo de alcohol','Vivir en hacinamiento, poca ventilación y luz solar, barrios marginales','VIH','Adulto ≥ 60 años'],
    tm:['Aspirado bronquial','BAAF ganglio','Biopsias de tejido','Broncoscopía','Contenido gástrico','Esputo 1','Esputo 2','Esputo 3','Esputo evolutivo','Exudado de lesión','Exudado faríngeo','Ganglio mesentérico','L. Articular','L. Ascítico','L. Pericárdico','L. Peritoneal','L. Pleural','Lavado bronquial','LCR','Líquido sinovial','Médula ósea','Orina','Pus de lesión','Secreción'],
    micro:[{id:1,nombre:'Mycobacterium tuberculosis',sistema:true,activo:true},{id:2,nombre:'MNTB (Micobacteria No Tuberculosa)',sistema:true,activo:true}]
};
const _getCat=k=>window._store[k]||[];
const _saveCat=(k,a)=>{window._store[k]=a;if(typeof sbSyncCatalogo==='function')sbSyncCatalogo(ADMIN_CAT.sync[k]||k,a).catch(e=>console.error('catalog sync:',e.message));};
const _initCat=(k,d)=>{if(_getCat(k).length)return;_saveCat(k,k==='microorganismos'?d.map(x=>({...x})):d.map((nombre,i)=>({id:i+1,nombre,activo:true})))};
const _nextCatId=a=>a.length?Math.max(...a.map(x=>Number(x.id)))+1:1;
const _catBadge=i=>`<span class="cat-badge ${i.activo?'cat-badge-active':'cat-badge-inactive'}">${i.activo?'Activo':'Inactivo'}</span>`;
const _catDelete=(k,id,render)=>{const a=_getCat(k),i=a.find(x=>x.id===id);if(!i)return;const m=bootstrap.Modal.getOrCreateInstance($a('modal-delete'));$a('delete-confirm-msg').textContent=`¿Eliminar "${i.nombre}"? Esta acción no se puede deshacer.`;window._confirmCatalogDelete=()=>{_saveCat(k,a.filter(x=>x.id!==id));if(typeof sbDeleteRow==='function')sbDeleteRow(ADMIN_CAT.tables[k],id);m.hide();render();toast('Ítem eliminado.','info')};m.show()};
