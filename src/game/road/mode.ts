import type { WebGLRenderer } from "three";
import { ROAD_EDITION } from "../../content/road";
import { ROAD_ACCEPT, ROAD_LINES } from "../../content/road-lines";
import { countPlay } from "../../state/playStats";
import { useStore } from "../../state/store";
import { preloadRoadOverlay } from "../../ui/roadOverlay";
import { boardFaces, preloadBoardFont } from "../kit/boardFaces";
import { audio } from "../audio";
import { ModeDialogue } from "../kit/dialogue";
import type { ModeFrame, ModeInput } from "../kit/modes";
import type { Ride } from "../rides/Rides";
import { CAR_SEATS } from "../rides/shapes";
import { carHasRoof, carModelEntry } from "../world/carModels";
import { exitCoordinates } from "../world/roadExit";
import { TAXI } from "../world/layout";
import type { RoadHost, WalkEdge } from "./entry";
import { Gate, LANE_PAINT } from "./gates";
import { ghostAt, GhostRecorder, readBest, saveBest } from "./ghost";
import { karaoke, WRONG_PHRASE_DELAY } from "./karaoke";
import { Lift } from "./lift";
import { loadPhrasePool } from "./phrasePool";
import { gatesLeft } from "./review";
import { DRIVE_SECONDS, FIRST_GATE, gateSayItTarget, gateWord, nextGate, RunScore, keepRunPhrases, loadWordPrompts, practiceResult, rememberRun, runPicker } from "./run";
import { isPlayWay, playWay, setPlayWay, type PlayWay } from "./save";
import { RoadCar } from "./steering";
import { resetRoadUi, useRoad } from "./store";
import { course, laneAt, laneOffset, point, Track } from "./track";
import { RoadView } from "./view";
import type { Clip, Phrase, Prompt, PromptPool } from "./words";

const { driver, id: edition } = ROAD_EDITION;
const driveKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "]);
const taxiSize = carModelEntry(TAXI.model).collisionBox;

type Run = {
  track: Track; view: RoadView; car: RoadCar; score: RunScore;
  pick?: ReturnType<typeof runPicker>; way: PlayWay; ghost: GhostRecorder;
  gate?: Gate; gateAt: number; promptIn: number; feedback: number; reveal?: ({ clip: Clip } | { phrase: Phrase }) & { in: number };
  distance: number; sampledTime: number; nextPrompt?: Prompt; target?: number; drifting?: boolean;
  forced?: boolean;
};

function rideSize(source: Ride) {
  return { width: source.m.spec.wide * 2, length: source.m.spec.half * 2 };
}

export async function prepareRoad(host: RoadHost, source: Ride) {
  const [pool] = await Promise.all([loadWordPrompts(), preloadRoadOverlay()]);
  const first = runPicker(pool, edition, "words")([], 18);
  if (first) await preloadBoardFont(first.options);
  return new PreparedRoad(host, source, pool, first);
}

export class PreparedRoad {
  private track?: Track;
  private view?: RoadView;
  private gate?: Gate;
  private index = 0;
  private warming?: Promise<unknown>;
  ready = false;
  failed = false;
  private disposed = false;

  constructor(private host: RoadHost, readonly source: Ride, readonly pool: PromptPool, private first?: Prompt) {
    this.ready = !first;
  }

  stage(renderer: WebGLRenderer) {
    if (this.ready || this.warming || this.disposed || this.failed || !this.first) return;
    const track = this.track ??= new Track(this.host.roadOpening());
    if (this.index < 5) { track.prepare(this.index++); return; }
    const model = carModelEntry(this.source.model ?? TAXI.model);
    const view = this.view = new RoadView(this.source.mesh, rideSize(this.source), model);
    view.prepareDeparture(this.host.environment());
    const gate = this.gate = new Gate(FIRST_GATE, this.first, view.gateMaterial);
    view.scene.add(track.group, gate.mesh);
    view.stream(track, 0, 0, true);
    this.warming = view.models.then(async () => {
      if (this.disposed) return;
      view.props.update(track, true, true);
      await renderer.compileAsync(view.scene, view.camera);
      this.ready = !this.disposed;
    })
      .catch((error) => { this.failed = true; console.warn("Road shaders could not load", error); })
      .finally(() => {
        this.warming = undefined;
        if (this.disposed || this.failed) this.release();
      });
  }

