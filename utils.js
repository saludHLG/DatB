/* =========================================================
   utils.js — Utilidades compartidas  DatB
   Cargado primero; disponible para todos los módulos.
   ========================================================= */

/* ── Atajos DOM ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const show = id => { const el = $(id); if (el) el.classList.remove('d-none'); };
const hide = id => { const el = $(id); if (el) el.classList.add('d-none'); };

/* ── Seguridad ──────────────────────────────────────────── */
/**
 * Hash djb2 — SÓLO para prototipo local (localStorage).
 * En producción reemplazar por bcrypt/argon2 en servidor.
 */
function hashPin(pin) {
    let h = 5381;
    for (let i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i);
    return (h >>> 0).toString(36);
}

/* ── PIN — lectura y construcción ───────────────────────── */
/** Lee el valor completo de un grupo de inputs PIN */
function readPin(gridId) {
    return [...document.querySelectorAll(`#${gridId} .pin-input`)]
        .map(i => i.value).join('');
}

/** Genera dinámicamente los 4 inputs de un grid PIN */
function buildPinGrid(gridId) {
    const grid = $(gridId);
    if (!grid || grid.children.length > 0) return;
    for (let i = 0; i < 4; i++) {
        const inp = document.createElement('input');
        inp.type        = 'password';
        inp.className   = 'pin-input';
        inp.maxLength   = 1;
        inp.inputMode   = 'numeric';
        inp.pattern     = '[0-9]';
        inp.setAttribute('aria-label', `Dígito ${i + 1}`);
        grid.appendChild(inp);
    }
    bindPinNavigation(gridId);
}

/** Navegación automática entre celdas PIN (incluye paste y backspace) */
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

/* ── Validación de campos ───────────────────────────────── */
function setInvalid(inputId, errId, msg) {
    const el = $(inputId);
    if (el) el.classList.add('is-invalid');
    const err = $(errId);
    if (err) { err.textContent = msg; err.classList.add('show'); }
}

function clearInvalid(inputId, errId) {
    const el = $(inputId);
    if (el) el.classList.remove('is-invalid');
    const err = $(errId);
    if (err) { err.textContent = ''; err.classList.remove('show'); }
}

/** Limpia múltiples pares [inputId, errId] de una vez */
function clearAllInvalid(...pairs) {
    pairs.forEach(([i, e]) => clearInvalid(i, e));
}

/* ── Alertas en contenedores fijos ─────────────────────── */
function showAlert(containerId, msg, type = 'danger') {
    const el = $(containerId);
    if (!el) return;
    el.className = `alert-custom alert-${type}`;
    el.textContent = msg;
    el.classList.remove('d-none');
}

/* ── Toast de notificación (app-shell) ──────────────────── */
function showToastApp(msg, type = 'success') {
    let toast = $('app-toast');
    if (!toast) {
        toast = document.createElement('div');
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

/* ── Navegación entre vistas del layout de autenticación ── */
function showView(viewId) {
    document.querySelectorAll('.form-view').forEach(v => v.classList.remove('active'));
    const target = $(viewId);
    if (target) target.classList.add('active');
}

/* ── Almacenamiento de usuarios ─────────────────────────── */
function getUsers()       { return JSON.parse(localStorage.getItem('sr_usuarios') || '[]'); }
function saveUsers(users) { localStorage.setItem('sr_usuarios', JSON.stringify(users)); }

/* ── Helpers compartidos (evitan duplicación entre módulos) ─ */

/** Genera UUID v4 */
function genIdShared() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/** Fecha de hoy en formato YYYY-MM-DD */
function todayShared() {
    return new Date().toISOString().split('T')[0];
}

/** Formatea YYYY-MM-DD → DD/MM/YYYY */
function fmtDateShared(d) {
    if (!d) return '—';
    const p = String(d).split('T')[0].split('-');
    if (p.length < 3) return d;
    return `${p[2]}/${p[1]}/${p[0]}`;
}

/** Suma N días a una fecha YYYY-MM-DD, devuelve YYYY-MM-DD */
function addDaysShared(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

/* ── Accesores geo (con fallback a datos estáticos) ─────── */
/*
 * Leen primero el localStorage (que puede haber sido editado por admin),
 * y si está vacío usan los datos estáticos de data.js.
 * DATOS_GEO se define en data.js, cargado justo después de utils.js.
 */
const getGeoProvs   = () => JSON.parse(localStorage.getItem('sr_geo_provincias') || 'null') || DATOS_GEO.provincias;
const getGeoMuns    = () => JSON.parse(localStorage.getItem('sr_geo_municipios')  || 'null') || DATOS_GEO.municipios;
const getGeoCentros = () => JSON.parse(localStorage.getItem('sr_geo_centros')     || 'null') || DATOS_GEO.centros_salud;
const getGeoLabs    = () => JSON.parse(localStorage.getItem('sr_geo_labs')        || 'null') || (DATOS_GEO.laboratorios || []);

/* ── Diálogo de confirmación nativo de la app ────────────────
   Reemplaza window.confirm() con un modal Bootstrap reutilizable.
   Uso: _appConfirm('¿Eliminar esto?', callback, 'Eliminar');
   El tercer argumento (opcional) personaliza el texto del botón OK.
   ─────────────────────────────────────────────────────────── */
function _appConfirm(msg, onOk, okLabel) {
    const modalEl = document.getElementById('app-confirm-modal');
    if (!modalEl) { if (window.confirm(msg)) onOk(); return; } // fallback seguro

    document.getElementById('app-confirm-msg').innerHTML = msg;

    const btnOk     = document.getElementById('app-confirm-ok');
    const btnCancel = document.getElementById('app-confirm-cancel');
    btnOk.innerHTML = `<i class="bi bi-trash"></i> ${okLabel || 'Eliminar'}`;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);

    // Reemplazar onclick directamente evita duplicar listeners
    btnOk.onclick     = () => { bsModal.hide(); onOk(); };
    btnCancel.onclick = () => bsModal.hide();

    bsModal.show();
}
