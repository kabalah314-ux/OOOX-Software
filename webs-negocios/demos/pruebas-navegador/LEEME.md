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

| Archivo | Qué prueba | Resultado el 13-11-2026 |
|---|---|---|
| `prueba-oficio.mjs` (una carpeta más arriba) | Las reglas: tarifa, festivos, IVA, precio (con 1.000 presupuestos al azar), permisos, pasos, citas, horarios y ausencias, canales, garantía, mensajes | 214 bien |
| `app.py` | Cliente, centralita y técnico: cada pantalla y botón, errores, texto raro que no se ejecuta, fotos, dos pestañas, teclado, anchos de 320 a 1440 px, etiquetas y nombres, datos estropeados, modo privado, sin conexión | 220 bien |
| `web.py` | La web: archivos, idiomas, la hora de Barcelona en 12 momentos (web y app dicen lo mismo), desglose de cada avería, barrio, menú, metadatos, 9 tamaños de pantalla, y la página de los tres móviles | 60 bien |
| `entrada.py` | El vídeo de entrada con y sin trozos, en ordenador y en móvil (con el dedo y con la rueda), lento y sin vídeo. Sin esperas fijas | 42 bien |
| `muestra.py` | La muestra se rehace sola a las 8 horas, y «Reiniciar» | 7 bien |
| `reloj.py` | No es una batería: pone la hora fija que ven las demás | — |
| `webkit_linux.py` | No es una batería: tolera, solo en WebKit, una página pintada que no da la carga por terminada | — |
| `negocio.py <datos.js>` | La app entera con los datos de otro negocio, de la cita al cobro, y que no quede rastro del negocio de muestra en 15 pantallas. Mira también que el botón de cada técnico diga lo mismo que la regla: quién puede ir y, si no, por qué | Voltio 34 bien · Ramírez 31 bien |

## Motores

En el contenedor de trabajo solo hay Chromium. Firefox y WebKit corren en GitHub con cada cambio
(`.github/workflows/pruebas-oficios.yml`). El 13-11-2026 pasan los tres: 394 comprobaciones de pantallas en cada uno.

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

