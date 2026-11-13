/* ============================================================
   NÚCLEO DE OFICIOS · las reglas de un aviso, de la llamada al cobro.
   Este mismo archivo corre en el navegador (demo sin servidor), en las
   pruebas (Node) y, en la fase 2, en el servidor. Así las reglas son las
   mismas en todos los sitios.

   Recorrido de un aviso:  nuevo → asignado → camino → curso → hecho
   Salidas: ausente (no había nadie), cancelado y «no acepta» (se cobra
   solo el desplazamiento).
   - Tres toques del técnico: Voy, Empezar y Terminado.
   - Los precios y los nombres los pone siempre este archivo a partir del
     catálogo; lo que manda el móvil son solo claves y cantidades.
   - Los precios del catálogo son finales para una vivienda (IVA del 10 %
     dentro), los mismos de la web. Local, vivienda nueva o material por
     encima del 40 % del trabajo: IVA del 21 %.
   - La tarifa (normal o de urgencia) es la del momento en que el cliente
     avisa. Con cita, siempre la normal.
   - El precio se firma siempre antes de empezar (desde el 13-11-2026 no
     hay modo «sin papeles»: todos los negocios llevan presupuesto, parte,
     garantía y cobros).
   - Todo lo que llega de fuera se trata como sospechoso: claves que no
     existen, textos que no son texto y cantidades imposibles se rechazan
     sin cambiar nada.
   ============================================================ */
