-- OOOX Oficios · pruebas del mantenimiento (esquema.sql de esta carpeta)
-- ============================================================
-- Se pasan enteras dentro de un solo bloque que se deshace al final: no dejan nada en la base de datos.
-- Cómo pasarlas: pegar el archivo en el editor SQL de Supabase, o pedírselo a Claude (conector de Supabase).
-- También en una base de datos local (ver LEEME.md, «Probar en local»).
-- El resultado sale como un «error» que empieza por RESULTADOS: es la manera de deshacerlo todo.
-- Tiene que poner «ok» en todas. Si alguna pone MAL, ese número es la comprobación que falla.
--
-- Qué miran: que el navegador solo puede mandar fallos, preguntar la salud y bajar la copia cifrada; que los fallos se
-- guardan limpios, juntos y con topes; que un fallo arreglado que vuelve se nota; la copia cifrada, que se guardan las 7
-- últimas y su freno; la limpieza, que no toca los avisos; el informe y los caducados; y olvidar a un cliente: lo que
-- tapa, lo que deja, que con un aviso abierto no hace nada, que sin aplicar no cambia nada y que se puede volver a
-- aplicar después de restaurar una copia.

do $$
declare
  r text[] := '{}'; j jsonb; k jsonb; n int; i int; t text; b bytea; v1 bigint; ll text;
  lote jsonb;
  t0 bigint := 1794700000000;   -- una hora cualquiera, en milisegundos
