// De la hoja de servicios de un negocio al catálogo de su archivo de datos.
// La hoja (https://claude.ai/artifact/MXymNY6J1yRz3XwshEKqne) se descarga como CSV, una pestaña cada vez, y esto escribe
// las líneas del catálogo de los servicios marcados, con su precio, lo que tardan y su servicio de la base, listas para
// pegar en «catalogo» de js/oficio-datos.js. No toca ningún archivo: lo que sale se mira y se pega a mano.
// Uso: node servicios-catalogo.mjs <hoja.csv>
import fs from 'node:fs';
import { TODOS } from '../oficios-base/servicios.mjs';

/* un CSV sencillo: comas, comillas dobles y saltos de línea dentro de las comillas */
export function leeCSV(txt) {
  const l0 = txt.split(/\r?\n/)[0].replace(/"[^"]*"/g, ''), sep = (l0.match(/;/g) || []).length > (l0.match(/,/g) || []).length ? ';' : ',';   // la hoja en castellano puede salir con «;»
  const filas = []; let f = [], c = '', dentro = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (dentro) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++ } else dentro = false } else c += ch }
    else if (ch === '"') dentro = true;
    else if (ch === sep) { f.push(c); c = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; f.push(c); filas.push(f); f = []; c = '' }
    else c += ch;
  }
  if (c !== '' || f.length) { f.push(c); filas.push(f) }
  return filas.filter(x => x.some(y => y.trim() !== ''));
}
const num = s => { const t = String(s || '').replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); const n = Number(t); return t && isFinite(n) ? n : null };
const si = s => /^(true|verdadero|sí|si|x|1)$/i.test(String(s || '').trim());
const clave = id => id.replace(/^(fon|ele)-/, '').replace(/-/g, '').slice(0, 24);
const comillas = t => "'" + String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/* las filas de la hoja → [{clave, linea}] o errores, en castellano */
export function aCatalogo(filas) {
  const cab = filas[0].map(x => x.trim()), col = n => cab.findIndex(x => x.toLowerCase().startsWith(n.toLowerCase()));
  const iS = col('Servicio'), iH = col('¿Lo hacéis'), iP = col('Vuestro precio'), iN = col('Vuestro tiempo normal'), iM = col('Vuestro tiempo máximo'), iC = col('Código');
  if ([iS, iH, iP, iN, iM, iC].some(i => i < 0)) return { errores: ['La primera fila no tiene las columnas de la hoja de servicios.'], lineas: [] };
  const errores = [], lineas = [], usadas = new Set();
  filas.slice(1).forEach((f, i) => {
    if (!si(f[iH])) return;
    const n = (f[iS] || '').trim(), id = (f[iC] || '').trim(), b = id ? TODOS[id] : null, p = num(f[iP]), dn = num(f[iN]), dm = num(f[iM]), fila = 'fila ' + (i + 2) + ' (' + (n || 'sin nombre') + ')';
    if (!n) { errores.push(fila + ': falta el nombre del servicio.'); return }
    if (id && !b) { errores.push(fila + ': el código «' + id + '» no está en la base de servicios.'); return }
    if (!(p > 0 && p <= 5000)) { errores.push(fila + ': falta vuestro precio, o no es un número entre 0 y 5.000 €.'); return }
    const d0 = dn != null ? dn : b ? b.dur[0] : null, d1 = dm != null ? dm : b ? b.dur[1] : null;
    if (!(Number.isInteger(d0) && Number.isInteger(d1) && d0 >= 1 && d0 <= d1 && d1 <= 600)) { errores.push(fila + ': los tiempos tienen que ser minutos enteros, el normal menor o igual que el máximo, como mucho 600.'); return }
    let k = b ? clave(b.id) : n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 24) || 'servicio';
    while (usadas.has(k)) k = k.slice(0, 22) + String(usadas.size).padStart(2, '0'); usadas.add(k);
    const iva = b && b.mat === 'dentro' ? 'p21' : 'p10';   // con el material dentro, el IVA general; si no, el de la vivienda
    lineas.push({ clave: k, linea: k + ':{t:' + comillas(n.slice(0, 60)) + ',' + iva + ':' + Math.round(p * 100) / 100 + (b && b.mat === 'dentro' ? ',mat:1' : ',u:1') + (b ? ',base:' + comillas(b.id) : '') + ',dur:[' + d0 + ',' + d1 + ']}' });
  });
  return { errores, lineas };
}

if (process.argv[1] && process.argv[1].endsWith('servicios-catalogo.mjs')) {
  const f = process.argv[2]; if (!f) { console.log('Uso: node servicios-catalogo.mjs <hoja.csv>'); process.exit(2) }
  const r = aCatalogo(leeCSV(fs.readFileSync(f, 'utf8')));
  r.errores.forEach(e => console.log('FALTA  ' + e));
  console.log(r.lineas.map(l => '  ' + l.linea).join(',\n'));
  process.exit(r.errores.length ? 1 : 0);
}
