import { tokenizeInput, tokenSimilarity, type Tokens } from "../../convo/normalize";
import { wholeSoundalike } from "../../convo/soundalike";
import { createSpeechAttempt, hasNegation, speechSupported, type Verdict } from "../../convo/speech";
import { useStore } from "../../state/store";

export type SayItTarget = { phrases: string[]; lang?: string; evaluate(text: string): Verdict };

function cueForms(text: string): Tokens[] {
  return tokenizeInput(text).variants.flatMap((words) => {
    const bare = words[0] === "it" && words[1] === "is" ? words.slice(2) : words;
    const noArticle = /^(a|an|the)$/.test(bare[0]) ? bare.slice(1) : bare;
    return [words, bare, noArticle];
  });
}

/** A whole word or phrase, allowing a spoken lead-in and the conversation's pronunciation variants. */
export function sayItWords(phrases: string[], otherAnswers: string[] = []): SayItTarget {
  const expected = phrases.flatMap(cueForms).filter((words) => words.length);
  const others = new Set(otherAnswers.flatMap(cueForms).map((words) => words.join(" ")));
  const same = (heard: Tokens, target: Tokens) => heard.every((word, i) => tokenSimilarity(word, target[i]) >= 0.9);
  return {
    phrases,
    evaluate(text) {
      const forms = cueForms(text);
      for (const heard of forms) {
        const phrase = heard.join(" ");
        if (others.has(phrase)) continue;
        if (expected.some((target) => (heard.length === target.length && same(heard, target))
          || wholeSoundalike(phrase, target.join(" ")))) return "complete";
      }
      return forms.some((heard) => expected.some((target) => heard.length < target.length && same(heard, target)))
        ? "prefix" : "none";
    },
  };
}

type SayItStatus = "idle" | "listening" | "hit" | "miss";

export class SayItCue {
  private status: SayItStatus = "idle";
  private listeners = new Set<() => void>();
  private attempt?: ReturnType<typeof createSpeechAttempt>;
  private feedback?: ReturnType<typeof setTimeout>;
  private closed = false;
  private credited = false;

  constructor(private target: SayItTarget, private award: () => void) {}

  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private set(status: SayItStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }

  cancel = () => {
    this.attempt?.dispose();
    this.attempt = undefined;
    if (this.status === "listening") this.set("idle");
  };

  close() {
    this.closed = true;
    this.cancel();
    clearTimeout(this.feedback);
  }

  toggle = () => {
    if (this.closed || this.credited || !speechSupported()) return;
    if (this.attempt) { this.cancel(); return; }
    clearTimeout(this.feedback);
    const show = (status: "hit" | "miss") => {
      this.attempt?.dispose();
      this.attempt = undefined;
      this.set(status);
      this.feedback = setTimeout(() => this.set("idle"), 1550);
    };
    const attempt = createSpeechAttempt({
      ...this.target, preferLocal: useStore.getState().settings.onDevice,
      timing: { finishedAnswer: 300, unclear: 650, interimStable: 550 },
      onUpdate: ({ status }) => {
        if (this.attempt !== attempt) return;
        if (status === "nothing" || status === "error" || status === "denied") show("miss");
      },
      onCommit: (text, alternatives) => {
        if (this.attempt !== attempt) return;
        const hit = [text, ...alternatives].some((heard) => (!hasNegation(text) || hasNegation(heard))
          && this.target.evaluate(heard) === "complete");
        if (hit) {
          this.credited = true;
          this.award();
        }
        show(hit ? "hit" : "miss");
      },
    });
    this.attempt = attempt;
    this.set("listening");
    attempt.start();
  };

  get awarded() { return this.credited; }
}

/** One count per round, with at most one live cue and one credit for each cue. */
export class SayItRound {
  private cue?: SayItCue;
  private total = 0;

  get count() { return this.total; }
  get result(): { said?: number } { return this.total ? { said: this.total } : {}; }

  open(target: SayItTarget) {
    this.close();
    return this.cue = new SayItCue(target, () => { this.total++; });
  }

  close() {
    this.cue?.close();
    this.cue = undefined;
  }
}
