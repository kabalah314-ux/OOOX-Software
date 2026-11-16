// El juez (el servidor de la fase 2), con ejemplos escritos a mano y un almacén de mentira. Sin navegador y sin red.
// Uso: node prueba-juez.mjs <carpeta del sitio>
//      OFICIOS_SERVIDOR=<carpeta> para probar otra copia del juez (lo usa mutantes-juez.mjs)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url)), sitio = process.argv[2];
if (!sitio) { console.log('Uso: node prueba-juez.mjs <carpeta del sitio>'); process.exit(2); }
const DIR = path.resolve(process.env.OFICIOS_SERVIDOR || path.join(aqui, '../../oficios-servidor'));
const { crea, paraQuien, TOPES, llaveNueva, codigoCliente, limpiaCodigo } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
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
  const n = crudo(id), cfg = K.cfgDe(N), S = K.nuevo(); let vc = 0;
  for (const d of n.diario) { const c0 = JSON.stringify(S.contratos || []), r = K.aplicar(S, cfg, JSON.parse(JSON.stringify(d.accion)), d.q, d.t); if (!r.ok || S.v !== d.v) return false; if (JSON.stringify(S.contratos || []) !== c0) vc = d.v; }
  const sin = a => { const x = Object.assign({}, a); delete x.llave; return x; };
  const guardado = [...n.avisos.values()].map(f => f.datos).sort((a, b) => a.n - b.n);
  return S.v === n.v && igual(S.avisos, guardado.map(sin)) && igual({ esq: S.esq, n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [], contratos: S.contratos || [], nc: S.nc || 0, vc, furgos: S.furgos || {} }, Object.assign({ esq: 0, n: 0, nu: 0, ausencias: [], contratos: [], nc: 0, vc: 0, furgos: {} }, n.cab))
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
  es(a.ok && a.cambios.avisos.length === 1 && a.cambios.avisos[0].id === id1 && a.cambios.avisos[0].datos.cli.tel === '612345678' && igual(a.cambios.cab, { esq: K.ESQ, furgos: {} }), 'un técnico recibe solo el aviso que lleva, y nada de las ausencias de los demás');
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
  // para una urgencia: en cuánto se llegaría ahora, sin decir quién va
  const dis0 = Object.keys(cfg.zonas.dis)[0], hu = await J.atiende({ que: 'huecos', negocio: 'ramirez', dis: dis0, av: NR.averias[0].id }), uR = K.urgenciaAhora(S, cfg, dis0, reloj.t, NR.averias[0].id);
  const hx = await J.atiende({ que: 'huecos', negocio: 'ramirez', dis: 'constructor', av: 7 }), ux = K.urgenciaAhora(S, cfg, null, reloj.t, '');
  es(hu.ok && igual(hu.urg, uR ? { de: uR.de, a: uR.a } : null) && hx.ok && igual(hx.urg, ux ? { de: ux.de, a: ux.a } : null) && (h.urg === null || igual(Object.keys(h.urg).sort(), ['a', 'de'])),
    'para una urgencia, el tiempo de llegada a su barrio (o al más lejano si no lo dice), sin decir quién va');
  reloj.t = Date.parse('2026-11-17T23:30:00+01:00'); const hn = await J.atiende({ que: 'huecos', negocio: 'ramirez', dis: dis0 }), un = K.urgenciaAhora(S, cfg, dis0, reloj.t, '');
  es(hn.ok && igual(hn.urg, un ? { de: un.de, a: un.a } : null), 'de noche, lo mismo que dicen las reglas con quien esté de guardia'); reloj.t = Date.parse('2026-11-17T10:30:00+01:00');
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

// 9 bis. el material que falta (15-11-2026): por el servidor lo apuntan la oficina o su técnico, otro técnico no, y el cliente no lo ve
{ const mat = Object.keys(NR.catalogo).find(k => NR.catalogo[k].mat), suyo = crudo('ramirez').avisos.get(idW).datos.tec, otro = tecR.find(x => x !== suyo);
  const r1 = await hacer(OF, { tipo: 'falta', id: idW, k: mat, q: 2 }), r2 = await hacer(T(otro), { tipo: 'falta', id: idW, t: 'Racor de 3/4' });
  const r3 = suyo ? await hacer(T(suyo), { tipo: 'falta', id: idW, t: 'Racor de 3/4' }) : { ok: true };
  const v = await J.atiende({ que: 'ver', negocio: 'ramirez', aviso: idW, llave: llaveW }), f = crudo('ramirez').avisos.get(idW).datos.falta;
  es(r1.ok && !r2.ok && r2.err === 'permiso' && r3.ok && f[0].k === mat && f[0].q === 2 && (!suyo || f[1].t === 'Racor de 3/4') && v.ok && !('falta' in v.vista) && !JSON.stringify(v).includes('Racor'),
    'el material que falta: lo apuntan la oficina y su técnico por el servidor, otro técnico no puede, y el cliente no lo ve con su enlace'); }

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