begin
  -- ---------- preparar: un negocio con su servidor, dos avisos, su diario, dos contratos y la zona de un cliente ----------
  insert into oficios.negocios(id, nombre, clave_hash) values ('prueba-mant', 'Prueba mantenimiento', oficios.huella('prueba-mant', 'clave-buena-1'));
  insert into oficios.negocios(id, nombre, activo, clave_hash) values ('prueba-baja', 'Prueba de baja', false, oficios.huella('prueba-baja', 'clave-buena-1'));
  insert into oficios.estados(negocio, datos, v, cab) values ('prueba-mant', '{"id":"prueba-mant"}', 5,
    '{"esq":4,"n":2,"nu":0,"ausencias":[],"contratos":[{"id":"C-1","cli":{"nombre":"Ana","apellidos":"Prueba","tel":"600 00 01 99","dir":"C/ Falsa 1","cp":"08001","dis":"eix"},"plan":"anual"},{"id":"C-2","cli":{"nombre":"Otro","apellidos":"Cliente","tel":"611000000","dir":"C/ Otra 2","cp":"08002","dis":"gra"},"plan":"anual"}],"nc":2}');
  insert into oficios.avisos(negocio, id, v, datos, llave, vista) values
    ('prueba-mant', 'PM-1', 4, jsonb_build_object('id','PM-1','e','hecho','t', t0 - 1000,'tot', 120.5,'av','fuga','nota','Pierde por la llave de paso de la cocina','foto','data:image/webp;base64,AAAA',
       'cli', jsonb_build_object('nombre','Ana','apellidos','Prueba','tel','600000199','dir','C/ Falsa 1, 2.º','cp','08001','dis','eix'),
       'pres', jsonb_build_object('lineas', '[{"k":"desp"}]'::jsonb, 'firma','M1 2 3 4')), 'llaveoriginaldelaviso1234', '{"id":"PM-1","quien":"Omar","total":120.5}'),
    ('prueba-mant', 'PM-2', 5, jsonb_build_object('id','PM-2','e','hecho','t', t0,'tot', 60,'av','atasco',
       'cli', jsonb_build_object('nombre','Otro','apellidos','Cliente','tel','611000000','dir','C/ Otra 2','cp','08002','dis','gra')), 'llaveoriginaldelaviso5678', '{"id":"PM-2"}');
  insert into oficios.diario(negocio, v, t, q, accion, res, nuevos, cuando) values
    ('prueba-mant', 1, t0, '{"rol":"cliente"}', '{"tipo":"pedir","av":"fuga","origen":"web","nota":"Pierde por la llave","cli":{"nombre":"Ana","apellidos":"Prueba","tel":"600000199","dir":"C/ Falsa 1, 2.º","cp":"08001"}}', '{"ok":true,"v":1,"r":{"ok":true}}', '[{"id":"PM-1","llave":"llaveoriginaldelaviso1234"}]', '2026-11-05 10:00+01'),
    ('prueba-mant', 2, t0 + 600000, '{"rol":"centralita","id":"oficina"}', '{"tipo":"asignar","id":"PM-1","tec":"omar"}', '{"ok":true,"v":2}', '[]', '2026-11-05 10:10+01'),
    ('prueba-mant', 3, t0 + 1200000, '{"rol":"tecnico","id":"omar"}', '{"tipo":"voy","id":"PM-1"}', '{"ok":true,"v":3}', '[]', '2026-11-05 10:20+01'),
    ('prueba-mant', 4, t0 + 3000000, '{"rol":"tecnico","id":"omar"}', '{"tipo":"empezar","id":"PM-1","pres":{"lineas":[{"k":"desp"}],"firma":"M1 2 3 4"}}', '{"ok":true,"v":4}', '[]', '2026-11-05 10:50+01'),
    ('prueba-mant', 5, t0 + 4000000, '{"rol":"cliente"}', '{"tipo":"pedir","av":"atasco","origen":"llamada","cli":{"nombre":"Otro","apellidos":"Cliente","tel":"611000000","dir":"C/ Otra 2","cp":"08002"}}', '{"ok":true,"v":5}', '[{"id":"PM-2","llave":"llaveoriginaldelaviso5678"}]', '2026-11-05 11:00+01');
  insert into oficios.clientes(negocio, tel, codigo) values ('prueba-mant', '600000199', 'abcd-efgh');

  -- ---------- como el navegador de cualquiera ----------
  perform set_config('role', 'anon', true);
  -- 1. no puede leer los fallos guardados
  begin perform 1 from oficios.errores limit 1; r := array_append(r, '1:MAL');
  exception when insufficient_privilege then r := array_append(r, '1:ok'); end;
  -- 2. ni las copias ni la llave
  begin perform 1 from oficios.copias_seguridad limit 1; r := array_append(r, '2:MAL');
  exception when insufficient_privilege then r := array_append(r, '2:ok'); end;
  -- 3. ni las funciones de dentro: hacer la copia, limpiar, el informe, olvidar
  n := 0;
  begin perform oficios.hacer_copia(); exception when insufficient_privilege then n := n + 1; end;
  begin perform oficios.limpieza(); exception when insufficient_privilege then n := n + 1; end;
  begin perform oficios.informe('prueba-mant', current_date, current_date); exception when insufficient_privilege then n := n + 1; end;
  begin perform oficios.olvidar_cliente('prueba-mant', '600000199', true); exception when insufficient_privilege then n := n + 1; end;
  begin perform oficios.reaplicar_olvidos(); exception when insufficient_privilege then n := n + 1; end;
  begin perform oficios.espacio(); exception when insufficient_privilege then n := n + 1; end;
  r := array_append(r, case when n = 6 then '3:ok' else '3:MAL(' || n || ')' end);
  -- 4. la salud contesta, sin decir nada de nadie
  j := public.oficios_salud();
  r := array_append(r, case when (j->>'ok')::boolean and (j->>'datos')::boolean and (j ? 't') and (select count(*) from jsonb_object_keys(j)) = 3 then '4:ok' else '4:MAL' end);
  -- 5. un negocio que no existe, uno de baja, o una tanda que no es una lista: no
  r := array_append(r, case when public.oficios_error('no-existe', '[{"mensaje":"x"}]') = '{"ok":false,"err":"negocio"}'::jsonb
                             and public.oficios_error('prueba-baja', '[{"mensaje":"x"}]') = '{"ok":false,"err":"negocio"}'::jsonb
                             and public.oficios_error('prueba-mant', '{"mensaje":"x"}') = '{"ok":false,"err":"peticion"}'::jsonb
                             and public.oficios_error(null, '[]') = '{"ok":false,"err":"peticion"}'::jsonb then '5:ok' else '5:MAL' end);
  -- 6. un fallo se guarda limpio: sin teléfono, sin correo, sin el enlace del cliente; la posición se queda
  j := public.oficios_error('prueba-mant', jsonb_build_array(jsonb_build_object('pagina','cita','pantalla','aviso','tipo','js','mensaje','No se pudo avisar al 600 00 01 99 ni a ana@correo.es',
         'pila','pinta@https://x.pages.dev/cita.html?a=1#/aviso/PM-1/llaveoriginaldelaviso1234:12:5','version','2026.11.16a','aparato','iPhone · Safari','rol','cliente','n',2)));
  perform set_config('role', 'postgres', true);
  select to_jsonb(e) into k from oficios.errores e where negocio = 'prueba-mant';
  r := array_append(r, case when (j->>'n')::int = 1 and k->>'mensaje' = 'No se pudo avisar al # ni a [correo]' and k->>'pila' = 'pinta@https://x.pages.dev/cita.html:12:5'
                             and k->>'pagina' = 'cita' and k->>'pantalla' = 'aviso' and k->>'rol' = 'cliente' and (k->>'veces')::int = 2 and k->'aparatos' = '["iPhone · Safari"]'::jsonb
                             and k->>'estado' = 'nuevo' then '6:ok' else '6:MAL ' || coalesce(k::text, 'nada') end);
  -- 7. el mismo fallo en otra versión (otras posiciones) y desde otro aparato: la misma fila, con la cuenta sumada
  perform set_config('role', 'anon', true);
  j := public.oficios_error('prueba-mant', jsonb_build_array(jsonb_build_object('pagina','cita','pantalla','aviso','tipo','js','mensaje','No se pudo avisar al 611 22 33 44 ni a otra@correo.es',
         'pila','pinta@https://x.pages.dev/cita.html:14:9','version','2026.11.17a','aparato','Android · Chrome','rol','cliente','n',3)));
  perform set_config('role', 'postgres', true);
  select count(*) into n from oficios.errores where negocio = 'prueba-mant';
  select to_jsonb(e) into k from oficios.errores e where negocio = 'prueba-mant';
  r := array_append(r, case when n = 1 and (k->>'veces')::int = 5 and k->>'version' = '2026.11.17a' and k->'aparatos' = '["iPhone · Safari", "Android · Chrome"]'::jsonb then '7:ok' else '7:MAL ' || coalesce(k::text, '') end);
  -- 8. lo raro se arregla: página, tipo, papel, pantalla y cuenta que no valen
  perform set_config('role', 'anon', true);
  j := public.oficios_error('prueba-mant', '[{"pagina":"nada","tipo":"cosa","rol":"jefe","pantalla":"A/v<i>so!","mensaje":"Fallo raro","n":"muchas"}, {"mensaje":"Otro raro","n":99999}, "no es un objeto", {"mensaje":"   "}]'::jsonb);
  perform set_config('role', 'postgres', true);
  select to_jsonb(e) into k from oficios.errores e where negocio = 'prueba-mant' and mensaje = 'Fallo raro';
  r := array_append(r, case when (j->>'n')::int = 2 and k->>'pagina' = 'otra' and k->>'tipo' = 'js' and k->>'rol' is null and k->>'pantalla' = 'aviso' and (k->>'veces')::int = 1
                             and (select veces from oficios.errores where negocio = 'prueba-mant' and mensaje = 'Otro raro') = 1 then '8:ok' else '8:MAL ' || coalesce(j::text, '') end);
  -- 9. como mucho 10 por llamada
  perform set_config('role', 'anon', true);
  select jsonb_agg(jsonb_build_object('mensaje', 'Fallo en la tanda ' || chr(96 + g))) into lote from generate_series(1, 12) g;   -- con letras: los números no cuentan para decir si dos fallos son el mismo
  j := public.oficios_error('prueba-mant', lote);
  r := array_append(r, case when (j->>'n')::int = 10 then '9:ok' else '9:MAL ' || j::text end);
  -- 10. como mucho 200 fallos nuevos al día por negocio: los nuevos de más no entran; uno que ya estaba sigue contando
  perform set_config('role', 'postgres', true);
  insert into oficios.errores(negocio, huella, pagina, tipo, mensaje) select 'prueba-mant', 'relleno-' || g, 'app', 'js', 'Relleno ' || g from generate_series(1, 190) g;
  perform set_config('role', 'anon', true);
  j := public.oficios_error('prueba-mant', '[{"mensaje":"Uno nuevo de más"}, {"mensaje":"Fallo raro","pagina":"nada","tipo":"cosa"}]'::jsonb);
  perform set_config('role', 'postgres', true);
  r := array_append(r, case when (j->>'n')::int = 1 and not exists (select 1 from oficios.errores where mensaje = 'Uno nuevo de más')
                             and (select veces from oficios.errores where negocio = 'prueba-mant' and mensaje = 'Fallo raro') = 2 then '10:ok' else '10:MAL ' || j::text end);
  delete from oficios.errores where negocio = 'prueba-mant' and huella like 'relleno-%';
  -- 11. un fallo arreglado: si vuelve desde una versión anterior al arreglo, sigue arreglado; desde la del arreglo o después, «vuelve»
  update oficios.errores set estado = 'arreglado', arreglado_en = '2026.11.20a' where negocio = 'prueba-mant' and mensaje = 'Otro raro';
  perform set_config('role', 'anon', true);
  perform public.oficios_error('prueba-mant', '[{"mensaje":"Otro raro","version":"2026.11.19b"}]');
  perform set_config('role', 'postgres', true);
  t := (select estado from oficios.errores where negocio = 'prueba-mant' and mensaje = 'Otro raro');
  perform set_config('role', 'anon', true);
  perform public.oficios_error('prueba-mant', '[{"mensaje":"Otro raro","version":"2026.11.20a"}]');
  perform set_config('role', 'postgres', true);
  r := array_append(r, case when t = 'arreglado' and (select estado from oficios.errores where negocio = 'prueba-mant' and mensaje = 'Otro raro') = 'vuelve' then '11:ok' else '11:MAL ' || t end);

  -- 12. la copia: cifrada, entera y la última; quien la baja no ve las cuentas de cada tabla
  j := oficios.hacer_copia();
  perform set_config('role', 'anon', true);
  k := public.oficios_copia();
  perform set_config('role', 'postgres', true);
  b := decode(k->>'datos', 'base64');
  r := array_append(r, case when (j->>'ok')::boolean and (k->>'ok')::boolean and (k->>'id')::bigint = (j->>'id')::bigint
                             and encode(extensions.digest(b, 'sha256'), 'hex') = k->>'sha256' and octet_length(b) = (k->>'bytes')::int
                             and k->>'huella_llave' = (select huella from oficios.copias_llave where id = 1) and not (k ? 'cuentas')
                             and (j->'cuentas'->>'avisos')::int >= 2 and position(convert_to('Prueba', 'UTF8') in b) = 0 then '12:ok' else '12:MAL' end);
  -- 13. se guardan las 7 últimas
  for i in 1..9 loop perform oficios.hacer_copia(); end loop;
  r := array_append(r, case when (select count(*) from oficios.copias_seguridad) = 7 then '13:ok' else '13:MAL' end);
  -- 14. freno: 30 bajadas al día entre todos
  insert into oficios.bajadas(cuando) select now() from generate_series(1, 30);
  perform set_config('role', 'anon', true);
  k := public.oficios_copia();
  perform set_config('role', 'postgres', true);
  r := array_append(r, case when k = '{"ok":false,"err":"limite"}'::jsonb then '14:ok' else '14:MAL' end);

  -- 15. la limpieza: quita lo viejo de los registros de pocos días y no toca ni los avisos ni lo reciente
  insert into oficios.errores(negocio, huella, pagina, tipo, mensaje, ultima) values ('prueba-mant', 'viejo-1', 'app', 'js', 'Muy viejo', now() - interval '91 days');
  insert into oficios.topes(negocio, clave, cuando) values ('prueba-mant', 'viejo', now() - interval '8 days'), ('prueba-mant', 'nuevo', now());
  j := oficios.limpieza();
  r := array_append(r, case when not exists (select 1 from oficios.errores where huella = 'viejo-1') and exists (select 1 from oficios.errores where negocio = 'prueba-mant' and mensaje = 'Fallo raro')
                             and not exists (select 1 from oficios.topes where negocio = 'prueba-mant' and clave = 'viejo') and exists (select 1 from oficios.topes where negocio = 'prueba-mant' and clave = 'nuevo')
                             and (select count(*) from oficios.avisos where negocio = 'prueba-mant') = 2 then '15:ok' else '15:MAL ' || j::text end);
  -- 16. el informe: cuentas, de dónde vienen los avisos y lo que se tarda (10 min en asignar, 30 de «Voy» a empezar)
  j := oficios.informe('prueba-mant', '2026-11-01', '2026-11-30');
  r := array_append(r, case when (j->'acciones'->>'pedir')::int = 2 and (j->'acciones'->>'asignar')::int = 1 and j->'avisos_por_origen' = '{"web": 1, "llamada": 1}'::jsonb
                             and (j->>'min_hasta_asignar_mediana')::numeric = 10.0 and (j->>'min_de_voy_a_empezar_mediana')::numeric = 30.0 and (j->>'personas_activas')::int = 2
                             and position('Ana' in j::text) = 0 and position('600000199' in j::text) = 0 then '16:ok' else '16:MAL ' || j::text end);
  -- 17. caducados: avisos pedidos hace más de los meses que se digan
  update oficios.avisos set datos = jsonb_set(datos, '{t}', to_jsonb(floor(extract(epoch from now() - interval '40 months') * 1000)::bigint)) where negocio = 'prueba-mant' and id = 'PM-2';
  r := array_append(r, case when (oficios.caducados(36)->>'prueba-mant')::int = 1 and oficios.caducados(48)->>'prueba-mant' is null then '17:ok' else '17:MAL' end);

  -- 18. olvidar: primero se simula y no cambia nada
  select v into v1 from oficios.estados where negocio = 'prueba-mant';
  j := oficios.olvidar_cliente('prueba-mant', '+34 600 00 01 99');
  r := array_append(r, case when (j->>'ok')::boolean and (j->>'simulado')::boolean and j->'avisos' = '["PM-1"]'::jsonb and (j->>'diario')::int = 4 and (j->>'contratos')::int = 1 and (j->>'zona')::boolean
                             and (select datos->'cli'->>'nombre' from oficios.avisos where id = 'PM-1' and negocio = 'prueba-mant') = 'Ana'
                             and (select v from oficios.estados where negocio = 'prueba-mant') = v1 then '18:ok' else '18:MAL ' || j::text end);
  -- 19. con un aviso suyo aún abierto no hace nada, aunque se pida aplicar
  update oficios.avisos set datos = jsonb_set(datos, '{e}', '"curso"') where negocio = 'prueba-mant' and id = 'PM-1';
  j := oficios.olvidar_cliente('prueba-mant', '600000199', true);
  r := array_append(r, case when not (j->>'ok')::boolean and j->>'err' = 'abiertos' and j->'abiertos' = '["PM-1"]'::jsonb
                             and (select datos->'cli'->>'nombre' from oficios.avisos where id = 'PM-1' and negocio = 'prueba-mant') = 'Ana' then '19:ok' else '19:MAL ' || j::text end);
  update oficios.avisos set datos = jsonb_set(datos, '{e}', '"hecho"') where negocio = 'prueba-mant' and id = 'PM-1';
  -- 20. aplicado: tapa lo suyo en el aviso, el diario, el contrato y su zona; deja importes, barrio y trabajo; cambia el enlace; los aparatos se enteran
  select llave into ll from oficios.avisos where negocio = 'prueba-mant' and id = 'PM-1';
  j := oficios.olvidar_cliente('prueba-mant', '600000199', true);
  select datos into k from oficios.avisos where negocio = 'prueba-mant' and id = 'PM-1';
  r := array_append(r, case when (j->>'ok')::boolean and not (j->>'simulado')::boolean
                             and k->'cli'->>'nombre' = 'Cliente borrado' and k->'cli'->>'apellidos' = '' and k->'cli'->>'tel' = '' and k->'cli'->>'dir' = '' and k->'cli'->>'cp' = '' and k->'cli'->>'dis' = 'eix'
                             and k->>'nota' = '' and k->>'foto' = '' and k->'pres'->>'firma' = '' and (k->>'tot')::numeric = 120.5 and k->>'av' = 'fuga' and k->>'e' = 'hecho'
                             and (select llave from oficios.avisos where negocio = 'prueba-mant' and id = 'PM-1') <> ll
                             and (select v from oficios.avisos where negocio = 'prueba-mant' and id = 'PM-1') = v1 + 1 and (select v from oficios.estados where negocio = 'prueba-mant') = v1 + 1
                             then '20:ok' else '20:MAL ' || k::text end);
  -- 21. …en el diario y en los contratos ya no queda nada suyo, y lo del otro cliente sigue igual
  select string_agg(accion::text || res::text || nuevos::text, ' ') into t from oficios.diario where negocio = 'prueba-mant' and v <= 4;
  r := array_append(r, case when position('600000199' in t) = 0 and position('Falsa' in t) = 0 and position('Pierde' in t) = 0 and position('M1 2 3 4' in t) = 0 and position('llaveoriginaldelaviso1234' in t) = 0
                             and (select cab->'contratos'->0->'cli'->>'tel' from oficios.estados where negocio = 'prueba-mant') = ''
                             and (select cab->'contratos'->1->'cli'->>'tel' from oficios.estados where negocio = 'prueba-mant') = '611000000'
                             and (select datos->'cli'->>'nombre' from oficios.avisos where id = 'PM-2' and negocio = 'prueba-mant') = 'Otro'
                             and position('611000000' in (select accion::text from oficios.diario where negocio = 'prueba-mant' and v = 5)) > 0
                             and not exists (select 1 from oficios.clientes where negocio = 'prueba-mant' and tel = '600000199')
                             then '21:ok' else '21:MAL' end);
  -- 22. queda apuntado sin el teléfono: solo su huella
  select to_jsonb(o) into k from oficios.olvidos o where negocio = 'prueba-mant';
  r := array_append(r, case when k->>'huella' = encode(sha256(convert_to('prueba-mant:600000199', 'UTF8')), 'hex') and position('600000199' in k::text) = 0
                             and (k->>'avisos')::int = 1 and (k->>'zona')::boolean then '22:ok' else '22:MAL' end);
  -- 23. después de restaurar una copia de antes, se vuelve a olvidar solo
  update oficios.avisos set datos = jsonb_set(datos, '{cli}', '{"nombre":"Ana","apellidos":"Prueba","tel":"600000199","dir":"C/ Falsa 1","cp":"08001","dis":"eix"}') where negocio = 'prueba-mant' and id = 'PM-1';
  j := oficios.reaplicar_olvidos();
  r := array_append(r, case when (j->>'reaplicados')::int = 1 and (select datos->'cli'->>'tel' from oficios.avisos where id = 'PM-1' and negocio = 'prueba-mant') = '' then '23:ok' else '23:MAL ' || j::text end);
  -- 24. un teléfono que no vale, o de nadie
  r := array_append(r, case when oficios.olvidar_cliente('prueba-mant', '123') = '{"ok":false,"err":"tel"}'::jsonb
                             and oficios.olvidar_cliente('prueba-mant', '699999999', true) = '{"ok":false,"err":"nadie"}'::jsonb then '24:ok' else '24:MAL' end);
  -- 25. el espacio: cuánto ocupa y el límite del plan gratis
  j := oficios.espacio();
  r := array_append(r, case when (j->>'base_bytes')::bigint > 0 and (j->>'limite_bytes')::bigint = 524288000 and (j->'tablas') ? 'errores' then '25:ok' else '25:MAL' end);

  -- 26. la app y el servidor limpian igual: los mismos casos que demos/pruebas-reglas/vigia-casos.json (si cambian allí, aquí también)
  n := 0; t := '';
  for k in select value from jsonb_array_elements($casos$[["TypeError: Cannot read properties of undefined (reading 'nombre') at pinta (https://x.pages.dev/demos/ramirez-24h/app.html?papel=tecnico&tec=omar#/aviso/R-0012/abcdefghjkmnpqrstuvwxyza:441:23)", "TypeError: Cannot read properties of undefined (reading 'nombre') at pinta (https://x.pages.dev/demos/ramirez-24h/app.html:441:23)"], ["Llama al 600 00 01 12 o al +34 600000112, escribe a pepe.garcia@gmail.com; cód abcd-efgh-jkmn-pqrs y abcd-efgh", "Llama al # o al #, escribe a [correo]; cód [código] y [código]"], ["SyntaxError: Unexpected token 'a', \"Calle Mayor 5, 3.º\" is not valid JSON", "SyntaxError: Unexpected token 'a', \"…\" is not valid JSON"], ["img data:image/webp;base64,UklGRhYAAABXRUJQVlA4IAoAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v3AgAA= falla", "img data:… falla"], ["pinta@https://x.pages.dev/demos/ramirez-24h/cliente.html#/entra/600000112/abcd-efgh:12:5", "pinta@https://x.pages.dev/demos/ramirez-24h/cliente.html:12:5"], ["ruta #/aviso/R-0012/qwertyuiopasdfghjkzxcvbn rota; ver #fE", "ruta #/… rota; ver #fE"], ["at https://glsmahzpvzabeeucyqif.supabase.co/functions/v1/oficio:12:34567 llave qwertyuiopasdfghjkzxcvbnm", "at https://glsmahzpvzabeeucyqif.supabase.co/functions/v1/oficio:12:34567 llave [x]"], ["Aviso VS-0005 en la versión 2026.11.16a", "Aviso VS-0005 en la versión #a"], ["Código del día 1234 y franja 3", "Código del día 1234 y franja 3"], ["Cannot read properties of null (reading 'foto') en app.html:1200:15", "Cannot read properties of null (reading 'foto') en app.html:1200:15"], ["HTTP 503 · rest/v1/rpc/oficios_v", "HTTP 503 · rest/v1/rpc/oficios_v"], ["No carga: /oficios/voltio/assets/img/av-fuga-s.webp (img)", "No carga: /oficios/voltio/assets/img/av-fuga-s.webp (img)"], ["Escribió 'me cambiaron el termo ayer' en la nota", "Escribió '…' en la nota"], ["   espacios   ", "espacios"]]$casos$::jsonb) loop
    if oficios.limpia(k->>0, 300) = k->>1 then n := n + 1; else t := t || ' «' || oficios.limpia(k->>0, 300) || '»'; end if;
  end loop;
  r := array_append(r, case when n = 14 then '26:ok' else '26:MAL' || t end);

  -- 27. lo de un negocio para dárselo: cifrado, sin códigos, y solo desde dentro
  j := oficios.exportar_negocio('prueba-mant');
  b := decode(j->>'datos', 'base64');
  r := array_append(r, case when (j->>'ok')::boolean and octet_length(b) = (j->>'bytes')::int and position(convert_to('Otro', 'UTF8') in b) = 0
                             and oficios.exportar_negocio('no-existe') = '{"ok":false,"err":"negocio"}'::jsonb then '27:ok' else '27:MAL' end);
  perform set_config('role', 'anon', true);
  begin perform oficios.exportar_negocio('prueba-mant'); r := array_append(r, '27b:MAL');
  exception when insufficient_privilege then r := array_append(r, '27b:ok'); end;
  perform set_config('role', 'postgres', true);

  raise exception 'RESULTADOS %', array_to_string(r, ' | ');
end $$;
