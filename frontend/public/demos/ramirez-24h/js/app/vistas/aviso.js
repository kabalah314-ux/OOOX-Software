/* OOOX Oficios · la app (app.html), vistas/aviso. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== el aviso ===== */
function bCliente(A,esT){const c=A.cli;let h='<section class="blq"><h2>Cliente</h2>';
 if(!c.tel)return h+'<p class="gr">Aviso desde la web'+(barrio(A)?', en '+esc(barrio(A)):'')+'</p><p class="ln">Ha abierto WhatsApp desde la web '+hace(A.t)+'. El teléfono y la dirección llegan con su mensaje.</p>'+(esT?'':'<div class="acts"><button class="btn pri" data-a="completar" data-id="'+A.id+'">Completar los datos</button></div>')+'</section>';
 h+=(esT?'<p class="dir">'+esc(c.dir)+'</p><p class="ln">'+esc(c.cp)+' '+esc(barrio(A))+' · '+esc(K.nomCli(c))+'</p>':'<p class="gr">'+esc(K.nomCli(c))+'</p><p class="ln">'+esc(c.dir)+' · '+esc(c.cp)+' '+esc(barrio(A))+'</p>');
 if(A.nota)h+='<p class="dice">'+esc(A.nota)+'</p>';
 if(!esT&&K.noEscribe(S,c.tel))h+='<p class="ln nomsg">No quiere mensajes de seguimiento. <button class="txt" data-a="escribirSi" data-id="'+A.id+'">Volver a escribirle</button></p>';
 /* su idioma (17-11-2026): el de la página donde pidió la cita o el de su último aviso. Sus mensajes, sus papeles y lo que firma salen en él */
 if(IDI){const l=A.idioma||'es';h+='<div class="campo idi" style="margin:10px 0 0"><span class="lb" id="idi_'+A.id+'">Idioma del cliente</span><div class="ops" role="radiogroup" aria-labelledby="idi_'+A.id+'">'+
  IDI.LANGS.map(x=>'<button type="button" class="op" role="radio" aria-checked="'+(x===l)+'" data-a="idioma" data-id="'+A.id+'" data-l="'+x+'" lang="'+x+'">'+IDI.NOMBRE[x]+'</button>').join('')+'</div></div>'}
 if(A.foto)h+=bFoto(A);
 h+='<div class="acts"><button class="btn peq" data-a="llamar" data-id="'+A.id+'">'+I.tel+K.telBonito(c.tel)+'</button><a class="btn peq" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.dir.split(',')[0]+', '+c.cp+' '+N.ciudad)+'">'+I.mapa+'Mapa</a>'+(esT?'':'<button class="btn peq" data-a="zona" data-id="'+A.id+'">Su zona</button>')+'</div>';
 return h+'</section>'}
/* el cliente en el «Resumen» de lo que está por repartir (20-11-2026): quién es, dónde, lo que cuenta y su foto, que es lo
   que hace falta para decidir quién va y qué lleva. Todo lo suyo (llamar, el mapa, su zona, su idioma), en «Cliente» */
const bCuenta=A=>'<section class="blq" id="cuenta"><h2>El cliente</h2><p class="gr">'+esc(K.nomCli(A.cli)||'Aún sin nombre')+'</p><p class="ln">'+esc(A.cli.dir)+(barrio(A)?' · '+esc(barrio(A)):'')+'</p>'+(A.nota?'<p class="dice">'+esc(A.nota)+'</p>':'')+(A.foto?bFoto(A):'')+'</section>';
/* la foto que manda el cliente al pedir cita: la ven la oficina y el técnico que lo lleva (a los demás no les llega el
   aviso), en pequeño y, al tocarla, entera */
