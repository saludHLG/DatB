import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import App from './App.jsx'
import './react.css'
import '../assets/css/base/style.css'
import '../assets/css/base/modules.css'
import '../assets/css/epidemiologia/epidemiologia.css'
import '../assets/css/admin/admin.css'

// Configuración Supabase. Se puede sobreescribir con variables de entorno
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY); si no, se usan estos valores.
// NOTA: PostgREST de este proyecto rechaza las claves `sb_publishable_` con
// HTTP 401. Debe usarse la anon key en formato JWT (empieza por `eyJhbGciOi`).
window.supabase = { createClient }
window.SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://arbdhyeycvyskjgpjlmn.supabase.co'
window.SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ROdMSOxJW_fCtvtyP3PHBg_DkQNnE2d'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)