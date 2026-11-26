/* OOOX Oficios · la app (app.html), vistas/bandeja. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
function fila(A, sel, o) {
  o = o || {};
  if (o.tec) return filaTec(A, o);
  const av = cfg.av[A.av],
    t = cfg.tec[A.tec],
    quien = K.nomCli(A.cli) || 'Aún sin nombre';
  let f2,
    fd,
    f3 = '',
    ua = null;
  const cita = A.cita ? diaCorto(A.cita.dia) + ', ' + frTxt(A.cita.fr) : '';
  const pc = A.cita && A.cita.ok === false ? ' · por confirmar' : '';
  if (A.e === 'nuevo' || A.e === 'ausente') {
    ua =
      !cita && A.e === 'nuevo' && A.cli.tel
        ? K.urgenciaAhora(Object.assign({}, S, { avisos: S.avisos.filter(x => x.id !== A.id) }), cfg, A.cli.dis, Date.now(), A.av)
        : null;
    const et = A.e === 'ausente' ? 'No había nadie' : !A.cli.tel ? 'Faltan datos' : A.reasignar ? 'Reasignar' : '';
    f2 = cita ? cita + pc + ' · ' + quien : hace(A.t).replace(/^h/, 'H').replace(/^a/, 'A') + ' · ' + quien + ' · ' + ORIG[A.origen];
    if (ua) f3 = 'Antes llega ' + cfg.tec[ua.tec].n + ', en ~' + ua.de + ' min';
    fd = et || !o.sinPill ? '<span class="pill ' + (A.e === 'ausente' ? 'ausente' : 'nuevo') + '">' + (et || 'Sin asignar') + '</span>' : '';
  } else if (A.e === 'hecho') {
    f2 = o.cobro ? 'terminado ' + hace(A.fin) + ' · ' + quien : (t ? t.n + ' · ' : '') + quien;
    fd =
      o.cobro && A.tot
        ? '<span class="num">' + K.eur(A.tot.total) + '</span>'
        : A.tot && A.pago && pro()
          ? '<span class="num">' +
            K.eur(A.tot.total) +
            '</span>' +
            (A.pago.cobrado
              ? '<span class="mini">' + (A.tot.total ? PAGO[A.pago.modo] : A.enGar ? 'En garantía' : 'En su contrato') + '</span>'
              : '<span class="pill cobro">Por cobrar</span>')
          : '<span class="pill hecho">Terminado</span>';
  } else if (A.e === 'cancelado') {
    f2 = quien;
    fd = '<span class="pill">Cancelado</span>';
  } else {
    f2 =
      (A.e === 'camino'
        ? 'llega sobre las ' + K.hora(A.eta)
        : A.e === 'curso'
          ? 'lleva ' + dur(K.minutos(A, Date.now()))
          : cita
            ? cita + pc
            : 'urgente, ' + hace(A.t)) +
      (t ? ' · ' + t.n : '') +
      (A.e === 'asignado' && A.cita && A.cita.dia === K.madrid().date && !K.voyYa(cfg, A, Date.now()) ? ' · aún no puede salir' : '');
    fd = '<span class="pill ' + A.e + '">' + EST[A.e] + '</span>';
  }
  const dar =
    o.dar && ua
      ? '<button class="btn peq dar" data-a="asignar" data-id="' + A.id + '" data-tec="' + ua.tec + '">Asignar a ' + esc(cfg.tec[ua.tec].n) + '</button>'
      : '';
  return (
    '<li' +
    (dar ? ' class="cdar"' : '') +
    '><a class="fila' +
    (A.urg && (A.e === 'nuevo' || A.e === 'ausente') ? ' urg' : '') +
    '" href="#/aviso/' +
    A.id +
    '"' +
    (sel === A.id ? ' aria-current="true"' : '') +
    '><span class="f1">' +
    esc(av.n) +
    (barrio(A) ? ' · ' + esc(barrio(A)) : '') +
    '</span><span class="f2">' +
    esc(f2) +
    (A.con && A.e !== 'hecho' && A.e !== 'cancelado' ? ' · con contrato' : '') +
    (['nuevo', 'asignado', 'ausente'].includes(A.e)
      ? A.foto
        ? ' · con foto'
        : A.nota
          ? ' · con nota'
          : A.origen === 'cita' || A.origen === 'web'
            ? ' · sin detalle'
            : ''
      : '') +
    '</span>' +
    (f3 ? '<span class="f3">' + esc(f3) + '</span>' : '') +
    (fd ? '<span class="fd">' + fd + '</span>' : '') +
    '</a>' +
    dar +
    '</li>'
  );
}
/* la fila en «Hoy» del técnico: qué y dónde; a qué hora llegaría (o el día y la franja) y la calle */
function filaTec(A, o) {
  const av = cfg.av[A.av],
    ll = o.llega && o.llega[A.id];
  const cuando =
    A.e === 'camino'
      ? 'llegas sobre las ' + K.hora(A.eta)
      : A.e === 'curso'
        ? 'trabajando'
        : ll != null
          ? 'hacia las ' + K.hhmm(ll) + (A.cita ? ' (' + frTxt(A.cita.fr) + ')' : '')
          : A.cita
            ? diaCorto(A.cita.dia) + ', ' + frTxt(A.cita.fr)
            : 'urgente, ' + hace(A.t);
  return (
    '<li><a class="fila' +
    (A.urg ? ' urg' : '') +
    '" href="#/aviso/' +
    A.id +
    '"><span class="f1">' +
    esc(av.n) +
    (barrio(A) ? ' · ' + esc(barrio(A)) : '') +
    '</span><span class="f2">' +
    esc(cuando) +
    ' · ' +
    esc(A.cli.dir || 'Aún sin dirección') +
    '</span>' +
    (A.e !== 'asignado' ? '<span class="fd"><span class="pill ' + A.e + '">' + EST[A.e] + '</span></span>' : '') +
    '</a></li>'
  );
}
const sec = (tit, L, sel, vacio, o) =>
  '<section class="sec"' +
  (o && o.id ? ' id="' + o.id + '" tabindex="-1"' : '') +
  '><h2>' +
  tit +
  ' <span class="n">' +
  L.length +
  '</span></h2>' +
  (L.length ? '<ul class="lista">' + L.map(a => fila(a, sel, o)).join('') + '</ul>' : '<p class="hueco">' + vacio + '</p>') +
  '</section>';
