// El candado de la versión de las reglas (21-11-2026).
// Las reglas (js/oficio-nucleo.js) las usan la app y el servidor, y el servidor corre la versión que se le desplegó. Si se
// cambia una regla y no se cambia VERSION, nadie se entera de que el servidor va con otras: el 20-11 pasó (el código postal
// opcional) y solo se vio por casualidad. Este candado apunta, junto a cada VERSION, la huella de las reglas con las que se
// hizo, y falla si las reglas cambian sin que cambie la versión.
//
//   node prueba-version.mjs <carpeta del sitio> <reglas.lock.json>             comprueba (falla si no cuadra)
//   node prueba-version.mjs <carpeta del sitio> <reglas.lock.json> --apunta    apunta la versión y la huella de ahora; se
//                                                                              niega si las reglas cambiaron y VERSION no
//
// Para sacar una versión nueva: cambiar la regla, subir VERSION en oficio-nucleo.js, correr con --apunta, poner al día las copias
// (copias.mjs actualizar --todas) y redesplegar la función con esa versión (webs-negocios/oficios-servidor/LEEME.md).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [, , sitio, lockArchivo, ...banderas] = process.argv;
if (!sitio || !lockArchivo) { console.log('Uso: node prueba-version.mjs <carpeta del sitio> <reglas.lock.json> [--apunta]'); process.exit(2) }

const RE_VERSION = /^const VERSION='([^']+)';.*$/m;
/** la versión que dice el archivo y la huella de todo lo demás (la línea de VERSION no cuenta: es lo que cambia a propósito) */
export function lee(texto0) {
  const texto = texto0.replace(/\r\n/g, '\n');   // la misma huella con finales de línea de Windows o de Linux
  const m = texto.match(RE_VERSION); if (!m) return null;
  return { version: m[1], huella: crypto.createHash('sha256').update(texto.replace(RE_VERSION, 'const VERSION=#;')).digest('hex') };
}
/** qué pasa con unas reglas y el candado: 'bien', 'cambiaron' (reglas distintas, misma versión), 'sin-apuntar' (versión nueva sin apuntar) */
export function veredicto(ahora, lock) {
  if (!lock) return 'sin-apuntar';
  if (ahora.version === lock.version) return ahora.huella === lock.huella ? 'bien' : 'cambiaron';
  return 'sin-apuntar';
}

const nucleo = fs.readFileSync(path.join(sitio, 'js/oficio-nucleo.js'), 'utf8');
const ahora = lee(nucleo);
if (!ahora) { console.log('MAL: no encuentro la línea «const VERSION=\'…\';» en oficio-nucleo.js'); process.exit(1) }
let lock = null; try { lock = JSON.parse(fs.readFileSync(lockArchivo, 'utf8')) } catch (e) { /* sin candado todavía */ }

if (banderas.includes('--apunta')) {
  if (veredicto(ahora, lock) === 'cambiaron') { console.log(`MAL: las reglas han cambiado y VERSION sigue en ${ahora.version}. Sube VERSION en oficio-nucleo.js y vuelve a apuntar.`); process.exit(1) }
  fs.writeFileSync(lockArchivo, JSON.stringify({ version: ahora.version, huella: ahora.huella }, null, 2) + '\n');
  console.log(`Apuntado: reglas ${ahora.version} (${ahora.huella.slice(0, 12)}…)`); process.exit(0);
}

let ok = 0, mal = 0; const es = (c, t) => { if (c) ok++; else { mal++; console.log('  FALLA:', t) } };
// el candado de verdad
const v = veredicto(ahora, lock);
es(v !== 'cambiaron', `las reglas han cambiado (huella distinta) y VERSION sigue en ${ahora.version}: sube VERSION, corre con --apunta y redespliega la función`);
es(v !== 'sin-apuntar', `la versión ${ahora.version} no está apuntada en ${path.basename(lockArchivo)}: corre con --apunta`);
// y que el candado sabe cazar lo que tiene que cazar
const base = { version: '2000.01.01', huella: lee(nucleo.replace(RE_VERSION, "const VERSION='2000.01.01';")).huella };
const retoque = nucleo.replace(RE_VERSION, "const VERSION='2000.01.01';").replace('function', 'function /* una regla tocada */');
es(veredicto(lee(retoque), base) === 'cambiaron', 'autoprueba: tocar una regla sin tocar la versión se caza');
es(veredicto(lee(nucleo.replace(RE_VERSION, "const VERSION='2000.01.01';")), base) === 'bien', 'autoprueba: las mismas reglas con la misma versión pasan');
es(veredicto(lee(retoque.replace('2000.01.01', '2000.01.02')), base) === 'sin-apuntar', 'autoprueba: reglas y versión nuevas, sin apuntar, también se cazan');
es(veredicto(lee(nucleo), null) === 'sin-apuntar', 'autoprueba: sin candado no se da por bueno');
console.log(mal ? `MAL: ${ok} comprobaciones pasan, ${mal} fallan` : `BIEN: ${ok} comprobaciones pasan · reglas ${ahora.version}, huella ${ahora.huella.slice(0, 12)}…`);
process.exit(mal ? 1 : 0);
