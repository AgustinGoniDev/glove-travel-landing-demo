import * as THREE from "three";

/** Soft painted cloud puffs drawn on a canvas, one texture per shape. */
function cloudTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const x = size * (0.22 + rand() * 0.56);
    const y = size * (0.42 + (rand() - 0.5) * 0.28 + (x / size - 0.5) ** 2 * 0.4);
    const r = size * (0.08 + rand() * 0.16);
    const g = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.16 + rand() * 0.12})`);
    g.addColorStop(0.6, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A darker belly gives the puffs volume.
  const shade = ctx.createLinearGradient(0, size * 0.3, 0, size * 0.75);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(60,70,90,0.18)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Puff {
  sprite: THREE.Sprite;
  base: number;
  drift: number;
}

/** A layer of clouds along the flight path of one chapter. */
export class Clouds {
  readonly group = new THREE.Group();
  private readonly puffs: Puff[] = [];
  private static textures: THREE.CanvasTexture[] = [];

  constructor(points: THREE.Vector3[], tint: string, ceiling: number, count = 22) {
    if (!Clouds.textures.length) Clouds.textures = [11, 23, 57, 91].map(cloudTexture);
    for (let i = 0; i < count; i++) {
      const anchor = points[Math.floor(Math.random() * points.length)]!;
      const side = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 6);
      const material = new THREE.SpriteMaterial({
        map: Clouds.textures[i % Clouds.textures.length]!,
        color: new THREE.Color(tint),
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      const scale = 0.8 + Math.random() * 1.6;
      sprite.scale.set(scale * 1.9, scale, 1);
      sprite.position.set(anchor.x + side, ceiling * (0.35 + Math.random() * 0.5), anchor.z + (Math.random() - 0.5) * 8);
      this.group.add(sprite);
      this.puffs.push({ sprite, base: 0.35 + Math.random() * 0.35, drift: (Math.random() - 0.5) * 0.08 });
    }
  }

  update(camera: THREE.Camera, dt: number, visibility: number): void {
    for (const p of this.puffs) {
      p.sprite.position.x += p.drift * dt;
      const d = p.sprite.position.distanceTo(camera.position);
      // Fade the puffs that get too close, so the camera passes through them instead of hitting a card.
      const near = THREE.MathUtils.smoothstep(d, 1.2, 3.5);
      p.sprite.material.opacity = p.base * near * visibility;
    }
  }
}
