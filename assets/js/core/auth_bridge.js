/* DatB Auth bridge: CI+PIN UX backed by Supabase Auth. */
(() => {
    const getSb = () => (typeof _client === 'function' ? _client() : null);
    window.__datbSupabaseClient = getSb;
    const AUTH_FUNCTION = 'datb-auth-final';
    async function invoke(action, body){
        const sb=getSb();
        if(!sb)return{data:null,error:{message:'Sin conexión a Supabase.'}};
        return sb.functions.invoke(AUTH_FUNCTION,{body:{action,...body}});
    }
    window.sbLogin=async function(ci,pin){
        const{data,error}=await invoke('login',{ci:String(ci).trim(),pin:String(pin)});
        if(error){let d=error.message||'Error de autenticación.';try{const c=error.context;if(c&&typeof c.json==='function'){const b=await c.json();if(b?.error)d=b.stage?`${b.error} [${b.stage}]`:b.error;}}catch(_){}return{user:null,error:d}}
        if(data?.error)return{user:null,error:data.stage?`${data.error} [${data.stage}]`:data.error};
        if(!data?.session||!data?.user)return{user:null,error:'El servidor no devolvió una sesión válida.'};
        const sb=getSb();const{error:se}=await sb.auth.setSession(data.session);if(se)return{user:null,error:se.message};
        window._currentUser=data.user;
        if(typeof sbInitAll==='function')try{await sbInitAll()}catch(e){console.error('sbInitAll after login:',e)}
        return{user:data.user,error:null};
    };
    window.sbRegister=async function(perfil,pin){
        const{data,error}=await invoke('register',{perfil,pin:String(pin)});
        if(error){let d=error.message||'No se pudo registrar la cuenta.';try{const c=error.context;if(c&&typeof c.json==='function'){const b=await c.json();if(b?.error)d=b.stage?`${b.error} [${b.stage}]`:b.error;}}catch(_){}return{error:d}}
        if(data?.error)return{error:data.stage?`${data.error} [${data.stage}]`:data.error};
        return{error:null,user:data?.user||null};
    };
    window.sbGetSession=async function(){
        const sb=getSb();if(!sb)return null;
        const{data:a,error}=await sb.auth.getUser();if(error||!a?.user){window._currentUser=null;return null}
        const uid=a.user.user_metadata?.usuario_id;if(!uid){window._currentUser=null;return null}
        const{data:u,error:e}=await sb.from('usuarios').select('*').eq('id',uid).maybeSingle();if(e||!u||!u.activo){window._currentUser=null;return null}
        window._currentUser=u;window._adminUser=Number(u.rol_sistema_id)===6?u:null;return u;
    };
    window.sbLogout=async function(){const sb=getSb();if(sb)await sb.auth.signOut();window._currentUser=null;window._adminUser=null;};
    window.sbChangePin=async function(userId,newPin){const{data,error}=await invoke('change-pin',{userId,newPin:String(newPin)});if(error)return{error:error.message||'No se pudo cambiar el PIN.'};if(data?.error)return{error:data.stage?`${data.error} [${data.stage}]`:data.error};return{error:null};};
})();
