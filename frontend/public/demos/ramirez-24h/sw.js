/* OOOX Oficios · el «trabajador» de la app (service worker), para que abra sin cobertura (16-11-2026).
   Guarda lo de esta carpeta (páginas, estilos, scripts, imágenes y fuentes) cada vez que lo baja y, si no hay red, sirve lo
   guardado. Siempre prueba la red primero (hasta ESPERA ms): con cobertura, todo llega nuevo, así que una versión nueva entra en cuanto hay red.
   No toca nada de fuera de esta carpeta (el servidor, los mapas), ni lo que no sea GET, ni nada que no sea un archivo.
   También abre el aviso al tocar una notificación de la app. */
const CAJA = 'oficio-1';
const ESPERA = 3000;   // lo que se espera a la red antes de abrir con lo guardado (ms)
const BASE = new URL('./', self.location).href;   // la carpeta del negocio: aquí vive este archivo
const ARCHIVO = /\.(html|css|js|mjs|json|webmanifest|png|jpg|jpeg|webp|svg|ico|woff2?)$/i;
const PRIMERO = ['app.html', 'oficio.css', 'js/oficio-nucleo.js', 'js/oficio-datos.js', 'js/oficio-espejo.js', 'js/oficio-estado.js',
  'js/oficio-papeles.js', 'js/oficio-idioma.js', 'js/oficio-soporte.js', 'js/oficio-vigia.js', 'manifest.webmanifest',
  // el programa de la app, partido por pantallas (C3, 22-11-2026)
  'js/app/base.js', 'js/app/vistas/bandeja.js', 'js/app/vistas/aviso.js', 'js/app/vistas/furgo.js', 'js/app/vistas/aviso-ficha.js', 'js/app/vistas/hoy.js', 'js/app/vistas/agenda.js', 'js/app/vistas/equipo.js', 'js/app/vistas/cobros.js', 'js/app/vistas/nuevo.js', 'js/app/vistas/contratos.js', 'js/app/vistas/papel.js', 'js/app/vistas/mejoras.js', 'js/app/navegar.js', 'js/app/hojas/mensajes.js', 'js/app/entrar-y-avisos.js', 'js/app/hojas/equipo.js', 'js/app/hojas/web.js', 'js/app/hojas/aviso.js', 'js/app/acciones.js', 'js/app/eventos.js', 'js/app/arranque.js'];

self.addEventListener('install', e => {
  /* lo justo para abrir la app sin red; si algo falta (una copia sin algún archivo), se sigue igual */
  e.waitUntil(caches.open(CAJA).then(c => Promise.all(PRIMERO.map(f => fetch(BASE + f, { cache: 'reload' })
    .then(r => r.ok ? c.put(BASE + f, r) : null).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(L => Promise.all(L.filter(k => k.startsWith('oficio-') && k !== CAJA).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(BASE)) return;
  const u = new URL(r.url), ruta = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
  if (!ARCHIVO.test(ruta) || ruta.includes('/__')) return;
  const clave = u.origin + ruta;   // sin lo de después de «?»: app.html?papel=tecnico es la misma página
  e.respondWith((async () => {
    const c = await caches.open(CAJA), g = await c.match(clave);
    const red = fetch(r).then(res => {
      if (res.ok && res.type === 'basic' && !(res.headers.get('content-type') || '').startsWith('video/')) c.put(clave, res.clone()).catch(() => null);
      return res;
    });
    if (!g) return red;   // sin copia guardada no hay otra cosa que esperar: la red, sin prisa
    /* con copia: la red tiene ESPERA ms (21-11-2026). Con una raya de cobertura, la red no contesta ni falla: se queda colgada, y
       la app esperaba a que se rindiera. Pasado el tiempo se abre con lo guardado, y la red sigue su camino por detrás para que
       la próxima vez ya esté lo nuevo */
    e.waitUntil(red.catch(() => null));
    return Promise.race([red.catch(() => g), new Promise(fin => setTimeout(() => fin(g), ESPERA))]);
  })());
});
/* tocar una notificación: lleva a la app y abre ese aviso */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = e.notification.data && typeof e.notification.data.aviso === 'string' ? e.notification.data.aviso : '';
  const destino = BASE + 'app.html' + (id ? '#/aviso/' + encodeURIComponent(id) : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => {
    const w = L.find(x => x.url.startsWith(BASE + 'app.html'));
    if (w) { w.postMessage({ abre: id }); return w.focus(); }
    return self.clients.openWindow(destino);
  }));
});
