// Restaurar una copia de OOOX Oficios: de la copia ya descifrada (un JSON) al SQL que la vuelve a poner.
//
//   gpg --decrypt oficios-2026-11-16.pgp > copia.json          (necesita la llave privada de Oscar: ver LEEME.md)
//   node restaurar.mjs copia.json > restaurar.sql              pone la copia en un esquema aparte, «oficios_restaurada»,
//                                                              para mirarla y compararla sin tocar nada de lo que hay
//   node restaurar.mjs copia.json --esquema otro > r.sql       en otro esquema aparte
//   node restaurar.mjs copia.json --volcar > volcar.sql        CAMBIA LO QUE HAY: vacía las tablas de oficios y pone
//                                                              las de la copia. Solo ante un desastre y con el visto
//                                                              bueno de Oscar. Va en una transacción: o todo o nada.
//
// El SQL se pasa en el editor SQL de Supabase o con psql. Las tablas tienen que existir ya en «oficios» (las crean los
// archivos esquema.sql del servidor, del buzón y de este mantenimiento): el esquema aparte se hace igual que ellas.
// Después de --volcar: «select oficios.reaplicar_olvidos();» para volver a borrar a los clientes que lo pidieron
// después del día de la copia.
// Este archivo no lleva datos de nadie: el SQL que sale, sí. No se guarda en el repositorio ni se manda a nadie.
import fs from 'node:fs';

const args = process.argv.slice(2);
const archivo = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--esquema');
const volcar = args.includes('--volcar');
const destino = volcar ? 'oficios' : (args.includes('--esquema') ? args[args.indexOf('--esquema') + 1] : 'oficios_restaurada');
if (!archivo) { console.error('Uso: node restaurar.mjs <copia descifrada .json> [--esquema <nombre>] [--volcar]'); process.exit(2); }
if (!/^[a-z_][a-z0-9_]{0,40}$/.test(destino)) { console.error('El nombre del esquema solo puede llevar minúsculas, números y _'); process.exit(2); }

const texto = fs.readFileSync(archivo, 'utf8');
const doc = JSON.parse(texto);
// Las filas se pasan tal cual vienen escritas en la copia, sin volver a escribirlas: así un 10.50 sigue siendo 10.50
// (leerlo y escribirlo daría 10.5, que vale lo mismo pero no es la misma letra).
function finDe(s, i) {   // dónde acaba el valor JSON que empieza en s[i]
  const c = s[i];
  if (c === '"') { let j = i + 1; while (s[j] !== '"') { if (s[j] === '\\') j++; j++; } return j + 1; }
  if (c === '{' || c === '[') {
    let prof = 0;
    for (let j = i; j < s.length; j++) {
      const d = s[j];
      if (d === '"') { j = finDe(s, j) - 1; continue; }
      if (d === '{' || d === '[') prof++;
      else if (d === '}' || d === ']') { prof--; if (prof === 0) return j + 1; }
    }
    throw new Error('copia cortada');
  }
  let j = i; while (j < s.length && !/[,\]}\s]/.test(s[j])) j++; return j;
}
function miembros(s, i) {   // los miembros del objeto que empieza en s[i]: {clave: [desde, hasta]}
  const r = {}; let j = i + 1;
  for (;;) {
    while (/[\s,]/.test(s[j])) j++;
    if (s[j] === '}') return r;
    const k = finDe(s, j), clave = JSON.parse(s.slice(j, k)); j = k;
    while (/[\s:]/.test(s[j])) j++;
    const f = finDe(s, j); r[clave] = [j, f]; j = f;
  }
}
const crudo = (() => { const top = miembros(texto, texto.indexOf('{')), m = miembros(texto, top.tablas[0]), r = {};
  for (const [t, [a, b]] of Object.entries(m)) r[t] = texto.slice(a, b); return r; })();
if (doc.formato !== 'ooox-oficios-copia/1' || !doc.tablas || typeof doc.tablas !== 'object') { console.error('Esto no es una copia de OOOX Oficios (formato ' + doc.formato + ')'); process.exit(1); }
for (const [t, filas] of Object.entries(doc.tablas)) {
  if (!/^[a-z_]+$/.test(t)) { console.error('Nombre de tabla raro en la copia: ' + t); process.exit(1); }
  if (!Array.isArray(filas) || filas.some(x => !x || typeof x !== 'object' || Array.isArray(x))) { console.error('La tabla ' + t + ' no trae filas como tienen que ser'); process.exit(1); }
  if (doc.cuentas && doc.cuentas[t] !== filas.length) { console.error(`La tabla ${t} trae ${filas.length} filas y la copia dice ${doc.cuentas[t]}: no está entera`); process.exit(1); }
}
// el orden importa si hay claves ajenas: primero lo que no depende de nada
const ORDEN = ['negocios', 'estados', 'personas', 'accesos', 'clientes', 'avisos', 'diario', 'cambios', 'peticiones', 'novedades', 'novedades_vistas', 'errores', 'olvidos'];
const tablas = Object.keys(doc.tablas).sort((a, b) => (ORDEN.indexOf(a) + 1 || 99) - (ORDEN.indexOf(b) + 1 || 99));
let marca; do { marca = '$copia' + Math.random().toString(36).slice(2, 8) + '$'; } while (texto.includes(marca));
const lit = t => marca + crudo[t] + marca + '::jsonb';

const sql = [];
sql.push(`-- Copia de OOOX Oficios hecha el ${doc.hecha}. Tablas: ${tablas.map(t => `${t} (${doc.tablas[t].length})`).join(', ')}.`);
sql.push(volcar
  ? '-- ¡OJO! Esto VACÍA las tablas de oficios y pone las de la copia. Solo ante un desastre y con el visto bueno de Oscar.'
  : `-- Se pone en el esquema «${destino}», aparte: no toca nada de lo que hay. Para quitarlo después: drop schema ${destino} cascade;`);
sql.push('begin;', "set local timezone = 'UTC';");
// «cascade»: una tabla nueva que apunta a otras (como «accesos», 16-11) y que no venga en una copia vieja se vacía también;
// si no, el truncate falla y no se puede volcar
if (volcar) sql.push(`truncate ${tablas.map(t => 'oficios.' + t).join(', ')} cascade;`);
else sql.push(`create schema ${destino};`, `revoke all on schema ${destino} from public;`);
for (const t of tablas) {
  if (!volcar) sql.push(`create table ${destino}.${t} (like oficios.${t} including all);`, `alter table ${destino}.${t} enable row level security;`);
  const filas = doc.tablas[t]; if (!filas.length) continue;
  if (t === 'estados') {
    // «datos» va como texto en la copia, para no perder el orden de las claves
    sql.push(`insert into ${destino}.estados (negocio, datos, v, cab, cambiado) select negocio, datos_txt::json, v, cab, cambiado from jsonb_to_recordset(${lit(t)}) as x(negocio text, datos_txt text, v bigint, cab jsonb, cambiado timestamptz);`);
  } else {
    sql.push(`insert into ${destino}.${t} overriding system value select * from jsonb_populate_recordset(null::oficios.${t}, ${lit(t)});`);
  }
}
// que los números que pone la base de datos sigan después de los que trae la copia
for (const t of tablas) if (doc.tablas[t].length && typeof doc.tablas[t][0].id === 'number')
  sql.push(`select setval(pg_get_serial_sequence('${destino}.${t}', 'id'), (select max(id) from ${destino}.${t}));`);
sql.push('commit;');
process.stdout.write(sql.join('\n') + '\n');
