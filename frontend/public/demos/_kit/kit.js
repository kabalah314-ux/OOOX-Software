/*!
 * OOOX Webs · kit común de las webs de negocio (v1, 29-oct-2026)
 * Sin dependencias. Lo usan todas las demos y servirá de base para las webs de clientes.
 *
 *  Kit.lang / Kit.t(key) / Kit.L({es,ca,en}) / Kit.onLang(fn)   idiomas (ES · CA · EN)
 *  Kit.hours(spec)                                               horario: «abierto ahora», tabla con hoy marcado
 *  Kit.wa(text, opts)                                            mensaje de WhatsApp ya escrito (en demo: vista previa)
 *  Kit.dialog(node, opts) / Kit.toast(msg)                       ventanas y avisos
 *  Kit.days(n, closed) / Kit.slots(ranges, step)                 días y franjas para reservas y citas
 *  Kit.rand(seed)                                                pseudoaleatorio fijo (huecos «ocupados» creíbles)
 *  Kit.moon(date)                                                fase lunar (Estudio Lúa)
 *  Kit.compare(el)                                               antes / después arrastrable
 *  Kit.money(n)                                                  12,50 €
 *
 * Modo demo: <html data-demo> → banner «Web de muestra de OOOX», y las llamadas y WhatsApp
 * enseñan una vista previa en vez de llamar a un número inventado.
 * Web real: sin data-demo y con <html data-wa="34600000000"> (WhatsApp del negocio).
 * Captura limpia para el portfolio: ?shot (o ?shot=<id> para empezar en una sección).
 */
