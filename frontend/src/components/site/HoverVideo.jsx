import React, { useEffect, useRef, useState } from "react";

// Vídeo corto del producto: se reproduce al pasar el cursor (o al entrar en pantalla en móvil)
export default function HoverVideo({ src, poster, playing, label, className = "" }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [playing]);

  return (
    <div className={`relative overflow-hidden bg-[#14130f] ${className}`} data-testid="hover-video">
      {poster && (
        <img
          src={poster}
          alt={label || ""}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${playing && ready ? "opacity-0" : "opacity-100"}`}
        />
      )}
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing && ready ? "opacity-100" : "opacity-0"}`}
      />
      {label && (
        <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-[#14130f]/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#efe9df] backdrop-blur">
          <span className={`h-1.5 w-1.5 rounded-full ${playing ? "animate-pulse bg-[#e8a15b]" : "bg-white/40"}`} />
          {label}
        </span>
      )}
    </div>
  );
}
