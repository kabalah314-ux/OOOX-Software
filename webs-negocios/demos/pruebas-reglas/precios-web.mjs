// La web y la cita dicen el mismo precio (auditoría UX-01, 16-11-2026). La web lleva su tabla de precios (con el desglose
// en tres idiomas) y unas cifras sueltas (desplazamiento, mano de obra, recargo y suplemento de urgencia); la cita, la app y
// los papeles salen del archivo de datos del negocio. Esta prueba compara las dos cosas: si alguien cambia un precio en un
// sitio y no en el otro, falla y dice cuál.
//   node pruebas-reglas/precios-web.mjs <carpeta del sitio>
import fs from 'node:fs';
import path from 'node:path';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';
const SITIO = process.argv[2];
if (!SITIO) { console.error('uso: node precios-web.mjs <carpeta del sitio>'); process.exit(2) }
const K = leeNucleo(SITIO), { N } = leeNegocio(path.join(SITIO, 'js/oficio-datos.js')), cfg = K.cfgDe(N);
const h = fs.readFileSync(path.join(SITIO, 'index.html'), 'utf8');
let ok = 0, mal = 0; const es = (c, t) => { if (c) ok++; else { mal++; console.log('  MAL ', t) } };
const i = h.indexOf('const AV=['), j = h.indexOf('const UR=', i);
const AV = new Function(h.slice(i, j) + ';return AV')();
const cif = k => { const m = h.match(new RegExp('[,\\s]' + k + '=([\\d.]+)')); return m ? Number(m[1]) : NaN };
const SUR = cif('SUR'), DESP = cif('DESP'), MO = cif('MO'), URGE = cif('URGE');
const fila = (r, u) => { const k = u && r.u ? 1 + SUR : 1; return { a: Math.round(r.a * k * 100) / 100, b: Math.round(r.b * k * 100) / 100 } };
const total = (p, u) => { let a = 0, b = 0; p.rows.forEach(r => { const f = fila(r, u); a += f.a; b += f.b }); return { a: Math.round(a * 100) / 100, b: Math.round(b * 100) / 100 } };
const c = x => Math.round(x * 100), urge = cfg.urge ? cfg.cat[cfg.urge].p10 : 0;   // el catálogo, en céntimos
// las cifras sueltas del parte de la web
es(c(DESP) === cfg.cat.desp.p10, `desplazamiento: web ${DESP} €, catálogo ${cfg.cat.desp.p10 / 100} €`);
es(c(MO) === cfg.cat.mo.p10, `mano de obra: web ${MO} €/h, catálogo ${cfg.cat.mo.p10 / 100} €/h`);
es(SUR === cfg.recargo, `recargo de noche y festivos: web ${SUR}, datos ${cfg.recargo}`);
es(c(URGE) === urge, `suplemento de urgencia: web ${URGE} €, catálogo ${urge / 100} €`);
// cada servicio: el mismo «de cuánto a cuánto» con cita, y el mismo «desde» ahora mismo de noche (con el suplemento)
es(AV.length === N.averias.length && N.averias.every(a => AV.some(w => w.id === a.id)), `las mismas averías en la web y en los datos (${AV.map(a => a.id)} / ${N.averias.map(a => a.id)})`);
for (const p of AV) {
  const w = total(p, false), r = K.rango(cfg, p.id, false), wu = total(p, true), ru = K.rango(cfg, p.id, true);
  if (!r) { es(false, `${p.id}: no está en los datos`); continue }
  es(c(w.a) === r.a && (p.desde ? r.b == null : c(w.b) === r.b), `${p.id}, con cita: web ${w.a}–${w.b} €${p.desde ? ' (desde)' : ''}, datos ${r.a / 100}–${r.b == null ? '…' : r.b / 100} €`);
  es(c(wu.a) + c(URGE) === ru.a + urge, `${p.id}, urgencia de noche: web desde ${wu.a + URGE} €, datos desde ${(ru.a + urge) / 100} €`);
  const nombre = (h.match(new RegExp('data-t="av\\.' + p.id + '">([^<]+)<')) || [])[1];
  es(nombre === cfg.av[p.id].n, `${p.id}: el nombre de la tarjeta («${nombre}») es el de los datos («${cfg.av[p.id].n}»)`);
}
// la cita lleva el servicio de la tarjeta: cada «Reservar» apunta a su avería
for (const p of AV) es(h.includes(`href="cita.html?servicio=${p.id}" data-reserva="${p.id}"`), `${p.id}: su tarjeta reserva con cita.html?servicio=${p.id}`);
console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''} · los precios de la web son los del catálogo`);
process.exit(mal ? 1 : 0);
