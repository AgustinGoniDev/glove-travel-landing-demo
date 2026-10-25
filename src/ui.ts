import { CHAPTERS, type Lang } from "./config";

export interface Overlay {
  hero: HTMLElement;
  blocks: HTMLElement[];
  finale: HTMLElement;
  leg: HTMLElement;
  legTitle: HTMLElement;
  legText: HTMLElement;
  dots: HTMLButtonElement[];
  coords: HTMLElement;
  altitude: HTMLElement;
  place: HTMLElement;
  counter: HTMLElement;
  hint: HTMLElement;
  waiting: HTMLElement;
  setLang: (lang: Lang) => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
};

/** The text over the flight, the stop diamonds and the coordinates readout. */
export function buildOverlay(onChapter: (i: number) => void): Overlay {
  const titles = document.querySelector<HTMLElement>("#titles")!;
  const parts = CHAPTERS.map((c, i) => {
    const b = el("section", `chapter-block ${i % 2 ? "is-right" : "is-left"}`);
    const kicker = el("span", "kicker");
    const title = el("h2", "chapter-title");
    const text = el("p", "chapter-text");
    b.append(kicker, title, el("span", "rule"), text);
    titles.append(b);
    return { b, kicker, title, text, c };
  });

  const nav = document.querySelector<HTMLElement>("#chapters")!;
  const dots = CHAPTERS.map((_, i) => {
    const d = el("button", "dot");
    d.type = "button";
    d.append(el("span", "diamond"), el("span", "dot-label"));
    d.addEventListener("click", () => onChapter(i));
    nav.append(d);
    return d;
  });

  const setLang = (lang: Lang) => {
    for (const p of parts) {
      p.kicker.textContent = p.c.kicker[lang];
      p.title.textContent = p.c.title[lang];
      p.text.textContent = p.c.text[lang];
    }
    dots.forEach((d, i) => {
      const name = CHAPTERS[i]!.nav[lang];
      d.setAttribute("aria-label", name);
      d.querySelector(".dot-label")!.textContent = name;
    });
  };

  const q = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  return {
    hero: q("#hero"),
    blocks: parts.map((p) => p.b),
    finale: q("#finale"),
    leg: q("#leg"),
    legTitle: q("#leg-title"),
    legText: q("#leg-text"),
    dots,
    coords: q("#hud-coords"),
    altitude: q("#hud-altitude"),
    place: q("#hud-place"),
    counter: q("#hud-counter"),
    hint: q("#scroll-hint"),
    waiting: q("#waiting"),
    setLang,
  };
}

function dms(value: number, pos: string, neg: string): string {
  const v = Math.abs(value);
  const d = Math.floor(v);
  const m = Math.floor((v - d) * 60);
  const s = Math.floor(((v - d) * 60 - m) * 60);
  return `${d}º ${String(m).padStart(2, "0")}' ${String(s).padStart(2, "0")}'' ${value < 0 ? neg : pos}`;
}

export const formatCoords = (lat: number, lon: number) => `${dms(lat, "N", "S")}   ${dms(lon, "E", "W")}`;
export const formatAltitude = (m: number, lang: Lang) => `${Math.round(m).toLocaleString(lang === "es" ? "es-AR" : "en-US")} m`;

interface Credit {
  title: string;
  author: string;
  license: string;
  source: string;
}

/** Photo credits from public/photos/credits.json, listed in the footer. */
export function buildCredits(): void {
  const list = document.querySelector<HTMLElement>("#credits-list");
  if (!list) return;
  fetch(`${import.meta.env.BASE_URL}photos/credits.json`)
    .then((r) => r.json() as Promise<Credit[]>)
    .then((credits) => {
      for (const c of credits) {
        const li = el("li");
        const a = el("a");
        a.textContent = c.title;
        a.href = c.source;
        a.target = "_blank";
        a.rel = "noreferrer";
        li.append(a, document.createTextNode(` — ${c.author || "Unknown"} · ${c.license}`));
        list.append(li);
      }
    })
    .catch(() => undefined);
}

/** The contact and newsletter forms: front-end only in the demo, they thank and reset. */
export function wireForms(): void {
  document.querySelectorAll<HTMLFormElement>("form[data-thanks]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.classList.add("is-sent");
      form.reset();
      setTimeout(() => form.classList.remove("is-sent"), 6000);
    });
  });
}
