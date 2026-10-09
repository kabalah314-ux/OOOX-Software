import React, { createContext, useContext, useEffect, useState } from "react";

export const LANGS = [
  { id: "es", label: "ES" },
  { id: "en", label: "EN" },
];

/* ── Diccionario ES / EN ──────────────────────────────────── */

const dict = {
  en: {
    nav: {
      links: [
        { id: "servicios", label: "How I work" },
        { id: "proyectos", label: "Projects" },
        { id: "sobre-mi", label: "About" },
        { id: "contacto", label: "Contact" },
      ],
      cta: "Let's talk",
      menu: "Menu",
      close: "Close",
    },
    preloader: {
      top: "Living archive",
      vol: "Vol. 2026",
      bottom: "Projects · Ideas · Tools",
    },
    hero: {
      title: ["I build useful", "digital products."],
      subtitle: "Websites, SaaS and experiences for companies and crypto projects.",
      note: "From idea to product.",
      scroll: "Scroll to explore ↓",
      followX: "Follow me on X",
    },
    process: {
      eyebrow: "How I work",
      title: ["How I", "work."],
      lead: "From idea to product, step by step.",
      steps: {
        idea: {
          title: "Idea",
          text: "I listen to your idea and understand the problem you want to solve.",
          keywords: ["Listening", "Context", "Problem"],
        },
        shape: {
          title: "Shape",
          text: "We give the idea a shape and define how it should work.",
          keywords: ["Scope", "Structure", "Prototype"],
        },
        build: {
          title: "Build",
          text: "I design and build the product from end to end.",
          keywords: ["Design", "Code", "Iteration"],
        },
        launch: {
          title: "Launch",
          text: "We ship it, measure it and keep improving it.",
          keywords: ["Release", "Metrics", "Improvement"],
        },
      },
    },
    projects: {
      eyebrow: "Selected Work",
      lead: "A selection of digital products I've built.",
      projectsWord: "projects",
      categoriesWord: "categories",
      updated: "Updated 2026",
      categories: {
        crypto: { label: "Crypto", description: "Web3 products, games and experiences." },
        business: { label: "Business", description: "Digital products built around real business needs." },
        experiments: { label: "Experiments", description: "Ideas, prototypes and things I'm exploring." },
      },
      emptyTitle: "In the lab.",
      emptyText: "Experiments are still cooking — nothing to show here yet.",
    },
    work: {
      open: "Open project",
      comingSoon: "Coming soon",
      detailsSoon: "Details coming soon",
      cards: {},
    },
    about: {
      eyebrow: "About",
      title: ["I build things", "I'd want to use."],
      intro:
        "I'm a developer focused on turning ideas into useful digital products — from interactive websites and SaaS to AI and crypto experiences.",
      leadIn: "I like starting with a simple question:",
      question: "What problem are we actually solving?",
      outro: "From there, I design, build, test and keep improving until the product feels right.",
      facts: [
        { label: "Focus", value: "Product & clarity" },
        { label: "Build", value: "Web · SaaS · AI · Crypto" },
        { label: "Principle", value: "Useful before noisy" },
      ],
    },
    contact: {
      eyebrow: "Contact",
      title: ["Have something", "worth building?"],
      subtitle: "Let's turn it into a product.",
      cta: "Start a conversation",
      elsewhere: "Elsewhere",
      soon: "soon",
      copied: "Email copied",
      footerLine: "Built between ideas, tests and coffee.",
    },
    case: {
      back: "Back to projects",
      project: "The project",
      next: "Next project",
      highlights: "What stands out",
      open: "Open",
      demo: "Request a private demo",
      notFound: "Project not found",
      home: "Back to home",
      projects: {},
    },
    labels: {
      Año: "Year", Tipo: "Type", Acceso: "Access", Sector: "Sector", Estado: "Status",
      Superficie: "Surface", Habitaciones: "Bedrooms", Tour: "Tour", Secciones: "Sections",
      Eventos: "Events", Orbes: "Orbs", Roles: "Roles", Módulos: "Modules", Supply: "Supply",
      Vecinos: "Neighbours", Mundo: "World", Record: "Record", Juegos: "Games", Tax: "Tax",
      Cadena: "Chain", "Creado en": "Created on",
      Ligas: "Leagues", Tipos: "Types", Baños: "Bathrooms", "Ocio nocturno": "Nightlife",
      Branding: "Branding", Animación: "Animation", SaaS: "SaaS", "Negocio local": "Local business",
      Reservas: "Booking", GameFi: "GameFi", P2E: "P2E", Tokenomics: "Tokenomics", Memecoin: "Memecoin",
      Arcade: "Arcade", Comunidad: "Community", Inmobiliaria: "Real estate", "3D": "3D",
      Demo: "Demo", "Roles & Auth": "Roles & Auth", Gestión: "Management", Web3: "Web3",
      AI: "AI", Game: "Game", "Privado": "Private", "Público": "Public",
    },
  },

  es: {
    nav: {
      links: [
        { id: "servicios", label: "Cómo trabajo" },
        { id: "proyectos", label: "Proyectos" },
        { id: "sobre-mi", label: "Sobre mí" },
        { id: "contacto", label: "Contacto" },
      ],
      cta: "Hablemos",
      menu: "Menú",
      close: "Cerrar",
    },
    preloader: {
      top: "Archivo vivo",
      vol: "Vol. 2026",
      bottom: "Proyectos · Ideas · Herramientas",
    },
    hero: {
      title: ["Creo productos digitales", "útiles."],
      subtitle: "Websites, SaaS y experiencias para empresas y proyectos crypto.",
      note: "Desde la idea hasta el producto.",
      scroll: "Scroll para explorar ↓",
      followX: "Sígueme en X",
    },
    process: {
      eyebrow: "Cómo trabajo",
      title: ["Cómo", "trabajo."],
      lead: "De la idea al producto, paso a paso.",
      steps: {
        idea: {
          title: "Idea",
          text: "Escucho tu idea y entiendo qué problema quieres resolver.",
          keywords: ["Escucha", "Contexto", "Problema"],
        },
        shape: {
          title: "Shape",
          text: "Damos forma a la idea y definimos cómo debe funcionar.",
          keywords: ["Alcance", "Estructura", "Prototipo"],
        },
        build: {
          title: "Build",
          text: "Diseño y desarrollo el producto de principio a fin.",
          keywords: ["Diseño", "Código", "Iteración"],
        },
        launch: {
          title: "Launch",
          text: "Lo ponemos en marcha, medimos y seguimos mejorándolo.",
          keywords: ["Publicación", "Métricas", "Mejora"],
        },
      },
    },
    projects: {
      eyebrow: "Selected Work",
      lead: "Una selección de productos digitales que he construido.",
      projectsWord: "proyectos",
      categoriesWord: "categorías",
      updated: "Actualizado 2026",
      categories: {
        crypto: { label: "Crypto", description: "Productos Web3, juegos y experiencias." },
        business: { label: "Business", description: "Productos digitales creados sobre necesidades reales de negocio." },
        experiments: { label: "Experiments", description: "Ideas, prototipos y cosas que estoy explorando." },
      },
      emptyTitle: "En el laboratorio.",
      emptyText: "Los experimentos siguen cocinándose: todavía no hay nada que mostrar aquí.",
    },
    work: {
      open: "Abrir proyecto",
      comingSoon: "Próximamente",
      detailsSoon: "Detalles próximamente",
      cards: {
        "usain-bot": {
          typeEn: "Memecoin · Mundo 3D",
          short: "Una memecoin con un mundo 3D jugable: misiones, conducción y una ciudad por explorar; los dos minijuegos arcade son un extra.",
          route: ["Mundo 3D", "Misiones", "Coches", "Arcade"],
          facts: [["", "Memecoin"], ["", "Solana"], ["", "2026"], ["", "Build mode"]],
        },
        elementia: {
          typeEn: "Juego Crypto · PvP",
          short: "Colecciona, cría y combate criaturas elementales en un juego Web3 competitivo.",
          route: ["Huevo", "Criatura", "Combate", "Recompensa"],
          facts: [["", "Cría"], ["", "Combates 3×3"], ["", "PvP"], ["", "Solana"]],
        },
        crossia: {
          typeEn: "Juego Solana · Mundo onírico",
          short: "Un juego creado en Solana con el token CrossIA: una aventura online de comercio en un mundo onírico, con el objetivo de comprar el billete de avión y salir de la isla.",
          route: ["Explorar", "Comerciar", "Ahorrar", "Volar"],
          facts: [["", "Juego Solana"], ["", "CrossIA"], ["", "Mundo onírico"], ["", "Jugable"]],
        },
        "casa-aurea": {
          typeEn: "Inmobiliaria · Web",
          short: "Un escaparate premium para una promotora donde la casa se puede recorrer en 3D antes de existir.",
          route: ["Portada", "Villa", "Tour 3D", "Contacto"],
          facts: [["", "Web"], ["", "2026"], ["", "React · Three.js"], ["", "Demo"]],
        },
        massflow: {
          typeEn: "SaaS · Gestión",
          short: "Un SaaS de reservas y agenda para negocios de masajes a domicilio, con acceso diferenciado para admin, terapeuta y cliente.",
          route: ["Acceso", "Admin", "Terapeuta", "Reserva"],
          facts: [["", "SaaS"], ["", "3 roles"], ["", "2026"], ["", "Demo privada"]],
        },
        "moog-barcelona": {
          typeEn: "Web de club · Rediseño",
          short: "Un rediseño demo de la web de un club techno mítico, hecho solo para ooox: agenda, residentes, galería y un orbe 3D líquido que reacciona al cursor.",
          route: ["Inicio", "Agenda", "Residentes", "Galería"],
          facts: [["", "Web"], ["", "2026"], ["", "React · WebGL"], ["", "Online"]],
        },
      },
    },
    about: {
      eyebrow: "Sobre mí",
      title: ["Construyo cosas", "que me gustaría usar."],
      intro:
        "Soy desarrollador y me dedico a convertir ideas en productos digitales útiles: desde webs interactivas y SaaS hasta experiencias con IA y crypto.",
      leadIn: "Me gusta empezar con una pregunta sencilla:",
      question: "¿Qué problema estamos resolviendo de verdad?",
      outro: "A partir de ahí, diseño, construyo, pruebo y sigo mejorando hasta que el producto se siente bien.",
      facts: [
        { label: "Enfoque", value: "Producto y claridad" },
        { label: "Construyo", value: "Web · SaaS · IA · Crypto" },
        { label: "Principio", value: "Útil antes que ruidoso" },
      ],
    },
    contact: {
      eyebrow: "Contacto",
      title: ["¿Tienes algo", "que merezca construirse?"],
      subtitle: "Convirtámoslo en un producto.",
      cta: "Empezar una conversación",
      elsewhere: "En otros sitios",
      soon: "pronto",
      copied: "Email copiado",
      footerLine: "Construido entre ideas, pruebas y café.",
    },
    case: {
      back: "Volver a proyectos",
      project: "El proyecto",
      next: "Siguiente proyecto",
      highlights: "Lo más destacado",
      open: "Abrir",
      demo: "Solicitar una demo privada",
      notFound: "Proyecto no encontrado",
      home: "Volver al inicio",
      projects: {
        "moog-barcelona": {
          kicker: "30 aniversario · techno desde 1996",
          description: "Proyecto demo · Réplica de la web del club techno MOOG hecha solo para la web ooox: agenda, merch, residentes, galería y un orbe 3D que reacciona al ratón.",
          longDescription:
            "Este es un proyecto demo hecho solo para la web ooox: no es un encargo real del club, es una recreación propia. Para el 30 aniversario de MOOG planteé una web que respirase la cabina: tipografía gigante, un orbe líquido en tiempo real, agenda con filas que laten al ritmo y un índice de DJs con foto al hover. Misma estructura que la original, pero con movimiento, sonido opcional y una experiencia mucho más cercana a estar en el club a las 23:59h.",
          highlights: [
            "Orbe 3D interactivo en el hero con estela y reflejos",
            "Agenda de 28 eventos con suscripción a calendario",
            "Índice de residentes con imagen al pasar el ratón",
            "Galería arrastrable y modo sonido on/off",
          ],
        },
        massflow: {
          kicker: "SaaS de gestión de masajes a domicilio",
          description: "Sistema completo para negocios de masajes a domicilio: reservas, agenda de terapeutas, clientes y cobros desde un único panel.",
          longDescription:
            "MassFlow nace de un problema real: coordinar terapeutas que se mueven por la ciudad, clientes que reservan a última hora y cobros dispersos. El panel centraliza reservas, disponibilidad y facturación, con acceso por roles para administrador, terapeuta y cliente. Es un producto cerrado: las imágenes muestran su interior y puedo hacerte una demo privada.",
          highlights: [
            "Reservas online con disponibilidad en tiempo real",
            "Agenda y rutas por terapeuta",
            "Fichas de cliente e historial de sesiones",
            "Acceso con roles y recuperación de contraseña",
          ],
        },
        "casa-aurea": {
          kicker: "Viviendas contemporáneas que se recorren en 3D",
          description: "Proyecto demo · Web para una promotora de viviendas premium en Mallorca: la Villa Áurea se puede recorrer en 3D antes de pisarla.",
          longDescription:
            "Este es un proyecto demo: no publico casos reales para proteger la privacidad de sus dueños. Áurea simula una promotora de obra nueva en Mallorca. La web presenta la Villa Áurea en Costa d'en Blanes —218 m², 4 habitaciones, 3 baños, piscina privada y parcela de 450 m²— con una estética editorial y un recorrido 3D por dentro de la casa: salón y comedor abiertos a la terraza, cocina, dormitorios y la piscina. El plano y la casa son el mismo objeto.",
          highlights: [
            "Recorrido 3D por el interior de la vivienda",
            "Ficha completa: 218 m², 4 hab., 3 baños, piscina",
            "Narrativa de materia, luz y recorrido",
            "Colección preparada para sumar nuevas viviendas",
          ],
        },
        elementia: {
          kicker: "Colecciona, cría y combate criaturas elementales",
          description: "Juego de criaturas por turnos 3×3 con cría, genética y linajes, aventura PvE, arena PvP y mercado entre jugadores.",
          longDescription:
            "Elementia es un juego de criaturas elementales construido sobre Solana. El jugador obtiene huevos, cría nuevas generaciones con genética y linajes, y combate en equipos de tres por turnos con un sistema de fortalezas y debilidades. Incluye aventura PvE, arena PvP con clasificación, progresión de criaturas, mercado entre jugadores y temporadas con recompensas.",
          highlights: [
            "Combates por turnos 3×3 con fortalezas y debilidades",
            "Cría, genética y linajes de criaturas",
            "Aventura PvE y arena PvP con temporadas",
            "Marketplace entre jugadores",
          ],
        },
        "usain-bot": {
          kicker: "Winners are always first.",
          description: "El bot más rápido de Solana. Memecoin con un mundo 3D jugable: misiones, conducción y una ciudad por explorar; los dos minijuegos arcade son un extra.",
          longDescription:
            "En 2026 un robot bajó de los 9.58 s de Bolt. $BOLT convierte esa historia en una memecoin con identidad cómic y un mundo 3D abierto en el que completas misiones y conduces por la ciudad. Creado en pump.fun, sin preventa ni tokens de equipo. Como extra, dos minijuegos arcade gratuitos con leaderboard global, roadmap en 4 calles y guía de compra.",
          highlights: [
            "Mundo 3D abierto: misiones, conducción y ciudad por explorar",
            "Historia de origen en formato portada de periódico",
            "Creado en pump.fun: sin preventa ni tokens de equipo",
            "Extra: dos minijuegos arcade con leaderboard global",
          ],
        },
        crossia: {
          kicker: "Una aventura online para comerciar y salir de la isla",
          description: "Juego creado en Solana con el token CrossIA: una aventura online de comercio en un mundo onírico con el objetivo de comprar el billete de avión para salir de la isla.",
          longDescription:
            "Animal CrossIA es un juego creado en Solana, con el token CrossIA. Será una aventura online de comerciar en un mundo onírico: exploras la isla, comercias con sus habitantes y acumulas el dinero suficiente para comprar el billete de avión que te permitirá salir. El proyecto está en construcción y ya es jugable.",
          highlights: [
            "Creado en Solana con el token CrossIA",
            "Aventura online en un mundo onírico",
            "Comercia con los habitantes de la isla y acumula recursos",
            "Objetivo final: comprar el billete de avión y salir de la isla",
          ],
        },
      },
    },
  },
};

