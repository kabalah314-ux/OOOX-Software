// Capturas de proyectos publicados fuera de este repo (sección Experiments de ooox.es).
// Lo ejecuta .github/workflows/project-shots.yml y publica las imágenes en la rama `project-shots`.
// Salida por proyecto: <k>.jpg (1440×900) · <k>_long.jpg (página entera) · <k>_m.jpg (móvil 390×844 a 2x)
//                      <k>_m_long.jpg (móvil página entera) · <k>_<extra>.jpg (pantallas extra de shots.json)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, 'out');
mkdirSync(out, { recursive: true });
const conf = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const common = { locale: 'es-ES', timezoneId: 'Europe/Madrid', geolocation: { latitude: 41.3874, longitude: 2.1686 }, permissions: ['geolocation'] };
const desk = await browser.newContext({ ...common, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const mob = await browser.newContext({ ...common, ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

async function shoot(ctx, url, file, { wait = 2000, full = false } = {}) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => page.waitForLoadState('load'));
    await page.waitForTimeout(wait);
    if (full) {
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((z) => setTimeout(z, 120)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: join(out, file), type: 'jpeg', quality: 82, fullPage: full });
    console.log('ok', file, page.url());
  } catch (e) { console.log('ERROR', file, e.message); }
  await page.close();
}

for (const [k, c] of Object.entries(conf)) {
  const o = { wait: c.wait };
  await shoot(desk, c.url, `${k}.jpg`, o);
  await shoot(desk, c.url, `${k}_long.jpg`, { ...o, full: true });
  await shoot(mob, c.url, `${k}_m.jpg`, o);
  await shoot(mob, c.url, `${k}_m_long.jpg`, { ...o, full: true });
  for (const [name, u] of Object.entries(c.extra || {})) {
    await shoot(desk, u, `${k}_${name}.jpg`, o);
    await shoot(mob, u, `${k}_${name}_m.jpg`, o);
  }
}
await browser.close();
