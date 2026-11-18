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
const montse = { nombre: 'Montse', apellidos: 'Vila', tel: '600 00 01 43', dir: 'C/ Verdi 28, 2.º 1.ª', cp: '08012' };
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
r = ap({ tipo: 'pedir', av: 'atasco', cli: { nombre: 'Pau', apellidos: 'Roig', tel: '600000144', dir: 'C/ Balmes 100, 1.º', cp: '08008' } }, CLI);
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
r = ap({ tipo: 'pedir', av: 'termo', cli: { nombre: 'Rosa', apellidos: 'Gil', tel: '600000145', dir: 'C/ Marina 80, 2.º', cp: '08005' } }, CLI);
ap({ tipo: 'asignar', id: r.id, tec: 'laia' }, C); ap({ tipo: 'voy', id: r.id }, T('laia'));
es(ap({ tipo: 'noacepta', id: r.id, modo: 'efectivo' }, T('laia')).ok && A(r.id).tot.total === 3000 && A(r.id).sinTrabajo && !A(r.id).gar, 'si no acepta, se cobran 30,00 € de desplazamiento y no hay garantía');

// 13. no había nadie: vuelve a la bandeja
r = ap({ tipo: 'pedir', av: 'grifo', cli: { nombre: 'Joan', apellidos: 'Mas', tel: '600000146', dir: 'C/ Marina 82, 1.º', cp: '08005' } }, CLI);
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
r = ap({ tipo: 'pedir', av: 'cisterna', cli: { nombre: 'Ana', apellidos: 'Pons', tel: '600000147', dir: 'C/ Sardenya 300, 5.º', cp: '08025' }, cita: { dia, fr: 'f2' } }, CLI);
es(r.ok && !A(r.id).urg && K.franjasDe(S, cfg, dia, t).find(f => f.id === 'f2').libres === 0, 'la segunda cita llena la franja');
es(ap({ tipo: 'pedir', av: 'cisterna', cli: { nombre: 'Luis', apellidos: 'Vera', tel: '600000148', dir: 'C/ Sardenya 302, 1.º', cp: '08025' }, cita: { dia, fr: 'f2' } }, CLI).err === 'franja', 'la tercera ya no cabe');
es(ap({ tipo: 'cancelar', id: r.id, motivo: 'Lo ha arreglado un vecino' }, C).ok && K.franjasDe(S, cfg, dia, t).find(f => f.id === 'f2').libres === 1, 'cancelar una cita deja libre su hueco');
es(K.tarifaDe(cfg, A(j)) === false, 'con cita, la tarifa es siempre la normal');
es(ap({ tipo: 'asignar', id: j, tec: 'omar' }, C).ok && A(j).msgs.filter(m => m.k === 'cita').length === 1, 'al cambiar de técnico no se duplica el mensaje de la cita');
es(A(j).msgs.some(m => m.k === 'vispera'), 'y queda el recordatorio de la víspera');
ap({ tipo: 'mover', id: j, cita: { dia: dias[1].dia, fr: 'f3' } }, C);
es(!A(j).msgs.some(m => m.k === 'vispera') && A(j).msgs.filter(m => m.k === 'cita').length === 1, 'si la cita es mañana, basta con la confirmación de hoy');

// 15. la garantía se cruza por teléfono o por dirección
t = MAR + 90 * D;
r = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Montserrat', apellidos: 'V.', tel: '600 000 143', dir: 'Otra calle 1', cp: '08012' } }, CLI);
es(A(r.id).gar0 === 'R-0001', 'el mismo teléfono tres meses después: puede ser garantía');
r = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Un', apellidos: 'vecino', tel: '600000199', dir: 'Carrer de Verdi, 28 2-1', cp: '08012' } }, CLI);
es(A(r.id).gar0 === 'R-0001', 'la misma dirección escrita de otra forma: puede ser garantía');
r = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Otro', apellidos: 'vecino', tel: '600000198', dir: 'C/ Verdi 28, 3.º 1.ª', cp: '08012' } }, CLI);
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
es(ap({ tipo: 'completar', id: r.id, cli: { nombre: 'Montse', apellidos: 'Vila', tel: '600000143' } }, C).err === 'dir', 'completar pide lo que falta');
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
for (let i = 0; i < 7 * 48; i++) { try { const X = globalThis.OFICIO_MUESTRA(K, cfg, MAR + i * 30 * M); if (X.avisos.length !== 9 || !X.avisos.some(a => a.gar0) || !X.avisos.some(a => a.noPres) || !X.avisos.some(a => a.prox)) fallos++ } catch (e) { fallos++; if (fallos === 1) console.log('   ', e.message) } }
es(fallos === 0, 'la muestra se genera en las 336 medias horas de una semana, con su aviso en garantía, su presupuesto no aceptado y su revisión con aviso');


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
    const x0 = K.precio(cfg, lin, { ...o, urg: false }), ok3 = x0.total <= K.precio(cfg, lin, { ...o, urg: true, tipo: x0.tipo }).total;   // con el mismo IVA: si el material baja del 40 %, el IVA reducido puede dejarlo más barato, y eso es la ley
    if (!(ok1 && ok2 && ok3)) { malos++; if (!ej) ej = JSON.stringify({ lin, o, x: { t: x.total, b: x.base, i: x.iva, tipo: x.tipo } }) } }
  es(malos === 0, 'mil presupuestos al azar: suma de líneas = total, base + IVA = total, céntimos enteros, local al 21 %, la urgencia nunca abarata' + (ej ? ' · ' + ej : '')) }
p = K.precio(cfg, [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], { urg: true, local: true });
es(p.tipo === 21 && p.total > 11700, 'urgencia en un local: recargo y además IVA del 21 %');

// 21. ningún mensaje sale con huecos («undefined», «NaN», «null»)
empieza();
{ const rr = []; rr.push(ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI));
  rr.push(ap({ tipo: 'pedir', av: 'cisterna', cli: { nombre: 'Ana', apellidos: 'Pons', tel: '600000147', dir: 'C/ Sardenya 300, 5.º', cp: '08025' }, cita: { dia: K.diasDe(S, cfg, t, 6)[2].dia, fr: 'f3' } }, CLI));
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
r = ap({ tipo: 'pedir', av: 'atasco', cli: { nombre: 'Pau', apellidos: 'Roig', tel: '600000144', dir: 'C/ Balmes 100, 1.º', cp: '08008' } }, CLI); const c3 = r.id;
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
{ const antes = JSON.stringify(A(c2)); es(ap({ tipo: 'anotar', id: c2, obs: 'Otra nota', foto: 'data:image/jpeg;base64,CCCC' }, T('omar')).err === 'fotos' && JSON.stringify(A(c2)) === antes, 'con cuatro fotos, una quinta se rechaza sin cambiar la nota (antes la cambiaba)');
  es(ap({ tipo: 'anotar', id: c2 }, T('omar')).err === 'vacio' && ap({ tipo: 'anotar', id: c2, obs: { a: 1 } }, T('omar')).err === 'obs', 'anotar nada, o algo que no es texto, se rechaza') }
/* 16-11: una foto solo vale si es una imagen de verdad. Lo demás (código, enlaces, un SVG) se rechaza: la app de la
   oficina pinta las fotos, y por la puerta de la web cualquiera podía mandar un texto en su lugar */
{ const malas = ['f5', 'x" onerror="alert(1)', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'data:image/jpeg;base64,AAA" onload="x', 'https://ejemplo.es/a.jpg'];
  const ant = JSON.stringify(A(c2)); es(malas.every(m => ap({ tipo: 'anotar', id: c2, foto: m }, T('omar')).err === 'foto') && JSON.stringify(A(c2)) === ant, 'una «foto» que no es una imagen (código, un enlace, un SVG) se rechaza y no cambia nada');
  const S0 = JSON.parse(JSON.stringify(S));
  const okW = malas.map(m => K.aplicar(S, cfg, { tipo: 'pedir', av: 'fuga', origen: 'cita', foto: m, cli: { nombre: 'Prueba', apellidos: 'Foto', tel: '600111222', dir: 'Calle Mayor 1', cp: '08028' }, cita: null }, CLI, t += M));
  es(okW.every(r => r.ok) && okW.every(r => A(r.id).foto === ''), 'desde la web: el aviso entra, pero sin esa «foto» (se queda vacía)');
  const bueno = K.aplicar(S, cfg, { tipo: 'pedir', av: 'fuga', origen: 'cita', foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', cli: { nombre: 'Prueba', apellidos: 'Foto', tel: '600111223', dir: 'Calle Mayor 2', cp: '08028' }, cita: null }, CLI, t += M);
  es(bueno.ok && A(bueno.id).foto === 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', 'una foto de verdad (JPEG en base64) sí entra');
  S.avisos = S0.avisos; S.n = S0.n; Object.keys(S).forEach(k => { if (!(k in S0)) delete S[k] }); Object.assign(S, S0) }
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
es(vistas.every(v => v.tec === 'Laia' && !/600000143|Verdi|Montse|Vila|Ferrer/.test(JSON.stringify(v))), 'y en ninguno ve teléfono, dirección, nombre ni apellido de nadie');
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

// los apellidos (14-11-2026): se piden con el nombre siempre que los datos tienen que estar completos
{ empieza();
  let r = ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI);
  es(r.ok && A(r.id).cli.nombre === 'Montse' && A(r.id).cli.apellidos === 'Vila' && K.nomCli(A(r.id).cli) === 'Montse Vila', 'el aviso guarda el nombre y los apellidos, y se enseñan juntos');
  es(K.mensaje(cfg, A(r.id), 'recibido').startsWith('Hola, Montse. '), 'el mensaje al cliente le saluda solo por el nombre');
  const sinAp = { ...montse, apellidos: '' };
  es(ap({ tipo: 'pedir', av: 'fuga', cli: sinAp }, CLI).err === 'apellidos' && ap({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: sinAp }, C).err === 'apellidos', 'sin apellidos no entra: ni desde la web ni desde la oficina');
  es(ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, apellidos: ' V ' } }, CLI).err === 'apellidos' && ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, apellidos: 7 } }, CLI).err === 'apellidos' && ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, apellidos: ['Vila'] } }, CLI).err === 'apellidos', 'ni con una letra, ni con algo que no es texto');
  r = ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, apellidos: '  Vila   i \n Puig  ' } }, CLI);
  es(r.ok && A(r.id).cli.apellidos === 'Vila i Puig', 'los espacios de sobra se quitan');
  r = ap({ tipo: 'pedir', av: 'fuga', cli: { ...montse, apellidos: 'x'.repeat(300) } }, CLI);
  es(r.ok && A(r.id).cli.apellidos.length === 80, 'y unos apellidos larguísimos se cortan a 80 letras');
  // el aviso que deja la web al abrir WhatsApp entra sin apellidos; al completarlo, se piden
  r = ap({ tipo: 'pedir', av: 'fuga', origen: 'web', cli: { dis: 'gra' } }, CLI);
  es(r.ok && A(r.id).cli.apellidos === '', 'el aviso de WhatsApp entra sin apellidos, igual que sin teléfono');
  es(ap({ tipo: 'completar', id: r.id, cli: sinAp }, C).err === 'apellidos', 'al completar sus datos se piden los apellidos');
  es(ap({ tipo: 'completar', id: r.id, cli: montse }, C).ok && A(r.id).cli.apellidos === 'Vila', 'y con ellos, se guardan');
  // un aviso de antes de los apellidos: se sigue viendo con su nombre y, si se cambian sus datos, se piden
  const viejo = ap({ tipo: 'pedir', av: 'grifo', cli: montse }, CLI).id; delete A(viejo).cli.apellidos;
  es(K.nomCli(A(viejo).cli) === 'Montse', 'un aviso de antes de los apellidos se sigue viendo con su nombre');
  es(ap({ tipo: 'completar', id: viejo, cli: { tel: '600000143' } }, C).err === 'apellidos', 'y si se cambian sus datos, se piden los apellidos');
  es(K.nomCli(null) === '' && K.nomCli('hola') === '' && K.nomCli({ nombre: ' Ana ', apellidos: ' Pons ' }) === 'Ana Pons' && K.nomCli({ apellidos: 'Pons' }) === 'Pons' && K.nomCli({ nombre: 5 }) === '5', 'nombre y apellidos juntos, sin espacios de sobra, y nada si no hay cliente');
}

// el perfil del cliente (14-11-2026): todo lo suyo por su teléfono, nada de otro ni nada interno, y una copia
{ empieza();
  const a1 = ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI).id;
  const otro = ap({ tipo: 'pedir', av: 'grifo', cli: { nombre: 'Pau', apellidos: 'Roig', tel: '600000144', dir: 'C/ Balmes 100, 1.º', cp: '08008' } }, CLI).id;
  ap({ tipo: 'asignar', id: a1, tec: 'omar' }, C); ap({ tipo: 'voy', id: a1 }, T('omar'));
  ap({ tipo: 'empezar', id: a1, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
  ap({ tipo: 'terminar', id: a1, modo: 'efectivo' }, T('omar'));
  const a2 = ap({ tipo: 'pedir', av: 'atasco', origen: 'llamada', nota: 'Dice que el vecino es muy pesado', cli: { ...montse, tel: '+34 600 00 01 43', dir: 'C/ Verdi 30, 1.º' } }, C).id;
  const P = K.perfilCliente(S, cfg, '600 000 143');
  es(P && P.tel === '600000143' && P.avisos.map(a => a.id).join() === [a2, a1].join(), 'el perfil lleva los avisos de su teléfono, aunque se escribiera distinto, y lo último primero');
  es(!P.avisos.some(a => a.id === otro) && !JSON.stringify(P).includes('600000144') && !JSON.stringify(P).includes('Roig'), 'y nada de otro cliente');
  const A1 = P.avisos.find(a => a.id === a1);
  es(A1.e === 'hecho' && !!A1.pres && A1.tot.total === A(a1).tot.total && A1.tot.total > 0 && !!A1.gar && A1.gar.hasta === A(a1).gar.hasta && A1.pago.cobrado && A1.vista.e === 'hecho', 'lleva sus papeles: el presupuesto firmado, el total, el pago y la garantía');
  es(P.avisos.every(a => !('h' in a) && !('msgs' in a) && !('nota' in a) && !('vale' in a) && !('origen' in a)) && !JSON.stringify(P).includes('vecino'), 'pero no el diario, los mensajes ni la nota con la que entró el aviso');
  es(P.cli.nombre === 'Montse' && P.cli.apellidos === 'Vila' && P.cli.dir === 'C/ Verdi 30, 1.º' && A1.cli.dir === montse.dir, 'sus datos son los del último aviso, y cada aviso lleva la dirección donde se hizo');
  A1.tot.total = 0; A1.cli.nombre = 'X'; P.avisos[0].e = 'roto';
  es(A(a1).tot.total > 0 && A(a1).cli.nombre === 'Montse' && A(a2).e === 'nuevo', 'es una copia: tocarla no cambia los avisos');
  es(K.perfilCliente(S, cfg, '699999999') === null && K.perfilCliente(S, cfg, 'hola') === null && K.perfilCliente(null, cfg, '600000143') === null, 'un teléfono sin avisos, uno mal escrito o sin datos: nada');
  es(K.perfilCliente(S, cfg, '0034600000143').avisos.length === 2, 'con el prefijo de España, el mismo perfil');
  const a3 = ap({ tipo: 'pedir', av: 'fuga', origen: 'web', cli: { tel: '600000143' } }, CLI).id, P3 = K.perfilCliente(S, cfg, '600000143');
  es(P3.avisos[0].id === a3 && P3.cli.nombre === 'Montse' && P3.cli.apellidos === 'Vila' && P3.cli.dir === 'C/ Verdi 30, 1.º', 'si el último aviso entró por WhatsApp con solo el teléfono, sus datos salen del último que los tiene');
  es(K.CLIENTE_DEMO === '2468-1357', 'el código de los clientes de muestra en la demo');
}

// 38. lo del 15-11-2026: el desistimiento en el presupuesto, «Facturada», el mes para la gestoría, lo que deja cada trabajo,
//     las fincas de un administrador y quién va
{
  empieza(); let r;
  const u = ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI).id;            // una urgencia que pide el cliente
  ap({ tipo: 'asignar', id: u, tec: 'omar' }, C);
  es(K.desiste(cfg, A(u), [{ k: 'desp' }, { k: 'mo' }]) === 'urgente' && !K.pideYa('urgente'), 'la reparación urgente que pide el cliente no tiene desistimiento');
  es(K.desiste(cfg, A(u), [{ k: 'desp' }, { k: 'termo80' }]) === 'urgente+' && K.pideYa('urgente+'), 'si se añade un aparato nuevo, eso sí lo tiene');
  es(K.desiste(cfg, A(u), [{ k: 'otro', t: 'Pieza', p: 9 }, { k: 'nada' }, null]) === 'urgente' && K.desiste(cfg, null, []) === '', 'el material suelto o una clave que no existe no cuentan como añadido');
  es(ap({ tipo: 'empezar', id: u, pres: { lineas: [{ k: 'desp' }, { k: 'termo80' }], firma: F } }, T('omar')).err === 'pide' && A(u).e === 'asignado', 'urgencia con un aparato nuevo: sin la petición del cliente no se empieza');
  r = ap({ tipo: 'empezar', id: u, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
  es(r.ok && A(u).pres.des.c === 'urgente' && A(u).pres.des.pide === 0, 'la reparación urgente sola empieza sin petición');
  es(ap({ tipo: 'ampliar', id: u, lineas: [{ k: 'termo80' }], firma: F }, T('omar')).err === 'pide' && !A(u).amp, 'ampliar con un aparato nuevo necesita la petición');
  r = ap({ tipo: 'ampliar', id: u, lineas: [{ k: 'termo80' }], firma: F, pide: true }, T('omar'));
  es(r.ok && A(u).amp[0].des.c === 'urgente+' && A(u).amp[0].des.pide === t, 'con la petición, la ampliación queda firmada con su hora');
  es(ap({ tipo: 'ampliar', id: u, lineas: [{ k: 'juntas' }], firma: F }, T('omar')).ok && A(u).amp[1].des.c === 'urgente' && A(u).amp[1].des.pide === 0, 'añadir piezas para la reparación no la necesita');
  const dia = K.diasDe(S, cfg, t, 3).find(d => d.franjas.some(f => f.ok)).dia, fr = K.franjasDe(S, cfg, dia, t).find(f => f.ok).id;
  const c = ap({ tipo: 'pedir', av: 'grifo', cli: Object.assign({}, montse, { tel: '600000144' }), cita: { dia, fr } }, CLI).id;
  ap({ tipo: 'asignar', id: c, tec: 'laia' }, C);
  es(ap({ tipo: 'empezar', id: c, pres: { lineas: [{ k: 'grifo' }], firma: F } }, T('laia')).err === 'pide' && A(c).e === 'asignado', 'con cita: sin la petición del cliente no se empieza');
  es(ap({ tipo: 'empezar', id: c, pres: { lineas: [{ k: 'grifo' }], firma: F, pide: 'sí' } }, T('laia')).err === 'pide', 'la petición tiene que ser un sí de verdad, no un texto');
  r = ap({ tipo: 'empezar', id: c, pres: { lineas: [{ k: 'grifo' }], firma: F, pide: true } }, T('laia'));
  es(r.ok && A(c).pres.des.c === 'cita' && A(c).pres.des.pide === t, 'con la petición empieza, y queda la hora en que la pidió');
  es(ap({ tipo: 'ampliar', id: c, lineas: [{ k: 'latig' }], firma: F }, T('laia')).err === 'pide', 'con cita, cada ampliación la vuelve a pedir');
  // «Facturada»: la factura la hace el programa del negocio; aquí solo se apunta
  ap({ tipo: 'terminar', id: u, modo: 'tarjeta' }, T('omar'));
  es(ap({ tipo: 'facturar', id: u }, T('omar')).err === 'permiso', 'solo la oficina apunta lo facturado');
  es(ap({ tipo: 'facturar', id: c }, C).err === 'estado', 'lo que no está terminado no se factura');
  es(K.porFacturar(S, t).map(x => x.id).join() === u && K.porFacturar(S, t)[0].dias === 0, 'lo terminado y sin facturar sale en «Por facturar»');
  es(ap({ tipo: 'facturar', id: u, num: { a: 1 } }, C).err === 'num' && !A(u).fac, 'el número tiene que ser un texto');
  r = ap({ tipo: 'facturar', id: u, num: '  F-2026   0012 ' }, C);
  es(r.ok && A(u).fac.num === 'F-2026 0012' && A(u).fac.t === t && !K.porFacturar(S, t).length, 'facturado, con su número limpio, deja de salir');
  es(ap({ tipo: 'facturar', id: u }, C).err === 'estado', 'no se apunta dos veces');
  es(ap({ tipo: 'facturar', id: u, quitar: true }, C).ok && !A(u).fac && K.porFacturar(S, t).length === 1, 'si se apuntó por error, se quita');
  es(ap({ tipo: 'facturar', id: c, quitar: true }, C).err === 'estado', 'quitar lo que no estaba apuntado, no');
  es(K.resumen(S, cfg, t).porFac.n === 1 && K.resumen(S, cfg, t).porFac.viejos === 0 && K.resumen(S, cfg, t + 8 * D).porFac.viejos === 1, 'la oficina ve cuántos llevan más de una semana sin facturar');
  ap({ tipo: 'facturar', id: u, num: 'F-12' }, C);
  es(K.perfilCliente(S, cfg, montse.tel).avisos.find(a => a.id === u).fac.num === 'F-12', 'el cliente ve el número de su factura');
  const df = K.datosFactura(cfg, A(u));
  es(df.includes('Cliente: Montse Vila') && df.includes('aviso ' + u) && df.includes('Total: ' + K.eur(A(u).tot.total)) && df.includes('Termo eléctrico') && df.includes('cobrado el') && K.datosFactura(cfg, null) === '', 'los datos para la factura llevan el cliente, las líneas, el total y el pago');
  // el mes para la gestoría
  const mes = K.madrid(A(u).fin).date.slice(0, 7), filas = K.trabajosMes(S, cfg, mes);
  es(filas.length === 1 && filas[0][1] === u && filas[0][10] === (A(u).tot.total / 100).toFixed(2).replace('.', ',') && filas[0][12] === 'Sí' && filas[0][13] === 'F-12', 'el mes para la gestoría: una fila por trabajo, con su pago y su factura');
  es(K.trabajosMes(S, cfg, '2020-01').length === 0, 'otro mes, nada');
  const x = K.csv([['=HIPERVINCULO("x")', 'a;b', 'dice "hola"', '-1', '@x', 'normal']]);
  es(x.startsWith('﻿' + K.CSV_CAB.join(';') + '\r\n') && x.includes(`"'=HIPERVINCULO(""x"")"`) && x.includes('"a;b"') && x.includes('"dice ""hola"""') && x.includes("'-1") && x.includes("'@x") && x.endsWith(';normal\r\n'), 'el archivo se abre bien, y lo escrito en la web no se convierte en una fórmula');
  // lo que deja cada trabajo
  ap({ tipo: 'terminar', id: c, modo: 'bizum' }, T('laia'));
  const R0 = K.rentabilidad(S, cfg, mes + '-01', mes + '-31'), g = R0.av.find(z => z.k === 'grifo');
  es(R0.av.length === 2 && R0.urg.n === 1 && R0.cita.n === 1 && R0.tec.length === 2 && R0.solo.n === 0, 'lo que deja cada trabajo: por avería, por técnico, urgencias y citas');
  es(g.n === 1 && g.base === A(c).tot.base && g.min === A(c).min && g.hora === Math.round(A(c).tot.base * 60 / A(c).min), 'por hora: lo cobrado sin IVA entre el tiempo de trabajo');
  es(K.rentabilidad(S, cfg, '2020-01-01', '2020-01-31').av.length === 0, 'fuera de las fechas, nada');
  const s1 = ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({}, montse, { tel: '600000145' }) }, CLI).id; ap({ tipo: 'asignar', id: s1, tec: 'omar' }, C); ap({ tipo: 'noacepta', id: s1, modo: 'efectivo' }, T('omar'));
  const R1 = K.rentabilidad(S, cfg, mes + '-01', mes + '-31');
  es(R1.solo.n === 1 && R1.solo.total === A(s1).tot.total && R1.av.find(z => z.k === 'fuga').n === 1, 'lo que es solo el desplazamiento va aparte y no cuenta en lo que deja cada trabajo');
  // un administrador de fincas: el mismo teléfono en varias direcciones
  const adm = '611222333', fin0 = { nombre: 'Fincas', apellidos: 'Puig', tel: adm };
  const f1 = ap({ tipo: 'pedir', av: 'atasco', cli: Object.assign({ dir: 'C/ Sants 100', cp: '08014' }, fin0) }, C).id;
  ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({ dir: 'C/ de Sants, 100', cp: '08014' }, fin0) }, C);
  ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({ dir: 'Av. de Madrid 7', cp: '08028' }, fin0) }, C);
  const PA = K.perfilCliente(S, cfg, adm);
  es(PA.avisos.length === 3 && PA.fincas.length === 2 && PA.fincas[0].dir === 'Av. de Madrid 7' && K.perfilCliente(S, cfg, montse.tel).fincas.length === 1, 'un administrador ve sus avisos y sus fincas, sin repetir una dirección escrita de otra forma');
  ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({ dir: 'Av. de Madrid 7, bajos', cp: '08028' }, fin0) }, C); ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({ dir: 'Av. de Madrid 7, 3.º 2.ª', cp: '08028' }, fin0) }, C);
  const PB = K.perfilCliente(S, cfg, adm);
  es(PB.fincas.length === 2 && PB.fincas[0].dir === 'Av. de Madrid 7' && K.fincaDe('C/ Verdi 28, 2.º 1.ª') === K.fincaDe('Carrer de Verdi, 28, bajos') && K.fincaDe('Pza. Real') === 'pza real', 'los pisos de un mismo edificio son la misma finca, y la finca se enseña sin el piso');
  // quién va
  es(K.vistaCliente(S, cfg, f1).quien === null, 'sin técnico, no hay a quién enseñar');
  ap({ tipo: 'asignar', id: f1, tec: 'jordi' }, C);
  const q2 = K.vistaCliente(S, cfg, f1).quien;
  es(q2.n === 'Jordi' && q2.ap === 'R' && q2.coche.includes('Furgoneta') && q2.foto === '' && q2.tono === 95, 'quién va: su nombre, la inicial del apellido y la furgoneta; la foto, solo con su permiso');
  const conFoto = K.cfgDe(Object.assign({}, N, { tecnicos: N.tecnicos.map(z => z.id === 'jordi' ? Object.assign({}, z, { foto: 'assets/tec/jordi.jpg', fotoOk: 1 }) : z.id === 'omar' ? Object.assign({}, z, { foto: 'assets/../x.jpg', fotoOk: 1 }) : z.id === 'laia' ? Object.assign({}, z, { foto: 'assets/tec/laia.jpg' }) : z) }));
  es(K.vistaCliente(S, conFoto, f1).quien.foto === 'assets/tec/jordi.jpg' && K.quienDe(conFoto.tec.omar).foto === '' && K.quienDe(conFoto.tec.laia).foto === '', 'con su permiso y en la web del negocio sale su foto; sin permiso o con una ruta rara, nunca');
  es(K.vistaCliente(S, cfg, u).quien === null, 'acabado el trabajo, ya no se enseña');
  // una cita pedida de noche va con la tarifa normal (antes solo lo cazaban los recorridos al azar)
  t = Date.parse('2026-11-10T22:30:00Z'); const dn = K.diasDe(S, cfg, t, 3).find(d => d.franjas.some(f => f.ok));
  const cn = ap({ tipo: 'pedir', av: 'grifo', cli: Object.assign({}, montse, { tel: '600000146' }), cita: { dia: dn.dia, fr: dn.franjas.find(f => f.ok).id } }, CLI).id;
  es(K.urgente(cfg, A(cn).t) && K.tarifaDe(cfg, A(cn)) === false, 'una cita pedida de noche se cobra con la tarifa normal');
}

