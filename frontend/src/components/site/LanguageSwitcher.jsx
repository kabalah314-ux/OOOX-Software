import React from "react";
import { LANGS, useLang } from "@/i18n";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`flex items-center gap-1 rounded-full border border-[#efe9df]/25 p-1 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          aria-label={`Idioma ${l.label}`}
          className={`font-mono-d rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] transition-colors duration-300 ${
            lang === l.id ? "bg-[#e8a15b] text-[#14130f]" : "text-[#efe9df]/60 hover:text-[#efe9df]"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
