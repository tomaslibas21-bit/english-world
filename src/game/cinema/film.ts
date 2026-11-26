import * as THREE from "three";
import { KEEPER_NPC, NPCS } from "../../content/npcs";
import { Character } from "../characters/Character";
import { addGull } from "../world/gull";
import { addIslandTower, addLighthouse } from "../world/lighthouseTower";
import { boxGeo, colourMerge } from "../world/util";

type Parts = [THREE.BufferGeometry, THREE.ColorRepresentation][];
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const ramp = (t: number, from: number, to: number) => THREE.MathUtils.smoothstep(t, from, to);
const arc = (u: number) => 4 * u * (1 - u);
const crateXs = [-2.4, 0.4, 3.2];

function wharf(): Parts {
  const parts: Parts = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    parts.push([boxGeo(w, h, d, x, y, z), color]);
  box(180, 0.1, 100, 0, -0.84, -22, "#55a9ae");
  for (let i = -24; i <= 24; i++) {
    box(0.58, 0.19, 2.8, i * 0.6, -0.095, 0, i % 3 ? "#cf9764" : "#b98259");
    if (i % 4 === 0) box(0.18, 1.4, 0.22, i * 0.6, -0.65, 1.18, "#6c5347");
  }
  for (let i = 0; i < 44; i++) {
    box(0.35 + i % 5 * 0.24, 0.01, 0.085, (i * 11 % 41) - 20, -0.775, -2 - i * 7 % 13, "#bcdfce");
  }
  for (let i = -10; i <= 10; i++) {
    // Distant islands and spruces break the horizon into overlapping silhouettes.
    const x = i * 3.7;
    parts.push([new THREE.IcosahedronGeometry(1).scale(3.9, 0.7 + Math.cos(i) * 0.3, 1.9)
      .translate(x, -0.72, -27), "#799591"]);
    for (const j of [-1, 0, 1]) parts.push([new THREE.ConeGeometry(0.45, 1.35 + 0.4 * Math.cos(i + j), 5)
      .translate(x + j * 0.63, 0.26, -27), "#4e7970"]);
  }
  for (let i = -3; i <= 3; i++) {
    box(0.16, 0.58, 0.18, i * 3.5, 0.18, -1.23, "#895e44");
    box(0.19, 0.09, 0.21, i * 3.5, 0.43, -1.23, "#ecd8b2");
  }
  const tower = (g: THREE.BufferGeometry, color: string) => parts.push([g.scale(0.19, 0.19, 0.19).translate(2.4, -0.82, -15), color]);
  addIslandTower(tower, tower, { x: 0, z: 0 }).dispose();
  addLighthouse(tower, { x: 0, z: 0 });
  parts.push([new THREE.DodecahedronGeometry(1).scale(2.4, 0.66, 1.2).translate(2.4, -0.82, -15), "#718974"]);
  for (const [x, z] of [[-2.7, -10], [8.1, -8]]) {
    parts.push([new THREE.SphereGeometry(1, 8, 4).scale(1.42, 0.34, 0.53).translate(x, -0.65, z), "#b74b3d"]);
    box(0.055, 2.3, 0.055, x, 0.54, z, "#8a6951");
    const sail = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([
      x + 0.10, -0.27, z, x + 1.07, -0.27, z, x + 0.10, 1.61, z,
    ], 3));
    parts.push([sail, "#fff0c1"]);
  }
  return parts;
}

function fishCrates(): Parts {
  const parts: Parts = [];
  for (const x of crateXs) {
    parts.push([boxGeo(0.82, 0.55, 0.82, x, 0.275, 0), "#a85839"]);
    for (const y of [0.08, 0.46]) parts.push([boxGeo(0.88, 0.09, 0.88, x, y, 0), "#d39863"]);
    parts.push([boxGeo(0.66, 0.07, 0.035, 0, 0, 0).rotateZ(0.45).translate(x, 0.27, 0.415), "#f1c58a"]);
  }
  return parts;
}

