-- =============================================================
-- 0002 — Row Level Security
-- Requiere 0001_schema_base.sql y 0003_seed_catalogos.sql.
--
-- Principio: el frontend es público (anon key), así que TODA la
-- autorización depende de RLS. Toda operación de escritura o
-- lectura clínica exige una sesión de Auth válida cuyo
-- auth.users.user_metadata->>'usuario_id' apunte a public.usuarios.
--
-- Roles de sistema (public.usuarios.rol_sistema_id):
--   1 usuario_comun · 2 moderador_institucional · 3 moderador_municipal
--   4 moderador_provincial · 5 moderador_nacional · 6 administrador
-- =============================================================

-- ── Helpers ───────────────────────────────────────────────────
-- usuario_id de la sesión; null si es anónimo o no está vinculado.
create or replace function public.current_usuario_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select nullif(auth.jwt() -> 'user_metadata' ->> 'usuario_id', '')::uuid
$$;

-- Perfil del usuario autenticado (solo si está activo y aprobado).
create or replace function public.current_usuario()
returns public.usuarios
language sql
stable
security definer
set search_path = ''
as $$
    select u.*
    from public.usuarios u
    where u.id = public.current_usuario_id()
      and u.activo
      and u.aprobado
    limit 1
$$;

create or replace function public.my_rol_sistema()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce((select u.rol_sistema_id from public.current_usuario() u), 0)
$$;

create or replace function public.my_provincia_id()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select (select u.provincia_id from public.current_usuario() u)
$$;

create or replace function public.my_municipio_id()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select (select u.municipio_id from public.current_usuario() u)
$$;

create or replace function public.my_rol_profesional_id()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select (select u.rol_profesional_id from public.current_usuario() u)
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.my_rol_sistema() = 6
$$;

-- Puede emitir resultados en un laboratorio concreto.
create or replace function public.puede_emitir_en(p_laboratorio_id integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.permisos_lab p
        where p.usuario_id = public.current_usuario_id()
          and p.laboratorio_id = p_laboratorio_id
          and p.activo
          and p.puede_emitir
    )
$$;

-- Especialista de laboratorio (Licenciado/a o Técnico/a de Lab.).
create or replace function public.es_lab_profesional()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.my_rol_profesional_id() in (3, 4)
$$;

-- ── Habilitar RLS en todas las tablas ────────────────────────
do $$
declare
    t text;
begin
    foreach t in array array[
        'provincias','municipios','centros_salud','examenes_tb','tipos_muestra',
        'grupos_vulnerables','microorganismos','laboratorios','roles_sistema',
        'usuarios','permisos_lab','accesos_temporales','medicos_referencia',
        'pacientes','indicaciones_examen','indicacion_examenes','recepciones_muestra',
        'resultados_baciloscopia','resultados_cultivo','resultados_xpert_ultra',
        'resultados_xpert_xdr','resultados_mf_led','resultados_tb_lam'
    ] loop
        execute format('alter table public.%I enable row level security', t);
    end loop;
end $$;

-- ── Catálogos: lectura pública, escritura administrativa ─────
-- El cliente anónimo carga estos catálogos antes del login
-- (sbInitAll), por eso la lectura es abierta.
do $$
declare
    t text;
begin
    foreach t in array array[
        'provincias','municipios','centros_salud','examenes_tb','tipos_muestra',
        'grupos_vulnerables','microorganismos','laboratorios','roles_sistema'
    ] loop
        execute format('drop policy if exists %I on public.%I', t || '_read', t);
        execute format(
            'create policy %I on public.%I for select to anon, authenticated using (true)',
            t || '_read', t);
        execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
        execute format(
            'create policy %I on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())',
            t || '_admin_write', t);
    end loop;
end $$;

-- ── usuarios ─────────────────────────────────────────────────
-- Cada usuario ve su propio perfil; administración ve todos.
drop policy if exists usuarios_select_self on public.usuarios;
create policy usuarios_select_self on public.usuarios
    for select to authenticated
    using (id = public.current_usuario_id() or public.es_admin());

-- Un usuario puede actualizar solo sus datos de perfil/firma,
-- nunca su rol ni su estado de aprobación.
drop policy if exists usuarios_update_self on public.usuarios;
create policy usuarios_update_self on public.usuarios
    for update to authenticated
    using (id = public.current_usuario_id() or public.es_admin())
    with check (id = public.current_usuario_id() or public.es_admin());

drop policy if exists usuarios_admin_all on public.usuarios;
create policy usuarios_admin_all on public.usuarios
    for all to authenticated
    using (public.es_admin())
    with check (public.es_admin());

-- Alta de cuenta: la Edge Function usa service_role, no RLS.
-- No se permite INSERT directo desde el cliente.

-- ── permisos_lab y accesos_temporales ─────────────────────────
drop policy if exists permisos_lab_select on public.permisos_lab;
create policy permisos_lab_select on public.permisos_lab
    for select to authenticated
    using (usuario_id = public.current_usuario_id() or public.es_admin());

