// La función «oficio» de Supabase: el juez con el almacén de verdad.
// Aquí no se decide nada: todo lo que se puede y no se puede hacer está en juez.mjs y en las reglas (oficio-nucleo.js).
// Las reglas y el juez no se copian aquí: se traen del repositorio, de una versión exacta (el número largo de las dos
// líneas de abajo es el commit). Así lo que corre en el servidor es, letra por letra, lo que pasó las pruebas.
// Para llevar al servidor un cambio de las reglas o del juez: cambiar ese número en las dos líneas y volver a desplegar.
// No pide la llave de Supabase a quien llama (verify_jwt = false): cada persona entra con su código, y eso lo mira el juez.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import "https://raw.githubusercontent.com/kabalah314-ux/OOOX-Software/00ac39e48f832c0f70601123ce4fc237d9d0dde2/frontend/public/demos/ramirez-24h/js/oficio-nucleo.js";   // las reglas: quedan en globalThis.OficioNucleo
import { crea } from "https://raw.githubusercontent.com/kabalah314-ux/OOOX-Software/00ac39e48f832c0f70601123ce4fc237d9d0dde2/webs-negocios/oficios-servidor/juez.mjs";

// deno-lint-ignore no-explicit-any
const K = (globalThis as any).OficioNucleo;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function srv(que: string, a: Record<string, unknown>) {
  const { data, error } = await sb.rpc("oficios_srv", { p_que: que, p_a: a });
  if (error) throw new Error("almacén (" + que + "): " + error.message);
  return data;
}
// El contrato de ocho funciones que pide el juez (LEEME.md), sobre la base de datos.
const almacen = {
  async negocio(negocio: string) {
    const n = await srv("negocio", { negocio });
    if (n && typeof n.datos_txt === "string") { n.datos = JSON.parse(n.datos_txt); delete n.datos_txt; }   // llegan como texto para no perder el orden de las claves
    return n;
  },
  entra: (negocio: string, persona: string, codigo: string, red: string) => srv("entra", { negocio, persona, codigo, red }),
  vivos: (negocio: string) => srv("vivos", { negocio }),
  hecha: (negocio: string, clave: string) => srv("hecha", { negocio, clave }),
  guarda: (negocio: string, v: number, cambio: unknown) => srv("guarda", { negocio, v, cambio }),
  cambios: (negocio: string, desde: number) => srv("cambios", { negocio, desde }),
  vista: (negocio: string, aviso: string, llave: string) => srv("vista", { negocio, aviso, llave }),
  tope: (negocio: string, clave: string, max: number, ventana: number) => srv("tope", { negocio, clave, max, ventana }),
};
const juez = crea({ K, almacen, aviso: (e: unknown) => console.error("juez:", e) });
const VERSION = { reglas: K && K.VERSION, commit: "00ac39e48f83" };   // para saber desde fuera qué versión corre

const CAB = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, apikey, authorization, x-client-info", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-max-age": "86400" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CAB, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
async function huella(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("oficios:" + t));
  return Array.from(new Uint8Array(d).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CAB });
  if (req.method === "GET") return json({ ok: true, oficio: VERSION });
  if (req.method !== "POST") return json({ ok: false, err: "peticion" }, 405);
  // deno-lint-ignore no-explicit-any
  let p: any = null;
  try { const t = await req.text(); if (t.length <= 600000) p = JSON.parse(t); } catch { p = null; }
  if (p && typeof p === "object" && !Array.isArray(p)) {
    // desde qué conexión llaman lo dice el servidor, nunca quien llama
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    p.red = ip ? await huella(ip) : "";
  }
  return json(await juez.atiende(p));
});
