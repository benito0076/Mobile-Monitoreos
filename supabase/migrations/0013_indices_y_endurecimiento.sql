-- Índices para acelerar las políticas RLS (es_mi_plan, es_mi_muestra) y las consultas por plan/muestra.
create index if not exists planes_comision_id_idx on planes (comision_id);
create index if not exists planes_comision_id_2_idx on planes (comision_id_2);
create index if not exists descripciones_punto_muestra_id_idx on descripciones_punto (muestra_id);
create index if not exists fotos_muestra_id_idx on fotos (muestra_id);

-- Nombres exactos de los parámetros de todos los planes cargados (solo invocable por la oficina).
create or replace function nombres_parametros() returns table (parametro text, es_insitu boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_oficina() then raise exception 'Solo la oficina consulta el catálogo de parámetros'; end if;
  return query select mp.parametro, bool_or(mp.es_insitu) from muestra_parametros mp group by mp.parametro order by mp.parametro;
end $$;
revoke execute on function nombres_parametros() from public, anon;
grant execute on function nombres_parametros() to authenticated;

