-- =============================================================
-- 0004 — Protecciones de escalado de privilegios
--
-- RLS por sí sola no basta: la política `usuarios_update_self`
-- permite a un usuario actualizar SU fila, pero el `with check`
-- no compara OLD/NEW, así que podría cambiar role_sistema_id a 6.
-- Este trigger cierra ese hueco.
--
-- Las escrituras con service_role (Edge Functions de alta de
-- cuenta / administración) siguen funcionando: el trigger
-- distingue el rol de ejecución.
-- =============================================================

create or replace function public.tg_proteger_escalado_usuarios()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- service_role (backend) no pasa por RLS y puede cambiar roles.
    if current_setting('request.jwt.claims', true) is not null
       and coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role' then
        return new;
    end if;

    -- Un usuario no puede elevar su propio rol.
    if coalesce(new.rol_sistema_id, 0) is distinct from coalesce(old.rol_sistema_id, 0) then
        if not exists (
            select 1 from public.usuarios u
            where u.id = public.current_usuario_id()
              and u.rol_sistema_id = 6
              and u.activo and u.aprobado
        ) then
            raise exception 'Solo un administrador puede cambiar rol_sistema_id'
                using errcode = '42501';
        end if;
    end if;

    -- Tampoco puede autoaprobarse ni auto-reactivarse.
    if coalesce(new.aprobado, false) is distinct from coalesce(old.aprobado, false)
       or coalesce(new.activo, false) is distinct from coalesce(old.activo, false) then
        if not exists (
            select 1 from public.usuarios u
            where u.id = public.current_usuario_id()
              and u.rol_sistema_id = 6
              and u.activo and u.aprobado
        ) then
            raise exception 'Solo un administrador puede cambiar aprobado/activo'
                using errcode = '42501';
        end if;
    end if;

    return new;
end $$;

drop trigger if exists proteger_escalado_usuarios on public.usuarios;
create trigger proteger_escalado_usuarios
    before update on public.usuarios
    for each row
    execute function public.tg_proteger_escalado_usuarios();

-- ─────────────────────────────────────────────────────────────
-- Consistencia de estados: el estado de la indicación no se
-- escribe a mano desde el cliente; lo deriva el laboratorio.
-- ─────────────────────────────────────────────────────────────
create or replace function public.rpc_recalcular_estado_indicacion(p_indicacion uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_pedidos   integer;
    v_aceptadas integer;
    v_con_resultado integer;
    v_estado    text;
begin
    select cardinality(i.examenes_ids), count(distinct r.examen_id)
      into v_pedidos, v_aceptadas
      from public.indicaciones_examen i
      left join public.recepciones_muestra r
             on r.indicacion_id = i.id and r.estado in ('aceptada','recibida','en_proceso')
     where i.id = p_indicacion
     group by i.examenes_ids;

    -- Recepciones que ya tienen resultado emitido en alguna tabla.
    select count(distinct r.examen_id) into v_con_resultado
      from public.recepciones_muestra r
     where r.indicacion_id = p_indicacion
       and (
            exists (select 1 from public.resultados_baciloscopia x where x.recepcion_id = r.id)
         or exists (select 1 from public.resultados_cultivo x where x.recepcion_id = r.id)
         or exists (select 1 from public.resultados_xpert_ultra x where x.recepcion_id = r.id)
         or exists (select 1 from public.resultados_xpert_xdr x where x.recepcion_id = r.id)
         or exists (select 1 from public.resultados_mf_led x where x.recepcion_id = r.id)
         or exists (select 1 from public.resultados_tb_lam x where x.recepcion_id = r.id)
       );

    v_estado := case
        when v_pedidos is null or v_pedidos = 0 then 'pendiente'
        when v_con_resultado >= v_pedidos then 'completada'
        when v_aceptadas  >= 1 then 'en_proceso'
        else 'pendiente'
    end;

    update public.indicaciones_examen
       set estado = v_estado
     where id = p_indicacion;

    return v_estado;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Plantilla: primer administrador.
-- Ejecutar UNA vez desde el SQL Editor (service_role), tras crear
-- el usuario en Authentication → Users y sustituir los UUID.
-- ─────────────────────────────────────────────────────────────
-- insert into public.usuarios
--     (id, nombre_usuario, ci, nombres, apellidos, rol_sistema_id, activo, aprobado)
-- values
--     ('00000000-0000-0000-0000-000000000001', 'admin', '00000000000',
--      'Nombre', 'Apellidos', 6, true, true);
