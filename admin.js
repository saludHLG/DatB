const $a = id => document.getElementById(id);
const getUsers  = () => JSON.parse(localStorage.getItem('sr_usuarios')     || '[]');
const saveUsers = u  => localStorage.setItem('sr_usuarios', JSON.stringify(u));
const getPerms  = () => JSON.parse(localStorage.getItem('sr_permisos_lab') || '[]');
const savePerms = p  => localStorage.setItem('sr_permisos_lab', JSON.stringify(p));
const getAccesos  = () => JSON.parse(localStorage.getItem('sr_accesos_temp') || '[]');
const saveAccesos = a  => localStorage.setItem('sr_accesos_temp', JSON.stringify(a));

const ROL_SIS_NAMES = { 1:'Usuario común', 2:'Mod. institucional', 3:'Mod. municipal', 4:'Mod. provincial', 5:'Mod. nacional', 6:'Administrador' };
const ROL_SIS_HINTS = {
    1:'Puede indicar exámenes dentro de su institución.',
    2:'Modera datos de su institución adscrita.',
    3:'Modera datos del municipio adscrito.',
    4:'Modera datos de su provincia.',
    5:'Modera datos a nivel nacional.',
    6:'Acceso total. Gestión de usuarios y configuración.'
};

function toast(msg, type='success') {
    const t = $a('admin-toast'), icon = $a('toast-icon');
    t.className = `admin-toast toast-${type}`;
    icon.className = `bi ${type==='success'?'bi-check-circle-fill':type==='error'?'bi-x-circle-fill':'bi-info-circle-fill'}`;
    $a('toast-msg').textContent = msg;
    t.classList.remove('d-none');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.add('d-none'), 3200);
}

function geoName(type, id) {
    if (!id) return '—';
    const m = {
        provincia: GEO.getProvs()   || DATOS_GEO.provincias,
        municipio: GEO.getMuns()    || DATOS_GEO.municipios,
        centro:    GEO.getCentros() || DATOS_GEO.centros_salud
    };
    return m[type]?.find(x => x.id === Number(id))?.nombre || '—';
}

const fmt = iso => iso ? new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const ini = u => ((u.nombres?.[0]||'')+(u.apellidos?.[0]||'')).toUpperCase();
const rolProfName = u => u.rol_profesional_nom || ROLES_PROFESIONALES[u.rol_profesional_id]?.nombre || '—';

let _adminUser = null;

function checkAccess() {
    const uid   = sessionStorage.getItem('sr_active_user');
    const users = getUsers();
    const hasAdmin = users.some(u => u.rol_sistema_id === 6 && u.activo);

    if (!hasAdmin) {
        $a('bootstrap-bar').classList.remove('d-none');
        $a('admin-app').classList.remove('d-none');
        $a('sidebar-admin-name').textContent = 'Modo bootstrap';
        return;
    }
    const me = users.find(u => u.id === uid);
    if (!me || me.rol_sistema_id !== 6 || !me.activo) {
        $a('access-denied').classList.remove('d-none');
        return;
    }
    _adminUser = me;
    $a('sidebar-admin-name').textContent = `${me.nombres} ${me.apellidos}`;
    $a('admin-app').classList.remove('d-none');
}

$a('btn-make-admin')?.addEventListener('click', () => {
    const uid = sessionStorage.getItem('sr_active_user');
    if (!uid) { alert('Primero inicie sesión en index.html y vuelva aquí.'); return; }
    const users = getUsers(), idx = users.findIndex(u => u.id === uid);
    if (idx === -1) { alert('Usuario no encontrado.'); return; }
    users[idx].rol_sistema_id = 6;
    users[idx].aprobado = users[idx].activo = true;
    saveUsers(users);
    _adminUser = users[idx];
    $a('bootstrap-bar').classList.add('d-none');
    $a('sidebar-admin-name').textContent = `${users[idx].nombres} ${users[idx].apellidos}`;
    toast('Cuenta promovida a Administrador.', 'success');
    renderAll();
});

const TAB_META = {
    'tab-pending':   { title:'Cuentas pendientes',   sub:'Nuevas cuentas esperando aprobación' },
    'tab-users':     { title:'Gestión de usuarios',  sub:'Administre roles, permisos y estado de cuentas' },
    'tab-access':    { title:'Accesos temporales',   sub:'Solicitudes de acceso a datos para investigación' },
    'tab-locations': { title:'Localización',         sub:'Gestione provincias, municipios, centros de salud y laboratorios' },
    'tab-catalogos': { title:'Catálogos',            sub:'Gestione grupos de vulnerabilidad, tipos de muestra y microorganismos' }
};

document.querySelectorAll('.snav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('d-none'));
        const id = btn.dataset.tab;
        $a(id)?.classList.remove('d-none');
        const meta = TAB_META[id] || { title: id, sub: '' };
        $a('admin-page-title').textContent = meta.title;
        $a('admin-page-sub').textContent   = meta.sub;
        if (id === 'tab-locations') {
            initGeoData();
            renderLocPanel('provincias');
        }
        if (id === 'tab-catalogos') {
            renderCatGV();
            renderCatTM();
            renderCatMicro();
        }
    });
});

function renderStats() {
    const u = getUsers();
    const total = u.length, pending = u.filter(x => x.activo && !x.aprobado).length, active = u.filter(x => x.aprobado && x.activo).length;
    $a('header-stats').innerHTML = `
        <div class="stat-pill"><span class="stat-pill-num">${total}</span><span class="stat-pill-label">Total</span></div>
        <div class="stat-pill"><span class="stat-pill-num" style="color:var(--a-warning)">${pending}</span><span class="stat-pill-label">Pendientes</span></div>
        <div class="stat-pill"><span class="stat-pill-num" style="color:var(--a-success)">${active}</span><span class="stat-pill-label">Activos</span></div>`;
    const bp = $a('badge-pending'), ba = $a('badge-access');
    bp.textContent = pending; bp.style.display = pending > 0 ? '' : 'none';
    const ap = getAccesos().filter(a => a.estado === 'pendiente').length;
    ba.textContent = ap; ba.style.display = ap > 0 ? '' : 'none';
}

