import type { RadioSpot } from "../content/radioSpots";
import { ShuffleBag } from "../shuffleBag";

export interface ReadySpot {
  spot: RadioSpot;
  url: string;
  duration: number;
}

/** Counts completed songs in this listening session. Only a ready clip advances the spot sequence. */
export class SpotSchedule {
  private songs = 0;
  private after = 2;
  private kind: RadioSpot["kind"] = "jingle";
  private bags: Record<RadioSpot["kind"], ShuffleBag<RadioSpot>>;

  constructor(private random = Math.random) {
    this.bags = { jingle: new ShuffleBag(random), ad: new ShuffleBag(random) };
  }

  songEnded(spots: readonly RadioSpot[], ready: (spot: RadioSpot) => ReadySpot | null) {
    if (++this.songs < this.after) return null;
    const available = new Map<RadioSpot, ReadySpot>();
    for (const spot of spots) {
      if (spot.kind !== this.kind) continue;
      const clip = ready(spot);
      if (clip) available.set(spot, clip);
    }
    const chosen = this.bags[this.kind].take([...available.keys()]);
    if (!chosen) return null;
    this.songs = 0;
    this.after = this.random() < 0.5 ? 2 : 3;
    this.kind = this.kind === "jingle" ? "ad" : "jingle";
    return available.get(chosen)!;
  }
}

/** A line occupies its proportional share of the recording. */
export function spotLineAt(spot: RadioSpot, duration: number, time: number) {
  if (spot.lines.length < 2 || duration <= 0) return 0;
  const lengths = spot.lines.map(({ en }) => Math.max(1, Array.from(en).length));
  let chars = Math.max(0, time) / duration * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length - 1; i++) {
    chars -= lengths[i];
    if (chars < 0) return i;
  }
  return lengths.length - 1;
}
