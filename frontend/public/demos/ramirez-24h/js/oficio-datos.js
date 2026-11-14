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
 id:'ramirez',serie:'R',nombre:'Ramírez 24 h',marca:['Ramírez','24 h'],razon:'Ramírez Fontaneros, S. L.',nif:'B00000000',dir:'Taller en Sants, Barcelona',ciudad:'Barcelona',tel:'930 00 00 00',
 resenas:'g.page/r/ramirez24h-demo/review',
 pack:'pro',garantiaMeses:12,sinTrabajo:'desp',
 /* tarifa normal de 8 a 20 h en días laborables; el resto, urgencia */
 tarifa:{dia:[480,1200],recargo:.4},
 festivos:['2026-01-01','2026-01-06','2026-04-03','2026-04-06','2026-05-01','2026-05-25','2026-06-24','2026-08-15','2026-09-11','2026-09-24','2026-10-12','2026-11-01','2026-12-06','2026-12-08','2026-12-25','2026-12-26','2027-01-01','2027-01-06','2027-03-26','2027-03-29','2027-05-01','2027-05-17','2027-06-24','2027-09-11','2027-09-24','2027-10-12','2027-11-01','2027-12-06','2027-12-08','2027-12-25'],
 /* horarios y turnos, con valores de prueba (cada negocio pone los suyos):
    Omar y Laia, de lunes a viernes, de 8 a 14 y de 15 a 20. Jordi, de 8 a 14 y de 15 a 18: la última franja no la hace.
    Los tres hacen guardias, porque el servicio es de 24 horas. Cada técnico lleva una cita por franja y, de las que caben,
    una no se ofrece al cliente: se guarda para urgencias y solo la puede usar la oficina. */
 citas:{porFranja:1,reserva:1},
 tecnicos:[
  {id:'omar',n:'Omar',ap:'Benali',tono:205,guardia:1,horario:{1:[[480,840],[900,1200]],2:[[480,840],[900,1200]],3:[[480,840],[900,1200]],4:[[480,840],[900,1200]],5:[[480,840],[900,1200]]}},
  {id:'laia',n:'Laia',ap:'Ferrer',tono:340,guardia:1,horario:{1:[[480,840],[900,1200]],2:[[480,840],[900,1200]],3:[[480,840],[900,1200]],4:[[480,840],[900,1200]],5:[[480,840],[900,1200]]}},
  {id:'jordi',n:'Jordi',ap:'Ramírez',tono:95,jefe:1,guardia:1,horario:{1:[[480,840],[900,1080]],2:[[480,840],[900,1080]],3:[[480,840],[900,1080]],4:[[480,840],[900,1080]],5:[[480,840],[900,1080]]}}],
 zonas:{banda:{a:25,b:35,c:40},dis:{cve:['Ciutat Vella','a','Ciutat Vella'],eix:['Eixample','a','Eixample'],stm:['Sants-Montjuïc','a','Sants-Montjuïc'],cor:['Les Corts','a','Les Corts'],sar:['Sarrià-Sant Gervasi','c','Sarrià-St. Gervasi'],gra:['Gràcia','b','Gràcia'],hor:['Horta-Guinardó','c','Horta-Guinardó'],nou:['Nou Barris','c','Nou Barris'],and:['Sant Andreu','c','Sant Andreu'],smt:['Sant Martí','b','Sant Martí']},cp:{'08001':'cve','08002':'cve','08003':'cve','08039':'cve','08007':'eix','08008':'eix','08009':'eix','08010':'eix','08011':'eix','08013':'eix','08015':'eix','08029':'eix','08036':'eix','08037':'eix','08004':'stm','08014':'stm','08038':'stm','08040':'stm','08028':'cor','08034':'cor','08006':'sar','08017':'sar','08021':'sar','08022':'sar','08012':'gra','08023':'gra','08024':'gra','08025':'gra','08032':'hor','08035':'hor','08041':'hor','08016':'nou','08031':'nou','08033':'nou','08042':'nou','08027':'and','08030':'and','08005':'smt','08018':'smt','08019':'smt','08020':'smt','08026':'smt'}},
 /* el mapa: con esto puesto, el técnico comparte su posición con el cliente desde «Voy» hasta que llega, y el cliente la ve
    sobre el mapa de «teselas». Sin «mapa», no se comparte nada. El servidor gratuito de OpenStreetMap vale para una demo;
    un negocio en marcha necesita un proveedor de mapas o un servidor propio (lo dice su política de uso). */
 mapa:{teselas:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',firma:'© OpenStreetMap',firmaUrl:'https://www.openstreetmap.org/copyright'},
 /* citas sin prisa: las franjas de los días laborables. Cuántas caben en cada una sale de los horarios de arriba */
 franjas:[{id:'f1',de:480,a:660},{id:'f2',de:660,a:840},{id:'f3',de:900,a:1080},{id:'f4',de:1080,a:1200}],
 /* el catálogo. u: lleva el recargo de urgencia · mat: es material · un: 'h' se cuenta por horas */
 catalogo:{
  desp:{t:'Desplazamiento en Barcelona',p10:30,u:1},
  mo:{t:'Mano de obra',p10:45,u:1,un:'h',min:1,paso:.25},
  desatasco:{t:'Desatasco manual, con desplazamiento',p10:65,u:1},
  maquina:{t:'Máquina desatascadora',p10:55,u:1},
  cisterna:{t:'Ajuste o cambio de mecanismo, con desplazamiento',p10:55,u:1},
  grifo:{t:'Cambio o reparación de grifo, con desplazamiento',p10:50,u:1},
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
  termo80:{t:'Termo eléctrico de 80 litros, instalado',p21:390,mat:1}},
 /* las averías: min y max dan el «de cuánto a cuánto» de la web; ini es el presupuesto que sale ya puesto en la puerta */
 averias:[
  {id:'fuga',n:'Fuga de agua',c:'Fuga',d:'Tubería, llave de paso o latiguillo.',min:[{k:'desp'},{k:'mo',q:1}],max:[{k:'desp'},{k:'mo',q:2},{k:'juntas'},{k:'sellador'}],ini:[{k:'desp'},{k:'mo',q:1},{k:'juntas'}],chips:['sellador','latig','llave','tubo']},
  {id:'atasco',n:'Atasco',c:'Atasco',d:'Fregadero, lavabo, ducha o inodoro.',min:[{k:'desatasco'}],max:[{k:'desatasco'},{k:'maquina'}],ini:[{k:'desatasco'}],chips:['maquina','sifon']},
  {id:'termo',n:'Sin agua caliente',c:'Termo',d:'Termo eléctrico que no calienta o pierde.',min:[{k:'desp'},{k:'mo',q:1},{k:'valvula'}],max:[{k:'desp'},{k:'mo',q:2},{k:'resistencia'},{k:'termostato'}],ini:[{k:'desp'},{k:'mo',q:1}],chips:['valvula','termostato','resistencia','termo80']},
  {id:'cisterna',n:'Cisterna que pierde',c:'Cisterna',d:'No para de correr el agua o no carga.',min:[{k:'cisterna'}],max:[{k:'cisterna'},{k:'mecanismo'}],ini:[{k:'cisterna'}],chips:['mecanismo','latig','llave']},
  {id:'grifo',n:'Grifo que gotea',c:'Grifo',d:'Gotea, está duro o hay que cambiarlo.',min:[{k:'grifo'}],max:[{k:'grifo'},{k:'latig'},{k:'llave'}],ini:[{k:'grifo'}],chips:['latig','llave','grifon']},
  {id:'otra',n:'Otra avería',c:'Otra',d:'Cuéntanos qué pasa.',min:[{k:'desp'},{k:'mo',q:1}],max:null,ini:[{k:'desp'},{k:'mo',q:1}],chips:['juntas','sellador','latig','llave','sifon','tubo']}]
};

