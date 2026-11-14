# Pruebas en el navegador de la demo de Ramírez (OOOX Oficios)

Se ejecutan con Python y Playwright contra una copia local del sitio (`frontend/public/demos/ramirez-24h/`),
en el motor que se elija con `NAVEGADOR=chromium|firefox|webkit`. Lo normal es pasarlo todo de una vez:

    bash ../pruebas.sh navegador      (o `todo`, que añade las reglas)

A mano, una a una:

```
cd frontend/public/demos/ramirez-24h
python3 -m http.server 8765 &                                   # sin trozos, como la vista previa de Cloudflare
python3 ../../../../webs-negocios/demos/pruebas-navegador/servidor_con_rangos.py . 8766 &   # con trozos, como ooox.es
python3 ../../../../webs-negocios/demos/pruebas-navegador/app.py 8765
python3 ../../../../webs-negocios/demos/pruebas-navegador/web.py 8765
python3 ../../../../webs-negocios/demos/pruebas-navegador/entrada.py
node ../../../../webs-negocios/demos/prueba-oficio.mjs .        # las reglas, sin navegador
```

| Archivo | Qué prueba | Último resultado |
|---|---|---|
| `prueba-oficio.mjs` (una carpeta más arriba) | Las reglas: tarifa, festivos, IVA, precio (con 1.000 presupuestos al azar), permisos, pasos, citas, horarios y ausencias, lo que puede la oficina y lo que no (hueco de urgencias, margen de dos horas), canales, garantía, mensajes, el mapa (quién manda la posición, cuándo, que solo quede la última y que se borre) y los apellidos | 273 bien |
| `app.py` | Cliente, centralita y técnico: cada pantalla y botón, errores, texto raro que no se ejecuta, fotos, dos pestañas, teclado, anchos de 320 a 1440 px, etiquetas y nombres, datos estropeados, modo privado, sin conexión, y los apellidos (que se piden y que se rellenan con el teléfono) | 222 bien |
| `web.py` | La web: archivos, idiomas, la hora de Barcelona en 12 momentos (web y app dicen lo mismo), desglose de cada avería, barrio, menú, metadatos, 9 tamaños de pantalla, y la página de los tres móviles | 60 bien |
| `entrada.py` | El vídeo de entrada con y sin trozos, en ordenador y en móvil (con el dedo y con la rueda), lento y sin vídeo. Sin esperas fijas | 42 bien |
| `muestra.py` | La muestra se rehace sola a las 8 horas, y «Reiniciar» | 7 bien |
| `reloj.py` | No es una batería: pone la hora fija que ven las demás | — |
| `webkit_linux.py` | No es una batería: tolera, solo en WebKit, una página pintada que no da la carga por terminada | — |
| `negocio.py <datos.js>` | La app entera con los datos de otro negocio, de la cita al cobro, y que no quede rastro del negocio de muestra en 15 pantallas. Mira también que el botón de cada técnico diga lo mismo que la regla: quién puede ir y, si no, por qué | Voltio 36 bien · Ramírez 33 bien · la copia de Voltio, servida desde su carpeta, 35 bien |
| `horarios.py` | Horarios, turnos y ausencias en pantalla: el cliente ve solo huecos reales y marca otras franjas que le van bien; la oficina pone citas en el hueco de urgencias y con menos de dos horas, y no puede forzarlas donde no cabe; «Equipo» (quién trabaja, qué lleva, «No viene»), los avisos de arriba (sobran, por reasignar, por confirmar) y un negocio sin horarios. Cada cosa en pantalla se compara con lo que dicen las reglas | 76 bien |
| `mapa.py <datos-de-un-negocio-sin-mapa.js>` | El mapa: el técnico comparte su posición desde «Voy» hasta que llega y el cliente la ve en su página. Las nueve teselas de alrededor y ninguna otra, la firma del mapa, de cuándo es la posición, que solo se guarde la última, «Dejar de compartir», lo que ve la oficina, el móvil que no da permiso, un negocio sin mapa de fondo y un negocio sin mapa. El móvil y las teselas son de mentira: no sale nada a internet | 40 bien |
| `soporte.py <datos-de-otro-negocio.js>` | La sección «Mejoras» de la oficina: pedir algo a OOOX, ver el estado y la respuesta, novedades y baja de ofertas, sin conexión (se guarda y sale sola), lo que viaja y lo que no (ningún dato de los clientes), texto raro que no se ejecuta, teclado, y la copia de un negocio de verdad con su código de soporte. El servidor es de mentira y sigue las reglas del de verdad | 69 bien |
| `buzon_falso.py` | No es una batería: hace que ningún navegador de las pruebas salga a internet, ni al buzón de OOOX ni al servidor de los avisos | — |
| `servidor_local.mjs <carpeta> <puerto> [--datos <otro.js>]` | No es una batería: un servidor local con el MISMO juez que el de verdad y un almacén en memoria. Sirve la carpeta y le pone «servidor» apuntando a sí mismo. Tiene puertas solo para pruebas (`/__prueba/…`): poner la hora, mirar lo guardado, retirar un código, cortar la red, perder una respuesta | — |
| `servidor.py [puerto]` | El modo servidor con la oficina, dos técnicos y un cliente, cada uno en su navegador: entrar con código (malo, de otro, con mayúsculas), crear, asignar y que le llegue al técnico, sin cobertura con un rechazo, el servidor caído y la app recargada, una respuesta perdida, la cita del cliente con foto, su enlace con y sin llave, dos pestañas, segundo plano, código retirado y cerrar sesión | 77 bien. Se pasa con la plantilla y con cada copia que lleve servidor |

