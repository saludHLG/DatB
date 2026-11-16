-- =============================================================
-- Arreglo de RLS para el guardado de indicaciones
-- =============================================================
-- Contexto: el insert fallaba con 42501 (row-level security) con
-- sesion autenticada, mientras que anon si podia insertar (llegaba a
-- 23502, error de campo nulo). Conclusion: la tabla tiene politicas
-- para anon pero no para authenticated.
--
-- Este script crea las funciones auxiliares que faltan y las politicas
-- para el rol authenticated en las tablas del flujo clinico.
-- Es idempotente: se puede ejecutar varias veces.
-- =============================================================

-- ── 1. Funciones de identidad ────────────────────────────────
-- Toman el id del usuario DatB desde el JWT de Supabase Auth.

create or replace function public.current_usuario_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select nullif(auth.jwt() -> 'user_metadata' ->> 'usuario_id', '')::uuid
$$;

create or replace function public.my_rol_sistema()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        (select u.rol_sistema_id from public.usuarios u
          where u.id = public.current_usuario_id()
            and u.activo and u.aprobado
          limit 1),
        0)
$$;

create or replace function public.my_rol_profesional_id()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select (select u.rol_profesional_id from public.usuarios u
             where u.id = public.current_usuario_id()
               and u.activo and u.aprobado
             limit 1)
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

-- ¿El usuario autenticado puede emitir resultados en este laboratorio?
create or replace function public.puede_emitir_en(p_laboratorio_id integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.permisos_lab p
        where p.usuario_id = public.current_usuario_id()
          and p.laboratorio_id = p_laboratorio_id
          and p.activo
          and p.puede_emitir
    )
$$;

grant execute on function public.current_usuario_id()      to authenticated, anon;
grant execute on function public.my_rol_sistema()          to authenticated, anon;
grant execute on function public.my_rol_profesional_id()   to authenticated, anon;
grant execute on function public.es_admin()                to authenticated, anon;
grant execute on function public.puede_emitir_en(integer)  to authenticated, anon;

-- ── 2. Políticas para authenticated ──────────────────────────

-- indicaciones_examen
drop policy if exists indicaciones_auth_select on public.indicaciones_examen;
create policy indicaciones_auth_select on public.indicaciones_examen
    for select to authenticated
    using (
        public.es_admin()
        or indicado_por = public.current_usuario_id()
        or public.my_rol_sistema() in (2,3,4,5)
        or exists (select 1 from public.recepciones_muestra r
                    where r.indicacion_id = indicaciones_examen.id
                      and public.puede_emitir_en(r.laboratorio_id))
    );

drop policy if exists indicaciones_auth_insert on public.indicaciones_examen;
create policy indicaciones_auth_insert on public.indicaciones_examen
    for insert to authenticated
    with check (
        public.es_admin()
        or public.my_rol_profesional_id() in (1,2,3,4)
        or indicado_por = public.current_usuario_id()
    );

drop policy if exists indicaciones_auth_update on public.indicaciones_examen;
create policy indicaciones_auth_update on public.indicaciones_examen
    for update to authenticated
    using (
        public.es_admin()
        or indicado_por = public.current_usuario_id()
        or public.my_rol_sistema() in (2,3,4,5)
    )
    with check (
        public.es_admin()
        or indicado_por = public.current_usuario_id()
        or public.my_rol_sistema() in (2,3,4,5)
    );

drop policy if exists indicaciones_auth_delete on public.indicaciones_examen;
create policy indicaciones_auth_delete on public.indicaciones_examen
    for delete to authenticated
    using (public.es_admin() or indicado_por = public.current_usuario_id());

-- indicacion_examenes
drop policy if exists ind_exam_auth_all on public.indicacion_examenes;
create policy ind_exam_auth_all on public.indicacion_examenes
    for all to authenticated
    using (
        public.es_admin()
        or exists (select 1 from public.indicaciones_examen i
                    where i.id = indicacion_examenes.indicacion_id
                      and (i.indicado_por = public.current_usuario_id()
                           or public.my_rol_sistema() in (2,3,4,5)))
    )
    with check (
        public.es_admin()
        or exists (select 1 from public.indicaciones_examen i
                    where i.id = indicacion_examenes.indicacion_id
                      and i.indicado_por = public.current_usuario_id())
    );

-- pacientes: alta y edicion por el personal clínico
drop policy if exists pacientes_auth_select on public.pacientes;
create policy pacientes_auth_select on public.pacientes
    for select to authenticated using (true);

drop policy if exists pacientes_auth_insert on public.pacientes;
create policy pacientes_auth_insert on public.pacientes
    for insert to authenticated with check (true);

drop policy if exists pacientes_auth_update on public.pacientes;
create policy pacientes_auth_update on public.pacientes
    for update to authenticated using (true) with check (true);

-- recepciones de muestra: las crea el laboratorio
drop policy if exists recepciones_auth_all on public.recepciones_muestra;
create policy recepciones_auth_all on public.recepciones_muestra
    for all to authenticated
    using (
        public.es_admin()
        or public.my_rol_sistema() in (2,3,4,5)
        or public.puede_emitir_en(laboratorio_id)
        or exists (select 1 from public.indicaciones_examen i
                    where i.id = recepciones_muestra.indicacion_id
                      and i.indicado_por = public.current_usuario_id())
    )
    with check (
        public.es_admin()
        or public.puede_emitir_en(laboratorio_id)
        or public.my_rol_profesional_id() in (1,2,3,4)
    );

-- resultados_*: el laboratorio que recibio la muestra, o el admin
do $$
declare
    t text;
begin
    foreach t in array array[
        'resultados_baciloscopia','resultados_cultivo','resultados_xpert_ultra',
        'resultados_xpert_xdr','resultados_mf_led','resultados_tb_lam'
    ] loop
        execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
        execute format($f$
            create policy %I on public.%I for all to authenticated
            using (
                public.es_admin()
                or public.my_rol_sistema() in (2,3,4,5)
                or exists (select 1 from public.recepciones_muestra r
                            where r.id = %I.recepcion_id
                              and public.puede_emitir_en(r.laboratorio_id))
                or exists (select 1 from public.recepciones_muestra r
                            join public.indicaciones_examen i on i.id = r.indicacion_id
                            where r.id = %I.recepcion_id
                              and i.indicado_por = public.current_usuario_id())
            )
            with check (
                public.es_admin()
                or exists (select 1 from public.recepciones_muestra r
                            where r.id = %I.recepcion_id
                              and public.puede_emitir_en(r.laboratorio_id))
            )$f$, t || '_auth_all', t, t, t, t);
    end loop;
end $$;

-- usuarios: lectura para el propio perfil y para el admin
drop policy if exists usuarios_auth_select on public.usuarios;
create policy usuarios_auth_select on public.usuarios
    for select to authenticated
    using (
        public.es_admin()
        or id = public.current_usuario_id()
        or public.my_rol_sistema() in (2,3,4,5)
    );

drop policy if exists usuarios_auth_update on public.usuarios;
create policy usuarios_auth_update on public.usuarios
    for update to authenticated
    using (public.es_admin() or id = public.current_usuario_id())
    with check (public.es_admin() or id = public.current_usuario_id());

-- permisos_lab
drop policy if exists permisos_auth_select on public.permisos_lab;
create policy permisos_auth_select on public.permisos_lab
    for select to authenticated using (true);

drop policy if exists permisos_auth_write on public.permisos_lab;
create policy permisos_auth_write on public.permisos_lab
    for all to authenticated
    using (public.es_admin()) with check (public.es_admin());
