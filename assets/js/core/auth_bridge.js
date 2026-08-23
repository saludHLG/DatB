/* DatB Auth bridge: Supabase Auth handles login/session directly. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;
    const PROVISION_FUNCTION = 'datb-provision';
    const authEmail = ci => `${String(ci).trim()}@saludhlg.github.io`;
    const authPassword = async (ci, pin) => {
        const text = `DatB:${String(ci).trim()}:${String(pin)}`;
        const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(data)].map(b => b.toString(16).padStart(2, '0')).join('');
    };

    window.sbLogin = async function (ci, pin) {
        const sb = getSb();
        if (!sb) return { user: null, error: 'Sin conexión a Supabase.' };
        const email = authEmail(ci);
        const password = await authPassword(ci, pin);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { user: null, error: error.message || 'CI o PIN incorrecto.' };
        const authUser = data?.user;
        if (!authUser) return { user: null, error: 'Supabase Auth no devolvió usuario.' };
        const usuarioId = authUser.user_metadata?.usuario_id;
        if (!usuarioId) return { user: null, error: 'La cuenta Auth no está vinculada a DatB.' };
        const { data: user, error: dbError } = await sb.from('usuarios').select('*').eq('id', usuarioId).maybeSingle();
        if (dbError) return { user: null, error: dbError.message };
        if (!user) return { user: null, error: 'No existe el perfil DatB para esta cuenta.' };
        if (!user.activo) { await sb.auth.signOut(); return { user: null, error: 'Cuenta desactivada.' }; }
        if (!user.aprobado) { await sb.auth.signOut(); return { user: null, error: 'La cuenta está pendiente de aprobación.' }; }
        window._currentUser = user;
        window._adminUser = Number(user.rol_sistema_id) === 6 ? user : null;
        if (typeof sbInitAll === 'function') {
            try { await sbInitAll(); } catch (e) { console.error('sbInitAll after login:', e); }
        }
        return { user, error: null };
    };

    window.sbRegister = async function (perfil, pin) {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        const { data, error } = await sb.functions.invoke(PROVISION_FUNCTION, {
            body: { perfil, pin: String(pin) }
        });
        if (error) {
            let detail = error.message || 'No se pudo registrar la cuenta.';
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
        if (data?.session) await sb.auth.setSession(data.session);
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
        if (dbError || !user || !user.activo || !user.aprobado) { window._currentUser = null; return null; }
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

    window.sbChangePin = async function (_userId, _newPin) {
        return { error: 'El cambio de PIN se habilitará después de cerrar el flujo de autenticación inicial.' };
    };
})();
