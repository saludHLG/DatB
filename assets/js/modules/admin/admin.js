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
    if (typeof sbInitAll === 'function') {
        try { await sbInitAll(); } catch (e) { console.error('Admin sbInitAll:', e); }
    }
    if (typeof initGeoData === 'function') initGeoData();
    // seedDemo belonged to the old prototype bootstrap. Keep it optional so
    // a missing legacy helper cannot prevent the real admin panel from booting.
    if (typeof seedDemo === 'function') seedDemo();
    adminCheckAccess();
    adminBindBootstrapPromotion();
    adminBindTabs();
    renderAll();
});
