import { create } from "zustand";
import type { GameMode, ModeInput } from "../kit/modes";
import type { ModeHost } from "../kit/host";
import { CABINETS, cabinetNear, cabinetPose, type Cabinet } from "./cabinets";

export const useArcade = create<{ cabinet: Cabinet | null; playing: Cabinet | null }>(() => ({ cabinet: null, playing: null }));
export const RETURN_TO_ARCADE = "Grįžti prie automatų";

export class ArcadeMode implements GameMode {
  readonly id = "arcade";
  readonly indoorPrompt = true;
  readonly cleanScreen = "menu";
  private cabinet: Cabinet | null = null;
  private returnTo: Cabinet | null = null;

  constructor(private host: ModeHost, private room: {
    here(): boolean;
    place(pose: ReturnType<typeof cabinetPose>): void;
    start(id: string, option?: string): boolean;
    refocus(): void;
  }) {}

  get active() { return this.cabinet !== null; }

  prompt(x: number, z: number) {
    const near = this.room.here() && cabinetNear(x, z);
    if (!near) return null;
    return { distance: near.distance, kind: "arcade" as const, label: CABINETS[near.id].title, hint: "Pasirinkti žaidimą" };
  }

  start() {
    if (this.active || !this.room.here() || !this.host.canStart(true)) return false;
    const { x, z } = this.host.player().root.position;
    const near = cabinetNear(x, z);
    if (!near) return false;
    this.cabinet = near.id;
    this.host.prepare();
    useArcade.setState({ cabinet: near.id });
    this.host.entered(this.id);
    return true;
  }

  update() {}
  input(input: ModeInput) {
    if (input.kind === "key" && input.key === "escape") {
      if (!input.repeat) this.exit();
      return true;
    }
    return input.kind !== "key";
  }

  action(name: string) {
    const id = this.cabinet;
    if (name !== "play" || !id) return;
    this.returnTo = id;
    useArcade.setState({ playing: id });
    this.close();
    if (!this.room.start(id, "cabinet")) this.returnedFrom(id);
  }

  returnedFrom(id: string) {
    const cabinet = this.returnTo;
    if (!cabinet || cabinet !== id) return;
    this.forgetReturn();
    if (!this.room.here() || !this.host.canStart(true)) return;
    this.room.place(cabinetPose(cabinet));
    this.room.start(this.id);
  }

  forgetReturn() {
    this.returnTo = null;
    useArcade.setState({ playing: null });
  }

  private close() {
    this.cabinet = null;
    useArcade.setState({ cabinet: null });
    this.host.left(this.id);
  }

  exit() {
    if (!this.active) return;
    this.close();
    this.room.refocus();
  }

  dispose() { this.forgetReturn(); this.exit(); }
}
