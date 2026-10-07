/* DatB Auth bridge: one canonical username + PIN flow. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;
    const AUTH_FUNCTION = 'datb-provision';
    const LOGIN_FUNCTION = AUTH_FUNCTION;
    const IDLE_LIMIT_MS = 30 * 60 * 1000;
    const LAST_ACTIVITY_KEY = 'datb:last_activity';
    let idleTimer = null;
    let lastActivityWrite = 0;

    const markActivity = () => {
        try {
            const now = Date.now();
            if (now - lastActivityWrite >= 15000) {
                localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
                lastActivityWrite = now;
            }
        } catch (_) {}
    };

    const clearActivity = () => {
        try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch (_) {}
    };

    const isIdleExpired = () => {
        try {
            const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
            return !!last && (Date.now() - last) >= IDLE_LIMIT_MS;
        } catch (_) {
            return false;
        }
    };

    const stopIdleWatchdog = () => {
        if (idleTimer) {
            clearInterval(idleTimer);
            idleTimer = null;
        }
        ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(evt =>
            window.removeEventListener(evt, markActivity)
        );
    };

    const startIdleWatchdog = () => {
        stopIdleWatchdog();
        markActivity();
        const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
        events.forEach(evt => window.addEventListener(evt, markActivity, { passive: true }));
        idleTimer = setInterval(async () => {
            if (!isIdleExpired()) return;
            stopIdleWatchdog();
            try {
                const sb = getSb();
                if (sb) await sb.auth.signOut();
            } finally {
                clearActivity();
                window._activeUserId = null;
                window._currentUser = null;
                window._adminUser = null;
                window.dispatchEvent(new CustomEvent('datb:idle-logout'));
            }
        }, 15000);
    };

    const invokeAuth = async (body, functionName = AUTH_FUNCTION) {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        const { data, error } = await sb.functions.invoke(functionName, { body });
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

    window.sbVerifyCredentials = async function (nombreUsuario, pin) {
        return invokeAuth({
            action: 'login',
            nombre_usuario: String(nombreUsuario).trim().toLowerCase(),
            pin: String(pin)
        }, LOGIN_FUNCTION);
    };

    const shaHex = async value => {
        const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
        return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const authPasswordFor = (username, pin) => shaHex('DatB:' + username + ':' + pin);

    window.sbSetUsernameAuth = async function (newUsername, currentPin) {
        const result = await invokeAuth({
            action: 'change_username',
            new_nombre_usuario: String(newUsername).trim().toLowerCase(),
            pin: String(currentPin)
        }, 'datb-profile');
        return result?.error ? { error: result.error } : { user: result?.user || null, error: null };
    };

    window.sbLogin = async function (nombreUsuario, pin) {
        const sb = getSb();
        const result = await invokeAuth({
            action: 'login',
            nombre_usuario: String(nombreUsuario).trim().toLowerCase(),
            pin: String(pin)
        }, LOGIN_FUNCTION);
        if (result.error) return { user: null, error: result.error };
        if (!result.session) return { user: null, error: 'Supabase Auth no devolvió una sesión.' };
        const { error: sessionError } = await sb.auth.setSession(result.session);
        if (sessionError) return { user: null, error: sessionError.message };
        const user = result.user;
        window._currentUser = user;
        window._adminUser = Number(user?.rol_sistema_id) === 6 ? user : null;
        startIdleWatchdog();
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
            startIdleWatchdog();
        }
        return { error: null, user: result.user || null, bootstrap: !!result.bootstrap };
    };

    window.sbGetSession = async function () {
        const sb = getSb();
        if (!sb) return null;
        if (isIdleExpired()) {
            stopIdleWatchdog();
            await sb.auth.signOut();
            clearActivity();
            window._activeUserId = null;
            window._currentUser = null;
            window._adminUser = null;
            return null;
        }
        const { data: authData, error } = await sb.auth.getUser();
        if (error || !authData?.user) { window._currentUser = null; return null; }
        const usuarioId = authData.user.user_metadata?.usuario_id;
        if (!usuarioId) { window._currentUser = null; return null; }
        const { data: user, error: dbError } = await sb.from('usuarios').select('*').eq('id', usuarioId).maybeSingle();
        if (dbError || !user || !user.activo || !user.aprobado) { window._currentUser = null; return null; }
        window._currentUser = user;
        window._activeUserId = user.id;
        window._adminUser = Number(user.rol_sistema_id) === 6 ? user : null;
        Promise.resolve(typeof sbStartRealtime === 'function' ? sbStartRealtime() : null)
            .catch(e => console.error('sbStartRealtime restore:', e));
        startIdleWatchdog();
        return user;
    };

    window.sbLogout = async function () {
        stopIdleWatchdog();
        const sb = getSb();
        if (typeof sbStopRealtime === 'function') await sbStopRealtime();
        if (sb) await sb.auth.signOut();
        window._activeUserId = null;
        window._currentUser = null;
        window._adminUser = null;
        clearActivity();
    };

    window.sbChangePin = async function (oldPin, newPin) {
        const result = await invokeAuth({
            action: 'change_pin',
            old_pin: String(oldPin),
            new_pin: String(newPin)
        }, 'datb-profile');
        return result?.error ? { error: result.error } : { user: result?.user || null, error: null };
    };
})();
