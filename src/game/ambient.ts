// Ambient life in Maple Harbor: townspeople strolling between places, people at the café tables and on benches,
// pairs chatting in the square and on the promenade, and a few cars on the east–west streets. Decorative only: they
// give way to the player (cars stop, people wait) and never start conversations.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createCharacter, type GameCharacter } from "./characters";
import { STYLED, IS_TOON, vertexColorMaterial, makeOutline, outlineColorFor } from "./style";
import { carGeometry as styledCarGeometry } from "./world/styled";
import { carGeometry } from "./world/car";
import type { NavGrid } from "./nav";
import type { HairStyle, Look } from "../content/npcs";
import { rand, type Colliders } from "./world/util";
import { CAR, TRAFFIC_LANES, CHAT_SPOTS } from "./world/layout";
import type { Seat } from "./world/town";
import { Dog } from "./dog";

/** A townsperson: one who strolls between places ("walk"), sits at a café table or on a bench ("sit"), or stands
 *  chatting with someone ("stand"). */
interface Walker {
  ch: GameCharacter; female: boolean; kind: "walk" | "sit" | "stand";
  path: [number, number][] | null; wait: number; speed: number;
  heading: number; greetT: number; lastTarget: number;
  chat?: Chatter;
  dog?: Dog;
}

/** Two people talking in turns: one talks for a couple of seconds while the other listens (eyes on them, a nod
 *  halfway), then the other; now and then a pause, when both may look round or sip their coffee. Outdoors (the café
 *  tables, the pairs in the square) and in the rooms (roomPeople.ts). */
export class Chatter {
  private who: 0 | 1;
  private t: number;
  private talk = 0;
  private nod = 0;
  constructor(private a: GameCharacter, private b: GameCharacter, private r: () => number) {
    this.who = r() < 0.5 ? 0 : 1;
    this.t = r() * 3;
  }
  /** A pause of `s` seconds (one of them is greeted by the player). */
  hold(s: number) { this.t = s; this.talk = 0; this.a.attentive = this.b.attentive = false; }
  update(dt: number) {
    const [speaker, listener] = this.who ? [this.b, this.a] : [this.a, this.b];
    if (this.talk > 0) {
      this.talk -= dt;
      this.nod -= dt;
      if (this.nod <= 0 && this.nod > -dt) listener.react?.("nod");
      if (this.talk <= 0) { this.who = this.who ? 0 : 1; this.t = 0.3 + this.r() * 0.9; }
      return;
    }
    this.a.attentive = this.b.attentive = false;
    this.t -= dt;
    if (this.t > 0) return;
    if (this.r() < 0.22) { this.t = 1.5 + this.r() * 3; return; }
    this.talk = 1.6 + this.r() * 2.6;
    this.nod = this.talk * (0.3 + this.r() * 0.4);
    speaker.talk(this.talk);
    speaker.attentive = listener.attentive = true;
  }
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
const _hand = new THREE.Vector3();

/** A passer-by's look, drawn from `r` (the town's random stream; the dev lineup passes its own). */
export function walkerLook(female: boolean, r: () => number): Look {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const acc: Look["acc"] = [];
  if (r() < 0.2) acc.push("glasses");
  if (r() < 0.12) acc.push(female ? "earrings" : "cap");
  if (!female && r() < 0.15) acc.push("beard");
  if (r() < 0.08) acc.push("sunglasses");
  return {
    skin: pick(SKINS), hair: { style: pick(female ? F_HAIR : M_HAIR), color: pick(HAIRS) },
    top: pick(TOPS), bottom: pick(BOTTOMS), skirt: female && r() < 0.3, acc,
    height: 0.92 + r() * 0.14, build: 0.92 + r() * 0.2,
  };
}

/** What a passer-by has with them (their own random stream, so the looks above stay as they were): a shopping bag or
 *  a coffee to go now and then, a phone in the pocket for every other one. */
export function walkerThings(look: Look, r: () => number): Look {
  const x = r();
  return { ...look, carry: x < 0.28 ? "bag" : x < 0.45 ? "coffee" : undefined, phone: r() < 0.55 };
}

export class Ambient {
  group = new THREE.Group();
  private walkers: Walker[] = [];
  private chats: Chatter[] = [];
  private cars: Car[] = [];
  private r = rand(4242);
  /** Things in the passers-by's hands, and the people sitting and standing: streams of their own. */
  private rThings = rand(5150);
  private rPeople = rand(6060);
  private pathBudget = 0;
  private pathCooldown = 0;

