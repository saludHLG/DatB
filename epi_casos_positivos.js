/**
 * epi_casos_positivos.js  v2
 * Pill "Casos positivos" del módulo epidemiológico.
 *
 * Positivo: Baciloscopia codificacion>0 | Cultivo resultado 1-9 |
 *           Xpert Ultra/XDR resultado==='MTB DETECTADO'
 *
 * Vista: tabs por año (descendente) + tabla de pacientes.
 * Filtros adaptativos idénticos a datos_generales.
 * Botón editar → modal con datos epidemiológicos del paciente.
 *
 * Dependencias: moderadores_core.js, utils.js
 */

'use strict';

const _CP_PAGE_SIZE      = 50;
const _CP_CONTACTO_TB_ID = 2;   // id del grupo "Contacto TB"

// ─── Estado ────────────────────────────────────────────────────────────────────
const _cpState = {
  yearActual: null,
  filtros: {
    provincia_id: null,
    municipio_id: null,
    centro_id:    null,
    search:       '',
    fecha_desde:  '',
    fecha_hasta:  '',
  },
  pagina: 1,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function _cpNorm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function _cpFmt(f)  {
  if (!f) return '—';
  const p = String(f).split('T')[0].split('-');
  return p.length < 3 ? f : `${p[2]}/${p[1]}/${p[0]}`;
}
function _cpEdad(fechaNac) {
  if (!fechaNac) return '—';
  const hoy = new Date(), nac = new Date(fechaNac+'T00:00:00');
  let e = hoy.getFullYear()-nac.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) e--;
  return e;
}
const _CP_EX = { 1:'BACI', 2:'CULT', 3:'XPERT-U', 5:'XPERT-XDR' };

function _cpGetRec(recs, indId, eid) {
  const e = recs.find(r => r.indicacion_id===indId && Number(r.examen_id)===eid);
  if (e) return e;
  const all = recs.filter(r => r.indicacion_id===indId);
  return (all.length===1 && !all[0].examen_id) ? all[0] : null;
}
function _cpIsPositive(recId, eid) {
  const n = Number(eid);
  if (n===1) { const r=(window._store?.res_baci||[]).find(x=>x.recepcion_id===recId); return !!(r&&r.codificacion>0); }
  if (n===2) { const r=(window._store?.res_cultivo||[]).find(x=>x.recepcion_id===recId); return !!(r&&/^[1-9]$/.test(r.resultado)); }
  if (n===3) { const r=(window._store?.res_xpert_ultra||[]).find(x=>x.recepcion_id===recId); return !!(r&&r.resultado==='MTB DETECTADO'); }
  if (n===5) { const r=(window._store?.res_xpert_xdr||[]).find(x=>x.recepcion_id===recId); return !!(r&&r.resultado==='MTB DETECTADO'); }
  return false;
}
function _cpMedicoNombre(ind) {
  if (ind.medico&&(ind.medico.nombres||ind.medico.apellidos))
    return [ind.medico.nombres,ind.medico.apellidos].filter(Boolean).join(' ')||'—';
  const u = (window._store?.usuarios||[]).find(x=>x.id===ind.indicado_por);
  return u ? `${u.nombres||''} ${u.apellidos||''}`.trim()||'—' : '—';
}

// ─── Nivel del moderador ──────────────────────────────────────────────────────
function _cpGetNivel() {
  if (typeof _getModeradorNivel !== 'function') return 'nacional';
  return _getModeradorNivel() || 'nacional';
}

