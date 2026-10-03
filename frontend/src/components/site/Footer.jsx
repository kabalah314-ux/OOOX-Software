import React from "react";
import { contactContent } from "@/data/contact";
import { useLang } from "@/i18n";

export default function Footer({ overlap = false }) {
  const { t } = useLang();
  return (
    <footer className={`relative z-0 w-full overflow-hidden bg-[#0e0d0b] text-[#efe9df] ${overlap ? "-mt-16" : ""}`}>
      <div className={`mx-auto max-w-[1600px] px-4 pb-10 md:px-8 ${overlap ? "pt-20" : "pt-14"}`}>
        <div className="flex flex-col gap-3 border-t border-white/10 pt-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/50">{t("contact.footerLine")}</p>
          <p className="font-mono-d tabular-nums text-white/40">
            © {new Date().getFullYear()} {contactContent.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
