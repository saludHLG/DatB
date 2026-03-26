# DatB — Despliegue en GitHub Pages + Supabase

Sistema de Gestión de Muestras y Resultados para TB · Estudio Piloto

---

## Arquitectura

```
GitHub Pages (frontend estático)
        │  HTTPS
        ▼
Supabase (PostgreSQL + Auth + RLS)
```

El frontend es 100 % estático (HTML/CSS/JS). No requiere servidor de aplicaciones.

---

## 1. Supabase — configuración inicial

### 1.1 Crear proyecto

1. [supabase.com](https://supabase.com) → **New Project**.
2. Anotar: **Project URL** y **anon public key** (Settings → API).

### 1.2 Configurar Auth

En **Authentication → Settings**:

| Parámetro | Valor |
|-----------|-------|
| Email confirmations | **Desactivado** (piloto sin correo) |
| Min password length | **4** (PINs) |
| Site URL | `https://TU_USUARIO.github.io/datb` |
| Redirect URLs | La misma URL anterior |

### 1.3 Ejecutar migraciones SQL

En el **SQL Editor** de Supabase, ejecutar **en orden**:

```
schema_salud_v3_1.sql
schema_salud_v3_2.sql
schema_salud_v3_3.sql
schema_salud_v3_4.sql
```

> Las tablas base (`roles_sistema`, `provincias`, `municipios`, etc.) deben existir antes del parche v3.1.
> Si el proyecto es nuevo, añadir los `CREATE TABLE` correspondientes al inicio de la primera migración.

### 1.4 Poblar datos geográficos

Importar desde `data.js` usando el importador CSV de Supabase o ejecutar
INSERTs directamente en el SQL Editor para las tablas:
`provincias`, `municipios`, `centros_salud`, `laboratorios`.

### 1.5 Poblar catálogos

Idem para `grupos_vulnerables`, `tipos_muestra`, `microorganismos`
(valores por defecto en `indicacion.js` y `admin.js`).

---

## 2. Archivos nuevos a añadir al repositorio

Copiar estos archivos al raíz del proyecto:

| Archivo | Descripción |
|---------|-------------|
| `config.js` | Credenciales Supabase |
| `supabase_client.js` | Capa de datos (online/offline) |

Editar `config.js`:
```javascript
const SUPABASE_URL  = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON = 'TU_ANON_PUBLIC_KEY';
```

---

## 3. Modificar `index.html` y `admin.html`

### 3.1 Agregar scripts (inmediatamente antes de `utils.js`)

```html
<!-- Supabase JS v2 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<!-- Config y capa de datos DatB -->
<script src="config.js"></script>
<script src="supabase_client.js"></script>
```

---

## 4. Modificar `auth.js` — handlers async

Los tres handlers del formulario deben ser `async` para usar Supabase.
Los cambios son quirúrgicos; el resto del archivo no se toca.

### 4.1 Login

```javascript
// Reemplazar el addEventListener de form-login:
$('form-login')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const ci  = $('login-ci').value.trim();
    const pin = readPin('login-pin-grid');
    hide('login-alert');

    if (!ci) { setInvalid('login-ci','err-login-ci','Ingrese su CI.'); return; }
    if (pin.length < 4) {
        const err = $('err-login-pin');
        err.textContent = 'Ingrese los 4 dígitos.'; err.classList.add('show');
        document.querySelectorAll('#login-pin-grid .pin-input').forEach(i => i.classList.add('is-invalid'));
        return;
    }

    const { user, error } = await sbLogin(ci, pin);
    if (error) { showAlert('login-alert', error, 'danger'); return; }

    sessionStorage.setItem('sr_active_user', user.id);
    loadDashboard(user);
    showView('view-dashboard');
});
```

### 4.2 Registro (submit final)

```javascript
// Reemplazar el addEventListener de form-register:
$('form-register')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateStep3()) return;
    hide('register-alert');

    const rolId  = Number($('reg-rol-prof').value);
    const centId = $('reg-centro').value;
    const pin    = readPin('reg-pin-grid');

    const nuevoUsuario = {
        id: crypto.randomUUID(),   // UUID real para Supabase Auth
        ci: $('reg-ci').value.trim(),
        nombres: $('reg-nombres').value.trim(),
        apellidos: $('reg-apellidos').value.trim(),
        rol_profesional_id: rolId,
        rol_profesional_nom: ROLES_PROFESIONALES[rolId]?.nombre,
        registro_profesional: $('reg-registro-prof').value.trim() || null,
        provincia_id: Number($('reg-provincia').value),
        municipio_id: Number($('reg-municipio').value),
        centro_salud_id: centId === '__otro__' ? null : Number(centId),
        centro_texto: centId === '__otro__' ? 'Otro' :
            getGeoCentros().find(c => c.id === Number(centId))?.nombre,
        rol_sistema_id: 1,
        activo: true,
        aprobado: false,
        creado_en: new Date().toISOString(),
    };

    const { error } = await sbRegister(nuevoUsuario, pin);
    if (error) { showAlert('register-alert', error, 'danger'); return; }
    showView('view-success');
});
```

### 4.3 Restauración de sesión (en `DOMContentLoaded`)

```javascript
// Reemplazar el bloque de restauración de sesión al final de DOMContentLoaded:
sbGetSession().then(user => {
    if (user && user.activo) {
        loadDashboard(user);
        showView('view-dashboard');
    } else {
        showView('view-login');
    }
});
```

### 4.4 Logout

```javascript
// Reemplazar el listener de btn-logout:
$('btn-logout')?.addEventListener('click', async () => {
    await sbLogout();
    $('app-shell').classList.add('d-none');
    document.querySelector('.layout-wrapper')?.classList.remove('d-none');
    if ($('login-ci')) $('login-ci').value = '';
    document.querySelectorAll('#login-pin-grid .pin-input').forEach(i => i.value = '');
    showView('view-login');
});
```

---

## 5. Inicialización en `app.js`

Al inicio de `loadDashboard`, agregar una llamada a `sbInitGeo` para
sincronizar datos geográficos desde Supabase:

```javascript
// Primera línea de loadDashboard(user):
if (typeof sbInitGeo === 'function') sbInitGeo().catch(() => {});
```

---

## 6. Publicar en GitHub

```bash
# Desde el directorio del proyecto:
git init
git add .
git commit -m "feat: DatB piloto inicial"

# Crear repositorio vacío en GitHub y luego:
git remote add origin https://github.com/TU_USUARIO/datb.git
git branch -M main
git push -u origin main
```

En GitHub → **Settings → Pages**:
- Source: `Deploy from a branch` → `main` → `/ (root)`
- Guardar. La URL `https://TU_USUARIO.github.io/datb` estará disponible en ~2 min.

---

## 7. Flujo de actualizaciones

```bash
git add -A
git commit -m "fix: descripción del cambio"
git push
# GitHub Pages se actualiza automáticamente (~30 s)
```

---

## 8. Modo offline / prototipo

Si `config.js` contiene `TU_PROYECTO` (sin editar), la aplicación opera
en modo localStorage exactamente igual que el prototipo original.
No requiere conexión a Supabase.

---

## 9. Seguridad

| Aspecto | Estado |
|---------|--------|
| `SUPABASE_ANON` en código cliente | ✅ Diseñado para ser público; RLS protege los datos |
| PIN de 4 dígitos | ⚠️ Aceptable para piloto interno en red controlada |
| HTTPS | ✅ GitHub Pages sirve HTTPS automáticamente |
| RLS activo | ✅ Todos los parches SQL incluyen políticas RLS |
| `crypto.randomUUID()` para IDs | ✅ Compatible con Supabase Auth (UUID v4) |

---

## 10. Estructura de archivos

```
datb/
├── index.html
├── admin.html
├── config.js           ← NUEVO
├── supabase_client.js  ← NUEVO
├── utils.js
├── data.js
├── auth.js             ← modificar handlers (ver §4)
├── app.js              ← agregar sbInitGeo (ver §5)
├── indicacion.js
├── laboratorio_core.js
├── lab_pendientes.js
├── lab_recibidas.js
├── lab_resultados.js
├── laboratorio.js
├── home_lab.js
├── home_usuario.js     ← aplicar PATCH_home_usuario.js (AMR fix)
├── style.css
├── modules.css
├── admin.css
└── schema_salud_v3_*.sql
```
