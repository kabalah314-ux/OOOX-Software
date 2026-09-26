import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import Projects from "@/components/site/Projects";
import Services from "@/components/site/Services";
import About from "@/components/site/About";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import { marqueeWords } from "@/data/mock";
import { useSmooth } from "@/lib/smooth";

export default function Home({ ready }) {
  const location = useLocation();
  const { scrollTo } = useSmooth();
  const [category, setCategory] = useState(location.state?.category || sessionStorage.getItem("ooox_cat") || "web");
  const [view, setView] = useState("showcase");

  useEffect(() => {
    sessionStorage.setItem("ooox_cat", category);
  }, [category]);

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (target) {
      const t = setTimeout(() => scrollTo(`#${target}`, { immediate: true }), 80);
      window.history.replaceState({}, "");
      return () => clearTimeout(t);
    }
    scrollTo(0, { immediate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main data-testid="home-page">
      <Hero ready={ready} />
      <div className="border-y border-white/10 bg-[#14130f] py-8 md:py-10">
        <Marquee words={marqueeWords} itemClass="font-serif-d text-5xl font-light italic text-[#efe9df] md:text-7xl" />
      </div>
      <Projects category={category} setCategory={setCategory} view={view} setView={setView} />
      <Services onPick={setCategory} />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
