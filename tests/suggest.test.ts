// "Did you mean…?" and "Listen and repeat" (src/convo/suggest.ts), on real situations.
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import {
  answerCandidates, compareRepeat, isConfirmation, makeGuess, markHeard, modelAnswers, pickSuggestions, playerVars,
  rankAnswers, repeatProgress, yesPicksGuess, type AnswerOpts,
} from "../src/convo/suggest";

const OPTS: AnswerOpts = { formal: true, gender: "m", npcGender: "f", vars: playerVars({ name: "Tomas" }) };

function start(sitId: string, turns: string[] = [], seed = 1) {
  const sit = SITUATION_BY_ID[sitId];
  const conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed, memory: {} });
  conv.start();
  for (const t of turns) conv.input(t);
  return { sit, conv };
}

/** The model answers the session ranks after a miss (the current hint groups), closest first. */
function rankedFor(sitId: string, heard: string, turns: string[] = []) {
  const { sit, conv } = start(sitId, turns);
  const sup = conv.support();
  const ids = [...new Set([...sup.suggest.map((x) => x.hint).filter(Boolean) as string[], ...sup.hints])];
  const groups = ids.map((id) => ({ g: sit.hints[id] ?? GLOBAL.hints[id] })).filter((x) => !!x.g);
  return { conv, ranked: rankAnswers([heard], answerCandidates(sit, groups, OPTS, [heard])) };
}
/** What the session does after a miss: ranked → only what the engine understands now → a guess. */
function guessFor(sitId: string, heard: string, turns: string[] = []) {
  const { conv, ranked } = rankedFor(sitId, heard, turns);
  return makeGuess(heard, pickSuggestions(ranked, (en) => conv.nlu.parse(en, conv.expectedIntents()).ok));
}
const marked = (g: ReturnType<typeof guessFor>) => g!.heard.filter((h) => h.miss).map((h) => h.w);

