// Un almacén de mentira, en memoria, con el mismo contrato que el de verdad (LEEME.md). Lo usan las pruebas del juez y
// el servidor local de las pruebas de pantallas. Devuelve siempre copias: quien lee no puede cambiar lo guardado.
// «estorbo» permite a las pruebas meterse entre la lectura y la escritura del juez, como haría otro aparato.
const copia = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));

export function creaAlmacen({ ahora = () => Date.now(), estorbo = null } = {}) {
  const N = new Map();   // negocio → {id, activo, datos, v, cab, avisos: Map, diario: [], personas: Map, fallos: [], topes: Map, clientes: Map, fallosCli: []}
  const neg = id => N.get(id) || null;
  return {
    /* ---- para montar la prueba (el de verdad lo hace con SQL) ---- */
    alta(id, datos, esq) { N.set(id, { id, activo: true, datos: copia(datos), v: 0, cab: { esq, n: 0, nu: 0, ausencias: [] }, avisos: new Map(), diario: [], personas: new Map(), fallos: [], topes: new Map(), clientes: new Map(), fallosCli: [], fotos: new Map() }); },
    persona(id, persona, rol, quien, codigo) { neg(id).personas.set(persona, { rol, id: quien, codigo }); },
    baja(id) { neg(id).activo = false; },
    crudo: id => neg(id),

    /* ---- el contrato ---- */
    async negocio(id) { const n = neg(id); return n ? { id: n.id, activo: n.activo, datos: copia(n.datos), v: n.v, cab: copia(n.cab) } : null; },
    /* como el de verdad: solo cuentan los fallos de una persona que existe; diez desde la misma conexión la bloquean a ella */
    async entra(id, persona, codigo, red = '') {
      const n = neg(id); if (!n || !n.activo) return null; const t = ahora();
      const p = n.personas.get(persona); if (!p || p.activo === false) return null;
      n.fallos = n.fallos.filter(x => t - x.t < 600000);
      const suyos = n.fallos.filter(x => x.persona === persona);
      if (suyos.filter(x => x.red === red).length >= 10 || suyos.length >= 200) return 'bloqueo';
      if (p.codigo !== codigo) { n.fallos.push({ t, persona, red }); return null; }
      return { rol: p.rol, id: p.id };
    },
    async vivos(id) { const n = neg(id); return n ? [...n.avisos.values()].map(f => { const x = copia(f); delete x.vista; return x; }) : []; },   // sin «vista», como el de verdad
    async hecha(id, clave) { const n = neg(id), d = n && clave ? n.diario.find(x => x.clave === clave) : null; return d ? { res: copia(d.res), nuevos: copia(d.nuevos) } : null; },
    async guarda(id, vAntes, cambio) {
      if (estorbo) await estorbo(id, vAntes, cambio);
      const n = neg(id); if (!n || n.v !== vAntes || cambio.v !== vAntes + 1) return { ok: false };
      if (cambio.diario.clave && n.diario.some(x => x.clave === cambio.diario.clave)) return { ok: false };
      n.v = cambio.v; n.cab = copia(cambio.cab);
      for (const f of cambio.avisos) n.avisos.set(f.id, copia(f));
      n.diario.push(copia(cambio.diario));
      for (const f of cambio.fotos || []) if (!n.fotos.has(f.ref)) n.fotos.set(f.ref, { aviso: f.aviso, datos: f.datos });   // la foto, una sola vez
      return { ok: true };
    },
    async cambios(id, desde) { const n = neg(id); return { v: n.v, cab: copia(n.cab), avisos: [...n.avisos.values()].filter(f => f.v > desde).map(copia) }; },
    async foto(id, ref) { const n = neg(id), f = n && n.fotos.get(ref); return f ? copia(f) : null; },
    async vista(id, aviso, llave) { const n = neg(id), f = n && n.avisos.get(aviso); return f && f.llave && f.llave === llave ? copia(f.vista) : null; },
    async tope(id, clave, max, ventana) { const n = neg(id); if (!n) return false; const t = ahora(), L = (n.topes.get(clave) || []).filter(x => t - x < ventana); if (L.length >= max) { n.topes.set(clave, L); return false; } L.push(t); n.topes.set(clave, L); return true; },
    /* el equipo: quién tiene acceso (sin códigos), dar un código nuevo, quitar el acceso y lo último que se ha hecho */
    async personas(id) { const n = neg(id); return n ? [...n.personas.entries()].map(([persona, p]) => ({ persona, rol: p.rol, quien: p.id, activo: p.activo !== false })) : []; },
    async ponPersona(id, persona, rol, quien, codigo, por) { const n = neg(id); if (!n) return { ok: false }; n.personas.set(persona, { rol, id: quien, codigo, activo: true }); (n.accesos = n.accesos || []).push({ cuando: ahora(), quien: por, que: 'codigo', a: persona }); return { ok: true }; },
    async bajaPersona(id, persona, por) { const n = neg(id), p = n && n.personas.get(persona); if (!p) return { ok: false }; p.activo = false; (n.accesos = n.accesos || []).push({ cuando: ahora(), quien: por, que: 'baja', a: persona }); return { ok: true }; },
    async accesos(id) { const n = neg(id); return n ? (n.accesos || []).slice(-20).reverse().map(copia) : []; },
    /* la zona del cliente: su código, que la oficina puede volver a mandar o cambiar */
    async cliente(id, tel) { const n = neg(id), c = n && n.clientes.get(tel); return c ? { codigo: c.codigo, activo: c.activo } : null; },
    async ponCliente(id, tel, codigo) { const n = neg(id); if (!n) return { ok: false }; n.clientes.set(tel, { codigo, activo: true }); return { ok: true }; },
    /* como el de verdad: cuentan todos los fallos, sea o no el teléfono de un cliente. Diez desde la misma conexión
       bloquean ese teléfono a esa conexión; doscientos, a todas; y cincuenta desde una conexión, con el teléfono que sea,
       bloquean esa conexión. */
    async clienteEntra(id, tel, codigo, red = '') {
      const n = neg(id); if (!n || !n.activo) return null; const t = ahora();
      n.fallosCli = n.fallosCli.filter(x => t - x.t < 600000);
      const suyos = n.fallosCli.filter(x => x.tel === tel);
      if (suyos.filter(x => x.red === red).length >= 10 || suyos.length >= 200 || n.fallosCli.filter(x => x.red === red).length >= 50) return 'bloqueo';
      const c = n.clientes.get(tel);
      if (!c || !c.activo || c.codigo !== codigo) { n.fallosCli.push({ t, tel, red }); return null; }
      return true;
    },
  };
}
