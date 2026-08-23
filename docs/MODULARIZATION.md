# Modularización progresiva de DatB

Esta fase introduce puntos de entrada pequeños para los módulos que todavía contienen lógica histórica monolítica.

## Estrategia

Los archivos canónicos (`assets/js/core/app.js`, `assets/js/modules/admin/admin.js` y `assets/js/modules/laboratorio/lab_resultados.js`) pasan a ser entrypoints delgados. Las implementaciones existentes se conservan en `legacy/` sin duplicar ni alterar su contenido.

```text
entrypoint
   ↓
legacy implementation
   ↓
new extracted modules (progressively)
```

Esto permite extraer responsabilidades por etapas sin cambiar las APIs globales que usa el frontend actual.

## Próximas extracciones

- `app`: shell, navegación, perfil y firma digital.
- `admin`: acceso, usuarios, localización, laboratorios, permisos y catálogos.
- `lab_resultados`: modal, validación y un formulario independiente por tipo de examen.
- `indicacion`: datos de paciente, formulario, validaciones y persistencia.

La capa Supabase permanece centralizada en `assets/js/core/supabase_client.js`.
