// EL JUEZ · el servidor de OOOX Oficios (fase 2).
//
// Es la única puerta por la que cambia un aviso. Recibe «quién es y qué quiere hacer», comprueba que es quien dice ser,
// pasa la acción por LAS MISMAS REGLAS que usa la app (js/oficio-nucleo.js) y, si las reglas dicen que sí, guarda.
//
// No sabe nada de Supabase ni de internet: habla con un «almacén» (ocho funciones, ver LEEME.md) y con un reloj. Así el
// mismo archivo corre en la función de Supabase, en el servidor local de las pruebas de pantallas y en las pruebas sin
// navegador. No lleva escrito ningún dato de ningún negocio.
//
// Lo que garantiza, cada cosa con su prueba (pruebas-reglas/prueba-juez.mjs y azar-juez.mjs):
//  - El orden lo pone él: guarda solo si nadie ha cambiado nada desde que leyó; si alguien se adelantó, vuelve a leer.
//  - Lo guardado es siempre igual a repetir su diario desde cero.
//  - Cada persona recibe solo lo suyo: la oficina, todo lo de su negocio; un técnico, sus avisos y su furgoneta; el cliente, su aviso.
//  - En su zona, el cliente entra con su teléfono y un código que le da la oficina, y recibe sus avisos y nada de nadie más.
//  - Una acción repetida (la red se cortó y el móvil la manda otra vez) no se hace dos veces.
//  - El equipo y sus accesos los lleva el negocio desde su app (la oficina o el dueño): dar un código nuevo (sale una sola
//    vez; se guarda solo su huella) o quitar el acceso. Nadie se queda fuera a sí mismo ni deja el negocio sin quien mande.
//  - Nunca lanza un error hacia fuera: contesta siempre {ok:true,…} o {ok:false,err}.

export const QUE = ['entrar', 'hacer', 'leer', 'pedir', 'huecos', 'ver', 'acceso', 'perfil', 'equipo', 'foto'];
export const TOPES = {
  accion: 400000,     // letras que puede pesar una acción (cabe una foto reducida)
  intentos: 5,        // veces que vuelve a leer si alguien se le adelanta
  pedirRed: [5, 3600000],     // citas desde la web: 5 por hora desde la misma conexión…
  pedirTodos: [40, 3600000],  // …y 40 por hora entre todas, por negocio
  dias: 5,            // días con huecos que se enseñan a quien pide cita
};

/* LA HORA DE UNA ACCIÓN (16-11-2026). Lo hecho sin conexión se apunta con la hora en que se hizo, no con la de cuando llega:
   un trabajo terminado a las 14:00 en un sótano sin cobertura no puede quedar terminado a las 18:00. El aparato manda
   cuándo lo hizo (t) y qué hora tiene al mandarlo (ya), los dos con su reloj; lo que cuenta es cuánto hace (ya − t), así
   da igual que su reloj vaya adelantado o atrasado. Como mucho tres días atrás, y nunca antes de lo último apuntado en
   ese aviso: el historial del aviso no se desordena. Sin t o con algo raro, la hora del juez. */
export const HACE_MAX = 3 * 86400000;

/* LAS FOTOS, APARTE (16-11-2026). Una foto que llega en una acción (la del cliente al pedir, las del trabajo al anotar) no
   se queda en el aviso ni en el diario: se guarda una sola vez en el almacén, junto con la acción, y el aviso lleva su
   referencia: «f:» y 16 letras, la huella de la foto. Así cargar los avisos no carga las fotos, y una foto se pide al
   verla (`que: 'foto'`), solo si quien la pide puede ver su aviso. */
