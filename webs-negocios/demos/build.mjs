// Construye las demos de OOOX Webs: webs-negocios/demos/src/<slug>.html → frontend/public/demos/<slug>/index.html
// Sin dependencias (Node 18+). Uso: node webs-negocios/demos/build.mjs [slug]
//
// Atajos que expande:
//   <img data-u="photo-123-abc" data-w="1600" alt="…">   → src + srcset + sizes de Unsplash (licencia libre, uso comercial)
//   url(u:photo-123-abc@1600)                            → url(https://images.unsplash.com/…) en CSS
//   {{kit}}                                              → ruta al kit con versión (para que el navegador no use una copia vieja)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', 'frontend', 'public', 'demos');
const only = process.argv[2];

const U = (id, w, q = 72) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;
const WIDTHS = [480, 800, 1200, 1600, 2200];

function expandImgs(html) {
  return html.replace(/<img\b([^>]*?)\sdata-u="([^"]+)"([^>]*)>/g, (m, a, id, b) => {
    const attrs = a + b;
    const max = Number((attrs.match(/\sdata-w="(\d+)"/) || [])[1] || 1600);
    const sizes = (attrs.match(/\sdata-sizes="([^"]+)"/) || [])[1] || '100vw';
    const ws = WIDTHS.filter((w) => w <= max);
    if (!ws.includes(max)) ws.push(max);
    const srcset = ws.map((w) => `${U(id, w)} ${w}w`).join(', ');
    const clean = attrs.replace(/\sdata-(w|sizes)="[^"]*"/g, '');
    const lazy = /\sloading=/.test(clean) ? '' : ' loading="lazy"';
    const dec = /\sdecoding=/.test(clean) ? '' : ' decoding="async"';
    return `<img${clean} src="${U(id, Math.min(max, 1200))}" srcset="${srcset}" sizes="${sizes}"${lazy}${dec}>`;
  });
}
function expandCss(html) {
  return html.replace(/url\(u:([a-z0-9-]+)@(\d+)\)/g, (m, id, w) => `url(${U(id, Number(w))})`);
}

// Kit con huella para romper la caché cuando cambia
mkdirSync(join(out, '_kit'), { recursive: true });
const kitFiles = ['kit.js', 'kit.css'];
const hash = createHash('sha1');
for (const f of kitFiles) {
  const src = join(here, 'kit', f);
  hash.update(readFileSync(src));
  copyFileSync(src, join(out, '_kit', f));
}
const v = hash.digest('hex').slice(0, 8);

const files = readdirSync(join(here, 'src')).filter((f) => f.endsWith('.html') && (!only || f === `${only}.html`));
for (const f of files) {
  const slug = f.replace(/\.html$/, '');
  let html = readFileSync(join(here, 'src', f), 'utf8');
  html = html.replaceAll('{{kit}}', '../_kit').replaceAll('{{v}}', v);
  html = expandCss(expandImgs(html));
  // Comprobación mínima: el JSON de idiomas tiene que ser válido.
  const i18n = html.match(/<script type="application\/json" id="i18n">([\s\S]*?)<\/script>/);
  if (i18n) JSON.parse(i18n[1]);
  const site = html.match(/<script type="application\/json" id="site">([\s\S]*?)<\/script>/);
  if (site) JSON.parse(site[1]);
  mkdirSync(join(out, slug), { recursive: true });
  writeFileSync(join(out, slug, 'index.html'), html);
  console.log(`✓ ${slug}  (${(html.length / 1024).toFixed(0)} KB)`);
}
console.log(`kit v${v} · ${files.length} demo(s) → ${out}`);
