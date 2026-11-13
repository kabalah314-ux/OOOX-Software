-- EL ALMACÉN DEL SERVIDOR DE OFICIOS (fase 2) · Supabase, apartado «oficios», junto al buzón de mejoras.
--
-- Cumple el contrato de ocho funciones que pide el juez (LEEME.md). Quién puede entrar:
--   · El juez (la función «oficio» de Supabase), con la llave de servicio: public.oficios_srv(qué, datos).
--   · Cualquiera, desde un navegador, solo estas dos lecturas:
--       public.oficios_v(negocio, persona, código)  → el número de versión. Lo pregunta cada aparato cada dos segundos;
--                                                      si ha subido, le pide los cambios al juez.
--       public.oficios_vista(negocio, aviso, llave) → lo que ve el cliente con el enlace de su aviso.
-- Las tablas no se pueden leer ni escribir desde fuera. Se puede pasar entero las veces que haga falta.

create table if not exists oficios.estados (
  negocio  text primary key references oficios.negocios(id),
  datos    json not null,                         -- el archivo de datos del negocio (OFICIO_NEGOCIO), TAL CUAL: «json» y no
                                                  -- «jsonb» porque jsonb cambia el orden de las claves, y las reglas miran
                                                  -- alguna vez «la primera» (por ejemplo, el concepto que va por horas)
  v        bigint not null default 0,             -- sube en uno con cada acción aceptada
  cab      jsonb not null default '{}'::jsonb,    -- {esq, n, nu, ausencias}: contadores y ausencias
  cambiado timestamptz not null default now()
);
create table if not exists oficios.avisos (
  negocio text not null references oficios.estados(negocio),
  id      text not null check (char_length(id) between 1 and 40),
  v       bigint not null,                        -- la versión del negocio en la que cambió por última vez
  datos   jsonb not null,                         -- el aviso entero, como lo dejan las reglas
  de      text[] not null default '{}',           -- los técnicos que lo han llevado alguna vez
  llave   text not null check (char_length(llave) >= 20),   -- la del enlace del cliente
  vista   jsonb not null,                         -- lo que ve el cliente, calculado al guardar
  primary key (negocio, id)
);
create index if not exists avisos_cambiados on oficios.avisos (negocio, v);
create table if not exists oficios.personas (
  negocio    text not null references oficios.negocios(id),
  persona    text not null check (persona ~ '^[a-z0-9-]{2,40}$'),   -- con qué nombre entra: «oficina» o el del técnico
  rol        text not null check (rol in ('centralita','tecnico')),
  quien      text not null,                       -- «oficina», o el id del técnico en los datos del negocio
  clave_hash text not null,                       -- la huella de su código; el código no se guarda
  activo     boolean not null default true,
  creada     timestamptz not null default now(),
  primary key (negocio, persona)
);
create table if not exists oficios.diario (
  negocio text not null references oficios.estados(negocio),
  v       bigint not null,
  t       bigint not null,                        -- la hora del juez, en milisegundos
  q       jsonb not null,                         -- quién: {rol, id}
  accion  jsonb not null,
  clave   text not null default '',               -- la marca del aparato, para no hacer dos veces lo mismo
  res     jsonb not null,
  nuevos  jsonb not null default '[]'::jsonb,
  cuando  timestamptz not null default now(),
  primary key (negocio, v)
);
create unique index if not exists diario_marca on oficios.diario (negocio, clave) where clave <> '';
create table if not exists oficios.topes (         -- frenos: citas pedidas desde la web
  id      bigint generated always as identity primary key,
  negocio text not null,
  clave   text not null,
  cuando  timestamptz not null default now()
);
create index if not exists topes_clave on oficios.topes (negocio, clave, cuando desc);
create table if not exists oficios.intentos_persona (   -- códigos fallados de una persona, por conexión
  id      bigint generated always as identity primary key,
  negocio text not null,
  persona text not null,
  red     text not null default '',
  cuando  timestamptz not null default now()
);
create index if not exists intentos_persona_quien on oficios.intentos_persona (negocio, persona, cuando desc);

alter table oficios.estados          enable row level security;
alter table oficios.avisos           enable row level security;
alter table oficios.personas         enable row level security;
alter table oficios.diario           enable row level security;
alter table oficios.topes            enable row level security;
alter table oficios.intentos_persona enable row level security;

