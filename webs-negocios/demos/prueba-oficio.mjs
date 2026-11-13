// Comprueba las reglas de oficios (js/oficio-nucleo.js): el recorrido de un aviso y los casos raros.
// Uso: node prueba-oficio.mjs <carpeta del sitio>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const sitio = path.resolve(process.argv[2] || 'site');
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require(path.join(sitio, 'js/oficio-nucleo.js'));
require(path.join(sitio, 'js/oficio-datos.js'));
const K = globalThis.OficioNucleo, N = globalThis.OFICIO_NEGOCIO;
// Los ejemplos están escritos para el negocio de muestra SIN horarios: dos citas por franja, como estuvo hasta el 13-11-2026.
// Las secciones de horarios se los ponen ellas mismas. La demo tal como se publica, con sus turnos, se mira en la última sección.
const PUB = JSON.parse(JSON.stringify(N));
if (N.horario || N.tecnicos.some(x => x.horario)) { N.tecnicos.forEach(x => { delete x.horario; delete x.guardia }); delete N.horario; delete N.citas; N.cupo = 2 }
const cfg = K.cfgDe(N);
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

// 17. todos los negocios llevan papeles: desde el 13-11-2026 no hay modo «sin presupuesto»
empieza();
r = ap({ tipo: 'pedir', av: 'atasco', cli: montse }, CLI);
ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C); ap({ tipo: 'voy', id: r.id }, T('omar'));
es(ap({ tipo: 'empezar', id: r.id }, T('omar')).err === 'firma' && A(r.id).e === 'camino', 'no se empieza sin el precio firmado');
es(ap({ tipo: 'empezar', id: r.id, pres: { lineas: [{ k: 'desatasco' }], firma: F } }, T('omar')).ok && ap({ tipo: 'terminar', id: r.id }, T('omar')).err === 'modo', 'ni se termina sin decir cómo paga');
es(ap({ tipo: 'pack', id: r.id, pack: 'basico' }, C).err === 'accion' && S.pack === 'pro', 'el cambio de pack ya no existe');
{ const viejo = A(r.id); delete viejo.tot;           // un trabajo a medias guardado por una versión antigua, sin precio
  es(ap({ tipo: 'terminar', id: r.id, modo: 'efectivo' }, T('omar')).err === 'estado' && ap({ tipo: 'ampliar', id: r.id, lineas: [{ k: 'sifon' }], firma: F }, T('omar')).err === 'estado', 'un trabajo antiguo sin precio se rechaza sin romper nada') }
es(ap({ tipo: 'cosa-rara', id: r.id }, C).err === 'accion', 'una acción que no existe se rechaza');

// 18. la muestra de la demo sale bien a cualquier hora de cualquier día
let fallos = 0;
for (let i = 0; i < 7 * 48; i++) { try { const X = globalThis.OFICIO_MUESTRA(K, cfg, MAR + i * 30 * M); if (X.avisos.length !== 6 || !X.avisos.some(a => a.gar0)) fallos++ } catch (e) { fallos++; if (fallos === 1) console.log('   ', e.message) } }
es(fallos === 0, 'la muestra se genera en las 336 medias horas de una semana, con su aviso en garantía');


// 19. festivos y cambio de hora (13-11-2026: se añadió el 6-12-2027, que faltaba)
es(K.urgente(cfg, Date.parse('2027-12-06T10:00:00Z')), 'el 6 de diciembre de 2027 (lunes, Constitución) es urgencia');
es(!K.franjasDe(S, cfg, '2027-12-06', Date.parse('2027-12-01T10:00:00Z')).some(f => f.ok), 'y ese día no hay citas');
es(cfg.festivos.filter(d => new Date(d + 'T12:00:00Z').getUTCDay() % 6).every(d => K.urgente(cfg, Date.parse(d + 'T10:00:00Z'))), 'todos los festivos entre semana son urgencia a media mañana');
es(['2026-05-25', '2026-09-24', '2027-05-17', '2027-09-24'].every(d => cfg.festivos.includes(d)), 'las dos fiestas de Barcelona de 2026 y 2027 están (Segona Pasqua y la Mercè)');
es(!K.urgente(cfg, Date.parse('2026-03-30T06:30:00Z')) && K.urgente(cfg, Date.parse('2026-03-30T05:59:00Z')), 'el lunes después del cambio de hora: 8:30 es normal y 7:59 es urgencia');
es(!K.urgente(cfg, Date.parse('2026-10-26T07:30:00Z')) && K.urgente(cfg, Date.parse('2026-10-26T06:59:00Z')), 'y tras volver al horario de invierno: 8:30 normal, 7:59 urgencia');

// 20. el precio con mil combinaciones al azar: siempre cuadra
{ let malos = 0, ej = ''; let semilla = 7; const azar = n => { semilla = (semilla * 16807) % 2147483647; return semilla % n };
  const claves = Object.keys(cfg.cat);
  for (let i = 0; i < 1000; i++) {
    const lin = []; const n = 1 + azar(5);
    for (let j = 0; j < n; j++) { const k = claves[azar(claves.length)]; lin.push(k === 'mo' ? { k, q: [0.25, 1, 1.5, 2, 3.75][azar(5)] } : { k, q: 1 + azar(3) }) }
    if (azar(4) === 0) lin.push({ k: 'otro', t: 'Pieza rara', p: (1 + azar(9000)) / 100 });
    const o = { urg: !!azar(2), local: azar(5) === 0 }, x = K.precio(cfg, lin, o);
    const ok1 = x.lineas.reduce((s, l) => s + l.imp, 0) === x.total && x.base + x.iva === x.total && [10, 21].includes(x.tipo) && Number.isInteger(x.total) && x.total >= 0;
    const ok2 = !o.local || x.tipo === 21;
    const ok3 = K.precio(cfg, lin, { ...o, urg: false }).total <= K.precio(cfg, lin, { ...o, urg: true }).total;
    if (!(ok1 && ok2 && ok3)) { malos++; if (!ej) ej = JSON.stringify({ lin, o, x: { t: x.total, b: x.base, i: x.iva, tipo: x.tipo } }) } }
  es(malos === 0, 'mil presupuestos al azar: suma de líneas = total, base + IVA = total, céntimos enteros, local al 21 %, la urgencia nunca abarata' + (ej ? ' · ' + ej : '')) }
p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], { urg: true, local: true });
es(p.tipo === 21 && p.total > 11700, 'urgencia en un local: recargo y además IVA del 21 %');

