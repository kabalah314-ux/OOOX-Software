/* ============================================================
   CONEXIÓN CON LA SALA (la usan la carta, el panel y la prueba).
   - Sin servidor (NEGOCIO.sala.servidor vacío): modo demo. El estado vive en este
     navegador y se comparte entre pestañas y marcos de la misma web.
   - Con servidor: las mismas acciones viajan al Worker de Cloudflare
     (servidor/worker.mjs) y los cambios llegan por websocket.
   Las pantallas solo usan:  SALA.mesa(n) · SALA.estado() · SALA.on(fn) · y las acciones.
   ============================================================ */
window.SALA=(function(){
 const N=window.NEGOCIO,K=window.SalaNucleo,cfg=K.cfgDe(N),KEY='ooox_sala_'+N.slug,subs=[];
 const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
 const q=new URLSearchParams(location.search),URLB=((N.sala&&N.sala.servidor)||'').replace(/\/$/,'');
 let disp=ls.get('ooox_disp');if(!disp){disp='d'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);ls.set('ooox_disp',disp)}
 if(q.get('disp')&&!URLB)disp='demo-'+q.get('disp').slice(0,12);   /* en la demo, un segundo «móvil» */
 const emit=()=>subs.forEach(f=>{try{f()}catch(e){console.error(e)}});

 /* ---------- modo demo: sin servidor ---------- */
 let mem=null,bc=null;
 function load(){const raw=ls.get(KEY);if(raw){try{const s=JSON.parse(raw);if(!mem||s.v>=mem.v)mem=s}catch(e){}}if(!mem)mem=K.nuevo();return mem}
 function recibir(s){if(!s||typeof s.v!=='number')return false;if(mem&&s.v<=mem.v)return false;mem=s;emit();return true}
 function relevo(m,menos){try{if(parent!==window&&parent!==menos)parent.postMessage(m,'*')}catch(e){}
  for(let i=0;i<frames.length;i++){try{if(frames[i]!==menos)frames[i].postMessage(m,'*')}catch(e){}}}
 function save(){ls.set(KEY,JSON.stringify(mem));try{bc&&bc.postMessage({s:mem})}catch(e){}relevo({ooox:'sala',s:mem})}
 if(!URLB){
  try{bc=new BroadcastChannel(KEY);bc.onmessage=e=>{const d=e.data||{};if(d.s)recibir(d.s);else if(d.q&&mem)bc.postMessage({s:mem})};bc.postMessage({q:1})}catch(e){}
  addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{recibir(JSON.parse(e.newValue))}catch(_){}}});
  addEventListener('message',e=>{const d=e.data||{};if(d.ooox!=='sala')return;if(d.s){if(recibir(d.s))relevo({ooox:'sala',s:mem},e.source)}else if(d.q&&mem&&e.source)e.source.postMessage({ooox:'sala',s:mem},'*')});
  try{if(parent!==window)parent.postMessage({ooox:'sala',q:1},'*')}catch(e){}
 }
 function local(tipo,d,rol){load();const r=K.aplicar(mem,cfg,Object.assign({tipo},d),{rol,disp});save();emit();return Promise.resolve(r)}

 /* ---------- con servidor ---------- */
 let vista=null,todo=null,ws=null,reint=0,miMesa=+q.get('mesa')||0;
 const clave=()=>ls.get('ooox_clave_'+N.slug)||'';
 function entra(d){if(d.vista)vista=d.vista;if(d.estado)todo=d.estado;emit()}
 function conecta(){if(!URLB)return;const u=URLB.replace(/^http/,'ws')+'/'+N.slug+'/ws?disp='+encodeURIComponent(disp)+(miMesa?'&mesa='+miMesa:'')+(clave()?'&clave='+encodeURIComponent(clave()):'');
  try{ws=new WebSocket(u);ws.onopen=()=>{reint=0};ws.onmessage=e=>{try{entra(JSON.parse(e.data))}catch(_){}};ws.onclose=()=>{ws=null;setTimeout(conecta,Math.min(15000,1000*2**reint++))}}catch(e){setTimeout(conecta,5000)}}
 function remoto(tipo,d,rol){return fetch(URLB+'/'+N.slug+'/accion',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({a:Object.assign({tipo},d),disp,mesa:miMesa,clave:rol==='sala'?clave():''})})
  .then(x=>x.json()).then(d=>{entra(d);return d.r||{error:'red'}}).catch(()=>({error:'red'}))}
 if(URLB){conecta();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!ws)conecta()})}

 const act=URLB?remoto:local;
 return{
  N,cfg,disp,remoto:!!URLB,
  on(f){subs.push(f)},
  /* lo que ve un cliente de su mesa · lo que ve el local entero */
  mesa(n){return URLB?(vista||{mesa:n,e:'libre',agotados:[],pend:[],l:[],total:0,tk:[],avisos:{}}):K.vistaCliente(load(),cfg,n,disp)},
  estado(){return URLB?(todo||K.nuevo()):load()},
  cuenta(n){return K.cuentaDe(this.estado(),n)},
  resumen(){return K.resumen(this.estado())},
  entrar(c){ls.set('ooox_clave_'+N.slug,c);if(ws)try{ws.close()}catch(e){}else conecta()},
  /* cliente */
  pedir:(mesa,l)=>act('pedir',{mesa,l},'cliente'),
  unirse:(mesa,cod)=>act('unirse',{mesa,cod},'cliente'),
  avisar:(mesa,que)=>act('avisar',{mesa,que},'cliente'),
  /* local */
  aceptar:id=>act('aceptar',{id},'sala'),
  rechazar:id=>act('rechazar',{id},'sala'),
  ticket:(id,est,e)=>act('ticket',{id,est,e},'sala'),
  agotar:(p,on)=>act('agotar',{p,on},'sala'),
  atender:id=>act('atender',{id},'sala'),
  abrir:mesa=>act('abrir',{mesa},'sala'),
  cerrar:mesa=>act('cerrar',{mesa},'sala'),
  nota:(mesa,l)=>act('nota',{mesa,l},'sala'),
  llamada:d=>act('llamada',d,'sala'),
  llamadaOk:id=>act('llamadaOk',{id},'sala'),
  reiniciar:()=>act('reiniciar',{},'sala')
 }
})();
