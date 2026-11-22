import { ROAD_EDITION } from "../../content/road";
import type { Mesh, WebGLRenderer } from "three";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import type { Ride } from "../rides/Rides";
import { WORLD } from "../world/layout";
import type { RoadMode } from "./mode";

export type WalkEdge = { x: number; z: number; inward: number };
export interface RoadHost extends ModeHost {
  sky(): Mesh;
  clearTownHud(): void;
  returnCar(car: Ride, onFoot: boolean): void;
  deferLift(): void;
}

export function walkEdge(x: number, z: number, vx: number, vz: number): WalkEdge | undefined {
  if (x <= WORLD.minX + 0.55 && vx < -0.4) return { x, z, inward: Math.PI / 2 };
  if (x >= WORLD.maxX - 0.55 && vx > 0.4) return { x, z, inward: -Math.PI / 2 };
  if (z >= WORLD.maxZ - 0.55 && vz > 0.4) return { x, z, inward: Math.PI };
}

export function leavingByRoad(ride: Ride) {
  const { x, z, width, outward } = ROAD_EDITION.edge;
  const m = ride.m;
  const nx = Math.sin(outward), nz = Math.cos(outward), dx = m.x - x, dz = m.z - z;
  const heading = Math.cos(m.heading - outward);
  const nose = dx * nx + dz * nz + m.spec.half * heading;
  const across = dx * nz - dz * nx;
  return ride.kind === "car" && nose >= 0 && Math.abs(across) < width / 2 - m.spec.wide
    && m.speed > 1 && heading > 0.75;
}

export class RoadEntry implements GameMode {
  readonly id = "road";
  readonly cleanScreen = "menu";
  readonly exitLabel = undefined;
  private pending: object | null = null;
  private mode?: RoadMode;
  private edge?: WalkEdge;
  private nextLift = 0;

  constructor(private host: RoadHost) {}
  get active() { return !!this.pending || !!this.mode?.active; }
  get modal() { return !!this.pending; }

  offer(edge: WalkEdge) {
    if (this.host.time() < this.nextLift) return false;
    this.edge = edge;
    return true;
  }

  start(option?: string) {
    if (this.active || !this.host.canStart() || (option === "walk" ? !this.edge
      : this.host.rides.riding?.kind !== "car" || this.host.rides.phase !== "on")) return false;
    const edge = option === "walk" ? this.edge : undefined;
    this.edge = undefined;
    if (edge) this.nextLift = this.host.time() + 60;
    const pending = this.pending = {};
    const load = this.mode ? Promise.resolve(this.mode) : import("./mode").then(({ RoadMode }) => new RoadMode(this.host));
    void load.then((mode) => {
      if (this.pending !== pending || !this.host.owns(this.id)) { if (mode !== this.mode) mode.dispose(); return; }
      this.mode = mode;
      mode.start(edge);
      this.pending = null;
    }).catch((error) => {
      if (this.pending !== pending) return;
      this.pending = null;
      if (this.mode?.active) this.mode.exit(true);
      if (edge) this.host.place(edge.x + Math.sin(edge.inward), edge.z + Math.cos(edge.inward), edge.inward);
      else {
        const car = this.host.rides.riding;
        if (car) this.host.returnCar(car, false);
      }
      this.host.left(this.id);
      console.warn("Road game could not load", error);
    });
    return true;
  }

  input(input: ModeInput) { return this.mode?.input(input) ?? false; }
  action(name: string, value?: string | boolean) { this.mode?.action(name, value); }
  update(frame: ModeFrame) { this.mode?.update(frame); }
  render(renderer: WebGLRenderer, w: number, h: number) { return this.mode?.render(renderer, w, h) ?? false; }
  debug() { return this.pending ? { phase: "loading" } : this.mode?.debug() ?? { phase: "town" }; }
  steer(lane: number) { this.mode?.steer(lane); }
  jumpTimer(seconds = 150) { this.mode?.jumpTimer(seconds); }

  deferLift() { this.nextLift = this.host.time() + 60; }

  exit(immediate: boolean) {
    this.pending = null;
    if (this.mode?.active) this.mode.exit(immediate);
    this.host.left(this.id);
  }

  dispose() { this.exit(true); this.mode?.dispose(); }
}
