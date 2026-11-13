-- OOOX Oficios · buzón de peticiones, mejoras y novedades
-- ============================================================
-- Qué es: la base de datos donde cada copia de la app deja lo que falla o lo que quiere, y de donde lee sus respuestas
-- y las novedades de OOOX. La lee Claude (conector de Supabase) y la ve Oscar.
--
-- Dónde vive hoy: proyecto «neuron-staging» de Supabase (Irlanda), en el esquema «oficios». El plan gratis solo deja dos
-- proyectos y los dos estaban ocupados. Para mudarlo a un proyecto propio basta con pasar este archivo allí, copiar las
-- filas y cambiar la dirección y la clave pública en js/oficio-soporte.js.
--
-- Cómo se protege:
--  * El esquema «oficios» no está en la API. El navegador NO puede leer ni escribir las tablas.
--  * El navegador solo puede llamar a tres funciones: public.oficios_enviar, public.oficios_buzon y public.oficios_ofertas.
--  * Cada negocio tiene un código de soporte. Se guarda su huella (sha256), nunca el código.
--  * Diez códigos fallados en diez minutos bloquean ese negocio diez minutos.
--  * Límites: 10 peticiones por hora y 30 al día por negocio, de 10 a 2.000 letras.
--  * En la demo (pública), cada navegador ve solo lo que ha mandado él.
--
-- Este archivo se puede pasar más de una vez: no borra nada.

create schema if not exists oficios;
revoke all on schema oficios from public;
revoke all on schema oficios from anon, authenticated;

create table if not exists oficios.negocios (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  nombre      text not null,
  plan        text not null default 'pro' check (plan in ('pro','asistente')),
  activo      boolean not null default true,
  demo        boolean not null default false,
  clave_hash  text not null,
  sin_ofertas boolean not null default false,
  version     text,                 -- la versión de la app que dijo tener la última vez
  visto       timestamptz,          -- la última vez que su oficina abrió «Mejoras»
  url         text,
  creado      timestamptz not null default now()
);

create table if not exists oficios.cambios (
  id        bigint generated always as identity primary key,
  titulo    text not null,
  detalle   text,
  alcance   text not null default 'negocio' check (alcance in ('negocio','todos')),
  negocio   text references oficios.negocios(id),
  version   text,
  commit    text,
  estado    text not null default 'propuesto' check (estado in ('propuesto','aprobado','publicado','descartado')),
  creado    timestamptz not null default now(),
  publicado timestamptz
);

create table if not exists oficios.peticiones (
  id           bigint generated always as identity primary key,
  negocio      text not null references oficios.negocios(id),
  remitente    text,                -- solo en la demo: cada navegador ve lo suyo
  tipo         text not null check (tipo in ('fallo','mejora','duda')),
  texto        text not null check (char_length(texto) between 10 and 2000),
  quien        text check (quien is null or char_length(quien) <= 60),
  pantalla     text check (pantalla is null or char_length(pantalla) <= 120),
  version      text check (version is null or char_length(version) <= 40),
  aparato      text check (aparato is null or char_length(aparato) <= 120),
  estado       text not null default 'nueva' check (estado in ('nueva','revisada','aceptada','en_curso','hecha','descartada','duplicada')),
  prioridad    smallint check (prioridad between 1 and 3),   -- 1 urge, 2 normal, 3 puede esperar
  tema         text,                -- lo pone Claude: una clave corta para juntar las repetidas (p. ej. «cita-varias-franjas»)
  revision     text,                -- lo que Claude le cuenta a Oscar. El negocio no lo ve
  borrador     text,                -- respuesta que propone Claude. El negocio no la ve
  respuesta    text,                -- lo que ve el negocio. Solo con el visto bueno de Oscar
  duplicada_de bigint references oficios.peticiones(id),
  cambio       bigint references oficios.cambios(id),
  creada       timestamptz not null default now(),
  revisada     timestamptz,
  cerrada      timestamptz
);
create index if not exists peticiones_negocio on oficios.peticiones (negocio, creada desc);
create index if not exists peticiones_abiertas on oficios.peticiones (estado) where estado in ('nueva','revisada');
create index if not exists peticiones_tema on oficios.peticiones (tema) where tema is not null;

create table if not exists oficios.novedades (
  id      bigint generated always as identity primary key,
  negocio text references oficios.negocios(id),     -- vacío = para todos
  tipo    text not null default 'novedad' check (tipo in ('novedad','oferta','aviso')),
  titulo  text not null check (char_length(titulo) between 3 and 120),
  texto   text not null check (char_length(texto) between 3 and 1200),
  enlace  text check (enlace is null or enlace ~ '^https://'),
  desde   timestamptz not null default now(),
  hasta   timestamptz,
  creada  timestamptz not null default now()
);

create table if not exists oficios.novedades_vistas (
  negocio text not null references oficios.negocios(id),
  novedad bigint not null references oficios.novedades(id) on delete cascade,
  visto   timestamptz not null default now(),
  primary key (negocio, novedad)
);

