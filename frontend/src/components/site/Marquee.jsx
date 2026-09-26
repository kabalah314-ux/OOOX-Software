import React from "react";
import { Asterisk } from "lucide-react";

export default function Marquee({ words, className = "", fast = false, reverse = false, itemClass = "" }) {
  const row = [...words, ...words];
  return (
    <div className={`pause-hover relative flex overflow-hidden ${className}`}>
      <div className={`flex shrink-0 items-center ${fast ? "animate-marquee-fast" : "animate-marquee"}`} style={{ animationDirection: reverse ? "reverse" : "normal" }}>
        {[...row, ...row].map((w, i) => (
          <span key={i} className={`flex items-center ${itemClass}`}>
            <span className="whitespace-nowrap">{w}</span>
            <Asterisk className="mx-6 h-6 w-6 shrink-0 text-[#e8a15b] md:mx-10 md:h-8 md:w-8" />
          </span>
        ))}
      </div>
    </div>
  );
}