function tira() {
  const r = K.resumen(S, cfg, Date.now()),
    U = { urg: true, cli: { dis: '' } };
  return (
    '<ul class="tira" aria-label="Dónde está cada técnico">' +
    N.tecnicos
      .map(t => {
        const x = r.tec[t.id],
          A = x.aviso && el(x.aviso);
        const lib = K.ocupacion(S, cfg, t.id, Date.now()),
          fin = lib ? ' · libre ~' + K.hora(Date.now() + lib * 60000) : '';
        /* quien falta hoy, o ahora no trabaja y no hace guardias, no sale «libre»: para una urgencia no se puede contar con él */
        const no = x.e === 'libre' ? K.puedeIr(S, cfg, U, t.id, Date.now()) : '';
        return (
          '<li class="' +
          (x.e !== 'libre' ? 'on' : no ? 'off' : '') +
          '">' +
          ava(t.id) +
          '<span>' +
          esc(t.n) +
          '<small>' +
          (x.e === 'curso'
            ? 'trabajando en ' + esc(barrio(A)) + fin
            : x.e === 'camino'
              ? 'de camino a ' + esc(barrio(A)) + fin
              : no === 'ausente_tec'
                ? 'hoy no está'
                : lib
                  ? 'con urgencias en cola' + fin
                  : no === 'horario'
                    ? 'fuera de horario'
                    : 'libre') +
          '</small></span></li>'
        );
      })
      .join('') +
    '</ul>' +
    bUrgAhora()
  );
}
/* para una urgencia que entre ahora: quién llega antes y en cuánto, o que no hay nadie sin dejar tirada una cita */
function bUrgAhora() {
  const L = K.llegadas(S, cfg, null, Date.now(), '').filter(x => !x.choca && !x.fuera);
  return (
    '<p class="urgah" id="urgAhora">' +
    (L.length
      ? 'Para una urgencia ahora: ' +
        esc(cfg.tec[L[0].tec].n) +
        (L[0].libre ? ', libre hacia las ' + K.hora(Date.now() + L[0].libre * 60000) : ', libre ya') +
        '. Llega en ' +
        (L[0].libre
          ? 'unos ' + L[0].llega + ' min'
          : 'lo que se tarde hasta el barrio (de ' + Math.min.apply(null, Object.values(cfg.zonas.banda)) + ' a ' + cfg.etaMax + ' min)') +
        '.'
      : 'Para una urgencia ahora no hay nadie libre sin llegar tarde a una cita o salirse de su horario.') +
    '</p>'
  );
}

