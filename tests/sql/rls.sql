\set ON_ERROR_STOP on
\set O '''00000000-0000-0000-0000-00000000000f'''
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''

-- helper de aserciones
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not c then raise exception 'FALLÓ: %', msg; end if; end $$;

set role authenticated; select set_config('request.jwt.claim.sub', :O, false);
select cargar_plan('Plan 1', 'x.xls', '[{"codigo":"1-26","punto_texto":"P","parametros":["pH","Agua - Temperatura ","Otro"]}]') as plan \gset
select pg_temp.ok((select count(*) from muestra_parametros where es_insitu) = 2, 'es_insitu usa nombre exacto (con espacio final)');

-- Lista in situ editable: al añadir un nombre, reaplicar_insitu() re-marca los planes ya cargados (solo la oficina)
select pg_temp.ok((select count(*) from nombres_parametros()) = 3, 'nombres_parametros lista los 3 nombres exactos');
insert into parametros_insitu (nombre, unidad) values ('Otro', 'x');
select pg_temp.ok(reaplicar_insitu() = 1, 'reaplicar_insitu re-marca 1 parámetro');
select pg_temp.ok((select es_insitu from muestra_parametros where parametro = 'Otro'), 'Otro quedó in situ');
select pg_temp.ok(reaplicar_insitu() = 0, 'reaplicar de nuevo no cambia nada');
delete from parametros_insitu where nombre = 'Otro';
select pg_temp.ok(reaplicar_insitu() = 1, 'al quitarlo de la lista se desmarca');
select set_config('request.jwt.claim.sub', :A, false);
do $$ begin perform reaplicar_insitu(); raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;
select set_config('request.jwt.claim.sub', :O, false);
select id as muestra from muestras where plan_id = :'plan' \gset

-- la comisión no puede cargar planes
select set_config('request.jwt.claim.sub', :A, false);
do $$ begin perform cargar_plan('x','x','[]'); raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;

-- toma: A gana, B pierde
select pg_temp.ok(tomar_plan(:'plan'), 'A toma el plan');
select set_config('request.jwt.claim.sub', :B, false);
select pg_temp.ok(not tomar_plan(:'plan'), 'B no puede tomar un plan ya tomado');
select pg_temp.ok((select count(*) from muestras) = 0, 'B no ve muestras del plan de A');

-- A puede volver a tomar su propio plan (reintento / teléfono nuevo) sin cambiar la fecha de toma; B sigue sin poder
select set_config('request.jwt.claim.sub', :A, false);
select tomado_en as t0 from planes where id = :'plan' \gset
select pg_temp.ok(tomar_plan(:'plan'), 'A puede volver a tomar su propio plan');
select pg_temp.ok((select tomado_en = :'t0'::timestamptz from planes where id = :'plan'), 'la fecha de toma no cambia');
select set_config('request.jwt.claim.sub', :B, false);
select pg_temp.ok(not tomar_plan(:'plan'), 'B sigue sin poder tomar el plan de A');

-- A registra; upsert idempotente (ON CONFLICT DO NOTHING)
select set_config('request.jwt.claim.sub', :A, false);
insert into mediciones (id, muestra_id, parametro, valor, hora_telefono)
  values ('11111111-1111-1111-1111-111111111111', :'muestra', 'pH', '7.1', now()) on conflict (id) do nothing;
insert into mediciones (id, muestra_id, parametro, valor, hora_telefono)
  values ('11111111-1111-1111-1111-111111111111', :'muestra', 'pH', '7.1', now()) on conflict (id) do nothing;
select pg_temp.ok((select count(*) from mediciones) = 1, 'reintento no duplica');
select pg_temp.ok((select usuario_id from mediciones) = :A::uuid, 'usuario sellado por el servidor');

-- inmutabilidad
-- sin privilegio de UPDATE, DELETE ni TRUNCATE: se rechaza con error
do $$ begin update mediciones set valor = '9'; raise exception 'debió fallar'; exception when insufficient_privilege then null; end $$;
do $$ begin delete from mediciones; raise exception 'debió fallar'; exception when insufficient_privilege then null; end $$;
do $$ begin truncate mediciones; raise exception 'debió fallar'; exception when insufficient_privilege then null; end $$;
do $$ begin insert into auditoria (tabla, accion) values ('x', 'x'); raise exception 'debió fallar'; exception when insufficient_privilege then null; end $$;
select pg_temp.ok((select valor from mediciones where id = '11111111-1111-1111-1111-111111111111') = '7.1', 'mediciones intactas');