// 39. los papeles (js/oficio-papeles.js), sin navegador: lo que dicen del desistimiento, el formulario, el correo del
//     negocio si lo tiene, y que el parte no es una factura (15-11-2026)
{
  require(path.join(sitio, 'js/oficio-papeles.js'));
  const P = globalThis.OficioPapeles, svg = () => '<svg></svg>', o = { K, N, cfg, firmaSvg: svg };
  const conCorreo = { K, N: Object.assign({}, N, { email: 'avisos@ramirez.example' }), cfg, firmaSvg: svg };
  empieza();
  const u = ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({}, montse, { nombre: '<b>Mon</b>' }) }, CLI).id;
  ap({ tipo: 'asignar', id: u, tec: 'omar' }, C);
  ap({ tipo: 'empezar', id: u, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
  let h = P.doc(A(u), 'presupuesto', o);
  es(h.includes('<h2>Desistimiento</h2>') && h.includes('no tiene derecho de desistimiento (artículo 103 h') && !h.includes('Formulario de desistimiento') && !h.includes('Pediste que'), 'urgencia sola: el papel dice que no hay desistimiento, sin formulario');
  es(!h.includes('<b>Mon</b>') && h.includes('&lt;b&gt;Mon&lt;/b&gt;'), 'lo que escribe el cliente sale tal cual, sin colarse como código');
  ap({ tipo: 'ampliar', id: u, lineas: [{ k: 'termo80' }], firma: F, pide: true }, T('omar'));
  h = P.doc(A(u), 'presupuesto', o);
  es(h.includes('Lo añadido que no es la reparación sí lo tiene: 14 días naturales') && h.includes('Formulario de desistimiento') && h.includes('desisto de lo añadido en el aviso ' + u + ': Termo eléctrico de 80 litros, instalado, firmado el ' + K.fechaCorta(K.madrid(A(u).amp[0].t).date) + '.') && h.includes('Pidió que se hiciera ya, sabiendo que, hecho, ya no podrá desistir'), 'urgencia con un aparato nuevo: los 14 días para lo añadido, el formulario y la petición en la ampliación');
  es(h.includes('A ' + N.razon + ', ' + N.dir + ', teléfono ' + N.tel + ':') && !h.includes(', correo '), 'sin correo, el formulario va con la dirección y el teléfono');
  const hc = P.doc(A(u), 'presupuesto', conCorreo);
  es(hc.includes('teléfono ' + N.tel + ', correo avisos@ramirez.example:') && hc.includes(N.tel + ' · avisos@ramirez.example</p>'), 'con correo, va en el formulario y en la cabecera');
  // urgencia con el aparato nuevo ya en el presupuesto: lo añadido, con la fecha del presupuesto, y la petición en su sitio
  const u2 = ap({ tipo: 'pedir', av: 'termo', cli: Object.assign({}, montse, { tel: '600000148' }) }, CLI).id;
  ap({ tipo: 'asignar', id: u2, tec: 'jordi' }, C);
  ap({ tipo: 'empezar', id: u2, pres: { lineas: [{ k: 'desp' }, { k: 'termo80' }], firma: F, pide: true } }, T('jordi'));
  h = P.doc(A(u2), 'presupuesto', o);
  es(h.includes('La reparación urgente que pediste no tiene derecho de desistimiento') && h.includes('Lo añadido que no es la reparación sí lo tiene') && h.includes('desisto de lo añadido en el aviso ' + u2 + ': Termo eléctrico de 80 litros, instalado, firmado el ' + K.fechaCorta(K.madrid(A(u2).pres.t).date) + '.') && h.includes('Pediste que lo hiciéramos ya'), 'urgencia con el aparato nuevo en el presupuesto: lo añadido en el formulario, con su fecha, y la petición');
  const dia = K.diasDe(S, cfg, t, 3).find(d => d.franjas.some(f => f.ok)).dia, fr = K.franjasDe(S, cfg, dia, t).find(f => f.ok).id;
  const c = ap({ tipo: 'pedir', av: 'grifo', cli: Object.assign({}, montse, { tel: '600000147' }), cita: { dia, fr } }, CLI).id;
  ap({ tipo: 'asignar', id: c, tec: 'laia' }, C);
  ap({ tipo: 'empezar', id: c, pres: { lineas: [{ k: 'grifo' }], firma: F, pide: true } }, T('laia'));
  h = P.doc(A(c), 'presupuesto', o);
  es(h.includes('Tienes 14 días naturales desde la firma para desistir') && h.includes('Formulario de desistimiento') && h.includes('a las ' + K.hora(A(c).pres.des.pide) + ', sabiendo que, cuando esté hecho, ya no podrás desistir') && h.includes('pagas la parte hecha') && h.includes('desisto del contrato del servicio del aviso ' + c + ', firmado el '), 'con cita: los 14 días, la petición con su hora y lo que se paga si se desiste a medias');
  ap({ tipo: 'terminar', id: c, modo: 'bizum' }, T('laia'));
  h = P.doc(A(c), 'parte', o);
  es(h.includes('Este parte no es una factura') && h.includes('con su programa de facturas.') && !h.includes('factura n.º'), 'el parte dice que no es una factura');
  ap({ tipo: 'facturar', id: c, num: 'F-7' }, C);
  es(P.doc(A(c), 'parte', o).includes('(factura n.º F-7)'), 'y, ya facturado, lleva el número de la factura');
  // un aviso de antes del 15-11, sin nada del desistimiento guardado: el papel sale igual, sin ese apartado
  const viejo = JSON.parse(JSON.stringify(A(c))); delete viejo.pres.des; delete viejo.fac;
  h = P.doc(viejo, 'presupuesto', o);
  es(!h.includes('Desistimiento') && h.includes('<h1>Presupuesto</h1>'), 'un presupuesto de antes, sin el apartado nuevo, sale sin romperse');
}

// 40. el material que falta (15-11-2026): lo apuntan su técnico o la oficina, se junta por día y por técnico para
//     mandarlo por WhatsApp, y el cliente no lo ve
{
  empieza(); let r;
  const mat = Object.keys(cfg.cat).find(k => cfg.cat[k].mat), mat2 = Object.keys(cfg.cat).filter(k => cfg.cat[k].mat)[1], noMat = Object.keys(cfg.cat).find(k => !cfg.cat[k].mat);
  const u = ap({ tipo: 'pedir', av: 'fuga', cli: montse }, CLI).id; ap({ tipo: 'asignar', id: u, tec: 'omar' }, C);
  es(ap({ tipo: 'falta', id: u, k: mat }, T('laia')).err === 'permiso' && ap({ tipo: 'falta', id: u, k: mat }, CLI).err === 'permiso', 'el material lo apuntan su técnico o la oficina, nadie más');
  es(ap({ tipo: 'falta', id: u, k: noMat }, C).err === 'falta' && ap({ tipo: 'falta', id: u, k: 'nada' }, C).err === 'falta' && ap({ tipo: 'falta', id: u, k: 'otro', t: 'x' }, C).err === 'falta', 'del catálogo, solo lo que es material');
  es(ap({ tipo: 'falta', id: u, t: '   ' }, C).err === 'falta' && ap({ tipo: 'falta', id: u, t: { a: 1 } }, C).err === 'falta' && ap({ tipo: 'falta', id: u }, C).err === 'falta' && !A(u).falta, 'escrito a mano, tiene que decir algo');
  es([0, 21, 1.5, '2', -1, null].every(q => ap({ tipo: 'falta', id: u, k: mat, q }, C).err === 'falta') && !A(u).falta, 'cuántos: de 1 a 20, en números enteros');
  r = ap({ tipo: 'falta', id: u, k: mat, q: 2 }, T('omar'));
  es(r.ok && A(u).falta.length === 1 && A(u).falta[0].k === mat && A(u).falta[0].t === cfg.cat[mat].t && A(u).falta[0].q === 2 && A(u).h[A(u).h.length - 1].txt.includes('2 × ' + cfg.cat[mat].t), 'su técnico apunta material del catálogo, y queda en el historial');
  es(ap({ tipo: 'falta', id: u, k: mat, q: 19 }, C).ok && A(u).falta.length === 1 && A(u).falta[0].q === 20, 'lo mismo se suma, hasta 20');
  es(ap({ tipo: 'falta', id: u, t: '  Latiguillo\n de   40 cm ', q: 1 }, C).ok && A(u).falta[1].t === 'Latiguillo de 40 cm' && !('k' in A(u).falta[1]), 'escrito a mano, queda limpio');
  es(ap({ tipo: 'falta', id: u, t: 'LATIGUILLO DE 40 CM' }, C).ok && A(u).falta.length === 2 && A(u).falta[1].q === 2, 'lo escrito igual, aunque cambien las mayúsculas, se suma');
  for (let i = 0; i < 10; i++) ap({ tipo: 'falta', id: u, t: 'Cosa ' + i }, C);
  es(A(u).falta.length === 12 && ap({ tipo: 'falta', id: u, t: 'Una más' }, C).err === 'falta' && ap({ tipo: 'falta', id: u, k: mat }, C).err === undefined, 'hasta 12 cosas por aviso; a una que ya está se le puede sumar');
  es(ap({ tipo: 'falta', id: u, t: 'No está', quitar: true }, C).err === 'estado' && ap({ tipo: 'falta', id: u, t: 'cosa 3', quitar: true }, T('omar')).ok && A(u).falta.length === 11 && !A(u).falta.some(x => x.t === 'Cosa 3'), 'se quita por lo que es; lo que ya no está, no');
  es(ap({ tipo: 'falta', id: u, k: mat, quitar: 'sí' }, C).ok && A(u).falta.find(x => x.k === mat).q === 20, 'quitar es un sí de verdad: con otra cosa, suma uno (y se queda en 20)');
  es(!('falta' in K.vistaCliente(S, cfg, u)) && !('falta' in K.perfilCliente(S, cfg, montse.tel).avisos[0]), 'el cliente no lo ve, ni en su página ni en su zona');
  const g0 = K.material(S, cfg, '');
  es(g0.length === 1 && g0[0].tec === 'omar' && g0[0].n === 'Omar' && g0[0].cosas.length === 11 && g0[0].cosas[0].av.join() === u && K.material(S, cfg, '2026-11-11').length === 0, 'una urgencia sin cita va en «sin día», con su técnico');
  const dia = K.diasDe(S, cfg, t, 3).find(d => d.franjas.some(f => f.ok)).dia, fr = K.franjasDe(S, cfg, dia, t).find(f => f.ok).id;
  const c1 = ap({ tipo: 'pedir', av: 'grifo', cli: Object.assign({}, montse, { tel: '600000150' }), cita: { dia, fr } }, CLI).id;
  const c2 = ap({ tipo: 'pedir', av: 'grifo', cli: Object.assign({}, montse, { tel: '600000151' }), cita: { dia, fr } }, CLI).id;
  ap({ tipo: 'asignar', id: c1, tec: 'laia' }, C);
  ap({ tipo: 'falta', id: c1, k: mat }, C); ap({ tipo: 'falta', id: c2, k: mat, q: 3 }, C); ap({ tipo: 'falta', id: c2, t: 'Grifo monomando' }, C);
  const gd = K.material(S, cfg, dia);
  es(gd.length === 2 && gd[0].tec === 'laia' && gd[1].tec === '' && gd[1].n === '' && gd[0].cosas[0].q === 1 && gd[1].cosas.find(x => x.k === mat).q === 3, 'con cita, va en su día: por técnico, y lo que no tiene técnico al final');
  ap({ tipo: 'asignar', id: c2, tec: 'laia' }, C);
  const gl = K.material(S, cfg, dia)[0];
  es(K.material(S, cfg, dia).length === 1 && gl.cosas.length === 2 && gl.cosas[0].q === 4 && gl.cosas[0].av.join() === c1 + ',' + c2, 'lo mismo de dos avisos se suma, y dice de cuáles es');
  const tx = K.textoMaterial(cfg, gl, dia);
  es(tx === 'Material para el ' + K.fechaLarga(dia) + ', Laia:\n- 4 × ' + cfg.cat[mat].t + ' (' + c1 + ', ' + c2 + ')\n- 1 × Grifo monomando (' + c2 + ')\n' + N.nombre && K.textoMaterial(cfg, null, dia) === '' && K.textoMaterial(cfg, g0[0], '').startsWith('Material de los avisos sin día, Omar:'), 'el texto para mandar por WhatsApp');
  if (mat2) { ap({ tipo: 'falta', id: c1, k: mat2, q: 2 }, C); es(K.material(S, cfg, dia)[0].cosas.length === 3, 'cada cosa distinta, en su línea') }
  es(ap({ tipo: 'falta', id: c1, vaciar: 'sí' }, C).err === 'falta' && A(c1).falta.length > 0, 'vaciar es un sí de verdad, no un texto');
  es(ap({ tipo: 'falta', id: c1, vaciar: true }, T('laia')).ok && !A(c1).falta && ap({ tipo: 'falta', id: c1, vaciar: true }, C).err === 'estado', '«Ya está todo» lo vacía; vacío, no hay nada que vaciar');
  ap({ tipo: 'cancelar', id: c2, motivo: 'Ya no hace falta' }, C);
  es(K.material(S, cfg, dia).length === 0 && ap({ tipo: 'falta', id: c2, k: mat }, C).err === 'estado', 'lo cancelado ya no sale en la lista ni se apunta');
}

// 41. los contratos de mantenimiento (15-11-2026): el alta, lo que da a los avisos del cliente, la revisión, el cobro,
//     la renovación, la baja, la zona del cliente y el mes para la gestoría
{
  empieza(); let r, r2;
  const P = Object.keys(cfg.planes)[0], PL = cfg.planes[P], REV = K.REV;
  const cli = { nombre: 'Rosa', apellidos: 'Puig', tel: '600 00 02 10', dir: 'C/ Verdi 30, 1.º 2.ª', cp: '08012' };
  es(!!PL && PL.precio > 0 && cfg.av[REV] && cfg.av[REV].interna && !N.averias.some(a => a.id === REV), 'el negocio de muestra vende un plan, y la revisión no es una avería de la web');
  es(ap({ tipo: 'contrato', plan: P, cli, acepta: 'mensaje' }, T('omar')).err === 'permiso' && ap({ tipo: 'contrato', plan: P, cli, acepta: 'mensaje' }, CLI).err === 'permiso', 'el contrato lo da de alta la oficina');
  es(ap({ tipo: 'contrato', plan: 'nada', cli, acepta: 'mensaje' }, C).err === 'plan' && ap({ tipo: 'contrato', plan: P, cli: Object.assign({}, cli, { tel: '12' }), acepta: 'mensaje' }, C).err === 'tel' && ap({ tipo: 'contrato', plan: P, cli: Object.assign({}, cli, { apellidos: '' }), acepta: 'mensaje' }, C).err === 'apellidos', 'con un plan que existe y los datos del cliente completos');
  es(ap({ tipo: 'contrato', plan: P, cli }, C).err === 'acepta' && ap({ tipo: 'contrato', plan: P, cli, acepta: 'firma' }, C).err === 'firma' && ap({ tipo: 'contrato', plan: P, cli, acepta: 'mensaje', modo: 'paypal' }, C).err === 'modo' && !S.contratos, 'el cliente tiene que decir que sí, firmando o por mensaje; y la forma de pago, de las de siempre');
  r = ap({ tipo: 'contrato', plan: P, cli, acepta: 'firma', firma: F, pide: true }, C);
  const X = () => S.contratos.find(c => c.id === r.id), hoy = K.madrid(t).date, t0 = t;
  es(r.ok && r.id === N.serie + 'M-0001' && X().e === 'activo' && X().per.length === 1 && X().per[0].de === hoy && X().per[0].a === K.masDias(K.masMeses(hoy, 12), -1) && X().per[0].precio === PL.precio && !X().per[0].pago.cobrado && X().des.pide === t && X().firma === F && X().cli.tel === '600000210',
    'alta: un año desde hoy, con su precio, pendiente de cobro, firmado y con la petición de hacer la revisión antes de los 14 días');
  es(ap({ tipo: 'contrato', plan: P, cli: Object.assign({}, cli, { dir: 'Carrer de Verdi, 30, bajos' }), acepta: 'mensaje' }, C).err === 'ya', 'el mismo cliente no tiene dos contratos a la vez en la misma finca');
  { const rp = ap({ tipo: 'contrato', plan: P, cli: Object.assign({}, cli, { tel: '600000219', dir: 'C/ Verdi 31' }), acepta: 'mensaje', pide: 'sí' }, C);
    es(rp.ok && S.contratos.find(c => c.id === rp.id).des.pide === 0, 'la petición de hacer la revisión antes de los 14 días tiene que ser un sí de verdad') }
  // los avisos del cliente: sin desplazamiento en urgencias y primero
  const u = ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({}, cli, { dir: 'C/ Verdi 30, bajos' }) }, CLI).id;
  es(A(u).con && A(u).con.id === r.id && A(u).con.desp === PL.desp && A(u).con.rev === '' && A(u).con.pri === PL.prioridad && K.gratisDe(A(u)).join() === [PL.desp, cfg.urge].filter(Boolean).join() && A(u).h[0].txt.includes(r.id), 'un aviso urgente del cliente lleva su contrato: sin desplazamiento, con prioridad, y queda dicho');
  const o1 = ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({}, cli, { tel: '600000211' }) }, CLI).id, o2 = ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({}, cli, { dir: 'C/ Verdi 40' }) }, CLI).id;
  es(!A(o1).con && !A(o2).con && K.gratisDe(A(o1)).length === 0 && K.gratisDe(null).length === 0, 'otro teléfono, u otra finca del mismo teléfono, no lo llevan');
  ap({ tipo: 'asignar', id: u, tec: 'omar' }, C);
  r2 = ap({ tipo: 'empezar', id: u, pres: { lineas: [{ k: PL.desp }, { k: 'mo', q: 1 }], firma: F } }, T('omar'));
  const ld = A(u).tot.lineas.find(l => l.k === PL.desp), sinD = K.precio(cfg, [{ k: 'mo', q: 1 }], { urg: K.tarifaDe(cfg, A(u)) }).total;
  es(r2.ok && ld.imp === 0 && ld.con === true && A(u).tot.total === sinD && A(u).tot.total === K.precio(cfg, [{ k: PL.desp }, { k: 'mo', q: 1 }], { urg: K.tarifaDe(cfg, A(u)), gratis: K.gratisDe(A(u)) }).total, 'en el presupuesto, el desplazamiento va a cero y marcado: lo mismo que calcula el técnico');
  es(ap({ tipo: 'ampliar', id: u, lineas: [{ k: PL.desp }], firma: F }, T('omar')).err === 'lineas', 'añadir otro desplazamiento no suma nada: no hay nada que firmar');
  // con cita, el desplazamiento se paga; si la cita pasa a urgencia, ya no
  const dia = K.diasDe(S, cfg, t, 3).find(d => d.franjas.some(f => f.ok)).dia, fr = K.franjasDe(S, cfg, dia, t).find(f => f.ok).id;
  const c1 = ap({ tipo: 'pedir', av: 'grifo', cli, cita: { dia, fr } }, CLI).id;
  es(A(c1).con && K.gratisDe(A(c1)).length === 0 && ap({ tipo: 'mover', id: c1, cita: null }, C).ok && K.gratisDe(A(c1)).join() === [PL.desp, cfg.urge].filter(Boolean).join(), 'con cita, el desplazamiento se paga; si pasa a urgencia, no');
  ap({ tipo: 'asignar', id: c1, tec: 'jordi' }, C);
  { const St = JSON.parse(JSON.stringify(S)); delete St.contratos;   // el aparato del técnico no tiene la lista de contratos
    es(K.aplicar(St, cfg, { tipo: 'completar', id: c1, cli: { nombre: 'Rosa María' } }, T('jordi'), t += M).ok && St.avisos.find(x => x.id === c1).con && St.avisos.find(x => x.id === c1).con.id === r.id, 'si el técnico completa los datos, el aviso sigue con su contrato aunque su aparato no tenga la lista') }
  es(ap({ tipo: 'completar', id: c1, cli: { nombre: 'Rosa María' } }, T('jordi')).ok && A(c1).cli.nombre === 'Rosa María' && A(c1).con && A(c1).con.id === r.id, 'y lo mismo en la oficina');
  // la urgencia que no acepta el precio: a cero, y sin forma de pago
  const u2 = ap({ tipo: 'pedir', av: 'fuga', cli }, CLI).id; ap({ tipo: 'asignar', id: u2, tec: 'laia' }, C);
  es(ap({ tipo: 'noacepta', id: u2 }, T('laia')).ok && A(u2).tot.total === 0 && A(u2).pago.cobrado && A(u2).pago.modo === '' && !A(u2).msgs.some(m => m.k === 'cobro') && A(u2).h[A(u2).h.length - 1].txt.includes('no se cobra nada'), 'si no acepta el precio, el desplazamiento de su urgencia no se cobra');
  es(ap({ tipo: 'facturar', id: u2 }, C).err === 'estado' && !K.porFacturar(S, t).some(x => x.id === u2), 'lo que sale a cero no se factura');
  // la revisión: la crea la oficina, va incluida con su desplazamiento, y solo las que tiene el plan
  es(ap({ tipo: 'pedir', av: REV, cli }, CLI).err === 'av' && ap({ tipo: 'pedir', av: REV, cli, origen: 'web' }, { rol: 'cliente' }).err === 'av', 'la revisión no se pide desde la web');
  const per0 = S.contratos.find(c => c.id === r.id).per[0], toca = K.tocaRevision(per0, 1, PL.revisiones), cuando = (d, k) => Date.parse(K.masDias(d, k) + 'T10:00:00Z');
  es(!K.pendientesContratos(S, cfg, t).revision.some(x => x.id === r.id) && (PL.revisiones !== 1 || toca === per0.a) && !K.pendientesContratos(S, cfg, cuando(toca, -31)).revision.some(x => x.id === r.id)
    && K.pendientesContratos(S, cfg, cuando(toca, -30)).revision.some(x => x.id === r.id && x.quedan === PL.revisiones && x.toca === toca),
    'recién dado de alta, la revisión aún no se pide: la oficina la ve desde un mes antes de que toque (con una al año, al cumplir el año)');
  const rv = ap({ tipo: 'pedir', av: REV, cli, origen: 'llamada' }, C).id;
  es(A(rv).con && A(rv).con.rev === PL.rev && K.gratisDe(A(rv)).slice().sort().join() === [PL.rev, PL.desp].sort().join() && !K.pendientesContratos(S, cfg, cuando(toca, -30)).revision.some(x => x.id === r.id), 'el aviso de la revisión lleva la revisión y el desplazamiento incluidos, y deja de faltar');
  ap({ tipo: 'asignar', id: rv, tec: 'jordi' }, C);
  es(ap({ tipo: 'empezar', id: rv, pres: { lineas: cfg.av[REV].ini, firma: F } }, T('jordi')).ok && A(rv).tot.total === 0 && A(rv).tot.lineas.every(l => l.con && l.imp === 0), 'la revisión sola sale a cero y vale como presupuesto');
  es(ap({ tipo: 'terminar', id: rv }, T('jordi')).ok && A(rv).pago.cobrado && A(rv).pago.modo === '' && A(rv).h[A(rv).h.length - 1].txt.includes('sin nada que cobrar'), 'a cero, se termina sin preguntar cómo paga');
  const R0 = K.resumen(S, cfg, t);
  es(Object.keys(R0.caja).join() === 'efectivo,tarjeta,bizum,transferencia,total' && Number.isFinite(R0.caja.total), 'la caja sigue con sus cuatro formas de pago');
  const rv2 = ap({ tipo: 'pedir', av: REV, cli, origen: 'llamada' }, C).id;
  es(A(rv2).con && A(rv2).con.rev === '' && K.gratisDe(A(rv2)).length === 0, 'otra revisión el mismo año ya no va incluida');
  es(ap({ tipo: 'cancelar', id: rv2, motivo: 'repetida' }, C).ok, 'y se puede cancelar');
  // la zona del cliente: sus contratos, sin el historial; y un cliente solo con contrato también tiene zona
  const Pf = K.perfilCliente(S, cfg, cli.tel);
  es(Pf.contratos.length === 1 && Pf.contratos[0].id === r.id && !('h' in Pf.contratos[0]) && !('v' in Pf.contratos[0]) && Pf.contratos[0].firma === F && Pf.avisos.find(a => a.id === u).con.id === r.id, 'en su zona, el cliente ve su contrato con su firma y sin el historial de la oficina');
  const solo = { nombre: 'Joan', apellidos: 'Mas', tel: '600000212', dir: 'C/ Sants 5', cp: '08014' };
  const rs = ap({ tipo: 'contrato', plan: P, cli: solo, acepta: 'mensaje', modo: 'efectivo' }, C);
  const Ps = K.perfilCliente(S, cfg, solo.tel);
  es(rs.ok && rs.id === N.serie + 'M-0003' && S.contratos.find(c => c.id === rs.id).per[0].pago.cobrado && Ps && Ps.avisos.length === 0 && Ps.contratos.length === 1 && Ps.cli.nombre === 'Joan' && Ps.fincas.length === 1, 'un cliente solo con contrato, pagado al darlo de alta, también tiene zona, con sus datos y su finca');
  es(K.perfilCliente(S, cfg, '600000299') === null, 'quien no tiene nada, no tiene zona');
  // el cobro
  es(ap({ tipo: 'cobroContrato', id: r.id, modo: 'bizum' }, T('omar')).err === 'permiso' && ap({ tipo: 'cobroContrato', id: r.id, modo: 'pendiente' }, C).err === 'modo' && ap({ tipo: 'cobroContrato', id: 'RM-9999', modo: 'bizum' }, C).err === 'contrato', 'el cobro lo apunta la oficina, con una forma de pago de verdad');
  es(K.pendientesContratos(S, cfg, t).cobrar.some(x => x.id === r.id && x.precio === PL.precio) && ap({ tipo: 'cobroContrato', id: r.id, modo: 'bizum' }, C).ok && X().per[0].pago.cobrado && !K.pendientesContratos(S, cfg, t).cobrar.some(x => x.id === r.id) && ap({ tipo: 'cobroContrato', id: r.id, modo: 'bizum' }, C).err === 'estado', 'cobrado, deja de estar pendiente; dos veces, no');
  // el mes para la gestoría y los datos para la factura
  const cu = K.cuotasMes(S, cfg, hoy.slice(0, 7)), F1 = cu.find(f => f[1] === r.id);
  const base = Math.round(PL.precio / (1 + PL.iva / 100));
  es(F1 && F1[0] === hoy && F1[7] === (base / 100).toFixed(2).replace('.', ',') && F1[8] === String(PL.iva) && F1[10] === (PL.precio / 100).toFixed(2).replace('.', ',') && F1[12] === 'Sí' && K.trabajosMes(S, cfg, hoy.slice(0, 7)).some(f => f[1] === r.id), 'la cuota sale en el mes para la gestoría, con su base y su IVA');
  const df = K.datosFacturaContrato(S, cfg, X(), t);
  es(df.includes('Contrato de mantenimiento ' + r.id) && df.includes('Total: ' + K.eur(PL.precio)) && df.includes('cobrado el') && K.datosFacturaContrato(S, cfg, null, t) === '', 'los datos para facturar la cuota');
  // la renovación: el último mes, con el sí del cliente, empalmada; sin renovar, vence
  es(ap({ tipo: 'renovar', id: r.id, acepta: true }, C).err === 'fecha', 'no se renueva hasta el último mes');
  t = Date.parse(X().per[0].a + 'T10:00:00Z') - 10 * D;
  es(K.pendientesContratos(S, cfg, t).renovar.some(x => x.id === r.id && !x.vencido), 'el último mes, la oficina ve que toca renovar');
  es(ap({ tipo: 'renovar', id: r.id }, C).err === 'acepta' && ap({ tipo: 'renovar', id: r.id, acepta: 'sí' }, C).err === 'acepta', 'solo con el sí del cliente');
  es(ap({ tipo: 'renovar', id: r.id, acepta: true }, C).ok && X().per.length === 2 && X().per[1].de === K.masDias(X().per[0].a, 1) && X().per[1].a === K.masDias(K.masMeses(X().per[1].de, 12), -1) && !X().per[1].pago.cobrado && !K.pendientesContratos(S, cfg, t).renovar.some(x => x.id === r.id), 'renovado: el año siguiente, empalmado y pendiente de cobro');
  t = Date.parse(S.contratos.find(c => c.id === rs.id).per[0].a + 'T10:00:00Z') + 5 * D;
  es(K.pendientesContratos(S, cfg, t).renovar.some(x => x.id === rs.id && x.vencido) && !K.vigente(S.contratos.find(c => c.id === rs.id), K.madrid(t).date), 'sin renovar, vence, y la oficina lo ve');
  const tarde = ap({ tipo: 'pedir', av: 'fuga', cli: solo }, CLI).id;
  es(!A(tarde).con, 'vencido, sus avisos ya no lo llevan');
  es(ap({ tipo: 'renovar', id: rs.id, acepta: true }, C).ok && S.contratos.find(c => c.id === rs.id).per[1].de === K.madrid(t).date, 'renovado después de vencer, empieza el día que se renueva');
  es(ap({ tipo: 'completar', id: tarde, cli: solo }, C).ok && A(tarde).con && A(tarde).con.id === rs.id, 'al completar los datos de un aviso sin precio, se mira otra vez el contrato');
  // la baja: cuando quiera; en sus 14 días, desiste
  es(ap({ tipo: 'bajaContrato', id: r.id }, T('omar')).err === 'permiso' && ap({ tipo: 'bajaContrato', id: r.id, motivo: { a: 1 } }, C).err === 'motivo', 'la baja la apunta la oficina');
  es(ap({ tipo: 'bajaContrato', id: r.id, motivo: 'Se muda' }, C).ok && X().e === 'baja' && X().baja.des === false && X().baja.motivo === 'Se muda' && ap({ tipo: 'bajaContrato', id: r.id }, C).err === 'estado' && ap({ tipo: 'renovar', id: r.id, acepta: true }, C).err === 'estado', 'baja después de los 14 días: sin desistir, y ya no se renueva');
  const r9 = ap({ tipo: 'contrato', plan: P, cli: Object.assign({}, solo, { tel: '600000213', dir: 'C/ Sants 9' }), acepta: 'mensaje' }, C);
  t += 3 * D;
  es(ap({ tipo: 'bajaContrato', id: r9.id }, C).ok && S.contratos.find(c => c.id === r9.id).baja.des === true, 'en sus 14 días, la baja es desistir');
  es(S.contratos.every(c => c.h.length > 0 && c.v === c.h.length), 'cada contrato lleva su historial');
  // un aviso abierto de antes del contrato pasa a llevarlo; uno con precio, no
  const pre = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Eva', apellidos: 'Gil', tel: '600000214', dir: 'C/ Sants 12', cp: '08014' } }, CLI).id;
  const pre2 = ap({ tipo: 'pedir', av: 'fuga', cli: { nombre: 'Eva', apellidos: 'Gil', tel: '600000214', dir: 'C/ Sants 12', cp: '08014' } }, CLI).id;
  ap({ tipo: 'asignar', id: pre2, tec: 'laia' }, C); es(ap({ tipo: 'empezar', id: pre2, pres: { lineas: [{ k: 'mo', q: 1 }], firma: F } }, T('laia')).ok, 'el otro aviso empieza con su precio');
  const re = ap({ tipo: 'contrato', plan: P, cli: { nombre: 'Eva', apellidos: 'Gil', tel: '600000214', dir: 'C/ Sants 12', cp: '08014' }, acepta: 'mensaje' }, C);
  es(re.ok && A(pre).con && A(pre).con.id === re.id && A(pre).h[A(pre).h.length - 1].txt.includes(re.id) && !A(pre2).con, 'al dar de alta el contrato, el aviso abierto del cliente sin precio pasa a llevarlo; el que ya tiene precio, no');
  // el técnico, en casa del cliente: desde un aviso suyo, mientras trabaja o recién acabado, y para ese teléfono
  const cT = { nombre: 'Iu', apellidos: 'Serra', tel: '600000216', dir: 'C/ Blai 4, 3.º', cp: '08004' }, avT = ap({ tipo: 'pedir', av: 'fuga', cli: cT }, CLI).id;
  ap({ tipo: 'asignar', id: avT, tec: 'jordi' }, C);
  const alT = x => Object.assign({ tipo: 'contrato', plan: P, cli: cT, acepta: 'firma', firma: F, aviso: avT }, x || {}), nT = S.contratos.length;
  es(ap(alT(), T('jordi')).err === 'estado' && ap(alT({ aviso: undefined }), T('jordi')).err === 'permiso', 'el técnico no lo da de alta antes de estar en casa del cliente, ni sin su aviso');
  es(ap({ tipo: 'empezar', id: avT, pres: { lineas: [{ k: 'mo', q: 1 }], firma: F } }, T('jordi')).ok && ap(alT(), T('omar')).err === 'permiso' && ap(alT(), CLI).err === 'permiso', 'otro técnico, o el cliente, no lo dan de alta');
  es(ap(alT({ cli: Object.assign({}, cT, { tel: '600000217' }) }), T('jordi')).err === 'telAviso' && ap(alT({ aviso: pre2 }), T('jordi')).err === 'permiso' && S.contratos.length === nT, 'el técnico solo lo da para el teléfono del cliente de su aviso, y desde un aviso suyo');
  const hT = A(avT).h.length, rT = ap(alT({ modo: 'bizum', cli: Object.assign({}, cT, { dir: 'C/ Blai 4, 3.º 1.ª' }) }), T('jordi')), XT = S.contratos.find(c => c.id === rT.id);
  es(rT.ok && XT && XT.cli.tel === '600000216' && XT.per[0].pago.cobrado && XT.per[0].pago.modo === 'bizum' && XT.h[0].q === cfg.tec.jordi.n && XT.h[0].txt.includes(avT) && A(avT).h.length === hT + 1 && A(avT).h[hT].txt.includes(rT.id) && !A(avT).con,
    'en casa del cliente, el técnico da de alta el contrato y cobra la cuota; queda apuntado en el contrato y en su aviso, y este trabajo, que ya tenía precio, sigue igual');
  es(ap(alT(), T('jordi')).err === 'ya' && ap({ tipo: 'terminar', id: avT, modo: 'efectivo', firma: F }, T('jordi')).ok, 'el mismo cliente no tiene dos, y el trabajo se acaba como siempre');
  { const avH = ap({ tipo: 'pedir', av: 'fuga', cli: Object.assign({}, cT, { tel: '600000218' }) }, CLI).id; ap({ tipo: 'asignar', id: avH, tec: 'jordi' }, C);
    ap({ tipo: 'empezar', id: avH, pres: { lineas: [{ k: 'mo', q: 1 }], firma: F } }, T('jordi')); ap({ tipo: 'terminar', id: avH, modo: 'efectivo', firma: F }, T('jordi'));
    es(ap(alT({ aviso: avH, cli: Object.assign({}, cT, { tel: '600000218' }), acepta: 'mensaje' }), T('jordi')).ok, 'recién acabado el trabajo, también') }
  es(t0 > 0, 'fin de la sección');
}

