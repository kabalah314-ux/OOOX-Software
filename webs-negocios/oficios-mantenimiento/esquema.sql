-- OOOX Oficios · mantenimiento
-- ============================================================
-- Lo que hace falta para que la app se cuide sola una vez entregada:
--   1. ERRORES: la app apunta sola lo que le falla, sin datos de nadie (public.oficios_error).
--   2. SALUD: una pregunta mínima para el vigilante de GitHub, cada 5 minutos (public.oficios_salud).
--   3. COPIAS: cada noche, una copia de todo lo de oficios, cifrada con la llave pública de Oscar. Aquí solo se puede
--      cifrar: para leerla hace falta su llave privada, que está en su PC (ver LEEME.md). GitHub la baja y la guarda
--      90 días (public.oficios_copia).
--   4. LIMPIEZA: cada noche se quitan los registros que solo sirven unos días (errores viejos, frenos de abuso).
--   5. INFORME, ESPACIO y CADUCADOS: los números para el resumen diario y el informe de cada mes. Sin datos personales.
--   6. OLVIDAR: borrar los datos de un cliente que lo pida (primero se simula; se aplica solo con el visto bueno de Oscar).
--
-- Dónde vive: proyecto «neuron-staging» de Supabase (Irlanda), esquema «oficios», como el buzón y el servidor.
-- Se puede pasar más de una vez: no borra nada que no sea suyo.
-- Las pruebas: pruebas.sql (se deshacen solas).

-- ---------- 1. ERRORES ----------
create table if not exists oficios.errores (
  id           bigint generated always as identity primary key,
  negocio      text not null,
  huella       text not null,                 -- sha256 de lo que hace igual a un fallo: sitio, tipo, mensaje y primera línea
  pagina       text not null check (pagina in ('app','cita','cliente','web','otra')),
  pantalla     text,                          -- solo el primer trozo de la ruta (#/aviso/… → «aviso»), nunca el enlace
  tipo         text not null check (tipo in ('js','promesa','recurso','servidor','consola')),
  mensaje      text not null,                 -- limpio (oficios.limpia): sin teléfonos, correos, códigos, llaves ni frases
  pila         text,                          -- las primeras líneas, limpias
  version      text,                          -- la versión de las reglas de la app que lo vio por última vez
  aparatos     text[] not null default '{}',  -- «iPhone · Safari», «Android · Chrome»… (hasta 6 distintos)
  rol          text,                          -- centralita, tecnico, cliente, web u oficina; nunca quién
  veces        int not null default 1,
  primera      timestamptz not null default now(),
  ultima       timestamptz not null default now(),
  estado       text not null default 'nuevo' check (estado in ('nuevo','visto','arreglado','vuelve','ignorado')),
  arreglado_en text,                          -- la versión que lo arregla: si vuelve a salir desde esa o una posterior, pasa a «vuelve»
  nota         text                           -- lo que apunta Claude: causa, commit, por qué se ignora
);
create unique index if not exists errores_huella on oficios.errores (negocio, huella);
create index if not exists errores_abiertos on oficios.errores (ultima desc) where estado in ('nuevo','vuelve','visto');
alter table oficios.errores enable row level security;

-- Quita de un texto lo que pueda ser de alguien: enlaces con su parte de después (?… y #…), rutas de la app, correos,
-- frases entre comillas, códigos, llaves, fotos y teléfonos o números largos. Deja nombres de propiedades y posiciones
-- (app.html:441:23). La app hace lo mismo antes de mandar (js/oficio-vigia.js); esto es la garantía.
create or replace function oficios.limpia(p text, p_max int) returns text
language sql immutable set search_path = '' as $$
  select btrim(left(
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      left(coalesce(p, ''), 6000),
      'data:[^[:space:]"'')(,]+(,[^[:space:]"'')]*)?', 'data:…', 'g'),
      '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[correo]', 'g'),
      '(https?://[^[:space:]?#"''<>()]*)(\?[^[:space:]#"''<>():]*)?(#[^[:space:]"''<>():]*)?', '\1', 'g'),
      '#/[^[:space:]"''<>():]*', '#/…', 'g'),
      '"[^"\n]{0,200}[[:space:]][^"\n]{0,200}"', '"…"', 'g'),
      '''[^''\n]{0,200}[[:space:]][^''\n]{0,200}''', '''…''', 'g'),
      '\m[A-Za-z0-9]{4}(-[A-Za-z0-9]{4})+\M', '[código]', 'g'),
      '[A-Za-z0-9+=_]{22,}', '[x]', 'g'),
      '(^|[^:[:alnum:]_])\+?\d([ .-]?\d){6,}', '\1#', 'g'),
    greatest(p_max, 1)))
