/* OOOX Oficios · la app (app.html), hojas/equipo. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* lo que el servidor no aceptó, dicho con palabras (16-11-2026) */
const QUE_ES={web:'Servicios de la web',empezar:'Empezar, con el precio firmado',terminar:'Terminado',ampliar:'Añadir al trabajo',noacepta:'No acepta el precio',voy:'Voy',ausente:'No había nadie',anotar:'Nota o foto',falta:'Material que falta',pausa:'Pausa',cobrar:'Apuntar cobro',asignar:'Asignar',mover:'Cambiar la hora',cancelar:'Cancelar',completar:'Datos del cliente',facturar:'Facturada',rebajar:'Rebajar el precio',corregirPago:'Corregir la forma de pago',garantia:'Es garantía',enviado:'Mensaje enviado',contrato:'Contrato',furgo:'Furgoneta'};
function hSesion(){const esT=Q.rol==='tecnico',t=cfg.tec[Q.id],r=Oficio.red(),RC=Oficio.rechazos?Oficio.rechazos():[];
 const d=hoja(hc('Tu sesión')+'<div class="hb"><div class="mrol"><div class="tec">'+(esT?ava(Q.id):'<i class="av c" aria-hidden="true">C</i>')+'<span><b>'+(esT?esc(t.n+' '+t.ap):'Centralita')+'</b><small>'+(esT?'Técnico'+(t.jefe?' y dueño':''):'Quien coge el teléfono y reparte')+'</small></span></div></div>'+
  '<p class="mnota" id="mCola" style="margin-top:14px">'+(r.cola?(r.cola===1?'Queda 1 cambio por enviar.':'Quedan '+r.cola+' cambios por enviar.')+' Saldrán solos en cuanto haya conexión.':'Todo lo que has hecho está guardado en el servidor.')+'</p>'+
  avisosHtml()+(APP_ES?'':APPI.ev?'<button class="btn ancho" id="mInst" style="margin-top:12px">Instalar la app en este aparato</button>':APPI.ios?'<p class="mnota" id="mIos">Para tenerla como una app: botón Compartir y «Añadir a pantalla de inicio».</p>':'')+
  (r.reglas?'<p class="ojo">La app lleva las reglas '+esc(K.VERSION)+' y el servidor, las '+esc(r.reglas)+'. Avisa a OOOX.</p>':'')+
  (r.datos?'<p class="ojo" id="mDatos">Lo que ven los clientes al pedir cita (precios, servicios o zonas) no es lo que tiene el servidor. Avisa a OOOX.</p>':'')+
  (RC.length?'<div class="ojo" id="mRech"><p><b>No se pudo guardar</b> lo que sigue: lo hecho sin conexión que el servidor no aceptó, porque el aviso había cambiado.</p><ul>'+RC.slice(-10).reverse().map(x=>'<li>'+cuandoT(x.t)+': '+esc(QUE_ES[x.tipo]||x.tipo)+(x.id?' ('+esc(x.id)+')':'')+'. '+esc(ERR[x.err]||'El aviso había cambiado.')+'</li>').join('')+'</ul><button class="txt" id="mRechNo">Entendido, borrar la lista</button></div>':'')+
  '</div><div class="hp">'+(manda()?'<button class="btn ancho" id="mWeb">Servicios de la web</button><button class="btn ancho" id="mEq">Equipo y accesos</button>':'')+'<button class="btn ancho" id="mSal">Cerrar la sesión</button></div>');
 let seguro=false;
 {const b=$('#mAviB',d);if(b)b.onclick=async()=>{if(avisarOn())guardaAvisar(false);else{guardaAvisar(true);pita();
   if('Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch(e){}}}
   const p=$('#mAvi',d);if(p){p.outerHTML=avisosHtml();const n=$('#mAviB',d);if(n){n.onclick=b.onclick;n.focus()}}}}
 {const b=$('#mInst',d);if(b)b.onclick=()=>{const e=APPI.ev;APPI.ev=null;d.close();if(e){e.prompt();e.userChoice.catch(()=>{})}}}
 {const b=$('#mRechNo',d);if(b)b.onclick=()=>{Oficio.olvidaRechazos();d.close();pRed();toast('Lista borrada.')}}
 if(manda()){$('#mEq',d).onclick=()=>{d.close();hEquipo()};$('#mWeb',d).onclick=()=>{d.close();hWeb()}}
 $('#mSal',d).onclick=()=>{const n=Oficio.red().cola;
  if(n&&!seguro){seguro=true;$('#mSal',d).textContent=n===1?'Salir y perder ese cambio':'Salir y perder esos '+n+' cambios';$('#mCola',d).textContent='Hay '+(n===1?'1 cambio':n+' cambios')+' sin enviar. Si sales ahora, se pierden.';return}
  d.close();EN.cod='';EN.err='';EN.pintado='';Oficio.salir();location.hash='#/';pinta();toast('Sesión cerrada.')}}
/* ===== con servidor: el equipo y sus accesos (la oficina o el técnico que es el dueño) ===== */
const manda=()=>Q.rol==='centralita'||(Q.rol==='tecnico'&&!!cfg.tec[Q.id]&&!!cfg.tec[Q.id].jefe);
const EQERR={permiso:'Solo la oficina o el dueño pueden llevar el equipo.',tuyo:'No puedes quitarte el acceso a ti: te quedarías fuera.',ultimo:'Tiene que quedar alguien que pueda llevar el equipo: la oficina o el dueño.',nadie:'Esa persona ya no está en el equipo del negocio.',limite:'Hoy ya se han hecho muchos cambios de acceso. Prueba mañana o avisa a OOOX.',red:'No hay conexión. Prueba otra vez.',lleno:'Hay mucha gente a la vez. Prueba otra vez en unos segundos.',servidor:'Algo ha fallado en el servidor. Prueba otra vez.',sesion:'Tu sesión ha dejado de valer. Entra otra vez.',clave:'Tu sesión ha dejado de valer. Entra otra vez.',bloqueo:'Tu sesión ha dejado de valer. Entra otra vez.'};
const EQEST={activo:'Puede entrar',baja:'Acceso quitado',sin:'Aún sin acceso'};
function hEquipo(){const d=hoja(hc('Equipo y accesos')+'<div class="hb" id="eqB"><p role="status">Mirando quién puede entrar…</p></div><div class="hp"><button class="btn ancho" data-x>Cerrar</button></div>');
 let seguro='',ult=null;
 const nom=(r,p)=>{const x=(r.equipo||[]).find(y=>y.persona===p);return x?x.nombre:p};
 const cuando=t=>{const f=new Date(t);return f.toLocaleDateString('es-ES',{day:'numeric',month:'short',timeZone:'Europe/Madrid'})+', '+f.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'})};
 const pinta=r=>{if(!d.open)return;ult=r;seguro='';
  if(!r||!r.ok){$('#eqB',d).innerHTML='<p class="ojo" role="alert">'+(EQERR[r&&r.err]||EQERR.servidor)+'</p>';return}
  const filas=r.equipo.map(x=>'<li class="eqf" data-p="'+esc(x.persona)+'"><span class="eqn"><b>'+esc(x.nombre)+'</b><small>'+(x.rol==='centralita'?'Oficina':'Técnico'+(x.jefe?' y dueño':''))+(x.persona===r.yo?' · tú':'')+'</small><small class="eqe '+x.estado+'">'+EQEST[x.estado]+(x.fuera?' · ya no está en el equipo':'')+'</small></span>'+
   '<span class="eqa">'+(x.fuera?'':'<button class="txt" data-hace="codigo">'+(x.estado==='activo'?'Código nuevo':'Darle acceso')+'</button>')+(x.estado==='activo'&&x.persona!==r.yo?'<button class="txt" data-hace="baja">Quitar el acceso</button>':'')+'</span></li>').join('');
  const hist=(r.accesos||[]).slice(0,5).map(a=>'<li>'+esc(cuando(a.cuando))+' · '+esc(nom(r,a.quien))+(a.que==='baja'?' quitó el acceso a ':' dio un código a ')+esc(nom(r,a.a))+'</li>').join('');
  $('#eqB',d).innerHTML='<p class="dn">Cada persona entra con su propio código. Si alguien deja el negocio, quítale el acceso hoy mismo: su app se cierra sola en unos segundos.</p><ul class="eql">'+filas+'</ul><p class="dn" id="eqNota" role="status" aria-live="polite"></p>'+(hist?'<p class="eqt">Lo último</p><ul class="eqh">'+hist+'</ul>':'')};
 const carga=()=>Oficio.equipo().then(pinta);
 d.addEventListener('click',e=>{const b=e.target.closest('[data-hace]');if(!b||!ult)return;const p=b.closest('[data-p]').dataset.p,hace=b.dataset.hace,k=hace+':'+p,nota=$('#eqNota',d);
  if(seguro!==k){seguro=k;$$('[data-hace]',d).forEach(x=>{if(x!==b&&x._t)x.textContent=x._t});b._t=b._t||b.textContent;b.textContent=hace==='baja'?'Sí, quitarle el acceso':'Sí, darle un código nuevo';
   nota.textContent=hace==='baja'?'Su app se cerrará y no podrá volver a entrar hasta que le des un código nuevo.':'Si ya tenía un código, dejará de valer. El nuevo sale una sola vez.';return}
  seguro='';$$('[data-hace]',d).forEach(x=>x.disabled=true);nota.textContent=hace==='baja'?'Quitando el acceso…':'Preparando el código…';
  Oficio.equipo(hace,p).then(r=>{
   if(!r||!r.ok){$$('[data-hace]',d).forEach(x=>x.disabled=false);if(b._t)b.textContent=b._t;nota.textContent=EQERR[r&&r.err]||EQERR.servidor;return}
   if(hace==='baja'){toast(r.ya?'Ya no tenía acceso.':'Acceso quitado a '+nom(ult,p)+'.');carga();return}
   d.close();hCodigo(nom(ult,p),r)})});
 carga()}
function hCodigo(nombre,r){
 const d=hoja(hc(r.tuyo?'Tu código nuevo':'El código de '+esc(nombre))+'<div class="hb"><p class="gordo num" id="eqCod">'+esc(r.codigo)+'</p>'+
  '<p class="dn">'+(r.tuyo?'Este aparato ya lo usa. Apúntalo para entrar en los demás: el de antes ya no vale.':'Dáselo en persona o por un mensaje privado. Entra con su nombre y este código. No se guarda en ningún sitio: si lo pierde, dale otro.')+'</p></div>'+
  '<div class="hp"><button class="btn pri ancho" id="eqCopia">Copiar el código</button><button class="btn ancho" data-x>Hecho</button></div>');
 $('#eqCopia',d).onclick=()=>{const ok=()=>{$('#eqCopia',d).textContent='Copiado'};try{navigator.clipboard.writeText(r.codigo).then(ok,()=>{})}catch(e){}}}
