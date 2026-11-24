import { NPCS } from "../../content/npcs";
import type { SentSrc } from "../../content/types";
import { coachVoice, npcVoice } from "../../content/voices";
import type { Sentence } from "../../convo/compose";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { conversationLine, learnerTurn } from "./lines";
import { useStore } from "../../state/store";
import { audio } from "../audio";

export interface KitLine { key: string; sentence: Sentence; pieces?: Sentence[] }
type SpeechMatcher = ReturnType<typeof learnerTurn<KitLine>>;
export interface KitMic {
  status: "off" | "starting" | "listening" | "unclear";
  heard: string;
}

export class ModeDialogue {
  private playback: { key: string; left: number; audible: boolean; completed: boolean; restart(): void; finish(ok: boolean): void } | null = null;
  private turn: { options: KitLine[]; speech: SpeechMatcher; finish(line: KitLine | null): void; retries: number; choosing?: boolean } | null = null;
  private attempt: ReturnType<typeof createSpeechAttempt> | null = null;
  private retryIn = 0;
  private paused = false;
  private micHeld = false;
  private generation = 0;
  micOn = true;

  constructor(private ui: {
    say(line: KitLine | null): void;
    answer?(line: KitLine): void;
    choices(lines: KitLine[]): void;
    mic(state: KitMic): void;
    animate?(seconds: number): void;
    /** Use only installed browser voices for speech synthesis. */
    speechFallback?: boolean;
    /** Give an unrecorded learner line time for browser speech. */
    allowBrowserVoice?: boolean;
    framePlayback?: boolean;
    /** Advance on the frame clock when there is no installed recording. */
    recordingOnly?: boolean;
  }) {}

  private resolve(situation: string, npcId: string, key: string, fallback: Record<string, SentSrc[]> | undefined, learner: boolean): KitLine | null {
    const sentence = conversationLine(situation, npcId, key, fallback, learner);
    return sentence ? { key, sentence } : null;
  }

  private play(line: KitLine, voice: string, speed: number, male: boolean, learner = false, onVoiced?: (ok: boolean) => void) {
    const { slowVoice: slow, volume } = useStore.getState().settings;
    const text = line.sentence.say;
    const clip = audio.clipDuration(voice, speed, text);
    // Muted dialogue uses its reading time and never waits for browser audio.
    const audible = volume !== 0 && (clip != null || (!this.ui.recordingOnly && text !== `[${line.key}]`));
    const est = clip == null ? (learner && !this.ui.allowBrowserVoice ? 0.5 : Math.min(4, 0.5 + text.length * 0.06)) : clip / (slow ? 0.82 : 1);
    return new Promise<boolean>((finish) => {
      const estimate = this.ui.framePlayback && clip == null ? Math.max(est, text.length * (slow ? 0.09 : 0.07)) : est;
      const duration = audible ? estimate + 2 : estimate;
      let heard = false;
      let playbackId = 0;
      const playing = {
        key: line.key, left: duration, audible, completed: false,
        restart: () => {
          const id = ++playbackId;
          playing.left = duration;
          playing.completed = false;
          if (!learner) this.ui.animate?.(est);
          if (audible) void audio.play(voice, speed, text, { slow, male, localVoiceOnly: this.ui.speechFallback, ...(this.ui.recordingOnly && { optional: true, recordingOnly: true }) }).then((ok) => {
            if (!ok || this.playback !== playing || id !== playbackId) return;
            heard = true;
            if (this.ui.framePlayback) playing.completed = true;
            else this.endPlayback(true);
          });
        },
        finish: (ok: boolean) => {
          onVoiced?.(heard);
          finish(ok);
        },
      };
      this.playback = playing;
      playing.restart();
    });
  }

  async say(situation: string, npcId: string, key: string, fallback?: Record<string, SentSrc[]>) {
    if (this.turn || this.playback) return null;
    const line = this.resolve(situation, npcId, key, fallback, false);
    if (!line) return null;
    const npc = NPCS[npcId];
    return this.sayLine(line, npcVoice(npc), npc.speed ?? 1, npc.gender === "m");
  }

  async sayLine(line: KitLine, voice: string, speed: number, male: boolean) {
    if (this.turn || this.playback) return null;
    this.ui.say(line);
    return await this.play(line, voice, speed, male) ? line : null;
  }

  /** Replay the visible line without advancing the dialogue or accepting mic input over the clip. */
  async replayLine(line: KitLine, voice: string, speed: number, male: boolean, learner = false) {
    if (this.paused) return;
    if (this.playback) {
      if (this.playback.key === line.key) this.playback.restart();
      return;
    }
    if (this.turn?.choosing) return;
    this.stopListening();
    if (await this.playPieces(line, voice, speed, male, learner)) this.listen();
  }

  /** Shows one composed call while its individual recording keys play in order. */
  async sayPieces(line: KitLine, voice: string, speed: number, male: boolean) {
    if (this.turn || this.playback) return false;
    this.ui.say(line);
    let allAudible = true;
    const played = await this.playPieces(line, voice, speed, male, false, (ok) => { allAudible &&= ok; });
    return played && allAudible;
  }

