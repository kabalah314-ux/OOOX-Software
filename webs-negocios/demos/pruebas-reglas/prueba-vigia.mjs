// Pruebas del vigía de fallos (js/oficio-vigia.js), sin navegador y sin red: qué limpia, qué junta, cuándo manda,
// qué guarda en el aparato si no hay red y que nunca mira nada más del aparato.
// Los casos de limpieza son los mismos que pasa el servidor (webs-negocios/oficios-mantenimiento/pruebas.sql):
// la app y el servidor tienen que limpiar igual.
// Uso: node prueba-vigia.mjs <carpeta del sitio>
import fs from 'node:fs'; import path from 'node:path';
const sitio = process.argv[2] || '.';
const g = {}; new Function('globalThis', fs.readFileSync(path.join(sitio, 'js/oficio-vigia.js'), 'utf8').replace("typeof globalThis!=='undefined'?globalThis:this", 'globalThis'))(g);
const V = g.OficioVigia;
let ok = 0; const mal = [];
const es = (c, t) => { if (c) ok++; else { mal.push(t); console.log('  MAL ', t); } };

// ---------- 1. limpiar: lo mismo que el servidor ----------
export const CASOS = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'vigia-casos.json'), 'utf8'));
for (const [entra, sale] of CASOS) { const r = V.limpia(entra, 300); es(r === sale, 'limpia: «' + entra + '» → «' + r + '» (tenía que ser «' + sale + '»)'); }
{ const l = V.limpia('ab '.repeat(200), 300).length; es(l <= 300 && l >= 299, 'limpia corta a lo que se pide'); }
es(V.limpia(null, 300) === '' && V.limpia(undefined) === '', 'limpia sin nada da vacío');

// ---------- 2. la pantalla: solo el primer trozo de la ruta ----------
es(V.pantallaDe('#/aviso/R-0012/abcdefghjkmnpqrstuvwxyza') === 'aviso', 'pantalla de un enlace de aviso');
es(V.pantallaDe('#/entra/600000112/abcd-efgh') === 'entra', 'pantalla de la entrada del cliente: sin teléfono ni código');
es(V.pantallaDe('') === '' && V.pantallaDe('#') === '' && V.pantallaDe('#/') === '', 'sin ruta, sin pantalla');
es(V.pantallaDe('#/Bandeja') === 'bandeja', 'pantalla en minúsculas');
es(V.aparato('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1') === 'iPhone · Safari', 'aparato: iPhone');

// ---------- 3. el vigía con un servidor de mentira ----------
const almacen = () => { const m = new Map(), leidas = new Set(); return { m, leidas, getItem: k => { leidas.add(k); return m.has(k) ? m.get(k) : null }, setItem: (k, v) => { leidas.add(k); m.set(k, String(v)) }, removeItem: k => { leidas.add(k); m.delete(k) } }; };
function servidor() {
  const S = { modo: 'bien', llamadas: [] };
  S.fetch = (url, x) => {
    S.llamadas.push({ url, x, c: JSON.parse(x.body) });
    if (S.modo === 'sinred') return Promise.reject(new TypeError('Failed to fetch'));
    if (S.modo === 'caido') return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) });
    if (S.modo === 'nofuncion') return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    if (S.modo === 'malo') return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({}) });
    if (S.modo === 'baja') return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: false, err: 'negocio' }) });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, n: JSON.parse(x.body).p_lote.length }) });
  };
  return S;
}
let reloj = 1_800_000_000_000; const relojes = [];
const ctx = { negocio: 'voltio', pagina: 'app', pantalla: 'aviso', version: '2026.11.16a', aparato: 'iPhone · Safari', rol: 'tecnico', servidor: null };
const nuevo = (o = {}) => { const S = o.S || servidor(), A = o.A || almacen(); const c = Object.assign({}, ctx, o.ctx || {});
  return { S, A, c, v: V.crea({ fetch: S.fetch, almacen: A, ahora: () => reloj, programa: (f, ms) => { relojes.push({ f, ms }); return relojes.length }, contexto: () => c }) }; };
const espera = () => new Promise(r => setTimeout(r, 0));

