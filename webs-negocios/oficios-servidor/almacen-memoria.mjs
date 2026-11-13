// Un almacén de mentira, en memoria, con el mismo contrato que el de verdad (LEEME.md). Lo usan las pruebas del juez y
// el servidor local de las pruebas de pantallas. Devuelve siempre copias: quien lee no puede cambiar lo guardado.
// «estorbo» permite a las pruebas meterse entre la lectura y la escritura del juez, como haría otro aparato.
const copia = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));

export function creaAlmacen({ ahora = () => Date.now(), estorbo = null } = {}) {
  const N = new Map();   // negocio → {id, activo, datos, v, cab, avisos: Map, diario: [], personas: Map, fallos: [], topes: Map}
  const neg = id => N.get(id) || null;
  return {
    /* ---- para montar la prueba (el de verdad lo hace con SQL) ---- */
    alta(id, datos, esq) { N.set(id, { id, activo: true, datos: copia(datos), v: 0, cab: { esq, n: 0, nu: 0, ausencias: [] }, avisos: new Map(), diario: [], personas: new Map(), fallos: [], topes: new Map() }); },
    persona(id, persona, rol, quien, codigo) { neg(id).personas.set(persona, { rol, id: quien, codigo }); },
    baja(id) { neg(id).activo = false; },
    crudo: id => neg(id),

    /* ---- el contrato ---- */
    async negocio(id) { const n = neg(id); return n ? { id: n.id, activo: n.activo, datos: copia(n.datos), v: n.v, cab: copia(n.cab) } : null; },
    /* como el de verdad: solo cuentan los fallos de una persona que existe; diez desde la misma conexión la bloquean a ella */
    async entra(id, persona, codigo, red = '') {
      const n = neg(id); if (!n || !n.activo) return null; const t = ahora();
      const p = n.personas.get(persona); if (!p) return null;
      n.fallos = n.fallos.filter(x => t - x.t < 600000);
      const suyos = n.fallos.filter(x => x.persona === persona);
      if (suyos.filter(x => x.red === red).length >= 10 || suyos.length >= 200) return 'bloqueo';
      if (p.codigo !== codigo) { n.fallos.push({ t, persona, red }); return null; }
      return { rol: p.rol, id: p.id };
    },
    async vivos(id) { const n = neg(id); return n ? [...n.avisos.values()].map(copia) : []; },
    async hecha(id, clave) { const n = neg(id), d = n && clave ? n.diario.find(x => x.clave === clave) : null; return d ? { res: copia(d.res), nuevos: copia(d.nuevos) } : null; },
    async guarda(id, vAntes, cambio) {
      if (estorbo) await estorbo(id, vAntes, cambio);
      const n = neg(id); if (!n || n.v !== vAntes || cambio.v !== vAntes + 1) return { ok: false };
      if (cambio.diario.clave && n.diario.some(x => x.clave === cambio.diario.clave)) return { ok: false };
      n.v = cambio.v; n.cab = copia(cambio.cab);
      for (const f of cambio.avisos) n.avisos.set(f.id, copia(f));
      n.diario.push(copia(cambio.diario));
      return { ok: true };
    },
    async cambios(id, desde) { const n = neg(id); return { v: n.v, cab: copia(n.cab), avisos: [...n.avisos.values()].filter(f => f.v > desde).map(copia) }; },
    async vista(id, aviso, llave) { const n = neg(id), f = n && n.avisos.get(aviso); return f && f.llave && f.llave === llave ? copia(f.vista) : null; },
    async tope(id, clave, max, ventana) { const n = neg(id); if (!n) return false; const t = ahora(), L = (n.topes.get(clave) || []).filter(x => t - x < ventana); if (L.length >= max) { n.topes.set(clave, L); return false; } L.push(t); n.topes.set(clave, L); return true; },
  };
}
