/* OOOX Oficios · la app (app.html), navegar. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== pintar ===== */
const ANCHO=matchMedia('(min-width:960px)');ANCHO.addEventListener('change',()=>pinta());
function ruta(){const h=location.hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent);return{v:h[0]||(Q.rol==='tecnico'?'hoy':'bandeja'),a:h[1]||'',b:h[2]||''}}
let CUR='',NAVH='';
/* El menú, con sus números. Se puede repintar solo, sin tocar la pantalla. */
function pNav(){const esT=Q.rol==='tecnico',res=K.resumen(S,cfg,Date.now()),mios=S.avisos.filter(a=>a.tec===Q.id&&a.e==='asignado').length,cur=CUR;
 const L=esT?[['hoy','Hoy',I.hoy,mios],['hechos','Hechos',I.hecho,0],['furgo','Furgoneta',I.furgo,FG(Q.id)?K.cargaDe(S,cfg,Q.id,proxLab(),Date.now()).cargar.length:0,' por cargar']]:[['bandeja','Bandeja',I.bandeja,bandejaN()],['agenda','Agenda',I.agenda,0]].concat(pro()?[['cobros','Cobros',I.euro,res.pend.n]]:[],HAY_CON()?[['contratos','Contratos',I.hecho,(p=>p.renovar.length+p.revision.length+p.cobrar.length)(K.pendientesContratos(S,cfg,Date.now()))]]:[],SOP?[['mejoras','Mejoras',I.mejoras,SOP.sinLeer(),' sin leer']]:[]);
 const h=L.map(x=>'<a href="#/'+x[0]+'"'+(cur===x[0]||(esT&&x[0]==='hoy'&&cur==='aviso')?' aria-current="page"':'')+'>'+x[2]+'<span>'+x[1]+'</span>'+(x[3]?'<span class="n" aria-label="'+x[3]+(x[4]||' por atender')+'">'+x[3]+'</span>':'')+'</a>').join('');
 if(h!==NAVH){$('#nav').innerHTML=h;NAVH=h}}
