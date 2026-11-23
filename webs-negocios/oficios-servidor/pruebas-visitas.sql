-- Pruebas del contador de las cartas (visitas.sql), pasadas en la base de datos de verdad y deshechas al acabar:
-- el bloque termina con un error a propósito, que lleva el resultado y no deja nada escrito.
-- Tiene que decir «ok» en las 14. Se pasan en el editor SQL del proyecto (o con el conector de Supabase de Claude).
do $$
declare
  r text := ''; j jsonb; n int;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  t text := to_char((now() at time zone 'Europe/Madrid')::date + 20, 'YYYY-MM-DD');
  c text := 'a1b2c3d4e5f6';
begin
  -- 1. desde fuera no se lee la tabla, pero se cuenta y se lee el embudo
  perform set_config('role', 'anon', true);
  begin perform 1 from oficios.visitas limit 1; r := r || ' · ' || 'MAL 1: anon lee la tabla'; exception when others then r := r || ' · ' || 'ok 1'; end;
  j := public.oficios_visita(t, c, 'carta');
  r := r || ' · ' || (case when (j->>'ok')::boolean then 'ok 2' else 'MAL 2: no cuenta ' || j::text end);
  j := public.oficios_visita(t, c, 'carta'); j := public.oficios_visita(t, c, 'web');
  j := public.oficios_embudo(t);
  r := r || ' · ' || (case when (j->>'ok')::boolean and jsonb_array_length(j->'filas') = 2 then 'ok 3' else 'MAL 3: embudo ' || j::text end);
  r := r || ' · ' || (case when exists (select 1 from jsonb_array_elements(j->'filas') f where f->>'paso' = 'carta' and (f->>'n')::int = 2) then 'ok 4' else 'MAL 4: no suma ' || j::text end);
  -- 2. lo que no vale
  r := r || ' · ' || (case when not (public.oficios_visita(t, 'A1B2C3D4E5F6', 'carta')->>'ok')::boolean then 'ok 5' else 'MAL 5: clave en mayúsculas' end);
  r := r || ' · ' || (case when not (public.oficios_visita(t, c, 'otro')->>'ok')::boolean then 'ok 6' else 'MAL 6: paso inventado' end);
  r := r || ' · ' || (case when not (public.oficios_visita('2026-13-40', c, 'carta')->>'ok')::boolean then 'ok 7' else 'MAL 7: fecha imposible' end);
  r := r || ' · ' || (case when not (public.oficios_visita(to_char(hoy + 200, 'YYYY-MM-DD'), c, 'carta')->>'ok')::boolean then 'ok 8' else 'MAL 8: tanda lejana' end);
  r := r || ' · ' || (case when not (public.oficios_visita(null, c, 'carta')->>'ok')::boolean then 'ok 9' else 'MAL 9: sin tanda' end);
  r := r || ' · ' || (case when not (public.oficios_embudo('ayer')->>'ok')::boolean then 'ok 10' else 'MAL 10: embudo sin fecha' end);
  -- 3. los topes
  perform set_config('role', 'postgres', true);
  update oficios.visitas set n = 1000 where dia = hoy and tanda = t::date and carta = c and paso = 'carta';
  perform set_config('role', 'anon', true);
  j := public.oficios_visita(t, c, 'carta');
  perform set_config('role', 'postgres', true);
  select v.n into n from oficios.visitas v where dia = hoy and tanda = t::date and carta = c and paso = 'carta';
  r := r || ' · ' || (case when n = 1000 then 'ok 11' else 'MAL 11: pasa de 1000: ' || n end);
  insert into oficios.visitas (dia, tanda, carta, paso, n)
    select hoy, t::date, lpad(to_hex(i), 12, '0'), 'web', 1 from generate_series(1, 5000) i on conflict do nothing;
  perform set_config('role', 'anon', true);
  j := public.oficios_visita(t, 'ffffffffffff', 'pide');
  r := r || ' · ' || (case when j->>'err' = 'limite' then 'ok 12' else 'MAL 12: sin tope de filas: ' || j::text end);
  j := public.oficios_visita(t, c, 'web');   -- una fila que ya existe sigue sumando
  r := r || ' · ' || (case when (j->>'ok')::boolean then 'ok 13' else 'MAL 13: con el tope, ya no suma lo que existía' end);
  j := public.oficios_embudo(to_char(hoy - 300, 'YYYY-MM-DD'));
  r := r || ' · ' || (case when (j->>'ok')::boolean and jsonb_array_length(j->'filas') = 0 then 'ok 14' else 'MAL 14: tanda vacía ' || j::text end);
  raise exception 'RESULTADO (nada queda escrito): %', r;
end $$;
