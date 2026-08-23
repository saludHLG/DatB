/* DatB admin access/navigation module. Extracted from admin_legacy.js. */

const ADMIN_TAB_META = {
    'tab-pending':   { title:'Cuentas pendientes',   sub:'Nuevas cuentas esperando aprobación' },
    'tab-users':     { title:'Gestión de usuarios',  sub:'Administre roles, permisos y estado de cuentas' },
    'tab-access':    { title:'Accesos temporales',   sub:'Solicitudes de acceso a datos para investigación' },
    'tab-locations': { title:'Localización',         sub:'Gestione provincias, municipios, centros de salud y laboratorios' },
    'tab-catalogos': { title:'Catálogos',            sub:'Gestione grupos de vulnerabilidad, tipos de muestra y microorganismos' }
};

function adminCheckAccess() {
    const uid = sessionStorage.getItem('sr_active_user');
    const users = getUsers() || [];
    const hasAdmin = users.some(u => u.rol_sistema_id === 6 && u.activo);

    if (!hasAdmin) {
        $a('bootstrap-bar').classList.remove('d-none');
        $a('admin-app').classList.remove('d-none');
        $a('sidebar-admin-name').textContent = 'Modo bootstrap';
        return;
    }

    const me = users.find(u => u.id === uid);
    if (!me || me.rol_sistema_id !== 6 || !me.activo) {
        $a('access-denied').classList.remove('d-none');
        return;
    }

    window._adminUser = me;
    $a('sidebar-admin-name').textContent = `${me.nombres} ${me.apellidos}`;
    $a('admin-app').classList.remove('d-none');
}

function adminBindBootstrapPromotion() {
    $a('btn-make-admin')?.addEventListener('click', () => {
        const uid = sessionStorage.getItem('sr_active_user');
        if (!uid) { alert('Primero inicie sesión en index.html y vuelva aquí.'); return; }

        const users = getUsers() || [];
        const idx = users.findIndex(u => u.id === uid);
        if (idx === -1) { alert('Usuario no encontrado.'); return; }

        users[idx].rol_sistema_id = 6;
        users[idx].aprobado = users[idx].activo = true;
        saveUsers(users);
        window._adminUser = users[idx];
        $a('bootstrap-bar').classList.add('d-none');
        $a('sidebar-admin-name').textContent = `${users[idx].nombres} ${users[idx].apellidos}`;

        if (typeof sbUpdateRow === 'function') {
            sbUpdateRow('usuarios', uid, { rol_sistema_id: 6, aprobado: true, activo: true });
        }

        if (typeof toast === 'function') toast('Cuenta promovida a Administrador.', 'success');
        if (typeof renderAll === 'function') renderAll();
    });
}

function adminBindTabs() {
    document.querySelectorAll('.snav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('d-none'));

            const id = btn.dataset.tab;
            $a(id)?.classList.remove('d-none');
            const meta = ADMIN_TAB_META[id] || { title: id, sub: '' };
            $a('admin-page-title').textContent = meta.title;
            $a('admin-page-sub').textContent = meta.sub;

            if (id === 'tab-locations' && typeof initGeoData === 'function') {
                initGeoData();
                if (typeof renderLocPanel === 'function') renderLocPanel('provincias');
            }
            if (id === 'tab-catalogos') {
                if (typeof renderCatGV === 'function') renderCatGV();
                if (typeof renderCatTM === 'function') renderCatTM();
                if (typeof renderCatMicro === 'function') renderCatMicro();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    adminCheckAccess();
    adminBindBootstrapPromotion();
    adminBindTabs();
});
