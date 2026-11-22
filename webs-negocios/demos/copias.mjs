// Copias de la app de oficios: una por negocio.
//
// Cada copia lleva los archivos COMUNES (las pantallas y las reglas, iguales en todas) y lo SUYO: un archivo de datos
// (js/oficio-datos.js) y, si las tiene, sus fotos de averías. Esta herramienta crea copias, las pone al día cuando cambia
// lo común y dice cómo está cada una. Al poner al día, nunca toca el archivo de datos de una copia.
//
// Una copia CON SERVIDOR lleva en su archivo de datos solo la parte PÚBLICA (17-11-2026), porque ese archivo lo baja
// cualquiera que abra la cita: del equipo, el nombre, la inicial del apellido y el color. Los datos COMPLETOS (apellidos,
// horarios, quién es el jefe o hace guardias) están en el servidor y en un archivo aparte que NUNCA va al repositorio, que
// es público: el de un negocio de verdad, en la carpeta privada del PC; el de una copia de prueba (Voltio), en
// pruebas-reglas/completos/<id>.js. «nueva» y «publica» hacen el archivo público a partir de los completos; «alta» y
// «subir-datos» suben los completos al servidor y antes miran que cuadren con el público de la copia.
//
//   node copias.mjs nueva --datos <archivo.js>     crea la copia del negocio de ese archivo (la carpeta es su «id»); si sus
//                                                  datos van con servidor, la copia lleva solo su parte pública
//   node copias.mjs publica <id> [--datos <completos.js>]   rehace el archivo público de esa copia con sus datos completos
//   node copias.mjs actualizar --todas | <id>…     pone al día lo común; cada copia pasa sus pruebas antes de cambiarse
//   node copias.mjs lista                          qué copias hay, con qué versión, y si van al día
//   node copias.mjs comprueba                      lo de «lista», pero falla si alguna no va al día o sus datos no valen
//                                                  (una copia «fijada» puede ir por detrás: no cuenta como fallo)
//   node copias.mjs atras <id> [--a <commit>]      vuelve esa copia a como estaba antes de su última puesta al día
//                                                  (o a ese commit), con git; queda fijada para que no se ponga al día sola
//   node copias.mjs fija <id> [--motivo "…"]       la deja quieta: «actualizar --todas» se la salta
//   node copias.mjs suelta <id>                    la vuelve a dejar poner al día
//   node copias.mjs app <carpeta>…                 pone el manifiesto y el icono de la app de esa carpeta (la plantilla o una
//                                                  copia), sacados de sus datos; los iconos PNG los hace iconos.py
//   node copias.mjs alta <id> [--datos <completos.js>] [--sql <archivo>]
//                                                  el alta de esa copia en el servidor: escribe el SQL (sus datos completos
//                                                  y una fila por persona, sin ningún código: solo sus huellas) y enseña UNA
//                                                  VEZ el código de cada persona, que no se guarda en ningún sitio
//   node copias.mjs subir-datos <id> [--datos <completos.js>] [--sql <archivo>]
//                                                  el SQL que pone en el servidor sus datos completos cuando cambian
//                                                  (precios, horarios, técnicos…)
//
// Publicar por fases: fijar las que esperan, «actualizar --todas» (solo se ponen al día las sueltas), mirar un día y
// soltar las demás. Si algo va mal en una: «atras <id>».
//
//   --plantilla <carpeta>   de dónde sale lo común (por defecto, la demo: frontend/public/demos/ramirez-24h)
//   --destino <carpeta>     dónde viven las copias (por defecto, frontend/public/oficios)
//                           En la copia del PC, sin repositorio, lo común sale de ../site y las copias viven en ../oficios
//   --sin-azar              no pasar los recorridos al azar al actualizar (solo se valida el archivo de datos)
//   --completos <carpeta>   dónde buscar los datos completos de las copias con servidor (<id>.js), si no se dan con --datos.
//                           Siempre se mira también en pruebas-reglas/completos, en la carpeta de OFICIOS_COMPLETOS y, en
//                           la copia del PC, en webs-negocios\privado (la de los negocios de verdad).
//                           Sin ellos, una copia con servidor se valida solo por su parte pública y no pasa los recorridos al azar
//
// Una copia que no pasa la validación o las pruebas se queda como estaba; las demás siguen. La salida es el número de fallos.
// El alta de un negocio de punta a punta (qué pedir, qué tarda cada paso y lo que salió al ensayarla): ALTA.md
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { valida, leeNucleo, leeNegocio } from './pruebas-reglas/valida-negocio.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const COMUNES = ['app.html', 'cita.html', 'cliente.html', 'oficio.css', 'sw.js', 'js/oficio-nucleo.js', 'js/oficio-espejo.js', 'js/oficio-estado.js', 'js/oficio-soporte.js', 'js/oficio-papeles.js', 'js/oficio-vigia.js', 'js/oficio-idioma.js',
  'js/app/base.js', 'js/app/vistas/bandeja.js', 'js/app/vistas/aviso.js', 'js/app/vistas/furgo.js', 'js/app/vistas/aviso-ficha.js', 'js/app/vistas/hoy.js', 'js/app/vistas/agenda.js', 'js/app/vistas/equipo.js', 'js/app/vistas/cobros.js', 'js/app/vistas/nuevo.js', 'js/app/vistas/contratos.js', 'js/app/vistas/papel.js', 'js/app/vistas/mejoras.js', 'js/app/navegar.js', 'js/app/hojas/mensajes.js', 'js/app/entrar-y-avisos.js', 'js/app/hojas/equipo.js', 'js/app/hojas/web.js', 'js/app/hojas/aviso.js', 'js/app/acciones.js', 'js/app/eventos.js', 'js/app/arranque.js',
  'assets/fuentes/barlow-400.woff2', 'assets/fuentes/barlow-500.woff2', 'assets/fuentes/barlow-600.woff2', 'assets/fuentes/barlow-condensed-600.woff2', 'assets/fuentes/barlow-condensed-700.woff2', 'assets/fuentes/barlow-condensed-800.woff2'];
