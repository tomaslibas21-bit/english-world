import { NPCS } from "../../content/npcs";
import type { SentSrc } from "../../content/types";
import { coachVoice, npcVoice } from "../../content/voices";
import type { Sentence } from "../../convo/compose";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { conversationLine, learnerTurn } from "./lines";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import type { ActorTalk, ActingTarget } from "../talkNatural/binding";

export interface KitLine { key: string; sentence: Sentence; pieces?: Sentence[] }
export interface KitMic {
  status: "off" | "starting" | "listening" | "unclear";
  heard: string;
}

type SpeechMatch = { key: string; sentence: { en: string }; line?: KitLine; name?: string };
type SpeechMatcher = ReturnType<typeof learnerTurn<SpeechMatch>>;
type SpokenNames = { names: readonly string[]; select(name: string): void };

export class ModeDialogue {
  private playback: { left: number; clip: boolean; completed: boolean; finish(ok: boolean): void } | null = null;
  private turn: { options: KitLine[]; speech: SpeechMatcher; spokenNames?: SpokenNames;
    finish(line: KitLine | null): void; retries: number; choosing?: boolean } | null = null;
  private attempt: ReturnType<typeof createSpeechAttempt> | null = null;
  private retryIn = 0;
  private paused = false;
  private micHeld = false;
  private generation = 0;
  private acting?: ActorTalk;
  micOn = true;

  constructor(private readonly ui: {
    say(line: KitLine | null): void;
    choices(lines: KitLine[]): void;
    mic(state: KitMic): void;
    answer?(line: KitLine): void;
    animate?(seconds: number): void;
    acting?(): ActorTalk | undefined;
    actor?(listening: boolean): ActingTarget | undefined;
    allowBrowserVoice?: boolean;
    framePlayback?: boolean;
    speechFallback?: boolean;
  }) {}

  private presentation() {
    if (!this.acting) {
      this.acting = this.ui.acting?.();
      this.acting?.pause(this.paused);
    }
    return this.acting;
  }

  private showChoices(lines: KitLine[]) {
    if (this.acting) this.attend(lines.length > 0);
    this.ui.choices(lines);
  }

  attend(waiting: boolean) {
    const actor = waiting ? this.ui.actor?.(true) : undefined;
    if (actor) this.presentation()?.listen(actor, true);
    else this.acting?.listen(undefined, false);
  }

  feedback(kind: "understood" | "puzzled") { this.acting?.react(kind); }
  releaseActor() { this.acting?.release(); }

  private resolve(situation: string, npcId: string, key: string, fallback: Record<string, SentSrc[]>, learner: boolean): KitLine | null {
    const sentence = conversationLine(situation, npcId, key, fallback, learner);
    return sentence ? { key, sentence } : null;
  }

