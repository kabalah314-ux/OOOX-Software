import React, { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function Tile({ target, active, delay }) {
  const [c, setC] = useState(" ");
  useEffect(() => {
    if (!active) return;
    let iv;
    const t = setTimeout(() => {
      let n = 0;
      const steps = 6 + Math.floor(Math.random() * 6);
      iv = setInterval(() => {
        n += 1;
        if (n >= steps) {
          setC(target);
          clearInterval(iv);
        } else setC(CHARS[Math.floor(Math.random() * CHARS.length)]);
      }, 55);
    }, delay);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [active, target, delay]);
  return (
    <span className="flap-tile font-mono-d relative flex h-[clamp(2.2rem,4.4vw,4.6rem)] w-[clamp(1.5rem,3vw,3.2rem)] items-center justify-center rounded-[6px] text-[clamp(1.3rem,2.8vw,3rem)] font-bold text-[#efe9df]">
      {c}
      <span className="absolute inset-x-0 top-1/2 h-px bg-black/50" />
    </span>
  );
}

export default function SplitFlap({ text }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  let idx = 0;
  return (
    <div ref={ref} className="flex flex-wrap gap-x-4 gap-y-2 md:gap-x-6">
      {text.split(" ").map((w, wi) => (
        <div key={wi} className="flex gap-[3px] md:gap-[5px]">
          {w.split("").map((c, ci) => {
            idx += 1;
            return <Tile key={ci} target={c} active={inView} delay={450 + idx * 70} />;
          })}
        </div>
      ))}
    </div>
  );
}
