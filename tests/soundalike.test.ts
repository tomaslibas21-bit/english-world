// Names heard only by their sound (src/convo/soundalike.ts): the café's latte, as a Lithuanian learner's "latė"
// reaches the recogniser, and cappuccino. The person checks back ("Sorry, a latte?"); a yes orders it.
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { soundKey } from "../src/convo/soundalike";

function cafe() {
  const sit = SITUATION_BY_ID["s72-cafe"];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, { askMilk: false, askTemp: false, askName: false, askReceipt: false }); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed: 1, memory: {} });
  conv.start();
  return conv;
}
const said = (out: { lines: { sentence: { en: string } }[] }) => out.lines.map((l) => l.sentence.en).join(" ");

describe("sound keys", () => {
  it("fold a learner's latte and cappuccino together", () => {
    for (const w of ["latte", "lotta", "lata", "lada", "lady", "latay", "lahtay"]) expect(soundKey(w)).toBe("lt");
    for (const w of ["cappuccino", "capachino", "kappachino", "cupachino"]) expect(soundKey(w)).toBe(soundKey("cappuccino"));
    expect(soundKey("croissant")).toBe(soundKey("crescent"));
  });
});

describe("the café checks a name heard by its sound", () => {
  const LATTE = ["A lot a, please.", "A lot of, please.", "Lata please", "Lada please", "Lady please", "La tay please", "Lah tay please",
    "Lattay please", "Letter please", "Later please", "I'd like a lot of", "I'd like a lady", "I'd like a later", "Can I get a lot a", "Can I get a la te", "One lata",
    "A lah teh please"];
  for (const heard of LATTE) {
    it(`"${heard}" → "Sorry, a latte?" → yes orders a latte`, () => {
      const conv = cafe();
      const check = conv.input(heard);
      expect(check.understood).toBe(true);
      expect(said(check)).toMatch(/latte\?/i);
      expect(conv.s.items ?? []).toHaveLength(0);
      const yes = conv.input("Yes.");
      expect(conv.s.items.map((x: any) => x.id)).toEqual(["latte"]);
      expect(said(yes)).not.toMatch(/don't have/);
    });
  }
  for (const heard of ["Latteh please", "A latė please"]) {
    it(`already understands the close spelling "${heard}"`, () => {
      const conv = cafe();
      expect(conv.input(heard).understood).toBe(true);
      expect(conv.s.items.map((x: any) => x.id)).toEqual(["latte"]);
    });
  }
  for (const heard of ["a cap a chino please", "a kappa chino please", "a cup of chino please"]) {
    it(`"${heard}" checks a cappuccino`, () => {
      const conv = cafe();
      expect(said(conv.input(heard))).toMatch(/cappuccino\?/i);
      conv.input("Yeah.");
      expect(conv.s.items.map((x: any) => x.id)).toEqual(["cappuccino"]);
    });
  }
  for (const heard of ["A crescent please", "A cross on please", "A cross ant please", "A cross aunt please", "A cross and please", "A kwa son please", "A kwason please", "A quasson please", "A kruasanas please", "A cruasan please"]) {
    it(`"${heard}" checks a croissant, keeps the order empty until yes`, () => {
      const conv = cafe();
      expect(said(conv.input(heard))).toMatch(/croissant\?/i);
      expect(conv.s.items ?? []).toHaveLength(0);
      conv.input("Yes.");
      expect(conv.s.items.map((x: any) => x.id)).toEqual(["croissant"]);
    });
  }
  it("keeps the quantity and refuses to repair negated or unrelated answers", () => {
    const conv = cafe();
    expect(said(conv.input("Two cross on please"))).toMatch(/croissant\?/i);
    conv.input("Yes");
    expect(conv.s.items[0]).toMatchObject({ id: "croissant", qty: 2 });
    for (const text of ["I don't want a cross on", "No latteh", "We can cross on Monday", "A cross and a road"]) {
      const c = cafe();
      const out = c.input(text);
      expect(out.checking, text).not.toBe(true);
      expect(c.s.items ?? [], text).toHaveLength(0);
    }
  });
  it("a no asks again, and the next answer is taken as usual", () => {
    const conv = cafe();
    conv.input("Lata please");
    const no = conv.input("No.");
    expect(said(no)).toMatch(/again|What was it/);
    conv.input("An americano, please.");
    expect(conv.s.items.map((x: any) => x.id)).toEqual(["americano"]);
  });
  it("asks with the bare name, never a wrong article", () => {
    const conv = cafe();
    expect(said(conv.input("Lata please"))).not.toMatch(/\b(a|an) latte\?/i);
  });
  it("keeps the check open through \"Sorry?\" and \"Slower, please\"", () => {
    for (const between of ["Sorry?", "Could you say that again?", "Slower, please."]) {
      const conv = cafe();
      conv.input("Lata please");
      expect(said(conv.input(between))).toMatch(/latte\?/i);
      conv.input("Yes.");
      expect(conv.s.items.map((x: any) => x.id)).toEqual(["latte"]);
    }
  });
  it("takes „taip“ as yes, and \"No, a cappuccino\" as the new answer", () => {
    const c1 = cafe();
    c1.input("Lata please");
    c1.input("taip");
    expect(c1.s.items.map((x: any) => x.id)).toEqual(["latte"]);
    const c2 = cafe();
    c2.input("Lata please");
    c2.input("No, a cappuccino.");
    expect(c2.s.items.map((x: any) => x.id)).toEqual(["cappuccino"]);
  });
  it("a new answer instead of yes or no is simply taken", () => {
    const conv = cafe();
    conv.input("Lata please");
    conv.input("A cappuccino, please.");
    expect(conv.s.items.map((x: any) => x.id)).toEqual(["cappuccino"]);
  });
  it("leaves understood answers, unknown things and negations alone", () => {
    const conv = cafe();
    expect(said(conv.input("A latte, please."))).not.toMatch(/Sorry, (a|did)/);
    const c2 = cafe();
    expect(said(c2.input("I'd like a pizza"))).toMatch(/don't have/);
    const c3 = cafe();
    expect(said(c3.input("I don't want a lot of"))).not.toMatch(/latte\?/i);
    const c4 = cafe();
    expect(said(c4.input("banana telephone"))).not.toMatch(/\?$/);
  });
});
