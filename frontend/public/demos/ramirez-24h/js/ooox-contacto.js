/* ============================================================
   EL CONTACTO DE OOOX para quien prueba la demo (17-11-2026).
   «Lo quiero para mi negocio» abre el WhatsApp de Oscar con el mensaje ya escrito, para que la petición le llegue
   directa. Lo usan la demo guiada (oficio-guia.js), la página de los tres móviles y la del vídeo: son de la demo, así
   que las copias de los negocios no lo llevan (copias.mjs, COMUNES).
   Mientras no haya número, los enlaces se quedan como están (escriben a software@ooox.es).
   ============================================================ */
(function(g){
'use strict';
/* el WhatsApp de Oscar: prefijo de España y el número, todo junto y sin espacios (por ejemplo, 34600111222) */
const WA='';
const MSG={
 demo:'Hola, Oscar. He probado la demo de OOOX Oficios y lo quiero para mi negocio. Mi negocio es: ',
 video:'Hola, Oscar. He visto el vídeo de OOOX Oficios y lo quiero para mi negocio. Mi negocio es: '};
const vale=/^\d{9,15}$/.test(WA);
g.OOOX_CONTACTO={wa:vale?WA:'',url:k=>vale?'https://wa.me/'+WA+'?text='+encodeURIComponent(MSG[k]||MSG.demo):''};
/* los enlaces que lo piden (data-wa="demo" o "video"): a WhatsApp, en otra pestaña */
function pon(){if(!vale)return;document.querySelectorAll('a[data-wa]').forEach(a=>{a.href=g.OOOX_CONTACTO.url(a.dataset.wa);a.target='_blank';a.rel='noopener'})}
g.OOOX_CONTACTO.pon=pon;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pon);else pon();
})(window);
