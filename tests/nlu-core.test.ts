import { describe, it, expect } from "vitest";
import { Nlu } from "../src/convo/nlu";
import { readInt, priceSlot, timeSlot, lettersSlot } from "../src/convo/slots";
import { tokenizeInput } from "../src/convo/normalize";

function mkNlu() {
  const n = new Nlu();
  n.g.defineSlots({
    drink: { lexicon: [
      { id: "latte", forms: ["latte", "lattes", "cafe latte"] },
      { id: "cappuccino", forms: ["cappuccino", "cappuccinos"] },
      { id: "flat_white", forms: ["flat white"] },
      { id: "coffee", forms: ["coffee"] },
    ] },
    size: { lexicon: [{ id: "small", forms: ["small"] }, { id: "medium", forms: ["medium", "regular"] }, { id: "large", forms: ["large", "big"] }] },
    milk: { lexicon: [{ id: "oat", forms: ["oat", "oat milk"] }, { id: "whole", forms: ["whole", "whole milk", "regular milk"] }] },
    item: { pattern: "[a | an | one] [{size}] {drink} [with {milk} [milk]] [(to go #togo | for here #here)]" },
  });
  n.g.defineMacro("order_prefix", "(i will have #h:ill_have | i would like #h:id_like | can i (get | have) #h:can_i | could i (get | have) #h:could_i | i want #blunt #h:i_want)");
  n.addIntent("order", ["@order_prefix {item} [and {item}]", "{item} [and {item}]"]);
  n.addIntent("reject", ["i (do not | will not) want {item}", "not {item}"]);
  n.addIntent("dine", ["(to go #togo | for here #here)"]);
  n.addIntent("howareyou_answer", ["(good | fine | great | not bad) [thanks | thank you] [and you | how about you | how are you]"]);
  return n;
}

describe("numbers & slots", () => {
  it("reads integers", () => {
    expect(readInt(["twenty", "five"], 0).map((r) => r.value)).toEqual([20, 25]);
    expect(readInt(["two", "hundred", "and", "fifty"], 0).at(-1)?.value).toBe(250);
    expect(readInt(["four", "fifty"], 0).map((r) => r.value)).toEqual([4]);
  });
  it("reads prices", () => {
    const vals = (s: string) => priceSlot(tokenizeInput(s).variants[0], 0, false).filter((r) => r.end === tokenizeInput(s).variants[0].length).map((r) => r.value);
    expect(vals("four fifty")).toContain(450);
    expect(vals("$4.50")).toContain(450);
    expect(vals("twelve dollars")).toContain(1200);
    expect(vals("four dollars and fifty cents")).toContain(450);
  });
  it("reads times", () => {
    const vals = (s: string) => timeSlot(tokenizeInput(s).variants[0], 0, false).filter((r) => r.end === tokenizeInput(s).variants[0].length).map((r) => r.value);
    expect(vals("half past seven")).toContainEqual({ h: 7, m: 30 });
    expect(vals("quarter to eight")).toContainEqual({ h: 7, m: 45 });
    expect(vals("seven thirty")).toContainEqual({ h: 7, m: 30 });
    expect(vals("10:30")).toContainEqual({ h: 10, m: 30 });
  });
  it("reads letters", () => {
    const t = tokenizeInput("M I K A L A U S K A S").variants[0];
    expect(lettersSlot(t, 0, false).at(-1)?.value).toBe("mikalauskas");
  });
});

describe("nlu", () => {
  const n = mkNlu();
  it("parses orders with slots and hint tags", () => {
    const r = n.parse("Hi, can I get a large latte with oat milk to go, please?");
    expect(r.ok).toBe(true);
    const seg = r.best!.segments[0];
    expect(seg.intent).toBe("order");
    expect(seg.slots.item.drink).toBe("latte");
    expect(seg.slots.item.size).toBe("large");
    expect(seg.slots.item.milk).toBe("oat");
    expect(seg.slots.item.__tags).toContain("togo");
    expect(seg.tags).toContain("h:can_i");
    expect(r.best!.flags.has("greet")).toBe(true);
    expect(r.best!.flags.has("please")).toBe(true);
  });
  it("never turns a negative into an order", () => {
    const r = n.parse("I don't want a cappuccino");
    expect(r.best?.segments[0].intent).toBe("reject");
    const r2 = n.parse("I don't cappuccino");
    expect(r2.ok).toBe(false);
  });
  it("accepts short answers and bare NPs", () => {
    expect(n.parse("To go, please").best?.segments[0].intent).toBe("dine");
    expect(n.parse("A flat white").best?.segments[0].slots.item.drink).toBe("flat_white");
    expect(n.parse("I want a latte").best?.segments[0].tags).toContain("blunt");
  });
  it("handles multiple intents", () => {
    const r = n.parse("Good thanks, and you? Can I get a cappuccino?");
    expect(r.best?.segments.map((s) => s.intent)).toEqual(["howareyou_answer", "order"]);
  });
  it("rejects unrelated keywords", () => {
    expect(n.parse("latte is my favorite thing in the world").ok).toBe(false);
  });
  it("probes prefixes", () => {
    expect(n.probe("can I get a")).toBe("prefix");
    expect(n.probe("can I get a latte")).toBe("complete");
    expect(n.probe("banana phone")).toBe("none");
  });
  it("tolerates recogniser slips", () => {
    expect(n.parse("could I have a capuccino").best?.segments[0].slots.item.drink).toBe("cappuccino");
  });
});