function sandwichHalf(): Parts {
  // Two cut triangles fit together until the last shot.
  const face = new THREE.Shape();
  face.moveTo(-0.22, -0.21); face.lineTo(0.22, -0.21); face.lineTo(-0.22, 0.21); face.closePath();
  return ([[0, 0.084, "#e5a552"], [0.082, 0.040, "#69a956"], [0.121, 0.040, "#d95240"],
    [0.160, 0.082, "#ffd688"]] as const).map(([y, depth, color]) => [
    new THREE.ExtrudeGeometry(face, { depth, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, y, 0), color,
  ]);
}

export class HarborFilm {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-4, 4, 2.25, -2.25, 0.1, 120);
  private keeper = Character.far(NPCS[KEEPER_NPC].look, 0.54);
  private material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private geometry: THREE.BufferGeometry[] = [];
  private mesh(parts: Parts) {
    const geo = colourMerge(parts);
    this.geometry.push(geo);
    return new THREE.Mesh(geo, this.material);
  }
  private crates = this.mesh(fishCrates());
  private bird = new THREE.Group();
  private flying = new THREE.Group();
  private wings: THREE.Mesh[];
  private perched: THREE.Mesh;
  private lunch = new THREE.Group();
  private half = this.mesh(sandwichHalf());
  private otherHalf = new THREE.Mesh(this.half.geometry, this.material);
  private hand = new THREE.Vector3();
  private bill = new THREE.Vector3();
  private clear = new THREE.Color();

  constructor() {
    const body: Parts = [], folded: Parts = [], wings: [Parts, Parts] = [[], []];
    addGull(body, 0, 0, 0, 0, true, wings);
    addGull(folded, 0, 0, 0, 0, false);
    for (const parts of [body, folded]) for (const side of [-1, 1]) {
      parts.push([new THREE.SphereGeometry(0.033, 6, 4).translate(side * 0.115, 0.3, 0.25), "#293638"]);
    }
    this.wings = wings.map(parts => this.mesh(parts));
    this.flying.add(this.mesh(body), ...this.wings);
    this.perched = this.mesh(folded);
    this.bird.add(this.flying, this.perched);
    this.otherHalf.rotation.y = Math.PI;
    this.lunch.add(this.half, this.otherHalf);
    this.keeper.fidgets = false;
    this.scene.background = new THREE.Color("#ffdfb3");
    this.scene.fog = new THREE.FogExp2("#f4d6a3", 0.024);
    const sun = new THREE.DirectionalLight("#fff3da", 1.5);
    sun.position.set(-4, 8, 5);
    this.scene.add(new THREE.HemisphereLight("#fff7e8", "#a19183", 1.3), sun,
      this.mesh(wharf()), this.crates, this.keeper.root, this.bird, this.lunch);
  }

  pose(t: number, shot: number, dt: number) {
    // The camera cuts on action. Each shot is staged across the screen so both silhouettes
    // and the sandwich read even in the small landscape rectangle on an upright phone.
    const k = this.keeper;
    let kx = -1.0, ky = 0, yaw = 1.1, lean = 0, run = false;
    let bx = 2.0, by = 1.6, heading = -1.2, roll = 0, flight = true;
    let cameraX = 0.3, width = 6.6, toss = 0;
    const stolen = t >= 17.6, caught = t >= 55.3;
    this.crates.visible = shot === 3;
    if (shot <= 1) {
      const peek = ramp(t, 7, 13);
      bx = 2.3 - peek * 0.75; by = 1.55 + 0.26 * Math.cos(t * 2.1);
      yaw = 0.3 + 0.45 * peek;
    } else if (shot === 2) {
      const dive = ramp(t, 14.5, 17.6), flee = ramp(t, 17.6, 23);
      bx = mix(2.15, -0.48, dive) + 5 * flee;
      by = mix(2.5, 1.1, dive) + 1.1 * arc(flee) + 0.5 * flee;
      heading = mix(-1.35, 1.35, ramp(t, 17.4, 18));
      kx += 3.4 * ramp(t, 19, 23); run = t > 19;
      lean = -0.32 * arc(ramp(t, 17.6, 19));
      cameraX = (bx + kx) / 2;
    } else if (shot === 3) {
      const u = clamp((t - 23) / 13, 0, 1);
      kx = mix(-5.2, 6, u); bx = kx + 1.85; heading = 1.35;
      by = 1.45 + 0.3 * Math.sin(u * Math.PI * 6);
      for (const x of crateXs) ky += arc(clamp((kx - x + 0.98) / 1.96, 0, 1)) * 1.2;
      run = true; cameraX = kx + 0.8; width = 7;
    } else if (shot === 4) {
      const out = ramp(t, 36, 40), back = ramp(t, 40, 47);
      bx = -0.5 + 3.8 * out - 6.4 * back;
      by = 1.4 + 1.25 * arc(back); heading = mix(1.3, -1.3, ramp(t, 39, 40));
      kx = -2.0 + 5.8 * ramp(t, 36, 43) - 1.9 * ramp(t, 44, 47);
      lean = -0.8 * arc(ramp(t, 39.5, 45)); run = t < 40 || t > 44;
      yaw = mix(1.28, -1.28, ramp(t, 43, 45));
      cameraX = (bx + kx) / 2; width = 8.1;
    } else if (shot === 5) {
      const rush = ramp(t, 47, 52), dive = ramp(t, 52, 55.3);
      bx = 1.5 - 2.4 * rush + 3.3 * ramp(t, 52, 58);
      by = 1.9 + 0.45 * Math.sin((t - 47) * 1.6);
      heading = mix(-1.3, 1, ramp(t, 51, 52.5));
      kx = 3 - 2.1 * rush - 1.15 * dive;
      yaw = -1.13; lean = 0.9 * arc(dive); ky = 0.48 * arc(dive);
      run = t < 55.3; toss = dive; cameraX = 0.7;
    } else {
      const landing = ramp(t, 59, 63), hop = ramp(t, 64, 66.5);
      kx = -0.5; yaw = mix(0.05, 1.03, hop);
      bx = mix(2.2, kx, landing) + 1.15 * hop;
      by = mix(2.6, k.height, landing) - k.height * hop + 0.45 * arc(hop);
      heading = -0.95; flight = t < 62.5 || (t > 64 && t < 66.4);
      roll = 0.17 * arc(landing); width = 4.8; cameraX = 0.1;
    }
    k.setAnim(run ? "run" : "idle");
    k.moveSpeed = run ? 5.8 : 0;
    k.root.position.set(kx, ky, 0.19);
    k.root.rotation.set(0, yaw, lean, "ZXY");
    k.update(Math.min(0.12, dt));
    if (shot === 2) k.headJoint.rotation.y += 0.72 * arc(ramp(t, 17.6, 19));
    if (shot === 6) k.headJoint.rotation.x -= 0.30 * arc(ramp(t, 61, 66));
    if (!run || !stolen) {
      k.joint("armR").rotation.x = -0.86;
      k.joint("foreR").rotation.x = -0.8;
    }
    k.rightHand.getWorldPosition(this.hand);
    this.bird.position.set(bx, by, 0.04);
    this.bird.rotation.set(flight ? -0.09 : 0, heading, roll + (flight ? Math.sin(t * 9) * 0.16 : 0), "YXZ");
    this.flying.visible = flight; this.perched.visible = !flight;
    const flap = Math.sin(t * (shot === 3 ? 12 : 7)) * 0.51;
    this.wings[0].rotation.z = -flap; this.wings[1].rotation.z = flap;
    this.bird.localToWorld(this.bill.set(0, 0.08, 0.46));
    this.lunch.position.copy(stolen && !caught ? this.bill : this.hand);
    if (shot === 5 && t >= 52 && !caught) {
      this.lunch.position.lerpVectors(this.bill.set(-0.48, 1.98, 0.12), this.hand, toss);
      this.lunch.position.y += 1.15 * arc(toss);
    }
    this.lunch.rotation.z = toss * Math.PI * 2;
    const split = ramp(t, 67, 69);
    this.otherHalf.position.copy(this.bill).sub(this.lunch.position).multiplyScalar(split);
    this.camera.left = -width / 2; this.camera.right = width / 2;
    this.camera.top = width * 9 / 32; this.camera.bottom = -this.camera.top;
    this.camera.position.set(cameraX, 1.99, 10);
    this.camera.lookAt(cameraX, 1.35, 0); this.camera.updateProjectionMatrix();
  }

  draw(renderer: THREE.WebGLRenderer, w: number, h: number) {
    const width = Math.max(1, Math.floor(Math.min(w, (h - 92) * 16 / 9)));
    const height = Math.max(1, Math.round(width * 9 / 16));
    const x = Math.floor((w - width) / 2), y = Math.floor((h - height + 52) / 2);
    renderer.getClearColor(this.clear);
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x141525, 1);
    renderer.clear();
    renderer.setViewport(x, y, width, height);
    renderer.setScissor(x, y, width, height); renderer.setScissorTest(true);
    try { renderer.render(this.scene, this.camera); }
    finally {
      renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h);
      renderer.setClearColor(this.clear, alpha);
    }
  }

  dispose() {
    this.keeper.dispose();
    this.geometry.forEach(g => g.dispose());
    this.material.dispose();
    this.scene.clear();
  }
}