// 21. ningún mensaje sale con huecos («undefined», «NaN», «null»)
empieza();
{ const rr = []; rr.push(ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI));
  rr.push(ap({ tipo: 'pedir', av: 'cisterna', cli: { nombre: 'Ana Pons', tel: '600000147', dir: 'C/ Sardenya 300, 5.º', cp: '08025' }, cita: { dia: K.diasDe(S, cfg, t, 6)[2].dia, fr: 'f3' } }, CLI));
  ap({ tipo: 'asignar', id: rr[0].id, tec: 'omar' }, C); ap({ tipo: 'asignar', id: rr[1].id, tec: 'laia' }, C);
  ap({ tipo: 'voy', id: rr[0].id }, T('omar')); ap({ tipo: 'empezar', id: rr[0].id, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
  ap({ tipo: 'terminar', id: rr[0].id, modo: 'pendiente', firma: F }, T('omar'));
  let huecos = []; for (const X of S.avisos) for (const k of K.MSG ? Object.keys(K.MSG) : []) { let m = ''; try { m = K.mensaje(cfg, X, k) } catch (e) { m = 'ERROR ' + e.message } if (/undefined|NaN|null|\[object|ERROR/.test(m)) huecos.push(X.id + ' ' + k + ': ' + m.slice(0, 80)) }
  es(huecos.length === 0, 'ningún mensaje sale con huecos ni falla, aunque el aviso no tenga cita, hora de llegada o total' + (huecos.length ? ' · ' + huecos[0] : ''));
  es(S.avisos.every(X => X.msgs.every(m => Object.keys(K.MSG).includes(m.k) && K.mensaje(cfg, X, m.k).length > 20)), 'solo se programan mensajes que existen, y todos con texto')
  ap({ tipo: 'asignar', id: rr[1].id, tec: 'laia' }, C); const conCita = A(rr[1].id); ap({ tipo: 'enviado', id: conCita.id, k: 'cita' }, C); ap({ tipo: 'mover', id: conCita.id }, C);
  es(K.mensaje(cfg, A(conCita.id), 'cita') === '' && A(conCita.id).msgs.some(m => m.k === 'cita' && m.env), 'una cita ya avisada que pasa a urgente: el mensaje enviado queda en la lista y no rompe nada') }

// 22. cancelar, mensajes enviados y quién puede qué
empieza();
r = ap({ tipo: 'pedir', av: 'grifo', cli: montse }, CLI); const c1 = r.id;
es(ap({ tipo: 'cancelar', id: c1 }, T('omar')).err === 'permiso' && ap({ tipo: 'cancelar', id: c1 }, CLI).err === 'permiso', 'solo la centralita cancela');
es(ap({ tipo: 'enviado', id: c1, k: 'recibido' }, CLI).err === 'permiso', 'el cliente no marca mensajes');
es(ap({ tipo: 'enviado', id: c1, k: 'recibido' }, C).ok && A(c1).msgs.find(m => m.k === 'recibido').env === t, 'la centralita marca «aviso recibido» como enviado');
es(ap({ tipo: 'enviado', id: c1, k: 'recibido' }, C).err === 'mensaje', 'y no se puede marcar dos veces');
es(ap({ tipo: 'cancelar', id: c1, motivo: 'Ya no hace falta' }, C).ok && A(c1).e === 'cancelado' && A(c1).msgs.every(m => m.env), 'cancelado: se quitan los mensajes que no habían salido');
es(ap({ tipo: 'asignar', id: c1, tec: 'omar' }, C).err === 'estado' && ap({ tipo: 'anotar', id: c1, obs: 'x' }, C).err === 'estado', 'un aviso cancelado ya no se reparte ni se anota');
es(K.vistaCliente(S, cfg, c1).e === 'cancelado', 'el cliente ve que está cancelado');
r = ap({ tipo: 'pedir', av: 'grifo', cli: montse }, CLI);
es(r.id === 'R-0002', 'los números siguen en orden aunque se cancele un aviso');

// 23. pausas, notas, fotos y el técnico ocupado
const c2 = r.id; ap({ tipo: 'asignar', id: c2, tec: 'omar' }, C);
es(ap({ tipo: 'pausa', id: c2 }, T('omar')).err === 'estado', 'no se pausa lo que no ha empezado');
ap({ tipo: 'voy', id: c2 }, T('omar'));
r = ap({ tipo: 'pedir', av: 'atasco', cli: { nombre: 'Pau Roig', tel: '600000144', dir: 'C/ Balmes 100, 1.º', cp: '08008' } }, CLI); const c3 = r.id;
ap({ tipo: 'asignar', id: c3, tec: 'omar' }, C);
es(ap({ tipo: 'empezar', id: c3, pres: { lineas: [{ k: 'desatasco' }], firma: F } }, T('omar')).err === 'ocupado', 'con un aviso de camino no se empieza otro');
ap({ tipo: 'empezar', id: c2, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'grifon' }], firma: F } }, T('omar'));
const i2 = A(c2).ini; t = i2 + 10 * M; ap({ tipo: 'pausa', id: c2 }, T('omar'));
es(K.enPausa(A(c2)), 'en pausa');
es(ap({ tipo: 'anotar', id: c2, obs: '  Falta la llave de paso del baño.  ' }, T('laia')).err === 'permiso', 'Laia no anota en el aviso de Omar');
es(ap({ tipo: 'anotar', id: c2, obs: 'x'.repeat(900) }, T('omar')).ok && A(c2).obs.length === 400, 'la nota se corta a 400 letras');
for (let i = 0; i < 4; i++) ap({ tipo: 'anotar', id: c2, foto: 'data:image/jpeg;base64,AAAA' + i }, T('omar'));
es(A(c2).fotos.length === 4 && ap({ tipo: 'anotar', id: c2, foto: 'data:image/jpeg;base64,BBBB' }, T('omar')).err === 'fotos', 'cuatro fotos como mucho');
es(ap({ tipo: 'anotar', id: c2, foto: 'x'.repeat(150000) }, T('omar')).err === 'foto' && A(c2).fotos.length === 4, 'una foto demasiado grande se rechaza y lo dice');
{ const antes = JSON.stringify(A(c2)); es(ap({ tipo: 'anotar', id: c2, obs: 'Otra nota', foto: 'f5' }, T('omar')).err === 'fotos' && JSON.stringify(A(c2)) === antes, 'con cuatro fotos, una quinta se rechaza sin cambiar la nota (antes la cambiaba)');
  es(ap({ tipo: 'anotar', id: c2 }, T('omar')).err === 'vacio' && ap({ tipo: 'anotar', id: c2, obs: { a: 1 } }, T('omar')).err === 'obs', 'anotar nada, o algo que no es texto, se rechaza') }
