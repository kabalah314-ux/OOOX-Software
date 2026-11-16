// ¿Valen las pruebas del juez? Se le quita adrede una protección cada vez y se pasan las pruebas.
// Si siguen en verde, falta una prueba. Objetivo: todas cazadas.
// Uso: node mutantes-juez.mjs <carpeta del sitio>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url)), sitio = process.argv[2];
if (!sitio) { console.log('Uso: node mutantes-juez.mjs <carpeta del sitio>'); process.exit(2); }
const SRV = path.resolve(process.env.OFICIOS_SERVIDOR_ORIGEN || path.join(aqui, '../../oficios-servidor')), JUEZ = fs.readFileSync(path.join(SRV, 'juez.mjs'), 'utf8');

// [qué protección se quita, texto que hay, texto que se pone]
const M = [
  // la hora de lo hecho sin conexión y la huella de los datos (16-11-2026)
  ['lo hecho sin conexión se apunta con la hora en que llega', "t = horaDe(ahora(), cuando, typeof accion.id === 'string' ? S.avisos.find(a => a.id === accion.id) : null);", 't = ahora();'],
  ['lo hecho sin conexión puede ser de hace un mes', 'let t = hace > 0 ? n - Math.min(hace, HACE_MAX) : n;', 'let t = hace > 0 ? n - hace : n;'],
  ['lo hecho sin conexión puede quedar antes de lo último del aviso', 'if (A && Array.isArray(A.h)) for (const x of A.h) if (x && Number.isFinite(x.t) && x.t > t) t = Math.min(x.t, n);', ''],
  ['el juez se cree la hora del reloj del aparato', "cuando.t > 0 ? cuando.ya - cuando.t : 0;\n  let t = hace > 0 ? n - Math.min(hace, HACE_MAX) : n;", "cuando.t > 0 ? cuando.ya - cuando.t : 0;\n  let t = hace > 0 ? Math.min(cuando.t, n) : n;"],
  ['al entrar no se dice la huella de los datos', ", v: neg.v || 0, huella: await huella(neg) }; },", ", v: neg.v || 0 }; },"],
  ['al leer no se dice la huella de los datos', "return { ok: true, huella: await huella(neg), cambios:", "return { ok: true, cambios:"],
  ['al hacer no se dice la huella de los datos', "cambios: await cambios(n2, w.q, p.desde), huella: await huella(n2) })", "cambios: await cambios(n2, w.q, p.desde) })"],
  ['tras diez códigos fallados se sigue entrando con el bueno', "if (e === 'bloqueo') return R('bloqueo');", "if (e === 'bloqueo') return { ok: true, q: { rol: 'centralita', id: 'oficina' } };"],
  ['un bloqueo se confunde con un código malo', "if (e === 'bloqueo') return R('bloqueo');", ''],
  ['el juez no le dice al almacén desde qué conexión llaman', "texto(p.red, 80) ? p.red : ''", "''"],
  ['entra un técnico que no está en los datos del negocio', "if (e.rol === 'tecnico' && !cfg.tec[e.id]) return R('clave');", ''],
  ['un negocio dado de baja sigue entrando', 'return n && n.activo && n.datos ? n : null;', 'return n && n.datos ? n : null;'],
  ['un negocio que no existe contesta distinto que un código malo', ": 'clave');   // un negocio", ": 'negocio');   // un negocio"],
  ['un técnico recibe los avisos de todos', 'if (fila.datos.tec === q.id) return { id: fila.id, v: fila.v, datos: fila.datos };', 'if (true) return { id: fila.id, v: fila.v, datos: fila.datos };'],
  ['«ya no es tuyo» lleva los datos del aviso', '? { id: fila.id, v: fila.v, fuera: true } : null;', '? { id: fila.id, v: fila.v, fuera: true, datos: fila.datos } : null;'],
  ['todos los técnicos se enteran de cada aviso que cambia', "return (fila.de || []).includes(q.id) ?", 'return true ?'],
  ['quien no es de la casa recibe avisos', "if (q.rol !== 'tecnico') return null;", ''],
  ['un técnico recibe las ausencias y los contadores de la casa', 'let cab = { esq: cb.esq };', 'let cab = cb;'],
  ['el tiempo de urgencia dice quién va', 'urg: u ? { de: u.de, a: u.a } : null', 'urg: u'],
  ['el barrio que da el cliente no se mira', "const dis = typeof q.dis === 'string' && Object.prototype.hasOwnProperty.call(cfg.zonas.dis, q.dis) ? q.dis : null", 'const dis = null'],
  ['los contratos no se marcan al cambiar', 'if (JSON.stringify(S.contratos || []) !== contAntes) S.vc = S.v;', ''],
  ['la oficina ya no vuelve a recibir los contratos', 'if (d > 0 && !((cb.vc || 0) > d)) delete cab.contratos;', 'if (d > 0) delete cab.contratos;'],
  ['la oficina recibe todos los contratos con cada cambio', 'if (d > 0 && !((cb.vc || 0) > d)) delete cab.contratos;', ''],
  ['la versión de los contratos no se guarda', ', nc: S.nc || 0, vc: S.vc || 0, furgos:', ', nc: S.nc || 0, furgos:'],
  ['siempre se manda todo, aunque el aparato vaya al día', 'const d = Number.isInteger(desde) && desde > 0 && desde <= (neg.v || 0) ? desde : 0;', 'const d = 0;'],
  ['una versión del futuro se da por buena', ' && desde <= (neg.v || 0) ? desde : 0;', ' ? desde : 0;'],
  ['una acción repetida se hace dos veces', 'if (clave) { const ya = await almacen.hecha(neg.id, clave);', 'if (false) { const ya = await almacen.hecha(neg.id, clave);'],
  ['la marca de una persona le vale a otra', "(q.rol === 'cliente' ? 'web' : q.rol + ':' + q.id) + '|' + marca", 'marca'],
  ['una marca de una letra cuenta como marca', 'marca.length >= 12', 'marca.length >= 1'],
  ['si alguien se adelanta, la acción se pierde', 'for (let i = 0; i < TOPES.intentos; i++) {\n      const neg = i ?', 'for (let i = 0; i < 1; i++) {\n      const neg = i ?'],
  ['lo que rechazan las reglas se intenta guardar', "if (!r.ok) return { res: R(r.err, { v: neg.v || 0 }) };", ''],
  ['un aviso nuevo se queda sin llave de enlace', 'a.llave = llave(); nuevos.push', "a.llave = ''; nuevos.push"],
  ['no se apunta quién ha llevado cada aviso', 'if (a.tec) de.add(a.tec);', ''],
  ['el cliente ve una foto vieja de su aviso', 'vista: K.vistaCliente(S, cfg, a.id) };', 'vista: (f && f.vista) || K.vistaCliente(S, cfg, a.id) };'],
  ['los contadores no se guardan', 'cab: cabDe(S), avisos: guardar,', 'cab: neg.cab, avisos: guardar,'],
  ['los avisos se guardan con la versión vieja', 'return { id: a.id, v: S.v, datos: a, de: [...de],', 'return { id: a.id, v: neg.v || 0, datos: a, de: [...de],'],
  ['la respuesta no trae lo cambiado', "return n2 ? Object.assign({}, res, { cambios: await cambios(n2, w.q, p.desde), huella: await huella(n2) }) : res;", 'return res;'],
  ['por la puerta de la web pasa cualquier acción', "|| a.tipo !== 'pedir') return R('permiso');", ") return R('permiso');"],
  ['la web puede decir que la cita entró por teléfono', "{ origen: a.origen === 'web' ? 'web' : 'cita' }", '{}'],
  ['quien pide en la web entra como si fuera la oficina', "{ rol: 'cliente', id: '' }, Object.assign", "{ rol: 'centralita', id: 'oficina' }, Object.assign"],
  ['pedir desde la web no tiene freno', "TOPES.pedirTodos[0], TOPES.pedirTodos[1]))) return R('limite');", "TOPES.pedirTodos[0], TOPES.pedirTodos[1]))) { /* sin freno */ }"],
  ['la web recibe más que su número y su llave', "return { ok: true, id: res.r.id, llave: mio ? mio.llave : '' };", "return Object.assign({}, res, { id: res.r.id, llave: mio ? mio.llave : '' });"],
  ['los huecos llevan las cifras de la casa', 'franjas: d.franjas.map(f => ({ id: f.id, ok: !!f.ok })) }))', 'franjas: d.franjas }))'],
  ['a la web se le enseñan los huecos de la oficina', '({ id: f.id, ok: !!f.ok })', '({ id: f.id, ok: !!f.okOf })'],
  ['una acción enorme llega a las reglas', "if (n > TOPES.accion) return R('grande');", ''],
  ['un fallo del almacén sale hacia fuera', "catch (e) { try { aviso(e); } catch (x) { /* nada */ } return R('servidor'); }", 'catch (e) { throw e; }'],
  ['un fallo del almacén no queda apuntado', 'try { aviso(e); } catch (x) { /* nada */ }', ''],
  ['una petición que no existe se intenta atender', '|| !QUE.includes(p.que)) return R(\'peticion\');', ") return R('peticion');"],
  // la zona del cliente
  ['se da el código de un cliente sin el código de la oficina', "const w = await quien(neg, cfg, p); if (!w.ok) return w;\n      if (w.q.rol !== 'centralita')", "const w = { ok: true, q: { rol: 'centralita', id: 'oficina' } };\n      if (w.q.rol !== 'centralita')"],
  ['un técnico puede dar el código de la zona de un cliente', "if (w.q.rol !== 'centralita') return R('permiso');", ''],
  ['se da código a un teléfono sin ningún aviso', "if (!K.perfilCliente((await carga(neg)).S, cfg, tel)) return R('nadie');", ''],
  ['el código se da para el teléfono tal cual está escrito', "const tel = K.tel9(p.tel); if (!tel) return R('tel');", "const tel = String(p.tel || ''); if (!tel) return R('tel');"],
  ['«cambiar el código» no lo cambia', 'const ya = p.cambia === true ? null : await almacen.cliente(neg.id, tel);', 'const ya = await almacen.cliente(neg.id, tel);'],
  ['cada vez que la oficina lo pide sale un código nuevo', 'const ya = p.cambia === true ? null : await almacen.cliente(neg.id, tel);', 'const ya = null;'],
  ['se vuelve a mandar un código dado de baja', 'if (ya && ya.activo && limpiaCodigo(ya.codigo) === ya.codigo)', 'if (ya && limpiaCodigo(ya.codigo) === ya.codigo)'],
  ['el código del cliente se queda corto', 'const s = llaveNueva(8);', 'const s = llaveNueva(6);'],
  ['un código escrito con mayúsculas no vale', "const x = c.toLowerCase().replace(/[^a-z0-9]/g, '');", "const x = c.replace(/[^a-z0-9]/g, '');"],
  ['vale un código con letras que no se usan', '[...x].every(ch => LETRAS.includes(ch))', 'true'],
  ['la zona mira el teléfono tal cual está escrito', 'const tel = K.tel9(p.tel), codigo = limpiaCodigo(p.codigo);', 'const tel = String(p.tel || \'\'), codigo = limpiaCodigo(p.codigo);'],
  ['la zona no le dice al almacén desde qué conexión llaman', "texto(p.red, 80) ? String(p.red) : ''", "''"],
  ['un bloqueo de la zona se confunde con un código malo', "if (ok === 'bloqueo') return R('bloqueo');", ''],
  ['cualquier código abre la zona de un cliente', "if (ok !== true) return R('clave');", ''],
  ['la zona de un cliente lleva los avisos de todos', 'const { S, filas } = await carga(neg), Pf = K.perfilCliente(S, cfg, tel);', 'const { S, filas } = await carga(neg), Pf = Object.assign(K.perfilCliente(S, cfg, tel) || {}, { avisos: S.avisos.map(a => Object.assign({}, a)) });'],
  ['la zona no lleva la llave de cada aviso', "a.llave = f && f.llave ? f.llave : '';", "a.llave = '';"],
  // la furgoneta (16-11-2026)
  ['la furgoneta no se guarda en el servidor', ', furgos: S.furgos || {} });', ' });'],
  ['un técnico recibe todas las furgonetas', 'cab.furgos = F ? { [q.id]: F } : {};', 'cab.furgos = cb.furgos || {};'],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mutantes-juez-'));
fs.copyFileSync(path.join(SRV, 'almacen-memoria.mjs'), path.join(tmp, 'almacen-memoria.mjs'));
const pruebas = [path.join(aqui, 'prueba-juez.mjs'), path.join(aqui, 'azar-juez.mjs')].filter(f => fs.existsSync(f));
const corre = () => pruebas.findIndex(f => spawnSync(process.execPath, [f, sitio].concat(f.endsWith('azar-juez.mjs') ? ['--tandas', '12'] : []), { encoding: 'utf8', timeout: 240000, env: Object.assign({}, process.env, { OFICIOS_SERVIDOR: tmp }) }).status !== 0);
fs.writeFileSync(path.join(tmp, 'juez.mjs'), JUEZ);
if (corre() !== -1) { console.log('Las pruebas del juez ya fallan sin estropear nada: arregla eso primero.'); process.exit(2); }
let cazados = 0, porEjemplos = 0; const vivos = [], rotos = [];
for (const [que, hay, pongo] of M) {
  const n = JUEZ.split(hay).length - 1;
  if (n !== 1) { rotos.push(que + ' (el texto aparece ' + n + ' veces)'); continue; }
  fs.writeFileSync(path.join(tmp, 'juez.mjs'), JUEZ.replace(hay, pongo));
  const i = corre();
  if (i === -1) vivos.push(que); else { cazados++; if (i === 0) porEjemplos++; }
}
fs.rmSync(tmp, { recursive: true, force: true });
rotos.forEach(x => console.log('  NO SE PUEDE APLICAR  ' + x));
vivos.forEach(x => console.log('  SOBREVIVE  ' + x));
const validos = M.length - rotos.length;
console.log((vivos.length || rotos.length ? 'MAL' : 'BIEN') + ': ' + cazados + ' de ' + validos + ' protecciones del juez quitadas adrede se cazan: ' + porEjemplos + ' con los ejemplos y ' + (cazados - porEjemplos) + ' con los recorridos al azar');
process.exit(vivos.length || rotos.length ? 1 : 0);
