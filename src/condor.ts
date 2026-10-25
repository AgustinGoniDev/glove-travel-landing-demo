import * as THREE from "three";

/** An Andean condor silhouette: broad wings with the "fingered" primaries, gliding on thermals. */
function wingGeometry(side: 1 | -1): THREE.BufferGeometry {
  // Wing outline in the XZ plane (x along the span, z towards the tail), root at the origin.
  const outline: [number, number][] = [
    [0, -0.12], [0.35, -0.16], [0.7, -0.14], [0.92, -0.08],
    [1.02, -0.02], [0.93, 0.02], [1.0, 0.05], [0.9, 0.08], [0.95, 0.12], [0.84, 0.13], [0.86, 0.18], [0.74, 0.17],
    [0.6, 0.2], [0.35, 0.22], [0, 0.2],
  ];
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x * side, z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2);
  return geo;
}

export class Condor {
  readonly group = new THREE.Group();
  private readonly left: THREE.Mesh;
  private readonly right: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    private readonly center: THREE.Vector3,
    private readonly radius: number,
    private readonly speed: number,
    scale = 0.05,
  ) {
    this.material = new THREE.MeshBasicMaterial({ color: 0x15171a, side: THREE.DoubleSide, transparent: true });
    this.left = new THREE.Mesh(wingGeometry(-1), this.material);
    this.right = new THREE.Mesh(wingGeometry(1), this.material);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 6), this.material);
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.02;
    const collar = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe8e4dc }));
    collar.position.z = -0.2;
    this.group.add(this.left, this.right, body, collar);
    this.group.scale.setScalar(scale);
  }

  update(time: number, fog: THREE.Color, camera: THREE.Camera, visibility: number): void {
    const a = this.phase + time * this.speed;
    const x = this.center.x + Math.cos(a) * this.radius;
    const z = this.center.z + Math.sin(a) * this.radius;
    const y = this.center.y + Math.sin(a * 0.5) * 0.08;
    this.group.position.set(x, y, z);
    // The head (local -z) points along the circle; the bird banks into the turn.
    this.group.rotation.set(0, this.speed > 0 ? Math.PI - a : -a, 0);
    this.group.rotateZ(0.3 * Math.sign(this.speed));
    // Soaring: wings held in a shallow V that breathes a little.
    const flap = Math.sin(time * 1.6 + this.phase) * 0.05 + 0.1;
    this.left.rotation.z = -flap;
    this.right.rotation.z = flap;
    const d = this.group.position.distanceTo(camera.position);
    this.material.color.set(0x15171a).lerp(fog, THREE.MathUtils.clamp(d / 14, 0, 0.85));
    this.material.opacity = visibility;
    this.group.visible = visibility > 0.01;
  }
}