// 13. la zona del cliente: la oficina le da un código y el cliente entra con su teléfono y ese código
{ reloj.t += 601000; crudo('ramirez').fallos = []; const v0 = crudo('ramirez').v, d0 = crudo('ramirez').diario.length;
  const cfg = K.cfgDe(NR), PERFIL_OK = ['id', 'av', 'e', 'urg', 't', 'cita', 'tec', 'ini', 'fin', 'min', 'sinTrabajo', 'pres', 'amp', 'tot', 'pago', 'gar', 'obs', 'conf', 'fotos', 'cli', 'vista', 'llave'];
  /* el estado tal como lo carga el juez */
  const est = () => { const n = crudo('ramirez'); return Object.assign({ esq: K.ESQ, n: 0, nu: 0, ausencias: [] }, JSON.parse(JSON.stringify(n.cab)), { v: n.v, avisos: [...n.avisos.values()].map(f => JSON.parse(JSON.stringify(f.datos))).sort((a, b) => (a.n || 0) - (b.n || 0)) }); };
  const acceso = (quien, tel, mas) => J.atiende(Object.assign({ que: 'acceso', tel }, quien, mas));
  const perfil = (tel, codigo, red) => J.atiende({ que: 'perfil', negocio: 'ramirez', tel, codigo, red: red || 'red-cli' });
  const sinLlave = L => L.map(a => { const x = Object.assign({}, a); delete x.llave; return x; });
  const TM = '612345678', TP = '698765432', TN = '611111111', malo = i => 'zzzz-z' + 'abcdefghjk'[i % 10] + 'abcdefghjk'[Math.floor(i / 10) % 10] + 'abcdefghjk'[Math.floor(i / 100) % 10];
  // quién puede pedir un código, y para quién
  const deTec = await acceso(T(tecR[0]), TM), sinCod = await J.atiende({ que: 'acceso', negocio: 'ramirez', persona: 'oficina', codigo: 'otro', tel: TM });
  es(igual(deTec, { ok: false, err: 'permiso' }) && igual(sinCod, { ok: false, err: 'clave' }) && crudo('ramirez').clientes.size === 0, 'solo la centralita da el código de la zona del cliente: un técnico no, ni nadie sin el código de la oficina');
  crudo('ramirez').fallos = [];
  es(igual(await acceso(OF, '123'), { ok: false, err: 'tel' }) && igual(await acceso(OF, TN), { ok: false, err: 'nadie' }) && crudo('ramirez').clientes.size === 0, 'ni para un teléfono mal escrito ni para uno sin avisos: no se da código a quien no es cliente');
  // el código se crea una vez y después se vuelve a dar el mismo
  const a1 = await acceso(OF, '+34 612 34 56 78'), a2 = await acceso(OF, TM);
  es(a1.ok && a1.tel === TM && /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(a1.codigo) && a1.nuevo === true && igual(Object.keys(a1).sort(), ['codigo', 'nuevo', 'ok', 'tel']), 'la oficina pide el código de un cliente y recibe uno nuevo, de ocho letras');
  es(a2.ok && a2.codigo === a1.codigo && a2.nuevo === false, 'si lo vuelve a pedir es el mismo: se lo puede mandar otra vez');
  // el cliente entra con él y recibe lo suyo
  const p1 = await perfil(TM, a1.codigo), Pf = K.perfilCliente(est(), cfg, TM);
  es(p1.ok && igual(sinLlave(p1.perfil.avisos), Pf.avisos) && igual(p1.perfil.cli, Pf.cli) && p1.perfil.tel === TM && igual(Object.keys(p1).sort(), ['ok', 'perfil']), 'con su teléfono y su código, el cliente recibe su perfil tal como lo dan las reglas');
  es(p1.perfil.avisos.length >= 1 && p1.perfil.avisos.every(a => K.tel9(a.cli.tel) === TM && a.llave === crudo('ramirez').avisos.get(a.id).llave && a.llave.length === 24), 'con todos sus avisos y la llave de cada uno, para seguirlos en directo');
  es(!/Pere|Clara|698765432|655443322/.test(JSON.stringify(p1)) && p1.perfil.avisos.every(a => Object.keys(a).every(k => PERFIL_OK.includes(k))), 'y nada de otro cliente ni nada interno de los avisos');
  es((await perfil('612 34 56 78', a1.codigo.toUpperCase().replace('-', ' '))).ok && (await perfil('0034612345678', ' ' + a1.codigo.replace('-', '') + ' ')).ok, 'el código vale con mayúsculas, con espacios o sin guion, y el teléfono con prefijo o con espacios');
  // lo que no vale: todo contesta lo mismo
  const a3 = await acceso(OF, TP);
  const malos = [await perfil(TM, 'abcd-efgh'), await perfil(TM, a3.codigo), await perfil(TP, a1.codigo), await perfil(TN, a1.codigo), await perfil(TM, ''), await perfil(TM), await perfil(TM, a1.codigo + 'x'), await perfil('', a1.codigo), await perfil(TM, 7),
    await J.atiende({ que: 'perfil', negocio: 'voltio', tel: TM, codigo: a1.codigo }), await J.atiende({ que: 'perfil', negocio: 'no-existe', tel: TM, codigo: a1.codigo })];
  es(malos.every(x => igual(x, { ok: false, err: 'clave' })), 'un código inventado, el de otro cliente, un teléfono que no es el suyo, otro negocio o sin código: todos reciben la misma respuesta');
  es(a3.ok && a3.nuevo && a3.codigo !== a1.codigo && (await perfil(TP, a3.codigo)).ok, 'cada cliente tiene su código');
  // cambiar el código
  const a4 = await acceso(OF, TM, { cambia: true });
  es(a4.ok && a4.nuevo === true && a4.codigo !== a1.codigo && igual(await perfil(TM, a1.codigo), { ok: false, err: 'clave' }) && (await perfil(TM, a4.codigo)).ok && (await perfil(TP, a3.codigo)).ok, 'si la oficina lo cambia, el de antes deja de valer y vale el nuevo; el de los demás clientes sigue igual');
  es((await acceso(OF, TM)).codigo === a4.codigo, 'y lo que se vuelve a mandar ya es el nuevo');
  crudo('ramirez').clientes.get(TP).activo = false;
  es(igual(await perfil(TP, a3.codigo), { ok: false, err: 'clave' }), 'un código dado de baja no entra');
  const a5 = await acceso(OF, TP);
  es(a5.ok && a5.nuevo === true && a5.codigo !== a3.codigo && (await perfil(TP, a5.codigo)).ok, 'y si la oficina lo vuelve a pedir, le da uno nuevo');
  es(crudo('ramirez').v === v0 && crudo('ramirez').diario.length === d0, 'dar códigos y entrar en la zona no cambia los avisos: ni la versión ni el diario');
  // el freno
  crudo('ramirez').fallosCli = [];
  for (let i = 0; i < 10; i++) await perfil(TM, malo(i));
  es(igual(await perfil(TM, a4.codigo), { ok: false, err: 'bloqueo' }), 'tras diez códigos fallados, ni el bueno entra');
  es((await perfil(TM, a4.codigo, 'otra-red')).ok && (await perfil(TP, a5.codigo)).ok, 'pero el bloqueo es de ese teléfono y esa conexión: desde otra entra, y los demás clientes también');
  reloj.t += 601000; es((await perfil(TM, a4.codigo)).ok, 'a los diez minutos vuelve a entrar');
  for (let i = 0; i < 10; i++) await perfil(TN, malo(i));
  es(igual(await perfil(TN, malo(10)), { ok: false, err: 'bloqueo' }), 'un teléfono que no es de ningún cliente se bloquea igual: el freno no dice quién es cliente');
  crudo('ramirez').fallosCli = [];
  for (let i = 0; i < 50; i++) await perfil('6' + String(30000000 + i), malo(i), 'red-barrido');
  es(igual(await perfil(TP, a5.codigo, 'red-barrido'), { ok: false, err: 'bloqueo' }) && (await perfil(TP, a5.codigo)).ok, 'quien prueba códigos con cincuenta teléfonos queda bloqueado en su conexión; los demás, no');
  crudo('ramirez').fallosCli = [];
  for (let r = 0; r < 20; r++) for (let i = 0; i < 10; i++) await perfil(TM, malo(r * 10 + i), 'red-' + r);
  es(igual(await perfil(TM, a4.codigo, 'red-nueva'), { ok: false, err: 'bloqueo' }) && (await perfil(TP, a5.codigo, 'red-nueva')).ok, 'doscientos fallos con un teléfono, desde donde sea, lo bloquean un rato en todas partes; a los demás, no');
  crudo('ramirez').fallosCli = [];
  // nada lleva el código de un cliente, salvo lo que se le da a la oficina
  crudo('ramirez').topes.clear();
  const pw = await J.atiende({ que: 'pedir', negocio: 'ramirez', red: 'red-40', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'web', cli: { tel: TM } } });
  const todo = JSON.stringify([pw, await J.atiende({ que: 'huecos', negocio: 'ramirez' }), await leer(OF, 0), await leer(T(tecR[0]), 0), await leer(T(tecR[1]), 0), await J.atiende(Object.assign({ que: 'entrar' }, OF)), await perfil(TP, a5.codigo)]);
  es(pw.ok && igual(Object.keys(pw).sort(), ['id', 'llave', 'ok']) && ![a4.codigo, a5.codigo].some(c => todo.includes(c)), 'pedir cita con el teléfono de un cliente, los huecos, lo que lee la oficina o un técnico y la zona de otro cliente no llevan nunca su código');
  const p2 = await perfil(TM, a4.codigo);
  es(p2.ok && p2.perfil.avisos[0].id === pw.id && p2.perfil.avisos[0].llave === pw.llave && p2.perfil.cli.nombre === 'Montse' && p2.perfil.cli.dir === cliDe(NR).dir, 'un aviso nuevo con su teléfono sale el primero en su zona, y sus datos siguen siendo los suyos');
  // un negocio de baja, y peticiones raras
  es(igual(await J.atiende({ que: 'acceso', negocio: 'voltio', persona: 'oficina', codigo: 'codigo-oficina-v', tel: TM }), { ok: false, err: 'clave' }), 'un negocio dado de baja no da códigos');
  const raras = [{ que: 'perfil' }, { que: 'perfil', negocio: 'ramirez', tel: {}, codigo: [] }, { que: 'acceso', negocio: 'ramirez', tel: TM }, Object.assign({ que: 'acceso', tel: null, cambia: 'si' }, OF)], rr = [];
  for (const x of raras) rr.push(await J.atiende(x));
  es(rr.every(x => x && x.ok === false && typeof x.err === 'string'), 'lo que no es una petición de la zona del cliente recibe un «no», sin romper nada');
  es(new Set(Array.from({ length: 200 }, () => codigoCliente())).size === 200 && Array.from({ length: 50 }, () => codigoCliente()).every(c => limpiaCodigo(c) === c) && limpiaCodigo('ABCD EFGH') === 'abcd-efgh'
    && limpiaCodigo('abcd-efgi') === '' && limpiaCodigo('abc-defg') === '' && limpiaCodigo(12345678) === '', 'los códigos salen distintos y con su forma, y se leen escritos de cualquier manera, pero no con letras que no se usan'); }

