import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Lock, Play, Pause, MousePointer2, ArrowRight, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { projects, categories } from "@/data/mock";
import { MaskLines, StatusPill, Reveal, EASE, domainOf } from "@/components/site/helpers";
import { XIcon, TelegramIcon } from "@/components/site/icons";
import Footer from "@/components/site/Footer";
import { useSmooth } from "@/lib/smooth";

function LiveBrowser({ p, dark }) {
  const boxRef = useRef(null);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!auto) return;
    let raf;
    const step = () => {
      const el = boxRef.current;
      if (!el) return;
      el.scrollTop += 1.6;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setAuto(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  return (
    <div className={`overflow-hidden rounded-[18px] border shadow-[0_50px_100px_-30px_rgba(0,0,0,0.6)] ${dark ? "border-white/10 bg-[#0c0b0a]" : "border-black/10 bg-white"}`}>
      <div className={`flex items-center gap-3 border-b px-4 py-3 ${dark ? "border-white/10 bg-[#161512]" : "border-black/5 bg-[#f1ece2]"}`}>
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className={`mx-auto flex items-center gap-2 rounded-md px-4 py-1.5 font-mono-d text-xs ${dark ? "bg-white/5 text-white/60" : "bg-black/5 text-black/60"}`}>
          {p.access === "private" && <Lock className="h-3 w-3" />} {domainOf(p.url)}
        </div>
        <button
          data-testid="case-autoscroll-toggle"
          onClick={() => setAuto((a) => !a)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors duration-300 ${dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/5 text-black hover:bg-black/10"}`}
        >
          {auto ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} <span className="hidden sm:inline">{auto ? "Pausar" : "Auto-recorrido"}</span>
        </button>
      </div>
      <div ref={boxRef} data-lenis-prevent className="no-scrollbar h-[56vh] overflow-y-auto md:h-[74vh]">
        <img src={p.long} alt={`Web completa de ${p.title}`} className="w-full" />
      </div>
    </div>
  );
}

export default function CaseStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scrollTo } = useSmooth();
  const [lightbox, setLightbox] = useState(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  const idx = projects.findIndex((x) => x.id === id);
  const p = projects[idx];

  useEffect(() => {
    scrollTo(0, { immediate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#14130f] px-6 text-center text-[#efe9df]">
        <p className="label-xs text-white/50">404 · Archivo</p>
        <h1 className="font-serif-d mt-6 text-6xl font-light">Este proyecto <span className="italic">no existe</span>.</h1>
        <Link to="/" className="mt-10 rounded-full bg-[#efe9df] px-6 py-3 text-sm uppercase tracking-[0.2em] text-[#14130f]">Volver al inicio</Link>
      </main>
    );
  }

  const next = projects[(idx + 1) % projects.length];
  const dark = p.category === "crypto";
  const cat = categories.find((c) => c.id === p.category);
  const sameCat = projects.filter((x) => x.category === p.category);
  const num = sameCat.findIndex((x) => x.id === p.id) + 1;
  const c = dark
    ? { bg: "#100f0d", fg: "#efe9df", sub: "rgba(239,233,223,0.6)", line: "rgba(239,233,223,0.12)", card: "#171613" }
    : { bg: "#efe9df", fg: "#14130f", sub: "#5f5a50", line: "rgba(20,19,15,0.14)", card: "#f6f2ea" };
  const goBack = () => navigate("/", { state: { scrollTo: "proyectos", category: p.category } });
  const goContact = () => navigate("/", { state: { scrollTo: "contacto" } });

  return (
    <main data-testid="case-page" style={{ background: c.bg, color: c.fg }}>
      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden px-4 pb-16 pt-32 md:px-8 md:pt-44">
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[#14130f]" />
        <motion.div className="pointer-events-none absolute -right-40 top-10 h-[600px] w-[600px] rounded-full opacity-40 blur-[140px]" style={{ background: p.accent, y: glowY }} />
        <div className="relative mx-auto max-w-[1600px]">
          <button data-testid="case-back-button" onClick={goBack} className="group flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-[#efe9df]/70 transition-colors duration-300 hover:text-[#e8a15b]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#efe9df]/20 transition-transform duration-300 group-hover:-translate-x-1">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Todos los proyectos
          </button>

          <div className="mt-10 rounded-[32px] p-6 sm:p-10 md:p-14" style={{ background: c.card }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="label-xs" style={{ color: c.sub }}>{cat.label} · Nº {String(num).padStart(2, "0")}</p>
              <StatusPill tone={p.statusTone} label={p.status} dark={dark} accent={p.accent} />
            </div>
            <h1 data-testid="case-title" className="font-serif-d mt-8 text-[clamp(3.4rem,11vw,11rem)] font-light leading-[0.88] tracking-[-0.03em]">
              <MaskLines lines={[p.title]} animate delay={0.2} />
            </h1>
            <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
              <p className="font-serif-d text-2xl font-light italic lg:col-span-6" style={{ color: c.sub }}>{p.kicker}</p>
              <div className="lg:col-span-6">
                <dl className="grid grid-cols-2 sm:grid-cols-4">
                  {[["Año", p.year], ["Tipo", p.type.split("·")[0]], ["Acceso", p.access === "private" ? "Privado" : "Público"], [p.token ? "Token" : "Sector", p.token ? p.token.ticker : p.tags[0]]].map(([k, v]) => (
                    <div key={k} className="border-t py-3 pr-3" style={{ borderColor: c.line }}>
                      <dt className="label-xs !text-[10px]" style={{ color: c.sub }}>{k}</dt>
                      <dd className="mt-1 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  {p.access === "private" ? (
                    <button data-testid="case-demo-button" onClick={goContact} className="inline-flex items-center gap-2 rounded-full bg-[#e8a15b] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#14130f] transition-[filter] duration-300 hover:brightness-110">
                      <Lock className="h-4 w-4" /> Solicitar demo privada
                    </button>
                  ) : (
                    <a data-testid="case-visit-button" href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#14130f] transition-[filter] duration-300 hover:brightness-110" style={{ background: dark ? p.accent : "#e8a15b" }}>
                      Visitar web <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                  {p.socials?.x && (
                    <a data-testid="case-x-link" href={p.socials.x} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-[12px] uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#e8a15b] hover:text-[#e8a15b]" style={{ borderColor: c.line }}>
                      <XIcon /> X
                    </a>
                  )}
                  {p.socials?.telegram && (
                    <a data-testid="case-telegram-link" href={p.socials.telegram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-[12px] uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#e8a15b] hover:text-[#e8a15b]" style={{ borderColor: c.line }}>
                      <TelegramIcon /> Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE BROWSER */}
      <section className="px-4 md:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="label-xs flex items-center gap-2" style={{ color: c.sub }}>
              <MousePointer2 className="h-3.5 w-3.5" /> Explora · desplázate dentro de la ventana
            </p>
            <p className="font-mono-d hidden text-xs md:block" style={{ color: c.sub }}>{domainOf(p.url)}</p>
          </div>
          <Reveal>
            <LiveBrowser p={p} dark={dark} />
          </Reveal>
        </div>
      </section>

      {/* BODY */}
      <section className="px-4 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1600px] gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label-xs" style={{ color: c.sub }}>— El proyecto</p>
            <Reveal>
              <p className="font-serif-d mt-6 text-[clamp(1.6rem,2.6vw,2.6rem)] font-light leading-[1.2]">{p.longDescription}</p>
            </Reveal>
            <p className="label-xs mt-16" style={{ color: c.sub }}>— Lo más destacado</p>
            <ul className="mt-4">
              {p.highlights.map((h, i) => (
                <motion.li
                  key={h}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
                  className="group flex items-baseline gap-6 border-b py-5"
                  style={{ borderColor: c.line }}
                >
                  <span className="font-mono-d text-xs" style={{ color: p.accent === "#10B981" ? "#0f9f6e" : dark ? p.accent : "#b86f2c" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-lg transition-transform duration-500 group-hover:translate-x-2 md:text-xl">{h}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-5">
            <div className="rounded-[28px] border p-7 lg:sticky lg:top-28 md:p-9" style={{ background: c.card, borderColor: c.line }}>
              <div className="grid grid-cols-3 gap-4 border-b pb-7" style={{ borderColor: c.line }}>
                {p.metrics.map((m) => (
                  <div key={m.label}>
                    <p className="font-serif-d text-3xl font-light md:text-4xl">{m.value}</p>
                    <p className="label-xs mt-1 !text-[9px]" style={{ color: c.sub }}>{m.label}</p>
                  </div>
                ))}
              </div>
              {p.token && (
                <div className="border-b py-7" style={{ borderColor: c.line }}>
                  <p className="label-xs" style={{ color: c.sub }}>Token</p>
                  <dl className="mt-4 space-y-3 font-mono-d text-sm">
                    {[["Ticker", p.token.ticker], ["Cadena", p.token.chain], ["Chain ID", p.token.chainId], ["Supply", p.token.supply], ["Tax", p.token.tax], ["Liquidez", p.token.liquidity]].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt style={{ color: c.sub }}>{k}</dt>
                        <dd className="font-bold" style={{ color: k === "Ticker" ? p.accent : undefined }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <div className="pt-7">
                <p className="label-xs" style={{ color: c.sub }}>Stack & etiquetas</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[...p.stack, ...p.tags].map((s) => (
                    <span key={s} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: c.line }}>{s}</span>
                  ))}
                </div>
              </div>
              {p.access === "private" && (
                <div className="mt-7 flex gap-3 rounded-2xl bg-[#e8a15b]/15 p-4 text-sm">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#b86f2c]" />
                  <p>Proyecto privado: las capturas muestran su interior real. Te hago una demo guiada si te interesa.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* GALLERY */}
      <section className="px-4 pb-24 md:px-8 md:pb-32">
        <div className="mx-auto max-w-[1600px]">
          <p className="label-xs" style={{ color: c.sub }}>— Galería</p>
          <div className="mt-6 grid gap-4 md:grid-cols-12">
            {p.gallery.map((g, i) => (
              <motion.button
                key={g}
                data-testid={`case-gallery-${i}`}
                data-cursor="Ampliar"
                onClick={() => setLightbox(g)}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
                className={`group relative overflow-hidden rounded-[22px] border ${i % 2 === 0 ? "md:col-span-8" : "md:col-span-4"}`}
                style={{ borderColor: c.line }}
              >
                <img src={g} alt={`${p.title} captura ${i + 1}`} loading="lazy" className={`w-full object-cover object-top transition-transform duration-700 group-hover:scale-105 ${i % 2 === 0 ? "aspect-[16/10]" : "aspect-[16/10] md:aspect-auto md:h-full"}`} />
                <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#14130f]/80 text-[#efe9df] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* NEXT */}
      <Link
        to={`/proyecto/${next.id}`}
        data-testid="case-next-project"
        data-cursor="Siguiente"
        className="group relative block overflow-hidden bg-[#14130f] px-4 py-24 text-[#efe9df] md:px-8 md:py-36"
      >
        <img src={next.cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-0 transition-[opacity,transform] duration-1000 group-hover:scale-100 group-hover:opacity-30" />
        <div className="relative mx-auto flex max-w-[1600px] items-end justify-between gap-6">
          <div>
            <p className="label-xs text-white/50">Siguiente proyecto</p>
            <p className="font-serif-d mt-6 text-[clamp(3rem,9vw,9rem)] font-light leading-[0.9] tracking-[-0.03em] transition-transform duration-700 group-hover:translate-x-4 group-hover:italic">{next.title}</p>
          </div>
          <span className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 transition-[background-color,transform] duration-500 group-hover:rotate-[-45deg] group-hover:bg-[#e8a15b] group-hover:text-[#14130f] md:h-24 md:w-24">
            <ArrowRight className="h-6 w-6" />
          </span>
        </div>
      </Link>

      <Footer />

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-6xl border-none bg-transparent p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:rounded-full [&>button]:bg-[#efe9df] [&>button]:p-2 [&>button]:text-[#14130f] [&>button]:opacity-100">
          <DialogTitle className="sr-only">Captura ampliada</DialogTitle>
          {lightbox && <img src={lightbox} alt="Captura ampliada" className="max-h-[85vh] w-full rounded-2xl object-contain" />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
