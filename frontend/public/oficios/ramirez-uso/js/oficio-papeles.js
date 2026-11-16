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
/* el nombre de un papel: qué es, de qué aviso y de qué día, p. ej. «Parte de trabajo R-0012 16-11-2026». Es el título de la página
   mientras se ve, y el navegador lo propone como nombre del archivo al guardarlo en PDF (auditoría UX-25) */
function nombre(A,tipo,K){const x=tipos(A).find(y=>y[0]===elige(A,tipo));if(!x)return'';return x[1]+' '+A.id+' '+K.madrid(A.fin||A.t).date.split('-').reverse().join('-')}

function doc(A,tipo,o){const K=o.K,N=o.N,cfg=o.cfg,firmaSvg=o.firmaSvg,f=K.fechaCorta,PCT=Math.round(cfg.recargo*100);
 tipo=elige(A,tipo);if(!tipo)return'';
 const MARCA=esc(N.marca[0])+(N.marca[1]?'<span>'+esc(N.marca[1])+'</span>':'');
 const c=A.cli,av=cfg.av[A.av]||{n:''},t=cfg.tec[A.tec]||{n:'',ap:''};
 const cab='<div class="dh"><span class="wm">'+MARCA+'</span><p>'+esc(N.razon)+' · NIF '+N.nif+'<br>'+esc(N.dir)+' · '+N.tel+(N.email?' · '+esc(N.email):'')+'</p></div>';
 const cli='<div class="dos"><div><h2>Cliente</h2><p><b>'+esc(K.nomCli(c))+'</b><br>'+esc(c.dir)+'<br>'+esc(c.cp)+' '+esc(N.ciudad)+' · '+K.telBonito(c.tel)+'</p></div><div><h2>Trabajo</h2><p>'+esc(av.n)+'<br>Técnico: '+esc((t.n+' '+t.ap).trim())+'<br>'+(A.cita?'Con cita':'Aviso urgente')+' · '+(A.tot.urg?'tarifa de urgencia':'tarifa normal')+'</p></div></div>';
 const lin=L=>L.map(l=>'<div class="lin"><span>'+esc(l.t)+'</span><b>'+(l.con?'Incluido':K.eur(l.imp))+'</b>'+(lq(l)||l.u||l.con?'<small>'+[lq(l),l.u?'con el '+PCT+' % de urgencia':'',l.con?'va en tu contrato de mantenimiento':''].filter(Boolean).join(' · ')+'</small>':'')+'</div>').join('');
 const tot=T=>'<div class="tot"><span>Total</span><span class="num">'+K.eur(T.total)+'</span></div><p class="iva">IVA del '+T.tipo+' % incluido: base '+K.eur(T.base)+' + IVA '+K.eur(T.iva)+(T.motivo==='material'?'. El material pasa del 40 % del trabajo.':T.motivo==='local'?'. Local o vivienda de menos de dos años.':'')+'</p>';
 const fir=(x,txt)=>x?'<div class="fir">'+firmaSvg(x.firma)+'<small>'+txt+' el '+f(K.madrid(x.t).date)+' a las '+K.hora(x.t)+'</small></div>':'';
 /* el desistimiento (ley de consumidores). Texto provisional hasta que lo revise el abogado */
 const ley=c=>c==='cita'?'Tienes 14 días naturales desde la firma para desistir de este trabajo sin dar ningún motivo, con el formulario de abajo o como prefieras.'
  :c==='urgente+'?'La reparación urgente que pediste no tiene derecho de desistimiento (artículo 103 h de la ley de consumidores). Lo añadido que no es la reparación sí lo tiene: 14 días naturales desde la firma, con el formulario de abajo o como prefieras.'
  :'La reparación urgente que pediste no tiene derecho de desistimiento (artículo 103 h de la ley de consumidores).';
 /* el apartado vale para todo el aviso: si lo añadido llegó en una ampliación, también cuenta (antes del 15-11 no había nada) */
 const desist=X=>{const P=X.pres&&X.pres.des;if(!P)return'';const amps=(X.amp||[]).filter(m=>m&&m.des),extra=l=>!!(l&&cfg.cat[l.k]&&cfg.cat[l.k].extra);
  const c=P.c==='cita'?'cita':P.c==='urgente+'||amps.some(m=>m.des.c==='urgente+')?'urgente+':'urgente';
  const grupos=c!=='urgente+'?[]:[].concat(P.c==='urgente+'?[{t:X.pres.t,l:X.pres.lineas}]:[],amps.filter(m=>m.des.c==='urgente+').map(m=>({t:m.t,l:m.lineas})))
   .map(g=>({t:g.t,l:(g.l||[]).filter(extra)})).filter(g=>g.l.length);
  const que=c==='cita'?'del contrato del servicio del aviso '+esc(X.id)+', firmado el '+f(K.madrid(X.pres.t).date)
   :grupos.length?'de lo añadido en el aviso '+esc(X.id)+': '+grupos.map(g=>g.l.map(l=>esc(l.t)).join(', ')+', firmado el '+f(K.madrid(g.t).date)).join('; ')
   :'de lo añadido en el aviso '+esc(X.id)+' que no es la reparación urgente';
  return'<h2>Desistimiento</h2><p>'+ley(c)+'</p>'+(P.pide?'<p>Pediste que lo hiciéramos ya, el '+f(K.madrid(P.pide).date)+' a las '+K.hora(P.pide)+', sabiendo que, cuando esté hecho, ya no podrás desistir. Si desistes antes de que acabemos, pagas la parte hecha.</p>':'')+
   (K.pideYa(c)?'<div class="fdes"><h3>Formulario de desistimiento</h3><p>Rellénalo y envíalo solo si quieres desistir del contrato.</p><p>A '+esc(N.razon)+', '+esc(N.dir)+', teléfono '+esc(N.tel)+(N.email?', correo '+esc(N.email):'')+':<br>Por la presente te comunico que desisto '+que+'.<br>Nombre del cliente: …………<br>Dirección del cliente: …………<br>Firma (solo si se envía en papel): …………<br>Fecha: …………</p></div>':'')};
 let d='';
 if(tipo==='presupuesto')d='<h1>Presupuesto</h1><p class="dn">N.º P-'+A.id+' · '+f(K.madrid(A.pres.t).date)+', '+K.hora(A.pres.t)+'</p>'+cli+'<h2>Lo que se va a hacer</h2>'+lin(A.pres.lineas)+tot(A.pres)+'<h2>Aceptado por el cliente</h2>'+fir(A.pres,'Firmado en el móvil del técnico')+
  (A.amp?'<h2>Ampliaciones firmadas después</h2>'+A.amp.map(m=>'<div class="lin"><span>'+m.lineas.map(l=>esc(l.t)+(lq(l)?', '+lq(l):'')).join(' · ')+'</span><b>+ '+K.eur(m.dif)+'</b><small>Firmada a las '+K.hora(m.t)+(m.des&&m.des.pide?'. Pidió que se hiciera ya, sabiendo que, hecho, ya no podrá desistir':'')+(m.dif!==m.lineas.reduce((s,l)=>s+l.imp,0)?'. Incluye el cambio de IVA de todo el trabajo':'')+'</small></div>').join(''):'')+
  desist(A)+'<p class="pie">Precio cerrado antes de empezar. Si durante el trabajo hace falta algo más, se dice el precio y se firma antes de hacerlo.</p><p class="sello">Precio cerrado</p>';
 else if(tipo==='parte')d='<h1>Parte de trabajo</h1><p class="dn">N.º '+A.id+' · '+f(K.madrid(A.fin).date)+'</p>'+cli+'<h2>Tiempos</h2><p>Aviso: '+K.hora(A.t)+' · Llegada: '+K.hora(A.ini||A.fin)+' · Fin: '+K.hora(A.fin)+(A.sinTrabajo?'':' · Trabajo: '+dur(A.min||0))+'</p>'+
  '<h2>'+(A.sinTrabajo?'El cliente no aceptó el presupuesto':'Trabajo y material')+'</h2>'+lin(A.tot.lineas)+tot(A.tot)+'<h2>Pago</h2><p>'+(A.tot&&!A.tot.total?'No hay nada que pagar: va en tu contrato de mantenimiento.':A.pago&&A.pago.cobrado?'Cobrado el '+f(K.madrid(A.pago.t).date)+': '+(PAGO[A.pago.modo]||'').toLowerCase()+'.':'Pendiente de pago.')+'</p>'+
  (A.obs?'<h2>Nota del técnico</h2><p>'+esc(A.obs)+'</p>':'')+(A.fotos&&A.fotos.length?'<h2>Fotos</h2><div class="fotos">'+A.fotos.map(x=>'<img src="'+esc(x)+'" alt="Foto del trabajo">').join('')+'</div>':'')+
  (A.conf?'<h2>Conforme</h2>'+fir(A.conf,'Firmado por el cliente'):'')+'<p class="pie">Este parte no es una factura. La factura la emite '+esc(N.razon)+' con su programa de facturas'+(A.fac?(A.fac.num?' (factura n.º '+esc(A.fac.num)+')':' (ya está hecha)'):'')+'.'+(A.gar?' Garantía de un año, hasta el '+f(A.gar.hasta)+'.':'')+'</p>';
 else d='<h1>Garantía</h1><p class="dn">Trabajo '+A.id+' · terminado el '+f(K.madrid(A.fin).date)+'</p><p class="gran" style="margin-top:18px">1 año</p><p>Hasta el <b>'+f(A.gar.hasta)+'</b>.</p>'+cli+'<h2>Qué cubre</h2><p>'+esc(av.n)+': la mano de obra'+(A.tot.lineas.some(l=>l.mat)?' y el material que pusimos ('+A.tot.lineas.filter(l=>l.mat).map(l=>esc(l.t.toLowerCase())).join(', ')+')':'')+'.</p>'+
  '<p style="margin-top:12px">Si lo que arreglamos vuelve a fallar dentro del año, volvemos sin cobrar el desplazamiento ni la mano de obra.</p><h2>Cómo pedirla</h2><p>Llama al '+N.tel+' o escribe por WhatsApp con el número del trabajo: <b>'+A.id+'</b>.</p><p class="pie">'+esc(N.razon)+' · NIF '+N.nif+'</p><p class="sello">Garantía de '+esc(N.nombre)+'</p>';
 return cab+d}