const bFoto=A=>'<button type="button" class="fotob" data-a="verFoto" data-id="'+A.id+'" aria-label="Ampliar la foto que ha mandado el cliente"><img class="fotoc" src="'+esc(Oficio.fotoSrc(A.foto))+'" alt=""><span><b>1 foto del cliente</b><small>Toca para verla entera</small></span></button>';
function hFoto(A){hoja(hc('Foto del cliente')+'<div class="hb"><img class="fotog" src="'+esc(Oficio.fotoSrc(A.foto))+'" alt="La foto que ha mandado el cliente, '+esc(cfg.av[A.av].n.toLowerCase())+'">'+(A.nota?'<p class="dice">'+esc(A.nota)+'</p>':'')+'<p class="mnota">Sirve para preparar el material y ver si hace falta llamar antes. No es un diagnóstico: lo que hay que hacer se decide allí.</p></div><div class="hp"><button class="btn ancho" data-x>Cerrar</button></div>',{llena:true})}
function bGar(A){const puede=Q.rol==='centralita'&&['nuevo','asignado','camino','ausente'].includes(A.e);
 /* ya va en garantía (16-11-2026): lo ve también el técnico, para no cobrar lo que no toca */
 if(A.enGar){const de=el(A.enGar.de);return'<p class="ojo" id="garB">En garantía del trabajo '+(de?'<a href="#/aviso/'+de.id+'">'+de.id+'</a>':esc(A.enGar.de))+': no se cobra la visita, la mano de obra ni lo que se puso entonces.'+(puede?' <button class="txt" data-a="noGar" data-id="'+A.id+'">Quitar</button>':'')+'</p>'}
 /* el cliente lo ha pedido desde su zona con «Ha vuelto a fallar» (19-11-2026): se dice, pero la oficina decide igual */
 const G=A.gar0&&el(A.gar0);if(!G)return'';return'<p class="ojo" id="garB">'+(A.vuelve===G.id?'El cliente dice que ha vuelto a fallar ':'Revisar si puede ser garantía: ')+'<a href="#/aviso/'+G.id+'">'+G.id+'</a>, '+esc(cfg.av[G.av].n.toLowerCase())+', terminado el '+K.fechaCorta(K.madrid(G.fin).date)+'. Lo decide la oficina al verlo: al cliente no se le promete nada antes.'+(puede?' <button class="btn peq" data-a="esGar" data-id="'+A.id+'">Es garantía</button>':'')+'</p>'}
/* desde su zona (19-11-2026): la cita es para hacer un presupuesto que no aceptó; y si ha pedido que se borren sus datos */
function bZona(A){let h='';const P=A.dePres&&el(A.dePres);
 if(P&&P.noPres)h+='<p class="ojo" id="presB">El cliente quiere hacer el presupuesto que no aceptó en <a href="#/aviso/'+P.id+'">'+P.id+'</a>: '+K.eur(P.noPres.total)+', '+esc(cfg.av[P.av].n.toLowerCase())+'. El técnico lo puede volver a presentar tal cual.</p>';
 const O=Q.rol==='centralita'&&A.cli&&A.cli.tel?S.avisos.find(x=>x.olvido&&x.cli&&x.cli.tel===A.cli.tel):null;
 if(O)h+='<p class="ojo mal" id="olvB">El cliente pidió '+hace(O.olvido.t)+' que se borren sus datos. Pídeselo a OOOX por escrito: los borra del servidor. Las facturas, en tu programa de facturas, se guardan los años que pide la ley.</p>';
 return h}
function bReparto(A){const r=K.resumen(S,cfg,Date.now()),rep=['nuevo','asignado','ausente'].includes(A.e);
 /* en una urgencia por repartir: en cuánto llegaría cada uno, y si llegaría tarde a su cita o se saldría de su horario */
 const LL=rep&&!A.cita&&!A.tec?K.llegadas(Object.assign({},S,{avisos:S.avisos.filter(x=>x.id!==A.id)}),cfg,A.cli.dis,Date.now(),A.av):[],ll=id=>LL.find(x=>x.tec===id),pri=LL.find(x=>!x.choca&&!x.fuera);
 /* en una cita por repartir: a qué hora llegaría cada uno, con lo que ya lleva ese día */
 const enCita=id=>{if(!rep||!A.cita)return'';const x=K.agendaDe(S,cfg,id,A.cita.dia,A.cita.dia===K.madrid().date?Date.now():null,Object.assign({},A,{tec:id})).find(y=>y.id===A.id);return x?(x.tarde?' · no le da tiempo en esa franja':' · llegaría hacia las '+K.hhmm(x.llega)):''};
 const eta=id=>{const x=ll(id);if(!x)return'';return' · llega en ~'+x.llega+' min'+(x.choca?' (y llegaría tarde a su cita)':x.fuera?' (acabaría fuera de su horario)':pri&&pri.tec===id?' · recomendado: es el que antes llega':'')};
 /* si nadie puede (todos fuera de horario, ausentes o con la franja llena), se dice claro y se da la salida: otra franja */
 const nadie=rep&&!A.tec&&A.cita&&N.tecnicos.length>0&&N.tecnicos.every(t=>!!K.puedeIr(S,cfg,A,t.id,Date.now()));
 return'<section class="blq" id="reparto" tabindex="-1"><h2>'+(A.tec?'Lo lleva':'¿Quién va?')+'</h2>'+(A.reasignar&&!A.tec?'<p class="ojo" style="margin:0 0 10px">Quien lo llevaba ya no puede ir. Elige a otra persona.</p>':'')+(nadie?'<p class="ojo" id="nadieFr" style="margin:0 0 10px">No hay técnico que cumpla la franja. Cambia la cita a otra («Cuándo», más abajo) y avisa al cliente.</p>':'')+'<div class="tecs">'+N.tecnicos.map(t=>{const x=r.tec[t.id],B=x.aviso&&el(x.aviso),no=rep&&A.tec!==t.id?K.puedeIr(S,cfg,A,t.id,Date.now()):'';
  return'<button class="tec'+(no?' no':'')+'" data-a="asignar" data-id="'+A.id+'" data-tec="'+t.id+'" aria-pressed="'+(A.tec===t.id)+'">'+ava(t.id)+'<span><b>'+esc(t.n)+' '+esc(t.ap)+'</b><small>'+(no&&NOVA[no]?NOVA[no](A):x.e==='curso'?'Trabajando en '+esc(barrio(B))+', lleva '+dur(K.minutos(B,Date.now())):x.e==='camino'?'De camino a '+esc(barrio(B)):'Libre ahora')+' · '+(x.hoy+x.hechos)+' hoy'+(no?'':eta(t.id)+enCita(t.id))+'</small></span>'+(A.tec===t.id?'<span class="va">Asignado</span>':'')+'</button>'}).join('')+'</div></section>'}
