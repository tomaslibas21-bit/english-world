import type { WebGLRenderer } from "three";
import { SEA_EDITION } from "../../content/sea";
import { useCards } from "../../state/cards";
import { countPlay } from "../../state/playStats";
import { useStore } from "../../state/store";
import { preloadSeaOverlay } from "../../ui/seaOverlay";
import { audio } from "../audio";
import type { ModeFrame, ModeInput } from "../kit/modes";
import type { Ride } from "../rides/Rides";
import { readBest, saveBest } from "../road/ghost";
import { gateSayItTarget, gateWord, keepRunPhrases, RunScore } from "../road/run";
import { loadPool, makePicker, type Clip, type Pool, type Prompt } from "../road/words";
import { SeaBoat } from "./boat";
import { SeaGate } from "./buoys";
import { FIRST_GATE, nextGate, SEA_SECONDS, WIDE_GATE_VIEW } from "./course";
import type { SeaHost } from "./entry";
import { resetSeaUi, useSea } from "./store";
import { SeaView } from "./view";

const driveKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
const edition = SEA_EDITION.id;

export async function prepareSea() {
  const progress = useStore.getState().progress, cards = useCards.getState().cards;
  const [pool] = await Promise.all([
    audio.init().then(() => loadPool(progress, cards, (...clip) => audio.hasClip(...clip)))
      .catch((): Pool => ({ words: [], gaps: [] })),
    preloadSeaOverlay(),
  ]);
  const pick = makePicker(pool);
  return { pool, pick, first: pick(0) };
}

export type PreparedSea = Awaited<ReturnType<typeof prepareSea>>;

export class SeaMode {
  private phase: "town" | "drive" | "turn" | "result" | "unavailable" = "town";
  private readonly view: SeaView;
  private boat: SeaBoat;
  private score = new RunScore(SEA_SECONDS);
  private pick: ReturnType<typeof makePicker>;
  private best = readBest(edition, undefined, "sea");
  private gate?: SeaGate;
  private gateAt = FIRST_GATE;
  private nextPromptIn = 0;
  private feedback = 0;
  private sailed = 0;
  private lastLabels = -Infinity;
  private reveal?: { clip: Clip; in: number };
  private returning = false;

  constructor(private host: SeaHost, private source: Ride, private prepared: PreparedSea) {
    const m = source.m;
    this.boat = new SeaBoat(m.x, m.z, m.heading, m.speed);
    this.view = new SeaView(source, host.player().root, host.rig.cam, host.environment(), host.rides.buoys);
    this.pick = prepared.pick;
  }

  get active() { return this.phase !== "town"; }

  start() {
    this.host.entered("sea");
    this.host.clearTownHud();
    audio.stopAmbience();
    this.begin(this.prepared.first);
  }

  private begin(prompt?: Prompt) {
    this.score = new RunScore(SEA_SECONDS);
    this.gateAt = FIRST_GATE;
    this.nextPromptIn = this.feedback = this.sailed = 0;
    this.reveal = undefined;
    this.lastLabels = -Infinity;
    this.view.begin(this.boat);
    resetSeaUi();
    if (!prompt) {
      this.phase = "unavailable";
      useSea.setState({ phase: this.phase });
      this.quiet();
      return;
    }
    this.phase = "drive";
    useStore.getState().setHud({ ride: "boat" });
    useSea.setState({ phase: this.phase });
    countPlay("games", "sea");
    this.openGate(prompt);
  }

  private play({ voice, speed, say, male }: Clip) {
    void audio.play(voice, speed, say, { male, slow: !!useStore.getState().settings.slowVoice });
  }

  private openGate(prompt = this.pick(this.score.total)) {
    if (!prompt) return;
    this.gate = new SeaGate(this.gateAt, prompt, this.boat.startX, this.boat.startZ - this.gateAt);
    this.poseGate(this.host.time());
    this.view.scene.add(this.gate.mesh);
    useSea.setState({ prompt, sayIt: this.score.sayIt.open(gateSayItTarget(prompt)), anchors: [] });
    if (!prompt.gap) this.play(prompt.word.clip);
  }

  private poseGate(time: number, dt = 0) {
    const gate = this.gate;
    if (gate && !gate.pose(time, gate.distance - this.boat.distance, Math.min(1, this.boat.age / 0.65), dt)) this.closeGate();
  }

