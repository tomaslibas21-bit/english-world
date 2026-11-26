import * as THREE from "three";
import { KARAOKE_UI } from "../../content/karaokeCopy";
import type { Radio } from "../../radio/radio";
import type { KaraokeSession } from "../../radio/karaokeSession";
import type { GameCharacter, CharacterJoint } from "../characters";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { useKaraoke, resetKaraokeUi } from "./store";
import { KARAOKE_MARK, KARAOKE_PROMPT, disposeKaraokeMic, karaokeShot, makeKaraokeMic, poseKaraokeSinger } from "./stage";
import { audio } from "../audio";
import { loadKaraokeCovers } from "../../radio/songs";
import { karaokeReading } from "../../radio/lyrics";
import { KaraokeMicrophone } from "./microphone";

interface CafeHost {
  room(): THREE.Group | null;
  audience(): GameCharacter[];
  place(x: number, z: number, rot: number): void;
}
type BoothRadio = Pick<Radio, "store" | "init" | "karaokeCatalog" | "karaokeCatalogReady" | "openKaraoke" | "hold" | "release">;

function parkActor(actor: GameCharacter) {
  const position = actor.root.position.clone(), rotation = actor.root.quaternion.clone(), scale = actor.root.scale.clone();
  const { anim, watch, steady, attentive, busy, bank, moveSpeed } = actor;
  const joints: CharacterJoint[] = ["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"];
  const poses = joints.map((name) => ({ joint: actor.joint(name), rotation: actor.joint(name).quaternion.clone() }));
  return () => {
    actor.root.position.copy(position);
    actor.root.quaternion.copy(rotation);
    actor.root.scale.copy(scale);
    actor.setAnim(anim);
    Object.assign(actor, { watch, steady, attentive, busy, bank, moveSpeed });
    for (const pose of poses) pose.joint.quaternion.copy(pose.rotation);
  };
}

export class KaraokeMode implements GameMode {
  readonly id = "karaoke";
  readonly cleanScreen = "menu";
  readonly indoorPrompt = true;
  readonly exitLabel = KARAOKE_UI.leave;
  private opened = false;
  private staged = false;
  private request = 0;
  private take: KaraokeSession | null = null;
  private unsubscribe?: () => void;
  private restoreCamera?: () => void;
  private restorePlayer?: () => void;
  private restoreActors: (() => void)[] = [];
  private mic?: THREE.Group;
  private docked?: THREE.Object3D;
  private dockedVisible = true;
  private origin?: { x: number; z: number; rot: number };
  private watched = new THREE.Vector3();
  private pictureHead = new THREE.Vector3();
  private celebrated = false;
  private section?: number;
  private reacting = false;
  private microphone?: KaraokeMicrophone;
  private captureId = 0;

  constructor(private host: ModeHost, private cafe: CafeHost, private radio: BoothRadio) {}

  get active() { return this.opened; }
  get modal() { return this.opened; }
  get performing() { return this.staged; }
  get camera() { return this.staged ? "stage" as const : undefined; }
  available() { return this.radio.store.getState().available; }

  prompt(x: number, z: number) {
    if (this.opened || !this.available() || !this.cafe.room()) return null;
    const distance = Math.hypot(x - KARAOKE_PROMPT.x, z - KARAOKE_PROMPT.z);
    return distance <= 1.2 ? { distance, label: KARAOKE_UI.enter, kind: "karaoke" as const } : null;
  }

  start() {
    if (this.opened || !this.available() || !this.cafe.room() || !this.host.canStart(true)) return false;
    this.opened = true;
    const player = this.host.player(), p = player.root.position;
    this.origin = { x: p.x, z: p.z, rot: player.root.rotation.y };
    this.restoreCamera = this.host.rig.parkView();
    this.restorePlayer = parkActor(player);
    this.host.prepare();
    player.moveSpeed = 0;
    player.setAnim("idle");
    this.host.entered(this.id);
    resetKaraokeUi();
    useKaraoke.setState({ phase: "picker" });
    void this.loadCatalog();
    return true;
  }

