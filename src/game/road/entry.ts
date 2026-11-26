import { ROAD_EDITION } from "../../content/road";
import type { Object3D, WebGLRenderer } from "three";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import type { Controls } from "../rides/drive";
import type { Ride } from "../rides/Rides";
import type { SpeedFeel } from "../rides/speedFeel";
import { SIDEWALK, WORLD } from "../world/layout";
import { CREST_DISTANCE, exitCoordinates, roadCenter } from "../world/roadExit";
import type { RoadEnvironment } from "./view";
import { useRoad } from "./store";
import type { PreparedRoad, RoadMode } from "./mode";
import type { PlayWay } from "./save";
import type { RoadOpening } from "./track";

export type WalkEdge = { x: number; z: number; inward: number };
/** Where the town camera looks on the way out: the road's bend this far past the crest (m). */
const CREST_AIM = 40;
export interface RoadHost extends ModeHost {
  cabinetAvailable(): boolean;
  environment(): RoadEnvironment;
  roadOpening(): RoadOpening | undefined;
  roadSign(): Object3D | undefined;
  viewport(): { width: number; height: number };
  approach(approaching: boolean): void;
  holdTownPose(): void;
  clearTownHud(): void;
  speedFeel(acquire?: () => boolean): SpeedFeel | undefined;
  returnCar(car: Ride, onFoot: boolean): void;
  deferLift(): void;
}

