-- Supabase da por defecto todos los privilegios a anon y authenticated. Se deja solo lo que la app usa:
-- las tablas de campo son de solo inserción también por privilegio (no solo por política y trigger).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke update, delete on mediciones, descripciones_punto, fotos from authenticated;
revoke insert, update, delete on auditoria from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
