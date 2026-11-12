// Dead ends left by the 5 Nov logic pass (EN-FIXES.md "R, left"), fixed 12 Nov 2026: natural learner questions Maple
// Harbor didn't understand or answered wrongly. This file: s62, s67a, s68, s86, s87, s91a, s91b (the other
// conversations: logic-deadends-12nov-a/-b/-c).
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

describe("s62-visitor-center", () => {
  it("“How much does it cost?” (the map) gets the price, not “Yep”", () => {
    const r = play("s62-visitor-center", ["Hi! Could I have a map, please?", "How much does it cost?"]);
    expect(r.last).toMatch(/^It's totally free!/);
    expect(r.last).not.toMatch(/Yep/);
    expect(play("s62-visitor-center", ["Hi! Could I have a map, please?", "Is the map free?"]).last).toMatch(/^Yep, totally free!/);
  });
});

describe("s67a-tickets", () => {
  it("“Can I pay with my phone?” gets the phone, not “insert your card”", () => {
    const r = play("s67a-tickets", ["Hi! One ticket to Boston, please.", "One way.", "Coach, please.", "Can I pay with my phone?"]);
    expect(r.all).toMatch(/Sure, you can pay with your phone\./);
    expect(r.all).not.toMatch(/insert your card/);
    expect(r.s.paid).toBe(true);
    const card = play("s67a-tickets", ["Hi! One ticket to Boston, please.", "One way.", "Coach, please.", "Can I pay by card?"]);
    expect(card.all).toMatch(/tap or insert your card/);
  });
});

describe("s68-hotel", () => {
  it("“How much is parking?” gets the price without “Yes”", () => {
    const r = play("s68-hotel", ["Hi, I have a reservation.", "How much is parking?"]);
    expect(r.last).toMatch(/^It's \$15 a night\./);
    expect(play("s68-hotel", ["Hi, I have a reservation.", "Do you have parking?"]).last).toMatch(/^Yes, parking is \$15 a night\./);
  });
});

describe("s86-old-friend", () => {
  it("“What do you do?” gets Lucy's job", () => {
    const H = ["Lucy! Oh my gosh! Long time no see!", "Really good, thanks! And you?"];
    for (const q of ["What do you do?", "Where do you work now?", "What do you do for a living?"]) {
      expect(play("s86-old-friend", [...H, q]).last, q).toMatch(/^I'm a teacher now\. Third grade!/);
    }
    expect(play("s86-old-friend", [...H, "I work at Brightline now."]).last).not.toMatch(/teacher/);
  });
});

describe("s87-interview", () => {
  const st = { qs: [], small: null, offerTwist: false, phoneTwist: false, improveQ: false };
  const B = ["Good morning! I have an interview at 9:30.", "Tomas Mikalauskas.", "I'm an accountant with ten years of experience.",
    "I love your company, and I'm ready for a new challenge.", "I'm very organized, and I learn fast."];
  it("“What does the company do?” is answered, at the questions and before them", () => {
    for (const q of ["What does the company do?", "What does Brightline do?", "Could you tell me a little about the company?"]) {
      const r = play("s87-interview", [...B, q], st);
      expect(r.last, q).toMatch(/^We design websites and apps for local businesses\./);
    }
    expect(play("s87-interview", [...B.slice(0, 2), "What does the company do?"], st).last).toMatch(/^We design websites and apps/);
    expect(play("s87-interview", [...B, "What do you like about the company?"], st).last).toMatch(/^The people!/);
  });
});

describe("s91a-lost-wallet", () => {
  const st = { askPockets: false, askDescribe: false, foundTwist: false, worried: false };
  const H = ["Excuse me, can you help me?", "I lost my wallet."];
  it("“If you find it, can you call me?” → her number question, then “I'll call you if it turns up”", () => {
    const r = play("s91a-lost-wallet", [...H, "If you find it, can you call me?", "My number is 555 0142."], st);
    expect(r.said[2]).toMatch(/^Of course, dear! Leave me your number\.$/);
    expect(r.last).toMatch(/^Got it\. I'll call you if it turns up\./);
    expect(r.s.numberLeft).toBe(true);
    // anything else drops the number question and the help goes on
    const other = play("s91a-lost-wallet", [...H, "Could you call me if it turns up?", "I had it at the fruit stand."], st);
    expect(other.last).toMatch(/fruit stand/);
  });
});

describe("s91b-police", () => {
  const st = { askHappened: false, askSpell: false, askSign: false, askBank: false, askId: false, foundTwist: true, foundDifferent: null };
  const R = ["Good afternoon. I'd like to report a stolen wallet.", "At the farmers' market, around eleven.", "It's brown, leather, and small.", "My cards, my driver's license, and about $40 in cash."];
  it("“Who brought it in?” / “Where did they find it?” at “Is this yours?” are answered, then the question again", () => {
    let r = play("s91b-police", [...R, "Who brought it in?"], st);
    expect(r.last).toMatch(/^A young woman\. She didn't leave her name\. So, is this yours\?/);
    r = play("s91b-police", [...R, "Where did they find it?"], st);
    expect(r.last).toMatch(/^She didn't say, sorry\. She just left it here\. So, is this yours\?/);
    // without the twist, nothing was brought in
    expect(play("s91b-police", [R[0], "Who found it?"], { ...st, foundTwist: false }).last).not.toMatch(/young woman/);
  });
});
