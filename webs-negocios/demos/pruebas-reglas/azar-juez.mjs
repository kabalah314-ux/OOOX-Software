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
  let estorbo = null, pasos = 0, aceptadas = 0, rechazadas = 0, adelantos = 0, repetidas = 0, zonas = 0;
  const CODS = {};   // negocio → teléfono → el código de su zona que dio la oficina
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
  const cli = N => ({ nombre: uno(['Montse Vila', 'Pere Soler', 'Aitana Roig', 'Li Wei']), apellidos: uno(['Vila', 'Soler i Puig', 'Roig', 'Wei']), tel: '6' + String(10000000 + Math.floor(rnd() * 89999999)), dir: 'Calle ' + uno(['Mayor', 'Nueva', 'del Mar']) + ' ' + (1 + Math.floor(rnd() * 90)), cp: uno(Object.keys(N.zonas.cp)) });

  /* una acción al azar para ese aparato, con lo que él conoce */
  function accion(d) {
    const cfg = cfgs[d.neg], mis = [...d.avisos.values()], x = mis.length ? uno(mis) : null, id = x ? x.id : d.N.serie + '-0001';
    if (d.q.rol === 'centralita') return uno([
      () => ({ tipo: 'pedir', av: uno(d.N.averias).id, origen: uno(['llamada', 'whatsapp', 'persona']), cli: cli(d.N) }),
      () => ({ tipo: 'pedir', av: uno(d.N.averias).id, origen: 'llamada', cli: cli(d.N) }),
      () => ({ tipo: 'asignar', id, tec: uno(d.N.tecnicos).id }), () => ({ tipo: 'asignar', id, tec: uno(d.N.tecnicos).id }),
      () => ({ tipo: 'anotar', id, obs: 'Nota ' + Math.floor(rnd() * 1000) }), () => ({ tipo: 'cancelar', id, motivo: 'prueba' }),
      () => ({ tipo: 'anotar', id, foto: 'data:image/jpeg;base64,' + 'F'.repeat(40 + Math.floor(rnd() * 6) * 4) }),   // fotos (16-11-2026): seis distintas, que se repiten
      () => ({ tipo: 'mover', id, cita: null }), () => ({ tipo: 'ausencia', tec: uno(d.N.tecnicos).id, de: K.madrid(reloj.t).date, a: K.masDias(K.madrid(reloj.t).date, Math.floor(rnd() * 3)), motivo: 'baja' }),
      () => ({ tipo: 'cobrar', id, modo: 'efectivo' }),
      // los servicios de la web (18-11-2026): el precio, alguna foto (cuatro distintas, que se repiten) y si sale
      () => ({ tipo: 'web', av: uno(d.N.averias).id, desde: 50 + Math.floor(rnd() * 100), foto: rnd() < .3 ? 'data:image/jpeg;base64,' + 'W'.repeat(40 + Math.floor(rnd() * 4) * 4) : undefined }),
      () => ({ tipo: 'web', av: uno(d.N.averias).id, oculto: rnd() < .5 }),
      () => furgo(d, uno(d.N.tecnicos).id), () => furgo(d, uno(d.N.tecnicos).id),
    ].concat(Object.keys(cfg.planes || {}).length ? [   // los contratos de mantenimiento, si el negocio tiene planes
      () => ({ tipo: 'contrato', plan: uno(Object.keys(cfg.planes)), cli: x && rnd() < .5 ? Object.assign({}, x.cli) : cli(d.N), acepta: 'mensaje', modo: uno(['efectivo', 'tarjeta', 'pendiente']) }),
      () => { const L = (d.cab && d.cab.contratos) || [], C = L.length ? uno(L) : null; return { tipo: uno(['cobroContrato', 'bajaContrato']), id: C ? C.id : d.N.serie + 'M-0001', modo: 'bizum', motivo: 'prueba' }; },
    ] : []))();
    return uno([
      () => ({ tipo: 'voy', id }), () => ({ tipo: 'voy', id }), () => ({ tipo: 'ausente', id }),
      () => ({ tipo: 'empezar', id, pres: { lineas: [{ k: uno(Object.keys(cfg.cat)), q: 1 }], firma: 'M1 1L20 20L40 10L60 30L80 12L100 40' } }),
      () => ({ tipo: 'terminar', id, modo: uno(['efectivo', 'tarjeta', 'pendiente']), firma: 'M1 1L20 20L40 10L60 30L80 12L100 40' }),
      () => ({ tipo: 'noacepta', id, modo: 'efectivo' }), () => ({ tipo: 'anotar', id, obs: 'Del técnico ' + Math.floor(rnd() * 1000) }),
      () => ({ tipo: 'posicion', id, lat: 41 + rnd(), lon: 2 + rnd() }), () => ({ tipo: 'sinPosicion', id }),
      () => furgo(d, d.q.id), () => furgo(d, rnd() < .9 ? d.q.id : uno(d.N.tecnicos).id),
    ])();
  }
  /* la furgoneta (16-11-2026): llevar la cuenta, contar o cargar material del catálogo */
  function furgo(d, tec) {
    const cfg = cfgs[d.neg], mats = Object.keys(cfg.cat).filter(k => cfg.cat[k].mat), F = d.cab && d.cab.furgos && d.cab.furgos[tec], L = {};
    if (!mats.length || !F || !F.on || rnd() < .1) return { tipo: 'furgo', tec, llevar: !(F && F.on) };
    for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) L[uno(mats)] = Math.floor(rnd() * 9) + (rnd() < .5 ? 1 : 0);
    return rnd() < .5 ? { tipo: 'furgo', tec, cuenta: L } : { tipo: 'furgo', tec, carga: Object.fromEntries(Object.entries(L).map(([k, n]) => [k, n || 1])) };
  }
  /* Como un aparato de verdad: antes de mandar nada, prueba la acción con las reglas sobre lo que él tiene. De cuatro
     al azar manda la primera que sus reglas dan por buena; si ninguna lo es, manda la última igualmente (también hay
     que ver qué hace el juez con lo que no vale). */
  function accionProbable(d) {
    let a = null;
    for (let i = 0; i < 4; i++) {
      a = accion(d);
      const S = Object.assign({ esq: K.ESQ, n: 0, nu: 0, ausencias: [] }, d.q.rol === 'centralita' && d.cab ? JSON.parse(JSON.stringify(d.cab)) : d.cab && d.cab.furgos ? { furgos: JSON.parse(JSON.stringify(d.cab.furgos)) } : {}, d.cab && d.cab.web ? { web: JSON.parse(JSON.stringify(d.cab.web)) } : {}, { v: d.v, avisos: JSON.parse(JSON.stringify([...d.avisos.values()].sort((x, y) => x.n - y.n))) });
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
    if (d.q.rol === 'tecnico') ley(igual(Object.keys(c.cab || {}).sort(), ['esq', 'furgos', 'web']) && c.cab.esq === K.ESQ && Object.keys(c.cab.furgos).every(k => k === d.q.id) && (c.cab.web === null || (typeof c.cab.web === 'object' && !Array.isArray(c.cab.web))), 'el-tecnico-recibe-solo-su-furgoneta', d.persona + ': ' + JSON.stringify(Object.keys((c.cab || {}).furgos || {})));
    else if (!c.entero) ley(('contratos' in (c.cab || {})) === (((c.cab || {}).vc || 0) > d.v), 'los-contratos-solo-cuando-cambian', d.persona + ' desde ' + d.v);
    if (c.entero) d.avisos.clear();
    for (const x of c.avisos) { if (x.fuera) d.avisos.delete(x.id); else d.avisos.set(x.id, x.datos); }
    const prev = d.cab || {}; d.v = c.v; d.cab = Object.assign({}, c.cab);
    if (d.q.rol === 'centralita' && !('contratos' in d.cab)) d.cab.contratos = c.entero ? [] : (prev.contratos || []);   // como el espejo: si no vienen, los de antes
  }
  async function manda(d, a, clave) {
    const r = await J.atiende({ que: 'hacer', negocio: d.neg, persona: d.persona, codigo: d.codigo, accion: a, desde: d.v, clave });
    ley(r && typeof r.ok === 'boolean', 'siempre-contesta'); ley(!(r.err === 'servidor'), 'sin-fallos-internos', JSON.stringify(a));
    const txt = JSON.stringify(r); for (const c of Object.values(CODS[d.neg] || {})) ley(!txt.includes(c), 'la-casa-no-ve-los-codigos-de-los-clientes');
    if (r.cambios) recibe(d, r.cambios);
    return r;
  }
  /* las leyes sobre lo guardado */
  function leyesAlmacen() {
    for (const [id, N] of Object.entries(NEG)) {
      const n = A.crudo(id), cfg = cfgs[id], S = K.nuevo();
      ley(n.diario.every((x, i) => x.v === i + 1) && n.v === n.diario.length, 'versiones-seguidas', id);
      let vc = 0;
      for (const x of n.diario) { const c0 = JSON.stringify(S.contratos || []), r = K.aplicar(S, cfg, JSON.parse(JSON.stringify(x.accion)), x.q, x.t); ley(r.ok && S.v === x.v, 'el-diario-se-puede-repetir', id + ' v' + x.v); if (JSON.stringify(S.contratos || []) !== c0) vc = x.v; }
      const guardado = [...n.avisos.values()].map(f => f.datos).sort((a, b) => a.n - b.n), sin = a => { const y = Object.assign({}, a); delete y.llave; return y; };
      /* las fotos (16-11-2026): ni en los avisos ni en el diario; cada referencia, con su foto guardada */
      ley(!JSON.stringify(guardado).includes('data:image') && !JSON.stringify(n.diario).includes('data:image'), 'las-fotos-van-aparte', id);
      for (const a of guardado) for (const r of [a.foto].concat(a.fotos || []).filter(Boolean)) ley(n.fotos && n.fotos.has(r) && n.fotos.get(r).datos.startsWith('data:image/'), 'cada-referencia-tiene-su-foto', a.id + ' ' + r);
      ley(igual(S.avisos, guardado.map(sin)), 'lo-guardado-es-el-diario', id);
      ley(igual(Object.assign({ esq: S.esq, n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [], contratos: S.contratos || [], nc: S.nc || 0, vc, furgos: S.furgos || {} }, S.web ? { web: S.web } : {}), Object.assign({ esq: 0, n: 0, nu: 0, ausencias: [], contratos: [], nc: 0, vc: 0, furgos: {} }, n.cab)), 'la-cabecera-es-el-diario', id);
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
    const orden = o => Object.fromEntries(Object.entries(Object.assign({}, o, { contratos: (o && o.contratos) || [], web: (o && o.web) || null })).sort(([x], [y]) => x < y ? -1 : 1));   // sin contratos guardados es como una lista vacía; sin servicios de la web cambiados, «null» (18-11-2026)
    if (d.q.rol === 'tecnico') ley(igual(((d.cab || {}).furgos || {})[d.q.id] || null, ((n.cab || {}).furgos || {})[d.q.id] || null), 'el-tecnico-tiene-su-furgoneta', d.persona);
    if (d.q.rol === 'centralita') ley(igual(orden(d.cab), orden(n.cab)), 'la-oficina-tiene-la-cabecera', Object.keys(Object.assign({}, d.cab, n.cab)).filter(k => !igual(d.cab[k], n.cab[k])).map(k => k + ': ' + String(JSON.stringify(d.cab[k])).slice(0, 80) + ' / ' + String(JSON.stringify(n.cab[k])).slice(0, 80)).join(' · '));
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
    if (si(.1)) {   // la zona del cliente: la oficina da un código (o lo cambia) y el cliente entra con él
      const neg = uno(Object.keys(NEG)), of = D.find(x => x.neg === neg && x.q.rol === 'centralita'), n = A.crudo(neg);
      const tels = [...new Set([...n.avisos.values()].map(f => K.tel9(f.datos.cli && f.datos.cli.tel)).filter(Boolean))];
      if (tels.length) {
        const tel = uno(tels), cambia = si(.2), antes = (CODS[neg] || {})[tel], v1 = n.v;
        const r = await J.atiende({ que: 'acceso', negocio: neg, persona: of.persona, codigo: of.codigo, tel, cambia });
        ley(r.ok && r.tel === tel && /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(r.codigo), 'la-oficina-recibe-el-codigo', JSON.stringify(r));
        ley(cambia || !antes ? r.nuevo === true && r.codigo !== antes : r.nuevo === false && r.codigo === antes, 'el-codigo-se-mantiene-o-se-cambia', tel);
        (CODS[neg] = CODS[neg] || {})[tel] = r.codigo;
        const p = await J.atiende({ que: 'perfil', negocio: neg, tel, codigo: r.codigo, red: 'zona' });
        const S = Object.assign({ esq: K.ESQ, n: 0, nu: 0, ausencias: [] }, JSON.parse(JSON.stringify(n.cab)), { v: n.v, avisos: [...n.avisos.values()].map(f => JSON.parse(JSON.stringify(f.datos))).sort((x, y) => (x.n || 0) - (y.n || 0)) });
        const Pf = K.perfilCliente(S, cfgs[neg], tel), sin = L => L.map(x => { const y = Object.assign({}, x); delete y.llave; return y; });
        ley(p.ok && igual(sin(p.perfil.avisos), Pf.avisos) && igual(p.perfil.cli, Pf.cli), 'la-zona-es-el-perfil-de-las-reglas', tel);
        ley(p.perfil.avisos.every(x => K.tel9(x.cli.tel) === tel && x.llave === n.avisos.get(x.id).llave), 'la-zona-lleva-solo-lo-suyo-con-sus-llaves', tel);
        if (antes && antes !== r.codigo) ley(igual(await J.atiende({ que: 'perfil', negocio: neg, tel, codigo: antes, red: 'zona' }), { ok: false, err: 'clave' }), 'el-codigo-cambiado-no-vale', tel);
        const otro = uno(Object.keys(NEG).filter(x => x !== neg)), tec = uno(D.filter(x => x.neg === neg && x.q.rol === 'tecnico'));
        ley(igual(await J.atiende({ que: 'perfil', negocio: otro, tel, codigo: r.codigo, red: 'zona' }), { ok: false, err: 'clave' }), 'el-codigo-no-vale-en-otro-negocio', tel);
        ley(igual(await J.atiende({ que: 'acceso', negocio: neg, persona: tec.persona, codigo: tec.codigo, tel }), { ok: false, err: 'permiso' }), 'un-tecnico-no-da-codigos');
        ley(n.v === v1, 'la-zona-no-cambia-los-avisos');
        n.fallosCli = []; A.crudo(otro).fallosCli = []; zonas++;
      }
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
  const contratos = Object.keys(NEG).reduce((s, id) => s + ((A.crudo(id).cab || {}).contratos || []).length, 0);
  return { pasos, aceptadas, rechazadas, adelantos, repetidas, zonas, estados, contratos };
}

const t0 = Date.now(); let tot = { pasos: 0, aceptadas: 0, rechazadas: 0, adelantos: 0, repetidas: 0, zonas: 0, contratos: 0 }; const est = {};
for (let i = 0; i < TANDAS; i++) {
  try { const r = await tanda(SEMILLA + i); for (const k of Object.keys(tot)) tot[k] += r[k]; for (const [k, n] of Object.entries(r.estados)) est[k] = (est[k] || 0) + n; }
  catch (e) { console.log(`ROTA en la tanda ${i} (semilla ${SEMILLA + i}): ${e instanceof Rota ? e.message : e.stack}`); console.log('Para repetirla: node azar-juez.mjs <sitio> --tandas 1 --semilla ' + (SEMILLA + i)); process.exit(1); }
}
console.log(`BIEN juez  ${tot.pasos} pasos con ${TANDAS * (Object.values(NEG).reduce((s, N) => s + N.tecnicos.length + 3, 0))} aparatos · ${tot.aceptadas} aceptadas, ${tot.rechazadas} rechazadas · ${tot.adelantos} veces se adelantó otro · ${tot.repetidas} repetidas · ${tot.zonas} veces en la zona del cliente · ${tot.contratos} contratos · ${comprobaciones} comprobaciones · ${((Date.now() - t0) / 1000).toFixed(1)} s · semilla ${SEMILLA}`);
console.log('          cómo acaban los avisos: ' + Object.entries(est).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' · '));
/* si los recorridos no llegan a todas partes, no prueban lo que dicen */
const faltan = ['nuevo', 'asignado', 'camino', 'curso', 'hecho', 'cancelado', 'ausente'].filter(k => !est[k]);
if (TANDAS >= 20 && (faltan.length || tot.adelantos < TANDAS || tot.repetidas < TANDAS || tot.zonas < TANDAS || tot.contratos < TANDAS)) { console.log('MAL: los recorridos no llegan a todo (faltan estados: ' + (faltan.join(', ') || 'ninguno') + '; adelantos ' + tot.adelantos + '; repetidas ' + tot.repetidas + '; zona del cliente ' + tot.zonas + ')'); process.exit(1); }