$$;

-- La app manda sus fallos en tandas de hasta 10. Cualquiera puede llamar (la app de un cliente aún no ha entrado),
-- así que todo tiene tope: 10 por llamada, 200 fallos nuevos al día por negocio y 3.000 guardados por negocio.
-- Un fallo repetido no ocupa más: suma «veces». No se guarda la conexión ni quién era.
create or replace function public.oficios_error(p_negocio text, p_lote jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  n oficios.negocios; it jsonb; hechos int := 0; nuevos_hoy int; total int;
  v_pagina text; v_pantalla text; v_tipo text; v_msg text; v_pila text; v_version text; v_aparato text; v_rol text; v_n int; v_huella text;
begin
  if p_negocio is null or char_length(p_negocio) > 40 or p_lote is null or jsonb_typeof(p_lote) <> 'array' then
    return jsonb_build_object('ok', false, 'err', 'peticion'); end if;
  select * into n from oficios.negocios where id = p_negocio;
  if not found or not n.activo then return jsonb_build_object('ok', false, 'err', 'negocio'); end if;
  select count(*) filter (where primera > now() - interval '1 day'), count(*) into nuevos_hoy, total from oficios.errores where negocio = p_negocio;
  for it in select value from jsonb_array_elements(p_lote) limit 10 loop
    if jsonb_typeof(it) <> 'object' then continue; end if;
    v_msg := oficios.limpia(it->>'mensaje', 300);
    if v_msg = '' then continue; end if;
    v_pagina   := case when it->>'pagina' in ('app','cita','cliente','web') then it->>'pagina' else 'otra' end;
    v_tipo     := case when it->>'tipo' in ('js','promesa','recurso','servidor','consola') then it->>'tipo' else 'js' end;
    v_pantalla := nullif(left(regexp_replace(lower(coalesce(it->>'pantalla', '')), '[^a-z0-9-]', '', 'g'), 20), '');
    v_pila     := nullif(oficios.limpia(it->>'pila', 1500), '');
    v_version  := nullif(left(regexp_replace(coalesce(it->>'version', ''), '[^0-9A-Za-z.-]', '', 'g'), 24), '');
    v_aparato  := nullif(btrim(left(regexp_replace(coalesce(it->>'aparato', ''), '[^A-Za-z0-9 ·.]', '', 'g'), 40)), '');
    v_rol      := case when it->>'rol' in ('centralita','tecnico','cliente','web','oficina') then it->>'rol' end;
    v_n        := case when coalesce(it->>'n', '') ~ '^[0-9]{1,4}$' then least(greatest((it->>'n')::int, 1), 1000) else 1 end;
    -- lo que hace igual a un fallo: sin números (las posiciones cambian de una versión a otra)
    v_huella := encode(sha256(convert_to(p_negocio || '|' || v_pagina || '|' || v_tipo || '|' || regexp_replace(v_msg, '[0-9]+', '0', 'g')
                || '|' || regexp_replace(coalesce(split_part(v_pila, E'\n', 1), ''), '[0-9]+', '0', 'g'), 'UTF8')), 'hex');
    update oficios.errores e set
        veces = least(e.veces + v_n, 2000000000), ultima = now(), version = coalesce(v_version, e.version),
        aparatos = case when v_aparato is null or v_aparato = any(e.aparatos) or cardinality(e.aparatos) >= 6 then e.aparatos else e.aparatos || v_aparato end,
        estado = case when e.estado = 'arreglado' and v_version is not null and e.arreglado_en is not null and v_version >= e.arreglado_en then 'vuelve' else e.estado end
      where e.negocio = p_negocio and e.huella = v_huella;
    if not found then
      if nuevos_hoy >= 200 or total >= 3000 then continue; end if;
      insert into oficios.errores(negocio, huella, pagina, pantalla, tipo, mensaje, pila, version, aparatos, rol, veces)
      values (p_negocio, v_huella, v_pagina, v_pantalla, v_tipo, v_msg, v_pila, v_version,
              case when v_aparato is null then '{}'::text[] else array[v_aparato] end, v_rol, v_n)
      on conflict (negocio, huella) do update set veces = least(oficios.errores.veces + excluded.veces, 2000000000), ultima = now();
      nuevos_hoy := nuevos_hoy + 1; total := total + 1;
    end if;
    hechos := hechos + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', hechos);
end $$;

-- ---------- 2. SALUD ----------
-- Lo mínimo para saber que la base de datos contesta y lee el esquema. No dice nada de nadie.
create or replace function public.oficios_salud()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'datos', exists(select 1 from oficios.negocios), 't', floor(extract(epoch from now()) * 1000)::bigint)
$$;

