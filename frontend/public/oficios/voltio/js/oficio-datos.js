/* ============================================================
   ARCHIVO PÚBLICO de los datos de Voltio Sur (voltio). Lo baja cualquiera que abra la cita: del equipo lleva solo
   el nombre, la inicial del apellido y el color. Lo demás del equipo (apellidos, horarios, quién es el jefe o hace
   guardias) está en el servidor, que se lo da a la app al entrar, y en el archivo de sus datos completos, que no va
   nunca al repositorio. No se cambia a mano: se cambian los datos completos y se rehace con
     node copias.mjs publica voltio --datos <sus datos completos>
   ============================================================ */
(function(g){
'use strict';
g.OFICIO_NEGOCIO={
 id:"voltio",
 publico:true,
 serie:"VS",
 nombre:"Voltio Sur",
 marca:["Voltio","Sur"],
 razon:"Voltio Sur Instalaciones, S. L.",
 nif:"B00000001",
 dir:"Taller en Russafa, València",
 ciudad:"València",
 tel:"960 00 00 00",
 resenas:"g.page/r/voltio-sur-prueba/review",
 pack:"pro",
 prueba:true,
 garantiaMeses:6,
 sinTrabajo:"visita",
 servidor:{"url":"https://hquvlfujruskpgnkmnfl.supabase.co","llave":"sb_publishable_XZG_z_f0ya0f-7esYS8zrw_OOI35qpf"},
 tarifa:{"dia":[540,1140],"recargo":0.5,"urgente":"urge"},
 festivos:["2026-01-01","2026-01-06","2026-01-22","2026-03-19","2026-04-03","2026-04-06","2026-05-01","2026-06-24","2026-08-15","2026-10-09","2026-10-12","2026-12-08","2026-12-25","2027-01-01","2027-01-06","2027-01-22","2027-03-19","2027-03-26","2027-03-29","2027-05-01","2027-06-24","2027-08-16","2027-10-09","2027-10-12","2027-11-01","2027-12-06","2027-12-08","2027-12-25"],
 citas:{"porFranja":3,"reserva":0,"porTiempo":true},
 tecnicos:[{"id":"ines","n":"Inés","ap":"M.","tono":30},{"id":"pau","n":"Pau","ap":"F.","tono":210}],
 zonas:{
  banda:{"cerca":20,"lejos":45},
  dis:{"cv":["Ciutat Vella","cerca","Ciutat Vella"],"ex":["L’Eixample","cerca","L’Eixample"],"em":["Extramurs","cerca","Extramurs"],"ca":["Campanar","lejos","Campanar"],"pm":["Poblats Marítims","lejos","Poblats Marítims"]},
  cp:{"46001":"cv","46002":"cv","46003":"cv","46004":"ex","46005":"ex","46006":"ex","46007":"em","46008":"em","46009":"ca","46011":"pm","46015":"ca","46024":"pm"}},
 franjas:[{"id":"m1","de":510,"a":660},{"id":"m2","de":660,"a":810},{"id":"t1","de":930,"a":1080}],
 catalogo:{
  visita:{"t":"Visita y diagnóstico","p10":35,"u":1},
  urge:{"t":"Servicio urgente: salimos en el momento","p10":25},
  horas:{"t":"Mano de obra","p10":42,"u":1,"un":"h","min":0.5,"paso":0.5},
  enchufe:{"t":"Cambio de enchufe o interruptor, con visita","p10":48,"u":1,"base":"ele-mecanismo","dur":[15,30]},
  lampara:{"t":"Instalar una lámpara, con visita","p10":55,"u":1,"base":"ele-lampara","dur":[30,60]},
  diferencial:{"t":"Interruptor diferencial","p10":46,"mat":1},
  magneto:{"t":"Magnetotérmico","p10":14,"mat":1},
  mecanismo:{"t":"Mecanismo de enchufe","p10":9,"mat":1},
  cable:{"t":"Cable, tramo hasta 5 m","p10":12,"mat":1},
  caja:{"t":"Caja de empalmes","p10":6,"mat":1},
  regleta:{"t":"Regletas y bornes","p10":5,"mat":1},
  cuadro:{"t":"Cuadro eléctrico de 12 módulos, instalado","p21":290,"mat":1,"base":"ele-cuadro","dur":[180,360]},
  revinst:{"t":"Revisión de la instalación eléctrica","p21":40,"base":"ele-revision","dur":[40,75]}},
 furgoneta:{"diferencial":[1,2],"magneto":[2,4],"mecanismo":[4,10],"cable":[2,5],"caja":[3,8],"regleta":[4,10]},
 averias:[
  {"id":"salta","n":"Salta el diferencial","c":"Diferencial","d":"Se va la luz de toda la casa.","mientras":"Desenchufa los aparatos que estaban funcionando y prueba a subir el diferencial una vez. Si vuelve a saltar, déjalo bajado hasta que llegue el técnico.","min":[{"k":"visita"},{"k":"horas","q":0.5}],"max":[{"k":"visita"},{"k":"horas","q":2},{"k":"diferencial"}],"dur":[30,90],"ini":[{"k":"visita"},{"k":"horas","q":1}],"chips":["diferencial","magneto","cable","cuadro"]},
  {"id":"sinluz","n":"Sin luz en una zona","c":"Sin luz","d":"Una habitación o varios enchufes.","mientras":"Mira en el cuadro de la luz si hay algún interruptor bajado. Si huele a quemado o ves humo, baja el interruptor general y no toques nada.","min":[{"k":"visita"},{"k":"horas","q":0.5}],"max":[{"k":"visita"},{"k":"horas","q":1.5},{"k":"magneto"},{"k":"cable"}],"dur":[30,90],"ini":[{"k":"visita"},{"k":"horas","q":0.5}],"chips":["magneto","cable","caja","regleta"]},
  {"id":"enchufe","n":"Enchufe o interruptor","c":"Enchufe","d":"Suelto, quemado o que no funciona.","mientras":"No uses ese enchufe ni ese interruptor. Si está caliente, huele a quemado o hace chispas, baja su interruptor en el cuadro de la luz.","min":[{"k":"enchufe"}],"max":[{"k":"enchufe"},{"k":"mecanismo"},{"k":"caja"}],"dur":[20,45],"ini":[{"k":"enchufe"}],"chips":["mecanismo","caja","cable"]},
  {"id":"lampara","n":"Instalar una lámpara","c":"Lámpara","d":"Colgar y conectar una lámpara o un plafón.","min":[{"k":"lampara"}],"max":[{"k":"lampara"},{"k":"regleta"},{"k":"cable"}],"dur":[30,60],"ini":[{"k":"lampara"}],"chips":["regleta","cable"]},
  {"id":"otra","n":"Otra avería","c":"Otra","d":"Cuéntanos qué pasa.","mientras":"Si huele a quemado o ves humo, baja el interruptor general del cuadro de la luz y espera al técnico.","min":[{"k":"visita"},{"k":"horas","q":0.5}],"max":null,"dur":[45,120],"ini":[{"k":"visita"},{"k":"horas","q":0.5}],"chips":["magneto","mecanismo","cable","caja","regleta"]}],
 mantenimiento:{
  revision:{"n":"Revisión del contrato","c":"Revisión","d":"La revisión de la instalación eléctrica que lleva el contrato.","dur":[40,75],"ini":[{"k":"visita"},{"k":"revinst"}],"chips":["diferencial","magneto","mecanismo","regleta"]},
  planes:[{"id":"anual","n":"Mantenimiento anual","precio":95,"iva":21,"revisiones":1,"desp":"visita","rev":"revinst","prioridad":1}]},
 textos:[
  ["Taller en Russafa, València","Taller a Russafa, València","Workshop in Russafa, València"],
  ["Salta el diferencial","Salta el diferencial","The main breaker keeps tripping"],
  ["Sin luz en una zona","Sense llum en una zona","No power in part of the home"],
  ["Enchufe o interruptor","Endoll o interruptor","Socket or switch"],
  ["Instalar una lámpara","Instal·lar un llum","Fit a light"],
  ["Otra avería","Una altra avaria","Another problem"],
  ["Visita y diagnóstico","Visita i diagnòstic","Visit and diagnosis"],
  ["Servicio urgente: salimos en el momento","Servei urgent: sortim al moment","Emergency service: we leave straight away"],
  ["Mano de obra","Mà d’obra","Labour"],
  ["Cambio de enchufe o interruptor, con visita","Canvi d’endoll o interruptor, amb visita","Socket or switch replacement, visit included"],
  ["Instalar una lámpara, con visita","Instal·lar un llum, amb visita","Light fitting, visit included"],
  ["Interruptor diferencial","Interruptor diferencial","RCD (residual-current device)"],
  ["Magnetotérmico","Magnetotèrmic","Circuit breaker (MCB)"],
  ["Mecanismo de enchufe","Mecanisme d’endoll","Socket mechanism"],
  ["Cable, tramo hasta 5 m","Cable, tram fins a 5 m","Cable, up to 5 m"],
  ["Caja de empalmes","Caixa d’empalmaments","Junction box"],
  ["Regletas y bornes","Regletes i borns","Terminal strips and connectors"],
  ["Cuadro eléctrico de 12 módulos, instalado","Quadre elèctric de 12 mòduls, instal·lat","12-module consumer unit, installed"],
  ["Revisión de la instalación eléctrica","Revisió de la instal·lació elèctrica","Electrical installation inspection"],
  ["Revisión del contrato","Revisió del contracte","Contract inspection"],
  ["Mantenimiento anual","Manteniment anual","Annual maintenance"],
  ["Desenchufa los aparatos que estaban funcionando y prueba a subir el diferencial una vez. Si vuelve a saltar, déjalo bajado hasta que llegue el técnico.","Desendolla els aparells que estaven funcionant i prova d’apujar el diferencial una vegada. Si torna a saltar, deixa’l abaixat fins que arribi el tècnic.","Unplug the appliances that were on and try switching the breaker back on once. If it trips again, leave it off until the technician arrives."],
  ["Mira en el cuadro de la luz si hay algún interruptor bajado. Si huele a quemado o ves humo, baja el interruptor general y no toques nada.","Mira al quadre de la llum si hi ha algun interruptor abaixat. Si fa olor de cremat o veus fum, abaixa l’interruptor general i no toquis res.","Check the fuse box for a switch that’s down. If you smell burning or see smoke, switch off the main switch and don’t touch anything."],
  ["No uses ese enchufe ni ese interruptor. Si está caliente, huele a quemado o hace chispas, baja su interruptor en el cuadro de la luz.","No facis servir aquest endoll ni aquest interruptor. Si és calent, fa olor de cremat o fa espurnes, abaixa’n l’interruptor al quadre de la llum.","Don’t use that socket or switch. If it’s hot, smells of burning or sparks, switch off its breaker in the fuse box."],
  ["Si huele a quemado o ves humo, baja el interruptor general del cuadro de la luz y espera al técnico.","Si fa olor de cremat o veus fum, abaixa l’interruptor general del quadre de la llum i espera el tècnic.","If you smell burning or see smoke, switch off the main switch in the fuse box and wait for the technician."]]
};
})(typeof globalThis!=='undefined'?globalThis:this);
