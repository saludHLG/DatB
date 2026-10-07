/* =========================================================
   profile.js — perfil DatB
   Persistencia real en Supabase + actualización de Auth.
   ======================================================== */

function _perfilSetError(id, msg) {
    const el = $(id);
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('d-none', !msg);
}

function _perfilApplyUser(updated) {
    if (!updated) return;
    const users = window._store.usuarios || [];
    const idx = users.findIndex(u => u.id === updated.id);
    if (idx !== -1) users[idx] = { ...users[idx], ...updated };
    window._currentUser = { ...(window._currentUser || {}), ...updated };
    window.dispatchEvent(new CustomEvent('datb:user-updated', { detail: { user: updated } }));
}

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
        ? '<i class="bi bi-check-circle-fill"></i> Aprobado'
        : '<i class="bi bi-hourglass-split"></i> Pendiente aprobación';

    el.innerHTML = `
        <div class="perfil-page">
            <div class="perfil-layout">
                <section class="perfil-card perfil-card-account">
                    <div class="perfil-card-header"><i class="bi bi-person-badge"></i><span>Datos de la cuenta</span></div>

                    <div class="perfil-edit-form-app">
                        <div class="row g-3">
                            <div class="col-12 col-md-6">
                                <label class="perfil-field-label">Nombre de usuario <span class="required">*</span></label>
                                <input type="text" id="app-perfil-username" class="form-control"
                                       value="${user.nombre_usuario || ''}" maxlength="24"
                                       autocomplete="username" autocapitalize="none" spellcheck="false">
                                <div class="perfil-field-help">Para cambiarlo, confirme con su PIN actual.</div>
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="perfil-field-label">Carnet de identidad</label>
                                <input type="text" class="form-control ctrl-mono" value="${user.ci || ''}" readonly>
                            </div>

                            <div class="col-12 col-md-6">
                                <label class="perfil-field-label">Nombres <span class="required">*</span></label>
                                <input type="text" id="app-perfil-nombres" class="form-control" value="${user.nombres || ''}">
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="perfil-field-label">Apellidos <span class="required">*</span></label>
                                <input type="text" id="app-perfil-apellidos" class="form-control" value="${user.apellidos || ''}">
                            </div>

                            <div class="col-12 col-md-6">
                                <label class="perfil-field-label">Rol profesional</label>
                                <select id="app-perfil-rol-prof" class="form-select">${rpOpts}</select>
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="perfil-field-label">Registro profesional</label>
                                <input type="text" id="app-perfil-registro" class="form-control ctrl-mono"
                                       value="${user.registro_profesional || ''}" placeholder="RM-00000">
                            </div>

                            <div class="col-12 col-md-4">
                                <label class="perfil-field-label">Provincia</label>
                                <select id="app-perfil-prov" class="form-select">
                                    <option value="">— Seleccione —</option>${provOpts}
                                </select>
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="perfil-field-label">Municipio</label>
                                <select id="app-perfil-mun" class="form-select" ${!user.provincia_id ? 'disabled' : ''}>
                                    <option value="">— Seleccione —</option>${munOpts}
                                </select>
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="perfil-field-label">Centro de salud</label>
                                <select id="app-perfil-centro" class="form-select" ${!user.municipio_id ? 'disabled' : ''}>
                                    <option value="">— Seleccione —</option>${centroOpts}
                                    <option value="__otro__" ${!user.centro_salud_id ? 'selected' : ''}>Otro / no listado</option>
                                </select>
                            </div>

                            <div class="col-12">
                                <div class="perfil-account-meta">
                                    <span><i class="bi bi-shield-half"></i> ${rolSisLabel}</span>
                                    <span class="perfil-status ${user.aprobado ? 'ok' : 'pending'}">${estadoHtml}</span>
                                </div>
                            </div>
                        </div>

                        <div id="app-perfil-err" class="alert-custom alert-danger d-none mt-3"></div>

                        <div class="perfil-actions">
                            <button class="btn-primary-custom" id="btn-app-save-perfil">
                                <i class="bi bi-floppy"></i> Guardar datos
                            </button>
                        </div>
                    </div>
                </section>

                <section class="perfil-card perfil-card-security">
                    <div class="perfil-card-header"><i class="bi bi-key"></i><span>Seguridad de acceso</span></div>
                    <div class="perfil-edit-form-app">
                        <div class="perfil-security-note">
                            <i class="bi bi-info-circle"></i>
                            <span>El PIN actual también se utiliza para confirmar cambios del nombre de usuario.</span>
                        </div>
                        <div class="row g-3">
                            <div class="col-12 col-md-4">
                                <label class="perfil-field-label">PIN actual</label>
                                <input type="password" id="app-pin-actual" class="form-control perfil-pin"
                                       maxlength="4" inputmode="numeric" autocomplete="current-password" placeholder="••••">
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="perfil-field-label">PIN nuevo</label>
                                <input type="password" id="app-pin-nuevo" class="form-control perfil-pin"
                                       maxlength="4" inputmode="numeric" autocomplete="new-password" placeholder="••••">
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="perfil-field-label">Confirmar PIN</label>
                                <input type="password" id="app-pin-confirm" class="form-control perfil-pin"
                                       maxlength="4" inputmode="numeric" autocomplete="new-password" placeholder="••••">
                            </div>
                        </div>

                        <div id="app-pin-err" class="alert-custom alert-danger d-none mt-3"></div>

                        <div class="perfil-actions">
                            <button class="btn-primary-custom" id="btn-app-save-pin">
                                <i class="bi bi-key"></i> Cambiar PIN
                            </button>
                        </div>
                    </div>
                </section>

                <section class="perfil-card perfil-card-signature">
                    <div class="perfil-card-header"><i class="bi bi-pen"></i><span>Firma digital</span></div>
                    <div class="firma-wrap">
                        <p class="firma-hint">Dibuje su firma con el dedo o el ratón.</p>
                        <div class="canvas-container">
                            <canvas id="firma-canvas" width="800" height="300"></canvas>
                            <div class="canvas-placeholder" id="canvas-placeholder">
                                <i class="bi bi-vector-pen"></i>
                                <span>Trace su firma aquí</span>
                            </div>
                        </div>

                        <div class="firma-actions">
                            <button class="btn-firma-clear" id="btn-firma-clear">
                                <i class="bi bi-eraser"></i> Limpiar
                            </button>
                            <div class="firma-tools">
                                <label class="firma-tool-label">Grosor
                                    <input type="range" id="firma-grosor" min="1" max="8" value="2.5" step="0.5">
                                </label>
                                <label class="firma-tool-label">Color
                                    <input type="color" id="firma-color" value="#0b1e3d">
                                </label>
                            </div>
                            <button class="btn-firma-save" id="btn-firma-save">
                                <i class="bi bi-floppy"></i> Guardar
                            </button>
                        </div>

                        <div id="firma-saved-wrap" class="firma-saved-wrap d-none">
                            <span class="firma-saved-label">Guardada</span>
                            <img id="firma-saved-img" alt="Firma guardada" class="firma-saved-img">
                            <button class="btn-firma-clear" id="btn-firma-delete">
                                <i class="bi bi-trash"></i> Eliminar
                            </button>
                        </div>
                        <div id="firma-err" class="alert-custom alert-danger d-none mt-3"></div>
                    </div>
                </section>
            </div>
        </div>`;

    $('app-perfil-prov')?.addEventListener('change', function () {
        const selM = $('app-perfil-mun'), selC = $('app-perfil-centro');
        selM.innerHTML = '<option value="">— Seleccione —</option>';
        getGeoMuns()
            .filter(m => m.provincia_id === Number(this.value))
            .forEach(m => selM.appendChild(new Option(m.nombre, m.id)));
        selM.disabled = !this.value;
        selC.innerHTML = '<option value="">— Seleccione —</option><option value="__otro__">Otro / no listado</option>';
        selC.disabled = true;
    });

    $('app-perfil-mun')?.addEventListener('change', function () {
        const selC = $('app-perfil-centro');
        selC.innerHTML = '<option value="">— Seleccione —</option>';
        getGeoCentros()
            .filter(c => c.municipio_id === Number(this.value))
            .forEach(c => selC.appendChild(new Option(`${c.nombre}${c.tipo ? ` (${c.tipo})` : ''}`, c.id)));
        selC.appendChild(new Option('Otro / no listado', '__otro__'));
        selC.disabled = !this.value;
    });

    $('btn-app-save-perfil')?.addEventListener('click', async () => {
        const btn = $('btn-app-save-perfil');
        const errId = 'app-perfil-err';
        _perfilSetError(errId, '');

        const username = $('app-perfil-username').value.trim().toLowerCase();
        const oldUsername = String(user.nombre_usuario || '').trim().toLowerCase();
        const nom = $('app-perfil-nombres').value.trim();
        const ap = $('app-perfil-apellidos').value.trim();

        if (!/^[a-z0-9]{5,24}$/.test(username)) {
            _perfilSetError(errId, 'El nombre de usuario debe usar minúsculas y dígitos (5–24).');
            return;
        }
        if (!nom || !ap) {
            _perfilSetError(errId, 'Nombres y apellidos son obligatorios.');
            return;
        }

        const users = getUsers() || [];
        const idx = users.findIndex(u => u.id === user.id);
        if (idx === -1) {
            _perfilSetError(errId, 'No se encontró la cuenta en memoria.');
            return;
        }

        if (username !== oldUsername) {
            const pinActual = $('app-pin-actual').value;
            if (!/^\d{4}$/.test(pinActual)) {
                _perfilSetError(errId, 'Para cambiar el nombre de usuario debe introducir el PIN actual.');
                return;
            }

            if (typeof sbVerifyCredentials !== 'function') {
                _perfilSetError(errId, 'El servicio de autenticación no está disponible.');
                return;
            }

            const verified = await sbVerifyCredentials(oldUsername, pinActual);
            if (verified.error) {
                _perfilSetError(errId, verified.error);
                return;
            }
        }

        btn.disabled = true;
        const changes = {
            nombre_usuario: username,
            nombres: nom,
            apellidos: ap,
            rol_profesional_id: Number($('app-perfil-rol-prof').value),
            rol_profesional_nom: ROLES_PROFESIONALES[Number($('app-perfil-rol-prof').value)]?.nombre || '',
            registro_profesional: $('app-perfil-registro').value.trim() || null,
            provincia_id: Number($('app-perfil-prov').value) || null,
            municipio_id: Number($('app-perfil-mun').value) || null,
            centro_salud_id: null,
            centro_texto: null
        };

        const centroVal = $('app-perfil-centro').value;
        if (centroVal && centroVal !== '__otro__') {
            changes.centro_salud_id = Number(centroVal);
            changes.centro_texto = $('app-perfil-centro').selectedOptions[0]?.text?.replace(/ \(.*\)$/, '') || null;
        } else if (centroVal === '__otro__') {
            changes.centro_texto = 'Otro';
        }

        try {
            if (typeof sbUpdateRow !== 'function') throw new Error('Sin conexión con Supabase.');
            const saved = await sbUpdateRow('usuarios', user.id, changes);

            if (username !== oldUsername) {
                const pinActual = $('app-pin-actual').value;
                const authResult = await sbSetUsernameAuth(username, pinActual);
                if (authResult?.error) {
                    try { await sbUpdateRow('usuarios', user.id, { nombre_usuario: oldUsername }); } catch (_) {}
                    throw new Error(authResult.error);
                }
            }

            Object.assign(user, saved);
            Object.assign(user, changes);
            _perfilApplyUser({ ...user, ...saved, ...changes });
            _perfilSetError(errId, '');
            showToastApp('Datos actualizados correctamente.', 'success');
        } catch (e) {
            console.error('profile save:', e);
            _perfilSetError(errId, e.message || 'No se pudieron guardar los cambios.');
        } finally {
            btn.disabled = false;
        }
    });

    $('btn-app-save-pin')?.addEventListener('click', async () => {
        const btn = $('btn-app-save-pin');
        const errId = 'app-pin-err';
        _perfilSetError(errId, '');

        const oldPin = $('app-pin-actual').value;
        const newPin = $('app-pin-nuevo').value;
        const confirm = $('app-pin-confirm').value;

        if (!/^\d{4}$/.test(oldPin)) return _perfilSetError(errId, 'Ingrese su PIN actual (4 dígitos).');
        if (!/^\d{4}$/.test(newPin)) return _perfilSetError(errId, 'El PIN nuevo debe tener exactamente 4 dígitos.');
        if (newPin !== confirm) return _perfilSetError(errId, 'El PIN nuevo y la confirmación no coinciden.');

        btn.disabled = true;
        try {
            if (typeof sbChangePin !== 'function') throw new Error('El servicio de autenticación no está disponible.');
            const result = await sbChangePin(oldPin, newPin);
            if (result?.error) throw new Error(result.error);
            _perfilSetError(errId, '');
            $('app-pin-actual').value = '';
            $('app-pin-nuevo').value = '';
            $('app-pin-confirm').value = '';
            showToastApp('PIN cambiado correctamente.', 'success');
        } catch (e) {
            console.error('pin change:', e);
            _perfilSetError(errId, e.message || 'No se pudo cambiar el PIN.');
        } finally {
            btn.disabled = false;
        }
    });

    requestAnimationFrame(() => initFirmaCanvas(user));
}
