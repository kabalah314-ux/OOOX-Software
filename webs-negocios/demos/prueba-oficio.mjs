// Comprueba las reglas de oficios (js/oficio-nucleo.js): el recorrido de un aviso y los casos raros.
// Uso: node webs-negocios/demos/prueba-oficio.mjs frontend/public/demos/ramirez-24h
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const sitio = path.resolve(process.argv[2] || 'site');
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require(path.join(sitio, 'js/oficio-nucleo.js'));
require(path.join(sitio, 'js/oficio-datos.js'));
const K = globalThis.OficioNucleo, N = globalThis.OFICIO_NEGOCIO, cfg = K.cfgDe(N);
let ok = 0, mal = 0;
const es = (cond, txt) => { if (cond) ok++; else { mal++; console.log('  FALLA:', txt) } };
const M = 60000, H = 60 * M, D = 24 * H;
const MAR = Date.parse('2026-11-10T09:00:00Z');        // martes 10-11-2026, 10:00 en Madrid: tarifa normal
const C = { rol: 'centralita', id: 'marta' }, CLI = { rol: 'cliente' }, T = id => ({ rol: 'tecnico', id });
const F = 'M10 10L60 40L110 12L160 44';                  // una firma cualquiera
const montse = { nombre: 'Montse Vila', tel: '600 00 01 43', dir: 'C/ Verdi 28, 2.º 1.ª', cp: '08012' };
let S, t;
const ap = (a, q) => K.aplicar(S, cfg, a, q, t += M);
const empieza = (pack) => { S = K.nuevo(); S.pack = pack || 'pro'; t = MAR };
const A = id => S.avisos.find(a => a.id === id);

// 1. la tarifa: normal de 8 a 20 h en laborables; urgencia el resto
es(!K.urgente(cfg, MAR), 'martes a las 10:00 es tarifa normal');
es(K.urgente(cfg, Date.parse('2026-11-10T06:59:00Z')), 'a las 7:59 es urgencia');
es(!K.urgente(cfg, Date.parse('2026-11-10T07:00:00Z')), 'a las 8:00 ya es normal');
es(!K.urgente(cfg, Date.parse('2026-11-10T18:59:00Z')), 'a las 19:59 sigue normal');
es(K.urgente(cfg, Date.parse('2026-11-10T19:00:00Z')), 'a las 20:00 es urgencia');
es(K.urgente(cfg, Date.parse('2026-11-15T11:00:00Z')), 'el domingo es urgencia');
es(K.urgente(cfg, Date.parse('2026-11-14T11:00:00Z')), 'el sábado es urgencia');
es(K.urgente(cfg, Date.parse('2026-12-08T11:00:00Z')), 'un festivo entre semana es urgencia');
es(!K.urgente(cfg, Date.parse('2026-07-14T07:30:00Z')), 'en verano Madrid va dos horas por delante: 9:30 es normal');

// 2. el precio: los mismos números de la web, con el IVA del 10 % dentro
let p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], {});
es(p.total === 8700 && p.tipo === 10, 'fuga de una hora con juntas: 87,00 € al 10 %');
es(p.base === 7909 && p.iva === 791 && p.base + p.iva === p.total, 'base 79,09 € + IVA 7,91 € = total');
p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], { urg: true });
es(p.total === 11700, 'de urgencia: desplazamiento y mano de obra un 40 % más; el material, no (117,00 €)');
p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1.5 }], {});
es(p.total === 9750, 'el ejemplo de la web: fuga de 1 h 30 min, 97,50 €');
es(K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1.5 }], { urg: true }).total === 13650, 'y el mismo trabajo un domingo, 136,50 €');
es(K.horas(20) === 1 && K.horas(60) === 1 && K.horas(61) === 1.25 && K.horas(75) === 1.25 && K.horas(76) === 1.5, 'primera hora mínima y después cuartos de hora empezados');
es(K.precio(cfg, [{ k: 'mo', q: 0.25 }], {}).lineas[0].q === 1, 'la mano de obra nunca baja de una hora');
es(K.precio(cfg, [{ k: 'noexiste' }, { k: 'desp' }], {}).lineas.length === 1, 'una clave que no está en el catálogo se ignora');

