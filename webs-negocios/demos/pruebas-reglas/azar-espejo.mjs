// El espejo con varios aparatos a la vez, acciones al azar y una red que falla: peticiones que no llegan, respuestas que
// se pierden, aparatos sin cobertura, la app que se cierra y se abre, y códigos que se retiran un rato.
// Cada aparato hace lo que haría la app: adelanta la acción en pantalla, la pone en la cola y la manda cuando puede.
// Leyes que se comprueban:
//   · lo que devuelve «hacer» es lo que dicen las reglas sobre lo que el aparato tenía en pantalla, y la pantalla queda como dicen;
//   · cuando todo se calma, cada aparato ve exactamente lo que el servidor le daría (la oficina, todo; un técnico, lo suyo);
//   · cada acción adelantada acaba una sola vez en el diario del servidor, o rechazada y avisada: nunca perdida, nunca dos veces;
//   · lo guardado en el servidor sigue siendo igual a repetir su diario.
// Uso: node azar-espejo.mjs <carpeta del sitio> [--tandas 150] [--semilla 20261114] [--pasos 300]
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), sitio = args[0];
if (!sitio) { console.log('Uso: node azar-espejo.mjs <carpeta del sitio> [--tandas 150] [--semilla N]'); process.exit(2); }
const op = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const TANDAS = op('--tandas', 150), SEMILLA = op('--semilla', 20261114), PASOS = op('--pasos', 300);
const existe = f => { try { require.resolve(f); return true; } catch (e) { return false; } };
const DIR = path.resolve(process.env.OFICIOS_SERVIDOR || [path.join(aqui, '../../oficios-servidor'), path.join(aqui, '../../servidor')].find(d => existe(path.join(d, 'juez.mjs'))) || path.join(aqui, '../../oficios-servidor'));
const { crea } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
const { creaAlmacen } = await import(pathToFileURL(path.join(DIR, 'almacen-memoria.mjs')).href);
const K = leeNucleo(sitio);
const NEG = { ramirez: leeNegocio(path.join(sitio, 'js/oficio-datos.js')).N, voltio: Object.assign({}, leeNegocio(path.join(aqui, 'negocios/voltio.js')).N, { mapa: {} }) };
const rutaEspejo = path.resolve(process.env.OFICIOS_ESPEJO || path.join(sitio, 'js/oficio-espejo.js'));
delete require.cache[rutaEspejo]; require(rutaEspejo);
const ESP = globalThis.OficioEspejo;
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b), copia = x => JSON.parse(JSON.stringify(x));
function azar(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
class Rota extends Error {}
let comprobaciones = 0;
const ley = (c, nombre, detalle) => { comprobaciones++; if (!c) throw new Rota(nombre + (detalle ? ' · ' + detalle : '')); };
const cuenta = { pasos: 0, adelantadas: 0, hechas: 0, rechazadas: 0, perdidas: 0, repetidas: 0, creadas: 0, recargas: 0, sinSesion: 0, calmas: 0, juntadas: 0 };

async function tanda(semilla) {
  const rnd = azar(semilla), uno = L => L[Math.floor(rnd() * L.length)], si = p => rnd() < p;
  const id = semilla % 2 ? 'voltio' : 'ramirez', N = NEG[id], cfg = K.cfgDe(N);
  const reloj = { t: Date.parse('2026-11-16T07:00:00+01:00') + Math.floor(rnd() * 7 * 86400000) };
  const A = creaAlmacen({ ahora: () => reloj.t });
  const J = crea({ K, almacen: A, ahora: () => (reloj.t += 1000 + Math.floor(rnd() * 600000)) });
  A.alta(id, N, K.ESQ); A.persona(id, 'oficina', 'centralita', 'oficina', 'of'); N.tecnicos.forEach(t => A.persona(id, t.id, 'tecnico', t.id, 'tec-' + t.id));
  let nm = 0; const D = [];
  const nuevo = (persona, q, codigo) => { const d = { persona, q, codigo, online: true, entero: true, puestas: new Set(), crea: new Map(), fin: new Map(), abandonadas: new Set() };
    d.marca = () => { const m = 'm' + String(++nm).padStart(13, '0'); d.puestas.add(m); return m; };
    d.E = ESP.crea({ K, cfg, quien: q, ahora: () => reloj.t, marca: d.marca }); D.push(d); return d; };
  for (let i = 0; i < 2; i++) nuevo('oficina', { rol: 'centralita', id: 'oficina' }, 'of');
  N.tecnicos.forEach((t, i) => { for (let k = 0; k < (i === 0 ? 2 : 1); k++) nuevo(t.id, { rol: 'tecnico', id: t.id }, 'tec-' + t.id); });
  const cli = () => ({ nombre: uno(['Montse Vila', 'Pere Soler', 'Aitana Roig', 'Li Wei']), apellidos: uno(['Vila', 'Soler i Puig', 'Roig', 'Wei']), tel: '6' + String(10000000 + Math.floor(rnd() * 89999999)), dir: 'Calle ' + uno(['Mayor', 'Nueva', 'del Mar']) + ' ' + (1 + Math.floor(rnd() * 90)), cp: uno(Object.keys(N.zonas.cp)) });
  const firma = 'M1 1L20 20L40 10L60 30L80 12L100 40';

  function accion(d) {
    const mis = d.E.estado().avisos, x = mis.length ? uno(mis) : null, a = x ? x.id : N.serie + '-0001', hoy = K.madrid(reloj.t).date;
    if (d.q.rol === 'centralita') return uno([
      () => ({ tipo: 'pedir', av: uno(N.averias).id, origen: uno(['llamada', 'whatsapp', 'persona']), cli: cli() }),
      () => ({ tipo: 'pedir', av: uno(N.averias).id, origen: 'llamada', cli: cli() }),
      () => ({ tipo: 'asignar', id: a, tec: uno(N.tecnicos).id }), () => ({ tipo: 'asignar', id: a, tec: uno(N.tecnicos).id }), () => ({ tipo: 'asignar', id: a, tec: uno(N.tecnicos).id }),
      () => ({ tipo: 'anotar', id: a, obs: 'Nota ' + Math.floor(rnd() * 1000) }), () => ({ tipo: 'cancelar', id: a, motivo: 'prueba' }), () => ({ tipo: 'mover', id: a, cita: null }),
      () => ({ tipo: 'ausencia', tec: uno(N.tecnicos).id, de: hoy, a: K.masDias(hoy, Math.floor(rnd() * 3)), motivo: 'baja' }),
      () => { const u = d.E.estado().ausencias || []; return { tipo: 'quitarAusencia', aus: u.length ? uno(u).id : 'U1' }; },
      () => ({ tipo: 'cobrar', id: a, modo: 'efectivo' }),
    ])();
    return uno([
      () => ({ tipo: 'voy', id: a }), () => ({ tipo: 'voy', id: a }), () => ({ tipo: 'ausente', id: a }),
      () => ({ tipo: 'empezar', id: a, pres: { lineas: [{ k: uno(Object.keys(cfg.cat)), q: 1 }], firma } }), () => ({ tipo: 'empezar', id: a, pres: { lineas: [{ k: uno(Object.keys(cfg.cat)), q: 1 }], firma } }),
      () => ({ tipo: 'pausa', id: a }), () => ({ tipo: 'terminar', id: a, modo: uno(['efectivo', 'tarjeta', 'pendiente']), firma }),
      () => ({ tipo: 'noacepta', id: a, modo: 'efectivo' }), () => ({ tipo: 'anotar', id: a, obs: 'Del técnico ' + Math.floor(rnd() * 1000) }),
      () => ({ tipo: 'posicion', id: a, lat: 41 + rnd(), lon: 2 + rnd() }), () => ({ tipo: 'posicion', id: a, lat: 41 + rnd(), lon: 2 + rnd() }), () => ({ tipo: 'sinPosicion', id: a }),
    ])();
  }
  /* como la app: de cuatro al azar, la primera que las reglas dan por buena con lo que el aparato tiene en pantalla */
  function accionProbable(d) { let a = null; for (let i = 0; i < 4; i++) { a = accion(d); if (K.aplicar(copia(d.E.estado()), cfg, copia(a), d.q, reloj.t).ok) return a; } return a; }

  /* lo que se ve tiene que ser siempre la base (lo último que dijo el servidor) con la cola encima, en su orden */
  function leyPantalla(d, cuando) {
    const g = copia(d.E.guardado()), S = g.B;
    for (const p of g.cola) K.aplicar(S, cfg, copia(p.accion), d.q, p.t);
    ley(igual(d.E.estado(), S), 'la-pantalla-es-la-base-mas-la-cola', d.persona + ' ' + cuando);
  }
  function actua(d) {
    const a = accionProbable(d);
    if (ESP.CREAN.includes(a.tipo)) { const m = d.marca(); d.crea.set(m, null); d.E.crear(a, m).then(r => { d.crea.set(m, r || { ok: false }); }); cuenta.creadas++; return; }
    const antes = copia(d.E.estado()), n0 = d.E.pendientes(), espera = copia(antes), re = K.aplicar(espera, cfg, copia(a), d.q, reloj.t), r = d.E.hacer(a);
    ley(r.ok === re.ok && (r.ok || r.err === re.err), 'hacer-dice-lo-que-las-reglas', a.tipo + ' ' + JSON.stringify(r) + ' / ' + JSON.stringify(re));
    /* una posición que sustituye a otra que aún no había salido no ocupa sitio nuevo: lo que se ve se rehace con la última */
    const sustituye = r.ok && a.tipo === 'posicion' && d.E.pendientes() === n0;
    if (!sustituye) ley(igual(d.E.estado(), r.ok ? espera : antes), 'la-pantalla-queda-como-dicen-las-reglas', a.tipo);
    else ley(igual(d.E.estado().avisos.find(x => x.id === a.id).pos, espera.avisos.find(x => x.id === a.id).pos), 'en-pantalla-la-ultima-posicion');
    ley(d.E.pendientes() === n0 + (r.ok ? 1 : 0) || sustituye, 'cada-accion-buena-a-la-cola', a.tipo);
    leyPantalla(d, 'tras hacer ' + a.tipo);
    if (r.ok) cuenta.adelantadas++;
  }
  const enDiario = (d, m) => A.crudo(id).diario.some(x => x.clave === d.q.rol + ':' + d.q.id + '|' + m);
  async function manda(d, seguro) {
    const p = d.E.siguiente(); if (!p) return false;
    const suerte = seguro ? 'bien' : !d.online ? 'ida' : si(.1) ? 'ida' : si(.12) ? 'vuelta' : 'bien';
    let res = { ok: false, err: 'red' };
    if (suerte !== 'ida') { const r = await J.atiende({ que: 'hacer', negocio: id, persona: d.persona, codigo: d.codigo, accion: p.accion, clave: p.clave, desde: p.desde });
      ley(r && typeof r.ok === 'boolean' && r.err !== 'servidor', 'el-juez-contesta-siempre', JSON.stringify(r).slice(0, 120));
      if (r.repetida) cuenta.repetidas++; if (suerte !== 'vuelta') res = r; }
    if (suerte !== 'bien') cuenta.perdidas++;
    const x = d.E.respuesta(p.clave, res);
    ley(['hecha', 'rechazada', 'reintenta', 'sesion'].includes(x.tipo), 'respuesta-conocida', x.tipo);
    if (x.tipo === 'hecha') { cuenta.hechas++; ley(enDiario(d, p.clave), 'lo-hecho-esta-en-el-diario', p.accion.tipo); d.fin.set(p.clave, 'hecha'); }
    if (x.tipo === 'rechazada') { cuenta.rechazadas++; ley(!enDiario(d, p.clave), 'lo-rechazado-no-esta-en-el-diario', p.accion.tipo + ' ' + x.err); d.fin.set(p.clave, 'rechazada'); }
    if (x.tipo === 'sesion') cuenta.sinSesion++;
    if (seguro) ley(x.tipo === 'hecha' || x.tipo === 'rechazada', 'con-red-y-codigo-todo-se-resuelve', x.tipo + ' ' + (x.err || ''));
    leyPantalla(d, 'tras responder'); return true;
  }
  async function pregunta(d) {
    const r = await J.atiende({ que: 'leer', negocio: id, persona: d.persona, codigo: d.codigo, desde: d.entero ? 0 : d.E.v() });
    if (!r.ok) return false; ley(d.E.llega(r.cambios) === true, 'lo-que-manda-el-servidor-entra'); d.entero = false; leyPantalla(d, 'tras leer'); return true;
  }
  function recarga(d) {
    const g = copia(d.E.guardado());
    /* de cada tres veces, una hay otra pestaña que ha escrito antes: lo guardado se junta, no se pisa */
    let guardado = g;
    if (si(.33)) { const otra = D.find(o => o !== d && o.persona === d.persona); if (otra) { guardado = ESP.junta(copia(otra.E.guardado()), g); cuenta.juntadas++; } }
    for (const [m, r] of d.crea) if (r === null) { d.abandonadas.add(m); d.crea.set(m, { ok: false, err: 'cerrada' }); }
    d.E = ESP.crea({ K, cfg, quien: d.q, ahora: () => reloj.t, marca: d.marca });
    ley(d.E.carga(guardado) === true, 'lo-guardado-se-puede-cargar'); d.entero = true; cuenta.recargas++; leyPantalla(d, 'tras abrir');
  }
  function leyesServidor() {
    const n = A.crudo(id), S = K.nuevo();
    ley(n.diario.every((x, i) => x.v === i + 1) && n.v === n.diario.length, 'versiones-seguidas');
    for (const x of n.diario) { const r = K.aplicar(S, cfg, copia(x.accion), x.q, x.t); ley(r.ok && S.v === x.v, 'el-diario-se-puede-repetir', 'v' + x.v); }
    const sin = a => { const y = Object.assign({}, a); delete y.llave; return y; };
    ley(igual(S.avisos, [...n.avisos.values()].map(f => sin(f.datos)).sort((a, b) => a.n - b.n)), 'lo-guardado-es-el-diario');
    const marcas = n.diario.map(x => x.clave).filter(Boolean); ley(new Set(marcas).size === marcas.length, 'ninguna-accion-dos-veces');
  }
  /* todo el mundo con red y con su código: se vacían las colas, se ponen al día y se miran las leyes */
  async function calma() {
    cuenta.calmas++;
    for (const p of A.crudo(id).personas.values()) if (p.retirado) { p.codigo = p.retirado; delete p.retirado; }
    for (const d of D) d.online = true;
    for (let vuelta = 0; vuelta < 3; vuelta++) for (const d of D) { let n = 0; while (d.E.enCola()) { await manda(d, true); ley(++n < 400, 'la-cola-se-vacia'); } }
    await Promise.resolve();
    for (const d of D) ley(await pregunta(d), 'leer-con-su-codigo', d.persona);
    const n = A.crudo(id), todo = [...n.avisos.values()].map(f => f.datos).sort((a, b) => a.n - b.n);
    for (const d of D) {
      const S = d.E.estado(), suyo = d.q.rol === 'centralita' ? todo : todo.filter(a => a.tec === d.q.id);
      ley(igual(S.avisos, suyo), 'cada-aparato-acaba-como-el-servidor', d.persona + ': ' + S.avisos.length + ' / ' + suyo.length);
      ley(d.E.pendientes() === 0 && d.E.enCola() === 0 && d.E.v() === n.v, 'nada-por-enviar-y-al-dia', d.persona);
      if (d.q.rol === 'centralita') ley(igual({ n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [] }, { n: n.cab.n, nu: n.cab.nu, ausencias: n.cab.ausencias }), 'la-oficina-con-sus-contadores');
      else ley(S.avisos.every(a => a.tec === d.q.id) && (S.ausencias || []).length === 0, 'el-tecnico-solo-lo-suyo', d.persona);
      for (const m of d.puestas) {
        const esta = enDiario(d, m);
        if (d.crea.has(m)) { const r = d.crea.get(m); ley(r !== null, 'toda-creacion-tiene-respuesta', m);
          if (d.abandonadas.has(m)) ley(!esta, 'lo-que-no-llego-a-salir-no-esta', m);
          else if (r.ok) ley(esta, 'lo-creado-esta-en-el-diario', m); else if (!r.duda) ley(!esta, 'lo-no-creado-no-esta', m + ' ' + r.err); }
        else { const f = d.fin.get(m); ley(f === 'hecha' || f === 'rechazada', 'ninguna-accion-se-pierde', m + ' ' + f); ley((f === 'hecha') === esta, 'una-vez-y-solo-una', m); }
      }
    }
    leyesServidor();
  }

  for (let i = 0; i < PASOS; i++) {
    cuenta.pasos++; const d = uno(D), x = rnd();
    if (x < .42) actua(d);
    else if (x < .78) { if (!(await manda(d)) && d.online && si(.85)) await pregunta(d); }
    else if (x < .85) d.online = !d.online;
    else if (x < .90) recarga(d);
    else if (x < .93) { const p = A.crudo(id).personas.get(d.persona); if (p.retirado) { p.codigo = p.retirado; delete p.retirado; } else { p.retirado = p.codigo; p.codigo = 'retirado-' + i; } }
    else reloj.t += Math.floor(rnd() * 1800000);
    await Promise.resolve();
    if (i % 40 === 39) await calma();
  }
  await calma();
  return A.crudo(id).diario.length;
}

let tandas = 0, acciones = 0;
for (let i = 0; i < TANDAS; i++) {
  const s = SEMILLA + i * 7919;
  try { acciones += await tanda(s); tandas++; }
  catch (e) { console.log('  MAL  tanda ' + i + ' (semilla ' + s + '): ' + (e instanceof Rota ? 'ley rota: ' + e.message : e.stack)); console.log('  Para repetirla: node azar-espejo.mjs <sitio> --tandas 1 --semilla ' + s); process.exit(1); }
}
const poco = [['adelantadas', 200], ['hechas', 150], ['rechazadas', 10], ['perdidas', 30], ['repetidas', 5], ['creadas', 40], ['recargas', 10], ['sinSesion', 3], ['juntadas', 3]].filter(([k, m]) => TANDAS >= 20 && cuenta[k] < m);
if (poco.length) { console.log('  MAL  la prueba no ha pasado por todo lo que tenía que pasar: ' + poco.map(([k, m]) => k + ' ' + cuenta[k] + ' < ' + m).join(', ')); process.exit(1); }
console.log('Bien: ' + tandas + ' tandas del espejo, ' + cuenta.pasos + ' pasos y ' + comprobaciones.toLocaleString('es-ES') + ' comprobaciones. ' + cuenta.adelantadas + ' acciones adelantadas en pantalla, ' + acciones + ' aceptadas por el servidor, ' +
  cuenta.rechazadas + ' rechazadas y avisadas, ' + cuenta.perdidas + ' envíos perdidos, ' + cuenta.repetidas + ' repetidos sin hacerse dos veces, ' + cuenta.recargas + ' veces la app cerrada y abierta, ' + cuenta.sinSesion + ' envíos con el código retirado.');
