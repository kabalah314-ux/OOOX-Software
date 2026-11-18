# El servidor de OOOX Oficios (fase 2)

Sin servidor, cada navegador guarda sus avisos. Con servidor, la oficina, los técnicos y el cliente ven lo mismo desde
aparatos distintos. El diseño para Oscar, con lo que cuesta y los pasos, está en la guía, pestaña «El servidor»:
https://claude.ai/artifact/AHLx7anfXkAhZUVP51FyrY

**Estado a 15-11-2026: funciona de punta a punta para la copia de prueba Voltio Sur.** El servidor está desplegado en
Supabase (desde el 17-11-2026, en el proyecto propio de OOOX Oficios, plan gratis, región de Irlanda; antes, en
`neuron-staging`) y la app ya habla con él: se entra con un código por
persona, lo que se hace se ve al momento y se manda, y cada aparato se pone al día solo. Desde el 14-11 por la noche, el
cliente también entra en su zona (`cliente.html`) con su teléfono y un código que le manda la oficina por WhatsApp. Ningún
negocio de verdad lo usa todavía. La demo de Ramírez sigue sin servidor, como siempre.

## Las piezas

| Archivo | Qué es | Estado |
|---|---|---|
| `juez.mjs` | El juez: la única puerta por la que cambia un aviso. Comprueba quién es, pasa la acción por las mismas reglas que la app (`js/oficio-nucleo.js`) y guarda. No sabe de Supabase ni de internet | Hecho |
| `almacen-memoria.mjs` | Un almacén de mentira, en memoria, con el mismo contrato que el de verdad. Para las pruebas y para el servidor local de las pruebas de pantallas | Hecho |
| `almacen.sql` | Las tablas y funciones del almacén de verdad, en Supabase (apartado `oficios`). Aplicado | Hecho |
| `pruebas-almacen.sql` | 37 comprobaciones del almacén de verdad. Se pasan en la base de datos y no dejan nada escrito | Hecho |
| `funcion/index.ts` | La función `oficio` de Supabase: envuelve al juez con el almacén de verdad. Desplegada | Hecho |
| `js/oficio-espejo.js` (en la app) | El espejo: lo que el aparato sabe del servidor y lo que le falta por enviar. Sin red ni reloj: se prueba sin navegador | Hecho |
| `js/oficio-estado.js` (en la app) | Con `servidor` en los datos del negocio: la sesión, la red, cada cuánto se pregunta y lo que se guarda en el aparato | Hecho |
| `demos/pruebas-navegador/servidor_local.mjs` | Un servidor local con este mismo juez, para probar las pantallas sin salir a internet | Hecho |

## Cómo decide el juez

- **El orden lo pone él.** Cada negocio tiene un número de versión. Cada acción aceptada lo sube en uno. El juez guarda
  solo si la versión sigue siendo la que leyó; si otro aparato se adelantó, vuelve a leer y aplica la acción sobre lo
  nuevo (hasta 5 veces; después contesta `lleno` y el aparato reintenta).
- **Las reglas son las de la app.** `K.aplicar(S, cfg, acción, quién, t)`. Lo que rechazan no se guarda ni se apunta.
- **La hora es la del servidor, salvo lo hecho sin conexión** (16-11-2026). El aparato manda cuándo hizo cada acción (`t`)
  y qué hora tiene al mandarla (`ya`), con su reloj; el juez cuenta cuánto hace (`ya − t`), así da igual que el reloj del
  aparato vaya mal. Como mucho tres días atrás y nunca antes de lo último apuntado en ese aviso (`horaDe`). El diario guarda
  esa hora (la columna `cuando` tiene la de llegada), y repetirlo sigue dando lo mismo.
- **Las fotos, aparte** (16-11-2026). La foto que trae una acción (la del cliente al pedir, las del trabajo al anotar) se
  guarda una sola vez en `oficios.fotos`, en la misma operación; el aviso y el diario llevan su referencia («f:» y 16
  letras, la huella de la foto). Así cargar los avisos no carga las fotos. Una referencia solo la pone el juez: si llega
  una desde fuera, `foto` (sería pedir la foto de otro). Las fotos no van en la copia de cada noche (pesan); sí en la
  exportación del negocio, y se borran al olvidar a un cliente.