const DATOS = 'js/oficio-datos.js', FICHA = 'copia.json';
// la portada de una copia: lleva a pedir cita. La web del negocio, si la tiene, es otra cosa y va aparte.
const PORTADA = n => `<!doctype html>\n<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">\n<title>${n}</title><meta http-equiv="refresh" content="0;url=cita.html">\n<p><a href="cita.html">Pedir cita</a> · <a href="app.html">Entrar a la oficina</a></p>\n</html>\n`;

const huella = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hoy = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const idVale = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{1,39}$/.test(id);

/* ---------- la parte pública y los datos completos (17-11-2026) ---------- */
const DIR_COMPLETOS = path.join(aqui, 'pruebas-reglas/completos');
// en la copia del PC (sin repositorio), los de los negocios de verdad viven en webs-negocios\privado, al lado de assets
const PRIVADO_PC = fs.existsSync(path.join(aqui, '../../frontend/public')) ? '' : path.join(aqui, '../../../privado');
/** Dónde se buscan los datos completos de las copias con servidor: la carpeta que se da, la de OFICIOS_COMPLETOS, en el PC la
    carpeta privada y la de las copias de prueba. */
export const carpetasCompletos = extra => [extra, process.env.OFICIOS_COMPLETOS, PRIVADO_PC, DIR_COMPLETOS].filter(Boolean).flatMap(x => String(x).split(path.delimiter)).filter(Boolean).map(x => path.resolve(x));
/** El archivo de los datos completos de una copia (<id>.js) en esas carpetas, o '' si no está. */
export const completosDe = (id, carpetas) => { if (!idVale(id)) return ''; for (const c of carpetas || carpetasCompletos()) { const f = path.join(c, id + '.js'); if (fs.existsSync(f)) return f } return '' };
/* ¿el archivo de la copia (lo que ven los clientes) es lo que sale de esos datos completos? Si es el público, su parte pública; si no, ellos mismos */
const cuadra = (K, completos, deCopia) => K.canon(deCopia && deCopia.publico === true ? K.publico(completos) : completos) === K.canon(deCopia);
const LLEVA_EQUIPO = id => 'Va con servidor y su archivo de datos, que lo baja cualquiera, lleva el equipo entero (apellidos, horarios…): déjalo solo con la parte pública con node copias.mjs publica ' + id + ' --datos <sus datos completos, guardados fuera del repositorio>';
const clave = k => /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
const linea = v => { const j = JSON.stringify(v); if (!v || typeof v !== 'object' || j.length <= 110) return j;
  if (Array.isArray(v)) return v.every(x => x && typeof x === 'object') ? '[\n  ' + v.map(x => JSON.stringify(x)).join(',\n  ') + ']' : j;
  return '{\n  ' + Object.entries(v).map(([a, b]) => clave(a) + ':' + JSON.stringify(b)).join(',\n  ') + '}' };
/** El texto del archivo público de una copia con servidor, a partir de la parte pública de sus datos (K.publico). */
export function textoPublico(P) {
  const nom = String(P.nombre || P.id).replace(/[\r\n]+/g, ' ').replace(/\*\//g, '* /');
  return `/* ============================================================
   ARCHIVO PÚBLICO de los datos de ${nom} (${P.id}). Lo baja cualquiera que abra la cita: del equipo lleva solo
   el nombre, la inicial del apellido y el color. Lo demás del equipo (apellidos, horarios, quién es el jefe o hace
   guardias) está en el servidor, que se lo da a la app al entrar, y en el archivo de sus datos completos, que no va
   nunca al repositorio. No se cambia a mano: se cambian los datos completos y se rehace con
     node copias.mjs publica ${P.id} --datos <sus datos completos>
   ============================================================ */
(function(g){
'use strict';
g.OFICIO_NEGOCIO={
${Object.entries(P).map(([k, v]) => ' ' + clave(k) + ':' + linea(v)).join(',\n')}
};
})(typeof globalThis!=='undefined'?globalThis:this);
`;
}

function copiaComunes(plantilla, destino) {
  for (const f of COMUNES) { const a = path.join(plantilla, f), b = path.join(destino, f); if (!fs.existsSync(a)) throw new Error('A la plantilla le falta ' + f); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b) }
}
const version = sitio => { try { return leeNucleo(sitio).VERSION || '' } catch (e) { return '' } };
/* la app en el móvil (16-11-2026): su manifiesto (nombre, icono y colores, para instalarla) y su icono en SVG, sacados de
   los datos del negocio. Los iconos PNG (el iPhone los necesita) los hace iconos.py; el manifiesto los nombra si están */
