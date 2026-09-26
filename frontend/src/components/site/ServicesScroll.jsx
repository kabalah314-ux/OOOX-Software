import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ArrowUpRight, Monitor, Workflow, Wrench, Coins, Check, MoveRight } from "lucide-react";
import { services } from "@/data/mock";
import { MaskLines, Magnetic, useIsDesktop } from "./helpers";
import { useSmooth } from "@/lib/smooth";

const THEMES = {
  cream: { bg: "#F6F2EA", fg: "#14130F", sub: "#5f5a50", line: "rgba(20,19,15,0.14)", accent: "#14130F", border: "rgba(20,19,15,0.1)" },
  navy: { bg: "#232A45", fg: "#EFE9DF", sub: "#b9bed0", line: "rgba(239,233,223,0.16)", accent: "#e8a15b", border: "transparent" },
  sage: { bg: "#6B7A5C", fg: "#F6F2EA", sub: "#e4e8da", line: "rgba(246,242,234,0.22)", accent: "#F6F2EA", border: "transparent" },
  ink: { bg: "#1A1814", fg: "#EFE9DF", sub: "#a8a192", line: "rgba(239,233,223,0.14)", accent: "#e8a15b", border: "transparent" },
};
const ICONS = [Monitor, Workflow, Wrench, Coins];

function ServiceCard({ s, i, onOpen }) {
  const t = THEMES[s.theme];
  const Icon = ICONS[i % ICONS.length];
  return (
    <article
      data-testid={`service-card-${s.n}`}
      className="group relative flex min-h-[520px] w-[84vw] shrink-0 snap-center flex-col overflow-hidden rounded-[28px] border p-7 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 sm:w-[420px] lg:h-[74vh] lg:max-h-[660px] lg:min-h-[570px] lg:w-[min(34vw,520px)] lg:p-10"
      style={{ background: t.bg, color: t.fg, borderColor: t.border }}
    >
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-[0.07]" style={{ color: t.fg }} />
      <div className="relative flex items-center justify-between font-mono-d text-xs" style={{ color: t.sub }}>
        <span>{s.n} / 04</span>
        <span className="uppercase tracking-[0.2em]">Sección</span>
      </div>

      <div className="relative my-auto flex items-center justify-center py-4">
        <div className="relative flex h-32 w-32 items-center justify-center lg:h-36 lg:w-36">
          <motion.span
            className="absolute inset-0 rounded-full border border-dashed"
            style={{ borderColor: t.line }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, ease: "linear", repeat: Infinity }}
          />
          <span className="absolute inset-5 rounded-full border transition-transform duration-700 group-hover:scale-110" style={{ borderColor: t.line }} />
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl transition-transform duration-700 group-hover:rotate-[-10deg] group-hover:scale-110"
            style={{ background: t.accent, color: t.bg }}
          >
            <Icon className="h-7 w-7" />
          </span>
        </div>
        <span className="font-serif-d pointer-events-none absolute -right-2 bottom-0 text-[7rem] font-light leading-none opacity-[0.12]">{s.n}</span>
      </div>

      <div className="relative">
        <h3 className="font-serif-d text-[clamp(1.9rem,2.6vw,2.8rem)] font-light leading-[1.02]">{s.title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: t.sub }}>{s.text}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {s.points.map((pt) => (
            <li key={pt} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: t.line }}>
              <Check className="h-3 w-3" /> {pt}
            </li>
          ))}
        </ul>
        <button
          data-testid={`service-open-${s.n}`}
          onClick={() => onOpen(s.target)}
          className="group/b mt-6 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] transition-opacity duration-300 hover:opacity-70"
        >
          Ver proyectos <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/b:translate-x-1" />
        </button>
      </div>
    </article>
  );
}

