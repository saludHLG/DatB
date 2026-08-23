/* DatB app shell: carga de sesión y metadatos de usuario. */
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
