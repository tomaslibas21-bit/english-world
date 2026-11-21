import { SURF } from "../../content/surf";
import { NPCS } from "../../content/npcs";
import { SURF_SPOT } from "../world/surf";
import { coach } from "../coach";
import type { ModeHost } from "../kit/host";
import type { GameMode } from "../kit/modes";
import { SurfPlay } from "./play";
import { useSurf } from "./store";

export function createSurfMode(host: ModeHost): (GameMode & { play: SurfPlay }) | null {
  if (!SURF_SPOT || !SURF || !NPCS[SURF.npc]) return null;
  const spot = SURF_SPOT, id = "surf";
  const play = new SurfPlay(spot, SURF, {
    ...host,
    fade: (fn) => host.owns(id) && host.fade(() => { if (host.owns(id)) fn(); }),
    entered: () => { host.prepare(); host.entered(id); },
    left: (x, z, rot) => { host.place(x, z, rot); host.left(id); },
  });
  host.add(play.group, play.marker);
  return {
    id, play, cleanScreen: "overlay", camera: "stage",
    conversation: { situation: play.situation, label: "Banglenčių pamoka" },
    get active() { return play.active; },
    get modal() { return useSurf.getState().picking; },
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
      return distance < Infinity ? { distance, label: "Banglenčių pamoka", hint: play.npc?.name, kind: "surf" } : null;
    },
    action(name, value) {
      switch (name) {
        case "choose": play.choose(String(value)); break;
        case "act": play.act(value as Parameters<SurfPlay["act"]>[0]); break;
        case "repeat": play.repeat(); break;
        case "mic": if (value === "finish") play.finishListening(); else play.setMic(!!value); break;
        case "again": play.again(value === "advanced" ? value : value === "beginner" ? value : undefined); break;
      }
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
