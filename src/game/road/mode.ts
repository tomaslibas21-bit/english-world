import type { WebGLRenderer } from "three";
import { ROAD_EDITION } from "../../content/road";
import { ROAD_ACCEPT, ROAD_LINES } from "../../content/road-lines";
import { useCards } from "../../state/cards";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import { ModeDialogue } from "../kit/dialogue";
import type { ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases } from "../kit/phrases";
import type { Ride } from "../rides/Rides";
import { CAR_SEATS } from "../rides/shapes";
import { carModelEntry } from "../world/carModels";
import { TAXI } from "../world/layout";
import type { RoadHost, WalkEdge } from "./entry";
import { Gate, LANE_PAINT } from "./gates";
import { ghostAt, GhostRecorder, readBest, saveBest } from "./ghost";
import { Lift } from "./lift";
import { DRIVE_SECONDS, FIRST_GATE, nextGate, RunScore } from "./run";
import { RoadCar } from "./steering";
import { resetRoadUi, useRoad } from "./store";
import { laneAt, laneOffset, Track } from "./track";
import { RoadView } from "./view";
import { loadPool, makePicker, type Clip, type Pool } from "./words";

const { driver, id: edition } = ROAD_EDITION;
const driveKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "]);
const taxiSize = carModelEntry(TAXI.model).collisionBox;

type Run = {
  track: Track; view: RoadView; car: RoadCar; score: RunScore;
  pick: ReturnType<typeof makePicker>; ghost: GhostRecorder;
  gate?: Gate; gateAt: number; promptIn: number; feedback: number; reveal?: { clip: Clip; in: number };
  distance: number; sampledTime: number; target?: number; lastLabels: number; drifting?: boolean;
};

export class RoadMode {
  private phase: "town" | "loading" | "approach" | "offer" | "depart" | "drive" | "result" | "unavailable" = "town";
  private source?: Ride;
  private run?: Run;
  private lift?: Lift;
  private returnedTaxi?: { lift: Lift; ride: Ride };
  private pool?: Promise<Pool>;
  private session: object | null = null;
  private best = readBest(edition);
  private hornAt = -Infinity;
  private dialogue = new ModeDialogue({
    say: (line) => useRoad.setState({ line }),
    choices: (choices) => useRoad.setState({ choices }),
    mic: (mic) => useRoad.setState({ mic }),
    animate: (seconds) => this.lift?.talk(seconds),
    speechFallback: true,
  });

  constructor(private host: RoadHost) {}
  get active() { return this.phase !== "town"; }
  get lifted() { return !!this.lift; }

  start(edge?: WalkEdge) {
    const session = this.session = {};
    resetRoadUi();
    this.host.entered("road");
    this.host.clearTownHud();
    this.phase = edge ? "approach" : "loading";
    const progress = useStore.getState().progress;
    const cards = useCards.getState().cards;
    this.pool = audio.init().then(() => loadPool(progress, cards, (...clip) => audio.hasClip(...clip)))
      .catch(() => ({ words: [], gaps: [] }));
    if (edge) {
      this.host.prepare();
      this.lift = new Lift(this.host, edge);
      this.host.hideNpc(driver.npc, true);
      useRoad.setState({ phase: "lift" });
    } else {
      this.source = this.host.rides.riding ?? undefined;
      void this.begin(session);
    }
  }

  private async begin(session: object) {
    this.phase = "loading";
    useRoad.setState({ phase: "loading" });
    const pool = await this.pool;
    if (this.session !== session) return;
    const pick = pool && makePicker(pool);
    const first = pick?.(0);
    const mesh = this.source?.mesh ?? this.lift?.take();
    if (!first || !pick || !mesh) {
      this.phase = "unavailable";
      useRoad.setState({ phase: "unavailable" });
      return;
    }
    const size = this.source ? { width: this.source.m.spec.wide * 2, length: this.source.m.spec.half * 2 } : taxiSize;
    const track = new Track(), view = new RoadView(mesh, size), car = new RoadCar();
    view.scene.add(track.group);
    if (this.lift) {
      const ch = this.lift.driver;
      ch.busy = null;
      ch.recline = 0.12;
      ch.root.position.set(CAR_SEATS.passenger[0], CAR_SEATS.floor, CAR_SEATS.passenger[1]);
      ch.root.rotation.y = 0;
      ch.setAnim("sit");
      ch.update(0.05);
      view.passenger(ch.root);
    }
    const run = this.run = {
      track, view, car, score: new RunScore(), pick, ghost: new GhostRecorder(),
      gateAt: FIRST_GATE, promptIn: 0, feedback: 0, distance: 0, sampledTime: 0, lastLabels: -Infinity,
    };
    run.ghost.sample(0, car.pose);
    view.stream(track, 0, 0);
    view.pose(car.pose, undefined, 0.7, false, 0, 0, 0);
    this.phase = "drive";
    this.host.clearTownHud();
    const store = useStore.getState();
    store.setHud({ ride: "car" });
    audio.stopAmbience();
    this.openGate(run, first);
    useRoad.setState({ phase: "drive", remaining: DRIVE_SECONDS, streak: 0, ghost: !!this.best, result: undefined, feedback: undefined });
  }

