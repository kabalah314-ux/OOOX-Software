/* ============================================================
   NEGOCIO DE PRUEBA · Voltio Sur (electricistas inventados, València).
   No es un cliente: existe para comprobar que la app se adapta a otro
   negocio cambiando SOLO este archivo. Está hecho distinto a propósito:
   otro oficio, otra ciudad, serie de dos letras, dos técnicos, zonas con
   otros nombres, franjas a y media, un hueco por franja, otro horario,
   otro recargo, otra garantía, mano de obra por medias horas, cada técnico
   con su horario y sin avisos de muestra (arranca vacío, como un negocio
   de verdad).
   Los festivos son de ejemplo, no una lista oficial.
   ============================================================ */
(function(g){
'use strict';
g.OFICIO_NEGOCIO={
 id:'voltio',serie:'VS',nombre:'Voltio Sur',marca:['Voltio','Sur'],razon:'Voltio Sur Instalaciones, S. L.',nif:'B00000001',dir:'Taller en Russafa, València',ciudad:'València',tel:'960 00 00 00',
 resenas:'g.page/r/voltio-sur-prueba/review',
 pack:'pro',garantiaMeses:6,sinTrabajo:'visita',
 /* tarifa normal de 9 a 19 h en días laborables; el resto, urgencia con un 50 % más */
 tarifa:{dia:[540,1140],recargo:.5},
 festivos:['2026-01-01','2026-01-06','2026-01-22','2026-03-19','2026-04-03','2026-04-06','2026-05-01','2026-06-24','2026-08-15','2026-10-09','2026-10-12','2026-12-08','2026-12-25',
  '2027-01-01','2027-01-06','2027-01-22','2027-03-19','2027-03-26','2027-03-29','2027-05-01','2027-06-24','2027-08-16','2027-10-09','2027-10-12','2027-11-01','2027-12-06','2027-12-08','2027-12-25'],
 /* horarios: Inés, de lunes a viernes, mañana y tarde; Pau, de lunes a jueves solo por la mañana, y es quien hace las guardias.
    Cada uno lleva una cita por franja y no se guarda a nadie para urgencias. */
 citas:{porFranja:1,reserva:0},
 tecnicos:[
  {id:'ines',n:'Inés',ap:'Marqués',tono:30,jefe:1,horario:{1:[[510,810],[930,1080]],2:[[510,810],[930,1080]],3:[[510,810],[930,1080]],4:[[510,810],[930,1080]],5:[[510,810],[930,1080]]}},
  {id:'pau',n:'Pau',ap:'Ferri',tono:210,guardia:1,horario:{1:[[510,810]],2:[[510,810]],3:[[510,810]],4:[[510,810]]}}],
 zonas:{banda:{cerca:20,lejos:45},
  dis:{cv:['Ciutat Vella','cerca','Ciutat Vella'],ex:['L’Eixample','cerca','L’Eixample'],em:['Extramurs','cerca','Extramurs'],ca:['Campanar','lejos','Campanar'],pm:['Poblats Marítims','lejos','Poblats Marítims']},
  cp:{'46001':'cv','46002':'cv','46003':'cv','46004':'ex','46005':'ex','46006':'ex','46007':'em','46008':'em','46009':'ca','46015':'ca','46011':'pm','46024':'pm'}},
 /* franjas a y media; cuántas citas caben en cada una sale de los horarios de arriba */
 franjas:[{id:'m1',de:510,a:660},{id:'m2',de:660,a:810},{id:'t1',de:930,a:1080}],
 catalogo:{
  visita:{t:'Visita y diagnóstico',p10:35,u:1},
  horas:{t:'Mano de obra',p10:42,u:1,un:'h',min:.5,paso:.5},
  enchufe:{t:'Cambio de enchufe o interruptor, con visita',p10:48,u:1},
  lampara:{t:'Instalar una lámpara, con visita',p10:55,u:1},
  diferencial:{t:'Interruptor diferencial',p10:46,mat:1},
  magneto:{t:'Magnetotérmico',p10:14,mat:1},
  mecanismo:{t:'Mecanismo de enchufe',p10:9,mat:1},
  cable:{t:'Cable, tramo hasta 5 m',p10:12,mat:1},
  caja:{t:'Caja de empalmes',p10:6,mat:1},
  regleta:{t:'Regletas y bornes',p10:5,mat:1},
  cuadro:{t:'Cuadro eléctrico de 12 módulos, instalado',p21:290,mat:1}},
 averias:[
  {id:'salta',n:'Salta el diferencial',c:'Diferencial',d:'Se va la luz de toda la casa.',min:[{k:'visita'},{k:'horas',q:.5}],max:[{k:'visita'},{k:'horas',q:2},{k:'diferencial'}],ini:[{k:'visita'},{k:'horas',q:1}],chips:['diferencial','magneto','cable','cuadro']},
  {id:'sinluz',n:'Sin luz en una zona',c:'Sin luz',d:'Una habitación o varios enchufes.',min:[{k:'visita'},{k:'horas',q:.5}],max:[{k:'visita'},{k:'horas',q:1.5},{k:'magneto'},{k:'cable'}],ini:[{k:'visita'},{k:'horas',q:.5}],chips:['magneto','cable','caja','regleta']},
  {id:'enchufe',n:'Enchufe o interruptor',c:'Enchufe',d:'Suelto, quemado o que no funciona.',min:[{k:'enchufe'}],max:[{k:'enchufe'},{k:'mecanismo'},{k:'caja'}],ini:[{k:'enchufe'}],chips:['mecanismo','caja','cable']},
  {id:'lampara',n:'Instalar una lámpara',c:'Lámpara',d:'Colgar y conectar una lámpara o un plafón.',min:[{k:'lampara'}],max:[{k:'lampara'},{k:'regleta'},{k:'cable'}],ini:[{k:'lampara'}],chips:['regleta','cable']},
  {id:'otra',n:'Otra avería',c:'Otra',d:'Cuéntanos qué pasa.',min:[{k:'visita'},{k:'horas',q:.5}],max:null,ini:[{k:'visita'},{k:'horas',q:.5}],chips:['magneto','mecanismo','cable','caja','regleta']}]
};
})(typeof globalThis!=='undefined'?globalThis:this);
