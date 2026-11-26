import type { SongLine } from "../../radio/songs";

export type KaraokePracticeMode = "along" | "echo";
export interface EchoCall {
  start: number;
  targetStart: number;
  end: number;
  /** Target rows in the flattened radio timeline. Helper singing is in the same call. */
  rows: number[];
}
export interface PracticeSnapshot {
  mode: KaraokePracticeMode;
  turn: EchoCall | null;
  remaining: number;
  completed: number;
  total: number;
}

export function echoGap(call: EchoCall, rate = 1) {
  return Math.max(2.2, Math.min(10, (call.end - call.targetStart) * 1.15 / rate + 0.8));
}

/** Group overlaps before inserting silence, including a bilingual call's helper lead-in. */
export function echoCalls(lines: readonly SongLine[]): EchoCall[] {
  const calls: EchoCall[] = [];
  lines.forEach((line, row) => {
    if (line.part === "translation") return;
    const helper = lines[row - 1];
    const start = helper?.part === "translation" && helper.i === line.i ? helper.s : line.s;
    const previous = calls.at(-1);
    if (previous && start < previous.end) {
      previous.end = Math.max(previous.end, line.e);
      previous.rows.push(row);
    } else calls.push({ start, targetStart: line.s, end: line.e, rows: [row] });
  });
  return calls;
}

/** Media seconds decide sung ends. Only the quiet turn uses elapsed wall time. */
export class KaraokePractice {
  readonly calls: EchoCall[];
  readonly total: number;
  private completed = new Set<number>();
  private coverage = new Map<number, number>();
  private cursor = 0;
  private turn: EchoCall | null = null;
  private left = 0;
  private previous?: PracticeSnapshot;

  constructor(private lines: readonly SongLine[], readonly mode: KaraokePracticeMode) {
    this.calls = echoCalls(lines);
    this.total = new Set(lines.flatMap((line, row) => line.part === "translation" ? [] : [line.i ?? row])).size;
  }

  snapshot(): PracticeSnapshot {
    const remaining = Math.ceil(Math.max(0, this.left - 1e-9) * 10) / 10;
    const completed = this.completed.size;
    if (this.previous?.turn === this.turn && this.previous.remaining === remaining && this.previous.completed === completed) return this.previous;
    return this.previous = { mode: this.mode, turn: this.turn, remaining, completed, total: this.total };
  }

  /** Return the next boundary at which the shared output must pause. */
  advance(from: number, to: number, rate = 1): number | null {
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from || this.turn) return null;
    const call = this.mode === "echo" ? this.calls[this.cursor] : undefined;
    const boundary = call && from <= call.end && to >= call.end ? call.end : null;
    const end = boundary ?? to;
    this.lines.forEach((line, row) => {
      if (line.part === "translation") return;
      const id = line.i ?? row;
      if (this.completed.has(id) || end < line.s || from >= line.e) return;
      const covered = this.coverage.get(id);
      if (from <= line.s + 0.001 || (covered !== undefined && from <= covered + 0.001)) {
        const through = Math.max(covered ?? line.s, Math.min(end, line.e));
        this.coverage.set(id, through);
        if (through >= line.e) this.completed.add(id);
      }
    });
    if (boundary !== null && call) {
      this.turn = call;
      this.left = echoGap(call, rate);
      this.cursor++;
    }
    return boundary;
  }

  elapse(seconds: number) {
    if (this.turn) this.left = Math.max(0, this.left - Math.max(0, seconds));
    return this.turn !== null && this.left <= 0;
  }

  continue() { this.turn = null; this.left = 0; }

  /** A seek has no audible coverage and cannot complete the rows it jumps over. */
  seek(seconds: number) {
    this.continue();
    this.coverage.clear();
    const next = this.calls.findIndex((call) => call.end > seconds);
    this.cursor = next < 0 ? this.calls.length : next;
  }

  replayAt(seconds: number): EchoCall | undefined {
    if (this.turn) return this.turn;
    return this.calls.find((call) => seconds >= call.start && seconds <= call.end)
      ?? this.calls.findLast((call) => seconds >= call.start) ?? this.calls[0];
  }
}
