// Pruebas de la herramienta de copias (../copias.mjs): crear la copia de un negocio, ponerlas al día cuando cambia lo común
// y que una copia que falla se quede como estaba sin frenar a las demás. Todo en carpetas temporales: no toca el repositorio.
// Uso: node prueba-copias.mjs <carpeta del sitio>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { nueva, actualizar, lista, estado, copiasDe, COMUNES } from '../copias.mjs';

const sitio = path.resolve(process.argv[2] || '.'), aqui = path.dirname(fileURLToPath(import.meta.url));
let ok = 0; const mal = []; const es = (c, t) => { if (c) ok++; else { mal.push(t); console.log('  MAL ', t) } };
const h = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'copias-')), destino = path.join(T, 'oficios'), VOLTIO = path.join(aqui, 'negocios/voltio.js'), DEMO = path.join(sitio, 'js/oficio-datos.js');
const huellas = dir => COMUNES.map(f => h(path.join(dir, f))).join();
const P0 = huellas(sitio), version0 = /const VERSION='([^']+)'/.exec(fs.readFileSync(path.join(sitio, 'js/oficio-nucleo.js'), 'utf8'))[1];

// ---- 1. crear una copia
let r = nueva({ plantilla: sitio, destino, datos: VOLTIO }); const cv = path.join(destino, 'voltio');
es(r.ok && r.id === 'voltio' && r.carpeta === cv && r.version === version0, 'crear: la copia de Voltio sale con el «id» de sus datos como carpeta y la versión de la plantilla');
es(COMUNES.every(f => fs.existsSync(path.join(cv, f))) && huellas(cv) === P0, 'crear: lleva todos los archivos comunes, idénticos a los de la plantilla');
es(h(path.join(cv, 'js/oficio-datos.js')) === h(VOLTIO), 'crear: su archivo de datos es el que se le dio, sin tocar');
const ficha = JSON.parse(fs.readFileSync(path.join(cv, 'copia.json'), 'utf8'));
es(ficha.id === 'voltio' && ficha.nombre === 'Voltio Sur' && ficha.version === version0 && /^\d{4}-\d\d-\d\d$/.test(ficha.creada) && ficha.prueba === false, 'crear: deja una ficha con el negocio, la fecha y la versión');
es(/url=cita\.html/.test(fs.readFileSync(path.join(cv, 'index.html'), 'utf8')) && /noindex/.test(fs.readFileSync(path.join(cv, 'index.html'), 'utf8')), 'crear: su portada lleva a pedir cita y no se ofrece a los buscadores');
es(!fs.readdirSync(cv).includes('prueba.html') && !fs.existsSync(path.join(cv, 'assets/entrada-h.mp4')), 'crear: no se lleva lo que es solo de la demo (la página de los tres móviles, los vídeos)');
r = nueva({ plantilla: sitio, destino, datos: VOLTIO });
es(!r.ok && /Ya hay una copia/.test(r.errores[0]) && huellas(cv) === P0, 'crear: sobre una copia que ya existe no se crea otra');
// datos que no valen
const roto = path.join(T, 'roto.js'); fs.writeFileSync(roto, fs.readFileSync(VOLTIO, 'utf8').replace("id:'voltio'", "id:'roto'").replace("tel:'960 00 00 00'", "tel:'12'"));
r = nueva({ plantilla: sitio, destino, datos: roto });
es(!r.ok && r.errores.length > 0 && !fs.existsSync(path.join(destino, 'roto')) && fs.readdirSync(destino).join() === 'voltio', 'crear: con unos datos que no valen no se crea nada, ni a medias');
const feo = path.join(T, 'feo.js'); fs.writeFileSync(feo, fs.readFileSync(VOLTIO, 'utf8').replace("id:'voltio'", "id:'Voltio Sur'"));
r = nueva({ plantilla: sitio, destino, datos: feo });
es(!r.ok && fs.readdirSync(destino).join() === 'voltio', 'crear: un «id» con mayúsculas o espacios no sirve de carpeta');
r = nueva({ plantilla: sitio, destino, datos: path.join(T, 'no-existe.js') });
es(!r.ok && /No encuentro/.test(r.errores[0]), 'crear: si el archivo de datos no existe, lo dice');
r = nueva({ plantilla: sitio, destino, datos: DEMO });
es(r.ok && r.id === 'ramirez' && copiasDe(destino).join() === 'ramirez,voltio', 'crear: una segunda copia, con otros datos, convive con la primera');
// una copia marcada como prueba
const dePrueba = path.join(T, 'prueba.js'); fs.writeFileSync(dePrueba, fs.readFileSync(VOLTIO, 'utf8').replace("id:'voltio'", "id:'voltio-prueba'").replace("pack:'pro',", "pack:'pro',prueba:true,"));
r = nueva({ plantilla: sitio, destino, datos: dePrueba });
es(r.ok && JSON.parse(fs.readFileSync(path.join(destino, 'voltio-prueba/copia.json'), 'utf8')).prueba === true, 'crear: una copia marcada como prueba lo lleva en su ficha');