// ─── Índice de casos por año ──────────────────────────────────────────────────
// Estructura: { año → { pacId → { pac, exIds:Set, fechaMin, medico, geo } } }
function _cpGetCasos() {
  const allInds = window._store?.indicaciones || [];
  const pacs    = window._store?.pacientes    || [];
  const recs    = window._store?.recepciones  || [];
  const users   = window._store?.usuarios     || [];
  const muns    = window._store?.geo_municipios || [];

  const inds = typeof _filtrarIndicacionesPorNivel === 'function'
    ? _filtrarIndicacionesPorNivel(allInds)
    : allInds;

  const byYear = {};

  inds.forEach(ind => {
    const year = (ind.fecha_indicacion||'').slice(0,4);
    if (!year||year.length!==4) return;

    const ind_u = users.find(u => u.id === ind.indicado_por) || null;

    // Contexto geográfico
    const reqCentroId = ind_u?.centro_salud_id ? Number(ind_u.centro_salud_id) : null;
    const reqMunId    = ind_u?.municipio_id    ? Number(ind_u.municipio_id)    : null;
    const reqMun      = reqMunId ? muns.find(m=>m.id===reqMunId) : null;
    const reqProvId   = reqMun?.provincia_id
      ? Number(reqMun.provincia_id)
      : (ind_u?.provincia_id ? Number(ind_u.provincia_id) : null);

    (ind.examenes_ids||[]).forEach(eidRaw => {
      const eid = Number(eidRaw);
      const rec = _cpGetRec(recs, ind.id, eid);
      if (!rec||rec.estado==='rechazada') return;
      if (!_cpIsPositive(rec.id, eid)) return;

      const pac = pacs.find(p => p.id===ind.paciente_id);
      if (!pac) return;

      const pacMunId  = pac.municipio_id ? Number(pac.municipio_id) : null;
      const pacMun    = pacMunId ? muns.find(m=>m.id===pacMunId) : null;
      const pacProvId = pacMun?.provincia_id ? Number(pacMun.provincia_id) : null;

      if (!byYear[year]) byYear[year]={};
      if (!byYear[year][pac.id]) {
        byYear[year][pac.id] = {
          pac, exIds:new Set(), fechaMin:ind.fecha_indicacion,
          medico: _cpMedicoNombre(ind),
          geo: { reqCentroId, reqMunId, reqProvId, pacMunId, pacProvId },
          pac_search: _cpNorm(`${pac.nombres||''} ${pac.apellidos||''} ${pac.carnet_identidad||''}`),
        };
      }
      const e = byYear[year][pac.id];
      e.exIds.add(eid);
      if (ind.fecha_indicacion < e.fechaMin) {
        e.fechaMin = ind.fecha_indicacion;
        e.medico   = _cpMedicoNombre(ind);
      }
    });
  });

  return byYear;
}

function _cpGetYears(byYear) {
  return Object.keys(byYear).sort((a,b)=>Number(b)-Number(a));
}

// ─── Filas filtradas para un año ──────────────────────────────────────────────
function _cpGetFilasAnio(byYear, year) {
  if (!byYear[year]) return [];
  const muns = window._store?.geo_municipios || [];
  const { provincia_id, municipio_id, centro_id, search, fecha_desde, fecha_hasta } = _cpState.filtros;
  const q = _cpNorm(search);

  return Object.values(byYear[year]).filter(({ fechaMin, geo, pac_search }) => {
    if (provincia_id) {
      if (geo.reqProvId !== provincia_id && geo.pacProvId !== provincia_id) return false;
    }
    if (municipio_id) {
      if (geo.reqMunId !== municipio_id && geo.pacMunId !== municipio_id) return false;
    }
    if (centro_id && geo.reqCentroId !== centro_id) return false;
    if (fecha_desde && fechaMin < fecha_desde) return false;
    if (fecha_hasta && fechaMin > fecha_hasta) return false;
    if (q && !pac_search.includes(q)) return false;
    return true;
  }).map(({ pac, exIds, fechaMin, medico }) => {
    const munNom = pac.municipio_id
      ? (muns.find(m=>m.id===Number(pac.municipio_id))?.nombre || '—')
      : '—';
    const exTags = [...exIds].sort((a,b)=>a-b)
      .map(eid=>`<span class="cp-ex-pos-tag">${_CP_EX[eid]||eid}</span>`).join(' ');
    return {
      pac, munNom, exTags, fechaMin,
      medico,
      edad: _cpEdad(pac.fecha_nacimiento),
      sexo: pac.sexo==='M'?'Masc.':pac.sexo==='F'?'Fem.':'—',
    };
  }).sort((a,b)=>(a.pac.apellidos||'').localeCompare(b.pac.apellidos||''));
}

