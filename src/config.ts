/**
 * The flight: five chapters over real terrain. Camera paths are written in map coordinates
 * (u = west→east, v = north→south, both 0-1 over the terrain tile) and altitude in meters above sea
 * level, so they can be read against the map. The code keeps the camera above the ground.
 */

export type Vec3 = [number, number, number];

export interface Atmosphere {
  /** Sky at the zenith and at the horizon. */
  top: string;
  horizon: string;
  /** Haze color; it should be close to the horizon so the terrain melts into the sky. */
  fog: string;
  /** Haze per kilometer. */
  fogDensity: number;
  sun: string;
  /** Direction the light comes from (x east, y up, z south). */
  sunDir: Vec3;
  ambient: string;
  /** 0 day, 1 night. */
  night: number;
  /** Altitude (m) where snow starts to settle on gentle slopes. */
  snowLine: number;
  /** Color of the transition clouds. */
  cloud: string;
}

export interface Chapter {
  id: "paine" | "glaciar" | "fitzroy" | "lagos" | "atacama";
  nav: string;
  kicker: string;
  title: string;
  text: string;
  cam: Vec3[];
  look: Vec3[];
  atmosphere: Atmosphere;
  condors: number;
}

export const EXAGGERATION = 1.35;

export const CHAPTERS: Chapter[] = [
  {
    id: "paine",
    nav: "Torres del Paine",
    kicker: "Chilean Patagonia",
    title: "Torres del Paine",
    text: "Granite towers, icy fjords, glaciers and wildlife. The trail starts where the road ends.",
    cam: [
      [0.60, 1.02, 1700],
      [0.55, 0.90, 1500],
      [0.50, 0.79, 1900],
      [0.53, 0.68, 3200],
      [0.62, 0.55, 3600],
      [0.72, 0.42, 3400],
    ],
    look: [
      [0.51, 0.64, 2300],
      [0.51, 0.63, 2300],
      [0.52, 0.60, 2400],
      [0.60, 0.48, 2600],
      [0.64, 0.43, 2400],
      [0.70, 0.30, 1400],
    ],
    atmosphere: {
      top: "#3f78b4",
      horizon: "#c9dbe6",
      fog: "#b9cdd8",
      fogDensity: 0.011,
      sun: "#fff0d8",
      sunDir: [0.35, 0.55, -0.75],
      ambient: "#7d8ea0",
      night: 0,
      snowLine: 1350,
      cloud: "#f4f7f8",
    },
    condors: 3,
  },
  {
    id: "glaciar",
    nav: "Perito Moreno",
    kicker: "Argentine Patagonia",
    title: "Perito Moreno",
    text: "A wall of ice sixty meters high, breaking into Lago Argentino. Glaciers, estancias and endless views.",
    cam: [
      [0.92, 0.46, 900],
      [0.82, 0.50, 650],
      [0.74, 0.53, 750],
      [0.71, 0.46, 1250],
      [0.75, 0.39, 1950],
      [0.83, 0.36, 2700],
    ],
    look: [
      [0.66, 0.55, 300],
      [0.66, 0.55, 280],
      [0.64, 0.57, 300],
      [0.62, 0.58, 350],
      [0.57, 0.63, 500],
      [0.50, 0.68, 700],
    ],
    atmosphere: {
      top: "#4a83b8",
      horizon: "#cfe2ea",
      fog: "#bfd5df",
      fogDensity: 0.012,
      sun: "#fff6ea",
      sunDir: [-0.3, 0.6, -0.75],
      ambient: "#8296aa",
      night: 0,
      snowLine: 1100,
      cloud: "#f2f6f8",
    },
    condors: 0,
  },
  {
    id: "fitzroy",
    nav: "Fitz Roy",
    kicker: "El Chaltén, Argentina",
    title: "Fitz Roy",
    text: "First light sets the granite on fire. Insider access, outsider perspective.",
    cam: [
      [0.88, 0.74, 1500],
      [0.76, 0.65, 1600],
      [0.65, 0.56, 2100],
      [0.56, 0.46, 3300],
      [0.45, 0.44, 3500],
      [0.33, 0.55, 3000],
    ],
    look: [
      [0.49, 0.51, 2700],
      [0.49, 0.51, 2800],
      [0.49, 0.51, 3000],
      [0.42, 0.54, 2600],
      [0.38, 0.57, 2400],
      [0.18, 0.62, 1600],
    ],
    atmosphere: {
      top: "#4f74a6",
      horizon: "#f3c6a5",
      fog: "#d9b4a6",
      fogDensity: 0.009,
      sun: "#ff9d6a",
      sunDir: [0.92, 0.24, 0.15],
      ambient: "#5d6a8e",
      night: 0,
      snowLine: 2150,
      cloud: "#f7e2d6",
    },
    condors: 2,
  },
  {
    id: "lagos",
    nav: "Lake District",
    kicker: "Chilean Lake District",
    title: "Osorno",
    text: "Volcanoes, forests, rivers and hot springs, with Mapuche culture all around.",
    cam: [
      [0.18, 0.56, 1000],
      [0.36, 0.53, 1150],
      [0.53, 0.53, 1700],
      [0.64, 0.63, 2300],
      [0.79, 0.60, 2700],
      [0.86, 0.43, 2600],
    ],
    look: [
      [0.70, 0.48, 1900],
      [0.70, 0.48, 2000],
      [0.70, 0.48, 2150],
      [0.70, 0.48, 2250],
      [0.70, 0.48, 2150],
      [0.78, 0.36, 1500],
    ],
    atmosphere: {
      top: "#4a85bd",
      horizon: "#d3e2dd",
      fog: "#c0d4cd",
      fogDensity: 0.012,
      sun: "#fff1dc",
      sunDir: [-0.45, 0.5, -0.65],
      ambient: "#80938c",
      night: 0,
      snowLine: 1700,
      cloud: "#f3f6f3",
    },
    condors: 0,
  },
  {
    id: "atacama",
    nav: "Atacama",
    kicker: "San Pedro de Atacama, Chile",
    title: "Atacama",
    text: "Lunar valleys, salt flats and towering volcanoes, under one of the clearest night skies on the planet.",
    cam: [
      [0.10, 0.70, 3300],
      [0.30, 0.62, 3400],
      [0.50, 0.56, 3800],
      [0.63, 0.53, 4700],
      [0.69, 0.58, 5700],
      [0.67, 0.62, 6600],
    ],
    look: [
      [0.77, 0.49, 5200],
      [0.77, 0.49, 5300],
      [0.77, 0.49, 5450],
      [0.77, 0.49, 5600],
      [0.86, 0.40, 7600],
      [0.90, 0.32, 12500],
    ],
    atmosphere: {
      top: "#0b1430",
      horizon: "#d9774f",
      fog: "#5a4150",
      fogDensity: 0.008,
      sun: "#ff9a5a",
      sunDir: [-0.97, 0.07, 0.12],
      ambient: "#3c4468",
      night: 0.55,
      snowLine: 5600,
      cloud: "#c99a8c",
    },
    condors: 0,
  },
];
