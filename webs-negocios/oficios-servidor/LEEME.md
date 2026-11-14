# El servidor de OOOX Oficios (fase 2)

Sin servidor, cada navegador guarda sus avisos. Con servidor, la oficina, los técnicos y el cliente ven lo mismo desde
aparatos distintos. El diseño para Oscar, con lo que cuesta y los pasos, está en la guía, pestaña «El servidor»:
https://claude.ai/artifact/AHLx7anfXkAhZUVP51FyrY

**Estado a 14-11-2026: funciona de punta a punta para la copia de prueba Voltio Sur.** El servidor está desplegado en
Supabase (proyecto `neuron-staging`, plan gratis, región de Irlanda) y la app ya habla con él: se entra con un código por
persona, lo que se hace se ve al momento y se manda, y cada aparato se pone al día solo. Ningún negocio de verdad lo usa
todavía. La demo de Ramírez sigue sin servidor, como siempre.

## Las piezas

| Archivo | Qué es | Estado |
|---|---|---|
| `juez.mjs` | El juez: la única puerta por la que cambia un aviso. Comprueba quién es, pasa la acción por las mismas reglas que la app (`js/oficio-nucleo.js`) y guarda. No sabe de Supabase ni de internet | Hecho |
| `almacen-memoria.mjs` | Un almacén de mentira, en memoria, con el mismo contrato que el de verdad. Para las pruebas y para el servidor local de las pruebas de pantallas | Hecho |
| `almacen.sql` | Las tablas y funciones del almacén de verdad, en Supabase (apartado `oficios`). Aplicado | Hecho |
| `pruebas-almacen.sql` | 22 comprobaciones del almacén de verdad. Se pasan en la base de datos y no dejan nada escrito | Hecho |
| `funcion/index.ts` | La función `oficio` de Supabase: envuelve al juez con el almacén de verdad. Desplegada | Hecho |
| `js/oficio-espejo.js` (en la app) | El espejo: lo que el aparato sabe del servidor y lo que le falta por enviar. Sin red ni reloj: se prueba sin navegador | Hecho |
| `js/oficio-estado.js` (en la app) | Con `servidor` en los datos del negocio: la sesión, la red, cada cuánto se pregunta y lo que se guarda en el aparato | Hecho |
| `demos/pruebas-navegador/servidor_local.mjs` | Un servidor local con este mismo juez, para probar las pantallas sin salir a internet | Hecho |

## Cómo decide el juez

- **El orden lo pone él.** Cada negocio tiene un número de versión. Cada acción aceptada lo sube en uno. El juez guarda
  solo si la versión sigue siendo la que leyó; si otro aparato se adelantó, vuelve a leer y aplica la acción sobre lo
  nuevo (hasta 5 veces; después contesta `lleno` y el aparato reintenta).
- **Las reglas son las de la app.** `K.aplicar(S, cfg, acción, quién, t)`. Lo que rechazan no se guarda ni se apunta.
- **La hora es la del servidor.**
- **Cada aviso guarda la versión en que cambió por última vez.** Un aparato pide «lo cambiado desde la versión N» y
  recibe solo eso.
- **`de`**: los técnicos que han llevado alguna vez el aviso. Si deja de ser de uno, a ese le llega
  `{id, v, fuera:true}`, sin datos, para que lo quite de su móvil.
- **`llave`**: 24 letras al azar que el juez pone a cada aviso nuevo. Es lo que lleva el enlace del cliente.
- **`vista`**: lo que ve el cliente (`K.vistaCliente`), calculado al guardar. Así se puede leer sin pasar por el juez.
- **La marca (`clave`)**: el aparato pone una marca al azar a cada acción. Si la manda dos veces porque se cortó la
  red, la segunda no se hace: se devuelve el resultado de la primera. La marca vale solo para quien la puso y tiene
  que tener 12 letras o más.
- **Diario**: una línea por acción aceptada, con quién, cuándo y qué. Lo guardado es siempre igual a repetir el diario.

## Lo que se le puede pedir (`juez.atiende(petición)`)

Contesta siempre `{ok:true, …}` o `{ok:false, err}`. Nunca lanza.

