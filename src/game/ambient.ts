// Ambient life in Maple Harbor: townspeople strolling between places and a few cars on the
// east–west streets. Decorative only: they give way to the player (cars stop, people wait)
// and never start conversations.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createCharacter, type GameCharacter } from "./characters";
import { STYLED, IS_TOON, vertexColorMaterial, makeOutline, outlineColorFor } from "./style";
import { carGeometry as styledCarGeometry } from "./world/styled";
import type { NavGrid } from "./nav";
import type { HairStyle, Look } from "../content/npcs";
import { rand } from "./world/util";
import { CAR, TRAFFIC_LANES } from "./world/layout";

interface Walker {
  ch: GameCharacter; female: boolean;
  path: [number, number][] | null; wait: number; speed: number;
  heading: number; greetT: number; lastTarget: number;
}
interface Car {
  mesh: THREE.Mesh; lane: number; dir: 1 | -1; x: number; from: number; to: number;
  speed: number; max: number; hidden: number; grow: number;
}

const SKINS = ["#f2d3bd", "#f6dcc8", "#d9a47e", "#c68e63", "#a0694a", "#6e4630", "#4f3223"];
const HAIRS = ["#1f1a17", "#5a3a25", "#7b4a2a", "#d9b36a", "#a8472a", "#b8b3ac", "#e8e4dc"];
const TOPS = ["#e76f51", "#2a9d8f", "#e9c46a", "#457b9d", "#8e6bb0", "#f4a261", "#6a994e", "#bc4749", "#3d5a80", "#ee6c4d", "#f2cc8f", "#81b29a"];
const BOTTOMS = ["#264653", "#3d405b", "#2b2d42", "#5c4b3a", "#4a5a7a", "#6b705c", "#22223b"];
const F_HAIR: HairStyle[] = ["long", "bun", "ponytail", "curly", "bob", "wavy"];
const M_HAIR: HairStyle[] = ["short", "buzz", "side", "bald", "curly", "wavy"];
const CAR_COLORS = ["#e45b4f", "#4a7bb7", "#f2f2f2", "#3d3d46", "#6fbf73", "#f2c14e", "#9b5de5", "#b0b7bf"];

const LANES = TRAFFIC_LANES;

export class Ambient {
  group = new THREE.Group();
  private walkers: Walker[] = [];
  private cars: Car[] = [];
  private r = rand(4242);
  private pathBudget = 0;
  private pathCooldown = 0;

  constructor(private nav: NavGrid, private places: [number, number][], quality: "high" | "low") {
    const nw = quality === "high" ? 7 : 3, nc = quality === "high" ? 8 : 4;
    for (let i = 0; i < nw; i++) this.addWalker(i);
    const carMat = STYLED ? vertexColorMaterial("prop") : new THREE.MeshLambertMaterial({ vertexColors: true });
    for (let i = 0; i < nc; i++) {
      const lane = LANES[i % LANES.length];
      const color = CAR_COLORS[i % CAR_COLORS.length];
      const mesh = new THREE.Mesh(STYLED ? styledCarGeometry(color) : carGeometry(color), carMat);
      mesh.castShadow = true;
      if (IS_TOON) mesh.add(makeOutline(mesh, outlineColorFor(new THREE.Color(color)), 0.03));
      mesh.rotation.y = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      // the cars sharing a lane start spread out along it (never on top of each other)
      const k = Math.floor(i / LANES.length), inLane = Math.ceil((nc - (i % LANES.length)) / LANES.length);
      const t = ((i * 0.37) % 1 + this.r() * 0.15 + k / inLane) % 1;
      const x = lane.from + (lane.to - lane.from) * t;
      mesh.position.set(x, 0, lane.z);
      this.group.add(mesh);
      this.cars.push({ mesh, lane: lane.z, dir: lane.dir, x, from: lane.from, to: lane.to, speed: 6, max: 7 + this.r() * 2.5, hidden: 0, grow: 1 });
    }
  }

  private randomLook(female: boolean): Look {
    const pick = <T,>(a: T[]) => a[Math.floor(this.r() * a.length)];
    const acc: Look["acc"] = [];
    if (this.r() < 0.2) acc.push("glasses");
    if (this.r() < 0.12) acc.push(female ? "earrings" : "cap");
    if (!female && this.r() < 0.15) acc.push("beard");
    if (this.r() < 0.08) acc.push("sunglasses");
    return {
      skin: pick(SKINS), hair: { style: pick(female ? F_HAIR : M_HAIR), color: pick(HAIRS) },
      top: pick(TOPS), bottom: pick(BOTTOMS), skirt: female && this.r() < 0.3, acc,
      height: 0.92 + this.r() * 0.14, build: 0.92 + this.r() * 0.2,
    };
  }

