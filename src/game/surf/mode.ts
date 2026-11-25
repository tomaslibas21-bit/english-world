import { Group, Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { SURF, type SurfContent } from "../../content/surf";
import { NPCS } from "../../content/npcs";
import { loadSituation } from "../../content/situations/catalog";
import { preloadSurfOverlay } from "../../ui/surfOverlay";
import { useStore } from "../../state/store";
import { SURF_SPOT, type SurfSpot } from "../world/surf";
import { floorY } from "../water";
import { coach } from "../coach";
import type { GameCharacter } from "../characters";
import type { GameMode, ModeFrame, ModeInput, ModePrompt } from "../kit/modes";
import { PhraseRun } from "../kit/phrases";
import type { SurfGame, SurfPlay } from "./play";
import type { Level } from "./logic";
import { configureSurfReview, useSurf } from "./store";

export function createSurfMode(host: SurfGame, replacePlayer: (player: GameCharacter) => void) {
  if (!SURF_SPOT || !SURF || !NPCS[SURF.npc]) return null;
  return new SurfMode(SURF_SPOT, SURF, host, replacePlayer);
}

interface StartRequest { level?: Level; runtime?: typeof import("./play") }

export class SurfMode implements GameMode {
  readonly id = "surf";
  readonly cleanScreen = "overlay";
  readonly camera = "stage";
  readonly conversation;
  readonly marker = new Group();
  private readonly ring = new Mesh(new RingGeometry(0.62, 0.84, 36).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.85, depthWrite: false }));
  private readonly halo = new Mesh(new RingGeometry(0.9, 1, 36).rotateX(-Math.PI / 2), this.ring.material.clone());
  private ringT = 0;
  private runtime: SurfPlay | null = null;
  private request: StartRequest | null = null;
  private fading = false;
  private disposed = false;

  constructor(readonly spot: SurfSpot, readonly content: SurfContent, private host: SurfGame, private replacePlayer: (player: GameCharacter) => void) {
    this.conversation = { situation: content.situation, label: "Banglenčių pamoka" };
    configureSurfReview(() => new PhraseRun(content.situation));
    const s = spot.start;
    this.marker.add(this.ring, this.halo);
    this.marker.position.set(s.x, Math.max(0, floorY(s.x, s.z)) + 0.05, s.z);
    this.marker.renderOrder = 1;
    host.add(this.marker);
  }

  get active() { return this.runtime?.active ?? false; }
  get modal() { return !!this.request || useSurf.getState().picking; }
  get scene() { return this.runtime?.scene ?? null; }
  get situation() { return this.content.situation; }
  get logic() { return this.runtime?.logic ?? null; }
  get loaded() { return this.runtime?.loaded ?? []; }
  get outfit() { return this.runtime?.outfit.active ? "surf" as const : null; }
  get npc() { return NPCS[this.content.npc]; }
  line(cue: string) { return this.runtime?.line(cue) ?? null; }

  start(level?: string) {
    if (this.disposed || this.active || !this.host.canStart(false, this.fading)) return false;
    const request: StartRequest = { level: level === "beginner" || level === "advanced" ? level : undefined };
    this.request = request;
    void this.load(request);
    return true;
  }

  private current(request: StartRequest) {
    return this.request === request && !this.disposed && this.host.owns(this.id);
  }

  private async load(request: StartRequest) {
    try {
      if (!request.level) {
        await preloadSurfOverlay();
        if (!this.current(request)) return;
        this.request = null;
        const best = useStore.getState().progress.surf;
        useSurf.getState().set({ picking: true, best: { waves: best?.waves ?? 0, seconds: best?.seconds ?? 0 } });
        return;
      }
      const [runtime, situation] = await Promise.all([
        import("./play"), loadSituation(this.content.situation), preloadSurfOverlay(),
      ]);
      if (!this.current(request)) return;
      const first = request.level === "beginner" ? "sg_start_beg" : "sg_start_adv";
      if (!situation?.lines[first]?.[0] && !this.content.lines?.[first]?.[0]) { this.failed(request); return; }
      request.runtime = runtime;
      this.launchReady();
    } catch {
      this.failed(request);
    }
  }

  private failed(request: StartRequest) {
    if (!this.current(request)) return;
    this.request = null;
    if (!useSurf.getState().picking) this.host.left(this.id);
  }

  private launchReady() {
    const request = this.request;
    if (!request?.runtime || !request.level || !this.current(request) || this.fading) return;
    if (!this.host.canStart()) { this.failed(request); return; }
    const faded = this.fade(() => {
      if (!this.current(request)) return;
      if (!this.host.canStart(false, true)) { this.failed(request); return; }
      try {
        const { SurfPlay } = request.runtime!;
        this.runtime ??= new SurfPlay(this.spot, this.content, { ...this.host, fade: (fn) => this.fade(fn) }, this.replacePlayer);
        this.runtime.launch(request.level!);
        this.request = null;
      } catch {
        this.failed(request);
        this.runtime?.stop(true);
      }
    });
    if (!faded) this.failed(request);
  }

  private fade(fn: () => void) {
    if (this.fading) return false;
    this.fading = this.host.fade(fn);
    return this.fading;
  }

  event(name: string, data: unknown) {
    if (name === this.id) return (data as { level?: string } | null)?.level === "advanced" ? "advanced" : "beginner";
  }

  reach(x: number, z: number) {
    const s = this.spot.start, d = Math.hypot(x - s.x, z - s.z);
    let best = d < s.r ? d * 0.5 : Infinity;
    if (this.spot.boards) for (const [bx, bz, r] of this.spot.boards) {
      const distance = Math.hypot(x - bx, z - bz);
      if (distance < r) best = Math.min(best, distance * 0.5);
    }
    return best;
  }

  prompt(x: number, z: number): ModePrompt | null {
    const s = this.spot.start;
    if (Math.hypot(x - s.x, z - s.z) < (this.spot.hintWithin ?? 15)) coach.cue("surf");
    const distance = this.reach(x, z);
    return distance < Infinity ? { distance, label: this.conversation.label, hint: this.npc?.name, kind: "surf" } : null;
  }

  tick(dt: number, outdoors: boolean) {
    if (this.fading) {
      if (this.host.canStart()) {
        this.fading = false;
        this.launchReady();
      } else if (this.request && !this.host.canStart(false, true)) this.failed(this.request);
    }
    this.marker.visible = outdoors && !this.active;
    if (!this.marker.visible) return;
    const k = (this.ringT += dt * 0.7) % 1;
    this.halo.scale.setScalar(1 + k * 0.6);
    this.halo.material.opacity = 0.45 * (1 - k);
  }

  update({ dt, time, x, y, blocked }: ModeFrame) {
    const play = this.runtime!;
    play.update(dt, time, x, y, blocked);
    if (play.active) this.host.updatePose(dt, play.scene.heading);
  }

  input(input: ModeInput) {
    if (input.kind === "key" && input.key === "escape") { this.exit(false); return true; }
    if (!this.active) return this.modal;
    if (input.kind === "key") return this.runtime!.key(input.key, input.repeat);
    if (input.kind === "jump") this.runtime!.up();
    else this.runtime!.stroke();
    return true;
  }

  action(name: string, value?: string | boolean) { this.runtime?.action(name, value); }

  exit(immediate: boolean) {
    this.request = null;
    if (this.active) this.runtime!.stop(immediate);
    else {
      useSurf.getState().reset();
      this.host.left(this.id);
    }
  }

  dispose() {
    this.disposed = true;
    configureSurfReview();
    this.exit(true);
    this.runtime?.dispose();
    this.marker.removeFromParent();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.halo.geometry.dispose();
    this.halo.material.dispose();
  }
}
