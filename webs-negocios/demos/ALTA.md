# El alta de un negocio en OOOX Oficios, paso a paso

Ensayado el 16-11-2026 con un negocio inventado, «Lampistes Gràcia»: electricistas en Barcelona, con tres técnicos.
El ensayo se hizo en una carpeta aparte. Nada de él está en el repositorio ni en Supabase.

## Lo que tarda

| Paso | Quién | Tiempo |
|---|---|---|
| 1. Recoger los datos del negocio (lista de abajo y hoja de servicios) | Oscar con el dueño | 1–2 h, en una visita o una llamada |
| 2. Escribir sus datos completos, partiendo de los de un negocio del mismo oficio | Claude | 15–20 min |
| 3. Validarlos | `pruebas-reglas/valida-negocio.mjs` | segundos |
| 4. Crear la copia (con la parte pública de sus datos), sus iconos y su manifiesto | `copias.mjs nueva`, `iconos.py` | 1 s |
| 5. Pasarle recorridos al azar con sus datos completos | `pruebas-reglas/azar.mjs` | 1 min |
| 6. Pasarle las pruebas de pantalla | `negocio.py`, `cliente.py --copia` | 15 s |
| 7. Darlo de alta en el buzón y en el servidor | `copias.mjs nueva` y `copias.mjs alta --datos`, y Claude con el conector de Supabase | 5 min |
| 8. Publicar | Claude: commit y push, y las pruebas de GitHub | 15 min |
| 9. Entregar: el código de cada persona, la app instalada en sus móviles y «Tu sesión» | Oscar | 1 h |

En total, unas 3 o 4 horas, y la mayor parte es con el dueño. La guía calculaba de 8 a 12 horas: el alta en el
servidor ya no es a mano y las pruebas de cada copia corren solas. No entra aquí la web del negocio (como la de
Ramírez): eso es OOOX Local, aparte. La copia solo trae la cita, la app y la zona del cliente.

## 1. Los datos que hay que pedir

- **El negocio:** nombre, marca (una o dos palabras), razón social, NIF y dirección completa (calle, número, código
  postal y ciudad). También teléfono, correo y el enlace de sus reseñas de Google.
- **Las condiciones:** garantía en meses (en Cataluña, al menos 6) y cómo cobra (Bizum o cuenta).
  También la tarifa: horario normal y recargo de urgencia.
- **Los festivos de su municipio:** el calendario laboral oficial y los dos festivos locales. No se copian de otro
  negocio sin mirarlos.
- **El equipo:** de cada técnico, nombre, apellidos, horario de la semana, si hace guardias y quién es el dueño.
- **Dónde trabaja:** barrios y códigos postales, con los minutos que tarda en llegar. Para Barcelona ya están hechos
  en la demo de Ramírez; para otra ciudad hay que hacerlos.
