// El juez, con recorridos al azar: varios aparatos de dos negocios actuando a la vez, con otros que se adelantan
// justo entre que el juez lee y guarda. Tras cada paso se comprueban las leyes que no se pueden romper nunca.
// Uso: node azar-juez.mjs <carpeta del sitio> [--tandas 60] [--pasos 150] [--semilla 20261114]
//      OFICIOS_SERVIDOR=<carpeta> para probar otra copia del juez (lo usa mutantes-juez.mjs)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), sitio = args[0];
if (!sitio) { console.log('Uso: node azar-juez.mjs <carpeta del sitio> [--tandas 60] [--pasos 150] [--semilla 20261114]'); process.exit(2); }
const op = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const TANDAS = op('--tandas', 60), PASOS = op('--pasos', 150), SEMILLA = op('--semilla', 20261114);
const DIR = path.resolve(process.env.OFICIOS_SERVIDOR || path.join(aqui, '../../oficios-servidor'));
const { crea, TOPES } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
const { creaAlmacen } = await import(pathToFileURL(path.join(DIR, 'almacen-memoria.mjs')).href);
const K = leeNucleo(sitio), NEG = { ramirez: leeNegocio(path.join(sitio, 'js/oficio-datos.js')).N, voltio: leeNegocio(path.join(aqui, 'negocios/voltio.js')).N };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function azar(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

let comprobaciones = 0;
class Rota extends Error {}
const ley = (c, nombre, detalle) => { comprobaciones++; if (!c) throw new Rota(nombre + (detalle ? ' · ' + detalle : '')); };

async function tanda(semilla) {
  const rnd = azar(semilla), uno = L => L[Math.floor(rnd() * L.length)], si = p => rnd() < p;
  const reloj = { t: Date.parse('2026-11-16T07:00:00+01:00') + Math.floor(rnd() * 7 * 86400000) };
  let estorbo = null, pasos = 0, aceptadas = 0, rechazadas = 0, adelantos = 0, repetidas = 0;
  const A = creaAlmacen({ ahora: () => reloj.t, estorbo: (...a) => estorbo && estorbo(...a) });
  const J = crea({ K, almacen: A, ahora: () => (reloj.t += 1000 + Math.floor(rnd() * 900000)) });
  const D = [];   // los aparatos: cada uno con su copia de lo que ha recibido
  for (const [id, N] of Object.entries(NEG)) {
    A.alta(id, N, K.ESQ); A.persona(id, 'oficina', 'centralita', 'oficina', 'of-' + id);
    N.tecnicos.forEach(t => A.persona(id, t.id, 'tecnico', t.id, 'tec-' + id + '-' + t.id));
    for (let i = 0; i < 2; i++) D.push({ neg: id, N, persona: 'oficina', codigo: 'of-' + id, q: { rol: 'centralita', id: 'oficina' }, v: 0, avisos: new Map(), cab: null });
    N.tecnicos.forEach((t, i) => { for (let k = 0; k < (i === 0 ? 2 : 1); k++) D.push({ neg: id, N, persona: t.id, codigo: 'tec-' + id + '-' + t.id, q: { rol: 'tecnico', id: t.id }, v: 0, avisos: new Map(), cab: null }); });
  }
  const cfgs = Object.fromEntries(Object.entries(NEG).map(([id, N]) => [id, K.cfgDe(N)]));
  const cli = N => ({ nombre: uno(['Montse Vila', 'Pere Soler', 'Aitana Roig', 'Li Wei']), tel: '6' + String(10000000 + Math.floor(rnd() * 89999999)), dir: 'Calle ' + uno(['Mayor', 'Nueva', 'del Mar']) + ' ' + (1 + Math.floor(rnd() * 90)), cp: uno(Object.keys(N.zonas.cp)) });

  /* una acción al azar para ese aparato, con lo que él conoce */
  function accion(d) {
    const cfg = cfgs[d.neg], mis = [...d.avisos.values()], x = mis.length ? uno(mis) : null, id = x ? x.id : d.N.serie + '-0001';
    if (d.q.rol === 'centralita') return uno([
      () => ({ tipo: 'pedir', av: uno(d.N.averias).id, origen: uno(['llamada', 'whatsapp', 'persona']), cli: cli(d.N) }),
      () => ({ tipo: 'pedir', av: uno(d.N.averias).id, origen: 'llamada', cli: cli(d.N) }),
      () => ({ tipo: 'asignar', id, tec: uno(d.N.tecnicos).id }), () => ({ tipo: 'asignar', id, tec: uno(d.N.tecnicos).id }),
      () => ({ tipo: 'anotar', id, obs: 'Nota ' + Math.floor(rnd() * 1000) }), () => ({ tipo: 'cancelar', id, motivo: 'prueba' }),
      () => ({ tipo: 'mover', id, cita: null }), () => ({ tipo: 'ausencia', tec: uno(d.N.tecnicos).id, de: K.madrid(reloj.t).date, a: K.masDias(K.madrid(reloj.t).date, Math.floor(rnd() * 3)), motivo: 'baja' }),
      () => ({ tipo: 'cobrar', id, modo: 'efectivo' }),
    ])();
    return uno([
      () => ({ tipo: 'voy', id }), () => ({ tipo: 'voy', id }), () => ({ tipo: 'ausente', id }),
      () => ({ tipo: 'empezar', id, pres: { lineas: [{ k: uno(Object.keys(cfg.cat)), q: 1 }], firma: 'M1 1L20 20L40 10L60 30L80 12L100 40' } }),
      () => ({ tipo: 'terminar', id, modo: uno(['efectivo', 'tarjeta', 'pendiente']), firma: 'M1 1L20 20L40 10L60 30L80 12L100 40' }),
      () => ({ tipo: 'noacepta', id, modo: 'efectivo' }), () => ({ tipo: 'anotar', id, obs: 'Del técnico ' + Math.floor(rnd() * 1000) }),
      () => ({ tipo: 'posicion', id, lat: 41 + rnd(), lon: 2 + rnd() }), () => ({ tipo: 'sinPosicion', id }),
    ])();
  }
  /* Como un aparato de verdad: antes de mandar nada, prueba la acción con las reglas sobre lo que él tiene. De cuatro
     al azar manda la primera que sus reglas dan por buena; si ninguna lo es, manda la última igualmente (también hay
     que ver qué hace el juez con lo que no vale). */
  function accionProbable(d) {
    let a = null;
    for (let i = 0; i < 4; i++) {
      a = accion(d);
      const S = Object.assign({ esq: K.ESQ, n: 0, nu: 0, ausencias: [] }, d.q.rol === 'centralita' && d.cab ? JSON.parse(JSON.stringify(d.cab)) : {}, { v: d.v, avisos: JSON.parse(JSON.stringify([...d.avisos.values()].sort((x, y) => x.n - y.n))) });
      if (K.aplicar(S, cfgs[d.neg], JSON.parse(JSON.stringify(a)), d.q, reloj.t).ok) return a;
    }
    return a;
  }
  /* lo que el aparato hace con lo que recibe; de paso, la ley de «cada uno, lo suyo» */
  function recibe(d, c) {
    ley(c && Number.isInteger(c.v) && Array.isArray(c.avisos), 'cambios-con-forma');
    for (const x of c.avisos) {
      if (d.q.rol === 'tecnico') ley(x.fuera ? igual(Object.keys(x).sort(), ['fuera', 'id', 'v']) : x.datos && x.datos.tec === d.q.id, 'el-tecnico-recibe-solo-lo-suyo', d.persona + ' recibió ' + x.id);
      else ley(!!x.datos, 'la-oficina-recibe-entero');
    }
    if (d.q.rol === 'tecnico') ley(igual(c.cab, { esq: K.ESQ }), 'el-tecnico-no-recibe-la-cabecera');
    if (c.entero) d.avisos.clear();
    for (const x of c.avisos) { if (x.fuera) d.avisos.delete(x.id); else d.avisos.set(x.id, x.datos); }
    d.v = c.v; d.cab = c.cab;
  }
  async function manda(d, a, clave) {
    const r = await J.atiende({ que: 'hacer', negocio: d.neg, persona: d.persona, codigo: d.codigo, accion: a, desde: d.v, clave });
    ley(r && typeof r.ok === 'boolean', 'siempre-contesta'); ley(!(r.err === 'servidor'), 'sin-fallos-internos', JSON.stringify(a));
    if (r.cambios) recibe(d, r.cambios);
    return r;
  }
  /* las leyes sobre lo guardado */
  function leyesAlmacen() {
    for (const [id, N] of Object.entries(NEG)) {
      const n = A.crudo(id), cfg = cfgs[id], S = K.nuevo();
      ley(n.diario.every((x, i) => x.v === i + 1) && n.v === n.diario.length, 'versiones-seguidas', id);
      for (const x of n.diario) { const r = K.aplicar(S, cfg, JSON.parse(JSON.stringify(x.accion)), x.q, x.t); ley(r.ok && S.v === x.v, 'el-diario-se-puede-repetir', id + ' v' + x.v); }
      const guardado = [...n.avisos.values()].map(f => f.datos).sort((a, b) => a.n - b.n), sin = a => { const y = Object.assign({}, a); delete y.llave; return y; };
      ley(igual(S.avisos, guardado.map(sin)), 'lo-guardado-es-el-diario', id);
      ley(igual({ esq: S.esq, n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [] }, n.cab), 'la-cabecera-es-el-diario', id);
      const Sg = Object.assign({}, S, { avisos: guardado });
      for (const f of n.avisos.values()) {
        ley(igual(f.vista, K.vistaCliente(Sg, cfg, f.id)), 'lo-que-ve-el-cliente-esta-al-dia', f.id);
        ley(/^[a-z2-9]{24}$/.test(f.llave) && f.datos.llave === f.llave, 'cada-aviso-con-su-llave', f.id);
        ley(!f.datos.tec || f.de.includes(f.datos.tec), 'queda-apuntado-quien-lo-lleva', f.id);
        ley(f.v >= 1 && f.v <= n.v, 'version-de-aviso-posible', f.id);
      }
      ley(new Set([...n.avisos.values()].map(f => f.llave)).size === n.avisos.size, 'llaves-distintas', id);
    }
  }
  /* un aparato que se pone al día tiene que acabar con lo mismo que si lo pidiera todo de cero */
  async function leyAparato(d) {
    const r = await J.atiende({ que: 'leer', negocio: d.neg, persona: d.persona, codigo: d.codigo, desde: d.v });
    ley(r.ok, 'leer-con-su-codigo'); recibe(d, r.cambios);
    const n = A.crudo(d.neg), espera = [...n.avisos.values()].filter(f => d.q.rol === 'centralita' || f.datos.tec === d.q.id).map(f => f.datos).sort((a, b) => a.n - b.n);
    ley(d.v === n.v && igual([...d.avisos.values()].sort((a, b) => a.n - b.n), espera), 'el-aparato-al-dia-tiene-lo-que-le-toca', d.persona + ' de ' + d.neg);
    if (d.q.rol === 'centralita') ley(igual(d.cab, n.cab), 'la-oficina-tiene-la-cabecera');
  }

  for (pasos = 0; pasos < PASOS; pasos++) {
    const d = uno(D), a = accionProbable(d), clave = si(.3) ? 'marca-' + semilla + '-' + pasos + '-abcdef' : undefined, v0 = A.crudo(d.neg).v;
    /* a veces, otro aparato del mismo negocio se adelanta justo antes de que el juez guarde */
    if (si(.3)) { let hecho = false; estorbo = async id => { if (hecho || id !== d.neg) return; hecho = true; const e0 = estorbo; estorbo = null; const o = uno(D.filter(x => x.neg === d.neg && x !== d)); const r = await manda(o, accionProbable(o)); if (r.ok) adelantos++; estorbo = e0; }; }
    const r = await manda(d, a, clave); estorbo = null;
    if (r.ok) aceptadas++; else rechazadas++;
    ley(!r.ok || A.crudo(d.neg).v > v0, 'lo-aceptado-sube-la-version');
    if (clave && si(.6)) {   // el aparato no recibió la respuesta y lo manda otra vez
      const v1 = A.crudo(d.neg).v, r2 = await manda(d, a, clave);
      if (r.ok) { ley(r2.ok && r2.repetida === true && igual(r2.r, r.r) && A.crudo(d.neg).v === v1, 'lo-repetido-no-se-hace-dos-veces', a.tipo); repetidas++; }
      else ley(A.crudo(d.neg).v <= v1 + 1, 'lo-repetido-como-mucho-una-vez');
    }
    if (si(.12)) {   // alguien pide cita en la web
      const neg = uno(Object.keys(NEG)), N = NEG[neg], h = await J.atiende({ que: 'huecos', negocio: neg });
      ley(h.ok && h.dias.every(x => igual(Object.keys(x).sort(), ['dia', 'franjas', 'hoy']) && x.franjas.every(f => igual(Object.keys(f).sort(), ['id', 'ok']))), 'los-huecos-no-llevan-nada-mas');
      const dia = h.dias.find(x => x.franjas.some(f => f.ok)); A.crudo(neg).topes.clear();
      if (dia) { const fr = uno(dia.franjas.filter(f => f.ok)).id, v1 = A.crudo(neg).v, p = await J.atiende({ que: 'pedir', negocio: neg, red: 'r' + pasos, accion: { tipo: 'pedir', av: uno(N.averias).id, cli: cli(N), cita: { dia: dia.dia, fr } } });
        if (p.ok) { ley(igual(Object.keys(p).sort(), ['id', 'llave', 'ok']) && A.crudo(neg).avisos.get(p.id).llave === p.llave && A.crudo(neg).v === v1 + 1, 'la-web-recibe-su-numero-y-su-llave');
          const w = await J.atiende({ que: 'ver', negocio: neg, aviso: p.id, llave: p.llave }); ley(w.ok && w.vista.id === p.id && !('cli' in w.vista), 'el-cliente-ve-su-aviso'); } }
    }
    if (si(.15)) {   // enlaces: el bueno enseña lo de las reglas; cualquier otro, nada
      const neg = uno(Object.keys(NEG)), F = [...A.crudo(neg).avisos.values()];
      if (F.length) { const f = uno(F), g = uno(F), otro = uno(Object.keys(NEG).filter(x => x !== neg));
        const bien = await J.atiende({ que: 'ver', negocio: neg, aviso: f.id, llave: f.llave }); ley(bien.ok && igual(bien.vista, f.vista), 'el-enlace-bueno-ensena-su-aviso');
        if (g.id !== f.id) ley(igual(await J.atiende({ que: 'ver', negocio: neg, aviso: f.id, llave: g.llave }), { ok: false, err: 'enlace' }), 'la-llave-de-otro-aviso-no-abre');
        ley(igual(await J.atiende({ que: 'ver', negocio: otro, aviso: f.id, llave: f.llave }), { ok: false, err: 'enlace' }), 'la-llave-no-vale-en-otro-negocio'); }
    }
    if (si(.1)) {   // códigos de otro: no entran
      const o = uno(D.filter(x => x.neg !== d.neg)), malo = await J.atiende({ que: 'hacer', negocio: d.neg, persona: d.persona, codigo: o.codigo, accion: a }), v1 = A.crudo(d.neg).v;
      ley(igual(malo, { ok: false, err: 'clave' }) && A.crudo(d.neg).v === v1, 'el-codigo-de-otro-negocio-no-entra'); A.crudo(d.neg).fallos = [];
    }
    leyesAlmacen();
    await leyAparato(uno(D)); if (si(.3)) await leyAparato(uno(D));
  }
  for (const d of D) await leyAparato(d);
  const estados = {}; for (const id of Object.keys(NEG)) for (const f of A.crudo(id).avisos.values()) estados[f.datos.e] = (estados[f.datos.e] || 0) + 1;
  return { pasos, aceptadas, rechazadas, adelantos, repetidas, estados };
}

const t0 = Date.now(); let tot = { pasos: 0, aceptadas: 0, rechazadas: 0, adelantos: 0, repetidas: 0 }; const est = {};
for (let i = 0; i < TANDAS; i++) {
  try { const r = await tanda(SEMILLA + i); for (const k of Object.keys(tot)) tot[k] += r[k]; for (const [k, n] of Object.entries(r.estados)) est[k] = (est[k] || 0) + n; }
  catch (e) { console.log(`ROTA en la tanda ${i} (semilla ${SEMILLA + i}): ${e instanceof Rota ? e.message : e.stack}`); console.log('Para repetirla: node azar-juez.mjs <sitio> --tandas 1 --semilla ' + (SEMILLA + i)); process.exit(1); }
}
console.log(`BIEN juez  ${tot.pasos} pasos con ${TANDAS * (Object.values(NEG).reduce((s, N) => s + N.tecnicos.length + 3, 0))} aparatos · ${tot.aceptadas} aceptadas, ${tot.rechazadas} rechazadas · ${tot.adelantos} veces se adelantó otro · ${tot.repetidas} repetidas · ${comprobaciones} comprobaciones · ${((Date.now() - t0) / 1000).toFixed(1)} s · semilla ${SEMILLA}`);
console.log('          cómo acaban los avisos: ' + Object.entries(est).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' · '));
/* si los recorridos no llegan a todas partes, no prueban lo que dicen */
const faltan = ['nuevo', 'asignado', 'camino', 'curso', 'hecho', 'cancelado', 'ausente'].filter(k => !est[k]);
if (TANDAS >= 20 && (faltan.length || tot.adelantos < TANDAS || tot.repetidas < TANDAS)) { console.log('MAL: los recorridos no llegan a todo (faltan estados: ' + (faltan.join(', ') || 'ninguno') + '; adelantos ' + tot.adelantos + '; repetidas ' + tot.repetidas + ')'); process.exit(1); }
