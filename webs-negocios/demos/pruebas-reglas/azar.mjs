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
const SOLO_CENTRALITA = ['asignar', 'mover', 'cancelar', 'ausencia', 'quitarAusencia'], SOLO_SU_TECNICO = ['voy', 'ausente', 'empezar', 'noacepta', 'ampliar', 'pausa', 'terminar', 'posicion', 'sinPosicion'], LOS_DOS = ['completar', 'anotar', 'cobrar', 'enviado'];
const VISTA = ['id', 'av', 'e', 'urg', 'cita', 't', 'tec', 'eta', 'pos', 'sal', 'ini', 'fin', 'total', 'tipo', 'pago', 'gar', 'sinTrabajo'];
const FEO = /undefined|NaN|\bnull\b|\[object|Invalid|Infinity/;
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
const capI = (N, S, dia, f) => conH(N) ? Math.max(0, topeI(N, S, dia, f) - ((N.citas && N.citas.reserva) || 0)) : N.cupo;
const cap0 = (N, S, A, f) => capI(N, S, A.cita.dia, f) - (enFr(S, A.cita.dia, A.cita.fr) - 1) > 0;
const enFr = (S, dia, fr) => S.avisos.filter(a => a.cita && a.cita.dia === dia && a.cita.fr === fr && a.e !== 'cancelado').length;
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
  if (!['pedir'].concat(SOLO_CENTRALITA, SOLO_SU_TECNICO, LOS_DOS).includes(tipo)) rota('acciones-conocidas', 'se ha aceptado «' + tipo + '»');
  // --- contador, y nada cambia fuera del aviso tocado
  if (S.v !== v0 + 1) rota('version-sube-de-uno-en-uno', v0 + ' → ' + S.v);
  if (S.avisos.length !== n0 + (tipo === 'pedir' ? 1 : 0)) rota('nadie-desaparece', n0 + ' → ' + S.avisos.length);
  if (tipo !== 'ausencia') for (const x of S.avisos) { const j = otros0.get(x.id); if (j !== undefined && x.id !== idA && JSON.stringify(x) !== j) rota('solo-cambia-el-aviso-tocado', tipo + ' sobre ' + idA + ' ha cambiado ' + x.id) }
  numerosLimpios(S, 'S');
  const ids = new Set();
  for (const x of S.avisos) { if (ids.has(x.id)) rota('numeros-unicos', x.id); ids.add(x.id); if (!new RegExp('^' + W.N.serie + '-\\d{4,}$').test(x.id)) rota('numeros-unicos', 'forma rara: ' + x.id); W.estados.add(x.e) }
  // --- el aviso tocado
  const A = tipo === 'pedir' ? S.avisos[S.avisos.length - 1] : A0;
  if (A) {
    if (tipo === 'pedir') { if (A.e !== 'nuevo') rota('salto-permitido', 'nace en ' + A.e) }
    else if (A.e !== e0 && !SALTOS.has(e0 + '>' + A.e)) rota('salto-permitido', e0 + ' → ' + A.e + ' con ' + tipo);
    unAviso(W, A, t);
  }
  // --- nadie en dos sitios, y ninguna franja pasa de su cupo
  const enMarcha = {}, porFranja = {};
  for (const x of S.avisos) {
    if (x.e === 'camino' || x.e === 'curso') { if (enMarcha[x.tec]) rota('un-tecnico-un-aviso', x.tec + ' está en ' + enMarcha[x.tec] + ' y en ' + x.id); enMarcha[x.tec] = x.id }
    if (x.cita && x.e !== 'cancelado' && !conH(W.N)) { const k = x.cita.dia + ' ' + x.cita.fr; porFranja[k] = (porFranja[k] || 0) + 1; if (porFranja[k] > cfg.cupo) rota('cupo', k + ' lleva ' + porFranja[k] + ' citas y caben ' + cfg.cupo) }
  }
  horarios(W, tipo, A, a, q, t);
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
  try { K.diasDe(S, cfg, t, 6).forEach(d => d.franjas.forEach(f => { if (f.ok && !(f.libres > 0)) rota('franja-ofrecida-con-hueco', d.dia + ' ' + f.id) })) } catch (e) { if (e instanceof Rota) throw e; rota('citas-no-revientan', e.message) }
  W.leyes += 21; return r;
}