-- corrección: exige motivo y versión consecutiva
do $$ begin
  insert into mediciones (id, muestra_id, parametro, valor, hora_telefono, version, reemplaza_a)
  values (gen_random_uuid(), (select id from muestras), 'pH', '7.3', now(), 2, '11111111-1111-1111-1111-111111111111');
  raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;
insert into mediciones (id, muestra_id, parametro, valor, hora_telefono, version, reemplaza_a, motivo_correccion)
  values ('22222222-2222-2222-2222-222222222222', :'muestra', 'pH', '7.3', now(), 2, '11111111-1111-1111-1111-111111111111', 'error de lectura');

-- alícuotas: la cadena de versiones es por muestra + parámetro + alícuota
insert into mediciones (id, muestra_id, parametro, alicuota, valor, hora_telefono) values
  ('44444444-4444-4444-4444-444444444441', :'muestra', 'pH', 1, '7', now()),
  ('44444444-4444-4444-4444-444444444442', :'muestra', 'pH', 2, '7.5', now());
do $$ begin
  insert into mediciones (id, muestra_id, parametro, alicuota, valor, hora_telefono, version, reemplaza_a, motivo_correccion)
  values (gen_random_uuid(), (select id from muestras), 'pH', 1, '9', now(), 2, '44444444-4444-4444-4444-444444444442', 'x');
  raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;
insert into mediciones (id, muestra_id, parametro, alicuota, valor, hora_telefono, version, reemplaza_a, motivo_correccion)
  values (gen_random_uuid(), :'muestra', 'pH', 2, '7.6', now(), 2, '44444444-4444-4444-4444-444444444442', 'lectura');
do $$ begin
  insert into mediciones (id, muestra_id, parametro, alicuota, valor, hora_telefono) values (gen_random_uuid(), (select id from muestras), 'pH', 0, '1', now());
  raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;

-- marca por reloj desfasado (no se rechaza)
insert into mediciones (id, muestra_id, parametro, valor, hora_telefono, desfase_reloj_s)
  values ('33333333-3333-3333-3333-333333333333', :'muestra', 'Otro', '1', now(), 400);
select pg_temp.ok((select marcada from mediciones where id = '33333333-3333-3333-3333-333333333333'), 'desfase > 5 min marca el registro');
select pg_temp.ok(not (select marcada from mediciones where id = '11111111-1111-1111-1111-111111111111'), 'sin desfase no se marca');

-- B no puede escribir en el plan de A
select set_config('request.jwt.claim.sub', :B, false), set_config('t.m', :'muestra', false);
do $$ begin
  insert into mediciones (id, muestra_id, parametro, valor, hora_telefono) values (gen_random_uuid(), current_setting('t.m')::uuid, 'pH', '1', now());
  raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;

-- la comisión no cambia más que el estado de la muestra
select set_config('request.jwt.claim.sub', :A, false);
update muestras set estado = 'cerrada';
do $$ begin update muestras set estado = 'pendiente'; raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;
do $$ begin update muestras set codigo = 'otro'; raise exception 'debió fallar'; exception when others then if sqlerrm like 'debió%' then raise; end if; end $$;

-- reasignar conserva los datos y los ve la nueva comisión
select set_config('request.jwt.claim.sub', :O, false);
select reasignar_plan(:'plan', :B::uuid);
select set_config('request.jwt.claim.sub', :B, false);
select pg_temp.ok((select count(*) from mediciones) = 6, 'B ve los datos tras la reasignación');
select set_config('request.jwt.claim.sub', :A, false);
select pg_temp.ok((select count(*) from mediciones) = 0, 'A ya no ve el plan');

-- auditoría: solo la oficina la lee y no se edita
select pg_temp.ok((select count(*) from auditoria) = 0, 'comisión no lee auditoría');
select set_config('request.jwt.claim.sub', :O, false);
select pg_temp.ok((select count(*) from auditoria) > 0, 'oficina lee auditoría');
-- anon no tiene acceso a nada
select set_config('request.jwt.claim.sub', '', false);
reset role; set role anon;
do $$ begin perform count(*) from planes; raise exception 'debió fallar'; exception when insufficient_privilege then null; end $$;
\echo RLS OK
