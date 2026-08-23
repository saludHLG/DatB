/* DatB admin entrypoint. Shared context first, then focused domain modules. */
document.write('<script src="assets/js/modules/admin/admin_context.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_access.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_render.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_permissions.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_user_editor.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_user_approval.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_users.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_access_requests.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_geo_core.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_geo_location_render.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_geo_location_editor.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_geo_labs.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_geo_delete.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_catalogs_core.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_catalogs_basic.js"><\/script>');
document.write('<script src="assets/js/modules/admin/admin_catalogs_micro.js"><\/script>');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load the store before checking the admin session.
        if (typeof sbInitAll === 'function') await sbInitAll();

        if (typeof initGeoData === 'function') initGeoData();
        if (typeof seedDemo === 'function') seedDemo();

        // Prefer the same session resolver used by the main application.
        // This avoids relying only on a possibly stale in-memory user list.
        if (typeof sbGetSession === 'function') {
            const sessionUser = await sbGetSession();
            if (sessionUser) window._currentUser = sessionUser;
        }

        adminCheckAccess();
        adminBindBootstrapPromotion();
        adminBindTabs();
        renderAll();
    } catch (err) {
        console.error('Admin initialization failed:', err);
        const app = $a('admin-app');
        const denied = $a('access-denied');
        if (app) app.classList.add('d-none');
        if (denied) {
            denied.classList.remove('d-none');
            const p = denied.querySelector('p');
            if (p) p.innerHTML = 'No se pudo inicializar el panel de administración. Revisa la consola para ver el error.';
        }
    }
});