- **La huella de los datos del negocio** va al entrar, al leer y al hacer (`huella`: los datos sin `servidor` ni `textos`,
  con las claves en orden, SHA-256 y 16 letras). Si cambia, la app pide los datos nuevos (abajo). Con ellos en la mano,
  compara su parte pública (`K.publico`) con su archivo, que es lo que ven los clientes al pedir cita. Si no es la
  misma, lo dice en «Tu sesión»: así se ve si alguien ha cambiado un precio en un sitio y no en el otro.
- **Los datos del negocio, del servidor** (16-11-2026). Al entrar, la app manda la huella de los datos que ya tiene y,
  si no es la misma, el servidor se los da (`datos`). Desde ese momento la app hace las cuentas con ellos (precios,
  horarios, el equipo) y no con su archivo, que solo hace falta para pedir cita. Los guarda en el aparato para abrir
  sin red y los quita al salir. Si la huella cambia al leer o al mandar (alguien ha subido datos nuevos), los vuelve a
  pedir, como mucho una vez por minuto.
- **El archivo público** (17-11-2026). Con lo anterior, el archivo de datos de una copia con servidor ya no lleva al
  equipo entero: del equipo, solo el nombre, la inicial del apellido y el color (`K.publico`, con `publico: true`).
  Ese archivo lo baja cualquiera que abra la cita. Los apellidos, los horarios, quién es el jefe o hace guardias y su
  furgoneta están solo aquí, en `oficios.estados.datos`, y en los datos completos del negocio, que nunca van al
  repositorio. El servidor no ha cambiado para esto: ya daba los datos al entrar.
- **Cada aviso guarda la versión en que cambió por última vez.** Un aparato pide «lo cambiado desde la versión N» y
  recibe solo eso.
- **`de`**: los técnicos que han llevado alguna vez el aviso. Si deja de ser de uno, a ese le llega
  `{id, v, fuera:true}`, sin datos, para que lo quite de su móvil.
- **`llave`**: 24 letras al azar que el juez pone a cada aviso nuevo. Es lo que lleva el enlace del cliente.
- **`vista`**: lo que ve el cliente (`K.vistaCliente`), calculado al guardar. Así se puede leer sin pasar por el juez.
- **La furgoneta** (16-11-2026): la cuenta de la furgoneta de cada técnico (`furgos`) va en la cabecera del negocio, con
  los contadores, las ausencias y los contratos. La oficina la recibe entera; cada técnico, solo la suya (`{esq, furgos:
  {su id: …}}`). La cambian «furgo» (llevar la cuenta, contar, cargar) y «terminar» (lo usado se descuenta).
- **Los servicios de la web** (18-11-2026): lo que el negocio cambia en su app de «¿Qué necesitas arreglar?» (nombre,
  frase, precio con cita, foto, orden y si sale; la acción «web», solo la oficina o el dueño) va en la cabecera (`web`).
  Lo recibe todo el equipo (no hay nada privado; los técnicos, como `{esq, furgos, web}`) y, sin la hora de cada cambio,
  la página de citas, con los huecos. La foto se guarda aparte, como las de los avisos, con `aviso: 'web'`, y se ve con
  `foto` y `web: true` sin código, mientras siga puesta en la web.
- **La marca (`clave`)**: el aparato pone una marca al azar a cada acción. Si la manda dos veces porque se cortó la
  red, la segunda no se hace: se devuelve el resultado de la primera. La marca vale solo para quien la puso y tiene
  que tener 12 letras o más.
- **Diario**: una línea por acción aceptada, con quién, cuándo y qué. Lo guardado es siempre igual a repetir el diario.
- **La zona del cliente.** Lo que es de un cliente lo decide su teléfono (`K.perfilCliente`). La oficina pide el código de
  ese teléfono (`acceso`): ocho letras (`abcd-efgh`), del mismo abecedario que las llaves. Si ya tenía uno, recibe el mismo,
  para poder mandárselo otra vez; si pide cambiarlo, sale uno nuevo y el de antes deja de valer. Solo la centralita, y solo
  para un teléfono con algún aviso. El código se guarda tal cual en `oficios.clientes` (no su huella) para poder volver a
  mandarlo: lo que abre está en la misma base de datos. Ninguna otra respuesta lo lleva: ni `pedir`, ni `huecos`, ni lo que
  leen la oficina o los técnicos.
