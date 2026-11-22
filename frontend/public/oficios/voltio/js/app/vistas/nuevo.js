/* OOOX Oficios · la app (app.html), vistas/nuevo. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== centralita: aviso nuevo, de una llamada =====
   Paso a paso (20-11-2026, como la cita: «uno a uno, una pantalla simple que vas avanzando»): 1 qué le pasa, 2 cuándo
   (urgente, o con cita: día y franja), 3 quién es (el teléfono primero: si ya es cliente, se rellena lo demás), 4 dónde es
   y, al final, el resumen con por dónde ha entrado y lo que cuenta. Cada paso tiene su dirección (#/nuevo/cu…): el
   «atrás» del navegador vuelve al anterior, y no se salta a un paso sin lo de antes. Visto el resumen, «Continuar» vuelve
   a él en cuanto está todo */
const B={av:'',or:'llamada',cuando:'',dia:'',fr:'',nomap:'',tel:'',dir:'',cp:'',nota:'',err:'',visto:false};
const NP=['av','cu','qui','don'],NPT={av:'¿Qué le pasa?',cu:'¿Cuándo?',qui:'¿Quién es?',don:'¿Dónde es?'},
 NP_DE={av:'av',cuando:'cu',franja:'cu',lleno:'cu',nomap:'qui',nombre:'qui',apellidos:'qui',tel:'qui',dir:'don',cp:'don',zona:'don'};
/* lo que falta en un paso: la llave de su error, o '' */
function npMal(p){const nm=x=>String(x||'').trim().replace(/\s+/g,' ');
 if(p==='av')return B.av&&cfg.av[B.av]?'':'av';
 if(p==='cu')return B.cuando!=='urg'&&B.cuando!=='cita'?'cuando':B.cuando==='cita'&&!B.fr?'franja':'';
 if(p==='qui')return!K.tel9(B.tel)?'tel':!K.parteNombre(B.nomap).bien?'nomap':'';
 if(p==='don'){if(nm(B.dir).length<5)return'dir';const z=String(B.cp).replace(/\D/g,'');return cfg.zonas.cp[z]?'':z.length===5?'zona':'cp'}
 return''}
