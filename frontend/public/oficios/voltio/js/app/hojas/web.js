/* OOOX Oficios · la app (app.html), hojas/web. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== los servicios de la web (18-11-2026): la oficina o el dueño cambian lo que su web enseña en «¿Qué necesitas
   arreglar?» y lo que sale al pedir cita: el nombre, la frase, el precio con cita (el urgente sale de él), la foto, el orden y
   si sale. Se ve al momento: en la demo, en este navegador; con servidor, en cuanto llega al servidor ===== */
const WERR = {
  permiso: 'Solo la oficina o el dueño pueden cambiar la web.',
  estado: 'Ese servicio ya está como al principio.',
  foto: 'Esa foto no vale o pesa demasiado.'
};
const hazWeb = a => {
  const r = Oficio.hacer(a, Q);
  if (!r.ok) toast(WERR[r.err] || ERR[r.err] || 'No se ha podido cambiar.');
  return r;
};
const eurW = c => K.eur(c).replace(',00', ''),
  rangoW = (a, b) => (b ? eurW(a).replace(/\s€$/, '') + '–' + eurW(b) : 'desde ' + eurW(a));
const numW = v => {
  const t = String(v || '')
    .replace(/[\s€]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  return t === '' ? null : /^\d{1,5}(\.\d{1,2})?$/.test(t) ? +t : NaN;
};
const txtW = x => (x == null ? '' : String(x).replace('.', ','));
let WEBP = null;
Oficio.suscribir(() => {
  if (WEBP) WEBP();
}); // la hoja abierta se repinta si cambia algo (otra pestaña, el servidor)
function hWeb() {
  const d = hoja(hc('Servicios de la web') + '<div class="hb" id="wB"></div><div class="hp" id="wP"></div>', { llena: true });
  let ed = '',
    dr = null;
  d.addEventListener('close', () => {
    WEBP = null;
  });
  const L = () => K.webDe(Oficio.estado(), cfg),
    Pw = x => K.webPrecios(cfg, x) || { a: 0, b: null, u: 0, un: 0 };
  /* la foto que ha puesto el negocio o, si no, la de su web (en la demo) o la de la cita */
  const img = (x, c) =>
    x.foto
      ? '<img class="' + (c || 'wsi') + '" src="' + esc(Oficio.fotoSrc(x.foto, 'web')) + '" alt="" width="56" height="56">'
      : '<img class="' +
        (c || 'wsi') +
        '" src="assets/img/sv-' +
        x.id +
        '-s.webp" alt="" width="56" height="56" onerror="if(this.dataset.f)this.style.visibility=\'hidden\';else{this.dataset.f=1;this.src=\'assets/img/av-' +
        x.id +
        '-s.webp\'}">';
  const precios = x => {
    const P = Pw(x);
    return 'Con cita ' + rangoW(P.a, P.b) + ' · urgente desde ' + eurW(P.u) + ' (noche y festivos, ' + eurW(P.un) + ')';
  };
  const lee = () => {
    if (!dr) return;
    const v = id => {
      const e = $('#' + id, d);
      return e ? e.value : '';
    };
    dr.n = v('wN');
    dr.d = v('wD');
    dr.de = v('wDe');
    dr.ha = v('wHa');
    const c = $('#wV', d);
    if (c) dr.vis = c.checked;
  };
  /* lo que dirá la web con lo escrito: el urgente sale del precio con cita */
  const ayudaP = x => {
    const P0 = Pw({ id: x.id }),
      de = numW(dr.de),
      ha = numW(dr.ha);
    if (Number.isNaN(de) || Number.isNaN(ha)) return '<span class="mal">Escribe solo la cifra en euros, como 80 o 79,50.</span>';
    if (de == null)
      return ha != null
        ? '<span class="mal">Pon también «desde».</span>'
        : 'Vacío, el de tu lista de precios: ' + rangoW(P0.a, P0.b) + '. Urgente, desde ' + eurW(P0.u) + ' (de noche y festivos, desde ' + eurW(P0.un) + ').';
    if (ha != null && ha < de) return '<span class="mal">«Hasta» tiene que ser más que «desde».</span>';
    const P = Pw({ id: x.id, desde: de, hasta: ha });
    return (
      'En la web: con cita ' +
      rangoW(P.a, P.b) +
      '. El urgente sale solo: desde ' +
      eurW(P.u) +
      ' con el suplemento de salir en el momento, y desde ' +
      eurW(P.un) +
      ' de noche y festivos.'
    );
  };
  const p = () => {
    if (!d.open) return;
    const T = L();
    if (!ed) {
      WEBP = p;
      dr = null;
      $('#wB', d).innerHTML =
        '<p class="dn">Lo que cambies aquí sale al momento en tu web («¿Qué necesitas arreglar?») y al pedir cita. Los precios llevan el IVA.</p><ol class="wsl">' +
        T.map(
          (x, i) =>
            '<li class="wsf' +
            (x.oculto ? ' fuera' : '') +
            '" data-w="' +
            x.id +
            '">' +
            img(x) +
            '<span class="wsn"><b>' +
            esc(x.n) +
            '</b><small>' +
            esc(precios(x)) +
            '</small>' +
            (x.oculto ? '<small class="wso">No sale en la web</small>' : x.cambiado ? '<small class="wsc">Cambiado por ti</small>' : '') +
            '</span>' +
            '<span class="wsa"><button class="btn peq" data-ed="' +
            x.id +
            '" aria-label="Cambiar ' +
            esc(x.n) +
            '">Cambiar</button><span class="wsm"><button class="wmv wup" data-mueve="-1" aria-label="Subir ' +
            esc(x.n) +
            '"' +
            (i ? '' : ' disabled') +
            '>' +
            I.baja +
            '</button><button class="wmv" data-mueve="1" aria-label="Bajar ' +
            esc(x.n) +
            '"' +
            (i < T.length - 1 ? '' : ' disabled') +
            '>' +
            I.baja +
            '</button></span></span></li>'
        ).join('') +
        '</ol>';
      $('#wP', d).innerHTML = '<a class="btn ancho" href="./" target="_blank" rel="noopener">Ver la web</a><button class="btn ancho" data-x>Hecho</button>';
      return;
    }
    WEBP = null;
    const x = T.find(y => y.id === ed),
      b = cfg.av[ed];
    if (!x || !b) {
      ed = '';
      p();
      return;
    }
    if (!dr) dr = { n: x.nPropio ? x.n : '', d: x.dPropia ? x.d : '', de: txtW(x.desde), ha: txtW(x.hasta), vis: !x.oculto };
    const P0 = Pw({ id: x.id });
    $('#wB', d).innerHTML =
      '<div class="wsf wsh">' +
      img(x) +
      '<span class="wsn"><b>' +
      esc(x.n) +
      '</b><small>' +
      esc(precios(x)) +
      '</small></span></div>' +
      '<div class="campo"><label for="wN">Nombre</label><input id="wN" maxlength="40" autocomplete="off" value="' +
      esc(dr.n) +
      '" placeholder="' +
      esc(b.n) +
      '" aria-describedby="wNa"><p class="ayuda" id="wNa">Vacío, «' +
      esc(b.n) +
      '». Lo que escribas sale igual en los tres idiomas de la web.</p></div>' +
      '<div class="campo"><label for="wD">Frase</label><textarea id="wD" maxlength="140" aria-describedby="wDa">' +
      esc(dr.d) +
      '</textarea><p class="ayuda" id="wDa">Vacía, la que trae tu web. Hasta 140 letras; sale igual en los tres idiomas.</p></div>' +
      ('<fieldset class="campo wpr"><legend class="lb">Precio con cita, IVA incluido</legend>' +
        '<div class="wpx"><label for="wDe"><span>Desde</span><span class="wpe">' +
        '<input id="wDe" inputmode="decimal" autocomplete="off" value="') +
      esc(dr.de) +
      '" placeholder="' +
      esc(txtW(P0.a / 100)) +
      '" aria-describedby="wPa">€</span></label>' +
      '<label for="wHa"><span>Hasta <small class="opc">opcional</small></span><span class="wpe"><input id="wHa" inputmode="decimal" autocomplete="off" value="' +
      esc(dr.ha) +
      '" placeholder="' +
      esc(P0.b ? txtW(P0.b / 100) : '') +
      '" aria-describedby="wPa">€</span></label></div><p class="ayuda" id="wPa" aria-live="polite">' +
      ayudaP(x) +
      '</p></fieldset>' +
      '<div class="campo"><span class="lb">Foto</span><div class="wfo">' +
      img(x, 'wsg') +
      '<span class="wfb"><label class="btn peq">' +
      (x.foto ? 'Cambiar la foto' : 'Poner una foto tuya') +
      '<input class="vh" type="file" accept="image/*" id="wF"></label>' +
      (x.foto ? '<button type="button" class="txt" id="wFq">Volver a la de siempre</button>' : '') +
      '</span></div><p class="ayuda">La foto se guarda en cuanto la eliges. Mejor apaisada, con el trabajo en el centro.</p></div>' +
      '<label class="chk"><input type="checkbox" id="wV"' +
      (dr.vis ? ' checked' : '') +
      '>Sale en la web y al pedir cita</label>';
    $('#wP', d).innerHTML =
      '<button class="btn pri ancho" id="wOk">Guardar</button>' +
      (x.cambiado ? '<button class="txt" id="wQu" style="justify-self:center">Dejarlo como al principio</button>' : '') +
      '<button class="btn ancho" id="wAt">Volver a la lista</button>';
  };
  d.addEventListener('input', e => {
    if (!ed || !e.target.closest('#wB')) return;
    lee();
    if (e.target.id === 'wDe' || e.target.id === 'wHa') {
      const x = L().find(y => y.id === ed),
        a = $('#wPa', d);
      if (x && a) a.innerHTML = ayudaP(x);
    }
  });
  d.addEventListener('change', e => {
    if (e.target.id === 'wV') {
      lee();
      return;
    }
    if (e.target.id !== 'wF' || !e.target.files[0]) return;
    lee();
    const id = ed;
    Oficio.foto(e.target.files[0])
      .then(f => {
        if (ed === id && hazWeb({ tipo: 'web', av: id, foto: f }).ok) {
          toast('Foto puesta. Ya sale en tu web.');
          p();
        }
      })
      .catch(() => toast('No he podido leer esa foto.'));
  });
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-ed],[data-mueve],#wOk,#wQu,#wAt,#wFq');
    if (!b) return;
    if (b.dataset.ed) {
      ed = b.dataset.ed;
      dr = null;
      p();
      const n = $('#wN', d);
      if (n) n.focus();
      return;
    }
    if (b.dataset.mueve) {
      const id = b.closest('[data-w]').dataset.w,
        o = L().map(x => x.id),
        i = o.indexOf(id),
        j = i + +b.dataset.mueve;
      if (i < 0 || j < 0 || j >= o.length) return;
      [o[i], o[j]] = [o[j], o[i]];
      if (hazWeb({ tipo: 'web', orden: o }).ok) {
        p();
        const nb = $('[data-w="' + id + '"] [data-mueve="' + b.dataset.mueve + '"]', d) || $('[data-w="' + id + '"] [data-ed]', d);
        if (nb) nb.focus();
      }
      return;
    }
    if (b.id === 'wAt') {
      ed = '';
      p();
      return;
    }
    if (b.id === 'wFq') {
      lee();
      if (hazWeb({ tipo: 'web', av: ed, foto: '' }).ok) {
        toast('Vuelve a salir la foto de siempre.');
        p();
      }
      return;
    }
    if (b.id === 'wQu') {
      if (hazWeb({ tipo: 'web', av: ed, quitar: true }).ok) {
        toast('Ese servicio vuelve a estar como al principio.');
        ed = '';
        p();
      }
      return;
    }
    if (b.id === 'wOk') {
      lee();
      const x = L().find(y => y.id === ed),
        c = cfg.av[ed];
      if (!x || !c) return;
      const de = numW(dr.de),
        ha = numW(dr.ha);
      if (Number.isNaN(de) || Number.isNaN(ha) || (de == null && ha != null) || (ha != null && ha < de)) {
        const a = $('#wDe', d);
        if (a) a.focus();
        toast(ERR.webPrecio);
        return;
      }
      const n = dr.n.trim().replace(/\s+/g, ' '),
        f = dr.d.trim().replace(/\s+/g, ' ');
      const r = hazWeb({ tipo: 'web', av: ed, n: n === c.n ? '' : n, d: f, desde: de, hasta: de == null ? null : ha, oculto: !dr.vis });
      if (r.ok) {
        toast('Guardado. Ya sale así en tu web.');
        ed = '';
        p();
      }
    }
  });
  p();
}
function hMenu() {
  if (SRV) return hSesion();
  const esT = Q.rol === 'tecnico';
  const d = hoja(
    hc(Oficio.DEMO ? 'Estás viendo la demo' : 'Quién usa la app') +
      '<div class="hb"><div class="campo"><span class="lb">Como</span><div class="mrol"><button class="tec" data-rol="centralita" aria-pressed="' +
      !esT +
      '"><i class="av c" aria-hidden="true">C</i><span><b>Centralita</b><small>Quien coge el teléfono y reparte</small></span></button>' +
      N.tecnicos
        .map(
          t =>
            '<button class="tec" data-rol="' +
            t.id +
            '" aria-pressed="' +
            (esT && Q.id === t.id) +
            '">' +
            ava(t.id) +
            '<span><b>' +
            esc(t.n + ' ' + t.ap) +
            '</b><small>Técnico' +
            (t.jefe ? ' y dueño' : '') +
            '</small></span></button>'
        )
        .join('') +
      '</div></div>' +
      (Oficio.DEMO
        ? '<p class="mnota">Todo es de ejemplo y se queda en este navegador. <a href="prueba.html" target="_top">Ver cliente, centralita y técnico a la vez</a> · <a href="./" target="_top">Volver a la web</a></p>'
        : '') +
      '</div>' +
      (manda() || Oficio.DEMO
        ? '<div class="hp">' +
          (manda() ? '<button class="btn ancho" id="mWeb">Servicios de la web</button>' : '') +
          (Oficio.DEMO ? '<button class="btn ancho" id="mRe">Reiniciar la demo</button>' : '') +
          '</div>'
        : '')
  );
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-rol],#mRe,#mWeb');
    if (!b) return;
    if (b.id === 'mWeb') {
      d.close();
      hWeb();
      return;
    }
    if (b.id === 'mRe') {
      Oficio.reiniciar();
      d.close();
      location.hash = '#/';
      pinta();
      toast('Demo reiniciada.');
      return;
    }
    d.close();
    cambiaRol(b.dataset.rol, '#/');
  });
}
/* cambiar de papel dentro de la demo (menú y recorrido): conserva «?vacia» / «?ejemplo» para que, al recargar, siga siendo la misma demo */
function cambiaRol(id, hash) {
  Q = id === 'centralita' ? { rol: 'centralita', id: 'oficina' } : { rol: 'tecnico', id };
  const sp = new URLSearchParams();
  if (Q.rol === 'tecnico') {
    sp.set('papel', 'tecnico');
    sp.set('tec', Q.id);
  }
  ['vacia', 'ejemplo'].forEach(k => P.has(k) && sp.set(k, ''));
  const u = new URL(location.href);
  u.search = sp.toString() ? '?' + sp.toString().replace(/=(&|$)/g, '$1') : '';
  u.hash = hash || '#/';
  history.replaceState(null, '', u);
  pinta();
  scrollTo(0, 0);
}

