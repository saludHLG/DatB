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
document.write('<script src="assets/js/modules/admin/admin_catalogs.js"><\/script>');

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof sbInitAll === 'function') {
        try { await sbInitAll(); } catch (e) { console.error('Admin sbInitAll:', e); }
    }
    initGeoData();
    seedDemo();
    adminCheckAccess();
    adminBindBootstrapPromotion();
    adminBindTabs();
    renderAll();
});
