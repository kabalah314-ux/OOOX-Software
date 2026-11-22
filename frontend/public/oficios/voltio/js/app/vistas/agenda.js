/* OOOX Oficios · la app (app.html), vistas/agenda. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== centralita: agenda ===== */
/* los días de la agenda: los próximos laborables, y hoy aunque ya no queden huecos */
function diasAg(ahora) {
  const hoy = K.madrid().date,
    dias = K.diasDe(S, cfg, ahora, 6).map(x => x.dia);
  if (!dias.includes(hoy) && K.laborable(cfg, hoy)) dias.unshift(hoy);
  return dias;
}
/* la agenda con su marco (20-11-2026): «Citas» y «Equipo» son sus dos pestañas y, con ellas, los días; todo fijo al bajar */
const segAg = (v, d, mas) =>
  pestas(
    [
      { k: 'agenda', h: '#/agenda/' + d, t: 'Citas' },
      { k: 'equipo', h: '#/equipo/' + d, t: 'Equipo' }
    ],
    v,
    'Qué ver de la agenda',
    { mas: mas || '' }
  );
const navDias = (v, dias, d, cuenta) => {
  const hoy = K.madrid().date;
  return (
    '<nav class="dias" aria-label="Días">' +
    dias
      .map(
        x =>
          '<a href="#/' +
          v +
          '/' +
          x +
          '"' +
          (x === d ? ' aria-current="true"' : '') +
          '>' +
          (x === hoy ? 'hoy' : D3[new Date(x + 'T12:00:00Z').getUTCDay()]) +
          '<b class="num">' +
          +x.slice(8) +
          '</b><small>' +
          cuenta(x) +
          '</small></a>'
      )
      .join('') +
    '</nav>'
  );
};
/* los huecos de una franja, como los ve la oficina: los del cliente y los que solo puede usar ella */
/* en una línea, y con una barra: azul lo ocupado, en blanco lo libre y con rayas lo que solo puede dar la oficina */
const huecoAg = (f, oc, corto) => {
  const of = f.okOf ? f.libresOf - (f.ok ? f.libres : 0) : 0,
    li = f.ok ? f.libres : 0,
    pasa = !f.ok && !f.okOf && f.libresOf > 0,
    tot = Math.max(f.tope || 0, oc + li + Math.max(of, 0)),
    resto = tot - oc - li - Math.max(of, 0);
  const T = [];
  if (li) T.push(li === 1 ? '1 libre' : li + ' libres');
  if (of > 0) T.push(of === 1 ? (corto ? '1 reservado' : '1 reservado para la oficina') : of + (corto ? ' reservados' : ' reservados para la oficina'));
  if (!T.length) T.push(pasa ? 'Ya ha pasado' : 'Completa');
  const s = (c, n) => (n > 0 ? '<i class="' + c + '" style="flex:' + n + '"></i>' : '');
  return (
    '<div class="cap"><span class="capb" aria-hidden="true">' +
    s('co', oc) +
    s('cl', li) +
    s('cr', of) +
    s('cx', resto) +
    '</span><span class="capt">' +
    T.join(' · ') +
    '</span></div>'
  );
};
const diaLargo = f => {
  const h = K.madrid().date,
    l = K.fechaLarga(f);
  return f === h ? 'Hoy, ' + l : f === K.masDias(h, 1) ? 'Mañana, ' + l : l.charAt(0).toUpperCase() + l.slice(1);
};
function vAgenda(d) {
  const ahora = Date.now(),
    hoy = K.madrid().date,
    dias = diasAg(ahora);
  if (!dias.includes(d)) d = dias[0];
  const L = S.avisos.filter(a => a.cita && a.cita.dia === d && a.e !== 'cancelado'),
    fr = K.franjasDe(S, cfg, d, ahora);
  const todas = S.avisos.filter(a => a.cita && a.e !== 'cancelado' && a.e !== 'hecho' && a.cita.dia >= hoy),
    prox = todas.filter(a => a.cita.dia > d).sort((a, b) => (a.cita.dia < b.cita.dia ? -1 : 1))[0];
  if (ANCHO.matches) {
    const n = todas.filter(a => dias.includes(a.cita.dia)).length;
    return (
      '<div class="cab"><div><h1>Agenda</h1><p class="sub">' +
      (n ? (n === 1 ? '1 cita' : n + ' citas') + ' en los próximos días.' : 'Sin citas en los próximos días.') +
      ' ' +
      CABEN() +
      '; con cita, tarifa normal.</p></div><a class="btn pri peq" href="#/nuevo" aria-keyshortcuts="N">' +
      I.mas +
      'Nuevo aviso</a></div>' +
      segAg('agenda', d) +
      bAlertas(1, true) +
      '<div class="sem" role="table" aria-label="Citas de los próximos días"><div class="semc" role="row"><span role="columnheader">Día</span>' +
      cfg.franjas.map(f => '<span role="columnheader">' + K.franjaTxt(f).replace(/^d/, 'D') + '</span>').join('') +
      '</div>' +
      dias
        .map(
          x =>
            '<div class="semf" role="row"><span class="semd" role="rowheader">' +
            D3[new Date(x + 'T12:00:00Z').getUTCDay()] +
            '<b class="num">' +
            +x.slice(8) +
            '</b>' +
            MES3[+x.slice(5, 7) - 1] +
            (x === hoy ? '<i>hoy</i>' : '') +
            '</span>' +
            K.franjasDe(S, cfg, x, ahora)
              .map(f => {
                const C = todas.filter(a => a.cita.dia === x && a.cita.fr === f.id);
                return (
                  '<div role="cell">' +
                  C.map(
                    a =>
                      '<a class="cch' +
                      (a.tec ? '' : ' sin') +
                      '" href="#/aviso/' +
                      a.id +
                      '"><b>' +
                      esc(cfg.av[a.av].n) +
                      ' · ' +
                      esc(barrio(a)) +
                      '</b><small>' +
                      esc(K.nomCli(a.cli)) +
                      ' · ' +
                      (a.tec ? esc(cfg.tec[a.tec].n) : 'sin asignar') +
                      '</small></a>'
                  ).join('') +
                  huecoAg(f, C.length, true) +
                  '</div>'
                );
              })
              .join('') +
            '</div>'
        )
        .join('') +
      '</div><p class="sub">Reservado: huecos que solo puede dar la oficina.</p>'
    );
  }
  let h =
    '<div class="cab"><div><h1>Agenda</h1><p class="sub">' +
    (L.length
      ? (L.length === 1 ? '1 cita ' : L.length + ' citas ') + diaTxt(d) + '.'
      : 'Sin citas ' + diaTxt(d) + '.' + (prox ? ' La próxima, ' + diaTxt(prox.cita.dia) + '.' : '')) +
    ' ' +
    CABEN() +
    '.</p></div></div>' +
    segAg(
      'agenda',
      d,
      navDias('agenda', dias, d, x => (n => (n ? (n === 1 ? '1 cita' : n + ' citas') : 'libre'))(todas.filter(a => a.cita.dia === x).length))
    ) +
    bAlertas(1, true);
  h += '<h2 class="dlargo">' + diaLargo(d) + '</h2><div class="tabla">';
  fr.forEach(f => {
    const C = L.filter(a => a.cita.fr === f.id);
    h +=
      '<section class="fr"><h3 class="num">' +
      K.franjaTxt(f).replace(/^d/, 'D') +
      ' <small>' +
      C.length +
      ' de ' +
      f.tope +
      '</small></h3>' +
      (C.length ? '<ul class="lista" style="margin-bottom:8px">' + C.map(a => fila(a, '')).join('') + '</ul>' : '') +
      huecoAg(f, C.length) +
      '</section>';
  });
  return h + '</div>';
}

