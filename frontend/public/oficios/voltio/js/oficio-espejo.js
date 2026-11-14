/* ============================================================
   EL ESPEJO · lo que este aparato sabe del servidor (fase 2)
   Solo se usa cuando los datos del negocio traen «servidor».
   Lleva dos cosas:
     · la BASE: los avisos tal como los tiene el servidor, hasta la última vez que contestó;
     · la COLA: lo que se ha hecho en este aparato y el servidor aún no ha confirmado.
   Lo que se ve en pantalla es la base con la cola aplicada encima, con las mismas reglas
   de siempre (oficio-nucleo.js). Así un botón responde al momento, también sin cobertura,
   y cuando el servidor contesta manda lo suyo: si rechaza algo, se deshace y se avisa.
   Aquí no hay red, ni reloj, ni almacenamiento: eso lo pone oficio-estado.js. Por eso este
   archivo se puede probar entero sin navegador (pruebas-reglas/prueba-espejo.mjs).
   ============================================================ */
(function(g){
'use strict';
const copia=x=>JSON.parse(JSON.stringify(x));
const PASAJEROS=['lleno','servidor','red'];   /* se vuelve a intentar con la misma marca */
const DE_SESION=['clave','bloqueo'];          /* el código ya no vale o está frenado: no se pierde nada, se espera */
const CREAN=['pedir','ausencia'];             /* su número lo pone el servidor: no se adelantan, se espera la respuesta */
const TERCO=6;                                /* tantas veces seguidas «servidor» con lo mismo: se da por rechazado, para no atascar la cola */
const ABC='abcdefghjkmnpqrstuvwxyz23456789';
/* la marca de cada acción: con ella, si se manda dos veces, el servidor la hace una sola. No es un secreto. */
function marcaNueva(){let s='';const c=g.crypto;
 if(c&&c.getRandomValues){const b=new Uint8Array(20);c.getRandomValues(b);for(let i=0;i<b.length;i++)s+=ABC[b[i]%ABC.length]}
 else for(let i=0;i<20;i++)s+=ABC[Math.floor(Math.random()*ABC.length)];
 return s}
const sinFotos=a=>(a.foto||(a.fotos&&a.fotos.length))?Object.assign({},a,{foto:'',fotos:[]}):a;

/* Mete en la base lo que manda el servidor: {v, entero, cab, avisos:[{id,v,datos}|{id,v,fuera:true}]}.
   «ver» apunta en qué versión del negocio cambió cada aviso, para que una respuesta vieja no pise una nueva. */
function mezcla(B,ver,c){
 if(!c||typeof c!=='object'||!Number.isInteger(c.v)||c.v<0||!Array.isArray(c.avisos))return false;
 if(c.entero){B.avisos=[];Object.keys(ver).forEach(k=>{delete ver[k]})}
 else if(c.v<B.v)return false;
 const por=new Map(B.avisos.map(a=>[a.id,a]));
 c.avisos.forEach(f=>{if(!f||typeof f.id!=='string'||!Number.isInteger(f.v))return;
  if(ver[f.id]>f.v)return;
  if(f.fuera){por.delete(f.id);delete ver[f.id]}
  else if(f.datos&&typeof f.datos==='object'&&f.datos.id===f.id){por.set(f.id,f.datos);ver[f.id]=f.v}});
 B.avisos=[...por.values()].sort((a,b)=>(a.n||0)-(b.n||0));
 B.v=c.v;const cab=c.cab||{};
 if(Number.isInteger(cab.esq))B.esq=cab.esq;
 if('n' in cab){B.n=cab.n||0;B.nu=cab.nu||0;B.ausencias=Array.isArray(cab.ausencias)?cab.ausencias:[]}
 return true}

/* Lo que se escribe en el aparato cuando hay varias pestañas: nadie pisa lo que otra tiene por enviar.
   «viejo» es lo que había guardado (quizá de otra pestaña) y «mio», lo de esta. */
function junta(viejo,mio){
 if(!viejo||viejo.f!==1||!viejo.quien||viejo.quien.rol!==mio.quien.rol||viejo.quien.id!==mio.quien.id)return mio;
 const hechas=[...new Set([].concat(Array.isArray(viejo.hechas)?viejo.hechas:[],mio.hechas))].slice(-300),H=new Set(hechas),por=new Map();
 [].concat(Array.isArray(viejo.cola)?viejo.cola:[],mio.cola).forEach(p=>{if(p&&typeof p.clave==='string'&&p.accion&&!H.has(p.clave))por.set(p.clave,p)});
 const cola=[...por.values()].sort((a,b)=>(a.t||0)-(b.t||0)),otra=viejo.B&&Number.isInteger(viejo.B.v)&&viejo.B.v>mio.B.v;
 return{f:1,quien:mio.quien,B:otra?viejo.B:mio.B,ver:otra?(viejo.ver||{}):mio.ver,cola,hechas}}

/* o: {K, cfg, quien:{rol,id}, ahora?, marca?} */
function crea(o){
 const K=o.K,cfg=o.cfg,q={rol:o.quien.rol,id:o.quien.id},ahora=o.ahora||(()=>Date.now()),marca=o.marca||marcaNueva;
 let B=K.nuevo(),ver={},cola=[],hechas=[],S=null,sucio=true;
 B.v=0;B.n=B.n||0;B.nu=B.nu||0;B.ausencias=B.ausencias||[];
 const adelantadas=()=>cola.some(p=>!p.crea);
 /* lo que se ve: la base y, encima, lo adelantado. Sin nada adelantado es la base misma, sin copiarla. */
 function rehace(){sucio=false;if(!adelantadas()){S=B;return}
  S=copia(B);cola.forEach(p=>{if(p.crea)return;const r=K.aplicar(S,cfg,copia(p.accion),q,p.t);p.cae=r.ok?'':r.err})}
 function estado(){if(sucio)rehace();return S}

 /* una acción normal: se aplica aquí al momento y se pone a la cola. Devuelve lo mismo que las reglas. */
 function hacer(accion){
  if(!accion||typeof accion!=='object'||CREAN.includes(accion.tipo))return{ok:false,err:'espera'};
  estado();if(S===B)S=copia(B);
  const t=ahora(),r=K.aplicar(S,cfg,copia(accion),q,t);
  if(!r.ok){if(!adelantadas())S=B;return r}
  const u=cola[cola.length-1];
  /* de la posición del técnico solo interesa la última: si la anterior aún no ha salido, se cambia por esta.
     Lo que se ve se rehace desde la base, para que sea lo mismo que hará el servidor: una posición, no dos. */
  if(accion.tipo==='posicion'&&u&&!u.crea&&!u.vuela&&u.accion.tipo==='posicion'&&u.accion.id===accion.id){u.accion=copia(accion);u.t=t;sucio=true}
  else cola.push({clave:marca(),accion:copia(accion),t});
  return r}

 /* una acción que crea algo (un aviso, una ausencia): se mira aquí si vale y, si vale, espera su turno y la respuesta.
    Devuelve una promesa con lo que digan las reglas del servidor, o {ok:false, err}. */
 function crear(accion,clave){
  if(!accion||typeof accion!=='object')return Promise.resolve({ok:false,err:'accion'});
  const r=K.aplicar(copia(estado()),cfg,copia(accion),q,ahora());
  if(!r.ok)return Promise.resolve(r);
  return new Promise(fin=>{cola.push({clave:clave||marca(),accion:copia(accion),t:ahora(),crea:true,fin})})}

 /* quien espera una creación se cansa (no hay red y hay cola por delante): se retira, si aún no ha salido */
 function quita(clave){const i=cola.findIndex(p=>p.crea&&p.clave===clave);if(i<0||cola[i].vuela)return false;const p=cola.splice(i,1)[0];p.fin({ok:false,err:'red'});return true}

 /* lo siguiente que hay que mandar, o nada */
 function siguiente(){const p=cola[0];if(!p)return null;p.vuela=true;return{que:'hacer',accion:p.accion,clave:p.clave,desde:B.v,crea:!!p.crea}}

 /* la respuesta del servidor a lo que se mandó (o {ok:false, err:'red'} si no llegó).
    Devuelve qué ha pasado: {tipo:'hecha'|'rechazada'|'reintenta'|'sesion'|'nada', err?, accion?} */
 function respuesta(clave,res){
  const p=cola[0];if(!p||p.clave!==clave)return{tipo:'nada'};p.vuela=false;
  const bien=!!res&&res.ok===true,err=bien?'':String((res&&res.err)||'red');
  const fuera=()=>{cola.shift();hechas.push(clave);if(hechas.length>300)hechas=hechas.slice(-300);sucio=true};
  if(bien){mezcla(B,ver,res.cambios);fuera();if(p.crea)p.fin(res.r&&typeof res.r==='object'?res.r:{ok:true});return{tipo:'hecha',crea:!!p.crea,accion:p.accion}}
  if(DE_SESION.includes(err)){if(p.crea){cola.shift();sucio=true;p.fin({ok:false,err:'sesion'})}return{tipo:'sesion',err}}
  if(PASAJEROS.includes(err)){p.malas=err==='servidor'?(p.malas||0)+1:(p.malas||0);
   if(p.crea){cola.shift();sucio=true;p.fin({ok:false,err:err==='red'?'red':'lleno',duda:true});return{tipo:'reintenta',err,crea:true}}
   if(!(err==='servidor'&&p.malas>=TERCO))return{tipo:'reintenta',err}}
  /* un no definitivo: el servidor manda cómo están las cosas y lo adelantado se deshace solo */
  if(res&&res.cambios)mezcla(B,ver,res.cambios);fuera();
  if(p.crea){p.fin({ok:false,err});return{tipo:'rechazada',err,crea:true,accion:p.accion}}
  return{tipo:'rechazada',err,accion:p.accion}}

 /* cambios que llegan sin haber mandado nada (al preguntar «¿hay algo nuevo?») */
 function llega(c){const va=mezcla(B,ver,c);if(va)sucio=true;return va}

 /* lo que se guarda en el aparato: la base sin fotos (al abrir se pide entera otra vez) y lo que falta por enviar */
 function guardado(){return{f:1,quien:q,B:Object.assign({},B,{avisos:B.avisos.map(sinFotos)}),ver:Object.assign({},ver),
  cola:cola.filter(p=>!p.crea).map(p=>({clave:p.clave,accion:p.accion,t:p.t})),hechas:hechas.slice(-300)}}
 /* al abrir: recupera lo guardado, si es de la misma persona y de la misma versión de la app */
 function carga(x){
  if(!x||x.f!==1||!x.quien||x.quien.rol!==q.rol||x.quien.id!==q.id||!x.B||x.B.esq!==K.ESQ||!Array.isArray(x.B.avisos)||!Number.isInteger(x.B.v))return false;
  B=x.B;B.n=B.n||0;B.nu=B.nu||0;B.ausencias=Array.isArray(B.ausencias)?B.ausencias:[];ver=x.ver&&typeof x.ver==='object'?x.ver:{};
  hechas=Array.isArray(x.hechas)?x.hechas.filter(k=>typeof k==='string').slice(-300):[];const H=new Set(hechas),mias=new Set(cola.map(p=>p.clave));
  (Array.isArray(x.cola)?x.cola:[]).forEach(p=>{if(p&&typeof p.clave==='string'&&p.accion&&typeof p.accion==='object'&&!H.has(p.clave)&&!mias.has(p.clave))cola.push({clave:p.clave,accion:p.accion,t:p.t||0})});
  cola.sort((a,b)=>(a.t||0)-(b.t||0));sucio=true;return true}
 /* quita de la cola lo que otra pestaña ya ha enviado */
 function yaHechas(lista){const H=new Set(Array.isArray(lista)?lista:[]);const n=cola.length;cola=cola.filter(p=>p.vuela||p.crea||!H.has(p.clave));if(cola.length!==n)sucio=true;return n-cola.length}

 return{estado,hacer,crear,quita,siguiente,respuesta,llega,guardado,carga,yaHechas,
  v:()=>B.v,esq:()=>B.esq,pendientes:()=>cola.filter(p=>!p.crea).length,enCola:()=>cola.length,
  caidas:()=>{estado();return cola.filter(p=>!p.crea&&p.cae).map(p=>({accion:p.accion,err:p.cae}))}}}

g.OficioEspejo={crea,mezcla,junta,marcaNueva,CREAN};
})(typeof globalThis!=='undefined'?globalThis:this);
