import { Vector3, type PerspectiveCamera } from "three";
import type { ReactKind } from "../../content/reacts";
import { rideVoice, shoutVoice } from "../../content/voices";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import type { Ambient, TrafficCar, Walker } from "../ambient";
import type { GameCharacter } from "../characters";
import type { Ride, Rides } from "../rides/Rides";
import { carModelEntry } from "../world/carModels";
import type { Colliders } from "../world/util";
import { BAY, SHORE, floorY, waterY } from "../water";
import { ReactionSchedule, reactionDuration } from "./reacts";
import { speakTownLine } from "./townVoice";

interface Speaker {
  id: string;
  anchor(out: Vector3): Vector3 | null;
  ch?: GameCharacter;
  voice?: string;
  female?: boolean;
}

function person(ch: GameCharacter, id: string, female: boolean, voice: string): Speaker {
  return { id, voice, female, ch, anchor: (out) => {
    if (!ch.root.visible) return null;
    const head = ch.anim === "sit" ? (ch.seatY ?? 0.5) + ch.height * 0.55 : ch.height;
    return out.copy(ch.root.position).setY(ch.root.position.y + head + 0.45);
  } };
}

function walker(w: Walker) {
  return person(w.ch, `walker:${w.id}`, w.female, shoutVoice(w.female, w.tone ?? 0));
}

function driver(car: TrafficCar): Speaker {
  const height = car.model ? carModelEntry(car.model).collisionBox.height : car.front > 0 ? 2.5 : 1.6;
  const female = car.index % 2 === 0;
  return { id: `traffic:${car.index}`, female, voice: shoutVoice(female, car.index),
    anchor: (out) => car.hidden > 0 ? null : out.set(car.x, height + 0.45, car.lane - car.dir * 0.42) };
}

function owner(car: Ride, visibleOnly = false) {
  const seated = car.owners.find((o) => o.state === "in" && (!visibleOnly || o.ch.root.visible));
  return seated && person(seated.ch, `owner:${seated.who.id}`, seated.female, rideVoice(seated.who.id, seated.female));
}

function closest<T>(items: Iterable<T>, x: number, z: number, max: number, position: (item: T) => { x: number; z: number }): T | undefined {
  let result: T | undefined, best = max ** 2;
  for (const item of items) {
    const p = position(item), d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d <= best) { best = d; result = item; }
  }
  return result;
}

const now = () => performance.now() / 1000;

export class TownReactions {
  readonly schedule = new ReactionSchedule();
  private pending?: { speaker: Speaker; at: number; force: boolean };
  private active?: { speaker: Speaker; id: number; start: number; end: number; kind: ReactKind };
  private voice?: AbortController;
  private farSwim = false;
  private point = new Vector3();

  constructor(private blocked: () => boolean) {}

  private request(kind: ReactKind, speaker: Speaker | undefined, force = false) {
    if (!speaker || this.pending && !force) return false;
    if (kind !== "honk") return this.deliver(kind, speaker, force);
    const t = now();
    if (!this.schedule.canSay(kind, speaker.id, t, this.blocked(), force)) return false;
    this.pending = { speaker, at: t + 0.35, force };
    audio.sfx("horn");
    return true;
  }

  private deliver(kind: ReactKind, speaker: Speaker, force: boolean) {
    const start = now();
    if (!speaker.anchor(this.point)) return false;
    const line = this.schedule.say(kind, speaker.id, start, this.blocked(), force);
    if (!line) return false;
    const duration = reactionDuration(line.text);
    this.clearVoice();
    this.active = { speaker, id: line.id, start, end: start + duration, kind };
    useStore.getState().setHud({ reaction: line });
    const { ch, voice, female } = speaker;
    if (voice) {
      this.voice = new AbortController();
      speakTownLine(ch, voice, !!female, line.text, duration, this.voice.signal);
    }
    return true;
  }

  private clearVoice() { this.voice?.abort(); this.voice = undefined; }

  clear() {
    this.pending = undefined;
    this.clearVoice();
    this.clearBubble();
  }

  private clearBubble() {
    if (!this.active) return;
    this.active = undefined;
    useStore.getState().setHud({ reaction: null });
  }

  observe(conversation: boolean) {
    const t = now();
    this.schedule.conversation(conversation, t);
    if (!this.pending && !this.active && !this.voice) return;
    if (this.blocked()) { this.clear(); return; }
    if (this.active && t >= this.active.end) {
      if (audio.getState() !== "playing") this.clearVoice();
      this.clearBubble();
    }
    if (!this.active && this.voice && audio.getState() === "idle") this.clearVoice();
    if (this.pending && t >= this.pending.at) {
      const { speaker, force } = this.pending;
      this.pending = undefined;
      this.deliver("honk", speaker, force);
    }
  }