// 42. los papeles del contrato, y los de un trabajo que va en el contrato (15-11-2026)
{
  const P = globalThis.OficioPapeles, svg = () => '<svg></svg>', o = { K, N, cfg, firmaSvg: svg }, oc = { K, N: Object.assign({}, N, { email: 'avisos@ramirez.example' }), cfg, firmaSvg: svg };
  empieza();
  const PL = cfg.planes[Object.keys(cfg.planes)[0]], cli = { nombre: '<b>Rosa</b>', apellidos: 'Puig', tel: '600000230', dir: 'C/ Verdi 60', cp: '08012' };
  const r = ap({ tipo: 'contrato', plan: PL.id, cli, acepta: 'firma', firma: F, pide: true, modo: 'tarjeta' }, C);
  const X = S.contratos.find(c => c.id === r.id), alta = K.madrid(X.t).date;
  let h = P.contrato(X, o);
  es(h.includes('<h1>Contrato de mantenimiento</h1>') && h.includes('N.º ' + r.id) && h.includes(K.eur(PL.precio) + ' al año, IVA del ' + PL.iva + ' % incluido') && h.includes('No se renueva solo') && h.includes('cuando quieras, sin penalización'), 'el papel del contrato: el plan, el precio con su IVA, sin renovación automática y la baja cuando quiera');
  es(h.includes('14 días naturales desde el alta, hasta el ' + K.fechaCorta(K.masDias(alta, 14))) && h.includes('Formulario de desistimiento') && h.includes('desisto del contrato de mantenimiento ' + r.id + ', con alta el ' + K.fechaCorta(alta)) && h.includes('Pediste que la revisión se hiciera antes') && h.includes('pagas la parte proporcional'), 'el desistimiento: el plazo con su fecha, el formulario y la petición de la revisión');
  es(h.includes('Firmado el ' + K.fechaCorta(alta)) && h.includes('Cobrado el') && !h.includes('<b>Rosa</b>') && h.includes('&lt;b&gt;Rosa'), 'la firma, el cobro, y el nombre sin colarse como código');
  es(P.contrato(X, oc).includes(', correo avisos@ramirez.example:') && !h.includes(', correo '), 'el formulario lleva el correo del negocio si lo tiene');
  const r2 = ap({ tipo: 'contrato', plan: PL.id, cli: Object.assign({}, cli, { tel: '600000231', dir: 'C/ Verdi 62' }), acepta: 'mensaje' }, C);
  h = P.contrato(S.contratos.find(c => c.id === r2.id), o);
  es(h.includes('Aceptado por mensaje el') && h.includes('Pendiente de pago') && !h.includes('Pediste que la revisión'), 'aceptado por mensaje y pendiente de cobro');
  ap({ tipo: 'bajaContrato', id: r2.id }, C);
  es(P.contrato(S.contratos.find(c => c.id === r2.id), o).includes('desistiendo dentro de los 14 días'), 'de baja en sus 14 días: el papel lo dice');
  es(P.contrato(null, o) === '' && P.contrato({ per: [] }, o) === '', 'sin contrato, sin papel');
  const rv = ap({ tipo: 'pedir', av: K.REV, cli, origen: 'llamada' }, C).id; ap({ tipo: 'asignar', id: rv, tec: 'omar' }, C);
  ap({ tipo: 'empezar', id: rv, pres: { lineas: cfg.av[K.REV].ini, firma: F } }, T('omar')); ap({ tipo: 'terminar', id: rv }, T('omar'));
  const hp = P.doc(A(rv), 'presupuesto', o), hq = P.doc(A(rv), 'parte', o);
  es(hp.includes('<b>Incluido</b>') && hp.includes('va en tu contrato de mantenimiento') && hq.includes('No hay nada que pagar: va en tu contrato de mantenimiento.') && !hq.includes('Cobrado el'), 'el presupuesto dice lo que va incluido, y el parte que no hay nada que pagar');
  t = Date.parse(X.per[0].a + 'T10:00:00Z') - 5 * D; ap({ tipo: 'renovar', id: r.id, acepta: true }, C);
  es(P.contrato(S.contratos.find(c => c.id === r.id), o).includes('Años anteriores'), 'renovado, el papel lleva también los años de antes');
}

// 43. los tiempos y la urgencia como extra (15-11-2026): lo que tarda cada trabajo, cuándo llegaría cada técnico a una
//     urgencia, el suplemento de urgencia en el presupuesto de partida, el contrato que lo quita y lo que se lleva OOOX
{
  empieza(); const dis = Object.keys(cfg.zonas.dis)[0], viaje = cfg.zonas.banda[cfg.zonas.dis[dis][1]];
  const sinDur = JSON.parse(JSON.stringify(N)); sinDur.averias.forEach(a => { delete a.dur }); const c2 = K.cfgDe(sinDur);
  const dS = cfg.cat.desatasco.dur;
  es(K.durDe(cfg, 'fuga').join() === N.averias.find(a => a.id === 'fuga').dur.join() && K.durDe(c2, 'fuga').join() === '65,110' && K.durDe(c2, 'atasco').join() === [dS[0] + 10, dS[1] + 10].join() && K.durDe(cfg, 'nada').join() === '45,120',
    'lo que tarda cada trabajo: lo que dice el dueño; si no lo ha dicho, lo que tardan los servicios de su presupuesto de partida o, si no tienen tiempo, sus horas y 20 minutos más');
  es(K.durLineas(cfg, [{ k: 'grifo' }, { k: 'mo', q: 2 }, { k: 'juntas' }]) === cfg.cat.grifo.dur[0] + 120 + 10 && K.durLineas(cfg, [{ k: 'grifo', q: 2 }]) === cfg.cat.grifo.dur[0] * 2 + 10 && K.durLineas(cfg, [{ k: 'juntas' }]) === 0 && K.durLineas(cfg, null) === 0 && cfg.cat.grifo.base === 'fon-grifo-cambiar',
    'lo que tardan las líneas de un presupuesto: cada servicio lo suyo por unidad, las horas sus horas, el material nada');
  const cli = n => ({ nombre: 'Urge', apellidos: 'Prueba', tel: '6000003' + String(n).padStart(2, '0'), dir: 'C/ Prueba ' + n, cp: Object.keys(cfg.zonas.cp).find(c => cfg.zonas.cp[c] === dis) });
  const u1 = ap({ tipo: 'pedir', av: 'fuga', cli: cli(1) }, CLI).id; ap({ tipo: 'asignar', id: u1, tec: 'omar' }, C);
  const L0 = K.llegadas(S, cfg, dis, t, 'fuga'), media = Math.round((K.durDe(cfg, 'fuga')[0] + K.durDe(cfg, 'fuga')[1]) / 2);
  es(L0.length === 3 && L0[2].tec === 'omar' && L0[2].libre === viaje + media && L0[0].libre === 0 && L0[0].llega === viaje && L0.every(x => x.llega === x.libre + x.viaje && x.viaje === viaje),
    'con una urgencia en cola, Omar llega el último: antes tiene que ir a la otra y hacerla; los libres llegan en lo que se tarda hasta el barrio');
  ap({ tipo: 'voy', id: u1 }, T('omar')); t += 10 * M;
  es(K.ocupacion(S, cfg, 'omar', t) === Math.max(0, Math.round((A(u1).eta - t) / M)) + media, 'de camino: lo que le falta para llegar y el trabajo entero');
  ap({ tipo: 'empezar', id: u1, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 3 }], firma: F } }, T('omar')); t += 30 * M;
  es(K.durEst(cfg, A(u1)) === 190 && K.ocupacion(S, cfg, 'omar', t) === 190 - K.minutos(A(u1), t), 'trabajando: si el presupuesto lleva tres horas, se cuentan tres horas; le falta lo que no ha hecho');
  ap({ tipo: 'ausencia', tec: 'laia', de: K.madrid(t).date, a: K.madrid(t).date, motivo: 'médico' }, C);
  const L1 = K.llegadas(S, cfg, dis, t, 'fuga');
  es(!L1.some(x => x.tec === 'laia') && L1[0].tec === 'jordi', 'quien tiene una ausencia hoy no sale para urgencias');
  // con horarios y una cita: quien llegaría tarde a su cita, o se saldría de su hora, va al final; y el tiempo que se dice
  const NP = JSON.parse(JSON.stringify(PUB)); NP.tecnicos.forEach(x => { delete x.guardia }); const cp = K.cfgDe(NP); let SP = K.nuevo(), tp = Date.parse('2026-11-10T09:00:00Z');
  const hp = (a, q) => K.aplicar(SP, cp, a, q, tp += M), dP = Object.keys(cp.zonas.dis)[0];
  // con horarios seguidos de 8 a 20 h: Omar tiene una cita a las 15 h; Jordi, una urgencia en cola
  const NQ = JSON.parse(JSON.stringify(PUB)); NQ.tecnicos.forEach(x => { delete x.guardia; x.horario = { '2': [[480, 1200]] } }); const cq = K.cfgDe(NQ); const SQ = K.nuevo(); let tz = Date.parse('2026-11-10T09:00:00Z');
  const hq = (a, q) => K.aplicar(SQ, cq, a, q, tz += M), fr = cq.franjas.find(f => f.de === 900), cc = hq({ tipo: 'pedir', av: 'grifo', cli: cli(2), cita: { dia: K.madrid(tz).date, fr: fr.id } }, C).id;
  hq({ tipo: 'asignar', id: cc, tec: 'omar' }, C); const uj = hq({ tipo: 'pedir', av: 'fuga', cli: cli(5) }, C).id; hq({ tipo: 'asignar', id: uj, tec: 'jordi' }, C);
  const tq = Date.parse('2026-11-10T00:00:00+01:00') + (fr.de - 70) * M, Lq = K.llegadas(SQ, cq, dP, tq, 'termo'), lo = Lq.find(x => x.tec === 'omar'), lj = Lq.find(x => x.tec === 'jordi');
  es(!lo.choca && Lq.indexOf(lo) < Lq.indexOf(lj) && !lj.fuera, 'Omar tiene una cita esta tarde, pero con la urgencia aún llegaría dentro de su franja (el cliente la sabe): puede ir, y antes que Jordi, que tiene otra en cola');
  const tq2 = Date.parse('2026-11-10T00:00:00+01:00') + (fr.a - 60) * M, Lq2 = K.llegadas(SQ, cq, dP, tq2, 'termo'), lo2 = Lq2.find(x => x.tec === 'omar');
  es(lo2.choca === cc && Lq2[0].tec === 'laia' && !Lq2[0].choca && Lq2.indexOf(lo2) > 0, 'a una hora de que acabe la franja de su cita, con la urgencia ya no llegaría a tiempo: va detrás de quien sí puede');
  const tf = Date.parse('2026-11-10T00:00:00+01:00') + (NP.tecnicos.find(x => x.id === 'jordi').horario['2'][1][1] - 30) * M, Lf = K.llegadas(SP, cp, dP, tf, 'fuga');
  es(Lf.find(x => x.tec === 'jordi').fuera === true && Lf.find(x => x.tec === 'omar').fuera === false, 'a media hora de salir, Jordi acabaría fuera de su horario; Omar, que sale más tarde, no');
  const noche = Date.parse('2026-11-10T22:30:00+01:00');
  es(K.urgenciaAhora(SP, cp, dP, noche, 'fuga') === null && K.llegadas(SP, cp, dP, noche, 'fuga').every(x => x.fuera), 'de noche, sin nadie de guardia, no se promete ningún tiempo');
  const NG = JSON.parse(JSON.stringify(PUB)), cg = K.cfgDe(NG), ug = K.urgenciaAhora(K.nuevo(), cg, dP, noche, 'fuga');
  es(ug && ug.de % 5 === 0 && ug.de >= 10 && ug.a === ug.de + 15 && ug.de >= cg.zonas.banda[cg.zonas.dis[dP][1]], 'con técnicos de guardia, sí: un tiempo de cinco en cinco, de «tanto» a «tanto más un cuarto de hora»');
  const ua = K.urgenciaAhora(S, cfg, dis, t, 'fuga');
  es(ua && ua.tec === 'jordi' && ua.de === Math.ceil(Math.max(viaje, 10) / 5) * 5, 'lo que se le dice a quien pide una urgencia sale del que antes llega');
  { const SR = K.nuevo(); let tr = MAR; const hr = (a, q) => K.aplicar(SR, cfg, a, q, tr += M);   // todos ocupados: el tiempo, redondeado a cinco minutos
    ['omar', 'laia', 'jordi'].forEach((x, i) => { const id = hr({ tipo: 'pedir', av: 'fuga', cli: cli(10 + i) }, C).id; hr({ tipo: 'asignar', id, tec: x }, C); hr({ tipo: 'voy', id }, T(x)); hr({ tipo: 'empezar', id, pres: { lineas: [{ k: 'mo', q: 1 + i }], firma: F } }, T(x)) });
    tr += 7 * M; const ur = K.urgenciaAhora(SR, cfg, dis, tr, 'fuga'), L = K.llegadas(SR, cfg, dis, tr, 'fuga');
    es(L[0].llega % 5 !== 0 && ur.de === Math.ceil(L[0].llega / 5) * 5 && ur.de > L[0].llega && L[0].tec === 'omar', 'con todos trabajando, sale el que antes acaba, y el tiempo se redondea hacia arriba a cinco minutos') }
  // el suplemento de urgencia: en el presupuesto de partida de una urgencia, no en una cita ni en una revisión
  es(cfg.urge === N.tarifa.urgente && K.iniDe(cfg, A(u1))[0].k === cfg.urge && K.iniDe(cfg, SQ.avisos.find(a => a.id === cc)).every(l => l.k !== cfg.urge)
    && K.iniDe(cfg, { av: K.REV }).every(l => l.k !== cfg.urge) && K.iniDe(c2, A(u1)).length === N.averias.find(a => a.id === 'fuga').ini.length + 1 && K.iniDe(Object.assign({}, cfg, { urge: '' }), A(u1)).every(l => l.k !== cfg.urge),
    'el suplemento va solo en el presupuesto de partida de una urgencia: no en una cita, ni en una revisión, ni si el negocio no lo tiene');
  const p1 = K.precio(cfg, K.iniDe(cfg, A(u1)), { urg: false }), p0 = K.precio(cfg, N.averias.find(a => a.id === 'fuga').ini, { urg: false });
  es(p1.total === p0.total + cfg.cat[cfg.urge].p10, 'con el suplemento, la urgencia cuesta lo que dice el negocio más (con el IVA de la vivienda)');
  // con contrato, la urgencia va sin suplemento
  const Pl = Object.keys(cfg.planes)[0], ct = ap({ tipo: 'contrato', plan: Pl, cli: cli(3), acepta: 'mensaje' }, C), u3 = ap({ tipo: 'pedir', av: 'fuga', cli: cli(3) }, CLI).id;
  es(ct.ok && A(u3).con && A(u3).con.urge === cfg.urge && K.gratisDe(A(u3)).includes(cfg.urge) && K.precio(cfg, K.iniDe(cfg, A(u3)), { gratis: K.gratisDe(A(u3)) }).lineas.find(l => l.k === cfg.urge).imp === 0,
    'con contrato de mantenimiento, la urgencia va sin suplemento: sale «incluido»');
  // lo que se lleva OOOX: solo de los suplementos cobrados, sin IVA, por el mes del cobro
  ap({ tipo: 'terminar', id: u1, modo: 'tarjeta', firma: F }, T('omar'));
  const mes = K.madrid(t).date.slice(0, 7), um0 = K.urgenciasMes(S, cfg, mes);
  es(um0.n === 0 && um0.base === 0, 'un presupuesto sin la línea del suplemento no cuenta');
  ap({ tipo: 'asignar', id: u3, tec: 'jordi' }, C); ap({ tipo: 'voy', id: u3 }, T('jordi'));
  ap({ tipo: 'empezar', id: u3, pres: { lineas: K.iniDe(cfg, A(u3)), firma: F } }, T('jordi')); ap({ tipo: 'terminar', id: u3, modo: 'efectivo', firma: F }, T('jordi'));
  const u4 = ap({ tipo: 'pedir', av: 'grifo', cli: cli(4) }, CLI).id; ap({ tipo: 'asignar', id: u4, tec: 'jordi' }, C); ap({ tipo: 'voy', id: u4 }, T('jordi'));
  ap({ tipo: 'empezar', id: u4, pres: { lineas: K.iniDe(cfg, A(u4)), firma: F } }, T('jordi')); ap({ tipo: 'terminar', id: u4, modo: 'pendiente', firma: F }, T('jordi'));
  const um1 = K.urgenciasMes(S, cfg, mes); ap({ tipo: 'cobrar', id: u4, modo: 'bizum' }, C); const um2 = K.urgenciasMes(S, cfg, mes);
  const imp = A(u4).tot.lineas.find(l => l.k === cfg.urge).imp, b = Math.round(imp / (1 + A(u4).tot.tipo / 100));
  es(um1.n === 0 && um2.n === 1 && um2.base === b && um2.oox === Math.round(b * K.COMISION_URG) && K.urgenciasMes(S, cfg, '2026-01').n === 0 && K.urgenciasMes(S, Object.assign({}, cfg, { urge: '' }), mes).n === 0,
    'la parte de OOOX: solo del suplemento que se ha cobrado (el del contrato va incluido y no cuenta), sin IVA, y en el mes del cobro');
  { const SB = K.nuevo(); let tb = MAR; const hb = (a, q) => K.aplicar(SB, cfg, a, q, tb += M);   // a igual tiempo, el que menos trabajos lleva hoy
    const x = hb({ tipo: 'pedir', av: 'grifo', cli: cli(20) }, C).id; hb({ tipo: 'asignar', id: x, tec: 'jordi' }, C); hb({ tipo: 'voy', id: x }, T('jordi'));
    hb({ tipo: 'empezar', id: x, pres: { lineas: [{ k: 'grifo' }], firma: F } }, T('jordi')); hb({ tipo: 'terminar', id: x, modo: 'efectivo', firma: F }, T('jordi'));
    const L = K.llegadas(SB, cfg, dis, tb, 'fuga');
    es(L[0].llega === L[1].llega && L[0].tec === 'laia' && L.find(y => y.tec === 'jordi').hoy === 1, 'a igual tiempo, va antes quien menos trabajos lleva hoy: así se reparte') }
}

