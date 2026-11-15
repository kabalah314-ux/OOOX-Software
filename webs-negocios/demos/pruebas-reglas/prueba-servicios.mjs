// La base de servicios y el paso de la hoja de un negocio a su catálogo (15-11-2026).
// Uso: node prueba-servicios.mjs <carpeta del sitio>
import path from 'node:path';
import { leeNucleo } from './valida-negocio.mjs';
import { OFICIOS, TODOS, FUENTES } from '../../oficios-base/servicios.mjs';
import { leeCSV, aCatalogo } from '../servicios-catalogo.mjs';
const sitio = process.argv[2]; if (!sitio) { console.log('Uso: node prueba-servicios.mjs <carpeta del sitio>'); process.exit(2) }
const K = leeNucleo(sitio);
let ok = 0, mal = 0; const es = (c, t) => { if (c) ok++; else { mal++; console.log('  FALLA: ' + t) } };
const lista = Object.values(TODOS);
es(lista.length >= 20 && new Set(lista.map(s => s.id)).size === lista.length && Object.keys(OFICIOS).every(k => OFICIOS[k].servicios.length), 'la base tiene servicios de cada oficio, cada uno con su código');
es(lista.every(s => s.n && s.que && Array.isArray(s.dur) && Number.isInteger(s.dur[0]) && s.dur[0] >= 1 && s.dur[0] <= s.dur[1] && s.dur[1] <= 600 && ['aparte', 'dentro', 'no'].includes(s.mat) && typeof s.urg === 'boolean'), 'cada servicio dice lo que incluye, lo que tarda y si lleva material');
es(lista.every(s => s.ref === null || (s.ref[0] > 0 && s.ref[1] >= s.ref[0] && FUENTES[s.fte])), 'cada precio de mercado dice de qué fuente sale');
const H = 'Servicio,¿Lo hacéis?,"Vuestro precio (€, con IVA)",Vuestro tiempo normal (min),Vuestro tiempo máximo (min),Código\n';
const r1 = aCatalogo(leeCSV(H + 'Cambiar un grifo,TRUE,"65,00 €",35,60,fon-grifo-cambiar\nCambiar el mecanismo de la cisterna,TRUE,140,,,fon-cisterna-mecanismo\nReparar un termo,FALSE,,,,fon-termo-reparar\nPoner mampara,TRUE,180,120,200,\n'));
es(r1.errores.length === 0 && r1.lineas.length === 3 && r1.lineas[0].linea === "grifocambiar:{t:'Cambiar un grifo',p10:65,u:1,base:'fon-grifo-cambiar',dur:[35,60]}" && r1.lineas[1].linea.includes('p21:140,mat:1') && r1.lineas[1].linea.includes('dur:[30,60]') && !r1.lineas.some(l => l.linea.includes('termo')) && r1.lineas[2].linea.startsWith('ponermampara:{'),
  'de la hoja: solo los marcados, con su precio y sus tiempos (o los de la base si no los ponen), y lo que no está en la base, también');
const r2 = aCatalogo(leeCSV(H.replace(/,/g, ';').replace('"Vuestro precio (€; con IVA)"', 'Vuestro precio (€, con IVA)') + 'Cambiar un sifón;VERDADERO;45,50 €;20;40;fon-sifon\n'));
es(r2.errores.length === 0 && r2.lineas.length === 1 && r2.lineas[0].linea.includes('p10:45.5') && r2.lineas[0].linea.includes('dur:[20,40]'), 'una hoja guardada con punto y coma y comas de decimales también vale');
const r3 = aCatalogo(leeCSV(H + 'Mal,TRUE,abc,10,20,fon-sifon\nOtro,TRUE,50,60,20,fon-sifon\nRaro,TRUE,50,10,20,fon-nada\n,TRUE,50,10,20,\n'));
es(r3.errores.length === 4 && r3.lineas.length === 0 && /precio/.test(r3.errores[0]) && /tiempos/.test(r3.errores[1]) && /no está en la base/.test(r3.errores[2]) && /nombre/.test(r3.errores[3]), 'lo que está mal se dice fila a fila: el precio, los tiempos, un código que no existe, una fila sin nombre');
es(aCatalogo(leeCSV('A,B\n1,2\n')).errores.length === 1, 'una hoja que no es la de servicios no se lee');
// lo que sale se puede pegar en el catálogo y el núcleo lo lee
const cat = Function('return {' + r1.lineas.map(l => l.linea).join(',') + '}')(), N = { catalogo: Object.assign({ desp: { t: 'Desplazamiento', p10: 30, u: 1 } }, cat) };
const cats = (() => { try { return K.cfgDe(Object.assign({ id: 'x', serie: 'X', tarifa: { dia: [480, 1200], recargo: .4 }, tecnicos: [], averias: [], franjas: [], zonas: { banda: { a: 20 }, dis: {}, cp: {} } }, N)).cat } catch (e) { return null } })();
es(cats && cats.grifocambiar.dur.join() === '35,60' && cats.grifocambiar.base === 'fon-grifo-cambiar' && cats.grifocambiar.p10 === 6500 && K.durLineas({ cat: cats }, [{ k: 'grifocambiar' }, { k: 'cisternamecanismo' }]) === 35 + 30 + 10, 'lo que sale de la hoja lo lee el núcleo: precio, lo que tarda y su servicio de la base');
console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}.`);
process.exit(mal ? 1 : 0);
