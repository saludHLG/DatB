/* =========================================================
   profile.js — perfil del usuario y cambio de PIN
   Requiere: $(), getGeoProvs(), getGeoMuns(), getGeoCentros(),
             ROLES_PROFESIONALES, ROLES_SISTEMA, getUsers(),
             saveUsers(), hashPin(), sbUpdateRow(), showToastApp(),
             initFirmaCanvas()
   ======================================================== */

function renderPerfil(user, el) {
    const provOpts = getGeoProvs()
        .map(p => `<option value="${p.id}" ${p.id === user.provincia_id ? 'selected' : ''}>${p.nombre}</option>`)
        .join('');
    const munOpts = getGeoMuns()
        .filter(m => m.provincia_id === user.provincia_id)
        .map(m => `<option value="${m.id}" ${m.id === user.municipio_id ? 'selected' : ''}>${m.nombre}</option>`)
        .join('');
    const centroOpts = getGeoCentros()
        .filter(c => c.municipio_id === user.municipio_id)
        .map(c => `<option value="${c.id}" ${c.id === user.centro_salud_id ? 'selected' : ''}>${c.nombre}${c.tipo ? ` (${c.tipo})` : ''}</option>`)
        .join('');
    const rpOpts = Object.entries(ROLES_PROFESIONALES)
        .map(([id, r]) => `<option value="${id}" ${Number(id) === user.rol_profesional_id ? 'selected' : ''}>${r.nombre}</option>`)
        .join('');

    const rolSisLabel = ROLES_SISTEMA[user.rol_sistema_id] || '—';
    const estadoHtml = user.aprobado
        ? '<i class="bi bi-check-circle-fill" style="color:var(--success)"></i> Aprobado'
        : '<i class="bi bi-hourglass-split" style="color:var(--warning)"></i> Pendiente aprobación';

    el.innerHTML = `
        <div class="modulo-header">
            <h2 class="modulo-title">Mi perfil</h2>
            <p class="modulo-sub">Edite sus datos personales y cambie su PIN de acceso.</p>
        </div>
        <div class="perfil-layout">
            <div class="perfil-card">
                <div class="perfil-card-header"><i class="bi bi-person-badge"></i> Datos de la cuenta</div>
                <div class="perfil-edit-form-app" style="padding:1.1rem">
                    <div class="perfil-data-row"><span class="perfil-data-label">Carnet identidad</span><span class="perfil-data-val mono">${user.ci}</span></div>
                    <div class="perfil-data-row"><span class="perfil-data-label">Rol de sistema</span><span class="perfil-data-val">${rolSisLabel}</span></div>
                    <div class="perfil-data-row" style="margin-bottom:.85rem"><span class="perfil-data-label">Estado</span><span class="perfil-data-val">${estadoHtml}</span></div>
                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-6"><label class="perfil-field-label">Nombres <span style="color:var(--danger)">*</span></label><input type="text" id="app-perfil-nombres" class="form-control form-control-sm" value="${user.nombres || ''}"></div>
                        <div class="col-12 col-sm-6"><label class="perfil-field-label">Apellidos <span style="color:var(--danger)">*</span></label><input type="text" id="app-perfil-apellidos" class="form-control form-control-sm" value="${user.apellidos || ''}"></div>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-6"><label class="perfil-field-label">Rol profesional</label><select id="app-perfil-rol-prof" class="form-select form-select-sm">${rpOpts}</select></div>
                        <div class="col-12 col-sm-6"><label class="perfil-field-label">Registro profesional</label><input type="text" id="app-perfil-registro" class="form-control form-control-sm" style="font-family:var(--font-mono)" value="${user.registro_profesional || ''}" placeholder="RM-00000"></div>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-4"><label class="perfil-field-label">Provincia</label><select id="app-perfil-prov" class="form-select form-select-sm"><option value="">— Seleccione —</option>${provOpts}</select></div>
                        <div class="col-12 col-sm-4"><label class="perfil-field-label">Municipio</label><select id="app-perfil-mun" class="form-select form-select-sm" ${!user.provincia_id ? 'disabled' : ''}><option value="">— Seleccione —</option>${munOpts}</select></div>
                        <div class="col-12 col-sm-4"><label class="perfil-field-label">Centro de salud</label><select id="app-perfil-centro" class="form-select form-select-sm" ${!user.municipio_id ? 'disabled' : ''}><option value="">— Seleccione —</option>${centroOpts}<option value="__otro__" ${!user.centro_salud_id ? 'selected' : ''}>Otro / no listado</option></select></div>
                    </div>
                    <div id="app-perfil-err" class="alert-custom alert-danger mt-2 d-none"></div>
                    <div style="display:flex;justify-content:flex-end;margin-top:.75rem"><button class="btn-primary-custom" id="btn-app-save-perfil" style="font-size:.85rem;padding:.5rem 1.1rem"><i class="bi bi-floppy"></i> Guardar datos</button></div>
                </div>
                <div style="border-top:1.5px solid var(--silver-pale);margin:0 1.1rem;padding:1rem 0">
                    <p style="font-size:.8rem;font-weight:700;color:var(--navy);margin-bottom:.75rem;text-transform:uppercase;letter-spacing:.06em"><i class="bi bi-key"></i> Cambiar PIN de acceso</p>
                    <div class="row g-2 mb-2">
                        <div class="col-12 col-sm-4"><label class="perfil-field-label">PIN actual</label><input type="password" id="app-pin-actual" class="form-control form-control-sm" style="font-family:var(--font-mono);letter-spacing:.25em" maxlength="4" inputmode="numeric" placeholder="••••"></div>
                        <div class="col-12 col-sm-4"><label class="perfil-field-label">PIN nuevo</label><input type="password" id="app-pin-nuevo" class="form-control form-control-sm" style="font-family:var(--font-mono);letter-spacing:.25em" maxlength="4" inputmode="numeric" placeholder="••••"></div>
                        <div class="col-12 col-sm-4"><label class="perfil-field-label">Confirmar PIN</label><input type="password" id="app-pin-confirm" class="form-control form-control-sm" style="font-family:var(--font-mono);letter-spacing:.25em" maxlength="4" inputmode="numeric" placeholder="••••"></div>
                    </div>
                    <div id="app-pin-err" class="alert-custom alert-danger mt-2 d-none"></div>
                    <div style="display:flex;justify-content:flex-end;margin-top:.75rem"><button class="btn-primary-custom" id="btn-app-save-pin" style="font-size:.85rem;padding:.5rem 1.1rem"><i class="bi bi-key"></i> Cambiar PIN</button></div>
                </div>
            </div>
            <div class="perfil-card">
                <div class="perfil-card-header"><i class="bi bi-pen"></i> Firma digital</div>
                <div class="firma-wrap">
                    <p class="firma-hint">Dibuje su firma con el ratón o con el dedo.</p>
                    <div class="canvas-container"><canvas id="firma-canvas" width="440" height="180"></canvas><div class="canvas-placeholder" id="canvas-placeholder"><i class="bi bi-vector-pen"></i><span>Trace su firma aquí</span></div></div>
                    <div class="firma-actions">
                        <button class="btn-firma-clear" id="btn-firma-clear"><i class="bi bi-eraser"></i> Limpiar</button>
                        <div class="firma-tools"><label class="firma-tool-label">Grosor <input type="range" id="firma-grosor" min="1" max="6" value="2" step="0.5"></label><label class="firma-tool-label">Color <input type="color" id="firma-color" value="#0b1e3d"></label></div>
                        <button class="btn-firma-save" id="btn-firma-save"><i class="bi bi-floppy"></i> Guardar</button>
                    </div>
                    <div id="firma-saved-wrap" class="firma-saved-wrap d-none"><span class="firma-saved-label">Guardada:</span><img id="firma-saved-img" alt="Firma guardada" class="firma-saved-img"><button class="btn-firma-clear" id="btn-firma-delete"><i class="bi bi-trash"></i> Eliminar</button></div>
                </div>
            </div>
        </div>`;

    $('app-perfil-prov')?.addEventListener('change', function () {
        const selM = $('app-perfil-mun'), selC = $('app-perfil-centro');
        selM.innerHTML = '<option value="">— Seleccione —</option>';
        getGeoMuns().filter(m => m.provincia_id === Number(this.value)).forEach(m => selM.appendChild(new Option(m.nombre, m.id)));
        selM.disabled = !this.value;
        selC.innerHTML = '<option value="">— Seleccione —</option><option value="__otro__" selected>Otro / no listado</option>';
        selC.disabled = true;
    });

    $('app-perfil-mun')?.addEventListener('change', function () {
        const selC = $('app-perfil-centro');
        selC.innerHTML = '<option value="">— Seleccione —</option>';
        getGeoCentros().filter(c => c.municipio_id === Number(this.value)).forEach(c => selC.appendChild(new Option(`${c.nombre}${c.tipo ? ` (${c.tipo})` : ''}`, c.id)));
        selC.appendChild(new Option('Otro / no listado', '__otro__'));
        selC.disabled = !this.value;
    });

    $('btn-app-save-perfil')?.addEventListener('click', () => {
        const errEl = $('app-perfil-err');
        errEl.classList.add('d-none');
        const nom = $('app-perfil-nombres').value.trim();
        const ap = $('app-perfil-apellidos').value.trim();
        if (!nom || !ap) {
            errEl.textContent = 'Nombres y apellidos son obligatorios.';
            errEl.classList.remove('d-none');
            return;
        }
        const users = getUsers(), idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) return;

        const rpId = Number($('app-perfil-rol-prof').value);
        const centroVal = $('app-perfil-centro').value;
        users[idx].nombres = nom;
        users[idx].apellidos = ap;
        users[idx].rol_profesional_id = rpId;
        users[idx].rol_profesional_nom = ROLES_PROFESIONALES[rpId]?.nombre || '';
        users[idx].registro_profesional = $('app-perfil-registro').value.trim() || null;
        users[idx].provincia_id = Number($('app-perfil-prov').value) || null;
        users[idx].municipio_id = Number($('app-perfil-mun').value) || null;
        if (centroVal && centroVal !== '__otro__') {
            users[idx].centro_salud_id = Number(centroVal);
            users[idx].centro_texto = $('app-perfil-centro').selectedOptions[0]?.text?.replace(/ \(.*\)$/, '') || null;
        } else {
            users[idx].centro_salud_id = null;
            users[idx].centro_texto = null;
        }
        saveUsers(users);
        if (typeof sbUpdateRow === 'function') {
            sbUpdateRow('usuarios', user.id, {
                nombres: nom,
                apellidos: ap,
                rol_profesional_id: rpId,
                rol_profesional_nom: ROLES_PROFESIONALES[rpId]?.nombre || '',
                registro_profesional: users[idx].registro_profesional,
                provincia_id: users[idx].provincia_id,
                municipio_id: users[idx].municipio_id,
                centro_salud_id: users[idx].centro_salud_id,
                centro_texto: users[idx].centro_texto
            }).catch(e => console.error('profile save:', e));
        }

        $('sp-name').textContent = `${nom} ${ap}`;
        $('topbar-name').textContent = `${nom} ${ap}`;
        const initials = (nom[0] + ap[0]).toUpperCase();
        $('sp-avatar').textContent = initials;
        $('topbar-avatar').textContent = initials;
        showToastApp('Datos actualizados correctamente.', 'success');
    });

    $('btn-app-save-pin')?.addEventListener('click', () => {
        const errEl = $('app-pin-err');
        errEl.classList.add('d-none');
        const actual = $('app-pin-actual').value;
        const nuevo = $('app-pin-nuevo').value;
        const confirm = $('app-pin-confirm').value;

        if (!/^\d{4}$/.test(actual)) { errEl.textContent = 'Ingrese su PIN actual (4 dígitos).'; errEl.classList.remove('d-none'); return; }
        if (!/^\d{4}$/.test(nuevo)) { errEl.textContent = 'El PIN nuevo debe tener exactamente 4 dígitos numéricos.'; errEl.classList.remove('d-none'); return; }
        if (nuevo !== confirm) { errEl.textContent = 'El PIN nuevo y la confirmación no coinciden.'; errEl.classList.remove('d-none'); return; }

        const users = getUsers(), idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) return;
        if (users[idx].pin_hash !== hashPin(actual)) {
            errEl.textContent = 'El PIN actual es incorrecto.';
            errEl.classList.remove('d-none');
            return;
        }
        users[idx].pin_hash = hashPin(nuevo);
        saveUsers(users);
        $('app-pin-actual').value = '';
        $('app-pin-nuevo').value = '';
        $('app-pin-confirm').value = '';
        showToastApp('PIN cambiado correctamente.', 'success');
    });

    requestAnimationFrame(() => initFirmaCanvas(user));
}
