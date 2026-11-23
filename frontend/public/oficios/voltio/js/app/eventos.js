/* OOOX Oficios · la app (app.html), eventos. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b) {
    e.preventDefault();
    S = Oficio.estado();
    const A = b.dataset.id ? el(b.dataset.id) : null;
    if (b.dataset.id && !A) return toast(ERR.estado);
    ACC[b.dataset.a](A, b);
    return;
  }
  const np = e.target.closest('#v [data-np]');
  if (np) {
    B.err = '';
    npVe(np.dataset.np);
    return;
  }
  /* en el ordenador, con un aviso abierto al lado: las pestañas de la bandeja cambian la lista sin cerrar el aviso */
  const pb = e.target.closest('[data-grupo="b"][data-pesta]');
  if (pb && ruta().v === 'aviso') {
    e.preventDefault();
    BT = pb.dataset.pesta;
    pinta();
    return;
  }
  const o = e.target.closest('#fNuevo [data-b-av],#fNuevo [data-b-or],#fNuevo [data-b-cu],#fNuevo [data-b-dia],#fNuevo [data-b-fr]');
  if (o) {
    const x = o.dataset;
    if (x.bAv) B.av = x.bAv;
    if (x.bOr) B.or = x.bOr;
    if (x.bCu) B.cuando = x.bCu;
    if (x.bDia) {
      B.dia = x.bDia;
      B.fr = '';
    }
    if (x.bFr) B.fr = x.bFr;
    B.err = '';
    pinta();
  }
});
document.addEventListener('input', e => {
  const i = e.target;
  if (i.dataset && i.dataset.b) {
    B[i.dataset.b] = i.value;
    if (i.dataset.b === 'tel') {
      const t9 = K.tel9(i.value),
        c =
          t9 &&
          S.avisos
            .slice()
            .reverse()
            .find(a => K.tel9(a.cli.tel) === t9);
      if (c && !B.nomap && !B.dir) {
        B.nomap = K.nomCli(c.cli);
        B.dir = c.cli.dir;
        B.cp = c.cli.cp;
        pinta();
        const n = $('#n_tel');
        n.focus();
        n.setSelectionRange(n.value.length, n.value.length);
      }
    }
  }
});
document.addEventListener('change', e => {
  const i = e.target;
  if (i.dataset && i.dataset.obs) Oficio.hacer({ tipo: 'anotar', id: i.dataset.obs, obs: i.value }, Q);
  if (i.dataset && i.dataset.foto && i.files[0])
    Oficio.foto(i.files[0])
      .then(f => {
        if (hacer({ tipo: 'anotar', id: i.dataset.foto, foto: f }).ok) toast('Foto guardada en el parte.');
      })
      .catch(() => toast('No he podido leer esa foto.'));
});
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('#fMejora [data-m-atras]')) {
    M.paso = 0;
    M.err = '';
    pinta();
    const t = $('#mTit');
    if (t) t.focus({ preventScroll: true });
    return;
  }
  const t = e.target.closest('#fMejora [data-m-tipo]');
  if (!t) return;
  M.tipo = t.dataset.mTipo;
  if (M.err === 'tipo') M.err = '';
  $$('#fMejora [data-m-tipo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mTipo === M.tipo)));
  const x = $('#e_mtipo');
  if (x) {
    x.hidden = true;
    x.closest('.campo').classList.remove('mal');
  }
});
document.addEventListener('input', e => {
  const i = e.target;
  if (i.dataset && i.dataset.m && Object.prototype.hasOwnProperty.call(M, i.dataset.m)) M[i.dataset.m] = i.value;
});
document.addEventListener('submit', e => {
  const f = e.target.id;
  if (f === 'fMejora') {
    e.preventDefault();
    if (e.target.dataset.paso !== '1') {
      if (!M.tipo) {
        M.err = 'tipo';
        pinta();
        const i = $('#fMejora [data-m-tipo]');
        if (i) i.focus();
        return;
      }
      M.err = '';
      M.paso = 1;
      pinta();
      const t = $('#mTit');
      if (t) t.focus({ preventScroll: true });
      return;
    }
    mEnvia();
  } else if (f === 'fCodigo') {
    e.preventDefault();
    mCodigo();
  } else if (f === 'fEntra') {
    e.preventDefault();
    entra();
  }
});
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#eVer')) return;
  EN.ver = !EN.ver;
  pEntra();
  $('#e_cod').focus();
});
document.addEventListener('input', e => {
  if (e.target.id === 'e_cod') EN.cod = e.target.value;
});
document.addEventListener('change', e => {
  if (e.target.id === 'e_quien') EN.quien = e.target.value;
});
addEventListener('online', () => {
  if (SOP && Q.rol !== 'tecnico' && SOP.cola().length) mTrae(true);
});
/* De vez en cuando la centralita mira si OOOX ha contestado algo: como mucho cada media hora, y enseguida si hay algo sin enviar. */
if (SOP) {
  const mira = () => {
    if (Q.rol !== 'tecnico' && SOP.codigo() && (SOP.toca(18e5) || (SOP.cola().length && navigator.onLine !== false))) mTrae(true);
  };
  setTimeout(mira, 1500);
  setInterval(mira, 3e5);
}
/* Los grupos de una sola opción (role=radiogroup) se manejan como los de un formulario de siempre: con Tab se entra
   en el grupo por la opción elegida (o la primera) y con las flechas se pasa de una a otra, eligiéndola. Cada grupo lo
   pinta quien lo use; esto solo pone el orden de tabulación y las flechas, también en las hojas que se abren encima. */
