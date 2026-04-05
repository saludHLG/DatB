/**
 * epi_datos_generales.js
 * Pill "Datos generales" del módulo epidemiológico.
 *
 * Muestra indicaciones y sus resultados de forma granular,
 * restringida automáticamente al scope del moderador.
 *
 * Filtros disponibles:
 *   - Provincia / Municipio / Institución (búsqueda inteligente en cascada)
 *   - Rango de fechas de indicación
 *
 * Tabla (50 filas por página, paginada):
 *   Nombre y apellidos | CI | Fecha indicación | Examen |
 *   Laboratorio remitido | N.° muestra | Fecha resultado | Resultado
 *
 * Dependencias: moderadores_core.js, laboratorio_core.js
 */

'use strict';

// ─── Constantes ───────────────────────────────────────────────────────────────

const _DG_PAGE_SIZE = 50;

// ─── Estado ───────────────────────────────────────────────────────────────────

const _dgState = {
  filtros: {
    provincia_id:   null,
    municipio_id:   null,
    institucion_id: null,
    fecha_desde:    '',
    fecha_hasta:    '',
  },
  pagina:     1,
  totalFilas: 0,
};

// ─── Acceso a datos ───────────────────────────────────────────────────────────

/**
 * Construye el array completo de filas combinando indicaciones,
 * pacientes, recepciones y resultados.
 * El filtrado por nivel del moderador se aplica sobre las indicaciones
 * antes de construir las filas.
 */
function _dgGetFilas() {
  // Indicaciones ya filtradas por nivel del moderador
  const indicaciones = typeof _filtrarIndicacionesPorNivel === 'function'
    ? _filtrarIndicacionesPorNivel(window._store?.indicaciones ?? [])
    : (window._store?.indicaciones ?? []);

  const pacientes   = window._store?.pacientes  ?? [];
  const geo         = window._store?.geo_labs   ?? [];

  // Recepciones (nº de muestra y laboratorio destino)
  const recepciones = typeof _getRecepciones === 'function'
    ? _getRecepciones()
    : (window._store?.recepciones ?? []);

  // Todos los tipos de resultado
  const todosResultados = [
    ...(typeof _getResBaci      === 'function' ? _getResBaci()      : (window._store?.res_baci       ?? [])),
    ...(typeof _getResCultivo   === 'function' ? _getResCultivo()   : (window._store?.res_cultivo    ?? [])),
    ...(typeof _getResXpertUltra=== 'function' ? _getResXpertUltra(): (window._store?.res_xpert_ultra ?? [])),
    ...(typeof _getResXpertXDR  === 'function' ? _getResXpertXDR()  : (window._store?.res_xpert_xdr  ?? [])),
  ];

  // Índices para búsqueda O(1)
  const pacIdx    = new Map(pacientes.map(p => [p.id, p]));
  const geoIdx    = new Map(geo.map(g => [g.id, g]));
  const recepIdx  = {};
  recepciones.forEach(r => { recepIdx[r.indicacion_id] = r; });
  const resIdx    = {};
  todosResultados.forEach(r => {
    if (!resIdx[r.indicacion_id]) resIdx[r.indicacion_id] = [];
    resIdx[r.indicacion_id].push(r);
  });

  return indicaciones.map(ind => {
    const pac   = pacIdx.get(ind.paciente_id)  || {};
    const inst  = geoIdx.get(ind.institucion_id) || {};
    const recep = recepIdx[ind.id]             || {};
    const ress  = resIdx[ind.id]               || [];
    // Último resultado disponible
    const res   = ress[ress.length - 1]        || {};

    const fechaInd = ind.fecha ?? ind.fecha_indicacion ?? '';

    return {
      // Campos para filtrado interno
      provincia_id:   ind.provincia_id   ?? pac.provincia_id   ?? null,
      municipio_id:   ind.municipio_id   ?? pac.municipio_id   ?? null,
      institucion_id: ind.institucion_id ?? null,
      fecha_raw:      fechaInd,

      // Columnas visibles
      nombre:          _dgNombreCompleto(pac),
      ci:              pac.ci ?? pac.carnet ?? '—',
      fecha_indicacion: _dgFmtFecha(fechaInd),
      examen:          ind.tipo_examen ?? ind.examen ?? '—',
      laboratorio:     inst.nombre ?? '—',
      num_muestra:     recep.num_muestra ?? recep.numero_muestra ?? '—',
      fecha_resultado: _dgFmtFecha(res.fecha ?? res.fecha_resultado ?? ''),
      resultado:       res.resultado ?? res.interpretacion ?? '—',
    };
  });
}

function _dgNombreCompleto(pac) {
  const n = [pac.nombres, pac.apellidos].filter(Boolean).join(' ').trim();
  return n || '—';
}

