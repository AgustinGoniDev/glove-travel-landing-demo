import { CHAPTERS } from "./config";

export interface Overlay {
  hero: HTMLElement;
  blocks: HTMLElement[];
  finale: HTMLElement;
  dots: HTMLButtonElement[];
  coords: HTMLElement;
  altitude: HTMLElement;
  place: HTMLElement;
  counter: HTMLElement;
  hint: HTMLElement;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
};

/** The text over the flight, the chapter diamonds and the coordinates readout. */
export function buildOverlay(onChapter: (i: number) => void): Overlay {
  const titles = document.querySelector<HTMLElement>("#titles")!;
  const blocks = CHAPTERS.map((c, i) => {
    const b = el("section", `chapter-block ${i % 2 ? "is-right" : "is-left"}`);
    b.append(el("span", "kicker", c.kicker), el("h2", "chapter-title", c.title), el("span", "rule"), el("p", "chapter-text", c.text));
    titles.append(b);
    return b;
  });

  const nav = document.querySelector<HTMLElement>("#chapters")!;
  const dots = CHAPTERS.map((c, i) => {
    const d = el("button", "dot");
    d.type = "button";
    d.setAttribute("aria-label", c.nav);
    d.append(el("span", "diamond"), el("span", "dot-label", c.nav));
    d.addEventListener("click", () => onChapter(i));
    nav.append(d);
    return d;
  });

  return {
    hero: document.querySelector<HTMLElement>("#hero")!,
    blocks,
    finale: document.querySelector<HTMLElement>("#finale")!,
    dots,
    coords: document.querySelector<HTMLElement>("#hud-coords")!,
    altitude: document.querySelector<HTMLElement>("#hud-altitude")!,
    place: document.querySelector<HTMLElement>("#hud-place")!,
    counter: document.querySelector<HTMLElement>("#hud-counter")!,
    hint: document.querySelector<HTMLElement>("#scroll-hint")!,
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
export const formatAltitude = (m: number) => `${Math.round(m).toLocaleString("en-US")} m`;

interface Credit {
  file: string;
  title: string;
  author: string;
  license: string;
  source: string;
}

/** Photo credits from public/photos/credits.json, listed in the footer. */
export function buildContent(): void {
  const list = document.querySelector<HTMLElement>("#credits-list");
  if (!list) return;
  fetch(`${import.meta.env.BASE_URL}photos/credits.json`)
    .then((r) => r.json() as Promise<Credit[]>)
    .then((credits) => {
      for (const c of credits) {
        const li = el("li");
        const a = el("a", undefined, c.title);
        a.href = c.source;
        a.target = "_blank";
        a.rel = "noreferrer";
        li.append(a, document.createTextNode(` — ${c.author || "Unknown"} · ${c.license}`));
        list.append(li);
      }
    })
    .catch(() => undefined);
}
