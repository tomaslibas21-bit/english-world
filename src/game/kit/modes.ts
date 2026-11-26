import type { Ride } from "../rides/Rides";

import type { PadScope } from "../gamepad";

export type CleanScreen = "menu" | "overlay" | "world";
export interface ModeScreen { kind: Exclude<CleanScreen, "world">; id: string; exitLabel?: string }

export type ModeInput =
  | { kind: "key"; key: string; repeat: boolean; keys: Set<string>; shift?: boolean }
  | { kind: "interact" | "tap" | "jump" };

export interface ModeFrame {
  dt: number;
  time: number;
  x: number;
  y: number;
  brake: boolean;
  blocked: boolean;
}

export interface ModePrompt {
  distance: number;
  label: string;
  hint?: string;
  kind: "surf" | "taxi" | "barista" | "pool" | "billiards" | "gym";
}

export interface GameMode extends PadScope {
  id: string;
  readonly active: boolean;
  readonly modal?: boolean;
  readonly padAction?: boolean;
  readonly indoorPrompt?: boolean;
  readonly cleanScreen: CleanScreen;
  readonly exitLabel?: string;
  readonly camera?: "stage" | "talk" | "follow";
  /** The car the learner can drive in town during this mode's current phase. */
  readonly townDrive?: Ride;
  readonly conversation?: { situation: string; label: string; option?: string };
  available?(): boolean;
  allowsRideHints?(): boolean;
  start(option?: string): boolean;
  update(frame: ModeFrame): void;
  frameStage?(width: number, height: number): void;
  controlsNpc?(id: string): boolean;
  tick?(dt: number, outdoors: boolean): void;
  input(input: ModeInput): boolean;
  blur?(): void;
  prompt?(x: number, z: number): ModePrompt | null;
  event?(name: string, data: unknown): string | undefined;
  action?(name: string, value?: string | boolean): void;
  exit(immediate: boolean): void;
  dispose(): void;
}

export class ModeRegistry {
  private modes = new Map<string, GameMode>();
  private selected: GameMode | null = null;
  private screenBefore: ModeScreen | null | undefined;
  private queued: { id: string; option?: string } | null = null;

  constructor(private screen: { read(): ModeScreen | null; set(value: ModeScreen | null): void }) {}

  register(mode: GameMode | null) {
    if (mode) this.modes.set(mode.id, mode);
  }

  get(id: string) { return this.modes.get(id); }
  get active() { return this.selected?.active ? this.selected : null; }
  get modal() { return !!this.selected?.modal; }
  get hasQueued() { return this.queued !== null; }
  get engaged() { return this.selected !== null; }
  get world() { return this.selected?.cleanScreen === "world"; }

  start(id: string, option?: string) {
    const mode = this.get(id);
    if (!mode || (this.selected && (this.selected !== mode || !mode.modal))) return false;
    this.selected = mode;
    const started = mode.start(option);
    if (!started && !mode.active && !mode.modal) this.left(id);
    return started;
  }

  owns(id: string) { return this.selected?.id === id; }

  /** B on a pad surface with no Back of its own: the engaged mode decides (GameMode.padBackFrom). */
  padBackFrom(surface: string) { return !!this.selected?.padBackFrom?.(surface); }

  entered(id: string) {
    if (this.selected?.id !== id || this.screenBefore !== undefined) return;
    this.screenBefore = this.screen.read();
    const { cleanScreen, exitLabel } = this.selected;
    if (cleanScreen !== "world") this.screen.set({ kind: cleanScreen, id, exitLabel });
  }

  left(id: string) {
    if (this.selected?.id !== id) return;
    this.selected = null;
    if (this.screenBefore !== undefined) {
      this.screen.set(this.screenBefore);
      this.screenBefore = undefined;
    }
  }

  input(input: ModeInput) { return this.selected?.input(input) ?? false; }
  blur() { this.selected?.blur?.(); }
  update(frame: ModeFrame) { this.active?.update(frame); }
  tick(dt: number, outdoors: boolean) {
    for (const mode of this.modes.values()) mode.tick?.(dt, outdoors && !this.active);
  }

  prompt(x: number, z: number, nearerThan: number, indoors = false) {
    let result: (ModePrompt & { id: string }) | null = null;
    for (const mode of this.modes.values()) {
      if (!!mode.indoorPrompt !== indoors) continue;
      const prompt = mode.prompt?.(x, z);
      if (prompt && prompt.distance < (result?.distance ?? nearerThan)) result = { ...prompt, id: mode.id };
    }
    return result;
  }

  offer(situation: string) {
    for (const mode of this.modes.values()) {
      if (mode.conversation?.situation === situation && (mode.available?.() ?? true)) return { id: mode.id, label: mode.conversation.label };
    }
    return null;
  }

  event(name: string, data: unknown) {
    for (const mode of this.modes.values()) {
      const option = mode.event?.(name, data);
      if (option !== undefined) this.queued = { id: mode.id, option };
    }
  }

  queue(id: string) {
    const mode = this.get(id);
    if (!mode || !(mode.available?.() ?? true)) return false;
    if (this.queued?.id !== id) this.queued = { id, option: mode.conversation?.option };
    return true;
  }

  launchQueued() {
    const queued = this.queued;
    this.queued = null;
    if (queued) this.start(queued.id, queued.option);
  }

  cancelQueued() { this.queued = null; }

  exit(immediate = false) {
    const mode = this.selected;
    if (!mode) return;
    mode.exit(immediate);
    if (immediate || !mode.active) this.left(mode.id);
  }

  dispose() {
    this.exit(true);
    for (const mode of this.modes.values()) mode.dispose();
    this.modes.clear();
    this.cancelQueued();
  }
}
