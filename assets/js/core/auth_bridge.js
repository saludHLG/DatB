/* DatB Auth bridge: one canonical username + PIN flow. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;
    const AUTH_FUNCTION = 'datb-provision';

    const invokeAuth = async (body) => {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        const { data, error } = await sb.functions.invoke(AUTH_FUNCTION, { body });
        if (error) {
            let detail = error.message || 'No se pudo completar la autenticación.';
            try {
                const ctx = error.context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    if (body?.error) detail = body.stage ? `${body.error} [${body.stage}]` : body.error;
                }
            } catch (_) {}
            return { error: detail };
        }
        if (data?.error) return { error: data.stage ? `${data.error} [${data.stage}]` : data.error };
        return data || {};
    };

    window.sbLogin = async function (nombreUsuario, pin) {
        const sb = getSb();
        const result = await invokeAuth({
            action: 'login',
            nombre_usuario: String(nombreUsuario).trim().toLowerCase(),
            pin: String(pin)
        });
        if (result.error) return { user: null, error: result.error };
        if (!result.session) return { user: null, error: 'Supabase Auth no devolvió una sesión.' };
        const { error: sessionError } = await sb.auth.setSession(result.session);
        if (sessionError) return { user: null, error: sessionError.message };
        const user = result.user;
        window._currentUser = user;
        window._adminUser = Number(user?.rol_sistema_id) === 6 ? user : null;
        if (typeof sbInitAll === 'function') {
            try { await sbInitAll(); } catch (e) { console.error('sbInitAll after login:', e); }
        }
        if (typeof sbStartRealtime === 'function') await sbStartRealtime();
        return { user, error: null };
    };

    window.sbRegister = async function (perfil, pin) {
        const result = await invokeAuth({ action: 'register', perfil, pin: String(pin) });
        if (result.error) return { error: result.error };
        const sb = getSb();
        if (result.session && sb) {
            const { error } = await sb.auth.setSession(result.session);
            if (error) return { error: error.message };
            if (typeof sbStartRealtime === 'function') await sbStartRealtime();
        }
        return { error: null, user: result.user || null, bootstrap: !!result.bootstrap };
    };

    window.sbGetSession = async function () {
        const sb = getSb();
        if (!sb) return null;
        const { data: authData, error } = await sb.auth.getUser();
        if (error || !authData?.user) { window._currentUser = null; return null; }
        const usuarioId = authData.user.user_metadata?.usuario_id;
        if (!usuarioId) { window._currentUser = null; return null; }
        const { data: user, error: dbError } = await sb.from('usuarios').select('*').eq('id', usuarioId).maybeSingle();
        if (dbError || !user || !user.activo || !user.aprobado) { window._currentUser = null; return null; }
        window._currentUser = user;
        window._activeUserId = user.id;
        window._adminUser = Number(user.rol_sistema_id) === 6 ? user : null;
        if (typeof sbStartRealtime === 'function') await sbStartRealtime();
        return user;
    };

    window.sbLogout = async function () {
        const sb = getSb();
        if (typeof sbStopRealtime === 'function') await sbStopRealtime();
        if (sb) await sb.auth.signOut();
        window._activeUserId = null;
        window._currentUser = null;
        window._adminUser = null;
    };

    window.sbChangePin = async function () {
        return { error: 'El cambio de PIN se habilitará en el módulo de seguridad de cuenta.' };
    };
})();
