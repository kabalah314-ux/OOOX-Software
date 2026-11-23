/* ============================================================
   EL ESTADO DE LA APP · dónde viven los avisos.
   Sin servidor (la demo y las copias que aún no lo tienen): el estado vive en
   este navegador y se comparte al momento entre pestañas y marcos.
   Con servidor (los datos del negocio traen «servidor»): cada persona entra con
   su código, lo que hace se ve al momento y se manda al servidor, y la app
   pregunta cada pocos segundos si hay algo nuevo. Las pantallas llaman a lo
   mismo en los dos casos; las reglas no cambian, están en oficio-nucleo.js.
   ============================================================ */
(function(g){
'use strict';
/* LA MUESTRA CON EL NOMBRE DE UN NEGOCIO (19-11-2026), para la captación: la carta lleva un código QR con un enlace a la
   demo con el nombre de ese negocio dentro («?m=…»), sin guardar nada en ningún servidor. Solo en la demo (sin servidor y
   con la muestra de avisos): pone su nombre, su marca y su zona en lugar de los del negocio de ejemplo y, arriba y siempre a la vista,
   que es una muestra preparada por OOOX y hasta cuándo. Caducada, a más de 90 días o mal hecha, no cambia nada.
   El enlace: base64url de {"v":1,"n":"Fontanería Serra","t":"600000000","d":"C/ de Sants 1","z":"Sants","h":"2026-12-20"}
   (captacion/tanda.py lo hace): su nombre, su teléfono y su dirección, que salen en la demo como los del negocio; lo demás, igual.
   Se queda para toda la pestaña (también en los marcos de la página de los tres móviles) hasta que se cierra. */
function muestraDe(g,N){
 const MK='ooox:muestra',sto=(()=>{try{return g.sessionStorage}catch(e){return null}})();
 const limpia=s=>String(s==null?'':s).normalize('NFC').replace(/[^\p{L}\p{N} &.,'’·\-]/gu,'').replace(/\s+/g,' ').trim().slice(0,48);
 const lee=t=>{try{if(typeof t!=='string'||!/^[A-Za-z0-9_-]{8,400}$/.test(t))return null;const b=atob(t.replace(/-/g,'+').replace(/_/g,'/'));
  const j=JSON.parse(new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0))));return j&&typeof j==='object'&&!Array.isArray(j)?j:null}catch(e){return null}};
 const de=w=>{try{return new URLSearchParams(w.location.search).get('m')}catch(e){return null}};
 let t=de(g);if(!t&&g.parent&&g.parent!==g)t=de(g.parent);if(!t&&sto)try{t=sto.getItem(MK)}catch(e){}
 if(!t)return null;const j=lee(t);
 const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date()),dias=h=>(Date.parse(h+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/864e5;
 const n=j&&limpia(j.n),z=j&&limpia(j.z),h=j&&typeof j.h==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(j.h)?j.h:'';
 /* su teléfono (nueve cifras de España) y su dirección, si los lleva: en la demo, como los del negocio */
 const t9=j&&typeof j.t==='string'&&/^[6789]\d{8}$/.test(j.t)?j.t:'',dd=j?String(j.d==null?'':j.d).normalize('NFC').replace(/[^\p{L}\p{N} &.,'’·ºª()\/\-]/gu,'').replace(/\s+/g,' ').trim().slice(0,80):'';
 if(!j||j.v!==1||n.length<2||!h){try{sto&&sto.removeItem(MK)}catch(e){}return null}
 if(!(dias(h)>=0)||dias(h)>90){try{sto&&sto.removeItem(MK)}catch(e){}return{n,h,caducada:true}}
 try{sto&&sto.setItem(MK,t)}catch(e){}
 /* lo del negocio de ejemplo, cambiado por lo suyo: lo mismo que hace captacion/muestra.py con el archivo de datos */
 const w=n.split(' '),m=w.length<2?[n,'']:[w.slice(0,-1).join(' '),w[w.length-1]],corto=m[1]||m[0],viejo=Array.isArray(N.marca)?N.marca.filter(Boolean).join(' '):'',ant=Array.isArray(N.marca)&&N.marca[0]?String(N.marca[0]):'';
 N.nombre=n;N.marca=m;N.razon=n;N.nif="—";   // el NIF de ejemplo no va con el nombre de un negocio de verdad
 N.dir=dd?(N.ciudad&&dd.toLowerCase().indexOf(String(N.ciudad).toLowerCase())<0?dd+', '+N.ciudad:dd):[z,N.ciudad].filter(Boolean).join(', ');
 if(t9)N.tel=t9.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/,'$1 $2 $3 $4');
 const cambia=x=>typeof x==='string'&&ant?x.split('el logo de '+ant).join('el logo de '+corto).split('the '+ant+' logo').join('the '+corto+' logo'):Array.isArray(x)?x.map(cambia):x&&typeof x==='object'?(Object.keys(x).forEach(k=>{x[k]=cambia(x[k])}),x):x;
 (N.tecnicos||[]).forEach(T=>{if(T&&typeof T.coche==='string')T.coche=cambia(T.coche)});
 return{n,z,h,viejo,t:t9,d:dd}}
/* el aviso de arriba: qué es, para quién y hasta cuándo, y cómo escribir a Oscar. Solo en la página de arriba, no en sus marcos */
function avisoMuestra(g,M){if(!M||g.top!==g)return;const d=g.document;
 const pon=()=>{if(d.getElementById('muestraOoox'))return;const f=M.h.split('-').reverse().join('-'),e=d.createElement('div');e.id='muestraOoox';e.setAttribute('role','note');
  e.style.cssText='position:relative;z-index:50;padding:10px 14px;background:#ffd23f;color:#111;font:600 15px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wa='https://wa.me/34670409550?text='+encodeURIComponent('Hola, Oscar. He visto la muestra de OOOX Oficios para '+M.n+' y me interesa.');
  e.innerHTML=M.caducada?'Esta muestra ya ha caducado. Lo que ves es la demo de OOOX Oficios, con un negocio inventado.'
   :'Muestra preparada por OOOX para <b>'+esc(M.n)+'</b>. No es su web: es una demo con clientes inventados, hasta el '+esc(f)+'. <a href="'+wa+'" target="_blank" rel="noopener" style="color:#111">Me interesa</a>';
  d.body.insertBefore(e,d.body.firstChild);
  /* la página de los tres móviles lleva la marca arriba: también la suya */
  const wm=d.querySelector('.fila1 .wm'),Mk=g.OFICIO_NEGOCIO&&g.OFICIO_NEGOCIO.marca;
  if(wm&&!M.caducada&&Array.isArray(Mk)){wm.innerHTML=esc(Mk[0])+(Mk[1]?'<span>'+esc(Mk[1])+'</span>':'');wm.setAttribute('aria-label',M.n)}
  /* lo que la página marca: fuera lo del negocio de ejemplo que no es suyo (el fundador), y su nombre donde va el nombre */
  if(!M.caducada){d.querySelectorAll('[data-muestra-oculta]').forEach(x=>{x.hidden=true;x.style.display='none'});d.querySelectorAll('[data-muestra-nombre]').forEach(x=>{x.textContent=M.n})}};
 if(d.body)pon();else d.addEventListener('DOMContentLoaded',pon)}
const MUESTRA=(()=>{const N0=g.OFICIO_NEGOCIO,sv=N0&&N0.servidor&&typeof N0.servidor==='object';try{return N0&&!sv&&typeof g.OFICIO_MUESTRA==='function'?muestraDe(g,N0):null}catch(e){return null}})();
const K=g.OficioNucleo,N=g.OFICIO_NEGOCIO,cfg=K.cfgDe(N),CLAVE='oficio:'+N.id;
const OE=g.OficioEspejo,SV=N.servidor&&typeof N.servidor==='object'&&typeof N.servidor.url==='string'&&OE?N.servidor:null;
if(N.servidor&&!SV)console.error('Los datos del negocio piden servidor, pero falta js/oficio-espejo.js o la dirección.');
let S=null,canal=null;const subs=[];
try{canal=new BroadcastChannel(CLAVE)}catch(e){}
function lee(){try{const r=localStorage.getItem(CLAVE);if(r){const x=JSON.parse(r);if(x&&x.esq===K.ESQ&&Array.isArray(x.avisos))return x}}catch(e){}return null}
function guarda(){let dentro=false;
 try{localStorage.setItem(CLAVE,JSON.stringify(S));dentro=true}
 catch(e){try{S.avisos.forEach(a=>{a.foto='';a.fotos=[]});localStorage.setItem(CLAVE,JSON.stringify(S));dentro=true}catch(e2){}}
 if(canal)canal.postMessage(dentro?{v:S.v}:{v:S.v,S})}
function avisa(){subs.forEach(f=>{try{f(S)}catch(e){console.error(e)}})}
/* La muestra se rehace sola si tiene más de 8 horas: si no, quien abre la demo al día siguiente
   ve «urgente sin asignar, hace 20 h», que da mala imagen del negocio. Lo que se haya probado se pierde.
   Y también si se hizo con otra versión de las reglas (vm): quien abrió la demo antes de una actualización ve la
   muestra nueva, con lo nuevo (por ejemplo, la furgoneta), y no la que guardó su navegador. */
const VIEJA=8*3600*1000;
/* Solo la demo lleva avisos de muestra. La copia de un negocio de verdad no trae OFICIO_MUESTRA:
   arranca vacía y sus datos no se rehacen nunca. */
const DEMO=!SV&&typeof g.OFICIO_MUESTRA==='function';
function muestra(){const x=DEMO?g.OFICIO_MUESTRA(K,cfg,Date.now()):K.nuevo();x.t0=Date.now();if(DEMO)x.vm=K.VERSION;return x}
function estado(){const x=lee();
 if(x&&!(DEMO&&(Date.now()-(x.t0||0)>VIEJA||x.vm!==K.VERSION)))S=x;
 else if(x){S=muestra();S.v=Math.max(Date.now(),(x.v||0)+1);guarda()}
 else if(!S){S=muestra();guarda()}
 return S}
/* ¿la próxima vez que se pida el estado hay que fabricar la muestra? (solo la demo, y solo la primera vez o cuando caduca). La
   pantalla lo mira antes de pedirlo para pintar un «preparando la demo» y no quedarse en blanco lo que tarde (21-11-2026) */
function haceFalta(){if(!DEMO||S)return false;const x=lee();return !(x&&!(Date.now()-(x.t0||0)>VIEJA||x.vm!==K.VERSION))}
function hacer(a,quien){estado();const r=K.aplicar(S,cfg,a,quien,Date.now());if(r.ok){guarda();avisa()}return r}
function reiniciar(){S=muestra();S.v=Date.now();guarda();avisa()}
if(canal&&!SV)canal.onmessage=e=>{const d=e.data||{};if(d.S&&(!S||d.S.v>=S.v))S=d.S;avisa()};
if(!SV)g.addEventListener&&g.addEventListener('storage',e=>{if(e.key===CLAVE)avisa()});

/* ===================== CON SERVIDOR =====================
   Lo que sabe el aparato y lo que le falta por enviar lo lleva el espejo (oficio-espejo.js). Aquí está lo demás:
   la red, el reloj, lo que se guarda en el aparato y la sesión. */
const R=SV?(function(){
 const mem={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
 const leeJ=k=>{try{return JSON.parse(mem.get(k))}catch(e){return null}};
 const K_SES=CLAVE+':sesion',K_SRV=CLAVE+':srv',K_LLA=CLAVE+':llaves',K_ULT=CLAVE+':persona',K_REC=CLAVE+':rechazos',URLF=SV.url.replace(/\/+$/,'')+'/functions/v1/'+(SV.funcion||'oficio'),URLR=SV.url.replace(/\/+$/,'')+'/rest/v1/rpc/';
 const VACIO=K.nuevo(),FALLO={ok:false,err:'red'},rech=[],vistas={};
 let ses=null,E=null,vuela=false,fallos=0,sinRed=false,lleno=false,motivo='',entero=true,ultimo=Date.now(),tm=null,reglas='',datosMal=false;
 /* los datos del negocio que tiene el servidor (16-11-2026). Al entrar, la app manda la huella de los que ya tiene y, si
    no son los mismos, el servidor se los da: desde ese momento hace las cuentas con ellos (precios, horarios, el equipo) y
    no con el archivo público, que solo hace falta para pedir cita y elegir quién entra. Se guardan en el aparato para
    abrir sin red, y se quitan al salir. Si cambian en el servidor (lo dice su huella al leer o al mandar), se vuelven a pedir */
 const K_DAT=CLAVE+':datos',N0=JSON.parse(JSON.stringify(N));let hSrv='',pideDatos=0;
 /* ¿tiene la web donde se pide cita (este archivo, que es público) lo mismo que el servidor? Se mira la parte pública de
    los dos (K.publico: el archivo de una copia con servidor no lleva el equipo de dentro desde el 17-11-2026) en cuanto la
    app tiene los datos del servidor. Si no es lo mismo, lo que ve el cliente al pedir cita (precios, servicios, zonas) no
    es lo que tiene el servidor: se dice en «Tu sesión» */
 const pub=d=>typeof K.huellaDatos!=='function'?Promise.resolve(''):K.huellaDatos(typeof K.publico==='function'?K.publico(d):d).catch(()=>'');
 const miHuella=pub(N0);let cmp=0;
 function comparaCon(d){const n=++cmp;Promise.all([miHuella,pub(d)]).then(([m,h])=>{if(n!==cmp)return;const mal=!!m&&!!h&&m!==h;if(mal!==datosMal){datosMal=mal;avisa()}})}
 function ponDatos(d,sin){if(!d||typeof d!=='object'||Array.isArray(d)||d.id!==N.id||!Array.isArray(d.tecnicos))return false;
  const sv=N.servidor,tx=N.textos,x=Object.assign({},d);if(!sin){x.servidor=sv;if(x.textos===undefined&&tx!==undefined)x.textos=tx}
  let c;try{c=K.cfgDe(x)}catch(e){return false}   /* unos datos que no valen no se ponen: sigue con los que tenía */
  for(const k of Object.keys(N))delete N[k];Object.assign(N,x);for(const k of Object.keys(cfg))delete cfg[k];Object.assign(cfg,c);
  if(sin){cmp++;datosMal=false}else comparaCon(d);return true}
 {const x=leeJ(K_DAT);if(x&&typeof x.h==='string'&&ponDatos(x.d))hSrv=x.h}
 function datosDe(r){if(!r||typeof r.huella!=='string')return false;
  if(r.datos&&ponDatos(r.datos)){hSrv=r.huella;mem.set(K_DAT,JSON.stringify({h:r.huella,d:r.datos}));return true}
  /* sin datos: o ya los tenía o el servidor aún no los da (uno de antes del 16-11-2026). En los dos casos se queda con
     esa huella, para no pedirlos una y otra vez */
  if(!r.datos)hSrv=r.huella;
  return false}
 function vuelveArchivo(){mem.del(K_DAT);hSrv='';pideDatos=0;ponDatos(JSON.parse(JSON.stringify(N0)),true)}
 function mira(h){if(typeof h!=='string'||!h||h===hSrv||!ses||Date.now()-pideDatos<60000)return;pideDatos=Date.now();const yo=ses;
  juez({que:'entrar',negocio:N.id,persona:yo.persona,codigo:yo.codigo,huella:hSrv},20000).then(r=>{if(ses===yo&&r&&r.ok&&datosDe(r))avisa()}).catch(()=>{})}
 /* lo que el servidor no aceptó se queda apuntado en el aparato hasta que se lea: un aviso de unos segundos no basta */
 /* las fotos (16-11-2026): el aviso lleva la referencia de cada una («f:…») y la foto se pide al verla, a quien la puede ver.
    Quedan en memoria mientras la app está abierta. Mientras llega, un hueco del mismo tamaño; sin red, se pide otra vez luego.
    Con «web» (18-11-2026), la de un servicio de la web: la ve cualquiera, sin código, mientras el negocio la tenga puesta */
 const FOTOS=new Map(),PIDE=new Map(),VACIA='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
 function fotoSrc(x,cli){if(typeof x!=='string'||!x)return'';if(!K.esRef||!K.esRef(x))return x;if(FOTOS.has(x))return FOTOS.get(x);
  const t=PIDE.get(x);if(!t||Date.now()-t>30000){PIDE.set(x,Date.now());
   const p=cli==='web'?juez({que:'foto',negocio:N.id,ref:x,web:true},20000):cli&&cli.tel?juez({que:'foto',negocio:N.id,tel:cli.tel,codigo:cli.codigo,ref:x},20000):ses?juez(con({que:'foto',ref:x}),20000):null;
   if(p)p.then(r=>{if(r&&r.ok&&typeof r.datos==='string'&&K.esFoto(r.datos)){FOTOS.set(x,r.datos);PIDE.delete(x);avisa()}}).catch(()=>{})}
  return VACIA}
 const rechazos=()=>{const L=leeJ(K_REC);return Array.isArray(L)?L.filter(x=>x&&typeof x==='object'):[]};
 const apuntaRechazo=x=>{const L=rechazos();L.push({t:Date.now(),tipo:String(x.accion&&x.accion.tipo||''),id:String(x.accion&&x.accion.id||''),err:String(x.err||'')});mem.set(K_REC,JSON.stringify(L.slice(-30)))};
 const oculto=()=>typeof document!=='undefined'&&document.hidden;
 /* una llamada con límite de tiempo. Devuelve siempre un objeto: lo que conteste el servidor o {ok:false, err:'red'} */
 function llama(url,o,ms){const ctl=typeof AbortController==='function'?new AbortController():null,t=ctl?setTimeout(()=>ctl.abort(),ms||20000):0;
  return Promise.resolve().then(()=>fetch(url,Object.assign({signal:ctl?ctl.signal:undefined},o))).then(r=>r.ok?r.json():FALLO).then(x=>x&&typeof x==='object'?x:FALLO,()=>FALLO).then(x=>{clearTimeout(t);
   /* el servidor dice que algo se le ha roto: que lo apunte el vigía de fallos (js/oficio-vigia.js), sin nada de lo que se mandaba */
   if(x.err==='servidor'&&g.OficioVigia&&typeof g.OficioVigia.servidor==='function')try{g.OficioVigia.servidor(url,'servidor')}catch(e){}
   return x})}
 /* al juez (la función del servidor). El cuerpo va como texto: así el navegador no hace una llamada previa de permiso por cada una. */
 /* EL FRENO DEL APARATO (A5, 23-11-2026): cada llamada a la función cuenta en las 500.000 al mes del plan gratis, para
    todos los negocios juntos, y el freno del juez no la evita (ya se ha gastado al llegar). Un fallo que llame sin parar
    se para aquí: no más de 60 llamadas al juez por minuto ni 600 por hora desde este aparato (todas sus pestañas). Pasado
    el tope no sale nada y se contesta como sin red: lo pendiente se queda en el aparato y sale solo cuando hay sitio.
    La primera vez que frena en una hora, el vigía lo apunta (llega al buzón de fallos de OOOX). */
 const FRENO={min:60,hora:600},K_FRE=CLAVE+':freno';let frenoAvisado=0;
 function frena(){const ahora=Date.now();let L=leeJ(K_FRE);L=(Array.isArray(L)?L:[]).filter(t=>typeof t==='number'&&ahora-t<36e5&&t<=ahora+6e4);
  if(L.length>=FRENO.hora||L.filter(t=>ahora-t<6e4).length>=FRENO.min){
   if(ahora-frenoAvisado>36e5){frenoAvisado=ahora;try{g.OficioVigia&&g.OficioVigia.servidor&&g.OficioVigia.servidor(URLF,'freno del aparato')}catch(e){}}
   return true}
  L.push(ahora);mem.set(K_FRE,JSON.stringify(L));return false}
 const juez=(p,ms)=>frena()?Promise.resolve(FALLO):llama(URLF,{method:'POST',body:JSON.stringify(p)},ms);
 /* a la base de datos: solo «¿qué versión hay?» y lo que ve el cliente con su enlace. Estas llamadas no tienen límite. */
 const rpc=(fn,c)=>llama(URLR+fn,{method:'POST',headers:{apikey:SV.llave,'Content-Type':'application/json'},body:JSON.stringify(c)},12000);
 const con=p=>Object.assign({negocio:N.id,persona:ses.persona,codigo:ses.codigo},p);

 /* lo que queda escrito en el aparato: lo último que se vio y, sobre todo, lo que falta por enviar */
 function guardaSrv(){if(!E)return;const x=OE.junta(leeJ(K_SRV),E.guardado());
  lleno=!mem.set(K_SRV,JSON.stringify(x));
  if(lleno)lleno=!mem.set(K_SRV,JSON.stringify(Object.assign({},x,{B:Object.assign({},x.B,{v:0,avisos:[]}),ver:{}})));   /* si no cabe todo, al menos lo que falta por enviar */
  if(canal)try{canal.postMessage({srv:1,hechas:x.hechas.slice(-40)})}catch(e){}}
 const bien=()=>{fallos=0;if(sinRed){sinRed=false;avisa()}};
 const mal=()=>{fallos++;if(!sinRed&&fallos>=2){sinRed=true;avisa()}};
 /* cada cuánto se pregunta: cada 2 s con movimiento, más despacio si lleva rato sin cambiar nada, y cada vez más si falla la red */
 function ritmo(){const b=SV.cada>=200?SV.cada:2000;if(fallos)return Math.min(b*Math.pow(2,Math.min(fallos,5)),30000);const q=Date.now()-ultimo;return q<120000?b:q<600000?b*2:b*4}
 function programa(ms){clearTimeout(tm);if(ses)tm=setTimeout(ciclo,ms==null?ritmo():ms)}
 /* el código ya no vale: se vuelve a la pantalla de entrar. Lo que faltaba por enviar se queda guardado para cuando entre otra vez. */
 function fuera(err){if(err==='bloqueo'){motivo='bloqueo';fallos=Math.max(fallos,4);avisa();return}
  guardaSrv();ses=null;E=null;mem.del(K_SES);vuelveArchivo();motivo='clave';clearTimeout(tm);avisa()}
 /* Una vuelta: si hay algo por enviar, se manda lo primero; si no, se pregunta si hay algo nuevo. Nunca dos llamadas a la vez. */
 async function vuelta(yo){
  const p=E.siguiente();
  if(p){const res=await juez(con({que:'hacer',accion:p.accion,clave:p.clave,desde:p.desde,t:p.t,ya:Date.now()}),45000);if(ses!==yo)return;   /* t y ya: cuándo se hizo y qué hora es ahora, los dos con el reloj del aparato: el servidor mira cuánto hace */
   const x=E.respuesta(p.clave,res);if(res&&res.ok)mira(res.huella);
   if(x.tipo==='hecha'||x.tipo==='rechazada'){bien();motivo='';ultimo=Date.now();guardaSrv();
    if(x.tipo==='rechazada'&&!x.crea){apuntaRechazo(x);rech.forEach(f=>{try{f({accion:x.accion,err:x.err})}catch(e){console.error(e)}})}
    avisa()}
   else if(x.tipo==='sesion')fuera(x.err);
   else{mal();if(x.crea){guardaSrv();avisa()}}
   return}
  if(oculto()&&!entero)return;   /* con la app en segundo plano no se pregunta; lo pendiente sí se manda */
  const r=entero?{ok:true,v:-1}:await rpc('oficios_v',{p_negocio:N.id,p_persona:yo.persona,p_codigo:yo.codigo});if(ses!==yo)return;
  if(!r.ok){if(r.err==='clave'||r.err==='bloqueo')fuera(r.err);else mal();return}
  if(r.v===E.v()){bien();if(motivo==='bloqueo'){motivo='';avisa()}return}
  const l=await juez(con({que:'leer',desde:entero?0:E.v()}),45000);if(ses!==yo)return;
  if(l.ok){entero=false;bien();motivo='';mira(l.huella);if(E.llega(l.cambios)){ultimo=Date.now();guardaSrv();avisa()}}
  else if(l.err==='clave'||l.err==='bloqueo')fuera(l.err);else mal()}
 async function ciclo(){
  if(!ses||!E||vuela)return;vuela=true;const yo=ses;
  try{await vuelta(yo)}catch(e){console.error(e);mal()}finally{vuela=false}
  /* enseguida otra vez si ha cambiado la sesión o queda cola y la red va; si no, a su ritmo */
  programa(ses!==yo||(E&&E.enCola()>0&&!fallos)?0:null)}
 function abre(s){ses=s;E=OE.crea({K,cfg,quien:{rol:s.rol,id:s.id}});E.carga(leeJ(K_SRV));entero=true;fallos=0;sinRed=false;motivo='';ultimo=Date.now()}
 /* un código tecleado con mayúsculas, espacios o sin guiones vale igual */
 const limpia=c=>{c=String(c||'').trim().toLowerCase();const x=c.replace(/[^a-z0-9]/g,'');return x.length===16?x.match(/.{4}/g).join('-'):c};
 async function entrar(persona,codigo){persona=String(persona||'').trim().toLowerCase();codigo=limpia(codigo);
  if(!persona||codigo.length<8)return{ok:false,err:'clave'};
  const r=await juez({que:'entrar',negocio:N.id,persona,codigo,huella:hSrv});
  if(!r.ok)return{ok:false,err:r.err||'red'};datosDe(r);
  if((r.rol!=='centralita'&&r.rol!=='tecnico')||(r.rol==='tecnico'&&!cfg.tec[r.id]))return{ok:false,err:'datos'};
  const antes=leeJ(K_SRV);if(antes&&antes.quien&&(antes.quien.rol!==r.rol||antes.quien.id!==r.id)){mem.del(K_SRV);mem.del(K_REC)}   /* lo guardado era de otra persona */
  abre({persona,codigo,rol:r.rol,id:r.rol==='centralita'?'oficina':r.id});mem.set(K_SES,JSON.stringify(ses));mem.set(K_ULT,persona);   /* quién entró la última vez en este aparato: para no tener que elegirlo otra vez */
  await ciclo();miraReglas();avisa();return{ok:true,rol:ses.rol,id:ses.id}}
 function salir(){ses=null;E=null;motivo='';clearTimeout(tm);mem.del(K_SES);mem.del(K_SRV);mem.del(K_REC);vuelveArchivo();avisa()}
 /* ¿lleva el servidor las mismas reglas que esta app? Si no, se dice en el menú: evita perseguir fallos que no lo son. */
 function miraReglas(){if(frena())return;llama(URLF,{method:'GET'},12000).then(x=>{const v=x&&x.oficio&&x.oficio.reglas;if(typeof v==='string'&&v!==reglas){reglas=v;if(v!==K.VERSION)avisa()}})}

 /* la misma creación repetida en diez minutos lleva la misma marca: si la primera llegó y su respuesta se perdió, no se crea dos veces */
 const marcas=new Map();
 function marcaDe(a){const k=JSON.stringify(a),t=Date.now();marcas.forEach((m,x)=>{if(t-m.t>600000)marcas.delete(x)});let m=marcas.get(k);if(!m){m={clave:OE.marcaNueva(),t};marcas.set(k,m)}return m.clave}
 const olvida=a=>marcas.delete(JSON.stringify(a));
 function hacerS(a){if(!E)return{ok:false,err:'sesion'};const r=E.hacer(a);if(r.ok){guardaSrv();avisa();programa(0)}return r}
 /* crear un aviso o una ausencia con la sesión abierta: espera al servidor. Si en 25 s no ha podido ni salir, se retira. */
 function crearS(a){if(!E)return Promise.resolve({ok:false,err:'sesion'});
  const clave=marcaDe(a),miE=E,p=miE.crear(a,clave);programa(0);const t=setTimeout(()=>{miE.quita(clave)},25000);
  return p.then(r=>{clearTimeout(t);if(r.ok||!r.duda)olvida(a);return r})}
 /* pedir cita desde la web, sin sesión. Los datos se miran aquí primero; si hay hueco lo dice el servidor. */
 async function pedirWeb(a){
  const r0=K.aplicar(K.nuevo(),cfg,JSON.parse(JSON.stringify(a)),{rol:'cliente'},Date.now());
  if(!r0.ok&&r0.err!=='franja')return r0;
  const r=await juez({que:'pedir',negocio:N.id,accion:a,clave:marcaDe(a)},45000);
  if(r.ok&&typeof r.id==='string'){olvida(a);ponLlave(r.id,r.llave);return{ok:true,id:r.id}}
  if(!['red','lleno','servidor'].includes(r.err))olvida(a);
  return{ok:false,err:r.err||'red'}}
 const huecos=q=>juez(Object.assign({que:'huecos',negocio:N.id},q&&typeof q==='object'?{av:typeof q.av==='string'?q.av:'',dis:typeof q.dis==='string'?q.dis:''}:{}),15000);   // con su avería y su barrio, los huecos y el tiempo de llegada son los de ese trabajo
 /* la zona del cliente: entra con su teléfono y el código que le mandó la oficina, y el servidor le da solo lo suyo */
 const perfil=(tel,codigo)=>juez({que:'perfil',negocio:N.id,tel,codigo},20000);
 /* y desde su zona, cambiar o cancelar su cita (19-11-2026): contesta con su perfil ya al día */
 const zona=(tel,codigo,accion)=>juez({que:'zona',negocio:N.id,tel,codigo,accion,clave:marcaDe(accion)},20000);
 /* la oficina: el código de la zona de un cliente, el que ya tiene o uno nuevo si se pide cambiarlo */
 const acceso=(tel,cambia)=>ses?juez(con({que:'acceso',tel,cambia:cambia===true}),20000):Promise.resolve({ok:false,err:'sesion'});
 /* el equipo y sus accesos (la oficina o el dueño): quién puede entrar, un código nuevo o quitar el acceso. Si el código
    nuevo es el de quien lo pide, este aparato se lo guarda: así no se queda fuera */
 async function equipo(hace,a){if(!ses)return{ok:false,err:'sesion'};const yo=ses;
  const r=await juez(con(hace?{que:'equipo',hace,a}:{que:'equipo'}),20000);
  if(r.ok&&r.tuyo===true&&typeof r.codigo==='string'&&ses===yo){ses=Object.assign({},ses,{codigo:r.codigo});mem.set(K_SES,JSON.stringify(ses))}
  else if(!r.ok&&(r.err==='clave'||r.err==='bloqueo')&&ses===yo)fuera(r.err);
  return r}
 /* lo que ve el cliente de su aviso: hace falta la llave de su enlace, que se guarda en su navegador */
 const llaveDe=id=>{const L=leeJ(K_LLA);return L&&typeof L[id]==='string'?L[id]:''};
 function ponLlave(id,llave){if(typeof id!=='string'||typeof llave!=='string'||llave.length<20||llave.length>80)return;const L=leeJ(K_LLA)||{};if(L[id]===llave)return;L[id]=llave;mem.set(K_LLA,JSON.stringify(L));delete vistas[id]}
 const vista=id=>vistas[id];   /* nada (aún no se ha preguntado), {v: lo que ve} o {err} */
 function miraVista(id){const ll=llaveDe(id);if(!ll){const x=vistas[id];vistas[id]={err:'enlace'};if(!x||x.err!=='enlace')avisa();return Promise.resolve(vistas[id])}
  return rpc('oficios_vista',{p_negocio:N.id,p_aviso:id,p_llave:ll}).then(r=>{const antes=JSON.stringify(vistas[id]||null);
   if(r.ok&&r.vista)vistas[id]={v:r.vista};else if(r.err==='enlace')vistas[id]={err:'enlace'};else vistas[id]=Object.assign({},vistas[id]&&vistas[id].v?{v:vistas[id].v}:{},{err:'red'});
   if(JSON.stringify(vistas[id])!==antes)avisa();return vistas[id]})}

 /* otras pestañas de este navegador: lo que una envía, las demás lo quitan de su cola y preguntan enseguida */
 if(canal)canal.onmessage=e=>{const d=e.data||{};if(d.srv&&E){if(E.yaHechas(d.hechas))avisa();programa(0)}};
 if(g.addEventListener){
  g.addEventListener('storage',e=>{if(e.key!==K_SES)return;const s=leeJ(K_SES);
   if(!s&&ses){ses=null;E=null;clearTimeout(tm);avisa()}else if(s&&(!ses||s.persona!==ses.persona||s.codigo!==ses.codigo)){abre(s);avisa();programa(0)}});
  g.addEventListener('online',()=>programa(0));
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden)programa(0)})}
 /* al abrir: si este aparato ya había entrado, se ve lo último guardado y se pide todo de nuevo */
 {const s=leeJ(K_SES);if(s&&typeof s.persona==='string'&&typeof s.codigo==='string'&&(s.rol==='centralita'||(s.rol==='tecnico'&&cfg.tec[s.id]))){abre(s);programa(0);miraReglas()}else if(s)mem.del(K_SES)}

 return{estado:()=>E?E.estado():VACIO,hacer:hacerS,crear:(a,q)=>q&&q.rol==='cliente'?pedirWeb(a):crearS(a),
  sesion:()=>ses?{rol:ses.rol,id:ses.id,persona:ses.persona}:null,ultima:()=>mem.get(K_ULT)||'',entrar,salir,huecos,vista,miraVista,llaveDe,ponLlave,perfil,zona,acceso,equipo,
  alRechazar:f=>{rech.push(f)},fotoSrc,rechazos,olvidaRechazos:()=>{mem.del(K_REC);avisa()},
  red:()=>({cola:E?E.pendientes():0,sinRed,lleno,motivo,reglas:reglas&&reglas!==K.VERSION?reglas:'',datos:datosMal,rech:rechazos().length,listo:!!E&&!entero})}   /* listo: ya ha leído entero lo del servidor */
})():null;

/* una foto del móvil, reducida para que quepa: 720 px de lado mayor */
function foto(archivo){return new Promise((si,no)=>{if(!archivo||!/^image\//.test(archivo.type))return no(new Error('tipo'));
 const u=URL.createObjectURL(archivo),im=new Image();
 im.onload=()=>{const k=Math.min(1,720/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);let q=.66,d=c.toDataURL('image/jpeg',q);while(d.length>130000&&q>.3){q-=.12;d=c.toDataURL('image/jpeg',q)}si(d)};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('imagen'))};im.src=u})}

