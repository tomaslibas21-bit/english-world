// Dead ends left by the 5 Nov logic pass (EN-FIXES.md "R, left"), s69 and s73–s78: natural learner questions Maple
// Harbor didn't understand or answered wrongly, played through the dialogue engine (12 Nov 2026).
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { setKnownNames } from "../src/convo/slots";

setKnownNames(["Tomas", "Mikalauskas"]);

function play(id: string, turns: string[], set: Record<string, any> = {}, seed = 3, visits = 1) {
  const sit = SITUATION_BY_ID[id];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, set); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits, seed, memory: {} });
  const first = conv.start().lines.map((l: any) => l.sentence.en).join(" ");
  const said: string[] = [];
  for (const t of turns) said.push(conv.input(t).lines.map((l: any) => l.sentence.en).join(" "));
  const c = conv as any;
  return { conv, s: c.s, said, first, last: said.at(-1) ?? "", all: [first, ...said].join(" ") };
}

describe("s69-local", () => {
  const P = ["Hi! Can you recommend a good place to eat?", "Seafood, please"];
  it("a taxi: where the taxi stand is, and the bus", () => {
    for (const say of ["Can I take a taxi?", "Where can I get a taxi?"]) expect(play("s69-local", [...P, say]).last, say).toMatch(/taxi stand is out by the airport/);
  });
  it("her name", () => {
    expect(play("s69-local", [...P, "What's your name?"]).last).toMatch(/^I'm Rosa, dear\./);
  });
  it("what The Pier is, and what it's like", () => {
    expect(play("s69-local", [...P, "What is The Pier?"]).last).toMatch(/seafood restaurant down by the harbor/);
    expect(play("s69-local", [...P, "What's it like?"]).last).toMatch(/The Pier is the best/);
  });
});

describe("s73-restaurant", () => {
  const st = { wrongTwist: false, soupTwist: false };
  const R = ["Hi! I have a reservation for two at seven.", "It's under Tomas."];
  it("iced tea is a drink, not “one of our most popular dishes”", () => {
    expect(play("s73-restaurant", [...R, "What is iced tea?"], st).last).toMatch(/cold black tea with ice and lemon/);
    const l = play("s73-restaurant", [...R, "What is lemonade?"], st).last;
    expect(l).toMatch(/popular drinks/);
    expect(l).not.toMatch(/dishes/);
  });
  it("the tip in cash at the card reader: the card without a tip, and done", () => {
    const pay = [...R, "An iced tea, please.", "I'll have the lasagna, please.", "No, thanks.", "It's great, thanks.", "No, thanks.", "No, thanks.",
      "The check, please.", "Together, please.", "Card, please."];
    const r = play("s73-restaurant", [...pay, "Can I leave the tip in cash?"], st);
    expect(r.last).toMatch(/skip the tip on the screen/);
    expect(r.s.paid).toBe(true);
    expect(r.conv.completed).toBe(true);
    // paying cash, the tip in cash is still the thank-you for the tip
    const cash = play("s73-restaurant", [...pay.slice(0, -1), "Cash, please.", "I'll leave the tip in cash."], st);
    expect(cash.last).toMatch(/generous/);
  });
});

describe("s75-pharmacy", () => {
  it("“I already took Tylenol, but it didn't help”: another medicine", () => {
    let r = play("s75-pharmacy", ["Hi! I have a fever.", "Since yesterday.", "No.", "No.", "I already took Tylenol, but it didn't help."]);
    expect(r.last).toMatch(/something different\. I'd recommend ibuprofen/);
    r = play("s75-pharmacy", ["Hi! I have a fever.", "I took Advil this morning, but it didn't help.", "Since yesterday.", "No.", "No."]);
    expect(r.said[1]).toMatch(/something different/);
    expect(r.last).toMatch(/acetaminophen/);
  });
  it("“And for a five-year-old?” after the dosage: the children's version", () => {
    const r = play("s75-pharmacy", ["Hi! I have a headache.", "Since this morning.", "No, nothing.", "No.", "Okay, I'll take it.", "And for a five-year-old?"]);
    expect(r.last).toMatch(/children's version\. For kids, the dose depends on weight/);
  });
  it("the opening hours", () => {
    expect(play("s75-pharmacy", ["Hi! I have a headache.", "What time do you close?"]).last).toMatch(/open every day, from eight to nine/);
  });
});

describe("s76-dentist-call", () => {
  const st = { badLineAt: null, askHold: false };
  const B = ["I'd like to make an appointment. I have a toothache.", "For three days.", "Yes, it's my first time.", "Tomas Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S",
    "June 4th, 1990.", "It's 555-201-7788.", "No, I don't. I'll pay myself."];
  it("a calendar date: that day is full, her offer again; nothing booked", () => {
    const r = play("s76-dentist-call", [...B, "Do you have anything on November 12th?"], st);
    expect(r.last).toMatch(/that day is full\. So, Tuesday at 10:00\?/);
    expect(r.s.appt).toBeUndefined();
  });
  it("who is speaking", () => {
    expect(play("s76-dentist-call", ["Hi, who am I speaking with?"], st).last).toMatch(/This is Linda, the receptionist\./);
  });
});

describe("s77-salon", () => {
  const A = ["Hi! I have an appointment at three."];
  it("her name, how long it takes, the tip not included", () => {
    expect(play("s77-salon", [...A, "What's your name?"]).last).toMatch(/^I'm Jessie!/);
    expect(play("s77-salon", [...A, "It's Tomas.", "Just a trim, please.", "How long does it take?"]).last).toMatch(/About thirty minutes\./);
    expect(play("s77-salon", [...A, "It's Tomas.", "Is the tip included?"]).last).toMatch(/not included\. Most people add fifteen to twenty percent/);
  });
});

describe("s78-bank", () => {
  const O = ["Hi! I need a bank account.", "Checking.", "Here you go.", "I have a bank statement."];
  it("“Why?” at the Social Security question", () => {
    const r = play("s78-bank", [...O, "Why?"], { slowTwist: false });
    expect(r.last).toMatch(/It's for taxes\. But you can open the account without one\./);
    expect(r.s.ssn).toBeUndefined();
  });
  it("the withdrawal limit", () => {
    expect(play("s78-bank", ["Hi! How much can I withdraw?"]).last).toMatch(/up to five hundred dollars a day/);
  });
});
