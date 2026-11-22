import { NPCS } from "../../content/npcs";
import type { SentSrc } from "../../content/types";
import { coachVoice, npcVoice } from "../../content/voices";
import type { Sentence } from "../../convo/compose";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { conversationLine, learnerTurn } from "./lines";
import { useStore } from "../../state/store";
import { audio } from "../audio";

export interface KitLine { key: string; sentence: Sentence }
export interface KitMic {
  status: "off" | "starting" | "listening" | "unclear";
  heard: string;
}

export class ModeDialogue {
  private playback: { left: number; clip: boolean; completed: boolean; finish(ok: boolean): void } | null = null;
  private turn: { options: KitLine[]; speech: ReturnType<typeof learnerTurn<KitLine>>; finish(line: KitLine | null): void; retries: number } | null = null;
  private attempt: ReturnType<typeof createSpeechAttempt> | null = null;
  private retryIn = 0;
  private paused = false;
  micOn = true;

  constructor(private ui: {
    say(line: KitLine | null): void;
    choices(lines: KitLine[]): void;
    mic(state: KitMic): void;
    animate?(seconds: number): void;
    allowBrowserVoice?: boolean;
    framePlayback?: boolean;
  }) {}

  private resolve(situation: string, npcId: string, key: string, fallback: Record<string, SentSrc[]>, learner: boolean): KitLine | null {
    const sentence = conversationLine(situation, npcId, key, fallback, learner);
    return sentence ? { key, sentence } : null;
  }

  private play(line: KitLine, voice: string, speed: number, male: boolean, learner = false) {
    const slow = !!useStore.getState().settings.slowVoice;
    const text = line.sentence.say;
    const clip = audio.clipDuration(voice, speed, text);
    const est = clip == null ? (learner && !this.ui.allowBrowserVoice ? 0.5 : Math.min(4, 0.5 + text.length * 0.06)) : clip / (slow ? 0.82 : 1);
    const voiced = clip != null || !!this.ui.allowBrowserVoice;
    if (!learner) this.ui.animate?.(est);
    return new Promise<boolean>((finish) => {
      const estimate = this.ui.framePlayback && clip == null ? Math.max(est, text.length * (slow ? 0.09 : 0.07)) : est;
      const left = clip == null && !this.ui.framePlayback ? estimate : estimate + 2;
      const playing = { left, clip: voiced, completed: false, finish };
      this.playback = playing;
      if (voiced) void audio.play(voice, speed, text, { slow, male }).then((ok) => {
        if (!ok || this.playback !== playing) return;
        if (this.ui.framePlayback) playing.completed = true;
        else this.endPlayback(true);
      });
    });
  }

  async say(situation: string, npcId: string, key: string, fallback: Record<string, SentSrc[]>) {
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

  clearLine() {
    this.ui.say(null);
  }

  async expect(situation: string, npcId: string, keys: string[], fallback: Record<string, SentSrc[]>, accept: Readonly<Record<string, readonly string[]>> = {}) {
    if (this.turn || this.playback) return null;
    const options = keys.flatMap((key) => this.resolve(situation, npcId, key, fallback, true) ?? []);
    if (!options.length) return null;
    return new Promise<KitLine | null>((finish) => {
      this.turn = { options, speech: learnerTurn(options, accept), finish, retries: 0 };
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
    if (!turn || !line || this.paused || this.playback) return;
    this.stopListening();
    this.ui.choices([]);
    if (spoken) {
      this.turn = null;
      turn.finish(line);
      return;
    }
    const gender = useStore.getState().progress.profile?.gender;
    void this.play(line, coachVoice(gender), 1, gender === "m", true).then((ok) => {
      if (this.turn !== turn) return;
      this.turn = null;
      turn.finish(ok ? line : null);
    });
  }

  setMic(on: boolean) {
    this.micOn = on;
    if (on && this.turn) {
      this.turn.retries = 0;
      this.listen();
    } else this.stopListening();
  }

  private listen() {
    const turn = this.turn;
    if (!turn || this.playback || this.paused || !this.micOn || !speechSupported() || document.hidden) return;
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
    if (playing?.clip) audio.stop();
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
      if (this.ui.framePlayback || !playing.clip || audio.getState() !== "playing") playing.left -= dt;
      if (playing.completed || playing.left <= 0) this.endPlayback(true);
    }
    if (this.retryIn > 0 && (this.retryIn -= dt) <= 0) this.listen();
  }

  cancel() {
    this.endPlayback(false);
    const turn = this.turn;
    this.turn = null;
    this.stopListening();
    turn?.finish(null);
    this.ui.choices([]);
    this.clearLine();
    this.paused = false;
  }
}
