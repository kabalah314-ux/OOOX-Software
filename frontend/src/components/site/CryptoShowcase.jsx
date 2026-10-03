import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Link2 } from "lucide-react";
import { BrowserMockup } from "./Mockups";
import { StatusPill, EASE } from "./helpers";
import { XIcon, TelegramIcon } from "./icons";
import { TeaserCard } from "./WebShowcase";

function TickerTape({ items }) {
  const row = items.flatMap((p) => [
    { t: p.token?.ticker, c: p.accent, s: p.status },
    { t: `${p.token?.chain} · ${p.token?.chainId}`, c: "#efe9df", s: "" },
  ]);
  const all = [...row, { t: "NFA · DYOR", c: "#e8a15b", s: "" }, { t: "Nuevos lanzamientos pronto", c: "#efe9df", s: "" }];
  const loop = [...all, ...all, ...all, ...all];
  return (
    <div className="pause-hover relative -mx-4 flex overflow-hidden border-y border-white/10 bg-[#0c0b0a]/80 py-3 backdrop-blur md:mx-0 md:rounded-full md:border">
      <div className="animate-marquee-fast flex shrink-0 items-center">
        {[...loop, ...loop].map((it, i) => (
          <span key={i} className="font-mono-d flex items-center gap-2 whitespace-nowrap px-6 text-[12px] uppercase tracking-[0.15em]">
            <span style={{ color: it.c }} className="font-bold">{it.t}</span>
            {it.s && <span className="text-white/50">▲ {it.s}</span>}
            <span className="ml-4 text-white/20">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TokenCard({ p, featured = false, index }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const navigate = useNavigate();
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const tk = p.token || {};
  const stats = [
    ["Supply", tk.supply],
    ["Tax", tk.tax],
    ["Liquidez", tk.liquidity],
    ["Chain ID", tk.chainId],
  ];

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1, ease: EASE, delay: (index % 2) * 0.1 }}
      className={`group relative min-w-0 rounded-[28px] p-px transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 ${featured ? "lg:col-span-2" : ""}`}
      style={{
        background: `radial-gradient(520px circle at var(--mx, 50%) var(--my, 0%), ${p.accent}cc, transparent 42%), rgba(255,255,255,0.09)`,
        boxShadow: `0 40px 90px -40px ${p.accent}55`,
      }}
    >
      <div
        className={`relative h-full overflow-hidden rounded-[27px] bg-[#100f0d] p-5 text-[#efe9df] sm:p-7 ${featured ? "lg:grid lg:grid-cols-12 lg:gap-10 lg:p-10" : ""}`}
        style={{ backgroundImage: `radial-gradient(700px circle at var(--mx, 50%) var(--my, 0%), ${p.accent}14, transparent 40%)` }}
      >
        <div className={`relative ${featured ? "lg:col-span-7" : ""}`} data-cursor="Recorrer">
          <div className="absolute -inset-4 rounded-full opacity-30 blur-[70px] transition-opacity duration-700 group-hover:opacity-60" style={{ background: p.accent }} />
          <BrowserMockup project={p} dark active={active} onToggle={() => setActive((a) => !a)} className="relative" />
        </div>

        <div className={`relative mt-7 flex flex-col ${featured ? "lg:col-span-5 lg:mt-0" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="font-mono-d flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold text-[#14130f] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110"
                style={{ background: p.accent }}
              >
                {tk.ticker?.replace("$", "")}
              </div>
              <div>
                <p className="font-mono-d text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: p.accent }}>{tk.ticker}</p>
                <p className="label-xs mt-1 !text-[10px] text-white/50">{p.type}</p>
              </div>
            </div>
            <StatusPill tone={p.statusTone} label={p.status} dark accent={p.accent} />
          </div>

          <h3 className={`font-serif-d mt-6 font-light leading-[0.95] tracking-[-0.02em] ${featured ? "text-[clamp(2.6rem,4.4vw,4.6rem)]" : "text-[clamp(2.2rem,3.4vw,3.4rem)]"}`}>{p.title}</h3>
          <p className="font-serif-d mt-2 italic text-white/55">{p.kicker}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/65">{p.description}</p>

          <div className="font-mono-d mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70">
            <Link2 className="h-3.5 w-3.5" style={{ color: p.accent }} /> {tk.chain} · EVM {tk.chainId}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="bg-[#100f0d] px-4 py-3">
                <dt className="font-mono-d text-[10px] uppercase tracking-[0.15em] text-white/40">{k}</dt>
                <dd className="font-mono-d mt-1 text-base font-bold text-[#efe9df]">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-2.5 lg:mt-auto lg:pt-7">
            <a
              href={p.socials?.web || p.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[12px] font-bold uppercase tracking-[0.15em] text-[#14130f] transition-[filter,transform] duration-300 hover:brightness-110"
              style={{ background: p.accent }}
            >
              Abrir web <ArrowUpRight className="h-4 w-4" />
            </a>
            {p.socials?.x && (
              <a href={p.socials.x} target="_blank" rel="noreferrer" aria-label="X" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors duration-300 hover:bg-[#efe9df] hover:text-[#14130f]">
                <XIcon />
              </a>
            )}
            {p.socials?.telegram && (
              <a href={p.socials.telegram} target="_blank" rel="noreferrer" aria-label="Telegram" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors duration-300 hover:bg-[#efe9df] hover:text-[#14130f]">
                <TelegramIcon />
              </a>
            )}
            <button
              onClick={() => navigate(`/proyecto/${p.id}`)}
              className="group/b ml-auto inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.15em] text-white/70 transition-colors duration-300 hover:text-[#efe9df]"
            >
              Ficha completa <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/b:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function CryptoShowcase({ items }) {
  const [featured, ...rest] = items;
  return (
    <div>
      <div className="font-mono-d mb-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-white/55">
        <span>
          <span className="text-[#e8a15b]">ooox@archivo</span>:~$ ls ./crypto --launched
          <span className="ml-1 inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-[#e8a15b]" />
        </span>
        <span>{String(items.length).padStart(2, "0")} tokens · Robinhood Chain</span>
      </div>
      <TickerTape items={items} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {featured && <TokenCard p={featured} featured index={0} />}
        {rest.map((p, i) => (
          <TokenCard key={p.id} p={p} index={i + 1} />
        ))}
        <TeaserCard dark />
      </div>
    </div>
  );
}
