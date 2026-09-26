import React, { useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SmoothScrollProvider } from "@/lib/smooth";
import Navbar from "@/components/site/Navbar";
import Cursor from "@/components/site/Cursor";
import Preloader from "@/components/site/Preloader";
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
      <motion.div
        className="pointer-events-none fixed inset-0 z-[120] origin-bottom bg-[#14130f]"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{ duration: 0.6, ease: EASE_IO }}
      />
      <motion.div
        className="pointer-events-none fixed inset-0 z-[120] origin-top bg-[#14130f]"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 0 }}
        transition={{ duration: 0.7, ease: EASE_IO, delay: 0.1 }}
      />
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
