# Vídeo de entrada (la portada que se reproduce con un gesto)

`entrada.py` convierte un clip de IA hecho **entre dos fotos** (primer y último fotograma, cámara fija)
en el vídeo de portada de una web: nítido, sin saltos al empezar ni al acabar y listo para que el
scroll lo mueva.

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

- `<salida>.mp4`: H.264, una clave cada 8 fotogramas, arranque rápido, color etiquetado.
- `<salida>-poster.jpg`: el primer fotograma (la foto de llegada, encajada).
- `<salida>-hoja.jpg`: hoja de control para mirarlo de un vistazo.

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
| `crf` | Calidad de H.264 (25,5 ≈ 2,8 MB para 5,5 s) |

Las rutas son relativas a la carpeta del archivo de configuración.
`ramirez-h.json` y `ramirez-v.json` llevan las rutas del PC: allí esta carpeta está en
`OOOX\02-Business\webs-negocios\assets\ramirez\build\entrada-video\`.

## Qué comprobar siempre

1. El mensaje de encaje de cada foto debe pasar de 0,97. Si no, la foto no es la del clip.
2. Si hay rótulos, el mensaje «el de la foto desde el fotograma …». Si dice «OJO, no llega a entrar»,
   bajar `rotulo_igual`.
3. La hoja de control y recortes al 100 %: una sola furgoneta, nadie aparece de la nada, rótulo limpio
   y el final es la foto final.
4. En la web: el vídeo arranca con el primer gesto, acaba en el fotograma del portal y vuelve al
   principio al subir (`prueba` de siempre con Playwright).

## En la página

- El vídeo se carga con `pon()` (web de Ramírez): antes pregunta al servidor si lo da por trozos y, si
  contesta con el archivo entero, usa ese archivo. Sin eso, en las vistas previas `*.pages.dev` Chrome no
  deja saltar dentro del vídeo en la primera visita (el scroll no lo mueve) y el iPhone no lo reproduce.
  En ooox.es el vídeo sí llega por trozos.
- La página deja el vídeo parado 0,05 s antes del final: por eso los últimos fotogramas son iguales y
  llevan más calidad que el resto.

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

- Horizontal: Omni 1.2 Flash a 360p + este script (`ramirez-h.json`). 5,47 s, 2,8 MB. Con los valores
  por defecto, la versión de `entrada.py` del 14-11 lo deja igual (como mucho 4 niveles de diferencia
  en el rótulo, en 9 fotogramas).
- Vertical (14-11-2026): Omni 1.2 Flash a 360p + este script (`ramirez-v.json`). 5,53 s, 2,9 MB.
  Una sola furgoneta. Lo que queda: el fontanero no baja de la furgoneta, entra andando por la
  derecha, junto al portal.
- El vertical anterior (Veo 3.1 Fast a 720p, con una segunda furgoneta que llega por la derecha) se
  rehace igual, byte a byte, con `ramirez-v-veo.sh` y el clip `entrada-v-veo31fast.mp4`.

Los originales (clips y fotos) están en el PC, en
`OOOX\02-Business\webs-negocios\assets\ramirez\originales\flow-2026-11-13\` (el clip del vertical es
`entrada-v-omni12flash-360p-intento1.mp4`).
