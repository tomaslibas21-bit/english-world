// Logic bugs the Spanish edition's dialogue audit (5 Nov 2026, batch 2: s83–s91b) and its English leads found and that
// Maple Harbor's originals had too: a job, a date or an offer taken on joy, a thank-you or a polite no; a refusal
// ignored and asked again; a question asked twice or answered by another one; lines contradicting each other.
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

describe("s87-interview", () => {
  const B = ["Good morning! I have an interview at 9:30.", "Tomas Mikalauskas.", "I'm an accountant with ten years of experience.",
    "I love your company, and I'm ready for a new challenge.", "I'm very organized, and I learn fast.", "No, I think you've answered everything."];
  const st = { qs: [], small: null, offerTwist: true, phoneTwist: false, improveQ: false };
  it("joy, a thank-you or “Okay, thanks” don't take the job; a clear yes does; “No, thank you” is a no", () => {
    for (const say of ["That's wonderful news!", "Really?", "Thank you so much!", "I can't believe it!", "Okay, thanks.", "Thank you for your time."]) {
      const r = play("s87-interview", [...B, say], st);
      expect(r.last, say).toBe("So, what do you say?");
      expect(r.s.offerState, say).toBeUndefined();
    }
    expect(play("s87-interview", [...B, "Yes, thank you!"], st).s.offerState).toBe("hired");
    expect(play("s87-interview", [...B, "That's wonderful news!", "Yes, please!"], st).s.offerState).toBe("hired");
    expect(play("s87-interview", [...B, "That's wonderful news!", "I'm so happy!"], st).s.offerState).toBe("think");
    const no = play("s87-interview", [...B, "No, thank you."], st);
    expect(no.s.offerState).toBe("no");
    expect(no.last).not.toMatch(/Welcome to the team/);
  });
  it("a question about the job at the offer is answered and the offer stays open", () => {
    let r = play("s87-interview", [...B, "When do I start?"], st);
    expect(r.last).toMatch(/first of next month\. So, what do you say\?/);
    r = play("s87-interview", [...B, "What are the next steps?"], st);
    expect(r.last).toMatch(/contract/);
    expect(r.last).not.toMatch(/other candidates/);
  });
  it("“Can I think about it?”, then “I accept!” takes the job after all", () => {
    const r = play("s87-interview", [...B, "Can I think about it?", "Actually, I accept!"], st);
    expect(r.s.offerState).toBe("hired");
  });
  it("one reaction to “easy, but I got a little lost”; “Those are great qualities.” never after one quality", () => {
    const r = play("s87-interview", ["Good morning! I have an interview at 9:30.", "Tomas Mikalauskas.", "Yes, it was easy, but I got a little lost."], { ...st, small: "found", offerTwist: false });
    expect(r.last).not.toMatch(/Okay\./);
    for (let seed = 1; seed <= 12; seed++) {
      const q = play("s87-interview", ["Good morning! I have an interview at 9:30.", "Tomas Mikalauskas.", "I'm an accountant with ten years of experience.",
        "I love your company, and I'm ready for a new challenge.", "I'm hardworking."], { ...st, offerTwist: false }, seed);
      expect(q.last).not.toMatch(/Those are great qualities/);
    }
  });
});

