-- Volver a tomar un plan que ya es tuyo es válido (reintento tras un corte, o teléfono nuevo): devuelve true.
-- Sigue siendo imposible quitarle un plan a otra comisión: ahí devuelve false.
create or replace function tomar_plan(p_plan uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfiles where id = auth.uid() and rol = 'comision' and activo) then
    raise exception 'Solo una comisión activa puede tomar un plan';
  end if;
  update planes set comision_id = auth.uid(), tomado_en = coalesce(tomado_en, now())
   where id = p_plan and (comision_id is null or comision_id = auth.uid());
  return found;
end $$;
