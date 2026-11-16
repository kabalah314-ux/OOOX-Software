// Pruebas de la herramienta de copias (../copias.mjs): crear la copia de un negocio, ponerlas al día cuando cambia lo común
// y que una copia que falla se quede como estaba sin frenar a las demás. Todo en carpetas temporales: no toca el repositorio.
// Uso: node prueba-copias.mjs <carpeta del sitio>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { nueva, actualizar, lista, estado, copiasDe, COMUNES, atras, fija, suelta, ponApp, manifiesto, alta, subirDatos, datosServidor, codigoNuevo } from '../copias.mjs';
import { leeNegocio, leeNucleo } from './valida-negocio.mjs';

const sitio = path.resolve(process.argv[2] || '.'), aqui = path.dirname(fileURLToPath(import.meta.url));
let ok = 0; const mal = []; const es = (c, t) => { if (c) ok++; else { mal.push(t); console.log('  MAL ', t) } };
const h = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'copias-')), destino = path.join(T, 'oficios'), VOLTIO = path.join(aqui, 'negocios/voltio.js'), DEMO = path.join(sitio, 'js/oficio-datos.js');
const huellas = dir => COMUNES.map(f => h(path.join(dir, f))).join();
const P0 = huellas(sitio), version0 = /const VERSION='([^']+)'/.exec(fs.readFileSync(path.join(sitio, 'js/oficio-nucleo.js'), 'utf8'))[1];

// ---- 1. crear una copia
let r = nueva({ plantilla: sitio, destino, datos: VOLTIO }); const cv = path.join(destino, 'voltio');
es(r.ok && r.id === 'voltio' && r.carpeta === cv && r.version === version0 && r.demo === false, 'crear: la copia de Voltio sale con el «id» de sus datos como carpeta y la versión de la plantilla (no es una demo: pedirá su código de soporte)');
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
es(r.ok && r.id === 'ramirez' && copiasDe(destino).join() === 'ramirez,voltio' && r.demo === true, 'crear: una segunda copia, con otros datos, convive con la primera (y como trae su muestra y no va con servidor, es una demo)');
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