  private say(key: string) { return this.dialogue.say(driver.situation, driver.npc, key, ROAD_LINES); }

  private async offer(session: object) {
    await this.say("rd_lift");
    if (this.session !== session) return;
    const answer = await this.dialogue.expect(driver.situation, driver.npc, ["rd_a_yes", "rd_a_no"], ROAD_LINES, ROAD_ACCEPT);
    if (this.session !== session) return;
    if (answer?.key === "rd_a_yes") {
      await this.say("rd_start");
      if (this.session !== session) return;
      this.dialogue.clearLine();
      void this.begin(session);
    } else {
      this.dialogue.clearLine();
      this.phase = "depart";
      this.lift?.decline();
    }
  }

  update(frame: ModeFrame) {
    const session = this.session;
    if (!session) return;
    this.dialogue.update(frame.dt, frame.blocked);
    if (frame.blocked) {
      if (this.run) { audio.motor(null); audio.rush("wind", 0); audio.rush("squeal", 0); }
      return;
    }
    if (this.phase === "approach" && this.lift?.arrive(frame.dt)) {
      this.phase = "offer";
      void this.offer(session);
    } else if (this.phase === "offer") this.lift?.updateActors(frame.dt);
    else if (this.phase === "depart" && this.lift?.leave(frame.dt)) this.exit(true);
    else if (this.phase === "drive" && this.run) this.updateRun(frame, this.run);
    else if (this.phase === "result") this.lift?.driver.update(frame.dt);
  }

  private play({ voice, speed, say, male }: Clip) {
    void audio.play(voice, speed, say, { male, slow: !!useStore.getState().settings.slowVoice });
  }

  private openGate(run: Run, prompt = run.pick(run.score.total)) {
    if (!prompt) return;
    run.gate = new Gate(run.gateAt, prompt, run.view.gateMaterial);
    run.view.scene.add(run.gate.mesh);
    useRoad.setState({ prompt, anchors: [] });
    if (!prompt.gap) this.play(prompt.word.clip);
  }