  private closeGate() {
    this.score.sayIt.close();
    this.gate?.dispose();
    this.gate = undefined;
    useSea.setState({ prompt: undefined, sayIt: undefined, anchors: [] });
  }

  private answer(gate: SeaGate, time: number) {
    this.score.sayIt.close();
    const { prompt, distance } = gate;
    const lane = this.boat.lane;
    const correct = this.score.answer(prompt, lane);
    if (correct) {
      this.boat.boost = 1.2;
      this.view.celebrate(this.boat, time);
      audio.sfx("seaBell");
    } else {
      this.boat.wobble = 1;
      audio.bump(0.72);
      this.play(prompt.word.clip);
    }
    let correction = 0;
    if (prompt.gap) {
      if (correct) this.play(prompt.gap.clip);
      else {
        const { voice, speed, say } = prompt.word.clip;
        correction = Math.min(1.8, (audio.clipDuration(voice, speed, say) ?? 0.75) + 0.32);
        this.reveal = { clip: prompt.gap.clip, in: correction };
      }
    }
    this.feedback = correct ? 1.23 : 2.3;
    this.nextPromptIn = prompt.gap
      ? Math.max(2.5, Math.min(4.8, correction + (audio.clipDuration(prompt.gap.clip.voice, prompt.gap.clip.speed, prompt.gap.clip.say) ?? 2.5)))
      : this.feedback;
    this.gateAt = nextGate(distance);
    gate.cross(lane, correct);
    this.poseGate(time);
    useSea.setState({ sayIt: undefined, streak: this.score.streak, feedback: { correct, word: prompt.word } });
  }

  update({ dt, time, x, y, blocked }: ModeFrame) {
    if (this.returning || blocked || (this.phase !== "drive" && this.phase !== "turn")) return;
    if (this.phase === "turn") {
      const turned = this.boat.advanceTurn(dt);
      this.pose(time, dt);
      if (turned) {
        if (this.score.total) this.finish();
        else this.returnToTown(false);
      }
      return;
    }

    dt = Math.min(dt, SEA_SECONDS - this.score.elapsed);
    const { distance: oldDistance, x: oldX } = this.boat;
    const turn = this.boat.drive(dt, x, y);
    this.sailed += Math.hypot(this.boat.distance - oldDistance, this.boat.x - oldX);
    const ended = this.score.advance(dt);
    this.pose(time, dt);

    if (this.reveal && (this.reveal.in -= dt) <= 0) {
      this.play(this.reveal.clip);
      this.reveal = undefined;
    }
    if (this.feedback > 0 && (this.feedback -= dt) <= 0) useSea.setState({ feedback: undefined });
    if (this.gate && !this.gate.crossed) {
      if (this.boat.distance >= this.gate.distance) this.answer(this.gate, time);
      else this.poseGate(time);
    } else {
      this.poseGate(time, dt);
      if ((this.nextPromptIn -= dt) <= 0 && !ended && !this.gate) this.openGate();
    }
    const remaining = Math.ceil(SEA_SECONDS - this.score.elapsed);
    if (useSea.getState().remaining !== remaining) useSea.setState({ remaining });
    if (ended) this.finish();
    else if (turn) this.turnAround();
  }

  private pose(time: number, dt: number) {
    const { speed } = this.boat, player = this.host.player();
    player.steer = -this.boat.lateral / 12;
    player.update(dt);
    audio.motor("boat", Math.min(1.25, speed / 16));
    audio.rush("wind", Math.max(0, (speed - 6) / 14), Math.min(1, speed / 16));
    const gate = this.gate;
    this.view.day = this.score.elapsed / SEA_SECONDS;
    this.view.pose(this.boat, time, dt, this.host.portrait(), gate && !gate.crossed ? gate.distance - this.boat.distance : undefined);
  }

  private turnAround() {
    this.phase = "turn";
    this.closeGate();
    this.reveal = undefined;
    audio.stop();
    this.boat.turnAround();
    useSea.setState({ phase: this.phase, feedback: undefined });
  }

