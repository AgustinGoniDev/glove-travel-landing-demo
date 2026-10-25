import * as THREE from "three";

/**
 * The journey line: a ribbon of light gliding ahead of the camera, like the streaks of EverSwap.
 * `head` (0-1 along the path) moves with the scroll; the tail fades behind it.
 */
export class Route {
  readonly mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>;

  constructor(points: THREE.Vector3[], color = "#fff3d6") {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const geometry = new THREE.TubeGeometry(curve, 600, 0.0055, 6, false);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { head: { value: 0 }, time: { value: 0 }, color: { value: new THREE.Color(color) }, strength: { value: 1 }, camPos: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float head;
        uniform float time;
        uniform vec3 color;
        uniform float strength;
        uniform vec3 camPos;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          float s = vUv.x;
          float tail = smoothstep(head - 0.28, head, s) * (1.0 - smoothstep(head, head + 0.012, s));
          float pulse = 0.75 + 0.25 * sin(s * 140.0 - time * 6.0);
          float core = pow(tail, 1.6) * pulse;
          // Fade where the line passes right by the camera, so it never turns into a wide beam.
          float near = smoothstep(0.35, 1.1, length(vWorld - camPos));
          gl_FragColor = vec4(color * (0.7 + core * 2.2), core * strength * 0.62 * near);
        }
      `,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  update(head: number, time: number, strength: number, camera: THREE.Vector3): void {
    const u = this.mesh.material.uniforms;
    (u.camPos!.value as THREE.Vector3).copy(camera);
    u.head!.value = head;
    u.time!.value = time;
    u.strength!.value = strength;
  }
}
