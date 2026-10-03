import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import HeroCinematic from "@/components/site/HeroCinematic";
import SectionRail from "@/components/site/SectionRail";
import Projects from "@/components/site/Projects";
import HowIWork from "@/components/site/HowIWork";
import About from "@/components/site/About";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import { useSmooth } from "@/lib/smooth";

export default function Home({ ready }) {
  const location = useLocation();
  const { scrollTo } = useSmooth();
  const [category, setCategory] = useState(location.state?.category || sessionStorage.getItem("ooox_cat") || "crypto");

  useEffect(() => {
    sessionStorage.setItem("ooox_cat", category);
  }, [category]);

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (target) {
      const t = setTimeout(() => scrollTo(`#${target}`, { immediate: true }), 80);
      return () => clearTimeout(t);
    }
    scrollTo(0, { immediate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <HeroCinematic ready={ready} />
      <HowIWork />
      <Projects category={category} setCategory={setCategory} />
      <About />
      <Contact />
      <Footer overlap />
      <SectionRail />
    </main>
  );
}
