/* DatB admin users, permissions and temporary-access domain. */

let _approveUid = null;
let _editUid = null;
let _editPerms = [];
let _accessId = null;
let _pendingUserDelete = null;

function buildUserCard(u) {
    const rows = [
        ['Nombre', `${u.nombres} ${u.apellidos}`],
        ['CI', u.ci],
        ['Rol prof.', rolProfName(u)],
        ...(u.registro_profesional ? [['Registro', u.registro_profesional]] : []),
        ['Provincia', geoName('provincia', u.provincia_id)],
        ['Municipio', geoName('municipio', u.municipio_id)],
        ['Centro', u.centro_texto || geoName('centro', u.centro_salud_id)]
    ];
    return rows.map(([l,v]) =>
        `<div class="uc-row"><span class="uc-label">${l}</span><span class="uc-value">${v}</span></div>`
    ).join('');
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
    const users = getUsers() || [];
    const idx = users.findIndex(u => u.id === _approveUid);
    if (idx === -1) return;
    users[idx].aprobado = true;
    users[idx].rol_sistema_id = Number($a('approve-rol-sistema').value);
    saveUsers(users);
    if (typeof sbUpdateRow === 'function')
        sbUpdateRow('usuarios', _approveUid, { aprobado: true, rol_sistema_id: users[idx].rol_sistema_id });
    bootstrap.Modal.getInstance($a('modal-approve'))?.hide();
    toast(`Cuenta de ${users[idx].nombres} aprobada.`, 'success');
    renderAll();
}

function rejectUser() {
    const users = getUsers() || [];
    const idx = users.findIndex(u => u.id === _approveUid);
    if (idx === -1) return;
    users[idx].activo = false;
    users[idx].rechazado = true;
    users[idx].motivo_rechazo = $a('approve-reject-reason').value.trim() || null;
    saveUsers(users);
    if (typeof sbUpdateRow === 'function')
        sbUpdateRow('usuarios', _approveUid, { activo: false, rechazado: true, motivo_rechazo: users[idx].motivo_rechazo });
    bootstrap.Modal.getInstance($a('modal-approve'))?.hide();
    toast(`Cuenta de ${users[idx].nombres} rechazada.`, 'error');
    renderAll();
}

function populateLabSelect(provId) {
    const sel = $a('modal-lab-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleccione laboratorio —</option>';
    const labs = GEO.getLabs() || DATOS_GEO.laboratorios || [];
    [...labs].filter(lab => lab.activo !== false)
        .sort((a,b) => a.provincia_id === provId ? -1 : b.provincia_id === provId ? 1 : 0)
        .forEach(lab => {
            const opt = document.createElement('option');
            opt.value = lab.id;
            opt.textContent = `${lab.nombre} (${lab.nivel_referencia}) — ${geoName('provincia', lab.provincia_id)}`;
            sel.appendChild(opt);
        });
}

function renderLabList() {
    const container = $a('lab-perms-list'), emptyMsg = $a('empty-lab-msg');
    if (!container || !emptyMsg) return;
    if (!_editPerms.length) {
        container.innerHTML = '';
        emptyMsg.classList.remove('d-none');
        return;
    }
    emptyMsg.classList.add('d-none');
    container.innerHTML = _editPerms.map((p, i) => {
        const lab = (GEO.getLabs() || DATOS_GEO.laboratorios || []).find(l => l.id === Number(p.laboratorio_id));
        return `
        <div class="lab-perm-row">
            <span class="lab-perm-name">${lab?.nombre || 'Lab #' + p.laboratorio_id}</span>
            <span class="lab-perm-level">${lab?.nivel_referencia || ''}</span>
            <div class="perm-checkboxes">
                <label class="perm-check-label"><input type="checkbox" data-idx="${i}" data-perm="puede_emitir" ${p.puede_emitir ? 'checked' : ''}> Emitir</label>
                <label class="perm-check-label"><input type="checkbox" data-idx="${i}" data-perm="puede_editar" ${p.puede_editar ? 'checked' : ''}> Editar</label>
                <label class="perm-check-label"><input type="checkbox" data-idx="${i}" data-perm="puede_eliminar" ${p.puede_eliminar ? 'checked' : ''}> Eliminar</label>
            </div>
            <button class="btn-remove-lab" data-idx="${i}" title="Quitar"><i class="bi bi-trash"></i></button>
        </div>`;
    }).join('');
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => { _editPerms[+cb.dataset.idx][cb.dataset.perm] = cb.checked; });
    });
    container.querySelectorAll('.btn-remove-lab').forEach(btn => {
        btn.addEventListener('click', () => { _editPerms.splice(+btn.dataset.idx, 1); renderLabList(); });
    });
}

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
    savePerms(getPerms().filter(p => p.usuario_id !== _editUid).concat(_editPerms));
    if (typeof sbReplaceUserPerms === 'function') sbReplaceUserPerms(_editUid, _editPerms).catch(e => console.error('perms sync:', e.message));
    bootstrap.Modal.getInstance($a('modal-edit-user'))?.hide();
    toast('Cambios guardados correctamente.', 'success');
    renderAll();
}

