import React, { useEffect, useRef, useState } from "react";
import Chapter from "./Chapter";
import { MaskLines } from "./helpers";
import { processSteps } from "@/data/process";
import { useLang } from "@/i18n";

/* ────────────────────────────────────────────────────────────
   Ilustraciones dibujadas a mano para OOOX.
   Trazo fino, misma paleta: tinta #14130f sobre crema, acento ámbar.
   ──────────────────────────────────────────────────────────── */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IdeaIllu() {
  return (
    <svg viewBox="0 0 180 122" className="h-full w-full" aria-hidden>
      {/* burbuja de conversación */}
      <g className="illu-anim anim-talk">
        <path
          {...stroke}
          d="M66 14h50c6 0 11 5 11 11v13c0 6-5 11-11 11h-24l-11 9v-9H66c-6 0-11-5-11-11V25c0-6 5-11 11-11z"
        />
        <circle cx="74" cy="31" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="91" cy="31" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="108" cy="31" r="2.6" fill="currentColor" stroke="none" />
      </g>

      {/* chispa / bombilla mínima */}
      <g className="illu-anim anim-spark" stroke="#e8a15b">
        <path {...stroke} stroke="#e8a15b" d="M152 30a8 8 0 1 1-8 8" />
        <path {...stroke} stroke="#e8a15b" d="M147 42h6M162 22l-5 4M132 22l5 4M166 36l-6 1" />
      </g>

      {/* dos personas conversando */}
      <g {...stroke}>
        <circle cx="36" cy="80" r="11" />
        <path d="M16 118c0-13 9-22 20-22s20 9 20 22" />
        <circle cx="122" cy="80" r="11" />
        <path d="M102 118c0-13 9-22 20-22s20 9 20 22" />
        <path d="M52 72c6-4 12-5 18-4M110 72c-6-4-12-5-18-4" opacity="0.45" />
      </g>
    </svg>
  );
}

function ShapeIllu() {
  return (
    <svg viewBox="0 0 180 122" className="h-full w-full" aria-hidden>
      {/* piezas sueltas que se ordenan */}
      <g {...stroke}>
        <g className="illu-anim anim-drift">
          <rect x="10" y="24" width="13" height="13" rx="3" />
        </g>
        <g className="illu-anim anim-drift" style={{ animationDelay: "0.5s" }}>
          <rect x="16" y="62" width="13" height="13" rx="3" />
        </g>
        <g className="illu-anim anim-drift" style={{ animationDelay: "1s" }}>
          <rect x="8" y="94" width="13" height="13" rx="3" />
        </g>
        <path d="M32 30h18M38 68h14M28 100h22" strokeDasharray="2 5" opacity="0.5" />
      </g>

      {/* la idea toma estructura */}
      <g {...stroke}>
        <rect x="60" y="16" width="112" height="90" rx="10" />
        <path d="M60 38h112" opacity="0.55" />
        <circle cx="72" cy="27" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
        <circle cx="81" cy="27" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
        <path
          {...stroke}
          stroke="#e8a15b"
          className="illu-anim anim-draw"
          d="M74 54h44M74 68h84M74 82h60M74 96h32"
        />
      </g>
    </svg>
  );
}

function BuildIllu() {
  return (
    <svg viewBox="0 0 180 122" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        {/* marco de la interfaz en construcción */}
        <rect x="18" y="12" width="144" height="98" rx="10" />
        <path d="M18 34h144" opacity="0.55" />
        <circle cx="31" cy="23" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
        <circle cx="40" cy="23" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />

        {/* componentes que encajan */}
        <g className="illu-anim anim-block">
          <rect x="32" y="46" width="52" height="30" rx="6" />
        </g>
        <g className="illu-anim anim-block" style={{ animationDelay: "0.45s" }}>
          <rect x="94" y="46" width="54" height="30" rx="6" stroke="#e8a15b" />
        </g>
        <g className="illu-anim anim-block" style={{ animationDelay: "0.9s" }}>
          <rect x="32" y="84" width="116" height="14" rx="5" />
        </g>

        {/* cursor / caret de edición */}
        <path
          {...stroke}
          strokeWidth="2.4"
          stroke="#e8a15b"
          className="illu-anim anim-caret"
          d="M150 84v12"
        />
      </g>
    </svg>
  );
}

function LaunchIllu() {
  return (
    <svg viewBox="0 0 180 122" className="h-full w-full" aria-hidden>
      <g {...stroke}>
        {/* producto funcionando */}
        <rect x="16" y="14" width="118" height="94" rx="10" />
        <path d="M16 36h118" opacity="0.55" />

        {/* actividad */}
        <g>
          <rect className="illu-anim anim-bar" x="32" y="66" width="10" height="28" rx="3" />
          <rect className="illu-anim anim-bar" x="50" y="54" width="10" height="40" rx="3" style={{ animationDelay: "0.25s" }} />
          <rect className="illu-anim anim-bar" x="68" y="60" width="10" height="34" rx="3" style={{ animationDelay: "0.5s" }} />
          <rect className="illu-anim anim-bar" x="86" y="48" width="10" height="46" rx="3" stroke="#e8a15b" style={{ animationDelay: "0.75s" }} />
        </g>
        <path {...stroke} stroke="#e8a15b" className="illu-anim anim-draw" d="M32 50l24-12 20 8 30-22" />

        {/* indicador de producto vivo */}
        <g>
          <circle cx="150" cy="26" r="5" fill="#e8a15b" stroke="none" />
          <circle className="illu-anim anim-ring" cx="150" cy="26" r="9" stroke="#e8a15b" />
          <circle className="illu-anim anim-ring" cx="150" cy="26" r="9" stroke="#e8a15b" style={{ animationDelay: "1.3s" }} />
        </g>
      </g>
    </svg>
  );
}

