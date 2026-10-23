-- Permisos por fila. Roles: oficina (todo) y comision (solo su plan).

create function es_oficina() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'oficina' and activo)
$$;

create function es_mi_plan(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from planes pl join perfiles pf on pf.id = pl.comision_id
    where pl.id = p and pl.comision_id = auth.uid() and pf.rol = 'comision' and pf.activo)
$$;

create function es_mi_muestra(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select es_mi_plan(plan_id) from muestras where id = m
$$;

alter table perfiles enable row level security;
alter table configuracion enable row level security;
alter table planes enable row level security;
alter table muestras enable row level security;
alter table muestra_parametros enable row level security;
alter table parametros_insitu enable row level security;
alter table mediciones enable row level security;
alter table descripciones_punto enable row level security;
alter table fotos enable row level security;
alter table auditoria enable row level security;

create policy perfiles_ver on perfiles for select using (id = auth.uid() or es_oficina());
create policy perfiles_oficina on perfiles for all using (es_oficina()) with check (es_oficina());

create policy config_ver on configuracion for select to authenticated using (true);
create policy config_oficina on configuracion for all using (es_oficina()) with check (es_oficina());

create policy insitu_ver on parametros_insitu for select to authenticated using (true);
create policy insitu_oficina on parametros_insitu for all using (es_oficina()) with check (es_oficina());

-- Planes: la comisión ve los disponibles (para elegir) y el suyo. Tomar/liberar solo por RPC.
create policy planes_ver on planes for select using (es_oficina() or comision_id is null or comision_id = auth.uid());
create policy planes_oficina on planes for all using (es_oficina()) with check (es_oficina());

create policy muestras_ver on muestras for select using (es_oficina() or es_mi_plan(plan_id));
create policy muestras_oficina on muestras for all using (es_oficina()) with check (es_oficina());
create policy muestras_estado on muestras for update using (es_mi_plan(plan_id)) with check (es_mi_plan(plan_id));

create policy mparam_ver on muestra_parametros for select using (es_oficina() or es_mi_muestra(muestra_id));
create policy mparam_oficina on muestra_parametros for all using (es_oficina()) with check (es_oficina());

create policy med_ver on mediciones for select using (es_oficina() or es_mi_muestra(muestra_id));
create policy med_ins on mediciones for insert with check (es_mi_muestra(muestra_id));
create policy desc_ver on descripciones_punto for select using (es_oficina() or es_mi_muestra(muestra_id));
create policy desc_ins on descripciones_punto for insert with check (es_mi_muestra(muestra_id));
create policy fotos_ver on fotos for select using (es_oficina() or es_mi_muestra(muestra_id));
create policy fotos_ins on fotos for insert with check (es_mi_muestra(muestra_id));

create policy audit_ver on auditoria for select using (es_oficina());

-- La comisión solo puede avanzar el estado de la muestra; nada más cambia desde el cliente.
create function muestras_solo_estado() returns trigger language plpgsql as $$
begin
  if es_oficina() then return new; end if;
  if (to_jsonb(new) - 'estado') is distinct from (to_jsonb(old) - 'estado') then
    raise exception 'La comisión solo puede cambiar el estado de la muestra';
  end if;
  if old.estado = 'cerrada' and new.estado <> 'cerrada' then
    raise exception 'Una muestra cerrada no se reabre';
  end if;
  return new;
end $$;
create trigger solo_estado before update on muestras for each row execute function muestras_solo_estado();

-- Fotos: bucket privado; la primera carpeta de la ruta es el plan_id.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict do nothing;

create policy fotos_storage_ver on storage.objects for select
  using (bucket_id = 'fotos' and (es_oficina() or es_mi_plan(((storage.foldername(name))[1])::uuid)));
create policy fotos_storage_subir on storage.objects for insert
  with check (bucket_id = 'fotos' and es_mi_plan(((storage.foldername(name))[1])::uuid));
