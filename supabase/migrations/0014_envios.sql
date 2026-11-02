-- Envíos de muestras al laboratorio (una cadena de custodia FM-017 por envío).
-- Una muestra va en un solo envío; un envío se anula por RPC (solo oficina) y sus muestras quedan libres para otro.
create table envios (
  id uuid primary key,                         -- UUID generado en el teléfono
  plan_id uuid not null references planes(id),
  fecha date not null,                         -- fecha del envío: lo que lo identifica ante el laboratorio
  medio_transporte text,                       -- terrestre | aereo | acuatico | texto libre
  controles jsonb not null default '{}'::jsonb, -- nivel, preservacion, refrigeracion, rotulacion (true = verificado en campo)
  temperatura_testigo text,
  observaciones text,
  entrega text,                                -- quién entrega (nombre, tal como sale en la cadena de custodia)
  hora_telefono timestamptz not null,
  hora_servidor timestamptz not null default now(),
  usuario_id uuid references auth.users(id),
  anulado_en timestamptz,
  anulado_por uuid references auth.users(id),
  motivo_anulacion text
);
create index on envios (plan_id);

create table envio_muestras (
  envio_id uuid not null references envios(id),
  muestra_id uuid not null references muestras(id),
  primary key (envio_id, muestra_id),
  unique (muestra_id)                          -- un solo envío por muestra
);

alter table envios enable row level security;
alter table envio_muestras enable row level security;

create policy envios_ver on envios for select using (es_oficina() or es_mi_plan(plan_id));
create policy envios_ins on envios for insert with check (es_oficina() or es_mi_plan(plan_id));
create policy envio_muestras_ver on envio_muestras for select using (es_oficina() or es_mi_muestra(muestra_id));
-- La muestra y el envío deben ser del mismo plan.
create policy envio_muestras_ins on envio_muestras for insert with check (
  (es_oficina() or es_mi_muestra(muestra_id))
  and exists (select 1 from envios e join muestras m on m.id = muestra_id where e.id = envio_id and e.plan_id = m.plan_id));

create trigger sellar before insert on envios for each row execute function sellar_registro();
create trigger auditar after insert or update or delete on envios for each row execute function auditar();
create trigger auditar after insert or update or delete on envio_muestras for each row execute function auditar();

-- Como el resto de tablas de campo: sin anon, y sin editar ni borrar desde la API (solo la RPC de anulación).
revoke all on envios, envio_muestras from anon;
revoke update, delete, truncate, references, trigger on envios, envio_muestras from authenticated;

create function anular_envio(p_envio uuid, p_motivo text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_oficina() then raise exception 'Solo la oficina anula envíos'; end if;
  if length(trim(coalesce(p_motivo, ''))) = 0 then raise exception 'El motivo de la anulación es obligatorio'; end if;
  if not exists (select 1 from envios where id = p_envio and anulado_en is null) then raise exception 'El envío no existe o ya está anulado'; end if;
  delete from envio_muestras where envio_id = p_envio;
  update envios set anulado_en = now(), anulado_por = auth.uid(), motivo_anulacion = trim(p_motivo) where id = p_envio;
end $$;

-- Nombres de quienes tienen el plan (el teléfono no puede leer los perfiles de otros usuarios).
create function integrantes_plan(p_plan uuid) returns text[] language plpgsql stable security definer set search_path = public as $$
begin
  if not (es_oficina() or es_mi_plan(p_plan)) then raise exception 'Sin acceso al plan'; end if;
  return coalesce((select array_agg(pf.nombre order by i.orden) from planes pl
    cross join lateral (values (pl.comision_id, 1), (pl.comision_id_2, 2)) as i(id, orden)
    join perfiles pf on pf.id = i.id where pl.id = p_plan), '{}');
end $$;

revoke execute on function anular_envio(uuid, text), integrantes_plan(uuid) from public, anon;
grant execute on function anular_envio(uuid, text), integrantes_plan(uuid) to authenticated;

-- Crear el envío y sus muestras en una sola operación (con los permisos de quien llama): o entra todo o no entra nada.
create function crear_envio(p_envio jsonb, p_muestras uuid[]) returns uuid language plpgsql as $$
declare v_id uuid := (p_envio ->> 'id')::uuid;
begin
  if coalesce(array_length(p_muestras, 1), 0) = 0 then raise exception 'Elige al menos una muestra'; end if;
  if exists (select 1 from muestras where id = any(p_muestras) and estado <> 'cerrada') then raise exception 'Solo se envían muestras cerradas'; end if;
  insert into envios (id, plan_id, fecha, medio_transporte, controles, temperatura_testigo, observaciones, entrega, hora_telefono)
  values (v_id, (p_envio ->> 'plan_id')::uuid, (p_envio ->> 'fecha')::date, p_envio ->> 'medio_transporte', coalesce(p_envio -> 'controles', '{}'::jsonb),
          p_envio ->> 'temperatura_testigo', p_envio ->> 'observaciones', p_envio ->> 'entrega', now());
  insert into envio_muestras (envio_id, muestra_id) select v_id, unnest(p_muestras);
  return v_id;
end $$;
revoke execute on function crear_envio(jsonb, uuid[]) from public, anon;
grant execute on function crear_envio(jsonb, uuid[]) to authenticated;
