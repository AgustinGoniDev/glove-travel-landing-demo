import * as THREE from "three";
import type { Atmosphere } from "./config";
import { NOISE_GLSL } from "./noise";

/** Gradient sky with sun glow, painted cirrus and, at night, the Milky Way and stars. Follows the camera. */
export class Sky {
  readonly group = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;
  private readonly stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color() },
        horizon: { value: new THREE.Color() },
        fog: { value: new THREE.Color() },
        sunColor: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        night: { value: 0 },
        time: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 fog;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        uniform float night;
        uniform float time;
        varying vec3 vDir;
        ${NOISE_GLSL}
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(horizon, top, pow(smoothstep(-0.02, 0.75, h), 0.7));
          col = mix(fog, col, smoothstep(-0.12, 0.04, h));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 900.0) * 2.0 + pow(s, 24.0) * 0.28 + pow(s, 4.0) * 0.12);
          // Painted cirrus streaks.
          vec2 sp = d.xz / (h + 0.25);
          float c = fbm(sp * vec2(1.4, 4.0) + vec2(time * 0.004, 0.0));
          float cirrus = smoothstep(0.58, 0.9, c) * smoothstep(0.02, 0.4, h) * (1.0 - smoothstep(0.3, 0.8, night));
          col = mix(col, mix(horizon, vec3(1.0), 0.6) + sunColor * pow(s, 6.0) * 0.4, cirrus * 0.38);
          // Night falls: deep blue overhead, the last glow only low on the horizon towards the sun.
          vec3 nightSky = mix(vec3(0.07, 0.06, 0.13), vec3(0.008, 0.014, 0.04), smoothstep(-0.02, 0.5, h));
          nightSky += sunColor * pow(s, 3.0) * 0.35 * (1.0 - smoothstep(0.0, 0.25, h));
          col = mix(col, nightSky, smoothstep(0.45, 1.0, night));
          // Milky Way at night.
          vec3 bandN = normalize(vec3(0.55, 0.35, 0.76));
          float band = exp(-pow(dot(d, bandN) / 0.16, 2.0));
          float dust = fbm(d.xy * 9.0 + d.z * 4.0);
          col += night * band * smoothstep(0.0, 0.3, h) * (vec3(0.55, 0.6, 0.85) * dust * 0.55 + vec3(0.12, 0.1, 0.16));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), this.material);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.group.add(dome);

    const count = 2600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = Math.random() ** 0.7;
      const r = Math.sqrt(1 - y * y);
      const a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r * 280, y * 280, Math.sin(a) * r * 280], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
  }

  set(a: Atmosphere): void {
    const u = this.material.uniforms;
    (u.top!.value as THREE.Color).set(a.top);
    (u.horizon!.value as THREE.Color).set(a.horizon);
    (u.fog!.value as THREE.Color).set(a.fog);
    (u.sunColor!.value as THREE.Color).set(a.sun);
    (u.sunDir!.value as THREE.Vector3).set(...a.sunDir).normalize();
    u.night!.value = a.night;
    this.stars.material.opacity = a.night * 1.4;
  }

  update(camera: THREE.Camera, time: number, night: number): void {
    this.group.position.copy(camera.position);
    this.material.uniforms.time!.value = time;
    this.material.uniforms.night!.value = night;
    this.stars.material.opacity = Math.min(1, night * 1.6);
    this.stars.rotation.y = time * 0.003;
  }
}
