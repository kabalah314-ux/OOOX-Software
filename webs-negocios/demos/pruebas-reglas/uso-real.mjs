// Pruebas de uso real (15-11-2026): el negocio de la demo «en uso», nueve semanas después de empezar con la app.
//
// La demo no lleva datos escritos a mano: su archivo de datos trae un programa (OFICIO_MUESTRA) que hace, día a día,
// lo que haría el negocio, y cada paso pasa por las reglas. Aquí se hace ese negocio a ocho horas y días distintos y se
// mira que todo cuadre: lo que dice la app de cobros, facturas, contratos y agenda, con los datos que hay debajo.
// Cada comprobación lleva su número de la lista de pruebas (pruebas-uso/LISTA.md).
//
//   node pruebas-reglas/uso-real.mjs <carpeta del sitio> <datos del negocio en uso>
import fs from 'fs'; import vm from 'vm'; import path from 'path';

const SITIO = process.argv[2], DATOS = process.argv[3];
if (!SITIO || !DATOS) { console.error('uso: node uso-real.mjs <carpeta del sitio> <oficio-datos.js del negocio en uso>'); process.exit(2) }
const g = {}; vm.createContext(g);
vm.runInContext(fs.readFileSync(path.join(SITIO, 'js/oficio-nucleo.js'), 'utf8'), g);
vm.runInContext(fs.readFileSync(DATOS, 'utf8'), g);
const K = g.OficioNucleo, N = g.OFICIO_NEGOCIO, cfg = K.cfgDe(N), M = 60000, D = 1440 * M;
let ok = 0, mal = 0;
const es = (c, q) => { if (c) ok++; else { mal++; console.log('  MAL ', q) } };
const lab = d => K.laborable(cfg, d), sig = (d, n) => K.masDias(d, n), sigLab = (d, n) => { let x = d, k = 0; while (k < n) { x = sig(x, 1); if (lab(x)) k++ } return x };
const C = { rol: 'centralita', id: 'marta' }, T = id => ({ rol: 'tecnico', id });
const FIRMA = 'M14 78C30 70 44 34 50 14 54 44 44 86 26 96M52 62C64 66 80 58 90 48';
const red = x => Math.round(x + 1e-7), eu = c => (c / 100).toFixed(2).replace('.', ',') + ' €';   // los importes van en céntimos, como en las reglas

es(typeof g.OFICIO_MUESTRA === 'function' && cfg.porTiempo, 'el negocio en uso trae su programa de muestra y reparte las citas por tiempo');

const HORAS = ['2026-11-16T07:50:00+01:00', '2026-11-17T10:30:00+01:00', '2026-11-18T13:45:00+01:00', '2026-11-20T19:30:00+01:00',
  '2026-11-21T11:00:00+01:00', '2026-11-22T22:00:00+01:00', '2026-12-08T12:00:00+01:00', '2027-03-28T12:00:00+02:00'];
