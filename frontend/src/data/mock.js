// ============================================================
//  OOOX — Datos del portfolio (MOCK)
//  Para añadir un proyecto nuevo, duplica un objeto de `projects`
//  y cambia sus campos. category: 'web' | 'crypto'
//  access: 'public' | 'private' (privado = se muestran imágenes y
//  se ofrece "Solicitar demo" en lugar de entrar a la web).
// ============================================================

export const brand = {
  name: "OOOX",
  tagline: "Archivo vivo — Proyectos, ideas y herramientas",
  email: "hola@ooox.es",
  city: "Barcelona",
  timezone: "Europe/Madrid",
  socials: [
    { id: "x", label: "X", url: "https://x.com/" },
    { id: "telegram", label: "Telegram", url: "https://t.me/" },
    { id: "github", label: "GitHub", url: "https://github.com/" },
    { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/" },
  ],
};

export const categories = [
  {
    id: "web",
    label: "Webs / Apps",
    short: "Webs & Apps",
    description:
      "Productos digitales para negocios y marcas: webs que convierten, SaaS y herramientas a medida.",
  },
  {
    id: "crypto",
    label: "Crypto",
    short: "Crypto",
    description:
      "Lanzamientos on-chain: tokens, juegos y comunidades. Web, arcade, tokenomics y redes de cada proyecto.",
  },
];

export const projects = [
  // ---------------------------------------------------------- WEBS / APPS
  {
    id: "moog-barcelona",
    category: "web",
    title: "MOOG Barcelona",
    kicker: "30 aniversario · techno desde 1996",
    year: "2026",
    type: "Web de club · Rediseño",
    status: "Online",
    statusTone: "live",
    access: "public",
    url: "https://moog-barcelona.vercel.app",
    cover: "/projects/moog.jpg",
    long: "/projects/moog_long.jpg",
    mobile: "/projects/moog_m.jpg",
    gallery: ["/projects/moog.jpg", "/projects/moog_m.jpg"],
    accent: "#5EEAD4",
    accentSoft: "#0B1416",
    description:
      "Réplica mejorada de la web del club techno más mítico del Raval: agenda, merch, residentes, galería y un orbe 3D que reacciona al ratón.",
    longDescription:
      "Para el 30 aniversario de MOOG planteé una web que respirase la cabina: tipografía gigante, un orbe líquido en tiempo real, agenda con filas que laten al ritmo y un índice de DJs con foto al hover. Misma estructura que la original, pero con movimiento, sonido opcional y una experiencia mucho más cercana a estar en el club a las 23:59h.",
    highlights: [
      "Orbe 3D interactivo en el hero con estela y reflejos",
      "Agenda de 28 eventos con suscripción a calendario",
      "Índice de residentes con imagen al pasar el ratón",
      "Galería arrastrable y modo sonido on/off",
    ],
    stack: ["React", "WebGL", "Motion", "Vercel"],
    tags: ["Ocio nocturno", "Branding", "Animación"],
    metrics: [
      { label: "Secciones", value: "13" },
      { label: "Eventos", value: "28" },
      { label: "Orbes", value: "5" },
    ],
  },
  {
    id: "massflow",
    category: "web",
    title: "MassFlow",
    kicker: "SaaS de gestión de masajes a domicilio",
    year: "2026",
    type: "SaaS · Panel de gestión",
    status: "Privado",
    statusTone: "private",
    access: "private",
    url: "https://saas-madajesadomicilio.vercel.app/",
    cover: "/projects/massflow.jpg",
    long: "/projects/massflow_long.jpg",
    mobile: "/projects/massflow_m.jpg",
    gallery: ["/projects/massflow.jpg", "/projects/massflow_m.jpg"],
    accent: "#10B981",
    accentSoft: "#ECFDF5",
    description:
      "Sistema completo para negocios de masajes a domicilio: reservas, agenda de terapeutas, clientes y cobros desde un único panel.",
    longDescription:
      "MassFlow nace de un problema real: coordinar terapeutas que se mueven por la ciudad, clientes que reservan a última hora y cobros dispersos. El panel centraliza reservas, disponibilidad y facturación, con acceso por roles. Es un producto cerrado: las imágenes muestran su interior y puedo hacerte una demo privada.",
    highlights: [
      "Reservas online con disponibilidad en tiempo real",
      "Agenda y rutas por terapeuta",
      "Fichas de cliente e historial de sesiones",
      "Acceso con roles y recuperación de contraseña",
    ],
    stack: ["React", "Auth", "Base de datos", "Vercel"],
    tags: ["SaaS", "Negocio local", "Reservas"],
    metrics: [
      { label: "Roles", value: "3" },
      { label: "Módulos", value: "6" },
      { label: "Acceso", value: "Privado" },
    ],
  },
  // ---------------------------------------------------------- CRYPTO
  {
    id: "elementia",
    category: "crypto",
    title: "Elementia",
    kicker: "Colecciona, cría y combate criaturas elementales",
    year: "2026",
    type: "GameFi · Juego P2E",
    status: "Demo jugable",
    statusTone: "live",
    access: "public",
    url: "https://axie-infinity-style-game.vercel.app/",
    cover: "/projects/elementia.jpg",
    long: "/projects/elementia_long.jpg",
    mobile: "/projects/elementia_m.jpg",
    gallery: ["/projects/elementia.jpg", "/projects/elementia_m.jpg"],
    accent: "#F5C24B",
    accentSoft: "#1A1508",
    token: {
      ticker: "$ELT",
      chain: "Robinhood Chain",
      chainId: "4663",
      supply: "100M",
      tax: "—",
      liquidity: "LP 24m",
    },
    socials: { web: "https://axie-infinity-style-game.vercel.app/", x: "https://x.com/", telegram: "https://t.me/" },
    description:
      "Juego de criaturas estilo Axie en Robinhood Chain: mina huevos, cría nuevas generaciones y combate 3×3 por turnos con 18 tipos.",
    longDescription:
      "Elementia es un juego completo con economía de dos activos: Gemas (off-chain, se ganan jugando) y ELT, token ERC-20 de 100M fijos para premios de temporada y gobernanza. Aventura en solitario de 15 etapas, Arena PvP con MMR y 6 ligas, mercado entre jugadores con 5 % de comisión y temporadas de 28 días.",
    highlights: [
      "Combates 3×3 por turnos con tabla de 18 tipos",
      "Criaturas generadas desde su ADN: 4 partes y genes 0-31",
      "Mercado P2P, cría y quema verificable on-chain",
      "Temporadas de 28 días con 250.000 ELT en premios",
    ],
    stack: ["React", "EVM", "ERC-20", "Robinhood Chain"],
    tags: ["GameFi", "P2E", "Tokenomics"],
    metrics: [
      { label: "Tipos", value: "18" },
      { label: "Ligas", value: "6" },
      { label: "Supply", value: "100M" },
    ],
  },
  {
    id: "usain-bot",
    category: "crypto",
    title: "Usain Bot",
    kicker: "Winners are always first.",
    year: "2026",
    type: "Memecoin · Arcade",
    status: "Build mode",
    statusTone: "build",
    access: "public",
    url: "https://usain-bot.vercel.app/",
    cover: "/projects/bolt.jpg",
    long: "/projects/bolt_long.jpg",
    mobile: "/projects/bolt_m.jpg",
    gallery: ["/projects/bolt.jpg", "/projects/bolt_m.jpg"],
    accent: "#FFD83D",
    accentSoft: "#17150A",
    token: {
      ticker: "$BOLT",
      chain: "Robinhood Chain",
      chainId: "4663",
      supply: "1B",
      tax: "0/0",
      liquidity: "100% lock",
    },
    socials: { web: "https://usain-bot.vercel.app/", x: "https://x.com/", telegram: "https://t.me/" },
    description:
      "El bot más rápido de Robinhood Chain. Memecoin con arcade jugable: 100m Masher y Reaction 9.39 con muro de campeones.",
    longDescription:
      "En 2026 un robot bajó de los 9.58 s de Bolt. $BOLT convierte esa historia en una memecoin con identidad cómic, dos minijuegos arcade gratuitos, leaderboard, roadmap en 4 calles y guía de compra. Sin preventa ni tokens de equipo: 0/0 de tasas y liquidez bloqueada para siempre tras la curva.",
    highlights: [
      "Arcade con 2 minijuegos y leaderboard general",
      "Historia de origen en formato portada de periódico",
      "Tokenomics transparentes: 0/0 tax, 100 % público",
      "Rig animado del personaje por piezas",
    ],
    stack: ["React", "Canvas", "EVM", "Robinhood Chain"],
    tags: ["Memecoin", "Arcade", "Comunidad"],
    metrics: [
      { label: "Record", value: "9.39s" },
      { label: "Tax", value: "0/0" },
      { label: "Supply", value: "1B" },
    ],
  },
];

export const services = [
  {
    n: "01",
    title: "Webs que convierten",
    text: "Dale a tu web un aspecto único acorde con tu personalidad. Diseño, animación y rendimiento pensados para vender.",
    points: ["Diseño a medida", "Animación y 3D", "SEO y velocidad"],
    theme: "cream",
    target: "web",
  },
  {
    n: "02",
    title: "Soluciones integrales para negocios",
    text: "Cuéntame tu problema y te diseño una solución a tu medida: paneles, reservas, automatización e IA aplicada.",
    points: ["SaaS y paneles", "Automatización", "IA aplicada"],
    theme: "navy",
    target: "web",
  },
  {
    n: "03",
    title: "Apps que considero prácticas",
    text: "Me gusta crear soluciones que me resultan prácticas; son gratis si quieres probarlas.",
    points: ["Herramientas gratis", "Prototipos rápidos", "Iteración abierta"],
    theme: "sage",
    target: "web",
  },
  {
    n: "04",
    title: "Lanzamientos crypto",
    text: "Del concepto al lanzamiento: web del token, juegos on-chain, tokenomics claras y presencia en X y Telegram.",
    points: ["Web + arcade", "Tokenomics", "Comunidad"],
    theme: "ink",
    target: "crypto",
  },
];

export const about = {
  statement:
    "Construyo cosas que me gustaría tener. Convierto ideas en herramientas claras, útiles y agradables de usar — y las lanzo al mundo.",
  paragraphs: [
    "Trabajo entre producto, desarrollo web y automatización: pruebo pronto, reviso lo importante y dejo espacio para seguir mejorando.",
    "Lo mismo diseño la web de un club con 30 años de historia que el panel de un negocio local o el lanzamiento de un token con su propio juego.",
  ],
  facts: [
    { label: "Enfoque", value: "Producto y claridad" },
    { label: "Herramientas", value: "Web, IA y on-chain" },
    { label: "Principio", value: "Útil antes que ruidoso" },
  ],
  process: [
    { n: "01", title: "Escucho", text: "Entiendo el problema real antes de escribir una línea." },
    { n: "02", title: "Prototipo", text: "Algo tocable en días, no en meses." },
    { n: "03", title: "Lanzo", text: "Publicado, medido y en manos de usuarios reales." },
    { n: "04", title: "Itero", text: "Mejoro con datos y feedback, sin ruido." },
  ],
  stack: [
    "React", "Next.js", "Tailwind", "Node", "Python", "FastAPI", "WebGL", "Motion",
    "Solidity", "EVM", "Robinhood Chain", "IA generativa", "Automatización", "Vercel",
  ],
};

export const marqueeWords = [
  "Webs", "Apps", "Crypto", "SaaS", "GameFi", "Automatización", "IA aplicada", "Memecoins",
];
