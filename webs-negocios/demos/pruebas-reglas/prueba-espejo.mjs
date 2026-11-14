// El espejo (js/oficio-espejo.js): lo que cada aparato sabe del servidor y lo que ha hecho sin confirmar.
// Ejemplos escritos a mano, con el juez de verdad y un almacén de mentira. Sin navegador y sin red.
// Uso: node prueba-espejo.mjs <carpeta del sitio>
//      OFICIOS_SERVIDOR=<carpeta del juez>   OFICIOS_ESPEJO=<archivo>  para probar otra copia del espejo (lo usa mutantes-espejo.mjs)
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leeNucleo, leeNegocio } from './valida-negocio.mjs';

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url)), sitio = process.argv[2];
if (!sitio) { console.log('Uso: node prueba-espejo.mjs <carpeta del sitio>'); process.exit(2); }
const DIR = path.resolve(process.env.OFICIOS_SERVIDOR || [path.join(aqui, '../../oficios-servidor'), path.join(aqui, '../../servidor')].find(d => { try { require.resolve(path.join(d, 'juez.mjs')); return true; } catch (e) { return false; } }) || path.join(aqui, '../../oficios-servidor'));
const { crea } = await import(pathToFileURL(path.join(DIR, 'juez.mjs')).href);
const { creaAlmacen } = await import(pathToFileURL(path.join(DIR, 'almacen-memoria.mjs')).href);
const K = leeNucleo(sitio), NV = leeNegocio(path.join(aqui, 'negocios/voltio.js')).N, cfg = K.cfgDe(NV);
const rutaEspejo = path.resolve(process.env.OFICIOS_ESPEJO || path.join(sitio, 'js/oficio-espejo.js'));
delete require.cache[rutaEspejo]; require(rutaEspejo);
const E = globalThis.OficioEspejo;
let ok = 0, mal = 0;
setTimeout(() => { console.log('  MAL  la prueba se ha quedado esperando una respuesta que no llega'); process.exit(1); }, 20000).unref();
const es = (c, t) => { if (c) ok++; else { mal++; console.log('  MAL  ' + t); } };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b), copia = x => JSON.parse(JSON.stringify(x));

/* un martes laborable a media mañana; cada llamada al reloj del juez avanza un segundo */
const reloj = { t: Date.parse('2026-11-17T10:30:00+01:00') };
const A = creaAlmacen({ ahora: () => reloj.t });
const J = crea({ K, almacen: A, ahora: () => (reloj.t += 1000) });
A.alta('voltio', NV, K.ESQ); A.persona('voltio', 'oficina', 'centralita', 'oficina', 'cod-oficina');
NV.tecnicos.forEach(t => A.persona('voltio', t.id, 'tecnico', t.id, 'cod-' + t.id));
const T1 = NV.tecnicos[0].id, T2 = NV.tecnicos[1].id;
let nm = 0;
const aparato = (persona, rol) => ({ persona, codigo: 'cod-' + persona, E: E.crea({ K, cfg, quien: { rol, id: persona }, ahora: () => reloj.t, marca: () => 'marca-de-prueba-' + String(++nm).padStart(4, '0') }) });
const con = (d, p) => Object.assign({ negocio: 'voltio', persona: d.persona, codigo: d.codigo }, p);
/* manda lo siguiente de la cola. fallo: 'ida' (no llega), 'vuelta' (llega, pero la respuesta se pierde) o nada */
async function envia(d, fallo) {
  const p = d.E.siguiente(); if (!p) return { tipo: 'vacia' };
  let res = { ok: false, err: 'red' };
  if (fallo !== 'ida') { const r = await J.atiende(con(d, { que: 'hacer', accion: p.accion, clave: p.clave, desde: p.desde })); if (fallo !== 'vuelta') res = r; }
  return d.E.respuesta(p.clave, res);
}
const lee = async d => { const r = await J.atiende(con(d, { que: 'leer', desde: d.E.v() })); return r.ok ? d.E.llega(r.cambios) : false; };
const diario = () => A.crudo('voltio').diario, enDiario = tipo => diario().filter(x => x.accion.tipo === tipo).length;
const cli = (n) => ({ nombre: 'Cliente ' + n, apellidos: 'Prueba ' + n, tel: '61234567' + n, dir: 'Calle de la Prueba ' + n, cp: Object.keys(NV.zonas.cp)[0] });
const av = NV.averias[0].id, de = (d, id) => d.E.estado().avisos.find(a => a.id === id);

