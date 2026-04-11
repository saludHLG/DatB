/**
 * epi_datos_generales.js  v2
 * Pill "Datos generales" del módulo epidemiológico.
 *
 * Una fila por (indicación × examen).
 * Columnas: Fecha indicación | Nombres y apellidos | CI | Tipo examen |
 *           Laboratorio | Médico solicitante | N.° muestra |
 *           Fecha resultado | Resultado
 *
 * Filtros: Búsqueda libre (nombre/CI) | Provincia → Municipio |
 *          Fecha desde / hasta
 *
 * Dependencias: moderadores_core.js, laboratorio_core.js, utils.js
 */

'use strict';

// ─── Constantes ────────────────────────────────────────────────────────────────

const _DG_PAGE_SIZE = 50;

// ─── Estado ────────────────────────────────────────────────────────────────────

const _dgState = {
  filtros: {
    provincia_id: null,
    municipio_id: null,
    search:       '',
    fecha_desde:  '',
    fecha_hasta:  '',
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

function _dgExNombre(eid) {
  const cat = [
    { id: 1, nombre: 'Baciloscopia',          codigo: 'BACI'      },
    { id: 2, nombre: 'Cultivo',               codigo: 'CULT'      },
    { id: 3, nombre: 'Xpert MTB/RIF (Ultra)', codigo: 'XPERT-U'   },
    { id: 4, nombre: 'MF-LED',                codigo: 'MF-LED'    },
    { id: 5, nombre: 'Xpert MTB/XDR',         codigo: 'XPERT-XDR' },
  ];
  return cat.find(e => e.id === Number(eid)) || { nombre: `Examen ${eid}`, codigo: `${eid}` };
}

function _dgLabNombre(labId) {
  const labs = window._store?.geo_labs || [];
  return labs.find(l => l.id === Number(labId))?.nombre || `Lab #${labId}`;
}

/** Nombre del médico que solicitó: del objeto embebido ind.medico o del usuario indicador */
function _dgMedicoNombre(ind) {
  if (ind.medico && (ind.medico.nombres || ind.medico.apellidos)) {
    return [ind.medico.nombres, ind.medico.apellidos].filter(Boolean).join(' ') || '—';
  }
  const u = (window._store?.usuarios || []).find(x => x.id === ind.indicado_por);
  return u ? `${u.nombres || ''} ${u.apellidos || ''}`.trim() || '—' : '—';
}

/** Localiza la recepción para una indicación + examen */
function _dgGetRec(recs, indId, eid) {
  const exact = recs.find(r => r.indicacion_id === indId && Number(r.examen_id) === eid);
  if (exact) return exact;
  const indRecs = recs.filter(r => r.indicacion_id === indId);
  return (indRecs.length === 1 && !indRecs[0].examen_id) ? indRecs[0] : null;
}

/** Número de muestra, fecha de resultado y texto de resultado según examen */
function _dgGetResultado(recId, eid) {
  const n = Number(eid);
  let nMuestra = null, fechaRes = null, resultado = '—';

  if (n === 1) {
    const r = (window._store?.res_baci || []).find(x => x.recepcion_id === recId);
    if (r) {
      nMuestra = r.numero_muestra;
      fechaRes = r.fecha_analisis;
      resultado = r.codificacion === 0 ? 'Negativo (0)' : `Positivo (${r.codificacion})`;
    }
  } else if (n === 2) {
    const r = (window._store?.res_cultivo || []).find(x => x.recepcion_id === recId);
    if (r) {
      nMuestra = r.numero_muestra;
      fechaRes = r.fecha_resultado || r.fecha_cultivo;
      const m = { en_estudio: 'En estudio', contaminado: 'Contaminado', '0': 'Sin crecimiento (0)' };
      resultado = m[r.resultado] ?? `Positivo (${r.resultado})`;
    }
  } else if (n === 3) {
    const r = (window._store?.res_xpert_ultra || []).find(x => x.recepcion_id === recId);
    if (r) {
      nMuestra = r.numero_muestra;
      fechaRes = r.fecha;
      resultado = r.resultado || '—';
      if (r.resultado === 'MTB DETECTADO' && r.resistencia_rifampicina && r.resistencia_rifampicina !== 'NO PROCEDE') {
        resultado += ` · RIF: ${r.resistencia_rifampicina}`;
      }
    }
  } else if (n === 5) {
    const r = (window._store?.res_xpert_xdr || []).find(x => x.recepcion_id === recId);
    if (r) {
      nMuestra = r.numero_muestra;
      fechaRes = r.fecha;
      resultado = r.resultado || '—';
    }
  }

  return { nMuestra, fechaRes, resultado };
}

// ─── Construcción de filas (una por indicación × examen) ──────────────────────

function _dgGetFilas() {
  const allInds = window._store?.indicaciones || [];
  const pacs    = window._store?.pacientes    || [];
  const recs    = window._store?.recepciones  || [];
  const muns    = window._store?.geo_municipios || [];

  // Filtrar por nivel del moderador
  const indicaciones = typeof _filtrarIndicacionesPorNivel === 'function'
    ? _filtrarIndicacionesPorNivel(allInds)
    : allInds;

  const filas = [];

  indicaciones.forEach(ind => {
    const pac     = pacs.find(p => p.id === ind.paciente_id) || null;
    const examIds = (ind.examenes_ids || []).map(Number).filter(Boolean);
    const targets = examIds.length ? examIds : [null]; // al menos una fila por indicación

    targets.forEach(eid => {
      const ex  = eid != null ? _dgExNombre(eid) : { nombre: '—', codigo: '—' };
      const rec = eid != null ? _dgGetRec(recs, ind.id, eid) : null;

      let nMuestra = '—', fechaRes = '—', resTexto = '—';
      if (rec?.estado === 'rechazada') {
        resTexto = 'Muestra rechazada';
      } else if (rec) {
        const res = _dgGetResultado(rec.id, eid);
        nMuestra = res.nMuestra != null ? String(res.nMuestra) : '—';
        fechaRes = _dgFmt(res.fechaRes);
        resTexto = res.resultado;
      }

      // Provincia/municipio: preferir del paciente, fallback del laboratorio
      const pacMun    = pac?.municipio_id ? muns.find(m => m.id === Number(pac.municipio_id)) : null;
      const pacProvId = pacMun?.provincia_id ? Number(pacMun.provincia_id) : null;
      const pacMunId  = pac?.municipio_id   ? Number(pac.municipio_id)    : null;
      const lab       = (window._store?.geo_labs || []).find(l => l.id === Number(ind.laboratorio_id));

      filas.push({
        // campos de filtro
        fecha_raw:    ind.fecha_indicacion || '',
        provincia_id: pacProvId ?? (lab?.provincia_id ? Number(lab.provincia_id) : null),
        municipio_id: pacMunId  ?? (lab?.municipio_id  ? Number(lab.municipio_id)  : null),
        pac_search:   _dgNorm(`${pac?.nombres || ''} ${pac?.apellidos || ''} ${pac?.carnet_identidad || ''}`),

        // campos visibles
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

  // Orden descendente por fecha de indicación
  filas.sort((a, b) => b.fecha_raw.localeCompare(a.fecha_raw));
  return filas;
}

// ─── Filtrado ──────────────────────────────────────────────────────────────────

function _dgAplicarFiltros(filas) {
  const { provincia_id, municipio_id, search, fecha_desde, fecha_hasta } = _dgState.filtros;
  const q = _dgNorm(search);

  return filas.filter(f => {
    if (provincia_id && f.provincia_id !== Number(provincia_id)) return false;
    if (municipio_id && f.municipio_id !== Number(municipio_id)) return false;
    if (fecha_desde  && f.fecha_raw < fecha_desde)               return false;
    if (fecha_hasta  && f.fecha_raw > fecha_hasta)               return false;
    if (q            && !f.pac_search.includes(q))               return false;
    return true;
  });
}

// ─── Catálogos geográficos para selectores ────────────────────────────────────

function _dgGetProvincias() {
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  const provs = window._store?.geo_provincias || [];
  if (!scope || scope.nivel === 'nacional') return provs;
  if (scope.provincia_id) return provs.filter(p => p.id === scope.provincia_id);
  return provs;
}

function _dgGetMunicipios(provinciaId) {
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  let muns = (window._store?.geo_municipios || []).filter(m =>
    !provinciaId || m.provincia_id === Number(provinciaId)
  );
  if (scope?.nivel === 'municipal' && scope.municipio_id) {
    muns = muns.filter(m => m.id === scope.municipio_id);
  }
  return muns;
}

// ─── HTML ──────────────────────────────────────────────────────────────────────

function _dgHTML() {
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

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_prov">Provincia</label>
          <select id="dg_prov" class="dg-input">
            <option value="">Todas las provincias</option>
          </select>
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_mun">Municipio</label>
          <select id="dg_mun" class="dg-input" disabled>
            <option value="">Todos los municipios</option>
          </select>
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_fecha_desde">Fecha desde</label>
          <input id="dg_fecha_desde" type="date" class="dg-input">
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_fecha_hasta">Fecha hasta</label>
          <input id="dg_fecha_hasta" type="date" class="dg-input">
        </div>

        <div class="dg-filtro-grupo dg-filtro-accion">
          <button id="dg_btn_limpiar" class="dg-btn dg-btn-sec" type="button">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar
          </button>
        </div>

      </div>
    </div>

    <div class="dg-tabla-wrap">
      <div class="dg-tabla-meta" id="dg_meta">Cargando…</div>
      <div class="dg-tabla-scroll">
        <table class="dg-tabla">
          <thead>
            <tr>
              <th>Fecha indicación</th>
              <th>Nombres y apellidos</th>
              <th>Carnet identidad</th>
              <th>Tipo de examen</th>
              <th>Laboratorio</th>
              <th>Médico solicitante</th>
              <th style="text-align:center">N.° muestra</th>
              <th>Fecha resultado</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody id="dg_tbody"></tbody>
        </table>
      </div>
      <div class="dg-paginacion" id="dg_paginacion"></div>
    </div>

  </div>`;
}

// ─── Poblar selectores ────────────────────────────────────────────────────────

function _dgPoblarProvincias() {
  const sel = document.getElementById('dg_prov');
  if (!sel) return;
  const provs = _dgGetProvincias();
  sel.innerHTML = '<option value="">Todas las provincias</option>';
  provs.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(p => {
    const opt = document.createElement('option');
    opt.value       = p.id;
    opt.textContent = p.nombre;
    if (_dgState.filtros.provincia_id && Number(p.id) === Number(_dgState.filtros.provincia_id)) {
      opt.selected = true;
    }
    sel.appendChild(opt);
  });
}

function _dgPoblarMunicipios(provinciaId) {
  const sel = document.getElementById('dg_mun');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos los municipios</option>';

  if (!provinciaId) {
    sel.disabled = true;
    return;
  }

  const muns = _dgGetMunicipios(provinciaId);
  muns.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(m => {
    const opt = document.createElement('option');
    opt.value       = m.id;
    opt.textContent = m.nombre;
    if (_dgState.filtros.municipio_id && Number(m.id) === Number(_dgState.filtros.municipio_id)) {
      opt.selected = true;
    }
    sel.appendChild(opt);
  });
  sel.disabled = muns.length === 0;
}

// ─── Binding de eventos ───────────────────────────────────────────────────────

function _dgBindEventos(contenedor) {
  document.getElementById('dg_search')?.addEventListener('input', e => {
    _dgState.filtros.search = e.target.value.trim();
    _dgState.pagina = 1;
    _dgRefrescar(contenedor);
  });

  document.getElementById('dg_prov')?.addEventListener('change', e => {
    _dgState.filtros.provincia_id = e.target.value ? Number(e.target.value) : null;
    _dgState.filtros.municipio_id = null;
    _dgState.pagina = 1;
    _dgPoblarMunicipios(_dgState.filtros.provincia_id);
    // Resetear selector de municipio visualmente
    const selMun = document.getElementById('dg_mun');
    if (selMun) selMun.value = '';
    _dgRefrescar(contenedor);
  });

  document.getElementById('dg_mun')?.addEventListener('change', e => {
    _dgState.filtros.municipio_id = e.target.value ? Number(e.target.value) : null;
    _dgState.pagina = 1;
    _dgRefrescar(contenedor);
  });

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

  document.getElementById('dg_btn_limpiar')?.addEventListener('click', () => {
    _dgState.filtros = { provincia_id: null, municipio_id: null, search: '', fecha_desde: '', fecha_hasta: '' };
    _dgState.pagina = 1;
    const ids = ['dg_search', 'dg_fecha_desde', 'dg_fecha_hasta'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    _dgPoblarProvincias();
    _dgPoblarMunicipios(null);
    _dgRefrescar(contenedor);
  });
}

// ─── Clase CSS según resultado ────────────────────────────────────────────────

function _dgClaseRes(res) {
  if (!res || res === '—') return '';
  const r = res.toLowerCase();
  if (r.includes('positivo') || (r.includes('detectado') && !r.includes('no detectado'))) return 'dg-res-pos';
  if (r.includes('negativo') || r.includes('no detectado') || r.includes('sin crecimiento')) return 'dg-res-neg';
  return 'dg-res-ind';
}

// ─── Tabla y paginación ───────────────────────────────────────────────────────

function _dgRefrescar(contenedor) {
  const todas     = _dgGetFilas();
  const filtradas = _dgAplicarFiltros(todas);
  const total     = filtradas.length;
  const totalPags = Math.max(1, Math.ceil(total / _DG_PAGE_SIZE));
  _dgState.pagina = Math.min(_dgState.pagina, totalPags);

  const inicio = (_dgState.pagina - 1) * _DG_PAGE_SIZE;
  const pag    = filtradas.slice(inicio, inicio + _DG_PAGE_SIZE);

  const meta = document.getElementById('dg_meta');
  if (meta) {
    meta.textContent = total === 0
      ? 'Sin registros para los filtros seleccionados.'
      : `Mostrando ${inicio + 1}–${Math.min(inicio + _DG_PAGE_SIZE, total)} de ${total} registro${total !== 1 ? 's' : ''}`;
  }

  const tbody = document.getElementById('dg_tbody');
  if (tbody) {
    tbody.innerHTML = pag.length
      ? pag.map(f => `
          <tr>
            <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.78rem">${f.fecha_indicacion}</td>
            <td style="font-weight:500;min-width:160px">${f.pac_nombre}</td>
            <td class="dg-ci">${f.pac_ci}</td>
            <td style="white-space:nowrap">
              <span style="background:#e0f2fe;color:#0369a1;font-family:'IBM Plex Mono',monospace;font-size:.68rem;font-weight:700;padding:.1em .45em;border-radius:4px">${f.examen_cod}</span>
              <span style="font-size:.82rem;margin-left:.3rem">${f.examen}</span>
            </td>
            <td style="font-size:.82rem;max-width:200px">
              <span title="${f.laboratorio}" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px">${f.laboratorio}</span>
            </td>
            <td style="font-size:.82rem">${f.medico}</td>
            <td class="dg-ci" style="text-align:center">${f.n_muestra}</td>
            <td style="white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.78rem">${f.fecha_resultado}</td>
            <td>
              <span class="dg-res-badge ${_dgClaseRes(f.resultado)}" style="font-size:.78rem;white-space:normal;word-break:break-word;max-width:220px;display:inline-block">
                ${f.resultado}
              </span>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="9" class="dg-tabla-vacia">No se encontraron registros.</td></tr>`;
  }

  _dgRenderPaginacion(totalPags, contenedor);
}

function _dgRenderPaginacion(totalPags, contenedor) {
  const wrap = document.getElementById('dg_paginacion');
  if (!wrap) return;
  if (totalPags <= 1) { wrap.innerHTML = ''; return; }

  const pag   = _dgState.pagina;
  const pages = _dgPaginas(pag, totalPags);

  wrap.innerHTML = `
    <button class="dg-pag-btn" data-pag="${pag - 1}" ${pag === 1 ? 'disabled' : ''}>‹</button>
    ${pages.map(p => p === '…'
      ? `<span class="dg-pag-ellipsis">…</span>`
      : `<button class="dg-pag-btn${p === pag ? ' active' : ''}" data-pag="${p}">${p}</button>`
    ).join('')}
    <button class="dg-pag-btn" data-pag="${pag + 1}" ${pag === totalPags ? 'disabled' : ''}>›</button>`;

  wrap.querySelectorAll('.dg-pag-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _dgState.pagina = +btn.dataset.pag;
      _dgRefrescar(contenedor);
      document.getElementById('dg_meta')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function _dgPaginas(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p = [1];
  if (actual > 3) p.push('…');
  for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) p.push(i);
  if (actual < total - 2) p.push('…');
  p.push(total);
  return p;
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function _initEpiDatosGenerales(contenedor) {
  if (!contenedor) return;

  _dgState.filtros = { provincia_id: null, municipio_id: null, search: '', fecha_desde: '', fecha_hasta: '' };
  _dgState.pagina  = 1;

  contenedor.innerHTML = _dgHTML();
  _dgPoblarProvincias();
  _dgPoblarMunicipios(null);
  _dgBindEventos(contenedor);
  _dgRefrescar(contenedor);
}

window._initEpiDatosGenerales = _initEpiDatosGenerales;
