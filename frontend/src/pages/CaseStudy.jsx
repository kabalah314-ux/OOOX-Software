import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, ArrowRight, Check } from "lucide-react";
import { projects, workCards } from "@/data/mock";
import { BrowserMockup, PhoneMockup } from "@/components/site/Mockups";
import { MaskLines, StatusPill, Reveal, EASE, domainOf } from "@/components/site/helpers";
import Footer from "@/components/site/Footer";
import { useSmooth } from "@/lib/smooth";
import { useLang } from "@/i18n";

export default function CaseStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scrollTo } = useSmooth();
  const { t, tLabel, lang } = useLang();
  const idx = projects.findIndex((p) => p.id === id);
  const p = projects[idx];

  useEffect(() => {
    scrollTo(0, { immediate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#14130f] text-[#efe9df]">
        <p className="font-serif-d text-5xl font-light">{t("case.notFound")}</p>
        <button onClick={() => navigate("/")} className="label-xs text-[#e8a15b]">{t("case.home")}</button>
      </main>
    );
  }

  const next = projects[(idx + 1) % projects.length];
  const isCrypto = p.category === "crypto";
  const back = () => navigate("/", { state: { scrollTo: "proyectos", category: p.category } });

  const copy = t(`case.projects.${p.id}`) || {};
  const kicker = copy.kicker ?? p.kicker;
  const description = copy.description ?? p.description;
  const longDescription = copy.longDescription ?? p.longDescription;
  const highlights = copy.highlights ?? p.highlights;
  const card = { ...(workCards[p.id] || {}), ...(lang === "es" ? t(`work.cards.${p.id}`) || {} : {}) };
  const typeLabel = card.typeEn || tLabel(p.type);

  return (
    <main className="bg-[#14130f] text-[#efe9df]">
      <section className="relative overflow-hidden px-4 pb-20 pt-32 md:px-8 md:pt-40">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[80vw] -translate-x-1/2 rounded-full opacity-25 blur-[140px]" style={{ background: p.accent }} />
        <div className="relative mx-auto max-w-[1600px]">
          <button onClick={back} className="group label-xs flex items-center gap-2 text-[#efe9df]/60 transition-colors hover:text-[#e8a15b]">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> {t("case.back")}
          </button>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <StatusPill tone={p.statusTone} label={card.facts?.find(([k]) => k === "Status")?.[1] || p.status} dark accent={p.accent} />
            <span className="label-xs text-[#efe9df]/50">{typeLabel} · {p.year}</span>
            {p.token && <span className="font-mono-d text-sm font-bold" style={{ color: p.accent }}>{p.token.ticker}</span>}
          </div>

          <h1 className="font-serif-d mt-8 text-[clamp(3.2rem,11vw,12rem)] font-light leading-[0.88] tracking-[-0.03em]">
            <MaskLines lines={[p.title]} />
          </h1>
          <p className="font-serif-d mt-6 max-w-3xl text-2xl italic text-[#efe9df]/60 md:text-3xl">{kicker}</p>

          <div className="mt-12 flex flex-wrap gap-3">
            {p.access === "public" ? (
              <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#14130f]" style={{ background: p.accent }}>
                {t("case.open")} {domainOf(p.url)} <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : (
              <button onClick={() => navigate("/", { state: { scrollTo: "contacto" } })} className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#14130f]" style={{ background: p.accent }}>
                {t("case.demo")} <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
          className="relative mx-auto max-w-[1400px] rounded-[32px] p-4 sm:p-8 md:p-14"
          style={{ background: p.accentSoft }}
        >
          {p.scene ? (
            <div className="relative w-full overflow-hidden rounded-[20px]">
              <BrowserMockup project={p} dark={isCrypto} frameClass="aspect-[16/9]" />
            </div>
          ) : (
            <>
              <BrowserMockup project={p} dark={isCrypto || p.accentSoft.startsWith("#0") || p.accentSoft.startsWith("#1")} frameClass="aspect-[16/9]" />
              <PhoneMockup project={p} className="absolute -bottom-10 right-6 hidden w-[16%] rotate-[4deg] md:block" />
            </>
          )}
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-28 md:px-8 md:py-40">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="label-xs text-[#efe9df]/50">{t("case.project")}</p>
            <dl className="mt-8">
              {[
                [tLabel("Año"), p.year],
                [tLabel("Tipo"), typeLabel],
                [tLabel("Acceso"), tLabel(p.access === "private" ? "Privado" : "Público")],
                [tLabel("Stack"), p.stack.join(" · ")],
                ...(p.token ? [[tLabel("Chain"), `${p.token.chain} · ${p.token.chainId}`], [tLabel("Supply"), p.token.supply], [tLabel("Tax"), p.token.tax]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-t border-white/10 py-4 text-sm">
                  <dt className="text-white/50">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-2">
              {p.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70">{tLabel(tag)}</span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <Reveal>
              <p className="font-serif-d text-[clamp(1.6rem,2.6vw,2.6rem)] font-light leading-[1.25]">{longDescription}</p>
            </Reveal>

            <div className="mt-16 grid grid-cols-3 gap-4 border-y border-white/10 py-10">
              {p.metrics.map((m) => (
                <div key={m.label}>
                  <p className="font-serif-d text-4xl font-light md:text-6xl" style={{ color: p.accent }}>{m.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/50">{tLabel(m.label)}</p>
                </div>
              ))}
            </div>

            <h3 className="font-serif-d mt-16 text-3xl font-light md:text-4xl">{t("case.highlights")}</h3>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((h, i) => (
                <Reveal key={h} delay={i * 0.06}>
                  <li className="flex h-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#14130f]" style={{ background: p.accent }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[15px] leading-relaxed text-white/80">{h}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-2">
          {p.gallery.map((g, i) => (
            <Reveal key={g} delay={i * 0.1}>
              <div className="overflow-hidden rounded-[24px] border border-white/10">
                <img src={g} alt={`${p.title} ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover object-top transition-transform duration-700 hover:scale-105" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24 md:px-8">
        <button
          onClick={() => navigate(`/proyecto/${next.id}`)}
          data-cursor={t("case.next")}
          className="group relative mx-auto block w-full max-w-[1600px] overflow-hidden rounded-[32px] border border-white/10 text-left"
        >
          <img src={next.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition-[transform,opacity] duration-1000 group-hover:scale-105 group-hover:opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14130f] via-[#14130f]/70 to-transparent" />
          <div className="relative flex items-end justify-between gap-6 p-8 md:p-16">
            <div>
              <p className="label-xs text-white/50">{t("case.next")}</p>
              <p className="font-serif-d mt-4 text-[clamp(2.6rem,7vw,7rem)] font-light leading-none transition-transform duration-500 group-hover:translate-x-3 group-hover:italic">{next.title}</p>
            </div>
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors duration-500 group-hover:bg-[#e8a15b] group-hover:text-[#14130f]">
              <ArrowRight className="h-6 w-6" />
            </span>
          </div>
        </button>
      </section>

      <Footer />
    </main>
  );
}
