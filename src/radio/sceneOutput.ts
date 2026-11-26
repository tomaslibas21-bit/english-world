import { bookCueIndex } from "./bookTiming";
import { NeedsTap, type RadioOutput } from "./output";
import type { SceneItem, SceneCue } from "./sceneProgram";
import type { TalkOutput } from "./talkPlayer";

type Request = Parameters<TalkOutput["start"]>[0];

/** Borrow the radio's existing element or iOS buffer output until the talk player hands it back. */
export class SceneOutput implements TalkOutput {
  private release?: () => void;
  private cue?: SceneCue;
  private offset = 0;
  private sounding = false;
  private volume = 1;

  constructor(private readonly clips: RadioOutput) {}

  async start(request: Request) {
    this.stop();
    if (request.signal.aborted) return;
    const { cues } = (request.item as SceneItem).tracks.target;
    let index = bookCueIndex(cues, request.position);
    const { onEnded, onStopped } = this.clips;
    const stop = () => this.stop();
    this.release = () => {
      request.signal.removeEventListener("abort", stop);
      this.clips.onEnded = onEnded;
      this.clips.onStopped = onStopped;
      this.clips.pause();
    };
    request.signal.addEventListener("abort", stop, { once: true });
    const playTurn = async (offset: number) => {
      const cue = this.cue = cues[index];
      this.sounding = false;
      this.offset = offset;
      request.onTime();
      if (request.signal.aborted) return;
      try {
        const started = await this.clips.play(cue.recording(), offset, true);
        if (request.signal.aborted || this.cue !== cue) return;
        if (!started) { request.onError("blocked"); return; }
        this.sounding = true;
      } catch (error) {
        if (!request.signal.aborted && this.cue === cue) request.onError(error instanceof NeedsTap ? "blocked" : "unavailable");
      }
    };
    this.clips.onEnded = () => {
      if (request.signal.aborted) return;
      if (++index === cues.length) request.onEnded();
      else void playTurn(0);
    };
    this.clips.onStopped = (reason) => request.onError(reason === "interrupted" ? "blocked" : "unavailable");
    this.clips.setVolume(this.volume);
    await playTurn(request.position - cues[index].start);
  }

  position() {
    // A rounded manifest duration must never put the transcript on the next turn before ended.
    return this.cue ? Math.min(this.cue.end - 0.000001,
      this.cue.start + (this.sounding ? this.clips.position() : this.offset)) : null;
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.release) this.clips.setVolume(volume);
  }

  setRates() { /* The town's short clips play at their recorded speed. */ }

  stop() {
    this.release?.();
    this.release = undefined;
    this.cue = undefined;
    this.sounding = false;
  }
}
