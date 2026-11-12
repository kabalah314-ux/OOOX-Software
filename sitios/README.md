# Sitios estáticos de OOOX

Webs de demostración que se enlazan desde ooox.es y se publican en **Cloudflare Pages** (plan gratuito).
Cada carpeta es un proyecto de Cloudflare Pages distinto, conectado a este repositorio:

| Carpeta | Proyecto de Cloudflare Pages | URL pública |
|---|---|---|
| `aurea/` | `casa-aurea` | https://casa-aurea.pages.dev |
| `moog-barcelona/` | `moog-barcelona` | https://moog-barcelona.pages.dev |

- Son HTML/JS ya construidos: **no hay paso de build**. Lo que hay en la carpeta es lo que se publica.
- Al hacer push a `main`, Cloudflare publica solo el sitio cuya carpeta ha cambiado.
- Origen: copiados el 12/11/2026 del último despliegue de Vercel (`casa-aurea` y `moog-barcelona`).
