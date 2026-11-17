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
   - La furgoneta: la app dice qué material lleva cada trabajo y qué cargar cada día. Si el técnico quiere, lleva además la
     cuenta de su furgoneta: lo que carga suma y lo que usa se descuenta al terminar el trabajo.
   - Todo lo que llega de fuera se trata como sospechoso: claves que no
     existen, textos que no son texto y cantidades imposibles se rechazan
     sin cambiar nada.
   ============================================================ */
(function(g){
'use strict';
const TZ='Europe/Madrid',ESQ=4,MIN=60000;
/* La versión del código común. Cada copia se la dice a OOOX al abrir «Mejoras»: así se sabe qué copia lleva qué. */
const VERSION='2026.11.17a';   /* la fecha del cambio y, si ese día hay más de uno, una letra */
const PAGOS=['efectivo','tarjeta','bizum','transferencia','pendiente'];
/* el idioma del cliente (17-11-2026): castellano, catalán o inglés. En el aviso solo va si no es el castellano */
const IDIOMAS=['es','ca','en'],NOM_IDIOMA={es:'castellano',ca:'catalán',en:'inglés'};
/* por dónde entra un aviso: reserva en la web, botón de WhatsApp de la web, WhatsApp directo, teléfono, en persona */
const ORIGEN=['cita','web','whatsapp','llamada','persona','otro'];
const EN_MARCHA=['asignado','camino','curso'];
const cts=x=>Math.round(x*100+1e-7);
const red=x=>Math.round(x+1e-7);
const soloNum=s=>typeof s==='string'||typeof s==='number'?String(s).replace(/\D/g,''):'';
/* solo texto y números; lo demás (listas, objetos) se queda en nada */
const txt=x=>typeof x==='string'||typeof x==='number'?String(x):'';
/* una foto solo vale si es una imagen de verdad (la que hace la app al reducirla): así nadie puede colar código por la
   puerta de la web en lo que luego pinta la app de la oficina. Como mucho 140 000 letras */
const esFoto=f=>typeof f==='string'&&f.length>0&&f.length<140000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+\/]+={0,2}$/.test(f);
/* con servidor, la foto se guarda aparte y el aviso lleva su referencia: «f:» y 16 letras (16-11-2026). Valen las dos */
const esRef=f=>typeof f==='string'&&/^f:[0-9a-f]{16}$/.test(f),fotoVale=f=>esFoto(f)||esRef(f);

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
  if(Array.isArray(i.dur)&&i.dur.length===2&&i.dur[0]>0&&i.dur[1]>=i.dur[0])cat[k].dur=[i.dur[0],i.dur[1]];if(typeof i.base==='string')cat[k].base=i.base;
  /* «cada»: cada cuántos meses toca volver a hacerlo (una revisión). Con él, el técnico puede apuntar que el cliente quiere que se le avise */
  if(Number.isInteger(i.cada)&&i.cada>=3&&i.cada<=60)cat[k].cada=i.cada});
 const av=vacio(),tec=vacio(),planes=vacio();N.averias.forEach(a=>{av[a.id]=a});N.tecnicos.forEach(x=>{tec[x.id]=x});
 /* el mantenimiento: sus planes y la revisión, que es un aviso más pero no se pide desde la web */
 const MT=N.mantenimiento;if(MT&&Array.isArray(MT.planes)&&MT.revision){av[REV]=Object.assign({},MT.revision,{id:REV,min:MT.revision.ini,max:null,interna:true});
  MT.planes.forEach(x=>{planes[x.id]={id:x.id,n:x.n,precio:cts(x.precio),iva:x.iva||21,revisiones:x.revisiones||1,desp:typeof x.desp==='string'&&cat[x.desp]?x.desp:'',rev:typeof x.rev==='string'&&cat[x.rev]?x.rev:'',prioridad:!!x.prioridad}})}
 const zonas={banda:limpio(N.zonas.banda),dis:limpio(N.zonas.dis),cp:limpio(N.zonas.cp)};
 /* la furgoneta: lo que lleva siempre, con su mínimo y su máximo. Solo material del catálogo. Un técnico puede tener la suya */
 const kitL=o=>{const x=vacio();if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).forEach(k=>{const v=o[k];
  if(cat[k]&&cat[k].mat&&Array.isArray(v)&&v.length===2&&Number.isInteger(v[0])&&Number.isInteger(v[1])&&v[0]>=0&&v[1]>=1&&v[0]<=v[1]&&v[1]<=999)x[k]=[v[0],v[1]]});return x};
 const kits=vacio();N.tecnicos.forEach(x=>{if(x.furgoneta)kits[x.id]=kitL(x.furgoneta)});
 return{N,cat,av,tec,planes,kit:kitL(N.furgoneta),kits,pack:N.pack||'pro',recargo:N.tarifa.recargo,dia:N.tarifa.dia,festivos:N.festivos||[],franjas:N.franjas,cupo:N.cupo,zonas,
  etaMax:Math.max.apply(null,Object.values(zonas.banda)),horas:Object.keys(cat).find(k=>cat[k].un==='h')||'',meses:N.garantiaMeses||12,
  mapa:N.mapa&&typeof N.mapa==='object'?N.mapa:null,conHorario:!!(N.horario||N.tecnicos.some(x=>x.horario)),porFranja:(N.citas&&N.citas.porFranja)||1,reserva:(N.citas&&N.citas.reserva)||0,reservaSiFalta:!(N.citas&&N.citas.reservaSiFalta===false),porTiempo:!!(N.citas&&N.citas.porTiempo===true&&(N.horario||N.tecnicos.some(x=>x.horario))),hayGuardia:N.tecnicos.some(x=>x.guardia),
  urge:typeof N.tarifa.urgente==='string'&&cat[N.tarifa.urgente]?N.tarifa.urgente:'',
  /* cuánto antes de su franja puede decir «Voy» el técnico; si el negocio no dice otra cosa, media hora */
  voyAntes:N.citas&&Number.isInteger(N.citas.voyAntes)&&N.citas.voyAntes>=0&&N.citas.voyAntes<=240?N.citas.voyAntes:30}}
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
  const gr=Array.isArray(o.gratis)&&o.gratis.includes(it.k),gg=!gr&&Array.isArray(o.garan)&&o.garan.includes(it.k);
  let q=+l.q||it.min;q=Math.max(o.sinMin?it.paso:it.min,Math.round(q/it.paso)*it.paso);q=Math.min(q,it.un==='h'?12:20);
  const f=o.urg&&it.u?1+cfg.recargo:1,b=gr||gg?0:it.p10*q*f;todo+=b;if(it.mat)mat+=b;L.push({it,q,f,p:l.p,gr,gg})});
 const pmat=todo?mat/todo:0,tipo=o.tipo||(o.local||pmat>.4?21:10),motivo=o.local?'local':pmat>.4?'material':'vivienda';
 let total=0;
 const out=L.map(({it,q,f,p,gr,gg})=>{const imp=gr||gg?0:red((tipo===21?it.p21:it.p10)*q*f);total+=imp;const r={k:it.k,t:it.t,q,un:it.un,mat:it.mat,u:it.u&&!!o.urg&&!gr&&!gg,imp};if(it.k==='otro')r.p=+p;if(gr)r.con=true;if(gg)r.gar=true;return r});
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
/* «Nombre y apellidos» en un solo campo (decisión de Oscar, 16-11-2026): la primera palabra es el nombre (el del saludo) y el
   resto, los apellidos. Vale con el nombre y al menos un apellido, como pide la regla de los datos del cliente */
const parteNombre=s=>{const p=txt(s).trim().replace(/\s+/g,' ').split(' '),nombre=p.shift()||'',apellidos=p.join(' ');return{nombre:nombre.slice(0,60),apellidos:apellidos.slice(0,80),bien:nombre.length>=2&&apellidos.length>=2}};
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
/* lo que no se cobra en un trabajo en garantía (16-11-2026): la visita, la mano de obra, el suplemento de urgencia y lo que se
   hizo y se puso en el trabajo que está en garantía. Lo decide la oficina con «Es garantía» y queda en el aviso (enGar) */
const garanDe=A=>A&&A.enGar&&Array.isArray(A.enGar.k)?A.enGar.k:[];

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
function capacidad(S,cfg,dia,f){const n=capacidadTotal(S,cfg,dia,f);return cfg.conHorario?Math.max(0,n-reservaDe(S,cfg,dia)):n}
/* a cuántos técnicos se guarda para urgencias ese día: los de citas.reserva. Si el dueño ha dicho que los días que falta
   alguien no se guarde a nadie (citas.reservaSiFalta: false), esos días, a nadie. «Falta» quien tiene una ausencia un día
   que le tocaba trabajar. */
function reservaDe(S,cfg,dia){if(!cfg.reserva||cfg.reservaSiFalta)return cfg.reserva;
 return Object.keys(cfg.tec).some(x=>ausente(S,x,dia)&&turnosDe(cfg,x,dia).length)?0:cfg.reserva}
/* ¿puede ir este técnico a este aviso? Devuelve '' si puede, o el motivo.
   Quien tiene apuntada una ausencia ese día no puede, tenga o no horarios el negocio. Lo demás sale de los horarios. */
function puedeIr(S,cfg,A,tec,t){if(typeof tec!=='string'||!cfg.tec[tec])return'tec';
 if(A.cita){const f=cfg.franjas.find(x=>x.id===A.cita.fr);if(ausente(S,tec,A.cita.dia))return'ausente_tec';if(!cfg.conHorario)return'';if(!f||!trabaja(cfg,tec,A.cita.dia,f.de,f.a))return'horario';
  return(cfg.porTiempo?!cabeTec(S,cfg,tec,A):citasDe(S,tec,A.cita.dia,A.cita.fr,A.id)>=cfg.porFranja)?'lleno':''}
 const n=madrid(t);if(ausente(S,tec,n.date))return'ausente_tec';if(!cfg.conHorario)return'';
 /* una urgencia fuera de horario va a quien hace guardias, si el negocio ha dicho quién las hace */
 const ahora=laborable(cfg,n.date)&&trabaja(cfg,tec,n.date,n.min,n.min);
 return!ahora&&cfg.hayGuardia&&!cfg.tec[tec].guardia?'horario':''}
