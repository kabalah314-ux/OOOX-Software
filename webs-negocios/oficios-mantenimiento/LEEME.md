# Mantenimiento de OOOX Oficios

Lo que hace que la app se cuide sola una vez entregada: ve sus fallos, avisa si algo se cae, guarda una copia cada
noche y deja a Claude revisarlo todo cada día. El procedimiento entero (qué se mira, cuándo y quién) está en
`MANTENIMIENTO.md`. Aquí están las piezas.

| Archivo | Qué es |
|---|---|
| `esquema.sql` | Tablas y funciones en Supabase (esquema `oficios`): fallos, salud, copias cifradas, limpieza, informe, espacio, caducados y olvidar a un cliente. Se puede pasar más de una vez |
| `pruebas.sql` | 26 comprobaciones. Se deshacen solas: no dejan nada. Tienen que decir `ok` en todas |
| `llave-publica.asc` | La llave pública de las copias (la de Oscar). Solo sirve para cifrar |
| `restaurar.mjs` | De una copia ya descifrada al SQL que la vuelve a poner (aparte, o encima ante un desastre) |
| `prueba-restaurar.sh` | Simulacro entero en un Postgres local con datos inventados y una llave de prueba. Lo pasa GitHub en cada cambio |
| `vigilar.json` | Lo que mira el vigilante cada 5 minutos: las webs de cada negocio, la base de datos y la función |
| `agenda.json` | Lo que toca cada mes, cada trimestre y cada año (festivos, dominios, precios, revisión legal…) |
| `MANTENIMIENTO.md` | El procedimiento: la revisión diaria, el informe del mes, si algo se cae, publicar y los datos personales |

Lo de fuera de esta carpeta:

- `frontend/public/demos/ramirez-24h/js/oficio-vigia.js`: el vigía de fallos de la app (va en cada copia).
- `.github/workflows/vigilante.yml`: el vigilante, cada 5 minutos.
- `.github/workflows/copia-nocturna.yml`: baja la copia cifrada cada noche y la guarda 90 días.
- `.github/workflows/pruebas-oficios.yml`: las pruebas de siempre y, ahora, el simulacro de restaurar.

## La llave de las copias

Las copias se cifran en la base de datos con la llave **pública** de Oscar. Para leerlas hace falta su llave
**privada**, que no está en ningún servidor:

- En el PC de Oscar: `Documents\OOOX\00-CENTRAL\copias-seguridad\llave-privada-copias.asc`.
- Huella: `E139 A2E4 23A3 3471 B3AA 045D E468 D379 0166 03CC` (subllave de cifrado `6A80 F1DA DA74 0166`).
- **Oscar tiene que guardar otra copia fuera del PC** (un pendrive en casa o su gestor de contraseñas). Si se pierde
  la llave privada, las copias no se pueden leer: no hay forma de recuperarla.
- No lleva contraseña: quien tenga el archivo puede leer las copias. Por eso no se manda a nadie ni se sube a ningún sitio.

Para cambiarla (si se perdiera o se viera comprometida): hacer otra con gpg (`gpg --quick-gen-key "OOOX Oficios -
copias" rsa3072 sign never` y `gpg --quick-add-key <huella> rsa3072 encrypt never`), poner la pública en
`llave-publica.asc` y en `esquema.sql` (la huella también en `copia-nocturna.yml`), y pasar
`update oficios.copias_llave set huella = '…', publica = '…' where id = 1;`. Las copias viejas siguen necesitando la
llave vieja: no se tira hasta que caduquen (90 días).

## Restaurar una copia

1. Bajar la copia: en GitHub, pestaña Actions, «Copia de cada noche de OOOX Oficios», la ejecución del día, abajo en
   «Artifacts». Trae `oficios-AAAA-MM-DD.pgp` y su ficha. (Las 7 últimas también están en la base de datos:
   `select public.oficios_copia(<id>)`.)
2. Descifrarla en el PC donde está la llave: `gpg --import llave-privada-copias.asc` (la primera vez) y
   `gpg --decrypt oficios-AAAA-MM-DD.pgp > copia.json`. En Windows, gpg viene con Git for Windows (Git Bash).
3. `node restaurar.mjs copia.json > restaurar.sql` y pasarlo en el editor SQL de Supabase. Queda en el esquema
   `oficios_restaurada`, aparte, para mirarlo sin tocar nada.
4. Solo ante un desastre y con el visto bueno de Oscar: `node restaurar.mjs copia.json --volcar > volcar.sql`. Vacía
   las tablas de `oficios` y pone las de la copia, todo en una transacción. Después:
   `select oficios.reaplicar_olvidos();` (vuelve a borrar a los clientes que lo pidieron después de esa noche).
5. `copia.json`, `restaurar.sql` y `volcar.sql` llevan datos de clientes: se borran al acabar.

## Probar

- En la base de datos de verdad: pasar `pruebas.sql` (26, se deshace sola).
- En local, de punta a punta: `PGURL='postgresql://postgres@/postgres?host=/tmp&port=5432' bash prueba-restaurar.sh`.
- El vigía de la app: `node webs-negocios/demos/pruebas-reglas/prueba-vigia.mjs <sitio>` (sin navegador) y
  `pruebas-navegador/vigia.py` (en el navegador). Van dentro de `pruebas.sh`.

## Recetas (conector de Supabase o editor SQL)

```sql
-- Los fallos por mirar, los más recientes primero
select negocio, estado, veces, pagina, pantalla, tipo, mensaje, version, aparatos, ultima from oficios.errores
where estado in ('nuevo','vuelve','visto') order by ultima desc;

-- Marcar uno arreglado (la versión que lo arregla); si vuelve a salir desde esa versión, pasa solo a «vuelve»
update oficios.errores set estado = 'arreglado', arreglado_en = '2026.11.20a', nota = '<causa y commit>' where id = 12;

-- Ignorar uno que no es de la app (una extensión del navegador, un aparato muy viejo)
update oficios.errores set estado = 'ignorado', nota = '<por qué>' where id = 13;

-- Espacio, copias y tareas de cada noche
select oficios.espacio();
select id, hecha, bytes, cuentas from oficios.copias_seguridad order by hecha desc;
select jobname, status, return_message, start_time from cron.job_run_details d join cron.job j using (jobid)
where j.jobname like 'oficios-%' order by start_time desc limit 10;

-- El informe de un negocio (sin datos de nadie)
select oficios.informe('voltio', '2026-11-01', '2026-11-30');

-- Avisos que pasan del plazo de guardar los datos (solo cuenta; el plazo lo decide cada negocio)
select oficios.caducados(36);

-- Olvidar a un cliente que lo pide: primero simular, y aplicar solo con el visto bueno de Oscar
select oficios.olvidar_cliente('voltio', '600 00 00 00');
select oficios.olvidar_cliente('voltio', '600 00 00 00', true);
```
