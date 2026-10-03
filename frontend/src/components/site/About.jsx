import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { img } from "@/data/mock";
import { MaskLines, Reveal } from "./helpers";
import Chapter from "./Chapter";
import { useLang } from "@/i18n";

export default function About() {
  const { t } = useLang();
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <Chapter id="sobre-mi" className="z-30 -mt-16 bg-[#efe9df] text-[#14130f] shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.5)]">
      <div className="relative mx-auto max-w-[1600px] px-4 pb-[85vh] pt-24 md:px-8 md:pt-36">
        <p className="label-xs mb-6 text-[#6d675c]">03 — {t("about.eyebrow")}</p>
        <h2 className="font-serif-d max-w-6xl text-[clamp(2.6rem,6vw,6.6rem)] font-light leading-[0.95] tracking-[-0.02em]">
          <MaskLines
            lines={t("about.title").map((line, i, arr) =>
              i === arr.length - 1 ? { text: line, className: "italic text-[#b86f2c]" } : line
            )}
          />
        </h2>

        <div className="mt-20 grid gap-12 md:mt-28 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div ref={imgRef} className="relative h-[440px] overflow-hidden rounded-[28px] md:h-[620px]">
              <motion.img
                src={img("/img/hero-scene.jpg")}
                alt="Trabajando con el portátil en un prado al atardecer"
                style={{ y, scale: 1.3 }}
                className="absolute inset-0 h-full w-full object-cover object-[28%_center]"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#14130f]/45 to-transparent" />
            </div>
          </div>

          <div className="flex flex-col lg:col-span-7">
            <div className="max-w-[54ch] text-[17px] leading-relaxed text-[#4a453c]">
              <Reveal>
                <p>{t("about.intro")}</p>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="mt-8">{t("about.leadIn")}</p>
              </Reveal>

              <Reveal delay={0.18}>
                <p className="font-serif-d mt-4 text-[clamp(1.5rem,2.6vw,2.35rem)] font-light italic leading-[1.2] text-[#b86f2c]">
                  {t("about.question")}
                </p>
              </Reveal>

              <Reveal delay={0.26}>
                <p className="mt-8">{t("about.outro")}</p>
              </Reveal>
            </div>

            <dl className="mt-auto grid grid-cols-1 gap-8 border-t border-[#14130f]/15 pt-10 sm:grid-cols-3">
              {t("about.facts").map((f, i) => (
                <Reveal key={f.label} delay={i * 0.08}>
                  <div>
                    <dt className="label-xs text-[#6d675c]">{f.label}</dt>
                    <dd className="mt-2 font-serif-d text-[clamp(1.15rem,1.8vw,1.65rem)] font-light leading-snug">{f.value}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