  take() {
    const { track, view, gate } = this;
    this.track = this.view = this.gate = undefined;
    return track && view && gate ? { track, view, gate } : undefined;
  }

  dispose() {
    this.disposed = true;
    if (!this.warming) this.release();
  }

  private release() {
    this.gate?.dispose();
    this.track?.dispose();
    this.view?.dispose();
    this.track = this.view = this.gate = undefined;
  }
}

export class RoadMode {
  private phase: "town" | "briefing" | "loading" | "approach" | "offer" | "depart" | "drive" | "result" | "unavailable" = "town";
  private source?: Ride;
  private run?: Run;
  private lift?: Lift;
  private returnedTaxi?: { lift: Lift; ride: Ride };
  private pool?: Promise<PromptPool>;
  private crest?: PromptPool;
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
  get padDriving() { return this.phase === "drive"; }
  get lifted() { return !!this.lift; }

  start(edge: WalkEdge) {
    this.session = {};
    resetRoadUi();
    this.host.entered("road");
    this.host.clearTownHud();
    this.phase = "approach";
    this.pool = loadWordPrompts();
    this.host.prepare();
    this.lift = new Lift(this.host, edge);
    this.host.hideNpc(driver.npc, true);
    useRoad.setState({ phase: "lift" });
  }

  startFromCrest(prepared: PreparedRoad) {
    this.session = {};
    this.source = prepared.source;
    this.pool = Promise.resolve(prepared.pool);
    resetRoadUi();
    this.host.entered("road");
    this.host.clearTownHud();
    const setup = prepared.take();
    this.brief();
    if (!setup) return;
    const { view, track, gate } = setup, car = new RoadCar(), { m, mesh } = prepared.source;
    car.x = exitCoordinates(m.x, m.z).x;
    car.speed = Math.max(0, m.speed);
    const heading = m.heading - ROAD_EDITION.edge.outward;
    car.yaw = Math.atan2(Math.sin(heading), Math.cos(heading)) + Math.PI - course(0);
    car.slide = -m.slip * Math.cos(heading) - m.speed * Math.sin(heading);
    const dimensions = this.host.viewport();
    view.depart(mesh, this.host.player().root, this.host.rig.cam, dimensions.width, dimensions.height);
    const run = this.newRun(track, view, car);
    run.gate = gate;
    this.crest = prepared.pool;
  }

  private brief() {
    this.phase = "briefing";
    useRoad.setState({ phase: "briefing", way: playWay(useStore.getState().progress, edition, "road") });
  }

  private unavailable() {
    this.phase = "unavailable";
    useRoad.setState({ phase: "unavailable" });
  }

  private async begin(session: object, way: PlayWay) {
    this.phase = "loading";
    useRoad.setState({ phase: "loading", way });
    const pool = await (way === "phrases" ? loadPhrasePool().catch(() => undefined) : this.pool);
    if (this.session !== session) return;
    const pick = pool && runPicker(pool, edition, way);
    const first = pick?.([], 18);
    if (first) await preloadBoardFont(first.options);
    if (this.session !== session) return;
    if (!first || !pick) { this.unavailable(); return; }
    if (this.driveFromCrest(way, pick, first)) return;
    const mesh = this.source?.mesh ?? this.lift?.take();
    if (!mesh) { this.unavailable(); return; }
    const size = this.source ? rideSize(this.source) : taxiSize;
    const seat = this.run?.view.seatedPose();
    this.clearRun();
    const model = carModelEntry(this.source?.model ?? TAXI.model);
    const track = new Track(this.host.roadOpening()), view = new RoadView(mesh, size, model), car = new RoadCar();
    view.scene.add(track.group);
    if (seat) view.seatPlayer(this.host.player().root, seat.position, seat.rotation);
    if (this.lift) {
      const ch = this.lift.driver;
      ch.busy = null;
      ch.recline = 0.12;
      ch.root.position.set(CAR_SEATS.passenger[0], CAR_SEATS.floor, CAR_SEATS.passenger[1]);
      ch.root.rotation.y = 0;
      // (beside the learner under the taxi's roof: heard, not seen)
      ch.root.visible = !carHasRoof(TAXI.model);
      ch.setAnim("sit");
      ch.update(0.05);
      view.passenger(ch.root);
    }
    const run = this.newRun(track, view, car, pick, way);
    view.stream(track, 0, 0);
    view.pose(car.pose, undefined, 0.7, false, 0, 0, 0);
    this.drive(run);
    this.openGate(run, first);
  }

