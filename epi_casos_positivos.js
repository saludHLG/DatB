/**
 * epi_casos_positivos.js
 * Pill "Casos positivos" del módulo epidemiológico.
 *
 * Tabla paginada por año (tabs).  Una fila por paciente con al menos
 * un resultado positivo en ese año.  Botón editar → modal con datos
 * epidemiológicos completos del paciente.
 *
 * Positivo se define como:
 *   Baciloscopia: codificacion > 0
 *   Cultivo: resultado in [1-9]
 *   Xpert MTB/RIF Ultra | Xpert MTB/XDR: resultado === 'MTB DETECTADO'
 *
 * Dependencias: moderadores_core.js, laboratorio_core.js, utils.js
 */

'use strict';

// ─── Constantes ────────────────────────────────────────────────────────────────

const _CP_PAGE_SIZE       = 50;
const _CP_CONTACTO_TB_ID  = 2;   // id de "Contacto TB" en el catálogo

const _CP_EX_CODIGOS = { 1:'BACI', 2:'CULT', 3:'XPERT-U', 5:'XPERT-XDR' };

// ─── Estado ────────────────────────────────────────────────────────────────────

const _cpState = {
  yearActual: null,
  search:     '',
  pagina:     1,
};

// ─── Helpers genéricos ─────────────────────────────────────────────────────────

function _cpNorm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _cpFmt(f) {
  if (!f) return '—';
  const p = String(f).split('T')[0].split('-');
  return p.length < 3 ? f : `${p[2]}/${p[1]}/${p[0]}`;
}

function _cpEdad(fechaNac) {
  if (!fechaNac) return '—';
  const hoy = new Date(), nac = new Date(fechaNac + 'T00:00:00');
  let e = hoy.getFullYear() - nac.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) e--;
  return e;
}

/** Recepción correspondiente a una indicación+examen */
function _cpGetRec(recs, indId, eid) {
  const exact = recs.find(r => r.indicacion_id === indId && Number(r.examen_id) === eid);
  if (exact) return exact;
  const all = recs.filter(r => r.indicacion_id === indId);
  return (all.length === 1 && !all[0].examen_id) ? all[0] : null;
}

/** ¿Tiene un resultado positivo el recId para ese eid? */
function _cpIsPositive(recId, eid) {
  const n = Number(eid);
  if (n === 1) {
    const r = (window._store?.res_baci || []).find(x => x.recepcion_id === recId);
    return !!(r && r.codificacion > 0);
  }
  if (n === 2) {
    const r = (window._store?.res_cultivo || []).find(x => x.recepcion_id === recId);
    return !!(r && /^[1-9]$/.test(r.resultado));
  }
  if (n === 3) {
    const r = (window._store?.res_xpert_ultra || []).find(x => x.recepcion_id === recId);
    return !!(r && r.resultado === 'MTB DETECTADO');
  }
  if (n === 5) {
    const r = (window._store?.res_xpert_xdr || []).find(x => x.recepcion_id === recId);
    return !!(r && r.resultado === 'MTB DETECTADO');
  }
  return false;
}

function _cpMedicoNombre(ind) {
  if (ind.medico && (ind.medico.nombres || ind.medico.apellidos)) {
    return [ind.medico.nombres, ind.medico.apellidos].filter(Boolean).join(' ') || '—';
  }
  const u = (window._store?.usuarios || []).find(x => x.id === ind.indicado_por);
  return u ? `${u.nombres || ''} ${u.apellidos || ''}`.trim() || '—' : '—';
}

// ─── Construcción del índice de casos ─────────────────────────────────────────
// Estructura: { año: { pacId: { pac, exIds:Set, fechaMin, medico } } }

