-- Errores no controlados de la app (best-effort). Cada usuario inserta los suyos; solo la oficina los lee.
create table errores_cliente (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mensaje text not null check (length(mensaje) <= 500),
  pila text check (length(pila) <= 4000),
  url text check (length(url) <= 300),
  version_app text check (length(version_app) <= 20)
);
create index on errores_cliente (creado_en desc);

alter table errores_cliente enable row level security;
create policy errores_ins on errores_cliente for insert with check (usuario_id = auth.uid());
create policy errores_ver on errores_cliente for select using (es_oficina());

revoke all on errores_cliente from anon;
revoke update, delete, truncate, references, trigger on errores_cliente from authenticated;
