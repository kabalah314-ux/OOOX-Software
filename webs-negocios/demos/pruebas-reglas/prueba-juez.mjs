// El juez (el servidor de la fase 2), con ejemplos escritos a mano y un almacén de mentira. Sin navegador y sin red.
// Uso: node prueba-juez.mjs <carpeta del sitio>
//      OFICIOS_SERVIDOR=<carpeta> para probar otra copia del juez (lo usa mutantes-juez.mjs)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url)), sitio = process.argv[2];
if (!sitio) { console.log('Uso: node prueba-juez.mjs <carpeta del sitio>'); process.exit(2); }
const DIR = path.resolve(process.env.OFICIOS_SERVIDOR || path.join(aqui, '../../oficios-servidor'));
const { crea, paraQuien, TOPES, llaveNueva } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
const { creaAlmacen } = await import(pathToFileURL(path.join(DIR, 'almacen-memoria.mjs')).href);
const K = leeNucleo(sitio), NR = leeNegocio(path.join(sitio, 'js/oficio-datos.js')).N, NV = leeNegocio(path.join(aqui, 'negocios/voltio.js')).N;
let ok = 0, mal = 0;
const es = (c, t) => { if (c) ok++; else { mal++; console.log('  MAL  ' + t); } };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* un martes laborable a media mañana, hora de Madrid; cada llamada al reloj avanza un segundo */
const reloj = { t: Date.parse('2026-11-17T10:30:00+01:00') };
const ahora = () => (reloj.t += 1000);
let estorbo = null;
const A = creaAlmacen({ ahora: () => reloj.t, estorbo: (...a) => estorbo && estorbo(...a) });
const J = crea({ K, almacen: A, ahora });
const tecR = NR.tecnicos.map(t => t.id), tecV = NV.tecnicos.map(t => t.id);
A.alta('ramirez', NR, K.ESQ); A.persona('ramirez', 'oficina', 'centralita', 'oficina', 'codigo-oficina-r'); tecR.forEach(t => A.persona('ramirez', t, 'tecnico', t, 'codigo-' + t));
A.alta('voltio', NV, K.ESQ); A.persona('voltio', 'oficina', 'centralita', 'oficina', 'codigo-oficina-v'); tecV.forEach(t => A.persona('voltio', t, 'tecnico', t, 'codigo-v-' + t));
A.persona('ramirez', 'fantasma', 'tecnico', 'no-existe', 'codigo-fantasma');
const OF = { negocio: 'ramirez', persona: 'oficina', codigo: 'codigo-oficina-r' }, T = t => ({ negocio: 'ramirez', persona: t, codigo: 'codigo-' + t });
const cliDe = N => ({ nombre: 'Montse', apellidos: 'Vila', tel: '612345678', dir: 'Calle de la Prueba 12, 3.º 2.ª', cp: Object.keys(N.zonas.cp)[0] });
const hacer = (quien, accion, mas) => J.atiende(Object.assign({ que: 'hacer', accion }, quien, mas));
const leer = (quien, desde) => J.atiende(Object.assign({ que: 'leer', desde }, quien));
const crudo = id => A.crudo(id);
/* lo guardado tiene que ser igual a repetir el diario desde cero (la llave del enlace la pone el juez, no las reglas) */
function repite(id, N) {
  const n = crudo(id), cfg = K.cfgDe(N), S = K.nuevo();
  for (const d of n.diario) { const r = K.aplicar(S, cfg, JSON.parse(JSON.stringify(d.accion)), d.q, d.t); if (!r.ok || S.v !== d.v) return false; }
  const sin = a => { const x = Object.assign({}, a); delete x.llave; return x; };
  const guardado = [...n.avisos.values()].map(f => f.datos).sort((a, b) => a.n - b.n);
  return S.v === n.v && igual(S.avisos, guardado.map(sin)) && igual({ esq: S.esq, n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [] }, n.cab)
    && [...n.avisos.values()].every(f => igual(f.vista, K.vistaCliente(Object.assign({}, S, { avisos: guardado }), cfg, f.id)));
}