function _cpGetCasos() {
  const allInds = window._store?.indicaciones || [];
  const pacs    = window._store?.pacientes    || [];
  const recs    = window._store?.recepciones  || [];

  const indsFiltradas = typeof _filtrarIndicacionesPorNivel === 'function'
    ? _filtrarIndicacionesPorNivel(allInds)
    : allInds;

  const byYear = {};

  indsFiltradas.forEach(ind => {
    const year = (ind.fecha_indicacion || '').slice(0, 4);
    if (!year || year.length !== 4) return;

    (ind.examenes_ids || []).forEach(eidRaw => {
      const eid = Number(eidRaw);
      const rec = _cpGetRec(recs, ind.id, eid);
      if (!rec || rec.estado === 'rechazada') return;
      if (!_cpIsPositive(rec.id, eid)) return;

      const pac = pacs.find(p => p.id === ind.paciente_id);
      if (!pac) return;

      if (!byYear[year]) byYear[year] = {};
      if (!byYear[year][pac.id]) {
        byYear[year][pac.id] = {
          pac,
          exIds:    new Set(),
          fechaMin: ind.fecha_indicacion,
          medico:   _cpMedicoNombre(ind),
        };
      }
      const entry = byYear[year][pac.id];
      entry.exIds.add(eid);
      if (ind.fecha_indicacion < entry.fechaMin) {
        entry.fechaMin = ind.fecha_indicacion;
        entry.medico   = _cpMedicoNombre(ind);
      }
    });
  });

  return byYear;
}

function _cpGetYears(byYear) {
  return Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
}

// ─── Filas para un año ────────────────────────────────────────────────────────

function _cpGetFilasDeAnio(byYear, year) {
  if (!byYear[year]) return [];
  const muns = window._store?.geo_municipios || [];

  return Object.values(byYear[year])
    .map(({ pac, exIds, fechaMin, medico }) => {
      const munNom = pac.municipio_id
        ? (muns.find(m => m.id === Number(pac.municipio_id))?.nombre || '—')
        : '—';

      const exTags = [...exIds]
        .sort((a, b) => a - b)
        .map(eid => `<span class="cp-ex-pos-tag">${_CP_EX_CODIGOS[eid] || eid}</span>`)
        .join(' ');

      return {
        pac,
        munNom,
        edad:     _cpEdad(pac.fecha_nacimiento),
        sexo:     pac.sexo === 'M' ? 'Masc.' : pac.sexo === 'F' ? 'Fem.' : '—',
        exTags,
        fechaMin,
        medico,
        search: _cpNorm(`${pac.nombres || ''} ${pac.apellidos || ''} ${pac.carnet_identidad || ''}`),
      };
    })
    .sort((a, b) => (a.pac.apellidos || '').localeCompare(b.pac.apellidos || ''));
}

// ─── HTML del panel ───────────────────────────────────────────────────────────

function _cpHTML() {
  return `
  <div class="cp-wrapper">

    <div class="dg-filtros-panel" style="margin-bottom:1rem">
      <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap">
        <div style="position:relative;flex:1;min-width:220px;max-width:420px">
          <i class="bi bi-search" style="position:absolute;left:.7rem;top:50%;transform:translateY(-50%);color:#8fa3bf;pointer-events:none;font-size:.9rem"></i>
          <input id="cp_search" type="text" class="dg-input" style="padding-left:2.2rem"
                 placeholder="Nombre, apellidos o carnet de identidad…" autocomplete="off">
        </div>
        <button id="cp_btn_limpiar" class="dg-btn dg-btn-sec" type="button">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Limpiar
        </button>
      </div>
    </div>

    <div id="cp_year_tabs" class="lab-subtabs mb-3"></div>

    <div class="dg-tabla-wrap">
      <div class="dg-tabla-meta" id="cp_meta">Cargando…</div>
      <div class="dg-tabla-scroll">
        <table class="dg-tabla">
          <thead>
            <tr>
              <th>Nombres y apellidos</th>
              <th>Carnet identidad</th>
              <th style="text-align:center">Edad</th>
              <th style="text-align:center">Sexo</th>
              <th>Municipio</th>
              <th>Exámenes positivos</th>
              <th>Fecha primer positivo</th>
              <th>Médico solicitante</th>
              <th style="text-align:center">Datos epidem.</th>
            </tr>
          </thead>
          <tbody id="cp_tbody"></tbody>
        </table>
      </div>
      <div class="dg-paginacion" id="cp_paginacion"></div>
    </div>

  </div>

  <style>
    .cp-wrapper { display:flex; flex-direction:column; gap:0; }
    .cp-ex-pos-tag {
      display:inline-block;
      padding:.12em .5em;
      border-radius:5px;
      background:#fee2e2;
      color:#991b1b;
      font-family:'IBM Plex Mono',monospace;
      font-size:.7rem;
      font-weight:700;
      margin-right:.2rem;
    }
  </style>`;
}