/* ===== el tablero del día: todo el equipo en el mismo eje de horas ===== */
/* lo de un técnico ese día: sus horas, sus trabajos (desde ahora, si es hoy) y sus ratos libres */
function diaTec(tec, d) {
  const hoy = K.madrid().date,
    ahora = Date.now(),
    n = K.madrid(ahora),
    T = K.turnosDe(cfg, tec, d),
    L = K.agendaDe(S, cfg, tec, d, d === hoy ? ahora : null),
    ya = d === hoy ? n.min : 0;
  return { T, L, R: K.libresDe(cfg, tec, d, L, ya), ya, hoy: d === hoy, n };
}
const hh0 = m => K.hhmm(m).replace(/^0/, '');
/* la barra de un técnico entre a0 y a1 (minutos del día): lo rayado es cuando no trabaja; cada trabajo, de lo que se
   espera que dure, con el camino antes; hoy, la hora de ahora */
function barraDia(X, a0, a1) {
  const W = a1 - a0 || 1,
    pc = m => (((m - a0) / W) * 100).toFixed(2) + '%',
    an = m => ((m / W) * 100).toFixed(2) + '%';
  let h = '<div class="dia">' + X.T.map(x => '<i class="dt" aria-hidden="true" style="left:' + pc(x[0]) + ';width:' + an(x[1] - x[0]) + '"></i>').join('');
  for (let m = Math.ceil(a0 / 60) * 60 + 60; m < a1; m += 60) h += '<i class="dg" aria-hidden="true" style="left:' + pc(m) + '"></i>';
  /* lo que no trabaja, escrito dentro cuando cabe (auditoría UX-19): sin la leyenda ni los colores se entiende igual */
  {
    let m = a0;
    X.T.slice()
      .sort((x, y) => x[0] - y[0])
      .concat([[a1, a1]])
      .forEach(x => {
        if (x[0] - m >= 30) h += '<i class="dx" aria-hidden="true" style="left:' + pc(m) + ';width:' + an(x[0] - m) + '"><span>No trabaja</span></i>';
        m = Math.max(m, x[1]);
      });
  }
  X.L.forEach(x => {
    const A = el(x.id),
      av = A && cfg.av[A.av],
      q =
        (av ? av.n : 'Trabajo') +
        (A && barrio(A) ? ' en ' + barrio(A) : '') +
        ', de ' +
        hh0(x.llega) +
        ' a ' +
        hh0(x.acaba) +
        (x.nadie ? ', fue y no había nadie' : x.hecho ? ', hecho' : x.urg ? ', urgente' : '') +
        (x.tarde ? ', llegaría tarde' : '');
    if (x.viaje && !x.hecho) h += '<i class="dv" aria-hidden="true" style="left:' + pc(x.llega - x.viaje) + ';width:' + an(x.viaje) + '"></i>';
    h +=
      '<a class="dj' +
      (x.urg ? ' u' : '') +
      (x.hecho ? ' h' : '') +
      (x.nadie ? ' n' : '') +
      (x.tarde ? ' t' : '') +
      '" href="#/aviso/' +
      x.id +
      '" style="left:' +
      pc(x.llega) +
      ';width:' +
      an(Math.max(x.acaba - x.llega, 4)) +
      '" aria-label="' +
      esc(q) +
      '" title="' +
      esc(q) +
      '"><span aria-hidden="true">' +
      (x.nadie ? 'No había nadie' : (x.hecho ? '✓ ' : '') + (x.tarde ? 'Tarde · ' : '') + esc(av ? av.n : '')) +
      '</span></a>';
  });
  if (X.hoy && X.n.min > a0 && X.n.min < a1) h += '<i class="dn" aria-hidden="true" style="left:' + pc(X.n.min) + '"></i>';
  return h + '</div>';
}
/* en palabras: cuántos trabajos, sus ratos libres y lo que no cuadra */
function textoDia(X) {
  const pend = X.L.filter(x => !x.hecho),
    tar = X.L.find(x => x.tarde),
    lib = X.R.libres.slice(0, 3).map(x => (x.de === X.ya ? 'ya' : 'de ' + hh0(x.de)) + ' a ' + hh0(x.a));
  const ln =
    (pend.length
      ? (pend.length === 1 ? '1 trabajo' : pend.length + ' trabajos') + (X.hoy ? ' por hacer' : '') + '. '
      : 'Sin trabajos' + (X.hoy && X.L.length ? ' por hacer' : '') + '. ') +
    (lib.length ? 'Libre ' + lib.join(', ').replace(/, ([^,]*)$/, ' y $1') + (X.R.libres.length > 3 ? ' y otros ratos' : '') + '.' : 'Sin ratos libres.');
  return (
    '<p class="dtx">' +
    ln +
    '</p>' +
    (tar
      ? '<p class="dno">No le da tiempo a llegar a la cita ' +
        frTxt(tar.fr) +
        ': llegaría hacia las ' +
        hh0(tar.llega) +
        '. Pásala a otra persona o a otra franja.</p>'
      : '') +
    (X.R.sale ? '<p class="dno">Acabaría hacia las ' + hh0(X.R.sale) + ', después de su hora.</p>' : '')
  );
}
/* todo el equipo ese día, una fila por técnico, y hoy quién cubriría una urgencia */
function bTablero(d) {
  const F = N.tecnicos.map(t => ({ t, u: K.ausente(S, t.id, d), X: diaTec(t.id, d) })),
    M = [];
  F.forEach(f => {
    f.X.T.forEach(x => M.push(x[0], x[1]));
    f.X.L.forEach(x => M.push(x.llega - (x.viaje || 0), x.acaba));
  });
  if (!M.length) return '';
  const a0 = Math.floor(Math.min.apply(null, M) / 60) * 60,
    a1 = Math.ceil(Math.max.apply(null, M) / 60) * 60,
    W = a1 - a0,
    pc = m => (((m - a0) / W) * 100).toFixed(2) + '%';
  let h = '<section class="tab" aria-label="El día de un vistazo"><div class="tabf tabh" aria-hidden="true"><span></span><div class="tabe">';
  for (let m = a0; m <= a1; m += 120)
    h += '<span style="left:' + pc(m) + (m === a0 ? ';transform:none' : m === a1 ? ';transform:translateX(-100%)' : '') + '">' + m / 60 + '</span>';
  h +=
    '</div></div>' +
    F.map(
      f =>
        '<div class="tabf"><span class="tabn">' +
        ava(f.t.id) +
        esc(f.t.n) +
        '</span>' +
        (f.u ? '<p class="tabx">Ausente</p>' : !f.X.T.length && !f.X.L.length ? '<p class="tabx">No trabaja</p>' : barraDia(f.X, a0, a1)) +
        '</div>'
    ).join('');
  return (
    h +
    '<p class="tabl" aria-hidden="true"><i class="lc"></i>Cita<i class="lu"></i>Urgencia<i class="lh"></i>✓ Hecho<i class="ln"></i>No había nadie<i class="lr"></i>No trabaja</p>' +
    (d === K.madrid().date ? bUrgAhora() : '') +
    '</section>'
  );
}
