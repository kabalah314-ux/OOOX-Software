/* OOOX Oficios · la app (app.html), vistas/mejoras. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== mejoras: lo que la oficina le pide a OOOX y lo que OOOX contesta ===== */
const SOP = Oficio.soporte,
  M = { paso: 0, tipo: '', texto: '', quien: '', err: '', env: false, cambia: false, codErr: '', carga: false, sinRed: false, nov: [], pet: [] };
let mP = null,
  MLH = '';
const RASTRO = [],
  PANT = [
    'bandeja',
    'mas',
    'agenda',
    'equipo',
    'furgo',
    'cobros',
    'contratos',
    'nuevo',
    'aviso',
    'papel'
  ]; /* RASTRO: las tres últimas pantallas (solo el nombre) antes de entrar aquí; viajan con la petición */
const MERR = {
  tipo: 'Elige qué es: un fallo, una mejora o una duda.',
  texto: 'Cuéntalo con algo más de detalle: al menos 10 letras.',
  largo: 'Es demasiado largo: como mucho 2.000 letras.',
  clave: 'Ese código de soporte no vale. Revísalo.',
  corto: 'Escribe el código de soporte que te dio OOOX.',
  bloqueo: 'Demasiados intentos con un código que no vale. Espera diez minutos.',
  limite: 'Has mandado muchas peticiones seguidas. Prueba dentro de un rato.',
  red: 'No hay conexión con OOOX. Prueba dentro de un rato.',
  servidor: 'No se ha podido enviar. Prueba otra vez.'
};
const MPILL = { mirando: 'camino', aceptada: 'curso', en_curso: 'curso', hecha: 'hecho', descartada: 'ausente' },
  MNOV = { novedad: 'Novedad', oferta: 'Oferta', aviso: 'Aviso' };
