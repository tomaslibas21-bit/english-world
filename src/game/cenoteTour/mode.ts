import { Vector3 } from "three";
import { CENOTE_TOUR_ACCEPT } from "../../content/cenote-tour-lines";
import { getSituation } from "../../content/situations/catalog";
import { countPlay } from "../../state/playStats";
import type { GameCharacter } from "../characters";
import { ModeDialogue } from "../kit/dialogue";
import { FrameFade } from "../kit/frameFade";
import type { ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases } from "../kit/phrases";
import { floorY, waterY } from "../water";
import { CENOTE_ROUTE } from "../world/cenoteTour";
import { CenoteAnimals } from "./animals";
import { CENOTE_MODE, type CenoteTourHost } from "./entry";
import { aimSwim, CUT_SWAP, CUT_TO_BAY, CUT_TO_HUT, swimAt } from "./route";
import { resetCenoteTour, useCenoteTour } from "./store";

const cues = [6, 14, CUT_TO_BAY, 22, 24, 32, 42, 49, 52, 62, CUT_TO_HUT, 76] as const;
export const SNORKEL_FOV = { portrait: 106, wide: 55 };
const acknowledgments: Record<string, string> = {
  see_yes: "ct_together", see_where: "ct_ahead", see_one: "ct_second", see_two: "ct_pair",
};

export class CenoteTourMode {
  active = false;
  elapsed = 0;
  surface: number | null = null;
  private state: "deck" | "transit" | "swim" | "turn" | "returning" = "deck";
  private stopIndex = -1;
  private nextCue = 0;
  private wildlifeTime = 0;
  private inBay = false;
  private home = false;
  private waiting = false;
  private paused = false;
  private fauna?: CenoteAnimals;
  private readonly stage = { pos: new Vector3(), look: new Vector3(), rate: 10, shiftY: 0.04, fov: SNORKEL_FOV.wide };
  private readonly target = new Vector3();
  private readonly fade = new FrameFade((opacity) => this.host.curtain(opacity));
  private readonly dialogue = new ModeDialogue({
    say: (line) => useCenoteTour.setState({ line }),
    answer: (answer) => useCenoteTour.setState({ answer }),
    choices: (choices) => useCenoteTour.setState({ choices }),
    mic: (mic) => useCenoteTour.setState({ mic, micOn: this.dialogue.micOn }),
    animate: (seconds) => {
      if (!this.inBay) this.guide?.talk(seconds);
    },
    recordingOnly: true,
    framePlayback: true,
  });
  private player?: GameCharacter;
  private guide?: GameCharacter;
  private playerVisible = true;
  private guidePose?: { position: Vector3; yaw: number; anim: GameCharacter["anim"] };
  private previousStage: CenoteTourHost["rig"]["stage"] = null;
  private readonly definition: NonNullable<ReturnType<typeof getSituation>>;
  private readonly route: NonNullable<typeof CENOTE_ROUTE>;

  constructor(private host: CenoteTourHost, private situation: string, private finish: () => void) {
    const definition = getSituation(situation);
    if (!definition || !CENOTE_ROUTE) throw new Error("Cenote tour unavailable");
    this.definition = definition;
    this.route = CENOTE_ROUTE;
  }

  start() {
    const guide = this.host.guide();
    if (!guide) throw new Error("Cenote guide unavailable");
    this.guide = guide;
    const player = this.player = this.host.player();
    this.playerVisible = player.root.visible;
    this.previousStage = this.host.rig.stage;
    this.active = true;
    resetCenoteTour();
    this.fade.start(() => this.onDeck(), 0);
    countPlay("games", CENOTE_MODE);
  }

  controlsNpc(id: string) { return this.guide?.root.visible === true && !this.inBay && id === this.definition.npc; }

  frameStage(w: number, h: number) {
    const rig = this.host.rig;
    this.stage.fov = w / h < 0.87 ? SNORKEL_FOV.portrait : SNORKEL_FOV.wide;
    if (rig.stage === this.stage) rig.applyViewShift(w, h, 0, h * this.stage.shiftY);
  }

  private snap() {
    const rig = this.host.rig;
    rig.stage = this.stage;
    rig.mode = "stage";
    rig.stageSnap();
    this.player!.root.visible = false;
  }

  private onDeck() {
    const { deck, deckLook, deckGuide } = this.route;
    const [x, z] = deck;
    this.host.place(x, z, -Math.PI / 2);
    const guide = this.guide!;
    this.guidePose = { position: guide.root.position.clone(), yaw: guide.root.rotation.y, anim: guide.anim };
    guide.root.position.set(deckGuide[0], floorY(...deckGuide), deckGuide[1]);
    guide.root.rotation.y = Math.atan2(x - deckGuide[0], z - deckGuide[1]);
    guide.setAnim("idle");
    this.stage.pos.set(x, floorY(x, z) + 1.53, z);
    this.stage.look.set(...deckLook);
    this.snap();
  }

  private restoreGuide() {
    if (!this.guidePose || !this.guide) return;
    this.guide.root.position.copy(this.guidePose.position);
    this.guide.root.rotation.y = this.guidePose.yaw;
    this.guide.setAnim(this.guidePose.anim);
    this.guidePose = undefined;
  }

  private atHut() {
    this.inBay = false;
    this.surface = null;
    this.home = true;
    this.host.dry();
    this.fauna?.dispose();
    this.fauna = undefined;
    const { x, y, z } = this.player!.root.position, guide = this.guide!.root.position;
    this.stage.shiftY = 0.04;
    this.stage.pos.set(x + 0.74, y + 1.44, z - 0.32);
    this.stage.look.set(guide.x, guide.y + 1.15, guide.z);
    this.snap();
    this.line("ct_home");
  }

