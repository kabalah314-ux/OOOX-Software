import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import CyclingImages from "./CyclingImages";
import CrossiaScene from "./CrossiaScene";
import ElementiaScene from "./ElementiaScene";
import HoverVideo from "./HoverVideo";
import { EASE, StatusPill, xHandleOf } from "./helpers";
import { XIcon } from "./icons";
import { workCards } from "@/data/mock";
import { useLang } from "@/i18n";

// Se activa al entrar en pantalla (móvil) o al pasar el cursor (escritorio)
function useInViewFlag() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function PlaceholderVisual({ p }) {
  const { t } = useLang();
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden">
      <div className="grid-lines absolute inset-0 opacity-[0.06] text-[#efe9df]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="font-serif-d text-[clamp(2.4rem,5vw,4.4rem)] font-light italic leading-none text-[#efe9df]/25">{p.title}</span>
        <span className="label-xs text-[#efe9df]/40">{t("work.detailsSoon")}</span>
      </div>
    </div>
  );
}

function WorkCard({ p, index, featured }) {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const localized = lang === "es" ? t(`work.cards.${p.id}`) || {} : {};
  const card = { ...(workCards[p.id] || {}), ...localized };
  const [hover, setHover] = useState(false);
  const [ref, inView] = useInViewFlag();
  const playing = hover || inView;

  return (
    <motion.article
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !p.placeholder && navigate(`/proyecto/${p.id}`)}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: EASE, delay: (index % 2) * 0.08 }}
      className={`group relative cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-[#100f0d] transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_45px_90px_-45px_rgba(0,0,0,0.9)] ${
        featured ? "lg:col-span-2 lg:grid lg:grid-cols-12 lg:gap-10 lg:p-10" : ""
      }`}
    >
      {/* recorrido visual del producto */}
      <div className={`relative ${featured ? "lg:col-span-7" : ""}`}>
        <div className="absolute -inset-4 rounded-full opacity-25 blur-[70px] transition-opacity duration-700 group-hover:opacity-50" style={{ background: p.accent }} />
        {p.video ? (
          <HoverVideo
            src={p.video.src}
            poster={p.video.poster || p.cover}
            label={p.video.label}
            playing={playing}
            className={`w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${featured ? "aspect-[16/10]" : "aspect-[16/9]"} ${playing ? "scale-[1.03]" : ""}`}
          />
        ) : p.scene === "crossia" || p.scene === "elementia" ? (
          <div
            className={`relative w-full overflow-hidden transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              featured ? "aspect-[16/10]" : "aspect-[16/9]"
            } ${playing ? "scale-[1.03]" : ""}`}
          >
            {p.scene === "crossia" ? <CrossiaScene active={playing} /> : <ElementiaScene active={playing} />}
          </div>
        ) : p.placeholder ? (
          <PlaceholderVisual p={p} />
        ) : (
          <CyclingImages
            project={p}
            playing={playing}
            interval={1100}
            className={`relative w-full ${featured ? "aspect-[16/10]" : "aspect-[16/9]"}`}
          />
        )}
      </div>

      {/* ficha */}
      <div className={`relative flex flex-col p-6 sm:p-8 ${featured ? "lg:col-span-5 lg:justify-center lg:p-0 lg:pr-2" : ""}`}>
        <h3
          className={`font-serif-d font-light leading-[0.95] tracking-[-0.02em] text-[#efe9df] ${
            featured ? "text-[clamp(2.6rem,4.4vw,4.6rem)]" : "text-[clamp(2.1rem,3.2vw,3.2rem)]"
          }`}
        >
          {p.title}
        </h3>
        <p className="label-xs mt-3" style={{ color: p.accent }}>
          {card.typeEn || p.type}
        </p>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">{card.short}</p>

        {card.route && (
          <p className="font-mono-d mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
            {card.route.map((r, i) => (
              <span key={r} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: p.accent }}>→</span>}
                {r}
              </span>
            ))}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {card.facts?.map(([k, v]) => (
            <div key={`${k}-${v}`} className="flex items-baseline gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              {k ? <dt className="text-[9px] uppercase tracking-[0.18em] text-white/40">{k}</dt> : null}
              <dd className={`font-mono-d text-[11px] text-white/80 ${k ? "" : "uppercase tracking-[0.12em]"}`}>{v}</dd>
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <StatusPill tone={p.statusTone} label={card.facts?.find(([k]) => k === "Status")?.[1] || p.status} dark accent={p.accent} />
          {p.socials?.x && (
            <a
              href={p.socials.x}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`X · ${xHandleOf(p.socials.x)}`}
              title={xHandleOf(p.socials.x)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors duration-300 hover:border-[#efe9df] hover:bg-[#efe9df] hover:text-[#14130f]"
            >
              <XIcon className="h-3.5 w-3.5" />
            </a>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 ${
              p.placeholder ? "text-white/30" : "text-white/50 group-hover:text-[#efe9df]"
            } ${hover ? "opacity-100" : "opacity-70"}`}
          >
            {p.placeholder ? t("work.comingSoon") : t("work.open")}
            {!p.placeholder &&
              (featured ? <ArrowUpRight className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />)}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

export default function SelectedWork({ items }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((p, i) => (
        <WorkCard key={p.id} p={p} index={i} featured={i === 0 && items.length > 1} />
      ))}
    </div>
  );
}
