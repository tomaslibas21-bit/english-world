import { PerspectiveCamera, Vector3, type Group } from "three";
import { targetLang, GYM_UI, type GyMoveId } from "../../content/gym";
import { GYM_ENTRY } from "../../content/gym-entry";
import { GYM_LINES, type GyLineId } from "../../content/gym-lines";
import { NPCS } from "../../content/npcs";
import { loadSituation } from "../../content/situations/catalog";
import { npcVoice } from "../../content/voices";
import { microphoneHandoffState, waitForMicrophone } from "../../convo/audioFocus";
import { countPlay } from "../../state/playStats";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import type { CameraRig } from "../camera";
import type { GameCharacter } from "../characters";
import type { ModeHost } from "../kit/host";
import { conversationLine } from "../kit/lines";
import type { ModeFrame, ModeInput } from "../kit/modes";
import { SayItRound, sayItWords, type SayItCue } from "../kit/sayIt";
import { GYM_MAT, GYM_STAGE } from "../world/gym";
import type { GymRoomHost } from "./entry";
import { GymPoseRig, type GymFramePoint } from "./poses";
import { GYM_CALLS, GYM_KEYS, GYM_MOVES, GymRound } from "./round";
import { useGym, type GymCaption, type GymLine } from "./store";

const LISTEN_MIN = 0.35, LINE_MIN = 1, FEEDBACK_MIN = 0.8;
// Leave room for the ordinary rig's breathing and the extrema between pose samples.
const EPSILON = 1e-6, SLACK = 14;
const npc = NPCS[GYM_ENTRY.npc];
const keys = GYM_KEYS.map(([, arrow]) => arrow.toLowerCase());
const stoppedObserving = () => {};

export async function loadGymSituation() {
  // The gym's recording lines are available locally even if the conversation chunk cannot be loaded.
  await loadSituation(GYM_ENTRY.situation).catch(() => null);
}

function bindActor(ch: GameCharacter) {
  return {
    ch, pose: new GymPoseRig(ch),
    home: {
      pos: ch.root.position.clone(), rot: ch.root.rotation.clone(), visible: ch.root.visible, anim: ch.anim,
      busy: ch.busy, watch: ch.watch, steady: ch.steady, attentive: ch.attentive, fidgets: ch.fidgets,
      lift: ch.lift, tuck: ch.tuck, squash: ch.squash, flip: ch.flip, bank: ch.bank, moveSpeed: ch.moveSpeed,
    },
  };
}

type Actor = ReturnType<typeof bindActor>;

function stand(actor: Actor, at: typeof GYM_STAGE.player) {
  const { ch, pose } = actor;
  ch.root.position.set(at.x, 0, at.z);
  ch.root.visible = true;
  ch.setAnim("idle");
  ch.busy = ch.watch = null;
  ch.steady = ch.fidgets = false;
  ch.attentive = true;
  ch.lift = ch.tuck = ch.squash = ch.flip = ch.bank = ch.moveSpeed = 0;
  pose.stand(at.heading);
}

function restoreActor({ ch, pose, home }: Actor) {
  const { pos, rot, visible, anim, ...rest } = home;
  ch.root.position.copy(pos);
  ch.root.rotation.copy(rot);
  ch.root.visible = visible;
  ch.setAnim(anim);
  Object.assign(ch, rest);
  pose.restore();
}

function saveCamera(rig: CameraRig) {
  const { cam } = rig;
  return {
    mode: rig.mode, stage: rig.stage, yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist, viewShift: { ...rig.viewShift },
    view: cam.view ? { ...cam.view } : null, zoom: cam.zoom, fov: cam.fov, near: cam.near,
  };
}

type Voice = {
  controller: AbortController;
  deadline: number;
  muted: boolean;
  startedAt: number | null;
  result?: boolean;
};
type FrameSize = { width: number; height: number; top: number; bottom: number };
type Run = {
  room: Group;
  player: Actor;
  trainer: Actor;
  camera: ReturnType<typeof saveCamera>;
  stage: NonNullable<CameraRig["stage"]>;
  points: GymFramePoint[];
  frame: FrameSize | null;
  heading: number;
  lines: Record<GyLineId, GymLine>;
  round: GymRound;
  sayIt: SayItRound;
  cue: SayItCue | null;
  unsubscribe: (() => void) | null;
  elapsed: number;
  gapEnd: number | null;
  line: GymLine | null;
  voice: Voice | null;
  audible: boolean;
  fallback: boolean;
  revealed: boolean;
  heard: boolean;
  appliedProgress: number | null;
  leaving: boolean;
  done: boolean;
};

