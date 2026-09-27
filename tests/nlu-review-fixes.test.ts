// Engine fixes from docs/BUG-REVIEW.md (25 Sep 2026), each with a trap where the meaning could flip:
// thousands in prices, times written "7.30" / "7pm", replays that piled up their intros, one answer split
// into several pieces, and leaving a conversation early ("Sorry, I have to go.").
import { afterAll, describe, expect, it } from "vitest";
import { Nlu } from "../src/convo/nlu";
import { priceSlot, timeSlot, setKnownNames } from "../src/convo/slots";
import { tokenizeInput } from "../src/convo/normalize";
import { buildNlu, Conversation, type NpcInfo } from "../src/convo/dialogue";
import { GLOBAL } from "../src/content/global";
import type { SituationDef } from "../src/content/types";
import type { SlotDefs } from "../src/convo/grammar";

/** Values of a slot that cover the whole input. */
const whole = (fn: typeof priceSlot, s: string) => {
  const t = tokenizeInput(s).variants[0];
  return fn(t, 0, false).filter((r) => r.end === t.length).map((r) => r.value);
};

describe("prices with thousands (BUG-REVIEW engine #1)", () => {
  it("joins thousands separators", () => {
    expect(whole(priceSlot, "$12,000")).toContain(1200000);
    expect(whole(priceSlot, "$12,000")).not.toContain(1200);
    expect(whole(priceSlot, "12,000 dollars")).toContain(1200000);
    expect(whole(priceSlot, "$1,050")).toContain(105000);
    expect(whole(priceSlot, "$1,050")).not.toContain(150);
    expect(whole(priceSlot, "$1,000,000")).toContain(100000000);
    expect(whole(priceSlot, "$12,000.50")).toContain(1200050);
  });
  it("reads a space as a thousands separator too", () => {
    expect(whole(priceSlot, "12 000 dollars")).toContain(1200000);
    expect(whole(priceSlot, "12 000 dollars")).not.toContain(1200);
    expect(whole(priceSlot, "$12 000")).toContain(1200000);
    expect(whole(priceSlot, "12000")).toContain(1200000);
  });
  it("trap: a European decimal comma stays cents", () => {
    expect(whole(priceSlot, "4,50")).toContain(450);
    expect(whole(priceSlot, "$4,50")).toContain(450);
    expect(whole(priceSlot, "4.50")).toContain(450);
    expect(whole(priceSlot, "four fifty")).toContain(450);
  });
  it("trap: three digits or a leading zero are never cents", () => {
    expect(whole(priceSlot, "12 dollars 000")).toEqual([]);
    expect(whole(priceSlot, "4 050")).not.toContain(450);
    expect(whole(priceSlot, "000 dollars")).toEqual([]);
  });

  const n = new Nlu();
  n.addIntent("cash_amount", ["[yes] i have {price} [in cash]", "[yes] [about] {price}"]);
  n.addIntent("pay_cash", ["cash", "[can i] pay (in | with) cash"]);
  n.addIntent("pay_card", ["card", "[can i] pay (with | by) card"]);
  const exp = ["cash_amount", "pay_cash", "pay_card"];
  it("a customs declaration keeps its amount, in one piece", () => {
    const r = n.parse("I have $12,000 in cash", exp);
    expect(r.best?.segments.map((s) => s.slots.price)).toEqual([1200000]);
    const r2 = n.parse("yes, 12,000 dollars", exp);
    expect(r2.best?.segments.map((s) => s.slots.price)).toEqual([1200000]);
    expect(n.parse("I have $4,50", exp).best?.segments.map((s) => s.slots.price)).toEqual([450]);
  });
  it("trap: 'no cash' still means no cash", () => {
    const got = n.parse("no cash", exp).best?.segments.map((s) => s.intent) ?? [];
    expect(got).not.toContain("pay_cash");
    expect(got).not.toContain("cash_amount");
  });
});

