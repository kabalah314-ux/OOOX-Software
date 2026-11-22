/* OOOX Oficios · la app (app.html), hojas/mensajes. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== las hojas de cada paso ===== */
/* por qué sale cada mensaje, en pocas palabras (los del seguimiento, con porQue) */
const POR_MSG = {
  recibido: 'Ha entrado su aviso: que sepa que lo tenemos.',
  cita: 'Ya tiene técnico y hora.',
  vispera: 'Mañana es su cita.',
  camino: 'El técnico va de camino.',
  ausente: 'Fuimos y no había nadie: que diga cuándo volver.',
  hecho: 'Trabajo terminado: el resumen y la garantía.',
  cobro: 'Queda un pago pendiente.'
};
/* lo último que se le mandó a este cliente (por su teléfono, en todos sus avisos): para no escribirle dos veces seguidas */
const ultimoMsg = tel => {
  const t9 = K.tel9(tel);
  let u = null;
  if (t9)
    S.avisos.forEach(x => {
      if (x.cli && x.cli.tel === t9)
        (x.msgs || []).forEach(m => {
          if (m.env && !m.no && (!u || m.env > u.m.env)) u = { a: x, m };
        });
    });
  return u;
};
/* el enlace del aviso en los mensajes que lo necesitan (16-11-2026): así quien avisa por teléfono también ve quién va y cuándo.
   Con servidor lleva la llave del aviso; en la demo, sin ella, solo sirve en este navegador */
const enlaceDe = (A, k) => {
  if (!['recibido', 'cita', 'vispera', 'camino', 'hecho'].includes(k)) return '';
  const u = new URL(
    'cita.html' + idiomaUrl(A) + '#/aviso/' + encodeURIComponent(A.id) + (typeof A.llave === 'string' && A.llave ? '/' + A.llave : ''),
    location.href
  ).href;
  return (
    '\n\n' +
    (k === 'hecho'
      ? _c('Tu aviso, con el total y la garantía: {enlace}', { enlace: u }, A.idioma)
      : _c('Sigue tu aviso aquí: {enlace}', { enlace: u }, A.idioma))
  );
};
/* el texto de un mensaje, en el idioma del cliente */
const textoMsg = (A, k) => K.mensaje(cfg, A, k, IDI ? IDI.para(A.idioma || 'es') : undefined) + enlaceDe(A, k);
function hMsg(A, k) {
  const txt = textoMsg(A, k),
    m = A.msgs.find(x => x.k === k && !x.env),
    u = ultimoMsg(A.cli.tel),
    hs = m && m.hasta;
  const dat =
    '<dl class="mdat"><div><dt>Para</dt><dd>' +
    esc(K.nomCli(A.cli) || 'Aún sin nombre') +
    (A.cli.tel ? ' · ' + K.telBonito(A.cli.tel) : '') +
    '</dd></div><div><dt>Por qué</dt><dd>' +
    (K.SEGUIR.includes(k) ? esc(porQue({ a: A, m: m || { k } })) : POR_MSG[k] || '') +
    '</dd></div>' +
    (hs ? '<div><dt>Caduca</dt><dd>el ' + K.fechaCorta(K.madrid(hs).date) + '; después ya no sale</dd></div>' : '') +
    '<div><dt>Último mensaje</dt><dd>' +
    (u ? '«' + K.MSG[u.m.k] + '», ' + hace(u.m.env) : 'todavía no se le ha escrito') +
    '</dd></div></dl>';
  /* la oficina puede dejarlo sin mandar; en el seguimiento, apuntar que el cliente no quiere estos mensajes (se le dice en cada uno, como pide la ley) */
  const mas =
    m && Q.rol === 'centralita'
      ? '<div class="mno"><button class="txt" id="mNo" type="button">No hace falta mandarlo</button>' +
        (K.SEGUIR.includes(k) ? '<button class="txt" id="mBaja" type="button">No quiere estos mensajes</button>' : '') +
        '</div>'
      : '';
  const d = hoja(
    hc(K.MSG[k]) +
      '<div class="hb">' +
      dat +
      waHtml(txt, A.cli.nombre) +
      (Oficio.DEMO
        ? '<p class="dn">En la app real, este botón abre WhatsApp con el mensaje ya escrito para ' +
          esc(A.cli.nombre.split(' ')[0]) +
          '. En la demo no se escribe a nadie.</p></div><div class="hp"><button class="btn pri ancho" id="mOk">' +
          (m ? 'Enviar' : 'Entendido') +
          '</button>' +
          mas +
          '</div>'
        : '<p class="dn">Se abre WhatsApp con el mensaje ya escrito. Revísalo y envíalo desde allí.</p>' +
          '</div><div class="hp"><a class="btn pri ancho" id="mOk" target="_blank" rel="noopener" href="https://wa.me/34' +
          K.tel9(A.cli.tel) +
          '?text=' +
          encodeURIComponent(txt) +
          '">Abrir WhatsApp</a>' +
          mas +
          '</div>')
  );
  $('#mOk', d).onclick = () => {
    if (m && hacer({ tipo: 'enviado', id: A.id, k }).ok) toast(Oficio.DEMO ? 'Mensaje enviado (en la demo, solo se apunta).' : 'Apuntado como enviado.');
    d.close();
  };
  const no = $('#mNo', d),
    baja = $('#mBaja', d);
  if (no)
    no.onclick = () => {
      if (hacer({ tipo: 'descartar', id: A.id, k }).ok) toast('Dejado sin mandar.');
      d.close();
    };
  if (baja)
    baja.onclick = () => {
      if (hacer({ tipo: 'escribir', tel: A.cli.tel, si: false }).ok) toast('Apuntado: no le mandaremos más mensajes de seguimiento.');
      d.close();
    };
}
/* la zona del cliente: el mensaje con su enlace y su código. En la demo, el código de la muestra, y su zona se abre aquí.
   Con servidor, el código lo da el servidor (el que ya tiene, o uno nuevo si se cambia) y el mensaje sale por WhatsApp */
