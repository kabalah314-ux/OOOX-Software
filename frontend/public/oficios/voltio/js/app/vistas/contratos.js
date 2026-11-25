/* OOOX Oficios · la app (app.html), vistas/contratos. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== los papeles ===== */
/* ===== centralita: los contratos de mantenimiento =====
   La oficina los da de alta (con la firma del cliente o su sí por mensaje), apunta el cobro, da la cita de la revisión,
   renueva si el cliente dice que sí y apunta la baja. Los avisos del cliente lo saben solos. */
const PLANES = Object.keys(cfg.planes || {}),
  HAY_CON = () => pro() && PLANES.length > 0,
  contrato = id => (S.contratos || []).find(c => c.id === id);
const incluye = x => {
  const P = cfg.planes[x];
  if (!P) return '';
  return (
    [
      (P.revisiones === 1 ? 'Una revisión' : P.revisiones + ' revisiones') + ' al año, con el desplazamiento',
      P.desp || cfg.urge
        ? 'en las urgencias sin ' + [P.desp ? 'desplazamiento' : '', cfg.urge ? 'suplemento de urgencia' : ''].filter(Boolean).join(' ni ')
        : '',
      P.prioridad ? 'y sus avisos van primero' : ''
    ]
      .filter(Boolean)
      .join(', ') +
    '. IVA del ' +
    P.iva +
    ' % incluido.'
  );
};
function bContrato(A, sinOferta) {
  /* la oficina lo ofrece en cualquier aviso abierto; el técnico, en el suyo, en casa del cliente (trabajando o recién acabado) */
  const puede =
    Q.rol === 'centralita'
      ? A.e !== 'cancelado'
      : Q.rol === 'tecnico' && A.tec === Q.id && (A.e === 'curso' || (A.e === 'hecho' && A.fin && K.madrid(A.fin).date === K.madrid().date));
  /* el cliente ha pedido la revisión desde su zona diciendo que quiere el plan (19-11-2026): darlo de alta antes de la visita */
  const Pq = !A.con && A.quiere && cfg.planes[A.quiere] && A.e !== 'cancelado' && !K.contratoDe(S, A.cli, K.madrid().date) ? cfg.planes[A.quiere] : null;
  if (Pq)
    return (
      '<p class="ojo con" id="conQ">El cliente quiere el ' +
      esc(Pq.n.toLowerCase()) +
      ' (' +
      K.eur(Pq.precio) +
      ' al año). Con el contrato dado de alta antes de empezar, esta revisión va incluida.' +
      (puede && HAY_CON() && A.cli.tel && A.cli.dir
        ? ' <button class="btn peq" data-a="conAlta" data-id="' + A.id + '">Dar de alta el contrato</button>'
        : '') +
      '</p>'
    );
  if (!A.con)
    return !sinOferta && puede && HAY_CON() && A.cli.tel && A.cli.dir && !K.contratoDe(S, A.cli, K.madrid().date)
      ? '<p class="acts" id="conOf"><button class="txt" data-a="conAlta" data-id="' + A.id + '">Ofrecer el contrato de mantenimiento</button></p>'
      : '';
  return (
    '<p class="ojo con" id="conB">Cliente con contrato de mantenimiento ' +
    (Q.rol === 'centralita' ? '<a href="#/contratos">' + esc(A.con.id) + '</a>' : esc(A.con.id)) +
    ': ' +
    (A.con.rev
      ? 'la revisión y el desplazamiento van incluidos'
      : A.urg && A.av !== K.REV && K.gratisDe(A).length
        ? 'en esta urgencia no se cobra ' +
          K.gratisDe(A)
            .map(k => (k === cfg.urge ? 'el suplemento de urgencia' : 'el desplazamiento'))
            .join(' ni ')
        : 'sus avisos van primero') +
    '.</p>'
  );
}
/* Contratos: arriba, lo que piden (renovar, dar cita a la revisión, cobrar la cuota), una línea cada uno con su botón;
   debajo, una fila por contrato. Lo que se hace con un contrato (ver el papel, copiar la factura, cobrar, renovar y dar de
   baja) va dentro, al tocarlo: así la lista se lee de un vistazo y la baja no está a mano de un toque sin querer. */
