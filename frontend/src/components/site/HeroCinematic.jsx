import React, { useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { MaskLines, LiveClock, EASE, useIsDesktop } from "./helpers";
import { XIcon } from "./icons";
import { brand, img } from "@/data/mock";
import { useSmooth } from "@/lib/smooth";
import { useLang } from "@/i18n";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default function HeroCinematic({ ready }) {
  const { t } = useLang();
  const ref = useRef(null);
  const { scrollTo } = useSmooth();
  const wide = useIsDesktop(768);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const clip = useTransform(p, (v) => {
    const e = Math.min(1, v * 1.15);
    const k = 1 - Math.pow(1 - e, 2);
    return `inset(${k * 9}% ${k * 5}% ${k * 9}% ${k * 5}% round ${k * 40}px)`;
  });
  const imgScale = useTransform(p, (v) => 1.18 - clamp01(v) * 0.16);
  const veil = useTransform(p, (v) => clamp01(v) * 0.35);
  const titleY = useTransform(p, (v) => clamp01(v / 0.5) * -160);
  const titleOpacity = useTransform(p, (v) => 1 - clamp01(v / 0.4));
  const titleScale = useTransform(p, (v) => 1 - clamp01(v / 0.5) * 0.08);
  const metaOpacity = useTransform(p, (v) => 1 - clamp01(v / 0.12));

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });
  const imgMx = useTransform(smx, (v) => v * -18);
  const imgMy = useTransform(smy, (v) => v * -12);
  const txtMx = useTransform(smx, (v) => v * 14);
  const txtMy = useTransform(smy, (v) => v * 10);

  const onMove = (e) => {
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  };

  const flies = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${60 + Math.random() * 45}%`,
        size: 2 + Math.random() * 3,
        dur: 9 + Math.random() * 10,
        delay: Math.random() * -18,
        dx: `${(Math.random() - 0.5) * 120}px`,
        key: i,
      })),
    []
  );

  const xUrl = brand.socials.find((s) => s.id === "x")?.url || "https://x.com/";

  return (
    <section id="inicio" ref={ref} onMouseMove={onMove} className="relative h-[190vh] bg-[#14130f]">
      <div className="sticky top-0 h-[100svh] min-h-[600px] w-full overflow-hidden">
        <motion.div className="absolute inset-0 overflow-hidden" style={{ clipPath: clip }}>
          <motion.div className="absolute inset-0" style={{ x: imgMx, y: imgMy }}>
            <motion.img
              src={img("/img/hero-scene.jpg")}
              alt="Un prado tranquilo al atardecer, con una persona trabajando con su portátil"
              className="absolute inset-0 h-full w-full object-cover object-[35%_center] md:object-center"
              style={{ scale: imgScale }}
              initial={{ opacity: 0, filter: "blur(12px)" }}
              animate={ready ? { opacity: 1, filter: "blur(0px)" } : {}}
              transition={{ duration: 1.6, ease: EASE }}
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,19,15,0.35),transparent_65%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#14130f]/55 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[#14130f]/80" />
          <motion.div className="pointer-events-none absolute inset-0 bg-[#14130f]" style={{ opacity: veil }} />
          <div className="pointer-events-none absolute inset-0">
            {flies.map((f) => (
              <span
                key={f.key}
                className="firefly"
                style={{ left: f.left, top: f.top, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, "--dx": f.dx }}
              />
            ))}
          </div>
        </motion.div>

        <motion.div className="relative z-10 flex h-full items-center justify-center px-5 text-center" style={{ y: titleY, opacity: titleOpacity, scale: titleScale }}>
          <motion.div style={{ x: txtMx, y: txtMy }}>
            <h1 className="font-serif-d text-[clamp(2.5rem,7.2vw,7.6rem)] font-light leading-[0.98] tracking-[-0.02em] text-[#f6f2ea] [text-shadow:0_4px_40px_rgba(20,19,15,0.35)]">
              <MaskLines
                animate={ready}
                delay={0.3}
                lines={t("hero.title").map((line, i, arr) =>
                  i === arr.length - 1 ? { text: line, className: "italic text-[#ffd9a8]" } : line
                )}
              />
            </h1>
            <motion.p
              className="font-serif-d mt-6 text-[clamp(1.05rem,2vw,1.85rem)] font-light italic leading-snug text-[#f6f2ea]/75"
              initial={{ opacity: 0, y: 12 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 1, ease: EASE }}
            >
              {t("hero.subtitle")}
            </motion.p>
            <motion.p
              className="label-xs mt-5 text-[#efe9df]/55"
              initial={{ opacity: 0 }}
              animate={ready ? { opacity: 1 } : {}}
              transition={{ duration: 1, delay: 1.3 }}
            >
              {t("hero.note")}
            </motion.p>
          </motion.div>
        </motion.div>

        <motion.div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-6 text-[#efe9df] md:px-10 md:pb-8" style={{ opacity: metaOpacity }}>
          <motion.a
            href={xUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t("hero.followX")}
            initial={{ opacity: 0, y: 12 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 1.1, ease: EASE }}
            className="group flex items-center gap-3"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#efe9df]/35 bg-[#14130f]/20 backdrop-blur-md transition-[background-color,color,border-color] duration-300 group-hover:border-[#efe9df] group-hover:bg-[#efe9df] group-hover:text-[#14130f]">
              <XIcon className="h-4 w-4" />
            </span>
            <span className="label-xs hidden -translate-x-2 text-[#efe9df]/80 opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-x-0 group-hover:opacity-100 md:inline">
              {t("hero.followX")}
            </span>
          </motion.a>

          <motion.button
            onClick={() => scrollTo("#servicios")}
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 1.2 }}
            className="group absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 md:bottom-8"
          >
            <span className="label-xs text-[#efe9df]/75 transition-colors duration-300 group-hover:text-[#e8a15b]">{t("hero.scroll")}</span>
            <span className="relative h-12 w-px overflow-hidden bg-[#efe9df]/15">
              <span className="scroll-line absolute inset-0 bg-[#efe9df]" />
            </span>
          </motion.button>

          <motion.div initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 1.2 }} className="text-right">
            <p className="label-xs hidden text-[#efe9df]/55 md:block">Barcelona · ES</p>
            <LiveClock className="font-mono-d mt-2 block text-sm tabular-nums md:text-lg" seconds={false} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
