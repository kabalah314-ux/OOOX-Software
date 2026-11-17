/* ============================================================
   VIGÍA · la app apunta sola lo que le falla, sin datos de nadie.
   Cada copia de la app lleva este archivo, y la web del negocio también.
   Va el primero de todos, para ver también los fallos de los demás.

   - Qué recoge: errores de JavaScript, promesas que fallan sin que
     nadie las recoja, archivos propios que no cargan, errores que la
     app apunta en la consola y respuestas del servidor que dicen que
     algo se ha roto (HTTP 5xx o «servidor»).
   - Qué manda: la página, la pantalla (solo el primer trozo de la ruta,
     nunca el enlace), el tipo, el mensaje y las primeras líneas de
     dónde pasó, ya limpios (sin teléfonos, correos, códigos, llaves,
     fotos ni frases entre comillas), la versión, el tipo de aparato y
     el papel (oficina, técnico, cliente). Nunca quién es ni lo que se
     escribe. El servidor vuelve a limpiarlo todo antes de guardarlo.
   - Cuánto: lo repetido va junto, con su cuenta; como mucho 20 fallos
     distintos por página. Sin conexión se guarda en el aparato (hasta
     20) y sale la próxima vez.
   - Nunca rompe nada: si algo de aquí falla, se calla.
   El servidor y sus reglas: webs-negocios/oficios-mantenimiento/esquema.sql
   ============================================================ */
