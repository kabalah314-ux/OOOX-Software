/* OOOX Oficios · la app (app.html), entrar-y-avisos. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== con servidor: entrar con el código de cada uno, el aviso de conexión y la sesión ===== */
/* Lo que se elige y se escribe en «Entrar» se guarda aquí según se teclea: si la pantalla se vuelve a pintar (cambia la
   dirección, pasa un minuto), no se pierde ni vuelve a «Centralita» sin que nadie lo vea. El código no sale de la memoria. */
const EN={quien:(SRV&&Oficio.ultima())||'oficina',cod:'',err:'',va:false,ver:false,pintado:''};
const ENERR={clave:'Ese código no es el de esa persona. Son 16 letras y números; da igual si pones los guiones.',corto:'Escribe tu código.',bloqueo:'Demasiados intentos seguidos. Espera diez minutos y prueba otra vez.',red:'No hay conexión con el servidor. Comprueba internet y prueba otra vez.',datos:'Esa persona ya no está en los datos de este negocio. Avisa a OOOX.',servidor:'El servidor ha fallado. Prueba otra vez en un momento.',lleno:'El servidor está ocupado. Prueba otra vez en unos segundos.'};
function pEntra(){const m=Oficio.red().motivo,L=[['oficina','Centralita']].concat(N.tecnicos.map(t=>[t.id,t.n+' '+t.ap]));
 if(!L.some(x=>x[0]===EN.quien))EN.quien='oficina';
 /* si ya está en pantalla tal cual, no se toca: así no se mueve el cursor ni se cierra el teclado del móvil */
 const marca=[m,EN.err,EN.va,EN.ver].join('|');if($('#fEntra')&&EN.pintado===marca){if($('#e_quien').value!==EN.quien)$('#e_quien').value=EN.quien;if($('#e_cod').value!==EN.cod)$('#e_cod').value=EN.cod;return}
 EN.pintado=marca;
 const h='<div class="entra"><div class="cab"><div><h1>Entrar</h1><p class="sub">'+esc(N.nombre)+' por dentro. Cada persona entra con su código.</p></div></div>'+
  (m==='clave'&&!EN.err?'<p class="ojo">Tu código ha dejado de valer en este aparato. Pide uno nuevo a quien lleva la app. Lo que tenías sin enviar sigue guardado aquí y saldrá cuando entres.</p>':'')+
  '<form id="fEntra" novalidate><div class="campo"><label for="e_quien">Quién eres</label><select id="e_quien">'+L.map(x=>'<option value="'+esc(x[0])+'"'+(EN.quien===x[0]?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select></div>'+
  '<div class="campo'+(EN.err?' mal':'')+'"><label for="e_cod">Tu código</label><input id="e_cod" value="'+esc(EN.cod)+'" type="'+(EN.ver?'text':'password')+'" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false"'+(EN.err?' aria-invalid="true" aria-describedby="e_ecod"':' aria-describedby="a_ecod"')+'>'+
   (EN.err?'<p class="err" id="e_ecod">'+(ENERR[EN.err]||ENERR.servidor)+'</p>':'<p class="ayuda" id="a_ecod">Te lo da quien lleva la app en el negocio. Se queda guardado en este aparato hasta que cierres la sesión.</p>')+
   '<button class="txt ver" type="button" id="eVer" aria-pressed="'+EN.ver+'">'+(EN.ver?'Ocultar el código':'Ver el código')+'</button></div>'+
  '<button class="btn pri ancho" type="submit"'+(EN.va?' disabled':'')+'>'+(EN.va?'Entrando…':'Entrar')+'</button></form></div>';
 const v=$('#v');v.className='estrecha';v.innerHTML=h;document.body.classList.remove('det');geoPara();
 if(NAVH!==''){$('#nav').innerHTML='';NAVH=''}$('#quien').innerHTML='';CUR='entrar';document.title='Entrar · '+N.nombre+' por dentro'}
function entra(){if(EN.va)return;EN.cod=$('#e_cod').value;EN.quien=$('#e_quien').value;
 if(EN.cod.trim().length<8){EN.err='corto';pEntra();$('#e_cod').focus();return}
 EN.va=true;EN.err='';pEntra();
 Oficio.entrar(EN.quien,EN.cod).then(r=>{EN.va=false;
  if(r.ok){EN.err='';EN.ver=false;EN.cod='';EN.pintado='';location.hash='#/';pinta();scrollTo(0,0);$('#v').focus({preventScroll:true});return}
  EN.err=r.err;pEntra();$('#e_cod').focus()})}
function pRed(){const e=$('#red');if(!e||!SRV)return;const r=Oficio.red();let t='';
 if(Oficio.sesion()){
  if(r.motivo==='bloqueo')t='Hay demasiados intentos fallidos con tu código. La app vuelve a probar sola en unos minutos.';
  else if(r.sinRed)t='Sin conexión. '+(r.cola?(r.cola===1?'1 cambio por enviar: saldrá solo.':r.cola+' cambios por enviar: saldrán solos.'):'Ves lo último que llegó.');
  else if(r.lleno)t='Este aparato se ha quedado sin sitio para guardar. No cierres la app hasta que vuelva la conexión.';
  else if(r.rech)t=(r.rech===1?'1 cambio no se pudo guardar':r.rech+' cambios no se pudieron guardar')+': míralo en «Tu sesión».'}
 if(e.textContent!==t)e.textContent=t;e.hidden=!t;document.body.classList.toggle('conred',!!t)}
/* ===== la app en el móvil (16-11-2026): que se pueda instalar, que abra sin cobertura y que avise de lo que llega =====
   El «trabajador» (sw.js) guarda las pantallas al usarlas y las sirve sin red. En las pruebas (127.0.0.1) no se registra,
   salvo con ?sw=1: así las demás pruebas miran la app sin él y la suya lo mira con él. */
const APP_ES=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const APPI={ev:null,ios:/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),reg:null};
if('serviceWorker' in navigator&&location.protocol!=='file:'&&(!/^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname)||/[?&]sw=1\b/.test(location.search))){
 navigator.serviceWorker.register('sw.js').then(r=>{APPI.reg=r}).catch(()=>{});
 navigator.serviceWorker.addEventListener('message',e=>{const id=e.data&&e.data.abre;if(typeof id==='string'&&id)location.hash='#/aviso/'+encodeURIComponent(id)})}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();APPI.ev=e});
