import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 350, damping: 30, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 350, damping: 30, mass: 0.5 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);
    document.body.classList.add("has-cursor");
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e) => {
      const c = e.target.closest?.("[data-cursor]");
      setLabel(c ? c.getAttribute("data-cursor") : "");
      setHovering(!!e.target.closest?.("a, button, [role='button'], [data-cursor], input, textarea"));
    };
    const d = () => setDown(true);
    const u = () => setDown(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mousedown", d);
    window.addEventListener("mouseup", u);
    return () => {
      document.body.classList.remove("has-cursor");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", d);
      window.removeEventListener("mouseup", u);
    };
  }, [x, y]);

  if (!enabled) return null;
  const size = label ? 104 : hovering ? 54 : 34;

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[200] h-1.5 w-1.5 rounded-full bg-[#e8a15b]"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: label ? 0 : 1 }}
      />
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[199] flex items-center justify-center rounded-full"
        style={{ x: rx, y: ry, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: size,
          height: size,
          scale: down ? 0.85 : 1,
          backgroundColor: label ? "rgba(232,161,91,0.95)" : "rgba(239,233,223,0)",
          borderColor: label ? "rgba(232,161,91,0)" : "rgba(239,233,223,0.7)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <span className="absolute inset-0 rounded-full border mix-blend-difference" style={{ borderColor: label ? "transparent" : "rgba(239,233,223,0.8)" }} />
        {label && <span className="font-sans-d text-[10px] font-semibold uppercase tracking-[0.12em] text-[#14130f]">{label}</span>}
      </motion.div>
    </>
  );
}
