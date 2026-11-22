/* OOOX Oficios · la app (app.html), hojas/aviso. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
function hCita(A){let dia=A.cita?A.cita.dia:'',fr=A.cita?A.cita.fr:'',conf=!['cita','web'].includes(A.origen);
 const leVa=(x,f)=>(A.vale||[]).some(v=>v.dia===x&&v.fr===f);
 const d=hoja(hc(A.cita?'Cambiar la cita':'Dar cita')+'<div class="hb" id="cB"></div><div class="hp"><button class="btn pri ancho" id="cOk">Guardar la cita</button>'+(A.cita?'<button class="txt" id="cUr" style="justify-self:center">Pasar a urgente</button>':'')+'</div>');
 const p=()=>{const dias=K.diasDe(S,cfg,Date.now(),6,true,A);if(!dias.find(x=>x.dia===dia))dia=dias[0].dia;const F=K.franjasDe(S,cfg,dia,Date.now(),A.id,A),fS=F.find(f=>f.id===fr&&f.okOf);if(!fS)fr='';
  $('#cB',d).innerHTML='<div class="campo"><span class="lb" id="cB_d">Día</span><div class="ops" role="radiogroup" aria-labelledby="cB_d">'+dias.map(x=>'<button class="op" data-d="'+x.dia+'" role="radio" aria-checked="'+(x.dia===dia)+'">'+diaCorto(x.dia)+'</button>').join('')+'</div></div><div class="campo"><span class="lb" id="cB_f">Franja</span><div class="ops" role="radiogroup" aria-labelledby="cB_f">'+F.map(f=>'<button class="op" data-f="'+f.id+'" role="radio" aria-checked="'+(f.id===fr)+'"'+(f.okOf?'':' disabled')+'>'+f.txt+'<small>'+(leVa(dia,f.id)?'le va bien · ':'')+frOf(f)+'</small></button>').join('')+'</div></div>'+
   (fS&&fS.por?'<p class="dn" id="c_por">'+PORL[fS.por]+'</p>':'')+
   (fS&&!leVa(dia,fr)?'<label class="chk"><input type="checkbox" id="cConf"'+(conf?' checked':'')+'>Ya lo he hablado con el cliente</label><p class="dn">Si no, la cita queda «pendiente de confirmar».</p>':'')+
   '<p class="dn">Con cita, la tarifa es siempre la normal.</p>'+
   (A.msgs.some(m=>m.k==='ausente'&&!m.env)?'<p class="ojo" id="cAus">El mensaje «'+esc(K.MSG.ausente)+'» aún no se ha mandado. Al dar otra cita se cambia por el de la cita nueva. <button class="txt" id="cMsg">Mandarlo antes</button></p>':'')};
 p();d.addEventListener('change',e=>{if(e.target.id==='cConf')conf=e.target.checked});
 d.addEventListener('click',e=>{const b=e.target.closest('[data-d],[data-f],#cOk,#cUr,#cMsg');if(!b)return;
  if(b.id==='cMsg'){d.close();hMsg(A,'ausente');return}
  if(b.dataset.d){dia=b.dataset.d;fr='';p()}else if(b.dataset.f){fr=b.dataset.f;p()}
  else if(b.id==='cUr'){if(hacer({tipo:'mover',id:A.id,cita:null}).ok){d.close();toast('Pasa a urgente.')}}
  else{if(!fr)return toast('Elige una franja.');const hablado=leVa(dia,fr)||conf;if(hacer({tipo:'mover',id:A.id,cita:{dia,fr},confirmado:conf&&!leVa(dia,fr)}).ok){d.close();toast('Cita guardada: '+diaCorto(dia)+', '+frTxt(fr)+'.'+(hablado?'':' Queda pendiente de confirmar.'))}}})}
function hCompletar(A){const c=A.cli;
 const d=hoja(hc('Datos del cliente')+'<form class="hb" id="kF" novalidate><p class="dn">Cópialos de su WhatsApp. Solo se escriben una vez.</p>'+[['tel','Teléfono',c.tel,'type="tel" inputmode="tel"'],['nomap','Nombre y apellidos',K.nomCli(c),'maxlength="140"'],['dir','Calle, número y piso',c.dir,''],['cp','Código postal',c.cp,'inputmode="numeric" maxlength="5"']].map(x=>'<div class="campo"><label for="k_'+x[0]+'">'+x[1]+'</label><input id="k_'+x[0]+'" name="'+x[0]+'" value="'+esc(x[2])+'" autocomplete="off" '+x[3]+'><p class="err" hidden></p></div>').join('')+'</form><div class="hp"><button class="btn pri ancho" form="kF">Guardar</button></div>');
 $('#kF',d).onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),pn=K.parteNombre(f.get('nomap')),r=Oficio.hacer({tipo:'completar',id:A.id,cli:{tel:f.get('tel'),nombre:pn.nombre,apellidos:pn.apellidos,dir:f.get('dir'),cp:f.get('cp')}},Q);
  $$('.campo',d).forEach(x=>{x.classList.remove('mal');$('.err',x).hidden=true});
  if(r.ok){d.close();toast('Datos guardados. Ya se puede repartir.');return}
  const k=r.err==='zona'?'cp':r.err==='nombre'||r.err==='apellidos'?'nomap':r.err,i=$('#k_'+k,d);if(i){const x=i.closest('.campo');x.classList.add('mal');const m=$('.err',x);m.textContent=ERR[r.err];m.hidden=false;i.focus()}else toast(ERR[r.err]||'No se ha podido guardar.')}}
function hCancelar(A){const d=hoja(hc('¿Cancelar el aviso?')+'<div class="hb"><p>'+A.id+', '+esc(cfg.av[A.av].n.toLowerCase())+(K.nomCli(A.cli)?' de '+esc(K.nomCli(A.cli)):'')+'. Sale de la bandeja y, si tenía cita, su hueco queda libre. No se puede deshacer.</p></div><div class="hp"><button class="btn ancho" id="xOk" style="border-color:var(--mal);color:var(--mal)">Cancelar el aviso</button><button class="btn ancho" data-x>Volver</button></div>');
 $('#xOk',d).onclick=()=>{if(hacer({tipo:'cancelar',id:A.id}).ok){d.close();toast('Aviso cancelado.');location.hash='#/bandeja'}}}
const modos=(L,sel)=>'<div class="ops" role="radiogroup" aria-label="Cómo paga">'+L.map(k=>'<button type="button" class="op" data-modo="'+k+'" role="radio" aria-checked="'+(sel===k)+'">'+PAGO[k]+'</button>').join('')+'</div>';
function hCobrar(A){let modo=A.pago&&A.pago.dice?A.pago.dice.modo:'';const d=hoja(hc('Marcar como cobrado')+'<div class="hb"><p>'+A.id+' · '+esc(K.nomCli(A.cli))+' · <b class="num">'+K.eur(A.tot.total)+'</b></p><div id="oM">'+modos(['transferencia','bizum','efectivo','tarjeta'],modo)+'</div></div><div class="hp"><button class="btn pri ancho" id="oOk"'+(modo?'':' disabled')+'>Apuntar cobro</button></div>');
 d.addEventListener('click',e=>{const b=e.target.closest('[data-modo],#oOk');if(!b)return;if(b.dataset.modo){modo=b.dataset.modo;$('#oM',d).innerHTML=modos(['transferencia','bizum','efectivo','tarjeta'],modo);$('#oOk',d).disabled=false}
  else if(hacer({tipo:'cobrar',id:A.id,modo}).ok){d.close();toast('Cobro apuntado: '+K.eur(A.tot.total)+'.')}})}

/* «Marcar como facturada»: la factura la hace el programa del negocio; aquí se apunta que ya está, con su número si se quiere */
function hFacturar(A){const d=hoja(hc('Marcar como facturada')+'<div class="hb"><p>'+A.id+' · '+esc(K.nomCli(A.cli))+' · <b class="num">'+K.eur(A.tot.total)+'</b></p><div class="campo"><label for="fNum">Número de la factura, si quieres</label><input id="fNum" maxlength="30" autocomplete="off"></div><p class="dn">La factura la haces con tu programa de facturas. Aquí solo queda apuntado que ya está hecha, para que no se escape ninguna.</p></div><div class="hp"><button class="btn pri ancho" id="fOk">Marcar como facturada</button></div>');
 $('#fOk',d).onclick=()=>{if(hacer({tipo:'facturar',id:A.id,num:$('#fNum',d).value}).ok){d.close();toast('Marcada como facturada.')}}}