/* el icono del iPhone, solo si el negocio tiene sus iconos PNG (los nombra su manifiesto): si no, el iPhone usa una captura */
fetch('manifest.webmanifest').then(r=>r.ok?r.json():null).then(m=>{if(m&&Array.isArray(m.icons)&&m.icons.some(i=>/icono-192\.png$/.test(i.src||''))&&!document.querySelector('link[rel=apple-touch-icon]')){
 const l=document.createElement('link');l.rel='apple-touch-icon';l.href='assets/icono-180.png';document.head.append(l)}}).catch(()=>{});
addEventListener('appinstalled',()=>{APPI.ev=null});
/* avisar de lo que llega: a la oficina, un aviso nuevo; al técnico, uno que le asignan. Suena, vibra, se cuenta en el título
   y, con permiso, sale una notificación. Con la app abierta o en segundo plano: si se cierra del todo, no avisa (para eso
   haría falta un servidor de notificaciones). Lo enciende cada aparato en «Tu sesión» y queda guardado en él. Lo que hace
   uno mismo no se avisa, ni lo que ya estaba al abrir la app */
const AV={clave:'oficio:'+N.id+':avisar',vistos:null,vistosC:null,ses:null,n:0,ctx:null};
const avisarOn=()=>{try{return localStorage.getItem(AV.clave)==='1'}catch(e){return false}};
const guardaAvisar=si=>{try{si?localStorage.setItem(AV.clave,'1'):localStorage.removeItem(AV.clave)}catch(e){}};
function avisosHtml(){const on=avisarOn(),np='Notification' in window?Notification.permission:'';
 return'<div class="mavi" id="mAvi"><p><b>Avisos en este aparato</b><br><small>'+(on?(Q.rol==='tecnico'?'Suena cuando te asignan un aviso':'Suena cuando entra un aviso nuevo')+
  (np==='granted'?' y sale una notificación':np==='denied'?'. Las notificaciones están bloqueadas en este navegador':'')+'. Con la app abierta o en segundo plano.':'Apagados: no suena nada.')+'</small></p>'+
  '<button class="btn peq" id="mAviB" type="button">'+(on?'Apagar':'Encender')+'</button></div>'}
/* despertar el sonido: Firefox rechaza la promesa que queda pendiente al cambiar de página («Navigated away from page»);
   se recoge para que no salga como error en la consola */
const despierta=C=>{try{if(C&&C.state==='suspended'){const r=C.resume();if(r&&r.catch)r.catch(()=>{})}}catch(e){}};
function pita(){try{const C=AV.ctx||(AV.ctx=new (window.AudioContext||window.webkitAudioContext)());despierta(C);
 [0,.2].forEach(s=>{const o=C.createOscillator(),gn=C.createGain(),t=C.currentTime+s;o.frequency.value=880;gn.gain.setValueAtTime(.0001,t);
  gn.gain.exponentialRampToValueAtTime(.3,t+.02);gn.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(gn).connect(C.destination);o.start(t);o.stop(t+.17)})}catch(e){}}
