/* DatB Auth bridge: Supabase Auth is the identity/session authority. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;

    const authEmail = ci => `${String(ci).trim()}@auth.datb.invalid`;
    async function derivePassword(ci, pin) {
        const raw = `${String(ci).trim()}:${String(pin)}`;
        const bytes = new TextEncoder().encode(raw);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    window.sbLogin = async function (ci, pin) {
        const sb = getSb();
        if (!sb) return { user: null, error: 'Sin conexión a Supabase.' };

        const email = authEmail(ci);
        const password = await derivePassword(ci, pin);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { user: null, error: error.message || 'CI o PIN incorrecto.' };

        const usuarioId = data?.user?.user_metadata?.usuario_id;
        if (!usuarioId) return { user: null, error: 'La identidad Auth no está vinculada a un usuario DatB.' };

        const { data: user, error: dbError } = await sb
            .from('usuarios')
            .select('*')
            .eq('id', usuarioId)
            .maybeSingle();
        if (dbError) return { user: null, error: dbError.message };
        if (!user) return { user: null, error: 'No existe el perfil DatB asociado.' };
        if (!user.activo) return { user: null, error: 'Cuenta desactivada.' };
        if (!user.aprobado) return { user: null, error: 'La cuenta está pendiente de aprobación.' };

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

        const ci = String(perfil?.ci || '').trim();
        if (!ci) return { error: 'El CI es obligatorio.' };
        const email = authEmail(ci);
        const password = await derivePassword(ci, pin);

        const { data: authData, error: authError } = await sb.auth.signUp({
            email,
            password,
            options: { data: { usuario_id: perfil.id, ci } }
        });
        if (authError) return { error: authError.message };
        if (!authData?.user) return { error: 'Supabase Auth no creó la identidad.' };

        const p = { ...perfil, id: authData.user.id };
        if (typeof hashPin !== 'function') return { error: 'Componente de seguridad no disponible.' };
        const { data, error } = await sb.rpc('datb_register_user', {
            p_profile: p,
            p_pin_hash: hashPin(String(pin))
        });
        if (error) return { error: error.message || 'No se pudo registrar el perfil DatB.' };
        if (data?.error) return { error: data.error };
        return { error: null, user: data?.user || null, bootstrap: !!data?.bootstrap, authUser: authData.user };
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

    window.sbChangePin = async function (userId, newPin) {
        const sb = getSb();
        if (!sb) return { error: 'Sin conexión a Supabase.' };
        const user = await sb.auth.getUser();
        const ci = user?.data?.user?.user_metadata?.ci || '';
        if (!ci) return { error: 'No se pudo resolver el CI de la sesión.' };
        const password = await derivePassword(ci, newPin);
        const { error } = await sb.auth.updateUser({ password });
        if (error) return { error: error.message };
        if (typeof hashPin === 'function') {
            await sb.from('usuarios').update({ pin_hash: hashPin(String(newPin)) }).eq('id', userId);
        }
        return { error: null };
    };
})();
