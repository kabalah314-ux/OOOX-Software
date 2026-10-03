import React, { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { domainOf } from "./helpers";
import CyclingImages from "./CyclingImages";

export function BrowserMockup({ project, dark = false, active = false, onToggle, className = "", frameClass = "aspect-[16/10]", cycle = false }) {
  if (cycle) {
    return (
      <div className={`overflow-hidden rounded-2xl border shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ${dark ? "border-white/10 bg-[#1b1a17]" : "border-black/10 bg-white"} ${className}`}>
        <div className={`flex items-center gap-3 border-b px-4 py-2.5 ${dark ? "border-white/10" : "border-black/10"}`}>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className={`font-mono-d mx-auto max-w-[70%] truncate rounded-full px-4 py-1 text-[11px] ${dark ? "bg-white/5 text-white/55" : "bg-black/[0.04] text-black/55"}`}>
            {domainOf(project.url)}
          </div>
        </div>
        <CyclingImages project={project} interval={1600} className={`w-full ${frameClass}`} />
      </div>
    );
  }
  const frameRef = useRef(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const set = () => el.style.setProperty("--frame-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      onClick={onToggle}
      className={`group overflow-hidden rounded-2xl border shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ${dark ? "border-white/10 bg-[#1b1a17]" : "border-black/10 bg-white"} ${className}`}
    >
      <div className={`flex items-center gap-3 border-b px-4 py-2.5 ${dark ? "border-white/10" : "border-black/10"}`}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className={`font-mono-d mx-auto flex max-w-[70%] items-center gap-1.5 truncate rounded-full px-4 py-1 text-[11px] ${dark ? "bg-white/5 text-white/55" : "bg-black/[0.04] text-black/55"}`}>
          {project.access === "private" && <Lock className="h-3 w-3" />}
          {domainOf(project.url)}
        </div>
      </div>
      <div ref={frameRef} className={`relative w-full overflow-hidden ${frameClass}`}>
        <img src={project.long} alt={`Captura de ${project.title}`} loading="lazy" className={`shot-scroll absolute left-0 top-0 w-full ${active ? "is-active" : ""}`} />
        {project.access === "private" && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-[#14130f]/85 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#efe9df] backdrop-blur">
            <Lock className="h-3 w-3" /> Acceso privado · capturas reales
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.12), transparent 40%)" }}
        />
      </div>
    </div>
  );
}

export function PhoneMockup({ project, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-[28px] border-[6px] border-[#14130f] bg-[#14130f] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ${className}`}>
      <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] bg-black">
        <img src={project.mobile} alt={`${project.title} móvil`} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top" />
      </div>
    </div>
  );
}