/* copiar un texto: con el portapapeles si el navegador lo deja y, si no, a la antigua */
function copia(t,ok){const vieja=()=>{const x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();let b=false;try{b=document.execCommand('copy')}catch(e){}x.remove();toast(b?ok:'No se ha podido copiar. Los datos están en el parte.')};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>toast(ok),vieja);else vieja()}
/* el mes para la gestoría: una hoja de cálculo. En el móvil se comparte (WhatsApp, correo…); en el ordenador se descarga */
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const mesDe=m=>MESES[+m.slice(5,7)-1]+(m.slice(0,4)!==K.madrid(Date.now()).date.slice(0,4)?' de '+m.slice(0,4):'');
function bajaMes(m){if(!/^\d{4}-\d{2}$/.test(m||''))return;const F=K.trabajosMes(S,cfg,m);if(!F.length)return toast('Ese mes no hay trabajos terminados.');
 const nombre=(N.id||'negocio')+'-trabajos-'+m+'.csv',txt=K.csv(F);let f=null;try{f=new File([txt],nombre,{type:'text/csv'})}catch(e){}
 if(f&&!ANCHO.matches&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'Trabajos de '+mesDe(m)}).catch(()=>{});return}
 const u=URL.createObjectURL(f||new Blob([txt],{type:'text/csv'})),a=document.createElement('a');a.href=u;a.download=nombre;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Descargado: '+nombre+'.')}
