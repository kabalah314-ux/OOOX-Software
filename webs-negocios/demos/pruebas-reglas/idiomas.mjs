// Los idiomas de lo que ve el cliente (js/oficio-idioma.js), sin navegador:
//  1) que cada texto de la cita, la zona del cliente y los papeles esté en catalán y en inglés, con los mismos datos entre
//     llaves ({tel}, {fecha}…), y que no sobre ninguno;
//  2) que lo propio de cada negocio (sus averías, su catálogo, sus planes, su furgoneta y su dirección) esté en los «textos»
//     de su archivo de datos, si los tiene. Sin «textos», el negocio sale en castellano en los otros idiomas: es un aviso.
// Lo que se ve de verdad en cada idioma, pantalla a pantalla, lo mira pruebas-navegador/idiomas.py.
// Uso: node idiomas.mjs <carpeta del sitio> [datos.js …]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { leeNegocio } from './valida-negocio.mjs';

const require = createRequire(import.meta.url);
const [sitio, ...datos] = process.argv.slice(2);
if (!sitio) { console.log('Uso: node idiomas.mjs <carpeta del sitio> [datos.js …]'); process.exit(2) }
let mal = 0, avisos = 0;
const falla = t => { mal++; console.log('  MAL    ' + t) };
const aviso = t => { avisos++; console.log('  aviso  ' + t) };

// ---- 1) las llaves: lo que va dentro de _( … ) y lo de las listas que se traducen al enseñarlas
// el primer argumento de una llamada, desde justo después de «(»: hasta la coma o el paréntesis que la cierran
function primerArg(s, i) {
  let d = 0, q = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') { j++; continue } if (c === q) q = null; continue }
    if (c === "'" || c === '"' || c === '`') { q = c; continue }
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) { if (d === 0) return s.slice(i, j); d-- }
    else if (c === ',' && d === 0) return s.slice(i, j);
  }
  return s.slice(i);
}
// los textos entre comillas simples de un trozo de código (las listas llevan las claves sin comillas: «nuevo:'…'»)
const literales = t => [...t.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map(m => m[1].replace(/\\(.)/g, '$1'));
// el objeto que sigue a «const NOMBRE=» o a «Object.assign(NOMBRE,», entero (hasta la llave que lo cierra)
function bloque(s, empieza) {
  const i = s.indexOf(empieza); if (i < 0) return null;
  const a = s.indexOf('{', i); let d = 0, q = null;
  for (let j = a; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') { j++; continue } if (c === q) q = null; continue }
    if (c === "'" || c === '"' || c === '`') { q = c; continue }
    if (c === '{') d++; else if (c === '}' && --d === 0) return s.slice(a, j + 1);
  }
  return null;
}
// cada archivo: con qué se traduce (_ en las páginas y los papeles; T dentro del propio archivo de idiomas) y qué listas
// guardan textos en castellano que se traducen al enseñarlos
const ARCHIVOS = {
  'cita.html': ['_', 'const ERR=', 'Object.assign(ERR,', 'const MIENTRAS='],
  'cliente.html': ['_', 'const EST=', 'const ERR='],
  'js/oficio-papeles.js': ['_', 'const PAGO='],
  'js/oficio-estado.js': ['_'],
  'js/oficio-idioma.js': ['T'],
};
const llaves = new Map();   // texto en castellano → dónde sale
for (const [f, [fn, ...listas]] of Object.entries(ARCHIVOS)) {
  const ruta = path.join(sitio, f);
  if (!fs.existsSync(ruta)) { falla('falta ' + f); continue }
  const s = fs.readFileSync(ruta, 'utf8'); let n = 0;
  for (const m of s.matchAll(new RegExp('(?<![\\w$.])' + fn + '\\(', 'g'))) for (const t of literales(primerArg(s, m.index + fn.length + 1))) { if (t) { llaves.set(t, f); n++ } }
  for (const l of listas) { const b = bloque(s, l); if (!b) { falla(f + ': no encuentro «' + l + '»'); continue } literales(b).forEach(t => { if (t) llaves.set(t, f) }) }
  // los textos sueltos que se guardan en castellano y se traducen al enseñarlos
  for (const m of s.matchAll(/(?:B\.fotoMal|PRECIO_NOTA)\s*=\s*'((?:[^'\\\n]|\\.)*)'/g)) if (m[1]) llaves.set(m[1], f);
  if (!n) falla(f + ': no tiene ningún texto con ' + fn + '(…); ¿se ha quitado el idioma?');
}

