# Pruebas de reglas y de datos · OOOX Oficios

Todo lo de esta carpeta corre en Node, sin navegador, en segundos. Para pasarlo todo de una vez:

    bash ../pruebas.sh reglas        (o `todo`, que añade las pantallas)

| Archivo | Qué hace | Cuándo falla |
|---|---|---|
| `valida-negocio.mjs` | Revisa el archivo de datos de un negocio y dice en castellano qué falta o no cuadra. Mira también las caducidades (festivos). | Falta un dato, una referencia apunta a algo que no existe, los horarios no dejan sitio a ninguna cita o a la lista de festivos le quedan menos de 6 meses. |
| `prueba-valida.mjs` | Prueba al validador: estropea un dato cada vez y comprueba que lo dice. | El validador deja pasar un archivo mal hecho. |
| `../prueba-oficio.mjs` | Las reglas con ejemplos escritos a mano, con los precios del negocio de muestra. | Una regla da un resultado distinto del esperado. |
| `azar.mjs` | Miles de recorridos al azar sobre las reglas, con varios negocios y sus variantes extremas. Tras cada paso comprueba las leyes (dinero, permisos, estados, horarios, mensajes). | Se rompe una ley. Da la semilla y el caso mínimo para repetirlo. |
| `restos.mjs` | Busca datos del negocio de muestra en los archivos comunes de la app. Los nombres de las personas se buscan como palabra entera («Ferrer» no es «noreferrer»). | Algo de un negocio está escrito fuera de `js/oficio-datos.js`. |
| `prueba-soporte.mjs` | El buzón de mejoras (`js/oficio-soporte.js`) sin navegador y sin red: qué se da por bueno, qué viaja, el código de soporte, la cola sin conexión, lo que está sin leer, la demo y los aparatos que no dejan guardar. 60 comprobaciones. | La app manda algo que no debe, pierde una petición sin conexión o se rompe con datos guardados estropeados. |
| `prueba-copias.mjs` | Prueba la herramienta de copias (`../copias.mjs`) en carpetas temporales: crear, no pisar, poner al día sin tocar los datos, dejar como estaba la que no pasa. 32 comprobaciones. | La herramienta pisa una copia, toca sus datos o da por buena una que no lo es. |
| `mutantes.mjs` | Estropea adrede una regla cada vez y pasa las pruebas. Mide si las pruebas valen. El 14-11-2026: 80 de 80 cazadas (las cuatro nuevas, de los apellidos). | Una regla estropeada no la caza ninguna prueba: falta una prueba. |
| `prueba-juez.mjs` | El juez del servidor (`../../oficios-servidor/juez.mjs`) con ejemplos escritos a mano y un almacén de mentira. 56. | El servidor deja entrar a quien no debe, da a un técnico avisos de otro, hace dos veces lo mismo o guarda algo distinto de lo que dicen las reglas. |
| `azar-juez.mjs` | El juez con dos negocios y once aparatos a la vez, acciones al azar, otros que se adelantan y acciones repetidas. 9.000 pasos, 1,29 millones de comprobaciones. | Lo guardado deja de ser igual a repetir el diario, o un aparato al día no tiene justo lo suyo. |
| `mutantes-juez.mjs` | Quita adrede cada protección del juez y pasa las dos anteriores. El 14-11-2026: 35 de 35 cazadas. | Una protección del servidor puede desaparecer sin que ninguna prueba lo note. |
| `prueba-espejo.mjs` | El espejo (`js/oficio-espejo.js`: lo que cada aparato sabe del servidor y lo que le falta por enviar) contra el juez de verdad, con ejemplos. 71. | Con servidor, la app pierde algo hecho sin cobertura, lo manda dos veces, no deshace lo que el servidor rechaza o guarda fotos en el aparato. |
| `azar-espejo.mjs` | Varios aparatos con su espejo, red que falla, la app que se cierra y se abre, códigos que se retiran. 45.000 pasos, 256.000 comprobaciones. | Lo que se ve deja de ser «lo último del servidor más lo pendiente», o al calmarse todo un aparato no ve lo mismo que el servidor. |
| `mutantes-espejo.mjs` | Quita adrede cada protección del espejo y pasa las dos anteriores. El 14-11-2026: 29 de 29 cazadas. | Una protección de la app con servidor puede desaparecer sin que ninguna prueba lo note. |
| `negocios/voltio.js` | Un segundo negocio inventado, hecho distinto a propósito (otro oficio, otra ciudad, horarios por técnico). | — |

