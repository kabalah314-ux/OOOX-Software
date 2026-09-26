import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useIsDesktop } from "./helpers";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeOut = (v) => 1 - Math.pow(1 - v, 3);
export const easeInOut = (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);

/**
 * Chapter — shared section transition language:
 *  - enters with a "hill arch" top edge that flattens as it rises
 *  - leaves by tilting back, shrinking and dimming (same camera pull-back as the hero)
 */
export default function Chapter({ id, targetRef, className = "", style, arch = true, recede = true, children, testid, dimColor = "#0b0a09" }) {
  const own = useRef(null);
  const ref = targetRef || own;
  const wide = useIsDesktop(768);

  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const { scrollYProgress: exit } = useScroll({ target: ref, offset: ["end end", "end start"] });

  const maxRy = wide ? 240 : 90;
  const minRy = wide ? 64 : 32;
  const minRx = wide ? 4 : 9;

  const borderRadius = useTransform([enter, exit], ([a, b]) => {
    const k = easeOut(clamp01(a * 1.15));
    const rx = arch ? 50 - k * (50 - minRx) : minRx;
    const ry = arch ? maxRy - k * (maxRy - minRy) : minRy;
    const br = recede ? clamp01(b * 2.5) * (wide ? 56 : 28) : 0;
    return `${rx}% ${rx}% ${br}px ${br}px / ${ry}px ${ry}px ${br}px ${br}px`;
  });
  const scale = useTransform(exit, (v) => (recede ? 1 - easeOut(clamp01(v)) * 0.1 : 1));
  const rotateX = useTransform(exit, (v) => (recede && wide ? clamp01(v) * 7 : 0));
  const y = useTransform(exit, (v) => (recede ? clamp01(v) * (typeof window !== "undefined" ? window.innerHeight : 800) * 0.4 : 0));
  const dim = useTransform(exit, (v) => clamp01(v * 1.2) * 0.72);

  return (
    <motion.section
      ref={ref}
      id={id}
      data-testid={testid}
      className={`relative overflow-clip ${className}`}
      style={{ borderRadius, scale, rotateX, y, transformPerspective: 1400, transformOrigin: "50% 100%", ...style }}
    >
      {children}
      {recede && <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-[60]" style={{ opacity: dim, background: dimColor }} />}
    </motion.section>
  );
}

/**
 * SunPortal — pinned stage where a small "sun" grows into a full-screen circle.
 * children receive the scroll progress (0..1) via render prop.
 */
export function SunPortal({ height = "220vh", className = "", stageClassName = "", render, testid }) {
  const ref = useRef(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const clip = useTransform(p, (v) => `circle(${3 + easeInOut(clamp01(v / 0.72)) * 74}% at 50% 50%)`);
  const ring = useTransform(p, (v) => 1 - clamp01(v / 0.35));
  return (
    <div ref={ref} data-testid={testid} className={`pointer-events-none relative ${className}`} style={{ height }}>
      <div className={`sticky top-0 h-[100svh] overflow-hidden ${stageClassName}`}>
        <motion.div className="absolute left-1/2 top-1/2 h-[14vmin] w-[14vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e8a15b]/70" style={{ opacity: ring }}>
          <span className="ping-soft absolute inset-0 rounded-full border border-[#e8a15b]/50" />
        </motion.div>
        <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
          {render(p)}
        </motion.div>
      </div>
    </div>
  );
}
