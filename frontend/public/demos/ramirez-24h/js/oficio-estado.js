/* ============================================================
   ESTADO DE LA DEMO · sin servidor.
   El estado vive en este navegador y se comparte al momento entre
   pestañas y marcos (la web, la centralita y el técnico ven lo mismo).
   En la fase 2 estas mismas llamadas hablan con el servidor del negocio;
   las reglas no cambian, porque están en oficio-nucleo.js.
   ============================================================ */
(function(g){
'use strict';
const K=g.OficioNucleo,N=g.OFICIO_NEGOCIO,cfg=K.cfgDe(N),CLAVE='oficio:'+N.id;
let S=null,canal=null;const subs=[];
try{canal=new BroadcastChannel(CLAVE)}catch(e){}
function lee(){try{const r=localStorage.getItem(CLAVE);if(r){const x=JSON.parse(r);if(x&&x.esq===K.ESQ&&Array.isArray(x.avisos))return x}}catch(e){}return null}
function guarda(){let dentro=false;
 try{localStorage.setItem(CLAVE,JSON.stringify(S));dentro=true}
 catch(e){try{S.avisos.forEach(a=>{a.foto='';a.fotos=[]});localStorage.setItem(CLAVE,JSON.stringify(S));dentro=true}catch(e2){}}
 if(canal)canal.postMessage(dentro?{v:S.v}:{v:S.v,S})}
function avisa(){subs.forEach(f=>{try{f(S)}catch(e){console.error(e)}})}
function estado(){const x=lee();if(x)S=x;else if(!S){S=g.OFICIO_MUESTRA(K,cfg,Date.now());guarda()}return S}
function hacer(a,quien){estado();const r=K.aplicar(S,cfg,a,quien,Date.now());if(r.ok){guarda();avisa()}return r}
function reiniciar(){const pack=S&&S.pack;S=g.OFICIO_MUESTRA(K,cfg,Date.now());S.pack=pack||'';S.v=Date.now();guarda();avisa()}
if(canal)canal.onmessage=e=>{const d=e.data||{};if(d.S&&(!S||d.S.v>=S.v))S=d.S;avisa()};
g.addEventListener&&g.addEventListener('storage',e=>{if(e.key===CLAVE)avisa()});

/* una foto del móvil, reducida para que quepa: 720 px de lado mayor */
function foto(archivo){return new Promise((si,no)=>{if(!archivo||!/^image\//.test(archivo.type))return no(new Error('tipo'));
 const u=URL.createObjectURL(archivo),im=new Image();
 im.onload=()=>{const k=Math.min(1,720/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);let q=.66,d=c.toDataURL('image/jpeg',q);while(d.length>130000&&q>.3){q-=.12;d=c.toDataURL('image/jpeg',q)}si(d)};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('imagen'))};im.src=u})}

/* la firma con el dedo: devuelve el trazo como ruta, en una caja de 300 × 110 */
function firma(lienzo,alCambiar){const cx=lienzo.getContext('2d');let trazos=[],act=null,largo=0;
 const medir=()=>{const r=lienzo.getBoundingClientRect(),k=g.devicePixelRatio||1;lienzo.width=Math.round(r.width*k);lienzo.height=Math.round(r.height*k);cx.setTransform(k,0,0,k,0,0);pinta()};
 const pinta=()=>{const r=lienzo.getBoundingClientRect();cx.clearRect(0,0,r.width,r.height);cx.lineWidth=2.4;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle='#17191b';
  trazos.forEach(t=>{cx.beginPath();t.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));if(t.length===1)cx.lineTo(t[0][0]+.1,t[0][1]);cx.stroke()})};
 const pt=e=>{const r=lienzo.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 lienzo.addEventListener('pointerdown',e=>{e.preventDefault();try{lienzo.setPointerCapture(e.pointerId)}catch(x){}act=[pt(e)];trazos.push(act);pinta()});
 lienzo.addEventListener('pointermove',e=>{if(!act)return;const p=pt(e),u=act[act.length-1],d=Math.hypot(p[0]-u[0],p[1]-u[1]);if(d<2)return;largo+=d;act.push(p);pinta()});
 const suelta=()=>{if(act){act=null;alCambiar&&alCambiar()}};
 lienzo.addEventListener('pointerup',suelta);lienzo.addEventListener('pointercancel',suelta);
 lienzo.style.touchAction='none';medir();
 return{vacia:()=>largo<60,borrar(){trazos=[];largo=0;pinta();alCambiar&&alCambiar()},medir,
  ruta(){const r=lienzo.getBoundingClientRect(),kx=300/r.width,ky=110/r.height;
   return trazos.map(t=>t.filter((p,i)=>i%2===0||i===t.length-1).map((p,i)=>(i?'L':'M')+Math.round(p[0]*kx)+' '+Math.round(p[1]*ky)).join('')).join('')}}}
const firmaSvg=d=>'<svg viewBox="0 0 300 110" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Firma"><path d="'+String(d).replace(/[^MLC0-9 .-]/g,'')+'"/></svg>';

g.Oficio={K,N,cfg,estado,hacer,reiniciar,suscribir:f=>{subs.push(f)},foto,firma,firmaSvg};
})(window);
