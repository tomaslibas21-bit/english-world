import { CENOTE_TOUR } from "../../content/route";
import { useStore } from "../../state/store";
import { L } from "../../ui/i18n";
import type { GameCharacter } from "../characters";
import type { ModeHost } from "../kit/host";
import type { ModeRegistry } from "../kit/modes";
import type { Undersea } from "../rides/undersea";
import { floorY, waterY } from "../water";
import type { NpcSpot } from "../world/interiors";
import { THEME } from "../world/theme";
import { CENOTE_MODE, CenoteTourEntry } from "./entry";

export const cenoteGuide = THEME.cenote?.guide;

interface TownOperations<Actor> {
  container: HTMLElement;
  inTown(): boolean;
  wasHidden(): boolean;
  cancelRide(): void;
  resetFootInput(): void;
  undersea: Pick<Undersea, "update">;
  save(): void;
  drawStats(): { calls: number; triangles: number };
  spawnGuide(spot: NpcSpot): Actor | undefined;
  removeGuide(actor: Actor): void;
  refreshObstacles(): void;
}

const FADE_STEPS = 60;
let opacityValues: string[] | undefined;

export function registerCenoteTown<Actor extends { ch: GameCharacter }>(
  modes: ModeRegistry,
  host: Pick<ModeHost, "player" | "rig" | "add" | "time" | "canStart" | "entered" | "left" | "owns" | "prepare" | "place">,
  town: TownOperations<Actor>,
) {
  if (!CENOTE_TOUR || !cenoteGuide) return;
  const spot = cenoteGuide;
  const home = { x: spot.ax, z: spot.az, rot: Math.atan2(spot.x - spot.ax, spot.z - spot.az) };
  let guide: Actor | undefined;
  let curtainIndex = 0;
  let curtainStyle: CSSStyleDeclaration | undefined;
  const tour = new CenoteTourEntry({
    player: host.player, rig: host.rig, add: host.add, time: host.time,
    entered: host.entered, left: host.left, place: host.place,
    canStart: () => town.inTown() && host.canStart(),
    paused: () => document.hidden || town.wasHidden(),
    failed: () => useStore.getState().toast({ kind: "info", title: L("Išvykos pradėti nepavyko. Pabandykite dar kartą."), ms: 4200 }),
    dry: () => {
      if (!town.inTown()) return;
      town.cancelRide();
      host.prepare();
      town.resetFootInput();
      host.place(home.x, home.z, home.rot);
      town.undersea.update(0, host.time(), false, host.player().root.position, 0);
      useStore.getState().setHud({ prompt: null, ride: null, wading: false });
      town.save();
    },
    guide: () => { updateGuide(); return guide?.ch; },
    curtain: (opacity) => {
      const index = Math.floor(opacity * FADE_STEPS);
      if (index === curtainIndex) return;
      const style = curtainStyle ??= town.container.parentElement?.style;
      if (!style) return;
      opacityValues ??= Array.from({ length: FADE_STEPS + 1 }, (_, i) => i ? String(i / FADE_STEPS) : "");
      style.setProperty("--cenote-tour-fade", opacityValues[index]);
      curtainIndex = index;
      if (index === 0) curtainStyle = undefined;
    },
  }, CENOTE_TOUR.id);

  function updateGuide() {
    if (!town.inTown()) return;
    const { x, z } = host.player().root.position;
    const present = tour.active || Math.hypot(x - spot.x, z - spot.z) <= 24;
    if (present === !!guide) return;
    if (present) guide = town.spawnGuide(spot);
    else if (guide) { town.removeGuide(guide); guide = undefined; }
    town.refreshObstacles();
  }

  modes.register(tour);
  const inspection = Object.freeze({ snapshot: () => {
    const { calls, triangles } = town.drawStats();
    const { x, z } = host.player().root.position;
    return { ...tour.snapshot(), drawCalls: calls, triangles, floorY: floorY(x, z), waterY: waterY(x, z, host.time()) };
  } });
  Object.defineProperty(window, "__cenoteTour", { configurable: true, writable: false, value: inspection });
  return Object.assign(tour, {
    home,
    updateGuide,
    forgetGuide: () => { guide = undefined; },
    savedPlace: () => host.owns(CENOTE_MODE) ? { zone: "town", ...home } : undefined,
    removeInspection: () => {
      if (Object.getOwnPropertyDescriptor(window, "__cenoteTour")?.value === inspection) Reflect.deleteProperty(window, "__cenoteTour");
    },
  });
}
