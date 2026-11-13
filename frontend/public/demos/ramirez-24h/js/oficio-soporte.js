/* ============================================================
   MEJORAS · lo que la oficina le escribe a OOOX, y lo que OOOX contesta.
   Cada copia de la app lleva este archivo. No toca los avisos ni los
   datos de los clientes del negocio: solo manda peticiones («algo
   falla», «quiero una mejora», «tengo una duda»), lee cómo van y
   recoge las novedades de OOOX.

   - Viaja: el negocio, su código de soporte, el texto, quién lo pide
     (si quiere), la pantalla desde la que escribe, la versión de la
     app y el tipo de aparato. Nada más.
   - Sin conexión no se pierde: se guarda en el aparato y sale sola.
   - El código de soporte lo da OOOX en el alta y se guarda solo en
     este aparato. La demo es pública y no lo pide: allí cada navegador
     ve únicamente lo que ha mandado él.
   El servidor y sus reglas: webs-negocios/oficios-soporte/ (esquema.sql).
   ============================================================ */
(function(g){
'use strict';
const BUZON='https://glsmahzpvzabeeucyqif.supabase.co/rest/v1/rpc/';
/* Clave pública: lo único que deja hacer es llamar a oficios_enviar, oficios_buzon y oficios_ofertas. */
const LLAVE='sb_publishable_SmbXr1nXApZ8HRF1ezbXcg_lqtr2yaZ';
const TIPOS={fallo:'Algo falla',mejora:'Una mejora',duda:'Una duda'};
const ESTADOS={en_cola:'Sin enviar',recibida:'Recibida',mirando:'La estamos mirando',aceptada:'Aceptada',en_curso:'En marcha',hecha:'Hecha',descartada:'No se hará',duplicada:'Ya estaba pedida'};
const MIN=10,MAX=2000,ESPERA=9000;

function aparato(ua){ua=String(ua||'');
 const so=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS X/.test(ua)?'Mac':/Linux/.test(ua)?'Linux':'otro';
 const nav=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'otro';
 return so+' · '+nav}

function crea(o){
 const P='oficio:'+o.negocio+':',ahora=o.ahora||(()=>Date.now()),espera=o.espera||ESPERA,memoria={};
 /* Si el aparato no deja guardar (modo privado, disco lleno), al menos dura mientras la app esté abierta. */
 const L=(k,d)=>{try{const r=o.almacen.getItem(P+k);if(r!=null)return JSON.parse(r)}catch(e){}return k in memoria?memoria[k]:d};
 const G=(k,v)=>{memoria[k]=v;try{o.almacen.setItem(P+k,JSON.stringify(v))}catch(e){}};

 const codigo=()=>o.demo?'DEMO':String(L('soporte','')||'');
 function ponCodigo(c){c=String(c==null?'':c).trim();if(c.length<4||c.length>80)return false;G('soporte',c);return true}
 const olvidaCodigo=()=>G('soporte','');
 function remitente(){let r=L('remitente','');
  if(!r){r='';while(r.length<20)r+=Math.floor(Math.random()*1e9).toString(36);r=r.slice(0,20);G('remitente',r)}return r}
 function valida(p){if(!p||!Object.prototype.hasOwnProperty.call(TIPOS,p.tipo))return'tipo';
  const t=String(p.texto==null?'':p.texto).trim();return t.length<MIN||t.length>MAX?'texto':''}

 /* Una llamada al buzón. Devuelve {ok:true,datos} o {ok:false,red:true}: nunca lanza. */
 function llama(fn,cuerpo){let ctl=null,reloj=null;
  try{ctl=new AbortController();reloj=setTimeout(()=>ctl.abort(),espera)}catch(e){}
  return Promise.resolve().then(()=>o.fetch(BUZON+fn,{method:'POST',headers:{apikey:LLAVE,'Content-Type':'application/json'},body:JSON.stringify(cuerpo),signal:ctl?ctl.signal:undefined}))
   .then(r=>r&&r.ok?r.json().then(d=>({ok:true,datos:d})):{ok:false,red:true})
   .catch(()=>({ok:false,red:true})).then(x=>{if(reloj)clearTimeout(reloj);return x})}
 const base=()=>({p_negocio:o.negocio,p_clave:codigo()});

 const cola=()=>{const c=L('cola',[]);return Array.isArray(c)?c:[]};
 function manda(it){return llama('oficios_enviar',Object.assign(base(),{p_tipo:it.tipo,p_texto:it.texto,p_quien:it.quien||null,p_pantalla:it.pantalla||null,p_version:o.version||null,p_aparato:aparato(o.ua),p_remitente:remitente()}))
  .then(r=>!r.ok?{ok:false,red:true}:r.datos&&r.datos.ok?{ok:true,id:r.datos.id}:{ok:false,err:(r.datos&&typeof r.datos.err==='string'&&r.datos.err)||'servidor'})}
 /* Mandar una petición. Si no hay conexión se queda en la cola y dice enCola:true. */
 function enviar(p){const e=valida(p);if(e)return Promise.resolve({ok:false,err:e});
  if(!codigo())return Promise.resolve({ok:false,err:'clave'});
  const t=ahora(),it={k:'c'+t.toString(36)+Math.floor(Math.random()*1e6).toString(36),t,tipo:p.tipo,texto:String(p.texto).trim(),quien:String(p.quien==null?'':p.quien).trim().slice(0,60),pantalla:String(p.pantalla==null?'':p.pantalla).slice(0,120)};
  return manda(it).then(r=>{if(r.red){G('cola',cola().concat([it]).slice(-20));return{ok:true,enCola:true}}return r})}
 /* Saca lo que hubiera en la cola, en orden. Devuelve cuántas quedan. */
 let vaciando=null;
 function vaciar(){if(vaciando)return vaciando;
  const paso=()=>{const c=cola();if(!c.length)return Promise.resolve(0);const it=c[0];
   return manda(it).then(r=>{if(r.red)return c.length;                    /* sigue sin conexión: se queda todo */
    if(r.ok||r.err==='texto'||r.err==='tipo'){G('cola',cola().filter(x=>x.k!==it.k));return paso()}   /* enviada, o no vale: fuera */
    return c.length})};                                                     /* código malo, bloqueo o tope: se reintenta más tarde */
  vaciando=paso().then(n=>{vaciando=null;return n},()=>{vaciando=null;return cola().length});return vaciando}

 /* Lo último que se sabe, con lo que está en la cola arriba. Vale sin conexión. */
 function cache(){let b=L('buzon',null);if(!b||typeof b!=='object'||Array.isArray(b))b={};
  const pend=cola().map(x=>({id:x.k,tipo:x.tipo,texto:x.texto,quien:x.quien,estado:'en_cola',respuesta:null,creada:new Date(x.t).toISOString()})).reverse();
  const sin=o.demo?!!L('ofertas_no',false):!!b.sin_ofertas,nov=(Array.isArray(b.novedades)?b.novedades:[]).filter(n=>n&&!(sin&&n.tipo==='oferta'));
  return{peticiones:pend.concat((Array.isArray(b.peticiones)?b.peticiones:[]).filter(p=>p&&typeof p==='object')),novedades:nov,sin_ofertas:sin,t:b.t||0,demo:!!o.demo}}
 const vistas=()=>{const v=L('vistas',null)||{};return{nov:Array.isArray(v.nov)?v.nov:[],pet:v.pet&&typeof v.pet==='object'?v.pet:{}}};
 const firma=p=>p.estado+'|'+String(p.respuesta||'').length;
 /* Trae el buzón: primero vacía la cola, después pide las peticiones y las novedades. */
 function buzon(){if(!codigo())return Promise.resolve({ok:false,err:'clave'});
  return vaciar().then(()=>{const nov=vistas().nov.filter(x=>typeof x==='number');
   return llama('oficios_buzon',Object.assign(base(),{p_version:o.version||null,p_remitente:remitente(),p_vistas:nov.length?nov:null}))})
   .then(r=>{if(!r.ok)return{ok:false,err:'red'};const d=r.datos||{};if(!d.ok)return{ok:false,err:typeof d.err==='string'?d.err:'servidor'};
    G('buzon',{peticiones:Array.isArray(d.peticiones)?d.peticiones:[],novedades:Array.isArray(d.novedades)?d.novedades:[],sin_ofertas:!!d.sin_ofertas,t:ahora()});return{ok:true}})}
 /* Cuántas cosas hay que la oficina aún no ha visto: novedades nuevas y peticiones que OOOX ha movido o contestado. */
 function sinVer(){const c=cache(),v=vistas();
  return{nov:c.novedades.filter(n=>!v.nov.includes(n.id)).map(n=>n.id),pet:c.peticiones.filter(p=>p.estado!=='en_cola'&&p.estado!=='recibida'&&v.pet[p.id]!==firma(p)).map(p=>p.id)}}
 const sinLeer=()=>{const s=sinVer();return s.nov.length+s.pet.length};
 function marcaVisto(){const c=cache(),v=vistas(),pet={};c.peticiones.forEach(p=>{if(p.estado!=='en_cola')pet[p.id]=firma(p)});
  G('vistas',{nov:v.nov.concat(c.novedades.map(n=>n.id).filter(x=>!v.nov.includes(x))).slice(-200),pet})}
 function ofertas(quiere){return llama('oficios_ofertas',Object.assign(base(),{p_quiere:!!quiere})).then(r=>{if(!r.ok)return{ok:false,err:'red'};const d=r.datos||{};if(!d.ok)return{ok:false,err:typeof d.err==='string'?d.err:'servidor'};
  if(o.demo){G('ofertas_no',!quiere);return{ok:true,sin_ofertas:!quiere}}
  const b=L('buzon',null);if(b&&typeof b==='object'&&!Array.isArray(b)){b.sin_ofertas=!!d.sin_ofertas;G('buzon',b)}return{ok:true,sin_ofertas:!!d.sin_ofertas}})}
 const toca=ms=>ahora()-cache().t>ms;

 return{codigo,ponCodigo,olvidaCodigo,remitente,valida,enviar,vaciar,cola,cache,buzon,sinVer,sinLeer,marcaVisto,ofertas,toca}}

g.OficioSoporte={crea,aparato,TIPOS,ESTADOS,MIN,MAX,BUZON};

/* En la app: un buzón ya montado para este negocio. */
if(g.Oficio&&g.Oficio.N&&typeof g.fetch==='function'){
 let almacen;try{almacen=g.localStorage;almacen.getItem('x')}catch(e){almacen={getItem:()=>null,setItem:()=>{}}}
 g.Oficio.soporte=crea({negocio:g.Oficio.N.id,demo:!!g.Oficio.DEMO,version:(g.OficioNucleo&&g.OficioNucleo.VERSION)||'',almacen,fetch:(u,x)=>g.fetch(u,x),ua:g.navigator?g.navigator.userAgent:''})}
})(typeof globalThis!=='undefined'?globalThis:this);