// 44. el día de cada técnico (15-11-2026): a qué hora llega a cada trabajo y a qué hora acaba, sus ratos libres y si
//     se saldría de su hora. Es lo que pinta el tablero del día de la centralita
{
  const NA = JSON.parse(JSON.stringify(PUB)); NA.citas = { porFranja: 5, reserva: 0 }; const ca = K.cfgDe(NA);
  const SA = K.nuevo(); let ta = Date.parse('2026-11-09T09:00:00Z');   // el lunes se piden citas para el martes
  const ha = (a, q) => K.aplicar(SA, ca, a, q, ta += M), dia = '2026-11-10', d0 = Object.keys(ca.zonas.dis)[0], v = K.etaMin(ca, d0);
  const cl = n => ({ nombre: 'Día', apellidos: 'Prueba', tel: '6000004' + String(n).padStart(2, '0'), dir: 'C/ Día ' + n, cp: Object.keys(ca.zonas.cp).find(c => ca.zonas.cp[c] === d0) });
  const f = id => ca.franjas.find(x => x.id === id), g = id => SA.avisos.find(a => a.id === id), de = id => K.durEst(ca, g(id));
  const cita = (n, av, fr, tec) => { const r = ha({ tipo: 'pedir', av, cli: cl(n), cita: { dia, fr } }, C); if (tec) ha({ tipo: 'asignar', id: r.id, tec }, C); return r.id };
  const a1 = cita(1, 'grifo', 'f1', 'omar'), a2 = cita(2, 'fuga', 'f1', 'omar'), a3 = cita(3, 'termo', 'f2', 'omar'), x1 = cita(4, 'grifo', 'f1', 'laia');
  let L = K.agendaDe(SA, ca, 'omar', dia);
  const i1 = L.find(x => x.id === a1), i2 = L.find(x => x.id === a2), i3 = L.find(x => x.id === a3);
  es(L.length === 3 && i1.llega === f('f1').de && i1.acaba === f('f1').de + de(a1) && i2.llega === i1.acaba + v && i2.acaba === i2.llega + de(a2) && i2.viaje === v
    && i3.llega === Math.max(f('f2').de, i2.acaba + v) && !L.some(x => x.tarde || x.hecho || x.urg) && L.every(x => x.fr === g(x.id).cita.fr),
    'las citas de un técnico, en el orden de sus franjas y de lo que se pidió antes: a la primera llega al empezar la franja; a cada una, cuando acaba la anterior y hace el camino');
  const a4 = cita(5, 'termo', 'f1', 'omar'), a5 = cita(6, 'fuga', 'f1', 'omar'); L = K.agendaDe(SA, ca, 'omar', dia);
  const i4 = L.find(x => x.id === a4), i5 = L.find(x => x.id === a5), j3 = L.find(x => x.id === a3);
  es(i4.llega === i2.acaba + v && i5.llega === i4.acaba + v && i5.tarde === true && j3.llega === Math.max(f('f2').de, i5.acaba + v) && j3.llega > i3.llega,
    'una cita más en la misma franja va detrás de las que ya tenía y empuja las de la franja siguiente; si ya no le da tiempo a llegar dentro de su franja, sale «tarde»');
  const ex = { id: 'nueva', av: 'grifo', cli: { dis: d0 }, cita: { dia, fr: 'f2' } }, Lx = K.agendaDe(SA, ca, 'omar', dia, null, ex), ix = Lx.find(x => x.id === 'nueva');
  es(Lx.length === L.length + 1 && ix.llega === Lx.find(x => x.id === a3).acaba + v && L.every(y => Lx.find(x => x.id === y.id).llega === y.llega),
    'una cita que se está pidiendo va la última de su franja: no mueve las que ya había');
  const Lm = K.agendaDe(SA, ca, 'omar', dia, null, Object.assign({}, g(a2), { cita: { dia, fr: 'f2' } }));
  es(Lm.filter(x => x.id === a2).length === 1 && Lm.find(x => x.id === a2).fr === 'f2' && Lm.find(x => x.id === a4).llega === i1.acaba + v && Lm.find(x => x.id === a3).llega === Lm.find(x => x.id === a2).acaba + v,
    'para cambiar una cita de franja se mira como si ya estuviera en la nueva: deja su sitio en la de antes y, en la nueva, va por la hora a la que se pidió (antes que la que se pidió después)');
  es(ha({ tipo: 'cancelar', id: a5, motivo: 'Ya no hace falta' }, C).ok && !K.agendaDe(SA, ca, 'omar', dia).some(x => x.id === a5) && K.agendaDe(SA, ca, 'omar', '2026-11-11').length === 0
    && K.agendaDe(SA, ca, 'laia', dia).map(x => x.id).join() === x1, 'no cuentan las citas canceladas, las de otro día ni las de otro técnico');
  // hoy, desde ahora: lo hecho va donde pasó; el trabajo de ahora sigue hasta que se espera que acabe; detrás, la cola y las citas
  ta = Date.parse('2026-11-10T08:00:00Z');   // martes, 9:00 en Madrid
  const u0 = ha({ tipo: 'pedir', av: 'grifo', cli: cl(10) }, C).id; ha({ tipo: 'asignar', id: u0, tec: 'jordi' }, C); ha({ tipo: 'voy', id: u0 }, T('jordi'));
  ha({ tipo: 'empezar', id: u0, pres: { lineas: [{ k: 'grifo' }], firma: F } }, T('jordi')); ta += 40 * M; ha({ tipo: 'terminar', id: u0, modo: 'efectivo', firma: F }, T('jordi'));
  const u1 = ha({ tipo: 'pedir', av: 'fuga', cli: cl(11) }, C).id; ha({ tipo: 'asignar', id: u1, tec: 'jordi' }, C); ha({ tipo: 'voy', id: u1 }, T('jordi'));
  ta += 20 * M; ha({ tipo: 'empezar', id: u1, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F } }, T('jordi'));
  const u2 = ha({ tipo: 'pedir', av: 'grifo', cli: cl(12) }, C).id; ha({ tipo: 'asignar', id: u2, tec: 'jordi' }, C); const c9 = cita(13, 'grifo', 'f3', 'jordi');
  const tN = ta + 15 * M, n = K.madrid(tN), LJ = K.agendaDe(SA, ca, 'jordi', dia, tN), h = id => LJ.find(x => x.id === id);
  es(h(u0).hecho && h(u0).llega === K.madrid(g(u0).ini).min && h(u0).acaba === K.madrid(g(u0).fin).min, 'hoy, lo ya hecho va a la hora en que pasó');
  es(!h(u1).hecho && h(u1).urg && h(u1).acaba === n.min + Math.max(5, K.durEst(ca, g(u1)) - K.minutos(g(u1), tN)), 'el trabajo de ahora sigue hasta que se espera que acabe');
  es(h(u2).llega === h(u1).acaba + v && h(u2).acaba === h(u2).llega + K.durEst(ca, g(u2)) && h(c9).llega === Math.max(f('f3').de, h(u2).acaba + v) && !h(c9).tarde && LJ.length === 4,
    'detrás, la urgencia que tiene en cola con su camino, y después sus citas de hoy');
  es(K.agendaDe(SA, ca, 'jordi', dia).map(x => x.id).join() === c9, 'sin la hora de ahora, solo el plan de sus citas');
  { const tX = Date.parse('2026-11-10T00:00:00+01:00') + 650 * M;   // a las 10:50, Omar ya no llega a sus citas de la mañana: eso no es por la urgencia
    es(K.agendaDe(SA, ca, 'omar', dia, tX).some(x => x.tarde) && K.chocaUrg(SA, ca, 'omar', tX, d0, 'grifo') === '', 'si una cita ya iba tarde sin la urgencia, la urgencia no es lo que la deja tirada') }
  // sus horas de trabajo y sus ratos libres
  es(JSON.stringify(K.turnosDe(ca, 'omar', dia)) === JSON.stringify(NA.tecnicos.find(x => x.id === 'omar').horario['2']) && K.turnosDe(ca, 'omar', '2026-11-15').length === 0,
    'sus horas de trabajo de ese día salen de su horario; un domingo, ninguna');
  const NS = JSON.parse(JSON.stringify(PUB)); NS.tecnicos.forEach(x => { delete x.horario }); delete NS.horario; const cs = K.cfgDe(NS);
  es(JSON.stringify(K.turnosDe(cs, 'omar', dia)) === JSON.stringify([[Math.min(...cs.franjas.map(x => x.de)), Math.max(...cs.franjas.map(x => x.a))]]), 'sin horarios, de la primera franja a la última');
  const Lz = [{ llega: 500, acaba: 560, viaje: 20 }, { llega: 570, acaba: 600, viaje: 5 }, { llega: 800, acaba: 870, viaje: 20 }], Z = K.libresDe(ca, 'laia', dia, Lz);
  es(JSON.stringify(Z.libres) === JSON.stringify([{ de: 600, a: 780 }, { de: 900, a: 1200 }]) && Z.sale === 870,
    'sus ratos libres: sus horas menos sus trabajos, con el camino; los de menos de un cuarto de hora no cuentan; y si un trabajo acaba después de su hora (aquí, la de comer), a qué hora');
  es(K.libresDe(ca, 'laia', dia, Lz, 700).libres[0].de === 700 && K.libresDe(ca, 'laia', dia, [{ llega: 820, acaba: 860, viaje: 0, hecho: true }, { llega: 1100, acaba: 1190, viaje: 10 }]).sale === 0
    && K.libresDe(ca, 'laia', dia, [{ llega: 1150, acaba: 1230, viaje: 10 }]).sale === 1230, 'desde la hora de ahora; lo ya hecho no cuenta para salirse de la hora; acabar después de la hora de salir, sí');
  es(JSON.stringify(K.libresDe(ca, 'laia', dia, K.agendaDe(SA, ca, 'laia', dia)).libres) === JSON.stringify([{ de: f('f1').de + de(x1), a: 840 }, { de: 900, a: 1200 }]), 'con una cita a primera hora, libre desde que acaba hasta la hora de comer, y toda la tarde');
}

// 45. las citas por lo que tarda cada trabajo (15-11-2026): con citas.porTiempo, cabe una cita más si alguien llega a ella
//     dentro de su franja sin llegar tarde a otra; se guarda gente para urgencias; y lo que sobra si alguien falta
{
  const NT = JSON.parse(JSON.stringify(PUB)); NT.citas = { porFranja: 3, reserva: 1, porTiempo: true }; const ct = K.cfgDe(NT);
  const NS = JSON.parse(JSON.stringify(NT)); NS.tecnicos.forEach(x => { delete x.horario }); delete NS.horario;
  es(ct.porTiempo === true && K.cfgDe(NS).porTiempo === false && K.cfgDe(PUB).porTiempo === false, 'las citas por tiempo, solo si el negocio lo pide y tiene horarios');
  const d0 = Object.keys(ct.zonas.dis)[0], dia = '2026-11-11', cp0 = Object.keys(ct.zonas.cp).find(c => ct.zonas.cp[c] === d0);
  const X = av => ({ av, cli: { dis: d0 } }), F = (S, av, c) => K.franjasDe(S, c || ct, dia, MAR, null, X(av)), fr = (L, id) => L.find(f => f.id === id);
  const S0 = K.nuevo(), g = fr(F(S0, 'grifo'), 'f1'), te = fr(F(S0, 'termo'), 'f1'), g4 = fr(F(S0, 'grifo'), 'f4'), t4 = fr(F(S0, 'termo'), 'f4');
  es(g.tope === 9 && g.libres === 6 && te.tope === 6 && te.libres === 4, 'en una mañana libre de tres horas caben tres grifos por técnico, pero solo dos termos; al cliente se le guarda un técnico para urgencias');
  es(g4.tope === 4 && g4.libres === 2 && t4.tope === 2 && t4.libres === 1, 'en la última franja, de dos horas y con dos técnicos: dos grifos por técnico, un termo');
  const N2 = JSON.parse(JSON.stringify(NT)); N2.citas.porFranja = 2;
  es(fr(F(S0, 'grifo', K.cfgDe(N2)), 'f1').tope === 6 && fr(F(S0, 'fuga'), 'f2').tope === 6, 'el máximo de citas por técnico y franja sigue valiendo; y dos fugas en una franja caben aunque la segunda acabe unos minutos después de su hora');
  // dos grifos pedidos por clientes en la primera franja: se juntan en el mismo técnico, y los demás quedan libres
  const SB = K.nuevo(); let tb = MAR; const hb = (a, q) => K.aplicar(SB, ct, a, q, tb += M);
  const cl = n => ({ nombre: 'Tiempo', apellidos: 'Prueba', tel: '6000005' + String(n).padStart(2, '0'), dir: 'C/ Tiempo ' + n, cp: cp0 });
  const pide = (n, av, f, q) => hb({ tipo: 'pedir', av, cli: cl(n), cita: { dia, fr: f } }, q || CLI);
  const r1 = pide(1, 'grifo', 'f1'), r2 = pide(2, 'grifo', 'f1'), R1 = K.repartoDia(SB, ct, dia), ta = R1.S.avisos.map(a => a.tec);
  es(r1.ok && r2.ok && ta.length === 2 && ta[0] && ta[0] === ta[1] && !R1.fuera.length && SB.avisos.every(a => !a.tec), 'dos citas sin técnico en la misma franja se juntan, sobre el papel, en el mismo técnico: así quedan libres los demás');
  const g1 = fr(K.franjasDe(SB, ct, dia, tb, null, X('grifo')), 'f1');
  es(g1.tope === 9 && g1.libres === 4, 'y caben siete más: una en ese técnico y tres en cada uno de los otros dos; al cliente, guardando uno, cuatro');
  // la última franja: dos grifos de clientes llenan lo que se ofrece; el tercero ya no se le ofrece al cliente, la oficina sí puede
  const r3 = pide(3, 'grifo', 'f4'), r4 = pide(4, 'grifo', 'f4'), r5 = pide(5, 'grifo', 'f4'), r6 = pide(6, 'grifo', 'f4', C), f4 = fr(K.franjasDe(SB, ct, dia, tb, null, X('grifo')), 'f4');
  es(r3.ok && r4.ok && r5.err === 'franja' && r6.ok && f4.libres === 0 && f4.libresOf === 1 && f4.por === 'reserva', 'en la última franja, el tercer grifo ya no se le ofrece al cliente (se guarda un técnico para urgencias); la oficina sí puede ponerlo');
  const ft = fr(K.franjasDe(SB, ct, dia, tb, null, X('termo')), 'f4');
  es(ft.libresOf === 0, 'en el hueco que queda en la última franja cabe un grifo, pero no un termo: acabaría mucho después de su hora');
  const rc = hb({ tipo: 'mover', id: r1.id, cita: { dia, fr: 'f4' } }, C);
  es(rc.ok, 'cambiar de franja una cita mira lo que tarda ese trabajo: un grifo sí cabe en ese hueco');
  // cambiar de franja una cita que ya tiene técnico: si con ella su día ya no cuadra, se queda sin técnico (visto con la demo en uso, 15-11-2026)
  { const SM = K.nuevo(); let tm = MAR; const hm = (a, q) => K.aplicar(SM, ct, a, q, tm += M);
    const vieja = hm({ tipo: 'pedir', av: 'atasco', cli: cl(40), cita: { dia, fr: 'f1' } }, C).id; hm({ tipo: 'asignar', id: vieja, tec: 'jordi' }, C);
    const dos = ['termo', 'cisterna'].map((av, i) => { const id = hm({ tipo: 'pedir', av, cli: cl(41 + i), cita: { dia, fr: 'f2' } }, C).id; hm({ tipo: 'asignar', id, tec: 'jordi' }, C); return id });
    const tarde0 = K.agendaDe(SM, ct, 'jordi', dia).filter(x => x.tarde).length, rm = hm({ tipo: 'mover', id: vieja, cita: { dia, fr: 'f2' } }, C), V = SM.avisos.find(a => a.id === vieja);
    es(dos.every(id => SM.avisos.find(a => a.id === id).tec === 'jordi') && tarde0 === 0 && rm.ok && !V.tec && V.e === 'nuevo' && !K.agendaDe(SM, ct, 'jordi', dia).some(x => x.tarde),
      'una cita de Jordi pedida antes, pasada a una franja donde ya tiene dos: iría la primera y él ya no llegaría a las otras, así que se queda sin técnico') }
  // por tiempo, a un técnico ya no se le puede dar un trabajo al que no llegaría
  const SC = K.nuevo(); let tc = MAR; const hc = (a, q) => K.aplicar(SC, ct, a, q, tc += M);
  const ids = ['termo', 'termo', 'grifo'].map((av, i) => hc({ tipo: 'pedir', av, cli: cl(20 + i), cita: { dia, fr: 'f1' } }, C).id), as = ids.map(id => hc({ tipo: 'asignar', id, tec: 'omar' }, C));
  es(as[0].ok && as[1].ok && as[2].err === 'lleno' && K.puedeIr(SC, ct, SC.avisos.find(a => a.id === ids[2]), 'laia', tc) === '', 'con dos termos en su mañana, a un tercer trabajo ya no llegaría a tiempo: «lleno», aunque el máximo sea tres; a otro técnico sí se le puede dar');
  // si alguien falta, sus citas vuelven sin técnico; las que ya no le caben a nadie, sobran
  const SD = K.nuevo(); let td = MAR; const hd = (a, q) => K.aplicar(SD, ct, a, q, td += M);
  [['omar', 30], ['omar', 31], ['laia', 32], ['laia', 33]].forEach(([tec, n]) => { const id = hd({ tipo: 'pedir', av: 'grifo', cli: cl(n), cita: { dia, fr: 'f4' } }, C).id; hd({ tipo: 'asignar', id, tec }, C) });
  es(K.sobran(SD, ct, td).length === 0 && SD.avisos.every(a => a.tec), 'cuatro grifos en la última franja, dos para cada uno: no sobra nada');
  hd({ tipo: 'ausencia', tec: 'laia', de: dia, a: dia, motivo: 'médico' }, C);
  const so = K.sobran(SD, ct, td);
  es(so.length === 1 && so[0].dia === dia && so[0].fr === 'f4' && so[0].sobran === 2 && K.resumen(SD, ct, td).sobran.length === 1, 'si Laia falta ese día, sus dos citas no le caben a Omar (ya tiene dos y no llegaría): sobran dos, y la oficina lo ve');
}

