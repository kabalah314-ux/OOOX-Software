/* ============================================================
   DATOS DEL NEGOCIO · Ramírez 24 h (negocio de ejemplo).
   Es el único archivo que cambia de un fontanero a otro: quiénes son,
   dónde trabajan, qué cobran y cuándo dan cita.
   Los precios son finales para una vivienda (IVA del 10 % dentro) y son
   los mismos que enseña la web. Todo lo de aquí es inventado.
   ============================================================ */
(function(g){
'use strict';
g.OFICIO_NEGOCIO={
 id:'ramirez-uso',serie:'R',nombre:'Ramírez 24 h',marca:['Ramírez','24 h'],razon:'Ramírez Fontaneros, S. L.',nif:'B00000000',dir:'Taller en Sants, Barcelona',ciudad:'Barcelona',tel:'930 00 00 00',
 resenas:'g.page/r/ramirez24h-demo/review',
 pack:'pro',garantiaMeses:12,sinTrabajo:'desp',
 /* tarifa normal de 8 a 20 h en días laborables; el resto, urgencia */
 tarifa:{dia:[480,1200],recargo:.4,urgente:'urge'},
 festivos:['2026-01-01','2026-01-06','2026-04-03','2026-04-06','2026-05-01','2026-05-25','2026-06-24','2026-08-15','2026-09-11','2026-09-24','2026-10-12','2026-11-01','2026-12-06','2026-12-08','2026-12-25','2026-12-26','2027-01-01','2027-01-06','2027-03-26','2027-03-29','2027-05-01','2027-05-17','2027-06-24','2027-09-11','2027-09-24','2027-10-12','2027-11-01','2027-12-06','2027-12-08','2027-12-25'],
 /* horarios y turnos, con valores de prueba (cada negocio pone los suyos):
    Omar y Laia, de lunes a viernes, de 8 a 14 y de 15 a 20. Jordi, de 8 a 14 y de 15 a 18: la última franja no la hace.
    Los tres hacen guardias, porque el servicio es de 24 horas. Cada técnico lleva una cita por franja y, de las que caben,
    una no se ofrece al cliente: se guarda para urgencias y solo la puede usar la oficina. */
 citas:{porFranja:3,reserva:1,porTiempo:true,reservaSiFalta:false},   // el dueño ha elegido: los días que falta alguien, no se guarda a nadie para urgencias
 /* coche: lo que ve el cliente cuando va de camino. foto (en assets/) solo con fotoOk:1, que es su permiso por escrito */
 tecnicos:[
  {id:'omar',n:'Omar',ap:'Benali',tono:205,coche:'Furgoneta blanca con el logo de Ramírez',guardia:1,horario:{1:[[480,840],[900,1200]],2:[[480,840],[900,1200]],3:[[480,840],[900,1200]],4:[[480,840],[900,1200]],5:[[480,840],[900,1200]]}},
  {id:'laia',n:'Laia',ap:'Ferrer',tono:340,coche:'Furgoneta blanca con el logo de Ramírez',guardia:1,horario:{1:[[480,840],[900,1200]],2:[[480,840],[900,1200]],3:[[480,840],[900,1200]],4:[[480,840],[900,1200]],5:[[480,840],[900,1200]]}},
  {id:'jordi',n:'Jordi',ap:'Ramírez',tono:95,coche:'Furgoneta blanca con el logo de Ramírez',jefe:1,guardia:1,horario:{1:[[480,840],[900,1080]],2:[[480,840],[900,1080]],3:[[480,840],[900,1080]],4:[[480,840],[900,1080]],5:[[480,840],[900,1080]]}}],
 zonas:{banda:{a:25,b:35,c:40},dis:{cve:['Ciutat Vella','a','Ciutat Vella'],eix:['Eixample','a','Eixample'],stm:['Sants-Montjuïc','a','Sants-Montjuïc'],cor:['Les Corts','a','Les Corts'],sar:['Sarrià-Sant Gervasi','c','Sarrià-St. Gervasi'],gra:['Gràcia','b','Gràcia'],hor:['Horta-Guinardó','c','Horta-Guinardó'],nou:['Nou Barris','c','Nou Barris'],and:['Sant Andreu','c','Sant Andreu'],smt:['Sant Martí','b','Sant Martí']},cp:{'08001':'cve','08002':'cve','08003':'cve','08039':'cve','08007':'eix','08008':'eix','08009':'eix','08010':'eix','08011':'eix','08013':'eix','08015':'eix','08029':'eix','08036':'eix','08037':'eix','08004':'stm','08014':'stm','08038':'stm','08040':'stm','08028':'cor','08034':'cor','08006':'sar','08017':'sar','08021':'sar','08022':'sar','08012':'gra','08023':'gra','08024':'gra','08025':'gra','08032':'hor','08035':'hor','08041':'hor','08016':'nou','08031':'nou','08033':'nou','08042':'nou','08027':'and','08030':'and','08005':'smt','08018':'smt','08019':'smt','08020':'smt','08026':'smt'}},
 /* el mapa: con esto puesto, el técnico comparte su posición con el cliente desde «Voy» hasta que llega, y el cliente la ve
    sobre el mapa de «teselas». Sin «mapa», no se comparte nada. El servidor gratuito de OpenStreetMap vale para una demo;
    un negocio en marcha necesita un proveedor de mapas o un servidor propio (lo dice su política de uso). */
 mapa:{teselas:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',firma:'© OpenStreetMap',firmaUrl:'https://www.openstreetmap.org/copyright'},
 /* citas sin prisa: las franjas de los días laborables. Cuántas caben en cada una sale de los horarios de arriba */
 franjas:[{id:'f1',de:480,a:660},{id:'f2',de:660,a:840},{id:'f3',de:900,a:1080},{id:'f4',de:1080,a:1200}],
 /* el catálogo. u: lleva el recargo de urgencia · mat: es material · un: 'h' se cuenta por horas ·
    extra: no es una pieza para arreglar la avería (un aparato nuevo): aunque sea una urgencia, tiene desistimiento */
 catalogo:{
  desp:{t:'Desplazamiento en Barcelona',p10:30,u:1},
  urge:{t:'Servicio urgente: salimos en el momento',p10:30},
  mo:{t:'Mano de obra',p10:45,u:1,un:'h',min:1,paso:.25},
  desatasco:{t:'Desatasco manual, con desplazamiento',p10:65,u:1,base:'fon-desatasco',dur:[30,60]},
  maquina:{t:'Máquina desatascadora',p10:55,u:1,dur:[20,40]},
  cisterna:{t:'Ajuste o cambio de mecanismo, con desplazamiento',p10:55,u:1,base:'fon-cisterna-ajustar',dur:[20,45]},
  grifo:{t:'Cambio o reparación de grifo, con desplazamiento',p10:50,u:1,base:'fon-grifo-cambiar',dur:[30,60]},
  juntas:{t:'Juntas y racores',p10:12,mat:1},
  sellador:{t:'Teflón y sellador',p10:8,mat:1},
  latig:{t:'Latiguillos, el par',p10:12,mat:1},
  llave:{t:'Llave de escuadra',p10:18,mat:1},
  sifon:{t:'Sifón',p10:14,mat:1},
  tubo:{t:'Tramo de tubería, hasta 1 m',p10:35,mat:1},
  mecanismo:{t:'Mecanismo de cisterna',p10:35,mat:1},
  valvula:{t:'Válvula de seguridad',p10:15,mat:1},
  termostato:{t:'Termostato',p10:22,mat:1},
  resistencia:{t:'Resistencia',p10:38,mat:1},
  grifon:{t:'Grifo monomando',p10:35,mat:1},
  termo80:{t:'Termo eléctrico de 80 litros, instalado',p21:390,mat:1,extra:1,base:'fon-termo',dur:[90,180]},
  revinst:{t:'Revisión de la instalación',p10:45,base:'fon-revision',dur:[40,75],cada:12}},
 /* la furgoneta: lo que lleva siempre cada una, [mínimo, máximo]. Solo cuenta en la de quien lleva la cuenta en la app (lo decide
    cada técnico). Lo que baja del mínimo sale para reponer hasta el máximo. Si alguien lleva otra cosa, se le pone la suya en su ficha */
 furgoneta:{juntas:[6,12],sellador:[2,4],latig:[4,8],llave:[3,6],sifon:[2,4],tubo:[2,4],mecanismo:[2,4],valvula:[2,4],termostato:[1,2],resistencia:[1,2],grifon:[1,2]},
 /* las averías: min y max dan el «de cuánto a cuánto» de la web; ini es el presupuesto que sale ya puesto en la puerta */
 averias:[
  {id:'fuga',n:'Fuga de agua',c:'Fuga',d:'Tubería, llave de paso o latiguillo.',min:[{k:'desp'},{k:'mo',q:1}],max:[{k:'desp'},{k:'mo',q:2},{k:'juntas'},{k:'sellador'}],dur:[45,120],ini:[{k:'desp'},{k:'mo',q:1},{k:'juntas'}],chips:['sellador','latig','llave','tubo']},
  {id:'atasco',n:'Atasco',c:'Atasco',d:'Fregadero, lavabo, ducha o inodoro.',min:[{k:'desatasco'}],max:[{k:'desatasco'},{k:'maquina'}],dur:[30,90],ini:[{k:'desatasco'}],chips:['maquina','sifon']},
  {id:'termo',n:'Sin agua caliente',c:'Termo',d:'Termo eléctrico que no calienta o pierde.',min:[{k:'desp'},{k:'mo',q:1},{k:'valvula'}],max:[{k:'desp'},{k:'mo',q:2},{k:'resistencia'},{k:'termostato'}],dur:[60,150],ini:[{k:'desp'},{k:'mo',q:1}],chips:['valvula','termostato','resistencia','termo80']},
  {id:'cisterna',n:'Cisterna que pierde',c:'Cisterna',d:'No para de correr el agua o no carga.',min:[{k:'cisterna'}],max:[{k:'cisterna'},{k:'mecanismo'}],dur:[30,75],ini:[{k:'cisterna'}],chips:['mecanismo','latig','llave']},
  {id:'grifo',n:'Grifo que gotea',c:'Grifo',d:'Gotea, está duro o hay que cambiarlo.',min:[{k:'grifo'}],max:[{k:'grifo'},{k:'latig'},{k:'llave'}],dur:[30,60],ini:[{k:'grifo'}],chips:['latig','llave','grifon']},
  {id:'otra',n:'Otra avería',c:'Otra',d:'Cuéntanos qué pasa.',min:[{k:'desp'},{k:'mo',q:1}],max:null,dur:[45,120],ini:[{k:'desp'},{k:'mo',q:1}],chips:['juntas','sellador','latig','llave','sifon','tubo']}],
 /* el mantenimiento: la cuota al año que vende el negocio. La revisión es un aviso que crea la oficina, no una avería de la web.
    En cada plan: «precio», al año y con el IVA dentro; «desp», lo que no se cobra en una urgencia; «rev», la revisión incluida
    (en su aviso tampoco se cobra el desplazamiento); «revisiones», cuántas al año; «prioridad», sus avisos van primero. */
 mantenimiento:{
  revision:{n:'Revisión del contrato',c:'Revisión',d:'La revisión de la instalación que lleva el contrato.',dur:[40,75],ini:[{k:'desp'},{k:'revinst'}],chips:['juntas','sellador','latig','llave','valvula','termostato']},
  planes:[{id:'anual',n:'Mantenimiento anual',precio:120,iva:21,revisiones:1,desp:'desp',rev:'revinst',prioridad:1}]}
};

/* ---------- la demo «en uso»: Ramírez 24 h, nueve semanas después de empezar con la app ----------
   Aquí no hay datos escritos a mano. Este programa hace, día a día, lo que haría el negocio: entran citas y urgencias,
   la oficina reparte la tarde antes, los técnicos van, firman, terminan y cobran, se cobran los pendientes, se
   facturan los trabajos, se venden contratos, alguien se va de vacaciones o al médico. Cada paso pasa por las reglas
   (K.aplicar), igual que en la app. Si las reglas rechazan un paso, se apunta en «info.fallos» y se sigue: la prueba
   uso-real.mjs exige que no haya ninguno.
   Todo cuenta desde «ahora», así que la demo siempre está al día: hoy hay trabajos hechos, uno en marcha, uno de
   camino, una urgencia recién entrada y citas para los próximos días. Con la misma hora, salen los mismos datos. */
g.OFICIO_MUESTRA=function(K,cfg,ahora,info){
 const NEG=g.OFICIO_NEGOCIO,S=K.nuevo(),M=60000,H=60*M,D=24*H,C={rol:'centralita',id:'marta'},T=id=>({rol:'tecnico',id}),CLI={rol:'cliente'};
 const FIRMA='M14 78C30 70 44 34 50 14 54 44 44 86 26 96M52 62C64 66 80 58 90 48 84 66 86 80 98 76 108 72 114 54 118 46 118 62 122 72 132 70 144 68 150 50 156 38 156 52 156 66 166 66 178 66 188 42 194 26';
 const fallos=[],cuenta={};
 const haz=(a,q,t)=>{if(t>ahora)return null;const r=K.aplicar(S,cfg,a,q,t);cuenta[a.tipo]=(cuenta[a.tipo]||0)+1;if(!r.ok){fallos.push({tipo:a.tipo,id:a.id||'',err:r.err,t});return null}return r};
 /* azar con semilla fija: la misma hora da los mismos datos */
 let sem=20261115;const az=()=>{sem=sem+0x6D2B79F5|0;let x=Math.imul(sem^sem>>>15,1|sem);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296};
 const elige=L=>L[Math.floor(az()*L.length)],entre=(a,b)=>a+Math.floor(az()*(b-a+1)),pesa=o=>{let r=az()*Object.values(o).reduce((a,b)=>a+b,0);for(const k in o){r-=o[k];if(r<0)return k}return Object.keys(o)[0]};
 /* fechas de Madrid */
 const hoy=K.madrid(ahora).date,sig=(d,n)=>{const p=d.split('-').map(Number);return new Date(Date.UTC(p[0],p[1]-1,p[2]+n)).toISOString().slice(0,10)};
 const at=(d,min)=>{const p=d.split('-').map(Number);let t=Date.UTC(p[0],p[1]-1,p[2])+min*M-60*M;if(K.madrid(t).min!==((min%1440)+1440)%1440)t-=60*M;return t};
 const lab=d=>K.laborable(cfg,d),sigLab=(d,n)=>{let x=d,k=0;while(k<n){x=sig(x,1);if(lab(x))k++}return x};
 /* la gente: un barrio de Barcelona por cliente; uno de cada cuatro avisos es de alguien que ya vino */
 const NOM=['Marta','Jordi','Núria','Pere','Laura','Xavier','Montse','Albert','Carme','Sergi','Anna','David','Rosa','Pau','Elena','Joan','Isabel','Marc','Teresa','Àlex','Mercè','Oriol','Pilar','Toni','Cristina','Javier','Lucía','Manuel','Sofía','Raúl','Glòria','Ramon'];
 const APE=['Puig','Soler','Vidal','Ferrer','Martí','Serra','Roca','Casas','Font','Sala','Pujol','Vila','Costa','Ortiz','García','López','Sánchez','Romero','Navarro','Torres','Ruiz','Molina','Castro','Rius','Bosch','Camps'];
 const CAL=['C/ de Mallorca','C/ d’Aragó','C/ de Provença','C/ del Consell de Cent','C/ de València','C/ de Balmes','C/ de Muntaner','C/ de Sants','C/ Gran de Gràcia','C/ de Verdi','Rambla del Poblenou','C/ de Pujades','Av. Meridiana','C/ de Sardenya','C/ de Còrsega','C/ de Calvet','C/ d’Entença','Pg. de Sant Joan','C/ de la Marina','C/ del Clot','Via Augusta','C/ de Llull','C/ de Badal','C/ de Sant Antoni Maria Claret'];
 const PIS=['1.º 1.ª','2.º 2.ª','3.º 1.ª','4.º 3.ª','bajos','entresuelo 2.ª','5.º 1.ª','ático','2.º 4.ª','6.º 2.ª'],CPS=Object.keys(cfg.zonas.cp);
 const gente=[],nuevoCli=()=>{const i=gente.length,c={nombre:elige(NOM),apellidos:elige(APE)+' '+elige(APE),tel:'6000'+String(10000+i*7),dir:elige(CAL)+' '+entre(2,320)+', '+elige(PIS),cp:elige(CPS)};gente.push(c);return c};
 const quien=()=>gente.length>20&&az()<.25?gente[entre(0,gente.length-1)]:nuevoCli();
 const disDe=c=>cfg.zonas.cp[c.cp];
 /* lo que pasa en cada avería: notas, líneas del presupuesto y cuánto se tarda */
 const AV={fuga:24,atasco:20,termo:12,cisterna:15,grifo:19,otra:10};
 const NOTA={fuga:['Sale agua por debajo del fregadero.','Gotea una tubería del baño.','Mancha de humedad en el techo del vecino.','Pierde agua la llave de paso.'],
  atasco:['El fregadero no traga.','La ducha se vacía muy lenta.','El váter se ha atascado.','Huele mal el desagüe de la cocina.'],
  termo:['El termo no calienta.','Sale agua fría desde ayer.','El termo gotea por abajo.'],cisterna:['La cisterna no para de cargar.','Pierde agua sin parar.','El pulsador no va.'],
  grifo:['Gotea el grifo de la cocina.','Quiero cambiar el grifo del lavabo.','El monomando está duro.'],otra:['Quiero cambiar la llave de paso.','Revisar la presión del agua.','Conectar una lavadora nueva.'],
  revision:['Revisión anual del contrato.']};
 const datosAv=av=>av===K.REV?NEG.mantenimiento.revision:NEG.averias.find(x=>x.id===av);
 const lineas=(av,urg)=>{const A=datosAv(av),L=A.ini.map(l=>Object.assign({},l));
  L.forEach(l=>{if(l.k==='mo'&&az()<.4)l.q=elige([1.5,2])});
  (A.chips||[]).forEach(k=>{if(k==='termo80'){if(az()<.1)L.push({k})}else if(az()<.22)L.push({k})});
  if(urg&&cfg.urge)L.push({k:cfg.urge});return L};
 const PAGO={tarjeta:40,bizum:25,efectivo:15,transferencia:8,pendiente:12};
 const tiempo=(A,max)=>{const e=K.durEst(cfg,A);return Math.max(15,Math.min(max,Math.round(e*(.8+.2*az()))))};
 const el=id=>S.avisos.find(a=>a.id===id);
 /* después del trabajo: el que paga después, la factura y, a veces, el contrato */
 let nf=412;const despues=(id,tec,tf)=>{const A=el(id);if(!A||A.e!=='hecho')return;
  /* el primer cliente de hace tres semanas contesta al seguimiento que no quiere más mensajes de esos: la oficina lo apunta */
  if(!A.sinTrabajo&&!S._baja){const df=K.madrid(tf).date;if(df>=sig(hoy,-24)&&df<=sig(hoy,-18)){S._baja=1;const tb=tf+7*1440*M+3*60*M;
   tareas.push([tb,()=>{const B=el(id);if(!B)return;const m=(B.msgs||[]).find(x=>x.k==='seguimiento'&&!x.env);if(m)m.env=tb-170*M;haz({tipo:'escribir',tel:B.cli.tel,si:false},C,tb)}])}}
  if(A.pago&&!A.pago.cobrado){const dc=entre(1,6),tc=at(sig(K.madrid(tf).date,dc),entre(600,1080));if(az()<.85)tareas.push([tc,()=>haz({tipo:'cobrar',id,modo:elige(['bizum','transferencia','tarjeta'])},C,tc)])}
  if(A.tot&&A.tot.total){const tq=at(sig(K.madrid(tf).date,entre(1,4)),entre(570,660));tareas.push([tq,()=>{{const df=K.madrid(tf).date;if(df>=sig(hoy,-12)&&df<=sig(hoy,-8)&&!S._dejada){S._dejada=1;return}}haz({tipo:'facturar',id,num:'2026-'+String(++nf).padStart(4,'0')},C,tq)}])}
  if(!A.sinTrabajo&&az()<(A.cita?.03:.04)){const c=A.cli;if(!(S.contratos||[]).some(x=>x.e==='activo'&&x.cli.tel===c.tel))
   haz({tipo:'contrato',plan:'anual',cli:{nombre:c.nombre,apellidos:c.apellidos,tel:c.tel,dir:c.dir,cp:c.cp},acepta:'firma',firma:FIRMA,modo:az()<.7?'tarjeta':'pendiente',aviso:id},T(tec),tf+2*M)}};
 /* un trabajo, de «voy» a «terminado»: llega a las «l» (minutos del día) y tiene hasta «tope» para acabar */
 const trabaja=(id,tec,d,l,v,tope,urg)=>{const A=el(id);if(!A)return;const tv=at(d,l-v),tl=at(d,l);
  if(!haz({tipo:'voy',id},T(tec),tv))return;
  const r=az();if(!urg&&r<.035){if(haz({tipo:'ausente',id},T(tec),tl+5*M))(el(id).msgs||[]).forEach(m=>{if(m.k==='ausente'&&!m.env)m.env=tl+7*M});const tm=at(sig(d,1),entre(600,700));tareas.push([tm,()=>{const B=el(id);if(!B||B.e!=='ausente')return;
    let dd=sigLab(K.madrid(tm).date,1);for(let k=0;k<6;k++,dd=sigLab(dd,1)){const f=K.franjasDe(S,cfg,dd,tm,id,B).filter(x=>x.okOf);if(f.length){haz({tipo:'mover',id,cita:{dia:dd,fr:elige(f).id},confirmado:true},C,tm);return}}}]);return}
  if(!urg&&r<.075){haz({tipo:'noacepta',id,modo:elige(['tarjeta','efectivo','bizum']),pres:{lineas:datosAv(A.av).ini}},T(tec),tl+12*M);despues(id,tec,tl+12*M);return}
  const te=tl+3*M,LP=lineas(A.av,urg);lleno(tec,LP,te-M);if(!haz({tipo:'empezar',id,pres:{lineas:LP,firma:FIRMA,pide:true}},T(tec),te))return;
  const B=el(id),dur=tiempo(B,Math.max(20,tope-l-4));
  if(az()<.05){const ta=te+Math.round(dur/3)*M,LA=[{k:elige(['latig','llave','sifon','tubo'])}];lleno(tec,LA,ta-M);haz({tipo:'ampliar',id,lineas:LA,firma:FIRMA,pide:true},T(tec),ta)}
  const tf=tl+dur*M;haz({tipo:'terminar',id,modo:pesa(PAGO),firma:FIRMA},T(tec),tf);despues(id,tec,tf)};
 /* quien lleva la cuenta de su furgoneta y va a usar algo que no tiene, lo compra de camino y lo apunta como cargado */
 const lleno=(tec,L,t)=>{const F=K.furgoDe(S,tec);if(!F)return;const C1={};L.forEach(l=>{const it=cfg.cat[l.k];if(!it||!it.mat)return;const n=Math.round(+l.q||1)+(C1[l.k]?C1[l.k].n:0);C1[l.k]={n}});
  const L2={};Object.keys(C1).forEach(k=>{const f=C1[k].n-(F.st[k]||0);if(f>0)L2[k]=f});if(Object.keys(L2).length)haz({tipo:'furgo',tec,carga:L2},T(tec),t)};
 /* las tareas que quedan para otro día (cobros, facturas, mover citas), en orden */
 const tareas=[],hazTareas=hasta=>{tareas.sort((a,b)=>a[0]-b[0]);while(tareas.length&&tareas[0][0]<=hasta){const x=tareas.shift();x[1]()}};
 /* una cita: el cliente la pide en la web o la oficina por teléfono, para uno de los próximos días con hueco */
 const pideCita=(t,c,av,porOf)=>{let d=sigLab(K.madrid(t).date,+pesa({1:24,2:22,3:17,4:12,5:10,6:8,7:7}));const X={av,cli:{dis:disDe(c)}};
  for(let k=0;k<7;k++,d=sigLab(d,1)){const f=K.franjasDe(S,cfg,d,t,null,X).filter(x=>porOf?x.okOf:x.ok);if(f.length){
   const r=haz(Object.assign({tipo:'pedir',av,cli:c,nota:elige(NOTA[av]),cita:{dia:d,fr:elige(f).id}},porOf?{origen:'llamada'}:{origen:'cita'}),porOf?C:CLI,t);return r&&r.id}}return null};
 /* la oficina reparte a última hora de la tarde las citas del día siguiente; las que no tienen sitio se quedan sin técnico */
 const reparte=(d,t)=>{const R=K.repartoDia(S,cfg,d);R.S.avisos.forEach((x,i)=>{const A=el(x.id);if(A&&!A.tec&&x.tec&&A.t<=t&&['nuevo','ausente'].includes(A.e))haz({tipo:'asignar',id:A.id,tec:x.tec},C,t+i*M)})};
 /* lo que a primera hora sigue sin técnico: la oficina llama y la pasa a otro día */
 const recoloca=(d,t)=>{S.avisos.filter(A=>A.cita&&A.cita.dia===d&&!A.tec&&A.e==='nuevo'&&A.t<=t).forEach(A=>{let dd=sigLab(d,1);
  for(let k=0;k<6;k++,dd=sigLab(dd,1)){const f=K.franjasDe(S,cfg,dd,t,A.id,A).filter(x=>x.okOf);if(f.length){haz({tipo:'mover',id:A.id,cita:{dia:dd,fr:f[0].id},confirmado:true},C,t);return}}
  haz({tipo:'cancelar',id:A.id,motivo:'Sin hueco: se le llama'},C,t)})};
 /* los contratos que ya traía el negocio: altas de hace meses, uno a punto de renovar */
 const inicio=sig(hoy,-63);
 [350,340,300,250,200,170,120,95,80].forEach(dias=>{const c=nuevoCli();haz({tipo:'contrato',plan:'anual',cli:c,acepta:'firma',firma:FIRMA,modo:'tarjeta'},C,at(sig(hoy,-dias),entre(600,1100)))});
 /* la furgoneta (16-11-2026): Omar lleva la cuenta desde la segunda semana; Laia y Jordi, no. La tarde antes carga lo que le
    falta para mañana y, los lunes y los jueves, repone; a las cuatro y a las siete semanas la cuenta (y siempre hay alguna
    diferencia). Lo que usa se descuenta solo al terminar cada trabajo. La última semana no repone: hoy hay algo por reponer.
    Tiene su propio azar, para no cambiar nada de lo demás */
 let semF=20261116;const azF=()=>{semF=semF+0x6D2B79F5|0;let x=Math.imul(semF^semF>>>15,1|semF);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296};
 const entreF=(a,b)=>a+Math.floor(azF()*(b-a+1)),cuentaF=[sig(inicio,28),sig(inicio,49)];
 const furgoneta=(d,L)=>{
  if(d===sig(inicio,7)){const tk=at(d,1150),kit=K.kitDe(cfg,'omar'),L0={};Object.keys(kit).forEach(k=>{L0[k]=entreF(kit[k][0],kit[k][1])});
   if(haz({tipo:'furgo',tec:'omar',llevar:true},T('omar'),tk))haz({tipo:'furgo',tec:'omar',cuenta:L0},T('omar'),tk+3*M);return}
  const F=K.furgoDe(S,'omar');if(!F||!L||d>=hoy)return;
  const tk=at(d,1145),c=K.cargaDe(S,cfg,'omar',sigLab(d,1),tk),L1={},dw=new Date(d+'T12:00:00Z').getUTCDay();
  c.falta.forEach(x=>{if(!x.quiza||azF()<.5)L1[x.k]=x.q});
  /* repone los lunes y los jueves; las dos últimas semanas el almacén va corto y solo llega a pasar del mínimo */
  if((dw===1||dw===4)&&d<sig(hoy,-6))c.reponer.forEach(x=>{L1[x.k]=Math.max(L1[x.k]||0,d<sig(hoy,-14)?x.q:x.min+1-x.hay)});
  if(Object.keys(L1).length)haz({tipo:'furgo',tec:'omar',carga:L1},T('omar'),tk);
  if(cuentaF.length&&d>=cuentaF[0]){cuentaF.shift();const L2={},ks=Object.keys(F.st);ks.forEach(k=>{L2[k]=F.st[k]});
   if(ks.length){const k=ks[Math.floor(azF()*ks.length)];L2[k]=Math.max(0,L2[k]+(azF()<.7?-1:1));haz({tipo:'furgo',tec:'omar',cuenta:L2},T('omar'),tk+20*M)}}};
 /* ---------- día a día ---------- */
 const tecs=Object.keys(cfg.tec);
 for(let d=inicio;d<=hoy;d=sig(d,1)){const L=lab(d),t0=at(d,0);hazTareas(t0+7*H);
  /* las ausencias: Jordi, tres días de vacaciones dentro de tres semanas; Laia, al médico el próximo día de trabajo */
  if(d===sig(inicio,14)){const dj=sigLab(sig(inicio,21),1);haz({tipo:'ausencia',tec:'jordi',de:dj,a:sigLab(dj,2),motivo:'Vacaciones'},C,at(d,560))}
  if(d===hoy)haz({tipo:'ausencia',tec:'laia',de:sigLab(hoy,1),a:sigLab(hoy,1),motivo:'Médico'},C,Math.min(ahora-30*M,at(d,560)));
  /* lo que se trabaja hoy: el plan de cada técnico, y las urgencias en sus huecos */
  if(L){hazTareas(t0+7*H+45*M);reparte(d,at(d,465));recoloca(d,at(d,470));
   tecs.forEach(tec=>{if(K.ausente(S,tec,d))return;
    const P=K.agendaDe(S,cfg,tec,d).filter(x=>{const A=el(x.id);return A&&A.e==='asignado'});
    const lib=K.libresDe(cfg,tec,d,P,0).libres,urg=[];
    lib.forEach(g=>{if(g.a-g.de>=120&&az()<.55){const c=quien(),av=pesa(AV),v=K.etaMin(cfg,disDe(c)),d0=g.de+entre(0,20);if(d0+v+60<g.a)urg.push({d0,c,av,v,tope:g.a-5})}});
    const ev=P.map(x=>({l:x.llega,f:()=>trabaja(x.id,tec,d,x.llega,x.viaje,x.acaba,false)})).concat(urg.map(u=>({l:u.d0,f:()=>{
     const tp=at(d,u.d0),r=haz({tipo:'pedir',av:u.av,cli:u.c,nota:elige(NOTA[u.av]),origen:elige(['llamada','llamada','whatsapp'])},C,tp);if(!r)return;
     if(haz({tipo:'asignar',id:r.id,tec},C,tp+2*M))trabaja(r.id,tec,d,u.d0+3+u.v,u.v,u.tope,true)}})));
    ev.sort((a,b)=>a.l-b.l).forEach(e=>e.f())});
  }else if(az()<.6){/* fin de semana o festivo: una urgencia para el de guardia */
   const c=quien(),av=elige(['fuga','atasco','fuga','termo']),m=entre(600,1260),tp=at(d,m),r=haz({tipo:'pedir',av,cli:c,nota:elige(NOTA[av]),origen:'llamada'},C,tp);
   if(r){const u=K.urgenciaAhora(S,cfg,disDe(c),tp,av);if(u&&haz({tipo:'asignar',id:r.id,tec:u.tec},C,tp+2*M)){const v=K.etaMin(cfg,disDe(c));trabaja(r.id,u.tec,d,m+3+v,v,m+3+v+150,true)}}}
  /* las citas que se piden hoy, para los próximos días: unas en la web y otras por teléfono */
  for(let k=0,n=L?entre(5,8):entre(1,3);k<n;k++){const t=at(d,entre(510,1290)),c=quien(),av=pesa(AV);const id=pideCita(t,c,av,az()<.4);
   if(id&&az()<.03){const tc=t+entre(5,30)*H;tareas.push([tc,()=>{const A=el(id);if(A&&['nuevo','asignado'].includes(A.e)&&A.cita.dia>K.madrid(tc).date)haz({tipo:'cancelar',id,motivo:'Lo ha arreglado un familiar'},C,tc)}])}}
  /* las revisiones de los contratos: la oficina las ve un mes antes de que toquen y llama a los que tocan en los próximos diez días */
  if(L&&az()<.12){const X=K.pendientesContratos(S,cfg,at(d,600)).revision.filter(r=>r.toca<=sig(d,10)).map(r=>S.contratos.find(c=>c.id===r.id)).filter(Boolean);if(X.length){const x=X[0],t=at(d,entre(600,780));pideCita(t,{nombre:x.cli.nombre,apellidos:x.cli.apellidos,tel:x.cli.tel,dir:x.cli.dir,cp:x.cli.cp},K.REV,true)}}
  if(L&&d<hoy)reparte(sigLab(d,1),at(d,1110));
  furgoneta(d,L);
  if(d<hoy)hazTareas(t0+24*H-M);
 }
 hazTareas(ahora);
 /* hoy: la urgencia que acaba de entrar, y el material que le falta a una cita de mañana */
 {const n=K.madrid(ahora);
  /* si ahora nadie está en un trabajo, el que lleva un rato libre está con un grifo desde hace unos minutos */
  if(lab(hoy)&&n.min>=540&&n.min<=1110&&!S.avisos.some(A=>A.e==='curso')){const tp=ahora-50*M;
   const libre=tecs.find(tec=>!K.ausente(S,tec,hoy)&&K.trabaja(cfg,tec,hoy,n.min-50,n.min+40)&&!S.avisos.some(A=>A.tec===tec&&(A.e==='camino'||A.e==='curso'||(A.fin&&A.fin>tp)||(A.e==='asignado'&&A.cita&&A.cita.dia===hoy&&(()=>{const x=K.agendaDe(S,cfg,tec,hoy,ahora).find(y=>y.id===A.id);return x&&x.llega-x.viaje<n.min+40})()))));
   if(libre){const c=quien(),v=K.etaMin(cfg,disDe(c)),r=haz({tipo:'pedir',av:'grifo',cli:c,nota:'Gotea el grifo de la cocina.',origen:'llamada'},C,tp);
    if(r&&haz({tipo:'asignar',id:r.id,tec:libre},C,tp+M)&&haz({tipo:'voy',id:r.id},T(libre),tp+2*M))haz({tipo:'empezar',id:r.id,pres:{lineas:[{k:'grifo'},{k:'latig'},{k:cfg.urge}],firma:FIRMA,pide:true}},T(libre),Math.min(ahora-2*M,tp+(5+v)*M))}}
  if(lab(hoy)&&n.min>=510&&n.min<=1170){const c=quien();haz({tipo:'pedir',av:'fuga',cli:c,nota:'Sale agua por debajo del fregadero. He cerrado la llave de paso.',origen:'llamada'},C,ahora-6*M)}
  const pr=S.avisos.filter(a=>a.cita&&a.cita.dia>=hoy&&['nuevo','asignado'].includes(a.e)).sort((a,b)=>(b.tec?1:0)-(a.tec?1:0)||(a.cita.dia<b.cita.dia?-1:a.cita.dia>b.cita.dia?1:0));
  if(pr[0])haz({tipo:'falta',id:pr[0].id,k:'latig'},C,ahora-20*M);
  if(n.min>=1110)reparte(sigLab(hoy,1),Math.min(ahora-5*M,at(hoy,1110)))}
 /* los mensajes ya mandados: todos los de hace más de media hora */
 /* el seguimiento (reseña, a la semana, presupuesto): el de hoy, por mandar; el de antes, mandado, y alguno dejado porque no hacía falta */
 const hoy0=at(hoy,0);
 S.avisos.forEach(A=>(A.msgs||[]).forEach(m=>{if(m.env||m.t>=ahora-30*M)return;
  if(K.SEGUIR.includes(m.k)){if(m.t>=hoy0)return;m.env=m.t+(m.k==='resena'?20:95)*M;if(A.n%6===0)m.no=1;return}
  m.env=m.t+M}));
 delete S._dejada;delete S._baja;S.v=1;if(info){info.fallos=fallos;info.cuenta=cuenta}return S};
})(typeof globalThis!=='undefined'?globalThis:this);