| `que` | Quién | Manda | Recibe |
|---|---|---|---|
| `entrar` | Oficina o técnico | `negocio, persona, codigo` | `rol, id, v` |
| `hacer` | Oficina o técnico | lo anterior y `accion`, `desde`, `clave` | `r` (lo que dicen las reglas), `v`, `cambios` |
| `leer` | Oficina o técnico | `negocio, persona, codigo, desde` | `cambios` |
| `pedir` | Cualquiera, desde la web | `negocio, accion` (solo `pedir`), `clave` | `id, llave` y nada más |
| `huecos` | Cualquiera | `negocio` | `dias: [{dia, hoy, franjas: [{id, ok}]}]`, sin cifras ni datos |
| `ver` | El cliente, con su enlace | `negocio, aviso, llave` | `vista` |

`cambios` es `{v, entero, cab, avisos}`. `entero:true` quiere decir «tira lo que tengas y quédate con esto». La oficina
recibe todos los avisos y la cabecera (contadores y ausencias); un técnico, solo los avisos que lleva y los `fuera`.

Errores propios del juez: `clave` (código malo, persona o negocio que no existe, negocio de baja: todos contestan lo
mismo), `bloqueo` (diez códigos fallados en diez minutos desde la misma conexión), `accion`, `grande`, `permiso` (por la
puerta de la web solo se puede pedir), `limite`, `enlace`, `negocio`, `lleno`, `peticion` y `servidor`. Los demás son
los de las reglas.

## Dónde está y cómo se llama

- La función: `POST https://<proyecto>.supabase.co/functions/v1/oficio`, con la petición como texto JSON en el cuerpo.
  Sin cabeceras: así el navegador no hace una llamada previa de permiso por cada una. `GET` a la misma dirección dice
  qué versión de las reglas lleva: `{ok, oficio:{reglas, commit}}`.
- No pide la llave de Supabase (`verify_jwt` apagado): cada persona entra con su código y eso lo mira el juez.
- Dos lecturas van directas a la base de datos, porque esas llamadas no tienen límite en ningún plan:
  `POST /rest/v1/rpc/oficios_v` (`p_negocio, p_persona, p_codigo` → `{ok, v}`; la app la llama cada 2 s para saber si
  hay algo nuevo, y solo entonces llama a `leer`) y `POST /rest/v1/rpc/oficios_vista` (`p_negocio, p_aviso, p_llave` →
  `{ok, vista}`; la página del cliente la llama cada 5 s mientras se mira). Estas sí llevan la llave pública (`apikey`).
- La función no lleva dentro las reglas ni el juez: los importa de este repositorio, de un commit exacto. Lo que corre
  es, letra por letra, lo que pasó las pruebas.

### Desplegar una versión nueva de las reglas o del juez

1. Subir el cambio al repositorio (rama con las pruebas en verde).
2. En `funcion/index.ts`, cambiar el commit en las dos líneas `import "https://raw.githubusercontent.com/…"` y en
   `VERSION`.
3. Desplegar la función `oficio` con ese `index.ts` (un solo archivo, `verify_jwt` apagado).
4. Comprobar: `GET …/functions/v1/oficio` tiene que decir la misma versión que `K.VERSION` en la app. Si no coinciden,
   la app lo avisa en el menú «Tu sesión».

## Dar de alta un negocio en el servidor

Lo hace Claude con el conector de Supabase (o Oscar en el editor de SQL). Hoy es a mano; pasarlo a `copias.mjs` está
en la lista de lo que falta.

1. El negocio tiene que estar ya en `oficios.negocios` (lo crea el alta del buzón de mejoras).
2. Sus datos, tal cual el archivo `js/oficio-datos.js` pero en JSON y **sin** la línea `servidor`, en `oficios.estados`
   (columna `datos`, tipo `json` para que no cambie el orden), con `cab = {"esq":4,"n":0,"nu":0,"ausencias":[]}`.
3. Una fila por persona en `oficios.personas`: `persona` es `oficina` o el `id` del técnico en los datos; `rol`,
   `centralita` o `tecnico`; `quien`, `oficina` o ese mismo `id`; `clave_hash`, `oficios.huella('<negocio>:<persona>', '<código>')`.
   El código son 16 letras y números al azar en cuatro grupos (`abcd-efgh-jkmn-pqrs`), del abecedario sin `i`, `l`,
   `o`, `0` ni `1`. **No se guarda en ningún sitio**: se da a la persona una vez, por un canal privado.
