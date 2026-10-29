// Capturas de las demos con fotos y tipografías reales.
// Lo ejecuta GitHub Actions (.github/workflows/demo-shots.yml) y publica el resultado en la rama `demo-shots`.
// Uso local: node webs-negocios/demos/shots.mjs <carpeta-salida> [slug]
//
// Salida:
//   portfolio/<slug>.jpg        portada 1440×900 (vista limpia ?shot)
//   portfolio/<slug>_og.jpg     1200×630, la imagen que sale al compartir el enlace (og:image)
//   portfolio/<slug>_long.jpg   página entera a 1200 de ancho (para el navegador simulado del caso)
//   portfolio/<slug>_m.jpg      móvil 390×844 a 2x
//   portfolio/<slug>_<id>.jpg   secciones de shots.json (vista previa de las tarjetas)
//   qa/<slug>-desktop.jpg, qa/<slug>-mobile.jpg   tal y como la ve el cliente (con banner y notas)
//   qa/<slug>-<nombre>.jpg      interacciones de shots.json (p. ej. la vista previa del WhatsApp)
//   report.json                 errores de consola, peticiones fallidas y medidas
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// require (y no import) para que también funcione con NODE_PATH en local
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', '..', 'frontend', 'public');
const out = process.argv[2] || join(here, 'shots-out');
const only = process.argv[3];
const conf = existsSync(join(here, 'shots.json')) ? JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8')) : {};
for (const d of ['portfolio', 'qa']) mkdirSync(join(out, d), { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let f = join(pub, decodeURIComponent(req.url.split('?')[0]));
  if (f.endsWith('/')) f += 'index.html';
  try { const body = readFileSync(f); res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, r));
const base = `http://127.0.0.1:${srv.address().port}`;

const slugs = readdirSync(join(pub, 'demos'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && (!only || d.name === only)).map((d) => d.name);

const browser = await chromium.launch();
const report = {};
const common = { locale: 'es-ES', timezoneId: 'Europe/Madrid' };
const desk = await browser.newContext({ ...common, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const og = await browser.newContext({ ...common, viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const deskLong = await browser.newContext({ ...common, viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
const mob2x = await browser.newContext({ ...common, ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mob1x = await browser.newContext({ ...common, ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

async function open(ctx, url, slug, tag) {
  const page = await ctx.newPage();
  const r = (report[slug] ||= { errors: [], failed: [], pages: {} });
  page.on('console', (m) => { if (m.type() === 'error') r.errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => r.errors.push(`[${tag}] PAGEERROR ${e.message}`));
  page.on('requestfailed', (q) => r.failed.push(`[${tag}] ${q.url().slice(0, 140)} ${q.failure()?.errorText || ''}`));
  page.on('response', (s) => { if (s.status() >= 400) r.failed.push(`[${tag}] ${s.status()} ${s.url().slice(0, 140)}`); });
  await page.goto(base + url, { waitUntil: 'networkidle', timeout: 60000 });
  // Carga ya todas las imágenes diferidas (la captura de página entera no hace scroll) y recorre la página
  // sin desplazamiento suave para que salte todo lo que dependa del scroll; luego vuelve arriba.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((z) => setTimeout(z, 90)); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((z) => { im.onload = im.onerror = z; setTimeout(z, 8000); }))));
  });
  await page.waitForTimeout(1500);
  r.pages[tag] = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, vw: innerWidth,
    broken: [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.currentSrc || i.src),
    fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))],
    sections: [...document.querySelectorAll('[id]')].filter((e) => /^(SECTION|DIV|ARTICLE|ASIDE|FORM)$/.test(e.tagName) && e.offsetHeight > 200)
      .map((e) => [e.id, Math.round(e.getBoundingClientRect().top + scrollY)]),
  }));
  return page;
}
// animations: 'disabled' deja cada animación en su estado final (la captura de página entera las reinicia)
const jpg = (q) => ({ type: 'jpeg', quality: q, animations: 'disabled' });

for (const slug of slugs) {
  const c = conf[slug] || {};
  const url = `/demos/${slug}/`;
  console.log(`→ ${slug}`);
  try {
    let p = await open(desk, `${url}?shot=1`, slug, 'cover');
    await p.screenshot({ path: join(out, 'portfolio', `${slug}.jpg`), ...jpg(84) }); await p.close();

    p = await open(og, `${url}?shot=1`, slug, 'og');
    await p.screenshot({ path: join(out, 'portfolio', `${slug}_og.jpg`), ...jpg(84) }); await p.close();

    p = await open(deskLong, `${url}?shot=1`, slug, 'long');
    await p.screenshot({ path: join(out, 'portfolio', `${slug}_long.jpg`), fullPage: true, ...jpg(70) }); await p.close();

    p = await open(mob2x, `${url}?shot=1`, slug, 'mobile');
    await p.screenshot({ path: join(out, 'portfolio', `${slug}_m.jpg`), ...jpg(82) }); await p.close();

    for (const id of c.sections || []) {
      p = await open(desk, `${url}?shot=${id}`, slug, `s-${id}`);
      await p.screenshot({ path: join(out, 'portfolio', `${slug}_${id}.jpg`), ...jpg(82) }); await p.close();
    }

    p = await open(desk, url, slug, 'qa-desktop');
    await p.screenshot({ path: join(out, 'qa', `${slug}-desktop.jpg`), fullPage: true, ...jpg(62) }); await p.close();
    p = await open(mob1x, url, slug, 'qa-mobile');
    await p.screenshot({ path: join(out, 'qa', `${slug}-mobile.jpg`), fullPage: true, ...jpg(66) }); await p.close();

    for (const step of c.qa || []) {
      p = await open(step.mobile ? mob1x : desk, url + (step.query || ''), slug, `qa-${step.name}`);
      if (step.js) { await p.evaluate(step.js); await p.waitForTimeout(900); }
      await p.screenshot({ path: join(out, 'qa', `${slug}-${step.name}.jpg`), fullPage: !!step.full, ...jpg(70) }); await p.close();
    }
  } catch (e) {
    (report[slug] ||= { errors: [], failed: [], pages: {} }).errors.push(`SHOTS ${e.message}`);
    console.log(`  ✗ ${e.message}`);
  }
}

writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
srv.close();
const bad = Object.entries(report).filter(([, r]) => r.errors.length);
console.log(`${slugs.length} demo(s) · ${bad.length ? 'con errores: ' + bad.map(([s]) => s).join(', ') : 'sin errores de consola'}`);
