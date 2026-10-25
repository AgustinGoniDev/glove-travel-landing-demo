import * as THREE from "three";
import type { Atmosphere, Chapter } from "./config";
import { EXAGGERATION } from "./config";
import { NOISE_GLSL } from "./noise";

export interface TerrainMeta {
  id: string;
  size: number;
  widthMeters: number;
  minHeight: number;
  maxHeight: number;
  bounds: { west: number; east: number; north: number; south: number };
}

/** One chapter's piece of the Andes: a mesh in kilometers, centered at the origin, north towards -z. */
export class Terrain {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly width: number;

  constructor(
    readonly meta: TerrainMeta,
    private readonly heights: Uint16Array,
    texture: THREE.Texture,
    atmosphere: Atmosphere,
  ) {
    this.width = meta.widthMeters / 1000;
    const n = meta.size;
    const positions = new Float32Array(n * n * 3);
    const uvs = new Float32Array(n * n * 2);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const k = i * n + j;
        const edge = Math.min(i, j, n - 1 - i, n - 1 - j);
        // Pull the border down a little so the end of the map never shows as a wall.
        const sink = edge < 6 ? (6 - edge) * 0.08 : 0;
        positions[k * 3] = (j / (n - 1) - 0.5) * this.width;
        positions[k * 3 + 1] = this.toY(heights[k] ?? 0) - sink;
        positions[k * 3 + 2] = (i / (n - 1) - 0.5) * this.width;
        uvs[k * 2] = j / (n - 1);
        uvs[k * 2 + 1] = 1 - i / (n - 1);
      }
    }
    const index = new Uint32Array((n - 1) * (n - 1) * 6);
    let p = 0;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1; j++) {
        const a = i * n + j;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        index[p++] = a;
        index[p++] = c;
        index[p++] = b;
        index[p++] = b;
        index[p++] = c;
        index[p++] = d;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeVertexNormals();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        sunDir: { value: new THREE.Vector3(...atmosphere.sunDir).normalize() },
        sunColor: { value: new THREE.Color(atmosphere.sun) },
        ambient: { value: new THREE.Color(atmosphere.ambient) },
        fogColor: { value: new THREE.Color(atmosphere.fog) },
        fogDensity: { value: atmosphere.fogDensity },
        snowLine: { value: this.toY(atmosphere.snowLine) },
        night: { value: atmosphere.night },
        camPos: { value: new THREE.Vector3() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 ambient;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float snowLine;
        uniform float night;
        uniform vec3 camPos;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec3 vNormal;
        ${NOISE_GLSL}
        void main() {
          // Brush strokes: the texture is smeared along a slowly turning direction.
          float a = vnoise(vUv * 38.0) * 6.2831;
          vec2 dir = vec2(cos(a), sin(a));
          float stroke = vnoise(vec2(dot(vUv, dir) * 1600.0, dot(vUv, vec2(-dir.y, dir.x)) * 160.0));
          vec2 warp = dir * (stroke - 0.5) * 0.0045 + (vec2(vnoise(vUv * 260.0), vnoise(vUv * 260.0 + 9.1)) - 0.5) * 0.002;
          vec3 base = texture2D(map, vUv + warp).rgb;

          vec3 n = normalize(vNormal);
          float ndl = dot(n, sunDir);
          float diffuse = clamp(ndl * 0.7 + 0.3, 0.0, 1.0);
          vec3 col = base * (ambient * 0.9 + sunColor * diffuse * 1.15);

          // Snow on gentle slopes above the snow line, warm in the sun and blue in the shade.
          float jitter = (vnoise(vUv * 90.0) - 0.5) * 0.35;
          float snow = smoothstep(snowLine - 0.1, snowLine + 0.25, vWorld.y + jitter) * smoothstep(0.42, 0.78, n.y);
          vec3 snowLit = mix(vec3(0.52, 0.62, 0.8), sunColor * 1.05, clamp(ndl * 0.9 + 0.25, 0.0, 1.0));
          col = mix(col, snowLit, snow * 0.65);

          // Paint texture: soft value variation and a touch of posterization.
          col *= 0.92 + 0.16 * stroke;
          col = mix(col, floor(col * 9.0 + 0.5) / 9.0, 0.22);

          // Night: moonlit blue.
          col = mix(col, col * vec3(0.32, 0.38, 0.62) + vec3(0.0, 0.004, 0.02), night);

          // Aerial perspective, more haze in the low valleys, and the map border fades into it.
          float d = length(vWorld - camPos);
          float fog = 1.0 - exp(-d * fogDensity);
          fog = clamp(fog + (1.0 - smoothstep(0.0, 1.6, vWorld.y)) * 0.05, 0.0, 1.0);
          float edge = smoothstep(0.0, 0.14, min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y)));
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
    return ((meters - this.meta.minHeight) / 1000) * EXAGGERATION;
  }

  toMeters(y: number): number {
    return (y / EXAGGERATION) * 1000 + this.meta.minHeight;
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
    const u = x / this.width + 0.5;
    const v = z / this.width + 0.5;
    return { lon: b.west + (b.east - b.west) * u, lat: b.north + (b.south - b.north) * v };
  }
}

export async function loadTerrain(chapter: Chapter, atmosphere: Atmosphere, onProgress: () => void): Promise<Terrain> {
  const base = `${import.meta.env.BASE_URL}terrain/${chapter.id}`;
  const [meta, buffer, texture] = await Promise.all([
    fetch(`${base}/meta.json`).then((r) => r.json() as Promise<TerrainMeta>).finally(onProgress),
    fetch(`${base}/height.bin`).then((r) => r.arrayBuffer()).finally(onProgress),
    new THREE.TextureLoader().loadAsync(`${base}/color.jpg`).finally(onProgress),
  ]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  return new Terrain(meta, new Uint16Array(buffer), texture, atmosphere);
}