  constructor(private nav: NavGrid, private places: [number, number][], quality: "high" | "low", seats: Seat[] = [], colliders?: Colliders) {
    const high = quality === "high";
    // each person is a single draw call (characters/Character.ts), so the town can hold a crowd
    const nw = high ? 12 : 6, nc = high ? 8 : 4;
    for (let i = 0; i < nw; i++) this.addWalker(i);
    // two of them (one in „Paprasta“) walk a dog, on the lead in the hand without a bag
    this.walkers.filter((w) => w.ch.root.userData.carry !== "bag").slice(0, high ? 2 : 1).forEach((w, i) => {
      const dog = new Dog(i * 2 + 1, 0.9 + (i % 2) * 0.25);
      dog.root.position.copy(w.ch.root.position).add(new THREE.Vector3(0.6, 0, 0.3));
      this.group.add(dog.root, dog.lead);
      w.dog = dog;
    });
    this.seatPeople(seats, high);
    this.standPairs(high ? CHAT_SPOTS.length : 1, colliders);
    const carMat = STYLED ? vertexColorMaterial("prop") : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
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

  /** A townsperson's character (no shadow of their own: cheaper; the blob under the feet in „Paprasta“). */
  private person(look: Look, female: boolean, kind: Walker["kind"]): Walker {
    const ch = createCharacter(look);
    ch.root.traverse((o) => { o.castShadow = false; });
    this.group.add(ch.root);
    const w: Walker = { ch, female, kind, path: null, wait: 0.5 + this.r() * 4, speed: 1.7 + this.r() * 0.6, heading: 0, greetT: 0, lastTarget: -1 };
    this.walkers.push(w);
    return w;
  }

  private addWalker(i: number) {
    const female = i % 2 === 0;
    const look = walkerThings(walkerLook(female, this.r), this.rThings);
    const w = this.person(look, female, "walk");
    w.ch.root.userData.carry = look.carry;
    const k = Math.floor(this.r() * this.places.length);
    const [x, z] = this.places[k];
    const cell = this.nav.nearestFree(x + (this.r() - 0.5) * 3, z + (this.r() - 0.5) * 3);
    const [cx, cz] = cell >= 0 ? this.nav.center(cell) : [x, z];
    w.ch.root.position.set(cx, 0, cz);
    w.heading = this.r() * Math.PI * 2;
    w.lastTarget = k;
  }

  /** People at the café tables (two at some, chatting over their cups, one alone at others) and on the benches (a
   *  reader with the paper, someone resting by the fountain). */
  private seatPeople(seats: Seat[], high: boolean) {
    const r = this.rPeople;
    const sit = (s: Seat, carry?: Look["carry"]) => {
      const female = r() < 0.5;
      const w = this.person({ ...walkerLook(female, r), carry }, female, "sit");
      w.ch.root.position.set(s.x, 0, s.z);
      w.ch.root.rotation.y = s.rot;
      w.ch.seatY = s.y;
      w.ch.setAnim("sit");
      return w;
    };
    const tables = new Map<string, Seat[]>();
    for (const s of seats) if (s.table) { const k = s.table.join(); tables.set(k, [...(tables.get(k) ?? []), s]); }
    [...tables.values()].forEach((pair, i) => {
      // high: two at the first table of each place, one at the second; low: the first table only
      const n = high ? (i % 2 === 0 ? 2 : 1) : i === 0 ? 2 : 0;
      const people = pair.slice(0, n).map((s) => sit(s, "cup"));
      if (people.length === 2) this.chat(people[0], people[1]);
    });
    const benches = seats.filter((s) => !s.table);
    const reader = benches.find((s) => Math.abs(s.x + 48.45) < 0.2 && Math.abs(s.z + 17.5) < 0.2);
    if (reader) sit(reader, "paper");
    const resting = benches.find((s) => Math.abs(s.x - 30) < 0.2 && Math.abs(s.z + 22.6) < 0.2);
    if (high && resting) sit(resting);
  }

  /** Pairs standing and chatting (layout CHAT_SPOTS): walkers' paths and the player go round them. */
  private standPairs(n: number, colliders?: Colliders) {
    const r = this.rPeople;
    for (const [ax, az, bx, bz] of CHAT_SPOTS.slice(0, n)) {
      const two = [[ax, az, bx, bz], [bx, bz, ax, az]].map(([x, z, ox, oz]) => {
        const female = r() < 0.5;
        const w = this.person(walkerThings(walkerLook(female, r), r), female, "stand");
        w.ch.root.position.set(x, 0, z);
        // facing the other one
        w.ch.root.rotation.y = w.heading = Math.atan2(ox - x, oz - z);
        colliders?.addCircle(x, z, 0.4);
        // no paths through them (a cell around each)
        if (this.nav.blocked) for (const [dx, dz] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
          const c = this.nav.idx(x + dx, z + dz);
          if (c >= 0) this.nav.blocked[c] = 1;
        }
        return w;
      });
      this.chat(two[0], two[1]);
    }
  }

  private chat(a: Walker, b: Walker) {
    const c = new Chatter(a.ch, b.ch, this.rPeople);
    a.chat = b.chat = c;
    this.chats.push(c);
  }

  /** Which walker (if any) owns this object (for clicks). */
  walkerFor(obj: THREE.Object3D | null): Walker | null {
    while (obj) { const w = this.walkers.find((x) => x.ch.root === obj); if (w) return w; obj = obj.parent; }
    return null;
  }
  get walkerRoots() { return this.walkers.map((w) => w.ch.root); }

  /** A townsperson answers the player: a passer-by stops, turns and waves; someone chatting waves (and their friend
   *  waits); someone sitting nods. */
  greet(w: Walker, px: number, pz: number) {
    w.chat?.hold(4);
    if (w.kind === "sit") { w.ch.react?.("nod"); return { female: w.female }; }
    if (w.kind === "walk") {
      w.path = null;
      w.wait = 3.5;
      w.heading = Math.atan2(px - w.ch.root.position.x, pz - w.ch.root.position.z);
      w.ch.root.rotation.y = w.heading;
    }
    w.ch.setAnim("wave");
    setTimeout(() => { if (w.ch.anim === "wave") w.ch.setAnim("idle"); }, 1400);
    return { female: w.female };
  }

  update(dt: number, player: THREE.Vector3) {
    // at most one path search every 0.3 s (a long search takes a few milliseconds)
    this.pathCooldown -= dt;
    this.pathBudget = this.pathCooldown <= 0 ? 1 : 0;
    for (const c of this.chats) c.update(dt);
    for (const w of this.walkers) {
      if (w.kind === "walk") this.updateWalker(w, dt, player);
      else w.ch.update(dt);
      if (w.dog) {
        const p = w.ch.root.position;
        w.dog.update(dt, w.ch.root.localToWorld(_hand.set(-0.38, 0.74, 0.08)), p.x, p.z, w.heading, w.ch.anim === "walk");
      }
    }
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
    for (const w of this.walkers) if (w.kind === "walk") gap = Math.min(gap, this.blockedAhead(c, w.ch.root.position.x, w.ch.root.position.z));
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

  /** How loud the traffic is where the player stands (0–1): the cars in sight, louder the nearer and faster. */
  carNoise(px: number, pz: number) {
    let n = 0;
    for (const c of this.cars) if (c.hidden <= 0 && this.group.visible) n += Math.max(0, 1 - Math.hypot(c.x - px, c.lane - pz) / 28) * (0.4 + 0.6 * Math.min(1, c.speed / 7));
    return Math.min(1, n);
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