-- ---------- 3. COPIAS ----------
-- La llave pública de las copias (la privada la guarda Oscar). Una sola fila.
create table if not exists oficios.copias_llave (
  id      int primary key default 1 check (id = 1),
  huella  text not null,           -- la huella de la llave (para comprobar que es la de Oscar)
  publica text not null,           -- la llave pública, en texto
  puesta  timestamptz not null default now()
);
alter table oficios.copias_llave enable row level security;

-- Las copias hechas. Se guardan las 7 últimas; GitHub se las lleva fuera cada noche.
create table if not exists oficios.copias_seguridad (
  id           bigint generated always as identity primary key,
  hecha        timestamptz not null default now(),
  huella_llave text not null,
  bytes        int not null,
  sha256       text not null,      -- del archivo cifrado, para comprobar que llega entero
  cuentas      jsonb not null,     -- filas de cada tabla: para el resumen y para comprobar una restauración
  datos        bytea not null      -- cifrado: solo se lee con la llave privada de Oscar
);
alter table oficios.copias_seguridad enable row level security;

-- Las veces que se pide bajar una copia (freno: 30 al día entre todos)
create table if not exists oficios.bajadas (
  id     bigint generated always as identity primary key,
  cuando timestamptz not null default now()
);
alter table oficios.bajadas enable row level security;

-- Hace la copia: todas las tablas de oficios que hacen falta para volver a ponerlo todo, en un JSON cifrado.
-- Quedan fuera los frenos de abuso (se rehacen solos). «estados.datos» va como texto, para no perder el orden de las claves.
create or replace function oficios.hacer_copia()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  k oficios.copias_llave; doc jsonb; tablas jsonb := '{}'; cuentas jsonb := '{}'; filas jsonb; tabla text; c bytea; nuevo bigint;
  lista text[] := array['negocios','estados','avisos','diario','personas','clientes','peticiones','cambios','novedades','novedades_vistas','errores','olvidos'];
begin
  select * into k from oficios.copias_llave where id = 1;
  if not found then raise exception 'falta la llave pública de las copias (oficios.copias_llave)'; end if;
  foreach tabla in array lista loop
    if to_regclass('oficios.' || tabla) is null then continue; end if;
    if tabla = 'estados' then
      select coalesce(jsonb_agg((to_jsonb(fila) - 'datos') || jsonb_build_object('datos_txt', fila.datos::text)), '[]'::jsonb) into filas from oficios.estados fila;
    else
      -- «fila» y no «t»: el diario tiene una columna que se llama «t», y to_jsonb(t) daría esa columna en vez de la fila
      execute format('select coalesce(jsonb_agg(to_jsonb(fila)), ''[]''::jsonb) from oficios.%I fila', tabla) into filas;
    end if;
    tablas := tablas || jsonb_build_object(tabla, filas);
    cuentas := cuentas || jsonb_build_object(tabla, jsonb_array_length(filas));
  end loop;
  doc := jsonb_build_object('formato', 'ooox-oficios-copia/1', 'hecha', now(), 'esquema', 'oficios', 'cuentas', cuentas, 'tablas', tablas);
  c := extensions.pgp_pub_encrypt(doc::text, extensions.dearmor(k.publica), 'compress-algo=2, compress-level=6, cipher-algo=aes256');
  insert into oficios.copias_seguridad(huella_llave, bytes, sha256, cuentas, datos)
  values (k.huella, octet_length(c), encode(extensions.digest(c, 'sha256'), 'hex'), cuentas, c) returning id into nuevo;
  -- solo las 7 últimas: las anteriores ya están fuera (GitHub, 90 días)
  delete from oficios.copias_seguridad where id not in (select id from oficios.copias_seguridad order by hecha desc, id desc limit 7);
  return jsonb_build_object('ok', true, 'id', nuevo, 'bytes', octet_length(c), 'cuentas', cuentas);
