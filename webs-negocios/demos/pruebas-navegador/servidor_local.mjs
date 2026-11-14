// Un servidor local para probar las pantallas en modo servidor: el MISMO juez que el de verdad (oficios-servidor/juez.mjs)
// con un almacén en memoria. No sale nada a internet y cada vez que arranca está vacío.
//
// Uso: node servidor_local.mjs <carpeta de la app> <puerto> [--datos <archivo de datos de otro negocio>]
//
// Sirve la carpeta tal cual, menos js/oficio-datos.js: le pone «servidor» apuntando aquí, lo traiga o no. Así cualquier
// copia se puede probar con servidor sin tocar sus archivos y sin que la prueba llegue nunca al servidor de verdad.
//
// Lo mismo que el servidor de verdad:      POST /functions/v1/oficio      GET /functions/v1/oficio
//                                          POST /rest/v1/rpc/oficios_v    POST /rest/v1/rpc/oficios_vista
// Solo para las pruebas, bajo /__prueba/:  negocio, codigos, estado, cuenta (GET) · reloj, persona, red, pierde (POST)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leeNucleo, leeNegocio } from '../pruebas-reglas/valida-negocio.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2);
const carpeta = path.resolve(args[0] || '.'), puerto = Number(args[1] || 8768), iDatos = args.indexOf('--datos');
const archivoDatos = iDatos >= 0 ? path.resolve(args[iDatos + 1]) : path.join(carpeta, 'js/oficio-datos.js');
const DIR = [process.env.OFICIOS_SERVIDOR, path.join(aqui, '../../oficios-servidor'), path.join(aqui, '../../servidor')].filter(Boolean).map(d => path.resolve(d)).find(d => fs.existsSync(path.join(d, 'juez.mjs')));
if (!DIR) { console.error('No encuentro el juez (oficios-servidor/juez.mjs).'); process.exit(2); }
const { crea } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
const { creaAlmacen } = await import(pathToFileURL(path.join(DIR, 'almacen-memoria.mjs')).href);
const K = leeNucleo(carpeta), N = leeNegocio(archivoDatos).N;

let desfase = 0, red = 'va', lento = 0, pierde = 0;
const ahora = () => Date.now() + desfase;
const A = creaAlmacen({ ahora }), J = crea({ K, almacen: A, ahora, aviso: e => console.error('juez:', e) });
/* un código por persona, con la misma forma que los de verdad: 16 letras y números en cuatro grupos */
const CODIGOS = { oficina: 'ofic-ina0-prue-ba01' };
N.tecnicos.forEach((t, i) => { CODIGOS[t.id] = 'tecn-ico' + String(i + 1) + '-prue-ba0' + String(i + 2); });
A.alta(N.id, N, K.ESQ); A.persona(N.id, 'oficina', 'centralita', 'oficina', CODIGOS.oficina);
N.tecnicos.forEach(t => A.persona(N.id, t.id, 'tecnico', t.id, CODIGOS[t.id]));
const cuenta = { hacer: 0, leer: 0, entrar: 0, pedir: 0, huecos: 0, ver: 0, version: 0, oficios_v: 0, oficios_vista: 0, perdidas: 0, cortadas: 0 };

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
const CAB = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, apikey, authorization, x-client-info', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'cache-control': 'no-store' };
const json = (res, x, estado = 200) => { const b = JSON.stringify(x); res.writeHead(estado, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(b) }, CAB)); res.end(b); };
const cuerpo = req => new Promise(si => { let t = ''; req.on('data', d => { t += d; if (t.length > 2e6) req.destroy(); }); req.on('end', () => si(t)); req.on('error', () => si('')); });
const espera = ms => new Promise(si => setTimeout(si, ms));
const crudo = () => A.crudo(N.id);

