-- EL CONTADOR DE LAS CARTAS (B6, 23-11-2026): cuántas cartas abren el QR, entran en la web, abren la app, empiezan la
-- cita y la mandan. Para saber qué pasa con cada tanda antes de echar la siguiente al buzón.
--
-- Sin cookies ni datos personales: una fila por día, tanda, carta y paso, con un número. La carta no va por su nombre:
-- va por una clave de 12 letras (los primeros 12 del sha256 del enlace «?m=…» de esa carta). Quién es cada clave solo lo
-- sabe la hoja de la tanda (hoja.csv, en el ordenador de Oscar), y el embudo se junta en su ordenador (embudo.html).
-- Solo cuenta la demo abierta desde una carta (con su «?m=…» y sin caducar): nunca los clientes de un negocio de verdad.
--
--   public.oficios_visita(tanda, carta, paso)  → suma una visita. La llama la demo, con la llave pública.
--   public.oficios_embudo(tanda)               → los números de una tanda, carta a carta. Solo números y claves.
--
-- Topes: cada fila no pasa de 1.000 al día y no se apuntan más de 5.000 filas nuevas al día entre todas: alguien con mala
-- idea puede ensuciar los números de un día, pero no llenar la base de datos. No llama a la función «oficio»: no gasta
-- de las 500.000 llamadas del plan gratis. Se puede pasar entero las veces que haga falta.

create table if not exists oficios.visitas (
  dia   date not null,                       -- el día de la visita, en hora de Madrid
  tanda date not null,                       -- la tanda de cartas: la fecha «hasta» de sus enlaces
  carta text not null check (carta ~ '^[0-9a-f]{12}$'),
  paso  text not null check (paso in ('carta', 'web', 'app', 'cita', 'pide', 'prueba')),
  n     int  not null default 0 check (n between 0 and 1000),
  primary key (dia, tanda, carta, paso)
);
alter table oficios.visitas enable row level security;   -- nadie la lee ni la escribe desde fuera: solo estas dos funciones

create or replace function public.oficios_visita(p_tanda text, p_carta text, p_paso text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hoy date := (now() at time zone 'Europe/Madrid')::date; t date;
begin
  if p_tanda is null or p_carta is null or p_paso is null or p_tanda !~ '^\d{4}-\d{2}-\d{2}$' or p_carta !~ '^[0-9a-f]{12}$'
     or p_paso not in ('carta', 'web', 'app', 'cita', 'pide', 'prueba') then return jsonb_build_object('ok', false, 'err', 'peticion'); end if;
  begin t := p_tanda::date; exception when others then return jsonb_build_object('ok', false, 'err', 'peticion'); end;
  if t < hoy - 120 or t > hoy + 120 then return jsonb_build_object('ok', false, 'err', 'peticion'); end if;
  update oficios.visitas set n = least(n + 1, 1000) where dia = hoy and tanda = t and carta = p_carta and paso = p_paso;
  if found then return jsonb_build_object('ok', true); end if;
  if (select count(*) from oficios.visitas where dia = hoy) >= 5000 then return jsonb_build_object('ok', false, 'err', 'limite'); end if;
  insert into oficios.visitas (dia, tanda, carta, paso, n) values (hoy, t, p_carta, p_paso, 1)
    on conflict (dia, tanda, carta, paso) do update set n = least(oficios.visitas.n + 1, 1000);
  return jsonb_build_object('ok', true);
end $$;

-- Los números de una tanda: por carta y paso, la suma de todos los días, el primero y el último.
create or replace function public.oficios_embudo(p_tanda text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t date; r jsonb;
begin
  if p_tanda is null or p_tanda !~ '^\d{4}-\d{2}-\d{2}$' then return jsonb_build_object('ok', false, 'err', 'peticion'); end if;
  begin t := p_tanda::date; exception when others then return jsonb_build_object('ok', false, 'err', 'peticion'); end;
  select coalesce(jsonb_agg(jsonb_build_object('carta', carta, 'paso', paso, 'n', total, 'primero', primero, 'ultimo', ultimo) order by carta, paso), '[]'::jsonb)
    into r from (select carta, paso, sum(n)::int as total, min(dia) as primero, max(dia) as ultimo
                 from oficios.visitas where tanda = t group by carta, paso) x;
  return jsonb_build_object('ok', true, 'tanda', t, 'filas', r);
end $$;

revoke all on table oficios.visitas from public, anon, authenticated;
revoke all on function public.oficios_visita(text, text, text) from public;
revoke all on function public.oficios_embudo(text) from public;
grant execute on function public.oficios_visita(text, text, text) to anon, authenticated;
grant execute on function public.oficios_embudo(text) to anon, authenticated;