end $$;

-- Para bajarla (GitHub, cada noche). Solo da lo cifrado: sin la llave privada no se lee nada.
create or replace function public.oficios_copia(p_id bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c oficios.copias_seguridad; hoy int;
begin
  select count(*) into hoy from oficios.bajadas where cuando > now() - interval '1 day';
  if hoy >= 30 then return jsonb_build_object('ok', false, 'err', 'limite'); end if;
  insert into oficios.bajadas default values;
  if p_id is null then select * into c from oficios.copias_seguridad order by hecha desc, id desc limit 1;
  else select * into c from oficios.copias_seguridad where id = p_id; end if;
  if not found then return jsonb_build_object('ok', false, 'err', 'nada'); end if;
  return jsonb_build_object('ok', true, 'id', c.id, 'hecha', c.hecha, 'huella_llave', c.huella_llave, 'bytes', c.bytes, 'sha256', c.sha256,
    'datos', translate(encode(c.datos, 'base64'), E'\n', ''));
end $$;

-- ---------- 4. LIMPIEZA ----------
-- Solo registros que se hacen solos y sirven unos días. Los avisos, clientes y peticiones no se tocan nunca aquí.
create or replace function oficios.limpieza()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a int; b int; c int; d int; e int;
begin
  delete from oficios.errores where ultima < now() - interval '90 days'; get diagnostics a = row_count;
  delete from oficios.intentos where cuando < now() - interval '7 days'; get diagnostics b = row_count;
  delete from oficios.intentos_persona where cuando < now() - interval '7 days'; get diagnostics c = row_count;
  delete from oficios.topes where cuando < now() - interval '7 days'; get diagnostics d = row_count;
  delete from oficios.bajadas where cuando < now() - interval '7 days'; get diagnostics e = row_count;
  return jsonb_build_object('ok', true, 'errores', a, 'intentos', b, 'intentos_persona', c, 'topes', d, 'bajadas', e);
end $$;

-- ---------- 5. NÚMEROS ----------
-- Espacio: el plan gratis deja 500 MB para todo el proyecto (también el juego, que vive en el mismo).
create or replace function oficios.espacio()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'base_bytes', pg_database_size(current_database()),
    'limite_bytes', 500 * 1024 * 1024,
    'oficios_bytes', (select coalesce(sum(pg_total_relation_size(c.oid)), 0) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'oficios' and c.relkind = 'r'),
    'tablas', (select jsonb_object_agg(c.relname, pg_total_relation_size(c.oid)) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'oficios' and c.relkind = 'r'))
$$;

