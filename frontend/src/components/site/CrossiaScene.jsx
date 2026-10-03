import React from "react";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

const STARS = [
  { x: 36, y: 30, r: 1.3 },
  { x: 92, y: 20, r: 1 },
  { x: 150, y: 38, r: 1.2 },
  { x: 214, y: 24, r: 1.4 },
  { x: 272, y: 46, r: 1 },
  { x: 296, y: 18, r: 1.2 },
  { x: 22, y: 74, r: 1 },
  { x: 300, y: 92, r: 1.1 },
];

const TREES = [
  { x: 128, y: 74 },
  { x: 196, y: 70 },
  { x: 112, y: 104 },
];

/* ────────────────────────────────────────────────────────────
   CrossIA — Escena 01: el personaje se queda dormido y despierta
   en el mundo del sueño. Una sola secuencia, muy sutil.
   ──────────────────────────────────────────────────────────── */
export default function CrossiaScene({ active = false }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="cx-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111c31" />
            <stop offset="100%" stopColor="#22314e" />
          </linearGradient>
          <radialGradient id="cx-planet" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#6f9a78" />
            <stop offset="70%" stopColor="#33566a" />
            <stop offset="100%" stopColor="#1d3348" />
          </radialGradient>
          <linearGradient id="cx-dawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8a15b" stopOpacity="0" />
            <stop offset="100%" stopColor="#e8a15b" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* cielo */}
        <rect x="0" y="0" width="320" height="200" fill="url(#cx-sky)" />

        {/* estrellas */}
        <g>
          {STARS.map((s, i) => (
            <motion.circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#efe9df"
              animate={{ opacity: active ? [0.25, 0.9, 0.25] : 0.22 }}
              transition={active ? { duration: 3.2 + i * 0.25, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
            />
          ))}
        </g>

        {/* tinte cálido al entrar en el sueño */}
        <motion.rect
          x="0"
          y="120"
          width="320"
          height="80"
          fill="url(#cx-dawn)"
          animate={{ opacity: active ? 0.22 : 0 }}
          transition={{ duration: 1.8, ease: EASE }}
        />

        {/* colinas */}
        <path d="M0 152 C70 130 130 142 190 134 C240 128 282 136 320 130 L320 200 L0 200 Z" fill="#16223a" />
        <path d="M0 172 C60 158 112 152 162 158 C212 164 262 156 320 162 L320 200 L0 200 Z" fill="#101a2c" />

        {/* 01 — el personaje descansa */}
        <motion.g
          animate={active ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: active ? 0.35 : 0.5 }}
        >
          <ellipse cx="106" cy="153" rx="13" ry="5" fill="#2b3d5c" />
          <rect x="116" y="141" width="36" height="17" rx="8.5" fill="#c8813f" />
          <rect x="132" y="141" width="20" height="17" rx="8.5" fill="#e6d9c0" />
          <circle cx="161" cy="147" r="8.5" fill="#e6d9c0" />
          <circle cx="163.5" cy="146.5" r="1.2" fill="#1b2740" />
        </motion.g>

        {/* 02 — las «z» del sueño */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={active ? { opacity: 0, scale: 0.85 } : { opacity: 0.55, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: active ? 0.15 : 0.35 }}
        >
          <text x="176" y="128" fontSize="11" fill="#efe9df" className="font-serif-d">z</text>
          <text x="188" y="118" fontSize="9" fill="#efe9df" className="font-serif-d">z</text>
          <text x="198" y="110" fontSize="7" fill="#efe9df" className="font-serif-d">z</text>
        </motion.g>

        {/* 03 — anillo de transición al mundo del sueño */}
        <motion.circle
          cx="160"
          cy="112"
          r="46"
          fill="none"
          stroke="#e8a15b"
          strokeWidth="1.2"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={active ? { scale: [0.35, 1.9], opacity: [0, 0.5, 0] } : { scale: 0.35, opacity: 0 }}
          transition={active ? { duration: 1.9, delay: 0.5, ease: "easeOut" } : { duration: 0.4 }}
        />

        {/* 04 — el mundo de CrossIA */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.82 }}
          transition={{ duration: 1.3, ease: EASE, delay: active ? 1 : 0 }}
        >
          <circle cx="160" cy="112" r="52" fill="url(#cx-planet)" />
          <circle cx="160" cy="112" r="52" fill="none" stroke="#e8a15b" strokeOpacity="0.28" strokeWidth="1" />

          {TREES.map((t, i) => (
            <motion.g
              key={i}
              transform={`translate(${t.x} ${t.y})`}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.8, ease: EASE, delay: active ? 1.25 + i * 0.12 : 0 }}
            >
              <path d="M0 -13 L7 3 H-7 Z" fill="#3f7156" />
              <rect x="-1.4" y="3" width="2.8" height="7" rx="1.2" fill="#6b4b32" />
            </motion.g>
          ))}

          <motion.g
            transform="translate(162 68)"
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.8, ease: EASE, delay: active ? 1.5 : 0 }}
          >
            <rect x="-9" y="-1" width="18" height="11" fill="#e6d9c0" />
            <path d="M-11 -1 L0 -11 L11 -1 Z" fill="#c8813f" />
            <rect x="-2.4" y="3" width="4.8" height="7" rx="1" fill="#6b4b32" />
          </motion.g>

          <motion.g
            transform="translate(136 66)"
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.8, ease: EASE, delay: active ? 1.65 : 0 }}
          >
            <circle cx="0" cy="-7" r="3.6" fill="#e6d9c0" />
            <path d="M-5 5 a5 8 0 0 1 10 0 z" fill="#e6d9c0" />
          </motion.g>
        </motion.g>

        {/* nubes suaves */}
        <motion.g
          animate={active ? { x: [0, 7, 0], opacity: [0.35, 0.7, 0.35] } : { x: 0, opacity: 0.25 }}
          transition={active ? { duration: 9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
        >
          <ellipse cx="62" cy="52" rx="17" ry="5" fill="#efe9df" opacity="0.35" />
          <ellipse cx="252" cy="72" rx="14" ry="4.5" fill="#efe9df" opacity="0.3" />
        </motion.g>
      </svg>
    </div>
  );
}
