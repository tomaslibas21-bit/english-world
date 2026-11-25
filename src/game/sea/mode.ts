import type { WebGLRenderer } from "three";
import { SEA_EDITION } from "../../content/sea";
import { countPlay } from "../../state/playStats";
import { useStore } from "../../state/store";
import { preloadSeaOverlay } from "../../ui/seaOverlay";
import { boardFaces, preloadBoardFont } from "../kit/boardFaces";
import { audio } from "../audio";
import type { ModeFrame, ModeInput } from "../kit/modes";
import type { Ride } from "../rides/Rides";
import { readBest, saveBest } from "../road/ghost";
import { karaoke, WRONG_PHRASE_DELAY } from "../road/karaoke";
import { loadPhrasePool } from "../road/phrasePool";
import { gatesLeft } from "../road/review";
import { gateSayItTarget, gateWord, keepRunPhrases, loadWordPrompts, practiceResult, rememberRun, runPicker, RunScore } from "../road/run";
import { isPlayWay, playWay, setPlayWay, type PlayWay } from "../road/save";
import type { Clip, Phrase, Prompt } from "../road/words";
import { seaSoundLevels, type SeaSoundLevels } from "../soundscape";
import { SeaBoat } from "./boat";
import { SeaGate } from "./buoys";
import { CRUISE_SPEED, FIRST_GATE, GATE_SPACING, nextGate, SEA_SECONDS } from "./course";
import { TITLE_SECONDS, titleOpacity } from "./crossing";
import { seaReturn, type SeaHost } from "./entry";
import { resetSeaUi, showCrossingTitle, useSea, type CrossingTitle } from "./store";
import { SeaView } from "./view";

const driveKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
const edition = SEA_EDITION.id;

export async function prepareSea() {
  const [pool] = await Promise.all([loadWordPrompts(), preloadSeaOverlay()]);
  const first = runPicker(pool, edition, "words")([], 15);
  if (first) await preloadBoardFont(first.options);
  return { pool, first };
}

export type PreparedSea = Awaited<ReturnType<typeof prepareSea>>;

export class SeaMode {
  private phase: "town" | "briefing" | "loading" | "drive" | "turn" | "result" | "unavailable" = "town";
  private readonly view: SeaView;
  private boat: SeaBoat;
  private score = new RunScore(SEA_SECONDS);
  private pick?: ReturnType<typeof runPicker>;
  private way: PlayWay = "words";
  private played = false;
  private forced?: boolean;
  private best = readBest(edition, undefined, "sea");
  private gate?: SeaGate;
  private gateAt = FIRST_GATE;
  private nextPromptIn = 0;
  private feedback = 0;
  private sailed = 0;
  private reveal?: ({ clip: Clip } | { phrase: Phrase }) & { in: number };
  private crossing?: CrossingTitle;
  private soundFrom: SeaSoundLevels = { surf: 0, wind: 0 };
  private soundAge = 0;
  private returning?: { matched?: number; presented: boolean };
  private guideAge?: number;
  /** Seconds to the next far-off gull. */
  private gullIn = 5;

  constructor(private host: SeaHost, private source: Ride, private prepared: PreparedSea) {
    const m = source.m;
    this.boat = new SeaBoat(m.x, m.z, m.heading, m.speed);
    this.view = new SeaView(source, host.player().root, host.rig.cam, host.environment(), host.rides.buoys);
  }

  get active() { return this.phase !== "town"; }
  get handingOff() { return !!this.returning?.presented; }
  get guiding() { return this.guideAge !== undefined; }
  get padDriving() { return this.phase === "drive" && !this.returning && !this.guiding; }

  start() {
    this.host.entered("sea");
    this.host.clearTownHud();
    this.soundFrom = audio.seaSoundTargets();
    resetSeaUi();
    this.view.begin(this.boat, true);
    this.brief();
  }

  private brief() {
    this.phase = "briefing";
    useSea.setState({ phase: "briefing", way: playWay(useStore.getState().progress, edition, "sea") });
  }

