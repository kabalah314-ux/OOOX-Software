-- OOOX Oficios · pruebas del buzón de peticiones
-- ============================================================
-- Se pasan enteras dentro de un solo bloque que se deshace al final: no dejan nada en la base de datos.
-- Cómo pasarlas: pegar el archivo en el editor SQL de Supabase, o pedírselo a Claude (conector de Supabase).
-- El resultado sale como un «error» que empieza por RESULTADOS: es la manera de deshacerlo todo.
-- Tiene que poner «ok» en todas. Si alguna pone MAL, ese número es la comprobación que falla.
--
-- Qué miran: que el navegador no puede tocar las tablas, que cada función valida lo que recibe, que un negocio no ve
-- lo de otro, que en la demo cada navegador ve solo lo suyo, los topes, el bloqueo por códigos fallados, la baja de
-- ofertas, los acuses de lectura, las vistas de Claude y de Oscar y que las copias de prueba no cuentan como negocios.

do $$
declare
  r text[] := '{}'; j jsonb; k jsonb; n int; i int; t text;
  nov1 bigint; nov2 bigint; nov3 bigint; p1 bigint; p2 bigint;
  largo text := repeat('x', 2001);
begin
  -- ---------- preparar: dos negocios de verdad, una demo y tres novedades ----------
  insert into oficios.negocios(id, nombre, clave_hash) values ('prueba-sql',  'Prueba SQL',   oficios.huella('prueba-sql',  'clave-buena-1'));
  insert into oficios.negocios(id, nombre, clave_hash) values ('prueba-sql2', 'Prueba SQL 2', oficios.huella('prueba-sql2', 'clave-buena-1'));
  insert into oficios.negocios(id, nombre, demo, clave_hash) values ('prueba-demo', 'Prueba demo', true, oficios.huella('prueba-demo', 'DEMO'));
  insert into oficios.novedades(negocio, tipo, titulo, texto) values (null, 'novedad', 'Para todos', 'Una novedad para todos.') returning id into nov1;
  insert into oficios.novedades(negocio, tipo, titulo, texto, enlace) values (null, 'oferta', 'Una oferta', 'Una oferta para todos.', 'https://ooox.es') returning id into nov2;
  insert into oficios.novedades(negocio, tipo, titulo, texto) values ('prueba-sql2', 'aviso', 'Solo para el segundo', 'Un aviso solo para el segundo.') returning id into nov3;

  -- 17. el código no se guarda: solo su huella, y el mismo código en dos negocios da huellas distintas
  select count(distinct clave_hash) into n from oficios.negocios where id in ('prueba-sql', 'prueba-sql2');
  select clave_hash into t from oficios.negocios where id = 'prueba-sql';
  r := array_append(r, case when n = 2 and char_length(t) = 64 and t !~ 'clave' then '17:ok' else '17:MAL' end);

  perform set_config('role', 'anon', true);   -- a partir de aquí, como el navegador de cualquiera

  -- 1. el navegador no puede leer las tablas
  begin perform 1 from oficios.peticiones limit 1; r := array_append(r, '1:MAL');
  exception when insufficient_privilege then r := array_append(r, '1:ok'); end;
  -- 2. ni las vistas de Claude y de Oscar
  begin perform 1 from oficios.cola limit 1; r := array_append(r, '2:MAL');
  exception when insufficient_privilege then r := array_append(r, '2:ok'); end;
  -- 2b. ni las funciones de dentro
  begin perform oficios.entra('prueba-sql', 'clave-buena-1'); r := array_append(r, '2b:MAL');
  exception when insufficient_privilege then r := array_append(r, '2b:ok'); end;

  -- 3. con un código malo, o con un negocio que no existe, la respuesta es la misma: no se sabe cuál de las dos cosas es
  j := public.oficios_enviar('prueba-sql', 'clave-mala', 'fallo', 'Un texto de prueba suficiente.');
  k := public.oficios_enviar('no-existe', 'clave-buena-1', 'fallo', 'Un texto de prueba suficiente.');
  r := array_append(r, case when j = k and j = '{"ok":false,"err":"clave"}'::jsonb then '3:ok' else '3:MAL' end);

  -- 4. lo que no vale: tipo raro, texto corto, texto larguísimo, nada
  r := array_append(r, case when
        public.oficios_enviar('prueba-sql', 'clave-buena-1', 'queja', 'Un texto de prueba suficiente.')->>'err' = 'tipo'
    and public.oficios_enviar('prueba-sql', 'clave-buena-1', null, 'Un texto de prueba suficiente.')->>'err' = 'tipo'
    and public.oficios_enviar('prueba-sql', 'clave-buena-1', 'fallo', '   corto   ')->>'err' = 'texto'
    and public.oficios_enviar('prueba-sql', 'clave-buena-1', 'fallo', largo)->>'err' = 'texto'
    and public.oficios_enviar('prueba-sql', 'clave-buena-1', 'fallo', null)->>'err' = 'texto'
    and public.oficios_enviar(null, null, 'fallo', 'Un texto de prueba suficiente.')->>'err' = 'clave'
    then '4:ok' else '4:MAL' end);

  -- 5. una petición buena entra y devuelve su número
  j := public.oficios_enviar('prueba-sql', 'clave-buena-1', 'fallo', '  El botón de asignar no hace nada.  ', ' Marta ', '#/aviso', '2026.11.13', 'iPhone · Safari', 'no-hace-falta');
  p1 := (j->>'id')::bigint;
  r := array_append(r, case when (j->>'ok')::boolean and p1 is not null then '5:ok' else '5:MAL' end);

  -- 18. lo que llega demasiado largo se corta a su tamaño
  j := public.oficios_enviar('prueba-sql', 'clave-buena-1', 'mejora', 'Otra petición, con campos larguísimos.', repeat('q', 100), repeat('p', 300), repeat('v', 90), repeat('a', 300));
  p2 := (j->>'id')::bigint;

  -- 6. el buzón: la petición sale como «recibida» y sin nada de lo que es solo para OOOX
  j := public.oficios_buzon('prueba-sql', 'clave-buena-1', '2026.11.13');
  select x into k from jsonb_array_elements(j->'peticiones') x where (x->>'id')::bigint = p1;
  r := array_append(r, case when jsonb_array_length(j->'peticiones') = 2 and k->>'estado' = 'recibida' and k->>'texto' = 'El botón de asignar no hace nada.' and k->>'quien' = 'Marta'
    and (select array_agg(c order by c) from jsonb_object_keys(k) c) = array['cerrada','creada','estado','id','quien','respuesta','texto','tipo']
    then '6:ok' else '6:MAL' end);

  -- 6b. cada negocio ve solo lo suyo: ni las peticiones ni las novedades de otro
  k := public.oficios_buzon('prueba-sql2', 'clave-buena-1');
  r := array_append(r, case when jsonb_array_length(k->'peticiones') = 0
    and (select array_agg((x->>'id')::bigint order by (x->>'id')::bigint) from jsonb_array_elements(j->'novedades') x where (x->>'id')::bigint in (nov1, nov2, nov3)) = array[nov1, nov2]
    and (select count(*) from jsonb_array_elements(k->'novedades') x where (x->>'id')::bigint in (nov1, nov2, nov3)) = 3
    then '6b:ok' else '6b:MAL' end);

  -- 7. darse de baja de las ofertas: dejan de salir; y se puede volver
  j := public.oficios_ofertas('prueba-sql', 'clave-buena-1', false);
  k := public.oficios_buzon('prueba-sql', 'clave-buena-1');
  r := array_append(r, case when (j->>'sin_ofertas')::boolean and (k->>'sin_ofertas')::boolean
    and not exists (select 1 from jsonb_array_elements(k->'novedades') x where x->>'tipo' = 'oferta')
    and exists (select 1 from jsonb_array_elements(k->'novedades') x where (x->>'id')::bigint = nov1)
    and not (public.oficios_ofertas('prueba-sql', 'clave-buena-1', true)->>'sin_ofertas')::boolean
    and public.oficios_ofertas('prueba-sql', 'clave-mala', false)->>'err' = 'clave'
    then '7:ok' else '7:MAL' end);

  -- 8. acuses de lectura: se apuntan las novedades vistas, pero no las que no son de ese negocio
  perform public.oficios_buzon('prueba-sql', 'clave-buena-1', null, null, array[nov1, nov3, 999999999]);
  perform public.oficios_buzon('prueba-sql', 'clave-buena-1', null, null, array[nov1]);   -- repetir no rompe nada

  -- 10. el tope: 10 peticiones por hora por negocio (ya lleva 2)
  for i in 3..10 loop
    if not (public.oficios_enviar('prueba-sql', 'clave-buena-1', 'duda', 'Petición de relleno número ' || i)->>'ok')::boolean then r := array_append(r, '10:MAL-antes'); end if;
  end loop;
  j := public.oficios_enviar('prueba-sql', 'clave-buena-1', 'duda', 'Esta ya es la undécima de la hora.');
  r := array_append(r, case when j->>'err' = 'limite' then '10:ok' else '10:MAL' end);

  -- 12. la demo es pública: sin remitente no entra; cada navegador ve solo lo que mandó él
  j := public.oficios_enviar('prueba-demo', 'DEMO', 'mejora', 'Una petición desde la demo.', null, null, null, null, null);
  k := public.oficios_enviar('prueba-demo', 'DEMO', 'mejora', 'Una petición desde la demo.', null, null, null, null, 'navegador-a');
  r := array_append(r, case when j->>'err' = 'remitente' and (k->>'ok')::boolean
    and jsonb_array_length(public.oficios_buzon('prueba-demo', 'DEMO', null, 'navegador-a')->'peticiones') = 1
    and jsonb_array_length(public.oficios_buzon('prueba-demo', 'DEMO', null, 'navegador-b')->'peticiones') = 0
    and jsonb_array_length(public.oficios_buzon('prueba-demo', 'DEMO', null, null)->'peticiones') = 0
    then '12:ok' else '12:MAL' end);

  -- 12b. en la demo nadie puede quitarle las ofertas a los demás, ni dejar acuses
  j := public.oficios_ofertas('prueba-demo', 'DEMO', false);
  perform public.oficios_buzon('prueba-demo', 'DEMO', null, 'navegador-a', array[nov1]);
  r := array_append(r, case when not (j->>'sin_ofertas')::boolean and exists (select 1 from jsonb_array_elements(public.oficios_buzon('prueba-demo', 'DEMO', null, 'navegador-b')->'novedades') x where x->>'tipo' = 'oferta')
    then '12b:ok' else '12b:MAL' end);

  -- 13. en la demo, el tope es por navegador: 5 por hora (ya lleva 1)
  for i in 2..5 loop perform public.oficios_enviar('prueba-demo', 'DEMO', 'duda', 'Relleno de la demo número ' || i, null, null, null, null, 'navegador-a'); end loop;
  r := array_append(r, case when public.oficios_enviar('prueba-demo', 'DEMO', 'duda', 'La sexta del mismo navegador.', null, null, null, null, 'navegador-a')->>'err' = 'limite'
    and (public.oficios_enviar('prueba-demo', 'DEMO', 'duda', 'La primera de otro navegador.', null, null, null, null, 'navegador-b')->>'ok')::boolean
    then '13:ok' else '13:MAL' end);

  -- 11. quien prueba códigos se queda fuera: 10 fallos en 10 minutos bloquean el negocio, también con el código bueno
  for i in 1..10 loop perform public.oficios_buzon('prueba-sql2', 'intento-' || i); end loop;
  r := array_append(r, case when public.oficios_buzon('prueba-sql2', 'clave-buena-1')->>'err' = 'bloqueo'
    and public.oficios_enviar('prueba-sql2', 'clave-buena-1', 'fallo', 'Un texto de prueba suficiente.')->>'err' = 'bloqueo'
    and (public.oficios_buzon('prueba-sql', 'clave-buena-1')->>'ok')::boolean      -- a los demás negocios no les afecta
    then '11:ok' else '11:MAL' end);

  perform set_config('role', 'none', true);   -- de vuelta, como Claude o como Oscar

  -- 5 y 18, vistos por dentro: entra como «nueva», sin espacios de sobra y con cada campo cortado a su tamaño
  r := array_append(r, case when
        (select estado = 'nueva' and texto = 'El botón de asignar no hace nada.' and quien = 'Marta' and remitente is null and pantalla = '#/aviso' and version = '2026.11.13' from oficios.peticiones where id = p1)
    and (select char_length(quien) = 60 and char_length(pantalla) = 120 and char_length(version) = 40 and char_length(aparato) = 120 from oficios.peticiones where id = p2)
    then '18:ok' else '18:MAL' end);

  -- 8, visto por dentro: un solo acuse, el de la novedad que sí era suya; la demo no deja ninguno
  r := array_append(r, case when (select array_agg(novedad) from oficios.novedades_vistas where negocio = 'prueba-sql') = array[nov1]
    and not exists (select 1 from oficios.novedades_vistas where negocio = 'prueba-demo')
    then '8:ok' else '8:MAL' end);

  -- 9. queda apuntado cuándo se vio a cada copia y con qué versión
  r := array_append(r, case when (select version = '2026.11.13' and visto > now() - interval '1 minute' from oficios.negocios where id = 'prueba-sql')
    then '9:ok' else '9:MAL' end);

  -- 16. cuando Claude la revisa, el negocio ve «mirando»; lo que Claude escribe para Oscar no sale nunca; la respuesta, sí
  update oficios.peticiones set estado = 'revisada', tema = 'asignar-no-responde', prioridad = 1, revision = 'SOLO PARA OSCAR', borrador = 'BORRADOR SIN APROBAR', revisada = now() where id = p1;
  j := public.oficios_buzon('prueba-sql', 'clave-buena-1');
  select x into k from jsonb_array_elements(j->'peticiones') x where (x->>'id')::bigint = p1;
  update oficios.peticiones set estado = 'aceptada', respuesta = 'Lo arreglamos esta semana.' where id = p1;
  r := array_append(r, case when k->>'estado' = 'mirando' and k->>'respuesta' is null and j::text !~ 'SOLO PARA OSCAR|BORRADOR SIN APROBAR|asignar-no-responde'
    and (select x->>'respuesta' = 'Lo arreglamos esta semana.' and x->>'estado' = 'aceptada' from jsonb_array_elements(public.oficios_buzon('prueba-sql', 'clave-buena-1')->'peticiones') x where (x->>'id')::bigint = p1)
    then '16:ok' else '16:MAL' end);

  -- 15. las vistas: la cola por prioridad, los temas contando negocios de verdad (la demo no cuenta) y las copias
  insert into oficios.peticiones(negocio, tipo, texto, tema) values ('prueba-sql2', 'fallo', 'Lo mismo que le pasa al otro negocio.', 'asignar-no-responde');
  insert into oficios.peticiones(negocio, remitente, tipo, texto, tema) values ('prueba-demo', 'navegador-a', 'fallo', 'Lo mismo, pero desde la demo.', 'asignar-no-responde');
  insert into oficios.negocios(id, nombre, prueba, clave_hash) values ('prueba-copia', 'Copia de prueba', true, oficios.huella('prueba-copia', 'clave-buena-1'));
  insert into oficios.peticiones(negocio, tipo, texto, tema) values ('prueba-copia', 'fallo', 'Lo mismo, desde una copia de prueba.', 'asignar-no-responde');
  r := array_append(r, case when
        (select id = p1 from oficios.cola where negocio_id like 'prueba-%' limit 1)
    and (select negocios = 2 and peticiones = 4 and abierta from oficios.temas where tema = 'asignar-no-responde')   -- ni la demo ni la copia de prueba cuentan como negocio
    and (select prueba and peticiones = 1 from oficios.copias where id = 'prueba-copia') and (select bool_or(prueba) from oficios.cola where negocio_id = 'prueba-copia')
    and (select abiertas = 10 and peticiones = 10 and version = '2026.11.13' from oficios.copias where id = 'prueba-sql')
    then '15:ok' else '15:MAL' end);

  -- 14. un negocio dado de baja ya no entra, y contesta lo mismo que si el código fuera malo
  update oficios.negocios set activo = false where id = 'prueba-sql';
  r := array_append(r, case when public.oficios_buzon('prueba-sql', 'clave-buena-1') = '{"ok":false,"err":"clave"}'::jsonb then '14:ok' else '14:MAL' end);

  raise exception 'RESULTADOS %', array_to_string(r, ' | ');
end $$;
