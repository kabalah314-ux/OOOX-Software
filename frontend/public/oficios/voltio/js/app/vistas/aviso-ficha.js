/* OOOX Oficios · la app (app.html), vistas/aviso-ficha. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* el aviso con su marco (20-11-2026): el título, su recorrido y, fijas al bajar, las pestañas. La oficina: «Resumen» (lo
   que toca ahora: quién va y cuándo, o cómo va), «Cliente», «Trabajo» (el dinero y el material) y «Mensajes» (con el
   historial). El técnico: «Cliente», «Trabajo» y «Mensajes»; trabajando, se abre en «Trabajo». La acción principal, abajo */
function vAviso(id) {
  const A = el(id),
    esT = Q.rol === 'tecnico';
  if (!A)
    return (
      '<div class="cab"><div><h1>Aviso</h1><p class="sub">No encuentro el aviso ' +
      esc(id) +
      '.' +
      (Oficio.DEMO ? ' Puede que la demo se haya reiniciado.' : '') +
      '</p></div></div><p class="fin"><a class="txt" href="#/">Volver al inicio</a></p>'
    );
  const av = cfg.av[A.av],
    mio = esT && A.tec === Q.id,
    abierto = ['nuevo', 'asignado', 'ausente'].includes(A.e),
    t = cfg.tec[A.tec];
  const r0 = ruta(),
    pide = r0.v === 'aviso' && r0.a === A.id ? r0.b : '',
    M = A.msgs.filter(m => !m.env && m.t <= Date.now() && (pro() || m.k !== 'resena'));
  let h = '<a class="atras" href="#/' + (esT ? 'hoy' : 'bandeja') + '">' + I.atras + (esT ? 'Hoy' : 'Bandeja') + '</a>';
  h +=
    '<div class="cab"><div><h1>' +
    esc(av.n) +
    '</h1><p class="sub">' +
    A.id +
    (barrio(A) ? ' · ' + esc(barrio(A)) : '') +
    ' · ' +
    (A.cita ? 'cita ' + diaTxt(A.cita.dia) + ', ' + frTxt(A.cita.fr) : 'urgente') +
    '</p></div><span class="pill ' +
    A.e +
    '">' +
    EST[A.e] +
    '</span></div>' +
    pista(A);
  const TT = (
    esT
      ? [
          ['cliente', 'Cliente'],
          ['trabajo', 'Trabajo']
        ].concat(mio ? [['mensajes', 'Mensajes']] : [])
      : [
          ['resumen', 'Resumen'],
          ['cliente', 'Cliente'],
          ['trabajo', 'Trabajo'],
          ['mensajes', 'Mensajes']
        ]
  ).map(x => ({ k: x[0], t: x[1], h: '#/aviso/' + A.id + '/' + x[0], n: x[0] === 'mensajes' && !esT ? M.length : 0 }));
  const k = TT.some(x => x.k === pide) ? pide : esT ? (mio && A.e === 'curso' ? 'trabajo' : 'cliente') : 'resumen';
  h += pestas(TT, k, 'Qué ver del aviso');
  let c = '';
  if (esT) {
    if (k === 'cliente')
      c =
        bGar(A) +
        bZona(A) +
        bCliente(A, true) +
        bContrato(A) +
        (mio ? bGeo(A) : '') +
        (!mio
          ? '<p class="hueco" style="margin-top:12px">' + (t ? 'Este aviso lo lleva ' + esc(t.n) + '.' : 'Este aviso todavía no tiene técnico.') + '</p>'
          : '');
    else if (k === 'trabajo') {
      c = bGar(A) + (mio && A.e === 'curso' ? bTrabajo(A) : '') + bFalta(A) + (pro() ? bDinero(A) : '');
      if (!c) c = '<p class="hueco" style="margin-top:12px">Aún no hay nada del trabajo. Al llegar, «Empezar»: el cliente firma el precio y empieza.</p>';
    } else c = bMensajes(A) || '<p class="hueco" style="margin-top:12px">No hay mensajes para este cliente.</p>';
    h += '<div class="pcuerpo">' + c + '</div>';
    if (mio && A.e === 'asignado') h += '<div class="accion">' + bVoy(A, 'btn pri ancho') + '</div>';
    else if (mio && A.e === 'camino')
      h +=
        '<div class="accion"><button class="btn pri ancho" data-a="empezar" data-id="' +
        A.id +
        '">Empezar</button><button class="txt" data-a="ausente" data-id="' +
        A.id +
        '">No había nadie</button></div>';
    else if (mio && A.e === 'curso') h += '<div class="accion"><button class="btn pri ancho" data-a="terminar" data-id="' + A.id + '">Terminado</button></div>';
    return h;
  }
  if (k === 'resumen') {
    if (M.length)
      c +=
        '<p class="ojo" id="msgPend"><span>Falta mandar «' +
        K.MSG[M[0].k] +
        '»' +
        (M.length > 1 ? ' y ' + (M.length - 1) + ' más' : '') +
        '.</span><button class="btn peq" data-a="msg" data-id="' +
        A.id +
        '" data-k="' +
        M[0].k +
        '">Mandar</button></p>';
    if (A.e === 'asignado' && A.cita && t) {
      const ahora = Date.now(),
        f = cfg.franjas.find(x => x.id === A.cita.fr);
      if (!K.voyYa(cfg, A, ahora))
        c +=
          '<p class="mnota" id="salida" style="margin-top:12px">Asignado a ' +
          esc(t.n) +
          ' · aún no puede salir: «Voy» se le enciende ' +
          cuandoVoy(K.voyDesde(cfg, A)) +
          '.</p>';
      else if (f && K.voyTarde(cfg, A, ahora))
        c += '<p class="ojo" id="salida">' + esc(t.n) + ' va tarde: su franja empezó a las ' + hm(f.de) + ' y todavía no ha dicho «Voy».</p>';
    }
    /* si tiene contrato (o lo quiere), arriba: cambia lo que se cobra y quién va primero. Ofrecerlo, en «Cliente» */
    c += bGar(A) + bZona(A) + bContrato(A, true);
    /* lo principal según el estado: por repartir, quién va y cuándo; si no, cómo va */
    c += abierto && A.cli.tel ? bCuenta(A) + bReparto(A) + bCita(A) : abierto ? bCliente(A, false) : bDice(A) + bEstado(A);
    if (A.e === 'camino' && A.pos && t)
      c +=
        '<p class="mnota" id="posOf" style="margin-top:12px">' + esc(t.n) + ' compartió su posición ' + hace(A.pos.t) + '. El cliente la ve en su página.</p>';
    c += bHist(A);
  } else if (k === 'cliente') c = bCliente(A, false) + bContrato(A);
  else if (k === 'trabajo')
    c =
      bDinero(A) + bFalta(A) ||
      '<p class="hueco" style="margin-top:12px">Aún no hay nada del trabajo. Cuando el técnico empiece, aquí sale el presupuesto firmado.</p>';
  else c = bMensajes(A) || '<p class="hueco" style="margin-top:12px">No hay mensajes para este cliente.</p>';
  return h + '<div class="pcuerpo">' + c + '</div>' + bAccOf(A);
}
/* desde su zona, el cliente dice que ya lo ha pagado (19-11-2026): se mira en el banco y se apunta el cobro. Sale en el
   «Resumen» y en «Trabajo», junto a «Apuntar cobro» */