// 1. entrar
{ const r = await J.atiende(Object.assign({ que: 'entrar' }, OF)), t0 = await J.atiende(Object.assign({ que: 'entrar' }, T(tecR[0])));
  es(r.ok && r.rol === 'centralita' && r.id === 'oficina' && r.v === 0, 'la oficina entra con su código');
  es(t0.ok && t0.rol === 'tecnico' && t0.id === tecR[0], 'un técnico entra con el suyo');
  const malos = [await J.atiende({ que: 'entrar', negocio: 'ramirez', persona: 'oficina', codigo: 'otro' }), await J.atiende({ que: 'entrar', negocio: 'ramirez', persona: 'nadie', codigo: 'codigo-oficina-r' }),
    await J.atiende({ que: 'entrar', negocio: 'no-existe', persona: 'oficina', codigo: 'codigo-oficina-r' }), await J.atiende({ que: 'entrar', negocio: 'ramirez', persona: 'oficina' }),
    await J.atiende({ que: 'entrar', negocio: 'ramirez', persona: 'fantasma', codigo: 'codigo-fantasma' }), await J.atiende({ que: 'entrar', negocio: 'voltio', persona: 'oficina', codigo: 'codigo-oficina-r' })];
  es(malos.every(x => igual(x, { ok: false, err: 'clave' })), 'código malo, persona que no existe, negocio que no existe, técnico que no está en los datos y código de otro negocio: todos reciben la misma respuesta');
  crudo('ramirez').fallos = []; crudo('voltio').fallos = [];
  const sinCodigo = [await J.atiende({ que: 'leer', negocio: 'ramirez', persona: 'oficina', codigo: 'otro', desde: 0 }), await J.atiende({ que: 'hacer', negocio: 'ramirez', persona: 'oficina', codigo: 'otro', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliDe(NR) } }),
    await J.atiende({ que: 'leer', negocio: 'ramirez', desde: 0 }), await J.atiende({ que: 'hacer', negocio: 'ramirez', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliDe(NR) } })];
  es(sinCodigo.every(x => igual(x, { ok: false, err: 'clave' })) && crudo('ramirez').v === 0 && crudo('ramirez').avisos.size === 0, 'sin el código bueno no se lee ni se hace nada');
  crudo('ramirez').fallos = []; }

// 2. hacer: un aviso nuevo, y lo que queda guardado
let id1;
{ const r = await hacer(OF, { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliDe(NR) }, { desde: 0 });
  id1 = r.r && r.r.id; const f = crudo('ramirez').avisos.get(id1);
  es(r.ok && r.v === 1 && typeof id1 === 'string' && crudo('ramirez').v === 1 && crudo('ramirez').diario.length === 1, 'la oficina apunta un aviso: versión 1 y una línea en el diario');
  es(f && f.v === 1 && f.datos.e === 'nuevo' && /^[a-z2-9]{24}$/.test(f.llave) && f.datos.llave === f.llave && igual(f.de, []) && f.vista && f.vista.id === id1, 'el aviso se guarda con su versión, su llave de enlace y lo que verá el cliente');
  es(r.cambios && r.cambios.v === 1 && r.cambios.entero === true && r.cambios.avisos.length === 1 && igual(r.cambios.avisos[0].datos, f.datos) && r.cambios.cab.n === 1, 'y la respuesta ya trae lo cambiado, para no tener que preguntar otra vez'); }

// 3. las reglas mandan: lo que rechazan no cambia nada
{ const v0 = crudo('ramirez').v, d0 = crudo('ramirez').diario.length, foto = JSON.stringify([...crudo('ramirez').avisos.values()]);
  const r = await hacer(T(tecR[0]), { tipo: 'voy', id: id1 }, { desde: 1 });
  es(!r.ok && r.err === 'permiso' && crudo('ramirez').v === v0 && crudo('ramirez').diario.length === d0 && foto === JSON.stringify([...crudo('ramirez').avisos.values()]), 'un técnico no puede salir hacia un aviso que no es suyo: no cambia nada ni se apunta');
  es(r.cambios && r.cambios.v === v0 && r.cambios.avisos.length === 0, 'aun así recibe cómo está todo, por si iba atrasado');
  const raras = [await hacer(OF, null), await hacer(OF, []), await hacer(OF, 'voy'), await hacer(OF, { id: id1 }), await hacer(OF, { tipo: 'asignar', id: id1, tec: tecR[0] }, { clave: 'x'.repeat(65) })];
  es(raras.every(x => !x.ok && x.err === 'accion') && crudo('ramirez').v === v0, 'una acción que no es una acción no llega a las reglas');
  const gorda = await hacer(OF, { tipo: 'anotar', id: id1, obs: 'x'.repeat(TOPES.accion) });
  es(!gorda.ok && gorda.err === 'grande' && crudo('ramirez').v === v0, 'una acción demasiado grande se rechaza antes de mirarla');
  const inv = await hacer(OF, { tipo: 'no-existe', id: id1 });
  es(!inv.ok && crudo('ramirez').v === v0, 'una acción que las reglas no conocen no cambia nada'); }