function pinta(){S=Oficio.estado();pRed();if(!quienEntra())return pEntra();
 const r=ruta(),esT=Q.rol==='tecnico';let h,dos=false,det=false,papel=false;
 const mej=!esT&&SOP&&r.v==='mejoras';
 /* al entrar con algo sin leer, se abre donde está: la respuesta de OOOX o la novedad (20-11-2026) */
 if(mej){if(CUR!=='mejoras'){M.nov=[];M.pet=[];if(!r.a){const s=SOP.sinVer(),k=s.pet.length?'peticiones':s.nov.length?'novedades':'';if(k)try{history.replaceState(null,'','#/mejoras/'+k)}catch(e){}}mTrae(false)}mVisto()}
 else if(!esT){const x=PANT.includes(r.v)?r.v:'bandeja';if(RASTRO[RASTRO.length-1]!==x){RASTRO.push(x);if(RASTRO.length>3)RASTRO.shift()}}
 if(r.v==='aviso'){det=true;if(esT)h=vAviso(r.a);else{dos=true;h='<div class="col lst">'+vBandeja(r.a)+'</div><div class="col">'+vAviso(r.a)+'</div>'}}
 else if(r.v==='papel'){det=true;papel=true;h=vPapel(r.a,r.b)}
 else if(esT)h=r.v==='hechos'?vHechos():r.v==='furgo'?vFurgo(Q.id):vHoy();
 else if(r.v==='agenda')h=vAgenda(r.a);
 else if(r.v==='equipo')h=vEquipo(r.a);
 else if(r.v==='furgo')h=vFurgo(r.a);
 else if(r.v==='cobros'&&pro())h=vCobros(r.a);
 else if(r.v==='contratos'&&HAY_CON())h=vContratos();
 else if(r.v==='mejoras'&&SOP)h=vMejoras();
 else if(r.v==='nuevo'){det=true;h=vNuevo()}
 else{dos=true;const p0=ANCHO.matches&&(S.avisos.filter(a=>a.e==='nuevo'||a.e==='ausente').sort((a,b)=>(b.urg-a.urg)||(a.t-b.t))[0]||S.avisos.find(a=>['curso','camino','asignado'].includes(a.e)));
  h=p0?'<div class="col lst">'+vBandeja(p0.id)+'</div><div class="col">'+vAviso(p0.id)+'</div>':'<div class="col lst">'+vBandeja('')+'</div><div class="col sin">'+vElige()+'</div>'}
 const v=$('#v');v.className=(dos?'dos ':'')+(det?'det ':'')+(papel?'papelv ':'')+(!esT&&(r.v==='cobros'||r.v==='contratos'||r.v==='nuevo'||r.v==='furgo'||(r.v==='mejoras'&&SOP))?'estrecha ':'')+Q.rol;v.innerHTML=h;document.body.classList.toggle('det',det);
 CUR=dos||r.v==='nuevo'?'bandeja':(r.v==='equipo'||r.v==='furgo')&&!esT?'agenda':r.v;pNav();geoSync();voyReloj();
 const t=cfg.tec[Q.id],quien=(esT?ava(Q.id):'<i class="av c" aria-hidden="true">C</i>')+'<span>'+(esT?esc(t.n):'Centralita')+'</span>';
 $('#quien').innerHTML=FIJO?'<span class="quien" style="border-color:transparent">'+quien+'</span>':'<button class="quien" data-a="menu" aria-haspopup="dialog" aria-label="'+(SRV?'Tu sesión':'Cambiar de papel o de pack')+'. Ahora: '+(esT?t.n:'centralita')+'">'+quien+I.baja+'</button>';
 /* el nombre del papel va en el idioma del cliente, como el papel: es el nombre que propone el navegador al guardarlo en PDF para mandárselo */
 const cP=papel&&r.b==='contrato'?contrato(r.a):null,lP=cP?idiomaTel(cP.cli&&cP.cli.tel):papel&&el(r.a)?el(r.a).idioma||'':'';
 const tp=papel?(r.b==='contrato'?(cP?_c('Contrato de mantenimiento',null,lP)+' '+r.a:''):el(r.a)?conIdioma(lP,()=>OficioPapeles.nombre(el(r.a),r.b,K)):''):'';
 document.title=tp?tp+' · '+N.nombre:(esT?t.n:'Centralita')+' · '+N.nombre+' por dentro'}
addEventListener('hashchange',()=>{pinta();scrollTo(0,0);$('#v').focus({preventScroll:true})});
/* Si llega un cambio mientras alguien escribe, la pantalla no se toca (perdería el foco), pero los números del menú sí se ponen al día. */
Oficio.suscribir(()=>{const a=document.activeElement;pRed();if(a&&a.closest&&a.closest('#fEntra'))return;if(a&&a.closest&&a.closest('#fNuevo,#fMejora,#fCodigo,#fBusca,[data-obs]')&&quienEntra()){S=Oficio.estado();pNav();return}pinta()});
document.addEventListener('input',e=>{if(e.target.id==='busca'){BQ=e.target.value;pintaBusca()}});
document.addEventListener('submit',e=>{if(e.target.id==='fBusca'){e.preventDefault();const i=$('#busca');if(i)i.blur()}});
/* con servidor: lo que el servidor no acepta se deshace solo en pantalla, y aquí se dice */
Oficio.alRechazar(x=>toast('No se ha guardado: '+(ERR[x.err]||'el aviso había cambiado.').replace(/^./,c=>c.toLowerCase())));
setInterval(()=>{$$('[data-reloj]').forEach(e=>{const A=el(e.dataset.reloj);if(A)e.textContent=dur(K.minutos(A,Date.now()))})},15000);
setInterval(()=>{const a=document.activeElement;if(document.querySelector('dialog[open]')||(a&&a.closest&&a.closest('#fNuevo,#fMejora,#fCodigo,#fEntra,[data-obs]')))return;pinta()},60000);