function renderPending() {
    const users = getUsers().filter(u => u.activo && !u.aprobado);
    const tbody = $a('pending-tbody'), wrap = $a('pending-table-wrap'), empty = $a('pending-empty');
    if (!users.length) { wrap.classList.add('d-none'); empty.classList.remove('d-none'); return; }
    wrap.classList.remove('d-none'); empty.classList.add('d-none');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><div class="user-cell">
                <div class="user-cell-avatar">${ini(u)}</div>
                <div><div class="user-cell-name">${u.nombres} ${u.apellidos}</div>
                     ${u.registro_profesional?`<div class="user-cell-reg">Reg: ${u.registro_profesional}</div>`:''}
                </div></div></td>
            <td><span style="font-family:var(--font-mono);font-size:.8rem">${u.ci}</span></td>
            <td><span class="rol-badge">${rolProfName(u)}</span></td>
            <td><span style="font-size:.82rem">${geoName('provincia',u.provincia_id)}</span><br>
                <span style="font-size:.75rem;color:var(--a-muted)">${u.centro_texto||geoName('centro',u.centro_salud_id)}</span></td>
            <td style="font-size:.78rem;color:var(--a-muted)">${fmt(u.creado_en)}</td>
            <td><div class="table-actions">
                <button class="btn-table-action approve" title="Aprobar" onclick="openApproveModal('${u.id}')"><i class="bi bi-check-lg"></i></button>
                <button class="btn-table-action reject"  title="Rechazar" onclick="openApproveModal('${u.id}', true)"><i class="bi bi-x-lg"></i></button>
            </div></td>
        </tr>`).join('');
}

function renderUsers() {
    let users = getUsers();
    const perms  = getPerms();
    const search = ($a('filter-search')?.value||'').toLowerCase();
    const rp = $a('filter-rol-prof')?.value, rs = $a('filter-rol-sis')?.value, est = $a('filter-estado')?.value;

    if (search) users = users.filter(u => `${u.nombres} ${u.apellidos}`.toLowerCase().includes(search)||u.ci.toLowerCase().includes(search));
    if (rp)  users = users.filter(u => String(u.rol_profesional_id) === rp);
    if (rs)  users = users.filter(u => String(u.rol_sistema_id)     === rs);
    if (est === 'aprobado')  users = users.filter(u => u.aprobado && u.activo);
    if (est === 'pendiente') users = users.filter(u => !u.aprobado && u.activo);
    if (est === 'inactivo')  users = users.filter(u => !u.activo);

    const tbody = $a('users-tbody'), empty = $a('users-empty');
    if (!users.length) { tbody.innerHTML=''; empty.classList.remove('d-none'); return; }
    empty.classList.add('d-none');

    tbody.innerHTML = users.map(u => {
        const labCount  = perms.filter(p => p.usuario_id === u.id && p.activo).length;
        const sCls  = !u.activo?'inactivo':u.aprobado?'aprobado':'pendiente';
        const sTxt  = !u.activo?'Inactivo':u.aprobado?'Aprobado':'Pendiente';
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
            <td><span class="rol-badge" style="background:#e0faf8;color:#006b64">${ROL_SIS_NAMES[u.rol_sistema_id]||'—'}</span></td>
            <td><span class="status-badge ${sCls}">${sTxt}</span></td>
            <td>${labHtml}</td>
            <td><div class="table-actions">
                <button class="btn-table-action" title="Editar" onclick="openEditModal('${u.id}')"><i class="bi bi-pencil"></i></button>
                ${u.rol_sistema_id !== 6 && u.id !== (_adminUser?.id)
                    ? `<button class="btn-table-action reject btn-delete-usuario" title="Eliminar cuenta"
                           data-id="${u.id}" data-nombre="${(u.nombres+' '+u.apellidos).replace(/"/g,'&quot;')}"><i class="bi bi-trash"></i></button>`
                    : ''}
            </div></td>
        </tr>`;
    }).join('');
}

function renderAccesos() {
    const accesos = getAccesos(), users = getUsers();
    const tbody = $a('access-tbody'), wrap = $a('access-table-wrap'), empty = $a('access-empty');
    if (!accesos.length) { wrap.classList.add('d-none'); empty.classList.remove('d-none'); return; }
    wrap.classList.remove('d-none'); empty.classList.add('d-none');
    tbody.innerHTML = accesos.map(a => {
        const u = users.find(x => x.id === a.usuario_id);
        const nombre = u ? `${u.nombres} ${u.apellidos}` : '—';
        const sCls = a.estado==='aprobada'?'aprobado':a.estado==='rechazada'?'rechazado':'pendiente';
        const actions = a.estado==='pendiente'
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

function renderAll() { renderStats(); renderPending(); renderUsers(); renderAccesos(); }

let _approveUid = null;

function buildUserCard(u) {
    const rows = [
        ['Nombre',   `${u.nombres} ${u.apellidos}`],
        ['CI',       u.ci],
        ['Rol prof.', rolProfName(u)],
        ...(u.registro_profesional ? [['Registro', u.registro_profesional]] : []),
        ['Provincia', geoName('provincia', u.provincia_id)],
        ['Municipio', geoName('municipio', u.municipio_id)],
        ['Centro',    u.centro_texto || geoName('centro', u.centro_salud_id)]
    ];
    return rows.map(([l,v]) => `<div class="uc-row"><span class="uc-label">${l}</span><span class="uc-value">${v}</span></div>`).join('');
}

function openApproveModal(uid, reject = false) {
    _approveUid = uid;
    const u = getUsers().find(x => x.id === uid);
    if (!u) return;
    $a('approve-user-card').innerHTML = buildUserCard(u);
    $a('approve-rol-sistema').value = String(u.rol_sistema_id || 1);
    $a('reject-reason-wrap').classList.toggle('d-none', !reject);
    $a('approve-reject-reason').value = '';
    new bootstrap.Modal($a('modal-approve')).show();
}

$a('btn-approve-user')?.addEventListener('click', () => {
    const users = getUsers(), idx = users.findIndex(u => u.id === _approveUid);
    if (idx === -1) return;
    users[idx].aprobado       = true;
    users[idx].rol_sistema_id = Number($a('approve-rol-sistema').value);
    saveUsers(users);
    bootstrap.Modal.getInstance($a('modal-approve'))?.hide();
    toast(`Cuenta de ${users[idx].nombres} aprobada.`, 'success');
    renderAll();
});

$a('btn-reject-user')?.addEventListener('click', () => {
    const users = getUsers(), idx = users.findIndex(u => u.id === _approveUid);
    if (idx === -1) return;
    users[idx].activo = false; users[idx].rechazado = true;
    users[idx].motivo_rechazo = $a('approve-reject-reason').value.trim() || null;
    saveUsers(users);
    bootstrap.Modal.getInstance($a('modal-approve'))?.hide();
    toast(`Cuenta de ${users[idx].nombres} rechazada.`, 'error');
    renderAll();
});

let _editUid = null, _editPerms = [];

function populateLabSelect(provId) {
    const sel = $a('modal-lab-select');
    sel.innerHTML = '<option value="">— Seleccione laboratorio —</option>';
    const labs = GEO.getLabs() || DATOS_GEO.laboratorios || [];
    [...labs]
        .filter(lab => lab.activo !== false)
        .sort((a,b) => (a.provincia_id===provId?-1:b.provincia_id===provId?1:0))
        .forEach(lab => {
            const opt = document.createElement('option');
            opt.value = lab.id;
            opt.textContent = `${lab.nombre} (${lab.nivel_referencia}) — ${geoName('provincia', lab.provincia_id)}`;
            sel.appendChild(opt);
        });
}

function renderLabList() {
    const container = $a('lab-perms-list'), emptyMsg = $a('empty-lab-msg');
    if (!_editPerms.length) { container.innerHTML=''; emptyMsg.classList.remove('d-none'); return; }
    emptyMsg.classList.add('d-none');
    container.innerHTML = _editPerms.map((p, i) => {
        const lab = (GEO.getLabs() || DATOS_GEO.laboratorios || []).find(l => l.id === Number(p.laboratorio_id));
        return `
        <div class="lab-perm-row">
            <span class="lab-perm-name">${lab?.nombre||'Lab #'+p.laboratorio_id}</span>
            <span class="lab-perm-level">${lab?.nivel_referencia||''}</span>
            <div class="perm-checkboxes">
                <label class="perm-check-label"><input type="checkbox" data-idx="${i}" data-perm="puede_emitir"   ${p.puede_emitir  ?'checked':''}> Emitir</label>
                <label class="perm-check-label"><input type="checkbox" data-idx="${i}" data-perm="puede_editar"   ${p.puede_editar  ?'checked':''}> Editar</label>
                <label class="perm-check-label"><input type="checkbox" data-idx="${i}" data-perm="puede_eliminar" ${p.puede_eliminar?'checked':''}> Eliminar</label>
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
    const u = getUsers().find(x => x.id === uid);
    if (!u) return;
    $a('modal-avatar').textContent     = ini(u);
    $a('modal-edit-name').textContent  = `${u.nombres} ${u.apellidos}`;
    $a('modal-ci').textContent         = `CI: ${u.ci}`;
    $a('modal-prof-badge').textContent = rolProfName(u);
    $a('modal-rol-sistema').value = String(u.rol_sistema_id||1);
    $a('modal-rol-hint').textContent   = ROL_SIS_HINTS[u.rol_sistema_id]||'';

    const btn = $a('btn-toggle-active');
    btn.innerHTML = u.activo ? '<i class="bi bi-slash-circle"></i> Desactivar cuenta' : '<i class="bi bi-arrow-clockwise"></i> Reactivar cuenta';
    btn.className = 'btn-toggle-active' + (u.activo ? ' is-deactivate' : '');

    $a('modal-nombres').value       = u.nombres  || '';
    $a('modal-apellidos').value     = u.apellidos || '';
    $a('modal-rol-prof-edit').value = String(u.rol_profesional_id || 1);
    $a('modal-registro').value      = u.registro_profesional || '';
    fillProvSelect($a('modal-prov-edit'), u.provincia_id);
    fillMunSelect($a('modal-mun-edit'), u.provincia_id, u.municipio_id);
    $a('modal-mun-edit').disabled   = !u.provincia_id;
    fillCentroSelect($a('modal-centro-edit'), u.municipio_id, u.centro_salud_id || u.centro_texto);
    $a('modal-prov-edit').onchange  = function () {
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

$a('modal-rol-sistema')?.addEventListener('change', function() {
    $a('modal-rol-hint').textContent = ROL_SIS_HINTS[Number(this.value)]||'';
});

$a('btn-add-lab')?.addEventListener('click', () => {
    const labId = Number($a('modal-lab-select').value);
    if (!labId) return;
    if (_editPerms.some(p => Number(p.laboratorio_id) === labId)) { toast('Este laboratorio ya está en la lista.','info'); return; }
    _editPerms.push({ usuario_id:_editUid, laboratorio_id:labId, puede_emitir:false, puede_editar:false, puede_eliminar:false, activo:true });
    renderLabList();
    $a('modal-lab-select').value = '';
});

$a('btn-toggle-active')?.addEventListener('click', () => {
    const users = getUsers(), idx = users.findIndex(u => u.id === _editUid);
    if (idx === -1) return;
    users[idx].activo = !users[idx].activo;
    saveUsers(users);
    toast(`Cuenta ${users[idx].activo?'reactivada':'desactivada'}.`, users[idx].activo?'success':'info');
    bootstrap.Modal.getInstance($a('modal-edit-user'))?.hide();
    renderAll();
});

$a('btn-save-user')?.addEventListener('click', () => {
    const users = getUsers(), idx = users.findIndex(u => u.id === _editUid);
    if (idx === -1) return;

    const nomVal = $a('modal-nombres').value.trim();
    const apVal  = $a('modal-apellidos').value.trim();
    if (!nomVal || !apVal) { toast('Nombres y apellidos son obligatorios.', 'error'); return; }
    users[idx].nombres             = nomVal;
    users[idx].apellidos           = apVal;
    const rpId = Number($a('modal-rol-prof-edit').value);
    users[idx].rol_profesional_id  = rpId;
    users[idx].rol_profesional_nom = ROLES_PROFESIONALES[rpId]?.nombre || '';
    users[idx].registro_profesional = $a('modal-registro').value.trim() || null;
    users[idx].provincia_id        = Number($a('modal-prov-edit').value)  || null;
    users[idx].municipio_id        = Number($a('modal-mun-edit').value)   || null;
    const centroVal = $a('modal-centro-edit').value;
    if (centroVal === '__otro__' || !centroVal) {
        users[idx].centro_salud_id = null;
        users[idx].centro_texto    = centroVal === '__otro__' ? (users[idx].centro_texto || 'Otro') : null;
    } else {
        users[idx].centro_salud_id = Number(centroVal);
        users[idx].centro_texto    = $a('modal-centro-edit').selectedOptions[0]?.text?.replace(/ \(.*\)$/, '') || null;
    }

    users[idx].rol_sistema_id = Number($a('modal-rol-sistema').value);

    saveUsers(users);
    const allPerms = getPerms().filter(p => p.usuario_id !== _editUid).concat(_editPerms);
    savePerms(allPerms);
    bootstrap.Modal.getInstance($a('modal-edit-user'))?.hide();
    toast('Cambios guardados correctamente.', 'success');
    renderAll();
});

let _accessId = null;

function openAccessModal(id) {
    _accessId = id;
    const a = getAccesos().find(x => x.id === id);
    if (!a) return;
    const u = getUsers().find(x => x.id === a.usuario_id);
    $a('access-request-card').innerHTML = `
        <div class="uc-row"><span class="uc-label">Solicitante</span><span class="uc-value">${u?`${u.nombres} ${u.apellidos}`:'—'}</span></div>
        <div class="uc-row"><span class="uc-label">Justificación</span><span class="uc-value">${a.justificacion}</span></div>
        <div class="uc-row"><span class="uc-label">Alcance</span><span class="uc-value">${a.alcance_solicitado}</span></div>`;
    const hoy = new Date().toISOString().split('T')[0];
    const fin = new Date(); fin.setMonth(fin.getMonth()+6);
    $a('access-fecha-inicio').value = hoy;
    $a('access-fecha-fin').value    = fin.toISOString().split('T')[0];
    $a('access-nivel').value        = 'provincial';
    $a('access-alcance').value      = a.alcance_solicitado;
    new bootstrap.Modal($a('modal-access')).show();
}

$a('btn-approve-access')?.addEventListener('click', () => {
    const accesos = getAccesos(), idx = accesos.findIndex(a => a.id === _accessId);
    if (idx === -1) return;
    Object.assign(accesos[idx], {
        estado:'aprobada', fecha_inicio:$a('access-fecha-inicio').value,
        fecha_fin:$a('access-fecha-fin').value, nivel_aprobado:$a('access-nivel').value,
        alcance_aprobado:$a('access-alcance').value, revisado_en:new Date().toISOString()
    });
    saveAccesos(accesos);
    bootstrap.Modal.getInstance($a('modal-access'))?.hide();
    toast('Acceso temporal aprobado.','success');
    renderAll();
});

$a('btn-reject-access')?.addEventListener('click', () => {
    const accesos = getAccesos(), idx = accesos.findIndex(a => a.id === _accessId);
    if (idx === -1) return;
    accesos[idx].estado = 'rechazada'; accesos[idx].revisado_en = new Date().toISOString();
    saveAccesos(accesos);
    bootstrap.Modal.getInstance($a('modal-access'))?.hide();
    toast('Solicitud rechazada.','error');
    renderAll();
});

['filter-search','filter-rol-prof','filter-rol-sis','filter-estado'].forEach(id => {
    $a(id)?.addEventListener('input',  renderUsers);
    $a(id)?.addEventListener('change', renderUsers);
});


const GEO = {
    getProvs  : () => JSON.parse(localStorage.getItem('sr_geo_provincias') || 'null'),
    getMuns   : () => JSON.parse(localStorage.getItem('sr_geo_municipios')  || 'null'),
    getCentros: () => JSON.parse(localStorage.getItem('sr_geo_centros')     || 'null'),
    getLabs   : () => JSON.parse(localStorage.getItem('sr_geo_labs')        || 'null'),
    saveProvs  : v => localStorage.setItem('sr_geo_provincias', JSON.stringify(v)),
    saveMuns   : v => localStorage.setItem('sr_geo_municipios',  JSON.stringify(v)),
    saveCentros: v => localStorage.setItem('sr_geo_centros',     JSON.stringify(v)),
    saveLabs   : v => localStorage.setItem('sr_geo_labs',        JSON.stringify(v)),
};

function initGeoData() {
    if (!GEO.getProvs())   GEO.saveProvs(DATOS_GEO.provincias.map(p => ({...p})));
    if (!GEO.getMuns())    GEO.saveMuns(DATOS_GEO.municipios.map(m => ({...m})));
    if (!GEO.getCentros()) GEO.saveCentros(DATOS_GEO.centros_salud.map(c => ({...c})));
    if (!GEO.getLabs())    GEO.saveLabs((DATOS_GEO.laboratorios||[]).map(l => ({...l, activo: l.activo ?? true})));
}

const geoProvName   = id => GEO.getProvs()?.find(p => p.id === Number(id))?.nombre   || '—';
const geoMunName    = id => GEO.getMuns()?.find(m => m.id === Number(id))?.nombre    || '—';
const nextGeoId     = arr => arr.length ? Math.max(...arr.map(x => Number(x.id))) + 1 : 1;

function levelBadge(nivel) {
    const map = { local:'#8fa3bf:#eef3fb', municipal:'#1a56db:#e8f0fe', provincial:'#7c3aed:#f0e8fe', nacional:'#b91c1c:#fee4e2' };
    const [color, bg] = (map[nivel] || '#888:#f0f4fa').split(':');
    return `<span style="display:inline-block;padding:.15rem .55rem;border-radius:6px;font-family:var(--font-mono);font-size:.68rem;background:${bg};color:${color}">${nivel}</span>`;
}

document.querySelectorAll('.loc-subtab').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.loc-subtab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.loc-panel').forEach(p => p.classList.add('d-none'));
        $a(`loc-${this.dataset.loc}`)?.classList.remove('d-none');
        renderLocPanel(this.dataset.loc);
    });
});

