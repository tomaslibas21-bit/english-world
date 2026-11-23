import { Vector3, type Camera } from "three";
import { ASK_WAY_LINES, ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_SITUATION, ASK_WAY_UI } from "../../content/ask-way-lines";
import { LOCATIONS } from "../../content/locations";
import { PHOTO_THINGS, PHOTO_WALK_ACCEPT, PHOTO_WALK_LINES, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION, PHOTO_WALK_UI } from "../../content/photo-walk-lines";
import type { PhotoSpot, PhotoThingId } from "../../content/townQuests";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { countPlay } from "../../state/playStats";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import { ModeDialogue } from "../kit/dialogue";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeInput } from "../kit/modes";
import { takePhoto, savePhoto } from "./photos";
import { EMPTY_WALK, photoNameMatcher, photoWalkTransition } from "./state";
import { EMPTY_QUEST_UI, MIC_OFF, useTownQuests, type Destination } from "./store";

type View = { id: PhotoThingId; x: number; y: number };
type World = {
  spots: PhotoSpot[];
  walking(): boolean;
  available(): boolean;
  zone(): string;
  guide(location: string): void;
  animate(seconds: number): void;
};

const things = new Map(PHOTO_THINGS.map((thing) => [thing.id, thing]));
const ui = useTownQuests.setState;
const walk = () => useStore.getState().progress.photoWalk ?? EMPTY_WALK;
function change(action: Parameters<typeof photoWalkTransition>[1]) {
  const before = walk(), after = photoWalkTransition(before, action);
  if (after !== before) useStore.getState().updateProgress((p) => { p.photoWalk = after; });
  return after !== before;
}
function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class TownQuests implements GameMode {
  readonly id = "photowalk";
  readonly cleanScreen = "menu";
  get active() { return useTownQuests.getState().screen !== null || this.shutter !== null; }
  private aim: View | null = null;
  private shutter: View | null = null;
  private jpeg: string | null = null;
  private reader: ReturnType<typeof createSpeechAttempt> | null = null;
  private arrived = 0;
  private arrivalTime = 0;
  private readonly projected = new Vector3();
  private readonly dialogue = new ModeDialogue({
    say: (line) => ui({ line }), choices: (choices) => ui({ choices }), mic: (mic) => ui({ mic }),
    animate: (seconds) => this.world.animate(seconds), allowBrowserVoice: true, framePlayback: true,
  });
  private readonly replay = new ModeDialogue({
    say() {}, choices() {}, mic() {}, allowBrowserVoice: true, framePlayback: true,
  });

  constructor(private host: ModeHost, private world: World) {}

  handlesNpc(npc: string) {
    return npc === PHOTO_WALK_NPC && walk().status !== "off";
  }

  marker(npc: string) {
    return npc === ASK_WAY_NPC || (npc === PHOTO_WALK_NPC && (walk().status === "off" || walk().status === "found"));
  }

  event(name: string, data: unknown): undefined {
    if (name === this.id && this.world.zone() === "town" && change({ type: "accept" })) countPlay("games", this.id);
    if (name === "directions-asked") countPlay("games", "directions");
    if (name === "directions") {
      const dest = (data as { dest?: unknown } | null)?.dest;
      const place = ASK_WAY_PLACES.find((place) => place.id === dest);
      if (!place) return;
      this.stopReplay();
      ui({ directions: place });
    }
  }

  start(option?: string) {
    const status = walk().status;
    if (this.active || status === "off" || !this.host.canStart(true)) return false;
    if (option === "visit" && !this.world.walking()) return false;
    if (option === "camera" && (status !== "on" || !this.world.walking())) return false;
    this.stopReplay();
    this.dialogue.micOn = false;
    if (option === "camera" && this.aim) {
      this.shutter = this.aim;
      this.host.entered(this.id);
      audio.sfx("shutter");
      return true;
    }
    if (option === "visit" && status === "paused") change({ type: "resume" });
    const finale = option === "visit" && status === "found";
    ui({ screen: finale ? "finale" : "book", visit: option === "visit" && !finale });
    this.host.entered(this.id);
    if (finale) void this.finale();
    else if (option === "visit") void this.say(status === "done" ? "pw_thanks_again" : "pw_going");
    return true;
  }

  private say(key: string) {
    return this.dialogue.say(PHOTO_WALK_SITUATION, PHOTO_WALK_NPC, key, PHOTO_WALK_LINES);
  }

  private async finale() {
    if (!await this.say("pw_fin_1")) return;
    for (const [answer, replies] of [
      ["pw_a_here", ["pw_fin_2", "pw_fin_3"]],
      ["pw_a_welcome", ["pw_fin_bye"]],
    ] as const) {
      const line = await this.dialogue.expect(PHOTO_WALK_SITUATION, PHOTO_WALK_NPC, [answer], PHOTO_WALK_LINES, PHOTO_WALK_ACCEPT);
      if (!line) return;
      for (const reply of replies) if (!await this.say(reply)) return;
    }
    change({ type: "finish" });
    this.dialogue.clearLine();
    ui({ screen: "book" });
  }

  private see(camera: Camera): View | null {
    const p = this.host.player().root.position, found = walk().found;
    let best: View | null = null, closest = Infinity;
    for (const spot of this.world.spots) {
      if (found.includes(spot.id)) continue;
      const d = Math.hypot(spot.x - p.x, spot.z - p.z);
      if (d > things.get(spot.id)!.near || d >= closest) continue;
      const point = this.projected.set(spot.x, spot.y, spot.z).project(camera);
      if (point.z <= -1 || point.z >= 1 || Math.abs(point.x) > 0.98 || Math.abs(point.y) > 0.98) continue;
      closest = d;
      best = { id: spot.id, x: point.x, y: point.y };
    }
    return best;
  }

  observe(camera: Camera) {
    const cameraOn = walk().status === "on" && this.world.walking();
    if (cameraOn) camera.updateMatrixWorld();
    this.aim = cameraOn ? this.see(camera) : null;
    const near = this.aim?.id ?? null, state = useTownQuests.getState();
    if (state.camera !== cameraOn || state.near !== near) ui({ camera: cameraOn, near });
  }

  capture(canvas: HTMLCanvasElement) {
    const view = this.shutter;
    if (!view) return;
    this.shutter = null;
    this.jpeg = takePhoto(canvas, view.x, view.y);
    const others = shuffle(PHOTO_THINGS.map(({ id }) => id).filter((id) => id !== view.id)).slice(0, 2);
    ui({ screen: "quiz", quiz: { id: view.id, choices: shuffle([...others, view.id]), misses: [], wrong: false, got: false } });
  }

  private stopMic() {
    const reader = this.reader;
    this.reader = null;
    reader?.dispose();
    ui({ mic: MIC_OFF });
  }

  private listen() {
    if (this.reader) { this.stopMic(); return; }
    const quiz = useTownQuests.getState().quiz;
    if (!quiz || quiz.got || !speechSupported() || document.hidden) return;
    const { read, phrases } = photoNameMatcher(quiz.id);
    const reader = createSpeechAttempt({
      phrases, preferLocal: useStore.getState().settings.onDevice,
      evaluate: (text) => read(text).verdict,
      onUpdate: ({ status, heard }) => {
        if (this.reader !== reader) return;
        if (status === "denied" || status === "error" || status === "nothing") this.stopMic();
        else ui({ mic: { status: status === "starting" ? "starting" : status === "idle" ? "off" : "listening", heard } });
      },
      onCommit: (text, alternatives) => {
        if (this.reader !== reader) return;
        this.stopMic();
        if ([text, ...alternatives].some((heard) => !!read(heard).answer)) this.pick(quiz.id);
        else ui({ quiz: { ...quiz, wrong: true } });
      },
    });
    this.reader = reader;
    reader.start();
  }

  private pick(id: string) {
    const quiz = useTownQuests.getState().quiz;
    if (!quiz || quiz.got || !quiz.choices.includes(id as PhotoThingId)) return;
    this.stopMic();
    if (id !== quiz.id) {
      ui({ quiz: { ...quiz, misses: [...new Set([...quiz.misses, id as PhotoThingId])], wrong: true } });
      return;
    }
    if (!change({ type: "find", id: quiz.id })) return;
    if (this.jpeg) savePhoto(quiz.id, this.jpeg);
    this.jpeg = null;
    ui({ quiz: { ...quiz, got: true, wrong: false } });
    if (walk().status === "found") useStore.getState().toast({ kind: "success", title: PHOTO_WALK_UI.allFound });
    void this.say(`pw_n_${quiz.id}`);
  }

  action(name: string, value?: string | boolean) {
    const { screen, quiz } = useTownQuests.getState();
    if (screen === "quiz") {
      if (name === "pick" && typeof value === "string") this.pick(value);
      if (name === "mic") this.listen();
      if (name === "book" && quiz?.got) {
        // Keep the name's voice playing as the book opens.
        ui({ screen: "book", quiz: null });
      }
    }
    if (screen === "finale") {
      if (name === "choose" && typeof value === "string") this.dialogue.choose(value);
      if (name === "mic") this.dialogue.setMic(!!value);
    }
    if (screen === "book") {
      if (name === "pause" && change({ type: "pause" })) {
        this.exit();
        useStore.getState().toast({ kind: "info", title: PHOTO_WALK_UI.paused });
      }
      if (name === "resume" && change({ type: "resume" })) this.exit();
      if (name === "quit" && change({ type: "quit" })) this.exit();
    }
  }

  directionAction(name: string) {
    const { directions, replaying } = useTownQuests.getState();
    if (!directions || !this.world.available()) return;
    if (name === "close") this.clearDirections();
    if (name === "guide") this.world.guide(directions.location);
    if (name === "replay" && !replaying) void this.replayDirections(directions);
  }

  private async replayDirections(directions: Destination) {
    ui({ replaying: true });
    for (const line of directions.lines) {
      if (!await this.replay.say(ASK_WAY_SITUATION, ASK_WAY_NPC, line, ASK_WAY_LINES)) break;
    }
    ui({ replaying: false });
  }

  stopReplay() {
    if (useTownQuests.getState().replaying) {
      this.replay.cancel();
      ui({ replaying: false });
    }
  }

  private clearDirections() {
    this.stopReplay();
    ui({ directions: null });
  }

  private checkArrival() {
    const { directions } = useTownQuests.getState();
    if (!directions) return;
    const { location } = directions, zone = this.world.zone();
    const door = this.host.doors.find((door) => door.loc === location);
    const p = this.host.player().root.position;
    if (zone !== location && !(zone === "town" && door && Math.hypot(p.x - door.outX, p.z - door.outZ) <= 6)) return;
    this.clearDirections();
    this.arrivalTime = 0.9;
    ui({ arrival: ++this.arrived });
    audio.sfx("success");
    useStore.getState().toast({ kind: "success", title: ASK_WAY_UI.arrived, body: LOCATIONS[location].lt });
  }

  tick(dt: number) {
    const hidden = document.hidden, available = this.world.available();
    if (hidden && this.reader) this.stopMic();
    this.dialogue.update(dt, hidden);
    if (available) {
      this.replay.update(dt, hidden);
      this.checkArrival();
    } else this.stopReplay();
    if (this.arrivalTime > 0 && (this.arrivalTime -= dt) <= 0) ui({ arrival: 0 });
  }


  update() {}
  input(input: ModeInput) {
    if (input.kind !== "key") return false;
    if (input.key === "escape") { this.exit(); return true; }
    return useTownQuests.getState().screen === "finale" && this.dialogue.key(input.key);
  }

  exit() {
    this.shutter = null;
    this.jpeg = null;
    this.stopMic();
    this.dialogue.cancel();
    ui({ screen: null, quiz: null, visit: false });
    this.host.left(this.id);
  }

  dispose() {
    this.exit();
    this.stopReplay();
    ui(EMPTY_QUEST_UI);
  }
}
