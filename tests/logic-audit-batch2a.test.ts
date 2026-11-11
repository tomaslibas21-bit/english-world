// Logic bugs the Spanish edition's dialogue audit (5 Nov 2026, batch 2: p18–p30) found and that Maple Harbor's
// originals had too: a sale, a deal or a booking on a bare, polite or hedged yes, a refusal taken as a yes, a question
// asked again or looping, a side question answered wrongly, lines contradicting each other.
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
  const events: any[] = [];
  for (const t of turns) {
    const o = conv.input(t);
    said.push(o.lines.map((l: any) => l.sentence.en).join(" "));
    events.push(...o.events);
  }
  const c = conv as any;
  return { conv, s: c.s, said, first, last: said.at(-1) ?? "", all: [first, ...said].join(" "), events, pending: c.pending?.id as string | undefined };
}

describe("p25-used-car", () => {
  const st = { twist: null };
  const T = ["Hi! I'm here about the car.", "No questions.", "No, thanks."];
  const DEAL = [...T, "Okay… let's talk.", "Would you consider eight thousand?", "That works for me.", "Let's shake on it."];
  it("a personal check waits for an answer (it handed over the keys and the title at once)", () => {
    let r = play("p25-used-car", [...DEAL, "Can I write you a check?"], st);
    expect(r.last).toMatch(/cashier's check would be better/);
    expect(r.last).not.toMatch(/keys and the title/);
    expect(r.s.paid).toBeFalsy();
    r = play("p25-used-car", [...DEAL, "Can I write you a check?", "Okay."], st);
    expect(r.s.paid).toBe(true);
    expect(r.last).toMatch(/keys and the title/);
    r = play("p25-used-car", [...DEAL, "Can I write you a check?", "No."], st);
    expect(r.s.paid).toBeFalsy();
    expect(r.last).toMatch(/Cash, a bank transfer or a cashier's check\?/);
  });
  it("a replay: “Oh, it's you again!”, then no “I'm Maggie”", () => {
    expect(play("p25-used-car", ["Hi! I'm here about the car."], st, 3, 1).last).not.toMatch(/I'm Maggie/);
    expect(play("p25-used-car", ["Hi! I'm here about the car."], st, 3, 0).last).toMatch(/I'm Maggie/);
  });
  it("a would (“I'd buy it”) and a polite closing (“Okay, thanks”, “That's okay, thanks”) sell nothing: her question again", () => {
    let r = play("p25-used-car", [...T, "How much is it?", "I'd buy it."], st);
    expect(r.s.outcome).toBeUndefined();
    expect(r.last).toMatch(/no haggling\?/);
    r = play("p25-used-car", [...T, "How much is it?", "I'd buy it.", "Yes."], st);
    expect(r.s.outcome).toBe("deal");
    r = play("p25-used-car", [...T, "Okay… let's talk.", "Would you consider seven thousand?", "Okay, thanks."], st);
    expect(r.s.outcome).toBeUndefined();
    expect(r.last).toMatch(/What do you say\?/);
    r = play("p25-used-car", [...T, "Okay… let's talk.", "Would you consider seven thousand?", "That's okay, thanks."], st);
    expect(r.s.outcome).toBeUndefined();
    r = play("p25-used-car", [...T, "Okay… let's talk.", "Would you consider seven thousand?", "I'd take it."], st);
    expect(r.s.outcome).toBeUndefined();
    // a clear yes still sells
    expect(play("p25-used-car", [...T, "Okay… let's talk.", "Would you consider seven thousand?", "That's fine."], st).s.outcome).toBe("deal");
    expect(play("p25-used-car", [...T, "How much is it?", "I'll take it!"], st).s.outcome).toBe("deal");
  });
});

describe("p27-meeting", () => {
  const st = { twist: false, stubborn: false, flair: "coffee", thoughtsAny: false };
  const R = ["Why Friday?", "Have we tested it properly?", "I see your point, but I'm not sure I agree.", "Wait, can I jump in here for a second?",
    "Hmm, I don't know.", "The timing.", "You're right about the cost.", "Could we look at it another way?", "How about keeping the old site as a backup?"];
  it("no deal without a clear yes: an ack, “Okay, thanks”, an echo, “I don't know” at her final offer get “Deal?” once more", () => {
    for (const t of ["I see your point.", "You're right.", "Okay, thanks.", "Two weeks?", "Two weeks."]) {
      const r = play("p27-meeting", [...R, t], st);
      expect(r.s.outcome, t).toBeNull();
      expect(r.last, t).toBe("Deal?");
    }
    expect(play("p27-meeting", [...R, "I see your point.", "Yes."], st).s.outcome).toBe("deal");
    expect(play("p27-meeting", [...R, "I see your point.", "Okay, thanks."], st).s.outcome).toBe("boss");
    let r = play("p27-meeting", [...R, "How about three weeks?", "I don't know."], st);
    expect(r.s.outcome).toBeNull();
    expect(r.last).toBe("Deal?");
    expect(play("p27-meeting", [...R, "Yes, two weeks."], st).s.outcome).toBe("deal");
    expect(play("p27-meeting", [...R, "Agreed."], st).s.outcome).toBe("deal");
  });
  it("at her final three weeks: “Yes, three weeks” is the deal, four weeks is bargaining, and Greg gives three", () => {
    expect(play("p27-meeting", [...R, "How about a month?", "Yes, three weeks."], st).s.outcome).toBe("deal");
    let r = play("p27-meeting", [...R, "How about a month?", "Four weeks works for me."], st);
    expect(r.s.outcome).toBe("boss");
    expect(r.last).toMatch(/three weeks/);
    r = play("p27-meeting", [...R, "How about a month?", "How about a month?"], st);
    expect(r.last).toMatch(/three weeks/);
    expect(r.last).not.toMatch(/two weeks/);
  });
  it("“So you agree with me?” — “Okay, thanks” is no giving in; “That's okay, thanks” to the coffee is a no", () => {
    const S = ["I'd push back a little on that.", "Excuse me, could I add something?", "Four days isn't enough.", "I take your point.", "Have we considered a soft launch?", "You're right."];
    let r = play("p27-meeting", [...S, "Okay, thanks."], { ...st, stubborn: true, flair: "teal" });
    expect(r.s.outcome).toBeNull();
    expect(r.last).toMatch(/Are you with me on this\?/);
    r = play("p27-meeting", [...R, "Agreed.", "Monday works for me.", "That's okay, thanks."], st);
    expect(r.last).toMatch(/Next time/);
  });
});

describe("p28-kitchen", () => {
  const st = { howMuch: false, backTwist: false };
  const A = ["Hi, Chef! Here's my cold beet soup.", "Of course. Please be honest."];
  const B = [...A, "Thanks, that's really helpful. I'll work on that.", "Could you give me an example?", "Could you taste it again?"];
  const M = [...B, "I hadn't thought of it that way. I'll try it both ways.", "Sure, I'd be happy to."];
  it("“No.” to “Do you... want to taste it?”: she holds the bowl out (it went to “Thanks…” and asked again)", () => {
    const r = play("p28-kitchen", [...M, "Hello.", "No."], st);
    expect(r.last).toMatch(/^Here\. Just taste it\./);
    expect(r.last).not.toMatch(/want to taste it/);
  });
  it("no line twice in a row: “Do you... want to taste it?”, “So, croutons or no croutons?”, “So? What do you think?”, “Really? What?”", () => {
    let r = play("p28-kitchen", [...M, "Hello.", "Hello."], st);
    expect(r.last).not.toMatch(/want to taste it/);
    r = play("p28-kitchen", [...B, "Hello.", "Hello."], st);
    expect(r.last).not.toMatch(/croutons or no croutons/);
    r = play("p28-kitchen", [...A, "Hello.", "Hello."], st);
    expect(r.last).not.toMatch(/What do you think\?/);
    r = play("p28-kitchen", [...M, "Can I give you some feedback?", "Yes.", "Yes.", "Yes."], st);
    expect(r.last).not.toMatch(/Really\? What\?/);
    r = play("p28-kitchen", [...M, "Can I give you some feedback?", "What worked really well was the bacon.", "One thing you could try is a little thyme.", "Hurry up.", "Hurry up."], st);
    expect(r.last).not.toMatch(/I'm trying|let Chef down/);
  });
  it("“How much should I add?” while he waits: a hint, and he waits; “I like it.” takes the croutons", () => {
    let r = play("p28-kitchen", [...A, "Thanks, that's really helpful. I'll work on that.", "Could you give me an example?", "How much should I add?"], st);
    expect(r.last).toBe("Just a few drops. Then I'll taste it again.");
    expect(r.s.againDone).toBeFalsy();
    r = play("p28-kitchen", [...B, "I like it."], st);
    expect(r.s.secondAns).toBe(true);
    expect(r.last).not.toMatch(/croutons or no croutons/);
  });
});

describe("p28b-review", () => {
  const st = { twist: null, follow: false, supportQ: false, back: false };
  const H = ["Honestly? A little nervous.", "I'm most proud of the scheduling tool guide.", "Thank you, that means a lot.", "Sure, go ahead."];
  const PR = ["Good, thanks.", "The app launch.", "Thank you!", "Sure, go ahead.", "I see it differently.", "You presented my sections, the client was late.", "I don't know."];
  const G = [...H, "Thanks, that's really helpful. I'll work on that.", "I don't know.", "I don't know."];
  const C = [...H, "Thanks, that's really helpful. I'll work on that.", "I'd like to take a course in UX writing.", "No, that's all. Thanks, that's really helpful.", "No."];
  it("“No, thanks” / “That's okay, thanks” decline her offers (the agenda, the goal, the same time next month)", () => {
    for (const t of ["No, thanks.", "That's okay, thanks."]) {
      expect(play("p28b-review", [...PR, t], st).s.protectHow, t).toBe("later");
      const g = play("p28b-review", [...G, t], st);
      expect(g.s.goal, t).toBeUndefined();
      expect(g.last, t).toMatch(/Think about it, and we'll choose one next time/);
      expect(play("p28b-review", [...C, t], st).last, t).toMatch(/I'll send you an invite/);
    }
    expect(play("p28b-review", [...PR, "Yes, good idea."], st).s.protectHow).toBe("emily");
    expect(play("p28b-review", [...G, "Okay, thanks."], st).s.goal).toBe("presenting");
    expect(play("p28b-review", [...G, "No."], st).last).toMatch(/Think about it/);
  });
  it("“Client presentations?” gets her idea once more; “How do I do that?” is how, not the meetings' dates", () => {
    let r = play("p28b-review", [...G, "Client presentations?"], st);
    expect(r.s.goal).toBeUndefined();
    expect(r.last).toMatch(/client presentations/);
    r = play("p28b-review", [...H, "How do I do that?"], st);
    expect(r.last).toBe("Try to say one thing in the first ten minutes.");
    expect(play("p28b-review", [...H, "What exactly did I do?"], st).last).toMatch(/Pinewood/);
  });
});

describe("p30-start-over", () => {
  const st = { mood: "open", noraTwist: false, variant: "dinner" };
  const C = ["Hi Dan. Do you have a minute?", "I owe you an apology.", "For what I said at your barbecue. There's no excuse for it.", "I was too proud to call.",
    "Thank you for hearing me out.", "How can I make it up to you?"];
  it("a no to his price or to “starting over or what?”: “Wrong answer. Try again.” once, then he lets it go", () => {
    // the price: no, no; "Anything else?": no; "starting over or what?": no, no
    const r = play("p30-start-over", [...C, "No.", "No.", "No.", "No.", "No."], st);
    expect(r.said.filter((x) => /Wrong answer/.test(x)).length).toBe(2); // once for the price, once for starting over
    expect(r.s.makeUpDone).toBe(true);
    expect(r.s.startOverDone).toBe(true);
  });
  it("a yes or no to a bad move's question; “Whatever you want.”; “Sorry again.”", () => {
    expect(play("p30-start-over", ["Hi Dan. Do you have a minute?", "It was just a joke.", "Yes."], st).last).toMatch(/I'm listening/);
    expect(play("p30-start-over", ["Hi Dan. Do you have a minute?", "I'm sorry you feel that way.", "No."], st).last).toMatch(/I'm listening/);
    expect(play("p30-start-over", ["Hi Dan. Do you have a minute?", "I'm sorry you feel that way.", "Yes."], st).last).not.toMatch(/weather/);
    expect(play("p30-start-over", C.slice(0, 5).concat(["Whatever you want."]), st).last).toMatch(/Dinner/);
    const r = play("p30-start-over", [...C, "Sorry again."], st);
    expect(r.last).not.toMatch(/Dinner\. That'll do/);
  });
});

describe("p18-startup", () => {
  const M = { twist: "midnight", weightLine: false };
  const B = ["Hello! I'm a little lost, honestly.", "No.", "I can do the slides, but not the party.", "Who should I ask about the budget?", "Okay, thanks."];
  it("midnight asked back (or with a no) is no promise to stay, nor the nine o'clock deal", () => {
    let r = play("p18-startup", [...B, "Until midnight?"], M);
    expect(r.s.midDone).toBeFalsy();
    expect(r.last).not.toMatch(/Rock star/);
    r = play("p18-startup", [...B, "Until midnight, I can't."], M);
    expect(r.s.midHow).toBe("cant");
    expect(r.last).not.toMatch(/Rock star|When works for you/);
    r = play("p18-startup", [...B, "I don't know.", "Until midnight?"], M);
    expect(r.s.midDone).toBeFalsy();
    expect(play("p18-startup", [...B, "Until midnight?", "Yes."], M).s.midHow).toBe("yes");
  });
  it("“I don't know.” gets the offer without “Paid? Um... yes.”; until six is no overtime; the pay and “Is it mandatory?”", () => {
    expect(play("p18-startup", [...B, "I don't know."], M).last).toMatch(/^So\? Nine, paid\. Deal\?/);
    const r = play("p18-startup", [...B, "I can stay until six."], M);
    expect(r.s.midHow).toBe("cant");
    expect(r.last).not.toMatch(/overtime/);
    expect(play("p18-startup", [...B, "How much do I get paid?"], M).last).toMatch(/Paid overtime/);
    expect(play("p18-startup", [...B, "Is it mandatory?"], M).last).toMatch(/big week/);
  });
});

describe("p29-landlord", () => {
  const st = { greetAgain: false, twist: null };
  const B = ["Mr. Patel, it's me, from 2B.", "The heating has been broken for a week.", "It's your responsibility to fix it.", "That's not what we agreed.",
    "When can someone come out?", "Next week is too late."];
  it("his day echoed as a question books nothing until a yes", () => {
    let r = play("p29-landlord", [...B, "Friday?"], st);
    expect(r.s.date).toBeFalsy();
    expect(r.last).toBe("So... Friday morning?");
    expect(play("p29-landlord", [...B, "Friday?", "Yes."], st).s.date).toBe("friday");
    r = play("p29-landlord", [...B, "Wednesday?"], st);
    expect(r.s.date).toBeFalsy();
    expect(play("p29-landlord", [...B, "Wednesday?", "Yes."], st).s.date).toBe("wednesday");
    expect(play("p29-landlord", [...B, "Friday."], st).s.date).toBe("friday");
  });
  it("no “Friday is the best I can do.” twice in a row; “I don't know” / “Do I have to be home?” at the home question", () => {
    const r = play("p29-landlord", [...B, "No.", "No.", "No."], st);
    for (let i = 1; i < r.said.length; i++) if (r.said[i]) expect(r.said[i]).not.toBe(r.said[i - 1]);
    const H = [...B, "Friday morning works for me."];
    expect(play("p29-landlord", [...H, "I don't know."], { ...st, homeQ: true }).last).toMatch(/Gus has a key/);
    expect(play("p29-landlord", [...H, "Do I have to be home?"], { ...st, homeQ: true }).last).toMatch(/Gus has a key/);
  });
});

describe("p26-complaint", () => {
  const K = ["Hello?", "I'm calling about my fridge.", "It stopped working last Tuesday. All my food went bad.", "Tomas.", "Completed? Nobody came!"];
  it("“The earliest I have is next Tuesday.” once, not in every round; “Thanks for the offer, but no.” declines", () => {
    const r = play("p26-complaint", [...K, "No.", "No.", "No."], { offerKind: "visit", pluggedTwist: false });
    expect(r.all.match(/The earliest I have is next Tuesday/g)?.length).toBe(1);
    const b = play("p26-complaint", ["Hi, I'd like to make a complaint.", "My new fridge stopped working, and the technician never came.", "It's Tomas Mikalauskas.",
      "This is the third time I've called. Could I speak to your manager, please?", "That's fine, I've got all day.", "Thanks for the offer, but no."], { offerKind: "coupon", pluggedTwist: false });
    expect(b.last).toMatch(/what would you like us to do/);
  });
});

describe("p24-flood", () => {
  const B = ["Hi! I can't come to brunch, my kitchen is flooded.", "No, I'm good, thanks."];
  const st = { twist: null, askOkay: false, askSince: false };
  it("“Yes, please.” to “You sure? I can come over after brunch.” takes up her offer; “Yes, I'm sure.” doesn't", () => {
    let r = play("p24-flood", [...B, "Yes, please."], st);
    expect(r.s.coming).toBe(true);
    expect(r.last).toMatch(/I'll come right after brunch/);
    r = play("p24-flood", [...B, "Yes, I'm sure."], st);
    expect(r.s.coming).toBe(false);
    expect(play("p24-flood", [...B, "Yes."], st).s.coming).toBe(false);
  });
  it("the downstairs question stays open after “I put towels on the floor.”", () => {
    const G = ["Hey girl, can't make brunch, so sorry! My washer kinda exploded.", "Can you bring a mop? And coffee? Lots of coffee.", "Love you, thanks!",
      "Good morning, Mr. Grant. This is Tomas Mikalauskas from apartment 3B.", "I regret to inform you that the washing machine has flooded the kitchen.",
      "It happened this morning, at about seven.", "No, nobody's hurt.", "I put towels on the floor."];
    const r = play("p24-flood", G, { twist: null, askOkay: false, askSince: true });
    expect(r.last).toMatch(/downstairs|Mr\. Okoye/);
  });
});
