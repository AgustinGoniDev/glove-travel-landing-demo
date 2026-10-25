import * as THREE from "three";
import type { Chapter } from "./config";
import { NOISE_GLSL } from "./noise";

export interface TerrainMeta {
  id: string;
  size: number;
  widthMeters: number;
  exaggeration: number;
  minHeight: number;
  maxHeight: number;
  bounds: { west: number; east: number; north: number; south: number };
}

/** The grid (uv and triangles) is the same for every stop of the same size: built once, shared. */
const grids = new Map<number, { uv: THREE.BufferAttribute; index: THREE.BufferAttribute }>();
function grid(n: number): { uv: THREE.BufferAttribute; index: THREE.BufferAttribute } {
  const cached = grids.get(n);
  if (cached) return cached;
  const uvs = new Float32Array(n * n * 2);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      uvs[(i * n + j) * 2] = j / (n - 1);
      uvs[(i * n + j) * 2 + 1] = 1 - i / (n - 1);
    }
  }
  const index = new Uint32Array((n - 1) * (n - 1) * 6);
  let p = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      index.set([a, a + n, a + 1, a + 1, a + n, a + n + 1], p);
      p += 6;
    }
  }
  const g = { uv: new THREE.BufferAttribute(uvs, 2), index: new THREE.BufferAttribute(index, 1) };
  grids.set(n, g);
  return g;
}

/** One stop of the journey: a mesh in kilometers, centered at the origin, north towards -z. */
export class Terrain {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly width: number;
  readonly textures: THREE.Texture[];

