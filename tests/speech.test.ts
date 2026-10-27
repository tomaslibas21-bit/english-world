// The speech attempt (src/convo/speech.ts) with a simulated recogniser and clock, after the course flashcards' tests
// (fluent-steps tests/speech-attempt.test.mjs). These don't test a real microphone.
import { beforeEach, describe, expect, it } from "vitest";
import { createSpeechAttempt, resetSpeechForTests, SPEECH_TIMING, type SpeechRecognizer, type SpeechSnapshot, type Verdict } from "../src/convo/speech";
import { bestReading } from "../src/convo/readings";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";

// A tiny grammar: these answers are complete, and any start of one is a valid beginning.
const COMPLETE = ["i'd like a latte", "i'd like a latte please", "a latte please", "yes", "large", "i want to go there"];
const norm = (t: string) => t.toLowerCase().replace(/[^a-z' ]/g, "").replace(/\s+/g, " ").trim();
function evaluate(text: string): Verdict {
  const t = norm(text);
  if (COMPLETE.includes(t)) return "complete";
  return COMPLETE.some((c) => c.startsWith(t + " ")) ? "prefix" : "none";
}

class FakeRec implements SpeechRecognizer {
  lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
  processLocally?: boolean; phrases?: unknown;
  onstart: (() => void) | null = null;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  aborted = false;
  constructor(private list: FakeRec[]) {}
  start() { this.list.push(this); }
  abort() { this.aborted = true; }
  emitStart() { this.onstart?.(); }
  speech() { this.onspeechstart?.(); }
  silence() { this.onspeechend?.(); }
  results(rs: { final: boolean; alts: string[] }[]) {
    this.onresult?.({ results: rs.map((r) => Object.assign(r.alts.map((transcript) => ({ transcript })), { isFinal: r.final })) });
  }
  error(error: string) { this.onerror?.({ error }); }
  end() { this.onend?.(); }
}

function harness(opts: { preferLocal?: boolean; phrases?: string[] } = {}) {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock = {
    now: () => now,
    setTimeout: (fn: () => void, delay: number) => { const t = ++id; timers.set(t, { at: now + delay, fn }); return t as any; },
    clearTimeout: (t: any) => { timers.delete(t); },
  };
  const advance = (ms: number) => {
    const until = now + ms;
    for (let guard = 0; guard < 2_000; guard++) {
      const next = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].fn();
    }
    now = until;
  };
  const recs: FakeRec[] = [];
  const updates: SpeechSnapshot[] = [];
  const commits: { text: string; alts: string[] }[] = [];
  const attempt = createSpeechAttempt({
    evaluate,
    onUpdate: (s) => updates.push(s),
    onCommit: (text, alts) => commits.push({ text, alts }),
    createRecognition: () => new FakeRec(recs),
    clock,
    ...opts,
  });
  attempt.start();
  const rec = () => recs[recs.length - 1];
  rec().emitStart();
  const status = () => updates[updates.length - 1]?.status;
  return { attempt, advance, rec, recs, updates, commits, status };
}

beforeEach(() => resetSpeechForTests());

describe("speech attempt", () => {
  it("treats silence as no answer, not a wrong one", () => {
    const h = harness();
    h.advance(SPEECH_TIMING.firstWord - 1_000);
    expect(h.commits).toHaveLength(0);
    expect(h.status()).toBe("listening");
    h.advance(1_500);
    expect(h.commits).toHaveLength(0);
    expect(h.status()).toBe("nothing");
  });

  it("hands over an understood answer after a short silence, not before", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["I'd like a latte"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer - 100);
    expect(h.commits).toHaveLength(0);
    h.advance(200);
    expect(h.commits).toEqual([{ text: "I'd like a latte", alts: [] }]);
  });

  it("lets the learner add a word to an understood answer", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["a latte"] }, { final: false, alts: ["please"] }]);
    h.advance(SPEECH_TIMING.finishedAnswer + 500);
    expect(h.commits).toHaveLength(0);
    h.rec().results([{ final: true, alts: ["a latte"] }, { final: true, alts: ["please"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer + 100);
    expect(h.commits[0].text).toBe("a latte please");
  });

  it("never ends while the learner is still speaking", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: false, alts: ["blah"] }]);
    h.advance(30_000);
    expect(h.commits).toHaveLength(0);
    h.advance(SPEECH_TIMING.session);
    expect(h.commits).toHaveLength(1); // the whole attempt has a limit
  });

  it("gives an unfinished answer a long pause", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["I'd like a"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.betweenWords - 1_000);
    expect(h.commits).toHaveLength(0);
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["I'd like a"] }, { final: true, alts: ["latte"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer + 100);
    expect(h.commits[0].text).toBe("I'd like a latte");
  });

  it("hands over words the grammar can't use after a short pause, so the learner sees what was heard", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["banana telephone"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.unclear - 200);
    expect(h.commits).toHaveLength(0);
    h.advance(400);
    expect(h.commits[0].text).toBe("banana telephone");
  });

  it("takes the recogniser's other guess when only that one is understood", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["I'd like a lot of", "I'd like a latte"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer + 100);
    expect(h.commits[0].text).toBe("I'd like a latte");
    expect(h.commits[0].alts).toContain("I'd like a lot of");
  });

  it("combines the guesses for each piece of the answer", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["I like", "I'd like"] }, { final: true, alts: ["a lot of", "a latte"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer + 100);
    expect(h.commits[0].text).toBe("I'd like a latte");
  });

  it("keeps the words across the browser's own restarts", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["I'd like a"] }]);
    h.rec().end();
    expect(h.status()).toBe("reconnecting");
    h.advance(300);
    expect(h.recs).toHaveLength(2);
    h.rec().emitStart();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["latte"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer + 100);
    expect(h.commits[0].text).toBe("I'd like a latte");
  });

  it("lets the learner start the answer again in the same breath", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: true, alts: ["um"] }, { final: true, alts: ["I'd like a latte"] }]);
    h.rec().silence();
    h.advance(SPEECH_TIMING.finishedAnswer + 100);
    expect(h.commits[0].text).toBe("I'd like a latte");
  });

  it("gives up on a browser that keeps ending at once", () => {
    const h = harness();
    for (let i = 0; i < 8 && h.attempt.running; i++) { h.rec().end(); h.advance(2_100); h.rec().emitStart(); }
    expect(h.attempt.running).toBe(false);
    expect(h.commits).toHaveLength(0);
    expect(h.status()).toBe("nothing");
  });

  it("reports a blocked microphone", () => {
    const h = harness();
    h.rec().error("not-allowed");
    expect(h.status()).toBe("denied");
    expect(h.attempt.running).toBe(false);
  });

  it("treats the browser's no-speech as silence and listens on", () => {
    const h = harness();
    h.rec().error("no-speech");
    expect(h.status()).toBe("reconnecting");
    h.rec().end();
    h.advance(300);
    expect(h.recs).toHaveLength(2);
    expect(h.attempt.running).toBe(true);
  });

  it("uses what was heard so far when the learner stops it", () => {
    const h = harness();
    h.rec().speech();
    h.rec().results([{ final: false, alts: ["I'd like a lat"] }]);
    h.attempt.finish();
    expect(h.commits[0].text).toBe("I'd like a lat");
  });

  it("uses the server recogniser unless the device is chosen, and the word list only on the device", () => {
    (globalThis as any).SpeechRecognitionPhrase = class { constructor(public phrase: string, public boost: number) {} };
    try {
      const server = harness({ phrases: ["latte"] });
      expect(server.rec().processLocally).toBeUndefined();
      expect(server.rec().phrases).toBeUndefined();

      resetSpeechForTests("available");
      const device = harness({ preferLocal: true, phrases: ["latte"] });
      expect(device.rec().processLocally).toBe(true);
      expect(Array.isArray(device.rec().phrases)).toBe(true);
      // a browser that refuses the list: try again without it, and don't ask again
      device.rec().error("phrases-not-supported");
      device.advance(100);
      expect(device.recs).toHaveLength(2);
      expect(device.rec().phrases).toBeUndefined();
      const again = harness({ preferLocal: true, phrases: ["latte"] });
      expect(again.rec().phrases).toBeUndefined();
    } finally {
      delete (globalThis as any).SpeechRecognitionPhrase;
    }
  });
});

describe("the most useful reading", () => {
  const cafe = () => {
    const sit = SITUATION_BY_ID["s72-cafe"];
    const conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed: 1, memory: {} });
    conv.start();
    return conv;
  };
  it("prefers a reading that names a drink on the menu over an unknown order", () => {
    const conv = cafe();
    const pick = bestReading(conv.nlu, conv.expectedIntents(), "I'd like a lot of", ["I'd like a latte"]);
    expect(pick).toBe("I'd like a latte");
  });
  it("keeps the recogniser's best guess when it is understood", () => {
    const conv = cafe();
    expect(bestReading(conv.nlu, conv.expectedIntents(), "A cappuccino, please", ["A cappuccino, peas"])).toBe("A cappuccino, please");
  });
  it("prefers an understood reading over one that isn't", () => {
    const conv = cafe();
    expect(bestReading(conv.nlu, conv.expectedIntents(), "banana telephone", ["a latte please"])).toBe("a latte please");
  });
});
