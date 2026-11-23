/* EL CONTADOR DE LAS CARTAS (B6, 23-11-2026): cuántas cartas abren el QR, entran en la web, abren la app, empiezan la
   cita y la mandan, para saber qué pasa con cada tanda.
   Solo cuenta la demo abierta desde una carta: con su enlace «?m=…» (en esta página, en la de arriba o guardado en la
   pestaña) y sin caducar, igual que «muestraDe» (js/oficio-estado.js). Sin enlace no hace nada, así que en la app de un
   negocio de verdad nunca cuenta.
   Sin cookies ni datos personales: manda la tanda (la fecha «hasta» del enlace), una clave de la carta (los 12 primeros
   del sha256 del enlace; quién es cada clave solo lo sabe la hoja de la tanda) y el paso. Cada paso, una vez por pestaña.
   El servidor: public.oficios_visita (webs-negocios/oficios-servidor/visitas.sql), con la llave pública.
   Uso: <script src="js/oficio-visitas.js" data-paso="web"></script> cuenta ese paso al cargar; OficioVisitas.cuenta('pide')
   cuenta uno a mano. En el ordenador de pruebas (localhost) no sale nada, salvo con window.OOOX_VISITAS_PRUEBA. */
(function(g){
'use strict';
const SERVIDOR='https://hquvlfujruskpgnkmnfl.supabase.co',LLAVE='sb_publishable_XZG_z_f0ya0f-7esYS8zrw_OOI35qpf';
const PASOS=['carta','web','app','cita','pide','prueba'],MK='ooox:muestra';
const sto=(()=>{try{return g.sessionStorage}catch(e){return null}})();
const de=w=>{try{return new URLSearchParams(w.location.search).get('m')}catch(e){return null}};
/* el enlace de la carta y su tanda, si vale */
function carta(){
 let t=de(g);if(!t&&g.parent&&g.parent!==g)t=de(g.parent);if(!t&&sto)try{t=sto.getItem(MK)}catch(e){}
 if(typeof t!=='string'||!/^[A-Za-z0-9_-]{8,400}$/.test(t))return null;
 let j;try{const b=atob(t.replace(/-/g,'+').replace(/_/g,'/'));j=JSON.parse(new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0))))}catch(e){return null}
 if(!j||typeof j!=='object'||j.v!==1||typeof j.h!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(j.h))return null;
 const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date()),dias=(Date.parse(j.h+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/864e5;
 if(!(dias>=0)||dias>90)return null;
 return{t,tanda:j.h};
}
async function clave(t){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return Array.from(new Uint8Array(h).slice(0,6),b=>b.toString(16).padStart(2,'0')).join('')}
const local=()=>/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)||location.protocol==='file:';
async function cuenta(paso){
 try{
  if(!PASOS.includes(paso))return false;
  const c=carta();if(!c||!(g.crypto&&crypto.subtle))return false;
  const k='ooox:visto:'+paso;if(sto)try{if(sto.getItem(k)===c.t)return false;sto.setItem(k,c.t)}catch(e){}
  const body={p_tanda:c.tanda,p_carta:await clave(c.t),p_paso:paso};
  if(local()&&!g.OOOX_VISITAS_PRUEBA)return false;
  await fetch(SERVIDOR+'/rest/v1/rpc/oficios_visita',{method:'POST',keepalive:true,headers:{'content-type':'application/json',apikey:LLAVE},body:JSON.stringify(body)});
  return true;
 }catch(e){return false}
}
g.OficioVisitas={cuenta,clave};
const yo=document.currentScript,p=yo&&yo.dataset.paso;
if(p)cuenta(p);
})(window);