/* franjas que vienen con más citas de las que caben contando a todo el que trabaja (pasa cuando alguien se pone enfermo): hay que mover alguna.
   Usar el hueco que se guarda para urgencias no es que sobre nada: eso lo puede decidir la oficina. */
function sobran(S,cfg,t){if(cfg.porTiempo)return sobranTiempo(S,cfg,t);const hoy=madrid(t).date,vistas=new Set(),out=[];
 S.avisos.forEach(a=>{if(!a.cita||a.cita.dia<hoy||!['nuevo','asignado','ausente'].includes(a.e))return;const k=a.cita.dia+' '+a.cita.fr;if(vistas.has(k))return;vistas.add(k);
  const f=cfg.franjas.find(x=>x.id===a.cita.fr);if(!f)return;const n=enFranja(S,a.cita.dia,a.cita.fr)-capacidadTotal(S,cfg,a.cita.dia,f);if(n>0)out.push({dia:a.cita.dia,fr:a.cita.fr,sobran:n})});
 return out.sort((x,y)=>x.dia<y.dia?-1:x.dia>y.dia?1:x.fr<y.fr?-1:1)}
/* Las franjas de un día. «ok» es lo que puede reservar el cliente: día laborable, con hueco y con dos horas de margen.
   «okOf» es lo que puede poner la oficina: además, el hueco que se guarda para urgencias y las franjas de hoy que aún no
   han acabado. Lo que no puede nadie: un día que no se trabaja, una franja que ya acabó o sin nadie que la trabaje con sitio.
   «por» dice por qué una franja solo la puede poner la oficina: 'reserva', 'margen' o las dos. */
function franjasDe(S,cfg,dia,t,menos,X){const n=madrid(t),R=cfg.porTiempo?repartoDia(S,cfg,dia,menos).S:null;
 return cfg.franjas.map(f=>{const usadas=enFranja(S,dia,f.id,menos);let cap,tope;
  /* por tiempo: las que caben aún como la que se pide («X»: su avería y su barrio; sin ella, una cualquiera) */
  if(R){const Y=Object.assign({av:'',cli:{dis:''}},X||{},{id:menos||'_cita',e:'nuevo',tec:'',cita:{dia,fr:f.id}});tope=usadas+cuantasCaben(R,cfg,Y,0);cap=usadas+cuantasCaben(R,cfg,Y,reservaDe(S,cfg,dia))}
  else{cap=capacidad(S,cfg,dia,f);tope=capacidadTotal(S,cfg,dia,f)}
  const libres=Math.max(0,cap-usadas);
  const lab=laborable(cfg,dia),pasada=dia<n.date||(dia===n.date&&f.de<n.min+120),acabada=dia<n.date||(dia===n.date&&f.a<=n.min);
  const ok=lab&&!pasada&&libres>0,okOf=lab&&!acabada&&tope>usadas;
  return{id:f.id,de:f.de,a:f.a,txt:franjaTxt(f),cap,libres,ok,tope,libresOf:Math.max(0,tope-usadas),okOf,por:ok||!okOf?'':[libres>0?'':'reserva',pasada?'margen':''].filter(Boolean).join('+')}})}