function bCita(A){const c=A.cita,hoy=K.madrid().date,otras=c&&A.vale?A.vale.filter(v=>!(v.dia===c.dia&&v.fr===c.fr)&&v.dia>=hoy):[];
 return'<section class="blq"><h2>Cuándo</h2><div class="cita"><p>'+(c?'Cita '+diaTxt(c.dia)+', '+frTxt(c.fr)+'. Tarifa normal.':'Urgente: cuanto antes.'+(K.tarifaDe(cfg,A)?' Tarifa de urgencia.':' Tarifa normal.')+(cfg.urge&&A.av!==K.REV?(K.gratisDe(A).includes(cfg.urge)?' Sin suplemento de urgencia: va en su contrato.':K.garanDe(A).includes(cfg.urge)?' Sin suplemento de urgencia: va en garantía.':' Suplemento de urgencia de '+K.eur(cfg.cat[cfg.urge].p10)+', en el presupuesto.'):''))+'</p><button class="btn peq" data-a="cita" data-id="'+A.id+'">'+(c?'Cambiar':'Dar cita')+'</button></div>'+
  (c&&c.ok===false?'<p class="ojo" id="porConf">Pendiente de confirmar con el cliente: esta franja no la eligió él. <button class="txt" data-a="confirma" data-id="'+A.id+'">Ya está hablado</button></p>':'')+
  (c&&c.of&&PORA[c.of]?'<p class="mnota" style="margin-top:8px">'+PORA[c.of]+'</p>':'')+
  (otras.length?'<p class="mnota" style="margin-top:8px">Al cliente también le va bien: '+otras.map(v=>diaCorto(v.dia)+', '+frTxt(v.fr)).join(' · ')+'.</p>':'')+'</section>'}
