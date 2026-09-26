import React, { useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { MaskLines, LiveClock, EASE } from "./helpers";
import { projects } from "@/data/mock";
import { useSmooth } from "@/lib/smooth";

export default function Hero({ ready }) {
  const ref = useRef(null);
  const { scrollTo } = useSmooth();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1.3]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const veil = useTransform(scrollYProgress, [0, 1], [0.1, 0.75]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });
  const imgMx = useTransform(smx, (v) => v * -18);
  const imgMy = useTransform(smy, (v) => v * -12);
  const txtMx = useTransform(smx, (v) => v * 14);
  const txtMy = useTransform(smy, (v) => v * 10);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const flies = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${60 + Math.random() * 45}%`,
        size: 2 + Math.random() * 3,
        dur: 9 + Math.random() * 10,
        delay: Math.random() * -18,
        dx: `${(Math.random() - 0.5) * 120}px`,
        key: i,
      })),
    []
  );

  const webCount = projects.filter((p) => p.category === "web").length;
  const cryptoCount = projects.filter((p) => p.category === "crypto").length;

  return (
    <section ref={ref} onMouseMove={onMove} data-testid="hero-section" className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[#14130f]">
      <motion.div className="absolute inset-0" style={{ x: imgMx, y: imgMy }}>
        <motion.img
          src="/img/hero-scene.jpg"
          alt="Un prado tranquilo al atardecer, con una persona trabajando con su portátil"
          className="absolute inset-0 h-full w-full object-cover object-[35%_center] md:object-center"
          style={{ scale, y: imgY }}
          initial={{ opacity: 0, filter: "blur(12px)" }}
          animate={ready ? { opacity: 1, filter: "blur(0px)" } : {}}
          transition={{ duration: 1.6, ease: EASE }}
        />
      </motion.div>

      {/* readability veils */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,19,15,0.35),transparent_65%)]" />
      <motion.div className="pointer-events-none absolute inset-0 bg-[#14130f]" style={{ opacity: veil }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#14130f]/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#14130f]" />

      {/* fireflies */}
      <div className="pointer-events-none absolute inset-0">
        {flies.map((f) => (
          <span
            key={f.key}
            className="firefly"
            style={{ left: f.left, top: f.top, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, "--dx": f.dx }}
          />
        ))}
      </div>

      {/* headline */}
      <motion.div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center" style={{ y: textY, opacity: textOpacity }}>
        <motion.div style={{ x: txtMx, y: txtMy }}>
          <motion.p
            className="label-xs mb-8 text-[#efe9df]/80"
            initial={{ opacity: 0, y: 12 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.3, ease: EASE }}
          >
            — Archivo vivo de proyectos —
          </motion.p>
          <h1 data-testid="hero-title" className="font-serif-d text-[clamp(2.25rem,7.6vw,8rem)] font-light leading-[0.95] tracking-[-0.02em] text-[#f6f2ea] [text-shadow:0_4px_40px_rgba(20,19,15,0.35)]">
            <MaskLines
              animate={ready}
              delay={0.35}
              lines={[
                "Creo software útil",
                { text: "y práctico para quien", className: "italic" },
                { text: "lo necesita.", className: "italic text-[#ffd9a8]" },
              ]}
            />
          </h1>
        </motion.div>
      </motion.div>

      {/* bottom meta */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-6 text-[#efe9df] md:px-10 md:pb-8"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 1.1 }}
      >
        <div className="hidden md:block">
          <p className="label-xs text-[#efe9df]/55">En el archivo</p>
          <p className="mt-2 font-serif-d text-lg">
            {String(webCount).padStart(2, "0")} webs & apps <span className="text-[#efe9df]/40">/</span> {String(cryptoCount).padStart(2, "0")} crypto
          </p>
        </div>
        <button data-testid="hero-scroll-cta" onClick={() => scrollTo("#proyectos")} className="group mx-auto flex flex-col items-center gap-3 md:mx-0">
          <span className="label-xs text-[#efe9df]/75 transition-colors duration-300 group-hover:text-[#e8a15b]">Scroll para entrar</span>
          <span className="relative h-12 w-px overflow-hidden bg-[#efe9df]/15">
            <span className="scroll-line absolute inset-0 bg-[#efe9df]" />
          </span>
        </button>
        <div className="hidden text-right md:block">
          <p className="label-xs text-[#efe9df]/55">Barcelona · ES</p>
          <LiveClock className="mt-2 block font-mono-d text-lg tabular-nums" />
        </div>
      </motion.div>
    </section>
  );
}
