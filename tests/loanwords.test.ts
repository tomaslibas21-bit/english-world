import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { buildNlu, Conversation } from "../src/convo/dialogue";
import { soundRepair } from "../src/convo/soundalike";
import { ent } from "../src/content/dsl";

const cafe = SITUATION_BY_ID["s72-cafe"];
const restaurant = SITUATION_BY_ID["s73-restaurant"];
const cafeNlu = buildNlu(cafe, GLOBAL, NPCS);
const restaurantNlu = buildNlu(restaurant, GLOBAL, NPCS);
const said = (out: ReturnType<Conversation["input"]>) => out.lines.map((l) => l.sentence.en).join(" ");

// Deliberate syllable splits and accent spellings, not arbitrary edit-distance mutations.
// The expected item is independent of how the repair dictionary stores its surfaces.
const CAFE: [string, string][] = [
  ["kapučino", "cappuccino"], ["cap a cheeno", "cappuccino"],
  ["amerikano", "americano"], ["ah meri kano", "americano"],
  ["es preso", "espresso"], ["es press oh", "espresso"],
  ["moh kah", "mocha"], ["mokah", "mocha"],
  ["kamo mile tea", "chamomile_tea"], ["kamomail tea", "chamomile_tea"],
];
const RESTAURANT: [string, string][] = [
  ["broo sketta", "bruschetta"], ["broo shetta", "bruschetta"], ["brusketa", "bruschetta"],
  ["min eh strone", "minestrone"], ["mini stroney", "minestrone"],
  ["la zanya", "lasagna"], ["lazanija", "lasagna"],
  ["pen ay", "penne"], ["ara bee ata", "penne"],
  ["ree zot oh", "risotto"], ["rizoto", "risotto"],
  ["chicken parme zan", "chicken_parm"], ["chicken parma zhan", "chicken_parm"],
  ["see zer salad", "caesar_salad"], ["cezar salad", "caesar_salad"],
  ["mar ga reeta pizza", "pizza"], ["margareeta pizza", "pizza"],
  ["tira mee sue", "tiramisu"], ["tee ramisu", "tiramisu"],
  ["pan a cotta", "panna_cotta"], ["panakota", "panna_cotta"],
  ["jeh lah toe", "gelato"], ["jelato", "gelato"],
  ["kee an tee", "red_wine"], ["mer low", "red_wine"], ["pino nwar", "red_wine"],
  ["pino grigio", "white_wine"], ["shar doh nay", "white_wine"], ["sovinyon blonk", "white_wine"],
  ["perry ay", "sparkling_water"],
];

describe("borrowed menu words", () => {
  for (const [sit, nlu, cases] of [[cafe, cafeNlu, CAFE], [restaurant, restaurantNlu, RESTAURANT]] as const) {
    for (const [heard, entity] of cases) {
      it(`${sit.id}: suggests only ${entity} for "${heard}"`, () => {
        const fix = soundRepair(nlu, sit.entities, ["order"], `Two ${heard}, please`);
        expect(fix?.entity).toBe(entity);
        expect(fix?.fixed).toMatch(/^Two /);
        expect(fix?.fixed).toMatch(/,? please$/);
      });
    }
  }

  it("leaves quantities, sizes, milk and other requested items intact", () => {
    for (const text of ["Two large moh kah with oat milk please", "A moh kah and a muffin please"]) {
      const fix = soundRepair(cafeNlu, cafe.entities, ["order"], text);
      expect(fix?.fixed).toBe(text.replace("moh kah", "mocha"));
    }
    // This grammar doesn't offer numeric quantities here. Never make a failed parse succeed
    // by swallowing its digit into the repaired name.
    expect(soundRepair(cafeNlu, cafe.entities, ["order"], "2 large moh kah with oat milk please")).toBeNull();
  });

  it("never repairs refusals, exclusions, allergies or an unrelated extra clause", () => {
    for (const [sit, nlu, word] of [[cafe, cafeNlu, "moh kah"], [restaurant, restaurantNlu, "pan a cotta"]] as const) {
      for (const text of [`No ${word}`, `I don't want ${word}`, `Anything except ${word}`, `Without ${word}`, `I'm allergic to ${word}`, `${word} and a spaceship`, `We can discuss ${word} tomorrow`]) {
        expect(soundRepair(nlu, sit.entities, ["order"], text), text).toBeNull();
      }
    }
  });

  it("does not turn other dishes, normal English phrases or known choices into these items", () => {
    for (const text of ["A latte", "An espresso", "A cappuccino", "A large coffee", "Oat milk", "A muffin", "A macchiato", "A matcha", "A cortado", "A mocha and a macchiato", "My car", "A mock exam"]) {
      expect(soundRepair(cafeNlu, cafe.entities, ["order"], text), text).toBeNull();
    }
    for (const text of ["The steak", "Garlic bread", "Chocolate cake", "A glass of white wine", "A glass of red wine", "A martini", "A mojito", "Miso soup", "Pesto pasta", "Carbonara", "A ghetto", "A pension", "A minister", "A panorama", "She sells salad"]) {
      expect(soundRepair(restaurantNlu, restaurant.entities, ["order"], text), text).toBeNull();
    }
  });

  it("only suggests words available in this situation and in the expected intent", () => {
    for (const text of ["A broo sketta please", "A pan a cotta please", "A mer low please"]) {
      expect(soundRepair(cafeNlu, cafe.entities, ["order"], text), text).toBeNull();
    }
    expect(soundRepair(restaurantNlu, restaurant.entities, ["pay"], "A broo sketta please")).toBeNull();
  });

  it("does not pick an arbitrary item when two names are equally plausible", () => {
    const entities = { ...cafe.entities, drink: [ent("first", "mocha", "moka", "f"), ent("second", "mocha", "moka", "f")] };
    const sit = { ...cafe, entities };
    expect(soundRepair(buildNlu(sit, GLOBAL), entities, ["order"], "A moh kah please")).toBeNull();
    const differentSurfaces = { ...cafe.entities, drink: [ent("first", "latte", "latė", "f"), ent("second", "late", "latė", "f")] };
    const otherSit = { ...cafe, entities: differentSurfaces };
    expect(soundRepair(buildNlu(otherSit, GLOBAL), differentSurfaces, ["order"], "A latay please")).toBeNull();
  });
});