  private driveFromCrest(way: PlayWay, pick: NonNullable<Run["pick"]>, prompt: Prompt) {
    const run = this.run;
    if (!this.crest || !run?.gate) return false;
    this.crest = undefined;
    run.pick = pick;
    run.way = way;
    run.gate.prompt = prompt;
    this.drive(run);
    this.showGate(run.gate, run.score);
    return true;
  }

  private newRun(track: Track, view: RoadView, car: RoadCar, pick?: Run["pick"], way: PlayWay = "words") {
    const run: Run = this.run = {
      track, view, car, score: new RunScore(), pick, way, ghost: new GhostRecorder(),
      gateAt: FIRST_GATE, promptIn: 0, feedback: 0, distance: 0, sampledTime: 0,
    };
    run.ghost.sample(0, car.pose);
    return run;
  }

  private drive(run: Run) {
    this.phase = "drive";
    useStore.getState().setHud({ ride: "car" });
    audio.stopAmbience();
    countPlay("games", "road");
    useRoad.setState({ phase: "drive", way: run.way, remaining: DRIVE_SECONDS, streak: 0, ghost: !!this.best, result: undefined, feedback: undefined });
  }

  private warmNextPrompt(run: Run) {
    const { car, score, gateAt } = run;
    const time = score.duration - score.elapsed;
    const cruise = 16.2 + 9.6 * (score.elapsed + time / 2) / score.duration;
    const remaining = gatesLeft(gateAt - car.s, cruise * time, nextGate(0, score.total + 1));
    run.nextPrompt = run.pick?.(score.history, remaining);
    if (run.nextPrompt) void preloadBoardFont(run.nextPrompt.options);
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
      this.brief();
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

  private openGate(run: Run, prompt = run.nextPrompt) {
    if (!prompt) return;
    run.nextPrompt = undefined;
    run.gate = new Gate(run.gateAt, prompt, run.view.gateMaterial);
    run.view.scene.add(run.gate.mesh);
    this.showGate(run.gate, run.score);
  }

  private showGate(gate: Gate, score: RunScore) {
    const { prompt, id } = gate;
    useRoad.setState({ prompt, gateId: id, sayIt: score.sayIt.open(gateSayItTarget(prompt)) });
    if (prompt.phrase) karaoke.road.prompt(prompt.phrase.pClip);
    else if (!prompt.gap) this.play(prompt.word.clip);
  }

  private updateRun(frame: ModeFrame, run: Run) {
    const { car, score, view, track } = run;
    const dt = Math.min(frame.dt, DRIVE_SECONDS - score.elapsed);
    if (run.reveal && (run.reveal.in -= (run.way === "phrases" ? frame.dt : dt)) <= 0) {
      if ("phrase" in run.reveal) {
        run.feedback = 0;
        useRoad.setState({ feedback: undefined });
        karaoke.road.show(run.reveal.phrase);
      } else this.play(run.reveal.clip);
      run.reveal = undefined;
    }
    if (dt <= 0) {
      if (score.elapsed >= DRIVE_SECONDS && !this.finishingPhrase(run)) this.finish(run);
      return;
    }
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

    if (run.gate?.crossed && !run.gate.animatePass(dt, car.s)) {
      run.gate.dispose();
      run.gate = undefined;
      useRoad.setState({ prompt: undefined, gateId: undefined });
    }
    if (run.gate && !run.gate.crossed && car.s >= run.gate.distance) {
      score.sayIt.close();
      const { prompt, distance } = run.gate;
      const lane = import.meta.env.DEV && run.forced !== undefined
        ? (run.forced ? prompt.right : (prompt.right + 1) % 3) : laneAt(car.x);
      run.forced = undefined;
      const correct = score.answer(prompt, lane);
      if (correct) {
        car.boost = Math.max(car.boost, 1.2);
        view.celebrate(frame.time, distance, lane, LANE_PAINT[lane]);
        audio.kickRush();
        audio.sfx("success");
        audio.sfx("paperBurst"); // with the confetti of the right gate
      } else {
        car.stumble();
        audio.sfx("error");
      }
      let correction = 0;
      if (prompt.phrase) {
        if (correct) karaoke.road.show(prompt.phrase);
        else { audio.stop(); run.reveal = { phrase: prompt.phrase, in: WRONG_PHRASE_DELAY }; }
      } else if (!correct) this.play(prompt.word.clip);
      if (prompt.gap) {
        if (correct) this.play(prompt.gap.clip);
        else {
          const { voice, speed, say } = prompt.word.clip;
          correction = Math.min(1.8, (audio.clipDuration(voice, speed, say) ?? 0.75) + 0.32);
          run.reveal = { clip: prompt.gap.clip, in: correction };
        }
      }
      run.gate.cross(lane, correct);
      run.target = undefined;
      run.feedback = correct ? 1.23 : 2.3;
      run.promptIn = prompt.gap ? Math.max(2.5, Math.min(4.8, correction + (audio.clipDuration(prompt.gap.clip.voice, prompt.gap.clip.speed, prompt.gap.clip.say) ?? 2.5))) : run.feedback;
      run.gateAt = nextGate(distance, score.total);
      this.warmNextPrompt(run);
      useRoad.setState({ sayIt: undefined, streak: score.streak, feedback: { correct, word: prompt.word } });
    } else {
      if (run.feedback > 0 && (run.feedback -= dt) <= 0) useRoad.setState({ feedback: undefined });
      if ((run.promptIn -= dt) <= 0 && !ended && !run.gate) this.openGate(run);
    }
    const pace = car.boost > 0 ? Math.max(1.08, motion.pace) : motion.pace;
    view.pose(car.pose, this.best && ghostAt(this.best.frames, score.elapsed), pace, motion.drifting,
      car.wobble, frame.time, dt, car.boost > 0, car.speed);
    if (view.hasSeatedPlayer) {
      const player = this.host.player();
      player.steer = -car.yaw * 3;
      player.update(dt);
    }
    const remaining = Math.ceil(DRIVE_SECONDS - score.elapsed), wind = motion.pace > 0.7 || car.boost > 0;
    const ui = useRoad.getState();
    if (ui.remaining !== remaining || ui.wind !== wind) useRoad.setState({ remaining, wind });
    if (ended && !this.finishingPhrase(run)) this.finish(run);
  }

  private finishingPhrase(run: Run) { return run.way === "phrases" && (run.reveal || karaoke.road.visible); }

  private finish(run: Run) {
    this.phase = "result";
    run.score.sayIt.close();
    run.gate?.dispose();
    run.gate = undefined;
    karaoke.road.stop();
    audio.stop();
    audio.motor(null);
    audio.rush("wind", 0);
    audio.rush("squeal", 0);
    const { score } = run;
    rememberRun(edition, run.way, score.history);
    const best = { points: score.points, frames: run.ghost.frames };
    const record = saveBest(edition, best, this.best);
    if (record) this.best = best;
    const cards = keepRunPhrases(score);
    useStore.getState().setHud({ ride: null });
    useRoad.setState({ phase: "result", feedback: undefined, prompt: undefined, gateId: undefined, sayIt: undefined, wind: false, result: {
      points: score.points, right: score.right, total: score.total, streak: score.bestStreak, distance: run.distance,
      record, cards, ...practiceResult(score, run.way), ...score.sayIt.result,
    } });
    if (this.lift) void this.say("rd_end");
  }

  render(renderer: WebGLRenderer, width: number, height: number) {
    const run = this.run;
    if (!run) return false;
    run.view.render(renderer, width, height, run.gate);
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
    if (name === "start" && isPlayWay(value)) this.startWay(value);
    if (import.meta.env.DEV && name === "way" && this.phase === "briefing" && isPlayWay(value)) useRoad.setState({ way: value });
    if (name === "choose" && typeof value === "string") this.dialogue.choose(value);
    if (name === "mic" && typeof value === "boolean") {
      this.dialogue.setMic(value);
      useRoad.setState({ micOn: value });
    }
    if (name === "replay" && this.run?.gate && !this.run.gate.crossed && !this.run.gate.prompt.gap) {
      useRoad.getState().sayIt?.cancel();
      const { prompt } = this.run.gate;
      if (prompt.phrase) karaoke.road.prompt(prompt.phrase.pClip, true);
      else this.play(prompt.word.clip);
    }
    if (name === "horn" && this.phase === "drive" && this.host.time() - this.hornAt >= 0.36) {
      this.hornAt = this.host.time();
      audio.sfx("horn");
    }
    if (name === "guide" && this.phase === "result") this.exit(false, true);
    if (name === "again" && this.phase === "result" && this.session) {
      this.dialogue.cancel();
      this.session = {};
      this.brief();
    }
  }

  startWay(way: PlayWay) {
    if (this.phase !== "briefing" || !this.session) return false;
    useStore.getState().updateProgress((progress) => setPlayWay(progress, edition, "road", way));
    if (way === "phrases") audio.primeFile();
    const first = this.run?.gate?.prompt;
    if (way === "words" && this.crest && first) return this.driveFromCrest(way, runPicker(this.crest, edition, way), first);
    void this.begin(this.session, way);
    return true;
  }

  private clearRun() {
    if (!this.run) return;
    this.run.score.sayIt.close();
    this.run.gate?.dispose();
    this.run.track.dispose();
    this.run.view.dispose();
    this.run = undefined;
  }

  exit(immediate: boolean, onFoot = false) {
    const usedRoad = !!this.run?.pick;
    if (this.phase === "drive" && this.run) rememberRun(edition, this.run.way, this.run.score.history);
    this.phase = "town";
    this.session = null;
    this.dialogue.cancel();
    karaoke.road.stop();
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
    this.crest = undefined;
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

  previewOptions(options?: readonly string[]) {
    const gate = this.run?.gate;
    if (gate && !gate.crossed) useRoad.setState({ prompt: options ? { ...gate.prompt, options: [...options] } : gate.prompt });
  }

  forceGate(correct: boolean) {
    if (!import.meta.env.DEV || this.phase !== "drive" || !this.run) return false;
    this.run.forced = correct;
    const gate = this.run.gate;
    if (gate && !gate.crossed) this.steer(correct ? gate.prompt.right : (gate.prompt.right + 1) % 3);
    return true;
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
      settleFrame: run?.view.settleFraming(),
      visibleGhost: run?.view.visibleGhost, continuity: run?.view.departureDebug(), renderSerial: run && boardFaces.road.serial, registration: run && boardFaces.road.debug(),
      hazards: run && [...run.track.pieces.values()].flatMap(({ index, features }) => features.map((feature, i) => {
        const { x, z } = point(feature.s, feature.x);
        return { kind: feature.kind, id: `${index}:${i}`, x, z, hit: feature.hit, lane: laneAt(feature.x), s: feature.s };
      })),
      propBatches: run?.view.props.drawnBatches,
      nextRamp: run && [...run.track.pieces.values()].flatMap(({ features }) => features)
        .filter(({ kind, s }) => kind === "ramp" && s > run.car.s).sort((a, b) => a.s - b.s)
        .map(({ s, x }) => ({ distance: s - run.car.s, lane: laneAt(x) }))[0],
      pieces: run?.track.pieces.size, released: run?.track.released,
      gates: gate?.prompt.options, right: gate?.prompt.right, gateDistance: run && gate && gate.distance - run.car.s,
      ...(import.meta.env.DEV ? { way: ui.way, phrasePrompt: gate?.prompt.phrase && { p: gate.prompt.phrase.p, pClip: gate.prompt.phrase.pClip },
        karaoke: karaoke.road.debug() } : {}),
      word: gate && gateWord(gate.prompt), gap: !!gate?.prompt.gap, points: run?.score.points, said: run?.score.sayIt.count,
      rightGates: run?.score.right, totalGates: run?.score.total, streak: run?.score.streak, result: ui.result,
      choices: ui.choices.map(({ key }) => key), line: ui.line?.key, liftFrame: this.lift?.framing(), ghost: !!this.best };
  }
}
