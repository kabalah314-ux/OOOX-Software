// Busca restos del negocio de muestra en los archivos COMUNES de la app (los que se copian tal cual a cada negocio).
// Todo lo que sea de un negocio (nombre, teléfono, ciudad, equipo, zonas, catálogo, averías, franjas) tiene que
// vivir solo en js/oficio-datos.js. Si aparece escrito en un archivo común, adaptar la app obligaría a tocar código.
// Uso: node restos.mjs <carpeta del sitio>
import fs from 'node:fs';
import path from 'node:path';
import { leeNegocio } from './valida-negocio.mjs';

const sitio = process.argv[2];
if (!sitio) { console.log('Uso: node restos.mjs <carpeta del sitio>'); process.exit(2) }
const COMUNES = ['app.html', 'cita.html', 'oficio.css', 'js/oficio-nucleo.js', 'js/oficio-estado.js', 'js/oficio-soporte.js'];
const { N } = leeNegocio(path.join(sitio, 'js/oficio-datos.js'));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const palabra = t => new RegExp('(?<![\\p{L}\\p{N}])' + esc(t) + '(?![\\p{L}\\p{N}])', 'iu');

// 1) lo que identifica al negocio: no puede salir en ningún sitio, ni en un comentario
const textos = new Map();
const pon = (que, t) => { if (typeof t === 'string' && t.trim().length >= 4) textos.set(t.trim(), que) };
pon('nombre', N.nombre); pon('razón social', N.razon); pon('NIF', N.nif); pon('dirección', N.dir); pon('ciudad', N.ciudad); pon('reseñas', N.resenas);
(N.marca || []).forEach(m => pon('rótulo', m));
N.tecnicos.forEach(t => { pon('técnico', t.n); pon('técnico', t.ap) });
Object.values(N.zonas.dis).forEach(d => { pon('zona', d[0]); pon('zona', d[2]) });
Object.values(N.catalogo).forEach(i => pon('catálogo', i.t)); N.averias.forEach(a => { pon('avería', a.n); pon('avería', a.d) });
const tel = N.tel.replace(/\D/g, ''), telRe = new RegExp(tel.split('').join('\\s?'), 'g');

// 2) las claves del negocio escritas entre comillas en el código: 'mo', 'fuga', 'omar', 'f1', 'cve'…
const claves = new Map();
const clave = (que, k) => { if (!['otro', 'otra'].includes(k)) claves.set(k, que) };
Object.keys(N.catalogo).forEach(k => clave('concepto del catálogo', k)); N.averias.forEach(a => clave('avería', a.id));
N.tecnicos.forEach(t => clave('técnico', t.id)); N.franjas.forEach(f => clave('franja', f.id));
Object.keys(N.zonas.dis).forEach(k => clave('zona', k)); Object.keys(N.zonas.banda).forEach(k => { if (k.length > 1) clave('banda', k) });
Object.keys(N.zonas.cp).forEach(k => clave('código postal', k));

let mal = 0, mirados = 0;
for (const f of COMUNES) {
  const ruta = path.join(sitio, f); if (!fs.existsSync(ruta)) continue;
  const lineas = fs.readFileSync(ruta, 'utf8').split('\n'); mirados++;
  lineas.forEach((l, i) => {
    const dice = (que, t) => { mal++; console.log('  RESTO  ' + f + ':' + (i + 1) + '  ' + que + ' «' + t + '»  …' + l.slice(Math.max(0, l.toLowerCase().indexOf(t.toLowerCase()) - 30), l.toLowerCase().indexOf(t.toLowerCase()) + t.length + 30).trim() + '…') };
    // los nombres del catálogo, las averías y las zonas se buscan tal cual están escritos («Mano de obra» no es «la mano de obra»)
    // los nombres de las personas se buscan como palabra entera: «Ferrer» no es «noreferrer», ni «Pau» es «pausa»
    for (const [t, que] of textos) if (['catálogo', 'avería', 'zona'].includes(que) ? l.includes(t) : que === 'técnico' ? palabra(t).test(l) : l.toLowerCase().includes(t.toLowerCase())) dice(que, t);
    const m = l.match(telRe); if (m) dice('teléfono', m[0]);
    for (const [k, que] of claves) if (new RegExp('(?<!class=)[\'"`]' + esc(k) + '[\'"`]').test(l) || new RegExp('\\.(cat|av|tec)\\.' + esc(k) + '\\b').test(l)) dice(que + ' (clave)', k);
  });
}
console.log((mal ? 'MAL' : 'BIEN') + ': ' + mirados + ' archivos comunes, ' + (textos.size + claves.size + 1) + ' datos del negocio buscados' + (mal ? ', ' + mal + ' restos' : ', ningún resto'));
process.exit(mal ? 1 : 0);
