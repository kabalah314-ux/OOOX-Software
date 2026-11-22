/* OOOX Oficios · la app (app.html), base. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
const {K,N,cfg}=Oficio,$=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
/* lo que cambia de un negocio a otro sale siempre del archivo de datos: rótulo, ciudad, recargo y el concepto que va por horas */
const PCT=Math.round(cfg.recargo*100),HK=cfg.horas,HIT=HK?cfg.cat[HK]:null;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P=new URLSearchParams(location.search),FIJO=P.has('fijo');
if(P.has('solo'))document.documentElement.classList.add('solo');
let Q=P.get('papel')==='tecnico'?{rol:'tecnico',id:cfg.tec[P.get('tec')]?P.get('tec'):N.tecnicos[0].id}:{rol:'centralita',id:'oficina'};
/* el vigía de fallos solo sabe el papel (oficina o técnico), nunca quién */
if(window.OficioVigia&&OficioVigia.pon)OficioVigia.pon({rol:()=>Q&&Q.rol});
/* con servidor no se elige papel: cada uno entra con su código y la app es la suya */
const SRV=Oficio.SRV,quienEntra=()=>{const s=SRV?Oficio.sesion():null;if(s)Q={rol:s.rol,id:s.id};return!SRV||!!s};
quienEntra();
let S=window.__prepara?null:Oficio.estado();   /* la primera vez de la demo, se fabrica en __arranca, después de pintar «Preparando la demo…» */
const pro=()=>true;   /* desde el 13-11-2026 todos los negocios llevan papeles y cobros */
const MARCA=esc(N.marca[0])+(N.marca[1]?'<span>'+esc(N.marca[1])+'</span>':'');
{const m=$('#marca');m.innerHTML=MARCA;m.setAttribute('aria-label',N.nombre+': inicio de la app');if(!Oficio.DEMO)$$('.demo').forEach(e=>e.remove())}
const sv=(d,x)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'+(x||'')+'>'+d+'</svg>';
const I={mas:sv('<path d="M12 5v14M5 12h14"/>'),lupa:sv('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),atras:sv('<path d="M15 5l-7 7 7 7"/>'),x:sv('<path d="M6 6l12 12M18 6L6 18"/>'),baja:sv('<path d="M6 9l6 6 6-6"/>'),
 tel:sv('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),mapa:sv('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.800-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
 bandeja:sv('<path d="M4 13l2-8h12l2 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13h5l1 2h4l1-2h5"/>'),agenda:sv('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>'),
 euro:sv('<path d="M17 7a6 6 0 1 0 0 10M5 10h8M5 14h8"/>'),hoy:sv('<path d="M5 6h14M5 12h14M5 18h9"/>'),hecho:sv('<path d="M5 12.5l4.500 4.500L19 7"/>'),
 mejoras:sv('<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>'),
 furgo:sv('<path d="M3 6.5h11v10H3z"/><path d="M14 9.5h3.5l3 3.5v3.5H14"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>')};
const hace=t=>{const m=Math.max(0,Math.round((Date.now()-t)/60000));return m<1?'ahora mismo':m<60?'hace '+m+' min':m<1440?'hace '+Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':''):'hace '+Math.floor(m/1440)+' d'};
const dur=m=>m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':'');
const frTxt=id=>{const f=cfg.franjas.find(x=>x.id===id);return f?K.franjaTxt(f):''};
/* cuántas citas caben: un número fijo, o lo que salga de los horarios de cada técnico */
/* con servidor, los datos del negocio pueden llegar de él al entrar: lo que sale del equipo se mira cada vez */
const CABEN=()=>cfg.conHorario?'Los huecos salen del horario de cada técnico':'Caben '+cfg.cupo+' por franja';
const D3=['dom','lun','mar','mié','jue','vie','sáb'],MES3=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const diaTxt=f=>{const h=K.madrid().date;return f===h?'hoy':f===K.masDias(h,1)?'mañana':'el '+K.fechaLarga(f)};
const diaCorto=f=>{const h=K.madrid().date;return f===h?'hoy':f===K.masDias(h,1)?'mañana':D3[new Date(f+'T12:00:00Z').getUTCDay()]+' '+(+f.slice(8))};
const cuandoT=t=>{const f=K.madrid(t).date,h=K.madrid().date;return(f===h?'':f===K.masDias(h,-1)?'ayer, ':K.fechaCorta(f)+', ')+K.hora(t)};
const barrio=A=>A.cli.dis?cfg.zonas.dis[A.cli.dis][0]:'';
const ORIG={llamada:'por teléfono',web:'desde la web',cita:'cita en la web',whatsapp:'por WhatsApp',persona:'en persona',otro:'por otro canal'};
const EST={nuevo:'Sin asignar',asignado:'Asignado',camino:'De camino',curso:'Trabajando',hecho:'Terminado',ausente:'No había nadie',cancelado:'Cancelado'};
const PAGO={efectivo:'Efectivo',tarjeta:'Tarjeta',bizum:'Bizum',transferencia:'Transferencia',pendiente:'Lo paga después'};
const ERR={web:'Tiene que quedar al menos un servicio en la web.',webNombre:'El nombre del servicio tiene que tener de 2 a 40 letras.',webFrase:'La frase puede tener 140 letras como mucho.',webPrecio:'Ese precio no vale: pon «desde» en euros y, si quieres, «hasta», que sea más.',webOculto:'No se ha podido cambiar si sale en la web.',
 garantia:'Ese trabajo ya no está en garantía.',igual:'Ya consta así.',facturado:'Ya está facturado: para cambiar el precio, haz una factura rectificativa en tu programa de facturas.',nomap:'Escribe el nombre y al menos un apellido del cliente.',nombre:'Escribe el nombre y al menos un apellido del cliente.',apellidos:'Escribe el nombre y al menos un apellido del cliente.',tel:'El teléfono tiene que tener 9 cifras.',telAviso:'El contrato tiene que ser para el teléfono del cliente de este aviso.',dir:'Escribe la calle y el número.',cp:'Falta el código postal.',zona:'Ese código postal queda fuera de '+N.ciudad+': ahí no llegamos.',av:'Elige qué le pasa.',tec:'Ese técnico no existe.',foto:'Esa foto pesa demasiado.',vacio:'No hay nada que apuntar.',franja:'Esa franja ya está llena. Elige otra.',
 datos:'Faltan el teléfono y la dirección del cliente.',ocupado:'Ya tienes otro aviso en marcha. Termínalo antes.',pronto:'Todavía no puedes salir: «Voy» se activa media hora antes de la franja.',firma:'Falta la firma del cliente.',lineas:'El presupuesto está vacío.',pide:'Falta que el cliente marque «Quiero que lo hagáis ya».',plan:'Elige un plan.',ya:'Ese cliente ya tiene un contrato en esa dirección.',acepta:'Falta que el cliente diga que sí: que firme o que lo diga por mensaje.',contrato:'No encuentro ese contrato.',fecha:'Aún no toca renovarlo: se renueva el último mes.',motivo:'El motivo tiene que ser un texto.',falta:'Eso no vale como material: elige uno de la lista o escríbelo, de 1 a 20 unidades y hasta 12 cosas por aviso.',furgo:'Eso no vale para la furgoneta: material del catálogo, de 0 a 999 de cada cosa.',num:'Ese número de factura no vale.',modo:'Elige cómo paga.',si:'Falta decir si quiere o no los mensajes de seguimiento.',estado:'El aviso ha cambiado mientras tanto. Míralo otra vez.',permiso:'Este aviso no es tuyo.',fotos:'Ya hay cuatro fotos.',
 horario:'Ese técnico no trabaja a esa hora. Elige a otro.',ausente_tec:'Ese técnico está ausente ese día.',lleno:'Ese técnico ya tiene esa franja ocupada.',
 red:'Sin conexión con el servidor. No se ha creado: mira si aparece antes de repetirlo.',sesion:'Tu sesión se ha cerrado. Entra otra vez.',espera:'Eso tiene que confirmarlo el servidor.',
 fechas:'Revisa las fechas de la ausencia.',mapa:'Este negocio no tiene activado el mapa.',posicion:'Esa posición no vale.',ausencia:'Esa ausencia ya no está apuntada.',aviso:'Ese aviso ya no existe.'};
/* por qué no puede ir un técnico a un aviso; sale de las reglas (K.puedeIr), aquí solo se dice con palabras */
/* la oficina puede poner una cita donde el cliente no: en el hueco que se guarda para urgencias y con menos de dos horas */
const POR={margen:'menos de 2 h',reserva:'hueco de urgencias','reserva+margen':'hueco de urgencias'};
const PORL={margen:'Queda a menos de dos horas. El cliente ya no puede pedirla; la oficina, sí.',reserva:'Usa el hueco que se guarda para urgencias. El cliente no la ve; la oficina, sí.','reserva+margen':'Es hoy mismo y usa el hueco que se guarda para urgencias. Solo la puede poner la oficina.'};
const PORA={margen:'La puso la oficina con menos de dos horas de margen.',reserva:'La puso la oficina en el hueco que se guarda para urgencias.','reserva+margen':'La puso la oficina hoy mismo, en el hueco que se guarda para urgencias.'};
const frOf=f=>f.ok?(f.libres===1?'queda 1':'quedan '+f.libres):f.okOf?POR[f.por]:!f.tope?'nadie trabaja':!f.libresOf?'llena':'ya ha pasado';
const abiertos=['nuevo','asignado','ausente'];
const NOVA={ausente_tec:()=>'Ausente ese día',lleno:()=>cfg.porTiempo?'No le da tiempo en esa franja':'Ya tiene esa franja ocupada',horario:A=>A.cita?'No trabaja en esa franja':'Ahora no trabaja y no hace guardias'};
const ava=id=>{const t=cfg.tec[id];return t?'<i class="av" style="--h:'+t.tono+'" aria-hidden="true">'+t.n[0]+'</i>':'<i class="av c" aria-hidden="true">C</i>'};
const lq=l=>l.un==='h'?dur(Math.round(l.q*60)):l.q>1?l.q+' unidades':'';
/* un aviso corto; con «acc» ({t,fn}) lleva además un botón (p. ej. «Deshacer») y dura más, para que dé tiempo a pulsarlo */
const toast=(s,acc)=>{const e=$('#toast');e.textContent=s;e.classList.toggle('conb',!!acc);
 if(acc){const b=document.createElement('button');b.type='button';b.className='tacc';b.textContent=acc.t;b.onclick=()=>{clearTimeout(e._t);e.classList.remove('on','conb');acc.fn()};e.append(' ',b)}
 e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on','conb'),acc?7000:3200)};
const hacer=a=>{const r=Oficio.hacer(a,Q);if(!r.ok)toast(ERR[r.err]||'No se ha podido hacer.');return r};
/* lo que no se pudo crear en el servidor: «lleno» con duda es que el servidor estaba ocupado; sin duda, lo de las reglas (que ese
   técnico ya tiene la franja). Antes, en ERR iban las dos con la misma llave y la segunda tapaba a la primera (19-11-2026) */
const errDe=r=>r&&r.duda&&r.err==='lleno'?'El servidor está ocupado. Prueba otra vez en unos segundos.':ERR[r&&r.err];
/* lo que va al cliente, en su idioma (el de su aviso, 17-11-2026): sus mensajes, sus papeles y lo que lee y firma en el móvil del
   técnico. La app sigue en castellano (data-idioma-fijo): js/oficio-idioma.js solo traduce esto */
const IDI=window.OficioIdioma,_c=(s,v,l)=>IDI?IDI.para(l||'es').T(s,v):String(s).replace(/\{(\w+)\}/g,(m,k)=>v&&k in v?v[k]:m);
const conIdioma=(l,fn)=>IDI&&l&&l!=='es'?IDI.con(l,fn):fn(),idiomaUrl=A=>A&&A.idioma?'?lang='+A.idioma:'';
/* lo de un cliente que no va en un aviso (sus contratos): en el idioma de su último aviso, como hace la cita al pedir (idiomaDe, en las reglas) */
const idiomaTel=tel=>{const t=K.tel9(tel);let u=null;if(t)S.avisos.forEach(x=>{if(x.cli&&x.cli.tel===t&&(!u||x.t>u.t))u=x});return u&&u.idioma||''};
const el=id=>S.avisos.find(a=>a.id===id);

/* ===== hojas ===== */
function hoja(html,o){o=o||{};const d=document.createElement('dialog');d.className='hoja'+(o.papel?' papel':'')+(o.llena?' llena':'');d.innerHTML=html;document.body.appendChild(d);
 d.addEventListener('close',()=>d.remove());
 d.addEventListener('click',e=>{if(e.target.closest('[data-x]')||(e.target===d&&!o.fijo))d.close()});
 d.showModal();return d}
const hc=t=>'<div class="hc"><h2>'+t+'</h2><button class="x" data-x aria-label="Cerrar">'+I.x+'</button></div>';
/* hojas paso a paso (20-11-2026, como la cita: «uno a uno, una pantalla simple que vas avanzando»). La hoja trae sus pasos
   como <section class="hpaso" data-t="La pregunta">; aquí se enseña uno cada vez, con la barra, «atrás» y «Continuar».
   P.ok[i](): '' si se puede seguir, o qué falta (sale encima de «Continuar»). P.al[i](): al entrar en el paso (medir la
   firma, poner el foco). Los botones de la hoja, los de acabar, salen en el último paso (o desde el que diga su data-desde,
   como «No acepta el precio»); antes, solo «Continuar». Intro en un paso que no es el último es «Continuar», no acabar */
function pasosHoja(d,P){P=P||{};const S=$$('.hpaso',d),n=S.length;let i=0;if(n<2)return{ve(){},paso:()=>0,n};
 const hp=$('.hp',d),fin=[...hp.children],hb=$('.hb',d);
 $('.hc',d).insertAdjacentHTML('afterend','<nav class="prog" aria-label="Pasos"><button type="button" class="atras" data-hpa aria-label="Atrás">'+I.atras+'</button><ol>'+S.map(x=>'<li><span class="vh">'+x.dataset.t+'</span></li>').join('')+'</ol><span class="pn"></span></nav>');
 S.forEach(x=>x.insertAdjacentHTML('afterbegin','<h3 class="hq" tabindex="-1">'+x.dataset.t+'</h3>'));
 hp.insertAdjacentHTML('afterbegin','<p class="err hpe" role="alert" style="color:var(--mal)" hidden></p><button type="button" class="btn pri ancho" data-hps>'+(P.sigue||'Continuar')+'</button>');
 const E=$('.hpe',hp),B=$('[data-hps]',hp),A=$('[data-hpa]',d),L=$$('.prog li',d),pn=$('.prog .pn',d);
 const ve=(k,foco)=>{i=Math.max(0,Math.min(n-1,k));S.forEach((x,j)=>{x.hidden=j!==i;x.classList.toggle('entra',j===i)});
  L.forEach((l,j)=>{l.className=j<i?'ok':j===i?'ya':'';if(j===i)l.setAttribute('aria-current','step');else l.removeAttribute('aria-current')});
  pn.textContent='Paso '+(i+1)+' de '+n;A.classList.toggle('no',i===0);A.tabIndex=i?0:-1;
  fin.forEach(x=>{x.hidden=i<(x.dataset.desde!=null?+x.dataset.desde:n-1)});B.hidden=i===n-1;E.hidden=true;hb.scrollTop=0;
  if(P.al&&P.al[i])P.al[i]();if(foco){const h=$('.hq',S[i]);if(h)h.focus({preventScroll:true})}};
 const sigue=()=>{const m=P.ok&&P.ok[i]?P.ok[i]():'';if(m){E.textContent=m;E.hidden=false;return}ve(i+1,true)};
 d.addEventListener('click',e=>{if(e.target.closest('[data-hpa]')){if(i>0)ve(i-1,true)}else if(e.target.closest('[data-hps]'))sigue()});
 d.addEventListener('submit',e=>{if(i<n-1){e.preventDefault();e.stopPropagation();sigue()}},true);
 ve(0,false);return{ve,paso:()=>i,n,falla:m=>{E.textContent=m;E.hidden=false}}}
const waHtml=(txt,a)=>'<div class="wa"><div class="wa-hd"><i>'+esc((a||'C')[0])+'</i><span>'+esc(a||'Cliente')+'<small>WhatsApp</small></span></div><div class="wa-chat"><div class="wa-b">'+esc(txt)+'<time>'+K.hora(Date.now())+'</time></div></div></div>';

/* ===== el marco de cada sección (20-11-2026, lo pidió Oscar: «estructurar la gestión, que quede más fijo») =====
   Arriba, el título; debajo, las pestañas, que se quedan fijas al bajar; en medio, solo lo de la pestaña elegida; y en las
   fichas, la acción principal fija abajo. Cada pestaña tiene su dirección (#/bandeja/marcha, #/aviso/R-0001/cliente…), así
   que el «atrás» vuelve a la de antes. «o.mas»: lo que va también en la parte fija (los días de la agenda) */
const pestas=(L,act,lb,o)=>{o=o||{};return'<div class="fija"><nav class="pestas" aria-label="'+lb+'">'+L.map(x=>'<a href="'+x.h+'" data-pesta="'+x.k+'"'+(o.grupo?' data-grupo="'+o.grupo+'"':'')+(x.k===act?' aria-current="page"':'')+'>'+x.t+(x.n?'<span class="n">'+x.n+'</span>':'')+'</a>').join('')+'</nav>'+(o.mas||'')+'</div>'};
/* ===== piezas ===== */
/* «Voy», con cita, desde media hora antes de su franja (la regla está en el núcleo y, con servidor, la decide él con su
   reloj). Antes, el botón sale apagado y dice a qué hora se enciende; a esa hora la pantalla se vuelve a pintar sola */
const hm=m=>Math.floor(m/60)+':'+String(m%60).padStart(2,'0');
function cuandoVoy(d){const h=K.madrid().date;return(d.dia===h?'':d.dia===K.masDias(h,1)?'mañana ':'el '+K.fechaLarga(d.dia)+' ')+'a las '+hm(d.min)}
function bVoy(A,cl){const t=Date.now(),f=A.cita&&cfg.franjas.find(x=>x.id===A.cita.fr);
 if(K.voyYa(cfg,A,t))return'<button class="'+cl+'" data-a="voy" data-id="'+A.id+'">Voy</button>'+(f&&K.voyTarde(cfg,A,t)?'<p class="ojo tarde" role="status">Vas tarde: la franja empezó a las '+hm(f.de)+'. Pulsa «Voy» al salir y el cliente lo verá.</p>':'');
 const d=K.voyDesde(cfg,A);return'<button class="'+cl+'" disabled data-abre="'+d.dia+' '+d.min+'" aria-describedby="voyN">Disponible '+cuandoVoy(d)+'</button><p class="mnota" id="voyN">«Voy» se enciende media hora antes de la franja. Mientras, mira la dirección, la nota y la foto.</p>'}
let voyT=0;
function voyReloj(){clearTimeout(voyT);const b=$$('[data-abre]');if(!b.length)return;const n=K.madrid(),s=new Date().getSeconds();let min=1e9;
 b.forEach(x=>{const[dia,m]=x.dataset.abre.split(' ');if(dia===n.date)min=Math.min(min,(+m-n.min)*60-s)});
 if(min<3600)voyT=setTimeout(()=>{const a=document.activeElement;if(document.querySelector('dialog[open]')||(a&&a.closest&&a.closest('form')))return voyReloj();pinta()},Math.max(500,min*1000+400))}
function pista(A){const p=[['Recibido',A.t],['Asignado',A.tec&&A.e!=='nuevo'?1:0],['De camino',A.sal],['En casa',A.ini],['Hecho',A.fin]],orden={nuevo:0,ausente:0,cancelado:0,asignado:1,camino:2,curso:3,hecho:4}[A.e];
 /* la hora de cada paso; si un paso fue otro día que el último (una cita pedida días antes), también el día */
 const ult=p.reduce((m,x,i)=>x[1]>1&&i<=orden?x[1]:m,0),ref=ult?K.madrid(ult).date:'',cuando=t=>{const d=K.madrid(t).date;return(d!==ref?diaCorto(d)+', ':'')+K.hora(t)};
 return'<ol class="pista" aria-label="Recorrido del aviso">'+p.map((x,i)=>'<li class="'+(i<=orden?'ok':'')+(i===orden?' ya':'')+'"'+(i===orden?' aria-current="step"':'')+'>'+x[0]+(x[1]>1&&i<=orden?'<time>'+cuando(x[1])+'</time>':'')+'</li>').join('')+'</ol>'}
