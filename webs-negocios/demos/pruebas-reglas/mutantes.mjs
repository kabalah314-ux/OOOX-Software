// ¿Valen las pruebas? Se estropea adrede una regla cada vez (un «mutante») y se pasan las pruebas.
// Si las pruebas siguen en verde, el mutante sobrevive: falta una prueba para esa regla.
// Nota = mutantes cazados / mutantes válidos × 100. Objetivo: 100 %.
// Uso: node mutantes.mjs <carpeta del sitio> [--rapido]     (--rapido: solo las pruebas de ejemplos, sin recorridos al azar)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const sitio = process.argv[2], rapido = process.argv.includes('--rapido');
if (!sitio) { console.log('Uso: node mutantes.mjs <carpeta del sitio> [--rapido]'); process.exit(2) }
const NUCLEO = fs.readFileSync(path.join(sitio, 'js/oficio-nucleo.js'), 'utf8'), DATOS = fs.readFileSync(path.join(sitio, 'js/oficio-datos.js'), 'utf8');

// [qué regla se estropea, texto que hay, texto que se pone]
const M = [
  ['la urgencia empieza un minuto tarde', 'n.min>=cfg.dia[1]', 'n.min>cfg.dia[1]'],
  ['el sábado deja de ser urgencia', 'n.day===0||n.day===6', 'n.day===0'],
  ['un festivo deja de ser urgencia', 'cfg.festivos.includes(n.date)||n.min<cfg.dia[0]', 'n.min<cfg.dia[0]'],
  ['el recargo de urgencia se queda en la mitad', 'const f=o.urg&&it.u?1+cfg.recargo:1', 'const f=o.urg&&it.u?1+cfg.recargo/2:1'],
  ['el material también lleva recargo', 'const f=o.urg&&it.u?1+cfg.recargo:1', 'const f=o.urg?1+cfg.recargo:1'],
  ['el IVA del 21 % salta con el 50 % de material, no con el 40 %', 'tipo=o.tipo||(o.local||pmat>.4?21:10)', 'tipo=o.tipo||(o.local||pmat>.5?21:10)'],
  ['un local paga el 10 %', 'tipo=o.tipo||(o.local||pmat>.4?21:10)', 'tipo=o.tipo||(pmat>.4?21:10)'],
  ['la base del IVA se calcula mal', 'const base=red(total/(1+tipo/100));', 'const base=red(total/(1+tipo/110));'],
  ['se pierde el mínimo de la mano de obra', 'q=Math.max(o.sinMin?it.paso:it.min,', 'q=Math.max(it.paso,'],
  ['no hay tope de horas ni de unidades', "q=Math.min(q,it.un==='h'?12:20);", 'q=q;'],
  ['con cita también se cobra urgencia', 'const tarifaDe=(cfg,A)=>A.cita?false:urgente(cfg,A.t);', 'const tarifaDe=(cfg,A)=>urgente(cfg,A.t);'],
  ['un teléfono que empieza por 1 vale', '/^[6789]\\d{8}$/', '/^[0-9]\\d{8}$/'],
  ['la garantía caduca un día antes', 'a.gar&&a.gar.hasta>=hoy', 'a.gar&&a.gar.hasta>hoy'],
  ['se puede dar cita sin dos horas de margen', 'f.de<n.min+120', 'f.de<n.min'],
  ['se da cita en festivo', 'return w>=1&&w<=5&&!cfg.festivos.includes(f)};', 'return w>=1&&w<=5};'],
  ['se da cita en sábado', 'return w>=1&&w<=5&&!cfg.festivos.includes(f)};', 'return w>=1&&w<=6&&!cfg.festivos.includes(f)};'],
  ['no se guarda a nadie para urgencias', 'return Math.max(0,n*cfg.porFranja-cfg.reserva)}', 'return Math.max(0,n*cfg.porFranja)}'],
  ['los ausentes cuentan como si trabajaran', 'trabaja(cfg,id,dia,f.de,f.a)&&!ausente(S,id,dia)).length', 'trabaja(cfg,id,dia,f.de,f.a)).length'],
  ['basta trabajar un rato de la franja', '.some(x=>x[0]<=de&&x[1]>=a)}', '.some(x=>x[0]<=de&&x[1]>de)}'],
  ['se asigna una cita a alguien ausente', "if(ausente(S,tec,A.cita.dia))return'ausente_tec';", ''],
  ['se asigna una cita a quien no trabaja esa franja', "if(!f||!trabaja(cfg,tec,A.cita.dia,f.de,f.a))return'horario';", "if(!f)return'horario';"],
  ['un técnico lleva una cita de más por franja', ">=cfg.porFranja?'lleno':''}", ">cfg.porFranja?'lleno':''}"],
  ['una urgencia de noche va a quien no hace guardias', "return!ahora&&cfg.hayGuardia&&!cfg.tec[tec].guardia?'horario':''}", "return''}"],
  ['una urgencia va a alguien ausente hoy', "const n=madrid(t);if(ausente(S,tec,n.date))return'ausente_tec';", 'const n=madrid(t);'],
  ['al ponerse enfermo, sus citas del último día no se sueltan', 'if(d>=a.de&&d<=a.a){suelta(X', 'if(d>=a.de&&d<a.a){suelta(X'],
  ['al cambiar la hora no se mira si el técnico puede', "if(A.tec&&puedeIr(S,cfg,A,A.tec,t))suelta(A,'no puede en ese horario');", ''],
  ['solo se avisa de que sobran citas si sobran dos', 'if(n>0)out.push({dia:a.cita.dia', 'if(n>1)out.push({dia:a.cita.dia'],
  ['cualquiera puede asignar', "case 'asignar':{\n  if(!esC)return R('permiso');", "case 'asignar':{\n  "],
  ['cualquier técnico puede dar el «Voy» de otro', "case 'voy':{\n  if(!mio)return R('permiso');", "case 'voy':{\n  if(!esT)return R('permiso');"],
  ['un técnico puede ir a dos avisos a la vez', "return R('ocupado');\n  A.e='camino'", "{}\n  A.e='camino'"],
  ['se empieza sin la firma del cliente', "if(typeof p.firma!=='string'||p.firma.length<12)return R('firma');\n  const pr=precio(cfg,p.lineas", '\n  const pr=precio(cfg,p.lineas'],
  ['se empieza con un presupuesto vacío', "if(!pr.total)return R('lineas');\n  A.lin=pr.lineas.map", "\n  A.lin=pr.lineas.map"],
  ['una ampliación que no suma se acepta', "dif=pr.total-A.tot.total;if(dif<=0)return R('lineas');", "dif=pr.total-A.tot.total;if(dif<0)return R('lineas');"],
  ['una ampliación sin firma se acepta', "if(typeof a.firma!=='string'||a.firma.length<12)return R('firma');\n  const mas=", '\n  const mas='],
  ['la garantía dura un mes de más', 'A.gar={hasta:masMeses(madrid(t).date,cfg.meses)};', 'A.gar={hasta:masMeses(madrid(t).date,cfg.meses+1)};'],
  ['se termina sin decir cómo paga', "if(!PAGOS.includes(a.modo))return R('modo');\n  if(enPausa(A))", '\n  if(enPausa(A))'],
  ['«lo paga después» cuenta como cobrado', "A.pago={modo:a.modo,t,cobrado:a.modo!=='pendiente'};if(typeof a.firma", 'A.pago={modo:a.modo,t,cobrado:true};if(typeof a.firma'],
  ['tras cobrar sigue el recordatorio de pago', "A.pago={modo:a.modo,t,cobrado:true};sinMsg(A,['cobro']);", 'A.pago={modo:a.modo,t,cobrado:true};'],
  ['se cancela un trabajo ya empezado', "case 'cancelar':{\n  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))", "case 'cancelar':{\n  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente','curso'].includes(A.e))"],
  ['«no acepta» da garantía', 'A.local=!!a.local;A.sinTrabajo=true;', 'A.local=!!a.local;'],
  ['caben cinco fotos', "(A.fotos||[]).length>=4)return R('fotos')", "(A.fotos||[]).length>=5)return R('fotos')"],
  ['un canal inventado se guarda tal cual', "ORIGEN.includes(a.origen)?a.origen:'otro'", 'a.origen'],
  ['las claves «constructor» y «toString» cuelan', 'const vacio=()=>Object.create(null),', 'const vacio=()=>({}),'],
  ['una franja a y media se lee «8.5»', "const hf=m=>m%60?Math.floor(m/60)+':'+String(m%60).padStart(2,'0'):String(m/60);", 'const hf=m=>String(m/60);'],
  ['una zona desconocida no tiene tiempo de llegada', '||cfg.etaMax};', '||0};'],
  ['la caja del día no suma el total', 'caja[A.pago.modo]+=A.tot.total;caja.total+=A.tot.total', 'caja[A.pago.modo]+=A.tot.total'],
  ['los pendientes no suman su importe', 'pend.n++;pend.total+=A.tot.total', 'pend.n++'],
  ['los cancelados cuentan en las cifras por canal', "if(A.e!=='cancelado'&&madrid(A.t).date.slice(0,7)===mes", 'if(madrid(A.t).date.slice(0,7)===mes'],
  ['el mes se alarga un día cuando no toca', 'd.setUTCDate(Math.min(dia,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));', 'd.setUTCDate(dia);'],
  ['un rechazo deja la nota cambiada', "if(conFoto&&(A.fotos||[]).length>=4)return R('fotos');if(a.obs==null&&!conFoto)return R('vacio');\n  if(a.obs!=null)A.obs=a.obs.trim().slice(0,400);", "if(a.obs!=null)A.obs=a.obs.trim().slice(0,400);\n  if(conFoto&&(A.fotos||[]).length>=4)return R('fotos');if(a.obs==null&&!conFoto)return R('vacio');"],
];