(function(g){
'use strict';
const TZ='Europe/Madrid',ESQ=4,MIN=60000;
const PAGOS=['efectivo','tarjeta','bizum','transferencia','pendiente'];
/* por dónde entra un aviso: reserva en la web, botón de WhatsApp de la web, WhatsApp directo, teléfono, en persona */
const ORIGEN=['cita','web','whatsapp','llamada','persona','otro'];
const EN_MARCHA=['asignado','camino','curso'];
const cts=x=>Math.round(x*100+1e-7);
const red=x=>Math.round(x+1e-7);
const soloNum=s=>typeof s==='string'||typeof s==='number'?String(s).replace(/\D/g,''):'';
/* solo texto y números; lo demás (listas, objetos) se queda en nada */
const txt=x=>typeof x==='string'||typeof x==='number'?String(x):'';

/* ---------- fechas, siempre en hora de Madrid ---------- */
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function madrid(t){const p=fmt.formatToParts(new Date(t==null?Date.now():t)),v=k=>(p.find(x=>x.type===k)||{}).value;
 return{day:{Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[v('weekday')],min:+v('hour')*60+ +v('minute'),date:v('year')+'-'+v('month')+'-'+v('day')}}
const hhmm=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const hora=t=>hhmm(madrid(t).min);
function masDias(f,n){const d=new Date(f+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function masMeses(f,n){const d=new Date(f+'T12:00:00Z'),dia=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);
 d.setUTCDate(Math.min(dia,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return d.toISOString().slice(0,10)}
const diaSem=f=>new Date(f+'T12:00:00Z').getUTCDay();
const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fechaLarga=f=>DIAS[diaSem(f)]+' '+(+f.slice(8))+' de '+MESES[+f.slice(5,7)-1];
const fechaCorta=f=>(+f.slice(8))+'-'+(+f.slice(5,7))+'-'+f.slice(0,4);
const hf=m=>m%60?Math.floor(m/60)+':'+String(m%60).padStart(2,'0'):String(m/60);
const franjaTxt=f=>'de '+hf(f.de)+' a '+hf(f.a);
const eur=cs=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(cs/100)+' €';

/* ---------- de data del negocio, lo que las reglas necesitan ---------- */
function cfgDe(N){const vacio=()=>Object.create(null),limpio=o=>Object.assign(vacio(),o||{}),cat=vacio();
 Object.entries(N.catalogo).forEach(([k,i])=>{const p10=i.p10!=null?cts(i.p10):red(cts(i.p21)/1.1),p21=i.p21!=null?cts(i.p21):red(cts(i.p10)*1.1);
  cat[k]={k,t:i.t,p10,p21,u:!!i.u,mat:!!i.mat,un:i.un||'',min:i.min||1,paso:i.paso||1}});
 const av=vacio(),tec=vacio();N.averias.forEach(a=>{av[a.id]=a});N.tecnicos.forEach(x=>{tec[x.id]=x});
 const zonas={banda:limpio(N.zonas.banda),dis:limpio(N.zonas.dis),cp:limpio(N.zonas.cp)};
 return{N,cat,av,tec,pack:N.pack||'pro',recargo:N.tarifa.recargo,dia:N.tarifa.dia,festivos:N.festivos||[],franjas:N.franjas,cupo:N.cupo,zonas,
  etaMax:Math.max.apply(null,Object.values(zonas.banda)),horas:Object.keys(cat).find(k=>cat[k].un==='h')||'',meses:N.garantiaMeses||12,
  conHorario:!!(N.horario||N.tecnicos.some(x=>x.horario)),porFranja:(N.citas&&N.citas.porFranja)||1,reserva:(N.citas&&N.citas.reserva)||0,hayGuardia:N.tecnicos.some(x=>x.guardia)}}
function nuevo(){return{esq:ESQ,v:0,n:0,avisos:[],ausencias:[]}}

/* ---------- tarifa y precio ---------- */
function urgente(cfg,t){const n=madrid(t);return n.day===0||n.day===6||cfg.festivos.includes(n.date)||n.min<cfg.dia[0]||n.min>=cfg.dia[1]}
const tarifaDe=(cfg,A)=>A.cita?false:urgente(cfg,A.t);
/* primera hora mínima; después, por cuartos de hora empezados */
const horas=min=>Math.max(1,Math.ceil(min/15-1e-9)/4);
function precio(cfg,lineas,o){o=o||{};const L=[];let mat=0,todo=0;
 (Array.isArray(lineas)?lineas:[]).forEach(l=>{let it;if(!l||typeof l!=='object')return;
  if(l.k==='otro'){const p=cts(Math.max(0,Math.min(+l.p||0,5000)));if(!p)return;it={k:'otro',t:(txt(l.t).trim()||'Otro material').slice(0,60),p10:p,p21:red(p*1.1),u:false,mat:true,un:'',min:1,paso:1}}
  else it=typeof l.k==='string'?cfg.cat[l.k]:null;
  if(!it)return;
  let q=+l.q||it.min;q=Math.max(o.sinMin?it.paso:it.min,Math.round(q/it.paso)*it.paso);q=Math.min(q,it.un==='h'?12:20);
  const f=o.urg&&it.u?1+cfg.recargo:1,b=it.p10*q*f;todo+=b;if(it.mat)mat+=b;L.push({it,q,f,p:l.p})});
 const pmat=todo?mat/todo:0,tipo=o.tipo||(o.local||pmat>.4?21:10),motivo=o.local?'local':pmat>.4?'material':'vivienda';
 let total=0;
 const out=L.map(({it,q,f,p})=>{const imp=red((tipo===21?it.p21:it.p10)*q*f);total+=imp;const r={k:it.k,t:it.t,q,un:it.un,mat:it.mat,u:it.u&&!!o.urg,imp};if(it.k==='otro')r.p=+p;return r});
 const base=red(total/(1+tipo/100));
 return{lineas:out,total,base,iva:total-base,tipo,motivo,pmat,urg:!!o.urg,local:!!o.local}}
/* lo que la web enseña de cada avería: de cuánto a cuánto */
function rango(cfg,av,urg){const a=typeof av==='string'?cfg.av[av]:null;if(!a)return null;return{a:precio(cfg,a.min,{urg}).total,b:a.max?precio(cfg,a.max,{urg}).total:null}}

/* ---------- teléfono, dirección y garantía ---------- */
function tel9(s){let d=soloNum(s);if(d.length===13&&d.startsWith('0034'))d=d.slice(4);if(d.length===11&&d.startsWith('34'))d=d.slice(2);return /^[6789]\d{8}$/.test(d)?d:''}
const telBonito=s=>{const d=tel9(s);return d?d.slice(0,3)+' '+d.slice(3,5)+' '+d.slice(5,7)+' '+d.slice(7):String(s||'')};
const VACIAS=new Set(['c','calle','carrer','de','del','la','el','les','los','las','d','av','avda','avenida','avinguda','pl','plaza','placa','pg','passeig','paseo','n','num','numero','piso','pis','puerta','porta']);
const normDir=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[ºª]/g,' ').split(/[^a-z0-9]+/).filter(w=>w&&!VACIAS.has(w)).join(' ');
function garantiaDe(S,cfg,cli,t,menos){const hoy=madrid(t).date,tel=tel9(cli&&cli.tel),dir=normDir(cli&&cli.dir);
 return S.avisos.filter(a=>a.id!==menos&&a.e==='hecho'&&!a.sinTrabajo&&a.gar&&a.gar.hasta>=hoy&&((tel&&tel9(a.cli.tel)===tel)||(dir.length>4&&normDir(a.cli.dir)===dir))).map(a=>a.id)}

/* ---------- citas sin prisa: días y franjas ---------- */
const laborable=(cfg,f)=>{const w=diaSem(f);return w>=1&&w<=5&&!cfg.festivos.includes(f)};
const esFecha=f=>typeof f==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f)&&!isNaN(Date.parse(f+'T12:00:00Z'))&&masDias(f,0)===f;

/* ---------- horarios: quién trabaja cuándo ----------
   Si el negocio pone horarios (uno general o el de cada técnico), los huecos que ve el cliente salen de ahí:
   en cada franja caben tantas citas como técnicos la trabajan enteros y no están ausentes, por las que lleva
   cada uno (citas.porFranja), menos los que se guardan para urgencias (citas.reserva).
   Sin horarios, vale el número fijo de siempre (cupo). */
const horarioDe=(cfg,tec)=>{const x=cfg.tec[tec];return x?(x.horario||cfg.N.horario||null):null};
function trabaja(cfg,tec,dia,de,a){const h=horarioDe(cfg,tec);if(!h)return!cfg.conHorario;return(h[diaSem(dia)]||[]).some(x=>x[0]<=de&&x[1]>=a)}
const ausente=(S,tec,dia)=>(S.ausencias||[]).some(u=>u.tec===tec&&u.de<=dia&&u.a>=dia);
const citasDe=(S,tec,dia,fr,menos)=>S.avisos.filter(a=>a.id!==menos&&a.tec===tec&&a.cita&&a.cita.dia===dia&&a.cita.fr===fr&&a.e!=='cancelado').length;
const enFranja=(S,dia,fr,menos)=>S.avisos.filter(a=>a.id!==menos&&a.cita&&a.cita.dia===dia&&a.cita.fr===fr&&a.e!=='cancelado').length;
function capacidad(S,cfg,dia,f){if(!cfg.conHorario)return cfg.cupo;
 const n=Object.keys(cfg.tec).filter(id=>trabaja(cfg,id,dia,f.de,f.a)&&!ausente(S,id,dia)).length;return Math.max(0,n*cfg.porFranja-cfg.reserva)}
/* ¿puede ir este técnico a este aviso? Devuelve '' si puede, o el motivo */
function puedeIr(S,cfg,A,tec,t){if(typeof tec!=='string'||!cfg.tec[tec])return'tec';if(!cfg.conHorario)return'';
 if(A.cita){const f=cfg.franjas.find(x=>x.id===A.cita.fr);if(ausente(S,tec,A.cita.dia))return'ausente_tec';if(!f||!trabaja(cfg,tec,A.cita.dia,f.de,f.a))return'horario';
  return citasDe(S,tec,A.cita.dia,A.cita.fr,A.id)>=cfg.porFranja?'lleno':''}
 const n=madrid(t);if(ausente(S,tec,n.date))return'ausente_tec';
 /* una urgencia fuera de horario va a quien hace guardias, si el negocio ha dicho quién las hace */
 const ahora=laborable(cfg,n.date)&&trabaja(cfg,tec,n.date,n.min,n.min);
 return!ahora&&cfg.hayGuardia&&!cfg.tec[tec].guardia?'horario':''}
/* franjas que vienen con más citas de las que caben (pasa cuando alguien se pone enfermo): hay que mover alguna */
function sobran(S,cfg,t){const hoy=madrid(t).date,vistas=new Set(),out=[];
 S.avisos.forEach(a=>{if(!a.cita||a.cita.dia<hoy||!['nuevo','asignado','ausente'].includes(a.e))return;const k=a.cita.dia+' '+a.cita.fr;if(vistas.has(k))return;vistas.add(k);
  const f=cfg.franjas.find(x=>x.id===a.cita.fr);if(!f)return;const n=enFranja(S,a.cita.dia,a.cita.fr)-capacidad(S,cfg,a.cita.dia,f);if(n>0)out.push({dia:a.cita.dia,fr:a.cita.fr,sobran:n})});
 return out.sort((x,y)=>x.dia<y.dia?-1:x.dia>y.dia?1:x.fr<y.fr?-1:1)}
function franjasDe(S,cfg,dia,t,menos){const n=madrid(t);
 return cfg.franjas.map(f=>{const usadas=enFranja(S,dia,f.id,menos),cap=capacidad(S,cfg,dia,f),libres=Math.max(0,cap-usadas);
  const pasada=dia<n.date||(dia===n.date&&f.de<n.min+120);
  return{id:f.id,de:f.de,a:f.a,txt:franjaTxt(f),cap,libres,ok:laborable(cfg,dia)&&!pasada&&libres>0}})}
function diasDe(S,cfg,t,cuantos){const hoy=madrid(t).date,out=[];
 for(let i=0;out.length<(cuantos||6)&&i<28;i++){const f=masDias(hoy,i);if(!laborable(cfg,f))continue;const fr=franjasDe(S,cfg,f,t);
  if(i===0&&!fr.some(x=>x.ok))continue;out.push({dia:f,hoy:i===0,libres:fr.reduce((s,x)=>s+(x.ok?x.libres:0),0),franjas:fr})}
 return out}
const etaMin=(cfg,dis)=>{const z=typeof dis==='string'?cfg.zonas.dis[dis]:null;return(z&&cfg.zonas.banda[z[1]])||cfg.etaMax};

/* ---------- los mensajes al cliente, ya escritos ---------- */
function mensaje(cfg,A,k){const N=cfg.N,n=(A.cli.nombre||'').split(' ')[0],hola=n?'Hola, '+n+'. ':'Hola. ',tec=cfg.tec[A.tec],T=tec?tec.n:'El técnico',av=cfg.av[A.av],fr=A.cita&&cfg.franjas.find(f=>f.id===A.cita.fr),frt=fr?franjaTxt(fr):'';
 const tot=A.tot?eur(A.tot.total):'';
 switch(k){
  case 'recibido':return hola+'Hemos recibido tu aviso '+A.id+(av?' ('+av.n.toLowerCase()+')':'')+'. '+(A.cita?'Te confirmamos enseguida quién irá.':'Te decimos enseguida quién va y a qué hora llega.')+' '+N.nombre+'.';
  case 'cita':if(!A.cita)return'';return hola+'Tu cita queda para el '+fechaLarga(A.cita.dia)+', '+frt+'. Irá '+T+'. Con cita, la tarifa es la normal. Si necesitas cambiarla, contesta a este mensaje. '+N.nombre+'.';
  case 'vispera':if(!A.cita)return'';return hola+'Te recordamos la cita de mañana, '+frt+', en '+A.cli.dir+'. Irá '+T+'. '+N.nombre+'.';
  case 'camino':return hola+T+' va de camino'+(A.eta?' y llega sobre las '+hora(A.eta):'')+'. '+N.nombre+'.';
  case 'ausente':return hola+T+' ha estado en '+A.cli.dir+' a las '+hora(A.aus||A.t)+' y no ha encontrado a nadie. ¿Cuándo te va bien que volvamos?';
  case 'hecho':return A.tot?(A.sinTrabajo?hola+'Hoy solo hemos cobrado el desplazamiento: '+tot+'. ':hola+'Trabajo terminado. Total: '+tot+', IVA incluido. ')+(A.pago&&A.pago.cobrado?'Pagado ('+A.pago.modo+'). ':'Queda pendiente de pago. ')+(A.gar?'Tienes garantía hasta el '+fechaCorta(A.gar.hasta)+'. Te adjuntamos el parte. ':'')+N.nombre+'.'
   :hola+'Trabajo terminado. Gracias por confiar en '+N.nombre+'.';
  case 'resena':return hola+'¿Todo bien con la reparación? Si tienes un minuto, tu opinión en Google nos ayuda mucho: '+N.resenas+' Gracias.';
  case 'cobro':if(!A.tot)return'';return hola+'Te recordamos que queda pendiente el pago del trabajo '+A.id+': '+tot+'. Puedes hacerlo por Bizum o por transferencia. Gracias. '+N.nombre+'.';
 }return''}
const MSG={recibido:'Aviso recibido',cita:'Cita confirmada',vispera:'Recordatorio de la víspera',camino:'Va de camino',ausente:'No había nadie',hecho:'Trabajo terminado',resena:'Pedir reseña',cobro:'Recordar el pago'};

/* ---------- el tiempo de trabajo, sin las pausas ---------- */
function minutos(A,t){if(!A.ini)return 0;const fin=A.fin||t||Date.now();let ms=fin-A.ini;(A.pausas||[]).forEach(p=>{ms-=(p[1]||fin)-p[0]});return Math.max(0,Math.round(ms/MIN))}
const enPausa=A=>!!(A.pausas&&A.pausas.length&&!A.pausas[A.pausas.length-1][1]);

/* ---------- las acciones ---------- */
function aplicar(S,cfg,a,q,t){t=t||Date.now();q=q||{};a=a||{};
 const R=err=>({ok:false,err});
 const A=typeof a.id==='string'?S.avisos.find(x=>x.id===a.id):null;
 const esC=q.rol==='centralita',esT=q.rol==='tecnico'&&typeof q.id==='string'&&!!cfg.tec[q.id],mio=!!A&&esT&&A.tec===q.id;
 const nom=q.rol==='cliente'?'Cliente':esT?cfg.tec[q.id].n:esC?'Centralita':'Web';
 const log=(X,txt)=>{X.h.push({t,q:nom,txt});X.v=(X.v||0)+1};
 const msg=(X,k,cuando)=>{X.msgs=X.msgs.filter(m=>m.k!==k||m.env);X.msgs.push({k,t:cuando||t,env:0})};
 const sinMsg=(X,ks)=>{X.msgs=X.msgs.filter(m=>m.env||!ks.includes(m.k))};
 const ok=r=>{S.v++;return Object.assign({ok:true},r)};
 const datosCli=(c0,parcial)=>{const c1=c0&&typeof c0==='object'?c0:{},nombre=txt(c1.nombre).trim().replace(/\s+/g,' ').slice(0,60),tel=tel9(c1.tel),dir=txt(c1.dir).trim().replace(/\s+/g,' ').slice(0,120),cp=soloNum(c1.cp).slice(0,5);
  const dis=cfg.zonas.cp[cp]||(typeof c1.dis==='string'&&cfg.zonas.dis[c1.dis]?c1.dis:'');
  if(!parcial){if(nombre.length<2)return{err:'nombre'};if(!tel)return{err:'tel'};if(dir.length<5)return{err:'dir'};if(!dis)return{err:cp.length===5?'zona':'cp'}}
  else if(cp.length===5&&!dis)return{err:'zona'};
  return{cli:{nombre,tel,dir,cp,dis}}};
 const unaCita=c=>c&&typeof c==='object'&&typeof c.dia==='string'&&typeof c.fr==='string';
 if(a.tipo!=='pedir'&&a.tipo!=='ausencia'&&a.tipo!=='quitarAusencia'&&!A)return R('aviso');
 /* si el técnico que lo llevaba ya no puede (cambio de hora o ausencia), el aviso vuelve a la bandeja marcado */
 const suelta=(X,por)=>{log(X,cfg.tec[X.tec].n+' '+por+': queda sin asignar');X.tec='';if(X.e==='asignado')X.e='nuevo';X.reasignar=true;sinMsg(X,['cita','vispera'])};

 switch(a.tipo){
 case 'pedir':{
  if(typeof a.av!=='string'||!cfg.av[a.av])return R('av');
  const deWeb=a.origen==='web';             // el aviso que deja la web al abrir WhatsApp: los datos llegan después
  const d=datosCli(a.cli,deWeb);if(d.err)return R(d.err);
  let cita=null;
  let vale=null;
  if(a.cita){if(!unaCita(a.cita))return R('franja');const fr=franjasDe(S,cfg,a.cita.dia,t).find(f=>f.id===a.cita.fr);if(!fr||!fr.ok)return R('franja');cita={dia:a.cita.dia,fr:fr.id,ok:true};
   /* «vale»: la franja reservada y, si el cliente las dio, otras que también le van bien (hasta cuatro) */
   const hoy=madrid(t).date;vale=[{dia:cita.dia,fr:cita.fr}];
   (Array.isArray(a.alt)?a.alt:[]).slice(0,8).forEach(x=>{if(vale.length<5&&unaCita(x)&&esFecha(x.dia)&&x.dia>=hoy&&laborable(cfg,x.dia)&&cfg.franjas.some(f=>f.id===x.fr)&&!vale.some(v=>v.dia===x.dia&&v.fr===x.fr))vale.push({dia:x.dia,fr:x.fr})})}
  const n=++S.n,id=cfg.N.serie+'-'+String(n).padStart(4,'0');
  const X={id,n,v:0,t,origen:a.origen==null?'cita':ORIGEN.includes(a.origen)?a.origen:'otro',av:a.av,nota:txt(a.nota).trim().slice(0,400),foto:typeof a.foto==='string'&&a.foto.length<140000?a.foto:'',cli:d.cli,cita,urg:!cita,e:'nuevo',tec:'',msgs:[],h:[]};if(vale)X.vale=vale;
  const g0=garantiaDe(S,cfg,X.cli,t);if(g0.length)X.gar0=g0[g0.length-1];
  S.avisos.push(X);log(X,cita?'Cita pedida':'Aviso recibido');
  if(X.cli.tel)msg(X,'recibido');
  return ok({id})}

 case 'completar':{
  if(!esC&&!mio)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  const d=datosCli(Object.assign({},A.cli,a.cli),false);if(d.err)return R(d.err);
  const antes=A.cli.tel;A.cli=d.cli;const g0=garantiaDe(S,cfg,A.cli,t,A.id);if(g0.length)A.gar0=g0[g0.length-1];else delete A.gar0;
  if(!antes)msg(A,'recibido');log(A,'Datos del cliente completados');return ok()}

 case 'asignar':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  if(typeof a.tec!=='string'||!cfg.tec[a.tec])return R('tec');if(!A.cli.tel||!A.cli.dir||!A.cli.dis)return R('datos');
  {const no=puedeIr(S,cfg,A,a.tec,t);if(no)return R(no)}
  A.tec=a.tec;A.e='asignado';delete A.aus;delete A.reasignar;sinMsg(A,['ausente']);
  if(A.cita){msg(A,'cita');const v=masDias(A.cita.dia,-1);if(v>madrid(t).date)msg(A,'vispera',Date.parse(v+'T17:00:00Z'))}
  log(A,'Asignado a '+cfg.tec[a.tec].n);return ok()}

 case 'mover':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  if(a.cita){if(!unaCita(a.cita))return R('franja');const fr=franjasDe(S,cfg,a.cita.dia,t,A.id).find(f=>f.id===a.cita.fr);if(!fr||!fr.ok)return R('franja');const yaVale=(A.vale||[]).some(v=>v.dia===a.cita.dia&&v.fr===fr.id);if(a.confirmado&&!yaVale)A.vale=(A.vale||[]).concat([{dia:a.cita.dia,fr:fr.id}]);
   A.cita={dia:a.cita.dia,fr:fr.id,ok:yaVale||!!a.confirmado};A.urg=false}
  else{A.cita=null;A.urg=true}
  if(A.tec&&puedeIr(S,cfg,A,A.tec,t))suelta(A,'no puede en ese horario');
  if(A.e==='ausente'){A.e=A.tec?'asignado':'nuevo';delete A.aus;sinMsg(A,['ausente'])}
  sinMsg(A,['cita','vispera']);
  if(A.cita&&A.e==='asignado'){msg(A,'cita');const v=masDias(A.cita.dia,-1);if(v>madrid(t).date)msg(A,'vispera',Date.parse(v+'T17:00:00Z'))}
  log(A,A.cita?'Cita cambiada al '+fechaLarga(A.cita.dia):'Pasa a urgente');return ok()}

 case 'voy':{
  if(!mio)return R('permiso');if(A.e!=='asignado')return R('estado');
  if(S.avisos.some(x=>x.id!==A.id&&x.tec===A.tec&&(x.e==='camino'||x.e==='curso')))return R('ocupado');
  A.e='camino';A.sal=t;A.eta=t+etaMin(cfg,A.cli.dis)*MIN;sinMsg(A,['recibido','cita','vispera']);msg(A,'camino');log(A,'Va de camino');return ok({eta:A.eta})}

 case 'ausente':{
  if(!mio)return R('permiso');if(A.e!=='camino')return R('estado');
  A.e='ausente';A.aus=t;sinMsg(A,['camino']);msg(A,'ausente');log(A,'No había nadie');return ok()}

 case 'empezar':{
  if(!mio)return R('permiso');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  if(S.avisos.some(x=>x.id!==A.id&&x.tec===A.tec&&(x.e==='camino'||x.e==='curso')))return R('ocupado');
  const p=a.pres&&typeof a.pres==='object'?a.pres:{};if(typeof p.firma!=='string'||p.firma.length<12)return R('firma');
  const pr=precio(cfg,p.lineas,{urg:tarifaDe(cfg,A),local:!!p.local});if(!pr.total)return R('lineas');
  A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.local=!!p.local;
  A.pres=Object.assign({t,firma:p.firma},pr);A.tot=pr;
  if(!A.sal)A.sal=t;A.e='curso';A.ini=t;A.pausas=[];sinMsg(A,['camino','recibido','cita','vispera']);
  log(A,'Presupuesto firmado: '+eur(A.tot.total)+'. Empieza el trabajo');return ok()}

 case 'noacepta':{
  if(!mio)return R('permiso');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  if(!PAGOS.includes(a.modo))return R('modo');
  const pr=precio(cfg,[{k:cfg.N.sinTrabajo,q:1}],{urg:tarifaDe(cfg,A),local:!!a.local});
  A.tot=pr;A.lin=[{k:cfg.N.sinTrabajo,q:1}];A.local=!!a.local;A.sinTrabajo=true;A.e='hecho';A.fin=t;if(!A.sal)A.sal=t;
  A.pago={modo:a.modo,t,cobrado:a.modo!=='pendiente'};sinMsg(A,['camino','recibido','cita','vispera']);msg(A,'hecho');if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  log(A,'No acepta el precio. Solo el desplazamiento: '+eur(pr.total));return ok()}

 case 'ampliar':{
  if(!mio)return R('permiso');if(A.e!=='curso'||!A.tot||!A.lin)return R('estado');
  if(typeof a.firma!=='string'||a.firma.length<12)return R('firma');
  const mas=(Array.isArray(a.lineas)?a.lineas:[]).filter(l=>l&&typeof l==='object'&&(l.q==null||+l.q>0)&&(l.k==='otro'?+l.p>0:typeof l.k==='string'&&!!cfg.cat[l.k]));if(!mas.length)return R('lineas');
  const junto=A.lin.map(l=>Object.assign({},l));
  mas.forEach(l=>{const ya=l.k!=='otro'&&junto.find(x=>x.k===l.k);if(ya)ya.q+=(+l.q||cfg.cat[l.k].min);else junto.push(l.k==='otro'?{k:'otro',t:l.t,p:+l.p,q:1}:{k:l.k,q:+l.q||cfg.cat[l.k].min})});
  const pr=precio(cfg,junto,{urg:A.tot.urg,local:A.local}),dif=pr.total-A.tot.total;if(dif<=0)return R('lineas');
  A.amp=A.amp||[];A.amp.push({t,firma:a.firma,dif,lineas:precio(cfg,mas,{urg:A.tot.urg,tipo:pr.tipo,sinMin:A.lin.some(l=>cfg.cat[l.k]&&cfg.cat[l.k].un==='h')}).lineas,tipo:pr.tipo});
  A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.tot=pr;
  log(A,'Ampliación firmada: '+eur(dif)+' más');return ok({dif})}

 case 'pausa':{
  if(!mio)return R('permiso');if(A.e!=='curso')return R('estado');
  if(enPausa(A)){A.pausas[A.pausas.length-1][1]=t;log(A,'Sigue el trabajo')}else{A.pausas.push([t,0]);log(A,'Pausa')}return ok({pausa:enPausa(A)})}

 case 'anotar':{
  if(!mio&&!esC)return R('permiso');if(A.e==='hecho'||A.e==='cancelado')return R('estado');
  const conFoto=typeof a.foto==='string'&&a.foto.length>0&&a.foto.length<140000;
  if(a.foto!=null&&!conFoto)return R('foto');if(a.obs!=null&&typeof a.obs!=='string')return R('obs');
  if(conFoto&&(A.fotos||[]).length>=4)return R('fotos');if(a.obs==null&&!conFoto)return R('vacio');
  if(a.obs!=null)A.obs=a.obs.trim().slice(0,400);
  if(conFoto){A.fotos=A.fotos||[];A.fotos.push(a.foto)}
  A.v++;return ok()}

 case 'terminar':{
  if(!mio)return R('permiso');if(A.e!=='curso'||!A.tot)return R('estado');
  if(!PAGOS.includes(a.modo))return R('modo');
  if(enPausa(A))A.pausas[A.pausas.length-1][1]=t;
  A.e='hecho';A.fin=t;A.min=minutos(A,t);
  A.gar={hasta:masMeses(madrid(t).date,cfg.meses)};
  A.pago={modo:a.modo,t,cobrado:a.modo!=='pendiente'};if(typeof a.firma==='string'&&a.firma.length>=12)A.conf={t,firma:a.firma};
  msg(A,'hecho');msg(A,'resena',t+120*MIN);if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  log(A,'Terminado. '+eur(A.tot.total)+(A.pago.cobrado?', cobrado ('+a.modo+')':', pendiente de pago'));return ok()}

 case 'cobrar':{
  if(!esC&&!mio)return R('permiso');if(A.e!=='hecho'||!A.pago||A.pago.cobrado)return R('estado');
  if(!PAGOS.includes(a.modo)||a.modo==='pendiente')return R('modo');
  A.pago={modo:a.modo,t,cobrado:true};sinMsg(A,['cobro']);log(A,'Cobrado ('+a.modo+')');return ok()}

 case 'cancelar':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  A.e='cancelado';A.msgs=A.msgs.filter(m=>m.env);log(A,'Cancelado'+(txt(a.motivo).trim()?': '+txt(a.motivo).trim().slice(0,80):''));return ok()}

 case 'ausencia':{
  if(!esC)return R('permiso');if(typeof a.tec!=='string'||!cfg.tec[a.tec])return R('tec');
  const hoy=madrid(t).date;if(!esFecha(a.de)||!esFecha(a.a)||a.a<a.de||a.a<hoy||a.de>masDias(hoy,366)||a.a>masDias(a.de,366))return R('fechas');
  S.ausencias=S.ausencias||[];S.nu=(S.nu||0)+1;const id='U'+S.nu,sueltos=[];
  S.ausencias.push({id,tec:a.tec,de:a.de,a:a.a,motivo:txt(a.motivo).trim().slice(0,60),t});
  S.avisos.forEach(X=>{if(X.tec!==a.tec||X.e!=='asignado')return;const d=X.cita?X.cita.dia:hoy;if(d>=a.de&&d<=a.a){suelta(X,'no está ese día');sueltos.push(X.id)}});
  return ok({id,sueltos})}

 case 'quitarAusencia':{
  if(!esC)return R('permiso');const i=(S.ausencias||[]).findIndex(u=>u.id===a.aus);if(i<0)return R('ausencia');
  S.ausencias.splice(i,1);return ok()}

 case 'enviado':{
  if(!esC&&!mio)return R('permiso');const m=A.msgs.find(x=>x.k===a.k&&!x.env);if(!m)return R('mensaje');
  m.env=t;A.v++;return ok()}

 }
 return R('accion')}

/* ---------- lo que puede ver el cliente de su aviso ---------- */
function vistaCliente(S,cfg,id){const A=S.avisos.find(x=>x.id===id);if(!A)return null;const tec=cfg.tec[A.tec];
 return{id:A.id,av:A.av,e:A.e,urg:A.urg,cita:A.cita,t:A.t,tec:tec?tec.n:'',eta:A.e==='camino'?A.eta:0,sal:A.sal||0,ini:A.ini||0,fin:A.fin||0,
  total:A.tot?A.tot.total:0,tipo:A.tot?A.tot.tipo:0,pago:A.pago?{modo:A.pago.modo,cobrado:A.pago.cobrado}:null,gar:A.gar?A.gar.hasta:'',sinTrabajo:!!A.sinTrabajo}}

/* ---------- las cifras del día para la centralita ---------- */
function resumen(S,cfg,t){const hoy=madrid(t).date,caja={efectivo:0,tarjeta:0,bizum:0,transferencia:0,total:0},pend={n:0,total:0},tec={};
 Object.keys(cfg.tec).forEach(id=>{tec[id]={hoy:0,hechos:0,e:'libre',aviso:''}});
 let nuevos=0,urgentes=0,marcha=0,hechos=0,sinDatos=0;const canal={};ORIGEN.forEach(o=>{canal[o]=0});const mes=hoy.slice(0,7);
 S.avisos.forEach(A=>{
  if(A.e!=='cancelado'&&madrid(A.t).date.slice(0,7)===mes&&canal[A.origen]!=null)canal[A.origen]++;
  if(A.e==='nuevo'||A.e==='ausente'){nuevos++;if(A.urg)urgentes++;if(!A.cli.tel)sinDatos++}
  if(EN_MARCHA.includes(A.e)){marcha++;const x=tec[A.tec];if(x){if(!A.cita||A.cita.dia===hoy||A.e!=='asignado')x.hoy++;if(A.e==='camino'||A.e==='curso'){x.e=A.e;x.aviso=A.id}}}
  if(A.e==='hecho'){const esHoy=madrid(A.fin).date===hoy;if(esHoy){hechos++;if(tec[A.tec])tec[A.tec].hechos++}
   if(A.pago&&A.tot){if(!A.pago.cobrado){pend.n++;pend.total+=A.tot.total}else if(madrid(A.pago.t).date===hoy){caja[A.pago.modo]+=A.tot.total;caja.total+=A.tot.total}}}});
 return{nuevos,urgentes,sinDatos,marcha,hechos,pend,caja,tec,canal,sobran:sobran(S,cfg,t),reasignar:S.avisos.filter(a=>a.reasignar&&a.e==='nuevo').length}}

g.OficioNucleo={ESQ,PAGOS,ORIGEN,MSG,franjaTxt,esFecha,trabaja,ausente,capacidad,puedeIr,sobran,nuevo,cfgDe,aplicar,precio,rango,horas,urgente,tarifaDe,madrid,hhmm,hora,masDias,masMeses,fechaLarga,fechaCorta,eur,tel9,telBonito,normDir,garantiaDe,franjasDe,diasDe,laborable,etaMin,mensaje,minutos,enPausa,vistaCliente,resumen};
})(typeof globalThis!=='undefined'?globalThis:this);
