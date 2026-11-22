/* OOOX Oficios · la app (app.html), vistas/equipo. Partido de app.html el 22-11-2026 (C3): los archivos de js/app/ se cargan en
   este orden y comparten sus nombres (scripts clásicos, sin paso de compilación). Ver la lista en app.html. */
/* ===== centralita: el equipo, día a día. Quién trabaja, qué lleva cada uno y quién falta ===== */
function vEquipo(d){const ahora=Date.now(),hoy=K.madrid().date,dias=diasAg(ahora);if(!dias.includes(d))d=dias[0];
 const fr=K.franjasDe(S,cfg,d,ahora),L=S.avisos.filter(a=>a.cita&&a.cita.dia===d&&a.e!=='cancelado'),sin=L.filter(a=>!a.tec),ds=new Date(d+'T12:00:00Z').getUTCDay();
 const chip=a=>'<a class="cch'+(a.tec?'':' sin')+'" href="#/aviso/'+a.id+'"><b>'+esc(cfg.av[a.av].n)+(barrio(a)?' · '+esc(barrio(a)):'')+'</b><small>'+esc(K.nomCli(a.cli)||'Aún sin nombre')+(a.cita.ok===false?' · por confirmar':'')+'</small></a>';
 const aus=(S.ausencias||[]).filter(u=>u.a>=hoy).sort((a,b)=>a.de<b.de?-1:a.de>b.de?1:0),MAT=K.material(S,cfg,d);
 let h='<div class="cab"><div><h1>Agenda</h1><p class="sub">Quién trabaja '+diaTxt(d)+' y qué lleva cada uno.</p></div><button class="btn pri peq" data-a="ausencia" data-dia="'+d+'">'+I.mas+'Ausencia</button></div>'+
  segAg('equipo',d,navDias('equipo',dias,d,x=>{const n=N.tecnicos.filter(t=>K.ausente(S,t.id,x)).length;return n?(n===1?'falta 1':'faltan '+n):'todos'}))+bAlertas(1,true);
 h+='<h2 class="dlargo">'+diaLargo(d)+'</h2>'+bTablero(d)+'<div class="tecds">';
 if(sin.length)h+='<section class="tecd"><h2>Sin asignar</h2><p class="ln">'+(sin.length===1?'1 cita espera técnico.':sin.length+' citas esperan técnico.')+'</p><ul class="tfr">'+fr.filter(f=>sin.some(a=>a.cita.fr===f.id)).map(f=>'<li><span class="num">'+K.franjaTxt(f).replace(/^d/,'D')+'</span><div>'+sin.filter(a=>a.cita.fr===f.id).map(chip).join('')+'</div></li>').join('')+'</ul>'+bMat(MAT.find(g=>!g.tec),d)+'</section>';
 N.tecnicos.forEach(t=>{const u=(S.ausencias||[]).find(x=>x.tec===t.id&&x.de<=d&&x.a>=d),hor=t.horario||N.horario||null,tr=hor?(hor[ds]||[]):null;
  const linea=u?'Ausente'+(u.motivo?': '+esc(u.motivo.toLowerCase()):'')+(u.a>d?'. Hasta '+diaTxt(u.a):'')+'.':!tr?'Sin horario puesto: cuenta para todas las franjas.':tr.length?tr.map(x=>K.franjaTxt({de:x[0],a:x[1]})).join(' y ').replace(/^d/,'D')+'.':'No trabaja este día.';
  h+='<section class="tecd'+(u?' aus':'')+'" data-tec="'+t.id+'"><h2>'+ava(t.id)+esc(t.n)+' '+esc(t.ap)+'</h2><p class="ln">'+linea+'</p>'+(u?'':textoDia(diaTec(t.id,d)))+'<ul class="tfr">'+fr.map(f=>{const C=L.filter(a=>a.tec===t.id&&a.cita.fr===f.id),si=!u&&K.trabaja(cfg,t.id,d,f.de,f.a);
   return'<li><span class="num">'+K.franjaTxt(f).replace(/^d/,'D')+'</span><div>'+C.map(chip).join('')+(u?'<p class="eqn">Ausente</p>':!si?'<p class="eqn">No trabaja</p>':cfg.porTiempo?(K.cabeTec(S,cfg,t.id,{id:'_x',av:'',cli:{dis:''},cita:{dia:d,fr:f.id}})?'<p class="hueco">'+(C.length?'Cabe otra':'Libre')+'</p>':''):C.length<cfg.porFranja||!cfg.conHorario&&!C.length?'<p class="hueco">Libre</p>':'')+'</div></li>'}).join('')+'</ul>'+bMat(MAT.find(g=>g.tec===t.id),d)+(u?'':bCargaEq(t.id,d))+
   '<div class="acts">'+(u?'<button class="btn peq" data-a="quitaAus" data-aus="'+u.id+'">Quitar la ausencia</button>':'<button class="btn peq" data-a="ausencia" data-tec="'+t.id+'" data-dia="'+d+'">No viene</button>')+'</div></section>'});
 h+='</div><section class="sec"><h2>Ausencias apuntadas <span class="n">'+aus.length+'</span></h2>'+(aus.length?'<ul class="lista">'+aus.map(u=>'<li class="filau"><span><b>'+esc(cfg.tec[u.tec]?cfg.tec[u.tec].n:u.tec)+'</b><small>'+(u.de===u.a?diaTxt(u.de).replace(/^e/,'E').replace(/^h/,'H').replace(/^m/,'M'):'Del '+K.fechaLarga(u.de)+' al '+K.fechaLarga(u.a))+(u.motivo?' · '+esc(u.motivo):'')+'</small></span><button class="btn peq" data-a="quitaAus" data-aus="'+u.id+'">Quitar</button></li>').join('')+'</ul>':'<p class="hueco">Nadie tiene bajas ni vacaciones apuntadas.</p>')+
  '<p class="mpie">'+(cfg.conHorario?'¿Cambia el horario de alguien?':'Este negocio no tiene horarios puestos: cuando falta alguien, los huecos que ve el cliente no cambian.')+(SOP?' <a class="txt" href="#/mejoras">Pídelo en Mejoras</a>':'')+'</p></section>';
 return h}