/* la firma con el dedo: devuelve el trazo como ruta, en una caja de 300 × 110 */
function firma(lienzo,alCambiar){const cx=lienzo.getContext('2d');let trazos=[],act=null,largo=0,W=0,H=0;
 /* el tamaño con el que se firmó: en una hoja paso a paso, al guardar el lienzo puede estar escondido (sin tamaño) */
 const tam=()=>{const r=lienzo.getBoundingClientRect();if(r.width&&r.height){W=r.width;H=r.height}return[W,H]};
 const medir=()=>{const r=lienzo.getBoundingClientRect(),k=g.devicePixelRatio||1;if(!r.width||!r.height)return;lienzo.width=Math.round(r.width*k);lienzo.height=Math.round(r.height*k);cx.setTransform(k,0,0,k,0,0);tam();pinta()};
 const pinta=()=>{const r=lienzo.getBoundingClientRect();cx.clearRect(0,0,r.width,r.height);cx.lineWidth=2.4;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle='#17191b';
  trazos.forEach(t=>{cx.beginPath();t.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));if(t.length===1)cx.lineTo(t[0][0]+.1,t[0][1]);cx.stroke()})};
 const pt=e=>{const r=lienzo.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 lienzo.addEventListener('pointerdown',e=>{e.preventDefault();try{lienzo.setPointerCapture(e.pointerId)}catch(x){}tam();act=[pt(e)];trazos.push(act);pinta()});
 lienzo.addEventListener('pointermove',e=>{if(!act)return;const p=pt(e),u=act[act.length-1],d=Math.hypot(p[0]-u[0],p[1]-u[1]);if(d<2)return;largo+=d;act.push(p);pinta()});
 const suelta=()=>{if(act){act=null;alCambiar&&alCambiar()}};
 lienzo.addEventListener('pointerup',suelta);lienzo.addEventListener('pointercancel',suelta);
 lienzo.style.touchAction='none';medir();
 return{vacia:()=>largo<60,borrar(){trazos=[];largo=0;pinta();alCambiar&&alCambiar()},medir,
  ruta(){const[w,h]=tam();if(!w||!h)return'';const kx=300/w,ky=110/h;
   return trazos.map(t=>t.filter((p,i)=>i%2===0||i===t.length-1).map((p,i)=>(i?'L':'M')+Math.round(p[0]*kx)+' '+Math.round(p[1]*ky)).join('')).join('')}}}
