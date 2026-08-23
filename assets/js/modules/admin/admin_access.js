/* DatB admin access/navigation module. */
const ADMIN_TAB_META={
    'tab-pending':{title:'Cuentas pendientes',sub:'Nuevas cuentas esperando aprobación'},
    'tab-users':{title:'Gestión de usuarios',sub:'Administre roles, permisos y estado de cuentas'},
    'tab-access':{title:'Accesos temporales',sub:'Solicitudes de acceso a datos para investigación'},
    'tab-locations':{title:'Localización',sub:'Gestione provincias, municipios, centros de salud y laboratorios'},
    'tab-catalogos':{title:'Catálogos',sub:'Gestione grupos de vulnerabilidad, tipos de muestra y microorganismos'}
};

function adminCheckAccess(){
    const me=window._currentUser;
    const denied=$a('access-denied');
    const app=$a('admin-app');
    const bootstrap=$a('bootstrap-bar');

    if(bootstrap) bootstrap.classList.add('d-none');

    if(!me || Number(me.rol_sistema_id)!==6 || !me.activo || !me.aprobado){
        if(app) app.classList.add('d-none');
        if(denied) denied.classList.remove('d-none');
        return false;
    }

    if(denied) denied.classList.add('d-none');
    if(app) app.classList.remove('d-none');
    window._adminUser=me;
    const name=$a('sidebar-admin-name');
    if(name) name.textContent=`${me.nombres} ${me.apellidos}`.trim();
    return true;
}

function adminBindBootstrapPromotion(){
    const bootstrap=$a('bootstrap-bar');
    if(bootstrap) bootstrap.classList.add('d-none');
}

function adminBindTabs(){
    document.querySelectorAll('.snav-btn[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{
        document.querySelectorAll('.snav-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.admin-tab').forEach(t=>t.classList.add('d-none'));
        const id=btn.dataset.tab;$a(id)?.classList.remove('d-none');const meta=ADMIN_TAB_META[id]||{title:id,sub:''};$a('admin-page-title').textContent=meta.title;$a('admin-page-sub').textContent=meta.sub;
        if(id==='tab-locations'){initGeoData();renderLocPanel('provincias');}if(id==='tab-catalogos'){renderCatGV();renderCatTM();renderCatMicro();}
    }));
}
