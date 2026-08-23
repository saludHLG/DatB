/* =========================================================
   app_legacy.js — compatibilidad histórica mínima del shell
   Responsabilidades migradas:
   - navigation.js / navigation_render.js
   - module_router.js
   - profile.js
   - signature.js
   ======================================================== */

function loadDashboard(user) {
    if (typeof sbInitAll === 'function') sbInitAll().catch(() => {});

    window._store.active_user = user.id;

    document.querySelector('.layout-wrapper')?.classList.add('d-none');
    $('app-shell').classList.remove('d-none');

    const initials = ((user.nombres[0] || '') + (user.apellidos[0] || '')).toUpperCase();
    const prov = getGeoProvs().find(p => p.id === user.provincia_id)?.nombre || '—';
    const mun = getGeoMuns().find(m => m.id === user.municipio_id)?.nombre || '—';
    const centro = user.centro_texto || '—';
    const rolSis = ROLES_SISTEMA[user.rol_sistema_id] || 'Usuario';

    $('topbar-avatar').textContent = initials;
    $('topbar-name').textContent = `${user.nombres} ${user.apellidos}`;
    $('sp-avatar').textContent = initials;
    $('sp-name').textContent = `${user.nombres} ${user.apellidos}`;
    $('sp-rol-prof').textContent = user.rol_profesional_nom;

    const sp = $('sp-estado');
    if (!user.aprobado) {
        sp.innerHTML = '<i class="bi bi-hourglass-split"></i> Pendiente';
        sp.className = 'sp-estado sp-estado-pending';
    } else {
        sp.innerHTML = '<i class="bi bi-check-circle-fill"></i> Activo';
        sp.className = 'sp-estado sp-estado-ok';
    }

    $('sidebar-meta').innerHTML = `
        <div class="meta-row"><i class="bi bi-geo-alt"></i><span>${prov}</span></div>
        <div class="meta-row"><i class="bi bi-signpost-split"></i><span>${mun}</span></div>
        <div class="meta-row"><i class="bi bi-hospital"></i><span title="${centro}">${centro}</span></div>
        <div class="meta-row"><i class="bi bi-shield-half"></i><span>${rolSis}</span></div>
    `;

    renderNavigation(user);
}

function buildModulos(user) {
    const mods = [];
    const esLabProfesional = [3, 4].includes(user.rol_profesional_id);
    const perms = window._store.permisos_lab || [];
    const tienePermiso = perms.some(p =>
        p.usuario_id === user.id &&
        (p.puede_emitir || p.puede_editar || p.puede_eliminar) && p.activo
    );
    const esObservador = [4, 5, 6].includes(user.rol_sistema_id);

    if (!esLabProfesional) {
        mods.push({ id: 'home', icon: 'bi-house', label: 'Inicio' });
    }

    if (user.aprobado) {
        if ([1, 2].includes(user.rol_profesional_id)) {
            mods.push({ id: 'indicaciones', icon: 'bi-clipboard2-pulse', label: 'Indicaciones' });
        }
        if (tienePermiso || esLabProfesional || esObservador) {
            mods.push({ id: 'laboratorio', icon: 'bi-flask', label: 'Laboratorio' });
        }
        if ([2, 3, 4, 5].includes(user.rol_sistema_id)) {
            mods.push({ id: 'datos', icon: 'bi-graph-up', label: 'Datos epidemiológicos' });
        }
        if (user.rol_sistema_id === 6) {
            mods.push({ id: 'admin', icon: 'bi-shield-check', label: 'Administración' });
        }
    }

    mods.push({ id: 'perfil', icon: 'bi-person-circle', label: 'Mi perfil' });
    return mods;
}
