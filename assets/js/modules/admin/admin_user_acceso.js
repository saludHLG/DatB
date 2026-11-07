/* Restablecimiento de PIN y borrado de firma por parte del administrador.
   El borrado de firma se hace en el cliente (RLS lo permite al admin).
   El reseteo de PIN pasa por la Edge Function datb-profile, que verifica
   el rol y usa la Admin API: la contrasena real vive en auth.users. */

(function () {
    let _targetUser = null;

    /* Lee un grupo de 4 casillas: 'rp-' 1..4 (nuevo) o 5..8 (repetir). */
    function leerPin(desde) {
        let s = '';
        for (let i = desde; i < desde + 4; i++) {
            s += document.getElementById('rp-' + i)?.value || '';
        }
        return s;
    }

    function limpiarPines() {
        for (let i = 1; i <= 8; i++) {
            const el = document.getElementById('rp-' + i);
            if (el) el.value = '';
        }
    }

    function showErr(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg || '';
        el.classList.toggle('d-none', !msg);
    }

    /* ── Estado de la firma ─────────────────────────────────── */
    function pintarFirma(user) {
        const img = document.getElementById('firma-preview');
        const estado = document.getElementById('firma-estado');
        const btn = document.getElementById('btn-del-firma');
        const firma = user?.firma_perfil || null;

        if (img) {
            if (firma) {
                img.src = firma;
                img.hidden = false;
            } else {
                img.removeAttribute('src');
                img.hidden = true;
            }
        }
        if (estado) {
            estado.textContent = firma
                ? 'Registrada. Puede borrarla para que la vuelva a crear.'
                : 'Sin firma registrada.';
        }
        if (btn) btn.disabled = !firma;
    }

    window.adminRenderAccesoFirma = function (user) {
        _targetUser = user;
        pintarFirma(user);
        showErr('rp-err', '');
        limpiarPines();
    };

    /* ── Borrar firma ───────────────────────────────────────── */
    async function borrarFirma() {
        if (!_targetUser) return;
        if (!confirm('¿Borrar la firma digital de este usuario? Tendrá que crearla de nuevo.')) return;

        try {
            if (typeof sbUpdateRow !== 'function') throw new Error('sin capa de datos');
            await sbUpdateRow('usuarios', _targetUser.id, { firma_perfil: null });
            _targetUser.firma_perfil = null;

            const store = window._store?.usuarios || [];
            const idx = store.findIndex(u => u.id === _targetUser.id);
            if (idx !== -1) store[idx] = { ...store[idx], firma_perfil: null };
            if (window._store?.firmas) delete window._store.firmas[`sr_firma_${_targetUser.id}`];

            pintarFirma(_targetUser);
            toast('Firma digital eliminada.', 'success');
        } catch (e) {
            console.error('borrar firma', e);
            toast('No se pudo borrar la firma.', 'error');
        }
    }

    /* ── Restablecer PIN ────────────────────────────────────── */
    function abrirResetPin() {
        if (!_targetUser) return;
        const el = document.getElementById('reset-pin-target');
        if (el) {
            el.textContent =
                `Usuario: ${_targetUser.nombres} ${_targetUser.apellidos}` +
                ` (${_targetUser.nombre_usuario || _targetUser.ci})`;
        }
        limpiarPines();
        showErr('rp-err', '');
        bootstrap.Offcanvas
            .getOrCreateInstance(document.getElementById('modal-reset-pin'))
            .show();
        setTimeout(() => document.getElementById('rp-1')?.focus(), 300);
    }

    async function confirmarResetPin() {
        if (!_targetUser) return;

        const pin1 = leerPin(1);
        const pin2 = leerPin(5);

        if (!/^\d{4}$/.test(pin1)) return showErr('rp-err', 'El PIN debe tener 4 dígitos.');
        if (pin1 !== pin2) return showErr('rp-err', 'Los PIN no coinciden.');
        if (_targetUser.id === window._currentUser?.id) {
            return showErr('rp-err', 'Use «Mi perfil» para cambiar su propio PIN.');
        }

        const btn = document.getElementById('btn-do-reset-pin');
        if (btn) btn.disabled = true;
        showErr('rp-err', '');

        try {
            const sb = typeof _client === 'function' ? _client() : null;
            if (!sb) throw new Error('sin conexión');

            const { data, error } = await sb.functions.invoke('datb-profile', {
                body: { action: 'admin_reset_pin', usuario_id: _targetUser.id, new_pin: pin1 },
            });

            if (error) {
                let detalle = error.message || 'No se pudo restablecer el PIN.';
                try {
                    const ctx = error.context;
                    if (ctx && typeof ctx.json === 'function') {
                        const b = await ctx.json();
                        if (b?.error) detalle = b.error;
                    }
                } catch (_) {}
                throw new Error(detalle);
            }
            if (data?.error) throw new Error(data.error);

            bootstrap.Offcanvas
                .getInstance(document.getElementById('modal-reset-pin'))
                ?.hide();
            toast('PIN restablecido. Comuníqueselo al usuario.', 'success');
        } catch (e) {
            console.error('reset pin', e);
            showErr('rp-err', String(e?.message || 'No se pudo restablecer el PIN.'));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /* Avance automatico entre las 8 casillas. */
    function wirePinInputs() {
        for (let i = 1; i <= 8; i++) {
            const el = document.getElementById('rp-' + i);
            if (!el || el.dataset.wired) continue;
            el.dataset.wired = '1';
            el.addEventListener('input', () => {
                el.value = el.value.replace(/\D/g, '').slice(-1);
                if (el.value && i < 8) document.getElementById('rp-' + (i + 1))?.focus();
            });
            el.addEventListener('keydown', e => {
                if (e.key === 'Backspace' && !el.value && i > 1) {
                    document.getElementById('rp-' + (i - 1))?.focus();
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('btn-reset-pin')?.addEventListener('click', abrirResetPin);
        document.getElementById('btn-del-firma')?.addEventListener('click', borrarFirma);
        document.getElementById('btn-do-reset-pin')?.addEventListener('click', confirmarResetPin);
        wirePinInputs();
    });
})();
