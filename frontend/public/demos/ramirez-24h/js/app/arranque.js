/* OOOX Oficios · la app (app.html), arranque: pinta la primera pantalla. La primera vez de la demo, después de «Preparando la demo…» (21-11-2026) */
window.__arranca = function () {
  window.__arranco = performance.now();
  if (window.__prepara) S = Oficio.estado();
  pinta();
  const pr = document.getElementById('preparando');
  if (pr) pr.remove();
};