/* Los próximos días con cita. Con «of», como los ve la oficina. */
function diasDe(S,cfg,t,cuantos,of,X){const hoy=madrid(t).date,out=[];
 for(let i=0;out.length<(cuantos||6)&&i<28;i++){const f=masDias(hoy,i);if(!laborable(cfg,f))continue;const fr=franjasDe(S,cfg,f,t,null,X);
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
   «choca»: con la urgencia, ya no llegaría a tiempo a alguna de sus citas de hoy (el cliente sabe su franja: llegar
   dentro de ella vale). «fuera»: acabaría después de su hora de salir, o ahora no le toca trabajar y no hace guardias.
   Los que tienen una de las dos van al final. */
function llegadas(S,cfg,dis,t,av){const n=madrid(t),d=durDe(cfg,av),nueva=Math.round((d[0]+d[1])/2),viaje=etaMin(cfg,dis),out=[];
 Object.keys(cfg.tec).forEach(tec=>{if(puedeIr(S,cfg,{urg:true,cli:{dis}},tec,t))return;
  const libre=ocupacion(S,cfg,tec,t),llega=libre+viaje,gu=!!cfg.tec[tec].guardia;
  let fuera=false;if(cfg.conHorario&&horarioDe(cfg,tec)&&!gu){const ft=finTurno(cfg,tec,n);fuera=ft==null||!laborable(cfg,n.date)||n.min+llega+nueva>ft}
  const hoy=S.avisos.filter(A=>A.tec===tec&&A.e!=='cancelado'&&((A.cita&&A.cita.dia===n.date)||madrid(A.fin||A.ini||A.t).date===n.date)).length;
  out.push({tec,libre,viaje,llega,choca:chocaUrg(S,cfg,tec,t,dis,av),fuera,hoy})});
 /* a igual tiempo, el que menos trabajos lleva hoy: así se reparte */
 return out.sort((a,b)=>((a.choca||a.fuera)?1:0)-((b.choca||b.fuera)?1:0)||a.llega-b.llega||a.hoy-b.hoy||(a.tec<b.tec?-1:1))}
/* ¿le haría llegar tarde una urgencia más (la última de su cola) a alguna de sus citas de hoy? La primera a la que
   llegaría tarde, o '' si llega a todas dentro de su franja. Las que ya iban tarde sin la urgencia no cuentan */
function chocaUrg(S,cfg,tec,t,dis,av){const dia=madrid(t).date,antes=new Set(agendaDe(S,cfg,tec,dia,t).filter(x=>x.tarde).map(x=>x.id));
 const U={id:'_urgencia',av,cli:{dis},e:'asignado',tec,t:t+1},x=agendaDe(Object.assign({},S,{avisos:S.avisos.concat([U])}),cfg,tec,dia,t).find(y=>y.tarde&&!antes.has(y.id));
 return x?x.id:''}
/* lo que se le puede decir a quien pide una urgencia: llegamos en unos «de» a «a» minutos (de cinco en cinco), con
   el que antes llega sin dejar tirada una cita ni salirse de su horario; null si ahora no hay nadie así */
function urgenciaAhora(S,cfg,dis,t,av){const L=llegadas(S,cfg,dis,t,av).filter(x=>!x.choca&&!x.fuera);if(!L.length)return null;
 const m=Math.ceil(Math.max(L[0].llega,10)/5)*5;return{tec:L[0].tec,de:m,a:m+15}}

/* ---------- el día de un técnico: a qué hora llega a cada trabajo y a qué hora acaba ----------
   Sus citas del día van en el orden de las franjas y, dentro de una franja, en el orden en que se pidieron. A cada una
   llega cuando acaba la anterior y hace el camino hasta el barrio, pero no antes de que empiece su franja; y tarda lo que
   se espera que dure (durEst). «tarde»: llegaría cuando su franja ya ha acabado.
   Con «t», si el día es hoy, se mira desde ahora: lo ya hecho va a la hora en que pasó; el trabajo de ahora sigue hasta
   que se espera que acabe, y detrás van las urgencias que tiene en cola y las citas que le quedan.
   «extra»: un aviso de más, para saber si cabría: una cita que ya existe (para dársela a alguien o cambiarla de franja)
   va en su sitio, por la hora a la que se pidió; una que se está pidiendo (sin hora), la última de su franja.
   Cada trabajo: {id, av, urg, fr, viaje, llega, acaba, tarde, hecho}, en minutos del día. */
function agendaDe(S,cfg,tec,dia,t,extra){const n=t==null?null:madrid(t),hoy=!!n&&n.date===dia,out=[];let cur=-1440;
 const fi=A=>cfg.franjas.findIndex(x=>x.id===A.cita.fr),mi=x=>{const m=madrid(x);return m.date===dia?m.min:null};
 const pon=(A,l,a,v,o)=>{out.push(Object.assign({id:A.id,av:A.av,urg:!A.cita,fr:A.cita?A.cita.fr:'',viaje:v,llega:Math.round(l),acaba:Math.round(a),tarde:false,hecho:false},o||{}))};
 const mio=S.avisos.filter(A=>A.tec===tec&&A.e!=='cancelado'&&(!extra||A.id!==extra.id));
 if(hoy){cur=n.min;
  mio.forEach(A=>{if((A.e!=='hecho'&&A.e!=='ausente')||!A.fin)return;const a=mi(A.fin);if(a==null)return;const d=A.ini?mi(A.ini):null;pon(A,d==null?a:d,a,0,{hecho:true})});
  /* las visitas en las que no había nadie: ese rato también lo pasó allí (aunque el aviso haya cambiado de técnico) */
  S.avisos.forEach(A=>{if(A.e==='cancelado'||!Array.isArray(A.vis)||(extra&&A.id===extra.id))return;A.vis.forEach(v=>{if(!v||v.tec!==tec)return;const a=mi(v.a);if(a==null)return;const d=mi(v.de);pon(A,d==null||d>a?a:d,a,0,{hecho:true,nadie:true})})});
  mio.filter(A=>A.e==='curso').forEach(A=>{const a=n.min+Math.max(5,durEst(cfg,A)-minutos(A,t)),d=A.ini?mi(A.ini):null;pon(A,d==null?n.min:d,a,0);cur=Math.max(cur,a)});
  mio.filter(A=>A.e==='camino').forEach(A=>{const v=Math.max(0,Math.round(((A.eta||t)-t)/MIN)),l=Math.max(cur,n.min+v),d=durEst(cfg,A);pon(A,l,l+d,v);cur=l+d});
  mio.filter(A=>A.e==='asignado'&&!A.cita).sort((a,b)=>a.t-b.t).forEach(A=>{const v=etaMin(cfg,A.cli&&A.cli.dis),l=cur+v,d=durEst(cfg,A);pon(A,l,l+d,v);cur=l+d})}
 const C=mio.filter(A=>A.cita&&A.cita.dia===dia&&fi(A)>=0&&(!hoy||A.e==='nuevo'||A.e==='asignado'));
 if(extra&&extra.cita&&extra.cita.dia===dia&&fi(extra)>=0)C.push(extra);
 const tt=A=>A===extra&&typeof A.t!=='number'?9e15:A.t;C.sort((a,b)=>fi(a)-fi(b)||tt(a)-tt(b)||(a.id<b.id?-1:1));
 C.forEach(A=>{const f=cfg.franjas[fi(A)],v=etaMin(cfg,A.cli&&A.cli.dis),l=Math.max(f.de,cur+v),d=durEst(cfg,A);pon(A,l,l+d,v,{tarde:l>f.a});cur=l+d});
 return out.sort((a,b)=>a.llega-b.llega||a.acaba-b.acaba)}
/* las horas en que trabaja ese día, en tramos [de, a]: las de su horario; sin horarios, de la primera franja a la última */
function turnosDe(cfg,tec,dia){const h=horarioDe(cfg,tec);if(h)return(h[diaSem(dia)]||[]).map(x=>[x[0],x[1]]);
 if(cfg.conHorario||!cfg.franjas.length)return[];return[[Math.min.apply(null,cfg.franjas.map(f=>f.de)),Math.max.apply(null,cfg.franjas.map(f=>f.a))]]}
/* los ratos libres de su día, desde «desde» (minutos del día): sus horas de trabajo menos lo que ocupan sus trabajos,
   camino incluido. Solo los de 15 minutos o más. «sale»: si algún trabajo acabaría después de que termine su tramo de
   trabajo (a la hora de comer o al final del día), la hora más tardía a la que acabaría; 0 si no */
function libresDe(cfg,tec,dia,L,desde){const T=turnosDe(cfg,tec,dia),occ=(L||[]).map(x=>[x.llega-(x.viaje||0),x.acaba]).sort((a,b)=>a[0]-b[0]),out=[];
 T.forEach(([de,a])=>{let c=Math.max(de,desde||0);occ.forEach(([x,y])=>{if(y<=c||x>=a)return;if(x-c>=15)out.push({de:c,a:x});c=Math.max(c,y)});if(a-c>=15)out.push({de:c,a})});
 const tope=m=>{const b=T.find(x=>x[0]<=m&&m<x[1])||T.filter(x=>x[1]<=m).pop()||T[0];return b[1]};
 const sale=T.length?(L||[]).reduce((s,x)=>!x.hecho&&x.acaba>tope(x.llega)?Math.max(s,x.acaba):s,0):0;
 return{libres:out,sale}}
/* ---------- las citas por lo que tarda cada trabajo (citas.porTiempo; solo con horarios) ----------
   Sin esto, en cada franja caben las citas que dice citas.porFranja por técnico. Con esto, cabe una cita más si alguien
   que trabaja esa franja entera puede llegar a ella dentro de la franja sin llegar tarde a ninguna otra cita suya
   (agendaDe); citas.porFranja queda como el máximo de citas de un técnico en una franja. Las citas que aún no tienen
   técnico se reparten antes, cada una a quien le iría. Al cliente se le guardan técnicos para urgencias como siempre
   (citas.reserva): solo ve una franja si, con su cita, siguen quedando tantos técnicos sin ninguna cita en ella. La
   oficina puede usar también a esos. */
/* ¿cabe la cita «X» en el día de este técnico? */
function cabeTec(S,cfg,tec,X){const dia=X.cita.dia,f=cfg.franjas.find(x=>x.id===X.cita.fr);
 if(!f||!trabaja(cfg,tec,dia,f.de,f.a)||ausente(S,tec,dia)||citasDe(S,tec,dia,f.id,X.id)>=cfg.porFranja)return false;
 /* no cabe si por ella llegaría tarde a alguna cita (la suya incluida) o acabaría alguna más de un cuarto de hora
    después de su tramo de trabajo; lo que ya pasaba sin ella no cuenta (sin ella de verdad: si ya está en su día, por
    ejemplo al cambiarla de franja, se mira cómo estaba ese día sin ella) */
 const T=turnosDe(cfg,tec,dia),fin=m=>{const b=T.find(x=>x[0]<=m&&m<x[1])||T.filter(x=>x[1]<=m).pop()||T[0];return b?b[1]:1440};
 const sin=Object.assign({},S,{avisos:S.avisos.filter(a=>a.id!==X.id)});
 const mal=L=>new Set(L.filter(x=>x.tarde||x.acaba>fin(x.llega)+15).map(x=>x.id)),antes=mal(agendaDe(sin,cfg,tec,dia));
 return![...mal(agendaDe(S,cfg,tec,dia,null,Object.assign({},X,{tec})))].some(id=>!antes.has(id))}
/* a quién le iría la cita «X»: antes a quien ya tiene citas en esa franja (así quedan libres los demás) y después a quien
   antes llegaría. Con «guarda», solo si siguen quedando tantos técnicos sin ninguna cita en la franja. '' si a nadie */
function eligeTec(S,cfg,X,guarda){const dia=X.cita.dia,fr=X.cita.fr,f=cfg.franjas.find(x=>x.id===fr);if(!f)return'';
 const T=Object.keys(cfg.tec).filter(tec=>trabaja(cfg,tec,dia,f.de,f.a)&&!ausente(S,tec,dia)),vacio=tec=>!citasDe(S,tec,dia,fr,X.id),nv=T.filter(vacio).length;
 const P=T.filter(tec=>(!guarda||nv-(vacio(tec)?1:0)>=guarda)&&cabeTec(S,cfg,tec,X)).map(tec=>{const y=agendaDe(S,cfg,tec,dia,null,Object.assign({},X,{tec})).find(z=>z.id===X.id);return{tec,v:vacio(tec)?1:0,l:y?y.llega:1e9}});
 P.sort((a,b)=>a.v-b.v||a.l-b.l||(a.tec<b.tec?-1:1));return P.length?P[0].tec:''}
/* las citas de un día, repartidas: las que no tienen técnico, cada una a quien le iría, en el orden de sus franjas y de
   lo que se pidió antes. «fuera»: las que no le caben a nadie. «menos»: una cita que no cuenta */
function repartoDia(S,cfg,dia,menos){let V=S.avisos.filter(a=>a.id!==menos&&a.cita&&a.cita.dia===dia&&a.e!=='cancelado');const fuera=[],fi=A=>cfg.franjas.findIndex(x=>x.id===A.cita.fr);
 V.filter(a=>!a.tec).sort((a,b)=>fi(a)-fi(b)||a.t-b.t||(a.id<b.id?-1:1)).forEach(A=>{const tec=eligeTec(Object.assign({},S,{avisos:V}),cfg,A,0);
  if(tec)V=V.map(a=>a.id===A.id?Object.assign({},a,{tec}):a);else fuera.push(A.id)});
 return{S:Object.assign({},S,{avisos:V}),fuera}}
/* cuántas citas como «Y» caben aún en su franja (hasta nueve) */
function cuantasCaben(S,cfg,Y,guarda){let V=S.avisos,k=0;
 for(;k<9;k++){const Z=Object.assign({},Y,{id:k?Y.id+'~'+k:Y.id,t:k||typeof Y.t!=='number'?9e15+k:Y.t}),tec=eligeTec(Object.assign({},S,{avisos:V}),cfg,Z,guarda);if(!tec)break;V=V.concat([Object.assign({},Z,{tec})])}
 return k}
/* lo que sobra con citas por tiempo: las citas que no le caben a nadie y las que su técnico ya no llega a tiempo */
function sobranTiempo(S,cfg,t){const hoy=madrid(t).date,P=['nuevo','asignado','ausente'],out=[];
 [...new Set(S.avisos.filter(a=>a.cita&&a.cita.dia>=hoy&&P.includes(a.e)).map(a=>a.cita.dia))].sort().forEach(dia=>{
  /* una cita en «no había nadie» de un técnico que ese día falta ya no es suya: se mira como si no tuviera técnico */
  const S1=Object.assign({},S,{avisos:S.avisos.map(a=>a.e==='ausente'&&a.tec&&a.cita&&a.cita.dia===dia&&ausente(S,a.tec,dia)?Object.assign({},a,{tec:''}):a)});
  const R=repartoDia(S1,cfg,dia),c={};
  const cuenta=id=>{const A=R.S.avisos.find(a=>a.id===id);if(A&&P.includes(A.e))c[A.cita.fr]=(c[A.cita.fr]||0)+1};
  R.fuera.forEach(cuenta);Object.keys(cfg.tec).forEach(tec=>agendaDe(R.S,cfg,tec,dia).forEach(x=>{if(x.tarde)cuenta(x.id)}));
  cfg.franjas.forEach(f=>{if(c[f.id])out.push({dia,fr:f.id,sobran:c[f.id]})})});
 return out}

/* ---------- «Voy», solo cuando toca (16-11) ----------
   Con cita, el técnico puede decir «Voy» desde media hora antes de que empiece su franja; antes, no: el cliente recibiría
   «va de camino» horas antes y la llegada que le damos no valdría. Se cuenta en hora de Madrid y con el reloj de quien
   decide: con servidor, el del servidor (cambiar la hora del móvil no sirve). Sin cita (una urgencia), en cuanto se le
   asigna. Si la franja ya ha empezado, puede ir igual: va tarde, y eso se avisa, no se bloquea. Si un negocio quiere
   otra cosa, lo dice en sus datos: citas.voyAntes (minutos, de 0 a 240). */
const VOY_ANTES=30;
function voyDesde(cfg,A){if(!A||!A.cita)return null;const f=cfg.franjas.find(x=>x.id===A.cita.fr);if(!f)return null;
 let dia=A.cita.dia,min=f.de-(Number.isInteger(cfg.voyAntes)?cfg.voyAntes:VOY_ANTES);while(min<0){dia=masDias(dia,-1);min+=1440}return{dia,min}}
function voyYa(cfg,A,t){const d=voyDesde(cfg,A);if(!d)return true;const n=madrid(t);return n.date>d.dia||(n.date===d.dia&&n.min>=d.min)}
function voyTarde(cfg,A,t){if(!A||!A.cita||A.e!=='asignado')return false;const f=cfg.franjas.find(x=>x.id===A.cita.fr);if(!f)return false;const n=madrid(t);return n.date>A.cita.dia||(n.date===A.cita.dia&&n.min>=f.de)}

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
/* «L» (17-11-2026): el idioma del mensaje, el del cliente (su aviso lo dice). Lo pone la app con js/oficio-idioma.js:
   T traduce cada frase y lo de cada negocio (sus averías, su catálogo), y fechaLarga y franja dicen la fecha y la franja en
   ese idioma. Sin L, en castellano. Las frases van enteras, con sus datos entre llaves, para poder traducirlas */
const CAST={T:(s,v)=>{if(v)for(const k in v)s=s.split('{'+k+'}').join(v[k]);return s},fechaLarga:f=>fechaLarga(f),franja:f=>franjaTxt(f)};
function mensaje(cfg,A,k,L){L=L&&typeof L.T==='function'?L:CAST;const _=L.T,N=cfg.N,n=(A.cli.nombre||'').split(' ')[0],hola=(n?_('Hola, {nombre}.',{nombre:n}):_('Hola.'))+' ',tec=cfg.tec[A.tec],T=tec?tec.n:_('El técnico'),av=cfg.av[A.av],avn=av?_(av.n).toLowerCase():'',fr=A.cita&&cfg.franjas.find(f=>f.id===A.cita.fr),frt=fr?(L.franja||franjaTxt)(fr):'',fl=L.fechaLarga||fechaLarga;
 const tot=A.tot?eur(A.tot.total):'',pg=N.pago&&typeof N.pago==='object'?N.pago:{},via=[tel9(pg.bizum)?_('por Bizum al {tel}',{tel:telBonito(pg.bizum)}):'',typeof pg.iban==='string'&&pg.iban?_('por transferencia a la cuenta {iban}',{iban:pg.iban}):''].filter(Boolean);
 const fin=' '+N.nombre+'.',noMas=_('Si prefieres que no te escribamos para esto, dínoslo.');
 switch(k){
  case 'recibido':return hola+_('Hemos recibido tu aviso {id}{averia}.',{id:A.id,averia:av?' ('+avn+')':''})+' '+(A.cita?_('Te confirmamos enseguida quién irá.'):_('Te decimos enseguida quién va y a qué hora llega.'))+fin;
  case 'cita':if(!A.cita)return'';return hola+_('Tu cita queda para el {fecha}, {franja}.',{fecha:fl(A.cita.dia),franja:frt})+' '+_('Irá {tecnico}.',{tecnico:T})+' '+_('Con cita, la tarifa es la normal.')+' '+_('Si necesitas cambiarla, contesta a este mensaje.')+fin;
  case 'vispera':if(!A.cita)return'';return hola+_('Te recordamos la cita de mañana, {franja}, en {dir}.',{franja:frt,dir:A.cli.dir})+' '+_('Irá {tecnico}.',{tecnico:T})+fin;
  case 'camino':return hola+(A.eta?_('{tecnico} va de camino y llega sobre las {hora}.',{tecnico:T,hora:hora(A.eta)}):_('{tecnico} va de camino.',{tecnico:T}))+fin;
  case 'ausente':return hola+_('{tecnico} ha estado en {dir} a las {hora} y no ha encontrado a nadie.',{tecnico:T,dir:A.cli.dir,hora:hora(A.aus||A.t)})+' '+_('¿Cuándo te va bien que volvamos?');
  case 'hecho':{if(!A.tot)return hola+_('Trabajo terminado.')+' '+_('Gracias por confiar en {negocio}.',{negocio:N.nombre});
   /* a cero (va en el contrato o en la garantía) no hay total ni forma de pago que decir (16-11-2026: decía «Total: 0,00 €. Pagado ().») */
   const cero=!A.tot.total;
   return hola+(A.sinTrabajo?(cero?(A.enGar?_('Al final no se ha hecho el trabajo y la visita va en la garantía: no hay nada que pagar.'):_('Al final no se ha hecho el trabajo y la visita va en tu contrato de mantenimiento: no hay nada que pagar.')):_('Hoy solo hemos cobrado el desplazamiento: {total}.',{total:tot}))
    :_('Trabajo terminado.')+' '+(cero?(A.enGar?_('No hay nada que pagar: va en la garantía.'):_('No hay nada que pagar: va en tu contrato de mantenimiento.')):_('Total: {total}, IVA incluido.',{total:tot})))+' '
    +(cero?'':(A.pago&&A.pago.cobrado?_('Pagado ({modo}).',{modo:_(A.pago.modo)}):_('Queda pendiente de pago.'))+' ')+(A.gar?_('Tienes garantía hasta el {fecha}.',{fecha:fechaCorta(A.gar.hasta)})+' ':'')+N.nombre+'.'}
  case 'resena':return hola+_('¿Todo bien con la reparación? Si tienes un minuto, tu opinión en Google nos ayuda mucho: {enlace} Gracias.',{enlace:N.resenas});
  case 'seguimiento':return hola+(av?_('Hace una semana del arreglo ({averia}).',{averia:avn}):_('Hace una semana del trabajo.'))+' '
   +(A.gar?_('¿Sigue todo bien? Si algo falla, contesta a este mensaje y volvemos: tienes garantía hasta el {fecha}.',{fecha:fechaCorta(A.gar.hasta)}):_('¿Sigue todo bien? Si algo falla, contesta a este mensaje y volvemos.'))+'\n\n'
   +_('Si aún no has podido, tu opinión en Google nos ayuda mucho:')+'\n'+N.resenas+'\n\n'+_('Y si conoces a alguien que nos necesite, puedes pasarle este número.')+'\n\n'+noMas+fin;
  case 'presupuesto':if(!A.noPres)return'';return hola+(av?_('¿Has podido pensar lo del presupuesto ({averia})?',{averia:avn}):_('¿Has podido pensar lo del presupuesto?'))+' '+_('Eran {total}, IVA incluido.',{total:eur(A.noPres.total)})+' '
   +_('Si quieres hacerlo, contesta a este mensaje y te damos cita.')+'\n\n'+noMas+fin;
  case 'proxima':{const P=A.prox,it=P&&cfg.cat[P.k];if(!P)return'';const ult=fechaCorta(madrid(A.fin).date);
   return hola+(it?_('El {fecha} toca la próxima {servicio}: la última fue el {ultima}.',{fecha:fechaCorta(P.dia),servicio:_(it.t).toLowerCase(),ultima:ult}):_('El {fecha} toca volver a pasar: la última fue el {ultima}.',{fecha:fechaCorta(P.dia),ultima:ult}))+' '
    +_('¿Quieres que vayamos? Contesta con el día que te va bien.')+'\n\n'+_('Si prefieres que no te avisemos más, dínoslo.')+fin}
  case 'cobro':if(!A.tot)return'';return hola+_('Te recordamos que queda pendiente el pago del trabajo {id}: {total}.',{id:A.id,total:tot})+' '
   +(via.length===2?_('Puedes pagarlo {uno} o {otro}.',{uno:via[0],otro:via[1]}):via.length?_('Puedes pagarlo {uno}.',{uno:via[0]}):_('Contesta a este mensaje y te decimos cómo pagarlo.'))+' '+_('Gracias.')+fin;
 }return''}
const MSG={recibido:'Aviso recibido',cita:'Cita confirmada',vispera:'Recordatorio de la víspera',camino:'Va de camino',ausente:'No había nadie',hecho:'Trabajo terminado',resena:'Pedir reseña',cobro:'Recordar el pago',
 seguimiento:'Seguimiento a la semana',presupuesto:'Presupuesto sin respuesta',proxima:'Toca volver'};
/* los mensajes de después del trabajo (el seguimiento): la oficina puede dejarlos sin mandar, caducan («hasta») y no van a quien dijo que no.
   Con «resena» y «seguimiento» son dos como mucho, dentro de los 30 días en que la reseña aún vale */
const SEGUIR=['resena','seguimiento','presupuesto','proxima'],DIA=1440*MIN;
/* quien dijo que no quiere estos mensajes: se apunta en todos sus avisos (por el teléfono) */
const noEscribe=(S,tel)=>{const t9=tel9(tel);return!!t9&&S.avisos.some(x=>x.noMsg&&x.cli&&x.cli.tel===t9)};
/* el idioma de un cliente: el de su último aviso (17-11-2026). Así, el que pidió cita en catalán sigue en catalán cuando llama */
const idiomaDe=(S,tel)=>{const t9=tel9(tel);let u=null;if(t9)S.avisos.forEach(x=>{if(x.cli&&x.cli.tel===t9&&(!u||x.t>u.t))u=x});return u&&IDIOMAS.includes(u.idioma)?u.idioma:'es'};
/* los mensajes que ya toca mandar: ni los mandados, ni los dejados, ni los caducados, ni los de seguimiento a quien dijo que no */
function porMandar(S,ahora){const no=new Set(S.avisos.filter(x=>x.noMsg&&x.cli&&x.cli.tel).map(x=>x.cli.tel));
 return[].concat(...S.avisos.filter(a=>a.e!=='cancelado'&&Array.isArray(a.msgs)).map(a=>a.msgs.filter(m=>!m.env&&m.t<=ahora&&!(m.hasta&&m.hasta<ahora)&&!(SEGUIR.includes(m.k)&&(a.noMsg||no.has(a.cli&&a.cli.tel)))).map(m=>({a,m})))).sort((x,y)=>x.m.t-y.m.t)}

/* ---------- el tiempo de trabajo, sin las pausas ---------- */
function minutos(A,t){if(!A.ini)return 0;const fin=A.fin||t||Date.now();let ms=fin-A.ini;(A.pausas||[]).forEach(p=>{ms-=(p[1]||fin)-p[0]});return Math.max(0,Math.round(ms/MIN))}
const enPausa=A=>!!(A.pausas&&A.pausas.length&&!A.pausas[A.pausas.length-1][1]);

/* ---------- la huella de los datos del negocio (16-11-2026) ----------
   La misma en la app y en el servidor si los dos tienen los mismos datos. Sin «servidor» ni «textos», que solo usa la app,
   y con las claves en orden, así no importa cómo se guardaron. La app avisa si no coincide (oficio-estado.js). */
function canon(x){if(Array.isArray(x))return'['+x.map(y=>y===undefined||typeof y==='function'?'null':canon(y)).join(',')+']';
 if(x&&typeof x==='object')return'{'+Object.keys(x).filter(k=>x[k]!==undefined&&typeof x[k]!=='function').sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}';
 return JSON.stringify(x)}
async function huellaDatos(N){const c=Object.assign({},N);delete c.servidor;delete c.textos;const s=g.crypto&&g.crypto.subtle;if(!s||typeof TextEncoder!=='function')return'';
 const d=await s.digest('SHA-256',new TextEncoder().encode(canon(c)));return[...new Uint8Array(d)].slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('')}

/* ---------- la parte pública de los datos del negocio (17-11-2026) ----------
   Una copia con servidor lleva en su archivo de datos solo esto, porque ese archivo lo puede bajar cualquiera que abra la
   cita. Del equipo, el nombre, la inicial del apellido y su color: con eso se elige quién entra y se pide cita. Los
   apellidos, los horarios, quién es el jefe o hace guardias y su furgoneta están solo en el servidor, que se los da a la
   app al entrar. Lo demás (precios, servicios, zonas, franjas) es lo que ve el cliente y va igual. Lleva «publico: true».
   publico(publico(N)) es lo mismo que publico(N). No copia lo de dentro: no hay que cambiar lo que devuelve. */
const inicialDe=s=>{const c=[...String(s==null?'':s).trim()][0];return c?c.toUpperCase()+'.':''};
function publico(N){const x={id:N.id,publico:true};
 for(const k of Object.keys(N))if(k!=='id'&&k!=='publico')x[k]=k==='tecnicos'&&Array.isArray(N.tecnicos)?N.tecnicos.map(t=>{const y={id:t.id,n:t.n},a=inicialDe(t.ap);if(a)y.ap=a;y.tono=t.tono;return y}):N[k];
 return x}

/* ---------- las acciones ---------- */
const CON_ACC=['cobroContrato','renovar','bajaContrato'],SIN_AVISO=['pedir','ausencia','quitarAusencia','contrato','escribir','furgo'].concat(CON_ACC);
function aplicar(S,cfg,a,q,t){t=t||Date.now();q=q||{};a=a||{};
 const R=err=>({ok:false,err});
 const A=typeof a.id==='string'?S.avisos.find(x=>x.id===a.id):null;
 const esC=q.rol==='centralita',esT=q.rol==='tecnico'&&typeof q.id==='string'&&!!cfg.tec[q.id],mio=!!A&&esT&&A.tec===q.id;
 const nom=q.rol==='cliente'?'Cliente':esT?cfg.tec[q.id].n:esC?'Centralita':'Web';
 const log=(X,txt)=>{X.h.push({t,q:nom,txt});X.v=(X.v||0)+1};
 const msg=(X,k,cuando,hasta)=>{if(SEGUIR.includes(k)&&(X.noMsg||noEscribe(S,X.cli.tel)))return;X.msgs=X.msgs.filter(m=>m.k!==k||m.env);const m={k,t:cuando||t,env:0};if(hasta)m.hasta=hasta;X.msgs.push(m)};
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
  if(a.cita){if(!unaCita(a.cita))return R('franja');const fr=franjasDe(S,cfg,a.cita.dia,t,null,{av:a.av,cli:{dis:d.cli.dis}}).find(f=>f.id===a.cita.fr);if(!fr||!(esC?fr.okOf:fr.ok))return R('franja');cita={dia:a.cita.dia,fr:fr.id,ok:true};if(fr.por)cita.of=fr.por;
   /* «vale»: la franja reservada y, si el cliente las dio, otras que también le van bien (hasta cuatro) */
   const hoy=madrid(t).date;vale=[{dia:cita.dia,fr:cita.fr}];
   (Array.isArray(a.alt)?a.alt:[]).slice(0,8).forEach(x=>{if(vale.length<5&&unaCita(x)&&esFecha(x.dia)&&x.dia>=hoy&&laborable(cfg,x.dia)&&cfg.franjas.some(f=>f.id===x.fr)&&!vale.some(v=>v.dia===x.dia&&v.fr===x.fr))vale.push({dia:x.dia,fr:x.fr})})}
  const n=++S.n,id=cfg.N.serie+'-'+String(n).padStart(4,'0');
  const X={id,n,v:0,t,origen:a.origen==null?'cita':ORIGEN.includes(a.origen)?a.origen:'otro',av:a.av,nota:txt(a.nota).trim().slice(0,400),foto:fotoVale(a.foto)?a.foto:'',cli:d.cli,cita,urg:!cita,e:'nuevo',tec:'',msgs:[],h:[]};if(vale)X.vale=vale;
  /* su idioma: el de la página donde pide la cita; si no lo dice (la oficina, por teléfono), el de su último aviso */
  const idi=IDIOMAS.includes(a.idioma)?a.idioma:idiomaDe(S,X.cli.tel);if(idi!=='es')X.idioma=idi;
  const g0=garantiaDe(S,cfg,X.cli,t);if(g0.length)X.gar0=g0[g0.length-1];
  const c0=conDe(S,cfg,X,t);if(c0)X.con=c0;
  if(noEscribe(S,X.cli.tel))X.noMsg=t;   // quien dijo que no quiere mensajes de seguimiento, lo sigue diciendo en su aviso nuevo
  S.avisos.push(X);log(X,(cita?'Cita pedida'+porOf(cita):'Aviso recibido')+(c0?'. Cliente con contrato de mantenimiento ('+c0.id+')':''));
  if(X.cli.tel)msg(X,'recibido');
  return ok({id})}

 case 'completar':{
  if(!esC&&!mio)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  const d=datosCli(Object.assign({},A.cli,a.cli),false);if(d.err)return R(d.err);
  const antes=A.cli.tel;A.cli=d.cli;const g0=garantiaDe(S,cfg,A.cli,t,A.id);if(g0.length)A.gar0=g0[g0.length-1];else delete A.gar0;
  /* el contrato lo vuelve a mirar la oficina, que es quien tiene la lista: el técnico no la tiene y lo quitaría sin querer */
  if(esC&&!A.pres&&!A.tot){const c1=conDe(S,cfg,A,t);if(c1)A.con=c1;else delete A.con}
  /* si el teléfono nuevo es de alguien que no quiere mensajes de seguimiento, este aviso tampoco los lleva */
  if(A.cli.tel!==antes&&noEscribe(S,A.cli.tel)){A.noMsg=A.noMsg||t;A.msgs=A.msgs.filter(m=>m.env||!SEGUIR.includes(m.k))}
  /* lo que va en garantía tiene que ser un trabajo suyo (17-11-2026; lo encontraron los recorridos al azar): con otros datos,
     si el trabajo ya no es de este cliente, deja de ir en garantía y se cobra como cualquier otro */
  if(A.enGar&&!garantiaDe(S,cfg,A.cli,t,A.id).includes(A.enGar.de)){const de=A.enGar.de;delete A.enGar;log(A,'Ya no va en la garantía de '+de+': con estos datos no es un trabajo suyo')}
  if(!antes)msg(A,'recibido');log(A,'Datos del cliente completados');return ok()}

 /* el idioma del cliente en este aviso (17-11-2026): sus mensajes, sus papeles y lo que firma salen en él. La oficina, o el técnico en el suyo */
 case 'idioma':{
  if(!esC&&!mio)return R('permiso');if(!IDIOMAS.includes(a.idioma))return R('idioma');if((A.idioma||'es')===a.idioma)return R('estado');
  if(a.idioma==='es')delete A.idioma;else A.idioma=a.idioma;log(A,'Idioma del cliente: '+NOM_IDIOMA[a.idioma]);return ok()}

 case 'asignar':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  if(typeof a.tec!=='string'||!cfg.tec[a.tec])return R('tec');if(!A.cli.tel||!A.cli.dir||!A.cli.dis)return R('datos');
  {const no=puedeIr(S,cfg,A,a.tec,t);if(no)return R(no)}
  A.tec=a.tec;A.e='asignado';delete A.aus;delete A.reasignar;sinMsg(A,['ausente']);
  if(A.cita){msg(A,'cita');const v=masDias(A.cita.dia,-1);if(v>madrid(t).date)msg(A,'vispera',Date.parse(v+'T17:00:00Z'))}
  log(A,'Asignado a '+cfg.tec[a.tec].n);return ok()}

 /* la oficina quita el técnico (también para deshacer un «Asignar a» recién hecho, 16-11-2026): el aviso vuelve a la bandeja
    sin técnico y los mensajes de la cita que aún no han salido se quitan. Solo antes de que salga («Voy») */
 case 'soltar':{
  if(!esC)return R('permiso');if(A.e!=='asignado')return R('estado');
  log(A,'Sin técnico: '+((cfg.tec[A.tec]||{}).n||'el técnico')+' ya no lo lleva');A.tec='';A.e='nuevo';delete A.reasignar;sinMsg(A,['cita','vispera']);return ok()}

 case 'mover':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','ausente'].includes(A.e))return R('estado');
  if(a.cita){if(!unaCita(a.cita))return R('franja');const fr=franjasDe(S,cfg,a.cita.dia,t,A.id,A).find(f=>f.id===a.cita.fr);if(!fr||!fr.okOf)return R('franja');const yaVale=(A.vale||[]).some(v=>v.dia===a.cita.dia&&v.fr===fr.id);if(a.confirmado&&!yaVale)A.vale=(A.vale||[]).concat([{dia:a.cita.dia,fr:fr.id}]);
   A.cita={dia:a.cita.dia,fr:fr.id,ok:yaVale||!!a.confirmado};if(fr.por)A.cita.of=fr.por;A.urg=false}
  else{A.cita=null;A.urg=true}
  if(A.tec&&puedeIr(S,cfg,A,A.tec,t))suelta(A,'no puede en ese horario');
  if(A.e==='ausente'){A.e=A.tec?'asignado':'nuevo';delete A.aus;sinMsg(A,['ausente'])}
  sinMsg(A,['cita','vispera']);
  if(A.cita&&A.e==='asignado'){msg(A,'cita');const v=masDias(A.cita.dia,-1);if(v>madrid(t).date)msg(A,'vispera',Date.parse(v+'T17:00:00Z'))}
  log(A,A.cita?'Cita cambiada al '+fechaLarga(A.cita.dia)+porOf(A.cita):'Pasa a urgente');return ok()}

 case 'voy':{
  if(!mio)return R('permiso');if(A.e!=='asignado')return R('estado');
  if(!voyYa(cfg,A,t))return R('pronto');
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
  A.e='ausente';A.aus=t;A.vis=(Array.isArray(A.vis)?A.vis:[]).concat([{tec:A.tec,de:typeof A.sal==='number'&&A.sal<=t?A.sal:t,a:t}]);delete A.pos;delete A.posNo;sinMsg(A,['camino']);msg(A,'ausente');log(A,'No había nadie');return ok()}

 case 'empezar':{
  if(!mio)return R('permiso');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  if(S.avisos.some(x=>x.id!==A.id&&x.tec===A.tec&&(x.e==='camino'||x.e==='curso')))return R('ocupado');
  const p=a.pres&&typeof a.pres==='object'?a.pres:{};if(typeof p.firma!=='string'||p.firma.length<12)return R('firma');
  const pr=precio(cfg,p.lineas,{urg:tarifaDe(cfg,A),local:!!p.local,gratis:gratisDe(A),garan:garanDe(A)});if(!pr.lineas.length||(!pr.total&&!pr.lineas.some(l=>l.con||l.gar)))return R('lineas');
  const des=desiste(cfg,A,p.lineas);if(pideYa(des)&&p.pide!==true)return R('pide');
  A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.local=!!p.local;
  A.pres=Object.assign({t,firma:p.firma,des:{c:des,pide:pideYa(des)?t:0}},pr);A.tot=pr;
  if(!A.sal)A.sal=t;A.e='curso';A.ini=t;A.pausas=[];delete A.pos;delete A.posNo;sinMsg(A,['camino','recibido','cita','vispera']);
  log(A,'Presupuesto firmado: '+eur(A.tot.total)+'. Empieza el trabajo');return ok()}

 case 'noacepta':{
  if(!mio)return R('permiso');if(A.e!=='camino'&&A.e!=='asignado')return R('estado');
  const pr=precio(cfg,[{k:cfg.N.sinTrabajo,q:1}],{urg:tarifaDe(cfg,A),local:!!a.local,gratis:gratisDe(A),garan:garanDe(A)});
  if(pr.total&&!PAGOS.includes(a.modo))return R('modo');
  A.tot=pr;A.lin=[{k:cfg.N.sinTrabajo,q:1}];A.local=!!a.local;A.sinTrabajo=true;A.e='hecho';A.fin=t;if(!A.sal)A.sal=t;delete A.pos;delete A.posNo;
  A.pago=pr.total?{modo:a.modo,t,cobrado:a.modo!=='pendiente'}:{modo:'',t,cobrado:true};sinMsg(A,['camino','recibido','cita','vispera']);msg(A,'hecho');if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  {const p=a.pres&&typeof a.pres==='object'?a.pres:null,pq=p&&Array.isArray(p.lineas)?precio(cfg,p.lineas,{urg:tarifaDe(cfg,A),local:!!a.local,gratis:gratisDe(A),garan:garanDe(A)}):null;
   if(pq&&pq.lineas.length&&pq.total>0){A.noPres={t,total:pq.total,lin:pq.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q})};msg(A,'presupuesto',t+3*DIA,t+14*DIA)}}
  log(A,'No acepta el precio. '+(pr.total?'Solo el desplazamiento: '+eur(pr.total):'El desplazamiento va en su contrato: no se cobra nada'));return ok()}

 case 'ampliar':{
  if(!mio)return R('permiso');if(A.e!=='curso'||!A.tot||!A.lin)return R('estado');
  if(typeof a.firma!=='string'||a.firma.length<12)return R('firma');
  const mas=(Array.isArray(a.lineas)?a.lineas:[]).filter(l=>l&&typeof l==='object'&&(l.q==null||+l.q>0)&&(l.k==='otro'?+l.p>0:typeof l.k==='string'&&!!cfg.cat[l.k]));if(!mas.length)return R('lineas');
  const des=desiste(cfg,A,mas);if(pideYa(des)&&a.pide!==true)return R('pide');
  const junto=A.lin.map(l=>Object.assign({},l));
  mas.forEach(l=>{const ya=l.k!=='otro'&&junto.find(x=>x.k===l.k);if(ya)ya.q+=(+l.q||cfg.cat[l.k].min);else junto.push(l.k==='otro'?{k:'otro',t:l.t,p:+l.p,q:1}:{k:l.k,q:+l.q||cfg.cat[l.k].min})});
  const gr=gratisDe(A),ga=garanDe(A),pr=precio(cfg,junto,{urg:A.tot.urg,local:A.local,gratis:gr,garan:ga}),dif=pr.total-A.tot.total;if(dif<=0)return R('lineas');
  A.amp=A.amp||[];A.amp.push({t,firma:a.firma,dif,des:{c:des,pide:pideYa(des)?t:0},lineas:precio(cfg,mas,{urg:A.tot.urg,tipo:pr.tipo,sinMin:A.lin.some(l=>cfg.cat[l.k]&&cfg.cat[l.k].un==='h'),gratis:gr,garan:ga}).lineas,tipo:pr.tipo});
  A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.tot=pr;
  log(A,'Ampliación firmada: '+eur(dif)+' más');return ok({dif})}

 case 'pausa':{
  if(!mio)return R('permiso');if(A.e!=='curso')return R('estado');
  if(enPausa(A)){A.pausas[A.pausas.length-1][1]=t;log(A,'Sigue el trabajo')}else{A.pausas.push([t,0]);log(A,'Pausa')}return ok({pausa:enPausa(A)})}

 case 'anotar':{
  if(!mio&&!esC)return R('permiso');if(A.e==='hecho'||A.e==='cancelado')return R('estado');
  const conFoto=fotoVale(a.foto);
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
  msg(A,'hecho');msg(A,'resena',t+120*MIN,t+7*DIA);msg(A,'seguimiento',t+7*DIA,t+25*DIA);if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);
  /* «avisar»: el cliente ha dicho que sí a que se le avise cuando toque volver (un servicio con «cada»). El mensaje sale un mes antes y caduca un mes después.
     Con contrato no: sus revisiones ya las lleva el contrato */
  {const k=a.avisar===true&&A.av!==REV&&!A.con&&A.lin.map(l=>l.k).find(x=>cfg.cat[x]&&cfg.cat[x].cada);if(k){const dia=masMeses(madrid(t).date,cfg.cat[k].cada);A.prox={k,dia,t};
   msg(A,'proxima',Date.parse(masDias(dia,-30)+'T09:00:00Z'),Date.parse(masDias(dia,30)+'T19:00:00Z'))}}
  log(A,'Terminado. '+eur(A.tot.total)+(!A.tot.total?', sin nada que cobrar':A.pago.cobrado?', cobrado ('+a.modo+')':', pendiente de pago'));
  /* la furgoneta (16-11-2026): si su técnico lleva la cuenta, lo usado se descuenta. Nunca por debajo de cero: si no
     llegaba, lo dice, y el próximo recuento lo pone bien */
  {const F=furgoDe(S,A.tec),usa=[];if(F){F.st=F.st&&typeof F.st==='object'&&!Array.isArray(F.st)?F.st:{};
   A.lin.forEach(l=>{const it=l&&l.k!=='otro'?cfg.cat[l.k]:null;if(!it||!it.mat)return;const n=Math.round(+l.q||0);if(n<1)return;
    const antes=hay(F.st,l.k),queda=Math.max(0,antes-n);if(queda)F.st[l.k]=queda;else delete F.st[l.k];usa.push(n+' × '+it.t+(antes<n?' (apuntados había '+antes+')':''))});
   if(usa.length){apuntaF(F,t,nom,A.id+': '+usa.join('; '));log(A,'Descontado de la furgoneta: '+usa.join('; '))}}}
  return ok()}

 case 'cobrar':{
  if(!esC&&!mio)return R('permiso');if(A.e!=='hecho'||!A.pago||A.pago.cobrado)return R('estado');
  if(!PAGOS.includes(a.modo)||a.modo==='pendiente')return R('modo');
  A.pago={modo:a.modo,t,cobrado:true};sinMsg(A,['cobro']);log(A,'Cobrado ('+a.modo+')');return ok()}

 /* La factura la hace el programa del negocio, no esta app. La oficina apunta que ya está hecha, con su número si quiere,
    para que ningún trabajo se quede sin facturar. «quitar» lo deshace si se marcó por error. */
 /* «Es garantía» (16-11-2026): la oficina decide que el aviso vuelve sobre un trabajo que sigue en garantía. Antes de empezar:
    con el aviso ya en marcha, el precio está firmado. Se quita con «quitar» */
 case 'garantia':{
  if(!esC)return R('permiso');if(!['nuevo','asignado','camino','ausente'].includes(A.e))return R('estado');
  if(a.quitar===true){if(!A.enGar)return R('estado');const de=A.enGar.de;delete A.enGar;log(A,'Ya no va en la garantía de '+de);return ok()}
  const de=typeof a.de==='string'?a.de:A.gar0,G=de&&garantiaDe(S,cfg,A.cli,t,A.id).includes(de)?S.avisos.find(x=>x.id===de):null;
  if(!G||!G.tot)return R('garantia');
  const k=new Set([cfg.N.sinTrabajo,cfg.horas,cfg.urge].filter(x=>x&&cfg.cat[x]));(G.tot.lineas||[]).forEach(l=>{if(l.k!=='otro'&&cfg.cat[l.k])k.add(l.k)});
  A.enGar={de:G.id,k:[...k]};log(A,'En garantía del trabajo '+G.id+': no se cobra la visita, la mano de obra ni lo que se puso entonces');return ok()}

 /* corregir la forma de pago de un trabajo ya cobrado, o dejarlo otra vez por cobrar (16-11-2026). Lo hace la oficina.
    Lo que está por cobrar se apunta con «cobrar», no aquí */
 case 'corregirPago':{
  if(!esC)return R('permiso');if(A.e!=='hecho'||!A.tot||!A.tot.total||!A.pago||!A.pago.cobrado)return R('estado');
  if(!PAGOS.includes(a.modo))return R('modo');if(a.modo===A.pago.modo)return R('igual');
  const antes=A.pago.modo;A.pago=a.modo==='pendiente'?{modo:'pendiente',t,cobrado:false}:{modo:a.modo,t:A.pago.t,cobrado:true};
  if(!A.pago.cobrado)msg(A,'cobro',t+3*1440*MIN);   /* otra vez por cobrar: el recordatorio, como al terminar sin cobrar */
  log(A,'Forma de pago corregida: '+antes+' → '+a.modo);return ok()}

 /* rebajar el precio (16-11-2026): la oficina, en un trabajo empezado o terminado, o su técnico mientras trabaja (el cliente
    desiste a medias, al final no hizo falta una pieza…). Solo a la baja, con motivo y sin facturar: una factura hecha se
    corrige en el programa de facturas. Si ya estaba cobrado, queda apuntado lo que hay que devolver */
 case 'rebajar':{
  if(!esC&&!(mio&&A.e==='curso'))return R('permiso');if((A.e!=='curso'&&A.e!=='hecho')||!A.tot||!A.lin)return R('estado');
  if(A.fac)return R('facturado');
  const mot=txt(a.motivo).trim().replace(/\s+/g,' ').slice(0,120);if(mot.length<3)return R('motivo');
  const L=(Array.isArray(a.lineas)?a.lineas:[]).filter(l=>l&&typeof l==='object'&&(l.q==null||+l.q>0)&&(l.k==='otro'?+l.p>0:typeof l.k==='string'&&!!cfg.cat[l.k]));
  const pr=precio(cfg,L,{urg:A.tot.urg,local:A.local,gratis:gratisDe(A),garan:garanDe(A)});   /* con las reglas de siempre (la primera hora, entera) */
  if(!pr.lineas.length||pr.total>=A.tot.total)return R('lineas');
  const r0={t,antes:A.tot.total,ahora:pr.total,motivo:mot};
  if(A.e==='hecho'&&A.pago){if(A.pago.cobrado&&A.pago.modo)r0.devolver=A.tot.total-pr.total;
   /* a cero (lo que queda va en el contrato o en la garantía): no hay nada que cobrar; si había pagado, se apunta cómo, para devolvérselo */
   if(!pr.total){if(A.pago.cobrado&&A.pago.modo)r0.modo=A.pago.modo;A.pago={modo:'',t:A.pago.cobrado?A.pago.t:t,cobrado:true};sinMsg(A,['cobro'])}}
  A.rebajas=(A.rebajas||[]).concat([r0]);A.lin=pr.lineas.map(l=>l.k==='otro'?{k:'otro',t:l.t,p:l.p,q:1}:{k:l.k,q:l.q});A.tot=pr;
  log(A,'Precio rebajado de '+eur(r0.antes)+' a '+eur(r0.ahora)+': '+mot+(r0.devolver?'. Hay que devolverle '+eur(r0.devolver):''));return ok()}

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
  S.avisos.forEach(x=>{if(x.cli&&x.cli.tel===d.cli.tel&&['nuevo','asignado','camino','ausente'].includes(x.e)&&!x.pres&&!x.tot){const c=conDe(S,cfg,x,t);if(c&&(!x.con||x.con.id!==c.id)){x.con=c;log(x,'Ahora con el contrato de mantenimiento '+id)}}});
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

 /* la oficina deja un mensaje sin mandar: no hace falta (el cliente ya lo sabe, ya ha dejado la reseña...) */
 case 'descartar':{
  if(!esC)return R('permiso');const m=A.msgs.find(x=>x.k===a.k&&!x.env);if(!m)return R('mensaje');
  m.env=t;m.no=1;A.v++;return ok()}

 /* el cliente no quiere mensajes de seguimiento (o vuelve a quererlos). Va por su teléfono, en todos sus avisos */
 /* la furgoneta de un técnico (16-11-2026): llevar la cuenta o dejarla («llevar»), contar lo que hay («cuenta»: lo dicho queda
    tal cual y lo demás no cambia) o apuntar lo que se carga («carga»: suma). Él, la suya; la oficina, cualquiera */
 case 'furgo':{
  if(typeof a.tec!=='string'||!cfg.tec[a.tec])return R('tec');if(!esC&&!(esT&&q.id===a.tec))return R('permiso');
  const FS=S.furgos&&typeof S.furgos==='object'&&!Array.isArray(S.furgos)?S.furgos:null;
  let F=FS&&tiene(FS,a.tec)&&FS[a.tec]&&typeof FS[a.tec]==='object'?FS[a.tec]:null;
  if(a.llevar!=null){if(typeof a.llevar!=='boolean'||a.cuenta!=null||a.carga!=null)return R('furgo');
   if(a.llevar){if(F&&F.on)return R('estado');if(!F){if(!FS)S.furgos={};F=S.furgos[a.tec]={on:true,st:{},t,cnt:0,h:[]}}else F.on=true;apuntaF(F,t,nom,'Empieza a llevar la cuenta');return ok()}
   if(!F||!F.on)return R('estado');F.on=false;apuntaF(F,t,nom,'Deja de llevar la cuenta');return ok()}
  if(!F||!F.on)return R('estado');
  if((a.cuenta==null)===(a.carga==null))return R('furgo');
  const L=a.cuenta!=null?a.cuenta:a.carga;if(!L||typeof L!=='object'||Array.isArray(L))return R('furgo');
  const ord=Object.keys(cfg.cat),ks=Object.keys(L).sort((x,y)=>ord.indexOf(x)-ord.indexOf(y));if(!ks.length||ks.length>80)return R('furgo');
  for(const k of ks){const it=cfg.cat[k],n=L[k];if(!it||!it.mat||!Number.isInteger(n)||n<(a.carga!=null?1:0)||n>999)return R('furgo')}
  F.st=F.st&&typeof F.st==='object'&&!Array.isArray(F.st)?F.st:{};
  if(a.cuenta!=null){const dif=[];ks.forEach(k=>{const antes=hay(F.st,k),n=L[k];if(antes!==n)dif.push(cfg.cat[k].t+': '+antes+' → '+n);if(n)F.st[k]=n;else delete F.st[k]});
   F.cnt=t;apuntaF(F,t,nom,'Recuento'+(dif.length?'. '+dif.join('; '):': todo cuadra'));return ok({cambios:dif.length})}
  ks.forEach(k=>{F.st[k]=Math.min(9999,hay(F.st,k)+L[k])});apuntaF(F,t,nom,'Cargado: '+ks.map(k=>L[k]+' × '+cfg.cat[k].t).join('; '));return ok()}

 case 'escribir':{
  if(!esC)return R('permiso');if(typeof a.si!=='boolean')return R('si');const t9=tel9(a.tel),L=t9?S.avisos.filter(x=>x.cli&&x.cli.tel===t9):[];if(!L.length)return R('tel');
  const ult=L.reduce((x,y)=>y.t>x.t?y:x);
  if(a.si){if(!L.some(x=>x.noMsg))return R('estado');L.forEach(x=>{if(x.noMsg){delete x.noMsg;x.v=(x.v||0)+1}});log(ult,'Vuelve a querer los mensajes de seguimiento')}
  else{if(L.every(x=>x.noMsg))return R('estado');L.forEach(x=>{x.noMsg=t;x.msgs=x.msgs.filter(m=>m.env||!SEGUIR.includes(m.k));x.v=(x.v||0)+1});log(ult,'No quiere mensajes de seguimiento')}
  return ok()}

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
const PERFIL=['enGar','rebajas','id','av','e','urg','t','cita','tec','ini','fin','min','sinTrabajo','pres','amp','tot','pago','gar','obs','conf','fotos','fac','cli','con'];
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
/* cuándo toca la revisión número k de un periodo con r revisiones: repartidas a lo largo del periodo, la última al final.
   Con una al año, al cumplir el año. La oficina la ve un mes antes (desde el 15-11: antes salía el primer día). */
