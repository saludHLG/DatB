/* DatB Auth bridge: CI+PIN UX backed by Supabase Auth. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;
    const AUTH_FUNCTION = 'datb-auth-v2';

    window.sbLogin = async function (ci, pin) {
        const sb = getSb();
        if (!sb) return { user: null, error: 'Sin conexión a Supabase.' };
        const { data, error } = await sb.functions.invoke(AUTH_FUNCTION, {
            body: { action: 'login', ci: String(ci).trim(), pin: String(pin) }
        });
        if (error) {
            let detail = error.message || 'Error de autenticación.';
            try {
                const ctx = error.context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    if (body?.error) detail = body.stage ? `${body.error} [${body.stage}]` : body.error;
                }
            } catch (_) {}
            return { user: null, error: detail };
        }
        if (data?.error) return { user: null, error: data.stage ? `${data.error} [${data.stage}]` : data.error };
        if (!data?.session || !data?.user) return { user: null, error: 'El servidor no devolvió una sesión válida.' };

        const { error: sessionError } = await sb.auth.setSession(data.session);
        if (sessionError) return { user: null, error: sessionError.message };

        const idx = _store.usuarios.findIndex(u => u.id === data.user.id);
        if (idx !== -1) _store.usuarios[idx] = data.user; else _store.usuarios.push(data.user);
        window._currentUser = data.user;
        if (typeof sbInitAll === 'function') {
            try { await sbInitAll(); } catch (e) { console.error('sbInitAll after login:', e); }
        }
        return { user: data.user, error: null };
    };

    window.sbRegister = async function (perfil, pin) {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        const { data, error } = await sb.functions.invoke(AUTH_FUNCTION, {
            body: { action: 'register', perfil, pin: String(pin) }
        });
        if (error) return { error: error.message || 'No se pudo registrar la cuenta.' };
        if (data?.error) return { error: data.error };
        if (data?.user) _store.usuarios.push(data.user);
        return { error: null };
    };

    window.sbGetSession = async function () {
        const sb = getSb();
        if (!sb) return null;
        const { data: authData, error } = await sb.auth.getUser();
        if (error || !authData?.user) { window._currentUser = null; return null; }
        const usuarioId = authData.user.user_metadata?.usuario_id;
        if (!usuarioId) { window._currentUser = null; return null; }
        let user = _store.usuarios.find(u => u.id === usuarioId && u.activo);
        if (!user) {
            const { data, error: dbError } = await sb.from('usuarios').select('*').eq('id', usuarioId).maybeSingle();
            if (dbError || !data || !data.activo) { window._currentUser = null; return null; }
            user = data;
            const idx = _store.usuarios.findIndex(u => u.id === user.id);
            if (idx !== -1) _store.usuarios[idx] = user; else _store.usuarios.push(user);
        }
        window._currentUser = user;
        window._adminUser = Number(user.rol_sistema_id) === 6 ? user : null;
        return user;
    };

    window.sbLogout = async function () {
        const sb = getSb();
        if (sb) {
            const { error } = await sb.auth.signOut();
            if (error) console.error('Supabase signOut:', error.message);
        }
        window._currentUser = null;
        window._adminUser = null;
    };

    window.sbChangePin = async function (userId, newPin) {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        const { data, error } = await sb.functions.invoke(AUTH_FUNCTION, { body: { action: 'change-pin', userId, newPin: String(newPin) } });
        if (error) return { error: error.message || 'No se pudo cambiar el PIN.' };
        if (data?.error) return { error: data.error };
        const idx = _store.usuarios.findIndex(u => u.id === userId);
        if (idx !== -1 && typeof hashPin === 'function') _store.usuarios[idx].pin_hash = hashPin(String(newPin));
        return { error: null };
    };
})();
