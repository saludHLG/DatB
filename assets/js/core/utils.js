/* =========================================================
   utils.js — Utilidades compartidas DatB
   Lee/escribe en _store (definido en supabase_client.js).
   Sin localStorage.
   ========================================================= */

/* ── Atajos DOM ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const show = id => { const el = $(id); if (el) el.classList.remove('d-none'); };
const hide = id => { const el = $(id); if (el) el.classList.add('d-none'); };

/* ── Seguridad ──────────────────────────────────────────── */
function hashPin(pin) {
    let h = 5381;
    for (let i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i);
    return (h >>> 0).toString(36);
}

/* ── PIN ────────────────────────────────────────────────── */
function readPin(gridId) {
    return [...document.querySelectorAll(`#${gridId} .pin-input`)]
        .map(i => i.value).join('');
}

function buildPinGrid(gridId) {
    const grid = $(gridId);
    if (!grid || grid.children.length > 0) return;
    for (let i = 0; i < 4; i++) {
        const inp = document.createElement('input');
        inp.type      = 'password';
        inp.className = 'pin-input';
        inp.maxLength = 1;
        inp.inputMode = 'numeric';
        inp.pattern   = '[0-9]';
        inp.setAttribute('aria-label', `Dígito ${i + 1}`);
        grid.appendChild(inp);
    }
    bindPinNavigation(gridId);
}

function bindPinNavigation(gridId) {
    const inputs = [...document.querySelectorAll(`#${gridId} .pin-input`)];
    inputs.forEach((inp, idx) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/\D/g, '').slice(-1);
            if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx - 1].focus();
        });
        inp.addEventListener('paste', e => {
            e.preventDefault();
            const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            digits.split('').forEach((d, i) => { if (inputs[i]) inputs[i].value = d; });
            if (inputs[Math.min(digits.length, 3)]) inputs[Math.min(digits.length, 3)].focus();
        });
    });
}

/* ── Validación ─────────────────────────────────────────── */
function setInvalid(inputId, errId, msg) {
    const el = $(inputId); if (el) el.classList.add('is-invalid');
    const err = $(errId);  if (err) { err.textContent = msg; err.classList.add('show'); }
}

function clearInvalid(inputId, errId) {
    const el = $(inputId); if (el) el.classList.remove('is-invalid');
    const err = $(errId);  if (err) { err.textContent = ''; err.classList.remove('show'); }
}

function clearAllInvalid(...pairs) {
    pairs.forEach(([i, e]) => clearInvalid(i, e));
}

/* ── Alertas ────────────────────────────────────────────── */
function showAlert(containerId, msg, type = 'danger') {
    const el = $(containerId); if (!el) return;
    el.className  = `alert-custom alert-${type}`;
    el.textContent = msg;
    el.classList.remove('d-none');
}

/* ── Toast (app-shell) ──────────────────────────────────── */
function showToastApp(msg, type = 'success') {
    let toast = $('app-toast');
    if (!toast) {
        toast    = document.createElement('div');
        toast.id = 'app-toast';
        document.body.appendChild(toast);
    }
    const icons  = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    const colors = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--cyan)' };
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}"></i> ${msg}`;
    toast.className = 'app-toast-msg';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.className = 'app-toast-msg app-toast-hide'; }, 2800);
}

/* ── Vistas ─────────────────────────────────────────────── */
function showView(viewId) {
    document.querySelectorAll('.form-view').forEach(v => v.classList.remove('active'));
    const target = $(viewId);
    if (target) target.classList.add('active');
}

/* ── Usuarios — usa _store ──────────────────────────────── */
function getUsers()       { return _store.usuarios; }
const saveUsers   = u => { window._store.usuarios     = u; };
const savePerms   = p => { window._store.permisos_lab = p; };
const saveAccesos = a => {
    window._store.accesos_temp = a;
    if (typeof sbUpsertRows === 'function')
        sbUpsertRows('accesos_temporales', a).catch(e => console.error(e));
};

/* ── Accesores geográficos — usa _store con fallback estático */
const getGeoProvs   = () => _store.geo_provincias.length   ? _store.geo_provincias   : (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.provincias   : []);
const getGeoMuns    = () => _store.geo_municipios.length    ? _store.geo_municipios    : (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.municipios    : []);
const getGeoCentros = () => _store.geo_centros.length       ? _store.geo_centros       : (typeof DATOS_GEO !== 'undefined' ? DATOS_GEO.centros_salud : []);
const getGeoLabs    = () => _store.geo_labs.length          ? _store.geo_labs          : (typeof DATOS_GEO !== 'undefined' ? (DATOS_GEO.laboratorios || []) : []);

/* ── Helpers de fecha/ID compartidos ────────────────────── */
function genIdShared() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function todayShared() {
    return new Date().toISOString().split('T')[0];
}

function fmtDateShared(d) {
    if (!d) return '—';
    const p = String(d).split('T')[0].split('-');
    if (p.length < 3) return d;
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function addDaysShared(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

/* ── Diálogo de confirmación ────────────────────────────── */
function _appConfirm(msg, onOk, okLabel) {
    const modalEl = document.getElementById('app-confirm-modal');
    if (!modalEl) { if (window.confirm(msg)) onOk(); return; }

    document.getElementById('app-confirm-msg').innerHTML = msg;
    const btnOk     = document.getElementById('app-confirm-ok');
    const btnCancel = document.getElementById('app-confirm-cancel');
    btnOk.innerHTML = `<i class="bi bi-trash"></i> ${okLabel || 'Eliminar'}`;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    btnOk.onclick     = () => { bsModal.hide(); onOk(); };
    btnCancel.onclick = () => bsModal.hide();
    bsModal.show();
}