const OF = aparato('oficina', 'centralita'), P1 = aparato(T1, 'tecnico'), P2 = aparato(T2, 'tecnico');

// 1. recién creado
es(igual(OF.E.estado(), Object.assign(K.nuevo(), { nu: 0 })) || (OF.E.estado().avisos.length === 0 && OF.E.estado().esq === K.ESQ), 'el espejo empieza vacío y con el esquema de las reglas');
es(OF.E.siguiente() === null && OF.E.pendientes() === 0 && OF.E.v() === 0, 'sin nada que mandar');

// 2. crear un aviso espera al servidor: el número lo pone él
{ let r = null; const p = OF.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(1) }).then(x => { r = x; });
  await Promise.resolve(); es(r === null && OF.E.enCola() === 1 && OF.E.pendientes() === 0 && OF.E.estado().avisos.length === 0, 'crear no adelanta nada: espera la respuesta');
  const x = await envia(OF); await p;
  es(x.tipo === 'hecha' && r && r.ok && r.id === NV.serie + '-0001', 'al contestar el servidor, llega el número que él ha puesto');
  es(OF.E.estado().avisos.length === 1 && OF.E.v() === 1 && /^[a-z2-9]{24}$/.test(de(OF, r.id).llave), 'y el aviso está en el espejo, con su llave');
}
const ID = NV.serie + '-0001';
// 3. lo que las reglas no aceptan no sale del aparato
{ const r = await OF.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: Object.assign(cli(2), { tel: '12' }) });
  es(!r.ok && r.err === 'tel' && OF.E.enCola() === 0 && enDiario('pedir') === 1, 'un aviso mal rellenado se rechaza aquí mismo, sin llamar al servidor');
  es(igual(OF.E.hacer({ tipo: 'pedir', av, cli: cli(2) }), { ok: false, err: 'espera' }) && OF.E.enCola() === 0, 'lo que crea algo no pasa por «hacer»');
  const m = OF.E.hacer({ tipo: 'asignar', id: 'NO-EXISTE', tec: T1 }); es(!m.ok && OF.E.pendientes() === 0 && OF.E.estado().avisos.length === 1, 'una acción que las reglas rechazan no se pone a la cola');
}
// 4. una acción normal se ve al momento y se confirma después
{ const r = OF.E.hacer({ tipo: 'asignar', id: ID, tec: T2 });
  es(r.ok && de(OF, ID).e === 'asignado' && de(OF, ID).tec === T2, 'asignar se ve al momento');
  es(OF.E.pendientes() === 1 && OF.E.v() === 1 && A.crudo('voltio').v === 1, 'y todavía no ha llegado al servidor');
  const x = await envia(OF);
  es(x.tipo === 'hecha' && OF.E.pendientes() === 0 && OF.E.v() === 2 && de(OF, ID).tec === T2, 'cuando llega, queda confirmado y nada por enviar');
  es(igual(de(OF, ID), A.crudo('voltio').avisos.get(ID).datos), 'lo que se ve es, letra por letra, lo del servidor');
}
// 5. cada uno, lo suyo
{ await lee(P1); await lee(P2);
  es(P2.E.estado().avisos.length === 1 && de(P2, ID).tec === T2, 'el técnico que lo lleva lo recibe');
  es(P1.E.estado().avisos.length === 0, 'el otro técnico no recibe nada');
  es(P2.E.estado().ausencias.length === 0 && (P2.E.estado().n || 0) === 0, 'un técnico no recibe los contadores de la oficina');
}
// 6. sin cobertura: se ve hecho, se guarda en la cola y sale cuando vuelve la red
{ const r = P2.E.hacer({ tipo: 'voy', id: ID });
  es(r.ok && de(P2, ID).e === 'camino', '«Voy» sin cobertura: se ve al momento');
  const x = await envia(P2, 'ida');
  es(x.tipo === 'reintenta' && P2.E.pendientes() === 1 && de(P2, ID).e === 'camino' && enDiario('voy') === 0, 'si no llega, sigue en la cola y en pantalla');
  const y = await envia(P2);
  es(y.tipo === 'hecha' && P2.E.pendientes() === 0 && enDiario('voy') === 1, 'al volver la red sale, una sola vez');
}
// 7. la respuesta se pierde: el servidor ya lo hizo y no lo hace dos veces
{ P2.E.hacer({ tipo: 'anotar', id: ID, obs: 'Portal B, timbre roto' });
  const x = await envia(P2, 'vuelta');
  es(x.tipo === 'reintenta' && enDiario('anotar') === 1 && P2.E.pendientes() === 1, 'el servidor lo hizo, pero el aparato no lo sabe y lo guarda para repetir');
  const y = await envia(P2);
  es(y.tipo === 'hecha' && enDiario('anotar') === 1 && P2.E.pendientes() === 0, 'lo repite con la misma marca y el servidor no lo hace dos veces');
  es(de(P2, ID).obs === 'Portal B, timbre roto' && igual(de(P2, ID), A.crudo('voltio').avisos.get(ID).datos), 'y acaba igual que el servidor');
}
// 8. dos acciones seguidas sin cobertura, la segunda solo vale si la primera está hecha
{ const pres = { lineas: [{ k: Object.keys(cfg.cat)[0], q: 1 }], firma: 'M1 1L20 20L40 10L60 30L80 12L100 40' };
  es(!P2.E.hacer({ tipo: 'pausa', id: ID }).ok && P2.E.pendientes() === 0, 'una pausa antes de empezar no vale');
  const a = P2.E.hacer({ tipo: 'empezar', id: ID, pres }), b = P2.E.hacer({ tipo: 'pausa', id: ID });
  es(a.ok && b.ok && b.pausa === true && P2.E.pendientes() === 2 && de(P2, ID).e === 'curso' && A.crudo('voltio').avisos.get(ID).datos.e === 'camino', 'empezar y hacer una pausa sin cobertura: se ven hechas las dos');
  /* mientras siguen sin salir, llega un cambio de la oficina: lo adelantado se vuelve a poner encima, en su orden */
  await lee(OF); es(OF.E.hacer({ tipo: 'anotar', id: ID, obs: 'Llamar antes de subir' }).ok, 'la oficina apunta algo en ese aviso'); await envia(OF); await lee(P2);
  es(P2.E.pendientes() === 2 && de(P2, ID).e === 'curso' && K.enPausa(de(P2, ID)) && de(P2, ID).obs === 'Llamar antes de subir' && P2.E.caidas().length === 0, 'llega un cambio de la oficina y lo adelantado sigue encima, en su orden');
  await envia(P2, 'ida'); await envia(P2); await envia(P2);
  es(P2.E.pendientes() === 0 && A.crudo('voltio').avisos.get(ID).datos.e === 'curso' && igual(de(P2, ID), A.crudo('voltio').avisos.get(ID).datos), 'salen en orden y el servidor acaba igual');
  es(igual(diario().slice(-2).map(x => x.accion.tipo), ['empezar', 'pausa']), 'en el diario quedan en el orden en que se hicieron');
}
// 9. el servidor dice que no: lo adelantado se deshace y se avisa
let ID2 = '';
{ const r = await (async () => { const p = OF.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(3) }); await envia(OF); return p; })(); ID2 = r.id;
  OF.E.hacer({ tipo: 'asignar', id: ID2, tec: T1 }); await envia(OF); await lee(P1);
  es(de(P1, ID2) && de(P1, ID2).e === 'asignado', 'el primer técnico recibe su aviso');
  /* la oficina lo cambia de técnico mientras el primero, sin cobertura, pulsa «Voy» y apunta algo */
  OF.E.hacer({ tipo: 'asignar', id: ID2, tec: T2 }); await envia(OF);
  const v1 = P1.E.hacer({ tipo: 'voy', id: ID2 }), v2 = P1.E.hacer({ tipo: 'anotar', id: ID2, obs: 'Voy para allá' });
  es(v1.ok && v2.ok && de(P1, ID2).e === 'camino' && P1.E.pendientes() === 2, 'sin saberlo, el primero sigue viéndolo suyo');
  const x = await envia(P1);
  es(x.tipo === 'rechazada' && x.err === 'permiso' && x.accion.tipo === 'voy', 'el servidor rechaza el «Voy» y dice por qué');
  es(!de(P1, ID2) && P1.E.pendientes() === 1, 'el aviso desaparece de su móvil: ya no es suyo');
  es(P1.E.caidas().length === 1 && P1.E.caidas()[0].accion.tipo === 'anotar', 'lo que venía detrás ya no se sostiene');
  const y = await envia(P1);
  es(y.tipo === 'rechazada' && P1.E.pendientes() === 0 && enDiario('voy') === 1, 'y también se rechaza: no queda nada colgado ni se ha guardado nada suyo');
  es(A.crudo('voltio').avisos.get(ID2).datos.tec === T2 && A.crudo('voltio').avisos.get(ID2).datos.e === 'asignado', 'en el servidor manda lo que hizo la oficina');
}
// 10. de la posición solo sale la última
if (cfg.mapa || true) {
  const N2 = Object.assign({}, NV, { mapa: {} }), cfg2 = K.cfgDe(N2);
  const A2 = creaAlmacen({ ahora: () => reloj.t }), J2 = crea({ K, almacen: A2, ahora: () => (reloj.t += 1000) });
  A2.alta('voltio', N2, K.ESQ); A2.persona('voltio', 'oficina', 'centralita', 'oficina', 'c-o'); A2.persona('voltio', T1, 'tecnico', T1, 'c-t');
  const o = { persona: 'oficina', codigo: 'c-o', E: E.crea({ K, cfg: cfg2, quien: { rol: 'centralita', id: 'oficina' }, ahora: () => reloj.t }) };
  const t = { persona: T1, codigo: 'c-t', E: E.crea({ K, cfg: cfg2, quien: { rol: 'tecnico', id: T1 }, ahora: () => reloj.t }) };
  const va = async (d, fallo) => { const p = d.E.siguiente(); if (!p) return null; const r = fallo ? { ok: false, err: 'red' } : await J2.atiende({ que: 'hacer', negocio: 'voltio', persona: d.persona, codigo: d.codigo, accion: p.accion, clave: p.clave, desde: p.desde }); return d.E.respuesta(p.clave, r); };
  const pr = o.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(4) }); await va(o); const id = (await pr).id;
  o.E.hacer({ tipo: 'asignar', id, tec: T1 }); await va(o);
  t.E.llega((await J2.atiende({ que: 'leer', negocio: 'voltio', persona: T1, codigo: 'c-t', desde: 0 })).cambios);
  t.E.hacer({ tipo: 'voy', id }); await va(t);
  const p1 = t.E.hacer({ tipo: 'posicion', id, lat: 39.47, lon: -0.37 }), p2 = t.E.hacer({ tipo: 'posicion', id, lat: 39.471, lon: -0.371 }), p3 = t.E.hacer({ tipo: 'posicion', id, lat: 39.472, lon: -0.372 });
  es(p1.ok && p2.ok && p3.ok && t.E.pendientes() === 1, 'tres posiciones sin cobertura ocupan un solo sitio en la cola');
  es(t.E.estado().avisos[0].pos && t.E.estado().avisos[0].pos.lat === 39.472, 'y en pantalla está la última');
  const sig = t.E.siguiente(); t.E.hacer({ tipo: 'posicion', id, lat: 39.473, lon: -0.373 });
  es(sig.accion.lat === 39.472 && t.E.pendientes() === 2, 'la que ya ha salido no se toca: la nueva va detrás');
  t.E.respuesta(sig.clave, await J2.atiende({ que: 'hacer', negocio: 'voltio', persona: T1, codigo: 'c-t', accion: sig.accion, clave: sig.clave, desde: sig.desde })); await va(t);
  es(t.E.pendientes() === 0 && A2.crudo('voltio').avisos.get(id).datos.pos.lat === 39.473 && A2.crudo('voltio').diario.filter(x => x.accion.tipo === 'posicion').length === 2, 'al servidor llegan dos, no cuatro');
}
// 11. el código deja de valer: no se pierde lo hecho
{ P2.E.hacer({ tipo: 'anotar', id: ID, obs: 'Falta una pieza' });
  A.crudo('voltio').personas.get(T2).codigo = 'otro-codigo';
  const x = await envia(P2);
  es(x.tipo === 'sesion' && x.err === 'clave' && P2.E.pendientes() === 1 && de(P2, ID).obs === 'Falta una pieza', 'con el código retirado, lo hecho se queda guardado en el aparato');
  A.crudo('voltio').personas.get(T2).codigo = 'cod-' + T2;
  const y = await envia(P2); es(y.tipo === 'hecha' && P2.E.pendientes() === 0, 'y sale cuando vuelve a entrar');
}
// 12. cerrar y abrir la app: la cola y lo último que se vio siguen ahí
{ P2.E.hacer({ tipo: 'anotar', id: ID, obs: 'Vuelvo mañana con la pieza' });
  const g = copia(P2.E.guardado()), Q = aparato(T2, 'tecnico');
  es(Q.E.carga(g) && Q.E.pendientes() === 1 && de(Q, ID).obs === 'Vuelvo mañana con la pieza' && Q.E.v() === P2.E.v(), 'al abrir de nuevo, se ve lo mismo y con lo mismo por enviar');
  const sv = P2.E.siguiente(); await J.atiende(con(P2, { que: 'hacer', accion: sv.accion, clave: sv.clave, desde: sv.desde }));   /* la app vieja llegó a mandarlo antes de cerrarse */
  const antes = enDiario('anotar'), y = await envia(Q);
  es(y.tipo === 'hecha' && enDiario('anotar') === antes && Q.E.pendientes() === 0, 'si ya había salido antes de cerrarse, no se repite');
  es(!aparato(T1, 'tecnico').E.carga(g), 'lo guardado de una persona no lo carga otra');
  es(!aparato(T2, 'tecnico').E.carga(Object.assign(copia(g), { B: Object.assign(copia(g.B), { esq: K.ESQ + 1 }) })), 'ni se carga lo de otra versión de la app');
  es(!aparato(T2, 'tecnico').E.carga(null) && !aparato(T2, 'tecnico').E.carga({ f: 1 }) && !aparato(T2, 'tecnico').E.carga('x'), 'ni nada que no tenga forma');
  P2.E.respuesta(sv.clave, { ok: false, err: 'red' }); await envia(P2);
}
// 13. las fotos no se guardan en el aparato, pero siguen en la memoria
{ const X = aparato('oficina', 'centralita'); X.E.llega({ v: 1, entero: true, cab: { esq: K.ESQ, n: 1, nu: 0, ausencias: [] }, avisos: [{ id: 'F-1', v: 1, datos: { id: 'F-1', n: 1, e: 'nuevo', foto: 'data:image/jpeg;base64,AAAA', fotos: ['data:image/jpeg;base64,BBBB'] } }] });
  es(X.E.estado().avisos[0].foto.length > 10 && X.E.guardado().B.avisos[0].foto === '' && X.E.guardado().B.avisos[0].fotos.length === 0 && X.E.estado().avisos[0].fotos.length === 1, 'las fotos se quedan en la memoria y no ocupan sitio en el aparato');
}
// 14. respuestas viejas y respuestas enteras
{ const B = Object.assign(K.nuevo(), { v: 5, avisos: [{ id: 'A', n: 1, x: 'nuevo' }] }), ver = { A: 5 };
  es(!E.mezcla(B, ver, { v: 3, entero: false, cab: {}, avisos: [{ id: 'A', v: 3, datos: { id: 'A', n: 1, x: 'viejo' } }] }) && B.avisos[0].x === 'nuevo' && B.v === 5, 'una respuesta más vieja que lo que hay no pisa nada');
  es(E.mezcla(B, ver, { v: 7, entero: false, cab: {}, avisos: [{ id: 'A', v: 4, datos: { id: 'A', n: 1, x: 'viejo' } }, { id: 'B', v: 7, datos: { id: 'B', n: 2 } }] }) && B.avisos[0].x === 'nuevo' && B.avisos.length === 2 && B.v === 7, 'ni un aviso suelto más viejo que el que se tiene');
  es(E.mezcla(B, ver, { v: 2, entero: true, cab: { esq: K.ESQ, n: 9, nu: 2, ausencias: [{ id: 'U2' }] }, avisos: [{ id: 'C', v: 2, datos: { id: 'C', n: 9 } }] }) && B.avisos.length === 1 && B.avisos[0].id === 'C' && B.v === 2 && B.n === 9 && B.nu === 2 && B.ausencias.length === 1 && !('A' in ver), 'una respuesta entera sustituye todo, aunque la versión baje');
  es(E.mezcla(B, ver, { v: 3, entero: false, cab: { esq: K.ESQ }, avisos: [{ id: 'C', v: 3, fuera: true }] }) && B.avisos.length === 0 && B.n === 9, '«ya no es tuyo» lo quita, y sin contadores en la respuesta se conservan los que había');
  es(!E.mezcla(B, ver, null) && !E.mezcla(B, ver, { v: 'x', avisos: [] }) && !E.mezcla(B, ver, { v: 4 }) && E.mezcla(B, ver, { v: 4, avisos: [null, { id: 3 }, { id: 'Z', v: 4, datos: { id: 'OTRO' } }] }) && B.avisos.length === 0, 'lo que no tiene forma no entra');
}
// 15. el servidor falla una y otra vez con lo mismo: no atasca la cola para siempre
{ const X = aparato('oficina', 'centralita'); await lee(X); X.E.hacer({ tipo: 'anotar', id: ID, obs: 'uno' }); X.E.hacer({ tipo: 'anotar', id: ID, obs: 'dos' });
  let r = null, n = 0; do { const p = X.E.siguiente(); r = X.E.respuesta(p.clave, { ok: false, err: 'servidor' }); n++; } while (r.tipo === 'reintenta' && n < 20);
  es(r.tipo === 'rechazada' && n === 6 && X.E.pendientes() === 1, 'tras seis fallos seguidos del servidor con la misma acción, se aparta y se avisa');
  let m = 0; for (let i = 0; i < 30; i++) { const p = X.E.siguiente(); if (X.E.respuesta(p.clave, { ok: false, err: 'red' }).tipo !== 'reintenta') m++; }
  es(m === 0 && X.E.pendientes() === 1, 'sin red, en cambio, espera lo que haga falta');
  const p = X.E.siguiente(); es(X.E.respuesta('otra-marca-cualquiera', { ok: true }).tipo === 'nada' && X.E.pendientes() === 1, 'una respuesta que no es de lo que se mandó no hace nada');
  X.E.respuesta(p.clave, { ok: false, err: 'red' });
}
// 16. crear sin red: no se queda en la cola; repetido con la misma marca no crea dos
{ const a = { tipo: 'pedir', av, origen: 'llamada', cli: cli(5) }, antes = enDiario('pedir');
  let r1 = null; OF.E.crear(a, 'marca-del-formulario-0001').then(x => { r1 = x; }); await envia(OF, 'vuelta'); await Promise.resolve(); await Promise.resolve();
  es(r1 && !r1.ok && r1.err === 'red' && r1.duda === true && OF.E.enCola() === 0 && enDiario('pedir') === antes + 1, 'la respuesta se pierde: el aparato dice que no sabe si llegó y no deja nada colgado');
  let r2 = null; const p2 = OF.E.crear(a, 'marca-del-formulario-0001').then(x => { r2 = x; }); await envia(OF); await p2;
  es(r2 && r2.ok && r2.id && enDiario('pedir') === antes + 1 && OF.E.estado().avisos.filter(x => x.cli.nombre === 'Cliente 5').length === 1, 'al repetirlo igual, llega el número del que ya se creó: un solo aviso');
}
// 16 bis. quien espera una creación se cansa: se retira si no ha salido; si ya ha salido, no
{ const X = aparato('oficina', 'centralita'); await lee(X); let r = null, r2 = null;
  X.E.hacer({ tipo: 'anotar', id: ID, obs: 'por delante' }); X.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(8) }, 'marca-que-se-retira-01').then(x => { r = x; });
  await envia(X, 'ida'); es(X.E.quita('marca-que-se-retira-01') === true, 'una creación que aún no ha salido se puede retirar'); await Promise.resolve();
  es(r && !r.ok && r.err === 'red' && !r.duda && X.E.enCola() === 1 && X.E.pendientes() === 1, 'se contesta «sin red» y lo demás sigue en la cola');
  await envia(X); const antes = enDiario('pedir');
  X.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(8) }, 'marca-que-ya-ha-salido-1').then(x => { r2 = x; }); const p = X.E.siguiente();
  es(X.E.quita('marca-que-ya-ha-salido-1') === false && X.E.quita('no-existe') === false && X.E.enCola() === 1, 'la que ya ha salido no se retira: hay que esperar la respuesta');
  X.E.respuesta(p.clave, await J.atiende(con(X, { que: 'hacer', accion: p.accion, clave: p.clave, desde: p.desde }))); await Promise.resolve();
  es(r2 && r2.ok && enDiario('pedir') === antes + 1, 'y la respuesta llega');
}
// 17. dos oficinas a la vez: cada aviso con su número
{ const O2 = aparato('oficina', 'centralita'); await lee(O2);
  const pa = OF.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(6) }), pb = O2.E.crear({ tipo: 'pedir', av, origen: 'llamada', cli: cli(7) });
  await envia(O2); await envia(OF); const ra = await pa, rb = await pb;
  es(ra.ok && rb.ok && ra.id !== rb.id, 'dos oficinas que crean a la vez reciben números distintos');
  await lee(O2); await lee(OF);
  es(igual(OF.E.estado().avisos, O2.E.estado().avisos) && igual(OF.E.estado().avisos, [...A.crudo('voltio').avisos.values()].map(f => f.datos).sort((x, y) => x.n - y.n)), 'y las dos acaban viendo lo mismo que el servidor');
}
// 18. una ausencia: también espera al servidor y trae lo que suelta
{ const hoy = K.madrid(reloj.t).date; let r = null;
  const p = OF.E.crear({ tipo: 'ausencia', tec: T2, de: hoy, a: hoy, motivo: 'médico' }).then(x => { r = x; }); await envia(OF); await p;
  es(r && r.ok && Array.isArray(r.sueltos) && OF.E.estado().ausencias.length === 1 && OF.E.estado().ausencias[0].tec === T2, 'la ausencia queda apuntada con lo que dice el servidor');
  const q = OF.E.hacer({ tipo: 'quitarAusencia', aus: OF.E.estado().ausencias[0].id }); await envia(OF);
  es(q.ok && OF.E.estado().ausencias.length === 0 && A.crudo('voltio').cab.ausencias.length === 0, 'y quitarla sí se adelanta, porque ya tiene su número');
}
// 19. varias pestañas: nadie pisa lo que otra tiene por enviar
{ const q = { rol: 'tecnico', id: T2 }, base = v => Object.assign(K.nuevo(), { v });
  const viejo = { f: 1, quien: q, B: base(4), ver: { a: 4 }, cola: [{ clave: 'x', accion: { tipo: 'anotar' }, t: 20 }, { clave: 'h', accion: { tipo: 'anotar' }, t: 5 }], hechas: ['z'] };
  const mio = { f: 1, quien: q, B: base(3), ver: {}, cola: [{ clave: 'y', accion: { tipo: 'voy' }, t: 10 }], hechas: ['h'] };
  const j = E.junta(viejo, mio);
  es(igual(j.cola.map(p => p.clave), ['y', 'x']) && j.hechas.includes('z') && j.hechas.includes('h'), 'se juntan las dos colas, por orden, sin lo que ya está hecho');
  es(j.B.v === 4 && j.ver.a === 4, 'y se queda la base más nueva');
  es(E.junta(Object.assign({}, viejo, { quien: { rol: 'tecnico', id: T1 } }), mio) === mio && E.junta(null, mio) === mio && E.junta({ f: 2 }, mio) === mio, 'lo guardado por otra persona no se mezcla');
  const X = aparato(T2, 'tecnico'); await lee(X); X.E.hacer({ tipo: 'anotar', id: ID, obs: 'tres' }); const g = X.E.guardado();
  es(X.E.yaHechas([g.cola[0].clave]) === 1 && X.E.pendientes() === 0 && de(X, ID).obs !== 'tres', 'lo que otra pestaña ya envió sale de la cola');
}
// 20. al final, todos iguales que el servidor
{ for (const d of [OF, P1, P2]) { let n = 0; while (d.E.enCola() && n++ < 10) await envia(d); await lee(d); }
  const todo = [...A.crudo('voltio').avisos.values()].map(f => f.datos).sort((x, y) => x.n - y.n);
  es(igual(OF.E.estado().avisos, todo), 'la oficina acaba con todos los avisos, iguales que en el servidor');
  es(igual(P1.E.estado().avisos, todo.filter(a => a.tec === T1)) && igual(P2.E.estado().avisos, todo.filter(a => a.tec === T2)), 'y cada técnico, con los suyos y nada más');
  es(new Set(diario().map(x => x.clave).filter(Boolean)).size === diario().filter(x => x.clave).length, 'ninguna acción está dos veces en el diario');
}

console.log((mal ? 'FALLAN ' + mal + ' de ' : 'Bien: ') + (ok + mal) + ' comprobaciones del espejo (lo que guarda cada aparato y cómo se pone de acuerdo con el servidor).');
process.exit(mal ? 1 : 0);
