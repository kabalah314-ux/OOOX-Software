// Valida el archivo de datos de un negocio (js/oficio-datos.js o cualquier copia para otro negocio).
// Dice, en castellano, qué falta o no cuadra antes de que el fallo llegue a un cliente.
// Uso:  node valida-negocio.mjs <carpeta del sitio> <datos.js> [<otro-datos.js> ...] [--hoy AAAA-MM-DD]
//       (el núcleo se lee de <carpeta del sitio>/js/oficio-nucleo.js)
// Sale con error (1) si algún archivo tiene errores. Los «avisos» no paran nada: son cosas a mirar.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TODOS as BASE } from '../../oficios-base/servicios.mjs';   // la base de servicios de OOOX: para «base» del catálogo

const ID = /^[a-z][a-z0-9_-]{0,23}$/, FECHA = /^\d{4}-\d{2}-\d{2}$/;
const CLAVES = ['id', 'serie', 'nombre', 'marca', 'razon', 'nif', 'dir', 'ciudad', 'tel', 'email', 'resenas', 'pack', 'garantiaMeses', 'sinTrabajo', 'tarifa', 'festivos', 'tecnicos', 'zonas', 'franjas', 'cupo', 'catalogo', 'averias', 'horario', 'citas', 'mapa', 'prueba', 'servidor', 'mantenimiento', 'furgoneta', 'textos', 'pago', 'publico'];
const esTexto = (x, min = 1, max = 200) => typeof x === 'string' && x.trim().length >= min && x.length <= max;
/* una cuenta IBAN bien escrita: letras del país, dos cifras de control y el resto, y el control (módulo 97) cuadra */
const ibanOk = x => { if (typeof x !== 'string') return false; const s = x.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s) || (s.startsWith('ES') && s.length !== 24)) return false;
  let m = 0; for (const c of s.slice(4) + s.slice(0, 4)) { const d = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c; for (const x of d) m = (m * 10 + +x) % 97; } return m === 1; };
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
  /* el archivo público de una copia con servidor (17-11-2026): del equipo, solo el nombre, la inicial y el color. Lo demás del
     equipo (apellidos, horarios, el jefe, las guardias) está en el servidor y se valida con los datos completos (copias.mjs) */
  const pub = N.publico === true;
  if (N.publico != null && !pub) E('publico: solo puede ser true (el archivo público de una copia con servidor, hecho con copias.mjs), o no estar.');
  if (pub && !(N.servidor && typeof N.servidor === 'object' && typeof N.servidor.url === 'string')) E('publico: un archivo público solo vale con servidor: sin él, la app no tiene de dónde sacar el equipo, sus horarios ni los huecos.');

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
  if (N.email != null && (typeof N.email !== 'string' || N.email.length > 120 || !/^[^\s@]{1,64}@[^\s@]+\.[A-Za-z]{2,}$/.test(N.email))) E('email: no tiene forma de correo (ejemplo: avisos@minegocio.es).');
  else if (N.email == null) A('email: el negocio no tiene correo puesto. Si lo tiene, conviene ponerlo: la ley de consumidores lo pide en el formulario de desistimiento, junto a la dirección y el teléfono.');
  if (esTexto(N.dir, 5, 120) && !/\d/.test(N.dir)) A('dir: no lleva número. En el presupuesto y en el formulario de desistimiento tiene que ir la dirección completa (calle, número, código postal y ciudad).');
  if (!esTexto(N.resenas, 8, 200) || /\s/.test(N.resenas)) E('resenas: falta el enlace para pedir reseñas (sin espacios).');
  if (!['pro', 'asistente'].includes(N.pack)) E('pack: tiene que ser «pro» o «asistente» (desde el 13-11-2026 hay dos planes: Pro, y Pro con asistente de llamadas).');
  else if (N.pack === 'asistente') A('pack «asistente»: la app lo trata hoy igual que Pro; el asistente de llamadas todavía no está hecho.');
  if (!esEntero(N.garantiaMeses) || N.garantiaMeses < 1 || N.garantiaMeses > 60) E('garantiaMeses: un número entero de 1 a 60.');
  else if (N.garantiaMeses < 6) A('garantiaMeses: menos de 6 meses. En Cataluña, el Codi de consum da al menos 6 meses de garantía a una reparación: revísalo con el abogado antes de ponerlo.');

  // ---- cómo se paga lo que queda pendiente (16-11-2026): sale en el recordatorio del cobro
  if (N.pago != null) {
    if (typeof N.pago !== 'object' || Array.isArray(N.pago)) E('pago: tiene que ser {bizum, iban}; los dos son opcionales.');
    else {
      Object.keys(N.pago).forEach(k => { if (!['bizum', 'iban'].includes(k)) A('pago.' + k + ': no es un dato que la app conozca (bizum o iban). ¿Es una errata?') });
      if (N.pago.bizum != null && !(typeof N.pago.bizum === 'string' && /^[67]\d{8}$/.test(N.pago.bizum.replace(/\s/g, '')))) E('pago.bizum: el móvil del Bizum, 9 cifras que empiezan por 6 o 7.');
      if (N.pago.iban != null && !ibanOk(N.pago.iban)) E('pago.iban: no es una cuenta IBAN bien escrita (ES y 22 cifras; se comprueban las cifras de control).');
      if (N.pago.bizum == null && N.pago.iban == null) A('pago: está vacío; el recordatorio del cobro pide al cliente que conteste para saber cómo pagar.');
    }
  } else A('pago: sin Bizum ni cuenta, el recordatorio del cobro pide al cliente que conteste para saber cómo pagar.');
  if (N.zona != null && N.zona !== 'Europe/Madrid') E('zona: la app solo trabaja hoy con la hora peninsular (Europe/Madrid). Canarias necesita un cambio en las reglas.');

  // ---- horario y tarifa
  const tf = N.tarifa || {};
  if (!Array.isArray(tf.dia) || tf.dia.length !== 2 || !tf.dia.every(esEntero) || tf.dia[0] < 0 || tf.dia[1] > 1440 || tf.dia[0] >= tf.dia[1]) E('tarifa.dia: dos minutos del día, [desde, hasta], con desde menor que hasta (8 a 20 h es [480, 1200]).');
  if (!esNum(tf.recargo) || tf.recargo < 0 || tf.recargo > 2) E('tarifa.recargo: el recargo de urgencia en tanto por uno (0.4 es un 40 %), entre 0 y 2.');
  if (tf.urgente !== undefined) {   // el suplemento de urgencia: una línea del catálogo, a precio fijo
    const u = N.catalogo && typeof tf.urgente === 'string' ? N.catalogo[tf.urgente] : null;
    if (!u) E('tarifa.urgente: tiene que ser la clave de una línea del catálogo (la del suplemento de urgencia).');
    else { if (u.un === 'h' || u.mat) E('tarifa.urgente: el suplemento es un precio fijo, ni por horas ni material.'); if (u.u) A('tarifa.urgente: el suplemento lleva además el recargo de noche y festivos. ¿Seguro?'); }
  }

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
      if (pub) {
        const otros = x && typeof x === 'object' ? Object.keys(x).filter(k => !['id', 'n', 'ap', 'tono'].includes(k)) : [];
        if (otros.length) E(quien + ': en el archivo público no van «' + otros.join('», «') + '»: esos datos están solo en el servidor (node copias.mjs publica).');
        if (x && x.ap != null && !(typeof x.ap === 'string' && /^\p{Lu}\.$/u.test(x.ap))) E(quien + ': en el archivo público, del apellido va solo la inicial (por ejemplo «M.»).');
      } else if (!x || !esTexto(x.ap, 2, 30)) E(quien + ': falta el apellido (ap).');
      if (!x || !esEntero(x.tono) || x.tono < 0 || x.tono > 360) E(quien + ': tono es el color del técnico, de 0 a 360.');
      if (x && x.coche != null && !esTexto(x.coche, 3, 80)) E(quien + ': coche es lo que ve el cliente cuando va de camino, de 3 a 80 letras (ejemplo: «Furgoneta blanca con el logo»).');
      if (x && x.foto != null && (typeof x.foto !== 'string' || x.foto.includes('..') || !/^assets\/[\w.\/-]{1,120}\.(jpe?g|png|webp)$/i.test(x.foto))) E(quien + ': foto tiene que ser una imagen de la carpeta assets (.jpg, .png o .webp), como «assets/tec/jordi.jpg».');
      else if (x && x.foto && x.fotoOk !== 1) A(quien + ': su foto no se enseña al cliente hasta que el técnico dé su permiso por escrito y se ponga fotoOk: 1.');
      if (x && x.fotoOk != null && x.fotoOk !== 1) E(quien + ': fotoOk solo puede ser 1 (el técnico ha dado su permiso por escrito para enseñar su foto).');
    });
    const jefes = tecs.filter(x => x && x.jefe).length;
    if (jefes > 1) A('tecnicos: hay ' + jefes + ' marcados como jefe; lo normal es uno.');
    if (jefes < 1 && !pub) A('tecnicos: nadie está marcado como jefe.');
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
  if ((conH || pub) && N.cupo == null) { /* con horarios, los huecos salen de ahí (en el archivo público no van: están en el servidor) */ }
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
  // las citas por lo que tarda cada trabajo (15-11-2026): sí o no, y solo con horarios
  if (N.citas && N.citas.porTiempo != null && typeof N.citas.porTiempo !== 'boolean') E('citas.porTiempo: true para repartir las citas por lo que tarda cada trabajo; si no, false o nada.');
  if (N.citas && N.citas.porTiempo === true && !conHorario && !pub) A('citas.porTiempo: sin horarios no se puede; las citas van por número (cupo).');
  if (N.citas && N.citas.voyAntes != null && !(Number.isInteger(N.citas.voyAntes) && N.citas.voyAntes >= 0 && N.citas.voyAntes <= 240)) E('citas.voyAntes: los minutos antes de la franja desde los que el técnico puede pulsar «Voy» en una cita, de 0 a 240 (sin poner, 30).');
  if (N.citas && N.citas.reservaSiFalta != null && typeof N.citas.reservaSiFalta !== 'boolean') E('citas.reservaSiFalta: false para no guardar a nadie para urgencias los días que falta alguien; si no, true o nada.');
  if (N.citas && N.citas.reservaSiFalta === false && !(N.citas.reserva > 0)) A('citas.reservaSiFalta: sin reserva para urgencias (citas.reserva) no cambia nada.');
  if (pub) {   // sin los horarios del equipo, los huecos no se pueden mirar aquí: se miran con los datos completos
    if (N.horario) horarioMal(N.horario, 'horario');
    const ct = N.citas || {};
    if (N.citas != null && (!esEntero(ct.porFranja) || ct.porFranja < 1 || ct.porFranja > 6)) E('citas.porFranja: cuántas citas lleva un técnico en una franja, de 1 a 6.');
    if (N.citas != null && ct.reserva != null && (!esEntero(ct.reserva) || ct.reserva < 0 || ct.reserva > 8)) E('citas.reserva: a cuántos técnicos se deja libres para urgencias en cada franja, de 0 a 8.');
  } else if (conHorario && Array.isArray(tecs) && Array.isArray(fr)) {
    let mal = N.horario ? horarioMal(N.horario, 'horario') : false;
    tecs.forEach(x => { if (x && x.horario) mal = horarioMal(x.horario, 'tecnicos (' + x.id + ').horario') || mal; else if (x && !N.horario) { E('tecnicos (' + x.id + '): falta su horario (o un horario general del negocio).'); mal = true } });
    const ct = N.citas || {};
    if (N.citas != null && (!esEntero(ct.porFranja) || ct.porFranja < 1 || ct.porFranja > 6)) { E('citas.porFranja: cuántas citas lleva un técnico en una franja, de 1 a 6.'); mal = true }
    if (N.citas != null && ct.reserva != null && (!esEntero(ct.reserva) || ct.reserva < 0 || ct.reserva > 8)) { E('citas.reserva: a cuántos técnicos se deja libres para urgencias en cada franja, de 0 a 8.'); mal = true }
    if (ct.porTiempo === true && (ct.reserva || 0) > 0 && Array.isArray(N.franjas)) {   // por tiempo, la reserva guarda técnicos enteros: donde trabajan pocos, el cliente no puede pedir
      const flojas = []; [1, 2, 3, 4, 5, 6].forEach(w => N.franjas.forEach(f => { const n = tecs.filter(x => { const h = (x && x.horario) || N.horario; return h && (h[w] || h[String(w)] || []).some(r => r[0] <= f.de && r[1] >= f.a) }).length;
        if (n > 0 && n <= ct.reserva) flojas.push(['', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'][w] + ' ' + f.id) }));
      if (flojas.length) A('citas.reserva: con citas por tiempo se guardan técnicos enteros para urgencias, y en ' + flojas.slice(0, 6).join(', ') + (flojas.length > 6 ? '…' : '') + ' no trabajan más que los que se guardan: ahí el cliente no podrá pedir cita, solo la oficina.') }
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

  // ---- mapa (opcional): con él, el técnico comparte su posición con el cliente desde «Voy» hasta que llega
  if (N.mapa != null) {
    const m = N.mapa;
    if (!m || typeof m !== 'object' || Array.isArray(m)) E('mapa: tiene que ser un objeto, aunque esté vacío ({}), o no estar.');
    else {
      Object.keys(m).forEach(k => { if (!['teselas', 'firma', 'firmaUrl'].includes(k)) E('mapa: «' + k + '» no es un dato que la app use.') });
      if (m.teselas != null) {
        if (typeof m.teselas !== 'string' || !/^https:\/\/[^\s"'<>]+$/.test(m.teselas) || !['{z}', '{x}', '{y}'].every(t => m.teselas.includes(t))) E('mapa.teselas: tiene que ser una dirección https con {z}, {x} y {y}.');
        if (typeof m.firma !== 'string' || m.firma.trim().length < 3) E('mapa.firma: con un mapa de fondo hay que poner la firma de quien lo da (por ejemplo «© OpenStreetMap»).');
        else if (/tile\.openstreetmap\.org/.test(String(m.teselas))) A('mapa.teselas: el servidor gratuito de OpenStreetMap vale para una demo; un negocio en marcha necesita un proveedor o un servidor propio.');
      } else A('mapa: sin «teselas», el cliente verá cuándo se compartió la posición y un enlace para abrirla, pero no un mapa en la página.');
      if (m.firmaUrl != null && (typeof m.firmaUrl !== 'string' || !/^https:\/\/[^\s"'<>]+$/.test(m.firmaUrl))) E('mapa.firmaUrl: tiene que ser una dirección https.');
    }
  }
  // ---- copia de prueba (opcional): la app avisa en pantalla de que el negocio aún no está en marcha
  if (N.prueba != null && typeof N.prueba !== 'boolean') E('prueba: tiene que ser true o false.');
  // ---- servidor (opcional): con él, los avisos viven en el servidor del negocio y cada persona entra con su código
  if (N.servidor != null) {
    const v = N.servidor;
    if (!v || typeof v !== 'object' || Array.isArray(v)) E('servidor: tiene que ser un objeto con «url» y «llave», o no estar.');
    else {
      Object.keys(v).forEach(k => { if (!['url', 'llave', 'funcion', 'cada'].includes(k)) E('servidor: «' + k + '» no es un dato que la app use.') });
      if (typeof v.url !== 'string' || !/^https:\/\/[a-z0-9.-]+(:\d+)?\/?$/.test(v.url)) E('servidor.url: tiene que ser la dirección https del servidor, sin nada detrás (por ejemplo https://abc.supabase.co).');
      if (typeof v.llave !== 'string' || v.llave.length < 10 || /\s/.test(v.llave)) E('servidor.llave: falta la llave pública del servidor.');
      else if (/service_role|^sb_secret_|^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v.llave) && !/^sb_publishable_/.test(v.llave)) A('servidor.llave: comprueba que es la llave PÚBLICA (la que empieza por sb_publishable_). La de servicio no puede ir nunca en la app.');
      if (v.funcion != null && (typeof v.funcion !== 'string' || !/^[a-z0-9-]{1,40}$/.test(v.funcion))) E('servidor.funcion: solo letras minúsculas, números y guiones.');
      if (v.cada != null && (!Number.isInteger(v.cada) || v.cada < 1000 || v.cada > 60000)) E('servidor.cada: cada cuántos milisegundos pregunta la app si hay algo nuevo; entre 1000 y 60000.');
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
    // lo que tarda el servicio y a cuál de la base corresponde (15-11-2026)
    if (it.dur !== undefined && !(Array.isArray(it.dur) && it.dur.length === 2 && it.dur.every(esEntero) && it.dur[0] >= 1 && it.dur[0] <= it.dur[1] && it.dur[1] <= 600)) E(cual + '.dur: lo que tarda, [normal, máximo] en minutos por unidad (entre 1 y 600), por ejemplo [30, 60].');
    // cada cuántos meses toca volver (una revisión): con eso el técnico puede apuntar que el cliente quiere que se le avise (15-11-2026)
    if (it.cada !== undefined && !(esEntero(it.cada) && it.cada >= 3 && it.cada <= 60)) E(cual + '.cada: cada cuántos meses toca volver, un número entero de 3 a 60 (12 = cada año).');
    if (it.cada !== undefined && it.mat) A(cual + '.cada: es material; lo normal es poner «cada» en el servicio que se repite (una revisión).');
    if (it.base !== undefined) {
      const b = typeof it.base === 'string' ? BASE[it.base] : null;
      if (!b) E(cual + '.base: «' + it.base + '» no está en la base de servicios de OOOX (webs-negocios/oficios-base/servicios.mjs).');
      else {
        if (it.dur === undefined) A(cual + ': es el servicio «' + b.n + '» de la base y no dice lo que tarda; la base propone de ' + b.dur[0] + ' a ' + b.dur[1] + ' minutos.');
        if (b.ref && esNum(p) && (p < b.ref[0] / 2 || p > b.ref[1] * 2)) A(cual + ': ' + p + ' € queda muy lejos de lo que se suele cobrar por «' + b.n + '» (de ' + b.ref[0] + ' a ' + b.ref[1] + ' €). ¿Seguro?');
      }
    }
  });
  if (!propio(cat, N.sinTrabajo || '')) E('sinTrabajo: tiene que ser la clave del catálogo que se cobra cuando el cliente no acepta el precio (ejemplo: «desp»).');
  else if (cat[N.sinTrabajo].mat || cat[N.sinTrabajo].un === 'h') E('sinTrabajo: tiene que ser un precio fijo de visita o desplazamiento, no material ni horas.');
  const porHoras = claves.filter(k => cat[k] && cat[k].un === 'h');
  if (porHoras.length > 1) A('catalogo: hay ' + porHoras.length + ' conceptos por horas (' + porHoras.join(', ') + '); la pantalla de «más tiempo» usa el primero.');
  if (!porHoras.length) A('catalogo: no hay mano de obra por horas; el técnico no podrá añadir «más tiempo».');

  // ---- la furgoneta (opcional, 16-11-2026): lo que lleva siempre, con su mínimo y su máximo. La del negocio y, si alguien
  // lleva otra cosa, la suya en su ficha. Solo cuenta en las furgonetas de quien lleva la cuenta en la app.
  const kitMal = (o, cual) => {
    if (typeof o !== 'object' || o === null || Array.isArray(o)) { E(cual + ': tiene que ser un objeto, con cada material y su [mínimo, máximo], por ejemplo {"latig": [4, 8]}.'); return }
    const ks = Object.keys(o);
    if (!ks.length) A(cual + ': está vacía; sin nada puesto, no sale nada para reponer.');
    ks.forEach(k => {
      const v = o[k];
      if (!propio(cat, k)) E(cual + '.' + k + ': no está en el catálogo.');
      else if (!cat[k] || !cat[k].mat) E(cual + '.' + k + ': no es material; en la furgoneta solo va material del catálogo.');
      else if (cat[k].extra) A(cual + '.' + k + ': es un aparato («extra»). ¿Seguro que va siempre en la furgoneta?');
      if (!Array.isArray(v) || v.length !== 2 || !v.every(esEntero) || v[0] < 0 || v[1] < 1 || v[0] > v[1] || v[1] > 999) E(cual + '.' + k + ': va como [mínimo, máximo], dos números enteros con el mínimo de 0 a máximo y el máximo de 1 a 999.');
    });
  };
  if (N.furgoneta != null) kitMal(N.furgoneta, 'furgoneta');
  if (Array.isArray(tecs)) tecs.forEach(x => { if (x && x.furgoneta != null) kitMal(x.furgoneta, 'tecnicos (' + x.id + ').furgoneta') });

  // ---- averías
  const av = N.averias, idsAv = new Set(), usadas = new Set([N.sinTrabajo, (N.tarifa || {}).urgente]);   // el suplemento de urgencia lo pone la app sola
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
      if (a.mientras != null && !esTexto(a.mientras, 10, 300)) E(cual + '.mientras: lo que conviene hacer mientras llega el técnico, un texto de 10 a 300 letras (o nada).');
      const m = lineasOk(a.min, cual + '.min'), x = a.max === null ? true : lineasOk(a.max, cual + '.max'), n = lineasOk(a.ini, cual + '.ini');
      if (a.dur !== undefined && !(Array.isArray(a.dur) && a.dur.length === 2 && a.dur.every(esEntero) && a.dur[0] >= 5 && a.dur[0] <= a.dur[1] && a.dur[1] <= 600)) E(cual + '.dur: lo que tarda, [mínimo, máximo] en minutos (entre 5 y 600), por ejemplo [45, 120].');
      if (a.dur === undefined) A(cual + '.dur: falta lo que tarda (mínimo y máximo en minutos). Sin eso, el tiempo de llegada a una urgencia sale de las horas del presupuesto.');
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
  // ---- mantenimiento (opcional): los contratos que vende el negocio, con su revisión
  const MT = N.mantenimiento;
  if (MT != null) {
    if (typeof MT !== 'object' || Array.isArray(MT)) E('mantenimiento: tiene que ser un objeto con «revision» y «planes».');
    else {
      const r = MT.revision;
      if (Array.isArray(av) && av.some(a => a && a.id === 'revision')) E('averias: el id «revision» lo usa el mantenimiento; ponle otro a esa avería.');
      if (!r || typeof r !== 'object') E('mantenimiento.revision: falta la revisión (n, c, d, ini y chips).');
      else {
        if (!esTexto(r.n, 3, 40)) E('mantenimiento.revision: falta el nombre (n).');
        if (!esTexto(r.c, 2, 14)) E('mantenimiento.revision: falta el nombre corto (c), de hasta 14 letras.');
        if (!esTexto(r.d, 3, 80)) E('mantenimiento.revision: falta la descripción (d).');
        lineasOk(r.ini, 'mantenimiento.revision.ini');
        if (!Array.isArray(r.chips)) E('mantenimiento.revision.chips: tiene que ser una lista (puede estar vacía).');
        else r.chips.forEach(k => { if (!propio(cat, k)) E('mantenimiento.revision.chips: «' + k + '» no está en el catálogo.'); else usadas.add(k) });
      }
      const P = MT.planes, ids = new Set();
      if (!Array.isArray(P) || !P.length || P.length > 3) E('mantenimiento.planes: de uno a tres planes.');
      else P.forEach((x, i) => {
        const cual = 'mantenimiento.planes[' + i + ']' + (x && x.id ? ' (' + x.id + ')' : '');
        if (!x || !ID.test(x.id || '')) { E(cual + ': falta el id.'); return }
        if (ids.has(x.id)) E(cual + ': id repetido.'); else ids.add(x.id);
        if (!esTexto(x.n, 3, 40)) E(cual + ': falta el nombre (n), de 3 a 40 letras.');
        if (!esNum(x.precio) || x.precio <= 0 || x.precio > 3000 || !dosDec(x.precio)) E(cual + ': el precio al año, con el IVA dentro, entre 0 y 3.000 € y con dos decimales como mucho.');
        if (x.iva != null && ![10, 21].includes(x.iva)) E(cual + ': el IVA tiene que ser 10 o 21 (lo confirma la gestoría).');
        if (x.revisiones != null && (!esEntero(x.revisiones) || x.revisiones < 1 || x.revisiones > 4)) E(cual + ': de 1 a 4 revisiones al año.');
        if (!x.rev || !propio(cat, x.rev)) E(cual + ': «rev» tiene que ser la revisión del catálogo.'); else usadas.add(x.rev);
        if (x.desp != null && x.desp !== '' && !propio(cat, x.desp)) E(cual + ': «desp» no está en el catálogo.');
        if (r && Array.isArray(r.ini) && x.rev && !r.ini.some(l => l && l.k === x.rev)) A(cual + ': la revisión que sale ya puesta no lleva «' + x.rev + '»; no se descontará sola.');
      });
    }
  }
  claves.forEach(k => { if (!usadas.has(k)) A('catalogo.' + k + ': no lo usa ninguna avería; el técnico no podrá elegirlo.') });

  // ---- lo que ve el cliente en catalán y en inglés (js/oficio-idioma.js): filas [castellano, catalán, inglés]. Que estén todos
  //      los textos del negocio lo mira pruebas-reglas/idiomas.mjs; aquí, la forma
  if (N.textos != null) {
    if (!Array.isArray(N.textos)) E('textos: tiene que ser una lista de filas [castellano, catalán, inglés].');
    else { const vistos = new Set();
      N.textos.forEach((f, i) => {
        if (!Array.isArray(f) || f.length !== 3 || !f.every(x => esTexto(x, 1, 300))) { E('textos[' + i + ']: tiene que ser [castellano, catalán, inglés], tres textos de hasta 300 letras.'); return }
        if (vistos.has(f[0])) E('textos: «' + f[0] + '» está dos veces.'); vistos.add(f[0]);
      }) }
  }

  // ---- claves de más (casi siempre, una errata)
  Object.keys(N).forEach(k => { if (!CLAVES.includes(k) && k !== 'zona') A('«' + k + '» no es un dato que la app conozca. ¿Es una errata?') });
  return { errores, avisos };
}

/** Lee un archivo de datos tal como lo cargaría el navegador y devuelve OFICIO_NEGOCIO. */
export function leeNegocio(archivo) {
  const ruta = path.resolve(archivo);
  /* se ejecuta como lo hace el navegador, como un script: así se puede leer otra vez el mismo archivo. Con require, en una
     carpeta de módulos (la de frontend lo es) Node se queda con la primera lectura y la segunda no define nada (16-11-2026) */
  delete globalThis.OFICIO_NEGOCIO; delete globalThis.OFICIO_MUESTRA;
  vm.runInThisContext(fs.readFileSync(ruta, 'utf8'), { filename: ruta });
  return { N: globalThis.OFICIO_NEGOCIO, muestra: globalThis.OFICIO_MUESTRA || null };
}
export function leeNucleo(sitio) {
  globalThis.window = globalThis;
  const ruta = path.resolve(sitio, 'js/oficio-nucleo.js');
  /* como leeNegocio: se ejecuta como un script, igual que en el navegador. Con require, en la carpeta de frontend (que es de
     módulos) Node no vuelve a leer un archivo que ya ha leído: después de leer el núcleo de una copia, el de la plantilla salía
     el de la copia, y se validaba con las reglas viejas (17-11-2026) */
  delete globalThis.OficioNucleo;
  vm.runInThisContext(fs.readFileSync(ruta, 'utf8'), { filename: ruta });
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
    let r; try { const N = leeNegocio(f).N; r = Object.assign(valida(N, K, hoy), { publico: !!(N && N.publico === true) }) } catch (e) { r = { errores: ['No se puede leer: ' + e.message], avisos: [] } }
    console.log((r.errores.length ? 'MAL  ' : 'BIEN ') + f + (r.errores.length ? '' : (r.publico ? ' · la parte pública (el equipo entero está en el servidor), coherente a ' : ' · datos completos y coherentes a ') + K.fechaCorta(hoy)));
    r.errores.forEach(t => console.log('   ERROR  ' + t)); r.avisos.forEach(t => console.log('   aviso  ' + t));
    if (r.errores.length) mal++;
  }
  process.exit(mal ? 1 : 0);
}
