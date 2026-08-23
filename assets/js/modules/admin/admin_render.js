/* DatB admin render module. Extracted from admin_legacy.js. */

function adminRenderStats() {
    const u = getUsers() || [];
    const total = u.length;
    const pending = u.filter(x => x.activo && !x.aprobado).length;
    const active = u.filter(x => x.aprobado && x.activo).length;
    $a('header-stats').innerHTML = `
        <div class="stat-pill"><span class="stat-pill-num">${total}</span><span class="stat-pill-label">Total</span></div>
        <div class="stat-pill"><span class="stat-pill-num" style="color:var(--a-warning)">${pending}</span><span class="stat-pill-label">Pendientes</span></div>
        <div class="stat-pill"><span class="stat-pill-num" style="color:var(--a-success)">${active}</span><span class="stat-pill-label">Activos</span></div>`;

    const bp = $a('badge-pending');
    const ba = $a('badge-access');
    bp.textContent = pending;
    bp.style.display = pending > 0 ? '' : 'none';

    const ap = getAccesos().filter(a => a.estado === 'pendiente').length;
    ba.textContent = ap;
    ba.style.display = ap > 0 ? '' : 'none';
}

function adminRenderPending() {
    const users = (getUsers() || []).filter(u => u.activo && !u.aprobado);
    const tbody = $a('pending-tbody');
    const wrap = $a('pending-table-wrap');
    const empty = $a('pending-empty');

    if (!users.length) {
        wrap.classList.add('d-none');
        empty.classList.remove('d-none');
        return;
    }

    wrap.classList.remove('d-none');
    empty.classList.add('d-none');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><div class="user-cell">
                <div class="user-cell-avatar">${ini(u)}</div>
                <div><div class="user-cell-name">${u.nombres} ${u.apellidos}</div>
                     ${u.registro_profesional ? `<div class="user-cell-reg">Reg: ${u.registro_profesional}</div>` : ''}
                </div></div></td>
            <td><span style="font-family:var(--font-mono);font-size:.8rem">${u.ci}</span></td>
            <td><span class="rol-badge">${rolProfName(u)}</span></td>
            <td><span style="font-size:.82rem">${geoName('provincia', u.provincia_id)}</span><br>
                <span style="font-size:.75rem;color:var(--a-muted)">${u.centro_texto || geoName('centro', u.centro_salud_id)}</span></td>
            <td style="font-size:.78rem;color:var(--a-muted)">${fmt(u.creado_en)}</td>
            <td><div class="table-actions">
                <button class="btn-table-action approve" title="Aprobar" onclick="openApproveModal('${u.id}')"><i class="bi bi-check-lg"></i></button>
                <button class="btn-table-action reject" title="Rechazar" onclick="openApproveModal('${u.id}', true)"><i class="bi bi-x-lg"></i></button>
            </div></td>
        </tr>`).join('');
}

function adminRenderUsers() {
    let users = getUsers() || [];
    const perms = getPerms();
    const search = ($a('filter-search')?.value || '').toLowerCase();
    const rp = $a('filter-rol-prof')?.value;
    const rs = $a('filter-rol-sis')?.value;
    const est = $a('filter-estado')?.value;

    if (search) {
        users = users.filter(u => `${u.nombres} ${u.apellidos}`.toLowerCase().includes(search) || u.ci.toLowerCase().includes(search));
    }
    if (rp) users = users.filter(u => String(u.rol_profesional_id) === rp);
    if (rs) users = users.filter(u => String(u.rol_sistema_id) === rs);
    if (est === 'aprobado') users = users.filter(u => u.aprobado && u.activo);
    if (est === 'pendiente') users = users.filter(u => !u.aprobado && u.activo);
    if (est === 'inactivo') users = users.filter(u => !u.activo);

    const tbody = $a('users-tbody');
    const empty = $a('users-empty');
    if (!users.length) {
        tbody.innerHTML = '';
        empty.classList.remove('d-none');
        return;
    }
    empty.classList.add('d-none');

    tbody.innerHTML = users.map(u => {
        const labCount = perms.filter(p => p.usuario_id === u.id && p.activo).length;
        const sCls = !u.activo ? 'inactivo' : u.aprobado ? 'aprobado' : 'pendiente';
        const sTxt = !u.activo ? 'Inactivo' : u.aprobado ? 'Aprobado' : 'Pendiente';
        const labHtml = labCount > 0
            ? `<span class="lab-count has-perms"><i class="bi bi-flask"></i> ${labCount}</span>`
            : `<span class="lab-count">—</span>`;

        return `
        <tr>
            <td><div class="user-cell">
                <div class="user-cell-avatar">${ini(u)}</div>
                <div class="user-cell-name">${u.nombres} ${u.apellidos}</div>
            </div></td>
            <td><span style="font-family:var(--font-mono);font-size:.8rem">${u.ci}</span></td>
            <td><span class="rol-badge">${rolProfName(u)}</span></td>
            <td><span class="rol-badge" style="background:#e0faf8;color:#006b64">${ROL_SIS_NAMES[u.rol_sistema_id] || '—'}</span></td>
            <td><span class="status-badge ${sCls}">${sTxt}</span></td>
            <td>${labHtml}</td>
            <td><div class="table-actions">
                <button class="btn-table-action" title="Editar" onclick="openEditModal('${u.id}')"><i class="bi bi-pencil"></i></button>
                ${u.rol_sistema_id !== 6 && u.id !== (window._adminUser?.id)
                    ? `<button class="btn-table-action reject btn-delete-usuario" title="Eliminar cuenta"
                           data-id="${u.id}" data-nombre="${(u.nombres + ' ' + u.apellidos).replace(/"/g, '&quot;')}"><i class="bi bi-trash"></i></button>`
                    : ''}
            </div></td>
        </tr>`;
    }).join('');
}

function adminRenderAccessRequests() {
    const accesos = getAccesos();
    const users = getUsers() || [];
    const tbody = $a('access-tbody');
    const wrap = $a('access-table-wrap');
    const empty = $a('access-empty');

    if (!accesos.length) {
        wrap.classList.add('d-none');
        empty.classList.remove('d-none');
        return;
    }

    wrap.classList.remove('d-none');
    empty.classList.add('d-none');
    tbody.innerHTML = accesos.map(a => {
        const u = users.find(x => x.id === a.usuario_id);
        const nombre = u ? `${u.nombres} ${u.apellidos}` : '—';
        const sCls = a.estado === 'aprobada' ? 'aprobado' : a.estado === 'rechazada' ? 'rechazado' : 'pendiente';
        const actions = a.estado === 'pendiente'
            ? `<button class="btn-table-action approve" onclick="openAccessModal('${a.id}')"><i class="bi bi-eye"></i></button>`
            : `<span style="font-size:.75rem;color:var(--a-muted)">${fmt(a.revisado_en)}</span>`;
        return `
        <tr>
            <td style="font-weight:500">${nombre}</td>
            <td style="font-size:.82rem;max-width:200px">${a.justificacion}</td>
            <td style="font-size:.8rem;color:var(--a-muted);max-width:160px">${a.alcance_solicitado}</td>
            <td><span class="status-badge ${sCls}">${a.estado}</span></td>
            <td style="font-size:.78rem;color:var(--a-muted)">${fmt(a.creado_en)}</td>
            <td><div class="table-actions">${actions}</div></td>
        </tr>`;
    }).join('');
}

function adminRenderAll() {
    adminRenderStats();
    adminRenderPending();
    adminRenderUsers();
    adminRenderAccessRequests();
}