/* lo que hay que atender antes que nada: citas que no caben, avisos sin técnico porque el suyo falta y citas sin confirmar */
/* los mensajes al cliente que ya tocaba mandar y no se han mandado */
const porMandar=ahora=>K.porMandar(S,ahora),esSeg=x=>K.SEGUIR.includes(x.m.k);
/* por qué toca cada mensaje de seguimiento, en pocas palabras */
const porQue=x=>{const A=x.a,m=x.m,av=cfg.av[A.av],qu=av?av.n.toLowerCase()+', ':'';return m.k==='presupuesto'?qu+'no aceptó '+(A.noPres?K.eur(A.noPres.total):'el presupuesto')+' '+hace(A.fin):m.k==='proxima'&&A.prox?'toca el '+K.fechaCorta(A.prox.dia):qu+'terminado '+hace(A.fin)};
function alertas(ag){const ahora=Date.now(),r=K.resumen(S,cfg,ahora),rea=S.avisos.filter(a=>a.reasignar&&a.e==='nuevo'),conf=S.avisos.filter(a=>a.cita&&a.cita.ok===false&&abiertos.includes(a.e));
 const it=(b,sm,href,atn,da)=>'<li'+(atn?' class="atn"':'')+'>'+(da?'<button type="button" data-a="'+da+'">':'<a href="'+href+'">')+'<b>'+b+'</b>'+(sm?'<small>'+sm+'</small>':'')+(da?'</button>':'</a>')+'</li>';
 /* «Ahora» (auditoría UX-15): lo que bloquea el reparto o deja al cliente sin respuesta. «Después» (D): lo que puede esperar a un rato tranquilo */
 const L=r.sobran.map(x=>it(x.sobran===1?'Sobra 1 cita':'Sobran '+x.sobran+' citas',diaTxt(x.dia)+', '+frTxt(x.fr)+': no hay técnicos para todas','#/equipo/'+x.dia,1)),D=[];
 if(rea.length)L.push(it(rea.length===1?'1 aviso por reasignar':rea.length+' avisos por reasignar','quien lo llevaba ya no puede ir','#/aviso/'+rea[0].id,1));
 /* sin teléfono, dirección y código postal no se puede asignar (el aviso que entra por WhatsApp trae los datos después) */
 {const sd=S.avisos.filter(a=>(a.e==='nuevo'||a.e==='ausente')&&!(a.cli.tel&&a.cli.dir));
  if(sd.length)L.push(it(sd.length===1?'1 aviso sin los datos del cliente':sd.length+' avisos sin los datos del cliente','sin teléfono, dirección y código postal no se puede asignar','#/aviso/'+sd[0].id,1))}
 const M=ag?[]:porMandar(ahora),Mo=M.filter(x=>!esSeg(x)),Ms=M.filter(esSeg);
 if(Mo.length)L.push(it(Mo.length===1?'1 mensaje por mandar':Mo.length+' mensajes por mandar','«'+K.MSG[Mo[0].m.k]+'» a '+esc(K.nomCli(Mo[0].a.cli)||'un cliente')+(Mo.length>1?' y '+(Mo.length-1)+' más':''),'',0,'mensajes'))
 if(conf.length)L.push(it(conf.length===1?'1 cita pendiente de confirmar':conf.length+' citas pendientes de confirmar','con el cliente','#/aviso/'+conf[0].id));
 {const dm=proxLab(),n=new Set([].concat(...K.material(S,cfg,dm).map(g=>[].concat(...g.cosas.map(c=>c.av))))).size;
  if(n)D.push(it((n===1?'1 aviso':n+' avisos')+' de '+diaTxt(dm)+' con material por preparar','mándalo o cárgalo antes','#/equipo/'+dm))}
 /* las furgonetas de quien lleva la cuenta: lo que le falta para el próximo día y lo que hay que reponer */
 {const dm=proxLab(),T=N.tecnicos.filter(x=>FG(x.id)),fa=T.filter(x=>K.cargaDe(S,cfg,x.id,dm,ahora).falta.some(y=>!y.quiza));
  if(fa.length)D.push(it((fa.length===1?'A '+esc(fa[0].n)+' le falta':'A '+fa.length+' técnicos les falta')+' material para '+diaTxt(dm),'según la cuenta de su furgoneta','#/furgo/'+fa[0].id));
  const rp=T.map(x=>({x,r:K.reponerDe(S,cfg,x.id)})).filter(y=>y.r.length),n=rp.reduce((s,y)=>s+y.r.length,0);
  if(n)D.push(it(n===1?'1 cosa por reponer':n+' cosas por reponer',rp.length===1?'en la furgoneta de '+esc(rp[0].x.n):'en '+rp.length+' furgonetas','#/furgo/'+rp[0].x.id))}
 /* contratos y facturas son cosa de la oficina: en la agenda y en el equipo solo sale lo del reparto («ag») */
 if(!ag&&HAY_CON()){const pc=K.pendientesContratos(S,cfg,ahora),n=pc.renovar.length+pc.revision.length;if(n)D.push(it(n===1?'1 contrato pide algo':n+' contratos piden algo',[pc.renovar.length?(pc.renovar.length===1?'una renovación':pc.renovar.length+' renovaciones'):'',pc.revision.length?(pc.revision.length===1?'una revisión sin cita':pc.revision.length+' revisiones sin cita'):''].filter(Boolean).join(' y '),'#/contratos'))}
 if(!ag&&pro()&&r.porFac.viejos)D.push(it((r.porFac.viejos===1?'1 trabajo lleva':r.porFac.viejos+' trabajos llevan')+' más de una semana sin facturar','','#/cobros'));
 /* el seguimiento: lo último, porque puede esperar a un rato tranquilo */
 if(Ms.length){const c=k=>Ms.filter(x=>k.includes(x.m.k)).length,tr=c(['resena','seguimiento']),pr=c(['presupuesto']),vu=c(['proxima']);
  D.push(it(Ms.length===1?'1 cliente para el seguimiento':Ms.length+' clientes para el seguimiento',[tr?(tr===1?'1 trabajo terminado':tr+' trabajos terminados'):'',pr?(pr===1?'1 presupuesto sin respuesta':pr+' presupuestos sin respuesta'):'',vu?(vu===1?'1 al que le toca volver':vu+' a los que les toca volver'):''].filter(Boolean).join(', '),'',0,'seguir'))}
 return{L,D}}