// 4. cada uno recibe lo suyo
let id2;
{ await hacer(OF, { tipo: 'asignar', id: id1, tec: tecR[0] });
  id2 = (await hacer(OF, { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: Object.assign(cliDe(NR), { nombre: 'Pere Soler', tel: '698765432', dir: 'Avenida de Otra Cosa 3' }) })).r.id;
  const o = await leer(OF, 0), a = await leer(T(tecR[0]), 0), b = await leer(T(tecR[1]), 0);
  es(o.ok && o.cambios.avisos.length === 2 && o.cambios.avisos.every(x => x.datos) && Array.isArray(o.cambios.cab.ausencias), 'la oficina recibe todos los avisos de su negocio');
  es(a.ok && a.cambios.avisos.length === 1 && a.cambios.avisos[0].id === id1 && a.cambios.avisos[0].datos.cli.tel === '612345678' && igual(a.cambios.cab, { esq: K.ESQ }), 'un técnico recibe solo el aviso que lleva, y nada de las ausencias de los demás');
  es(b.ok && b.cambios.avisos.length === 0 && !JSON.stringify(b).includes('Montse') && !JSON.stringify(b).includes('Pere'), 'otro técnico no recibe nada: ni nombres ni teléfonos');
  const va = a.cambios.v;
  await hacer(OF, { tipo: 'asignar', id: id1, tec: tecR[1] });
  const a2 = await leer(T(tecR[0]), va), b2 = await leer(T(tecR[1]), va), o2 = await leer(OF, va);
  es(igual(a2.cambios.avisos, [{ id: id1, v: crudo('ramirez').v, fuera: true }]) && a2.cambios.entero === false, 'si la oficina se lo da a otro, al primero le llega «ya no es tuyo», sin los datos');
  es(b2.cambios.avisos.length === 1 && b2.cambios.avisos[0].datos.tec === tecR[1] && o2.cambios.avisos.length === 1 && o2.cambios.avisos[0].id === id1, 'al segundo le llega entero, y a la oficina solo lo que ha cambiado');
  const na = await leer(T(tecR[0]), 0);
  es(na.cambios.avisos.length === 1 && na.cambios.avisos[0].fuera === true && !JSON.stringify(na).includes('Montse'), 'y si el primero lo pide todo desde cero, sigue sin ver los datos');
  es((await leer(OF, crudo('ramirez').v)).cambios.avisos.length === 0, 'quien va al día no recibe nada');
  es([99999, -3, 1.5, 'dos', null, undefined, NaN].map(d => leer(OF, d)).length && (await Promise.all([99999, -3, 1.5, 'dos', null, undefined, NaN].map(d => leer(OF, d)))).every(x => x.ok && x.cambios.entero === true && x.cambios.avisos.length === 2), 'una versión imposible (del futuro, negativa o que no es un número) recibe todo entero');
  es(paraQuien({ rol: 'cliente', id: '' }, { id: 'x', v: 1, datos: { tec: '' }, de: [] }) === null && paraQuien({ rol: 'otro' }, { id: 'x', v: 1, datos: { tec: '' } }) === null, 'por esta puerta, quien no es de la casa no recibe avisos'); }