function renderLocPanel(panel) {
    ({ provincias: renderProvs, municipios: renderMuns, centros: renderCentros, laboratorios: renderLabs }[panel] || (() => {}))();
}

function renderProvs() {
    const provs    = GEO.getProvs() || [];
    const muns     = GEO.getMuns()  || [];
    const centros  = GEO.getCentros() || [];
    const labs     = GEO.getLabs() || [];
    const tbody    = $a('tbody-provincias');
    $a('count-provincias').textContent = `${provs.length} provincia(s)`;
    tbody.innerHTML = '';

    provs.forEach(p => {
        const nMun  = muns.filter(m => m.provincia_id === p.id).length;
        const nCent = centros.filter(c => c.municipio_id && muns.filter(m => m.provincia_id === p.id).map(m => m.id).includes(c.municipio_id)).length;
        const nLab  = labs.filter(l => l.provincia_id === p.id).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-muted" style="font-family:var(--font-mono)">${p.id}</td>
            <td style="font-weight:500">${p.nombre}</td>
            <td style="font-family:var(--font-mono);font-size:.78rem">${p.codigo}</td>
            <td class="td-muted">${nMun}</td>
            <td class="td-muted">${nCent}</td>
            <td class="td-muted">${nLab}</td>
            <td class="text-end">
                <div class="table-actions justify-content-end">
                    <button class="btn-table-action" title="Editar" onclick="openProvModal(${p.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn-table-action reject btn-delete-geo" title="Eliminar"
                        data-tipo="provincia" data-id="${p.id}"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

const _modalProv = () => bootstrap.Modal.getOrCreateInstance($a('modal-provincia'));

$a('btn-new-provincia')?.addEventListener('click', () => {
    $a('modal-provincia-title').innerHTML = '<i class="bi bi-map"></i> Nueva provincia';
    $a('prov-edit-id').value = '';
    $a('prov-nombre').value  = '';
    $a('prov-codigo').value  = '';
    $a('prov-err').classList.add('d-none');
    _modalProv().show();
});

function openProvModal(id) {
    const p = (GEO.getProvs() || []).find(x => x.id === id);
    if (!p) return;
    $a('modal-provincia-title').innerHTML = '<i class="bi bi-pencil"></i> Editar provincia';
    $a('prov-edit-id').value = p.id;
    $a('prov-nombre').value  = p.nombre;
    $a('prov-codigo').value  = p.codigo;
    $a('prov-err').classList.add('d-none');
    _modalProv().show();
}

$a('btn-save-provincia')?.addEventListener('click', () => {
    const nombre = $a('prov-nombre').value.trim();
    const codigo = $a('prov-codigo').value.trim().toUpperCase();
    $a('prov-err').classList.add('d-none');

    if (!nombre || !codigo) return showLocErr('prov-err', 'Nombre y código son obligatorios.');
    if (!/^[A-Z]{2,3}$/.test(codigo)) return showLocErr('prov-err', 'El código debe tener 2–3 letras mayúsculas.');

    const provs  = GEO.getProvs() || [];
    const editId = Number($a('prov-edit-id').value);

    const dup = provs.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== editId);
    if (dup) return showLocErr('prov-err', 'Ya existe una provincia con ese nombre.');
    const dupCod = provs.find(p => p.codigo === codigo && p.id !== editId);
    if (dupCod) return showLocErr('prov-err', 'Ese código ya está en uso.');

    if (editId) {
        const idx = provs.findIndex(p => p.id === editId);
        provs[idx] = { ...provs[idx], nombre, codigo };
    } else {
        provs.push({ id: nextGeoId(provs), nombre, codigo });
    }

    GEO.saveProvs(provs);
    _modalProv().hide();
    renderProvs();
    toast(editId ? 'Provincia actualizada.' : 'Provincia creada.');
});

function renderMuns() {
    const search   = ($a('filter-mun')?.value || '').toLowerCase();
    const provFilt = $a('filter-mun-prov')?.value;
    let muns = GEO.getMuns() || [];
    const centros = GEO.getCentros() || [];
    const labs    = GEO.getLabs()    || [];

    if (search)   muns = muns.filter(m => m.nombre.toLowerCase().includes(search));
    if (provFilt) muns = muns.filter(m => String(m.provincia_id) === provFilt);

    $a('count-municipios').textContent = `${muns.length} municipio(s)`;
    const tbody = $a('tbody-municipios');
    tbody.innerHTML = '';

    muns.forEach(m => {
        const nCent = centros.filter(c => c.municipio_id === m.id).length;
        const nLab  = labs.filter(l => l.municipio_id === m.id).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-muted" style="font-family:var(--font-mono)">${m.id}</td>
            <td style="font-weight:500">${m.nombre}</td>
            <td class="td-muted">${geoProvName(m.provincia_id)}</td>
            <td class="td-muted">${nCent}</td>
            <td class="td-muted">${nLab}</td>
            <td class="text-end">
                <div class="table-actions justify-content-end">
                    <button class="btn-table-action" title="Editar" onclick="openMunModal(${m.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn-table-action reject btn-delete-geo" title="Eliminar"
                        data-tipo="municipio" data-id="${m.id}"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });

    const fprov = $a('filter-mun-prov');
    if (fprov && fprov.options.length === 1) fillProvSelect(fprov);
}

const _modalMun = () => bootstrap.Modal.getOrCreateInstance($a('modal-municipio'));

$a('btn-new-municipio')?.addEventListener('click', () => {
    $a('modal-municipio-title').innerHTML = '<i class="bi bi-signpost-split"></i> Nuevo municipio';
    $a('mun-edit-id').value  = '';
    $a('mun-nombre').value   = '';
    fillProvSelect($a('mun-provincia'));
    $a('mun-err').classList.add('d-none');
    _modalMun().show();
});

function openMunModal(id) {
    const m = (GEO.getMuns() || []).find(x => x.id === id);
    if (!m) return;
    $a('modal-municipio-title').innerHTML = '<i class="bi bi-pencil"></i> Editar municipio';
    $a('mun-edit-id').value = m.id;
    $a('mun-nombre').value  = m.nombre;
    fillProvSelect($a('mun-provincia'), m.provincia_id);
    $a('mun-err').classList.add('d-none');
    _modalMun().show();
}

$a('btn-save-municipio')?.addEventListener('click', () => {
    const nombre = $a('mun-nombre').value.trim();
    const provId = Number($a('mun-provincia').value);
    $a('mun-err').classList.add('d-none');

    if (!nombre)  return showLocErr('mun-err', 'El nombre es obligatorio.');
    if (!provId)  return showLocErr('mun-err', 'Seleccione una provincia.');

    const muns   = GEO.getMuns() || [];
    const editId = Number($a('mun-edit-id').value);
    const dup    = muns.find(m => m.nombre.toLowerCase() === nombre.toLowerCase() && m.provincia_id === provId && m.id !== editId);
    if (dup) return showLocErr('mun-err', 'Ya existe ese municipio en esa provincia.');

    if (editId) {
        const idx = muns.findIndex(m => m.id === editId);
        muns[idx] = { ...muns[idx], nombre, provincia_id: provId };
    } else {
        muns.push({ id: nextGeoId(muns), nombre, provincia_id: provId });
    }

    GEO.saveMuns(muns);
    _modalMun().hide();
    renderMuns();
    toast(editId ? 'Municipio actualizado.' : 'Municipio creado.');
});

$a('filter-mun')?.addEventListener('input',  renderMuns);
$a('filter-mun-prov')?.addEventListener('change', renderMuns);

function renderCentros() {
    const search   = ($a('filter-centro')?.value || '').toLowerCase();
    const provFilt = $a('filter-centro-prov')?.value;
    const munFilt  = $a('filter-centro-mun')?.value;
    let centros = GEO.getCentros() || [];
    const muns  = GEO.getMuns()    || [];

    if (search)   centros = centros.filter(c => c.nombre.toLowerCase().includes(search));
    if (provFilt) {
        const munIds = muns.filter(m => String(m.provincia_id) === provFilt).map(m => m.id);
        centros = centros.filter(c => munIds.includes(c.municipio_id));
    }
    if (munFilt) centros = centros.filter(c => String(c.municipio_id) === munFilt);

    $a('count-centros').textContent = `${centros.length} centro(s)`;
    const tbody = $a('tbody-centros');
    tbody.innerHTML = '';

    centros.forEach(c => {
        const mun  = muns.find(m => m.id === c.municipio_id);
        const prov = geoProvName(mun?.provincia_id);
        const tr   = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-muted" style="font-family:var(--font-mono)">${c.id}</td>
            <td style="font-weight:500">${c.nombre}</td>
            <td class="td-muted">${c.tipo || '—'}</td>
            <td class="td-muted">${mun?.nombre || '—'}</td>
            <td class="td-muted">${prov}</td>
            <td class="text-end">
                <div class="table-actions justify-content-end">
                    <button class="btn-table-action" title="Editar" onclick="openCentroModal(${c.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn-table-action reject btn-delete-geo" title="Eliminar"
                        data-tipo="centro" data-id="${c.id}"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });

    const fprov = $a('filter-centro-prov');
    if (fprov && fprov.options.length === 1) fillProvSelect(fprov);
}

const _modalCentro = () => bootstrap.Modal.getOrCreateInstance($a('modal-centro'));

$a('btn-new-centro')?.addEventListener('click', () => {
    $a('modal-centro-title').innerHTML = '<i class="bi bi-hospital"></i> Nuevo centro de salud';
    $a('centro-edit-id').value = '';
    $a('centro-nombre').value  = '';
    $a('centro-tipo').value    = '';
    fillProvSelect($a('centro-provincia'));
    $a('centro-municipio').innerHTML = '<option value="">— Seleccione provincia —</option>';
    $a('centro-municipio').disabled = true;
    $a('centro-err').classList.add('d-none');
    _modalCentro().show();
});

function openCentroModal(id) {
    const c = (GEO.getCentros() || []).find(x => x.id === id);
    if (!c) return;
    const mun = (GEO.getMuns() || []).find(m => m.id === c.municipio_id);
    $a('modal-centro-title').innerHTML = '<i class="bi bi-pencil"></i> Editar centro de salud';
    $a('centro-edit-id').value = c.id;
    $a('centro-nombre').value  = c.nombre;
    $a('centro-tipo').value    = c.tipo || '';
    fillProvSelect($a('centro-provincia'), mun?.provincia_id);
    fillMunSelect($a('centro-municipio'), mun?.provincia_id, c.municipio_id);
    $a('centro-municipio').disabled = false;
    $a('centro-err').classList.add('d-none');
    _modalCentro().show();
}

$a('centro-provincia')?.addEventListener('change', function () {
    fillMunSelect($a('centro-municipio'), this.value);
    $a('centro-municipio').disabled = !this.value;
});

$a('btn-save-centro')?.addEventListener('click', () => {
    const nombre = $a('centro-nombre').value.trim();
    const tipo   = $a('centro-tipo').value;
    const munId  = Number($a('centro-municipio').value);
    $a('centro-err').classList.add('d-none');

    if (!nombre) return showLocErr('centro-err', 'El nombre es obligatorio.');
    if (!tipo)   return showLocErr('centro-err', 'Seleccione el tipo de centro.');
    if (!munId)  return showLocErr('centro-err', 'Seleccione el municipio.');

    const mun    = (GEO.getMuns() || []).find(m => m.id === munId);
    const centros = GEO.getCentros() || [];
    const editId  = Number($a('centro-edit-id').value);

    if (editId) {
        const idx = centros.findIndex(c => c.id === editId);
        centros[idx] = { ...centros[idx], nombre, tipo, municipio_id: munId };
    } else {
        centros.push({ id: nextGeoId(centros), nombre, tipo, municipio_id: munId });
    }

    GEO.saveCentros(centros);
    _modalCentro().hide();
    renderCentros();
    toast(editId ? 'Centro actualizado.' : 'Centro creado.');
});

$a('filter-centro')?.addEventListener('input', renderCentros);
$a('filter-centro-prov')?.addEventListener('change', function () {
    const sel = $a('filter-centro-mun');
    sel.innerHTML = '<option value="">Todos los municipios</option>';
    if (this.value) {
        (GEO.getMuns() || []).filter(m => String(m.provincia_id) === this.value).forEach(m => {
            sel.appendChild(new Option(m.nombre, m.id));
        });
    }
    renderCentros();
});
$a('filter-centro-mun')?.addEventListener('change', renderCentros);

function renderLabs() {
    const search    = ($a('filter-lab')?.value || '').toLowerCase();
    const provFilt  = $a('filter-lab-prov')?.value;
    const nivelFilt = $a('filter-lab-nivel')?.value;
    let labs = GEO.getLabs() || [];

    if (search)    labs = labs.filter(l => l.nombre.toLowerCase().includes(search));
    if (provFilt)  labs = labs.filter(l => String(l.provincia_id) === provFilt);
    if (nivelFilt) labs = labs.filter(l => l.nivel_referencia === nivelFilt);

    $a('count-laboratorios').textContent = `${labs.length} laboratorio(s)`;
    const tbody = $a('tbody-laboratorios');
    tbody.innerHTML = '';

    labs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="td-muted" style="font-family:var(--font-mono)">${l.id}</td>
            <td style="font-weight:500">${l.nombre}</td>
            <td>${levelBadge(l.nivel_referencia)}</td>
            <td class="td-muted">${geoMunName(l.municipio_id)}</td>
            <td class="td-muted">${geoProvName(l.provincia_id)}</td>
            <td><span class="status-badge ${l.activo ? 'aprobado' : 'rechazado'}">${l.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td class="text-end">
                <div class="table-actions justify-content-end">
                    <button class="btn-table-action" title="Editar" onclick="openLabModal(${l.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn-table-action reject btn-delete-geo" title="Eliminar"
                        data-tipo="laboratorio" data-id="${l.id}"><i class="bi bi-trash"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });

    const fprov = $a('filter-lab-prov');
    if (fprov && fprov.options.length === 1) fillProvSelect(fprov);
}

const _modalLab = () => bootstrap.Modal.getOrCreateInstance($a('modal-laboratorio'));

$a('btn-new-lab')?.addEventListener('click', () => {
    $a('modal-lab-title').innerHTML = '<i class="bi bi-flask"></i> Nuevo laboratorio';
    $a('lab-edit-id').value = '';
    $a('lab-nombre').value  = '';
    $a('lab-nivel').value   = 'local';
    fillProvSelect($a('lab-provincia'));
    $a('lab-municipio').innerHTML = '<option value="">— Seleccione provincia —</option>';
    $a('lab-municipio').disabled = true;
    document.querySelector('input[name="lab-activo"][value="true"]').checked = true;
    $a('lab-err').classList.add('d-none');
    _modalLab().show();
});

function openLabModal(id) {
    const l = (GEO.getLabs() || []).find(x => x.id === id);
    if (!l) return;
    $a('modal-lab-title').innerHTML = '<i class="bi bi-pencil"></i> Editar laboratorio';
    $a('lab-edit-id').value = l.id;
    $a('lab-nombre').value  = l.nombre;
    $a('lab-nivel').value   = l.nivel_referencia;
    fillProvSelect($a('lab-provincia'), l.provincia_id);
    fillMunSelect($a('lab-municipio'), l.provincia_id, l.municipio_id);
    $a('lab-municipio').disabled = false;
    document.querySelector(`input[name="lab-activo"][value="${l.activo}"]`).checked = true;
    $a('lab-err').classList.add('d-none');
    _modalLab().show();
}

$a('lab-provincia')?.addEventListener('change', function () {
    fillMunSelect($a('lab-municipio'), this.value);
    $a('lab-municipio').disabled = !this.value;
});

$a('btn-save-lab')?.addEventListener('click', () => {
    const nombre  = $a('lab-nombre').value.trim();
    const nivel   = $a('lab-nivel').value;
    const provId  = Number($a('lab-provincia').value);
    const munId   = Number($a('lab-municipio').value);
    const activo  = document.querySelector('input[name="lab-activo"]:checked')?.value === 'true';
    $a('lab-err').classList.add('d-none');

    if (!nombre) return showLocErr('lab-err', 'El nombre es obligatorio.');
    if (!provId) return showLocErr('lab-err', 'Seleccione la provincia.');
    if (!munId)  return showLocErr('lab-err', 'Seleccione el municipio.');

    const labs   = GEO.getLabs() || [];
    const editId = Number($a('lab-edit-id').value);

    if (editId) {
        const idx = labs.findIndex(l => l.id === editId);
        labs[idx] = { ...labs[idx], nombre, nivel_referencia: nivel, provincia_id: provId, municipio_id: munId, activo };
    } else {
        labs.push({ id: nextGeoId(labs), nombre, nivel_referencia: nivel, provincia_id: provId, municipio_id: munId, activo });
    }

    GEO.saveLabs(labs);
    _modalLab().hide();
    renderLabs();
    toast(editId ? 'Laboratorio actualizado.' : 'Laboratorio creado.');
});

$a('filter-lab')?.addEventListener('input', renderLabs);
$a('filter-lab-prov')?.addEventListener('change', renderLabs);
$a('filter-lab-nivel')?.addEventListener('change', renderLabs);

let _pendingDelete = null;
const _modalDel = () => bootstrap.Modal.getOrCreateInstance($a('modal-delete'));

document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete-geo');
    if (!btn) return;
    const tipo = btn.dataset.tipo;
    const id   = Number(btn.dataset.id);
    if (!tipo || !id) return;

    const nombre = _getNombreGeo(tipo, id);

    const muns    = GEO.getMuns()    || [];
    const centros = GEO.getCentros() || [];
    const labs    = GEO.getLabs()    || [];
    let extra = '';

    if (tipo === 'provincia') {
        const munIds  = muns.filter(m => m.provincia_id === id).map(m => m.id);
        const nMun    = munIds.length;
        const nCentro = centros.filter(c => munIds.includes(c.municipio_id)).length;
        const nLab    = labs.filter(l => l.provincia_id === id || munIds.includes(l.municipio_id)).length;
        extra = nMun
            ? `<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán en cascada: <strong>${nMun}</strong> municipio(s), <strong>${nCentro}</strong> centro(s) y <strong>${nLab}</strong> laboratorio(s).</small>`
            : '';
    } else if (tipo === 'municipio') {
        const nCentro = centros.filter(c => c.municipio_id === id).length;
        const nLab    = labs.filter(l => l.municipio_id === id).length;
        extra = (nCentro || nLab)
            ? `<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán en cascada: <strong>${nCentro}</strong> centro(s) y <strong>${nLab}</strong> laboratorio(s).</small>`
            : '';
    }

    $a('delete-confirm-msg').innerHTML = {
        provincia:   `¿Eliminar la provincia <strong>"${nombre}"</strong>?${extra}`,
        municipio:   `¿Eliminar el municipio <strong>"${nombre}"</strong>?${extra}`,
        centro:      `¿Eliminar el centro de salud <strong>"${nombre}"</strong>?`,
        laboratorio: `¿Eliminar el laboratorio <strong>"${nombre}"</strong>?<br><small>Los permisos de laboratorio asociados también serán eliminados.</small>`,
    }[tipo] || `¿Eliminar <strong>"${nombre}"</strong>?`;

    _pendingDelete = { tipo, id };
    _modalDel().show();
});