/* el contrato de mantenimiento: lo que incluye, el precio, la renovación y la baja, y el desistimiento con su formulario.
   Texto provisional hasta que lo revise el abogado. */
function contrato(C,o){if(!C||!Array.isArray(C.per)||!C.per.length)return'';const K=o.K,N=o.N,cfg=o.cfg,firmaSvg=o.firmaSvg,f=K.fechaCorta;
 const P=K.planDe(cfg,C.plan)||{n:'',iva:21,revisiones:1,desp:'',prioridad:false},c=C.cli,u=C.per[C.per.length-1],alta=K.madrid(C.t).date;
 const MARCA=esc(N.marca[0])+(N.marca[1]?'<span>'+esc(N.marca[1])+'</span>':'');
 const cab='<div class="dh"><span class="wm">'+MARCA+'</span><p>'+esc(N.razon)+' · NIF '+N.nif+'<br>'+esc(N.dir)+' · '+N.tel+(N.email?' · '+esc(N.email):'')+'</p></div>';
 const pago=p=>p.pago.cobrado?'Cobrado el '+f(K.madrid(p.pago.t).date)+': '+(PAGO[p.pago.modo]||'').toLowerCase()+'.':'Pendiente de pago.';
 const inc=['<li>'+(P.revisiones===1?'Una revisión':P.revisiones+' revisiones')+' de la instalación al año, con el desplazamiento.</li>',P.desp||cfg.urge?'<li>En las urgencias, sin '+[P.desp?'desplazamiento':'',cfg.urge?'suplemento de urgencia':''].filter(Boolean).join(' ni ')+'.</li>':'',P.prioridad?'<li>Prioridad: tus avisos se atienden los primeros.</li>':'',
  '<li>Lo demás (el material y las reparaciones) con los precios de siempre, y siempre con el presupuesto firmado antes de hacerlo.</li>'].join('');
 return cab+'<h1>Contrato de mantenimiento</h1><p class="dn">N.º '+esc(C.id)+' · alta el '+f(alta)+'</p>'+
  '<div class="dos"><div><h2>Cliente</h2><p><b>'+esc(K.nomCli(c))+'</b><br>'+esc(c.dir)+'<br>'+esc(c.cp)+' '+esc(N.ciudad)+' · '+K.telBonito(c.tel)+'</p></div><div><h2>Plan</h2><p>'+esc(P.n)+'<br>'+K.eur(u.precio)+' al año, IVA del '+P.iva+' % incluido<br>Del '+f(u.de)+' al '+f(u.a)+'</p></div></div>'+
  '<h2>Qué incluye</h2><ul class="inc">'+inc+'</ul>'+
  '<h2>Pago</h2><p>'+pago(u)+' El cobro lo hace '+esc(N.razon)+', como siempre.</p>'+
  (C.per.length>1?'<h2>Años anteriores</h2>'+C.per.slice(0,-1).map(p=>'<div class="lin"><span>Del '+f(p.de)+' al '+f(p.a)+'</span><b>'+K.eur(p.precio)+'</b><small>'+pago(p)+'</small></div>').join(''):'')+
  '<h2>Renovación y baja</h2><p>No se renueva solo: al acabar el año te lo preguntamos, y sigue solo si dices que sí. Puedes darte de baja cuando quieras, sin penalización.</p>'+
  (C.e==='baja'&&C.baja?'<p><b>De baja desde el '+f(K.madrid(C.baja.t).date)+(C.baja.des?', desistiendo dentro de los 14 días':'')+'.</b></p>':'')+
  '<h2>Desistimiento</h2><p>Tienes 14 días naturales desde el alta, hasta el '+f(K.masDias(alta,14))+', para desistir sin dar ningún motivo, con el formulario de abajo o como prefieras.</p>'+
  (C.des&&C.des.pide?'<p>Pediste que la revisión se hiciera antes de esos 14 días, el '+f(K.madrid(C.des.pide).date)+' a las '+K.hora(C.des.pide)+'. Si desistes después de la revisión, pagas la parte proporcional del servicio.</p>':'')+
  '<div class="fdes"><h3>Formulario de desistimiento</h3><p>Rellénalo y envíalo solo si quieres desistir del contrato.</p><p>A '+esc(N.razon)+', '+esc(N.dir)+', teléfono '+esc(N.tel)+(N.email?', correo '+esc(N.email):'')+':<br>Por la presente te comunico que desisto del contrato de mantenimiento '+esc(C.id)+', con alta el '+f(alta)+'.<br>Nombre del cliente: …………<br>Dirección del cliente: …………<br>Firma (solo si se envía en papel): …………<br>Fecha: …………</p></div>'+
  '<h2>Aceptado por el cliente</h2>'+(C.acepta==='firma'&&C.firma?'<div class="fir">'+firmaSvg(C.firma)+'<small>Firmado el '+f(alta)+' a las '+K.hora(C.t)+'</small></div>':'<p>Aceptado por mensaje el '+f(alta)+' a las '+K.hora(C.t)+'.</p>')+
  '<p class="pie">Este papel no es una factura. La factura de la cuota la emite '+esc(N.razon)+' con su programa de facturas.</p>'}

g.OficioPapeles={tipos,elige,nombre,doc,contrato,esc,PAGO,dur,lq};
})(globalThis);
