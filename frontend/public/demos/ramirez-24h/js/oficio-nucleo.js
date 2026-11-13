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
   ============================================================ */
(function(g){
'use strict';
const TZ='Europe/Madrid',ESQ=3,MIN=60000;
const PAGOS=['efectivo','tarjeta','bizum','transferencia','pendiente'];
const EN_MARCHA=['asignado','camino','curso'];
const cts=x=>Math.round(x*100+1e-7);
const red=x=>Math.round(x+1e-7);
const soloNum=s=>String(s==null?'':s).replace(/\D/g,'');

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
const eur=cs=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(cs/100)+' €';

/* ---------- de data del negocio, lo que las reglas necesitan ---------- */
function cfgDe(N){const cat={};
 Object.entries(N.catalogo).forEach(([k,i])=>{const p10=i.p10!=null?cts(i.p10):red(cts(i.p21)/1.1),p21=i.p21!=null?cts(i.p21):red(cts(i.p10)*1.1);
  cat[k]={k,t:i.t,p10,p21,u:!!i.u,mat:!!i.mat,un:i.un||'',min:i.min||1,paso:i.paso||1}});
 const av={},tec={};N.averias.forEach(a=>{av[a.id]=a});N.tecnicos.forEach(x=>{tec[x.id]=x});
 return{N,cat,av,tec,pack:N.pack||'pro',recargo:N.tarifa.recargo,dia:N.tarifa.dia,festivos:N.festivos||[],franjas:N.franjas,cupo:N.cupo,zonas:N.zonas,meses:N.garantiaMeses||12}}
function nuevo(){return{esq:ESQ,v:0,n:0,pack:'',avisos:[]}}

/* ---------- tarifa y precio ---------- */
function urgente(cfg,t){const n=madrid(t);return n.day===0||n.day===6||cfg.festivos.includes(n.date)||n.min<cfg.dia[0]||n.min>=cfg.dia[1]}
const tarifaDe=(cfg,A)=>A.cita?false:urgente(cfg,A.t);
/* primera hora mínima; después, por cuartos de hora empezados */
const horas=min=>Math.max(1,Math.ceil(min/15-1e-9)/4);
function precio(cfg,lineas,o){o=o||{};const L=[];let mat=0,todo=0;
 (lineas||[]).forEach(l=>{let it;
  if(l.k==='otro'){const p=cts(Math.max(0,Math.min(+l.p||0,5000)));if(!p)return;it={k:'otro',t:String(l.t||'Otro material').slice(0,60),p10:p,p21:red(p*1.1),u:false,mat:true,un:'',min:1,paso:1}}
  else it=cfg.cat[l.k];
  if(!it)return;
  let q=+l.q||it.min;q=Math.max(o.sinMin?it.paso:it.min,Math.round(q/it.paso)*it.paso);q=Math.min(q,it.un==='h'?12:20);
  const f=o.urg&&it.u?1+cfg.recargo:1,b=it.p10*q*f;todo+=b;if(it.mat)mat+=b;L.push({it,q,f,p:l.p})});
 const pmat=todo?mat/todo:0,tipo=o.tipo||(o.local||pmat>.4?21:10),motivo=o.local?'local':pmat>.4?'material':'vivienda';
 let total=0;
 const out=L.map(({it,q,f,p})=>{const imp=red((tipo===21?it.p21:it.p10)*q*f);total+=imp;const r={k:it.k,t:it.t,q,un:it.un,mat:it.mat,u:it.u&&!!o.urg,imp};if(it.k==='otro')r.p=+p;return r});
 const base=red(total/(1+tipo/100));
 return{lineas:out,total,base,iva:total-base,tipo,motivo,pmat,urg:!!o.urg,local:!!o.local}}
/* lo que la web enseña de cada avería: de cuánto a cuánto */
function rango(cfg,av,urg){const a=cfg.av[av];if(!a)return null;return{a:precio(cfg,a.min,{urg}).total,b:a.max?precio(cfg,a.max,{urg}).total:null}}

/* ---------- teléfono, dirección y garantía ---------- */
function tel9(s){let d=soloNum(s);if(d.length===13&&d.startsWith('0034'))d=d.slice(4);if(d.length===11&&d.startsWith('34'))d=d.slice(2);return /^[6789]\d{8}$/.test(d)?d:''}
const telBonito=s=>{const d=tel9(s);return d?d.slice(0,3)+' '+d.slice(3,5)+' '+d.slice(5,7)+' '+d.slice(7):String(s||'')};
const VACIAS=new Set(['c','calle','carrer','de','del','la','el','les','los','las','d','av','avda','avenida','avinguda','pl','plaza','placa','pg','passeig','paseo','n','num','numero','piso','pis','puerta','porta']);
const normDir=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[ºª]/g,' ').split(/[^a-z0-9]+/).filter(w=>w&&!VACIAS.has(w)).join(' ');
function garantiaDe(S,cfg,cli,t,menos){const hoy=madrid(t).date,tel=tel9(cli&&cli.tel),dir=normDir(cli&&cli.dir);
 return S.avisos.filter(a=>a.id!==menos&&a.e==='hecho'&&!a.sinTrabajo&&a.gar&&a.gar.hasta>=hoy&&((tel&&tel9(a.cli.tel)===tel)||(dir.length>4&&normDir(a.cli.dir)===dir))).map(a=>a.id)}

/* ---------- citas sin prisa: días y franjas ---------- */
const laborable=(cfg,f)=>{const w=diaSem(f);return w>=1&&w<=5&&!cfg.festivos.includes(f)};
function franjasDe(S,cfg,dia,t,menos){const n=madrid(t);
 return cfg.franjas.map(f=>{const usadas=S.avisos.filter(a=>a.id!==menos&&a.cita&&a.cita.dia===dia&&a.cita.fr===f.id&&a.e!=='cancelado').length,libres=Math.max(0,cfg.cupo-usadas);
  const pasada=dia<n.date||(dia===n.date&&f.de<n.min+120);
  return{id:f.id,de:f.de,a:f.a,txt:'de '+f.de/60+' a '+f.a/60,libres,ok:laborable(cfg,dia)&&!pasada&&libres>0}})}
function diasDe(S,cfg,t,cuantos){const hoy=madrid(t).date,out=[];
 for(let i=0;out.length<(cuantos||6)&&i<28;i++){const f=masDias(hoy,i);if(!laborable(cfg,f))continue;const fr=franjasDe(S,cfg,f,t);
  if(i===0&&!fr.some(x=>x.ok))continue;out.push({dia:f,hoy:i===0,libres:fr.reduce((s,x)=>s+(x.ok?x.libres:0),0),franjas:fr})}
 return out}
const etaMin=(cfg,dis)=>{const z=cfg.zonas.dis[dis];return z?cfg.zonas.banda[z[1]]:cfg.zonas.banda.c};

/* ---------- los mensajes al cliente, ya escritos ---------- */
function mensaje(cfg,A,k){const N=cfg.N,n=(A.cli.nombre||'').split(' ')[0],hola=n?'Hola, '+n+'. ':'Hola. ',tec=cfg.tec[A.tec],T=tec?tec.n:'El técnico',av=cfg.av[A.av],fr=A.cita&&cfg.franjas.find(f=>f.id===A.cita.fr),frt=fr?'de '+fr.de/60+' a '+fr.a/60:'';
 const tot=A.tot?eur(A.tot.total):'';
 switch(k){
  case 'recibido':return hola+'Hemos recibido tu aviso '+A.id+' ('+av.n.toLowerCase()+'). '+(A.cita?'Te confirmamos enseguida quién irá.':'Te decimos enseguida quién va y a qué hora llega.')+' '+N.nombre+'.';
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
 const pro=(S.pack||cfg.pack)!=='basico';
 const A=a.id?S.avisos.find(x=>x.id===a.id):null;
 const esC=q.rol==='centralita',esT=q.rol==='tecnico'&&!!cfg.tec[q.id],mio=!!A&&esT&&A.tec===q.id;
 const nom=q.rol==='cliente'?'Cliente':esT?cfg.tec[q.id].n:esC?'Centralita':'Web';
 const log=(X,txt)=>{X.h.push({t,q:nom,txt});X.v=(X.v||0)+1};
 const msg=(X,k,cuando)=>{X.msgs=X.msgs.filter(m=>m.k!==k||m.env);X.msgs.push({k,t:cuando||t,env:0})};
 const sinMsg=(X,ks)=>{X.msgs=X.msgs.filter(m=>m.env||!ks.includes(m.k))};
 const ok=r=>{S.v++;return Object.assign({ok:true},r)};
 const datosCli=(c0,parcial)=>{const c1=c0||{},nombre=String(c1.nombre||'').trim().replace(/\s+/g,' ').slice(0,60),tel=tel9(c1.tel),dir=String(c1.dir||'').trim().replace(/\s+/g,' ').slice(0,120),cp=soloNum(c1.cp).slice(0,5);
  const dis=cfg.zonas.cp[cp]||(cfg.zonas.dis[c1.dis]?c1.dis:'');
  if(!parcial){if(nombre.length<2)return{err:'nombre'};if(!tel)return{err:'tel'};if(dir.length<5)return{err:'dir'};if(!dis)return{err:cp.length===5?'zona':'cp'}}
  else if(cp.length===5&&!dis)return{err:'zona'};
  return{cli:{nombre,tel,dir,cp,dis}}};
 if(a.tipo!=='pedir'&&a.tipo!=='pack'&&!A)return R('aviso');

 switch(a.tipo){
 case 'pedir':{
  if(!cfg.av[a.av])return R('av');
  const deWeb=a.origen==='web';             // el aviso que deja la web al abrir WhatsApp: los datos llegan después
  const d=datosCli(a.cli,deWeb);if(d.err)return R(d.err);
  let cita=null;
  if(a.cita){const fr=franjasDe(S,cfg,a.cita.dia,t).find(f=>f.id===a.cita.fr);if(!fr||!fr.ok)return R('franja');cita={dia:a.cita.dia,fr:fr.id}}
  const n=++S.n,id=cfg.N.serie+'-'+String(n).padStart(4,'0');
  const X={id,n,v:0,t,origen:a.origen||'cita',av:a.av,nota:String(a.nota||'').trim().slice(0,400),foto:typeof a.foto==='string'&&a.foto.length<140000?a.foto:'',cli:d.cli,cita,urg:!cita,e:'nuevo',tec:'',msgs:[],h:[]};
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
  if(!cfg.tec[a.tec])return R('tec');if(!A.cli.tel||!A.cli.dir||!A.cli.dis)return R('datos');
  A.tec=a.tec;A.e='asignado';delete A.aus;sinMsg(A,['ausente']);
  if(A.cita){msg(A,'cita');const v=masDias(A.cita.dia,-1);if(v>madrid(t).date)msg(A,'vispera',Date.parse(v+'T17:00:00Z'))}
  log(A,'Asignado a '+cfg.tec[a.tec].n);return ok()}

 case 'mover':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  if(a.cita){const fr=franjasDe(S,cfg,a.cita.dia,t,A.id).find(f=>f.id===a.cita.fr);if(!fr||!fr.ok)return R('franja');A.cita={dia:a.cita.dia,fr:fr.id};A.urg=false}
  else{A.cita=null;A.urg=true}
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
  if(pro){const p=a.pres||{};if(typeof p.firma!=='string'||p.firma.length<12)return R('firma');
   const pr=precio(cfg,p.lineas,{urg:tarifaDe(cfg,A),local:!!p.local});if(!pr.total)return R('lineas');
   A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.local=!!p.local;
   A.pres=Object.assign({t,firma:p.firma},pr);A.tot=pr}
  if(!A.sal)A.sal=t;A.e='curso';A.ini=t;A.pausas=[];sinMsg(A,['camino','recibido','cita','vispera']);
  log(A,pro?'Presupuesto firmado: '+eur(A.tot.total)+'. Empieza el trabajo':'Empieza el trabajo');return ok()}

 case 'noacepta':{
  if(!mio)return R('permiso');if(!pro)return R('pack');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  if(!PAGOS.includes(a.modo))return R('modo');
  const pr=precio(cfg,[{k:cfg.N.sinTrabajo||'desp',q:1}],{urg:tarifaDe(cfg,A),local:!!a.local});
  A.tot=pr;A.lin=[{k:cfg.N.sinTrabajo||'desp',q:1}];A.sinTrabajo=true;A.e='hecho';A.fin=t;if(!A.sal)A.sal=t;
  A.pago={modo:a.modo,t,cobrado:a.modo!=='pendiente'};sinMsg(A,['camino','recibido','cita','vispera']);msg(A,'hecho');if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  log(A,'No acepta el precio. Solo el desplazamiento: '+eur(pr.total));return ok()}

 case 'ampliar':{
  if(!mio)return R('permiso');if(!pro)return R('pack');if(A.e!=='curso')return R('estado');
  if(typeof a.firma!=='string'||a.firma.length<12)return R('firma');
  const mas=(a.lineas||[]).filter(l=>l.k==='otro'?+l.p>0:!!cfg.cat[l.k]);if(!mas.length)return R('lineas');
  const junto=A.lin.map(l=>Object.assign({},l));
  mas.forEach(l=>{const ya=l.k!=='otro'&&junto.find(x=>x.k===l.k);if(ya)ya.q+=(+l.q||cfg.cat[l.k].min);else junto.push(l.k==='otro'?{k:'otro',t:l.t,p:+l.p,q:1}:{k:l.k,q:+l.q||cfg.cat[l.k].min})});
  const pr=precio(cfg,junto,{urg:A.tot.urg,local:A.local}),dif=pr.total-A.tot.total;if(dif<=0)return R('lineas');
  A.amp=A.amp||[];A.amp.push({t,firma:a.firma,dif,lineas:precio(cfg,mas,{urg:A.tot.urg,tipo:pr.tipo,sinMin:A.lin.some(l=>l.k==='mo')}).lineas,tipo:pr.tipo});
  A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.tot=pr;
  log(A,'Ampliación firmada: '+eur(dif)+' más');return ok({dif})}

 case 'pausa':{
  if(!mio)return R('permiso');if(A.e!=='curso')return R('estado');
  if(enPausa(A)){A.pausas[A.pausas.length-1][1]=t;log(A,'Sigue el trabajo')}else{A.pausas.push([t,0]);log(A,'Pausa')}return ok({pausa:enPausa(A)})}

 case 'anotar':{
  if(!mio&&!esC)return R('permiso');if(A.e==='hecho'||A.e==='cancelado')return R('estado');
  if(a.obs!=null)A.obs=String(a.obs).trim().slice(0,400);
  if(typeof a.foto==='string'&&a.foto.length<140000){A.fotos=A.fotos||[];if(A.fotos.length>=4)return R('fotos');A.fotos.push(a.foto)}
  A.v++;return ok()}

 case 'terminar':{
  if(!mio)return R('permiso');if(A.e!=='curso')return R('estado');
  if(pro&&!PAGOS.includes(a.modo))return R('modo');
  if(enPausa(A))A.pausas[A.pausas.length-1][1]=t;
  A.e='hecho';A.fin=t;A.min=minutos(A,t);
  A.gar={hasta:masMeses(madrid(t).date,cfg.meses)};
  if(pro){A.pago={modo:a.modo,t,cobrado:a.modo!=='pendiente'};if(typeof a.firma==='string'&&a.firma.length>=12)A.conf={t,firma:a.firma};
   msg(A,'hecho');msg(A,'resena',t+120*MIN);if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN)}
  else msg(A,'hecho');
  log(A,pro?'Terminado. '+eur(A.tot.total)+(A.pago.cobrado?', cobrado ('+a.modo+')':', pendiente de pago'):'Terminado');return ok()}

 case 'cobrar':{
  if(!esC&&!mio)return R('permiso');if(A.e!=='hecho'||!A.pago||A.pago.cobrado)return R('estado');
  if(!PAGOS.includes(a.modo)||a.modo==='pendiente')return R('modo');
  A.pago={modo:a.modo,t,cobrado:true};sinMsg(A,['cobro']);log(A,'Cobrado ('+a.modo+')');return ok()}

 case 'cancelar':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  A.e='cancelado';A.msgs=A.msgs.filter(m=>m.env);log(A,'Cancelado'+(a.motivo?': '+String(a.motivo).slice(0,80):''));return ok()}

 case 'enviado':{
  if(!esC&&!mio)return R('permiso');const m=A.msgs.find(x=>x.k===a.k&&!x.env);if(!m)return R('mensaje');
  m.env=t;A.v++;return ok()}

 case 'pack':{
  if(!esC)return R('permiso');if(a.pack!=='basico'&&a.pack!=='pro')return R('pack');S.pack=a.pack;return ok()}
 }
 return R('accion')}

