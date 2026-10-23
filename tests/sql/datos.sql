-- Usuarios: oficina (O), comisiones A y B.
insert into auth.users values ('00000000-0000-0000-0000-00000000000f'), ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into perfiles (id, rol, nombre) values
  ('00000000-0000-0000-0000-00000000000f', 'oficina', 'Oficina'),
  ('00000000-0000-0000-0000-00000000000a', 'comision', 'A'),
  ('00000000-0000-0000-0000-00000000000b', 'comision', 'B');
grant select, insert, update, delete on all tables in schema public to authenticated;
