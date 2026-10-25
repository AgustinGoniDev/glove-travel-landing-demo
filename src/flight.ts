import * as THREE from "three";
import { Clouds } from "./clouds";
import { Condor } from "./condor";
import type { Chapter } from "./config";
import { Route } from "./route";
import type { Terrain } from "./terrain";

const SAMPLES = 240;
const CLEARANCE = 0.5;

/** Everything one chapter shows: its terrain, its camera path, the journey line, clouds and condors. */
export class ChapterScene {
  readonly group = new THREE.Group();
  readonly route: Route;
  readonly clouds: Clouds;
  readonly condors: Condor[] = [];
  private readonly camCurve: THREE.CatmullRomCurve3;
  private readonly lookCurve: THREE.CatmullRomCurve3;
  private readonly lift = new Float32Array(SAMPLES + 1);

  constructor(
    readonly chapter: Chapter,
    readonly terrain: Terrain,
  ) {
    this.group.add(terrain.mesh);
    this.camCurve = new THREE.CatmullRomCurve3(chapter.cam.map(([u, v, m]) => terrain.point(u, v, m)), false, "centripetal");
    this.lookCurve = new THREE.CatmullRomCurve3(chapter.look.map(([u, v, m]) => terrain.point(u, v, m)), false, "centripetal");
    this.computeLift();

    const routePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      const p = this.cameraPosition(t);
      const ahead = this.cameraPosition(Math.min(1, t + 0.01)).sub(p).normalize();
      const side = new THREE.Vector3(-ahead.z, 0, ahead.x);
      p.addScaledVector(side, Math.sin(t * Math.PI * 3) * 0.18);
      p.y = Math.max(p.y - 0.24, terrain.groundAt(p.x, p.z) + 0.08);
      routePoints.push(p);
    }
    this.route = new Route(routePoints);
    this.group.add(this.route.mesh);

    const anchors = Array.from({ length: 12 }, (_, i) => this.cameraPosition(i / 11));
    const ceiling = terrain.toY(terrain.meta.maxHeight);
    this.clouds = new Clouds(anchors, chapter.atmosphere.cloud, ceiling);
    this.group.add(this.clouds.group);

    for (let i = 0; i < chapter.condors; i++) {
      const t = 0.18 + i * 0.16;
      const p = this.cameraPosition(t);
      const ahead = this.cameraPosition(t + 0.02).sub(p).normalize();
      const center = p.clone().addScaledVector(ahead, 0.9).add(new THREE.Vector3((i - 1) * 0.35, -0.08 + i * 0.05, 0));
      const condor = new Condor(center, 0.28 + i * 0.12, (i % 2 ? -1 : 1) * (0.32 + i * 0.05));
      this.condors.push(condor);
      this.group.add(condor.group);
    }
  }

  /** Keeps the camera above the ground (with room for the near plane) along the whole path. */
  private computeLift(): void {
    const p = new THREE.Vector3();
    const raw = new Float32Array(SAMPLES + 1);
    for (let i = 0; i <= SAMPLES; i++) {
      this.camCurve.getPoint(i / SAMPLES, p);
      let ground = 0;
      for (const [dx, dz] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]] as const) {
        ground = Math.max(ground, this.terrain.groundAt(p.x + dx, p.z + dz));
      }
      raw[i] = Math.max(0, ground + CLEARANCE - p.y);
    }
    // Spread each lift to its neighbors and smooth it, so the camera rises early instead of bumping.
    const w = 14;
    for (let i = 0; i <= SAMPLES; i++) {
      let m = 0;
      for (let k = -w; k <= w; k++) m = Math.max(m, raw[Math.min(SAMPLES, Math.max(0, i + k))] ?? 0);
      this.lift[i] = m;
    }
    const copy = this.lift.slice();
    for (let i = 0; i <= SAMPLES; i++) {
      let s = 0;
      let c = 0;
      for (let k = -8; k <= 8; k++) {
        const j = i + k;
        if (j >= 0 && j <= SAMPLES) {
          s += copy[j] ?? 0;
          c++;
        }
      }
      this.lift[i] = s / c;
    }
  }

  cameraPosition(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const tt = THREE.MathUtils.clamp(t, 0, 1);
    this.camCurve.getPoint(tt, out);
    const f = tt * SAMPLES;
    const i = Math.floor(f);
    const lift = THREE.MathUtils.lerp(this.lift[i] ?? 0, this.lift[Math.min(SAMPLES, i + 1)] ?? 0, f - i);
    out.y += lift;
    return out;
  }

  lookTarget(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.lookCurve.getPoint(THREE.MathUtils.clamp(t, 0, 1), out);
  }

  update(camera: THREE.Camera, t: number, time: number, dt: number, fog: THREE.Color, visibility: number): void {
    (this.terrain.mesh.material.uniforms.camPos!.value as THREE.Vector3).copy(camera.position);
    this.terrain.mesh.material.uniforms.time!.value = time;
    this.route.update(Math.min(1.05, t + 0.07), time, visibility, camera.position);
    this.clouds.update(camera, dt, visibility);
    for (const c of this.condors) c.update(time, fog, camera, visibility);
  }
}
