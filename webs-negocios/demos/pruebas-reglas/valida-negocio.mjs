// Valida el archivo de datos de un negocio (js/oficio-datos.js o cualquier copia para otro negocio).
// Dice, en castellano, qué falta o no cuadra antes de que el fallo llegue a un cliente.
// Uso:  node valida-negocio.mjs <carpeta del sitio> <datos.js> [<otro-datos.js> ...] [--hoy AAAA-MM-DD]
//       (el núcleo se lee de <carpeta del sitio>/js/oficio-nucleo.js)
// Sale con error (1) si algún archivo tiene errores. Los «avisos» no paran nada: son cosas a mirar.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ID = /^[a-z][a-z0-9_-]{0,23}$/, FECHA = /^\d{4}-\d{2}-\d{2}$/;
const CLAVES = ['id', 'serie', 'nombre', 'marca', 'razon', 'nif', 'dir', 'ciudad', 'tel', 'resenas', 'pack', 'garantiaMeses', 'sinTrabajo', 'tarifa', 'festivos', 'tecnicos', 'zonas', 'franjas', 'cupo', 'catalogo', 'averias', 'horario', 'citas'];
const esTexto = (x, min = 1, max = 200) => typeof x === 'string' && x.trim().length >= min && x.length <= max;
const esNum = x => typeof x === 'number' && Number.isFinite(x);
const esEntero = x => Number.isInteger(x);
const fechaReal = f => FECHA.test(f) && new Date(f + 'T12:00:00Z').toISOString().slice(0, 10) === f;
const dosDec = x => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;
const propio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Devuelve { errores: [...], avisos: [...] }. `K` es el núcleo (OficioNucleo) y `hoy` una fecha AAAA-MM-DD. */
export function valida(N, K, hoy) {
  const errores = [], avisos = [];
  const E = t => errores.push(t), A = t => avisos.push(t);
  if (!N || typeof N !== 'object') { E('El archivo no define OFICIO_NEGOCIO.'); return { errores, avisos } }

  // ---- quién es
  if (!ID.test(N.id || '')) E('id: tiene que ser una palabra en minúsculas, sin espacios ni acentos (ejemplo: «ramirez»).');
  if (!/^[A-Z]{1,3}$/.test(N.serie || '')) E('serie: de una a tres letras mayúsculas; es lo que va delante del número de aviso (ejemplo: «R» da R-0001).');
  if (!esTexto(N.nombre, 2, 40)) E('nombre: falta el nombre comercial (hasta 40 letras).');
  if (!Array.isArray(N.marca) || N.marca.length < 1 || N.marca.length > 2 || !N.marca.every(x => esTexto(x, 1, 24))) E('marca: una o dos palabras para el rótulo de la app (ejemplo: ["Ramírez","24 h"]).');
  if (!esTexto(N.razon, 3, 80)) E('razon: falta la razón social que sale en los papeles.');
  if (!/^([A-HJNP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(String(N.nif || '').toUpperCase())) E('nif: no tiene forma de NIF (ejemplos: B12345678, 12345678Z).');
  if (!esTexto(N.dir, 5, 120)) E('dir: falta la dirección que sale en los papeles.');
  if (!esTexto(N.ciudad, 2, 40)) E('ciudad: falta la ciudad (sale junto al código postal del cliente y en los mensajes de «ahí no llegamos»).');
  if (!K.tel9(N.tel)) E('tel: el teléfono del negocio tiene que tener 9 cifras.');
  if (!esTexto(N.resenas, 8, 200) || /\s/.test(N.resenas)) E('resenas: falta el enlace para pedir reseñas (sin espacios).');
  if (!['pro', 'asistente'].includes(N.pack)) E('pack: tiene que ser «pro» o «asistente» (desde el 13-11-2026 hay dos planes: Pro, y Pro con asistente de llamadas).');
  else if (N.pack === 'asistente') A('pack «asistente»: la app lo trata hoy igual que Pro; el asistente de llamadas todavía no está hecho.');
  if (!esEntero(N.garantiaMeses) || N.garantiaMeses < 1 || N.garantiaMeses > 60) E('garantiaMeses: un número entero de 1 a 60.');
  if (N.zona != null && N.zona !== 'Europe/Madrid') E('zona: la app solo trabaja hoy con la hora peninsular (Europe/Madrid). Canarias necesita un cambio en las reglas.');

  // ---- horario y tarifa
  const tf = N.tarifa || {};
  if (!Array.isArray(tf.dia) || tf.dia.length !== 2 || !tf.dia.every(esEntero) || tf.dia[0] < 0 || tf.dia[1] > 1440 || tf.dia[0] >= tf.dia[1]) E('tarifa.dia: dos minutos del día, [desde, hasta], con desde menor que hasta (8 a 20 h es [480, 1200]).');
  if (!esNum(tf.recargo) || tf.recargo < 0 || tf.recargo > 2) E('tarifa.recargo: el recargo de urgencia en tanto por uno (0.4 es un 40 %), entre 0 y 2.');

  // ---- festivos
  const fs = N.festivos;
  if (!Array.isArray(fs)) E('festivos: falta la lista de festivos.');
  else {
    const malos = fs.filter(f => !fechaReal(f)); if (malos.length) E('festivos: estas fechas no existen o no van como AAAA-MM-DD: ' + malos.slice(0, 5).join(', ') + '.');
    if (new Set(fs).size !== fs.length) E('festivos: hay fechas repetidas.');
    if (fs.some((f, i) => i && f < fs[i - 1])) E('festivos: tienen que ir en orden, de la más antigua a la más nueva.');
    const buenos = fs.filter(fechaReal).sort(), ultimo = buenos[buenos.length - 1];
    if (!ultimo) E('festivos: la lista está vacía. Sin festivos, la app cobraría tarifa normal y daría cita en un día de fiesta.');
    else {
      if (ultimo < K.masMeses(hoy, 6)) E('festivos: la lista se acaba el ' + K.fechaCorta(ultimo) + '. Quedan menos de 6 meses: hay que añadir los del año siguiente.');
      else if (ultimo < K.masMeses(hoy, 12)) A('festivos: la lista llega hasta el ' + K.fechaCorta(ultimo) + '. Queda menos de un año: conviene ir añadiendo los del año siguiente.');
      const porAno = {}; buenos.forEach(f => { porAno[f.slice(0, 4)] = (porAno[f.slice(0, 4)] || 0) + 1 });
      const esteAno = hoy.slice(0, 4);
      Object.entries(porAno).forEach(([a, n]) => { if (a >= esteAno && a < ultimo.slice(0, 4) && n < 10) A('festivos: en ' + a + ' solo hay ' + n + '; lo normal son de 12 a 16. ¿Falta alguno?') });
      if ((porAno[esteAno] || 0) < 1) E('festivos: no hay ninguno de ' + esteAno + '.');
    }
  }

  // ---- equipo
  const tecs = N.tecnicos, idsTec = new Set();
  if (!Array.isArray(tecs) || !tecs.length) E('tecnicos: tiene que haber al menos un técnico.');
  else {
    tecs.forEach((x, i) => {
      const quien = 'tecnicos[' + i + ']' + (x && x.id ? ' (' + x.id + ')' : '');
      if (!x || !ID.test(x.id || '')) E(quien + ': id en minúsculas y sin espacios.');
      else if (idsTec.has(x.id)) E(quien + ': id repetido.'); else idsTec.add(x.id);
      if (!x || !esTexto(x.n, 2, 20)) E(quien + ': falta el nombre de pila (n), que es el que lee el cliente en los mensajes.');
      if (!x || !esTexto(x.ap, 2, 30)) E(quien + ': falta el apellido (ap).');
      if (!x || !esEntero(x.tono) || x.tono < 0 || x.tono > 360) E(quien + ': tono es el color del técnico, de 0 a 360.');
    });
    const jefes = tecs.filter(x => x && x.jefe).length;
    if (jefes > 1) A('tecnicos: hay ' + jefes + ' marcados como jefe; lo normal es uno.');
    if (jefes < 1) A('tecnicos: nadie está marcado como jefe.');
    if (tecs.length > 8) A('tecnicos: son ' + tecs.length + '; el pack más grande cubre 8 personas.');
  }

  // ---- zonas
  const z = N.zonas || {}, bandas = z.banda || {}, dis = z.dis || {}, cps = z.cp || {};
  if (!Object.keys(bandas).length) E('zonas.banda: faltan las bandas de tiempo de llegada.');
  Object.entries(bandas).forEach(([k, m]) => { if (!esEntero(m) || m < 5 || m > 180) E('zonas.banda.' + k + ': minutos de llegada, de 5 a 180.') });
  if (!Object.keys(dis).length) E('zonas.dis: falta al menos una zona.');
  Object.entries(dis).forEach(([k, d]) => {
    if (!ID.test(k)) E('zonas.dis.' + k + ': la clave va en minúsculas y sin espacios.');
    if (!Array.isArray(d) || d.length !== 3 || !esTexto(d[0], 2, 40) || !esTexto(d[2], 2, 24)) E('zonas.dis.' + k + ': va como [nombre, banda, nombre corto].');
    else if (!propio(bandas, d[1])) E('zonas.dis.' + k + ': la banda «' + d[1] + '» no existe en zonas.banda.');
  });
  if (!Object.keys(cps).length) E('zonas.cp: falta al menos un código postal.');
  Object.entries(cps).forEach(([cp, d]) => {
    if (!/^\d{5}$/.test(cp)) E('zonas.cp: «' + cp + '» no es un código postal de 5 cifras.');
    if (!propio(dis, d)) E('zonas.cp.' + cp + ': la zona «' + d + '» no existe en zonas.dis.');
  });
  Object.keys(dis).forEach(k => { if (!Object.values(cps).includes(k)) A('zonas.dis.' + k + ': ningún código postal lleva a esta zona.') });

  // ---- citas
  const fr = N.franjas, idsFr = new Set();
  if (!Array.isArray(fr) || !fr.length) E('franjas: tiene que haber al menos una franja de cita.');
  else {
    fr.forEach((f, i) => {
      const cual = 'franjas[' + i + ']';
      if (!f || !ID.test(f.id || '')) E(cual + ': falta el id.'); else if (idsFr.has(f.id)) E(cual + ': id repetido.'); else idsFr.add(f.id);
      if (!f || !esEntero(f.de) || !esEntero(f.a) || f.de < 0 || f.a > 1440 || f.de >= f.a) E(cual + ': «de» y «a» son minutos del día, con «de» menor que «a».');
      else { if (f.de % 15 || f.a % 15) A(cual + ': mejor en cuartos de hora exactos; así se lee bien en los mensajes.'); if (i && fr[i - 1] && esEntero(fr[i - 1].a) && f.de < fr[i - 1].a) E(cual + ': se pisa con la franja anterior o no van en orden.') }
    });
  }
  const conH = !!(N.horario || (Array.isArray(tecs) && tecs.some(x => x && x.horario)));
  if (conH && N.cupo == null) { /* con horarios, los huecos salen de ahí */ }
  else if (!esEntero(N.cupo) || N.cupo < 1 || N.cupo > 20) E('cupo: cuántas citas caben en cada franja, de 1 a 20 (o, mejor, el horario de cada técnico).');
  else if (Array.isArray(tecs) && N.cupo > tecs.length) A('cupo: caben ' + N.cupo + ' citas por franja y solo hay ' + tecs.length + ' técnico(s).');

  // ---- horarios (si el negocio los pone, los huecos que ve el cliente salen de aquí)
  const horarioMal = (h, cual) => {
    if (!h || typeof h !== 'object' || Array.isArray(h)) { E(cual + ': va como {1:[[480,840],[900,1200]], 2:…}, con el día de la semana (0 es domingo) y los tramos en minutos.'); return true }
    let mal = false;
    Object.entries(h).forEach(([d, tr]) => {
      if (!/^[0-6]$/.test(d)) { E(cual + ': «' + d + '» no es un día de la semana (de 0, domingo, a 6, sábado).'); mal = true; return }
      if (!Array.isArray(tr) || !tr.length || !tr.every(x => Array.isArray(x) && x.length === 2 && esEntero(x[0]) && esEntero(x[1]) && x[0] >= 0 && x[1] <= 1440 && x[0] < x[1])) { E(cual + ', día ' + d + ': cada tramo va como [desde, hasta], en minutos del día.'); mal = true; return }
      if (tr.some((x, i) => i && x[0] < tr[i - 1][1])) { E(cual + ', día ' + d + ': los tramos se pisan o no van en orden.'); mal = true }
    });
    return mal;
  };
  const conHorario = !!(N.horario || (Array.isArray(tecs) && tecs.some(x => x && x.horario)));
  if (conHorario && Array.isArray(tecs) && Array.isArray(fr)) {
    let mal = N.horario ? horarioMal(N.horario, 'horario') : false;
    tecs.forEach(x => { if (x && x.horario) mal = horarioMal(x.horario, 'tecnicos (' + x.id + ').horario') || mal; else if (x && !N.horario) { E('tecnicos (' + x.id + '): falta su horario (o un horario general del negocio).'); mal = true } });
    const ct = N.citas || {};
    if (N.citas != null && (!esEntero(ct.porFranja) || ct.porFranja < 1 || ct.porFranja > 6)) { E('citas.porFranja: cuántas citas lleva un técnico en una franja, de 1 a 6.'); mal = true }
    if (N.citas != null && ct.reserva != null && (!esEntero(ct.reserva) || ct.reserva < 0 || ct.reserva > 8)) { E('citas.reserva: a cuántos técnicos se deja libres para urgencias en cada franja, de 0 a 8.'); mal = true }
    if (!mal) {
      const cubre = (x, d, f) => ((x.horario || N.horario)[d] || []).some(t => t[0] <= f.de && t[1] >= f.a);
      const corta = (x, d, f) => ((x.horario || N.horario)[d] || []).some(t => t[0] < f.a && t[1] > f.de) && !cubre(x, d, f);
      let algo = false;
      fr.forEach(f => { let cuantos = 0;
        [1, 2, 3, 4, 5].forEach(d => { const n = tecs.filter(x => cubre(x, d, f)).length, cap = Math.max(0, n * (ct.porFranja || 1) - (ct.reserva || 0)); cuantos += cap; if (cap > 0) algo = true });
        if (!cuantos) A('franjas (' + f.id + '): con estos horarios no cabe ninguna cita en esta franja ningún día. El cliente nunca la podrá elegir.') });
      if (!algo) E('horarios: con estos horarios y esta reserva no cabe ninguna cita en toda la semana.');
      tecs.forEach(x => fr.forEach(f => { const dias = [1, 2, 3, 4, 5].filter(d => corta(x, d, f)); if (dias.length) A('tecnicos (' + x.id + '): su horario corta la franja «' + f.id + '» por la mitad; esos días no cuenta para esa franja.') }));
      if (!tecs.some(x => x.guardia)) A('tecnicos: nadie está marcado para guardias; una urgencia fuera de horario se podrá asignar a cualquiera.');
      if (N.cupo != null) A('cupo: con horarios puestos ya no se usa; los huecos salen de los horarios.');
    }
  }

  // ---- catálogo
  const cat = N.catalogo || {}, claves = Object.keys(cat);
  if (!claves.length) E('catalogo: está vacío.');
  claves.forEach(k => {
    const it = cat[k], cual = 'catalogo.' + k;
    if (!ID.test(k)) E(cual + ': la clave va en minúsculas y sin espacios.');
    if (k === 'otro') E(cual + ': «otro» está reservado para el material que escribe el técnico a mano.');
    if (!it || !esTexto(it.t, 3, 60)) { E(cual + ': falta el nombre (t), de 3 a 60 letras.'); return }
    const tiene10 = it.p10 != null, tiene21 = it.p21 != null;
    if (tiene10 === tiene21) E(cual + ': lleva un precio y solo uno: p10 (final con el 10 % de IVA) o p21 (final con el 21 %).');
    const p = tiene10 ? it.p10 : it.p21;
    if (!esNum(p) || p <= 0 || p > 5000) E(cual + ': el precio tiene que ser mayor que 0 y como mucho 5.000 €.');
    else if (!dosDec(p)) E(cual + ': el precio lleva más de dos decimales.');
    if (it.un != null && it.un !== 'h') E(cual + ': «un» solo puede ser «h» (se cuenta por horas).');
    if (it.un === 'h') {
      if (!esNum(it.paso) || it.paso <= 0 || it.paso > 1) E(cual + ': por horas hace falta «paso» (0.25 es un cuarto de hora).');
      if (!esNum(it.min) || it.min <= 0 || it.min > 4) E(cual + ': por horas hace falta «min», el mínimo que se cobra.');
      if (esNum(it.paso) && esNum(it.min) && Math.abs(it.min / it.paso - Math.round(it.min / it.paso)) > 1e-9) E(cual + ': el mínimo tiene que ser un múltiplo del paso.');
      if (it.mat) E(cual + ': algo que se cuenta por horas no puede ser material.');
    }
    if (it.mat && it.u) A(cual + ': es material y además lleva recargo de urgencia. ¿Seguro?');
  });
  if (!propio(cat, N.sinTrabajo || '')) E('sinTrabajo: tiene que ser la clave del catálogo que se cobra cuando el cliente no acepta el precio (ejemplo: «desp»).');
  else if (cat[N.sinTrabajo].mat || cat[N.sinTrabajo].un === 'h') E('sinTrabajo: tiene que ser un precio fijo de visita o desplazamiento, no material ni horas.');
  const porHoras = claves.filter(k => cat[k] && cat[k].un === 'h');
  if (porHoras.length > 1) A('catalogo: hay ' + porHoras.length + ' conceptos por horas (' + porHoras.join(', ') + '); la pantalla de «más tiempo» usa el primero.');
  if (!porHoras.length) A('catalogo: no hay mano de obra por horas; el técnico no podrá añadir «más tiempo».');

  // ---- averías
  const av = N.averias, idsAv = new Set(), usadas = new Set([N.sinTrabajo]);
  const lineasOk = (L, cual, vacioVale) => {
    if (!Array.isArray(L) || (!L.length && !vacioVale)) { E(cual + ': tiene que ser una lista de conceptos del catálogo.'); return false }
    let bien = true;
    L.forEach(l => {
      if (!l || !propio(cat, l.k)) { E(cual + ': «' + (l && l.k) + '» no está en el catálogo.'); bien = false; return }
      usadas.add(l.k); const it = cat[l.k];
      if (l.q != null) { if (!esNum(l.q) || l.q <= 0) { E(cual + ': la cantidad de «' + l.k + '» tiene que ser mayor que 0.'); bien = false } else if (it.un === 'h' && esNum(it.paso) && Math.abs(l.q / it.paso - Math.round(l.q / it.paso)) > 1e-9) { E(cual + ': la cantidad de «' + l.k + '» no es un múltiplo de su paso.'); bien = false } else if (it.un === 'h' && esNum(it.min) && l.q < it.min) { E(cual + ': la cantidad de «' + l.k + '» está por debajo de su mínimo.'); bien = false } }
    });
    return bien;
  };
  if (!Array.isArray(av) || !av.length) E('averias: tiene que haber al menos una avería.');
  else {
    let cfg = null; try { if (!errores.length) cfg = K.cfgDe(N) } catch (e) { E('El núcleo no puede leer el archivo: ' + e.message) }
    av.forEach((a, i) => {
      const cual = 'averias[' + i + ']' + (a && a.id ? ' (' + a.id + ')' : '');
      if (!a || !ID.test(a.id || '')) { E(cual + ': falta el id.'); return }
      if (idsAv.has(a.id)) E(cual + ': id repetido.'); else idsAv.add(a.id);
      if (!esTexto(a.n, 3, 40)) E(cual + ': falta el nombre (n).');
      if (!esTexto(a.c, 2, 14)) E(cual + ': falta el nombre corto (c), de hasta 14 letras.');
      if (!esTexto(a.d, 3, 80)) E(cual + ': falta la descripción (d).');
      const m = lineasOk(a.min, cual + '.min'), x = a.max === null ? true : lineasOk(a.max, cual + '.max'), n = lineasOk(a.ini, cual + '.ini');
      if (!Array.isArray(a.chips)) E(cual + '.chips: tiene que ser una lista (puede estar vacía).');
      else a.chips.forEach(k => { if (!propio(cat, k)) E(cual + '.chips: «' + k + '» no está en el catálogo.'); else { usadas.add(k); if (cat[k].un === 'h') E(cual + '.chips: «' + k + '» va por horas; el tiempo se añade con «más tiempo», no como material.') } });
      if (cfg && m && x && n) {
        const pmin = K.precio(cfg, a.min, {}).total, pini = K.precio(cfg, a.ini, {}).total, pmax = a.max ? K.precio(cfg, a.max, {}).total : null;
        if (!(pmin > 0)) E(cual + ': el precio mínimo sale a 0.');
        if (pmax != null && pmax < pmin) E(cual + ': el precio máximo (' + K.eur(pmax) + ') es menor que el mínimo (' + K.eur(pmin) + ').');
        if (pini < pmin) A(cual + ': el presupuesto que sale ya puesto (' + K.eur(pini) + ') es menor que el «desde» de la web (' + K.eur(pmin) + ').');
        if (pmax != null && pini > pmax) A(cual + ': el presupuesto que sale ya puesto (' + K.eur(pini) + ') pasa del «hasta» de la web (' + K.eur(pmax) + ').');
      }
    });
  }
  claves.forEach(k => { if (!usadas.has(k)) A('catalogo.' + k + ': no lo usa ninguna avería; el técnico no podrá elegirlo.') });

  // ---- claves de más (casi siempre, una errata)
  Object.keys(N).forEach(k => { if (!CLAVES.includes(k) && k !== 'zona') A('«' + k + '» no es un dato que la app conozca. ¿Es una errata?') });
  return { errores, avisos };
}

/** Lee un archivo de datos tal como lo cargaría el navegador y devuelve OFICIO_NEGOCIO. */
export function leeNegocio(archivo) {
  const ruta = path.resolve(archivo);
  delete require.cache[ruta]; delete globalThis.OFICIO_NEGOCIO; delete globalThis.OFICIO_MUESTRA;
  require(ruta);
  return { N: globalThis.OFICIO_NEGOCIO, muestra: globalThis.OFICIO_MUESTRA || null };
}
export function leeNucleo(sitio) {
  globalThis.window = globalThis;
  const ruta = path.resolve(sitio, 'js/oficio-nucleo.js');
  delete require.cache[ruta]; require(ruta);
  return globalThis.OficioNucleo;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), ih = args.indexOf('--hoy');
  let hoy = null; if (ih >= 0) { hoy = args[ih + 1]; args.splice(ih, 2) }
  const [sitio, ...archivos] = args;
  if (!sitio || !archivos.length) { console.log('Uso: node valida-negocio.mjs <carpeta del sitio> <datos.js> [...] [--hoy AAAA-MM-DD]'); process.exit(2) }
  const K = leeNucleo(sitio); hoy = hoy || K.madrid(Date.now()).date;
  let mal = 0;
  for (const f of archivos) {
    let r; try { r = valida(leeNegocio(f).N, K, hoy) } catch (e) { r = { errores: ['No se puede leer: ' + e.message], avisos: [] } }
    console.log((r.errores.length ? 'MAL  ' : 'BIEN ') + f + (r.errores.length ? '' : ' · datos completos y coherentes a ' + K.fechaCorta(hoy)));
    r.errores.forEach(t => console.log('   ERROR  ' + t)); r.avisos.forEach(t => console.log('   aviso  ' + t));
    if (r.errores.length) mal++;
  }
  process.exit(mal ? 1 : 0);
}