  private finish() {
    this.phase = "result";
    this.closeGate();
    this.quiet();
    const { score } = this;
    const best = { points: score.points, frames: [] };
    const record = saveBest(edition, best, this.best, undefined, "sea");
    if (record) this.best = best;
    const cards = keepRunPhrases(score);
    useStore.getState().setHud({ ride: null });
    useSea.setState({ phase: this.phase, feedback: undefined, result: {
      points: score.points, right: score.right, total: score.total, streak: score.bestStreak, distance: this.sailed,
      record, cards, missed: [...score.missed.values()], ...score.sayIt.result,
    } });
  }

  private quiet() {
    audio.stop();
    audio.motor(null);
    audio.rush("wind", 0);
  }

  render(renderer: Pick<WebGLRenderer, "render">, width: number, height: number) {
    if (!this.active) return false;
    const anchors = this.view.render(renderer, width, height, this.gate);
    const now = performance.now();
    if (this.gate && (this.gate.crossed || now - this.lastLabels >= 30)) {
      this.lastLabels = now;
      useSea.setState({ anchors, wideLabels: width >= WIDE_GATE_VIEW });
    }
    return true;
  }

  input(input: ModeInput) {
    if (input.kind !== "key") return true;
    if (input.key === "escape" && !input.repeat) { this.exit(false); return true; }
    if (this.phase !== "drive" || !driveKeys.has(input.key)) return false;
    input.keys.add(input.key);
    return true;
  }

  action(name: string, value?: string | boolean) {
    if (this.returning) return;
    if (this.phase === "drive") {
      if (name === "steer" && typeof value === "string") this.steer(Number(value));
      if (name === "replay" && this.gate && !this.gate.crossed && !this.gate.prompt.gap) {
        useSea.getState().sayIt?.cancel();
        this.play(this.gate.prompt.word.clip);
      }
    }
    if (this.phase === "result") {
      if (name === "guide") this.returnToTown(true);
      if (name === "again") {
        const { worldX, worldZ, heading, speed } = this.boat;
        this.boat = new SeaBoat(worldX, worldZ, heading, speed);
        this.pick = makePicker(this.prepared.pool);
        this.begin(this.pick(0));
      }
    }
  }

  private returnToTown(onFoot: boolean) {
    if (this.returning) return;
    this.returning = this.host.fade(() => this.leave(true, onFoot));
    if (this.returning) this.quiet();
  }

  exit(immediate: boolean) {
    if (!this.active) return;
    if (immediate) this.leave(!this.returning, false);
    else if (!this.returning) {
      if (this.phase === "drive") this.turnAround();
      else if (this.phase !== "turn") this.returnToTown(false);
    }
  }

  private leave(restoreTown: boolean, onFoot: boolean) {
    if (!this.active) return;
    this.phase = "town";
    this.closeGate();
    this.view.dispose();
    this.quiet();
    if (restoreTown) this.host.returnBoat(this.source, onFoot);
    resetSeaUi();
    this.host.left("sea");
  }

  steer(lane: number) { if (this.phase === "drive") this.boat.steer(lane); }

  jumpTimer(seconds = SEA_SECONDS) {
    if (this.phase === "drive" && Number.isFinite(seconds)) {
      this.score.elapsed = Math.min(SEA_SECONDS, Math.max(this.score.elapsed, seconds));
    }
  }

  debug() {
    const { boat, score, view } = this;
    const gate = this.gate?.crossed ? undefined : this.gate;
    if (!this.active) return { phase: this.phase };
    return {
      phase: this.returning ? "return" : this.phase, boat: this.source.id, elapsed: score.elapsed, duration: SEA_SECONDS,
      lane: boat.lane, x: boat.worldX, z: boat.worldZ, heading: boat.heading, speed: boat.speed,
      boost: boat.boost, wobble: boat.wobble, gateDistance: gate && gate.distance - boat.distance,
      gates: gate?.prompt.options, right: gate?.prompt.right, totalGates: score.total, rightGates: score.right, streak: score.streak,
      word: gate && gateWord(gate.prompt), gap: !!gate?.prompt.gap, points: score.points, said: score.sayIt.count,
      result: useSea.getState().result, camera: { position: view.camera.position.toArray(), rotation: view.camera.quaternion.toArray(), fov: view.camera.fov },
      hull: this.source.mesh.position.toArray(), hullFrame: view.hullFrame(),
    };
  }
}
