import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "./helpers";

export default function Preloader({ onDone, onReveal }) {
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const total = 1500;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / total);
      setCount(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setTimeout(() => {
          setLeaving(true);
          onReveal?.();
        }, 200);
        setTimeout(() => onDone?.(), 1150);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, onReveal]);

  return (
    <motion.div
      data-testid="preloader"
      className="fixed inset-0 z-[150] flex flex-col justify-between bg-[#14130f] p-6 text-[#efe9df] md:p-10"
      initial={{ y: 0 }}
      animate={leaving ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="label-xs flex justify-between text-[#efe9df]/50">
        <span>Archivo vivo</span>
        <span>Vol. 2026</span>
      </div>
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {"OOOX".split("").map((c, i) => (
          <span key={i} className="overflow-hidden">
            <motion.span
              className="font-serif-d block text-[22vw] font-light leading-none md:text-[14vw]"
              initial={{ y: "105%" }}
              animate={{ y: leaving ? "-105%" : "0%" }}
              transition={{ duration: 0.9, ease: EASE, delay: leaving ? i * 0.04 : 0.1 + i * 0.08 }}
              style={{ fontStyle: i === 3 ? "italic" : "normal", color: i === 3 ? "#e8a15b" : undefined }}
            >
              {c}
            </motion.span>
          </span>
        ))}
      </div>
      <div className="flex items-end justify-between">
        <span className="label-xs text-[#efe9df]/50">Proyectos · Ideas · Herramientas</span>
        <span className="font-mono-d text-4xl tabular-nums md:text-6xl">{String(count).padStart(3, "0")}</span>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] bg-[#e8a15b]"
        style={{ width: `${count}%` }}
      />
    </motion.div>
  );
}