4. En el archivo de datos de la copia, la línea `servidor:{url:'https://<proyecto>.supabase.co', llave:'<llave pública>'}`.
   Sin ella la app sigue guardando todo en el navegador.
5. Si después cambian los datos del negocio (precios, técnicos, horarios), hay que cambiarlos en los dos sitios: el
   archivo de la copia y `oficios.estados.datos`. Si no, la app y el servidor harían cuentas distintas (ganaría el
   servidor, pero la pantalla bailaría un momento).

Para retirar el acceso a alguien: `update oficios.personas set activo = false` (o cambiarle el `clave_hash`). Su app
vuelve sola a la pantalla de entrar en dos segundos.

`select * from oficios.servidor` enseña cada negocio con servidor, su versión, sus avisos y sus personas.

## Cómo habla la app con el servidor

Las pantallas llaman a lo mismo con o sin servidor (`Oficio.estado`, `Oficio.hacer`, `Oficio.crear`).

- **Entrar.** `app.html` enseña «Entrar» si no hay sesión: quién eres y tu código. El código se queda guardado en el
  aparato (en `localStorage`) hasta que se cierra la sesión. Vale con mayúsculas, espacios o sin guiones.
- **Hacer algo** (asignar, «Voy», empezar, cobrar…): se aplica en el aparato al momento con las mismas reglas, se pone
  en una cola y se manda. Cuando el servidor contesta, manda lo suyo. Si dice que no (otro se adelantó), lo adelantado
  se deshace y sale un aviso: «No se ha guardado: …».
- **Sin cobertura** se sigue trabajando: la cola se guarda en el aparato y sale sola cuando vuelve la red, también si se
  cierra y se abre la app. Arriba pone «Sin conexión. 2 cambios por enviar».
- **Crear** un aviso o una ausencia espera la respuesta, porque el número lo pone el servidor. Sin red no se crea.
- **Ponerse al día.** Con la app en pantalla se pregunta la versión cada 2 s (cada 4 s tras 2 minutos sin cambios y cada
  8 s tras 10; cada vez más despacio si falla la red, hasta 30 s). En segundo plano no se pregunta.
- **Fotos.** Van dentro del aviso. No se guardan en el aparato: al abrir la app se pide todo de nuevo.
- **El cliente** (`cita.html`): los huecos se los da el servidor, sin cifras; al pedir recibe su número y su llave, que
  se guarda en su navegador; su enlace es `cita.html#/aviso/<número>/<llave>`.
- **Varias pestañas** del mismo navegador se avisan entre ellas y no se pisan lo pendiente.

## El contrato del almacén

Ocho funciones. Devuelven siempre copias.

| Función | Qué hace |
|---|---|
| `negocio(id)` | `{id, activo, datos, v, cab}` o nada. `datos` es el archivo de datos del negocio; `cab`, `{esq, n, nu, ausencias}` |
| `entra(negocio, persona, codigo, red)` | `{rol, id}`, nada, o `'bloqueo'`. Cuenta los códigos fallados por conexión |
| `vivos(negocio)` | Los avisos con los que trabajan las reglas: `[{id, v, datos, de, llave, vista}]`. Hoy son todos; cuando pesen, se archivan los cerrados antiguos |
| `hecha(negocio, clave)` | El resultado guardado de una acción con esa marca, o nada |
| `guarda(negocio, vAntes, {v, cab, avisos, diario})` | Guarda todo de una vez, solo si la versión sigue siendo `vAntes`. `{ok}` |
| `cambios(negocio, desde)` | `{v, cab, avisos}` con los avisos cambiados después de esa versión |
| `vista(negocio, aviso, llave)` | Lo que ve el cliente, si la llave es la de ese aviso |
| `tope(negocio, clave, max, ventana)` | Frena abusos: `true` si aún cabe |

## Pruebas

En el repositorio, `bash webs-negocios/demos/pruebas.sh` las pasa con todo lo demás (`reglas` o `navegador` para un
bloque solo).

Sin navegador:

