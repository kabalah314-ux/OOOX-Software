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
   ve «urgente sin asignar, hace 20 h», que da mala imagen del negocio. Lo que se haya probado se pierde. */
const VIEJA=8*3600*1000;
/* Solo la demo lleva avisos de muestra. La copia de un negocio de verdad no trae OFICIO_MUESTRA:
   arranca vacía y sus datos no se rehacen nunca. */
const DEMO=!SV&&typeof g.OFICIO_MUESTRA==='function';
function muestra(){const x=DEMO?g.OFICIO_MUESTRA(K,cfg,Date.now()):K.nuevo();x.t0=Date.now();return x}
function estado(){const x=lee();
 if(x&&!(DEMO&&Date.now()-(x.t0||0)>VIEJA))S=x;
 else if(x){S=muestra();S.v=Math.max(Date.now(),(x.v||0)+1);guarda()}
 else if(!S){S=muestra();guarda()}
 return S}
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
 const K_SES=CLAVE+':sesion',K_SRV=CLAVE+':srv',K_LLA=CLAVE+':llaves',K_ULT=CLAVE+':persona',URLF=SV.url.replace(/\/+$/,'')+'/functions/v1/'+(SV.funcion||'oficio'),URLR=SV.url.replace(/\/+$/,'')+'/rest/v1/rpc/';
 const VACIO=K.nuevo(),FALLO={ok:false,err:'red'},rech=[],vistas={};
 let ses=null,E=null,vuela=false,fallos=0,sinRed=false,lleno=false,motivo='',entero=true,ultimo=Date.now(),tm=null,reglas='';
 const oculto=()=>typeof document!=='undefined'&&document.hidden;
 /* una llamada con límite de tiempo. Devuelve siempre un objeto: lo que conteste el servidor o {ok:false, err:'red'} */
 function llama(url,o,ms){const ctl=typeof AbortController==='function'?new AbortController():null,t=ctl?setTimeout(()=>ctl.abort(),ms||20000):0;
  return Promise.resolve().then(()=>fetch(url,Object.assign({signal:ctl?ctl.signal:undefined},o))).then(r=>r.ok?r.json():FALLO).then(x=>x&&typeof x==='object'?x:FALLO,()=>FALLO).then(x=>{clearTimeout(t);return x})}
 /* al juez (la función del servidor). El cuerpo va como texto: así el navegador no hace una llamada previa de permiso por cada una. */
 const juez=(p,ms)=>llama(URLF,{method:'POST',body:JSON.stringify(p)},ms);
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
  guardaSrv();ses=null;E=null;mem.del(K_SES);motivo='clave';clearTimeout(tm);avisa()}
 /* Una vuelta: si hay algo por enviar, se manda lo primero; si no, se pregunta si hay algo nuevo. Nunca dos llamadas a la vez. */
 async function vuelta(yo){
  const p=E.siguiente();
  if(p){const res=await juez(con({que:'hacer',accion:p.accion,clave:p.clave,desde:p.desde}),45000);if(ses!==yo)return;
   const x=E.respuesta(p.clave,res);
   if(x.tipo==='hecha'||x.tipo==='rechazada'){bien();motivo='';ultimo=Date.now();guardaSrv();
    if(x.tipo==='rechazada'&&!x.crea)rech.forEach(f=>{try{f({accion:x.accion,err:x.err})}catch(e){console.error(e)}});
    avisa()}
   else if(x.tipo==='sesion')fuera(x.err);
   else{mal();if(x.crea){guardaSrv();avisa()}}
   return}
  if(oculto()&&!entero)return;   /* con la app en segundo plano no se pregunta; lo pendiente sí se manda */
  const r=entero?{ok:true,v:-1}:await rpc('oficios_v',{p_negocio:N.id,p_persona:yo.persona,p_codigo:yo.codigo});if(ses!==yo)return;
  if(!r.ok){if(r.err==='clave'||r.err==='bloqueo')fuera(r.err);else mal();return}
  if(r.v===E.v()){bien();if(motivo==='bloqueo'){motivo='';avisa()}return}
  const l=await juez(con({que:'leer',desde:entero?0:E.v()}),45000);if(ses!==yo)return;
  if(l.ok){entero=false;bien();motivo='';if(E.llega(l.cambios)){ultimo=Date.now();guardaSrv();avisa()}}
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
  const r=await juez({que:'entrar',negocio:N.id,persona,codigo});
  if(!r.ok)return{ok:false,err:r.err||'red'};
  if((r.rol!=='centralita'&&r.rol!=='tecnico')||(r.rol==='tecnico'&&!cfg.tec[r.id]))return{ok:false,err:'datos'};
  const antes=leeJ(K_SRV);if(antes&&antes.quien&&(antes.quien.rol!==r.rol||antes.quien.id!==r.id))mem.del(K_SRV);   /* lo guardado era de otra persona */
  abre({persona,codigo,rol:r.rol,id:r.rol==='centralita'?'oficina':r.id});mem.set(K_SES,JSON.stringify(ses));mem.set(K_ULT,persona);   /* quién entró la última vez en este aparato: para no tener que elegirlo otra vez */
  await ciclo();miraReglas();avisa();return{ok:true,rol:ses.rol,id:ses.id}}
 function salir(){ses=null;E=null;motivo='';clearTimeout(tm);mem.del(K_SES);mem.del(K_SRV);avisa()}
 /* ¿lleva el servidor las mismas reglas que esta app? Si no, se dice en el menú: evita perseguir fallos que no lo son. */
 function miraReglas(){llama(URLF,{method:'GET'},12000).then(x=>{const v=x&&x.oficio&&x.oficio.reglas;if(typeof v==='string'&&v!==reglas){reglas=v;if(v!==K.VERSION)avisa()}})}

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
 const huecos=()=>juez({que:'huecos',negocio:N.id},15000);
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
  sesion:()=>ses?{rol:ses.rol,id:ses.id,persona:ses.persona}:null,ultima:()=>mem.get(K_ULT)||'',entrar,salir,huecos,vista,miraVista,llaveDe,ponLlave,
  alRechazar:f=>{rech.push(f)},
  red:()=>({cola:E?E.pendientes():0,sinRed,lleno,motivo,reglas:reglas&&reglas!==K.VERSION?reglas:''})}
})():null;