// 14. los contratos de mantenimiento (15-11-2026): los guarda el juez con lo de la oficina; un técnico no los recibe; los
//     avisos del cliente los llevan, y el cliente los ve en su zona, también si solo tiene el contrato
{ reloj.t += 601000; crudo('ramirez').fallos = [];
  const acceso = (quien, tel) => J.atiende(Object.assign({ que: 'acceso', tel }, quien)), perfil = (tel, codigo, red) => J.atiende({ que: 'perfil', negocio: 'ramirez', tel, codigo, red });
  const P = NR.mantenimiento.planes[0], TC = '622334455', cliC = Object.assign(cliDe(NR), { nombre: 'Clara', apellidos: 'Riu', tel: TC, dir: 'Calle del Contrato 3, 1.º' });
  const sinPermiso = await hacer(T(tecR[0]), { tipo: 'contrato', plan: P.id, cli: cliC, acepta: 'mensaje' });
  const nc0 = crudo('ramirez').cab.nc || 0, al = await hacer(OF, { tipo: 'contrato', plan: P.id, cli: cliC, acepta: 'mensaje', modo: 'bizum' }), cab = crudo('ramirez').cab;
  es(!sinPermiso.ok && sinPermiso.err === 'permiso' && al.ok && al.r.id === NR.serie + 'M-' + String(nc0 + 1).padStart(4, '0') && cab.contratos.some(c => c.id === al.r.id && c.per[0].pago.cobrado) && cab.nc === nc0 + 1,
    'el contrato lo da de alta la oficina por el servidor, y se guarda con lo de la oficina');
  const lo = await leer(OF, 0), lt = await leer(T(tecR[0]), 0);
  es(lo.cambios.cab.contratos.some(c => c.id === al.r.id) && !('contratos' in lt.cambios.cab) && !JSON.stringify(lt).includes('Clara'), 'la oficina recibe los contratos; un técnico, no');
  const v1 = crudo('ramirez').v, antes = await leer(OF, v1 - 1), ya = await leer(OF, v1);
  es(cab.vc === v1 && antes.cambios.cab.contratos.some(c => c.id === al.r.id) && !('contratos' in ya.cambios.cab) && ya.cambios.cab.nc === cab.nc,
    'la oficina que ya está al día no vuelve a recibir los contratos: solo los recibe quien va por detrás de su último cambio');
  const acc = await acceso(OF, TC);
  es(acc.ok && acc.nuevo === true, 'un cliente que solo tiene el contrato también recibe el código de su zona');
  const z1 = await perfil(TC, acc.codigo, 'red-contrato');
  es(z1.ok && z1.perfil.avisos.length === 0 && z1.perfil.contratos.length === 1 && z1.perfil.contratos[0].id === al.r.id && !('h' in z1.perfil.contratos[0]) && z1.perfil.cli.nombre === 'Clara', 'y en su zona ve su contrato, sin el historial de la oficina');
  const rw = await J.atiende({ que: 'pedir', negocio: 'ramirez', accion: { tipo: 'pedir', av: K.REV, origen: 'web', cli: cliC }, red: 'red-contrato' });
  es(!rw.ok && rw.err === 'av', 'la revisión no se pide desde la web');
  const pw = await J.atiende({ que: 'pedir', negocio: 'ramirez', accion: { tipo: 'pedir', av: NR.averias[0].id, origen: 'web', cli: cliC }, red: 'red-contrato' });
  const fila = pw.ok ? crudo('ramirez').avisos.get(pw.id) : null;
  es(pw.ok && fila.datos.con && fila.datos.con.id === al.r.id && fila.vista && !('con' in fila.vista), 'el aviso que pide el cliente desde la web lleva su contrato; su página no lo enseña');
  const tras = await leer(OF, v1);
  es(tras.cambios.avisos.some(f => f.id === pw.id) && !('contratos' in tras.cambios.cab) && crudo('ramirez').cab.vc === v1, 'un aviso nuevo no vuelve a mandar los contratos, que no han cambiado');
  const z2 = await perfil(TC, acc.codigo, 'red-contrato');
  es(z2.ok && z2.perfil.avisos.length === 1 && z2.perfil.avisos[0].con.id === al.r.id, 'en su zona, el aviso dice que va con su contrato');
  // el técnico, en casa del cliente, por el servidor: el contrato le llega a la oficina; al técnico, solo su aviso
  const cliT = Object.assign(cliDe(NR), { nombre: 'Pol', apellidos: 'Mas', tel: '622334466', dir: 'Calle del Técnico 5' });
  const avT = (await hacer(OF, { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliT })).r.id;
  await hacer(OF, { tipo: 'asignar', id: avT, tec: tecR[0] });
  const emp = await hacer(T(tecR[0]), { tipo: 'empezar', id: avT, pres: { lineas: [{ k: Object.keys(K.cfgDe(NR).cat)[0], q: 1 }], firma: 'M1 1L20 20L40 10L60 30' } });
  const vT = crudo('ramirez').v, alT = await hacer(T(tecR[0]), { tipo: 'contrato', plan: P.id, cli: cliT, acepta: 'mensaje', aviso: avT, modo: 'efectivo' }, { desde: vT });
  const otroT = await hacer(T(tecR[1]), { tipo: 'contrato', plan: P.id, cli: Object.assign({}, cliT, { tel: '622334467' }), acepta: 'mensaje', aviso: avT });
  const ofT = await leer(OF, vT);
  es(emp.ok && alT.ok && /M-\d{4}$/.test(alT.r.id) && !('contratos' in alT.cambios.cab) && alT.cambios.avisos.some(f => f.id === avT && f.datos.h.some(h => h.txt.includes(alT.r.id))) && !otroT.ok && otroT.err === 'permiso'
    && ofT.cambios.cab.contratos.some(c => c.id === alT.r.id && c.per[0].pago.cobrado) && crudo('ramirez').cab.vc === vT + 1,
    'el técnico da de alta el contrato desde su aviso: le llega a la oficina, y él solo recibe su aviso con la nota; otro técnico no puede');
  es(repite('ramirez', NR), 'con los contratos, lo guardado sigue siendo igual a repetir el diario'); }

