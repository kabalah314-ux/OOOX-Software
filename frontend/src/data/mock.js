// OOOX — Datos del portfolio (recreado desde el repo original)
const RAW = "https://raw.githubusercontent.com/kabalah314-ux/OOOX-Software/main/frontend/public";
export const img = (p) => `${RAW}${p}`;

// Rutas relativas al documento: así los vídeos e imágenes locales funcionan
// tanto si el build se sirve del dominio (ooox.es) como si se abre el
// build/index.html directamente desde el disco (file://) o en un subdirectorio.
export const asset = (p) =>
  typeof document === "undefined" ? p : new URL(String(p).replace(/^\/+/, ""), document.baseURI).href;

export const brand = {
  name: "OOOX",
  tagline: "Archivo vivo — Proyectos, ideas y herramientas",
  email: "hola@ooox.es",
  city: "Barcelona",
  timezone: "Europe/Madrid",
  socials: [
    { id: "x", label: "X", url: "https://x.com/softwareOOOX" },
    { id: "telegram", label: "Telegram", url: null },
    { id: "github", label: "GitHub", url: null },
    { id: "linkedin", label: "LinkedIn", url: null },
  ],
};

export const categories = [
  { id: "crypto", n: "01", label: "Crypto", description: "Web3 products, games and experiences." },
  { id: "business", n: "02", label: "Business", description: "Digital products built around real business needs." },
  { id: "experiments", n: "03", label: "Experiments", description: "Ideas, prototypes and things I'm exploring." },
];

// ------------------------------------------------------------
//  Ficha compacta de cada tarjeta (Selected Work).
//  Textos en inglés, derivados de los datos existentes del
//  proyecto. Nada inventado: solo reescrito para la tarjeta.
// ------------------------------------------------------------
export const workCards = {
  "usain-bot": {
    typeEn: "Memecoin · 3D Game",
    short: "A memecoin with a playable open 3D world: missions, driving and a city to explore. The two arcade minigames are an extra.",
    route: ["3D World", "Missions", "Driving", "Arcade"],
    facts: [
      ["Type", "Memecoin"],
      ["Chain", "Solana"],
      ["Year", "2026"],
      ["Status", "Build mode"],
    ],
  },
  elementia: {
    typeEn: "Crypto Game · PvP",
    short: "Collect, breed and battle elemental creatures in a competitive Web3 game.",
    route: ["Egg", "Creature", "Battle", "Reward"],
    facts: [
      ["", "Breeding"],
      ["", "3×3 Battles"],
      ["", "PvP"],
      ["", "Solana"],
    ],
  },
  crossia: {
    typeEn: "Solana Game · Oniric World",
    short: "A game built on Solana (CrossIA token): an online trading adventure in an oniric world, aiming to buy the plane ticket that gets you off the island.",
    route: ["Explore", "Trade", "Save", "Fly"],
    facts: [
      ["Type", "Solana game"],
      ["Token", "CrossIA"],
      ["World", "Oniric"],
      ["Status", "Under construction (playable)"],
    ],
  },
  "casa-aurea": {
    typeEn: "Real estate · Web",
    short: "A premium developer showcase where the house can be walked through in 3D before it exists.",
    route: ["Landing", "Villa", "Tour 3D", "Contact"],
    facts: [
      ["Type", "Web"],
      ["Year", "2026"],
      ["Stack", "React · Three.js"],
      ["Status", "Demo"],
    ],
  },
  massflow: {
    typeEn: "SaaS · Management",
    short: "A booking and scheduling SaaS for home massage businesses, with separate access for admin, therapist and client.",
    route: ["Login", "Admin", "Therapist", "Booking"],
    facts: [
      ["Type", "SaaS"],
      ["Roles", "3"],
      ["Year", "2026"],
      ["Status", "Private demo"],
    ],
  },
  "moog-barcelona": {
    typeEn: "Club website · Redesign",
    short: "A demo rebuild of an iconic techno club site made only for ooox: agenda, residents, gallery and a liquid 3D orb that reacts to the cursor.",
    route: ["Home", "Agenda", "Residents", "Gallery"],
    facts: [
      ["Type", "Website"],
      ["Year", "2026"],
      ["Stack", "React · WebGL"],
      ["Status", "Online"],
    ],
  },
};

