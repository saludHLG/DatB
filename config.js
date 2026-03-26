/* ================================================================
   config.js — Credenciales de Supabase para DatB
   ================================================================
   ⚠  La ANON KEY es pública por diseño de Supabase.
      Las políticas RLS del esquema controlan el acceso a los datos.
      NUNCA incluya la SERVICE_ROLE key en código cliente.

   Si SUPABASE_URL no se modifica (contiene 'TU_PROYECTO'),
   la aplicación funciona en modo prototipo (localStorage).
   ================================================================ */

const SUPABASE_URL  = 'https://TU_PROYECTO.supabase.co';  // ← reemplazar
const SUPABASE_ANON = 'TU_ANON_PUBLIC_KEY';               // ← reemplazar