  private updateRun(frame: ModeFrame, run: Run) {
    const { car, score, view, track } = run;
    const dt = Math.min(frame.dt, DRIVE_SECONDS - score.elapsed);
    const ended = score.advance(dt);
    const oldBoost = car.boost > 0, oldWobble = car.wobble;
    const motion = car.drive({ ...frame, dt }, score.elapsed, track, run.target);
    run.distance += motion.groundDistance;
    run.sampledTime += dt;
    run.ghost.sample(run.sampledTime, car.pose);
    if (!oldBoost && car.boost > 0) audio.kickRush();
    if (car.wobble > oldWobble + 0.05) audio.bump(0.6);
    audio.motor("car", motion.pace);
    audio.rush("wind", Math.max(0, (motion.pace - 0.25) * 0.9), motion.pace);
    audio.rush("squeal", motion.drifting ? 0.46 : 0, motion.pace);
    view.stream(track, car.s, score.elapsed, motion.changed);
    run.drifting = motion.drifting;
    this.lift?.driver.update(dt);

    if (run.reveal && (run.reveal.in -= dt) <= 0) {
      this.play(run.reveal.clip);
      run.reveal = undefined;
    }
    if (run.gate?.crossed && !run.gate.animatePass(dt, car.s)) {
      run.gate.dispose();
      run.gate = undefined;
      useRoad.setState({ prompt: undefined, anchors: [] });
    }
    if (run.gate && !run.gate.crossed && car.s >= run.gate.distance) {
      const { prompt, distance } = run.gate;
      const lane = laneAt(car.x);
      const correct = score.answer(prompt, lane);
      if (correct) {
        car.boost = Math.max(car.boost, 1.2);
        view.celebrate(frame.time, distance, lane, LANE_PAINT[lane]);
        audio.kickRush();
        audio.sfx("success");
      } else {
        car.stumble();
        audio.sfx("error");
      }
      let correction = 0;
      if (!correct) this.play(prompt.word.clip);
      if (prompt.gap) {
        if (correct) this.play(prompt.gap.clip);
        else {
          const { voice, speed, say } = prompt.word.clip;
          correction = Math.min(1.8, (audio.clipDuration(voice, speed, say) ?? 0.75) + 0.32);
          run.reveal = { clip: prompt.gap.clip, in: correction };
        }
      }
      run.gate.cross(lane, correct);
      run.lastLabels = -Infinity;
      run.target = undefined;
      run.feedback = correct ? 1.23 : 2.3;
      run.promptIn = prompt.gap ? Math.max(2.5, Math.min(4.8, correction + (audio.clipDuration(prompt.gap.clip.voice, prompt.gap.clip.speed, prompt.gap.clip.say) ?? 2.5))) : run.feedback;
      run.gateAt = nextGate(distance, score.total);
      useRoad.setState({ streak: score.streak, feedback: { correct, word: prompt.word } });
    } else {
      if (run.feedback > 0 && (run.feedback -= dt) <= 0) useRoad.setState({ feedback: undefined });
      if ((run.promptIn -= dt) <= 0 && !run.gate) this.openGate(run);
    }
    const pace = car.boost > 0 ? Math.max(1.08, motion.pace) : motion.pace;
    view.pose(car.pose, this.best && ghostAt(this.best.frames, score.elapsed), pace, motion.drifting,
      car.wobble, frame.time, dt, car.boost > 0);
    const remaining = Math.ceil(DRIVE_SECONDS - score.elapsed), wind = motion.pace > 0.7 || car.boost > 0;
    const ui = useRoad.getState();
    if (ui.remaining !== remaining || ui.wind !== wind) useRoad.setState({ remaining, wind });
    if (ended) this.finish(run);
  }

  private finish(run: Run) {
    this.phase = "result";
    run.gate?.dispose();
    run.gate = undefined;
    audio.stop();
    audio.motor(null);
    audio.rush("wind", 0);
    audio.rush("squeal", 0);
    const { score } = run;
    const best = { points: score.points, frames: run.ghost.frames };
    const record = saveBest(edition, best, this.best);
    if (record) this.best = best;
    const before = useCards.getState().cards.length;
    for (const { word, gap } of score.learned.values()) {
      if (gap) keepPhrases(word.situation, [gap.full]);
      else keepPhrases(word.situation, [{ en: word.en, nat: word.lt, say: word.clip.say, units: [{ en: word.en, lt: word.lt }] }]);
    }
    useStore.getState().setHud({ ride: null });
    useRoad.setState({ phase: "result", feedback: undefined, prompt: undefined, anchors: [], wind: false, result: {
      points: score.points, right: score.right, total: score.total, streak: score.bestStreak, distance: run.distance,
      record, cards: useCards.getState().cards.length - before, missed: [...score.missed.values()],
    } });
    if (this.lift) void this.say("rd_end");
  }

  render(renderer: WebGLRenderer, width: number, height: number) {
    const run = this.run;
    if (!run) return false;
    const anchors = run.view.render(renderer, width, height, run.gate);
    const now = performance.now();
    if (run.gate && now - run.lastLabels >= 30) {
      run.lastLabels = now;
      useRoad.setState({ anchors });
    }
    return true;
  }

  input(input: ModeInput) {
    if (input.kind !== "key") return true;
    if (this.dialogue.key(input.key)) return true;
    if (input.key === "escape" && !input.repeat) { this.exit(false); return true; }
    if (this.phase !== "drive") return false;
    if (input.key === "h" && !input.repeat) { this.action("horn"); return true; }
    if (!driveKeys.has(input.key)) return false;
    input.keys.add(input.key);
    return true;
  }

