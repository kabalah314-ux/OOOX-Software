import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import SplitFlap from "./SplitFlap";
import Chapter from "./Chapter";
import SelectedWork from "./SelectedWork";
import { EASE } from "./helpers";
import { projects, categories, img, ORDER } from "@/data/mock";
import { useLang } from "@/i18n";

export default function Projects({ category, setCategory }) {
  const { t } = useLang();
  const catId = categories.some((c) => c.id === category) ? category : categories[0].id;
  const items = projects
    .filter((p) => p.category === catId)
    .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const activeCat = categories.find((c) => c.id === catId);
  const isCrypto = catId === "crypto";

  return (
    <Chapter id="proyectos" className="z-20 -mt-16 bg-[#14130f] shadow-[0_-40px_90px_-10px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <img src={img("/img/projects-bg.jpg")} alt="" className="h-full w-full object-cover" />
          <motion.div className="absolute inset-0 bg-[#0e0d0b]" animate={{ opacity: isCrypto ? 0.9 : 0.35 }} transition={{ duration: 0.9, ease: EASE }} />
          <motion.div className="grid-lines absolute inset-0 text-[#e8a15b]" animate={{ opacity: isCrypto ? 0.06 : 0 }} transition={{ duration: 0.9 }} />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#14130f] to-transparent" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-32 pt-20 md:px-8 md:pb-44 md:pt-28">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-xs mb-6 text-[#efe9df]/70">02 — {t("projects.eyebrow")}</p>
            <SplitFlap text={String(t("projects.eyebrow")).toUpperCase()} />
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-[#efe9df]/65">{t("projects.lead")}</p>
          </div>
          <p className="font-mono-d text-xs text-[#efe9df]/60 lg:text-right">
            {String(projects.length).padStart(2, "0")} {t("projects.projectsWord")} · {categories.length} {t("projects.categoriesWord")}
            <br className="hidden lg:block" /> <span className="text-[#e8a15b]">●</span> {t("projects.updated")}
          </p>
        </div>

        {/* categorías */}
        <div className="relative z-30 mt-12">
          <div className="flex w-full flex-wrap rounded-full border border-white/10 bg-[#14130f]/70 p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:w-auto">
            {categories.map((c) => {
              const active = c.id === catId;
              const count = projects.filter((p) => p.category === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-500 sm:flex-none sm:gap-3 sm:px-6 sm:text-[12px] sm:tracking-[0.18em] md:px-8 md:py-4 md:text-[13px] ${
                    active ? "text-[#14130f]" : "text-[#efe9df]/70 hover:text-[#efe9df]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="cat-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: c.id === "crypto" ? "#e8a15b" : "#efe9df" }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="font-mono-d relative text-[10px] opacity-70">{c.n}</span>
                  <span className="relative">{t(`projects.categories.${c.id}.label`)}</span>
                  <sup className="font-mono-d relative text-[10px]">{String(count).padStart(2, "0")}</sup>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={catId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-6 max-w-lg text-[15px] leading-relaxed text-[#efe9df]/55"
            >
              {t(`projects.categories.${catId}.description`)}
            </motion.p>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={catId}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-12"
          >
            {items.length ? (
              <SelectedWork items={items} />
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 px-8 py-14 text-center">
                <p className="font-serif-d text-[clamp(1.8rem,3vw,2.6rem)] font-light italic text-[#efe9df]/70">{t("projects.emptyTitle")}</p>
                <p className="mt-3 text-sm text-white/45">{t("projects.emptyText")}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Chapter>
  );
}
