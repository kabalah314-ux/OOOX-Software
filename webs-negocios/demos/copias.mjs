// Copias de la app de oficios: una por negocio.
//
// Cada copia lleva los archivos COMUNES (las pantallas y las reglas, iguales en todas) y lo SUYO: un archivo de datos
// (js/oficio-datos.js) y, si las tiene, sus fotos de averías. Esta herramienta crea copias, las pone al día cuando cambia
// lo común y dice cómo está cada una. Nunca toca el archivo de datos de una copia.
//
//   node copias.mjs nueva --datos <archivo.js>     crea la copia del negocio de ese archivo (la carpeta es su «id»)
//   node copias.mjs actualizar --todas | <id>…     pone al día lo común; cada copia pasa sus pruebas antes de cambiarse
//   node copias.mjs lista                          qué copias hay, con qué versión, y si van al día
//   node copias.mjs comprueba                      lo de «lista», pero falla si alguna no va al día o sus datos no valen
//                                                  (una copia «fijada» puede ir por detrás: no cuenta como fallo)
//   node copias.mjs atras <id> [--a <commit>]      vuelve esa copia a como estaba antes de su última puesta al día
//                                                  (o a ese commit), con git; queda fijada para que no se ponga al día sola
//   node copias.mjs fija <id> [--motivo "…"]       la deja quieta: «actualizar --todas» se la salta
//   node copias.mjs suelta <id>                    la vuelve a dejar poner al día
//
// Publicar por fases: fijar las que esperan, «actualizar --todas» (solo se ponen al día las sueltas), mirar un día y
// soltar las demás. Si algo va mal en una: «atras <id>».
//
//   --plantilla <carpeta>   de dónde sale lo común (por defecto, la demo: frontend/public/demos/ramirez-24h)
//   --destino <carpeta>     dónde viven las copias (por defecto, frontend/public/oficios)
//                           En la copia del PC, sin repositorio, lo común sale de ../site y las copias viven en ../oficios
//   --sin-azar              no pasar los recorridos al azar al actualizar (solo se valida el archivo de datos)
//
// Una copia que no pasa la validación o las pruebas se queda como estaba; las demás siguen. La salida es el número de fallos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { valida, leeNucleo, leeNegocio } from './pruebas-reglas/valida-negocio.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const COMUNES = ['app.html', 'cita.html', 'cliente.html', 'oficio.css', 'js/oficio-nucleo.js', 'js/oficio-espejo.js', 'js/oficio-estado.js', 'js/oficio-soporte.js', 'js/oficio-papeles.js', 'js/oficio-vigia.js',
  'assets/fuentes/barlow-400.woff2', 'assets/fuentes/barlow-500.woff2', 'assets/fuentes/barlow-600.woff2', 'assets/fuentes/barlow-condensed-600.woff2', 'assets/fuentes/barlow-condensed-700.woff2', 'assets/fuentes/barlow-condensed-800.woff2'];
const DATOS = 'js/oficio-datos.js', FICHA = 'copia.json';
// la portada de una copia: lleva a pedir cita. La web del negocio, si la tiene, es otra cosa y va aparte.
const PORTADA = n => `<!doctype html>\n<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">\n<title>${n}</title><meta http-equiv="refresh" content="0;url=cita.html">\n<p><a href="cita.html">Pedir cita</a> · <a href="app.html">Entrar a la oficina</a></p>\n</html>\n`;

const huella = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hoy = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const idVale = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{1,39}$/.test(id);