function _dgFmtFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (isNaN(d)) return f;
  return d.toLocaleDateString('es-CU', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

// ─── Filtrado ─────────────────────────────────────────────────────────────────

function _dgAplicarFiltros(filas) {
  const { provincia_id, municipio_id, institucion_id, fecha_desde, fecha_hasta } = _dgState.filtros;
  return filas.filter(f => {
    if (provincia_id   && f.provincia_id   !== provincia_id)   return false;
    if (municipio_id   && f.municipio_id   !== municipio_id)   return false;
    if (institucion_id && f.institucion_id !== institucion_id) return false;
    if (fecha_desde    && f.fecha_raw < fecha_desde)           return false;
    if (fecha_hasta    && f.fecha_raw > fecha_hasta)           return false;
    return true;
  });
}

// ─── Catálogos para los filtros ───────────────────────────────────────────────

function _dgGetProvincias() {
  const geo   = window._store?.geo_labs ?? [];
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  const nivel = scope?.nivel ?? 'nacional';

  if (nivel === 'nacional') {
    // Todas las provincias, sin duplicados
    const seen = new Set();
    return geo.filter(g => g.tipo === 'provincia' && !seen.has(g.id) && seen.add(g.id));
  }
  if (nivel === 'provincial') {
    return geo.filter(g => g.tipo === 'provincia' && g.id === scope.provincia_id);
  }
  // Municipal e institucional no necesitan filtro por provincia (lo infieren del scope)
  return [];
}

function _dgGetMunicipios(provincia_id) {
  const geo   = window._store?.geo_labs ?? [];
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  let arr = geo.filter(g => g.tipo === 'municipio');
  if (provincia_id) arr = arr.filter(g => g.provincia_id === provincia_id);
  // Moderador municipal: solo su municipio
  if (scope?.nivel === 'municipal') arr = arr.filter(g => g.id === scope.municipio_id);
  return arr;
}

function _dgGetInstituciones(municipio_id) {
  const geo   = window._store?.geo_labs ?? [];
  const scope = typeof _getModeradorScope === 'function' ? _getModeradorScope() : null;
  const EXCLUIDOS = new Set(['provincia', 'municipio', 'área de salud']);
  let arr = geo.filter(g => !EXCLUIDOS.has(g.tipo));
  if (municipio_id)              arr = arr.filter(g => g.municipio_id  === municipio_id);
  if (scope?.nivel === 'institucional') arr = arr.filter(g => g.id === scope.institucion_id);
  return arr;
}

// ─── HTML estático del panel ──────────────────────────────────────────────────

function _dgHTML() {
  return `
  <div class="dg-wrapper">

    <div class="dg-filtros-panel">
      <div class="dg-filtros-grid">

        <div class="dg-filtro-grupo">
          <label class="dg-label">Provincia</label>
          <div class="dg-smart-wrap">
            <input  id="dg_prov_input" type="text" class="dg-input dg-smart"
                    placeholder="Todas las provincias" autocomplete="off" />
            <input  id="dg_prov_id" type="hidden" />
            <ul     id="dg_prov_dd" class="dg-dropdown" hidden></ul>
          </div>
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label">Municipio</label>
          <div class="dg-smart-wrap">
            <input  id="dg_mun_input" type="text" class="dg-input dg-smart"
                    placeholder="Todos los municipios" autocomplete="off" />
            <input  id="dg_mun_id" type="hidden" />
            <ul     id="dg_mun_dd" class="dg-dropdown" hidden></ul>
          </div>
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label">Institución</label>
          <div class="dg-smart-wrap">
            <input  id="dg_inst_input" type="text" class="dg-input dg-smart"
                    placeholder="Todas las instituciones" autocomplete="off" />
            <input  id="dg_inst_id" type="hidden" />
            <ul     id="dg_inst_dd" class="dg-dropdown" hidden></ul>
          </div>
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_fecha_desde">Fecha desde</label>
          <input id="dg_fecha_desde" type="date" class="dg-input" />
        </div>

        <div class="dg-filtro-grupo">
          <label class="dg-label" for="dg_fecha_hasta">Fecha hasta</label>
          <input id="dg_fecha_hasta" type="date" class="dg-input" />
        </div>

        <div class="dg-filtro-grupo dg-filtro-accion">
          <button id="dg_btn_limpiar" class="dg-btn dg-btn-sec" type="button">
            Limpiar filtros
          </button>
        </div>

      </div>
    </div>

    <div class="dg-tabla-wrap">
      <div class="dg-tabla-meta" id="dg_meta">Cargando…</div>
      <div class="dg-tabla-scroll">
        <table class="dg-tabla" id="dg_tabla">
          <thead>
            <tr>
              <th>Nombre y apellidos</th>
              <th>Carnet de identidad</th>
              <th>Fecha de indicación</th>
              <th>Examen</th>
              <th>Laboratorio remitido</th>
              <th>N.° de muestra</th>
              <th>Fecha de resultado</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody id="dg_tbody"></tbody>
        </table>
      </div>
      <div class="dg-paginacion" id="dg_paginacion"></div>
    </div>

  </div>
  `;
}

// ─── Binding de eventos ───────────────────────────────────────────────────────

function _dgBindEventos(contenedor) {

  // Smart search: Provincia → limpia Municipio e Institución en cascada
  _dgSmartSearch({
    inputId:    'dg_prov_input',
    hiddenId:   'dg_prov_id',
    ddId:       'dg_prov_dd',
    getItems:   () => _dgGetProvincias(),
    onChange:   item => {
      _dgState.filtros.provincia_id   = item?.id ?? null;
      _dgState.filtros.municipio_id   = null;
      _dgState.filtros.institucion_id = null;
      _dgLimpiarSmartInput('dg_mun_input',  'dg_mun_id');
      _dgLimpiarSmartInput('dg_inst_input', 'dg_inst_id');
      _dgState.pagina = 1;
      _dgRefrescar(contenedor);
    },
  });

  // Smart search: Municipio → limpia Institución en cascada
  _dgSmartSearch({
    inputId:    'dg_mun_input',
    hiddenId:   'dg_mun_id',
    ddId:       'dg_mun_dd',
    getItems:   () => _dgGetMunicipios(_dgState.filtros.provincia_id),
    onChange:   item => {
      _dgState.filtros.municipio_id   = item?.id ?? null;
      _dgState.filtros.institucion_id = null;
      _dgLimpiarSmartInput('dg_inst_input', 'dg_inst_id');
      _dgState.pagina = 1;
      _dgRefrescar(contenedor);
    },
  });

  // Smart search: Institución
  _dgSmartSearch({
    inputId:    'dg_inst_input',
    hiddenId:   'dg_inst_id',
    ddId:       'dg_inst_dd',
    getItems:   () => _dgGetInstituciones(_dgState.filtros.municipio_id),
    onChange:   item => {
      _dgState.filtros.institucion_id = item?.id ?? null;
      _dgState.pagina = 1;
      _dgRefrescar(contenedor);
    },
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

  // Limpiar todos los filtros
  document.getElementById('dg_btn_limpiar')?.addEventListener('click', () => {
    _dgState.filtros = {
      provincia_id: null, municipio_id: null, institucion_id: null,
      fecha_desde: '', fecha_hasta: '',
    };
    _dgState.pagina = 1;
    ['dg_prov_input', 'dg_mun_input', 'dg_inst_input'].forEach(id => _dgLimpiarSmartInput(id, null));
    const desde = document.getElementById('dg_fecha_desde');
    const hasta = document.getElementById('dg_fecha_hasta');
    if (desde) desde.value = '';
    if (hasta) hasta.value = '';
    _dgRefrescar(contenedor);
  });
}

// ─── Smart search reutilizable ────────────────────────────────────────────────

function _dgSmartSearch({ inputId, hiddenId, ddId, getItems, onChange }) {
  const input    = document.getElementById(inputId);
  const hidden   = document.getElementById(hiddenId);
  const dropdown = document.getElementById(ddId);
  if (!input || !hidden || !dropdown) return;

  function mostrar(items) {
    dropdown.innerHTML = items.length
      ? items.map(i =>
          `<li data-id="${i.id}" data-nombre="${i.nombre}">${i.nombre}</li>`
        ).join('')
      : `<li class="dg-dd-empty">Sin resultados</li>`;
    dropdown.hidden = false;
  }

  input.addEventListener('focus', () => {
    const q = input.value.toLowerCase().trim();
    const items = getItems().filter(i => !q || i.nombre.toLowerCase().includes(q));
    mostrar(items);
  });

  input.addEventListener('input', () => {
    hidden.value = '';
    onChange(null);
    const q = input.value.toLowerCase().trim();
    mostrar(getItems().filter(i => i.nombre.toLowerCase().includes(q)));
  });

  dropdown.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    input.value  = li.dataset.nombre;
    hidden.value = li.dataset.id;
    dropdown.hidden = true;
    onChange({ id: li.dataset.id, nombre: li.dataset.nombre });
  });

  // Cierra al hacer clic fuera
  document.addEventListener('click', e => {
    if (input !== e.target && !dropdown.contains(e.target)) dropdown.hidden = true;
  }, { capture: true });
}

function _dgLimpiarSmartInput(inputId, hiddenId) {
  const i = document.getElementById(inputId);
  if (i) i.value = '';
  if (hiddenId) {
    const h = document.getElementById(hiddenId);
    if (h) h.value = '';
  }
}

// ─── Tabla y paginación ───────────────────────────────────────────────────────

function _dgRefrescar(contenedor) {
  const todas     = _dgGetFilas();
  const filtradas = _dgAplicarFiltros(todas);
  const total     = filtradas.length;
  const totalPags = Math.max(1, Math.ceil(total / _DG_PAGE_SIZE));
  _dgState.pagina = Math.min(_dgState.pagina, totalPags);
  _dgState.totalFilas = total;

  const inicio = (_dgState.pagina - 1) * _DG_PAGE_SIZE;
  const pag    = filtradas.slice(inicio, inicio + _DG_PAGE_SIZE);

  // Meta
  const meta = document.getElementById('dg_meta');
  if (meta) {
    if (total === 0) {
      meta.textContent = 'Sin indicaciones para los filtros seleccionados.';
    } else {
      const fin = Math.min(inicio + _DG_PAGE_SIZE, total);
      meta.textContent = `Mostrando ${inicio + 1}–${fin} de ${total} indicación${total !== 1 ? 'es' : ''}`;
    }
  }

  // Cuerpo
  const tbody = document.getElementById('dg_tbody');
  if (tbody) {
    tbody.innerHTML = pag.length
      ? pag.map(f => `
          <tr>
            <td>${f.nombre}</td>
            <td class="dg-ci">${f.ci}</td>
            <td>${f.fecha_indicacion}</td>
            <td>${f.examen}</td>
            <td>${f.laboratorio}</td>
            <td class="dg-ci">${f.num_muestra}</td>
            <td>${f.fecha_resultado}</td>
            <td>
              <span class="dg-res-badge ${_dgClaseResultado(f.resultado)}">
                ${f.resultado}
              </span>
            </td>
          </tr>
        `).join('')
      : `<tr>
           <td colspan="8" class="dg-tabla-vacia">
             No se encontraron indicaciones registradas.
           </td>
         </tr>`;
  }

  // Paginación
  _dgRenderPaginacion(totalPags, contenedor);
}

function _dgClaseResultado(res) {
  if (!res || res === '—') return '';
  const r = res.toLowerCase();
  if (r.includes('positivo') || r.includes('detectado') && !r.includes('no detectado'))
    return 'dg-res-pos';
  if (r.includes('negativo') || r.includes('no detectado'))
    return 'dg-res-neg';
  return 'dg-res-ind';
}

function _dgRenderPaginacion(totalPags, contenedor) {
  const wrap = document.getElementById('dg_paginacion');
  if (!wrap) return;
  if (totalPags <= 1) { wrap.innerHTML = ''; return; }

  const pag   = _dgState.pagina;
  const pages = _dgPaginas(pag, totalPags);

  wrap.innerHTML = `
    <button class="dg-pag-btn" data-pag="${pag - 1}" ${pag === 1 ? 'disabled' : ''}
            aria-label="Página anterior">‹</button>
    ${pages.map(p => p === '…'
      ? `<span class="dg-pag-ellipsis" aria-hidden="true">…</span>`
      : `<button class="dg-pag-btn${p === pag ? ' active' : ''}" data-pag="${p}"
               aria-label="Página ${p}" aria-current="${p === pag ? 'page' : 'false'}">${p}</button>`
    ).join('')}
    <button class="dg-pag-btn" data-pag="${pag + 1}" ${pag === totalPags ? 'disabled' : ''}
            aria-label="Página siguiente">›</button>
  `;

  wrap.querySelectorAll('.dg-pag-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _dgState.pagina = +btn.dataset.pag;
      _dgRefrescar(contenedor);
      // Scroll suave al inicio de la tabla
      document.getElementById('dg_meta')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function _dgPaginas(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p = [1];
  if (actual > 3)           p.push('…');
  for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) p.push(i);
  if (actual < total - 2)   p.push('…');
  p.push(total);
  return p;
}

// ─── Inicialización pública ───────────────────────────────────────────────────

function _initEpiDatosGenerales(contenedor) {
  if (!contenedor) return;
  // Resetear estado al entrar en la pill
  _dgState.filtros  = { provincia_id: null, municipio_id: null, institucion_id: null, fecha_desde: '', fecha_hasta: '' };
  _dgState.pagina   = 1;

  contenedor.innerHTML = _dgHTML();
  _dgBindEventos(contenedor);
  _dgRefrescar(contenedor);
}

window._initEpiDatosGenerales = _initEpiDatosGenerales;