describe("s88-first-day", () => {
  const st = { greetKind: "new", badgeLate: false, coffeeBroken: false, mugTwist: false, printerJam: false };
  const H = ["Hi! I'm Tomas. It's my first day.", "Nice to meet you too!"];
  const L = [...H, "Thanks! This is great.", "No, that's all for now.", "Could you show me how this works?", "Could you send me that file?"];
  it("a bare “What time?” or “Where is it?” before the lunch isn't about the Thai place", () => {
    expect(play("s88-first-day", [...H, "What time?"], st).last).not.toMatch(/noon/);
    expect(play("s88-first-day", [...H, "Where is it?"], st).last).not.toMatch(/around the corner/);
    expect(play("s88-first-day", [...L, "Where is it?"], st).last).toMatch(/around the corner/);
  });
  it("the restrooms once, one goodbye, the day asked again without the clock", () => {
    expect((play("s88-first-day", [...H, "Where's the restroom?"], st).all.match(/down the hall, on the left/gi) ?? []).length).toBe(1);
    const D = [...L, "I'd love to!"];
    const bye = play("s88-first-day", [...D, "It was great!", "Thanks for everything! See you tomorrow!"], st);
    expect((bye.last.match(/Bye!|See you!/g) ?? []).length).toBe(1);
    const again = play("s88-first-day", [...D, "Where's the restroom?"], st);
    expect(again.last).toMatch(/So, how was your first day\?/);
    expect(again.last).not.toMatch(/Time to go home|Five o'clock/);
  });
  it("who's going, when it's due, who Dave is", () => {
    expect(play("s88-first-day", [...L, "Who's going?"], st).last).toMatch(/Dave, and a few others/);
    expect(play("s88-first-day", [...L.slice(0, -1), "Is it urgent?"], st).last).toMatch(/No rush/);
  });
});

describe("s89-video-call", () => {
  const off = { smallTalk: false, camOff: false, freeze: false, collide: false, saraLate: false, paulHelps: false, echoTwist: false, paulLeaves: false, catTwist: false, camStillOn: false };
  const H = ["Yes, I can hear you.", "Paul, you're on mute!", "Yes, we can hear you now!", "Yes, I can see it."];
  it("“No, thanks” / “Thanks, I'm fine” to Paul's help and to Sara's “You go ahead” are a no", () => {
    for (const say of ["No, thanks.", "Thanks, I'm fine.", "Thanks, but I can do it."])
      expect(play("s89-video-call", [...H, "I'm a bit behind with the budget.", "By Friday.", say], { ...off, paulHelps: true }).last, say).toMatch(/^Okay, no problem\./);
    expect(play("s89-video-call", [...H, "I can go first.", "No, thanks."], { ...off, collide: true }).last).toMatch(/I finished the client survey/);
  });
  it("an update that answers the next question isn't asked it; “I have to go” twice ends the call", () => {
    expect(play("s89-video-call", [...H, "I'll finish the report by Friday."], off).last).not.toMatch(/When do you think/);
    expect(play("s89-video-call", [...H, "I finished the report, I'll send it after the call."], off).last).not.toMatch(/Could you send me/);
    const r = play("s89-video-call", [...H, "Sorry, I have to go.", "I have to go."], off);
    expect(r.last).not.toMatch(/quick update/);
    expect(r.conv.ended).toBe(true);
  });
  it("a no after the freeze waits for the answer once; “Am I on mute?” isn't “Yes”; no camera joke after “my camera isn't working”", () => {
    const f = play("s89-video-call", [...H, "Kate, you froze.", "No."], { ...off, freeze: true });
    expect(f.last).toBe("Oh, sorry! Is this better?");
    expect(play("s89-video-call", ["Am I on mute?"], off).last).not.toMatch(/^Yes/);
    const cam = play("s89-video-call", ["Yes, I can hear you.", "Sorry, my camera isn't working.", "Paul, you're on mute!", "Yes, we can hear you now!", "Yes, I can see it.",
      "I finished the report.", "Sure!", "No, that's all.", "Sounds good! Bye, everyone!"], { ...off, camOff: true, camStillOn: true });
    expect(cam.all).not.toMatch(/camera's still on/);
  });
});

describe("s90-running-late", () => {
  const st = { callerId: false, askReason: true, planAsk: false, planWait: false, roomTwist: false };
  it("the reason's reaction before “About how long?”; the time said with it isn't asked", () => {
    const r = play("s90-running-late", ["Hi, it's Tomas. I'm on the bus and there's a lot of traffic."], st);
    expect(r.last.indexOf("traffic is terrible")).toBeLessThan(r.last.indexOf("About how long?"));
    expect(play("s90-running-late", ["Hi, it's Tomas. I'm walking, I'll be there in twenty minutes."], st).last).not.toMatch(/how long/i);
  });
  it("“Drive safe!” only when driving; two hours is two hours; no “we'll wait” for forty minutes", () => {
    expect(play("s90-running-late", ["Hi, it's Tomas. My car won't start.", "No, it's okay, I'm getting a taxi.", "I'll be there in twenty minutes.", "Okay, thank you."], st).all).not.toMatch(/Drive safe/);
    expect(play("s90-running-late", ["Hi, it's Tomas. I'm stuck in traffic.", "In twenty minutes.", "Okay, thank you."], st).all).toMatch(/Drive safe/);
    expect(play("s90-running-late", ["Hi, it's Tomas. I'm running late.", "I missed the bus.", "I'll be there in two hours."], st).s.eta.min).toBe(120);
    expect(play("s90-running-late", ["Hi, it's Tomas. I'm running late.", "I missed the bus.", "I'll be there in forty minutes."], { ...st, planWait: true }).last).not.toMatch(/wait for you/);
  });
  it("the time at the reason question moves on; a long delay at the plan question settles it", () => {
    const r = play("s90-running-late", ["Hi, it's Tomas. I'm running late.", "I'll be there in twenty minutes."], st);
    expect(r.last).not.toMatch(/everything okay|What happened/);
    const p = play("s90-running-late", ["Hi, it's Tomas. I'm running late.", "I missed the bus.", "Twenty minutes.", "I'll be there in fifty minutes."], { ...st, planAsk: true });
    expect(p.last).not.toMatch(/start without you\?/);
  });
});

describe("s91a-lost-wallet", () => {
  const st = { askPockets: false, askDescribe: false, foundTwist: false, worried: false };
  it("“Have you seen a black wallet?” gets her answer; the roses their price; the wallet back without the cash: not “I hope you find it”", () => {
    expect(play("s91a-lost-wallet", ["Sorry, have you seen a black wallet?"], st).last).toMatch(/^No, I haven't seen anything/);
    expect(play("s91a-lost-wallet", ["I've lost my wallet.", "How much are the roses?"], st).last).toMatch(/Ten dollars a bunch/);
    for (let seed = 1; seed <= 6; seed++)
      expect(play("s91a-lost-wallet", ["I've lost my wallet.", "At the café, when I paid for my coffee.", "No, where is it?", "Yes, that's mine!", "No, my money is gone."],
        { ...st, foundTwist: true }, seed).all).not.toMatch(/I hope you find it/);
  });
  it("“Your keys too?” waits for its answer", () => {
    const r = play("s91a-lost-wallet", ["I've lost my wallet and my keys.", "Yes."], st);
    expect(r.last).not.toMatch(/Where was that/);
  });
});

describe("s91b-police", () => {
  const st = { askHappened: false, askSpell: false, askSign: false, askBank: false, askId: false, foundTwist: false, foundDifferent: null };
  const R = ["Good afternoon. I'd like to report a stolen wallet.", "At the farmers' market, around eleven.", "It's brown, leather, and small.", "My cards, my driver's license, and about $40 in cash."];
  it("no local number: no “we'll call you”; “Something's missing” is understood; the case number again", () => {
    const r = play("s91b-police", [...R, "Tomas Mikalauskas.", "I don't have a local number.", "What do I do now?"], st);
    expect(r.all).not.toMatch(/we'll call you/i);
    expect(play("s91b-police", [...R, "Yes, that's mine!", "Tomas Mikalauskas.", "Something's missing."], { ...st, foundTwist: true }).s.found).toBe("partial");
    expect(play("s91b-police", [...R, "Tomas Mikalauskas.", "555-0142.", "What was the case number again?"], st).last).toMatch(/4471/);
  });
});

describe("s83 to s86: polite noes and refusals", () => {
  it("s83: “No” to “Are you inviting me?” waits; “That's okay, thanks” to the barbecue is a no", () => {
    expect(play("s83-invite-call", ["Hi Lizzie, it's Tomas!", "I have tickets for a jazz concert.", "No."], { opening: "whatsup" }).last).toBe("Oh! Okay, no problem.");
    const B = ["Hi Lizzie, it's Tomas!", "I've got two tickets for a jazz concert on Friday. Do you want to come?", "At eight", "Let's meet outside the station", "At 7:30"];
    expect(play("s83-invite-call", [...B, "That's okay, thanks."], { opening: "whatsup", askBand: false, askSister: false, askPay: false, badLine: false, meetChange: false, bbq: true }).s.bbqDone).toBe("no");
  });
  it("s84: a no to the date itself ends it kindly (not “How about Sunday?”); no drink is no drink", () => {
    const st = { opening: "meet", topics: [], askDrinks: false, askCheck: false, quick: false, busySat: false, coldTwist: false };
    const r = play("s84-date", ["Hi! It's so nice to meet you!", "I had a really nice time too", "I'd love that!", "I don't want to see you again."], st);
    expect(r.s.declined).toBe(true);
    expect(r.last).not.toMatch(/Sunday/);
    expect(play("s84-date", ["Hi! It's so nice to meet you!", "I had a really nice time too", "Let's just be friends."], st).s.declined).toBe(true);
    expect(play("s84-date", ["Hi! It's so nice to meet you!", "No, thanks."], { ...st, askDrinks: true }).s.noAlcohol).toBe(true);
  });
  it("s85: “That's okay, thanks” to a drink, seconds or dessert is a no", () => {
    const st = { askSeconds: true, askDessert: true, saladTask: false, catTwist: false, passTwist: false, burntTwist: false, stayTwist: false, dietTwist: false };
    expect(play("s85-dinner", ["Hi! Thank you for inviting me!", "These are for you", "That's okay, thanks."], st).s.drink).toBe("none");
    const D = ["Hi! Thank you for inviting me!", "These are for you", "Water, please", "Something smells amazing!", "This is delicious!"];
    expect(play("s85-dinner", [...D, "That's okay, thanks."], st).s.seconds).toBe("no");
  });
  it("s86: the number refused stays refused (not “What's your number?” again, not at the goodbye)", () => {
    const st = { askFamily: false, askMike: false, askCoffee: false, cantCoffee: false, rushTwist: false, mikeDinnerTwist: false };
    const B = ["Lucy! Oh my gosh! Long time no see!", "Neither have you!", "Really good, thanks! And you?", "I moved here last year and I have a new job. What about you?", "Congratulations!", "Wow, twins! Congratulations!"];
    for (const say of ["No, thanks.", "That's okay, thanks.", "I'd rather not give my number."]) {
      const r = play("s86-old-friend", [...B, say, "Bye!"], st);
      expect(r.all, say).not.toMatch(/What's your number/);
      expect(r.s.goalMet, say).toBeFalsy();
    }
    expect(play("s86-old-friend", [...B, "That's okay, thanks."], { ...st, askCoffee: true }).s.coffee).toBe("no");
  });
});