export function walkEdge(x: number, z: number, vx: number, vz: number): WalkEdge | undefined {
  if (!ROAD_EDITION.walkAnywhere) {
    const edge = ROAD_EDITION.edge;
    const nx = Math.sin(edge.outward), nz = Math.cos(edge.outward);
    const across = (x - edge.x) * nz - (z - edge.z) * nx;
    const along = (x - edge.x) * nx + (z - edge.z) * nz;
    if (Math.abs(across) <= edge.width / 2 + SIDEWALK && along >= 0 && nx * vx + nz * vz > 0.4) {
      return { x, z, inward: edge.outward + Math.PI };
    }
    return;
  }
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
  private aboard?: Ride;
  private request?: object;
  private prepared?: PreparedRoad;
  private failed = false;
  private retryUrl?: URL;
  private onStrip = false;
  private outwardIntent = false;
  private warm = false;
  private aim = 0;

  constructor(private host: RoadHost) {}
  get active() { return !!this.pending || !!this.mode?.active; }
  get padDriving() { return !this.pending && !!this.mode?.padDriving; }
  get padAction() { return !this.pending && !!this.mode?.padAction; }
  get padPhase() { return this.mode?.padPhase; }
  padBack() { return !this.pending && (this.mode?.padBack() ?? false); }
  padBackFrom(surface: string) { return !this.pending && (this.mode?.padBackFrom(surface) ?? false); }
  padTick(input: unknown, pressed: number) {
    if (this.padDriving) return this.mode?.padTick(input, pressed);
  }
  get inStrip() { return this.onStrip; }
  /** Town yaw (rad) toward the bend past the crest while the car heads out, 0 elsewhere (Game eases it, phones only). */
  get crestAim() { return this.aim; }
  leaveStrip() { this.cancelPreparation(); }
  get modal() { return !!this.pending; }

  prefetch(car: Ride) {
    this.cancelPreparation();
    this.aboard = car;
    const request = this.request = {};
    const retry = this.retryUrl;
    if (retry) retry.searchParams.set("road-retry", String(this.host.time()));
    const load: Promise<typeof import("./mode")> = retry ? import(/* @vite-ignore */ retry.href) : import("./mode");
    void load.catch((error) => {
      if (this.request === request && error instanceof Error) {
        const url = /https?:\/\/[^\s]+/.exec(error.message)?.[0];
        if (url && new URL(url).origin === location.origin) this.retryUrl = new URL(url);
        else if (import.meta.env.DEV && error instanceof TypeError) this.retryUrl = new URL("./mode.ts", import.meta.url);
      }
      throw error;
    }).then(async ({ RoadMode: Mode, prepareRoad }) => {
      if (this.request !== request) return;
      this.retryUrl = undefined;
      const prepared = await prepareRoad(this.host, car);
      if (this.request !== request) { prepared.dispose(); return; }
      this.mode ??= new Mode(this.host);
      this.prepared = prepared;
    }).catch((error) => {
      if (this.request !== request) return;
      this.failed = true;
      console.warn("Road game could not load", error);
    });
  }

  private cancelPreparation() {
    this.request = undefined;
    this.aboard = undefined;
    this.prepared?.dispose();
    this.prepared = undefined;
    this.failed = this.onStrip = this.outwardIntent = this.warm = false;
    this.aim = 0;
    this.host.approach(false);
  }

  stage(renderer: WebGLRenderer) {
    const car = this.host.rides.riding;
    if (!this.active && car?.kind === "car" && this.host.rides.phase === "on" && !this.aboard) this.prefetch(car);
    if (this.aboard && (car !== this.aboard || this.host.rides.phase === "out")) this.cancelPreparation();
    if (this.active || !this.aboard) return;
    try {
      this.prepared?.stage(renderer);
    } catch (error) {
      this.prepared?.dispose();
      this.failed = true;
      console.warn("Road could not prepare the track", error);
    }
  }

  openEdge(car: Ride, controls: Controls) {
    if (car !== this.aboard || this.active) { this.aim = 0; return; }
    const m = car.m, { s, x } = exitCoordinates(m.x, m.z);
    const facingOut = Math.cos(m.heading - ROAD_EDITION.edge.outward) > 0.75;
    const reversing = controls.throttle < -0.05 || m.speed < -0.1;
    if (s < -CREST_DISTANCE - m.spec.half - 0.5) this.onStrip = this.outwardIntent = false;
    const headingOut = facingOut && !reversing;
    const approaching = headingOut && (this.onStrip || (m.speed > 1 && s > -CREST_DISTANCE - 30
      && Math.abs(x) < ROAD_EDITION.edge.width / 2 - m.spec.wide));
    this.host.approach(approaching);
    // Exit +x is a smaller town yaw. Turn in over the strip so the crest frame shows the far side of the bend.
    const k = Math.min(1, Math.max(0, (s + CREST_DISTANCE + 10) / (CREST_DISTANCE - 4)));
    this.aim = approaching ? -Math.atan2(roadCenter(CREST_AIM) - x, CREST_AIM - s) * k * k * (3 - 2 * k) : 0;
    if (headingOut && this.host.canStart() && leavingByRoad(car)) {
      if (!this.onStrip && (this.failed || this.prepared?.failed)) this.prefetch(car);
      this.onStrip = this.outwardIntent = true;
    } else if (!headingOut) this.outwardIntent = false;
    if (!this.onStrip) return;
    // Keep the corridor open when backing out. Only outward travel waits at the crest.
    const ready = !!this.prepared?.ready;
    const speedLimit = ready || !headingOut || s < -12 ? Infinity : car.m.spec.max * Math.sqrt(Math.max(0, -s / 12));
    return { speedLimit };
  }

  shouldStart(car: Ride) {
    return this.onStrip && this.outwardIntent && car === this.aboard && !!this.prepared?.ready
      && exitCoordinates(car.m.x, car.m.z).s >= -0.001;
  }

  offer(edge: WalkEdge) {
    if (this.host.time() < this.nextLift) return false;
    this.edge = edge;
    return true;
  }

  start(option?: string) {
    const cabinet = option === "cabinet";
    if (this.active || !this.host.canStart(cabinet) || (cabinet && !this.host.cabinetAvailable())) return false;
    if (!cabinet && option !== "walk") {
      const car = this.host.rides.riding, stage = this.prepared;
      if (!car || !stage || !this.mode || this.host.rides.phase !== "on" || !this.shouldStart(car)) return false;
      this.prepared = undefined;
      this.cancelPreparation();
      this.warm = true;
      this.mode.startFromCrest(stage);
      stage.dispose();
      return true;
    }
    const edge = cabinet ? undefined : this.edge;
    if (cabinet) {
      this.host.prepare();
      this.host.clearTownHud();
      useRoad.setState({ loadingCabinet: true });
      this.host.entered(this.id);
    } else {
      if (!edge) return false;
      this.edge = undefined;
      this.nextLift = this.host.time() + 60;
    }
    const pending = this.pending = {};
    const load = this.mode ? Promise.resolve(this.mode) : Promise.all([import("./mode"), import("../../ui/roadOverlay").then(({ preloadRoadOverlay }) => preloadRoadOverlay())])
      .then(([{ RoadMode }]) => new RoadMode(this.host));
    void load.then((mode) => {
      if (this.pending !== pending || !this.host.owns(this.id)) { if (mode !== this.mode) mode.dispose(); return; }
      this.mode = mode;
      if (edge) mode.start(edge); else mode.startFromCabinet();
      this.pending = null;
    }).catch((error) => {
      if (this.pending !== pending) return;
      this.pending = null;
      if (this.mode?.active) this.mode.exit(true);
      useRoad.setState({ loadingCabinet: false });
      if (edge) this.host.place(edge.x + Math.sin(edge.inward), edge.z + Math.cos(edge.inward), edge.inward);
      this.host.left(this.id);
      console.warn("Road game could not load", error);
    });
    return true;
  }

  input(input: ModeInput) {
    if (this.pending && input.kind === "key" && input.key === "escape") {
      if (!input.repeat) this.exit(true);
      return true;
    }
    return this.mode?.input(input) ?? false;
  }
  action(name: string, value?: string | boolean) { this.mode?.action(name, value); }
  update(frame: ModeFrame) { this.mode?.update(frame); }
  render(renderer: WebGLRenderer, w: number, h: number) { return this.mode?.render(renderer, w, h) ?? false; }
  debug() {
    const ride = this.host.rides.riding;
    const position = ride?.kind === "car" ? exitCoordinates(ride.m.x, ride.m.z) : undefined;
    return { phase: this.pending ? "loading" : "town", ...this.mode?.debug(),
      requested: !!this.request || this.warm, ready: !!this.prepared?.ready || this.warm,
      onStrip: this.onStrip, outwardIntent: this.outwardIntent, exitDistance: position && position.s + CREST_DISTANCE,
      townCar: ride?.kind === "car" ? { x: ride.m.x, z: ride.m.z, speed: ride.m.speed } : undefined,
      exit: ROAD_EDITION.edge };
  }
  steer(lane: number) { this.mode?.steer(lane); }
  previewOptions(options?: readonly string[]) { this.mode?.previewOptions(options); }
  startWay(way: PlayWay) { return this.mode?.startWay(way) ?? false; }
  forceGate(correct: boolean) { return this.mode?.forceGate(correct) ?? false; }
  jumpTimer(seconds = 150) { this.mode?.jumpTimer(seconds); }

  deferLift() { this.nextLift = this.host.time() + 60; }

  exit(immediate: boolean) {
    if (this.pending) useRoad.setState({ loadingCabinet: false });
    this.pending = null;
    if (this.mode?.active) this.mode.exit(immediate);
    this.host.left(this.id);
  }

  dispose() { this.cancelPreparation(); this.exit(true); this.mode?.dispose(); }
}