const bDice = A => {
  const p = A.pago;
  return p && !p.cobrado && p.dice
    ? '<p class="ojo" id="dice">El cliente dice que lo ha pagado por ' +
        PAGO[p.dice.modo].toLowerCase() +
        ' ' +
        hace(p.dice.t) +
        '. Míralo en el banco y apunta el cobro.</p>'
    : '';
};
/* «Resumen» de un aviso que ya no está por repartir: quién lo lleva y cómo va; el dinero, si lo hay */
function bEstado(A) {
  const t = cfg.tec[A.tec],
    L = [],
    p = A.pago;
  if (t)
    L.push(
      '<p class="gr">' +
        esc(t.n) +
        ' ' +
        esc(t.ap) +
        '</p><p class="ln">' +
        (A.e === 'camino'
          ? 'De camino: llega sobre las ' + K.hora(A.eta) + '.'
          : A.e === 'curso'
            ? 'Trabajando: lleva ' + dur(K.minutos(A, Date.now())) + '.'
            : A.e === 'hecho'
              ? 'Terminado ' + hace(A.fin) + '.'
              : A.e === 'cancelado'
                ? 'Cancelado.'
                : '') +
        '</p>'
    );
  else L.push('<p class="ln">' + (A.e === 'cancelado' ? 'Cancelado.' : 'Sin técnico.') + '</p>');
  if (A.tot)
    L.push(
      '<p class="ln">' +
        (A.e === 'hecho' ? 'Total' : 'Presupuesto firmado') +
        ': <b class="num">' +
        K.eur(A.tot.total) +
        '</b>' +
        (p ? (p.cobrado ? ' · cobrado' : ' · pendiente de pago') : '') +
        (A.fac ? ' · facturado' : '') +
        '</p>'
    );
  L.push('<p class="ln">' + esc(K.nomCli(A.cli) || 'Aún sin nombre') + (A.cli.dir ? ' · ' + esc(A.cli.dir) : '') + '</p>');
  return '<section class="blq" id="estado"><h2>Cómo va</h2>' + L.join('') + '</section>';
}
/* la ficha de la oficina: el estado y lo principal del aviso, siempre a mano abajo, también en una ficha larga y a 320 px
   (auditoría UX-17). Primero lo que toca: completar los datos, asignar (en una urgencia, a quien antes llega) o mandar el mensaje */