  private async begin(way: PlayWay) {
    this.phase = "loading";
    useSea.setState({ phase: "loading", way });
    const pool = way === "phrases" ? await loadPhrasePool().catch(() => undefined) : this.prepared.pool;
    if (this.phase !== "loading" || this.returning) return;
    const pick = pool && runPicker(pool, edition, way);
    const warm = way === "words" && !this.played ? this.prepared.first : undefined;
    const prompt = warm ?? pick?.([], 15);
    if (prompt && !warm) await preloadBoardFont(prompt.options);
    if (this.phase !== "loading" || this.returning) return;
    if (!prompt) {
      this.phase = "unavailable";
      useSea.setState({ phase: this.phase });
      this.quiet();
      return;
    }
    if (this.played) {
      const { worldX, worldZ, heading, speed } = this.boat;
      this.boat = new SeaBoat(worldX, worldZ, heading, speed);
      this.view.begin(this.boat, false);
      this.soundFrom = audio.seaSoundTargets();
    }
    this.crossing = this.played ? undefined : { opacity: 0 };
    this.played = true;
    this.pick = pick;
    this.way = way;
    this.score = new RunScore(SEA_SECONDS);
    this.gateAt = FIRST_GATE;
    this.nextPromptIn = this.feedback = this.sailed = 0;
    this.reveal = this.forced = undefined;
    this.soundAge = 0;
    this.gullIn = 5;
    resetSeaUi();
    this.phase = "drive";
    useStore.getState().setHud({ ride: "boat" });
    useSea.setState({ phase: this.phase, way, crossing: this.crossing });
    countPlay("games", "sea");
    this.openGate(prompt);
  }

  private play({ voice, speed, say, male }: Clip) {
    void audio.play(voice, speed, say, { male, slow: !!useStore.getState().settings.slowVoice });
  }

  private playPrompt(prompt: Prompt, replay = false) {
    if (prompt.phrase) karaoke.sea.prompt(prompt.phrase.pClip, replay);
    else if (!prompt.gap) this.play(prompt.word.clip);
  }

  private nextPrompt() {
    const time = this.score.duration - this.score.elapsed;
    const pace = (CRUISE_SPEED + this.boat.speed) / 2;
    const remaining = gatesLeft(this.gateAt - this.boat.distance, time * pace, GATE_SPACING);
    return this.pick?.(this.score.history, remaining);
  }

  private openGate(prompt = this.nextPrompt()) {
    if (!prompt) return;
    this.gate = new SeaGate(this.gateAt, prompt, this.boat.startX, this.boat.startZ - this.gateAt);
    this.poseGate(this.host.time());
    this.view.scene.add(this.gate.mesh);
    useSea.setState({ prompt, gateId: this.gate.id, sayIt: this.score.sayIt.open(gateSayItTarget(prompt)) });
    void preloadBoardFont(prompt.options);
    if (!this.crossing) this.playPrompt(prompt);
  }

  private poseGate(time: number, dt = 0) {
    const gate = this.gate;
    if (gate && !gate.pose(time, gate.distance - this.boat.distance, Math.min(1, this.boat.age / 0.65), dt)) this.closeGate();
  }

  private closeGate() {
    this.score.sayIt.close();
    this.gate?.dispose();
    this.gate = undefined;
    useSea.setState({ prompt: undefined, gateId: undefined, sayIt: undefined, answeredLane: undefined });
  }

