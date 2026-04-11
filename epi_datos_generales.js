/**
 * epi_datos_generales.js  v3
 * Pill "Datos generales" del módulo epidemiológico.
 *
 * Una fila por (indicación × examen), ordenadas por fecha descendente.
 *
 * Columnas:
 *   Fecha indicación | Nombres y apellidos | CI |
 *   Tipo examen | Laboratorio | Médico solicitante |
 *   N.° muestra | Fecha resultado | Resultado
 *
 * Filtros adaptativos según nivel del moderador:
 *   Nacional      → Búsqueda | Provincia → Municipio → Institución | Fechas
 *   Provincial    → Búsqueda | Municipio → Institución | Fechas
 *   Municipal     → Búsqueda | Institución | Fechas
 *   Institucional → Búsqueda | Fechas
 *
 * Institución = centro_salud del usuario que indicó el examen.
 *
 * Dependencias: moderadores_core.js, utils.js
 */

'use strict';

const _DG_PAGE_SIZE = 50;

// ─── Estado ────────────────────────────────────────────────────────────────────
const _dgState = {
  filtros: {
    provincia_id:  null,
    municipio_id:  null,
    centro_id:     null,
    search:        '',
    fecha_desde:   '',
    fecha_hasta:   '',
  },
  pagina: 1,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function _dgNorm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function _dgFmt(f) {
  if (!f) return '—';
  const p = String(f).split('T')[0].split('-');
  return p.length < 3 ? f : `${p[2]}/${p[1]}/${p[0]}`;
}
function _dgExInfo(eid) {
  const cat = [
    { id:1, nombre:'Baciloscopia',          codigo:'BACI'      },
    { id:2, nombre:'Cultivo',               codigo:'CULT'      },
    { id:3, nombre:'Xpert MTB/RIF (Ultra)', codigo:'XPERT-U'   },
    { id:4, nombre:'MF-LED',                codigo:'MF-LED'    },
    { id:5, nombre:'Xpert MTB/XDR',         codigo:'XPERT-XDR' },
  ];
  return cat.find(e => e.id === Number(eid)) || { nombre:`Examen ${eid}`, codigo:`${eid}` };
}
function _dgLabNombre(labId) {
  return (window._store?.geo_labs || []).find(l => l.id === Number(labId))?.nombre || `Lab #${labId}`;
}
function _dgMedicoNombre(ind) {
  if (ind.medico && (ind.medico.nombres || ind.medico.apellidos))
    return [ind.medico.nombres, ind.medico.apellidos].filter(Boolean).join(' ') || '—';
  const u = (window._store?.usuarios || []).find(x => x.id === ind.indicado_por);
  return u ? `${u.nombres||''} ${u.apellidos||''}`.trim() || '—' : '—';
}
function _dgGetRec(recs, indId, eid) {
  const exact = recs.find(r => r.indicacion_id === indId && Number(r.examen_id) === eid);
  if (exact) return exact;
  const all = recs.filter(r => r.indicacion_id === indId);
  return (all.length === 1 && !all[0].examen_id) ? all[0] : null;
}
function _dgGetResultado(recId, eid) {
  const n = Number(eid);
  let nMuestra = null, fechaRes = null, resultado = '—';
  if (n === 1) {
    const r = (window._store?.res_baci||[]).find(x => x.recepcion_id === recId);
    if (r) { nMuestra=r.numero_muestra; fechaRes=r.fecha_analisis; resultado=r.codificacion===0?'Negativo (0)':`Positivo (${r.codificacion})`; }
  } else if (n === 2) {
    const r = (window._store?.res_cultivo||[]).find(x => x.recepcion_id === recId);
    if (r) { nMuestra=r.numero_muestra; fechaRes=r.fecha_resultado||r.fecha_cultivo; const m={en_estudio:'En estudio',contaminado:'Contaminado','0':'Sin crecimiento (0)'}; resultado=m[r.resultado]??`Positivo (${r.resultado})`; }
  } else if (n === 3) {
    const r = (window._store?.res_xpert_ultra||[]).find(x => x.recepcion_id === recId);
    if (r) { nMuestra=r.numero_muestra; fechaRes=r.fecha; resultado=r.resultado||'—'; if(r.resultado==='MTB DETECTADO'&&r.resistencia_rifampicina&&r.resistencia_rifampicina!=='NO PROCEDE') resultado+=` · RIF: ${r.resistencia_rifampicina}`; }
  } else if (n === 5) {
    const r = (window._store?.res_xpert_xdr||[]).find(x => x.recepcion_id === recId);
    if (r) { nMuestra=r.numero_muestra; fechaRes=r.fecha; resultado=r.resultado||'—'; }
  }
  return { nMuestra, fechaRes, resultado };
}
function _dgClaseRes(res) {
  if (!res || res==='—') return '';
  const r = res.toLowerCase();
  if (r.includes('positivo')||(r.includes('detectado')&&!r.includes('no detectado'))) return 'dg-res-pos';
  if (r.includes('negativo')||r.includes('no detectado')||r.includes('sin crecimiento')) return 'dg-res-neg';
  return 'dg-res-ind';
}

// ─── Construcción de filas ────────────────────────────────────────────────────
function _dgGetFilas() {
  const allInds = window._store?.indicaciones || [];
  const pacs    = window._store?.pacientes    || [];
  const recs    = window._store?.recepciones  || [];
  const users   = window._store?.usuarios     || [];
  const muns    = window._store?.geo_municipios || [];

  const indicaciones = typeof _filtrarIndicacionesPorNivel === 'function'
    ? _filtrarIndicacionesPorNivel(allInds)
    : allInds;

  const filas = [];

  indicaciones.forEach(ind => {
    const pac     = pacs.find(p => p.id === ind.paciente_id) || null;
    const ind_u   = users.find(u => u.id === ind.indicado_por) || null;
    const examIds = (ind.examenes_ids || []).map(Number).filter(Boolean);
    const targets = examIds.length ? examIds : [null];

    // Contexto geográfico de la indicación (centro solicitante + paciente)
    const reqCentroId = ind_u?.centro_salud_id ? Number(ind_u.centro_salud_id) : null;
    const reqMunId    = ind_u?.municipio_id    ? Number(ind_u.municipio_id)    : null;
    const reqMun      = reqMunId ? muns.find(m => m.id === reqMunId) : null;
    const reqProvId   = reqMun?.provincia_id
      ? Number(reqMun.provincia_id)
      : (ind_u?.provincia_id ? Number(ind_u.provincia_id) : null);
    const pacMunId    = pac?.municipio_id  ? Number(pac.municipio_id)  : null;
    const pacMun      = pacMunId ? muns.find(m => m.id === pacMunId) : null;
    const pacProvId   = pacMun?.provincia_id ? Number(pacMun.provincia_id) : null;

    targets.forEach(eid => {
      const ex  = eid != null ? _dgExInfo(eid) : { nombre:'—', codigo:'—' };
      const rec = eid != null ? _dgGetRec(recs, ind.id, eid) : null;

      let nMuestra='—', fechaRes='—', resTexto='—';
      if (rec?.estado === 'rechazada') {
        resTexto = 'Muestra rechazada';
      } else if (rec) {
        const res = _dgGetResultado(rec.id, eid);
        nMuestra = res.nMuestra != null ? String(res.nMuestra) : '—';
        fechaRes = _dgFmt(res.fechaRes);
        resTexto = res.resultado;
      }

      filas.push({
        // Campos de filtro
        fecha_raw:    ind.fecha_indicacion || '',
        req_centro_id: reqCentroId,
        req_mun_id:    reqMunId,
        req_prov_id:   reqProvId,
        pac_mun_id:    pacMunId,
        pac_prov_id:   pacProvId,
        pac_search:    _dgNorm(`${pac?.nombres||''} ${pac?.apellidos||''} ${pac?.carnet_identidad||''}`),

        // Columnas visibles
        fecha_indicacion: _dgFmt(ind.fecha_indicacion),
        pac_nombre:  pac ? `${pac.apellidos}, ${pac.nombres}` : '—',
        pac_ci:      pac?.carnet_identidad || '—',
        examen:      ex.nombre,
        examen_cod:  ex.codigo,
        laboratorio: _dgLabNombre(ind.laboratorio_id),
        medico:      _dgMedicoNombre(ind),
        n_muestra:   nMuestra,
        fecha_resultado: fechaRes,
        resultado:   resTexto,
      });
    });
  });

  filas.sort((a, b) => b.fecha_raw.localeCompare(a.fecha_raw));
  return filas;
}

// ─── Filtrado ──────────────────────────────────────────────────────────────────
function _dgAplicarFiltros(filas) {
  const { provincia_id, municipio_id, centro_id, search, fecha_desde, fecha_hasta } = _dgState.filtros;
  const q = _dgNorm(search);

  return filas.filter(f => {
    // Provincia: coincide si el solicitante O el paciente pertenecen a ella
    if (provincia_id) {
      if (f.req_prov_id !== Number(provincia_id) && f.pac_prov_id !== Number(provincia_id)) return false;
    }
    // Municipio: ídem
    if (municipio_id) {
      if (f.req_mun_id !== Number(municipio_id) && f.pac_mun_id !== Number(municipio_id)) return false;
    }
    // Centro solicitante
    if (centro_id && f.req_centro_id !== Number(centro_id)) return false;
    // Fechas
    if (fecha_desde && f.fecha_raw < fecha_desde) return false;
    if (fecha_hasta && f.fecha_raw > fecha_hasta) return false;
    // Búsqueda libre
    if (q && !f.pac_search.includes(q)) return false;
    return true;
  });
}

// ─── Catálogos adaptativos ────────────────────────────────────────────────────
function _dgGetProvs() {
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  const provs = (window._store?.geo_provincias || []).slice().sort((a,b)=>a.nombre.localeCompare(b.nombre));
  if (!scope || scope.nivel === 'nacional') return provs;
  if (scope.provincia_id) return provs.filter(p => p.id === scope.provincia_id);
  return provs;
}
function _dgGetMuns(provId) {
  const muns = (window._store?.geo_municipios || [])
    .filter(m => !provId || m.provincia_id === Number(provId))
    .sort((a,b) => a.nombre.localeCompare(b.nombre));
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  if (scope?.nivel === 'municipal' && scope.municipio_id)
    return muns.filter(m => m.id === scope.municipio_id);
  return muns;
}
function _dgGetCentros(munId) {
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  const users = window._store?.usuarios || [];
  // Centros = centros_salud de los usuarios que han indicado exámenes visibles
  const inds  = typeof _filtrarIndicacionesPorNivel === 'function'
    ? _filtrarIndicacionesPorNivel(window._store?.indicaciones || [])
    : (window._store?.indicaciones || []);
  const centroIds = new Set();
  inds.forEach(ind => {
    const u = users.find(x => x.id === ind.indicado_por);
    if (u?.centro_salud_id) centroIds.add(Number(u.centro_salud_id));
  });
  let centros = (window._store?.geo_centros || [])
    .filter(c => centroIds.has(c.id))
    .sort((a,b) => a.nombre.localeCompare(b.nombre));
  if (munId) {
    const mun = (window._store?.geo_municipios || []).find(m => m.id === Number(munId));
    if (mun) centros = centros.filter(c => {
      // Filtrar centros del municipio seleccionado
      const u = users.find(x => x.centro_salud_id === c.id && x.municipio_id === Number(munId));
      return !!u;
    });
  }
  return centros;
}

// ─── Determinar qué filtros mostrar según nivel ───────────────────────────────
function _dgGetNivel() {
  if (typeof _getModeradorNivel !== 'function') return 'nacional';
  return _getModeradorNivel() || 'nacional';
}

// ─── HTML dinámico del panel ──────────────────────────────────────────────────
function _dgHTML(nivel) {
  const mostrarProv   = nivel === 'nacional';
  const mostrarMun    = nivel === 'nacional' || nivel === 'provincial';
  const mostrarCentro = nivel !== 'institucional';

  const filtroProv = mostrarProv ? `
    <div class="dg-filtro-grupo">
      <label class="dg-label" for="dg_prov">Provincia</label>
      <select id="dg_prov" class="dg-input">
        <option value="">Todas las provincias</option>
      </select>
    </div>` : '';

  const filtroMun = mostrarMun ? `
    <div class="dg-filtro-grupo">
      <label class="dg-label" for="dg_mun">Municipio</label>
      <select id="dg_mun" class="dg-input" ${mostrarProv ? 'disabled' : ''}>
        <option value="">Todos los municipios</option>
      </select>
    </div>` : '';

  const filtroCentro = mostrarCentro ? `
    <div class="dg-filtro-grupo">
      <label class="dg-label" for="dg_centro">Centro solicitante</label>
      <select id="dg_centro" class="dg-input">
        <option value="">Todos los centros</option>
      </select>
    </div>` : '';

  return `
  <div class="dg-wrapper">
    <div class="dg-filtros-panel">
      <div class="dg-filtros-grid">

        <div class="dg-filtro-grupo" style="grid-column:1/-1">
          <label class="dg-label" for="dg_search">Buscar paciente</label>
          <div style="position:relative">
            <i class="bi bi-search" style="position:absolute;left:.7rem;top:50%;transform:translateY(-50%);color:#8fa3bf;pointer-events:none;font-size:.9rem"></i>
            <input id="dg_search" type="text" class="dg-input" style="padding-left:2.2rem"
                   placeholder="Nombre, apellidos o carnet de identidad…" autocomplete="off">
          </div>
        </div>

        ${filtroProv}
        ${filtroMun}
        ${filtroCentro}

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_fecha_desde">Fecha desde</label>
          <input id="dg_fecha_desde" type="date" class="dg-input">
        </div>
        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_fecha_hasta">Fecha hasta</label>
          <input id="dg_fecha_hasta" type="date" class="dg-input">
        </div>
        <div class="dg-filtro-grupo dg-filtro-accion">
          <button id="dg_btn_limpiar" class="dg-btn dg-btn-sec" type="button" title="Limpiar todos los filtros">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar
          </button>
        </div>

      </div>
    </div>

    <div class="dg-tabla-wrap">
      <div class="dg-tabla-meta" id="dg_meta">Cargando…</div>
      <div class="dg-tabla-scroll">
        <table class="dg-tabla">
          <thead><tr>
            <th>Fecha indicación</th>
            <th>Nombres y apellidos</th>
            <th>Carnet identidad</th>
            <th>Tipo de examen</th>
            <th>Laboratorio</th>
            <th>Médico solicitante</th>
            <th style="text-align:center">N.° muestra</th>
            <th>Fecha resultado</th>
            <th>Resultado</th>
          </tr></thead>
          <tbody id="dg_tbody"></tbody>
        </table>
      </div>
      <div class="dg-paginacion" id="dg_paginacion"></div>
    </div>
  </div>`;
}

// ─── Poblar selectores ────────────────────────────────────────────────────────
function _dgPoblarProvs() {
  const sel = document.getElementById('dg_prov'); if (!sel) return;
  sel.innerHTML = '<option value="">Todas las provincias</option>';
  _dgGetProvs().forEach(p => {
    const opt = new Option(p.nombre, p.id);
    if (_dgState.filtros.provincia_id === p.id) opt.selected = true;
    sel.appendChild(opt);
  });
}
function _dgPoblarMuns(provId) {
  const sel = document.getElementById('dg_mun'); if (!sel) return;
  sel.innerHTML = '<option value="">Todos los municipios</option>';
  if (!provId && document.getElementById('dg_prov')) { sel.disabled = true; return; }
  _dgGetMuns(provId).forEach(m => {
    const opt = new Option(m.nombre, m.id);
    if (_dgState.filtros.municipio_id === m.id) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.disabled = false;
}
function _dgPoblarCentros(munId) {
  const sel = document.getElementById('dg_centro'); if (!sel) return;
  sel.innerHTML = '<option value="">Todos los centros</option>';
  _dgGetCentros(munId).forEach(c => {
    const opt = new Option(c.nombre, c.id);
    if (_dgState.filtros.centro_id === c.id) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Binding de eventos ───────────────────────────────────────────────────────
function _dgBindEventos(contenedor, nivel) {
  document.getElementById('dg_search')?.addEventListener('input', e => {
    _dgState.filtros.search = e.target.value.trim();
    _dgState.pagina = 1;
    _dgRefrescar(contenedor);
  });

  // Provincia
  document.getElementById('dg_prov')?.addEventListener('change', e => {
    _dgState.filtros.provincia_id = e.target.value ? Number(e.target.value) : null;
    _dgState.filtros.municipio_id = null;
    _dgState.filtros.centro_id    = null;
    _dgState.pagina = 1;
    _dgPoblarMuns(_dgState.filtros.provincia_id);
    const selMun = document.getElementById('dg_mun');
    if (selMun) selMun.value = '';
    _dgPoblarCentros(null);
    const selCentro = document.getElementById('dg_centro');
    if (selCentro) selCentro.value = '';
    _dgRefrescar(contenedor);
  });

  // Municipio
  document.getElementById('dg_mun')?.addEventListener('change', e => {
    _dgState.filtros.municipio_id = e.target.value ? Number(e.target.value) : null;
    _dgState.filtros.centro_id    = null;
    _dgState.pagina = 1;
    _dgPoblarCentros(_dgState.filtros.municipio_id);
    const selCentro = document.getElementById('dg_centro');
    if (selCentro) selCentro.value = '';
    _dgRefrescar(contenedor);
  });

  // Centro
  document.getElementById('dg_centro')?.addEventListener('change', e => {
    _dgState.filtros.centro_id = e.target.value ? Number(e.target.value) : null;
    _dgState.pagina = 1;
    _dgRefrescar(contenedor);
  });

  // Fechas
  document.getElementById('dg_fecha_desde')?.addEventListener('change', e => {
    _dgState.filtros.fecha_desde = e.target.value;
    _dgState.pagina = 1;
    _dgRefrescar(contenedor);
  });
  document.getElementById('dg_fecha_hasta')?.addEventListener('change', e => {
    _dgState.filtros.fecha_hasta = e.target.value;
    _dgState.pagina = 1;
    _dgRefrescar(contenedor);
  });

  // Limpiar
  document.getElementById('dg_btn_limpiar')?.addEventListener('click', () => {
    _dgState.filtros = { provincia_id:null, municipio_id:null, centro_id:null, search:'', fecha_desde:'', fecha_hasta:'' };
    _dgState.pagina = 1;
    ['dg_search','dg_fecha_desde','dg_fecha_hasta'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    if (nivel === 'nacional') { _dgPoblarProvs(); _dgPoblarMuns(null); }
    else if (nivel === 'provincial') { _dgPoblarMuns(null); }
    _dgPoblarCentros(null);
    const selC = document.getElementById('dg_centro'); if (selC) selC.value = '';
    _dgRefrescar(contenedor);
  });
}

// ─── Tabla y paginación ───────────────────────────────────────────────────────
function _dgRefrescar(contenedor) {
  const todas     = _dgGetFilas();
  const filtradas = _dgAplicarFiltros(todas);
  const total     = filtradas.length;
  const totalPags = Math.max(1, Math.ceil(total / _DG_PAGE_SIZE));
  _dgState.pagina = Math.min(_dgState.pagina, totalPags);
  const inicio    = (_dgState.pagina - 1) * _DG_PAGE_SIZE;
  const pag       = filtradas.slice(inicio, inicio + _DG_PAGE_SIZE);

  const meta = document.getElementById('dg_meta');
  if (meta) meta.textContent = total === 0
    ? 'Sin registros para los filtros seleccionados.'
    : `Mostrando ${inicio+1}–${Math.min(inicio+_DG_PAGE_SIZE,total)} de ${total} registro${total!==1?'s':''}`;

  const tbody = document.getElementById('dg_tbody');
  if (tbody) {
    tbody.innerHTML = pag.length
      ? pag.map(f => `
        <tr>
          <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.78rem">${f.fecha_indicacion}</td>
          <td style="font-weight:500;min-width:150px">${f.pac_nombre}</td>
          <td class="dg-ci">${f.pac_ci}</td>
          <td style="white-space:nowrap">
            <span style="background:#e0f2fe;color:#0369a1;font-family:'IBM Plex Mono',monospace;font-size:.68rem;font-weight:700;padding:.1em .45em;border-radius:4px">${f.examen_cod}</span>
            <span style="font-size:.82rem;margin-left:.3rem">${f.examen}</span>
          </td>
          <td style="font-size:.82rem;max-width:180px">
            <span title="${f.laboratorio}" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">${f.laboratorio}</span>
          </td>
          <td style="font-size:.82rem">${f.medico}</td>
          <td class="dg-ci" style="text-align:center">${f.n_muestra}</td>
          <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.78rem">${f.fecha_resultado}</td>
          <td>
            <span class="dg-res-badge ${_dgClaseRes(f.resultado)}"
                  style="font-size:.78rem;word-break:break-word;max-width:210px;display:inline-block">
              ${f.resultado}
            </span>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="9" class="dg-tabla-vacia">Sin registros.</td></tr>`;
  }

  _dgRenderPag(totalPags, contenedor);
}

function _dgRenderPag(totalPags, contenedor) {
  const wrap = document.getElementById('dg_paginacion'); if (!wrap) return;
  if (totalPags <= 1) { wrap.innerHTML = ''; return; }
  const pag = _dgState.pagina;
  const pp  = [];
  if (totalPags <= 7) { for (let i=1;i<=totalPags;i++) pp.push(i); }
  else {
    pp.push(1);
    if (pag > 3) pp.push('…');
    for (let i=Math.max(2,pag-1); i<=Math.min(totalPags-1,pag+1); i++) pp.push(i);
    if (pag < totalPags-2) pp.push('…');
    pp.push(totalPags);
  }
  wrap.innerHTML = `
    <button class="dg-pag-btn" data-pag="${pag-1}" ${pag===1?'disabled':''}>‹</button>
    ${pp.map(p=>p==='…'?`<span class="dg-pag-ellipsis">…</span>`:`<button class="dg-pag-btn${p===pag?' active':''}" data-pag="${p}">${p}</button>`).join('')}
    <button class="dg-pag-btn" data-pag="${pag+1}" ${pag===totalPags?'disabled':''}>›</button>`;
  wrap.querySelectorAll('.dg-pag-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _dgState.pagina = +btn.dataset.pag;
      _dgRefrescar(contenedor);
      document.getElementById('dg_meta')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });
  });
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────
function _initEpiDatosGenerales(contenedor) {
  if (!contenedor) return;

  _dgState.filtros = { provincia_id:null, municipio_id:null, centro_id:null, search:'', fecha_desde:'', fecha_hasta:'' };
  _dgState.pagina  = 1;

  const nivel = _dgGetNivel();
  contenedor.innerHTML = _dgHTML(nivel);

  // Poblar selectores según nivel
  if (nivel === 'nacional')    { _dgPoblarProvs(); _dgPoblarMuns(null); }
  else if (nivel === 'provincial') { _dgPoblarMuns(null); }
  _dgPoblarCentros(null);

  _dgBindEventos(contenedor, nivel);
  _dgRefrescar(contenedor);
}

window._initEpiDatosGenerales = _initEpiDatosGenerales;
