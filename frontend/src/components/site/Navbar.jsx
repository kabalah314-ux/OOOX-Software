import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowUpRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useSmooth } from "@/lib/smooth";
import { brand } from "@/data/mock";
import { XIcon, TelegramIcon } from "./icons";

const links = [
  { id: "proyectos", label: "Proyectos" },
  { id: "servicios", label: "Servicios" },
  { id: "sobre-mi", label: "Sobre mí" },
  { id: "contacto", label: "Contacto" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmooth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      setHidden(y > last && y > 400);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: id } });
    } else {
      setTimeout(() => scrollTo(`#${id}`), open ? 350 : 0);
    }
  };

  return (
    <motion.header
      data-testid="navbar"
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8"
      animate={{ y: hidden && !open ? -110 : 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`mx-auto flex max-w-[1600px] items-center justify-between rounded-full px-5 py-3 transition-[background-color,backdrop-filter,box-shadow] duration-500 md:px-7 ${
          scrolled ? "bg-[#14130f]/70 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <Link to="/" data-testid="nav-logo" onClick={() => location.pathname === "/" && scrollTo(0)} className="group flex items-center gap-3 text-[#efe9df]">
          <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#efe9df]/30">
            <span className="h-2 w-2 rounded-full bg-[#e8a15b] transition-transform duration-500 group-hover:scale-[3]" />
          </span>
          <span className="font-sans-d text-[13px] font-medium tracking-[0.35em]">{brand.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.id}
              data-testid={`nav-link-${l.id}`}
              onClick={() => go(l.id)}
              className="group relative overflow-hidden rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#efe9df]/75 transition-colors duration-300 hover:text-[#efe9df]"
            >
              <span className="relative block transition-transform duration-500 group-hover:-translate-y-[130%]">{l.label}</span>
              <span className="absolute inset-x-0 top-1/2 block translate-y-[80%] text-center text-[#e8a15b] transition-transform duration-500 group-hover:-translate-y-1/2">
                {l.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            data-testid="nav-cta"
            onClick={() => go("contacto")}
            className="hidden items-center gap-2 rounded-full bg-[#efe9df] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#14130f] transition-colors duration-300 hover:bg-[#e8a15b] md:inline-flex"
          >
            Hablemos <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="nav-mobile-toggle" aria-label="Abrir menú" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efe9df]/25 text-[#efe9df] md:hidden">
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="top" className="h-[100svh] border-none bg-[#14130f] p-6 text-[#efe9df] [&>button]:text-[#efe9df]">
              <SheetTitle className="label-xs text-[#efe9df]/50">Menú</SheetTitle>
              <div className="mt-16 flex flex-col gap-2">
                <AnimatePresence>
                  {open &&
                    links.map((l, i) => (
                      <motion.button
                        key={l.id}
                        data-testid={`mobile-nav-link-${l.id}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => go(l.id)}
                        className="flex items-baseline justify-between border-b border-[#efe9df]/10 py-4 text-left"
                      >
                        <span className="font-serif-d text-5xl font-light">{l.label}</span>
                        <span className="font-mono-d text-xs text-[#e8a15b]">0{i + 1}</span>
                      </motion.button>
                    ))}
                </AnimatePresence>
              </div>
              <div className="absolute inset-x-6 bottom-8 flex items-center justify-between">
                <a href={`mailto:${brand.email}`} className="text-sm text-[#efe9df]/70">{brand.email}</a>
                <div className="flex gap-2">
                  <a href={brand.socials[0].url} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efe9df]/20"><XIcon /></a>
                  <a href={brand.socials[1].url} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efe9df]/20"><TelegramIcon /></a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
