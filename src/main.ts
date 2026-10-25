import "./style.css";
import Lenis from "lenis";
import * as THREE from "three";
import { CHAPTERS } from "./config";
import { ChapterScene } from "./flight";
import { applyLang, getLang, onLangChange, setLang, t } from "./i18n";
import { JourneyMap } from "./map";
import { Post } from "./post";
import { Sky } from "./sky";
import { loadTerrain } from "./terrain";
import { buildCredits, buildOverlay, formatAltitude, formatCoords, wireForms } from "./ui";

const N = CHAPTERS.length;
const params = new URLSearchParams(location.search);
/** Brush size of the paint filter in pixels (0 turns it off). */
const BRUSH = params.has("paint") ? Number(params.get("paint")) : 1.0;
/** Fixed position in the journey (0 to 6), for screenshots. With it, window.setG(n) moves it. */
let FIXED = params.has("g") ? Number(params.get("g")) : null;
if (FIXED !== null) (window as unknown as { setG: (v: number) => void }).setG = (v: number) => (FIXED = v);
/** Phones get the 2K textures. */
const SMALL = Math.min(screen.width, screen.height) < 820;

const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const windowed = (t0: number, a: number, b: number, fade = 0.07) => smooth(t0, a - fade, a) * (1 - smooth(t0, b, b + fade));

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
  const loaderEl = document.querySelector<HTMLElement>("#loader")!;
  const percentEl = document.querySelector<HTMLElement>("#loader-percent")!;
  const flightEl = document.querySelector<HTMLElement>("#flight")!;
  const contentEl = document.querySelector<HTMLElement>("#content")!;

  applyLang();
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang === "es" ? "es" : "en")));
  buildCredits();
  wireForms();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.03, 700);
  const sky = new Sky();
  scene.add(sky.group);
  const post = new Post(renderer, scene, camera, BRUSH);
  post.setSize(innerWidth, innerHeight, pixelRatio);

  // The first stop gates the loader; the others load in order while the visitor flies.
  const chapters: (ChapterScene | undefined)[] = new Array(N);
  const build = async (i: number, onProgress: () => void) => {
    const c = CHAPTERS[i]!;
    const scene_ = new ChapterScene(c, await loadTerrain(c, SMALL, onProgress));
    scene_.group.visible = false;
    scene.add(scene_.group);
    chapters[i] = scene_;
  };
  let done = 0;
  await build(0, () => (percentEl.textContent = `${Math.round((++done / 4) * 100)}%`));
  void (async () => {
    for (let i = 1; i < N; i++) await build(i, () => undefined).catch((e: unknown) => console.error(e));
  })();

  const lenis = new Lenis({ duration: 1.5, smoothWheel: true, wheelMultiplier: 0.9 });
  const overlay = buildOverlay((i) => {
    const length = flightEl.offsetHeight - innerHeight;
    lenis.scrollTo(flightEl.offsetTop + ((i + 0.3) / N) * length, { duration: 2.4 });
  });
  overlay.setLang(getLang());
  onLangChange((lang) => overlay.setLang(lang));
  const map = new JourneyMap(document.querySelector<HTMLElement>("#journey")!, CHAPTERS);

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
  const timer = new THREE.Timer();

  /** Only the current stop and its neighbors keep their textures on the GPU. */
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    chapters.forEach((c, k) => {
      if (!c) return;
      c.group.visible = k === i;
      if (Math.abs(k - i) > 1) c.terrain.release();
    });
    const next = chapters[i + 1];
    if (next) for (const tex of next.terrain.textures) renderer.initTexture(tex);
    sky.set(CHAPTERS[i]!.atmosphere);
  };

  const frame = (now: number) => {
    lenis.raf(now);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.1);
    const time = timer.getElapsed();
    const lang = getLang();

    const length = Math.max(1, flightEl.offsetHeight - innerHeight);
    const target = FIXED ?? THREE.MathUtils.clamp((scrollY - flightEl.offsetTop) / length, 0, 1) * N;
    g = FIXED ?? g + (target - g) * (1 - Math.exp(-dt * 3.2));

    const i = Math.min(N - 1, Math.floor(g));
    const t0 = THREE.MathUtils.clamp(g - i, 0, 1);
    const chapter = chapters[i];
    const ready = chapter !== undefined;

    // Clouds cover the screen around each change of stop, and while a stop is still loading.
    const k = THREE.MathUtils.clamp(Math.round(g), 1, N - 1);
    const near = Math.abs(g - k);
    let cover = Math.round(g) >= 1 && Math.round(g) <= N - 1 ? 1 - smooth(near, 0, 0.11) : 0;
    if (!ready) cover = 1;
    cloudA.set(CHAPTERS[k - 1]!.atmosphere.cloud).lerp(cloudB.set(CHAPTERS[k]!.atmosphere.cloud), smooth(g, k - 0.1, k + 0.1));

    if (ready) {
      setActive(i);
      const atmosphere = CHAPTERS[i]!.atmosphere;
      // Atacama turns from dusk to night as the camera climbs.
      const night = chapter.chapter.id === "atacama" ? atmosphere.night + 0.45 * smooth(t0, 0.25, 0.9) : atmosphere.night;
      chapter.terrain.mesh.material.uniforms.night!.value = night;

      mouseSmooth.lerp(mouse, 1 - Math.exp(-dt * 2));
      chapter.cameraPosition(t0, camera.position);
      camera.position.y += Math.sin(time * 0.6) * 0.01;
      chapter.lookTarget(t0, look);
      right.subVectors(look, camera.position).cross(camera.up).normalize();
      const reach = camera.position.distanceTo(look);
      look.addScaledVector(right, mouseSmooth.x * reach * 0.06);
      look.y -= mouseSmooth.y * reach * 0.035;
      camera.lookAt(look);

      fog.set(atmosphere.fog);
      chapter.update(camera, t0, time, dt, fog, 1);
      sky.update(camera, time, night);

      const ll = chapter.terrain.latLon(camera.position.x, camera.position.z);
      overlay.coords.textContent = formatCoords(ll.lat, ll.lon);
      overlay.altitude.textContent = formatAltitude(chapter.terrain.toMeters(camera.position.y), lang);
      document.body.classList.toggle("is-night", night > 0.6);
    }

    // Titles, the leg being flown, stop diamonds and the map.
    overlay.hero.style.opacity = String(i === 0 ? 1 - smooth(t0, 0.1, 0.2) : 0);
    overlay.hero.style.setProperty("--spread", String(smooth(t0, 0, 0.2)));
    overlay.blocks.forEach((b, k2) => {
      const o = k2 === i && ready ? windowed(t0, i === 0 ? 0.3 : 0.2, 0.72) : 0;
      b.style.opacity = String(o);
      b.style.setProperty("--in", String(o));
    });
    overlay.finale.style.opacity = String(i === N - 1 ? windowed(t0, 0.84, 1.2) : 0);
    const incoming = CHAPTERS[k]!;
    overlay.legTitle.textContent = incoming.nav[lang];
    overlay.legText.textContent = incoming.leg?.[lang] ?? "";
    overlay.leg.style.opacity = String(ready ? smooth(cover, 0.55, 0.9) : 0);
    overlay.waiting.style.opacity = String(ready ? 0 : 1);
    overlay.waiting.textContent = t("loading.next");
    overlay.dots.forEach((d, k2) => {
      d.classList.toggle("is-active", k2 === i);
      d.classList.toggle("is-loading", !chapters[k2]);
    });
    overlay.place.textContent = CHAPTERS[i]!.nav[lang];
    overlay.counter.textContent = `0${i + 1} / 0${N}`;
    overlay.hint.style.opacity = String(g < 0.06 ? 1 : 0);
    map.update(g);

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