// 46. lo decidido el 15-11-2026 por la noche: la revisión del contrato se pide desde un mes antes de que toque; la reserva
//     para urgencias, los días que falta alguien, la decide el dueño; y la visita en la que no había nadie queda apuntada
{
  const p = { de: '2026-01-01', a: '2026-12-31' };
  es(K.tocaRevision(p, 1, 2) === K.masDias('2026-01-01', 182) && K.tocaRevision(p, 2, 2) === '2026-12-31' && K.tocaRevision(p, 1, 1) === '2026-12-31',
    'con dos revisiones al año, la primera toca a mitad del periodo y la segunda al final; con una, al final');
  const NT = JSON.parse(JSON.stringify(PUB)); NT.citas = { porFranja: 3, reserva: 1, porTiempo: true }; const ct = K.cfgDe(NT);
  const NF = JSON.parse(JSON.stringify(NT)); NF.citas.reservaSiFalta = false; const cf = K.cfgDe(NF);
  const dia = '2026-11-11', d0 = Object.keys(ct.zonas.dis)[0], X = { av: 'grifo', cli: { dis: d0 } }, f1 = (S, c) => K.franjasDe(S, c, dia, MAR, null, X).find(f => f.id === 'f1');
  const SA = K.nuevo(), ra = K.aplicar(SA, ct, { tipo: 'ausencia', tec: 'laia', de: dia, a: dia, motivo: 'médico' }, C, MAR);
  es(ra.ok && ct.reservaSiFalta === true && cf.reservaSiFalta === false && K.reservaDe(SA, ct, dia) === 1 && K.reservaDe(SA, cf, dia) === 0 && K.reservaDe(SA, cf, '2026-11-12') === 1,
    'la reserva para urgencias se guarda también los días que falta alguien; si el dueño dice que no, esos días no se guarda a nadie (y los demás días, sí)');
  es(f1(SA, ct).tope === 6 && f1(SA, ct).libres === 3 && f1(SA, cf).tope === 6 && f1(SA, cf).libres === 6,
    'con Laia de médico trabajan dos: guardando uno, el cliente puede pedir tres grifos esa mañana; si el dueño no guarda a nadie esos días, seis');
  { const NN = JSON.parse(JSON.stringify(PUB)); NN.citas = { porFranja: 1, reserva: 1 }; const cn = K.cfgDe(NN), NN2 = JSON.parse(JSON.stringify(NN)); NN2.citas.reservaSiFalta = false;
    const cn2 = K.cfgDe(NN2), fA = cn.franjas[0], tot = K.capacidadTotal(SA, cn, dia, fA);
    es(cn.conHorario && tot === 2 && K.capacidad(SA, cn, dia, fA) === 1 && K.capacidad(SA, cn2, dia, fA) === 2 && K.capacidad(K.nuevo(), cn2, dia, fA) === 2,
      'también con las citas por número: ese día trabajan dos y se guarda uno; si el dueño dice que no, ninguno (y sin nadie de baja, se guarda uno de los tres)') }
  { const NL = JSON.parse(JSON.stringify(NF)), x = NL.tecnicos.find(t => t.id === 'laia'), w = String(new Date(dia + 'T12:00:00Z').getUTCDay());
    if (x.horario) delete x.horario[w]; else x.horario = Object.fromEntries(Object.entries(NL.horario || {}).filter(([k]) => k !== w));
    es(K.turnosDe(K.cfgDe(NL), 'laia', dia).length === 0 && K.reservaDe(SA, K.cfgDe(NL), dia) === 1, 'una ausencia el día que a ese técnico no le toca trabajar no cuenta como que falta alguien') }
  // la visita en la que no había nadie: queda apuntado quién fue y de cuándo a cuándo, y sale en su día aunque luego se dé otra cita
  const SV = K.nuevo(); let tv = MAR; const hv = (a, q) => K.aplicar(SV, ct, a, q, tv += 5 * M);
  const cli = { nombre: 'Nadie', apellidos: 'Encasa', tel: '600000470', dir: 'C/ Vacía 1, 2.º', cp: Object.keys(ct.zonas.cp).find(c => ct.zonas.cp[c] === d0) };
  const id = hv({ tipo: 'pedir', av: 'grifo', cli, cita: { dia, fr: 'f1' } }, C).id; hv({ tipo: 'asignar', id, tec: 'omar' }, C);
  tv = Date.parse(dia + 'T08:10:00Z'); const rv = hv({ tipo: 'voy', id }, T('omar')); tv += 25 * M; const rn = hv({ tipo: 'ausente', id }, T('omar')), V = SV.avisos.find(a => a.id === id);
  es(rv.ok && rn.ok && V.vis.length === 1 && V.vis[0].tec === 'omar' && V.vis[0].de === V.sal && V.vis[0].a === V.aus && V.vis[0].a - V.vis[0].de === 30 * M, 'si no había nadie, queda apuntado quién fue y de cuándo a cuándo');
  const L1 = K.agendaDe(SV, ct, 'omar', dia, tv).filter(x => x.nadie);
  es(L1.length === 1 && L1[0].id === id && L1[0].hecho && L1[0].llega === K.madrid(V.sal).min && L1[0].acaba === K.madrid(V.aus).min, 'en el día de Omar, ese rato sale como hecho y marcado «no había nadie»');
  const rm = hv({ tipo: 'mover', id, cita: { dia: '2026-11-12', fr: 'f1' } }, C);
  es(rm.ok && V.vis.length === 1 && !V.msgs.some(m => m.k === 'ausente') && K.agendaDe(SV, ct, 'omar', dia, tv).some(x => x.nadie && x.id === id) && !K.agendaDe(SV, ct, 'laia', dia, tv).some(x => x.nadie),
    'con la cita nueva, la visita sigue en el día de quien fue (y solo en el suyo), y el mensaje sin mandar se cambia por el de la cita');
  const Pf = K.perfilCliente(SV, ct, cli.tel);
  es(!('vis' in K.vistaCliente(SV, ct, id)) && Pf && !('vis' in Pf.avisos[0]), 'el cliente no ve ese apunte interno');
}

// 47. los mensajes de después del trabajo (15-11-2026, noche): la reseña a las dos horas, el seguimiento a la semana, el
//     presupuesto que no se aceptó a los tres días y, si el cliente dice que sí, el aviso cuando toque volver. La oficina
//     puede dejarlos sin mandar, caducan solos y no van a quien dijo que no los quiere
{
  const SG = K.nuevo(); let tg = MAR; const hg = (a, q) => K.aplicar(SG, cfg, a, q, tg += M), G = id => SG.avisos.find(a => a.id === id);
  const cliG = (tel, nombre) => Object.assign({}, montse, { tel, nombre: nombre || 'Montse' });
  const trabajo = (tel, lineas, extra, av) => { const id = hg({ tipo: 'pedir', av: av || 'fuga', cli: cliG(tel), origen: 'llamada' }, C).id; hg({ tipo: 'asignar', id, tec: 'jordi' }, C); hg({ tipo: 'voy', id }, T('jordi'));
    hg({ tipo: 'empezar', id, pres: { lineas, firma: F, pide: true } }, T('jordi')); const r = hg(Object.assign({ tipo: 'terminar', id, modo: 'tarjeta' }, extra || {}), T('jordi')); return { id, r } };
  const { id: g1, r: rg1 } = trabajo('600000501', [{ k: 'desp' }, { k: 'mo', q: 1 }]), A1 = G(g1), m1 = k => A1.msgs.find(m => m.k === k);
  es(rg1.ok && m1('resena').t === A1.fin + 2 * H && m1('resena').hasta === A1.fin + 7 * D && m1('seguimiento').t === A1.fin + 7 * D && m1('seguimiento').hasta === A1.fin + 25 * D && !m1('proxima'),
    'al terminar: la reseña a las dos horas (vale una semana) y el seguimiento a la semana (vale hasta el día 25, dentro de los 30 de la reseña)');
  const pm = (t0, id) => K.porMandar(SG, t0).filter(x => x.a.id === (id || g1)).map(x => x.m.k).filter(k => K.SEGUIR.includes(k));
  es(pm(A1.fin + H).length === 0 && pm(A1.fin + 2 * H).join() === 'resena' && pm(A1.fin + 7 * D).join() === 'resena,seguimiento' && pm(A1.fin + 7 * D + M).join() === 'seguimiento' && pm(A1.fin + 26 * D).length === 0,
    'por mandar: nada la primera hora; la reseña a las dos horas; a la semana, el seguimiento, y la reseña hasta ese mismo minuto; a los 26 días, nada');
  const ts = K.mensaje(cfg, A1, 'seguimiento');
  es(ts.startsWith('Hola, Montse. Hace una semana del arreglo (fuga de agua). ¿Sigue todo bien?') && ts.includes('garantía hasta el ' + K.fechaCorta(A1.gar.hasta)) && ts.includes('Si aún no has podido, tu opinión en Google nos ayuda mucho:\n' + N.resenas) && !/si (todo|lo) ha ido bien|content[oa]|cinco estrellas/i.test(ts) && ts.includes('puedes pasarle este número') && ts.includes('Si prefieres que no te escribamos para esto, dínoslo.') && ts.endsWith(N.nombre + '.'),
    'el seguimiento pregunta si sigue bien, recuerda la garantía, pide la reseña a todos por igual, deja recomendar y dice cómo dejar de recibirlos');
  es(['seguimiento', 'presupuesto', 'proxima'].every(k => typeof K.MSG[k] === 'string') && K.SEGUIR.join() === 'resena,seguimiento,presupuesto,proxima', 'cada mensaje nuevo tiene su nombre, y los cuatro de seguimiento son estos');
  // volver cuando toque: solo con un servicio que se repite y si el cliente dice que sí
  es(cfg.cat.revinst.cada === 12, 'la revisión de la instalación se repite cada 12 meses');
  const { id: g2, r: rg2 } = trabajo('600000502', [{ k: 'desp' }, { k: 'revinst' }], { avisar: true }), A2 = G(g2), mp = A2.msgs.find(m => m.k === 'proxima');
  const dia2 = K.masMeses(K.madrid(A2.fin).date, 12);
  es(rg2.ok && A2.prox && A2.prox.k === 'revinst' && A2.prox.dia === dia2 && mp && mp.t === Date.parse(K.masDias(dia2, -30) + 'T09:00:00Z') && mp.hasta === Date.parse(K.masDias(dia2, 30) + 'T19:00:00Z'),
    'si el cliente dice que sí, se apunta cuándo toca volver (un año después) y el aviso sale un mes antes y caduca un mes después');
  const tp = K.mensaje(cfg, A2, 'proxima');
  es(tp.includes('El ' + K.fechaCorta(dia2) + ' toca la próxima revisión de la instalación') && tp.includes('la última fue el ' + K.fechaCorta(K.madrid(A2.fin).date)) && tp.includes('Si prefieres que no te avisemos más, dínoslo.'), 'el aviso dice qué toca, cuándo y cuándo fue la última');
  const { id: g3 } = trabajo('600000503', [{ k: 'desp' }, { k: 'revinst' }]), { id: g4 } = trabajo('600000504', [{ k: 'desp' }, { k: 'mo', q: 1 }], { avisar: true });
  es(!G(g3).prox && !G(g3).msgs.some(m => m.k === 'proxima') && !G(g4).prox && !G(g4).msgs.some(m => m.k === 'proxima'), 'sin el sí del cliente, o sin nada que se repita, no se apunta nada');
  { const id = hg({ tipo: 'pedir', av: K.REV, cli: cliG('600000505'), origen: 'llamada' }, C).id; hg({ tipo: 'asignar', id, tec: 'jordi' }, C); hg({ tipo: 'voy', id }, T('jordi'));
    hg({ tipo: 'empezar', id, pres: { lineas: [{ k: 'desp' }, { k: 'revinst' }], firma: F, pide: true } }, T('jordi')); const r = hg({ tipo: 'terminar', id, modo: 'tarjeta', avisar: true }, T('jordi'));
    es(r.ok && !G(id).prox && !G(id).msgs.some(m => m.k === 'proxima'), 'en la revisión de un contrato no: sus revisiones ya las lleva el contrato') }
  // el presupuesto que no se acepta
  const pideG = (tel, av) => { const id = hg({ tipo: 'pedir', av: av || 'termo', cli: cliG(tel, 'Lluïsa'), origen: 'llamada' }, C).id; hg({ tipo: 'asignar', id, tec: 'omar' }, C); hg({ tipo: 'voy', id }, T('omar')); return id };
  tg = Date.parse('2026-11-10T21:00:00Z');   // a las 22:00: tarifa de urgencia
  const g5 = pideG('600000506'), L5 = [{ k: 'desp' }, { k: 'mo', q: 1.5 }, { k: 'termo80' }], r5 = hg({ tipo: 'noacepta', id: g5, modo: 'tarjeta', pres: { lineas: L5 } }, T('omar')), A5 = G(g5), mq = A5.msgs.find(m => m.k === 'presupuesto');
  const tot5 = K.precio(cfg, L5, { urg: K.tarifaDe(cfg, A5) }).total;
  es(K.tarifaDe(cfg, A5) && tot5 !== K.precio(cfg, L5, {}).total, 'el presupuesto que no quiso era de noche, con la tarifa de urgencia');
  es(r5.ok && A5.noPres && A5.noPres.total === tot5 && A5.noPres.lin.length === 3 && mq && mq.t === A5.fin + 3 * D && mq.hasta === A5.fin + 14 * D && !A5.msgs.some(m => m.k === 'resena' || m.k === 'seguimiento'),
    'si no acepta, se guarda el presupuesto que no quiso y a los tres días sale el mensaje (vale dos semanas); sin trabajo, ni reseña ni seguimiento');
  es(K.mensaje(cfg, A5, 'presupuesto').includes('Eran ' + K.eur(tot5) + ', IVA incluido') && K.mensaje(cfg, A5, 'presupuesto').startsWith('Hola, Lluïsa. ¿Has podido pensar lo del presupuesto (sin agua caliente)?'), 'el mensaje recuerda el presupuesto con su total');
  const g6 = pideG('600000507'), g7 = pideG('600000508');
  hg({ tipo: 'noacepta', id: g6, modo: 'tarjeta' }, T('omar')); hg({ tipo: 'noacepta', id: g7, modo: 'tarjeta', pres: { lineas: [{ k: 'noexiste' }] } }, T('omar'));
  es(!G(g6).noPres && !G(g6).msgs.some(m => m.k === 'presupuesto') && !G(g7).noPres && !G(g7).msgs.some(m => m.k === 'presupuesto'), 'sin presupuesto, o con uno que no vale, no hay nada que recordar');
  // dejar un mensaje sin mandar
  es(hg({ tipo: 'descartar', id: g1, k: 'resena' }, T('jordi')).err === 'permiso', 'dejar un mensaje sin mandar lo decide la oficina, no el técnico');
  const rd = hg({ tipo: 'descartar', id: g1, k: 'resena' }, C);
  es(rd.ok && m1('resena').env === tg && m1('resena').no === 1 && hg({ tipo: 'descartar', id: g1, k: 'resena' }, C).err === 'mensaje' && pm(A1.fin + 2 * H).length === 0, 'la oficina lo deja sin mandar: queda apuntado y ya no sale');
  // quien no quiere estos mensajes
  const g8 = trabajo('600000501', [{ k: 'desp' }, { k: 'mo', q: 1 }], { modo: 'pendiente' }).id;
  es(G(g8).msgs.some(m => m.k === 'cobro') && G(g8).msgs.some(m => m.k === 'seguimiento'), 'un segundo trabajo del mismo cliente, pendiente de pago: lleva su seguimiento y el recordatorio del pago');
  es(hg({ tipo: 'escribir', tel: '600000501', si: false }, T('jordi')).err === 'permiso' && hg({ tipo: 'escribir', tel: '600000501' }, C).err === 'si' && hg({ tipo: 'escribir', tel: '611222333', si: false }, C).err === 'tel',
    'lo de no querer mensajes lo apunta la oficina, diciendo sí o no, y para un teléfono que tiene avisos');
  const re = hg({ tipo: 'escribir', tel: '600 000 501', si: false }, C), mis = SG.avisos.filter(a => a.cli.tel === '600000501');
  es(re.ok && mis.length === 2 && mis.every(a => a.noMsg === tg) && !mis.some(a => a.msgs.some(m => !m.env && K.SEGUIR.includes(m.k))) && G(g8).msgs.some(m => m.k === 'cobro' && !m.env) && m1('resena').no === 1,
    'el cliente no quiere: se apunta en todos sus avisos y se quitan los de seguimiento sin mandar (el del pago y lo ya hecho se quedan)');
  es(hg({ tipo: 'escribir', tel: '600000501', si: false }, C).err === 'estado', 'apuntarlo otra vez no hace nada');
  const g9 = trabajo('600000501', [{ k: 'desp' }, { k: 'mo', q: 1 }]).id;
  es(G(g9).noMsg && !G(g9).msgs.some(m => K.SEGUIR.includes(m.k)) && G(g9).msgs.some(m => m.k === 'hecho') && K.noEscribe(SG, '600000501') && !K.noEscribe(SG, '600000502'),
    'su aviso nuevo ya lo sabe: le llegan los mensajes del servicio (el del trabajo terminado), pero no los de seguimiento');
  const rs = hg({ tipo: 'escribir', tel: '600000501', si: true }, C);
  es(rs.ok && !SG.avisos.some(a => a.noMsg) && !K.noEscribe(SG, '600000501') && hg({ tipo: 'escribir', tel: '600000501', si: true }, C).err === 'estado', 'si cambia de idea, se quita en todos sus avisos');
  const g10 = trabajo('600000501', [{ k: 'desp' }, { k: 'mo', q: 1 }]).id;
  es(G(g10).msgs.some(m => m.k === 'seguimiento'), 'y los trabajos de después vuelven a llevar su seguimiento');
  // un aviso que ya dice que no (de otro aparato, de antes) no saca su seguimiento aunque lo lleve apuntado
  { const SX = JSON.parse(JSON.stringify(SG)), X = SX.avisos.find(a => a.id === g10); X.noMsg = tg; const mX = X.msgs.find(m => m.k === 'seguimiento');
    es(mX && !mX.env && !K.porMandar(SX, mX.t + M).some(x => x.a.id === g10 && x.m.k === 'seguimiento') && K.porMandar(SG, mX.t + M).some(x => x.a.id === g10 && x.m.k === 'seguimiento'),
      'si el aviso ya dice que no quiere, su seguimiento no sale por mandar aunque esté apuntado') }
  // al corregir el teléfono de un aviso: si es de alguien que no quiere estos mensajes, el aviso tampoco los lleva; y si el aviso
  // que no los quería pasa a otro número, ese número deja de recibirlos (mejor uno de menos que uno a quien dijo que no)
  { const SC = K.nuevo(); let tc = MAR; const hc = (a, q) => K.aplicar(SC, cfg, a, q, tc += M), GC = id => SC.avisos.find(a => a.id === id);
    const pide = tel => hc({ tipo: 'pedir', av: 'fuga', cli: cliG(tel), origen: 'llamada' }, C).id;
    const a1 = pide('600000601'); hc({ tipo: 'asignar', id: a1, tec: 'jordi' }, C); hc({ tipo: 'voy', id: a1 }, T('jordi'));
    hc({ tipo: 'empezar', id: a1, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], firma: F, pide: true } }, T('jordi')); hc({ tipo: 'terminar', id: a1, modo: 'tarjeta' }, T('jordi'));
    const a2 = pide('600000602'), a3 = pide('600000603'), a4 = pide('600000604'); hc({ tipo: 'escribir', tel: '600000602', si: false }, C); hc({ tipo: 'escribir', tel: '600000604', si: false }, C);
    const r2 = hc({ tipo: 'completar', id: a2, cli: { tel: '600000601' } }, C), r3 = hc({ tipo: 'completar', id: a3, cli: { tel: '600000604' } }, C);
    es(r2.ok && GC(a2).noMsg && K.noEscribe(SC, '600000601') && GC(a1).msgs.some(m => m.k === 'resena' && !m.env) && !K.porMandar(SC, GC(a1).fin + 3 * H).some(x => x.a.id === a1 && K.SEGUIR.includes(x.m.k)),
      'si el aviso que no quería mensajes pasa a otro número, a ese número tampoco le sale ninguno (aunque otro aviso suyo lo tenga apuntado)');
    es(r3.ok && GC(a3).noMsg && !GC(a3).msgs.some(m => K.SEGUIR.includes(m.k)), 'y si un aviso pasa al número de quien no los quiere, ese aviso tampoco los lleva') }
  // un contrato nuevo solo cambia los avisos de su cliente (no los de otro, aunque les falte el suyo)
  { const SK = K.nuevo(); let tk = MAR; const hk = (a, q) => K.aplicar(SK, cfg, a, q, tk += M), GK = id => SK.avisos.find(a => a.id === id);
    const c1 = hk({ tipo: 'contrato', plan: 'anual', cli: cliG('600000611'), acepta: 'firma', firma: F, modo: 'tarjeta' }, C);
    const k1 = hk({ tipo: 'pedir', av: 'fuga', cli: cliG('600000612'), origen: 'llamada' }, C).id; hk({ tipo: 'asignar', id: k1, tec: 'jordi' }, C);
    const rk = hk({ tipo: 'completar', id: k1, cli: { tel: '600000611' } }, T('jordi'));   // el técnico no tiene la lista de contratos: no lo pone
    const c2 = hk({ tipo: 'contrato', plan: 'anual', cli: Object.assign(cliG('600000613'), { dir: 'C/ Otra 5, 1.º' }), acepta: 'firma', firma: F, modo: 'tarjeta' }, C);
    es(c1.ok && rk.ok && c2.ok && !GK(k1).con, 'el alta de otro cliente no toca los avisos que no son suyos') }
  // lo de dentro no lo ve el cliente
  const vc = K.vistaCliente(SG, cfg, g5), pf = K.perfilCliente(SG, cfg, '600000506');
  es(!('noPres' in vc) && !('noMsg' in vc) && !('prox' in K.vistaCliente(SG, cfg, g2)) && pf && !pf.avisos.some(a => 'noPres' in a || 'msgs' in a), 'el cliente no ve el presupuesto guardado ni los apuntes del seguimiento');
  // «cada», solo si vale
  const NC = JSON.parse(JSON.stringify(N)); NC.catalogo.revinst.cada = 2; NC.catalogo.desp.cada = 61; NC.catalogo.mo.cada = 12.5; NC.catalogo.grifo.cada = '12';
  const cc = K.cfgDe(NC);
  es(!cc.cat.revinst.cada && !cc.cat.desp.cada && !cc.cat.mo.cada && !cc.cat.grifo.cada, '«cada» tiene que ser un número entero de meses, de 3 a 60');
}

// 48. lo que encontraron los recorridos al azar al probar el seguimiento (15-11-2026, noche): con citas por tiempo, una
//     cita en «no había nadie» de un técnico que ese día falta cuenta como sin técnico al mirar lo que sobra
{
  const NT = JSON.parse(JSON.stringify(PUB)); NT.citas = { porFranja: 3, reserva: 1, porTiempo: true }; const ct = K.cfgDe(NT);
  const dia = '2026-11-11', d0 = Object.keys(ct.zonas.dis)[0], SA = K.nuevo(); let ta = MAR; const ha = (a, q) => K.aplicar(SA, ct, a, q, ta += 5 * M);
  const cli = { nombre: 'Nadie', apellidos: 'Encasa', tel: '600000480', dir: 'C/ Vacía 2, 1.º', cp: Object.keys(ct.zonas.cp).find(c => ct.zonas.cp[c] === d0) };
  const id = ha({ tipo: 'pedir', av: 'grifo', cli, cita: { dia, fr: 'f1' } }, C).id; ha({ tipo: 'asignar', id, tec: 'omar' }, C);
  ta = Date.parse(dia + 'T08:10:00Z'); const rv = ha({ tipo: 'voy', id }, T('omar')), ru = ha({ tipo: 'ausencia', tec: 'omar', de: dia, a: dia, motivo: 'médico' }, C), rn = ha({ tipo: 'ausente', id }, T('omar'));
  const A = SA.avisos.find(a => a.id === id), f1 = s => s.find(x => x.dia === dia && x.fr === 'f1');
  es(rv.ok && ru.ok && rn.ok && A.e === 'ausente' && A.tec === 'omar' && !f1(K.sobran(SA, ct, ta)), 'si el técnico de una cita en «no había nadie» falta ese día y otro puede ir, no sobra');
  ha({ tipo: 'ausencia', tec: 'jordi', de: dia, a: dia, motivo: 'curso' }, C); ha({ tipo: 'ausencia', tec: 'laia', de: dia, a: dia, motivo: 'curso' }, C);
  const s = f1(K.sobran(SA, ct, ta));
  es(s && s.sobran === 1, 'y si ese día no trabaja nadie, la oficina ve que sobra (para moverla a otro día)');
}