function lines() {
  const keys = Object.keys(GYM_LINES) as GyLineId[];
  return Object.fromEntries(keys.map((key) => {
    const sentence = conversationLine(GYM_ENTRY.situation, GYM_ENTRY.npc, key, GYM_LINES, false)!;
    return [key, { key, sentence }];
  })) as Record<GyLineId, GymLine>;
}

declare global {
  interface Window {
    __gym?: { state(): ReturnType<GymMode["debug"]> };
  }
}

export class GymMode {
  readonly id = "gym";
  readonly exitLabel = GYM_UI.exit;
  private opening: object | null = null;
  private run: Run | null = null;
  private generation = 0;
  private stopObserving?: () => void;
  private probe = new PerspectiveCamera();
  private projected = new Vector3();
  private debugHook = { state: () => this.debug() };

  constructor(private host: ModeHost, private world: GymRoomHost) {}

  get active() { return !!this.opening || !!this.run; }
  get modal() { return !!this.opening || !!this.run?.leaving; }
  get camera() { return this.run ? "stage" as const : undefined; }

  ownsNpc(id: string) {
    return id === GYM_ENTRY.npc && !!this.run && this.world.room() === this.run.room;
  }

  open(room: Group, player: GameCharacter, trainer: GameCharacter) {
    if (this.active || !this.host.owns(this.id)) return false;
    const request = this.opening = {};
    const opened = this.host.fade(() => {
      if (this.opening !== request) return;
      this.opening = null;
      const { hud, conv } = useStore.getState();
      if (!this.host.owns(this.id)) return;
      if (this.world.room() !== room || this.world.trainer() !== trainer || this.host.player() !== player
        || !trainer.root.visible || this.host.rides.riding || hud.panel || conv.active) {
        this.host.left(this.id);
        return;
      }
      this.stage(room, player, trainer);
    });
    if (!opened) this.opening = null;
    return opened;
  }

  private stage(room: Group, player: GameCharacter, trainer: GameCharacter) {
    const rig = this.host.rig;
    const learner = bindActor(player), coach = bindActor(trainer);
    const camera = saveCamera(rig);
    const heading = this.world.heading();
    const composed = lines();
    this.host.prepare();
    const at = GYM_STAGE.player;
    this.world.place(at.x, at.z, at.heading);
    stand(learner, at);
    stand(coach, GYM_STAGE.trainer);
    const stage = {
      pos: new Vector3(), look: new Vector3(GYM_STAGE.look.x, GYM_STAGE.look.y, GYM_STAGE.look.z),
      rate: 8, fov: GYM_STAGE.desktop.fov, shiftY: GYM_STAGE.shiftY,
    };
    const run: Run = this.run = {
      room, player: learner, trainer: coach, camera, stage, points: [...learner.pose.framePoints(), ...coach.pose.framePoints()],
      frame: null, heading, lines: composed, round: new GymRound(), sayIt: new SayItRound(), cue: null, unsubscribe: null,
      elapsed: 0, gapEnd: null, voice: null, line: null, audible: false, fallback: false, revealed: false, heard: false,
      appliedProgress: null, leaving: false, done: false,
    };
    rig.mode = "stage";
    rig.stage = stage;
    const { width, height } = this.world.viewport();
    this.frameView(run, width, height, 0, height);
    this.host.entered(this.id);
    useStore.getState().setHud({ prompt: null });
    if (import.meta.env.DEV && typeof window !== "undefined") window.__gym = this.debugHook;
    this.publish(run);
  }

  private inRoom(run: Run) {
    return this.host.owns(this.id) && this.world.room() === run.room && this.host.player() === run.player.ch;
  }

  private live(run: Run) {
    return this.run === run && !run.leaving && this.inRoom(run) && this.world.trainer() === run.trainer.ch;
  }

  private getCaption(run: Run): GymCaption | null {
    const { phase, call, helpLevel } = run.round;
    const heard = run.heard || (run.voice?.startedAt != null && run.elapsed - run.voice.startedAt + EPSILON >= LISTEN_MIN);
    if (phase === "choose" || ((phase === "listen" || phase === "retry") && heard)) {
      const line = run.lines[`gy_${call.id}`];
      if (run.revealed || run.fallback) return { line, detail: "full" };
      if (phase === "choose" && helpLevel < 2) return { line, detail: helpLevel === 0 ? "full" : "target" };
    }
    return null;
  }

