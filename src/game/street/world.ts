import * as THREE from "three";
import { STREET_MOMENTS } from "../../content/street";
import type { Look } from "../../content/npcs";
import { walkerLook, type Ambient } from "../ambient";
import { createCharacter, type GameCharacter } from "../characters";
import type { NavGrid } from "../nav";
import type { OcclusionField } from "../occlusion";
import { ActorTalk } from "../talkNatural/binding";
import { Pigeons } from "../pigeons";
import { floorY, poolAt, SEA_LEVEL, SHORE } from "../water";
import { PARK, ROADS, SIDEWALK, SQUARE } from "../world/layout";
import { rand, type Colliders } from "../world/util";
import type { MomentDraw } from "./schedule";
import { STREET_PHONE_CARD_BOTTOM, type StreetActor, type StreetCharacter, type StreetPair, type StreetWorld } from "./StreetLife";
import { CARRY_PROPS, disposeStreetGeometry, DROP_PROPS, GROUND_PROPS, makeFruit, makeStreetDog, makeStreetProp, WIND_PROPS } from "./props";
import type { StreetMoment } from "./types";

const up = new THREE.Vector3(0, 1, 0);
const glintMaterial = new THREE.MeshBasicMaterial({ color: "#fff2ae" });
const threadMaterial = new THREE.LineBasicMaterial({ color: "#746353" });
const inside = (x: number, z: number, bounds: typeof SQUARE) => x >= bounds.x1 && x <= bounds.x2 && z >= bounds.z1 && z <= bounds.z2;
const flatDistance = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a: THREE.Vector3, b: THREE.Vector3) => Math.atan2(b.x - a.x, b.z - a.z);