  private addWalker(i: number) {
    const female = i % 2 === 0;
    const ch = createCharacter(this.randomLook(female));
    ch.root.traverse((o) => { o.castShadow = false; }); // passers-by skip the shadow pass (cheaper)
    const k = Math.floor(this.r() * this.places.length);
    const [x, z] = this.places[k];
    const cell = this.nav.nearestFree(x + (this.r() - 0.5) * 3, z + (this.r() - 0.5) * 3);
    const [cx, cz] = cell >= 0 ? this.nav.center(cell) : [x, z];
    ch.root.position.set(cx, 0, cz);
    this.group.add(ch.root);
    this.walkers.push({ ch, female, path: null, wait: 0.5 + this.r() * 4, speed: 1.7 + this.r() * 0.6, heading: this.r() * Math.PI * 2, greetT: 0, lastTarget: k });
  }

  /** Which walker (if any) owns this object (for clicks). */
  walkerFor(obj: THREE.Object3D | null): Walker | null {
    while (obj) { const w = this.walkers.find((x) => x.ch.root === obj); if (w) return w; obj = obj.parent; }
    return null;
  }
  get walkerRoots() { return this.walkers.map((w) => w.ch.root); }

  /** A passer-by stops, turns to the player and waves. */
  greet(w: Walker, px: number, pz: number) {
    w.path = null;
    w.wait = 3.5;
    w.heading = Math.atan2(px - w.ch.root.position.x, pz - w.ch.root.position.z);
    w.ch.root.rotation.y = w.heading;
    w.ch.setAnim("wave");
    setTimeout(() => { if (w.ch.anim === "wave") w.ch.setAnim("idle"); }, 1400);
    return { female: w.female };
  }

  update(dt: number, player: THREE.Vector3) {
    // at most one path search every 0.3 s (a long search takes a few milliseconds)
    this.pathCooldown -= dt;
    this.pathBudget = this.pathCooldown <= 0 ? 1 : 0;
    for (const w of this.walkers) this.updateWalker(w, dt, player);
    for (const c of this.cars) this.updateCar(c, dt, player);
  }

  private updateWalker(w: Walker, dt: number, player: THREE.Vector3) {
    const p = w.ch.root.position;
    w.greetT -= dt;
    if (w.wait > 0) {
      w.wait -= dt;
      if (w.ch.anim === "walk") w.ch.setAnim("idle");
      w.ch.update(dt);
      return;
    }
    if (!w.path || !w.path.length) {
      if (this.pathBudget <= 0) { w.ch.update(dt); return; }
      this.pathBudget--;
      this.pathCooldown = 0.3;
      // a new destination, not too close
      let k = 0, tries = 0;
      do { k = Math.floor(this.r() * this.places.length); tries++; }
      while (tries < 8 && (k === w.lastTarget || Math.hypot(this.places[k][0] - p.x, this.places[k][1] - p.z) < 25));
      w.lastTarget = k;
      const [tx, tz] = this.places[k];
      const path = this.nav.path(p.x, p.z, tx + (this.r() - 0.5) * 2, tz + (this.r() - 0.5) * 2);
      w.path = path ? path.slice(1) : null;
      if (!w.path) { w.wait = 2; return; }
    }
    // give way to the player
    const toP = new THREE.Vector3(player.x - p.x, 0, player.z - p.z);
    const dP = toP.length();
    const [tx, tz] = w.path[0];
    const dir = new THREE.Vector3(tx - p.x, 0, tz - p.z);
    const d = dir.length();
    if (d < 0.3) { w.path.shift(); if (!w.path.length) { w.path = null; w.wait = 2 + this.r() * 6; } w.ch.update(dt); return; }
    dir.divideScalar(d);
    if (dP < 1.4 && dir.dot(toP.clone().divideScalar(Math.max(dP, 1e-3))) > 0.2) {
      if (w.ch.anim === "walk") w.ch.setAnim("idle");
      if (w.greetT <= 0 && this.r() < 0.5) { w.greetT = 25; w.ch.setAnim("wave"); setTimeout(() => { if (w.ch.anim === "wave") w.ch.setAnim("idle"); }, 1400); }
      w.ch.update(dt);
      return;
    }
    const step = Math.min(d, w.speed * dt);
    p.x += dir.x * step; p.z += dir.z * step;
    const h = Math.atan2(dir.x, dir.z);
    let dh = h - w.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    w.heading += dh * Math.min(1, dt * 8);
    w.ch.root.rotation.y = w.heading;
    if (w.ch.anim !== "wave") w.ch.setAnim("walk");
    w.ch.update(dt);
  }