t = i2 + 40 * M; r = ap({ tipo: 'terminar', id: c2, modo: 'tarjeta' }, T('omar'));
const trab = Math.round((A(c2).pausas[0][0] - i2) / M);
es(r.ok && !K.enPausa(A(c2)) && A(c2).min === trab && trab < 15, 'terminar en pausa cierra la pausa: solo cuentan los ' + trab + ' minutos de antes de parar');
es(A(c2).tot.tipo === 10, 'desplazamiento, una hora y un grifo nuevo: el material es el 31,8 %, sigue al 10 %');
es(ap({ tipo: 'voy', id: c3 }, T('omar')).ok, 'ya libre, Omar puede ir al siguiente');
es(ap({ tipo: 'cobrar', id: c2, modo: 'efectivo' }, C).err === 'estado', 'lo cobrado no se cobra otra vez');

// 24. reasignar, pasar a urgente y lo que ve el cliente en cada paso
empieza();
r = ap({ tipo: 'pedir', av: 'cisterna', cli: montse, cita: { dia: K.diasDe(S, cfg, t, 6)[3].dia, fr: 'f2' } }, CLI); const c4 = r.id;
ap({ tipo: 'asignar', id: c4, tec: 'omar' }, C);
es(ap({ tipo: 'asignar', id: c4, tec: 'laia' }, C).ok && A(c4).tec === 'laia', 'antes de salir se puede cambiar de técnico');
es(ap({ tipo: 'mover', id: c4 }, C).ok && A(c4).urg && !A(c4).cita && !A(c4).msgs.some(m => (m.k === 'cita' || m.k === 'vispera') && !m.env), 'pasarlo a urgente quita la cita y sus mensajes');
const vistas = [];
vistas.push(K.vistaCliente(S, cfg, c4));
ap({ tipo: 'voy', id: c4 }, T('laia')); vistas.push(K.vistaCliente(S, cfg, c4));
es(ap({ tipo: 'asignar', id: c4, tec: 'omar' }, C).err === 'estado', 'de camino ya no se cambia de técnico');
ap({ tipo: 'empezar', id: c4, pres: { lineas: [{ k: 'cisterna' }], firma: F } }, T('laia')); vistas.push(K.vistaCliente(S, cfg, c4));
ap({ tipo: 'terminar', id: c4, modo: 'efectivo' }, T('laia')); vistas.push(K.vistaCliente(S, cfg, c4));
es(vistas.map(v => v.e).join(',') === 'asignado,camino,curso,hecho', 'el cliente ve los cuatro pasos');
es(vistas.every(v => v.tec === 'Laia' && !/600000143|Verdi|Montse|Ferrer/.test(JSON.stringify(v))), 'y en ninguno ve teléfono, dirección, nombre ni apellido de nadie');
es(vistas[1].eta > t - 60 * M && vistas[2].eta === 0, 'la hora de llegada solo mientras va de camino');

// 25. citas: viernes por la tarde y víspera de festivo
const VIE = Date.parse('2026-11-13T16:30:00Z');          // viernes 13-11-2026, 17:30 en Madrid
const dv = K.diasDe(S, cfg, VIE, 3);
es(!dv.some(d => d.dia === '2026-11-13'), 'un viernes a las 17:30 ya no se ofrece hoy (no queda ninguna franja)');
es(dv[0].dia === '2026-11-16' && dv[0].franjas.every(f => f.ok), 'el primer día que se ofrece es el lunes, con las cuatro franjas');
const dd = K.diasDe(S, cfg, Date.parse('2026-12-07T10:00:00Z'), 3).map(d => d.dia);
es(!dd.includes('2026-12-08') && dd.includes('2026-12-09'), 'el día de la Inmaculada se salta');

// 26. claves que no existen (casos que sacaron los recorridos al azar el 13-11-2026)
empieza();
r = ap({ tipo: 'pedir', av: 'grifo', cli: montse }, CLI);
for (const raro of ['toString', '__proto__', 'constructor', 'valueOf']) {
  es(ap({ tipo: 'asignar', id: r.id, tec: raro }, C).err === 'tec', 'asignar a «' + raro + '» se rechaza (antes salía «Asignado a undefined»)');
  es(ap({ tipo: 'pedir', av: raro, cli: montse }, CLI).err === 'av', 'una avería llamada «' + raro + '» se rechaza');
  es(K.precio(cfg, [{ k: raro }], {}).total === 0 && K.rango(cfg, raro, false) === null, 'un concepto llamado «' + raro + '» no tiene precio');
  es(Number.isInteger(K.etaMin(cfg, raro)) && K.etaMin(cfg, raro) > 0, 'una zona llamada «' + raro + '» da un tiempo de llegada normal');
  es(['cp', 'zona'].includes(ap({ tipo: 'pedir', av: 'grifo', cli: Object.assign({}, montse, { cp: 'xx', dis: raro }) }, CLI).err), 'y no vale como zona del cliente');
}
ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C); ap({ tipo: 'voy', id: r.id }, T('omar'));
es(ap({ tipo: 'empezar', id: r.id, pres: { lineas: 'valueOf', firma: F } }, T('omar')).err === 'lineas' && ap({ tipo: 'empezar', id: r.id, pres: 'hola' }, T('omar')).err === 'firma', 'un presupuesto que no es una lista se rechaza sin romper nada');
ap({ tipo: 'empezar', id: r.id, pres: { lineas: [{ k: 'grifo' }], firma: F } }, T('omar'));
es(ap({ tipo: 'ampliar', id: r.id, lineas: [{ k: 'latig' }, { k: 'constructor' }, null, 7, { k: 'llave', q: -3 }], firma: F }, T('omar')).ok && A(r.id).lin.map(l => l.k).join() === 'grifo,latig' && A(r.id).lin.every(l => Number.isFinite(l.q)), 'en una ampliación, las líneas imposibles se ignoran y las buenas entran');
es(ap(null, null).err === 'aviso' && ap(7, 'hola').err === 'aviso' && ap({ tipo: 'pedir', av: 'grifo', cli: 'hola' }, CLI).err === 'nombre', 'una acción vacía o sin sentido se rechaza');

