/* DatB admin temporary-access request domain. */

let _accessId = null;

function openAccessModal(id) {
    _accessId = id;
    const a = getAccesos().find(x => x.id === id);
    if (!a) return;
    const u = (getUsers() || []).find(x => x.id === a.usuario_id);
    $a('access-request-card').innerHTML = `
        <div class="uc-row"><span class="uc-label">Solicitante</span><span class="uc-value">${u ? `${u.nombres} ${u.apellidos}` : '—'}</span></div>
        <div class="uc-row"><span class="uc-label">Justificación</span><span class="uc-value">${a.justificacion}</span></div>
        <div class="uc-row"><span class="uc-label">Alcance</span><span class="uc-value">${a.alcance_solicitado}</span></div>`;
    const hoy = new Date().toISOString().split('T')[0];
    const fin = new Date();
    fin.setMonth(fin.getMonth() + 6);
    $a('access-fecha-inicio').value = hoy;
    $a('access-fecha-fin').value = fin.toISOString().split('T')[0];
    $a('access-nivel').value = 'provincial';
    $a('access-alcance').value = a.alcance_solicitado;
    new bootstrap.Modal($a('modal-access')).show();
}

function approveAccess() {
    const accesos = getAccesos(), idx = accesos.findIndex(a => a.id === _accessId);
    if (idx === -1) return;
    Object.assign(accesos[idx], {
        estado:'aprobada',
        fecha_inicio:$a('access-fecha-inicio').value,
        fecha_fin:$a('access-fecha-fin').value,
        nivel_aprobado:$a('access-nivel').value,
        alcance_aprobado:$a('access-alcance').value,
        revisado_en:new Date().toISOString()
    });
    saveAccesos(accesos);
    if (typeof sbUpsertRow === 'function') sbUpsertRow('accesos_temporales', accesos[idx]);
    bootstrap.Modal.getInstance($a('modal-access'))?.hide();
    toast('Acceso temporal aprobado.', 'success');
    renderAll();
}

function rejectAccess() {
    const accesos = getAccesos(), idx = accesos.findIndex(a => a.id === _accessId);
    if (idx === -1) return;
    accesos[idx].estado = 'rechazada';
    accesos[idx].revisado_en = new Date().toISOString();
    saveAccesos(accesos);
    if (typeof sbUpdateRow === 'function') {
        sbUpdateRow('accesos_temporales', _accessId, {
            estado:'rechazada', revisado_en:accesos[idx].revisado_en
        });
    }
    bootstrap.Modal.getInstance($a('modal-access'))?.hide();
    toast('Solicitud rechazada.', 'error');
    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    $a('btn-approve-access')?.addEventListener('click', approveAccess);
    $a('btn-reject-access')?.addEventListener('click', rejectAccess);
});
