/* DatB admin laboratory-permission domain. */

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
        return `<div class="lab-perm-row">
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

function addLabPermission() {
    const labId = Number($a('modal-lab-select').value);
    if (!labId) return;
    if (_editPerms.some(p => Number(p.laboratorio_id) === labId)) {
        return toast('Este laboratorio ya está en la lista.', 'info');
    }
    _editPerms.push({ usuario_id:_editUid, laboratorio_id:labId, puede_emitir:false, puede_editar:false, puede_eliminar:false, activo:true });
    renderLabList();
    $a('modal-lab-select').value = '';
}

function saveEditedUserPermissions(uid) {
    savePerms(getPerms().filter(p => p.usuario_id !== uid).concat(_editPerms));
    if (typeof sbReplaceUserPerms === 'function') {
        sbReplaceUserPerms(uid, _editPerms).catch(e => console.error('perms sync:', e.message));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $a('btn-add-lab')?.addEventListener('click', addLabPermission);
});