// 27. franjas que no empiezan en punto
es(K.franjaTxt({ de: 510, a: 660 }) === 'de 8:30 a 11' && K.franjaTxt({ de: 480, a: 660 }) === 'de 8 a 11' && K.franjaTxt({ de: 930, a: 1085 }) === 'de 15:30 a 18:05', 'una franja a y media se lee «de 8:30 a 11» (antes, «de 8.5 a 11»)');

// 28. por dónde entra cada aviso queda apuntado
empieza();
const porCanal = o => A(ap({ tipo: 'pedir', av: 'grifo', cli: montse, origen: o }, C).id).origen;
es(porCanal('whatsapp') === 'whatsapp' && porCanal('llamada') === 'llamada' && porCanal('persona') === 'persona' && porCanal(undefined) === 'cita', 'WhatsApp, llamada, en persona y web quedan apuntados');
es(porCanal('paloma mensajera') === 'otro' && porCanal({ a: 1 }) === 'otro', 'un canal desconocido se apunta como «otro»');
ap({ tipo: 'cancelar', id: S.avisos[0].id }, C);
{ const c = K.resumen(S, cfg, t).canal; es(c.whatsapp === 0 && c.llamada === 1 && c.persona === 1 && c.cita === 1 && c.otro === 2 && c.web === 0, 'las cifras del mes dicen cuántos entraron por cada canal, sin contar los cancelados') }