function bMes(){const hoy=K.madrid(Date.now()).date,este=hoy.slice(0,7),antes=new Date(Date.UTC(+hoy.slice(0,4),+hoy.slice(5,7)-2,1)).toISOString().slice(0,7);
 return'<section class="sec"><h2>El mes para la gestoría</h2><p class="mnota">Una hoja de cálculo con los trabajos del mes: el cliente, los importes, cómo se pagó y si está facturado. Se abre con Excel o se le manda a la gestoría.</p><div class="acts" style="margin-top:10px">'+
  [este,antes].map(m=>'<button class="btn peq" data-a="mes" data-m="'+m+'">'+(m===este?'Este mes':'El mes de '+mesDe(m))+'</button>').join('')+'</div></section>'}
/* lo que deja cada trabajo, este mes: lo cobrado sin IVA por hora de trabajo. Solo lo ve la oficina */
function bDeja(){const m=K.madrid(Date.now()).date.slice(0,7),R=K.rentabilidad(S,cfg,m+'-01',m+'-31'),ph=x=>x.hora?K.eur(x.hora)+' / h':'—';
 if(!R.av.length)return'<section class="sec"><h2>Lo que deja cada trabajo</h2><p class="hueco">Este mes todavía no hay trabajos terminados.</p></section>';
 return'<section class="sec" id="deja"><h2>Lo que deja cada trabajo, este mes</h2><ul class="lins">'+R.av.map(x=>'<li><span><b>'+esc(cfg.av[x.k]?cfg.av[x.k].n:x.k)+'</b> · '+x.n+(x.n===1?' trabajo':' trabajos')+', '+dur(x.min)+' de media</span><span class="num">'+ph(x)+'</span></li>').join('')+'</ul>'+
  '<p class="mnota" style="margin-top:8px">Es lo cobrado sin IVA por cada hora de trabajo. Lo de arriba es lo que menos deja: lo primero que conviene revisar de precio.</p>'+
  '<ul class="lins">'+[['Urgencias',R.urg],['Con cita',R.cita]].filter(x=>x[1].n).map(x=>'<li><span>'+x[0]+' · '+x[1].n+'</span><span class="num">'+ph(x[1])+'</span></li>').join('')+
  R.tec.map(x=>'<li><span>'+esc(cfg.tec[x.k].n)+' · '+x.n+(x.n===1?' trabajo':' trabajos')+'</span><span class="num">'+ph(x)+'</span></li>').join('')+'</ul>'+
  (R.solo.n?'<p class="mnota" style="margin-top:8px">Además, '+(R.solo.n===1?'1 aviso':R.solo.n+' avisos')+' en los que solo se cobró el desplazamiento: '+K.eur(R.solo.total)+'.</p>':'')+'</section>'}
/* el desistimiento, contado al cliente antes de firmar. Texto provisional hasta que lo revise el abogado */
const DES={cita:'Tienes 14 días para echarte atrás de este trabajo. Si quieres que lo hagamos ya, márcalo: cuando esté hecho, ya no podrás echarte atrás, y si te echas atrás antes de que acabemos, pagarás la parte hecha.',
 'urgente+':'La reparación urgente que has pedido no tiene derecho de desistimiento. Lo añadido que no es la reparación sí: tienes 14 días para echarte atrás. Si quieres que lo hagamos ya, márcalo: cuando esté hecho, ya no podrás.',
 urgente:'Reparación urgente que has pedido: no tiene derecho de desistimiento.'};