function sidewalkDistance(x: number, z: number) {
  return ROADS.reduce((best, r) => {
    const dx = r.x2 - r.x1, dz = r.z2 - r.z1;
    const t = THREE.MathUtils.clamp(((x - r.x1) * dx + (z - r.z1) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.min(best, Math.hypot(x - r.x1 - dx * t, z - r.z1 - dz * t) - r.w / 2);
  }, Infinity);
}

function seededLook(draw: Omit<MomentDraw, "bag">, playerTop: string | undefined): Look {
  const { moment, cast } = draw;
  const original = STREET_MOMENTS.find((item) => item.id === moment.after?.id) ?? moment;
  const originalCast = original.cast.find((member) => member.id === cast.id) ?? cast;
  const identity = original.kind === "regular" ? originalCast.name ?? originalCast.voice : originalCast.id;
  const seed = `${original.id}:${identity}`.split("").reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
  const r = rand(seed >>> 0);
  const look = walkerLook(cast.gender === "f", r);
  if (look.top === playerTop) look.top = look.top === "#b45d4c" ? "#577f9e" : "#b45d4c";
  if (cast.age === "kid" || cast.age === "teen") {
    look.height = (look.height ?? 1) * (cast.age === "kid" ? 0.72 : 0.87);
    look.build = (look.build ?? 1) * (cast.age === "kid" ? 0.81 : 0.94);
    look.acc = look.acc?.filter((item) => item !== "beard");
  }
  if (cast.age === "old") look.hair.color = r() > 0.5 ? "#dcd5ce" : "#a6a3a6";
  return look;
}

interface Placement {
  start: THREE.Vector3;
  stop: THREE.Vector3;
  object?: THREE.Vector3;
  dog?: THREE.Vector3;
}

export class TownStreet implements StreetWorld {
  private group = new THREE.Group();
  private departures = new Map<TownActor, number>();
  private projected = new THREE.Vector3();
  private sample = new THREE.Vector3();
  private cameraForward = new THREE.Vector3();
  private women = new WeakMap<StreetCharacter, boolean>();

  constructor(group: THREE.Group, private nav: NavGrid, private colliders: Colliders,
    private ambient: Ambient, private camera: THREE.Camera, private player: () => GameCharacter,
    private playerTop: () => string | undefined, private field: OcclusionField, private phoneCardAtTop: () => boolean) {
    group.add(this.group);
    for (const root of this.ambient.walkerRoots) {
      const walker = this.ambient.walkerFor(root);
      if (walker) this.women.set(walker.ch, walker.female);
    }
  }

  acting() { return new ActorTalk(); }
  learner() { return this.player(); }

  private nearWater(x: number, z: number) {
    return z - SHORE.top <= 40 || !!poolAt(x, z);
  }

  near(kind: StreetMoment["near"]) {
    const { x, z } = this.player().root.position;
    return !kind || (kind === "water" ? this.nearWater(x, z) : inside(x, z, SQUARE));
  }

  private dry(p: THREE.Vector3) {
    const pool = poolAt(p.x, p.z);
    return p.y >= (pool ? pool.y + 0.12 : SEA_LEVEL + 0.17);
  }

  private open(p: THREE.Vector3, clearance = 0.55) {
    const { x, z } = p;
    return this.dry(p) && sidewalkDistance(x, z) > 0.45 && this.nav.free(this.nav.idx(x, z))
      && !this.colliders.blocked(x, z, clearance, true)
      && !this.ambient.obstacles.some(([ox, oz]) => Math.hypot(x - ox, z - oz) < 1.1)
      && !this.ambient.rideBoxes.some((car) => Math.hypot(x - car.x, z - car.z) < Math.hypot(car.hl, car.hw) + clearance);
  }

  private walkingLine(a: THREE.Vector3, b: THREE.Vector3) {
    const n = Math.ceil(flatDistance(a, b) * 3);
    for (let i = 1; i < n; i++) {
      const p = this.sample.lerpVectors(a, b, i / n);
      p.y = floorY(p.x, p.z);
      if (!this.open(p, 0.32)) return false;
    }
    return true;
  }

  /** The camera's height-aware scenery field omits dynamic actors, including the pair's own walking colliders. */
  private clearSight(from: THREE.Vector3, to: THREE.Vector3) {
    const steps = Math.ceil(from.distanceTo(to) * 2 / this.field.cell);
    for (let i = 1; i <= steps; i++) {
      const p = this.sample.lerpVectors(from, to, i / steps);
      if (this.field.solidAt(p.x, p.y, p.z, 0.06)) return false;
    }
    return true;
  }

  private point(x: number, z: number) { return new THREE.Vector3(x, floorY(x, z), z); }

  /** Callers use the exact projection that the town will render, including its phone view offset. */
  private project(point: THREE.Vector3) {
    const v = this.projected.copy(point).project(this.camera);
    const depth = v.z >= -1 && v.z <= 1 && Number.isFinite(v.x) && Number.isFinite(v.y);
    const x = (v.x + 1) / 2, y = (1 - v.y) / 2;
    return { depth, x, y, onScreen: depth && x >= 0 && x <= 1 && y >= 0 && y <= 1 };
  }

  projection(point: THREE.Vector3) {
    this.camera.updateMatrixWorld();
    const { x, y, onScreen } = this.project(point);
    return { x, y, onScreen: onScreen && this.clearSight(this.camera.position, point) };
  }

  prepare(draw: Omit<MomentDraw, "bag">) {
    this.camera.updateMatrixWorld();
    const player = this.player(), p = player.root.position;
    const heading = player.root.rotation.y;
    const forward = this.camera.getWorldDirection(this.cameraForward);
    const yaw = Math.hypot(forward.x, forward.z) < 0.05 ? heading : Math.atan2(forward.x, forward.z);
    const { prop } = draw.cast;
    const drop = !!prop && DROP_PROPS.includes(prop) && draw.scriptName !== "familiar";
    const wind = !!prop && WIND_PROPS.includes(prop) && draw.scriptName !== "familiar";
    const lostDog = prop === "dog" && draw.moment.kind === "incident" && draw.scriptName !== "familiar";
    const ground = !!prop && GROUND_PROPS.includes(prop);
    const top = this.phoneCardAtTop() ? STREET_PHONE_CARD_BOTTOM : 1 / 3;
    const look = seededLook(draw, this.playerTop());
    const height = 1.75 * (look.height ?? 1);
    const playerHead = this.project(p.clone().addScaledVector(up, player.height * 1.03));
    const playerFeet = this.project(p);
    const playerCenter = p.clone().addScaledVector(up, player.height * 0.6);
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const playerHalfWidth = this.project(playerCenter.clone().addScaledVector(cameraRight, 0.4)).x - this.project(playerCenter).x;
    const eye = p.clone().addScaledVector(up, 1.45);
    const walkers = [...this.ambient.walkerRoots, ...Array.from(this.departures.keys(), (actor) => actor.person.root)];
    const inFront = (point: THREE.Vector3) => {
      const dx = point.x - p.x, dz = point.z - p.z;
      return dx * Math.sin(heading) + dz * Math.cos(heading) > 0.25
        && dx * Math.sin(yaw) + dz * Math.cos(yaw) > 0.25;
    };
    const openSpot = (point: THREE.Vector3, clearance: number) => this.open(point, clearance)
      && !walkers.some((root) => flatDistance(point, root.position) < clearance + 0.55);
    const inFrame = (point: THREE.Vector3, margin: number) => {
      const hit = this.project(point);
      if (!hit.onScreen || hit.x < margin || hit.x > 1 - margin || hit.y < top + 0.013 || hit.y > 0.89) return false;
      const left = Math.min(playerHead.x, playerFeet.x) - playerHalfWidth - margin / 2;
      const right = Math.max(playerHead.x, playerFeet.x) + playerHalfWidth + margin / 2;
      if (hit.y >= playerHead.y - 0.026 && hit.y <= playerFeet.y + 0.016 && hit.x > left && hit.x < right) return false;
      return this.clearSight(this.camera.position, point);
    };
    const fitsActor = (at: THREE.Vector3) => {
      const distance = flatDistance(p, at);
      if (distance < 4 || distance > 8 || !inFront(at) || !openSpot(at, ground ? 1.05 : 0.55)) return false;
      const head = at.clone().addScaledVector(up, height * 1.04);
      return inFrame(head, 0.08) && inFrame(at.clone().addScaledVector(up, 0.1), 0.08) && this.clearSight(eye, head);
    };
    const fitsThing = (at: THREE.Vector3, high: number) => inFront(at) && openSpot(at, 0.22) && inFrame(at.clone().addScaledVector(up, high), 0.055);

    let best: { place: Placement; score: number } | undefined;
    for (const distance of [4.25, 4.8, 5.5, 6.3, 7.1, 7.95]) {
      for (const side of [0.28, -0.28, 0.43, -0.43, 0.59, -0.59, 0.73, -0.73, 0.9, -0.9, 1.08, -1.08, 1.25, -1.25, 0.14, -0.14, 0]) {
        const angle = yaw + side;
        const at = this.point(p.x + Math.sin(angle) * distance, p.z + Math.cos(angle) * distance);
        if (!fitsActor(at)) continue;
        let place: Placement = { start: at, stop: at };

        if (drop) {
          const path = this.dropPath(at, p, fitsActor, (point) => fitsThing(point, 0.065));
          if (!path) continue;
          place = path;
        } else if (draw.moment.kind === "arc") {
          const stop = this.point(at.x - Math.sin(angle) * 1.55, at.z - Math.cos(angle) * 1.55);
          if (fitsActor(stop) && this.walkingLine(at, stop)) place.stop = stop;
        } else if (wind) {
          const options = [0, -0.65, 0.65].map((offset) =>
            this.point(p.x + Math.sin(angle + offset) * 1.65, p.z + Math.cos(angle + offset) * 1.65));
          place.object = options.find((point) => fitsThing(point, 0.09));
          if (!place.object) continue;
        } else if (lostDog) {
          const sideOfPlayer = Math.sign(side || 1);
          const options = [0.55, 0.85, 0.32].map((offset) =>
            this.point(p.x + Math.sin(yaw - sideOfPlayer * offset) * 5.7, p.z + Math.cos(yaw - sideOfPlayer * offset) * 5.7));
          place.dog = options.find((point) => fitsThing(point, 0.4));
          if (!place.dog) continue;
        } else if (ground) {
          const beside = bearing(at, p);
          place.object = [1, -1].map((offset) =>
            this.point(at.x + Math.cos(beside) * offset * 0.85, at.z - Math.sin(beside) * offset * 0.85))
            .find((point) => fitsThing(point, 0.45));
          if (!place.object) continue;
        }
        const preferred = sidewalkDistance(at.x, at.z) < SIDEWALK + 0.35 || inside(at.x, at.z, SQUARE) || inside(at.x, at.z, PARK) || at.z < SHORE.top + 13;
        const head = this.project(place.stop.clone().addScaledVector(up, height));
        const score = (preferred ? 1 : 0) - Math.abs(Math.abs(head.x - 0.5) - 0.23) * 5 - Math.abs(distance - 5.3) * 0.2;
        if (!best || score > best.score) best = { place, score };
      }
    }
    if (!best) return undefined;
    const place = best.place;
    return () => new TownActor(this, this.group, draw, place, player, look);
  }

  private dropPath(stop: THREE.Vector3, player: THREE.Vector3,
    fitsActor: (point: THREE.Vector3) => boolean, fitsThing: (point: THREE.Vector3) => boolean): Placement | undefined {
    const angle = bearing(player, stop);
    for (const length of [2.1, 1.45]) for (const offset of [1.35, -1.35, 1.85, -1.85, 0.6, -0.6]) {
      const heading = angle + offset;
      const start = this.point(stop.x - Math.sin(heading) * length, stop.z - Math.cos(heading) * length);
      if (!fitsActor(start) || !this.walkingLine(start, stop)) continue;
      const drop = start.clone().lerp(stop, 0.17);
      const object = this.point(drop.x, drop.z);
      const radial = flatDistance(player, object);
      if (radial < 4 || radial > 8 || !fitsThing(object)) continue;
      const middle = start.clone().lerp(stop, 0.5);
      if (!fitsActor(middle)) continue;
      return { start, stop, object };
    }
    return undefined;
  }

  pairs(radius: number, allowEdge = false) {
    this.camera.updateMatrixWorld();
    const matches = new Map<NonNullable<ReturnType<Ambient["walkerFor"]>>["chat"], StreetPair["members"][number][]>();
    for (const root of this.ambient.walkerRoots) {
      const walker = this.ambient.walkerFor(root);
      if (!walker?.chat) continue;
      const members = matches.get(walker.chat) ?? [];
      members.push({ person: walker.ch, gender: walker.female ? "f" : "m" });
      matches.set(walker.chat, members);
    }
    const pairs: { pair: StreetPair; distance: number }[] = [];
    const player = this.player().root.position;
    for (const [chat, members] of matches) {
      const [a, b] = members;
      if (!chat || !a || !b) continue;
      const first = a.person as GameCharacter, second = b.person as GameCharacter;
      const center = first.root.position.clone().lerp(second.root.position, 0.5);
      const distance = flatDistance(player, center);
      if (distance > radius || !this.visibleSpeaker(first, allowEdge) || !this.visibleSpeaker(second, allowEdge)) continue;
      const near = first.anim === "sit" ? "cafe" : inside(center.x, center.z, SQUARE) ? "square" : this.nearWater(center.x, center.z) ? "water" : undefined;
      pairs.push({ pair: { near, members: [a, b], hold: (seconds) => chat.hold(seconds) }, distance });
    }
    return pairs.sort((a, b) => a.distance - b.distance).map(({ pair }) => pair);
  }

  private head(actor: GameCharacter) {
    return actor.root.position.clone().addScaledVector(up, actor.height * (actor.anim === "sit" ? 0.71 : 0.96));
  }

  private visibleSpeaker(actor: GameCharacter, allowEdge: boolean) {
    const head = this.head(actor);
    const spot = this.project(head);
    return (allowEdge ? spot.depth : spot.onScreen) && this.clearSight(this.camera.position, head);
  }

  anchor(person: StreetCharacter, allowEdge = false) {
    this.camera.updateMatrixWorld();
    const head = this.head(person as GameCharacter);
    const spot = this.project(head);
    if (!spot.depth || !allowEdge && !spot.onScreen) return null;
    // Speech uses the head projection, including offscreen coordinates, to aim its pointer.
    if (allowEdge) return { x: Math.round(1000 * spot.x) / 10, y: Math.round(1000 * spot.y) / 10 };
    const raised = this.project(head.addScaledVector(up, 0.2));
    const marker = raised.depth ? raised : spot;
    const trim = (n: number) => Math.round(1000 * THREE.MathUtils.clamp(n, 0, 1)) / 10;
    return { x: trim(marker.x), y: trim(marker.y) };
  }

  gender(person: StreetCharacter) {
    const value = person.root.userData.streetGender;
    if (value === "m" || value === "f") return value;
    const female = this.women.get(person);
    return female === undefined ? undefined : female ? "f" : "m";
  }

  departureFor(actor: TownActor) { this.departures.set(actor, 30); }

  walkable(p: THREE.Vector3) { return this.open(p, 0.32); }

  departureHeading(from: THREE.Vector3, away: number, last = away) {
    const turn = last - away;
    const easesAway = Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) < Math.PI / 2;
    const headings = [away, away + 0.52, away - 0.52, away + 1.05, away - 1.05, away + 1.5, away - 1.5];
    if (easesAway && last !== away) headings.unshift(last);
    for (const distance of [1.05, 0.28]) for (const heading of headings) {
      const next = this.point(from.x + Math.sin(heading) * distance, from.z + Math.cos(heading) * distance);
      if (this.walkable(next) && this.walkingLine(from, next)) return heading;
    }
    return undefined;
  }

  tick(dt: number, outdoors = true) {
    for (const [actor, left] of this.departures) {
      if (outdoors) actor.tick(dt, false);
      const { position } = actor.person.root;
      const visible = outdoors && [0.12, 0.55, 1].some((height) =>
        this.projection(position.clone().addScaledVector(up, actor.person.height * height)).onScreen);
      if (left <= dt || !visible) {
        actor.dispose();
        this.departures.delete(actor);
      } else this.departures.set(actor, left - dt);
    }
  }

  dispose() {
    for (const actor of this.departures.keys()) actor.dispose();
    this.departures.clear();
    this.group.removeFromParent();
  }
}

class TownActor implements StreetActor {
  person: GameCharacter;
  private stage = new THREE.Group();
  private prop?: THREE.Group;
  private glint?: THREE.Mesh;
  private dog?: ReturnType<typeof makeStreetDog>;
  private pigeons?: Pigeons;
  private fruit: THREE.Mesh[] = [];
  private thread?: THREE.Line;
  private hand = new THREE.Vector3();
  private target = new THREE.Vector3();
  private age = 0;
  private answeredAt = Infinity;
  private gone = false;
  private drop: boolean;
  private wind: boolean;
  private shore: boolean;
  private lostDog: boolean;
  private gift: boolean;
  private twoHanded: boolean;

  constructor(private world: TownStreet, layer: THREE.Group, private draw: Omit<MomentDraw, "bag">,
    private place: Placement, private player: GameCharacter, look: Look) {
    const { cast, moment } = draw;
    const id = cast.prop;
    this.drop = !!id && DROP_PROPS.includes(id) && draw.scriptName !== "familiar";
    this.wind = !!id && WIND_PROPS.includes(id) && draw.scriptName !== "familiar";
    this.shore = moment.near === "water" && (id === "fishing_rod" || id === "fish_bucket" || id === "net");
    this.lostDog = !!place.dog;
    this.gift = moment.kind === "arc" && !!id && ["coffee_cup", "postcard", "pie", "bracelet", "fruit_cup"].includes(id);
    this.twoHanded = !!id && (CARRY_PROPS.includes(id) || id === "guitar" || id === "small_guitar");
    this.person = createCharacter(look);
    this.person.root.userData.streetGender = cast.gender;
    this.person.root.position.copy(place.start);
    this.person.root.rotation.y = this.shore ? Math.PI : this.drop ? bearing(place.start, place.stop) : bearing(place.start, this.player.root.position);
    this.person.noticeWithin = 10;
    this.person.attentive = true;
    this.person.fidgets = false;
    layer.add(this.stage, this.person.root);
    if (!id || (draw.scriptName === "familiar" && (DROP_PROPS.includes(id) || WIND_PROPS.includes(id)))) return;
    if (id === "dog") {
      const dog = this.dog = makeStreetDog(cast.propKind);
      dog.root.position.copy(place.dog ?? place.stop).add(new THREE.Vector3(this.lostDog ? 0 : -0.55, 0, 0));
      this.stage.add(dog.root, dog.lead);
      dog.lead.visible = !this.lostDog;
      return;
    }
    this.prop = makeStreetProp(id, cast.propKind);
    if (this.drop || this.wind || id === "fruit" || id === "kite" || GROUND_PROPS.includes(id)) {
      this.stage.add(this.prop);
      this.prop.position.copy(place.object ?? place.stop);
      if (this.drop) {
        this.glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), glintMaterial);
        this.glint.position.copy(this.prop.position).addScaledVector(up, 0.18);
        this.stage.add(this.glint);
      } else if (id === "fruit") {
        this.prop.rotation.z = 1.15;
        for (let i = 0; i < 6; i++) {
          const fruit = makeFruit(cast.propKind);
          this.fruit.push(fruit);
          this.stage.add(fruit);
        }
      } else if (id === "kite") {
        this.thread = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3)), threadMaterial);
        this.thread.frustumCulled = false;
        this.stage.add(this.thread);
      } else if (GROUND_PROPS.includes(id)) {
        this.prop.rotation.y = -this.person.root.rotation.y;
      }
    } else {
      this.person.rightHand.add(this.prop);
      this.prop.position.z = id === "guitar" || id === "small_guitar" ? 0.12 : 0.05;
      if (this.twoHanded) this.prop.position.x = -0.12;
      if (id === "coffee_cup" || id === "water_bottle" || id === "water_jug") this.prop.rotation.x = -0.14;
      if (id === "bread_bag") {
        this.pigeons = new Pigeons(place.stop.x, place.stop.z, 0.55, 1.6, 3);
        this.stage.add(this.pigeons.group);
        this.pigeons.update(0, player.root.position, 0);
      }
    }
    this.props(0);
  }

  private face(target: number, dt: number) {
    const rot = this.person.root.rotation;
    const turn = target - rot.y;
    rot.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 7);
  }

  tick(dt: number, waiting: boolean) {
    this.age += dt;
    const p = this.person.root.position;
    const player = this.player.root.position;
    const sinceAnswer = this.age - this.answeredAt;
    const heading = this.person.root.rotation.y;
    let moving = false;
    if (this.gone) {
      const away = this.world.departureHeading(p, bearing(player, p), heading);
      if (away !== undefined) {
        const distance = dt * (this.draw.cast.age === "old" ? 0.85 : 1.45);
        this.target.set(p.x + Math.sin(away) * distance, 0, p.z + Math.cos(away) * distance);
        this.target.y = floorY(this.target.x, this.target.z);
        moving = this.world.walkable(this.target);
        if (moving) p.copy(this.target);
        this.face(away, dt);
      }
    } else if (this.age < 1.85 && this.place.start !== this.place.stop && sinceAnswer < 0) {
      p.lerpVectors(this.place.start, this.place.stop, Math.min(1, this.age / 1.85));
      this.face(bearing(this.place.start, this.place.stop), dt);
      moving = true;
    } else if (this.drop && sinceAnswer < 0) {
      this.face(bearing(this.place.start, this.place.stop), dt);
    } else if (this.drop && sinceAnswer < 0.72 && this.place.object) {
      this.target.copy(p).lerp(this.place.object, Math.min(1, dt * 0.55));
      if (this.world.walkable(this.target)) p.copy(this.target);
      this.face(bearing(p, this.place.object), dt);
      moving = true;
    } else if (!waiting && sinceAnswer < 0 && this.age < 1.55 && (this.shore || this.draw.cast.prop === "bike" || this.draw.cast.prop === "easel")) {
      this.face(this.shore ? Math.PI : bearing(p, this.prop!.position), dt);
    } else {
      this.face(bearing(p, player), dt);
    }
    this.person.watch = this.gone || this.drop && sinceAnswer < 0 ? null : player;
    this.person.setAnim(moving ? "walk" : "idle");
    this.person.handsOccupied = this.twoHanded && !!this.prop?.visible;
    if (this.person.handsOccupied) this.person.holdMoment?.("type");
    this.person.update(dt);
    this.props(dt);
  }

  private props(dt: number) {
    const p = this.person.root.position;
    const object = this.place.object;
    const prop = this.prop;
    const sinceAnswer = this.age - this.answeredAt;
    const hand = this.thread || this.dog ? this.person.rightHand.getWorldPosition(this.hand) : this.hand;
    if (this.drop && prop && object && prop.parent === this.stage) {
      prop.position.y = object.y + 0.055 + Math.max(0, 1 - this.age * 2.4) ** 2 * 0.82;
      if (this.glint) {
        this.glint.visible = this.age > 0.38 && sinceAnswer < 0;
        this.glint.rotation.y = this.age * 2.8;
        this.glint.scale.setScalar(0.62 + Math.sin(this.age * 5) * 0.35);
      }
      if (sinceAnswer >= 0.52) {
        this.person.rightHand.add(prop);
        prop.position.set(0, 0, 0.04);
      }
    } else if (this.wind && prop && object) {
      const t = Math.min(1, this.age / 1.6);
      prop.position.lerpVectors(this.place.start, object, t);
      prop.position.y += 0.05 + Math.sin(Math.PI * t) * 1.25 + (1 - t) * 1.4;
      prop.rotation.set(t * Math.PI * 4, t * Math.PI * 2.3, Math.sin(t * Math.PI) * 1.15);
    }
    if (prop && (this.drop && sinceAnswer >= 1.3 || this.gift && sinceAnswer >= 0.45)) prop.visible = false;
    if (this.thread && prop) {
      prop.position.copy(p).add(new THREE.Vector3(1.5 + Math.sin(this.age * 1.4) * 0.65, 7.6 + Math.sin(this.age * 0.9) * 0.7, 1.2));
      prop.rotation.set(Math.sin(this.age * 1.5) * 0.21, -0.24, Math.sin(this.age * 1.15) * 0.29);
      const points = this.thread.geometry.attributes.position;
      points.setXYZ(0, hand.x, hand.y, hand.z);
      points.setXYZ(1, prop.position.x, prop.position.y - 0.4, prop.position.z);
      points.needsUpdate = true;
    }
    if (this.dog) {
      const seek = this.lostDog && sinceAnswer < 0 ? this.place.dog! : p;
      const heading = this.lostDog && sinceAnswer < 0 ? this.age * 0.7 : this.person.root.rotation.y;
      this.dog.update(dt, hand, seek.x, seek.z, heading, this.gone);
      const position = this.dog.root.position;
      position.y = floorY(position.x, position.z);
    }
    this.pigeons?.update(dt, this.player.root.position, this.player.moveSpeed ?? 0);
    this.fruit.forEach((fruit, i) => {
      const t = Math.min(1, this.age / (0.95 + i * 0.105));
      const spread = (0.38 + i * 0.135) * t * (2 - t);
      const x = this.place.stop.x + Math.cos(i * 2.4) * spread;
      const z = this.place.stop.z + Math.sin(i * 2.4) * spread;
      fruit.position.set(x, floorY(x, z) + 0.081 + Math.sin(t * Math.PI) * (0.2 + i * 0.025), z);
      fruit.rotation.z = t * (4 + i);
    });
  }

  answer(helped: boolean) { if (helped) this.answeredAt = this.age; }
  tooFar() { return flatDistance(this.person.root.position, this.player.root.position) > 12; }

  projection() {
    const head = this.person.root.position.clone().addScaledVector(up, this.person.height * 1.04);
    const object = this.dog?.root ?? this.prop;
    const bounds = object?.visible ? new THREE.Box3().setFromObject(object) : null;
    const person = this.world.projection(head);
    return {
      person: this.person.root.parent ? person : { ...person, onScreen: false },
      prop: bounds && !bounds.isEmpty() ? this.world.projection(bounds.getCenter(new THREE.Vector3())) : null,
    };
  }

  leave() {
    if (this.gone) return;
    this.gone = true;
    const { position, rotation } = this.person.root;
    const away = bearing(this.player.root.position, position);
    rotation.y = this.world.departureHeading(position, away) ?? away;
    this.person.watch = null;
    this.person.setAnim("walk");
    this.world.departureFor(this);
  }

  dispose() {
    if (this.prop) disposeStreetGeometry(this.prop);
    if (this.dog && !Array.isArray(this.dog.lead.material)) this.dog.lead.material.dispose();
    if (this.pigeons) {
      const bird = this.pigeons.group.children[0];
      if (bird instanceof THREE.InstancedMesh && !Array.isArray(bird.material)) bird.material.dispose();
    }
    disposeStreetGeometry(this.stage);
    this.person.root.removeFromParent();
    this.person.dispose?.();
  }
}