- **El freno de la zona.** Cuentan todos los códigos fallados, sea o no el teléfono de un cliente: así el freno no deja
  averiguar quién es cliente. En diez minutos: diez desde la misma conexión bloquean ese teléfono a esa conexión;
  doscientos, a todas; y cincuenta desde una conexión, con el teléfono que sea, bloquean esa conexión.

## Lo que se le puede pedir (`juez.atiende(petición)`)

Contesta siempre `{ok:true, …}` o `{ok:false, err}`. Nunca lanza.

| `que` | Quién | Manda | Recibe |
|---|---|---|---|
| `entrar` | Oficina o técnico | `negocio, persona, codigo` y, si la tiene, la `huella` de sus datos | `rol, id, v, huella` y, si su huella no es la del servidor, `datos` |
| `hacer` | Oficina o técnico | lo anterior y `accion`, `desde`, `clave`; y `t`, `ya` si se hizo sin conexión | `r` (lo que dicen las reglas), `v`, `cambios`, `huella` |
| `leer` | Oficina o técnico | `negocio, persona, codigo, desde` | `cambios`, `huella` |
| `pedir` | Cualquiera, desde la web | `negocio, accion` (solo `pedir`), `clave` | `id, llave` y nada más |
| `huecos` | Cualquiera | `negocio` | `dias: [{dia, hoy, franjas: [{id, ok}]}]`, sin cifras ni datos; `urg`; y `web`: los servicios como los enseña la web del negocio (`{av, orden}`, o `null` si no ha cambiado nada) |
| `ver` | El cliente, con su enlace | `negocio, aviso, llave` | `vista` |
| `acceso` | Solo la oficina | `negocio, persona, codigo, tel` y, para cambiarlo, `cambia: true` | `tel, codigo, nuevo` |
| `perfil` | El cliente, en su zona | `negocio, tel, codigo` (el suyo) | `perfil`: `{tel, cli, avisos}`; cada aviso, con su `vista` y su `llave` |
| `equipo` | La oficina o el técnico que es el dueño (`jefe`) | `negocio, persona, codigo` y, para cambiar algo, `hace` (`codigo` o `baja`) y `a` (la persona) | sin `hace`: `yo, equipo` (cada persona con `estado`: `sin`, `activo` o `baja`) y `accesos` (los 20 últimos cambios, sin códigos). Con `hace:'codigo'`: `persona, codigo, tuyo` (el código nuevo sale solo esta vez). Con `hace:'baja'`: `persona` (y `ya` si no tenía acceso) |
| `foto` | La oficina, un técnico o el cliente en su zona; con `web: true`, cualquiera | `negocio, persona, codigo` (o `tel, codigo`) y `ref`; o `negocio, ref, web: true` | `datos`: la foto, si quien la pide puede ver su aviso (o, con `web`, si es la de un servicio de la web que sigue puesta); si no, `nadie`, como si no existiera |

`cambios` es `{v, entero, cab, avisos}`. `entero:true` quiere decir «tira lo que tengas y quédate con esto». La oficina
recibe todos los avisos y la cabecera (contadores, ausencias y, desde el 15-11, los contratos de mantenimiento); un técnico,
solo los avisos que lleva y los `fuera`.

Errores propios del juez: `clave` (código malo, persona o negocio que no existe, negocio de baja: todos contestan lo
mismo; en la zona del cliente, también un teléfono que no es suyo), `bloqueo` (demasiados códigos fallados seguidos),
`accion`, `grande`, `permiso` (por la puerta de la web solo se puede pedir; un técnico no da códigos de la zona; el
equipo solo lo lleva la oficina o el dueño), `tuyo` (quitarse el acceso a uno mismo), `ultimo` (no quedaría nadie que
lleve el equipo), `tel`
(un teléfono mal escrito), `nadie` (un teléfono sin avisos), `limite`, `enlace`, `negocio`, `lleno`, `peticion` y
`servidor`. Los demás son los de las reglas.

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