  position(id: number, camera: PerspectiveCamera, width: number, height: number) {
    const reaction = this.active;
    if (reaction?.id !== id || this.blocked()) return null;
    const p = reaction.speaker.anchor(this.point);
    if (!p || p.distanceToSquared(camera.position) > 35 ** 2) return null;
    const t = now();
    const opacity = Math.max(0, Math.min(1, (t - reaction.start) / 0.15, (reaction.end - t) / 0.25));
    p.applyMatrix4(camera.matrixWorldInverse);
    if (p.z >= 0 && (reaction.kind === "swim" || reaction.kind === "boat")) {
      // When heading out to sea, the person calling from the shore can be behind the camera.
      return { x: width / 2 + Math.sign(p.x) * width, y: height, opacity };
    }
    p.applyMatrix4(camera.projectionMatrix);
    if (p.z < -1 || p.z > 1) return null;
    return { x: (1 + p.x) * width / 2, y: (1 - p.y) * height / 2, opacity };
  }

  extend(id: number) { if (this.active?.id === id) this.active.end += 3; }

  honk(car: TrafficCar) { this.request("honk", driver(car)); }

  bump(w: Walker, look: Vector3) {
    if (!this.request("bump", walker(w))) return;
    w.chat?.hold(3);
    w.ch.watch = look;
  }

  private nearby(ambient: Ambient, x: number, z: number, range: number, shore = false) {
    const w = ambient.nearbyWalker(x, z, range, shore ? floorIsLand : undefined, shore);
    return w && walker(w);
  }

  landing(ambient: Ambient, car: Ride) {
    const seated = owner(car);
    if (seated) this.request("carJumpOwner", seated);
    else this.request("carJump", this.nearby(ambient, car.m.x, car.m.z, 14));
  }

  crash(ambient: Ambient, target: Ride | TrafficCar) {
    if ("dir" in target) this.request("crashDriver", driver(target));
    else this.request("crash", this.nearby(ambient, target.m.x, target.m.z, 18));
  }

  boat(ambient: Ambient, boat: Ride) {
    this.request("boat", this.nearby(ambient, boat.m.x, boat.m.z, 25, true));
  }

  swim(ambient: Ambient, p: Vector3, swimming: boolean) {
    if (!swimming) this.farSwim = false;
    // Call out before the bay's edge, while the shore and its speaker are still close.
    else if (!this.farSwim && p.z <= SHORE.limit + 0.3 * (BAY.z0 + 4 - SHORE.limit)) {
      this.farSwim = this.request("swim", this.nearby(ambient, p.x, p.z, 35, true));
    }
  }

  debug(kind: ReactKind, ambient: Ambient, rides: Rides, x: number, z: number, force: boolean) {
    let speaker: Speaker | undefined;
    if (kind === "honk" || kind === "crashDriver") {
      const car = closest(ambient.traffic.filter((car) => car.whole && car.hidden <= 0), x, z, Infinity, (car) => ({ x: car.x, z: car.lane }));
      speaker = car && driver(car);
    } else if (kind === "carJumpOwner") {
      const car = closest(rides.list.filter((car) => car.owners.some((o) => o.state === "in" && o.ch.root.visible)), x, z, Infinity, (car) => car.m);
      speaker = car && owner(car, true);
    } else {
      speaker = this.nearby(ambient, x, z, Infinity, kind === "swim");
    }
    return this.request(kind, speaker, force);
  }
}

function floorIsLand(p: Vector3) { return (waterY(p.x, p.z, 0) ?? -Infinity) <= floorY(p.x, p.z) + 0.05; }

export function reactionTestSpot(ambient: Ambient, colliders: Colliders, point: Vector3, kind: "honk" | "bump", excludeCar?: number) {
  if (kind === "honk") {
    const cars = ambient.traffic.filter((c) => c.whole && !c.hidden && !c.crashStop && !c.brakingForPlayer && c.speed >= 3 && c.index !== excludeCar);
    const car = closest(cars.filter((c) => {
      const x = c.x + c.dir * 12;
      return (c.dir > 0 ? c.to - x : x - c.from) > 3 && !colliders.blocked(x, c.lane, 0.5) &&
        !ambient.traffic.some((other) => other !== c && other.hidden <= 0 && other.lane === c.lane && (other.x - c.x) * c.dir > 0 && Math.abs(other.x - c.x) < 15);
    }), point.x, point.z, Infinity, (c) => ({ x: c.x, z: c.lane }));
    if (car) return { x: car.x + car.dir * 12, z: car.lane, heading: -car.dir * Math.PI / 2, carIndex: car.index };
  } else {
    const approach = (p: Vector3) => [0, Math.PI / 2, -Math.PI / 2, Math.PI].find((heading) =>
      [1.1, 1.5].every((d) => !colliders.blocked(p.x - Math.sin(heading) * d, p.z - Math.cos(heading) * d, 0.4)));
    const walker = ambient.nearbyWalker(point.x, point.z, Infinity, (p) => approach(p) !== undefined);
    if (!walker) return;
    const p = walker.ch.root.position;
    const heading = approach(p)!;
    walker.wait = 2;
    return { x: p.x - Math.sin(heading) * 1.5, z: p.z - Math.cos(heading) * 1.5, heading };
  }
}
