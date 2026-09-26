import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { about, projects } from "@/data/mock";
import { Counter, Reveal, EASE } from "./helpers";
import Marquee from "./Marquee";

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [8, 0]);
  return (
    <motion.span style={{ opacity, y }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

function ScrollStatement({ text }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.4"] });
  const words = text.split(" ");
  return (
    <p ref={ref} data-testid="about-statement" className="font-serif-d text-[clamp(2rem,4.6vw,4.8rem)] font-light leading-[1.05] tracking-[-0.02em] text-[#14130f]">
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w === "tener." || w === "mundo." ? <span className="italic text-[#b86f2c]">{w}</span> : w}
        </Word>
      ))}
    </p>
  );
}

export default function About() {
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const stats = [
    { v: projects.length, l: "Proyectos en el archivo" },
    { v: projects.filter((p) => p.category === "crypto").length, l: "Lanzamientos crypto" },
    { v: projects.filter((p) => p.category === "web").length, l: "Webs & apps" },
  ];

  return (
    <section id="sobre-mi" data-testid="about-section" className="relative overflow-hidden bg-[#efe9df] text-[#14130f]">
      <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-28 md:px-8 md:pb-32 md:pt-36">
        <p className="label-xs mb-10 text-[#6d675c]">— Sobre mí</p>
        <div className="max-w-6xl">
          <ScrollStatement text={about.statement} />
        </div>

        <div className="mt-20 grid gap-12 md:mt-28 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div ref={imgRef} className="relative h-[440px] overflow-hidden rounded-[28px] md:h-[620px]">
              <motion.img
                src="/img/hero-scene.jpg"
                alt="Trabajando con el portátil en un prado al atardecer"
                style={{ y, scale: 1.3 }}
                className="absolute inset-0 h-full w-full object-cover object-[28%_center]"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#14130f]/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-full bg-[#efe9df]/90 px-4 py-3 text-sm backdrop-blur">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Ahora mismo: construyendo el próximo lanzamiento
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:col-span-7">
            <div className="grid gap-6 text-[17px] leading-relaxed text-[#4a453c] md:grid-cols-2">
              {about.paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <p>{p}</p>
                </Reveal>
              ))}
            </div>

            <div className="mt-12">
              {about.facts.map((f, i) => (
                <Reveal key={f.label} delay={i * 0.08}>
                  <div className="group flex items-baseline justify-between border-t border-[#14130f]/15 py-5">
                    <span className="label-xs text-[#6d675c]">{f.label}</span>
                    <span className="font-serif-d text-2xl font-light transition-transform duration-500 group-hover:-translate-x-2 group-hover:italic md:text-4xl">{f.value}</span>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[#14130f]/15 pt-10">
              {stats.map((s) => (
                <div key={s.l}>
                  <Counter to={s.v} className="font-serif-d block text-5xl font-light md:text-7xl" />
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#6d675c]">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* process */}
        <div className="mt-24 md:mt-32">
          <div className="flex items-end justify-between gap-6">
            <h3 className="font-serif-d text-4xl font-light md:text-6xl">
              Cómo <span className="italic">trabajo</span>
            </h3>
            <p className="label-xs hidden text-[#6d675c] md:block">4 pasos · sin ruido</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {about.process.map((s, i) => (
              <motion.div
                key={s.n}
                data-testid={`process-step-${s.n}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-[24px] border border-[#14130f]/10 bg-[#f6f2ea] p-7 transition-[transform,box-shadow] duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(20,19,15,0.4)]"
              >
                <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#e8a15b] transition-transform duration-700 group-hover:scale-x-100" />
                <span className="font-mono-d text-xs text-[#b86f2c]">{s.n}</span>
                <h4 className="font-serif-d mt-10 text-3xl font-light">{s.title}</h4>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5f5a50]">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#14130f]/10 py-8">
        <Marquee
          words={about.stack}
          itemClass="font-serif-d text-4xl font-light italic text-[#14130f] md:text-6xl"
        />
      </div>
    </section>
  );
}
