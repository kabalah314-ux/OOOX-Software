// El programa de la app va partido en js/app/ (C3, 22-11-2026): scripts clásicos que se cargan en orden y comparten sus nombres.
// Esta prueba mira que eso no se rompa al tocarlos:
//   1. los archivos que carga app.html son los que hay en js/app/, y todos están en lo común (copias) y en lo que guarda sw.js;
//   2. nada que se haga al cargar un archivo usa algo de un archivo que aún no se ha cargado;
//   3. ningún aviso que se apunta al cargar (un cambio de otra pestaña llega cuando quiere) llama a algo de un archivo posterior.
// Uso: node orden-app.mjs <carpeta del sitio>
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath, pathToFileURL } from 'url';
const sitio = process.argv[2]; if (!sitio) { console.log('Uso: node orden-app.mjs <carpeta del sitio>'); process.exit(2) }
// el analizador (acorn): el del CI (npm install en esta carpeta) o el de las herramientas de la máquina
let acorn, walk;
for (const d of [path.dirname(fileURLToPath(import.meta.url)) + '/', '/opt/node-tools/node_modules/', '/opt/npm-tools/node_modules/']) {
  try { const r = createRequire(d); acorn = r('acorn'); walk = r('acorn-walk'); break } catch { }
}
if (!acorn) { if (process.env.GITHUB_ACTIONS) { console.log('MAL: falta acorn (npm install acorn acorn-walk)'); process.exit(1) } console.log('SALTA: falta acorn; para pasarla: npm install acorn acorn-walk'); process.exit(0) }
let ok = 0, mal = 0; const es = (c, t) => { if (c) ok++; else { mal++; console.log('  MAL', t) } };
const html = fs.readFileSync(path.join(sitio, 'app.html'), 'utf8');
const L = [...html.matchAll(/<script src="(js\/app\/[^"]+)"/g)].map(m => m[1]);
const enDisco = []; (function mira(d) { for (const f of fs.readdirSync(path.join(sitio, d))) { const r = d + '/' + f; fs.statSync(path.join(sitio, r)).isDirectory() ? mira(r) : f.endsWith('.js') && enDisco.push(r) } })('js/app');
es(L.length > 0 && [...L].sort().join() === enDisco.sort().join(), 'app.html carga justo los archivos de js/app/ (sobran o faltan: ' + enDisco.filter(f => !L.includes(f)).concat(L.filter(f => !enDisco.includes(f))).join(', ') + ')');
es(L.at(-1) === 'js/app/arranque.js', 'el último que se carga es arranque.js');
const { COMUNES } = await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '../copias.mjs')).href);
es(L.every(f => COMUNES.includes(f)), 'todos van en lo común de cada copia (copias.mjs): ' + L.filter(f => !COMUNES.includes(f)).join(', '));
const sw = fs.readFileSync(path.join(sitio, 'sw.js'), 'utf8');
es(L.every(f => sw.includes("'" + f + "'")), 'todos los guarda sw.js para abrir sin cobertura: ' + L.filter(f => !sw.includes("'" + f + "'")).join(', '));
const asts = L.map(f => acorn.parse(fs.readFileSync(path.join(sitio, f), 'utf8'), { ecmaVersion: 'latest', locations: true }));
const donde = {};
asts.forEach((a, k) => a.body.forEach(st => {
  if (st.type === 'FunctionDeclaration') donde[st.id.name] = k;
  if (st.type === 'VariableDeclaration') st.declarations.forEach(d => walk.simple(d.id, { Identifier(n) { donde[n.name] = k } }));
}));
const fuera = { Function() { }, ArrowFunctionExpression() { }, FunctionExpression() { }, FunctionDeclaration() { } };
let usos = 0;
asts.forEach((a, k) => a.body.forEach(st => {
  if (st.type === 'FunctionDeclaration') return;
  const ahora = new Set(), luego = new Set();
  const raiz = st.type === 'VariableDeclaration' ? { type: 'Program', body: st.declarations.map(d => d.init).filter(Boolean) } : st;
  walk.recursive(raiz, null, { ...fuera, Identifier(n) { if (donde[n.name] > k) ahora.add(n.name) } });
  if (st.type !== 'VariableDeclaration') walk.full(st, n => { if (n.type === 'Identifier' && donde[n.name] > k) luego.add(n.name) });
  usos++;
  const sitioDe = n => n + ' (' + L[donde[n]].slice(7) + ')';
  es(!ahora.size, L[k].slice(7) + ':' + st.loc.start.line + ' usa al cargarse lo que aún no está: ' + [...ahora].map(sitioDe).join(', '));
  es(!luego.size || ahora.size, L[k].slice(7) + ':' + st.loc.start.line + ' apunta un aviso que llama a un archivo posterior: ' + [...luego].map(sitioDe).join(', '));
}));
console.log(mal ? `MAL: ${ok} comprobaciones pasan, ${mal} fallan` : `BIEN: ${ok} comprobaciones pasan · ${L.length} archivos de la app, ${usos} cosas que se hacen al cargar`);
process.exit(mal ? 1 : 0);
