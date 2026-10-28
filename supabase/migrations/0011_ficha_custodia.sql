-- Datos del encabezado de la cadena de custodia (FM-017) que el plan de monitoreo no trae:
-- cliente, codigo_muestreo, cotizacion, municipio, departamento. Los edita la oficina (RLS: planes_oficina).
alter table planes add column ficha jsonb not null default '{}'::jsonb;