(function () {
  'use strict';

  var OOOX = {
    // Dónde lleva «Quiero una web así»: la sección de webs para negocios de ooox.es.
    // Cuando OOOX Webs tenga su WhatsApp, poner aquí wa.me/34XXXXXXXXX.
    contact: 'https://ooox.es/#/webs',
    brand: 'OOOX',
  };

  var TZ = 'Europe/Madrid';
  var root = document.documentElement;
  var DEMO = root.hasAttribute('data-demo');
  // Captura limpia para el portfolio de OOOX: ?shot → sin banner, sin notas, sin animaciones y en castellano;
  // ?shot=<id> → además la página empieza en esa sección (para las vistas previas de cada demo).
  var SHOT = location.search.match(/[?&]shot(?:=([\w-]*))?(?:&|$)/);
  var SHOT_AT = SHOT && SHOT[1] && SHOT[1] !== '1' ? SHOT[1] : '';
  if (SHOT) root.classList.add('kit-shot');

  /* ------------------------------------------------------------------ utilidades */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.forEach(function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var store = {
    get: function (k) { try { return localStorage.getItem('ooox:' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('ooox:' + k, v); } catch (e) { /* sin almacenamiento: no pasa nada */ } },
  };

  /* ------------------------------------------------------------------ idiomas */
  var LANGS = ['es', 'ca', 'en'];
  var dict = { es: {}, ca: {}, en: {} };
  var langFns = [];
  var lang = 'es';

  // Textos fijos del propio kit
  var KIT = {
    es: {
      open: 'Abierto ahora', closed: 'Cerrado ahora', closesAt: 'cierra a las {t}', opensAt: 'abre {d} a las {t}',
      today: 'hoy', tomorrow: 'mañana', closedDay: 'Cerrado', todayL: 'Hoy', tomorrowL: 'Mañana',
      demoBar: 'Web de muestra hecha por OOOX', demoBarSub: 'Así puede ser la de tu negocio', demoCta: 'Quiero una así', tips: 'Notas para el negocio',
      waTitle: 'Así le llega el mensaje al negocio', waNote: 'En la web real, este botón abre WhatsApp con el mensaje ya escrito. El cliente solo pulsa «enviar».',
      waOpen: 'Quiero esto en mi negocio', close: 'Cerrar', callTitle: 'Llamada directa',
      callNote: 'En la web real, este botón llama al negocio con un toque. En la demo no llamamos a nadie.',
      online: 'en línea', now: 'ahora', required: 'Completa los campos marcados', sent: 'Listo',
      before: 'Antes', after: 'Después',
    },
    ca: {
      open: 'Obert ara', closed: 'Tancat ara', closesAt: 'tanca a les {t}', opensAt: 'obre {d} a les {t}',
      today: 'avui', tomorrow: 'demà', closedDay: 'Tancat', todayL: 'Avui', tomorrowL: 'Demà',
      demoBar: 'Web de mostra feta per OOOX', demoBarSub: 'Així pot ser la del teu negoci', demoCta: 'En vull una així', tips: 'Notes per al negoci',
      waTitle: 'Així li arriba el missatge al negoci', waNote: 'A la web real, aquest botó obre WhatsApp amb el missatge ja escrit. El client només prem «enviar».',
      waOpen: 'Vull això al meu negoci', close: 'Tancar', callTitle: 'Trucada directa',
      callNote: 'A la web real, aquest botó truca al negoci amb un toc. A la demo no truquem a ningú.',
      online: 'en línia', now: 'ara', required: 'Omple els camps marcats', sent: 'Fet',
      before: 'Abans', after: 'Després',
    },
    en: {
      open: 'Open now', closed: 'Closed now', closesAt: 'closes at {t}', opensAt: 'opens {d} at {t}',
      today: 'today', tomorrow: 'tomorrow', closedDay: 'Closed', todayL: 'Today', tomorrowL: 'Tomorrow',
      demoBar: 'Sample website made by OOOX', demoBarSub: 'This is what yours could look like', demoCta: 'I want one', tips: 'Notes for the owner',
      waTitle: 'This is the message the business gets', waNote: 'On the real site, this button opens WhatsApp with the message already written. The customer just taps “send”.',
      waOpen: 'I want this for my business', close: 'Close', callTitle: 'One-tap call',
      callNote: 'On the real site, this button calls the business in one tap. In the demo we don’t call anyone.',
      online: 'online', now: 'now', required: 'Please fill in the highlighted fields', sent: 'Done',
      before: 'Before', after: 'After',
    },
  };

  function k(key) { return (KIT[lang] && KIT[lang][key]) || KIT.es[key] || key; }
  function t(key, vars) {
    var s = (dict[lang] && dict[lang][key]) || dict.es[key] || key;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  }
  function L(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
    return obj[lang] || obj.es || '';
  }

  function collectOriginals() {
    // El español va escrito en el HTML: se guarda como diccionario «es».
    $$('[data-t]').forEach(function (el) { dict.es[el.getAttribute('data-t')] = el.textContent; });
    $$('[data-th]').forEach(function (el) { dict.es[el.getAttribute('data-th')] = el.innerHTML; });
    $$('[data-ta]').forEach(function (el) {
      el.getAttribute('data-ta').split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p.length < 2) return;
        dict.es[p[1].trim()] = el.getAttribute(p[0].trim()) || '';
      });
    });
  }
  function applyLang() {
    $$('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    $$('[data-th]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-th')); });
    $$('[data-ta]').forEach(function (el) {
      el.getAttribute('data-ta').split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p.length < 2) return;
        el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    root.setAttribute('lang', lang);
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    if (dict[lang] && dict[lang]['meta.title']) document.title = t('meta.title');
    langFns.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  }
  function setLang(l) {
    if (LANGS.indexOf(l) === -1) l = 'es';
    lang = l; store.set('lang', l); applyLang();
  }
  function initLang() {
    var node = document.getElementById('i18n');
    if (node) {
      try {
        var data = JSON.parse(node.textContent);
        LANGS.forEach(function (l) { if (data[l]) Object.keys(data[l]).forEach(function (key) { dict[l][key] = data[l][key]; }); });
      } catch (e) { console.error('i18n', e); }
    }
    collectOriginals();
    if (node) {
      try { var es = JSON.parse(node.textContent).es; if (es) Object.keys(es).forEach(function (key) { dict.es[key] = es[key]; }); } catch (e) { /* ya avisado */ }
    }
    var q = (location.search.match(/[?&]lang=(es|ca|en)/) || [])[1];
    var saved = store.get('lang');
    var nav = (navigator.language || 'es').slice(0, 2);
    // Por defecto castellano; catalán si el navegador está en catalán. El inglés, con el botón (o ?lang=en).
    lang = q || (SHOT ? 'es' : '') || saved || (nav === 'ca' ? 'ca' : 'es');
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-lang]');
      if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang')); }
    });
  }

  /* ------------------------------------------------------------------ fecha y hora de Madrid */
  function madrid(d) {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d || new Date());
    var get = function (type) { var p = parts.find(function (x) { return x.type === type; }); return p ? p.value : ''; };
    var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
    return { day: wd, min: Number(get('hour')) * 60 + Number(get('minute')), date: get('year') + '-' + get('month') + '-' + get('day') };
  }
  function toMin(s) { var p = s.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function fmtMin(m) { m = ((m % 1440) + 1440) % 1440; var hh = Math.floor(m / 60), mm = m % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  function dayName(dayIdx, style) {
    // 2026-10-25 fue domingo: sirve de ancla para sacar el nombre de cada día en el idioma actual.
    var base = new Date(Date.UTC(2026, 9, 25 + dayIdx, 12));
    var loc = lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES';
    var s = new Intl.DateTimeFormat(loc, { weekday: style || 'long', timeZone: 'UTC' }).format(base);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ------------------------------------------------------------------ horario */
  // spec: { week: {0:[['12:00','17:00']], 1:[], 2:[['12:00','16:00'],['19:00','23:30']], ...} }
  // Un tramo que pasa de medianoche se escribe '19:00','00:30'.
  function Hours(spec) {
    this.week = spec.week || {};
  }
  Hours.prototype.ranges = function (day) {
    return (this.week[day] || []).map(function (r) {
      var a = toMin(r[0]), b = toMin(r[1]);
      if (b <= a) b += 1440;
      return [a, b];
    });
  };
  Hours.prototype.status = function (now) {
    var m = madrid(now);
    // ¿Sigue abierto el tramo de ayer que pasaba de medianoche?
    var prev = (m.day + 6) % 7;
    var openNow = null;
    this.ranges(prev).forEach(function (r) { if (r[1] > 1440 && m.min < r[1] - 1440) openNow = { closes: r[1] - 1440 }; });
    this.ranges(m.day).forEach(function (r) { if (m.min >= r[0] && m.min < r[1]) openNow = { closes: r[1] }; });
    if (openNow) return { open: true, closes: fmtMin(openNow.closes) };
    for (var i = 0; i < 8; i++) {
      var d = (m.day + i) % 7;
      var rs = this.ranges(d);
      for (var j = 0; j < rs.length; j++) {
        if (i === 0 && rs[j][0] <= m.min) continue;
        return { open: false, day: d, offset: i, opens: fmtMin(rs[j][0]) };
      }
    }
    return { open: false };
  };
  Hours.prototype.label = function (now) {
    var s = this.status(now);
    if (s.open) return { open: true, main: k('open'), sub: k('closesAt').replace('{t}', s.closes) };
    if (s.opens == null) return { open: false, main: k('closed'), sub: '' };
    var d = s.offset === 0 ? k('today') : s.offset === 1 ? k('tomorrow') : (lang === 'en' ? 'on ' : lang === 'ca' ? 'el ' : 'el ') + dayName(s.day).toLowerCase();
    return { open: false, main: k('closed'), sub: k('opensAt').replace('{d}', d).replace('{t}', s.opens) };
  };
  Hours.prototype.render = function () {
    var self = this;
    var lab = this.label();
    $$('[data-hours="badge"]').forEach(function (el) {
      el.classList.toggle('is-open', lab.open);
      el.classList.toggle('is-closed', !lab.open);
      el.innerHTML = '<span class="kit-dot" aria-hidden="true"></span><b>' + esc(lab.main) + '</b>' + (lab.sub ? '<span> · ' + esc(lab.sub) + '</span>' : '');
    });
    var today = madrid().day;
    $$('[data-hours="table"]').forEach(function (el) {
      el.innerHTML = '';
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var rs = (self.week[d] || []);
        var row = h('div', { class: 'kit-hrow' + (d === today ? ' is-today' : ''), role: 'row' },
          h('span', { class: 'kit-hday', role: 'cell' }, dayName(d), d === today ? h('em', { text: k('todayL') }) : null),
          h('span', { class: 'kit-hval', role: 'cell' }, rs.length ? rs.map(function (r) { return r[0] + '–' + r[1]; }).join(' · ') : k('closedDay')));
        el.appendChild(row);
      });
    });
  };
  function hours(spec) {
    var x = new Hours(spec);
    x.render();
    langFns.push(function () { x.render(); });
    setInterval(function () { if (!document.hidden) x.render(); }, 60000);
    return x;
  }

  /* ------------------------------------------------------------------ días y franjas */
  function days(n, closedDays) {
    var out = [];
    var start = new Date();
    var loc = lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES';
    for (var i = 0; i < n; i++) {
      var d = new Date(start.getTime() + i * 86400000);
      var m = madrid(d);
      var parts = new Intl.DateTimeFormat(loc, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(d);
      var get = function (type) { var p = parts.find(function (x) { return x.type === type; }); return p ? p.value.replace('.', '') : ''; };
      out.push({
        iso: m.date, day: m.day, closed: (closedDays || []).indexOf(m.day) !== -1,
        top: i === 0 ? k('todayL') : i === 1 ? k('tomorrowL') : get('weekday'),
        num: get('day'), month: get('month'),
        long: new Intl.DateTimeFormat(loc, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(d),
      });
    }
    return out;
  }
  function slots(ranges, step) {
    var out = [];
    (ranges || []).forEach(function (r) {
      var a = toMin(r[0]), b = toMin(r[1]); if (b <= a) b += 1440;
      for (var m = a; m <= b; m += (step || 30)) out.push(fmtMin(m));
    });
    return out;
  }
  function rand(seed) {
    // mulberry32 sobre un hash del texto: mismo día y misma hora → mismo «ocupado».
    var hsh = 2166136261;
    for (var i = 0; i < seed.length; i++) { hsh ^= seed.charCodeAt(i); hsh = Math.imul(hsh, 16777619); }
    var a = hsh >>> 0;
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t2 = Math.imul(a ^ a >>> 15, 1 | a);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  }
  function nowMadridMin() { return madrid().min; }
  function todayISO() { return madrid().date; }

  /* ------------------------------------------------------------------ ventanas, avisos */
  function dialog(content, opts) {
    opts = opts || {};
    var dlg = h('dialog', { class: 'kit-dialog ' + (opts.class || ''), 'aria-label': opts.label || '' });
    var close = h('button', { class: 'kit-x', type: 'button', 'aria-label': k('close'), onclick: function () { dlg.close(); } }, '×');
    dlg.appendChild(close);
    dlg.appendChild(content);
    dlg.addEventListener('close', function () { setTimeout(function () { dlg.remove(); }, 250); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    return dlg;
  }
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = h('div', { class: 'kit-toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ------------------------------------------------------------------ WhatsApp */
  function waFormat(text) {
    // *negrita* y _cursiva_ como en WhatsApp
    return esc(text).replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/_([^_\n]+)_/g, '<em>$1</em>').replace(/\n/g, '<br>');
  }
  function wa(text, opts) {
    opts = opts || {};
    // En una web real (sin data-demo) abre WhatsApp con el negocio: número en opts.to o en <html data-wa="34600000000">.
    var to = opts.to || root.getAttribute('data-wa');
    if (!DEMO && to) {
      window.open('https://wa.me/' + String(to).replace(/\D/g, '') + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      return;
    }
    var biz = opts.business || document.title.split('·')[0].trim();
    var hhmm = fmtMin(nowMadridMin());
    var body = h('div', { class: 'kit-wa' },
      h('p', { class: 'kit-wa-k', text: k('waTitle') }),
      h('div', { class: 'kit-wa-phone' },
        h('div', { class: 'kit-wa-head' },
          h('span', { class: 'kit-wa-av', 'aria-hidden': 'true', text: biz.charAt(0) }),
          h('span', { class: 'kit-wa-name' }, h('b', { text: biz }), h('small', { text: k('online') }))),
        h('div', { class: 'kit-wa-chat' },
          h('div', { class: 'kit-wa-bubble' }, h('div', { html: waFormat(text) }), h('span', { class: 'kit-wa-time', text: hhmm + ' ✓✓' })))),
      h('p', { class: 'kit-wa-note', text: k('waNote') }),
      h('div', { class: 'kit-wa-actions' },
        h('a', { class: 'kit-btn kit-btn-wa', href: OOOX.contact, target: '_blank', rel: 'noopener', text: k('waOpen') }),
        h('button', { class: 'kit-btn kit-btn-ghost', type: 'button', onclick: function (e) { e.target.closest('dialog').close(); }, text: k('close') })));
    dialog(body, { class: 'kit-dialog-wa', label: k('waTitle') });
  }
  function callPreview(number) {
    var body = h('div', { class: 'kit-wa' },
      h('p', { class: 'kit-wa-k', text: k('callTitle') }),
      h('p', { class: 'kit-call-num', text: number }),
      h('p', { class: 'kit-wa-note', text: k('callNote') }),
      h('div', { class: 'kit-wa-actions' },
        h('a', { class: 'kit-btn kit-btn-wa', href: OOOX.contact, target: '_blank', rel: 'noopener', text: k('waOpen') }),
        h('button', { class: 'kit-btn kit-btn-ghost', type: 'button', onclick: function (e) { e.target.closest('dialog').close(); }, text: k('close') })));
    dialog(body, { class: 'kit-dialog-wa', label: k('callTitle') });
  }

  /* ------------------------------------------------------------------ antes / después */
  function compare(el) {
    var range = el.querySelector('input[type=range]');
    var set = function (v) { el.style.setProperty('--pos', v + '%'); };
    if (!range) return;
    set(range.value);
    range.addEventListener('input', function () { set(range.value); });
  }

  /* ------------------------------------------------------------------ fase lunar */
  function moon(date) {
    var d = date || new Date();
    var synodic = 29.530588853;
    var ref = Date.UTC(2000, 0, 6, 18, 14); // luna nueva de referencia
    var age = (((d.getTime() - ref) / 86400000) % synodic + synodic) % synodic;
    var frac = age / synodic;
    var names = {
      es: ['Luna nueva', 'Luna creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Luna menguante'],
      ca: ['Lluna nova', 'Lluna creixent', 'Quart creixent', 'Gibosa creixent', 'Lluna plena', 'Gibosa minvant', 'Quart minvant', 'Lluna minvant'],
      en: ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
    };
    var idx = Math.floor((frac * 8) + 0.5) % 8;
    return { age: age, frac: frac, illum: (1 - Math.cos(2 * Math.PI * frac)) / 2, name: (names[lang] || names.es)[idx], idx: idx };
  }

  /* ------------------------------------------------------------------ dinero */
  function money(n) {
    var loc = lang === 'en' ? 'en-GB' : 'es-ES';
    var s = new Intl.NumberFormat(loc, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
    return lang === 'en' ? '€' + s : s + ' €';
  }

  /* ------------------------------------------------------------------ banner de demo */
  function demoBar() {
    if (!DEMO || SHOT) return;
    if (store.get('tips') !== '0') root.classList.add('tips-on');
    if (store.get('demobar-off') === document.location.pathname) return;
    var bar = h('div', { class: 'kit-demobar', role: 'note' },
      h('span', { class: 'kit-demobar-mark', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { class: 'kit-demobar-txt' }, h('b', { 'data-kit': 'demoBar' }), ' ', h('span', { 'data-kit': 'demoBarSub' })),
      h('button', { class: 'kit-demobar-tips', type: 'button', 'aria-pressed': 'true', onclick: function (e) {
        var on = !root.classList.contains('tips-on'); root.classList.toggle('tips-on', on); e.currentTarget.setAttribute('aria-pressed', String(on)); store.set('tips', on ? '1' : '0');
      }, 'data-kit': 'tips' }),
      h('a', { class: 'kit-demobar-cta', href: OOOX.contact, target: '_blank', rel: 'noopener', 'data-kit': 'demoCta' }),
      h('button', { class: 'kit-demobar-x', type: 'button', 'aria-label': k('close'), onclick: function () { bar.remove(); store.set('demobar-off', document.location.pathname); } }, '×'));
    document.body.insertBefore(bar, document.body.firstChild);
    var fill = function () { $$('[data-kit]', bar).forEach(function (el) { el.textContent = k(el.getAttribute('data-kit')); }); };
    fill(); langFns.push(fill);
  }

  /* ------------------------------------------------------------------ demo: llamadas y WhatsApp */
  function interceptDemo() {
    if (!DEMO) return;
    document.addEventListener('click', function (e) {
      var note = e.target.closest && e.target.closest('[data-demo-note]');
      if (note) {
        e.preventDefault();
        var key = note.getAttribute('data-demo-note');
        dialog(h('div', { class: 'kit-wa' }, h('p', { class: 'kit-wa-k', text: t(key + '.t') }), h('p', { class: 'kit-wa-note', text: t(key + '.d') }),
          h('div', { class: 'kit-wa-actions' }, h('a', { class: 'kit-btn kit-btn-wa', href: OOOX.contact, target: '_blank', rel: 'noopener', text: k('waOpen') }),
            h('button', { class: 'kit-btn kit-btn-ghost', type: 'button', onclick: function (ev) { ev.target.closest('dialog').close(); }, text: k('close') }))), { class: 'kit-dialog-wa' });
        return;
      }
      var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href*="wa.me/"], a[data-demo-wa]');
      if (!a) return;
      e.preventDefault();
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) return callPreview(a.getAttribute('data-number') || href.slice(4));
      var m = href.match(/[?&]text=([^&]*)/);
      wa(a.getAttribute('data-demo-wa') || (m ? decodeURIComponent(m[1]) : ''), {});
    });
  }

  /* ------------------------------------------------------------------ cabecera que se compacta */
  function stickyHeader() {
    var hd = $('[data-header]');
    if (!hd) return;
    var on = false;
    var tick = function () {
      var y = window.scrollY || 0;
      if ((y > 40) !== on) { on = y > 40; hd.classList.toggle('is-scrolled', on); }
    };
    window.addEventListener('scroll', tick, { passive: true }); tick();
  }

  /* ------------------------------------------------------------------ captura limpia (?shot) */
  function shotMode() {
    if (!SHOT) return;
    $$('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
    var el = SHOT_AT && document.getElementById(SHOT_AT);
    if (!el) return;
    // Oculta todo lo que va antes de la sección pedida: la captura empieza en ella.
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      for (var s = n.previousElementSibling; s; s = s.previousElementSibling) {
        if (!/^(SCRIPT|STYLE|LINK|DIALOG|TEMPLATE)$/.test(s.tagName)) s.style.setProperty('display', 'none', 'important');
      }
    }
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ arranque */
  var Kit = {
    $: $, $$: $$, h: h, esc: esc, store: store,
    get lang() { return lang; }, setLang: setLang, t: t, L: L, k: k,
    onLang: function (fn) { langFns.push(fn); },
    madrid: madrid, toMin: toMin, fmtMin: fmtMin, dayName: dayName, todayISO: todayISO, nowMin: nowMadridMin,
    hours: hours, days: days, slots: slots, rand: rand,
    dialog: dialog, toast: toast, wa: wa, callPreview: callPreview,
    compare: compare, moon: moon, money: money, demo: DEMO, shot: !!SHOT, ooox: OOOX,
  };
  window.Kit = Kit;

  function start() {
    initLang();
    shotMode();
    demoBar();
    interceptDemo();
    stickyHeader();
    $$('[data-compare]').forEach(compare);
    applyLang();
    root.classList.add('kit-ready');
    document.dispatchEvent(new CustomEvent('kit:ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
