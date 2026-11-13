// Prueba del validador: se estropea un dato cada vez en un archivo bueno y el validador tiene que decirlo.
// Uso: node prueba-valida.mjs <carpeta del sitio>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { valida, leeNucleo, leeNegocio } from './valida-negocio.mjs';

const sitio = process.argv[2]; if (!sitio) { console.log('Uso: node prueba-valida.mjs <carpeta del sitio>'); process.exit(2) }
const aqui = path.dirname(fileURLToPath(import.meta.url)), K = leeNucleo(sitio), HOY = '2026-11-13';
const R = leeNegocio(path.join(sitio, 'js/oficio-datos.js')).N, V = leeNegocio(path.join(aqui, 'negocios/voltio.js')).N;
const clon = o => JSON.parse(JSON.stringify(o));
let ok = 0, mal = 0; const es = (c, t) => { if (c) ok++; else { mal++; console.log('  FALLA: ' + t) } };

es(valida(R, K, HOY).errores.length === 0, 'el negocio de muestra no tiene errores');
es(valida(V, K, HOY).errores.length === 0, 'el negocio de prueba no tiene errores');
[null, undefined, {}, [], 'hola', 7].forEach(x => { let r; try { r = valida(x, K, HOY) } catch (e) { r = null } es(r && r.errores.length > 0, 'con ' + JSON.stringify(x) + ' no revienta y da error') });