function openAccessModal(id) {
    _accessId = id;
    const a = getAccesos().find(x => x.id === id);
    if (!a) return;
    const u = (getUsers() || []).find(x => x.id === a.usuario_id);
    $a('access-request-card').innerHTML = `
        <div class="uc-row"><span class="uc-label">Solicitante</span><span class="uc-value">${u ? `${u.nombres} ${u.apellidos}` : '—'}</span></div>
        <div class="uc-row"><span class="uc-label">Justificación</span><span class="uc-value">${a.justificacion}</span></div>
        <div class="uc-row"><span class="uc-label">Alcance</span><span class="uc-value">${a.alcance_solicitado}</span></div>`;
    const hoy = new Date().toISOString().split('T')[0], fin = new Date();
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
        estado:'aprobada', fecha_inicio:$a('access-fecha-inicio').value, fecha_fin:$a('access-fecha-fin').value,
        nivel_aprobado:$a('access-nivel').value, alcance_aprobado:$a('access-alcance').value,
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
    if (typeof sbUpdateRow === 'function') sbUpdateRow('accesos_temporales', _accessId, {
        estado:'rechazada', revisado_en:accesos[idx].revisado_en
    });
    bootstrap.Modal.getInstance($a('modal-access'))?.hide();
    toast('Solicitud rechazada.', 'error');
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

function addLabPermission() {
    const labId = Number($a('modal-lab-select').value);
    if (!labId) return;
    if (_editPerms.some(p => Number(p.laboratorio_id) === labId)) return toast('Este laboratorio ya está en la lista.', 'info');
    _editPerms.push({usuario_id:_editUid,laboratorio_id:labId,puede_emitir:false,puede_editar:false,puede_eliminar:false,activo:true});
    renderLabList();
    $a('modal-lab-select').value = '';
}

function requestUserDelete(btn) {
    const uid = btn.dataset.id, nombre = btn.dataset.nombre || uid;
    if (!uid) return;
    const u = (getUsers() || []).find(x => x.id === uid);
    if (!u || u.rol_sistema_id === 6) return;
    const permsCount = getPerms().filter(p => p.usuario_id === uid).length;
    const extra = permsCount ? `<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán <strong>${permsCount}</strong> permiso(s) de laboratorio asociados.</small>` : '';
    $a('delete-confirm-msg').innerHTML = `¿Eliminar permanentemente la cuenta de <strong>"${nombre}"</strong>? Esta acción no se puede deshacer.${extra}`;
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
    $a('btn-approve-user')?.addEventListener('click', approveUser);
    $a('btn-reject-user')?.addEventListener('click', rejectUser);
    $a('modal-rol-sistema')?.addEventListener('change', function () { $a('modal-rol-hint').textContent = ROL_SIS_HINTS[Number(this.value)] || ''; });
    $a('btn-add-lab')?.addEventListener('click', addLabPermission);
    $a('btn-toggle-active')?.addEventListener('click', toggleUserActive);
    $a('btn-save-user')?.addEventListener('click', saveEditedUser);
    $a('btn-approve-access')?.addEventListener('click', approveAccess);
    $a('btn-reject-access')?.addEventListener('click', rejectAccess);
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