const ZERR = {
  nadie: 'Este teléfono todavía no tiene avisos en el servidor. Espera unos segundos y prueba otra vez.',
  permiso: 'Solo la centralita puede dar el código de la zona del cliente.',
  tel: 'Este aviso todavía no tiene un teléfono que valga.',
  red: 'No hay conexión con el servidor. Comprueba internet y prueba otra vez.',
  clave: 'Tu sesión ha dejado de valer. Entra otra vez.',
  sesion: 'Tu sesión ha dejado de valer. Entra otra vez.',
  bloqueo: 'Hay demasiados intentos fallidos con tu código. Espera unos minutos.',
  lleno: 'El servidor está ocupado. Prueba otra vez en unos segundos.',
  servidor: 'El servidor ha fallado. Prueba otra vez en un momento.'
};
function hZona(A) {
  const t9 = K.tel9(A.cli.tel);
  if (!t9) {
    toast('Este aviso todavía no tiene teléfono.');
    return;
  }
  if (!Oficio.DEMO && !SRV) {
    hoja(
      hc('Zona del cliente') +
        ('<div class="hb"><p>La zona del cliente todavía no está abierta en esta copia: llegará con el acceso de cada cliente por el servidor.</p>' +
          '</div><div class="hp"><button class="btn ancho" data-x>Cerrar</button></div>')
    );
    return;
  }
  const n = (A.cli.nombre || '').split(' ')[0],
    l = A.idioma,
    zonaUrl = cod => new URL('cliente.html' + idiomaUrl(A) + '#/entra/' + t9 + '/' + cod, location.href).href;
  const msg = cod =>
    (n ? _c('Hola, {nombre}.', { nombre: n }, l) : _c('Hola.', null, l)) +
    ' ' +
    _c('En tu zona de {negocio} tienes tus avisos, tus presupuestos y tus garantías: {enlace} .', { negocio: N.nombre, enlace: zonaUrl(cod) }, l) +
    ' ' +
    _c('Si te pide el código, es este: {codigo}.', { codigo: cod }, l) +
    ' ' +
    N.nombre +
    '.';
  if (Oficio.DEMO) {
    const cod = K.CLIENTE_DEMO;
    hoja(
      hc('Zona del cliente') +
        '<div class="hb"><p>Ahí tiene sus avisos, sus presupuestos, sus partes y sus garantías. Entra con su teléfono y el código que le llega en este mensaje.</p>' +
        waHtml(msg(cod), K.nomCli(A.cli)) +
        ('<p class="dn">En la app real, este botón abre WhatsApp con el mensaje ya escrito. En la demo no se escribe a nadie: su zona se abre aquí.</p>' +
          '</div><div class="hp"><a class="btn pri ancho" id="zAbre" target="_blank" rel="noopener" href="') +
        esc(zonaUrl(cod)) +
        '">Abrir su zona</a></div>'
    );
    return;
  }
  const d = hoja(hc('Zona del cliente') + '<div class="hb" id="zB"></div><div class="hp" id="zP"></div>');
  let seguro = false;
  const pon = (r, cambiado) => {
    if (!d.open) return;
    seguro = false;
    if (!r || !r.ok) {
      $('#zB', d).innerHTML = '<p class="ojo" role="alert">' + (ZERR[r && r.err] || ZERR.servidor) + '</p>';
      $('#zP', d).innerHTML = '<button class="btn pri ancho" id="zOtra">Probar otra vez</button><button class="btn ancho" data-x>Cerrar</button>';
      return;
    }
    const t = msg(r.codigo);
    $('#zB', d).innerHTML =
      '<p>Ahí tiene sus avisos, sus presupuestos, sus partes y sus garantías. Entra con su teléfono y este código: <b class="num" id="zCod">' +
      esc(r.codigo) +
      '</b>.</p>' +
      waHtml(t, K.nomCli(A.cli)) +
      '<p class="dn" id="zNota">' +
      (cambiado
        ? 'Código cambiado: el de antes ya no vale. Mándale este mensaje.'
        : r.nuevo
          ? 'Se abre WhatsApp con el mensaje ya escrito. Revísalo y envíalo desde allí.'
          : 'Es el código que ya tenía. Si lo ha perdido o lo ha visto otra persona, cámbialo: el de ahora dejará de valer.') +
      '</p>';
    $('#zP', d).innerHTML =
      '<a class="btn pri ancho" id="zWa" target="_blank" rel="noopener" href="https://wa.me/34' +
      t9 +
      '?text=' +
      encodeURIComponent(t) +
      '">Abrir WhatsApp</a><button class="txt" id="zCambia" style="justify-self:center">Cambiar el código</button>';
  };
  const pide = cambia => {
    $('#zB', d).innerHTML = '<p role="status">' + (cambia ? 'Cambiando el código…' : 'Preparando su código…') + '</p>';
    $('#zP', d).innerHTML = '';
    Oficio.acceso(t9, cambia).then(r => pon(r, cambia && !!(r && r.ok)));
  };
  d.addEventListener('click', e => {
    const b = e.target.closest('#zCambia,#zOtra');
    if (!b) return;
    if (b.id === 'zOtra') {
      pide(false);
      return;
    }
    if (!seguro) {
      seguro = true;
      b.textContent = 'Sí, cambiar el código';
      $('#zNota', d).textContent = 'El código de ahora dejará de valer y tendrás que mandarle el nuevo. ¿Lo cambio?';
      return;
    }
    pide(true);
  });
  pide(false);
}
function hLlamar(A) {
  hoja(
    hc('Llamar al cliente') +
      '<div class="hb"><p class="gordo num">' +
      K.telBonito(A.cli.tel) +
      '</p>' +
      (Oficio.DEMO
        ? '<p class="dn">En la app real, este botón llama con un toque. En la demo no llamamos a nadie: el teléfono es inventado.</p>' +
          '</div><div class="hp"><button class="btn ancho" data-x>Cerrar</button></div>'
        : '</div><div class="hp"><a class="btn pri ancho" href="tel:+34' + K.tel9(A.cli.tel) + '">Llamar</a></div>')
  );
}