// 3. el IVA: 10 % en vivienda, 21 % en local o si el material pasa del 40 %
p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], { local: true });
es(p.tipo === 21 && p.total === 9570 && p.motivo === 'local', 'en un local, el mismo trabajo sube un 10 %: 95,70 €');
p = K.precio(cfg, [{ k: 'cisterna' }, { k: 'mecanismo' }], {});
es(p.tipo === 10 && p.total === 9000, 'cisterna con mecanismo: el material es el 38,9 %, sigue al 10 % (90,00 €)');
p = K.precio(cfg, [{ k: 'grifo' }, { k: 'grifon' }], {});
es(p.tipo === 21 && p.motivo === 'material' && p.total === 9350, 'grifo con grifo nuevo: el material pasa del 40 %, IVA del 21 % (93,50 €)');
p = K.precio(cfg, [{ k: 'desp' }, { k: 'otro', t: 'Pieza', p: 20 }], {});
es(p.tipo === 10, 'justo el 40 % de material todavía es el 10 %');
p = K.precio(cfg, [{ k: 'desp' }, { k: 'otro', t: 'Pieza', p: 20.01 }], {});
es(p.tipo === 21, 'un céntimo por encima del 40 % ya es el 21 %');
p = K.precio(cfg, [{ k: 'termo80' }], {});
es(p.tipo === 21 && p.total === 39000 && p.base === 32231, 'termo nuevo instalado: 390,00 € con el 21 % dentro');
p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 2 }, { k: 'resistencia' }, { k: 'termostato' }], { urg: true });
es(p.lineas.reduce((s, l) => s + l.imp, 0) === p.total, 'el total es la suma de las líneas tal como se enseñan');

// 4. la web y la app dicen lo mismo
const html = fs.readFileSync(path.join(sitio, 'index.html'), 'utf8');
const AV = new Function('return ' + html.slice(html.indexOf('const AV=[') + 9, html.indexOf('];', html.indexOf('const AV=[')) + 1))();
for (const av of AV) for (const urg of [false, true]) {
  const k = r => urg && r.u ? 1.4 : 1, a = Math.round(av.rows.reduce((s, r) => s + r.a * k(r), 0) * 100), b = Math.round(av.rows.reduce((s, r) => s + r.b * k(r), 0) * 100);
  const r = K.rango(cfg, av.id, urg);
  es(r && r.a === a && (av.desde ? r.b === null : r.b === b), 'la web y el catálogo coinciden en «' + av.id + '»' + (urg ? ' de urgencia' : '') + ': web ' + a + '–' + b + ', catálogo ' + (r && r.a) + '–' + (r && r.b));
  if (r && r.b) es(K.precio(cfg, cfg.av[av.id].max, { urg }).tipo === 10, 'el máximo de «' + av.id + '» que enseña la web sigue al 10 %');
}

// 5. pedir: lo que hace falta para aceptar un aviso
empieza();
es(ap({ tipo: 'pedir', av: 'nada', cli: montse }, CLI).err === 'av', 'una avería que no existe no entra');
es(ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, nombre: 'M' } }, CLI).err === 'nombre', 'sin nombre no entra');
es(ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, tel: '12345' } }, CLI).err === 'tel', 'con un teléfono mal escrito no entra');
es(ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, dir: 'x' } }, CLI).err === 'dir', 'sin dirección no entra');
es(ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, cp: '28001' } }, CLI).err === 'zona', 'fuera de Barcelona se dice que no llegamos');
es(ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, cp: '' } }, CLI).err === 'cp', 'sin código postal se pide');
es(S.avisos.length === 0 && S.n === 0, 'un aviso rechazado no gasta número');
let r = ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, tel: '+34 600 00 01 43' }, nota: 'Sale agua.' }, CLI);
es(r.ok && r.id === 'R-0001' && A(r.id).e === 'nuevo' && A(r.id).urg && A(r.id).cli.dis === 'gra', 'el aviso entra como urgente, con su número y su barrio');
es(A('R-0001').cli.tel === '600000143' && K.telBonito('600000143') === '600 00 01 43', 'el teléfono se guarda limpio');
es(A('R-0001').msgs.some(m => m.k === 'recibido' && !m.env), 'queda escrito el mensaje de «aviso recibido»');

