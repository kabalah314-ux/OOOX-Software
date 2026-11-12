/* ============================================================
   NÚCLEO DE LA SALA · las reglas del pedido en mesa.
   Este mismo archivo corre en el navegador (demo sin servidor) y en el
   servidor (Cloudflare Worker), así las reglas son las mismas en los dos sitios.

   Recorrido de una mesa:  libre → pide → abierta → cuenta → libre
   - El primer pedido de una mesa lo acepta el camarero. Al aceptarlo la mesa
     se abre, recibe un código de 4 cifras y la comanda sale a cocina y a barra.
   - Quien llega después entra con el código y pide a la misma cuenta.
   - Los precios y los nombres los pone siempre este archivo a partir de la
     carta; lo que manda el móvil del cliente son solo ids y cantidades.
   ============================================================ */
(function(g){
'use strict';
const DIA=t=>{const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const ORDEN=['nuevo','marcha','listo','servido'];

function nuevo(t){return{v:0,np:0,n:0,ns:0,na:0,nl:0,dia:DIA(t||Date.now()),mesas:{},pedidos:[],avisos:[],agotados:[],cerradas:[],fallos:{},llamadas:[]}}
const TIPOS=['info','pedido','encargo','reserva','recado','proveedor','queja'];

/* de data/negocio.js, lo que la sala necesita saber */
function cfgDe(N){const est={},C=N.carta||{};
 Object.entries(C.estaciones||{}).forEach(([e,secs])=>secs.forEach(s=>{est[s]=e}));
 const P={};(C.productos||[]).forEach(d=>{P[d.id]={n:d.name,pr:d.price,o:d.price.length>1?(d.opts||C.opciones||['A','B']):null,est:d.est||est[d.sec]||'barra',sec:d.sec}});
 const s=N.sala||{};return{mesas:s.mesas||8,aceptar:s.aceptar||'primera',P}}

function lineas(S,cfg,l){const out=[];(Array.isArray(l)?l:[]).slice(0,40).forEach(x=>{const d=x&&cfg.P[x.p];if(!d||S.agotados.includes(x.p))return;
 const q=Math.max(1,Math.min(20,x.q|0)),oi=d.pr.length>1?Math.max(0,Math.min(d.pr.length-1,x.o|0)):0;
 out.push({p:x.p,n:d.n,o:d.o?d.o[oi]:null,q,pr:d.pr[oi],est:d.est})});return out}
function codigo(S){let c;do{c=String(1000+Math.floor(Math.random()*9000))}while(Object.values(S.mesas).some(m=>m.cod===c));return c}
const abierta=m=>!!m&&(m.e==='abierta'||m.e==='cuenta');
function abrir(S,mesa,t){const m=S.mesas[mesa]||(S.mesas[mesa]={e:'libre',disp:[]});if(abierta(m))return m;
 m.e='abierta';m.cod=codigo(S);m.ses=++S.ns;m.t0=t;m.disp=[];delete m.ult;return m}
function tickets(S,p,t){p.tk={};p.l.forEach(x=>{if(!p.tk[x.est])p.tk[x.est]={n:++S.n,e:'nuevo',t0:t}})}
function reabrir(S,m,mesa){if(m.e==='cuenta'){m.e='abierta';S.avisos.forEach(x=>{if(x.mesa===mesa&&x.tipo==='cuenta')x.ok=true})}}

/* aplica una acción. actor = {rol:'cliente'|'sala', disp:'id del móvil'}. Devuelve {ok} o {error} */
function aplicar(S,cfg,a,actor,t){t=t||Date.now();a=a||{};actor=actor||{};
 const sala=actor.rol==='sala',disp=String(actor.disp||'').slice(0,40);
 S.llamadas=S.llamadas||[];S.nl=S.nl||0;
 /* al cambiar de día se limpia la sala, pero las llamadas se conservan (el dueño las repasa al día siguiente) */
 if(S.dia!==DIA(t)&&!Object.values(S.mesas).some(abierta)){const v=S.v,ll=S.llamadas,nl=S.nl;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,nuevo(t));S.v=v;S.llamadas=ll;S.nl=nl}
 const mesaOk=n=>Number.isInteger(n)&&n>=1&&n<=cfg.mesas;
 const M=n=>S.mesas[n]||(S.mesas[n]={e:'libre',disp:[]});
 const soloSala=()=>sala?null:{error:'permiso'};
 const r={ok:true};let e;
 switch(a.tipo){
  case'pedir':{if(!mesaOk(a.mesa))return{error:'mesa'};const m=M(a.mesa),l=lineas(S,cfg,a.l);if(!l.length)return{error:'vacio'};
   const ab=abierta(m),mi=ab&&m.disp.includes(disp);if(ab&&!mi)return{error:'codigo'};
   const directo=mi&&cfg.aceptar!=='todas',p={id:++S.np,mesa:a.mesa,ses:ab?m.ses:0,e:directo?'aceptado':'pendiente',t,disp,l};
   if(directo){tickets(S,p,t);reabrir(S,m,a.mesa)}else if(!ab)m.e='pide';
   S.pedidos.push(p);r.id=p.id;break}
  case'unirse':{if(!mesaOk(a.mesa))return{error:'mesa'};const m=M(a.mesa);if(!abierta(m))return{error:'cerrada'};
   const f=S.fallos[disp]||(S.fallos[disp]={n:0,t:0});if(t-f.t>300000)f.n=0;if(f.n>=5)return{error:'bloqueado'};
   if(String(a.cod)!==m.cod){f.n++;f.t=t;S.v++;return{error:'codigo'}}
   delete S.fallos[disp];if(!m.disp.includes(disp))m.disp.push(disp);break}
  case'avisar':{if(!mesaOk(a.mesa))return{error:'mesa'};const m=M(a.mesa),mi=abierta(m)&&m.disp.includes(disp),que=a.que==='cuenta'?'cuenta':'camarero';
   if(abierta(m)&&!mi)return{error:'codigo'};if(que==='cuenta'){if(!mi)return{error:'codigo'};m.e='cuenta'}
   if(!S.avisos.some(x=>!x.ok&&x.mesa===a.mesa&&x.tipo===que))S.avisos.push({id:++S.na,mesa:a.mesa,tipo:que,t,ok:false});break}
  case'aceptar':{if((e=soloSala()))return e;const p=S.pedidos.find(x=>x.id===a.id);if(!p||p.e!=='pendiente')return{error:'pedido'};
   p.l=p.l.filter(x=>!S.agotados.includes(x.p));const m0=M(p.mesa);
   if(!p.l.length){p.e='rechazado';if(m0.e==='pide'&&!S.pedidos.some(x=>x.mesa===p.mesa&&x.e==='pendiente'))m0.e='libre';r.error='agotado';break}
   const m=abrir(S,p.mesa,t);p.ses=m.ses;p.e='aceptado';if(p.disp&&!m.disp.includes(p.disp))m.disp.push(p.disp);tickets(S,p,t);reabrir(S,m,p.mesa);break}
  case'rechazar':{if((e=soloSala()))return e;const p=S.pedidos.find(x=>x.id===a.id);if(!p||p.e!=='pendiente')return{error:'pedido'};
   p.e='rechazado';const m=M(p.mesa);if(m.e==='pide'&&!S.pedidos.some(x=>x.mesa===p.mesa&&x.e==='pendiente'))m.e='libre';break}
  case'ticket':{if((e=soloSala()))return e;const p=S.pedidos.find(x=>x.id===a.id),k=p&&p.tk&&p.tk[a.est];if(!k)return{error:'ticket'};
   if(!ORDEN.includes(a.e))return{error:'estado'};k.e=a.e;if(a.e==='marcha'&&!k.t1)k.t1=t;if(a.e==='listo'){k.t1=k.t1||t;k.t2=t}if(a.e==='servido')k.t3=t;break}
  case'agotar':{if((e=soloSala()))return e;if(!cfg.P[a.p])return{error:'producto'};const i=S.agotados.indexOf(a.p);
   if(a.on&&i<0)S.agotados.push(a.p);if(!a.on&&i>=0)S.agotados.splice(i,1);break}
  case'atender':{if((e=soloSala()))return e;const x=S.avisos.find(x=>x.id===a.id);if(!x)return{error:'aviso'};x.ok=true;break}
  case'abrir':{if((e=soloSala()))return e;if(!mesaOk(a.mesa))return{error:'mesa'};abrir(S,a.mesa,t);break}
  case'nota':{if((e=soloSala()))return e;if(!mesaOk(a.mesa))return{error:'mesa'};const l=lineas(S,cfg,a.l);if(!l.length)return{error:'vacio'};
   const m=abrir(S,a.mesa,t),p={id:++S.np,mesa:a.mesa,ses:m.ses,e:'aceptado',t,disp:'',l};tickets(S,p,t);reabrir(S,m,a.mesa);S.pedidos.push(p);r.id=p.id;break}
  case'cerrar':{if((e=soloSala()))return e;const m=S.mesas[a.mesa];if(!m||m.e==='libre')return{error:'mesa'};const l=[];
   S.pedidos.forEach(p=>{if(p.mesa!==a.mesa)return;if(p.e==='pendiente'){p.e='rechazado';return}
    if(p.e==='aceptado'&&p.ses===m.ses){p.l.forEach(x=>l.push(x));Object.values(p.tk||{}).forEach(k=>{if(k.e!=='servido'){k.e='servido';k.t3=t}})}});
   if(l.length)S.cerradas.push({mesa:a.mesa,ses:m.ses,total:l.reduce((s,x)=>s+x.q*x.pr,0),n:l.reduce((s,x)=>s+x.q,0),t0:m.t0,t1:t});
   S.avisos.forEach(x=>{if(x.mesa===a.mesa)x.ok=true});
   S.mesas[a.mesa]={e:'libre',disp:[],ult:{ses:m.ses||0,t,disp:m.disp||[]}};break}
  /* lo que apunta el asistente de llamadas (rol 'agente') o el propio local a mano */
  case'llamada':{if(!sala&&actor.rol!=='agente')return{error:'permiso'};
   const c={id:++S.nl,t,tipo:TIPOS.includes(a.que)?a.que:'recado',de:String(a.de||'').slice(0,20),quien:String(a.quien||'').slice(0,40),texto:String(a.texto||'').slice(0,500),urgente:!!a.urgente,min:Math.max(0,+a.min||0),ok:false};
   if(c.tipo==='pedido'){c.l=lineas(S,cfg,a.l);if(!c.l.length){S.nl--;return{error:'vacio'}}c.total=c.l.reduce((s,x)=>s+x.q*x.pr,0);c.hora=String(a.hora||'').slice(0,20)}
   if(c.tipo==='info')c.ok=true;S.llamadas.push(c);if(S.llamadas.length>300)S.llamadas.shift();r.id=c.id;if(c.total!=null)r.total=c.total;break}
  case'llamadaOk':{if((e=soloSala()))return e;const c=S.llamadas.find(x=>x.id===a.id);if(!c)return{error:'llamada'};c.ok=true;break}
  case'reiniciar':{if((e=soloSala()))return e;const v=S.v;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,nuevo(t));S.v=v;break}
  default:return{error:'accion'}
 }
 S.v++;return r}

/* cuenta de una mesa abierta: líneas agrupadas y total */
function cuentaDe(S,mesa){const m=S.mesas[mesa];if(!abierta(m))return{l:[],total:0,tk:[]};const agg={},tk=[];
 S.pedidos.forEach(p=>{if(p.mesa!==mesa||p.ses!==m.ses||p.e!=='aceptado')return;
  p.l.forEach(x=>{const k=x.p+'|'+(x.o||'');(agg[k]||(agg[k]={p:x.p,n:x.n,o:x.o,q:0,pr:x.pr})).q+=x.q});
  Object.entries(p.tk||{}).forEach(([est,k])=>tk.push({est,e:k.e,n:k.n,id:p.id}))});
 const l=Object.values(agg);return{l,total:l.reduce((s,x)=>s+x.q*x.pr,0),tk}}

/* lo que puede ver el móvil de un cliente: solo su mesa, y el código solo si ya está dentro */
function vistaCliente(S,cfg,mesa,disp){const m=S.mesas[mesa]||{e:'libre',disp:[]},ab=abierta(m),mi=ab&&m.disp.includes(disp);
 const mios=S.pedidos.filter(p=>p.mesa===mesa&&p.disp===disp),pend=mios.filter(p=>p.e==='pendiente'),ult=mios[mios.length-1];
 const v={mesa,v:S.v,e:ab?(mi?m.e:'ocupada'):(pend.length?'pide':'libre'),miembro:mi,agotados:S.agotados.slice(),pend:pend.map(p=>({id:p.id,l:p.l})),
  rechazado:(ult&&ult.e==='rechazado'&&!pend.length&&!mi)?ult.id:0,l:[],total:0,tk:[],avisos:{},cerrada:0};
 if(mi){const c=cuentaDe(S,mesa);v.cod=m.cod;v.ses=m.ses;v.l=c.l;v.total=c.total;v.tk=c.tk;S.avisos.forEach(x=>{if(!x.ok&&x.mesa===mesa)v.avisos[x.tipo]=true})}
 else{if(!ab&&m.ult&&m.ult.disp.includes(disp))v.cerrada=m.ult.ses;if(!ab&&S.avisos.some(x=>!x.ok&&x.mesa===mesa&&x.tipo==='camarero'))v.avisos.camarero=true}
 return v}

/* números del día para el dueño (informativos: la caja oficial es la del TPV) */
function resumen(S){const c=S.cerradas,total=c.reduce((s,x)=>s+x.total,0),tiempos=[],top={};
 S.pedidos.forEach(p=>{if(p.e!=='aceptado')return;p.l.forEach(x=>{(top[x.p]||(top[x.p]={p:x.p,n:x.n,q:0})).q+=x.q});
  Object.values(p.tk||{}).forEach(k=>{if(k.t2)tiempos.push(k.t2-k.t0)})});
 const ll=(S.llamadas||[]).filter(x=>DIA(x.t)===S.dia);
 return{llamadas:ll.length,porVer:(S.llamadas||[]).filter(x=>!x.ok).length,mesas:c.length,total,medio:c.length?total/c.length:0,min:tiempos.length?tiempos.reduce((s,x)=>s+x,0)/tiempos.length/60000:0,
  top:Object.values(top).sort((a,b)=>b.q-a.q).slice(0,5),abiertas:Object.values(S.mesas).filter(abierta).length}}

/* lo que el asistente de llamadas puede consultar del día: qué se ha agotado */
function publico(S,cfg){return{agotados:S.agotados.map(p=>cfg.P[p]&&cfg.P[p].n).filter(Boolean)}}

g.SalaNucleo={nuevo,cfgDe,aplicar,vistaCliente,cuentaDe,resumen,publico,abierta,ORDEN,TIPOS};
})(typeof globalThis!=='undefined'?globalThis:this);