const ASFALTO = '#14171a', SENAL = '#ffc400';
const letraDe = N => (String((Array.isArray(N.marca) && N.marca[0]) || N.nombre || '?').trim()[0] || '?').toUpperCase();
export const iconoSvg = N => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${ASFALTO}"/>`
  + `<text x="256" y="300" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif" font-weight="800" font-size="270" fill="${SENAL}">${esc(letraDe(N))}</text>`
  + `<rect x="179" y="362" width="154" height="23" rx="11.5" fill="${SENAL}"/></svg>\n`;
export function manifiesto(carpeta, N) {
  const marca = (Array.isArray(N.marca) ? N.marca.join(' ') : String(N.nombre || '')).trim(), png = n => fs.existsSync(path.join(carpeta, 'assets/icono-' + n + '.png'));
  const iconos = [{ src: 'assets/icono.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
  for (const n of [192, 512]) if (png(n)) iconos.push({ src: 'assets/icono-' + n + '.png', sizes: n + 'x' + n, type: 'image/png', purpose: 'any' }, { src: 'assets/icono-' + n + '.png', sizes: n + 'x' + n, type: 'image/png', purpose: 'maskable' });
  return JSON.stringify({ name: N.nombre, short_name: marca.length <= 14 ? marca : String((N.marca && N.marca[0]) || N.nombre).slice(0, 14), description: 'La app de ' + N.nombre + ': avisos, citas y trabajos.',
    lang: 'es', start_url: 'app.html', scope: './', display: 'standalone', background_color: ASFALTO, theme_color: ASFALTO, icons: iconos }, null, 1) + '\n';
}
const APP = ['manifest.webmanifest', 'assets/icono.svg'];
const appDe = (carpeta, N) => ({ 'manifest.webmanifest': manifiesto(carpeta, N), 'assets/icono.svg': iconoSvg(N) });
/** Pone (o pone al día) el manifiesto y el icono de la app de una carpeta. Devuelve los archivos que ha cambiado. */
export function ponApp(carpeta, N) {
  const hechos = [];
  for (const [f, t] of Object.entries(appDe(carpeta, N))) { const p = path.join(carpeta, f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== t) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); hechos.push(f) } }
  return hechos;
}
const appMal = carpeta => { let N; try { ({ N } = leeNegocio(path.join(carpeta, DATOS))) } catch (e) { return [] } const A = appDe(carpeta, N);
  return APP.filter(f => { const p = path.join(carpeta, f); return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== A[f] }) };
/** Cómo está una copia frente a la plantilla: qué archivos comunes le faltan o son distintos. */
export function estado(plantilla, carpeta) {
  for (const f of COMUNES) if (!fs.existsSync(path.join(plantilla, f))) throw new Error('A la plantilla le falta ' + f);
  const dif = COMUNES.filter(f => !fs.existsSync(path.join(carpeta, f)) || huella(path.join(carpeta, f)) !== huella(path.join(plantilla, f))).concat(appMal(carpeta));
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
  if (m.N.publico === true) return { ok: false, errores: ['Ese archivo es el público de una copia (sin el equipo entero): para crear la copia hacen falta sus datos completos.'], avisos: m.avisos };
  // con servidor, la copia lleva solo la parte pública de sus datos: el archivo lo baja cualquiera que abra la cita
  const conServidor = !!(m.N.servidor && !m.demo);
  const id = m.N.id; if (!idVale(id)) return { ok: false, errores: ['El «id» del negocio («' + id + '») tiene que ir en minúsculas, con letras, números y guiones: es el nombre de su carpeta.'], avisos: m.avisos };
  const carpeta = path.join(destino, id);
  if (fs.existsSync(carpeta)) return { ok: false, errores: ['Ya hay una copia en ' + carpeta + '. Para ponerla al día: node copias.mjs actualizar ' + id], avisos: m.avisos };
  // se monta aparte y solo se pone en su sitio si sale entera
  fs.mkdirSync(destino, { recursive: true }); const tmp = fs.mkdtempSync(path.join(destino, '.nueva-'));
  try {
    copiaComunes(plantilla, tmp); fs.mkdirSync(path.join(tmp, 'js'), { recursive: true });
    if (conServidor) { fs.writeFileSync(path.join(tmp, DATOS), textoPublico(leeNucleo(plantilla).publico(m.N)));
      const mp = mira(plantilla, path.join(tmp, DATOS)); if (mp.errores.length) throw new Error('su archivo público no vale: ' + mp.errores.join(' · ')) }
    else fs.copyFileSync(datos, path.join(tmp, DATOS));
    // sus fotos de averías, si están junto al archivo de datos (en ../assets/img o en ./img)
    for (const d of [path.join(path.dirname(datos), '../assets/img'), path.join(path.dirname(datos), 'img')]) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (/^av-[a-z0-9-]+-s\.webp$/.test(f)) { fs.mkdirSync(path.join(tmp, 'assets/img'), { recursive: true }); fs.copyFileSync(path.join(d, f), path.join(tmp, 'assets/img', f)) }
    fs.writeFileSync(path.join(tmp, 'index.html'), PORTADA(esc(m.N.nombre))); ponApp(tmp, m.N);
    const v = version(plantilla);
    fs.writeFileSync(path.join(tmp, FICHA), JSON.stringify({ id, nombre: m.N.nombre, creada: hoy(), actualizada: hoy(), version: v, prueba: m.N.prueba === true }, null, 1) + '\n');
    fs.chmodSync(tmp, 0o755); fs.renameSync(tmp, carpeta);
  } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); return { ok: false, errores: ['No se ha podido crear: ' + e.message], avisos: m.avisos } }
  return { ok: true, id, carpeta, nombre: m.N.nombre, prueba: m.N.prueba === true, demo: m.demo, publico: conServidor, version: version(carpeta), errores: [], avisos: m.avisos };
}

