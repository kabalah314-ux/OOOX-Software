# Pruebas de reglas y de datos · OOOX Oficios

Todo lo de esta carpeta corre en Node, sin navegador, en segundos. Para pasarlo todo de una vez:

    bash ../pruebas.sh reglas        (o `todo`, que añade las pantallas)

| Archivo | Qué hace | Cuándo falla |
|---|---|---|
| `valida-negocio.mjs` | Revisa el archivo de datos de un negocio y dice en castellano qué falta o no cuadra. Mira también las caducidades (festivos). Desde el 15-11-2026 avisa si falta el correo del negocio o la dirección no lleva número (los pide el formulario de desistimiento) y revisa el coche y la foto de cada técnico (la foto, solo con su permiso: `fotoOk: 1`). Desde el 16-11-2026, la furgoneta: «furgoneta» del negocio y la de cada técnico, solo material del catálogo y [mínimo, máximo]. | Falta un dato, una referencia apunta a algo que no existe, los horarios no dejan sitio a ninguna cita o a la lista de festivos le quedan menos de 6 meses. |
| `prueba-valida.mjs` | Prueba al validador: estropea un dato cada vez y comprueba que lo dice. 115 el 16-11-2026, con la furgoneta (lo que no es material, el mínimo por encima del máximo, la de un técnico). | El validador deja pasar un archivo mal hecho. |
| `prueba-servicios.mjs` | La base de servicios de OOOX (`oficios-base/servicios.mjs`) y el paso de la hoja de servicios de un negocio a su catálogo (`servicios-catalogo.mjs`): solo los servicios marcados, con su precio y sus tiempos, y lo que está mal, fila a fila. 8 el 15-11-2026. | Un servicio sin lo que tarda o sin fuente, o una hoja mal leída, llega al catálogo de un negocio. |
| `../prueba-oficio.mjs` | Las reglas con ejemplos escritos a mano, con los precios del negocio de muestra. | Una regla da un resultado distinto del esperado. |
| `azar.mjs` | Miles de recorridos al azar sobre las reglas, con varios negocios y sus variantes extremas. Tras cada paso comprueba las leyes (dinero, permisos, estados, horarios, mensajes y, desde el 16-11-2026, la furgoneta: solo la tocan «furgo» y «terminar», nadie toca la de otro, lo usado se descuenta y lo que conviene cargar cuadra). Por tiempo, una cita empezada antes de su día por quien ese día falta ya no ocupa su franja (lo encontró el recorrido de la demo «en uso», 16-11). | Se rompe una ley. Da la semilla y el caso mínimo para repetirlo. |
| `restos.mjs` | Busca datos del negocio de muestra en los archivos comunes de la app. Los nombres de las personas se buscan como palabra entera («Ferrer» no es «noreferrer»). | Algo de un negocio está escrito fuera de `js/oficio-datos.js`. |
| `idiomas.mjs <sitio> [datos.js…]` | Desde el 16-11-2026, los idiomas de lo que ve el cliente (`js/oficio-idioma.js`): cada texto de la cita, la zona del cliente y los papeles (lo que va dentro de `_(…)` y las listas que se traducen al enseñarlas) tiene su catalán y su inglés, con los mismos datos entre llaves, y no sobra ninguno. De cada negocio que se le pasa, que sus averías, su catálogo, su plan, su furgoneta y su dirección estén en sus «textos». 377 textos el 16-11-2026. | Un texto nuevo o cambiado en una pantalla sale en castellano en catalán o en inglés, o una traducción se come un dato. |
| `prueba-soporte.mjs` | El buzón de mejoras (`js/oficio-soporte.js`) sin navegador y sin red: qué se da por bueno, qué viaja, el código de soporte, la cola sin conexión, lo que está sin leer, la demo y los aparatos que no dejan guardar. 60 comprobaciones. | La app manda algo que no debe, pierde una petición sin conexión o se rompe con datos guardados estropeados. |
| `prueba-copias.mjs` | Prueba la herramienta de copias (`../copias.mjs`) en carpetas temporales: crear, no pisar, poner al día sin tocar los datos, dejar como estaba la que no pasa; y desde el 16-11, publicar por fases en un repositorio de prueba: volver atrás con git, fijar, soltar y que «comprueba» acepte una fijada. 43 comprobaciones. | La herramienta pisa una copia, toca sus datos, da por buena una que no lo es o no sabe volver atrás. |
| `prueba-vigia.mjs` | El vigía de fallos (`js/oficio-vigia.js`) sin navegador y sin red: qué limpia (los mismos casos que el servidor, en `vigia-casos.json`), qué junta, cuándo manda, qué guarda sin red, a qué servidor va y que nunca mira nada más del aparato. 51 comprobaciones. | La app manda un dato de alguien, pierde un fallo sin red, insiste sin parar o se rompe. |
| `mutantes.mjs` | Estropea adrede una regla cada vez y pasa las pruebas. Mide si las pruebas valen. El 14-11-2026: 87 de 87 cazadas (las últimas, de los apellidos y de la zona del cliente). El 15-11-2026: 113 de 113, todas con los ejemplos (las nuevas, del desistimiento, «Facturada», el mes para la gestoría, lo que deja cada trabajo, las fincas y quién va). Esa misma noche, 122 de 122: también estropea los papeles (`js/oficio-papeles.js`), que desde entonces se prueban sin navegador, y esos solo los pueden cazar los ejemplos. Con el material que falta, 137 de 137; con los contratos de mantenimiento, 174 de 174 (también estropean el papel del contrato); con el alta del técnico en casa del cliente, 179 de 179; con los tiempos de llegada a una urgencia y el suplemento de urgencia, 198 de 198; con lo que tarda cada servicio del catálogo, 201 de 201. Con el día de cada técnico (a qué hora llega a cada trabajo, sus ratos libres) y la urgencia que solo se le da a quien aún llega dentro de la franja de sus citas, 215 de 215. Con las citas por lo que tarda cada trabajo (`citas.porTiempo`), 230 de 230. Con la demo «en uso» (15-11, tarde), 232 de 232: una cita que ya existe va en su sitio al mirar si cabe, y al cambiarla de franja se compara con su día sin ella. Con el rediseño de usabilidad (15-11, noche), 243 de 243: las revisiones de un contrato repartidas por su año (no todas el primer día ni todas al final), la reserva para urgencias que el negocio puede guardar solo cuando falta alguien, y las visitas en las que no había nadie, que se apuntan y salen en el tablero solo del técnico que fue. Con los mensajes de después del trabajo (15-11, más tarde), 273 de 273: la reseña y el seguimiento a su hora y con su caducidad, el presupuesto que no se acepta, el aviso cuando toque volver (solo con el sí del cliente y sin contrato), dejar un mensaje sin mandar, el cliente que no quiere estos mensajes, el teléfono que se corrige, el contrato que solo toca a su cliente y lo que sobra con una cita en «no había nadie». Con la furgoneta (16-11-2026), 308 de 308: 35 nuevas (quién la toca, contar, cargar, descontar al terminar, lo que conviene cargar, mínimo y máximo). | Una regla estropeada no la caza ninguna prueba: falta una prueba. |
| `uso-real.mjs` | El negocio de la demo «en uso» (Ramírez, nueve semanas en marcha, hecho con las reglas) a ocho horas y días distintos, y lo que tiene que cuadrar: cobros, facturas, contratos, agenda, mensajes y 400 pasos más sobre los datos vivos. Cada comprobación lleva su número de la lista `pruebas-uso/LISTA.md`. 245 comprobaciones el 15-11-2026 (noche), con el seguimiento (U61–U64); 277 el 16-11, con la furgoneta de Omar (U68–U70). | Algo de la demo en uso no cuadra con las reglas: un cobro, una factura, un contrato, una cita o un mensaje. |
| `prueba-juez.mjs` | El juez del servidor (`../../oficios-servidor/juez.mjs`) con ejemplos escritos a mano y un almacén de mentira, también la zona del cliente (quién da códigos, entrar, cambiar el código y el freno) el material que falta y los contratos de mantenimiento (los guarda con lo de la oficina, un técnico no los recibe, el cliente los ve en su zona) y la furgoneta (va en la cabecera: la oficina recibe todas y cada técnico solo la suya; lo usado se descuenta en el servidor). 104 el 16-11-2026. | El servidor deja entrar a quien no debe, da a un técnico avisos de otro, hace dos veces lo mismo o guarda algo distinto de lo que dicen las reglas. |
| `azar-juez.mjs` | El juez con dos negocios y once aparatos a la vez, acciones al azar, otros que se adelantan y acciones repetidas. 9.000 pasos, 1,29 millones de comprobaciones. | Lo guardado deja de ser igual a repetir el diario, o un aparato al día no tiene justo lo suyo. |
| `mutantes-juez.mjs` | Quita adrede cada protección del juez y pasa las dos anteriores. El 14-11-2026: 51 de 51 cazadas (16 de la zona del cliente). El 16-11-2026, con la furgoneta, 59 de 59. | Una protección del servidor puede desaparecer sin que ninguna prueba lo note. |
| `prueba-espejo.mjs` | El espejo (`js/oficio-espejo.js`: lo que cada aparato sabe del servidor y lo que le falta por enviar) contra el juez de verdad, con ejemplos. 71; 80 el 16-11-2026, con la furgoneta (la del técnico se queda en su aparato y se quita si el servidor ya no la manda). | Con servidor, la app pierde algo hecho sin cobertura, lo manda dos veces, no deshace lo que el servidor rechaza o guarda fotos en el aparato. |
| `azar-espejo.mjs` | Varios aparatos con su espejo, red que falla, la app que se cierra y se abre, códigos que se retiran. 45.000 pasos, 256.000 comprobaciones. | Lo que se ve deja de ser «lo último del servidor más lo pendiente», o al calmarse todo un aparato no ve lo mismo que el servidor. |
| `mutantes-espejo.mjs` | Quita adrede cada protección del espejo y pasa las dos anteriores. El 14-11-2026: 29 de 29 cazadas. El 15-11-2026, con los contratos (la oficina los recibe en la cabecera), 30 de 30; y con los contratos que solo viajan cuando cambian, 32 de 32. El 16-11-2026, con la furgoneta, 34 de 34. | Una protección de la app con servidor puede desaparecer sin que ninguna prueba lo note. |
| `negocios/voltio.js` | Un segundo negocio inventado, hecho distinto a propósito (otro oficio, otra ciudad, horarios por técnico). Desde el 16-11-2026, con lo que lleva cada furgoneta, y Pau con la suya propia. | — |
| `completos/<id>.js` | Desde el 17-11-2026, los datos completos de las copias **de prueba** con servidor (hoy, Voltio): su copia lleva solo el archivo público. Los de un negocio de verdad no van nunca aquí (ver `completos/LEEME.md`). | — |

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
   (`webs-negocios/oficios-soporte/LEEME.md`). El código no se guarda en ningún archivo. Si sus datos van con servidor,
   la copia lleva solo su parte pública, y su archivo con los datos completos se guarda fuera del repositorio
   (`../ALTA.md`, «Dónde se guardan»).
4. `bash ../pruebas.sh`: cada copia pasa sus recorridos al azar y su recorrido de pantallas, servida desde su propia carpeta.
5. Poner las fotos de sus averías en su carpeta: `assets/img/av-<id>-s.webp`. Si faltan, la página las esconde y la prueba lo apunta como aviso.

## Cuando cambia lo común

Lo común (pantallas y reglas) se cambia **solo** en la demo. Después:

1. Subir `VERSION` en `js/oficio-nucleo.js` (la fecha y, si ese día hay más de un cambio, una letra).
2. `node ../copias.mjs actualizar --todas`: cada copia se valida y pasa sus recorridos al azar con las reglas nuevas **antes**
   de cambiarse. La que no pasa se queda como estaba y lo dice; las demás siguen. Nunca toca el archivo de datos de nadie.
   Una copia con el archivo público pasa los recorridos con sus datos completos, si están a mano (`--completos <carpeta>`
   u `OFICIOS_COMPLETOS`); si no, se valida solo su parte pública y lo dice.
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