async function api(req, res, ruta) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CAB); return res.end(); }
  if (red === 'cae') { cuenta.cortadas++; return req.socket.destroy(); }   // como si no hubiera cobertura: la llamada no llega
  if (lento) await espera(lento);
  if (ruta === '/functions/v1/oficio') {
    if (req.method === 'GET') { cuenta.version++; return json(res, { ok: true, oficio: { reglas: K.VERSION, commit: 'local' } }); }
    if (req.method !== 'POST') return json(res, { ok: false, err: 'peticion' }, 405);
    let p = null; try { p = JSON.parse(await cuerpo(req)); } catch (e) { p = null; }
    if (p && typeof p === 'object' && !Array.isArray(p)) { p.red = String(req.headers['x-prueba-red'] || 'local'); if (cuenta[p.que] != null) cuenta[p.que]++; }
    const r = await J.atiende(p);
    /* la respuesta se pierde: el servidor ya ha hecho lo que se le pidió, pero el aparato no se entera */
    if (pierde > 0 && p && p.que === 'hacer') { pierde--; cuenta.perdidas++; return req.socket.destroy(); }
    return json(res, r);
  }
  if (req.method !== 'POST') return json(res, { message: 'solo POST' }, 405);
  if (!req.headers.apikey) return json(res, { message: 'No API key found in request' }, 401);
  let c = {}; try { c = JSON.parse(await cuerpo(req)) || {}; } catch (e) { c = {}; }
  if (ruta === '/rest/v1/rpc/oficios_v') { cuenta.oficios_v++;
    const e = await A.entra(String(c.p_negocio), String(c.p_persona), String(c.p_codigo), 'local');
    return json(res, e === 'bloqueo' ? { ok: false, err: 'bloqueo' } : e ? { ok: true, v: (A.crudo(String(c.p_negocio)) || { v: 0 }).v } : { ok: false, err: 'clave' }); }
  if (ruta === '/rest/v1/rpc/oficios_vista') { cuenta.oficios_vista++;
    const v = typeof c.p_llave === 'string' && c.p_llave.length >= 20 ? await A.vista(String(c.p_negocio), String(c.p_aviso), c.p_llave) : null;
    return json(res, v ? { ok: true, vista: v } : { ok: false, err: 'enlace' }); }
  return json(res, { message: 'no existe' }, 404);
}

async function prueba(req, res, ruta) {
  const que = ruta.slice('/__prueba/'.length); let c = {};
  if (req.method === 'POST') { try { c = JSON.parse(await cuerpo(req)) || {}; } catch (e) { c = {}; } }
  if (que === 'negocio') return json(res, N);
  if (que === 'codigos') return json(res, CODIGOS);
  if (que === 'cuenta') return json(res, cuenta);
  if (que === 'estado') { const n = crudo(); return json(res, { v: n.v, cab: n.cab, avisos: [...n.avisos.values()].map(f => Object.assign({}, f.datos, { foto: f.datos.foto ? '(foto)' : '', fotos: (f.datos.fotos || []).map(() => '(foto)') })).sort((a, b) => a.n - b.n), llaves: Object.fromEntries([...n.avisos.values()].map(f => [f.id, f.llave])), diario: n.diario.map(x => ({ v: x.v, q: x.q, tipo: x.accion.tipo, id: x.accion.id || '', clave: x.clave })) }); }
  if (que === 'reloj') { desfase = Number(c.desfase) || 0; return json(res, { ok: true, ahora: ahora() }); }
  if (que === 'red') { red = c.modo === 'cae' ? 'cae' : 'va'; lento = Math.max(0, Number(c.lento) || 0); return json(res, { ok: true, red, lento }); }
  if (que === 'pierde') { pierde = Math.max(0, Number(c.n) || 0); return json(res, { ok: true, pierde }); }
  if (que === 'persona') { const p = crudo().personas.get(String(c.persona)); if (!p) return json(res, { ok: false }, 404);
    if (typeof c.codigo === 'string') p.codigo = c.codigo; return json(res, { ok: true }); }
  return json(res, { ok: false, err: 'no existe' }, 404);
}

/* el archivo de datos, con el servidor apuntando aquí y preguntando a menudo, para que las pruebas no esperen */
const datos = () => fs.readFileSync(archivoDatos, 'utf8') + "\n;window.OFICIO_NEGOCIO.servidor={url:location.origin,llave:'llave-publica-de-prueba',cada:300};\n";

http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  Promise.resolve().then(() => {
    if (ruta.startsWith('/functions/v1/') || ruta.startsWith('/rest/v1/')) return api(req, res, ruta);
    if (ruta.startsWith('/__prueba/')) return prueba(req, res, ruta);
    if (ruta === '/js/oficio-datos.js') { const b = datos(); res.writeHead(200, { 'content-type': TIPOS['.js'], 'cache-control': 'no-store' }); return res.end(b); }
    const f = path.join(carpeta, ruta.endsWith('/') ? ruta + 'index.html' : ruta);
    if (!f.startsWith(carpeta) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('No existe'); }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
  }).catch(e => { console.error(e); try { json(res, { ok: false, err: 'servidor' }, 500); } catch (x) { /* nada */ } });
}).listen(puerto, '127.0.0.1', () => console.log('Servidor local de pruebas: ' + N.nombre + ' (' + N.id + ') en http://127.0.0.1:' + puerto + '/ · reglas ' + K.VERSION));