function Intro() {
  return (
    <div className="shrink-0 lg:w-[min(38vw,620px)] lg:pr-10">
      <p className="label-xs mb-6 text-[#6d675c]">02 — Servicios</p>
      <h2 className="font-serif-d text-[clamp(2.8rem,5.6vw,6rem)] font-light leading-[0.95] tracking-[-0.02em]">
        <MaskLines lines={["Lo que puedo", { text: "construir para ti.", className: "italic text-[#b86f2c]" }]} />
      </h2>
      <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[#5f5a50]">
        Cuatro formas de trabajar juntos. Todas con la misma regla: útil antes que ruidoso, y lanzado antes que perfecto.
      </p>
      <p className="label-xs mt-10 hidden items-center gap-3 text-[#14130f] lg:flex">
        Sigue bajando <MoveRight className="h-4 w-4 animate-pulse" />
      </p>
    </div>
  );
}

function EndCta({ onContact }) {
  return (
    <div className="flex shrink-0 flex-col items-start justify-center gap-6 lg:w-[min(30vw,460px)] lg:items-center lg:pl-6 lg:text-center">
      <p className="font-serif-d text-4xl font-light leading-tight lg:text-5xl">
        ¿No encaja en <span className="italic">ninguna</span>?
      </p>
      <Magnetic>
        <button
          data-testid="services-cta"
          onClick={onContact}
          className="group flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-full bg-[#14130f] text-[#efe9df] transition-colors duration-500 hover:bg-[#e8a15b] hover:text-[#14130f]"
        >
          <ArrowUpRight className="h-6 w-6 transition-transform duration-500 group-hover:rotate-45" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Cuéntame</span>
        </button>
      </Magnetic>
    </div>
  );
}

export default function ServicesScroll({ onPick }) {
  const isDesktop = useIsDesktop();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [dist, setDist] = useState(0);
  const { scrollTo } = useSmooth();

  useLayoutEffect(() => {
    if (!isDesktop) return;
    const calc = () => {
      if (trackRef.current) setDist(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(trackRef.current);
    window.addEventListener("resize", calc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, [isDesktop]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -dist]);
  const x = useSpring(rawX, { stiffness: 140, damping: 30, mass: 0.4 });
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const open = (target) => {
    onPick?.(target);
    setTimeout(() => scrollTo("#proyectos"), 50);
  };
  const toContact = () => scrollTo("#contacto");

  useEffect(() => {}, []);

  return (
    <section
      id="servicios"
      ref={sectionRef}
      data-testid="services-section"
      className="relative z-20 -mt-16 rounded-t-[36px] bg-[#efe9df] text-[#14130f] shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.5)] md:rounded-t-[64px]"
      style={isDesktop ? { height: `calc(100vh + ${dist}px)` } : undefined}
    >
      {isDesktop ? (
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <motion.div ref={trackRef} style={{ x }} className="flex items-center gap-6 pl-[6vw] pr-[6vw] will-change-transform">
            <Intro />
            {services.map((s, i) => (
              <ServiceCard key={s.n} s={s} i={i} onOpen={open} />
            ))}
            <EndCta onContact={toContact} />
          </motion.div>
          <div className="absolute bottom-10 left-[6vw] right-[6vw] flex items-center gap-6">
            <span className="font-mono-d text-[11px] text-[#6d675c]">01</span>
            <div className="h-px flex-1 bg-[#14130f]/15">
              <motion.div className="h-px origin-left bg-[#14130f]" style={{ scaleX: bar }} />
            </div>
            <span className="font-mono-d text-[11px] text-[#6d675c]">04</span>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-16 pt-24 md:px-8">
          <Intro />
          <div className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
            {services.map((s, i) => (
              <ServiceCard key={s.n} s={s} i={i} onOpen={open} />
            ))}
          </div>
          <p className="label-xs mt-4 flex items-center gap-2 text-[#6d675c]">Desliza <MoveRight className="h-3.5 w-3.5" /></p>
          <div className="mt-14">
            <EndCta onContact={toContact} />
          </div>
        </div>
      )}
    </section>
  );
}