// ─── Modal de edición epidemiológica ──────────────────────────────────────────

function _cpEnsureModal() {
  if (document.getElementById('cp-edit-modal')) return;
  const el = document.createElement('div');
  el.className = 'modal fade';
  el.id        = 'cp-edit-modal';
  el.tabIndex  = -1;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
    <div class="modal-content" style="border-radius:14px;border:none;color:#0b1e3d">
      <div class="modal-header" style="background:#f8fbff;border-bottom:1.5px solid #dce8f5;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:.75rem">
          <div id="cp-av" style="width:2.75rem;height:2.75rem;border-radius:50%;background:#0b1e3d;color:#00c6b8;
               font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;
               display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
          <div>
            <h5 id="cp-ttl" class="modal-title mb-0"
                style="font-family:'Syne',sans-serif;font-weight:700;color:#0b1e3d;font-size:1rem"></h5>
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
            <div class="invalid-feedback" id="cp-err-nombres"></div>
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Apellidos <span style="color:#e0435a">*</span></label>
            <input type="text" id="cp-apellidos" class="form-control">
            <div class="invalid-feedback" id="cp-err-apellidos"></div>
          </div>

          <div class="col-sm-4">
            <label class="admin-label">Carnet de identidad</label>
            <input type="text" id="cp-ci" class="form-control"
                   readonly style="font-family:'IBM Plex Mono',monospace;background:#f8fbff">
          </div>
          <div class="col-sm-8">
            <label class="admin-label">Dirección particular</label>
            <input type="text" id="cp-dir" class="form-control"
                   placeholder="Calle, número, reparto…">
          </div>

          <div class="col-sm-6">
            <label class="admin-label">Provincia</label>
            <select id="cp-prov" class="form-select admin-select">
              <option value="">— Seleccione —</option>
            </select>
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Municipio</label>
            <select id="cp-mun" class="form-select admin-select" disabled>
              <option value="">— Seleccione provincia —</option>
            </select>
          </div>

          <div class="col-sm-6">
            <label class="admin-label">Área de salud</label>
            <select id="cp-area" class="form-select admin-select" disabled>
              <option value="">— Sin especificar —</option>
            </select>
          </div>
          <div class="col-sm-6">
            <label class="admin-label">Consultorio médico de la familia</label>
            <input type="text" id="cp-cmf" class="form-control"
                   placeholder="Ej: CMF 12, Consultorio #5…">
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
              <i class="bi bi-info-circle me-1"></i>
              Indique de quién es contacto este paciente.
            </div>
          </div>
        </div>

        <div id="cp-alert" class="alert-custom d-none mt-3"></div>
      </div>

      <div class="modal-footer"
           style="background:#f8fbff;border-top:1.5px solid #dce8f5;padding:.85rem 1.25rem;gap:.5rem;justify-content:flex-end">
        <button type="button" data-bs-dismiss="modal" class="btn-secondary-custom">Cancelar</button>
        <button type="button" id="cp-btn-save" class="btn-primary-custom">
          <i class="bi bi-floppy"></i> Guardar
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(el);
}

// ─── Poblar selectores geográficos en el modal ────────────────────────────────

function _cpFillProv(pac) {
  const sel = document.getElementById('cp-prov');
  if (!sel) return;
  const provs = (typeof getGeoProvs === 'function' ? getGeoProvs() : (window._store?.geo_provincias || []))
    .slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  sel.innerHTML = '<option value="">— Seleccione —</option>';
  provs.forEach(p => {
    const opt = new Option(p.nombre, p.id);
    sel.appendChild(opt);
  });

  // Inferir provincia del municipio del paciente
  const muns = typeof getGeoMuns === 'function' ? getGeoMuns() : (window._store?.geo_municipios || []);
  const pacMun  = pac.municipio_id ? muns.find(m => m.id === Number(pac.municipio_id)) : null;
  const provId  = pacMun?.provincia_id ? Number(pacMun.provincia_id) : null;
  if (provId) sel.value = provId;

  _cpFillMun(provId, pac.municipio_id);

  sel.onchange = function () {
    _cpFillMun(this.value ? Number(this.value) : null, null);
    _cpFillArea(null, null);
  };
}

