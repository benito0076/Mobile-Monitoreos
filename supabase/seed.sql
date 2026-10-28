-- Nombres EXACTOS del plan (algunos traen espacio al final). A revisar con el laboratorio.
insert into parametros_insitu (nombre, unidad, minimo, maximo, obligatorio) values
  ('pH', 'unidades de pH', 0, 14, true),
  ('Agua - Temperatura ', '°C', 0, 50, true),
  ('Agua - Oxígeno Disuelto ', 'mg/L', 0, 20, true),
  ('Agua - Conductividad a 25°C In Situ - Puntual', 'µS/cm', 0, 100000, true),
  ('Agua - Caudal > 2 m3/s y < 10 m3/s', 'm3/s', 2, 10, false)
on conflict do nothing;

-- Plan de aguas residuales (Muestreo 1128-26): nombres exactos del plan. Unidad vacía = pendiente de definir.
insert into parametros_insitu (nombre, unidad, minimo, maximo, obligatorio) values
  ('Agua - pH Compuesto', 'unidades de pH', 0, 14, false),
  ('Agua - Temperatura - Compuesto', '°C', null, null, false),
  ('Agua - Temperatura en la zona de mezcla térmica', '°C', null, null, false),
  ('Agua - Caudal Compuesto', '', null, null, false),
  ('Agua - Sólidos Sedimentables - Compuesto', '', null, null, false)
on conflict do nothing;
