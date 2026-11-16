-- Pruebas del almacén del servidor (almacen.sql), pasadas en la base de datos de verdad y deshechas al acabar:
-- el bloque termina con un error a propósito, que lleva el resultado y no deja nada escrito.
-- Tiene que decir «ok» en las 37. Se pasan con el conector de Supabase de Claude o en el editor SQL del proyecto.
do $$
declare
  r text[] := '{}'; j jsonb; k jsonb; n int;
  av1 jsonb := '{"id":"P-0001","v":1,"datos":{"id":"P-0001","n":1,"e":"nuevo","tec":"","cli":{"nombre":"Montse"}},"de":[],"llave":"aaaaaaaaaaaaaaaaaaaaaaaa","vista":{"id":"P-0001","e":"nuevo"}}';
  av2 jsonb := '{"id":"P-0002","v":2,"datos":{"id":"P-0002","n":2,"e":"asignado","tec":"ana-id"},"de":["ana-id"],"llave":"bbbbbbbbbbbbbbbbbbbbbbbb","vista":{"id":"P-0002","e":"asignado"}}';
  cab jsonb := '{"esq":4,"n":1,"nu":0,"ausencias":[]}';
begin
  insert into oficios.negocios(id, nombre, prueba, clave_hash) values ('prueba-srv', 'Prueba servidor', true, oficios.huella('prueba-srv', 'x')), ('prueba-srv2', 'Prueba servidor 2', true, oficios.huella('prueba-srv2', 'x'));
  insert into oficios.estados(negocio, datos, cab) values ('prueba-srv', '{"serie":"P","zeta":1,"alfa":{"b":1,"a":2},"id":"prueba-srv"}', '{"esq":4,"n":0,"nu":0,"ausencias":[]}'), ('prueba-srv2', '{"id":"prueba-srv2","serie":"Q"}', '{"esq":4,"n":0,"nu":0,"ausencias":[]}');
  insert into oficios.personas(negocio, persona, rol, quien, clave_hash) values
    ('prueba-srv', 'oficina', 'centralita', 'oficina', oficios.huella('prueba-srv:oficina', 'codigo-oficina-1')),
    ('prueba-srv', 'ana', 'tecnico', 'ana-id', oficios.huella('prueba-srv:ana', 'codigo-ana-1')),
    ('prueba-srv2', 'oficina', 'centralita', 'oficina', oficios.huella('prueba-srv2:oficina', 'codigo-oficina-2'));
  insert into oficios.personas(negocio, persona, rol, quien, clave_hash, activo) values ('prueba-srv', 'baja', 'tecnico', 'baja-id', oficios.huella('prueba-srv:baja', 'codigo-baja-1'), false);

  -- 1. desde fuera no se leen las tablas ni se llama a la puerta del juez
  perform set_config('role', 'anon', true);
  begin perform 1 from oficios.avisos limit 1; r := array_append(r, '1:MAL'); exception when insufficient_privilege then r := array_append(r, '1:ok'); end;
  begin perform 1 from oficios.personas limit 1; r := array_append(r, '2:MAL'); exception when insufficient_privilege then r := array_append(r, '2:ok'); end;
  begin perform public.oficios_srv('negocio', '{"negocio":"prueba-srv"}'); r := array_append(r, '3:MAL'); exception when insufficient_privilege then r := array_append(r, '3:ok'); end;
  perform set_config('role', 'authenticated', true);
  begin perform public.oficios_srv('vivos', '{"negocio":"prueba-srv"}'); r := array_append(r, '4:MAL'); exception when insufficient_privilege then r := array_append(r, '4:ok'); end;

  -- 2. el juez entra con la llave de servicio
  perform set_config('role', 'service_role', true);
  j := public.oficios_srv('negocio', '{"negocio":"prueba-srv"}');
  r := array_append(r, case when j ->> 'id' = 'prueba-srv' and (j ->> 'activo')::boolean and (j ->> 'v')::int = 0 and j ->> 'datos_txt' = '{"serie":"P","zeta":1,"alfa":{"b":1,"a":2},"id":"prueba-srv"}' and j -> 'cab' ->> 'esq' = '4'
    and public.oficios_srv('negocio', '{"negocio":"no-existe"}') is null and public.oficios_srv('otra-cosa', '{"negocio":"prueba-srv"}') is null then '5:ok' else '5:MAL' end);

  -- 3. quién es
  r := array_append(r, case when
        public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"oficina","codigo":"codigo-oficina-1","red":"r0"}') = '{"rol":"centralita","id":"oficina"}'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"codigo-ana-1","red":"r0"}') = '{"rol":"tecnico","id":"ana-id"}'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"nadie","codigo":"codigo-oficina-1","red":"r0"}') is null
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"baja","codigo":"codigo-baja-1","red":"r0"}') is null
    and public.oficios_srv('entra', '{"negocio":"prueba-srv2","persona":"oficina","codigo":"codigo-oficina-1","red":"r0"}') is null
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"oficina","red":"r0"}') is null
    and public.oficios_srv('entra', '{"negocio":"no-existe","persona":"oficina","codigo":"codigo-oficina-1","red":"r0"}') is null
    then '6:ok' else '6:MAL' end);
  perform set_config('role', 'none', true);
  select count(*) into n from oficios.intentos_persona where negocio like 'prueba-srv%';
  r := array_append(r, case when n = 1 and (select char_length(clave_hash) = 64 and clave_hash !~ 'codigo' from oficios.personas where negocio = 'prueba-srv' and persona = 'ana') then '7:ok' else '7:MAL' end);   -- solo cuenta el fallo de una persona que existe; el código no se guarda
  perform set_config('role', 'service_role', true);

  -- 4. diez códigos fallados desde una conexión la bloquean a ella, no a las demás
  for i in 1..10 loop perform public.oficios_srv('entra', jsonb_build_object('negocio', 'prueba-srv', 'persona', 'ana', 'codigo', 'malo-' || i, 'red', 'r1')); end loop;
  r := array_append(r, case when public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"codigo-ana-1","red":"r1"}') = '"bloqueo"'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"codigo-ana-1","red":"r2"}') = '{"rol":"tecnico","id":"ana-id"}'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"oficina","codigo":"codigo-oficina-1","red":"r1"}') = '{"rol":"centralita","id":"oficina"}'::jsonb
    then '8:ok' else '8:MAL' end);

  -- 5. guardar: todo de una vez y solo si nadie se ha adelantado
  j := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 0, 'cambio', jsonb_build_object('v', 1, 'cab', cab, 'avisos', jsonb_build_array(av1),
    'diario', '{"v":1,"t":1794600000000,"q":{"rol":"centralita","id":"oficina"},"accion":{"tipo":"pedir"},"clave":"centralita:oficina|marca-000000000001","res":{"ok":true,"r":{"ok":true,"id":"P-0001"},"v":1},"nuevos":[{"id":"P-0001","llave":"aaaaaaaaaaaaaaaaaaaaaaaa"}]}'::jsonb)));
  perform set_config('role', 'none', true);
  r := array_append(r, case when j = '{"ok":true}'::jsonb and (select e.v = 1 and e.cab ->> 'n' = '1' from oficios.estados e where e.negocio = 'prueba-srv')
    and (select a.v = 1 and a.llave = 'aaaaaaaaaaaaaaaaaaaaaaaa' and a.de = '{}' and a.vista ->> 'e' = 'nuevo' from oficios.avisos a where a.negocio = 'prueba-srv' and a.id = 'P-0001')
    and (select d.t = 1794600000000 and d.q ->> 'rol' = 'centralita' and d.accion ->> 'tipo' = 'pedir' from oficios.diario d where d.negocio = 'prueba-srv' and d.v = 1) then '9:ok' else '9:MAL' end);
  perform set_config('role', 'service_role', true);
  -- con la versión vieja no entra, y no cambia nada
  j := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 0, 'cambio', jsonb_build_object('v', 1, 'cab', '{"esq":4,"n":99}'::jsonb, 'avisos', jsonb_build_array(jsonb_set(av1, '{datos,e}', '"cancelado"')), 'diario', '{"v":1,"t":1,"q":{},"accion":{},"res":{}}'::jsonb)));
  k := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 1, 'cambio', jsonb_build_object('v', 3, 'cab', cab, 'avisos', '[]'::jsonb, 'diario', '{"v":3,"t":1,"q":{},"accion":{},"res":{}}'::jsonb)));
  perform set_config('role', 'none', true);
  r := array_append(r, case when j = '{"ok":false}'::jsonb and k = '{"ok":false}'::jsonb and (select e.v = 1 and e.cab ->> 'n' = '1' from oficios.estados e where e.negocio = 'prueba-srv')
    and (select a.datos ->> 'e' = 'nuevo' from oficios.avisos a where a.negocio = 'prueba-srv' and a.id = 'P-0001') and (select count(*) = 1 from oficios.diario where negocio = 'prueba-srv') then '10:ok' else '10:MAL' end);
  perform set_config('role', 'service_role', true);
  -- una marca repetida, o un aviso nuevo sin llave: no entra y la versión no sube (no queda nada a medias)
  j := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 1, 'cambio', jsonb_build_object('v', 2, 'cab', '{"esq":4,"n":2}'::jsonb, 'avisos', jsonb_build_array(av2),
    'diario', '{"v":2,"t":2,"q":{},"accion":{},"clave":"centralita:oficina|marca-000000000001","res":{}}'::jsonb)));
  k := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 1, 'cambio', jsonb_build_object('v', 2, 'cab', '{"esq":4,"n":2}'::jsonb, 'avisos', jsonb_build_array(av2 - 'llave'), 'diario', '{"v":2,"t":2,"q":{},"accion":{},"res":{}}'::jsonb)));
  perform set_config('role', 'none', true);
  r := array_append(r, case when j = '{"ok":false}'::jsonb and k = '{"ok":false}'::jsonb and (select e.v = 1 and e.cab ->> 'n' = '1' from oficios.estados e where e.negocio = 'prueba-srv')
    and not exists (select 1 from oficios.avisos where negocio = 'prueba-srv' and id = 'P-0002') then '11:ok' else '11:MAL' end);
  perform set_config('role', 'service_role', true);
  -- la segunda acción entra con la versión buena; la llave de un aviso que ya existe no cambia aunque se mande otra
  j := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 1, 'cambio', jsonb_build_object('v', 2, 'cab', '{"esq":4,"n":2,"nu":0,"ausencias":[]}'::jsonb,
    'avisos', jsonb_build_array(av2, jsonb_set(jsonb_set(av1, '{llave}', '"cccccccccccccccccccccccc"'), '{datos,e}', '"cancelado"')), 'diario', '{"v":2,"t":2,"q":{"rol":"centralita","id":"oficina"},"accion":{"tipo":"otra"},"res":{"ok":true}}'::jsonb)));
  perform set_config('role', 'none', true);
  r := array_append(r, case when j = '{"ok":true}'::jsonb and (select a.llave = 'aaaaaaaaaaaaaaaaaaaaaaaa' and a.v = 2 and a.datos ->> 'e' = 'cancelado' from oficios.avisos a where a.negocio = 'prueba-srv' and a.id = 'P-0001')
    and (select a.de = '{ana-id}' and a.v = 2 from oficios.avisos a where a.negocio = 'prueba-srv' and a.id = 'P-0002') and (select e.v = 2 from oficios.estados e where e.negocio = 'prueba-srv') then '12:ok' else '12:MAL' end);
  perform set_config('role', 'service_role', true);

  -- 6. leer: todo, lo cambiado desde una versión, lo ya hecho y la vista
  j := public.oficios_srv('vivos', '{"negocio":"prueba-srv"}'); k := public.oficios_srv('cambios', '{"negocio":"prueba-srv","desde":0}');
  r := array_append(r, case when jsonb_array_length(j) = 2 and (select bool_and(x ? 'llave' and x ? 'vista' and x ? 'de' and x ? 'datos') from jsonb_array_elements(j) x)
    and (k ->> 'v')::int = 2 and jsonb_array_length(k -> 'avisos') = 2 and k -> 'cab' ->> 'n' = '2' and not (k -> 'avisos' -> 0 ? 'llave')
    and jsonb_array_length(public.oficios_srv('cambios', '{"negocio":"prueba-srv","desde":2}') -> 'avisos') = 0
    and public.oficios_srv('cambios', '{"negocio":"no-existe","desde":0}') is null then '13:ok' else '13:MAL' end);
  j := public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv', 'v', 2, 'cambio', jsonb_build_object('v', 3, 'cab', '{"esq":4,"n":2,"nu":0,"ausencias":[]}'::jsonb, 'avisos', jsonb_build_array(jsonb_set(av2, '{vista,e}', '"camino"')), 'diario', '{"v":3,"t":3,"q":{},"accion":{},"res":{}}'::jsonb)));
  k := public.oficios_srv('cambios', '{"negocio":"prueba-srv","desde":2}');
  r := array_append(r, case when j = '{"ok":true}'::jsonb and jsonb_array_length(k -> 'avisos') = 1 and k -> 'avisos' -> 0 ->> 'id' = 'P-0002' and (k -> 'avisos' -> 0 ->> 'v')::int = 3 then '14:ok' else '14:MAL' end);
  j := public.oficios_srv('hecha', '{"negocio":"prueba-srv","clave":"centralita:oficina|marca-000000000001"}');
  r := array_append(r, case when j -> 'res' -> 'r' ->> 'id' = 'P-0001' and j -> 'nuevos' -> 0 ->> 'llave' = 'aaaaaaaaaaaaaaaaaaaaaaaa'
    and public.oficios_srv('hecha', '{"negocio":"prueba-srv","clave":"otra-marca-000000000"}') is null and public.oficios_srv('hecha', '{"negocio":"prueba-srv","clave":""}') is null
    and public.oficios_srv('hecha', '{"negocio":"prueba-srv2","clave":"centralita:oficina|marca-000000000001"}') is null then '15:ok' else '15:MAL' end);
  r := array_append(r, case when public.oficios_srv('vista', '{"negocio":"prueba-srv","aviso":"P-0002","llave":"bbbbbbbbbbbbbbbbbbbbbbbb"}') ->> 'e' = 'camino'
    and public.oficios_srv('vista', '{"negocio":"prueba-srv","aviso":"P-0002","llave":"aaaaaaaaaaaaaaaaaaaaaaaa"}') is null
    and public.oficios_srv('vista', '{"negocio":"prueba-srv2","aviso":"P-0002","llave":"bbbbbbbbbbbbbbbbbbbbbbbb"}') is null
    and public.oficios_srv('vista', '{"negocio":"prueba-srv","aviso":"P-0002"}') is null then '16:ok' else '16:MAL' end);

  -- 7. el freno
  r := array_append(r, case when public.oficios_srv('tope', '{"negocio":"prueba-srv","clave":"pedir:red-1","max":2,"ventana":3600000}') = 'true'::jsonb
    and public.oficios_srv('tope', '{"negocio":"prueba-srv","clave":"pedir:red-1","max":2,"ventana":3600000}') = 'true'::jsonb
    and public.oficios_srv('tope', '{"negocio":"prueba-srv","clave":"pedir:red-1","max":2,"ventana":3600000}') = 'false'::jsonb
    and public.oficios_srv('tope', '{"negocio":"prueba-srv","clave":"pedir:red-2","max":2,"ventana":3600000}') = 'true'::jsonb
    and public.oficios_srv('tope', '{"negocio":"prueba-srv2","clave":"pedir:red-1","max":2,"ventana":3600000}') = 'true'::jsonb then '17:ok' else '17:MAL' end);

  -- 8. un negocio no toca al otro
  r := array_append(r, case when (public.oficios_srv('negocio', '{"negocio":"prueba-srv2"}') ->> 'v')::int = 0 and jsonb_array_length(public.oficios_srv('vivos', '{"negocio":"prueba-srv2"}')) = 0
    and public.oficios_srv('guarda', jsonb_build_object('negocio', 'prueba-srv2', 'v', 3, 'cambio', jsonb_build_object('v', 4, 'cab', cab, 'avisos', '[]'::jsonb, 'diario', '{"v":4,"t":1,"q":{},"accion":{},"res":{}}'::jsonb))) = '{"ok":false}'::jsonb then '18:ok' else '18:MAL' end);

  -- 9. lo que se puede llamar desde un navegador: la versión, con código, y la vista, con la llave
  perform set_config('role', 'anon', true);
  r := array_append(r, case when public.oficios_v('prueba-srv', 'oficina', 'codigo-oficina-1') = '{"ok":true,"v":3}'::jsonb
    and public.oficios_v('prueba-srv', 'ana', 'codigo-ana-1') = '{"ok":true,"v":3}'::jsonb
    and public.oficios_v('prueba-srv', 'oficina', 'otro') = '{"ok":false,"err":"clave"}'::jsonb
    and public.oficios_v('prueba-srv', 'nadie', 'codigo-oficina-1') = '{"ok":false,"err":"clave"}'::jsonb
    and public.oficios_v('no-existe', 'oficina', 'codigo-oficina-1') = '{"ok":false,"err":"clave"}'::jsonb
    and public.oficios_v(null, null, null) = '{"ok":false,"err":"clave"}'::jsonb then '19:ok' else '19:MAL' end);
  r := array_append(r, case when public.oficios_vista('prueba-srv', 'P-0002', 'bbbbbbbbbbbbbbbbbbbbbbbb') = '{"ok":true,"vista":{"id":"P-0002","e":"camino"}}'::jsonb
    and public.oficios_vista('prueba-srv', 'P-0002', 'aaaaaaaaaaaaaaaaaaaaaaaa') = '{"ok":false,"err":"enlace"}'::jsonb
    and public.oficios_vista('prueba-srv', 'P-0009', 'bbbbbbbbbbbbbbbbbbbbbbbb') = '{"ok":false,"err":"enlace"}'::jsonb
    and public.oficios_vista('prueba-srv2', 'P-0002', 'bbbbbbbbbbbbbbbbbbbbbbbb') = '{"ok":false,"err":"enlace"}'::jsonb
    and public.oficios_vista('prueba-srv', 'P-0002', '') = '{"ok":false,"err":"enlace"}'::jsonb
    and public.oficios_vista(null, null, null) = '{"ok":false,"err":"enlace"}'::jsonb then '20:ok' else '20:MAL' end);
  for i in 1..9 loop perform public.oficios_v('prueba-srv', 'oficina', 'malo-' || i); end loop;   -- con el de antes van diez
  r := array_append(r, case when public.oficios_v('prueba-srv', 'oficina', 'codigo-oficina-1') = '{"ok":false,"err":"bloqueo"}'::jsonb
    and public.oficios_v('prueba-srv2', 'oficina', 'codigo-oficina-2') = '{"ok":true,"v":0}'::jsonb then '21:ok' else '21:MAL' end);

  -- 10. un negocio dado de baja: ni entra, ni enseña el aviso al cliente; y la vista para Oscar
  perform set_config('role', 'none', true);
  update oficios.negocios set activo = false where id = 'prueba-srv2';
  r := array_append(r, case when public.oficios_v('prueba-srv2', 'oficina', 'codigo-oficina-2') = '{"ok":false,"err":"clave"}'::jsonb
    and (public.oficios_srv('negocio', '{"negocio":"prueba-srv2"}') ->> 'activo')::boolean = false
    and (select s.v = 3 and s.avisos = 2 and s.personas = 2 and s.prueba from oficios.servidor s where s.negocio = 'prueba-srv') then '22:ok' else '22:MAL' end);

  -- 11. la zona del cliente: el código de cada teléfono, que la oficina puede volver a mandar o cambiar
  perform set_config('role', 'anon', true);
  begin perform 1 from oficios.clientes limit 1; r := array_append(r, '23:MAL'); exception when insufficient_privilege then r := array_append(r, '23:ok'); end;
  begin perform oficios.cliente_entra('prueba-srv', '612345678', 'abcd-efgh', ''); r := array_append(r, '24:MAL'); exception when insufficient_privilege then r := array_append(r, '24:ok'); end;
  perform set_config('role', 'service_role', true);
  r := array_append(r, case when public.oficios_srv('cliente', '{"negocio":"prueba-srv","tel":"612345678"}') is null
    and public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"612345678","codigo":"abcd-efgh"}') = '{"ok":true}'::jsonb
    and public.oficios_srv('cliente', '{"negocio":"prueba-srv","tel":"612345678"}') = '{"codigo":"abcd-efgh","activo":true}'::jsonb
    and public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"612345678","codigo":"jkmn-pqrs"}') = '{"ok":true}'::jsonb
    and public.oficios_srv('cliente', '{"negocio":"prueba-srv","tel":"612345678"}') = '{"codigo":"jkmn-pqrs","activo":true}'::jsonb
    and public.oficios_srv('cliente', '{"negocio":"prueba-srv2","tel":"612345678"}') is null then '25:ok' else '25:MAL' end);
  -- lo que no tiene forma de teléfono o de código, o es de un negocio que no existe, no se guarda ni toca el código de antes
  r := array_append(r, case when public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"512345678","codigo":"abcd-efgh"}') = '{"ok":false}'::jsonb
    and public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"612345678","codigo":"abcd-efgi"}') = '{"ok":false}'::jsonb
    and public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"612345678","codigo":"ABCD-EFGH"}') = '{"ok":false}'::jsonb
    and public.oficios_srv('pon_cliente', '{"negocio":"no-existe","tel":"612345678","codigo":"abcd-efgh"}') = '{"ok":false}'::jsonb
    and public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"612345678"}') = '{"ok":false}'::jsonb
    and public.oficios_srv('cliente', '{"negocio":"prueba-srv","tel":"612345678"}') = '{"codigo":"jkmn-pqrs","activo":true}'::jsonb then '26:ok' else '26:MAL' end);
  -- entrar: el código bueno sí; cualquier otro, no
  r := array_append(r, case when public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"612345678","codigo":"jkmn-pqrs","red":"c0"}') = 'true'::jsonb
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"612345678","codigo":"abcd-efgh","red":"c0"}') is null
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"699999999","codigo":"jkmn-pqrs","red":"c0"}') is null
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv2","tel":"612345678","codigo":"jkmn-pqrs","red":"c0"}') is null
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"612345678","red":"c0"}') is null
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"6123","codigo":"jkmn-pqrs","red":"c0"}') is null then '27:ok' else '27:MAL' end);
  perform set_config('role', 'none', true);
  select count(*) into n from oficios.intentos_persona where negocio like 'prueba-srv%' and persona like 'cliente:%';
  -- cuentan el código malo y el teléfono que no es de nadie (así el freno no dice quién es cliente); lo que no tiene forma y el negocio de baja, no
  r := array_append(r, case when n = 2 and exists (select 1 from oficios.intentos_persona where negocio = 'prueba-srv' and persona = 'cliente:699999999') then '28:ok' else '28:MAL' end);
  perform set_config('role', 'service_role', true);
  -- diez fallos desde una conexión bloquean ese teléfono a esa conexión; desde otra, y con otro teléfono, se sigue entrando
  for i in 1..9 loop perform public.oficios_srv('cliente_entra', jsonb_build_object('negocio', 'prueba-srv', 'tel', '612345678', 'codigo', 'zzzz-zzz' || substr('abcdefghjk', i, 1), 'red', 'c0')); end loop;   -- con el de antes, diez
  perform public.oficios_srv('pon_cliente', '{"negocio":"prueba-srv","tel":"622222222","codigo":"wxyz-2345"}');
  r := array_append(r, case when public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"612345678","codigo":"jkmn-pqrs","red":"c0"}') = '"bloqueo"'::jsonb
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"612345678","codigo":"jkmn-pqrs","red":"c1"}') = 'true'::jsonb
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"622222222","codigo":"wxyz-2345","red":"c0"}') = 'true'::jsonb then '29:ok' else '29:MAL' end);
  -- cincuenta fallos desde una conexión, con el teléfono que sea, bloquean esa conexión
  for i in 1..50 loop perform public.oficios_srv('cliente_entra', jsonb_build_object('negocio', 'prueba-srv', 'tel', (630000000 + i)::text, 'codigo', 'zzzz-zzzz', 'red', 'c2')); end loop;
  r := array_append(r, case when public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"622222222","codigo":"wxyz-2345","red":"c2"}') = '"bloqueo"'::jsonb
    and public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"622222222","codigo":"wxyz-2345","red":"c3"}') = 'true'::jsonb then '30:ok' else '30:MAL' end);
  -- un código dado de baja no entra; y la vista para Oscar cuenta los clientes con código
  perform set_config('role', 'none', true);
  update oficios.clientes set activo = false where negocio = 'prueba-srv' and tel = '622222222';
  r := array_append(r, case when public.oficios_srv('cliente_entra', '{"negocio":"prueba-srv","tel":"622222222","codigo":"wxyz-2345","red":"c4"}') is null
    and (select s.clientes = 1 from oficios.servidor s where s.negocio = 'prueba-srv') then '31:ok' else '31:MAL' end);

  -- 32. el equipo: quién tiene acceso, sin huellas de los códigos
  j := public.oficios_srv('personas', '{"negocio":"prueba-srv"}');
  r := array_append(r, case when jsonb_array_length(j) = 3 and position('clave' in j::text) = 0 and position('huella' in j::text) = 0
    and (select bool_and((x ->> 'activo')::boolean = (x ->> 'persona' <> 'baja')) from jsonb_array_elements(j) x) then '32:ok' else '32:MAL' end);
  -- 33. un código con forma rara no se guarda
  r := array_append(r, case when public.oficios_srv('pon_persona', '{"negocio":"prueba-srv","persona":"ana","rol":"tecnico","quien":"ana-id","codigo":"corto","por":"oficina"}') = '{"ok":false}'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"codigo-ana-1","red":"e1"}') is not null then '33:ok' else '33:MAL' end);
  -- 34. un código nuevo: el de antes deja de valer, el nuevo entra, queda apuntado quién lo dio y el código no se guarda
  j := public.oficios_srv('pon_persona', '{"negocio":"prueba-srv","persona":"ana","rol":"tecnico","quien":"ana-id","codigo":"abcd-efgh-jkmn-pqrs","por":"oficina"}');
  r := array_append(r, case when j = '{"ok":true}'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"codigo-ana-1","red":"e2"}') is null
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"abcd-efgh-jkmn-pqrs","red":"e2"}') = '{"rol":"tecnico","id":"ana-id"}'::jsonb
    and (select count(*) from oficios.accesos a where a.negocio = 'prueba-srv' and a.que = 'codigo' and a.a = 'ana' and a.quien = 'oficina') = 1
    and not exists (select 1 from oficios.personas p where p.negocio = 'prueba-srv' and p.clave_hash like '%abcd%')
    and position('abcd-efgh' in (select string_agg(to_jsonb(a)::text, '') from oficios.accesos a where a.negocio = 'prueba-srv')) = 0 then '34:ok' else '34:MAL' end);
  -- 35. a quien no tenía acceso se le da de alta, y a quien se lo quitaron se le vuelve a dar
  perform public.oficios_srv('pon_persona', '{"negocio":"prueba-srv","persona":"nuevo","rol":"tecnico","quien":"nuevo-id","codigo":"bcde-fghj-kmnp-qrst","por":"oficina"}');
  perform public.oficios_srv('pon_persona', '{"negocio":"prueba-srv","persona":"baja","rol":"tecnico","quien":"baja-id","codigo":"cdef-ghjk-mnpq-rstu","por":"oficina"}');
  r := array_append(r, case when public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"nuevo","codigo":"bcde-fghj-kmnp-qrst","red":"e3"}') = '{"rol":"tecnico","id":"nuevo-id"}'::jsonb
    and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"baja","codigo":"cdef-ghjk-mnpq-rstu","red":"e3"}') = '{"rol":"tecnico","id":"baja-id"}'::jsonb then '35:ok' else '35:MAL' end);
  -- 36. quitar el acceso: ya no entra, queda apuntado; a quien no existe, no
  j := public.oficios_srv('baja_persona', '{"negocio":"prueba-srv","persona":"ana","por":"oficina"}');
  r := array_append(r, case when j = '{"ok":true}'::jsonb and public.oficios_srv('entra', '{"negocio":"prueba-srv","persona":"ana","codigo":"abcd-efgh-jkmn-pqrs","red":"e4"}') is null
    and public.oficios_srv('baja_persona', '{"negocio":"prueba-srv","persona":"nadie","por":"oficina"}') = '{"ok":false}'::jsonb
    and (select count(*) from oficios.accesos a where a.negocio = 'prueba-srv' and a.que = 'baja' and a.a = 'ana') = 1 then '36:ok' else '36:MAL' end);
  -- 37. lo último que se ha hecho, de lo más nuevo a lo más viejo, solo de ese negocio
  j := public.oficios_srv('accesos', '{"negocio":"prueba-srv"}');
  r := array_append(r, case when jsonb_array_length(j) = 4 and j -> 0 ->> 'que' = 'baja' and j -> 0 ->> 'a' = 'ana' and jsonb_typeof(j -> 0 -> 'cuando') = 'number'
    and public.oficios_srv('accesos', '{"negocio":"prueba-srv2"}') = '[]'::jsonb then '37:ok' else '37:MAL' end);

  raise exception 'RESULTADOS %', array_to_string(r, ' | ');
end $$;
