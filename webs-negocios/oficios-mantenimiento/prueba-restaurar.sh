#!/usr/bin/env bash
# Simulacro de restauración, de punta a punta y sin datos de nadie: en una base de datos de Postgres local (nunca en
# Supabase) monta las tablas de oficios con los mismos archivos que el servidor, mete datos inventados, hace la copia
# cifrada con una llave de prueba hecha en el momento, la baja como lo hace GitHub, la descifra, la vuelve a poner en un
# esquema aparte con restaurar.mjs y compara tabla por tabla, fila por fila, que todo es igual. Después pasa pruebas.sql.
#
# Uso:  PGURL=postgresql://postgres@/postgres?host=/tmp\&port=55432 bash prueba-restaurar.sh
#       (hace falta un Postgres al que se pueda entrar como superusuario, y gpg y node)
# Crea la base de datos «oficios_simulacro» y la borra al acabar. La llave de prueba se tira al acabar.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$AQUI/.."
PGURL="${PGURL:?Pon PGURL con la dirección de un Postgres local (ver arriba)}"
BD=oficios_simulacro; T="$(mktemp -d)"; export GNUPGHOME="$T/gpg"; mkdir -m 700 "$GNUPGHOME"
P() { psql "$PGURL" -X -q -v ON_ERROR_STOP=1 "$@"; }
PB() { psql "$(echo "$PGURL" | sed "s#/postgres?#/$BD?#")" -X -q -v ON_ERROR_STOP=1 "$@"; }
mal=0; ok() { echo "  bien  $1"; }; malo() { echo "  MAL   $1"; mal=$((mal+1)); }
P -c "drop database if exists $BD" -c "create database $BD"
trap 'P -c "drop database if exists '"$BD"'" >/dev/null 2>&1 || true' EXIT

echo "── Las tablas, con los mismos archivos que el servidor"
PB <<'EOF'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema extensions; create extension pgcrypto with schema extensions;
-- pg_cron no está en un Postgres normal: lo que haría, aquí no hace nada
create schema cron; create function cron.schedule(text, text, text) returns bigint language sql as 'select 1::bigint';
EOF
for f in "$RAIZ/oficios-soporte/esquema.sql" "$RAIZ/oficios-servidor/almacen.sql" "$AQUI/esquema.sql"; do PB -f "$f" >/dev/null; done
ok "esquemas del buzón, del servidor y del mantenimiento"

echo "── Una llave de prueba (la de Oscar no está aquí ni hace falta)"
gpg --batch --quiet --pinentry-mode loopback --passphrase "" --quick-gen-key "Prueba de restaurar" rsa3072 sign never
FPR=$(gpg --list-keys --with-colons | awk -F: '/^fpr/{print $10; exit}')
gpg --batch --quiet --pinentry-mode loopback --passphrase "" --quick-add-key "$FPR" rsa3072 encrypt never
gpg --armor --export "$FPR" > "$T/publica.asc"
PB -v k="$(cat "$T/publica.asc")" -v h="$FPR" <<'EOF'
update oficios.copias_llave set huella = :'h', publica = :'k' where id = 1;
EOF
ok "llave de prueba puesta en lugar de la de Oscar"

echo "── Datos inventados, con lo difícil: tildes, €, números con decimales, claves en desorden y la columna «t» del diario"
PB <<'EOF'
insert into oficios.negocios(id, nombre, clave_hash) values ('sim-uno', 'Simulacro Uno', oficios.huella('sim-uno', 'x')), ('sim-dos', 'Simulacro Dos', oficios.huella('sim-dos', 'x'));
insert into oficios.estados(negocio, datos, v, cab) values
  ('sim-uno', '{"id":"sim-uno","zeta":1,"alfa":[1,2],"horario":{"2":[[480,840]],"1":[[480,840]]},"precio":12.50}', 3, '{"esq":4,"n":2,"contratos":[{"id":"C-1","cli":{"nombre":"Inventada"}}]}'),
  ('sim-dos', '{"id":"sim-dos"}', 1, '{"esq":4,"n":1}');
insert into oficios.avisos(negocio, id, v, datos, de, llave, vista) values
  ('sim-uno', 'S-1', 2, '{"id":"S-1","e":"hecho","tot":10.50,"cli":{"nombre":"Zoe","tel":"600111222"},"nota":"año € «comillas» \"dobles\""}', '{omar}', 'llavedeprueba12345678901', '{"id":"S-1"}'),
  ('sim-uno', 'S-2', 3, '{"id":"S-2","e":"nuevo"}', '{}', 'llavedeprueba12345678902', '{"id":"S-2"}'),
  ('sim-dos', 'D-1', 1, '{"id":"D-1","e":"cancelado"}', '{}', 'llavedeprueba12345678903', '{"id":"D-1"}');
insert into oficios.diario(negocio, v, t, q, accion, clave, res, nuevos) values
  ('sim-uno', 1, 1794700000000, '{"rol":"cliente"}', '{"tipo":"pedir","cli":{"nombre":"Zoe"}}', 'marca-de-prueba-1', '{"ok":true}', '[{"id":"S-1","llave":"llavedeprueba12345678901"}]'),
  ('sim-uno', 2, 1794700060000, '{"rol":"centralita","id":"oficina"}', '{"tipo":"asignar","id":"S-1","tec":"omar"}', '', '{"ok":true}', '[]'),
  ('sim-uno', 3, 1794700120000, '{"rol":"cliente"}', '{"tipo":"pedir"}', '', '{"ok":true}', '[{"id":"S-2","llave":"llavedeprueba12345678902"}]'),
  ('sim-dos', 1, 1794700000000, '{"rol":"cliente"}', '{"tipo":"pedir"}', '', '{"ok":true}', '[]');
insert into oficios.personas(negocio, persona, rol, quien, clave_hash) values ('sim-uno', 'oficina', 'centralita', 'oficina', oficios.huella('sim-uno:oficina', 'x'));
insert into oficios.accesos(negocio, quien, que, a) values ('sim-uno', 'oficina', 'codigo', 'omar'), ('sim-uno', 'oficina', 'baja', 'omar');
insert into oficios.clientes(negocio, tel, codigo) values ('sim-uno', '600111222', 'abcd-efgh');
insert into oficios.peticiones(negocio, tipo, texto) values ('sim-uno', 'fallo', 'Algo falla en el simulacro de restaurar.');
insert into oficios.errores(negocio, huella, pagina, tipo, mensaje, aparatos) values ('sim-uno', 'h1', 'app', 'js', 'Error del simulacro', '{"iPhone · Safari"}');
insert into oficios.olvidos(negocio, huella, avisos, diario, contratos, zona) values ('sim-dos', 'huella-de-prueba', 0, 0, 0, false);
EOF
ok "datos inventados"

echo "── La copia: hecha en la base de datos, bajada como lo hace GitHub y descifrada"
PB -At -c "select oficios.hacer_copia()" >/dev/null
PB -At -c "select public.oficios_copia()::text" > "$T/r.json"
jq -r .datos "$T/r.json" | base64 -d > "$T/copia.pgp"
[ "$(sha256sum "$T/copia.pgp" | cut -d' ' -f1)" = "$(jq -r .sha256 "$T/r.json")" ] && ok "llega entera (su huella cuadra)" || malo "no cuadra la huella"
SUB=$(gpg --list-keys --with-colons "$FPR" | awk -F: '/^sub/{print $5; exit}')
(gpg --batch --list-packets "$T/copia.pgp" 2>&1 || true) | grep -qi "keyid $SUB" && ok "cifrada para la llave (mirado sin descifrar, como GitHub)" || malo "no está cifrada para la llave"
gpg --batch --quiet --decrypt "$T/copia.pgp" > "$T/copia.json" && ok "se descifra con la llave privada" || malo "no se descifra"
[ "$(jq -r .formato "$T/copia.json")" = "ooox-oficios-copia/1" ] && ok "formato de copia" || malo "formato"
[ "$(jq '[.tablas.diario[] | type] | unique' -c "$T/copia.json")" = '["object"]' ] && ok "el diario va fila a fila (no solo su columna «t»)" || malo "el diario no va entero"

echo "── Restaurarla en un esquema aparte y compararla con lo de verdad"
node "$AQUI/restaurar.mjs" "$T/copia.json" > "$T/restaurar.sql"
PB -f "$T/restaurar.sql" >/dev/null && ok "restaurada en oficios_restaurada" || malo "no se restaura"
for t in negocios estados avisos diario personas accesos clientes peticiones errores olvidos; do
  a=$(PB -At -c "select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from (select to_jsonb(f) x from oficios.$t f) q")
  b=$(PB -At -c "select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from (select to_jsonb(f) x from oficios_restaurada.$t f) q")
  [ "$a" = "$b" ] && ok "$t: igual fila a fila" || malo "$t: distinta"
done
[ "$(PB -At -c "select string_agg(datos::text, '|' order by negocio) from oficios.estados")" = "$(PB -At -c "select string_agg(datos::text, '|' order by negocio) from oficios_restaurada.estados")" ] \
  && ok "los datos de cada negocio, letra por letra (con su orden de claves)" || malo "los datos de cada negocio cambian"
n=$(PB -At -c "insert into oficios_restaurada.peticiones(negocio, tipo, texto) values ('sim-uno', 'duda', 'Una petición nueva después de restaurar.') returning id")
[ "$n" -gt "$(PB -At -c "select max(id) from oficios.peticiones")" ] && ok "los números nuevos siguen después de los de la copia" || malo "los números nuevos chocan"

echo "── Volcarla sobre lo de verdad (lo que se haría ante un desastre) y que quede igual"
PB -c "delete from oficios.avisos where id = 'S-2'" -c "update oficios.peticiones set texto = 'Cambiado después de la copia.'"
node "$AQUI/restaurar.mjs" "$T/copia.json" --volcar > "$T/volcar.sql"
PB -f "$T/volcar.sql" >/dev/null && ok "volcada" || malo "no se vuelca"
[ "$(PB -At -c "select count(*) from oficios.avisos where id = 'S-2'")" = 1 ] && [ "$(PB -At -c "select texto from oficios.peticiones where negocio = 'sim-uno'")" = "Algo falla en el simulacro de restaurar." ] \
  && ok "vuelve a estar como en la copia" || malo "no vuelve a como estaba"

echo "── Las pruebas del mantenimiento, en esta base de datos"
r=$(PB -f "$AQUI/pruebas.sql" 2>&1 | grep -o 'RESULTADOS.*' || true)
echo "$r" | grep -q 'MAL' || [ -z "$r" ] && malo "pruebas.sql: ${r:-no ha dicho nada}" || ok "pruebas.sql: $(echo "$r" | grep -o ':ok' | wc -l) bien"

echo; [ $mal -eq 0 ] && echo "BIEN: el simulacro de restaurar sale entero" || echo "MAL: $mal cosas"
exit $((mal > 0))