-- El informe de un negocio entre dos días (incluidos): lo que se ha hecho, de dónde vienen los avisos, lo que tarda la
-- oficina en asignar, los fallos y las peticiones. Solo cuentas y tiempos: ningún dato de nadie.
create or replace function oficios.informe(p_negocio text, p_desde date, p_hasta date)
returns jsonb language sql stable security definer set search_path = '' as $$
  with d as (select * from oficios.diario where negocio = p_negocio and cuando >= p_desde and cuando < p_hasta + 1),
  pedidos as (select nuevos->0->>'id' as id, t from d where accion->>'tipo' = 'pedir' and jsonb_typeof(nuevos) = 'array' and jsonb_array_length(nuevos) > 0),
  asignar as (select p.id, (select min(x.t) from oficios.diario x where x.negocio = p_negocio and x.accion->>'tipo' = 'asignar' and x.accion->>'id' = p.id) - p.t as ms from pedidos p),
  ida as (select y.id, min(y.t) as voy, (select min(x.t) from oficios.diario x where x.negocio = p_negocio and x.accion->>'tipo' = 'empezar' and x.accion->>'id' = y.id) as emp
          from (select accion->>'id' as id, t from d where accion->>'tipo' = 'voy') y group by y.id)
  select jsonb_build_object(
    'negocio', p_negocio, 'desde', p_desde, 'hasta', p_hasta,
    'acciones', (select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) from (select accion->>'tipo' as tipo, count(*) as n from d group by 1) x),
    'avisos_por_origen', (select coalesce(jsonb_object_agg(coalesce(o, 'otro'), n), '{}'::jsonb) from (select accion->>'origen' as o, count(*) as n from d where accion->>'tipo' = 'pedir' group by 1) x),
    'por_rol', (select coalesce(jsonb_object_agg(coalesce(r, '?'), n), '{}'::jsonb) from (select q->>'rol' as r, count(*) as n from d group by 1) x),
    'personas_activas', (select count(distinct q->>'id') from d where q->>'rol' in ('centralita','tecnico')),
    'min_hasta_asignar_mediana', (select round((percentile_cont(0.5) within group (order by ms) / 60000.0)::numeric, 1) from asignar where ms is not null),
    'min_de_voy_a_empezar_mediana', (select round((percentile_cont(0.5) within group (order by emp - voy) / 60000.0)::numeric, 1) from ida where emp is not null),
    'errores', (select jsonb_build_object('distintos', count(*), 'veces', coalesce(sum(veces), 0), 'abiertos', count(*) filter (where estado in ('nuevo','vuelve','visto')))
                from oficios.errores where negocio = p_negocio and ultima >= p_desde and primera < p_hasta + 1),
    'peticiones', (select jsonb_build_object(
                     'nuevas', count(*) filter (where creada >= p_desde and creada < p_hasta + 1),
                     'hechas', count(*) filter (where estado = 'hecha' and cerrada >= p_desde and cerrada < p_hasta + 1),
                     'abiertas', count(*) filter (where estado in ('nueva','revisada','aceptada','en_curso')))
                   from oficios.peticiones where negocio = p_negocio))
$$;

-- Avisos más viejos que «p_meses» (por cuándo se pidieron), por negocio. Solo cuenta: no borra nada.
-- Cuánto tiempo se guardan los datos lo decide cada negocio con su asesor; esto dice cuántos pasan de ese plazo.
create or replace function oficios.caducados(p_meses int default 36)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(negocio, n), '{}'::jsonb) from (
    select negocio, count(*) as n from oficios.avisos
    where coalesce(datos->>'t', '') ~ '^[0-9]{10,14}$' and (datos->>'t')::bigint < floor(extract(epoch from now() - make_interval(months => greatest(p_meses, 1))) * 1000)
    group by negocio) x
$$;