create table if not exists oficios.intentos (       -- códigos fallados, para frenar a quien prueba códigos
  id      bigint generated always as identity primary key,
  negocio text not null,
  cuando  timestamptz not null default now()
);
create index if not exists intentos_negocio on oficios.intentos (negocio, cuando desc);

-- Sin políticas: aunque un día el esquema se enseñara en la API, nadie entraría a las tablas.
alter table oficios.negocios         enable row level security;
alter table oficios.cambios          enable row level security;
alter table oficios.peticiones       enable row level security;
alter table oficios.novedades        enable row level security;
alter table oficios.novedades_vistas enable row level security;
alter table oficios.intentos         enable row level security;

-- La huella de un código: va con el negocio dentro, para que el mismo código en dos negocios no dé la misma huella.
create or replace function oficios.huella(p_negocio text, p_clave text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_negocio || ':' || p_clave, 'UTF8')), 'hex')
$$;

-- ¿Puede entrar? Devuelve '' si sí; 'clave' o 'bloqueo' si no. No dice si el negocio existe.
create or replace function oficios.entra(p_negocio text, p_clave text) returns text
language plpgsql security definer set search_path = '' as $$
declare n oficios.negocios; fallos int;
begin
  if p_negocio is null or p_clave is null or char_length(p_negocio) > 40 or char_length(p_clave) > 80 then return 'clave'; end if;
  select * into n from oficios.negocios where id = p_negocio;
  if not found or not n.activo then return 'clave'; end if;
  select count(*) into fallos from oficios.intentos where negocio = p_negocio and cuando > now() - interval '10 minutes';
  if fallos >= 10 then return 'bloqueo'; end if;
  if n.clave_hash <> oficios.huella(p_negocio, p_clave) then
    insert into oficios.intentos(negocio) values (p_negocio);
    return 'clave';
  end if;
  return '';
end $$;