const mHace = x => {
  const t = Date.parse(x);
  return isNaN(t) ? '' : hace(t);
};
const mTab = () => {
  const r = ruta();
  return r.v === 'mejoras' && ['peticiones', 'novedades'].includes(r.a) ? r.a : 'pedir';
};
function mListas() {
  const c = SOP.cache(),
    T = OficioSoporte.TIPOS,
    E = OficioSoporte.ESTADOS,
    enCola = c.peticiones.filter(p => p.estado === 'en_cola').length,
    tab = mTab();
  let h =
    tab !== 'peticiones'
      ? ''
      : '<section class="sec" id="mPet"><h2>Tus peticiones <span class="n">' +
        c.peticiones.length +
        '</span></h2>' +
        (c.peticiones.length
          ? '<ul class="pets">' +
            c.peticiones
              .map(p => {
                const nv = M.pet.includes(p.id);
                return (
                  '<li class="pet' +
                  (nv ? ' nueva' : '') +
                  '"><div class="pc"><span class="pt">' +
                  esc(T[p.tipo] || 'Petición') +
                  '</span><span class="pill ' +
                  (MPILL[p.estado] || '') +
                  '">' +
                  esc(E[p.estado] || 'Recibida') +
                  '</span></div><p class="px">' +
                  esc(p.texto) +
                  '</p>' +
                  '<p class="pm">' +
                  (nv ? 'Sin leer · ' : '') +
                  (p.quien ? esc(p.quien) + ' · ' : '') +
                  mHace(p.creada) +
                  '</p>' +
                  (p.respuesta ? '<div class="pr"><span class="lb">OOOX responde</span><p>' + esc(p.respuesta) + '</p></div>' : '') +
                  '</li>'
                );
              })
              .join('') +
            '</ul>'
          : '<p class="hueco">' +
            (M.carga && !c.t ? 'Buscando tus peticiones…' : 'Aún no has pedido nada. Lo que mandes aparecerá aquí, con su respuesta.') +
            '</p>') +
        (enCola
          ? '<p class="mpie">' +
            (enCola === 1
              ? 'Hay 1 petición sin enviar: saldrá sola cuando haya conexión.'
              : 'Hay ' + enCola + ' peticiones sin enviar: saldrán solas cuando haya conexión.') +
            ' <button class="txt" type="button" data-a="mReintenta">Probar ahora</button></p>'
          : '') +
        (M.sinRed && !enCola ? '<p class="mpie">Sin conexión con OOOX: ves lo último que se guardó en este aparato.</p>' : '') +
        '</section>';
  if (tab === 'novedades')
    h +=
      '<section class="sec" id="mNov"><h2>Novedades de OOOX <span class="n">' +
      c.novedades.length +
      '</span></h2>' +
      (c.novedades.length
        ? '<ul class="pets">' +
          c.novedades
            .map(n => {
              const nv = M.nov.includes(n.id),
                ok = typeof n.enlace === 'string' && /^https:\/\/[^\s"'<>]+$/.test(n.enlace);
              return (
                '<li class="pet' +
                (nv ? ' nueva' : '') +
                '"><div class="pc"><span class="pt">' +
                esc(n.titulo) +
                '</span><span class="pill">' +
                (MNOV[n.tipo] || 'Novedad') +
                '</span></div><p class="px">' +
                esc(n.texto) +
                '</p>' +
                (ok ? '<a class="txt" href="' + esc(n.enlace) + '" target="_blank" rel="noopener noreferrer">Ver más</a>' : '') +
                '<p class="pm">' +
                (nv ? 'Sin leer · ' : '') +
                mHace(n.desde) +
                '</p></li>'
              );
            })
            .join('') +
          '</ul>'
        : '<p class="hueco">Cuando haya algo nuevo en la app, te lo contamos aquí.</p>') +
      '<p class="mpie">' +
      (c.sin_ofertas
        ? 'No recibes ofertas de OOOX. <button class="txt" type="button" data-a="mOfertas" data-q="1">Volver a recibirlas</button>'
        : 'Aquí también pueden llegarte ofertas de OOOX. <button class="txt" type="button" data-a="mOfertas" data-q="0">No quiero ofertas</button>') +
      '</p></section>';
  if (tab === 'pedir') return '';
  if (!Oficio.DEMO) h += '<p class="mpie"><button class="txt" type="button" data-a="mCambia">Cambiar el código de soporte</button></p>';
  return h;
}
function vMejoras() {
  let h = '<div class="cab"><div><h1>Mejoras</h1><p class="sub">Dinos qué falla o qué echas de menos. Lo lee OOOX y te contesta aquí mismo.</p></div></div>';
  if (Oficio.DEMO) h += '<p class="ojo">Esto es una demo. Lo que escribas llega a OOOX como prueba y solo se ve en este navegador.</p>';
  if (!SOP.codigo() || M.cambia)
    return (
      h +
      '<form class="form" id="fCodigo" novalidate><div class="campo' +
      (M.codErr ? ' mal' : '') +
      '"><label for="m_cod">Código de soporte</label><input id="m_cod" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80"' +
      (M.codErr ? ' aria-invalid="true" aria-describedby="e_mcod"' : ' aria-describedby="a_mcod"') +
      '>' +
      (M.codErr ? '<p class="err" id="e_mcod">' + MERR[M.codErr] + '</p>' : '') +
      '<p class="ayuda" id="a_mcod">Te lo dio OOOX al dar de alta el negocio. Se guarda solo en este aparato.</p></div>' +
      '<button class="btn pri ancho" id="mCodOk">Guardar el código</button>' +
      (SOP.codigo() ? '<button class="btn ancho" type="button" data-a="mCancela">Dejarlo como está</button>' : '') +
      '</form>'
    );
  /* con su marco (20-11-2026): «Pedir» (el formulario, en dos pasos), «Tus peticiones» y «Novedades» */
  {
    const c = SOP.cache(),
      tab = mTab();
    h += pestas(
      [
        { k: 'pedir', h: '#/mejoras', t: 'Pedir' },
        { k: 'peticiones', h: '#/mejoras/peticiones', t: 'Tus peticiones', n: c.peticiones.length },
        { k: 'novedades', h: '#/mejoras/novedades', t: 'Novedades', n: c.novedades.length }
      ],
      tab,
      'Qué ver de las mejoras'
    );
    if (tab !== 'pedir') return h + '<div class="pcuerpo" id="mLista">' + (MLH = mListas()) + '</div>';
  }
  const T = OficioSoporte.TIPOS,
    eT = M.err === 'tipo',
    eX = M.err === 'texto' || M.err === 'largo';
  /* en dos pasos (20-11-2026): qué es y, luego, cuéntalo */
  if (eT) M.paso = 0;
  const pq = M.paso === 1 && M.tipo ? 1 : 0;
  const prog =
    '<nav class="prog" aria-label="Pasos">' +
    (pq ? '<button type="button" class="atras" data-m-atras aria-label="Atrás">' : '<button type="button" class="atras no" tabindex="-1" aria-hidden="true">') +
    I.atras +
    '</button><ol><li class="' +
    (pq ? 'ok' : 'ya') +
    '"' +
    (pq ? '' : ' aria-current="step"') +
    '><span class="vh">¿Qué es?</span></li><li class="' +
    (pq ? 'ya' : '') +
    '"' +
    (pq ? ' aria-current="step"' : '') +
    '><span class="vh">Cuéntalo</span></li></ol><span class="pn">Paso ' +
    (pq + 1) +
    ' de 2</span></nav>';
  return (
    h +
    '<form class="form pcuerpo" id="fMejora" data-paso="' +
    pq +
    '" novalidate>' +
    prog +
    '<h2 class="npq" id="mTit" tabindex="-1">' +
    (pq ? 'Cuéntalo' : '¿Qué es?') +
    '</h2>' +
    (pq
      ? '<p class="lleva">' +
        T[M.tipo] +
        '</p>' +
        '<div class="campo' +
        (eX ? ' mal' : '') +
        '"><label class="vh" for="m_texto">Cuéntalo</label><textarea id="m_texto" data-m="texto" rows="5" maxlength="2000"' +
        (eX ? ' aria-invalid="true" aria-describedby="e_mtexto"' : ' aria-describedby="a_mtexto"') +
        '>' +
        esc(M.texto) +
        '</textarea>' +
        (eX
          ? '<p class="err" id="e_mtexto">' + MERR[M.err] + '</p>'
          : '<p class="ayuda" id="a_mtexto">Qué estabas haciendo, qué pasó y qué esperabas. Sin datos de tus clientes.</p>') +
        '</div>' +
        '<div class="campo"><label for="m_quien">Tu nombre <small class="opc">Opcional</small></label><input id="m_quien" data-m="quien" value="' +
        esc(M.quien) +
        '" maxlength="60" autocomplete="off"></div>' +
        ('<p class="mnota">Con la petición viajan el nombre de las últimas pantallas por las que has pasado, el tamaño de la pantalla, la versión de la app y el tipo de aparato. ' +
          'Nada de tus avisos ni de tus clientes.</p>') +
        '<button class="btn pri ancho" id="mOk"' +
        (M.env ? ' disabled' : '') +
        '>' +
        (M.env ? 'Enviando…' : 'Enviar a OOOX') +
        '</button>'
      : '<div class="campo' +
        (eT ? ' mal' : '') +
        '"><div class="ops" role="radiogroup" aria-labelledby="mTit">' +
        Object.keys(T)
          .map(k => '<button type="button" class="op" data-m-tipo="' + k + '" role="radio" aria-checked="' + (M.tipo === k) + '">' + T[k] + '</button>')
          .join('') +
        '</div><p class="err" id="e_mtipo"' +
        (eT ? '' : ' hidden') +
        '>' +
        MERR.tipo +
        '</p></div>' +
        '<button class="btn pri ancho" id="mSig">Continuar</button>') +
    '</form>'
  );
}
function mPonListas() {
  const x = $('#mLista'),
    h = mListas();
  if (x && h !== MLH) {
    x.innerHTML = h;
    MLH = h;
  }
}
/* Lo que estaba sin leer al entrar se queda marcado mientras se mira; el número del menú baja a cero. */
/* Con pestañas (20-11-2026), solo lo de la que se está mirando: lo que no se ha visto no se da por visto */
function mVisto() {
  const t = mTab();
  if (t === 'pedir') return;
  const k = t === 'peticiones' ? 'pet' : 'nov',
    s = SOP.sinVer()[k];
  s.forEach(x => {
    if (!M[k].includes(x)) M[k].push(x);
  });
  if (s.length) SOP.marcaVisto(k);
}
function mTrae(fuerza) {
  if (!SOP || !SOP.codigo()) return Promise.resolve(null);
  if (mP) return fuerza ? mP.then(() => mTrae(true)) : mP;
  if (!fuerza && !SOP.toca(60000)) return Promise.resolve(null);
  M.carga = true;
  return (mP = SOP.buzon().then(r => {
    mP = null;
    M.carga = false;
    M.sinRed = !r.ok && r.err === 'red';
    const mal = !r.ok && (r.err === 'clave' || r.err === 'bloqueo') && !Oficio.DEMO;
    if (mal) {
      if (r.err === 'clave') SOP.olvidaCodigo();
      M.cambia = true;
      M.codErr = r.err;
    }
    // si el buzón contesta antes de que la app haya pintado su primera pantalla (la primera vez de la demo, o una pestaña
    // abierta en segundo plano), no se pinta nada todavía: ya lo hará el arranque (23-11-2026)
    if (!S) return r;
    if (ruta().v === 'mejoras' && Q.rol !== 'tecnico') {
      if (mal) pinta();
      else {
        mVisto();
        mPonListas();
      }
    }
    pNav();
    if (ruta().v === 'mas' && Q.rol !== 'tecnico') pinta(); /* «Más» lleva el número de «Mejoras»: se pone al día si llega después de pintar */
    return r;
  }));
}
function mEnvia() {
  if (M.env) return;
  const p = { tipo: M.tipo, texto: M.texto, quien: M.quien, pantalla: (RASTRO.join(' > ') || 'bandeja') + ' · ' + innerWidth + '×' + innerHeight };
  const e = String(M.texto).trim().length > 2000 ? 'largo' : SOP.valida(p);
  if (e) {
    M.err = e;
    if (e === 'tipo') M.paso = 0;
    pinta();
    const i = e === 'tipo' ? $('#fMejora [data-m-tipo]') : $('#m_texto');
    if (i) {
      i.focus({ preventScroll: true });
      i.closest('.campo').scrollIntoView({ block: 'center' });
    }
    return;
  }
  M.env = true;
  M.err = '';
  const b = $('#mOk');
  if (b) {
    b.disabled = true;
    b.textContent = 'Enviando…';
  }
  SOP.enviar(p).then(r => {
    M.env = false;
    if (r.ok) {
      M.tipo = '';
      M.texto = '';
      M.paso = 0;
      toast(r.enCola ? 'Sin conexión: queda guardada y saldrá sola.' : 'Enviada. Te contestamos aquí.');
    } else if (r.err === 'clave' && !Oficio.DEMO) {
      SOP.olvidaCodigo();
      M.cambia = true;
      M.codErr = 'clave';
      toast(MERR.clave);
    } else toast(MERR[r.err] || MERR.servidor);
    /* enviada (o guardada sin conexión), se enseña en «Tus peticiones», con su estado */
    const fin = () => {
      if (ruta().v === 'mejoras') {
        if (r.ok && location.hash !== '#/mejoras/peticiones') location.hash = '#/mejoras/peticiones';
        else pinta();
      }
    };
    if (r.ok && !r.enCola) mTrae(true).then(fin, fin);
    else fin();
  });
}
function mCodigo() {
  const i = $('#m_cod');
  if (!SOP.ponCodigo(i ? i.value : '')) {
    M.codErr = 'corto';
    pinta();
    const j = $('#m_cod');
    if (j) j.focus();
    return;
  }
  M.cambia = false;
  M.codErr = '';
  const b = $('#mCodOk');
  if (b) {
    b.disabled = true;
    b.textContent = 'Comprobando…';
  }
  mTrae(true).then(r => {
    if (!M.cambia) toast(r && r.ok ? 'Código guardado en este aparato.' : 'Guardado. Sin conexión no se puede comprobar todavía.');
    if (ruta().v === 'mejoras') {
      pinta();
      const j = $('#m_cod');
      if (j) j.focus();
    }
  });
}