Desde el 16-11-2026 lo prepara `copias.mjs` y lo pasa Claude con el conector de Supabase (o Oscar en el editor de SQL):

    node copias.mjs alta <id> --datos <completos.js> [--sql <archivo>]          el SQL del alta y, en pantalla y UNA sola vez, el código de cada persona
    node copias.mjs subir-datos <id> --datos <completos.js> [--sql <archivo>]   el SQL con sus datos completos nuevos y la huella que dará el servidor
    node copias.mjs publica <id> --datos <completos.js>                          el archivo público de la copia, cuando cambian sus datos completos

Lo que se sube son los **datos completos** del negocio (con los apellidos y los horarios del equipo), no el archivo de la
copia, que es el público. Están fuera del repositorio (`demos/ALTA.md`, «Dónde se guardan»). Antes de escribir el SQL,
la herramienta mira que su parte pública sea el archivo de la copia: si no, los clientes verían otros precios.

El SQL va a un archivo que solo lee quien lo hace (por defecto, en la carpeta temporal) y no lleva ningún código: solo
sus huellas. Comprueba antes que el negocio está en el buzón y que no está ya en el servidor, y va entero o nada. Lo
prueban `prueba-copias.mjs` y, en un Postgres de verdad, `prueba-restaurar.sh`. Lo que hace, paso a paso (y como se
hacía a mano antes):

1. El negocio tiene que estar ya en `oficios.negocios` (lo crea el alta del buzón de mejoras).
2. Sus datos completos, en JSON y **sin** `servidor` ni `textos`, en `oficios.estados` (columna `datos`, tipo `json`
   para que no cambie el orden), con `cab = {"esq":4,"n":0,"nu":0,"ausencias":[]}`.
3. Una fila por persona en `oficios.personas`: `persona` es `oficina` o el `id` del técnico en los datos; `rol`,
   `centralita` o `tecnico`; `quien`, `oficina` o ese mismo `id`; `clave_hash`, `oficios.huella('<negocio>:<persona>', '<código>')`.
   El código son 16 letras y números al azar en cuatro grupos (`abcd-efgh-jkmn-pqrs`), del abecedario sin `i`, `l`,
   `o`, `0` ni `1`. **No se guarda en ningún sitio**: se da a la persona una vez, por un canal privado.
4. En el archivo de datos de la copia, la línea `servidor:{url:'https://<proyecto>.supabase.co', llave:'<llave pública>'}`.
   Sin ella la app sigue guardando todo en el navegador.
5. Si después cambian los datos del negocio (precios, técnicos, horarios), se cambian los datos completos y se llevan a
   los dos sitios: el archivo público de la copia (`publica`) y `oficios.estados.datos` (`subir-datos`). La app hace
   las cuentas con los del servidor, pero el cliente pide cita con el archivo público: si no cuadran, «Tu sesión» lo
   avisa. A un técnico nuevo le da su código el dueño desde su app («Equipo y accesos»).

Para retirar el acceso a alguien, desde el 16-11 lo hace el propio negocio: **«Tu sesión» → «Equipo y accesos»** (la
oficina o el técnico que es el dueño). «Quitar el acceso» y «Código nuevo» piden confirmarlo; el código nuevo sale una
sola vez y no se guarda en ningún sitio (solo su huella). Nadie puede quitarse el acceso a sí mismo, y siempre tiene que
quedar alguien que lleve el equipo (`ultimo`). Más de 30 cambios al día: `limite`. Cada cambio queda en
`oficios.accesos` (quién, a quién, qué y cuándo; nunca el código). A mano sigue valiendo
`update oficios.personas set activo = false`. En los dos casos, su app vuelve sola a la pantalla de entrar en dos
segundos.

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
- **La zona del cliente** (`cliente.html`): entra con su teléfono y su código, o con un toque en el enlace del mensaje
  (`cliente.html#/entra/<teléfono>/<código>`; el código se quita de la barra al momento). Se guardan en su navegador
  hasta que sale. Lo suyo se pide al abrir, cada medio minuto mientras se mira y al volver a la página; si su código ha
  cambiado, sale solo y se le dice por qué. Cada aviso abierto enlaza con su página en directo (`cita.html`, con su llave).