-- 1. Mandar una petición
create or replace function public.oficios_enviar(
  p_negocio text, p_clave text, p_tipo text, p_texto text,
  p_quien text default null, p_pantalla text default null, p_version text default null, p_aparato text default null, p_remitente text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e text; n oficios.negocios; t text; r text; hora int; dia int; nuevo bigint;
begin
  e := oficios.entra(p_negocio, p_clave);
  if e <> '' then return jsonb_build_object('ok', false, 'err', e); end if;
  select * into n from oficios.negocios where id = p_negocio;
  if p_tipo is null or p_tipo not in ('fallo','mejora','duda') then return jsonb_build_object('ok', false, 'err', 'tipo'); end if;
  t := btrim(coalesce(p_texto, ''));
  if char_length(t) < 10 or char_length(t) > 2000 then return jsonb_build_object('ok', false, 'err', 'texto'); end if;
  r := left(nullif(btrim(coalesce(p_remitente, '')), ''), 40);
  if n.demo then
    -- la demo es pública: cada navegador tiene su tope, y hay uno para todos
    if r is null then return jsonb_build_object('ok', false, 'err', 'remitente'); end if;
    select count(*) filter (where remitente = r and creada > now() - interval '1 hour'), count(*) into hora, dia
      from oficios.peticiones where negocio = p_negocio and creada > now() - interval '1 day';
    if hora >= 5 or dia >= 60 then return jsonb_build_object('ok', false, 'err', 'limite'); end if;
  else
    select count(*) filter (where creada > now() - interval '1 hour'), count(*) into hora, dia
      from oficios.peticiones where negocio = p_negocio and creada > now() - interval '1 day';
    if hora >= 10 or dia >= 30 then return jsonb_build_object('ok', false, 'err', 'limite'); end if;
  end if;
  insert into oficios.peticiones(negocio, remitente, tipo, texto, quien, pantalla, version, aparato)
  values (p_negocio, case when n.demo then r end, p_tipo, t,
          left(nullif(btrim(coalesce(p_quien, '')), ''), 60), left(nullif(btrim(coalesce(p_pantalla, '')), ''), 120),
          left(nullif(btrim(coalesce(p_version, '')), ''), 40), left(nullif(btrim(coalesce(p_aparato, '')), ''), 120))
  returning id into nuevo;
  update oficios.negocios set visto = now(), version = coalesce(left(nullif(btrim(coalesce(p_version, '')), ''), 40), version) where id = p_negocio;
  return jsonb_build_object('ok', true, 'id', nuevo);
end $$;

-- 2. El buzón de un negocio: sus peticiones con su estado y respuesta, y las novedades de OOOX
create or replace function public.oficios_buzon(
  p_negocio text, p_clave text, p_version text default null, p_remitente text default null, p_vistas bigint[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e text; n oficios.negocios; r text; pet jsonb; nov jsonb;
begin
  e := oficios.entra(p_negocio, p_clave);
  if e <> '' then return jsonb_build_object('ok', false, 'err', e); end if;
  select * into n from oficios.negocios where id = p_negocio;
  r := left(nullif(btrim(coalesce(p_remitente, '')), ''), 40);
  update oficios.negocios set visto = now(), version = coalesce(left(nullif(btrim(coalesce(p_version, '')), ''), 40), version) where id = p_negocio;
  if p_vistas is not null and not n.demo then
    insert into oficios.novedades_vistas(negocio, novedad)
    select p_negocio, v.id from oficios.novedades v where v.id = any(p_vistas) and (v.negocio is null or v.negocio = p_negocio)
    on conflict do nothing;
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.creada desc), '[]'::jsonb) into pet from (
    select p.id, p.tipo, p.texto, p.quien,
           case p.estado when 'nueva' then 'recibida' when 'revisada' then 'mirando' else p.estado end as estado,
           p.respuesta, p.creada, p.cerrada
    from oficios.peticiones p
    where p.negocio = p_negocio and (not n.demo or p.remitente = r)
    order by p.creada desc limit 50) x;
  select coalesce(jsonb_agg(to_jsonb(y) order by y.desde desc), '[]'::jsonb) into nov from (
    select v.id, v.tipo, v.titulo, v.texto, v.enlace, v.desde
    from oficios.novedades v
    where (v.negocio is null or v.negocio = p_negocio) and v.desde <= now() and (v.hasta is null or v.hasta > now())
      and not (v.tipo = 'oferta' and n.sin_ofertas)
    order by v.desde desc limit 20) y;
  return jsonb_build_object('ok', true, 'peticiones', pet, 'novedades', nov, 'sin_ofertas', n.sin_ofertas, 'demo', n.demo);
end $$;

-- 3. Darse de baja de las ofertas, o volver a apuntarse
create or replace function public.oficios_ofertas(p_negocio text, p_clave text, p_quiere boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e text; n oficios.negocios;
begin
  e := oficios.entra(p_negocio, p_clave);
  if e <> '' then return jsonb_build_object('ok', false, 'err', e); end if;
  select * into n from oficios.negocios where id = p_negocio;
  if not n.demo then update oficios.negocios set sin_ofertas = not coalesce(p_quiere, false) where id = p_negocio; end if;   -- en la demo no se toca: es de todos
  return jsonb_build_object('ok', true, 'sin_ofertas', case when n.demo then n.sin_ofertas else not coalesce(p_quiere, false) end);
end $$;

revoke all on function oficios.huella(text, text) from public;
revoke all on function oficios.entra(text, text) from public;
revoke all on function public.oficios_enviar(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.oficios_buzon(text, text, text, text, bigint[]) from public;
revoke all on function public.oficios_ofertas(text, text, boolean) from public;
grant execute on function public.oficios_enviar(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.oficios_buzon(text, text, text, text, bigint[]) to anon, authenticated;
grant execute on function public.oficios_ofertas(text, text, boolean) to anon, authenticated;

-- Vistas para Claude y para Oscar (no están en la API)
create or replace view oficios.cola as
  select p.id, p.creada, n.nombre as negocio, p.negocio as negocio_id, n.demo, p.tipo, p.estado, p.prioridad, p.tema, p.texto, p.quien, p.pantalla, p.version, p.aparato,
         p.revision, p.borrador, p.respuesta, p.duplicada_de, p.cambio
  from oficios.peticiones p join oficios.negocios n on n.id = p.negocio
  where p.estado in ('nueva','revisada','aceptada','en_curso')
  order by coalesce(p.prioridad, 2), p.creada;

create or replace view oficios.temas as        -- lo que más se repite: candidato a cambio para todas las copias
  select p.tema, count(distinct p.negocio) filter (where not n.demo) as negocios, count(*) as peticiones,
         min(p.creada) as primera, max(p.creada) as ultima,
         bool_or(p.estado in ('nueva','revisada','aceptada','en_curso')) as abierta
  from oficios.peticiones p join oficios.negocios n on n.id = p.negocio
  where p.tema is not null
  group by p.tema
  order by 2 desc, 3 desc;

create or replace view oficios.copias as       -- cada copia: plan, versión, última vez vista y lo que tiene abierto
  select n.id, n.nombre, n.plan, n.activo, n.demo, n.version, n.visto, n.sin_ofertas,
         count(p.id) filter (where p.estado in ('nueva','revisada','aceptada','en_curso')) as abiertas,
         count(p.id) as peticiones
  from oficios.negocios n left join oficios.peticiones p on p.negocio = n.id
  group by n.id
  order by n.demo, n.nombre;

-- La demo pública. Su código es «DEMO» y lo sabe todo el mundo: por eso cada navegador ve solo lo suyo.
insert into oficios.negocios (id, nombre, plan, demo, clave_hash, url)
values ('ramirez', 'Ramírez 24 h (demo)', 'pro', true, oficios.huella('ramirez', 'DEMO'), 'https://ramirez-nueva.ooox-software.pages.dev/demos/ramirez-24h/')
on conflict (id) do nothing;
