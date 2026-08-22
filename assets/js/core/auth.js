/* =========================================================
   auth.js — Flujo de autenticación: login y registro
   Requiere: utils.js, data.js, supabase_client.js (cargados antes)
   ========================================================= */

/* ── Selects geográficos para el formulario de registro ─── */

function populateProvincias() {
    const sel = $('reg-provincia');
    if (!sel) return;
    getGeoProvs().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = p.nombre;
        sel.appendChild(opt);
    });
}

function populateMunicipios(provinciaId) {
    const sel = $('reg-municipio');
    sel.innerHTML = '<option value="">— Seleccione —</option>';
    getGeoMuns()
        .filter(m => m.provincia_id === Number(provinciaId))
        .forEach(m => sel.appendChild(new Option(m.nombre, m.id)));
    sel.disabled = false;
    // Resetear centro
    const selC = $('reg-centro');
    selC.innerHTML = '<option value="">— Seleccione municipio —</option>';
    selC.disabled = true;
}

function populateCentros(municipioId) {
    const sel = $('reg-centro');
    const centros = getGeoCentros().filter(c => c.municipio_id === Number(municipioId));
    sel.innerHTML = '<option value="">— Seleccione —</option>';
    if (centros.length === 0) {
        sel.appendChild(new Option('Otro (no listado en el piloto)', '__otro__'));
    } else {
        centros.forEach(c => sel.appendChild(new Option(`${c.nombre} (${c.tipo})`, c.id)));
        sel.appendChild(new Option('Otro', '__otro__'));
    }
    sel.disabled = false;
}

/* ── Pasos del registro ─────────────────────────────────── */
let currentStep = 1;

function goToStep(n) {
    document.querySelector(`.step[data-step="${currentStep}"]`)?.classList.replace('active', 'done');
    currentStep = n;
    document.querySelectorAll('.form-step').forEach(s => s.classList.add('d-none'));
    $(`step-${n}`)?.classList.remove('d-none');
    const stepEl = document.querySelector(`.step[data-step="${n}"]`);
    if (stepEl) { stepEl.classList.add('active'); stepEl.classList.remove('done'); }
}

/* ── Validaciones por paso ──────────────────────────────── */

function validateStep1() {
    let ok = true;
    clearAllInvalid(
        ['reg-ci','err-reg-ci'],
        ['reg-nombres','err-reg-nombres'],
        ['reg-apellidos','err-reg-apellidos']
    );
    const ci       = $('reg-ci').value.trim();
    const nombres  = $('reg-nombres').value.trim();
    const apellidos= $('reg-apellidos').value.trim();

    if (!ci)
        { setInvalid('reg-ci','err-reg-ci','El carnet de identidad es obligatorio.'); ok = false; }
    else if (!/^[0-9A-Za-z\-]{5,20}$/.test(ci))
        { setInvalid('reg-ci','err-reg-ci','Formato de CI inválido.'); ok = false; }
    else if (getUsers().find(u => u.ci === ci))
        { setInvalid('reg-ci','err-reg-ci','Este CI ya está registrado.'); ok = false; }

    if (!nombres)  { setInvalid('reg-nombres','err-reg-nombres','Ingrese sus nombres.'); ok = false; }
    if (!apellidos){ setInvalid('reg-apellidos','err-reg-apellidos','Ingrese sus apellidos.'); ok = false; }
    return ok;
}

function validateStep2() {
    let ok = true;
    clearAllInvalid(
        ['reg-rol-prof','err-reg-rol-prof'],
        ['reg-registro-prof','err-reg-registro-prof'],
        ['reg-provincia','err-reg-provincia'],
        ['reg-municipio','err-reg-municipio'],
        ['reg-centro','err-reg-centro']
    );
    const rolId = Number($('reg-rol-prof').value);
    if (!rolId)
        { setInvalid('reg-rol-prof','err-reg-rol-prof','Seleccione su rol profesional.'); ok = false; }
    if (rolId && ROLES_PROFESIONALES[rolId]?.requiere_registro) {
        if (!$('reg-registro-prof').value.trim())
            { setInvalid('reg-registro-prof','err-reg-registro-prof','Ingrese su número de registro profesional.'); ok = false; }
    }
    if (!$('reg-provincia').value) { setInvalid('reg-provincia','err-reg-provincia','Seleccione una provincia.'); ok = false; }
    if (!$('reg-municipio').value) { setInvalid('reg-municipio','err-reg-municipio','Seleccione un municipio.'); ok = false; }
    if (!$('reg-centro').value)    { setInvalid('reg-centro','err-reg-centro','Seleccione su centro de salud.'); ok = false; }
    return ok;
}

