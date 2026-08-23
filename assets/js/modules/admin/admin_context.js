/* Shared admin state/helpers. Kept small and dependency-free. */
window._store = window._store || {
    usuarios: [], permisos_lab: [], accesos_temp: [],
    geo_provincias: [], geo_municipios: [], geo_centros: [], geo_labs: [],
    grupos_vulnerables: [], tipos_muestra: [], microorganismos: []
};

window.$admin = window.$admin || (id => document.getElementById(id));
window.getPerms = window.getPerms || (() => window._store.permisos_lab || []);
window.getAccesos = window.getAccesos || (() => window._store.accesos_temp || []);

window.ROL_SIS_NAMES = window.ROL_SIS_NAMES || {
    1:'Usuario común', 2:'Mod. institucional', 3:'Mod. municipal',
    4:'Mod. provincial', 5:'Mod. nacional', 6:'Administrador'
};
window.ROL_SIS_HINTS = window.ROL_SIS_HINTS || {
    1:'Puede indicar exámenes dentro de su institución.',
    2:'Modera datos de su institución adscrita.',
    3:'Modera datos del municipio adscrito.',
    4:'Modera datos de su provincia.',
    5:'Modera datos a nivel nacional.',
    6:'Acceso total. Gestión de usuarios y configuración.'
};

window.adminToast = window.adminToast || function toast(msg, type='success') {
    const t = window.$admin('admin-toast');
    const icon = window.$admin('toast-icon');
    if (!t || !icon) return;
    t.className = `admin-toast toast-${type}`;
    icon.className = `bi ${type==='success'?'bi-check-circle-fill':type==='error'?'bi-x-circle-fill':'bi-info-circle-fill'}`;
    window.$admin('toast-msg').textContent = msg;
    t.classList.remove('d-none');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.add('d-none'), 3200);
};

window.geoName = window.geoName || function geoName(type, id) {
    if (!id) return '—';
    const m = {
        provincia: GEO.getProvs() || DATOS_GEO.provincias,
        municipio: GEO.getMuns() || DATOS_GEO.municipios,
        centro: GEO.getCentros() || DATOS_GEO.centros_salud
    };
    return m[type]?.find(x => x.id === Number(id))?.nombre || '—';
};

window.fmtAdminDate = window.fmtAdminDate || (iso =>
    iso ? new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }) : '—'
);

window.iniAdminUser = window.iniAdminUser || (u =>
    ((u.nombres?.[0]||'')+(u.apellidos?.[0]||'')).toUpperCase()
);

window.rolProfName = window.rolProfName || (u =>
    u.rol_profesional_nom || ROLES_PROFESIONALES[u.rol_profesional_id]?.nombre || '—'
);

window._adminUser = window._adminUser || null;