// ─── Catálogos adaptativos (reutilizan el mismo enfoque que datos_generales) ──
function _cpGetProvs() {
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  const provs = (window._store?.geo_provincias||[]).slice().sort((a,b)=>a.nombre.localeCompare(b.nombre));
  if (!scope||scope.nivel==='nacional') return provs;
  if (scope.provincia_id) return provs.filter(p=>p.id===scope.provincia_id);
  return provs;
}
function _cpGetMuns(provId) {
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  let m = (window._store?.geo_municipios||[]).filter(m=>!provId||m.provincia_id===Number(provId)).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  if (scope?.nivel==='municipal'&&scope.municipio_id) m=m.filter(x=>x.id===scope.municipio_id);
  return m;
}
function _cpGetCentros(munId) {
  const users = window._store?.usuarios||[];
  const inds  = typeof _filtrarIndicacionesPorNivel==='function'
    ? _filtrarIndicacionesPorNivel(window._store?.indicaciones||[])
    : (window._store?.indicaciones||[]);
  const ids = new Set();
  inds.forEach(ind => { const u=users.find(x=>x.id===ind.indicado_por); if(u?.centro_salud_id) ids.add(Number(u.centro_salud_id)); });
  return (window._store?.geo_centros||[]).filter(c=>ids.has(c.id)).sort((a,b)=>a.nombre.localeCompare(b.nombre));
}

// ─── HTML ──────────────────────────────────────────────────────────────────────
function _cpHTML(nivel) {
  const showProv   = nivel === 'nacional';
  const showMun    = nivel === 'nacional' || nivel === 'provincial';
  const showCentro = nivel !== 'institucional';

  return `
  <div class="cp-wrapper">
    <div class="dg-filtros-panel" style="margin-bottom:1rem">
      <div class="dg-filtros-grid">

        <div class="dg-filtro-grupo" style="grid-column:1/-1">
          <label class="dg-label" for="cp_search">Buscar paciente</label>
          <div style="position:relative">
            <i class="bi bi-search" style="position:absolute;left:.7rem;top:50%;transform:translateY(-50%);color:#8fa3bf;pointer-events:none;font-size:.9rem"></i>
            <input id="cp_search" type="text" class="dg-input" style="padding-left:2.2rem"
                   placeholder="Nombre, apellidos o carnet de identidad…" autocomplete="off">
          </div>
        </div>

        ${showProv ? `
        <div class="dg-filtro-grupo">
          <label class="dg-label" for="cp_prov">Provincia</label>
          <select id="cp_prov" class="dg-input"><option value="">Todas las provincias</option></select>
        </div>` : ''}

        ${showMun ? `
        <div class="dg-filtro-grupo">
          <label class="dg-label" for="cp_mun">Municipio</label>
          <select id="cp_mun" class="dg-input" ${showProv?'disabled':''}><option value="">Todos los municipios</option></select>
        </div>` : ''}

        ${showCentro ? `
        <div class="dg-filtro-grupo">
          <label class="dg-label" for="cp_centro">Centro solicitante</label>
          <select id="cp_centro" class="dg-input"><option value="">Todos los centros</option></select>
        </div>` : ''}

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="cp_fecha_desde">Fecha desde</label>
          <input id="cp_fecha_desde" type="date" class="dg-input">
        </div>
        <div class="dg-filtro-grupo">
          <label class="dg-label" for="cp_fecha_hasta">Fecha hasta</label>
          <input id="cp_fecha_hasta" type="date" class="dg-input">
        </div>
        <div class="dg-filtro-grupo dg-filtro-accion">
          <button id="cp_btn_limpiar" class="dg-btn dg-btn-sec" type="button" title="Limpiar filtros">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar
          </button>
        </div>

      </div>
    </div>

    <div id="cp_year_tabs" class="lab-subtabs mb-3"></div>

    <div class="dg-tabla-wrap">
      <div class="dg-tabla-meta" id="cp_meta">Cargando…</div>
      <div class="dg-tabla-scroll">
        <table class="dg-tabla">
          <thead><tr>
            <th>Nombres y apellidos</th>
            <th>Carnet identidad</th>
            <th style="text-align:center">Edad</th>
            <th style="text-align:center">Sexo</th>
            <th>Municipio del paciente</th>
            <th>Exámenes positivos</th>
            <th>Fecha primer positivo</th>
            <th>Médico solicitante</th>
            <th style="text-align:center">Datos epidem.</th>
          </tr></thead>
          <tbody id="cp_tbody"></tbody>
        </table>
      </div>
      <div class="dg-paginacion" id="cp_paginacion"></div>
    </div>
  </div>

  <style>
    .cp-wrapper { display:flex; flex-direction:column; gap:0; }
    .cp-ex-pos-tag {
      display:inline-block; padding:.12em .5em; border-radius:5px;
      background:#fee2e2; color:#991b1b;
      font-family:'IBM Plex Mono',monospace; font-size:.7rem; font-weight:700;
      margin-right:.2rem;
    }
  </style>`;
}