function bAlertas(ag,solo){const{L,D}=alertas(ag);if(solo)return L.length?'<ul class="alertas" id="alAg" aria-label="Lo que hay que hacer ahora">'+L.join('')+'</ul>':'';
 if(!L.length&&!D.length)return'';const ul=(X,lb)=>'<ul class="alertas" aria-label="'+lb+'">'+X.join('')+'</ul>',H=ag?'h2':'h3';
 return'<'+H+' class="ph">Ahora</'+H+'>'+(L.length?ul(L,'Lo que hay que hacer ahora'):'<p class="phn">Nada que corra prisa.</p>')+(D.length?'<'+H+' class="ph">Después</'+H+'>'+ul(D,'Lo que puede esperar'):'')}
/* todos los mensajes por mandar, para mandarlos uno detrás de otro */
function hMensajes(seg){const T=porMandar(Date.now()),M=T.filter(x=>esSeg(x)===!!seg);
 const fila=x=>'<li><span>'+K.MSG[x.m.k]+'<small>'+esc(K.nomCli(x.a.cli)||'Aún sin nombre')+' · '+(seg?esc(porQue(x))+(x.m.hasta?' · caduca el '+K.fechaCorta(K.madrid(x.m.hasta).date):''):x.a.id+' · '+cuandoT(x.m.t))+'</small></span><button class="btn peq" data-a="msg" data-id="'+x.a.id+'" data-k="'+x.m.k+'">Ver</button></li>';
 const tit=seg?(M.length===1?'1 cliente para el seguimiento':M.length+' clientes para el seguimiento'):(M.length===1?'1 mensaje por mandar':M.length+' mensajes por mandar');
 const d=hoja(hc(tit)+'<div class="hb">'+(seg&&M.length?'<p class="dn">Mensajes para después del trabajo. Si alguno no hace falta, déjalo: no pasa nada. Caducan solos.</p>':'')+(M.length?'<ul class="msgs">'+M.map(fila).join('')+'</ul>':'<p class="hueco">'+(seg?'No hay ningún cliente para el seguimiento.':'No queda ningún mensaje por mandar.')+'</p>')+'</div>');
 d.addEventListener('click',e=>{if(e.target.closest('[data-a="msg"]'))d.close()})}
