import React, { useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SmoothScrollProvider } from "@/lib/smooth";
import Navbar from "@/components/site/Navbar";
import Cursor from "@/components/site/Cursor";
import Preloader from "@/components/site/Preloader";
import { ScrollProgress } from "@/components/site/SectionRail";
import Home from "@/pages/Home";
import CaseStudy from "@/pages/CaseStudy";
import { Toaster } from "@/components/ui/sonner";

if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const EASE_IO = [0.76, 0, 0.24, 1];

function Page({ children }) {
  return (
    <>
      {children}
      {/* cover: rises from below with a hill-arch top */}
      <motion.div
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[140vh] bg-[#14130f]"
        style={{ borderRadius: "50% 50% 0 0 / 22vh 22vh 0 0" }}
        initial={{ y: "100vh" }}
        animate={{ y: "100vh" }}
        exit={{ y: "-30vh" }}
        transition={{ duration: 0.75, ease: EASE_IO }}
      />
      {/* reveal: lifts away with an arched bottom edge */}
      <motion.div
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex h-[140vh] items-center justify-center bg-[#14130f]"
        style={{ borderRadius: "0 0 50% 50% / 0 0 22vh 22vh" }}
        initial={{ y: "-10vh" }}
        animate={{ y: "-150vh" }}
        exit={{ y: "-150vh" }}
        transition={{ duration: 0.9, ease: EASE_IO, delay: 0.15 }}
      >
        <span className="font-sans-d text-[12px] tracking-[0.5em] text-[#efe9df]/60">OOOX</span>
      </motion.div>
    </>
  );
}

function Shell() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const done = useCallback(() => setLoading(false), []);
  const reveal = useCallback(() => setReady(true), []);

  return (
    <div className="App grain">
      {loading && <Preloader onReveal={reveal} onDone={done} />}
      <ScrollProgress />
      <Cursor />
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home ready={ready} /></Page>} />
          <Route path="/proyecto/:id" element={<Page><CaseStudy /></Page>} />
          <Route path="*" element={<Page><Home ready={ready} /></Page>} />
        </Routes>
      </AnimatePresence>
      <Toaster position="bottom-right" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SmoothScrollProvider>
        <Shell />
      </SmoothScrollProvider>
    </BrowserRouter>
  );
}

export default App;
