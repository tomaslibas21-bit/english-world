// Dead ends the English logic pass left (EN-FIXES.md, "R, left", 12 Nov 2026), s79–s82: natural learner questions
// Maple Harbor didn't understand. Each is played through the dialogue engine and must get its answer.
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

describe("s79-post", () => {
  const st = { askGift: true, askInsurance: true, offerStamps: false, returnTwist: false, pickupTwist: false };
  const SEND = ["Hi! I'd like to send this package to Lithuania.", "No, just a scarf, chocolate and tea."];
  const TO_GIFT = [...SEND, "Priority, please.", "About fifty dollars."];
  it("“With insurance, please.” at “Is it a gift?” adds the insurance, and the gift is asked again", () => {
    const r = play("s79-post", [...TO_GIFT, "With insurance, please."], st);
    expect(r.last).toBe("Okay, that's $4.35 more. Is it a gift?");
    expect(r.s.insurance).toBe(true);
    expect(r.s.gift).toBeUndefined();
  });
  it("the price of extra insurance is said, nothing added; “Can I insure it?” before the offer adds nothing", () => {
    const r = play("s79-post", [...TO_GIFT, "Yes, it's a gift for my mom.", "Sure.", "How much would it be with insurance?"], st);
    expect(r.last).toMatch(/^Extra insurance is \$4\.35\./);
    expect(r.s.insurance).toBeUndefined();
    const q = play("s79-post", [...SEND, "Can I insure it?"], st);
    expect(q.last).toMatch(/^It's already insured up to \$200\. Extra insurance is \$4\.35\./);
    expect(q.s.insurance).toBeUndefined();
  });
  it("the mailbox, and “What if I send it express?” (Express's days and price, nothing chosen)", () => {
    expect(play("s79-post", [...SEND, "Where's the mailbox?"], st).last).toMatch(/^There's a blue mailbox right outside, next to the door\./);
    const r = play("s79-post", [...SEND, "What if I send it express?"], st);
    expect(r.last).toMatch(/^Express takes 3–5 business days and costs \$/);
    expect(r.s.service).toBeUndefined();
  });
});

describe("s80-support-call", () => {
  const B = ["Technical support.", "Hi, my name is Tomas Mikalauskas.", "My account number is 742-9133.", "My internet stopped working yesterday.",
    "The light is blinking red.", "Yes, I tried that three times."];
  it("“Do I have to be home?” is answered and the visit isn't booked", () => {
    const r = play("s80-support-call", [...B, "Do I have to be home?"]);
    expect(r.last).toMatch(/^Yes, you or someone 18 or older\./);
    expect(r.s.techBooked).toBeFalsy();
  });
  it("“Can't you come today?” is fully booked, and another time is offered", () => {
    const r = play("s80-support-call", [...B, "Can't you come today?"]);
    expect(r.last).toMatch(/^Sorry, we're fully booked that day\. (We also have|How about)/);
    expect(r.s.techBooked).toBeFalsy();
  });
});

describe("s81-apartment", () => {
  const st = { mode: "view", askDocs: true, askMovein: false, askPeople: false, askPets: false, otherApplicant: false };
  it("“Can I break the lease early?” is answered", () => {
    const r = play("s81-apartment", ["Hi, I'm here to see the apartment.", "Can I break the lease early?"], st, 3, 0);
    expect(r.last).toMatch(/^You can, but you'd lose the deposit\./);
    expect(r.s.decision).toBeUndefined();
  });
  it("“I don't have my ID with me.” lets the lease be signed, the ID brought tomorrow", () => {
    const r = play("s81-apartment", ["Hi, I'm here to see the apartment.", "How much is the rent?", "No, that's all, thanks.", "I'll take it!", "Next month.",
      "I don't have my ID with me."], st, 3, 0);
    expect(r.last).toMatch(/^That's okay\. Just bring it tomorrow\./);
    expect(r.s.docsOk).toBe(true);
    expect(r.s.signed).toBeFalsy();
  });
});

describe("s82-neighbor", () => {
  const st = { askFrom: true, askLike: false, musicTwist: false, pkgTwist: false };
  const H = ["Hi, I'm Tomas. I just moved in next door."];
  it("“I'm from Canada. And you?” gets Rita's own answer once; “Where are you from?” too", () => {
    const r = play("s82-neighbor", [...H, "I'm from Canada. And you?"], st, 3, 0);
    expect((r.last.match(/I grew up right here, in Maple Harbor!/g) ?? []).length).toBe(1);
    expect(r.last).toMatch(/Welcome to town!/);
    expect(play("s82-neighbor", [...H, "Canada. And you?"], st, 3, 0).last).toMatch(/I grew up right here/);
    expect(play("s82-neighbor", [...H, "I'm from Lithuania.", "Where are you from?"], st, 3, 0).last).toMatch(/^Me\? I grew up right here, in Maple Harbor!/);
  });
  it("“Who's the landlord?” and “Which apartment is yours?” are answered", () => {
    expect(play("s82-neighbor", [...H, "I'm from Lithuania.", "Who's the landlord?"], st, 3, 0).last).toMatch(/^Mr\. Patel\. He lives on the first floor\./);
    expect(play("s82-neighbor", [...H, "I'm from Lithuania.", "Which apartment is yours?"], st, 3, 0).last).toMatch(/^Right here, next to yours!/);
  });
});
