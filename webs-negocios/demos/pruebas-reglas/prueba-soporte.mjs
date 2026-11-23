// Pruebas del buzón de mejoras (js/oficio-soporte.js), sin navegador y sin red: el servidor es de mentira y sigue las mismas
// reglas que el de verdad (webs-negocios/oficios-soporte/esquema.sql).
// Uso: node prueba-soporte.mjs <carpeta del sitio>
import fs from 'node:fs'; import path from 'node:path';
const sitio = process.argv[2] || '.';
const g = {}; new Function('globalThis', fs.readFileSync(path.join(sitio, 'js/oficio-soporte.js'), 'utf8').replace("typeof globalThis!=='undefined'?globalThis:this", 'globalThis'))(g);
const SOP = g.OficioSoporte;
let ok = 0; const mal = [];
const es = (c, t) => { if (c) ok++; else { mal.push(t); console.log('  MAL ', t); } };

// ---- un almacén y un servidor de mentira
const almacen = (roto) => { const m = new Map(); return { m, getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { if (roto && roto()) throw new Error('lleno'); m.set(k, String(v)); } }; };
function servidor() {
  const S = { red: true, estado: 200, lanza: false, cuelga: false, llamadas: [], pet: [], nov: [], sinOfertas: false, vistas: [], claves: { ramirez: 'DEMO', voltio: 'CLAVE-VOLTIO' }, demo: { ramirez: true }, n: 0, tope: 99 };
  S.fetch = (url, x) => {
    const fn = url.split('/').pop(), c = JSON.parse(x.body); S.llamadas.push({ fn, c, cab: x.headers, url });
    if (S.lanza) throw new Error('sin red');
    if (S.cuelga) return new Promise((si, no) => x.signal.addEventListener('abort', () => no(new Error('abortada'))));
    if (!S.red) return Promise.reject(new TypeError('Failed to fetch'));
    if (S.estado !== 200) return Promise.resolve({ ok: false, status: S.estado, json: () => Promise.resolve({}) });
    const r = d => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(d) });
    if (S.claves[c.p_negocio] !== c.p_clave) return r({ ok: false, err: 'clave' });
    const mias = () => S.pet.filter(p => p.negocio === c.p_negocio && (!S.demo[c.p_negocio] || p.remitente === c.p_remitente));
    if (fn === 'oficios_enviar') {
      if (!['fallo', 'mejora', 'duda'].includes(c.p_tipo)) return r({ ok: false, err: 'tipo' });
      const t = String(c.p_texto || '').trim(); if (t.length < 10 || t.length > 2000) return r({ ok: false, err: 'texto' });
      if (mias().length >= S.tope) return r({ ok: false, err: 'limite' });
      S.pet.push({ id: ++S.n, negocio: c.p_negocio, remitente: c.p_remitente, tipo: c.p_tipo, texto: t, quien: c.p_quien, estado: 'recibida', respuesta: null, creada: new Date(1e12 + S.n * 1000).toISOString() });
      return r({ ok: true, id: S.n });
    }
    if (fn === 'oficios_buzon') { if (c.p_vistas) S.vistas = c.p_vistas; return r({ ok: true, peticiones: mias().slice().reverse(), novedades: S.nov.filter(n => !(n.tipo === 'oferta' && S.sinOfertas)), sin_ofertas: S.sinOfertas, demo: !!S.demo[c.p_negocio] }); }
    if (fn === 'oficios_ofertas') { if (!S.demo[c.p_negocio]) S.sinOfertas = !c.p_quiere; return r({ ok: true, sin_ofertas: S.sinOfertas }); }
    return r({ ok: false, err: 'servidor' });
  };
  return S;
}
const buena = { tipo: 'fallo', texto: 'El botón de asignar no hace nada al tocarlo.', quien: 'Marta', pantalla: '#/aviso/R-0142' };
let reloj = 1_800_000_000_000;
const nuevo = (o = {}) => { const S = o.S || servidor(), A = o.A || almacen(o.roto); return { S, A, b: SOP.crea({ negocio: o.negocio || 'ramirez', demo: o.demo !== false, version: '2026.11.13', almacen: A, fetch: S.fetch, ahora: () => reloj, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', espera: o.espera }) }; };

// ---- 1. qué se da por bueno
{ const { b } = nuevo();
  es(b.valida(buena) === '', 'una petición normal vale');
  es(b.valida({ tipo: 'queja', texto: buena.texto }) === 'tipo' && b.valida({ texto: buena.texto }) === 'tipo' && b.valida(null) === 'tipo', 'sin tipo o con un tipo que no existe, no vale');
  es(b.valida({ tipo: 'constructor', texto: buena.texto }) === 'tipo' && b.valida({ tipo: 'toString', texto: buena.texto }) === 'tipo', 'una palabra rara como tipo, tampoco');
  es(b.valida({ tipo: 'duda', texto: 'corto' }) === 'texto' && b.valida({ tipo: 'duda', texto: '   nueve   ' }) === 'texto' && b.valida({ tipo: 'duda', texto: 'x'.repeat(2001) }) === 'texto', 'texto de menos de 10 letras o de más de 2.000, no vale');
  es(b.valida({ tipo: 'duda', texto: 'x'.repeat(2000) }) === '' && b.valida({ tipo: 'duda', texto: 'diez letra' }) === '', 'los bordes: 10 y 2.000 letras valen');
  es(b.valida({ tipo: 'duda', texto: 12345678901 }) === '' && b.valida({ tipo: 'duda', texto: 7 }) === 'texto' && b.valida({ tipo: 'duda' }) === 'texto', 'un texto que no es texto se mide igual y no rompe nada');
}
// ---- 2. lo que viaja
{ const { b, S } = nuevo(); const r = await b.enviar(buena), l = S.llamadas[0];
  es(r.ok && r.id === 1 && !r.enCola, 'con conexión, la petición sale y vuelve con su número');
  es(l.url === SOP.BUZON + 'oficios_enviar' && /^sb_publishable_/.test(l.cab.apikey) && l.cab['Content-Type'] === 'application/json', 'va a la función de enviar, con la clave pública');
  es(l.c.p_negocio === 'ramirez' && l.c.p_clave === 'DEMO' && l.c.p_tipo === 'fallo' && l.c.p_texto === buena.texto && l.c.p_quien === 'Marta' && l.c.p_pantalla === '#/aviso/R-0142', 'lleva el negocio, el tipo, el texto, quién y la pantalla');
  es(l.c.p_version === '2026.11.13' && l.c.p_aparato === 'iPhone · Safari' && typeof l.c.p_remitente === 'string' && l.c.p_remitente.length === 20, 'lleva la versión, el tipo de aparato y el remitente');
  es(Object.keys(l.c).sort().join() === 'p_aparato,p_clave,p_negocio,p_pantalla,p_quien,p_remitente,p_texto,p_tipo,p_version', 'y nada más: ningún otro dato sale del aparato');
  const r2 = await b.enviar({ tipo: 'mejora', texto: '   Quiero ver la semana entera de un vistazo.   ', quien: 'x'.repeat(90), pantalla: 'p'.repeat(300) }), l2 = S.llamadas[1];
  es(r2.ok && l2.c.p_texto === 'Quiero ver la semana entera de un vistazo.' && l2.c.p_quien.length === 60 && l2.c.p_pantalla.length === 120, 'el texto va sin espacios de sobra, y el nombre y la pantalla, cortados a su tamaño');
  const antes = S.llamadas.length; const r3 = await b.enviar({ tipo: 'duda', texto: 'corto' });
  es(!r3.ok && r3.err === 'texto' && S.llamadas.length === antes, 'lo que no vale ni siquiera sale del aparato');
}
// ---- 3. el código de soporte
{ const { b, S, A } = nuevo({ negocio: 'voltio', demo: false });
  es(b.codigo() === '', 'un negocio de verdad empieza sin código');
  const r = await b.enviar(buena); es(!r.ok && r.err === 'clave' && S.llamadas.length === 0, 'sin código no se manda nada');
  es(!b.ponCodigo('') && !b.ponCodigo('abc') && !b.ponCodigo('x'.repeat(81)) && !b.ponCodigo(null), 'un código vacío, muy corto o larguísimo no se guarda');
  es(b.ponCodigo('  mal-codigo  ') && b.codigo() === 'mal-codigo', 'el código se guarda sin espacios');
  const r2 = await b.enviar(buena); es(!r2.ok && r2.err === 'clave' && b.cola().length === 0, 'con un código malo el servidor lo rechaza y no se queda en la cola');
  b.ponCodigo('CLAVE-VOLTIO'); const r3 = await b.enviar(buena); es(r3.ok && r3.id === 1, 'con el código bueno, entra');
  const otro = nuevo({ negocio: 'voltio', demo: false, S, A }).b; es(otro.codigo() === 'CLAVE-VOLTIO', 'el código sigue ahí al volver a abrir la app');
  otro.olvidaCodigo(); es(otro.codigo() === '', 'y se puede olvidar');
  es(nuevo({ negocio: 'ramirez' }).b.codigo() === 'DEMO', 'la demo no pide código');
}
// ---- 4. sin conexión
{ const { b, S, A } = nuevo(); S.red = false;
  const r = await b.enviar(buena); es(r.ok && r.enCola && b.cola().length === 1, 'sin conexión, la petición se guarda en el aparato');
  const c = b.cache(); es(c.peticiones.length === 1 && c.peticiones[0].estado === 'en_cola' && c.peticiones[0].texto === buena.texto, 'y se ve en la lista como «sin enviar»');
  await b.enviar({ tipo: 'mejora', texto: 'La segunda, también sin conexión.' });
  const bz = await b.buzon(); es(!bz.ok && bz.err === 'red' && b.cola().length === 2, 'mientras no hay conexión, sigue todo guardado');
  const otro = nuevo({ S, A }).b; es(otro.cola().length === 2, 'también si se cierra y se vuelve a abrir la app');
  S.red = true; const bz2 = await otro.buzon();
  es(bz2.ok && otro.cola().length === 0 && S.pet.length === 2 && S.pet[0].texto === buena.texto && S.pet[1].texto.startsWith('La segunda'), 'al volver la conexión salen solas y en su orden');
  es(otro.cache().peticiones.length === 2 && otro.cache().peticiones.every(p => p.estado === 'recibida'), 'y pasan a «recibida»');
}
{ const { b, S } = nuevo(); S.estado = 503; const r = await b.enviar(buena); es(r.ok && r.enCola, 'si el servidor está caído (error 503), también se guarda'); }
{ const { b, S } = nuevo(); S.lanza = true; const r = await b.enviar(buena); es(r.ok && r.enCola, 'si la red falla de golpe, no se rompe: se guarda'); }
{ const { b, S } = nuevo({ espera: 40 }); S.cuelga = true; const t0 = Date.now(); const r = await b.enviar(buena); es(r.ok && r.enCola && Date.now() - t0 < 2000, 'si el servidor no contesta, se corta la espera y se guarda'); }
{ const { b, S } = nuevo(); S.red = false; for (let i = 0; i < 25; i++) await b.enviar({ tipo: 'duda', texto: 'petición de relleno número ' + i }); es(b.cola().length === 20 && b.cola()[19].texto.endsWith(' 24'), 'la cola guarda como mucho las 20 últimas'); }
{ const { b, S } = nuevo(); S.red = false; await b.enviar(buena); await b.enviar({ tipo: 'mejora', texto: 'Otra que espera su turno.' }); S.red = true; S.tope = 0;
  const q = await b.vaciar(); es(q === 2 && b.cola().length === 2, 'si el servidor dice «demasiadas», la cola espera y no pierde nada');
  S.tope = 99; es(await b.vaciar() === 0 && S.pet.length === 2, 'y sale en el siguiente intento');
}
// ---- 5. el buzón y lo que está sin leer
{ const { b, S, A } = nuevo(); await b.enviar(buena);
  S.nov = [{ id: 7, tipo: 'novedad', titulo: 'Agenda por técnico', texto: 'Ya puedes ver la semana de cada uno.', enlace: null, desde: '2026-11-13T10:00:00Z' }, { id: 8, tipo: 'oferta', titulo: 'Asistente de llamadas', texto: 'Pruébalo un mes.', enlace: 'https://ooox.es', desde: '2026-11-12T10:00:00Z' }];
  es(b.toca(60000) === true, 'la primera vez toca pedir el buzón');
  const r = await b.buzon(); es(r.ok && b.cache().novedades.length === 2 && b.cache().peticiones.length === 1 && b.toca(60000) === false, 'el buzón trae las peticiones y las novedades, y se queda guardado');
  reloj += 61000; es(b.toca(60000) === true, 'pasado un rato, toca volver a pedirlo'); reloj -= 61000;
  es(b.sinLeer() === 2, 'dos novedades sin leer; la petición recién enviada no cuenta');
  b.marcaVisto(); es(b.sinLeer() === 0, 'al abrir la sección, todo queda leído');
  S.pet[0].estado = 'mirando'; await b.buzon(); es(b.sinLeer() === 1 && S.vistas.join() === '7,8', 'si OOOX mueve una petición, vuelve a avisar; y el servidor sabe qué novedades se han visto');
  b.marcaVisto(); S.pet[0].respuesta = 'Lo arreglamos esta semana.'; await b.buzon(); es(b.sinLeer() === 1, 'una respuesta nueva también avisa');
  const otro = nuevo({ S, A }).b; es(otro.cache().peticiones[0].respuesta === 'Lo arreglamos esta semana.' && otro.sinLeer() === 1, 'lo guardado sirve sin conexión y al volver a abrir');
  es(b.sinVer().pet.join() === '1' && b.sinVer().nov.length === 0, 'se sabe cuál es la que está sin ver');
  const o1 = await b.ofertas(false); es(o1.ok && o1.sin_ofertas === true && b.cache().sin_ofertas && b.cache().novedades.length === 1 && b.cache().novedades[0].tipo === 'novedad', 'en la demo, «no quiero ofertas» las quita de la lista de este navegador');
  await b.buzon(); es(b.cache().novedades.length === 1 && S.sinOfertas === false, 'y siguen quitadas al volver a pedir el buzón, sin que el servidor guarde nada de la demo');
  const o2 = await b.ofertas(true); es(o2.ok && o2.sin_ofertas === false && b.cache().novedades.length === 2, 'y se puede volver a apuntar');
  b.marcaVisto(); S.nov = [S.nov[0]]; await b.buzon(); S.nov.push({ id: 8, tipo: 'oferta', titulo: 'Asistente de llamadas', texto: 'Pruébalo un mes.', enlace: null, desde: '2026-11-12T10:00:00Z' }); await b.buzon();
  es(b.sinVer().nov.length === 0, 'una novedad ya vista no vuelve a contar aunque desaparezca un rato y vuelva');
}
{ const { b, S } = nuevo({ negocio: 'voltio', demo: false }); b.ponCodigo('CLAVE-VOLTIO');
  S.nov = [{ id: 3, tipo: 'oferta', titulo: 'Asistente', texto: 'Un mes de prueba.', enlace: null, desde: '2026-11-12T10:00:00Z' }, { id: 4, tipo: 'aviso', titulo: 'Mantenimiento', texto: 'El jueves de 3 a 4.', enlace: null, desde: '2026-11-12T10:00:00Z' }];
  await b.buzon(); es(b.cache().novedades.length === 2 && !b.cache().sin_ofertas, 'un negocio de verdad ve las ofertas mientras no diga lo contrario');
  const o = await b.ofertas(false); es(o.ok && o.sin_ofertas && S.sinOfertas === true && b.cache().novedades.length === 1 && b.cache().novedades[0].tipo === 'aviso', 'al decir que no, lo guarda el servidor y la oferta desaparece al momento; los avisos siguen');
  await b.buzon(); es(b.cache().novedades.length === 1 && b.cache().sin_ofertas, 'y el servidor ya no las manda');
  S.red = false; const o3 = await b.ofertas(true); es(!o3.ok && o3.err === 'red' && b.cache().sin_ofertas, 'sin conexión no se puede cambiar, y lo dice');
}
// ---- 6. la demo es pública: cada navegador ve lo suyo
{ const S = servidor(), a = nuevo({ S }).b, c = nuevo({ S }).b; await a.enviar(buena); await a.buzon(); await c.buzon();
  es(a.remitente() !== c.remitente() && a.cache().peticiones.length === 1 && c.cache().peticiones.length === 0, 'en la demo, un navegador no ve lo que mandó otro');
  es(a.remitente() === a.remitente() && /^[a-z0-9]{20}$/.test(a.remitente()), 'el remitente es siempre el mismo en un aparato');
}
// ---- 7. un aparato que no deja guardar, o con lo guardado estropeado
{ let lleno = true; const { b, S } = nuevo({ roto: () => lleno }); S.red = false;
  const r = await b.enviar(buena); es(r.ok && r.enCola && b.cola().length === 1 && b.cache().peticiones.length === 1, 'si el aparato no deja guardar, la cola aguanta mientras la app esté abierta');
  S.red = true; es((await b.buzon()).ok && b.cola().length === 0 && b.cache().peticiones[0].estado === 'recibida', 'y sale igual cuando vuelve la conexión');
}
{ const A = almacen(); for (const k of ['cola', 'buzon', 'vistas', 'soporte', 'remitente']) A.setItem('oficio:ramirez:' + k, '{esto no es json');
  const { b } = nuevo({ A }); let rompe = false; try { b.cache(); b.cola(); b.sinLeer(); b.codigo(); b.remitente(); b.marcaVisto(); } catch (e) { rompe = true; }
  es(!rompe && b.cola().length === 0 && b.cache().peticiones.length === 0, 'con lo guardado estropeado, arranca vacío y no se rompe');
  for (const [k, v] of [['cola', '"texto"'], ['buzon', '[1,2]'], ['vistas', '7']]) A.setItem('oficio:ramirez:' + k, v);
  rompe = false; try { b.cache(); b.sinLeer(); await b.enviar(buena); await b.buzon(); } catch (e) { rompe = true; }
  es(!rompe, 'con cosas de otro tipo guardadas, tampoco');
}
// ---- 8. el servidor contesta algo raro
{ const { b, S } = nuevo(); S.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }); const { b: b2 } = nuevo({ S });
  const r = await b2.enviar(buena), z = await b2.buzon(); es(!r.ok && r.err === 'servidor' && !z.ok, 'si el servidor contesta vacío, lo dice y no se rompe');
  S.fetch = () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('no es json')) }); const { b: b3 } = nuevo({ S });
  const r3 = await b3.enviar(buena); es(r3.ok && r3.enCola, 'si contesta algo que no se entiende, se guarda para más tarde');
}
es(SOP.aparato('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36') === 'Windows · Chrome' && SOP.aparato('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile') === 'Android · Chrome' && SOP.aparato('') === 'otro · otro' && SOP.aparato(null) === 'otro · otro', 'el tipo de aparato se resume en dos palabras');

console.log((mal.length ? 'MAL' : 'BIEN') + ': ' + ok + ' comprobaciones pasan' + (mal.length ? ', ' + mal.length + ' fallan' : '') + '.');
process.exit(mal.length ? 1 : 0);