/* una foto del móvil, reducida para que quepa: 720 px de lado mayor */
function foto(archivo){return new Promise((si,no)=>{if(!archivo||!/^image\//.test(archivo.type))return no(new Error('tipo'));
 const u=URL.createObjectURL(archivo),im=new Image();
 im.onload=()=>{const k=Math.min(1,720/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);let q=.66,d=c.toDataURL('image/jpeg',q);while(d.length>130000&&q>.3){q-=.12;d=c.toDataURL('image/jpeg',q)}si(d)};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('imagen'))};im.src=u})}

/* la firma con el dedo: devuelve el trazo como ruta, en una caja de 300 × 110 */
function firma(lienzo,alCambiar){const cx=lienzo.getContext('2d');let trazos=[],act=null,largo=0;
 const medir=()=>{const r=lienzo.getBoundingClientRect(),k=g.devicePixelRatio||1;lienzo.width=Math.round(r.width*k);lienzo.height=Math.round(r.height*k);cx.setTransform(k,0,0,k,0,0);pinta()};
 const pinta=()=>{const r=lienzo.getBoundingClientRect();cx.clearRect(0,0,r.width,r.height);cx.lineWidth=2.4;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle='#17191b';
  trazos.forEach(t=>{cx.beginPath();t.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));if(t.length===1)cx.lineTo(t[0][0]+.1,t[0][1]);cx.stroke()})};
 const pt=e=>{const r=lienzo.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 lienzo.addEventListener('pointerdown',e=>{e.preventDefault();try{lienzo.setPointerCapture(e.pointerId)}catch(x){}act=[pt(e)];trazos.push(act);pinta()});
 lienzo.addEventListener('pointermove',e=>{if(!act)return;const p=pt(e),u=act[act.length-1],d=Math.hypot(p[0]-u[0],p[1]-u[1]);if(d<2)return;largo+=d;act.push(p);pinta()});
 const suelta=()=>{if(act){act=null;alCambiar&&alCambiar()}};
 lienzo.addEventListener('pointerup',suelta);lienzo.addEventListener('pointercancel',suelta);
 lienzo.style.touchAction='none';medir();
 return{vacia:()=>largo<60,borrar(){trazos=[];largo=0;pinta();alCambiar&&alCambiar()},medir,
  ruta(){const r=lienzo.getBoundingClientRect(),kx=300/r.width,ky=110/r.height;
   return trazos.map(t=>t.filter((p,i)=>i%2===0||i===t.length-1).map((p,i)=>(i?'L':'M')+Math.round(p[0]*kx)+' '+Math.round(p[1]*ky)).join('')).join('')}}}
const firmaSvg=d=>'<svg viewBox="0 0 300 110" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Firma"><path d="'+String(d).replace(/[^MLC0-9 .-]/g,'')+'"/></svg>';

/* Lo que usan las pantallas. «crear» es para lo que tiene número propio (un aviso, una ausencia): devuelve una promesa,
   porque con servidor el número lo pone él. Sin servidor contesta al momento, igual que «hacer». */
g.Oficio=R?{K,N,cfg,DEMO,SRV:true,estado:R.estado,hacer:R.hacer,crear:R.crear,reiniciar(){},suscribir:f=>{subs.push(f)},foto,firma,firmaSvg,
  sesion:R.sesion,ultima:R.ultima,entrar:R.entrar,salir:R.salir,red:R.red,alRechazar:R.alRechazar,huecos:R.huecos,vista:R.vista,miraVista:R.miraVista,llaveDe:R.llaveDe,ponLlave:R.ponLlave}
 :{K,N,cfg,DEMO,SRV:false,estado,hacer,crear:(a,q)=>Promise.resolve(hacer(a,q)),reiniciar,suscribir:f=>{subs.push(f)},foto,firma,firmaSvg,
  sesion:()=>null,red:()=>null,alRechazar(){}};
/* Una copia de prueba (prueba:true en los datos del negocio) lo dice arriba en todas sus pantallas: así nadie la toma por un
   negocio en marcha. Va con sus colores puestos aquí para no depender de la hoja de estilos de cada página. */
if(N.prueba===true&&typeof document!=='undefined'&&document.body&&!document.getElementById('prb')){const p=document.createElement('p');p.id='prb';
 p.textContent='Copia de prueba de OOOX Oficios. Este negocio aún no está en marcha: '+(R?'lo que hagas aquí se guarda en el servidor de pruebas, no llega a ningún cliente.':'lo que hagas aquí se queda en este navegador.');
 p.style.cssText='margin:0;padding:7px 16px;background:#3a2f0a;color:#ffd34d;font:500 .8125rem/1.35 system-ui,sans-serif;text-align:center';document.body.prepend(p)}
})(window);
