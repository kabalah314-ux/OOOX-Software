/* OOOX Oficios · la app (app.html), vistas/furgo. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* la furgoneta: la del técnico (#/furgo) o, para la oficina, la de cualquiera (#/furgo/<técnico>) */
function vFurgo(tec){const esT=Q.rol==='tecnico';if(esT)tec=Q.id;const T=cfg.tec[tec];
 if(!T)return'<a class="atras" href="#/equipo">'+I.atras+'Equipo</a><div class="cab"><div><h1>Furgoneta</h1><p class="sub">No encuentro a ese técnico.</p></div></div>';
 const F=FG(tec),F0=S.furgos&&Object.prototype.hasOwnProperty.call(S.furgos,tec)?S.furgos[tec]:null,ahora=Date.now(),hoy=K.madrid().date;
 let h=(esT?'':'<a class="atras" href="#/equipo">'+I.atras+'Equipo</a>')+'<div class="cab"><div><h1>'+(esT?'Tu furgoneta':'Furgoneta de '+esc(T.n))+'</h1><p class="sub">'+
  (F?(F.cnt?'Contada '+hace(F.cnt)+'.':'Aún sin contar.')+' Lo que se usa en cada trabajo se descuenta al terminarlo.':esT?'Si quieres, la app lleva la cuenta de lo que llevas.':esc(T.n)+' no lleva la cuenta de su furgoneta.')+'</p></div>'+
  /* lo principal, arriba como en las demás secciones: lo normal es ver «Para reponer», cargar y apuntarlo */
  (F?'<button class="btn pri peq" id="fgCarga" data-a="fCargar" data-tec="'+tec+'">He cargado</button>':'')+'</div>';
 if(!F){const ya=F0&&F0.st&&Object.keys(F0.st).length;
  return h+'<section class="blq" id="fgNo"><h2>Llevar la cuenta</h2><p class="ln">'+(esT?'Cuentas una vez lo que llevas y apuntas lo que cargas. Lo que uses en cada trabajo se descuenta solo al terminarlo. Así sabes qué te falta para mañana y qué toca reponer.':'Se cuenta una vez lo que lleva, se apunta lo que se carga y lo usado se descuenta solo al terminar cada trabajo. Lo puede empezar '+esc(T.n)+' o la oficina.')+'</p>'+
   (ya?'<p class="mnota" style="margin-top:8px">Se queda guardado lo último que había'+(F0.cnt?', contado '+hace(F0.cnt):'')+'.</p>':'')+'<div class="acts"><button class="btn pri" data-a="fSi" data-tec="'+tec+'">Llevar la cuenta</button></div></section>'}
 const sig=S.avisos.filter(a=>a.tec===tec&&a.e==='asignado'&&a.cita&&a.cita.dia>hoy).map(a=>a.cita.dia).sort()[0];
 const C=[hoy].concat(sig?[sig]:[]).map(d=>K.cargaDe(S,cfg,tec,d,ahora)).filter(c=>!vacia(c)),rp=K.reponerDe(S,cfg,tec),kit=K.kitDe(cfg,tec);
 /* con su marco (20-11-2026): «Para los trabajos», «Para reponer» y lo que lleva */
 const r0=ruta(),k=['reponer','lleva'].includes(r0.b)?r0.b:'trabajos';
 h+=pestas([{k:'trabajos',h:'#/furgo/'+tec+'/trabajos',t:'Para los trabajos'},{k:'reponer',h:'#/furgo/'+tec+'/reponer',t:'Para reponer',n:rp.length},{k:'lleva',h:'#/furgo/'+tec+'/lleva',t:esT?'Lo que llevas':'Lo que lleva'}],k,'Qué ver de la furgoneta')+'<div class="pcuerpo">';
 if(k==='trabajos')return h+'<section class="sec" id="fgDia"><h2>Para los trabajos</h2>'+(C.length?C.map(c=>bCarga(c,{of:!esT})).join(''):'<p class="hueco">Para los trabajos de hoy y del próximo día no hace falta nada.</p>')+'</section></div>';
 if(k==='reponer')return h+'<section class="sec" id="fgRep"><h2>Para reponer <span class="n">'+rp.length+'</span></h2>'+(rp.length?'<ul class="mfal">'+rp.map(x=>'<li><span><b class="num">'+x.q+' ×</b> '+esc(x.t)+' <small>hay '+x.hay+', mínimo '+x.min+'</small></span></li>').join('')+'</ul>':'<p class="hueco">Nada por reponer: todo está por encima del mínimo.</p>')+'</section></div>';
 const ks=MATS.filter(k=>nHay(F,k)||Object.prototype.hasOwnProperty.call(kit,k));
 h+='<section class="sec" id="fgSt"><h2>'+(esT?'Lo que llevas':'Lo que lleva')+'</h2>'+(ks.length?'<ul class="lins fst">'+ks.map(k=>{const n=nHay(F,k),m=Object.prototype.hasOwnProperty.call(kit,k)?kit[k]:null;
   return'<li'+(m&&n<m[0]?' class="bajo"':'')+'><span>'+esc(cfg.cat[k].t)+(m?' <small>(de '+m[0]+' a '+m[1]+')</small>':'')+'</span><span class="num">'+n+'</span></li>'}).join('')+'</ul>':'<p class="hueco">Aún no hay nada apuntado. Cuenta lo que '+(esT?'llevas':'lleva')+'.</p>')+
  '<div class="acts" style="margin-top:12px"><button class="btn" data-a="fContar" data-tec="'+tec+'">Contar lo que hay</button></div></section>';
 const H=(F.h||[]).slice(-20).reverse();
 if(H.length)h+='<details class="hist" id="fgMov"><summary>Movimientos</summary><ol>'+H.map(x=>'<li><time>'+cuandoT(x.t)+'</time><span>'+esc(x.txt)+' ('+esc(x.q)+')</span></li>').join('')+'</ol></details>';
 return h+'<p class="fin"><button class="txt" data-a="fNo" data-tec="'+tec+'">Dejar de llevar la cuenta</button></p></div>'}