// 49. la furgoneta (16-11-2026): lo que lleva cada trabajo, la carga de cada día, la cuenta de la furgoneta (si el técnico
//     quiere), lo que se descuenta al terminar y lo que hay que reponer
{
  const SV = K.nuevo(); let tv = MAR; const hv = (a, q) => K.aplicar(SV, cfg, a, q, tv += M), GV = id => SV.avisos.find(a => a.id === id);
  const hoy = K.madrid(MAR).date, man = K.masDias(hoy, 1);
  const cliV = n => ({ nombre: 'Furgo', apellidos: 'Prueba', tel: '6000007' + String(n).padStart(2, '0'), dir: 'C/ del Material ' + n + ', 1.º', cp: '08012' });
  // lo que lleva un trabajo
  const f1 = hv({ tipo: 'pedir', av: 'fuga', cli: cliV(1), origen: 'llamada' }, C).id, L1 = K.lleva(cfg, GV(f1));
  es(L1.lin.length === 1 && L1.lin[0].k === 'juntas' && L1.lin[0].q === 1 && !L1.lin[0].fa && L1.quiza.map(x => x.k).join() === 'sellador,latig,llave,tubo' && !L1.mano.length,
    'sin presupuesto, un trabajo lleva el material de partida de su avería; por si acaso, las piezas que se suelen añadir en ella');
  hv({ tipo: 'falta', id: f1, k: 'juntas', q: 3 }, C); hv({ tipo: 'falta', id: f1, k: 'latig', q: 2 }, C); hv({ tipo: 'falta', id: f1, t: 'Codo de cobre de 15', q: 1 }, C);
  const L1b = K.lleva(cfg, GV(f1)), ju = L1b.lin.find(x => x.k === 'juntas'), la = L1b.lin.find(x => x.k === 'latig');
  es(ju.q === 3 && ju.fa === 3 && la.q === 2 && la.fa === 2 && !L1b.quiza.some(x => x.k === 'latig') && L1b.mano.length === 1 && L1b.mano[0].t === 'Codo de cobre de 15',
    'lo apuntado que falta cuenta (sin sumarse a lo de partida), sale marcado, y lo escrito a mano va aparte');
  const t1 = hv({ tipo: 'pedir', av: 'termo', cli: cliV(2), origen: 'llamada' }, C).id;
  es(!K.lleva(cfg, GV(t1)).quiza.some(x => x.k === 'termo80') && K.lleva(cfg, GV(t1)).quiza.some(x => x.k === 'termostato'), 'un aparato («extra») nunca sale por si acaso');
  hv({ tipo: 'asignar', id: t1, tec: 'omar' }, C); hv({ tipo: 'voy', id: t1 }, T('omar'));
  const em = hv({ tipo: 'empezar', id: t1, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'termo80' }, { k: 'valvula', q: 2 }, { k: 'otro', t: 'Codo raro', p: 9 }], firma: F, pide: true } }, T('omar'));
  const L2 = K.lleva(cfg, GV(t1));
  es(em.ok && L2.lin.map(x => x.k + x.q).join() === 'termo801,valvula2', 'con el presupuesto firmado lleva su material, también un aparato; ni el servicio ni lo escrito a mano con precio');
  // la carga de un día
  const c1 = hv({ tipo: 'pedir', av: 'cisterna', cli: cliV(3), origen: 'llamada', cita: { dia: man, fr: 'f1' } }, C).id; hv({ tipo: 'asignar', id: c1, tec: 'omar' }, C); hv({ tipo: 'falta', id: c1, k: 'mecanismo', q: 1 }, T('omar'));
  const c2 = hv({ tipo: 'pedir', av: 'grifo', cli: cliV(4), origen: 'llamada', cita: { dia: man, fr: 'f2' } }, C).id; hv({ tipo: 'asignar', id: c2, tec: 'omar' }, C);
  const c3 = hv({ tipo: 'pedir', av: 'grifo', cli: cliV(5), origen: 'llamada', cita: { dia: man, fr: 'f3' } }, C).id; hv({ tipo: 'asignar', id: c3, tec: 'laia' }, C);
  const cm = K.cargaDe(SV, cfg, 'omar', man, tv);
  es(cm.av.join() === [c1, c2].join() && cm.lin.map(x => x.k + x.q).join() === 'mecanismo1' && cm.lin[0].fa === 1 && cm.quiza.map(x => x.k).join() === 'latig,llave,grifon' && cm.quiza[0].av.join() === [c1, c2].join() && !cm.furgo && !('falta' in cm),
    'la carga de mañana: sus citas de ese día, sumado; por si acaso, una de cada pieza con los avisos de los que sale; sin la cuenta, nada más');
  const ch = K.cargaDe(SV, cfg, 'omar', hoy, tv);
  es(ch.av.join() === t1 && ch.lin.map(x => x.k + x.q).join() === 'valvula2,termo801', 'hoy cuenta lo que ya está en marcha; no lo de otro día ni lo que no es suyo');
  const pas = K.masDias(man, 1), cp = K.cargaDe(SV, cfg, 'omar', pas, Date.parse(pas + 'T09:00:00Z'));
  es([c1, c2, t1].every(id => cp.av.includes(id)), 'una cita de un día que ya pasó y sigue sin hacer cuenta para hoy');
  // la cuenta: permisos y lo que no vale; nada de eso cambia nada
  const antes = JSON.stringify(SV);
  const malas = [hv({ tipo: 'furgo', tec: 'omar', llevar: true }, T('laia')), hv({ tipo: 'furgo', tec: 'omar', llevar: true }, CLI), hv({ tipo: 'furgo', tec: 'nadie', llevar: true }, C),
    hv({ tipo: 'furgo', tec: 'omar', cuenta: { juntas: 1 } }, T('omar')), hv({ tipo: 'furgo', tec: 'omar', llevar: false }, T('omar')), hv({ tipo: 'furgo', tec: 'omar', llevar: 'si' }, T('omar'))];
  es(malas.map(r => r.err).join() === 'permiso,permiso,tec,estado,estado,furgo' && JSON.stringify(SV) === antes && !('furgos' in SV),
    'la furgoneta: un técnico solo la suya, el cliente nada; sin llevar la cuenta no se cuenta ni se deja; nada de eso cambia nada');
  const si = hv({ tipo: 'furgo', tec: 'omar', llevar: true }, T('omar')), F0 = SV.furgos.omar;
  es(si.ok && F0.on === true && !Object.keys(F0.st).length && F0.h.length === 1 && K.furgoDe(SV, 'omar') === F0 && !K.furgoDe(SV, 'laia'), 'el técnico empieza a llevar la cuenta de la suya');
  es(hv({ tipo: 'furgo', tec: 'omar', llevar: true }, C).err === 'estado', 'no se empieza dos veces');
  const antes2 = JSON.stringify(SV);
  const malas2 = [{ cuenta: { juntas: 1 }, carga: { juntas: 1 } }, {}, { cuenta: {} }, { cuenta: [] }, { cuenta: { desp: 1 } }, { cuenta: { otro: 1 } }, { cuenta: { nada: 1 } }, { cuenta: JSON.parse('{"__proto__":1}') },
    { cuenta: { juntas: -1 } }, { cuenta: { juntas: 1.5 } }, { cuenta: { juntas: 1000 } }, { cuenta: { juntas: '3' } }, { carga: { juntas: 0 } }, { carga: 'juntas' }].map(x => hv(Object.assign({ tipo: 'furgo', tec: 'omar' }, x), T('omar')).err);
  es(malas2.every(e => e === 'furgo') && JSON.stringify(SV) === antes2, 'contar o cargar: solo material del catálogo, enteros de 0 a 999 (al cargar, de 1 en adelante) y una cosa cada vez; si no, no cambia nada');
  const cu = hv({ tipo: 'furgo', tec: 'omar', cuenta: { juntas: 6, latig: 1, valvula: 3, termo80: 1, llave: 0 } }, T('omar'));
  es(cu.ok && cu.cambios === 4 && JSON.stringify(F0.st) === JSON.stringify({ juntas: 6, latig: 1, valvula: 3, termo80: 1 }) && F0.cnt === tv && /^Recuento\. /.test(F0.h[F0.h.length - 1].txt),
    'el recuento deja lo dicho tal cual (cero es que no hay) y apunta lo que ha cambiado');
  const cg = hv({ tipo: 'furgo', tec: 'omar', carga: { latig: 2, mecanismo: 1 } }, C);
  es(cg.ok && F0.st.latig === 3 && F0.st.mecanismo === 1 && F0.st.juntas === 6 && F0.h[F0.h.length - 1].q === 'Centralita' && F0.h[F0.h.length - 1].txt === 'Cargado: 2 × Latiguillos, el par; 1 × Mecanismo de cisterna',
    'lo cargado se suma, y la oficina también puede apuntarlo');
  // con la cuenta: lo que le falta, lo que hay que reponer y lo que conviene cargar
  const cmf = K.cargaDe(SV, cfg, 'omar', man, tv), rp = K.reponerDe(SV, cfg, 'omar'), kit = K.kitDe(cfg, 'omar'), enKit = k => Object.prototype.hasOwnProperty.call(kit, k);
  es(cmf.furgo && cmf.falta.map(x => x.k + x.q + (x.quiza ? '?' : '')).join() === 'llave1?,grifon1?', 'con la cuenta, lo que le falta para mañana (aquí, solo lo de por si acaso)');
  es(rp.length > 0 && rp.every(x => enKit(x.k) && x.hay < kit[x.k][0] && x.q === kit[x.k][1] - x.hay) && Object.keys(kit).every(k => (F0.st[k] || 0) >= kit[k][0] || rp.some(x => x.k === k)),
    'para reponer: todo lo que está por debajo del mínimo, hasta el máximo, y nada más');
  es(cmf.cargar.length === new Set(cmf.falta.map(x => x.k).concat(rp.map(x => x.k))).size && cmf.cargar.every(x => x.q === Math.max((cmf.falta.find(y => y.k === x.k) || { q: 0 }).q, (rp.find(y => y.k === x.k) || { q: 0 }).q)),
    'lo que conviene cargar: lo mayor entre lo que falta y lo que hay que reponer');
  const Lc = {}; cmf.cargar.forEach(x => { Lc[x.k] = x.q }); hv({ tipo: 'furgo', tec: 'omar', carga: Lc }, T('omar'));
  const cmf2 = K.cargaDe(SV, cfg, 'omar', man, tv);
  es(!cmf2.falta.length && !cmf2.reponer.length && !cmf2.cargar.length, 'cargado eso, ya no le falta nada ni hay nada que reponer');
  hv({ tipo: 'falta', id: c2, k: 'grifon', q: 5 }, C); const g5 = K.cargaDe(SV, cfg, 'omar', man, tv).falta.find(x => x.k === 'grifon');
  es(g5 && g5.q === 5 - F0.st.grifon && g5.hay === F0.st.grifon && !g5.quiza, 'si un trabajo necesita más de lo que lleva, le falta la diferencia');
  const tx = K.textoCarga(cfg, K.cargaDe(SV, cfg, 'omar', man, tv));
  es(tx.startsWith('Material para el ' + K.fechaLarga(man) + ', Omar:') && tx.includes('Para cargar:') && tx.includes('Lo que lleva cada trabajo:') && tx.includes('(' + c2 + '), apuntado que falta') && tx.endsWith(N.nombre)
    && K.textoCarga(cfg, K.cargaDe(SV, cfg, 'jordi', man, tv)) === '', 'la lista escrita para copiarla o mandarla, y nada si no hay nada');
  // al terminar se descuenta
  const sv0 = JSON.parse(JSON.stringify(F0.st)), rt = hv({ tipo: 'terminar', id: t1, modo: 'tarjeta' }, T('omar'));
  es(rt.ok && !('termo80' in F0.st) && F0.st.valvula === sv0.valvula - 2 && F0.st.juntas === sv0.juntas && GV(t1).h.some(h => h.txt === 'Descontado de la furgoneta: 1 × Termo eléctrico de 80 litros, instalado; 2 × Válvula de seguridad') && F0.h[F0.h.length - 1].txt.startsWith(t1 + ': '),
    'al terminar, lo usado (solo material del catálogo) se descuenta de su furgoneta y queda apuntado en el aviso y en la furgoneta');
  const u1 = hv({ tipo: 'pedir', av: 'grifo', cli: cliV(6), origen: 'llamada' }, C).id; hv({ tipo: 'asignar', id: u1, tec: 'omar' }, C); hv({ tipo: 'voy', id: u1 }, T('omar'));
  hv({ tipo: 'empezar', id: u1, pres: { lineas: [{ k: 'grifo' }, { k: 'latig', q: 9 }], firma: F } }, T('omar'));
  const hayL = F0.st.latig, ru = hv({ tipo: 'terminar', id: u1, modo: 'efectivo' }, T('omar'));
  es(ru.ok && hayL < 9 && !('latig' in F0.st) && GV(u1).h.some(h => h.txt.includes('(apuntados había ' + hayL + ')')), 'si se usa más de lo apuntado, se queda en cero y lo dice: el próximo recuento lo pone bien');
  es(!JSON.stringify(K.perfilCliente(SV, cfg, cliV(6).tel)).includes('furgoneta') && !('furgos' in K.vistaCliente(SV, cfg, u1)), 'el cliente no ve nada de la furgoneta');
  const u2 = hv({ tipo: 'pedir', av: 'fuga', cli: cliV(7), origen: 'llamada' }, C).id; hv({ tipo: 'asignar', id: u2, tec: 'laia' }, C); hv({ tipo: 'voy', id: u2 }, T('laia'));
  hv({ tipo: 'empezar', id: u2, pres: { lineas: [{ k: 'desp' }, { k: 'juntas', q: 2 }], firma: F } }, T('laia'));
  const sv1 = JSON.stringify(F0.st); hv({ tipo: 'terminar', id: u2, modo: 'efectivo' }, T('laia'));
  es(JSON.stringify(F0.st) === sv1 && !SV.furgos.laia && !GV(u2).h.some(h => h.txt.startsWith('Descontado')), 'lo que usa otro técnico no toca esta furgoneta, y quien no lleva la cuenta no descuenta nada');
  const no = hv({ tipo: 'furgo', tec: 'omar', llevar: false }, T('omar')), sv2 = JSON.stringify(F0.st);
  const sv2b = JSON.stringify(SV), nc1 = hv({ tipo: 'furgo', tec: 'omar', cuenta: { juntas: 1 } }, C), nc2 = hv({ tipo: 'furgo', tec: 'omar', carga: { juntas: 1 } }, T('omar'));
  es(nc1.err === 'estado' && nc2.err === 'estado' && JSON.stringify(SV) === sv2b, 'con la cuenta dejada, ni se cuenta ni se carga');
  const u3 = hv({ tipo: 'pedir', av: 'fuga', cli: cliV(8), origen: 'llamada' }, C).id; hv({ tipo: 'asignar', id: u3, tec: 'omar' }, C); hv({ tipo: 'voy', id: u3 }, T('omar'));
  hv({ tipo: 'empezar', id: u3, pres: { lineas: [{ k: 'desp' }, { k: 'juntas', q: 2 }], firma: F } }, T('omar')); hv({ tipo: 'terminar', id: u3, modo: 'efectivo' }, T('omar'));
  es(no.ok && F0.on === false && !K.furgoDe(SV, 'omar') && JSON.stringify(F0.st) === sv2 && !K.reponerDe(SV, cfg, 'omar').length && K.cargaDe(SV, cfg, 'omar', man, tv).furgo === false,
    'sin llevar la cuenta no se descuenta nada; lo apuntado se queda guardado');
  const re = hv({ tipo: 'furgo', tec: 'omar', llevar: true }, C);
  es(re.ok && F0.on === true && JSON.stringify(F0.st) === sv2 && F0.h[F0.h.length - 1].txt === 'Empieza a llevar la cuenta', 'al volver a llevarla, sale lo último que había');
  for (let i = 0; i < K.FURGO_H + 5; i++) hv({ tipo: 'furgo', tec: 'omar', carga: { juntas: 1 } }, T('omar'));
  es(F0.h.length === K.FURGO_H && F0.st.juntas === JSON.parse(sv2).juntas + K.FURGO_H + 5, 'de cada furgoneta se guardan los últimos movimientos, no todos');
  const stz = JSON.parse(JSON.stringify(F0.st)), cz = hv({ tipo: 'furgo', tec: 'omar', cuenta: { juntas: 0 } }, C);
  es(cz.ok && cz.cambios === 1 && !('juntas' in F0.st) && Object.keys(stz).filter(k => k !== 'juntas').every(k => F0.st[k] === stz[k]), 'contar cero de lo que había lo quita; lo que no se cuenta se queda como estaba');
  // lo que lleva siempre la furgoneta, en los datos
  const NK = JSON.parse(JSON.stringify(N)); NK.furgoneta = { juntas: [2, 5], desp: [1, 2], nada: [1, 1], latig: [5, 2], llave: [0, 0], sifon: [1.5, 3], tubo: [0, 3], grifon: [1, 1000] }; NK.tecnicos[1].furgoneta = { valvula: [1, 2] };
  const ck = K.cfgDe(NK);
  es(JSON.stringify(K.kitDe(ck, NK.tecnicos[0].id)) === JSON.stringify({ juntas: [2, 5], tubo: [0, 3] }) && JSON.stringify(K.kitDe(ck, NK.tecnicos[1].id)) === JSON.stringify({ valvula: [1, 2] }) && JSON.stringify(K.kitDe(K.cfgDe(Object.assign({}, NK, { furgoneta: undefined })), 'nadie')) === '{}',
    'lo que lleva siempre la furgoneta: solo material del catálogo y [mínimo, máximo] que valga; un técnico puede tener la suya');
  // la demo: Laia lleva la cuenta y le toca reponer las llaves y el tubo
  const SM = globalThis.OFICIO_MUESTRA(K, cfg, Date.now()), rL = K.reponerDe(SM, cfg, 'laia');
  es(K.furgoDe(SM, 'laia') && !K.furgoDe(SM, 'omar') && !K.furgoDe(SM, 'jordi') && rL.map(x => x.k).join() === 'llave,tubo', 'en la demo, Laia lleva la cuenta de su furgoneta y le toca reponer');
}

// ---------- «Voy», solo cuando toca (16-11, auditoría UX-29): con cita, desde media hora antes de la franja ----------
{ const hora = iso => Date.parse(iso);
  /* un estado nuevo con una cita ya asignada: se pide el día antes a media mañana y se le da al primer técnico que puede */
  const monta = (dia, fr, antes) => { const SV = K.nuevo(); let tv = hora(antes); const hv = (a, q, tt) => K.aplicar(SV, cfg, a, q, tt != null ? (tv = tt) : (tv += M));
    const cp = Object.keys(cfg.zonas.cp)[0], cli = { nombre: 'Hora', apellidos: 'De Salir', tel: '600000990', dir: 'C/ Reloj 1', cp };
    const r = hv({ tipo: 'pedir', av: 'grifo', cli, cita: { dia, fr } }, C); if (!r.ok) return { err: 'pedir ' + r.err };
    const tec = Object.keys(cfg.tec).find(x => hv({ tipo: 'asignar', id: r.id, tec: x }, C).ok); return { SV, hv, id: r.id, tec, A: () => SV.avisos.find(a => a.id === r.id) } };
  // invierno (hora +1): la franja de las 8:00 abre «Voy» a las 7:30 de Madrid, que son las 6:30 en UTC
  { const X = monta('2026-11-17', 'f1', '2026-11-16T10:00:00+01:00');
    const r1 = X.hv({ tipo: 'voy', id: X.id }, T(X.tec), hora('2026-11-17T07:29:00+01:00')), d = K.voyDesde(cfg, X.A());
    es(!X.err && X.tec && r1.err === 'pronto' && X.A().e === 'asignado' && d.dia === '2026-11-17' && d.min === 450, `invierno: a las 7:29 todavía no puede decir «Voy» (abre a las 7:30) ${JSON.stringify({ err: X.err, r1, d })}`);
    es(!K.voyYa(cfg, X.A(), hora('2026-11-17T06:29:59Z')) && K.voyYa(cfg, X.A(), hora('2026-11-17T06:30:00Z')), 'invierno: abre justo a las 6:30 en UTC (7:30 de Madrid), ni un minuto antes');
    const r2 = X.hv({ tipo: 'voy', id: X.id }, T(X.tec), hora('2026-11-17T07:30:00+01:00'));
    es(r2.ok && X.A().e === 'camino', 'invierno: a las 7:30 ya puede; el aviso pasa a «De camino»') }
  // verano (hora +2): misma regla en hora de Madrid; con una hora fija de diferencia, fallaría
  { const X = monta('2027-06-15', 'f2', '2027-06-14T10:00:00+02:00'), f2 = cfg.franjas.find(f => f.id === 'f2');
    const ab = f2.de - 30, hh = String(Math.floor(ab / 60)).padStart(2, '0'), mm = String(ab % 60).padStart(2, '0'), menos = String(ab % 60 ? ab % 60 - 1 : 59).padStart(2, '0'), hm1 = ab % 60 ? hh : String(Math.floor(ab / 60) - 1).padStart(2, '0');
    const r1 = X.hv({ tipo: 'voy', id: X.id }, T(X.tec), hora(`2027-06-15T${hm1}:${menos}:00+02:00`)), r2 = X.hv({ tipo: 'voy', id: X.id }, T(X.tec), hora(`2027-06-15T${hh}:${mm}:00+02:00`));
    es(!X.err && r1.err === 'pronto' && r2.ok, `verano: abre a las ${hh}:${mm} de Madrid (media hora antes de la franja de las ${K.hhmm ? K.hhmm(f2.de) : f2.de}), con el horario de verano ${JSON.stringify({ err: X.err, r1, r2 })}`) }
  // la semana del cambio de hora (28-3-2027): el martes siguiente, la franja de las 8:00 abre a las 5:30 en UTC
  { const X = monta('2027-03-30', 'f1', '2027-03-29T12:00:00+02:00');
    es(!X.err && !K.voyYa(cfg, X.A(), hora('2027-03-30T05:29:00Z')) && K.voyYa(cfg, X.A(), hora('2027-03-30T05:30:00Z')), `después del cambio de hora de primavera, la cuenta sigue en hora de Madrid ${X.err || ''}`) }
  // el día antes, a cualquier hora (también festivo y a medianoche), no puede
  { const X = monta('2026-12-09', 'f1', '2026-12-07T10:00:00+01:00');
    es(!X.err && !K.voyYa(cfg, X.A(), hora('2026-12-08T22:00:00+01:00')) && !K.voyYa(cfg, X.A(), hora('2026-12-09T00:00:00+01:00')) && X.hv({ tipo: 'voy', id: X.id }, T(X.tec), hora('2026-12-08T23:59:00+01:00')).err === 'pronto',
      `la víspera (festivo) y a medianoche, todavía no ${X.err || ''}`) }
  // va tarde: la franja ya ha empezado (o es otro día): puede ir igual y se le avisa
  { const X = monta('2026-11-17', 'f1', '2026-11-16T10:00:00+01:00'), Ax = X.A();
    es(!K.voyTarde(cfg, Ax, hora('2026-11-17T07:59:00+01:00')) && K.voyTarde(cfg, Ax, hora('2026-11-17T08:00:00+01:00')) && K.voyTarde(cfg, Ax, hora('2026-11-18T09:00:00+01:00')), 'va tarde desde que empieza su franja (y al día siguiente, también)');
    es(X.hv({ tipo: 'voy', id: X.id }, T(X.tec), hora('2026-11-18T09:00:00+01:00')).ok, 'si va tarde, «Voy» no se bloquea: tiene que poder salir') }
  // si la oficina cambia la cita, la hora de salir se cuenta otra vez con la franja nueva
  { const X = monta('2026-11-17', 'f1', '2026-11-16T10:00:00+01:00'), t0 = hora('2026-11-17T07:40:00+01:00');
    es(!X.err && K.voyYa(cfg, X.A(), t0), 'con la franja de las 8:00, a las 7:40 ya podría');
    const rm = X.hv({ tipo: 'mover', id: X.id, cita: { dia: '2026-11-17', fr: 'f3' } }, C, t0);
    const r = X.hv({ tipo: 'voy', id: X.id }, T(X.tec), t0 + M);
    es(rm.ok && X.A().e === 'asignado' && r.err === 'pronto' && K.voyDesde(cfg, X.A()).min === cfg.franjas.find(f => f.id === 'f3').de - 30, `al pasarla a la tarde, ya no puede salir a las 7:41: la hora se cuenta con la franja nueva ${JSON.stringify({ rm, r, e: X.A().e })}`) }
  // una urgencia (sin cita) no espera a nada
  { const SV = K.nuevo(); let tv = hora('2026-11-17T03:10:00+01:00'); const hv = (a, q) => K.aplicar(SV, cfg, a, q, tv += M);
    const id = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: { nombre: 'Ya', apellidos: 'Mismo', tel: '600000991', dir: 'C/ Prisa 1', cp: Object.keys(cfg.zonas.cp)[0] } }, C).id;
    const tec = Object.keys(cfg.tec).find(x => hv({ tipo: 'asignar', id, tec: x }, C).ok);
    es(K.voyDesde(cfg, SV.avisos[0]) === null && hv({ tipo: 'voy', id }, T(tec)).ok, 'una urgencia sin franja: «Voy» en cuanto se asigna, de día o de noche') }
  // una franja que empieza pasada la medianoche: abre la víspera, a las 23:45
  { const NM = JSON.parse(JSON.stringify(N)); NM.franjas = [{ id: 'f0', de: 15, a: 120 }].concat(NM.franjas); const cm = K.cfgDe(NM), Ax = { e: 'asignado', cita: { dia: '2026-11-17', fr: 'f0' } }, d = K.voyDesde(cm, Ax);
    es(d && d.dia === '2026-11-16' && d.min === 1425 && !K.voyYa(cm, Ax, hora('2026-11-16T23:44:00+01:00')) && K.voyYa(cm, Ax, hora('2026-11-16T23:45:00+01:00')), `a medianoche: la franja de las 00:15 abre el día antes a las 23:45 ${JSON.stringify(d)}`) }
}

