// ¿Valen las pruebas del espejo? Se le quita adrede una protección cada vez y se pasan las pruebas.
// Si siguen en verde, falta una prueba. Objetivo: todas cazadas.
// Uso: node mutantes-espejo.mjs <carpeta del sitio>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url)), sitio = process.argv[2];
if (!sitio) { console.log('Uso: node mutantes-espejo.mjs <carpeta del sitio>'); process.exit(2); }
const ESPEJO = fs.readFileSync(path.join(sitio, 'js/oficio-espejo.js'), 'utf8');

// [qué protección se quita, texto que hay, texto que se pone]
const M = [
  ['una respuesta vieja que llega tarde pisa lo nuevo', 'else if(c.v<B.v)return false;', ''],
  ['un aviso suelto más viejo pisa al que se tiene', 'if(ver[f.id]>f.v)return;', ''],
  ['«ya no es tuyo» no quita el aviso del móvil', 'if(f.fuera){por.delete(f.id);delete ver[f.id]}', 'if(f.fuera){delete ver[f.id]}'],
  ['una respuesta entera no borra lo que había', 'if(c.entero){B.avisos=[];Object.keys(ver)', 'if(c.entero){Object.keys(ver)'],
  ['los avisos quedan en el orden en que llegan', '.sort((a,b)=>(a.n||0)-(b.n||0));\n B.v=c.v;', ';\n B.v=c.v;'],
  ['la versión no avanza al recibir cambios', ';\n B.v=c.v;const cab=c.cab||{};', ';\n const cab=c.cab||{};'],
  ['la oficina no recibe contadores ni ausencias', "if('n' in cab){B.n=cab.n||0;B.nu=cab.nu||0;B.ausencias=Array.isArray(cab.ausencias)?cab.ausencias:[]}", ''],
  ['lo adelantado se escribe encima de lo que dijo el servidor', 'estado();if(S===B)S=copia(B);', 'estado();'],
  ['lo que las reglas rechazan se manda igualmente', 'if(!r.ok){if(!adelantadas())S=B;return r}', ''],
  ['lo que crea algo se adelanta con un número inventado', "||CREAN.includes(accion.tipo))return{ok:false,err:'espera'};", ")return{ok:false,err:'espera'};"],
  ['una posición nueva cambia la que ya ha salido', '&&!u.crea&&!u.vuela&&', '&&!u.crea&&'],
  ['crear no mira antes si los datos valen', 'if(!r.ok)return Promise.resolve(r);\n  return new Promise', 'return new Promise'],
  ['sin red, crear se queda colgado en la cola', "if(p.crea){cola.shift();sucio=true;p.fin({ok:false,err:err==='red'?'red':'lleno',duda:true});return{tipo:'reintenta',err,crea:true}}", ''],
  ['con el código retirado se tira lo hecho', "if(DE_SESION.includes(err)){if(p.crea){cola.shift();sucio=true;p.fin({ok:false,err:'sesion'})}return{tipo:'sesion',err}}", ''],
  ['un fallo de red se toma por un no del servidor', "const PASAJEROS=['lleno','servidor','red'];", "const PASAJEROS=['lleno','servidor'];"],
  ['un servidor que falla siempre atasca la cola', "if(!(err==='servidor'&&p.malas>=TERCO))return{tipo:'reintenta',err}}", "return{tipo:'reintenta',err}}"],
  ['tras un no del servidor, el aparato no se pone al día', 'if(res&&res.cambios)mezcla(B,ver,res.cambios);fuera();', 'fuera();'],
  ['tras un sí del servidor, el aparato no se pone al día', 'if(bien){mezcla(B,ver,res.cambios);fuera();', 'if(bien){fuera();'],
  ['lo confirmado no sale de la cola', 'const fuera=()=>{cola.shift();hechas.push(clave);', 'const fuera=()=>{hechas.push(clave);'],
  ['al cerrar la app se pierde lo que faltaba por enviar', 'cola:cola.filter(p=>!p.crea).map(p=>({clave:p.clave,accion:p.accion,t:p.t})),hechas', 'cola:[],hechas'],
  ['al abrir la app, lo pendiente cambia de marca', 'cola:cola.filter(p=>!p.crea).map(p=>({clave:p.clave,accion', "cola:cola.filter(p=>!p.crea).map(p=>({clave:p.clave+'x',accion"],
  ['se carga lo guardado por otra persona', 'x.quien.rol!==q.rol||x.quien.id!==q.id||', ''],
  ['se carga lo guardado con otra versión de la app', '||x.B.esq!==K.ESQ', ''],
  ['las fotos se guardan en el aparato', "Object.assign({},a,{foto:'',fotos:[]}):a;", 'a:a;'],
  ['al juntar pestañas vuelve lo que ya estaba enviado', "&&p.accion&&!H.has(p.clave))por.set(p.clave,p)", '&&p.accion)por.set(p.clave,p)'],
  ['al juntar pestañas se mezcla lo de otra persona', "||viejo.quien.rol!==mio.quien.rol||viejo.quien.id!==mio.quien.id)return mio;", ')return mio;'],
  ['al juntar pestañas se pierde la cola de la otra', "[].concat(Array.isArray(viejo.cola)?viejo.cola:[],mio.cola).forEach", '[].concat(mio.cola).forEach'],
  ['lo que otra pestaña ya envió sigue en la cola', 'cola=cola.filter(p=>p.vuela||p.crea||!H.has(p.clave));', ''],
  ['lo adelantado se repite en otro orden', 'S=copia(B);cola.forEach(p=>{', 'S=copia(B);cola.slice().reverse().forEach(p=>{'],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mutantes-espejo-')), copia = path.join(tmp, 'oficio-espejo.js');
const pruebas = [path.join(aqui, 'prueba-espejo.mjs'), path.join(aqui, 'azar-espejo.mjs')].filter(f => fs.existsSync(f));
const corre = () => pruebas.findIndex(f => spawnSync(process.execPath, [f, sitio].concat(f.endsWith('azar-espejo.mjs') ? ['--tandas', '40'] : []), { encoding: 'utf8', timeout: 120000, env: Object.assign({}, process.env, { OFICIOS_ESPEJO: copia }) }).status !== 0);
fs.writeFileSync(copia, ESPEJO);
if (corre() !== -1) { console.log('Las pruebas del espejo ya fallan sin estropear nada: arregla eso primero.'); process.exit(2); }
let cazados = 0, porEjemplos = 0; const vivos = [], rotos = [];
for (const [que, hay, pongo] of M) {
  const n = ESPEJO.split(hay).length - 1;
  if (n !== 1) { rotos.push(que + ' (el texto aparece ' + n + ' veces)'); continue; }
  fs.writeFileSync(copia, ESPEJO.replace(hay, pongo));
  const i = corre();
  if (i === -1) vivos.push(que); else { cazados++; if (i === 0) porEjemplos++; }
}
fs.rmSync(tmp, { recursive: true, force: true });
rotos.forEach(x => console.log('  NO SE PUEDE APLICAR  ' + x));
vivos.forEach(x => console.log('  SOBREVIVE  ' + x));
const validos = M.length - rotos.length;
console.log((vivos.length || rotos.length ? 'MAL' : 'BIEN') + ': ' + cazados + ' de ' + validos + ' protecciones del espejo quitadas adrede se cazan: ' + porEjemplos + ' con los ejemplos y ' + (cazados - porEjemplos) + ' con los recorridos al azar');
process.exit(vivos.length || rotos.length ? 1 : 0);