function hAusencia(tec,dia){const hoy=K.madrid().date,de=dia&&dia>=hoy?dia:hoy;
 const d=hoja(hc('Apuntar una ausencia')+'<form class="hb" id="uF" novalidate>'+
  '<section class="hpaso" data-t="¿Quién falta?"><div class="ops" role="radiogroup" aria-label="Quién falta">'+N.tecnicos.map(t=>'<button type="button" class="op" data-ut="'+t.id+'" role="radio" aria-checked="'+(t.id===tec)+'">'+esc(t.n)+'</button>').join('')+'</div></section>'+
  '<section class="hpaso" data-t="¿Qué días?"><p class="ln" id="u_q"></p><div class="duo" style="grid-template-columns:1fr 1fr"><div class="campo"><label for="u_de">Desde</label><input type="date" id="u_de" min="'+hoy+'" value="'+de+'"></div><div class="campo"><label for="u_a">Hasta</label><input type="date" id="u_a" min="'+hoy+'" value="'+de+'"></div></div>'+
  '<div class="campo"><label for="u_mo">Motivo <small class="opc">Opcional</small></label><input id="u_mo" maxlength="60" placeholder="Baja, vacaciones, un curso" autocomplete="off"></div>'+
  '<p class="dn">Lo que tuviera asignado esos días vuelve solo a «sin asignar», para que lo repartas.</p></section><p class="err" id="u_err" style="color:var(--mal)" hidden></p></form>'+
  '<div class="hp"><button class="btn pri ancho" form="uF">Apuntar la ausencia</button></div>');
 const pg=pasosHoja(d,{ok:[()=>tec?'':'Elige quién falta.'],al:[null,()=>{const t=cfg.tec[tec];$('#u_q',d).textContent=t?t.n+' '+t.ap:''}]});if(tec)pg.ve(1,false);
 d.addEventListener('click',e=>{const b=e.target.closest('[data-ut]');if(!b)return;tec=b.dataset.ut;$$('[data-ut]',d).forEach(x=>x.setAttribute('aria-checked',String(x.dataset.ut===tec)));$('#u_err',d).hidden=true});
 $('#u_de',d).addEventListener('change',e=>{const x=$('#u_a',d);if(x.value<e.target.value)x.value=e.target.value});
 $('#uF',d).onsubmit=e=>{e.preventDefault();const m=$('#u_err',d),di=k=>{m.textContent=k;m.hidden=false};
  if(!tec)return di('Elige quién falta.');
  const bt=$('button[form=uF]',d);if(bt.disabled)return;bt.disabled=true;
  Oficio.crear({tipo:'ausencia',tec,de:$('#u_de',d).value,a:$('#u_a',d).value,motivo:$('#u_mo',d).value},Q).then(r=>{bt.disabled=false;
   if(!r.ok)return di(errDe(r)||'No se ha podido apuntar.');
   const n=(r.sueltos||[]).length;d.close();toast('Apuntado.'+(n?(n===1?' 1 aviso vuelve':' '+n+' avisos vuelven')+' a «sin asignar».':''))})}}
