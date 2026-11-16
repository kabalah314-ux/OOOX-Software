// Recorridos al azar por las reglas (js/oficio-nucleo.js), con leyes que siempre deben cumplirse.
// No lleva ningún dato de un negocio concreto: todo sale del archivo de datos, así que vale para cualquiera.
//
// Uso:  node azar.mjs <carpeta del sitio> [--negocio datos.js]... [--tandas 250] [--pasos 140] [--semilla 20261113]
//       Sin --negocio usa <carpeta del sitio>/js/oficio-datos.js. De cada negocio saca además dos variantes
//       extremas (la más pequeña y la más cargada) para que las leyes no dependan de un tamaño.
// Si una ley falla, dice la semilla, encoge el caso al mínimo y lo imprime para guardarlo como prueba fija.
import path from 'node:path';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';

const args = process.argv.slice(2), opc = { negocio: [], tandas: 250, pasos: 140, semilla: 20261113 };
let sitio = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--negocio') opc.negocio.push(args[++i]); else if (args[i].startsWith('--')) opc[args[i].slice(2)] = +args[++i]; else sitio = args[i];
}
if (!sitio) { console.log('Uso: node azar.mjs <carpeta del sitio> [--negocio datos.js]... [--tandas N] [--pasos N] [--semilla N]'); process.exit(2) }
const K = leeNucleo(sitio);
if (!opc.negocio.length) opc.negocio.push(path.join(sitio, 'js/oficio-datos.js'));

/* ---------- azar con semilla: la misma semilla da siempre el mismo recorrido ---------- */
function dado(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const M = 60000, H = 60 * M, D = 24 * H;
const FIRMA = 'M14 78C30 70 44 34 50 14 54 44 44 86 26 96';
const NOMBRES = ['Montse Vila', 'Pere Roca', 'Aitana Gil', 'Íñigo Sáez', 'Zoé D’Arc', 'Li Wei', 'Mª José Núñez-Ortega', 'Bo'];
const APELLIDOS = ['Vila', 'Roca i Puig', 'Gil', 'Sáez', 'D’Arc', 'Wei', 'Núñez-Ortega', 'Bo'];
const RAROS = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '', ' ', 'x'.repeat(300), '<img src=x onerror=alert(1)>', '😀🔧', null, 0, -1, 1e9, 0.1, {}, [], true, ['a'], { k: 'v' }];
const TRAMPAS = ['2026-10-24T20:30:00Z', '2027-03-27T21:00:00Z', '2026-12-31T21:30:00Z', '2027-12-23T08:00:00Z', '2026-11-13T15:30:00Z', '2028-02-28T10:00:00Z', '2026-12-07T07:00:00Z', '2027-08-13T05:55:00Z'].map(Date.parse);
const clon = o => JSON.parse(JSON.stringify(o));