/** Rehace el archivo público de una copia con servidor a partir de sus datos completos («datos», o <id>.js en la carpeta de los
    completos). Si ya era ese, no lo toca. Devuelve {ok, id, cambiado, completos, errores, avisos}. */
export function publica({ plantilla, destino, id, datos, completos }) {
  const carpeta = path.join(destino, String(id)), archivo = path.join(carpeta, DATOS);
  if (!idVale(id) || !fs.existsSync(archivo)) return { ok: false, id, errores: ['No hay ninguna copia «' + id + '» en ' + destino], avisos: [] };
  const f = datos || completosDe(id, carpetasCompletos(completos));
  if (!f || !fs.existsSync(f)) return { ok: false, id, errores: ['Faltan los datos completos de «' + id + '»: --datos <archivo> (o ' + id + '.js en la carpeta de los completos)' + (f ? ': no encuentro ' + f : '')], avisos: [] };
  const m = mira(plantilla, f); if (m.errores.length) return { ok: false, id, errores: m.errores, avisos: m.avisos };
  if (m.N.publico === true) return { ok: false, id, errores: ['Ese archivo es el público, no los datos completos.'], avisos: m.avisos };
  if (m.N.id !== id) return { ok: false, id, errores: ['Esos datos son de «' + m.N.id + '», no de «' + id + '».'], avisos: m.avisos };
  if (!m.N.servidor || m.demo) return { ok: false, id, errores: ['Esos datos no van con servidor: sin servidor, la copia lleva sus datos completos y no hay parte pública que hacer.'], avisos: m.avisos };
  const K = leeNucleo(plantilla), P = K.publico(m.N);
  let antes = null; try { antes = leeNegocio(archivo).N } catch (e) { antes = null }
  if (antes && K.canon(antes) === K.canon(P)) return { ok: true, id, cambiado: false, completos: f, errores: [], avisos: m.avisos };
  const viejo = fs.readFileSync(archivo); fs.writeFileSync(archivo, textoPublico(P));
  const mp = mira(plantilla, archivo); if (mp.errores.length) { fs.writeFileSync(archivo, viejo); return { ok: false, id, errores: mp.errores.map(e => 'Su archivo público no valdría: ' + e), avisos: m.avisos } }
  ponApp(carpeta, P);
  return { ok: true, id, cambiado: true, completos: f, errores: [], avisos: m.avisos };
}

