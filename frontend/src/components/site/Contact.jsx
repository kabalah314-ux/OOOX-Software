import React, { useState } from "react";
import { motion, useTransform } from "framer-motion";
import { ArrowRight, ArrowDown, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { img } from "@/data/mock";
import { Magnetic, Reveal } from "./helpers";
import { SunPortal, clamp01 } from "./Chapter";
import { contactContent } from "@/data/contact";
import { useLang } from "@/i18n";

function PortalScene({ p }) {
  const { t } = useLang();
  const imgScale = useTransform(p, (v) => 1.35 - clamp01(v) * 0.35);
  const tOpacity = useTransform(p, (v) => clamp01((v - 0.28) / 0.3));
  const tScale = useTransform(p, (v) => 1.14 - clamp01((v - 0.28) / 0.5) * 0.14);
  const tY = useTransform(p, (v) => 50 - clamp01((v - 0.28) / 0.45) * 50);
  return (
    <div className="absolute inset-0 bg-[#14130f]">
      <motion.img src={img("/img/projects-bg.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ scale: imgScale }} />
      <div className="absolute inset-0 bg-[#14130f]/45" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#14130f]" />
      <motion.div style={{ opacity: tOpacity, scale: tScale, y: tY }} className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-[#efe9df]">
        <p className="label-xs mb-8 text-[#efe9df]/75">04 — {t("contact.eyebrow")}</p>
        <h2 className="font-serif-d text-[clamp(2.8rem,9vw,10rem)] font-light leading-[0.92] tracking-[-0.03em] [text-shadow:0_4px_40px_rgba(20,19,15,0.4)]">
          {t("contact.title")[0]}
          <br />
          <span className="italic text-[#ffd9a8]">{t("contact.title")[1]}</span>
        </h2>
        <p className="font-serif-d mt-8 text-[clamp(1.15rem,2.4vw,2.1rem)] font-light italic text-[#efe9df]/75">
          {t("contact.subtitle")}
        </p>
        <p className="label-xs mt-10 flex items-center gap-2 text-[#efe9df]/75">
          <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
        </p>
      </motion.div>
    </div>
  );
}

export default function Contact() {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contactContent.email);
    } catch (err) {
      /* ignore */
    }
    setCopied(true);
    toast(t("contact.copied"), { description: contactContent.email });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative z-40 -mt-[75vh]">
      <SunPortal render={(p) => <PortalScene p={p} />} />
      <section id="contacto" className="relative overflow-hidden rounded-b-[36px] bg-[#14130f] text-[#efe9df] md:rounded-b-[64px]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[80vw] max-w-[900px] -translate-x-1/2 rounded-full bg-[#e8a15b]/10 blur-[140px]" />

        <div className="relative mx-auto max-w-[1600px] px-4 pb-24 pt-10 md:px-8 md:pb-32">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal delay={0.18}>
                <div className="flex flex-wrap items-center gap-6">
                  <Magnetic>
                    <a
                      href={`mailto:${contactContent.email}`}
                      className="group inline-flex items-center gap-4 rounded-full bg-[#e8a15b] px-8 py-5 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#14130f] shadow-[0_20px_60px_-10px_rgba(232,161,91,0.5)] transition-colors duration-500 hover:bg-[#efe9df]"
                    >
                      {t("contact.cta")}
                      <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1.5" />
                    </a>
                  </Magnetic>

                  <button
                    onClick={copy}
                    className="group flex items-center gap-3 rounded-full border border-white/15 px-5 py-3.5 text-sm text-white/75 transition-colors duration-300 hover:border-[#e8a15b] hover:text-[#efe9df]"
                  >
                    {copied ? <Check className="h-4 w-4 text-[#e8a15b]" /> : <Copy className="h-4 w-4" />}
                    {contactContent.email}
                  </button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal delay={0.12}>
                <p className="label-xs text-white/40">{t("contact.elsewhere")}</p>
                <ul className="mt-6">
                  {contactContent.socials.map((s) =>
                    s.url ? (
                      <li key={s.id}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between border-b border-white/10 py-4 transition-colors duration-300 hover:text-[#e8a15b]"
                        >
                          <span className="font-serif-d text-2xl font-light transition-transform duration-500 group-hover:translate-x-2">{s.label}</span>
                          <ArrowRight className="h-4 w-4 -rotate-45 transition-transform duration-500 group-hover:translate-x-1" />
                        </a>
                      </li>
                    ) : (
                      <li key={s.id} className="flex items-center justify-between border-b border-white/10 py-4">
                        <span className="font-serif-d text-2xl font-light text-white/25">{s.label}</span>
                        <span className="font-mono-d text-[10px] uppercase tracking-[0.2em] text-white/25">{t("contact.soon")}</span>
                      </li>
                    )
                  )}
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
