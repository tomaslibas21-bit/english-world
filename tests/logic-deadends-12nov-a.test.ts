// Dead ends left by the 5 Nov logic pass (EN-FIXES.md "R, left"), p24–p30: natural learner questions Maple Harbor
// didn't understand ("Can I pay in installments?", "Who's Mia?", "Is there any cost?"…), each played through the
// dialogue engine with the reply it gets now (12 Nov 2026).
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
  const parsed: string[] = [];
  for (const t of turns) {
    const o: any = conv.input(t);
    said.push(o.lines.map((l: any) => l.sentence.en).join(" "));
    parsed.push(o.parse ? o.parse.segments.map((s: any) => s.intent).join("+") : "NOT UNDERSTOOD");
  }
  const c = conv as any;
  return { conv, s: c.s, said, parsed, first, last: said.at(-1) ?? "", pending: c.pending?.id as string | undefined };
}

describe("p25-used-car", () => {
  const st = { twist: null };
  const T = ["Hi! I'm here about the car.", "No questions.", "No, thanks."];
  const DEAL = [...T, "Okay… let's talk.", "Would you consider eight thousand?", "That works for me.", "Let's shake on it."];
  it("installments or “half now and half tomorrow”: all at once, then the ways to pay; nothing paid", () => {
    for (const say of ["Can I pay in installments?", "Can I pay half now and half tomorrow?"]) {
      const r = play("p25-used-car", [...DEAL, say], st);
      expect(r.last, say).toBe("Sorry, all at once. I'm not a bank. Cash, a bank transfer or a cashier's check?");
      expect(r.s.paid, say).toBeFalsy();
    }
    expect(play("p25-used-car", [...DEAL, "Can I pay in installments?", "I'll pay cash."], st).s.paid).toBe(true);
  });
  it("“Is it in your name?”: the title is", () => {
    const r = play("p25-used-car", ["Hi! I'm here about the car.", "Is it in your name?"], st);
    expect(r.last).toMatch(/^Yes, the title is in my name\. All clean\./);
  });
});

