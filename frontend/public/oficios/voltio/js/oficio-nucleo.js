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
   - El desistimiento (ley de consumidores): en una urgencia que pide el cliente, la reparación no lo tiene; lo que se
     añade y no es la reparación, y cualquier trabajo con cita, sí. Para empezar ya, el cliente tiene que pedirlo.
   - El material que falta en un aviso lo apuntan su técnico o la oficina, y se junta por día y por técnico para
     mandarlo por WhatsApp. El cliente no lo ve.
   - Los contratos de mantenimiento: la oficina los da de alta con la firma o el sí del cliente; 14 días para desistir;
     no se renuevan solos. Cada aviso del cliente lleva lo justo del contrato («con») para que todos calculen el mismo precio.
   - Todo lo que llega de fuera se trata como sospechoso: claves que no
     existen, textos que no son texto y cantidades imposibles se rechazan
     sin cambiar nada.
   ============================================================ */
(function(g){
'use strict';
const TZ='Europe/Madrid',ESQ=4,MIN=60000;
/* La versión del código común. Cada copia se la dice a OOOX al abrir «Mejoras»: así se sabe qué copia lleva qué. */
const VERSION='2026.11.15g';   /* la fecha del cambio y, si ese día hay más de uno, una letra */
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
const REV='revision';   /* la avería de la revisión del contrato: la crea la oficina, nunca la web */
function cfgDe(N){const vacio=()=>Object.create(null),limpio=o=>Object.assign(vacio(),o||{}),cat=vacio();
 Object.entries(N.catalogo).forEach(([k,i])=>{const p10=i.p10!=null?cts(i.p10):red(cts(i.p21)/1.1),p21=i.p21!=null?cts(i.p21):red(cts(i.p10)*1.1);
  cat[k]={k,t:i.t,p10,p21,u:!!i.u,mat:!!i.mat,extra:!!i.extra,un:i.un||'',min:i.min||1,paso:i.paso||1};
  /* lo que tarda ese servicio, por unidad, y a qué servicio de la base de OOOX corresponde */
  if(Array.isArray(i.dur)&&i.dur.length===2&&i.dur[0]>0&&i.dur[1]>=i.dur[0])cat[k].dur=[i.dur[0],i.dur[1]];if(typeof i.base==='string')cat[k].base=i.base});
 const av=vacio(),tec=vacio(),planes=vacio();N.averias.forEach(a=>{av[a.id]=a});N.tecnicos.forEach(x=>{tec[x.id]=x});
 /* el mantenimiento: sus planes y la revisión, que es un aviso más pero no se pide desde la web */
 const MT=N.mantenimiento;if(MT&&Array.isArray(MT.planes)&&MT.revision){av[REV]=Object.assign({},MT.revision,{id:REV,min:MT.revision.ini,max:null,interna:true});
  MT.planes.forEach(x=>{planes[x.id]={id:x.id,n:x.n,precio:cts(x.precio),iva:x.iva||21,revisiones:x.revisiones||1,desp:typeof x.desp==='string'&&cat[x.desp]?x.desp:'',rev:typeof x.rev==='string'&&cat[x.rev]?x.rev:'',prioridad:!!x.prioridad}})}
 const zonas={banda:limpio(N.zonas.banda),dis:limpio(N.zonas.dis),cp:limpio(N.zonas.cp)};
 return{N,cat,av,tec,planes,pack:N.pack||'pro',recargo:N.tarifa.recargo,dia:N.tarifa.dia,festivos:N.festivos||[],franjas:N.franjas,cupo:N.cupo,zonas,
  etaMax:Math.max.apply(null,Object.values(zonas.banda)),horas:Object.keys(cat).find(k=>cat[k].un==='h')||'',meses:N.garantiaMeses||12,
  mapa:N.mapa&&typeof N.mapa==='object'?N.mapa:null,conHorario:!!(N.horario||N.tecnicos.some(x=>x.horario)),porFranja:(N.citas&&N.citas.porFranja)||1,reserva:(N.citas&&N.citas.reserva)||0,hayGuardia:N.tecnicos.some(x=>x.guardia),
  urge:typeof N.tarifa.urgente==='string'&&cat[N.tarifa.urgente]?N.tarifa.urgente:''}}
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
  const gr=Array.isArray(o.gratis)&&o.gratis.includes(it.k);
  let q=+l.q||it.min;q=Math.max(o.sinMin?it.paso:it.min,Math.round(q/it.paso)*it.paso);q=Math.min(q,it.un==='h'?12:20);
  const f=o.urg&&it.u?1+cfg.recargo:1,b=gr?0:it.p10*q*f;todo+=b;if(it.mat)mat+=b;L.push({it,q,f,p:l.p,gr})});
 const pmat=todo?mat/todo:0,tipo=o.tipo||(o.local||pmat>.4?21:10),motivo=o.local?'local':pmat>.4?'material':'vivienda';
 let total=0;
 const out=L.map(({it,q,f,p,gr})=>{const imp=gr?0:red((tipo===21?it.p21:it.p10)*q*f);total+=imp;const r={k:it.k,t:it.t,q,un:it.un,mat:it.mat,u:it.u&&!!o.urg&&!gr,imp};if(it.k==='otro')r.p=+p;if(gr)r.con=true;return r});
 const base=red(total/(1+tipo/100));
 return{lineas:out,total,base,iva:total-base,tipo,motivo,pmat,urg:!!o.urg,local:!!o.local}}
/* lo que la web enseña de cada avería: de cuánto a cuánto */
function rango(cfg,av,urg){const a=typeof av==='string'?cfg.av[av]:null;if(!a)return null;return{a:precio(cfg,a.min,{urg}).total,b:a.max?precio(cfg,a.max,{urg}).total:null}}

/* ---------- el desistimiento (ley de consumidores, artículos 102 a 108) ----------
   Provisional hasta que lo revise el abogado. Un trabajo que se contrata en casa del cliente le da 14 días para desistir,
   salvo la reparación urgente que pidió él mismo (artículo 103 h). Lo que se añade en esa visita y no es la reparación
   (lo marcado «extra» en el catálogo, como instalar un aparato nuevo) sí lo tiene. Para empezar ya, el cliente tiene que
   pedirlo y saber que, hecho el trabajo, ya no podrá desistir (artículo 103 a): esa petición se firma con el presupuesto.
   'urgente': no hace falta nada · 'urgente+': lleva algo añadido · 'cita': trabajo sin urgencia */
function desiste(cfg,A,lineas){if(!A)return'';const mas=(Array.isArray(lineas)?lineas:[]).some(l=>l&&typeof l.k==='string'&&!!cfg.cat[l.k]&&cfg.cat[l.k].extra);
 return A.cita?'cita':mas?'urgente+':'urgente'}
const pideYa=c=>c==='cita'||c==='urgente+';

/* ---------- teléfono, dirección y garantía ---------- */
function tel9(s){let d=soloNum(s);if(d.length===13&&d.startsWith('0034'))d=d.slice(4);if(d.length===11&&d.startsWith('34'))d=d.slice(2);return /^[6789]\d{8}$/.test(d)?d:''}
/* nombre y apellidos juntos, para enseñarlo; los avisos de antes de los apellidos solo tienen nombre */
const nomCli=c=>c&&typeof c==='object'?[txt(c.nombre),txt(c.apellidos)].map(x=>x.trim()).filter(Boolean).join(' '):'';
const telBonito=s=>{const d=tel9(s);return d?d.slice(0,3)+' '+d.slice(3,5)+' '+d.slice(5,7)+' '+d.slice(7):String(s||'')};
const VACIAS=new Set(['c','calle','carrer','de','del','la','el','les','los','las','d','av','avda','avenida','avinguda','pl','plaza','placa','pg','passeig','paseo','n','num','numero','piso','pis','puerta','porta']);
const normDir=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[ºª]/g,' ').split(/[^a-z0-9]+/).filter(w=>w&&!VACIAS.has(w)).join(' ');
function garantiaDe(S,cfg,cli,t,menos){const hoy=madrid(t).date,tel=tel9(cli&&cli.tel),dir=normDir(cli&&cli.dir);
 return S.avisos.filter(a=>a.id!==menos&&a.e==='hecho'&&!a.sinTrabajo&&a.gar&&a.gar.hasta>=hoy&&((tel&&tel9(a.cli.tel)===tel)||(dir.length>4&&normDir(a.cli.dir)===dir))).map(a=>a.id)}