/* «He cargado» (se suma) y «Contar» (queda tal cual): todo el material del catálogo, con cuántos */
function hFz(tec,cuenta,dia){S=Oficio.estado();const F=FG(tec);if(!F)return toast('Esa furgoneta no lleva la cuenta.');const T=cfg.tec[tec],esT=Q.rol==='tecnico',v={};
 if(cuenta)MATS.forEach(k=>{v[k]=nHay(F,k)});
 else{const hoy=K.madrid().date,sig=S.avisos.filter(a=>a.tec===tec&&a.e==='asignado'&&a.cita&&a.cita.dia>hoy).map(a=>a.cita.dia).sort()[0];K.cargaDe(S,cfg,tec,dia||sig||hoy,Date.now()).cargar.forEach(x=>{v[x.k]=x.q})}
 const fila=k=>{const t=esc(cfg.cat[k].t);return'<li class="fzr"><label for="fz_'+k+'">'+t+(cuenta?'':'<small>hay '+nHay(F,k)+'</small>')+'</label><span class="st"><button type="button" data-fz="'+k+'" data-d="-1" aria-label="Uno menos: '+t+'">−</button><input id="fz_'+k+'" type="number" inputmode="numeric" min="0" max="999" step="1" value="'+(v[k]||0)+'"><button type="button" data-fz="'+k+'" data-d="1" aria-label="Uno más: '+t+'">+</button></span></li>'};
 const de=esT?'':' de '+esc(T.n);
 const d=hoja(hc(cuenta?'Contar la furgoneta':'Lo que has cargado')+'<form class="hb" id="fzF" novalidate><p class="dn">'+(cuenta?'Pon lo que hay ahora en la furgoneta'+de+'. Lo que pongas queda tal cual.':'Pon lo que metes en la furgoneta'+de+': se suma a lo que ya había. Ya viene puesto lo que falta.')+'</p><ul class="fzl">'+MATS.map(fila).join('')+'</ul><p class="err" id="fz_err" style="color:var(--mal)" hidden></p></form>'+
  '<div class="hp"><button class="btn pri ancho" form="fzF">'+(cuenta?'Guardar el recuento':'Apuntar lo cargado')+'</button></div>',{llena:1});
 const lee=k=>{const n=Math.round(+$('#fz_'+k,d).value);return Number.isFinite(n)?Math.max(0,Math.min(999,n)):0};
 d.addEventListener('click',e=>{const b=e.target.closest('[data-fz]');if(!b)return;const k=b.dataset.fz;$('#fz_'+k,d).value=Math.max(0,Math.min(999,lee(k)+ +b.dataset.d));$('#fz_err',d).hidden=true});
 $('#fzF',d).onsubmit=e=>{e.preventDefault();const L={},m=$('#fz_err',d);MATS.forEach(k=>{const n=lee(k);if(cuenta||n>0)L[k]=n});
  if(!Object.keys(L).length){m.textContent='Pon cuántos has cargado de al menos una cosa.';m.hidden=false;return}
  const r=Oficio.hacer(cuenta?{tipo:'furgo',tec,cuenta:L}:{tipo:'furgo',tec,carga:L},Q);if(!r.ok){m.textContent=ERR[r.err]||'No se ha podido guardar.';m.hidden=false;return}
  d.close();toast(cuenta?(r.cambios?'Recuento guardado: '+(r.cambios===1?'1 cosa cambiada.':r.cambios+' cosas cambiadas.'):'Recuento guardado: todo cuadraba.'):'Apuntado: ya está en la furgoneta.')}}
function hFzNo(tec){const T=cfg.tec[tec],esT=Q.rol==='tecnico';
 const d=hoja(hc('¿Dejar de llevar la cuenta?')+'<div class="hb"><p>'+(esT?'La app dejará de contar lo que llevas.':'La app dejará de contar lo que lleva '+esc(T.n)+'.')+' Lo apuntado se queda guardado: si se vuelve a empezar, sale lo último que había.</p></div><div class="hp"><button class="btn ancho" id="fzNo">Dejar de llevar la cuenta</button><button class="btn ancho" data-x>Volver</button></div>');
 $('#fzNo',d).onclick=()=>{const r=hacer({tipo:'furgo',tec,llevar:false});d.close();if(r.ok)toast('Hecho: ya no se lleva la cuenta.')}}
const bHist=A=>'<details class="hist"><summary>Historial</summary><ol>'+A.h.map(x=>'<li><time>'+cuandoT(x.t)+'</time><span>'+esc(x.txt)+' ('+esc(x.q)+')</span></li>').join('')+'</ol></details>';