function vContratos() {
  const ahora = Date.now(),
    hoy = K.madrid().date,
    Pd = K.pendientesContratos(S, cfg, ahora),
    L = (S.contratos || []).slice().sort((a, b) => (a.e === 'activo' ? 0 : 1) - (b.e === 'activo' ? 0 : 1) || b.t - a.t);
  const act = L.filter(c => c.e === 'activo').length,
    nom = id => {
      const C = contrato(id);
      return C ? esc(K.nomCli(C.cli)) : '';
    };
  const li = (cls, b, sm, btn) =>
    '<li' + (cls ? ' class="' + cls + '"' : '') + '><span><b>' + b + '</b>' + (sm ? '<small>' + sm + '</small>' : '') + '</span>' + btn + '</li>';
  const al = Pd.renovar
    .map(x =>
      li(
        x.vencido ? 'atn' : '',
        'Renovar · ' + nom(x.id),
        esc(x.id) + ' · ' + (x.vencido ? 'acabó' : 'acaba') + ' el ' + K.fechaCorta(x.a),
        '<button class="btn peq" data-a="conRen" data-c="' + x.id + '">Renovar contrato</button>'
      )
    )
    .concat(
      Pd.revision.map(x => {
        const C = contrato(x.id),
          ab = C && S.avisos.find(a => ['nuevo', 'asignado', 'camino', 'ausente'].includes(a.e) && a.av !== K.REV && K.tel9(a.cli.tel) === K.tel9(C.cli.tel));
        return li(
          '',
          'Revisión · ' + nom(x.id),
          esc(x.id) +
            (x.toca ? ' · toca el ' + K.fechaCorta(x.toca) : '') +
            (ab ? ' · tiene abierto el aviso <a href="#/aviso/' + ab.id + '">' + ab.id + '</a>: se puede hacer en esa misma visita' : ''),
          '<button class="btn peq" data-a="conRev" data-c="' + x.id + '">Crear aviso de revisión</button>'
        );
      })
    )
    .concat(
      Pd.cobrar.map(x => {
        const C = contrato(x.id),
          u = C && C.per[C.per.length - 1],
          di = u && u.pago && u.pago.dice;
        return li(
          di ? 'atn' : '',
          'Cuota por cobrar · ' + nom(x.id),
          esc(x.id) + ' · ' + K.eur(x.precio) + (di ? ' · el cliente dice que la ha pagado por ' + PAGO[di.modo].toLowerCase() : ''),
          '<button class="btn peq" data-a="conCob" data-c="' + x.id + '">Apuntar cobro</button>'
        );
      })
    );
  let h =
    '<div class="cab"><div><h1>Contratos</h1><p class="sub">' +
    (act
      ? act === 1
        ? '1 contrato de mantenimiento en marcha.'
        : act + ' contratos de mantenimiento en marcha.'
      : 'Todavía no hay ningún contrato de mantenimiento.') +
    '</p></div><button class="btn pri peq" data-a="conAlta">' +
    I.mas +
    'Nuevo contrato</button></div>';
  /* con su marco (20-11-2026): «Por hacer» (lo que piden: renovar, la revisión, la cuota), «Contratos» y «Planes» */
  const r0 = ruta(),
    k = ['hacer', 'lista', 'planes'].includes(r0.a) ? r0.a : al.length ? 'hacer' : 'lista';
  h +=
    pestas(
      [
        { k: 'hacer', h: '#/contratos/hacer', t: 'Por hacer', n: al.length },
        { k: 'lista', h: '#/contratos/lista', t: 'Contratos', n: L.length },
        { k: 'planes', h: '#/contratos/planes', t: 'Planes' }
      ],
      k,
      'Qué ver de los contratos'
    ) + '<div class="pcuerpo">';
  const porHacer = id =>
    '<section class="sec tareas"><h2>Por hacer <span class="n">' +
    al.length +
    '</span></h2>' +
    (al.length
      ? '<ul class="porhacer"' + (id ? ' id="conAl"' : '') + ' aria-label="Lo que piden los contratos">' + al.join('') + '</ul>'
      : '<p class="hueco">Nada pendiente: ni renovaciones, ni revisiones sin cita, ni cuotas por cobrar.</p>') +
    '</section>';
  /* en pantalla grande (desde 1.100 px, 24-11-2026): «Por hacer» y la lista de contratos, una al lado de la otra */
  if (k === 'hacer')
    return h + '<div class="dosc"><div>' + porHacer(true) + '</div><aside class="ancho" aria-label="Los contratos">' + lista() + '</aside></div></div>';
  if (k === 'planes')
    return (
      h +
      '<section class="sec"><h2>Planes</h2><p class="mnota">' +
      PLANES.map(x => '<b>' + esc(cfg.planes[x].n) + '</b>, ' + K.eur(cfg.planes[x].precio) + ' al año: ' + incluye(x)).join('<br>') +
      ' No se renueva solo, y el cliente se da de baja cuando quiera.</p></section></div>'
    );
  return h + '<div class="dosc"><div>' + lista() + '</div><aside class="ancho" aria-label="Por hacer">' + porHacer(false) + '</aside></div></div>';
  function lista() {
    return (
      '<section class="sec todos"><h2>Los contratos <span class="n">' +
      L.length +
      '</span></h2>' +
      (L.length
        ? '<ul class="lista">' +
          L.map(C => {
            const u = C.per[C.per.length - 1],
              vig = K.vigente(C, hoy),
              bz = barrio({ cli: C.cli });
            const est =
              C.e !== 'activo'
                ? '<span class="pill">De baja</span>'
                : !vig
                  ? '<span class="pill ausente">Vencido</span>'
                  : !u.pago.cobrado
                    ? '<span class="pill cobro">Por cobrar</span>'
                    : '';
            return (
              '<li><button type="button" class="fila cont' +
              (C.e !== 'activo' ? ' baja' : '') +
              '" data-a="conVer" data-c="' +
              C.id +
              '"><span class="f1">' +
              esc(K.nomCli(C.cli)) +
              '</span><span class="f2">' +
              esc(C.id) +
              ' · hasta el ' +
              K.fechaCorta(u.a) +
              (bz ? ' · ' + esc(bz) : '') +
              '</span>' +
              (est ? '<span class="fd">' + est + '</span>' : '') +
              '</button></li>'
            );
          }).join('') +
          '</ul>'
        : '<p class="hueco">Cuando un cliente diga que sí, se da de alta aquí o desde su aviso.</p>') +
      '</section>'
    );
  }
}
/* un contrato, con todo lo que se puede hacer con él */
function hConVer(C) {
  const P = cfg.planes[C.plan],
    u = C.per[C.per.length - 1],
    hoy = K.madrid().date,
    vig = K.vigente(C, hoy),
    ren = K.pendientesContratos(S, cfg, Date.now()).renovar.some(x => x.id === C.id);
  const d = hoja(
    hc(esc(K.nomCli(C.cli))) +
      '<div class="hb"><p class="ln"><b>' +
      esc(C.id) +
      '</b> · ' +
      esc(P ? P.n : C.plan) +
      '</p><p class="ln">' +
      esc(C.cli.dir) +
      ' · ' +
      K.telBonito(C.cli.tel) +
      '</p>' +
      '<p class="ln">Del ' +
      K.fechaCorta(u.de) +
      ' al ' +
      K.fechaCorta(u.a) +
      ' · ' +
      K.eur(u.precio) +
      (C.e !== 'activo' ? ' · <b>de baja</b>' + (C.baja && C.baja.des ? ' (desistió)' : '') : !vig ? ' · <b>vencido</b>' : '') +
      '</p>' +
      '<p class="ln">' +
      (u.pago.cobrado ? 'Cobrado el ' + K.fechaCorta(K.madrid(u.pago.t).date) + ' (' + PAGO[u.pago.modo].toLowerCase() + ')' : 'Pendiente de cobro') +
      '</p>' +
      '<div class="acts"><a class="btn peq" href="#/papel/' +
      C.id +
      '/contrato">Ver el contrato</a><button class="btn peq" data-a="conFac" data-c="' +
      C.id +
      '">Copiar los datos de la factura</button>' +
      (C.e === 'activo' && !u.pago.cobrado ? '<button class="btn peq" data-a="conCob" data-c="' + C.id + '">Apuntar cobro</button>' : '') +
      (ren ? '<button class="btn peq" data-a="conRen" data-c="' + C.id + '">Renovar contrato</button>' : '') +
      '</div>' +
      (C.e === 'activo' ? '<p class="fin"><button class="txt mal" data-a="conBaja" data-c="' + C.id + '">Dar de baja</button></p>' : '') +
      '</div>'
  );
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-a],a[href]');
    if (b && b.dataset.a !== 'conFac') setTimeout(() => d.close(), 0);
  });
}