const shots = (k) => ({
  cover: img(`/projects/${k}.jpg`),
  long: img(`/projects/${k}_long.jpg`),
  mobile: img(`/projects/${k}_m.jpg`),
  mobileLong: img(`/projects/${k}_m_long.jpg`),
  gallery: [img(`/projects/${k}.jpg`), img(`/projects/${k}_m.jpg`)],
  // Imágenes que rotan al pasar el ratón en el índice (añade más URLs aquí)
  previews: [img(`/projects/${k}.jpg`), img(`/projects/${k}_long.jpg`), img(`/projects/${k}_m.jpg`), img(`/projects/${k}_m_long.jpg`)],
});

// Capturas automáticas (thum.io). full = página completa; se muestra por tramos con `y` (0-100 %).
const shot = (url, w = 1440, h = 900) => `https://image.thum.io/get/width/${w}/crop/${h}/noanimate/${url}`;
const fullShot = (url) => `https://image.thum.io/get/width/1440/fullpage/noanimate/${url}`;
const mobileShot = (url) => `https://image.thum.io/get/viewportWidth/390/width/390/crop/844/noanimate/${url}`;

const AUREA = "https://casa-aurea-lake.vercel.app/";
const AUREA_FULL = fullShot(AUREA);

export const projects = [
  {
    id: "casa-aurea", category: "business", title: "Áurea", kicker: "Viviendas contemporáneas que se recorren en 3D", year: "2026",
    type: "Web inmobiliaria · Promotora premium", status: "Online", statusTone: "live", access: "public", url: AUREA,
    socials: { x: "https://x.com/softwareOOOX" },
    cover: `${AUREA}images/aurea/hero.jpg`, long: AUREA_FULL, mobile: `${AUREA}images/aurea/living.jpg`,
    video: { src: asset("/videos/aurea.mp4"), poster: asset("/videos/aurea.jpg"), label: "Tour 3D · Villa Áurea" },
    // Imágenes reales del interior de la Villa Áurea (lo que se recorre en el tour 3D)
    previews: [
      { src: `${AUREA}images/aurea/hero.jpg`, y: 50, label: "Villa al anochecer" },
      { src: `${AUREA}images/aurea/living.jpg`, y: 50, label: "Salón · comedor" },
      { src: `${AUREA}images/aurea/kitchen.jpg`, y: 50, label: "Cocina" },
      { src: `${AUREA}images/aurea/pool.jpg`, y: 50, label: "Piscina privada" },
    ],
    gallery: [`${AUREA}images/aurea/living.jpg`, `${AUREA}images/aurea/kitchen.jpg`, `${AUREA}images/aurea/pool.jpg`, `${AUREA}images/aurea/hero.jpg`],
    accent: "#BBA272", accentSoft: "#0B1020",
    demo: true,
    description: "Proyecto demo · Web para una promotora de viviendas premium en Mallorca: la Villa Áurea (218 m², 4 hab., piscina) se puede recorrer en 3D antes de pisarla.",
    longDescription: "Este es un proyecto demo: no publico casos reales para proteger la privacidad de sus dueños. Áurea simula una promotora de obra nueva en Mallorca. La web presenta la Villa Áurea en Costa d'en Blanes —218 m², 4 habitaciones, 3 baños, piscina privada y parcela de 450 m²— con una estética editorial y un recorrido 3D por dentro de la casa: salón y comedor abiertos a la terraza, cocina, dormitorios y la piscina. El plano y la casa son el mismo objeto.",
    highlights: ["Recorrido 3D por el interior de la vivienda", "Ficha completa: 218 m², 4 hab., 3 baños, piscina", "Narrativa de materia, luz y recorrido", "Colección preparada para sumar nuevas viviendas"],
    stack: ["React", "Three.js", "Tailwind", "Vercel"], tags: ["Inmobiliaria", "3D", "Demo"],
    metrics: [{ label: "Superficie", value: "218 m²" }, { label: "Habitaciones", value: "4" }, { label: "Tour", value: "3D" }],
  },
  {
    id: "moog-barcelona", category: "business", title: "MOOG Barcelona", kicker: "30 aniversario · techno desde 1996", year: "2026",
    type: "Web de club · Rediseño", status: "Online", statusTone: "live", access: "public", url: "https://moog-barcelona.vercel.app",
    socials: { x: "https://x.com/softwareOOOX" },
    ...shots("moog"), accent: "#5EEAD4", accentSoft: "#0B1416",
    demo: true,
    description: "Proyecto demo · Réplica de la web del club techno MOOG hecha solo para la web ooox: agenda, merch, residentes, galería y un orbe 3D que reacciona al ratón.",
    longDescription: "Este es un proyecto demo hecho solo para la web ooox: no es un encargo real del club, es una recreación propia. Para el 30 aniversario de MOOG planteé una web que respirase la cabina: tipografía gigante, un orbe líquido en tiempo real, agenda con filas que laten al ritmo y un índice de DJs con foto al hover. Misma estructura que la original, pero con movimiento, sonido opcional y una experiencia mucho más cercana a estar en el club a las 23:59h.",
    highlights: ["Orbe 3D interactivo en el hero con estela y reflejos", "Agenda de 28 eventos con suscripción a calendario", "Índice de residentes con imagen al pasar el ratón", "Galería arrastrable y modo sonido on/off"],
    stack: ["React", "WebGL", "Motion", "Vercel"], tags: ["Ocio nocturno", "Branding", "Animación"],
    metrics: [{ label: "Secciones", value: "13" }, { label: "Eventos", value: "28" }, { label: "Orbes", value: "5" }],
  },
  {
    id: "massflow", category: "business", title: "MassFlow", kicker: "SaaS de gestión de masajes a domicilio", year: "2026",
    type: "SaaS · Panel de gestión", status: "Privado", statusTone: "private", access: "private", url: "https://saas-madajesadomicilio.vercel.app/",
    socials: { x: "https://x.com/softwareOOOX" },
    cover: asset("/projects/massflow_admin_dashboard.jpg"),
    video: { src: asset("/videos/massflow.mp4"), poster: asset("/videos/massflow.jpg"), label: "Admin · Reservas · Agente IA · Finanzas" },
    long: asset("/projects/massflow_admin_dashboard.jpg"),
    mobile: asset("/projects/massflow_login_screen.jpg"),
    // Capturas de los módulos por rol de acceso:
    previews: [
      { src: asset("/projects/massflow_login_screen.jpg"), y: 50, label: "Acceso · Login móvil" },
      { src: asset("/projects/massflow_admin_dashboard.jpg"), y: 50, label: "Admin · Panel de control" },
      { src: asset("/projects/massflow_masajista_agenda.jpg"), y: 50, label: "Masajista · Agenda y rutas" },
      { src: asset("/projects/massflow_cliente_reserva.jpg"), y: 50, label: "Cliente · Reserva y catálogo" },
    ],
    gallery: [
      asset("/projects/massflow_login_screen.jpg"),
      asset("/projects/massflow_admin_dashboard.jpg"),
      asset("/projects/massflow_masajista_agenda.jpg"),
      asset("/projects/massflow_cliente_reserva.jpg"),
    ],
    accent: "#10B981", accentSoft: "#ECFDF5",
    demo: true,
    description: "Proyecto demo · Sistema SaaS para gestión de masajes a domicilio con 3 accesos independientes: panel de administrador, agenda con rutas del terapeuta y reservas para clientes.",
    longDescription: "Este es un proyecto demo: no publico casos reales para proteger la privacidad de sus dueños. MassFlow soluciona la operativa integral de masajes a domicilio en Barcelona. Incluye tres accesos diferenciados: 1) Admin (admin@massflow.app) para métricas de facturación, terapeutas activos, asignación de citas y cobros; 2) Masajista (masajista@massflow.app) con agenda del día en móvil/tablet, rutas en mapa y estados de sesión; y 3) Cliente (clienta@massflow.app) con catálogo de tratamientos (descontracturante, relajante, deportivo), calendario, franjas horarias y dirección.",
    highlights: [
      "Panel Admin: KPIs de facturación, gestión de terapeutas y asignación",
      "Portal Masajista: agenda diaria con geolocalización de rutas y estados",
      "Experiencia Cliente: reserva en 3 pasos con catálogo y horarios",
      "Acceso segmentado por 3 roles con contraseñas seguras",
    ],
    stack: ["React", "Tailwind", "Auth & Roles", "Vercel"], tags: ["SaaS", "Roles & Auth", "Gestión"],
    metrics: [{ label: "Roles", value: "3" }, { label: "Módulos", value: "6" }, { label: "Acceso", value: "Demo" }],
  },
  {
    id: "elementia", category: "crypto", title: "Elementia", kicker: "Colecciona, cría y combate criaturas elementales", year: "2026",
    scene: "elementia",
    type: "GameFi · Juego P2E", status: "Demo jugable", statusTone: "live", access: "public", url: "https://axie-infinity-style-game.vercel.app/",
    ...shots("elementia"), accent: "#F5C24B", accentSoft: "#1A1508",
    video: { src: asset("/videos/elementia.mp4"), poster: asset("/videos/elementia.jpg"), label: "Combate 3×3 · Mercado" },
    token: { ticker: "$ELT", chain: "Solana", chainId: "mainnet-beta", supply: "100M", tax: "—", liquidity: "LP 24m" },
    socials: { web: "https://axie-infinity-style-game.vercel.app/", x: "https://x.com/softwareOOOX", telegram: "https://t.me/" },
    description: "Juego de criaturas estilo Axie en Solana: mina huevos, cría nuevas generaciones y combate 3×3 por turnos con 18 tipos.",
    longDescription: "Elementia es un juego completo con economía de dos activos: Gemas (off-chain, se ganan jugando) y ELT, token SPL de 100M fijos para premios de temporada y gobernanza. Aventura en solitario de 15 etapas, Arena PvP con MMR y 6 ligas, mercado entre jugadores con 5 % de comisión y temporadas de 28 días.",
    highlights: ["Combates 3×3 por turnos con tabla de 18 tipos", "Criaturas generadas desde su ADN: 4 partes y genes 0-31", "Mercado P2P, cría y quema verificable on-chain", "Temporadas de 28 días con 250.000 ELT en premios"],
    stack: ["React", "Solana", "SPL", "Web3"], tags: ["GameFi", "P2E", "Tokenomics"],
    metrics: [{ label: "Tipos", value: "18" }, { label: "Ligas", value: "6" }, { label: "Supply", value: "100M" }],
    gallery: [],
  },
  {
    id: "usain-bot", category: "crypto", title: "Usain Bot", kicker: "Winners are always first.", year: "2026",
    type: "Memecoin · Mundo 3D", status: "Build mode", statusTone: "build", access: "public", url: "https://usain-bot.vercel.app/",
    ...shots("bolt"), accent: "#FFD83D", accentSoft: "#17150A",
    gallery: [],
    video: { src: asset("/videos/usain-bot-3d.mp4"), poster: asset("/videos/usain-bot-3d.jpg"), label: "3D Open World · Misiones · Coches" },
    token: { ticker: "$BOLT", chain: "Solana", chainId: "mainnet-beta", supply: "1B", createdOn: "pump.fun", liquidity: "100% lock" },
    socials: { web: "https://usain-bot.vercel.app/", x: "https://x.com/usainthebot", telegram: "https://t.me/" },
    description: "El bot más rápido de Solana. Memecoin con un mundo 3D jugable: misiones, conducción y una ciudad por explorar; los dos minijuegos arcade son un extra.",
    longDescription: "En 2026 un robot bajó de los 9.58 s de Bolt. $BOLT convierte esa historia en una memecoin con identidad cómic y un mundo 3D abierto en el que completas misiones y conduces por la ciudad. Creado en pump.fun, sin preventa ni tokens de equipo. Como extra, dos minijuegos arcade gratuitos con leaderboard global, roadmap en 4 calles y guía de compra.",
    highlights: [
      "Mundo 3D abierto: misiones, conducción y ciudad por explorar",
      "Historia de origen en formato portada de periódico",
      "Creado en pump.fun: sin preventa ni tokens de equipo",
      "Extra: dos minijuegos arcade con leaderboard global",
    ],
    stack: ["React", "Three.js", "Solana"], tags: ["Memecoin", "3D", "Arcade", "Comunidad"],
    metrics: [{ label: "Record", value: "9.39s" }, { label: "Mundo", value: "3D" }, { label: "Creado en", value: "pump.fun" }],
  },
  // ---------------------------------------------------------- CRYPTO (próximo)
  {
    id: "crossia", category: "crypto", title: "Animal CrossIA", kicker: "Una aventura online para comerciar y salir de la isla", year: "2026",
    type: "Juego Solana · Mundo onírico", status: "En construcción (jugable)", statusTone: "build", access: "public",
    url: "https://threejs-interactive-village-prototy.vercel.app/",
    socials: { x: "https://x.com/softwareOOOX" },
    accent: "#8AB4F8", accentSoft: "#0B1020",
    video: { src: asset("/videos/crossia.mp4"), poster: asset("/videos/crossia.jpg"), label: "Prototipo jugable · En construcción" },
    description: "Juego creado en Solana con el token CrossIA: una aventura online de comercio en un mundo onírico con el objetivo de comprar el billete de avión para salir de la isla.",
    longDescription: "Animal CrossIA es un juego creado en Solana, con el token CrossIA. Será una aventura online de comerciar en un mundo onírico: exploras la isla, comercias con sus habitantes y acumulas el dinero suficiente para comprar el billete de avión que te permitirá salir. El proyecto está en construcción y ya es jugable.",
    highlights: [
      "Creado en Solana con el token CrossIA",
      "Aventura online en un mundo onírico",
      "Comercia con los habitantes de la isla y acumula recursos",
      "Objetivo final: comprar el billete de avión y salir de la isla",
    ],
    stack: ["Solana", "Three.js", "Web3"], tags: ["Solana", "Aventura", "Comercio"],
    metrics: [{ label: "Cadena", value: "Solana" }, { label: "Token", value: "CrossIA" }, { label: "Estado", value: "En construcción" }],
    scene: "crossia",
  },
];

