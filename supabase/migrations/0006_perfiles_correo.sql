-- El correo vive en auth.users (inaccesible desde el cliente); se copia para la pantalla de usuarios.
alter table perfiles add column correo text unique;
create trigger auditar after insert or update or delete on perfiles for each row execute function auditar();
