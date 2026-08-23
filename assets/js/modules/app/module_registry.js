/* DatB app module registry: módulos disponibles según rol/permisos. */
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
