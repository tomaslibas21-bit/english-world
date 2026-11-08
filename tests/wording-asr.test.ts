import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compose, npUnits } from "../src/convo/compose";
import { surfaceTokens, tokenizeInput } from "../src/convo/normalize";
import { priceSlot } from "../src/convo/slots";
import { buildNlu, Conversation } from "../src/convo/dialogue";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { SITUATIONS, SITUATION_BY_ID } from "../src/content/situations";
import { DRINKS } from "../src/content/situations/s72-cafe";
import { audioKey } from "../src/audio-key";

const cafe = SITUATION_BY_ID["s72-cafe"];
const salon = buildNlu(SITUATION_BY_ID["s77-salon"], GLOBAL, NPCS);
const player = { name: "Tomas", surname: "Libas", gender: "m" as const };
const spoken = (out: ReturnType<Conversation["start"]>) =>
  out.lines.map((l) => l.sentence.say).join(" ");
const intents = (text: string) =>
  salon.parse(text, ["trim", "add_tip"]).best?.segments.map((s) => s.intent) ??
  [];

function returning(qty: number) {
  const c = new Conversation(cafe, {
    global: GLOBAL,
    npcs: NPCS,
    player,
    visits: 3,
    seed: 2,
    memory: {
      lastDrink: {
        cat: "drink",
        id: "latte",
        qty,
        size: "large",
        milk: "whole",
        temp: "hot",
      },
    },
  });
  return c;
}

describe("plural noun phrase wording", () => {
  it("never gives any plural entity a singular a/an article", () => {
    for (const sit of SITUATIONS) {
      const entities = Object.values(sit.entities ?? {}).flat();
      const look = (id: string) => entities.find((e) => e.id === id);
      for (const e of entities.filter((e) => e.pl)) {
        const np = npUnits({ id: e.id, qty: 2 }, "np", "acc", look);
        expect(np.en[0], `${sit.id}/${e.id}: ${np.en.join(" ")}`).not.toMatch(
          /^(a|an)$/i,
        );
        expect(np.en.length).toBe(np.lt.length);
      }
    }
  });
  it("retains a/an and the corrected singular latte recordings", () => {
    const entities = Object.values(cafe.entities ?? {}).flat();
    const look = (id: string) => entities.find((e) => e.id === id);
    expect(npUnits({ id: "latte" }, "np", "acc", look).en.join(" ")).toBe(
      "a latte",
    );
    expect(npUnits({ id: "americano" }, "np", "acc", look).en.join(" ")).toBe(
      "an americano",
    );
    expect(
      npUnits(
        { id: "latte", qty: 2, mods: ["large"] },
        "np",
        "acc",
        look,
      ).en.join(" "),
    ).toBe("some large lattes");
    expect(
      compose(
        cafe.lines.usual[0],
        { X: { id: "latte", qty: 1, mods: ["large"] } },
        { look },
      ).say,
    ).toBe("Hey, welcome back! The usual? A large latte?");
  });
  it("never doubles the article of a place named The Pier", () => {
    for (const sid of ["s62-visitor-center", "s69-local"]) {
      const sit = SITUATION_BY_ID[sid];
      const entities = Object.values(sit.entities ?? {}).flat();
      const look = (id: string) => entities.find((e) => e.id === id);
      expect(npUnits({ id: "pier" }, "the", "acc", look).en.join(" ")).toBe(
        "The Pier",
      );
      for (const variants of Object.values(sit.lines))
        for (const src of variants) {
          if (!src.en.includes("{X.the}")) continue;
          const s = compose(src, { X: "pier" }, { look });
          expect(s.say).not.toMatch(/\bthe the\b/i);
          expect(s.units.length).toBeGreaterThan(0);
        }
    }
  });
  it.each([1, 2, 3])(
    "the usual offer and accepted quantity agree after a previous order of %i",
    (qty) => {
      const c = returning(qty);
      expect(spoken(c.start())).toBe(
        "Hey, welcome back! The usual? A large latte?",
      );
      expect(c.pending?.id).toBe("usual");
      expect(spoken(c.input("Could you repeat that, please?"))).toContain(
        "A large latte?",
      );
      c.input("Yes, please.");
      expect(c.s.items[0]).toMatchObject({
        id: "latte",
        qty: 1,
        size: "large",
      });
    },
  );
  it("a price for one drink uses singular wording after a multi-drink order", () => {
    const c = returning(2);
    c.start();
    c.input("Yes, please.");
    c.s.items[0].qty = 2;
    const out = c.input("How much is a small one?");
    expect(spoken(out)).toContain("A small latte is");
    expect(spoken(out)).not.toContain("lattes is");
    expect(c.s.items[0].qty).toBe(2);
  });
  it("reuses an existing recording for every usual drink, size and temperature after any saved quantity", () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL("../public/audio-v2/manifest.json", import.meta.url),
        "utf8",
      ),
    );
    const sharedNlu = new Map();
    for (const d of DRINKS.filter((d) => !d.attrs?.generic))
      for (const size of d.attrs?.sized
        ? [undefined, "small", "medium", "large"]
        : [undefined])
        for (const temp of d.attrs?.iced ? ["hot", "iced"] : ["hot"])
          for (const qty of [1, 2, 3]) {
            const c = new Conversation(cafe, {
              global: GLOBAL,
              npcs: NPCS,
              player,
              visits: 3,
              seed: 2,
              sharedNlu,
              memory: {
                lastDrink: { cat: "drink", id: d.id, qty, size, temp },
              },
            });
            const text = spoken(c.start());
            expect(manifest[audioKey("g_mia", 1, text)], text).toBeGreaterThan(
              0,
            );
          }
  });
});