{ // lo repetido va junto y con su cuenta; la tanda sale a los 2,5 s
  const { S, v } = nuevo(); relojes.length = 0;
  v.nota('js', 'TypeError: x is undefined', 'pinta@https://a.pages.dev/app.html:441:23'); v.nota('js', 'TypeError: x is undefined', 'pinta@https://a.pages.dev/app.html:441:23');
  v.nota('js', 'TypeError: x is undefined', 'pinta@https://a.pages.dev/app.html:441:23');
  es(v.pendientes().length === 1 && v.pendientes()[0].n === 3, 'tres veces el mismo fallo: uno con n = 3');
  es(relojes.length === 1 && relojes[0].ms === 2500, 'un solo envío programado, a los 2,5 s');
  await v.vacia(); es(S.llamadas.length === 1, 'una llamada');
  const c = S.llamadas[0].c, l = c.p_lote[0];
  es(c.p_negocio === 'voltio' && Array.isArray(c.p_lote) && c.p_lote.length === 1, 'lleva el negocio y la tanda');
  es(l.n === 3 && l.tipo === 'js' && l.pagina === 'app' && l.pantalla === 'aviso' && l.version === '2026.11.16a' && l.aparato === 'iPhone · Safari' && l.rol === 'tecnico', 'lleva página, pantalla, tipo, versión, aparato y papel');
  es(!('neg' in l) && !('srv' in l), 'en la tanda no va nada más');
  es(S.llamadas[0].url === 'https://glsmahzpvzabeeucyqif.supabase.co/rest/v1/rpc/oficios_error' && S.llamadas[0].x.headers.apikey.startsWith('sb_publishable_'), 'va al servidor de OOOX con la clave pública');
  es(S.llamadas[0].x.keepalive === false, 'sin «keepalive» mientras la página sigue abierta');
}
{ // lo que se manda va limpio, aunque la app pase un teléfono o un enlace con llave
  const { S, v } = nuevo();
  v.nota('consola', 'No se pudo llamar al 600 00 01 12 desde https://a.pages.dev/cita.html#/aviso/R-0012/qwertyuiopasdfghjkzxcvbn', 'at https://a.pages.dev/cita.html?x=1#/aviso/R-1/qwertyuiopasdfghjkzxcvbn:12:5');
  await v.vacia(); const l = S.llamadas[0].c.p_lote[0];
  es(!/600/.test(l.mensaje) && !/qwerty/.test(l.mensaje) && !/qwerty/.test(l.pila) && !/x=1/.test(l.pila), 'ni el teléfono ni la llave ni la parte de después del enlace');
  es(/cita\.html:12:5/.test(l.pila), 'la posición sí');
}
{ // como mucho 20 fallos distintos por página; las tandas, de 10 en 10
  const { S, v } = nuevo();
  for (let i = 0; i < 25; i++) v.nota('js', 'Fallo número ' + i, '');
  es(v.pendientes().length === 20, 'como mucho 20 distintos por página');
  await v.vacia(); es(S.llamadas.length === 2 && S.llamadas[0].c.p_lote.length === 10 && S.llamadas[1].c.p_lote.length === 10, 'en dos tandas de 10');
  es(v.nota('js', 'Fallo número 3', '') === true && v.nota('js', 'Fallo número 22', '') === false, 'uno ya visto sigue contando; uno nuevo pasado el tope, no');
}
{ // después de mandar, lo que se repite espera al menos 30 s para la siguiente tanda
  const { v } = nuevo(); relojes.length = 0;
  v.nota('js', 'Otro fallo', ''); await v.vacia(); reloj += 1000; v.nota('js', 'Otro fallo', '');
  es(relojes.length === 2 && relojes[1].ms >= 28000, 'la siguiente tanda, no antes de 30 s');
  es(v.pendientes()[0].n === 1, 'y vuelve a contar desde 1');
}
{ // sin red: se guarda en el aparato (solo su clave) y sale la próxima vez
  const S = servidor(), A = almacen(); S.modo = 'sinred';
  let x = nuevo({ S, A }); x.v.nota('promesa', 'Algo falló', ''); const n = await x.v.vacia();
  es(n === 1 && JSON.parse(A.m.get(V.GUARDADO)).length === 1, 'sin red: queda guardado');
  es([...A.leidas].every(k => k === V.GUARDADO), 'en el aparato solo toca su propia clave');
  S.modo = 'bien'; x = nuevo({ S, A }); const n2 = await x.v.vacia();
  es(n2 === 0 && !A.m.has(V.GUARDADO) && S.llamadas.at(-1).c.p_lote[0].mensaje === 'Algo falló', 'la vez siguiente sale y se borra');
}
{ // servidor caído (5xx) o sin la función (404): se guarda; contesta que no (negocio de baja) o la petición es mala: no se insiste
  for (const [modo, guarda] of [['caido', true], ['nofuncion', true], ['baja', false], ['malo', false]]) {
    const S = servidor(), A = almacen(); S.modo = modo; const { v } = nuevo({ S, A }); v.nota('js', 'Fallo ' + modo, ''); await v.vacia();
    es(A.m.has(V.GUARDADO) === guarda, modo + (guarda ? ': se guarda para luego' : ': no se guarda'));
  }
}
{ // como mucho 20 guardados: los más viejos se van
  const S = servidor(), A = almacen(); S.modo = 'sinred';
  for (let i = 0; i < 3; i++) { const { v } = nuevo({ S, A }); for (let j = 0; j < 9; j++) v.nota('js', 'Fallo ' + i + '-' + j, ''); await v.vacia(); }
  const l = JSON.parse(A.m.get(V.GUARDADO)); es(l.length === 20 && l.at(-1).mensaje === 'Fallo 2-8', 'guarda los 20 últimos');
}
{ // sin negocio no se sabe de quién es: ni se manda ni se guarda
  const S = servidor(), A = almacen(); const { v } = nuevo({ S, A, ctx: { negocio: '' } }); v.nota('js', 'Sin negocio', ''); await v.vacia();
  es(S.llamadas.length === 0 && !A.m.has(V.GUARDADO), 'sin negocio: nada');
}
{ // un negocio con su propio servidor lo manda allí; varios negocios en el mismo aparato, cada uno a lo suyo
  const S = servidor(), A = almacen();
  const a = nuevo({ S, A, ctx: { negocio: 'otro', servidor: { url: 'https://otro.supabase.co/', llave: 'sb_publishable_otro' } } }); a.v.nota('js', 'Del otro', '');
  await a.v.vacia(); es(S.llamadas[0].url === 'https://otro.supabase.co/rest/v1/rpc/oficios_error' && S.llamadas[0].x.headers.apikey === 'sb_publishable_otro', 'con su servidor y su clave');
  S.modo = 'sinred'; const b = nuevo({ S, A, ctx: { negocio: 'voltio' } }); b.v.nota('js', 'De voltio', ''); await b.v.vacia();
  const c = nuevo({ S, A, ctx: { negocio: 'ramirez' } }); c.v.nota('js', 'De ramirez', ''); S.modo = 'bien'; S.llamadas.length = 0; await c.v.vacia();
  es(S.llamadas.length === 2 && S.llamadas.map(x => x.c.p_negocio).sort().join() === 'ramirez,voltio', 'lo guardado de otro negocio sale con el suyo');
}
{ // al cerrar la página: con «keepalive»
  const { S, v } = nuevo(); v.nota('js', 'Al cerrar', ''); await v.vacia(true); es(S.llamadas[0].x.keepalive === true, 'al cerrar, con keepalive');
}
{ // nunca rompe: un almacén roto o un fetch que lanza
  const A = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } };
  const S = { fetch() { throw new Error('roto') } };
  const v = V.crea({ fetch: S.fetch, almacen: A, ahora: () => reloj, programa: () => 1, contexto: () => ctx });
  let bien = true; try { v.nota('js', 'x', ''); await v.vacia(); } catch (e) { bien = false; }
  es(bien, 'con el aparato sin almacén y la red rota, no lanza');
  const v2 = V.crea({ fetch: S.fetch, almacen: almacen(), ahora: () => reloj, programa: () => 1, contexto: () => { throw new Error('x') } });
  es(v2.nota('js', 'x', '') === false, 'si no sabe el contexto, no apunta y no lanza');
}
{ // mensajes vacíos o que se quedan en nada al limpiar no se apuntan
  const { v } = nuevo(); es(v.nota('js', '', '') === false && v.nota('js', '   ', '') === false, 'sin mensaje, nada');
}
await espera();
console.log(mal.length ? `MAL: ${mal.length} de ${ok + mal.length}` : `BIEN: ${ok} comprobaciones del vigía de fallos`);
process.exit(mal.length ? 1 : 0);