function bAccOf(A) {
  if (A.e === 'hecho') return bAccHecho(A);
  if (!['nuevo', 'asignado', 'ausente'].includes(A.e)) return '';
  const t = cfg.tec[A.tec],
    datos = A.cli.tel && A.cli.dir,
    M = A.msgs.filter(m => !m.env && m.t <= Date.now() && (pro() || m.k !== 'resena')),
    sin = !A.tec || A.e === 'ausente';
  const ua =
      sin && datos && !A.cita && A.e === 'nuevo'
        ? K.urgenciaAhora(Object.assign({}, S, { avisos: S.avisos.filter(x => x.id !== A.id) }), cfg, A.cli.dis, Date.now(), A.av)
        : null,
    B = [];
  if (!datos) B.push('<button class="btn pri peq" data-a="completar" data-id="' + A.id + '">Completar los datos</button>');
  else if (sin)
    B.push(
      ua
        ? '<button class="btn pri peq" data-a="asignar" data-id="' + A.id + '" data-tec="' + ua.tec + '">Asignar a ' + esc(cfg.tec[ua.tec].n) + '</button>'
        : '<button class="btn pri peq" data-a="irSec" data-sec="reparto" data-ir="#/aviso/' + A.id + '">Elegir técnico</button>'
    );
  if (M.length)
    B.push(
      '<button class="btn peq' +
        (B.length ? '' : ' pri') +
        '" data-a="msg" data-id="' +
        A.id +
        '" data-k="' +
        M[0].k +
        '" aria-label="Mandar «' +
        K.MSG[M[0].k] +
        '»">Mandar mensaje</button>'
    );
  if (datos && !sin) B.push('<button class="btn peq" data-a="irSec" data-sec="reparto" data-ir="#/aviso/' + A.id + '">Cambiar técnico</button>');
  B.push('<button class="btn peq" data-a="cita" data-id="' + A.id + '">' + (A.cita ? 'Cambiar la hora' : 'Dar cita') + '</button>');
  const est =
    (A.e === 'ausente' ? 'No había nadie' : t ? 'Asignado a ' + esc(t.n) : 'Sin técnico') +
    ' · ' +
    (A.cita ? diaCorto(A.cita.dia) + ', ' + frTxt(A.cita.fr) : 'urgente');
  return (
    '<div class="accion of" role="region" aria-label="Lo principal del aviso"><div class="est"><p class="ln">' +
    est +
    '</p><button class="txt mal" data-a="cancelar" data-id="' +
    A.id +
    '" aria-label="Cancelar el aviso">Cancelar</button></div><div class="acs">' +
    B.join('') +
    '</div></div>'
  );
}