function bDinero(A){if(!A.tot)return'';const T=A.tot,p=A.pago;
 let h='<section class="blq"><h2>'+(A.e==='hecho'?(A.sinTrabajo?'Solo el desplazamiento':'Total del trabajo'):'Presupuesto firmado')+'</h2><p class="gordo num">'+K.eur(T.total)+'</p><p class="ln">IVA del '+T.tipo+' % incluido'+(T.urg?' · tarifa de urgencia':'')+(p?' · '+(p.cobrado?(T.total?'cobrado, '+PAGO[p.modo].toLowerCase():'nada que cobrar: '+(A.enGar?'va en garantía':'va en su contrato')):'pendiente de pago'):'')+'</p>';
 h+='<ul class="lins">'+T.lineas.map(l=>'<li><span>'+esc(l.t)+(lq(l)?', '+lq(l):'')+(l.con?', en su contrato':l.gar?', en garantía':'')+'</span><span class="num">'+(l.con||l.gar?'Incluido':K.eur(l.imp))+'</span></li>').join('')+'</ul>';
 if(A.rebajas&&A.rebajas.length)h+='<p class="ln" id="rebs">'+A.rebajas.map(x=>'Rebajado el '+K.fechaCorta(K.madrid(x.t).date)+' de '+K.eur(x.antes)+' a '+K.eur(x.ahora)+': '+esc(x.motivo)+(x.devolver?'. Hay que devolverle '+K.eur(x.devolver)+'.':'')).join('<br>')+'</p>';
 /* desde su zona, el cliente dice que ya lo ha pagado (19-11-2026): se mira en el banco y se apunta el cobro */
 h+=bDice(A);
 /* en la ficha de la oficina, «Apuntar cobro» y la factura ya van en la barra de abajo (20-11-2026): aquí no se repiten */
 const bar=Q.rol==='centralita'&&A.e==='hecho';
 if(p&&!p.cobrado&&!bar)h+='<div class="acts"><button class="btn pri" data-a="cobrar" data-id="'+A.id+'">Apuntar cobro</button></div>';
 /* corregir (16-11-2026): la oficina, la forma de pago de lo cobrado; la oficina o su técnico mientras trabaja, rebajar el precio */
 {const pu=[];if(Q.rol==='centralita'&&A.e==='hecho'&&T.total>0&&p&&p.cobrado)pu.push('<button class="btn peq" data-a="corrPago" data-id="'+A.id+'">Corregir la forma de pago</button>');
  if(!A.fac&&T.total>0&&((Q.rol==='centralita'&&(A.e==='curso'||A.e==='hecho'))||(Q.rol==='tecnico'&&A.tec===Q.id&&A.e==='curso')))pu.push('<button class="btn peq" data-a="rebajar" data-id="'+A.id+'">Rebajar el precio</button>');
  if(pu.length)h+='<div class="acts" id="corr">'+pu.join('')+'</div>'}
 if(bar&&T.total>0&&(A.fac||!(p&&p.cobrado)))h+='<div class="acts" id="fac">'+(A.fac?'<span class="ln">Facturado'+(A.fac.num?': n.º '+esc(A.fac.num):'')+'.</span> <button class="txt" data-a="desfacturar" data-id="'+A.id+'">Quitar</button>':'<button class="btn peq" data-a="copiaFac" data-id="'+A.id+'">Copiar los datos de la factura</button><button class="btn peq pri" data-a="facturar" data-id="'+A.id+'">Marcar como facturada</button>')+'</div>';
 h+='<div class="docs">'+(A.pres?'<a class="btn peq" href="#/papel/'+A.id+'/presupuesto">Presupuesto</a>':'')+(A.e==='hecho'?'<a class="btn peq" href="#/papel/'+A.id+'/parte">Parte</a>':'')+(A.gar?'<a class="btn peq" href="#/papel/'+A.id+'/garantia">Garantía</a>':'')+'</div>';
 return h+'</section>'}
function bMensajes(A){const L=A.msgs.filter(m=>pro()||m.k!=='resena');if(!L.length)return'';const ahora=Date.now();
 return'<section class="blq"><h2>Mensajes al cliente</h2><ul class="msgs">'+L.map(m=>'<li><span>'+K.MSG[m.k]+'<small>'+(m.env?'Enviado, '+cuandoT(m.env):m.t>ahora?'Para '+(K.madrid(m.t).date===K.madrid().date?'las '+K.hora(m.t):diaTxt(K.madrid(m.t).date)):'Listo para enviar')+'</small></span>'+(m.env?'':'<button class="btn peq" data-a="msg" data-id="'+A.id+'" data-k="'+m.k+'">Ver</button>')+'</li>').join('')+'</ul></section>'}
function bTrabajo(A){const p=K.enPausa(A);
 let h='<section class="blq"><h2>Trabajo</h2><div class="reloj"><div><b class="num" data-reloj="'+A.id+'">'+dur(K.minutos(A,Date.now()))+'</b><small>'+(p?'En pausa':'Empezó a las '+K.hora(A.ini))+'</small></div><button class="btn peq" data-a="pausa" data-id="'+A.id+'">'+(p?'Seguir':'Pausa')+'</button></div>';
 h+='<div class="acts">'+(pro()?'<button class="btn peq" data-a="ampliar" data-id="'+A.id+'">'+I.mas+'Añadir material o tiempo</button>':'')+'<label class="btn peq">Foto<input class="vh" type="file" accept="image/*" capture="environment" data-foto="'+A.id+'"></label></div>';
 if(A.fotos&&A.fotos.length)h+='<div class="fotos">'+A.fotos.map(f=>'<img src="'+esc(Oficio.fotoSrc(f))+'" alt="Foto del trabajo">').join('')+'</div>';
 h+='<div class="campo" style="margin-top:12px"><label for="obs">Nota para el parte</label><textarea id="obs" data-obs="'+A.id+'" placeholder="Opcional. Lo que deba saber quien vuelva a esta casa.">'+esc(A.obs||'')+'</textarea></div>';
 return h+'</section>'}
