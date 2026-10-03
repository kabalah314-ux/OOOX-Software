import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const SECTIONS = [
  { id: "servicios", label: "Cómo trabajo", n: "01" },
  { id: "proyectos", label: "Proyectos", n: "02" },
  { id: "sobre-mi", label: "Sobre mí", n: "03" },
  { id: "contacto", label: "Contacto", n: "04" },
];

export function useActiveSection() {
  const [active, setActive] = useState("inicio");
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname !== "/") {
      setActive(null);
      return;
    }
    let obs;
    const t = setTimeout(() => {
      obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setActive(e.target.id);
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      ["inicio", ...SECTIONS.map((s) => s.id)].forEach((id) => {
        const el = document.getElementById(id);
        if (el) obs.observe(el);
      });
    }, 900);
    return () => {
      clearTimeout(t);
      obs?.disconnect();
    };
  }, [pathname]);

  return active;
}