- **«Su zona»** en el aviso (solo la oficina): pide el código al servidor, enseña el mensaje y lo abre en WhatsApp con el
  teléfono del cliente. «Cambiar el código» pide confirmarlo.

## El contrato del almacén

Quince funciones. Devuelven siempre copias.

| Función | Qué hace |
|---|---|
| `negocio(id)` | `{id, activo, datos, v, cab}` o nada. `datos` es el archivo de datos del negocio; `cab`, `{esq, n, nu, ausencias, contratos, nc}` (los dos últimos, desde el 15-11; si faltan, vacíos) |
| `entra(negocio, persona, codigo, red)` | `{rol, id}`, nada, o `'bloqueo'`. Cuenta los códigos fallados por conexión |
| `vivos(negocio)` | Los avisos con los que trabajan las reglas: `[{id, v, datos, de, llave}]` (sin `vista` desde el 17-11-2026: el juez no la lee). Hoy son todos; cuando pesen, se archivan los cerrados antiguos |
| `hecha(negocio, clave)` | El resultado guardado de una acción con esa marca, o nada |
| `guarda(negocio, vAntes, {v, cab, avisos, diario, fotos})` | Guarda todo de una vez, solo si la versión sigue siendo `vAntes`; las fotos (`[{ref, aviso, datos}]`), una sola vez. `{ok}` |
| `cambios(negocio, desde)` | `{v, cab, avisos}` con los avisos cambiados después de esa versión |
| `vista(negocio, aviso, llave)` | Lo que ve el cliente, si la llave es la de ese aviso |
| `foto(negocio, ref)` | `{aviso, datos}` de esa foto, o nada |
| `tope(negocio, clave, max, ventana)` | Frena abusos: `true` si aún cabe |
| `cliente(negocio, tel)` | `{codigo, activo}` del código de la zona de ese teléfono, o nada |
| `ponCliente(negocio, tel, codigo)` | Guarda el código de ese teléfono (el de antes deja de valer). `{ok}` |
| `clienteEntra(negocio, tel, codigo, red)` | `true`, nada, o `'bloqueo'`. Cuenta los fallos (ver «El freno de la zona») |
| `personas(negocio)` | `[{persona, rol, activo}]`: quién tiene acceso, sin códigos ni huellas |
| `ponPersona(negocio, persona, rol, quien, codigo, por)` | Da (o cambia) el código de esa persona y la deja activa; apunta el cambio. `{ok}` |
| `bajaPersona(negocio, persona, por)` | Le quita el acceso; apunta el cambio. `{ok}` |
| `accesos(negocio)` | Los 20 últimos cambios de acceso, del más nuevo al más viejo: `[{cuando, quien, que, a}]` |

## Pruebas

En el repositorio, `bash webs-negocios/demos/pruebas.sh` las pasa con todo lo demás (`reglas` o `navegador` para un
bloque solo).

Sin navegador:

- `pruebas-reglas/prueba-juez.mjs`: el juez, con ejemplos escritos a mano. 96 (26 de la zona del cliente; los contratos,
  desde el 15-11, también los que da de alta el técnico y que solo viajan cuando cambian; y el tiempo de llegada a una
  urgencia que dan los huecos, sin decir quién va).
- `pruebas-reglas/azar-juez.mjs`: dos negocios, once aparatos cada tanda, acciones al azar, otros aparatos que se
  adelantan entre que el juez lee y guarda, y acciones mandadas dos veces; y la oficina que da o cambia códigos de la zona
  y el cliente que entra con ellos. 9.000 pasos y 1,29 millones de comprobaciones.
- `pruebas-reglas/mutantes-juez.mjs`: se quita adrede cada protección del juez y se mira que alguna prueba lo note. 57 de 57.
- `pruebas-reglas/prueba-espejo.mjs`: el espejo de la app contra el juez de verdad, con ejemplos. 75.
- `pruebas-reglas/azar-espejo.mjs`: varios aparatos con su espejo, red que falla (peticiones que no llegan, respuestas
  que se pierden, aparatos sin cobertura), la app que se cierra y se abre, códigos que se retiran. Leyes: lo que se ve es
  siempre lo último del servidor más lo pendiente, en orden; al calmarse todo, cada aparato ve lo que le toca; cada
  acción acaba una sola vez en el diario o rechazada y avisada. 45.000 pasos y 256.000 comprobaciones.
