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
python3 entrada.py ramirez-h.json
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
| `cola` | Fotogramas finales del clip en los que todo funde hacia la foto final (23) |
| `nitidez` | Enfoque suave de lo que se mueve (0,6) |
| `crf` | Calidad de H.264 (25,5 ≈ 2,8 MB para 5,5 s) |

Las rutas son relativas a la carpeta del archivo de configuración.
`ramirez-h.json` lleva las rutas del PC: allí esta carpeta está en
`OOOX\02-Business\webs-negocios\assets\ramirez\build\entrada-video\`.

## Qué comprobar siempre

1. El mensaje de encaje de cada foto debe pasar de 0,97. Si no, la foto no es la del clip.
2. La hoja de control: una sola furgoneta, nadie aparece de la nada, el final es la foto final.
3. En la web: el vídeo arranca con el primer gesto, acaba en el fotograma del portal y vuelve al
   principio al subir (`prueba` de siempre con Playwright).

## Receta en Flow (probada el 13-11-2026 con Ramírez)

- Vídeo · **Fotogramas** · primer fotograma = foto de llegada, último = foto final.
- Modelo **Omni 1.2 Flash**, 8 s. A 360p cuesta 8 puntos; a 720p, 24. Con este script el de 360p basta.
  Veo 3.1 Fast (20 puntos) metió una segunda furgoneta y cambios raros en el horizontal.
- Petición que funcionó (se adapta a cada negocio):

  > Use the first image as the opening frame and the second image as the closing frame. One
  > continuous static shot from a locked-off camera, no cuts, no zoom. The single small yellow
  > plumber's van parked far down the wet street starts moving, drives toward the camera and parks in
  > the foreground on the left, exactly where it stands in the closing frame. It is the only vehicle:
  > no other cars or vans appear at any moment. The plumber, a bareheaded man with short grey hair
  > (no cap, no hat at any moment), gets out, carries his yellow toolbox to the building entrance and
  > stops there, facing the camera. Night, wet cobblestones with reflections. Quiet street ambience
  > only, no music, no speech.

- Las dos fotos deben compartir encuadre y luz: cuanto más se parezcan, más limpio sale el clip.
- Para bajar el clip: en Chrome, botón «Descargar contenido multimedia» → «Tamaño original», con un
  clic de verdad y **una descarga por pestaña** (la segunda descarga automática de una misma pestaña
  se queda esperando un permiso de Chrome que no se ve). «Resolución mejorada» pide plan de pago: no.

## Lo que se publicó de Ramírez

- Horizontal: Omni 1.2 Flash a 360p + este script (`ramirez-h.json`). 5,47 s, 2,8 MB.
- Vertical: Veo 3.1 Fast a 720p, sin pasar por `entrada.py`: `ramirez-v-veo.sh` lo corta a 30 fps con la
  cola acelerada (da el mismo archivo, byte a byte). 5,03 s, 2,4 MB.
  En ese clip llega una segunda furgoneta por la derecha; pendiente de rehacerlo con Omni 1.2 Flash
  y la misma petición (foto de llegada `llega-v.jpg`, final `finalV2.jpg`).

Los originales (clips y fotos) están en el PC, en
`OOOX\02-Business\webs-negocios\assets\ramirez\originales\flow-2026-11-13\`.