function _getNombreGeo(tipo, id) {
    const maps = {
        provincia:   () => (GEO.getProvs()    || []).find(x => x.id === id)?.nombre,
        municipio:   () => (GEO.getMuns()     || []).find(x => x.id === id)?.nombre,
        centro:      () => (GEO.getCentros()  || []).find(x => x.id === id)?.nombre,
        laboratorio: () => (GEO.getLabs()     || []).find(x => x.id === id)?.nombre,
    };
    return (maps[tipo]?.() || `#${id}`);
}

$a('btn-confirm-delete')?.addEventListener('click', () => {
    if (!_pendingDelete) return;
    const { tipo, id } = _pendingDelete;

    if (tipo === 'provincia') {
        const muns    = GEO.getMuns()    || [];
        const munIds  = muns.filter(m => m.provincia_id === id).map(m => m.id);
        const labs    = GEO.getLabs()    || [];
        const labIds  = labs
            .filter(l => l.provincia_id === id || munIds.includes(l.municipio_id))
            .map(l => l.id);

        GEO.saveProvs((GEO.getProvs()   || []).filter(p => p.id !== id));
        GEO.saveMuns(muns.filter(m => !munIds.includes(m.id)));
        GEO.saveCentros((GEO.getCentros() || []).filter(c => !munIds.includes(c.municipio_id)));
        GEO.saveLabs(labs.filter(l => !labIds.includes(l.id)));
        savePerms(getPerms().filter(p => !labIds.includes(p.laboratorio_id)));
        renderProvs();

    } else if (tipo === 'municipio') {
        const labs   = GEO.getLabs() || [];
        const labIds = labs.filter(l => l.municipio_id === id).map(l => l.id);

        GEO.saveMuns((GEO.getMuns()     || []).filter(m => m.id !== id));
        GEO.saveCentros((GEO.getCentros() || []).filter(c => c.municipio_id !== id));
        GEO.saveLabs(labs.filter(l => l.municipio_id !== id));
        savePerms(getPerms().filter(p => !labIds.includes(p.laboratorio_id)));
        renderMuns();

    } else if (tipo === 'centro') {
        GEO.saveCentros((GEO.getCentros() || []).filter(c => c.id !== id));
        renderCentros();

    } else if (tipo === 'laboratorio') {
        GEO.saveLabs((GEO.getLabs() || []).filter(l => l.id !== id));
        savePerms(getPerms().filter(p => p.laboratorio_id !== id));
        renderLabs();

    } else if (tipo === 'usuario') {
        const uid = id; 
        saveUsers(getUsers().filter(u => u.id !== uid));
        savePerms(getPerms().filter(p => p.usuario_id !== uid));
        saveAccesos(getAccesos().filter(a => a.usuario_id !== uid));
        renderAll();
    }

    _pendingDelete = null;
    _modalDel().hide();
    toast('Registro eliminado.', 'info');
});

