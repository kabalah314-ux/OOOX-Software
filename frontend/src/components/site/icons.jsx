import React from "react";

export const XIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const TelegramIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M21.94 4.3 18.7 19.6c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.3c-.26.26-.49.49-1 .49l.36-5.03 9.15-8.27c.4-.35-.09-.55-.62-.2L6.17 13.2 1.3 11.68c-1.06-.33-1.08-1.06.22-1.57L20.54 2.8c.88-.32 1.65.2 1.4 1.5z" />
  </svg>
);

export const OooxMark = ({ className = "" }) => (
  <span className={`inline-flex items-center gap-[2px] font-sans-d tracking-[0.3em] ${className}`}>OOOX</span>
);