// ─── Poblar selectores ────────────────────────────────────────────────────────
function _cpPoblarProvs() {
  const s=document.getElementById('cp_prov'); if(!s) return;
  s.innerHTML='<option value="">Todas las provincias</option>';
  _cpGetProvs().forEach(p=>{ const o=new Option(p.nombre,p.id); if(_cpState.filtros.provincia_id===p.id) o.selected=true; s.appendChild(o); });
}
function _cpPoblarMuns(provId) {
  const s=document.getElementById('cp_mun'); if(!s) return;
  s.innerHTML='<option value="">Todos los municipios</option>';
  if(!provId&&document.getElementById('cp_prov')){ s.disabled=true; return; }
  _cpGetMuns(provId).forEach(m=>{ const o=new Option(m.nombre,m.id); if(_cpState.filtros.municipio_id===m.id) o.selected=true; s.appendChild(o); });
  s.disabled=false;
}
function _cpPoblarCentros() {
  const s=document.getElementById('cp_centro'); if(!s) return;
  s.innerHTML='<option value="">Todos los centros</option>';
  _cpGetCentros(null).forEach(c=>{ const o=new Option(c.nombre,c.id); if(_cpState.filtros.centro_id===c.id) o.selected=true; s.appendChild(o); });
}

// ─── Binding de filtros ───────────────────────────────────────────────────────
function _cpBindFiltros(contenedor, nivel, byYear) {
  const refresh = () => { _cpState.pagina=1; _cpRefrescar(contenedor,byYear); };

  document.getElementById('cp_search')?.addEventListener('input',e=>{ _cpState.filtros.search=e.target.value.trim(); refresh(); });

  document.getElementById('cp_prov')?.addEventListener('change',e=>{
    _cpState.filtros.provincia_id=e.target.value?Number(e.target.value):null;
    _cpState.filtros.municipio_id=null; _cpState.filtros.centro_id=null;
    _cpPoblarMuns(_cpState.filtros.provincia_id);
    refresh();
  });
  document.getElementById('cp_mun')?.addEventListener('change',e=>{
    _cpState.filtros.municipio_id=e.target.value?Number(e.target.value):null;
    _cpState.filtros.centro_id=null; refresh();
  });
  document.getElementById('cp_centro')?.addEventListener('change',e=>{
    _cpState.filtros.centro_id=e.target.value?Number(e.target.value):null; refresh();
  });
  document.getElementById('cp_fecha_desde')?.addEventListener('change',e=>{ _cpState.filtros.fecha_desde=e.target.value; refresh(); });
  document.getElementById('cp_fecha_hasta')?.addEventListener('change',e=>{ _cpState.filtros.fecha_hasta=e.target.value; refresh(); });

  document.getElementById('cp_btn_limpiar')?.addEventListener('click',()=>{
    _cpState.filtros={ provincia_id:null,municipio_id:null,centro_id:null,search:'',fecha_desde:'',fecha_hasta:'' };
    ['cp_search','cp_fecha_desde','cp_fecha_hasta'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    if(nivel==='nacional') { _cpPoblarProvs(); _cpPoblarMuns(null); }
    else if(nivel==='provincial') _cpPoblarMuns(null);
    _cpPoblarCentros();
    refresh();
  });
}

// ─── Modal de edición ─────────────────────────────────────────────────────────
function _cpEnsureModal() {
  if (document.getElementById('cp-edit-modal')) return;
  const el=document.createElement('div');
  el.className='modal fade'; el.id='cp-edit-modal'; el.tabIndex=-1; el.setAttribute('aria-hidden','true');
  el.innerHTML=`
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
    <div class="modal-content" style="border-radius:14px;border:none;color:#0b1e3d">
      <div class="modal-header" style="background:#f8fbff;border-bottom:1.5px solid #dce8f5;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:.75rem">
          <div id="cp-av" style="width:2.75rem;height:2.75rem;border-radius:50%;background:#0b1e3d;color:#00c6b8;
               font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;
               display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
          <div>
            <h5 id="cp-ttl" class="modal-title mb-0" style="font-family:'Syne',sans-serif;font-weight:700;color:#0b1e3d;font-size:1rem"></h5>
            <span id="cp-ci-lbl" style="font-family:'IBM Plex Mono',monospace;font-size:.75rem;color:#8fa3bf"></span>
          </div>
        </div>
        <button type="button" data-bs-dismiss="modal"
                style="background:none;border:none;color:#8fa3bf;font-size:1.1rem;cursor:pointer;padding:.25rem">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="modal-body" style="padding:1.25rem;color:#0b1e3d;background:#fff">
        <input type="hidden" id="cp-pac-id">
        <div class="row g-3">
          <div class="col-sm-6">
            <label class="admin-label">Nombres <span style="color:#e0435a">*</span></label>
            <input type="text" id="cp-nombres" class="form-control">
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Apellidos <span style="color:#e0435a">*</span></label>
            <input type="text" id="cp-apellidos" class="form-control">
          </div>
          <div class="col-sm-4">
            <label class="admin-label">Carnet de identidad</label>
            <input type="text" id="cp-ci" class="form-control" readonly style="font-family:'IBM Plex Mono',monospace;background:#f8fbff">
          </div>
          <div class="col-sm-8">
            <label class="admin-label">Dirección particular</label>
            <input type="text" id="cp-dir" class="form-control" placeholder="Calle, número, reparto…">
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Provincia</label>
            <select id="cp-prov-m" class="form-select admin-select"><option value="">— Seleccione —</option></select>
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Municipio</label>
            <select id="cp-mun-m" class="form-select admin-select" disabled><option value="">— Seleccione provincia —</option></select>
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Área de salud</label>
            <select id="cp-area-m" class="form-select admin-select" disabled><option value="">— Sin especificar —</option></select>
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Consultorio médico de la familia</label>
            <input type="text" id="cp-cmf" class="form-control" placeholder="Ej: CMF 12, Consultorio #5…">
          </div>
        </div>
        <hr style="margin:1.25rem 0;border-color:#dce8f5">
        <div>
          <label class="admin-label" style="margin-bottom:.65rem;display:block">
            <i class="bi bi-exclamation-triangle me-1"></i>Grupos de vulnerabilidad
          </label>
          <div id="cp-gv-grid" class="row g-2"></div>
          <div id="cp-contacto-wrap" class="mt-3 d-none">
            <label class="admin-label">Contacto de (especificar)</label>
            <input type="text" id="cp-contacto-spec" class="form-control"
                   placeholder="Nombre del caso índice, parentesco, unidad…">
            <div class="form-text" style="font-size:.77rem;color:#8fa3bf">
              <i class="bi bi-info-circle me-1"></i>Indique de quién es contacto este paciente.
            </div>
          </div>
        </div>
        <div id="cp-alert" class="alert-custom d-none mt-3"></div>
      </div>
      <div class="modal-footer" style="background:#f8fbff;border-top:1.5px solid #dce8f5;padding:.85rem 1.25rem;gap:.5rem;justify-content:flex-end">
        <button type="button" data-bs-dismiss="modal" class="btn-secondary-custom">Cancelar</button>
        <button type="button" id="cp-btn-save" class="btn-primary-custom">
          <i class="bi bi-floppy"></i> Guardar
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(el);
}

// ─── Selectores del modal ─────────────────────────────────────────────────────
function _cpModalFillProv(pac) {
  const s=document.getElementById('cp-prov-m'); if(!s) return;
  const provs=(typeof getGeoProvs==='function'?getGeoProvs():(window._store?.geo_provincias||[])).slice().sort((a,b)=>a.nombre.localeCompare(b.nombre));
  s.innerHTML='<option value="">— Seleccione —</option>';
  provs.forEach(p=>{ const o=new Option(p.nombre,p.id); s.appendChild(o); });
  const muns=typeof getGeoMuns==='function'?getGeoMuns():(window._store?.geo_municipios||[]);
  const pacMun=pac.municipio_id?muns.find(m=>m.id===Number(pac.municipio_id)):null;
  const provId=pacMun?.provincia_id?Number(pacMun.provincia_id):null;
  if(provId) s.value=provId;
  _cpModalFillMun(provId,pac.municipio_id);
  s.onchange=function(){ _cpModalFillMun(this.value?Number(this.value):null,null); _cpModalFillArea(null,null); };
}
function _cpModalFillMun(provId,selMunId) {
  const s=document.getElementById('cp-mun-m'); if(!s) return;
  s.innerHTML='<option value="">— Seleccione —</option>';
  if(!provId){ s.disabled=true; return; }
  const muns=(typeof getGeoMuns==='function'?getGeoMuns():(window._store?.geo_municipios||[])).filter(m=>m.provincia_id===provId).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  muns.forEach(m=>{ const o=new Option(m.nombre,m.id); if(selMunId&&Number(m.id)===Number(selMunId)) o.selected=true; s.appendChild(o); });
  s.disabled=false;
  const munVal=s.value?Number(s.value):null;
  if(munVal) _cpModalFillArea(munVal,null);
  s.onchange=function(){ _cpModalFillArea(this.value?Number(this.value):null,null); };
}
function _cpModalFillArea(munId,selAreaId) {
  const s=document.getElementById('cp-area-m'); if(!s) return;
  s.innerHTML='<option value="">— Sin especificar —</option>';
  if(!munId){ s.disabled=true; return; }
  const centros=(typeof getGeoCentros==='function'?getGeoCentros():(window._store?.geo_centros||[])).filter(c=>c.municipio_id===munId&&c.tipo==='área de salud').sort((a,b)=>a.nombre.localeCompare(b.nombre));
  centros.forEach(c=>{ const o=new Option(c.nombre,c.id); if(selAreaId&&Number(c.id)===Number(selAreaId)) o.selected=true; s.appendChild(o); });
  s.disabled=centros.length===0;
}
function _cpModalFillGV(pac) {
  const grid=document.getElementById('cp-gv-grid'); if(!grid) return;
  const gvCat=(window._store?.grupos_vulnerables||[]).filter(g=>g.activo!==false);
  const checked=pac.grupos_ids||[];
  grid.innerHTML=gvCat.map(g=>`
    <div class="col-12 col-md-6 col-lg-4">
      <div class="form-check" style="font-size:.84rem">
        <input class="form-check-input cp-gv-chk" type="checkbox" id="cp-gv-${g.id}" value="${g.id}" ${checked.includes(g.id)?'checked':''}>
        <label class="form-check-label" for="cp-gv-${g.id}">${g.nombre}</label>
      </div>
    </div>`).join('');
  const toggle=()=>{
    const hay=[...document.querySelectorAll('.cp-gv-chk')].some(c=>Number(c.value)===_CP_CONTACTO_TB_ID&&c.checked);
    document.getElementById('cp-contacto-wrap')?.classList.toggle('d-none',!hay);
  };
  grid.querySelectorAll('.cp-gv-chk').forEach(c=>c.addEventListener('change',toggle));
  toggle();
}

// ─── Abrir modal ──────────────────────────────────────────────────────────────
function _cpAbrirModal(pacId, contenedor, byYear) {
  const pac=(window._store?.pacientes||[]).find(p=>p.id===pacId);
  if(!pac) return;
  _cpEnsureModal();
  const ini=[(pac.nombres||'')[0]||'',(pac.apellidos||'')[0]||''].join('').toUpperCase()||'??';
  document.getElementById('cp-av').textContent     = ini;
  document.getElementById('cp-ttl').textContent    = `${pac.nombres} ${pac.apellidos}`;
  document.getElementById('cp-ci-lbl').textContent = `CI: ${pac.carnet_identidad}`;
  document.getElementById('cp-pac-id').value       = pac.id;
  document.getElementById('cp-nombres').value      = pac.nombres   ||'';
  document.getElementById('cp-apellidos').value    = pac.apellidos ||'';
  document.getElementById('cp-ci').value           = pac.carnet_identidad||'';
  document.getElementById('cp-dir').value          = pac.direccion ||'';
  document.getElementById('cp-cmf').value          = pac.consultorio_cmf||'';
  document.getElementById('cp-contacto-spec').value= pac.contacto_tb_especificacion||'';
  ['cp-nombres','cp-apellidos'].forEach(id=>document.getElementById(id)?.classList.remove('is-invalid'));
  document.getElementById('cp-alert')?.classList.add('d-none');
  _cpModalFillProv(pac);
  const munId=pac.municipio_id?Number(pac.municipio_id):null;
  if(munId) _cpModalFillArea(munId,pac.area_salud_id);
  _cpModalFillGV(pac);
  document.getElementById('cp-btn-save').onclick=()=>_cpGuardar(contenedor,byYear);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('cp-edit-modal')).show();
}

// ─── Guardar ──────────────────────────────────────────────────────────────────
async function _cpGuardar(contenedor, byYear) {
  const alertEl=document.getElementById('cp-alert');
  const pacId    =document.getElementById('cp-pac-id').value;
  const nombres  =document.getElementById('cp-nombres').value.trim();
  const apellidos=document.getElementById('cp-apellidos').value.trim();
  let ok=true;
  if(!nombres) { document.getElementById('cp-nombres').classList.add('is-invalid'); ok=false; }
  if(!apellidos){ document.getElementById('cp-apellidos').classList.add('is-invalid'); ok=false; }
  if(!ok){ alertEl.className='alert-custom alert-danger'; alertEl.textContent='Nombres y apellidos son obligatorios.'; alertEl.classList.remove('d-none'); return; }

  const grupos_ids=[...document.querySelectorAll('.cp-gv-chk:checked')].map(c=>parseInt(c.value));
  const hasContacto=grupos_ids.includes(_CP_CONTACTO_TB_ID);
  const munVal =document.getElementById('cp-mun-m').value;
  const areaVal=document.getElementById('cp-area-m').value;

  const cambios={
    nombres, apellidos,
    direccion:                    document.getElementById('cp-dir').value.trim()||null,
    municipio_id:                 munVal  ?Number(munVal)  :null,
    area_salud_id:                areaVal ?Number(areaVal) :null,
    consultorio_cmf:              document.getElementById('cp-cmf').value.trim()||null,
    grupos_ids,
    contacto_tb_especificacion:   hasContacto?(document.getElementById('cp-contacto-spec').value.trim()||null):null,
  };

  const idx=(window._store?.pacientes||[]).findIndex(p=>p.id===pacId);
  if(idx!==-1) Object.assign(window._store.pacientes[idx],cambios);

  const btnSave=document.getElementById('cp-btn-save');
  btnSave.disabled=true;
  if(typeof sbUpdateRow==='function')
    await sbUpdateRow('pacientes',pacId,cambios).catch(e=>console.error('cp save:',e));

  alertEl.className='alert-custom alert-success';
  alertEl.innerHTML='<i class="bi bi-check-circle-fill me-1"></i>Datos actualizados correctamente.';
  alertEl.classList.remove('d-none');

  setTimeout(()=>{
    bootstrap.Modal.getInstance(document.getElementById('cp-edit-modal'))?.hide();
    btnSave.disabled=false;
    const newByYear=_cpGetCasos();
    _cpRenderYearTabs(contenedor,newByYear,_cpGetYears(newByYear));
    _cpRefrescar(contenedor,newByYear);
  },1200);
}

// ─── Tabs de año ──────────────────────────────────────────────────────────────
function _cpRenderYearTabs(contenedor, byYear, years) {
  const wrap=document.getElementById('cp_year_tabs'); if(!wrap) return;
  wrap.innerHTML=years.map(y=>{
    const n=Object.keys(byYear[y]||{}).length;
    return `<button class="lab-subtab-btn${_cpState.yearActual===y?' active':''}" data-year="${y}">
      ${y} <span style="margin-left:.35rem;font-size:.7rem;opacity:.8">(${n})</span>
    </button>`;
  }).join('');
  wrap.querySelectorAll('.lab-subtab-btn').forEach(btn=>{
    btn.addEventListener('click',function(){
      _cpState.yearActual=this.dataset.year; _cpState.pagina=1;
      _cpRefrescar(contenedor,byYear);
    });
  });
}

// ─── Tabla ────────────────────────────────────────────────────────────────────
function _cpRefrescar(contenedor, byYear) {
  document.getElementById('cp_year_tabs')?.querySelectorAll('.lab-subtab-btn').forEach(b=>{
    b.classList.toggle('active',b.dataset.year===_cpState.yearActual);
  });

  const filas=_cpGetFilasAnio(byYear,_cpState.yearActual);
  const total=filas.length;
  const totalPags=Math.max(1,Math.ceil(total/_CP_PAGE_SIZE));
  _cpState.pagina=Math.min(_cpState.pagina,totalPags);
  const inicio=(_cpState.pagina-1)*_CP_PAGE_SIZE;
  const pag=filas.slice(inicio,inicio+_CP_PAGE_SIZE);

  const meta=document.getElementById('cp_meta');
  if(meta) meta.textContent=total===0
    ?`Sin casos positivos${_cpState.yearActual?' en '+_cpState.yearActual:''}  para los filtros seleccionados.`
    :`${_cpState.yearActual} · Mostrando ${inicio+1}–${Math.min(inicio+_CP_PAGE_SIZE,total)} de ${total} caso${total!==1?'s':''}`;

  const tbody=document.getElementById('cp_tbody');
  if(tbody){
    tbody.innerHTML=pag.length
      ?pag.map(f=>`
        <tr>
          <td style="font-weight:500;min-width:160px">${f.pac.apellidos}, ${f.pac.nombres}</td>
          <td class="dg-ci">${f.pac.carnet_identidad||'—'}</td>
          <td style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:.82rem">${f.edad}</td>
          <td style="text-align:center;font-size:.82rem">${f.sexo}</td>
          <td style="font-size:.82rem">${f.munNom}</td>
          <td>${f.exTags}</td>
          <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.78rem">${_cpFmt(f.fechaMin)}</td>
          <td style="font-size:.82rem">${f.medico}</td>
          <td style="text-align:center">
            <button class="btn-primary-custom btn-sm-lab cp-btn-edit"
                    data-pac-id="${f.pac.id}" title="Editar datos epidemiológicos">
              <i class="bi bi-pencil-square"></i>
            </button>
          </td>
        </tr>`).join('')
      :`<tr><td colspan="9" class="dg-tabla-vacia">Sin casos positivos en ${_cpState.yearActual||'—'}.</td></tr>`;

    tbody.querySelectorAll('.cp-btn-edit').forEach(btn=>{
      btn.addEventListener('click',()=>_cpAbrirModal(btn.dataset.pacId,contenedor,byYear));
    });
  }

  _cpPag(totalPags,contenedor,byYear);
}

function _cpPag(totalPags,contenedor,byYear){
  const wrap=document.getElementById('cp_paginacion'); if(!wrap) return;
  if(totalPags<=1){ wrap.innerHTML=''; return; }
  const pag=_cpState.pagina;
  const pp=[];
  if(totalPags<=7){ for(let i=1;i<=totalPags;i++) pp.push(i); }
  else{
    pp.push(1); if(pag>3) pp.push('…');
    for(let i=Math.max(2,pag-1);i<=Math.min(totalPags-1,pag+1);i++) pp.push(i);
    if(pag<totalPags-2) pp.push('…'); pp.push(totalPags);
  }
  wrap.innerHTML=`
    <button class="dg-pag-btn" data-pag="${pag-1}" ${pag===1?'disabled':''}>‹</button>
    ${pp.map(p=>p==='…'?`<span class="dg-pag-ellipsis">…</span>`:`<button class="dg-pag-btn${p===pag?' active':''}" data-pag="${p}">${p}</button>`).join('')}
    <button class="dg-pag-btn" data-pag="${pag+1}" ${pag===totalPags?'disabled':''}>›</button>`;
  wrap.querySelectorAll('.dg-pag-btn:not([disabled])').forEach(btn=>{
    btn.addEventListener('click',()=>{ _cpState.pagina=+btn.dataset.pag; _cpRefrescar(contenedor,byYear); });
  });
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────
function _initEpiCasosPositivos(contenedor) {
  if (!contenedor) return;
  _cpState.yearActual=null; _cpState.pagina=1;
  _cpState.filtros={ provincia_id:null,municipio_id:null,centro_id:null,search:'',fecha_desde:'',fecha_hasta:'' };

  const nivel=_cpGetNivel();
  contenedor.innerHTML=_cpHTML(nivel);
  _cpEnsureModal();

  // Poblar selectores
  if(nivel==='nacional') { _cpPoblarProvs(); _cpPoblarMuns(null); }
  else if(nivel==='provincial') _cpPoblarMuns(null);
  _cpPoblarCentros();

  const byYear=_cpGetCasos();
  const years=_cpGetYears(byYear);

  if(!years.length){
    document.getElementById('cp_meta').textContent='No se registran casos positivos en el período accesible.';
    return;
  }

  _cpState.yearActual=years[0];
  _cpRenderYearTabs(contenedor,byYear,years);
  _cpBindFiltros(contenedor,nivel,byYear);
  _cpRefrescar(contenedor,byYear);
}

window._initEpiCasosPositivos = _initEpiCasosPositivos;