// 15. la furgoneta (16-11-2026): va en la cabecera. La oficina recibe todas; cada técnico, solo la suya. Lo usado se descuenta al
// terminar, también en el servidor, y lo guardado sigue siendo igual a repetir el diario
{ const cfg = K.cfgDe(NR), mats = Object.keys(cfg.cat).filter(k => cfg.cat[k].mat), [t0, t1] = tecR;
  const si = await hacer(T(t0), { tipo: 'furgo', tec: t0, llevar: true }), cu = await hacer(T(t0), { tipo: 'furgo', tec: t0, cuenta: { [mats[0]]: 5, [mats[1]]: 2 } });
  const otro = await hacer(T(t1), { tipo: 'furgo', tec: t0, carga: { [mats[0]]: 1 } }), deOf = await hacer(OF, { tipo: 'furgo', tec: t1, llevar: true });
  es(si.ok && cu.ok && !otro.ok && otro.err === 'permiso' && deOf.ok, 'cada técnico lleva la cuenta de la suya; la oficina, de cualquiera; un técnico no toca la de otro');
  const c0 = crudo('ramirez').cab.furgos;
  es(c0 && c0[t0] && c0[t0].on === true && c0[t0].st[mats[0]] === 5 && c0[t0].st[mats[1]] === 2 && c0[t1] && c0[t1].on === true, 'queda guardada en la cabecera del negocio');
  const lT = await leer(T(t0), 0), lO = await leer(OF, 0), l1 = await leer(T(t1), 0);
  es(lT.ok && Object.keys(lT.cambios.cab.furgos).join() === t0 && lT.cambios.cab.furgos[t0].st[mats[0]] === 5 && !('ausencias' in lT.cambios.cab) && !('contratos' in lT.cambios.cab), 'el técnico recibe solo su furgoneta');
  es(l1.ok && Object.keys(l1.cambios.cab.furgos).join() === t1, 'y el otro, solo la suya');
  es(lO.ok && lO.cambios.cab.furgos[t0] && lO.cambios.cab.furgos[t1], 'la oficina las recibe todas');
  // un trabajo con material, de alguien que no está con otro: al terminarlo se descuenta en el servidor
  const tj = tecR.find(x => !Array.from(crudo('ramirez').avisos.values()).some(f => f.datos.tec === x && ['camino', 'curso'].includes(f.datos.e)));
  const cuOf = await hacer(OF, { tipo: 'furgo', tec: tj, llevar: true }), cuOf2 = await hacer(OF, { tipo: 'furgo', tec: tj, cuenta: { [mats[0]]: 5, [mats[1]]: 2 } });
  const cliF = Object.assign(cliDe(NR), { nombre: 'Rosa', apellidos: 'Puig', tel: '633445566', dir: 'Calle de la Furgoneta 7' });
  const avF = (await hacer(OF, { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliF })).r.id;
  await hacer(OF, { tipo: 'asignar', id: avF, tec: tj });
  const pase = Object.keys(cfg.cat).find(k => !cfg.cat[k].mat && cfg.cat[k].un !== 'h');
  const em = await hacer(T(tj), { tipo: 'empezar', id: avF, pres: { lineas: [{ k: pase, q: 1 }, { k: mats[0], q: 2 }], firma: 'M1 1L20 20L40 10L60 30' } });
  const te = await hacer(T(tj), { tipo: 'terminar', id: avF, modo: 'efectivo' });
  const c1 = crudo('ramirez').cab.furgos[tj], fA = crudo('ramirez').avisos.get(avF).datos;
  es(!!tj && (cuOf.ok || cuOf.err === 'estado') && cuOf2.ok && em.ok && te.ok && c1.st[mats[0]] === 3 && c1.st[mats[1]] === 2 && fA.h.some(h => h.txt.startsWith('Descontado de la furgoneta')) && te.cambios.cab.furgos[tj].st[mats[0]] === 3,
    'al terminar, lo usado se descuenta de su furgoneta en el servidor, y la respuesta ya lo trae');
  const no = await hacer(T(t0), { tipo: 'furgo', tec: t0, llevar: false }), lN = await leer(T(t0), 0);
  es(no.ok && lN.cambios.cab.furgos[t0].on === false && lN.cambios.cab.furgos[t0].st[mats[0]] === 5, 'dejar de llevar la cuenta guarda lo último que había');
  es(repite('ramirez', NR), 'con las furgonetas, lo guardado sigue siendo igual a repetir el diario'); }

