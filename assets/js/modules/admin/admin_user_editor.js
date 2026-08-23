/* DatB admin user editor domain. */

let _editUid = null;
let _editPerms = [];

function openEditModal(uid) {
    _editUid = uid;
    const u = (getUsers() || []).find(x => x.id === uid);
    if (!u) return;
    $a('modal-avatar').textContent = ini(u);
    $a('modal-edit-name').textContent = `${u.nombres} ${u.apellidos}`;
    $a('modal-ci').textContent = `CI: ${u.ci}`;
    $a('modal-prof-badge').textContent = rolProfName(u);
    $a('modal-rol-sistema').value = String(u.rol_sistema_id || 1);
    $a('modal-rol-hint').textContent = ROL_SIS_HINTS[u.rol_sistema_id] || '';
    const btn = $a('btn-toggle-active');
    btn.innerHTML = u.activo ? '<i class="bi bi-slash-circle"></i> Desactivar cuenta' : '<i class="bi bi-arrow-clockwise"></i> Reactivar cuenta';
    btn.className = 'btn-toggle-active' + (u.activo ? ' is-deactivate' : '');
    $a('modal-nombres').value = u.nombres || '';
    $a('modal-apellidos').value = u.apellidos || '';
    $a('modal-rol-prof-edit').value = String(u.rol_profesional_id || 1);
    $a('modal-registro').value = u.registro_profesional || '';
    fillProvSelect($a('modal-prov-edit'), u.provincia_id);
    fillMunSelect($a('modal-mun-edit'), u.provincia_id, u.municipio_id);
    $a('modal-mun-edit').disabled = !u.provincia_id;
    fillCentroSelect($a('modal-centro-edit'), u.municipio_id, u.centro_salud_id || u.centro_texto);
    $a('modal-prov-edit').onchange = function () {
        fillMunSelect($a('modal-mun-edit'), this.value, null);
        $a('modal-mun-edit').disabled = !this.value;
        fillCentroSelect($a('modal-centro-edit'), null, null);
    };
    $a('modal-mun-edit').onchange = function () {
        fillCentroSelect($a('modal-centro-edit'), this.value, null);
    };
    _editPerms = getPerms().filter(p => p.usuario_id === uid && p.activo).map(p => ({...p}));
    populateLabSelect(u.provincia_id);
    renderLabList();
    new bootstrap.Modal($a('modal-edit-user')).show();
}

function saveEditedUser() {
    const users = getUsers() || [], idx = users.findIndex(u => u.id === _editUid);
    if (idx === -1) return;
    const nomVal = $a('modal-nombres').value.trim(), apVal = $a('modal-apellidos').value.trim();
    if (!nomVal || !apVal) return toast('Nombres y apellidos son obligatorios.', 'error');
    users[idx].nombres = nomVal;
    users[idx].apellidos = apVal;
    const rpId = Number($a('modal-rol-prof-edit').value);
    users[idx].rol_profesional_id = rpId;
    users[idx].rol_profesional_nom = ROLES_PROFESIONALES[rpId]?.nombre || '';
    users[idx].registro_profesional = $a('modal-registro').value.trim() || null;
    users[idx].provincia_id = Number($a('modal-prov-edit').value) || null;
    users[idx].municipio_id = Number($a('modal-mun-edit').value) || null;
    const centroVal = $a('modal-centro-edit').value;
    if (centroVal === '__otro__' || !centroVal) {
        users[idx].centro_salud_id = null;
        users[idx].centro_texto = centroVal === '__otro__' ? (users[idx].centro_texto || 'Otro') : null;
    } else {
        users[idx].centro_salud_id = Number(centroVal);
        users[idx].centro_texto = $a('modal-centro-edit').selectedOptions[0]?.text?.replace(/ \(.*\)$/, '') || null;
    }
    users[idx].rol_sistema_id = Number($a('modal-rol-sistema').value);
    saveUsers(users);
    if (typeof sbUpdateRow === 'function') sbUpdateRow('usuarios', _editUid, {
        nombres: users[idx].nombres, apellidos: users[idx].apellidos,
        rol_profesional_id: users[idx].rol_profesional_id, rol_profesional_nom: users[idx].rol_profesional_nom,
        registro_profesional: users[idx].registro_profesional, provincia_id: users[idx].provincia_id,
        municipio_id: users[idx].municipio_id, centro_salud_id: users[idx].centro_salud_id,
        centro_texto: users[idx].centro_texto, rol_sistema_id: users[idx].rol_sistema_id
    });
    saveEditedUserPermissions(_editUid);
    bootstrap.Modal.getInstance($a('modal-edit-user'))?.hide();
    toast('Cambios guardados correctamente.', 'success');
    renderAll();
}

function toggleUserActive() {
    const users = getUsers() || [], idx = users.findIndex(u => u.id === _editUid);
    if (idx === -1) return;
    users[idx].activo = !users[idx].activo;
    saveUsers(users);
    if (typeof sbUpdateRow === 'function') sbUpdateRow('usuarios', _editUid, { activo: users[idx].activo });
    toast(`Cuenta ${users[idx].activo ? 'reactivada' : 'desactivada'}.`, users[idx].activo ? 'success' : 'info');
    bootstrap.Modal.getInstance($a('modal-edit-user'))?.hide();
    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    $a('modal-rol-sistema')?.addEventListener('change', function () {
        $a('modal-rol-hint').textContent = ROL_SIS_HINTS[Number(this.value)] || '';
    });
    $a('btn-toggle-active')?.addEventListener('click', toggleUserActive);
    $a('btn-save-user')?.addEventListener('click', saveEditedUser);
});