drop policy if exists permisos_lab_admin on public.permisos_lab;
create policy permisos_lab_admin on public.permisos_lab
    for all to authenticated
    using (public.es_admin())
    with check (public.es_admin());

drop policy if exists accesos_temporales_select on public.accesos_temporales;
create policy accesos_temporales_select on public.accesos_temporales
    for select to authenticated
    using (usuario_id = public.current_usuario_id() or public.es_admin());

drop policy if exists accesos_temporales_admin on public.accesos_temporales;
create policy accesos_temporales_admin on public.accesos_temporales
    for all to authenticated
    using (public.es_admin())
    with check (public.es_admin());

-- ── pacientes ────────────────────────────────────────────────
-- Lee: quien lo creó, cualquier usuario con rol clínico (1,2),
-- roles de vigilancia (2–5) en su ámbito, y administración.
-- Escribe: usuarios clínicos (médico/enfermería) y administración.
drop policy if exists pacientes_select on public.pacientes;
create policy pacientes_select on public.pacientes
    for select to authenticated
    using (
        public.es_admin()
        or creado_por = public.current_usuario_id()
        or public.my_rol_sistema() in (2,3,4,5)
        or public.my_rol_profesional_id() in (1,2)
        or exists (
            select 1 from public.indicaciones_examen i
            where i.paciente_id = pacientes.id
              and i.indicado_por = public.current_usuario_id()
        )
        or exists (
            select 1 from public.indicaciones_examen i
            join public.recepciones_muestra r on r.indicacion_id = i.id
            where i.paciente_id = pacientes.id
              and public.puede_emitir_en(r.laboratorio_id)
        )
    );

drop policy if exists pacientes_insert on public.pacientes;
create policy pacientes_insert on public.pacientes
    for insert to authenticated
    with check (
        public.es_admin()
        or public.my_rol_profesional_id() in (1,2)
    );

drop policy if exists pacientes_update on public.pacientes;
create policy pacientes_update on public.pacientes
    for update to authenticated
    using (
        public.es_admin()
        or creado_por = public.current_usuario_id()
        or public.my_rol_profesional_id() in (1,2)
    )
    with check (
        public.es_admin()
        or public.my_rol_profesional_id() in (1,2)
    );

drop policy if exists pacientes_delete on public.pacientes;
create policy pacientes_delete on public.pacientes
    for delete to authenticated
    using (public.es_admin());

-- ── indicaciones_examen ──────────────────────────────────────
drop policy if exists indicaciones_select on public.indicaciones_examen;
create policy indicaciones_select on public.indicaciones_examen
    for select to authenticated
    using (
        public.es_admin()
        or indicado_por = public.current_usuario_id()
        or public.my_rol_sistema() in (2,3,4,5)
        or exists (
            select 1 from public.recepciones_muestra r
            where r.indicacion_id = indicaciones_examen.id
              and public.puede_emitir_en(r.laboratorio_id)
        )
        or exists (
            select 1 from public.permisos_lab p
            where p.laboratorio_id = indicaciones_examen.laboratorio_id
              and p.usuario_id = public.current_usuario_id()
              and p.activo
        )
    );

drop policy if exists indicaciones_insert on public.indicaciones_examen;
create policy indicaciones_insert on public.indicaciones_examen
    for insert to authenticated
    with check (
        public.es_admin()
        or (
            public.my_rol_profesional_id() in (1,2)
            and indicado_por = public.current_usuario_id()
        )
    );

drop policy if exists indicaciones_update on public.indicaciones_examen;
create policy indicaciones_update on public.indicaciones_examen
    for update to authenticated
    using (
        public.es_admin()
        or indicado_por = public.current_usuario_id()
    )
    with check (
        public.es_admin()
        or indicado_por = public.current_usuario_id()
    );

drop policy if exists indicaciones_delete on public.indicaciones_examen;
create policy indicaciones_delete on public.indicaciones_examen
    for delete to authenticated
    using (public.es_admin());

-- ── indicacion_examenes ──────────────────────────────────────
drop policy if exists ind_examenes_select on public.indicacion_examenes;
create policy ind_examenes_select on public.indicacion_examenes
    for select to authenticated
    using (
        exists (
            select 1 from public.indicaciones_examen i
            where i.id = indicacion_examenes.indicacion_id
        )
    );

drop policy if exists ind_examenes_insert on public.indicacion_examenes;
create policy ind_examenes_insert on public.indicacion_examenes
    for insert to authenticated
    with check (
        exists (
            select 1 from public.indicaciones_examen i
            where i.id = indicacion_examenes.indicacion_id
              and (public.es_admin() or i.indicado_por = public.current_usuario_id())
        )
    );

