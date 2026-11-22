export type Pose = [distance: number, lateral: number, height: number, heading: number];
export type BestRun = { points: number; frames: Pose[] };
type StoragePort = Pick<Storage, "getItem" | "setItem">;

const storageKey = (edition: string, mode: "road" | "sea") => `english-world-${mode}-v1:${edition}`;
const SAMPLE = 0.1;

export function readBest(edition: string, storage?: StoragePort, mode: "road" | "sea" = "road"): BestRun | undefined {
  try {
    const best: BestRun = JSON.parse((storage ?? localStorage).getItem(storageKey(edition, mode)) ?? "null");
    if (best && Number.isFinite(best.points) && best.points > 0 && Array.isArray(best.frames)
        && best.frames.length <= 1501 && best.frames.every((frame) => Array.isArray(frame) && frame.length === 4 && frame.every(Number.isFinite))) return best;
  } catch { /* Storage can be unavailable. */ }
}

export function saveBest(edition: string, run: BestRun, previous?: BestRun, storage?: StoragePort, mode: "road" | "sea" = "road") {
  if (run.points <= Math.max(previous?.points ?? 0, readBest(edition, storage, mode)?.points ?? 0)) return false;
  try { (storage ?? localStorage).setItem(storageKey(edition, mode), JSON.stringify(run)); }
  catch { /* The current mode still keeps its best run in memory. */ }
  return true;
}

export class GhostRecorder {
  readonly frames: Pose[] = [];
  private previous: Pose = [0, 0, 0, 0];
  private time = 0;

  sample(time: number, pose: Pose) {
    while (this.frames.length * SAMPLE <= time + 1e-8) {
      const at = this.frames.length * SAMPLE;
      const alpha = time > this.time ? Math.max(0, Math.min(1, (at - this.time) / (time - this.time))) : 1;
      this.frames.push(blend(this.previous, pose, alpha));
    }
    this.previous = pose;
    this.time = time;
  }
}

function blend(a: Pose, b: Pose, t: number): Pose {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

export function ghostAt(frames: Pose[], time: number) {
  const sample = time / SAMPLE, i = Math.floor(sample);
  const a = frames[i];
  return a && blend(a, frames[i + 1] ?? a, sample - i);
}
