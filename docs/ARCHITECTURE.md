# DatB — arquitectura modular

## Principios

- Frontend estático compatible con GitHub Pages.
- Supabase permanece como backend remoto y fuente persistente de datos.
- `assets/js/core/` contiene infraestructura compartida y ciclo de aplicación.
- `assets/js/modules/` contiene módulos funcionales por dominio.
- `assets/css/` separa estilos base, administración y epidemiología.
- `docs/archive/patches/` conserva parches históricos fuera del runtime.

## Estructura

```text
DatB/
├── index.html
├── admin.html
├── assets/
│   ├── css/
│   │   ├── base/
│   │   ├── admin/
│   │   └── epidemiologia/
│   └── js/
│       ├── core/
│       │   ├── config.js
│       │   ├── supabase_client.js
│       │   ├── utils.js
│       │   ├── data.js
│       │   ├── auth.js
│       │   └── app.js
│       └── modules/
│           ├── clinical/
│           ├── laboratorio/
│           ├── usuarios/
│           ├── admin/
│           └── epidemiologia/
├── docs/
│   └── archive/patches/
└── README.md
```

## Compatibilidad

Los archivos JS/CSS históricos de la raíz actúan como cargadores de compatibilidad. Esto permite que las páginas actuales sigan funcionando mientras las rutas internas se migran progresivamente a `assets/`.

La siguiente etapa debe eliminar esos cargadores y actualizar directamente `index.html` y `admin.html` cuando se haya validado toda la aplicación en GitHub Pages.