/* ---------- los avisos de muestra de la demo, siempre recientes ---------- */
const FIRMA='M14 78C30 70 44 34 50 14 54 44 44 86 26 96M52 62C64 66 80 58 90 48 84 66 86 80 98 76 108 72 114 54 118 46 118 62 122 72 132 70 144 68 150 50 156 38 156 52 156 66 166 66 178 66 188 42 194 26';
g.OFICIO_MUESTRA=function(K,cfg,ahora){
 const S=K.nuevo(),M=60000,H=3600000,D=86400000,C={rol:'centralita',id:'marta'},T=id=>({rol:'tecnico',id});
 const haz=(a,q,t)=>{const r=K.aplicar(S,cfg,a,q,t);if(!r.ok)throw new Error('muestra: '+a.tipo+' → '+r.err);return r};
 const pide=(t,av,cli,mas)=>haz(Object.assign({tipo:'pedir',av,cli},mas),{rol:'cliente'},t).id;
 /* un trabajo completo: pedir, asignar, ir, firmar el precio, terminar */
 const completo=(t,av,cli,tec,lineas,modo,min,nota)=>{const id=pide(t,av,cli,{origen:'llamada',nota});
  haz({tipo:'asignar',id,tec},C,t+4*M);haz({tipo:'voy',id},T(tec),t+9*M);
  haz({tipo:'empezar',id,pres:{lineas,firma:FIRMA}},T(tec),t+38*M);haz({tipo:'terminar',id,modo,firma:FIRMA},T(tec),t+(38+min)*M);
  S.avisos.find(a=>a.id===id).msgs.forEach(m=>{if(m.k==='hecho'||m.k==='recibido'||m.k==='camino'||(m.k==='resena'&&m.t<ahora))m.env=m.t});return id};
 const elvira={nombre:'Elvira',apellidos:'Casas',tel:'600 00 01 12',dir:'C/ Aragó 214, 4.º 2.ª',cp:'08011'};

 /* hace siete meses: la cisterna de Elvira. Sigue en garantía */
 S.n=97;
 completo(ahora-212*D,'cisterna',elvira,'jordi',[{k:'cisterna'},{k:'mecanismo'}],'tarjeta',35,'Pierde agua sin parar.');
 /* ayer: un termo, por transferencia. Queda por cobrar */
 S.n=138;
 completo(ahora-26*H,'termo',{nombre:'Andreu',apellidos:'Soler',tel:'600 00 01 39',dir:'C/ de Sants 131, 1.º 3.ª',cp:'08014'},'jordi',[{k:'desp'},{k:'mo',q:1.5},{k:'termostato'}],'pendiente',85,'El termo no calienta desde ayer.');
 /* hoy: un atasco ya hecho y cobrado con tarjeta */
 completo(ahora-190*M,'atasco',{nombre:'Carmen',apellidos:'Ortiz',tel:'600 00 01 40',dir:'C/ Mallorca 310, 3.º 1.ª',cp:'08037'},'omar',[{k:'desatasco'}],'tarjeta',40,'El fregadero no traga.');
 /* ahora mismo: Laia está con un grifo */
 {const t=ahora-52*M,id=pide(t,'grifo',{nombre:'Núria',apellidos:'Puig',tel:'600 00 01 41',dir:'Rambla del Poblenou 62, 3.º 2.ª',cp:'08005'},{origen:'llamada',nota:'Gotea el grifo de la cocina.'});
  haz({tipo:'asignar',id,tec:'laia'},C,t+3*M);haz({tipo:'voy',id},T('laia'),t+6*M);haz({tipo:'empezar',id,pres:{lineas:[{k:'grifo'},{k:'latig'}],firma:FIRMA}},T('laia'),t+34*M);
  S.avisos.find(a=>a.id===id).msgs.forEach(m=>{m.env=m.t})}
 /* una cita para el próximo día laborable: la cisterna de Elvira otra vez */
 {const dias=K.diasDe(S,cfg,ahora-3*H,3),d=dias.find(x=>!x.hoy)||dias[0],fr=d.franjas.find(f=>f.ok&&f.id==='f2')||d.franjas.find(f=>f.ok);
  pide(ahora-3*H,'cisterna',elvira,{origen:'cita',cita:{dia:d.dia,fr:fr.id},nota:'Vuelve a perder un poco de agua.'})}
 /* y la urgencia que acaba de entrar: una fuga en Gràcia */
 pide(ahora-6*M,'fuga',{nombre:'Montse',apellidos:'Vila',tel:'600 00 01 43',dir:'C/ Verdi 28, 2.º 1.ª',cp:'08012'},{origen:'llamada',nota:'Sale agua por debajo del fregadero. He cerrado la llave de paso.'});
 S.v=1;return S};
})(typeof globalThis!=='undefined'?globalThis:this);