document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete-usuario');
    if (!btn) return;
    const uid    = btn.dataset.id;
    const nombre = btn.dataset.nombre || uid;
    if (!uid) return;

    const u = getUsers().find(x => x.id === uid);
    if (!u) return;

    if (u.rol_sistema_id === 6) return;

    const permsCount = getPerms().filter(p => p.usuario_id === uid).length;
    const extra = permsCount
        ? `<br><small style="color:#e0435a"><i class="bi bi-exclamation-triangle-fill"></i> Se eliminarán <strong>${permsCount}</strong> permiso(s) de laboratorio asociados.</small>`
        : '';

    $a('delete-confirm-msg').innerHTML =
        `¿Eliminar permanentemente la cuenta de <strong>"${nombre}"</strong>? Esta acción no se puede deshacer.${extra}`;

    _pendingDelete = { tipo: 'usuario', id: uid };
    _modalDel().show();
});


function fillProvSelect(sel, selectedId) {
    sel.innerHTML = '<option value="">— Seleccione —</option>';
    (GEO.getProvs() || []).forEach(p => {
        const opt = new Option(p.nombre, p.id);
        if (p.id === Number(selectedId)) opt.selected = true;
        sel.appendChild(opt);
    });
}

function fillMunSelect(sel, provId, selectedId) {
    sel.innerHTML = '<option value="">— Seleccione —</option>';
    (GEO.getMuns() || []).filter(m => m.provincia_id === Number(provId)).forEach(m => {
        const opt = new Option(m.nombre, m.id);
        if (m.id === Number(selectedId)) opt.selected = true;
        sel.appendChild(opt);
    });
}

