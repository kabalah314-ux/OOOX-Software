import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brand } from "@/data/mock";
import { Magnetic, MaskLines, Reveal } from "./helpers";
import { XIcon, TelegramIcon } from "./icons";

const TYPES = ["Web", "App / SaaS", "Crypto", "Automatización", "Otro"];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", type: "Web", budget: "", message: "" });
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || form.message.trim().length < 10) {
      toast.error("Revisa el formulario", { description: "Nombre, un email válido y un mensaje de al menos 10 caracteres." });
      return;
    }
    const prev = JSON.parse(localStorage.getItem("ooox_messages") || "[]");
    localStorage.setItem("ooox_messages", JSON.stringify([...prev, { ...form, at: new Date().toISOString() }]));
    toast.success("¡Mensaje enviado!", { description: "Te respondo en menos de 48 h." });
    setSent(true);
    setForm({ name: "", email: "", type: "Web", budget: "", message: "" });
    setTimeout(() => setSent(false), 3500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brand.email);
    } catch (err) {
      /* ignore */
    }
    setCopied(true);
    toast("Email copiado", { description: brand.email });
    setTimeout(() => setCopied(false), 2000);
  };

  const socialIcon = (id) => (id === "x" ? <XIcon /> : id === "telegram" ? <TelegramIcon /> : <ArrowUpRight className="h-4 w-4" />);
  const field = "h-12 rounded-xl border-white/15 bg-white/[0.03] text-[#efe9df] placeholder:text-white/35 focus-visible:ring-[#e8a15b] focus-visible:ring-offset-0";

  return (
    <section id="contacto" data-testid="contact-section" className="relative overflow-hidden bg-[#14130f] text-[#efe9df]">
      <img src="/img/projects-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#14130f] via-[#14130f]/70 to-[#14130f]" />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-24 pt-28 md:px-8 md:pb-32 md:pt-36">
        <p className="label-xs mb-8 text-[#efe9df]/60">— Contacto</p>
        <h2 className="font-serif-d text-[clamp(3rem,8.5vw,9rem)] font-light leading-[0.92] tracking-[-0.03em]">
          <MaskLines lines={["¿Tienes una idea", { text: "que merece existir?", className: "italic text-[#e8a15b]" }]} />
        </h2>

        <div className="mt-16 grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="max-w-md text-lg leading-relaxed text-[#efe9df]/70">
                Si hay algo útil, bonito o rentable que construir, hablemos. Webs, SaaS, automatizaciones o el lanzamiento de tu próximo token.
              </p>
            </Reveal>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Magnetic>
                <a
                  data-testid="contact-mail-button"
                  href={`mailto:${brand.email}`}
                  className="group flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full bg-[#e8a15b] text-[#14130f] shadow-[0_20px_60px_-10px_rgba(232,161,91,0.5)] transition-transform duration-500 hover:scale-105 md:h-44 md:w-44"
                >
                  <ArrowUpRight className="h-7 w-7 transition-transform duration-500 group-hover:rotate-45" />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.2em]">Escríbeme</span>
                </a>
              </Magnetic>
              <button
                data-testid="contact-copy-email"
                onClick={copy}
                className="group flex items-center gap-3 rounded-full border border-white/15 px-5 py-3 text-sm transition-colors duration-300 hover:border-[#e8a15b]"
              >
                {copied ? <Check className="h-4 w-4 text-[#e8a15b]" /> : <Copy className="h-4 w-4" />}
                {brand.email}
              </button>
            </div>

            <ul className="mt-12">
              {brand.socials.map((s) => (
                <li key={s.id}>
                  <a
                    data-testid={`contact-social-${s.id}`}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between border-b border-white/10 py-4 transition-colors duration-300 hover:text-[#e8a15b]"
                  >
                    <span className="font-serif-d text-2xl font-light transition-transform duration-500 group-hover:translate-x-2">{s.label}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-transform duration-500 group-hover:rotate-[-12deg]">
                      {socialIcon(s.id)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <motion.form
            data-testid="contact-form"
            onSubmit={submit}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8 md:p-10 lg:col-span-7"
          >
            <p className="font-serif-d text-3xl font-light">Cuéntame tu idea</p>
            <p className="mt-2 text-sm text-white/50">Respondo personalmente en menos de 48 h.</p>

            <div className="mt-8">
              <Label className="label-xs !text-[10px] text-white/50">Tipo de proyecto</Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    data-testid={`contact-type-${t.toLowerCase().replace(/[^a-z]/g, "")}`}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors duration-300 ${
                      form.type === t ? "border-[#e8a15b] bg-[#e8a15b] text-[#14130f]" : "border-white/15 text-white/70 hover:border-white/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-name" className="label-xs !text-[10px] text-white/50">Nombre</Label>
                <Input id="c-name" data-testid="contact-name-input" value={form.name} onChange={set("name")} placeholder="Tu nombre" className={`mt-2 ${field}`} />
              </div>
              <div>
                <Label htmlFor="c-email" className="label-xs !text-[10px] text-white/50">Email</Label>
                <Input id="c-email" data-testid="contact-email-input" type="email" value={form.email} onChange={set("email")} placeholder="tu@email.com" className={`mt-2 ${field}`} />
              </div>
            </div>

            <div className="mt-5">
              <Label className="label-xs !text-[10px] text-white/50">Presupuesto orientativo</Label>
              <Select value={form.budget} onValueChange={set("budget")}>
                <SelectTrigger data-testid="contact-budget-select" className={`mt-2 ${field}`}>
                  <SelectValue placeholder="Selecciona un rango" />
                </SelectTrigger>
                <SelectContent>
                  {["< 1.000 €", "1.000 – 5.000 €", "5.000 – 15.000 €", "+ 15.000 €", "Aún no lo sé"].map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5">
              <Label htmlFor="c-msg" className="label-xs !text-[10px] text-white/50">Mensaje</Label>
              <Textarea
                id="c-msg"
                data-testid="contact-message-input"
                value={form.message}
                onChange={set("message")}
                placeholder="¿Qué te gustaría construir?"
                className="mt-2 min-h-[140px] rounded-xl border-white/15 bg-white/[0.03] text-[#efe9df] placeholder:text-white/35 focus-visible:ring-[#e8a15b] focus-visible:ring-offset-0"
              />
            </div>

            <button
              data-testid="contact-submit-button"
              type="submit"
              className="group mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#efe9df] py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#14130f] transition-colors duration-300 hover:bg-[#e8a15b]"
            >
              {sent ? (
                <>
                  <Check className="h-4 w-4" /> Enviado
                </>
              ) : (
                <>
                  Enviar mensaje <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                </>
              )}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
