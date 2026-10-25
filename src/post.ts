import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { NOISE_GLSL } from "./noise";

/**
 * Render → bloom (the journey line, the sun) → paint (Kuwahara brush strokes, the cloud transition
 * between chapters, vignette and grain) → tone mapping and sRGB.
 */
export class Post {
  readonly composer: EffectComposer;
  readonly paint: ShaderPass;
  private readonly bloom: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, brush: number) {
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType }));
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(size, 0.38, 0.45, 1.25);
    this.composer.addPass(this.bloom);
    this.paint = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(size.x, size.y) },
        brush: { value: brush },
        cover: { value: 0 },
        cloudColor: { value: new THREE.Color("#f4f7f8") },
        time: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float brush;
        uniform float cover;
        uniform vec3 cloudColor;
        uniform float time;
        varying vec2 vUv;
        ${NOISE_GLSL}
        const int R = 3;
        void quadrant(vec2 uv, vec2 dirx, vec2 diry, inout vec3 bestMean, inout float bestVar) {
          vec3 m = vec3(0.0);
          vec3 s = vec3(0.0);
          for (int j = 0; j <= R; j++) {
            for (int i = 0; i <= R; i++) {
              vec3 c = texture2D(tDiffuse, uv + dirx * float(i) + diry * float(j)).rgb;
              m += c;
              s += c * c;
            }
          }
          float n = float((R + 1) * (R + 1));
          m /= n;
          vec3 v = abs(s / n - m * m);
          float variance = v.r + v.g + v.b;
          if (variance < bestVar) { bestVar = variance; bestMean = m; }
        }
        void main() {
          vec3 col = texture2D(tDiffuse, vUv).rgb;
          if (brush > 0.0) {
            // Kuwahara: each pixel takes the calmest of four neighborhoods, which reads as brush strokes.
            vec2 px = brush / resolution;
            vec3 best = col;
            float bestVar = 1e9;
            quadrant(vUv, vec2(-px.x, 0.0), vec2(0.0, -px.y), best, bestVar);
            quadrant(vUv, vec2(px.x, 0.0), vec2(0.0, -px.y), best, bestVar);
            quadrant(vUv, vec2(-px.x, 0.0), vec2(0.0, px.y), best, bestVar);
            quadrant(vUv, vec2(px.x, 0.0), vec2(0.0, px.y), best, bestVar);
            col = best;
          }
          // Clouds that cover the screen between chapters.
          if (cover > 0.001) {
            vec2 p = (vUv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
            float n = fbm(p * 2.4 + vec2(time * 0.05, -time * 0.02));
            float center = 1.0 - length(p) * 0.6;
            float edge = 1.0 - cover * 1.45;
            float c = smoothstep(edge - 0.05, edge + 0.25, n * 0.85 + center * 0.3 * cover);
            vec3 cloud = cloudColor * (0.88 + 0.24 * n);
            col = mix(col, cloud, c);
          }
          float vig = smoothstep(1.15, 0.3, length(vUv - 0.5) * 1.45);
          col *= mix(1.0, vig, 0.38);
          col += (hash12(vUv * resolution + fract(time) * 100.0) - 0.5) * 0.03;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.composer.addPass(this.paint);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    (this.paint.uniforms.resolution!.value as THREE.Vector2).set(w * pixelRatio, h * pixelRatio);
    this.bloom.resolution.set(w, h);
  }

  render(time: number, cover: number, cloud: THREE.Color): void {
    const u = this.paint.uniforms;
    u.time!.value = time;
    u.cover!.value = cover;
    (u.cloudColor!.value as THREE.Color).copy(cloud);
    this.composer.render();
  }
}