## Motores

En el contenedor de trabajo solo hay Chromium. Firefox y WebKit corren en GitHub con cada cambio
(`.github/workflows/pruebas-oficios.yml`). El 14-11-2026 de madrugada pasan los tres: 618 comprobaciones de pantallas en cada uno (398 de la app y la web, 35 de la copia de Voltio servida desde su carpeta, 76 de horarios, 40 del mapa y 69 de «Mejoras»).

- **WebKit no es Safari.** Es el mismo motor, pero en Linux lee el vídeo con otras piezas y a ratos no lo consigue
  (en la misma máquina, unas veces sí y otras no). Por eso, en WebKit, lo que depende de la posición del vídeo
  **avisa y no cuenta como fallo**; lo que cuenta es que la página llegue a la bienvenida, vuelva arriba y no se
  atasque. El vídeo en Safari se da por bueno en un iPhone de verdad, con el guion de la guía (pestaña «Plan de pruebas»).
- **WebKit no tiene rueda en modo móvil.** En móvil el gesto de la prueba es un dedo, que es como entra un teléfono.
- **La versión de Playwright está fija** en el flujo de GitHub. Para subirla: cambiar el número, mirar que los tres
  motores pasan y dejarlo.
- **Sin esperas fijas.** Cada paso espera a que la página llegue a su estado, con un tope. Una prueba que falla a
  ratos se arregla o se quita el mismo día: no se deja «a ver si mañana pasa».
- **La hora es fija.** Todas las baterías de pantallas (menos la del vídeo, que no depende de la hora) ven siempre
  un martes laborable a las 10:30, hora de Madrid (`AHORA=2026-11-17T10:30:00+01:00`; lo pone `reloj.py`). Antes usaban
  la hora real, y el 13-11-2026 a las 20:10 falló en los tres motores una comprobación que daba por hecha la tarifa de día:
  habría fallado todas las noches, los fines de semana y los festivos.
- **La app se repite a otras horas** (`HORAS` en `pruebas.sh`), para que un fallo de noche no se esconda: con cada cambio,
  un sábado de noche y el cruce de fin de año; cada noche, a siete (viernes y sábado de noche, festivo, fin de año,
  cambio de hora y los dos bordes de la tarifa). El 13-11-2026 pasan las 220 en las ocho.
- **No se usa el reloj falso de Playwright** (`clock.install`). Cambia también los temporizadores del navegador y, en
  WebKit, hacía que a ratos una página no terminase de cargar o que lo tecleado llegase desordenado. `reloj.py` solo le
  suma un desfase a la hora que ve la página; el tiempo sigue corriendo y los temporizadores no se tocan.
- **Una pantalla que no carga no rompe la batería**: se cuenta como fallo y dice en qué estado se ha quedado.
- **WebKit, a ratos, no da una página por cargada** aunque esté pintada y funcione (una vez de cada varios cientos,
  en pantallas distintas, con y sin la hora cambiada; solo en ese motor). `webkit_linux.py` le espera 2,5 s y, si no
  llega, la prueba sigue y avisa diciendo qué faltaba. Si un día el aviso sale siempre en la misma pantalla o por lo
  mismo, deja de ser una rareza del motor y hay que mirarlo.

La demo pide iOS 15.4 o más nuevo (de marzo de 2022) por `dialog`, `BroadcastChannel` y `Array.at`.

Límite conocido de la demo: si dos pestañas actúan **casi a la vez**, una de las dos acciones se puede perder,
porque el estado se guarda en el navegador y una pestaña tarda unos milisegundos en ver lo que ha escrito la otra.
Con la máquina tranquila no pasa con 20 ms de diferencia. Con la máquina cargada (ocho navegadores a la vez), sí:
de 1 a 3 veces de cada 5. Por eso `app.py` comprueba lo que sí tiene que cumplirse siempre (una pestaña asigna, la
otra lo ve sola y entonces asigna ella: no se pierde nada) y mide aparte la carrera de 20 ms, que solo avisa.
En la fase 2 el orden lo pone el servidor.

## Añadido el 13-11-2026

