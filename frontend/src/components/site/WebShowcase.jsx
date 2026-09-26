import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Lock, MousePointer2, Sparkles } from "lucide-react";
import { BrowserMockup, PhoneMockup } from "./Mockups";
import { StatusPill, EASE } from "./helpers";
import { useSmooth } from "@/lib/smooth";

const THEMES = [
  { bg: "#F1ECE2", fg: "#14130F", sub: "#5f5a50", line: "rgba(20,19,15,0.12)", panel: "#E4DCCD", dark: false },
  { bg: "#1B1A17", fg: "#EFE9DF", sub: "#a8a192", line: "rgba(239,233,223,0.12)", panel: "#11100E", dark: true },
];

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  useEffect(() => {
    const on = () => setD(window.innerWidth >= 1024);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return d;
}

function StackCard({ p, i, n, progress, range, targetScale, isDesktop }) {
  const scale = useTransform(progress, range, [1, targetScale]);
  const [active, setActive] = useState(false);
  const navigate = useNavigate();
  const { scrollTo } = useSmooth();
  const t = THEMES[i % THEMES.length];

  return (
    <div className="py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:py-0">
      <motion.article
        data-testid={`project-card-${p.id}`}
        style={{ scale: isDesktop ? scale : 1, top: isDesktop ? i * 26 : 0, background: t.bg, color: t.fg }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 1, ease: EASE }}
        className="group relative grid w-full origin-top grid-cols-1 overflow-hidden rounded-[28px] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.45)] lg:h-[80vh] lg:max-h-[780px] lg:min-h-[600px] lg:grid-cols-12"
      >
        {/* Visual */}
        <div className="relative order-1 p-3 lg:order-2 lg:col-span-7" data-cursor="Recorrer">
          <div className="relative h-full min-h-[320px] overflow-hidden rounded-[22px] sm:min-h-[420px]" style={{ background: t.panel }}>
            <div className="grid-lines absolute inset-0 opacity-[0.07]" style={{ color: t.fg }} />
            <div
              className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[90px] transition-opacity duration-700 group-hover:opacity-70"
              style={{ background: p.accent }}
            />
            <div className="absolute left-4 top-4 z-20 hidden items-center gap-2 rounded-full bg-[#14130f]/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#efe9df] backdrop-blur md:flex">
              <MousePointer2 className="h-3 w-3" /> Pasa el ratón y recorre la web
            </div>
            <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10 lg:p-12">
              <BrowserMockup
                project={p}
                dark={t.dark}
                active={active}
                onToggle={() => setActive((a) => !a)}
                className="w-full max-w-[720px] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </div>
            <PhoneMockup
              src={p.mobile}
              alt={`${p.title} en móvil`}
              className="absolute bottom-8 right-6 z-10 hidden w-[14%] min-w-[90px] max-w-[150px] rotate-[6deg] transition-transform duration-700 ease-out group-hover:-translate-y-4 group-hover:rotate-[2deg] md:block"
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative order-2 flex flex-col p-6 sm:p-8 lg:order-1 lg:col-span-5 lg:p-12">
          <span className="font-serif-d pointer-events-none absolute -bottom-10 -left-2 select-none text-[14rem] font-light leading-none opacity-[0.06] lg:text-[18rem]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono-d text-xs" style={{ color: t.sub }}>
              {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <StatusPill tone={p.statusTone} label={p.status} dark={t.dark} accent={p.accent} />
          </div>

          <div className="relative mt-8 lg:mt-auto">
            <p className="label-xs" style={{ color: t.sub }}>{p.type}</p>
            <h3 className="font-serif-d mt-4 text-[clamp(2.6rem,4.8vw,5.2rem)] font-light leading-[0.92] tracking-[-0.02em]">{p.title}</h3>
            <p className="font-serif-d mt-3 text-lg italic" style={{ color: t.sub }}>{p.kicker}</p>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed" style={{ color: t.sub }}>{p.description}</p>

            <dl className="mt-7 grid grid-cols-2 text-sm">
              {[
                ["Año", p.year],
                ["Acceso", p.access === "private" ? "Privado" : "Público"],
                ["Stack", p.stack.slice(0, 2).join(" · ")],
                ["Sector", p.tags[0]],
              ].map(([k, v]) => (
                <div key={k} className="border-t py-3" style={{ borderColor: t.line }}>
                  <dt className="label-xs !text-[10px]" style={{ color: t.sub }}>{k}</dt>
                  <dd className="mt-1 font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 flex flex-wrap gap-3">
              {p.access === "private" ? (
                <button
                  data-testid={`project-demo-${p.id}`}
                  onClick={() => scrollTo("#contacto")}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[12px] font-medium uppercase tracking-[0.18em] transition-[background-color,color] duration-300 hover:bg-[#e8a15b] hover:text-[#14130f]"
                  style={{ background: t.fg, color: t.bg }}
                >
                  <Lock className="h-3.5 w-3.5" /> Solicitar demo
                </button>
              ) : (
                <a
                  data-testid={`project-visit-${p.id}`}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[12px] font-medium uppercase tracking-[0.18em] transition-[background-color,color] duration-300 hover:bg-[#e8a15b] hover:text-[#14130f]"
                  style={{ background: t.fg, color: t.bg }}
                >
                  Visitar web <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              <button
                data-testid={`project-case-${p.id}`}
                onClick={() => navigate(`/proyecto/${p.id}`)}
                className="group/btn inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#e8a15b] hover:text-[#e8a15b]"
                style={{ borderColor: t.line }}
              >
                Ver caso <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export function TeaserCard({ dark = false, className = "mt-6" }) {
  const { scrollTo } = useSmooth();
  return (
    <motion.div
      data-testid="project-teaser"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: EASE }}
      className={`relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[28px] border border-dashed p-8 md:flex-row md:items-center md:p-12 ${className} ${
        dark ? "border-white/15 bg-white/[0.03] text-[#efe9df]" : "border-[#efe9df]/40 bg-[#14130f]/40 text-[#efe9df] backdrop-blur-md"
      }`}
    >
      <div>
        <p className="label-xs flex items-center gap-2 text-[#e8a15b]"><Sparkles className="h-3.5 w-3.5" /> Próximo en el archivo</p>
        <h4 className="font-serif-d mt-4 text-4xl font-light md:text-5xl">
          Algo nuevo se está <span className="italic">cocinando</span>…
        </h4>
        <p className="mt-3 max-w-lg text-[#efe9df]/65">El archivo está vivo: aquí aparecerá lo próximo que lance. ¿Y si el siguiente es el tuyo?</p>
      </div>
      <button
        data-testid="teaser-cta"
        onClick={() => scrollTo("#contacto")}
        className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-[#efe9df] px-7 py-4 text-[12px] font-medium uppercase tracking-[0.18em] text-[#14130f] transition-colors duration-300 hover:bg-[#e8a15b]"
      >
        Hablemos <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </motion.div>
  );
}

export default function WebShowcase({ items }) {
  const ref = useRef(null);
  const isDesktop = useIsDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div>
      <div ref={ref} className="relative">
        {items.map((p, i) => (
          <StackCard
            key={p.id}
            p={p}
            i={i}
            n={items.length}
            progress={scrollYProgress}
            range={[i / items.length, 1]}
            targetScale={1 - (items.length - 1 - i) * 0.05}
            isDesktop={isDesktop}
          />
        ))}
      </div>
      <TeaserCard />
    </div>
  );
}
