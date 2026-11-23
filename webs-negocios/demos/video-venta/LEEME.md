# El vídeo de venta de OOOX Oficios

Un minuto y 24 segundos (1920×1080, 30 fotogramas por segundo, con música): la web, la cita, la oficina, el técnico,
el precio firmado, los papeles, los cobros y «lo adaptamos a tu forma de trabajar». Está en la demo
(`frontend/public/demos/ramirez-24h/assets/video/`) con su página, `video.html`.

No lleva nada generado con IA: las pantallas son las de la demo de verdad, sacadas a una hora fija, y lo demás
(móviles, flechas, el dedo, los textos, la firma que se dibuja) lo pinta `escenario.html`. La música también se hace
aquí (`musica.py`), sin muestras de nadie.

- `captura.py`: las pantallas de la app (móvil de 390×844 a 3x), los papeles y la web, y dónde cae cada botón (`cajas.json`).
- `escenario.html`: las diez escenas. Cada escena es una función del tiempo, así que cualquier fotograma sale igual siempre.
- `render.py`: dibuja cada escena fotograma a fotograma (JPEG) y se los pasa a ffmpeg; un archivo por escena.
  `fotos` saca fotogramas sueltos para mirarlos antes (`0@2.2` es la escena 0 a los 2,2 s); `portada`, la portada.
- `musica.py`: acordes, punteo de cuerda, bajo, algo de ritmo y el sonido de cada toque.
- `hacer.sh`: todo de una vez y deja el vídeo, su portada y la imagen del correo en la demo.

Si cambia la app, `bash hacer.sh` lo rehace con las pantallas nuevas. Si cambian los tiempos de una escena, hay que
ponerlos también en `hacer.sh` (los toques de la música).