// una copia del sitio donde solo cambia el archivo de reglas (lo demás, enlazado)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mutantes-')); fs.mkdirSync(path.join(tmp, 'js'));
for (const f of fs.readdirSync(sitio)) if (f !== 'js') fs.symlinkSync(path.resolve(sitio, f), path.join(tmp, f));
for (const f of fs.readdirSync(path.join(sitio, 'js'))) if (f !== 'oficio-nucleo.js') fs.copyFileSync(path.join(sitio, 'js', f), path.join(tmp, 'js', f));
const corre = (args, ms) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: ms }).status;
const ejemplos = () => corre([path.join(aqui, '../prueba-oficio.mjs'), tmp], 60000);
const azar = () => corre([path.join(aqui, 'azar.mjs'), tmp, '--negocio', path.join(tmp, 'js/oficio-datos.js'), '--negocio', path.join(aqui, 'negocios/voltio.js'), '--tandas', '30', '--pasos', '120'], 600000);

fs.writeFileSync(path.join(tmp, 'js/oficio-nucleo.js'), NUCLEO);
if (ejemplos() !== 0) { console.log('Las pruebas ya fallan sin estropear nada: arregla eso primero.'); process.exit(2) }
let cazados = 0, vivos = [], rotos = [], porEjemplos = 0;
for (const [que, hay, pongo] of M) {
  const n = NUCLEO.split(hay).length - 1;
  if (n !== 1) { rotos.push(que + ' (el texto aparece ' + n + ' veces)'); continue }
  fs.writeFileSync(path.join(tmp, 'js/oficio-nucleo.js'), NUCLEO.replace(hay, pongo));
  if (ejemplos() !== 0) { cazados++; porEjemplos++; continue }
  if (!rapido && azar() !== 0) { cazados++; continue }
  vivos.push(que);
}
fs.rmSync(tmp, { recursive: true, force: true });
const validos = M.length - rotos.length, nota = validos ? Math.round(cazados / validos * 100) : 0;
rotos.forEach(x => console.log('  NO SE PUEDE APLICAR  ' + x));
vivos.forEach(x => console.log('  SOBREVIVE  ' + x));
console.log((vivos.length || rotos.length ? 'MAL' : 'BIEN') + ': ' + cazados + ' de ' + validos + ' reglas estropeadas adrede se cazan (' + nota + ' %): ' + porEjemplos + ' con las pruebas de ejemplos y ' + (cazados - porEjemplos) + ' con los recorridos al azar' + (rapido ? ' (modo rápido: sin recorridos)' : ''));
process.exit(vivos.length || rotos.length ? 1 : 0);