- `pruebas-reglas/prueba-juez.mjs`: el juez, con ejemplos escritos a mano. 56.
- `pruebas-reglas/azar-juez.mjs`: dos negocios, once aparatos cada tanda, acciones al azar, otros aparatos que se
  adelantan entre que el juez lee y guarda, y acciones mandadas dos veces. 9.000 pasos y 1,29 millones de comprobaciones.
- `pruebas-reglas/mutantes-juez.mjs`: se quita adrede cada protección del juez y se mira que alguna prueba lo note. 35 de 35.
- `pruebas-reglas/prueba-espejo.mjs`: el espejo de la app contra el juez de verdad, con ejemplos. 71.
- `pruebas-reglas/azar-espejo.mjs`: varios aparatos con su espejo, red que falla (peticiones que no llegan, respuestas
  que se pierden, aparatos sin cobertura), la app que se cierra y se abre, códigos que se retiran. Leyes: lo que se ve es
  siempre lo último del servidor más lo pendiente, en orden; al calmarse todo, cada aparato ve lo que le toca; cada
  acción acaba una sola vez en el diario o rechazada y avisada. 45.000 pasos y 256.000 comprobaciones.
- `pruebas-reglas/mutantes-espejo.mjs`: lo mismo que con el juez, para el espejo. 29 de 29.
- `oficios-servidor/pruebas-almacen.sql`: el almacén de verdad, en la base de datos. 22.

Con navegador:

- `pruebas-navegador/servidor.py`: la oficina, dos técnicos y un cliente, cada uno en su navegador, contra el servidor
  local. Entrar, crear, asignar, que le llegue al técnico, sin cobertura, el servidor caído, una respuesta perdida, un
  rechazo, la cita del cliente y su enlace, dos pestañas, segundo plano, código retirado y cerrar sesión. 77.
  Se pasa dos veces: con la plantilla y los datos de Voltio, y con la copia de Voltio servida desde su carpeta.
- Ninguna batería llega al servidor de verdad: `buzon_falso.py` lo impide en todas.

GitHub las pasa en cada cambio: reglas y datos en una máquina, y las pantallas en Chromium, Firefox y WebKit. En verde
el 14-11-2026 con el commit `acb9626`.

En vivo (14-11-2026), contra la función desplegada y sin navegador: entrar bien y mal, crear, asignar, leer como cada
técnico, enlace del cliente bueno y malo, cita desde la web con el origen y el técnico forzados, acción repetida,
permisos y cancelar. Y desde la vista previa, en un navegador de verdad: los huecos libres y el enlace del cliente, con
su llave y con una inventada. Entrar con código desde una página publicada queda para Oscar. Quedan en el servidor dos avisos de prueba de Voltio (`VS-0001` y `VS-0002`, con «Prueba de
Claude» por nombre).

## Lo que falta

1. **Que Oscar lo pruebe con dos aparatos** (su ordenador y su iPhone) con los códigos de Voltio.
2. **`copias.mjs`**: que dé de alta el negocio en el servidor (hoy, a mano con la lista de arriba) y avise si los datos
   de la copia y los del servidor no coinciden.
3. **Fotos fuera del aviso** (en el almacén de archivos de Supabase): hoy viajan dentro y pesan.
4. **Archivar** los avisos cerrados antiguos, para que la oficina no los baje todos cada vez.
5. **Abrir la app sin conexión** (que el navegador guarde las pantallas): hoy, sin red, la app ya abierta sigue
   funcionando, pero no se puede abrir de cero.
6. **El enlace del cliente en los mensajes de WhatsApp** (va con el bloque de mensajes).
7. **Copia de seguridad**: el plan gratis no hace copias automáticas. Antes del primer negocio de verdad, o plan de pago
   (desde 25 $ al mes, con el visto bueno de Oscar) o una copia diaria propia.
8. **Texto legal** del formulario del cliente (quién es el responsable de los datos): lo tiene que revisar la gestoría.
9. **Freno general por conexión** en la función. Hoy tienen freno pedir cita (5 por hora y conexión, 40 por hora en
   total) y los códigos fallados (10 en diez minutos). Mirar huecos o llamar sin más no lo tiene: alguien con mala idea
   podría gastar las 500.000 llamadas al mes del plan gratis. No cuesta dinero (la función dejaría de contestar hasta
   el mes siguiente), pero antes de un negocio de verdad hay que ponerlo.