/* ---- las leyes de los horarios: el cliente solo ve huecos reales y la oficina solo asigna a quien puede ---- */
function horarios(W, tipo, A, a, q, t) {
  const { S, cfg, N } = W, hoy = K.madrid(t).date, min = K.madrid(t).min, pf = (N.citas && N.citas.porFranja) || 1;
  const frDe = id => N.franjas.find(f => f.id === id);
  // 1. lo que se ofrece al cliente existe de verdad
  K.diasDe(S, cfg, t, 6).forEach(d => { if (!laborI(N, d.dia)) rota('solo-dias-laborables', d.dia); d.franjas.forEach(f => {
    const cap = capI(N, S, d.dia, frDe(f.id)), libres = cap - enFr(S, d.dia, f.id);
    if (f.ok && !(libres > 0)) rota('hueco-ofrecido-hueco-real', d.dia + ' ' + f.id + ': se ofrece y caben ' + cap + ' con ' + enFr(S, d.dia, f.id) + ' ya dadas');
    if (f.ok && d.dia === hoy && f.de < min + 120) rota('dos-horas-de-margen', d.dia + ' ' + f.id);
    if (f.libres !== Math.max(0, libres)) rota('huecos-bien-contados', d.dia + ' ' + f.id + ': dice ' + f.libres + ' y son ' + Math.max(0, libres)) }) });
  // 1b. lo que puede poner la oficina: todo lo del cliente y, además, el hueco de urgencias y las franjas de hoy sin acabar. Nunca donde no cabe
  K.diasDe(S, cfg, t, 6, true).forEach(d => { if (!laborI(N, d.dia)) rota('oficina-solo-dias-laborables', d.dia); d.franjas.forEach(f => {
    const tope = topeI(N, S, d.dia, frDe(f.id)), n = enFr(S, d.dia, f.id);
    if (f.ok && !f.okOf) rota('lo-del-cliente-lo-puede-la-oficina', d.dia + ' ' + f.id);
    if (f.okOf && !(tope > n)) rota('la-oficina-no-fuerza-donde-no-cabe', d.dia + ' ' + f.id + ': caben ' + tope + ' y hay ' + n);
    if (f.okOf && d.dia === hoy && f.a <= min) rota('la-oficina-no-pone-en-franja-acabada', d.dia + ' ' + f.id);
    if (f.tope !== tope || f.libresOf !== Math.max(0, tope - n)) rota('tope-bien-contado', d.dia + ' ' + f.id + ': dice ' + f.tope + '/' + f.libresOf + ' y son ' + tope + '/' + Math.max(0, tope - n));
    if ((f.por !== '') !== (f.okOf && !f.ok)) rota('se-dice-por-que-solo-la-oficina', d.dia + ' ' + f.id + ': «' + f.por + '»');
    if (f.por.includes('margen') && !(d.dia === hoy && f.de < min + 120)) rota('margen-bien-dicho', d.dia + ' ' + f.id);
    if (f.por.includes('reserva') && capI(N, S, d.dia, frDe(f.id)) - n > 0) rota('reserva-bien-dicha', d.dia + ' ' + f.id) }) });
  // 2. una cita nueva o cambiada nunca pasa de lo que cabe en ese momento: para el cliente, lo que se le ofrece; para la oficina, el tope
  if ((tipo === 'pedir' || tipo === 'mover') && A && A.cita) { const esOf = !!q && q.rol === 'centralita', f = frDe(A.cita.fr), cap = esOf ? topeI(N, S, A.cita.dia, f) : capI(N, S, A.cita.dia, f), n = enFr(S, A.cita.dia, A.cita.fr);
    if (n > cap) rota('cita-nueva-cabe', A.cita.dia + ' ' + A.cita.fr + ': ' + n + ' citas y caben ' + cap + (esOf ? ' (oficina)' : ''));
    if (!laborI(N, A.cita.dia) || A.cita.dia < hoy || (A.cita.dia === hoy && (esOf ? f.a <= min : f.de < min + 120))) rota('cita-nueva-a-tiempo', A.cita.dia + ' ' + A.cita.fr + (esOf ? ' (oficina)' : ''));
    const debe = [cap0(N, S, A, f) ? '' : 'reserva', A.cita.dia === hoy && f.de < min + 120 ? 'margen' : ''].filter(Boolean).join('+');
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
  if (JSON.stringify(Object.entries(esperado).sort()) !== JSON.stringify(Object.entries(dicho).sort())) rota('sobran-exacto', 'dice ' + JSON.stringify(dicho) + ' y son ' + JSON.stringify(esperado));
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
    if (!(T.total > 0)) rota('total-mayor-que-cero', A.id);
    if (T.tipo !== 10 && T.tipo !== 21) rota('iva-conocido', A.id + ': ' + T.tipo);
    let suma = 0; T.lineas.forEach(l => { entero(l.imp, A.id + ' línea ' + l.k); suma += l.imp });
    if (suma !== T.total) rota('total-suma-de-lineas', A.id + ': ' + suma + ' ≠ ' + T.total);
    if (T.base + T.iva !== T.total) rota('base-mas-iva', A.id);
    if (Math.abs(T.base * (1 + T.tipo / 100) - T.total) > 1) rota('iva-bien-calculado', A.id + ': base ' + T.base + ', total ' + T.total + ' al ' + T.tipo + ' %');
    if ((T.motivo === 'local') !== !!T.local || (T.tipo === 21) !== (T.motivo !== 'vivienda')) rota('motivo-del-iva', A.id + ': ' + T.motivo + ' al ' + T.tipo + ' %');
    const otra = K.precio(cfg, A.lin, { urg: T.urg, local: T.local });
    if (otra.total !== T.total || otra.tipo !== T.tipo) rota('se-puede-recalcular', A.id + ': guardado ' + T.total + ', recalculado ' + otra.total);
  }
  if (A.pres) {
    const j = JSON.stringify(A.pres), antes = W.firmado.get(A.id);
    if (antes === undefined) { W.firmado.set(A.id, j); if (A.pres.urg !== (A.cita ? false : K.urgente(cfg, A.t))) rota('tarifa-del-momento-del-aviso', A.id) }
    else if (antes !== j) rota('lo-firmado-no-cambia', A.id + ': el presupuesto firmado ha cambiado');
    const amp = A.amp || [], vistas = W.amps.get(A.id) || [];
    vistas.forEach((x, i) => { if (JSON.stringify(amp[i]) !== x) rota('lo-firmado-no-cambia', A.id + ': la ampliación ' + (i + 1) + ' ha cambiado') });
    W.amps.set(A.id, amp.map(x => JSON.stringify(x)));
    amp.forEach(x => { if (!(x.dif > 0)) rota('ampliacion-suma', A.id); if (typeof x.firma !== 'string' || x.firma.length < 12) rota('ampliacion-con-firma', A.id) });
    if (A.tot && !A.sinTrabajo && A.pres.total + amp.reduce((s, x) => s + x.dif, 0) !== A.tot.total) rota('firmado-mas-ampliaciones', A.id);
    if (typeof A.pres.firma !== 'string' || A.pres.firma.length < 12) rota('presupuesto-con-firma', A.id);
  }
  if (A.e === 'hecho') {
    if (A.sinTrabajo) { if (A.gar) rota('sin-trabajo-sin-garantia', A.id); if (!A.pago) rota('terminado-con-cobro', A.id) }
    else { if (!A.gar || A.gar.hasta !== K.masMeses(K.madrid(A.fin).date, cfg.meses)) rota('garantia-bien-fechada', A.id + ': ' + JSON.stringify(A.gar)) }
    if (!A.tot || !A.pago) rota('terminado-con-cobro', A.id + ': terminado sin precio firmado o sin decir cómo se paga');
    if (A.pago) { if (!K.PAGOS.includes(A.pago.modo)) rota('forma-de-pago-conocida', A.id); if (A.pago.cobrado !== (A.pago.modo !== 'pendiente')) rota('pendiente-no-es-cobrado', A.id) }
  } else if (A.pago || A.gar) rota('cobro-y-garantia-solo-al-acabar', A.id + ' en ' + A.e);
  // mensajes
  const pendientes = new Set();
  for (const m of A.msgs) {
    if (!(m.k in K.MSG) || !Object.prototype.hasOwnProperty.call(K.MSG, m.k)) rota('mensaje-conocido', A.id + ': ' + m.k);
    if (!m.env) {
      if (pendientes.has(m.k)) rota('mensaje-sin-repetir', A.id + ': dos «' + m.k + '» por enviar'); pendientes.add(m.k);
      let txt; try { txt = K.mensaje(cfg, A, m.k) } catch (e) { rota('mensaje-no-revienta', A.id + ' «' + m.k + '»: ' + e.message) }
      if (typeof txt !== 'string' || txt.length < 20) rota('mensaje-con-texto', A.id + ' «' + m.k + '» sale vacío');
      if (FEO.test(txt) || /\d\.\d+ (a|de)\b|\b\d+\.\d+\.$/.test(txt)) rota('mensaje-sin-huecos', A.id + ' «' + m.k + '»: ' + txt);
    }
  }
  if (pendientes.has('cobro') && !(A.pago && !A.pago.cobrado)) rota('recordatorio-de-pago-solo-si-debe', A.id);
  if ((pendientes.has('cita') || pendientes.has('vispera')) && !A.cita) rota('mensaje-de-cita-solo-con-cita', A.id);
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
  const firma = () => r() < .06 ? pick(['', 'M1', null, 7]) : FIRMA;
  const modo = () => r() < .06 ? pick(['paypal', '', null, 'constructor']) : pick(K.PAGOS);

  function pedir(S, t) {
    const a = { tipo: 'pedir', av: r() < .04 ? pick(RAROS) : pick(avs), cli: cliente(), origen: r() < .05 ? pick(RAROS) : pick(K.ORIGEN), nota: pick(['', 'Gotea desde ayer.', 'x'.repeat(900), '<script>1</script>']) };
    if (r() < .5) { a.cita = cita(S, t); if (r() < .35) a.alt = [cita(S, t), cita(S, t), r() < .2 ? pick(RAROS) : cita(S, t)] }
    if (r() < .12) { const c = a.cli, que = pick(['tel', 'dir', 'cp', 'nombre', 'apellidos', 'zona', 'todo']); if (que === 'zona') c.cp = '99999'; else if (que === 'todo') a.cli = pick([null, 'hola', {}, []]); else if (que === 'tel') c.tel = pick(['', '12345', '+34 600 00 01 02', '0034600000102', '5551234']); else c[que] = '' }
    if (a.origen === 'web' && r() < .6) a.cli = { nombre: '', tel: '', dir: '', cp: r() < .5 ? pick(cps) : '' };
    if (r() < .2) a.foto = 'data:image/jpeg;base64,' + 'A'.repeat(r() < .1 ? 150000 : 400);
    return [a, r() < .7 ? { rol: 'cliente' } : C];
  }
  function sensata(S, A, t) {
    const suyo = A.tec && cfg.tec[A.tec] ? T(A.tec) : T(pick(tecs)), u = r();
    const enviado = () => { const p = A.msgs.filter(m => !m.env); return [{ tipo: 'enviado', id: A.id, k: p.length ? pick(p).k : pick(Object.keys(K.MSG)) }, r() < .5 ? C : suyo] };
    const anotar = () => [{ tipo: 'anotar', id: A.id, obs: r() < .7 ? pick(['Llave de paso dura.', '', 'x'.repeat(600)]) : undefined, foto: r() < .6 ? 'data:image/jpeg;base64,' + 'B'.repeat(300) : undefined }, r() < .5 ? C : suyo];
    const mover = () => [{ tipo: 'mover', id: A.id, cita: r() < .75 ? (A.vale && A.vale.length > 1 && r() < .4 ? pick(A.vale) : cita(S, t)) : null, confirmado: r() < .2 ? true : undefined }, C];
    const pueden = tecs.filter(x => !K.puedeIr(S, cfg, A, x, t));
    const asignar = () => [{ tipo: 'asignar', id: A.id, tec: r() < .05 ? pick(RAROS) : pueden.length && r() < .7 ? pick(pueden) : pick(tecs) }, C];
    const cancelar = () => [{ tipo: 'cancelar', id: A.id, motivo: pick(['', 'Ya lo ha arreglado', 'x'.repeat(200)]) }, C];
    const empezar = () => [{ tipo: 'empezar', id: A.id, pres: { lineas: lineas(A, 0), firma: firma(), local: r() < .15 } }, suyo];
    const noacepta = () => [{ tipo: 'noacepta', id: A.id, modo: modo(), local: r() < .15 }, suyo];
    const posicion = () => r() < .2 ? [{ tipo: 'sinPosicion', id: A.id }, r() < .85 ? suyo : pick([C, T(pick(tecs)), { rol: 'cliente' }])]
      : [{ tipo: 'posicion', id: A.id, lat: r() < .1 ? pick([91, -200, '41.3', null, NaN, undefined]) : 41.3 + r() * .2, lon: r() < .05 ? pick([181, 'x', null]) : 2.05 + r() * .2, prec: pick([5, 30, 800, -1, 'x', undefined]) }, r() < .85 ? suyo : pick([C, T(pick(tecs)), { rol: 'cliente' }])];
    switch (A.e) {
      case 'nuevo': if (!A.cli.tel || !A.cli.dir || !A.cli.dis) return u < .7 ? [{ tipo: 'completar', id: A.id, cli: cliente() }, C] : u < .85 ? asignar() : cancelar();
        return u < .6 ? asignar() : u < .75 ? mover() : u < .83 ? cancelar() : u < .9 ? anotar() : enviado();
      case 'asignado': return u < .45 ? [{ tipo: 'voy', id: A.id }, suyo] : u < .55 ? empezar() : u < .65 ? asignar() : u < .75 ? mover() : u < .8 ? cancelar() : u < .85 ? noacepta() : u < .9 ? anotar() : enviado();
      case 'camino': return u < .35 ? posicion() : u < .7 ? empezar() : u < .8 ? [{ tipo: 'ausente', id: A.id }, suyo] : u < .87 ? noacepta() : u < .93 ? anotar() : enviado();
      case 'curso': return u < .35 ? [{ tipo: 'terminar', id: A.id, modo: modo(), firma: r() < .5 ? FIRMA : undefined }, suyo] : u < .55 ? [{ tipo: 'pausa', id: A.id }, suyo] : u < .75 ? [{ tipo: 'ampliar', id: A.id, lineas: lineas(A, 1), firma: firma() }, suyo] : u < .9 ? anotar() : enviado();
      case 'ausente': return u < .5 ? asignar() : u < .75 ? mover() : u < .9 ? cancelar() : enviado();
      case 'hecho': return u < .5 ? [{ tipo: 'cobrar', id: A.id, modo: r() < .1 ? 'pendiente' : pick(K.PAGOS.filter(m => m !== 'pendiente')) }, r() < .5 ? C : suyo] : enviado();
      default: return enviado();
    }
  }
  function cualquiera(S, A) {
    const tipo = pick(['completar', 'asignar', 'mover', 'voy', 'ausente', 'empezar', 'noacepta', 'ampliar', 'pausa', 'anotar', 'terminar', 'cobrar', 'cancelar', 'enviado', 'pack', 'borrar', 'pedir', 'posicion', 'sinPosicion']);
    const quien = pick([C, { rol: 'cliente' }, T(pick(tecs)), T(pick(tecs)), { rol: 'tecnico', id: pick(RAROS) }, { rol: pick(RAROS) }, {}]);
    return [{ tipo, id: A.id, lat: 41.38, lon: 2.17, tec: pick(tecs), modo: pick(K.PAGOS), firma: FIRMA, pres: { lineas: lineas(A, 0), firma: FIRMA }, lineas: lineas(A, 1), k: pick(Object.keys(K.MSG)), pack: pick(['basico', 'pro']), cita: null, av: pick(avs), cli: cliente() }, quien];
  }
  function basura(S) {
    const A = S.avisos.length ? pick(S.avisos) : { id: 'X-0001' };
    return pick([[null, null], [{}, {}], [{ tipo: pick(RAROS) }, C], [{ tipo: 'pedir', av: pick(RAROS), cli: pick(RAROS) }, { rol: 'cliente' }], [{ tipo: 'asignar', id: pick(RAROS), tec: pick(RAROS) }, C],
      [{ tipo: 'asignar', id: A.id, tec: pick(['__proto__', 'constructor', 'toString']) }, C], [{ tipo: 'empezar', id: A.id, pres: pick(RAROS) }, T(pick(tecs))], [{ tipo: 'empezar', id: A.id, pres: { lineas: pick(RAROS), firma: FIRMA } }, T(A.tec || pick(tecs))],
      [{ tipo: 'pack', pack: pick(RAROS) }, C], [{ tipo: 'enviado', id: A.id, k: pick(RAROS) }, C], [{ tipo: 'mover', id: A.id, cita: pick(RAROS) }, C], [{ tipo: 'cobrar', id: A.id, modo: pick(RAROS) }, C],
      [{ tipo: 'pedir', av: pick(avs), cli: { nombre: 'Ana', apellidos: 'Prueba', tel: '600000199', dir: 'C/ Mayor 1', cp: pick(RAROS), dis: pick(['__proto__', 'constructor', 'zz']) } }, { rol: 'cliente' }],
      [{ tipo: 'anotar', id: A.id, obs: pick(RAROS), foto: pick(RAROS) }, C], [{ tipo: 'terminar', id: A.id, modo: pick(RAROS), firma: pick(RAROS) }, T(A.tec || pick(tecs))], [{ tipo: 'ampliar', id: A.id, lineas: pick(RAROS), firma: FIRMA }, T(A.tec || pick(tecs))]]);
  }
  return function siguiente(S, t) {
    const u = r(); if (u < .04) return basura(S);
    if (u < .065) { const hoy = K.madrid(t).date, de = K.masDias(hoy, Math.floor(r() * 7)), al = K.masDias(de, Math.floor(r() * 5));
      return r() < .12 ? [{ tipo: 'ausencia', tec: pick(tecs.concat(RAROS)), de: pick([de, '2020-01-01', '2026-02-30', 7, null]), a: pick([al, '1999-12-31', 'mañana']) }, pick([C, C, T(pick(tecs))])] : [{ tipo: 'ausencia', tec: pick(tecs), de, a: al, motivo: pick(['Vacaciones', 'Baja', '', 'x'.repeat(100)]) }, C] }
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

/* ---------- variantes extremas de un negocio ---------- */
function variantes(N) {
  const min = clon(N); min.id += '-min'; min.tecnicos = min.tecnicos.slice(0, 1); min.franjas = min.franjas.slice(0, 1); min.cupo = 1; min.tarifa = { dia: [0, 1440], recargo: 0 }; min.festivos = []; min.garantiaMeses = 1;
  const max = clon(N); max.id += '-max'; max.cupo = 5; max.tarifa = { dia: [600, 720], recargo: 1 }; max.garantiaMeses = 36;
  max.franjas = [450, 570, 690, 870, 990, 1110].map((de, i) => ({ id: 'x' + i, de, a: de + 120 }));
  const todo = { 1: [[0, 1440]], 2: [[0, 1440]], 3: [[0, 1440]], 4: [[0, 1440]], 5: [[0, 1440]] };
  const sinH = X => { X.tecnicos.forEach(x => { delete x.horario; delete x.guardia }); delete X.horario; delete X.citas; return X };
  // el mismo negocio con otros turnos: uno a jornada entera, otro solo mañanas de lunes a jueves, otro entero y de guardia
  const tur = sinH(clon(N)); tur.id += '-turnos'; delete tur.cupo; tur.citas = { porFranja: 1, reserva: tur.tecnicos.length > 2 ? 1 : 0 };
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
    const faltan = ['pedir', 'completar', 'asignar', 'mover', 'voy', 'ausente', 'empezar', 'noacepta', 'ampliar', 'pausa', 'anotar', 'terminar', 'cobrar', 'cancelar', 'enviado', 'ausencia', 'quitarAusencia'].filter(k => !acept[k]);
    const sinVer = ['nuevo', 'asignado', 'camino', 'curso', 'hecho', 'ausente', 'cancelado'].filter(e => !estados.has(e));
    if (opc.tandas >= 50 && (faltan.length || sinVer.length)) { fallos++; mal++; console.log('  EL RECORRIDO SE QUEDA CORTO en ' + NN.id + ': sin aceptar ' + faltan.join(', ') + ' · sin ver ' + sinVer.join(', ')) }
    const nA = Object.values(acept).reduce((s, x) => s + x, 0), nR = Object.values(rech).reduce((s, x) => s + x, 0);
    console.log((fallos ? 'MAL  ' : 'BIEN ') + NN.id.padEnd(14) + ' ' + String(pasos).padStart(6) + ' pasos · ' + nA + ' aceptadas, ' + nR + ' rechazadas (' + Object.keys(rech).length + ' motivos) · ' + leyes + ' comprobaciones');
    totalLeyes += leyes; totalPasos += pasos;
  }
}
console.log((mal ? 'FALLA' : 'TODO BIEN') + ' · ' + totalPasos + ' pasos al azar, ' + totalLeyes + ' comprobaciones, ' + ((Date.now() - t00) / 1000).toFixed(1) + ' s · semilla ' + opc.semilla);
process.exit(mal ? 1 : 0);
