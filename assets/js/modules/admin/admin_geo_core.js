/* DatB admin geography core: state, IDs, labels and shared selectors. */
window.GEO = window.GEO || {
    getProvs: () => window._store.geo_provincias || [],
    getMuns: () => window._store.geo_municipios || [],
    getCentros: () => window._store.geo_centros || [],
    getLabs: () => window._store.geo_labs || [],
    saveProvs: v => { window._store.geo_provincias=v; if(typeof sbUpsertRows==='function') sbUpsertRows('provincias',v).catch(console.error); },
    saveMuns: v => { window._store.geo_municipios=v; if(typeof sbUpsertRows==='function') sbUpsertRows('municipios',v).catch(console.error); },
    saveCentros: v => { window._store.geo_centros=v; if(typeof sbUpsertRows==='function') sbUpsertRows('centros_salud',v).catch(console.error); },
    saveLabs: v => { window._store.geo_labs=v; if(typeof sbUpsertRows==='function') sbUpsertRows('laboratorios',v).catch(console.error); }
};
const GEO = window.GEO;

function initGeoData() {
    if(!GEO.getProvs().length && window.DATOS_GEO?.provincias) GEO.saveProvs(DATOS_GEO.provincias.map(p=>({...p})));
    if(!GEO.getMuns().length && window.DATOS_GEO?.municipios) GEO.saveMuns(DATOS_GEO.municipios.map(m=>({...m})));
    if(!GEO.getCentros().length && window.DATOS_GEO?.centros_salud) GEO.saveCentros(DATOS_GEO.centros_salud.map(c=>({...c})));
    if(!GEO.getLabs().length) GEO.saveLabs((DATOS_GEO?.laboratorios||[]).map(l=>({...l,activo:l.activo??true})));
}

const geoProvName = id => GEO.getProvs().find(p=>p.id===Number(id))?.nombre || '—';
const geoMunName = id => GEO.getMuns().find(m=>m.id===Number(id))?.nombre || '—';
const nextGeoId = arr => arr.length ? Math.max(...arr.map(x=>Number(x.id)))+1 : 1;
const nextMunId = (muns,pid) => {
    const ids=muns.filter(m=>m.provincia_id===Number(pid)).map(m=>Number(m.id));
    return ids.length ? Math.max(...ids)+1 : Number(pid)*100+1;
};

function levelBadge(nivel){
    const m={local:'#8fa3bf:#eef3fb',municipal:'#1a56db:#e8f0fe',provincial:'#7c3aed:#f0e8fe',nacional:'#b91c1c:#fee4e2'};
    const [c,b]=(m[nivel]||'#888:#f0f4fa').split(':');
    return `<span style="display:inline-block;padding:.15rem .55rem;border-radius:6px;font-family:var(--font-mono);font-size:.68rem;background:${b};color:${c}">${nivel}</span>`;
}

function showLocErr(id,msg){const e=$a(id);if(e){e.textContent=msg;e.classList.remove('d-none');}}
function hideLabExErr(){const e=$a('err-lab-examenes');if(e)e.style.display='none';}

function fillProvSelect(sel,selectedId){
    if(!sel)return;
    sel.innerHTML='<option value="">— Seleccione —</option>';
    GEO.getProvs().forEach(p=>{const o=new Option(p.nombre,p.id);if(p.id===Number(selectedId))o.selected=true;sel.appendChild(o);});
}
function fillMunSelect(sel,pid,selectedId){
    if(!sel)return;
    sel.innerHTML='<option value="">— Seleccione —</option>';
    GEO.getMuns().filter(m=>m.provincia_id===Number(pid)).forEach(m=>{const o=new Option(m.nombre,m.id);if(m.id===Number(selectedId))o.selected=true;sel.appendChild(o);});
}
function fillCentroSelect(sel,mid,selectedId){
    if(!sel)return;
    sel.innerHTML='<option value="">— Seleccione —</option>';
    GEO.getCentros().filter(c=>c.municipio_id===Number(mid)).forEach(c=>{
        const o=new Option(`${c.nombre}${c.tipo?' ('+c.tipo+')':''}`,c.id);
        if(c.id===Number(selectedId))o.selected=true;
        sel.appendChild(o);
    });
    const o=new Option('Otro / no listado','__otro__');
    if(!selectedId||selectedId==='__otro__')o.selected=true;
    sel.appendChild(o);
    sel.disabled=!mid;
}
