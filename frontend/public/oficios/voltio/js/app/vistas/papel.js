/* OOOX Oficios · la app (app.html), vistas/papel. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
function vPapelContrato(id) {
  const C = contrato(id);
  if (!C)
    return (
      '<div class="cab"><div><h1>Contrato</h1><p class="sub">No encuentro el contrato ' +
      esc(id) +
      '.</p></div></div><p class="fin"><a class="txt" href="#/contratos">Volver a los contratos</a></p>'
    );
  const d = conIdioma(idiomaTel(C.cli && C.cli.tel), () => OficioPapeles.contrato(C, { K, N, cfg, firmaSvg: Oficio.firmaSvg })); // en el idioma del cliente (17-11-2026)
  return (
    '<div class="noimp"><a class="atras" href="' +
    (Q.rol === 'centralita' ? '#/contratos">' + I.atras + 'Contratos' : '#/">' + I.atras + 'Volver') +
    '</a><div class="cab"><div><h1 class="vh">Contrato ' +
    esc(C.id) +
    '</h1></div></div></div><article class="papel doc">' +
    d.replace('<h1>', '<h2 class="h1" style="font:700 2.1rem/1.05 var(--fd);color:var(--tinta);margin:18px 0 2px">').replace('</h1>', '</h2>') +
    (Oficio.DEMO ? '<p class="pie">Documento de ejemplo de una demo: empresa, cliente e importes son inventados.</p>' : '') +
    '</article>' +
    '<div class="dacts noimp"><button class="btn pri" data-a="imprimir">Imprimir o guardar en PDF</button></div>'
  );
}
function vPapel(id, tipo) {
  if (tipo === 'contrato') return vPapelContrato(id);
  const A = el(id);
  if (!A || !A.tot)
    return (
      '<div class="cab"><div><h1>Papeles</h1><p class="sub">Este aviso todavía no tiene papeles.</p></div></div><p class="fin"><a class="txt" href="#/aviso/' +
      esc(id) +
      '">Volver al aviso</a></p>'
    );
  const tipos = OficioPapeles.tipos(A);
  tipo = OficioPapeles.elige(A, tipo);
  const d = conIdioma(A.idioma, () => OficioPapeles.doc(A, tipo, { K, N, cfg, firmaSvg: Oficio.firmaSvg, foto: Oficio.fotoSrc })); // en el idioma del cliente (17-11-2026)
  return (
    '<div class="noimp"><a class="atras" href="#/aviso/' +
    A.id +
    '">' +
    I.atras +
    'Aviso ' +
    A.id +
    '</a><div class="cab"><div><h1 class="vh">Papeles del aviso ' +
    A.id +
    '</h1></div></div><nav class="vdocs" aria-label="Papeles">' +
    tipos.map(x => '<a href="#/papel/' + A.id + '/' + x[0] + '"' + (x[0] === tipo ? ' aria-current="page"' : '') + '>' + x[1] + '</a>').join('') +
    '</nav></div><article class="papel doc">' +
    d.replace('<h1>', '<h2 class="h1" style="font:700 2.1rem/1.05 var(--fd);color:var(--tinta);margin:18px 0 2px">').replace('</h1>', '</h2>') +
    (Oficio.DEMO ? '<p class="pie">Documento de ejemplo de una demo: empresa, cliente e importes son inventados.</p>' : '') +
    '</article>' +
    '<div class="dacts noimp"><button class="btn pri" data-a="imprimir">Imprimir o guardar en PDF</button>' +
    (A.e === 'hecho' ? '<button class="btn" data-a="msg" data-id="' + A.id + '" data-k="hecho">Enviar al cliente</button>' : '') +
    '</div>'
  );
}