/* ---------- las leyes ---------- */
class Rota extends Error { constructor(ley, detalle) { super(ley + ': ' + detalle); this.ley = ley; this.detalle = detalle } }
const rota = (ley, detalle) => { throw new Rota(ley, detalle) };
const SALTOS = new Set(['asignado>nuevo', 'nuevo>asignado', 'nuevo>cancelado', 'asignado>camino', 'asignado>curso', 'asignado>hecho', 'asignado>cancelado', 'camino>curso', 'camino>ausente', 'camino>hecho', 'curso>hecho', 'ausente>asignado', 'ausente>nuevo', 'ausente>cancelado']);
const SOLO_CENTRALITA = ['asignar', 'soltar', 'mover', 'cancelar', 'ausencia', 'quitarAusencia', 'facturar', 'cobroContrato', 'renovar', 'bajaContrato', 'descartar', 'escribir', 'garantia', 'corregirPago'], SOLO_SU_TECNICO = ['voy', 'ausente', 'empezar', 'noacepta', 'ampliar', 'pausa', 'terminar', 'posicion', 'sinPosicion'], LOS_DOS = ['completar', 'anotar', 'cobrar', 'enviado', 'falta', 'rebajar'];
const CON_TIPOS = ['contrato', 'cobroContrato', 'renovar', 'bajaContrato'];
const VISTA = ['id', 'av', 'e', 'urg', 'cita', 't', 'tec', 'eta', 'pos', 'sal', 'ini', 'fin', 'total', 'tipo', 'pago', 'gar', 'sinTrabajo', 'quien'];
const PERFIL_OK = ['id', 'av', 'e', 'urg', 't', 'cita', 'tec', 'ini', 'fin', 'min', 'sinTrabajo', 'pres', 'amp', 'tot', 'pago', 'gar', 'obs', 'conf', 'fotos', 'fac', 'cli', 'con', 'vista', 'enGar', 'rebajas'];   // lo que puede llevar cada aviso del perfil del cliente
const FEO = /undefined|NaN|\bnull\b|\[object|Invalid|Infinity/;
const FEO_MSG = /undefined|NaN|\bnull\b|\[object|Invalid|Infinity|\(\)|(^|[^\d.])0,00 €/;   // en lo que se manda al cliente, tampoco «()» ni «0,00 €»: una forma de pago vacía o un total a cero dichos tal cual (16-11-2026)
function numerosLimpios(o, donde) {
  if (typeof o === 'number') { if (!Number.isFinite(o)) rota('numeros-limpios', donde + ' = ' + o) }
  else if (typeof o === 'function') rota('numeros-limpios', donde + ' es una función')
  else if (Array.isArray(o)) o.forEach((x, i) => { if (x === undefined) rota('numeros-limpios', donde + '[' + i + '] sin valor'); numerosLimpios(x, donde + '[' + i + ']') })
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) numerosLimpios(o[k], donde + '.' + k);
}
const entero = (x, donde) => { if (!Number.isInteger(x) || x < 0) rota('dinero-en-centimos', donde + ' = ' + x) };

const diaSemI = f => new Date(f + 'T12:00:00Z').getUTCDay();
const conH = N => !!(N.horario || N.tecnicos.some(x => x.horario));
const trabI = (N, tec, dia, de, a) => { const x = N.tecnicos.find(z => z.id === tec), h = x ? (x.horario || N.horario || null) : null; if (!h) return !conH(N); return (h[diaSemI(dia)] || []).some(t => t[0] <= de && t[1] >= a) };
const ausI = (S, tec, dia) => (S.ausencias || []).some(u => u.tec === tec && u.de <= dia && u.a >= dia);
// lo que cabe de verdad en una franja (el tope de la oficina) y lo que se ofrece al cliente (eso menos lo guardado para urgencias)
const topeI = (N, S, dia, f) => conH(N) ? N.tecnicos.filter(x => trabI(N, x.id, dia, f.de, f.a) && !ausI(S, x.id, dia)).length * ((N.citas && N.citas.porFranja) || 1) : N.cupo;
// lo que se guarda para urgencias ese día: la reserva; si el dueño ha dicho que no los días que falta alguien, esos días nada
const trabDiaI = (N, tec, dia) => { const x = N.tecnicos.find(z => z.id === tec), h = x ? (x.horario || N.horario || null) : null; return h ? (h[diaSemI(dia)] || []).length > 0 : !conH(N) };
const resI = (N, S, dia) => { const r = (N.citas && N.citas.reserva) || 0; if (!r || !(N.citas && N.citas.reservaSiFalta === false)) return r;
  return N.tecnicos.some(x => ausI(S, x.id, dia) && trabDiaI(N, x.id, dia)) ? 0 : r };
const capI = (N, S, dia, f) => conH(N) ? Math.max(0, topeI(N, S, dia, f) - resI(N, S, dia)) : N.cupo;
const cap0 = (N, S, A, f) => capI(N, S, A.cita.dia, f) - (enFr(S, A.cita.dia, A.cita.fr) - 1) > 0;
const enFr = (S, dia, fr) => S.avisos.filter(a => a.cita && a.cita.dia === dia && a.cita.fr === fr && a.e !== 'cancelado').length;
// por tiempo, lo que ocupa una franja: una cita que ya se empezó o se hizo antes de su día, de alguien que ese día falta o no
// trabaja esa franja, ya no ocupa a nadie (lo encontró el recorrido de la demo «en uso», 16-11-2026)
const enFrT = (N, S, dia, f) => S.avisos.filter(a => a.cita && a.cita.dia === dia && a.cita.fr === f.id && a.e !== 'cancelado' && !(['camino', 'curso', 'hecho'].includes(a.e) && a.tec && (ausI(S, a.tec, dia) || !trabI(N, a.tec, dia, f.de, f.a)))).length;
const laborI = (N, f) => { const w = diaSemI(f); return w >= 1 && w <= 5 && !(N.festivos || []).includes(f) };

function mundo(cfg, N, ini) {
  const W = { cfg, N, S: null, firmado: new Map(), amps: new Map(), acept: {}, rech: {}, estados: new Set(), leyes: 0 };
  W.S = ini.muestra ? ini.muestra(K, cfg, ini.t0) : K.nuevo();
  W.S.avisos.forEach(A => { if (A.pres) W.firmado.set(A.id, JSON.stringify(A.pres)); if (A.amp) W.amps.set(A.id, A.amp.map(x => JSON.stringify(x))) });
  return W;
}

/* aplica una acción y comprueba todas las leyes; devuelve la respuesta del núcleo */
function paso(W, a, q, t) {
  const { S, cfg } = W, antes = JSON.stringify(S), a0 = JSON.stringify(a), q0 = JSON.stringify(q), v0 = S.v, n0 = S.avisos.length;
  const tipo = a && typeof a === 'object' ? a.tipo : undefined, idA = a && typeof a === 'object' ? a.id : undefined;
  const A0 = typeof idA === 'string' ? S.avisos.find(x => x.id === idA) : null, e0 = A0 ? A0.e : '', tec0 = A0 ? A0.tec : '';
  const otros0 = new Map(S.avisos.filter(x => x !== A0).map(x => [x.id, JSON.stringify(x)]));
  const Av0 = tipo === 'contrato' && a && typeof a.aviso === 'string' ? S.avisos.find(x => x.id === a.aviso) : null, Av0j = Av0 ? JSON.stringify(Av0) : '';
  const fz0 = JSON.stringify(S.furgos === undefined ? null : S.furgos);   // la furgoneta de cada técnico, antes (16-11-2026)
  let r;
  try { r = K.aplicar(S, cfg, a, q, t) } catch (e) { rota('no-revienta', (tipo || '¿?') + ' → ' + e.message) }
  W.leyes++;
  if (JSON.stringify(a) !== a0 || JSON.stringify(q) !== q0) rota('no-toca-lo-que-recibe', String(tipo));
  if (!r || typeof r.ok !== 'boolean') rota('siempre-contesta', String(tipo));
  if (!r.ok) {
    if (JSON.stringify(S) !== antes) rota('rechazo-limpio', tipo + ' rechazada con «' + r.err + '» pero ha cambiado algo');
    if (typeof r.err !== 'string' || !r.err) rota('rechazo-con-motivo', String(tipo));
    W.rech[r.err] = (W.rech[r.err] || 0) + 1; W.leyes += 2; return r;
  }
  W.acept[tipo] = (W.acept[tipo] || 0) + 1;
  // --- quién puede qué
  const rol = q && q.rol, suyo = rol === 'tecnico' && !!tec0 && tec0 === q.id;
  if (SOLO_CENTRALITA.includes(tipo) && rol !== 'centralita') rota('cada-uno-lo-suyo', tipo + ' hecho por ' + rol);
  if (SOLO_SU_TECNICO.includes(tipo) && !suyo) rota('cada-uno-lo-suyo', tipo + ' hecho por ' + rol + ' ' + (q && q.id) + ' sobre un aviso de «' + tec0 + '»');
  if (LOS_DOS.includes(tipo) && rol !== 'centralita' && !suyo) rota('cada-uno-lo-suyo', tipo + ' hecho por ' + rol);
  if (tipo === 'ausencia' || tipo === 'quitarAusencia') { if (rol !== 'centralita') rota('cada-uno-lo-suyo', tipo + ' hecho por ' + rol) }
  if (tipo === 'contrato' && rol !== 'centralita') { const C1 = (S.contratos || []).find(c => c.id === r.id);   // el técnico: desde un aviso suyo, en casa del cliente y para ese teléfono
    if (rol !== 'tecnico' || !Av0 || Av0.tec !== q.id || !['curso', 'hecho'].includes(JSON.parse(Av0j).e) || !C1 || C1.cli.tel !== JSON.parse(Av0j).cli.tel) rota('cada-uno-lo-suyo', 'contrato dado de alta por ' + rol + ' ' + (q && q.id)) }
  if (tipo === 'furgo' && rol !== 'centralita' && !(rol === 'tecnico' && q.id === a.tec)) rota('cada-uno-lo-suyo', 'la furgoneta de ' + a.tec + ' tocada por ' + rol + ' ' + (q && q.id));
  if (!['pedir', 'contrato', 'furgo'].concat(SOLO_CENTRALITA, SOLO_SU_TECNICO, LOS_DOS).includes(tipo)) rota('acciones-conocidas', 'se ha aceptado «' + tipo + '»');
  // --- contador, y nada cambia fuera del aviso tocado
  if (S.v !== v0 + 1) rota('version-sube-de-uno-en-uno', v0 + ' → ' + S.v);
  if (S.avisos.length !== n0 + (tipo === 'pedir' ? 1 : 0)) rota('nadie-desaparece', n0 + ' → ' + S.avisos.length);
  if (tipo === 'escribir') { const t9 = K.tel9(a.tel), sinS = o => { const c = Object.assign({}, o); delete c.noMsg; delete c.msgs; delete c.v; delete c.h; return JSON.stringify(c) };
    for (const x of S.avisos) { const j = otros0.get(x.id); if (j === undefined || JSON.stringify(x) === j) continue; const y = JSON.parse(j);
      if (x.cli.tel !== t9) rota('no-quiere-solo-ese-telefono', x.id + ' tiene otro teléfono');
      if (sinS(x) !== sinS(y) || x.h.length > y.h.length + 1 || x.msgs.some(m => !y.msgs.some(n => JSON.stringify(n) === JSON.stringify(m)))) rota('no-quiere-solo-toca-lo-suyo', x.id) } }
  if (tipo !== 'ausencia' && tipo !== 'contrato' && tipo !== 'escribir') for (const x of S.avisos) { const j = otros0.get(x.id); if (j !== undefined && x.id !== idA && JSON.stringify(x) !== j) rota('solo-cambia-el-aviso-tocado', tipo + ' sobre ' + idA + ' ha cambiado ' + x.id) }
  if (tipo === 'contrato') for (const x of S.avisos) { const j = otros0.get(x.id); if (j === undefined || JSON.stringify(x) === j) continue; const y = JSON.parse(j), sin = o => { const c = Object.assign({}, o); delete c.con; delete c.h; delete c.v; return JSON.stringify(c) };
    if (Av0 && x.id === Av0.id) { if (sin(x) !== sin(y) || JSON.stringify(x.con) !== JSON.stringify(y.con) || x.h.length !== y.h.length + 1) rota('el-alta-del-tecnico-solo-lo-apunta-en-su-aviso', x.id); continue }
    if (sin(x) !== sin(y) || !x.con || x.con.id !== r.id || x.h.length !== y.h.length + 1 || y.pres || y.tot) rota('el-alta-solo-pone-el-contrato', x.id) }
  numerosLimpios(S, 'S');
  const ids = new Set();
  for (const x of S.avisos) { if (ids.has(x.id)) rota('numeros-unicos', x.id); ids.add(x.id); if (!new RegExp('^' + W.N.serie + '-\\d{4,}$').test(x.id)) rota('numeros-unicos', 'forma rara: ' + x.id); W.estados.add(x.e) }
  // --- el aviso tocado
  const A = tipo === 'pedir' ? S.avisos[S.avisos.length - 1] : A0;
  if (A) {
    if (tipo === 'pedir') { if (A.e !== 'nuevo') rota('salto-permitido', 'nace en ' + A.e) }
    else if (A.e !== e0 && !SALTOS.has(e0 + '>' + A.e)) rota('salto-permitido', e0 + ' → ' + A.e + ' con ' + tipo);
    unAviso(W, A, t);
    // es garantía (16-11-2026): de un trabajo terminado, con trabajo, del mismo cliente; y solo se marca o se quita antes de empezar
    if (A.enGar) { const G = S.avisos.find(x => x.id === A.enGar.de);
      if (!G || G.id === A.id || G.e !== 'hecho' || G.sinTrabajo || !(K.tel9(G.cli.tel) === K.tel9(A.cli.tel) || (K.normDir ? K.normDir(G.cli.dir) === K.normDir(A.cli.dir) : G.cli.dir === A.cli.dir))) rota('garantia-de-un-trabajo-suyo', A.id + ' → ' + JSON.stringify(A.enGar));
      if (!Array.isArray(A.enGar.k) || A.enGar.k.some(k => !cfg.cat[k] || k === 'otro')) rota('garantia-de-lo-del-catalogo', A.id) }
    if (tipo === 'garantia' && !['nuevo', 'asignado', 'camino', 'ausente'].includes(e0)) rota('garantia-antes-de-empezar', A.id + ' en ' + e0);
    if (tipo === 'rebajar' && A.fac) rota('lo-facturado-no-se-rebaja', A.id);
  }
  // --- los tiempos de llegada a una urgencia y el suplemento (15-11-2026), mirados en un barrio y un aviso cualquiera
  { const dises = Object.keys(cfg.zonas.dis), dis = dises[W.leyes % dises.length], av = W.N.averias[W.leyes % W.N.averias.length].id, hoy = K.madrid(t).date;
    const L = K.llegadas(S, cfg, dis, t, av), vistos = new Set(), pen = x => (x.choca || x.fuera) ? 1 : 0;
    L.forEach((x, i) => { if (vistos.has(x.tec)) rota('llegadas-sin-repetir', x.tec); vistos.add(x.tec);
      if (!(x.libre >= 0 && x.viaje === cfg.zonas.banda[cfg.zonas.dis[dis][1]] && x.llega === x.libre + x.viaje && Number.isInteger(x.llega))) rota('llegadas-cuadran', JSON.stringify(x));
      if ((S.ausencias || []).some(u => u.tec === x.tec && u.de <= hoy && u.a >= hoy)) rota('llegadas-sin-ausentes', x.tec);
      if (i && (pen(L[i - 1]) > pen(x) || (pen(L[i - 1]) === pen(x) && L[i - 1].llega > x.llega))) rota('llegadas-en-orden', JSON.stringify(L)) });
    const ok = L.filter(x => !pen(x)), u = K.urgenciaAhora(S, cfg, dis, t, av);
    if (!ok.length ? u !== null : !(u && u.tec === ok[0].tec && u.de % 5 === 0 && u.de >= ok[0].llega && u.de < ok[0].llega + 15 && u.a === u.de + 15)) rota('lo-que-se-promete-sale-de-las-llegadas', JSON.stringify(u));
    const X = S.avisos.length ? S.avisos[W.leyes % S.avisos.length] : null;
    if (X) { const lleva = K.iniDe(cfg, X).some(l => l.k === cfg.urge); if (lleva !== (!!cfg.urge && !X.cita && X.av !== K.REV)) rota('suplemento-solo-en-urgencias', X.id) } }
  // --- nadie en dos sitios, y ninguna franja pasa de su cupo
  const enMarcha = {}, porFranja = {};
  for (const x of S.avisos) {
    if (x.e === 'camino' || x.e === 'curso') { if (enMarcha[x.tec]) rota('un-tecnico-un-aviso', x.tec + ' está en ' + enMarcha[x.tec] + ' y en ' + x.id); enMarcha[x.tec] = x.id }
    if (x.cita && x.e !== 'cancelado' && !conH(W.N)) { const k = x.cita.dia + ' ' + x.cita.fr; porFranja[k] = (porFranja[k] || 0) + 1; if (porFranja[k] > cfg.cupo) rota('cupo', k + ' lleva ' + porFranja[k] + ' citas y caben ' + cfg.cupo) }
  }
  horarios(W, tipo, A, a, q, t);
  furgoneta(W, tipo, A, a, q, t, fz0);
  // --- el mapa: una posición solo existe mientras el técnico va de camino, solo si el negocio lo tiene activado, y es una sola
  for (const x of S.avisos) {
    if (x.pos !== undefined) { if (x.e !== 'camino') rota('posicion-solo-de-camino', x.id + ' está en «' + x.e + '» y guarda posición');
      if (!W.N.mapa) rota('posicion-solo-si-el-negocio-quiere', x.id);
      if (x.posNo) rota('posicion-borrada-si-deja-de-compartir', x.id);
      const p = x.pos; if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number' || !(p.lat >= -90 && p.lat <= 90) || !(p.lon >= -180 && p.lon <= 180) || !Number.isFinite(p.t) || Object.keys(p).sort().join() !== 'lat,lon,t') rota('posicion-bien-formada', x.id + ': ' + JSON.stringify(p)) }
    if (x.posNo !== undefined && x.e !== 'camino') rota('marca-de-no-compartir-solo-de-camino', x.id + ' en «' + x.e + '»');
    let V; try { V = K.vistaCliente(S, cfg, x.id) } catch (e) { rota('vista-no-revienta', e.message) }
    if ((V.pos !== null) !== (x.e === 'camino' && x.pos !== undefined)) rota('el-cliente-ve-la-posicion-solo-de-camino', x.id) }
  if ((tipo === 'posicion' || tipo === 'sinPosicion') && A && !(q && q.rol === 'tecnico' && q.id === A.tec)) rota('la-posicion-es-cosa-del-tecnico', A.id + ' por ' + JSON.stringify(q));
  // --- lo que ven la centralita y el cliente
  let R; try { R = K.resumen(S, cfg, t) } catch (e) { rota('resumen-no-revienta', e.message) }
  if (R.caja.total !== R.caja.efectivo + R.caja.tarjeta + R.caja.bizum + R.caja.transferencia) rota('caja-cuadra', JSON.stringify(R.caja));
  const pend = S.avisos.filter(x => x.e === 'hecho' && x.pago && x.tot && !x.pago.cobrado);
  if (R.pend.n !== pend.length || R.pend.total !== pend.reduce((s, x) => s + x.tot.total, 0)) rota('pendientes-cuadran', JSON.stringify(R.pend));
  numerosLimpios(R, 'resumen');
  if (Object.keys(R.canal).join() !== K.ORIGEN.join() || Object.values(R.canal).some(n => !Number.isInteger(n) || n < 0) || Object.values(R.canal).reduce((a, b) => a + b, 0) > S.avisos.length) rota('cifras-por-canal', JSON.stringify(R.canal));
  if (A) { let V; try { V = K.vistaCliente(S, cfg, A.id) } catch (e) { rota('vista-no-revienta', e.message) } for (const k of Object.keys(V)) if (!VISTA.includes(k)) rota('el-cliente-ve-lo-justo', 've «' + k + '»') }
  // --- el desistimiento: lo que lo necesita queda firmado con la petición del cliente; lo facturado está terminado y cobra algo
  for (const x of S.avisos) {
    if (x.pres && x.pres.des) { const d = x.pres.des; if (x.cita && d.c !== 'cita') rota('desistimiento-con-cita', x.id); if (K.pideYa(d.c) && !(d.pide > 0)) rota('desistimiento-con-peticion', x.id) }
    for (const m of x.amp || []) if (m.des && K.pideYa(m.des.c) && !(m.des.pide > 0)) rota('desistimiento-con-peticion', x.id + ', ampliación');
    if (x.fac && !(x.e === 'hecho' && x.tot && x.tot.total > 0)) rota('facturado-solo-lo-terminado', x.id) }
  { const pf = K.porFacturar(S, t).map(x => x.id).sort().join(), deben = S.avisos.filter(x => x.e === 'hecho' && x.tot && x.tot.total > 0 && !x.fac).map(x => x.id).sort().join();
    if (pf !== deben) rota('por-facturar-cuadra', pf + ' / ' + deben); if (R.porFac.n !== K.porFacturar(S, t).length || R.porFac.viejos > R.porFac.n) rota('por-facturar-cuadra', JSON.stringify(R.porFac)) }
  W.leyes += 4;
  // --- el material que falta: lista corta, cantidades posibles, del catálogo solo material, sin repetidos; y lo juntado cuadra
  { const dias = new Set(); let suma = 0;
    for (const x of S.avisos) { if (x.falta === undefined) continue; const L = x.falta;
      if (!Array.isArray(L) || !L.length || L.length > 12) rota('material-en-su-sitio', x.id + ': ' + JSON.stringify(L).slice(0, 80));
      const vistos = new Set();
      for (const c of L) { if (!c || typeof c.t !== 'string' || !c.t || c.t.length > 60 || c.t !== c.t.trim() || !Number.isInteger(c.q) || c.q < 1 || c.q > 20) rota('material-en-su-sitio', x.id + ': ' + JSON.stringify(c));
        if (c.k !== undefined && !(cfg.cat[c.k] && cfg.cat[c.k].mat && cfg.cat[c.k].t === c.t)) rota('material-del-catalogo', x.id + ': ' + c.k);
        const id = c.k !== undefined ? 'k:' + c.k : 't:' + c.t.toLowerCase(); if (vistos.has(id)) rota('material-sin-repetir', x.id + ': ' + id); vistos.add(id) }
      if (x.e !== 'hecho' && x.e !== 'cancelado') { dias.add(x.cita ? x.cita.dia : ''); suma += L.reduce((n, c) => n + c.q, 0) } }
    let junto = 0; for (const d of dias) { let G; try { G = K.material(S, cfg, d) } catch (e) { rota('material-no-revienta', e.message) }
      for (const g of G) for (const c of g.cosas) { junto += c.q; for (const id of c.av) { const y = S.avisos.find(z => z.id === id); if (!y || (y.cita ? y.cita.dia : '') !== d || (g.tec || '') !== (y.tec && cfg.tec[y.tec] ? y.tec : '')) rota('material-juntado-en-su-dia', id + ' en ' + d) } } }
    if (junto !== suma) rota('material-juntado-cuadra', junto + ' / ' + suma);
    if (tipo === 'falta' && A && (A.e === 'hecho' || A.e === 'cancelado')) rota('material-solo-en-lo-abierto', A.id) }
  W.leyes += 4;
  // --- los contratos: bien hechos, uno vigente por cliente y finca, y lo que dan a los avisos cuadra
  { const Cs = S.contratos || [], hoy = K.madrid(t).date, ids = new Set();
    if (S.contratos !== undefined && !Array.isArray(S.contratos)) rota('contratos-en-su-sitio', 'no es una lista');
    for (const X of Cs) {
      if (ids.has(X.id)) rota('contratos-numeros-unicos', X.id); ids.add(X.id);
      if (!new RegExp('^' + W.N.serie + 'M-\\d{4,}$').test(X.id)) rota('contratos-numeros-unicos', 'forma rara: ' + X.id);
      if (!['activo', 'baja'].includes(X.e) || !cfg.planes[X.plan] || !Array.isArray(X.per) || !X.per.length) rota('contratos-en-su-sitio', X.id);
      if (!K.tel9(X.cli.tel) || !X.cli.nombre || !X.cli.dir) rota('contratos-con-sus-datos', X.id);
      if (X.acepta === 'firma' ? !(typeof X.firma === 'string' && X.firma.length >= 12) : X.acepta !== 'mensaje') rota('contratos-aceptados', X.id);
      X.per.forEach((p, i) => { if (p.a !== K.masDias(K.masMeses(p.de, 12), -1)) rota('contratos-un-año', X.id + ' ' + p.de + '–' + p.a); if (i && p.de <= X.per[i - 1].a) rota('contratos-sin-pisarse', X.id); entero(p.precio, X.id + '.precio');
        if (typeof p.pago.cobrado !== 'boolean' || (p.pago.cobrado ? !K.PAGOS.includes(p.pago.modo) || p.pago.modo === 'pendiente' : p.pago.modo !== 'pendiente')) rota('contratos-pago-claro', X.id) });
      if (X.e === 'baja' && !(X.baja && typeof X.baja.des === 'boolean')) rota('contratos-baja-clara', X.id) }
    const claves = new Set();
    for (const X of Cs.filter(X => K.vigente(X, hoy))) { const k = K.tel9(X.cli.tel) + '|' + K.fincaDe(X.cli.dir); if (claves.has(k)) rota('contratos-uno-por-finca', k); claves.add(k) }
    const usadas = {};
    for (const x of S.avisos) { if (!x.con) continue; const X = Cs.find(c => c.id === x.con.id); if (!X) { rota('con-de-un-contrato', x.id); continue }
      if (x.con.rev && x.av !== K.REV) rota('revision-solo-en-la-revision', x.id);
      if (x.con.rev && x.e !== 'cancelado') { const k = x.con.id + '/' + x.con.per; usadas[k] = (usadas[k] || 0) + 1; if (usadas[k] > cfg.planes[X.plan].revisiones) rota('revisiones-las-del-plan', k) }
      for (const l of (x.tot && x.tot.lineas) || []) if (l.con && l.imp !== 0) rota('lo-incluido-a-cero', x.id) }
    for (const x of S.avisos) if (x.e === 'hecho' && x.tot && x.tot.total === 0 && !(x.pago && x.pago.cobrado && x.pago.modo === '')) rota('a-cero-sin-pago', x.id);
    let P2; try { P2 = K.pendientesContratos(S, cfg, t) } catch (e) { rota('pendientes-contratos-no-revienta', e.message) }
    for (const y of P2.cobrar) { const X = Cs.find(c => c.id === y.id); if (!X || X.per[X.per.length - 1].pago.cobrado) rota('pendientes-contratos-cuadran', y.id) }
    if (CON_TIPOS.includes(tipo) && r && r.ok && tipo !== 'contrato' && !Cs.some(c => c.id === idA)) rota('contratos-acciones-sobre-uno', tipo) }
  W.leyes += 8;
  // --- el perfil del cliente: todo lo suyo, nada de otro, nada interno, lo último primero; y es una copia
  if (A && A.cli && K.tel9(A.cli.tel)) {
    let P; try { P = K.perfilCliente(S, cfg, A.cli.tel) } catch (e) { rota('perfil-no-revienta', e.message) }
    const t9 = K.tel9(A.cli.tel), suyos = S.avisos.filter(x => x.cli && K.tel9(x.cli.tel) === t9);
    if (!P || P.tel !== t9 || P.avisos.length !== suyos.length) rota('perfil-todo-lo-suyo', A.id + ': ' + (P ? P.avisos.length : 'nada') + ' de ' + suyos.length);
    for (const x of P.avisos) { if (K.tel9(x.cli.tel) !== t9) rota('perfil-solo-lo-suyo', x.id); for (const k of Object.keys(x)) if (!PERFIL_OK.includes(k)) rota('perfil-sin-lo-interno', x.id + ' lleva «' + k + '»') }
    for (let i = 1; i < P.avisos.length; i++) if (P.avisos[i - 1].t < P.avisos[i].t) rota('perfil-lo-ultimo-primero', P.avisos[i].id);
    { const con = suyos.filter(x => (x.cli.nombre || '').trim() && (x.cli.dir || '').trim()).sort((x, y) => y.t - x.t)[0];   // sus datos: los del último aviso que los tiene
      if (con && (P.cli.nombre !== con.cli.nombre || P.cli.dir !== con.cli.dir)) rota('perfil-con-sus-datos', A.id + ': ' + JSON.stringify(P.cli)) }
    for (const x of P.avisos) { const Y = S.avisos.find(y => y.id === x.id);   // una copia: nada de lo que lleva es lo mismo que guarda el aviso
      for (const k of Object.keys(x)) if (x[k] && typeof x[k] === 'object' && Y[k] === x[k]) rota('perfil-es-una-copia', x.id + '.' + k);
      for (const k of ['tot', 'pres']) if (x[k] && x[k].lineas && Y[k].lineas === x[k].lineas) rota('perfil-es-una-copia', x.id + '.' + k + '.lineas') }
    W.leyes += 6 }
  try { K.diasDe(S, cfg, t, 6).forEach(d => d.franjas.forEach(f => { if (f.ok && !(f.libres > 0)) rota('franja-ofrecida-con-hueco', d.dia + ' ' + f.id) })) } catch (e) { if (e instanceof Rota) throw e; rota('citas-no-revientan', e.message) }
  W.leyes += 21; return r;
}

/* ---- las leyes de los horarios: el cliente solo ve huecos reales y la oficina solo asigna a quien puede ---- */
/* ---------- la furgoneta (16-11-2026) ----------
   Solo la cambian «furgo» (la de quien se dice) y «terminar» (la de su técnico, si lleva la cuenta: lo usado, nunca por debajo
   de cero). Siempre bien formada. Y lo que se calcula para cargar cuadra con lo que lleva cada trabajo y con lo que hay. */
function furgoneta(W, tipo, A, a, q, t, fz0) {
  const { S, cfg } = W, F0 = JSON.parse(fz0) || {}, F1 = S.furgos || {}, FH = K.FURGO_H;
  for (const tec of Object.keys(F1)) { const F = F1[tec];
    if (!cfg.tec[tec] || !F || typeof F.on !== 'boolean' || !F.st || typeof F.st !== 'object' || Array.isArray(F.st) || !Array.isArray(F.h) || F.h.length > FH || !Number.isFinite(F.cnt) || !Number.isFinite(F.t)) rota('furgoneta-bien-formada', tec + ': ' + JSON.stringify(F).slice(0, 200));
    for (const k of Object.keys(F.st)) if (!cfg.cat[k] || !cfg.cat[k].mat || !Number.isInteger(F.st[k]) || F.st[k] < 1 || F.st[k] > 9999) rota('furgoneta-bien-formada', tec + '.' + k + ' = ' + F.st[k]);
    F.h.forEach(x => { if (!Number.isFinite(x.t) || typeof x.q !== 'string' || typeof x.txt !== 'string' || FEO.test(x.txt)) rota('furgoneta-bien-formada', tec + ': «' + JSON.stringify(x) + '»') }) }
  const igualF = (x, y) => JSON.stringify(x === undefined ? null : x) === JSON.stringify(y === undefined ? null : y);
  if (tipo !== 'furgo' && tipo !== 'terminar' && JSON.stringify(S.furgos === undefined ? null : S.furgos) !== fz0) rota('furgoneta-solo-con-furgo-o-terminar', String(tipo));
  if (tipo === 'furgo') {
    for (const tec of new Set(Object.keys(F0).concat(Object.keys(F1)))) if (tec !== a.tec && !igualF(F0[tec], F1[tec])) rota('furgoneta-solo-la-suya', a.tec + ' ha cambiado la de ' + tec);
    const x = F0[a.tec] || { on: false, st: {} }, y = F1[a.tec], st0 = x.st || {};
    if (!y) rota('furgoneta-existe', a.tec);
    if ((a.cuenta != null || a.carga != null) && !x.on) rota('sin-cuenta-no-se-cuenta-ni-se-carga', a.tec);
    if (a.llevar === true && (!y.on || x.on || !igualF(y.st, x.on === false ? x.st : {}))) rota('furgoneta-llevar', JSON.stringify(y).slice(0, 200));
    if (a.llevar === false && (y.on || !x.on || !igualF(y.st, st0))) rota('furgoneta-dejar-guarda-lo-que-hay', JSON.stringify(y).slice(0, 200));
    if (a.cuenta && typeof a.cuenta === 'object') { for (const k of Object.keys(cfg.cat)) { const e = Object.prototype.hasOwnProperty.call(a.cuenta, k) ? a.cuenta[k] : (st0[k] || 0); if ((y.st[k] || 0) !== e) rota('recuento-queda-tal-cual', k + ': ' + (y.st[k] || 0) + ' y se dijo ' + e) }
      if (y.cnt !== t) rota('recuento-con-fecha', a.tec) }
    if (a.carga && typeof a.carga === 'object') for (const k of Object.keys(cfg.cat)) { const e = Math.min(9999, (st0[k] || 0) + (Object.prototype.hasOwnProperty.call(a.carga, k) ? a.carga[k] : 0)); if ((y.st[k] || 0) !== e) rota('lo-cargado-se-suma', k + ': ' + (y.st[k] || 0) + ' y tocaba ' + e) }
  }
  if (tipo === 'terminar' && A) {
    const x = F0[A.tec], y = F1[A.tec];
    for (const tec of new Set(Object.keys(F0).concat(Object.keys(F1)))) if (tec !== A.tec && !igualF(F0[tec], F1[tec])) rota('terminar-solo-su-furgoneta', A.id + ' ha cambiado la de ' + tec);
    if (!x || !x.on) { if (!igualF(x, y)) rota('sin-cuenta-no-se-descuenta', A.id) }
    else { const usa = {}; A.lin.forEach(l => { if (l.k !== 'otro' && cfg.cat[l.k] && cfg.cat[l.k].mat) usa[l.k] = (usa[l.k] || 0) + Math.round(+l.q || 0) });
      for (const k of Object.keys(cfg.cat)) { const e = Math.max(0, (x.st[k] || 0) - (usa[k] || 0)); if ((y.st[k] || 0) !== e) rota('al-terminar-se-descuenta-lo-usado', A.id + ' ' + k + ': ' + (y.st[k] || 0) + ' y tocaba ' + e) }
      const hayLog = A.h.some(h => h.t === t && h.txt.startsWith('Descontado de la furgoneta')); if (Object.keys(usa).some(k => usa[k] > 0) !== hayLog) rota('lo-descontado-queda-apuntado', A.id); W.furgoTerm = (W.furgoTerm || 0) + 1 }
  }
  // lo que se calcula para cargar, para un técnico y un día cualquiera
  { const tecs = Object.keys(cfg.tec), tec = tecs[W.leyes % tecs.length], hoy = K.madrid(t).date, dia = W.leyes % 2 ? hoy : K.masDias(hoy, 1), c = K.cargaDe(S, cfg, tec, dia, t), F = K.furgoDe(S, tec);
    const mios = S.avisos.filter(x => x.tec === tec && ['asignado', 'camino', 'curso'].includes(x.e) && ((x.e !== 'asignado' || !x.cita || x.cita.dia < hoy) ? hoy : x.cita.dia) === dia).map(x => x.id);
    if (c.av.join() !== mios.join()) rota('carga-de-sus-avisos-de-ese-dia', tec + ' ' + dia + ': ' + c.av.join() + ' / ' + mios.join());
    const suma = {}; mios.forEach(id => K.lleva(cfg, S.avisos.find(x => x.id === id)).lin.forEach(l => { suma[l.k] = (suma[l.k] || 0) + l.q }));
    if (c.lin.length !== Object.keys(suma).length || c.lin.some(l => l.q !== suma[l.k] || !cfg.cat[l.k].mat)) rota('carga-suma-lo-de-cada-trabajo', tec + ' ' + dia);
    if (c.quiza.some(x => !cfg.cat[x.k].mat || cfg.cat[x.k].extra || x.q !== 1)) rota('por-si-acaso-una-de-cada', tec);
    if (!!F !== c.furgo) rota('carga-sabe-si-lleva-la-cuenta', tec);
    if (F) { const hay = k => F.st[k] || 0, kit = K.kitDe(cfg, tec), nec = Object.assign({}, suma); c.quiza.forEach(x => { nec[x.k] = (nec[x.k] || 0) + 1 });
      const fa = Object.keys(nec).filter(k => nec[k] > hay(k)); if (c.falta.length !== fa.length || c.falta.some(x => x.q !== nec[x.k] - hay(x.k) || x.q < 1)) rota('le-falta-lo-que-no-hay', tec + ' ' + JSON.stringify(c.falta));
      const rp = Object.keys(kit).filter(k => hay(k) < kit[k][0]); if (c.reponer.length !== rp.length || c.reponer.some(x => x.q !== kit[x.k][1] - hay(x.k))) rota('reponer-hasta-el-maximo', tec + ' ' + JSON.stringify(c.reponer));
      if (c.cargar.some(x => x.q !== Math.max((c.falta.find(y => y.k === x.k) || { q: 0 }).q, (c.reponer.find(y => y.k === x.k) || { q: 0 }).q)) || c.cargar.length !== new Set(c.falta.map(x => x.k).concat(c.reponer.map(x => x.k))).size) rota('cargar-lo-mayor', tec) } }
  W.leyes += 12;
}

function horarios(W, tipo, A, a, q, t) {
  const { S, cfg, N } = W, hoy = K.madrid(t).date, min = K.madrid(t).min, pf = (N.citas && N.citas.porFranja) || 1;
  const frDe = id => N.franjas.find(f => f.id === id); S_ = S; cfg_ = cfg; N_ = N;
  const nDe = (dia, f) => cfg.porTiempo ? enFrT(N, S, dia, f) : enFr(S, dia, f.id);   // lo que ocupa la franja (ver enFrT)
  // 1. lo que se ofrece al cliente existe de verdad
  K.diasDe(S, cfg, t, 6).forEach(d => { if (!laborI(N, d.dia)) rota('solo-dias-laborables', d.dia); d.franjas.forEach(f => {
    const cap = capI(N, S, d.dia, frDe(f.id)), dadas = nDe(d.dia, frDe(f.id)), libres = cap - dadas;
    if (f.ok && !(libres > 0)) rota('hueco-ofrecido-hueco-real', d.dia + ' ' + f.id + ': se ofrece y caben ' + cap + ' con ' + dadas + ' ya dadas');
    if (f.ok && d.dia === hoy && f.de < min + 120) rota('dos-horas-de-margen', d.dia + ' ' + f.id);
    // por tiempo, el número de citas por técnico es solo el máximo: lo que cabe puede ser menos, nunca más
    if (cfg.porTiempo ? !(Number.isInteger(f.libres) && f.libres >= 0 && f.libres <= Math.max(0, libres) && f.libres <= f.libresOf) : f.libres !== Math.max(0, libres)) rota('huecos-bien-contados', d.dia + ' ' + f.id + ': dice ' + f.libres + ' y son ' + Math.max(0, libres)) }) });
  // 1b. lo que puede poner la oficina: todo lo del cliente y, además, el hueco de urgencias y las franjas de hoy sin acabar. Nunca donde no cabe
  K.diasDe(S, cfg, t, 6, true).forEach(d => { if (!laborI(N, d.dia)) rota('oficina-solo-dias-laborables', d.dia); d.franjas.forEach(f => {
    const tope = topeI(N, S, d.dia, frDe(f.id)), n = enFr(S, d.dia, f.id), nT = nDe(d.dia, frDe(f.id));
    if (f.ok && !f.okOf) rota('lo-del-cliente-lo-puede-la-oficina', d.dia + ' ' + f.id);
    if (f.okOf && !(tope > nT)) rota('la-oficina-no-fuerza-donde-no-cabe', d.dia + ' ' + f.id + ': caben ' + tope + ' y hay ' + nT);
    if (f.okOf && d.dia === hoy && f.a <= min) rota('la-oficina-no-pone-en-franja-acabada', d.dia + ' ' + f.id);
    if (cfg.porTiempo ? f.libresOf > Math.max(0, tope - nT) || f.tope !== n + f.libresOf : f.tope !== tope || f.libresOf !== Math.max(0, tope - n)) rota('tope-bien-contado', d.dia + ' ' + f.id + ': dice ' + f.tope + '/' + f.libresOf + ' y son ' + tope + '/' + Math.max(0, tope - n));
    if ((f.por !== '') !== (f.okOf && !f.ok)) rota('se-dice-por-que-solo-la-oficina', d.dia + ' ' + f.id + ': «' + f.por + '»');
    if (f.por.includes('margen') && !(d.dia === hoy && f.de < min + 120)) rota('margen-bien-dicho', d.dia + ' ' + f.id);
    // la reserva para urgencias: por número, solo cuando ya no quedan huecos para el cliente; por tiempo, solo cuando los
    // técnicos de esa franja sin ninguna cita no pasan de los que se guardan (si hubiera más, el cliente cabría en uno libre)
    if (f.por.includes('reserva') && (cfg.porTiempo ? sinCitaEn(d.dia, f) > resI(N, S, d.dia) : capI(N, S, d.dia, frDe(f.id)) - n > 0)) rota('reserva-bien-dicha', d.dia + ' ' + f.id + ' · libres ' + f.libres + '/' + f.libresOf + ', sin cita ' + (cfg.porTiempo ? sinCitaEn(d.dia, f) : '-'))}) });
  // 2. una cita nueva o cambiada nunca pasa de lo que cabe en ese momento: para el cliente, lo que se le ofrece; para la oficina, el tope
  if ((tipo === 'pedir' || tipo === 'mover') && A && A.cita) { const esOf = !!q && q.rol === 'centralita', f = frDe(A.cita.fr), cap = esOf ? topeI(N, S, A.cita.dia, f) : capI(N, S, A.cita.dia, f), n = nDe(A.cita.dia, f);
    if (n > cap) rota('cita-nueva-cabe', A.cita.dia + ' ' + A.cita.fr + ': ' + n + ' citas y caben ' + cap + (esOf ? ' (oficina)' : ''));
    if (!laborI(N, A.cita.dia) || A.cita.dia < hoy || (A.cita.dia === hoy && (esOf ? f.a <= min : f.de < min + 120))) rota('cita-nueva-a-tiempo', A.cita.dia + ' ' + A.cita.fr + (esOf ? ' (oficina)' : ''));
    // por tiempo, si era la reserva lo dice la ley «reserva-bien-dicha» de las franjas: aquí solo el margen
    const res = cfg.porTiempo ? (A.cita.of || '').includes('reserva') : !cap0(N, S, A, f);
    const debe = [res ? 'reserva' : '', A.cita.dia === hoy && f.de < min + 120 ? 'margen' : ''].filter(Boolean).join('+');
    if ((A.cita.of || '') !== debe) rota('queda-escrito-por-que-la-puso-la-oficina', A.id + ': dice «' + (A.cita.of || '') + '» y es «' + debe + '»') }
  // 3. al asignar: alguien que trabaja esa franja, que no está ausente y que la tiene libre
  if (tipo === 'asignar' && A && !A.cita) { if (ausI(S, A.tec, hoy)) rota('urgencia-a-quien-esta', A.id + ' a ' + A.tec + ', ausente hoy');
    if (conH(N)) { const ahora = laborI(N, hoy) && trabI(N, A.tec, hoy, min, min); if (!ahora && N.tecnicos.some(x => x.guardia) && !N.tecnicos.find(x => x.id === A.tec).guardia) rota('fuera-de-horario-va-la-guardia', A.id + ' a ' + A.tec) } }
  // 4. siempre: ninguna cita de hoy en adelante está asignada a quien no puede, y nadie lleva más de las que le caben
  { const lleva = {};      // lo de las ausencias vale para todos los negocios; lo demás, para los que tienen horarios
    for (const x of S.avisos) { if (x.e !== 'asignado' || !x.cita || x.cita.dia < hoy) continue; const f = frDe(x.cita.fr);
      if (ausI(S, x.tec, x.cita.dia)) rota('cita-asignada-a-quien-esta', x.id + ': ' + x.tec + ' está ausente el ' + x.cita.dia);
      if (!conH(N)) continue;
      if (!trabI(N, x.tec, x.cita.dia, f.de, f.a)) rota('cita-asignada-a-quien-trabaja', x.id + ': ' + x.tec + ' no trabaja el ' + x.cita.dia + ' en ' + f.id);
      const k = x.tec + ' ' + x.cita.dia + ' ' + f.id; lleva[k] = (lleva[k] || 0) + 1; if (lleva[k] > pf) rota('una-franja-lo-que-cabe-por-tecnico', k + ': ' + lleva[k]) } }
  // 5. el aviso de «sobran citas» es exacto
  const esperado = {}; S.avisos.forEach(x => { if (x.cita && x.cita.dia >= hoy && ['nuevo', 'asignado', 'ausente'].includes(x.e)) { const k = x.cita.dia + ' ' + x.cita.fr, n = enFr(S, x.cita.dia, x.cita.fr) - topeI(N, S, x.cita.dia, frDe(x.cita.fr)); if (n > 0) esperado[k] = n } });
  const dicho = {}; K.sobran(S, cfg, t).forEach(x => { dicho[x.dia + ' ' + x.fr] = x.sobran });
  if (cfg.porTiempo) {   // por tiempo, lo que sobra no se puede contar por número: lo que se sabe seguro
    const pend = {}; S.avisos.forEach(x => { if (x.cita && x.cita.dia >= hoy && ['nuevo', 'asignado', 'ausente'].includes(x.e)) { const k = x.cita.dia + ' ' + x.cita.fr; pend[k] = (pend[k] || 0) + 1 } });
    Object.entries(dicho).forEach(([k, n]) => { if (!(n >= 1 && n <= (pend[k] || 0))) rota('sobran-por-tiempo', k + ': dice ' + n + ' y quedan ' + (pend[k] || 0) + ' por hacer') });
    Object.entries(pend).forEach(([k, n]) => { const [dia, fr] = k.split(' '); if (!topeI(N, S, dia, frDe(fr)) && dicho[k] !== n) rota('sobran-por-tiempo', k + ': nadie trabaja esa franja y dice ' + (dicho[k] || 0) + ' de ' + n) });
  } else if (JSON.stringify(Object.entries(esperado).sort()) !== JSON.stringify(Object.entries(dicho).sort())) rota('sobran-exacto', 'dice ' + JSON.stringify(dicho) + ' y son ' + JSON.stringify(esperado));
  // 6. ausencias bien formadas
  const vistas = new Set(); (S.ausencias || []).forEach(u => { if (vistas.has(u.id) || !cfg.tec[u.tec] || !K.esFecha(u.de) || !K.esFecha(u.a) || u.a < u.de) rota('ausencias-bien-formadas', JSON.stringify(u)); vistas.add(u.id) });
  // 7. lo que el cliente dio por bueno
  for (const x of S.avisos) { if (!x.cita) continue;
    if (x.vale && x.vale.some(v => !K.esFecha(v.dia) || !frDe(v.fr))) rota('franjas-del-cliente-reales', x.id);
    if (x.cita.ok && x.vale && !x.vale.some(v => v.dia === x.cita.dia && v.fr === x.cita.fr)) rota('cita-buena-para-el-cliente', x.id + ': marcada como buena y el cliente no la dio') }
  W.leyes += 21;
}

function unAviso(W, A, t) {
  const { cfg } = W;
  // tiempos en orden
  if (A.sal && A.sal < A.t) rota('tiempos-en-orden', A.id + ': sale antes de avisar');
  if (A.ini && A.sal && A.ini < A.sal) rota('tiempos-en-orden', A.id + ': empieza antes de salir');
  if (A.fin && A.ini && A.fin < A.ini) rota('tiempos-en-orden', A.id + ': acaba antes de empezar');
  if (A.e === 'camino' && !(A.eta > A.sal)) rota('tiempos-en-orden', A.id + ': hora de llegada ' + A.eta);
  (A.pausas || []).forEach(p => { if (p[1] && p[1] < p[0]) rota('tiempos-en-orden', A.id + ': pausa al revés') });
  if (A.e === 'hecho' && (A.pausas || []).some(p => !p[1])) rota('tiempos-en-orden', A.id + ': terminado con una pausa abierta');
  if (A.min != null && (!Number.isInteger(A.min) || A.min < 0)) rota('tiempos-en-orden', A.id + ': minutos = ' + A.min);
  if (A.cita && !K.laborable(cfg, A.cita.dia)) rota('cita-en-dia-laborable', A.id + ' el ' + A.cita.dia);
  if (A.urg === !!A.cita) rota('urgente-o-con-cita', A.id);
  if (!K.ORIGEN.includes(A.origen)) rota('canal-conocido', A.id + ': «' + A.origen + '»');
  for (const k of ['nota', 'obs']) if (A[k] != null && typeof A[k] !== 'string') rota('textos-que-son-texto', A.id + '.' + k);
  for (const k of ['nombre', 'apellidos', 'tel', 'dir', 'cp', 'dis']) if (typeof A.cli[k] !== 'string') rota('textos-que-son-texto', A.id + '.cli.' + k);
  // dinero
  if (A.tot) {
    const T = A.tot; entero(T.total, A.id + '.total'); entero(T.base, A.id + '.base'); entero(T.iva, A.id + '.iva');
    const cubierta = l => (l.con && A.con) || (l.gar && A.enGar);
    if (!(T.total > 0) && !(T.lineas.length && T.lineas.every(cubierta))) rota('total-mayor-que-cero', A.id);   // a cero, solo si todo va en el contrato o en la garantía
    T.lineas.forEach(l => { if (l.gar && (!A.enGar || !A.enGar.k.includes(l.k) || l.imp !== 0)) rota('en-garantia-solo-lo-suyo-y-a-cero', A.id + ' ' + l.k) });
    if (T.tipo !== 10 && T.tipo !== 21) rota('iva-conocido', A.id + ': ' + T.tipo);
    let suma = 0; T.lineas.forEach(l => { entero(l.imp, A.id + ' línea ' + l.k); suma += l.imp });
    if (suma !== T.total) rota('total-suma-de-lineas', A.id + ': ' + suma + ' ≠ ' + T.total);
    if (T.base + T.iva !== T.total) rota('base-mas-iva', A.id);
    if (Math.abs(T.base * (1 + T.tipo / 100) - T.total) > 1) rota('iva-bien-calculado', A.id + ': base ' + T.base + ', total ' + T.total + ' al ' + T.tipo + ' %');
    if ((T.motivo === 'local') !== !!T.local || (T.tipo === 21) !== (T.motivo !== 'vivienda')) rota('motivo-del-iva', A.id + ': ' + T.motivo + ' al ' + T.tipo + ' %');
    const otra = K.precio(cfg, A.lin, { urg: T.urg, local: T.local, gratis: K.gratisDe(A), garan: K.garanDe(A) });
    if (otra.total !== T.total || otra.tipo !== T.tipo) rota('se-puede-recalcular', A.id + ': guardado ' + T.total + ', recalculado ' + otra.total);
  }
  // las rebajas (16-11-2026): siempre a la baja, con su motivo; lo que hay que devolver es lo rebajado de lo ya pagado
  (A.rebajas || []).forEach((x, i) => { entero(x.antes, A.id + ' rebaja'); entero(x.ahora, A.id + ' rebaja');
    if (!(x.antes > x.ahora && x.ahora >= 0) || typeof x.motivo !== 'string' || x.motivo.trim().length < 3 || x.motivo.length > 120) rota('rebajas-a-la-baja-y-con-motivo', A.id + ' ' + JSON.stringify(x));
    if (x.devolver !== undefined && x.devolver !== x.antes - x.ahora) rota('lo-que-se-devuelve-es-lo-rebajado', A.id + ' ' + JSON.stringify(x));
    if (i === A.rebajas.length - 1 && !A.amp && A.tot && x.ahora !== A.tot.total) rota('la-ultima-rebaja-es-el-precio', A.id) });
  if (A.pres) {
    const j = JSON.stringify(A.pres), antes = W.firmado.get(A.id);
    if (antes === undefined) { W.firmado.set(A.id, j); if (A.pres.urg !== (A.cita ? false : K.urgente(cfg, A.t))) rota('tarifa-del-momento-del-aviso', A.id) }
    else if (antes !== j) rota('lo-firmado-no-cambia', A.id + ': el presupuesto firmado ha cambiado');
    const amp = A.amp || [], vistas = W.amps.get(A.id) || [];
    vistas.forEach((x, i) => { if (JSON.stringify(amp[i]) !== x) rota('lo-firmado-no-cambia', A.id + ': la ampliación ' + (i + 1) + ' ha cambiado') });
    W.amps.set(A.id, amp.map(x => JSON.stringify(x)));
    amp.forEach(x => { if (!(x.dif > 0)) rota('ampliacion-suma', A.id); if (typeof x.firma !== 'string' || x.firma.length < 12) rota('ampliacion-con-firma', A.id) });
    const rebajado = (A.rebajas || []).reduce((s, x) => s + (x.antes - x.ahora), 0);
    if (A.tot && !A.sinTrabajo && A.pres.total + amp.reduce((s, x) => s + x.dif, 0) - rebajado !== A.tot.total) rota('firmado-mas-ampliaciones-menos-rebajas', A.id);
    if (typeof A.pres.firma !== 'string' || A.pres.firma.length < 12) rota('presupuesto-con-firma', A.id);
  }
  if (A.e === 'hecho') {
    if (A.sinTrabajo) { if (A.gar) rota('sin-trabajo-sin-garantia', A.id); if (!A.pago) rota('terminado-con-cobro', A.id) }
    else { if (!A.gar || A.gar.hasta !== K.masMeses(K.madrid(A.fin).date, cfg.meses)) rota('garantia-bien-fechada', A.id + ': ' + JSON.stringify(A.gar)) }
    if (!A.tot || !A.pago) rota('terminado-con-cobro', A.id + ': terminado sin precio firmado o sin decir cómo se paga');
    if (A.pago) { const cero = A.tot && A.tot.total === 0; if (cero ? A.pago.modo !== '' : !K.PAGOS.includes(A.pago.modo)) rota('forma-de-pago-conocida', A.id); if (A.pago.cobrado !== (A.pago.modo !== 'pendiente')) rota('pendiente-no-es-cobrado', A.id) }   // a cero (todo en el contrato), sin forma de pago
  } else if (A.pago || A.gar) rota('cobro-y-garantia-solo-al-acabar', A.id + ' en ' + A.e);
  // mensajes
  const pendientes = new Set();
  for (const m of A.msgs) {
    if (!(m.k in K.MSG) || !Object.prototype.hasOwnProperty.call(K.MSG, m.k)) rota('mensaje-conocido', A.id + ': ' + m.k);
    if (!m.env) {
      if (pendientes.has(m.k)) rota('mensaje-sin-repetir', A.id + ': dos «' + m.k + '» por enviar'); pendientes.add(m.k);
      let txt; try { txt = K.mensaje(cfg, A, m.k) } catch (e) { rota('mensaje-no-revienta', A.id + ' «' + m.k + '»: ' + e.message) }
      if (typeof txt !== 'string' || txt.length < 20) rota('mensaje-con-texto', A.id + ' «' + m.k + '» sale vacío');
      if (FEO_MSG.test(txt) || /\d\.\d+ (a|de)\b|\b\d+\.\d+\.$/.test(txt)) rota('mensaje-sin-huecos', A.id + ' «' + m.k + '»: ' + txt);
    }
  }
  if (pendientes.has('cobro') && !(A.pago && !A.pago.cobrado)) rota('recordatorio-de-pago-solo-si-debe', A.id);
  if ((pendientes.has('cita') || pendientes.has('vispera')) && !A.cita) rota('mensaje-de-cita-solo-con-cita', A.id);
  // el seguimiento (15-11-2026): nunca a quien dijo que no; caduca después de tocar; lo dejado queda apuntado; el presupuesto
  // guardado, solo si no aceptó; y volver, solo con algo que se repite y en su fecha
  const noQ = K.noEscribe(W.S, A.cli && A.cli.tel);
  for (const m of A.msgs) { if (!m.env && K.SEGUIR.includes(m.k) && (A.noMsg || (noQ && K.porMandar(W.S, Math.max(m.t, t)).some(x => x.m === m)))) rota('seguimiento-a-quien-no-quiere', A.id + ' «' + m.k + '»');
    if (m.hasta !== undefined && !(Number.isInteger(m.hasta) && m.hasta > m.t)) rota('seguimiento-caduca-despues', A.id + ' «' + m.k + '»');
    if (m.no !== undefined && !(m.no === 1 && m.env)) rota('dejado-sin-mandar-apuntado', A.id + ' «' + m.k + '»') }
  if (pendientes.has('presupuesto') && !A.noPres) rota('presupuesto-con-su-total', A.id);
  if (A.noPres !== undefined && !(A.sinTrabajo && A.e === 'hecho' && A.noPres.total > 0 && Array.isArray(A.noPres.lin) && A.noPres.lin.length)) rota('presupuesto-guardado-solo-si-no-acepta', A.id);
  if (A.prox !== undefined && !(A.e === 'hecho' && !A.sinTrabajo && A.av !== K.REV && cfg.cat[A.prox.k] && cfg.cat[A.prox.k].cada && A.lin.some(l => l.k === A.prox.k) && A.prox.dia === K.masMeses(K.madrid(A.fin).date, cfg.cat[A.prox.k].cada))) rota('volver-solo-con-algo-que-se-repite', A.id);
  if (pendientes.has('proxima') && !A.prox) rota('volver-con-fecha', A.id);
  if ((pendientes.has('resena') || pendientes.has('seguimiento')) && !(A.e === 'hecho' && !A.sinTrabajo)) rota('seguimiento-solo-de-un-trabajo-hecho', A.id);
  A.h.forEach(x => { if (FEO.test(x.txt) || FEO.test(x.q)) rota('historial-sin-huecos', A.id + ': «' + x.q + ': ' + x.txt + '»') });
  W.leyes += 30;
}

/* ---------- el generador: casi siempre hace algo con sentido; a veces, cualquier cosa ---------- */
function generador(G) {
  const { r, cfg, N } = G, tecs = Object.keys(cfg.tec), cps = Object.keys(N.zonas.cp), avs = Object.keys(cfg.av), cat = Object.keys(cfg.cat);
  const pick = L => L[Math.floor(r() * L.length)], C = { rol: 'centralita', id: 'c1' }, T = id => ({ rol: 'tecnico', id });
  let nCli = 0;
  const cliente = () => { const i = Math.floor(r() * 9); nCli++; return { nombre: NOMBRES[i % NOMBRES.length], apellidos: APELLIDOS[i % APELLIDOS.length], tel: '6' + String(11000000 + i * 7919).padStart(8, '0'), dir: 'C/ de la Prueba ' + (1 + i * 3) + ', ' + (1 + i % 5) + '.º', cp: cps[(i * 5) % cps.length] } };
  const lineas = (A, n) => { const av = cfg.av[A.av] || cfg.av[avs[0]], L = n ? [] : (av.ini || []).map(l => Object.assign({}, l));
    (av.chips || []).forEach(k => { if (r() < (n ? .5 : .3)) L.push(r() < .25 ? { k, q: 1 + Math.floor(r() * 3) } : { k }) });
    if (n && r() < .5) { const h = cat.find(k => cfg.cat[k].un === 'h'); if (h) L.push({ k: h, q: cfg.cat[h].paso * (1 + Math.floor(r() * 4)) }) }
    if (r() < .18) L.push({ k: 'otro', t: pick(['Pieza especial', 'Racor de latón 3/4', '<b>x</b>']), p: pick([12.5, 49.99, 180, 0, 5000, 7000, -3, 'abc', '39,90']) });
    if (r() < .04) L.push({ k: pick(RAROS) });
    return L };
  const cita = (S, t) => { if (r() < .08) return pick([{ dia: '2020-01-01', fr: cfg.franjas[0].id }, { dia: K.madrid(t).date, fr: 'zz' }, { dia: 'mañana' }, {}]);
    const dias = K.diasDe(S, cfg, t, 6), buenas = []; dias.forEach(d => d.franjas.forEach(f => { if (f.ok || r() < .1) buenas.push({ dia: d.dia, fr: f.id }) })); return buenas.length ? pick(buenas) : { dia: K.masDias(K.madrid(t).date, 1), fr: cfg.franjas[0].id } };
  const firma = () => r() < .06 ? pick(['', 'M1', null, 7]) : FIRMA, mats = cat.filter(k => cfg.cat[k].mat);
  const modo = () => r() < .06 ? pick(['paypal', '', null, 'constructor']) : pick(K.PAGOS);

  /* la furgoneta: casi siempre la de alguien que existe, por él o por la oficina; a veces, lo que no vale */
  function furgo(S) {
    const tec = r() < .06 ? pick(RAROS) : pick(tecs), F = S.furgos && typeof tec === 'string' && Object.prototype.hasOwnProperty.call(S.furgos, tec) ? S.furgos[tec] : null, v = r();
    const quien = r() < .1 ? pick([T(pick(tecs)), { rol: 'cliente' }, {}]) : r() < .5 ? C : T(tec);
    const lista = () => { if (r() < .04) return pick(RAROS); const L = {}, n = 1 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) { const k = r() < .07 ? pick(cat.concat(['otro', 'constructor', 'toString', ''])) : pick(mats.length ? mats : cat); L[k] = r() < .08 ? pick([-1, 1.5, '2', 1000, null, 0, 9999]) : Math.floor(r() * 12) } return L };
    if ((!F || !F.on) && r() < .3) return [r() < .5 ? { tipo: 'furgo', tec, cuenta: lista() } : { tipo: 'furgo', tec, carga: lista() }, quien];
    if (!F || !F.on || v < .08) return [{ tipo: 'furgo', tec, llevar: r() < .92 ? true : pick([false, 'sí', 1]) }, quien];
    if (v < .13) return [{ tipo: 'furgo', tec, llevar: false }, quien];
    if (v < .45) return [{ tipo: 'furgo', tec, cuenta: lista() }, quien];
    if (v < .48) return [{ tipo: 'furgo', tec, cuenta: lista(), carga: lista() }, quien];
    return [{ tipo: 'furgo', tec, carga: lista() }, quien];
  }
  const planes = Object.keys(cfg.planes || {});
  function contrato(S, t) {
    const Cs = S.contratos || [];
    /* el técnico en casa del cliente: casi siempre desde su aviso y con ese teléfono; a veces, no */
    const enCasa = S.avisos.filter(x => x.tec && (x.e === 'curso' || x.e === 'hecho'));
    if (enCasa.length && r() < .3) {
      const A = pick(enCasa), u = r(), cli = Object.assign({}, A.cli, u < .1 ? { tel: '699' + String(Math.floor(r() * 1e6)).padStart(6, '0') } : {});
      const quien = u > .9 ? T(pick(tecs)) : T(A.tec), aviso = u > .85 && u <= .9 ? pick(S.avisos).id : A.id;
      return [{ tipo: 'contrato', plan: pick(planes.length ? planes : ['anual']), cli, acepta: pick(['firma', 'mensaje']), firma: FIRMA, aviso, modo: r() < .5 ? pick(['efectivo', 'tarjeta', 'bizum']) : undefined }, quien];
    }
    if (r() < .5 || !Cs.length) {
      const de = S.avisos.length && r() < .7 ? pick(S.avisos).cli : cliente(), cli = r() < .1 ? pick([null, 'x', {}, Object.assign({}, de, { tel: '12' })]) : Object.assign({}, de);
      return [{ tipo: 'contrato', plan: r() < .08 ? pick(RAROS) : pick(planes.length ? planes : ['anual']), cli, acepta: r() < .06 ? pick(['sí', '', null, 7]) : pick(['firma', 'mensaje']), firma: r() < .9 ? FIRMA : pick(['', 'M1', null]), pide: r() < .3 ? pick([true, 'sí', 1]) : undefined, modo: r() < .4 ? modo() : undefined },
        r() < .08 ? pick([T(pick(tecs)), { rol: 'cliente' }]) : C];
    }
    const X = pick(Cs), quien = r() < .08 ? pick([T(pick(tecs)), { rol: 'cliente' }]) : C, v = r();
    if (v < .35) return [{ tipo: 'cobroContrato', id: r() < .05 ? pick(RAROS) : X.id, modo: modo() }, quien];
    if (v < .7) return [{ tipo: 'renovar', id: X.id, acepta: r() < .85 ? true : pick(['sí', false, undefined]), modo: r() < .3 ? modo() : undefined }, quien];
    return [{ tipo: 'bajaContrato', id: X.id, motivo: pick(['', 'Se muda', 'x'.repeat(300), { a: 1 }, undefined]) }, quien];
  }
  function pedir(S, t) {
    const a = { tipo: 'pedir', av: r() < .04 ? pick(RAROS) : pick(avs), cli: cliente(), origen: r() < .05 ? pick(RAROS) : pick(K.ORIGEN), nota: pick(['', 'Gotea desde ayer.', 'x'.repeat(900), '<script>1</script>']) };
    if (r() < .5) { a.cita = cita(S, t); if (r() < .35) a.alt = [cita(S, t), cita(S, t), r() < .2 ? pick(RAROS) : cita(S, t)] }
    if (r() < .12) { const c = a.cli, que = pick(['tel', 'dir', 'cp', 'nombre', 'apellidos', 'zona', 'todo']); if (que === 'zona') c.cp = '99999'; else if (que === 'todo') a.cli = pick([null, 'hola', {}, []]); else if (que === 'tel') c.tel = pick(['', '12345', '+34 600 00 01 02', '0034600000102', '5551234']); else c[que] = '' }
    if (S.contratos && S.contratos.length && r() < .25) a.cli = Object.assign({}, pick(S.contratos).cli);
    if (a.origen === 'web' && r() < .6) a.cli = { nombre: '', tel: '', dir: '', cp: r() < .5 ? pick(cps) : '' };
    if (r() < .2) a.foto = 'data:image/jpeg;base64,' + 'A'.repeat(r() < .1 ? 150000 : 400);
    return [a, r() < .7 ? { rol: 'cliente' } : C];
  }
  function sensata(S, A, t) {
    const suyo = A.tec && cfg.tec[A.tec] ? T(A.tec) : T(pick(tecs)), u = r();
    const enviado = () => { const p = A.msgs.filter(m => !m.env), k = p.length ? pick(p).k : pick(Object.keys(K.MSG));
      return r() < .3 ? [{ tipo: 'descartar', id: A.id, k }, r() < .8 ? C : suyo] : [{ tipo: 'enviado', id: A.id, k }, r() < .5 ? C : suyo] };
    const anotar = () => [{ tipo: 'anotar', id: A.id, obs: r() < .7 ? pick(['Llave de paso dura.', '', 'x'.repeat(600)]) : undefined, foto: r() < .6 ? 'data:image/jpeg;base64,' + 'B'.repeat(300) : undefined }, r() < .5 ? C : suyo];
    const falta = () => { const L = A.falta || [], ya = L.length && r() < .45 ? pick(L) : null, a = { tipo: 'falta', id: A.id };
      if (r() < .06) a.vaciar = pick([true, true, 'sí', 1]); else if (ya) { if (ya.k) a.k = ya.k; else a.t = r() < .5 ? ya.t.toUpperCase() : ya.t; if (r() < .6) a.quitar = r() < .9 ? true : 'sí'; else a.q = pick([1, 2, 19, 20, 21]) }
      else if (r() < .55 && mats.length) { a.k = r() < .08 ? pick(cat.concat(RAROS, ['otro'])) : pick(mats); a.q = pick([1, 1, 2, 3, 20, 0, 21, 1.5, '2', -1, undefined, null]) }
      else { a.t = pick(['Latiguillo de 40 cm', '  Racor   de 3/4 ', 'Pieza ' + Math.floor(r() * 15), '', '   ', 'x'.repeat(90), '<b>x</b>', 'Línea\ncortada', 7, null, { a: 1 }]); a.q = pick([1, 2, 5, 20, 21, undefined]) }
      return [a, r() < .1 ? pick([{ rol: 'cliente' }, T(pick(tecs))]) : r() < .5 ? C : suyo] };
    const mover = () => [{ tipo: 'mover', id: A.id, cita: r() < .75 ? (A.vale && A.vale.length > 1 && r() < .4 ? pick(A.vale) : cita(S, t)) : null, confirmado: r() < .2 ? true : undefined }, C];
    const pueden = tecs.filter(x => !K.puedeIr(S, cfg, A, x, t));
    const asignar = () => [{ tipo: 'asignar', id: A.id, tec: r() < .05 ? pick(RAROS) : pueden.length && r() < .7 ? pick(pueden) : pick(tecs) }, C];
    const cancelar = () => [{ tipo: 'cancelar', id: A.id, motivo: pick(['', 'Ya lo ha arreglado', 'x'.repeat(200)]) }, C];
    const empezar = () => [{ tipo: 'empezar', id: A.id, pres: { lineas: lineas(A, 0), firma: firma(), local: r() < .15, pide: r() < .85 ? true : pick([undefined, false, 'sí', 1]) } }, suyo];
    const noacepta = () => [{ tipo: 'noacepta', id: A.id, modo: modo(), local: r() < .15, pres: r() < .6 ? { lineas: lineas(A, 0) } : r() < .15 ? pick(RAROS) : undefined }, suyo];
    const posicion = () => r() < .2 ? [{ tipo: 'sinPosicion', id: A.id }, r() < .85 ? suyo : pick([C, T(pick(tecs)), { rol: 'cliente' }])]
      : [{ tipo: 'posicion', id: A.id, lat: r() < .1 ? pick([91, -200, '41.3', null, NaN, undefined]) : 41.3 + r() * .2, lon: r() < .05 ? pick([181, 'x', null]) : 2.05 + r() * .2, prec: pick([5, 30, 800, -1, 'x', undefined]) }, r() < .85 ? suyo : pick([C, T(pick(tecs)), { rol: 'cliente' }])];
    if (A.e !== 'hecho' && A.e !== 'cancelado' && u > .93) return falta();
    // es garantía, rebajar y corregir la forma de pago (16-11-2026)
    const garantia = () => [{ tipo: 'garantia', id: A.id, de: r() < .85 ? undefined : pick(RAROS.concat(S.avisos.map(x => x.id))), quitar: A.enGar && r() < .35 ? true : r() < .03 ? pick(RAROS) : undefined }, r() < .9 ? C : pick([suyo, { rol: 'cliente' }])];
    const rebajar = quien => { const L = (A.lin || []).map(l => Object.assign({}, l)).filter(() => r() > .3).map(l => (l.q > 1 && r() < .5) ? Object.assign(l, { q: Math.max(cfg.cat[l.k] && cfg.cat[l.k].un === 'h' ? cfg.cat[l.k].paso : 1, l.q - (cfg.cat[l.k] && cfg.cat[l.k].un === 'h' ? cfg.cat[l.k].paso : 1)) }) : l);
      if (r() < .1) L.push(...lineas(A, 1)); if (r() < .05) L.length = 0;
      return [{ tipo: 'rebajar', id: A.id, lineas: r() < .04 ? pick(RAROS) : L, motivo: pick(['Al final no hizo falta la pieza', 'Descuento por la espera', 'ok', '', '   ', 'x'.repeat(300), undefined, 'El cliente lo hizo él']) }, quien] };
    const corregir = () => [{ tipo: 'corregirPago', id: A.id, modo: r() < .9 ? pick(K.PAGOS) : pick(RAROS) }, r() < .9 ? C : suyo];
    if (['nuevo', 'asignado', 'camino', 'ausente'].includes(A.e) && (A.gar0 || A.enGar) && u > .86 && u <= .93) return garantia();
    switch (A.e) {
      case 'nuevo': if (!A.cli.tel || !A.cli.dir || !A.cli.dis) return u < .7 ? [{ tipo: 'completar', id: A.id, cli: cliente() }, C] : u < .85 ? asignar() : cancelar();
        return u < .6 ? asignar() : u < .75 ? mover() : u < .83 ? cancelar() : u < .9 ? anotar() : enviado();
      case 'asignado': return u < .43 ? [{ tipo: 'voy', id: A.id }, suyo] : u < .53 ? empezar() : u < .61 ? asignar() : u < .66 ? [{ tipo: 'soltar', id: A.id }, r() < .85 ? C : pick([suyo, { rol: 'cliente' }])] : u < .75 ? mover() : u < .8 ? cancelar() : u < .85 ? noacepta() : u < .9 ? anotar() : enviado();
      case 'camino': return u < .35 ? posicion() : u < .7 ? empezar() : u < .8 ? [{ tipo: 'ausente', id: A.id }, suyo] : u < .87 ? noacepta() : u < .93 ? anotar() : enviado();
      case 'curso': return u < .35 ? [{ tipo: 'terminar', id: A.id, modo: modo(), firma: r() < .5 ? FIRMA : undefined, avisar: r() < .4 ? pick([true, true, true, 'sí', 1]) : undefined }, suyo] : u < .52 ? [{ tipo: 'pausa', id: A.id }, suyo] : u < .7 ? [{ tipo: 'ampliar', id: A.id, lineas: lineas(A, 1), firma: firma(), pide: r() < .85 ? true : pick([undefined, 'sí']) }, suyo] : u < .79 ? rebajar(r() < .6 ? suyo : r() < .7 ? C : pick([T(pick(tecs)), { rol: 'cliente' }])) : u < .9 ? anotar() : enviado();
      case 'ausente': return u < .5 ? asignar() : u < .75 ? mover() : u < .9 ? cancelar() : enviado();
      case 'hecho': return u < .4 ? [{ tipo: 'cobrar', id: A.id, modo: r() < .1 ? 'pendiente' : pick(K.PAGOS.filter(m => m !== 'pendiente')) }, r() < .5 ? C : suyo]
        : u < .5 ? corregir() : u < .58 ? rebajar(r() < .85 ? C : suyo) : u < .78 ? [{ tipo: 'facturar', id: A.id, num: pick(['', 'F-1', '  F  2 ', { x: 1 }, 12, undefined]), quitar: A.fac && r() < .3 ? true : undefined }, r() < .85 ? C : suyo] : enviado();
      default: return enviado();
    }
  }
  function cualquiera(S, A) {
    const tipo = pick(['completar', 'asignar', 'soltar', 'mover', 'voy', 'ausente', 'empezar', 'noacepta', 'ampliar', 'pausa', 'anotar', 'terminar', 'cobrar', 'cancelar', 'enviado', 'pack', 'borrar', 'pedir', 'posicion', 'sinPosicion', 'falta', 'descartar', 'escribir', 'garantia', 'corregirPago', 'rebajar']);
    const quien = pick([C, { rol: 'cliente' }, T(pick(tecs)), T(pick(tecs)), { rol: 'tecnico', id: pick(RAROS) }, { rol: pick(RAROS) }, {}]);
    return [{ tipo, id: A.id, lat: 41.38, lon: 2.17, tec: pick(tecs), modo: pick(K.PAGOS), firma: FIRMA, pres: { lineas: lineas(A, 0), firma: FIRMA }, lineas: lineas(A, 1), k: pick(Object.keys(K.MSG)), pack: pick(['basico', 'pro']), cita: null, av: pick(avs), cli: cliente(), tel: A.cli ? A.cli.tel : '', si: r() < .5, avisar: r() < .3, motivo: pick(['Al final no hizo falta', '']), de: A.gar0 }, quien];
  }
  function basura(S) {
    const A = S.avisos.length ? pick(S.avisos) : { id: 'X-0001' };
    return pick([[null, null], [{}, {}], [{ tipo: pick(RAROS) }, C], [{ tipo: 'pedir', av: pick(RAROS), cli: pick(RAROS) }, { rol: 'cliente' }], [{ tipo: 'asignar', id: pick(RAROS), tec: pick(RAROS) }, C],
      [{ tipo: 'asignar', id: A.id, tec: pick(['__proto__', 'constructor', 'toString']) }, C], [{ tipo: 'empezar', id: A.id, pres: pick(RAROS) }, T(pick(tecs))], [{ tipo: 'empezar', id: A.id, pres: { lineas: pick(RAROS), firma: FIRMA } }, T(A.tec || pick(tecs))],
      [{ tipo: 'pack', pack: pick(RAROS) }, C], [{ tipo: 'enviado', id: A.id, k: pick(RAROS) }, C], [{ tipo: 'mover', id: A.id, cita: pick(RAROS) }, C], [{ tipo: 'cobrar', id: A.id, modo: pick(RAROS) }, C],
      [{ tipo: 'pedir', av: pick(avs), cli: { nombre: 'Ana', apellidos: 'Prueba', tel: '600000199', dir: 'C/ Mayor 1', cp: pick(RAROS), dis: pick(['__proto__', 'constructor', 'zz']) } }, { rol: 'cliente' }],
      [{ tipo: 'anotar', id: A.id, obs: pick(RAROS), foto: pick(RAROS) }, C], [{ tipo: 'garantia', id: A.id, de: pick(RAROS), quitar: pick(RAROS) }, C], [{ tipo: 'corregirPago', id: A.id, modo: pick(RAROS) }, C], [{ tipo: 'rebajar', id: A.id, lineas: pick(RAROS), motivo: pick(RAROS) }, pick([C, T(A.tec || pick(tecs))])], [{ tipo: 'terminar', id: A.id, modo: pick(RAROS), firma: pick(RAROS) }, T(A.tec || pick(tecs))], [{ tipo: 'ampliar', id: A.id, lineas: pick(RAROS), firma: FIRMA }, T(A.tec || pick(tecs))]]);
  }
  return function siguiente(S, t) {
    const u = r(); if (u < .04) return basura(S);
    if (u < .065) { const hoy = K.madrid(t).date, de = K.masDias(hoy, Math.floor(r() * 7)), al = K.masDias(de, Math.floor(r() * 5));
      return r() < .12 ? [{ tipo: 'ausencia', tec: pick(tecs.concat(RAROS)), de: pick([de, '2020-01-01', '2026-02-30', 7, null]), a: pick([al, '1999-12-31', 'mañana']) }, pick([C, C, T(pick(tecs))])] : [{ tipo: 'ausencia', tec: pick(tecs), de, a: al, motivo: pick(['Vacaciones', 'Baja', '', 'x'.repeat(100)]) }, C] }
    if (u >= .075 && u < .1) return contrato(S, t);
    if (u >= .112 && u < .13) return furgo(S);
    if (u >= .1 && u < .112) { const X = S.avisos.length ? pick(S.avisos) : null, tel = X && X.cli && X.cli.tel && r() < .9 ? (r() < .5 ? X.cli.tel : K.telBonito(X.cli.tel)) : pick(['600000999', '', null, 7]);
      return [{ tipo: 'escribir', tel, si: r() < .08 ? pick([undefined, 'no', 1, null]) : r() < .45 }, r() < .9 ? C : T(pick(tecs))] }
    if (u < .075) return [{ tipo: 'quitarAusencia', aus: S.ausencias && S.ausencias.length && r() < .8 ? pick(S.ausencias).id : pick(['U99', null, 7]) }, C];
    const vivos = S.avisos.filter(a => a.e !== 'hecho' && a.e !== 'cancelado');
    if (!S.avisos.length || (vivos.length < 4 && r() < .6) || r() < .08) return pedir(S, t);
    const A = vivos.length && r() < .78 ? pick(vivos) : pick(S.avisos);
    return u < .15 ? cualquiera(S, A) : sensata(S, A, t);
  };
}

/* repite una lista fija de acciones desde cero; devuelve el estado final o la ley rota */
function repite(cfg, N, ini, lista, guardaCada) {
  const W = mundo(cfg, N, ini);
  try { lista.forEach((x, i) => { paso(W, clon(x.a), clon(x.q), x.t); if (guardaCada && i % guardaCada === guardaCada - 1) W.S = clon(W.S) }) }
  catch (e) { if (e instanceof Rota) return { rota: e }; throw e }
  return { W, fin: JSON.stringify(W.S) };
}
function encoge(cfg, N, ini, lista, ley) {
  let L = lista.slice();
  for (let n = Math.floor(L.length / 2); n >= 1; n = Math.floor(n / 2)) {
    let cambio = true;
    while (cambio) { cambio = false; for (let i = 0; i + n <= L.length;) { const c = L.slice(0, i).concat(L.slice(i + n)), v = repite(cfg, N, ini, c); if (v.rota && v.rota.ley === ley) { L = c; cambio = true } else i += n } }
  }
  return L;
}

function tanda(cfg, N, muestra, semilla, pasos) {
  const r = dado(semilla), G = { r, cfg, N }, sig = generador(G);
  const ini = { t0: r() < .6 ? TRAMPAS[Math.floor(r() * TRAMPAS.length)] + Math.floor(r() * 3 * H) : Date.parse('2026-11-01T00:00:00Z') + Math.floor(r() * 500 * D) };
  if (muestra && r() < .3) ini.muestra = muestra;
  const W = mundo(cfg, N, ini), lista = []; let t = ini.t0;
  try {
    for (let i = 0; i < pasos; i++) {
      const u = r(); t += u < .2 ? 0 : u < .55 ? M * (1 + Math.floor(r() * 9)) : u < .85 ? M * (10 + Math.floor(r() * 80)) : u < .96 ? H * (2 + Math.floor(r() * 9)) : D * (1 + Math.floor(r() * 4));
      const [a, q] = sig(W.S, t), x = { a: clon(a === undefined ? null : a), q: clon(q === undefined ? null : q), t };
      lista.push(x); paso(W, clon(x.a), clon(x.q), t);
    }
  } catch (e) { if (!(e instanceof Rota)) throw e; return { rota: e, ini, lista } }
  // la misma lista, otra vez y guardando y abriendo por el camino: tiene que dar lo mismo
  const fin = JSON.stringify(W.S), otra = repite(cfg, N, ini, lista), tercera = repite(cfg, N, ini, lista, 7);
  if (otra.rota || otra.fin !== fin) return { rota: new Rota('mismas-acciones-mismo-resultado', 'al repetir la lista el resultado cambia'), ini, lista, sinEncoger: true };
  if (tercera.rota || tercera.fin !== fin) return { rota: new Rota('guardar-y-abrir-no-cambia-nada', 'guardando y abriendo cada 7 pasos el resultado cambia'), ini, lista, sinEncoger: true };
  return { W };
}

/* ---------- leyes que no necesitan recorrido: se miran una vez por negocio ---------- */
function fijas(cfg, N) {
  let n = 0; const es = (c, ley, d) => { n++; if (!c) rota(ley, d) };
  const S = K.nuevo(), t = Date.parse('2026-11-10T09:00:00Z');
  K.franjasDe(S, cfg, '2026-11-11', t).forEach(f => es(/^de \d{1,2}(:\d{2})? a \d{1,2}(:\d{2})?$/.test(f.txt), 'franja-bien-escrita', '«' + f.txt + '»'));
  Object.keys(cfg.av).forEach(av => [false, true].forEach(urg => { const R = K.rango(cfg, av, urg); es(R && Number.isInteger(R.a) && R.a > 0 && (R.b === null || (Number.isInteger(R.b) && R.b >= R.a)), 'de-cuanto-a-cuanto', av + ': ' + JSON.stringify(R)) }));
  Object.keys(N.zonas.dis).concat(['', 'zz', '__proto__', 'constructor']).forEach(d => { const m = K.etaMin(cfg, d); es(Number.isInteger(m) && m > 0, 'minutos-de-llegada', '«' + d + '» → ' + m) });
  Object.keys(cfg.cat).forEach(k => [10, 21].forEach(tipo => [false, true].forEach(urg => { const p = K.precio(cfg, [{ k }], { urg, tipo }); es(p.total > 0 && p.base + p.iva === p.total && Number.isInteger(p.total), 'precio-de-cada-concepto', k) })));
  ['__proto__', 'constructor', 'toString'].forEach(k => { const p = K.precio(cfg, [{ k }, { k, q: 2 }], {}); es(p.total === 0 && p.lineas.length === 0, 'claves-raras-no-cuelan', 'precio de «' + k + '» = ' + p.total); es(K.rango(cfg, k, false) === null, 'claves-raras-no-cuelan', 'rango de «' + k + '»') });
  // el reloj del núcleo contra otro cálculo de la hora de Madrid, hecho por otro camino
  const r = dado(7), ind = t0 => { const s = new Date(t0).toLocaleString('sv-SE', { timeZone: 'Europe/Madrid', hour12: false }), [f, h] = s.split(' '), [hh, mm] = h.split(':').map(Number); return { date: f, min: (hh % 24) * 60 + mm, day: new Date(f + 'T12:00:00Z').getUTCDay() } };
  const bordes = []; ['2026-03-29', '2026-10-25', '2027-03-28', '2027-10-31', '2026-12-31', '2028-02-29'].forEach(f => { for (let m = -180; m <= 180; m += 7) bordes.push(Date.parse(f + 'T00:00:00Z') + m * M) });
  for (let i = 0; i < 4000; i++) bordes.push(Date.parse('2026-01-01T00:00:00Z') + Math.floor(r() * 1000 * D));
  bordes.forEach(x => { const a = K.madrid(x), b = ind(x); es(a.date === b.date && a.min === b.min && a.day === b.day, 'hora-de-madrid', new Date(x).toISOString() + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
    const urg = b.day === 0 || b.day === 6 || cfg.festivos.includes(b.date) || b.min < cfg.dia[0] || b.min >= cfg.dia[1]; es(K.urgente(cfg, x) === urg, 'urgencia-segun-el-reloj', new Date(x).toISOString()) });
  // cualquier cosa que no sea texto y números: no revienta y no cambia nada
  const juntos = [undefined, NaN, Infinity, () => 1, Symbol.iterator, new Date(0), /x/, new Map(), 12n];
  juntos.forEach(x => juntos.forEach(y => { const antes = JSON.stringify(S); let R2; try { R2 = K.aplicar(S, cfg, { tipo: 'pedir', av: x, cli: { nombre: y, tel: x, dir: y, cp: x } }, { rol: y }, t) } catch (e) { rota('no-revienta', 'pedir con ' + String(x && x.constructor && x.constructor.name) + ': ' + e.message) } es(R2 && R2.ok === false && JSON.stringify(S) === antes, 'rechazo-limpio', 'pedir con datos imposibles') }));
  return n;
}

/* por tiempo: cuántos técnicos que trabajan toda la franja, y no faltan ese día, no tienen ninguna cita en ella (con las
   citas sin técnico ya repartidas sobre el papel) */
let S_ = null, cfg_ = null, N_ = null;
function sinCitaEn(dia, f) { const R = K.repartoDia(S_, cfg_, dia).S; return Object.keys(cfg_.tec).filter(tec => trabI(N_, tec, dia, f.de, f.a) && !K.ausente(S_, tec, dia) && !R.avisos.some(a => a.tec === tec && a.cita && a.cita.fr === f.id && a.e !== 'cancelado')).length }

/* ---------- variantes extremas de un negocio ---------- */
function variantes(N) {
  const min = clon(N); min.id += '-min'; min.tecnicos = min.tecnicos.slice(0, 1); min.franjas = min.franjas.slice(0, 1); min.cupo = 1; min.tarifa = { dia: [0, 1440], recargo: 0 }; min.festivos = []; min.garantiaMeses = 1;
  const max = clon(N); max.id += '-max'; max.cupo = 5; max.tarifa = { dia: [600, 720], recargo: 1 }; max.garantiaMeses = 36;
  max.franjas = [450, 570, 690, 870, 990, 1110].map((de, i) => ({ id: 'x' + i, de, a: de + 120 }));
  const todo = { 1: [[0, 1440]], 2: [[0, 1440]], 3: [[0, 1440]], 4: [[0, 1440]], 5: [[0, 1440]] };
  const sinH = X => { X.tecnicos.forEach(x => { delete x.horario; delete x.guardia }); delete X.horario; delete X.citas; return X };
  // el mismo negocio con otros turnos: uno a jornada entera, otro solo mañanas de lunes a jueves, otro entero y de guardia
  const tur = sinH(clon(N)); tur.id += '-turnos'; delete tur.cupo; tur.citas = { porFranja: 1, reserva: tur.tecnicos.length > 2 ? 1 : 0, reservaSiFalta: false };   // y aquí el dueño no guarda a nadie los días que falta alguien
  const de = Math.min(...N.franjas.map(f => f.de)), a = Math.max(...N.franjas.map(f => f.a)), mitad = N.franjas[Math.floor((N.franjas.length - 1) / 2)].a;
  const LV = t => ({ 1: t, 2: t, 3: t, 4: t, 5: t });
  tur.tecnicos.forEach((x, i) => { if (i % 3 === 1) x.horario = { 1: [[de, mitad]], 2: [[de, mitad]], 3: [[de, mitad]], 4: [[de, mitad]] }; else { x.horario = LV([[de, a]]); if (i % 3 === 2) x.guardia = 1 } });
  if (!conH(N)) return [min, max, tur];
  max.tecnicos.forEach(x => { x.horario = todo }); delete max.horario; max.citas = { porFranja: 3, reserva: 1 };
  // y sin horarios: un número fijo de citas por franja, como los negocios que aún no los han puesto
  const fijo = sinH(clon(N)); fijo.id += '-fijo'; fijo.cupo = 2;
  return [min, max, fijo, tur];
}

/* ---------- a correr ---------- */
let mal = 0, totalLeyes = 0, totalPasos = 0;
const t00 = Date.now();
for (const archivo of opc.negocio) {
  const { N, muestra } = leeNegocio(archivo);
  for (const [NN, mu] of [[N, muestra]].concat(variantes(N).map(v => [v, null]))) {
    const cfg = K.cfgDe(NN), vistas = new Set(), acept = {}, rech = {}, estados = new Set(); let leyes = 0, pasos = 0, fallos = 0;
    try { leyes += fijas(cfg, NN) } catch (e) { if (!(e instanceof Rota)) throw e; fallos++; mal++; console.log('  LEY ROTA en ' + NN.id + ' · ' + e.ley + ' · ' + e.detalle) }
    for (let i = 0; i < opc.tandas; i++) {
      const semilla = opc.semilla + i * 7919 + NN.id.length * 104729, R = tanda(cfg, NN, mu, semilla, opc.pasos);
      if (R.rota) {
        if (vistas.has(R.rota.ley)) continue; vistas.add(R.rota.ley); fallos++; mal++;
        const corta = R.sinEncoger ? R.lista : encoge(cfg, NN, R.ini, R.lista, R.rota.ley), v = repite(cfg, NN, R.ini, corta);
        console.log('  LEY ROTA en ' + NN.id + ' · ' + R.rota.ley + ' · semilla ' + semilla + '\n    ' + (v.rota ? v.rota.detalle : R.rota.detalle) + '\n    caso mínimo (' + corta.length + ' de ' + R.lista.length + ' pasos)' + (R.ini.muestra ? ', con la muestra' : '') + ', hora ' + new Date(R.ini.t0).toISOString() + ':');
        if (!R.sinEncoger) corta.forEach(x => console.log('      ' + JSON.stringify(x).slice(0, 400)));
        continue;
      }
      pasos += opc.pasos; leyes += R.W.leyes; R.W.estados.forEach(e => estados.add(e));
      for (const k in R.W.acept) acept[k] = (acept[k] || 0) + R.W.acept[k]; for (const k in R.W.rech) rech[k] = (rech[k] || 0) + R.W.rech[k];
    }
    // el recorrido tiene que haber pasado por todo: si no, la prueba no prueba
    const faltan = ['pedir', 'completar', 'asignar', 'soltar', 'mover', 'voy', 'ausente', 'empezar', 'noacepta', 'ampliar', 'pausa', 'anotar', 'terminar', 'cobrar', 'cancelar', 'enviado', 'descartar', 'escribir', 'ausencia', 'quitarAusencia', 'falta', 'furgo', 'garantia', 'corregirPago', 'rebajar'].concat(Object.keys(cfg.planes || {}).length ? ['contrato', 'cobroContrato', 'bajaContrato'] : []).filter(k => !acept[k]);
    const sinVer = ['nuevo', 'asignado', 'camino', 'curso', 'hecho', 'ausente', 'cancelado'].filter(e => !estados.has(e));
    if (opc.tandas >= 50 && (faltan.length || sinVer.length)) { fallos++; mal++; console.log('  EL RECORRIDO SE QUEDA CORTO en ' + NN.id + ': sin aceptar ' + faltan.join(', ') + ' · sin ver ' + sinVer.join(', ')) }
    const nA = Object.values(acept).reduce((s, x) => s + x, 0), nR = Object.values(rech).reduce((s, x) => s + x, 0);
    console.log((fallos ? 'MAL  ' : 'BIEN ') + NN.id.padEnd(14) + ' ' + String(pasos).padStart(6) + ' pasos · ' + nA + ' aceptadas, ' + nR + ' rechazadas (' + Object.keys(rech).length + ' motivos) · ' + leyes + ' comprobaciones');
    totalLeyes += leyes; totalPasos += pasos;
  }
}
console.log((mal ? 'FALLA' : 'TODO BIEN') + ' · ' + totalPasos + ' pasos al azar, ' + totalLeyes + ' comprobaciones, ' + ((Date.now() - t00) / 1000).toFixed(1) + ' s · semilla ' + opc.semilla);
process.exit(mal ? 1 : 0);
