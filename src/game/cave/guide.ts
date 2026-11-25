import { LOCATIONS } from "../../content/locations";
import type { GuideKind } from "../gameRef";
import { CAVE_ZONE, COVE_DOORS, PREFERRED_COVE_DOOR, RING_TARGET, SLATE_COVE, drawSlateCoveMap, inSlateCove } from "../world/slateCovePlan";
import type { CaveZone } from "./zone";

type Point = { x: number; z: number };
const RING = "old-stone-ring";
const ring = { kind: "point", ...RING_TARGET, label: LOCATIONS[RING].name } as const;
const entryDoor = COVE_DOORS[PREFERRED_COVE_DOOR];
const entry = { kind: "cave-entry", id: entryDoor.id, x: entryDoor.x, z: entryDoor.z + 1.7, label: LOCATIONS[CAVE_ZONE].name } as const;

export class CaveGuide {
  mode: GuideKind = "objective";
  place?: typeof CAVE_ZONE | typeof RING;
  npc?: string;
  private indoorExit?: { exit: Point; target: { kind: "exit"; x: number; z: number; label: string; id?: never } };

  select(place: string, npc?: string) {
    if (place !== CAVE_ZONE && place !== RING) return false;
    this.place = place;
    this.npc = npc;
    this.mode = "cave";
    return true;
  }

  clear() {
    this.mode = "objective";
    this.place = this.npc = undefined;
  }

  leave() {
    if (this.place === CAVE_ZONE) this.clear();
  }

  enter(phoneTask: boolean) {
    if (this.place !== RING && (!phoneTask || this.place === CAVE_ZONE)) this.mode = "cave";
  }

  talk(npc: string) {
    if (this.npc === npc) this.npc = undefined;
  }

  target(at: Point, cave?: CaveZone, exit?: Point) {
    if (cave) return this.place === RING ? cave.exitTarget : this.npc ? cave.quest.guideTo(this.npc, at) : cave.quest.guide(at);
    if (exit) {
      const label = LOCATIONS[this.place ?? CAVE_ZONE].name;
      if (this.indoorExit?.exit !== exit || this.indoorExit.target.label !== label) {
        this.indoorExit = { exit, target: { kind: "exit", x: exit.x, z: exit.z - 0.6, label } };
      }
      return this.indoorExit.target;
    }
    return this.place === RING ? ring : entry;
  }

  questTarget(at: Point, cave?: CaveZone, target?: Point | null) {
    if (cave) return this.mode === "cave" && this.place !== RING ? target : cave.quest.guide(at);
  }

  exteriorObjective() {
    if (this.mode !== "cave" || !this.place) return;
    const loc = LOCATIONS[this.place];
    return { followUp: true as const, targetLoc: loc.id, sitId: loc.id, title: loc.name, titleLt: loc.lt, goal: "", where: loc.lt,
      dist: null, angle: null, inside: false };
  }
}

export function caveMapRegion(zone: string | undefined, x: number, z: number) {
  return zone === CAVE_ZONE ? CAVE_ZONE : zone === "town" && inSlateCove(x, z) ? "slate-cove" : undefined;
}

export function drawCoveMap(ctx: CanvasRenderingContext2D, west: number, north: number, scale: number) {
  if (west < SLATE_COVE.maxX) drawSlateCoveMap(ctx, west, north, scale);
}
