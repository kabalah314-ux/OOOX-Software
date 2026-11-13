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
  ['un técnico recibe las ausencias y los contadores de la casa', 'cab: esC ? c.cab : { esq: (c.cab || {}).esq },', 'cab: c.cab,'],
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
  ['la respuesta no trae lo cambiado', "return n2 ? Object.assign({}, res, { cambios: await cambios(n2, w.q, p.desde) }) : res;", 'return res;'],
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