## Cuando `azar.mjs` encuentra algo

Imprime la ley rota, la semilla y la lista mínima de acciones que lo provoca. Se hace así:

1. Se copia ese caso como comprobación fija en `../prueba-oficio.mjs` (hay un apartado para ello).
2. Se comprueba que falla.
3. Se arregla la regla en `js/oficio-nucleo.js`.
4. Se pasan todas las pruebas.

## Dar de alta un negocio nuevo

1. Copiar `js/oficio-datos.js`, quitar `OFICIO_MUESTRA` (un negocio de verdad arranca vacío) y rellenar sus datos.
   Mientras no esté en marcha, `prueba:true`: la app lo dice arriba en todas sus pantallas y OOOX no lo cuenta en sus cifras.
2. `node valida-negocio.mjs <sitio> <su-archivo.js>` hasta que no dé errores.
3. `node ../copias.mjs nueva --datos <su-archivo.js>`: valida otra vez, crea su carpeta en `frontend/public/oficios/<id>/`
   con lo común y su archivo, y enseña **una sola vez** su código de soporte y la línea para darlo de alta en el buzón
   (`webs-negocios/oficios-soporte/LEEME.md`). El código no se guarda en ningún archivo.
4. `bash ../pruebas.sh`: cada copia pasa sus recorridos al azar y su recorrido de pantallas, servida desde su propia carpeta.
5. Poner las fotos de sus averías en su carpeta: `assets/img/av-<id>-s.webp`. Si faltan, la página las esconde y la prueba lo apunta como aviso.

## Cuando cambia lo común

Lo común (pantallas y reglas) se cambia **solo** en la demo. Después:

1. Subir `VERSION` en `js/oficio-nucleo.js` (la fecha y, si ese día hay más de un cambio, una letra).
2. `node ../copias.mjs actualizar --todas`: cada copia se valida y pasa sus recorridos al azar con las reglas nuevas **antes**
   de cambiarse. La que no pasa se queda como estaba y lo dice; las demás siguen. Nunca toca el archivo de datos de nadie.
3. `node ../copias.mjs lista` dice qué versión lleva cada una. `comprueba` falla si alguna no va al día: corre en `pruebas.sh`,
   así que un cambio en lo común que no se haya llevado a las copias no pasa las pruebas.

Ninguna de estas pruebas lleva datos de un negocio escritos: leen el archivo.

## Lo que enseñaron las reglas estropeadas adrede con el mapa (13-11-2026)

Dos sobrevivieron a la primera pasada: quitar el borrado de la posición al volver a salir, y enseñar al cliente una posición
aunque el técnico ya no vaya de camino. Con las acciones de la app no se puede llegar a ninguno de los dos casos, porque la
posición se borra en cada salida del estado «de camino». Aun así se dejaron las dos protecciones y se les puso su ejemplo,
con el dato metido a mano: la posición de un trabajador no puede depender de que un cambio futuro se acuerde de borrarla.

## Lo que encontró la primera pasada (13-11-2026)

Catorce fallos, todos arreglados y con su comprobación fija: claves como «constructor» o «toString» que colaban como técnico, avería, zona o concepto; un presupuesto que no era una lista rompía la app; una acción rechazada dejaba la nota cambiada; las franjas a y media se leían «de 8.5 a 11»; la ciudad, el teléfono, el rótulo, el recargo y la mano de obra del negocio de muestra estaban escritos en las pantallas comunes; un negocio de verdad habría visto borrados sus datos a las 8 horas; y dos comprobaciones de pantallas dependían de la suerte.

## Lo que encontraron las pruebas del espejo (14-11-2026)

- **Una posición sustituida dejaba rastro.** Si el técnico mandaba dos posiciones seguidas sin cobertura, en la cola
  quedaba solo la última (bien), pero en pantalla se habían aplicado las dos: el aviso llevaba un cambio de más respecto
  a lo que haría el servidor. No se veía, pero era una diferencia. Lo cazó una ley nueva: «lo que se ve es siempre lo
  último del servidor con la cola encima, en su orden». Ahora, al sustituir, la pantalla se rehace desde la base.
- **Esa ley no existía.** La pidió una regla estropeada adrede que sobrevivía: repetir lo pendiente en otro orden.
  Los ejemplos miraban el principio y el final, no lo que se ve mientras hay cosas por enviar.
- Si una prueba se queda esperando una respuesta que no llega, se corta a los 20 segundos y cuenta como fallo.