  private async loadCatalog() {
    const request = ++this.request;
    useKaraoke.setState({ loading: true, failed: false });
    await Promise.all([this.radio.init(), loadKaraokeCovers().catch(() => { /* paper sleeves remain available */ })]);
    if (!this.opened || request !== this.request) return;
    useKaraoke.setState({ loading: false, failed: !this.radio.karaokeCatalogReady() });
  }

  private startSong(id: string) {
    if (!this.radio.karaokeCatalog().some(({ song }) => song.id === id)) return;
    this.take ??= this.radio.openKaraoke();
    if (!this.take) return;
    this.unsubscribe?.();
    this.microphone?.dispose();
    this.microphone = new KaraokeMicrophone(this.take, {
      silence: () => audio.silenceForPrivateCapture(),
      hold: () => {
        const reason = `karaoke-private-${++this.captureId}` as const;
        this.radio.hold(reason, true);
        return () => this.radio.release(reason);
      },
    });
    this.celebrated = false;
    this.section = undefined;
    useKaraoke.setState({ take: this.take });
    this.unsubscribe = this.take.store.subscribe((state) => {
      if (this.opened && state.status === "playing" && !this.staged) this.stage();
      if (this.opened && state.status === "closed") this.exit(true);
      if (this.opened && state.status === "ended" && !state.held && !this.celebrated) {
        this.celebrated = true;
        audio.sfx("crowdCheer", 0.5);
        const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) for (const guest of this.cafe.audience()) {
          this.reacting = true;
          if (guest.react) guest.react("clap");
          else guest.root.rotation.y = Math.atan2(KARAOKE_MARK.x - guest.root.position.x, KARAOKE_MARK.z - guest.root.position.z);
        }
      }
    });
    void this.take.start(id, useKaraoke.getState().mode);
  }

  private stage() {
    const room = this.cafe.room();
    if (!room || !this.opened) { this.exit(true); return; }
    this.staged = true;
    const player = this.host.player();
    this.restoreActors = [player, ...this.cafe.audience()].map(parkActor);
    this.cafe.place(KARAOKE_MARK.x, KARAOKE_MARK.z, KARAOKE_MARK.rot);
    player.root.position.y = KARAOKE_MARK.y;
    player.setAnim("idle");
    player.busy = null;
    this.mic = makeKaraokeMic();
    player.rightHand.add(this.mic);
    poseKaraokeSinger(player, this.mic);
    this.docked = room.getObjectByName("karaoke-docked-mic");
    if (this.docked) { this.dockedVisible = this.docked.visible; this.docked.visible = false; }
    this.host.rig.stage = karaokeShot(this.host.rig.cam.aspect);
    this.host.rig.cam.zoom = 1;
    this.host.rig.cam.updateProjectionMatrix();
    this.host.rig.mode = "stage";
    this.host.rig.stageSnap();
    this.host.rig.applyPose();
    this.host.rig.cam.updateMatrixWorld(true);
    useKaraoke.setState({ phase: "stage" });
    audio.preload(["crowdCheer"]);
  }

  update(frame: ModeFrame) {
    if (!this.opened) return;
    this.take?.tick();
    this.host.updatePose(frame.dt, this.staged ? KARAOKE_MARK.rot : this.origin!.rot);
    if (!this.staged) return;
    const player = this.host.player(), guests = this.cafe.audience();
    const state = this.take?.store.getState();
    if (state?.status === "playing" && state.timeline) {
      const seconds = this.take!.position();
      const row = state.timeline.lines[karaokeReading(state.timeline, seconds).current];
      if (row && row.part !== "translation" && seconds >= row.s && row.sec !== this.section) {
        this.section = row.sec;
        if (!(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
          this.reacting = true;
          guests[1]?.react?.("nod");
        }
      }
    }
    this.watched.copy(player.root.position).y += player.height * 0.8;
    for (const guest of guests) {
      guest.watch = this.watched;
      guest.steady = guest.attentive = true;
    }
    player.watch = null;
    player.steady = true;
    if (this.mic) poseKaraokeSinger(player, this.mic);
    const shot = this.host.rig.stage!, portrait = this.host.rig.cam.aspect < 0.9;
    const z = portrait ? 2.3 : 1.3, moved = shot.pos.z !== z;
    shot.pos.z = z; shot.fov = portrait ? 48 : 43;
    if (moved && typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.host.rig.stageSnap(); this.host.rig.applyPose(); this.host.rig.cam.updateMatrixWorld(true);
    }
  }

  /** Keep the face below the real title at large text sizes; the lyric card owns the lower picture. */
  frameView(w: number, h: number, headerBottom = 0) {
    const sideways = w > h && h < 520;
    const shiftX = sideways ? w * 0.2 : 0, shiftY = sideways ? 0 : h * 0.06;
    const rig = this.host.rig;
    rig.applyViewShift(w, h, shiftX, shiftY);
    rig.cam.updateMatrixWorld(true);
    if (sideways || !headerBottom) return;
    const player = this.host.player();
    this.pictureHead.copy(player.root.position).y += player.height;
    this.pictureHead.project(rig.cam);
    const headY = (0.5 - this.pictureHead.y * 0.5) * h;
    if (headY < headerBottom + 12) rig.applyViewShift(w, h, shiftX, shiftY - (headerBottom + 12 - headY));
  }

  private leaveMark() {
    if (!this.staged) return;
    this.staged = false;
    if (this.mic) disposeKaraokeMic(this.mic);
    this.mic = undefined;
    if (this.docked) this.docked.visible = this.dockedVisible;
    this.docked = undefined;
    if (this.origin) this.cafe.place(this.origin.x, this.origin.z, this.origin.rot);
    if (this.reacting) for (const guest of this.cafe.audience()) guest.react?.(null);
    this.reacting = false;
    for (const restore of this.restoreActors) restore();
    this.restoreActors = [];
    this.restoreCamera?.();
  }

  private releaseTake() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.microphone?.dispose();
    this.microphone = undefined;
    this.take?.close();
    this.take = null;
  }

  action(name: string, value?: string | boolean) {
    if (!this.opened) return;
    if (name === "leave") { this.exit(false); return; }
    if (name === "back" || name === "another") {
      if (this.staged) {
        const detail = name === "another" ? null : useKaraoke.getState().detail;
        this.releaseTake();
        this.leaveMark();
        useKaraoke.setState({ phase: "picker", take: null, detail });
      } else if (useKaraoke.getState().detail) {
        this.releaseTake();
        useKaraoke.setState({ detail: null, take: null });
      } else this.exit(false);
      return;
    }
    if (name === "filter" && typeof value === "string") useKaraoke.setState({ filter: value, scroll: 0, selected: null });
    if (name === "select" && typeof value === "string" && this.radio.karaokeCatalog().some(({ song }) => song.id === value)) {
      useKaraoke.setState({ detail: value, selected: value });
    }
    if (name === "start") {
      const id = useKaraoke.getState().detail;
      if (id) this.startSong(id);
    }
    if (name === "mode" && (value === "along" || value === "echo" || value === "word")) useKaraoke.setState({ mode: value });
    if (name === "catalog-retry") void this.loadCatalog();
    if (name === "pause") this.take?.pause();
    if (name === "resume") void this.take?.resume();
    if (name === "retry") void this.take?.retry();
    if (name === "replay") void this.take?.replayLine();
    if (name === "continue") void this.take?.continueTurn();
    if (name === "reveal") this.take?.revealWord();
    if (name === "rate" && typeof value === "string") this.take?.setRate(Number(value));
    if (name === "microphone") this.microphone?.start();
    if (name === "microphone-stop") this.microphone?.stop();
    if (name === "microphone-focus" && typeof value === "boolean") this.take?.focusMicrophone(value);
  }

  input(input: ModeInput) {
    if (!this.opened || input.kind !== "key" || input.repeat) return false;
    if (input.key === "escape") { this.action("back"); return true; }
    return false;
  }

  exit(_immediate: boolean) {
    if (!this.opened) return;
    this.opened = false;
    this.request++;
    this.releaseTake();
    this.leaveMark();
    this.restoreCamera?.();
    this.restoreCamera = undefined;
    this.restorePlayer?.();
    this.restorePlayer = undefined;
    this.origin = undefined;
    resetKaraokeUi();
    this.host.left(this.id);
  }

  dispose() { this.exit(true); }
}