/* terminado (20-11-2026): lo que queda, abajo y a mano: apuntar el cobro y, cobrado, marcar la factura */
function bAccHecho(A) {
  const T = A.tot,
    p = A.pago;
  if (!T || !T.total || !p) return '';
  const B = [];
  if (!p.cobrado) B.push('<button class="btn pri peq" data-a="cobrar" data-id="' + A.id + '">Apuntar cobro</button>');
  else if (!A.fac)
    B.push(
      '<button class="btn peq" data-a="copiaFac" data-id="' +
        A.id +
        '">Copiar los datos</button><button class="btn pri peq" data-a="facturar" data-id="' +
        A.id +
        '">Marcar como facturada</button>'
    );
  if (!B.length) return '';
  return (
    '<div class="accion of" role="region" aria-label="Lo que queda del aviso"><div class="est"><p class="ln">Terminado · ' +
    K.eur(T.total) +
    ' · ' +
    (p.cobrado ? 'cobrado, falta la factura' : 'pendiente de pago') +
    '</p></div><div class="acs">' +
    B.join('') +
    '</div></div>'
  );
}
/* ===== técnico: su posición, solo si el negocio tiene el mapa activado y solo desde «Voy» hasta llegar =====
   El móvil la da mientras la app está en pantalla. Se manda como mucho cada 20 segundos, o antes si se ha movido unos 40 metros.
   Solo se guarda la última; al llegar, al no encontrar a nadie o al pulsar «Dejar de compartir», se borra. */
const GEO = { id: '', w: null, e: '', ult: 0, lat: 0, lon: 0 };
function geoPara() {
  if (GEO.w != null && navigator.geolocation)
    try {
      navigator.geolocation.clearWatch(GEO.w);
    } catch (e) {}
  GEO.w = null;
  GEO.id = '';
  GEO.e = '';
}
function geoSync() {
  const A = Q.rol === 'tecnico' && cfg.mapa ? S.avisos.find(a => a.tec === Q.id && a.e === 'camino' && !a.posNo) : null;
  if (!A) {
    if (GEO.id) geoPara();
    return;
  }
  if (GEO.id === A.id) return;
  geoPara();
  GEO.id = A.id;
  GEO.ult = 0;
  if (!navigator.geolocation) {
    GEO.e = 'sin';
    return;
  }
  GEO.e = 'busca';
  const id = A.id;
  const bien = p => {
    if (GEO.id !== id) return;
    const c = p.coords,
      ahora = Date.now(),
      lejos = Math.abs(c.latitude - GEO.lat) + Math.abs(c.longitude - GEO.lon) > 0.0004;
    if (GEO.e === 'ok' && ahora - GEO.ult < 20000 && !lejos) return;
    const r = Oficio.hacer({ tipo: 'posicion', id, lat: c.latitude, lon: c.longitude }, Q);
    if (r.ok) {
      GEO.e = 'ok';
      GEO.ult = ahora;
      GEO.lat = c.latitude;
      GEO.lon = c.longitude;
    } else if (r.err !== 'posicion') geoPara();
  };
  const mal = e => {
    if (GEO.id !== id) return;
    const antes = GEO.e;
    GEO.e = e && e.code === 1 ? 'no' : GEO.e === 'ok' ? 'ok' : 'falla';
    if (GEO.e !== antes && ruta().v === 'aviso') pinta();
  };
  try {
    GEO.w = navigator.geolocation.watchPosition(bien, mal, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  } catch (e) {
    GEO.e = 'sin';
  }
}
function bGeo(A) {
  if (!cfg.mapa || A.e !== 'camino') return '';
  const txt = A.posNo
    ? 'Has dejado de compartir tu posición en este aviso. El cliente ve solo la hora de llegada.'
    : A.pos
      ? 'El cliente ve dónde estás hasta que llegues. Última vez, ' + hace(A.pos.t) + '. Si pasas a otra app o bloqueas el móvil, se queda en la última.'
      : GEO.e === 'no'
        ? 'No se comparte: este móvil no ha dado permiso de ubicación a la app. El cliente ve solo la hora de llegada.'
        : GEO.e === 'sin' || GEO.e === 'falla'
          ? 'Este móvil no da la ubicación ahora mismo. El cliente ve solo la hora de llegada.'
          : 'Buscando tu posición para enseñársela al cliente…';
  return (
    '<section class="blq" id="geo"><h2>Tu posición</h2><p class="ln" id="geoT">' +
    txt +
    '</p>' +
    (A.posNo ? '' : '<div class="acts"><button class="btn peq" data-a="geoNo" data-id="' + A.id + '">Dejar de compartir</button></div>') +
    '</section>'
  );
}