const ILLUS = { idea: IdeaIllu, shape: ShapeIllu, build: BuildIllu, launch: LaunchIllu };

function Chevron({ className = "", style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StageCard({ step, active, onEnter, onLeave, onClick, cardRef }) {
  const { t } = useLang();
  const Illu = ILLUS[step.id];
  const copy = t(`process.steps.${step.id}`) || {};
  return (
    <div
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`stage-card group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-[#14130f]/10 bg-[#f6f2ea] p-7 transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        active ? "is-active -translate-y-1.5 scale-[1.015] border-[#14130f]/20 shadow-[0_36px_70px_-38px_rgba(20,19,15,0.5)]" : ""
      }`}
    >
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-[0.05]" style={{ color: "#14130f" }} />
      <div className="font-mono-d relative flex items-center justify-between text-[11px] text-[#6d675c]">
        <span>{step.n}</span>
        <span className="uppercase tracking-[0.22em]">{step.rail}</span>
      </div>

      <div
        className={`illu relative my-7 h-32 w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active ? "scale-[1.07]" : ""
        }`}
      >
        <Illu />
      </div>

      <h3 className="font-serif-d text-[clamp(1.9rem,2.6vw,2.6rem)] font-light leading-[1.02]">{copy.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-[#5f5a50]">{copy.text}</p>

      <div
        className={`mt-5 flex flex-wrap gap-2 transition-[opacity,transform] duration-500 ${
          active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {(copy.keywords || []).map((k) => (
          <span key={k} className="rounded-full border border-[#14130f]/12 px-3 py-1 text-[11px] text-[#6d675c]">
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HowIWork() {
  const { t } = useLang();
  const [active, setActive] = useState(null);
  const mobileRefs = useRef([]);

  // Móvil / tablet: la etapa se activa al entrar en pantalla (una cada vez)
  useEffect(() => {
    const els = mobileRefs.current.filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = els.indexOf(e.target);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Chapter
      id="servicios"
      className="z-10 -mt-[35vh] bg-[#efe9df] text-[#14130f] shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.5)]"
    >
      <div className="relative mx-auto max-w-[1600px] px-4 pb-32 pt-24 md:px-8 md:pb-44 md:pt-36">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-xs mb-6 text-[#6d675c]">01 — {t("process.eyebrow")}</p>
            <h2 className="font-serif-d text-[clamp(2.8rem,5.6vw,6rem)] font-light leading-[0.95] tracking-[-0.02em]">
              <MaskLines
                lines={t("process.title").map((line, i, arr) =>
                  i === arr.length - 1 ? { text: line, className: "italic text-[#b86f2c]" } : line
                )}
              />
            </h2>
          </div>
          <p className="max-w-sm text-[16px] leading-relaxed text-[#5f5a50] lg:text-right">{t("process.lead")}</p>
        </div>

        {/* ── Recorrido: escritorio (horizontal) ── */}
        <div className="relative mt-20 hidden lg:block">
          <div className="absolute left-[12.5%] right-[12.5%] top-[27px] h-px bg-[#14130f]/15" />
          <div className="relative grid grid-cols-4 gap-6">
            {processSteps.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full border bg-[#efe9df] font-mono-d text-[13px] transition-colors duration-500 ${
                    active === i ? "border-[#e8a15b] text-[#b86f2c]" : "border-[#14130f]/15 text-[#6d675c]"
                  }`}
                >
                  {s.n}
                </div>
                <p className={`label-xs mt-4 transition-colors duration-500 ${active === i ? "text-[#14130f]" : "text-[#6d675c]"}`}>
                  {s.rail}
                </p>
              </div>
            ))}
          </div>
          {[25, 50, 75].map((pct) => (
            <Chevron
              key={pct}
              className="absolute top-[17px] h-5 w-5 -translate-x-1/2 text-[#14130f]/35"
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>

        <div className="mt-12 hidden grid-cols-4 gap-6 lg:grid">
          {processSteps.map((s, i) => (
            <StageCard
              key={s.id}
              step={s}
              active={active === i}
              onEnter={() => setActive(i)}
              onLeave={() => setActive(null)}
            />
          ))}
        </div>

        {/* ── Recorrido: móvil / tablet (vertical) ── */}
        <div className="mt-14 lg:hidden">
          {processSteps.map((s, i) => (
            <div key={s.id} className="relative flex gap-5">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-[#efe9df] font-mono-d text-[11px] transition-colors duration-500 ${
                    active === i ? "border-[#e8a15b] text-[#b86f2c]" : "border-[#14130f]/15 text-[#6d675c]"
                  }`}
                >
                  {s.n}
                </div>
                {i < processSteps.length - 1 && (
                  <div className="relative w-px flex-1 bg-[#14130f]/15">
                    <Chevron className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-[#efe9df] text-[#14130f]/35" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-10">
                <StageCard
                  step={s}
                  active={active === i}
                  onEnter={() => setActive(i)}
                  onLeave={() => {}}
                  onClick={() => setActive(i)}
                  cardRef={(el) => {
                    mobileRefs.current[i] = el;
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Chapter>
  );
}
