/* ============================================================================
   MOOG · ORBE + SONIDO — el orbe baila con el audio REAL (candidata a skill:
   orbe-audio-reactivo). Autocontenido: sintetiza un groove techno con Web Audio
   (kick 128 BPM + hats + sub, cero archivos) y lo pasa por un AnalyserNode.
   El orbe global lee la energía de los graves → late con el kick de verdad.
   API pública:
     window.orbSound.toggle() / .enable() / .disable()
     window.orbSound.connect(mediaElement)  → conecta un <audio>/<video> real
     window.__orbAudio = { active, level() } → lo consume orbe-global.js
   Respeta autoplay: el AudioContext solo se crea con el click del usuario.
   ============================================================================ */
(function () {
  "use strict";
  const BPM = 128, BEAT = 60 / BPM;

  let ctx = null, analyser = null, master = null, running = false, timer = 0, nextT = 0;
  let bins = null, smooth = 0;

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.5;
    master.connect(analyser); analyser.connect(ctx.destination);
    bins = new Uint8Array(analyser.frequencyBinCount);
  }

  /* --- groove sintetizado (kick + hat + sub), agendado con lookahead --- */
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.26);
  }
  function hat(t) {
    const len = 0.05, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 8000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + len);
  }
  function sub(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 55;
    g.gain.setValueAtTime(0.20, t); g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.45);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + BEAT * 0.5);
  }
  function scheduler() {
    // agenda 150ms por delante (robusto ante jitter del main thread)
    while (nextT < ctx.currentTime + 0.15) {
      kick(nextT);
      hat(nextT + BEAT / 2);
      sub(nextT + BEAT / 2);
      nextT += BEAT;
    }
  }

  function enable() {
    if (!ctx) build();
    const startLoop = () => {
      if (!running) { running = true; nextT = ctx.currentTime + 0.08; timer = setInterval(scheduler, 40); }
      sync();
    };
    // esperar al resume (el AudioContext arranca 'suspended' hasta el gesto del usuario)
    if (ctx.state === "suspended" && ctx.resume) ctx.resume().then(startLoop, startLoop);
    else startLoop();
  }
  function disable() {
    running = false; clearInterval(timer);
    if (ctx && ctx.suspend) ctx.suspend();
    sync();
  }
  function toggle(){ running ? disable() : enable(); }

  /* conecta un <audio>/<video> real: su señal pasa por el analyser (el orbe la baila) */
  const tapped = new WeakSet();
  function connect(el) {
    if (!ctx) build();
    if (tapped.has(el)) return;
    const src = ctx.createMediaElementSource(el);
    src.connect(master); tapped.add(el);
  }

  /* nivel 0..1 = energía de graves (bins bajos ≈ kick), con ataque rápido y caída lenta */
  function level() {
    if (!running || !analyser) return 0;
    analyser.getByteFrequencyData(bins);
    let s = 0; const N = 4;                     // primeros bins ≈ 0-750Hz (kick/sub)
    for (let i = 0; i < N; i++) s += bins[i];
    const raw = Math.min(Math.max((s / N - 40) / 180, 0), 1);
    smooth = raw > smooth ? smooth + (raw - smooth) * 0.55 : smooth + (raw - smooth) * 0.10;
    return smooth;
  }

  window.__orbAudio = { get active(){ return running; }, level };
  window.orbSound = { enable, disable, toggle, connect, debug(){
    let max=-1; if(analyser){ analyser.getByteFrequencyData(bins); for(const v of bins){ if(v>max) max=v; } }
    return { state: ctx?ctx.state:null, ct: ctx?Math.round(ctx.currentTime*1000)/1000:null, maxBin:max, running };
  }};

  /* --- botón (piel: mono + acento, área táctil ≥44px) --- */
  const btn = document.createElement("button");
  btn.id = "sndBtn"; btn.type = "button";
  btn.setAttribute("aria-pressed", "false");
  btn.textContent = "♫ SONIDO OFF";
  btn.style.cssText = "position:fixed;right:clamp(14px,3vw,28px);bottom:clamp(14px,3vw,24px);z-index:70;" +
    "min-height:44px;padding:12px 18px;border-radius:999px;border:1px solid #3DE1FF;background:rgba(6,6,8,.72);" +
    "color:#3DE1FF;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.18em;cursor:pointer;" +
    "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background .3s,color .3s;";
  btn.addEventListener("click", () => { toggle(); });
  function sync() {
    btn.setAttribute("aria-pressed", String(running));
    btn.textContent = running ? "♫ SONIDO ON" : "♫ SONIDO OFF";
    btn.style.background = running ? "#3DE1FF" : "rgba(6,6,8,.72)";
    btn.style.color = running ? "#04121a" : "#3DE1FF";
  }
  (document.body ? Promise.resolve() : new Promise(r => addEventListener("DOMContentLoaded", r)))
    .then(() => document.body.appendChild(btn));
})();