// ------------------------------------------------------------
//  Orden de exposición dentro de cada sección (categoría).
//  El recorrido "Siguiente proyecto" agrupa por sección y respeta este orden:
//  el último de una sección enlaza con el primero de la siguiente y el último
//  global vuelve al primero. Por eso, al añadir un proyecto nuevo a una sección
//  basta con meterlo en `projects` dentro de esa sección (al final): el que era
//  último pasa a enlazar con el nuevo y el nuevo con el que enlazaba el antiguo.
// ------------------------------------------------------------
export const ORDER = ["usain-bot", "elementia", "crossia", "casa-aurea", "massflow", "moog-barcelona"];

const rank = (id) => (ORDER.indexOf(id) === -1 ? ORDER.length : ORDER.indexOf(id));

export const chainProjects = () =>
  categories.flatMap((c) =>
    projects.filter((p) => p.category === c.id).sort((a, b) => rank(a.id) - rank(b.id))
  );

export function nextProject(p) {
  const list = chainProjects();
  const i = list.findIndex((x) => x.id === p.id);
  if (i === -1) return list[0];
  return list[(i + 1) % list.length];
}

export const services = [
  { n: "01", theme: "cream", target: "web", title: "Webs que convierten", text: "Landings, webs de marca y portfolios con movimiento, rápidos y pensados para vender.", points: ["Diseño a medida", "Animación", "SEO base"] },
  { n: "02", theme: "navy", target: "web", title: "SaaS y apps a medida", text: "Paneles, reservas, gestión interna. Producto real con usuarios, roles y datos.", points: ["Auth y roles", "Base de datos", "Pagos"] },
  { n: "03", theme: "sage", target: "web", title: "Automatizaciones y herramientas", text: "Bots, scripts e integraciones que te quitan horas de trabajo repetitivo cada semana.", points: ["Bots", "Integraciones", "IA"] },
  { n: "04", theme: "ink", target: "crypto", title: "Lanzamientos crypto", text: "Web del token, arcade, tokenomics y redes. Todo lo que necesita un proyecto on-chain para salir.", points: ["Web + dApp", "Tokenomics", "Arcade"] },
];

export const about = {
  paragraphs: [
    "Soy un desarrollador independiente en Barcelona. Construyo software por curiosidad: para resolver mis propios problemas y, cada vez más, los de quien me los cuenta.",
    "Este archivo recoge lo que voy lanzando: webs, SaaS, herramientas y proyectos crypto. Algunos son públicos, otros privados. Todos están hechos con el mismo cuidado.",
  ],
  facts: [
    { label: "Base", value: "Barcelona, ES" },
    { label: "Enfoque", value: "Producto + diseño" },
    { label: "Disponibilidad", value: "Abierto a proyectos" },
  ],
  process: [
    { n: "01", title: "Escucho", text: "Una llamada para entender el problema, no la solución que crees que necesitas." },
    { n: "02", title: "Diseño", text: "Prototipo rápido y visual para decidir juntos antes de escribir código." },
    { n: "03", title: "Construyo", text: "Desarrollo iterativo con entregas frecuentes que puedes probar." },
    { n: "04", title: "Lanzo", text: "Publicación, métricas y soporte. Lanzado antes que perfecto." },
  ],
};
