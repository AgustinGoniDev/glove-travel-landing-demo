/**
 * The journey: six stops from the ice of southern Patagonia, across the Andes and up to the desert.
 * Camera paths are written in map coordinates (u = west→east, v = north→south, 0-1 over the terrain
 * tile; landmark positions are in public/terrain/<id>/meta.json) and altitude in meters above sea
 * level. The code keeps the camera above the ground. Each stop starts high in the clouds, comes down
 * to its landmark and climbs back into the clouds, so the trip reads as one continuous flight.
 */

export type Vec3 = [number, number, number];
export type Lang = "en" | "es";
export type Text = Record<Lang, string>;

export interface Atmosphere {
  top: string;
  horizon: string;
  /** Haze color; close to the horizon so the terrain melts into the sky. */
  fog: string;
  /** Haze per kilometer. */
  fogDensity: number;
  sun: string;
  /** Direction the light comes from (x east, y up, z south). */
  sunDir: Vec3;
  ambient: string;
  /** 0 day, 1 night. */
  night: number;
  /** Altitude (m) where snow settles on gentle slopes. */
  snowLine: number;
  cloud: string;
}

export interface Chapter {
  id: "chalten" | "glaciar" | "paine" | "lagos" | "rapanui" | "atacama";
  nav: Text;
  kicker: Text;
  title: Text;
  text: Text;
  /** Where the stop is, for the journey map. */
  place: { lat: number; lon: number };
  /** Shown while flying in from the previous stop. */
  leg: Text | null;
  cam: Vec3[];
  look: Vec3[];
  atmosphere: Atmosphere;
  condors: number;
  /** The ocean gets its own shading (Rapa Nui). */
  sea?: boolean;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "chalten",
    nav: { en: "El Chaltén", es: "El Chaltén" },
    kicker: { en: "El Chaltén, Argentina", es: "El Chaltén, Argentina" },
    title: { en: "Fitz Roy", es: "Fitz Roy" },
    text: {
      en: "First light sets the granite on fire. Our journey starts where the trails do.",
      es: "La primera luz enciende el granito. El viaje empieza donde empiezan los senderos.",
    },
    place: { lat: -49.27, lon: -73.04 },
    leg: null,
    cam: [
      [0.94, 0.76, 4300],
      [0.82, 0.67, 3100],
      [0.69, 0.58, 2500],
      [0.59, 0.47, 2900],
      [0.48, 0.42, 3700],
      [0.36, 0.49, 4700],
    ],
    look: [
      [0.489, 0.51, 2500],
      [0.489, 0.51, 2500],
      [0.489, 0.51, 2600],
      [0.45, 0.53, 2500],
      [0.38, 0.58, 2300],
      [0.25, 0.70, 2700],
    ],
    atmosphere: {
      top: "#4a6fa3",
      horizon: "#f2c4a3",
      fog: "#dab8a8",
      fogDensity: 0.009,
      sun: "#ff9f6c",
      sunDir: [0.92, 0.22, 0.15],
      ambient: "#5f6b8f",
      night: 0,
      snowLine: 2100,
      cloud: "#f6e1d5",
    },
    condors: 2,
  },
  {
    id: "glaciar",
    nav: { en: "Perito Moreno", es: "Perito Moreno" },
    kicker: { en: "Los Glaciares, Argentina", es: "Los Glaciares, Argentina" },
    title: { en: "Perito Moreno", es: "Perito Moreno" },
    text: {
      en: "A wall of ice breaking into Lago Argentino. Glaciers, icebergs, remote estancias.",
      es: "Una pared de hielo que se derrumba sobre el Lago Argentino. Glaciares, témpanos y estancias remotas.",
    },
    place: { lat: -50.47, lon: -73.04 },
    leg: { en: "130 km south · El Calafate", es: "130 km al sur · El Calafate" },
    cam: [
      [0.970, 0.327, 3200],
      [0.850, 0.397, 1200],
      [0.750, 0.447, 760],
      [0.710, 0.377, 1250],
      [0.750, 0.307, 1950],
      [0.840, 0.247, 3300],
    ],
    look: [
      [0.660, 0.467, 600],
      [0.660, 0.467, 300],
      [0.640, 0.487, 300],
      [0.620, 0.497, 350],
      [0.570, 0.547, 500],
      [0.500, 0.597, 900],
    ],
    atmosphere: {
      top: "#4a83b8",
      horizon: "#cfe2ea",
      fog: "#bfd5df",
      fogDensity: 0.011,
      sun: "#fff6ea",
      sunDir: [-0.3, 0.6, -0.75],
      ambient: "#8296aa",
      night: 0,
      snowLine: 1150,
      cloud: "#f2f6f8",
    },
    condors: 0,
  },
  {
    id: "paine",
    nav: { en: "Torres del Paine", es: "Torres del Paine" },
    kicker: { en: "Chilean Patagonia", es: "Patagonia chilena" },
    title: { en: "Torres del Paine", es: "Torres del Paine" },
    text: {
      en: "Across the Andes into Chile: granite towers, icy fjords, glaciers and wildlife.",
      es: "Cruzamos los Andes hacia Chile: torres de granito, fiordos, glaciares y fauna.",
    },
    place: { lat: -50.94, lon: -72.97 },
    leg: { en: "Crossing the Andes into Chile", es: "Cruzando los Andes hacia Chile" },
    cam: [
      [0.920, 0.196, 3900],
      [0.790, 0.286, 2800],
      [0.690, 0.386, 3400],
      [0.600, 0.536, 3300],
      [0.500, 0.746, 1300],
      [0.470, 0.846, 2700],
    ],
    look: [
      [0.632, 0.367, 2300],
      [0.632, 0.367, 2300],
      [0.600, 0.416, 2200],
      [0.520, 0.556, 2000],
      [0.513, 0.556, 2000],
      [0.510, 0.536, 2600],
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
      snowLine: 1650,
      cloud: "#f4f7f8",
    },
    condors: 3,
  },
  {
    id: "lagos",
    nav: { en: "Lake District", es: "Región de los Lagos" },
    kicker: { en: "Chilean Lake District", es: "Región de los Lagos, Chile" },
    title: { en: "Osorno", es: "Osorno" },
    text: {
      en: "Volcanoes, forests, rivers, lakes and hot springs, with Mapuche culture all around.",
      es: "Volcanes, bosques, ríos, lagos y termas, con la cultura mapuche siempre cerca.",
    },
    place: { lat: -41.1, lon: -72.49 },
    leg: { en: "1,100 km north", es: "1.100 km al norte" },
    cam: [
      [0.017, 0.720, 3600],
      [0.197, 0.630, 1400],
      [0.377, 0.580, 1500],
      [0.517, 0.630, 2100],
      [0.697, 0.600, 2600],
      [0.797, 0.400, 3700],
    ],
    look: [
      [0.615, 0.480, 2000],
      [0.615, 0.480, 1900],
      [0.615, 0.480, 2100],
      [0.615, 0.480, 2300],
      [0.615, 0.480, 2200],
      [0.667, 0.300, 1700],
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
    id: "rapanui",
    nav: { en: "Easter Island", es: "Isla de Pascua" },
    kicker: { en: "Rapa Nui, Chile", es: "Rapa Nui, Chile" },
    title: { en: "Easter Island", es: "Isla de Pascua" },
    text: {
      en: "Ancient Rapa Nui culture and the moai, alone in the middle of the Pacific.",
      es: "La antigua cultura rapanui y sus moáis, solos en medio del Pacífico.",
    },
    place: { lat: -27.12, lon: -109.35 },
    leg: { en: "3,700 km into the Pacific", es: "3.700 km mar adentro" },
    cam: [
      [0.10, 0.95, 2600],
      [0.22, 0.88, 1300],
      [0.33, 0.87, 900],
      [0.52, 0.78, 700],
      [0.70, 0.67, 480],
      [0.90, 0.48, 2000],
    ],
    look: [
      [0.343, 0.78, 150],
      [0.343, 0.78, 120],
      [0.45, 0.72, 150],
      [0.756, 0.576, 150],
      [0.793, 0.589, 60],
      [0.98, 0.40, 0],
    ],
    atmosphere: {
      top: "#3d7fbf",
      horizon: "#f3d6b0",
      fog: "#d9c7b4",
      fogDensity: 0.012,
      sun: "#ffc98a",
      sunDir: [-0.85, 0.28, 0.2],
      ambient: "#6f87a0",
      night: 0,
      snowLine: 9000,
      cloud: "#f7ecdf",
    },
    condors: 0,
    sea: true,
  },
  {
    id: "atacama",
    nav: { en: "Atacama", es: "Atacama" },
    kicker: { en: "San Pedro de Atacama, Chile", es: "San Pedro de Atacama, Chile" },
    title: { en: "Atacama", es: "Atacama" },
    text: {
      en: "Lunar valleys, salt flats and towering volcanoes, under one of the clearest night skies on the planet.",
      es: "Valles lunares, salares y volcanes imponentes, bajo uno de los cielos más limpios del planeta.",
    },
    place: { lat: -22.83, lon: -67.88 },
    leg: { en: "Back to the mainland · the driest desert on Earth", es: "De vuelta al continente · el desierto más árido del mundo" },
    cam: [
      [0.06, 0.72, 4600],
      [0.28, 0.63, 3400],
      [0.50, 0.56, 3800],
      [0.63, 0.53, 4700],
      [0.69, 0.58, 5700],
      [0.67, 0.62, 6600],
    ],
    look: [
      [0.773, 0.49, 5200],
      [0.773, 0.49, 5300],
      [0.773, 0.49, 5450],
      [0.773, 0.49, 5600],
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
