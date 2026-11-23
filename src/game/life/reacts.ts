import { REACT_LINES, type ReactKind, type ReactLine } from "../../content/reacts";
import { ShuffleBag } from "../../shuffleBag";
import { townLineText } from "./lineText";

const KIND_WAIT: Record<ReactKind, number> = {
  honk: 40, bump: 40, carJumpOwner: 40, carJump: 40, crashDriver: 40, crash: 40, boat: 180, swim: 240,
};

export interface ReactionLine {
  id: number;
  kind: ReactKind;
  text: string;
  lt: string;
  speaker: string;
}

export function reactionDuration(text: string) {
  return Math.max(2.6, 1.6 + 0.055 * Array.from(text).length);
}

export class ReactionSchedule {
  private kinds = new Map<ReactKind, number>();
  private people = new Map<string, number>();
  private bags = new Map<ReactKind, ShuffleBag<ReactLine>>();
  private last: ReactionLine | null = null;
  private count = 0;
  private next = 0;
  private calmUntil = 0;
  private talking = false;

  constructor(private random = Math.random) {}

  conversation(active: boolean, now: number) {
    if (this.talking && !active) this.calmUntil = now + 20;
    this.talking = active;
  }

  canSay(kind: ReactKind, speaker: string, now: number, suppressed: boolean, force = false) {
    if (this.talking || suppressed || now < this.calmUntil || this.count >= 12) return false;
    return force || (now >= this.next &&
      now >= (this.kinds.get(kind) ?? 0) && now >= (this.people.get(speaker) ?? 0));
  }

  say(kind: ReactKind, speaker: string, now: number, suppressed: boolean, force = false) {
    if (!this.canSay(kind, speaker, now, suppressed, force)) return null;
    let bag = this.bags.get(kind);
    if (!bag) this.bags.set(kind, bag = new ShuffleBag(this.random));
    const line = bag.take(REACT_LINES[kind]);
    if (!line) return null;
    this.next = now + 20;
    this.kinds.set(kind, now + KIND_WAIT[kind]);
    this.people.set(speaker, now + 180);
    return this.last = { id: ++this.count, kind, text: townLineText(line), lt: line.lt, speaker };
  }

  state() {
    const { last, count } = this;
    return { last: last && { kind: last.kind, text: last.text, lt: last.lt, speaker: last.speaker }, count, blockedUntil: Math.max(this.next, this.calmUntil) };
  }
}