- `pruebas-reglas/mutantes-espejo.mjs`: lo mismo que con el juez, para el espejo. 32 de 32.
- `oficios-servidor/pruebas-almacen.sql`: el almacén de verdad, en la base de datos. 31, en verde el 14-11-2026.

Con navegador:

- `pruebas-navegador/servidor.py`: la oficina, dos técnicos y un cliente, cada uno en su navegador, contra el servidor
  local. Entrar, crear, asignar, que le llegue al técnico, sin cobertura, el servidor caído, una respuesta perdida, un
  rechazo, la cita del cliente y su enlace, la zona del cliente (el código que da la oficina, entrar con el enlace o a mano,
  cambiar el código, un técnico que no puede y el freno), dos pestañas, segundo plano, código retirado y cerrar sesión. 96.
  Se pasa dos veces: con la plantilla y los datos de Voltio, y con la copia de Voltio servida desde su carpeta.
- Ninguna batería llega al servidor de verdad: `buzon_falso.py` lo impide en todas.

GitHub las pasa en cada cambio: reglas y datos en una máquina, y las pantallas en Chromium, Firefox y WebKit. En verde
el 15-11-2026 con el commit `cf2290f` (desistimiento, «Facturada», el mes para la gestoría, fincas, quién va,
rentabilidad, el material que falta y los contratos de mantenimiento, también los que da de alta el técnico, y la urgencia como extra con sus tiempos de llegada).

En vivo (14-11-2026), contra la función desplegada y sin navegador: entrar bien y mal, crear, asignar, leer como cada
técnico, enlace del cliente bueno y malo, cita desde la web con el origen y el técnico forzados, acción repetida,
permisos y cancelar. Y desde la vista previa, en un navegador de verdad: los huecos libres y el enlace del cliente, con
su llave y con una inventada. Entrar con código desde una página publicada queda para Oscar. La noche del 14-11, ya con
la función en la versión 5, la zona del cliente desde la base de datos (con `pg_net`, sin navegador): un técnico no da
códigos, un teléfono sin avisos tampoco, la oficina recibe uno y al pedirlo otra vez el mismo, el cliente entra con él
(escrito en mayúsculas y con espacios) y recibe solo su aviso con su llave, con otro teléfono no vale, y al cambiarlo el
viejo deja de valer y el nuevo entra. El código de prueba (del aviso `VS-0001`) quedó dado de baja. Quedan en el servidor dos avisos de prueba de Voltio (`VS-0001` y `VS-0002`, con «Prueba de
Claude» por nombre).

El 15-11-2026, la función pasó a la versión 6, con las reglas `2026.11.15a` del commit `89edd8f` (la de
arriba): lo comprobado desde la base de datos con `pg_net` es que responde con esa versión. Las reglas nuevas que mira
el servidor: solo la oficina marca «Facturada», y un trabajo con cita o con algo añadido no se empieza sin la petición
del cliente. Los dos avisos de prueba de Voltio son de antes y siguen valiendo. Esa misma noche pasó a la versión 7, con las reglas `2026.11.15b` del commit `bf15cb2`: lo nuevo es el material que
falta, que el servidor deja apuntar solo a la oficina y al técnico del aviso, y que no sale en la página del cliente.
Comprobado igual, desde la base de datos: responde con esa versión.

Y esa madrugada, la versión 8, con las reglas `2026.11.15c` del commit `7afa18f`: los contratos de mantenimiento. El
juez los guarda en la cabecera del negocio (`contratos` y su contador `nc`), así que la base de datos no cambia, y solo
la oficina los recibe; el técnico sigue recibiendo solo `esq`. Comprobado desde la base de datos con `pg_net`: responde
con esa versión y da los huecos de Voltio leyendo sus avisos de verdad. Esa misma mañana, la versión 9, con las reglas
`2026.11.15d` del commit `9e08a26`: el técnico puede dar de alta un contrato desde su aviso en casa del cliente, y los
contratos solo viajan a la oficina cuando cambian (`vc` en la cabecera). Voltio ya lleva un plan en sus datos, en el
archivo y en `oficios.estados.datos` (comprobado que son el mismo texto, letra por letra). Desde la base de datos con
`pg_net`: la función responde con esa versión, da los huecos, y una cita pedida como cliente (`VS-0005`, «Prueba de
Claude») se guardó bien. Dar de alta un contrato con el servidor de verdad necesita entrar con un código: queda para la
prueba de Oscar.