// 5. la misma acción mandada dos veces se hace una sola
{ const v0 = crudo('ramirez').v, marca = 'marca-de-prueba-0001';
  const r1 = await hacer(OF, { tipo: 'anotar', id: id2, obs: 'Llamar antes de ir.' }, { clave: marca }), r2 = await hacer(OF, { tipo: 'anotar', id: id2, obs: 'Llamar antes de ir.' }, { clave: marca });
  es(r1.ok && r2.ok && r2.repetida === true && r2.v === r1.v && crudo('ramirez').v === v0 + 1 && crudo('ramirez').diario.length === v0 + 1, 'con la misma marca, la segunda vez no se repite: contesta lo mismo y la versión no sube');
  const r3 = await hacer(T(tecR[1]), { tipo: 'anotar', id: id1, obs: 'Portal B.' }, { clave: marca });
  es(r3.ok && !r3.repetida && crudo('ramirez').v === v0 + 2, 'la marca vale solo para quien la puso: otra persona con la misma marca hace su propia acción');
  const corta = await hacer(OF, { tipo: 'anotar', id: id2, obs: 'Uno.' }, { clave: 'corta' }), corta2 = await hacer(OF, { tipo: 'anotar', id: id2, obs: 'Dos.' }, { clave: 'corta' });
  es(corta.ok && corta2.ok && !corta2.repetida, 'una marca demasiado corta no cuenta como marca'); }

// 6. dos a la vez: el orden lo pone el juez
{ const v0 = crudo('ramirez').v; let veces = 0;
  estorbo = async () => { if (veces++ === 0) { estorbo = null; await hacer(OF, { tipo: 'anotar', id: id2, obs: 'Se adelanta otro aparato.' }); estorbo = null; } };
  const r = await hacer(T(tecR[1]), { tipo: 'voy', id: id1 });
  es(r.ok && crudo('ramirez').v === v0 + 2 && crudo('ramirez').avisos.get(id1).datos.e === 'camino' && crudo('ramirez').avisos.get(id2).datos.obs === 'Se adelanta otro aparato.' && igual(crudo('ramirez').diario.slice(-2).map(d => d.accion.tipo), ['anotar', 'voy']),
    'si otro aparato se adelanta entre que el juez lee y guarda, vuelve a leer: quedan las dos acciones, en orden');
  es(crudo('ramirez').diario.every((d, i) => d.v === i + 1), 'las versiones del diario van seguidas, sin huecos ni repetidas');
  let n = 0; estorbo = async () => { if (n++ === 0) { estorbo = null; await hacer(T(tecR[1]), { tipo: 'ausente', id: id1 }); } };
  const r2 = await hacer(T(tecR[1]), { tipo: 'empezar', id: id1, pres: { lineas: [{ k: Object.keys(K.cfgDe(NR).cat)[0], q: 1 }], firma: 'M1 1L20 20L40 10L60 30L80 12L100 40' } });
  es(!r2.ok && r2.err === 'estado' && crudo('ramirez').avisos.get(id1).datos.e === 'ausente', 'y si lo que hizo el otro deja la acción sin sentido, las reglas la rechazan sobre lo nuevo');
  estorbo = async id => { crudo(id).v += 0; return null; }; const vX = crudo('ramirez').v; let trampas = 0;
  const A2 = creaAlmacen({ ahora: () => reloj.t }); A2.alta('ramirez', NR, K.ESQ); A2.persona('ramirez', 'oficina', 'centralita', 'oficina', 'c');
  const guardaBien = A2.guarda; A2.guarda = async (...a) => { trampas++; return { ok: false }; };
  const J2 = crea({ K, almacen: A2, ahora }), lleno = await J2.atiende({ que: 'hacer', negocio: 'ramirez', persona: 'oficina', codigo: 'c', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliDe(NR) } });
  es(!lleno.ok && lleno.err === 'lleno' && trampas === TOPES.intentos && A2.crudo('ramirez').v === 0, 'si no consigue guardar tras varios intentos, lo dice y no deja nada a medias');
  A2.guarda = guardaBien; estorbo = null; es(crudo('ramirez').v === vX, 'y lo demás no se ha movido'); }

