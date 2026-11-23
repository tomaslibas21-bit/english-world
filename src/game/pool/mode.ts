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
import { HOTEL_POOL, HOTEL_POOL_ENABLED, hotelPoolKidY, poolMotionPreference, POOL_CENTER, POOL_CIRCLE, POOL_ENTRY, POOL_KIDS, POOL_SITUATION, type PoolKid } from "../world/pool";
import { flightPosition, nextFlight, PoolRound, SPLASH_SECONDS, type Flight, type PoolEvent, type Receiver } from "./logic";
import { poolSave, resetPoolUi, usePool } from "./store";

type Phase = "entering" | "opening" | "play" | "closing" | "result";
type CueSlot = "cue" | "aside";
type Cue = { key: string; speaker: PoolKid; at: number; hold: number; slot: CueSlot };
type Voice = { voice: string; speed: number; say: string; seconds: number; male: boolean };
const handY: Record<Receiver, number> = { learner: 0.76, vale: 0.58, diego: 0.70, santi: 0.64 };
const paddlePhase: Record<Receiver, number> = { learner: 1.5, vale: 0, diego: 2.6, santi: 4.3 };
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

function splashRings() {
  // Two crests spreading from one contact point, drawn together above the water.
  const geometry = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { spread: { value: 0 }, strength: { value: 0 } },
    vertexShader: `varying vec2 offset;
      void main() { offset = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 offset; uniform float spread, strength;
      void main() {
        float r = length(offset) + 0.012 * sin(offset.x * 17.0) * cos(offset.y * 13.0);
        float edge = r - (0.22 + 0.96 * spread);
        float outer = 1.0 - smoothstep(0.015, 0.055, abs(edge));
        float inner = 1.0 - smoothstep(0.01, 0.045, abs(edge + 0.14 + 0.08 * spread));
        gl_FragColor = vec4(0.77, 0.99, 0.96, (outer + inner * 0.58) * strength);
        #include <colorspace_fragment>
      }`,
  });
  const rings = new THREE.Mesh(geometry, material);
  rings.renderOrder = 3;
  rings.visible = false;
  return rings;
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
  private firstPass = true;
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
  private dropAt = -Infinity;
  private ball = ballMesh();
  private rings = splashRings();
  private origin = new THREE.Vector3();
  private target = new THREE.Vector3();
  private idleRandom = rand(929);
  private idle = nextFlight("vale", this.idleRandom, false);
  private idleTime = 0;
  private time = 0;
  private stage = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 5 };

  constructor(private host: ModeHost) {
    this.ball.visible = false;
    host.add(this.ball, this.rings);
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
      this.host.player().setBackpack?.(false);
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
    this.firstPass = true;
    this.clearCues();
    this.kept.clear();
    this.hitAt.clear();
    this.dropAt = -Infinity;
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
    this.holdBall(flight.to, this.target);
    this.ball.position.lerpVectors(from, this.target, travel);
    this.ball.position.y += lift;
  }

  private holdBall(by: Receiver, at = this.ball.position) {
    const { x, z } = POOL_CIRCLE[by];
    at.set(x, handY[by], z);
    if (by === "learner") { at.x += 0.24; at.z -= 0.34; }
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
    if (event.by === "learner") this.firstPass = false;
    this.hitAt.set(event.by, this.time);
    this.hitSpray(event.by, round.flight.to);
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

  private hitSpray(by: Receiver, to: Receiver) {
    if (poolMotionPreference?.matches) return;
    const from = POOL_CIRCLE[by], target = POOL_CIRCLE[to];
    const angle = Math.atan2(target.x - from.x, target.z - from.z);
    const dx = Math.sin(angle), dz = Math.cos(angle);
    this.host.splash(from.x + 0.34 * dx - 0.31 * dz, HOTEL_POOL.water + 0.16,
      from.z + 0.34 * dz + 0.31 * dx, dx * 0.4, dz * 0.4, 0.35);
  }

  private fallingBall(t: number) {
    this.holdBall("learner");
    this.ball.position.x += 0.62 * t;
    this.ball.position.z -= 0.15 * t;
    this.ball.position.y = THREE.MathUtils.lerp(handY.learner, HOTEL_POOL.water + 0.08, t * (0.55 + 0.45 * t));
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
      this.fallingBall(1);
      this.dropAt = this.time;
      this.rings.position.copy(this.ball.position);
      this.rings.position.y = HOTEL_POOL.water + 0.014;
      this.host.splash(this.ball.position.x, HOTEL_POOL.water, this.ball.position.z, 0, 0, 0.9);
      audio.splash(0.6);
      usePool.setState({ streak: 0, cue: null, aside: null });
      if (round.phase === "ended") this.closeRound(round, 0.95);
      else this.schedule("pl_otra", "vale", 0.88, 0.87);
      this.schedule(event.late ? "pl_casi" : "pl_cayo", "vale", 0, 0.86);
    } else if (event?.kind === "serve") this.serve(round);
    else if (event?.kind === "end") this.closeRound(round);
    else if (round.phase === "fall") {
      this.firstPass = false;
      this.fallingBall(Math.min(1, round.phaseTime / SPLASH_SECONDS));
    }
    if (round.phase === "rally") this.placeBall(round.flight, round.phaseTime, this.origin);
  }

  private showResult(round: PoolRound) {
    const kept = Array.from(this.kept.values(), ({ sentence }) => sentence);
    keepPhrases(POOL_SITUATION, kept);
    this.phase = "result";
    this.clearCues();
    usePool.setState({
      result: { best: round.best, learnerHits: round.learnerHits, drops: round.drops, cards: kept.length },
      help: null,
    });
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
      if (!poolMotionPreference?.matches) {
        const spin = this.round?.phase === "reset" ? 0.22 : 1;
        this.ball.rotation.x += dt * spin * 1.25;
        this.ball.rotation.y += dt * spin * 1.8;
      }
    }
    const sinceDrop = this.time - this.dropAt;
    this.rings.visible = sinceDrop < 1.2;
    if (this.rings.visible) {
      const t = sinceDrop / 1.2;
      this.rings.material.uniforms.spread.value = poolMotionPreference?.matches ? 0.3 : 1 - (1 - t) ** 2;
      this.rings.material.uniforms.strength.value = 0.95 * (1 - t) ** 1.4;
      if (!poolMotionPreference?.matches && this.round?.phase !== "rally") {
        this.ball.position.y = HOTEL_POOL.water + 0.08 + 0.14 * Math.sin(sinceDrop * 11) * Math.exp(-sinceDrop * 3.8);
      }
    }
    this.ball.visible = this.phase === "opening" || this.phase === "play" || (this.phase === "closing" && this.rings.visible);
    const player = this.host.player();
    const centerHeading = Math.atan2(POOL_CENTER.x - POOL_CIRCLE.learner.x, POOL_CENTER.z - POOL_CIRCLE.learner.z);
    const heading = this.pose(player, "learner", centerHeading, dt);
    this.host.updatePose(dt, heading);
  }

  private updateHelp() {
    const visible = this.phase === "opening" || this.phase === "play";
    const canHit = this.helpLevel === 0 && this.phase === "play" && !!this.round?.canHit;
    const help = visible && this.helpLevel === 0 && this.firstPass ? "long"
      : visible && this.helpLevel === 1 && (this.round?.elapsed ?? 0) < 5 ? "short" : null;
    const notice = visible && this.clock < this.noticeUntil ? this.notice : null;
    const current = usePool.getState();
    if (canHit !== current.canHit || help !== current.help || notice !== current.notice) usePool.setState({ canHit, help, notice });
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
    this.updateHelp();
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
      const p = this.host.player().root.position;
      if (Math.hypot(p.x - POOL_CENTER.x, p.z - POOL_CENTER.z) < 12) this.hitSpray(this.idle.from, this.idle.to);
      this.idleTime = 0;
    }
    this.holdBall(this.idle.from, this.origin);
    this.placeBall(this.idle, this.idleTime, this.origin);
    if (!poolMotionPreference?.matches) this.ball.rotation.set(this.time * 0.85, this.time * 1.3, 0.35);
  }

  poseKid(ch: GameCharacter, id: string, dt: number, talking: boolean) {
    const kid = POOL_KIDS.find((who) => who === id);
    if (!kid) return false;
    const { x, z } = POOL_CIRCLE[kid];
    ch.root.position.y = hotelPoolKidY(kid);
    ch.wading = true;
    if (talking && kid === "vale") { ch.poolPose = undefined; return false; }
    const heading = Math.atan2(POOL_CENTER.x - x, POOL_CENTER.z - z);
    this.pose(ch, kid, heading, dt);
    return true;
  }

  private pose(ch: GameCharacter, who: Receiver, heading: number, dt: number) {
    const flight = this.round?.phase === "rally" ? this.round.flight : !this.active && this.ball.visible ? this.idle : null;
    const t = this.round?.phaseTime ?? this.idleTime;
    const ease = THREE.MathUtils.smoothstep;
    const reach = flight?.to === who ? 0.58 * ease(t, flight.seconds - 0.8, flight.seconds) : 0;
    const ago = this.time - (this.hitAt.get(who) ?? -Infinity);
    const hit = 1 - ease(ago, 0.18, 0.59);
    const p = ch.root.position, b = this.ball.position;
    const facing = this.ball.visible && Math.hypot(b.x - p.x, b.z - p.z) > 0.12 ? Math.atan2(b.x - p.x, b.z - p.z) : heading;
    const delta = facing - ch.root.rotation.y;
    ch.root.rotation.y += Math.atan2(Math.sin(delta), Math.cos(delta)) * Math.min(1, dt * 6);
    ch.watch = this.ball.visible ? b : null;
    ch.steady = true;
    ch.attentive = true;
    ch.wading = true;
    ch.moveSpeed = 0;
    const pose = ch.poolPose ??= { paddle: 0, reach: 0, surprise: 0, laugh: 0 };
    pose.paddle = poolMotionPreference?.matches ? 0 : Math.sin(this.time * 2.25 + paddlePhase[who]);
    pose.reach = Math.max(reach, hit);
    const after = this.time - this.dropAt - paddlePhase[who] * 0.027;
    const reaction = ease(after, 0, 0.16) * (1 - ease(after, 0.66, 1.15));
    pose.surprise = who === "learner" || who === "diego" ? reaction : 0;
    pose.laugh = who === "vale" || who === "santi" ? reaction : 0;
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
    this.rings.visible = false;
    this.dropAt = -Infinity;
    resetPoolUi();
    if (placed) {
      const player = this.host.player();
      player.poolPose = undefined;
      player.wading = false;
      player.setBackpack?.(true);
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
    this.rings.removeFromParent();
    this.rings.geometry.dispose();
    this.rings.material.dispose();
  }
}