function copiaComunes(plantilla, destino) {
  for (const f of COMUNES) { const a = path.join(plantilla, f), b = path.join(destino, f); if (!fs.existsSync(a)) throw new Error('A la plantilla le falta ' + f); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b) }
}
const version = sitio => { try { return leeNucleo(sitio).VERSION || '' } catch (e) { return '' } };
/** Cómo está una copia frente a la plantilla: qué archivos comunes le faltan o son distintos. */
export function estado(plantilla, carpeta) {
  for (const f of COMUNES) if (!fs.existsSync(path.join(plantilla, f))) throw new Error('A la plantilla le falta ' + f);
  const dif = COMUNES.filter(f => !fs.existsSync(path.join(carpeta, f)) || huella(path.join(carpeta, f)) !== huella(path.join(plantilla, f)));
  let ficha = {}; try { ficha = JSON.parse(fs.readFileSync(path.join(carpeta, FICHA), 'utf8')) } catch (e) {}
  return { alDia: dif.length === 0, dif, ficha, version: version(carpeta) };
}
/** Valida el archivo de datos con las reglas de «sitio». Devuelve {N, errores, avisos}. */
function mira(sitio, archivo) {
  let N, muestra; try { ({ N, muestra } = leeNegocio(archivo)) } catch (e) { return { N: null, errores: ['No se puede leer el archivo de datos: ' + e.message], avisos: [] } }
  // una demo trae su muestra y no va con servidor: no tiene buzón ni personas de verdad
  const demo = typeof muestra === 'function' && !(N && N.servidor);
  const r = valida(N, leeNucleo(sitio), hoy()); return { N, demo, errores: r.errores, avisos: r.avisos };
}
const azar = (sitio, archivo) => { const r = spawnSync(process.execPath, [path.join(aqui, 'pruebas-reglas/azar.mjs'), sitio, '--negocio', archivo, '--tandas', '6', '--semilla', '20261113'], { encoding: 'utf8', timeout: 240000 }); return { ok: r.status === 0, salida: (r.stdout || '') + (r.stderr || '') } };
export const copiasDe = destino => fs.existsSync(destino) ? fs.readdirSync(destino).filter(d => !d.startsWith('.') && fs.existsSync(path.join(destino, d, DATOS))).sort() : [];

/** Crea la copia de un negocio. Devuelve {ok, id, carpeta, errores, avisos}. */
export function nueva({ plantilla, destino, datos }) {
  if (!datos || !fs.existsSync(datos)) return { ok: false, errores: ['No encuentro el archivo de datos: ' + datos], avisos: [] };
  const m = mira(plantilla, datos); if (m.errores.length) return { ok: false, errores: m.errores, avisos: m.avisos };
  const id = m.N.id; if (!idVale(id)) return { ok: false, errores: ['El «id» del negocio («' + id + '») tiene que ir en minúsculas, con letras, números y guiones: es el nombre de su carpeta.'], avisos: m.avisos };
  const carpeta = path.join(destino, id);
  if (fs.existsSync(carpeta)) return { ok: false, errores: ['Ya hay una copia en ' + carpeta + '. Para ponerla al día: node copias.mjs actualizar ' + id], avisos: m.avisos };
  // se monta aparte y solo se pone en su sitio si sale entera
  fs.mkdirSync(destino, { recursive: true }); const tmp = fs.mkdtempSync(path.join(destino, '.nueva-'));
  try {
    copiaComunes(plantilla, tmp); fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); fs.copyFileSync(datos, path.join(tmp, DATOS));
    // sus fotos de averías, si están junto al archivo de datos (en ../assets/img o en ./img)
    for (const d of [path.join(path.dirname(datos), '../assets/img'), path.join(path.dirname(datos), 'img')]) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (/^av-[a-z0-9-]+-s\.webp$/.test(f)) { fs.mkdirSync(path.join(tmp, 'assets/img'), { recursive: true }); fs.copyFileSync(path.join(d, f), path.join(tmp, 'assets/img', f)) }
    fs.writeFileSync(path.join(tmp, 'index.html'), PORTADA(esc(m.N.nombre)));
    const v = version(plantilla);
    fs.writeFileSync(path.join(tmp, FICHA), JSON.stringify({ id, nombre: m.N.nombre, creada: hoy(), actualizada: hoy(), version: v, prueba: m.N.prueba === true }, null, 1) + '\n');
    fs.chmodSync(tmp, 0o755); fs.renameSync(tmp, carpeta);
  } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); return { ok: false, errores: ['No se ha podido crear: ' + e.message], avisos: m.avisos } }
  return { ok: true, id, carpeta, nombre: m.N.nombre, prueba: m.N.prueba === true, demo: m.demo, version: version(carpeta), errores: [], avisos: m.avisos };
}

