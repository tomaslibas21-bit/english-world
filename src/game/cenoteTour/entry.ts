import type { GameCharacter } from "../characters";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import type { CenoteTourMode } from "./mode";

export const CENOTE_MODE = "cenote-tour";
const BOARD = "board";

export interface CenoteTourHost extends ModeHost {
  dry(): void;
  guide(): GameCharacter | undefined;
  curtain(opacity: number): void;
  paused(): boolean;
  failed(): void;
}

type LastExit = "left" | "finished" | "failed" | null;
type Load = () => Promise<{ CenoteTourMode: typeof CenoteTourMode }>;
const loadTour: Load = async () => {
  const [runtime] = await Promise.all([import("./mode"), import("../../ui/CenoteTour")]);
  return runtime;
};

/** Owns the town as soon as the chat hands off, including while the runtime is downloading. */
export class CenoteTourEntry implements GameMode {
  readonly id = CENOTE_MODE;
  readonly cleanScreen = "menu";
  private generation = 0;
  private loading = false;
  private disposed = false;
  private mode?: CenoteTourMode;
  private lastExit: LastExit = null;
  private elapsed = 0;

  constructor(private host: CenoteTourHost, private situation: string, private load: Load = loadTour) {}

  get active() { return this.loading || !!this.mode?.active; }
  get surface() { return this.mode?.surface ?? null; }
  controlsNpc(id: string) { return this.mode?.controlsNpc(id) ?? false; }
  chat(sitId: string) { return this.situation === sitId; }
  event(name: string) { return name === this.id && !this.active && !this.disposed ? BOARD : undefined; }

  start(option?: string) {
    if (option !== BOARD || this.disposed || this.active || !this.host.canStart()) return false;
    const run = ++this.generation;
    this.elapsed = 0;
    this.lastExit = null;
    this.loading = true;
    this.host.entered(this.id);
    this.host.dry();
    void this.load().then(({ CenoteTourMode }) => {
      if (run !== this.generation || !this.loading) return;
      const mode = this.mode = new CenoteTourMode(this.host, this.situation, () => this.end("finished"));
      mode.start();
      this.loading = false;
    }).catch(() => {
      if (run !== this.generation || !this.loading) return;
      this.end("failed");
      this.host.failed();
    });
    return true;
  }

  update(frame: ModeFrame) { this.mode?.update(frame); }
  frameStage(w: number, h: number) { this.mode?.frameStage(w, h); }
  input(input: ModeInput) {
    if (input.kind !== "key") return false;
    if (input.key === "escape") { if (!input.repeat) this.exit(); return true; }
    return this.mode?.input(input) ?? false;
  }
  action(name: string, value?: string | boolean) { this.mode?.action(name, value); }
  exit() { if (this.active) this.end("left"); }
  private end(reason: Exclude<LastExit, null>) {
    this.loading = false;
    this.lastExit = reason;
    this.elapsed = this.mode?.elapsed ?? 0;
    this.mode?.dispose();
    this.mode = undefined;
    this.host.dry();
    this.host.left(this.id);
  }

  dispose() { this.disposed = true; this.exit(); }

  snapshot() {
    return {
      state: this.loading ? "loading" : "idle", stopIndex: -1, elapsed: this.elapsed,
      animalCount: 0, animals: [], viewer: null, lineKey: null,
      ...this.mode?.snapshot(), run: this.generation, lastExit: this.lastExit,
    };
  }
}