  private blockedAhead(c: Car, x: number, z: number): number {
    const ahead = (x - c.x) * c.dir;
    if (ahead <= 0 || ahead > 11 || Math.abs(z - c.lane) > 1.9) return Infinity;
    return ahead;
  }

  private updateCar(c: Car, dt: number, player: THREE.Vector3) {
    if (c.hidden > 0) {
      c.hidden -= dt;
      const sx = c.dir > 0 ? c.from : c.to;
      // don't pop in on top of the player or another car
      const clear = Math.hypot(player.x - sx, player.z - c.lane) > 12 && !this.cars.some((o) => o !== c && o.lane === c.lane && o.hidden <= 0 && Math.abs(o.x - sx) < 10);
      if (c.hidden <= 0 && clear) { c.x = sx; c.grow = 0; c.speed = c.max * 0.6; c.mesh.visible = true; }
      else if (c.hidden <= 0) c.hidden = 0.5;
      return;
    }
    // obstacles: the player, people and the car ahead
    let gap = this.blockedAhead(c, player.x, player.z);
    for (const w of this.walkers) gap = Math.min(gap, this.blockedAhead(c, w.ch.root.position.x, w.ch.root.position.z));
    for (const o of this.cars) if (o !== c && o.lane === c.lane && o.hidden <= 0) {
      const a = (o.x - c.x) * c.dir;
      if (a > 0 && a < 16) gap = Math.min(gap, a - CAR.length + 0.7);
    }
    const want = gap === Infinity ? c.max : Math.max(0, Math.min(c.max, (gap - 3.4) * 1.4));
    c.speed += Math.max(-9 * dt, Math.min(3 * dt, want - c.speed));
    c.x += c.speed * c.dir * dt;
    c.grow = Math.min(1, c.grow + dt * 1.6);
    const end = c.dir > 0 ? c.to : c.from;
    const toEnd = (end - c.x) * c.dir;
    const s = Math.min(c.grow, Math.max(0, Math.min(1, toEnd / 3)));
    c.mesh.scale.setScalar(Math.max(0.001, s));
    c.mesh.position.set(c.x, 0, c.lane);
    if (toEnd <= 0) { c.mesh.visible = false; c.hidden = 2 + this.r() * 6; }
  }

  /** Keep the player out of the cars. */
  resolvePlayer(p: THREE.Vector3, r: number) {
    for (const c of this.cars) {
      if (c.hidden > 0 || c.mesh.scale.x < 0.5) continue;
      const hx = 2.15, hz = 1.0;
      const cx = Math.max(c.x - hx, Math.min(p.x, c.x + hx)), cz = Math.max(c.lane - hz, Math.min(p.z, c.lane + hz));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
        else p.z = p.z < c.lane ? c.lane - hz - r : c.lane + hz + r;
      }
    }
  }
}

/** One low-poly car as a single vertex-coloured mesh (forward = +Z). */
function carGeometry(color: string): THREE.BufferGeometry {
  const parts: [THREE.BufferGeometry, string][] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => parts.push([new THREE.BoxGeometry(w, h, d).translate(x, y, z), c]);
  box(1.9, 0.7, 4.2, 0, 0.65, 0, color);
  box(1.7, 0.58, 2.2, 0, 1.28, -0.15, color);
  box(1.74, 0.42, 2.0, 0, 1.3, -0.15, "#9ccbe6");
  box(1.92, 0.14, 4.22, 0, 0.36, 0, "#3a3a40");
  for (const x of [-0.62, 0.62]) { box(0.36, 0.16, 0.06, x, 0.78, 2.11, "#fff6c8"); box(0.36, 0.14, 0.06, x, 0.8, -2.11, "#d83a3a"); }
  for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
    parts.push([new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10).rotateZ(Math.PI / 2).translate(x, 0.36, z), "#222222"]);
  }
  const geos = parts.map(([g, c]) => {
    const ng = g.toNonIndexed();
    const col = new THREE.Color(c);
    const n = ng.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    ng.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    ng.deleteAttribute("uv");
    return ng;
  });
  return mergeGeometries(geos, false)!;
}
