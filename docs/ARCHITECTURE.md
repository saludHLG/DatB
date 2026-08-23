# Arquitectura DatB

## Frontend

DatB es un frontend web estático organizado por responsabilidades. Las páginas de entrada (`index.html` y `admin.html`) están en la raíz y el código ejecutable se concentra en `assets/`.

```text
assets/
├── css/
│   ├── base/
│   ├── admin/
│   └── epidemiologia/
└── js/
    ├── core/
    ├── legacy/
    └── modules/
        ├── clinical/
        ├── laboratorio/
        ├── usuarios/
        ├── admin/
        └── epidemiologia/
```

## Backend

El frontend consume directamente el proyecto Supabase `arbdhyeycvyskjgpjlmn` mediante `supabase-js` y PostgREST. `assets/js/core/supabase_client.js` es la capa de infraestructura que inicializa el cliente, sincroniza el store en memoria y expone las operaciones CRUD.

### Dominio principal

```text
usuarios ── permisos_lab / accesos_temporales
   │
   ├── pacientes
   │      └── indicaciones_examen
   │              └── indicacion_examenes
   │
   └── recepciones_muestra
            ├── resultados_baciloscopia
            ├── resultados_cultivo
            ├── resultados_tb_lam
            ├── resultados_mf_led
            ├── resultados_xpert_ultra
            └── resultados_xpert_xdr
```

Los catálogos y la geografía son dominios compartidos: `provincias`, `municipios`, `centros_salud`, `laboratorios`, `grupos_vulnerables`, `tipos_muestra` y `microorganismos`.

## Dependencia

```text
UI / páginas
    ↓
módulo funcional
    ↓
core / servicios de datos
    ↓
Supabase REST / RPC
    ↓
PostgreSQL + RLS
```

Los módulos no deben crear clientes Supabase independientes. El acceso a datos debe centralizarse en `supabase_client.js`.

## Modularización progresiva

Los entrypoints de `app`, `admin` y `lab_resultados` se mantienen pequeños y cargan temporalmente las implementaciones heredadas desde `legacy/`. Esto permite extraer responsabilidades por etapas sin alterar las APIs globales existentes ni romper las páginas actuales.

La implementación histórica se conserva sin duplicar contenido: los archivos nuevos de `legacy/` reutilizan los mismos blobs de Git de sus versiones previas.

## Seguridad

La clave publicable pertenece al cliente y no reemplaza la protección mediante RLS. Antes de modificar políticas se debe mapear cada operación frontend a su tabla/RPC y a su rol de ejecución.