/* ---------- lo que puede ver el cliente de su aviso ---------- */
function vistaCliente(S,cfg,id){const A=S.avisos.find(x=>x.id===id);if(!A)return null;const tec=cfg.tec[A.tec];
 return{id:A.id,av:A.av,e:A.e,urg:A.urg,cita:A.cita,t:A.t,tec:tec?tec.n:'',eta:A.e==='camino'?A.eta:0,sal:A.sal||0,ini:A.ini||0,fin:A.fin||0,
  total:A.tot?A.tot.total:0,tipo:A.tot?A.tot.tipo:0,pago:A.pago?{modo:A.pago.modo,cobrado:A.pago.cobrado}:null,gar:A.gar?A.gar.hasta:'',sinTrabajo:!!A.sinTrabajo}}

/* ---------- las cifras del día para la centralita ---------- */
function resumen(S,cfg,t){const hoy=madrid(t).date,caja={efectivo:0,tarjeta:0,bizum:0,transferencia:0,total:0},pend={n:0,total:0},tec={};
 Object.keys(cfg.tec).forEach(id=>{tec[id]={hoy:0,hechos:0,e:'libre',aviso:''}});
 let nuevos=0,urgentes=0,marcha=0,hechos=0,sinDatos=0;
 S.avisos.forEach(A=>{
  if(A.e==='nuevo'||A.e==='ausente'){nuevos++;if(A.urg)urgentes++;if(!A.cli.tel)sinDatos++}
  if(EN_MARCHA.includes(A.e)){marcha++;const x=tec[A.tec];if(x){if(!A.cita||A.cita.dia===hoy||A.e!=='asignado')x.hoy++;if(A.e==='camino'||A.e==='curso'){x.e=A.e;x.aviso=A.id}}}
  if(A.e==='hecho'){const esHoy=madrid(A.fin).date===hoy;if(esHoy){hechos++;if(tec[A.tec])tec[A.tec].hechos++}
   if(A.pago&&A.tot){if(!A.pago.cobrado){pend.n++;pend.total+=A.tot.total}else if(madrid(A.pago.t).date===hoy){caja[A.pago.modo]+=A.tot.total;caja.total+=A.tot.total}}}});
 return{nuevos,urgentes,sinDatos,marcha,hechos,pend,caja,tec}}

g.OficioNucleo={ESQ,PAGOS,MSG,nuevo,cfgDe,aplicar,precio,rango,horas,urgente,tarifaDe,madrid,hhmm,hora,masDias,masMeses,fechaLarga,fechaCorta,eur,tel9,telBonito,normDir,garantiaDe,franjasDe,diasDe,laborable,etaMin,mensaje,minutos,enPausa,vistaCliente,resumen};
})(typeof globalThis!=='undefined'?globalThis:this);