function atRestaurant() {
  const def = { ...restaurant, init: (c: any) => { restaurant.init?.(c); Object.assign(c.s, { wrongTwist: false, soupTwist: false }); } };
  const c = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed: 3, memory: {} });
  c.start();
  for (const text of ["Hi! I have a reservation for two at seven.", "It's under Tomas.", "A lemonade please", "Thank you"]) c.input(text);
  return c;
}

describe("confirmation before changing a restaurant order", () => {
  for (const [heard, entity] of RESTAURANT) {
    it(`the conversation orders only ${entity} for "${heard}", after confirmation when uncertain`, () => {
      const c = atRestaurant();
      const before = structuredClone(c.s.items);
      const out = c.input(`A ${heard} please`);
      if (out.checking) {
        expect(c.s.items).toEqual(before);
        c.input("Yes");
      }
      expect(c.s.items.slice(before.length).map((i: any) => i.id)).toEqual([entity]);
    });
  }

  it("waits for yes, preserves two portions, and then adds only the intended starter", () => {
    const c = atRestaurant();
    const before = structuredClone(c.s.items);
    const out = c.input("Two broo sketta please");
    expect(out.checking).toBe(true);
    expect(said(out)).toMatch(/bruschetta\?/i);
    expect(c.s.items).toEqual(before);
    c.input("Yes");
    expect(c.s.items.filter((i: any) => i.cat === "starter")).toEqual([expect.objectContaining({ id: "bruschetta", qty: 2 })]);
  });

  it("a no discards the guess, and an alternative orders the named dish", () => {
    const c = atRestaurant();
    c.input("Two broo sketta please");
    c.input("No");
    expect(c.s.items.some((i: any) => i.id === "bruschetta")).toBe(false);
    c.input("Garlic bread please");
    expect(c.s.items.filter((i: any) => i.cat === "starter").map((i: any) => i.id)).toEqual(["garlic_bread"]);
  });

  it("a replacement answer cancels a pending guess", () => {
    const c = atRestaurant();
    c.input("Two broo sketta please");
    c.input("No, a Caesar salad please");
    expect(c.s.items.filter((i: any) => i.cat === "starter").map((i: any) => i.id)).toEqual(["caesar_salad"]);
  });
});

describe("the café's additional pronunciation variants", () => {
  for (const [heard, entity] of CAFE) {
    it(`orders only ${entity} for "${heard}", after confirmation when uncertain`, () => {
      const def = { ...cafe, init: (ctx: any) => { cafe.init?.(ctx); Object.assign(ctx.s, { askMilk: false, askTemp: false, askName: false, askReceipt: false }); } };
      const c = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed: 1, memory: {} });
      c.start();
      const out = c.input(`Two ${heard} please`);
      if (out.checking) {
        expect(c.s.items ?? []).toHaveLength(0);
        c.input("Yes");
      }
      expect(c.s.items).toEqual([expect.objectContaining({ id: entity, qty: 2 })]);
    });
  }
});