function hConAlta(A) {
  let plan = PLANES[0],
    acepta = 'firma',
    modo = 'pendiente',
    pad;
  const c = A ? A.cli : {},
    l = (A && A.idioma) || ''; /* lo que firma el cliente, en su idioma */
  const pl = x => esc(cfg.planes[x].n) + ' · ' + K.eur(cfg.planes[x].precio) + ' al año',
    cp = (id, lb, v, o) =>
      '<div class="campo"><label for="ca_' +
      id +
      '">' +
      lb +
      '</label><input id="ca_' +
      id +
      '" value="' +
      esc(v || '') +
      '" ' +
      (o || '') +
      ' autocomplete="off"></div>';
  /* paso a paso (20-11-2026): el plan, los datos del cliente, cómo dice que sí (con lo de los 14 días delante y, si firma,
    su firma) y si lo paga ya. Si al dar de alta falla un dato, se vuelve a su paso */
  const d = hoja(
    hc('Contrato de mantenimiento') +
      '<form class="hb" id="caF" novalidate>' +
      '<section class="hpaso" data-t="' +
      (PLANES.length > 1 ? '¿Qué plan?' : 'El plan') +
      '">' +
      (PLANES.length > 1
        ? '<div class="ops" role="radiogroup" aria-label="Plan">' +
          PLANES.map(x => '<button type="button" class="op" data-cp="' + x + '" role="radio" aria-checked="' + (x === plan) + '">' + pl(x) + '</button>').join(
            ''
          ) +
          '</div>'
        : '<p><b>' + pl(plan) + '</b></p>') +
      '<p class="dn" id="ca_inc">' +
      incluye(plan) +
      '</p></section>' +
      '<section class="hpaso" data-t="Datos del cliente">' +
      cp('nomap', 'Nombre y apellidos', K.nomCli(c), 'maxlength="140"') +
      cp('tel', 'Teléfono', c.tel ? K.telBonito(c.tel) : '', 'inputmode="tel" maxlength="20"') +
      '<div class="duo">' +
      cp('dir', 'Dirección (calle, número, piso)', c.dir, 'maxlength="120"') +
      cp('cp', 'Código postal', c.cp, 'inputmode="numeric" maxlength="5"') +
      '</div></section>' +
      ('<section class="hpaso" data-t="¿Cómo dice que sí?"><div class="ops" role="radiogroup" aria-label="Cómo dice que sí">' +
        '<button type="button" class="op" data-ca="firma" role="radio" aria-checked="true">Firma aquí</button>' +
        '<button type="button" class="op" data-ca="mensaje" role="radio" aria-checked="false">Lo ha dicho por mensaje</button></div>') +
      ('<div class="des"><p>Tiene 14 días para desistir. Si quiere la revisión antes, márcalo: si desiste después de la revisión, paga la parte proporcional.</p>' +
        '<label class="chk"><input type="checkbox" id="ca_pide"> Quiere la revisión antes de esos 14 días</label></div>') +
      '<div class="firma" id="ca_fz"><div class="fh"><span class="lb"' +
      (l ? ' lang="' + l + '"' : '') +
      '>' +
      esc(_c('Firma del cliente', null, l)) +
      '</span><button class="txt" id="caB" type="button">Borrar</button></div><canvas id="caFi" aria-label="Zona para firmar con el dedo"></canvas></div></section>' +
      '<section class="hpaso" data-t="¿Lo paga ya?"><div id="caM">' +
      modos(['efectivo', 'tarjeta', 'bizum', 'transferencia', 'pendiente'], modo) +
      '</div></section>' +
      '<p class="err" id="ca_err" style="color:var(--mal)" hidden></p></form><div class="hp"><button class="btn pri ancho" form="caF">Dar de alta el contrato</button></div>',
    { llena: 1 }
  );
  pad = Oficio.firma($('#caFi', d));
  $('#caB', d).onclick = () => pad.borrar();
  const vC = k => $('#ca_' + k, d).value,
    malC = () => {
      if (!K.parteNombre(vC('nomap')).bien) return ERR.nomap || 'Escribe su nombre y apellidos.';
      if (!K.tel9(vC('tel'))) return ERR.tel || 'Escribe un teléfono que funcione.';
      if (vC('dir').trim().replace(/\s+/g, ' ').length < 5) return ERR.dir || 'Escribe la calle, el número y el piso.';
      const z = String(vC('cp')).replace(/\D/g, '');
      return cfg.zonas.cp[z] ? '' : (z.length === 5 ? ERR.zona : ERR.cp) || 'Revisa el código postal.';
    };
  const pg = pasosHoja(d, {
    ok: [null, malC, () => (acepta === 'firma' && pad.vacia() ? 'Falta la firma del cliente.' : '')],
    al: [null, null, () => pad.medir()]
  });
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-cp],[data-ca],[data-modo]');
    if (!b) return;
    if (b.dataset.cp) {
      plan = b.dataset.cp;
      $$('[data-cp]', d).forEach(x => x.setAttribute('aria-checked', String(x.dataset.cp === plan)));
      $('#ca_inc', d).textContent = incluye(plan);
    } else if (b.dataset.ca) {
      acepta = b.dataset.ca;
      $$('[data-ca]', d).forEach(x => x.setAttribute('aria-checked', String(x.dataset.ca === acepta)));
      $('#ca_fz', d).hidden = acepta !== 'firma';
    } else {
      modo = b.dataset.modo;
      $('#caM', d).innerHTML = modos(['efectivo', 'tarjeta', 'bizum', 'transferencia', 'pendiente'], modo);
    }
  });
  $('#caF', d).onsubmit = e => {
    e.preventDefault();
    const m = $('#ca_err', d),
      v = k => $('#ca_' + k, d).value,
      di = t => {
        m.textContent = t;
        m.hidden = false;
      };
    if (acepta === 'firma' && pad.vacia()) return di('Falta la firma del cliente.');
    const pn = K.parteNombre(v('nomap')),
      a = {
        tipo: 'contrato',
        plan,
        cli: { nombre: pn.nombre, apellidos: pn.apellidos, tel: v('tel'), dir: v('dir'), cp: v('cp') },
        acepta,
        pide: $('#ca_pide', d).checked
      };
    if (Q.rol === 'tecnico' && A) a.aviso = A.id;
    if (acepta === 'firma') a.firma = pad.ruta();
    if (modo !== 'pendiente') a.modo = modo;
    const bt = $('button[form=caF]', d);
    if (bt.disabled) return;
    bt.disabled = true;
    Oficio.crear(a, Q).then(r => {
      bt.disabled = false;
      if (!r.ok) {
        const m0 = errDe(r) || 'No se ha podido dar de alta.';
        if (['nombre', 'apellidos', 'tel', 'dir', 'cp', 'zona'].includes(r.err)) {
          pg.ve(1, true);
          pg.falla(m0);
          return;
        }
        return di(m0);
      }
      d.close();
      /* el técnico con servidor no tiene la lista de contratos: se queda en su aviso; el papel lo tienen la oficina y el cliente en su zona */
      if (Q.rol === 'centralita' || contrato(r.id)) {
        toast('Contrato ' + r.id + ' dado de alta.');
        location.hash = '#/papel/' + r.id + '/contrato';
      } else {
        toast('Contrato ' + r.id + ' dado de alta. El cliente lo tiene en su zona.');
        pinta();
      }
    });
  };
}
function hConCob(C) {
  const u = C.per[C.per.length - 1],
    L = ['efectivo', 'tarjeta', 'bizum', 'transferencia'];
  let modo = u.pago && u.pago.dice ? u.pago.dice.modo : '';
  const d = hoja(
    hc('Cuota cobrada') +
      '<div class="hb"><p>' +
      esc(C.id) +
      ' · ' +
      esc(K.nomCli(C.cli)) +
      ' · <b class="num">' +
      K.eur(u.precio) +
      '</b></p>' +
      (u.pago && u.pago.dice
        ? '<p class="ojo">El cliente dice que la ha pagado por ' +
          PAGO[u.pago.dice.modo].toLowerCase() +
          ' ' +
          hace(u.pago.dice.t) +
          '. Míralo en el banco antes de apuntarla.</p>'
        : '') +
      '<div class="campo"><span class="lb">¿Cómo ha pagado?</span><div id="ccM">' +
      modos(L, modo) +
      '</div></div></div><div class="hp"><button class="btn pri ancho" id="ccOk"' +
      (modo ? '' : ' disabled') +
      '>Apuntar el cobro</button></div>'
  );
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-modo],#ccOk');
    if (!b) return;
    if (b.dataset.modo) {
      modo = b.dataset.modo;
      $('#ccM', d).innerHTML = modos(L, modo);
      $('#ccOk', d).disabled = false;
    } else if (hacer({ tipo: 'cobroContrato', id: C.id, modo }).ok) {
      d.close();
      toast('Cuota cobrada.');
    }
  });
}
function hConRen(C) {
  let modo = 'pendiente';
  const P = cfg.planes[C.plan],
    u = C.per[C.per.length - 1],
    L = ['efectivo', 'tarjeta', 'bizum', 'transferencia', 'pendiente'];
  const d = hoja(
    hc('Renovar el contrato') +
      '<div class="hb"><p>' +
      esc(C.id) +
      ' · ' +
      esc(K.nomCli(C.cli)) +
      '</p><p>' +
      (K.madrid().date > u.a ? 'Acabó' : 'Acaba') +
      ' el ' +
      K.fechaCorta(u.a) +
      '. El año nuevo, ' +
      K.eur(P ? P.precio : u.precio) +
      '.</p><p class="dn">Solo si el cliente ha dicho que sí: no se renueva solo.</p><div class="campo"><span class="lb">¿Lo paga ya?</span><div id="crM">' +
      modos(L, modo) +
      '</div></div></div><div class="hp"><button class="btn pri ancho" id="crOk">Ha dicho que sí: renovar</button></div>'
  );
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-modo],#crOk');
    if (!b) return;
    if (b.dataset.modo) {
      modo = b.dataset.modo;
      $('#crM', d).innerHTML = modos(L, modo);
      return;
    }
    const a = { tipo: 'renovar', id: C.id, acepta: true };
    if (modo !== 'pendiente') a.modo = modo;
    if (hacer(a).ok) {
      d.close();
      toast('Renovado hasta el ' + K.fechaCorta(contrato(C.id).per.slice(-1)[0].a) + '.');
    }
  });
}
function hConBaja(C) {
  const des = K.madrid().date <= K.masDias(K.madrid(C.t).date, 14);
  const d = hoja(
    hc('Dar de baja el contrato') +
      '<div class="hb"><p>' +
      esc(C.id) +
      ' · ' +
      esc(K.nomCli(C.cli)) +
      '</p><p class="dn">' +
      (des
        ? 'Está dentro de sus 14 días: es desistir, y se le devuelve lo pagado menos la parte de la revisión si ya se hizo.'
        : 'Sin penalización. Sus avisos dejan de llevar el contrato.') +
      ('</p><div class="campo"><label for="cbM">Motivo (opcional)</label><input id="cbM" maxlength="120" autocomplete="off">' +
        '</div></div><div class="hp"><button class="btn pri ancho" id="cbOk">Dar de baja</button></div>')
  );
  $('#cbOk', d).onclick = () => {
    if (hacer({ tipo: 'bajaContrato', id: C.id, motivo: $('#cbM', d).value }).ok) {
      d.close();
      toast(des ? 'Baja apuntada: desiste del contrato.' : 'Baja apuntada.');
    }
  };
}