/* ---------- los contratos de mantenimiento (15-11-2026) ----------
   Un contrato es de un cliente y de una finca (su teléfono y su edificio). Va por periodos de un año: «per», cada uno con
   su precio y su pago. Está vigente si está de alta y hoy cae dentro de un periodo. */
const planDe=(cfg,id)=>typeof id==='string'&&cfg.planes?cfg.planes[id]||null:null;
const perDe=(C,d)=>Array.isArray(C&&C.per)?C.per.findIndex(p=>p.de<=d&&p.a>=d):-1;
const vigente=(C,d)=>!!C&&C.e==='activo'&&perDe(C,d)>=0;
const pagoDe=(modo,t)=>modo&&modo!=='pendiente'?{modo,t,cobrado:true}:{modo:'pendiente',t,cobrado:false};
function contratoDe(S,cli,d){const t9=tel9(cli&&cli.tel),fi=fincaDe(cli&&cli.dir);if(!t9||fi.length<5)return null;
 return(S.contratos||[]).find(C=>tel9(C.cli.tel)===t9&&fincaDe(C.cli.dir)===fi&&vigente(C,d))||null}
/* lo que el contrato da a un aviso: sin desplazamiento en urgencias, la revisión incluida (las que tiene el plan) y prioridad */
function conDe(S,cfg,A,t){const d=madrid(t).date,C=contratoDe(S,A.cli,d),P=C&&planDe(cfg,C.plan);if(!P)return null;const per=perDe(C,d);
 const usadas=S.avisos.filter(x=>x.id!==A.id&&x.e!=='cancelado'&&x.con&&x.con.id===C.id&&x.con.per===per&&x.con.rev).length;
 return{id:C.id,per,desp:P.desp,urge:cfg.urge,rev:A.av===REV&&usadas<P.revisiones?P.rev:'',pri:P.prioridad}}
/* lo que no se cobra en un aviso: en la revisión incluida, la revisión y el desplazamiento; en una urgencia, el desplazamiento
   y el suplemento de urgencia (una revisión de más no es una urgencia: se paga entera) */
const gratisDe=A=>!A||!A.con?[]:A.con.rev?[A.con.rev,A.con.desp].filter(Boolean):A.urg&&A.av!==REV?[A.con.desp,A.con.urge].filter(Boolean):[];

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
/* lo que cabe de verdad en una franja, contando a quien se guarda para urgencias: es el tope de la oficina */
function capacidadTotal(S,cfg,dia,f){if(!cfg.conHorario)return cfg.cupo;
 return Object.keys(cfg.tec).filter(id=>trabaja(cfg,id,dia,f.de,f.a)&&!ausente(S,id,dia)).length*cfg.porFranja}
/* lo que se ofrece al cliente: eso mismo, menos lo que se guarda para urgencias */
function capacidad(S,cfg,dia,f){const n=capacidadTotal(S,cfg,dia,f);return cfg.conHorario?Math.max(0,n-cfg.reserva):n}
/* ¿puede ir este técnico a este aviso? Devuelve '' si puede, o el motivo.
   Quien tiene apuntada una ausencia ese día no puede, tenga o no horarios el negocio. Lo demás sale de los horarios. */
function puedeIr(S,cfg,A,tec,t){if(typeof tec!=='string'||!cfg.tec[tec])return'tec';
 if(A.cita){const f=cfg.franjas.find(x=>x.id===A.cita.fr);if(ausente(S,tec,A.cita.dia))return'ausente_tec';if(!cfg.conHorario)return'';if(!f||!trabaja(cfg,tec,A.cita.dia,f.de,f.a))return'horario';
  return citasDe(S,tec,A.cita.dia,A.cita.fr,A.id)>=cfg.porFranja?'lleno':''}
 const n=madrid(t);if(ausente(S,tec,n.date))return'ausente_tec';if(!cfg.conHorario)return'';
 /* una urgencia fuera de horario va a quien hace guardias, si el negocio ha dicho quién las hace */
 const ahora=laborable(cfg,n.date)&&trabaja(cfg,tec,n.date,n.min,n.min);
 return!ahora&&cfg.hayGuardia&&!cfg.tec[tec].guardia?'horario':''}
/* franjas que vienen con más citas de las que caben contando a todo el que trabaja (pasa cuando alguien se pone enfermo): hay que mover alguna.
   Usar el hueco que se guarda para urgencias no es que sobre nada: eso lo puede decidir la oficina. */
function sobran(S,cfg,t){const hoy=madrid(t).date,vistas=new Set(),out=[];
 S.avisos.forEach(a=>{if(!a.cita||a.cita.dia<hoy||!['nuevo','asignado','ausente'].includes(a.e))return;const k=a.cita.dia+' '+a.cita.fr;if(vistas.has(k))return;vistas.add(k);
  const f=cfg.franjas.find(x=>x.id===a.cita.fr);if(!f)return;const n=enFranja(S,a.cita.dia,a.cita.fr)-capacidadTotal(S,cfg,a.cita.dia,f);if(n>0)out.push({dia:a.cita.dia,fr:a.cita.fr,sobran:n})});
 return out.sort((x,y)=>x.dia<y.dia?-1:x.dia>y.dia?1:x.fr<y.fr?-1:1)}
/* Las franjas de un día. «ok» es lo que puede reservar el cliente: día laborable, con hueco y con dos horas de margen.
   «okOf» es lo que puede poner la oficina: además, el hueco que se guarda para urgencias y las franjas de hoy que aún no
   han acabado. Lo que no puede nadie: un día que no se trabaja, una franja que ya acabó o sin nadie que la trabaje con sitio.
   «por» dice por qué una franja solo la puede poner la oficina: 'reserva', 'margen' o las dos. */
function franjasDe(S,cfg,dia,t,menos){const n=madrid(t);
 return cfg.franjas.map(f=>{const usadas=enFranja(S,dia,f.id,menos),cap=capacidad(S,cfg,dia,f),tope=capacidadTotal(S,cfg,dia,f),libres=Math.max(0,cap-usadas);
  const lab=laborable(cfg,dia),pasada=dia<n.date||(dia===n.date&&f.de<n.min+120),acabada=dia<n.date||(dia===n.date&&f.a<=n.min);
  const ok=lab&&!pasada&&libres>0,okOf=lab&&!acabada&&tope>usadas;
  return{id:f.id,de:f.de,a:f.a,txt:franjaTxt(f),cap,libres,ok,tope,libresOf:Math.max(0,tope-usadas),okOf,por:ok||!okOf?'':[libres>0?'':'reserva',pasada?'margen':''].filter(Boolean).join('+')}})}
/* Los próximos días con cita. Con «of», como los ve la oficina. */
function diasDe(S,cfg,t,cuantos,of){const hoy=madrid(t).date,out=[];
 for(let i=0;out.length<(cuantos||6)&&i<28;i++){const f=masDias(hoy,i);if(!laborable(cfg,f))continue;const fr=franjasDe(S,cfg,f,t);
  if(i===0&&!fr.some(x=>of?x.okOf:x.ok))continue;out.push({dia:f,hoy:i===0,libres:fr.reduce((s,x)=>s+(x.ok?x.libres:0),0),franjas:fr})}
 return out}
const etaMin=(cfg,dis)=>{const z=typeof dis==='string'?cfg.zonas.dis[dis]:null;return(z&&cfg.zonas.banda[z[1]])||cfg.etaMax};

/* ---------- los tiempos: lo que tarda cada trabajo y cuándo puede llegar cada técnico a una urgencia ----------
   «dur» de cada avería, en los datos del negocio: [mínimo, máximo] en minutos, lo que dice el dueño. Si no está, sale de
   las horas de mano de obra de su presupuesto de partida, con 20 minutos más para ver la avería y recoger. */
