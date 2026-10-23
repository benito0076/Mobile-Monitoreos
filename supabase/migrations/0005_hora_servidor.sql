-- La app mide el desfase de su reloj contra el servidor cada vez que tiene señal.
create function hora_servidor() returns timestamptz language sql stable set search_path = public as $$ select now() $$;
revoke execute on function hora_servidor() from public, anon;
grant execute on function hora_servidor() to authenticated;
