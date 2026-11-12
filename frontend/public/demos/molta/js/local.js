/* Lo común a todas las páginas del local: elige el modelo de diseño y aplica los colores y los textos de data/negocio.js. */
(function(){
 const N=window.NEGOCIO||{},R=document.documentElement;
 /* Modelos de diseño: el mismo motor (carta, pedido, mesa, tarjeta) con distinta puesta en escena.
    carta: cómo cambia el plato · fases: tramos del recorrido de la portada, de 0 a 1 · video: tramo en que avanza el vídeo
    fotos: qué fotograma del vídeo hace de foto en la visita y en el cierre (poster = el primero, fin = el último; v- o h- fija la orientación) */
 const MODELOS={
  disco:{nombre:'El disco',carta:'rodar'},
  plato:{nombre:'El plato',carta:'arco',fases:[[0,.27],[.25,.55],[.6,.86]],video:[.6,1],fotos:{visita:'poster'}},
  rotulo:{nombre:'El rótulo',carta:'pasar',pasar:'cortina',pestanas:true,fases:[[0,.1],[.03,.72]],video:[0,1]},
  pelicula:{nombre:'La película',carta:'pasar',pasar:'fundir',lista:'fija',fases:[[0,.55],[.74,.97]],video:[0,1],fotos:{visita:'fin',cierre:'v-fin',tarjeta:true}},
  mitad:{nombre:'La mitad',carta:'pasar',pasar:'subir',lista:'fija',marco:true,ori:'v',fases:[[0,.9],[.5,.88]],video:[0,1],fotos:{visita:'v-fin',cierre:'fin'}}
 };
 const propio=MODELOS[(N.diseno||{}).modelo]?N.diseno.modelo:'disco';
 let M=new URLSearchParams(location.search).get('modelo');if(!MODELOS[M])M=propio;
 R.dataset.modelo=M;
 /* los colores propios del local valen para su modelo; al probar otro con ?modelo= manda la paleta de ese modelo */
 if(M===propio)Object.entries(N.color||{}).forEach(([k,v])=>R.style.setProperty('--'+k,v));
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const get=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],N);
 const css=k=>getComputedStyle(R).getPropertyValue(k).trim();
 /* plato de reserva: si a un producto le falta la foto, sale un plato liso y la web no se rompe */
 let PLATO='';const reserva=()=>PLATO||(PLATO='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="'+(css('--field-surface')||'#22345c')+'"/><circle cx="50" cy="50" r="34" fill="'+(css('--field')||'#1b2b4e')+'"/></svg>'));
 document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&/assets\/carta\//.test(t.getAttribute('src')||''))t.src=reserva()},true);
 /* al probar un modelo que no es el del local, los enlaces entre páginas lo conservan */
 const con=u=>{if(M===propio||/[?&]modelo=/.test(u))return u;const k=u.indexOf('#'),a=k<0?u:u.slice(0,k),h=k<0?'':u.slice(k);return a+(a.includes('?')?'&':'?')+'modelo='+M+h};
 window.LOCAL={
  N,esc,get,con,MODELOS,
  modelo:M,propio,cfg:MODELOS[M],
  /* la hoja del modelo va después de los estilos de la página, para que mande ella. Escrita al vuelo, el navegador la espera
     antes de seguir; si el alojamiento no deja escribirla así, se cuelga a mano y la página se vuelve a medir cuando llega */
  estilo(){if(M==='disco')return;const h='css/modelo-'+M+'.css',hay=()=>document.querySelector('link[href="'+h+'"]');
   try{if(document.readyState==='loading')document.write('<link rel="stylesheet" href="'+h+'">')}catch(e){}
   if(!hay()){const l=document.createElement('link');l.rel='stylesheet';l.href=h;l.onload=()=>dispatchEvent(new Event('resize'));document.head.appendChild(l)}},
  eur:n=>n.toFixed(2).replace('.',',')+' €',
  plato:(id,grande)=>'assets/carta/'+(grande?'disc-':'d-')+id+'.webp',
  /* rellena lo marcado con data-t (texto), data-href (enlace) y data-src (imagen) */
  pintar(raiz){const r=raiz||document;
   r.querySelectorAll('[data-t]').forEach(e=>{const v=get(e.dataset.t);if(v==null)return;const h=esc(v).replace(/\n/g,' <br>');if(e.innerHTML!==h)e.innerHTML=h});
   r.querySelectorAll('[data-href]').forEach(e=>{const v=get(e.dataset.href);if(v)e.setAttribute('href',v)});
   r.querySelectorAll('[data-src]').forEach(e=>{const v=get(e.dataset.src);if(v&&e.getAttribute('src')!==v)e.setAttribute('src',v)});
   r.querySelectorAll('[data-alt]').forEach(e=>{const v=get(e.dataset.alt);if(v!=null)e.setAttribute('alt',v)});
   if(M!==propio)r.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href');if(/^(index|carta|sala|prueba)\.html/.test(h))a.setAttribute('href',con(h))});
   if(M!=='disco'&&r===document){const m=document.querySelector('meta[name="theme-color"]'),c=css('--tema');if(m&&c)m.content=c}}
 };
})();
