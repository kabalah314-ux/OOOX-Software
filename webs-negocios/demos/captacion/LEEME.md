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

## Lo que falta

1. **La demo con su nombre** (el enlace): un solo enlace por negocio que lleve sus datos dentro, para no guardar nada
   en ningún servidor ni en este repositorio. Con aviso arriba («Muestra preparada por OOOX para …; no es su web»),
   sin indexar y con fecha de caducidad.
2. **La tanda desde la lista** (`PIPELINE-oficios-lista-larga.csv`, en la carpeta de Oscar): un archivo por negocio y
   una hoja para apuntar llamadas, permisos y respuestas. La lista no entra nunca aquí: el repositorio es público.
