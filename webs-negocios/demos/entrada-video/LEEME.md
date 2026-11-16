# Vídeo de entrada (la portada en vídeo)

`entrada.py` convierte un clip de IA hecho **entre dos fotos** (primer y último fotograma, cámara fija)
en el vídeo de portada de una web: nítido y sin saltos al empezar ni al acabar.

Desde el 16-11-2026 la web de Ramírez lo **reproduce sola al abrirse** (3,4 s: la furgoneta llega, el
técnico baja y se planta delante) y se queda en la portada con la bienvenida encima. Antes lo movía
el scroll con el primer gesto; para eso sigue valiendo el mismo script con `"clave": 8`.

## Por qué hace falta

Los clips de «fotogramas a vídeo» salen blandos (sobre todo a 360p, que es lo que dan los puntos
gratis), con el fondo «respirando» y con los rótulos deformados. Pero la cámara está quieta, así que
casi toda la imagen es la misma que en las dos fotos, que sí son nítidas. El script usa las fotos para
todo lo que no se mueve y el vídeo solo para lo que se mueve y para la luz.

## Cómo se usa

```
python3 entrada.py ramirez-h.json      (o ramirez-v.json, el vertical)
```

Necesita `ffmpeg`, `numpy` y `opencv`. Tarda unos 2 minutos. Deja, junto a la ruta de `salida`:

- `<salida>.mp4`: H.264, una clave cada `clave` fotogramas (8 por defecto), arranque rápido, color etiquetado.
- `<salida>-poster.jpg`: el primer fotograma (la foto de llegada, encajada).
- `<salida>-final.png`: el último fotograma (la foto final, encajada). De ahí sale `assets/img/fin-<o>.webp`,
  la portada quieta que se ve si la entrada se salta, si el vídeo no llega o con movimiento reducido:
  es el mismo encuadre que el último fotograma, así que no salta al cambiar.
- `<salida>-hoja.jpg`: hoja de control para mirarlo de un vistazo.

La portada quieta para la web: `python3 -c "from PIL import Image; Image.open('salida/entrada-v-final.png').save('fin-v.webp', quality=80, method=6)"` (y lo mismo con `h`).

## El archivo de configuración

| Campo | Qué es |
|---|---|
| `video` | El clip de Flow, tal como se descarga (360p o 720p) |
| `primera`, `ultima` | Las dos fotos con las que se generó el clip |
| `salida` | Ruta de salida sin extensión |
| `ancho`, `alto`, `fps` | Tamaño y fotogramas por segundo de la web (1280×720 o 720×1280, a 30) |
| `velocidad` | Ritmo por tramos: `[segundo del clip, velocidad]`. Con el clip a 24 fps y la salida a 30, **1.25 no repite ni salta fotogramas** |
| `rotulos` | Rectángulos `[x0, y0, x1, y1]` (con el lado corto del clip a 360 px) de rótulos que el vídeo deforma: en cuanto nada los tapa, se pone el de la foto |
| `rotulo_igual` | Parte del rótulo que tiene que estar ya como en el último fotograma para poner el de la foto (0,97). Si el rótulo del clip sigue «hirviendo» con la furgoneta ya parada, bajarlo (0,9 en el vertical de Ramírez) |
| `rotulo_espera`, `rotulo_rampa` | Fotogramas del clip que se espera con el rótulo ya en su sitio (3) y en los que entra el de la foto (6) |
| `cola` | Fotogramas finales del clip en los que todo funde hacia la foto final (23) |
| `cola_corta` | Si es menor que `cola`: lo que aún se mueve al final (el fontanero que todavía se coloca) espera y funde en estos últimos fotogramas, y lo quieto sigue fundiendo despacio. Así no se ven dos caras a la vez cuando el clip no acaba justo en la postura de la foto (10 en el vertical) |
| `nitidez` | Enfoque suave de lo que se mueve (0,6) |
| `crf` | Calidad de H.264 (25,5 ≈ 2,8 MB para 5,5 s con clave cada 8; ≈ 1,4–1,7 MB para 3,4 s con clave cada 60) |
| `clave` | Una clave cada tantos fotogramas: 8 si el scroll mueve el vídeo (saltar a cualquier punto); 60 si solo se reproduce (pesa menos) |

