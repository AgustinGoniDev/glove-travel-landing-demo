import type { Chapter } from "./config";
import { MAP, MAP_LAND, project } from "./map-data";

const NS = "http://www.w3.org/2000/svg";
/** Rapa Nui is 3,700 km off the coast: it is drawn as an inset at the left edge of the map. */
const RAPA_NUI_INSET: [number, number] = [16, 108];

const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

/**
 * The journey map: Chile and Argentina with the route of the flight. Each leg draws itself while
 * flying from one stop to the next, and a marker shows where the camera is.
 */
export class JourneyMap {
  private readonly legs: SVGPathElement[] = [];
  private readonly lengths: number[] = [];
  private readonly dots: SVGCircleElement[] = [];
  private readonly marker: SVGCircleElement;
  private readonly halo: SVGCircleElement;

  constructor(container: HTMLElement, chapters: Chapter[]) {
    const root = svg("svg", { viewBox: `0 0 ${MAP.width} ${MAP.height}`, class: "journey-svg" });
    for (const land of MAP_LAND) root.append(svg("path", { d: land.d, class: land.focus ? "land focus" : "land" }));

    const points = chapters.map((c) => (c.id === "rapanui" ? RAPA_NUI_INSET : project(c.place.lat, c.place.lon)));
    // The Rapa Nui inset: a small island with a dashed line to the coast.
    const coast = project(-33.0, -71.6);
    root.append(svg("path", { d: `M${coast[0]},${coast[1]} Q${(coast[0] + RAPA_NUI_INSET[0]) / 2},${coast[1] - 10} ${RAPA_NUI_INSET[0]},${RAPA_NUI_INSET[1]}`, class: "sea-link" }));
    root.append(svg("circle", { cx: RAPA_NUI_INSET[0], cy: RAPA_NUI_INSET[1], r: 3.2, class: "land focus" }));

    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]!;
      const [bx, by] = points[i]!;
      // A gentle bow, like a flight path.
      const mx = (ax + bx) / 2 + (by - ay) * 0.18;
      const my = (ay + by) / 2 - (bx - ax) * 0.18;
      const d = `M${ax},${ay} Q${mx},${my} ${bx},${by}`;
      root.append(svg("path", { d, class: "route-base" }));
      const leg = svg("path", { d, class: "route-leg" });
      root.append(leg);
      this.legs.push(leg);
    }
    for (const [x, y] of points) {
      const dot = svg("circle", { cx: x, cy: y, r: 2.6, class: "stop" });
      root.append(dot);
      this.dots.push(dot);
    }
    this.halo = svg("circle", { r: 7, class: "marker-halo" });
    this.marker = svg("circle", { r: 3.4, class: "marker" });
    root.append(this.halo, this.marker);
    container.append(root);

    for (const leg of this.legs) {
      const len = leg.getTotalLength();
      this.lengths.push(len);
      leg.style.strokeDasharray = `${len}`;
      leg.style.strokeDashoffset = `${len}`;
    }
  }

  /** `g` is the position in the journey: 0 at the first stop, n at the end of the last one. */
  update(g: number): void {
    let marker: DOMPoint | null = null;
    this.legs.forEach((leg, i) => {
      const k = i + 1;
      // Each leg is flown during the cloud crossing around the boundary between stop k-1 and k.
      const f = Math.min(1, Math.max(0, (g - (k - 0.16)) / 0.32));
      const len = this.lengths[i] ?? 0;
      leg.style.strokeDashoffset = `${len * (1 - f)}`;
      if (f > 0 && f < 1) marker = leg.getPointAtLength(len * f);
    });
    const active = Math.min(this.dots.length - 1, Math.floor(g + 0.16));
    this.dots.forEach((d, i) => d.classList.toggle("is-past", i <= active));
    if (!marker) {
      const d = this.dots[Math.max(0, active)]!;
      marker = new DOMPoint(Number(d.getAttribute("cx")), Number(d.getAttribute("cy")));
    }
    const m = marker as DOMPoint;
    for (const c of [this.marker, this.halo]) {
      c.setAttribute("cx", String(m.x));
      c.setAttribute("cy", String(m.y));
    }
  }
}
