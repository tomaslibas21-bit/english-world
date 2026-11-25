import { EDITION } from "../../edition";
import { foldAccents, tokenizeInput, tokenSimilarity, type Tokens } from "../../convo/normalize";
import { wholeSoundalike } from "../../convo/soundalike";
import { createSpeechAttempt, hasNegation, speechSupported, type Verdict } from "../../convo/speech";
import { useStore } from "../../state/store";
import { audio } from "../audio";

export type SayItTarget = { phrases: string[]; lang?: string; evaluate(text: string): Verdict };
export type SayItBonus = SayItTarget & { available?(): boolean; onAward?(): void };

function cueForms(text: string): Tokens[] {
  if (EDITION.id === "es") return tokenizeInput(foldAccents(text)).variants.flatMap((words) => {
    const bare = words[0] === "mira" ? words.slice(1)
      : (words[0] === "eso" || words[0] === "esto") && words[1] === "es" ? words.slice(2)
      : words[0] === "es" ? words.slice(1) : words;
    const noArticle = /^(el|la|los|las|un|una|unos|unas)$/.test(bare[0]) ? bare.slice(1) : bare;
    return [words, bare, noArticle].filter((tokens) => tokens.length);
  });
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

type SayItFeedback = "hit" | "miss" | "nothing" | "error" | "denied";
type SayItStatus = "idle" | "listening" | SayItFeedback;

export class SayItCue {
  private status: SayItStatus = "idle";
  private listeners = new Set<() => void>();
  private attempt?: ReturnType<typeof createSpeechAttempt>;
  private feedback?: ReturnType<typeof setTimeout>;
  private closed = false;
  private credited = new Set<SayItBonus>();

  constructor(private targets: SayItBonus[], private award: () => void) {}

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
    if (this.closed || !speechSupported()) return;
    if (this.attempt) { this.cancel(); return; }
    const targets = this.availableTargets();
    if (!targets.length) return;
    clearTimeout(this.feedback);
    const show = (status: SayItFeedback) => {
      this.attempt?.dispose();
      this.attempt = undefined;
      this.set(status);
      this.feedback = setTimeout(() => this.set("idle"), 1550);
    };
    const attempt = createSpeechAttempt({
      phrases: targets.flatMap((target) => target.phrases), lang: targets[0].lang,
      preferLocal: useStore.getState().settings.onDevice,
      evaluate: (text) => {
        const verdicts = targets.map((target) => target.evaluate(text));
        return verdicts.includes("complete") ? "complete" : verdicts.includes("prefix") ? "prefix" : "none";
      },
      timing: { finishedAnswer: 300, unclear: 650, interimStable: 550 },
      onUpdate: ({ status }) => {
        if (this.attempt !== attempt) return;
        if (status === "nothing" || status === "error" || status === "denied") show(status);
      },
      onCommit: (text, alternatives) => {
        if (this.attempt !== attempt) return;
        const negated = hasNegation(text);
        const accepted = [text, ...alternatives].filter((heard) => !negated || hasNegation(heard));
        const hit = targets.find((target) => target.available?.() !== false
          && accepted.some((heard) => target.evaluate(heard) === "complete"));
        if (hit) {
          this.credited.add(hit);
          audio.sfx("sparkle"); // the bonus: a bright little chime (recorded; silent until loaded)
          this.award();
          hit.onAward?.();
        }
        show(hit ? "hit" : "miss");
      },
    });
    this.attempt = attempt;
    this.set("listening");
    attempt.start();
  };

  private availableTargets() {
    return this.targets.filter((target) => !this.credited.has(target) && target.available?.() !== false);
  }

  get awarded() { return this.availableTargets().length === 0; }
}

/** One count per round, with at most one live cue and one credit for each cue. */
export class SayItRound {
  private cue?: SayItCue;
  private total = 0;

  get count() { return this.total; }
  get result(): { said?: number } { return this.total ? { said: this.total } : {}; }

  open(target: SayItBonus, ...alternatives: SayItBonus[]) {
    this.close();
    return this.cue = new SayItCue([target, ...alternatives], () => { this.total++; });
  }

  close() {
    this.cue?.close();
    this.cue = undefined;
  }
}