function fillCentroSelect(sel, munId, selectedId) {
    sel.innerHTML = '<option value="">— Seleccione —</option>';
    const centros = (GEO.getCentros() || []).filter(c => c.municipio_id === Number(munId));
    centros.forEach(c => {
        const opt = new Option(`${c.nombre}${c.tipo ? ' ('+c.tipo+')' : ''}`, c.id);
        if (c.id === Number(selectedId)) opt.selected = true;
        sel.appendChild(opt);
    });
    const otro = new Option('Otro / no listado', '__otro__');
    if (!selectedId || selectedId === '__otro__') otro.selected = true;
    sel.appendChild(otro);
    sel.disabled = !munId;
}

function showLocErr(errId, msg) {
    const el = $a(errId);
    el.textContent = msg;
    el.classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => { initGeoData(); }, { once: false });

function seedDemo() {
    if (getUsers().length) return;
    saveUsers([
        { id:'demo_001', ci:'8501025678', nombres:'Ana María', apellidos:'Rodríguez Pérez', rol_profesional_id:1, rol_profesional_nom:'Médico/a', registro_profesional:'RM-12345', provincia_id:1, municipio_id:101, centro_texto:'Hospital Hermanos Ameijeiras', pin_hash:'x', rol_sistema_id:1, activo:true, aprobado:false, creado_en:new Date(Date.now()-172800000).toISOString() },
        { id:'demo_002', ci:'9203147890', nombres:'Carlos', apellidos:'Vidal Suárez', rol_profesional_id:2, rol_profesional_nom:'Enfermero/a', registro_profesional:null, provincia_id:6, municipio_id:601, centro_texto:'Hospital Arnaldo Milián Castro', pin_hash:'x', rol_sistema_id:1, activo:true, aprobado:false, creado_en:new Date(Date.now()-86400000).toISOString() },
        { id:'demo_003', ci:'7708234501', nombres:'Liset', apellidos:'Fuentes Mora', rol_profesional_id:3, rol_profesional_nom:'Licenciado/a de Lab.', registro_profesional:'RL-88901', provincia_id:14, municipio_id:1401, centro_texto:'Hospital Juan Bruno Zayas', pin_hash:'x', rol_sistema_id:1, activo:true, aprobado:true, creado_en:new Date(Date.now()-604800000).toISOString() }
    ]);
    saveAccesos([{ id:'ac_001', usuario_id:'demo_003', justificacion:'Tesis de maestría en epidemiología de infecciones respiratorias', alcance_solicitado:'Resultados de cultivos respiratorios provincia Santiago de Cuba 2023-2024', estado:'pendiente', creado_en:new Date(Date.now()-18000000).toISOString() }]);
}