/** Pone al día lo común de una copia. Antes valida sus datos con las reglas nuevas y, si no se dice lo contrario, le pasa recorridos al azar. */
export function actualizar({ plantilla, destino, id, conAzar = true }) {
  const carpeta = path.join(destino, id), datos = path.join(carpeta, DATOS);
  if (!fs.existsSync(datos)) return { ok: false, id, errores: ['No hay ninguna copia «' + id + '» en ' + destino], avisos: [] };
  const antes = estado(plantilla, carpeta), dAntes = huella(datos);
  if (antes.ficha.fijada) return { ok: true, id, cambiada: false, fijada: antes.ficha.fijada, version: antes.version, errores: [], avisos: [] };
  const m = mira(plantilla, datos); if (m.errores.length) return { ok: false, id, cambiada: false, errores: m.errores.map(e => 'Con las reglas nuevas, sus datos no valen: ' + e), avisos: m.avisos };
  if (conAzar) { const a = azar(plantilla, datos); if (!a.ok) return { ok: false, id, cambiada: false, errores: ['Con las reglas nuevas, este negocio no pasa los recorridos al azar:\n' + a.salida.split('\n').filter(l => /ROTA|MAL|FALLA/.test(l)).slice(0, 6).join('\n')], avisos: m.avisos } }
  if (antes.alDia) return { ok: true, id, cambiada: false, version: antes.version, errores: [], avisos: m.avisos };
  copiaComunes(plantilla, carpeta);
  if (huella(datos) !== dAntes) throw new Error('Se ha tocado el archivo de datos de ' + id + ': esto no puede pasar');
  const v = version(carpeta), ficha = Object.assign({ id, nombre: m.N.nombre, creada: hoy() }, antes.ficha, { nombre: m.N.nombre, actualizada: hoy(), version: v, prueba: m.N.prueba === true });
  fs.writeFileSync(path.join(carpeta, FICHA), JSON.stringify(ficha, null, 1) + '\n');
  return { ok: true, id, cambiada: true, de: antes.version, version: v, archivos: antes.dif, errores: [], avisos: m.avisos };
}

const leeFicha = carpeta => { try { return JSON.parse(fs.readFileSync(path.join(carpeta, FICHA), 'utf8')) } catch (e) { return {} } };
const ponFicha = (carpeta, ficha) => fs.writeFileSync(path.join(carpeta, FICHA), JSON.stringify(ficha, null, 1) + '\n');
/** La deja quieta: «actualizar» se la salta hasta que se suelte. */
export function fija({ destino, id, motivo }) {
  const carpeta = path.join(destino, id); if (!fs.existsSync(path.join(carpeta, DATOS))) return { ok: false, id, errores: ['No hay ninguna copia «' + id + '» en ' + destino] };
  const f = leeFicha(carpeta); f.fijada = { motivo: String(motivo || 'Fijada a mano').slice(0, 200), desde: hoy() }; ponFicha(carpeta, f); return { ok: true, id, fijada: f.fijada, errores: [] };
}
/** La vuelve a dejar poner al día. */
export function suelta({ destino, id }) {
  const carpeta = path.join(destino, id); if (!fs.existsSync(path.join(carpeta, DATOS))) return { ok: false, id, errores: ['No hay ninguna copia «' + id + '» en ' + destino] };
  const f = leeFicha(carpeta), estaba = !!f.fijada; delete f.fijada; ponFicha(carpeta, f); return { ok: true, id, estaba, errores: [] };
}
/** Vuelve lo común de una copia a como estaba antes de su última puesta al día (o al commit «a»), sacándolo de git.
    Antes valida sus datos con las reglas de esa versión. Su archivo de datos no se toca. Queda fijada. */