describe("did you mean", () => {
  it("offers the closest model answer, with the item the learner named", () => {
    const g = guessFor("s72-cafe", "I'd like a flat way");
    expect(g?.options[0].en).toBe("I'd like a flat white, please.");
    expect(marked(g)).toEqual(["way"]);
  });
  it("finishes a sentence that was cut off", () => {
    const g = guessFor("s68-hotel", "I'd like to check");
    expect(g?.options[0].en).toBe("I'd like to check in, please.");
    expect(marked(g)).toEqual([]);
  });
  it("offers one or two answers, and only ones the engine understands now", () => {
    const g = guessFor("s66-taxi", "I go airport");
    expect(g?.options.length).toBeGreaterThanOrEqual(1);
    expect(g!.options.length).toBeLessThanOrEqual(2);
    const { conv } = start("s66-taxi");
    for (const o of g!.options) expect(conv.nlu.parse(o.en, conv.expectedIntents()).ok).toBe(true);
    expect(g!.options[0].en).toMatch(/airport/);
    // nothing the engine rejects is offered
    const { ranked } = rankedFor("s66-taxi", "I go airport");
    expect(ranked.length).toBeGreaterThan(0);
    expect(pickSuggestions(ranked, () => false)).toEqual([]);
  });
  it("never offers the opposite meaning", () => {
    const g = guessFor("s68-hotel", "I have reservation on Tomas");
    expect(g?.options[0].en).toBe("I have a reservation.");
    expect(g!.options.some((o) => /n't|not/.test(o.en))).toBe(false);
  });
  it("stays quiet for silence, noise and unrelated talk", () => {
    for (const heard of ["", "   ", "hmm", "um uh", "the", "uh the", "what is your name", "Paris is nice", "I should notice cover so"]) {
      expect(guessFor("s72-cafe", heard), heard).toBeNull();
    }
  });
  it("marks the heard words that are not in the suggestion (not fillers or please)", () => {
    expect(markHeard("I want drink the late", "I'll have a latte.").filter((h) => h.miss).map((h) => h.w)).toEqual(["want", "drink", "the", "late"]);
    expect(markHeard("um I would like a latte please", "I'd like a latte, please.").some((h) => h.miss)).toBe(false);
    expect(markHeard("Can I pay by card?", "Can I pay by card?").some((h) => h.miss)).toBe(false);
  });
  it("composes model answers as the guide does (chosen item, else the examples in turn)", () => {
    const sit = SITUATION_BY_ID["s72-cafe"];
    const g = sit.hints.order_drink;
    const chosen = modelAnswers(sit, g, "cappuccino", OPTS, 3);
    expect(chosen).toHaveLength(3);
    for (const s of chosen) expect(s.en.toLowerCase()).toContain("cappuccino");
    const ex = modelAnswers(sit, g, undefined, OPTS, 3).map((s) => s.en);
    expect(new Set(ex).size).toBe(3);
    expect(ex.every((e) => !e.includes("…"))).toBe(true);
  });
});

describe("yes after did you mean", () => {
  it("knows a plain yes or taip", () => {
    for (const t of ["yes", "Yes!", "yeah", "oh yes", "Yes, please.", "Taip", "taip.", "Jo", "that's right"]) expect(isConfirmation(t), t).toBe(true);
    for (const t of ["", "yes, a latte", "okay", "no", "yes to go", "type"]) expect(isConfirmation(t), t).toBe(false);
    expect(isConfirmation("type", true)).toBe(true); // an English recogniser's „taip“
  });
  it("picks the suggestion only when the engine has no use for the yes", () => {
    const { conv } = start("s72-cafe"); // "What can I get you?": a yes answers nothing
    const engine = () => ({ parse: (t: string) => conv.nlu.parse(t, conv.expectedIntents()), yesAnswers: !!(conv.pending?.yes || conv.effectiveStep()?.yes) });
    expect(yesPicksGuess("yes", false, engine())).toBe(true);
    expect(yesPicksGuess("Taip", false, engine())).toBe(true);
    expect(yesPicksGuess("A latte, please.", false, engine())).toBe(false);
  });
  it("never takes over a yes the conversation understands as an answer", () => {
    const { conv } = start("s72-cafe", ["A large hot latte with oat milk, please."]); // "Anything else?"
    expect(conv.effectiveStep()?.id).toBe("more");
    const engine = { parse: (t: string) => conv.nlu.parse(t, conv.expectedIntents()), yesAnswers: !!(conv.pending?.yes || conv.effectiveStep()?.yes) };
    expect(yesPicksGuess("yes", false, engine)).toBe(false);
    expect(yesPicksGuess("yeah", true, engine)).toBe(false);
    // „taip“ is not English: the engine doesn't understand it, so it still confirms the suggestion
    expect(yesPicksGuess("taip", false, engine)).toBe(true);
  });
});

describe("listen and repeat", () => {
  it("marks each word said or missed and gives a verdict", () => {
    const full = compareRepeat("I'd like a latte, please.", "I'd like a latte please");
    expect(full.score).toBe(1);
    expect(full.verdict).toBe("great");
    const part = compareRepeat("I'd like a latte, please.", "I'd like a latte");
    expect(part.words.map((w) => w.ok)).toEqual([true, true, true, true, false]);
    expect(part.score).toBeCloseTo(0.8);
    expect(part.verdict).toBe("almost");
    expect(compareRepeat("Could I have a cappuccino, please?", "good morning").verdict).toBe("again");
    expect(compareRepeat("Could I have a cappuccino, please?", "").score).toBe(0);
  });
  it("accepts contractions, homophones and digits, but not another word form", () => {
    expect(compareRepeat("I'd like a latte.", "I would like a latte").verdict).toBe("great");
    expect(compareRepeat("Can I pay by card?", "can eye pay buy card").verdict).toBe("great");
    expect(compareRepeat("I need two tickets.", "I need 2 tickets").verdict).toBe("great");
    const r = compareRepeat("She wants a latte.", "she want a latte");
    expect(r.words.find((w) => w.w === "wants")?.ok).toBe(false);
  });
  it("keeps word order: a word said in the wrong place is missed", () => {
    const r = compareRepeat("Where is the restroom?", "the restroom where is");
    expect(r.words.filter((w) => w.ok).length).toBeLessThan(4);
  });
  it("tells the recogniser when the sentence is finished", () => {
    const m = "Could I have a cappuccino, please?";
    expect(repeatProgress(m, "Could I have a cappuccino please")).toBe("complete");
    expect(repeatProgress(m, "Could I have")).toBe("prefix");
    expect(repeatProgress(m, "banana split")).toBe("none");
  });
});