export async function refDe(foto) {
  const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(foto));
  return 'f:' + [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
export function horaDe(n, cuando, A) {
  const hace = cuando && Number.isFinite(cuando.t) && Number.isFinite(cuando.ya) && cuando.t > 0 ? cuando.ya - cuando.t : 0;
  let t = hace > 0 ? n - Math.min(hace, HACE_MAX) : n;
  if (A && Array.isArray(A.h)) for (const x of A.h) if (x && Number.isFinite(x.t) && x.t > t) t = Math.min(x.t, n);
  return Math.round(t);
}

const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';   // sin la i, la l, la o, el 0 ni el 1: no se confunden al copiarlas
/** Una llave que no se puede adivinar: 24 letras al azar (unos 118 bits). */
export function llaveNueva(n = 24) {
  let s = '';
  while (s.length < n) { const a = new Uint8Array(n * 2); crypto.getRandomValues(a); for (const b of a) if (b < 248 && s.length < n) s += LETRAS[b % 31]; }   // 248 = 31 × 8: todas las letras salen igual de veces
  return s;
}
/** El código de la zona de un cliente: 8 letras en dos grupos («abcd-efgh»), con el mismo abecedario. */
export function codigoCliente() { const s = llaveNueva(8); return s.slice(0, 4) + '-' + s.slice(4); }
/** El código de una persona del equipo: 16 letras en cuatro grupos («abcd-efgh-jkmn-pqrs»), con el mismo abecedario. */
export function codigoPersona() { return llaveNueva(16).match(/.{4}/g).join('-'); }
/** Quién puede llevar el equipo: la oficina, o un técnico que es el dueño («jefe» en los datos del negocio). */
export const manda = (cfg, q) => !!q && (q.rol === 'centralita' || (q.rol === 'tecnico' && !!cfg.tec[q.id] && !!cfg.tec[q.id].jefe));
/** Un código de cliente tecleado con mayúsculas, espacios o sin guion vale igual: devuelve «abcd-efgh», o '' si no lo es. */
export function limpiaCodigo(c) {
  if (typeof c !== 'string' || c.length > 40) return '';
  const x = c.toLowerCase().replace(/[^a-z0-9]/g, '');
  return x.length === 8 && [...x].every(ch => LETRAS.includes(ch)) ? x.slice(0, 4) + '-' + x.slice(4) : '';
}

const texto = (x, max) => typeof x === 'string' && x.length > 0 && x.length <= max;
const R = (err, mas) => Object.assign({ ok: false, err }, mas);
const cabDe = S => ({ esq: S.esq, n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [], contratos: S.contratos || [], nc: S.nc || 0, vc: S.vc || 0, furgos: S.furgos || {} });   // para la oficina; de «furgos», cada técnico recibe solo la suya
// «vc» es la versión en la que cambiaron por última vez los contratos: la oficina los recibe solo si han cambiado desde lo
// que ya tiene, porque pueden ser muchos y llevar firmas, y la cabecera viaja con cada cambio

/** Lo que una persona puede recibir de un aviso guardado: entero, «ya no es tuyo» o nada. */
export function paraQuien(q, fila) {
  if (q.rol === 'centralita') return { id: fila.id, v: fila.v, datos: fila.datos };
  if (q.rol !== 'tecnico') return null;
  if (fila.datos.tec === q.id) return { id: fila.id, v: fila.v, datos: fila.datos };
  return (fila.de || []).includes(q.id) ? { id: fila.id, v: fila.v, fuera: true } : null;
}

export function crea({ K, almacen, ahora = () => Date.now(), llave = llaveNueva, aviso = () => {} }) {
  if (!K || typeof K.aplicar !== 'function') throw new Error('El juez necesita las reglas (OficioNucleo).');

  async function negocio(id) { if (!texto(id, 40)) return null; const n = await almacen.negocio(id); return n && n.activo && n.datos ? n : null; }

  /* quién es: lo dice el almacén a partir del código; un técnico tiene que existir en los datos del negocio */
  async function quien(neg, cfg, p) {
    if (!texto(p.persona, 40) || !texto(p.codigo, 80)) return R('clave');
    const e = await almacen.entra(neg.id, p.persona, p.codigo, texto(p.red, 80) ? p.red : '');   // «red»: la conexión, que la pone el servidor
    if (e === 'bloqueo') return R('bloqueo');
    if (!e || (e.rol !== 'centralita' && e.rol !== 'tecnico')) return R('clave');
    if (e.rol === 'tecnico' && !cfg.tec[e.id]) return R('clave');
    return { ok: true, q: { rol: e.rol, id: e.rol === 'centralita' ? 'oficina' : e.id } };
  }

  /* el estado con el que trabajan las reglas, tal como está guardado ahora */
  async function carga(neg) {
    const filas = (await almacen.vivos(neg.id)).slice().sort((a, b) => (a.datos.n || 0) - (b.datos.n || 0));
    const S = Object.assign({ esq: K.ESQ, n: 0, nu: 0, ausencias: [], contratos: [], nc: 0, vc: 0 }, neg.cab || {}, { v: neg.v || 0, avisos: filas.map(f => f.datos) });
    return { S, filas: new Map(filas.map(f => [f.id, f])) };
  }

  /* la huella de los datos del negocio que tiene el servidor (precios, horarios, equipo…): va al entrar, al leer y al hacer;
     la app la compara con la suya y, si no es la misma, lo dice en «Tu sesión». Sin ella (reglas de antes), cadena vacía y la
     app no dice nada. */
  async function huella(neg) { try { return typeof K.huellaDatos === 'function' ? await K.huellaDatos(neg.datos || {}) : ''; } catch (e) { return ''; } }

  /* lo cambiado desde una versión, ya recortado para quien lo pide */
  async function cambios(neg, q, desde) {
    const d = Number.isInteger(desde) && desde > 0 && desde <= (neg.v || 0) ? desde : 0;
    const c = await almacen.cambios(neg.id, d), esC = q.rol === 'centralita', cb = c.cab || {};
    let cab = { esq: cb.esq };
    if (esC) { cab = Object.assign({}, cb); if (d > 0 && !((cb.vc || 0) > d)) delete cab.contratos; }   // los contratos, solo si han cambiado
    else { const F = cb.furgos && typeof cb.furgos === 'object' && Object.prototype.hasOwnProperty.call(cb.furgos, q.id) ? cb.furgos[q.id] : null; cab.furgos = F ? { [q.id]: F } : {}; }   // el técnico, solo su furgoneta (16-11-2026)
    return { v: c.v, entero: d === 0, cab, avisos: c.avisos.map(f => paraQuien(q, f)).filter(Boolean) };
  }

  /* pasa una acción por las reglas y la guarda. Si alguien se adelanta, vuelve a leer y lo intenta sobre lo nuevo.
     «clave» es la marca que pone el aparato a cada acción para que, si la manda dos veces, se haga una sola. Vale solo
     para quien la puso: así nadie recibe el resultado de la acción de otro por usar su misma marca. */
  async function aplica(neg0, q, accion0, marca, cuando) {
    let accion = accion0, foto = null;
    if (accion && K.esRef && K.esRef(accion.foto)) return { res: R('foto') };   // una referencia solo la pone el juez: desde fuera sería ver la foto de otro
    if (accion && typeof accion.foto === 'string' && K.esFoto(accion.foto)) { foto = { ref: await refDe(accion.foto), datos: accion.foto }; accion = Object.assign({}, accion, { foto: foto.ref }); }
    const clave = texto(marca, 64) && marca.length >= 12 ? (q.rol === 'cliente' ? 'web' : q.rol + ':' + q.id) + '|' + marca : '';
    for (let i = 0; i < TOPES.intentos; i++) {
      const neg = i ? await negocio(neg0.id) : neg0; if (!neg) return { res: R('clave') };
      if (clave) { const ya = await almacen.hecha(neg.id, clave); if (ya) return { res: Object.assign({}, ya.res, { repetida: true }), nuevos: ya.nuevos || [] }; }
      const cfg = K.cfgDe(neg.datos), { S, filas } = await carga(neg), t = horaDe(ahora(), cuando, typeof accion.id === 'string' ? S.avisos.find(a => a.id === accion.id) : null);
      const antes = new Map(S.avisos.map(a => [a.id, JSON.stringify(a)])), contAntes = JSON.stringify(S.contratos || []);
      const r = K.aplicar(S, cfg, accion, q, t);
      if (!r.ok) return { res: R(r.err, { v: neg.v || 0 }) };
      if (JSON.stringify(S.contratos || []) !== contAntes) S.vc = S.v;
      const tocados = S.avisos.filter(a => antes.get(a.id) !== JSON.stringify(a)), nuevos = [];
      for (const a of tocados) if (!antes.has(a.id)) { a.llave = llave(); nuevos.push({ id: a.id, llave: a.llave }); }
      const guardar = tocados.map(a => { const f = filas.get(a.id), de = new Set((f && f.de) || []); if (a.tec) de.add(a.tec);
        return { id: a.id, v: S.v, datos: a, de: [...de], llave: a.llave || (f && f.llave) || '', vista: K.vistaCliente(S, cfg, a.id) }; });
      const res = { ok: true, r, v: S.v };
      const fotos = foto ? [{ ref: foto.ref, datos: foto.datos, aviso: accion.tipo === 'pedir' ? String(r.id || '') : String(accion.id || '') }] : [];
      const g = await almacen.guarda(neg.id, neg.v || 0, { v: S.v, cab: cabDe(S), avisos: guardar, diario: { v: S.v, t, q, accion, clave: clave || '', res, nuevos }, fotos });
      if (g && g.ok) return { res, nuevos };
    }
    return { res: R('lleno') };   // demasiada gente a la vez: el aparato lo intenta otra vez
  }

  const QUE_HACE = {
    /* Los datos del negocio van con la respuesta si la app no tiene ya estos (16-11-2026): manda la huella de los suyos y,
       si no es la misma, se le dan. Así la app hace las cuentas con lo mismo que el servidor, y el archivo público del
       negocio (el que lee la página de citas) no tiene por qué llevar lo que es solo de dentro, como el equipo */
    async entrar(neg, cfg, p) { const w = await quien(neg, cfg, p); if (!w.ok) return w; const h = await huella(neg);
      const r = { ok: true, rol: w.q.rol, id: w.q.id, v: neg.v || 0, huella: h };
      if (p.huella !== h && neg.datos && typeof neg.datos === 'object' && !Array.isArray(neg.datos)) r.datos = neg.datos;
      return r; },

    async leer(neg, cfg, p) { const w = await quien(neg, cfg, p); if (!w.ok) return w; return { ok: true, huella: await huella(neg), cambios: await cambios(neg, w.q, p.desde) }; },

    async hacer(neg, cfg, p) {
      const w = await quien(neg, cfg, p); if (!w.ok) return w;
      const a = p.accion; if (!a || typeof a !== 'object' || Array.isArray(a) || typeof a.tipo !== 'string') return R('accion');
      if (p.clave != null && !texto(p.clave, 64)) return R('accion');
      const { res } = await aplica(neg, w.q, a, p.clave || '', { t: p.t, ya: p.ya });
      const n2 = await negocio(neg.id);
      return n2 ? Object.assign({}, res, { cambios: await cambios(n2, w.q, p.desde), huella: await huella(n2) }) : res;
    },

    /* pedir cita desde la web: sin código, solo esa acción, y con freno */
    async pedir(neg, cfg, p) {
      const a = p.accion; if (!a || typeof a !== 'object' || Array.isArray(a) || a.tipo !== 'pedir') return R('permiso');
      if (p.clave != null && !texto(p.clave, 64)) return R('accion');
      if (!(await almacen.tope(neg.id, 'pedir:' + (texto(p.red, 80) ? p.red : '?'), TOPES.pedirRed[0], TOPES.pedirRed[1])) || !(await almacen.tope(neg.id, 'pedir', TOPES.pedirTodos[0], TOPES.pedirTodos[1]))) return R('limite');
      const { res, nuevos } = await aplica(neg, { rol: 'cliente', id: '' }, Object.assign({}, a, { origen: a.origen === 'web' ? 'web' : 'cita' }), p.clave || '');
      if (!res.ok) return R(res.err);
      const mio = (nuevos || []).find(x => x.id === res.r.id);
      return { ok: true, id: res.r.id, llave: mio ? mio.llave : '' };   // su número y su llave: nada más
    },

    /* los huecos para quien pide cita: días y franjas, sin cifras de la casa ni datos de nadie. Y, para quien tiene una
       urgencia, en cuánto se llegaría ahora a su barrio («dis», si lo da; si no, al más lejano): de «de» a «a» minutos,
       o null si ahora no hay nadie que pueda ir sin dejar tirada una cita */
    async huecos(neg, cfg, p) {
      const { S } = await carga(neg), t = ahora(), q = p && typeof p === 'object' ? p : {};
      const dis = typeof q.dis === 'string' && Object.prototype.hasOwnProperty.call(cfg.zonas.dis, q.dis) ? q.dis : null, av = typeof q.av === 'string' && Object.prototype.hasOwnProperty.call(cfg.av, q.av) ? q.av : '';
      const u = K.urgenciaAhora(S, cfg, dis, t, av);
      return { ok: true, dias: K.diasDe(S, cfg, t, TOPES.dias, false, av ? { av, cli: { dis: dis || '' } } : null).map(d => ({ dia: d.dia, hoy: !!d.hoy, franjas: d.franjas.map(f => ({ id: f.id, ok: !!f.ok })) })), urg: u ? { de: u.de, a: u.a } : null };
    },

    /* lo que ve el cliente con el enlace de su aviso */
    async ver(neg, cfg, p) {
      if (!texto(p.aviso, 40) || !texto(p.llave, 80)) return R('enlace');
      const v = await almacen.vista(neg.id, p.aviso, p.llave);
      return v ? { ok: true, vista: v } : R('enlace');
    },

    /* La oficina, para la zona de un cliente: el código de ese teléfono, el que ya tiene o uno nuevo si no lo tiene o se
       pide cambiarlo (entonces el de antes deja de valer). Solo la centralita y solo para un teléfono con algún aviso. */
    async acceso(neg, cfg, p) {
      const w = await quien(neg, cfg, p); if (!w.ok) return w;
      if (w.q.rol !== 'centralita') return R('permiso');
      const tel = K.tel9(p.tel); if (!tel) return R('tel');
      if (!K.perfilCliente((await carga(neg)).S, cfg, tel)) return R('nadie');
      const ya = p.cambia === true ? null : await almacen.cliente(neg.id, tel);
      if (ya && ya.activo && limpiaCodigo(ya.codigo) === ya.codigo) return { ok: true, tel, codigo: ya.codigo, nuevo: false };
      const codigo = codigoCliente(), g = await almacen.ponCliente(neg.id, tel, codigo);
      return g && g.ok ? { ok: true, tel, codigo, nuevo: true } : R('servidor');
    },

    /* El equipo y sus accesos (la oficina o el dueño). Sin «hace»: quién hay, quién puede entrar y lo último que se ha
       hecho. «hace: 'codigo'»: un código nuevo para esa persona (el de antes deja de valer; si no tenía acceso, se le da);
       sale solo en esta respuesta, porque se guarda su huella. «hace: 'baja'»: le quita el acceso (su app vuelve a la
       pantalla de entrar). Nadie se quita el acceso a sí mismo, y siempre queda alguien que puede llevar el equipo. */
    async equipo(neg, cfg, p) {
      const w = await quien(neg, cfg, p); if (!w.ok) return w;
      if (!manda(cfg, w.q)) return R('permiso');
      const lista = async () => {
        const P = (await almacen.personas(neg.id)) || [], por = new Map(P.map(x => [x.persona, x]));
        const estado = persona => { const x = por.get(persona); return !x ? 'sin' : x.activo ? 'activo' : 'baja'; };
        const L = [{ persona: 'oficina', nombre: 'Centralita', rol: 'centralita', jefe: false, estado: estado('oficina') }]
          .concat((neg.datos.tecnicos || []).filter(t => t && texto(t.id, 40)).map(t => ({ persona: t.id, nombre: [t.n, t.ap].filter(Boolean).join(' '), rol: 'tecnico', jefe: !!t.jefe, estado: estado(t.id) })));
        // quien tiene acceso y ya no está en los datos del negocio (un técnico que se fue): se le puede quitar, no dar
        for (const x of P) if (!L.some(y => y.persona === x.persona)) L.push({ persona: x.persona, nombre: x.persona, rol: x.rol, jefe: false, estado: x.activo ? 'activo' : 'baja', fuera: true });
        return L;
      };
      if (p.hace === undefined || p.hace === 'ver') return { ok: true, yo: p.persona, equipo: await lista(), accesos: (await almacen.accesos(neg.id)) || [] };
      if (p.hace !== 'codigo' && p.hace !== 'baja') return R('peticion');
      if (!texto(p.a, 40)) return R('peticion');
      const L = await lista(), x = L.find(y => y.persona === p.a);
      if (!x || (x.fuera && p.hace === 'codigo')) return R('nadie');
      if (p.hace === 'baja') {
        if (p.a === p.persona) return R('tuyo');
        if (x.estado !== 'activo') return { ok: true, persona: p.a, ya: true };
        if (!L.some(y => y.persona !== p.a && y.estado === 'activo' && (y.rol === 'centralita' || y.jefe))) return R('ultimo');
        if (!(await almacen.tope(neg.id, 'equipo', 30, 86400000))) return R('limite');
        const g = await almacen.bajaPersona(neg.id, p.a, p.persona);
        return g && g.ok ? { ok: true, persona: p.a } : R('servidor');
      }
      if (!(await almacen.tope(neg.id, 'equipo', 30, 86400000))) return R('limite');
      const codigo = codigoPersona(), g = await almacen.ponPersona(neg.id, p.a, x.rol, p.a, codigo, p.persona);
      return g && g.ok ? { ok: true, persona: p.a, codigo, tuyo: p.a === p.persona } : R('servidor');
    },

    /* una foto, por su referencia: la oficina, cualquiera de su negocio; un técnico, la de un aviso que puede ver; el
       cliente (con su teléfono y su código), la de un aviso suyo. A quien no puede verla se le dice lo mismo que si no
       existiera */
    async foto(neg, cfg, p) {
      if (typeof p.ref !== 'string' || !/^f:[0-9a-f]{16}$/.test(p.ref)) return R('foto');
      let q = null, tel = '';
      if (p.tel != null) { const c = await cliente(neg, p); if (!c.ok) return c; tel = c.tel; }
      else { const w = await quien(neg, cfg, p); if (!w.ok) return w; q = w.q; }
      const f = await almacen.foto(neg.id, p.ref); if (!f || typeof f.datos !== 'string') return R('nadie');
      const { filas } = await carga(neg), fila = filas.get(f.aviso), A = fila && fila.datos;
      const puede = A && (q ? (q.rol === 'centralita' || (paraQuien(q, fila) || {}).datos) : K.tel9(A.cli && A.cli.tel) === tel);
      return puede ? { ok: true, ref: p.ref, datos: f.datos } : R('nadie');
    },

    /* El cliente, en su zona: con su teléfono y su código recibe sus avisos (K.perfilCliente) y nada de nadie más. Los
       códigos fallados los cuenta el almacén por teléfono y por conexión, también los de un teléfono que no es de ningún
       cliente: así el freno no deja averiguar qué teléfonos lo son. */
    async perfil(neg, cfg, p) {
      const c = await cliente(neg, p); if (!c.ok) return c; const tel = c.tel;
      const { S, filas } = await carga(neg), Pf = K.perfilCliente(S, cfg, tel);
      if (!Pf) return R('nadie');
      for (const a of Pf.avisos) { const f = filas.get(a.id); a.llave = f && f.llave ? f.llave : ''; }   // la de su enlace: para seguirlo en directo
      return { ok: true, perfil: Pf };
    },
  };

  /* el cliente, con su teléfono y su código (en su zona, y para ver las fotos de sus avisos): {ok, tel} o el error. Los
     códigos fallados los cuenta el almacén por teléfono y por conexión */
  async function cliente(neg, p) {
    const tel = K.tel9(p.tel), codigo = limpiaCodigo(p.codigo);
    if (!tel || !codigo) return R('clave');
    const ok = await almacen.clienteEntra(neg.id, tel, codigo, texto(p.red, 80) ? String(p.red) : '');
    if (ok === 'bloqueo') return R('bloqueo');
    if (ok !== true) return R('clave');
    return { ok: true, tel };
  }

  /** La única entrada. Nunca lanza: contesta {ok:true,…} o {ok:false,err}. */
  async function atiende(p) {
    try {
      if (!p || typeof p !== 'object' || Array.isArray(p) || !QUE.includes(p.que)) return R('peticion');
      if (p.accion !== undefined) { let n = 0; try { n = JSON.stringify(p.accion).length; } catch (e) { return R('accion'); } if (n > TOPES.accion) return R('grande'); }
      const neg = await negocio(p.negocio);
      if (!neg) return R(p.que === 'ver' ? 'enlace' : p.que === 'pedir' || p.que === 'huecos' ? 'negocio' : 'clave');   // un negocio que no existe contesta lo mismo que un código malo
      return await QUE_HACE[p.que](neg, K.cfgDe(neg.datos), p);
    } catch (e) { try { aviso(e); } catch (x) { /* nada */ } return R('servidor'); }
  }

  return { atiende };
}
