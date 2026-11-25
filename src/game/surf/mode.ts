import { L } from "../../ui/i18n";
import { SURF } from "../../content/surf";
import { NPCS } from "../../content/npcs";
import { SURF_SPOT } from "../world/surf";
import { coach } from "../coach";
import type { ModeHost } from "../kit/host";
import type { GameMode } from "../kit/modes";
import { PadButton, PAD_DIRECTIONS } from "../padButtons";
import { SurfPlay, type SurfGame } from "./play";
import { useSurf } from "./store";

export function createSurfMode(host: ModeHost, dressPlayer: SurfGame["dressPlayer"]): (GameMode & { play: SurfPlay }) | null {
  if (!SURF_SPOT || !SURF || !NPCS[SURF.npc]) return null;
  const spot = SURF_SPOT, id = "surf";
  const play = new SurfPlay(spot, SURF, {
    ...host,
    dressPlayer,
    fade: (fn) => host.owns(id) && host.fade(() => { if (host.owns(id)) fn(); }),
    entered: () => { host.prepare(); host.entered(id); },
    left: (x, z, rot) => { host.place(x, z, rot); host.left(id); },
  });
  host.add(play.group, play.marker);
  let padDirection = 0;
  return {
    id, play, cleanScreen: "overlay", camera: "stage",
    conversation: { situation: play.situation, label: L("Banglenčių pamoka") },
    get active() { return play.active; },
    get modal() { return useSurf.getState().picking; },
    get padAction() {
      const { active, choice, over } = useSurf.getState();
      return active && !choice && !over;
    },
    get padPhase() { return useSurf.getState().phase ?? undefined; },
    padBack() { play.stop(); return true; },
    // B on the lesson's answers: as the physical Escape (play.key), the lesson stops
    padBackFrom(surface: string) {
      if (surface !== "choice" || !play.active) return false;
      play.stop();
      return true;
    },
    padCancel() { padDirection = 0; },
    padTick(_, pressed, _released, _dt, _direction, held) {
      const { choice, over, phase, todo } = useSurf.getState();
      if (choice || over || (!todo && phase !== "out" && phase !== "wait" && phase !== "catch" && phase !== "ride")) return;
      const dpad = held & PAD_DIRECTIONS;
      padDirection = dpad & -dpad;
      if (pressed & PadButton.A) { this.input({ kind: "jump" }); return "jump"; }
      if (pressed & PadButton.X) { this.input({ kind: "interact" }); return "interact"; }
    },
    start(level) {
      if (!host.canStart() || play.active) return false;
      if (level === "beginner" || level === "advanced") play.start(level);
      else play.open();
      return true;
    },
    event(name, data) {
      if (name === id) return (data as { level?: string } | null)?.level === "advanced" ? "advanced" : "beginner";
    },
    tick: (dt, outdoors) => play.tick(dt, outdoors),
    update({ dt, time, x, y, blocked }) {
      if (padDirection) {
        const turning = useSurf.getState().todo?.do === "turn";
        // The physical arrows can turn either way. The pad cue uses Right.
        x = padDirection === PadButton.Right ? 1 : padDirection === PadButton.Left && !turning ? -1 : 0;
        y = padDirection === PadButton.Up ? 1 : padDirection === PadButton.Down ? -1 : 0;
      }
      play.update(dt, time, x, y, blocked);
      if (play.active) host.updatePose(dt, play.heading);
    },
    input(input) {
      if (useSurf.getState().picking) {
        if (input.kind === "interact" || input.kind === "jump") return false;
        if (input.kind === "key" && input.key === "escape") { play.cancel(); host.left(id); }
        return true;
      }
      if (!play.active) return false;
      if (input.kind === "key") return play.key(input.key, input.repeat, input.keys);
      if (input.kind === "jump") play.up(); else play.stroke();
      return true;
    },
    prompt(x, z) {
      if (play.distance(x, z) < (spot.hintWithin ?? 15)) coach.cue("surf");
      const distance = play.reach(x, z);
      return distance < Infinity ? { distance, label: L("Banglenčių pamoka"), hint: play.npc?.name, kind: "surf" } : null;
    },
    exit: (immediate) => play.stop(immediate),
    dispose() {
      play.stopListening();
      play.group.removeFromParent();
      play.marker.removeFromParent();
      play.marker.traverse((object) => {
        if ("geometry" in object && "material" in object) {
          (object.geometry as import("three").BufferGeometry).dispose();
          (object.material as import("three").Material).dispose();
        }
      });
    },
  };
}