-- Una huella de la conexión de quien llama, para frenar a quien prueba códigos sin dejar fuera a los demás.
-- Sale de la cabecera que pone Supabase; si no la hay (una prueba hecha desde dentro), queda vacía.
create or replace function oficios.red() returns text
language plpgsql stable set search_path = '' as $$
declare h text; ip text;
begin
  begin h := current_setting('request.headers', true); exception when others then h := null; end;
  if h is null or h = '' then return ''; end if;
  begin ip := btrim(split_part(coalesce(h::json ->> 'x-forwarded-for', ''), ',', 1)); exception when others then ip := ''; end;
  if ip = '' then return ''; end if;
  return left(encode(sha256(convert_to('oficios:' || ip, 'UTF8')), 'hex'), 16);
end $$;

-- ¿Quién es? Devuelve {rol, id}, la palabra "bloqueo", o nada. No dice si el negocio o la persona existen.
-- Diez códigos fallados en diez minutos desde la misma conexión bloquean a esa conexión; doscientos entre todas, a todos.
create or replace function oficios.persona_entra(p_negocio text, p_persona text, p_codigo text, p_red text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n oficios.negocios; p oficios.personas; r text := left(coalesce(p_red, ''), 80); mios int; todos int;
begin
  if p_negocio is null or p_persona is null or p_codigo is null or char_length(p_negocio) > 40 or char_length(p_persona) > 40 or char_length(p_codigo) > 80 then return null; end if;
  select * into n from oficios.negocios where id = p_negocio;
  if not found or not n.activo then return null; end if;
  select * into p from oficios.personas where negocio = p_negocio and persona = p_persona;
  if not found or not p.activo then return null; end if;
  select count(*) filter (where red = r), count(*) into mios, todos from oficios.intentos_persona
   where negocio = p_negocio and persona = p_persona and cuando > now() - interval '10 minutes';
  if mios >= 10 or todos >= 200 then return '"bloqueo"'::jsonb; end if;
  if p.clave_hash <> oficios.huella(p_negocio || ':' || p_persona, p_codigo) then
    insert into oficios.intentos_persona(negocio, persona, red) values (p_negocio, p_persona, r);
    return null;
  end if;
  return jsonb_build_object('rol', p.rol, 'id', p.quien);
end $$;

-- La puerta del juez. Solo entra la llave de servicio (la función «oficio»).
create or replace function public.oficios_srv(p_que text, p_a jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare neg text := p_a ->> 'negocio'; e oficios.estados; n oficios.negocios; c jsonb; x jsonb; v0 bigint; cuantos int;
begin
  if neg is null or char_length(neg) > 40 then return null; end if;
  case p_que
  when 'negocio' then
    select * into n from oficios.negocios where id = neg; if not found then return null; end if;
    select * into e from oficios.estados where negocio = neg; if not found then return null; end if;
    -- los datos viajan como texto, para que lleguen con las claves en su orden; la función los lee al recibirlos
    return jsonb_build_object('id', neg, 'activo', n.activo, 'datos_txt', e.datos::text, 'v', e.v, 'cab', e.cab);
  when 'entra' then
    return oficios.persona_entra(neg, p_a ->> 'persona', p_a ->> 'codigo', p_a ->> 'red');
  when 'vivos' then
    return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'v', a.v, 'datos', a.datos, 'de', to_jsonb(a.de), 'llave', a.llave, 'vista', a.vista)) from oficios.avisos a where a.negocio = neg), '[]'::jsonb);
  when 'hecha' then
    if coalesce(p_a ->> 'clave', '') = '' then return null; end if;
    return (select jsonb_build_object('res', d.res, 'nuevos', d.nuevos) from oficios.diario d where d.negocio = neg and d.clave = p_a ->> 'clave');
  when 'guarda' then
    c := p_a -> 'cambio'; v0 := (p_a ->> 'v')::bigint;
    if c is null or v0 is null or (c ->> 'v')::bigint is distinct from v0 + 1 then return jsonb_build_object('ok', false); end if;
    begin   -- todo de una vez, y solo si nadie se ha adelantado: si algo falla, no queda nada a medias
      update oficios.estados set v = v0 + 1, cab = c -> 'cab', cambiado = now() where negocio = neg and v = v0;
      if not found then return jsonb_build_object('ok', false); end if;
      insert into oficios.avisos(negocio, id, v, datos, de, llave, vista)
        select neg, f ->> 'id', v0 + 1, f -> 'datos', array(select jsonb_array_elements_text(coalesce(f -> 'de', '[]'::jsonb))), f ->> 'llave', f -> 'vista'
        from jsonb_array_elements(coalesce(c -> 'avisos', '[]'::jsonb)) f
      on conflict (negocio, id) do update set v = excluded.v, datos = excluded.datos, de = excluded.de, vista = excluded.vista;   -- la llave de un aviso no cambia nunca
      x := c -> 'diario';
      insert into oficios.diario(negocio, v, t, q, accion, clave, res, nuevos)
        values (neg, v0 + 1, (x ->> 't')::bigint, x -> 'q', x -> 'accion', coalesce(x ->> 'clave', ''), x -> 'res', coalesce(x -> 'nuevos', '[]'::jsonb));
      return jsonb_build_object('ok', true);
    exception when unique_violation or not_null_violation or check_violation or invalid_text_representation or foreign_key_violation then
      return jsonb_build_object('ok', false);
    end;
  when 'cambios' then
    select * into e from oficios.estados where negocio = neg; if not found then return null; end if;
    return jsonb_build_object('v', e.v, 'cab', e.cab, 'avisos', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'v', a.v, 'datos', a.datos, 'de', to_jsonb(a.de)) order by a.v, a.id)
      from oficios.avisos a where a.negocio = neg and a.v > coalesce((p_a ->> 'desde')::bigint, 0)), '[]'::jsonb));
  when 'vista' then
    return (select a.vista from oficios.avisos a where a.negocio = neg and a.id = p_a ->> 'aviso' and a.llave = p_a ->> 'llave');
  when 'tope' then
    select count(*) into cuantos from oficios.topes t where t.negocio = neg and t.clave = left(p_a ->> 'clave', 120) and t.cuando > now() - make_interval(secs => (p_a ->> 'ventana')::numeric / 1000.0);
    if cuantos >= (p_a ->> 'max')::int then return 'false'::jsonb; end if;
    insert into oficios.topes(negocio, clave) values (neg, left(p_a ->> 'clave', 120));
    return 'true'::jsonb;
  else
    return null;
  end case;