let peor = 0, mayor = 0;
for (const h of HORAS) {
  const ahora = Date.parse(h), info = {}, t0 = Date.now(), S = g.OFICIO_MUESTRA(K, cfg, ahora, info), ms = Date.now() - t0, tam = JSON.stringify(S).length;
  peor = Math.max(peor, ms); mayor = Math.max(mayor, tam);
  const n = K.madrid(ahora), hoy = n.date, A = S.avisos, R = K.resumen(S, cfg, ahora), H = A.filter(a => a.e === 'hecho');
  const q = t => h.slice(0, 16) + ' · ' + t;
  // U01: ningún paso rechazado, y un negocio de verdad
  es(info.fallos.length === 0, q('U01: ningún paso rechazado por las reglas' + (info.fallos.length ? ': ' + JSON.stringify(info.fallos.slice(0, 3)) : '')));
  es(A.length >= 300 && A.length <= 700, q('U01: entre 300 y 700 avisos (' + A.length + ')'));
  // U03: lo que ocupa y lo que tarda
  es(tam < 2.5e6, q('U03: ocupa menos de 2,5 MB (' + (tam / 1e6).toFixed(2) + ')'));
  es(ms < 3000, q('U03: se hace en menos de 3 segundos (' + ms + ' ms)'));
  // U04: cada trabajo terminado, completo y en orden; nadie en dos trabajos a la vez
  const incompletos = H.filter(a => !a.tot || !a.pago || (a.tot.total > 0 && !K.PAGOS.includes(a.pago.modo)) || (!a.sinTrabajo && (!a.pres || typeof a.pres.firma !== 'string' || a.pres.firma.length < 12)));
  es(!incompletos.length, q('U04: cada terminado tiene total, forma de pago y firma' + (incompletos.length ? ': ' + incompletos.slice(0, 3).map(a => a.id) : '')));
  const desorden = H.filter(a => !(a.t <= (a.sal || a.fin) && (a.sal || a.fin) <= (a.ini || a.fin) && (a.ini || a.fin) <= a.fin));
  es(!desorden.length, q('U04: los tiempos van en orden: se pide, se va, se empieza, se termina' + (desorden.length ? ': ' + desorden.slice(0, 3).map(a => a.id) : '')));
  const solapes = []; Object.keys(cfg.tec).forEach(tec => { const L = A.filter(a => a.tec === tec && a.sal && (a.fin || ['camino', 'curso'].includes(a.e))).map(a => [a.sal, a.fin || ahora, a.id]).sort((x, y) => x[0] - y[0]);
    for (let i = 1; i < L.length; i++)if (L[i][0] < L[i - 1][1]) solapes.push(tec + ' ' + L[i - 1][2] + '/' + L[i][2]) });
  es(!solapes.length, q('U04: ningún técnico está en dos trabajos a la vez' + (solapes.length ? ': ' + solapes.slice(0, 3) : '')));
  // U05: ninguna cita del pasado sin hacer ni cerrar; «no había nadie» solo de los dos últimos días
  const viejas = A.filter(a => a.cita && a.cita.dia < hoy && (['nuevo', 'asignado', 'camino', 'curso'].includes(a.e) || (a.e === 'ausente' && a.cita.dia < sig(hoy, -2))));
  es(!viejas.length, q('U05: ninguna cita de antes de hoy sigue sin hacer o sin cerrar' + (viejas.length ? ': ' + viejas.slice(0, 3).map(a => a.id + ' ' + a.e + ' ' + a.cita.dia) : '')));
  // U06: lo que queda por cobrar
  const pend = H.filter(a => a.pago && !a.pago.cobrado);
  es(R.pend.n === pend.length && red(R.pend.total) === red(pend.reduce((s, a) => s + a.tot.total, 0)) && pend.length > 0, q('U06: lo pendiente de cobro cuadra y hay alguno (' + pend.length + ', ' + eu(R.pend.total) + ')'));
  // U07: lo que falta por facturar, y el aviso de lo que lleva una semana
  const sinFac = H.filter(a => a.tot && a.tot.total > 0 && !a.fac);
  es(R.porFac.n === sinFac.length && R.porFac.viejos >= 1 && R.porFac.viejos === sinFac.filter(a => Math.floor((ahora - a.fin) / D) >= 7).length, q('U07: por facturar cuadra y hay alguno de hace más de una semana (' + sinFac.length + ', viejos ' + R.porFac.viejos + ')'));
  // U08: la caja de hoy, por forma de pago
  const caja = { efectivo: 0, tarjeta: 0, bizum: 0, transferencia: 0 }; H.forEach(a => { if (a.pago && a.pago.cobrado && a.pago.t && K.madrid(a.pago.t).date === hoy && caja[a.pago.modo] != null) caja[a.pago.modo] += a.tot.total });
  es(Object.keys(caja).every(k => red(caja[k]) === red(R.caja[k])) && red(R.caja.total) === red(Object.values(caja).reduce((s, x) => s + x, 0)), q('U08: la caja de hoy es la suma de lo cobrado hoy (' + eu(R.caja.total) + ')'));
  // U09: ningún mensaje sin mandar de hace más de dos días
  const sinMandar = []; A.forEach(a => (a.msgs || []).forEach(m => { if (!m.env && m.t < ahora - 2 * D) sinMandar.push(a.id + ':' + m.k) }));
  es(!sinMandar.length, q('U09: no hay mensajes sin mandar de hace más de dos días' + (sinMandar.length ? ': ' + sinMandar.slice(0, 3) : '')));
  // U10: el trabajo, repartido entre los tres
  const por = {}; H.forEach(a => { por[a.tec] = (por[a.tec] || 0) + 1 });
  es(Object.keys(cfg.tec).every(t => (por[t] || 0) > H.length * .15) && Object.values(por).every(x => x <= H.length * .5), q('U10: los tres técnicos trabajan y ninguno se lleva más de la mitad (' + JSON.stringify(por) + ')'));
  // U11: en horas de trabajo, hay alguien para una urgencia ahora
  if (lab(hoy) && n.min >= 480 && n.min <= 1140) { const u = K.urgenciaAhora(S, cfg, null, ahora, 'fuga'); es(u && u.de <= 120, q('U11: hay alguien para una urgencia y llega en menos de dos horas' + (u ? ' (' + u.tec + ', ' + u.de + ' min)' : ': nadie'))) }
  // U12: en el plan de cada técnico, ninguna cita de los próximos días llega tarde
  const tarde = []; for (let d = sig(hoy, 1), k = 0; k < 10; k++, d = sig(d, 1)) Object.keys(cfg.tec).forEach(tec => K.agendaDe(S, cfg, tec, d).forEach(x => { if (x.tarde) tarde.push(tec + ' ' + d + ' ' + x.id) }));
  es(!tarde.length, q('U12: ninguna cita de los próximos días llega tarde en el plan de su técnico' + (tarde.length ? ': ' + tarde.slice(0, 3) : '')));
  // U13: lo que sobra, solo el día que falta Laia
  const baja = (S.ausencias || []).find(x => x.tec === 'laia'), so = K.sobran(S, cfg, ahora);
  es(so.every(x => baja && x.dia >= baja.de && x.dia <= baja.a) && R.sobran.length === so.length, q('U13: solo sobran citas el día que falta Laia (' + so.map(x => x.dia + ' ' + x.fr + ' ' + x.sobran).join(', ') + ')'));
  // U25: ese día, Laia no tiene ninguna cita
  es(baja && !A.some(a => a.tec === 'laia' && a.cita && a.cita.dia >= baja.de && a.cita.dia <= baja.a && a.e !== 'cancelado'), q('U25: el día que falta, Laia no tiene ninguna cita'));
  // U14: el cliente que vuelve sale en garantía
  const enGar = A.filter(a => K.garantiaDe(S, cfg, a.cli, a.t, a.id).length && a.t > Math.min(...A.filter(b => b.e === 'hecho').map(b => b.fin)));
  es(enGar.length >= 3, q('U14: hay avisos de clientes que vuelven dentro de la garantía (' + enGar.length + ')'));
  // U15: los contratos: activos, alguno por renovar, revisiones pendientes y alguna cuota por cobrar
  const pc = K.pendientesContratos(S, cfg, ahora), act = (S.contratos || []).filter(x => x.e === 'activo');
  es(act.length >= 10 && pc.renovar.length >= 1 && pc.revision.length >= 1 && pc.cobrar.length >= 1, q('U15: contratos ' + act.length + ', por renovar ' + pc.renovar.length + ', revisiones ' + pc.revision.length + ', cuotas ' + pc.cobrar.length));
  // U15: la revisión se pide desde un mes antes de que toque, y no antes (decidido el 15-11-2026)
  es(pc.revision.every(x => x.toca && x.toca <= K.masDias(hoy, 30)) && act.some(C => { const i = C.per.findIndex(p => p.de <= hoy && p.a >= hoy); return i >= 0 && K.tocaRevision(C.per[i], 1, 1) > K.masDias(hoy, 30) && !pc.revision.some(x => x.id === C.id) }),
    q('U15: las revisiones que salen tocan en el próximo mes; las de los contratos recientes, aún no'));
  // U58: el día que falta Laia, el dueño ha decidido no guardar a nadie para urgencias: el cliente puede pedir cita ese día
  if (baja && baja.de > hoy && lab(baja.de)) { const D = K.diasDe(S, cfg, ahora, 10, false, { av: 'grifo', cli: { dis: '' } }).find(d => d.dia === baja.de);
    es(!cfg.reservaSiFalta && K.reservaDe(S, cfg, baja.de) === 0 && K.reservaDe(S, cfg, sigLab(baja.de, 1)) === cfg.reserva && D && D.franjas.some(f => f.ok), q('U58: el día que falta Laia no se guarda a nadie para urgencias y el cliente puede pedir cita (' + baja.de + ')')) }
  // U61–U64: los mensajes de después del trabajo (15-11-2026, noche)
  { const PM = K.porMandar(S, ahora), seg = PM.filter(x => K.SEGUIR.includes(x.m.k)), ini = Date.parse(hoy + 'T00:00:00Z') - 2 * 3600000;
    es(seg.every(x => x.m.t >= ini && !(x.m.hasta && x.m.hasta < ahora)) && (!(lab(hoy) && n.min >= 600 && n.min <= 1200) || seg.length >= 1),
      q('U61: el seguimiento por mandar es el de hoy, sin caducados, y en un día de trabajo hay alguno (' + seg.length + ')'));
    const noQ = A.filter(a => a.noMsg), tels = new Set(noQ.map(a => a.cli.tel)), malos = A.filter(a => tels.has(a.cli.tel) && a.msgs.some(m => !m.env && K.SEGUIR.includes(m.k)));
    es(tels.size >= (hoy >= '2026-11-16' ? 1 : 0) && !malos.length && A.filter(a => tels.has(a.cli.tel)).every(a => a.noMsg) && !PM.some(x => tels.has(x.a.cli.tel) && K.SEGUIR.includes(x.m.k)),
      q('U62: el cliente que dijo que no quiere mensajes de seguimiento no tiene ninguno por mandar (' + [...tels].join(', ') + ')'));
    const np = H.filter(a => a.noPres), malP = np.filter(a => !(a.sinTrabajo && a.noPres.total > 0 && a.msgs.some(m => m.k === 'presupuesto' && m.t === a.fin + 3 * D && m.hasta === a.fin + 14 * D)));
    es(np.length >= 2 && !malP.length && H.filter(a => a.sinTrabajo).every(a => a.noPres), q('U63: cada presupuesto no aceptado queda guardado con su mensaje a los tres días (' + np.length + ')' + (malP.length ? ': ' + malP.slice(0, 3).map(a => a.id) : '')));
    const todos = [].concat(...A.map(a => a.msgs)), dej = todos.filter(m => m.no), segH = H.filter(a => !a.sinTrabajo && a.av !== K.REV), sinSeg = segH.filter(a => !tels.has(a.cli.tel) && !a.msgs.some(m => m.k === 'seguimiento'));
    es(dej.length >= 1 && dej.every(m => m.env && K.SEGUIR.includes(m.k)) && !sinSeg.length, q('U64: cada trabajo hecho lleva su seguimiento, y los que no hacían falta quedan dejados (' + dej.length + ')' + (sinSeg.length ? ': sin seguimiento ' + sinSeg.slice(0, 3).map(a => a.id) : ''))) }
  // U17: las urgencias del mes y la parte de OOOX
  const mes = hoy.slice(0, 7), um = K.urgenciasMes(S, cfg, mes);
  let nU = 0, base = 0; H.forEach(a => { if (!a.pago || !a.pago.cobrado || !a.pago.t || K.madrid(a.pago.t).date.slice(0, 7) !== mes) return; const l = (a.tot.lineas || []).find(x => x.k === cfg.urge && x.imp > 0); if (l) { nU++; base += red(l.imp / (1 + (a.tot.tipo || 10) / 100)) } });
  es(um.n === nU && red(um.base) === red(base) && red(um.oox) === red(base * K.COMISION_URG) && um.n > 0, q('U17: urgencias del mes ' + um.n + ', suplementos sin IVA ' + eu(um.base) + ', OOOX ' + eu(um.oox)));
  // U22: el presupuesto que no se acepta: solo el desplazamiento
  const noAc = H.filter(a => a.sinTrabajo);
  es(noAc.length >= 2 && noAc.every(a => a.tot.lineas.length === 1 && a.tot.lineas[0].k === N.sinTrabajo), q('U22: los presupuestos no aceptados cobran solo el desplazamiento (' + noAc.length + ')'));
  // U23: no había nadie: queda apuntado, con su mensaje, y la cita se movió o se puede mover
  const aus = A.filter(a => (a.h || []).some(l => l.txt === 'No había nadie'));
  es(aus.length >= 2 && aus.every(a => (a.msgs || []).some(m => m.k === 'ausente') || a.e === 'hecho' || a.e === 'cancelado') && aus.filter(a => a.e !== 'ausente').every(a => a.e === 'hecho' || a.e === 'cancelado' || (a.cita && a.cita.dia >= hoy)), q('U23: las visitas sin nadie en casa quedan apuntadas, con su mensaje, y se vuelven a dar (' + aus.length + ')'));
  // U24: el material que falta sale en el día de ese técnico
  const man = A.find(a => Array.isArray(a.falta) && a.falta.length && a.cita && !['hecho', 'cancelado'].includes(a.e));
  if (man) { const gT = K.material(S, cfg, man.cita.dia).find(x => x.tec === (man.tec || '')); es(gT && gT.cosas.some(c => man.falta.some(f => f.k === c.k)), q('U24: el material que falta sale en el día de ' + (man.tec || 'quien no tiene técnico'))) }
  else es(false, q('U24: hay una cita con material que falta'));
  // U02: la misma hora da los mismos datos
  if (h === HORAS[1]) { const otra = g.OFICIO_MUESTRA(K, cfg, ahora, {}); es(JSON.stringify(otra) === JSON.stringify(S), q('U02: la misma hora da los mismos datos, letra por letra')) }
  // U16: una urgencia de un cliente con contrato va sin suplemento y sin desplazamiento
  { const S2 = JSON.parse(JSON.stringify(S)), Cn = act[0], t = ahora + 5 * M;
    const r = K.aplicar(S2, cfg, { tipo: 'pedir', av: 'fuga', cli: { nombre: Cn.cli.nombre, apellidos: Cn.cli.apellidos, tel: Cn.cli.tel, dir: Cn.cli.dir, cp: Cn.cli.cp }, origen: 'llamada' }, C, t);
    const tec = Object.keys(cfg.tec).find(x => !K.puedeIr(S2, cfg, S2.avisos.find(a => a.id === r.id), x, t) && !S2.avisos.some(a => a.tec === x && ['camino', 'curso'].includes(a.e)));
    const a1 = tec && K.aplicar(S2, cfg, { tipo: 'asignar', id: r.id, tec }, C, t + M), a2 = tec && K.aplicar(S2, cfg, { tipo: 'empezar', id: r.id, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: cfg.urge }], firma: FIRMA, pide: true } }, T(tec), t + 30 * M);
    const B = S2.avisos.find(a => a.id === r.id), L = B && B.tot ? B.tot.lineas : [];
    es(r.ok && (!tec || (a1.ok && a2.ok && L.filter(l => l.k === 'desp' || l.k === cfg.urge).every(l => l.imp === 0))), q('U16: la urgencia de un cliente con contrato va sin suplemento ni desplazamiento' + (tec ? '' : ' (ahora nadie puede ir: solo se pide)'))) }
  // U18: seguir trabajando sobre los datos vivos: 400 pasos más, sin rechazos que no tocan
  { const S3 = JSON.parse(JSON.stringify(S)); let t = ahora, sem = 7; const az = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff };
    const raros = [], bien = { pedir: 0, asignar: 0, voy: 0, empezar: 0, terminar: 0, cobrar: 0, facturar: 0 };
    const ap = (a, qq) => { const r = K.aplicar(S3, cfg, a, qq, t); if (r.ok) bien[a.tipo] = (bien[a.tipo] || 0) + 1; return r };
    for (let i = 0; i < 400; i++) { t += 6 * M; const x = az();
      if (x < .25) { const c = { nombre: 'Prueba', apellidos: 'Uso ' + i, tel: '6100' + String(10000 + i), dir: 'C/ de Prueba ' + (i + 1) + ', 1.º', cp: Object.keys(cfg.zonas.cp)[i % 30] };
        const r = ap({ tipo: 'pedir', av: ['fuga', 'atasco', 'grifo'][i % 3], cli: c, origen: 'llamada' }, C); if (!r.ok) raros.push('pedir:' + r.err) }
      else if (x < .45) { const A = S3.avisos.find(a => a.e === 'nuevo' && !a.cita && a.cli.tel); if (A) { const u = K.urgenciaAhora(Object.assign({}, S3, { avisos: S3.avisos.filter(a => a.id !== A.id) }), cfg, A.cli.dis, t, A.av);
        if (u) { const r = ap({ tipo: 'asignar', id: A.id, tec: u.tec }, C); if (!r.ok && !['ocupado', 'horario', 'lleno'].includes(r.err)) raros.push('asignar:' + r.err) } } }
      else if (x < .6) { const A = S3.avisos.find(a => a.e === 'asignado' && !a.cita && !S3.avisos.some(b => b.tec === a.tec && ['camino', 'curso'].includes(b.e))); if (A) { const r = ap({ tipo: 'voy', id: A.id }, T(A.tec)); if (!r.ok) raros.push('voy:' + r.err) } }
      else if (x < .75) { const A = S3.avisos.find(a => a.e === 'camino'); if (A) { const r = ap({ tipo: 'empezar', id: A.id, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: FIRMA, pide: true } }, T(A.tec)); if (!r.ok) raros.push('empezar:' + r.err) } }
      else if (x < .9) { const A = S3.avisos.find(a => a.e === 'curso'); if (A) { const r = ap({ tipo: 'terminar', id: A.id, modo: ['tarjeta', 'bizum', 'pendiente'][i % 3], firma: FIRMA }, T(A.tec)); if (!r.ok) raros.push('terminar:' + r.err) } }
      else if (x < .95) { const A = S3.avisos.find(a => a.e === 'hecho' && a.pago && !a.pago.cobrado); if (A) { const r = ap({ tipo: 'cobrar', id: A.id, modo: 'bizum' }, C); if (!r.ok) raros.push('cobrar:' + r.err) } }
      else { const A = S3.avisos.find(a => a.e === 'hecho' && a.tot && a.tot.total > 0 && !a.fac); if (A) { const r = ap({ tipo: 'facturar', id: A.id }, C); if (!r.ok) raros.push('facturar:' + r.err) } } }
    es(!raros.length && bien.terminar > 10, q('U18: 400 pasos más sobre los datos vivos sin rechazos que no tocan (' + JSON.stringify(bien) + (raros.length ? ' · raros ' + raros.slice(0, 4) : '') + ')')) }
}
es(peor < 3000, 'U03: el más lento se hace en ' + peor + ' ms');
console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}. El más lento, ${peor} ms; el más grande, ${(mayor / 1e6).toFixed(2)} MB.`);
process.exit(mal ? 1 : 0);