  action(name: string, value?: string | boolean) {
    if (name === "choose" && typeof value === "string") this.dialogue.choose(value);
    if (name === "mic" && typeof value === "boolean") {
      this.dialogue.setMic(value);
      useRoad.setState({ micOn: value });
    }
    if (name === "replay" && this.run?.gate && !this.run.gate.crossed && !this.run.gate.prompt.gap) this.play(this.run.gate.prompt.word.clip);
    if (name === "horn" && this.phase === "drive" && this.host.time() - this.hornAt >= 0.36) {
      this.hornAt = this.host.time();
      audio.sfx("horn");
    }
    if (name === "guide" && this.phase === "result") this.exit(false, true);
    if (name === "again" && this.phase === "result" && this.session) {
      this.dialogue.cancel();
      this.clearRun();
      void this.begin(this.session);
    }
  }

  private clearRun() {
    if (!this.run) return;
    this.run.gate?.dispose();
    this.run.track.dispose();
    this.run.view.dispose();
    this.run = undefined;
  }

  exit(immediate: boolean, onFoot = false) {
    const usedRoad = !!this.run;
    this.phase = "town";
    this.session = null;
    this.dialogue.cancel();
    this.clearRun();
    audio.stop();
    audio.motor(null);
    audio.rush("wind", 0);
    audio.rush("squeal", 0);
    if (this.lift) {
      this.host.deferLift();
      this.host.hideNpc(driver.npc, false);
      if (usedRoad && !immediate && !this.returnedTaxi) {
        const ride = this.host.rides.createModeCar({ ...TAXI, ...ROAD_EDITION.edge.return, id: "lift-taxi" }, this.lift.park(), () => {});
        this.returnedTaxi = { lift: this.lift, ride };
      }
      if (!usedRoad || immediate) this.lift.returnToEdge();
      this.lift.dispose();
      if (usedRoad && !immediate && this.returnedTaxi) this.host.returnCar(this.returnedTaxi.ride, onFoot);
    } else if (this.source && !immediate) this.host.returnCar(this.source, onFoot);
    this.lift = undefined;
    this.source = undefined;
    this.pool = undefined;
    resetRoadUi();
    this.host.left("road");
  }

  dispose() {
    if (this.active) this.exit(true);
    if (this.returnedTaxi) {
      this.host.rides.removeModeCar(this.returnedTaxi.ride);
      this.returnedTaxi.lift.disposeCar();
      this.returnedTaxi = undefined;
    }
  }

  steer(lane: number) {
    if (this.run && Number.isInteger(lane) && lane >= 0 && lane <= 2) this.run.target = laneOffset(lane);
  }

  jumpTimer(seconds: number) {
    if (this.phase === "drive" && this.run && Number.isFinite(seconds)) {
      this.run.score.elapsed = Math.min(DRIVE_SECONDS, Math.max(this.run.score.elapsed, seconds));
    }
  }

  debug() {
    const run = this.run, ui = useRoad.getState();
    const gate = run?.gate?.crossed ? undefined : run?.gate;
    return { phase: this.phase, lifted: this.lifted, car: this.source?.id ?? (this.lift ? "lift-taxi" : undefined),
      model: this.source?.model ?? (this.lift ? TAXI.model : undefined),
      elapsed: run?.score.elapsed, duration: DRIVE_SECONDS, distance: run?.distance,
      lane: run && laneAt(run.car.x), x: run?.car.x, speed: run?.car.speed, roadPosition: run?.car.s,
      boost: run?.car.boost, wobble: run?.car.wobble, liftHeight: run?.car.height, drifting: run?.drifting,
      fov: run?.view.camera.fov, carFrame: run?.view.carFraming(),
      nextRamp: run && [...run.track.pieces.values()].flatMap(({ features }) => features)
        .filter(({ kind, s }) => kind === "ramp" && s > run.car.s).sort((a, b) => a.s - b.s)
        .map(({ s, x }) => ({ distance: s - run.car.s, lane: laneAt(x) }))[0],
      pieces: run?.track.pieces.size, released: run?.track.released,
      gates: gate?.prompt.options, right: gate?.prompt.right, gateDistance: run && gate && gate.distance - run.car.s,
      rightGates: run?.score.right, totalGates: run?.score.total, streak: run?.score.streak, result: ui.result,
      choices: ui.choices.map(({ key }) => key), line: ui.line?.key, liftFrame: this.lift?.framing(), ghost: !!this.best };
  }
}
