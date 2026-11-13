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
//  - Cada persona recibe solo lo suyo: la oficina, todo lo de su negocio; un técnico, sus avisos; el cliente, su aviso.
//  - Una acción repetida (la red se cortó y el móvil la manda otra vez) no se hace dos veces.
//  - Nunca lanza un error hacia fuera: contesta siempre {ok:true,…} o {ok:false,err}.

export const QUE = ['entrar', 'hacer', 'leer', 'pedir', 'huecos', 'ver'];
export const TOPES = {
  accion: 400000,     // letras que puede pesar una acción (cabe una foto reducida)
  intentos: 5,        // veces que vuelve a leer si alguien se le adelanta
  pedirRed: [5, 3600000],     // citas desde la web: 5 por hora desde la misma conexión…
  pedirTodos: [40, 3600000],  // …y 40 por hora entre todas, por negocio
  dias: 5,            // días con huecos que se enseñan a quien pide cita
};

const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';   // sin la i, la l, la o, el 0 ni el 1: no se confunden al copiarlas
/** Una llave que no se puede adivinar: 24 letras al azar (unos 118 bits). */
export function llaveNueva(n = 24) {
  let s = '';
  while (s.length < n) { const a = new Uint8Array(n * 2); crypto.getRandomValues(a); for (const b of a) if (b < 248 && s.length < n) s += LETRAS[b % 31]; }   // 248 = 31 × 8: todas las letras salen igual de veces
  return s;
}

const texto = (x, max) => typeof x === 'string' && x.length > 0 && x.length <= max;
const R = (err, mas) => Object.assign({ ok: false, err }, mas);
const cabDe = S => ({ esq: S.esq, n: S.n || 0, nu: S.nu || 0, ausencias: S.ausencias || [] });

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
    const e = await almacen.entra(neg.id, p.persona, p.codigo);
    if (e === 'bloqueo') return R('bloqueo');
    if (!e || (e.rol !== 'centralita' && e.rol !== 'tecnico')) return R('clave');
    if (e.rol === 'tecnico' && !cfg.tec[e.id]) return R('clave');
    return { ok: true, q: { rol: e.rol, id: e.rol === 'centralita' ? 'oficina' : e.id } };
  }

  /* el estado con el que trabajan las reglas, tal como está guardado ahora */
  async function carga(neg) {
    const filas = (await almacen.vivos(neg.id)).slice().sort((a, b) => (a.datos.n || 0) - (b.datos.n || 0));
    const S = Object.assign({ esq: K.ESQ, n: 0, nu: 0, ausencias: [] }, neg.cab || {}, { v: neg.v || 0, avisos: filas.map(f => f.datos) });
    return { S, filas: new Map(filas.map(f => [f.id, f])) };
  }

  /* lo cambiado desde una versión, ya recortado para quien lo pide */
  async function cambios(neg, q, desde) {
    const d = Number.isInteger(desde) && desde > 0 && desde <= (neg.v || 0) ? desde : 0;
    const c = await almacen.cambios(neg.id, d), esC = q.rol === 'centralita';
    return { v: c.v, entero: d === 0, cab: esC ? c.cab : { esq: (c.cab || {}).esq }, avisos: c.avisos.map(f => paraQuien(q, f)).filter(Boolean) };
  }

  /* pasa una acción por las reglas y la guarda. Si alguien se adelanta, vuelve a leer y lo intenta sobre lo nuevo.
     «clave» es la marca que pone el aparato a cada acción para que, si la manda dos veces, se haga una sola. Vale solo
     para quien la puso: así nadie recibe el resultado de la acción de otro por usar su misma marca. */
  async function aplica(neg0, q, accion, marca) {
    const clave = texto(marca, 64) && marca.length >= 12 ? (q.rol === 'cliente' ? 'web' : q.rol + ':' + q.id) + '|' + marca : '';
    for (let i = 0; i < TOPES.intentos; i++) {
      const neg = i ? await negocio(neg0.id) : neg0; if (!neg) return { res: R('clave') };
      if (clave) { const ya = await almacen.hecha(neg.id, clave); if (ya) return { res: Object.assign({}, ya.res, { repetida: true }), nuevos: ya.nuevos || [] }; }
      const cfg = K.cfgDe(neg.datos), { S, filas } = await carga(neg), t = ahora();
      const antes = new Map(S.avisos.map(a => [a.id, JSON.stringify(a)]));
      const r = K.aplicar(S, cfg, accion, q, t);
      if (!r.ok) return { res: R(r.err, { v: neg.v || 0 }) };
      const tocados = S.avisos.filter(a => antes.get(a.id) !== JSON.stringify(a)), nuevos = [];
      for (const a of tocados) if (!antes.has(a.id)) { a.llave = llave(); nuevos.push({ id: a.id, llave: a.llave }); }
      const guardar = tocados.map(a => { const f = filas.get(a.id), de = new Set((f && f.de) || []); if (a.tec) de.add(a.tec);
        return { id: a.id, v: S.v, datos: a, de: [...de], llave: a.llave || (f && f.llave) || '', vista: K.vistaCliente(S, cfg, a.id) }; });
      const res = { ok: true, r, v: S.v };
      const g = await almacen.guarda(neg.id, neg.v || 0, { v: S.v, cab: cabDe(S), avisos: guardar, diario: { v: S.v, t, q, accion, clave: clave || '', res, nuevos } });
      if (g && g.ok) return { res, nuevos };
    }
    return { res: R('lleno') };   // demasiada gente a la vez: el aparato lo intenta otra vez
  }

  const QUE_HACE = {
    async entrar(neg, cfg, p) { const w = await quien(neg, cfg, p); if (!w.ok) return w; return { ok: true, rol: w.q.rol, id: w.q.id, v: neg.v || 0 }; },

    async leer(neg, cfg, p) { const w = await quien(neg, cfg, p); if (!w.ok) return w; return { ok: true, cambios: await cambios(neg, w.q, p.desde) }; },

    async hacer(neg, cfg, p) {
      const w = await quien(neg, cfg, p); if (!w.ok) return w;
      const a = p.accion; if (!a || typeof a !== 'object' || Array.isArray(a) || typeof a.tipo !== 'string') return R('accion');
      if (p.clave != null && !texto(p.clave, 64)) return R('accion');
      const { res } = await aplica(neg, w.q, a, p.clave || '');
      const n2 = await negocio(neg.id);
      return n2 ? Object.assign({}, res, { cambios: await cambios(n2, w.q, p.desde) }) : res;
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

    /* los huecos para quien pide cita: días y franjas, sin cifras de la casa ni datos de nadie */
    async huecos(neg, cfg) {
      const { S } = await carga(neg), t = ahora();
      return { ok: true, dias: K.diasDe(S, cfg, t, TOPES.dias).map(d => ({ dia: d.dia, hoy: !!d.hoy, franjas: d.franjas.map(f => ({ id: f.id, ok: !!f.ok })) })) };
    },

    /* lo que ve el cliente con el enlace de su aviso */
    async ver(neg, cfg, p) {
      if (!texto(p.aviso, 40) || !texto(p.llave, 80)) return R('enlace');
      const v = await almacen.vista(neg.id, p.aviso, p.llave);
      return v ? { ok: true, vista: v } : R('enlace');
    },
  };

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
