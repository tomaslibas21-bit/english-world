import type { Fog, HemisphereLight, DirectionalLight, Mesh, WebGLRenderer } from "three";
import { SEA_EDITION, SEA_UI } from "../../content/sea";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import type { Ride } from "../rides/Rides";
import { BAY_EDGE } from "../rides/drive";
import { BAY } from "../water";
import type { Town } from "../world/town";
import type { SeaMode, PreparedSea } from "./mode";

export type SeaEnvironment = {
  sky: Mesh; sea: Town["sea"]; fog: Fog | null;
  hemi: HemisphereLight; sun: DirectionalLight;
};

export interface SeaHost extends ModeHost {
  environment(): SeaEnvironment;
  clearTownHud(): void;
  returnBoat(boat: Ride, onFoot: boolean): void;
  tip(title: string, body: string): void;
}

const OUTWARD = Math.cos(50 * Math.PI / 180);
const headsOut = (ride: Pick<Ride, "m">) => -ride.m.fz >= OUTWARD;

export function leavingBySea(ride: Pick<Ride, "kind" | "m">) {
  const { m } = ride;
  return ride.kind === "boat" && m.speed > 2 && headsOut(ride) && m.vz < 0
    && m.z + m.spec.half * m.fz <= BAY.z0;
}

export function seaReturn(ride: Pick<Ride, "m">): Ride["home"] {
  const margin = BAY_EDGE.inset + ride.m.spec.wide;
  return { x: Math.max(BAY.x0 + margin, Math.min(BAY.x1 - margin, ride.m.x)), z: BAY.z0 + 14, rot: 0 };
}

export class SeaEntry implements GameMode {
  readonly id = "sea";
  readonly cleanScreen = "menu";
  private loaded?: { Mode: typeof SeaMode; prepared: PreparedSea };
  private loading?: object;
  private mode?: SeaMode;
  private boarded?: Ride;
  private heldAtEdge = false;
  private armed = true;
  private tipped = false;

  constructor(private host: SeaHost) {}
  get active() { return !!this.mode?.active; }

  prefetch(boat: Ride) {
    const request = this.loading = {};
    this.boarded = boat;
    this.heldAtEdge = false;
    this.loaded = undefined;
    void import("./mode").then(async ({ SeaMode: Mode, prepareSea }) => {
      if (this.loading !== request) return;
      const prepared = await prepareSea();
      if (this.loading === request) this.loaded = { Mode, prepared };
    }).catch((error) => {
      if (this.loading === request) console.warn("Sea game could not load", error);
    });
  }

  /** Only the seaward edge gives way. While loading, remember an approach that reaches its soft holding band. */
  openEdge(boat: Ride) {
    if (boat.m.z >= BAY.z0 + 20) this.armed = true;
    if (boat.m.z > BAY.z0 + BAY_EDGE.inset + BAY_EDGE.fade + 2 || boat.m.vz > 0.5) this.heldAtEdge = false;
    if (boat !== this.boarded || !this.armed || !headsOut(boat) || boat.m.speed <= 2) return false;
    if (this.loaded) return this.host.canStart();
    if (boat.m.z <= BAY.z0 + BAY_EDGE.inset + BAY_EDGE.fade) this.heldAtEdge = true;
    return false;
  }

  shouldStart(boat: Ride) {
    if (boat !== this.boarded) return false;
    if (!this.tipped && headsOut(boat) && boat.m.speed > 2 && boat.m.z < BAY.z0 + 40) {
      this.tipped = true;
      this.host.tip(SEA_UI.tipTitle, SEA_UI.tipBody);
    }
    return this.armed && !!this.loaded && (leavingBySea(boat) || this.heldAtEdge);
  }

  start() {
    const boat = this.host.rides.riding, loaded = this.loaded;
    if (this.active || !boat || this.host.rides.phase !== "on" || !loaded || !this.host.canStart() || !this.shouldStart(boat)) return false;
    this.armed = false;
    this.heldAtEdge = false;
    this.mode = new loaded.Mode(this.host, boat, loaded.prepared);
    this.mode.start();
    return true;
  }

  update(frame: ModeFrame) { this.mode?.update(frame); }
  input(input: ModeInput) { return this.mode?.input(input) ?? false; }
  action(name: string, value?: string | boolean) { this.mode?.action(name, value); }
  render(renderer: WebGLRenderer, w: number, h: number) {
    if (this.mode?.active) return this.mode.render(renderer, w, h);
    if (this.mode) {
      this.mode = undefined;
      const boat = this.host.rides.riding;
      if (boat && boat === this.boarded) this.prefetch(boat);
    }
    return false;
  }
  exit(immediate: boolean) { this.mode?.exit(immediate); }
  dispose() { this.loading = undefined; this.mode?.exit(true); this.mode = undefined; }

  debug() { return { phase: "town", ...this.mode?.debug(), ready: !!this.loaded, armed: this.armed, enabled: SEA_EDITION.enabled }; }
  steer(lane: number) { this.mode?.steer(lane); }
  jumpTimer(seconds?: number) { this.mode?.jumpTimer(seconds); }
}