/* el presupuesto que firma el cliente y, con otra forma, la ampliación */
function hPrecio(A,ampliar){const av=cfg.av[A.av],urg=ampliar?A.tot.urg:K.tarifaDe(cfg,A),GR=K.gratisDe(A),GA=K.garanDe(A);
 let lin=ampliar?[]:K.iniDe(cfg,A).map(l=>({k:l.k,q:l.q||cfg.cat[l.k].min})),local=ampliar?A.local:false,pad,otro=false,pide=false;
 const base=ampliar?A.lin.map(l=>Object.assign({},l)):[],hayMo=base.some(l=>cfg.cat[l.k]&&cfg.cat[l.k].un==='h'),PASO=HIT?HIT.paso:.25,minMo=ampliar&&hayMo?PASO:(HIT?HIT.min:1);
 const junto=()=>{const J=base.map(l=>Object.assign({},l));lin.forEach(l=>{const ya=l.k!=='otro'&&J.find(x=>x.k===l.k);if(ya)ya.q+=l.q;else J.push(Object.assign({},l))});return J};
 /* paso a paso (20-11-2026): lo que se hace, el precio y, al final, lo que lee y firma el cliente. «No acepta el precio»
    sale desde el precio */
 const d=hoja(hc(ampliar?'Añadir al trabajo':'Presupuesto')+'<div class="hb"><section class="hpaso" data-t="'+(ampliar?'¿Qué añades?':'¿Qué se hace?')+'"><p class="dn">'+A.id+' · '+esc(av.n)+' · '+esc(A.cli.dir)+'</p>'+
  (ampliar?'<p class="tar">Presupuesto firmado: '+K.eur(A.tot.total)+'. Lo que añadas aquí se firma aparte.</p>':'<p class="tar">'+(urg?'Tarifa de urgencia: un '+PCT+' % más en todo menos el material. El aviso entró '+cuandoT(A.t)+'.':'Tarifa normal.')+'</p>')+
  '<ul class="plin" id="pL"></ul><div class="campo"><span class="lb">Añadir</span><div class="ops" id="pC"></div><div id="pO"></div></div></section>'+
  '<section class="hpaso" data-t="'+(ampliar?'El precio nuevo':'El precio')+'">'+(ampliar?'':'<label class="chk"><input type="checkbox" id="pLoc"> Es un local o una vivienda de menos de dos años</label>')+'<div id="pT" style="display:grid;gap:14px"></div></section>'+
  '<section class="hpaso" data-t="Que lo firme el cliente"><div id="pT2"></div><div id="pD"></div>'+
  '<div class="firma"><div class="fh"><span class="lb"'+(A.idioma?' lang="'+A.idioma+'"':'')+'>'+esc(_c('Firma del cliente',null,A.idioma))+'</span><button class="txt" id="pB" type="button">Borrar</button></div><canvas id="pF" aria-label="Zona para firmar con el dedo"></canvas></div>'+
  '<p class="dn"'+(ampliar||!A.idioma?'':' lang="'+A.idioma+'"')+'>'+(ampliar?'Solo se hace si el cliente lo firma antes.':esc(_c('Precio cerrado. Si hace falta algo más, te lo decimos antes y lo firmas.',null,A.idioma)))+'</p></section></div>'+
  '<div class="hp"><button class="btn pri ancho" id="pOk" disabled>'+(ampliar?'Firmado: añadir':'Firmado: empezar')+'</button>'+(ampliar?'':'<button class="txt mal" id="pNo" type="button" style="justify-self:center" data-desde="1">No acepta el precio</button>')+'</div>',{papel:1,llena:1,fijo:1});
 const listo=()=>{$('#pOk',d).disabled=!pad||pad.vacia()||!lin.length||(K.pideYa(K.desiste(cfg,A,lin))&&!pide)};
 /* lo que lee el cliente antes de firmar, en su idioma (17-11-2026) */
 const bDes=()=>{const c=K.desiste(cfg,A,lin),l=A.idioma;return K.pideYa(c)?'<div class="des" id="pDes"'+(l?' lang="'+l+'"':'')+'><p>'+esc(_c(DES[c],null,l))+'</p><label class="chk"><input type="checkbox" id="pPide"'+(pide?' checked':'')+'> '+esc(_c('Quiero que lo hagáis ya',null,l))+'</label></div>':ampliar?'':'<p class="dn"'+(l?' lang="'+l+'"':'')+'>'+esc(_c(DES.urgente,null,l))+'</p>'};
 const p=cambia=>{const T=K.precio(cfg,junto(),{urg,local,gratis:GR,garan:GA}),solo=K.precio(cfg,lin,{urg,tipo:T.tipo,sinMin:ampliar&&hayMo,gratis:GR,garan:GA});
  $('#pL',d).innerHTML=solo.lineas.map((l,i)=>{const it=cfg.cat[l.k],fijo=!ampliar&&!l.mat&&l.un!=='h';
   const g=[lq(l),l.u?'con el '+PCT+' % de urgencia':'',!A.cita&&it&&it.extra?'añadido, con desistimiento':'',l.con?'incluido en su contrato':'',l.gar?'va en la garantía':''].filter(Boolean);
   return'<li><span class="lt">'+esc(l.t)+(g.length?'<small>'+g.join(' · ')+'</small>':'')+'</span>'+
    (l.un==='h'?'<span class="st"><button type="button" data-q="'+i+'" data-m="-1" aria-label="Quitar tiempo"'+(l.q<=minMo?' disabled':'')+'>−</button><button type="button" data-q="'+i+'" data-m="1" aria-label="Añadir tiempo">+</button></span>':fijo?'<span></span>':'<span class="st"><button type="button" data-del="'+i+'" aria-label="Quitar '+esc(l.t)+'">×</button></span>')+'<b class="num">'+K.eur(l.imp)+'</b></li>'}).join('')||'<li><span class="lt" style="color:var(--tinta-2)">Todavía no has añadido nada.</span><span></span><b></b></li>';
  const ya=new Set(lin.map(l=>l.k)),C=(ampliar&&HK?[HK]:[]).concat(av.chips).filter(k=>!ya.has(k));
  $('#pC',d).innerHTML=C.map(k=>'<button type="button" class="op" data-add="'+k+'">'+esc(k===HK?'Más tiempo':cfg.cat[k].t)+'<small>'+(k!==HK&&(GR.includes(k)||GA.includes(k))?'incluido':K.eur(k===HK?porPaso(HIT,T.tipo,urg)*(hayMo?1:Math.round(HIT.min/HIT.paso)):precioDe(k,T.tipo)))+'</small></button>').join('')+'<button type="button" class="op" data-otro>Otro material</button>';
  $('#pO',d).innerHTML=otro?'<div class="otro" style="margin-top:10px"><div class="campo"><label for="oT">Qué es</label><input id="oT" maxlength="60"></div><div class="campo"><label for="oP">Precio, €</label><input id="oP" inputmode="decimal"></div><button type="button" class="btn peq" id="oOk">Añadir</button></div>':'';
  const tot='<div class="ptot"><span>'+(ampliar?'Total nuevo':'Total')+'</span><span class="num">'+K.eur(T.total)+'</span></div><p class="iva">'+(ampliar&&lin.length?K.eur(T.total-A.tot.total)+' más. ':'')+'IVA del '+T.tipo+' % incluido: base '+K.eur(T.base)+' + IVA '+K.eur(T.iva)+'</p>';
  $('#pT',d).innerHTML=tot+(T.motivo==='material'?'<p class="sube">El material pasa del 40 % del trabajo: Hacienda pide el IVA del 21 % en todo el trabajo.</p>':'');
  $('#pT2',d).innerHTML=tot;$('#pD',d).innerHTML=bDes();
  if(cambia&&pad&&!pad.vacia()){pad.borrar();toast('Ha cambiado el precio: hay que firmar otra vez.')}listo()};
 const precioDe=(k,tipo)=>{const it=cfg.cat[k];return tipo===21?it.p21:it.p10},porPaso=(it,tipo,u)=>Math.round((tipo===21?it.p21:it.p10)*it.paso*(u&&it.u?1+cfg.recargo:1));
 p(false);pad=Oficio.firma($('#pF',d),listo);
 pasosHoja(d,{ok:[()=>lin.length?'':'Añade lo que se hace.'],al:[null,null,()=>pad.medir()]});
 d.addEventListener('change',e=>{if(e.target&&e.target.id==='pPide'){pide=e.target.checked;listo()}});
 $('#pB',d).onclick=()=>pad.borrar();
 const loc=$('#pLoc',d);if(loc)loc.onchange=()=>{local=loc.checked;p(true)};
 d.addEventListener('click',e=>{const b=e.target.closest('[data-q],[data-del],[data-add],[data-otro],#oOk,#pOk,#pNo');if(!b)return;
  if(b.dataset.q!=null){const l=lin[+b.dataset.q];l.q=Math.max(minMo,l.q+ +b.dataset.m*PASO);p(true)}
  else if(b.dataset.del!=null){lin.splice(+b.dataset.del,1);p(true)}
  else if(b.dataset.add){lin.push({k:b.dataset.add,q:b.dataset.add===HK?minMo:1});p(true)}
  else if('otro'in b.dataset){otro=!otro;p(false);if(otro)$('#oT',d).focus()}
  else if(b.id==='oOk'){const t=$('#oT',d).value.trim(),v=parseFloat($('#oP',d).value.replace(',','.'));if(!t||!(v>0))return toast('Escribe qué es y cuánto cuesta.');lin.push({k:'otro',t,p:Math.round(v*100)/100,q:1});otro=false;p(true)}
  else if(b.id==='pNo'){d.close();hNoAcepta(A,local,ampliar?null:lin)}
  else if(b.id==='pOk'){const r=ampliar?hacer({tipo:'ampliar',id:A.id,lineas:lin,firma:pad.ruta(),pide}):hacer({tipo:'empezar',id:A.id,pres:{lineas:lin,local,firma:pad.ruta(),pide}});
   if(r.ok){d.close();toast(ampliar?'Ampliación firmada: '+K.eur(r.dif)+' más.':'Presupuesto firmado. Empieza el trabajo.')}}})}
