/* ================================================================
   config.js — Configuración del cliente Supabase DatB (runtime legacy)
   ================================================================
   IMPORTANTE: este archivo se GENERA en el build.
   En el repositorio el valor va vacío a propósito; `vite.config.js`
   inyecta la URL y la clave reales desde variables de entorno
   (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), que en GitHub Pages
   vienen del secret VITE_SUPABASE_ANON_KEY.

   Motivo: PostgREST de este proyecto RECHAZA las claves de formato
   nuevo (`sb_publishable_`) con HTTP 401. La clave válida es la anon
   en formato JWT. Al mantenerla fuera del repo se evita además que
   vuelva a quedar una clave incorrecta hardcodeada.

   La clave anon es pública por diseño: la autorización la hace RLS.
   NUNCA colocar aquí la service_role key.
   ================================================================ */

const SUPABASE_URL = '%%VITE_SUPABASE_URL%%';
const SUPABASE_ANON = '%%VITE_SUPABASE_ANON_KEY%%';