const npHash=p=>p==='av'?'#/nuevo':'#/nuevo/'+p;
function npVe(p){if(location.hash===npHash(p)){pinta();scrollTo(0,0);const t=$('#npTit');if(t)t.focus({preventScroll:true})}else location.hash=npHash(p)}
const NERR={av:'Elige qué le pasa.',cuando:'Elige si es urgente o con cita.'};
function vNuevo(){const dias=K.diasDe(S,cfg,Date.now(),5,true,B.av?{av:B.av,cli:{dis:cfg.zonas.cp[B.cp]||''}}:null);if(!dias.find(x=>x.dia===B.dia))B.dia=dias.length?dias[0].dia:'';const fr=(dias.find(x=>x.dia===B.dia)||{franjas:[]}).franjas;if(!fr.find(f=>f.id===B.fr&&f.okOf))B.fr='';
 const fS=fr.find(f=>f.id===B.fr);
 /* el paso: el de la dirección, si ya está lo de antes; si no, el primero que falta */
 const r=ruta();let p=NP.includes(r.a)||r.a==='fin'?r.a:'av';
 {const tope=p==='fin'?NP.length:NP.indexOf(p);for(let j=0;j<tope;j++)if(npMal(NP[j])){p=NP[j];break}}
 if((r.a||'av')!==p)try{history.replaceState(null,'',location.pathname+location.search+npHash(p))}catch(e){}
 B.paso=p;if(p==='fin')B.visto=true;const i=p==='fin'?NP.length:NP.indexOf(p);
 const c=(id,lb,v,o)=>'<div class="campo'+(B.err===id?' mal':'')+'"><label for="n_'+id+'">'+lb+'</label><input id="n_'+id+'" data-b="'+id+'" value="'+esc(v)+'" '+(o||'')+(B.err===id?' aria-invalid="true" aria-describedby="e_'+id+'"':'')+'>'+(B.err===id?'<p class="err" id="e_'+id+'">'+ERR[id]+'</p>':'')+'</div>';
 const con=B.tel&&K.tel9(B.tel)?S.avisos.filter(a=>K.tel9(a.cli.tel)===K.tel9(B.tel)):[];
 const cuTxt=()=>B.cuando==='urg'?'Urgente':B.fr?diaCorto(B.dia).replace(/^./,x=>x.toUpperCase())+', '+frTxt(B.fr):'Con cita';
 /* arriba: la barra de los pasos, con «atrás»; la pregunta, y lo que ya está elegido en una línea */
 const prog='<nav class="prog" aria-label="Pasos">'+(i>0?'<button type="button" class="atras" data-np="'+(p==='fin'?'don':NP[i-1])+'" aria-label="Atrás">':'<button type="button" class="atras no" tabindex="-1" aria-hidden="true">')+I.atras+'</button><ol>'+
  NP.map((x,j)=>'<li class="'+(j<i?'ok':j===i?'ya':'')+'"'+(j===i?' aria-current="step"':'')+'><span class="vh">'+NPT[x]+'</span></li>').join('')+'</ol><span class="pn">'+(p==='fin'?'Último paso':'Paso '+(i+1)+' de '+NP.length)+'</span></nav>';
 const lleva=[i>0&&B.av?esc(cfg.av[B.av].n):'',i>1?cuTxt():'',i>3?esc(B.nomap):''].filter(Boolean).join(' · ');
 const cab='<a class="atras" href="#/bandeja">'+I.atras+'Bandeja</a><div class="cab"><div><h1>Nuevo aviso</h1>'+(p==='av'?'<p class="sub">Para lo que entra por teléfono, por WhatsApp o en persona. Lo que escribas aquí ya no se vuelve a escribir.</p>':'')+'</div></div>'+
  prog+'<h2 class="npq" id="npTit" tabindex="-1">'+(p==='fin'?'Revisa y crea el aviso':NPT[p])+'</h2>'+(lleva&&p!=='fin'?'<p class="lleva">'+lleva+'</p>':'');
 const malP=k=>B.err===k?'<p class="err" id="e_'+k+'">'+(NERR[k]||ERR[k])+'</p>':'';
 let h='';
 if(p==='av')h='<div class="campo'+(B.err==='av'?' mal':'')+'"><div class="ops" role="radiogroup" aria-label="Qué le pasa"'+(B.err==='av'?' aria-invalid="true" aria-describedby="e_av"':'')+'>'+N.averias.map(a=>'<button type="button" class="op" data-b-av="'+a.id+'" role="radio" aria-checked="'+(B.av===a.id)+'">'+esc(a.n)+'</button>').join('')+'</div>'+malP('av')+'</div>';
 else if(p==='cu')h='<div class="campo'+(B.err==='cuando'?' mal':'')+'"><div class="ops" role="radiogroup" aria-label="Cuándo"'+(B.err==='cuando'?' aria-invalid="true" aria-describedby="e_cuando"':'')+'>'+
   '<button type="button" class="op" data-b-cu="urg" role="radio" aria-checked="'+(B.cuando==='urg')+'">Urgente<small>Va quien llegue antes</small></button><button type="button" class="op" data-b-cu="cita" role="radio" aria-checked="'+(B.cuando==='cita')+'">Con cita<small>Eliges día y franja</small></button></div>'+malP('cuando')+'</div>'+
  (B.cuando==='cita'?'<div class="campo'+(B.err==='franja'?' mal':'')+'"><span class="lb" id="l_dia">Día y franja</span><div class="ops" role="radiogroup" aria-label="Día">'+dias.map(x=>'<button type="button" class="op" data-b-dia="'+x.dia+'" role="radio" aria-checked="'+(B.dia===x.dia)+'">'+diaCorto(x.dia)+'</button>').join('')+'</div><div class="ops" role="radiogroup" aria-label="Franja">'+fr.map(f=>'<button type="button" class="op" data-b-fr="'+f.id+'" role="radio" aria-checked="'+(B.fr===f.id)+'"'+(f.okOf?'':' disabled')+'>'+f.txt+'<small>'+frOf(f)+'</small></button>').join('')+'</div>'+(fS&&fS.por?'<p class="ayuda" id="n_por">'+PORL[fS.por]+'</p>':'')+(B.err==='franja'?'<p class="err">'+(B.fr?ERR.franja:'Elige una franja.')+'</p>':'')+'</div>':'');
 else if(p==='qui')h=c('tel','Teléfono',B.tel,'type="tel" inputmode="tel" autocomplete="off"')+(con.length?'<p class="mnota" style="margin-top:-8px">Cliente conocido: '+(con.length===1?'1 aviso anterior':con.length+' avisos anteriores')+'. He rellenado sus datos.</p>':'')+c('nomap','Nombre y apellidos',B.nomap,'autocomplete="off" maxlength="140"');
 else if(p==='don')h='<div class="duo">'+c('dir','Calle, número y piso',B.dir,'autocomplete="off"')+c('cp','Código postal',B.cp,'inputmode="numeric" maxlength="5" autocomplete="off"')+'</div>'+(B.err==='zona'?'<p class="err" style="color:var(--mal);margin-top:-8px">'+ERR.zona+'</p>':'');
 else{const fila=(t,v,k)=>'<li><span><small>'+t+'</small>'+v+'</span><a class="txt" href="'+npHash(k)+'">Cambiar</a></li>';
  h='<ul class="npres">'+fila('Qué le pasa',esc(cfg.av[B.av].n),'av')+fila('Cuándo',esc(cuTxt()),'cu')+fila('Quién',esc(B.nomap)+' · '+K.telBonito(K.tel9(B.tel)),'qui')+fila('Dónde',esc(B.dir)+', '+esc(String(B.cp).replace(/\D/g,'')),'don')+'</ul>'+
   '<div class="campo"><span class="lb" id="l_or">¿Por dónde ha entrado?</span><div><div class="seg tres" role="radiogroup" aria-labelledby="l_or">'+[['llamada','Llamada'],['whatsapp','WhatsApp'],['persona','En persona']].map(o=>'<button type="button" data-b-or="'+o[0]+'" role="radio" aria-checked="'+(B.or===o[0])+'">'+o[1]+'</button>').join('')+'</div></div></div>'+
   '<div class="campo"><label for="n_nota">Qué cuenta el cliente <small class="opc">Opcional</small></label><textarea id="n_nota" data-b="nota" placeholder="Lo que le pasa, con sus palabras">'+esc(B.nota)+'</textarea></div>'+
   (B.err&&!NP_DE[B.err]?'<p class="err" style="color:var(--mal)" role="alert">'+(ERR[B.err]||'No se ha podido crear el aviso.')+'</p>':'')}
 return cab+'<form class="form" id="fNuevo" data-paso="'+p+'" novalidate>'+h+'<div class="sigue"><button class="btn pri ancho" type="submit">'+(p==='fin'?'Crear el aviso':'Continuar')+'</button></div></form>'}