function hNoAcepta(A,local,lin){let modo='';const pres=Array.isArray(lin)&&lin.length?{pres:{lineas:lin}}:{};const T=K.precio(cfg,[{k:N.sinTrabajo,q:1}],{urg:K.tarifaDe(cfg,A),local,gratis:K.gratisDe(A),garan:K.garanDe(A)});
 if(!T.total){const d=hoja(hc('No acepta el precio')+'<div class="hb"><p>'+(A.enGar?'La visita va en la garantía: no se cobra nada.':'El desplazamiento va en su contrato de mantenimiento: no se cobra nada.')+'</p></div><div class="hp"><button class="btn pri ancho" id="nOk">Cerrar el aviso</button></div>');
  $('#nOk',d).onclick=()=>{if(hacer(Object.assign({tipo:'noacepta',id:A.id,local},pres)).ok){d.close();toast(A.enGar?'Aviso cerrado: va en garantía, no se cobra nada.':'Aviso cerrado: va en su contrato, no se cobra nada.')}};return}
 const d=hoja(hc('No acepta el precio')+'<div class="hb"><p>Se cobra solo el desplazamiento.</p><div class="ptot"><span>Total</span><span class="num">'+K.eur(T.total)+'</span></div><p class="iva">IVA del '+T.tipo+' % incluido'+(T.urg?' · tarifa de urgencia':'')+'</p><div class="campo"><span class="lb">¿Cómo paga?</span><div id="nM">'+modos(['efectivo','tarjeta','bizum','pendiente'],'')+'</div></div></div><div class="hp"><button class="btn pri ancho" id="nOk" disabled>Cerrar el aviso</button></div>',{papel:1,fijo:1});
 d.addEventListener('click',e=>{const b=e.target.closest('[data-modo],#nOk');if(!b)return;if(b.dataset.modo){modo=b.dataset.modo;$('#nM',d).innerHTML=modos(['efectivo','tarjeta','bizum','pendiente'],modo);$('#nOk',d).disabled=false}
  else if(hacer(Object.assign({tipo:'noacepta',id:A.id,modo,local},pres)).ok){d.close();toast('Aviso cerrado: solo el desplazamiento.')}})}