/* «Más» (propuesta UX, 26-11-2026): lo que no corre prisa, fuera del menú de abajo. Cobros, Contratos y Mejoras, con su número */
function masItems() {
  if (!S || Q.rol === 'tecnico') return [];
  const L = [];
  if (pro()) L.push({ k: 'cobros', t: 'Cobros', d: 'Lo que falta por cobrar y por facturar', n: K.resumen(S, cfg, Date.now()).pend.n, i: I.euro });
  if (HAY_CON())
    L.push({
      k: 'contratos',
      t: 'Contratos',
      d: 'Altas, revisiones y cuotas de mantenimiento',
      n: (p => p.renovar.length + p.revision.length + p.cobrar.length)(K.pendientesContratos(S, cfg, Date.now())),
      i: I.hecho
    });
  if (SOP) L.push({ k: 'mejoras', t: 'Mejoras', d: 'Pide cambios a OOOX y mira las novedades', n: SOP.sinLeer(), u: ' sin leer', i: I.mejoras });
  return L;
}
const masN = () => masItems().reduce((a, x) => a + (x.n || 0), 0);
function vMas() {
  return (
    '<div class="cab"><div><h1>Más</h1><p class="sub">Lo que no corre prisa.</p></div></div><ul class="lista mas">' +
    masItems()
      .map(
        x =>
          '<li><a class="fila" href="#/' +
          x.k +
          '"><span class="f1">' +
          x.t +
          '</span><span class="f2">' +
          x.d +
          '</span>' +
          (x.n ? '<span class="fd"><span class="n" aria-label="' + x.n + (x.u || ' por atender') + '">' + x.n + '</span></span>' : '') +
          '</a></li>'
      )
      .join('') +
    '</ul>'
  );
}
/* ===== centralita: la bandeja =====
   De arriba abajo, por orden de lo que corre más prisa (guía, pestaña «Usabilidad», 15-11-2026): buscar; lo urgente sin
   repartir, con un botón para dárselo al que antes llega; lo que hay que hacer, en una lista corta; el equipo ahora; las citas
   sin técnico de hoy y del próximo día de trabajo (las de más adelante, en la agenda); lo que está en marcha y lo hecho hoy. */