  private answer(gate: SeaGate, time: number) {
    this.score.sayIt.close();
    const { prompt, distance } = gate;
    const lane = import.meta.env.DEV && this.forced !== undefined
      ? (this.forced ? prompt.right : (prompt.right + 1) % 3) : this.boat.lane;
    this.forced = undefined;
    const correct = this.score.answer(prompt, lane);
    if (correct) {
      this.boat.boost = 1.2;
      this.view.celebrate(this.boat, time);
      audio.sfx("seaBell");
      audio.sfx("gateWhoosh");
      audio.sfx("bowSplash", 0.7); // the speed lift throws spray over the bow
    } else {
      this.boat.wobble = 1;
      if (!audio.sample("buoyBonk")) audio.bump(0.72);
      if (!prompt.phrase) this.play(prompt.word.clip);
    }
    if (prompt.phrase) {
      if (correct) karaoke.sea.show(prompt.phrase);
      else { audio.stop(); this.reveal = { phrase: prompt.phrase, in: WRONG_PHRASE_DELAY }; }
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
    useSea.setState({ sayIt: undefined, answeredLane: lane, streak: this.score.streak, feedback: { correct, word: prompt.word } });
  }

  update({ dt, time, x, y, blocked }: ModeFrame) {
    const returning = this.returning;
    if (returning) {
      if (returning.presented) this.leave(false, this.view.handoff(returning.matched!));
      else if (!blocked) {
        const reached = this.boat.advanceTurn(dt);
        this.pose(time, dt);
        if (reached) returning.matched = time;
      }
      return;
    }
    if (blocked || (this.phase !== "drive" && this.phase !== "turn")) return;
    if (this.phase === "turn") {
      const turned = this.boat.advanceTurn(dt);
      this.pose(time, dt);
      if (turned) this.finish();
      return;
    }

    const step = Math.min(dt, SEA_SECONDS - this.score.elapsed);
    if (this.reveal && (this.reveal.in -= (this.way === "phrases" ? dt : step)) <= 0) {
      if ("phrase" in this.reveal) {
        this.feedback = 0;
        useSea.setState({ feedback: undefined });
        karaoke.sea.show(this.reveal.phrase);
      } else this.play(this.reveal.clip);
      this.reveal = undefined;
    }
    if (step <= 0) {
      if (this.score.elapsed >= SEA_SECONDS && !this.finishingPhrase()) this.finish();
      return;
    }
    dt = step;
    const { distance: oldDistance, x: oldX } = this.boat;
    const turn = this.boat.drive(dt, x, y);
    this.sailed += Math.hypot(this.boat.distance - oldDistance, this.boat.x - oldX);
    const ended = this.score.advance(dt);
    this.pose(time, dt);

    if (this.crossing) {
      if (this.boat.age + 1e-8 >= TITLE_SECONDS) {
        this.clearTitle();
        const prompt = this.gate?.prompt;
        if (prompt) this.playPrompt(prompt);
      } else showCrossingTitle(this.crossing, titleOpacity(this.boat.age));
    }
    if (this.feedback > 0 && (this.feedback -= dt) <= 0) useSea.setState({ feedback: undefined });
    if (this.gate && !this.gate.crossed) {
      if (this.boat.distance >= this.gate.distance) this.answer(this.gate, time);
      else this.poseGate(time);
    } else {
      this.poseGate(time, dt);
      if ((this.nextPromptIn -= dt) <= 0 && !ended && !this.gate) this.openGate();
    }
    // gulls far off, now and then (recorded only: no synthesized stand-in out here)
    if ((this.gullIn -= dt) <= 0) { this.gullIn = 7 + Math.random() * 9; audio.sfx("gull", 0.6 + 0.4 * Math.random()); }
    const remaining = Math.ceil(SEA_SECONDS - this.score.elapsed);
    if (useSea.getState().remaining !== remaining) useSea.setState({ remaining });
    if (ended) {
      if (!this.finishingPhrase()) this.finish();
    } else if (turn) this.turnAround();
  }

  private finishingPhrase() { return this.way === "phrases" && (this.reveal || karaoke.sea.visible); }

  private pose(time: number, dt: number) {
    const { speed } = this.boat, player = this.host.player();
    player.steer = -this.boat.lateral / 12;
    player.update(dt);
    this.soundAge += dt;
    const { surf, wind } = seaSoundLevels(this.soundFrom, speed, this.soundAge, !!this.returning);
    audio.ambience(!globalThis.document?.hidden && !useStore.getState().hud.panel, { surf, gulls: false });
    audio.motor("boat", Math.min(1.25, speed / this.source.m.spec.max));
    audio.rush("wind", globalThis.document?.hidden ? 0 : wind, Math.min(1, speed / 16));
    const gate = this.gate;
    this.view.day = this.score.elapsed / SEA_SECONDS;
    this.view.pose(this.boat, time, dt, this.host.portrait(), gate && !gate.crossed ? gate.distance - this.boat.distance : undefined);
  }

  private clearTitle() {
    if (!this.crossing) return;
    this.crossing = undefined;
    useSea.setState({ crossing: undefined });
  }

  private turnAround() {
    if (!this.score.total) { this.returnToTown(false); return; }
    this.clearTitle();
    this.phase = "turn";
    this.closeGate();
    this.reveal = undefined;
    karaoke.sea.stop();
    audio.stop();
    audio.sfx("boatTurn");
    this.boat.turnAround();
    useSea.setState({ phase: this.phase, feedback: undefined });
  }

  private finish() {
    this.phase = "result";
    this.closeGate();
    this.clearTitle();
    this.quiet();
    const { score } = this;
    rememberRun(edition, this.way, score.history);
    const best = { points: score.points, frames: [] };
    const record = saveBest(edition, best, this.best, undefined, "sea");
    if (record) this.best = best;
    const cards = keepRunPhrases(score);
    useStore.getState().setHud({ ride: null });
    useSea.setState({ phase: this.phase, feedback: undefined, result: {
      points: score.points, right: score.right, total: score.total, streak: score.bestStreak, distance: this.sailed,
      record, cards, ...practiceResult(score, this.way), ...score.sayIt.result,
    } });
  }

  private quiet() {
    karaoke.sea.stop();
    audio.stop();
    audio.stopAmbience();
    audio.motor(null);
    audio.rush("wind", 0);
  }

  render(renderer: Pick<WebGLRenderer, "render">, width: number, height: number) {
    if (!this.active) return false;
    this.view.render(renderer, width, height, this.gate);
    if (this.returning?.matched !== undefined) this.returning.presented = true;
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
    if (name === "start" && isPlayWay(value)) this.startWay(value);
    if (import.meta.env.DEV && name === "way" && this.phase === "briefing" && isPlayWay(value)) useSea.setState({ way: value });
    if (this.phase === "drive") {
      if (name === "steer" && typeof value === "string") this.steer(Number(value));
      if (name === "replay" && !this.crossing && this.gate && !this.gate.crossed && !this.gate.prompt.gap) {
        useSea.getState().sayIt?.cancel();
        this.playPrompt(this.gate.prompt, true);
      }
    }
    if (this.phase === "result") {
      if (name === "guide") this.returnToTown(true);
      if (name === "again") this.brief();
    }
  }

  startWay(way: PlayWay) {
    if (this.returning || this.phase !== "briefing") return false;
    useStore.getState().updateProgress((progress) => setPlayWay(progress, edition, "sea", way));
    if (way === "phrases") audio.primeFile();
    void this.begin(way);
    return true;
  }

  private returnToTown(onFoot: boolean) {
    if (this.returning || this.guiding) return;
    if (onFoot) {
      this.guideAge = 0;
      this.leave(true);
      return;
    }
    this.phase = "turn";
    this.clearTitle();
    this.closeGate();
    this.reveal = undefined;
    karaoke.sea.stop();
    audio.stop();
    audio.sfx("boatTurn");
    this.soundFrom = audio.seaSoundTargets();
    this.soundAge = 0;
    this.returning = { presented: false };
    this.view.startReturn(seaReturn(this.source), this.boat.commitReturn(), this.host.rides);
    useStore.getState().setHud({ ride: "boat" });
    useSea.setState({ phase: this.phase, feedback: undefined, result: undefined });
  }

  tickGuide(dt: number) {
    if (this.guideAge === undefined) return;
    this.guideAge += dt;
    if (this.guideAge + 1e-8 < 0.16) return;
    this.guideAge = undefined;
    resetSeaUi();
    this.host.left("sea");
  }

  exit(immediate: boolean) {
    if (immediate && this.guiding) {
      this.tickGuide(0.16);
      return;
    }
    if (!this.active) return;
    if (immediate) this.leave(false);
    else if (!this.returning) {
      if (this.phase === "drive") this.turnAround();
      else if (this.phase !== "turn") this.returnToTown(false);
    }
  }

  private leave(onFoot: boolean, handoff?: ReturnType<SeaView["handoff"]>) {
    if (!this.active) return;
    if (!this.returning && (this.phase === "drive" || this.phase === "turn")) rememberRun(edition, this.way, this.score.history);
    this.phase = "town";
    this.reveal = undefined;
    this.closeGate();
    this.view.dispose();
    if (!handoff) this.quiet();
    this.host.returnBoat(this.source, onFoot, handoff);
    if (this.guiding) useSea.setState({ phase: "guide" });
    else {
      resetSeaUi();
      this.host.left("sea");
    }
  }

  steer(lane: number) { if (this.phase === "drive") this.boat.steer(lane); }

  forceGate(correct: boolean) {
    if (!import.meta.env.DEV || this.phase !== "drive") return false;
    this.forced = correct;
    const gate = this.gate;
    if (gate && !gate.crossed) this.steer(correct ? gate.prompt.right : (gate.prompt.right + 1) % 3);
    return true;
  }

  jumpTimer(seconds = SEA_SECONDS) {
    if (this.phase === "drive" && Number.isFinite(seconds)) {
      this.score.elapsed = Math.min(SEA_SECONDS, Math.max(this.score.elapsed, seconds));
    }
  }

  debug() {
    const { boat, score, view } = this;
    const gate = this.gate?.crossed ? undefined : this.gate;
    if (!this.active) return { phase: this.phase, gateDistance: undefined };
    return {
      phase: this.phase, boat: this.source.id, elapsed: score.elapsed, duration: SEA_SECONDS,
      lane: boat.lane, x: boat.worldX, z: boat.worldZ, heading: boat.heading, speed: boat.speed,
      renderSerial: boardFaces.sea.serial, registration: boardFaces.sea.debug(),
      boost: boat.boost, wobble: boat.wobble, gateDistance: gate && gate.distance - boat.distance,
      gates: gate?.prompt.options, right: gate?.prompt.right, totalGates: score.total, rightGates: score.right, streak: score.streak,
      ...(import.meta.env.DEV ? { way: useSea.getState().way, phrasePrompt: gate?.prompt.phrase && { p: gate.prompt.phrase.p, pClip: gate.prompt.phrase.pClip },
        karaoke: karaoke.sea.debug() } : {}),
      word: gate && gateWord(gate.prompt), gap: !!gate?.prompt.gap, points: score.points, said: score.sayIt.count,
      result: useSea.getState().result, ...view.debug(this.host.time()), hullFrame: view.hullFrame(),
    };
  }
}
