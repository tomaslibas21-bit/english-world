import { audio, type FilePlayback } from "../audio";
import { boardFaces, type FaceMode } from "../kit/boardFaces";
import type { Phrase } from "./words";

const STALL_MS = 1500, FADE_MS = 600;
export const WRONG_PHRASE_DELAY = 0.7;

export function karaokeWords(timings: Phrase["t"], time: number) {
  let lit = 0, current = -1;
  for (const [i, [start, end]] of timings.entries()) {
    if (time < start) break;
    lit = i + 1;
    if (time < end) current = i;
  }
  return { lit, current };
}

type Line = {
  phrase: Phrase; correction: boolean; clip: FilePlayback; time: number; lastMove: number;
  fallbackAt?: number; fadeAt?: number;
};

class Karaoke {
  private node?: HTMLDivElement;
  private spans: HTMLSpanElement[] = [];
  private line?: Line;
  private frame = 0;
  private upcoming = false;
  private nextPrompt?: string;
  private lit = 0;
  private current = -1;
  private boardTop = Infinity;

  constructor(private mode: FaceMode) {}

  get visible() { return this.line !== undefined; }

  attach = (node: HTMLDivElement | null) => {
    this.node = node ?? undefined;
    this.spans = [];
    this.mountLine();
    this.align();
  };

  private mountLine() {
    if (!this.node) return;
    const phrase = this.line?.phrase;
    this.node.hidden = !phrase;
    this.node.toggleAttribute("data-correction", !!this.line?.correction);
    this.node.classList.toggle("fading", this.line?.fadeAt !== undefined);
    this.node.style.removeProperty("--board-top");
    this.boardTop = Infinity;
    this.spans = phrase?.words.map((word, i) => {
      const span = document.createElement("span");
      span.textContent = word;
      span.classList.toggle("lit", i < this.lit);
      span.classList.toggle("current", i === this.current);
      return span;
    }) ?? [];
    this.node.querySelector(".road-karaoke-line")?.replaceChildren(...this.spans.flatMap((span, i) => i ? [" ", span] : [span]));
  }

  show(phrase: Phrase, correction = false) {
    this.stop();
    const line: Line = this.line = { phrase, correction, clip: audio.playFile(phrase.fClip), time: 0, lastMove: performance.now() };
    this.mountLine();
    const tick = (now: number) => {
      if (this.line !== line) return;
      this.update(line, now);
      if (this.line === line) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  prompt(file: string, replay = false) {
    if (this.line && !replay) {
      this.upcoming = true;
      if (this.line.fadeAt === undefined) this.nextPrompt = file;
      else audio.playFile(file);
    } else {
      if (this.line) this.stop();
      audio.playFile(file);
    }
  }

  stop() {
    if (this.line) {
      this.line.clip.stop();
      cancelAnimationFrame(this.frame);
    }
    this.line = undefined;
    this.nextPrompt = undefined;
    this.upcoming = false;
    this.lit = 0;
    this.current = -1;
    if (this.node) this.node.hidden = true;
  }

  /** Align against the board projection from the frame that was just drawn. */
  align() {
    if (!this.upcoming || !this.node) return;
    const top = Math.floor(boardFaces[this.mode].top);
    if (this.boardTop === top) return;
    this.boardTop = top;
    if (Number.isFinite(top)) this.node.style.setProperty("--board-top", `${top}px`);
    else this.node.style.removeProperty("--board-top");
  }

  private update(line: Line, now: number) {
    const end = line.phrase.t.at(-1)![1];
    const { clip } = line;
    if (line.fallbackAt !== undefined) line.time = (now - line.fallbackAt) / 1000;
    else {
      if (clip.currentTime > line.time && clip.status !== "loading") {
        line.time = clip.currentTime;
        line.lastMove = now;
      }
      const stalled = (clip.status === "loading" || clip.status === "playing") && now - line.lastMove >= STALL_MS;
      const tooShort = clip.status === "ended" && line.time + 0.06 < end;
      if (clip.status === "unavailable" || tooShort || stalled) {
        line.fallbackAt = now - line.time * 1000;
        clip.stop();
      }
    }
    const ended = line.fallbackAt === undefined ? clip.status === "ended" : line.time >= end;
    const { lit, current } = karaokeWords(line.phrase.t, ended ? end : line.time);
    if (current !== this.current) {
      this.spans[this.current]?.classList.remove("current");
      this.spans[current]?.classList.add("current");
      this.current = current;
    }
    while (this.lit < lit) this.spans[this.lit++]?.classList.add("lit");
    if (ended && line.fadeAt === undefined) {
      line.fadeAt = now;
      this.node?.classList.add("fading");
      if (this.nextPrompt) {
        audio.playFile(this.nextPrompt);
        this.nextPrompt = undefined;
      }
    }
    if (line.fadeAt !== undefined && now - line.fadeAt >= FADE_MS) this.stop();
  }

  debug() {
    return { text: this.line?.phrase.f ?? "", current: this.current,
      lit: this.line?.phrase.words.slice(0, this.lit) ?? [], visible: !!this.line };
  }
}

export const karaoke = { road: new Karaoke("road"), sea: new Karaoke("sea") };
