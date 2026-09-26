import React from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { brand } from "@/data/mock";
import { LiveClock, EASE } from "./helpers";
import { useSmooth } from "@/lib/smooth";

export default function Footer() {
  const { scrollTo } = useSmooth();
  return (
    <footer data-testid="footer" className="relative overflow-hidden bg-[#0e0d0b] text-[#efe9df]">
      <div className="mx-auto max-w-[1600px] px-4 pt-20 md:px-8">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-serif-d max-w-md text-3xl font-light leading-tight">
              Archivo vivo de proyectos, ideas y herramientas <span className="italic text-[#e8a15b]">construidas por curiosidad.</span>
            </p>
          </div>
          <div>
            <p className="label-xs text-white/40">Redes</p>
            <ul className="mt-4 space-y-2">
              {brand.socials.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-white/75 transition-colors duration-300 hover:text-[#e8a15b]">{s.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-xs text-white/40">Barcelona · ES</p>
            <LiveClock className="font-mono-d mt-4 block text-2xl tabular-nums" />
            <a href={`mailto:${brand.email}`} className="mt-4 block text-white/75 transition-colors duration-300 hover:text-[#e8a15b]">{brand.email}</a>
          </div>
        </div>

        <div className="flex select-none justify-between pt-6" aria-hidden="true">
          {"OOOX".split("").map((c, i) => (
            <span key={i} className="overflow-hidden">
              <motion.span
                initial={{ y: "100%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE, delay: i * 0.08 }}
                className="font-serif-d block text-[27vw] font-light leading-[0.8] text-[#efe9df]/90 transition-colors duration-500 hover:italic hover:text-[#e8a15b]"
              >
                {c}
              </motion.span>
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs uppercase tracking-[0.2em] text-white/45 md:flex-row">
          <span>© {new Date().getFullYear()} OOOX · Útil antes que ruidoso</span>
          <button data-testid="footer-back-top" onClick={() => scrollTo(0)} className="group flex items-center gap-3 text-white/70 transition-colors duration-300 hover:text-[#e8a15b]">
            Volver arriba
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition-transform duration-500 group-hover:-translate-y-1">
              <ArrowUp className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
