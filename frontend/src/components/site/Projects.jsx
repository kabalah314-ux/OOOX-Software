import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Coins, Layers, List } from "lucide-react";
import SplitFlap from "./SplitFlap";
import WebShowcase from "./WebShowcase";
import CryptoShowcase from "./CryptoShowcase";
import ProjectIndex from "./ProjectIndex";
import { EASE } from "./helpers";
import { projects, categories } from "@/data/mock";

export default function Projects({ category, setCategory, view, setView }) {
  const items = projects.filter((p) => p.category === category);
  const cat = categories.find((c) => c.id === category);
  const isCrypto = category === "crypto";

  return (
    <section id="proyectos" data-testid="projects-section" className="relative bg-[#14130f]">
      {/* sticky background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <img src="/img/projects-bg.jpg" alt="" className="h-full w-full object-cover" />
          <motion.div className="absolute inset-0 bg-[#0e0d0b]" animate={{ opacity: isCrypto ? 0.9 : 0.35 }} transition={{ duration: 0.9, ease: EASE }} />
          <motion.div
            className="grid-lines absolute inset-0 text-[#e8a15b]"
            animate={{ opacity: isCrypto ? 0.06 : 0 }}
            transition={{ duration: 0.9 }}
          />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#14130f] to-transparent" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-24 pt-28 md:px-8 md:pb-32 md:pt-36">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-xs mb-6 text-[#efe9df]/70">— Proyectos · Archivo 2026</p>
            <SplitFlap text="CONOCE MIS PROYECTOS" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="font-serif-d max-w-sm text-xl font-light leading-snug text-[#efe9df]/85 lg:text-right"
            >
              {cat.description}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* controls */}
        <div className="relative z-30 mt-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex w-full rounded-full border border-white/10 bg-[#14130f]/70 p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:w-auto">
            {categories.map((c) => {
              const active = c.id === category;
              const count = projects.filter((p) => p.category === c.id).length;
              const Icon = c.id === "web" ? Monitor : Coins;
              return (
                <button
                  key={c.id}
                  data-testid={`category-tab-${c.id}`}
                  onClick={() => setCategory(c.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-3 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors duration-500 sm:flex-none sm:gap-2.5 sm:px-5 sm:text-[12px] sm:tracking-[0.18em] md:px-8 md:py-4 md:text-[13px] ${
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
                  <Icon className="relative h-4 w-4" />
                  <span className="relative">{c.label}</span>
                  <sup className="font-mono-d relative text-[10px]">{String(count).padStart(2, "0")}</sup>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#14130f]/70 p-1.5 backdrop-blur-xl">
            {[
              { id: "showcase", label: "Showcase", Icon: Layers },
              { id: "index", label: "Índice", Icon: List },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                data-testid={`view-toggle-${id}`}
                onClick={() => setView(id)}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 ${
                  view === id ? "text-[#14130f]" : "text-[#efe9df]/60 hover:text-[#efe9df]"
                }`}
              >
                {view === id && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-[#efe9df]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <Icon className="relative h-3.5 w-3.5" />
                <span className="relative hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${category}-${view}`}
            initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-10"
          >
            {view === "index" ? (
              <ProjectIndex items={items} dark={isCrypto} />
            ) : isCrypto ? (
              <CryptoShowcase items={items} />
            ) : (
              <WebShowcase items={items} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