/** Pone al día lo común de una copia. Antes valida sus datos con las reglas nuevas y, si no se dice lo contrario, le pasa recorridos al azar. */
export function actualizar({ plantilla, destino, id, conAzar = true, completos }) {
  const carpeta = path.join(destino, id), datos = path.join(carpeta, DATOS);
  if (!fs.existsSync(datos)) return { ok: false, id, errores: ['No hay ninguna copia «' + id + '» en ' + destino], avisos: [] };
  const antes = estado(plantilla, carpeta), dAntes = huella(datos);
  if (antes.ficha.fijada) return { ok: true, id, cambiada: false, fijada: antes.ficha.fijada, version: antes.version, errores: [], avisos: [] };
  const m = mira(plantilla, datos); if (m.errores.length) return { ok: false, id, cambiada: false, errores: m.errores.map(e => 'Con las reglas nuevas, sus datos no valen: ' + e), avisos: m.avisos };
  // una copia con servidor lleva solo la parte pública: los recorridos al azar, con sus datos completos, si están a mano
  const avisos = m.avisos.slice(); let paraAzar = datos;
  if (m.N.publico === true) {
    const f = completosDe(id, carpetasCompletos(completos)); paraAzar = f;
    if (f) { const mf = mira(plantilla, f); if (mf.errores.length) return { ok: false, id, cambiada: false, errores: mf.errores.map(e => 'Con las reglas nuevas, sus datos completos no valen: ' + e), avisos };
      if (!cuadra(leeNucleo(plantilla), mf.N, m.N)) avisos.push('Sus datos completos (' + f + ') no cuadran con su archivo público: node copias.mjs publica ' + id) }
    else avisos.push('Sin sus datos completos no se pasan los recorridos al azar: están fuera del repositorio (--completos <carpeta> u OFICIOS_COMPLETOS).');
  } else if (m.N.servidor && !m.demo) avisos.push(LLEVA_EQUIPO(id));
  if (conAzar && paraAzar) { const a = azar(plantilla, paraAzar); if (!a.ok) return { ok: false, id, cambiada: false, errores: ['Con las reglas nuevas, este negocio no pasa los recorridos al azar:\n' + a.salida.split('\n').filter(l => /ROTA|MAL|FALLA/.test(l)).slice(0, 6).join('\n')], avisos } }
  if (antes.alDia) return { ok: true, id, cambiada: false, version: antes.version, errores: [], avisos };
  copiaComunes(plantilla, carpeta); ponApp(carpeta, m.N);
  if (huella(datos) !== dAntes) throw new Error('Se ha tocado el archivo de datos de ' + id + ': esto no puede pasar');
  const v = version(carpeta), ficha = Object.assign({ id, nombre: m.N.nombre, creada: hoy() }, antes.ficha, { nombre: m.N.nombre, actualizada: hoy(), version: v, prueba: m.N.prueba === true });
  fs.writeFileSync(path.join(carpeta, FICHA), JSON.stringify(ficha, null, 1) + '\n');
  return { ok: true, id, cambiada: true, de: antes.version, version: v, archivos: antes.dif, errores: [], avisos };
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
export function lista({ plantilla, destino, completos }) {
  const v = version(plantilla), cs = carpetasCompletos(completos);
  return copiasDe(destino).map(id => { const carpeta = path.join(destino, id), e = estado(plantilla, carpeta), m = mira(plantilla, path.join(carpeta, DATOS));
    // con servidor: el archivo tiene que ser el público y, si sus datos completos están a mano, valer y cuadrar con él
    const errores = m.errores.slice(), pub = !!(m.N && m.N.publico === true); let f = '';
    if (pub) { f = completosDe(id, cs); if (f) { const mf = mira(plantilla, f); mf.errores.forEach(x => errores.push('Sus datos completos: ' + x));
      if (!mf.errores.length && !cuadra(leeNucleo(plantilla), mf.N, m.N)) errores.push('Sus datos completos (' + f + ') no cuadran con su archivo público: node copias.mjs publica ' + id) } }
    else if (m.N && m.N.servidor && !m.demo) errores.push(LLEVA_EQUIPO(id));
    return { id, nombre: m.N ? m.N.nombre : (e.ficha.nombre || '¿?'), version: e.version, plantilla: v, alDia: e.alDia, dif: e.dif, prueba: !!(m.N && m.N.prueba === true), publico: pub, completos: f, fijada: e.ficha.fijada || null, errores, avisos: m.avisos, creada: e.ficha.creada || '', actualizada: e.ficha.actualizada || '' } });
}

/* ---------- el servidor: el alta de un negocio y sus datos nuevos (16-11-2026) ----------
   Lo que guarda el servidor de un negocio son sus datos TAL CUAL (en el mismo orden: las reglas miran alguna vez «la
   primera» clave), sin «servidor» ni «textos». Antes esto se hacía a mano (oficios-servidor/LEEME.md, «Dar de alta un
   negocio en el servidor»). El SQL no lleva ningún código: solo sus huellas, las mismas que oficios.huella. */
export const datosServidor = N => { const c = {}; for (const [k, v] of Object.entries(N)) if (k !== 'servidor' && k !== 'textos') c[k] = v; return c };
const sqlTexto = s => "'" + String(s).replace(/'/g, "''") + "'";
const unaLinea = s => String(s).replace(/[\r\n]+/g, ' ');
const ABC = 'abcdefghjkmnpqrstuvwxyz23456789';   // sin i, l, o, 0 ni 1: no se confunden al dictarlos ni al leerlos
/** Un código de entrar: 16 letras y números en cuatro grupos (abcd-efgh-jkmn-pqrs), al azar de verdad. */
export const codigoNuevo = () => Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ABC[crypto.randomInt(ABC.length)]).join('')).join('-');
/** La huella del código de una persona, como oficios.huella('<negocio>:<persona>', '<código>') en el servidor. */
export const huellaPersona = (negocio, persona, codigo) => crypto.createHash('sha256').update(negocio + ':' + persona + ':' + codigo, 'utf8').digest('hex');
/* la copia, si se puede subir al servidor: existe, sus datos valen y no es una demo. Lo que se sube son sus datos completos:
   si la copia lleva el archivo público, los de «datos» (o <id>.js en la carpeta de los completos), que tienen que valer y
   cuadrar con él; si no, los de su archivo (17-11-2026) */