// 6. permisos y orden de los pasos
es(ap({ tipo: 'asignar', id: 'R-0001', tec: 'omar' }, T('omar')).err === 'permiso', 'un técnico no reparte');
es(ap({ tipo: 'asignar', id: 'R-0001', tec: 'omar' }, CLI).err === 'permiso', 'un cliente no reparte');
es(ap({ tipo: 'voy', id: 'R-0001' }, T('omar')).err === 'permiso', 'no se puede ir a un aviso que no es tuyo');
es(ap({ tipo: 'asignar', id: 'R-0001', tec: 'nadie' }, C).err === 'tec', 'no se asigna a quien no existe');
es(ap({ tipo: 'asignar', id: 'R-0001', tec: 'omar' }, C).ok && A('R-0001').e === 'asignado', 'la centralita asigna a Omar');
es(ap({ tipo: 'voy', id: 'R-0001' }, T('laia')).err === 'permiso', 'Laia no puede ir al aviso de Omar');
es(ap({ tipo: 'terminar', id: 'R-0001', modo: 'efectivo' }, T('omar')).err === 'estado', 'no se termina lo que no ha empezado');
r = ap({ tipo: 'voy', id: 'R-0001' }, T('omar'));
es(r.ok && A('R-0001').e === 'camino' && A('R-0001').eta - t === 35 * M, 'Voy: de camino, y a Gràcia se llega en 35 minutos');
es(K.mensaje(cfg, A('R-0001'), 'camino').includes(K.hora(A('R-0001').eta)) && K.mensaje(cfg, A('R-0001'), 'camino').includes('Omar'), 'el mensaje «va de camino» lleva el nombre y la hora');
r = ap({ tipo: 'pedir', av: 'atasco', cli: { nombre: 'Pau Roig', tel: '600000144', dir: 'C/ Balmes 100, 1.º', cp: '08008' } }, CLI);
ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C);
es(ap({ tipo: 'voy', id: r.id }, T('omar')).err === 'ocupado', 'un técnico no puede ir a dos sitios a la vez');