/* la firma dibujada; en la zona del cliente, su nombre en el idioma del cliente (js/oficio-idioma.js) */
const _=s=>g.OficioIdioma?g.OficioIdioma.T(s):s;
const firmaSvg=d=>'<svg viewBox="0 0 300 110" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="'+_('Firma')+'"><path d="'+String(d).replace(/[^MLC0-9 .-]/g,'')+'"/></svg>';

/* Lo que usan las pantallas. «crear» es para lo que tiene número propio (un aviso, una ausencia): devuelve una promesa,
   porque con servidor el número lo pone él. Sin servidor contesta al momento, igual que «hacer». */
g.Oficio=R?{K,N,cfg,DEMO,SRV:true,estado:R.estado,hacer:R.hacer,crear:R.crear,reiniciar(){},suscribir:f=>{subs.push(f)},foto,firma,firmaSvg,
  sesion:R.sesion,ultima:R.ultima,entrar:R.entrar,salir:R.salir,red:R.red,alRechazar:R.alRechazar,fotoSrc:R.fotoSrc,rechazos:R.rechazos,olvidaRechazos:R.olvidaRechazos,huecos:R.huecos,vista:R.vista,miraVista:R.miraVista,llaveDe:R.llaveDe,ponLlave:R.ponLlave,perfil:R.perfil,zona:R.zona,acceso:R.acceso,equipo:R.equipo}
 :{K,N,cfg,DEMO,SRV:false,estado,haceFalta,hacer,crear:(a,q)=>Promise.resolve(hacer(a,q)),reiniciar,suscribir:f=>{subs.push(f)},foto,firma,firmaSvg,
  /* sin servidor (la demo), la zona del cliente cambia su cita aquí mismo, con su teléfono */
  zona:(tel,codigo,a)=>Promise.resolve(hacer(a,{rol:'cliente',id:K.tel9(tel)})),
  sesion:()=>null,red:()=>null,alRechazar(){},fotoSrc:x=>typeof x==='string'?x:'',rechazos:()=>[],olvidaRechazos(){}};
/* Una copia de prueba (prueba:true en los datos del negocio) lo dice arriba en todas sus pantallas: así nadie la toma por un
   negocio en marcha. Va con sus colores puestos aquí para no depender de la hoja de estilos de cada página.
   En la cita y en la zona del cliente, en su idioma (js/oficio-idioma.js); en la oficina, en castellano. */
if(N.prueba===true&&typeof document!=='undefined'&&document.body&&!document.getElementById('prb')){const p=document.createElement('p');p.id='prb';
 p.textContent=_('Copia de prueba de OOOX Oficios. Este negocio aún no está en marcha:')+' '+(R?_('lo que hagas aquí se guarda en el servidor de pruebas, no llega a ningún cliente.'):_('lo que hagas aquí se queda en este navegador.'));
 p.style.cssText='margin:0;padding:7px 16px;background:#3a2f0a;color:#ffd34d;font:500 .8125rem/1.35 system-ui,sans-serif;text-align:center';document.body.prepend(p)}
if(typeof document!=='undefined')avisoMuestra(g,MUESTRA);
})(window);