(function(g){
'use strict';
const SERVIDOR='https://hquvlfujruskpgnkmnfl.supabase.co';
/* Clave pública: lo único que deja hacer es llamar a las funciones públicas de oficios. */
const LLAVE='sb_publishable_XZG_z_f0ya0f-7esYS8zrw_OOI35qpf';
const GUARDADO='oficio-vigia',MAX_PAGINA=20,MAX_TANDA=10,MAX_GUARDA=20,ESPERA=2500,ENTRE=30000;

/* Lo mismo que oficios.limpia en el servidor. Sin «lookbehind»: los iPhone antiguos no lo entienden y no cargaría. */
function limpia(s,max){
 s=String(s==null?'':s).slice(0,6000)
  .replace(/data:[^\s"')(,]+(,[^\s"')]*)?/g,'data:…')
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[correo]')
  .replace(/(https?:\/\/[^\s?#"'<>()]*)(\?[^\s#"'<>():]*)?(#[^\s"'<>():]*)?/g,'$1')
  .replace(/#\/[^\s"'<>():]*/g,'#/…')
  .replace(/"[^"\n]{0,200}\s[^"\n]{0,200}"/g,'"…"')
  .replace(/'[^'\n]{0,200}\s[^'\n]{0,200}'/g,"'…'")
  .replace(/\b[A-Za-z0-9]{4}(-[A-Za-z0-9]{4})+\b/g,'[código]')
  .replace(/[A-Za-z0-9+=_]{22,}/g,'[x]')
  .replace(/(^|[^:\w])\+?\d(?:[ .-]?\d){6,}/g,'$1#');
 return s.slice(0,max||300).trim()}

function aparato(ua){ua=String(ua||'');
 const so=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS X/.test(ua)?'Mac':/Linux/.test(ua)?'Linux':'otro';
 const nav=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'otro';
 return so+' · '+nav}

/* Solo el primer trozo de la ruta: «#/aviso/R-0012/llave» → «aviso». */
const pantallaDe=h=>{const m=/^#\/?([a-z][a-z0-9-]{0,19})/i.exec(String(h||''));return m?m[1].toLowerCase():''};

/* El vigía, sin navegador: así se prueba. o = {fetch, almacen, ahora, programa(fn,ms), contexto()}
   contexto() da {negocio, pagina, pantalla, version, aparato, rol, servidor:{url,llave}} en el momento del fallo. */
function crea(o){
 const ahora=o.ahora||(()=>Date.now()),programa=o.programa||((f,ms)=>setTimeout(f,ms));
 const pend=new Map(),vistos=new Set();let reloj=null,ultima=-1e15,enviando=0;
 const lee=()=>{try{const x=JSON.parse(o.almacen.getItem(GUARDADO)||'[]');return Array.isArray(x)?x.filter(y=>y&&typeof y==='object'&&typeof y.neg==='string'):[]}catch(e){return[]}};
 const pon=l=>{try{if(l.length)o.almacen.setItem(GUARDADO,JSON.stringify(l.slice(-MAX_GUARDA)));else o.almacen.removeItem(GUARDADO)}catch(e){}};
 function nota(tipo,mensaje,pila){try{
  const m=limpia(mensaje,300);if(!m)return false;
  const p=limpia(pila,1500),k=tipo+'|'+m+'|'+(p.split('\n')[0]||'');
  const x=pend.get(k);if(x){x.n=Math.min(x.n+1,1000);return true}
  if(!vistos.has(k)){if(vistos.size>=MAX_PAGINA)return false;vistos.add(k)}
  const c=o.contexto()||{};
  pend.set(k,{neg:String(c.negocio||''),srv:c.servidor||null,pagina:c.pagina||'otra',pantalla:c.pantalla||'',tipo,mensaje:m,pila:p,version:c.version||'',aparato:c.aparato||'',rol:c.rol||'',n:1});
  if(!reloj)reloj=programa(()=>{reloj=null;vacia()},Math.max(ESPERA,ultima+ENTRE-ahora()));
  return true}catch(e){return false}}
 /* Manda lo pendiente y lo que quedó guardado de otras veces, en tandas por negocio. fin = la página se cierra. */
 function vacia(fin){
  reloj=null;const todo=lee().concat(Array.from(pend.values()));pend.clear();
  if(!todo.length)return Promise.resolve(0);
  ultima=ahora();
  /* sin negocio no se sabe de quién es: no se manda ni se guarda */
  const porNegocio={};todo.filter(x=>x.neg).forEach(x=>{(porNegocio[x.neg]=porNegocio[x.neg]||[]).push(x)});
  let quedan=[];pon(quedan);
  const tandas=[];Object.keys(porNegocio).forEach(n=>{const l=porNegocio[n];for(let i=0;i<l.length;i+=MAX_TANDA)tandas.push(l.slice(i,i+MAX_TANDA))});
  return Promise.all(tandas.map(l=>{const s=l[0].srv&&l[0].srv.url?l[0].srv:{url:SERVIDOR,llave:LLAVE};enviando++;
   const lote=l.map(x=>({pagina:x.pagina,pantalla:x.pantalla,tipo:x.tipo,mensaje:x.mensaje,pila:x.pila,version:x.version,aparato:x.aparato,rol:x.rol,n:x.n}));
   return Promise.resolve().then(()=>o.fetch(String(s.url).replace(/\/+$/,'')+'/rest/v1/rpc/oficios_error',{method:'POST',keepalive:!!fin,
     headers:{apikey:s.llave||LLAVE,'Content-Type':'application/json'},body:JSON.stringify({p_negocio:l[0].neg,p_lote:lote})}))
    /* Se reintenta otra vez solo sin red, con el servidor caído (5xx) o si aún no tiene la función (404). Si contesta,
       aunque diga que no (negocio dado de baja, tope), no se insiste. */
    .then(r=>{if(r&&!r.ok&&(r.status>=500||r.status===404||r.status===408||r.status===429))throw new Error('red')},()=>{throw new Error('red')})
    .then(()=>0,()=>{quedan=quedan.concat(l);pon(quedan);return l.length})
    .then(n=>{enviando--;return n})}))
   .then(r=>r.reduce((a,b)=>a+b,0))}
 const pendientes=()=>Array.from(pend.values()).map(x=>Object.assign({},x));
 return{nota,vacia,pendientes,guardados:lee,ocupado:()=>enviando>0||!!reloj}}

g.OficioVigia={crea,limpia,aparato,pantallaDe,GUARDADO};

/* ---------- en el navegador: se monta solo ---------- */
if(typeof g.document==='undefined'||typeof g.addEventListener!=='function')return;
try{
 const doc=g.document,yo=doc.currentScript,dato=k=>(yo&&yo.getAttribute('data-'+k))||'';
 const pagina=dato('pagina')||((/\/(app|cita|cliente)\.html$/.exec(g.location.pathname)||[])[1])||'web';
 let almacen;try{almacen=g.localStorage;almacen.getItem(GUARDADO)}catch(e){almacen={getItem:()=>null,setItem(){},removeItem(){}}}
 const extra={rol:null};
 const N=()=>g.OFICIO_NEGOCIO||(g.Oficio&&g.Oficio.N)||null;
 function negocio(){const d=dato('negocio');if(d)return d;const n=N();if(n&&typeof n.id==='string')return n.id;
  const m=/\/oficios\/([a-z0-9][a-z0-9-]{1,39})\//.exec(g.location.pathname);return m?m[1]:''}
 function rol(){try{const s=g.Oficio&&typeof g.Oficio.sesion==='function'&&g.Oficio.sesion();if(s&&s.rol)return s.rol;
  if(typeof extra.rol==='function'){const r=extra.rol();if(r)return r}}catch(e){}
  return pagina==='app'?'oficina':pagina==='web'?'web':'cliente'}
 const version=()=>(g.OficioNucleo&&g.OficioNucleo.VERSION)||dato('version')||'';
 const servidor=()=>{const n=N();return n&&n.servidor&&n.servidor.url&&n.servidor.llave?{url:n.servidor.url,llave:n.servidor.llave}:null};
 const f0=typeof g.fetch==='function'?g.fetch.bind(g):null;
 const V=crea({fetch:(u,x)=>f0?f0(u,x):Promise.reject(new Error('sin fetch')),almacen,
  contexto:()=>({negocio:negocio(),pagina,pantalla:pantallaDe(g.location.hash),version:version(),aparato:aparato(g.navigator&&g.navigator.userAgent),rol:rol(),servidor:servidor()})});
 const mio=u=>{try{return new URL(u,g.location.href).origin===g.location.origin}catch(e){return false}};
 const ruta=u=>{try{const x=new URL(u,g.location.href);return x.origin===g.location.origin?x.pathname:x.origin+x.pathname}catch(e){return''}};
 /* solo las líneas de nuestros archivos: las de extensiones del navegador no son nuestras */
 const nuestras=s=>String(s||'').split('\n').filter(l=>!/(chrome|moz|safari)-extension:|webkit-masked-url:/.test(l)).slice(0,8).join('\n');
 g.addEventListener('error',function(ev){try{
  const t=ev.target;
  if(t&&t!==g&&t.nodeType===1){   /* un archivo que no carga (foto, script, hoja de estilos) */
   const src=t.currentSrc||t.src||t.href||'';if(!src||/^(data|blob):/.test(src)||!mio(src))return;
   V.nota('recurso','No carga: '+ruta(src)+' ('+String(t.tagName).toLowerCase()+')','');return}
  const msg=String(ev.message||'').replace(/^Uncaught\s+/,'');   /* Chrome dice «Uncaught Error: …»; los demás, «Error: …» */
  if(!msg||/^Script error\.?$/i.test(msg)||/ResizeObserver loop/i.test(msg))return;
  if(ev.filename&&!mio(ev.filename))return;
  V.nota('js',msg,nuestras((ev.error&&ev.error.stack)||(ev.filename?ruta(ev.filename)+':'+ev.lineno+':'+ev.colno:'')))}catch(e){}},true);
 g.addEventListener('unhandledrejection',function(ev){try{const r=ev.reason;
  if(r&&r.name==='AbortError')return;   /* una llamada cortada a propósito */
  const msg=r&&r.message?(r.name&&r.name!=='Error'?r.name+': ':'')+r.message:typeof r==='string'?r:'Promesa rechazada sin motivo';
  V.nota('promesa',msg,nuestras(r&&r.stack))}catch(e){}});
 /* lo que la app ya apunta como error en la consola (un fallo al pintar que se recoge para no romper la pantalla) */
 if(g.console&&typeof g.console.error==='function'){const c0=g.console.error;
  g.console.error=function(){try{const a=arguments[0];
   if(a&&a.message)V.nota('consola',(a.name&&a.name!=='Error'?a.name+': ':'')+a.message,nuestras(a.stack));
   else if(typeof a==='string')V.nota('consola',a,'')}catch(e){}
   return c0.apply(this,arguments)}}
 /* el servidor dice que algo se ha roto: HTTP 5xx en sus llamadas */
 if(f0){const servidorDe=u=>/\.supabase\.co\//.test(u)&&!/oficios_error/.test(u);
  g.fetch=function(u){const p=f0.apply(null,arguments);
   try{const s=String(u&&u.url||u);if(servidorDe(s))p.then(r=>{if(r&&r.status>=500)V.nota('servidor','HTTP '+r.status+' · '+s.replace(/^https?:\/\/[^/]+\//,'').split('?')[0],'')},()=>{})}catch(e){}
   return p}}
 /* y lo que contesta «servidor» dentro de una respuesta buena (lo avisa js/oficio-estado.js) */
 g.OficioVigia.servidor=(que,err)=>V.nota('servidor','Contesta «'+String(err||'servidor')+'» · '+String(que||'').replace(/^https?:\/\/[^/]+\//,'').split('?')[0],'');
 g.OficioVigia.nota=(tipo,mensaje,pila)=>V.nota(['js','promesa','recurso','servidor','consola'].includes(tipo)?tipo:'consola',mensaje,pila);
 g.OficioVigia.pon=x=>{if(x&&'rol'in x)extra.rol=x.rol};
 g.OficioVigia.vacia=()=>V.vacia();
 /* lo que quedó guardado de otra vez, al rato de abrir; y lo pendiente, al cerrar la página */
 setTimeout(()=>{if(V.guardados().length)V.vacia()},8000);
 g.addEventListener('pagehide',()=>{try{if(V.pendientes().length)V.vacia(true)}catch(e){}});
}catch(e){}
})(typeof globalThis!=='undefined'?globalThis:this);