function validateStep3() {
    let ok = true;
    const pin        = readPin('reg-pin-grid');
    const pinConfirm = readPin('reg-pin-confirm-grid');
    hide('err-reg-pin'); hide('err-reg-pin-confirm');
    document.querySelectorAll('#reg-pin-grid .pin-input').forEach(i => i.classList.remove('is-invalid'));
    document.querySelectorAll('#reg-pin-confirm-grid .pin-input').forEach(i => i.classList.remove('is-invalid'));

    if (pin.length < 4) {
        document.querySelectorAll('#reg-pin-grid .pin-input').forEach(i => i.classList.add('is-invalid'));
        const err = $('err-reg-pin'); err.textContent = 'Ingrese los 4 dígitos del PIN.'; err.classList.add('show'); ok = false;
    }
    if (pinConfirm.length < 4) {
        document.querySelectorAll('#reg-pin-confirm-grid .pin-input').forEach(i => i.classList.add('is-invalid'));
        const err = $('err-reg-pin-confirm'); err.textContent = 'Confirme el PIN.'; err.classList.add('show'); ok = false;
    }
    if (pin.length === 4 && pinConfirm.length === 4 && pin !== pinConfirm) {
        document.querySelectorAll('#reg-pin-confirm-grid .pin-input').forEach(i => i.classList.add('is-invalid'));
        const err = $('err-reg-pin-confirm'); err.textContent = 'Los PINs no coinciden.'; err.classList.add('show'); ok = false;
    }
    return ok;
}

/* ── Resumen del paso 3 ─────────────────────────────────── */
function buildSummary() {
    const provId = Number($('reg-provincia').value);
    const munId  = Number($('reg-municipio').value);
    const centId = $('reg-centro').value;
    const rolId  = Number($('reg-rol-prof').value);

    const prov = getGeoProvs().find(p => p.id === provId)?.nombre || '—';
    const mun  = getGeoMuns().find(m => m.id === munId)?.nombre   || '—';
    const cent = centId === '__otro__'
        ? 'Otro (no listado)'
        : getGeoCentros().find(c => c.id === Number(centId))?.nombre || centId;
    const rol  = ROLES_PROFESIONALES[rolId]?.nombre || '—';

    const rows = [
        ['CI',              $('reg-ci').value.trim()],
        ['Nombres',         `${$('reg-nombres').value.trim()} ${$('reg-apellidos').value.trim()}`],
        ['Rol profesional', rol],
        ['Provincia',       prov],
        ['Municipio',       mun],
        ['Centro',          cent],
    ];
    if (ROLES_PROFESIONALES[rolId]?.requiere_registro)
        rows.splice(3, 0, ['Registro Prof.', $('reg-registro-prof').value.trim()]);

    $('reg-summary').innerHTML = rows
        .map(([l, v]) => `<div class="summary-row"><span class="summary-label">${l}</span><span class="summary-value">${v}</span></div>`)
        .join('');
}

