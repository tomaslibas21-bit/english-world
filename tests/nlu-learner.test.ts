// The engine's learner tolerance: dropped and extra function words, word forms, names used as
// address, more yes/no forms, and the approximate fallback — and the limits that keep meaning safe.
import { describe, it, expect } from "vitest";
import { Nlu } from "../src/convo/nlu";
import { tokenSimilarity } from "../src/convo/normalize";

function mkNlu() {
  const n = new Nlu();
  n.g.defineSlots({
    drink: { lexicon: [
      { id: "latte", forms: ["latte", "lattes"] },
      { id: "cappuccino", forms: ["cappuccino", "cappuccinos"] },
    ] },
    size: { lexicon: [{ id: "small", forms: ["small"] }, { id: "large", forms: ["large", "big"] }] },
    city: { lexicon: [{ id: "boston", forms: ["boston"] }, { id: "vilnius", forms: ["vilnius"] }] },
    item: { pattern: "[a | an | one] [{size}] {drink}" },
  });
  n.g.defineMacro("order_prefix", "(i would like | can i (get | have) | i will have | i want)");
  n.addIntent("order", ["@order_prefix {item}", "{item}"]);
  n.addIntent("reject", ["i (do not | will not) want {item}", "not {item}"]);
  n.addIntent("pay_card", ["[can i] pay (with | by) card", "card"]);
  n.addIntent("pay_cash", ["[can i] pay (in | with) cash", "cash"]);
  n.addIntent("dest", ["i am going to {city}", "a ticket to {city}"]);
  n.addIntent("live_in", ["i live in {city}"]);
  n.addIntent("where_live", ["where do you live"]);
  n.addIntent("agree", ["i agree", "you are right"]);
  n.addIntent("lost", ["i lost my (wallet | phone)"]);
  n.addIntent("dest_unknown", ["(to | i am going to) {w:any}"], { catchAll: true });
  n.addIntent("radio_up", ["turn it up", "louder"]);
  n.addIntent("not_me", ["[no] i am not [waiting]", "i do not [have an account]"]);
  n.addIntent("open_account", ["i want to open an account"]);
  n.addIntent("pardon", ["(what | sorry | pardon)"]);
  n.addIntent("intro", ["i am {name}"]);
  n.g.defineSlots({ name: { fn: (toks, pos) => (pos < toks.length ? [{ end: Math.min(toks.length, pos + 2), value: toks.slice(pos, pos + 2).join(" "), cost: 1 }] : []) } });
  n.g.defineSlots({ any: { fn: (toks, pos) => (pos < toks.length ? [{ end: Math.min(toks.length, pos + 3), value: toks.slice(pos, pos + 3).join(" "), cost: 3 }] : []) } });
  n.setVocatives(["Mia", "Officer Diaz"]);
  return n;
}
const n = mkNlu();
const intentOf = (s: string, exp: string[] = []) => {
  const r = n.parse(s, exp);
  return r.ok ? r.best!.segments.map((x) => x.intent).join("+") || "yn:" + r.best!.yn : "none";
};

describe("learner English", () => {
  it("accepts missing articles, 'to', 'do' and subjects", () => {
    expect(intentOf("I would like latte")).toBe("order");
    expect(intentOf("where you live")).toBe("where_live");
    expect(intentOf("going to Boston", ["dest"])).toBe("dest");
  });
  it("accepts one extra small word", () => {
    expect(intentOf("I am agree")).toBe("agree");
    expect(intentOf("can I have the a latte")).toBe("order");
  });
  it("maps word forms and swapped small words", () => {
    expect(intentOf("I lose my wallet")).toBe("lost");
    expect(intentOf("can I pay by cash")).toBe("pay_cash");
    expect(intentOf("may I pay with card")).toBe("pay_card");
    expect(tokenSimilarity("card", "car")).toBe(0);
    expect(tokenSimilarity("from", "to")).toBe(0);
  });
  it("accepts the NPC's name or a title around the answer", () => {
    expect(intentOf("Hi Mia, can I get a latte?")).toBe("order");
    expect(intentOf("Card please, Mia")).toBe("pay_card");
    expect(intentOf("Officer Diaz, I lost my wallet")).toBe("lost");
    expect(intentOf("I lost my phone, sir")).toBe("lost");
  });
  it("understands more yes/no forms", () => {
    expect(intentOf("I think so")).toBe("yn:yes");
    expect(intentOf("that works for me")).toBe("yn:yes");
    expect(intentOf("I don't think so")).toBe("yn:no");
  });
});