describe("ASR symbols preserve their spoken meaning", () => {
  it.each([
    "20%",
    "20 %",
    "20％",
    "twenty percent",
    "20 per cent",
    "I'll add 20%",
    "The 20% option",
  ])("accepts the salon tip %s", (text) => {
    const r = salon.parse(text, ["add_tip", "no_tip"]);
    expect(r.ok, text).toBe(true);
    const seg = r.best?.segments.find((s) => s.intent === "add_tip");
    expect(seg?.slots.p).toBe(20);
  });
  it("keeps different percentages and negation distinct", () => {
    expect(salon.parse("15%", ["add_tip"]).best?.segments[0].slots.p).toBe(15);
    expect(intents("I don't want to add 20%")).not.toContain("add_tip");
    expect(intents("No 20% tip")).not.toContain("add_tip");
    expect(intents("20 dollars")).not.toContain("add_tip");
    expect(intents("20%")).not.toContain("trim");
  });
  it("keeps degree units, cents and ampersands instead of dropping them", () => {
    expect(surfaceTokens("38°C")).toEqual(surfaceTokens("38 degrees celsius"));
    expect(surfaceTokens("101.5°F")).toEqual(
      surfaceTokens("101.5 degrees fahrenheit"),
    );
    expect(surfaceTokens("20°")).toEqual(surfaceTokens("20 degrees"));
    expect(surfaceTokens("50¢")).toEqual(surfaceTokens("50 cents"));
    expect(surfaceTokens("trim & wash")).toEqual(
      surfaceTokens("trim and wash"),
    );
    const t = tokenizeInput("50¢").variants[0];
    expect(priceSlot(t, 0, false).find((r) => r.end === t.length)?.value).toBe(
      50,
    );
  });
  it("accepts symbolic fixed payments without accepting a different amount", () => {
    const visitor = buildNlu(
      SITUATION_BY_ID["s62-visitor-center"],
      GLOBAL,
      NPCS,
    );
    const checkin = buildNlu(SITUATION_BY_ID["s64a-checkin"], GLOBAL, NPCS);
    const has = (n: typeof visitor, text: string, intent: string) =>
      n.parse(text, [intent]).best?.segments.some((s) => s.intent === intent) ??
      false;
    expect(has(visitor, "Here's $5", "here_you_go")).toBe(true);
    expect(has(visitor, "Here's $50", "here_you_go")).toBe(false);
    expect(has(checkin, "Okay, I'll pay the $100", "pay_fee")).toBe(true);
    expect(has(checkin, "I'll pay $10", "pay_fee")).toBe(false);
    expect(has(checkin, "I won't pay the $100", "pay_fee")).toBe(false);
  });
  it.each(["½ inch", "1/2 inch", "1/2 an inch"])(
    "reads a half-inch symbol without changing the requested length: %s",
    (text) => {
      const r = salon.parse(text, ["length"]);
      expect(
        r.best?.segments.find((s) => s.intent === "length")?.tags,
      ).toContain("in05");
    },
  );
  it("does not reinterpret dates as fractions", () => {
    expect(surfaceTokens("January 1/2")).not.toContain("half");
  });
  it("retains a mixed half-inch length", () => {
    const r = salon.parse("1½ inches", ["length"]);
    expect(r.best?.segments.find((s) => s.intent === "length")?.tags).toContain(
      "in15",
    );
  });
});

describe("Lithuanian ASR trim/dream confusion stays in the salon", () => {
  it.each([
    "dream",
    "Just a dream, please",
    "I would like a dream",
    "Can I get a dream?",
    "Just a little dream, please",
    "Dream the ends",
  ])("accepts %s as the trim request", (text) => {
    expect(intents(text)).toContain("trim");
  });
  it.each(["I don't want a dream", "Not a dream", "I had a dream last night"])(
    "does not turn %s into a haircut",
    (text) => {
      expect(intents(text)).not.toContain("trim");
    },
  );
  it("does not globally replace a genuine dream in another conversation", () => {
    const car = buildNlu(SITUATION_BY_ID["p25-used-car"], GLOBAL, NPCS);
    expect(
      car
        .parse("It drives like a dream")
        .best?.segments.some((s) => s.intent === "trim"),
    ).not.toBe(true);
    expect(surfaceTokens("dream")).toEqual(["dream"]);
  });
});