const RADIOS = '[role=radiogroup]';
function ronda(g) {
  const R = [...g.querySelectorAll('[role=radio]')],
    c = R.find(r => r.getAttribute('aria-checked') === 'true' && !r.disabled) || R.find(r => !r.disabled);
  R.forEach(r => {
    const v = r === c ? 0 : -1;
    if (r.tabIndex !== v) r.tabIndex = v;
  });
}
new MutationObserver(ms => {
  const G = new Set();
  ms.forEach(m => {
    const n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    if (!n) return;
    const g = n.closest && n.closest(RADIOS);
    if (g) G.add(g);
    if (m.type === 'childList')
      m.addedNodes.forEach(x => {
        if (x.nodeType !== 1) return;
        if (x.matches(RADIOS)) G.add(x);
        x.querySelectorAll(RADIOS).forEach(y => G.add(y));
      });
  });
  G.forEach(ronda);
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'disabled'] });
document.querySelectorAll(RADIOS).forEach(ronda);
document.addEventListener('keydown', e => {
  const r = e.target.closest && e.target.closest('[role=radio]'),
    g = r && r.closest(RADIOS);
  if (!g) return;
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!d && e.key !== ' ') return;
  e.preventDefault();
  const R = [...g.querySelectorAll('[role=radio]')].filter(x => !x.disabled);
  let i = R.indexOf(r);
  if (d) i = (i + d + R.length) % R.length;
  const x = R[i];
  if (!x) return;
  const a = [...x.attributes].find(z => z.name.startsWith('data-')),
    sel = a ? '[' + a.name + '="' + CSS.escape(a.value) + '"]' : null,
    raiz = x.closest('dialog') || document;
  if (x.getAttribute('aria-checked') !== 'true') x.click();
  requestAnimationFrame(() => {
    const y = (sel && raiz.querySelector(sel)) || x;
    if (y.isConnected) y.focus();
  });
});
/* atajos de la oficina en pantalla grande (22-11-2026): «n» aviso nuevo, «/» buscar, Esc cierra el aviso abierto. Escribiendo en un campo o con una hoja abierta no hacen nada */
document.addEventListener('keydown', e => {
  if (Q.rol !== 'centralita' || !ANCHO.matches || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target,
    tg = t && t.tagName;
  if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (t && t.isContentEditable) || document.querySelector('dialog[open]')) return;
  const r = ruta();
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    if (r.v !== 'nuevo') location.hash = '#/nuevo';
  } else if (e.key === '/') {
    e.preventDefault();
    const f = () => {
      const i = $('#busca');
      if (i) {
        i.focus();
        i.select();
      }
    };
    if ($('#busca')) f();
    else {
      addEventListener('hashchange', f, { once: true });
      location.hash = '#/bandeja';
    }
  } else if (e.key === 'Escape' && r.v === 'aviso') location.hash = '#/bandeja';
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'fNuevo') return;
  e.preventDefault();
  const p = e.target.dataset.paso,
    foco = () => {
      const i = $('#fNuevo [aria-invalid=true]') || $('#n_' + (B.err === 'zona' ? 'cp' : B.err)) || $('#fNuevo [role=radio]:not([disabled])');
      if (i) i.focus();
    };
  if (p !== 'fin') {
    const m = npMal(p);
    if (m) {
      B.err = m;
      pinta();
      foco();
      return;
    }
    B.err = '';
    const i = NP.indexOf(p);
    npVe((B.visto && NP.every(x => !npMal(x))) || i === NP.length - 1 ? 'fin' : NP[i + 1]);
    return;
  }
  for (const x of NP) {
    const m = npMal(x);
    if (m) {
      B.err = m;
      npVe(x);
      return;
    }
  }
  if (B.va) return;
  B.va = true;
  const bt = $('#fNuevo [type=submit]');
  if (bt) bt.disabled = true;
  const pn = K.parteNombre(B.nomap);
  Oficio.crear(
    {
      tipo: 'pedir',
      av: B.av,
      origen: B.or,
      nota: B.nota,
      cli: { nombre: pn.nombre, apellidos: pn.apellidos, tel: B.tel, dir: B.dir, cp: B.cp },
      cita: B.cuando === 'cita' ? { dia: B.dia, fr: B.fr } : null
    },
    Q
  ).then(r => {
    B.va = false;
    if (r.ok) {
      Object.assign(B, { av: '', or: 'llamada', cuando: '', fr: '', nomap: '', tel: '', dir: '', cp: '', nota: '', err: '', visto: false });
      toast('Aviso ' + r.id + ' creado. Ahora, asígnalo.');
      S = Oficio.estado();
      if (location.hash === '#/aviso/' + r.id) pinta();
      else location.hash = '#/aviso/' + r.id;
    } else {
      B.err = r.err === 'nombre' || r.err === 'apellidos' ? 'nomap' : r.err;
      const x = NP_DE[B.err];
      if (x && x !== p) {
        npVe(x);
        return;
      }
      pinta();
      if (bt) bt.disabled = false;
      const i = $('#n_' + (r.err === 'zona' ? 'cp' : B.err));
      if (i) i.focus();
      else toast(errDe(r) || 'Revisa los datos.');
    }
  });
});