-- Todo lo de un negocio, para dárselo cuando se va (o cuando lo pida): cifrado con la llave de Oscar, que lo descifra
-- en su PC y se lo entrega al negocio. Sin los códigos de acceso (ni sus huellas). Devuelve el archivo en base64.
create or replace function oficios.exportar_negocio(p_negocio text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare k oficios.copias_llave; doc jsonb; c bytea;
begin
  select * into k from oficios.copias_llave where id = 1;
  if not found then raise exception 'falta la llave pública de las copias'; end if;
  if not exists (select 1 from oficios.negocios where id = p_negocio) then return jsonb_build_object('ok', false, 'err', 'negocio'); end if;
  doc := jsonb_build_object('formato', 'ooox-oficios-exportacion/1', 'negocio', p_negocio, 'hecha', now(),
    'datos_negocio', (select e.datos::text from oficios.estados e where e.negocio = p_negocio),
    'cabecera', (select e.cab from oficios.estados e where e.negocio = p_negocio),
    'avisos', (select coalesce(jsonb_agg(a.datos order by a.id), '[]'::jsonb) from oficios.avisos a where a.negocio = p_negocio),
    'diario', (select coalesce(jsonb_agg(jsonb_build_object('v', d.v, 'cuando', d.cuando, 'quien', d.q, 'accion', d.accion) order by d.v), '[]'::jsonb) from oficios.diario d where d.negocio = p_negocio),
    'personas', (select coalesce(jsonb_agg(jsonb_build_object('persona', p.persona, 'rol', p.rol, 'activo', p.activo, 'creada', p.creada) order by p.persona), '[]'::jsonb) from oficios.personas p where p.negocio = p_negocio),
    'peticiones', (select coalesce(jsonb_agg(jsonb_build_object('creada', x.creada, 'tipo', x.tipo, 'texto', x.texto, 'estado', x.estado, 'respuesta', x.respuesta) order by x.id), '[]'::jsonb) from oficios.peticiones x where x.negocio = p_negocio));
  c := extensions.pgp_pub_encrypt(doc::text, extensions.dearmor(k.publica), 'compress-algo=2, compress-level=6, cipher-algo=aes256');
  return jsonb_build_object('ok', true, 'negocio', p_negocio, 'bytes', octet_length(c), 'huella_llave', k.huella, 'datos', translate(encode(c, 'base64'), E'\n', ''));
end $$;

-- ---------- 6. OLVIDAR A UN CLIENTE ----------
-- Lo que queda apuntado de cada olvido: sin el teléfono (solo su huella), para volver a aplicarlo si un día hubiera que
-- restaurar una copia de antes.
create table if not exists oficios.olvidos (
  id        bigint generated always as identity primary key,
  negocio   text not null,
  cuando    timestamptz not null default now(),
  huella    text not null,          -- sha256 de «negocio:las 9 últimas cifras del teléfono»
  avisos    int not null,
  diario    int not null,
  contratos int not null,
  zona      boolean not null        -- si tenía código de su zona de cliente (se quita)
);
alter table oficios.olvidos enable row level security;

-- Tapa en un JSON los valores de esas claves, a cualquier profundidad: los textos quedan vacíos y lo demás, nulo.
create or replace function oficios.tapa(j jsonb, claves text[])
returns jsonb language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; r jsonb;
begin
  if j is null then return null; end if;
  if jsonb_typeof(j) = 'object' then
    r := '{}'::jsonb;
    for k, v in select * from jsonb_each(j) loop
      if k = any(claves) then
        r := r || jsonb_build_object(k, case jsonb_typeof(v) when 'string' then to_jsonb(''::text) when 'array' then '[]'::jsonb when 'object' then '{}'::jsonb else 'null'::jsonb end);
      else
        r := r || jsonb_build_object(k, oficios.tapa(v, claves));
      end if;
    end loop;
    return r;
  elsif jsonb_typeof(j) = 'array' then
    return coalesce((select jsonb_agg(oficios.tapa(e, claves) order by i) from jsonb_array_elements(j) with ordinality as x(e, i)), '[]'::jsonb);
  end if;
  return j;
end $$;

-- Los datos de un cliente, por su teléfono: nombre, apellidos, teléfono, dirección, código postal, notas, fotos y firmas,
-- en sus avisos, en el diario, en sus contratos y su código de la zona del cliente. Quedan los importes, las fechas, el
-- barrio y el trabajo hecho (los papeles con obligación legal de guardarse, como las facturas, van en el programa de
-- facturas del negocio, no aquí).
-- Con p_aplicar = false (lo normal) solo dice lo que haría. Con un aviso aún abierto no hace nada: primero se cierra.
-- Los aparatos que ya tenían el aviso lo reciben tapado en su siguiente vuelta (sube la versión del negocio).
create or replace function oficios.olvidar_cliente(p_negocio text, p_tel text, p_aplicar boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t9 text := right(regexp_replace(coalesce(p_tel, ''), '[^0-9]', '', 'g'), 9);
  claves text[] := array['nombre','apellidos','tel','dir','cp','nota','foto','fotos','firma','email','correo','texto'];
  ids text[]; abiertos text[]; nd int; nc int; zona boolean; ve bigint; cab jsonb;
begin
  if char_length(t9) <> 9 then return jsonb_build_object('ok', false, 'err', 'tel'); end if;
  select coalesce(array_agg(id order by id), '{}'), coalesce(array_agg(id order by id) filter (where datos->>'e' in ('nuevo','asignado','camino','curso')), '{}')
    into ids, abiertos
    from oficios.avisos where negocio = p_negocio and right(regexp_replace(coalesce(datos->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9) = t9;
  select count(*) into nd from oficios.diario d where d.negocio = p_negocio and (
      d.accion->>'id' = any(ids)
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d.nuevos) = 'array' then d.nuevos else '[]'::jsonb end) x where x->>'id' = any(ids))
      or right(regexp_replace(coalesce(d.accion->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9) = t9);
  select e.cab into cab from oficios.estados e where e.negocio = p_negocio;
  select count(*) into nc from jsonb_array_elements(case when jsonb_typeof(cab->'contratos') = 'array' then cab->'contratos' else '[]'::jsonb end) x
    where right(regexp_replace(coalesce(x->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9) = t9;
  select exists(select 1 from oficios.clientes c where c.negocio = p_negocio and right(regexp_replace(c.tel, '[^0-9]', '', 'g'), 9) = t9) into zona;
  if cardinality(abiertos) > 0 then
    return jsonb_build_object('ok', false, 'err', 'abiertos', 'abiertos', to_jsonb(abiertos), 'avisos', to_jsonb(ids), 'diario', nd, 'contratos', nc, 'zona', zona); end if;
  if not p_aplicar then
    return jsonb_build_object('ok', true, 'simulado', true, 'avisos', to_jsonb(ids), 'diario', nd, 'contratos', nc, 'zona', zona); end if;
  if cardinality(ids) = 0 and nd = 0 and nc = 0 and not zona then return jsonb_build_object('ok', false, 'err', 'nadie'); end if;

  select e.v + 1 into ve from oficios.estados e where e.negocio = p_negocio for update;
  -- su enlace deja de valer: llave nueva, en la columna y dentro del aviso
  update oficios.avisos a set
      datos = jsonb_set(jsonb_set(oficios.tapa(a.datos, claves), '{cli,nombre}', to_jsonb('Cliente borrado'::text), true), '{llave}', to_jsonb(x.nueva), false),
      vista = oficios.tapa(a.vista, claves),
      llave = x.nueva,
      v = coalesce(ve, a.v)
    from (select y.id, substr(md5(random()::text || clock_timestamp()::text || y.id), 1, 24) as nueva from oficios.avisos y where y.negocio = p_negocio and y.id = any(ids)) x
    where a.negocio = p_negocio and a.id = x.id;
  -- en el diario, también la llave vieja del enlace
  update oficios.diario d set accion = oficios.tapa(d.accion, array_append(claves, 'llave')), res = oficios.tapa(d.res, array_append(claves, 'llave')), nuevos = oficios.tapa(d.nuevos, array_append(claves, 'llave'))
    where d.negocio = p_negocio and (
      d.accion->>'id' = any(ids)
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d.nuevos) = 'array' then d.nuevos else '[]'::jsonb end) x where x->>'id' = any(ids))
      or right(regexp_replace(coalesce(d.accion->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9) = t9);
  if ve is not null then
    update oficios.estados e set
        cab = case when jsonb_typeof(e.cab->'contratos') = 'array' then jsonb_set(e.cab, '{contratos}', (
                select coalesce(jsonb_agg(case when right(regexp_replace(coalesce(x->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9) = t9
                                             then jsonb_set(oficios.tapa(x, claves), '{cli,nombre}', to_jsonb('Cliente borrado'::text), true) else x end order by i), '[]'::jsonb)
                from jsonb_array_elements(e.cab->'contratos') with ordinality as y(x, i))) else e.cab end,
        v = ve, cambiado = now()
      where e.negocio = p_negocio;
  end if;
  delete from oficios.clientes c where c.negocio = p_negocio and right(regexp_replace(c.tel, '[^0-9]', '', 'g'), 9) = t9;
  insert into oficios.olvidos(negocio, huella, avisos, diario, contratos, zona)
  values (p_negocio, encode(sha256(convert_to(p_negocio || ':' || t9, 'UTF8')), 'hex'), cardinality(ids), nd, nc, zona);
  return jsonb_build_object('ok', true, 'simulado', false, 'avisos', to_jsonb(ids), 'diario', nd, 'contratos', nc, 'zona', zona);
end $$;

-- Después de restaurar una copia vieja: vuelve a olvidar a los clientes que lo pidieron (los que están en «olvidos»).
-- Solo por la huella: el teléfono no se guardó. Los que tengan un aviso abierto en la copia se dicen y no se tocan.
create or replace function oficios.reaplicar_olvidos()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; x jsonb; hechos int := 0; pendientes jsonb := '[]'::jsonb;
begin
  for r in select distinct a.negocio, right(regexp_replace(coalesce(a.datos->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9) as t9
           from oficios.avisos a
           where char_length(right(regexp_replace(coalesce(a.datos->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9)) = 9
             and encode(sha256(convert_to(a.negocio || ':' || right(regexp_replace(coalesce(a.datos->'cli'->>'tel', ''), '[^0-9]', '', 'g'), 9), 'UTF8')), 'hex')
                 in (select o.huella from oficios.olvidos o where o.negocio = a.negocio)
  loop
    x := oficios.olvidar_cliente(r.negocio, r.t9, true);
    if (x->>'ok')::boolean then hechos := hechos + 1; else pendientes := pendientes || jsonb_build_object('negocio', r.negocio, 'err', x->>'err', 'abiertos', x->'abiertos'); end if;
  end loop;
  return jsonb_build_object('ok', true, 'reaplicados', hechos, 'pendientes', pendientes);
end $$;

-- ---------- PERMISOS ----------
-- Desde el navegador solo se puede: mandar fallos, preguntar si hay salud y bajar la copia cifrada.
revoke all on function oficios.limpia(text, int) from public;
revoke all on function oficios.hacer_copia() from public;
revoke all on function oficios.limpieza() from public;
revoke all on function oficios.espacio() from public;
revoke all on function oficios.informe(text, date, date) from public;
revoke all on function oficios.caducados(int) from public;
revoke all on function oficios.tapa(jsonb, text[]) from public;
revoke all on function oficios.olvidar_cliente(text, text, boolean) from public;
revoke all on function oficios.reaplicar_olvidos() from public;
revoke all on function oficios.exportar_negocio(text) from public;
revoke all on function public.oficios_error(text, jsonb) from public;
revoke all on function public.oficios_salud() from public;
revoke all on function public.oficios_copia(bigint) from public;
grant execute on function public.oficios_error(text, jsonb) to anon, authenticated;
grant execute on function public.oficios_salud() to anon, authenticated;
grant execute on function public.oficios_copia(bigint) to anon, authenticated;

-- ---------- LA LLAVE PÚBLICA ----------
-- La de Oscar, hecha el 16-11-2026. Huella: E139 A2E4 23A3 3471 B3AA 045D E468 D379 0166 03CC.
-- Para cambiarla: hacer otra (LEEME.md), poner aquí la nueva y pasar este archivo. Las copias viejas siguen
-- necesitando la llave privada vieja: no se tira.
insert into oficios.copias_llave(id, huella, publica) values (1, 'E139A2E423A33471B3AA045DE468D379016603CC', $llave$-----BEGIN PGP PUBLIC KEY BLOCK-----

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
=79fQ
-----END PGP PUBLIC KEY BLOCK-----$llave$)
on conflict (id) do nothing;

-- ---------- CADA NOCHE (pg_cron, hora UTC) ----------
-- 02:17 la copia; 02:47 la limpieza. GitHub baja la copia a las 03:05.
select cron.schedule('oficios-copia-noche', '17 2 * * *', 'select oficios.hacer_copia()');
select cron.schedule('oficios-limpieza-noche', '47 2 * * *', 'select oficios.limpieza()');
