/* OOOX Oficios · la app (app.html), acciones. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== los toques ===== */
const ACC = {
  esGar: A => {
    if (hacer({ tipo: 'garantia', id: A.id }).ok) toast('Apuntado: va en garantía.');
  },
  noGar: A => {
    if (hacer({ tipo: 'garantia', id: A.id, quitar: true }).ok) toast('Ya no va en garantía.');
  },
  corrPago: A => hCorrPago(A),
  rebajar: A => hRebajar(A),
  menu: () => hMenu(),
  imprimir: () => window.print(),
  llamar: A => hLlamar(A),
  verFoto: A => {
    if (A.foto) hFoto(A);
  },
  zona: A => hZona(A),
  msg: (A, b) => hMsg(A, b.dataset.k),
  mensajes: () => hMensajes(),
  irSec: (A, b) => {
    const s = document.getElementById(b.dataset.sec);
    if (!s) {
      if (b.dataset.ir && location.hash !== b.dataset.ir) {
        location.hash = b.dataset.ir;
        setTimeout(() => ACC.irSec(A, b), 80);
      }
      return;
    }
    s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    s.focus({ preventScroll: true });
  },
  seguir: () => hMensajes(true),
  escribirSi: A => {
    if (hacer({ tipo: 'escribir', tel: A.cli.tel, si: true }).ok) toast('Vuelve a recibir los mensajes de seguimiento.');
  },
  idioma: (A, b) => {
    const l = b.dataset.l;
    if ((A.idioma || 'es') === l) return;
    if (hacer({ tipo: 'idioma', id: A.id, idioma: l }).ok)
      toast('Idioma del cliente: ' + { es: 'castellano', ca: 'catalán', en: 'inglés' }[l] + '. Sus mensajes y sus papeles salen en él.');
  },
  completar: A => hCompletar(A),
  cita: A => hCita(A),
  cancelar: A => hCancelar(A),
  cobrar: A => hCobrar(A),
  facturar: A => hFacturar(A),
  desfacturar: A => {
    if (hacer({ tipo: 'facturar', id: A.id, quitar: true }).ok) toast('Ya no consta como facturado.');
  },
  copiaFac: A => copia(K.datosFactura(cfg, A), 'Copiado. Pégalo en tu programa de facturas.'),
  mes: (A, b) => bajaMes(b.dataset.m),
  ampliar: A => hPrecio(A, true),
  falta: A => hFalta(A),
  conAlta: A => hConAlta(A),
  conVer: (A, b) => {
    const C = contrato(b.dataset.c);
    if (C) hConVer(C);
  },
  conCob: (A, b) => {
    const C = contrato(b.dataset.c);
    if (C) hConCob(C);
  },
  conRen: (A, b) => {
    const C = contrato(b.dataset.c);
    if (C) hConRen(C);
  },
  conBaja: (A, b) => {
    const C = contrato(b.dataset.c);
    if (C) hConBaja(C);
  },
  conFac: (A, b) => {
    const C = contrato(b.dataset.c);
    if (C) copia(K.datosFacturaContrato(S, cfg, C, Date.now()), 'Copiado. Pégalo en tu programa de facturas.');
  },
  conRev: (A, b) => {
    const C = contrato(b.dataset.c);
    if (!C) return;
    Oficio.crear({ tipo: 'pedir', av: K.REV, origen: 'llamada', cli: C.cli }, Q).then(r => {
      if (!r.ok) return toast(errDe(r) || 'No se ha podido crear.');
      toast('Aviso de la revisión creado: dale cita y asígnalo.');
      location.hash = '#/aviso/' + r.id;
    });
  },
  quitaFalta: (A, b) => {
    const k = b.dataset.k,
      r = hacer(k ? { tipo: 'falta', id: A.id, k, quitar: true } : { tipo: 'falta', id: A.id, t: b.dataset.t, quitar: true });
    if (r.ok) toast('Quitado de lo que falta.');
  },
  faltaListo: A => {
    if (hacer({ tipo: 'falta', id: A.id, vaciar: true }).ok) toast('Hecho: ya no falta nada en este aviso.');
  },
  fSi: (A, b) => {
    const tec = b.dataset.tec,
      r = hacer({ tipo: 'furgo', tec, llevar: true });
    if (r.ok) {
      toast('Hecho. Ahora cuenta lo que hay.');
      hFz(tec, true);
    }
  },
  fNo: (A, b) => hFzNo(b.dataset.tec),
  fCargar: (A, b) => hFz(b.dataset.tec, false, b.dataset.dia || ''),
  fContar: (A, b) => hFz(b.dataset.tec, true),
  copiaCarga: (A, b) => {
    const t = K.textoCarga(cfg, K.cargaDe(S, cfg, b.dataset.tec, b.dataset.dia, Date.now()));
    if (t) copia(t, 'Copiado. Pégalo donde quieras.');
  },
  copiaMat: (A, b) => {
    const d = b.dataset.dia || '',
      g = K.material(S, cfg, d).find(x => x.tec === (b.dataset.tec || ''));
    if (g) copia(K.textoMaterial(cfg, g, d), 'Copiado. Pégalo donde quieras.');
  },
  /* «Asignar a X» y, durante unos segundos, «Deshacer» (auditoría UX-16): vuelve a quien lo llevaba o lo deja sin técnico.
    Después de «No había nadie» no se ofrece: volver a ir es otra visita */
  asignar: (A, b) => {
    const otraVez = A.e === 'ausente',
      id = A.id,
      tec = b.dataset.tec,
      prev = A.e === 'asignado' ? A.tec : '';
    if (A.tec === tec && !otraVez) return;
    const antes = A.tec && A.tec !== tec;
    if (hacer({ tipo: 'asignar', id, tec }).ok)
      toast(
        (otraVez && !antes ? 'Vuelve a ir ' : antes ? 'Cambiado: ahora va ' : 'Asignado a ') +
          cfg.tec[tec].n +
          '.' +
          (A.cita ? ' Queda escrito el mensaje de la cita.' : ''),
        otraVez
          ? null
          : {
              t: 'Deshacer',
              fn: () => {
                const X = el(id),
                  vuelve = prev && cfg.tec[prev];
                if (!X || X.e !== 'asignado' || X.tec !== tec) return toast('Ya no se puede deshacer: el aviso ha cambiado.');
                if (hacer(vuelve ? { tipo: 'asignar', id, tec: prev } : { tipo: 'soltar', id }).ok)
                  toast(vuelve ? 'Deshecho: lo vuelve a llevar ' + cfg.tec[prev].n + '.' : 'Deshecho: el aviso vuelve a estar sin técnico.');
              }
            }
      );
  },
  voy: A => {
    const r = hacer({ tipo: 'voy', id: A.id });
    if (r.ok) {
      toast('De camino. Llegas sobre las ' + K.hora(r.eta) + '.');
      if (ruta().v !== 'aviso') location.hash = '#/aviso/' + A.id;
    }
  },
  ausente: A => {
    if (hacer({ tipo: 'ausente', id: A.id }).ok) {
      toast('Apuntado: no había nadie. Vuelve a la centralita.');
      location.hash = '#/hoy';
    }
  },
  empezar: A => hPrecio(A, false),
  terminar: A => hCierre(A),
  pausa: A => {
    const r = hacer({ tipo: 'pausa', id: A.id });
    if (r.ok) toast(r.pausa ? 'En pausa: el tiempo no cuenta.' : 'Sigue el trabajo.');
  },
  geoNo: A => {
    if (hacer({ tipo: 'sinPosicion', id: A.id }).ok) {
      geoPara();
      toast('Ya no se comparte tu posición en este aviso.');
    }
  },
  ausencia: (A, b) => hAusencia(b.dataset.tec || '', b.dataset.dia || ''),
  quitaAus: (A, b) => {
    const r = Oficio.hacer({ tipo: 'quitarAusencia', aus: b.dataset.aus }, Q);
    toast(r.ok ? 'Ausencia quitada. Ya se le puede asignar.' : ERR[r.err] || 'No se ha podido quitar.');
  },
  confirma: A => {
    if (A.cita && hacer({ tipo: 'mover', id: A.id, cita: { dia: A.cita.dia, fr: A.cita.fr }, confirmado: true }).ok) toast('Cita confirmada con el cliente.');
  },
  mCambia: () => {
    M.cambia = true;
    M.codErr = '';
    pinta();
    const i = $('#m_cod');
    if (i) i.focus();
  },
  mCancela: () => {
    M.cambia = false;
    M.codErr = '';
    pinta();
  },
  mReintenta: () => {
    mTrae(true).then(r => toast(r && r.ok ? (SOP.cola().length ? 'Todavía no ha salido todo. Se volverá a probar.' : 'Enviado.') : MERR.red));
  },
  mOfertas: (A, b) => {
    const q = b.dataset.q === '1';
    b.disabled = true;
    SOP.ofertas(q).then(r => {
      toast(r.ok ? (r.sin_ofertas ? 'Hecho: no verás más ofertas de OOOX.' : 'Hecho: volverás a ver las ofertas.') : MERR.red);
      b.disabled = false;
      mPonListas();
      const n = $('#mLista [data-a="mOfertas"]');
      if (n) n.focus({ preventScroll: true });
    });
  }
};