const mesesTxt=n=>n%12?n+' meses':n===12?'un año':(n/12)+' años';
function hCierre(A){let modo='',pad;const T=A.tot,vuelve=A.av!==K.REV&&!A.con&&(A.lin||[]).map(l=>cfg.cat[l.k]).find(x=>x&&x.cada)||null;   // con contrato, sus revisiones ya las lleva el contrato
 /* paso a paso (20-11-2026): cómo paga (con lo hecho y el total delante), si quiere que le avisemos cuando toque volver y,
    al final, que firme que está conforme (opcional) */
 const d=hoja(hc('Trabajo terminado')+'<div class="hb"><section class="hpaso" data-t="'+(T.total?'¿Cómo paga?':'Lo que se ha hecho')+'"><p class="dn">'+A.id+' · '+esc(cfg.av[A.av].n)+' · '+dur(K.minutos(A,Date.now()))+' de trabajo</p><ul class="plin">'+T.lineas.map(l=>'<li><span class="lt">'+esc(l.t)+(lq(l)?'<small>'+lq(l)+'</small>':'')+'</span><span></span><b class="num">'+(l.con||l.gar?'Incluido':K.eur(l.imp))+'</b></li>').join('')+'</ul>'+
  '<div class="ptot"><span>Total</span><span class="num">'+K.eur(T.total)+'</span></div><p class="iva">IVA del '+T.tipo+' % incluido: base '+K.eur(T.base)+' + IVA '+K.eur(T.iva)+'</p>'+
  (T.total?'<div id="tM">'+modos(['efectivo','tarjeta','bizum','pendiente'],'')+'</div>':'<p class="dn">'+(A.enGar?'Va en la garantía':'Va en su contrato de mantenimiento')+': no hay nada que cobrar.</p>')+'</section>'+
  (vuelve?'<section class="hpaso" data-t="¿Le avisamos cuando toque volver?"><label class="chk avi" id="tAv"><input type="checkbox" id="tAvi"> <span>Avisarle cuando toque volver: '+esc(vuelve.t.toLowerCase())+', dentro de '+mesesTxt(vuelve.cada)+'<small>Pregúntaselo. Solo si dice que sí.</small></span></label></section>':'')+
  '<section class="hpaso" data-t="¿Firma que está conforme?"><p class="dn">Es opcional. Si no quiere firmar, cierra el trabajo igual.</p><div class="firma"><div class="fh"><span class="lb"'+(A.idioma?' lang="'+A.idioma+'"':'')+'>'+esc(_c('Conforme con el trabajo (opcional)',null,A.idioma))+'</span><button class="txt" id="tB" type="button">Borrar</button></div><canvas id="tF" aria-label="Zona para firmar con el dedo"></canvas></div></section></div>'+
  '<div class="hp"><button class="btn pri ancho" id="tOk"'+(T.total?' disabled':'')+'>Cerrar el trabajo</button></div>',{papel:1,llena:1,fijo:1});
 pad=Oficio.firma($('#tF',d));$('#tB',d).onclick=()=>pad.borrar();
 {const n=vuelve?3:2,al=[];al[n-1]=()=>pad.medir();pasosHoja(d,{ok:[()=>T.total&&!modo?'Elige cómo paga.':''],al})}
 d.addEventListener('click',e=>{const b=e.target.closest('[data-modo],#tOk');if(!b)return;if(b.dataset.modo){modo=b.dataset.modo;$('#tM',d).innerHTML=modos(['efectivo','tarjeta','bizum','pendiente'],modo);$('#tOk',d).disabled=false}
  else if(hacer(Object.assign({tipo:'terminar',id:A.id,firma:pad.vacia()?'':pad.ruta()},T.total?{modo}:{},vuelve&&$('#tAvi',d).checked?{avisar:true}:{})).ok){d.close();toast(!T.total?(A.enGar?'Terminado. Va en garantía: no se cobra nada.':'Terminado. Va en su contrato: no se cobra nada.'):modo==='pendiente'?'Terminado. Queda por cobrar.':'Terminado y cobrado. Garantía de '+mesesTxt(cfg.meses)+'.');location.hash='#/papel/'+A.id+'/parte'}})}