// 7. diez códigos fallados bloquean un rato; a los demás negocios no les afecta
{ for (let i = 0; i < 10; i++) await J.atiende({ que: 'leer', negocio: 'ramirez', persona: 'oficina', codigo: 'intento-' + i });
  const b = await J.atiende(Object.assign({ que: 'entrar' }, OF)), h = await hacer(OF, { tipo: 'anotar', id: id2, obs: 'No debe entrar.' });
  es(!b.ok && b.err === 'bloqueo' && !h.ok && h.err === 'bloqueo', 'tras diez códigos fallados, ni el código bueno entra');
  es((await J.atiende(Object.assign({ que: 'entrar', red: 'otra-conexion' }, OF))).ok && (await J.atiende(Object.assign({ que: 'entrar' }, T(tecR[0])))).ok, 'pero el bloqueo es de esa conexión y de esa persona: desde otra conexión, y los demás, siguen entrando');
  es((await J.atiende({ que: 'entrar', negocio: 'voltio', persona: 'oficina', codigo: 'codigo-oficina-v' })).ok, 'el otro negocio sigue entrando');
  reloj.t += 601000; es((await J.atiende(Object.assign({ que: 'entrar' }, OF))).ok, 'a los diez minutos vuelve a entrar'); }

// 8. pedir cita desde la web: sin código, solo eso, y con freno
let idW, llaveW;
{ reloj.t = Date.parse('2026-11-17T10:30:00+01:00');
  const h = await J.atiende({ que: 'huecos', negocio: 'ramirez' }), cfg = K.cfgDe(NR);
  const S = { esq: K.ESQ, n: crudo('ramirez').cab.n, nu: 0, ausencias: [], v: crudo('ramirez').v, avisos: [...crudo('ramirez').avisos.values()].map(f => f.datos) }, D = K.diasDe(S, cfg, reloj.t, TOPES.dias);
  es(h.ok && h.dias.length === D.length && h.dias.every((d, i) => d.dia === D[i].dia && d.hoy === !!D[i].hoy && d.franjas.every((f, j) => f.id === D[i].franjas[j].id && f.ok === !!D[i].franjas[j].ok)), 'los huecos que se enseñan son los que dicen las reglas');
  es(h.dias.every(d => igual(Object.keys(d).sort(), ['dia', 'franjas', 'hoy']) && d.franjas.every(f => igual(Object.keys(f).sort(), ['id', 'ok']))) && !/Montse|Pere|6123|6987/.test(JSON.stringify(h)), 'y no llevan cifras de la casa ni datos de nadie');
  const dia = h.dias.find(d => !d.hoy && d.franjas.some(f => f.ok)), fr = dia.franjas.find(f => f.ok).id;
  const no = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-1', accion: { tipo: 'cancelar', id: id2 } }), no2 = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-1', accion: { tipo: 'asignar', id: id2, tec: tecR[0] } });
  es(!no.ok && no.err === 'permiso' && !no2.ok && no2.err === 'permiso' && crudo('ramirez').avisos.get(id2).datos.e === 'nuevo', 'por la puerta de la web solo se puede pedir: ni cancelar ni asignar');
  const v0 = crudo('ramirez').v;
  const r = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-1', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', tec: tecR[0], e: 'hecho', cli: Object.assign(cliDe(NR), { nombre: 'Clara Web', tel: '655443322' }), cita: { dia: dia.dia, fr } } });
  idW = r.id; llaveW = r.llave; const f = crudo('ramirez').avisos.get(idW);
  es(r.ok && igual(Object.keys(r).sort(), ['id', 'llave', 'ok']) && f && f.llave === llaveW && crudo('ramirez').v === v0 + 1, 'una cita pedida en la web devuelve su número y su llave, y nada más');
  es(f.datos.origen === 'cita' && f.datos.tec === '' && f.datos.e === 'nuevo' && f.datos.cita.dia === dia.dia && crudo('ramirez').diario.slice(-1)[0].q.rol === 'cliente', 'entra como cliente: no puede darse técnico, ni estado, ni decir que llamó por teléfono');
  const of = D.find(d => d.franjas.some(x => !x.ok && x.okOf));
  if (of) { const x = of.franjas.find(y => !y.ok && y.okOf); const rr = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-2', accion: { tipo: 'pedir', av: NR.averias[0].id, cli: cliDe(NR), cita: { dia: of.dia, fr: x.id } } });
    es(!rr.ok && rr.err === 'franja', 'el cliente no puede coger el hueco que solo puede usar la oficina'); } else es(true, 'sin hueco de oficina que probar hoy');
  const malD = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-3', accion: { tipo: 'pedir', av: NR.averias[0].id, cli: { nombre: 'X' }, cita: { dia: dia.dia, fr } } });
  es(!malD.ok && igual(Object.keys(malD).sort(), ['err', 'ok']) && typeof malD.err === 'string', 'si faltan datos, las reglas dicen cuál, sin contar nada más');
  crudo('ramirez').topes.clear(); let pasan = 0, ult = null;
  for (let i = 0; i < 7; i++) { ult = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-9', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'web', cli: {} } }); if (ult.ok) pasan++; }
  es(pasan === TOPES.pedirRed[0] && ult.err === 'limite' && (await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-10', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'web', cli: {} } })).ok, 'desde la misma conexión, cinco por hora; desde otra sigue entrando');
  es(!(await J.atiende({ que: 'pedir', negocio: 'no-existe', accion: { tipo: 'pedir' } })).ok && !(await J.atiende({ que: 'huecos', negocio: 'no-existe' })).ok, 'un negocio que no existe no da huecos ni admite citas');
  /* aunque un día las reglas se equivocaran y dejasen al cliente hacer otra cosa, por esta puerta no pasa */
  let llamadas = 0; const KB = Object.assign({}, K, { aplicar: (S2, c2, a2) => { llamadas++; S2.v++; return { ok: true, id: 'X' }; } });
  const AB = creaAlmacen({ ahora: () => reloj.t }); AB.alta('ramirez', NR, K.ESQ); const JB = crea({ K: KB, almacen: AB, ahora });
  const colado = await JB.atiende({ que: 'pedir', negocio: 'ramirez', red: 'r', accion: { tipo: 'cancelar', id: 'R-0001' } });
  es(!colado.ok && colado.err === 'permiso' && llamadas === 0 && AB.crudo('ramirez').v === 0, 'y aunque las reglas se equivocaran, por la puerta de la web no pasa nada que no sea pedir'); }

// 9. el cliente, con su enlace
{ const cfg = K.cfgDe(NR), est = () => ({ esq: K.ESQ, n: 0, nu: 0, ausencias: [], v: 0, avisos: [...crudo('ramirez').avisos.values()].map(f => f.datos) });
  const v = await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: llaveW });
  es(v.ok && igual(v.vista, K.vistaCliente(est(), cfg, idW)) && !('cli' in v.vista) && !JSON.stringify(v).includes(llaveW), 'con su enlace, el cliente ve su aviso tal como lo enseñan las reglas, sin sus datos ni la llave');
  const otra = crudo('ramirez').avisos.get(id2).llave;
  const malos = [await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: otra }), await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: 'x'.repeat(24) }), await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: 'R-9999', llave: llaveW }),
    await J.atiende({ que: 'ver', negocio: 'voltio', aviso: idW, llave: llaveW }), await J.atiende({ que: 'ver', negocio: 'no-existe', aviso: idW, llave: llaveW }), await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW }), await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: '' })];
  es(malos.every(x => igual(x, { ok: false, err: 'enlace' })), 'la llave de otro aviso, una inventada, otro negocio o ninguna: todos reciben la misma respuesta');
  if (K.cfgDe(NR).mapa) {
    await hacer(OF, { tipo: 'asignar', id: idW, tec: tecR[2] }); await hacer(OF, { tipo: 'mover', id: idW, cita: null }); await hacer(OF, { tipo: 'asignar', id: idW, tec: tecR[2] });
    const s1 = await hacer(T(tecR[2]), { tipo: 'voy', id: idW }), p1 = await hacer(T(tecR[2]), { tipo: 'posicion', id: idW, lat: 41.3863149, lon: 2.1640251 });
    const v2 = await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: llaveW });
    es(s1.ok && p1.ok && v2.vista.e === 'camino' && v2.vista.pos && v2.vista.pos.lat === 41.38631, 'cuando el técnico va de camino y comparte su posición, el cliente la ve con su enlace');
    await hacer(T(tecR[2]), { tipo: 'sinPosicion', id: idW });
    es((await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: llaveW })).vista.pos === null, 'y deja de verla en cuanto el técnico deja de compartirla');
  } else { es(true, 'negocio sin mapa'); es(true, 'negocio sin mapa'); } }