// ---- 2. la lista
let L = lista({ plantilla: sitio, destino });
es(L.length === 3 && L.every(c => c.alDia && !c.errores.length && c.version === version0) && L.find(c => c.id === 'voltio-prueba').prueba, 'lista: las tres copias, al día, con su versión, y cuál es de prueba');

// ---- 3. cambia lo común: una plantilla nueva
const P2 = path.join(T, 'plantilla2'); fs.cpSync(sitio, P2, { recursive: true });
fs.writeFileSync(path.join(P2, 'js/oficio-nucleo.js'), fs.readFileSync(path.join(P2, 'js/oficio-nucleo.js'), 'utf8').replace(/const VERSION='[^']+'/, "const VERSION='2099.01.01'"));
fs.appendFileSync(path.join(P2, 'app.html'), '\n<!-- cambio de prueba -->\n');
L = lista({ plantilla: P2, destino });
es(L.every(c => !c.alDia && c.dif.sort().join() === 'app.html,js/oficio-nucleo.js' && c.version === version0 && c.plantilla === '2099.01.01'), 'lista: cuando cambia lo común, dice qué copias se han quedado atrás y en qué archivos');
// una copia con los datos estropeados: no se actualiza
const dv = path.join(cv, 'js/oficio-datos.js'), bueno = fs.readFileSync(dv, 'utf8'); fs.writeFileSync(dv, bueno.replace("tel:'960 00 00 00'", "tel:'12'")); const hRoto = h(dv), antes = huellas(cv);
r = actualizar({ plantilla: P2, destino, id: 'voltio', conAzar: false });
es(!r.ok && r.cambiada === false && huellas(cv) === antes && h(dv) === hRoto && /no valen/.test(r.errores[0]), 'actualizar: una copia cuyos datos no valen con las reglas nuevas se queda como estaba, y dice por qué');
const dr = path.join(destino, 'ramirez/js/oficio-datos.js'), hr = h(dr);
r = actualizar({ plantilla: P2, destino, id: 'ramirez', conAzar: true });
es(r.ok && r.cambiada && r.de === version0 && r.version === '2099.01.01' && r.archivos.sort().join() === 'app.html,js/oficio-nucleo.js', 'actualizar: las demás siguen: esta pasa sus recorridos al azar y cambia de versión');
es(huellas(path.join(destino, 'ramirez')) === huellas(P2) && h(dr) === hr, 'actualizar: queda con lo común de la plantilla nueva y con su archivo de datos intacto');
const f2 = JSON.parse(fs.readFileSync(path.join(destino, 'ramirez/copia.json'), 'utf8'));
es(f2.version === '2099.01.01' && f2.id === 'ramirez' && f2.creada && f2.actualizada, 'actualizar: la ficha apunta la versión nueva y conserva cuándo se creó');
r = actualizar({ plantilla: P2, destino, id: 'ramirez', conAzar: false });
es(r.ok && r.cambiada === false, 'actualizar: una copia que ya está al día no se toca');
fs.writeFileSync(dv, bueno); r = actualizar({ plantilla: P2, destino, id: 'voltio', conAzar: false });
es(r.ok && r.cambiada && h(dv) === h(VOLTIO), 'actualizar: arreglados sus datos, la que se quedó atrás se pone al día');
r = actualizar({ plantilla: P2, destino, id: 'no-existe', conAzar: false });
es(!r.ok && /No hay ninguna copia/.test(r.errores[0]), 'actualizar: una copia que no existe, lo dice');
// una plantilla incompleta no rompe una copia a medias
const P3 = path.join(T, 'plantilla3'); fs.cpSync(P2, P3, { recursive: true }); fs.appendFileSync(path.join(P3, 'cita.html'), '\n<!-- otro cambio -->\n'); fs.rmSync(path.join(P3, 'oficio.css'));
let dicho = ''; try { estado(P3, cv) } catch (e) { dicho = e.message }
es(/le falta oficio\.css/.test(dicho) && huellas(cv) === huellas(P2), 'una plantilla a la que le falta un archivo se detecta antes de tocar ninguna copia');
const idNuevo = path.join(T, 'tercero.js'); fs.writeFileSync(idNuevo, fs.readFileSync(VOLTIO, 'utf8').replace("id:'voltio'", "id:'tercero'"));
r = nueva({ plantilla: P3, destino, datos: idNuevo });
es(!r.ok && /le falta oficio\.css/.test(r.errores.join()) && !fs.existsSync(path.join(destino, 'tercero')) && !fs.readdirSync(destino).some(d => d.startsWith('.nueva-')), 'crear: si a la plantilla le falta un archivo, no se crea nada ni queda basura');

// ---- 4. desde la consola
const cli = (...a) => spawnSync(process.execPath, [path.join(aqui, '../copias.mjs'), ...a], { encoding: 'utf8', timeout: 300000 });
let c = cli('comprueba', '--plantilla', P2, '--destino', destino);
es(c.status === 1 && /OJO\s+voltio-prueba/.test(c.stdout) && /BIEN\s+ramirez/.test(c.stdout), '«comprueba» sale con error si alguna copia no va al día, y dice cuál');
c = cli('actualizar', '--todas', '--sin-azar', '--plantilla', P2, '--destino', destino);
es(c.status === 0 && /PUESTA AL DÍA\s+voltio-prueba/.test(c.stdout) && /YA ESTABA AL DÍA\s+ramirez/.test(c.stdout), '«actualizar --todas» pone al día las que faltan y deja las demás');
c = cli('comprueba', '--plantilla', P2, '--destino', destino);
es(c.status === 0 && (c.stdout.match(/BIEN/g) || []).length === 3 && /copia de prueba/.test(c.stdout), '«comprueba» sale bien cuando todas van al día');
c = cli('nueva', '--datos', idNuevo, '--plantilla', P2, '--destino', destino);
const cod = (/\n\s{4}([a-z0-9]{4}(?:-[a-z0-9]{4}){3})\n/.exec(c.stdout) || [])[1];
es(c.status === 0 && /CREADA\s+tercero/.test(c.stdout) && !!cod && c.stdout.includes("oficios.huella('tercero', '" + cod + "')"), '«nueva» crea la copia y da un código de soporte nuevo con la orden para darla de alta en el buzón');
const todo = fs.readdirSync(path.join(destino, 'tercero'), { recursive: true }).filter(f => fs.statSync(path.join(destino, 'tercero', f)).isFile()).map(f => fs.readFileSync(path.join(destino, 'tercero', f), 'latin1')).join('\n');
es(!!cod && !todo.includes(cod), 'el código de soporte no queda escrito en ningún archivo de la copia');
c = cli('nueva', '--datos', roto, '--plantilla', P2, '--destino', destino);
es(c.status === 1 && /ERROR/.test(c.stdout) && !fs.existsSync(path.join(destino, 'roto')), '«nueva» con datos que no valen sale con error y enseña cuáles');
c = cli('baila'); es(c.status === 2 && /Uso:/.test(c.stdout), 'una orden que no existe enseña cómo se usa');
c = cli('actualizar', '--todas', '--sin-azar', '--plantilla', P3, '--destino', destino);
es(c.status === 2 && /le falta oficio\.css/.test(c.stdout) && huellas(cv) === huellas(P2), 'con una plantilla incompleta, «actualizar» se para, lo dice y no toca ninguna copia');

// ---- 5. nada de esto ha tocado la plantilla de verdad
es(huellas(sitio) === P0 && h(VOLTIO) === h(path.join(aqui, 'negocios/voltio.js')), 'la plantilla y los datos de partida siguen como estaban');
fs.rmSync(T, { recursive: true, force: true });
console.log((mal.length ? 'MAL' : 'BIEN') + ': ' + ok + ' comprobaciones pasan' + (mal.length ? ', ' + mal.length + ' fallan' : '') + '.');
process.exit(mal.length ? 1 : 0);
