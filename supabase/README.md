# DatB — Migraciones de base de datos

Esquema versionado de Supabase para DatB, reconstruido desde el proyecto vivo
`arbdhyeycvyskjgpjlmn`. Con estos archivos la base se recrea desde cero.

## Archivos

| Archivo | Contenido |
|---|---|
| `0001_schema_base.sql` | 23 tablas: geografía, catálogos TB, usuarios y dominio clínico (paciente → indicación → recepción → resultados). |
| `0002_rls.sql` | Row Level Security, funciones auxiliares y políticas por rol. |
| `0003_seed_catalogos.sql` | Catálogos: 16 provincias, municipios y centros de Holguín, 6 pruebas, 24 tipos de muestra, roles, laboratorios y grupos de riesgo. |
| `0004_protecciones.sql` | Trigger anti-escalado de privilegios, `rpc_recalcular_estado_indicacion()` y plantilla del primer administrador. |

El orden importa: `0001` → `0002` → `0003` → `0004`.

## Modelo

```
provincias ──< municipios ──< pacientes ──< indicaciones_examen ──< indicacion_examenes
                                    │
                                    └──< recepciones_muestra ──< resultados_*
```

- **`recepciones_muestra`** es el centro: la muestra física recibida por el laboratorio.
- Cada estudio (`resultados_baciloscopia`, `resultados_cultivo`, `resultados_xpert_ultra`,
  `resultados_xpert_xdr`, `resultados_mf_led`, `resultados_tb_lam`) tiene **una fila por
  recepción** (`unique (recepcion_id)`), lo que impide los duplicados que había en el Access.
- `indicaciones_examen.estado`: `pendiente → recibida → en_proceso → completada / anulada`.
- `resultados_cultivo.resultado` acepta `en_estudio | contaminado | 0..9` — un único
  dominio cerrado, sin mezclar texto libre con dígitos.

## Aplicar

### Opción A — Supabase CLI (recomendado)

```bash
supabase link --project-ref arbdhyeycvyskjgpjlmn
supabase db push          # aplica 0001→0003
```

Para un proyecto nuevo y vacío:

```bash
supabase db reset         # crea la base y aplica todas las migraciones
```

### Opción B — SQL Editor

Ejecutar los tres archivos en orden en el SQL Editor del dashboard.
Cada uno usa `create table if not exists` / `on conflict do update`, así que
**es idempotente**: reejecutarlo no duplica ni rompe nada.

## Después de aplicar

1. **Crear el primer administrador.** `usuarios.id` debe ser el mismo UUID que
   `auth.users.id`. Requiere `service_role` (Edge Function o SQL Editor):
   `sql/0004_bootstrap_admin.sql` sirve de plantilla.
2. **Configurar Auth** (§1.2 del README principal): confirmación de email
   desactivada en el piloto, longitud mínima de contraseña.
3. **Revisar los permisos de laboratorio** en `permisos_lab` para cada usuario
   que deba emitir resultados.

## Notas de seguridad

- La `anon` key es pública **a propósito**: toda la autorización depende de RLS.
- Las funciones `current_usuario()`, `my_rol_sistema()` y `puede_emitir_en()` son
  `security definer` para que las políticas no dependan de privilegios del cliente.
- Ningún usuario puede cambiar su propio `rol_sistema_id` ni `aprobado` desde el
  cliente: lo impide el trigger `proteger_escalado_usuarios` (0004), que además
  deja pasar a `service_role` para las operaciones administrativas del backend.
- El PIN de 4 dígitos se sigue usando como contraseña de Auth
  (`<nombre_usuario>@auth.datb.invalid`). Es una debilidad conocida: ver la
  sección "Problemas" del README principal.