// 7. el precio se firma antes de empezar
es(ap({ tipo: 'empezar', id: 'R-0001' }, T('omar')).err === 'firma', 'en Pro no se empieza sin la firma del cliente');
es(ap({ tipo: 'empezar', id: 'R-0001', pres: { lineas: [], firma: F } }, T('omar')).err === 'lineas', 'ni con un presupuesto vacío');
r = ap({ tipo: 'empezar', id: 'R-0001', pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
es(r.ok && A('R-0001').e === 'curso' && A('R-0001').tot.total === 7500 && A('R-0001').pres.firma === F, 'firmado: empieza con 75,00 € cerrados');
es(ap({ tipo: 'asignar', id: 'R-0001', tec: 'laia' }, C).err === 'estado', 'un trabajo empezado ya no se reparte');

// 8. la ampliación: firma nueva y el IVA de todo el trabajo
es(ap({ tipo: 'ampliar', id: 'R-0001', lineas: [{ k: 'tubo' }] }, T('omar')).err === 'firma', 'ampliar pide otra firma');
r = ap({ tipo: 'ampliar', id: 'R-0001', lineas: [{ k: 'juntas' }], firma: F }, T('omar'));
es(r.ok && r.dif === 1200 && A('R-0001').tot.total === 8700 && A('R-0001').tot.tipo === 10, 'unas juntas más: 12,00 € y sigue al 10 %');
r = ap({ tipo: 'ampliar', id: 'R-0001', lineas: [{ k: 'tubo' }, { k: 'llave' }], firma: F }, T('omar'));
es(r.ok && A('R-0001').tot.tipo === 21 && A('R-0001').tot.total === 15400 && r.dif === 6700, 'con tubería y llave el material pasa del 40 %: todo al 21 %, 154,00 €');
es(A('R-0001').pres.total === 7500 && A('R-0001').amp.length === 2, 'el presupuesto firmado no se toca; las ampliaciones van aparte');

// 9. el tiempo, con pausa
const ini = A('R-0001').ini;
t = ini + 30 * M; ap({ tipo: 'pausa', id: 'R-0001' }, T('omar'));
t = ini + 50 * M; ap({ tipo: 'pausa', id: 'R-0001' }, T('omar'));
es(K.minutos(A('R-0001'), ini + 80 * M) === 60, 'de 80 minutos con 20 de pausa, cuentan 60');

// 10. terminar: cobro, garantía y mensajes
t = ini + 80 * M;
es(ap({ tipo: 'terminar', id: 'R-0001' }, T('omar')).err === 'modo', 'en Pro hay que decir cómo paga');
r = ap({ tipo: 'terminar', id: 'R-0001', modo: 'bizum', firma: F }, T('omar'));
const a1 = A('R-0001');
es(r.ok && a1.e === 'hecho' && a1.pago.cobrado && a1.pago.modo === 'bizum', 'terminado y cobrado por Bizum');
es(a1.gar.hasta === '2027-11-10', 'la garantía es de un año justo desde el día que se termina');
es(a1.msgs.some(m => m.k === 'hecho') && a1.msgs.some(m => m.k === 'resena' && m.t - a1.fin === 2 * H), 'queda el mensaje de terminado y la reseña a las dos horas');
es(!a1.msgs.some(m => m.k === 'cobro'), 'si ha pagado, no hay recordatorio de pago');
es(K.mensaje(cfg, a1, 'hecho').includes('154,00 €') && K.mensaje(cfg, a1, 'hecho').includes('10-11-2027'), 'el mensaje final lleva el total y la fecha de la garantía');
es(K.mensaje(cfg, a1, 'resena').includes(N.resenas), 'la reseña se pide a todos, con el enlace de Google');
es(ap({ tipo: 'cancelar', id: 'R-0001' }, C).err === 'estado', 'un trabajo hecho no se cancela');
const v = K.vistaCliente(S, cfg, 'R-0001');
es(v && v.total === 15400 && v.tec === 'Omar' && !('cli' in v) && !JSON.stringify(v).includes('600000143'), 'el cliente ve su aviso sin datos de nadie');
es(K.vistaCliente(S, cfg, 'R-9999') === null, 'un número que no existe no enseña nada');

// 11. pendiente de pago y caja del día
r = ap({ tipo: 'voy', id: 'R-0002' }, T('omar'));
ap({ tipo: 'empezar', id: 'R-0002', pres: { lineas: [{ k: 'desatasco' }], firma: F } }, T('omar'));
ap({ tipo: 'terminar', id: 'R-0002', modo: 'pendiente' }, T('omar'));
let res = K.resumen(S, cfg, t);
es(res.pend.n === 1 && res.pend.total === 6500 && res.caja.bizum === 15400 && res.caja.total === 15400 && res.hechos === 2, 'el resumen: un trabajo por cobrar (65,00 €) y 154,00 € en caja por Bizum');
es(A('R-0002').msgs.some(m => m.k === 'cobro' && m.t - A('R-0002').fin === 3 * D), 'el recordatorio de pago queda para dentro de tres días');
es(ap({ tipo: 'cobrar', id: 'R-0002', modo: 'pendiente' }, C).err === 'modo', 'cobrar pide un modo de pago de verdad');
es(ap({ tipo: 'cobrar', id: 'R-0002', modo: 'transferencia' }, C).ok && K.resumen(S, cfg, t).pend.n === 0 && !A('R-0002').msgs.some(m => m.k === 'cobro'), 'al cobrarlo sale de pendientes y se quita el recordatorio');

// 12. no acepta el precio: solo el desplazamiento, sin garantía
r = ap({ tipo: 'pedir', av: 'termo', cli: { nombre: 'Rosa Gil', tel: '600000145', dir: 'C/ Marina 80, 2.º', cp: '08005' } }, CLI);
ap({ tipo: 'asignar', id: r.id, tec: 'laia' }, C); ap({ tipo: 'voy', id: r.id }, T('laia'));
es(ap({ tipo: 'noacepta', id: r.id, modo: 'efectivo' }, T('laia')).ok && A(r.id).tot.total === 3000 && A(r.id).sinTrabajo && !A(r.id).gar, 'si no acepta, se cobran 30,00 € de desplazamiento y no hay garantía');

// 13. no había nadie: vuelve a la bandeja
r = ap({ tipo: 'pedir', av: 'grifo', cli: { nombre: 'Joan Mas', tel: '600000146', dir: 'C/ Marina 82, 1.º', cp: '08005' } }, CLI);
const j = r.id;
ap({ tipo: 'asignar', id: j, tec: 'laia' }, C); ap({ tipo: 'voy', id: j }, T('laia'));
es(ap({ tipo: 'ausente', id: j }, T('laia')).ok && A(j).e === 'ausente' && A(j).msgs.some(m => m.k === 'ausente') && !A(j).msgs.some(m => m.k === 'camino' && !m.env), 'no había nadie: vuelve a la bandeja con su mensaje');
es(K.resumen(S, cfg, t).nuevos === 1, 'y cuenta como aviso por atender');

// 14. citas: cupo, días laborables y dos horas de margen
const dias = K.diasDe(S, cfg, t, 6);
es(dias.length === 6 && dias.every(d => K.laborable(cfg, d.dia)), 'se ofrecen seis días, todos laborables');
es(!dias.some(d => d.dia === '2026-11-14' || d.dia === '2026-11-15'), 'ni sábado ni domingo');
es(dias[0].hoy && dias[0].franjas.find(f => f.id === 'f1').ok === false && dias[0].franjas.find(f => f.id === 'f3').ok, 'hoy solo quedan las franjas que empiezan dentro de más de dos horas');
es(!K.franjasDe(S, cfg, '2026-12-08', t).some(f => f.ok), 'un festivo no tiene citas');
const dia = dias[2].dia;                               // pasado mañana: así cabe el recordatorio de la víspera
es(ap({ tipo: 'mover', id: j, cita: { dia, fr: 'f2' } }, C).ok && A(j).e === 'asignado' && !A(j).urg && A(j).msgs.some(m => m.k === 'cita'), 'la centralita le da cita y vuelve a estar asignado');
r = ap({ tipo: 'pedir', av: 'cisterna', cli: { nombre: 'Ana Pons', tel: '600000147', dir: 'C/ Sardenya 300, 5.º', cp: '08025' }, cita: { dia, fr: 'f2' } }, CLI);
es(r.ok && !A(r.id).urg && K.franjasDe(S, cfg, dia, t).find(f => f.id === 'f2').libres === 0, 'la segunda cita llena la franja');
es(ap({ tipo: 'pedir', av: 'cisterna', cli: { nombre: 'Luis Vera', tel: '600000148', dir: 'C/ Sardenya 302, 1.º', cp: '08025' }, cita: { dia, fr: 'f2' } }, CLI).err === 'franja', 'la tercera ya no cabe');
es(ap({ tipo: 'cancelar', id: r.id, motivo: 'Lo ha arreglado un vecino' }, C).ok && K.franjasDe(S, cfg, dia, t).find(f => f.id === 'f2').libres === 1, 'cancelar una cita deja libre su hueco');
es(K.tarifaDe(cfg, A(j)) === false, 'con cita, la tarifa es siempre la normal');
es(ap({ tipo: 'asignar', id: j, tec: 'omar' }, C).ok && A(j).msgs.filter(m => m.k === 'cita').length === 1, 'al cambiar de técnico no se duplica el mensaje de la cita');
es(A(j).msgs.some(m => m.k === 'vispera'), 'y queda el recordatorio de la víspera');
ap({ tipo: 'mover', id: j, cita: { dia: dias[1].dia, fr: 'f3' } }, C);
es(!A(j).msgs.some(m => m.k === 'vispera') && A(j).msgs.filter(m => m.k === 'cita').length === 1, 'si la cita es mañana, basta con la confirmación de hoy');

// 15. la garantía se cruza por teléfono o por dirección
t = MAR + 90 * D;
r = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Montserrat V.', tel: '600 000 143', dir: 'Otra calle 1', cp: '08012' } }, CLI);
es(A(r.id).gar0 === 'R-0001', 'el mismo teléfono tres meses después: puede ser garantía');
r = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Un vecino', tel: '600000199', dir: 'Carrer de Verdi, 28 2-1', cp: '08012' } }, CLI);
es(A(r.id).gar0 === 'R-0001', 'la misma dirección escrita de otra forma: puede ser garantía');
r = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Otro vecino', tel: '600000198', dir: 'C/ Verdi 28, 3.º 1.ª', cp: '08012' } }, CLI);
es(!A(r.id).gar0, 'otro piso del mismo portal no es garantía');
t = MAR + 400 * D;
r = ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI);
es(!A(r.id).gar0, 'pasado el año, ya no es garantía');
es(K.masMeses('2027-01-31', 1) === '2027-02-28' && K.masMeses('2026-11-10', 12) === '2027-11-10', 'los meses se suman bien a fin de mes');

// 16. el aviso que deja la web al abrir WhatsApp: los datos llegan después
empieza();
r = ap({ tipo: 'pedir', av: 'fuga', origen: 'web', cli: { dis: 'gra' } }, CLI);
es(r.ok && !A(r.id).cli.tel && A(r.id).msgs.length === 0, 'entra sin teléfono y sin mensajes');
es(ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C).err === 'datos', 'no se puede repartir hasta tener el teléfono y la dirección');
es(ap({ tipo: 'completar', id: r.id, cli: { nombre: 'Montse Vila', tel: '600000143' } }, C).err === 'dir', 'completar pide lo que falta');
es(ap({ tipo: 'completar', id: r.id, cli: montse }, C).ok && ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C).ok, 'con los datos, ya se reparte');
es(K.resumen(S, cfg, t).marcha === 1, 'y cuenta como aviso en marcha');

