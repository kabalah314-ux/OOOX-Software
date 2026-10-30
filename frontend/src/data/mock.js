// OOOX — Datos del portfolio (recreado desde el repo original)
// Rutas relativas al documento: así los vídeos e imágenes locales funcionan
// tanto si el build se sirve del dominio (ooox.es) como si se abre el
// build/index.html directamente desde el disco (file://) o en un subdirectorio.
// (Antes apuntaban a raw.githubusercontent, que tarda y a veces no carga.)
export const asset = (p) =>
  typeof document === "undefined" ? p : new URL(String(p).replace(/^\/+/, ""), document.baseURI).href;

export const img = (p) => asset(p);

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
  { id: "local", n: "03", label: "Local", description: "Websites for neighbourhood businesses." },
  { id: "experiments", n: "04", label: "Experiments", description: "Ideas, prototypes and things I'm exploring." },
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
  neuron: {
    typeEn: "Social 3D Game · Memecoin",
    short: "A free 3D social game in your browser: you are a neuron inside an AI brain and, with the community, you train it through daily missions and minigames.",
    route: ["Neuron", "Missions", "Minigames", "Brain"],
    facts: [
      ["Type", "Memecoin · Game"],
      ["Chain", "Solana"],
      ["Year", "2026"],
      ["Status", "Playable beta"],
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
    short: "A demo rebuild of an iconic techno club site, made only for ooox to show one type of the websites I build: agenda, residents, gallery and a liquid 3D orb that reacts to the cursor.",
    route: ["Home", "Agenda", "Residents", "Gallery"],
    facts: [
      ["Type", "Website"],
      ["Year", "2026"],
      ["Stack", "React · WebGL"],
      ["Status", "Online"],
    ],
  },
  // ---------------------------------------------------------- LOCAL · webs para negocios de barrio
  "la-vermuteria": {
    typeEn: "Bar website · Menu & bookings",
    short: "A vermouth bar in Gràcia: menu with allergens and table QR, daily set menu, and bookings and takeaway orders that reach the bar on WhatsApp.",
    route: ["Menu", "Set menu", "Booking", "Takeaway"],
    facts: [
      ["Type", "Website"],
      ["Languages", "ES · CA · EN"],
      ["Year", "2026"],
      ["Key feature", "Bookings by WhatsApp"],
    ],
  },
  "nomada-barbers": {
    typeEn: "Barbershop website · Online booking",
    short: "A Poblenou barbershop: clients pick service, barber, day and time, and the appointment arrives on WhatsApp. Prices with durations, team and a monthly club.",
    route: ["Service", "Barber", "Time", "WhatsApp"],
    facts: [
      ["Type", "Website"],
      ["Languages", "ES · CA · EN"],
      ["Year", "2026"],
      ["Key feature", "Online booking"],
    ],
  },
  "pell-i-pinzell": {
    typeEn: "Beauty & nails website · Booking, packs and gift cards",
    short: "A beauty and nail studio in Les Corts: clients pick service, specialist, day and time and the booking arrives on WhatsApp. Prices with durations, session packs and gift cards ordered from the phone.",
    route: ["Service", "Specialist", "Time", "WhatsApp"],
    facts: [
      ["Type", "Website"],
      ["Languages", "ES · CA · EN"],
      ["Year", "2026"],
      ["Key feature", "Packs & gift cards"],
    ],
  },
  "flors-fulles": {
    typeEn: "Florist website · Orders & delivery",
    short: "A Sant Antoni florist: bouquets by occasion, order with size, date, delivery by neighbourhood and a card message with live preview, sent by WhatsApp.",
    route: ["Occasion", "Bouquet", "Card", "Delivery"],
    facts: [
      ["Type", "Website"],
      ["Languages", "ES · CA · EN"],
      ["Year", "2026"],
      ["Key feature", "Orders with card message"],
    ],
  },
  "ramirez-24h": {
    typeEn: "Plumber website · Emergencies & quotes",
    short: "A 24-hour emergency plumber in Barcelona: call button always at hand, clear rates, arrival times by area and a 1-minute guide quote sent by WhatsApp with a photo.",
    route: ["Problem", "Urgency", "Price", "Call"],
    facts: [
      ["Type", "Website"],
      ["Languages", "ES · CA · EN"],
      ["Year", "2026"],
      ["Key feature", "1-minute quote"],
    ],
  },
  "estudio-lua": {
    typeEn: "Yoga studio website · Timetable & booking",
    short: "A yoga and pilates studio in Sants: weekly timetable with free spots and filters, class booking by WhatsApp, free first class, passes and tonight's moon.",
    route: ["Timetable", "Class", "Spot", "WhatsApp"],
    facts: [
      ["Type", "Website"],
      ["Languages", "ES · CA · EN"],
      ["Year", "2026"],
      ["Key feature", "Timetable with spots"],
    ],
  },
  // ---------------------------------------------------------- EXPERIMENTS
  chollector: {
    typeEn: "Web app · Second-hand resale",
    short: "A deal radar for Wallapop and Vinted resellers: it watches your searches and tells you, in minutes, if a listing is a bargain compared with what really sells.",
    route: ["Search", "Alert", "Real price", "Profit"],
    facts: [
      ["Type", "Web app"],
      ["Platforms", "Wallapop · Vinted"],
      ["Year", "2026"],
      ["Status", "Beta"],
    ],
  },
  followthesun: {
    typeEn: "Map app · Barcelona",
    short: "Where the sun is shining in Barcelona, right now: a map with building shadows and clouds that finds the best sunny spot for what you want to do.",
    route: ["Plan", "When", "How long", "Sunny spot"],
    facts: [
      ["Type", "Map web app"],
      ["City", "Barcelona"],
      ["Year", "2026"],
      ["Status", "Beta"],
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

// Webs para negocios: cada demo vive en /demos/<slug>/ (webs-negocios/demos) y sus capturas en
// /projects/demos/ (las hace .github/workflows/demo-shots.yml con fotos y tipografías reales).
// secciones: [id de la sección en la demo, etiqueta] → vistas previas de la tarjeta y galería del caso.
const demoWeb = (slug, secciones) => {
  const cap = (k = "") => img(`/projects/demos/${slug}${k}.jpg`);
  const extra = secciones.map(([id, label]) => ({ src: cap(`_${id}`), y: 0, label }));
  return {
    url: asset(`/demos/${slug}/`),
    cover: cap(),
    long: cap("_long"),
    mobile: cap("_m"),
    previews: [{ src: cap(), y: 0, label: "Portada" }, ...extra],
    gallery: extra.map((e) => e.src),
  };
};

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
    description: "Proyecto demo para enseñar un tipo de las webs que hago: réplica de la web del club techno MOOG con agenda, merch, residentes, galería y un orbe 3D que reacciona al ratón. Hecha solo para la web ooox.",
    longDescription: "MOOG Barcelona es un proyecto demo hecho solo para la web ooox para enseñar un tipo de web de las que hago: no es un encargo real del club, es una recreación propia. Para el 30 aniversario de MOOG planteé una web que respirase la cabina: tipografía gigante, un orbe líquido en tiempo real, agenda con filas que laten al ritmo y un índice de DJs con foto al hover. Misma estructura que la original, pero con movimiento, sonido opcional y una experiencia mucho más cercana a estar en el club a las 23:59h.",
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
    ...shots("elementia"), cover: asset("/videos/elementia.jpg"), accent: "#F5C24B", accentSoft: "#1A1508",
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
    socials: { x: "https://x.com/AnimalCrossIAW" },
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
  // ---------------------------------------------------------- CRYPTO · NEURON
  {
    id: "neuron", category: "crypto", title: "NEURON", kicker: "Entrena una IA con tu comunidad", year: "2026",
    type: "Juego social 3D · Memecoin", status: "Beta jugable", statusTone: "build", access: "public",
    url: "https://noditheneuron.online/",
    socials: { web: "https://noditheneuron.online/", x: "https://x.com/neuron_nodi" },
    cover: asset("/projects/neuron.jpg"), long: asset("/projects/neuron_long.jpg"), mobile: asset("/projects/neuron_m.jpg"),
    accent: "#7DF8FF", accentSoft: "#050817",
    // Vídeo hover: lo prepara Oscar. Cuando esté, guardar en public/videos/neuron.mp4 (+ neuron.jpg de poster) y añadir:
    // video: { src: asset("/videos/neuron.mp4"), poster: asset("/videos/neuron.jpg"), label: "Portada con Nodi · Núcleo 3D" },
    previews: [
      { src: asset("/projects/neuron.jpg"), y: 50, label: "Portada · Nodi" },
      { src: asset("/projects/neuron_juego.jpg"), y: 50, label: "El Núcleo en 3D" },
      { src: asset("/projects/neuron_long.jpg"), y: 30, label: "Minijuegos y Tokenomics" },
      { src: asset("/projects/neuron_m.jpg"), y: 50, label: "Móvil" },
    ],
    gallery: [asset("/projects/neuron.jpg"), asset("/projects/neuron_juego.jpg")],
    token: { ticker: "$NEURON", chain: "Solana", chainId: "mainnet-beta", supply: "1B", createdOn: "pump.fun" },
    description: "Juego social en 3D, gratis en el navegador: eres una neurona dentro de un cerebro artificial y, con la comunidad, lo entrenas con misiones diarias y minijuegos. Token $NEURON en Solana.",
    longDescription: "NEURON convierte el entrenamiento de una IA en un juego social. Cada jugador es una neurona dentro de un cerebro 3D compartido: completa misiones diarias, juega 15 minijuegos en 5 salas con otras personas o con neuronas IA, purga alucinaciones y llena el Núcleo para que el cerebro crezca. Cada Época dura 3 semanas y, cuando se cumplen sus objetivos, se libera parte del Fondo de Despertar (10 % del supply) a los jugadores. El token $NEURON sale en pump.fun, sin preventa, y nunca da ventaja dentro del juego.",
    highlights: [
      "Cerebro 3D compartido y multijugador en tiempo real",
      "15 minijuegos en 5 salas, con dificultad que se adapta",
      "Misiones diarias, Épocas de 3 semanas y experiencia de comunidad",
      "Fondo de Despertar: 10 % del supply en premios por jugar",
    ],
    stack: ["React", "Three.js", "Supabase", "Solana"], tags: ["Memecoin", "Juego social", "3D", "Comunidad"],
    metrics: [{ label: "Minijuegos", value: "15" }, { label: "Salas", value: "5" }, { label: "Supply", value: "1B" }],
  },
  // ---------------------------------------------------------- LOCAL · webs para negocios de barrio (demos)
  {
    id: "la-vermuteria", category: "local", title: "La Vermutería", kicker: "Vermut de grifo y tapas en Gràcia", year: "2026",
    type: "Web de bar · Carta y reservas", status: "Online", statusTone: "live", access: "public",
    ...demoWeb("la-vermuteria", [["carta", "Carta con alérgenos"], ["reserva", "Reserva por WhatsApp"]]),
    accent: "#E0A526", accentSoft: "#0E2A1E",
    demo: true,
    description: "Proyecto demo · Web para un bar de vermut de Gràcia: carta con alérgenos y QR para las mesas, menú del día, reservas y pedidos para llevar que llegan al bar por WhatsApp.",
    longDescription: "Este es un proyecto demo: el bar no existe, pero todo lo que ves funciona y se puede probar. La Vermutería del Carrer tiene identidad propia —el panot de flor de Barcelona, la carta de papel y la pizarra del menú— y resuelve lo que más preguntan los clientes: si está abierto ahora, qué hay en la carta (con los 14 alérgenos), cuál es el menú de hoy y cómo reservar. Las reservas y los pedidos para llevar llegan al móvil del bar como un WhatsApp ya escrito, sin apps ni comisiones. Está en castellano, catalán e inglés, y unas notas amarillas explican al dueño para qué sirve cada parte.",
    highlights: ["Carta con filtros, los 14 alérgenos y QR para las mesas", "Reserva en 20 segundos: personas, día, turno, hora y zona", "Pedidos para llevar sin comisiones de plataformas", "Abierto ahora, horario y menú del día que cambia solo"],
    stack: ["HTML", "CSS", "JavaScript"], tags: ["Hostelería", "Reservas", "WhatsApp"],
    metrics: [{ label: "Idiomas", value: "3" }, { label: "Alérgenos", value: "14" }, { label: "Comisiones", value: "0 %" }],
  },
  {
    id: "nomada-barbers", category: "local", title: "Nómada Barbers", kicker: "Corte, barba y cita en 20 segundos", year: "2026",
    type: "Web de barbería · Cita online", status: "Online", statusTone: "live", access: "public",
    ...demoWeb("nomada-barbers", [["cita", "Cita en 5 pasos"], ["precios", "Precios y duración"]]),
    accent: "#E5484D", accentSoft: "#0E0E0E",
    demo: true,
    description: "Proyecto demo · Web para una barbería de Poblenou: el cliente elige servicio, barbero, día y hora, y la cita llega por WhatsApp. Precios con duración, equipo y club de cuota mensual.",
    longDescription: "Este es un proyecto demo: la barbería no existe, pero la cita online funciona de verdad. Nómada Barbers mezcla el Poblenou industrial con una revista de moda masculina: blanco y negro, tipografía condensada gigante y el poste de barbero como firma. La web hace lo que más pide un cliente: ver precios con lo que dura cada servicio, elegir barbero y pedir cita sin llamar. El asistente de 5 pasos solo ofrece horas libres dentro del horario y que encajan con lo que dura el servicio, y el resumen llega al barbero por WhatsApp. Además, el Club Nómada convierte clientes sueltos en una cuota mensual.",
    highlights: ["Cita en 5 pasos: servicio, barbero, día, hora y nombre", "Solo horas libres que encajan con lo que dura el servicio", "Precios y duración a la vista, con extras", "Club Nómada: cortes ilimitados por cuota mensual"],
    stack: ["HTML", "CSS", "JavaScript"], tags: ["Barbería", "Citas", "WhatsApp"],
    metrics: [{ label: "Pasos", value: "5" }, { label: "Barberos", value: "3" }, { label: "Club", value: "39 €" }],
  },
  {
    id: "pell-i-pinzell", category: "local", title: "Pell & Pinzell", kicker: "Una hora para ti, en Les Corts", year: "2026",
    type: "Web de estética · Citas, bonos y cheques regalo", status: "Online", statusTone: "live", access: "public",
    ...demoWeb("pell-i-pinzell", [["cita", "Cita en 20 segundos"], ["bonos", "Bonos y cheque regalo"]]),
    accent: "#D9A79F", accentSoft: "#3A2A31",
    demo: true,
    description: "Proyecto demo · Web para un centro de estética y uñas de Les Corts: la clienta elige servicio, profesional, día y hora, y la cita llega por WhatsApp. Precios con duración, bonos de sesiones y cheques regalo que se piden desde el móvil.",
    longDescription: "Este es un proyecto demo: el estudio no existe, pero la cita, los bonos y el cheque regalo funcionan. Pell & Pinzell es crema, rosa empolvado y ciruela, con una serif elegante y fotos en arco, como el espejo de un tocador. Lo primero que ve la clienta es lo que más pregunta por Instagram: cuánto cuesta cada cosa y cuánto dura, y el próximo hueco libre de verdad. La cita se pide en cinco pasos sin llamar y llega al estudio por WhatsApp ya ordenada. Y lo que más caja hace: bonos de cinco sesiones y cheques regalo que se eligen, se piden y se pagan desde el móvil.",
    highlights: ["Cita en 5 pasos: servicio, profesional, día, hora y nombre", "Precios y duración a la vista, con extras", "Bonos de sesiones con el ahorro calculado", "Cheque regalo que se pide desde el móvil"],
    stack: ["HTML", "CSS", "JavaScript"], tags: ["Estética", "Citas", "Bonos"],
    metrics: [{ label: "Servicios", value: "18" }, { label: "Profesionales", value: "3" }, { label: "Bono de 5", value: "125 €" }],
  },
  {
    id: "flors-fulles", category: "local", title: "Flors & Fulles", kicker: "Flores frescas cada mañana, en Sant Antoni", year: "2026",
    type: "Web de floristería · Pedidos con entrega", status: "Online", statusTone: "live", access: "public",
    ...demoWeb("flors-fulles", [["catalogo", "Encargo con dedicatoria"], ["sant-jordi", "Sant Jordi"]]),
    accent: "#E8608A", accentSoft: "#1F3A2B",
    demo: true,
    description: "Proyecto demo · Web para una floristería de Sant Antoni: catálogo por ocasiones y encargo con tamaño, fecha, entrega por barrios y dedicatoria con vista previa, que llega por WhatsApp.",
    longDescription: "Este es un proyecto demo: la floristería no existe, pero el encargo funciona de principio a fin. Flors & Fulles parece una revista botánica: tipografía de moda con cursivas, tonos de papel e ilustraciones de tallos y hojas. Lo importante va arriba: la hora límite para que llegue hoy, con una cuenta atrás en directo, y lo que cuesta la entrega en cada barrio. En el catálogo eliges ramo por ocasión, tamaño, día y entrega o recogida, y escribes la dedicatoria mientras ves cómo queda la tarjeta. Todo llega a la tienda por WhatsApp. Y como es Barcelona, tiene su apartado de Sant Jordi, bodas y una suscripción semanal.",
    highlights: ["Encargo completo: tamaño, día, entrega por barrios y dedicatoria", "Cuenta atrás de la hora límite para entregar hoy", "Reserva de rosas para Sant Jordi y bodas con precio «desde»", "Flores cada semana por suscripción, sin permanencia"],
    stack: ["HTML", "CSS", "JavaScript"], tags: ["Floristería", "Pedidos", "WhatsApp"],
    metrics: [{ label: "Ramos", value: "8" }, { label: "Zonas de entrega", value: "3" }, { label: "Hora límite", value: "14:00" }],
  },
  {
    id: "ramirez-24h", category: "local", title: "Ramírez Fontaneros", kicker: "Urgencias de fontanería en Barcelona, las 24 horas", year: "2026",
    type: "Web de fontanería · Urgencias y presupuestos", status: "Online", statusTone: "live", access: "public",
    ...demoWeb("ramirez-24h", [["presupuesto", "Presupuesto en 1 minuto"], ["tarifas", "Tarifas claras"]]),
    accent: "#FFC400", accentSoft: "#101010",
    demo: true,
    description: "Proyecto demo · Web para un fontanero de urgencias en Barcelona: llamar siempre a mano, tarifas claras, tiempos de llegada por barrio y un presupuesto orientativo en 1 minuto que se manda por WhatsApp con foto.",
    longDescription: "Este es un proyecto demo: la empresa no existe, pero el presupuestador funciona. La web de Ramírez Fontaneros está hecha como su furgoneta: amarillo de seguridad, negro y rayas de aviso, con una tipografía condensada que se lee de un vistazo en el móvil. Primero lo urgente: el botón de llamar siempre visible, lo que tardan en llegar a cada barrio y lo que da confianza antes de llamar (empresa autorizada, precio cerrado, garantía por escrito). Para lo que no corre prisa, el cliente elige qué le pasa y para cuándo, ve un precio orientativo con su desglose y lo manda por WhatsApp con una foto. Incluye un antes y después de un trabajo.",
    highlights: ["Presupuesto orientativo en 1 minuto, con desglose y recargo de urgencia", "Botón de llamar siempre visible en el móvil", "Tarifas transparentes y tiempos de llegada por barrio", "Antes y después con deslizador"],
    stack: ["HTML", "CSS", "JavaScript"], tags: ["Oficios", "Urgencias", "Presupuestos"],
    metrics: [{ label: "Llegada", value: "< 45′" }, { label: "Servicio", value: "24 h" }, { label: "Garantía", value: "1 año" }],
  },
  {
    id: "estudio-lua", category: "local", title: "Estudio Lúa", kicker: "Yoga y pilates en Sants: respira, muévete, vuelve a ti", year: "2026",
    type: "Web de estudio de yoga · Horario y reservas", status: "Online", statusTone: "live", access: "public",
    ...demoWeb("estudio-lua", [["horario", "Horario con plazas"], ["precios", "Bonos y precios"]]),
    accent: "#B8A6F2", accentSoft: "#23202E",
    demo: true,
    description: "Proyecto demo · Web para un estudio de yoga y pilates en Sants: horario semanal con plazas libres y filtros, reserva de clase por WhatsApp, primera clase gratis, bonos y la luna de hoy.",
    longDescription: "Este es un proyecto demo: el estudio no existe, pero el horario y las reservas funcionan. Estudio Lúa («luna» en gallego) es calma y luz: tipografía fina con cursivas, tonos arena y lavanda, y dos detalles que hacen que la web se recuerde: la fase real de la luna de hoy y un ejercicio de respiración de un minuto. El corazón es el horario: la semana entera en el ordenador y día a día en el móvil, con filtros por tipo y nivel, plazas libres y el día de hoy marcado. Al tocar una clase ves qué es, quién la da y qué traer, y reservas plaza por WhatsApp; si es tu primera clase, es gratis.",
    highlights: ["Horario semanal con plazas libres, filtros y hoy marcado", "Reserva de plaza por WhatsApp desde cada clase", "Primera clase gratis, bonos e ilimitado con precios claros", "La luna de hoy y un ejercicio de respiración de 1 minuto"],
    stack: ["HTML", "CSS", "JavaScript"], tags: ["Bienestar", "Clases", "WhatsApp"],
    metrics: [{ label: "Tipos de clase", value: "7" }, { label: "Primera clase", value: "0 €" }, { label: "Ilimitado", value: "79 €" }],
  },
  // ---------------------------------------------------------- EXPERIMENTS
  {
    id: "chollector", category: "experiments", title: "Chollector", kicker: "Lo que se vende, no lo que se pide", year: "2026",
    type: "Web app · Reventa de segunda mano", status: "Beta", statusTone: "build", access: "public",
    url: "https://chollector.vercel.app/",
    socials: { web: "https://chollector.vercel.app/" },
    ...shots("chollector"),
    previews: [
      { src: img("/projects/chollector.jpg"), y: 0, label: "Portada" },
      { src: img("/projects/chollector_demo.jpg"), y: 0, label: "Demo del panel" },
      { src: img("/projects/chollector_m.jpg"), y: 0, label: "Móvil" },
    ],
    gallery: [img("/projects/chollector_demo.jpg"), img("/projects/chollector_m.jpg")],
    accent: "#1FC2AA", accentSoft: "#0B1526",
    description: "Radar de chollos para revendedores de Wallapop y Vinted: vigila tus búsquedas y te avisa en minutos si un anuncio es un chollo frente a lo que se vende de verdad, con el margen que sacarías.",
    longDescription: "Chollector nace de un problema de quien compra y vende de segunda mano: el precio que se pide en los anuncios no dice nada; lo que importa es a cuánto se vende de verdad. La app vigila tus búsquedas cada pocos minutos y te avisa en el móvil o por Telegram con un veredicto frente a las ventas reales, el margen neto y el precio máximo que deberías pagar. Tiene tablas de precios por producto y estado (anunciado frente a vendido, días en venderse, rebaja típica), una calculadora de reventa con las tarifas reales de cada plataforma y una cartera de compras y ventas con el beneficio real. Está en beta.",
    highlights: [
      "Avisos en 5–10 minutos con veredicto frente a lo que se vende",
      "Tablas de precio anunciado frente a vendido por producto y estado",
      "Calculadora de reventa con las tarifas de Wallapop y Vinted",
      "Cartera de compras y ventas con beneficio real",
    ],
    stack: ["Next.js", "Postgres", "Vercel", "Telegram"], tags: ["Reventa", "Precios", "Avisos"],
    metrics: [{ label: "Plataformas", value: "2" }, { label: "Avisos", value: "5–10′" }, { label: "Estado", value: "Beta" }],
  },
  {
    id: "followthesun", category: "experiments", title: "I Follow the Sun", kicker: "Dónde da el sol en Barcelona, ahora", year: "2026",
    type: "Web app · Mapa de sol y sombra", status: "Beta", statusTone: "build", access: "public",
    url: "https://followthesun-three.vercel.app/",
    socials: { web: "https://followthesun-three.vercel.app/" },
    ...shots("followthesun"),
    previews: [
      { src: img("/projects/followthesun.jpg"), y: 0, label: "Mapa de sol" },
      { src: img("/projects/followthesun_m.jpg"), y: 0, label: "Móvil" },
    ],
    gallery: [img("/projects/followthesun.jpg"), img("/projects/followthesun_m.jpg")],
    accent: "#FFB547", accentSoft: "#14110A",
    description: "Un mapa de Barcelona con la luz del sol de verdad: sombras de los edificios y nubes. Le dices qué quieres hacer fuera, cuándo y cuánto rato, y te encuentra el mejor sitio al sol.",
    longDescription: "I Follow the Sun contesta a una pregunta muy de Barcelona: ¿dónde da el sol ahora? Es un mapa a pantalla completa que calcula la posición del sol, la sombra que hacen los edificios calle a calle y lo que tapan las nubes según la previsión y el satélite. Encima, un buscador: eliges qué quieres hacer (tomar el sol, un café, leer, playa, atardecer o pasear), cuándo y durante cuánto tiempo, y te propone los mejores lugares con su mejor franja de sol, una puntuación explicada y cómo llegar. Usa solo datos abiertos y herramientas gratuitas, y dice con honestidad qué es cálculo a pie de calle y qué es estimación.",
    highlights: [
      "Sombra de los edificios calculada a nivel de calle",
      "Nubes de la previsión y del satélite fusionadas en la luz efectiva",
      "Buscador: qué, cuándo y cuánto rato, con la mejor franja de sol",
      "Parques, plazas, playas, terrazas y miradores con datos abiertos",
    ],
    stack: ["React", "MapLibre", "Vite", "Open-Meteo"], tags: ["Mapas", "Barcelona", "Datos abiertos"],
    metrics: [{ label: "Ciudad", value: "Barcelona" }, { label: "Sombras", value: "Calle a calle" }, { label: "Coste", value: "0 €" }],
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
export const ORDER = [
  "neuron", "elementia", "crossia", "usain-bot", "casa-aurea", "massflow", "moog-barcelona",
  "la-vermuteria", "nomada-barbers", "pell-i-pinzell", "flors-fulles", "ramirez-24h", "estudio-lua",
  "chollector", "followthesun",
];

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