/* ===== el material que falta: lo apuntan su técnico o la oficina; en «Equipo» se junta por día para mandarlo por WhatsApp ===== */
function bFalta(A){const L=A.falta||[],puede=!['hecho','cancelado'].includes(A.e)&&(Q.rol==='centralita'||A.tec===Q.id);if(!L.length&&!puede)return'';
 return'<section class="blq" id="falta"><h2>Material que falta</h2>'+(L.length?'<ul class="mfal">'+L.map(x=>'<li><span><b class="num">'+x.q+' ×</b> '+esc(x.t)+'</span>'+(puede?'<button class="txt" data-a="quitaFalta" data-id="'+A.id+'" data-k="'+esc(x.k||'')+'" data-t="'+esc(x.t)+'">Quitar</button>':'')+'</li>').join('')+'</ul>'
  :'<p class="ln">Nada apuntado. Lo que se apunte sale en la lista del día.</p>')+
  (puede?'<div class="acts"><button class="btn peq" data-a="falta" data-id="'+A.id+'">'+I.mas+'Apuntar material</button>'+(L.length?'<button class="btn peq" data-a="faltaListo" data-id="'+A.id+'">Ya está todo</button>':'')+'</div>':'')+'</section>'}
function hFalta(A){const mats=Object.keys(cfg.cat).filter(x=>cfg.cat[x].mat);let k='',q=1;
 /* dos pasos (20-11-2026): qué falta y cuántos */
 const d=hoja(hc('Apuntar material')+'<form class="hb" id="faF" novalidate><section class="hpaso" data-t="¿Qué falta?">'+(mats.length?'<div class="ops" role="radiogroup" aria-label="Material">'+mats.map(x=>'<button type="button" class="op" data-fk="'+x+'" role="radio" aria-checked="false">'+esc(cfg.cat[x].t)+'</button>').join('')+'</div>':'')+
  '<div class="campo"><label for="fa_t">'+(mats.length?'O escríbelo':'Escribe qué es')+'</label><input id="fa_t" maxlength="60" placeholder="Por ejemplo, un latiguillo de 40 cm" autocomplete="off"></div></section>'+
  '<section class="hpaso" data-t="¿Cuántos?"><p class="ln" id="fa_que"></p><div class="mq"><span class="st" role="group" aria-label="Cuántos"><button type="button" data-fq="-1" aria-label="Uno menos">−</button><button type="button" data-fq="1" aria-label="Uno más">+</button></span><b class="num" id="fa_q">1</b></div></section>'+
  '<p class="err" id="fa_err" style="color:var(--mal)" hidden></p></form><div class="hp"><button class="btn pri ancho" form="faF">Apuntar</button></div>');
 pasosHoja(d,{ok:[()=>k||$('#fa_t',d).value.trim()?'':'Elige qué falta o escríbelo.'],al:[null,()=>{$('#fa_que',d).textContent=k?cfg.cat[k].t:$('#fa_t',d).value.trim()}]});
 const marca=()=>$$('[data-fk]',d).forEach(x=>x.setAttribute('aria-checked',String(x.dataset.fk===k)));
 d.addEventListener('click',e=>{const b=e.target.closest('[data-fk]');if(b){k=k===b.dataset.fk?'':b.dataset.fk;marca();if(k)$('#fa_t',d).value='';$('#fa_err',d).hidden=true;return}
  const m=e.target.closest('[data-fq]');if(m){q=Math.max(1,Math.min(20,q+ +m.dataset.fq));$('#fa_q',d).textContent=q}});
 $('#fa_t',d).addEventListener('input',e=>{$('#fa_err',d).hidden=true;if(e.target.value.trim()&&k){k='';marca()}});
 $('#faF',d).onsubmit=e=>{e.preventDefault();const t=$('#fa_t',d).value.trim(),m=$('#fa_err',d);if(!k&&!t){m.textContent='Elige qué falta o escríbelo.';m.hidden=false;return}
  const r=Oficio.hacer(k?{tipo:'falta',id:A.id,k,q}:{tipo:'falta',id:A.id,t,q},Q);if(!r.ok){m.textContent=ERR[r.err]||'No se ha podido apuntar.';m.hidden=false;return}
  d.close();toast('Apuntado. Sale en la lista del día.')}}
/* lo que falta de un técnico (o sin técnico) para un día, con el WhatsApp ya escrito: se elige a quién mandarlo */
const bMat=(g,d,tit)=>!g||!g.cosas.length?'':'<div class="mat"><p class="ln"><b>'+(tit||'Material que falta')+'</b></p><ul>'+g.cosas.map(c=>'<li><b class="num">'+c.q+' ×</b> '+esc(c.t)+' <small>'+c.av.map(id=>'<a href="#/aviso/'+id+'">'+id+'</a>').join(', ')+'</small></li>').join('')+'</ul>'+
 '<div class="acts"><a class="btn peq" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(K.textoMaterial(cfg,g,d))+'">Mandar por WhatsApp</a><button class="btn peq" data-a="copiaMat" data-dia="'+d+'" data-tec="'+g.tec+'">Copiar</button></div></div>';