const entreDias=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
function tocaRevision(p,k,r){return masDias(p.de,Math.round(entreDias(p.de,p.a)*Math.min(k,r)/r))}
function pendientesContratos(S,cfg,t){const hoy=madrid(t).date,renovar=[],revision=[],cobrar=[];
 (S.contratos||[]).forEach(C=>{if(C.e!=='activo')return;const u=C.per[C.per.length-1],P=planDe(cfg,C.plan);
  if(hoy>=masDias(u.a,-30)&&hoy<=masDias(u.a,60))renovar.push({id:C.id,a:u.a,vencido:hoy>u.a});
  const i=perDe(C,hoy);if(i>=0&&P){const n=S.avisos.filter(x=>x.e!=='cancelado'&&x.con&&x.con.id===C.id&&x.con.per===i&&x.con.rev).length;
   if(n<P.revisiones){const toca=tocaRevision(C.per[i],n+1,P.revisiones);if(hoy>=masDias(toca,-30))revision.push({id:C.id,quedan:P.revisiones-n,toca})}}
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

/* ---------- la furgoneta (16-11-2026) ----------
   Lo que lleva cada trabajo sale de lo que ya sabe la app: con el presupuesto firmado, su material; sin él, el de partida de
   su avería; y lo apuntado como que falta. «Por si acaso»: las piezas que se suelen añadir en esa avería (sus «chips»), una
   de cada y sin los aparatos («extra»). Si un técnico quiere, la app lleva la cuenta de su furgoneta («furgos», por técnico):
   lo que carga suma, lo que usa en un trabajo se descuenta al terminarlo y un recuento pone lo que hay de verdad. Solo cuenta
   el material del catálogo, por su clave; lo escrito a mano se dice, pero no se cuenta.
   «furgoneta» en los datos: lo que lleva siempre cada furgoneta, con su mínimo y su máximo. Lo que baja del mínimo sale para
   reponer hasta el máximo. Un técnico puede tener la suya («furgoneta» en su ficha). */
const FURGO_H=60;   /* los movimientos que se guardan de cada furgoneta */
const tiene=(o,k)=>!!o&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k);
const hay=(st,k)=>tiene(st,k)&&Number.isInteger(st[k])&&st[k]>0?st[k]:0;
/* la furgoneta de un técnico, solo si lleva la cuenta */
const furgoDe=(S,tec)=>{const F=S&&typeof tec==='string'&&tiene(S.furgos,tec)?S.furgos[tec]:null;return F&&typeof F==='object'&&F.on===true?F:null};
const kitDe=(cfg,tec)=>(cfg.kits&&typeof tec==='string'&&tiene(cfg.kits,tec)?cfg.kits[tec]:null)||cfg.kit||{};
function apuntaF(F,t,q,txt){F.h=Array.isArray(F.h)?F.h:[];F.h.push({t,q,txt});if(F.h.length>FURGO_H)F.h=F.h.slice(-FURGO_H);F.t=t}
/* lo que lleva un trabajo: {lin:[{k,t,q,fa?}], quiza:[{k,t}], mano:[{t,q}]}. «fa»: cuántos de esos están apuntados como que faltan */
function lleva(cfg,A){const lin=[],mano=[];if(!A||typeof A!=='object')return{lin,quiza:[],mano};
 const pon=(k,q,fa)=>{const it=cfg.cat[k];if(!it||!it.mat||!(q>0))return;let x=lin.find(y=>y.k===k);if(x)x.q=fa?Math.max(x.q,q):x.q+q;else lin.push(x={k,t:it.t,q});if(fa)x.fa=Math.max(x.fa||0,q)};
 (Array.isArray(A.lin)&&A.lin.length?A.lin:iniDe(cfg,A)).forEach(l=>{if(l&&typeof l.k==='string'&&l.k!=='otro'&&cfg.cat[l.k])pon(l.k,Math.round(+l.q||cfg.cat[l.k].min||1))});
 (Array.isArray(A.falta)?A.falta:[]).forEach(x=>{if(!x)return;if(x.k)pon(x.k,x.q,true);else if(x.t)mano.push({t:x.t,q:x.q})});
 const av=cfg.av[A.av],quiza=(av&&Array.isArray(av.chips)?av.chips:[]).filter((k,i,L)=>L.indexOf(k)===i&&cfg.cat[k]&&cfg.cat[k].mat&&!cfg.cat[k].extra&&!lin.some(l=>l.k===k)).map(k=>({k,t:cfg.cat[k].t}));
 return{lin,quiza,mano}}
/* lo que hay que reponer en una furgoneta: lo que está por debajo del mínimo, hasta el máximo */
function reponerDe(S,cfg,tec){const F=furgoDe(S,tec);if(!F)return[];const kit=kitDe(cfg,tec);
 return Object.keys(kit).filter(k=>cfg.cat[k]&&hay(F.st,k)<kit[k][0]).map(k=>({k,t:cfg.cat[k].t,q:kit[k][1]-hay(F.st,k),hay:hay(F.st,k),min:kit[k][0],max:kit[k][1]}))}
/* lo que lleva un técnico un día (AAAA-MM-DD): sus avisos con cita ese día y, hoy, también las urgencias y lo que ya está en
   marcha. Con la cuenta de su furgoneta, además: «falta» (lo que necesita menos lo que hay), «reponer» y «cargar» (lo mayor
   de las dos: lo que conviene cargar) */
function cargaDe(S,cfg,tec,dia,t){const hoy=madrid(t).date,F=furgoDe(S,tec),ord=Object.keys(cfg.cat),o=(x,y)=>ord.indexOf(x.k)-ord.indexOf(y.k);
 const av=[],lin=[],quiza=[],mano=[];
 ((S&&S.avisos)||[]).forEach(A=>{if(!A||A.tec!==tec||!EN_MARCHA.includes(A.e))return;const d=A.e!=='asignado'||!A.cita||A.cita.dia<hoy?hoy:A.cita.dia;if(d!==dia)return;
  av.push(A.id);const L=lleva(cfg,A);
  L.lin.forEach(x=>{let y=lin.find(z=>z.k===x.k);if(y){y.q+=x.q;y.av.push(A.id)}else lin.push(y={k:x.k,t:x.t,q:x.q,av:[A.id]});if(x.fa)y.fa=(y.fa||0)+x.fa});
  L.quiza.forEach(x=>{const y=quiza.find(z=>z.k===x.k);if(y)y.av.push(A.id);else quiza.push({k:x.k,t:x.t,q:1,av:[A.id]})});
  L.mano.forEach(x=>{const y=mano.find(z=>z.t.toLowerCase()===x.t.toLowerCase());if(y){y.q+=x.q;y.av.push(A.id)}else mano.push({t:x.t,q:x.q,av:[A.id]})})});
 lin.sort(o);quiza.sort(o);
 const out={tec,dia,av,lin,quiza,mano,furgo:!!F};
 if(F){const seg=Object.create(null),todo=Object.create(null),c=Object.create(null);lin.forEach(x=>{seg[x.k]=x.q;todo[x.k]=x.q});quiza.forEach(x=>{todo[x.k]=(todo[x.k]||0)+1});
  out.falta=Object.keys(todo).map(k=>({k,t:cfg.cat[k].t,q:todo[k]-hay(F.st,k),hay:hay(F.st,k),quiza:(seg[k]||0)<=hay(F.st,k)})).filter(x=>x.q>0).sort(o);
  out.reponer=reponerDe(S,cfg,tec);
  out.falta.forEach(x=>{c[x.k]=x.q});out.reponer.forEach(x=>{c[x.k]=Math.max(c[x.k]||0,x.q)});
  out.cargar=Object.keys(c).map(k=>({k,t:cfg.cat[k].t,q:c[k]})).sort(o)}
 return out}
/* la carga de un día, escrita para copiarla o mandarla */
function textoCarga(cfg,c){if(!c||!c.lin)return'';const T=cfg.tec[c.tec],L=[],ids=x=>x.av&&x.av.length?' ('+x.av.join(', ')+')':'';
 if(c.furgo&&c.cargar&&c.cargar.length){L.push('Para cargar:');c.cargar.forEach(x=>L.push('- '+x.q+' × '+x.t))}
 if(c.lin.length){L.push(c.furgo?'Lo que lleva cada trabajo:':'Lo que lleva:');c.lin.forEach(x=>L.push('- '+x.q+' × '+x.t+ids(x)+(x.fa?', apuntado que falta':'')))}
 if(c.quiza.length){L.push('Por si acaso:');c.quiza.forEach(x=>L.push('- 1 × '+x.t+ids(x)))}
 if(c.mano.length){L.push('Apuntado a mano:');c.mano.forEach(x=>L.push('- '+x.q+' × '+x.t+ids(x)))}
 if(!L.length)return'';
 return'Material para el '+fechaLarga(c.dia)+(T?', '+T.n:'')+':\n'+L.join('\n')+'\n'+cfg.N.nombre}

g.OficioNucleo={esFoto,esRef,canon,huellaDatos,publico,garanDe,VOY_ANTES,voyDesde,voyYa,voyTarde,VERSION,ESQ,PAGOS,ORIGEN,MSG,SEGUIR,porMandar,noEscribe,REV,CONT,durDe,durLineas,durEst,ocupacion,proximaCita,llegadas,chocaUrg,urgenciaAhora,agendaDe,turnosDe,libresDe,cabeTec,eligeTec,repartoDia,cuantasCaben,reservaDe,tocaRevision,iniDe,COMISION_URG,urgenciasMes,planDe,perDe,vigente,contratoDe,conDe,gratisDe,pendientesContratos,cuotasMes,datosFacturaContrato,material,textoMaterial,lleva,cargaDe,reponerDe,kitDe,furgoDe,textoCarga,FURGO_H,desiste,pideYa,porFacturar,datosFactura,trabajosMes,csv,CSV_CAB,rentabilidad,quienDe,fincaDe,franjaTxt,esFecha,trabaja,ausente,capacidad,capacidadTotal,puedeIr,sobran,nuevo,cfgDe,aplicar,precio,rango,horas,urgente,tarifaDe,madrid,hhmm,hora,masDias,masMeses,fechaLarga,fechaCorta,eur,tel9,telBonito,nomCli,parteNombre,normDir,garantiaDe,franjasDe,diasDe,laborable,etaMin,mensaje,minutos,enPausa,vistaCliente,perfilCliente,CLIENTE_DEMO,resumen};
})(typeof globalThis!=='undefined'?globalThis:this);
