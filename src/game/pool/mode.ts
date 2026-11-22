import * as THREE from "three";
import { NPCS } from "../../content/npcs";
import { POOL_LINES } from "../../content/pool-lines";
import { prefetchSituations } from "../../content/situations/catalog";
import { npcVoice } from "../../content/voices";
import { countPlay } from "../../state/playStats";
import { sitProgress } from "../../state/progress";
import { useStore } from "../../state/store";
import { L } from "../../ui/i18n";
import { audio } from "../audio";
import type { GameCharacter } from "../characters";
import type { KitLine } from "../kit/dialogue";
import type { ModeHost } from "../kit/host";
import { conversationLine } from "../kit/lines";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases } from "../kit/phrases";
import { rand } from "../world/util";
import { HOTEL_POOL, HOTEL_POOL_ENABLED, hotelPoolKidY, POOL_CENTER, POOL_CIRCLE, POOL_ENTRY, POOL_KIDS, POOL_SITUATION, type PoolKid } from "../world/pool";
import { flightPosition, nextFlight, PoolRound, SPLASH_SECONDS, type Flight, type PoolEvent, type Receiver } from "./logic";
import { poolSave, resetPoolUi, usePool } from "./store";

type Phase = "entering" | "opening" | "play" | "closing" | "result";
type CueSlot = "cue" | "aside";
type Cue = { key: string; speaker: PoolKid; at: number; hold: number; slot: CueSlot };
type Voice = { voice: string; speed: number; say: string; seconds: number; male: boolean };
const handY: Record<Receiver, number> = { learner: 0.76, vale: 0.58, diego: 0.70, santi: 0.64 };
const phraseKeys = new Set(["pl_tuya", "pl_mia", "pl_arriba", "pl_cuidado", "pl_otra", "pl_casi", "pl_cayo", "pl_record"]);