// 10. dos negocios en el mismo almacén no se tocan
{ const vr = crudo('ramirez').v;
  const r = await J.atiende({ que: 'hacer', negocio: 'voltio', persona: 'oficina', codigo: 'codigo-oficina-v', accion: { tipo: 'pedir', av: NV.averias[0].id, origen: 'llamada', cli: cliDe(NV) }, desde: 0 });
  es(r.ok && crudo('voltio').v === 1 && crudo('ramirez').v === vr && r.cambios.avisos.length === 1 && r.cambios.avisos[0].id.startsWith(NV.serie), 'un aviso de un negocio no mueve la versión del otro, y lleva su propia serie');
  es(!JSON.stringify(r).includes('Clara Web') && !(await J.atiende({ que: 'hacer', negocio: 'voltio', persona: 'oficina', codigo: 'codigo-oficina-v', accion: { tipo: 'anotar', id: id2, obs: 'colado' } })).ok && crudo('ramirez').avisos.get(id2).datos.obs !== 'colado', 'desde un negocio no se lee ni se toca un aviso de otro');
  const fv = [...crudo('voltio').avisos.values()][0];
  es((await J.atiende({ que: 'ver', negocio: 'voltio', aviso: fv.id, llave: fv.llave })).ok && (await J.atiende({ que: 'huecos', negocio: 'voltio' })).ok, 'mientras está de alta, su web da huecos y el enlace de su cliente abre');
  A.baja('voltio');
  es(igual(await J.atiende({ que: 'entrar', negocio: 'voltio', persona: 'oficina', codigo: 'codigo-oficina-v' }), { ok: false, err: 'clave' }) && crudo('ramirez').activo, 'un negocio dado de baja ya no entra, y contesta lo mismo que un código malo');
  es(igual(await J.atiende({ que: 'ver', negocio: 'voltio', aviso: fv.id, llave: fv.llave }), { ok: false, err: 'enlace' }) && !(await J.atiende({ que: 'huecos', negocio: 'voltio' })).ok
    && !(await J.atiende({ que: 'pedir', negocio: 'voltio', red: 'r', accion: { tipo: 'pedir', av: NV.averias[0].id, origen: 'web', cli: {} } })).ok && crudo('voltio').v === 1, 'y de baja tampoco da huecos, ni admite citas, ni abre los enlaces de sus clientes'); }

