-- Esquema base. Las tablas de datos de campo son de solo inserción (ver triggers).

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('oficina', 'comision')),
  nombre text not null default '',
  activo boolean not null default true
);

create table configuracion (
  clave text primary key,
  valor numeric not null
);
insert into configuracion values ('umbral_reloj_s', 300), ('umbral_gps_m', 30);

create table planes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  archivo_origen text,
  cargado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  comision_id uuid references auth.users(id), -- nulo = disponible
  tomado_en timestamptz
);

create table muestras (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references planes(id) on delete cascade,
  codigo text not null,          -- copiado exacto del plan; llave con Sampler
  punto_texto text not null,     -- texto original, sin tocar
  punto_codigo text,             -- LAM2249-00xx si existe
  tipo text,
  matriz text,
  submatriz text,
  fecha_planeada timestamptz,    -- no es la fecha de toma
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_campo', 'cerrada')),
  unique (plan_id, codigo)
);

create table muestra_parametros (
  id uuid primary key default gen_random_uuid(),
  muestra_id uuid not null references muestras(id) on delete cascade,
  parametro text not null,       -- texto exacto del plan (incluye espacios finales)
  es_insitu boolean not null default false,
  unique (muestra_id, parametro)
);

create table parametros_insitu (
  nombre text primary key,       -- nombre exacto del plan
  unidad text not null default '',
  minimo numeric,                -- rango plausible: advierte, no bloquea
  maximo numeric,
  obligatorio boolean not null default false
);

create table mediciones (
  id uuid primary key,           -- UUID generado en el teléfono
  muestra_id uuid not null references muestras(id),
  parametro text not null,
  valor text not null,
  unidad text not null default '',
  hora_telefono timestamptz not null,
  hora_servidor timestamptz not null default now(),
  desfase_reloj_s numeric,       -- servidor - teléfono, medido en el último contacto con el servidor
  lat double precision,
  lon double precision,
  precision_m real,
  usuario_id uuid references auth.users(id),
  equipo_id text,
  version_app text,
  marcada boolean not null default false,
  motivo_marca text,
  version integer not null default 1,
  reemplaza_a uuid references mediciones(id),
  motivo_correccion text,
  check ((reemplaza_a is null) = (version = 1)),
  check (reemplaza_a is null or length(trim(coalesce(motivo_correccion, ''))) > 0)
);
create index on mediciones (muestra_id, parametro, version);

create table descripciones_punto (
  id uuid primary key,
  muestra_id uuid not null references muestras(id),
  texto text not null,
  hora_telefono timestamptz not null,
  hora_servidor timestamptz not null default now(),
  usuario_id uuid references auth.users(id),
  version integer not null default 1,
  reemplaza_a uuid references descripciones_punto(id),
  motivo_correccion text,
  check ((reemplaza_a is null) = (version = 1)),
  check (reemplaza_a is null or length(trim(coalesce(motivo_correccion, ''))) > 0)
);

create table fotos (
  id uuid primary key,
  muestra_id uuid not null references muestras(id),
  ruta_storage text not null,    -- plan_id/codigo/uuid.jpg
  hora_telefono timestamptz not null,
  hora_servidor timestamptz not null default now(),
  lat double precision,
  lon double precision,
  usuario_id uuid references auth.users(id)
);

create table auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text,
  accion text not null,
  usuario_id uuid,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

-- Solo inserción: ninguna fila cerrada se edita ni se borra.
create function bloquear_cambios() returns trigger language plpgsql as $$
begin
  raise exception 'La tabla % es de solo inserción; una corrección es una versión nueva', tg_table_name;
end $$;

create trigger solo_insercion before update or delete on mediciones for each row execute function bloquear_cambios();
create trigger solo_insercion before update or delete on descripciones_punto for each row execute function bloquear_cambios();
create trigger solo_insercion before update or delete on fotos for each row execute function bloquear_cambios();
create trigger solo_insercion before update or delete on auditoria for each row execute function bloquear_cambios();

-- Auditoría de todo lo que cambia (security definer: los usuarios no escriben en auditoria).
create function auditar() returns trigger language plpgsql security definer set search_path = public as $$
declare fila jsonb := to_jsonb(coalesce(new, old));
begin
  insert into auditoria (tabla, registro_id, accion, usuario_id, detalle)
  values (tg_table_name, coalesce(fila ->> 'id', fila ->> 'nombre'), tg_op, auth.uid(), fila);
  return null;
end $$;

create trigger auditar after insert or update or delete on planes for each row execute function auditar();
create trigger auditar after insert or update or delete on muestras for each row execute function auditar();
create trigger auditar after insert or update or delete on mediciones for each row execute function auditar();
create trigger auditar after insert or update or delete on descripciones_punto for each row execute function auditar();
create trigger auditar after insert or update or delete on fotos for each row execute function auditar();
create trigger auditar after insert or update or delete on parametros_insitu for each row execute function auditar();

-- Sello del servidor: el cliente no puede falsear hora_servidor, usuario ni la marca de reloj.
create function sellar_registro() returns trigger language plpgsql security definer set search_path = public as $$
declare umbral numeric := (select valor from configuracion where clave = 'umbral_reloj_s');
begin
  new.hora_servidor := now();
  new.usuario_id := coalesce(auth.uid(), new.usuario_id);
  if tg_table_name = 'mediciones' then
    if new.reemplaza_a is not null and not exists (
      select 1 from mediciones o where o.id = new.reemplaza_a and o.muestra_id = new.muestra_id
         and o.parametro = new.parametro and o.version = new.version - 1) then
      raise exception 'La corrección debe reemplazar la versión anterior de la misma muestra y parámetro';
    end if;
    new.marcada := false; new.motivo_marca := null;
    if abs(coalesce(new.desfase_reloj_s, 0)) > umbral then
      new.marcada := true;
      new.motivo_marca := format('Reloj del teléfono desfasado %s s respecto al servidor', round(new.desfase_reloj_s));
    elsif new.hora_telefono > now() + make_interval(secs => umbral) then
      new.marcada := true;
      new.motivo_marca := 'Hora del teléfono en el futuro respecto al servidor';
    end if;
  end if;
  return new;
end $$;

create trigger sellar before insert on mediciones for each row execute function sellar_registro();
create trigger sellar before insert on descripciones_punto for each row execute function sellar_registro();
create trigger sellar before insert on fotos for each row execute function sellar_registro();