  private publish(run: Run) {
    const { round } = run, { phase, call, helpLevel } = round;
    const hasCall = phase === "listen" || phase === "choose" || phase === "right" || phase === "retry";
    const cue = phase === "choose" ? run.cue : null;
    useGym.setState({ view: {
      phase, index: round.index + 1, total: GYM_CALLS, callId: hasCall ? call.id : null, options: hasCall ? call.options : [],
      caption: this.getCaption(run), line: phase === "listen" ? null : run.line,
      feedback: phase === "right" || phase === "retry" ? phase : null, picked: round.picked,
      highlight: phase === "choose" && helpLevel === 0 ? call.id : null, helpLevel,
      audible: run.audible, fallback: run.fallback, revealed: run.revealed, score: round.score(run.sayIt.count), ratio: round.ratio,
      sayIt: cue, micStatus: cue?.getSnapshot() ?? null, observeFrame: this.observeFrame,
    } });
  }

  private closeCue(run: Run) {
    run.unsubscribe?.();
    run.unsubscribe = null;
    run.sayIt.close();
  }

  private openCue(run: Run) {
    const id = run.round.call.id;
    // A closed cue cannot accept a late transcript. Keep an awarded cue for this call so replay and retries
    // never open another opportunity for the same credit.
    if (!run.cue?.awarded) {
      const target = sayItWords([run.lines[`gy_${id}`].sentence.en],
        GYM_MOVES.filter((move) => move !== id).map((move) => run.lines[`gy_${move}`].sentence.en));
      run.cue = run.sayIt.open({ ...target, lang: targetLang });
      run.unsubscribe = run.cue.subscribe(() => {
        if (this.live(run) && run.round.phase === "choose") this.publish(run);
      });
    }
  }

  private cancelVoice(run: Run) {
    this.generation++;
    const voice = run.voice;
    run.voice = null;
    if (voice && voice.result === undefined) voice.controller.abort();
  }

  private speak(run: Run, key: GyLineId) {
    this.closeCue(run);
    this.cancelVoice(run);
    const line = run.line = run.lines[key];
    run.elapsed = 0;
    run.gapEnd = null;
    const generation = this.generation;
    const voice = npcVoice(npc), speed = npc.speed ?? 1, say = line.sentence.say;
    const slow = !!useStore.getState().settings.slowVoice;
    const duration = (audio.clipDuration(voice, speed, say) ?? 0) / (slow ? 0.82 : 1);
    const request: Voice = run.voice = {
      controller: new AbortController(), deadline: Math.max(2.4, duration + 0.75), muted: audio.volume <= 0, startedAt: null,
    };
    const current = () => generation === this.generation && request.result === undefined && this.live(run);
    const settle = (ok: boolean) => {
      if (current()) request.result = ok;
    };
    const play = () => {
      if (!current()) return;
      request.startedAt = run.elapsed;
      request.deadline += run.elapsed;
      try {
        void audio.play(voice, speed, say, { optional: true, recordingOnly: true, signal: request.controller.signal, slow, male: npc.gender === "m" })
          .then(settle, () => settle(false));
      } catch { settle(false); }
    };
    if (microphoneHandoffState().captures) void waitForMicrophone().then(play);
    else play();
    this.publish(run);
  }

  private lineFinished(run: Run) {
    const request = run.voice;
    if (!request || request.result !== undefined) return true;
    if (!request.muted && audio.volume > 0 && run.elapsed + EPSILON < request.deadline) return false;
    request.result = false;
    request.controller.abort();
    return true;
  }

  private listen(run: Run) {
    run.audible = false;
    this.speak(run, `gy_${run.round.call.id}`);
  }

  private startRound(run: Run, again: boolean) {
    if (!this.host.canStart(true)) return;
    if (again) {
      this.closeCue(run);
      run.round = new GymRound(run.round.number + 1);
      run.sayIt = new SayItRound();
      this.clearCall(run);
    }
    if (!run.round.start()) return;
    countPlay("games", this.id);
    this.speak(run, "gy_intro");
  }

  private clearCall(run: Run) {
    run.cue = null;
    run.revealed = run.fallback = run.audible = run.heard = false;
  }

  action(name: string, value?: string | boolean) {
    const run = this.run;
    if (!run || !this.live(run)) return;
    const { round } = run;
    if (name === "start" && round.phase === "ready") this.startRound(run, false);
    else if (name === "again" && round.phase === "score") this.startRound(run, true);
    else if (name === "done" && round.phase === "score") {
      run.done = true;
      this.exit(false);
    } else if (name === "reveal" && !run.revealed && (round.phase === "listen" || round.phase === "choose")) {
      run.revealed = true;
      this.publish(run);
    } else if (name === "replay" && round.phase === "choose" && round.listen()) this.listen(run);
    else if (name === "pick" && typeof value === "string" && round.pick(value)) {
      const key = round.phase === "retry" ? "gy_retry" : round.index % 2 ? "gy_right_b" : "gy_right_a";
      this.speak(run, key);
    }
  }