addEventListener('pointerdown',()=>despierta(AV.ctx),{passive:true});
function notifica(tit,cuerpo,id){if(!('Notification' in window)||Notification.permission!=='granted')return;
 const o={body:cuerpo,tag:'aviso-'+id,data:{aviso:id},icon:'assets/icono-192.png'};
 (APPI.reg&&APPI.reg.showNotification?APPI.reg.showNotification(tit,o):Promise.reject(0)).catch(()=>{try{const x=new Notification(tit,o);x.onclick=()=>{focus();location.hash='#/aviso/'+encodeURIComponent(id);x.close()}}catch(e){}})}
function cuentaTitulo(){const t=document.title.replace(/^\(\d+\) /,'');document.title=AV.n&&document.hidden?'('+AV.n+') '+t:t}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){AV.n=0;cuentaTitulo()}});
function miraLlegadas(){const se=SRV&&Oficio.sesion();if(!se){AV.ses=null;return}
 /* al entrar, y hasta haber leído entero lo del servidor, lo que hay no es nuevo: se apunta y no suena */
 if(AV.ses!==se.persona){AV.ses=se.persona;AV.vistos=null;AV.vistosC=null}
 if(!(Oficio.red()||{}).listo){AV.vistos=null;AV.vistosC=null;return}
 const S=Oficio.estado(),yo=Q.rol==='tecnico'?(cfg.tec[Q.id]||{}).n:'Centralita';
 const L=Q.rol==='tecnico'?S.avisos.filter(a=>a.tec===Q.id&&(a.e==='asignado'||a.e==='camino')):S.avisos.filter(a=>a.e==='nuevo');
 /* y a la oficina, lo que cambia el cliente desde su zona (19-11-2026): su cita cambiada o cancelada. Lo último de su historial
    es del cliente y no es pedirla */
 const LC=Q.rol==='centralita'?S.avisos.filter(a=>Array.isArray(a.h)&&a.h.length>1&&a.h[a.h.length-1].q==='Cliente'):[],kc=a=>a.id+':'+a.h.length;
 const ids=new Set(L.map(a=>a.id)),antes=AV.vistos,antesC=AV.vistosC;AV.vistos=ids;AV.vistosC=new Set(LC.map(kc));
 if(!antes)return;
 const nuevos=L.filter(a=>!antes.has(a.id)&&!(Array.isArray(a.h)&&a.h.length&&a.h[a.h.length-1].q===yo)),cambios=antesC?LC.filter(a=>!antesC.has(kc(a))):[];
 if((!nuevos.length&&!cambios.length)||!avisarOn())return;
 if(cambios.length){const tc=a=>a.e==='cancelado'?'El cliente ha cancelado '+a.id+' · '+((cfg.av[a.av]||{}).n||''):'El cliente ha cambiado su cita: '+a.id+(a.cita?', al '+K.fechaCorta(a.cita.dia):'');
  document.dispatchEvent(new CustomEvent('oficio:avisa',{detail:{avisos:cambios.map(a=>a.id),cliente:true}}));if(!nuevos.length)pita();
  if(document.hidden){AV.n+=cambios.length;cuentaTitulo();cambios.forEach(a=>notifica('Cambio de un cliente',tc(a),a.id))}else toast(cambios.length===1?tc(cambios[0]):cambios.length+' cambios de clientes en sus citas');
  if(!nuevos.length)return}
 document.dispatchEvent(new CustomEvent('oficio:avisa',{detail:{avisos:nuevos.map(a=>a.id)}}));   /* para quien quiera enterarse (las pruebas lo cuentan) */
 pita();try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(e){}
 const txt=a=>(Q.rol==='tecnico'?'Te han asignado ':'Aviso nuevo: ')+a.id+' · '+((cfg.av[a.av]||{}).n||'')+(a.cita?', cita el '+K.fechaCorta(a.cita.dia):', urgente');
 if(document.hidden){AV.n+=nuevos.length;cuentaTitulo();nuevos.forEach(a=>notifica(Q.rol==='tecnico'?'Te han asignado un aviso':'Aviso nuevo',txt(a),a.id))}
 else toast(nuevos.length===1?txt(nuevos[0]):(Q.rol==='tecnico'?'Te han asignado ':'Han entrado ')+nuevos.length+' avisos')}
Oficio.suscribir(()=>setTimeout(miraLlegadas,0));