describe("clock times (BUG-REVIEW engine #4)", () => {
  it("reads '7.30' and '19.30'", () => {
    expect(whole(timeSlot, "7.30")).toContainEqual({ h: 7, m: 30 });
    expect(whole(timeSlot, "19.30")).toContainEqual({ h: 19, m: 30 });
    expect(whole(timeSlot, "10:30")).toContainEqual({ h: 10, m: 30 });
  });
  it("reads '7pm', '7:30pm' and '7.30 p.m.'", () => {
    expect(whole(timeSlot, "7pm")).toContainEqual({ h: 7, m: 0, ampm: "pm" });
    expect(whole(timeSlot, "7:30pm")).toContainEqual({ h: 7, m: 30, ampm: "pm" });
    expect(whole(timeSlot, "7.30 p.m.")).toContainEqual({ h: 7, m: 30, ampm: "pm" });
    expect(whole(timeSlot, "8am")).toContainEqual({ h: 8, m: 0, ampm: "am" });
  });
  it("trap: no time from impossible values or dates", () => {
    expect(whole(timeSlot, "24.30")).toEqual([]);
    expect(whole(timeSlot, "7.75")).toEqual([]);
    expect(whole(timeSlot, "04.06.1990")).toEqual([]);
  });
  it("trap: a price stays a price, a time a time", () => {
    const n = new Nlu();
    n.addIntent("pay", ["here is {price}"]);
    n.addIntent("time_ans", ["at {time}"]);
    const pay = n.parse("Here is 4.50").best?.segments[0];
    expect(pay?.intent).toBe("pay");
    expect(pay?.slots.price).toBe(450);
    expect(n.parse("At 7.30").best?.segments[0].slots.time).toEqual({ h: 7, m: 30 });
  });
});

// ---------------------------------------------------------------------------
// A small conversation to test the dialogue manager itself.

const line = (en: string) => [{ en, lt: en, nat: en }];
function testSituation(withDest = true): SituationDef {
  return {
    id: "t-review", song: 0, songTitle: "", title: { en: "Test", lt: "Testas" }, topic: { en: "", lt: "" },
    chapter: 0, order: 0, location: "x", npc: "sam", goal: "",
    grammar: { slots: { place: { lexicon: [{ id: "airport", forms: ["the airport", "airport"] }] } } as SlotDefs },
    intents: {
      name_ctx: { patterns: ["{name}", "my (first | last) name is {name}"] },
      pay: { patterns: ["{price}", "here is {price}"] },
      hello_there: { patterns: ["hello there"] },
      at_time: { patterns: ["at {time}"] },
      where_am_i: { patterns: ["where (are we | am i)"] },
      ...(withDest ? { dest: { patterns: ["[i need to go | i have to go | take me] to {place}"] } } : {}),
    },
    lines: { ask_name: line("Your name?"), ask_dest: line("Where to?"), pay_later: line("You can pay later."), ok: line("Okay.") },
    hints: {},
    steps: [
      { id: "name", done: (c) => (c.s.names?.length ?? 0) > 0, ask: (c) => c.say("ask_name"), expects: ["name_ctx"] },
      { id: "dest", done: (c) => !!c.s.dest, ask: (c) => c.say("ask_dest"), expects: ["dest", "pay"] },
    ],
    start: () => {},
    handlers: {
      name_ctx: (c, slots) => { (c.s.names ??= []).push(slots.name); },
      pay: (c) => { c.say("pay_later"); },
      hello_there: (c) => { c.s.hellos = (c.s.hellos || 0) + 1; c.say("ok"); },
      at_time: (c) => { c.say("ok"); },
      where_am_i: (c) => { c.say("ok"); },
      dest: (c, slots) => { c.s.dest = slots.place; c.say("ok"); },
    },
  } as SituationDef;
}
const NPCS: Record<string, NpcInfo> = { sam: { id: "sam", name: "Sam", gender: "f", voice: "af_bella" } };
const newConv = (sit = testSituation()) =>
  new Conversation(sit, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: 0, seed: 1 });
const ids = (o: { lines: { lineId: string }[] }) => o.lines.map((l) => l.lineId);

describe("replays (BUG-REVIEW engine #2)", () => {
  it("'Slower' again and again doesn't pile up its intros", () => {
    const conv = newConv();
    expect(ids(conv.start())).toEqual(["ask_name"]);
    conv.input("Slower, please.");
    conv.input("Could you speak more slowly?");
    const o = conv.input("More slowly, please.");
    expect(ids(o)).toEqual(["g_slow_intro", "ask_name"]);
    expect(o.lines.every((l) => l.slow)).toBe(true);
  });
  it("'Say that again' after 'Slower' repeats the question slowly, once", () => {
    const conv = newConv();
    conv.start();
    conv.input("Slower, please.");
    const o = conv.input("Could you say that again?");
    expect(ids(o).filter((x) => x === "ask_name")).toHaveLength(1);
    expect(ids(o).filter((x) => x !== "ask_name").every((x) => x === "g_repeat_intro")).toBe(true);
    expect(o.lines.at(-1)?.slow).toBe(true);
    // the repeat button replays the question, not the intros
    expect(ids(conv.repeat())).toEqual(["ask_name"]);
  });
  it("trap: 'Slower, please' at a name question is no name", () => {
    const conv = newConv();
    conv.start();
    expect(ids(conv.input("Slower, please."))).toEqual(["g_slow_intro", "ask_name"]);
    expect(conv.s.names).toBeUndefined();
  });
});

