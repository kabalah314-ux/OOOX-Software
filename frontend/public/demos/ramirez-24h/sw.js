/* OOOX Oficios · el «trabajador» de la app (service worker), para que abra sin cobertura (16-11-2026).
   Guarda lo de esta carpeta (páginas, estilos, scripts, imágenes y fuentes) cada vez que lo baja y, si no hay red, sirve lo
   guardado. Siempre prueba la red primero: con cobertura, todo llega nuevo, así que una versión nueva entra en cuanto hay red.
   No toca nada de fuera de esta carpeta (el servidor, los mapas), ni lo que no sea GET, ni nada que no sea un archivo.
   También abre el aviso al tocar una notificación de la app. */
const CAJA = 'oficio-1';
const BASE = new URL('./', self.location).href;   // la carpeta del negocio: aquí vive este archivo
const ARCHIVO = /\.(html|css|js|mjs|json|webmanifest|png|jpg|jpeg|webp|svg|ico|woff2?)$/i;
const PRIMERO = ['app.html', 'oficio.css', 'js/oficio-nucleo.js', 'js/oficio-datos.js', 'js/oficio-espejo.js', 'js/oficio-estado.js',
  'js/oficio-papeles.js', 'js/oficio-idioma.js', 'js/oficio-soporte.js', 'js/oficio-vigia.js', 'manifest.webmanifest'];

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
    const c = await caches.open(CAJA);
    try {
      const res = await fetch(r);
      if (res.ok && res.type === 'basic' && !(res.headers.get('content-type') || '').startsWith('video/')) c.put(clave, res.clone()).catch(() => null);
      return res;
    } catch (err) {
      const g = await c.match(clave); if (g) return g;
      throw err;
    }
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