  private line(key: string) {
    this.waiting = true;
    void this.dialogue.say(this.situation, this.definition.npc, key).then(() => {
      if (this.active) this.waiting = false;
    });
  }

  private async observation(question: string, group: "spot" | "count") {
    this.waiting = true;
    const { npc } = this.definition;
    const asked = await this.dialogue.say(this.situation, npc, question);
    if (!this.active || !asked) return;
    const keys = this.definition.hints![group].items.map(({ id }) => id);
    const answer = await this.dialogue.expect(this.situation, npc, keys, undefined, CENOTE_TOUR_ACCEPT);
    if (!this.active || !answer) return;
    keepPhrases(this.situation, [answer.sentence]);
    await this.dialogue.say(this.situation, npc, acknowledgments[answer.key]);
    if (this.active) this.waiting = false;
  }

  private cue(at: typeof cues[number]) {
    switch (at) {
      case 6: this.stopIndex = 0; this.line("ct_fresh"); break;
      case 14:
        this.state = "transit";
        this.stopIndex = -1;
        this.guide!.setAnim("wave");
        this.line("ct_walk");
        break;
      case CUT_TO_BAY:
        this.fade.start(() => {
          this.restoreGuide();
          this.dialogue.clearLine();
          this.inBay = true;
          this.stage.shiftY = 0.15;
        }, 0);
        break;
      case 22: this.state = "swim"; break;
      case 24: this.line("ct_fish"); break;
      case 32: this.state = "turn"; this.stopIndex = 1; void this.observation("ct_see", "spot"); break;
      case 42: this.resume("swim"); break;
      case 49: this.line("ct_turtle"); break;
      case 52: this.state = "turn"; this.stopIndex = 2; void this.observation("ct_howmany", "count"); break;
      case 62: this.resume("returning"); this.line("ct_back"); break;
      case CUT_TO_HUT:
        this.fade.start(() => this.atHut(), 0);
        break;
      case 76: this.finish(); break;
    }
  }

  private resume(state: "swim" | "returning") {
    this.state = state;
    this.stopIndex = -1;
    this.dialogue.clearLine();
    useCenoteTour.setState({ answer: null });
  }

  update(frame: ModeFrame) {
    this.paused = frame.blocked || this.host.paused();
    const dt = Math.min(0.05, Math.max(0, frame.dt));
    if (this.paused) { this.dialogue.update(0, true); return; }
    this.dialogue.update(dt, false);
    let left = dt;
    while (left > 1e-8 && this.active) {
      const next = cues[this.nextCue];
      const step = Math.min(left, next - this.elapsed);
      this.fade.update(step);
      this.elapsed += step;
      left -= step;
      if (this.elapsed < next - 1e-8) break;
      this.elapsed = next;
      if (this.waiting && (next === CUT_TO_BAY || next === 32 || next === 42 || next === 52 || next === 62 || next === 76)) break;
      this.nextCue++;
      this.cue(next);
    }
    if (!this.active) return;
    if (this.inBay) this.swim(dt, frame.time);
    else if (!this.home && this.elapsed >= 14 && this.elapsed < CUT_TO_BAY) {
      const guide = this.guide!;
      const { shore, deckGuide } = this.route;
      const coast = Math.atan2(shore[0] - deckGuide[0], shore[1] - deckGuide[1]);
      guide.root.rotation.y += (coast - guide.root.rotation.y) * Math.min(1, 4 * dt);
      guide.update(dt);
    } else this.guide?.update(dt);
  }

  private swim(dt: number, time: number) {
    this.wildlifeTime += dt;
    const eye = this.stage.pos;
    const surface = swimAt(this.route, Math.max(CUT_TO_BAY + CUT_SWAP, this.elapsed), time, eye);
    const submerged = eye.y < surface;
    this.surface = submerged ? surface : null;
    const heading = aimSwim(this.route, this.elapsed, this.wildlifeTime, time, eye, this.stage.look, this.target);
    this.player!.root.position.set(eye.x, Math.max(floorY(eye.x, eye.z), eye.y - 1.2), eye.z);
    this.player!.root.rotation.y = heading;
    this.snap();
    if (submerged && !this.fauna) {
      this.fauna = new CenoteAnimals(this.route);
      this.host.add(this.fauna.group);
    }
    this.fauna?.update(submerged, this.wildlifeTime, time, eye, this.elapsed);
  }

  input(input: Extract<ModeInput, { kind: "key" }>) {
    return !input.repeat && !this.paused && this.dialogue.key(input.key);
  }

  action(name: string, value?: string | boolean) {
    if (this.paused) return;
    if (name === "choose" && typeof value === "string") this.dialogue.choose(value);
    if (name === "mic") this.dialogue.setMic(value === true);
  }

  snapshot() {
    const camera = this.host.rig.cam, time = this.host.time(), { x, y, z } = camera.position;
    const animals = this.fauna?.inspect(camera, time) ?? [];
    return {
      state: this.state, stopIndex: this.stopIndex, elapsed: this.elapsed,
      lineKey: useCenoteTour.getState().line?.key ?? null, animalCount: animals.length, animals,
      design: this.fauna?.design ?? null,
      viewer: { x, y, z, time, surfaceY: waterY(x, z, time), floorY: floorY(x, z), submerged: this.surface !== null },
    };
  }

  dispose() {
    if (!this.active) return;
    this.active = false;
    this.dialogue.cancel();
    resetCenoteTour();
    this.fade.clear();
    this.fauna?.dispose();
    this.restoreGuide();
    this.host.rig.stage = this.previousStage;
    if (this.player) this.player.root.visible = this.playerVisible;
  }
}
