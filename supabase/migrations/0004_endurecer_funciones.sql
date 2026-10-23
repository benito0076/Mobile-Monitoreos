-- Las funciones de trigger no deben ser invocables por la API; los auxiliares de RLS solo por usuarios con sesión.
alter function bloquear_cambios() set search_path = public;
alter function muestras_solo_estado() set search_path = public;

revoke execute on function auditar(), sellar_registro(), bloquear_cambios(), muestras_solo_estado()
  from public, anon, authenticated;
revoke execute on function es_oficina(), es_mi_plan(uuid), es_mi_muestra(uuid) from public, anon;
grant execute on function es_oficina(), es_mi_plan(uuid), es_mi_muestra(uuid) to authenticated;