// [qué se estropea, cómo, sobre qué negocio]
const ROTOS = [
  ...['id', 'serie', 'nombre', 'marca', 'razon', 'nif', 'dir', 'ciudad', 'tel', 'resenas', 'pack', 'garantiaMeses', 'sinTrabajo', 'tarifa', 'festivos', 'tecnicos', 'zonas', 'franjas', 'catalogo', 'averias'].map(k => ['falta «' + k + '»', N => { delete N[k] }]),
  ['falta el cupo en un negocio sin horarios', N => { N.tecnicos.forEach(x => { delete x.horario; delete x.guardia }); delete N.horario; delete N.citas; delete N.cupo }],
  ['un pack que ya no existe', N => { N.pack = 'basico' }],
  ['la serie en minúsculas', N => { N.serie = 'r1' }],
  ['un teléfono de tres cifras', N => { N.tel = '123' }],
  ['un NIF sin letra', N => { N.nif = '12345678' }],
  ['el horario de tarifa al revés', N => { N.tarifa.dia = [1200, 480] }],
  ['un recargo del 500 %', N => { N.tarifa.recargo = 5 }],
  ['un festivo que no existe', N => { N.festivos.push('2027-02-30') }],
  ['los festivos desordenados', N => { N.festivos.reverse() }],
  ['un festivo repetido', N => { N.festivos.push(N.festivos[N.festivos.length - 1]) }],
  ['la lista de festivos a punto de acabarse', N => { N.festivos = N.festivos.filter(f => f < '2027-03-01') }],
  ['sin técnicos', N => { N.tecnicos = [] }],
  ['dos técnicos con el mismo id', N => { N.tecnicos[1].id = N.tecnicos[0].id }],
  ['un técnico sin nombre', N => { N.tecnicos[0].n = '' }],
  ['una zona con una banda que no existe', N => { Object.values(N.zonas.dis)[0][1] = 'zz' }],
  ['un código postal que lleva a una zona que no existe', N => { N.zonas.cp[Object.keys(N.zonas.cp)[0]] = 'zz' }],
  ['un código postal de cuatro cifras', N => { N.zonas.cp['0800'] = Object.keys(N.zonas.dis)[0] }],
  ['dos franjas que se pisan', N => { N.franjas[1].de = N.franjas[0].de + 10 }],
  ['una franja al revés', N => { N.franjas[0].a = N.franjas[0].de - 30 }],
  ['dos franjas con el mismo id', N => { N.franjas[1].id = N.franjas[0].id }],
  ['un precio a cero', N => { const k = Object.keys(N.catalogo)[0]; N.catalogo[k].p10 = 0 }],
  ['un precio con tres decimales', N => { const k = Object.keys(N.catalogo)[0]; N.catalogo[k].p10 = 30.125 }],
  ['un concepto con dos precios', N => { const k = Object.keys(N.catalogo)[0]; N.catalogo[k].p21 = 40 }],
  ['una unidad que no es «h»', N => { const k = Object.keys(N.catalogo)[0]; N.catalogo[k].un = 'kg' }],
  ['horas sin paso', N => { const k = Object.keys(N.catalogo).find(x => N.catalogo[x].un === 'h'); delete N.catalogo[k].paso }],
  ['un mínimo que no es múltiplo del paso', N => { const k = Object.keys(N.catalogo).find(x => N.catalogo[x].un === 'h'); N.catalogo[k].min = N.catalogo[k].paso * 1.5 }],
  ['un concepto llamado «otro»', N => { N.catalogo.otro = { t: 'Otro concepto', p10: 5 } }],
  ['«sin trabajo» apunta a un material', N => { N.sinTrabajo = Object.keys(N.catalogo).find(x => N.catalogo[x].mat) }],
  ['una avería con un concepto que no está en el catálogo', N => { N.averias[0].ini.push({ k: 'zz' }) }],
  ['una avería con un añadido que no está en el catálogo', N => { N.averias[0].chips.push('zz') }],
  ['dos averías con el mismo id', N => { N.averias[1].id = N.averias[0].id }],
  ['una avería con el máximo por debajo del mínimo', N => { const a = N.averias.find(x => x.max); a.max = [a.min[0]]; a.min = a.min.concat(a.min.map(l => ({ k: l.k, q: 3 }))).concat(Object.keys(N.catalogo).filter(k => N.catalogo[k].mat).slice(0, 2).map(k => ({ k, q: 5 }))) }],
  ['una hora peninsular que no es', N => { N.zona = 'Atlantic/Canary' }],
  ['un horario con un día 9', N => { N.tecnicos[0].horario = { 9: [[480, 840]] } }, V],
  ['un horario con los tramos pisados', N => { N.tecnicos[0].horario[1] = [[480, 840], [800, 900]] }, V],
  ['un técnico sin horario cuando los demás lo tienen', N => { delete N.tecnicos[1].horario }, V],
  ['tanta reserva que no cabe ninguna cita', N => { N.citas.reserva = 8 }, V],
  ['cero citas por franja', N => { N.citas.porFranja = 0 }, V],
  ['un mapa que no es un objeto', N => { N.mapa = 'sí' }],
  ['un mapa de fondo sin https', N => { N.mapa = { teselas: 'http://ejemplo.es/{z}/{x}/{y}.png', firma: 'Ejemplo' } }],
  ['un mapa de fondo sin {z}, {x}, {y}', N => { N.mapa = { teselas: 'https://ejemplo.es/mapa.png', firma: 'Ejemplo' } }],
  ['un mapa de fondo sin la firma de quien lo da', N => { N.mapa = { teselas: 'https://ejemplo.es/{z}/{x}/{y}.png' } }],
  ['un dato de mapa que la app no usa', N => { N.mapa = { clave: 'abc' } }],
  ['la firma del mapa con un enlace que no es https', N => { N.mapa.firmaUrl = 'javascript:alert(1)' }],
  ['«prueba» con un texto', N => { N.prueba = 'sí' }],
];
for (const [que, rompe, base] of ROTOS) {
  const N = clon(base || R); let r;
  try { rompe(N); r = valida(N, K, HOY) } catch (e) { r = { errores: [], revienta: e.message } }
  es(r.errores.length > 0, que + (r.revienta ? ' (el validador revienta: ' + r.revienta + ')' : ' (el validador no dice nada)'));
}
{ const F = clon(R); F.tecnicos.forEach(x => { delete x.horario; delete x.guardia }); delete F.horario; delete F.citas; F.cupo = 2;
  es(valida(F, K, HOY).errores.length === 0, 'el negocio de muestra sin horarios, con su número fijo de citas por franja, también vale') }
{ const M1 = clon(R); M1.mapa = {}; const M2 = clon(V); M2.prueba = true;
  es(valida(M1, K, HOY).errores.length === 0 && valida(M1, K, HOY).avisos.some(t => /mapa/.test(t)) && valida(M2, K, HOY).errores.length === 0 && valida(R, K, HOY).avisos.some(t => /OpenStreetMap/.test(t)),
    'un mapa vacío vale (sin mapa de fondo), una copia de prueba vale, y con el servidor gratuito de OpenStreetMap se avisa de que es solo para una demo') }
// las caducidades: lo mismo que hoy pasa, dentro de un año tiene que fallar
es(valida(R, K, '2027-08-01').errores.some(t => /festivos/.test(t)), 'con la fecha de dentro de nueve meses, avisa de que hay que renovar los festivos');
es(valida(R, K, '2026-12-28').avisos.some(t => /festivos/.test(t)) && valida(R, K, '2026-12-28').errores.length === 0, 'cuando queda menos de un año, lo dice como aviso, sin parar nada');
console.log((mal ? 'MAL' : 'BIEN') + ': ' + ok + ' comprobaciones pasan' + (mal ? ', ' + mal + ' fallan' : '') + '.');
process.exit(mal ? 1 : 0);
