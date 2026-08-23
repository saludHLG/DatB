/* DatB admin account-approval domain. */

let _approveUid = null;

function buildUserCard(u) {
    const rows = [
        ['Nombre', `${u.nombres} ${u.apellidos}`],
        ['CI', u.ci], ['Rol prof.', rolProfName(u)],
        ...(u.registro_profesional ? [['Registro', u.registro_profesional]] : []),
        ['Provincia', geoName('provincia', u.provincia_id)],
        ['Municipio', geoName('municipio', u.municipio_id)],
        ['Centro', u.centro_texto || geoName('centro', u.centro_salud_id)]
    ];
    return rows.map(([l,v]) => `<div class="uc-row"><span class="uc-label">${l}</span><span class="uc-value">${v}</span></div>`).join('');
}

function openApproveModal(uid, reject = false) {
    _approveUid = uid;
    const u = (getUsers() || []).find(x => x.id === uid);
    if (!u) return;
    $a('approve-user-card').innerHTML = buildUserCard(u);
    $a('approve-rol-sistema').value = String(u.rol_sistema_id || 1);
    $a('reject-reason-wrap').classList.toggle('d-none', !reject);
    $a('approve-reject-reason').value = '';
    new bootstrap.Modal($a('modal-approve')).show();
}

function approveUser() {
    const users = getUsers() || [], idx = users.findIndex(u => u.id === _approveUid);
    if (idx === -1) return;
    users[idx].aprobado = true;
    users[idx].rol_sistema_id = Number($a('approve-rol-sistema').value);
    saveUsers(users);
    if (typeof sbUpdateRow === 'function') sbUpdateRow('usuarios', _approveUid, {
        aprobado:true, rol_sistema_id:users[idx].rol_sistema_id
    });
    bootstrap.Modal.getInstance($a('modal-approve'))?.hide();
    toast(`Cuenta de ${users[idx].nombres} aprobada.`, 'success');
    renderAll();
}

function rejectUser() {
    const users = getUsers() || [], idx = users.findIndex(u => u.id === _approveUid);
    if (idx === -1) return;
    users[idx].activo = false;
    users[idx].rechazado = true;
    users[idx].motivo_rechazo = $a('approve-reject-reason').value.trim() || null;
    saveUsers(users);
    if (typeof sbUpdateRow === 'function') sbUpdateRow('usuarios', _approveUid, {
        activo:false, rechazado:true, motivo_rechazo:users[idx].motivo_rechazo
    });
    bootstrap.Modal.getInstance($a('modal-approve'))?.hide();
    toast(`Cuenta de ${users[idx].nombres} rechazada.`, 'error');
    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    $a('btn-approve-user')?.addEventListener('click', approveUser);
    $a('btn-reject-user')?.addEventListener('click', rejectUser);
});
