/* OOOX Oficios · los papeles de un aviso: el presupuesto, el parte de trabajo y la garantía.
   Son los mismos en la app de la oficina (app.html) y en la zona del cliente (cliente.html).
   Solo usan lo que el cliente puede ver de su aviso (lo que da K.perfilCliente): nunca el diario ni los mensajes.
   Uso: OficioPapeles.doc(aviso, 'presupuesto' | 'parte' | 'garantia', {K, N, cfg, firmaSvg}) devuelve el HTML del papel. */
(function(g){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGO={efectivo:'Efectivo',tarjeta:'Tarjeta',bizum:'Bizum',transferencia:'Transferencia',pendiente:'Lo paga después'};
const dur=m=>m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':'');
const lq=l=>l.un==='h'?dur(Math.round(l.q*60)):l.q>1?l.q+' unidades':'';

/* los papeles que tiene un aviso: el presupuesto si se firmó, el parte si se terminó y la garantía si la tiene */
function tipos(A){if(!A||!A.tot)return[];return[A.pres&&['presupuesto','Presupuesto'],A.e==='hecho'&&['parte','Parte de trabajo'],A.gar&&['garantia','Garantía']].filter(Boolean)}
/* el que se enseña: el pedido si lo tiene; si no, el parte de un trabajo terminado o el primero */
function elige(A,tipo){const T=tipos(A);if(!T.length)return'';return T.find(x=>x[0]===tipo)?tipo:T[T.length>1&&A.e==='hecho'?1:0][0]}

function doc(A,tipo,o){const K=o.K,N=o.N,cfg=o.cfg,firmaSvg=o.firmaSvg,f=K.fechaCorta,PCT=Math.round(cfg.recargo*100);
 tipo=elige(A,tipo);if(!tipo)return'';
 const MARCA=esc(N.marca[0])+(N.marca[1]?'<span>'+esc(N.marca[1])+'</span>':'');
 const c=A.cli,av=cfg.av[A.av]||{n:''},t=cfg.tec[A.tec]||{n:'',ap:''};
 const cab='<div class="dh"><span class="wm">'+MARCA+'</span><p>'+esc(N.razon)+' · NIF '+N.nif+'<br>'+esc(N.dir)+' · '+N.tel+'</p></div>';
 const cli='<div class="dos"><div><h2>Cliente</h2><p><b>'+esc(K.nomCli(c))+'</b><br>'+esc(c.dir)+'<br>'+esc(c.cp)+' '+esc(N.ciudad)+' · '+K.telBonito(c.tel)+'</p></div><div><h2>Trabajo</h2><p>'+esc(av.n)+'<br>Técnico: '+esc((t.n+' '+t.ap).trim())+'<br>'+(A.cita?'Con cita':'Aviso urgente')+' · '+(A.tot.urg?'tarifa de urgencia':'tarifa normal')+'</p></div></div>';
 const lin=L=>L.map(l=>'<div class="lin"><span>'+esc(l.t)+'</span><b>'+K.eur(l.imp)+'</b>'+(lq(l)||l.u?'<small>'+[lq(l),l.u?'con el '+PCT+' % de urgencia':''].filter(Boolean).join(' · ')+'</small>':'')+'</div>').join('');
 const tot=T=>'<div class="tot"><span>Total</span><span class="num">'+K.eur(T.total)+'</span></div><p class="iva">IVA del '+T.tipo+' % incluido: base '+K.eur(T.base)+' + IVA '+K.eur(T.iva)+(T.motivo==='material'?'. El material pasa del 40 % del trabajo.':T.motivo==='local'?'. Local o vivienda de menos de dos años.':'')+'</p>';
 const fir=(x,txt)=>x?'<div class="fir">'+firmaSvg(x.firma)+'<small>'+txt+' el '+f(K.madrid(x.t).date)+' a las '+K.hora(x.t)+'</small></div>':'';
 let d='';
 if(tipo==='presupuesto')d='<h1>Presupuesto</h1><p class="dn">N.º P-'+A.id+' · '+f(K.madrid(A.pres.t).date)+', '+K.hora(A.pres.t)+'</p>'+cli+'<h2>Lo que se va a hacer</h2>'+lin(A.pres.lineas)+tot(A.pres)+'<h2>Aceptado por el cliente</h2>'+fir(A.pres,'Firmado en el móvil del técnico')+
  (A.amp?'<h2>Ampliaciones firmadas después</h2>'+A.amp.map(m=>'<div class="lin"><span>'+m.lineas.map(l=>esc(l.t)+(lq(l)?', '+lq(l):'')).join(' · ')+'</span><b>+ '+K.eur(m.dif)+'</b><small>Firmada a las '+K.hora(m.t)+(m.dif!==m.lineas.reduce((s,l)=>s+l.imp,0)?'. Incluye el cambio de IVA de todo el trabajo':'')+'</small></div>').join(''):'')+
  '<p class="pie">Precio cerrado antes de empezar. Si durante el trabajo hace falta algo más, se dice el precio y se firma antes de hacerlo.</p><p class="sello">Precio cerrado</p>';
 else if(tipo==='parte')d='<h1>Parte de trabajo</h1><p class="dn">N.º '+A.id+' · '+f(K.madrid(A.fin).date)+'</p>'+cli+'<h2>Tiempos</h2><p>Aviso: '+K.hora(A.t)+' · Llegada: '+K.hora(A.ini||A.fin)+' · Fin: '+K.hora(A.fin)+(A.sinTrabajo?'':' · Trabajo: '+dur(A.min||0))+'</p>'+
  '<h2>'+(A.sinTrabajo?'El cliente no aceptó el presupuesto':'Trabajo y material')+'</h2>'+lin(A.tot.lineas)+tot(A.tot)+'<h2>Pago</h2><p>'+(A.pago&&A.pago.cobrado?'Cobrado el '+f(K.madrid(A.pago.t).date)+': '+(PAGO[A.pago.modo]||'').toLowerCase()+'.':'Pendiente de pago.')+'</p>'+
  (A.obs?'<h2>Nota del técnico</h2><p>'+esc(A.obs)+'</p>':'')+(A.fotos&&A.fotos.length?'<h2>Fotos</h2><div class="fotos">'+A.fotos.map(x=>'<img src="'+esc(x)+'" alt="Foto del trabajo">').join('')+'</div>':'')+
  (A.conf?'<h2>Conforme</h2>'+fir(A.conf,'Firmado por el cliente'):'')+'<p class="pie">Este parte no es una factura. La factura la emite '+esc(N.razon)+' con su programa de facturas.'+(A.gar?' Garantía de un año, hasta el '+f(A.gar.hasta)+'.':'')+'</p>';
 else d='<h1>Garantía</h1><p class="dn">Trabajo '+A.id+' · terminado el '+f(K.madrid(A.fin).date)+'</p><p class="gran" style="margin-top:18px">1 año</p><p>Hasta el <b>'+f(A.gar.hasta)+'</b>.</p>'+cli+'<h2>Qué cubre</h2><p>'+esc(av.n)+': la mano de obra'+(A.tot.lineas.some(l=>l.mat)?' y el material que pusimos ('+A.tot.lineas.filter(l=>l.mat).map(l=>esc(l.t.toLowerCase())).join(', ')+')':'')+'.</p>'+
  '<p style="margin-top:12px">Si lo que arreglamos vuelve a fallar dentro del año, volvemos sin cobrar el desplazamiento ni la mano de obra.</p><h2>Cómo pedirla</h2><p>Llama al '+N.tel+' o escribe por WhatsApp con el número del trabajo: <b>'+A.id+'</b>.</p><p class="pie">'+esc(N.razon)+' · NIF '+N.nif+'</p><p class="sello">Garantía de '+esc(N.nombre)+'</p>';
 return cab+d}

g.OficioPapeles={tipos,elige,doc,esc,PAGO,dur,lq};
})(globalThis);
