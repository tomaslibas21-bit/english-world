import { create } from "zustand";
import type { GameMode, ModeInput } from "../kit/modes";
import type { ModeHost } from "../kit/host";
import { CABINETS, cabinetNear, cabinetPose, TOWN_GAMES, type TownGame, type Cabinet } from "./cabinets";

type Menu = { cabinet: Cabinet | null; playing: Cabinet | null; page: "featured" | "list" | "detail"; selected: TownGame | null };
export const useArcade = create<Menu>(() => ({ cabinet: null, playing: null, page: "featured", selected: null }));
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
    holdRadio(playing: boolean): void;
    refocus(): void;
    visit(id: TownGame): void;
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
    useArcade.setState({ cabinet: near.id, page: "featured", selected: null });
    this.host.entered(this.id);
    return true;
  }

  update() {}
  input(input: ModeInput) {
    if (input.kind === "key" && input.key === "escape") {
      if (!input.repeat) this.back();
      return true;
    }
    return input.kind !== "key";
  }

  private back() {
    const { page } = useArcade.getState();
    if (page === "featured") this.exit();
    else useArcade.setState({ page: page === "detail" ? "list" : "featured" });
  }

  action(name: string, value?: string | boolean) {
    const id = this.cabinet;
    if (!id) return;
    const { selected, page } = useArcade.getState();
    const games = TOWN_GAMES[id];
    if (name === "back") return this.back();
    if (name === "list") {
      useArcade.setState({ page: "list", selected: selected ?? games[0] });
      return;
    }
    if (name === "select") {
      const next = games.find((item) => item === value);
      if (next) useArcade.setState({ page: "detail", selected: next });
      return;
    }
    if (name === "visit" && selected && page === "detail") {
      this.close();
      this.room.visit(selected);
      return;
    }
    if (name !== "play" || page !== "featured") return;
    this.returnTo = id;
    this.room.holdRadio(true);
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
    if (!this.returnTo) return;
    this.returnTo = null;
    this.room.holdRadio(false);
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