export function atras({ destino, id, a }) {
  const carpeta = path.join(destino, id), datos = path.join(carpeta, DATOS);
  if (!fs.existsSync(datos)) return { ok: false, id, errores: ['No hay ninguna copia «' + id + '» en ' + destino], avisos: [] };
  const git = (...x) => spawnSync('git', x, { cwd: carpeta, encoding: 'utf8' });
  const raiz = git('rev-parse', '--show-toplevel'); if (raiz.status !== 0) return { ok: false, id, errores: ['Volver atrás necesita el repositorio (git), y aquí no lo hay'], avisos: [] };
  // las rutas que se le dan a git van desde la raíz del repositorio: las órdenes con rutas se lanzan desde allí
  const R = raiz.stdout.trim(), rel = f => path.relative(R, path.join(carpeta, f)).split(path.sep).join('/'), rutas = COMUNES.map(rel);
  const gr = (...x) => spawnSync('git', x, { cwd: R, encoding: 'utf8' });
  let objetivo = a;
  if (!objetivo) {
    // con cambios sin guardar en lo común, atrás es lo último guardado; si no, el commit de antes de su último cambio
    if (gr('diff', '--quiet', 'HEAD', '--', ...rutas).status !== 0) objetivo = 'HEAD';
    else { const u = gr('log', '-1', '--format=%H', '--', ...rutas).stdout.trim(); if (!u) return { ok: false, id, errores: ['En git no hay ninguna versión anterior de esta copia'], avisos: [] }; objetivo = u + '^'; }
  }
  if (gr('rev-parse', '--verify', '--quiet', objetivo + '^{commit}').status !== 0) return { ok: false, id, errores: ['No encuentro ese commit: ' + objetivo], avisos: [] };
  const lee = f => { const r = spawnSync('git', ['show', objetivo + ':' + rel(f)], { cwd: R, maxBuffer: 64 * 1024 * 1024 }); return r.status === 0 ? r.stdout : null };
  // se monta aparte y solo se pone en su sitio si sale entera y sus datos valen con esas reglas
  const tmp = fs.mkdtempSync(path.join(destino, '.atras-'));
  try {
    const puestos = [];
    for (const f of COMUNES) { const b = lee(f); if (b) { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), b); puestos.push(f) } }
    if (!puestos.includes('js/oficio-nucleo.js')) return { ok: false, id, errores: ['En ' + objetivo + ' esta copia aún no tenía sus archivos comunes'], avisos: [] };
    fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); fs.copyFileSync(datos, path.join(tmp, DATOS));
    const m = mira(tmp, path.join(tmp, DATOS));
    if (m.errores.length) return { ok: false, id, errores: m.errores.map(e => 'Con las reglas de esa versión, sus datos no valen: ' + e), avisos: m.avisos };
    const de = version(carpeta), dAntes = huella(datos);
    for (const f of puestos) fs.copyFileSync(path.join(tmp, f), path.join(carpeta, f));
    if (huella(datos) !== dAntes) throw new Error('Se ha tocado el archivo de datos de ' + id + ': esto no puede pasar');
    const v = version(carpeta), f = leeFicha(carpeta);
    Object.assign(f, { actualizada: hoy(), version: v, fijada: { motivo: 'Vuelta atrás desde la ' + (de || '¿?') + ' (' + objetivo + ')', desde: hoy() } }); ponFicha(carpeta, f);
    return { ok: true, id, de, version: v, commit: objetivo, archivos: puestos, errores: [], avisos: m.avisos };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}

/** La lista de copias con su estado. */
export function lista({ plantilla, destino }) {
  const v = version(plantilla);
  return copiasDe(destino).map(id => { const carpeta = path.join(destino, id), e = estado(plantilla, carpeta), m = mira(plantilla, path.join(carpeta, DATOS));
    return { id, nombre: m.N ? m.N.nombre : (e.ficha.nombre || '¿?'), version: e.version, plantilla: v, alDia: e.alDia, dif: e.dif, prueba: !!(m.N && m.N.prueba === true), fijada: e.ficha.fijada || null, errores: m.errores, avisos: m.avisos, creada: e.ficha.creada || '', actualizada: e.ficha.actualizada || '' } });
}

