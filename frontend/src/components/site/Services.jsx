import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Monitor, Workflow, Wrench, Coins, Check } from "lucide-react";
import { services } from "@/data/mock";
import { MaskLines, EASE } from "./helpers";
import { useSmooth } from "@/lib/smooth";

const THEMES = {
  cream: { bg: "#EDE7DC", fg: "#14130F", sub: "#5f5a50", panel: "#E2DACB", line: "rgba(20,19,15,0.14)", accent: "#14130F" },
  navy: { bg: "#232A45", fg: "#EFE9DF", sub: "#b9bed0", panel: "#1C2238", line: "rgba(239,233,223,0.14)", accent: "#e8a15b" },
  sage: { bg: "#6B7A5C", fg: "#F6F2EA", sub: "#e4e8da", panel: "#617052", line: "rgba(246,242,234,0.2)", accent: "#F6F2EA" },
  ink: { bg: "#1A1814", fg: "#EFE9DF", sub: "#a8a192", panel: "#12110F", line: "rgba(239,233,223,0.12)", accent: "#e8a15b" },
};
const ICONS = [Monitor, Workflow, Wrench, Coins];

export default function Services({ onPick }) {
  const { scrollTo } = useSmooth();
  return (
    <section id="servicios" data-testid="services-section" className="relative bg-[#14130f] px-4 pb-24 pt-28 md:px-8 md:pb-32 md:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-40 h-[500px] w-[80vw] max-w-[800px] -translate-x-1/2 rounded-full bg-[#e8a15b]/10 blur-[140px]" />
      <div className="relative mx-auto max-w-[1600px]">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="label-xs mb-6 text-[#efe9df]/60">— Servicios</p>
            <h2 className="font-serif-d text-[clamp(2.8rem,6.5vw,6.5rem)] font-light leading-[0.95] tracking-[-0.02em] text-[#efe9df]">
              <MaskLines lines={["Lo que puedo", { text: "construir para ti.", className: "italic text-[#e8a15b]" }]} />
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-[#efe9df]/60 lg:col-span-4 lg:justify-self-end">
            Cuatro formas de trabajar juntos. Todas con la misma regla: útil antes que ruidoso, y lanzado antes que perfecto.
          </p>
        </div>

        <div className="mt-16 md:mt-24">
          {services.map((s, i) => {
            const t = THEMES[s.theme];
            const Icon = ICONS[i % ICONS.length];
            return (
              <div key={s.n} className="pb-5 lg:sticky lg:pb-[10vh]" style={{ top: `calc(100px + ${i * 22}px)` }}>
                <motion.article
                  data-testid={`service-card-${s.n}`}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 1, ease: EASE }}
                  className="group grid overflow-hidden rounded-[28px] shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.5)] lg:min-h-[520px] lg:grid-cols-12"
                  style={{ background: t.bg, color: t.fg }}
                >
                  <div className="relative min-h-[240px] overflow-hidden lg:col-span-7" style={{ background: t.panel }}>
                    <div className="grid-lines absolute inset-0 opacity-[0.1]" style={{ color: t.fg }} />
                    <p className="label-xs absolute left-6 top-6 md:left-10 md:top-10" style={{ color: t.sub }}>Sección {s.n}</p>
                    <span className="font-serif-d absolute -bottom-6 left-4 text-[9rem] font-light leading-none opacity-30 md:left-8 md:text-[13rem]">{s.n}</span>
                    <div className="absolute right-8 top-1/2 flex h-40 w-40 -translate-y-1/2 items-center justify-center md:right-20 md:h-56 md:w-56">
                      <motion.span
                        className="absolute inset-0 rounded-full border border-dashed"
                        style={{ borderColor: t.line }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                      />
                      <span className="absolute inset-6 rounded-full border transition-transform duration-700 group-hover:scale-110" style={{ borderColor: t.line }} />
                      <span
                        className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl transition-transform duration-700 group-hover:rotate-[-10deg] group-hover:scale-110 md:h-20 md:w-20"
                        style={{ background: t.accent, color: t.bg }}
                      >
                        <Icon className="h-7 w-7 md:h-8 md:w-8" />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col p-6 sm:p-8 lg:col-span-5 lg:p-12">
                    <div className="flex items-center justify-between border-b pb-5 font-mono-d text-xs" style={{ borderColor: t.line, color: t.sub }}>
                      <span>{s.n}</span>
                      <span className="flex items-center gap-2 uppercase tracking-[0.2em]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.accent === t.fg ? "#e8a15b" : t.accent }} /> Sección
                      </span>
                    </div>
                    <h3 className="font-serif-d mt-8 text-[clamp(2rem,3.4vw,3.4rem)] font-light leading-[1] tracking-[-0.01em] lg:mt-auto">{s.title}</h3>
                    <p className="mt-4 max-w-md text-[15px] leading-relaxed" style={{ color: t.sub }}>{s.text}</p>
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {s.points.map((pt) => (
                        <li key={pt} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: t.line }}>
                          <Check className="h-3 w-3" /> {pt}
                        </li>
                      ))}
                    </ul>
                    <button
                      data-testid={`service-open-${s.n}`}
                      onClick={() => {
                        onPick?.(s.target);
                        setTimeout(() => scrollTo("#proyectos"), 50);
                      }}
                      className="group/b mt-8 inline-flex w-fit items-center gap-3 rounded-full border px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-[background-color,color] duration-300 hover:bg-[#14130f] hover:text-[#efe9df]"
                      style={{ borderColor: t.fg }}
                    >
                      Abrir sección <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/b:translate-x-1" />
                    </button>
                  </div>
                </motion.article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