/* corregir la forma de pago de un trabajo cobrado, o dejarlo por cobrar (16-11-2026) */
function hCorrPago(A){let modo='';const L=['efectivo','tarjeta','bizum','transferencia','pendiente'].filter(k=>k!==A.pago.modo);
 const d=hoja(hc('Corregir la forma de pago')+'<div class="hb"><p>'+A.id+' · '+esc(K.nomCli(A.cli))+' · <b class="num">'+K.eur(A.tot.total)+'</b></p><p class="ln">Ahora consta: '+PAGO[A.pago.modo].toLowerCase()+'.</p><div id="oM">'+modos(L,'')+'</div></div><div class="hp"><button class="btn pri ancho" id="oOk" disabled>Corregir</button></div>');
 d.addEventListener('click',e=>{const b=e.target.closest('[data-modo],#oOk');if(!b)return;if(b.dataset.modo){modo=b.dataset.modo;$('#oM',d).innerHTML=modos(L,modo);$('#oOk',d).disabled=false}
  else if(hacer({tipo:'corregirPago',id:A.id,modo}).ok){d.close();toast(modo==='pendiente'?'Corregido: queda por cobrar.':'Corregido: '+PAGO[modo].toLowerCase()+'.')}})}
/* rebajar el precio (16-11-2026): se quita lo que al final no se hace o no se pone; solo hacia abajo y con su motivo */
function hRebajar(A){const L0=A.lin.map(l=>Object.assign({},l)),L=L0.map(l=>Object.assign({},l)),o={urg:A.tot.urg,local:A.local,gratis:K.gratisDe(A),garan:K.garanDe(A)};
 const paso=l=>{const it=cfg.cat[l.k];return it&&it.un==='h'?it.paso:1},vivos=()=>L.filter(l=>l.q>0),cobrado=A.e==='hecho'&&A.pago&&A.pago.cobrado;
 /* dos pasos (20-11-2026): qué se quita y por qué */
 const d=hoja(hc('Rebajar el precio')+'<div class="hb"><section class="hpaso" data-t="¿Qué se quita?"><p class="dn">'+A.id+' · '+esc(cfg.av[A.av].n)+' · ahora '+K.eur(A.tot.total)+'</p><p class="ln">Quita lo que al final no se hace o no se pone. Solo se puede bajar; '+(cobrado?'como ya ha pagado, queda apuntado lo que hay que devolverle.':'el cliente no tiene que volver a firmar.')+'</p>'+
  '<ul class="plin" id="rL"></ul><div class="ptot"><span>Nuevo total</span><span class="num" id="rT"></span></div></section>'+
  '<section class="hpaso" data-t="¿Por qué?"><p class="ln" id="rQ"></p><div class="campo"><label for="rM">Motivo <small>(lo verá el cliente en su parte)</small></label><textarea id="rM" maxlength="120" placeholder="Por ejemplo: al final no hizo falta cambiar el sifón"></textarea></div></section></div><div class="hp"><button class="btn pri ancho" id="rOk" disabled>Rebajar</button></div>');
 const pinta=()=>{const T=K.precio(cfg,vivos(),o),mot=$('#rM',d).value.trim().length>=3;
  $('#rL',d).innerHTML=L.map((l,i)=>{const it=cfg.cat[l.k],nom=l.k==='otro'?l.t:it?it.t:l.k;
   return'<li><span class="lt">'+esc(nom)+'<small>'+(l.q>0?(it&&it.un==='h'?OficioPapeles.dur(Math.round(l.q*60)):l.q===1?'1 unidad':l.q+' unidades'):'quitado')+'</small></span><span class="st"><button type="button" data-r="'+i+'" data-m="-1" aria-label="Menos: '+esc(nom)+'"'+(l.q<=0?' disabled':'')+'>−</button><button type="button" data-r="'+i+'" data-m="1" aria-label="Más: '+esc(nom)+'"'+(l.q>=L0[i].q?' disabled':'')+'>+</button></span><b></b></li>'}).join('');
  $('#rT',d).textContent=K.eur(T.total);const b=$('#rOk',d);b.disabled=!(vivos().length&&T.total<A.tot.total&&mot);b.textContent=T.total<A.tot.total?'Rebajar a '+K.eur(T.total):'Rebajar'};
 d.addEventListener('click',e=>{const b=e.target.closest('[data-r],#rOk');if(!b)return;
  if(b.dataset.r){const i=+b.dataset.r,l=L[i],m=+b.dataset.m;l.q=Math.max(0,Math.min(L0[i].q,Math.round((l.q+m*paso(l))*100)/100));pinta();const n=$('[data-r="'+i+'"][data-m="'+m+'"]',d);if(n&&!n.disabled)n.focus();return}
  if(hacer({tipo:'rebajar',id:A.id,lineas:vivos(),motivo:$('#rM',d).value}).ok){d.close();toast('Precio rebajado.')}});
 $('#rM',d).addEventListener('input',pinta);pinta();
 pasosHoja(d,{ok:[()=>{const T=K.precio(cfg,vivos(),o);return!vivos().length?'Tiene que quedar algo.':T.total<A.tot.total?'':'Quita algo: el precio solo puede bajar.'}],
  al:[null,()=>{const T=K.precio(cfg,vivos(),o);$('#rQ',d).textContent='De '+K.eur(A.tot.total)+' a '+K.eur(T.total)+(cobrado?'. Hay que devolverle '+K.eur(A.tot.total-T.total)+'.':'.')}]})}
