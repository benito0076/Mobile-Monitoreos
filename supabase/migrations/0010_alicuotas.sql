-- Monitoreos compuestos: cada alícuota tiene su propia lectura de cada parámetro in situ.
-- Vacío = muestra puntual. La cadena de versiones (correcciones) es por muestra + parámetro + alícuota.
alter table mediciones add column alicuota smallint check (alicuota is null or alicuota > 0);
create index on mediciones (muestra_id, parametro, alicuota, version);

create or replace function sellar_registro() returns trigger language plpgsql security definer set search_path = public as $$
declare umbral numeric := (select valor from configuracion where clave = 'umbral_reloj_s');
begin
  new.hora_servidor := now();
  new.usuario_id := coalesce(auth.uid(), new.usuario_id);
  if tg_table_name = 'mediciones' then
    if new.reemplaza_a is not null and not exists (
      select 1 from mediciones o where o.id = new.reemplaza_a and o.muestra_id = new.muestra_id
         and o.parametro = new.parametro and o.alicuota is not distinct from new.alicuota and o.version = new.version - 1) then
      raise exception 'La corrección debe reemplazar la versión anterior de la misma muestra, parámetro y alícuota';
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
