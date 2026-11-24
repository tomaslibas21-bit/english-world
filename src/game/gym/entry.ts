import type { Group } from "three";
import { GYM_ENTRY } from "../../content/gym-entry";
import type { GameCharacter } from "../characters";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput, ModePrompt } from "../kit/modes";
import { GYM_MAT } from "../world/gym";
import type { GymMode } from "./mode";

export interface GymRoomHost {
  /** The current zone group when its id is GYM_ENTRY.location. */
  room(): Group | null;
  trainer(): GameCharacter | undefined;
  heading(): number;
  /** Game.placeOnFoot with stayInside=true, including heading, gait and key reset. */
  place(x: number, z: number, heading: number): void;
  savePlace(): void;
  viewport(): { width: number; height: number };
}

export function createGymMode(host: ModeHost, room: GymRoomHost) {
  return new GymEntry(host, room);
}

class GymEntry implements GameMode {
  readonly id = "gym";
  readonly cleanScreen = "menu";
  readonly indoorPrompt = true;
  readonly conversation = { situation: GYM_ENTRY.situation, label: GYM_ENTRY.startLabel };
  private pending: object | null = null;
  private mode?: GymMode;
  private retryUrl?: URL;
  private disposed = false;

  constructor(private host: ModeHost, private world: GymRoomHost) {}

  get active() { return !!this.pending || !!this.mode?.active; }
  get modal() { return !!this.pending || !!this.mode?.modal; }
  get camera() { return this.mode?.camera; }
  get exitLabel() { return this.mode?.exitLabel; }

  available() { return !!this.world.room() && !!this.world.trainer(); }

  prompt(x: number, z: number): ModePrompt | null {
    const dx = x - GYM_MAT.x, dz = z - GYM_MAT.z;
    const distance2 = dx * dx + dz * dz;
    if (distance2 > GYM_MAT.radius ** 2 || this.active || !this.available()) return null;
    return { distance: Math.sqrt(distance2), label: GYM_ENTRY.startLabel, kind: "gym" };
  }

  start() {
    if (this.disposed || this.active || !this.host.owns(this.id) || !this.host.canStart(true) || this.host.rides.riding) return false;
    const room = this.world.room(), trainer = this.world.trainer(), player = this.host.player();
    if (!room || !trainer || trainer === player || !trainer.root.visible) return false;
    const request = this.pending = {};
    const valid = () => this.pending === request && this.host.owns(this.id) && this.host.canStart(true) && !this.host.rides.riding
      && this.world.room() === room && this.world.trainer() === trainer && this.host.player() === player && trainer.root.visible;
    const release = () => {
      if (this.pending !== request) return;
      this.pending = null;
      if (this.host.owns(this.id)) this.host.left(this.id);
    };
    const retry = this.retryUrl;
    if (retry) retry.searchParams.set("gym-retry", String(this.host.time()));
    const load: Promise<typeof import("./mode")> = retry ? import(/* @vite-ignore */ retry.href) : import("./mode");
    void load.then(async ({ GymMode, loadGymSituation }) => {
      if (!valid()) return release();
      this.retryUrl = undefined;
      await loadGymSituation();
      if (!valid()) return release();
      const mode = new GymMode(this.host, this.world);
      if (!mode.open(room, player, trainer)) return release();
      this.mode = mode;
      this.pending = null;
    }, (error: unknown) => {
      if (this.pending !== request) return;
      // A browser may cache a failed dynamic import by URL. Use a fresh URL after a fetch failure.
      const failed = error instanceof TypeError && /https?:\/\/[^\s]+/.exec(error.message)?.[0];
      if (failed && typeof location !== "undefined" && new URL(failed).origin === location.origin) this.retryUrl = new URL(failed);
      else if (import.meta.env.DEV && error instanceof TypeError) this.retryUrl = new URL("./mode.ts", import.meta.url);
      release();
    }).catch(release);
    return true;
  }

  update(frame: ModeFrame) { this.mode?.update(frame); }
  ownsNpc(id: string) { return this.mode?.ownsNpc(id) ?? false; }
  action(name: string, value?: string | boolean) { this.mode?.action(name, value); }

  input(input: ModeInput) {
    if (this.pending) {
      if (input.kind === "key" && input.key === "escape" && !input.repeat) this.exit(true);
      return input.kind !== "key" || input.key === "escape";
    }
    return this.mode?.input(input) ?? false;
  }

  exit(immediate: boolean) {
    if (this.pending) {
      this.pending = null;
      if (this.host.owns(this.id)) this.host.left(this.id);
    }
    this.mode?.exit(immediate);
  }

  dispose() {
    this.disposed = true;
    this.exit(true);
    this.mode?.dispose();
    this.mode = undefined;
  }
}
