import type { GyMoveId } from "../../content/gym";
import { updateHelp, type HelpLevel } from "../kit/help";

export const GYM_MOVES = ["jacks", "toes", "squats", "circles", "run", "reach", "lunges", "pushups"] as const satisfies readonly GyMoveId[];
export const GYM_CALLS = 10;
export const GYM_KEYS = [
  ["1", "ArrowLeft", "←"], ["2", "ArrowUp", "↑"], ["3", "ArrowDown", "↓"], ["4", "ArrowRight", "→"],
] as const;
const RIGHT_SLOTS = [0, 2, 1, 3, 2, 0, 3, 1, 0, 2];
const OFFSETS = [0, 1, 3, 5];
const RIGHT_POSE = [1.2, 1.05, 0.9];
const RIGHT_GAP = [0.5, 0.375, 0.25];

export type GymPhase = "ready" | "intro" | "listen" | "choose" | "right" | "retry" | "closing" | "score";
export type GymScore = { completed: number; firstTry: number; wrong: number; said: number };
type Call = { id: GyMoveId; options: readonly GyMoveId[] };

function makeCalls(round: number): Call[] {
  const count = GYM_MOVES.length, first = round * 2 % count;
  return RIGHT_SLOTS.map((slot, index) => {
    const move = (first + (index < count ? index : GYM_CALLS - 1 - index)) % count;
    const options: GyMoveId[] = [];
    for (let i = 0; i < OFFSETS.length; i++) options[(slot + i) % 4] = GYM_MOVES[(move + OFFSETS[i]) % count];
    return { id: GYM_MOVES[move], options };
  });
}

function band(index: number): HelpLevel { return index < 3 ? 0 : index < 6 ? 1 : 2; }

function relief(level: HelpLevel) { return updateHelp({ level, streak: 0 }, false).level; }

export class GymRound {
  private calls: Call[];
  private missed = false;
  phase: GymPhase = "ready";
  index = 0;
  helpLevel: HelpLevel = 0;
  completed = 0;
  firstTry = 0;
  wrong = 0;
  picked: GyMoveId | null = null;

  constructor(readonly number = 0) { this.calls = makeCalls(number); }

  get call() { return this.calls[this.index]; }
  get ratio() { return this.firstTry / GYM_CALLS; }
  get poseDuration() { return this.phase === "retry" ? 1.05 : RIGHT_POSE[band(this.index)]; }
  get gap() { return this.phase === "right" ? RIGHT_GAP[band(this.index)] : 0; }

  score(said: number): GymScore {
    return { completed: this.completed, firstTry: this.firstTry, wrong: this.wrong, said };
  }

  start() {
    if (this.phase !== "ready") return false;
    this.phase = "intro";
    return true;
  }

  listen() {
    if (this.phase !== "intro" && this.phase !== "choose" && this.phase !== "retry") return false;
    this.picked = null;
    this.phase = "listen";
    return true;
  }

  choose() {
    if (this.phase !== "listen") return false;
    this.phase = "choose";
    return true;
  }

  pick(value: string) {
    if (this.phase !== "choose") return false;
    const picked = this.call.options.find((id) => id === value);
    if (!picked) return false;
    this.picked = picked;
    if (picked === this.call.id) {
      this.completed++;
      if (!this.missed) this.firstTry++;
      this.phase = "right";
    } else {
      this.wrong++;
      if (!this.missed) this.helpLevel = relief(this.helpLevel);
      this.missed = true;
      this.phase = "retry";
    }
    return true;
  }

  next() {
    if (this.phase !== "right") return false;
    this.picked = null;
    if (this.index + 1 === GYM_CALLS) {
      this.phase = "closing";
      return false;
    }
    this.index++;
    const scheduled = band(this.index);
    this.helpLevel = this.missed ? relief(scheduled) : scheduled;
    this.missed = false;
    this.phase = "listen";
    return true;
  }

  finish() { if (this.phase === "closing") this.phase = "score"; }
}
