# Pruebas de reglas y de datos · OOOX Oficios

Todo lo de esta carpeta corre en Node, sin navegador, en segundos. Para pasarlo todo de una vez:

    bash ../pruebas.sh reglas        (o `todo`, que añade las pantallas)

| Archivo | Qué hace | Cuándo falla |
|---|---|---|
| `valida-negocio.mjs` | Revisa el archivo de datos de un negocio y dice en castellano qué falta o no cuadra. Mira también las caducidades (festivos). | Falta un dato, una referencia apunta a algo que no existe, los horarios no dejan sitio a ninguna cita o a la lista de festivos le quedan menos de 6 meses. |
| `prueba-valida.mjs` | Prueba al validador: estropea un dato cada vez y comprueba que lo dice. | El validador deja pasar un archivo mal hecho. |
| `../prueba-oficio.mjs` | Las reglas con ejemplos escritos a mano, con los precios del negocio de muestra. | Una regla da un resultado distinto del esperado. |
| `azar.mjs` | Miles de recorridos al azar sobre las reglas, con varios negocios y sus variantes extremas. Tras cada paso comprueba las leyes (dinero, permisos, estados, horarios, mensajes). | Se rompe una ley. Da la semilla y el caso mínimo para repetirlo. |
| `restos.mjs` | Busca datos del negocio de muestra en los archivos comunes de la app. | Algo de un negocio está escrito fuera de `js/oficio-datos.js`. |
| `mutantes.mjs` | Estropea adrede una regla cada vez y pasa las pruebas. Mide si las pruebas valen. | Una regla estropeada no la caza ninguna prueba: falta una prueba. |
| `negocios/voltio.js` | Un segundo negocio inventado, hecho distinto a propósito (otro oficio, otra ciudad, horarios por técnico). | — |

## Cuando `azar.mjs` encuentra algo

Imprime la ley rota, la semilla y la lista mínima de acciones que lo provoca. Se hace así:

1. Se copia ese caso como comprobación fija en `../prueba-oficio.mjs` (hay un apartado para ello).
2. Se comprueba que falla.
3. Se arregla la regla en `js/oficio-nucleo.js`.
4. Se pasan todas las pruebas.

## Dar de alta un negocio nuevo

1. Copiar `js/oficio-datos.js`, quitar `OFICIO_MUESTRA` (un negocio de verdad arranca vacío) y rellenar sus datos.
2. `node valida-negocio.mjs <sitio> <su-archivo.js>` hasta que no dé errores.
3. `node azar.mjs <sitio> --negocio <su-archivo.js>`.
4. `python3 ../pruebas-navegador/negocio.py <su-archivo.js>` (con el sitio servido en el puerto 8765).
5. Poner las fotos de sus averías: `assets/img/av-<id>-s.webp`. Si faltan, la página las esconde y la prueba lo apunta como aviso.

Ninguna de estas pruebas lleva datos de un negocio escritos: leen el archivo.

## Lo que encontró la primera pasada (13-11-2026)

Catorce fallos, todos arreglados y con su comprobación fija: claves como «constructor» o «toString» que colaban como técnico, avería, zona o concepto; un presupuesto que no era una lista rompía la app; una acción rechazada dejaba la nota cambiada; las franjas a y media se leían «de 8.5 a 11»; la ciudad, el teléfono, el rótulo, el recargo y la mano de obra del negocio de muestra estaban escritos en las pantallas comunes; un negocio de verdad habría visto borrados sus datos a las 8 horas; y dos comprobaciones de pantallas dependían de la suerte.