// 11. lo guardado es igual a repetir el diario
es(repite('ramirez', NR) && repite('voltio', NV), 'lo que hay guardado de cada negocio, y lo que ve cada cliente, es igual a repetir su diario desde cero');

// 12. peticiones que no son peticiones, y un almacén que falla
{ const raras = [null, undefined, 'hola', 7, [], {}, { que: 'borrar' }, { que: 'constructor' }, { que: 'hacer' }, { que: 'toString', negocio: 'ramirez' }];
  const res = []; for (const p of raras) res.push(await J.atiende(p));
  es(res.every(x => x && x.ok === false && typeof x.err === 'string'), 'lo que no es una petición recibe un «no» con su motivo, sin romper nada');
  const roto = creaAlmacen(); roto.alta('ramirez', NR, K.ESQ); roto.negocio = async () => { throw new Error('la base de datos no contesta'); };
  let avisado = 0; const J3 = crea({ K, almacen: roto, aviso: () => { avisado++; } });
  es(igual(await J3.atiende(Object.assign({ que: 'entrar' }, OF)), { ok: false, err: 'servidor' }) && avisado === 1, 'si el almacén falla, el juez contesta «servidor», lo deja apuntado y no lanza nada');
  es(new Set(Array.from({ length: 200 }, () => llaveNueva())).size === 200 && /^[a-z2-9]{24}$/.test(llaveNueva()), 'las llaves salen distintas y con las letras que tocan'); }

console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}.`);
process.exit(mal ? 1 : 0);