  private play(line: KitLine, voice: string, speed: number, male: boolean, learner = false, onVoiced?: (ok: boolean) => void, replay = false) {
    const slow = !!useStore.getState().settings.slowVoice;
    const text = line.sentence.say;
    const clip = audio.clipDuration(voice, speed, text);
    const est = clip == null ? (learner && !this.ui.allowBrowserVoice ? 0.5 : Math.min(4, 0.5 + text.length * 0.06)) : clip / (slow ? 0.82 : 1);
    const voiced = clip != null || !!this.ui.allowBrowserVoice || !!this.ui.speechFallback;
    const actor = !learner ? this.ui.actor?.(false) : undefined;
    const acting = actor && this.presentation()?.speak(actor, line.key, text, est, voiced, replay);
    if (!learner && !acting) this.ui.animate?.(est);
    return new Promise<boolean>((finish) => {
      const estimate = this.ui.framePlayback && clip == null ? Math.max(est, text.length * (slow ? 0.09 : 0.07)) : est;
      const left = clip == null && !this.ui.framePlayback ? estimate : estimate + 2;
      const playing = { left, clip: voiced, completed: false, finish: (ok: boolean) => {
        if (acting) acting.finished = true;
        onVoiced?.(audible);
        finish(ok);
      } };
      let audible = false;
      this.playback = playing;
      if (voiced) void audio.play(voice, speed, text, { slow, male, localVoiceOnly: this.ui.speechFallback, visual: acting?.owner }).then((ok) => {
        if (!ok || this.playback !== playing) return;
        audible = useStore.getState().settings.volume > 0;
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

  async replayLine(line: KitLine, voice: string, speed: number, male: boolean, learner = false) {
    if (this.paused || this.playback || this.turn?.choosing) return;
    this.stopListening();
    const turn = this.turn;
    await this.play(line, voice, speed, male, learner, undefined, true);
    if (turn && this.turn === turn) this.listen();
  }

  /** Shows one composed call while its individual recording keys play in order. */
  async sayPieces(line: KitLine, voice: string, speed: number, male: boolean, replay = false) {
    if (this.turn || this.playback) return false;
    this.ui.say(line);
    let allAudible = true;
    const played = await this.playPieces(line, voice, speed, male, false, (ok) => { allAudible &&= ok; }, replay);
    return played && allAudible;
  }

  private async playPieces(line: KitLine, voice: string, speed: number, male: boolean, learner: boolean, onVoiced?: (ok: boolean) => void, replay = false) {
    const generation = this.generation;
    for (const sentence of line.pieces ?? [line.sentence]) {
      if (generation !== this.generation || !await this.play({ key: line.key, sentence }, voice, speed, male, learner, onVoiced, replay)) return false;
      replay = false;
    }
    return true;
  }

  clearLine() {
    this.ui.say(null);
  }

  async expect(situation: string, npcId: string, keys: string[], fallback: Record<string, SentSrc[]>,
    accept: Readonly<Record<string, readonly string[]>> = {}, spokenNames?: SpokenNames) {
    if (this.turn || this.playback) return null;
    const options = keys.flatMap((key) => this.resolve(situation, npcId, key, fallback, true) ?? []);
    const matches: SpeechMatch[] = options.map((line) => ({ ...line, line }));
    const namedAccept: Record<string, readonly string[]> = { ...accept };
    for (const name of spokenNames?.names ?? []) {
      matches.push({ key: name, sentence: { en: name }, name });
      for (const line of options) {
        const key = `${name}:${line.key}`;
        matches.push({ key, sentence: { en: `${name} ${line.sentence.en}` }, line, name });
        namedAccept[key] = (accept[line.key] ?? []).map((phrase) => `${name} ${phrase}`);
      }
    }
    return this.beginTurn(options, learnerTurn(matches, namedAccept), spokenNames);
  }

  expectLines(options: KitLine[], speech: ReturnType<typeof learnerTurn<KitLine>>) {
    return this.beginTurn(options, {
      phrases: speech.phrases,
      read(text) {
        const { answer, verdict } = speech.read(text);
        return { answer: answer && { ...answer, line: answer }, verdict };
      },
    });
  }

  private beginTurn(options: KitLine[], speech: SpeechMatcher, spokenNames?: SpokenNames) {
    if (this.turn || this.playback || !options.length) return Promise.resolve(null);
    this.presentation();
    return new Promise<KitLine | null>((finish) => {
      this.turn = { options, speech, spokenNames, finish, retries: 0 };
      this.showChoices(options);
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
    this.showChoices([]);
    this.feedback("understood");
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
      this.showChoices([]);
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
        if (answer) {
          if (answer.name) turn.spokenNames?.select(answer.name);
          if (answer.line) this.choose(answer.line.key, true);
          else { turn.retries = 0; this.retryIn = 0.15; }
        } else {
          this.feedback("puzzled");
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
      this.acting?.pause(paused);
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
    this.releaseActor();
    this.generation++;
    this.endPlayback(false);
    const turn = this.turn;
    this.turn = null;
    this.stopListening();
    turn?.finish(null);
    this.showChoices([]);
    this.clearLine();
    this.paused = false;
    this.micHeld = false;
  }
}