  input(input: ModeInput) {
    if (input.kind !== "key") return this.active;
    const { key, repeat } = input;
    if (key === "escape") {
      if (!repeat) { input.keys.clear(); this.exit(false); }
      return true;
    }
    let slot = keys.indexOf(key);
    if (slot < 0 && key >= "1" && key <= "4" && key.length === 1) slot = Number(key) - 1;
    if (slot < 0) return false;
    const run = this.run;
    if (!repeat && run?.round.phase === "choose") this.action("pick", run.round.call.options[slot]);
    return true;
  }

  update({ dt, blocked }: ModeFrame) {
    const run = this.run;
    if (!run) return;
    if (!this.inRoom(run) || this.world.trainer() !== run.trainer.ch) { this.exit(true); return; }
    if (!blocked && !run.leaving) this.step(run, dt);
    if (this.run !== run) return;
    const { round } = run;
    let player: GyMoveId | null = null, trainer: GyMoveId | null = null, progress = 0;
    if (!run.leaving && round.picked && (round.phase === "right" || round.phase === "retry")) {
      progress = run.elapsed / round.poseDuration;
      if (progress < 1) {
        player = round.picked;
        trainer = round.call.id;
      }
    }
    run.player.pose.tick(dt, player, progress);
    run.trainer.pose.tick(dt, trainer, progress);
    run.appliedProgress = player && trainer ? progress : null;
  }

  private step(run: Run, dt: number) {
    const previous = run.elapsed;
    run.elapsed += dt;
    const { round, elapsed } = run;
    switch (round.phase) {
      case "intro":
        if (elapsed + EPSILON >= LINE_MIN && this.lineFinished(run) && round.listen()) this.listen(run);
        break;
      case "listen": {
        const began = run.voice?.startedAt ?? 0;
        if (elapsed - began + EPSILON < LISTEN_MIN) break;
        if (this.lineFinished(run)) {
          run.audible = !!run.voice?.result && !run.voice.muted && audio.volume > 0;
          run.fallback ||= !run.audible;
          run.heard = true;
          round.choose();
          run.line = null;
          this.openCue(run);
          this.publish(run);
        } else if (run.revealed && !run.heard && run.voice?.startedAt != null && previous - began + EPSILON < LISTEN_MIN) this.publish(run);
        break;
      }
      case "right":
      case "retry":
        if (elapsed + EPSILON < Math.max(round.poseDuration, FEEDBACK_MIN) || !this.lineFinished(run)) break;
        run.gapEnd ??= elapsed + round.gap;
        if (elapsed + EPSILON < run.gapEnd) break;
        if (round.phase === "retry") {
          round.listen();
          this.listen(run);
        } else {
          const next = round.next();
          this.clearCall(run);
          if (next) this.listen(run);
          else this.speak(run, "gy_end");
        }
        break;
      case "closing":
        if (elapsed + EPSILON >= LINE_MIN && this.lineFinished(run)) {
          round.finish();
          run.line = null;
          this.publish(run);
        }
        break;
    }
  }

