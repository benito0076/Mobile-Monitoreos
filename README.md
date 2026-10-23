# Captura de campo offline para muestreo ambiental (prototipo)

PWA para comisiones de muestreo (sin conexión) y panel de oficina. Backend: Supabase. Interfaz en español (Colombia).

## Puesta en marcha

```bash
npm install
cp .env.example .env     # completa VITE_SUPABASE_ANON_KEY (Supabase → Project Settings → API Keys). Nunca la service_role.
npm run dev
```

Pruebas: `npm test` (lógica, lectura del Excel, cola de sincronización) y `npm run test:db` (migraciones y RLS en un Postgres temporal; necesita binarios de Postgres 16 y permisos para `su postgres`).

## Base de datos y funciones

- Migraciones en `supabase/migrations/` (aplicar en orden), datos iniciales en `supabase/seed.sql`.
- Función `supabase/functions/gestionar-usuarios` (crea usuarios, los activa/desactiva y restablece contraseñas; usa la clave `service_role` solo en el servidor). Desplegar con `supabase functions deploy gestionar-usuarios`.

## Primera cuenta de oficina

Las demás cuentas se crean desde la pantalla **Usuarios**. La primera se crea a mano:

1. Supabase → Authentication → Users → *Add user* (correo y contraseña, marcando *Auto Confirm User*).
2. En el editor SQL: `insert into perfiles (id, rol, nombre, correo) select id, 'oficina', 'Oficina', email from auth.users where email = 'tu@correo';`

## Cuidado al liberar o reasignar un plan

Los datos ya enviados se conservan y los ve la nueva comisión, pero lo que el teléfono anterior no haya sincronizado ya no podrá enviarse (RLS). Pide a la comisión que sincronice antes, o usa su «exportación de emergencia».
