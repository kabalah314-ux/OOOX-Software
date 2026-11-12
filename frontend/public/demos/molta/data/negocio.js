/* ============================================================
   EL ARCHIVO DEL LOCAL. Todo lo que cambia de un negocio a otro vive aquí:
   nombre, textos, horario, carta, tarjeta de socio y mesas.
   El resto de la web (index, carta, sala) es plantilla común y no se toca.
   Molta es una cafetería INVENTADA para la demo pública de OOOX Local:
   el local, las fotos, la carta, los precios y los premios son de ejemplo.
   ============================================================ */
window.NEGOCIO={
 slug:'molta',                      /* minúsculas, sin espacios: se usa en claves y direcciones */
 nombre:'molta',
 apellido:"cafè d'especialitat",    /* la línea pequeña junto al nombre */
 demo:true,                         /* true: enseña los avisos de «esto es una demo» */
 plan:'ultra',                      /* basico · pro · ultra (qué partes se enseñan) */
 titulo:"molta, cafè d'especialitat: café tostado aquí y desayunos en Gràcia",
 descripcion:'molta: café de especialidad tostado en el local y desayunos sin prisa en el Carrer de Verdi, Gràcia, Barcelona. Mira la carta, pide desde tu mesa y saca tu tarjeta de la casa.',

 lugar:{
  calle:'Carrer de Verdi, 52',
  zona:'Gràcia, Barcelona',
  como:'Metro Fontana (L3) o Joanic (L4). Sin reserva: entra y pide en barra o desde tu mesa con el QR.',
  mapa:'https://www.google.com/maps/search/?api=1&query=Carrer+de+Verdi+Barcelona',
  resena:'https://www.google.com/maps/search/?api=1&query=Carrer+de+Verdi+Barcelona'   /* en un local de verdad: el enlace de «escribir una reseña» de su ficha de Google */
 },
 instagram:'',                      /* vacío: no se enseña el enlace (molta no existe) */
 whatsapp:'',                       /* con prefijo y sin signos: 34612345678. Vacío: el cliente elige a quién lo manda */

 /* 0 domingo … 6 sábado. Cada día, sus tramos; un día cerrado es [] */
 horario:{1:[['8:00','17:00']],2:[['8:00','17:00']],3:[['8:00','17:00']],4:[['8:00','17:00']],5:[['8:00','17:00']],6:[['9:00','15:00']],0:[['9:00','15:00']]},

 /* diseño de la web: disco · plato · rotulo · pelicula · mitad (se comparan en modelos.html).
    Para probar otro sin cambiar nada, añade ?modelo=plato al final de la dirección. Los colores de abajo son los del modelo elegido. */
 diseno:{modelo:'disco',galeria:true},
 /* colores de molta: barro, crema y café (solo los que cambian respecto a css/base.css) */
 color:{bg:'#f4eadc',surface:'#eadbc6',ink:'#2a1d15',muted:'#6e5646',accent:'#e08a5c','accent-ink':'#22160f',field:'#22160f','field-ink':'#f4eadc','field-surface':'#3a2a1f','field-muted':'#c9b39a',pc:'#c2643c'},

 /* textos de la portada. \n parte la línea en los titulares */
 textos:{
  entrada:{titulo:'tostado aquí,\nsin prisa.',lead:'Café de especialidad que tostamos en el local y desayunos de temporada en el Carrer de Verdi, Gràcia.',bienvenida:'bienvenido a molta.',saludo:'Bon dia. ¿Qué te apetece?'},
  indice:{carta:'{n} cosas ricas',tarjeta:'al sexto, invita molta',resena:'cuéntanos qué tal'},
  tarjeta:{titulo:'al sexto café,\ninvita molta.',lead:'Tu tarjeta de la casa se sella sola con cada café que pides.',consentimiento:'Quiero mi tarjeta y alguna novedad de molta por WhatsApp. Me doy de baja cuando quiera.'},
  visita:{titulo:'carrer de\nverdi, 52.'},
  cierre:{linea:"Cafè d'especialitat. Carrer de Verdi, 52, Gràcia, Barcelona.",demo:'molta no existe: el local, las fotos, la carta, los precios y los premios son de ejemplo.'},
  resena:{privado:'Enviar solo a molta',gracias:'Gracias. Le llega al equipo de molta.'}
 },
 marca:{antes:'m',despues:'lta'},   /* el nombre en grande del cierre: el plato hace de «o» */
 destacados:['flatwhite','tostadahuevo','tortitas','porridge'],   /* platos que salen en el índice de la portada */
 fotos:[
  {src:'assets/local-1.jpg',alt:'El interior de molta: la ventana en arco, la barra de roble y el suelo de terrazo'},
  {src:'assets/local-2.jpg',alt:'Un flat white y un croissant en una mesa al sol'},
  {src:'assets/local-3.jpg',alt:'Tostando café en el tostador del local'}
 ],

 /* tarjeta de socio: 6 sellos (los que tiene dibujados la tarjeta), un premio a mitad y otro al final */
 tarjeta:{
  prefijo:'MOLTA',medio:3,
  colores:{tinta:'#fff3ea',suave:'#fde0cc',codigo:'#2a1a12',historial:'#fde0cc',regalo:'#fff3ea',regalo_tinta:'#a54a29'},   /* lo que la web escribe encima de assets/tarjeta (nombre, sellos, código) */
  demo:['flatwhite','cappuccino','latte','cortado','icelatte','matchalatte'],   /* lo que «se toma» el socio en la demo del pago con el móvil */
  frases:{
   lista_medio:'Un croissant de la casa',lista_final:'Tu café gratis',
   falta_medio:'para tu croissant',falta_medio_largo:'para el croissant',falta_medio_corto:'para el croissant',
   falta_final:'para el café',falta_final_largo:'para el café gratis',
   medio_ganado:'Croissant ganado.',medio_tuyo:'El croissant ya es tuyo',
   final_listo:'Café gratis listo: enséñala en barra',final_completo:'Tarjeta completa: tu próximo café es gratis. Enséñala en barra.',
   aviso_medio:'Tercer sello: te has ganado un croissant.',aviso_final:'Sexto sello: tu próximo café es gratis.',
   canje:'Café gratis, canjeado',canje_aviso:'Café gratis canjeado. Empieza una tarjeta nueva.',
   nfc_gratis:'Café gratis: invita la casa.',nfc_invita:'invita molta',bienvenida:'Café de bienvenida'
  }
 },

 /* mesas: cuántas hay y cómo se aceptan los pedidos. servidor vacío = demo en este navegador */
 sala:{mesas:10,aceptar:'primera',servidor:''},

 /* asistente de llamadas (pack Ultra). De aquí y de la carta sale lo que sabe decir: herramientas/agente-llamadas.mjs.
    Las respuestas de molta son de ejemplo. */
 llamadas:{
  saludo:'Hola, has llamado a molta. Soy el asistente virtual del local, una inteligencia artificial. ¿En qué te ayudo?',
  idiomas:['castellano','catalán','inglés'],
  pedidos:true,                     /* coge pedidos para recoger */
  encargos:true,                    /* apunta encargos (los confirma el local) */
  reservas:'grupos',                /* no · grupos · si */
  pasar_a:'',                       /* teléfono al que pasar lo urgente; vacío = toma recado */
  faq:[
   ['¿Se puede reservar mesa?','Entre semana no hace falta. Para grupos de seis o más, el fin de semana, sí: te apunto la reserva y el local te la confirma.'],
   ['¿Tostáis vuestro café?','Sí, lo tostamos aquí cada semana. Se puede comprar en grano o molido para casa.'],
   ['¿Tenéis wifi y enchufes?','Sí, hay wifi gratis y enchufes en la barra de la ventana.'],
   ['¿Se puede entrar con perro?','Sí, los perros son bienvenidos.'],
   ['¿Tenéis leche vegetal o sin lactosa?','Sí, de avena y sin lactosa, sin suplemento.'],
   ['¿Hacéis desayunos todo el día?','Los desayunos se sirven hasta las doce entre semana y hasta el cierre el fin de semana.']
  ]
 },

 carta:{
  iva:10,
  barras:['Intensidad','Dulzor','Cuánto llena'],
  opciones:['Casa','Origen'],       /* nombres de las dos variantes cuando un producto tiene dos precios y no dice otra cosa */
  grupos:[['Bebidas',['Cafés','Otras']],['Comidas',['Caliente','Frío']]],   /* la carta se divide en grupos y cada grupo en sus secciones (sec) */
  corto:{},                         /* nombre corto de una sección, para huecos pequeños */
  estaciones:{barra:['Cafés','Otras'],cocina:['Caliente','Frío']},   /* a qué pantalla va cada parte de la carta */
  abre:'8:15',                      /* primera hora de recogida */
  nota:'molta es una cafetería inventada para la demo de OOOX: precios y alérgenos son de ejemplo. Si tienes alguna alergia, pregunta siempre en barra.',
  /* id (nombre de sus fotos: assets/carta/disc-<id>.webp y d-<id>.webp) · sec · name · line (una línea) · desc · price [uno o dos]
     st [las tres barras, de 0 a 5] · c (color del disco) · al (alérgenos) · tag · opts (nombres de las dos variantes) · ing [[detalle, ingrediente]] */
  productos:[
 /* Bebidas: cafés */
 {id:'flatwhite',sec:'Cafés',name:'Flat white',line:'Espresso doble, microespuma y leche.',desc:'Doble espresso y microespuma fina. Casa es nuestro tueste de siempre; Origen, el café de un solo origen que tostamos esta semana.',price:[3.3,3.8],st:[4,1,1],c:'#e3b98f',al:['leche'],ing:[['doble','Espresso'],['fina','Microespuma'],['entera, de avena o sin lactosa','Leche']]},
 {id:'espresso',sec:'Cafés',name:'Espresso',line:'Espresso doble, recién molido.',desc:'Doble, corto e intenso. Con nuestro tueste de la casa o con el origen de la semana.',price:[1.8,2.3],st:[5,0,0],c:'#c98a5a',al:[],ing:[['doble, recién molido','Espresso']]},
 {id:'cortado',sec:'Cafés',name:'Cortado',line:'Espresso y un toque de leche.',desc:'Espresso con un toque de leche texturizada, servido en vaso.',price:[2.0,2.5],st:[4,1,0],c:'#ddb48c',al:['leche'],ing:[['doble','Espresso'],['un toque, texturizada','Leche']]},
 {id:'cappuccino',sec:'Cafés',name:'Cappuccino',line:'Espresso, leche con mucha espuma y cacao.',desc:'Espresso, leche y mucha espuma, con un poco de cacao por encima.',price:[3.0,3.5],st:[3,1,1],c:'#d8a476',al:['leche'],ing:[['doble','Espresso'],['con espuma alta','Leche'],['por encima','Cacao']]},
 {id:'latte',sec:'Cafés',name:'Latte',line:'Espresso con mucha leche sedosa.',desc:'Espresso con mucha leche sedosa. El más suave de los cafés con leche.',price:[3.2,3.7],st:[2,1,2],c:'#ecc9a4',al:['leche'],ing:[['doble','Espresso'],['sedosa, con dibujo','Leche']]},
 {id:'americano',sec:'Cafés',name:'Americano',line:'Espresso alargado con agua caliente.',desc:'Espresso alargado con agua caliente. Café solo, largo y limpio.',price:[2.3,2.8],st:[3,0,1],c:'#c99a62',al:[],ing:[['doble','Espresso'],['caliente','Agua']]},
 {id:'icelatte',sec:'Cafés',name:'Ice latte',line:'Espresso, leche fría y hielo.',desc:'Espresso recién sacado sobre leche fría y hielo. Remueve y mira cómo se mezcla.',price:[3.7,4.2],st:[3,1,2],c:'#c9d6cf',al:['leche'],ing:[['Casa u Origen','Espresso'],['fría','Leche'],['en cubitos grandes','Hielo']]},
 {id:'coldbrew',sec:'Cafés',name:'Cold brew',line:'Café infusionado 18 horas en frío.',desc:'Nuestro café reposado en agua fría toda la noche. Suave, dulce de forma natural y sin amargor.',price:[3.8],st:[3,1,1],tag:'Vegano',c:'#b7c4b5',al:[],ing:[['18 horas en frío','Café de la casa'],['un cubito grande','Hielo']]},
 {id:'coldbrewfoam',sec:'Cafés',name:'Cold brew foam',line:'Cold brew con espuma fría y dulce.',desc:'Cold brew con una capa de espuma fría y dulce que cae despacio dentro del café.',price:[4.5],st:[3,3,2],tag:'De la casa',c:'#d5ddd3',al:['leche'],ing:[['18 horas en frío','Cold brew'],['dulce','Espuma fría'],['un cubito grande','Hielo']]},
 {id:'espressotonic',sec:'Cafés',name:'Espresso tonic',line:'Espresso, tónica y naranja.',desc:'Tónica bien fría con hielo y un espresso por encima. Burbujas, café y un toque de naranja.',price:[4.2],st:[3,2,1],tag:'Vegano',c:'#e9a36b',al:[],ing:[['por encima','Espresso'],['bien fría','Tónica'],['una rodaja','Naranja']]},

 /* Bebidas: otras */
 {id:'matchalatte',sec:'Otras',name:'Matcha latte',line:'Matcha con leche caliente y espuma.',desc:'Matcha batido al momento con leche caliente y espuma.',price:[4.5],st:[2,2,2],c:'#c5cf96',al:['leche'],ing:[['batido','Matcha'],['caliente, con espuma','Leche']]},
 {id:'icematcha',sec:'Otras',name:'Ice matcha',line:'Matcha, leche fría y hielo.',desc:'Matcha batido al momento sobre leche fría y hielo. Si lo prefieres caliente, pide el matcha latte.',price:[4.8],st:[2,2,2],c:'#b6c486',al:['leche'],ing:[['batido al momento','Matcha'],['fría','Leche'],['mucho','Hielo']]},
 {id:'chai',sec:'Otras',name:'Chai latte',line:'Té negro, especias y leche.',opts:['Caliente','Frío'],desc:'Té negro con canela, cardamomo y jengibre, con leche. Caliente o con hielo.',price:[4.2,4.5],st:[2,3,2],c:'#e1a873',al:['leche'],ing:[['especiado','Té negro'],['canela, cardamomo y jengibre','Especias'],['caliente o fría','Leche']]},
 {id:'sencha',sec:'Otras',name:'Té verde sencha',line:'Té verde japonés de hoja entera.',opts:['Caliente','Frío'],desc:'Té verde japonés de hoja entera. Fresco, vegetal y ligero.',price:[2.8,3.2],st:[1,0,0],tag:'Vegano',c:'#bfd0a1',al:[],ing:[['de hoja entera','Té verde sencha'],['a 75 °C','Agua']]},
 {id:'rooibos',sec:'Otras',name:'Rooibos',line:'Infusión roja sin teína.',opts:['Caliente','Frío'],desc:'Infusión roja sudafricana sin teína. Dulce de forma natural, perfecta por la tarde.',price:[2.8,3.2],st:[1,2,0],tag:'Vegano',c:'#e39a7c',al:[],ing:[['sin teína','Rooibos'],['hirviendo','Agua']]},
 {id:'hibisco',sec:'Otras',name:'Té frío de hibisco',line:'Hibisco, menta y mucho hielo.',desc:'Infusión de hibisco hecha aquí, fría, con hielo y una hoja de menta. Ácida y refrescante.',price:[3.5],st:[1,2,1],tag:'De la casa',c:'#d88a8f',al:[],ing:[['hecho aquí','Hibisco'],['fresca','Menta'],['mucho','Hielo']]},

 /* Comidas: caliente */
 {id:'tostadahuevo',sec:'Caliente',name:'Tostada de aguacate y huevo',line:'Masa madre, aguacate y huevo poché.',desc:'Pan de masa madre tostado con aguacate, huevo poché, rabanitos y dukkah de frutos secos. El desayuno que más sale.',price:[8.5],st:[0,0,5],tag:'De la casa',c:'#cbd39a',al:['gluten','huevo','frutos de cáscara','sésamo'],ing:[['de masa madre, tostado','Pan'],['machacado','Aguacate'],['poché','Huevo'],['por encima','Dukkah y rabanitos']]},
 {id:'shakshuka',sec:'Caliente',name:'Huevos al horno con espinacas',line:'Dos huevos, espinacas y feta.',desc:'Dos huevos al horno sobre espinacas con ajo, feta y semillas, en su cazuela de hierro. Con pan para mojar.',price:[9.5],st:[0,0,5],c:'#b9c98f',al:['huevo','leche','gluten'],ing:[['al horno','Huevos'],['con ajo','Espinacas'],['desmigado','Queso feta'],['para mojar','Pan']]},
 {id:'tortitas',sec:'Caliente',name:'Tortitas de trigo sarraceno',line:'Frutos rojos y yogur.',desc:'Tres tortitas de trigo sarraceno con frutos rojos, yogur espeso y un hilo de miel.',price:[8.0],st:[0,4,4],c:'#d9a98a',al:['huevo','leche'],ing:[['de trigo sarraceno','Tortitas'],['del día','Frutos rojos'],['espeso','Yogur'],['un hilo','Miel']]},
 {id:'porridge',sec:'Caliente',name:'Porridge de pera',line:'Avena, pera asada y nueces.',desc:'Avena cocida con leche y canela, pera asada al horno y nueces tostadas por encima.',price:[7.0],st:[0,3,4],c:'#e4c79e',al:['gluten','leche','frutos de cáscara'],ing:[['cocida con leche','Avena'],['asada','Pera'],['tostadas','Nueces'],['un poco','Canela']]},
 {id:'bananabread',sec:'Caliente',name:'Banana bread',line:'Bizcocho de plátano con mantequilla.',desc:'Bizcocho de plátano maduro con la parte de arriba caramelizada. Lo calentamos y te lo servimos con mantequilla.',price:[3.5],st:[0,3,3],c:'#e6c37a',al:['gluten','leche','huevo'],ing:[['maduro','Plátano'],['templado','Bizcocho'],['por encima','Mantequilla']]},

 /* Comidas: frío */
 {id:'yogur',sec:'Frío',name:'Yogur con higos',line:'Yogur griego, higos y pistacho.',desc:'Yogur griego cremoso con higos frescos, pistachos, miel y flores comestibles.',price:[7.0],st:[0,3,3],tag:'De temporada',c:'#e7b9a6',al:['leche','frutos de cáscara'],ing:[['griego','Yogur'],['frescos','Higos'],['picados','Pistachos'],['un hilo','Miel']]},
 {id:'chia',sec:'Frío',name:'Chía con mango',line:'Chía con leche de coco y mango.',desc:'Pudin de chía con leche de coco, mango y fruta de la pasión por encima.',price:[6.0],st:[0,3,2],tag:'Vegano',c:'#efc27f',al:[],ing:[['remojada en coco','Chía'],['en dados','Mango'],['por encima','Fruta de la pasión']]},
 {id:'acai',sec:'Frío',name:'Bowl de açaí',line:'Açaí, fruta, coco y granola.',desc:'Açaí batido con plátano, arándanos, fresas, coco tostado y granola de la casa.',price:[8.0],st:[0,4,3],tag:'Vegano',c:'#c9a0b4',al:['gluten','frutos de cáscara'],ing:[['batido con plátano','Açaí'],['frescos','Arándanos y fresas'],['tostado','Coco'],['de la casa','Granola']]},
 {id:'croissant',sec:'Frío',name:'Croissant',line:'Hojaldre de mantequilla, dorado.',desc:'Croissant de mantequilla, hojaldrado y dorado. Para acompañar el café.',price:[2.2],st:[0,1,2],c:'#eabf7c',al:['gluten','leche','huevo'],ing:[['de mantequilla','Hojaldre']]},
 {id:'cookie',sec:'Frío',name:'Cookie de chocolate',line:'Chocolate a trozos y sal en escamas.',desc:'Galleta grande de chocolate, crujiente por fuera y blanda por dentro, con un poco de sal en escamas.',price:[2.8],st:[0,4,2],c:'#dcae7e',al:['gluten','leche','huevo'],ing:[['de mantequilla','Masa'],['a trozos','Chocolate'],['en escamas','Sal']]},
  ]
 }
};