/* ===== el recorrido de la demo (26-11-2026) =====
   La demo pública arranca vacía: quien la ve por primera vez hace lo que haría con la app de verdad, con sus propios datos.
   Seis pasos que se marcan solos según el estado (lo que él ha creado) y un botón que lleva al sitio y al papel que toca. */
const REC = { visto: false };
function recPasos() {
  const L = S.avisos.filter(a => a.e !== 'cancelado').sort((a, b) => b.t - a.t),
    A = L[0],
    e = A ? A.e : '',
    tec = A && A.tec && cfg.tec[A.tec] ? A.tec : N.tecnicos[0].id,
    tn = (cfg.tec[tec] || {}).n || 'el técnico',
    ho = A ? '#/aviso/' + A.id : '#/';
  return [
    { t: 'Crea un aviso', d: 'Eres la centralita y un cliente acaba de llamar. Apunta qué le pasa, cuándo y dónde vive.', ok: !!A, rol: 'centralita', hash: '#/nuevo', b: 'Crear un aviso' },
    { t: 'Asígnalo a un técnico', d: 'Abre el aviso y elige quién va. La app te dice quién llega antes.', ok: !!A && !['nuevo', 'ausente'].includes(e), rol: 'centralita', hash: ho, b: 'Abrir el aviso' },
    { t: 'Ponte en el lugar del técnico: «Voy»', d: 'Ahora eres ' + tn + '. Cuando sale hacia casa del cliente, pulsa «Voy»: al cliente le llega el aviso.', ok: ['camino', 'curso', 'hecho'].includes(e), rol: tec, hash: ho, b: 'Entrar como ' + tn },
    { t: 'Empieza el trabajo y firma el presupuesto', d: 'Pulsa «Empezar», apunta lo que se va a hacer y que el cliente firme el precio en la pantalla.', ok: ['curso', 'hecho'].includes(e), rol: tec, hash: ho, b: 'Ir al aviso' },
    { t: 'Termina y cobra', d: 'Pulsa «Terminado», elige cómo paga el cliente y firma él.', ok: e === 'hecho', rol: tec, hash: ho, b: 'Ir al aviso' },
    { t: 'Vuelve a la centralita y mira el cobro', d: 'En el aviso queda todo: el parte, el precio firmado y el cobro. Y en «Más» › Cobros, lo que falta por facturar.', ok: e === 'hecho' && REC.visto, rol: 'centralita', hash: ho, b: 'Ver el aviso terminado' }
  ];
}
function recMira() {
  /* el último paso se da por visto al abrir, como centralita, los cobros o el aviso ya terminado */
  if (REC.visto || !Oficio.VACIA || Q.rol !== 'centralita') return;
  const r = ruta(),
    A = S.avisos.filter(a => a.e === 'hecho').sort((a, b) => b.t - a.t)[0];
  if (A && (r.v === 'cobros' || r.v === 'papel' || (r.v === 'aviso' && r.a === A.id))) REC.visto = true;
}
function pRec() {
  let b = $('#rec');
  if (!Oficio.VACIA || FIJO || P.has('solo') || SRV) {
    if (b) b.hidden = true;
    return;
  }
  recMira();
  if (!b) {
    b = document.createElement('button');
    b.id = 'rec';
    b.type = 'button';
    b.className = 'rec';
    $('#quien').insertAdjacentElement('afterend', b);
    b.addEventListener('click', hRec);
  }
  const P6 = recPasos(),
    i = P6.findIndex(x => !x.ok);
  b.hidden = false;
  b.innerHTML =
    i < 0
      ? '<b>Guía</b><span class="c">✓</span><span class="l">recorrido completo ✓</span>'
      : '<b>Guía</b><span class="c">' + (i + 1) + '/' + P6.length + '</span><span class="l">paso ' + (i + 1) + ' de ' + P6.length + '</span><small>' + esc(P6[i].t) + '</small>';
  b.setAttribute('aria-label', i < 0 ? 'Recorrido de la demo: completo' : 'Recorrido de la demo: paso ' + (i + 1) + ' de ' + P6.length + ', ' + P6[i].t);
}
function hRec() {
  const P6 = recPasos(),
    i = P6.findIndex(x => !x.ok);
  const d = hoja(
    hc('Recorrido de la demo') +
      '<div class="hb"><p class="mnota">Haz con tus propios datos lo que harías con la app de verdad. Cada paso se marca solo.</p><ol class="recl">' +
      P6.map(
        (x, k) =>
          '<li class="' +
          (x.ok ? 'ok' : k === i ? 'ya' : '') +
          '"><span class="rn" aria-hidden="true">' +
          (x.ok ? '✓' : k + 1) +
          '</span><div><b>' +
          x.t +
          '</b>' +
          (k === i ? '<p>' + x.d + '</p><button class="btn pri" data-go="' + k + '">' + x.b + '</button>' : '') +
          '</div></li>'
      ).join('') +
      '</ol>' +
      (i < 0 ? '<p class="mnota">Ya has hecho el recorrido entero. Puedes crear otro aviso o reiniciar la demo desde el menú de arriba.</p>' : '') +
      '</div>'
  );
  d.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (!g) return;
    const x = P6[+g.dataset.go];
    d.close();
    const igual = x.rol === 'centralita' ? Q.rol === 'centralita' : Q.rol === 'tecnico' && Q.id === x.rol;
    if (igual) {
      if (location.hash === x.hash) pinta();
      else location.hash = x.hash;
    } else cambiaRol(x.rol, x.hash);
  });
}