/* ── Inicialización de la página ─────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

    /* Cargar todos los datos desde Supabase antes de montar la UI */
    if (typeof sbInitAll === 'function') {
        try { await sbInitAll(); } catch (e) { console.error('sbInitAll:', e); }
    }

    /* --- Poblar selects y construir grids PIN --- */
    populateProvincias();
    bindPinNavigation('login-pin-grid');
    buildPinGrid('reg-pin-grid');
    buildPinGrid('reg-pin-confirm-grid');

    /* ======= LOGIN ======= */
    $('form-login')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const ci  = $('login-ci').value.trim();
        const pin = readPin('login-pin-grid');
        hide('login-alert');
        clearAllInvalid(['login-ci','err-login-ci']);

        if (!ci) { setInvalid('login-ci','err-login-ci','Ingrese su CI.'); return; }
        if (pin.length < 4) {
            const err = $('err-login-pin');
            err.textContent = 'Ingrese los 4 dígitos.'; err.classList.add('show');
            document.querySelectorAll('#login-pin-grid .pin-input').forEach(i => i.classList.add('is-invalid'));
            return;
        }

        /* Deshabilitar botón mientras espera */
        const btnLogin = this.querySelector('[type="submit"]');
        if (btnLogin) { btnLogin.disabled = true; btnLogin.textContent = 'Verificando…'; }

        const { user, error } = await sbLogin(ci, pin);

        if (btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = '<span class="btn-text">Entrar</span><i class="bi bi-arrow-right-circle btn-icon"></i>'; }

        if (error) { showAlert('login-alert', error, 'danger'); return; }
        if (!user) { showAlert('login-alert', 'CI o PIN incorrecto.', 'danger'); return; }

        sessionStorage.setItem('sr_active_user', user.id);
        loadDashboard(user);
        showView('view-dashboard');
    });

    /* ======= REGISTRO — pasos ======= */
    $('step1-next')?.addEventListener('click', () => { if (validateStep1()) goToStep(2); });

    $('step2-next')?.addEventListener('click', () => {
        if (validateStep2()) { buildSummary(); goToStep(3); }
    });

    $('step2-back')?.addEventListener('click', () => {
        document.querySelector('.step[data-step="2"]')?.classList.remove('done','active');
        goToStep(1);
        document.querySelector('.step[data-step="1"]')?.classList.add('active');
        document.querySelector('.step[data-step="1"]')?.classList.remove('done');
    });

    $('step3-back')?.addEventListener('click', () => {
        document.querySelector('.step[data-step="3"]')?.classList.remove('done','active');
        goToStep(2);
        document.querySelector('.step[data-step="2"]')?.classList.add('active');
        document.querySelector('.step[data-step="2"]')?.classList.remove('done');
    });

    /* ======= REGISTRO — submit ======= */
    $('form-register')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateStep3()) return;
        hide('register-alert');

        const rolId  = Number($('reg-rol-prof').value);
        const centId = $('reg-centro').value;
        const pin    = readPin('reg-pin-grid');

        const nuevoUsuario = {
            id:                   crypto.randomUUID(),   /* UUID v4 real para Supabase */
            ci:                   $('reg-ci').value.trim(),
            nombres:              $('reg-nombres').value.trim(),
            apellidos:            $('reg-apellidos').value.trim(),
            rol_profesional_id:   rolId,
            rol_profesional_nom:  ROLES_PROFESIONALES[rolId]?.nombre,
            registro_profesional: $('reg-registro-prof').value.trim() || null,
            provincia_id:         Number($('reg-provincia').value),
            municipio_id:         Number($('reg-municipio').value),
            centro_salud_id:      centId === '__otro__' ? null : Number(centId),
            centro_texto:         centId === '__otro__'
                ? 'Otro'
                : getGeoCentros().find(c => c.id === Number(centId))?.nombre,
            rol_sistema_id:       1,
            activo:               true,
            aprobado:             false,
            creado_en:            new Date().toISOString()
        };

        const btnReg = this.querySelector('[type="submit"]');
        if (btnReg) { btnReg.disabled = true; btnReg.textContent = 'Registrando…'; }

        const { error } = await sbRegister(nuevoUsuario, pin);

        if (btnReg) { btnReg.disabled = false; btnReg.innerHTML = '<span class="btn-text">Crear cuenta</span><i class="bi bi-check-circle btn-icon"></i>'; }

        if (error) { showAlert('register-alert', error, 'danger'); return; }
        showView('view-success');
    });

    /* ======= REGISTRO — rol profesional toggle ======= */
    $('reg-rol-prof')?.addEventListener('change', function () {
        const rolId = Number(this.value);
        const campo = $('campo-registro-prof');
        const input = $('reg-registro-prof');
        if (ROLES_PROFESIONALES[rolId]?.requiere_registro) {
            campo.style.display = '';
            input.required = true;
        } else {
            campo.style.display = 'none';
            input.required = false;
            input.value = '';
            clearInvalid('reg-registro-prof','err-reg-registro-prof');
        }
    });

    /* ======= REGISTRO — selects geográficos en cascada ======= */
    $('reg-provincia')?.addEventListener('change', function () {
        if (this.value) {
            populateMunicipios(this.value);
        } else {
            $('reg-municipio').innerHTML = '<option value="">— Seleccione provincia —</option>';
            $('reg-municipio').disabled = true;
            $('reg-centro').innerHTML = '<option value="">— Seleccione municipio —</option>';
            $('reg-centro').disabled = true;
        }
    });

    $('reg-municipio')?.addEventListener('change', function () {
        if (this.value) {
            populateCentros(this.value);
        } else {
            $('reg-centro').innerHTML = '<option value="">— Seleccione municipio —</option>';
            $('reg-centro').disabled = true;
        }
    });

    /* ======= NAVEGACIÓN entre vistas ======= */
    $('goto-register')?.addEventListener('click', () => {
        showView('view-register');
        currentStep = 1;
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active','done'));
        document.querySelector('.step[data-step="1"]')?.classList.add('active');
        document.querySelectorAll('.form-step').forEach(s => s.classList.add('d-none'));
        $('step-1')?.classList.remove('d-none');
    });

    $('goto-login-back')?.addEventListener('click', () => showView('view-login'));

    $('success-goto-login')?.addEventListener('click', () => {
        $('form-register')?.reset();
        document.querySelectorAll('.pin-input').forEach(i => i.value = '');
        showView('view-login');
    });

    /* ======= LOGOUT ======= */
    $('btn-logout')?.addEventListener('click', async () => {
        await sbLogout();
        $('app-shell').classList.add('d-none');
        document.querySelector('.layout-wrapper')?.classList.remove('d-none');
        if ($('login-ci')) $('login-ci').value = '';
        document.querySelectorAll('#login-pin-grid .pin-input').forEach(i => i.value = '');
        showView('view-login');
    });

    /* ======= RESTAURAR SESIÓN ======= */
    sbGetSession().then(user => {
        if (user && user.activo) {
            sessionStorage.setItem('sr_active_user', user.id);
            loadDashboard(user);
            showView('view-dashboard');
        } else {
            showView('view-login');
        }
    });
});