// 29. horarios: el cliente solo ve huecos reales y la oficina solo asigna a quien puede (13-11-2026)
{ const NH = JSON.parse(JSON.stringify(N)); delete NH.cupo; NH.citas = { porFranja: 1, reserva: 1 };
  const LV = tr => ({ 1: tr, 2: tr, 3: tr, 4: tr, 5: tr });
  NH.tecnicos[0].horario = LV([[480, 840], [900, 1200]]);                      // Omar: de lunes a viernes, mañana y tarde
  NH.tecnicos[1].horario = { 1: [[480, 840]], 2: [[480, 840]], 3: [[480, 840]], 4: [[480, 840]] };   // Laia: de lunes a jueves, solo mañanas
  NH.tecnicos[2].horario = LV([[480, 1200]]); NH.tecnicos[2].guardia = 1;      // Jordi: jornada entera y guardias
  const ch = K.cfgDe(NH); let SH = K.nuevo(), th = Date.parse('2026-11-10T09:00:00Z');   // martes 10-11-2026, 10:00
  const h = (a, q) => K.aplicar(SH, ch, a, q, th += M), AH = id => SH.avisos.find(a => a.id === id);
  const LUN = '2026-11-16', VIE = '2026-11-20', MAR2 = '2026-11-17', MIE = '2026-11-18';
  const libres = (dia, fr) => K.franjasDe(SH, ch, dia, th).find(f => f.id === fr).libres;
  es(libres(LUN, 'f1') === 2 && libres(LUN, 'f3') === 1 && libres(VIE, 'f1') === 1 && libres(VIE, 'f4') === 1, 'los huecos salen de los horarios: 3 técnicos menos 1 de reserva por la mañana, 2 menos 1 por la tarde y el viernes');
  const pide = (dia, fr, mas) => h(Object.assign({ tipo: 'pedir', av: 'grifo', cli: montse, cita: { dia, fr } }, mas), CLI);
  const v1 = pide(VIE, 'f1').id;
  es(v1 && pide(VIE, 'f1').err === 'franja', 'el viernes a primera hora cabe una cita; la segunda ya no');
  es(h({ tipo: 'asignar', id: v1, tec: 'laia' }, C).err === 'horario' && AH(v1).e === 'nuevo', 'no se puede asignar a Laia: los viernes no trabaja');
  es(h({ tipo: 'asignar', id: v1, tec: 'omar' }, C).ok, 'a Omar sí');
  const l1 = pide(LUN, 'f1').id, l2 = pide(LUN, 'f1', { alt: [{ dia: MAR2, fr: 'f2' }, { dia: 'ayer', fr: 'f1' }, { dia: LUN, fr: 'f1' }] }).id;
  es(h({ tipo: 'asignar', id: l1, tec: 'omar' }, C).ok && h({ tipo: 'asignar', id: l2, tec: 'omar' }, C).err === 'lleno', 'un técnico no lleva dos citas en la misma franja');
  es(h({ tipo: 'asignar', id: l2, tec: 'laia' }, C).ok, 'la segunda va a Laia, que esa mañana trabaja');
  es(AH(l2).vale.length === 2 && AH(l2).cita.ok === true, 'el cliente dio otra franja que también le va bien; las que no existen se descartan');
  // Omar se pone enfermo el lunes
  es(h({ tipo: 'ausencia', tec: 'omar', de: LUN, a: LUN }, T('jordi')).err === 'permiso' && h({ tipo: 'ausencia', tec: 'omar', de: LUN, a: '2026-11-15' }, C).err === 'fechas' && h({ tipo: 'ausencia', tec: 'nadie', de: LUN, a: LUN }, C).err === 'tec', 'una ausencia la apunta la oficina, con fechas con sentido y para alguien del equipo');
  let r9 = h({ tipo: 'ausencia', tec: 'omar', de: LUN, a: LUN, motivo: 'Baja' }, C);
  es(r9.ok && r9.sueltos.join() === l1 && AH(l1).e === 'nuevo' && AH(l1).tec === '' && AH(l1).reasignar === true && AH(v1).tec === 'omar', 'al apuntar la baja, su cita del lunes vuelve sola a «sin asignar»; la del viernes no se toca');
  es(K.sobran(SH, ch, th).length === 0 && K.resumen(SH, ch, th).reasignar === 1, 'las dos del lunes siguen cabiendo con Laia y con Jordi, que es a quien se guarda para urgencias: no sobra ninguna y queda una por reasignar');
  const rj = h({ tipo: 'ausencia', tec: 'jordi', de: LUN, a: LUN, motivo: 'Curso' }, C);
  es(rj.ok && JSON.stringify(K.sobran(SH, ch, th)) === JSON.stringify([{ dia: LUN, fr: 'f1', sobran: 1 }]) && K.resumen(SH, ch, th).sobran.length === 1, 'si además falta Jordi ya no hay técnicos para las dos: la app avisa de que el lunes a primera hora sobra una cita');
  es(h({ tipo: 'quitarAusencia', aus: rj.id }, C).ok && K.sobran(SH, ch, th).length === 0, 'y deja de avisar cuando Jordi vuelve');
  es(h({ tipo: 'asignar', id: l1, tec: 'omar' }, C).err === 'ausente_tec' && libres(LUN, 'f1') === 0, 'ese día no se le puede asignar nada, y el cliente ya no ve hueco');
  es(h({ tipo: 'mover', id: l2, cita: { dia: MAR2, fr: 'f2' } }, C).ok && AH(l2).cita.ok === true && AH(l2).tec === 'laia' && K.sobran(SH, ch, th).length === 0, 'se pasa la de Laia a la otra franja que dio el cliente: sigue siendo buena para él y ya no sobra ninguna');
  es(h({ tipo: 'mover', id: l2, cita: { dia: MIE, fr: 'f3' } }, C).ok && AH(l2).cita.ok === false && AH(l2).tec === '' && AH(l2).e === 'nuevo', 'pasarla a una tarde que el cliente no dio la deja pendiente de confirmar, y sin Laia, que por las tardes no trabaja');
  es(h({ tipo: 'mover', id: l2, cita: { dia: MIE, fr: 'f3' }, confirmado: true }, C).ok && AH(l2).cita.ok === true, 'si la oficina lo ha hablado con el cliente, queda como buena');
  es(h({ tipo: 'quitarAusencia', aus: 'U9' }, C).err === 'ausencia' && h({ tipo: 'quitarAusencia', aus: r9.id }, C).ok && h({ tipo: 'asignar', id: l1, tec: 'omar' }, C).ok, 'quitada la baja, Omar vuelve a poder');
  // urgencias: en horario, cualquiera que trabaje; fuera de horario, quien hace guardias
  th = Date.parse('2026-11-15T10:00:00Z');                                       // domingo
  const u1 = h({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id;
  es(h({ tipo: 'asignar', id: u1, tec: 'omar' }, C).err === 'horario' && h({ tipo: 'asignar', id: u1, tec: 'jordi' }, C).ok, 'una urgencia en domingo va a quien hace guardias');
  th = Date.parse('2026-11-17T09:00:00Z');                                       // martes a las 10
  const u2 = h({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id;
  es(h({ tipo: 'asignar', id: u2, tec: 'laia' }, C).ok, 'una urgencia en horario va a cualquiera que esté trabajando');
  es(K.franjasDe(S = K.nuevo(), cfg, LUN, MAR).every(f => f.cap === N.cupo), 'un negocio sin horarios sigue con su número fijo por franja') }

// 29b. la oficina puede poner una cita donde el cliente no: en el hueco que se guarda para urgencias y con menos de dos
//      horas de margen. Lo que no puede es forzarla donde no trabaja nadie, donde ya no cabe o en una franja que acabó (13-11-2026)
{ const NH = JSON.parse(JSON.stringify(N)); delete NH.cupo; NH.citas = { porFranja: 1, reserva: 1 };
  const LV = tr => ({ 1: tr, 2: tr, 3: tr, 4: tr, 5: tr });
  NH.tecnicos[0].horario = LV([[480, 840], [900, 1200]]);                      // Omar: de lunes a viernes, mañana y tarde
  NH.tecnicos[1].horario = { 1: [[480, 840]], 2: [[480, 840]], 3: [[480, 840]], 4: [[480, 840]] };   // Laia: de lunes a jueves, solo mañanas
  NH.tecnicos[2].horario = LV([[480, 1200]]); NH.tecnicos[2].guardia = 1;      // Jordi: jornada entera y guardias
  const ch = K.cfgDe(NH); let SH = K.nuevo(), th = Date.parse('2026-11-10T09:00:00Z');   // martes 10-11-2026, 10:00
  const h = (a, q) => K.aplicar(SH, ch, a, q, th += M), AH = id => SH.avisos.find(a => a.id === id);
  const HOY = '2026-11-10', MIE = '2026-11-18', VIE = '2026-11-20', SAB = '2026-11-21', FEST = '2026-12-08';
  const fr = (dia, id) => K.franjasDe(SH, ch, dia, th).find(f => f.id === id);
  const pide = (dia, f, q, mas) => h(Object.assign({ tipo: 'pedir', av: 'grifo', cli: montse, cita: { dia, fr: f } }, mas), q);
  // el viernes a primera hora trabajan Omar y Jordi: caben dos citas y al cliente se le ofrece una
  es(fr(VIE, 'f1').tope === 2 && fr(VIE, 'f1').cap === 1 && fr(VIE, 'f1').ok && fr(VIE, 'f1').okOf && fr(VIE, 'f1').por === '', 'el viernes a primera hora caben dos citas y al cliente se le ofrece una: la otra se guarda para urgencias');
  const c1 = pide(VIE, 'f1', CLI).id;
  es(c1 && !fr(VIE, 'f1').ok && fr(VIE, 'f1').okOf && fr(VIE, 'f1').por === 'reserva' && fr(VIE, 'f1').libres === 0 && fr(VIE, 'f1').libresOf === 1 && pide(VIE, 'f1', CLI).err === 'franja' && pide(VIE, 'f1', {}).err === 'franja',
    'dada esa, el cliente ya no puede; a la oficina le queda el hueco de urgencias');
  const o1 = pide(VIE, 'f1', C, { origen: 'llamada' });
  es(o1.ok && AH(o1.id).cita.of === 'reserva' && AH(o1.id).cita.ok === true && /hueco que se guarda para urgencias/.test(AH(o1.id).h[0].txt) && AH(c1).cita.of === undefined && AH(c1).h[0].txt === 'Cita pedida',
    'la oficina sí la pone ahí, y queda escrito que usó el hueco de urgencias');
  es(pide(VIE, 'f1', C).err === 'franja' && !fr(VIE, 'f1').okOf && fr(VIE, 'f1').libresOf === 0, 'pero no puede forzar una tercera: a esa hora solo trabajan dos');
  es(Object.keys(K.vistaCliente(SH, ch, o1.id).cita).sort().join() === 'dia,fr,ok' && K.vistaCliente(SH, ch, o1.id).cita.fr === 'f1' && K.vistaCliente(SH, ch, 'X-9999') === null, 'el cliente ve de su cita el día y la franja, no la nota de la oficina');
  es(K.sobran(SH, ch, th).length === 0, 'usar el hueco de urgencias no hace saltar el aviso de que sobran citas');
  es(h({ tipo: 'asignar', id: c1, tec: 'omar' }, C).ok && h({ tipo: 'asignar', id: o1.id, tec: 'laia' }, C).err === 'horario' && h({ tipo: 'asignar', id: o1.id, tec: 'omar' }, C).err === 'lleno' && h({ tipo: 'asignar', id: o1.id, tec: 'jordi' }, C).ok,
    'y las dos se reparten entre los dos que trabajan: ni a quien no viene ni dos al mismo');
  // hoy, a una hora de la franja de 11 a 14
  es(!fr(HOY, 'f2').ok && fr(HOY, 'f2').okOf && fr(HOY, 'f2').por === 'margen' && pide(HOY, 'f2', CLI).err === 'franja', 'a una hora de que empiece la franja, el cliente ya no puede pedirla');
  const o2 = pide(HOY, 'f2', C, { origen: 'persona' });
  es(o2.ok && AH(o2.id).cita.of === 'margen' && /menos de dos horas/.test(AH(o2.id).h[0].txt), 'la oficina sí, y queda escrito que fue con menos de dos horas');
  es(fr(HOY, 'f1').okOf && pide(HOY, 'f1', C).ok, 'también en la franja que ya está en marcha, mientras no haya acabado');
  es(K.diasDe(SH, ch, th, 6)[0].dia === HOY && K.diasDe(SH, ch, th, 6)[0].franjas.find(f => f.id === 'f3').ok, 'a las diez, el cliente aún puede pedir la tarde de hoy');
  const c3 = pide(HOY, 'f3', CLI).id;      // por la tarde trabajan Omar y Jordi: con esta, el cliente ya no tiene hueco
  th = Date.parse('2026-11-10T10:30:00Z');                                       // las 11:30: la primera franja ya acabó
  es(!fr(HOY, 'f1').okOf && pide(HOY, 'f1', C).err === 'franja' && pide('2026-11-09', 'f3', C).err === 'franja', 'una franja que ya ha acabado, o un día que ya pasó, no los puede poner nadie');
  th = Date.parse('2026-11-10T12:40:00Z');                                       // las 13:40: la tarde empieza en menos de dos horas
  es(c3 && fr(HOY, 'f3').por === 'reserva+margen' && pide(HOY, 'f3', CLI).err === 'franja', 'la tarde de hoy, ya con una cita y a poco más de una hora: el cliente no puede por los dos motivos');
  const o3 = pide(HOY, 'f3', C);
  es(o3.ok && AH(o3.id).cita.of === 'reserva+margen' && /hoy mismo y en el hueco/.test(AH(o3.id).h[0].txt) && pide(HOY, 'f3', C).err === 'franja', 'la oficina pone una, y no más: por la tarde solo trabajan dos');
  th = Date.parse('2026-11-10T17:30:00Z');                                       // las 18:30: solo queda la franja de 18 a 20, ya en marcha
  es(K.diasDe(SH, ch, th, 6)[0].dia !== HOY && K.diasDe(SH, ch, th, 6, true)[0].dia === HOY && K.diasDe(SH, ch, th, 6, true)[0].franjas.filter(f => f.okOf).map(f => f.id).join() === 'f4',
    'a última hora el cliente ya no ve el día de hoy; la oficina sí, con la franja que queda');
  es(pide(SAB, 'f1', C).err === 'franja' && pide(FEST, 'f1', C).err === 'franja' && pide(VIE, 'f9', C).err === 'franja', 'ni en sábado ni en festivo ni en una franja que no existe: fuera de las citas, es una urgencia');
  // un día sin nadie
  ['omar', 'laia', 'jordi'].forEach(x => h({ tipo: 'ausencia', tec: x, de: MIE, a: MIE, motivo: 'Curso' }, C));
  es(fr(MIE, 'f1').tope === 0 && !fr(MIE, 'f1').okOf && pide(MIE, 'f1', C).err === 'franja' && K.diasDe(SH, ch, th, 9, true).find(d => d.dia === MIE).franjas.every(f => !f.okOf),
    'un día en que no viene nadie, la oficina tampoco puede poner cita');
  // mover: lo mismo que al crearla
  const c4 = pide(VIE, 'f3', CLI).id, c5 = pide('2026-11-19', 'f2', CLI).id;
  es(c4 && h({ tipo: 'mover', id: c5, cita: { dia: VIE, fr: 'f3' }, confirmado: true }, C).ok && AH(c5).cita.of === 'reserva' && /hueco que se guarda para urgencias/.test(AH(c5).h[AH(c5).h.length - 1].txt),
    'al cambiar una cita de hora, la oficina también puede usar el hueco de urgencias, y queda escrito');
  es(h({ tipo: 'mover', id: c1, cita: { dia: VIE, fr: 'f3' } }, C).err === 'franja' && AH(c1).cita.fr === 'f1', 'y tampoco puede forzarla donde ya no cabe: la cita se queda como estaba');
  es(h({ tipo: 'mover', id: c5, cita: { dia: '2026-11-19', fr: 'f2' }, confirmado: true }, C).ok && AH(c5).cita.of === undefined, 'si vuelve a una franja normal, deja de constar como hueco de urgencias');
  // un negocio sin horarios: la oficina se salta el margen, pero no el número fijo de citas por franja
  let S0 = K.nuevo(), t0 = Date.parse('2026-11-10T09:00:00Z'); const h0 = (a, q) => K.aplicar(S0, cfg, a, q, t0 += M);
  const f0 = () => K.franjasDe(S0, cfg, HOY, t0).find(f => f.id === 'f2');
  es(f0().tope === N.cupo && !f0().ok && f0().okOf && f0().por === 'margen' && h0({ tipo: 'pedir', av: 'grifo', cli: montse, cita: { dia: HOY, fr: 'f2' } }, CLI).err === 'franja', 'sin horarios, el tope es el número fijo de citas; a una hora, el cliente no puede');
  let n0 = 0; while (h0({ tipo: 'pedir', av: 'grifo', cli: montse, cita: { dia: HOY, fr: 'f2' } }, C).ok && n0 < 9) n0++;
  es(n0 === N.cupo && !f0().okOf, 'la oficina pone las que caben y ni una más');
  // y las ausencias valen también sin horarios: a quien falta no se le puede asignar, y lo suyo vuelve a la bandeja
  const MIE2 = '2026-11-18', a1 = h0({ tipo: 'pedir', av: 'grifo', cli: montse, cita: { dia: MIE2, fr: 'f1' } }, CLI).id, u0 = h0({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id;
  es(h0({ tipo: 'asignar', id: a1, tec: 'omar' }, C).ok && h0({ tipo: 'ausencia', tec: 'omar', de: HOY, a: MIE2, motivo: 'Baja' }, C).sueltos.join() === a1 && S0.avisos.find(x => x.id === a1).reasignar === true, 'sin horarios: al apuntar una baja, la cita de ese técnico vuelve a «sin asignar»');
  es(h0({ tipo: 'asignar', id: a1, tec: 'omar' }, C).err === 'ausente_tec' && h0({ tipo: 'asignar', id: u0, tec: 'omar' }, C).err === 'ausente_tec' && h0({ tipo: 'asignar', id: a1, tec: 'laia' }, C).ok && h0({ tipo: 'asignar', id: u0, tec: 'jordi' }, C).ok,
    'sin horarios: a quien está de baja no se le asigna ni una cita ni una urgencia; a los demás sí') }

// 30. lo que faltaba por probar, según la prueba de «reglas estropeadas adrede» (13-11-2026)
p = K.precio(cfg, [{ k: 'mo', q: 99 }, { k: 'juntas', q: 99 }], {});
es(p.lineas[0].q === 12 && p.lineas[1].q === 20, 'hay tope: 12 horas de mano de obra y 20 unidades de un material');
es(K.tel9('123456789') === '' && K.tel9('512345678') === '' && K.tel9('612345678') === '612345678' && K.tel9('930000000') === '930000000', 'un teléfono tiene que empezar por 6, 7, 8 o 9');
empieza();
r = ap({ tipo: 'pedir', av: 'grifo', cli: montse }, CLI);
ap({ tipo: 'asignar', id: r.id, tec: 'omar' }, C); ap({ tipo: 'voy', id: r.id }, T('omar'));
es(ap({ tipo: 'cancelar', id: r.id }, C).err === 'estado', 'con el técnico de camino ya no se cancela');
ap({ tipo: 'empezar', id: r.id, pres: { lineas: [{ k: 'mo', q: 12 }, { k: 'juntas', q: 20 }], firma: F } }, T('omar'));
es(ap({ tipo: 'cancelar', id: r.id }, C).err === 'estado', 'ni con el trabajo empezado');
{ const antes = A(r.id).tot.total;
  es(ap({ tipo: 'ampliar', id: r.id, lineas: [{ k: 'mo', q: 1 }, { k: 'juntas', q: 5 }], firma: F }, T('omar')).err === 'lineas' && A(r.id).tot.total === antes && !A(r.id).amp, 'una ampliación que no sube el total (ya estaba en el tope) se rechaza') }
ap({ tipo: 'terminar', id: r.id, modo: 'efectivo' }, T('omar'));
es(ap({ tipo: 'cancelar', id: r.id }, C).err === 'estado', 'ni una vez terminado');
{ const hasta = A(r.id).gar.hasta, ultimo = Date.parse(hasta + 'T10:00:00Z'), despues = Date.parse(K.masDias(hasta, 1) + 'T10:00:00Z');
  es(K.garantiaDe(S, cfg, montse, ultimo).length === 1 && K.garantiaDe(S, cfg, montse, despues).length === 0, 'la garantía vale hasta su último día, incluido; al día siguiente, ya no') }
{ const NP = JSON.parse(JSON.stringify(N)); delete NP.cupo; NP.tecnicos = NP.tecnicos.slice(0, 2);
  NP.tecnicos[0].horario = { 1: [[480, 1200]] }; NP.tecnicos[1].horario = { 1: [[480, 600]] };      // la segunda se va a las 10: no cubre la franja de 8 a 11
  const cp2 = K.cfgDe(NP), S2 = K.nuevo();
  es(K.trabaja(cp2, NP.tecnicos[0].id, '2026-11-16', 480, 660) && !K.trabaja(cp2, NP.tecnicos[1].id, '2026-11-16', 480, 660) && K.capacidad(S2, cp2, '2026-11-16', { de: 480, a: 660 }) === 1, 'quien solo trabaja un trozo de la franja no cuenta para esa franja') }

// 35. la demo tal como se publica, con sus horarios de prueba (13-11-2026)
{ const cp = K.cfgDe(PUB), SP = K.nuevo(), LUN = '2026-11-16', fr = K.franjasDe(SP, cp, LUN, MAR);
  es(cp.conHorario && PUB.cupo === undefined && fr.map(f => f.tope).join() === '3,3,3,2' && fr.map(f => f.cap).join() === '2,2,2,1',
    'la demo publicada: caben tres citas por franja y dos en la última; al cliente se le ofrece una menos, que se guarda para urgencias');
  const X = { id: 'x', cita: { dia: LUN, fr: 'f4' } };
  es(K.puedeIr(SP, cp, X, 'jordi', MAR) === 'horario' && K.puedeIr(SP, cp, X, 'omar', MAR) === '' && K.puedeIr(SP, cp, { id: 'y', cita: { dia: LUN, fr: 'f3' } }, 'jordi', MAR) === '',
    'en la demo, Jordi no hace la franja de 18 a 20 y sí la de 15 a 18');
  es(PUB.tecnicos.every(x => x.guardia) && K.puedeIr(SP, cp, { id: 'u' }, 'laia', Date.parse('2026-11-15T02:30:00Z')) === '', 'los tres hacen guardias: una urgencia de madrugada en domingo puede ir a cualquiera');
  const horas = [MAR, Date.parse('2026-11-15T02:30:00Z'), Date.parse('2026-11-14T22:30:00Z'), Date.parse('2026-12-31T22:58:30Z'), Date.parse('2027-03-28T00:58:30Z'), Date.parse('2026-12-08T10:00:00Z')];
  es(horas.every(t0 => { try { const SM = globalThis.OFICIO_MUESTRA(K, cp, t0); return SM.avisos.length >= 6 && K.sobran(SM, cp, t0).length === 0 && SM.avisos.filter(a => a.cita).every(a => a.cita.ok && !a.cita.of) } catch (e) { console.log('   ', e.message); return false } }),
    'los avisos de muestra se construyen a cualquier hora con los turnos puestos: de noche, en domingo, en festivo, en fin de año y en el cambio de hora') }

// 36. el mapa: la posición del técnico que va de camino. Solo la manda él, solo mientras va, solo la última, y se borra al llegar (13-11-2026)
{ empieza(); const BCN = { lat: 41.3879212, lon: 2.1699187 };
  const id = ap({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id; ap({ tipo: 'asignar', id, tec: 'omar' }, C);
  es(!!cfg.mapa && ap(Object.assign({ tipo: 'posicion', id }, BCN), T('omar')).err === 'estado' && A(id).pos === undefined, 'antes de «Voy» no se comparte ninguna posición');
  ap({ tipo: 'voy', id }, T('omar')); const h0 = A(id).h.length, v0 = S.v;
  es(K.vistaCliente(S, cfg, id).pos === null, 'de camino y sin posición todavía, el cliente no ve ninguna');
  es(ap(Object.assign({ tipo: 'posicion', id }, BCN), T('laia')).err === 'permiso' && ap(Object.assign({ tipo: 'posicion', id }, BCN), C).err === 'permiso' && ap(Object.assign({ tipo: 'posicion', id }, BCN), CLI).err === 'permiso' && A(id).pos === undefined,
    'la posición solo la puede mandar el técnico que lleva el aviso: ni otro técnico, ni la oficina, ni el cliente');
  es([{ lat: '41.38', lon: 2.17 }, { lat: 91, lon: 2 }, { lat: 41, lon: 181 }, { lat: NaN, lon: 2 }, { lat: null, lon: null }, {}, { lat: 41 }].every(x => ap(Object.assign({ tipo: 'posicion', id }, x), T('omar')).err === 'posicion') && A(id).pos === undefined,
    'una posición imposible, a medias o que no es un número no se guarda');
  const r1 = ap(Object.assign({ tipo: 'posicion', id, prec: 12.7 }, BCN), T('omar'));
  es(r1.ok && A(id).pos.lat === 41.38792 && A(id).pos.lon === 2.16992 && A(id).pos.t === t && Object.keys(A(id).pos).sort().join() === 'lat,lon,t' && A(id).h.length === h0 && S.v === v0 + 1,
    'la suya sí: se guarda redondeada a un metro, con su hora, sin llenar el historial');
  const V = K.vistaCliente(S, cfg, id);
  es(V.pos && V.pos.lat === 41.38792 && V.pos.lon === 2.16992 && V.pos.t === A(id).pos.t && Object.keys(V.pos).sort().join() === 'lat,lon,t', 'el cliente ve esa posición y cuándo se tomó');
  ap({ tipo: 'posicion', id, lat: 41.39, lon: 2.16 }, T('omar'));
  es(A(id).pos.lat === 41.39 && A(id).pos.lon === 2.16 && JSON.stringify(A(id)).split('"lat"').length === 2, 'solo se guarda la última: no queda el recorrido');
  es(ap({ tipo: 'sinPosicion', id }, T('laia')).err === 'permiso' && ap({ tipo: 'sinPosicion', id }, C).err === 'permiso', 'dejar de compartir también es cosa suya');
  es(ap({ tipo: 'sinPosicion', id }, T('omar')).ok && A(id).pos === undefined && A(id).posNo === true && K.vistaCliente(S, cfg, id).pos === null && /Deja de compartir/.test(A(id).h[A(id).h.length - 1].txt),
    'si deja de compartir, la posición se borra, el cliente deja de verla y queda escrito');
  es(ap(Object.assign({ tipo: 'posicion', id }, BCN), T('omar')).err === 'estado' && ap({ tipo: 'sinPosicion', id }, T('omar')).err === 'estado' && A(id).pos === undefined, 'y ya no se vuelve a guardar en ese viaje');
  // no había nadie → se reasigna → vuelve a ir: se comparte otra vez
  ap({ tipo: 'ausente', id }, T('omar')); es(A(id).posNo === undefined && A(id).pos === undefined, 'al no encontrar a nadie no queda ni la posición ni la marca');
  ap({ tipo: 'asignar', id, tec: 'omar' }, C); ap({ tipo: 'voy', id }, T('omar'));
  es(ap(Object.assign({ tipo: 'posicion', id }, BCN), T('omar')).ok && !!K.vistaCliente(S, cfg, id).pos, 'en el viaje siguiente vuelve a compartirse');
  ap({ tipo: 'empezar', id, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
  es(A(id).e === 'curso' && A(id).pos === undefined && K.vistaCliente(S, cfg, id).pos === null && ap(Object.assign({ tipo: 'posicion', id }, BCN), T('omar')).err === 'estado', 'al llegar y empezar, la posición se borra y ya no se admite ninguna más');
  // «no acepta el precio» también borra
  const id2 = ap({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id; ap({ tipo: 'asignar', id: id2, tec: 'laia' }, C); ap({ tipo: 'voy', id: id2 }, T('laia')); ap(Object.assign({ tipo: 'posicion', id: id2 }, BCN), T('laia'));
  es(!!A(id2).pos && ap({ tipo: 'noacepta', id: id2, modo: 'efectivo' }, T('laia')).ok && A(id2).pos === undefined, 'si el cliente no acepta el precio y se cierra el aviso, la posición también se borra');
  // por si acaso: una posición o una marca que quedasen guardadas por error (una copia vieja de los datos, o un cambio futuro que se olvide de borrarlas)
  const id3 = ap({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id; ap({ tipo: 'asignar', id: id3, tec: 'jordi' }, C);
  A(id3).pos = { lat: BCN.lat, lon: BCN.lon, t }; A(id3).posNo = true;
  es(A(id3).e === 'asignado' && K.vistaCliente(S, cfg, id3).pos === null, 'una posición que quedase guardada por error no la ve el cliente si el técnico no va de camino');
  es(ap({ tipo: 'voy', id: id3 }, T('jordi')).ok && A(id3).pos === undefined && A(id3).posNo === undefined && K.vistaCliente(S, cfg, id3).pos === null && ap(Object.assign({ tipo: 'posicion', id: id3 }, BCN), T('jordi')).ok,
    'y al salir se parte de cero: ni la posición vieja ni la marca de no compartir');
  // un negocio que no lo tiene activado
  const NM = JSON.parse(JSON.stringify(N)); delete NM.mapa; const cm = K.cfgDe(NM), SM = K.nuevo(); let tm = MAR; const hm = (a, q) => K.aplicar(SM, cm, a, q, tm += M);
  const im = hm({ tipo: 'pedir', av: 'fuga', cli: montse, origen: 'llamada' }, C).id; hm({ tipo: 'asignar', id: im, tec: 'omar' }, C); hm({ tipo: 'voy', id: im }, T('omar'));
  es(cm.mapa === null && hm(Object.assign({ tipo: 'posicion', id: im }, BCN), T('omar')).err === 'mapa' && hm({ tipo: 'sinPosicion', id: im }, T('omar')).err === 'mapa' && SM.avisos[0].pos === undefined && SM.avisos[0].posNo === undefined && K.vistaCliente(SM, cm, im).pos === null,
    'un negocio sin el mapa activado no guarda posiciones de nadie, ni apunta que se dejan de compartir') }

console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}.`);
process.exit(mal ? 1 : 0);