/* ---- «Voy», solo cuando toca: con cita, desde media hora antes de la franja, con el reloj del servidor (16-11) ---- */
{ reloj.t = Date.parse('2026-11-23T10:00:00+01:00');   // un lunes; la cita, el martes a primera hora
  const libres = tecR.filter(x => ![...crudo('ramirez').avisos.values()].some(f => f.datos.tec === x && ['camino', 'curso'].includes(f.datos.e)));
  const cliH = Object.assign(cliDe(NR), { nombre: 'Hora', apellidos: 'Del Servidor', tel: '644556677', dir: 'Calle del Reloj 3' });
  const p = await hacer(OF, { tipo: 'pedir', av: NR.averias[0].id, origen: 'llamada', cli: cliH, cita: { dia: '2026-11-24', fr: 'f1' } });
  let tv = null; for (const x of libres) if ((await hacer(OF, { tipo: 'asignar', id: p.r.id, tec: x })).ok) { tv = x; break; }
  reloj.t = Date.parse('2026-11-24T07:29:00+01:00'); const pronto = await hacer(T(tv), { tipo: 'voy', id: p.r.id });
  const sigue = crudo('ramirez').avisos.get(p.r.id).datos.e;
  reloj.t = Date.parse('2026-11-24T07:30:00+01:00'); const ya = await hacer(T(tv), { tipo: 'voy', id: p.r.id });
  es(p.ok && !!tv && pronto.ok === false && pronto.err === 'pronto' && sigue === 'asignado' && ya.ok && crudo('ramirez').avisos.get(p.r.id).datos.e === 'camino',
    `el servidor no deja decir «Voy» a las 7:29 de una cita de las 8:00 y sí a las 7:30, con su reloj ${JSON.stringify({ p: p.ok, tv, pronto, sigue, ya: ya.ok || ya.err })}`);
  es(repite('ramirez', NR), 'lo guardado sigue siendo igual a repetir el diario'); }

