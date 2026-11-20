/* ============================================================
   LA DEMO GUIADA · prueba.html?guia (17-11-2026).
   Unos tres minutos sobre los tres móviles: el cliente pide una cita, la oficina reparte una urgencia y el técnico la
   cierra; al final, los papeles y los cobros. Cada paso señala con una flecha lo que hay que tocar dentro de su móvil
   (los marcos son de esta misma web, así que se pueden mirar por dentro) y pasa al siguiente cuando se hace.
   «Hazlo por mí» hace lo mismo que la pantalla, con las acciones de la app (Oficio.hacer), para quien solo quiere mirar.
   Solo la carga prueba.html, que es de la demo: las copias de los negocios no la llevan (copias.mjs, COMUNES).
   ============================================================ */
(function(){
'use strict';
const d=document,H=d.documentElement,$=(s,r)=>(r||d).querySelector(s);
const RM=matchMedia('(prefers-reduced-motion: reduce)');
/* una firma de ejemplo, la misma que lleva la muestra */
const FIRMA='M14 78C30 70 44 34 50 14 54 44 44 86 26 96M52 62C64 66 80 58 90 48 84 66 86 80 98 76 108 72 114 54 118 46 118 62 122 72 132 70 144 68 150 50 156 38 156 52 156 66 166 66 178 66 188 42 194 26';
const CONTACTO='software@ooox.es',VIDEO='video.html';
const CAPS=['El cliente pide cita','La oficina lo reparte','El técnico lo cierra','Todo queda apuntado'];
const MARCO={cli:'#m-cli iframe',cen:'#m-cen iframe',tec:'#m-tec iframe'};
const marco=k=>$(MARCO[k]);
const docDe=k=>{try{const f=marco(k);return f&&f.contentDocument}catch(e){return null}};
const winDe=k=>{try{const f=marco(k);return f&&f.contentWindow}catch(e){return null}};
const q=(k,s)=>{const x=docDe(k);return x?x.querySelector(s):null};
const hashDe=k=>{const w=winDe(k);try{return w?w.location.hash:''}catch(e){return''}};
const ponHash=(k,h)=>{const w=winDe(k);if(w&&w.location.hash!==h)w.location.hash=h};
const N=()=>window.OFICIO_NEGOCIO||{tecnicos:[]};
const nom=id=>{const t=(N().tecnicos||[]).find(x=>x.id===id);return t?t.n:'el técnico'};
const avs=()=>{try{return Oficio.estado().avisos||[]}catch(e){return[]}};
const av=id=>id?avs().find(a=>a.id===id):null;
const en=(id,L)=>{const A=av(id);return!!A&&L.includes(A.e)};
const abierta=k=>q(k,'dialog[open]');
const movil=()=>{const t=$('.tabs');return!!t&&getComputedStyle(t).display!=='none'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let G=null;

/* ---------- lo que hace «Hazlo por mí» ---------- */
function clic(k,s){const b=q(k,s);if(b&&!b.disabled){b.click();return true}return false}
function eligeFranja(){clic('cli','[data-fr]:not([disabled])')}
/* la cita va paso a paso (20-11-2026): en la guía, lo ya elegido pasa solo al paso siguiente con «Continuar», para que
   el recorrido siga siendo de tres minutos. «hasta»: el paso al que se quiere llegar */
function avanza(hasta,n){n=n||0;const f=q('cli','#f');if(n>10||q('cli','#rConfirma'))return;if(!f){setTimeout(()=>avanza(hasta,n+1),150);return}
 const O=['av','det','fr','tu'],p=f.dataset.paso;if(O.indexOf(p)>=O.indexOf(hasta))return;
 if(p==='av'&&!q('cli','input[name=av]:checked'))return;if(p==='fr'&&!q('cli','[data-fr][aria-checked="true"]'))return;
 clic('cli','#sigue');setTimeout(()=>avanza(hasta,n+1),150)}
function rellena(){const x=docDe('cli'),W=winDe('cli');if(!x||!W)return;
 [['c_nomap','Laura Gómez Prat'],['c_tel','600 123 456'],['c_dir','C/ de Mallorca 200, 3.º 1.ª'],['c_cp','08036']].forEach(([id,v])=>{
  const i=x.getElementById(id);if(!i)return;i.value=v;i.dispatchEvent(new W.Event('input',{bubbles:true}))});
 setTimeout(()=>clic('cli','#f button[type=submit]'),60)}
/* la cita que acaba de pedir: la primera que no estaba al empezar */
const nuevaCita=()=>{const A=avs().find(a=>G&&!G.I0.has(a.id)&&a.origen==='cita');if(A&&G)G.C=A.id;return A};
/* la llamada que acaba de apuntar la oficina: el aviso que sigue la guía desde ahí */
const nuevaLlamada=()=>{const A=avs().find(a=>G&&!G.I0.has(a.id)&&a.origen==='llamada');if(A&&G)G.U=A.id;return A};
/* lo que falta por cobrar de antes (la transferencia de Andreu, en la muestra) */
const pendiente=()=>avs().filter(a=>a.e==='hecho'&&a.pago&&!a.pago.cobrado&&(!G||a.id!==G.U)).sort((a,b)=>b.fin-a.fin)[0];
const fila=(k,id)=>{const a=q(k,'a.fila[href="#/aviso/'+id+'"]');return a?(a.closest('li')||a):null};
function libres(){const ocup=new Set(avs().filter(a=>a.e==='camino'||a.e==='curso').map(a=>a.tec));return(N().tecnicos||[]).map(t=>t.id).filter(t=>!ocup.has(t))}
function asignaCita(){if(clic('cen','button.tec[data-a=asignar][data-id="'+G.C+'"]'))return;const W=winDe('cen');if(!W)return;
 for(const t of (N().tecnicos||[]).map(x=>x.id))if(W.Oficio.hacer({tipo:'asignar',id:G.C,tec:t},{rol:'centralita',id:'marta'}).ok)return}
/* «Rellenar por mí» en «Nuevo aviso»: lo que contaría Toni por teléfono, como lo apuntaría la oficina. «Nuevo aviso» va paso a
   paso (20-11-2026): se rellena cada paso y se pulsa «Continuar», uno detrás de otro, hasta «Crear el aviso» */
function apunta(){const W=winDe('cen');if(!W)return;cierraHojas('cen');
 const D=()=>docDe('cen'),f=()=>D()&&D().getElementById('fNuevo');
 const pulsa=s=>{const b=D()&&D().querySelector(s);if(b&&b.getAttribute('aria-checked')!=='true')b.click()};
 const pon=(id,v)=>{const i=D()&&D().getElementById(id);if(!i)return;i.value=v;i.dispatchEvent(new W.Event('input',{bubbles:true}))};
 const P={av:()=>pulsa('#fNuevo [data-b-av=atasco]'),cu:()=>pulsa('#fNuevo [data-b-cu=urg]'),qui:()=>{pon('n_tel','600 123 789');pon('n_nomap','Toni Serra Puig')},
  don:()=>{pon('n_dir','C/ de Verdi 80, 1.º 2.ª');pon('n_cp','08012')},fin:()=>{pulsa('#fNuevo [data-b-or=llamada]');pon('n_nota','El váter no traga y está a punto de salirse el agua.')}};
 let ult='',n=0;const paso=()=>{if(++n>40)return;const x=f();if(!x){setTimeout(paso,150);return}const p=x.dataset.paso;
  if(p===ult){setTimeout(paso,150);return}ult=p;if(P[p])P[p]();
  setTimeout(()=>{const y=f();if(y)y.requestSubmit();if(p!=='fin')setTimeout(paso,200)},180)};
 if(hashDe('cen')!=='#/nuevo')ponHash('cen','#/nuevo');setTimeout(paso,150)}
function cobra(){const A=av(G.P);if(!A)return;cierraHojas('cen');const W=winDe('cen');if(W)W.Oficio.hacer({tipo:'cobrar',id:A.id,modo:'transferencia'},{rol:'centralita',id:'marta'})}
function asigna(){if(clic('cen','button.dar[data-id="'+G.U+'"]')||clic('cen','.btn[data-a=asignar][data-id="'+G.U+'"]'))return;
 const W=winDe('cen');if(!W)return;for(const t of libres())if(W.Oficio.hacer({tipo:'asignar',id:G.U,tec:t},{rol:'centralita',id:'marta'}).ok)return}
/* el técnico del aviso en su móvil: si no es el que se ve, se cambia */
function ponTecnico(){const A=av(G.U);if(!A||!A.tec)return;G.T=A.tec;const f=marco('tec');
 if(f&&!(f.getAttribute('src')||'').includes('tec='+A.tec+'&'))f.setAttribute('src','app.html?papel=tecnico&tec='+A.tec+'&fijo');
 const s=$('#m-tec h2 small');if(s)s.textContent=nom(A.tec)+', en la calle'}
function voy(){if(clic('tec','[data-a=voy][data-id="'+G.U+'"]'))return;const W=winDe('tec');if(!W)return;
 let r=W.Oficio.hacer({tipo:'voy',id:G.U},{rol:'tecnico',id:G.T});
 /* si su técnico está con otro trabajo, se le pasa a uno libre (solo con «Hazlo por mí») */
 if(!r.ok&&r.err==='ocupado'){const C=winDe('cen');for(const t of libres())if(C&&C.Oficio.hacer({tipo:'asignar',id:G.U,tec:t},{rol:'centralita',id:'marta'}).ok){ponTecnico();setTimeout(()=>{const X=winDe('tec');if(X)X.Oficio.hacer({tipo:'voy',id:G.U},{rol:'tecnico',id:G.T})},700);break}}}
function cierraHojas(k){const x=docDe(k);if(x)x.querySelectorAll('dialog[open]').forEach(h=>h.close())}
function empiezaTrabajo(){const W=winDe('tec'),A=av(G.U);if(!W||!A)return;cierraHojas('tec');
 const K=W.OficioNucleo,cfg=K.cfgDe(W.OFICIO_NEGOCIO),lin=K.iniDe(cfg,A).map(l=>({k:l.k,q:l.q||cfg.cat[l.k].min}));
 W.Oficio.hacer({tipo:'empezar',id:G.U,pres:{lineas:lin.length?lin:[{k:'desp',q:1},{k:'mo',q:1}],local:false,firma:FIRMA,pide:true}},{rol:'tecnico',id:G.T})}
function termina(){const W=winDe('tec');if(!W)return;cierraHojas('tec');
 if(W.Oficio.hacer({tipo:'terminar',id:G.U,modo:'tarjeta',firma:FIRMA},{rol:'tecnico',id:G.T}).ok)ponHash('tec','#/papel/'+G.U+'/parte')}
function hoja(){const f=$('.hojap iframe');if(f){const s='app.html?fijo&solo#/papel/'+G.U+'/parte';if(f.getAttribute('src')!==s)f.setAttribute('src',s)}
 const p=$('.pap'),h=$('.hojap');if(!p||!h)return;p.classList.add('ve');
 const r=h.getBoundingClientRect(),arriba=movil()?$('.tabs').offsetHeight+10:Math.max(16,(innerHeight-r.height)/2);
 scrollTo({top:Math.max(0,r.top+scrollY-arriba),behavior:RM.matches?'auto':'smooth'})}

/* ---------- los pasos ----------
   k: el móvil (cli, cen, tec) o «hoja»; el: lo que se señala; hecho: cuándo se pasa al siguiente; prep: lo que se
   prepara al llegar; sig: se pasa con «Siguiente»; bot: «Hazlo por mí» y compañía */
const PASOS=[
 {modal:'intro'},
 {cap:0,k:'cli',t:'Tu web, donde pide cita el cliente',x:'Elige qué hay que arreglar, como haría un cliente.',
  prep:()=>{if(hashDe('cli'))ponHash('cli','')},el:()=>q('cli','.avs')||q('cli','#av'),hecho:()=>!!(q('cli','input[name=av]:checked')||q('cli','#rConfirma'))},
 {cap:0,k:'cli',t:'Elige día y hora',x:'Solo salen los huecos que de verdad están libres, según tus técnicos y sus horarios.',
  prep:()=>avanza('fr'),el:()=>q('cli','#fr'),hecho:()=>!!(q('cli','[data-fr][aria-checked="true"]')||q('cli','#rConfirma')),bot:[['Elegir por mí',eligeFranja]]},
 {cap:0,k:'cli',t:'Sus datos',x:'Nombre, teléfono y dirección, una sola vez. Para ir rápido, te los relleno.',
  prep:()=>avanza('tu'),el:()=>q('cli','#tu'),hecho:()=>!!q('cli','#rConfirma'),bot:[['Rellenar por mí',rellena]]},
 {cap:0,k:'cli',t:'Revisa y confirma',x:'Así le llega al negocio. Toca «Confirmar la cita».',
  el:()=>q('cli','#rConfirma'),hecho:()=>!!nuevaCita(),bot:[['Hazlo por mí',()=>clic('cli','#rConfirma')]]},
 {cap:1,k:'cen',t:'Ha entrado en la oficina: repártela',x:'Ha llegado sola, sin una llamada. Es lo que harás cada día: elige qué técnico va. Toca su nombre.',
  prep:()=>ponHash('cen','#/aviso/'+G.C),el:()=>{const b=q('cen','button.tec[data-a=asignar][data-id="'+G.C+'"]');return b?(b.parentElement||b):(fila('cen',G.C)||q('cen','main'))},
  hecho:()=>en(G.C,['asignado','camino','curso','hecho']),bot:[['Hazlo por mí',asignaCita]]},
 {cap:1,k:'cen',t:'Suena el teléfono: apúntalo',x:'Toni tiene el váter atascado. Lo que te cuenta va en «Nuevo aviso»: qué le pasa, que es urgente y sus datos. Si quieres, te lo relleno.',
  prep:()=>ponHash('cen','#/nuevo'),el:()=>q('cen','#fNuevo')||q('cen','main'),hecho:()=>!!nuevaLlamada(),bot:[['Rellenar por mí',apunta]]},
 {cap:1,k:'cen',t:'Asígnalo a quien llega antes',x:'La app te dice qué técnico llega antes a su casa. Asígnaselo con un toque.',
  el:()=>hashDe('cen')==='#/aviso/'+G.U?(q('cen','.btn.pri[data-a=asignar][data-id="'+G.U+'"]')||q('cen','button.tec[data-a=asignar][data-id="'+G.U+'"]')||q('cen','main')):(fila('cen',G.U)||q('cen','main')),
  hecho:()=>en(G.U,['asignado','camino','curso','hecho']),bot:[['Hazlo por mí',asigna]]},
 {cap:2,k:'tec',t:()=>nom(G.T)+' recibe el aviso',x:'Toca «Voy»: al cliente le llega que va de camino, quién va y en qué furgoneta.',
  prep:ponTecnico,el:()=>q('tec','[data-a=voy][data-id="'+G.U+'"]'),hecho:()=>en(G.U,['camino','curso','hecho']),bot:[['Hazlo por mí',voy]]},
 {cap:2,k:'cli',t:'Y el cliente lo ve en su móvil',x:()=>{const A=av(G.U),n=A&&A.cli&&A.cli.nombre;return(n||'El cliente')+' sabe quién va, en qué furgoneta y a qué hora llega, sin llamar para preguntar.'},
  prep:()=>ponHash('cli','#/aviso/'+G.U),el:()=>[q('cli','#tit'),q('cli','.quien')||q('cli','.frase')],sig:true},
 {cap:2,k:'tec',t:'Precio cerrado, firmado con el dedo',
  x:()=>abierta('tec')?'Paso a paso: lo que se hace, el precio con el IVA y la firma del cliente con el dedo (o con el ratón). Toca «Continuar» y, al final, «Firmado: empezar».':'Toca «Empezar»: eliges lo que se hace y el cliente firma el precio antes de empezar.',
  el:()=>abierta('tec')?(q('tec','dialog[open] .hpaso:not([hidden])')||abierta('tec')):q('tec','[data-a=empezar][data-id="'+G.U+'"]'),
  prep:()=>ponHash('tec','#/aviso/'+G.U),hecho:()=>en(G.U,['curso','hecho']),bot:[['Hazlo por mí',empiezaTrabajo]]},
 {cap:2,k:'tec',t:'Terminado',
  x:()=>abierta('tec')?'Elige cómo ha pagado y toca «Continuar». Que firme que está conforme es opcional; al final, «Cerrar el trabajo».':'Trabajo hecho: toca «Terminado» para cobrar y cerrar el aviso.',
  el:()=>abierta('tec')?(q('tec','dialog[open] .hpaso:not([hidden])')||abierta('tec')):q('tec','[data-a=terminar][data-id="'+G.U+'"]'),
  hecho:()=>en(G.U,['hecho']),bot:[['Hazlo por mí',termina]]},
 {cap:3,k:'hoja',t:'Los papeles salen solos',x:'El parte y la garantía, con la firma del cliente y sin escribir nada. Se los mandas por WhatsApp con un toque: el mensaje ya va escrito.',
  prep:hoja,el:()=>$('.hojap'),sig:true},
 {cap:3,k:'cen',t:'Te pagan por transferencia: apúntalo',
  x:()=>{const A=av(G.P),n=A&&A.cli&&A.cli.nombre;return(n||'Un cliente')+' te ha pagado lo de ayer por transferencia. Ábrelo en «Por cobrar», toca «Apuntar cobro», elige «Transferencia» y confírmalo.'},
  prep:()=>{const A=pendiente();G.P=A?A.id:'';ponHash('cen','#/cobros')},
  el:()=>abierta('cen')?(q('cen','dialog[open] #oM')||abierta('cen')):hashDe('cen').indexOf('#/aviso/'+G.P)===0?(q('cen','.btn[data-a=cobrar][data-id="'+G.P+'"]')||q('cen','main')):(q('cen','main a[href="#/aviso/'+G.P+'"]')||q('cen','main')),
  hecho:()=>{const A=av(G.P);return!A||!!(A.pago&&A.pago.cobrado)},bot:[['Hazlo por mí',cobra]]},
 {cap:3,k:'cen',t:'Y la oficina lo tiene todo',x:'Lo cobrado hoy, lo que falta por cobrar y el mes listo para tu gestoría.',
  prep:()=>ponHash('cen','#/cobros'),el:()=>q('cen','.fija')||q('cen','main'),sig:true},
 {modal:'fin'}];

/* ---------- lo que se ve: el velo, el hueco, la flecha y la burbuja ---------- */
const CSS=`
html.gu-on .ph,html.gu-on .pp{display:none}
.gu-hueco{position:fixed;left:0;top:0;z-index:2147482990;border-radius:14px;box-shadow:0 0 0 200vmax rgba(8,10,12,.58);pointer-events:none}
.gu-hueco::after{content:"";position:absolute;inset:-4px;border:3px solid var(--senal);border-radius:17px}
.gu-velo{position:fixed;inset:0;z-index:2147482990;background:rgba(8,10,12,.66)}
.gu-flecha{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147482995;pointer-events:none;overflow:visible}
.gu-flecha path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.gu-flecha .f0{stroke:rgba(8,10,12,.75);stroke-width:9}
.gu-flecha .f1{stroke:var(--senal);stroke-width:4.5}
.gu-b{position:fixed;left:0;top:0;z-index:2147483000;width:min(360px,calc(100vw - 24px));padding:18px 18px 14px;border-radius:16px;background:var(--papel);color:var(--tinta);box-shadow:0 18px 50px rgba(0,0,0,.45);font:400 1rem/1.42 var(--fb)}
.gu-b .gu-k{font:600 .95rem/1.2 var(--fd);color:var(--tinta-2)}
.gu-b h2{margin:4px 0 6px;font:800 1.65rem/1 var(--fd);color:var(--tinta)}
.gu-b .gu-x{color:var(--tinta-2)}
.gu-b .gu-x b{color:var(--tinta);font-weight:600}
.gu-bt{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin-top:14px}
.gu-bt .btn{min-height:46px}
.gu-pts{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:14px}
.gu-pts i{height:4px;border-radius:2px;background:var(--raya)}
.gu-pts i.ya{background:var(--tinta-2)}
.gu-pts i.on{background:var(--tinta)}
.gu-b.gu-m{width:min(460px,calc(100vw - 28px));padding:24px 22px 18px}
.gu-b.gu-m h2{font-size:2.2rem}
.gu-m .gu-lista{display:grid;gap:4px;margin-top:10px;color:var(--tinta-2)}
.gu-m .gu-lista li{display:grid;grid-template-columns:1.4em minmax(0,1fr)}
.gu-m .gu-lista li::before{content:"✓";color:var(--bien-papel);font-weight:600}
.gu-adapta{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--papel-2);color:var(--tinta)}
.gu-fin{display:grid;gap:8px;margin-top:16px}
.gu-fin .btn{width:100%;min-height:50px}
.gu-fin .gu-wa{margin:-3px 0 4px;text-align:center;font-size:.875rem;color:var(--tinta-2)}
.gu-mas{justify-content:center;margin-top:6px}
.gu-b a.txt{display:inline-flex;align-items:center}
.gu-aviso{position:fixed;left:50%;bottom:calc(18px + var(--sb));z-index:2147483000;width:max-content;max-width:min(600px,calc(100vw - 24px));padding:12px 16px;border-radius:12px;background:var(--papel);color:var(--tinta);box-shadow:0 12px 30px rgba(0,0,0,.4);font:500 .9375rem/1.35 var(--fb);text-wrap:balance;transform:translateX(-50%);opacity:0;pointer-events:none;transition:opacity .25s var(--ease-out)}
.gu-aviso.ve{opacity:1}
@media (prefers-reduced-motion:reduce){.gu-aviso{transition-duration:.01s}}
@media (min-width:900px){
 html.gu-on .tres{padding-top:22px}
 html.gu-on .mv{transition:opacity .35s var(--ease-out)}
 html.gu-cli .mv:not(#m-cli),html.gu-cen .mv:not(#m-cen),html.gu-tec .mv:not(#m-tec),html.gu-hoja .mv{opacity:.38}
}
@media (prefers-reduced-motion:no-preference){
 .gu-hueco::after{animation:guLatido 1.7s var(--ease-out) infinite}
 .gu-flecha.nueva path[pathLength]{stroke-dasharray:1;animation:guTraza .55s var(--ease-out) both}
 .gu-flecha.nueva .pu{animation:guPunta .2s .42s var(--ease-out) both}
 .gu-b.nueva{animation:guEntra .32s var(--ease-out) both}
}
@keyframes guLatido{0%{box-shadow:0 0 0 0 rgba(255,196,0,.6)}70%,100%{box-shadow:0 0 0 14px rgba(255,196,0,0)}}
@keyframes guTraza{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes guPunta{from{opacity:0}}
@keyframes guEntra{from{opacity:0;translate:0 10px}}`;

function monta(){if($('#guCss'))return;const st=d.createElement('style');st.id='guCss';st.textContent=CSS;d.head.appendChild(st)}
function capas(){const v=d.createElement('div');v.className='gu-velo';v.hidden=true;
 const h=d.createElement('div');h.className='gu-hueco';h.hidden=true;
 const s=d.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','gu-flecha');s.setAttribute('aria-hidden','true');
 s.innerHTML='<path class="f0" pathLength="1"/><path class="f1" pathLength="1"/><path class="f0 pu"/><path class="f1 pu"/>';
 const b=d.createElement('section');b.className='gu-b papel';b.setAttribute('role','dialog');b.setAttribute('aria-labelledby','guT');b.setAttribute('aria-describedby','guX');
 d.body.append(v,h,s,b);return{v,h,s,b}}

function pinta(){const p=PASOS[G.i],b=G.L.b,t=typeof p.t==='function'?p.t():p.t,x=typeof p.x==='function'?p.x():p.x;
 if(p.modal==='intro')b.innerHTML='<p class="gu-k">Demo guiada · unos 4 minutos</p><h2 id="guT">Así funciona OOOX Oficios</h2>'+
  '<p class="gu-x" id="guX">Vas a ver un aviso de principio a fin. Haces de <b>cliente</b>, de <b>técnico</b> y, sobre todo, de <b>oficina</b>: repartir, apuntar las llamadas y los cobros, lo de cada día. Lo que hace uno, lo ven los otros al momento. Es un negocio inventado, así que nada llega a nadie.</p>'+
  '<div class="gu-bt"><button class="btn pri" data-g="ya">Empezar</button><button class="txt" data-g="sal">Prefiero mirarlo solo</button></div>';
 else if(p.modal==='fin'){const W=window.OOOX_CONTACTO,mu=document.querySelector('#muestraOoox a[href^="https://wa.me/"]'),wa=mu?mu.href:W&&W.wa?W.url('demo'):'';   // con la muestra de un negocio, el mensaje ya lleva su nombre
 b.innerHTML='<p class="gu-k">Fin de la demo guiada</p><h2 id="guT">Así trabaja un negocio con OOOX Oficios</h2>'+
  '<ul class="gu-lista"><li>Las citas entran solas, sin llamadas.</li><li>Las llamadas se apuntan en un momento y se reparten con un toque, a quien llega antes.</li><li>Precio firmado, parte y garantía, sin papeles.</li><li>Sabes qué se ha cobrado y qué falta.</li></ul>'+
  '<p class="gu-adapta" id="guX"><b>Y la adaptamos a tu forma de trabajar:</b> tus precios, tus zonas, tus horarios, tus técnicos y tus papeles. Si algo no encaja, lo cambiamos hasta que encaje.</p>'+
  /* «Lo quiero»: al WhatsApp de Oscar con el mensaje escrito (js/ooox-contacto.js); sin número, por correo.
     «Volver a la demo»: se quita la guía y se navega por su cuenta */
  '<div class="gu-fin"><a class="btn pri" data-contacto="demo" href="'+(wa||'mailto:'+CONTACTO+'?subject='+encodeURIComponent('Quiero OOOX Oficios para mi negocio'))+'"'+(wa?' target="_blank" rel="noopener"':'')+'>Lo quiero para mi negocio</a>'+
  (wa?'<p class="gu-wa">Se abre WhatsApp con el mensaje ya escrito.</p>':'')+
  '<button class="btn" data-g="sal">Volver a la demo</button></div>'+
  '<div class="gu-bt gu-mas"><a class="txt" href="'+VIDEO+'">Ver el vídeo</a><button class="txt" data-g="otra">Empezar la guía otra vez</button></div>'}
 else b.innerHTML='<p class="gu-k">Paso '+(p.cap+1)+' de 4 · '+CAPS[p.cap]+'</p><h2 id="guT">'+esc(t)+'</h2><p class="gu-x" id="guX" aria-live="polite">'+esc(x)+'</p>'+
  '<div class="gu-bt">'+(p.sig?'<button class="btn pri peq" data-g="sig">Siguiente</button>':'')+(p.bot||[]).map((o,i)=>'<button class="btn peq" data-g="b'+i+'">'+esc(o[0])+'</button>').join('')+'<button class="txt" data-g="sal">Salir de la guía</button></div>'+
  '<div class="gu-pts" aria-hidden="true">'+CAPS.map((c,i)=>'<i class="'+(i<p.cap?'ya':i===p.cap?'on':'')+'"></i>').join('')+'</div>';
 G.xs=x;b.classList.toggle('gu-m',!!p.modal);b.setAttribute('aria-modal',p.modal?'true':'false');
 b.classList.remove('nueva');void b.offsetWidth;b.classList.add('nueva');
  if(p.modal){const f=$('[data-g="ya"],.btn.pri',b);if(f)f.focus({preventScroll:true})}}

/* ---------- dónde está cada cosa ---------- */
function rectDe(el){if(Array.isArray(el)){const L=el.filter(e=>e&&e.isConnected);if(!L.length)return null;el=L[0];
  const R=L.map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);if(!R.length)return null;
  var r={left:Math.min(...R.map(x=>x.left)),top:Math.min(...R.map(x=>x.top)),right:Math.max(...R.map(x=>x.right)),bottom:Math.max(...R.map(x=>x.bottom))}}
 else{if(!el||!el.isConnected)return null;var r=el.getBoundingClientRect();if(!r.width||!r.height)return null}
 let x1=r.left,y1=r.top,x2=r.right,y2=r.bottom;
 if(el.ownerDocument!==d){const f=['cli','cen','tec'].map(marco).find(m=>{try{return m&&m.contentDocument===el.ownerDocument}catch(e){return false}});if(!f)return null;
  const F=f.getBoundingClientRect();x1=Math.max(F.left,F.left+x1);y1=Math.max(F.top,F.top+y1);x2=Math.min(F.right,F.left+x2);y2=Math.min(F.bottom,F.top+y2)}
 /* en el móvil, las pestañas van pegadas arriba: lo de debajo de ellas no se ve */
 const tb=movil()?$('.tabs').getBoundingClientRect().bottom:0;
 x1=Math.max(0,x1);y1=Math.max(tb,y1);x2=Math.min(innerWidth,x2);y2=Math.min(innerHeight,y2);
 return x2-x1<6||y2-y1<6?null:{x:x1,y:y1,w:x2-x1,h:y2-y1}}
function trae(L){const e0=L[0],doc=e0.ownerDocument,win=doc.defaultView;let p=e0.parentElement;
 while(p&&p!==doc.body&&p!==doc.documentElement){const o=win.getComputedStyle(p).overflowY;if((o==='auto'||o==='scroll')&&p.scrollHeight>p.clientHeight+2)break;p=p.parentElement}
 const raiz=!p||p===doc.body||p===doc.documentElement,sc=raiz?doc.scrollingElement:p;if(!sc)return;
 const R=L.map(e=>e.getBoundingClientRect()),top=Math.min(...R.map(r=>r.top)),bot=Math.max(...R.map(r=>r.bottom)),h=bot-top;
 const C=raiz?{top:0,height:win.innerHeight}:sc.getBoundingClientRect(),alto=raiz?win.innerHeight:sc.clientHeight;
 /* centrado; si no cabe, que se vea su principio, por debajo de la cabecera de la app */
 const dest=sc.scrollTop+(top-C.top)-(h<alto-140?(alto-h)/2:76);
 if(Math.abs(dest-sc.scrollTop)>4)sc.scrollTo({top:Math.max(0,dest),behavior:RM.matches?'auto':'smooth'})}
function zonaPanel(k){const e=k==='hoja'?$('.hojap'):k&&MARCO[k]?marco(k):null;return e?e.getBoundingClientRect():null}
function borde(r,p,pad){const cx=r.x+r.w/2,cy=r.y+r.h/2,dx=p.x-cx,dy=p.y-cy;if(!dx&&!dy)return{x:cx,y:cy};
 const s=Math.min((r.w/2+pad)/Math.abs(dx||1e-9),(r.h/2+pad)/Math.abs(dy||1e-9));return{x:cx+dx*s,y:cy+dy*s}}
const corta=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;

function coloca(R){const p=PASOS[G.i],L=G.L,b=L.b,W=innerWidth,Hh=innerHeight,m=12,bw=b.offsetWidth,bh=b.offsetHeight;let x,y;
 if(p.modal){x=(W-bw)/2;y=Math.max(m,(Hh-bh)/2)}
 else if(movil()){const tb=$('.tabs').getBoundingClientRect(),top=Math.max(m,tb.bottom+8),abajo=Hh-bh-m;x=(W-bw)/2;
  if(!R)y=abajo;else{const libreAr=R.y-top,libreAb=Hh-(R.y+R.h);y=libreAb>=bh+22||libreAb>=libreAr?Math.max(top,Math.min(abajo,R.y+R.h+22)):Math.max(top,R.y-bh-22)}}
 else{const P=zonaPanel(p.k)||{left:W/2,right:W/2,top:Hh/3};
  if(W-P.right>=bw+48)x=P.right+30;else if(P.left>=bw+48)x=P.left-30-bw;else x=(W-bw)/2;
  y=R?R.y+R.h/2-bh/2:P.top+40;y=Math.max(m,Math.min(Hh-bh-m,y))}
 x=Math.round(x);y=Math.round(y);
 if(x!==G.bx||y!==G.by){b.style.transform='translate('+x+'px,'+y+'px)';G.bx=x;G.by=y}
 L.v.hidden=!p.modal;
 const B={x,y,w:bw,h:bh},cl=R?[R.x,R.y,R.w,R.h].map(Math.round).join():'';
 if(cl===G.cl&&x===G.fx&&y===G.fy)return;G.cl=cl;G.fx=x;G.fy=y;
 if(!R||p.modal){L.h.hidden=true;L.s.style.visibility='hidden';return}
 L.h.hidden=false;const pd=6;Object.assign(L.h.style,{transform:'translate('+(R.x-pd)+'px,'+(R.y-pd)+'px)',width:(R.w+pd*2)+'px',height:(R.h+pd*2)+'px'});
 if(corta(B,{x:R.x-14,y:R.y-14,w:R.w+28,h:R.h+28})){L.s.style.visibility='hidden';return}
 const s=borde(B,{x:R.x+R.w/2,y:R.y+R.h/2},0),e=borde(R,{x:B.x+B.w/2,y:B.y+B.h/2},14),dx=e.x-s.x,dy=e.y-s.y,l=Math.hypot(dx,dy);
 if(l<26){L.s.style.visibility='hidden';return}
 const nx=-dy/l,ny=dx/l,k=Math.min(56,l*.22),c1={x:s.x+dx*.3+nx*k,y:s.y+dy*.3+ny*k},c2={x:s.x+dx*.72+nx*k,y:s.y+dy*.72+ny*k};
 const a=Math.atan2(e.y-c2.y,e.x-c2.x),pu=15,ab=.52,f=n=>n.toFixed(1);
 const cuerpo='M'+f(s.x)+' '+f(s.y)+'C'+f(c1.x)+' '+f(c1.y)+' '+f(c2.x)+' '+f(c2.y)+' '+f(e.x)+' '+f(e.y);
 const punta='M'+f(e.x-pu*Math.cos(a-ab))+' '+f(e.y-pu*Math.sin(a-ab))+'L'+f(e.x)+' '+f(e.y)+'L'+f(e.x-pu*Math.cos(a+ab))+' '+f(e.y-pu*Math.sin(a+ab));
 const P=L.s.querySelectorAll('path');P[0].setAttribute('d',cuerpo);P[1].setAttribute('d',cuerpo);P[2].setAttribute('d',punta);P[3].setAttribute('d',punta);
 if(G.fv!==G.i){G.fv=G.i;L.s.classList.remove('nueva');void L.s.getBoundingClientRect();L.s.classList.add('nueva')}
 L.s.style.visibility='visible'}

/* ---------- la marcha ---------- */
function panel(k){H.classList.remove('gu-cli','gu-cen','gu-tec','gu-hoja');if(k)H.classList.add('gu-'+k);
 if(!MARCO[k])return;
 if(movil()){const t=$('[data-t="m-'+k+'"]');if(t&&t.getAttribute('aria-selected')!=='true')t.click();
  /* las pestañas van pegadas arriba: se mira dónde empieza el móvil, no dónde están ellas */
  const tb=$('.tabs'),tr=$('.tres');if(tr)scrollTo({top:Math.max(0,tr.getBoundingClientRect().top+scrollY-tb.offsetHeight),behavior:RM.matches?'auto':'smooth'})}
 else{const tr=$('.tres');if(tr){const r=tr.getBoundingClientRect();if(r.top<-4||r.top>innerHeight*.25)scrollTo({top:r.top+scrollY-12,behavior:RM.matches?'auto':'smooth'})}}}
function ve(i){if(!G)return;G.i=Math.max(0,Math.min(PASOS.length-1,i));const p=PASOS[G.i];G.visto=null;G.cl=null;G.pasa=0;
 panel(p.modal?null:p.k);try{if(p.prep)p.prep()}catch(e){console.error(e)}pinta()}
function tick(){if(!G)return;const p=PASOS[G.i];
 if(!p.modal&&!p.sig&&p.hecho&&!G.pasa){let ok=false;try{ok=p.hecho()}catch(e){}if(ok){G.pasa=1;setTimeout(()=>{if(G&&PASOS[G.i]===p)ve(G.i+1)},550)}}
 /* el texto puede cambiar dentro del paso (por ejemplo, al abrirse la hoja de firmar) */
 if(!p.modal&&typeof p.x==='function'){const x=p.x();if(x!==G.xs){const n=$('#guX',G.L.b);if(n)n.textContent=x;G.xs=x}}
 let el=null;if(!p.modal&&p.el){try{el=p.el()}catch(e){el=null}}
 const e0=Array.isArray(el)?el.find(Boolean):el;
 if(e0&&e0!==G.visto){G.visto=e0;if(e0.ownerDocument!==d)try{trae(Array.isArray(el)?el.filter(Boolean):[e0])}catch(e){}}
 coloca(rectDe(el));G.raf=requestAnimationFrame(tick)}
function carga(fs){return Promise.all(fs.map(f=>new Promise(ok=>{const t=setTimeout(ok,7000);f.addEventListener('load',()=>{clearTimeout(t);setTimeout(ok,250)},{once:true})})))}
async function arranca(){if(G)sal(true);monta();H.classList.add('gu-on');
 G={i:0,L:capas(),I0:new Set(),U:'',C:'',T:'omar',bx:null,by:null};
 G.L.b.innerHTML='<p class="gu-k">Preparando la demo…</p>';G.L.v.hidden=false;
 G.L.b.addEventListener('click',clicGuia);
 /* la muestra de nuevo, para que todos vean lo mismo: la urgencia de Montse, recién entrada */
 try{localStorage.removeItem(N().id+':av');localStorage.removeItem('oficio:'+N().id+':mio')}catch(e){}
 Oficio.reiniciar();
 const fs=['cli','cen','tec'].map(marco).filter(Boolean),t=marco('tec');if(t)t.setAttribute('src','app.html?papel=tecnico&tec=omar&fijo');
 const s=$('#m-tec h2 small');if(s)s.textContent='Omar, en la calle';
 fs.forEach(f=>{if(f!==t)f.setAttribute('src',f.getAttribute('src'))});
 G.raf=requestAnimationFrame(tick);await carga(fs);if(!G)return;
 const L=avs();G.I0=new Set(L.map(a=>a.id));
 G.U='';G.P='';
 ve(0)}
/* al salir, la demo queda para tocarla por su cuenta. Sin haber empezado («Prefiero mirarlo solo»), la página se queda
   donde está. A media guía o al final: en el móvil, con el móvil a la vista; en el ordenador, al final se vuelve arriba
   (las instrucciones, el botón de la guía y «Lo quiero»), y a media guía se queda en los móviles */
function sal(callado){if(!G)return;const i=G.i,fin=PASOS[i]&&PASOS[i].modal==='fin';cancelAnimationFrame(G.raf);const L=G.L;[L.v,L.h,L.s,L.b].forEach(x=>x.remove());G=null;
 H.classList.remove('gu-on','gu-cli','gu-cen','gu-tec','gu-hoja');
 if(callado)return;
 let arriba=false;
 if(i>0&&movil()){const tb=$('.tabs'),tr=$('.tres');if(tr)scrollTo({top:Math.max(0,tr.getBoundingClientRect().top+scrollY-tb.offsetHeight),behavior:'auto'})}
 else if(fin){scrollTo({top:0,behavior:RM.matches?'auto':'smooth'});arriba=true}
 const r=$('#guiaBtn');if(r)r.focus({preventScroll:true});
 const aLaVista=arriba||!!r&&(q=>q.bottom>0&&q.top<innerHeight)(r.getBoundingClientRect());
 aviso('Ya puedes tocarlo todo por tu cuenta. Para volver a la guía, «Demo guiada»'+(aLaVista?'.':', más arriba.'))}
/* el aviso de abajo (en el móvil, arriba, para no tapar la barra de la app, que es lo siguiente que se toca): se va solo a
   los 4 s o en cuanto se toca algo, también dentro de un móvil (eso le quita el foco a esta página) */
let quitaAviso=null;
function aviso(t){let n=$('#guAviso');if(!n){n=d.createElement('div');n.id='guAviso';n.className='gu-aviso';n.setAttribute('role','status');d.body.appendChild(n)}
 if(quitaAviso)quitaAviso();
 if(movil()){const tb=$('.tabs'),r=tb&&tb.getBoundingClientRect();n.style.top=(r&&r.top<=1&&r.bottom>0?Math.round(r.bottom)+10:12)+'px';n.style.bottom='auto'}
 else{n.style.top='';n.style.bottom=''}
 n.textContent=t;void n.offsetWidth;n.classList.add('ve');
 /* esta página y la de cada móvil (son de la misma web, así que se pueden escuchar), y por si acaso, el foco */
 let docs=[];
 const fuera=()=>{n.classList.remove('ve');clearTimeout(t1);clearTimeout(t0);removeEventListener('blur',fuera);
  docs.forEach(x=>{try{x.removeEventListener('pointerdown',fuera,true);x.removeEventListener('keydown',fuera,true)}catch(e){}});docs=[];quitaAviso=null};
 const t1=setTimeout(fuera,4000),t0=setTimeout(()=>{addEventListener('blur',fuera);
  docs=[d].concat([...d.querySelectorAll('.tres iframe')].map(f=>{try{return f.contentDocument}catch(e){return null}}).filter(Boolean));
  docs.forEach(x=>{x.addEventListener('pointerdown',fuera,true);x.addEventListener('keydown',fuera,true)})},300);
 quitaAviso=fuera}
function clicGuia(e){const b=e.target.closest('[data-g]');if(!b||!G)return;const g=b.dataset.g,p=PASOS[G.i];
 if(g==='ya'||g==='sig')ve(G.i+1);
 else if(g==='sal')sal();
 else if(g==='otra')arranca();
 else if(g[0]==='b'){const o=(p.bot||[])[+g.slice(1)];if(o)try{o[1]()}catch(x){console.error(x)}}}
d.addEventListener('keydown',e=>{if(G&&e.key==='Escape')sal()});
d.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#guiaBtn'))arranca()});

window.OficioGuia={empieza:arranca,sal,paso:()=>G?G.i:-1,pasos:PASOS.length,aviso:()=>G?G.U:''};
if(/[?&]guia\b/.test(location.search)){if(d.readyState==='complete')arranca();else addEventListener('load',arranca,{once:true})}
})();