// ---------- «Nombre y apellidos» en un solo campo (decisión de Oscar, 16-11): la primera palabra es el nombre ----------
{ const P = K.parteNombre;
  es(JSON.stringify(P('  María José   García López ')) === JSON.stringify({ nombre: 'María', apellidos: 'José García López', bien: true }), 'nombre y apellidos: la primera palabra es el nombre y el resto, los apellidos, sin espacios de más');
  es(!P('Montse').bien && P('Montse').apellidos === '' && !P('').bien && !P(null).bien && !P('J X').bien && P('Ana Lo').bien, 'nombre y apellidos: hace falta el nombre y al menos un apellido (de dos letras o más)');
  es(P('Ana ' + 'x'.repeat(200)).apellidos.length === 80 && P('y'.repeat(100) + ' Pérez').nombre.length === 60, 'nombre y apellidos: con los mismos topes que la regla (60 y 80)') }

// ---------- quitar el técnico («soltar», 16-11, auditoría UX-16): también es el «Deshacer» de «Asignar a» ----------
{ const SV = K.nuevo(); let tv = Date.parse('2026-11-16T10:00:00+01:00'); const hv = (a, q) => K.aplicar(SV, cfg, a, q, tv += M), Ax = id => SV.avisos.find(a => a.id === id);
  const cp = Object.keys(cfg.zonas.cp)[0], cli = { nombre: 'Des', apellidos: 'Hacer', tel: '600000992', dir: 'C/ Atrás 1', cp };
  let cita = null; for (const d of K.diasDe(SV, cfg, tv, 8, true)) { if (d.dia <= '2026-11-17') continue; const f = d.franjas.find(f => f.okOf); if (f) { cita = { dia: d.dia, fr: f.id }; break } }
  const id = hv({ tipo: 'pedir', av: 'grifo', origen: 'llamada', cli, cita }, C).id;
  es(hv({ tipo: 'soltar', id }, C).err === 'estado', 'soltar: un aviso sin técnico no se puede soltar');
  const tec = Object.keys(cfg.tec).find(x => hv({ tipo: 'asignar', id, tec: x }, C).ok), n0 = Ax(id).h.length;
  const ks = () => Ax(id).msgs.filter(m => !m.env).map(m => m.k).sort().join();
  es(tec && ks().includes('cita') && ks().includes('vispera'), `soltar: al asignar quedan escritos el mensaje de la cita y el de la víspera (${ks()})`);
  es(hv({ tipo: 'soltar', id }, T(tec)).err === 'permiso' && Ax(id).e === 'asignado', 'soltar: el técnico no puede quitarse un aviso; solo la oficina');
  const r = hv({ tipo: 'soltar', id }, C), X = Ax(id);
  es(r.ok && X.e === 'nuevo' && X.tec === '' && !X.reasignar && !X.msgs.some(m => !m.env && (m.k === 'cita' || m.k === 'vispera')) && X.h.length === n0 + 1 && /^Sin técnico: .+ ya no lo lleva$/.test(X.h[X.h.length - 1].txt),
    `soltar: vuelve a la bandeja sin técnico, sin los mensajes de la cita que no salieron y queda escrito en su diario ${JSON.stringify({ r, e: X.e, tec: X.tec, m: X.msgs })}`);
  // el mensaje que ya salió se queda (y queda como mandado); y en la calle o trabajando ya no se suelta
  hv({ tipo: 'asignar', id, tec }, C); hv({ tipo: 'enviado', id, k: 'cita' }, C); hv({ tipo: 'soltar', id }, C);
  es(Ax(id).msgs.some(m => m.k === 'cita' && m.env) && Ax(id).e === 'nuevo', 'soltar: el mensaje de la cita que ya se mandó se queda como mandado');
  const u = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: Object.assign({}, cli, { tel: '600000993' }) }, C).id, tu = Object.keys(cfg.tec).find(x => hv({ tipo: 'asignar', id: u, tec: x }, C).ok);
  hv({ tipo: 'voy', id: u }, T(tu));
  es(Ax(u).e === 'camino' && hv({ tipo: 'soltar', id: u }, C).err === 'estado' && Ax(u).tec === tu, 'soltar: con el técnico de camino ya no se puede (hay que hablarlo con él)');
  // «Deshacer» un cambio de técnico es asignar otra vez al de antes
  const w = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: Object.assign({}, cli, { tel: '600000994' }) }, C).id, libres = Object.keys(cfg.tec).filter(x => x !== tu);
  const a1 = libres.find(x => hv({ tipo: 'asignar', id: w, tec: x }, C).ok), a2 = libres.find(x => x !== a1 && hv({ tipo: 'asignar', id: w, tec: x }, C).ok);
  es(a1 && a2 && hv({ tipo: 'asignar', id: w, tec: a1 }, C).ok && Ax(w).tec === a1 && Ax(w).e === 'asignado', 'deshacer un cambio: se vuelve a asignar a quien lo llevaba') }

// ---------- 50. lo del repaso del 16-11-2026: es garantía, corregir la forma de pago, rebajar el precio, el recordatorio
//      del cobro con el Bizum o la cuenta del negocio, la huella de los datos y el plazo de la garantía en los papeles ----------
{ const SV = K.nuevo(); let tv = Date.parse('2026-11-16T10:00:00+01:00'); const hv = (a, q) => K.aplicar(SV, cfg, a, q, tv += M), Ax = id => SV.avisos.find(a => a.id === id);
  const cp = Object.keys(cfg.zonas.cp)[0], cli = n => ({ nombre: 'Gar', apellidos: 'Antía', tel: '60000098' + n, dir: 'C/ de la Garantía ' + n + ', 1.º', cp });
  const libre = () => Object.keys(cfg.tec).find(x => !SV.avisos.some(a => a.tec === x && (a.e === 'camino' || a.e === 'curso')));
  const asigna = id => { const x = Object.keys(cfg.tec).filter(y => y === libre() || !SV.avisos.some(a => a.tec === y && (a.e === 'camino' || a.e === 'curso'))).find(y => hv({ tipo: 'asignar', id, tec: y }, C).ok); return x };
  // un trabajo de punta a punta: pedir, asignar, voy, empezar con su presupuesto y terminar
  const hecho = (c, lineas, modo) => { const id = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: c }, C).id, tec = asigna(id); hv({ tipo: 'voy', id }, T(tec));
    const e = hv({ tipo: 'empezar', id, pres: { lineas, firma: F, pide: true } }, T(tec)), f = hv({ tipo: 'terminar', id, modo, firma: F }, T(tec)); return { id, tec, ok: !!(e.ok && f.ok) } };

  // es garantía
  const G1 = hecho(cli(1), [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }, { k: 'latig' }], 'tarjeta');
  es(G1.ok && Ax(G1.id).gar.hasta === K.masMeses(K.madrid(Ax(G1.id).fin).date, cfg.meses), 'un trabajo terminado queda en garantía los meses del negocio');
  tv += 7 * D;
  const g = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: cli(1) }, C).id;
  es(Ax(g).gar0 === G1.id && !Ax(g).enGar, 'el mismo cliente vuelve a llamar: la oficina ve que puede ser garantía, pero no lo es hasta que ella lo decide');
  const r1 = [hv({ tipo: 'garantia', id: g }, T(G1.tec)), hv({ tipo: 'garantia', id: g }, CLI), hv({ tipo: 'garantia', id: g, de: 'X-999' }, C), hv({ tipo: 'garantia', id: g, de: G1.id + 'x' }, C), hv({ tipo: 'garantia', id: g, quitar: true }, C)];
  es(r1.map(r => r.err).join() === 'permiso,permiso,garantia,garantia,estado' && !Ax(g).enGar, `es garantía: solo la oficina y solo de un trabajo de ese cliente que siga en garantía; quitar lo que no está, no (${r1.map(r => r.err)})`);
  const OTRO = hecho(cli(9), [{ k: 'desp' }, { k: 'mo', q: 1 }], 'efectivo');
  es(OTRO.ok && hv({ tipo: 'garantia', id: g, de: OTRO.id }, C).err === 'garantia' && !Ax(g).enGar, 'no vale la garantía del trabajo de otro cliente');
  const r2 = hv({ tipo: 'garantia', id: g }, C), EG = Ax(g).enGar;
  es(r2.ok && EG.de === G1.id && ['desp', 'mo', 'juntas', 'latig', cfg.urge].every(k => EG.k.includes(k)) && !EG.k.includes('sellador') && /^En garantía del trabajo /.test(Ax(g).h[Ax(g).h.length - 1].txt),
    'es garantía: no se cobra la visita, la mano de obra, la urgencia ni lo que se puso entonces; lo nuevo, sí; y queda en su historial');
  es(hv({ tipo: 'garantia', id: g, quitar: true }, C).ok && !Ax(g).enGar && hv({ tipo: 'garantia', id: g }, C).ok && Ax(g).enGar, 'se puede quitar y volver a poner mientras no ha empezado');
  const tg = asigna(g); hv({ tipo: 'voy', id: g }, T(tg));
  const eg = hv({ tipo: 'empezar', id: g, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }, { k: 'sellador' }], firma: F, pide: true } }, T(tg)), Tg = Ax(g).tot;
  es(eg.ok && Tg.total === K.precio(cfg, [{ k: 'sellador' }], { urg: Tg.urg }).total && Tg.lineas.filter(l => l.gar).map(l => l.k).sort().join() === 'desp,juntas,mo' && Tg.lineas.every(l => l.gar ? l.imp === 0 : l.imp > 0),
    `en garantía, el presupuesto cobra solo lo nuevo (${JSON.stringify(Tg.lineas.map(l => [l.k, l.imp, !!l.gar]))})`);
  es(hv({ tipo: 'garantia', id: g, quitar: true }, C).err === 'estado', 'empezado el trabajo, la garantía ya no se quita ni se pone');
  hv({ tipo: 'terminar', id: g, modo: 'tarjeta', firma: F }, T(tg));
  { const tot = Ax(g).tot.total, rz = hv({ tipo: 'rebajar', id: g, lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], motivo: 'El sellador también va en la garantía' }, C), X = Ax(g);
    es(rz.ok && tot > 0 && X.tot.total === 0 && X.pago.modo === '' && X.pago.cobrado && X.rebajas[0].devolver === tot && X.rebajas[0].modo === 'tarjeta' && !X.msgs.some(m => m.k === 'cobro' && !m.env),
      'rebajado a cero lo ya cobrado: nada que cobrar, y queda apuntado que hay que devolverle lo pagado y cómo lo pagó') }
  { const g4 = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: cli(1) }, C).id; hv({ tipo: 'garantia', id: g4 }, C); const t4 = asigna(g4); hv({ tipo: 'voy', id: g4 }, T(t4));
    hv({ tipo: 'empezar', id: g4, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'sellador' }], firma: F, pide: true } }, T(t4)); hv({ tipo: 'terminar', id: g4, modo: 'pendiente', firma: F }, T(t4));
    const debe = Ax(g4).msgs.some(m => m.k === 'cobro' && !m.env), rz = hv({ tipo: 'rebajar', id: g4, lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], motivo: 'No se cobra el sellador' }, C), X = Ax(g4);
    es(debe && rz.ok && X.tot.total === 0 && X.pago.cobrado && X.pago.modo === '' && !('devolver' in X.rebajas[0]) && !X.msgs.some(m => m.k === 'cobro' && !m.env),
      'rebajado a cero lo que estaba por cobrar: ya no se debe nada y se quita el recordatorio') }
  const g2 = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: cli(1) }, C).id; hv({ tipo: 'garantia', id: g2, de: G1.id }, C); /* de cuál: el primero (el último terminado es otro) */ const t2 = asigna(g2); hv({ tipo: 'voy', id: g2 }, T(t2));
  const e2 = hv({ tipo: 'empezar', id: g2, pres: { lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }], firma: F, pide: true } }, T(t2)), f2 = hv({ tipo: 'terminar', id: g2, firma: F }, T(t2));
  es(e2.ok && f2.ok && Ax(g2).tot.total === 0 && Ax(g2).pago.cobrado && !Ax(g2).msgs.some(m => m.k === 'cobro'), 'todo en garantía: total cero, se empieza y se termina sin cobrar y sin recordatorio de pago');
  const g3 = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: cli(1) }, C).id; hv({ tipo: 'garantia', id: g3, de: G1.id }, C); const t3 = asigna(g3); hv({ tipo: 'voy', id: g3 }, T(t3));
  const n3 = hv({ tipo: 'noacepta', id: g3, firma: F }, T(t3));
  es(n3.ok && Ax(g3).e === 'hecho' && Ax(g3).tot.total === 0, 'en garantía, si al final no se hace nada, la visita tampoco se cobra');
  // la mano de obra va siempre en la garantía, aunque el trabajo de entonces fuera un servicio cerrado (sin horas)
  { const G5 = hecho(cli(5), [{ k: 'grifo' }], 'tarjeta'), g5 = hv({ tipo: 'pedir', av: 'grifo', origen: 'llamada', cli: cli(5) }, C).id;
    es(G5.ok && hv({ tipo: 'garantia', id: g5 }, C).ok && ['grifo', cfg.horas, N.sinTrabajo].every(k => Ax(g5).enGar.k.includes(k)), 'la garantía cubre la mano de obra y la visita aunque el trabajo de entonces no las llevara aparte') }
  // pasado el plazo, ya no hay garantía
  { const fin = K.masMeses(K.madrid(Ax(G1.id).fin).date, cfg.meses); tv = Date.parse(K.masDias(fin, 1) + 'T11:00:00Z');
    const gx = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: cli(1) }, C).id, r = hv({ tipo: 'garantia', id: gx, de: G1.id }, C);
    es(r.err === 'garantia' && !Ax(gx).enGar && Ax(gx).gar0 !== G1.id, 'pasado el plazo de la garantía, ya no se puede poner en garantía'); }
  const zona = K.perfilCliente(SV, cfg, cli(1).tel), zg = zona && zona.avisos.find(x => x.id === g);
  es(zg && zg.enGar && zg.enGar.de === G1.id, 'el cliente ve en su zona que va en garantía');

  // corregir la forma de pago
  const P1 = hecho(cli(2), [{ k: 'desp' }, { k: 'mo', q: 1 }], 'efectivo'), P = () => Ax(P1.id).pago, tp = P().t;
  const rp = [hv({ tipo: 'corregirPago', id: P1.id, modo: 'bizum' }, T(P1.tec)), hv({ tipo: 'corregirPago', id: P1.id, modo: 'efectivo' }, C), hv({ tipo: 'corregirPago', id: P1.id, modo: 'cheque' }, C), hv({ tipo: 'corregirPago', id: g2, modo: 'bizum' }, C)];
  es(rp.map(r => r.err).join() === 'permiso,igual,modo,estado', `corregir la forma de pago: solo la oficina, a otra que exista y en un trabajo terminado, con algo que cobrar y cobrado (${rp.map(r => r.err)})`);
  es(hv({ tipo: 'corregirPago', id: P1.id, modo: 'bizum' }, C).ok && P().modo === 'bizum' && P().cobrado && P().t === tp && /^Forma de pago corregida: efectivo → bizum$/.test(Ax(P1.id).h[Ax(P1.id).h.length - 1].txt),
    'de efectivo a Bizum: sigue cobrado, con la fecha del cobro de entonces, y queda en el historial');
  es(hv({ tipo: 'corregirPago', id: P1.id, modo: 'pendiente' }, C).ok && !P().cobrado && Ax(P1.id).msgs.some(m => m.k === 'cobro' && !m.env), 'si al final no había pagado: queda por cobrar y vuelve el recordatorio');
  es(hv({ tipo: 'corregirPago', id: P1.id, modo: 'tarjeta' }, C).err === 'estado' && hv({ tipo: 'cobrar', id: P1.id, modo: 'tarjeta' }, C).ok && P().cobrado && !Ax(P1.id).msgs.some(m => m.k === 'cobro' && !m.env),
    'lo que está por cobrar se apunta con «Apuntar cobro», no corrigiendo');

  // rebajar el precio
  const B1 = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', cli: cli(3) }, C).id, tb = asigna(B1); hv({ tipo: 'voy', id: B1 }, T(tb));
  const LB = [{ k: 'desp' }, { k: 'mo', q: 2 }, { k: 'juntas' }, { k: 'sifon' }], menos = [{ k: 'desp' }, { k: 'mo', q: 1 }, { k: 'juntas' }];
  hv({ tipo: 'empezar', id: B1, pres: { lineas: LB, firma: F, pide: true } }, T(tb)); const tot0 = Ax(B1).tot.total, otroT = Object.keys(cfg.tec).find(x => x !== tb);
  const rb = [hv({ tipo: 'rebajar', id: B1, lineas: menos, motivo: 'no hizo falta' }, T(otroT)), hv({ tipo: 'rebajar', id: B1, lineas: menos, motivo: ' no ' }, C), hv({ tipo: 'rebajar', id: B1, lineas: LB, motivo: 'lo mismo' }, C),
    hv({ tipo: 'rebajar', id: B1, lineas: LB.concat([{ k: 'latig' }]), motivo: 'más caro' }, C), hv({ tipo: 'rebajar', id: B1, lineas: [], motivo: 'nada de nada' }, C), hv({ tipo: 'rebajar', id: B1, lineas: [{ k: 'nada' }], motivo: 'no existe' }, C), hv({ tipo: 'rebajar', id: B1, lineas: menos, motivo: 'no hizo falta' }, CLI)];
  es(rb.map(r => r.err).join() === 'permiso,motivo,lineas,lineas,lineas,lineas,permiso' && Ax(B1).tot.total === tot0 && !Ax(B1).rebajas, `rebajar: otro técnico no; con motivo; solo a la baja y con algo; si no, no cambia nada (${rb.map(r => r.err)})`);
  const rb1 = hv({ tipo: 'rebajar', id: B1, lineas: menos, motivo: '  Al final   no hizo falta el sifón ' }, T(tb)), XB = Ax(B1), esp = K.precio(cfg, menos, { urg: XB.tot.urg });
  es(rb1.ok && XB.tot.total === esp.total && esp.total < tot0 && XB.rebajas.length === 1 && XB.rebajas[0].antes === tot0 && XB.rebajas[0].ahora === esp.total && XB.rebajas[0].motivo === 'Al final no hizo falta el sifón' && !('devolver' in XB.rebajas[0]) && XB.lin.map(l => l.k).join() === 'desp,mo,juntas',
    'su técnico, trabajando, lo rebaja: queda el precio nuevo, el de antes y el motivo; aún no ha pagado, no hay nada que devolver');
  hv({ tipo: 'terminar', id: B1, modo: 'tarjeta', firma: F }, T(tb)); const t1 = Ax(B1).tot.total;
  es(hv({ tipo: 'rebajar', id: B1, lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], motivo: 'descuento' }, T(tb)).err === 'permiso', 'terminado, el técnico ya no lo rebaja: lo hace la oficina');
  const rb2 = hv({ tipo: 'rebajar', id: B1, lineas: [{ k: 'desp' }, { k: 'mo', q: 1 }], motivo: 'Descuento por la espera' }, C), XB2 = Ax(B1);
  es(rb2.ok && XB2.rebajas.length === 2 && XB2.rebajas[1].devolver === t1 - XB2.tot.total && XB2.pago.cobrado && XB2.pago.modo === 'tarjeta', 'la oficina, ya cobrado: queda apuntado lo que hay que devolverle');
  hv({ tipo: 'facturar', id: B1, num: '2026-0001' }, C);
  es(hv({ tipo: 'rebajar', id: B1, lineas: [{ k: 'desp' }], motivo: 'otra vez' }, C).err === 'facturado', 'facturado ya no se rebaja: eso es una factura rectificativa');
  { const zb = K.perfilCliente(SV, cfg, cli(3).tel).avisos.find(x => x.id === B1); es(zb && zb.rebajas && zb.rebajas.length === 2 && zb.rebajas[1].devolver > 0, 'el cliente ve las rebajas en su zona, y lo que se le devuelve') }

  // el recordatorio del cobro dice cómo pagar; el de trabajo terminado no promete nada adjunto
  const AP = Object.assign({}, Ax(P1.id), { tot: Object.assign({}, Ax(P1.id).tot, { total: 5000 }) });
  const NB = JSON.parse(JSON.stringify(N)); NB.pago = { bizum: '611223344', iban: 'ES96 0000 0000 0001 2345 6789' };
  const NS = JSON.parse(JSON.stringify(N)); delete NS.pago; const mB = K.mensaje(K.cfgDe(NB), AP, 'cobro'), mS = K.mensaje(K.cfgDe(NS), AP, 'cobro');
  es(mB.includes('Puedes pagarlo por Bizum al 611 22 33 44 o por transferencia a la cuenta ES96 0000 0000 0001 2345 6789. ') && mS.includes('Contesta a este mensaje y te decimos cómo pagarlo. ') && !/Bizum|transferencia/.test(mS),
    'el recordatorio del cobro: con el Bizum y la cuenta del negocio; sin ellos, que conteste y se le dice cómo');
  es(!/adjunt/i.test(K.mensaje(cfg, Ax(P1.id), 'hecho')), 'el mensaje de trabajo terminado no dice que lleve el parte adjunto (no lo lleva)');
  { const m2 = K.mensaje(cfg, Ax(g2), 'hecho'), m3 = K.mensaje(cfg, Ax(g3), 'hecho'), m1 = K.mensaje(cfg, Ax(P1.id), 'hecho');
    es(m2.includes('Trabajo terminado. No hay nada que pagar: va en la garantía. ') && m3.includes('no se ha hecho el trabajo y la visita va en la garantía: no hay nada que pagar') && ![m2, m3].some(m => /\(\)|0,00 €|Pagado/.test(m)) && /Total: .+, IVA incluido\. Pagado \(tarjeta\)\./.test(m1),
      `a cero, el mensaje de terminado dice que no hay nada que pagar y por qué, sin «Total: 0,00 €» ni «Pagado ()» (${m2} | ${m3})`) }

  // la huella de los datos del negocio: la misma con otro orden y sin «servidor» ni «textos»; otra si cambia un precio
  const h0 = await K.huellaDatos(PUB), R2 = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(PUB))).reverse()); R2.servidor = { url: 'https://x.test' }; R2.textos = [['a', 'b', 'c']];
  const R3 = JSON.parse(JSON.stringify(PUB)), k3 = Object.keys(R3.catalogo)[0]; R3.catalogo[k3].p10 += 1;
  es(/^[0-9a-f]{16}$/.test(h0) && await K.huellaDatos(R2) === h0 && await K.huellaDatos(R3) !== h0, 'la huella de los datos: igual con otro orden, con o sin «servidor» y «textos»; otra si cambia un precio');
  es(K.canon({ b: 1, a: [1, undefined, { d: 2, c: undefined }], f: () => 1 }) === '{"a":[1,null,{"d":2}],"b":1}', 'canon: claves en orden, sin lo indefinido ni funciones (en una lista, null), como JSON');

  // la parte pública de los datos (17-11-2026): lo que lleva el archivo de datos de una copia con servidor, que es público
  { const P = K.publico(PUB), T0 = PUB.tecnicos[0], sin = x => K.canon(Object.assign({}, x, { tecnicos: null, publico: null }));
    es(P.publico === true && P.tecnicos.length === PUB.tecnicos.length && P.tecnicos.every((t, i) => { const o = PUB.tecnicos[i];
      return Object.keys(t).join() === (o.ap ? 'id,n,ap,tono' : 'id,n,tono') && t.id === o.id && t.n === o.n && t.tono === o.tono && (!o.ap || t.ap === o.ap.trim()[0].toUpperCase() + '.') }),
      'la parte pública: del equipo, solo el id, el nombre, la inicial del apellido y el color');
    es(!/horario|jefe|guardia|furgoneta|coche|foto|Ok/.test(JSON.stringify(P.tecnicos)) && PUB.tecnicos.some(t => t.horario) && T0.ap.length > 2 && Object.keys(T0).length > 4,
      'sin apellidos, horarios, jefe, guardias, furgoneta, coche ni foto (y el original sigue entero: no se ha tocado)');
    es(K.canon(K.publico(P)) === K.canon(P) && sin(P) === sin(PUB) && !('publico' in PUB), 'la parte pública de la parte pública es la misma; lo demás (precios, zonas, franjas…) va igual');
    es(await K.huellaDatos(K.publico(R2)) === await K.huellaDatos(P) && await K.huellaDatos(K.publico(R3)) !== await K.huellaDatos(P) && await K.huellaDatos(P) !== h0,
      'su huella: la misma con otro orden y con o sin «servidor» y «textos», otra si cambia un precio, y no es la de los datos completos');
    const raro = K.publico({ id: 'x', publico: false, tecnicos: [{ id: 'a', n: 'Ana', ap: '  de la Fuente', tono: 1, jefe: 1 }, { id: 'b', n: 'Bo', tono: 2 }, { id: 'c', n: 'Ce', ap: 'Ñúñez', tono: 3 }] });
    es(raro.tecnicos[0].ap === 'D.' && !('ap' in raro.tecnicos[1]) && raro.tecnicos[2].ap === 'Ñ.' && Object.keys(raro).join() === 'id,publico,tecnicos' && raro.publico === true,
      'la inicial, en mayúscula y sin los espacios de delante; sin apellido, sin inicial; «publico: true» va detrás del id, aunque viniera otro');
    const cp = K.cfgDe(P), t = Date.parse('2026-11-17T10:30:00+01:00'), pide = { tipo: 'pedir', av: PUB.averias[0].id, origen: 'cita', cli: { nombre: 'Clara', apellidos: 'Prueba', tel: '611223344', dir: 'C/ de la Prueba 12', cp: Object.keys(PUB.zonas.cp)[0] } };
    const r1 = K.aplicar(K.nuevo(), cp, Object.assign({ cita: { dia: '2026-11-18', fr: PUB.franjas[0].id } }, JSON.parse(JSON.stringify(pide))), { rol: 'cliente' }, t), r2 = K.aplicar(K.nuevo(), cp, JSON.parse(JSON.stringify(pide)), { rol: 'cliente' }, t);
    es((r1.ok || r1.err === 'franja') && r2.ok, `con solo la parte pública, la cita se puede mirar antes de mandarla (los huecos los dice el servidor) y la urgencia pasa (${r1.err || 'ok'})`) }

  // el idioma del cliente (17-11-2026): va en el aviso; sin decirlo, el de su último aviso; lo cambian la oficina o su técnico
  { const cp = K.cfgDe(PUB), SI = K.nuevo(), t0 = Date.parse('2026-11-17T10:30:00+01:00'), av0 = PUB.averias[0].id, cp0 = Object.keys(PUB.zonas.cp)[0], T1 = PUB.tecnicos[0].id, T2 = PUB.tecnicos[1].id;
    const pide = (tel, extra, dt, q) => K.aplicar(SI, cp, Object.assign({ tipo: 'pedir', av: av0, origen: 'llamada', cli: { nombre: 'Núria', apellidos: 'Puig Vila', tel, dir: 'C/ Gran 1', cp: cp0 } }, extra || {}), q || { rol: 'centralita' }, t0 + (dt || 0));
    const de = id => SI.avisos.find(x => x.id === id);
    const r1 = pide('622334455', { idioma: 'ca' }), r2 = pide('622 33 44 55', null, 60000), r3 = pide('633445566', { idioma: 'fr' }, 1000), r4 = pide('633445566', { idioma: 'en' }, 2000), r5 = pide('633445566', { idioma: 'es' }, 3000), r6 = pide('633445566', null, 4000);
    es([r1, r2, r3, r4, r5, r6].every(r => r.ok) && de(r1.id).idioma === 'ca' && de(r2.id).idioma === 'ca' && !('idioma' in de(r3.id)) && de(r4.id).idioma === 'en' && !('idioma' in de(r5.id)) && !('idioma' in de(r6.id)),
      'el idioma del cliente: el que dice al pedir; sin decirlo, el de su último aviso (no el de uno anterior); uno que no existe o el castellano no se apuntan');
    const r8 = pide('633445566', { idioma: 'ca' }, 4500), r9 = pide('633445566', null, 4600);
    es(r8.ok && r9.ok && de(r9.id).idioma === 'ca', 'si su primer aviso iba en castellano y el último en catalán, el nuevo va en catalán');
    de(r2.id).tec = T1; de(r2.id).e = 'asignado';
    const a1 = K.aplicar(SI, cp, { tipo: 'idioma', id: r2.id, idioma: 'en' }, { rol: 'tecnico', id: T2 }, t0), a2 = K.aplicar(SI, cp, { tipo: 'idioma', id: r2.id, idioma: 'en' }, { rol: 'tecnico', id: T1 }, t0);
    es(a1.err === 'permiso' && a2.ok && de(r2.id).idioma === 'en' && de(r2.id).h.slice(-1)[0].txt === 'Idioma del cliente: inglés', 'lo cambia el técnico que lo lleva (otro no), y queda en el historial');
    const a3 = K.aplicar(SI, cp, { tipo: 'idioma', id: r2.id, idioma: 'en' }, { rol: 'centralita' }, t0), a4 = K.aplicar(SI, cp, { tipo: 'idioma', id: r2.id, idioma: 'fr' }, { rol: 'centralita' }, t0);
    const a5 = K.aplicar(SI, cp, { tipo: 'idioma', id: r2.id, idioma: 'es' }, { rol: 'centralita' }, t0), a6 = K.aplicar(SI, cp, { tipo: 'idioma', id: r2.id, idioma: 'ca' }, { rol: 'cliente' }, t0);
    es(a3.err === 'estado' && a4.err === 'idioma' && a5.ok && !('idioma' in de(r2.id)) && a6.err === 'permiso', 'el mismo idioma, «estado»; uno que no existe, «idioma»; el castellano lo quita; el cliente no lo cambia');
    // sus mensajes, en su idioma: la fecha y la franja también; en castellano, igual que sin idioma
    globalThis.OficioIdioma = undefined; require(path.join(sitio, 'js/oficio-idioma.js')); const IDI = globalThis.OficioIdioma;
    const A = JSON.parse(JSON.stringify(de(r1.id))); A.cita = { dia: '2026-11-18', fr: PUB.franjas[0].id }; A.tec = T1;
    const mca = K.mensaje(cp, A, 'cita', IDI.para('ca')), men = K.mensaje(cp, A, 'cita', IDI.para('en')), mes = K.mensaje(cp, A, 'cita', IDI.para('es')), fca = IDI.para('ca').franja(PUB.franjas[0]);
    es(mca.startsWith('Hola, Núria. La teva cita queda per al dimecres 18 de novembre, ' + fca + '. Hi anirà ' + PUB.tecnicos[0].n + '.') && men.startsWith('Hi, Núria. Your appointment is on Wednesday 18 November, ')
      && mes === K.mensaje(cp, A, 'cita') && IDI.lang() === 'es' && !IDI.faltan.size, `los mensajes, en su idioma (${mca.slice(0, 60)}… | ${men.slice(0, 60)}…)`);
    globalThis.OficioIdioma = undefined;
    // con otros datos del cliente, lo que iba en garantía de un trabajo que ya no es suyo deja de ir (lo encontraron los recorridos al azar)
    const G = SI.avisos.find(x => x.id === r6.id); G.e = 'hecho'; G.fin = t0 + 4000; G.tot = { total: 50, lineas: [{ k: Object.keys(cp.cat)[0], q: 1 }] }; G.gar = { hasta: K.masMeses(K.madrid(t0).date, 6) };
    const r7 = pide('633445566', null, 5000), g1 = K.aplicar(SI, cp, { tipo: 'garantia', id: r7.id, de: G.id }, { rol: 'centralita' }, t0 + 6000);
    const c1 = K.aplicar(SI, cp, { tipo: 'completar', id: r7.id, cli: { tel: '644556677', dir: 'C/ Otra 9' } }, { rol: 'centralita' }, t0 + 7000);
    es(g1.ok && c1.ok && !de(r7.id).enGar && /Ya no va en la garantía de .+: con estos datos no es un trabajo suyo/.test(de(r7.id).h.map(x => x.txt).join(' | ')), 'con los datos de otro cliente, deja de ir en garantía (y lo dice el historial)') }

  // el plazo de la garantía en los papeles: el del negocio, no siempre «un año»
  globalThis.OficioIdioma = undefined; require(path.join(sitio, 'js/oficio-papeles.js')); const PP = globalThis.OficioPapeles;
  es(PP.plazo(6) === '6 meses' && PP.plazo(12) === '1 año' && PP.plazo(18) === '18 meses' && PP.plazo(24) === '2 años' && PP.plazo(1) === '1 mes' && PP.plazo(0) === '' && PP.meses('2026-11-17', '2027-05-17') === 6,
    'el plazo dicho como se dice: 6 meses, 1 año, 18 meses, 2 años');
  const txt = h => h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), A6 = JSON.parse(JSON.stringify(Ax(G1.id)));
  A6.gar.hasta = K.masMeses(K.madrid(A6.fin).date, 6);
  const gp = txt(PP.doc(A6, 'garantia', { K, N, cfg, firmaSvg: () => '' })), pa = txt(PP.doc(A6, 'parte', { K, N, cfg, firmaSvg: () => '' })), g12 = txt(PP.doc(Ax(G1.id), 'garantia', { K, N, cfg, firmaSvg: () => '' }));
  es(gp.includes(' 6 meses ') && !gp.includes('1 año') && pa.includes('Garantía de 6 meses, hasta el ') && g12.includes(' 1 año ') && gp.includes('antes de esa fecha'), 'el papel de la garantía y el parte dicen el plazo de verdad (6 meses o 1 año)');
  const pg = txt(PP.doc(Ax(g), 'parte', { K, N, cfg, firmaSvg: () => '' })), pz = txt(PP.doc(Ax(g2), 'parte', { K, N, cfg, firmaSvg: () => '' })), pb = txt(PP.doc(Ax(B1), 'parte', { K, N, cfg, firmaSvg: () => '' }));
  es(pg.includes('va en la garantía') && pz.includes('No hay nada que pagar: va en la garantía.') && /Precio rebajado el .+, de .+ a .+: Al final no hizo falta el sifón/.test(pb), 'los papeles dicen lo que va en garantía y las rebajas, con su motivo');
  { const h = PP.doc(Ax(g2), 'parte', { K, N, cfg, firmaSvg: () => '' }), n = Ax(g2).tot.lineas.length;
    es((h.match(/<b>Incluido<\/b>/g) || []).length === n && (h.match(/<small>[^<]*va en la garantía<\/small>/g) || []).length === n && !/<b>0,00 €<\/b>/.test(h),
      'en el parte, cada línea en garantía dice «Incluido» (no «0,00 €») y que va en la garantía') }
}

