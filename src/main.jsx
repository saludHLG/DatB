import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import App from './App.jsx'
import './react.css'
import '../assets/css/base/style.css'
import '../assets/css/base/modules.css'
import '../assets/css/epidemiologia/epidemiologia.css'
import '../assets/css/admin/admin.css'

window.supabase = { createClient }
window.SUPABASE_URL = 'https://arbdhyeycvyskjgpjlmn.supabase.co'
window.SUPABASE_ANON = 'sb_publishable_ROdMSOxJW_fCtvtyP3PHBg_DkQNnE2d'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)