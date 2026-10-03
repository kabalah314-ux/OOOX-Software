import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];
const BEAT_MS = 2100;

/* ────────────────────────────────────────────────────────────
   Elementia — loop principal del juego:
   EGG → CREATURE → BATTLE → REWARD
   Una pieza pequeña y continua, sin interfaces ni pantallas.
   ──────────────────────────────────────────────────────────── */

function Egg() {
  return (
    <g>
      <ellipse cx="160" cy="152" rx="58" ry="11" fill="#F5C24B" opacity="0.1" />
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="160" cy="112" rx="31" ry="41" fill="#f2e6cb" />
        <path d="M143 92c6 5 10 12 11 21" stroke="#d8c298" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M176 104c-4 6-6 13-6 22" stroke="#d8c298" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M152 130c5 3 11 4 17 2" stroke="#d8c298" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </motion.g>
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1.1, 0.85] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M198 76v8M194 80h8" stroke="#F5C24B" strokeWidth="1.6" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function Creature({ x = 160, y = 104, scale = 1, tone = "main" }) {
  const body = tone === "main" ? "#e2a847" : "#6f5730";
  const belly = tone === "main" ? "#f4e3bd" : "#8c7040";
  const crest = tone === "main" ? "#e2703a" : "#4a3a22";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-24 -34 L-15 -52 L-8 -34 Z" fill={crest} />
      <path d="M24 -34 L15 -52 L8 -34 Z" fill={crest} />
      <ellipse cx="0" cy="0" rx="30" ry="28" fill={body} />
      <ellipse cx="0" cy="12" rx="18" ry="15" fill={belly} />
      <circle cx="-11" cy="-6" r="4" fill="#241c0e" />
      <circle cx="11" cy="-6" r="4" fill="#241c0e" />
      <circle cx="-9.5" cy="-7.5" r="1.4" fill="#f6efe2" />
      <circle cx="12.5" cy="-7.5" r="1.4" fill="#f6efe2" />
      <path d="M-6 6q6 5 12 0" stroke="#241c0e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Battle() {
  return (
    <g>
      <Creature x={108} y={112} scale={0.82} tone="main" />
      <Creature x={212} y={112} scale={0.82} tone="rival" />
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.12, 0.9] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="160" cy="112" r="13" fill="none" stroke="#F5C24B" strokeWidth="1.6" />
        <path d="M160 86v10M160 128v10M132 112h10M178 112h10M141 93l7 7M172 124l7 7M179 93l-7 7M148 124l-7 7" stroke="#F5C24B" strokeWidth="1.6" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function Reward() {
  return (
    <g>
      <Creature x={160} y={132} scale={0.68} tone="main" />
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ y: [0, -6, 0], rotate: [0, 3, 0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="160" cy="82" r="19" fill="#F5C24B" />
        <circle cx="160" cy="82" r="13" fill="none" stroke="#b8892f" strokeWidth="1.6" />
        <path d="M160 73l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8z" fill="#b8892f" />
        <path d="M160 54v-8M160 118v8M132 82h-8M188 82h8M139 61l-6-6M181 61l6-6M139 103l-6 6M181 103l6 6" stroke="#F5C24B" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </motion.g>
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.05, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="118" cy="70" r="2" fill="#F5C24B" />
        <circle cx="204" cy="62" r="2.4" fill="#F5C24B" />
        <circle cx="214" cy="96" r="1.8" fill="#F5C24B" />
      </motion.g>
    </g>
  );
}

const BEATS = [Egg, Creature, Battle, Reward];

export default function ElementiaScene({ active = false }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const t = setInterval(() => setPhase((p) => (p + 1) % BEATS.length), BEAT_MS);
    return () => clearInterval(t);
  }, [active]);

  // En reposo se ve la criatura, tranquila
  const current = active ? phase : 1;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="el-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c1408" />
            <stop offset="100%" stopColor="#2c2009" />
          </linearGradient>
          <radialGradient id="el-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#F5C24B" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#F5C24B" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="320" height="200" fill="url(#el-bg)" />
        <rect x="0" y="0" width="320" height="200" fill="url(#el-glow)" />

        {BEATS.map((Beat, i) => (
          <motion.g
            key={i}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            animate={{ opacity: current === i ? 1 : 0, scale: current === i ? 1 : 0.94 }}
            transition={{ duration: 0.75, ease: EASE }}
          >
            {i === 1 ? <Creature /> : <Beat />}
          </motion.g>
        ))}

        {/* indicador del loop */}
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={139 + i * 15 - (current === i ? 6 : 2)}
              y="180"
              width={current === i ? 12 : 4}
              height="3"
              rx="1.5"
              fill="#F5C24B"
              opacity={current === i ? 0.9 : 0.3}
              style={{ transition: "all .5s cubic-bezier(0.22,1,0.36,1)" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
