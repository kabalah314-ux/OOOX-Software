import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Lock } from "lucide-react";
import { domainOf } from "./helpers";

export function BrowserMockup({ project, dark = false, tilt = true, active = false, onToggle, className = "", frameClass = "aspect-[16/10]" }) {
  const frameRef = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 14 });
  const sry = useSpring(ry, { stiffness: 120, damping: 14 });
  const glareX = useTransform(sry, [-8, 8], ["0%", "100%"]);
  const glare = useTransform(glareX, (g) => `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) ${g}, transparent 70%)`);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty("--frame-h", `${el.clientHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onMove = (e) => {
    if (!tilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 10);
    rx.set(py * -8);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div className={`[perspective:1400px] ${className}`} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onToggle}>
      <motion.div
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
        className={`relative overflow-hidden rounded-[14px] border shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55)] ${
          dark ? "border-white/10 bg-[#0c0b0a]" : "border-black/10 bg-[#fbf9f4]"
        }`}
      >
        <div className={`flex items-center gap-3 border-b px-3 py-2.5 ${dark ? "border-white/10 bg-[#161512]" : "border-black/5 bg-[#f1ece2]"}`}>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className={`mx-auto flex max-w-[70%] items-center gap-1.5 truncate rounded-md px-3 py-1 font-mono-d text-[10px] ${dark ? "bg-white/5 text-white/55" : "bg-black/5 text-black/55"}`}>
            {project.access === "private" && <Lock className="h-3 w-3 shrink-0" />}
            <span className="truncate">{domainOf(project.url)}</span>
          </div>
          <span className="w-10" />
        </div>
        <div ref={frameRef} className={`relative w-full overflow-hidden ${frameClass}`}>
          <img
            src={project.long}
            alt={`Captura de ${project.title}`}
            loading="lazy"
            className={`shot-scroll absolute left-0 top-0 w-full ${active ? "is-active" : ""}`}
          />
          {project.access === "private" && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-[#14130f]/85 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#efe9df] backdrop-blur">
              <Lock className="h-3 w-3" /> Acceso privado · capturas reales
            </div>
          )}
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: glare }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export function PhoneMockup({ src, alt = "", className = "" }) {
  return (
    <div className={`rounded-[30px] border-[6px] border-[#14130f] bg-[#14130f] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ${className}`}>
      <div className="relative overflow-hidden rounded-[24px]">
        <span className="absolute left-1/2 top-1.5 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-[#14130f]" />
        <img src={src} alt={alt} loading="lazy" className="aspect-[9/19] w-full object-cover object-top" />
      </div>
    </div>
  );
}