end $$;

-- ¿Ha cambiado algo? Solo devuelve el número de versión, y solo a quien es de la casa.
create or replace function public.oficios_v(p_negocio text, p_persona text, p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare q jsonb;
begin
  q := oficios.persona_entra(p_negocio, p_persona, p_codigo, oficios.red());
  if q is null then return jsonb_build_object('ok', false, 'err', 'clave'); end if;
  if q = '"bloqueo"'::jsonb then return jsonb_build_object('ok', false, 'err', 'bloqueo'); end if;
  return jsonb_build_object('ok', true, 'v', coalesce((select e.v from oficios.estados e where e.negocio = p_negocio), 0));
end $$;

-- Lo que ve el cliente con el enlace de su aviso. La llave no se puede adivinar; sin ella no sale nada.
create or replace function public.oficios_vista(p_negocio text, p_aviso text, p_llave text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if p_negocio is null or p_aviso is null or p_llave is null or char_length(p_negocio) > 40 or char_length(p_aviso) > 40 or char_length(p_llave) > 80 or char_length(p_llave) < 20 then return jsonb_build_object('ok', false, 'err', 'enlace'); end if;
  select a.vista into v from oficios.avisos a join oficios.negocios n on n.id = a.negocio where a.negocio = p_negocio and a.id = p_aviso and a.llave = p_llave and n.activo;
  if v is null then return jsonb_build_object('ok', false, 'err', 'enlace'); end if;
  return jsonb_build_object('ok', true, 'vista', v);
end $$;

revoke all on function oficios.red() from public;
revoke all on function oficios.persona_entra(text, text, text, text) from public;
revoke all on function public.oficios_srv(text, jsonb) from public, anon, authenticated;
revoke all on function public.oficios_v(text, text, text) from public;
revoke all on function public.oficios_vista(text, text, text) from public;
grant execute on function public.oficios_srv(text, jsonb) to service_role;
grant execute on function public.oficios_v(text, text, text) to anon, authenticated;
grant execute on function public.oficios_vista(text, text, text) to anon, authenticated;

-- Para Oscar y para Claude (no está en la API): cada negocio que usa el servidor, su versión y sus avisos.
create or replace view oficios.servidor as
  select e.negocio, n.nombre, n.prueba, e.v, e.cambiado, (select count(*) from oficios.avisos a where a.negocio = e.negocio) as avisos,
         (select count(*) from oficios.personas p where p.negocio = e.negocio and p.activo) as personas
  from oficios.estados e join oficios.negocios n on n.id = e.negocio
  order by e.cambiado desc;
