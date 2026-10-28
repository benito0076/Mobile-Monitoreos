-- Una comisión suele ser de dos personas: un plan puede tener un segundo integrante (comision_id_2).
-- Ambos ven y registran lo mismo; comision_id sigue siendo quien lo tomó o a quien la oficina lo asignó primero.
alter table planes add column comision_id_2 uuid references auth.users(id);
alter table planes add check (comision_id_2 is null or (comision_id is not null and comision_id_2 <> comision_id));

create or replace function es_mi_plan(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from planes pl join perfiles pf on pf.id = auth.uid()
    where pl.id = p and auth.uid() in (pl.comision_id, pl.comision_id_2) and pf.rol = 'comision' and pf.activo)
$$;

drop policy planes_ver on planes;
create policy planes_ver on planes for select
  using (es_oficina() or comision_id is null or comision_id = auth.uid() or comision_id_2 = auth.uid());

-- Quien ya es integrante lo vuelve a tomar sin cambiar nada (reintento, teléfono nuevo, segundo integrante).
create or replace function tomar_plan(p_plan uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfiles where id = auth.uid() and rol = 'comision' and activo) then
    raise exception 'Solo una comisión activa puede tomar un plan';
  end if;
  if exists (select 1 from planes where id = p_plan and auth.uid() in (comision_id, comision_id_2)) then return true; end if;
  update planes set comision_id = auth.uid(), tomado_en = now() where id = p_plan and comision_id is null;
  return found; -- false = ya lo tomó otra comisión
end $$;

create or replace function liberar_plan(p_plan uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_oficina() then raise exception 'Solo la oficina libera planes'; end if;
  update planes set comision_id = null, comision_id_2 = null, tomado_en = null where id = p_plan;
end $$;

-- Los datos ya registrados se conservan y los ven los nuevos integrantes (las políticas dependen del plan).
drop function reasignar_plan(uuid, uuid);
create function reasignar_plan(p_plan uuid, p_comision uuid, p_comision_2 uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_oficina() then raise exception 'Solo la oficina reasigna planes'; end if;
  if p_comision_2 = p_comision then raise exception 'Los dos integrantes deben ser personas distintas'; end if;
  if exists (select 1 from unnest(array[p_comision, p_comision_2]) u
              where u is not null and not exists (select 1 from perfiles where id = u and rol = 'comision' and activo)) then
    raise exception 'La comisión destino no existe o está inactiva';
  end if;
  update planes set comision_id = p_comision, comision_id_2 = p_comision_2, tomado_en = now() where id = p_plan;
end $$;
revoke all on function reasignar_plan from public, anon;
grant execute on function reasignar_plan to authenticated;