function durDe(cfg,av){const a=typeof av==='string'?cfg.av[av]:null;if(!a)return[45,120];
 if(Array.isArray(a.dur)&&a.dur.length===2&&a.dur[0]>0&&a.dur[1]>=a.dur[0])return[a.dur[0],a.dur[1]];
 /* si su presupuesto de partida lleva servicios con lo que tardan («dur» en el catálogo), la suma de eso */
 const sv=(a.ini||[]).some(l=>{const it=cfg.cat[l.k];return it&&Array.isArray(it.dur)});
 if(sv){let lo=0,hi=0;(a.ini||[]).forEach(l=>{const it=cfg.cat[l.k];if(!it)return;const q=+l.q||it.min||1;if(Array.isArray(it.dur)){lo+=it.dur[0]*q;hi+=it.dur[1]*q}else if(it.un==='h'){lo+=q*60;hi+=q*60}});
  return[Math.round(lo)+10,Math.round(hi)+10]}
 const h=(a.ini||[]).reduce((x,l)=>{const it=cfg.cat[l.k];return x+(it&&it.un==='h'?(+l.q||it.min||1):0)},0),m=Math.max(30,Math.round(h*60)+20);
 return[Math.max(15,m-15),m+30]}
/* lo que tardan unas líneas de presupuesto: cada servicio, lo normal de su «dur» por unidad; las horas, sus horas; el
   material, nada. Con algo de trabajo, 10 minutos más para preparar y recoger; 0 si no hay nada que medir */
function durLineas(cfg,L){let m=0,hay=false;(Array.isArray(L)?L:[]).forEach(l=>{const it=l&&cfg.cat[l.k];if(!it)return;const q=+l.q||it.min||1;
 if(Array.isArray(it.dur)){m+=it.dur[0]*q;hay=true}else if(it.un==='h'){m+=q*60;hay=true}});return hay?Math.round(m)+10:0}
/* lo que se espera que dure un aviso: lo normal de su avería o, si ya tiene precio, lo que tardan sus líneas */
function durEst(cfg,A){const d=durDe(cfg,A&&A.av),m=Math.round((d[0]+d[1])/2),x=durLineas(cfg,A&&A.lin);return x?Math.max(m,x):m}
/* cuánto le falta a un técnico para quedar libre, en minutos: lo que le queda del trabajo de ahora (o del camino y el
   trabajo) y las urgencias que ya tiene en cola, cada una con su camino */
function ocupacion(S,cfg,tec,t){let m=0;
 S.avisos.forEach(A=>{if(A.tec!==tec)return;
  if(A.e==='curso')m+=Math.max(5,durEst(cfg,A)-minutos(A,t));
  else if(A.e==='camino')m+=Math.max(0,Math.round(((A.eta||t)-t)/MIN))+durEst(cfg,A);
  else if(A.e==='asignado'&&!A.cita)m+=etaMin(cfg,A.cli.dis)+durEst(cfg,A)});
 return m}
/* su siguiente cita de hoy que aún no ha empezado: la hora a la que empieza su franja */
function proximaCita(S,cfg,tec,t){const n=madrid(t);let p=null;
 S.avisos.forEach(A=>{if(A.tec!==tec||A.e!=='asignado'||!A.cita||A.cita.dia!==n.date)return;const f=cfg.franjas.find(x=>x.id===A.cita.fr);
  if(f&&f.a>n.min&&(!p||f.de<p.de))p={id:A.id,de:f.de}});return p}
/* hasta qué hora trabaja ahora (minutos del día); null si no tiene horario o ahora no le toca */
function finTurno(cfg,tec,n){const h=horarioDe(cfg,tec);if(!h)return null;const b=(h[diaSem(n.date)]||[]).find(x=>x[0]<=n.min&&x[1]>n.min);return b?b[1]:null}
/* Para una urgencia en un barrio («dis»): quién puede ir y cuándo llegaría, del que antes llega al que más tarda.
   «choca»: llegaría tarde a su siguiente cita de hoy. «fuera»: acabaría después de su hora de salir, o ahora no le toca
   trabajar y no hace guardias. Los que tienen una de las dos van al final. */
function llegadas(S,cfg,dis,t,av){const n=madrid(t),d=durDe(cfg,av),nueva=Math.round((d[0]+d[1])/2),viaje=etaMin(cfg,dis),out=[];
 Object.keys(cfg.tec).forEach(tec=>{if(puedeIr(S,cfg,{urg:true,cli:{dis}},tec,t))return;
  const libre=ocupacion(S,cfg,tec,t),llega=libre+viaje,pc=proximaCita(S,cfg,tec,t),gu=!!cfg.tec[tec].guardia;
  let fuera=false;if(cfg.conHorario&&horarioDe(cfg,tec)&&!gu){const ft=finTurno(cfg,tec,n);fuera=ft==null||!laborable(cfg,n.date)||n.min+llega+nueva>ft}
  const hoy=S.avisos.filter(A=>A.tec===tec&&A.e!=='cancelado'&&((A.cita&&A.cita.dia===n.date)||madrid(A.fin||A.ini||A.t).date===n.date)).length;
  out.push({tec,libre,viaje,llega,choca:pc&&n.min+llega+nueva>pc.de?pc.id:'',fuera,hoy})});
 /* a igual tiempo, el que menos trabajos lleva hoy: así se reparte */
 return out.sort((a,b)=>((a.choca||a.fuera)?1:0)-((b.choca||b.fuera)?1:0)||a.llega-b.llega||a.hoy-b.hoy||(a.tec<b.tec?-1:1))}
/* lo que se le puede decir a quien pide una urgencia: llegamos en unos «de» a «a» minutos (de cinco en cinco), con
   el que antes llega sin dejar tirada una cita ni salirse de su horario; null si ahora no hay nadie así */
function urgenciaAhora(S,cfg,dis,t,av){const L=llegadas(S,cfg,dis,t,av).filter(x=>!x.choca&&!x.fuera);if(!L.length)return null;
 const m=Math.ceil(Math.max(L[0].llega,10)/5)*5;return{tec:L[0].tec,de:m,a:m+15}}

/* ---------- la urgencia como extra: el suplemento ----------
   «tarifa.urgente» en los datos: la línea del catálogo del suplemento. Va en el presupuesto de partida de un aviso
   «cuanto antes» (sin cita); con cita, no. Con contrato de mantenimiento, va incluido (gratisDe). */
function iniDe(cfg,A){const a=A&&typeof A.av==='string'?cfg.av[A.av]:null;if(!a)return[];const L=(a.ini||[]).map(l=>l.q!=null?{k:l.k,q:l.q}:{k:l.k});
 if(cfg.urge&&!A.cita&&A.av!==REV&&!L.some(l=>l.k===cfg.urge))L.unshift({k:cfg.urge});return L}
