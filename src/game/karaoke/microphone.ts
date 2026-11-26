import { EDITION } from "../../edition";
import { createPrivateSpeechTurn, privateSpeechAvailable, type PrivateSpeechStatus } from "../../convo/speech";
import { waitForConfirmedCaptureRelease } from "../../convo/audioFocus";
import type { KaraokeSession, KaraokeState } from "../../radio/karaokeSession";
import { heardWordMatches, type EchoCall } from "./practice";

export interface KaraokeMicState {
  available: boolean;
  used: boolean;
  phase: "off" | "starting" | "listening" | "stopping" | "waiting" | "done" | "unavailable";
  matches: readonly { row: number; word: number }[];
}
interface MicDeps {
  silence(): () => void;
  hold(): () => void;
  available?: typeof privateSpeechAvailable;
  create?: typeof createPrivateSpeechTurn;
}
const empty = (): KaraokeMicState => ({ available: false, used: false, phase: "off", matches: [] });

/** A turn owns silence until confirmed release, even after its UI and take have gone away. */
export class KaraokeMicrophone {
  private state = empty();
  private turn: EchoCall | null = null;
  private used = new Set<EchoCall>();
  private generation = 0;
  private disposed = false;
  private attempt?: ReturnType<typeof createPrivateSpeechTurn>;
  private unwatch: () => void;
  private unlisten?: () => void;

  constructor(private session: KaraokeSession, private deps: MicDeps) {
    this.unwatch = session.store.subscribe((state) => this.observe(state));
    this.observe(session.store.getState());
  }
  private publish(patch: Partial<KaraokeMicState>) {
    this.state = { ...this.state, ...patch };
    if (!this.disposed && this.session.store.getState().status !== "closed") this.session.store.setState({ microphone: this.state });
  }
  private observe(state: KaraokeState) {
    const turn = state.status !== "closed" && state.practice?.mode === "echo" ? state.practice.turn : null;
    if (turn === this.turn) return;
    this.turn = turn;
    const generation = ++this.generation;
    this.stop();
    this.session.focusMicrophone(false);
    this.publish({ ...empty(), used: !!turn && this.used.has(turn) });
    if (!turn || this.state.used) return;
    void (this.deps.available ?? privateSpeechAvailable)(EDITION.target).then((available) => {
      if (!this.disposed && generation === this.generation && this.turn === turn) this.publish({ available });
    });
  }
  start() {
    const turn = this.turn;
    if (this.disposed || !turn || !this.state.available || this.used.has(turn) || this.session.store.getState().held
      || (typeof document !== "undefined" && document.hidden)) return;
    this.used.add(turn);
    this.session.pause();
    const generation = this.generation;
    this.publish({ available: false, used: true, phase: "starting", matches: [] });
    const releaseHold = this.deps.hold(), releaseSilence = this.deps.silence();
    let failed = false, cancelled = false;
    const current = () => !this.disposed && generation === this.generation && this.turn === turn;
    const onStatus = (status: PrivateSpeechStatus) => {
      if (status === "unavailable") failed = true;
      if (status === "stopping") cancelled = true;
      if (!current()) return;
      const phase = status === "checking" ? "starting" : status === "ended" ? failed ? "unavailable" : cancelled ? "off" : "done" : status;
      this.publish({ phase, ...(failed || cancelled ? { matches: [] } : {}) });
    };
    const attempt = (this.deps.create ?? createPrivateSpeechTurn)({
      lang: EDITION.target, onStatus,
      onWords: (alternatives) => {
        if (!current() || cancelled) return;
        const lines = this.session.store.getState().timeline?.lines ?? [];
        const targets = turn.rows.flatMap((row) => (lines[row]?.wt ?? []).map((text, word) => ({ text, row, word })));
        const matches = heardWordMatches(targets.map(({ text }) => text), alternatives).map((index) => ({ row: targets[index].row, word: targets[index].word }));
        if (matches.length !== this.state.matches.length || matches.some((match, i) => match.row !== this.state.matches[i].row || match.word !== this.state.matches[i].word)) this.publish({ matches });
      },
      onReleased: () => {
        void waitForConfirmedCaptureRelease().then(() => {
          if (current()) this.session.pause();
          releaseSilence(); releaseHold();
          if (this.attempt === attempt) { this.attempt = undefined; this.unlisten?.(); this.unlisten = undefined; }
        });
      },
    });
    this.attempt = attempt;
    const stop = () => { cancelled = true; this.stop(); };
    const hidden = () => { if (document.hidden) stop(); };
    if (typeof window !== "undefined") {
      for (const event of ["blur", "pagehide", "popstate", "hashchange"]) window.addEventListener(event, stop);
      document.addEventListener("visibilitychange", hidden);
      this.unlisten = () => {
        for (const event of ["blur", "pagehide", "popstate", "hashchange"]) window.removeEventListener(event, stop);
        document.removeEventListener("visibilitychange", hidden);
      };
    }
    void attempt.start();
  }
  stop() {
    this.publish({ matches: [] });
    this.unlisten?.(); this.unlisten = undefined;
    this.attempt?.stop();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.generation++;
    this.unwatch(); this.stop();
    this.session.focusMicrophone(false);
    this.used.clear();
  }
}
