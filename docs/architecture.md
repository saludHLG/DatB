# Arquitectura DatB

## Frontend

DatB es un frontend web estático organizado por responsabilidades. La aplicación mantiene sus páginas de entrada en la raíz (`index.html` y `admin.html`) y concentra el código ejecutable en `assets/`.

```text
assets/
├── css/
│   ├── base/
│   ├── admin/
│   └── epidemiologia/
└── js/
    ├── core/
    └── modules/
        ├── clinical/
        ├── laboratorio/
        ├── usuarios/
        ├── admin/
        └── epidemiologia/
```

## Backend

El frontend consume directamente el proyecto Supabase `arbdhyeycvyskjgpjlmn` mediante `supabase-js` y PostgREST. `assets/js/core/supabase_client.js` es la capa de infraestructura que inicializa el cliente, sincroniza el store en memoria y expone operaciones CRUD.

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

Los catálogos y la geografía se mantienen como dominios compartidos: `provincias`, `municipios`, `centros_salud`, `laboratorios`, `grupos_vulnerables`, `tipos_muestra` y `microorganismos`.

## Regla de dependencia

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

Los módulos no deben crear clientes Supabase independientes ni acceder directamente a secretos. Las operaciones de backend deben centralizarse en la capa `core`.

## Compatibilidad durante la migración

Los nombres JavaScript históricos de la raíz se mantienen temporalmente como loaders de compatibilidad para no romper las páginas existentes mientras se completa la migración de referencias HTML. Los archivos canónicos viven en `assets/`.

## Seguridad

La publishable key puede residir en código cliente, pero no sustituye RLS. Antes de cambiar políticas de seguridad se debe mapear cada operación frontend a su tabla/RPC y rol (`anon`/`authenticated`) y verificar que las políticas permitan exactamente esas operaciones.