/* lo que se lleva OOOX de cada suplemento de urgencia cobrado, sin IVA: propuesta pendiente de Oscar */
const COMISION_URG=.1;
/* las urgencias cobradas en un mes (por la fecha del cobro): cuántas, el suplemento sin IVA y la parte de OOOX, en céntimos */
function urgenciasMes(S,cfg,mes){let n=0,base=0;
 if(cfg.urge)S.avisos.forEach(A=>{if(A.e!=='hecho'||!A.tot||!A.pago||!A.pago.cobrado||!A.pago.t||madrid(A.pago.t).date.slice(0,7)!==mes)return;
  const l=(A.tot.lineas||[]).find(x=>x.k===cfg.urge&&x.imp>0);if(!l)return;n++;base+=red(l.imp/(1+(A.tot.tipo||10)/100))});
 return{n,base,oox:red(base*COMISION_URG),pct:COMISION_URG}}

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
const CON_ACC=['cobroContrato','renovar','bajaContrato'],SIN_AVISO=['pedir','ausencia','quitarAusencia','contrato'].concat(CON_ACC);
function aplicar(S,cfg,a,q,t){t=t||Date.now();q=q||{};a=a||{};
 const R=err=>({ok:false,err});
 const A=typeof a.id==='string'?S.avisos.find(x=>x.id===a.id):null;
 const esC=q.rol==='centralita',esT=q.rol==='tecnico'&&typeof q.id==='string'&&!!cfg.tec[q.id],mio=!!A&&esT&&A.tec===q.id;
 const nom=q.rol==='cliente'?'Cliente':esT?cfg.tec[q.id].n:esC?'Centralita':'Web';
 const log=(X,txt)=>{X.h.push({t,q:nom,txt});X.v=(X.v||0)+1};
 const msg=(X,k,cuando)=>{X.msgs=X.msgs.filter(m=>m.k!==k||m.env);X.msgs.push({k,t:cuando||t,env:0})};
 const sinMsg=(X,ks)=>{X.msgs=X.msgs.filter(m=>m.env||!ks.includes(m.k))};
 const ok=r=>{S.v++;return Object.assign({ok:true},r)};
 const datosCli=(c0,parcial)=>{const c1=c0&&typeof c0==='object'?c0:{},nombre=txt(c1.nombre).trim().replace(/\s+/g,' ').slice(0,60),apellidos=txt(c1.apellidos).trim().replace(/\s+/g,' ').slice(0,80),tel=tel9(c1.tel),dir=txt(c1.dir).trim().replace(/\s+/g,' ').slice(0,120),cp=soloNum(c1.cp).slice(0,5);
  const dis=cfg.zonas.cp[cp]||(typeof c1.dis==='string'&&cfg.zonas.dis[c1.dis]?c1.dis:'');
  if(!parcial){if(nombre.length<2)return{err:'nombre'};if(apellidos.length<2)return{err:'apellidos'};if(!tel)return{err:'tel'};if(dir.length<5)return{err:'dir'};if(!dis)return{err:cp.length===5?'zona':'cp'}}
  else if(cp.length===5&&!dis)return{err:'zona'};
  return{cli:{nombre,apellidos,tel,dir,cp,dis}}};
 const unaCita=c=>c&&typeof c==='object'&&typeof c.dia==='string'&&typeof c.fr==='string';
 /* queda escrito cuando la oficina pone una cita donde el cliente no habría podido */
 const porOf=c=>!c.of?'':c.of==='margen'?', con menos de dos horas de margen':c.of==='reserva'?', en el hueco que se guarda para urgencias':', hoy mismo y en el hueco que se guarda para urgencias';
 if(!SIN_AVISO.includes(a.tipo)&&!A)return R('aviso');
 const C=CON_ACC.includes(a.tipo)&&typeof a.id==='string'?(S.contratos||[]).find(x=>x.id===a.id)||null:null;
 const logC=(X,txt)=>{X.h.push({t,q:nom,txt});X.v=(X.v||0)+1};
 /* si el técnico que lo llevaba ya no puede (cambio de hora o ausencia), el aviso vuelve a la bandeja marcado */
 const suelta=(X,por)=>{log(X,cfg.tec[X.tec].n+' '+por+': queda sin asignar');X.tec='';if(X.e==='asignado')X.e='nuevo';X.reasignar=true;sinMsg(X,['cita','vispera'])};

 switch(a.tipo){
 case 'pedir':{
  if(typeof a.av!=='string'||!cfg.av[a.av]||(a.av===REV&&!esC))return R('av');
  const deWeb=a.origen==='web';             // el aviso que deja la web al abrir WhatsApp: los datos llegan después
  const d=datosCli(a.cli,deWeb);if(d.err)return R(d.err);
  let cita=null;
  let vale=null;
  if(a.cita){if(!unaCita(a.cita))return R('franja');const fr=franjasDe(S,cfg,a.cita.dia,t).find(f=>f.id===a.cita.fr);if(!fr||!(esC?fr.okOf:fr.ok))return R('franja');cita={dia:a.cita.dia,fr:fr.id,ok:true};if(fr.por)cita.of=fr.por;
   /* «vale»: la franja reservada y, si el cliente las dio, otras que también le van bien (hasta cuatro) */
   const hoy=madrid(t).date;vale=[{dia:cita.dia,fr:cita.fr}];
   (Array.isArray(a.alt)?a.alt:[]).slice(0,8).forEach(x=>{if(vale.length<5&&unaCita(x)&&esFecha(x.dia)&&x.dia>=hoy&&laborable(cfg,x.dia)&&cfg.franjas.some(f=>f.id===x.fr)&&!vale.some(v=>v.dia===x.dia&&v.fr===x.fr))vale.push({dia:x.dia,fr:x.fr})})}
  const n=++S.n,id=cfg.N.serie+'-'+String(n).padStart(4,'0');
  const X={id,n,v:0,t,origen:a.origen==null?'cita':ORIGEN.includes(a.origen)?a.origen:'otro',av:a.av,nota:txt(a.nota).trim().slice(0,400),foto:typeof a.foto==='string'&&a.foto.length<140000?a.foto:'',cli:d.cli,cita,urg:!cita,e:'nuevo',tec:'',msgs:[],h:[]};if(vale)X.vale=vale;
  const g0=garantiaDe(S,cfg,X.cli,t);if(g0.length)X.gar0=g0[g0.length-1];
  const c0=conDe(S,cfg,X,t);if(c0)X.con=c0;
  S.avisos.push(X);log(X,(cita?'Cita pedida'+porOf(cita):'Aviso recibido')+(c0?'. Cliente con contrato de mantenimiento ('+c0.id+')':''));
  if(X.cli.tel)msg(X,'recibido');
  return ok({id})}

 case 'completar':{
  if(!esC&&!mio)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  const d=datosCli(Object.assign({},A.cli,a.cli),false);if(d.err)return R(d.err);
  const antes=A.cli.tel;A.cli=d.cli;const g0=garantiaDe(S,cfg,A.cli,t,A.id);if(g0.length)A.gar0=g0[g0.length-1];else delete A.gar0;
  /* el contrato lo vuelve a mirar la oficina, que es quien tiene la lista: el técnico no la tiene y lo quitaría sin querer */
  if(esC&&!A.pres&&!A.tot){const c1=conDe(S,cfg,A,t);if(c1)A.con=c1;else delete A.con}
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
  if(a.cita){if(!unaCita(a.cita))return R('franja');const fr=franjasDe(S,cfg,a.cita.dia,t,A.id).find(f=>f.id===a.cita.fr);if(!fr||!fr.okOf)return R('franja');const yaVale=(A.vale||[]).some(v=>v.dia===a.cita.dia&&v.fr===fr.id);if(a.confirmado&&!yaVale)A.vale=(A.vale||[]).concat([{dia:a.cita.dia,fr:fr.id}]);
   A.cita={dia:a.cita.dia,fr:fr.id,ok:yaVale||!!a.confirmado};if(fr.por)A.cita.of=fr.por;A.urg=false}
  else{A.cita=null;A.urg=true}
  if(A.tec&&puedeIr(S,cfg,A,A.tec,t))suelta(A,'no puede en ese horario');
  if(A.e==='ausente'){A.e=A.tec?'asignado':'nuevo';delete A.aus;sinMsg(A,['ausente'])}
  sinMsg(A,['cita','vispera']);
  if(A.cita&&A.e==='asignado'){msg(A,'cita');const v=masDias(A.cita.dia,-1);if(v>madrid(t).date)msg(A,'vispera',Date.parse(v+'T17:00:00Z'))}
  log(A,A.cita?'Cita cambiada al '+fechaLarga(A.cita.dia)+porOf(A.cita):'Pasa a urgente');return ok()}

 case 'voy':{
  if(!mio)return R('permiso');if(A.e!=='asignado')return R('estado');
  if(S.avisos.some(x=>x.id!==A.id&&x.tec===A.tec&&(x.e==='camino'||x.e==='curso')))return R('ocupado');
  A.e='camino';A.sal=t;A.eta=t+etaMin(cfg,A.cli.dis)*MIN;delete A.pos;delete A.posNo;sinMsg(A,['recibido','cita','vispera']);msg(A,'camino');log(A,'Va de camino');return ok({eta:A.eta})}

 /* La posición del técnico que va de camino. Solo si el negocio lo tiene activado (mapa en sus datos), solo la manda él,
    solo mientras va, y solo se guarda la última: al llegar, al no encontrar a nadie o si deja de compartirla, se borra. */
 case 'posicion':{
  if(!mio)return R('permiso');if(!cfg.mapa)return R('mapa');if(A.e!=='camino'||A.posNo)return R('estado');
  if(typeof a.lat!=='number'||typeof a.lon!=='number'||!(a.lat>=-90&&a.lat<=90)||!(a.lon>=-180&&a.lon<=180))return R('posicion');
  A.pos={lat:Math.round(a.lat*1e5)/1e5,lon:Math.round(a.lon*1e5)/1e5,t};return ok()}
 case 'sinPosicion':{
  if(!mio)return R('permiso');if(!cfg.mapa)return R('mapa');if(A.e!=='camino'||A.posNo)return R('estado');
  delete A.pos;A.posNo=true;log(A,'Deja de compartir su posición');return ok()}

 case 'ausente':{
  if(!mio)return R('permiso');if(A.e!=='camino')return R('estado');
  A.e='ausente';A.aus=t;delete A.pos;delete A.posNo;sinMsg(A,['camino']);msg(A,'ausente');log(A,'No había nadie');return ok()}

 case 'empezar':{
  if(!mio)return R('permiso');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  if(S.avisos.some(x=>x.id!==A.id&&x.tec===A.tec&&(x.e==='camino'||x.e==='curso')))return R('ocupado');
  const p=a.pres&&typeof a.pres==='object'?a.pres:{};if(typeof p.firma!=='string'||p.firma.length<12)return R('firma');
  const pr=precio(cfg,p.lineas,{urg:tarifaDe(cfg,A),local:!!p.local,gratis:gratisDe(A)});if(!pr.lineas.length||(!pr.total&&!pr.lineas.some(l=>l.con)))return R('lineas');
  const des=desiste(cfg,A,p.lineas);if(pideYa(des)&&p.pide!==true)return R('pide');
  A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.local=!!p.local;
  A.pres=Object.assign({t,firma:p.firma,des:{c:des,pide:pideYa(des)?t:0}},pr);A.tot=pr;
  if(!A.sal)A.sal=t;A.e='curso';A.ini=t;A.pausas=[];delete A.pos;delete A.posNo;sinMsg(A,['camino','recibido','cita','vispera']);
  log(A,'Presupuesto firmado: '+eur(A.tot.total)+'. Empieza el trabajo');return ok()}

 case 'noacepta':{
  if(!mio)return R('permiso');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  const pr=precio(cfg,[{k:cfg.N.sinTrabajo,q:1}],{urg:tarifaDe(cfg,A),local:!!a.local,gratis:gratisDe(A)});
  if(pr.total&&!PAGOS.includes(a.modo))return R('modo');
  A.tot=pr;A.lin=[{k:cfg.N.sinTrabajo,q:1}];A.local=!!a.local;A.sinTrabajo=true;A.e='hecho';A.fin=t;if(!A.sal)A.sal=t;delete A.pos;delete A.posNo;
  A.pago=pr.total?{modo:a.modo,t,cobrado:a.modo!=='pendiente'}:{modo:'',t,cobrado:true};sinMsg(A,['camino','recibido','cita','vispera']);msg(A,'hecho');if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  log(A,'No acepta el precio. '+(pr.total?'Solo el desplazamiento: '+eur(pr.total):'El desplazamiento va en su contrato: no se cobra nada'));return ok()}

 case 'ampliar':{
  if(!mio)return R('permiso');if(A.e!=='curso'||!A.tot||!A.lin)return R('estado');
  if(typeof a.firma!=='string'||a.firma.length<12)return R('firma');
  const mas=(Array.isArray(a.lineas)?a.lineas:[]).filter(l=>l&&typeof l==='object'&&(l.q==null||+l.q>0)&&(l.k==='otro'?+l.p>0:typeof l.k==='string'&&!!cfg.cat[l.k]));if(!mas.length)return R('lineas');
  const des=desiste(cfg,A,mas);if(pideYa(des)&&a.pide!==true)return R('pide');
  const junto=A.lin.map(l=>Object.assign({},l));
  mas.forEach(l=>{const ya=l.k!=='otro'&&junto.find(x=>x.k===l.k);if(ya)ya.q+=(+l.q||cfg.cat[l.k].min);else junto.push(l.k==='otro'?{k:'otro',t:l.t,p:+l.p,q:1}:{k:l.k,q:+l.q||cfg.cat[l.k].min})});
  const gr=gratisDe(A),pr=precio(cfg,junto,{urg:A.tot.urg,local:A.local,gratis:gr}),dif=pr.total-A.tot.total;if(dif<=0)return R('lineas');
  A.amp=A.amp||[];A.amp.push({t,firma:a.firma,dif,des:{c:des,pide:pideYa(des)?t:0},lineas:precio(cfg,mas,{urg:A.tot.urg,tipo:pr.tipo,sinMin:A.lin.some(l=>cfg.cat[l.k]&&cfg.cat[l.k].un==='h'),gratis:gr}).lineas,tipo:pr.tipo});
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

 /* lo que falta para el aviso (una pieza, un grifo): del catálogo (solo material) o escrito a mano, con cuántos.
    Se quita por lo que es, no por su sitio en la lista: así dos aparatos a la vez no se llevan lo que no era. */
 case 'falta':{
  if(!mio&&!esC)return R('permiso');if(A.e==='hecho'||A.e==='cancelado')return R('estado');
  const L=Array.isArray(A.falta)?A.falta:[];
  if(a.vaciar===true){if(!L.length)return R('estado');delete A.falta;log(A,'Material: ya está todo');return ok()}
  const it=typeof a.k==='string'?cfg.cat[a.k]:null;if(a.k!=null&&(!it||!it.mat))return R('falta');
  const t=it?it.t:txt(a.t).replace(/[\u0000-\u001f]/g,' ').trim().replace(/\s+/g,' ').slice(0,60);if(!t)return R('falta');
  const i=L.findIndex(x=>it?x.k===a.k:!x.k&&x.t.toLowerCase()===t.toLowerCase());
  if(a.quitar===true){if(i<0)return R('estado');L.splice(i,1);if(L.length)A.falta=L;else delete A.falta;log(A,'Material: quitado '+t);return ok()}
  const q=a.q===undefined?1:a.q;if(!Number.isInteger(q)||q<1||q>20)return R('falta');
  if(i>=0)L[i].q=Math.min(20,L[i].q+q);else{if(L.length>=12)return R('falta');L.push(it?{k:a.k,t,q}:{t,q})}
  A.falta=L;log(A,'Material que falta: '+q+' × '+t);return ok()}

 case 'terminar':{
  if(!mio)return R('permiso');if(A.e!=='curso'||!A.tot)return R('estado');
  if(A.tot.total&&!PAGOS.includes(a.modo))return R('modo');
  if(enPausa(A))A.pausas[A.pausas.length-1][1]=t;
  A.e='hecho';A.fin=t;A.min=minutos(A,t);
  A.gar={hasta:masMeses(madrid(t).date,cfg.meses)};
  A.pago=A.tot.total?{modo:a.modo,t,cobrado:a.modo!=='pendiente'}:{modo:'',t,cobrado:true};if(typeof a.firma==='string'&&a.firma.length>=12)A.conf={t,firma:a.firma};
  msg(A,'hecho');msg(A,'resena',t+120*MIN);if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  log(A,'Terminado. '+eur(A.tot.total)+(!A.tot.total?', sin nada que cobrar':A.pago.cobrado?', cobrado ('+a.modo+')':', pendiente de pago'));return ok()}

 case 'cobrar':{
  if(!esC&&!mio)return R('permiso');if(A.e!=='hecho'||!A.pago||A.pago.cobrado)return R('estado');
  if(!PAGOS.includes(a.modo)||a.modo==='pendiente')return R('modo');
  A.pago={modo:a.modo,t,cobrado:true};sinMsg(A,['cobro']);log(A,'Cobrado ('+a.modo+')');return ok()}

 /* La factura la hace el programa del negocio, no esta app. La oficina apunta que ya está hecha, con su número si quiere,
    para que ningún trabajo se quede sin facturar. «quitar» lo deshace si se marcó por error. */
 case 'facturar':{
  if(!esC)return R('permiso');if(A.e!=='hecho'||!A.tot||!A.tot.total)return R('estado');
  if(a.quitar===true){if(!A.fac)return R('estado');delete A.fac;log(A,'Ya no consta como facturado');return ok()}
  if(A.fac)return R('estado');if(a.num!=null&&typeof a.num!=='string'&&typeof a.num!=='number')return R('num');
  const num=txt(a.num).trim().replace(/\s+/g,' ').slice(0,30);A.fac={t,num};log(A,'Facturado'+(num?' con el número '+num:''));return ok()}

 /* ---- los contratos de mantenimiento: la oficina; el alta, también el técnico en casa del cliente ----
    El alta: el plan, los datos del cliente y cómo dijo que sí: firmando en el aparato («firma») o por mensaje («mensaje»).
    «pide»: quiere la revisión antes de que pasen sus 14 días para desistir. «modo»: si ya lo ha pagado.
    El técnico la da desde un aviso suyo («aviso») mientras trabaja o recién acabado, y para el teléfono de ese cliente. */
 case 'contrato':{
  let Av=null;if(!esC){if(!esT)return R('permiso');Av=typeof a.aviso==='string'?S.avisos.find(x=>x.id===a.aviso):null;
   if(!Av||Av.tec!==q.id)return R('permiso');if(Av.e!=='curso'&&Av.e!=='hecho')return R('estado')}
  const P=planDe(cfg,a.plan);if(!P)return R('plan');
  const d=datosCli(a.cli,false);if(d.err)return R(d.err);if(Av&&d.cli.tel!==Av.cli.tel)return R('telAviso');const hoy=madrid(t).date;if(contratoDe(S,d.cli,hoy))return R('ya');
  if(a.acepta!=='firma'&&a.acepta!=='mensaje')return R('acepta');if(a.acepta==='firma'&&(typeof a.firma!=='string'||a.firma.length<12))return R('firma');
  if(a.modo!=null&&!PAGOS.includes(a.modo))return R('modo');
  S.contratos=Array.isArray(S.contratos)?S.contratos:[];const n=(S.nc||0)+1;S.nc=n;const id=cfg.N.serie+'M-'+String(n).padStart(4,'0');
  const X={id,n,v:0,plan:P.id,cli:d.cli,t,acepta:a.acepta,des:{pide:a.pide===true?t:0},e:'activo',per:[{de:hoy,a:masDias(masMeses(hoy,12),-1),precio:P.precio,pago:pagoDe(a.modo,t)}],h:[]};
  if(a.acepta==='firma')X.firma=a.firma;
  S.contratos.push(X);logC(X,'Alta: '+P.n+', '+eur(P.precio)+' al año'+(X.per[0].pago.cobrado?', cobrado ('+a.modo+')':'')+(Av?', en el aviso '+Av.id:''));
  if(Av)log(Av,'Contrato de mantenimiento '+id+' dado de alta'+(X.per[0].pago.cobrado?', cuota cobrada ('+a.modo+')':''));
  /* los avisos abiertos de ese cliente que aún no tienen precio pasan a llevar el contrato */
  S.avisos.forEach(x=>{if(['nuevo','asignado','camino','ausente'].includes(x.e)&&!x.pres&&!x.tot){const c=conDe(S,cfg,x,t);if(c&&(!x.con||x.con.id!==c.id)){x.con=c;log(x,'Ahora con el contrato de mantenimiento '+id)}}});
  return ok({id})}
 case 'cobroContrato':{
  if(!esC)return R('permiso');if(!C)return R('contrato');const p=C.per[C.per.length-1];
  if(p.pago.cobrado)return R('estado');if(!PAGOS.includes(a.modo)||a.modo==='pendiente')return R('modo');
  p.pago={modo:a.modo,t,cobrado:true};logC(C,'Cobrado ('+a.modo+')');return ok()}
 /* renovar: solo si el cliente ha dicho que sí («acepta»), del mes antes de acabar a los dos meses después */
 case 'renovar':{
  if(!esC)return R('permiso');if(!C)return R('contrato');if(C.e!=='activo')return R('estado');if(a.acepta!==true)return R('acepta');
  const P=planDe(cfg,C.plan);if(!P)return R('plan');if(a.modo!=null&&!PAGOS.includes(a.modo))return R('modo');
  const hoy=madrid(t).date,u=C.per[C.per.length-1];if(hoy<masDias(u.a,-30)||hoy>masDias(u.a,60))return R('fecha');
  const de=hoy<=u.a?masDias(u.a,1):hoy;C.per.push({de,a:masDias(masMeses(de,12),-1),precio:P.precio,pago:pagoDe(a.modo,t)});
  logC(C,'Renovado: del '+fechaCorta(de)+' al '+fechaCorta(C.per[C.per.length-1].a)+', '+eur(P.precio));return ok()}
 /* la baja, cuando el cliente quiera y sin penalización. Dentro de los 14 días desde el alta, es que desiste */
 case 'bajaContrato':{
  if(!esC)return R('permiso');if(!C)return R('contrato');if(C.e!=='activo')return R('estado');
  if(a.motivo!=null&&typeof a.motivo!=='string')return R('motivo');
  const hoy=madrid(t).date,des=hoy<=masDias(madrid(C.t).date,14);C.e='baja';C.baja={t,des,motivo:txt(a.motivo).trim().replace(/\s+/g,' ').slice(0,120)};
  logC(C,des?'Desiste del contrato, dentro de sus 14 días':'Baja del contrato');return ok()}

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
/* quién va: el nombre, la inicial del apellido, su color, la furgoneta y la foto, solo si él dio permiso y está en la web del negocio */
const quienDe=x=>x?{n:txt(x.n),ap:txt(x.ap).slice(0,1),tono:Number.isInteger(x.tono)?x.tono:0,coche:txt(x.coche).trim().slice(0,80),
 foto:x.fotoOk===1&&typeof x.foto==='string'&&!x.foto.includes('..')&&/^assets\/[\w.\/-]{1,120}\.(jpe?g|png|webp)$/i.test(x.foto)?x.foto:''}:null;
function vistaCliente(S,cfg,id){const A=S.avisos.find(x=>x.id===id);if(!A)return null;const tec=cfg.tec[A.tec];
 return{id:A.id,av:A.av,e:A.e,urg:A.urg,cita:A.cita?{dia:A.cita.dia,fr:A.cita.fr,ok:A.cita.ok}:null,t:A.t,tec:tec?tec.n:'',eta:A.e==='camino'?A.eta:0,pos:A.e==='camino'&&A.pos?{lat:A.pos.lat,lon:A.pos.lon,t:A.pos.t}:null,sal:A.sal||0,ini:A.ini||0,fin:A.fin||0,
  total:A.tot?A.tot.total:0,tipo:A.tot?A.tot.tipo:0,pago:A.pago?{modo:A.pago.modo,cobrado:A.pago.cobrado}:null,gar:A.gar?A.gar.hasta:'',sinTrabajo:!!A.sinTrabajo,quien:A.e!=='hecho'&&A.e!=='cancelado'?quienDe(tec):null}}

/* ---------- el perfil del cliente: todo lo suyo y nada más ---------- */
/* Lo que es de un cliente lo decide su teléfono. Se le da lo que ya lleva en sus papeles (presupuesto, parte y garantía)
   y la vista de cada aviso. Nunca el diario interno, los mensajes, la nota con la que entró el aviso ni nada de otro cliente.
   Se devuelve una copia: tocarla no cambia los avisos. */
const PERFIL=['id','av','e','urg','t','cita','tec','ini','fin','min','sinTrabajo','pres','amp','tot','pago','gar','obs','conf','fotos','fac','cli','con'];
const CONT=['id','plan','cli','t','acepta','firma','des','e','per','baja'];   /* lo que el cliente ve de su contrato: no el historial */
const CLIENTE_DEMO='2468-1357';   /* en la demo, sin servidor, los clientes de muestra entran con este código */
/* el edificio de una dirección: la calle y su número, sin el piso ni la puerta («C/ Verdi 28, 2.º 1.ª» y «C/ Verdi 28, bajos», la misma finca) */
const fincaDe=d=>{const w=normDir(d).split(' ').filter(Boolean),i=w.findIndex(x=>/^\d/.test(x));return(i>=0?w.slice(0,i+1):w).join(' ')};
const edificio=d=>{const s=txt(d).trim(),m=s.match(/^(.*?\d+[a-zA-Z]?)\s*,/);return m?m[1]:s};
function perfilCliente(S,cfg,tel){const t9=tel9(tel);if(!t9||!S||!Array.isArray(S.avisos))return null;
 const mios=S.avisos.filter(a=>a&&a.cli&&tel9(a.cli.tel)===t9).sort((a,b)=>b.t-a.t);
 const contratos=(S.contratos||[]).filter(C=>C&&C.cli&&tel9(C.cli.tel)===t9).sort((a,b)=>b.t-a.t).map(C=>{const o={};CONT.forEach(k=>{if(C[k]!==undefined)o[k]=JSON.parse(JSON.stringify(C[k]))});return o});
 if(!mios.length&&!contratos.length)return null;
 const avisos=mios.map(A=>{const o={};PERFIL.forEach(k=>{if(A[k]!==undefined)o[k]=JSON.parse(JSON.stringify(A[k]))});o.vista=vistaCliente(S,cfg,A.id);return o});
 /* sus datos, del último aviso que los tenga: uno que entró por WhatsApp puede llevar solo el teléfono */
 const c=(mios.find(a=>txt(a.cli.nombre).trim()&&txt(a.cli.dir).trim())||mios.find(a=>txt(a.cli.nombre).trim())||mios[0]||{cli:contratos[0].cli}).cli;
 /* sus fincas: un administrador lleva varias direcciones con el mismo teléfono. Los pisos de un mismo edificio, juntos */
 const fincas=[];mios.concat(contratos).forEach(a=>{const k=fincaDe(a.cli.dir);if(k.length>4&&!fincas.some(f=>f.k===k))fincas.push({k,dir:edificio(a.cli.dir),cp:txt(a.cli.cp),dis:txt(a.cli.dis)})});
 return{tel:t9,cli:{nombre:txt(c.nombre),apellidos:txt(c.apellidos),dir:txt(c.dir),cp:txt(c.cp),dis:txt(c.dis)},avisos,fincas,contratos}}

/* ---------- las cifras del día para la centralita ---------- */
/* los contratos que piden algo a la oficina: renovar (del mes antes de acabar a dos meses después), dar la cita de la revisión y cobrar */
function pendientesContratos(S,cfg,t){const hoy=madrid(t).date,renovar=[],revision=[],cobrar=[];
 (S.contratos||[]).forEach(C=>{if(C.e!=='activo')return;const u=C.per[C.per.length-1],P=planDe(cfg,C.plan);
  if(hoy>=masDias(u.a,-30)&&hoy<=masDias(u.a,60))renovar.push({id:C.id,a:u.a,vencido:hoy>u.a});
  const i=perDe(C,hoy);if(i>=0&&P){const n=S.avisos.filter(x=>x.e!=='cancelado'&&x.con&&x.con.id===C.id&&x.con.per===i&&x.con.rev).length;if(n<P.revisiones)revision.push({id:C.id,quedan:P.revisiones-n})}
  if(!u.pago.cobrado)cobrar.push({id:C.id,precio:u.precio})});
 return{renovar,revision,cobrar}}
function resumen(S,cfg,t){const hoy=madrid(t).date,caja={efectivo:0,tarjeta:0,bizum:0,transferencia:0,total:0},pend={n:0,total:0},tec={};
 Object.keys(cfg.tec).forEach(id=>{tec[id]={hoy:0,hechos:0,e:'libre',aviso:''}});
 let nuevos=0,urgentes=0,marcha=0,hechos=0,sinDatos=0;const canal={};ORIGEN.forEach(o=>{canal[o]=0});const mes=hoy.slice(0,7);
 S.avisos.forEach(A=>{
  if(A.e!=='cancelado'&&madrid(A.t).date.slice(0,7)===mes&&canal[A.origen]!=null)canal[A.origen]++;
  if(A.e==='nuevo'||A.e==='ausente'){nuevos++;if(A.urg)urgentes++;if(!A.cli.tel)sinDatos++}
  if(EN_MARCHA.includes(A.e)){marcha++;const x=tec[A.tec];if(x){if(!A.cita||A.cita.dia===hoy||A.e!=='asignado')x.hoy++;if(A.e==='camino'||A.e==='curso'){x.e=A.e;x.aviso=A.id}}}
  if(A.e==='hecho'){const esHoy=madrid(A.fin).date===hoy;if(esHoy){hechos++;if(tec[A.tec])tec[A.tec].hechos++}
   if(A.pago&&A.tot){if(!A.pago.cobrado){pend.n++;pend.total+=A.tot.total}else if(madrid(A.pago.t).date===hoy&&caja[A.pago.modo]!=null){caja[A.pago.modo]+=A.tot.total;caja.total+=A.tot.total}}}});
 const pf=porFacturar(S,t);
 return{nuevos,urgentes,sinDatos,marcha,hechos,pend,caja,tec,canal,sobran:sobran(S,cfg,t),reasignar:S.avisos.filter(a=>a.reasignar&&a.e==='nuevo').length,porFac:{n:pf.length,viejos:pf.filter(x=>x.dias>=7).length}}}

/* ---------- las facturas que faltan: lo terminado con algo que cobrar y sin marcar como facturado ---------- */
const porFacturar=(S,t)=>(S.avisos||[]).filter(A=>A.e==='hecho'&&A.tot&&A.tot.total>0&&!A.fac).sort((a,b)=>a.fin-b.fin)
 .map(A=>({id:A.id,dias:Math.max(0,Math.floor(((t||Date.now())-A.fin)/(1440*MIN)))}));
const PAGO_N={efectivo:'Efectivo',tarjeta:'Tarjeta',bizum:'Bizum',transferencia:'Transferencia',pendiente:'Pendiente'};
const qTxt=l=>l.un==='h'?' ('+String(l.q).replace('.',',')+' h)':l.q>1?' ('+l.q+')':'';
/* lo que hace falta para hacer la factura en el programa del negocio, para copiarlo y pegarlo */
function datosFactura(cfg,A){if(!A||!A.tot)return'';const c=A.cli||{},p=A.pago||{},av=cfg.av[A.av];
 return['Cliente: '+nomCli(c),'Dirección: '+txt(c.dir)+(txt(c.cp)?', '+txt(c.cp):'')+' '+txt(cfg.N.ciudad),'Teléfono: '+telBonito(c.tel),
  'Trabajo: '+(av?av.n:'')+(A.sinTrabajo?' (solo el desplazamiento)':'')+' · aviso '+A.id+' · '+fechaCorta(madrid(A.fin||A.t).date)]
  .concat(A.tot.lineas.map(l=>'- '+l.t+qTxt(l)+': '+eur(l.imp)))
  .concat(['Base: '+eur(A.tot.base)+' · IVA del '+A.tot.tipo+' %: '+eur(A.tot.iva)+' · Total: '+eur(A.tot.total)+' (los precios llevan el IVA dentro)',
   'Pago: '+(p.cobrado?(PAGO_N[p.modo]||'')+', cobrado el '+fechaCorta(madrid(p.t).date):'pendiente')]).join('\n')}

/* ---------- el mes para la gestoría: una fila por trabajo terminado, para abrirlo en una hoja de cálculo ---------- */
const CSV_CAB=['Fecha','Aviso','Cliente','Teléfono','Dirección','CP','Trabajo','Base','IVA %','IVA','Total','Forma de pago','Cobrado','Factura'];
const num2=c=>(c/100).toFixed(2).replace('.',',');
/* la cuota de cada contrato, en el mes en que empieza su año. El precio lleva el IVA dentro, como todo */
function cuotasMes(S,cfg,mes){const F=[];(S.contratos||[]).forEach(C=>{const P=planDe(cfg,C.plan);C.per.forEach(p=>{if(p.de.slice(0,7)!==mes)return;const iva=P?P.iva:21,base=red(p.precio/(1+iva/100));
  F.push([p.de,C.id,nomCli(C.cli),telBonito(C.cli.tel),txt(C.cli.dir),txt(C.cli.cp),'Contrato de mantenimiento'+(P?': '+P.n:''),num2(base),String(iva),num2(p.precio-base),num2(p.precio),PAGO_N[p.pago.modo]||'',p.pago.cobrado?'Sí':'No','No'])})});
 return F.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)}
/* los datos para facturar la cuota de un contrato (la del año que va, o la última) */
function datosFacturaContrato(S,cfg,C,t){if(!C)return'';const P=planDe(cfg,C.plan),i=perDe(C,madrid(t).date),p=C.per[i>=0?i:C.per.length-1],iva=P?P.iva:21,base=red(p.precio/(1+iva/100)),c=C.cli;
 return['Cliente: '+nomCli(c),'Dirección: '+txt(c.dir)+(txt(c.cp)?', '+txt(c.cp):'')+' '+txt(cfg.N.ciudad),'Teléfono: '+telBonito(c.tel),
  'Contrato de mantenimiento '+C.id+(P?': '+P.n:'')+', del '+fechaCorta(p.de)+' al '+fechaCorta(p.a),
  'Base: '+eur(base)+' · IVA del '+iva+' %: '+eur(p.precio-base)+' · Total: '+eur(p.precio)+' (el precio lleva el IVA dentro)',
  'Pago: '+(p.pago.cobrado?(PAGO_N[p.pago.modo]||'')+', cobrado el '+fechaCorta(madrid(p.pago.t).date):'pendiente')].join('\n')}
function trabajosMes(S,cfg,mes){return(S.avisos||[]).filter(A=>A.e==='hecho'&&A.tot&&A.fin&&madrid(A.fin).date.slice(0,7)===mes).sort((a,b)=>a.fin-b.fin).map(A=>{const p=A.pago||{},av=cfg.av[A.av];
 return[madrid(A.fin).date,A.id,nomCli(A.cli),telBonito(A.cli.tel),txt(A.cli.dir),txt(A.cli.cp),(av?av.n:'')+(A.sinTrabajo?' (solo desplazamiento)':''),num2(A.tot.base),String(A.tot.tipo),num2(A.tot.iva),num2(A.tot.total),PAGO_N[p.modo]||'',p.cobrado?'Sí':'No',A.fac?(A.fac.num||'Sí'):'No']}).concat(cuotasMes(S,cfg,mes))}
/* punto y coma, como lo abre una hoja de cálculo en español. Lo que empieza por = + - @ va con una comilla delante: así un
   nombre escrito en la web no se convierte en una fórmula al abrir el archivo */
const celda=x=>{let s=String(x==null?'':x);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csv=filas=>'\ufeff'+[CSV_CAB].concat(filas||[]).map(f=>f.map(celda).join(';')).join('\r\n')+'\r\n';

/* ---------- lo que deja cada trabajo: por avería, por técnico y urgencia o cita (solo para la oficina) ----------
   «hora» es lo cobrado sin IVA por cada hora de trabajo, en céntimos. Lo de solo el desplazamiento va aparte. */
function rentabilidad(S,cfg,de,a){const g0=()=>({n:0,base:0,total:0,min:0}),suma=(g,A)=>{g.n++;g.base+=A.tot.base;g.total+=A.tot.total;g.min+=A.min||0};
 const av={},tec={},urg=g0(),cita=g0(),solo={n:0,total:0};
 (S.avisos||[]).forEach(A=>{if(A.e!=='hecho'||!A.tot||!A.fin)return;const d=madrid(A.fin).date;if(d<de||d>a)return;
  if(A.sinTrabajo){solo.n++;solo.total+=A.tot.total;return}
  suma(av[A.av]=av[A.av]||g0(),A);if(cfg.tec[A.tec])suma(tec[A.tec]=tec[A.tec]||g0(),A);suma(A.cita?cita:urg,A)});
 const fin=(k,g)=>({k,n:g.n,base:g.base,total:g.total,min:g.n?Math.round(g.min/g.n):0,media:g.n?Math.round(g.total/g.n):0,hora:g.min?Math.round(g.base*60/g.min):0});
 return{de,a,av:Object.keys(av).map(k=>fin(k,av[k])).sort((x,y)=>x.hora-y.hora||y.n-x.n),tec:Object.keys(tec).map(k=>fin(k,tec[k])).sort((x,y)=>y.base-x.base),urg:fin('urg',urg),cita:fin('cita',cita),solo}}

/* ---------- el material que falta, juntado: los avisos con cita ese día (dia '' = los abiertos sin cita), por técnico ----------
   Lo mismo se suma (del catálogo, por su clave; escrito a mano, por el texto sin mayúsculas) y cada cosa dice de qué avisos es. */
function material(S,cfg,dia){const out=Object.create(null);
 (S.avisos||[]).forEach(A=>{if(!Array.isArray(A.falta)||!A.falta.length||A.e==='hecho'||A.e==='cancelado')return;if((A.cita?A.cita.dia:'')!==dia)return;
  const k=A.tec&&cfg.tec[A.tec]?A.tec:'',g=out[k]=out[k]||{tec:k,n:k?cfg.tec[k].n:'',cosas:[]};
  A.falta.forEach(x=>{const c=g.cosas.find(y=>x.k?y.k===x.k:!y.k&&y.t.toLowerCase()===x.t.toLowerCase());if(c){c.q+=x.q;if(!c.av.includes(A.id))c.av.push(A.id)}else g.cosas.push({k:x.k||'',t:x.t,q:x.q,av:[A.id]})})});
 return Object.keys(out).map(k=>out[k]).sort((a,b)=>(a.tec?0:1)-(b.tec?0:1)||a.n.localeCompare(b.n))}
function textoMaterial(cfg,g,dia){if(!g||!g.cosas||!g.cosas.length)return'';
 return'Material '+(dia?'para el '+fechaLarga(dia):'de los avisos sin día')+(g.n?', '+g.n:', sin técnico')+':\n'+g.cosas.map(c=>'- '+c.q+' × '+c.t+' ('+c.av.join(', ')+')').join('\n')+'\n'+cfg.N.nombre}

g.OficioNucleo={VERSION,ESQ,PAGOS,ORIGEN,MSG,REV,CONT,durDe,durLineas,durEst,ocupacion,proximaCita,llegadas,urgenciaAhora,iniDe,COMISION_URG,urgenciasMes,planDe,perDe,vigente,contratoDe,conDe,gratisDe,pendientesContratos,cuotasMes,datosFacturaContrato,material,textoMaterial,desiste,pideYa,porFacturar,datosFactura,trabajosMes,csv,CSV_CAB,rentabilidad,quienDe,fincaDe,franjaTxt,esFecha,trabaja,ausente,capacidad,capacidadTotal,puedeIr,sobran,nuevo,cfgDe,aplicar,precio,rango,horas,urgente,tarifaDe,madrid,hhmm,hora,masDias,masMeses,fechaLarga,fechaCorta,eur,tel9,telBonito,nomCli,normDir,garantiaDe,franjasDe,diasDe,laborable,etaMin,mensaje,minutos,enPausa,vistaCliente,perfilCliente,CLIENTE_DEMO,resumen};
})(typeof globalThis!=='undefined'?globalThis:this);
