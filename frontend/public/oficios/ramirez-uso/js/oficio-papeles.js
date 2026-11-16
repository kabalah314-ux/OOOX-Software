/* OOOX Oficios · los papeles de un aviso: el presupuesto, el parte de trabajo y la garantía.
   Son los mismos en la app de la oficina (app.html) y en la zona del cliente (cliente.html).
   Solo usan lo que el cliente puede ver de su aviso (lo que da K.perfilCliente): nunca el diario ni los mensajes.
   Uso: OficioPapeles.doc(aviso, 'presupuesto' | 'parte' | 'garantia', {K, N, cfg, firmaSvg}) devuelve el HTML del papel.
   En la zona del cliente salen en su idioma (js/oficio-idioma.js); en la oficina, sin ese archivo, en castellano.
   Las traducciones, como el texto en castellano, son provisionales hasta que las revise el abogado. */
(function(g){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* el texto en el idioma del cliente; sin el archivo de idiomas, el castellano con sus datos puestos */
const _=(s,v)=>{const I=g.OficioIdioma;if(I)return I.T(s,v);s=String(s==null?'':s);if(v)for(const k in v)s=s.split('{'+k+'}').join(v[k]);return s};
const PAGO={efectivo:'Efectivo',tarjeta:'Tarjeta',bizum:'Bizum',transferencia:'Transferencia',pendiente:'Lo paga después'};
const dur=m=>m<1?_('menos de 1 min'):m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':'');
const lq=l=>l.un==='h'?dur(Math.round(l.q*60)):l.q>1?_('{n} unidades',{n:l.q}):'';
/* el nombre de una línea: lo del catálogo, en el idioma del cliente; lo escrito a mano por el técnico, tal cual */
const lt=l=>l.k!=='otro'?_(l.t):l.t==='Otro material'?_('Otro material'):l.t;
/* lo que dura una garantía, dicho como se dice: «1 año», «6 meses», «2 años» (16-11-2026: antes decía siempre un año) */
const plazo=m=>!(m>0)?'':m%12===0?(m===12?_('1 año'):_('{n} años',{n:m/12})):(m===1?_('1 mes'):_('{n} meses',{n:m}));
/* los meses entre dos fechas («2026-11-16» y «2027-05-16»): los de la garantía de un trabajo, aunque el negocio cambie su plazo después */
const meses=(a,b)=>typeof a==='string'&&typeof b==='string'?(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7)):0;

/* los papeles que tiene un aviso: el presupuesto si se firmó, el parte si se terminó y la garantía si la tiene */
function tipos(A){if(!A||!A.tot)return[];return[A.pres&&['presupuesto',_('Presupuesto')],A.e==='hecho'&&['parte',_('Parte de trabajo')],A.gar&&['garantia',_('Garantía')]].filter(Boolean)}
/* el que se enseña: el pedido si lo tiene; si no, el parte de un trabajo terminado o el primero */
function elige(A,tipo){const T=tipos(A);if(!T.length)return'';return T.find(x=>x[0]===tipo)?tipo:T[T.length>1&&A.e==='hecho'?1:0][0]}
/* el nombre de un papel: qué es, de qué aviso y de qué día, p. ej. «Parte de trabajo R-0012 16-11-2026». Es el título de la página
   mientras se ve, y el navegador lo propone como nombre del archivo al guardarlo en PDF (auditoría UX-25) */
function nombre(A,tipo,K){const x=tipos(A).find(y=>y[0]===elige(A,tipo));if(!x)return'';return x[1]+' '+A.id+' '+K.madrid(A.fin||A.t).date.split('-').reverse().join('-')}

/* lo que va arriba de los dos papeles: el negocio y el cliente */
const cabDe=N=>{const MARCA=esc(N.marca[0])+(N.marca[1]?'<span>'+esc(N.marca[1])+'</span>':'');
 return'<div class="dh"><span class="wm">'+MARCA+'</span><p>'+esc(N.razon)+' · NIF '+N.nif+'<br>'+esc(_(N.dir))+' · '+N.tel+(N.email?' · '+esc(N.email):'')+'</p></div>'};
/* el formulario de desistimiento (el mismo en el presupuesto y en el contrato); «que» es lo que se desiste, ya escrito */
const formulario=(N,que)=>'<div class="fdes"><h3>'+_('Formulario de desistimiento')+'</h3><p>'+_('Rellénalo y envíalo solo si quieres desistir del contrato.')+'</p><p>'+
 _('A {razon}, {dir}, teléfono {tel}{correo}:',{razon:esc(N.razon),dir:esc(_(N.dir)),tel:esc(N.tel),correo:N.email?_(', correo {correo}',{correo:esc(N.email)}):''})+'<br>'+
 _('Por la presente te comunico que desisto {que}.',{que})+'<br>'+_('Nombre del cliente:')+' …………<br>'+_('Dirección del cliente:')+' …………<br>'+_('Firma (solo si se envía en papel):')+' …………<br>'+_('Fecha:')+' …………</p></div>';

function doc(A,tipo,o){const K=o.K,N=o.N,cfg=o.cfg,firmaSvg=o.firmaSvg,foto=typeof o.foto==='function'?o.foto:(x=>x),f=K.fechaCorta,PCT=Math.round(cfg.recargo*100);
 tipo=elige(A,tipo);if(!tipo)return'';
 const c=A.cli,av=cfg.av[A.av]||{n:''},t=cfg.tec[A.tec]||{n:'',ap:''};
 const cab=cabDe(N);
 const cli='<div class="dos"><div><h2>'+_('Cliente')+'</h2><p><b>'+esc(K.nomCli(c))+'</b><br>'+esc(c.dir)+'<br>'+esc(c.cp)+' '+esc(N.ciudad)+' · '+K.telBonito(c.tel)+'</p></div><div><h2>'+_('Trabajo')+'</h2><p>'+esc(_(av.n))+'<br>'+_('Técnico: {quien}',{quien:esc((t.n+' '+t.ap).trim())})+'<br>'+(A.cita?_('Con cita'):_('Aviso urgente'))+' · '+(A.tot.urg?_('tarifa de urgencia'):_('tarifa normal'))+'</p></div></div>';
 const lin=L=>L.map(l=>'<div class="lin"><span>'+esc(lt(l))+'</span><b>'+(l.con||l.gar?_('Incluido'):K.eur(l.imp))+'</b>'+(lq(l)||l.u||l.con||l.gar?'<small>'+[lq(l),l.u?_('con el {pct} % de urgencia',{pct:PCT}):'',l.con?_('va en tu contrato de mantenimiento'):'',l.gar?_('va en la garantía'):''].filter(Boolean).join(' · ')+'</small>':'')+'</div>').join('');
 const tot=T=>'<div class="tot"><span>'+_('Total')+'</span><span class="num">'+K.eur(T.total)+'</span></div><p class="iva">'+_('IVA del {tipo} % incluido: base {base} + IVA {iva}',{tipo:T.tipo,base:K.eur(T.base),iva:K.eur(T.iva)})+(T.motivo==='material'?'. '+_('El material pasa del 40 % del trabajo.'):T.motivo==='local'?'. '+_('Local o vivienda de menos de dos años.'):'')+'</p>';
 const fir=(x,txt)=>x?'<div class="fir">'+firmaSvg(x.firma)+'<small>'+_('{quien} el {fecha} a las {hora}',{quien:txt,fecha:f(K.madrid(x.t).date),hora:K.hora(x.t)})+'</small></div>':'';
 /* el desistimiento (ley de consumidores). Texto provisional hasta que lo revise el abogado */
 const ley=c=>c==='cita'?_('Tienes 14 días naturales desde la firma para desistir de este trabajo sin dar ningún motivo, con el formulario de abajo o como prefieras.')
  :c==='urgente+'?_('La reparación urgente que pediste no tiene derecho de desistimiento (artículo 103 h de la ley de consumidores).')+' '+_('Lo añadido que no es la reparación sí lo tiene: 14 días naturales desde la firma, con el formulario de abajo o como prefieras.')
  :_('La reparación urgente que pediste no tiene derecho de desistimiento (artículo 103 h de la ley de consumidores).');
 /* el apartado vale para todo el aviso: si lo añadido llegó en una ampliación, también cuenta (antes del 15-11 no había nada) */
 const desist=X=>{const P=X.pres&&X.pres.des;if(!P)return'';const amps=(X.amp||[]).filter(m=>m&&m.des),extra=l=>!!(l&&cfg.cat[l.k]&&cfg.cat[l.k].extra);
  const c=P.c==='cita'?'cita':P.c==='urgente+'||amps.some(m=>m.des.c==='urgente+')?'urgente+':'urgente';
  const grupos=c!=='urgente+'?[]:[].concat(P.c==='urgente+'?[{t:X.pres.t,l:X.pres.lineas}]:[],amps.filter(m=>m.des.c==='urgente+').map(m=>({t:m.t,l:m.lineas})))
   .map(g=>({t:g.t,l:(g.l||[]).filter(extra)})).filter(g=>g.l.length);
  const que=c==='cita'?_('del contrato del servicio del aviso {id}, firmado el {fecha}',{id:esc(X.id),fecha:f(K.madrid(X.pres.t).date)})
   :grupos.length?_('de lo añadido en el aviso {id}: {que}',{id:esc(X.id),que:grupos.map(g=>_('{lineas}, firmado el {fecha}',{lineas:g.l.map(l=>esc(lt(l))).join(', '),fecha:f(K.madrid(g.t).date)})).join('; ')})
   :_('de lo añadido en el aviso {id} que no es la reparación urgente',{id:esc(X.id)});
  return'<h2>'+_('Desistimiento')+'</h2><p>'+ley(c)+'</p>'+(P.pide?'<p>'+_('Pediste que lo hiciéramos ya, el {fecha} a las {hora}, sabiendo que, cuando esté hecho, ya no podrás desistir. Si desistes antes de que acabemos, pagas la parte hecha.',{fecha:f(K.madrid(P.pide).date),hora:K.hora(P.pide)})+'</p>':'')+
   (K.pideYa(c)?formulario(N,que):'')};
 let d='';
 if(tipo==='presupuesto')d='<h1>'+_('Presupuesto')+'</h1><p class="dn">'+_('N.º {num} · {fecha}, {hora}',{num:'P-'+A.id,fecha:f(K.madrid(A.pres.t).date),hora:K.hora(A.pres.t)})+'</p>'+cli+'<h2>'+_('Lo que se va a hacer')+'</h2>'+lin(A.pres.lineas)+tot(A.pres)+'<h2>'+_('Aceptado por el cliente')+'</h2>'+fir(A.pres,_('Firmado en el móvil del técnico'))+
  (A.amp?'<h2>'+_('Ampliaciones firmadas después')+'</h2>'+A.amp.map(m=>'<div class="lin"><span>'+m.lineas.map(l=>esc(lt(l))+(lq(l)?', '+lq(l):'')).join(' · ')+'</span><b>+ '+K.eur(m.dif)+'</b><small>'+_('Firmada a las {hora}',{hora:K.hora(m.t)})+(m.des&&m.des.pide?'. '+_('Pidió que se hiciera ya, sabiendo que, hecho, ya no podrá desistir'):'')+(m.dif!==m.lineas.reduce((s,l)=>s+l.imp,0)?'. '+_('Incluye el cambio de IVA de todo el trabajo'):'')+'</small></div>').join(''):'')+
  desist(A)+'<p class="pie">'+_('Precio cerrado antes de empezar. Si durante el trabajo hace falta algo más, se dice el precio y se firma antes de hacerlo.')+'</p><p class="sello">'+_('Precio cerrado')+'</p>';
 else if(tipo==='parte')d='<h1>'+_('Parte de trabajo')+'</h1><p class="dn">'+_('N.º {num} · {fecha}',{num:A.id,fecha:f(K.madrid(A.fin).date)})+'</p>'+cli+'<h2>'+_('Tiempos')+'</h2><p>'+_('Aviso: {aviso} · Llegada: {llegada} · Fin: {fin}',{aviso:K.hora(A.t),llegada:K.hora(A.ini||A.fin),fin:K.hora(A.fin)})+(A.sinTrabajo?'':' · '+_('Trabajo: {tiempo}',{tiempo:dur(A.min||0)}))+'</p>'+
  '<h2>'+(A.sinTrabajo?_('El cliente no aceptó el presupuesto'):_('Trabajo y material'))+'</h2>'+lin(A.tot.lineas)+tot(A.tot)+(A.rebajas&&A.rebajas.length?'<p class="iva">'+A.rebajas.map(r=>_('Precio rebajado el {fecha}, de {antes} a {ahora}: {motivo}',{fecha:f(K.madrid(r.t).date),antes:K.eur(r.antes),ahora:K.eur(r.ahora),motivo:esc(r.motivo)})).join('<br>')+'</p>':'')+
  '<h2>'+_('Pago')+'</h2><p>'+(A.tot&&!A.tot.total?(A.enGar?_('No hay nada que pagar: va en la garantía.'):_('No hay nada que pagar: va en tu contrato de mantenimiento.')):A.pago&&A.pago.cobrado?_('Cobrado el {fecha}: {modo}.',{fecha:f(K.madrid(A.pago.t).date),modo:_(PAGO[A.pago.modo]||'').toLowerCase()}):_('Pendiente de pago.'))+'</p>'+
  (A.obs?'<h2>'+_('Nota del técnico')+'</h2><p>'+esc(A.obs)+'</p>':'')+(A.fotos&&A.fotos.length?'<h2>'+_('Fotos')+'</h2><div class="fotos">'+A.fotos.map(x=>'<img src="'+esc(foto(x))+'" alt="'+_('Foto del trabajo')+'">').join('')+'</div>':'')+
  (A.conf?'<h2>'+_('Conforme')+'</h2>'+fir(A.conf,_('Firmado por el cliente')):'')+'<p class="pie">'+_('Este parte no es una factura.')+' '+_('La factura la emite {razon} con su programa de facturas{num}.',{razon:esc(N.razon),num:A.fac?(A.fac.num?' '+_('(factura n.º {num})',{num:esc(A.fac.num)}):' '+_('(ya está hecha)')):''})+(A.gar?' '+_('Garantía de {plazo}, hasta el {fecha}.',{plazo:plazo(meses(K.madrid(A.fin).date,A.gar.hasta)),fecha:f(A.gar.hasta)}):'')+'</p>';
 else d='<h1>'+_('Garantía')+'</h1><p class="dn">'+_('Trabajo {id} · terminado el {fecha}',{id:A.id,fecha:f(K.madrid(A.fin).date)})+'</p><p class="gran" style="margin-top:18px">'+plazo(meses(K.madrid(A.fin).date,A.gar.hasta))+'</p><p>'+_('Hasta el {fecha}.',{fecha:'<b>'+f(A.gar.hasta)+'</b>'})+'</p>'+cli+'<h2>'+_('Qué cubre')+'</h2><p>'+(A.tot.lineas.some(l=>l.mat)?_('{averia}: la mano de obra y el material que pusimos ({material}).',{averia:esc(_(av.n)),material:A.tot.lineas.filter(l=>l.mat).map(l=>esc(lt(l).toLowerCase())).join(', ')}):_('{averia}: la mano de obra.',{averia:esc(_(av.n))}))+'</p>'+
  '<p style="margin-top:12px">'+_('Si lo que arreglamos vuelve a fallar antes de esa fecha, volvemos sin cobrarte la visita ni la mano de obra.')+'</p><h2>'+_('Cómo pedirla')+'</h2><p>'+_('Llama al {tel} o escribe por WhatsApp con el número del trabajo: {id}.',{tel:N.tel,id:'<b>'+A.id+'</b>'})+'</p><p class="pie">'+esc(N.razon)+' · NIF '+N.nif+'</p><p class="sello">'+_('Garantía de {n}',{n:esc(N.nombre)})+'</p>';
 return cab+d}

/* el contrato de mantenimiento: lo que incluye, el precio, la renovación y la baja, y el desistimiento con su formulario.
   Texto provisional hasta que lo revise el abogado. */
function contrato(C,o){if(!C||!Array.isArray(C.per)||!C.per.length)return'';const K=o.K,N=o.N,cfg=o.cfg,firmaSvg=o.firmaSvg,f=K.fechaCorta;
 const P=K.planDe(cfg,C.plan)||{n:'',iva:21,revisiones:1,desp:'',prioridad:false},c=C.cli,u=C.per[C.per.length-1],alta=K.madrid(C.t).date;
 const cab=cabDe(N);
 const pago=p=>p.pago.cobrado?_('Cobrado el {fecha}: {modo}.',{fecha:f(K.madrid(p.pago.t).date),modo:_(PAGO[p.pago.modo]||'').toLowerCase()}):_('Pendiente de pago.');
  const inc=['<li>'+(P.revisiones===1?_('Una revisión de la instalación al año, con el desplazamiento.'):_('{n} revisiones de la instalación al año, con el desplazamiento.',{n:P.revisiones}))+'</li>',
  P.desp||cfg.urge?'<li>'+(P.desp&&cfg.urge?_('En las urgencias, sin desplazamiento ni suplemento de urgencia.'):P.desp?_('En las urgencias, sin desplazamiento.'):_('En las urgencias, sin suplemento de urgencia.'))+'</li>':'',P.prioridad?'<li>'+_('Prioridad: tus avisos se atienden los primeros.')+'</li>':'',
  '<li>'+_('Lo demás (el material y las reparaciones) con los precios de siempre, y siempre con el presupuesto firmado antes de hacerlo.')+'</li>'].join('');
 return cab+'<h1>'+_('Contrato de mantenimiento')+'</h1><p class="dn">'+_('N.º {num} · alta el {fecha}',{num:esc(C.id),fecha:f(alta)})+'</p>'+
  '<div class="dos"><div><h2>'+_('Cliente')+'</h2><p><b>'+esc(K.nomCli(c))+'</b><br>'+esc(c.dir)+'<br>'+esc(c.cp)+' '+esc(N.ciudad)+' · '+K.telBonito(c.tel)+'</p></div><div><h2>'+_('Plan')+'</h2><p>'+esc(_(P.n))+'<br>'+_('{precio} al año, IVA del {iva} % incluido',{precio:K.eur(u.precio),iva:P.iva})+'<br>'+_('Del {de} al {a}',{de:f(u.de),a:f(u.a)})+'</p></div></div>'+
  '<h2>'+_('Qué incluye')+'</h2><ul class="inc">'+inc+'</ul>'+
  '<h2>'+_('Pago')+'</h2><p>'+pago(u)+' '+_('El cobro lo hace {razon}, como siempre.',{razon:esc(N.razon)})+'</p>'+
  (C.per.length>1?'<h2>'+_('Años anteriores')+'</h2>'+C.per.slice(0,-1).map(p=>'<div class="lin"><span>'+_('Del {de} al {a}',{de:f(p.de),a:f(p.a)})+'</span><b>'+K.eur(p.precio)+'</b><small>'+pago(p)+'</small></div>').join(''):'')+
  '<h2>'+_('Renovación y baja')+'</h2><p>'+_('No se renueva solo: al acabar el año te lo preguntamos, y sigue solo si dices que sí. Puedes darte de baja cuando quieras, sin penalización.')+'</p>'+
  (C.e==='baja'&&C.baja?'<p><b>'+(C.baja.des?_('De baja desde el {fecha}, desistiendo dentro de los 14 días.',{fecha:f(K.madrid(C.baja.t).date)}):_('De baja desde el {fecha}.',{fecha:f(K.madrid(C.baja.t).date)}))+'</b></p>':'')+
  '<h2>'+_('Desistimiento')+'</h2><p>'+_('Tienes 14 días naturales desde el alta, hasta el {fecha}, para desistir sin dar ningún motivo, con el formulario de abajo o como prefieras.',{fecha:f(K.masDias(alta,14))})+'</p>'+
  (C.des&&C.des.pide?'<p>'+_('Pediste que la revisión se hiciera antes de esos 14 días, el {fecha} a las {hora}. Si desistes después de la revisión, pagas la parte proporcional del servicio.',{fecha:f(K.madrid(C.des.pide).date),hora:K.hora(C.des.pide)})+'</p>':'')+
  formulario(N,_('del contrato de mantenimiento {id}, con alta el {fecha}',{id:esc(C.id),fecha:f(alta)}))+
  '<h2>'+_('Aceptado por el cliente')+'</h2>'+(C.acepta==='firma'&&C.firma?'<div class="fir">'+firmaSvg(C.firma)+'<small>'+_('Firmado el {fecha} a las {hora}',{fecha:f(alta),hora:K.hora(C.t)})+'</small></div>':'<p>'+_('Aceptado por mensaje el {fecha} a las {hora}.',{fecha:f(alta),hora:K.hora(C.t)})+'</p>')+
  '<p class="pie">'+_('Este papel no es una factura. La factura de la cuota la emite {razon} con su programa de facturas.',{razon:esc(N.razon)})+'</p>'}

g.OficioPapeles={tipos,elige,nombre,doc,contrato,esc,PAGO,dur,lq,plazo,meses};
})(globalThis);
