import { COVE_DOORS, COVE_REACH, type CoveDoor } from "../world/slateCovePlan";

type Point = { x: number; z: number };

export function coveDoorNear(p: Point, fx: number, fz: number): CoveDoor | undefined {
  for (const door of doors) {
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

  async open(instant: boolean, canEnter: () => boolean, fade: (enter: () => void) => void,
    enter: (code: CaveCode) => boolean, dryCrossing: boolean) {
    if (this.pending) return;
    const ticket = this.start();
    try {
      const code = this.code ?? await this.loadCode();
      if (!this.current(ticket) || !canEnter()) { this.finish(ticket); return; }
      this.code = code;
      const commit = () => this.arrive(ticket, () => enter(code), dryCrossing ? code.countCaveVisit : undefined);
      if (instant) commit();
      else fade(commit);
    } catch {
      this.finish(ticket);
    }
  }
}