describe("one answer read as several pieces (BUG-REVIEW engine #3)", () => {
  it("a second piece of the same intent doesn't repeat the reply", () => {
    const conv = newConv();
    conv.start();
    const o = conv.input("4.5.6");
    expect(ids(o).filter((x) => x === "pay_later")).toHaveLength(1);
  });
  it("an identical second piece is skipped", () => {
    const conv = newConv();
    conv.start();
    conv.input("Hello there, hello there!");
    expect(conv.s.hellos).toBe(1);
  });
  it("trap: two pieces with different content both count", () => {
    const conv = newConv();
    conv.start();
    conv.input("My first name is Tomas, my last name is Mikalauskas.");
    expect(conv.s.names).toEqual(["Tomas", "Mikalauskas"]);
  });
  it("a run of unknown words is not several names", () => {
    const conv = newConv();
    conv.start();
    expect(conv.input("Labas, aš noriu kavos").understood).toBe(false);
    expect(conv.s.names).toBeUndefined();
    conv.input("Tomas Mikalauskas");
    expect(conv.s.names).toEqual(["Tomas Mikalauskas"]);
  });
  it("the learner's own name after a label still counts", () => {
    const nlu = buildNlu(testSituation(), GLOBAL);
    expect(nlu.parse("Tomas. Last name Mikalauskas.", ["name_ctx"]).ok).toBe(false);
    setKnownNames(["Tomas", "Mikalauskas"]);
    expect(nlu.parse("Tomas. Last name Mikalauskas.", ["name_ctx"]).best?.segments.map((s) => s.intent)).toEqual(["name_ctx", "name_ctx"]);
  });
  afterAll(() => setKnownNames([]));
});

describe("leaving early ends any conversation (BUG-REVIEW s76–s91 #6)", () => {
  const nlu = buildNlu(testSituation(), GLOBAL);
  const intents = (s: string, exp: string[] = []) => {
    const r = nlu.parse(s, exp);
    return r.ok ? r.best!.segments.map((x) => x.intent) : [];
  };
  it("understands the usual ways to leave", () => {
    for (const s of ["Sorry, I have to go.", "I have to leave early.", "I need to go.", "I'm afraid I have to hang up.",
      "I'll call you back later.", "I'll call back later.", "Sorry, I have to go now.", "I'd better go."]) expect(intents(s), s).toEqual(["g_bye"]);
    expect(intents("I have to go, thank you!")).toContain("g_bye");
  });
  it("trap: a place, a time or a negation after it is no goodbye", () => {
    for (const s of ["I need to go to the airport", "I have to go to the airport", "I have to go to work", "I have to leave at 7",
      "I don't have to go", "I don't need to leave early", "Where do I have to go?", "When do I have to leave?", "Do I have to go now?",
      "I won't call you back"])
      expect(intents(s, ["dest", "pay", "g_bye"]), s).not.toContain("g_bye");
    expect(intents("I need to go to the airport", ["dest"])).toEqual(["dest"]);
  });
  it("speech waits for the rest of 'I need to go…' only when an answer can go on from it", () => {
    expect(nlu.probe("I need to go", ["dest"])).toBe("prefix");
    expect(buildNlu(testSituation(false), GLOBAL).probe("I need to go")).toBe("complete");
    expect(nlu.probe("Thanks, bye")).toBe("complete");
  });
  it("ends the conversation like 'Bye'", () => {
    const conv = newConv();
    conv.start();
    const o = conv.input("Sorry, I have to go.");
    expect(o.ended).toBe(true);
    expect(ids(o)).toEqual(["g_bye"]);
  });
});

describe("more global answers", () => {
  const nlu = buildNlu(testSituation(), GLOBAL);
  const first = (s: string) => nlu.parse(s, ["g_howareyou_answer"]).best?.segments[0]?.intent ?? "none";
  it("'Great, and hungry!' answers 'How are you?'", () => {
    expect(first("Great, and hungry!")).toBe("g_howareyou_answer");
    expect(first("Good, thanks, and very hungry.")).toBe("g_howareyou_answer");
    expect(first("I'm not hungry.")).not.toBe("g_howareyou_answer");
  });
  it("'I didn't understand' asks for help", () => {
    expect(first("I didn't understand.")).toBe("g_dont_understand");
    expect(first("Sorry, I didn't understand that.")).toBe("g_dont_understand");
    expect(first("I understood.")).not.toBe("g_dont_understand");
  });
});
