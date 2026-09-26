import React, { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?#";

function Tile({ target, active, delay }) {
  const [ch, setCh] = useState(target === " " ? " " : CHARS[Math.floor(Math.random() * CHARS.length)]);
  const [flip, setFlip] = useState(0);
  useEffect(() => {
    if (target === " ") return;
    let iv;
    let to;
    if (active) {
      iv = setInterval(() => {
        setCh(CHARS[Math.floor(Math.random() * CHARS.length)]);
        setFlip((f) => f + 1);
      }, 55);
      to = setTimeout(() => {
        clearInterval(iv);
        setCh(target);
        setFlip((f) => f + 1);
      }, delay);
    }
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [active, target, delay]);

  if (target === " ") return <span className="w-[clamp(10px,1.6vw,26px)]" />;
  return (
    <span className="flap-tile relative flex h-[clamp(34px,5.2vw,78px)] w-[clamp(24px,3.6vw,54px)] items-center justify-center overflow-hidden rounded-[6px] md:rounded-[8px]">
      <span key={flip} className="font-mono-d text-[clamp(18px,3vw,46px)] font-medium text-[#efe9df] [animation:flapIn_.12s_ease-out]">
        {ch}
      </span>
      <span className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
      <style>{`@keyframes flapIn{from{transform:rotateX(70deg);opacity:.4}to{transform:rotateX(0);opacity:1}}`}</style>
    </span>
  );
}

export default function SplitFlap({ text = "CONOCE MIS PROYECTOS", className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const words = text.split(" ");
  let idx = 0;
  return (
    <div ref={ref} data-testid="split-flap" className={`flex flex-wrap gap-x-[clamp(10px,1.6vw,26px)] gap-y-2 ${className}`}>
      {words.map((w, wi) => (
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