drop policy if exists ind_examenes_delete on public.indicacion_examenes;
create policy ind_examenes_delete on public.indicacion_examenes
    for delete to authenticated
    using (
        public.es_admin()
        or exists (
            select 1 from public.indicaciones_examen i
            where i.id = indicacion_examenes.indicacion_id
              and i.indicado_por = public.current_usuario_id()
        )
    );

-- ── recepciones_muestra ──────────────────────────────────────
drop policy if exists recepciones_select on public.recepciones_muestra;
create policy recepciones_select on public.recepciones_muestra
    for select to authenticated
    using (
        public.es_admin()
        or public.my_rol_sistema() in (2,3,4,5)
        or public.puede_emitir_en(laboratorio_id)
        or exists (
            select 1 from public.indicaciones_examen i
            where i.id = recepciones_muestra.indicacion_id
              and i.indicado_por = public.current_usuario_id()
        )
    );

drop policy if exists recepciones_insert on public.recepciones_muestra;
create policy recepciones_insert on public.recepciones_muestra
    for insert to authenticated
    with check (
        public.es_admin()
        or public.puede_emitir_en(laboratorio_id)
    );

drop policy if exists recepciones_update on public.recepciones_muestra;
create policy recepciones_update on public.recepciones_muestra
    for update to authenticated
    using (public.es_admin() or public.puede_emitir_en(laboratorio_id))
    with check (public.es_admin() or public.puede_emitir_en(laboratorio_id));

drop policy if exists recepciones_delete on public.recepciones_muestra;
create policy recepciones_delete on public.recepciones_muestra
    for delete to authenticated
    using (public.es_admin());

-- ── resultados_* ─────────────────────────────────────────────
-- Lectura: administración, vigilancia, o el profesional del laboratorio
--   que recibió la muestra, o el médico que emitió la indicación.
-- Escritura: solo con permiso activo de emisión sobre ese laboratorio.
do $$
declare
    t text;
begin
    foreach t in array array[
        'resultados_baciloscopia','resultados_cultivo','resultados_xpert_ultra',
        'resultados_xpert_xdr','resultados_mf_led','resultados_tb_lam'
    ] loop
        -- SELECT
        execute format('drop policy if exists %I on public.%I', t || '_select', t);
        execute format($f$
            create policy %I on public.%I for select to authenticated
            using (
                public.es_admin()
                or public.my_rol_sistema() in (2,3,4,5)
                or exists (
                    select 1 from public.recepciones_muestra r
                    where r.id = %I.recepcion_id
                      and public.puede_emitir_en(r.laboratorio_id)
                )
                or exists (
                    select 1 from public.recepciones_muestra r
                    join public.indicaciones_examen i on i.id = r.indicacion_id
                    where r.id = %I.recepcion_id
                      and i.indicado_por = public.current_usuario_id()
                )
            )$f$, t || '_select', t, t, t);

        -- INSERT
        execute format('drop policy if exists %I on public.%I', t || '_insert', t);
        execute format($f$
            create policy %I on public.%I for insert to authenticated
            with check (
                exists (
                    select 1 from public.recepciones_muestra r
                    where r.id = %I.recepcion_id
                      and public.puede_emitir_en(r.laboratorio_id)
                )
            )$f$, t || '_insert', t, t);

        -- UPDATE
        execute format('drop policy if exists %I on public.%I', t || '_update', t);
        execute format($f$
            create policy %I on public.%I for update to authenticated
            using (
                exists (
                    select 1 from public.recepciones_muestra r
                    where r.id = %I.recepcion_id
                      and public.puede_emitir_en(r.laboratorio_id)
                )
            )
            with check (
                exists (
                    select 1 from public.recepciones_muestra r
                    where r.id = %I.recepcion_id
                      and public.puede_emitir_en(r.laboratorio_id)
                )
            )$f$, t || '_update', t, t, t);

        -- DELETE
        execute format('drop policy if exists %I on public.%I', t || '_delete', t);
        execute format($f$
            create policy %I on public.%I for delete to authenticated
            using (
                public.es_admin()
                or exists (
                    select 1 from public.recepciones_muestra r
                    join public.permisos_lab p on p.laboratorio_id = r.laboratorio_id
                    where r.id = %I.recepcion_id
                      and p.usuario_id = public.current_usuario_id()
                      and p.activo
                      and p.puede_eliminar
                )
            )$f$, t || '_delete', t, t);
    end loop;
end $$;

-- ── medicos_referencia ───────────────────────────────────────
drop policy if exists medicos_select on public.medicos_referencia;
create policy medicos_select on public.medicos_referencia
    for select to authenticated using (true);

drop policy if exists medicos_write on public.medicos_referencia;
create policy medicos_write on public.medicos_referencia
    for all to authenticated
    using (public.es_admin() or public.my_rol_profesional_id() in (1,2))
    with check (public.es_admin() or public.my_rol_profesional_id() in (1,2));

-- ── Privilegios de tabla ─────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
    grant select on tables to anon, authenticated;
alter default privileges in schema public
    grant insert, update, delete on tables to authenticated;
