import type { Lang } from "./config";

/**
 * Texts of the page in English (default) and Spanish. Elements carry `data-i18n` (text),
 * `data-i18n-ph` (placeholder) or `data-i18n-aria` (aria-label) with a key of this table.
 */
const STRINGS: Record<string, Record<Lang, string>> = {
  "nav.destinations": { en: "Destinations", es: "Destinos" },
  "nav.about": { en: "About us", es: "Nosotros" },
  "nav.footprints": { en: "Our footprints", es: "Nuestra huella" },
  "nav.contact": { en: "Let's talk", es: "Hablemos" },
  "cta.plan": { en: "Plan your journey", es: "Diseñemos tu viaje" },

  "hero.kicker": { en: "Chile · Argentina · Uruguay · Antarctica", es: "Chile · Argentina · Uruguay · Antártida" },
  "hero.text": { en: "Tailor-made journeys across Patagonia, the Andes and beyond.", es: "Viajes a medida por la Patagonia, los Andes y más allá." },
  "hint": { en: "Scroll to fly", es: "Desliza para volar" },
  "next": { en: "Next stop", es: "Próxima parada" },
  "loading.next": { en: "Flying to the next stop…", es: "Volando a la próxima parada…" },
  "finale.title": { en: "Every journey, designed from scratch", es: "Cada viaje, diseñado desde cero" },
  "finale.text": { en: "We don't copy-paste. Each trip is the fulfillment of a dream.", es: "No copiamos ni pegamos. Cada viaje es un sueño cumplido." },
  "map.label": { en: "Journey map", es: "Mapa del recorrido" },

  "about.eyebrow": { en: "Tailor-made journeys", es: "Viajes a medida" },
  "about.title": { en: "We curate tailor-made journeys in Chile, Argentina, Uruguay & Antarctica.", es: "Diseñamos viajes a medida en Chile, Argentina, Uruguay y la Antártida." },
  "about.p1": {
    en: "An international team living in our chosen destinations, designing adventures for the inquisitive, savvy traveller.",
    es: "Un equipo internacional que vive en los destinos que elegimos y diseña aventuras para viajeros curiosos y exigentes.",
  },
  "pillar1.title": { en: "Designed from scratch", es: "Diseñado desde cero" },
  "pillar1.text": { en: "Every itinerary starts on a blank page, with you.", es: "Cada itinerario empieza en una hoja en blanco, contigo." },
  "pillar2.title": { en: "Insider access, outsider perspective", es: "Acceso de local, mirada de viajero" },
  "pillar2.text": { en: "We live where we travel, so we open doors like no one else.", es: "Vivimos donde viajamos, por eso abrimos puertas como nadie." },
  "pillar3.title": { en: "Natural hosts", es: "Anfitriones por naturaleza" },
  "pillar3.text": { en: "Passionate travellers, curious souls, detail lovers.", es: "Viajeros apasionados, almas curiosas, amantes del detalle." },

  "dest.eyebrow": { en: "Destinations", es: "Destinos" },
  "dest.title": { en: "Travel is life changing. Reward the explorer within you.", es: "Viajar cambia la vida. Premia al explorador que llevas dentro." },
  "dest.patagonia": { en: "Chilean Patagonia", es: "Patagonia chilena" },
  "dest.patagonia.text": { en: "Torres del Paine, wildlife, icy fjords, glaciers.", es: "Torres del Paine, fauna, fiordos y glaciares." },
  "dest.glaciers": { en: "Glaciers", es: "Glaciares" },
  "dest.glaciers.text": { en: "Icebergs, remote estancias and never-ending views.", es: "Témpanos, estancias remotas y vistas infinitas." },
  "dest.atacama": { en: "Atacama", es: "Atacama" },
  "dest.atacama.text": { en: "Lunar valleys, geysers, salt flats, starry skies.", es: "Valles lunares, géiseres, salares y cielos estrellados." },
  "dest.easter": { en: "Easter Island", es: "Isla de Pascua" },
  "dest.easter.text": { en: "Ancient Rapa Nui culture and imposing moai.", es: "La antigua cultura rapanui y sus imponentes moáis." },
  "dest.lakes": { en: "Lake District", es: "Región de los Lagos" },
  "dest.lakes.text": { en: "Volcanoes, forests, rivers and hot springs.", es: "Volcanes, bosques, ríos y termas." },
  "dest.mendoza": { en: "Mendoza", es: "Mendoza" },
  "dest.mendoza.text": { en: "The Andes, wine and the great outdoors.", es: "Los Andes, el vino y la vida al aire libre." },
  "dest.baires": { en: "Buenos Aires & Pampas", es: "Buenos Aires y la Pampa" },
  "dest.baires.text": { en: "European charm, South American attitude.", es: "Encanto europeo, actitud sudamericana." },
  "dest.antarctica": { en: "Antarctica", es: "Antártida" },
  "dest.antarctica.text": { en: "A land of extreme beauty and extreme climate.", es: "Una tierra de belleza y clima extremos." },
  "country.cl": { en: "Chile", es: "Chile" },
  "country.ar": { en: "Argentina", es: "Argentina" },
  "country.aq": { en: "White continent", es: "Continente blanco" },

  "fp.eyebrow": { en: "Our footprints", es: "Nuestra huella" },
  "fp.title": { en: "Designing travel experiences that inspire a better world.", es: "Diseñamos experiencias de viaje que inspiran un mundo mejor." },
  "fp.text": {
    en: "We are a proud certified B Corporation and members of The Long Run, and we collaborate with The Legacy Fund on conservation and community projects. We work with local guides and providers, so every journey leaves a positive mark.",
    es: "Somos una Empresa B certificada y miembros de The Long Run, y colaboramos con The Legacy Fund en proyectos de conservación y desarrollo comunitario. Trabajamos con guías y proveedores locales, para que cada viaje deje una huella positiva.",
  },

  "contact.eyebrow": { en: "Let's talk", es: "Hablemos" },
  "contact.title": { en: "Where will your journey begin?", es: "¿Dónde empieza tu viaje?" },
  "contact.name": { en: "Name", es: "Nombre" },
  "contact.email": { en: "Email", es: "Email" },
  "contact.where": { en: "Where would you like to go?", es: "¿Adónde te gustaría ir?" },
  "contact.message": { en: "Tell us about your trip", es: "Cuéntanos sobre tu viaje" },
  "contact.send": { en: "Send", es: "Enviar" },
  "contact.thanks": { en: "Thank you for contacting us! We'll get back to you soon.", es: "¡Gracias por escribirnos! Te responderemos pronto." },
  "news.title": { en: "Be in the know", es: "Mantente al día" },
  "news.text": { en: "New journeys, stories and the best time to go.", es: "Viajes nuevos, historias y la mejor época para ir." },
  "news.email": { en: "Your email", es: "Tu email" },
  "news.send": { en: "Subscribe", es: "Suscribirme" },
  "news.thanks": { en: "Thanks for subscribing!", es: "¡Gracias por suscribirte!" },

  "foot.tagline": { en: "Glove Travel. All the way.", es: "Glove Travel. All the way." },
  "foot.explore": { en: "Explore", es: "Explorar" },
  "foot.contact": { en: "Contact", es: "Contacto" },
  "foot.follow": { en: "Follow us", es: "Síguenos" },
  "foot.feedback": { en: "Suggestions or feedback", es: "Sugerencias o comentarios" },
  "foot.certs": { en: "Certifications & foundations", es: "Certificaciones y fundaciones" },
  "foot.villas": { en: "Villas", es: "Villas" },
  "foot.rights": { en: "© Glove Travel. All rights reserved.", es: "© Glove Travel. Todos los derechos reservados." },
  "foot.credits": { en: "Credits", es: "Créditos" },
  "foot.creditsText": {
    en: "Terrain: AWS Terrain Tiles (SRTM, GMTED). Imagery: Esri World Imagery; Sentinel-2 cloudless by EOX IT Services (contains modified Copernicus Sentinel data 2021). Photos: Glove Travel and Wikimedia Commons:",
    es: "Terreno: AWS Terrain Tiles (SRTM, GMTED). Imágenes: Esri World Imagery; Sentinel-2 cloudless de EOX IT Services (contiene datos modificados de Copernicus Sentinel 2021). Fotos: Glove Travel y Wikimedia Commons:",
  },
  "foot.demo": { en: "Concept demo · Australis AI", es: "Demo conceptual · Australis AI" },
};

const KEY = "glove-lang";
const listeners: ((lang: Lang) => void)[] = [];

function initial(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "es" || q === "en") return q;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // Storage may be blocked: English is the default.
  }
  return "en";
}

let current: Lang = initial();

export const getLang = (): Lang => current;

export function t(key: string): string {
  return STRINGS[key]?.[current] ?? key;
}

export function applyLang(): void {
  document.documentElement.lang = current;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n ?? "")));
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh ?? "")));
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria ?? "")));
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === current)));
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Not saved; the choice still applies to this visit.
  }
  applyLang();
  for (const l of listeners) l(lang);
}

export function onLangChange(cb: (lang: Lang) => void): void {
  listeners.push(cb);
}