Las rutas son relativas a la carpeta del archivo de configuración.
`ramirez-h.json` y `ramirez-v.json` llevan las rutas del PC: allí esta carpeta está en
`OOOX\02-Business\webs-negocios\assets\ramirez\build\entrada-video\`.

## Qué comprobar siempre

1. El mensaje de encaje de cada foto debe pasar de 0,97. Si no, la foto no es la del clip.
2. Si hay rótulos, el mensaje «el de la foto desde el fotograma …». Si dice «OJO, no llega a entrar»,
   bajar `rotulo_igual`.
3. La hoja de control y recortes al 100 %: una sola furgoneta, nadie aparece de la nada, rótulo limpio
   y el final es la foto final.
4. En la web: el vídeo arranca solo al abrir, acaba en la portada con la bienvenida, un gesto mientras
   corre se lo salta y, sin vídeo o con movimiento reducido, sale la portada quieta
   (`pruebas-navegador/entrada.py`).

## En la página (16-11-2026)

- El vídeo se carga con `pon()` (web de Ramírez): antes pregunta al servidor si lo da por trozos y, si
  contesta con el archivo entero, usa ese archivo. Sin eso, en las vistas previas `*.pages.dev` el
  iPhone no lo reproduce. En ooox.es el vídeo sí llega por trozos.
- Se reproduce sin sonido (`muted playsinline`), una vez. Mientras corre no hay nada encima, solo la
  cabecera; al acabar (`llega()`), el título, la hora de llegada, «¿Puede esperar?» y los botones.
- `llega()` también se dispara con cualquier gesto mientras corre (rueda, teclas, dedo, un toque o el
  tabulador: se la salta y se queda arriba), si el vídeo falla, si en 3,5 s no ha empezado (red lenta,
  ahorro de batería del iPhone) y al llegar con un enlace a una sección. Sin el vídeo terminado, quita
  el vídeo y deja la foto `fin-<o>.webp` como póster.
- Con movimiento reducido (y en las capturas, `?shot`) no hay vídeo: la portada quieta desde el principio.
- Si la pantalla gira después, se pone la portada de la otra orientación.
- Los últimos fotogramas van con más calidad que el resto (el vídeo se queda parado en el último).

## Receta en Flow (16-11-2026, la entrada que arranca sola)

- Fotos con **Nano Banana 2.1** (0 puntos), en Flow:
  - Portada: el técnico centrado delante de la furgoneta. Para dejarle el uniforme limpio, la portada
    como referencia y «Edit this exact photo: make the plumber's work clothes perfectly clean and neat…
    Keep everything else identical». Sale con el mismo encuadre.
  - Foto de llegada (la calle vacía): la portada como referencia, con su mismo formato, y «Edit this exact
    photo: remove the man and the yellow van completely, so the street is empty. Keep everything else
    identical: same camera position, same framing…». Encaja con la portada (diferencia media ≈ 2 en lo
    que no se mueve).
- Vídeo · **Fotogramas** · inicio = calle vacía, fin = portada. Modelo **Veo 3.1 - Lite**: 10 puntos por
  clip de 8 s a 720p (los gratis del día son 50). Omni 1.2 Flash a 720p cuesta 3 puntos por segundo.
- Petición del horizontal (salió bien a la primera):

  > Use the first image as the opening frame and the second image as the closing frame. One continuous
  > static shot from a locked-off camera: no cuts, no zoom, no camera movement. Night, wet cobblestone
  > street in Barcelona. A single yellow RAMIREZ 24H van enters fast from the right edge of the frame,
  > driving from right to left along the kerb, seen side-on, and brakes hard exactly where it is parked in
  > the closing frame. It is the only vehicle in the shot. Straight away the driver door opens, the
  > plumber jumps out with his yellow toolbox, leaves the door open and strides quickly straight towards
  > the camera, stopping in the exact centre of the frame, facing the camera with a friendly smile,
  > exactly as in the closing frame. Fast, energetic pace, realistic motion. Quiet street ambience only,
  > no music, no speech.

- En vertical se hicieron tres. Se quedó el primero, con esta petición:

  > Locked-off static camera, no camera movement, no cuts. Night, wet cobblestone street in Barcelona. A
  > yellow RAMIREZ 24H van speeds in fast from the right edge of the frame with its headlights on and
  > brakes hard at the kerb. At once the driver door swings open and the plumber jumps out with his
  > yellow toolbox, leaves the door open, and strides quickly and confidently straight towards the
  > camera, stopping in the exact centre of the frame, facing the camera with a friendly smile. Fast,
  > energetic pace, realistic motion, cinematic night lighting.

  En el segundo y el tercero (con la petición del horizontal y una variante) la furgoneta se acerca de
  frente y luego «se recoloca» en su sitio: se nota. En vertical la calle es estrecha y Veo tiende a
  traerla hacia la cámara. Gasto del día: 40 de los 50 puntos gratis (cuatro clips).
- Ritmo (`velocidad`): lo quieto del principio a ×3, la furgoneta a ×2, la frenada a ×1,5, el técnico a
  ×1,8 y la cola a ×5. De 7,9 s a 3,4 s.
- Para bajar los clips desde el navegador integrado: abrir el clip en Flow, leer la dirección del
  `<video>` y descargarlo con `fetch` → blob → `<a download>`; llega a Descargas (un rato como `.tmp`).

## Receta en Flow (probada el 13-11-2026 con Ramírez)

- Vídeo · **Fotogramas** · primer fotograma = foto de llegada, último = foto final.
- Modelo **Omni 1.2 Flash**, 8 s. A 360p cuesta 8 puntos; a 720p, 24. Con este script el de 360p basta.
  Veo 3.1 Fast (20 puntos) metió una segunda furgoneta y cambios raros en el horizontal.
- Petición que funcionó en horizontal (se adapta a cada negocio):

  > Use the first image as the opening frame and the second image as the closing frame. One
  > continuous static shot from a locked-off camera, no cuts, no zoom. The single small yellow
  > plumber's van parked far down the wet street starts moving, drives toward the camera and parks in
  > the foreground on the left, exactly where it stands in the closing frame. It is the only vehicle:
  > no other cars or vans appear at any moment. The plumber, a bareheaded man with short grey hair
  > (no cap, no hat at any moment), gets out, carries his yellow toolbox to the building entrance and
  > stops there, facing the camera. Night, wet cobblestones with reflections. Quiet street ambience
  > only, no music, no speech.

- En vertical (9:16, 14-11-2026) se usó esta, más explícita:

  > Use the first image as the opening frame and the second image as the closing frame. One
  > continuous static shot from a locked-off camera, no cuts, no zoom, no camera movement. The single
  > small yellow plumber's van parked far down the wet street on the left starts moving, drives toward
  > the camera along that same street and parks exactly where it stands in the closing frame. It is
  > the only vehicle in the whole shot: no other car or van enters from any side at any moment, and
  > the van never duplicates. The plumber, a bareheaded man with short grey hair (no cap, no hat at
  > any moment), gets out of that van, carries his yellow toolbox to the building entrance on the
  > right and stops there, facing the camera, exactly as in the closing frame. Night, wet
  > cobblestones with reflections. Quiet street ambience only, no music, no speech.

  Un segundo intento, que insistía en que el fontanero bajara de la furgoneta, lo hizo aparecer de
  golpe delante de ella: peor. Se quedó el primero. Como mucho dos intentos (16 puntos) por vídeo.
- Las dos fotos deben compartir encuadre y luz: cuanto más se parezcan, más limpio sale el clip.
- Para bajar el clip: en Chrome, botón «Descargar contenido multimedia» → «Tamaño original», con un
  clic de verdad y **una descarga por pestaña** (la segunda descarga automática de una misma pestaña
  se queda esperando un permiso de Chrome que no se ve). «Resolución mejorada» pide plan de pago: no.

## Lo que se publicó de Ramírez

- **Desde el 16-11-2026** (arranca sola): Veo 3.1 Lite a 720p + este script (`ramirez-h.json` y
  `ramirez-v.json`). 3,43 s cada uno; 1,67 MB el horizontal y 1,38 MB el vertical. Originales en el PC,
  en `OOOX\02-Business\webs-negocios\assets\ramirez\originales\flow-2026-11-16\` (con `REGISTRO.md`).

Hasta el 16-11-2026 (se movía con el scroll):

- Horizontal: Omni 1.2 Flash a 360p + este script (`ramirez-h-13-11.json`). 5,47 s, 2,8 MB. Con los valores
  por defecto, la versión de `entrada.py` del 14-11 lo deja igual (como mucho 4 niveles de diferencia
  en el rótulo, en 9 fotogramas).
- Vertical (14-11-2026): Omni 1.2 Flash a 360p + este script (`ramirez-v-14-11.json`). 5,53 s, 2,9 MB.
  Una sola furgoneta. Lo que queda: el fontanero no baja de la furgoneta, entra andando por la
  derecha, junto al portal.
- El vertical anterior (Veo 3.1 Fast a 720p, con una segunda furgoneta que llega por la derecha) se
  rehace igual, byte a byte, con `ramirez-v-veo.sh` y el clip `entrada-v-veo31fast.mp4`.

Los originales (clips y fotos) están en el PC, en
`OOOX\02-Business\webs-negocios\assets\ramirez\originales\flow-2026-11-13\` (el clip del vertical es
`entrada-v-omni12flash-360p-intento1.mp4`).