const LS_GV = 'sr_grupos_vulnerables';
const LS_TM = 'sr_tipos_muestra';

const GV_DEFAULTS = [
    'Antiguo caso de TB','Contacto TB','Cubano viviendo en países de alta carga de TB',
    'Desnutrición','Diabetes mellitus','Enfermedad respiratoria crónica',
    'Extranjero proveniente de país de alta carga de TB','Fumador',
    'Insuficiencia renal crónica','Lesiones radiográficas antiguas','Minero',
    'Niños ≤ 5 años','Persona que consume drogas','Personas en internamiento prolongado',
    'Recluso o Exrecluso','Sin hogar',
    'Trabajador de salud relacionado con la atención a pacientes',
    'Trabajador de unidad penitenciaria','Trastornos por consumo de alcohol',
    'Vivir en hacinamiento, poca ventilación y luz solar, barrios marginales',
    'VIH','Adulto ≥ 60 años'
];

const TM_DEFAULTS = [
    'Aspirado bronquial','BAAF ganglio','Biopsias de tejido','Broncoscopía',
    'Contenido gástrico','Esputo 1','Esputo 2','Esputo 3','Esputo evolutivo',
    'Exudado de lesión','Exudado faríngeo','Ganglio mesentérico',
    'L. Articular','L. Ascítico','L. Pericárdico','L. Peritoneal','L. Pleural',
    'Lavado bronquial','LCR','Líquido sinovial','Médula ósea',
    'Orina','Pus de lesión','Secreción'
];

function _getCat(key)       { return JSON.parse(localStorage.getItem(key) || 'null'); }
function _saveCat(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

function _initCatIfNeeded(key, defaults) {
    if (_getCat(key) !== null) return;
    const arr = defaults.map((nombre, i) => ({ id: i + 1, nombre, activo: true }));
    _saveCat(key, arr);
}

function _nextCatId(arr) {
    return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

function renderCatGV() {
    _initCatIfNeeded(LS_GV, GV_DEFAULTS);
    const items = _getCat(LS_GV);
    const el = $a('gv-admin-list');
    if (!el) return;
    el.innerHTML = items.map(item => _catItemHtml(item, 'gv')).join('');
    _bindCatEvents('gv', LS_GV, renderCatGV);
    $a('btn-nuevo-gv').onclick = () => _openCatModal('gv', null);
}

function renderCatTM() {
    _initCatIfNeeded(LS_TM, TM_DEFAULTS);
    const items = _getCat(LS_TM);
    const el = $a('tm-admin-list');
    if (!el) return;
    el.innerHTML = items.map(item => _catItemHtml(item, 'tm')).join('');
    _bindCatEvents('tm', LS_TM, renderCatTM);
    $a('btn-nuevo-tm').onclick = () => _openCatModal('tm', null);
}

function _catItemHtml(item, type) {
    const estadoCls  = item.activo ? 'cat-badge-active' : 'cat-badge-inactive';
    const estadoTxt  = item.activo ? 'Activo' : 'Inactivo';
    return `
    <div class="cat-item" data-id="${item.id}" data-type="${type}">
        <span class="cat-item-nombre">${item.nombre}</span>
        <div class="cat-item-actions">
            <span class="cat-badge ${estadoCls}">${estadoTxt}</span>
            <button class="btn-table-action edit cat-edit-btn"
                    data-id="${item.id}" data-type="${type}"
                    title="Editar"><i class="bi bi-pencil"></i></button>
            <button class="btn-table-action reject cat-del-btn"
                    data-id="${item.id}" data-type="${type}"
                    title="Eliminar"><i class="bi bi-trash"></i></button>
        </div>
    </div>`;
}

function _bindCatEvents(type, lsKey, renderFn) {
    document.querySelectorAll(`.cat-edit-btn[data-type="${type}"]`).forEach(btn => {
        btn.onclick = () => {
            const arr = _getCat(lsKey);
            const item = arr.find(x => x.id === parseInt(btn.dataset.id));
            if (item) _openCatModal(type, item);
        };
    });
    document.querySelectorAll(`.cat-del-btn[data-type="${type}"]`).forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            const arr = _getCat(lsKey);
            const item = arr.find(x => x.id === id);
            if (!item) return;
            const modalEl = document.getElementById('modal-delete');
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            $a('delete-confirm-msg').textContent = `¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`;
            $a('btn-confirm-delete').onclick = () => {
                const updated = arr.filter(x => x.id !== id);
                _saveCat(lsKey, updated);
                bsModal.hide();
                renderFn();
                toast('Ítem eliminado.', 'info');
            };
            bsModal.show();
        };
    });
}

