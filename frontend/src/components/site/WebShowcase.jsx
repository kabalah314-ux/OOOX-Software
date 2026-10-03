import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Plus } from "lucide-react";
import { BrowserMockup, PhoneMockup } from "./Mockups";
import { StatusPill, EASE } from "./helpers";
import { useSmooth } from "@/lib/smooth";

const LIGHT = { dark: false, bg: "#f6f2ea", fg: "#14130f", sub: "#6d675c", line: "rgba(20,19,15,0.12)" };

function WebCard({ p, i, n }) {
  const t = LIGHT;
  const navigate = useNavigate();
  const { scrollTo } = useSmooth();
  const [active, setActive] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1, ease: EASE }}
      className="relative grid overflow-hidden rounded-[28px] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)] lg:grid-cols-12"
      style={{ background: t.bg, color: t.fg }}
    >
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
          <p className="label-xs flex flex-wrap items-center gap-3" style={{ color: t.sub }}>
            {p.type}
            {p.demo && <span className="rounded-full border px-2.5 py-0.5 !text-[10px]" style={{ borderColor: t.line }}>Proyecto demo</span>}
          </p>
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

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {p.access === "public" ? (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#14130f] px-5 py-3 text-[12px] font-medium uppercase tracking-[0.15em] text-[#efe9df] transition-colors duration-300 hover:bg-[#e8a15b] hover:text-[#14130f]"
              >
                Visitar web <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : (
              <button
                onClick={() => scrollTo("#contacto")}
                className="inline-flex items-center gap-2 rounded-full bg-[#14130f] px-5 py-3 text-[12px] font-medium uppercase tracking-[0.15em] text-[#efe9df] transition-colors duration-300 hover:bg-[#e8a15b] hover:text-[#14130f]"
              >
                Solicitar demo <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => navigate(`/proyecto/${p.id}`)}
              className="group/b inline-flex items-center gap-2 px-2 text-[12px] font-medium uppercase tracking-[0.15em] transition-opacity hover:opacity-70"
            >
              Ver caso <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/b:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative order-1 overflow-hidden p-4 sm:p-6 lg:order-2 lg:col-span-7 lg:p-10" style={{ background: p.accentSoft }} data-cursor="Recorrer">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-40 blur-[90px]" style={{ background: p.accent }} />
        <div className="relative">
          {p.previews?.length ? (
            <BrowserMockup project={p} cycle />
          ) : (
            <BrowserMockup project={p} active={active} onToggle={() => setActive((a) => !a)} />
          )}
          <PhoneMockup project={p} className="absolute -bottom-6 right-4 hidden w-[22%] rotate-[4deg] sm:block" />
        </div>
      </div>
    </motion.article>
  );
}

export function TeaserCard({ dark = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed p-12 text-center ${
        dark ? "border-white/15 text-[#efe9df]/60" : "border-[#efe9df]/30 text-[#efe9df]/70"
      }`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-current">
        <Plus className="h-5 w-5" />
      </span>
      <p className="font-serif-d text-3xl font-light italic">Próximo proyecto</p>
      <p className="label-xs">En construcción · 2026</p>
    </div>
  );
}

export default function WebShowcase({ items }) {
  return (
    <div className="flex flex-col gap-10">
      {items.map((p, i) => (
        <WebCard key={p.id} p={p} i={i} n={items.length} />
      ))}
      <TeaserCard />
    </div>
  );
}