function ballMesh() {
  const sphere = new THREE.SphereGeometry(0.25, 16, 10);
  const geometry = sphere.toNonIndexed();
  sphere.dispose();
  const uv = geometry.attributes.uv, colors: number[] = [];
  const palette = ["#f27664", "#fff3de", "#32bec9", "#fff3de", "#f8bf4d", "#fff3de", "#4890ce", "#fff3de"].map((hex) => new THREE.Color(hex));
  for (let i = 0; i < uv.count; i += 3) {
    const u = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;
    const v = (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3;
    const color = palette[v < 0.1 || v > 0.9 ? 1 : Math.min(7, Math.floor(u * 8))];
    for (let vertex = 0; vertex < 3; vertex++) colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const ball = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  ball.name = "hotel-pool-ball";
  return ball;
}

export function createPoolMode(host: ModeHost) {
  return HOTEL_POOL_ENABLED ? new PoolMode(host) : null;
}

class PoolMode implements GameMode {
  readonly id = "pool";
  readonly cleanScreen = "menu";
  readonly exitLabel = L("Baigti");
  private phase: Phase | null = null;
  private round: PoolRound | null = null;
  private clock = 0;
  private nextPhaseAt = 0;
  private taught = false;
  private helpLevel = 0;
  private notice: "wrong" | "timing" | null = null;
  private noticeUntil = 0;
  private cues: Cue[] = [];
  private cueUntil = { cue: 0, aside: 0 };
  private voices: Voice[] = [];
  private voiceUntil = 0;
  private playingVoice = false;
  private kept = new Map<string, KitLine>();
  private hitAt = new Map<Receiver, number>();
  private ball = ballMesh();
  private origin = new THREE.Vector3();
  private idleRandom = rand(929);
  private idle = nextFlight("vale", this.idleRandom, false);
  private idleTime = 0;
  private time = 0;
  private stage = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 5 };

  constructor(private host: ModeHost) {
    this.ball.visible = false;
    host.add(this.ball);
  }

  get active() { return this.phase !== null; }
  get camera() { return this.phase && this.phase !== "entering" ? "stage" as const : undefined; }

  prompt(x: number, z: number) {
    const distance = Math.hypot(x - POOL_CIRCLE.learner.x, z - POOL_CIRCLE.learner.z);
    return distance < 1.55 && sitProgress(useStore.getState().progress, POOL_SITUATION).completions > 0
      ? { distance, label: L("Žaisti kamuoliu"), kind: "pool" as const }
      : null;
  }

  event(name: string) { if (name === this.id) return this.id; }

  start() {
    if (this.active || !this.host.canStart()) return false;
    prefetchSituations([POOL_SITUATION]);
    this.phase = "entering";
    const fading = this.host.fade(() => {
      if (!this.host.owns(this.id) || this.phase !== "entering") return;
      this.host.prepare();
      const learner = POOL_CIRCLE.learner;
      this.host.place(learner.x, learner.z, Math.PI);
      this.host.entered(this.id);
      this.host.rig.stage = this.stage;
      this.host.rig.mode = "stage";
      this.frameCamera();
      this.host.rig.stageSnap();
      this.opening();
    });
    if (!fading) this.phase = null;
    return fading;
  }

  private opening() {
    const saved = poolSave(useStore.getState().progress);
    this.phase = "opening";
    this.clock = 0;
    this.round = null;
    this.helpLevel = Math.min(2, Math.max(0, saved.rounds - 1));
    this.notice = null;
    this.noticeUntil = 0;
    this.taught = !saved.rulesHeard;
    this.clearCues();
    this.kept.clear();
    this.hitAt.clear();
    this.holdBall("vale");
    resetPoolUi();
    if (this.taught) this.sequence(["pl_rules", "pl_rules2", "pl_start"]);
    else this.sequence(["pl_start"]);
    countPlay("games", this.id);
  }

  private sequence(keys: string[], delay = 0) {
    let at = this.clock + delay;
    for (const key of keys) {
      const text = conversationLine(POOL_SITUATION, "vale", key, POOL_LINES, false);
      const duration = text ? audio.clipDuration(npcVoice(NPCS.vale), NPCS.vale.speed ?? 1, text.say) : null;
      const readable = Math.min(3.3, 0.85 + (text?.say.length ?? 0) * 0.042);
      const hold = Math.max(readable, (duration ?? 0) / 0.82 + 0.14);
      this.schedule(key, "vale", at - this.clock, hold);
      at += hold;
    }
    this.nextPhaseAt = at;
  }

  private schedule(key: string, speaker: PoolKid, delay = 0, hold = 1, slot: CueSlot = "cue") {
    this.cues.push({ key, speaker, at: this.clock + delay, hold, slot });
  }

  private clearCues() {
    this.cues = [];
    this.cueUntil = { cue: 0, aside: 0 };
    this.voices = [];
    this.voiceUntil = 0;
    if (this.playingVoice) audio.stop();
    this.playingVoice = false;
    usePool.setState({ cue: null, aside: null });
  }

  private tickCues() {
    const ui = usePool.getState();
    for (const slot of ["cue", "aside"] as const) {
      if (ui[slot] && this.clock >= this.cueUntil[slot]) usePool.setState({ [slot]: null });
    }
    const due = this.cues.filter((cue) => cue.at <= this.clock).sort((a, b) => a.at - b.at);
    if (due.length) this.cues = this.cues.filter((cue) => cue.at > this.clock);
    for (const { key, speaker, hold, slot } of due) {
      const sentence = conversationLine(POOL_SITUATION, speaker, key, POOL_LINES, false);
      if (!sentence) continue;
      const line = { key, sentence };
      this.cueUntil[slot] = this.clock + hold;
      usePool.setState({ [slot]: line });
      if (phraseKeys.has(key)) this.kept.set(key, line);
      const { slowVoice, volume } = useStore.getState().settings;
      const npc = NPCS[speaker], voice = npcVoice(npc), speed = npc.speed ?? 1;
      const seconds = audio.clipDuration(voice, speed, sentence.say);
      if (seconds && volume > 0) this.voices.push({ voice, speed, say: sentence.say, seconds: seconds / (slowVoice ? 0.82 : 1), male: npc.gender === "m" });
    }
    if (this.clock >= this.voiceUntil) {
      const next = this.voices.shift();
      if (next) {
        this.voiceUntil = this.clock + next.seconds + 0.08;
        this.playingVoice = true;
        void audio.play(next.voice, next.speed, next.say, { slow: useStore.getState().settings.slowVoice, male: next.male });
      }
    }
  }

  private frameCamera() {
    const { x, z } = POOL_CENTER;
    const portrait = this.host.portrait();
    this.stage.pos.set(x + 2.8, portrait ? 5.4 : 4.9, z + (portrait ? 5.9 : 5.05));
    this.stage.look.set(x, portrait ? 0.40 : 0.60, z);
  }

  private placeBall(flight: Flight, seconds: number, from: THREE.Vector3) {
    const { travel, lift } = flightPosition(flight, seconds);
    const to = POOL_CIRCLE[flight.to];
    this.ball.position.set(
      THREE.MathUtils.lerp(from.x, to.x, travel),
      THREE.MathUtils.lerp(from.y, handY[flight.to], travel) + lift,
      THREE.MathUtils.lerp(from.z, to.z, travel),
    );
  }

  private holdBall(by: Receiver, at = this.ball.position) {
    const { x, z } = POOL_CIRCLE[by];
    at.set(x, handY[by], z);
  }

  private call(flight: Flight, delay: number) {
    const { from, to, height, mine } = flight;
    const by = from === "learner" ? POOL_KIDS.find((kid) => kid !== to)! : from;
    this.schedule(to === "learner" ? "pl_tuya" : mine ? "pl_mia" : "pl_" + to, mine && to !== "learner" ? to : by, delay, flight.seconds - delay);
    if (height === "fast") this.schedule("pl_cuidado", by, delay + 0.58, 0.95, "aside");
    if (height === "high") this.schedule("pl_arriba", by, delay + 0.62, 0.95, "aside");
  }

  private serve(round: PoolRound) {
    const { flight } = round;
    this.holdBall(flight.from, this.origin);
    this.hitAt.set(flight.from, this.time);
    this.call(flight, 0);
  }

  private hit(event: Extract<PoolEvent, { kind: "hit" }>, round: PoolRound) {
    this.hitAt.set(event.by, this.time);
    this.origin.copy(this.ball.position);
    usePool.setState({ streak: round.streak });
    const by = POOL_KIDS.find((kid) => kid !== event.by && kid !== round.flight.to) ?? "vale";
    if (round.streak <= 30) this.schedule("pl_n" + round.streak, by, 0, 0.65, "aside");
    else if (round.streak % 3 === 1) this.schedule(round.streak % 2 ? "pl_eso" : "pl_arriba", by, 0, 0.65, "aside");
    this.call(round.flight, 0.46);
    if (event.record) this.schedule("pl_record", by, 1.62, 0.95, "aside");
    else if (event.by === "learner" && round.learnerHits % 3 === 0) {
      this.schedule(round.learnerHits % 2 ? "pl_eso" : "pl_bien", by, 1.62, 0.9, "aside");
    }
    const st = useStore.getState();
    if (round.best > poolSave(st.progress).best) st.updateProgress((p) => { p.pool = { ...poolSave(p), best: round.best }; });
  }

  private closeRound(round: PoolRound, delay = 0) {
    this.phase = "closing";
    this.notice = null;
    this.cues = this.cues.filter(({ key }) => key === "pl_record");
    const record = this.cues[0];
    this.sequence([round.best >= 10 ? "pl_end_great" : "pl_end", "pl_otra_q"],
      record ? Math.max(delay, record.at + record.hold - this.clock) : delay);
    useStore.getState().updateProgress((p) => {
      const saved = poolSave(p);
      p.pool = { ...saved, rounds: saved.rounds + 1, best: Math.max(saved.best, round.best) };
    });
  }

  private play(dt: number, round: PoolRound) {
    const previous = round.flight;
    const event = round.update(dt);
    if (event?.kind === "hit") {
      this.holdBall(previous.to);
      this.hit(event, round);
    } else if (event?.kind === "drop") {
      this.ball.position.y = HOTEL_POOL.water + 0.08;
      this.host.splash(this.ball.position.x, HOTEL_POOL.water, this.ball.position.z, 0, 0, 0.9);
      audio.splash(0.6);
      usePool.setState({ streak: 0, cue: null, aside: null });
      if (round.phase === "ended") this.closeRound(round, 0.95);
      else this.schedule("pl_otra", "vale", 0.88, 0.87);
      this.schedule(event.late ? "pl_casi" : "pl_cayo", "vale", 0, 0.86);
    } else if (event?.kind === "serve") this.serve(round);
    else if (event?.kind === "end") this.closeRound(round);
    else if (round.phase === "fall") {
      const t = Math.min(1, round.phaseTime / SPLASH_SECONDS);
      this.holdBall("learner");
      this.ball.position.y = THREE.MathUtils.lerp(handY.learner, HOTEL_POOL.water + 0.08, t * (0.55 + 0.45 * t));
    }
    if (round.phase === "rally") this.placeBall(round.flight, round.phaseTime, this.origin);
  }

  private showResult(round: PoolRound) {
    const kept = Array.from(this.kept.values(), ({ sentence }) => sentence);
    keepPhrases(POOL_SITUATION, kept);
    this.phase = "result";
    this.clearCues();
    usePool.setState({ result: { best: round.best, learnerHits: round.learnerHits, cards: kept.length }, help: null });
  }

  update({ dt, time, blocked }: ModeFrame) {
    this.time = time;
    if (this.phase === "entering") return;
    this.frameCamera();
    if (!blocked) {
      this.clock += dt;
      if (this.phase === "opening") {
        if (this.clock >= this.nextPhaseAt) {
          if (this.taught) useStore.getState().updateProgress((p) => { p.pool = { ...poolSave(p), rulesHeard: true }; });
          const st = useStore.getState();
          this.round = new PoolRound(st.hud.showTouch, poolSave(st.progress).best);
          this.phase = "play";
          this.serve(this.round);
          this.placeBall(this.round.flight, 0, this.origin);
        } else this.holdBall("vale");
      } else if (this.phase === "play" && this.round) this.play(dt, this.round);
      else if (this.phase === "closing" && this.round && this.clock >= this.nextPhaseAt) this.showResult(this.round);
      this.tickCues();
      this.updateHelp();
      this.ball.rotation.set(this.time * 1.25, this.time * 1.8, this.time * 0.54);
    }
    this.ball.visible = this.phase === "opening" || this.phase === "play";
    const player = this.host.player();
    player.hideBackpack = true;
    const centerHeading = Math.atan2(POOL_CENTER.x - POOL_CIRCLE.learner.x, POOL_CENTER.z - POOL_CIRCLE.learner.z);
    const heading = this.pose(player, "learner", centerHeading, dt, false);
    this.host.updatePose(dt, heading);
  }

  private updateHelp() {
    const elapsed = this.round?.elapsed ?? 0;
    const visible = this.phase === "opening" || this.phase === "play";
    const help = this.clock < this.noticeUntil ? this.notice
      : !visible ? null
      : this.helpLevel === 0 && this.round?.canHit ? "timing"
      : this.helpLevel === 0 && elapsed < 6 ? "long"
      : this.helpLevel === 1 && elapsed < 5 ? "short"
      : null;
    if (help !== usePool.getState().help) usePool.setState({ help });
  }

  input(input: ModeInput) {
    if (input.kind === "key") {
      if (input.key === "escape" && !input.repeat) { this.exit(false); return true; }
      if (input.key !== " ") return false;
      if (this.phase === "result") return false;
      if (input.repeat) return true;
    } else if (input.kind === "interact") return true;
    const round = this.round;
    if (this.phase !== "play" || !round) return true;
    const result = round.press();
    if (result.kind === "hit") {
      this.hit(result, round);
      this.tickCues();
    }
    if (result.kind === "wrong" && (this.notice !== "wrong" || this.clock >= this.noticeUntil)) {
      this.schedule("pl_notuya", "vale", 0, 1.15, "aside");
      this.notice = "wrong";
      this.noticeUntil = this.clock + 1.25;
    }
    if (result.kind === "early" && this.helpLevel === 0) {
      this.notice = "timing";
      this.noticeUntil = this.clock + 0.7;
    }
    return true;
  }

  action(name: string) { if (this.phase === "result" && name === "again") this.opening(); }

  tick(dt: number, outdoors: boolean) {
    if (this.active) return;
    this.ball.visible = outdoors;
    this.time = this.host.time();
    if (!outdoors) return;
    this.idleTime += dt;
    if (this.idleTime >= this.idle.seconds) {
      this.hitAt.set(this.idle.to, this.time);
      this.idle = nextFlight(this.idle.to, this.idleRandom, false);
      this.idleTime = 0;
    }
    this.holdBall(this.idle.from, this.origin);
    this.placeBall(this.idle, this.idleTime, this.origin);
    this.ball.rotation.set(this.time * 0.85, this.time * 1.3, 0.35);
  }

  poseKid(ch: GameCharacter, id: string, dt: number, talking: boolean) {
    const kid = POOL_KIDS.find((who) => who === id);
    if (!kid) return false;
    const { x, z } = POOL_CIRCLE[kid];
    ch.root.position.y = hotelPoolKidY(kid) + Math.sin(this.time * 2.7 + x + z) * 0.045;
    ch.wading = true;
    if (talking && kid === "vale") { ch.poolHit = 0; return false; }
    const heading = Math.atan2(POOL_CENTER.x - x, POOL_CENTER.z - z);
    this.pose(ch, kid, heading, dt, true);
    return true;
  }

  private pose(ch: GameCharacter, who: Receiver, heading: number, dt: number, anticipation: boolean) {
    const flight = this.round?.phase === "rally" ? this.round.flight : !this.active && this.ball.visible ? this.idle : null;
    const t = this.round?.phaseTime ?? this.idleTime;
    const reach = anticipation && flight?.to === who ? THREE.MathUtils.smoothstep(t, flight.seconds - 0.24, flight.seconds) : 0;
    const ago = this.time - (this.hitAt.get(who) ?? -1);
    const hit = ago >= 0 && ago < 0.42 ? 1 - THREE.MathUtils.smoothstep(ago, 0.06, 0.42) : 0;
    const p = ch.root.position, b = this.ball.position;
    const facing = this.ball.visible && Math.hypot(b.x - p.x, b.z - p.z) > 0.35 ? Math.atan2(b.x - p.x, b.z - p.z) : heading;
    const delta = facing - ch.root.rotation.y;
    ch.root.rotation.y += Math.atan2(Math.sin(delta), Math.cos(delta)) * Math.min(1, dt * 6);
    ch.watch = this.ball.visible ? b : null;
    ch.steady = true;
    ch.attentive = true;
    ch.wading = true;
    ch.moveSpeed = 0;
    ch.poolHit = Math.max(reach, hit);
    ch.setAnim("idle");
    return ch.root.rotation.y;
  }

  debug() {
    const round = this.round;
    return { phase: this.phase, receiver: round?.flight.to, canHit: round?.canHit ?? false,
      flightPhase: round?.phase, hits: round?.learnerHits ?? 0, drops: round?.drops ?? 0, streak: round?.streak ?? 0 };
  }

  exit(immediate: boolean) {
    if (!this.phase) return;
    const placed = this.phase !== "entering";
    this.phase = null;
    this.round = null;
    this.notice = null;
    this.clearCues();
    this.hitAt.clear();
    resetPoolUi();
    if (placed) {
      const player = this.host.player();
      player.poolHit = 0;
      player.wading = false;
      player.hideBackpack = false;
      this.host.rig.stage = null;
      this.host.rig.mode = "follow";
      if (!immediate) this.host.place(POOL_ENTRY.x, POOL_ENTRY.z, POOL_ENTRY.rot);
    }
    this.host.left(this.id);
  }

  dispose() {
    this.exit(true);
    this.ball.removeFromParent();
    this.ball.geometry.dispose();
    this.ball.material.dispose();
  }
}