  private async playPieces(line: KitLine, voice: string, speed: number, male: boolean, learner: boolean, onVoiced?: (ok: boolean) => void) {
    const generation = this.generation;
    for (const sentence of line.pieces ?? [line.sentence]) {
      if (generation !== this.generation || !await this.play({ key: line.key, sentence }, voice, speed, male, learner, onVoiced)) return false;
    }
    return true;
  }

  clearLine() {
    this.ui.say(null);
  }

  async expect(situation: string, npcId: string, keys: string[], fallback: Record<string, SentSrc[]> | undefined, accept: Readonly<Record<string, readonly string[]>> = {}) {
    if (this.turn || this.playback) return null;
    const options = keys.flatMap((key) => this.resolve(situation, npcId, key, fallback, true) ?? []);
    return this.expectLines(options, learnerTurn(options, accept));
  }

  expectLines(options: KitLine[], speech: SpeechMatcher) {
    if (this.turn || this.playback || !options.length) return Promise.resolve(null);
    return new Promise<KitLine | null>((finish) => {
      this.turn = { options, speech, finish, retries: 0 };
      this.ui.choices(options);
      this.listen();
    });
  }

  key(key: string) {
    if (key === "m" && this.turn) { this.setMic(!this.micOn); return true; }
    const choice = /^\d$/.test(key) ? this.turn?.options[Number(key) - 1] : null;
    if (!choice) return false;
    this.choose(choice.key);
    return true;
  }

  choose(key: string, spoken = false) {
    const turn = this.turn, line = turn?.options.find((option) => option.key === key);
    if (!turn || !line || turn.choosing || this.paused || this.playback) return;
    this.stopListening();
    this.ui.choices([]);
    this.ui.answer?.(line);
    if (spoken) {
      this.turn = null;
      turn.finish(line);
      return;
    }
    turn.choosing = true;
    const gender = useStore.getState().progress.profile?.gender;
    const voice = coachVoice(gender);
    const played = line.pieces ? this.playPieces(line, voice, 1, gender === "m", true) : this.play(line, voice, 1, gender === "m", true);
    void played.then((ok) => {
      if (this.turn !== turn) return;
      this.turn = null;
      turn.finish(ok ? line : null);
    });
  }

  skipTurn() {
    if (!this.playback && this.turn && !this.turn.choosing) {
      const turn = this.turn;
      this.turn = null;
      this.stopListening();
      this.ui.choices([]);
      turn.finish(null);
    }
  }

  setMic(on: boolean) {
    this.micOn = on;
    if (on && this.turn) {
      this.turn.retries = 0;
      this.listen();
    } else this.stopListening();
  }

  /** Another cue in this mode temporarily owns speech input. */
  holdMic(held: boolean) {
    if (this.micHeld === held) return;
    this.micHeld = held;
    if (held) this.stopListening(); else this.listen();
  }

  private listen() {
    const turn = this.turn;
    if (!turn || turn.choosing || this.playback || this.paused || this.micHeld || !this.micOn || !speechSupported() || document.hidden) return;
    this.stopListening();
    const { phrases, read } = turn.speech;
    const attempt = createSpeechAttempt({
      phrases, preferLocal: useStore.getState().settings.onDevice,
      evaluate: (text) => read(text).verdict,
      onUpdate: ({ status, heard }) => {
        if (this.attempt !== attempt) return;
        if (status === "nothing" || status === "error" || status === "denied") { this.stopListening(); return; }
        this.ui.mic({ status: status === "starting" ? "starting" : status === "idle" ? "off" : "listening", heard });
      },
      onCommit: (text, alternatives) => {
        if (this.attempt !== attempt || this.turn !== turn) return;
        this.stopListening();
        const answer = [text, ...alternatives].map((heard) => read(heard).answer).find(Boolean);
        if (answer) this.choose(answer.key, true);
        else {
          this.ui.mic({ status: "unclear", heard: text });
          if (++turn.retries < 3) this.retryIn = 1.3;
        }
      },
    });
    this.attempt = attempt;
    attempt.start();
  }

  private stopListening() {
    const attempt = this.attempt;
    this.attempt = null;
    attempt?.dispose();
    this.retryIn = 0;
    this.ui.mic({ status: "off", heard: "" });
  }

  private endPlayback(ok: boolean) {
    const playing = this.playback;
    this.playback = null;
    if (playing?.audible) audio.stop();
    playing?.finish(ok);
  }

  update(dt: number, paused: boolean) {
    if (paused !== this.paused) {
      this.paused = paused;
      if (paused) this.stopListening(); else this.listen();
    }
    if (paused) return;
    const playing = this.playback;
    // A mode clock can bound stalled audio and apply completions on its next frame.
    if (playing) {
      if (this.ui.framePlayback || !playing.audible || audio.getState() !== "playing") playing.left -= dt;
      if (playing.completed || playing.left <= 0) this.endPlayback(true);
    }
    if (this.retryIn > 0 && (this.retryIn -= dt) <= 0) this.listen();
  }

  cancelTurn() {
    const turn = this.turn;
    this.turn = null;
    this.stopListening();
    turn?.finish(null);
    this.ui.choices([]);
  }

  cancel() {
    this.micHeld = false;
    this.generation++;
    this.endPlayback(false);
    this.cancelTurn();
    this.clearLine();
    this.paused = false;
  }
}
