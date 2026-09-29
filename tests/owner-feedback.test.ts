// Owner feedback of 29 Sep 2026 (the café and Rosa screenshots): "I'd like a pastry" was "we don't have that",
// "Anything else?" only showed ways to say no, short answers to "What kind of tea?" were not understood, Rosa at
// the market didn't understand buying fruit, and a last question at the goodbye left the learner without help.
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";

function play(sitId: string, turns: string[], set: Record<string, any> = {}, seed = 1) {
  const sit = SITUATION_BY_ID[sitId];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, set); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed, memory: {} });
  conv.start();
  const said: string[] = [];
  for (const t of turns) said.push(conv.input(t).lines.map((l) => l.sentence.en).join(" "));
  return { conv, said, last: said.at(-1) ?? "" };
}
const CAFE = { askMilk: false, askTemp: false, askName: false, askReceipt: false };

describe("the café", () => {
  it("takes “pastries” (Mia's own word) as a wish for something to eat", () => {
    const { last } = play("s72-cafe", ["A latte, please.", "Medium.", "I would like a pastries"], CAFE);
    expect(last).not.toMatch(/don't have/);
    expect(last).toMatch(/croissants/);
  });
  it("offers what was asked about, and a yes orders it", () => {
    const { conv, said } = play("s72-cafe", ["A latte, please.", "Medium.", "Do you have croissants?", "Yes, two, please."], CAFE);
    expect(said[2]).toMatch(/Would you like a croissant\?/);
    expect(conv.s.items).toContainEqual(expect.objectContaining({ id: "croissant", qty: 2 }));
  });
  it("shows food first at “Anything else?” until something to eat is ordered", () => {
    const { conv } = play("s72-cafe", ["A latte, please.", "Medium."], CAFE);
    expect(conv.support().suggest[0].hint).toBe("more_food");
    conv.input("And a croissant, please.");
    expect(conv.support().suggest[0].hint).toBe("more");
  });
  it("understands short answers to “What kind of tea?” and “Blueberry or chocolate?”", () => {
    const tea = play("s72-cafe", ["A cup of tea, please.", "Green."], CAFE);
    expect(tea.conv.s.items[0].id).toBe("green_tea");
    expect(tea.conv.support().suggest[0].hint).not.toBe("kind_tea"); // the question is answered
    const black = play("s72-cafe", ["A cup of tea, please.", "Black, please."], CAFE);
    expect(black.conv.s.items[0].id).toBe("black_tea");
    const muffin = play("s72-cafe", ["A muffin, please.", "Chocolate."], CAFE);
    expect(muffin.conv.s.items[0].id).toBe("chocolate_muffin");
    // "What kind of coffee?" – "Black." is still a black drip coffee
    const coffee = play("s72-cafe", ["A coffee, please.", "Black."], CAFE);
    expect(coffee.conv.s.items[0]).toMatchObject({ id: "drip_coffee", noMilk: true });
  });
  it("suggests the kinds of what is being chosen", () => {
    const { conv } = play("s72-cafe", ["A cup of tea, please."], CAFE);
    expect(conv.support().suggest[0]).toMatchObject({ hint: "kind_tea" });
  });
});

describe("the goodbye stays open through a last side question", () => {
  it("café: “Where's the restroom?” after being served, then “Thanks!” ends it", () => {
    const { conv } = play("s72-cafe", ["A latte, please.", "Medium.", "That's all.", "For here.", "Card.", "Where's the restroom?"], CAFE);
    expect(conv.support().suggest.length).toBeGreaterThan(0);
    conv.input("Thanks!");
    expect(conv.ended).toBe(true);
  });
});

describe("Rosa at the market", () => {
  it("points to the stalls when the learner wants to buy fruit, and the conversation goes on", () => {
    const { conv, said } = play("s69-local", ["Hi!", "I'd like to buy some fruit."]);
    expect(said[1]).toMatch(/stalls are right behind me/);
    expect(conv.ended).toBe(false);
    expect(conv.completed).toBe(false);
    expect(said[1]).toMatch(/place to eat, or something to see\?/);
    conv.input("Something to see.");
    expect(conv.s.sightRec).toBe(true);
  });
  it("a first question that isn't about a tip no longer ends the conversation", () => {
    const { conv, last } = play("s69-local", ["Hi!", "Is it safe at night?"]);
    expect(conv.completed).toBe(false);
    expect(last).not.toMatch(/Enjoy Maple Harbor/);
  });
});
