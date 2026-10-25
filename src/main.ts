import "./style.css";
import Lenis from "lenis";
import * as THREE from "three";
import { CHAPTERS } from "./config";
import { ChapterScene } from "./flight";
import { Post } from "./post";
import { Sky } from "./sky";
import { loadTerrain } from "./terrain";
import { buildContent, buildOverlay, formatAltitude, formatCoords, type Overlay } from "./ui";

const N = CHAPTERS.length;
const params = new URLSearchParams(location.search);
/** Brush size of the paint filter in pixels (0 turns it off). */
const BRUSH = params.has("paint") ? Number(params.get("paint")) : 1.7;
/** Fixed position in the flight (0 to 5), for screenshots. */
let FIXED = params.has("g") ? Number(params.get("g")) : null;
/** Debug: move the flight without reloading (only with ?g=). */
if (FIXED !== null) (window as unknown as { setG: (v: number) => void }).setG = (v: number) => (FIXED = v);

const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const windowed = (t: number, a: number, b: number, fade = 0.07) => smooth(t, a - fade, a) * (1 - smooth(t, b, b + fade));

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
  const loaderEl = document.querySelector<HTMLElement>("#loader")!;
  const percentEl = document.querySelector<HTMLElement>("#loader-percent")!;
  const flightEl = document.querySelector<HTMLElement>("#flight")!;
  const contentEl = document.querySelector<HTMLElement>("#content")!;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.03, 700);
  const sky = new Sky();
  scene.add(sky.group);
  const post = new Post(renderer, scene, camera, BRUSH);
  post.setSize(innerWidth, innerHeight, pixelRatio);

  // Load the five terrains, with a real percentage on the loader.
  let done = 0;
  const total = N * 3;
  const tick = () => {
    done++;
    percentEl.textContent = `${Math.round((done / total) * 100)}%`;
  };
  const chapters = await Promise.all(CHAPTERS.map(async (c) => new ChapterScene(c, await loadTerrain(c, c.atmosphere, tick))));
  for (const c of chapters) {
    c.group.visible = false;
    scene.add(c.group);
  }

  const overlay: Overlay = buildOverlay((i) => {
    const length = flightEl.offsetHeight - innerHeight;
    lenis.scrollTo(flightEl.offsetTop + ((i + 0.3) / N) * length, { duration: 2.2 });
  });
  buildContent();

  const lenis = new Lenis({ duration: 1.5, smoothWheel: true, wheelMultiplier: 0.9 });

  let active = -1;
  let g = FIXED ?? 0;
  const mouse = new THREE.Vector2();
  const mouseSmooth = new THREE.Vector2();
  addEventListener("pointermove", (e) => mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1));

  const fog = new THREE.Color();
  const cloudA = new THREE.Color();
  const cloudB = new THREE.Color();
  const look = new THREE.Vector3();
  const right = new THREE.Vector3();
  const clock = new THREE.Timer();

  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    chapters.forEach((c, k) => (c.group.visible = k === i));
    sky.set(CHAPTERS[i]!.atmosphere);
  };

  const frame = (now: number) => {
    lenis.raf(now);
    clock.update(now);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsed();

    const length = Math.max(1, flightEl.offsetHeight - innerHeight);
    const target = FIXED ?? THREE.MathUtils.clamp((scrollY - flightEl.offsetTop) / length, 0, 1) * N;
    g = FIXED ?? g + (target - g) * (1 - Math.exp(-dt * 3.2));

    const i = Math.min(N - 1, Math.floor(g));
    const t = THREE.MathUtils.clamp(g - i, 0, 1);
    setActive(i);
    const chapter = chapters[i]!;
    const atmosphere = CHAPTERS[i]!.atmosphere;

    // Clouds cover the screen around each change of chapter.
    let cover = 0;
    let k = Math.round(g);
    if (k >= 1 && k <= N - 1) cover = 1 - smooth(Math.abs(g - k), 0, 0.11);
    k = THREE.MathUtils.clamp(k, 1, N - 1);
    cloudA.set(CHAPTERS[k - 1]!.atmosphere.cloud);
    cloudB.set(CHAPTERS[k]!.atmosphere.cloud);
    cloudA.lerp(cloudB, smooth(g, k - 0.1, k + 0.1));

    // Atacama turns from dusk to night as the camera climbs.
    const night = chapter.chapter.id === "atacama" ? atmosphere.night + 0.45 * smooth(t, 0.25, 0.9) : atmosphere.night;
    chapter.terrain.mesh.material.uniforms.night!.value = night;

    // Camera on its path, with a little drift and the mouse nudging the gaze.
    mouseSmooth.lerp(mouse, 1 - Math.exp(-dt * 2));
    chapter.cameraPosition(t, camera.position);
    camera.position.y += Math.sin(time * 0.6) * 0.012;
    chapter.lookTarget(t, look);
    right.subVectors(look, camera.position).cross(camera.up).normalize();
    const reach = camera.position.distanceTo(look);
    look.addScaledVector(right, mouseSmooth.x * reach * 0.06);
    look.y -= mouseSmooth.y * reach * 0.035;
    camera.lookAt(look);

    fog.set(atmosphere.fog);
    chapter.update(camera, t, time, dt, fog, 1);
    sky.update(camera, time, night);

    // Text, chapter dots and the coordinates readout.
    overlay.hero.style.opacity = String(i === 0 ? 1 - smooth(t, 0.1, 0.2) : 0);
    overlay.hero.style.setProperty("--spread", String(smooth(t, 0, 0.2)));
    overlay.blocks.forEach((b, k2) => {
      const o = k2 === i ? windowed(t, i === 0 ? 0.3 : 0.2, 0.74) : 0;
      b.style.opacity = String(o);
      b.style.setProperty("--in", String(o));
    });
    overlay.finale.style.opacity = String(i === N - 1 ? windowed(t, 0.84, 1.2) : 0);
    overlay.dots.forEach((d, k2) => d.classList.toggle("is-active", k2 === i));
    const ll = chapter.terrain.latLon(camera.position.x, camera.position.z);
    overlay.coords.textContent = formatCoords(ll.lat, ll.lon);
    overlay.altitude.textContent = formatAltitude(chapter.terrain.toMeters(camera.position.y));
    overlay.place.textContent = CHAPTERS[i]!.nav;
    overlay.counter.textContent = `0${i + 1} / 0${N}`;
    overlay.hint.style.opacity = String(g < 0.08 ? 1 : 0);
    document.body.classList.toggle("is-night", night > 0.6);

    // Once the page content covers the screen, stop drawing the flight.
    if (contentEl.getBoundingClientRect().top > 0) post.render(time, cover, cloudA);
    requestAnimationFrame(frame);
  };

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    post.setSize(innerWidth, innerHeight, pixelRatio);
  });

  setActive(0);
  requestAnimationFrame((now) => {
    frame(now);
    loaderEl.classList.add("is-done");
    document.body.classList.add("is-ready");
  });
}

main().catch((e: unknown) => {
  console.error(e);
  const el = document.querySelector<HTMLElement>("#loader-percent");
  if (el) el.textContent = "The flight could not load";
});
