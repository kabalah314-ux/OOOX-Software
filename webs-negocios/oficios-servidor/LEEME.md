# El servidor de OOOX Oficios (fase 2)

Hoy cada navegador guarda sus avisos. El servidor hace que la oficina, los técnicos y el cliente vean lo mismo desde
aparatos distintos. El diseño para Oscar, con lo que cuesta y los pasos, está en la guía, pestaña «El servidor»:
https://claude.ai/artifact/AHLx7anfXkAhZUVP51FyrY

**Estado a 14-11-2026: está hecho y probado el juez (el núcleo). Falta el almacén de verdad, la función de Supabase y
que la app hable con él.** Nada de esto está desplegado ni lo usa todavía ninguna pantalla.

## Las piezas

| Archivo | Qué es | Estado |
|---|---|---|
| `juez.mjs` | El juez: la única puerta por la que cambia un aviso. Comprueba quién es, pasa la acción por las mismas reglas que la app (`js/oficio-nucleo.js`) y guarda. No sabe de Supabase ni de internet | Hecho |
| `almacen-memoria.mjs` | Un almacén de mentira, en memoria, con el mismo contrato que el de verdad. Para las pruebas y para el servidor local de las pruebas de pantallas | Hecho |
| `almacen.sql` | Las tablas y funciones del almacén de verdad, en Supabase (apartado `oficios`) | Falta |
| `funcion/index.ts` | La función de Supabase que envuelve al juez con el almacén de verdad | Falta |
| `js/oficio-estado.js` (en la app) | Modo servidor: entrar con código, mandar cada acción al juez y ponerse al día | Falta |

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
| `pedir` | Cualquiera, desde la web | `negocio, accion` (solo `pedir`), `red`, `clave` | `id, llave` y nada más |
| `huecos` | Cualquiera | `negocio` | `dias: [{dia, hoy, franjas: [{id, ok}]}]`, sin cifras ni datos |
| `ver` | El cliente, con su enlace | `negocio, aviso, llave` | `vista` |

`cambios` es `{v, entero, cab, avisos}`. `entero:true` quiere decir «tira lo que tengas y quédate con esto». La oficina
recibe todos los avisos y la cabecera (contadores y ausencias); un técnico, solo los avisos que lleva y los `fuera`.

Errores propios del juez: `clave` (código malo, persona o negocio que no existe, negocio de baja: todos contestan lo
mismo), `bloqueo` (diez códigos fallados en diez minutos), `accion`, `grande`, `permiso` (por la puerta de la web solo
se puede pedir), `limite`, `enlace`, `negocio`, `lleno`, `peticion` y `servidor`. Los demás son los de las reglas.

## El contrato del almacén

Ocho funciones. Devuelven siempre copias.

| Función | Qué hace |
|---|---|
| `negocio(id)` | `{id, activo, datos, v, cab}` o nada. `datos` es el archivo de datos del negocio; `cab`, `{esq, n, nu, ausencias}` |
| `entra(negocio, persona, codigo)` | `{rol, id}`, nada, o `'bloqueo'`. Cuenta los códigos fallados |
| `vivos(negocio)` | Los avisos con los que trabajan las reglas: `[{id, v, datos, de, llave, vista}]`. Hoy son todos; cuando pesen, se archivan los cerrados antiguos |
| `hecha(negocio, clave)` | El resultado guardado de una acción con esa marca, o nada |
| `guarda(negocio, vAntes, {v, cab, avisos, diario})` | Guarda todo de una vez, solo si la versión sigue siendo `vAntes`. `{ok}` |
| `cambios(negocio, desde)` | `{v, cab, avisos}` con los avisos cambiados después de esa versión |
| `vista(negocio, aviso, llave)` | Lo que ve el cliente, si la llave es la de ese aviso |
| `tope(negocio, clave, max, ventana)` | Frena abusos: `true` si aún cabe |

## Lo que falta, en orden

1. **`almacen.sql`**: tablas `avisos`, `personas`, `diario` y `topes` en el apartado `oficios`, y los datos y la versión
   de cada negocio. Las funciones del juez, solo para la función de Supabase. Dos lecturas públicas que no pasan por el
   juez, porque las llamadas a la base de datos no tienen límite: `oficios_cambios` (con código) y `oficios_vista` (con
   la llave). Tienen que recortar igual que `paraQuien`; se prueban con las mismas leyes.
2. **La función `oficio`**: `juez.mjs`, `oficio-nucleo.js` y el almacén de verdad. Le pasa al juez `red`, una huella de
   la conexión, para el freno de la web.
3. **La app**: en `oficio-estado.js`, cuando los datos del negocio traen `servidor`. `Oficio.hacer` sigue contestando
   al momento: aplica la regla en el aparato, manda la acción al juez y, cuando contesta, se queda con lo del servidor.
   Solo «pedir» espera la respuesta, porque el número del aviso lo pone el servidor. Pregunta por cambios cada 2 s con
   la app en pantalla.
4. **Servidor local para las pruebas de pantallas**, con este mismo juez, y pruebas con tres navegadores a la vez.
5. **`copias.mjs`**: dar de alta el negocio en el servidor, con sus datos y un código por persona.

## Pruebas

En el repositorio, `bash webs-negocios/demos/pruebas.sh reglas` las pasa con todo lo demás.

- `pruebas-reglas/prueba-juez.mjs`: ejemplos escritos a mano. 53.
- `pruebas-reglas/azar-juez.mjs`: dos negocios, once aparatos cada tanda, acciones al azar, otros aparatos que se
  adelantan entre que el juez lee y guarda, y acciones mandadas dos veces. Tras cada paso: el diario se puede repetir,
  cada aparato al día tiene lo que le toca, un técnico no recibe nada ajeno, los enlaces abren solo su aviso.
  9.000 pasos y 1,29 millones de comprobaciones.
- `pruebas-reglas/mutantes-juez.mjs`: se quita adrede cada protección del juez y se mira que alguna prueba lo note.
  34 de 34.