// 17. el pack Básico: los tres toques, sin papeles
empieza('basico');
r = ap({ tipo: 'pedir', av: 'atasco', cli: montse }, CLI);
ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C);
es(ap({ tipo: 'voy', id: r.id }, T('omar')).ok && ap({ tipo: 'empezar', id: r.id }, T('omar')).ok && ap({ tipo: 'terminar', id: r.id }, T('omar')).ok, 'Voy, Empezar y Terminado, sin nada más');
es(A(r.id).e === 'hecho' && !A(r.id).tot && !A(r.id).pago && A(r.id).gar && !A(r.id).msgs.some(m => m.k === 'resena'), 'sin presupuesto, sin cobro y sin reseña automática');
es(ap({ tipo: 'noacepta', id: r.id, modo: 'efectivo' }, T('omar')).err === 'pack', 'lo de los papeles pide el pack Pro');
es(ap({ tipo: 'pack', pack: 'pro' }, T('omar')).err === 'permiso' && ap({ tipo: 'pack', pack: 'pro' }, C).ok && S.pack === 'pro', 'el pack lo cambia la centralita');
es(ap({ tipo: 'cosa-rara', id: r.id }, C).err === 'accion', 'una acción que no existe se rechaza');

// 18. la muestra de la demo sale bien a cualquier hora de cualquier día
let fallos = 0;
for (let i = 0; i < 7 * 48; i++) { try { const X = globalThis.OFICIO_MUESTRA(K, cfg, MAR + i * 30 * M); if (X.avisos.length !== 6 || !X.avisos.some(a => a.gar0)) fallos++ } catch (e) { fallos++; if (fallos === 1) console.log('   ', e.message) } }
es(fallos === 0, 'la muestra se genera en las 336 medias horas de una semana, con su aviso en garantía');

console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}.`);
process.exit(mal ? 1 : 0);