Después, la versión 10, con las reglas `2026.11.15e` del commit `93cefa7`: la urgencia como extra (el suplemento va en el
presupuesto de partida de una urgencia) y los tiempos de llegada. Los huecos traen `urg: {de, a}`, los minutos en que se
llegaría ahora a una urgencia en el barrio que se pida (`dis`, y `av` para lo que tarda), o `null` si ahora no hay nadie
que pueda ir sin dejar tirada una cita ni salirse de su horario; nunca dicen quién va. Los datos de Voltio en el servidor
llevan ya su suplemento (25 €) y lo que tarda cada avería, iguales letra por letra al archivo. Comprobado desde la base
de datos: responde con esa versión, y los huecos de Voltio para Ciutat Vella dan `urg` con los avisos de verdad. Y la versión 11,
con las reglas `2026.11.15f` del commit `b06734f`: a igual tiempo de llegada, va quien menos trabajos lleva hoy. Y la
versión 12, con las reglas `2026.11.15g` del commit `846eb54`: lo que tarda cada servicio del catálogo cuenta en lo que dura
un trabajo; los datos de Voltio en el servidor llevan ya lo que tarda cada servicio y su servicio de la base, iguales letra
por letra al archivo. Y la versión 13, con las reglas `2026.11.15h` del commit `df16fa5`: el día de cada técnico
(a qué hora llega a cada trabajo) y la urgencia a quien aún llega dentro de la franja de sus citas; así el tiempo de
llegada que da el servidor a quien pide una urgencia cuenta también con eso. Y la versión 14, con las reglas `2026.11.15i` del commit `e6761f3`:
las citas por lo que tarda cada trabajo; los huecos que da el servidor miran la avería y el barrio que manda la página, y
los datos de Voltio en el servidor ya llevan `citas.porTiempo` (iguales letra por letra al archivo). Y la versión 15, con las reglas `2026.11.15j` del
commit `cf2290f`: con citas por tiempo, una cita que ya existe va en su sitio al mirar si cabe, y al cambiarla de franja
se compara con su día sin ella (lo encontró la demo «en uso»). Y la versión 16, con las reglas `2026.11.15k` del commit `50bb60d`: las
revisiones de un contrato repartidas por su año, la reserva para urgencias que el dueño puede no guardar los días que
falta alguien, y la visita en la que no había nadie, que queda apuntada (quién fue y cuándo) para el tablero. Y la versión 17, con las reglas `2026.11.15l`
del commit `64cda6a`: los mensajes de después del trabajo (seguimiento, presupuesto sin respuesta, cuándo toca volver),
«descartar» y «escribir» (quien no quiere estos mensajes); el alta de un contrato solo toca los avisos de su cliente.

De la versión 18 a la 21, lo nuevo de cada una está en su commit (`git log -- funcion/index.ts`). El 17-11-2026, la
versión 22, con las reglas `2026.11.17a` del commit `150c8e4`: el idioma de cada cliente. Comprobado desde la base de
datos con `pg_net`: responde con esa versión y da los huecos de Voltio. **Preparado y sin pasar a Supabase** (se pasa con
Oscar delante, porque Supabase pide que lo confirme en la pantalla): `vivos` ya no trae la `vista` de cada aviso, que el
juez no lee (un 11 % menos en cada acción, medido con los 436 avisos de la copia «en uso»), y `olvidar_cliente` sube
«vc» (en `oficios-mantenimiento/esquema.sql`). Los dos, probados en un Postgres local: `pruebas-almacen.sql` 37 de 37 y
`pruebas.sql` 28 de 28. La función no cambia: el juez de ahora funciona con el `vivos` de antes y con el nuevo.

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
10. **La zona del cliente con sus facturas**: hoy enseña presupuestos, partes y garantías. Las facturas llegarán cuando
   Oscar decida cómo se hacen (un proveedor de Verifactu o el programa de facturas de cada negocio).