function paraServidor(plantilla, destino, id, datos, completos) {
  const archivo = path.join(destino, String(id), DATOS);
  if (!idVale(id) || !fs.existsSync(archivo)) return { error: 'No hay ninguna copia «' + id + '» en ' + destino };
  const mc = mira(plantilla, archivo); if (mc.errores.length) return { error: mc.errores.join(' · '), m: mc };
  if (mc.demo) return { error: 'Es una demo (trae su muestra y no va con servidor): no se sube al servidor', m: mc };
  if (mc.N.id !== id) return { error: 'El «id» de sus datos («' + mc.N.id + '») no es el de su carpeta («' + id + '»)', m: mc };
  const pub = mc.N.publico === true, f = datos || (pub ? completosDe(id, carpetasCompletos(completos)) : '');
  if (!f) return pub ? { error: 'La copia lleva el archivo público (sin el equipo entero): para el servidor hacen falta sus datos completos, con --datos <archivo>', m: mc } : { m: mc, N: mc.N };
  if (!fs.existsSync(f)) return { error: 'No encuentro el archivo de datos: ' + f, m: mc };
  const m = mira(plantilla, f); if (m.errores.length) return { error: m.errores.join(' · '), m };
  if (m.N.publico === true) return { error: 'Ese archivo es el público, no los datos completos', m };
  if (m.N.id !== id) return { error: 'Esos datos son de «' + m.N.id + '», no de «' + id + '»', m };
  if (!cuadra(leeNucleo(plantilla), m.N, mc.N)) return { error: 'Esos datos no cuadran con el archivo de la copia, que es lo que ven los clientes al pedir cita' + (pub ? ': primero, node copias.mjs publica ' + id + ' --datos ' + f : ''), m };
  return { m, N: m.N, completos: f };
}
/** El alta de una copia en el servidor: el SQL y el código de cada persona (la oficina y cada técnico), que se enseña una vez. */
export function alta({ plantilla, destino, id, datos, completos }) {
  const p = paraServidor(plantilla, destino, id, datos, completos); if (p.error) return { ok: false, id, errores: [p.error], avisos: p.m ? p.m.avisos : [] };
  const N = p.N, K = leeNucleo(plantilla);
  const gente = [{ persona: 'oficina', rol: 'centralita', quien: 'oficina', n: 'Centralita' }]
    .concat((N.tecnicos || []).map(t => ({ persona: t.id, rol: 'tecnico', quien: t.id, n: String(t.n + ' ' + (t.ap || '')).trim() })));
  const malos = gente.filter(g => !/^[a-z0-9-]{2,40}$/.test(g.persona));
  if (malos.length) return { ok: false, id, errores: malos.map(g => 'El id de ' + g.n + ' («' + g.persona + '») no vale para entrar: minúsculas, números y guiones, de 2 a 40'), avisos: p.m.avisos };
  const codigos = gente.map(g => Object.assign({}, g, { codigo: codigoNuevo() })), q = sqlTexto(id);
  const sql = [
    `-- Alta de ${unaLinea(N.nombre)} (${id}) en el servidor de OOOX Oficios, hecha con copias.mjs el ${hoy()} (reglas ${K.VERSION}).`,
    '-- No lleva ningún código, solo sus huellas: los códigos se enseñaron una vez al hacerla y no están en ningún sitio.',
    'begin;',
    'do $alta$ begin',
    `  if not exists (select 1 from oficios.negocios where id = ${q}) then raise exception 'Falta el alta en el buzón (oficios.negocios): la da node copias.mjs nueva al crear la copia'; end if;`,
    `  if exists (select 1 from oficios.estados where negocio = ${q}) then raise exception 'Este negocio ya está en el servidor. Para cambiar sus datos: node copias.mjs subir-datos ${id}'; end if;`,
    'end $alta$;',
    `insert into oficios.estados (negocio, datos, cab) values (${q}, ${sqlTexto(JSON.stringify(datosServidor(N)))}::json, ${sqlTexto(JSON.stringify({ esq: K.ESQ, n: 0, nu: 0, ausencias: [] }))}::jsonb);`,
    'insert into oficios.personas (negocio, persona, rol, quien, clave_hash) values',
    codigos.map(g => `  (${q}, ${sqlTexto(g.persona)}, ${sqlTexto(g.rol)}, ${sqlTexto(g.quien)}, ${sqlTexto(huellaPersona(id, g.persona, g.codigo))})`).join(',\n') + ';',
    'commit;', ''].join('\n');
  return { ok: true, id, nombre: N.nombre, sql, codigos, conServidor: !!(N.servidor && N.servidor.url), completos: p.completos || '', errores: [], avisos: p.m.avisos };
}
/** Los datos nuevos de una copia para el servidor: el SQL y la huella que dará el servidor después. */
export async function subirDatos({ plantilla, destino, id, datos, completos }) {
  const p = paraServidor(plantilla, destino, id, datos, completos); if (p.error) return { ok: false, id, errores: [p.error], avisos: p.m ? p.m.avisos : [] };
  const N = p.N, K = leeNucleo(plantilla), q = sqlTexto(id);
  const sql = [
    `-- Datos nuevos de ${unaLinea(N.nombre)} (${id}) para el servidor de OOOX Oficios, sacados de su copia con copias.mjs el ${hoy()}.`,
    'begin;',
    'do $datos$ begin',
    `  if not exists (select 1 from oficios.estados where negocio = ${q}) then raise exception 'Este negocio no está en el servidor: primero, node copias.mjs alta ${id}'; end if;`,
    'end $datos$;',
    `update oficios.estados set datos = ${sqlTexto(JSON.stringify(datosServidor(N)))}::json, cambiado = now() where negocio = ${q};`,
    'commit;', ''].join('\n');
  return { ok: true, id, nombre: N.nombre, sql, huella: await K.huellaDatos(N), completos: p.completos || '', errores: [], avisos: p.m.avisos };
}

