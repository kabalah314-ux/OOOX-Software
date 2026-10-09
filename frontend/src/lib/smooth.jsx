import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";

const SmoothCtx = createContext({ lenis: null, scrollTo: () => {} });

export function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    const l = new Lenis({ duration: 1.15, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenisRef.current = l;
    setLenis(l);
    let raf;
    const loop = (time) => {
      l.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
    };
  }, []);

  const scrollTo = (target, opts = {}) => {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (lenisRef.current) {
      // Lenis cachea el alto del documento: al cambiar de página hay que
      // refrescarlo o el destino queda recortado al límite de la página anterior.
      lenisRef.current.resize();
      lenisRef.current.scrollTo(el ?? 0, { offset: opts.offset ?? 0, immediate: opts.immediate ?? false, duration: 1.4 });
    } else if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: opts.immediate ? "auto" : "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  };

  return <SmoothCtx.Provider value={{ lenis, scrollTo }}>{children}</SmoothCtx.Provider>;
}

export const useSmooth = () => useContext(SmoothCtx);