// ---- 4b. publicar por fases: fijar, soltar y volver atrás (con git, en un repositorio de prueba)
{
  const G = path.join(T, 'repo'), GP = path.join(G, 'plantilla'), GD = path.join(G, 'oficios'), cv2 = path.join(GD, 'voltio');
  for (const f of COMUNES) { fs.mkdirSync(path.dirname(path.join(GP, f)), { recursive: true }); fs.copyFileSync(path.join(sitio, f), path.join(GP, f)); }
  const g = (...a) => spawnSync('git', a, { cwd: G, encoding: 'utf8' });
  g('init', '-q'); g('config', 'user.email', 'prueba@ejemplo.invalid'); g('config', 'user.name', 'Prueba'); g('config', 'commit.gpgsign', 'false');
  let x = nueva({ plantilla: GP, destino: GD, datos: VOLTIO }); g('add', '-A'); g('commit', '-qm', 'uno');
  const v1 = huellas(cv2), hd = h(path.join(cv2, 'js/oficio-datos.js'));
  fs.writeFileSync(path.join(GP, 'js/oficio-nucleo.js'), fs.readFileSync(path.join(GP, 'js/oficio-nucleo.js'), 'utf8').replace(/const VERSION='[^']+'/, "const VERSION='2099.02.02'"));
  fs.appendFileSync(path.join(GP, 'app.html'), '\n<!-- cambio de la prueba -->\n');
  x = actualizar({ plantilla: GP, destino: GD, id: 'voltio', conAzar: false }); g('add', '-A'); g('commit', '-qm', 'dos');
  es(x.ok && x.cambiada && x.version === '2099.02.02', 'fases: la copia se pone al día con la versión nueva');
  x = atras({ destino: GD, id: 'voltio' });
  const fi = JSON.parse(fs.readFileSync(path.join(cv2, 'copia.json'), 'utf8'));
  es(x.ok && x.de === '2099.02.02' && x.version === version0 && huellas(cv2) === v1 && h(path.join(cv2, 'js/oficio-datos.js')) === hd, 'atrás: vuelve a lo común de antes de su última puesta al día, sin tocar sus datos');
  es(fi.version === version0 && fi.fijada && /Vuelta atrás desde la 2099\.02\.02/.test(fi.fijada.motivo), 'atrás: la ficha dice la versión y queda fijada, con el motivo');
  es(!fs.readdirSync(GD).some(d => d.startsWith('.atras-')), 'atrás: no deja carpetas a medias');
  x = actualizar({ plantilla: GP, destino: GD, id: 'voltio', conAzar: false });
  es(x.ok && !x.cambiada && x.fijada && huellas(cv2) === v1, 'fijada: «actualizar» se la salta');
  c = cli('comprueba', '--plantilla', GP, '--destino', GD);
  es(c.status === 0 && /FIJA\s+voltio/.test(c.stdout), '«comprueba» da por buena una copia fijada que va por detrás, y lo dice');
  c = cli('actualizar', '--todas', '--sin-azar', '--plantilla', GP, '--destino', GD);
  es(c.status === 0 && /FIJADA, SE QUEDA COMO ESTÁ\s+voltio/.test(c.stdout) && huellas(cv2) === v1, '«actualizar --todas» se salta la fijada y lo dice');
  c = cli('suelta', 'voltio', '--destino', GD); x = actualizar({ plantilla: GP, destino: GD, id: 'voltio', conAzar: false });
  es(c.status === 0 && /SUELTA\s+voltio/.test(c.stdout) && x.ok && x.cambiada && x.version === '2099.02.02', 'soltarla: vuelve a ponerse al día');
  c = cli('fija', 'voltio', '--motivo', 'Espera a que Voltio lo pruebe', '--destino', GD);
  es(c.status === 0 && JSON.parse(fs.readFileSync(path.join(cv2, 'copia.json'), 'utf8')).fijada.motivo === 'Espera a que Voltio lo pruebe', '«fija» la deja quieta, con su motivo');
  x = atras({ destino: GD, id: 'voltio', a: 'noexiste123' });
  es(!x.ok && /No encuentro ese commit/.test(x.errores[0]) && JSON.parse(fs.readFileSync(path.join(cv2, 'copia.json'), 'utf8')).version === '2099.02.02', 'atrás: un commit que no existe, lo dice y no toca nada');
  x = atras({ destino, id: 'voltio' });
  es(!x.ok && /necesita el repositorio/.test(x.errores[0]), 'atrás: sin git, lo dice');
}

// ---- 4 bis. la app en el móvil (16-11-2026): cada copia lleva su manifiesto y su icono, sacados de sus datos
{ const cw = path.join(destino, 'voltio-prueba'), M = JSON.parse(fs.readFileSync(path.join(cw, 'manifest.webmanifest'), 'utf8')), svg = fs.readFileSync(path.join(cw, 'assets/icono.svg'), 'utf8');
  es(M.name === 'Voltio Sur' && M.short_name === 'Voltio Sur' && M.start_url === 'app.html' && M.display === 'standalone' && M.icons.length === 1 && M.icons[0].src === 'assets/icono.svg' && />V<\/text>/.test(svg),
    'app: una copia nueva lleva su manifiesto (con su nombre, que abre la app) y su icono con la letra de su marca; sin PNG, solo el SVG');
  es(COMUNES.includes('sw.js') && fs.existsSync(path.join(cw, 'sw.js')), 'app: el trabajador de la app (sw.js) es de lo común');
  // el manifiesto viejo o tocado a mano: la lista lo ve y «actualizar» lo pone bien sin tocar los datos
  fs.writeFileSync(path.join(cw, 'manifest.webmanifest'), '{"name":"Otro"}');
  const e1 = estado(sitio, cw);
  es(!e1.alDia && e1.dif.includes('manifest.webmanifest'), 'app: un manifiesto que no es el de sus datos cuenta como copia por poner al día');
  const dh = h(path.join(cw, 'js/oficio-datos.js')), r1 = actualizar({ plantilla: sitio, destino, id: 'voltio-prueba', conAzar: false });
  es(r1.ok && JSON.parse(fs.readFileSync(path.join(cw, 'manifest.webmanifest'), 'utf8')).name === 'Voltio Sur' && estado(sitio, cw).alDia && h(path.join(cw, 'js/oficio-datos.js')) === dh, 'app: «actualizar» lo vuelve a poner, sin tocar sus datos');
  // con los iconos PNG (los hace iconos.py), el manifiesto los nombra, también para Android («maskable»)
  for (const n of [192, 512]) fs.copyFileSync(path.join(sitio, 'assets/icono-' + n + '.png'), path.join(cw, 'assets/icono-' + n + '.png'));
  const M2 = JSON.parse(manifiesto(cw, { nombre: 'Voltio Sur', marca: ['Voltio', 'Sur'] }));
  es(M2.icons.some(i => i.src === 'assets/icono-512.png' && i.purpose === 'maskable') && M2.icons.some(i => i.src === 'assets/icono-192.png' && i.purpose === 'any'), 'app: con los PNG, el manifiesto los nombra (y el recortable de Android)');
  es(!estado(sitio, cw).alDia && ponApp(cw, { nombre: 'Voltio Sur', marca: ['Voltio', 'Sur'] }).join() === 'manifest.webmanifest' && ponApp(cw, { nombre: 'Voltio Sur', marca: ['Voltio', 'Sur'] }).length === 0, 'app: ponerlo dos veces no cambia nada la segunda');
  // un nombre largo: el corto, la primera palabra de la marca
  es(JSON.parse(manifiesto(cw, { nombre: 'Fontanería y Calefacción Martínez', marca: ['Fontanería', 'Martínez Hermanos'] })).short_name === 'Fontanería', 'app: con una marca larga, el nombre corto es su primera palabra'); }

// ---- 4 ter. el alta en el servidor (16-11-2026): el SQL lleva los datos y las huellas de los códigos, nunca los códigos
{ const id = 'voltio-prueba', N = leeNegocio(path.join(destino, id, 'js/oficio-datos.js')).N, K = leeNucleo(sitio), r = alta({ plantilla: sitio, destino, id });
  const sha = t => crypto.createHash('sha256').update(t, 'utf8').digest('hex'), FORMA = /^[a-hj-km-np-z2-9]{4}(-[a-hj-km-np-z2-9]{4}){3}$/;
  es(r.ok && r.codigos.map(g => g.persona + ':' + g.rol).join() === ['oficina:centralita'].concat(N.tecnicos.map(t => t.id + ':tecnico')).join(), 'alta: una persona para entrar por la oficina y otra por cada técnico de sus datos');
  es(r.ok && r.codigos.every(g => FORMA.test(g.codigo)) && new Set(r.codigos.map(g => g.codigo)).size === r.codigos.length, 'alta: cada código, 16 letras y números en cuatro grupos, sin i, l, o, 0 ni 1, y todos distintos');
  es(r.ok && r.codigos.every(g => !r.sql.includes(g.codigo) && r.sql.includes("'" + sha(id + ':' + g.persona + ':' + g.codigo) + "'")), 'alta: el SQL no lleva ningún código, solo su huella (la de oficios.huella en el servidor)');
  const m = /insert into oficios\.estados \(negocio, datos, cab\) values \('voltio-prueba', '((?:[^']|'')*)'::json, '((?:[^']|'')*)'::jsonb\);/.exec(r.sql || ''), D = m && JSON.parse(m[1].replace(/''/g, "'")), C = m && JSON.parse(m[2]);
  es(!!D && JSON.stringify(D) === JSON.stringify(datosServidor(N)) && Object.keys(D).join() === Object.keys(N).filter(k => k !== 'servidor' && k !== 'textos').join() && !('servidor' in D), 'alta: los datos van tal cual y en el mismo orden, sin «servidor» ni «textos»');
  es(!!C && C.esq === K.ESQ && C.n === 0 && C.nu === 0 && Array.isArray(C.ausencias), 'alta: la cabecera arranca vacía y con el esquema de las reglas');
  es(/raise exception 'Falta el alta en el buzón/.test(r.sql) && /raise exception 'Este negocio ya está en el servidor/.test(r.sql) && /^begin;$/m.test(r.sql) && /^commit;$/m.test(r.sql), 'alta: comprueba antes el buzón y que no esté ya, y va entero o nada');
  let x = alta({ plantilla: sitio, destino, id: 'ramirez' }); es(!x.ok && /Es una demo/.test(x.errores[0]), 'alta: una demo no se sube al servidor');
  x = alta({ plantilla: sitio, destino, id: 'nadie' }); es(!x.ok && /No hay ninguna copia/.test(x.errores[0]), 'alta: una copia que no existe, lo dice');
  x = alta({ plantilla: sitio, destino, id: '../voltio' }); es(!x.ok, 'alta: un «id» que no es el de una carpeta de copias no vale');
  es(new Set(Array.from({ length: 200 }, codigoNuevo)).size === 200, 'alta: los códigos no se repiten');
  // los datos nuevos: el mismo JSON y la huella que dará el servidor, la que mira «Tu sesión»
  x = await subirDatos({ plantilla: sitio, destino, id });
  const u = /update oficios\.estados set datos = '((?:[^']|'')*)'::json, cambiado = now\(\) where negocio = 'voltio-prueba';/.exec(x.sql || '');
  es(x.ok && !!u && u[1] === m[1] && x.huella === await K.huellaDatos(N) && /^[0-9a-f]{16}$/.test(x.huella), 'subir datos: el mismo JSON que el alta, y la huella de sus datos');
  es(/raise exception 'Este negocio no está en el servidor/.test(x.sql), 'subir datos: si el negocio no está en el servidor, no hace nada y lo dice');
  // desde la consola: el SQL a un archivo solo para quien lo hace; los códigos, a la pantalla y una sola vez
  const sq = path.join(T, 'alta.sql'); c = cli('alta', id, '--plantilla', sitio, '--destino', destino, '--sql', sq);
  const cods = [...c.stdout.matchAll(/^\s{4}.+\(([a-z0-9-]+)\)\s+([a-z0-9]{4}(?:-[a-z0-9]{4}){3})$/gm)], txt = fs.existsSync(sq) ? fs.readFileSync(sq, 'utf8') : '';
  es(c.status === 0 && /SQL DEL ALTA/.test(c.stdout) && cods.length === r.codigos.length && cods.every(k => !txt.includes(k[2]) && txt.includes(sha(id + ':' + k[1] + ':' + k[2]))) && (fs.statSync(sq).mode & 0o777) === 0o600,
    '«alta» escribe el SQL en un archivo que solo lee quien lo hace y enseña los códigos en pantalla, que casan con sus huellas');
  c = cli('subir-datos', id, '--plantilla', sitio, '--destino', destino, '--sql', path.join(T, 'datos.sql'));
  es(c.status === 0 && /SQL DE LOS DATOS/.test(c.stdout) && c.stdout.includes(x.huella) && fs.existsSync(path.join(T, 'datos.sql')), '«subir-datos» escribe su SQL y dice la huella que dará el servidor');
  c = cli('alta'); es(c.status === 2 && /Di qué copia/.test(c.stdout), '«alta» sin copia dice cómo se usa');
}

// ---- 5. nada de esto ha tocado la plantilla de verdad
es(huellas(sitio) === P0 && h(VOLTIO) === h(path.join(aqui, 'negocios/voltio.js')), 'la plantilla y los datos de partida siguen como estaban');
fs.rmSync(T, { recursive: true, force: true });
console.log((mal.length ? 'MAL' : 'BIEN') + ': ' + ok + ' comprobaciones pasan' + (mal.length ? ', ' + mal.length + ' fallan' : '') + '.');
process.exit(mal.length ? 1 : 0);