- **`negocio.py <datos.js>`**: la misma app con los datos de otro negocio, de principio a fin (cliente, oficina y técnico), leyendo todo del archivo. Comprueba además que en ninguna pantalla queda rastro del negocio de muestra. Vale para cualquier copia.
- **Motor del navegador**: todas las baterías aceptan `NAVEGADOR=chromium|firefox|webkit`. En el contenedor de trabajo solo está Chromium; los tres motores corren en GitHub con cada cambio (`.github/workflows/pruebas-oficios.yml`).
- **`../pruebas.sh`**: lo pasa todo, arranca los dos servidores y sale con error si algún bloque falla. Las baterías ya devuelven error al fallar (antes solo lo escribían).
- Ya no existe el pack Básico: se han quitado sus comprobaciones.
- **`soporte.py` y `buzon_falso.py`** (13-11, noche): la sección «Mejoras». La app llama a un servidor de fuera (el buzón de OOOX, en Supabase); en las pruebas ese servidor no existe: `buzon_falso.py` cambia la manera de abrir cada navegador para que toda llamada al buzón la conteste un servidor de mentira («no hay nada»), y `soporte.py` pone el suyo, con memoria. Así las pruebas no dependen de internet ni dejan peticiones falsas en la base de datos de verdad. Las reglas del servidor de verdad se prueban aparte, en `webs-negocios/oficios-soporte/pruebas.sql`.
- **`horarios.py`** (13-11, noche): las pantallas de horarios. La demo lleva desde ese día horarios y turnos de prueba en su archivo de datos; las pruebas de reglas con ejemplos (`prueba-oficio.mjs`) siguen escritas para el negocio de muestra sin horarios (se los quitan al empezar) y miran la demo publicada en su última sección.
- **`mapa.py`** (13-11, noche): el mapa del cliente. El navegador de la prueba hace de móvil del técnico (dice dónde está y si da permiso) y las teselas las contesta la propia prueba, así que no depende de internet ni gasta el servidor de mapas de nadie.
- **Las copias pasan sus propias pruebas** (13-11, noche): `../pruebas.sh` mira `frontend/public/oficios/`. Cada copia tiene que ir al día con lo común (`copias.mjs comprueba`), pasa sus recorridos al azar y hace el recorrido de `negocio.py` **servida desde su propia carpeta**, no desde la demo: así se ve también si le falta algún archivo.
- **Dos cambios de dirección seguidos** (13-11, noche): WebKit falló una vez en GitHub en «Mejoras». La prueba salía de la pantalla y volvía a entrar con dos órdenes seguidas, y esperaba un formulario que ya estaba pintado de antes. Si el navegador avisa de los dos cambios cuando la dirección ya es la última, la app no ve ninguna entrada nueva y, con razón, no vuelve a pedir el buzón. No era un fallo de la app: a mano no se puede tocar dos veces tan deprisa. Ahora `soporte.py` espera a que la otra pantalla esté pintada antes de volver, y `horarios.py` no sigue hasta que la app ha pintado la pantalla nueva. Regla para las pruebas que vengan: después de cambiar de pantalla, esperar algo que **no** estuviera ya en la anterior.

## Añadido el 14-11-2026: el modo servidor

- `pruebas.sh` arranca `servidor_local.mjs` en el puerto 8768 y pasa `servidor.py`: una vez con los archivos de la
  plantilla y los datos de Voltio, y otra con cada copia que tenga `servidor` en sus datos, servida desde su carpeta.
- Una copia con servidor pasa además `negocio.py` como antes: la batería le quita `servidor` al vuelo (sin tocar el
  archivo) para recorrer la app entera sin él. Así se prueban sus datos y nunca se llama al servidor de verdad.
- Cada página cuenta sus llamadas (`__n`): con eso se comprueba que en segundo plano no pregunta, que si no cambia
  nada solo pide la versión, y que nada ha intentado salir hacia `supabase.co`.
- Para repetir a mano: `node servidor_local.mjs <carpeta> 8768 --datos ../pruebas-reglas/negocios/voltio.js` y, en otra
  terminal, `python3 servidor.py 8768`. Los códigos de prueba están en `http://127.0.0.1:8768/__prueba/codigos`.
- Lo que encontró la primera pasada: al echar a alguien (código retirado), la pantalla de entrar volvía con
  «Centralita» elegida y había que acordarse de cambiarla. Ahora recuerda quién usó ese aparato la última vez.
- Lo que encontró GitHub y no el ordenador de pruebas (14-11-2026): en Chromium, más lento allí, el último paso caía
  justo cuando la app repinta la pantalla cada minuto. La pantalla de entrar se repintaba y volvía a «Centralita» con
  el código borrado; al entrar, «ese código no es el de esa persona». Le habría pasado a cualquiera que tardase un
  minuto en escribir su código. Ahora lo elegido y lo escrito se guardan según se teclea, y si la pantalla ya está
  puesta no se toca. La prueba lo fuerza: repinta a medio escribir y mira que no se pierde nada.
