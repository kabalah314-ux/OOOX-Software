import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1];

export function Reveal({ children, delay = 0, y = 40, className = "", once = true, as = "div" }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

export function MaskLines({ lines, className = "", lineClassName = "", delay = 0, animate: forced }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const show = forced === undefined ? inView : forced;
  return (
    <span ref={ref} className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${lineClassName} ${typeof l === "object" && l.className ? l.className : ""}`}
            initial={{ y: "110%" }}
            animate={show ? { y: "0%" } : { y: "110%" }}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.09 }}
          >
            {typeof l === "object" ? l.text : l}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Magnetic({ children, strength = 0.35, className = "" }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={{ x: sx, y: sy }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}

export function LiveClock({ tz = "Europe/Madrid", className = "", seconds = true }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = now.toLocaleTimeString("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined });
  return <span className={className}>{s}</span>;
}

export function Counter({ to = 10, pad = 2, duration = 1.6, className = "" }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - start) / (duration * 1000));
            setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref} className={className}>
      {String(val).padStart(pad, "0")}
    </span>
  );
}

export function StatusPill({ tone = "live", label, dark = false, accent }) {
  const color = tone === "live" ? "#34d399" : tone === "build" ? accent || "#facc15" : "#e8a15b";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
        dark ? "border-white/15 bg-white/5 text-[#efe9df]" : "border-black/10 bg-black/[0.03] text-[#14130f]"
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="ping-soft absolute inline-flex h-full w-full rounded-full" style={{ background: color }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {label}
    </span>
  );
}

export function useIsDesktop(bp = 1024) {
  const [d, setD] = useState(typeof window !== "undefined" ? window.innerWidth >= bp : true);
  useEffect(() => {
    const on = () => setD(window.innerWidth >= bp);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [bp]);
  return d;
}

export const domainOf = (url = "") => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const xHandleOf = (url = "") => {
  const m = String(url).match(/(?:x|twitter)\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : "";
};
