# Pruebas en el navegador de la demo de Ramírez (OOOX Oficios)

Se ejecutan con Python, Playwright y Chromium contra una copia local del sitio
(`frontend/public/demos/ramirez-24h/`).

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
| `prueba-oficio.mjs` (una carpeta más arriba) | Las reglas: tarifa, festivos, IVA, precio (con 1.000 presupuestos al azar), permisos, pasos, citas, garantía, mensajes | 159 bien |
| `app.py` | Cliente, centralita y técnico: cada pantalla y botón, errores, texto raro que no se ejecuta, fotos, pack Básico, dos pestañas, teclado, anchos de 320 a 1440 px, etiquetas y nombres, datos estropeados, modo privado, sin conexión | 220 bien |
| `web.py` | La web: archivos, idiomas, la hora de Barcelona en 12 momentos (web y app dicen lo mismo), desglose de cada avería, barrio, menú, metadatos, 9 tamaños de pantalla, y la página de los tres móviles | 60 bien |
| `entrada.py` | El vídeo de entrada con y sin trozos, en ordenador y móvil, lento y sin vídeo | 42 bien |
| `muestra.py` | La muestra se rehace sola a las 8 horas (conserva el pack), y «Reiniciar» | 8 bien |

Lo que no se puede probar aquí: Safari (iPhone) y Firefox, porque solo hay Chromium. La demo pide iOS 15.4
o más nuevo (de marzo de 2022) por `dialog`, `BroadcastChannel` y `Array.at`.

Límite conocido de la demo: si dos pestañas actúan **en el mismo milisegundo**, una de las dos acciones
se puede perder, porque el estado se guarda en el navegador. Con 5 ms de diferencia ya no pasa (probado 15
veces a 5, 20, 50 y 150 ms). En la fase 2 el orden lo pone el servidor.
