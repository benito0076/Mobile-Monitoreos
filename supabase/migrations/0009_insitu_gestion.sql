-- Gestión de la lista de parámetros in situ: la marca es_insitu se calcula al cargar el plan, así que
-- reaplicar_insitu() la vuelve a calcular para los planes ya cargados cuando la lista cambia.
create function reaplicar_insitu() returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not es_oficina() then raise exception 'Solo la oficina reaplica la lista de parámetros in situ'; end if;
  update muestra_parametros mp
     set es_insitu = exists (select 1 from parametros_insitu i where i.nombre = mp.parametro)
   where mp.es_insitu is distinct from exists (select 1 from parametros_insitu i where i.nombre = mp.parametro);
  get diagnostics n = row_count;
  return n;
end $$;

-- Nombres exactos de los parámetros de los planes visibles (para elegirlos de una lista y no retipearlos).
create function nombres_parametros() returns table (parametro text, es_insitu boolean)
language sql stable set search_path = public as $$
  select mp.parametro, bool_or(mp.es_insitu) from muestra_parametros mp group by mp.parametro order by mp.parametro
$$;

revoke execute on function reaplicar_insitu(), nombres_parametros() from public, anon;
grant execute on function reaplicar_insitu(), nombres_parametros() to authenticated;