/* ---- el equipo y sus accesos: la oficina o el dueño dan códigos nuevos y quitan accesos desde la app ---- */
{ const { codigoPersona, manda } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
  const eq = (quien, mas) => J.atiende(Object.assign({ que: 'equipo' }, quien, mas));
  const jefe = NR.tecnicos.find(t => t.jefe).id, otro = NR.tecnicos.find(t => !t.jefe).id;
  es(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/.test(codigoPersona()) && !/[ilo01]/.test(codigoPersona()), 'el código de una persona: 16 letras en cuatro grupos, sin letras que se confundan');
  es(manda(K.cfgDe(NR), { rol: 'centralita', id: 'oficina' }) && manda(K.cfgDe(NR), { rol: 'tecnico', id: jefe }) && !manda(K.cfgDe(NR), { rol: 'tecnico', id: otro }), 'llevan el equipo la oficina y el técnico que es el dueño; los demás técnicos, no');
  const v0 = await eq(OF);
  es(v0.ok && v0.yo === 'oficina' && v0.equipo[0].persona === 'oficina' && v0.equipo.filter(x => x.rol === 'tecnico' && !x.fuera).length === NR.tecnicos.length
    && v0.equipo.every(x => !('codigo' in x)) && !JSON.stringify(v0).includes('codigo-') && v0.equipo.find(x => x.persona === 'fantasma').fuera === true, 'la oficina ve su equipo, quién puede entrar y quién ya no está en los datos, sin ningún código');
  es((await eq(T(otro))).err === 'permiso' && (await eq(T(otro), { hace: 'baja', a: jefe })).err === 'permiso', 'un técnico que no es el dueño no ve ni toca el equipo');
  es((await eq(T(jefe))).ok, 'el dueño, aunque entre como técnico, sí');
  // un código nuevo: el de antes deja de valer, el nuevo entra, y se apunta quién lo dio
  const c1 = await eq(OF, { hace: 'codigo', a: otro });
  const viejo = await J.atiende(Object.assign({ que: 'entrar' }, T(otro))), nuevo = await J.atiende({ que: 'entrar', negocio: 'ramirez', persona: otro, codigo: c1.codigo });
  es(c1.ok && /^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/.test(c1.codigo) && c1.tuyo === false && !viejo.ok && nuevo.ok && nuevo.id === otro, 'código nuevo: el de antes ya no entra y el nuevo sí');
  const v1 = await eq(OF);
  es(v1.accesos[0] && v1.accesos[0].que === 'codigo' && v1.accesos[0].a === otro && v1.accesos[0].quien === 'oficina' && !JSON.stringify(v1).includes(c1.codigo), 'queda apuntado quién lo dio y a quién, y el código no vuelve a salir');
  // quitar el acceso: ya no entra; a sí mismo no; si es el único que manda, tampoco
  const b1 = await eq(T(jefe), { hace: 'baja', a: otro });
  es(b1.ok && !(await J.atiende({ que: 'entrar', negocio: 'ramirez', persona: otro, codigo: c1.codigo })).ok && (await eq(OF)).equipo.find(x => x.persona === otro).estado === 'baja', 'quitar el acceso: ya no entra y se ve quitado');
  es((await eq(T(jefe), { hace: 'baja', a: otro })).ya === true, 'quitárselo otra vez no hace nada');
  es((await eq(OF, { hace: 'baja', a: 'oficina' })).err === 'tuyo', 'nadie se quita el acceso a sí mismo');
  const b2 = await eq(OF, { hace: 'baja', a: jefe });
  es(b2.ok && (await eq(T(jefe))).err === 'clave', 'la oficina puede quitárselo al dueño, y el dueño ya no entra');
  // ahora solo manda la oficina: no puede dejar el negocio sin nadie que mande (ni siquiera a través de otro)
  const c2 = await eq(OF, { hace: 'codigo', a: jefe }), dueño = { negocio: 'ramirez', persona: jefe, codigo: c2.codigo };
  es(c2.ok && (await eq(dueño)).ok, 'devolverle el acceso con un código nuevo: vuelve a entrar');
  es((await eq(dueño, { hace: 'baja', a: 'oficina' })).ok && (await eq(dueño, { hace: 'baja', a: jefe })).err === 'tuyo', 'el dueño quita el acceso a la oficina, pero no a sí mismo');
  const c3 = await eq(dueño, { hace: 'codigo', a: 'oficina' }), OF2 = { negocio: 'ramirez', persona: 'oficina', codigo: c3.codigo };
  es(c3.ok && (await eq(OF2)).ok && (await eq(OF2, { hace: 'baja', a: jefe })).ok && (await eq(OF2, { hace: 'baja', a: 'oficina' })).err === 'tuyo', 'la oficina vuelve con su código nuevo');
  // el propio código: sale con «tuyo» para que la app se lo guarde
  const c4 = await eq(OF2, { hace: 'codigo', a: 'oficina' });
  es(c4.ok && c4.tuyo === true && !(await eq(OF2)).ok && (await eq({ negocio: 'ramirez', persona: 'oficina', codigo: c4.codigo })).ok, 'cambiar el propio código: sale marcado como suyo y el de antes deja de valer');
  const OF3 = { negocio: 'ramirez', persona: 'oficina', codigo: c4.codigo };
  // a quien no está en los datos no se le da código (sí se le puede quitar); peticiones raras; el tope
  es((await eq(OF3, { hace: 'codigo', a: 'fantasma' })).err === 'nadie' && (await eq(OF3, { hace: 'baja', a: 'fantasma' })).ok, 'a quien ya no está en los datos se le puede quitar el acceso, pero no dar un código');
  es((await eq(OF3, { hace: 'codigo', a: 'nadie-asi' })).err === 'nadie' && (await eq(OF3, { hace: 'borrar', a: otro })).err === 'peticion' && (await eq(OF3, { hace: 'codigo' })).err === 'peticion', 'a quien no existe, o con algo que no se puede hacer: no');
  es((await eq(OF3, { hace: 'baja', a: 'ines' })).err === 'nadie' && (await eq(OF3, { hace: 'codigo', a: 'pau' })).err === 'nadie', 'la oficina de un negocio no llega a las personas de otro');
  let tope = null; for (let i = 0; i < 40 && !tope; i++) { const r = await eq(OF3, { hace: 'codigo', a: otro }); if (!r.ok) tope = r.err; }
  es(tope === 'limite', 'como mucho 30 cambios de acceso al día por negocio');
  es(repite('ramirez', NR), 'los accesos no tocan el diario: lo guardado sigue siendo igual a repetirlo'); }

console.log(`${mal ? 'MAL' : 'BIEN'}: ${ok} comprobaciones pasan${mal ? ', ' + mal + ' fallan' : ''}.`);
process.exit(mal ? 1 : 0);
