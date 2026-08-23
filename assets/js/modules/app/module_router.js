/* =========================================================
   module_router.js — despacho de módulos del dashboard
   Requiere: $(), renderHomeUsuario(), renderPerfil(),
             renderIndicaciones(), renderLaboratorio(),
             _hl_destroyCharts() opcional
   ======================================================== */

function renderModulo(id, user) {
    if (typeof _hl_destroyCharts === 'function') _hl_destroyCharts();

    const el = $('app-content-inner');
    const labels = {
        home: 'Inicio',
        indicaciones: 'Indicaciones de examen',
        laboratorio: 'Laboratorio',
        datos: 'Datos epidemiológicos',
        admin: 'Administración',
        perfil: 'Mi perfil'
    };
    $('topbar-title').textContent = labels[id] || id;

    if (window._labRefreshTimer) {
        clearInterval(window._labRefreshTimer);
        window._labRefreshTimer = null;
    }

    if (id === 'home') {
        renderHomeUsuario(user, el);
    } else if (id === 'perfil') {
        renderPerfil(user, el);
    } else if (id === 'admin') {
        el.innerHTML = '<div class="modulo-header"><h2 class="modulo-title">Administración</h2><p class="modulo-sub">Acceda al panel completo de gestión de usuarios y catálogos.</p></div><div class="modulo-cta"><a href="admin.html" class="btn-primary-custom" style="text-decoration:none;font-size:1rem;padding:.85rem 2rem"><i class="bi bi-shield-check"></i> Ir al panel de administración</a></div>';
    } else if (id === 'indicaciones') {
        renderIndicaciones(user, el);
    } else if (id === 'datos') {
        if (typeof _initEpidemiologia === 'function') {
            _initEpidemiologia(el);
        } else {
            el.innerHTML = '<div class="modulo-header"><h2 class="modulo-title">Datos epidemiológicos</h2><p class="modulo-sub">Módulo no disponible — verifique que epidemiologia.js esté cargado.</p></div>';
        }
    } else if (id === 'laboratorio') {
        renderLaboratorio(user, el);
    } else {
        el.innerHTML = `<div class="modulo-header"><h2 class="modulo-title">${labels[id] || id}</h2><p class="modulo-sub">Módulo en desarrollo — disponible en fases posteriores.</p></div><div class="modulo-placeholder"><i class="bi bi-tools"></i><p>En construcción.</p></div>`;
    }
}
