/* DatB admin users and account lifecycle domain. */

let _pendingUserDelete = null;

function requestUserDelete(btn) {
    const uid = btn.dataset.id, nombre = btn.dataset.nombre || uid;
    if (!uid) return;
    const u = (getUsers() || []).find(x => x.id === uid);
    if (!u || u.rol_sistema_id === 6) return;
    const permsCount = getPerms().filter(p => p.usuario_id === uid).length;
    const extra = permsCount
        ? `<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán <strong>${permsCount}</strong> permiso(s) de laboratorio asociados.</small>`
        : '';
    $a('delete-confirm-msg').innerHTML =
        `¿Eliminar permanentemente la cuenta de <strong>"${nombre}"</strong>? Esta acción no se puede deshacer.${extra}`;
    _pendingUserDelete = uid;
    bootstrap.Modal.getOrCreateInstance($a('modal-delete')).show();
}

function deleteUser(uid) {
    saveUsers((getUsers() || []).filter(u => u.id !== uid));
    savePerms(getPerms().filter(p => p.usuario_id !== uid));
    saveAccesos(getAccesos().filter(a => a.usuario_id !== uid));
    if (typeof sbDeleteRow === 'function') sbDeleteRow('usuarios', uid);
    renderAll();
}

function seedDemo() {
    if (typeof IS_ONLINE === 'function' && IS_ONLINE()) return;
    if ((getUsers() || []).length) return;
    saveUsers([
        {id:'demo_001',ci:'8501025678',nombres:'Ana María',apellidos:'Rodríguez Pérez',rol_profesional_id:1,rol_profesional_nom:'Médico/a',registro_profesional:'RM-12345',provincia_id:1,municipio_id:101,centro_texto:'Hospital Hermanos Ameijeiras',pin_hash:'x',rol_sistema_id:1,activo:true,aprobado:false,creado_en:new Date(Date.now()-172800000).toISOString()},
        {id:'demo_002',ci:'9203147890',nombres:'Carlos',apellidos:'Vidal Suárez',rol_profesional_id:2,rol_profesional_nom:'Enfermero/a',registro_profesional:null,provincia_id:6,municipio_id:601,centro_texto:'Hospital Arnaldo Milián Castro',pin_hash:'x',rol_sistema_id:1,activo:true,aprobado:false,creado_en:new Date(Date.now()-86400000).toISOString()},
        {id:'demo_003',ci:'7708234501',nombres:'Liset',apellidos:'Fuentes Mora',rol_profesional_id:3,rol_profesional_nom:'Licenciado/a de Lab.',registro_profesional:'RL-88901',provincia_id:14,municipio_id:1401,centro_texto:'Hospital Juan Bruno Zayas',pin_hash:'x',rol_sistema_id:1,activo:true,aprobado:true,creado_en:new Date(Date.now()-604800000).toISOString()}
    ]);
    saveAccesos([{id:'ac_001',usuario_id:'demo_003',justificacion:'Tesis de maestría en epidemiología de infecciones respiratorias',alcance_solicitado:'Resultados de cultivos respiratorios provincia Santiago de Cuba 2023-2024',estado:'pendiente',creado_en:new Date(Date.now()-18000000).toISOString()}]);
}

document.addEventListener('DOMContentLoaded', () => {
    ['filter-search','filter-rol-prof','filter-rol-sis','filter-estado'].forEach(id => {
        $a(id)?.addEventListener('input', renderUsers);
        $a(id)?.addEventListener('change', renderUsers);
    });
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn-delete-usuario');
        if (btn) requestUserDelete(btn);
    });
    $a('btn-confirm-delete')?.addEventListener('click', () => {
        if (!_pendingUserDelete) return;
        const uid = _pendingUserDelete;
        _pendingUserDelete = null;
        deleteUser(uid);
        bootstrap.Modal.getInstance($a('modal-delete'))?.hide();
        toast('Registro eliminado.', 'info');
    });
});