describe("p27-meeting", () => {
  const st = { twist: false, stubborn: false, flair: "coffee", thoughtsAny: false };
  const R = ["Why Friday?", "Have we tested it properly?", "I see your point, but I'm not sure I agree.", "Wait, can I jump in here for a second?",
    "Hmm, I don't know.", "The timing."];
  it("“Four thousand a month?” at her strong point: she says it again, and her point still waits for an answer", () => {
    const r = play("p27-meeting", [...R, "Four thousand a month?"], st);
    expect(r.last).toMatch(/^Every month\. That's real money\./);
    expect(r.s.outcome).toBeNull();
    expect(play("p27-meeting", [...R, "Four thousand a month?", "You're right about the cost."], st).last).toMatch(/A little respect/);
  });
  it("“At what time?” to “Same time Monday?”: nine, and his question stays open", () => {
    const D = [...R, "You're right about the cost.", "Could we look at it another way?", "How about keeping the old site as a backup?", "Agreed."];
    const r = play("p27-meeting", [...D, "At what time?"], st);
    expect(r.last).toBe("Nine o'clock, like today.");
    expect(r.pending).toBe("closing");
    expect(play("p27-meeting", [...D, "At what time?", "Monday works for me."], st).last).toMatch(/Coffee/);
  });
});

describe("p28-kitchen", () => {
  const st = { howMuch: false, backTwist: false };
  const A = ["Hi, Chef! Here's my cold beet soup."];
  const B = [...A, "Of course. Please be honest."];
  const H = [...B, "Thanks, that's really helpful. I'll work on that.", "Could you give me an example?", "Could you taste it again?", "I hadn't thought of it that way. I'll try it both ways."];
  it("“Did you like it?” before his feedback, after it, after the second taste", () => {
    expect(play("p28-kitchen", [...A, "Did you like it?"], st).last).toMatch(/^Patience\. First, the feedback\./);
    expect(play("p28-kitchen", [...B, "Did you like it?"], st).last).toBe("I did. It just needs a little more acid.");
    expect(play("p28-kitchen", [...B, "Thanks, that's really helpful. I'll work on that.", "Could you give me an example?", "Could you taste it again?", "Did you like it?"], st).last)
      .toMatch(/^(Much better\. That's a real soup now\.|Now we're talking\. That really wakes it up\.)$/); // again_react
  });
  it("“Who's Mia?” at his favor: who she is, and the favor waits", () => {
    const r = play("p28-kitchen", [...H, "Who's Mia?"], st);
    expect(r.last).toBe("Mia Russo. Our new junior cook.");
    expect(r.s.handoffDone).toBeFalsy();
  });
});

describe("p29-landlord", () => {
  const st = { greetAgain: false, twist: null, homeQ: false };
  const B = ["Mr. Patel, it's me, from 2B.", "The heating has been broken for a week."];
  const O = [...B, "It's your responsibility to fix it."];
  it("who pays: he does (the lease); at his half-and-half offer, the other half", () => {
    expect(play("p29-landlord", [...B, "Who pays for the repair?"], st).last).toMatch(/^Me\. It's in the lease\./);
    const r = play("p29-landlord", [...O, "Do I have to pay anything?"], st);
    expect(r.last).toBe("Just the other half. And your Saturday.");
    expect(r.s.offer).toBeFalsy();
  });
  it("“I'll think about it.” at his offer: hurry up once, then he gives in (Gus comes)", () => {
    let r = play("p29-landlord", [...O, "I'll think about it."], st);
    expect(r.last).toBe("Think fast. Florida is waiting.");
    expect(r.s.offer).toBeFalsy();
    r = play("p29-landlord", [...O, "I'll think about it.", "I'll think about it."], st);
    expect(r.s.offer).toBe("refused");
  });
  it("“I'm not paying rent this month.” at “Anything else?” (the day agreed): rent is rent", () => {
    const D = [...O, "That's not what we agreed.", "When can someone come out?", "Next week is too late.", "Friday morning works for me."];
    const r = play("p29-landlord", [...D, "I'm not paying rent this month."], st);
    expect(r.parsed.at(-1)).toBe("withhold");
    expect(r.last).toMatch(/^Rent is rent, heat is heat\./);
  });
});

describe("p26-complaint", () => {
  const P = ["Hi, I'd like to make a complaint.", "My new fridge stopped working, and the technician never came.", "It's Tomas Mikalauskas.",
    "This is the third time I've called. Could I speak to your manager, please?", "That's fine, I've got all day."];
  it("“Is there any cost?”: no charge (warranty); with “Wednesday is fine.” the visit is taken and the cost answered first", () => {
    let r = play("p26-complaint", [...P, "Is there any cost?"], { offerKind: "visit", pluggedTwist: false });
    expect(r.last).toBe("No charge. The fridge is under warranty.");
    expect(r.s.accepted).toBeFalsy();
    r = play("p26-complaint", [...P, "Wednesday is fine. Is there any cost?"], { offerKind: "visit", pluggedTwist: false });
    expect(r.s.accepted).toBe("visit");
    expect(r.last).toMatch(/No charge\. The fridge is under warranty\. Can I help you with anything else\?$/);
  });
  it("“When does the coupon expire?”: a year, and the offer still waits", () => {
    const r = play("p26-complaint", [...P, "When does the coupon expire?"], { offerKind: "coupon", pluggedTwist: false });
    expect(r.last).toBe("It's good for a year. The mug is forever.");
    expect(r.s.accepted).toBeFalsy();
  });
});

describe("p30-start-over", () => {
  const C = ["Hi Dan. Do you have a minute?", "I owe you an apology.", "For what I said at your barbecue. There's no excuse for it.", "I was too proud to call.",
    "Thank you for hearing me out.", "How can I make it up to you?"];
  it("“What should I cook?” and “I can't today.” at his dinner price; the deal still waits for a yes", () => {
    let r = play("p30-start-over", [...C, "What should I cook?"], { mood: "open", noraTwist: false, variant: "dinner" });
    expect(r.last).toBe("Surprise me. Just not lasagna. That's Nora's thing.");
    expect(r.s.makeUpDone).toBeFalsy();
    r = play("p30-start-over", [...C, "I can't today."], { mood: "open", noraTwist: false, variant: "dinner" });
    expect(r.last).toBe("Who said today? Next Saturday works.");
    expect(r.s.makeUpDone).toBeFalsy();
    expect(play("p30-start-over", [...C, "I can't today.", "Deal."], { mood: "open", noraTwist: false, variant: "dinner" }).s.makeUpDone).toBe(true);
    r = play("p30-start-over", [...C, "I can't today."], { mood: "open", noraTwist: false, variant: "stay" });
    expect(r.last).toMatch(/^Okay\. Another day, then\. But soon\./);
  });
  it("“Are you still mad?” before and after his turn", () => {
    expect(play("p30-start-over", ["Hi Dan. Do you have a minute?", "Are you still mad?"], { mood: "open" }).last).toBe("A little. Keep talking.");
    expect(play("p30-start-over", C.slice(0, 4).concat(["Are you still mad at me?"]), { mood: "open", noraTwist: false }).last).toBe("Not anymore. Well, maybe a little.");
  });
});

describe("p24-flood", () => {
  const st = { twist: null, askOkay: false, askSince: false };
  const B = ["Hi! I can't come to brunch, my kitchen is flooded.", "No, I'm good, thanks."];
  it("“What time will you come?” to Lizzie: after brunch (her offer still open), or twenty minutes with the mop", () => {
    let r = play("p24-flood", [...B, "What time will you come?"], st);
    expect(r.last).toBe("Around eleven, after brunch.");
    expect(play("p24-flood", [...B, "What time will you come?", "Yes, please."], st).s.coming).toBe(true);
    r = play("p24-flood", ["Hey girl, can't make brunch, so sorry! My washer kinda exploded.", "Can you bring a mop? And coffee? Lots of coffee.", "What time will you come?"], st);
    expect(r.last).toBe("Be there in twenty minutes.");
  });
});
