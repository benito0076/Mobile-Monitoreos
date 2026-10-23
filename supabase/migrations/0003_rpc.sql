-- Operaciones atómicas. Todas son security definer y validan el rol por dentro.

-- Elegir plan: actualización condicionada; solo gana quien lo toma primero.
create function tomar_plan(p_plan uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfiles where id = auth.uid() and rol = 'comision' and activo) then
    raise exception 'Solo una comisión activa puede tomar un plan';
  end if;
  update planes set comision_id = auth.uid(), tomado_en = now()
   where id = p_plan and comision_id is null;
  return found; -- false = ya estaba tomado
end $$;

create function liberar_plan(p_plan uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_oficina() then raise exception 'Solo la oficina libera planes'; end if;
  update planes set comision_id = null, tomado_en = null where id = p_plan;
end $$;

-- Los datos ya registrados se conservan y los ve la nueva comisión (las políticas dependen del plan).
create function reasignar_plan(p_plan uuid, p_comision uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_oficina() then raise exception 'Solo la oficina reasigna planes'; end if;
  if not exists (select 1 from perfiles where id = p_comision and rol = 'comision' and activo) then
    raise exception 'La comisión destino no existe o está inactiva';
  end if;
  update planes set comision_id = p_comision, tomado_en = now() where id = p_plan;
end $$;

-- Carga transaccional. p_muestras: [{codigo, punto_texto, punto_codigo, tipo, matriz, submatriz,
-- fecha_planeada, parametros: [texto exacto, ...]}]
create function cargar_plan(p_nombre text, p_archivo text, p_muestras jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_plan uuid; m jsonb; v_muestra uuid;
begin
  if not es_oficina() then raise exception 'Solo la oficina carga planes'; end if;
  insert into planes (nombre, archivo_origen, cargado_por) values (p_nombre, p_archivo, auth.uid()) returning id into v_plan;
  for m in select * from jsonb_array_elements(p_muestras) loop
    insert into muestras (plan_id, codigo, punto_texto, punto_codigo, tipo, matriz, submatriz, fecha_planeada)
    values (v_plan, m ->> 'codigo', m ->> 'punto_texto', m ->> 'punto_codigo', m ->> 'tipo', m ->> 'matriz',
            m ->> 'submatriz', (m ->> 'fecha_planeada')::timestamptz)
    returning id into v_muestra;
    insert into muestra_parametros (muestra_id, parametro, es_insitu)
    select v_muestra, p, exists (select 1 from parametros_insitu i where i.nombre = p)
      from jsonb_array_elements_text(m -> 'parametros') p;
  end loop;
  return v_plan;
end $$;

revoke all on function tomar_plan, liberar_plan, reasignar_plan, cargar_plan from public, anon;
grant execute on function tomar_plan, liberar_plan, reasignar_plan, cargar_plan to authenticated;
