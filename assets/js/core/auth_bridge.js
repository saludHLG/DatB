/* DatB Auth bridge: CI+PIN UX backed by Supabase Auth. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;
    const AUTH_FUNCTION = 'datb-core';
    async function invoke(action, body) {
        const sb = getSb();
        if (!sb) return { data: null, error: { message: 'Sin conexión a Supabase.' } };
        return sb.functions.invoke(AUTH_FUNCTION, { body: { action, ...body } });
    }
    window.sbLogin = async function (ci, pin) {
        const { data, error } = await invoke('login', { ci: String(ci).trim(), pin: String(pin) });
        if (error) return { user: null, error: error.message || 'Error de autenticación.' };
        if (data?.error) return { user: null, error: data.stage ? `${data.error} [${data.stage}]` : data.error };
        if (!data?.session || !data?.user) return { user: null, error: 'El servidor no devolvió una sesión válida.' };
        const sb = getSb();
        const { error: sessionError } = await sb.auth.setSession(data.session);
        if (sessionError) return { user: null, error: sessionError.message };
        window._currentUser = data.user;
        if (typeof sbInitAll === 'function') {
            try { await sbInitAll(); } catch (e) { console.error('sbInitAll after login:', e); }
        }
        return { user: data.user, error: null };
    };
    window.sbRegister = async function (perfil, pin) {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        if (typeof hashPin !== 'function') return { error: 'Componente de seguridad no disponible.' };
        const { data, error } = await sb.rpc('datb_register_user', {
            p_profile: perfil,
            p_pin_hash: hashPin(String(pin))
        });
        if (error) return { error: error.message || 'No se pudo registrar la cuenta.' };
        if (data?.error) return { error: data.error };
        return { error: null, user: data?.user || null, bootstrap: !!data?.bootstrap };
    };
    window.sbGetSession = async function () {
        const sb = getSb();
        if (!sb) return null;
        const { data: authData, error } = await sb.auth.getUser();
        if (error || !authData?.user) { window._currentUser = null; return null; }
        const usuarioId = authData.user.user_metadata?.usuario_id;
        if (!usuarioId) { window._currentUser = null; return null; }
        const { data: user, error: dbError } = await sb.from('usuarios').select('*').eq('id', usuarioId).maybeSingle();
        if (dbError || !user || !user.activo) { window._currentUser = null; return null; }
        window._currentUser = user;
        window._adminUser = Number(user.rol_sistema_id) === 6 ? user : null;
        return user;
    };
    window.sbLogout = async function () {
        const sb = getSb();
        if (sb) await sb.auth.signOut();
        window._currentUser = null;
        window._adminUser = null;
    };
    window.sbChangePin = async function (userId, newPin) {
        const { data, error } = await invoke('change-pin', { userId, newPin: String(newPin) });
        if (error) return { error: error.message || 'No se pudo cambiar el PIN.' };
        if (data?.error) return { error: data.stage ? `${data.error} [${data.stage}]` : data.error };
        return { error: null };
    };
})();
