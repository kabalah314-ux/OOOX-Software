import React from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { SECTIONS, useActiveSection } from "@/lib/useActiveSection";
import { useSmooth } from "@/lib/smooth";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return <motion.div className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-[#e8a15b]" style={{ scaleX }} />;
}

export default function SectionRail() {
  const active = useActiveSection();
  const { scrollTo } = useSmooth();
  const visible = active && active !== "inicio";

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          data-testid="section-rail"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 text-white mix-blend-difference xl:flex"
        >
          {SECTIONS.map((s) => {
            const on = active === s.id;
            return (
              <button key={s.id} data-testid={`rail-${s.id}`} onClick={() => scrollTo(`#${s.id}`)} className="group flex items-center gap-3">
                <span
                  className={`font-mono-d text-[10px] uppercase tracking-[0.2em] transition-[opacity,transform] duration-500 ${
                    "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  }`}
                >
                  {s.n} · {s.label}
                </span>
                <span className={`h-px bg-white transition-[width,opacity] duration-500 ${on ? "w-6 opacity-100" : "w-3 opacity-40 group-hover:w-5"}`} />
              </button>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
