import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Lock } from "lucide-react";
import { EASE } from "./helpers";
import CyclingImages from "./CyclingImages";

function CyclingPreview({ project, interval = 900 }) {
  const list = project.previews?.length ? project.previews : [project.cover];
  const [i, setI] = useState(0);
  useEffect(() => {
    list.forEach((src) => {
      const im = new Image();
      im.src = src;
    });
    if (list.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % list.length), interval);
    return () => clearInterval(t);
  }, [project.id]);
  return (
    <div className="relative aspect-[16/10] w-[380px] bg-[#14130f]">
      <AnimatePresence initial={false}>
        <motion.img
          key={list[i]}
          src={list[i]}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </AnimatePresence>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {list.map((_, k) => (
          <span key={k} className={`h-1 rounded-full transition-all duration-300 ${k === i ? "w-5 bg-[#e8a15b]" : "w-1.5 bg-white/60"}`} />
        ))}
      </div>
    </div>
  );
}

export default function ProjectIndex({ items, dark }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 22 });
  const sy = useSpring(y, { stiffness: 180, damping: 22 });

  const onMove = (e) => {
    x.set(e.clientX);
    y.set(e.clientY);
  };

  const fg = dark ? "text-[#efe9df]" : "text-[#14130f]";
  const sub = dark ? "text-white/50" : "text-black/50";
  const line = dark ? "border-white/10" : "border-black/10";

  return (
    <div onMouseMove={onMove} onMouseLeave={() => setHover(null)} className={`relative rounded-[28px] p-4 sm:p-8 md:p-10 ${dark ? "bg-[#100f0d]/90" : "bg-[#f1ece2]"} ${fg}`}>
      <div className={`label-xs hidden grid-cols-12 gap-4 border-b pb-4 md:grid ${line} ${sub}`}>
        <span className="col-span-1">Nº</span>
        <span className="col-span-5">Proyecto</span>
        <span className="col-span-3">Tipo</span>
        <span className="col-span-1">Año</span>
        <span className="col-span-2 text-right">Estado</span>
      </div>
      {items.map((p, i) => (
        <motion.button
          key={p.id}
          data-cursor="Abrir"
          onMouseEnter={() => setHover(p)}
          onClick={() => navigate(`/proyecto/${p.id}`)}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE, delay: i * 0.06 }}
          className={`group relative grid w-full grid-cols-12 items-center gap-4 overflow-hidden border-b py-6 text-left md:py-8 ${line}`}
        >
          <span className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" style={{ background: `${p.accent}1f` }} />
          <span className={`font-mono-d relative col-span-2 text-xs md:col-span-1 ${sub}`}>{String(i + 1).padStart(2, "0")}</span>
          <span className="relative col-span-10 flex items-center gap-4 md:col-span-5">
            <img src={p.cover} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover md:hidden" />
            <span className="font-serif-d text-3xl font-light transition-transform duration-500 group-hover:translate-x-3 group-hover:italic md:text-5xl">{p.title}</span>
            {p.token && <span className="font-mono-d hidden text-sm font-bold md:inline" style={{ color: p.accent }}>{p.token.ticker}</span>}
            {p.demo && <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${line} ${sub}`}>Demo</span>}
          </span>
          <span className={`relative col-span-3 hidden text-sm md:block ${sub}`}>{p.type}</span>
          <span className={`font-mono-d relative col-span-1 hidden text-sm md:block ${sub}`}>{p.year}</span>
          <span className="relative col-span-2 hidden items-center justify-end gap-3 md:flex">
            <span className={`flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] ${sub}`}>
              {p.access === "private" && <Lock className="h-3 w-3" />} {p.status}
            </span>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border transition-[background-color,transform] duration-500 group-hover:rotate-45 group-hover:bg-[#e8a15b] group-hover:text-[#14130f] ${line}`}>
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </span>
        </motion.button>
      ))}

      {createPortal(
        <motion.div className="pointer-events-none fixed left-0 top-0 z-[80] hidden md:block" style={{ x: sx, y: sy }}>
          <AnimatePresence>
            {hover && (
              <motion.div
                key={hover.id}
                initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: -3 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="-translate-y-1/2 translate-x-8 overflow-hidden rounded-xl border-4 border-[#14130f] shadow-2xl"
              >
                <CyclingImages project={hover} interval={1000} className="aspect-[16/10] w-[400px]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
