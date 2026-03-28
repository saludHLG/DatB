/* =========================================================
   app.js — Shell de la aplicación post-login
   Requiere: utils.js, data.js, indicacion.js,
             laboratorio_core.js, home_lab.js, home_usuario.js,
             auth.js  (todos cargados antes)
   ======================================================== */

/* ============================================================
   SHELL — carga del dashboard tras autenticación exitosa
   ============================================================ */
function loadDashboard(user) {

    if (typeof sbInitAll === 'function') sbInitAll().catch(() => {});
 
    window._store.active_user = user.id;

    document.querySelector('.layout-wrapper')?.classList.add('d-none');
    $('app-shell').classList.remove('d-none');

    const initials = ((user.nombres[0] || '') + (user.apellidos[0] || '')).toUpperCase();
    const prov     = getGeoProvs().find(p => p.id === user.provincia_id)?.nombre || '—';
    const mun      = getGeoMuns().find(m => m.id === user.municipio_id)?.nombre  || '—';
    const centro   = user.centro_texto || '—';
    const rolSis   = ROLES_SISTEMA[user.rol_sistema_id] || 'Usuario';

    $('topbar-avatar').textContent = initials;
    $('topbar-name').textContent   = `${user.nombres} ${user.apellidos}`;

    $('sp-avatar').textContent   = initials;
    $('sp-name').textContent     = `${user.nombres} ${user.apellidos}`;
    $('sp-rol-prof').textContent = user.rol_profesional_nom;
    const sp = $('sp-estado');
    if (!user.aprobado) {
        sp.innerHTML  = '<i class="bi bi-hourglass-split"></i> Pendiente';
        sp.className  = 'sp-estado sp-estado-pending';
    } else {
        sp.innerHTML  = '<i class="bi bi-check-circle-fill"></i> Activo';
        sp.className  = 'sp-estado sp-estado-ok';
    }

    $('sidebar-meta').innerHTML = `
        <div class="meta-row"><i class="bi bi-geo-alt"></i><span>${prov}</span></div>
        <div class="meta-row"><i class="bi bi-signpost-split"></i><span>${mun}</span></div>
        <div class="meta-row"><i class="bi bi-hospital"></i><span title="${centro}">${centro}</span></div>
        <div class="meta-row"><i class="bi bi-shield-half"></i><span>${rolSis}</span></div>
    `;

    const nav    = $('app-nav');
    nav.innerHTML = '';
    const modulos = buildModulos(user);
    modulos.forEach((m, i) => {
        const li  = document.createElement('li');
        const btn = document.createElement('button');
        btn.className      = `app-nav-btn${i === 0 ? ' active' : ''}`;
        btn.dataset.modulo = m.id;
        btn.innerHTML      = `<i class="bi ${m.icon}"></i><span>${m.label}</span>`;
        btn.addEventListener('click', function () {
            document.querySelectorAll('.app-nav-btn[data-modulo]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderModulo(m.id, user);
        });
        li.appendChild(btn);
        nav.appendChild(li);
    });

    renderModulo(modulos[0].id, user);
}

/* ── Módulos disponibles según rol y permisos ───────────── */
function buildModulos(user) {
    const mods = [];

    // Evaluamos primero el rol para determinar si mostramos el "Inicio"
    const esLabProfesional = [3, 4].includes(user.rol_profesional_id);
    const perms = window._store.permisos_lab || [];
    const tienePermiso = perms.some(p =>
        p.usuario_id === user.id &&
        (p.puede_emitir || p.puede_editar || p.puede_eliminar) && p.activo
    );
    const esObservador = [4, 5, 6].includes(user.rol_sistema_id);

    // El módulo de "Inicio" NO se muestra a licenciados y técnicos de laboratorio
    if (!esLabProfesional) {
        mods.push({ id: 'home', icon: 'bi-house', label: 'Inicio' });
    }

    if (user.aprobado) {
        if ([1, 2].includes(user.rol_profesional_id))
            mods.push({ id: 'indicaciones', icon: 'bi-clipboard2-pulse', label: 'Indicaciones' });

        if (tienePermiso || esLabProfesional || esObservador)
            mods.push({ id: 'laboratorio', icon: 'bi-flask', label: 'Laboratorio' });

        if ([2, 3, 4, 5].includes(user.rol_sistema_id))
            mods.push({ id: 'datos', icon: 'bi-graph-up', label: 'Datos epidemiológicos' });

        if (user.rol_sistema_id === 6)
            mods.push({ id: 'admin', icon: 'bi-shield-check', label: 'Administración' });
    }

    mods.push({ id: 'perfil', icon: 'bi-person-circle', label: 'Mi perfil' });
    return mods;
}

/* ── Despacho de módulos ─────────────────────────────────── */
function renderModulo(id, user) {
    /* Destruir gráficos del módulo anterior */
    if (typeof _hl_destroyCharts === 'function') _hl_destroyCharts();

    const el = $('app-content-inner');
    const labels = {
        home:         'Inicio',
        indicaciones: 'Indicaciones de examen',
        laboratorio:  'Laboratorio',
        datos:        'Datos epidemiológicos',
        admin:        'Administración',
        perfil:       'Mi perfil'
    };
    $('topbar-title').textContent = labels[id] || id;

    if (id === 'home') {
        renderHomeUsuario(user, el);
    } else if (id === 'perfil') {
        renderPerfil(user, el);
    } else if (id === 'admin') {
        el.innerHTML = `
            <div class="modulo-header">
                <h2 class="modulo-title">Administración</h2>
                <p class="modulo-sub">Acceda al panel completo de gestión de usuarios y catálogos.</p>
            </div>
            <div class="modulo-cta">
                <a href="admin.html" class="btn-primary-custom" style="text-decoration:none;font-size:1rem;padding:.85rem 2rem">
                    <i class="bi bi-shield-check"></i> Ir al panel de administración
                </a>
            </div>`;
    } else if (id === 'indicaciones') {
        renderIndicaciones(user, el);
    } else if (id === 'laboratorio') {
        renderLaboratorio(user, el);
    } else {
        el.innerHTML = `
            <div class="modulo-header">
                <h2 class="modulo-title">${labels[id] || id}</h2>
                <p class="modulo-sub">Módulo en desarrollo — disponible en fases posteriores.</p>
            </div>
            <div class="modulo-placeholder">
                <i class="bi bi-tools"></i>
                <p>En construcción.</p>
            </div>`;
    }
}

/* ============================================================
   PERFIL + FIRMA DIGITAL — todos los usuarios
   ============================================================ */
let _firmaUser = null;

function renderPerfil(user, el) {
    const provOpts = getGeoProvs()
        .map(p => `<option value="${p.id}" ${p.id === user.provincia_id ? 'selected' : ''}>${p.nombre}</option>`)
        .join('');
    const munOpts = getGeoMuns()
        .filter(m => m.provincia_id === user.provincia_id)
        .map(m => `<option value="${m.id}" ${m.id === user.municipio_id ? 'selected' : ''}>${m.nombre}</option>`)
        .join('');
    const centroOpts = getGeoCentros()
        .filter(c => c.municipio_id === user.municipio_id)
        .map(c => `<option value="${c.id}" ${c.id === user.centro_salud_id ? 'selected' : ''}>${c.nombre}${c.tipo ? ' (' + c.tipo + ')' : ''}</option>`)
        .join('');
    const rpOpts = Object.entries(ROLES_PROFESIONALES)
        .map(([id, r]) => `<option value="${id}" ${Number(id) === user.rol_profesional_id ? 'selected' : ''}>${r.nombre}</option>`)
        .join('');

    const rolSisLabel = ROLES_SISTEMA[user.rol_sistema_id] || '—';
    const estadoHtml  = user.aprobado
        ? '<i class="bi bi-check-circle-fill" style="color:var(--success)"></i> Aprobado'
        : '<i class="bi bi-hourglass-split" style="color:var(--warning)"></i> Pendiente aprobación';

    el.innerHTML = `
        <div class="modulo-header">
            <h2 class="modulo-title">Mi perfil</h2>
            <p class="modulo-sub">Edite sus datos personales y cambie su PIN de acceso.</p>
        </div>
        <div class="perfil-layout">

            <div class="perfil-card">
                <div class="perfil-card-header"><i class="bi bi-person-badge"></i> Datos de la cuenta</div>
                <div class="perfil-edit-form-app" style="padding:1.1rem">

                    <div class="perfil-data-row">
                        <span class="perfil-data-label">Carnet identidad</span>
                        <span class="perfil-data-val mono">${user.ci}</span>
                    </div>
                    <div class="perfil-data-row">
                        <span class="perfil-data-label">Rol de sistema</span>
                        <span class="perfil-data-val">${rolSisLabel}</span>
                    </div>
                    <div class="perfil-data-row" style="margin-bottom:.85rem">
                        <span class="perfil-data-label">Estado</span>
                        <span class="perfil-data-val">${estadoHtml}</span>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-6">
                            <label class="perfil-field-label">Nombres <span style="color:var(--danger)">*</span></label>
                            <input type="text" id="app-perfil-nombres" class="form-control form-control-sm" value="${user.nombres || ''}">
                        </div>
                        <div class="col-12 col-sm-6">
                            <label class="perfil-field-label">Apellidos <span style="color:var(--danger)">*</span></label>
                            <input type="text" id="app-perfil-apellidos" class="form-control form-control-sm" value="${user.apellidos || ''}">
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-6">
                            <label class="perfil-field-label">Rol profesional</label>
                            <select id="app-perfil-rol-prof" class="form-select form-select-sm">${rpOpts}</select>
                        </div>
                        <div class="col-12 col-sm-6">
                            <label class="perfil-field-label">Registro profesional</label>
                            <input type="text" id="app-perfil-registro" class="form-control form-control-sm"
                                   style="font-family:var(--font-mono)" value="${user.registro_profesional || ''}" placeholder="RM-00000">
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-4">
                            <label class="perfil-field-label">Provincia</label>
                            <select id="app-perfil-prov" class="form-select form-select-sm">
                                <option value="">— Seleccione —</option>${provOpts}
                            </select>
                        </div>
                        <div class="col-12 col-sm-4">
                            <label class="perfil-field-label">Municipio</label>
                            <select id="app-perfil-mun" class="form-select form-select-sm" ${!user.provincia_id ? 'disabled' : ''}>
                                <option value="">— Seleccione —</option>${munOpts}
                            </select>
                        </div>
                        <div class="col-12 col-sm-4">
                            <label class="perfil-field-label">Centro de salud</label>
                            <select id="app-perfil-centro" class="form-select form-select-sm" ${!user.municipio_id ? 'disabled' : ''}>
                                <option value="">— Seleccione —</option>
                                ${centroOpts}
                                <option value="__otro__" ${!user.centro_salud_id ? 'selected' : ''}>Otro / no listado</option>
                            </select>
                        </div>
                    </div>

                    <div id="app-perfil-err" class="alert-custom alert-danger mt-2 d-none"></div>
                    <div style="display:flex;justify-content:flex-end;margin-top:.75rem">
                        <button class="btn-primary-custom" id="btn-app-save-perfil" style="font-size:.85rem;padding:.5rem 1.1rem">
                            <i class="bi bi-floppy"></i> Guardar datos
                        </button>
                    </div>
                </div>

                <div style="border-top:1.5px solid var(--silver-pale);margin:0 1.1rem;padding:1rem 0">
                    <p style="font-size:.8rem;font-weight:700;color:var(--navy);margin-bottom:.75rem;text-transform:uppercase;letter-spacing:.06em">
                        <i class="bi bi-key"></i> Cambiar PIN de acceso
                    </p>
                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-4">
                            <label class="perfil-field-label">PIN actual</label>
                            <input type="password" id="app-pin-actual" class="form-control form-control-sm"
                                   style="font-family:var(--font-mono);letter-spacing:.25em" maxlength="4" inputmode="numeric" placeholder="••••">
                        </div>
                        <div class="col-12 col-sm-4">
                            <label class="perfil-field-label">PIN nuevo</label>
                            <input type="password" id="app-pin-nuevo" class="form-control form-control-sm"
                                   style="font-family:var(--font-mono);letter-spacing:.25em" maxlength="4" inputmode="numeric" placeholder="••••">
                        </div>
                        <div class="col-12 col-sm-4">
                            <label class="perfil-field-label">Confirmar PIN</label>
                            <input type="password" id="app-pin-confirm" class="form-control form-control-sm"
                                   style="font-family:var(--font-mono);letter-spacing:.25em" maxlength="4" inputmode="numeric" placeholder="••••">
                        </div>
                    </div>
                    <div id="app-pin-err" class="alert-custom alert-danger mt-2 d-none"></div>
                    <div style="display:flex;justify-content:flex-end;margin-top:.75rem">
                        <button class="btn-primary-custom" id="btn-app-save-pin" style="font-size:.85rem;padding:.5rem 1.1rem">
                            <i class="bi bi-key"></i> Cambiar PIN
                        </button>
                    </div>
                </div>
            </div>

            <div class="perfil-card">
                <div class="perfil-card-header"><i class="bi bi-pen"></i> Firma digital</div>
                <div class="firma-wrap">
                    <p class="firma-hint">Dibuje su firma con el ratón o con el dedo.</p>
                    <div class="canvas-container">
                        <canvas id="firma-canvas" width="440" height="180"></canvas>
                        <div class="canvas-placeholder" id="canvas-placeholder">
                            <i class="bi bi-vector-pen"></i><span>Trace su firma aquí</span>
                        </div>
                    </div>
                    <div class="firma-actions">
                        <button class="btn-firma-clear" id="btn-firma-clear">
                            <i class="bi bi-eraser"></i> Limpiar
                        </button>
                        <div class="firma-tools">
                            <label class="firma-tool-label">Grosor
                                <input type="range" id="firma-grosor" min="1" max="6" value="2" step="0.5">
                            </label>
                            <label class="firma-tool-label">Color
                                <input type="color" id="firma-color" value="#0b1e3d">
                            </label>
                        </div>
                        <button class="btn-firma-save" id="btn-firma-save">
                            <i class="bi bi-floppy"></i> Guardar
                        </button>
                    </div>
                    <div id="firma-saved-wrap" class="firma-saved-wrap d-none">
                        <span class="firma-saved-label">Guardada:</span>
                        <img id="firma-saved-img" alt="Firma guardada" class="firma-saved-img">
                        <button class="btn-firma-clear" id="btn-firma-delete">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

    /* ---- Cascadas provincia → municipio → centro ---- */
    $('app-perfil-prov')?.addEventListener('change', function () {
        const selM = $('app-perfil-mun'), selC = $('app-perfil-centro');
        selM.innerHTML = '<option value="">— Seleccione —</option>';
        getGeoMuns().filter(m => m.provincia_id === Number(this.value))
            .forEach(m => selM.appendChild(new Option(m.nombre, m.id)));
        selM.disabled = !this.value;
        selC.innerHTML = '<option value="">— Seleccione —</option><option value="__otro__" selected>Otro / no listado</option>';
        selC.disabled = true;
    });

    $('app-perfil-mun')?.addEventListener('change', function () {
        const selC = $('app-perfil-centro');
        selC.innerHTML = '<option value="">— Seleccione —</option>';
        getGeoCentros().filter(c => c.municipio_id === Number(this.value))
            .forEach(c => selC.appendChild(new Option(`${c.nombre}${c.tipo ? ' (' + c.tipo + ')' : ''}`, c.id)));
        selC.appendChild(new Option('Otro / no listado', '__otro__'));
        selC.disabled = !this.value;
    });

    /* ---- Guardar datos personales ---- */
    $('btn-app-save-perfil')?.addEventListener('click', () => {
        const errEl = $('app-perfil-err');
        errEl.classList.add('d-none');
        const nom = $('app-perfil-nombres').value.trim();
        const ap  = $('app-perfil-apellidos').value.trim();
        if (!nom || !ap) {
            errEl.textContent = 'Nombres y apellidos son obligatorios.';
            errEl.classList.remove('d-none');
            return;
        }
        const users = getUsers(), idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) return;

        const rpId     = Number($('app-perfil-rol-prof').value);
        const centroVal= $('app-perfil-centro').value;

        users[idx].nombres              = nom;
        users[idx].apellidos            = ap;
        users[idx].rol_profesional_id   = rpId;
        users[idx].rol_profesional_nom  = ROLES_PROFESIONALES[rpId]?.nombre || '';
        users[idx].registro_profesional = $('app-perfil-registro').value.trim() || null;
        users[idx].provincia_id         = Number($('app-perfil-prov').value) || null;
        users[idx].municipio_id         = Number($('app-perfil-mun').value)  || null;
        if (centroVal && centroVal !== '__otro__') {
            users[idx].centro_salud_id = Number(centroVal);
            users[idx].centro_texto    = $('app-perfil-centro').selectedOptions[0]?.text?.replace(/ \(.*\)$/, '') || null;
        } else {
            users[idx].centro_salud_id = null;
        }
        saveUsers(users);

        $('sp-name').textContent     = `${nom} ${ap}`;
        $('topbar-name').textContent = `${nom} ${ap}`;
        const initials = (nom[0] + ap[0]).toUpperCase();
        $('sp-avatar').textContent     = initials;
        $('topbar-avatar').textContent = initials;
        showToastApp('Datos actualizados correctamente.', 'success');
    });

    /* ---- Cambiar PIN ---- */
    $('btn-app-save-pin')?.addEventListener('click', () => {
        const errEl  = $('app-pin-err');
        errEl.classList.add('d-none');
        const actual  = $('app-pin-actual').value;
        const nuevo   = $('app-pin-nuevo').value;
        const confirm = $('app-pin-confirm').value;

        if (!/^\d{4}$/.test(actual))  { errEl.textContent = 'Ingrese su PIN actual (4 dígitos).';                      errEl.classList.remove('d-none'); return; }
        if (!/^\d{4}$/.test(nuevo))   { errEl.textContent = 'El PIN nuevo debe tener exactamente 4 dígitos numéricos.'; errEl.classList.remove('d-none'); return; }
        if (nuevo !== confirm)         { errEl.textContent = 'El PIN nuevo y la confirmación no coinciden.';              errEl.classList.remove('d-none'); return; }

        const users = getUsers(), idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) return;
        if (users[idx].pin_hash !== hashPin(actual)) {
            errEl.textContent = 'El PIN actual es incorrecto.';
            errEl.classList.remove('d-none');
            return;
        }
        users[idx].pin_hash = hashPin(nuevo);
        saveUsers(users);
        $('app-pin-actual').value = '';
        $('app-pin-nuevo').value  = '';
        $('app-pin-confirm').value= '';
        showToastApp('PIN cambiado correctamente.', 'success');
    });

    /* ---- Canvas de firma ---- */
    requestAnimationFrame(() => initFirmaCanvas(user));
}

/* ── Canvas de firma digital ─────────────────────────────── */
function initFirmaCanvas(user) {
    _firmaUser = user;
    const canvas = $('firma-canvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    let drawing  = false, hasMark = false;

    if (!window._store.firmas) window._store.firmas = {};
    const saved = window._store.firmas[`sr_firma_${user.id}`];

    if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = saved;
        $('canvas-placeholder').classList.add('d-none');
        $('firma-saved-img').src = saved;
        $('firma-saved-wrap').classList.remove('d-none');
        hasMark = true;
    }

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const sx = canvas.width / r.width, sy = canvas.height / r.height;
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
    }
    function onStart(e) {
        e.preventDefault(); drawing = true;
        if (!hasMark) { hasMark = true; $('canvas-placeholder').classList.add('d-none'); }
        const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    function onMove(e) {
        if (!drawing) return; e.preventDefault();
        ctx.lineWidth   = Number($('firma-grosor').value);
        ctx.strokeStyle = $('firma-color').value;
        const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    function onEnd() { drawing = false; }

    canvas.addEventListener('mousedown',  onStart);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onEnd);

    $('btn-firma-clear').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $('canvas-placeholder').classList.remove('d-none');
        hasMark = false;
    };
    $('btn-firma-save').onclick = () => {
        if (!hasMark) return;
        const data = canvas.toDataURL('image/png');
        window._store.firmas[`sr_firma_${user.id}`] = data;
        $('firma-saved-img').src = data;
        $('firma-saved-wrap').classList.remove('d-none');
        showToastApp('Firma guardada.', 'success');
    };
    $('btn-firma-delete').onclick = () => {
        delete window._store.firmas[`sr_firma_${user.id}`];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $('canvas-placeholder').classList.remove('d-none');
        $('firma-saved-wrap').classList.add('d-none');
        hasMark = false;
        showToastApp('Firma eliminada.', 'info');
    };
}