function _openCatModal(type, item) {
    const isGV = type === 'gv';
    $a('modal-cat-title').innerHTML = `<i class="bi bi-tag"></i> ${item ? 'Editar' : 'Nuevo'} — ${isGV ? 'Grupo de vulnerabilidad' : 'Tipo de muestra'}`;
    $a('cat-edit-id').value   = item ? item.id : '';
    $a('cat-edit-type').value = type;
    $a('cat-nombre').value    = item ? item.nombre : '';
    document.querySelector(`input[name="cat-activo"][value="${item ? item.activo : 'true'}"]`).checked = true;
    $a('cat-err').classList.add('d-none');

    const modalEl = document.getElementById('modal-cat-item');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

$a('btn-save-cat')?.addEventListener('click', () => {
    const type   = $a('cat-edit-type').value;
    const lsKey  = type === 'gv' ? LS_GV : LS_TM;
    const renderFn = type === 'gv' ? renderCatGV : renderCatTM;
    const nombre = $a('cat-nombre').value.trim();
    const activo = document.querySelector('input[name="cat-activo"]:checked')?.value === 'true';
    const errEl  = $a('cat-err');

    if (!nombre) {
        errEl.textContent = 'El nombre es obligatorio.';
        errEl.classList.remove('d-none'); return;
    }

    const arr    = _getCat(lsKey);
    const editId = $a('cat-edit-id').value ? parseInt($a('cat-edit-id').value) : null;

    const existe = arr.some(x => x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== editId);
    if (existe) {
        errEl.textContent = 'Ya existe un ítem con ese nombre.';
        errEl.classList.remove('d-none'); return;
    }

    if (editId) {
        const idx = arr.findIndex(x => x.id === editId);
        if (idx !== -1) { arr[idx].nombre = nombre; arr[idx].activo = activo; }
    } else {
        arr.push({ id: _nextCatId(arr), nombre, activo });
    }

    _saveCat(lsKey, arr);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cat-item')).hide();
    renderFn();
    toast(editId ? 'Ítem actualizado.' : 'Ítem creado.', 'success');
});

const LS_MICRO_ADMIN = 'sr_microorganismos';
const MICRO_DEFAULTS = [
    { id: 1, nombre: 'Mycobacterium tuberculosis',         sistema: true, activo: true },
    { id: 2, nombre: 'MNTB (Micobacteria No Tuberculosa)', sistema: true, activo: true },
];

function _getMicroAdmin() {
    const stored = JSON.parse(localStorage.getItem(LS_MICRO_ADMIN) || 'null');
    if (!stored) { localStorage.setItem(LS_MICRO_ADMIN, JSON.stringify(MICRO_DEFAULTS)); return MICRO_DEFAULTS; }
    return stored;
}
function _saveMicro(arr) { localStorage.setItem(LS_MICRO_ADMIN, JSON.stringify(arr)); }

function renderCatMicro() {
    const items = _getMicroAdmin();
    const el = $a('micro-admin-list');
    if (!el) return;
    el.innerHTML = items.map(item => {
        const estadoCls = item.activo ? 'cat-badge-active' : 'cat-badge-inactive';
        const sisCls    = item.sistema ? ' cat-sistema' : '';
        return `
        <div class="cat-item${sisCls}" data-id="${item.id}">
            <span class="cat-item-nombre">
                ${item.nombre}
                ${item.sistema ? '<span class="cat-badge" style="background:#e0e7ff;color:#3730a3;margin-left:.4rem">Sistema</span>' : ''}
            </span>
            <div class="cat-item-actions">
                <span class="cat-badge ${estadoCls}">${item.activo ? 'Activo' : 'Inactivo'}</span>
                ${!item.sistema ? `
                <button class="btn-table-action edit micro-edit-btn" data-id="${item.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn-table-action reject micro-del-btn" data-id="${item.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                ` : `
                <button class="btn-table-action edit micro-edit-btn" data-id="${item.id}" title="Editar nombre/estado"><i class="bi bi-pencil"></i></button>
                `}
            </div>
        </div>`;
    }).join('');

    $a('btn-nuevo-micro').onclick = () => _openMicroModal(null);

    document.querySelectorAll('.micro-edit-btn').forEach(btn => {
        btn.onclick = () => {
            const item = _getMicroAdmin().find(x => x.id === parseInt(btn.dataset.id));
            if (item) _openMicroModal(item);
        };
    });
    document.querySelectorAll('.micro-del-btn').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            const item = _getMicroAdmin().find(x => x.id === id);
            if (!item || item.sistema) return;
            const modalEl = document.getElementById('modal-delete');
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            $a('delete-confirm-msg').textContent = `¿Eliminar "${item.nombre}"?`;
            $a('btn-confirm-delete').onclick = () => {
                _saveMicro(_getMicroAdmin().filter(x => x.id !== id));
                bsModal.hide(); renderCatMicro(); toast('Microorganismo eliminado.', 'info');
            };
            bsModal.show();
        };
    });
}

function _openMicroModal(item) {
    $a('modal-cat-title').innerHTML = `<i class="bi bi-bug"></i> ${item ? 'Editar' : 'Nuevo'} — Microorganismo`;
    $a('cat-edit-id').value   = item ? item.id : '';
    $a('cat-edit-type').value = 'micro';
    $a('cat-nombre').value    = item ? item.nombre : '';
    document.querySelector(`input[name="cat-activo"][value="${item ? String(item.activo) : 'true'}"]`).checked = true;
    $a('cat-err').classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cat-item')).show();
}

const _origSaveCat = $a('btn-save-cat')?.onclick;
$a('btn-save-cat')?.addEventListener('click', () => {
    if ($a('cat-edit-type').value !== 'micro') return; // los otros tipos ya tienen su handler
    const nombre = $a('cat-nombre').value.trim();
    const activo = document.querySelector('input[name="cat-activo"]:checked')?.value === 'true';
    const errEl  = $a('cat-err');
    const editId = $a('cat-edit-id').value ? parseInt($a('cat-edit-id').value) : null;

    if (!nombre) { errEl.textContent = 'El nombre es obligatorio.'; errEl.classList.remove('d-none'); return; }

    const arr = _getMicroAdmin();
    const existe = arr.some(x => x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== editId);
    if (existe) { errEl.textContent = 'Ya existe un microorganismo con ese nombre.'; errEl.classList.remove('d-none'); return; }

    if (editId) {
        const idx = arr.findIndex(x => x.id === editId);
        if (idx !== -1) { arr[idx].nombre = nombre; arr[idx].activo = activo; }
    } else {
        arr.push({ id: Math.max(...arr.map(x => x.id)) + 1, nombre, sistema: false, activo });
    }
    _saveMicro(arr);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-cat-item')).hide();
    renderCatMicro();
    toast(editId ? 'Microorganismo actualizado.' : 'Microorganismo agregado.', 'success');
});

document.addEventListener('DOMContentLoaded', () => {
    seedDemo();
    checkAccess();
    renderAll();
});