globalThis.window = globalThis;
require(path.resolve(sitio, 'js/oficio-idioma.js'));
const I = globalThis.OficioIdioma, D = I && I.D;
if (!D) { console.log('MAL: js/oficio-idioma.js no da OficioIdioma.D'); process.exit(1) }
const datosDe = t => (t.match(/\{\w+\}/g) || []).sort().join(' ');
for (const l of ['ca', 'en']) {
  for (const [k, f] of llaves) {
    const v = D[l][k];
    if (typeof v !== 'string' || !v.trim()) { falla(l + ': falta «' + k + '» (' + f + ')'); continue }
    if (datosDe(v) !== datosDe(k)) falla(l + ': «' + k + '» lleva {' + datosDe(k) + '} y la traducción {' + datosDe(v) + '}');
    if (/[¿¡]/.test(v) && l === 'en') falla('en: «' + v + '» lleva signos de abrir del castellano');
  }
  for (const k of Object.keys(D[l])) if (!llaves.has(k)) falla(l + ': sobra «' + k + '» (ya no lo usa ninguna pantalla)');
}

// ---- 2) lo de cada negocio: sus textos en su archivo de datos
for (const f of datos) {
  let N; try { ({ N } = leeNegocio(f)) } catch (e) { falla(f + ': no se puede leer: ' + e.message); continue }
  const suyos = new Set();
  const pon = t => { if (typeof t === 'string' && t.trim()) suyos.add(t) };
  (N.averias || []).forEach(a => pon(a.n)); Object.values(N.catalogo || {}).forEach(i => pon(i.t));
  (N.tecnicos || []).forEach(t => pon(t.coche)); pon(N.dir);
  const MT = N.mantenimiento; if (MT) { if (MT.revision) pon(MT.revision.n); (MT.planes || []).forEach(p => pon(p.n)) }
  const nombre = path.basename(path.dirname(path.dirname(f))) + '/' + path.basename(f);
  if (!N.textos) { aviso(nombre + ': sin «textos»: sus averías, su catálogo y su plan salen en castellano en catalán y en inglés'); continue }
  if (!Array.isArray(N.textos)) { falla(nombre + ': «textos» tiene que ser una lista de filas [castellano, catalán, inglés]'); continue }
  const fila = new Map();
  N.textos.forEach((f, i) => {
    if (!Array.isArray(f) || f.length !== 3 || f.some(x => typeof x !== 'string' || !x.trim())) { falla(nombre + ': textos[' + i + '] no es [castellano, catalán, inglés]'); return }
    if (fila.has(f[0])) falla(nombre + ': textos: «' + f[0] + '» está dos veces');
    fila.set(f[0], f);
    if (!suyos.has(f[0])) aviso(nombre + ': textos: «' + f[0] + '» no es ningún texto del negocio. ¿Es una errata?');
    if (Object.prototype.hasOwnProperty.call(D.ca, f[0])) aviso(nombre + ': textos: «' + f[0] + '» ya está en lo común; el del negocio manda');
  });
  for (const t of suyos) if (!fila.has(t)) falla(nombre + ': textos: falta «' + t + '»');
}
console.log((mal ? 'MAL' : 'BIEN') + ': ' + llaves.size + ' textos de la cita, la zona del cliente y los papeles, en catalán y en inglés' +
  (datos.length ? '; ' + datos.length + ' negocios con lo suyo' : '') + (mal ? ', ' + mal + ' fallos' : '') + (avisos ? ' (' + avisos + ' avisos)' : ''));
process.exit(mal ? 1 : 0);