  private observeFrame = (viewport: HTMLElement, header: HTMLElement | null, dock: HTMLElement | null) => {
    const run = this.run;
    if (!run || run.leaving) return stoppedObserving;
    this.stopObserving?.();
    let observing = true;
    const measure = () => {
      if (!observing || this.run !== run || run.leaving) return;
      const area = viewport.getBoundingClientRect();
      this.frameView(run, area.width, area.height,
        header ? header.getBoundingClientRect().bottom - area.top : 0,
        dock ? dock.getBoundingClientRect().top - area.top : area.height);
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    if (header) observer?.observe(header);
    if (dock && dock !== header) observer?.observe(dock);
    window.addEventListener("resize", measure);
    const stop = this.stopObserving = () => {
      if (!observing) return;
      observing = false;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (this.stopObserving === stop) this.stopObserving = undefined;
    };
    measure();
    return stop;
  };

  private frameView(run: Run, width: number, height: number, top: number, bottom: number) {
    if (width <= 2 * SLACK || height <= 2 * SLACK) return;
    top = Math.max(0, top);
    bottom = Math.min(height, bottom);
    if (bottom - top <= 2 * SLACK) return;
    const old = run.frame;
    if (old && old.width === width && old.height === height && old.top === top && old.bottom === bottom) return;
    run.frame = { width, height, top, bottom };
    const { rig } = this.host, { stage } = run;
    const at = height > width * 1.15 ? GYM_STAGE.portrait : GYM_STAGE.desktop;
    stage.pos.set(at.x, at.y, at.z);
    stage.fov = at.fov;
    const probe = this.probe;
    probe.aspect = width / height;
    probe.fov = stage.fov;
    probe.position.copy(stage.pos);
    probe.lookAt(stage.look);
    probe.updateMatrixWorld();
    probe.updateProjectionMatrix();
    let left = Infinity, right = -Infinity, low = Infinity, high = -Infinity;
    const { projected } = this, lens = probe.projectionMatrix.elements;
    for (const point of run.points) {
      projected.copy(point.at).applyMatrix4(probe.matrixWorldInverse);
      const r = point.radius, depth = -projected.z;
      // Project a box around each extremity, including the side closer to the lens.
      const near = depth - r, far = depth + r;
      const x0 = projected.x - r, x1 = projected.x + r, y0 = projected.y - r, y1 = projected.y + r;
      left = Math.min(left, x0 * lens[0] / (x0 < 0 ? near : far));
      right = Math.max(right, x1 * lens[0] / (x1 > 0 ? near : far));
      low = Math.min(low, y0 * lens[5] / (y0 < 0 ? near : far));
      high = Math.max(high, y1 * lens[5] / (y1 > 0 ? near : far));
    }
    const zoom = Math.min(1.4, (width - 2 * SLACK) / (Math.max(-left, right) * width),
      (bottom - top - 2 * SLACK) / ((high - low) * height / 2));
    stage.shiftY = GYM_STAGE.shiftY + (1 - (top + bottom) / height) / 2 - (low + high) * zoom / 4;
    rig.cam.aspect = width / height;
    rig.cam.zoom = zoom;
    rig.stageSnap();
    rig.applyViewShift(width, height, 0, stage.shiftY * height);
    rig.cam.position.copy(probe.position);
    rig.cam.quaternion.copy(probe.quaternion);
    rig.cam.updateMatrixWorld();
  }

  exit(immediate: boolean) {
    if (this.opening) {
      this.opening = null;
      if (this.host.owns(this.id)) this.host.left(this.id);
    }
    const run = this.run;
    if (!run || (run.leaving && !immediate)) return;
    run.leaving = true;
    this.closeCue(run);
    this.cancelVoice(run);
    this.stopObserving?.();
    if (import.meta.env.DEV && typeof window !== "undefined" && window.__gym === this.debugHook) delete window.__gym;
    if (immediate || !this.inRoom(run) || !this.host.fade(() => this.restore(run, true))) this.restore(run, !immediate);
  }

  private restore(run: Run, save: boolean) {
    if (this.run !== run) return;
    this.run = null;
    const sameRoom = this.world.room() === run.room;
    const playerHere = sameRoom && this.host.player() === run.player.ch;
    if (sameRoom && this.world.trainer() === run.trainer.ch) restoreActor(run.trainer);
    if (playerHere) {
      const { pos } = run.player.home;
      this.world.place(run.done ? GYM_MAT.x : pos.x, run.done ? GYM_MAT.z : pos.z, run.heading);
      restoreActor(run.player);
      if (run.done) run.player.ch.root.position.set(GYM_MAT.x, 0, GYM_MAT.z);
    }
    const { rig } = this.host;
    if (rig.stage === run.stage) {
      const { camera } = run;
      rig.stage = playerHere ? camera.stage : null;
      rig.mode = camera.mode;
      rig.cam.zoom = camera.zoom;
      rig.cam.view = camera.view;
      rig.cam.fov = camera.fov;
      rig.cam.near = camera.near;
      rig.cam.updateProjectionMatrix();
      if (playerHere) {
        rig.yaw = camera.yaw;
        rig.pitch = camera.pitch;
        rig.dist = camera.dist;
        Object.assign(rig.viewShift, camera.viewShift);
        rig.target.copy(run.player.ch.root.position);
        rig.snap();
        rig.update(0, run.heading, false, true, false);
        rig.cam.updateMatrixWorld();
      }
    }
    useGym.setState({ view: null });
    if (this.host.owns(this.id)) this.host.left(this.id);
    if (save && playerHere) this.world.savePlace();
  }

  dispose() { this.exit(true); }

  debug() {
    const run = this.run;
    if (!run || run.leaving) return null;
    const { round } = run, { picked } = round;
    return {
      phase: round.phase, index: round.index + 1, callId: round.call.id, options: [...round.call.options],
      helpLevel: round.helpLevel, score: round.score(run.sayIt.count),
      pose: run.appliedProgress !== null && picked ? { player: picked, trainer: round.call.id, progress: run.appliedProgress } : null,
      audible: run.audible, fallback: run.fallback, revealed: run.revealed,
    };
  }
}
