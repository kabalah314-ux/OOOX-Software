# El alta de un negocio en OOOX Oficios, paso a paso

Ensayado el 16-11-2026 con un negocio inventado, «Lampistes Gràcia»: electricistas en Barcelona, con tres técnicos.
El ensayo se hizo en una carpeta aparte. Nada de él está en el repositorio ni en Supabase.

## Lo que tarda

| Paso | Quién | Tiempo |
|---|---|---|
| 1. Recoger los datos del negocio (lista de abajo y hoja de servicios) | Oscar con el dueño | 1–2 h, en una visita o una llamada |
| 2. Escribir su archivo de datos, partiendo del de un negocio del mismo oficio | Claude | 15–20 min |
| 3. Validarlo | `pruebas-reglas/valida-negocio.mjs` | segundos |
| 4. Crear la copia, sus iconos y su manifiesto | `copias.mjs nueva`, `iconos.py` | 1 s |
| 5. Pasarle recorridos al azar con sus datos | `pruebas-reglas/azar.mjs` | 1 min |
| 6. Pasarle las pruebas de pantalla | `negocio.py`, `cliente.py --copia` | 15 s |
| 7. Darlo de alta en el buzón y en el servidor | `copias.mjs nueva` y `copias.mjs alta`, y Claude con el conector de Supabase | 5 min |
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

## 2. El archivo de datos

Se parte del archivo de un negocio del mismo oficio: Voltio (`frontend/public/oficios/voltio`) para electricidad, y
Ramírez (`frontend/public/demos/ramirez-24h`) para fontanería. Se cambia todo lo de arriba. Hay que fijarse en cuatro
cosas:

- **Quitar `prueba:true`** si es un negocio de verdad: con esa línea, la app dice arriba que es una copia de prueba.
- **Quitar la muestra** (`OFICIO_MUESTRA`): una copia de verdad arranca vacía.
- **Los textos en catalán e inglés de lo suyo** (`textos`): la dirección, las averías y los servicios. Lo común de las
  pantallas ya va traducido.
- **El `id`** en minúsculas, con letras, números y guiones: es el nombre de su carpeta y de su alta en el servidor.

Luego se valida:

    node pruebas-reglas/valida-negocio.mjs ../../frontend/public/demos/ramirez-24h <archivo.js>

## 3. La copia

    node copias.mjs nueva --datos <archivo.js>       # la copia, y el código de soporte con el SQL del buzón
    python3 iconos.py ../../frontend/public/oficios/<id>
    node copias.mjs app ../../frontend/public/oficios/<id>
    node pruebas-reglas/azar.mjs ../../frontend/public/demos/ramirez-24h --negocio ../../frontend/public/oficios/<id>/js/oficio-datos.js

`pruebas.sh` le pasa sus pruebas de pantalla junto con las demás copias.

## 4. El servidor

1. El SQL del buzón (lo da `copias.mjs nueva`) en Supabase.
2. Añadir a sus datos la línea `servidor` (es la misma que la de Voltio).
3. Hacer el alta en el servidor:

       node copias.mjs alta <id>

   Esto escribe el SQL en un archivo (sin ningún código, solo sus huellas). El código de cada persona sale en
   pantalla una sola vez. El SQL lo pasa Claude con el conector de Supabase.
4. Dar a cada persona su código por un canal privado. Si se pierde uno, el dueño da otro desde su app («Tu sesión»
   → «Equipo y accesos»).
5. Si después cambian sus datos (precios, técnicos u horarios), hay que subirlos con
   `node copias.mjs subir-datos <id>`. Si no, «Tu sesión» avisa de que los datos no son los mismos.

## 5. Lo que encontró el ensayo

- **La cabecera de la app no cabía a 320 px** con una marca más larga («Lampistes Gràcia»). Arreglado: la marca encoge y
  «Tu sesión» se queda en su círculo. `negocio.py` lo prueba con una marca larga en cada copia.
- **Los festivos, las zonas y los textos en catalán e inglés** son lo que más tiempo lleva del archivo de datos. Son de
  cada negocio y no se pueden copiar sin mirarlos.
- **`prueba:true` venía de la copia de partida.** Ahora sale en la lista de arriba.
- **Sin decidir:** dónde vive cada negocio. Puede ser en `ooox.es/oficios/<id>/` o en su dominio.
- **Pendiente (fisura 3 del repaso):** en una copia con servidor, los apellidos y los horarios del equipo siguen en un
  archivo que puede leer cualquiera. Hay que hacerlo antes del primer negocio de verdad.
