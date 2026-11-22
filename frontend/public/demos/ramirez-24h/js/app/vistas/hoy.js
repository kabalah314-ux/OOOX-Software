/* OOOX Oficios · la app (app.html), vistas/hoy. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== técnico: hoy ===== */
function vHoy() {
  const hoy = K.madrid().date,
    M = S.avisos.filter(a => a.tec === Q.id && ['asignado', 'camino', 'curso'].includes(a.e));
  const peso = a => (a.e === 'curso' ? 0 : a.e === 'camino' ? 1 : a.cita ? (a.cita.dia === hoy ? 3 + cfg.franjas.findIndex(f => f.id === a.cita.fr) : 100) : 2);
  const dia = M.filter(a => !a.cita || a.cita.dia <= hoy || a.e !== 'asignado').sort((a, b) => peso(a) - peso(b) || a.t - b.t),
    lue = M.filter(a => !dia.includes(a)).sort((a, b) => (a.cita.dia < b.cita.dia ? -1 : 1));
  const p = dia[0],
    t = cfg.tec[Q.id];
  let h =
    '<div class="cab"><div><h1>Hoy</h1><p class="sub">' +
    (p
      ? (dia.length === 1 ? '1 aviso. ' : dia.length + ' avisos. ') +
        (p.e === 'curso'
          ? 'Estás con ' + cfg.av[p.av].n.toLowerCase() + ' en ' + barrio(p) + '.'
          : p.e === 'camino'
            ? 'Vas de camino a ' + barrio(p) + '.'
            : 'El siguiente, ' + cfg.av[p.av].n.toLowerCase() + ' en ' + barrio(p) + '.')
      : 'No tienes avisos ahora, ' + esc(t.n) + '.') +
    '</p></div></div>';
  /* con su marco (20-11-2026): «Hoy», «Próximos días» y «Material» */
  const ahora = Date.now(),
    ds = [
      ...new Set(
        [hoy].concat(
          lue.length ? [lue[0].cita.dia] : [],
          M.filter(a => a.falta && a.falta.length).map(a => (a.e === 'asignado' && a.cita && a.cita.dia > hoy ? a.cita.dia : hoy))
        )
      )
    ].sort();
  const hb = ds.map(d => bCarga(K.cargaDe(S, cfg, Q.id, d, ahora))).join(''),
    rp = K.reponerDe(S, cfg, Q.id);
  const r0 = ruta(),
    k = ['proximos', 'material'].includes(r0.a) ? r0.a : 'hoy';
  h +=
    pestas(
      [
        { k: 'hoy', h: '#/hoy', t: 'Hoy', n: dia.length },
        { k: 'proximos', h: '#/hoy/proximos', t: 'Próximos días', n: lue.length },
        { k: 'material', h: '#/hoy/material', t: 'Material', n: rp.length }
      ],
      k,
      'Qué ver de tus avisos'
    ) + '<div class="pcuerpo">';
  if (k === 'proximos')
    return (
      h +
      (lue.length ? sec('Próximos días', lue, '', '', { tec: 1 }) : '<p class="hueco" style="margin-top:16px">No tienes citas para los próximos días.</p>') +
      '</div>'
    );
  if (k === 'material') {
    const pie = !FG(Q.id)
      ? '¿Quieres que la app lleve la cuenta de tu furgoneta? <a class="txt" href="#/furgo">Mírala aquí</a>.'
      : rp.length
        ? (rp.length === 1 ? 'Hay 1 cosa por reponer' : 'Hay ' + rp.length + ' cosas por reponer') +
          ' en tu furgoneta. <a class="txt" href="#/furgo">Mírala</a>.'
        : '';
    return (
      h +
      '<section class="sec" id="mHoy"><h2>Material</h2>' +
      (hb || '<p class="hueco">No hace falta nada especial para tus trabajos.</p>') +
      (pie ? '<p class="mnota" style="margin-top:10px">' + pie + '</p>' : '') +
      '</section></div>'
    );
  }
  if (p) {
    const av = cfg.av[p.av];
    h +=
      '<section class="sig' +
      (p.urg ? ' urg' : '') +
      '"><p class="k"><span>' +
      p.id +
      ' · ' +
      (p.cita ? 'cita ' + frTxt(p.cita.fr) : 'urgente, ' + hace(p.t)) +
      '</span><span class="pill ' +
      p.e +
      '">' +
      EST[p.e] +
      '</span></p><h2>' +
      esc(av.n) +
      '</h2><p class="dir">' +
      esc(p.cli.dir) +
      '</p><p class="ln" style="color:var(--suave)">' +
      esc(barrio(p)) +
      ' · ' +
      esc(K.nomCli(p.cli)) +
      '</p>' +
      (p.nota ? '<p class="dice" style="margin-top:0">' + esc(p.nota) + '</p>' : '') +
      (p.foto ? bFoto(p) : '') +
      (p.e === 'asignado'
        ? bVoy(p, 'btn pri ancho') +
          '<a class="txt" style="justify-self:center;display:inline-flex;align-items:center" href="#/aviso/' +
          p.id +
          '">Ver el aviso</a>'
        : '<a class="btn pri ancho" href="#/aviso/' + p.id + '">' + (p.e === 'camino' ? 'Abrir: he llegado' : 'Seguir con el trabajo') + '</a>') +
      '</section>';
  } else h += '<p class="hueco" style="margin-top:16px">Cuando la centralita te pase un aviso, aparece aquí al momento.</p>';
  {
    const ll = {};
    K.agendaDe(S, cfg, Q.id, hoy, Date.now()).forEach(x => {
      ll[x.id] = x.llega;
    });
    if (dia.length > 1) h += sec('Después', dia.slice(1), '', '', { tec: 1, llega: ll });
  }
  return h + '</div>';
}
function vHechos() {
  const hoy = K.madrid().date,
    L = S.avisos.filter(a => a.tec === Q.id && a.e === 'hecho').sort((a, b) => b.fin - a.fin),
    h = L.filter(a => K.madrid(a.fin).date === hoy),
    o = L.filter(a => !h.includes(a)).slice(0, 10),
    k = ruta().a === 'antes' ? 'antes' : 'hoy';
  return (
    '<div class="cab"><div><h1>Hechos</h1><p class="sub">' +
    (h.length ? (h.length === 1 ? '1 trabajo terminado hoy.' : h.length + ' trabajos terminados hoy.') : 'Hoy todavía no has terminado ninguno.') +
    '</p></div></div>' +
    pestas(
      [
        { k: 'hoy', h: '#/hechos', t: 'Hoy', n: h.length },
        { k: 'antes', h: '#/hechos/antes', t: 'Antes', n: o.length }
      ],
      k,
      'Qué trabajos ver'
    ) +
    '<div class="pcuerpo">' +
    (k === 'hoy' ? sec('Hoy', h, '', 'Aquí salen los trabajos que termines hoy.') : sec('Antes', o, '', 'Aquí salen los trabajos de otros días.')) +
    '</div>'
  );
}