/* ===== la furgoneta (16-11-2026): lo que lleva cada trabajo, lo que hay que cargar y, si el técnico quiere, la cuenta de lo que lleva ===== */
const FG=tec=>K.furgoDe(S,tec),MATS=Object.keys(cfg.cat).filter(k=>cfg.cat[k].mat);
const nHay=(F,k)=>F&&F.st&&Object.prototype.hasOwnProperty.call(F.st,k)&&F.st[k]>0?F.st[k]:0;
const deAv=x=>x.av&&x.av.length?' <small>'+x.av.map(id=>'<a href="#/aviso/'+id+'">'+id+'</a>').join(', ')+(x.fa?', apuntado que falta':'')+'</small>':'';
const lCosas=L=>'<ul class="mfal">'+L.map(x=>'<li><span><b class="num">'+x.q+' ×</b> '+esc(x.t)+deAv(x)+'</span></li>').join('')+'</ul>';
const vacia=c=>!c.lin.length&&!c.quiza.length&&!c.mano.length;
/* lo de dentro: con la cuenta, lo que falta a la vista y lo de cada trabajo plegado («plano»: todo a la vista). «of»: lo mira la oficina */
function cuerpoCarga(c,o){const tu=!o.of,lista=(c.lin.length?lCosas(c.lin):'')+(c.quiza.length?'<p class="ln">Por si acaso:</p>'+lCosas(c.quiza):'')+(c.mano.length?'<p class="ln">Apuntado a mano:</p>'+lCosas(c.mano):'');let h='';
 if(c.furgo){const fa=c.falta.filter(x=>!x.quiza),fq=c.falta.filter(x=>x.quiza);
  h+=fa.length?'<p class="mfa">'+(tu?'Te falta':'Le falta')+'</p>'+lCosas(fa):'<p class="mok">'+(tu?'Lo llevas todo en la furgoneta.':'Lo lleva todo en la furgoneta.')+'</p>';
  if(fq.length)h+='<p class="ln">Por si acaso, no '+(tu?'llevas':'lleva')+':</p>'+lCosas(fq);
  h+=o.plano?'<p class="ln" style="margin-top:8px"><b>Lo que lleva cada trabajo</b></p>'+lista:'<details class="mdet"><summary>Lo que lleva cada trabajo</summary>'+lista+'</details>'}
 else h+=lista;
 return h+'<div class="acts">'+(c.furgo&&c.falta.length?'<button class="btn peq pri" data-a="fCargar" data-tec="'+c.tec+'" data-dia="'+c.dia+'">He cargado</button>':'')+'<button class="btn peq" data-a="copiaCarga" data-tec="'+c.tec+'" data-dia="'+c.dia+'">Copiar la lista</button></div>'}
const tituloDia=d=>diaTxt(d).replace(/^el /,'').replace(/^./,x=>x.toUpperCase());
const nTrab=c=>c.av.length===1?'1 trabajo':c.av.length+' trabajos';
/* el material de un día, para el técnico */
const bCarga=(c,o)=>vacia(c)?'':'<div class="carga" data-dia="'+c.dia+'"><p class="ln"><b>'+tituloDia(c.dia)+'</b> <small>'+nTrab(c)+'</small></p>'+cuerpoCarga(c,o||{})+'</div>';
/* en «Equipo»: el material del día de cada técnico, plegado; con la cuenta, lo que le falta a la vista */
function bCargaEq(tec,d){const c=K.cargaDe(S,cfg,tec,d,Date.now());let h='';
 if(c.furgo){const fa=c.falta.filter(x=>!x.quiza),rp=c.reponer;
  h+='<p class="ln fgq">Furgoneta: '+(!c.av.length?'sin trabajos este día':fa.length?'le falta '+(fa.length===1?'1 cosa':fa.length+' cosas'):'lo lleva todo')+(rp.length?'; '+(rp.length===1?'1 cosa por reponer':rp.length+' cosas por reponer'):'')+'. <a class="txt" href="#/furgo/'+tec+'">Ver la furgoneta</a></p>'}
 if(!vacia(c))h+='<details class="carga"><summary class="cs">Material del día</summary>'+cuerpoCarga(c,{of:1,plano:1})+'</details>';
 return h}
