import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// previews: array of string | { src, y (0-100, vertical slice of a long image), label }
export const normPreviews = (project) =>
  (project.previews?.length ? project.previews : [project.cover]).map((p) => (typeof p === "string" ? { src: p } : p));

export default function CyclingImages({ project, interval = 1000, playing = true, className = "", showLabel = true, dots = true }) {
  const list = normPreviews(project);
  const [i, setI] = useState(0);

  useEffect(() => {
    [...new Set(list.map((l) => l.src))].forEach((src) => {
      const im = new Image();
      im.src = src;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    if (!playing || list.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % list.length), interval);
    return () => clearInterval(t);
  }, [playing, list.length, interval]);

  const cur = list[i] || list[0];

  return (
    <div className={`relative overflow-hidden bg-[#14130f] ${className}`}>
      <AnimatePresence initial={false}>
        <motion.img
          key={i}
          src={cur.src}
          alt={cur.label || project.title}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `center ${cur.y ?? 0}%` }}
        />
      </AnimatePresence>
      {showLabel && cur.label && (
        <span className="absolute left-3 top-3 rounded-full bg-[#14130f]/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#efe9df] backdrop-blur">
          {cur.label}
        </span>
      )}
      {dots && list.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">
          {list.map((_, k) => (
            <span key={k} className={`h-1 rounded-full transition-all duration-300 ${k === i ? "w-5 bg-[#e8a15b]" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
