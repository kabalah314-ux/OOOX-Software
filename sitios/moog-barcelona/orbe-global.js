/* ============================================================================
   MOOG · ORBE GLOBAL — un solo orbe consistente que viaja por TODA la web.
   (sustituye a los 4 orbes por sección: 1 canvas fijo + 1 shader + interpolación)
   Cómo funciona:
     · El canvas es position:fixed detrás del contenido (z negativo).
     · Cada sección define un MODO (posición ancla, tamaño, pulso, seguimiento,
       reflejo-gema, estela...). Al hacer scroll, TODOS los parámetros se
       interpolan suavemente hacia el modo de la sección activa → el orbe fluye
       de una sección a otra sin cortes, siempre el mismo (consistente).
     · La posición además tiene muelle viscoso (miel) y atracción al cursor
       según el modo (galería/club fuerte, resto sutil).
   Familia de skills condensada: orbe-cristal-liquido (base+bass), orbe-cursor-
   viscoso (muelle), orbe-gema-reflejo (u_lightDir), orbe-estela-ruta (trail 2D).
   Endurecido: resolución acotada, pausa pestaña oculta, reduced-motion (frame
   estático), fallback sin WebGL2, contextlost/restored. 1 contexto WebGL total.
   ============================================================================ */
(function () {
  "use strict";

  // --- Ajustes globales ----------------------------------------------------
  const MAX_SIDE = 1000, DPR_CAP = 1.5, STEPS = 150, INNER = 10, STATIC_T = 2.1;
  const BPM = 128;
  const STIFF = 0.055, DAMP = 0.86;   // muelle viscoso de la posición (miel)
  const LERP_K = 0.055;               // velocidad de mutación entre modos
  const REST_LIGHT = [0.32, 0.42];

  // Paleta ÚNICA (consistencia: el orbe es siempre el mismo ser)
  const PAL = { colorBlue:"#35E0FF", colorMagenta:"#7A3DFF", glowA:"#22C7FF", glowB:"#9A4DFF", background:"#060608" };

  // Parámetros interpolables + su valor base (modo hero)
  const BASE = {
    radius:.30, deform:.40, frequency:2.1, morphSpeed:1.5, rotSpeed:.14,
    specular:1.1, shininess:150, glowStrength:.85,
    liquidSpeed:.75, liquidScale:2.5, liquidBright:1.1, filament:1.8, core:.3,
    beat:1,      // amplitud del pulso de bass (0..1)
    follow:.05,  // atracción al cursor (0=anclado, 1=lo persigue)
    light:0,     // reflejo-gema: cuánto sigue la luz al cursor (0..1)
    trail:0,     // estela al arrastrar (0..1)
    ax:.5, ay:.52 // ancla (posición del orbe en el viewport, 0..1)
  };

  // MODOS por sección (solo lo que cambia respecto a BASE) — el orbe muta al pasar
  const MODES = [
    { sel:".hero",       p:{} },
    { sel:"#agenda",     p:{ radius:.15, ax:.85, ay:.46, beat:.45, morphSpeed:1.2, glowStrength:.6, follow:.1 } },
    { sel:"#merch",      p:{ radius:.13, ax:.12, ay:.5,  beat:0,   morphSpeed:.9,  glowStrength:.55 } },
    { sel:"#news",       p:{ radius:.12, ax:.87, ay:.5,  beat:0,   morphSpeed:.9,  glowStrength:.5 } },
    { sel:"#residentes", p:{ radius:.14, ax:.12, ay:.45, beat:0,   glowStrength:.55 } },
    { sel:"#galeria",    p:{ radius:.18, beat:0, follow:.9, trail:1, morphSpeed:1.2, glowStrength:.7 } },
    { sel:"#club",       p:{ radius:.20, beat:0, follow:.8, morphSpeed:.9, glowStrength:.6 } },
    { sel:"#body",       p:{ radius:.30, ax:.5, ay:.5, beat:0, light:1, morphSpeed:.45, rotSpeed:.06,
                             shininess:220, specular:1.6, glowStrength:.55, liquidSpeed:.28, filament:1.0 } },
    { sel:"#sonar",      p:{ radius:.14, ax:.82, ay:.42, beat:0 } },
    { sel:"#partners",   p:{ radius:.12, ax:.5,  ay:.8,  beat:0, glowStrength:.5 } },
    { sel:"#newsletter", p:{ radius:.14, ax:.85, ay:.45, beat:0 } },
    { sel:"#faqs",       p:{ radius:.12, ax:.1,  ay:.5,  beat:0, glowStrength:.45 } },
    { sel:"#tickets",    p:{ radius:.18, ax:.5,  ay:.5,  beat:.8 } },
    { sel:"#footer",     p:{ radius:.15, ax:.85, ay:.3,  beat:0, glowStrength:.6 } },
  ];

  const canvas  = document.getElementById("orbGlobal");
  const trailCv = document.getElementById("orbTrail");
  const fb      = document.getElementById("orbFallback");
  if (!canvas) return;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hex = h => { h=h.replace("#",""); if(h.length===3) h=h.split("").map(c=>c+c).join(""); const n=parseInt(h,16); return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]; };
  const rgbInt = h => { const c=hex(h); return [Math.round(c[0]*255),Math.round(c[1]*255),Math.round(c[2]*255)]; };

  function activateFallback(){
    canvas.style.display="none"; if(trailCv) trailCv.style.display="none";
    if(fb){ fb.style.display="block"; fb.style.setProperty("--fb-a",PAL.colorBlue); fb.style.setProperty("--fb-b",PAL.colorMagenta); }
  }

  let gl = canvas.getContext("webgl2", { antialias:false, alpha:false, powerPreference:"high-performance" });
  if (!gl){ activateFallback(); return; }

  // --- shader (núcleo de la familia con u_center + u_lightDir + u_glint) ----
  const VERT = `#version 300 es
layout(location=0) in vec2 a_pos; out vec2 v_uv;
void main(){ v_uv=a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.,1.); }`;
  const FRAG = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 fragColor;
uniform float u_time; uniform vec2 u_res; uniform vec2 u_center; uniform vec3 u_lightDir; uniform float u_glint;
uniform float u_radius,u_deform,u_freq,u_morphSpeed,u_rotSpeed,u_specular,u_shininess,u_glowStrength,u_liquidSpeed,u_liquidScale,u_liquidBright,u_filament,u_core,u_blend;
uniform vec3 u_colBlue,u_colMag,u_glowA,u_glowB,u_bg;
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float blobField(vec3 p){ float t=u_time*u_morphSpeed,f=u_freq,d=0.;
  d+=sin(p.x*2.6*f+t); d+=sin(p.y*2.9*f-t*.8+1.3); d+=sin(p.z*3.2*f+t*1.2+2.7);
  d+=sin((p.x+p.z)*2.2*f-t*.9+4.1); d+=sin((p.y-p.x)*2.4*f+t*.7+.6); return d*.2; }
float mapBlob(vec3 p){ float t=u_time*u_rotSpeed; p.xy*=rot(t*.7); p.yz*=rot(t*.5);
  return length(p)-(u_radius+u_deform*blobField(p)); }
vec3 calcNormal(vec3 p){ vec2 e=vec2(.0015,0.); return normalize(vec3(
  mapBlob(p+e.xyy)-mapBlob(p-e.xyy), mapBlob(p+e.yxy)-mapBlob(p-e.yxy), mapBlob(p+e.yyx)-mapBlob(p-e.yyx))); }
float hash13(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float v=0.,a=.5; for(int i=0;i<3;i++){ v+=a*vnoise3(p); p*=2.03; a*=.5; } return v; }
float liquid(vec3 p){ float t=u_time*u_liquidSpeed; p*=u_liquidScale; p.xy*=rot(t*.15); p.yz*=rot(t*.1);
  vec3 w=vec3(fbm3(p+t*.2),fbm3(p+vec3(4.3,1.2,-t*.15)),fbm3(p.zxy+vec3(7.7,2.3,t*.1))); return fbm3(p+1.8*w); }
void main(){
  vec2 p=v_uv*2.-1.; p.x*=u_res.x/u_res.y;
  vec2 c=(u_center*2.-1.); c.x*=u_res.x/u_res.y; c.y=-c.y; p-=c;
  vec3 ro=vec3(0,0,3), rd=normalize(vec3(p,-1.8));
  float t=0.,minD=1e3; bool hit=false; vec3 pos=ro;
  for(int i=0;i<${STEPS};i++){ pos=ro+rd*t; float d=mapBlob(pos); minD=min(minD,d);
    if(d<.001){hit=true;break;} t+=d*.4; if(t>6.)break; }
  vec3 E=vec3(0.);
  if(hit){ vec3 n=calcNormal(pos),v=-rd; float fres=pow(1.-max(dot(n,v),0.),3.);
    vec3 rp=pos+rd*.04,inner=vec3(0.); float tr=1.;
    for(int k=0;k<${INNER};k++){ float raw=liquid(rp); float dens=smoothstep(.3,.7,raw);
      float fil=pow(1.-abs(2.*raw-1.),5.); vec3 col=mix(u_colMag,u_colBlue,.5+.5*sin(raw*6.+u_time*.3+rp.y*2.5));
      vec3 emit=col*dens*.55+col*fil*u_filament+vec3(1.)*pow(fil,3.)*u_filament*.4;
      emit+=u_colBlue*smoothstep(.5,0.,length(rp))*u_core; inner+=tr*emit*.17; tr*=.84; rp+=rd*.11; if(length(rp)>1.)break; }
    E+=inner*(1.-fres*.6)*u_liquidBright;
    E+=mix(u_colMag,u_colBlue,.5+.5*(n.x*.7+n.y*.45))*fres*1.3;
    vec3 l1=normalize(u_lightDir), l2=normalize(vec3(-.7,.25,.55));
    vec3 h1=normalize(l1+v), h2=normalize(l2+v); float nh1=max(dot(n,h1),0.);
    E+=vec3(1.)*pow(nh1,u_shininess)*1.3*u_specular;
    E+=u_glint*vec3(.85,.94,1.)*pow(nh1,u_shininess*.16)*0.5*u_specular;
    E+=vec3(.8,.9,1.)*pow(max(dot(n,h2),0.),u_shininess*.45)*.6*u_specular;
  } else { float g=exp(-minD*5.5); float ang=atan(rd.y,rd.x);
    vec3 gc=mix(u_glowA,u_glowB,.5+.5*sin(ang*3.+u_time*.5));
    E+=(gc*g*1.4+vec3(.6,.8,1.)*pow(g,3.)*.7)*u_glowStrength; }
  vec3 col=mix(u_bg+E, mix(u_bg,E/(1.+E),clamp(max(E.r,max(E.g,E.b)),0.,1.)), u_blend);
  fragColor=vec4(clamp(col,0.,1.),1.); }`;

  let prog, vao, U;
  function buildGL(){
    const sh=(ty,s)=>{ const o=gl.createShader(ty); gl.shaderSource(o,s); gl.compileShader(o);
      if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)||"compile"); return o; };
    prog=gl.createProgram(); gl.attachShader(prog,sh(gl.VERTEX_SHADER,VERT)); gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FRAG));
    gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)||"link");
    gl.useProgram(prog); vao=gl.createVertexArray(); gl.bindVertexArray(vao);
    const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    const u=n=>gl.getUniformLocation(prog,n);
    U={time:u("u_time"),res:u("u_res"),center:u("u_center"),lightDir:u("u_lightDir"),glint:u("u_glint"),
      radius:u("u_radius"),deform:u("u_deform"),freq:u("u_freq"),morphSpeed:u("u_morphSpeed"),rotSpeed:u("u_rotSpeed"),
      specular:u("u_specular"),shininess:u("u_shininess"),glowStrength:u("u_glowStrength"),colBlue:u("u_colBlue"),
      colMag:u("u_colMag"),glowA:u("u_glowA"),glowB:u("u_glowB"),liquidSpeed:u("u_liquidSpeed"),liquidScale:u("u_liquidScale"),
      liquidBright:u("u_liquidBright"),filament:u("u_filament"),core:u("u_core"),bg:u("u_bg"),blend:u("u_blend")};
  }
  try { buildGL(); } catch(e){ activateFallback(); return; }

  // --- estado interpolable ---------------------------------------------------
  const cur = Object.assign({}, BASE);          // parámetros vivos (se lerpean)
  const sections = MODES.map(m => ({ el: document.querySelector(m.sel), p: Object.assign({}, BASE, m.p) }))
                        .filter(s => s.el);
  let px=0.5, py=0.35;                          // posición del orbe (viewport 0..1)
  let vx=0, vy=0;                               // velocidad (muelle)
  let mx=0.5, my=0.5, mSeen=false;              // cursor (viewport 0..1)
  let lcx=REST_LIGHT[0], lcy=REST_LIGHT[1];     // luz-gema suavizada
  let dragging=false;
  const route=[];                               // estela

  // cursor global (pointer: funciona con dedo)
  if (!reduced){
    addEventListener("pointermove", e => {
      mx=e.clientX/innerWidth; my=e.clientY/innerHeight; mSeen=true;
      if(dragging && cur.trail>0.3) route.push({ x:e.clientX, y:e.clientY, t:performance.now() });
    }, { passive:true });
    addEventListener("pointerdown", e => { dragging=true; mx=e.clientX/innerWidth; my=e.clientY/innerHeight; mSeen=true;
      if(cur.trail>0.3) route.push({ x:e.clientX, y:e.clientY, t:performance.now() }); }, { passive:true });
    addEventListener("pointerup",   () => { dragging=false; }, { passive:true });
    addEventListener("pointercancel",()=>{ dragging=false; }, { passive:true });
  }

  // sección activa = la que cruza el centro del viewport
  function activeMode(){
    const mid = innerHeight*0.5;
    for (const s of sections){
      const r = s.el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return s.p;
    }
    return sections[0] ? sections[0].p : BASE;
  }

  // --- tamaño ---------------------------------------------------------------
  let pr=1, tctx=null, tpr=1;
  if (trailCv) tctx = trailCv.getContext("2d");
  function resize(){
    pr = Math.min(devicePixelRatio||1, DPR_CAP);
    const L = Math.max(innerWidth, innerHeight);
    if (L*pr > MAX_SIDE) pr = MAX_SIDE/L;
    const w=Math.max(1,Math.round(innerWidth*pr)), h=Math.max(1,Math.round(innerHeight*pr));
    if (canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; }
    if (trailCv){
      let tp=Math.min(devicePixelRatio||1,DPR_CAP); const TL=720; if(L*tp>TL) tp=TL/L;
      const tw=Math.max(1,Math.round(innerWidth*tp)), th=Math.max(1,Math.round(innerHeight*tp));
      if (trailCv.width!==tw||trailCv.height!==th){ trailCv.width=tw; trailCv.height=th; }
      tpr=tp; tctx.setTransform(tp,0,0,tp,0,0);
    }
  }

  const rgbA = rgbInt(PAL.glowA), rgbB = rgbInt(PAL.colorMagenta);
  function drawTrail(now){
    tctx.globalCompositeOperation="destination-out"; tctx.fillStyle="rgba(0,0,0,0.05)"; tctx.fillRect(0,0,innerWidth,innerHeight);
    while(route.length && now-route[0].t>1100) route.shift();
    if(route.length<2 || cur.trail<0.05) return;
    tctx.globalCompositeOperation="lighter"; tctx.lineCap="round"; tctx.lineJoin="round";
    for(let i=1;i<route.length;i++){ const a=route[i-1],b=route[i]; const age=(now-b.t)/1100; if(age>=1) continue;
      const life=1-age, seg=Math.hypot(b.x-a.x,b.y-a.y), slow=1-Math.min(seg/40,1), mixT=Math.min(age*1.15,1);
      const cr=Math.round(rgbA[0]+(rgbB[0]-rgbA[0])*mixT), cg=Math.round(rgbA[1]+(rgbB[1]-rgbA[1])*mixT), cb=Math.round(rgbA[2]+(rgbB[2]-rgbA[2])*mixT);
      tctx.strokeStyle="rgba("+cr+","+cg+","+cb+","+(Math.min((0.14+0.22*slow)*life*1.9,0.9)*cur.trail)+")";
      tctx.lineWidth=30*(0.55+0.9*life); tctx.beginPath(); tctx.moveTo(a.x,a.y); tctx.lineTo(b.x,b.y); tctx.stroke(); }
  }

  function draw(time){
    resize();
    const M = activeMode();
    // muta TODOS los parámetros hacia el modo activo (fluidez entre secciones)
    for (const k in BASE){ if(k==="ax"||k==="ay") continue; cur[k] += (M[k]-cur[k])*LERP_K; }
    cur.ax += (M.ax-cur.ax)*LERP_K; cur.ay += (M.ay-cur.ay)*LERP_K;
    // objetivo de posición = ancla mezclada con el cursor según follow
    const f = mSeen ? cur.follow : 0;
    const tx = cur.ax*(1-f) + mx*f, ty = cur.ay*(1-f) + my*f;
    vx += (tx-px)*STIFF; vy += (ty-py)*STIFF; vx*=DAMP; vy*=DAMP; px+=vx; py+=vy;
    // luz-gema hacia el cursor según light
    const ltx = (mx*2-1)*cur.light + REST_LIGHT[0]*(1-cur.light);
    const lty = (-(my*2-1))*cur.light + REST_LIGHT[1]*(1-cur.light);
    lcx += (ltx-lcx)*0.1; lcy += (lty-lcy)*0.1;
    // pulso: si hay SONIDO activo (orbe-sonido.js), el orbe baila con el audio REAL
    // (energía de graves del AnalyserNode); si no, pulso sintético a BPM según beat.
    let glow=cur.glowStrength, rad=cur.radius, def=cur.deform;
    const au = (window.__orbAudio && window.__orbAudio.active) ? window.__orbAudio.level() : 0;
    if (!reduced && au > 0.01){
      glow = cur.glowStrength*(1+0.6*au);
      rad  = cur.radius*(1+0.07*au);
      def  = cur.deform*(1+0.5*au);
    } else if (!reduced && cur.beat>0.02){
      const bb=Math.pow(0.5+0.5*Math.sin(time*Math.PI*2*(BPM/60)),3.0)*cur.beat;
      glow=cur.glowStrength*(1+0.28*bb); rad=cur.radius*(1+0.022*bb);
    }
    // render full-viewport (aspect-correct en el shader)
    const bg=hex(PAL.background); gl.clearColor(bg[0],bg[1],bg[2],1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform1f(U.time,time); gl.uniform2f(U.res,canvas.width,canvas.height);
    gl.uniform2f(U.center,px,py);
    gl.uniform3f(U.lightDir,lcx,lcy,0.8); gl.uniform1f(U.glint,cur.light);
    gl.uniform1f(U.radius,rad); gl.uniform1f(U.deform,def); gl.uniform1f(U.freq,cur.frequency);
    gl.uniform1f(U.morphSpeed,cur.morphSpeed); gl.uniform1f(U.rotSpeed,cur.rotSpeed);
    gl.uniform1f(U.specular,cur.specular); gl.uniform1f(U.shininess,cur.shininess); gl.uniform1f(U.glowStrength,glow);
    gl.uniform3fv(U.colBlue,hex(PAL.colorBlue)); gl.uniform3fv(U.colMag,hex(PAL.colorMagenta));
    gl.uniform3fv(U.glowA,hex(PAL.glowA)); gl.uniform3fv(U.glowB,hex(PAL.glowB));
    gl.uniform1f(U.liquidSpeed,cur.liquidSpeed); gl.uniform1f(U.liquidScale,cur.liquidScale); gl.uniform1f(U.liquidBright,cur.liquidBright);
    gl.uniform1f(U.filament,cur.filament); gl.uniform1f(U.core,cur.core);
    gl.uniform3fv(U.bg,bg); gl.uniform1f(U.blend,0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    if (tctx && !reduced) drawTrail(time*1000);
    // estado observable (verificación/depuración)
    window.__orbState = { px, py, radius:cur.radius, follow:cur.follow, light:cur.light, trail:cur.trail, beat:cur.beat, audio:au };
  }

  // --- bucle (siempre visible al ser fixed → pausa solo con pestaña oculta) --
  let raf=0, run=false, vis=true;
  const tick=t=>{ if(!run) return; draw(t*.001); raf=requestAnimationFrame(tick); };
  const go=()=>{ if(vis && !reduced){ if(!run){ run=true; raf=requestAnimationFrame(tick); } }
    else { run=false; cancelAnimationFrame(raf); if(reduced) draw(STATIC_T); } };
  document.addEventListener("visibilitychange", ()=>{ vis=!document.hidden; go(); });
  addEventListener("resize", ()=>{ if(reduced) draw(STATIC_T); });
  canvas.addEventListener("webglcontextlost", e=>{ e.preventDefault(); run=false; cancelAnimationFrame(raf); });
  canvas.addEventListener("webglcontextrestored", ()=>{ try{ buildGL(); resize(); draw(STATIC_T); go(); }catch(e){ activateFallback(); } });
  // primer frame INMEDIATO (síncrono): el orbe se ve aunque el rAF esté pausado
  // (pestaña en segundo plano / panel de preview oculto). El rAF anima cuando es visible.
  resize(); draw(STATIC_T);
  go();
})();