// Textos de proyectos en inglés (base de datos del sitio)
dict.en.case.projects = {
  "moog-barcelona": {
    kicker: "30th anniversary · techno since 1996",
    description:
      "Demo project · A rebuild of the website of the iconic techno club MOOG, made only for the ooox site: agenda, merch, residents, gallery and a 3D orb that reacts to the cursor.",
    longDescription:
      "This is a demo project made only for the ooox site: it is not a real commission from the club, it is my own recreation. For MOOG's 30th anniversary I designed a website that breathes the booth: giant typography, a real-time liquid orb, an agenda with rows that pulse to the beat and a DJ index that shows a photo on hover. The same structure as the original, but with movement, optional sound and an experience much closer to being in the club at 11:59pm.",
    highlights: [
      "Interactive 3D orb in the hero with trail and reflections",
      "Agenda of 28 events with calendar subscription",
      "Resident index with hover imagery",
      "Draggable gallery and on/off sound mode",
    ],
  },
  massflow: {
    kicker: "SaaS to manage home massage businesses",
    description:
      "A complete system for home massage businesses: bookings, therapist schedules, clients and payments from a single panel.",
    longDescription:
      "MassFlow comes from a real problem: coordinating therapists moving around the city, clients booking at the last minute and scattered payments. The panel centralises bookings, availability and invoicing, with role-based access for admin, therapist and client. It is a closed product: the images show its insides and I can give you a private demo.",
    highlights: [
      "Online booking with real-time availability",
      "Schedules and routes per therapist",
      "Client records and session history",
      "Role-based access and password recovery",
    ],
  },
  "casa-aurea": {
    kicker: "Contemporary homes you can walk through in 3D",
    description:
      "Demo project · A website for a premium developer in Mallorca: Villa Áurea can be walked through in 3D before it is built.",
    longDescription:
      "This is a demo project: I don't publish real cases to protect the privacy of their owners. Áurea simulates a new-build developer in Mallorca. The site presents Villa Áurea in Costa d'en Blanes —218 m², 4 bedrooms, 3 bathrooms, private pool and a 450 m² plot— with an editorial look and a 3D walkthrough inside the house: living and dining room open to the terrace, kitchen, bedrooms and the pool. The floor plan and the house are the same object.",
    highlights: [
      "3D walkthrough inside the home",
      "Full spec sheet: 218 m², 4 beds, 3 baths, pool",
      "A narrative of matter, light and movement",
      "A collection ready for new homes",
    ],
  },
  elementia: {
    kicker: "Collect, breed and battle elemental creatures",
    description:
      "A 3×3 turn-based creature game with breeding, genetics and lineages, PvE adventure, PvP arena and a player marketplace.",
    longDescription:
      "Elementia is an elemental creature game built on Solana. The player obtains eggs, breeds new generations with genetics and lineages, and battles in teams of three in turn-based fights with a strength and weakness system. It includes PvE adventure, a ranked PvP arena, creature progression, a player marketplace and seasons with rewards.",
    highlights: [
      "3×3 turn-based battles with strengths and weaknesses",
      "Breeding, genetics and creature lineages",
      "PvE adventure and PvP arena with seasons",
      "Player-to-player marketplace",
    ],
  },
  "usain-bot": {
    kicker: "Winners are always first.",
    description:
      "The fastest bot on Solana. A memecoin with a playable 3D world: missions, driving and a city to explore; the two arcade minigames are an extra.",
    longDescription:
      "In 2026 a robot broke Bolt's 9.58s record. $BOLT turns that story into a memecoin with comic identity and an open 3D world where you complete missions and drive around the city. Created on pump.fun, with no presale and no team tokens. As an extra, two free arcade minigames with a global leaderboard, a 4-street roadmap and a buying guide.",
    highlights: [
      "Open 3D world: missions, driving and a city to explore",
      "Origin story told as a newspaper front page",
      "Created on pump.fun: no presale, no team tokens",
      "Extra: two arcade minigames with a global leaderboard",
    ],
  },
  crossia: {
    kicker: "An online adventure to trade your way off the island",
    description:
      "A game created on Solana with the CrossIA token: an online trading adventure in an oniric world, aiming to buy the plane ticket that gets you off the island.",
    longDescription:
      "Animal CrossIA is a game created on Solana, with the CrossIA token. It will be an online trading adventure set in an oniric world: you explore the island, trade with its inhabitants and save enough money to buy the plane ticket that lets you leave. The project is under construction and already playable.",
    highlights: [
      "Created on Solana with the CrossIA token",
      "An online adventure in an oniric world",
      "Trade with the island's inhabitants and save resources",
      "Final goal: buy the plane ticket and leave the island",
    ],
  },
};

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

const Ctx = createContext({ lang: "en", setLang: () => {}, t: (k) => k, tLabel: (s) => s });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("ooox_lang") || "en";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("ooox_lang", lang);
    } catch (err) {
      /* ignore */
    }
    if (document.documentElement) document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => get(dict[lang], key) ?? get(dict.en, key) ?? key;
  const tLabel = (s) => (lang === "en" ? (dict.en.labels[s] ?? s) : s);

  return <Ctx.Provider value={{ lang, setLang, t, tLabel }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
