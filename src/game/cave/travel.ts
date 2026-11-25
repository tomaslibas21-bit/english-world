import { COVE_DOORS, COVE_REACH, PREFERRED_COVE_DOOR, inSlateCove, type CoveDoor } from "../world/slateCovePlan";
import type { Interior } from "../world/interiors";
import type { CaveSave } from "./progress";
import type { CaveZone } from "./zone";

type Point = { x: number; z: number };
type Spawn = Point & { rot: number };
type Exits = NonNullable<Interior["wild"]>["exits"];
type CaveTrip = { door: CoveDoor; saved?: Spawn; instant: boolean; crossing: boolean };

interface CaveArrival {
  ready(): boolean;
  position(): Point | undefined;
  fade(enter: () => void): void;
  save(): CaveSave | undefined;
  mount(zone: CaveZone, spawn: Spawn): boolean;
  entered?(): void;
}

export function coveDoorPush(p: Point, velocity: Point & { y: number }) {
  if (!inSlateCove(p.x, p.z) || velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2 <= 0.3) return;
  const speed = Math.hypot(velocity.x, velocity.z);
  return coveDoorNear(p, velocity.x / speed, velocity.z / speed);
}

export function caveExitNear(exits: Exits, p: Point, velocity?: Point) {
  for (let i = 0; i < exits.length; i++) {
    const exit = exits[i];
    if (Math.hypot(p.x - exit.x, p.z - exit.z) < (velocity ? exit.push : exit.reach) &&
        (!velocity || velocity.x * exit.dir[0] + velocity.z * exit.dir[1] > 0.5)) return exit;
  }
}

export function caveExitSpawn(exits: Exits, id: string = PREFERRED_COVE_DOOR) {
  const exit = exits.find((exit) => exit.id === id) ?? exits.find((exit) => exit.id === PREFERRED_COVE_DOOR);
  return exit && COVE_DOORS[exit.id as CoveDoor]?.out;
}

export function coveDoorClick(p: Point) {
  if (!inSlateCove(p.x, p.z)) return;
  for (const door of doors) {
    if (Math.hypot(p.x - door.x, p.z - door.z) < 2) {
      return { id: door.id, x: door.x + door.dx * 1.5, z: door.z + door.dz * 1.5 };
    }
  }
}

export function coveDoorNear(p: Point, fx: number, fz: number): CoveDoor | undefined {
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    const dx = p.x - door.x, dz = p.z - door.z;
    if (dx * door.dx + dz * door.dz < -0.2 || Math.hypot(dx, dz) >= COVE_REACH) continue;
    if (fx * door.dx + fz * door.dz < -0.46) return door.id;
  }
}
const doors = [COVE_DOORS.main, COVE_DOORS.cleft] as const;

/** A loader may finish after another transition has superseded the original request. */
export class CaveTravel {
  private serial = 0;
  pending = false;
  start() {
    this.pending = true;
    return ++this.serial;
  }
  current(ticket: number) { return this.pending && this.serial === ticket; }
  finish(ticket: number) {
    if (!this.current(ticket)) return false;
    this.pending = false;
    return true;
  }
  arrive(ticket: number, enter: () => boolean, count?: () => void) {
    if (!this.finish(ticket) || !enter()) return false;
    count?.();
    return true;
  }
  cancel() { this.pending = false; }
}

type CaveCode = typeof import("./zone");
export class CaveLoader extends CaveTravel {
  code?: CaveCode;
  private loading?: Promise<CaveCode>;

  private loadCode() {
    return this.loading ??= import("./zone").finally(() => { this.loading = undefined; });
  }

  async open({ door, saved, instant, crossing }: CaveTrip, arrival: CaveArrival) {
    if (this.pending || !arrival.ready()) return;
    const ticket = this.start();
    try {
      const code = this.code ?? await this.loadCode();
      if (!this.current(ticket) || !arrival.ready()) { this.finish(ticket); return; }
      this.code = code;
      const mouth = COVE_DOORS[door];
      const commit = () => {
        const entered = this.arrive(ticket, () => {
          const at = arrival.position();
          if (!at || (crossing && Math.hypot(at.x - mouth.x, at.z - mouth.z) >= COVE_REACH)) return false;
          let zone: CaveZone;
          try {
            zone = code.buildCaveZone(arrival.save());
          } catch { return false; }
          if (!arrival.mount(zone, zone.safeSpawn(saved ?? zone.interior.wild!.spawns[door]))) {
            zone.dispose();
            return false;
          }
          zone.quest.enter();
          return true;
        }, crossing ? code.countCaveVisit : undefined);
        if (entered) arrival.entered?.();
      };
      if (instant) commit();
      else arrival.fade(commit);
    } catch {
      this.finish(ticket);
    }
  }
}