// ---------- 51. las fotos, aparte (16-11-2026): con servidor, el aviso lleva la referencia de la foto («f:» y 16 letras) ----------
{ const SV = K.nuevo(); let tv = Date.parse('2026-11-16T10:00:00+01:00'); const hv = (a, q) => K.aplicar(SV, cfg, a, q, tv += M), Ax = id => SV.avisos.find(a => a.id === id);
  const cp = Object.keys(cfg.zonas.cp)[0], cli = n => ({ nombre: 'Fo', apellidos: 'Tos', tel: '60000097' + n, dir: 'C/ de las Fotos ' + n, cp }), REF = 'f:0123456789abcdef';
  const a1 = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', foto: REF, cli: cli(1) }, C).id, a2 = hv({ tipo: 'pedir', av: 'fuga', origen: 'llamada', foto: 'f:0123', cli: cli(2) }, C).id;
  es(Ax(a1).foto === REF && Ax(a2).foto === '' && K.esRef(REF) && !K.esRef('f:0123') && !K.esRef('f:0123456789ABCDEF') && !K.esRef('data:image/png;base64,AAAA'), 'la referencia de una foto vale como foto; mal escrita, no se guarda');
  const n1 = hv({ tipo: 'anotar', id: a1, foto: REF }, C), n2 = hv({ tipo: 'anotar', id: a1, foto: 'f:xyz' }, C);
  es(n1.ok && Ax(a1).fotos.join() === REF && n2.err === 'foto' && Ax(a1).fotos.length === 1, 'al anotar, igual: la referencia vale y una mal escrita se rechaza');
  for (let i = 0; i < 3; i++) hv({ tipo: 'anotar', id: a1, foto: REF }, C);
  es(hv({ tipo: 'anotar', id: a1, foto: REF }, C).err === 'fotos' && Ax(a1).fotos.length === 4, 'y con referencias también caben cuatro fotos por aviso'); }

// ---------- 52. los servicios de la web (18-11-2026): la oficina o el dueño cambian lo que su web enseña ----------
{ const SW = K.nuevo(); let tw = Date.parse('2026-11-18T10:00:00+01:00'); const hw = (a, q) => K.aplicar(SW, cfg, a, q, tw += M);
  const IDS = N.averias.map(x => x.id).filter(id => cfg.av[id] && id !== K.REV), J = N.tecnicos.find(x => x.jefe), NJ = N.tecnicos.find(x => !x.jefe);
  const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(400), REF = 'f:0123456789abcdef';
  const L0 = K.webDe(SW, cfg);
  es(L0.map(x => x.id).join() === IDS.join() && L0.every(x => !x.oculto && !x.cambiado && !x.nPropio && !x.dPropia && x.desde === undefined && x.foto === undefined) && L0[0].n === cfg.av[IDS[0]].n && L0[0].d === cfg.av[IDS[0]].d && !IDS.includes(K.REV),
    'sin cambios, la web enseña las averías del negocio en su orden, con su nombre y su frase (la revisión del contrato no sale)');
  es(K.webPublica(SW) === null && K.webPublica(null) === null, 'sin cambios, no hay nada que dar a la página de citas');
  { const N2 = JSON.parse(JSON.stringify(N)); N2.averias.push(Object.assign({}, N2.averias[0], { id: K.REV })); const c2 = K.cfgDe(N2);
    es(!!c2.av[K.REV] && !K.webDe({}, c2).some(y => y.id === K.REV) && hw({ tipo: 'web', av: K.REV, n: 'Revisión' }, C).err === 'av', 'aunque los datos trajeran una avería «revision» (el validador no lo deja), la revisión del contrato no sale en la web'); }
  const v0 = SW.v, r1 = hw({ tipo: 'web', av: 'fuga', n: '  Fugas   y goteras ', desde: 80, hasta: 150 }, C);
  es(r1.ok && SW.v === v0 + 1 && SW.web.av.fuga.n === 'Fugas y goteras' && SW.web.av.fuga.desde === 80 && SW.web.av.fuga.hasta === 150 && SW.web.av.fuga.t === tw && SW.avisos.length === 0,
    'la oficina cambia el nombre (sin espacios de sobra) y el precio con cita: queda con su hora y sin tocar ningún aviso');
  let L = K.webDe(SW, cfg), x = L.find(y => y.id === 'fuga');
  es(x.n === 'Fugas y goteras' && x.nPropio === true && !x.dPropia && x.d === cfg.av.fuga.d && x.cambiado && x.desde === 80 && x.hasta === 150, 'la lista lo lleva, marcado como nombre propio (no se traduce)');
  es(hw({ tipo: 'web', av: 'atasco', d: 'Lo desatascamos hoy.' }, T(J.id)).ok && SW.web.av.atasco.d === 'Lo desatascamos hoy.' && K.webDe(SW, cfg).find(y => y.id === 'atasco').dPropia === true && K.webDe(SW, cfg).find(y => y.id === 'atasco').d === 'Lo desatascamos hoy.', 'el dueño (técnico jefe) también puede');
  const antes = JSON.stringify(SW.web);
  es(hw({ tipo: 'web', av: 'fuga', n: 'Otro' }, T(NJ.id)).err === 'permiso' && hw({ tipo: 'web', av: 'fuga', n: 'Otro' }, CLI).err === 'permiso' && hw({ tipo: 'web', av: 'fuga', n: 'Otro' }, { rol: 'tecnico', id: 'nadie' }).err === 'permiso' && JSON.stringify(SW.web) === antes,
    'un técnico que no es el dueño, el cliente o alguien que no existe, no');
  es(hw({ tipo: 'web', av: 'nada', n: 'Otro' }, C).err === 'av' && hw({ tipo: 'web', av: K.REV, n: 'Otro' }, C).err === 'av' && hw({ tipo: 'web', av: 3, n: 'Otro' }, C).err === 'av' && hw({ tipo: 'web', n: 'Otro' }, C).err === 'av',
    'solo los servicios que salen en la web');
  const v1 = SW.v;
  es(hw({ tipo: 'web', av: 'fuga', n: 'F' }, C).err === 'webNombre' && hw({ tipo: 'web', av: 'fuga', n: 'x'.repeat(41) }, C).err === 'webNombre' && hw({ tipo: 'web', av: 'fuga', d: 'x'.repeat(141) }, C).err === 'webFrase' && SW.v === v1 && JSON.stringify(SW.web) === antes,
    'un nombre de 1 letra o de 41, o una frase de 141, no valen y no cambian nada');
  es(hw({ tipo: 'web', av: 'grifo', n: 'Gr', d: 'x'.repeat(140) }, C).ok && hw({ tipo: 'web', av: 'grifo', n: 'y'.repeat(40) }, C).ok && SW.web.av.grifo.n === 'y'.repeat(40) && SW.web.av.grifo.d.length === 140, 'de 2 a 40 letras el nombre y hasta 140 la frase, sí');
  es(hw({ tipo: 'web', av: 'grifo', n: '', d: '  ' }, C).ok && !('grifo' in SW.web.av), 'vacíos vuelven a lo de siempre y, sin nada cambiado, el servicio sale de la lista de cambios');
  const P = (de, ha) => hw({ tipo: 'web', av: 'termo', desde: de, hasta: ha }, C).err;
  es(P(0) === 'webPrecio' && P(-5) === 'webPrecio' && P(100000) === 'webPrecio' && P('80') === 'webPrecio' && P(NaN) === 'webPrecio' && P(Infinity) === 'webPrecio' && P(null, 90) === 'webPrecio' && P(90, 80) === 'webPrecio' && P(90, '120') === 'webPrecio' && !('termo' in SW.web.av),
    'el precio: «desde» en euros, más de 0 y hasta 99.999, y «hasta» mayor; si no, nada');
  es(P(99999) === undefined && SW.web.av.termo.desde === 99999 && P(79.555, 79.555) === undefined && SW.web.av.termo.desde === 79.56 && !('hasta' in SW.web.av.termo) && P(90) === undefined && !('hasta' in SW.web.av.termo) && P(90, 120.004) === undefined && SW.web.av.termo.hasta === 120,
    'con céntimos se redondea; «hasta» igual que «desde», o sin él, queda solo «desde»');
  es(P(null, null) === undefined && !('termo' in SW.web.av), 'sin precio, vuelve el del catálogo');
  es(hw({ tipo: 'web', av: 'cisterna', oculto: 'si' }, C).err === 'webOculto' && hw({ tipo: 'web', av: 'cisterna', oculto: true }, C).ok && SW.web.av.cisterna.oculto === true && K.webDe(SW, cfg).find(y => y.id === 'cisterna').oculto,
    'un servicio se puede quitar de la web');
  for (const id of IDS) if (id !== 'otra') hw({ tipo: 'web', av: id, oculto: true }, C);
  const v2 = SW.v, r2 = hw({ tipo: 'web', av: 'otra', oculto: true }, C);
  es(r2.err === 'web' && SW.v === v2 && !SW.web.av.otra, 'pero tiene que quedar al menos uno');
  es(hw({ tipo: 'web', av: 'cisterna', oculto: false }, C).ok && !SW.web.av.cisterna, 'y se vuelve a poner');
  for (const id of IDS) if (SW.web.av[id] && SW.web.av[id].oculto) hw({ tipo: 'web', av: id, oculto: false }, C);
  es(hw({ tipo: 'web', av: 'termo', foto: 'nada' }, C).err === 'foto' && hw({ tipo: 'web', av: 'termo', foto: FOTO }, C).ok && SW.web.av.termo.foto === FOTO && K.webDe(SW, cfg).find(y => y.id === 'termo').foto === FOTO,
    'una foto que vale se pone; otra cosa, no');
  es(hw({ tipo: 'web', av: 'termo', foto: REF }, C).ok && SW.web.av.termo.foto === REF && hw({ tipo: 'web', av: 'termo', foto: '' }, C).ok && !SW.web.av.termo, 'con servidor, la referencia de la foto; y vacía, la de siempre');
  es(hw({ tipo: 'web', av: 'termo', quitar: true }, C).err === 'estado' && hw({ tipo: 'web', av: 'fuga', quitar: 'si' }, C).err === 'estado' && SW.web.av.fuga && hw({ tipo: 'web', av: 'fuga', quitar: true }, C).ok && !SW.web.av.fuga,
    '«Dejarlo como al principio» quita lo cambiado de un servicio; si no había nada, no');
  const O = IDS.slice().reverse();
  es(hw({ tipo: 'web', orden: O }, C).ok && SW.web.orden.join() === O.join() && K.webDe(SW, cfg).map(y => y.id).join() === O.join(), 'el orden se cambia de una vez');
  const O2 = JSON.stringify(SW.web.orden), mal1 = [O.slice(1), O.concat([O[0]]), O.slice(1).concat([O[1]]), O.slice(0, -1).concat(['nada']), 'fuga', O.slice(0, -1).concat([K.REV])];
  es(mal1.every(o => hw({ tipo: 'web', orden: o }, C).err === 'web') && hw({ tipo: 'web', orden: O, av: 'fuga' }, C).err === 'web' && hw({ tipo: 'web', orden: O }, T(NJ.id)).err === 'permiso' && JSON.stringify(SW.web.orden) === O2,
    'un orden al que le falta, le sobra o repite un servicio, o que trae otro que no sale, no vale');
  SW.web.orden = [O[0], 'viejo', O[0]]; L = K.webDe(SW, cfg);
  es(L.map(y => y.id).join() === [O[0]].concat(IDS.filter(id => id !== O[0])).join(), 'un orden guardado incompleto (un servicio nuevo en los datos) pone primero lo que trae y después el resto, en su orden');
  hw({ tipo: 'web', orden: IDS }, C);
  const SX = K.nuevo(); SX.web = { av: { fuga: { n: 'Fugas', desde: 80, t: 1 }, grifo: { oculto: true, foto: REF, t: 2 } }, orden: ['grifo'] };
  const Pub = K.webPublica(SX);
  es(JSON.stringify(Pub) === JSON.stringify({ av: { fuga: { n: 'Fugas', desde: 80 }, grifo: { oculto: true, foto: REF } }, orden: ['grifo'] }) && Pub.orden !== SX.web.orden, 'lo que va a la página de citas: lo mismo, sin la hora, y copiado');
  SX.web = { av: [], orden: [] };
  es(K.webPublica(SX) === null && K.webDe(SX, cfg).every(y => !y.cambiado), 'unos cambios mal guardados no cuentan');
  const pf = K.webPrecios(cfg, { id: 'fuga' }), pr = K.rango(cfg, 'fuga', false), pu = K.rango(cfg, 'fuga', true), sup = cfg.cat[cfg.urge].p10;
  es(pf.a === pr.a && pf.b === pr.b && pf.u === pr.a + sup && pf.un === pu.a + sup && !pf.propio, 'los precios de la web sin cambios: los del catálogo, y el urgente de día y de noche con el suplemento');
  const po = K.webPrecios(cfg, { id: 'fuga', desde: 80, hasta: 150 }), p2 = K.webPrecios(cfg, { id: 'fuga', desde: 79.5, hasta: 70 });
  es(po.a === 8000 && po.b === 15000 && po.u === 8000 + sup && po.un === Math.round(80 * (1 + cfg.recargo)) * 100 + sup && po.propio && p2.a === 7950 && p2.b === null && p2.un === 11100 + sup && K.webPrecios(cfg, { id: 'nada' }) === null,
    'con su precio: el de noche lleva el recargo en euros redondos, como en la web; un «hasta» menor no cuenta'); }

console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}.`);
process.exit(mal ? 1 : 0);
