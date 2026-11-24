import type { Group } from "three";
import { GYM_ENTRY } from "../../content/gym-entry";
import type { GameCharacter } from "../characters";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput, ModePrompt } from "../kit/modes";
import { GYM_MAT } from "../world/gymMat";
import type { GymMode } from "./mode";

export interface GymRoomHost {
  /** The current gym's group. */
  room(): Group | null;
  trainer(): GameCharacter | undefined;
  heading(): number;
  /** The game's on-foot placement, with the indoor room retained. */
  place(x: number, z: number, heading: number): void;
  savePlace(): void;
  viewport(): { width: number; height: number };
}

type StageRequest = { room: Group; player: GameCharacter; trainer: GameCharacter };

export function createGymMode(host: ModeHost, room: GymRoomHost) {
  return new GymEntry(host, room);
}

class GymEntry implements GameMode {
  readonly id = "gym";
  readonly cleanScreen = "menu";
  readonly indoorPrompt = true;
  readonly conversation = { situation: GYM_ENTRY.situation, label: GYM_ENTRY.startLabel };
  private pending: StageRequest | null = null;
  private mode?: GymMode;
  private retryUrl?: URL;
  private disposed = false;

  constructor(private host: ModeHost, private world: GymRoomHost) {}

  get active() { return !!this.pending || !!this.mode?.active; }
  get modal() { return !!this.pending || !!this.mode?.modal; }
  get camera() { return this.mode?.camera; }

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
    const request = this.pending = { room, player, trainer };
    this.host.entered(this.id);
    void this.load(request);
    return true;
  }

  private async load(request: StageRequest) {
    const retry = this.retryUrl;
    retry?.searchParams.set("gym-retry", String(this.host.time()));
    try {
      const { GymMode, loadGymSituation } = await (retry ? import(/* @vite-ignore */ retry.href) as Promise<typeof import("./mode")> : import("./mode"))
        .catch((error: unknown) => {
          if (this.pending === request) this.rememberFailedModule(error);
          throw error;
        });
      if (this.pending === request) this.retryUrl = undefined;
      if (this.pending !== request || !await loadGymSituation() || this.pending !== request) return;
      const mode = new GymMode(this.host, this.world);
      if (mode.open(request.room, request.player, request.trainer)) this.mode = mode;
    } catch { /* Keep the entry available after an unsuccessful load. */ }
    finally {
      if (this.pending === request) {
        this.pending = null;
        if (!this.mode?.active && this.host.owns(this.id)) this.host.left(this.id);
      }
    }
  }

  private rememberFailedModule(error: unknown) {
    if (!(error instanceof TypeError) || typeof location === "undefined") return;
    // A fresh URL avoids a cached failure of the mode's dynamic import.
    const failed = /https?:\/\/[^\s]+/.exec(error.message)?.[0];
    if (failed) {
      const url = new URL(failed);
      if (url.origin === location.origin) this.retryUrl = url;
    } else if (import.meta.env.DEV) {
      this.retryUrl = new URL(/* @vite-ignore */ "./mode.ts", import.meta.url);
    }
  }

  update(frame: ModeFrame) { this.mode?.update(frame); }
  controlsNpc(id: string) { return this.mode?.controlsNpc(id) ?? false; }
  frameStage(width: number, height: number) { this.mode?.frameStage(width, height); }

  action(name: string, value?: string | boolean) {
    if (name === "exit") this.exit(false);
    else this.mode?.action(name, value);
  }

  input(input: ModeInput) {
    if (this.pending) {
      if (input.kind !== "key") return true;
      if (input.key === "escape" && !input.repeat) {
        input.keys.clear();
        this.exit(true);
      }
      return input.key === "escape";
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
    this.mode = undefined;
  }
}