function _cpFillMun(provId, selectedMunId) {
  const sel = document.getElementById('cp-mun');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Seleccione —</option>';
  if (!provId) { sel.disabled = true; return; }

  const muns = (typeof getGeoMuns === 'function' ? getGeoMuns() : (window._store?.geo_municipios || []))
    .filter(m => m.provincia_id === provId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  muns.forEach(m => {
    const opt = new Option(m.nombre, m.id);
    if (selectedMunId && Number(m.id) === Number(selectedMunId)) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.disabled = false;

  // Cargar área si ya hay municipio seleccionado
  const munVal = sel.value ? Number(sel.value) : null;
  if (munVal) _cpFillArea(munVal, null); else _cpFillArea(null, null);

  sel.onchange = function () {
    _cpFillArea(this.value ? Number(this.value) : null, null);
  };
}

function _cpFillArea(munId, selectedAreaId) {
  const sel = document.getElementById('cp-area');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Sin especificar —</option>';
  if (!munId) { sel.disabled = true; return; }

  const centros = (typeof getGeoCentros === 'function' ? getGeoCentros() : (window._store?.geo_centros || []))
    .filter(c => c.municipio_id === munId && c.tipo === 'área de salud')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  centros.forEach(c => {
    const opt = new Option(c.nombre, c.id);
    if (selectedAreaId && Number(c.id) === Number(selectedAreaId)) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.disabled = centros.length === 0;
}

// ─── Poblar grupos de vulnerabilidad ─────────────────────────────────────────

function _cpFillGV(pac) {
  const grid = document.getElementById('cp-gv-grid');
  if (!grid) return;

  const gvCat = (window._store?.grupos_vulnerables || []).filter(g => g.activo !== false);
  const checked = pac.grupos_ids || [];

  grid.innerHTML = gvCat.map(g => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="form-check" style="font-size:.84rem">
        <input class="form-check-input cp-gv-chk" type="checkbox"
               id="cp-gv-${g.id}" value="${g.id}"
               ${checked.includes(g.id) ? 'checked' : ''}>
        <label class="form-check-label" for="cp-gv-${g.id}">${g.nombre}</label>
      </div>
    </div>`).join('');

  // Toggle campo Contacto TB
  const _toggleContacto = () => {
    const hay = [...document.querySelectorAll('.cp-gv-chk')]
      .some(c => Number(c.value) === _CP_CONTACTO_TB_ID && c.checked);
    document.getElementById('cp-contacto-wrap')?.classList.toggle('d-none', !hay);
  };

  grid.querySelectorAll('.cp-gv-chk').forEach(c => c.addEventListener('change', _toggleContacto));
  _toggleContacto(); // ejecutar al abrir
}

// ─── Abrir modal ──────────────────────────────────────────────────────────────

function _cpAbrirModal(pacId, contenedor, byYear) {
  const pac = (window._store?.pacientes || []).find(p => p.id === pacId);
  if (!pac) return;

  _cpEnsureModal();

  const ini = [(pac.nombres || '')[0] || '', (pac.apellidos || '')[0] || ''].join('').toUpperCase() || '??';
  document.getElementById('cp-av').textContent      = ini;
  document.getElementById('cp-ttl').textContent     = `${pac.nombres} ${pac.apellidos}`;
  document.getElementById('cp-ci-lbl').textContent  = `CI: ${pac.carnet_identidad}`;
  document.getElementById('cp-pac-id').value        = pac.id;
  document.getElementById('cp-nombres').value       = pac.nombres   || '';
  document.getElementById('cp-apellidos').value     = pac.apellidos || '';
  document.getElementById('cp-ci').value            = pac.carnet_identidad || '';
  document.getElementById('cp-dir').value           = pac.direccion || '';
  document.getElementById('cp-cmf').value           = pac.consultorio_cmf || '';
  document.getElementById('cp-contacto-spec').value = pac.contacto_tb_especificacion || '';

  // Limpiar clases de validación
  ['cp-nombres', 'cp-apellidos'].forEach(id => {
    document.getElementById(id)?.classList.remove('is-invalid');
  });
  document.getElementById('cp-alert')?.classList.add('d-none');

  _cpFillProv(pac);
  // Área de salud: re-cargar con valor guardado
  const munId = pac.municipio_id ? Number(pac.municipio_id) : null;
  if (munId) _cpFillArea(munId, pac.area_salud_id);

  _cpFillGV(pac);

  document.getElementById('cp-btn-save').onclick = () => _cpGuardar(contenedor, byYear);

  bootstrap.Modal.getOrCreateInstance(document.getElementById('cp-edit-modal')).show();
}

// ─── Guardar ──────────────────────────────────────────────────────────────────

async function _cpGuardar(contenedor, byYear) {
  const alertEl   = document.getElementById('cp-alert');
  const pacId     = document.getElementById('cp-pac-id').value;
  const nombres   = document.getElementById('cp-nombres').value.trim();
  const apellidos = document.getElementById('cp-apellidos').value.trim();
  let ok = true;

  if (!nombres) {
    document.getElementById('cp-nombres').classList.add('is-invalid');
    ok = false;
  }
  if (!apellidos) {
    document.getElementById('cp-apellidos').classList.add('is-invalid');
    ok = false;
  }
  if (!ok) {
    alertEl.className = 'alert-custom alert-danger';
    alertEl.textContent = 'Nombres y apellidos son obligatorios.';
    alertEl.classList.remove('d-none');
    return;
  }

  const grupos_ids = [...document.querySelectorAll('.cp-gv-chk:checked')].map(c => parseInt(c.value));
  const hasContacto = grupos_ids.includes(_CP_CONTACTO_TB_ID);
  const munVal  = document.getElementById('cp-mun').value;
  const areaVal = document.getElementById('cp-area').value;

  const cambios = {
    nombres,
    apellidos,
    direccion:                   document.getElementById('cp-dir').value.trim()           || null,
    municipio_id:                munVal  ? Number(munVal)  : null,
    area_salud_id:               areaVal ? Number(areaVal) : null,
    consultorio_cmf:             document.getElementById('cp-cmf').value.trim()          || null,
    grupos_ids,
    contacto_tb_especificacion: hasContacto
      ? (document.getElementById('cp-contacto-spec').value.trim() || null)
      : null,
  };

  // Actualizar _store
  const idx = (window._store?.pacientes || []).findIndex(p => p.id === pacId);
  if (idx !== -1) Object.assign(window._store.pacientes[idx], cambios);

  const btnSave = document.getElementById('cp-btn-save');
  btnSave.disabled = true;

  if (typeof sbUpdateRow === 'function') {
    await sbUpdateRow('pacientes', pacId, cambios).catch(e => console.error('cp save:', e));
  }

  alertEl.className = 'alert-custom alert-success';
  alertEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Datos actualizados correctamente.';
  alertEl.classList.remove('d-none');

  setTimeout(() => {
    bootstrap.Modal.getInstance(document.getElementById('cp-edit-modal'))?.hide();
    btnSave.disabled = false;
    // Reconstruir índice de casos con datos actualizados
    const newByYear = _cpGetCasos();
    _cpRefrescar(contenedor, newByYear);
  }, 1200);
}

// ─── Tabs de año ──────────────────────────────────────────────────────────────

function _cpRenderYearTabs(contenedor, byYear, years) {
  const wrap = document.getElementById('cp_year_tabs');
  if (!wrap) return;

  wrap.innerHTML = years.map(y => {
    const n = Object.keys(byYear[y] || {}).length;
    return `<button class="lab-subtab-btn${_cpState.yearActual === y ? ' active' : ''}" data-year="${y}">
      ${y}
      <span style="margin-left:.35rem;font-size:.7rem;opacity:.8">(${n})</span>
    </button>`;
  }).join('');

  wrap.querySelectorAll('.lab-subtab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      _cpState.yearActual = this.dataset.year;
      _cpState.pagina = 1;
      _cpRefrescar(contenedor, byYear);
    });
  });
}

// ─── Render tabla ─────────────────────────────────────────────────────────────

function _cpRefrescar(contenedor, byYear) {
  // Actualizar tab activo visualmente
  document.getElementById('cp_year_tabs')?.querySelectorAll('.lab-subtab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.year === _cpState.yearActual);
  });

  const q     = _cpNorm(_cpState.search);
  const filas = _cpGetFilasDeAnio(byYear, _cpState.yearActual)
    .filter(f => !q || f.search.includes(q));

  const total     = filas.length;
  const totalPags = Math.max(1, Math.ceil(total / _CP_PAGE_SIZE));
  _cpState.pagina = Math.min(_cpState.pagina, totalPags);
  const inicio    = (_cpState.pagina - 1) * _CP_PAGE_SIZE;
  const pag       = filas.slice(inicio, inicio + _CP_PAGE_SIZE);

  const meta = document.getElementById('cp_meta');
  if (meta) {
    meta.textContent = total === 0
      ? `Sin casos positivos${_cpState.yearActual ? ' en ' + _cpState.yearActual : ''} para los filtros seleccionados.`
      : `${_cpState.yearActual} · Mostrando ${inicio + 1}–${Math.min(inicio + _CP_PAGE_SIZE, total)} de ${total} caso${total !== 1 ? 's' : ''}`;
  }

  const tbody = document.getElementById('cp_tbody');
  if (tbody) {
    tbody.innerHTML = pag.length
      ? pag.map(f => `
        <tr>
          <td style="font-weight:500;min-width:160px">${f.pac.apellidos}, ${f.pac.nombres}</td>
          <td class="dg-ci">${f.pac.carnet_identidad || '—'}</td>
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
      : `<tr><td colspan="9" class="dg-tabla-vacia">Sin casos positivos en ${_cpState.yearActual || '—'}.</td></tr>`;

    tbody.querySelectorAll('.cp-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => _cpAbrirModal(btn.dataset.pacId, contenedor, byYear));
    });
  }

  _cpPag(totalPags, contenedor, byYear);
}

function _cpPag(totalPags, contenedor, byYear) {
  const wrap = document.getElementById('cp_paginacion');
  if (!wrap) return;
  if (totalPags <= 1) { wrap.innerHTML = ''; return; }

  const pag = _cpState.pagina;
  const pages = [];
  if (totalPags <= 7) {
    for (let i = 1; i <= totalPags; i++) pages.push(i);
  } else {
    pages.push(1);
    if (pag > 3) pages.push('…');
    for (let i = Math.max(2, pag-1); i <= Math.min(totalPags-1, pag+1); i++) pages.push(i);
    if (pag < totalPags - 2) pages.push('…');
    pages.push(totalPags);
  }

  wrap.innerHTML = `
    <button class="dg-pag-btn" data-pag="${pag-1}" ${pag===1?'disabled':''}>‹</button>
    ${pages.map(p => p === '…'
      ? `<span class="dg-pag-ellipsis">…</span>`
      : `<button class="dg-pag-btn${p===pag?' active':''}" data-pag="${p}">${p}</button>`
    ).join('')}
    <button class="dg-pag-btn" data-pag="${pag+1}" ${pag===totalPags?'disabled':''}>›</button>`;

  wrap.querySelectorAll('.dg-pag-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _cpState.pagina = +btn.dataset.pag;
      _cpRefrescar(contenedor, byYear);
    });
  });
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function _initEpiCasosPositivos(contenedor) {
  if (!contenedor) return;

  _cpState.search  = '';
  _cpState.pagina  = 1;
  _cpState.yearActual = null;

  contenedor.innerHTML = _cpHTML();
  _cpEnsureModal();

  const byYear = _cpGetCasos();
  const years  = _cpGetYears(byYear);

  if (!years.length) {
    document.getElementById('cp_meta').textContent =
      'No se registran casos positivos en el período accesible.';
    return;
  }

  _cpState.yearActual = years[0];

  _cpRenderYearTabs(contenedor, byYear, years);

  // Búsqueda y limpiar
  document.getElementById('cp_search')?.addEventListener('input', e => {
    _cpState.search = e.target.value.trim();
    _cpState.pagina = 1;
    _cpRefrescar(contenedor, byYear);
  });
  document.getElementById('cp_btn_limpiar')?.addEventListener('click', () => {
    _cpState.search = '';
    _cpState.pagina = 1;
    const el = document.getElementById('cp_search');
    if (el) el.value = '';
    _cpRefrescar(contenedor, byYear);
  });

  _cpRefrescar(contenedor, byYear);
}

window._initEpiCasosPositivos = _initEpiCasosPositivos;
