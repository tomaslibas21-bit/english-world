// "How about Saturday? Are you free?" — a yes takes the day at once (owner, 15 Nov 2026: "Sure, that works" and
// "Yes, I am free" only got the question again; "What… Yes" got "Sure!" and the question once more).
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { setKnownNames } from "../src/convo/slots";

setKnownNames(["Tomas", "Mikalauskas"]);

function play(turns: string[], set: Record<string, any> = {}, seed = 3) {
  const sit = SITUATION_BY_ID["s84-date"];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, set); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: 1, seed, memory: {} });
  const first = conv.start().lines.map((l: any) => l.sentence.en).join(" ");
  const said: string[] = [];
  for (const t of turns) said.push(conv.input(t).lines.map((l: any) => l.sentence.en).join(" "));
  return { s: (conv as any).s, said, first, last: said.at(-1) ?? "" };
}

const ST = { opening: "meet", topics: [], askDrinks: false, askCheck: false, quick: false, busySat: false, coldTwist: false };
// Emma asks "So... can I see you again?" after the evening; "I'd like that" → "Yay! Great! How about Saturday? Are you free?"
const TO_DAY = ["Hi! It's so nice to meet you!", "I had a really nice time too", "I'd like that"];

describe("s84: a yes to “Are you free?” takes the day", () => {
  it("the owner's transcript: the first yes to Saturday makes it a date", () => {
    const r = play([...TO_DAY, "Sure that works"], ST);
    expect(r.said[2]).toMatch(/How about Saturday\? Are you free\?/);
    expect(r.s.dayAgreed, r.said.join(" / ")).toBe(true);
    expect(r.s.day).toBe("saturday");
    expect(r.last).toMatch(/It's a date!/);
    expect(r.last).not.toMatch(/Are you free/);
  });

  for (const yes of ["Sure, that works.", "Sure, that worked.", "Yes, I am free.", "Yes, I'm free.", "Yes.", "Yeah, I'm free.", "Saturday works.", "Sounds good.",
    "What... Yes", "What yes", "Um, yes", "Oh yes I'm free"]) {
    it(`“${yes}” takes Saturday at once`, () => {
      const r = play([...TO_DAY, yes], ST);
      expect(r.s.dayAgreed, r.said.join(" / ")).toBe(true);
      expect(r.s.day).toBe("saturday");
      expect(r.last).toMatch(/It's a date!/);
      expect(r.last).not.toMatch(/Sure!|Are you free/);
    });
  }

  it("after a no to Saturday, a yes to Sunday takes Sunday at once", () => {
    for (const yes of ["Yes I'm free", "Sure, that works.", "What Yes", "Yes"]) {
      const r = play([...TO_DAY, "Sorry I'm busy right", yes], ST);
      expect(r.said[3]).toMatch(/how about Sunday, then\?/);
      expect(r.s.dayAgreed, `${yes}: ${r.said.join(" / ")}`).toBe(true);
      expect(r.s.day).toBe("sunday");
      expect(r.last).toMatch(/It's a date!/);
    }
  });

  it("busy on Saturday (twist): a yes to her Sunday takes Sunday", () => {
    const r = play([...TO_DAY, "Yes, I'm free."], { ...ST, busySat: true });
    expect(r.s.dayAgreed, r.said.join(" / ")).toBe(true);
    expect(r.s.day).toBe("sunday");
  });

  it("the yes to “Can I see you again?” still only agrees to meet; the day comes next", () => {
    for (const yes of ["Sure, that works.", "Yes, I'm free.", "Yes."]) {
      const r = play([TO_DAY[0], TO_DAY[1], yes], ST);
      expect(r.s.againOk, yes).toBe(true);
      expect(r.s.dayAgreed, yes).toBeFalsy();
    }
  });

  it("“What?” alone still gets the question again", () => {
    const r = play([...TO_DAY, "What?"], ST);
    expect(r.s.dayAgreed).toBeFalsy();
    expect(r.last).toMatch(/Saturday/);
  });
});

describe("s81: a yes to “I can let him in with my key. Is that okay with you?” is taken", () => {
  it("“Sure, that works.” lets him in (not the question again)", () => {
    const sit = SITUATION_BY_ID["s81-apartment"];
    for (const yes of ["Sure, that works.", "Yes, that works.", "Yes.", "What? Yes."]) {
      const def = { ...sit, init: (c: any) => { sit.init?.(c); c.s.mode = "problem"; } };
      const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: 1, seed: 1, memory: {} });
      conv.start();
      const said = ["Hi, Mr. Patel!", "Sorry to bother you, but the kitchen faucet is leaking.", "No, I'll be at work.", yes]
        .map((t) => conv.input(t).lines.map((l: any) => l.sentence.en).join(" "));
      expect(said[2], yes).toMatch(/Is that okay with you\?/);
      expect(said[3], yes).toMatch(/let him in at ten/);
      expect(said[3], yes).not.toMatch(/Is that okay/);
    }
  });
});