describe("meaning stays safe", () => {
  it("never drops a negation", () => {
    expect(intentOf("I don't want a latte")).toBe("reject");
    expect(intentOf("not by card", ["pay_card", "pay_cash"])).not.toBe("pay_card");
  });
  it("a preposition or 'to' alone is never optional, so a bare slot doesn't match", () => {
    expect(intentOf("Boston")).toBe("none");
    expect(intentOf("Vilnius")).toBe("none");
  });
  it("catch-alls keep their leading word", () => {
    expect(intentOf("purple elephant banana")).toBe("none");
  });
});

describe("negations and questions keep their meaning", () => {
  it("a negation is never cut off from what follows", () => {
    expect(intentOf("please don't turn it up")).not.toContain("radio_up");
    expect(intentOf("I don't want to open an account")).not.toContain("open_account");
    expect(intentOf("no I am not, I want to open an account")).toContain("open_account");
  });
  it("a question isn't split into 'what?' plus an answer", () => {
    expect(intentOf("what is a latte", ["order"])).not.toContain("order");
  });
  it("no extra word is skipped before a name, and a name needs two kept words", () => {
    expect(intentOf("I am a little late")).not.toBe("intro");
    expect(intentOf("I said Lithuania")).not.toBe("intro");
  });
});

describe("answers people really give", () => {
  it("an answer may end with its own acceptance", () => {
    expect(intentOf("card is fine", ["pay_card", "pay_cash"])).toBe("pay_card");
    expect(intentOf("card is not fine", ["pay_card", "pay_cash"])).not.toBe("pay_card");
  });
  it("spoken 'no cash' is absence, not 'No. Cash.'", () => {
    expect(intentOf("no cash", ["pay_card", "pay_cash"])).not.toContain("pay_cash");
    expect(intentOf("No, cash.", ["pay_card", "pay_cash"])).toContain("pay_cash");
  });
  it("tries learner question order", () => {
    n.addIntent("where_pay", ["where can i pay"]);
    expect(intentOf("where I can pay")).toBe("where_pay");
  });
  it("a negative piece is never followed by a bare object", () => {
    expect(intentOf("I don't lost my wallet my phone")).not.toContain("lost");
  });
});

describe("approximate fallback", () => {
  it("accepts an expected answer with one or two unknown words", () => {
    const r = n.parse("can I get a latte with caramel", ["order"]);
    expect(r.ok && r.best!.segments[0].intent).toBe("order");
    expect(r.best!.flags.has("approx")).toBe(true);
  });
  it("only for answers the current question expects", () => {
    expect(n.parse("can I get a latte with caramel", []).ok).toBe(false);
  });
  it("doesn't trim much or meaningful words", () => {
    expect(n.parse("can I get a latte from the machine over there", ["order"]).ok).toBe(false);
  });
  it("never drops numbers or negations", () => {
    expect(n.parse("I don't lost my wallet at all", ["lost"]).best?.segments[0]?.intent).not.toBe("lost");
    expect(n.parse("no cash sorry only card", ["pay_cash", "pay_card"]).best?.segments.map((x) => x.intent) ?? []).not.toContain("pay_cash");
  });
  it("only trims words at the edges", () => {
    expect(n.parse("how do I open it", ["lost"]).ok).toBe(false);
  });
});
