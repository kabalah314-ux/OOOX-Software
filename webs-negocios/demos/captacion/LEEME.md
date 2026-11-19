# Captación de OOOX Oficios: la muestra con el nombre de cada negocio

Para el primer contacto con un negocio de la lista (17-11-2026). La idea de Oscar: «te he preparado algo con el nombre
de tu negocio». La forma, con lo que enseña Isra Bravo: parar la atención en la primera línea, hablar de él y no de
nosotros, directo y sin necesidad, corto, y seguir sin pesadez.

**En frío, papel; el WhatsApp y el correo, después.** La ley no deja mandar publicidad por correo ni por WhatsApp a quien
no la ha pedido, tampoco a empresas (LSSI, art. 21), y WhatsApp bloquea los números que escriben a desconocidos. Las
llamadas en frío también están limitadas desde 2023 (pregunta para el abogado). Por eso el orden es: pasar la lista por la
Lista Robinson → carta con el código QR de su muestra (o visita) → él escribe por WhatsApp desde la muestra → la
conversación y dos seguimientos. Detalle y fuentes en la guía, pestaña «Captación».

## Qué hay aquí

- `textos.py`: la carta, la llamada, el WhatsApp, el correo (texto y HTML), los asuntos y los dos seguimientos. Y, si
  Oscar decide escribir sin contacto previo, tres correos en frío: el primero sin enlace ni imagen y pidiendo permiso
  («¿Te la mando?»), con la primera línea sacada de su ficha (nota, reseñas, urgencias, web); el segundo a los 4 días y
  el último a los 10, y nada más. Más las respuestas cortas a «¿cuánto cuesta?», «ya tenemos programa», etc. La escena del
  principio cambia según el oficio (fontanería, electricidad, climatización, cerrajería o general).
- `portada.html`: la imagen de cada negocio (1200×630): «Preparado para» + su nombre, y su web de citas, la oficina y el
  técnico en tres móviles, con su nombre en cada uno.
- `muestra.py`: saca todo para un negocio. Pone su nombre en la demo de Ramírez (sin tocar la demo: cambia los datos al
  vuelo), fotografía las tres pantallas y deja `portada.jpg`, `correo.html`, `correo.jpg` y `textos.txt`.

```
python3 muestra.py --negocio "Fontanería Serra" --categoria Fontanería --persona Jordi --zona "Sants, Barcelona" \
  --enlace "<su demo>" --hasta "domingo 30" --nota 4.8 --resenas 127 --h24 si --web si \
  --out /tmp/captacion/serra
```

«Fontanería Serra» es un negocio inventado, para el ejemplo. El WhatsApp de Oscar (670 40 95 50) sale en la carta y en
la firma de los correos que van con permiso (los correos en frío no lo llevan): está en `textos.py` (`WHATSAPP`) y es el
mismo al que lleva «Lo quiero para mi negocio» en la demo.

## La tanda de cartas (19-11-2026)

- **La demo con su nombre** ya está: el enlace lleva sus datos dentro (`prueba.html?m=…`: base64url de
  `{"v":1,"n":"<negocio>","t":"<teléfono>","d":"<dirección>","r":<nota de Google>,"c":<reseñas>,"b":"<distrito>","h":"<hasta>"}`),
  sin guardar nada en ningún servidor ni aquí. Arriba, siempre: «Muestra de OOOX para …: no es su web, es una demo con
  clientes inventados, hasta el …», con «Me interesa» (el WhatsApp de Oscar con su nombre ya escrito). Caducada, a más de
  90 días o mal hecha, es la demo de siempre. Solo en la demo (sin servidor).
  - La cita y la app (`js/oficio-estado.js`, «muestraDe»): su nombre, su teléfono y su dirección.
  - Su web (`index.html`, el guion «LA MUESTRA CON EL NOMBRE DE UN NEGOCIO»): su nombre en todo (título, cabecera,
    garantía, WhatsApp), su teléfono, «Taller: <su dirección>», su nota y sus reseñas de Google de verdad (sin ellas, esa
    línea no sale), los minutos del mapa contados desde su distrito, la furgoneta de la entrada y la foto del final sin el
    rótulo del negocio de ejemplo (`assets/entrada-[hv]-liso.mp4`, `assets/img/fin-[hv]-liso.webp`), y sin la foto ni las
    reseñas inventadas del fundador.
  - La página de los tres móviles: sin el fundador y «Volver a la web de <su nombre>».
  - Prueba: `pruebas-navegador/muestra_enlace.py`. El enlace es de ooox.es: hasta que se publique la demo nueva, el QR
    abre la versión de antes.
- `tanda.py` saca de la lista (en la carpeta de Oscar, nunca aquí) los primeros de cada zona de Barcelona, sin la
  centralita de las decenas de fichas «Fontanero <barrio>» (teléfonos 93694…), y deja `cartas.pdf` (una carta A4 por
  negocio: «Querido equipo de …», la foto de su web de citas con su nombre y el QR de su muestra, que se comprueba
  leyéndolo), `sobres-C5.pdf` (su sobre impreso, con su nombre y su dirección) y `hoja.csv` (una fila por carta, en el
  mismo orden, para apuntar la visita, el permiso y los seguimientos). El distrito sale de las coordenadas de su ficha de
  Google Maps (el punto más cercano de los diez distritos):

```
python3 tanda.py --lista PIPELINE-oficios-lista-larga.csv --contactos PIPELINE-oficios-contactos.csv --out <carpeta> --max 40 --hasta 2026-12-20
```

Lo que queda antes de mandarlas: pasar la lista por la Lista Robinson (las de autónomos) y publicar la demo.