  constructor(
    readonly meta: TerrainMeta,
    private readonly heights: Uint16Array,
    color: THREE.Texture,
    normal: THREE.Texture,
    chapter: Chapter,
  ) {
    this.width = meta.widthMeters / 1000;
    this.textures = [color, normal];
    const n = meta.size;
    const positions = new Float32Array(n * n * 3);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const k = i * n + j;
        const edge = Math.min(i, j, n - 1 - i, n - 1 - j);
        // Pull the border down a little so the end of the map never shows as a wall.
        const sink = edge < 8 ? (8 - edge) * 0.06 : 0;
        positions[k * 3] = (j / (n - 1) - 0.5) * this.width;
        positions[k * 3 + 1] = this.toY(heights[k] ?? 0) - sink;
        positions[k * 3 + 2] = (i / (n - 1) - 0.5) * this.width;
      }
    }
    const { uv, index } = grid(n);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", uv);
    geometry.setIndex(index);

    const a = chapter.atmosphere;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: color },
        normalMap: { value: normal },
        sunDir: { value: new THREE.Vector3(...a.sunDir).normalize() },
        sunColor: { value: new THREE.Color(a.sun) },
        ambient: { value: new THREE.Color(a.ambient) },
        skyColor: { value: new THREE.Color(a.top) },
        fogColor: { value: new THREE.Color(a.fog) },
        fogDensity: { value: a.fogDensity },
        snowLine: { value: this.toY(a.snowLine) },
        night: { value: a.night },
        sea: { value: chapter.sea ? 1 : 0 },
        time: { value: 0 },
        camPos: { value: new THREE.Vector3() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform sampler2D normalMap;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 ambient;
        uniform vec3 skyColor;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float snowLine;
        uniform float night;
        uniform float sea;
        uniform float time;
        uniform vec3 camPos;
        varying vec2 vUv;
        varying vec3 vWorld;
        ${NOISE_GLSL}
        void main() {
          // A few brush strokes: a small smear of the texture along a slowly turning direction.
          float ang = vnoise(vUv * 30.0) * 6.2831;
          vec2 dir = vec2(cos(ang), sin(ang));
          float stroke = vnoise(vec2(dot(vUv, dir) * 2600.0, dot(vUv, vec2(-dir.y, dir.x)) * 260.0));
          vec2 warp = dir * (stroke - 0.5) * 0.0011;
          vec3 base = texture2D(map, vUv + warp).rgb;

          // Relief from the full-resolution elevation (world-space normal map).
          vec3 n = normalize(texture2D(normalMap, vUv).rgb * 2.0 - 1.0);

          // Cliffs: a photo taken from above smears on vertical walls, so they are painted as rock,
          // with the average color of the area and horizontal strata.
          float steep = 1.0 - smoothstep(0.42, 0.72, n.y);
          vec3 avg = texture2D(map, vUv, 4.5).rgb;
          float strata = vnoise(vec2(vWorld.y * 22.0, dot(vUv, vec2(0.71, 0.71)) * 520.0));
          vec3 rock = mix(avg * 0.72, vec3(0.31, 0.29, 0.28), 0.5) * (0.78 + 0.44 * strata);
          base = mix(base, rock, steep * 0.85);
          float ndl = dot(n, sunDir);
          float diffuse = clamp(ndl * 0.75 + 0.25, 0.0, 1.0);
          float skyLight = 0.55 + 0.45 * n.y;
          vec3 col = base * (ambient * skyLight + sunColor * diffuse * 1.2);

          // Snow on gentle slopes above the snow line: warm in the sun, blue in the shade.
          float jitter = (vnoise(vUv * 140.0) - 0.5) * 0.3;
          float snow = smoothstep(snowLine - 0.08, snowLine + 0.25, vWorld.y + jitter) * smoothstep(0.5, 0.82, n.y);
          vec3 snowLit = mix(vec3(0.5, 0.6, 0.78), sunColor * 1.05, clamp(ndl * 0.9 + 0.25, 0.0, 1.0));
          col = mix(col, snowLit, snow * 0.5);

          vec3 view = normalize(camPos - vWorld);
          // The ocean: deep blue, the sky in the swell and the sun's glitter.
          if (sea > 0.5) {
            float water = 1.0 - smoothstep(0.004, 0.02, vWorld.y);
            vec2 wp = vWorld.xz * 6.0;
            vec3 wn = normalize(vec3((vnoise(wp + time * 0.35) - 0.5) * 0.35, 1.0, (vnoise(wp.yx * 1.3 - time * 0.3) - 0.5) * 0.35));
            float fres = pow(1.0 - max(dot(wn, view), 0.0), 4.0);
            vec3 deep = mix(vec3(0.02, 0.12, 0.26), base * 0.9, 0.35);
            float glint = pow(max(dot(reflect(-sunDir, wn), view), 0.0), 180.0);
            vec3 ocean = mix(deep, skyColor * 0.9, fres * 0.75) + sunColor * glint * 2.5;
            col = mix(col, ocean, water);
          }

          col *= 0.95 + 0.1 * stroke;

          // Night: moonlit blue.
          col = mix(col, col * vec3(0.32, 0.38, 0.62) + vec3(0.0, 0.004, 0.02), night);

          // Aerial perspective; the map border fades into it.
          float d = length(vWorld - camPos);
          float fog = 1.0 - exp(-d * fogDensity);
          float edge = smoothstep(0.0, 0.12, min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y)));
          col = mix(fogColor, col, (1.0 - fog) * edge);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  /** Meters above sea level → scene units (km, exaggerated, the lowest point at 0). */
  toY(meters: number): number {
    return ((meters - this.meta.minHeight) / 1000) * this.meta.exaggeration;
  }

  toMeters(y: number): number {
    return (y / this.meta.exaggeration) * 1000 + this.meta.minHeight;
  }

  /** Map coordinates (u east, v south, 0-1) and altitude in meters → scene position. */
  point(u: number, v: number, meters: number): THREE.Vector3 {
    return new THREE.Vector3((u - 0.5) * this.width, this.toY(meters), (v - 0.5) * this.width);
  }

  /** Ground height (scene units) under a scene position, bilinear. */
  groundAt(x: number, z: number): number {
    const n = this.meta.size;
    const fx = Math.min(Math.max((x / this.width + 0.5) * (n - 1), 0), n - 1.001);
    const fz = Math.min(Math.max((z / this.width + 0.5) * (n - 1), 0), n - 1.001);
    const j = Math.floor(fx);
    const i = Math.floor(fz);
    const tx = fx - j;
    const tz = fz - i;
    const h = (r: number, c: number) => this.heights[r * n + c] ?? 0;
    const top = h(i, j) * (1 - tx) + h(i, j + 1) * tx;
    const bottom = h(i + 1, j) * (1 - tx) + h(i + 1, j + 1) * tx;
    return this.toY(top * (1 - tz) + bottom * tz);
  }

  /** Geographic position of a scene point, for the coordinates readout. */
  latLon(x: number, z: number): { lat: number; lon: number } {
    const b = this.meta.bounds;
    return { lon: b.west + (b.east - b.west) * (x / this.width + 0.5), lat: b.north + (b.south - b.north) * (z / this.width + 0.5) };
  }

  /** Frees the GPU copy of the textures; they upload again the next time the stop is drawn. */
  release(): void {
    for (const t of this.textures) t.dispose();
  }
}

export async function loadTerrain(chapter: Chapter, small: boolean, onProgress: () => void): Promise<Terrain> {
  const base = `${import.meta.env.BASE_URL}terrain/${chapter.id}`;
  const loader = new THREE.TextureLoader();
  const [meta, buffer, color, normal] = await Promise.all([
    fetch(`${base}/meta.json`).then((r) => r.json() as Promise<TerrainMeta>).finally(onProgress),
    fetch(`${base}/height.bin`).then((r) => r.arrayBuffer()).finally(onProgress),
    loader.loadAsync(`${base}/${small ? "color-2k" : "color"}.jpg`).finally(onProgress),
    loader.loadAsync(`${base}/normal.jpg`).finally(onProgress),
  ]);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = 16;
  normal.colorSpace = THREE.NoColorSpace;
  normal.anisotropy = 8;
  return new Terrain(meta, new Uint16Array(buffer), color, normal, chapter);
}