/* ---------- desde la consola ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), orden = args[0], op = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }, tiene = k => args.includes(k);
  // dónde está cada cosa: en el repositorio o, en la copia del PC, en las carpetas de al lado
  const enRepo = fs.existsSync(path.join(aqui, '../../frontend/public'));
  const plantilla = path.resolve(op('--plantilla') || path.join(aqui, enRepo ? '../../frontend/public/demos/ramirez-24h' : '../site')), destino = path.resolve(op('--destino') || path.join(aqui, enRepo ? '../../frontend/public/oficios' : '../oficios'));
  const sueltos = args.slice(1).filter((a, i, L) => !a.startsWith('--') && !['--plantilla', '--destino', '--datos', '--a', '--motivo'].includes(L[i - 1]));
  const di = r => { r.avisos.forEach(a => console.log('   aviso  ' + a)); r.errores.forEach(e => console.log('   ERROR  ' + e)) };
  let mal = 0;
  try {
  if (orden === 'nueva') {
    const r = nueva({ plantilla, destino, datos: op('--datos') && path.resolve(op('--datos')) }); di(r);
    if (!r.ok) mal = 1;
    else {
      console.log(`CREADA  ${r.id} · ${r.nombre} · versión ${r.version}\n        ${r.carpeta}`);
      // una demo no tiene buzón ni servidor: no hace falta código de soporte
      if (r.demo) console.log('\nEs una demo (trae su muestra y no va con servidor): no necesita código de soporte ni alta en el buzón.');
      else {
        // el código de soporte: se inventa aquí, se enseña una vez y no se guarda en ningún archivo
        const P = 'abcdefghjkmnpqrstuvwxyz23456789', cod = Array.from({ length: 4 }, () => Array.from(crypto.randomBytes(4), b => P[b % P.length]).join('')).join('-');
        console.log(`\nPara que su oficina pueda escribir en «Mejoras», falta darla de alta en el buzón de OOOX (Supabase, proyecto del buzón).\nCódigo de soporte, que no se guarda en ningún sitio: apúntalo en tu gestor de contraseñas y dáselo al negocio.\n\n    ${cod}\n\n    insert into oficios.negocios (id, nombre, plan, prueba, clave_hash)\n    values ('${r.id}', '${r.nombre.replace(/'/g, "''")}', 'pro', ${r.prueba ? 'true' : 'false'}, oficios.huella('${r.id}', '${cod}'));\n`);
      }
    }
  } else if (orden === 'actualizar') {
    const ids = tiene('--todas') ? copiasDe(destino) : sueltos;
    if (!ids.length) { console.log(tiene('--todas') ? 'No hay ninguna copia en ' + destino : 'Di qué copia: node copias.mjs actualizar <id>  (o --todas)'); mal = tiene('--todas') ? 0 : 2 }
    for (const id of ids) { const r = actualizar({ plantilla, destino, id, conAzar: !tiene('--sin-azar') }); di(r);
      if (r.fijada) { console.log(`FIJADA, SE QUEDA COMO ESTÁ  ${id} · versión ${r.version} · ${r.fijada.motivo} (desde ${r.fijada.desde}). Para ponerla al día: node copias.mjs suelta ${id}`); continue }
      console.log(r.ok ? (r.cambiada ? `PUESTA AL DÍA  ${id} · de ${r.de || 'sin versión'} a ${r.version} · ${r.archivos.length} archivos` : `YA ESTABA AL DÍA  ${id} · versión ${r.version}`) : `SE QUEDA COMO ESTABA  ${id}`); if (!r.ok) mal++ }
  } else if (orden === 'lista' || orden === 'comprueba') {
    const L = lista({ plantilla, destino }); if (!L.length) console.log('No hay ninguna copia en ' + destino);
    // una copia fijada puede ir por detrás de la plantilla (se publica por fases o se ha vuelto atrás): no cuenta como fallo
    for (const c of L) { const espera = !c.alDia && c.fijada; console.log(`${(c.alDia || espera) && !c.errores.length ? (espera ? 'FIJA' : 'BIEN') : 'OJO '}  ${c.id.padEnd(22)} ${c.nombre.padEnd(26)} versión ${c.version || '¿?'}${c.alDia ? '' : ' (la plantilla va por la ' + c.plantilla + '; distintos: ' + c.dif.join(', ') + ')'}${c.fijada ? ' · fijada: ' + c.fijada.motivo : ''}${c.prueba ? ' · copia de prueba' : ''}`); c.errores.forEach(e => console.log('   ERROR  ' + e)); if (orden === 'comprueba' && ((!c.alDia && !c.fijada) || c.errores.length)) mal++ }
  } else if (orden === 'atras') {
    if (sueltos.length !== 1) { console.log('Di qué copia: node copias.mjs atras <id> [--a <commit>]'); mal = 2 }
    else { const r = atras({ destino, id: sueltos[0], a: op('--a') }); di(r);
      console.log(r.ok ? `VUELTA ATRÁS  ${r.id} · de ${r.de || '¿?'} a ${r.version} (${r.commit}) · ${r.archivos.length} archivos · queda fijada; para volver a ponerla al día: node copias.mjs suelta ${r.id} y actualizar ${r.id}` : `SE QUEDA COMO ESTABA  ${sueltos[0]}`); if (!r.ok) mal = 1 }
  } else if (orden === 'fija' || orden === 'suelta') {
    if (!sueltos.length) { console.log(`Di qué copia: node copias.mjs ${orden} <id>`); mal = 2 }
    for (const id of sueltos) { const r = orden === 'fija' ? fija({ destino, id, motivo: op('--motivo') }) : suelta({ destino, id }); r.errores.forEach(e => console.log('   ERROR  ' + e));
      console.log(!r.ok ? `NO SE HA PODIDO  ${id}` : orden === 'fija' ? `FIJADA  ${id} · ${r.fijada.motivo}` : `SUELTA  ${id}${r.estaba ? '' : ' (no estaba fijada)'}`); if (!r.ok) mal++ }
  } else { console.log('Uso: node copias.mjs nueva --datos <archivo.js> | actualizar --todas | actualizar <id> | lista | comprueba | atras <id> | fija <id> | suelta <id>'); mal = 2 }
  } catch (e) { console.log('No se ha podido: ' + e.message); mal = 2 }
  process.exit(mal);
}