- **Las citas:** las franjas y cuántos huecos guarda para urgencias.
- **Los servicios:** con su precio y lo que tardan. Se hacen con la hoja de servicios
  (https://claude.ai/artifact/MXymNY6J1yRz3XwshEKqne) y `servicios-catalogo.mjs`.
- **Las averías que más le entran**, con su consejo de «Mientras tanto».
- **Si quiere:** la furgoneta (lo que lleva cada una) y los contratos de mantenimiento (planes y precio).

## 2. Los datos completos

Se parte de los datos de un negocio del mismo oficio: los de Voltio (`pruebas-reglas/completos/voltio.js`) para
electricidad, y los de Ramírez (`frontend/public/demos/ramirez-24h/js/oficio-datos.js`) para fontanería. Se cambia
todo lo de arriba. Hay que fijarse en cinco cosas:

- **Quitar `prueba:true`** si es un negocio de verdad: con esa línea, la app dice arriba que es una copia de prueba.
- **Quitar la muestra** (`OFICIO_MUESTRA`): una copia de verdad arranca vacía.
- **Poner la línea `servidor`** (es la misma que la de Voltio): con ella, la copia lleva solo la parte pública.
- **Los textos en catalán e inglés de lo suyo** (`textos`): la dirección, las averías y los servicios. Lo común de las
  pantallas ya va traducido.
- **El `id`** en minúsculas, con letras, números y guiones: es el nombre de su carpeta y de su alta en el servidor.

**Dónde se guardan (desde el 17-11-2026):** los datos completos llevan los apellidos y los horarios del equipo, y
**no van nunca al repositorio**, que es público. Se guardan en la carpeta privada del PC,
`OOOX\02-Business\webs-negocios\privado\<id>.js`, fuera de las carpetas que se copian del repositorio. Y en el
servidor, que es de donde los toma la app al entrar. Los de las copias de prueba (Voltio) sí están en el repositorio,
en `pruebas-reglas/completos/`: son inventados.

Luego se validan:

    node pruebas-reglas/valida-negocio.mjs ../../frontend/public/demos/ramirez-24h <completos.js>

## 3. La copia

    node copias.mjs nueva --datos <completos.js>     # la copia, con la parte pública; y el código de soporte con el SQL del buzón
    python3 iconos.py ../../frontend/public/oficios/<id>
    node copias.mjs app ../../frontend/public/oficios/<id>
    node pruebas-reglas/azar.mjs ../../frontend/public/demos/ramirez-24h --negocio <completos.js>

Con la línea `servidor`, el archivo de datos de la copia (`js/oficio-datos.js`) es el **público**: lo baja cualquiera
que abra la cita, así que del equipo lleva solo el nombre, la inicial del apellido y el color. Lo hace la herramienta y
no se toca a mano. Si cambian los datos completos, se rehace con `node copias.mjs publica <id> --datos <completos.js>`.
Los recorridos al azar se pasan con los datos completos: con el archivo público no se puede (le faltan los horarios).

`pruebas.sh` le pasa sus pruebas de pantalla junto con las demás copias. Con `COMPLETOS=<carpeta privada>`, también
las que necesitan los datos completos (los recorridos al azar, la app sin servidor y la app contra el servidor local).

## 4. El servidor

1. El SQL del buzón (lo da `copias.mjs nueva`) en Supabase.
2. Hacer el alta en el servidor, con sus datos completos:

       node copias.mjs alta <id> --datos <completos.js>

   Esto escribe el SQL en un archivo (sus datos completos, sin ningún código: solo sus huellas). Antes mira que los
   datos completos cuadren con el archivo público de la copia. El código de cada persona sale en pantalla una sola
   vez. El SQL lo pasa Claude con el conector de Supabase.
3. Dar a cada persona su código por un canal privado. Si se pierde uno, el dueño da otro desde su app («Tu sesión»
   → «Equipo y accesos»).
4. Si después cambian sus datos (precios, técnicos u horarios), se cambian los datos completos y luego:

       node copias.mjs publica <id> --datos <completos.js>       # el archivo público, para la web (commit y push)
       node copias.mjs subir-datos <id> --datos <completos.js>   # el SQL de los datos nuevos, para el servidor

   `subir-datos` no sale si el archivo público no cuadra con los completos: los clientes verían otros precios. Si
   la web y el servidor no tienen lo mismo, «Tu sesión» lo dice.

## 5. Lo que encontró el ensayo

- **La cabecera de la app no cabía a 320 px** con una marca más larga («Lampistes Gràcia»). Arreglado: la marca encoge y
  «Tu sesión» se queda en su círculo. `negocio.py` lo prueba con una marca larga en cada copia.
- **Los festivos, las zonas y los textos en catalán e inglés** son lo que más tiempo lleva del archivo de datos. Son de
  cada negocio y no se pueden copiar sin mirarlos.
- **`prueba:true` venía de la copia de partida.** Ahora sale en la lista de arriba.
- **Sin decidir:** dónde vive cada negocio. Puede ser en `ooox.es/oficios/<id>/` o en su dominio.
- **Hecho el 17-11-2026 (fisura 3 del repaso):** en una copia con servidor, los apellidos y los horarios del equipo
  ya no están en el archivo que puede leer cualquiera. Están solo en el servidor y en los datos completos, que no van
  al repositorio. Voltio ya va así.