/* ---------- desde la consola ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), orden = args[0], op = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }, tiene = k => args.includes(k);
  // dónde está cada cosa: en el repositorio o, en la copia del PC, en las carpetas de al lado
  const enRepo = fs.existsSync(path.join(aqui, '../../frontend/public'));
  const plantilla = path.resolve(op('--plantilla') || path.join(aqui, enRepo ? '../../frontend/public/demos/ramirez-24h' : '../site')), destino = path.resolve(op('--destino') || path.join(aqui, enRepo ? '../../frontend/public/oficios' : '../oficios'));
  const sueltos = args.slice(1).filter((a, i, L) => !a.startsWith('--') && !['--plantilla', '--destino', '--datos', '--a', '--motivo', '--sql', '--completos'].includes(L[i - 1]));
  const datos = op('--datos') && path.resolve(op('--datos')), completos = op('--completos');
  const di = r => { r.avisos.forEach(a => console.log('   aviso  ' + a)); r.errores.forEach(e => console.log('   ERROR  ' + e)) };
  let mal = 0;
  try {
  if (orden === 'nueva') {
    const r = nueva({ plantilla, destino, datos }); di(r);
    if (!r.ok) mal = 1;
    else {
      console.log(`CREADA  ${r.id} · ${r.nombre} · versión ${r.version}\n        ${r.carpeta}`);
      if (r.publico) console.log(`\nVa con servidor: la copia lleva solo la parte pública de sus datos (del equipo, el nombre y la inicial).\nSus datos completos se quedan en ${datos}: no los subas al repositorio, que es público.\nSon los que van al servidor con «alta ${r.id} --datos …» y, cuando cambien, con «subir-datos» y «publica».`);
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
    for (const id of ids) { const r = actualizar({ plantilla, destino, id, conAzar: !tiene('--sin-azar'), completos }); di(r);
      if (r.fijada) { console.log(`FIJADA, SE QUEDA COMO ESTÁ  ${id} · versión ${r.version} · ${r.fijada.motivo} (desde ${r.fijada.desde}). Para ponerla al día: node copias.mjs suelta ${id}`); continue }
      console.log(r.ok ? (r.cambiada ? `PUESTA AL DÍA  ${id} · de ${r.de || 'sin versión'} a ${r.version} · ${r.archivos.length} archivos` : `YA ESTABA AL DÍA  ${id} · versión ${r.version}`) : `SE QUEDA COMO ESTABA  ${id}`); if (!r.ok) mal++ }
  } else if (orden === 'lista' || orden === 'comprueba') {
    const L = lista({ plantilla, destino, completos }); if (!L.length) console.log('No hay ninguna copia en ' + destino);
    // una copia fijada puede ir por detrás de la plantilla (se publica por fases o se ha vuelto atrás): no cuenta como fallo
    for (const c of L) { const espera = !c.alDia && c.fijada; console.log(`${(c.alDia || espera) && !c.errores.length ? (espera ? 'FIJA' : 'BIEN') : 'OJO '}  ${c.id.padEnd(22)} ${c.nombre.padEnd(26)} versión ${c.version || '¿?'}${c.alDia ? '' : ' (la plantilla va por la ' + c.plantilla + '; distintos: ' + c.dif.join(', ') + ')'}${c.fijada ? ' · fijada: ' + c.fijada.motivo : ''}${c.prueba ? ' · copia de prueba' : ''}${c.publico ? ' · archivo público' + (c.completos ? '' : ' (sus datos completos no están aquí)') : ''}`); c.errores.forEach(e => console.log('   ERROR  ' + e)); if (orden === 'comprueba' && ((!c.alDia && !c.fijada) || c.errores.length)) mal++ }
  } else if (orden === 'atras') {
    if (sueltos.length !== 1) { console.log('Di qué copia: node copias.mjs atras <id> [--a <commit>]'); mal = 2 }
    else { const r = atras({ destino, id: sueltos[0], a: op('--a') }); di(r);
      console.log(r.ok ? `VUELTA ATRÁS  ${r.id} · de ${r.de || '¿?'} a ${r.version} (${r.commit}) · ${r.archivos.length} archivos · queda fijada; para volver a ponerla al día: node copias.mjs suelta ${r.id} y actualizar ${r.id}` : `SE QUEDA COMO ESTABA  ${sueltos[0]}`); if (!r.ok) mal = 1 }
  } else if (orden === 'fija' || orden === 'suelta') {
    if (!sueltos.length) { console.log(`Di qué copia: node copias.mjs ${orden} <id>`); mal = 2 }
    for (const id of sueltos) { const r = orden === 'fija' ? fija({ destino, id, motivo: op('--motivo') }) : suelta({ destino, id }); r.errores.forEach(e => console.log('   ERROR  ' + e));
      console.log(!r.ok ? `NO SE HA PODIDO  ${id}` : orden === 'fija' ? `FIJADA  ${id} · ${r.fijada.motivo}` : `SUELTA  ${id}${r.estaba ? '' : ' (no estaba fijada)'}`); if (!r.ok) mal++ }
  } else if (orden === 'app') {
    if (!sueltos.length) { console.log('Di qué carpeta: node copias.mjs app <carpeta>…'); mal = 2 }
    for (const c of sueltos) { const carpeta = path.resolve(c); let N; try { ({ N } = leeNegocio(path.join(carpeta, DATOS))) } catch (e) { console.log('NO SE HA PODIDO  ' + c + ': ' + e.message); mal++; continue }
      const h = ponApp(carpeta, N); console.log((h.length ? 'PUESTO  ' + h.join(', ') : 'YA ESTABA') + '  ' + c + (fs.existsSync(path.join(carpeta, 'assets/icono-192.png')) ? '' : ' · sin iconos PNG: python3 iconos.py ' + c)) }
  } else if (orden === 'publica') {
    if (sueltos.length !== 1) { console.log('Di qué copia: node copias.mjs publica <id> [--datos <sus datos completos>]'); mal = 2 }
    else { const r = publica({ plantilla, destino, id: sueltos[0], datos, completos }); di(r);
      console.log(!r.ok ? 'NO SE HA PODIDO  ' + sueltos[0] : r.cambiado ? `PUESTO EL ARCHIVO PÚBLICO  ${r.id} · hecho con ${r.completos}` : `YA ESTABA  ${r.id} · su archivo público ya es el de ${r.completos}`); if (!r.ok) mal = 1 }
  } else if (orden === 'alta' || orden === 'subir-datos') {
    if (sueltos.length !== 1) { console.log(`Di qué copia: node copias.mjs ${orden} <id> [--datos <sus datos completos>] [--sql <archivo>]`); mal = 2 }
    else {
      const id = sueltos[0], r = orden === 'alta' ? alta({ plantilla, destino, id, datos, completos }) : await subirDatos({ plantilla, destino, id, datos, completos }); di(r);
      if (!r.ok) { console.log('NO SE HA PODIDO  ' + id); mal = 1 }
      else {
        // el SQL va a un archivo (no lleva códigos); los códigos, solo a la pantalla
        const archivo = path.resolve(op('--sql') || path.join(os.tmpdir(), `${orden}-${id}-${hoy()}.sql`));
        fs.writeFileSync(archivo, r.sql, { mode: 0o600 });
        if (orden === 'alta') {
          console.log(`SQL DEL ALTA  ${r.nombre} (${id})${r.completos ? ', con sus datos completos de ' + r.completos : ''}\n        ${archivo}\n        Se pasa en Supabase (SQL Editor) o con su conector. No lleva ningún código, solo sus huellas.`);
          console.log('\nCÓDIGOS PARA ENTRAR. Se enseñan solo esta vez y no se guardan en ningún sitio: dáselos a cada uno por un canal privado.');
          for (const g of r.codigos) console.log(`    ${(g.n + ' (' + g.persona + ')').padEnd(34)} ${g.codigo}`);
          if (!r.conServidor) console.log('\nOjo: sus datos no llevan la línea «servidor». Sin ella, la app no habla con el servidor: cópiala de otra copia que lo lleve.');
          console.log(`\nSi un código se pierde, el dueño da otro desde su app («Tu sesión» → «Equipo y accesos»).`);
        } else console.log(`SQL DE LOS DATOS  ${r.nombre} (${id})${r.completos ? ', con sus datos completos de ' + r.completos : ''}\n        ${archivo}\n        Cuando esté pasado, el servidor dará la huella ${r.huella || '(no se ha podido calcular)'}; la app de cada uno se pone al día sola.`);
      }
    }
  } else { console.log('Uso: node copias.mjs nueva --datos <archivo.js> | publica <id> [--datos <completos.js>] | actualizar --todas | actualizar <id> | lista | comprueba | atras <id> | fija <id> | suelta <id> | app <carpeta> | alta <id> [--datos <completos.js>] | subir-datos <id> [--datos <completos.js>]'); mal = 2 }
  } catch (e) { console.log('No se ha podido: ' + e.message); mal = 2 }
  process.exit(mal);
}
