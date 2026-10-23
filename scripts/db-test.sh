#!/usr/bin/env bash
# Prueba las migraciones y RLS en un Postgres temporal (necesita binarios de Postgres 16; corre como usuario postgres).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d); chmod 755 "$DIR"; chown postgres "$DIR"
PORT=54329
run() { su postgres -c "$*"; }
trap 'run "$PGBIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
run "$PGBIN/initdb -D $DIR/data -A trust" >/dev/null
run "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log -w start" >/dev/null
P="$PGBIN/psql -X -q -h $DIR -p $PORT -v ON_ERROR_STOP=1"
run "$P -d postgres -c 'create database t'"
run "$P -d t -f $ROOT/tests/sql/stub_supabase.sql"
for f in $ROOT/supabase/migrations/*.sql; do run "$P -d t -f $f"; done
run "$P -d t -f $ROOT/supabase/seed.sql"
run "$P -d t -f $ROOT/tests/sql/datos.sql"
run "$P -d t -f $ROOT/tests/sql/rls.sql"

# Concurrencia: dos sesiones se disputan 500 planes; cada plan debe tener un solo ganador.
run "$P -d t -c \"insert into planes (nombre) select 'c'||g from generate_series(1,500) g\""
SQL="set role authenticated; select set_config('request.jwt.claim.sub','%s',false); select count(*) filter (where tomar_plan(id)) from planes where nombre like 'c%%'"
run "$P -At -d t -c \"$(printf "$SQL" 00000000-0000-0000-0000-00000000000a)\" | tail -1 > $DIR/a" &
run "$P -At -d t -c \"$(printf "$SQL" 00000000-0000-0000-0000-00000000000b)\" | tail -1 > $DIR/b" &
wait
TOT=$(( $(cat $DIR/a) + $(cat $DIR/b) ))
echo "victorias A=$(cat $DIR/a) B=$(cat $DIR/b) total=$TOT"; [ "$TOT" = 500 ]
echo "DB OK"