const proxLab = () => {
  let d = K.masDias(K.madrid().date, 1);
  for (let i = 0; i < 7 && !K.laborable(cfg, d); i++) d = K.masDias(d, 1);
  return d;
};
const bandejaN = () => {
  const p = proxLab();
  return S.avisos.filter(a => (a.e === 'nuevo' || a.e === 'ausente') && (!a.cita || a.cita.dia <= p)).length;
};
/* buscar un aviso cuando llama un cliente: por su teléfono o el número del aviso (solo cifras), o por nombre, calle o barrio */
let BQ = '';
const normB = x =>
  String(x || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
function busca(q) {
  q = String(q || '');
  const t = normB(q).trim(),
    dig = q.replace(/\D/g, ''),
    soloDig = /^[\d\s+().-]+$/.test(q.trim());
  if (soloDig ? dig.length < 3 : t.length < 2) return null;
  return S.avisos
    .filter(a => {
      const c = a.cli || {};
      return soloDig
        ? (K.tel9(c.tel) || '').includes(dig) || a.id.replace(/\D/g, '').includes(dig)
        : normB([K.nomCli(c), c.dir, a.id, barrio(a), cfg.av[a.av] ? cfg.av[a.av].n : ''].join(' ')).includes(t);
    })
    .sort((a, b) => b.t - a.t)
    .slice(0, 30);
}
const resB = (R, sel) =>
  !R
    ? ''
    : '<section class="sec"><h2>Encontrados <span class="n">' +
      R.length +
      '</span></h2>' +
      (R.length
        ? '<ul class="lista">' + R.map(a => fila(a, sel)).join('') + '</ul>'
        : '<p class="hueco">Ningún aviso con «' + esc(BQ.trim()) + '». Prueba con el teléfono, la calle o el número del aviso.</p>') +
      '</section>';
function pintaBusca() {
  const d = $('#bRes'),
    resto = $('#bResto');
  if (!d) return;
  const r = ruta(),
    R = busca(BQ);
  d.innerHTML = resB(R, r.v === 'aviso' ? r.a : '');
  if (resto) resto.hidden = !!R;
}
/* la bandeja con su marco (20-11-2026): arriba, buscar; debajo, cuatro pestañas fijas con su número: «Por repartir» (lo
   urgente, con su botón para dárselo a quien antes llega; las citas sin técnico de hoy y del próximo día de trabajo; y el
   equipo ahora), «En marcha» (y lo hecho hoy) y «Por hacer» (mensajes, material, contratos…). Con un aviso abierto al lado
   (en el ordenador), cambiar de pestaña no lo cierra: se recuerda en BT */
let BT = 'repartir';
const BTS = ['repartir', 'marcha', 'hacer'];
function vBandeja(sel) {
  const ahora = Date.now(),
    hoy = K.madrid().date,
    p = proxLab(),
    H = sel ? 'p class="h1"' : 'h1',
    Hc = sel ? 'p' : 'h1';
  const pri = a => (a.con && a.con.pri ? 1 : 0),
    pend = S.avisos.filter(a => a.e === 'nuevo' || a.e === 'ausente'),
    fi = a => {
      const i = cfg.franjas.findIndex(f => f.id === a.cita.fr);
      return i < 0 ? 99 : i;
    };
  /* arriba, solo lo que hay que resolver ya (propuesta UX, 26-11-2026): urgencias, avisos sin datos y avisos por reasignar;
     las citas normales sin técnico van debajo */
  const pideYa = a => !a.cita || !a.cli.tel || a.reasignar || a.e === 'ausente';
  const urg = pend
    .filter(a => pideYa(a) && (!a.cita || a.cita.dia <= p))
    .sort((a, b) => (a.cita ? 1 : 0) - (b.cita ? 1 : 0) || pri(b) - pri(a) || a.t - b.t);
  const citas = pend
    .filter(a => a.cita && a.cita.dia <= p && !pideYa(a))
    .sort((a, b) => (a.cita.dia < b.cita.dia ? -1 : a.cita.dia > b.cita.dia ? 1 : 0) || fi(a) - fi(b) || pri(b) - pri(a) || a.t - b.t);
  const luego = pend.filter(a => a.cita && a.cita.dia > p && !pideYa(a)),
    d1 = luego.map(a => a.cita.dia).sort()[0];
  const marcha = S.avisos
    .filter(a => ['asignado', 'camino', 'curso'].includes(a.e))
    .sort((a, b) => ({ curso: 0, camino: 1, asignado: 2 })[a.e] - { curso: 0, camino: 1, asignado: 2 }[b.e] || a.t - b.t);
  const hechos = S.avisos.filter(a => a.e === 'hecho' && K.madrid(a.fin).date === hoy).sort((a, b) => b.fin - a.fin);
  const n = x => (x === 1 ? '1 cita' : x + ' citas'),
    R = busca(BQ),
    AL = alertas(0);
  {
    const r0 = ruta();
    if (r0.v === 'bandeja') BT = r0.a === 'hechos' ? 'marcha' : BTS.includes(r0.a) ? r0.a : 'repartir';
  }
  const t = BT;
  const sub = urg.length
    ? (urg.length === 1 ? '1 aviso por resolver ya, ' : urg.length + ' avisos por resolver ya, el primero ') + hace(urg[0].t) + '.'
    : citas.length
      ? n(citas.length) + ' sin técnico entre hoy y ' + diaCorto(p) + '.'
      : Oficio.VACIA && !S.avisos.length
        ? 'Todavía no hay ningún aviso.'
        : 'Nada urgente ni por repartir.';
  let c = '';
  if (t === 'repartir' && Oficio.VACIA && !S.avisos.length)
    /* la demo vacía: lo primero que ve quien llega es qué hacer, no una lista de «nada» */
    c =
      '<section class="sec vacio"><h2>Empieza por aquí</h2><p>Un cliente acaba de llamar. Crea su aviso y sigue el recorrido: lo repartes, el técnico va y cobra, y lo ves todo aquí.</p>' +
      '<a class="btn pri" href="#/nuevo">' +
      I.mas +
      'Crear el primer aviso</a></section>' +
      '<section class="sec"><h2>El equipo ahora</h2>' +
      tira() +
      '</section>';
  else if (t === 'repartir')
    c =
      (urg.length ? sec('Urgente y por completar', urg, sel, '', { dar: 1, sinPill: 1, id: 'sUrg' }) : '') +
      sec('Sin técnico · hoy y ' + diaCorto(p), citas, sel, 'Las citas de hoy y de ' + diaCorto(p) + ' ya tienen técnico.', { sinPill: 1, id: 'sSinTec' }) +
      (luego.length
        ? '<a class="mas" href="#/agenda/' + d1 + '"><span>Más adelante: ' + n(luego.length) + ' sin técnico</span><span aria-hidden="true">›</span></a>'
        : '') +
      '<section class="sec"><h2>El equipo ahora</h2>' +
      tira() +
      '</section>';
  else if (t === 'marcha')
    c = sec('En marcha', marcha, sel, 'Ahora no hay ningún aviso en marcha.') + sec('Hechos hoy', hechos, sel, 'Hoy todavía no se ha terminado ninguno.');
  else c = '<section class="sec"><h2>Por hacer</h2>' + (bAlertas() || '<p class="hueco">Todo al día.</p>') + '</section>';
  return (
    '<div class="cab"><div><' +
    H +
    '>Ahora</' +
    Hc +
    '><p class="sub">' +
    sub +
    '</p></div><a class="btn pri peq" href="#/nuevo" aria-keyshortcuts="N">' +
    I.mas +
    'Nuevo aviso</a></div>' +
    '<form class="busca" id="fBusca" role="search"><label class="vh" for="busca">Buscar un aviso</label>' +
    I.lupa +
    '<input id="busca" type="search" aria-keyshortcuts="/" value="' +
    esc(BQ) +
    '" placeholder="Nombre, teléfono, calle o nº de aviso" autocomplete="off" enterkeyhint="search"></form>' +
    '<div id="bRes">' +
    resB(R, sel) +
    '</div>' +
    pestas(
      [
        { k: 'repartir', h: '#/bandeja', t: 'Por repartir', n: urg.length + citas.length },
        { k: 'marcha', h: '#/bandeja/marcha', t: 'En marcha', n: marcha.length },
        { k: 'hacer', h: '#/bandeja/hacer', t: 'Por hacer', n: AL.L.length + AL.D.length }
      ],
      t,
      'Qué ver ahora',
      { grupo: 'b' }
    ) +
    '<div id="bResto" class="pcuerpo"' +
    (R ? ' hidden' : '') +
    '>' +
    c +
    '</div>'
  );
}
/* Lo primero de la bandeja: cuatro cifras que contestan a «¿qué hago ahora?», cada una con su acceso directo.
   Rayas amarillas, la urgencia; azul, lo que es de citas; el resto, neutro. A cero quedan apagadas y no llevan a nada. */
function bResumen(urg, citas, luego, p, r) {
  const ahora = Date.now(),
    M = porMandar(ahora),
    Mo = M.filter(x => !esSeg(x)),
    Ms = M.filter(esSeg),
    d1 = luego.map(a => a.cita.dia).sort()[0];
  const T = (cl, n, lb, sm, ir) =>
    '<li>' +
    (ir
      ? ir.href
        ? '<a class="rs ' + cl + '" href="' + ir.href + '">'
        : '<button type="button" class="rs ' + cl + '" data-a="' + ir.a + '"' + (ir.sec ? ' data-sec="' + ir.sec + '"' : '') + '>'
      : '<div class="rs ' + cl + ' cero">') +
    '<b class="num">' +
    n +
    '</b><span>' +
    lb +
    '</span><small>' +
    sm +
    '</small>' +
    (ir ? (ir.href ? '</a>' : '</button>') : '</div>') +
    '</li>';
  const L = [
    T(
      'u',
      urg.length,
      'Urgencias',
      urg.length ? (urg.length === 1 ? 'sin repartir, ' : 'sin repartir; la primera, ') + hace(urg[0].t) : 'ninguna sin repartir',
      urg.length ? { href: '#/aviso/' + urg[0].id } : null
    ),
    T(
      'c',
      citas.length,
      'Citas sin técnico',
      'hoy y ' + diaCorto(p) + (luego.length ? ' · ' + luego.length + ' más adelante' : ''),
      citas.length ? { a: 'irSec', sec: 'sSinTec' } : luego.length ? { href: '#/agenda/' + d1 } : null
    ),
    T(
      'm',
      Mo.length + Ms.length,
      'Mensajes pendientes',
      Mo.length || Ms.length
        ? [Mo.length ? Mo.length + ' por mandar' : '', Ms.length ? Ms.length + ' de seguimiento' : ''].filter(Boolean).join(' · ')
        : 'nada por mandar',
      Mo.length ? { a: 'mensajes' } : Ms.length ? { a: 'seguir' } : null
    )
  ];
  if (pro()) L.push(T('p', r.pend.n, 'Cobros pendientes', r.pend.n ? K.eur(r.pend.total) : 'todo cobrado', r.pend.n ? { href: '#/cobros' } : null));
  return '<ul class="resumen" aria-label="Lo pendiente, de un vistazo">' + L.join('') + '</ul>';
}
function vElige() {
  const r = K.resumen(S, cfg, Date.now());
  return (
    '<p class="hueco">Elige un aviso de la lista para verlo. Hoy: ' +
    r.hechos +
    (r.hechos === 1 ? ' hecho' : ' hechos') +
    ', ' +
    r.marcha +
    ' en marcha' +
    (pro() && r.pend.n ? ' y ' + r.pend.n + ' por cobrar (' + K.eur(r.pend.total) + ')' : '') +
    '.</p>'
  );
}
