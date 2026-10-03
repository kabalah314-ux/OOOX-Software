# OOOX Software — Portfolio web (PRD)

## Problema original
Repo `https://github.com/kabalah314-ux/OOOX-Software`. El usuario (español) va pasando correcciones de UI/UX e iteramos. Frontend React + Vite + Tailwind 4; backend FastAPI boilerplate sin uso. Datos de proyectos mockeados en `src/data/mock.js`.

## Objetivo actual
Mejorar lo que se muestra de cada proyecto con **mini-vídeos que se reproducen al pasar el cursor** (hover) mostrando lo más relevante del proyecto. El usuario pasa los links uno a uno. Con ~4 vídeos en total basta.

## Implementado
- 2026-06 · Entorno: `package.json` script `start: vite --host 0.0.0.0 --port 3000`, `vite.config.ts` `allowedHosts: true` (adaptaciones locales del preview).
- 2026-06 · `HoverVideo.jsx` (`components/site/`): poster + `<video muted loop playsInline>` que arranca al hover / al entrar en pantalla (móvil). `data-testid="hover-video"`.
- 2026-06 · `SelectedWork.jsx`: si `p.video` existe se usa HoverVideo en la tarjeta. `CaseStudy.jsx`: mockup de navegador con el vídeo en autoplay.
- 2026-06 · `mock.js` → `usain-bot.video = { src: "/videos/usain-bot-3d.mp4", poster: "/videos/usain-bot-3d.jpg", label }`.
- 2026-06 · Vídeo **Usain Bot** sustituido por la grabación real del usuario (62 s → 29,5 s: turbo por la ciudad, gasolinera, taller Tito Tuercas, conducción; crop 848×382; 3 MB). El render offline anterior queda solo como herramienta (`offline.py`).
- 2026-06 · Vídeo **Áurea** (subido, 57 s tour 3D → 31 s en 3 tramos; crop 848×380 (fuente muy panorámica 2,23:1, en la tarjeta 16/10 se recortan los laterales); 1,3 MB). `mock.js` → `casa-aurea.video`.
- 2026-06 · Vídeo **MassFlow** (subido, 2:30 → 32,5 s en 6 tramos: dashboard, reservas, clientes, servicios, agente IA, finanzas; 0,65 MB). `mock.js` → `massflow.video`. Script reutilizable `/app/scripts/montar_video.py <src> <nombre> <crop|none> <poster_s> start:dur ...` (corta, aplica crop, xfade 0,5 s, crf 27, poster).
- 2026-06 · Vídeo **CrossIA** (subido por el usuario, 77 s → 39 s: explorar/hablar con el castor + laptop IA generando la app + recompensa + tienda; crop bandas negras 848×408; 1,4 MB) en `public/videos/crossia.mp4` + poster. `mock.js` → `crossia.video` (sigue como `placeholder: true`, tarjeta no clicable).
- 2026-06 · Vídeo **Elementia** (subido por el usuario, 50 s → recortado a 32,7 s: combate + victoria + mercado/criatura; crop 28 px arriba para quitar la barra del navegador; 848×420, 0,8 MB) en `public/videos/elementia.mp4` + poster. `mock.js` → `elementia.video`.
- 2026-06 · Vídeo **Usain Bot 3D Sandbox** (17,5 s, 960×600, 3,8 MB) en `frontend/public/videos/`. Sólo el juego 3D (los minijuegos 2D no importan, según el usuario).

## Cómo se generan los vídeos (importante)
El preview no tiene GPU: el juego Three.js va a ~0,15 fps con SwiftShader, imposible grabar en tiempo real.
Solución en `/app/scripts/offline.py`: Playwright + `add_init_script` que (1) fuerza `preserveDrawingBuffer`, (2) sustituye `performance.now`/`Date.now`/`requestAnimationFrame` por un reloj virtual a 15 fps controlado desde Python (`__step()`), (3) engancha `__THREE_DEVTOOLS__` para acceder a la escena (teletransportar al jugador: `scene.children[2].position.set(x,0.1,z)` en Usain Bot). Comandos vía `/app/scripts/cmd.txt` (`hold w`, `release w`, `press Space`, `rec N`, `skip N`, `shot`, `js …`, `mark`, `quit`). Frames en `/app/scripts/frames/`, ~3 s/frame.
`/app/scripts/build_clip.sh` monta los frames (minterpolate 15→30 fps, xfade entre escenas, libx264). Reencode final `-crf 28` para ~4 MB.
Localizaciones útiles en Usain Bot: puerta mansión (-60,128), parque/estatua (0,-112), zona comercial (90,-5).
Herramientas: `pip install playwright imageio-ffmpeg` + `python -m playwright install chromium` (ffmpeg binario de imageio-ffmpeg).

## Pendiente / Backlog
- P0: Vídeos hover para los demás proyectos (el usuario pasará los links): Elementia (aún no acabado — posponer), CrossIA, Áurea, MOOG, MassFlow. Objetivo ~4 vídeos.
- P1: Revisar peso/carga de vídeos (lazy `preload="metadata"` ya puesto); añadir versión webm si hace falta.
- P2: Correcciones UI/UX que vaya indicando el usuario.
