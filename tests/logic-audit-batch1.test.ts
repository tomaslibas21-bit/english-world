// Logic bugs the Spanish edition's dialogue audit (5 Nov 2026, batch 1: s31–s35, s62–s68, s70–s72) found and that
// Maple Harbor's originals had too: money on a bare or ambiguous yes, a refusal taken as a yes, a charge repeated,
// change on exact money, a question asked again or looping, a side question answered wrongly, lines contradicting
// each other. What the NPC says back (and never says) is what the situations' own NLU tests and sims can't show.
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
const pays = (events: any[]) => events.filter((e) => e.name === "pay").map((e) => e.data?.amount);

describe("s70-museum", () => {
  const T = ["One adult ticket, please.", "No, thank you."];
  const off = { haroldTwist: false, late: false };
  it("a bare yes to “Are you sure?” buys nothing: the plain offer comes again", () => {
    let r = play("s70-museum", [...T, "Yes."], off);
    expect(r.s.guides).toBe(0);
    expect(r.last).toMatch(/Would you like an audio guide\?/);
    r = play("s70-museum", [...T, "Yes.", "No, thanks."], off);
    expect(r.s.guides).toBe(0);
    r = play("s70-museum", [...T, "Yes.", "Yes."], off);
    expect(r.s.guides).toBe(1);
    r = play("s70-museum", [...T, "Okay, yes, please."], off);
    expect(r.s.guides).toBe(1);
  });
  it("“How much is it?” at “Are you sure?” keeps the offer open", () => {
    const r = play("s70-museum", [...T, "How much is it?", "Yes, please."], off);
    expect(r.said[2]).toMatch(/five dollars/);
    expect(r.s.guides).toBe(1);
  });
  it("“Do you have audio guides?” before the offer is a question, not an order", () => {
    const r = play("s70-museum", ["Do you have audio guides?", "One adult ticket, please."], off);
    expect(r.said[0]).toMatch(/five dollars/);
    expect(r.s.guides).toBe(0);
    expect(r.last).toMatch(/audio guide/);
  });
  it("exact cash gets no change; too little cash pays nothing", () => {
    let r = play("s70-museum", [...T, "No.", "Here's eighteen dollars."], off);
    expect(r.s.paid).toBe(true);
    expect(r.last).not.toMatch(/change/);
    r = play("s70-museum", [...T, "No.", "Here's ten dollars."], off);
    expect(r.s.paid).toBeFalsy();
    expect(r.last).toMatch(/\$18/);
    r = play("s70-museum", [...T, "No.", "Here's twenty dollars."], off);
    expect(r.last).toMatch(/change/);
  });
  it("an audio guide after paying is charged alone, and only the guide is handed over", () => {
    const r = play("s70-museum", [...T, "No.", "Card, please.", "Actually, can I get an audio guide?", "English, please.", "Card, please."], off);
    expect(r.said[5]).toMatch(/\$5\b/);
    expect(pays(r.events)).toEqual([1800, 500]);
    expect(r.last).not.toMatch(/your ticket/);
    expect(r.last).toMatch(/audio guide/);
  });
  it("one more ticket after paying is charged alone; a cut after paying changes nothing", () => {
    let r = play("s70-museum", [...T, "No.", "Card, please.", "Can I get one more adult ticket?", "Card, please."], off);
    expect(pays(r.events)).toEqual([1800, 1800]);
    r = play("s70-museum", ["Two adult tickets, please.", "No, thank you.", "No.", "Card, please.", "Actually I'm a student."], off);
    expect(r.last).toMatch(/already paid/);
    expect(r.s.tix).toEqual({ adult: 2 });
    // a swapped type after paying stays as paid (no "$8" for the difference); more of the same is an extra
    r = play("s70-museum", ["One student ticket, please.", "Here you go.", "No, thank you.", "No.", "Card, please.", "Actually, make it one adult."], off);
    expect(r.last).toMatch(/already paid/);
    expect(r.s.tix).toEqual({ student: 1 });
    r = play("s70-museum", ["One student ticket, please.", "Here you go.", "No, thank you.", "No.", "Card, please.", "One adult ticket, please."], off);
    expect(r.last).toMatch(/already paid/);
    expect(r.s.tix).toEqual({ student: 1 });
    r = play("s70-museum", [...T, "No.", "Card, please.", "Actually, make it two adults.", "Card, please."], off);
    expect(pays(r.events)).toEqual([1800, 1800]);
    r = play("s70-museum", [...T, "No.", "Card, please.", "Two adult tickets, please.", "Card, please."], off);
    expect(pays(r.events)).toEqual([1800, 1800]);
  });
  it("“No, thanks” to the language calls the guide off (it asked again and again)", () => {
    const r = play("s70-museum", ["One adult ticket, please.", "Yes, please.", "No, thanks."], off);
    expect(r.s.guides).toBe(0);
    expect(r.last).toMatch(/\$18/);
  });
  it("another ticket of a type, change for a hundred, “Never mind, I don't want it” at the language", () => {
    let r = play("s70-museum", [...T, "No.", "I'd like another student ticket.", "Here you go.", "Card, please."], off);
    expect(r.s.tix).toEqual({ adult: 1, student: 1 });
    expect(pays(r.events)).toEqual([2800]);
    r = play("s70-museum", [...T, "No.", "Do you have change for a hundred?", "Here you go."], off);
    expect(r.said[3]).toBe("No problem!");
    expect(r.s.paid).toBe(true);
    expect(r.last).toMatch(/change/);
    r = play("s70-museum", ["One adult ticket, please.", "Yes, please.", "Never mind, I don't want it."], off);
    expect(r.s.guides).toBe(0);
    expect(r.last).toMatch(/\$18/);
  });
  it("ten or more get “groups … book ahead”, not “How many tickets?” forever", () => {
    const r = play("s70-museum", ["There are ten of us.", "Ten adults."], off);
    for (const s of r.said) expect(s).toMatch(/groups of ten/);
  });
  it("“Pardon?” to the guard gets his line again; “Sorry!” is the apology", () => {
    const B = ["One adult ticket, please.", "No, thanks.", "No.", "Card, please.", "Where's the new exhibition?", "No, that's all, thanks."];
    let r = play("s70-museum", [...B, "Pardon?"], { haroldTwist: true, late: false, mentionExhibit: false });
    expect(r.conv.ended).toBe(false);
    expect(r.last).toMatch(/don't touch/);
    r = play("s70-museum", [...B, "Sorry!"], { haroldTwist: true, late: false, mentionExhibit: false });
    expect(r.conv.ended).toBe(true);
  });
});

describe("s68-hotel", () => {
  const R = ["Hi, I have a reservation.", "Mikalauskas.", "Yes, that is right.", "Here is my passport.", "Here is my card.", "Sure."];
  const st = { askKeys: false, askSpell: false, mode: "checkin" };
  it("a bare yes to “noon for free, or until 2 for $30” books nothing paid", () => {
    for (const yes of ["Yes.", "Yes, thanks.", "Okay.", "That's fine, thanks."]) {
      const r = play("s68-hotel", [...R, "Could I have a late check-out?", yes], st);
      expect(r.s.late).toBeUndefined();
      expect(r.last).toMatch(/noon for free, or until 2/);
    }
    let r = play("s68-hotel", [...R, "Could I have a late check-out?", "Yes.", "Yes."], st);
    expect(r.s.late).toBe("noon");
    r = play("s68-hotel", [...R, "Could I have a late check-out?", "Until two, please."], st);
    expect(r.s.late).toBe("two");
  });
  it("“That's okay, thanks” to the ocean view is a no; an unsure “Okay, thanks” gets the offer again", () => {
    let r = play("s68-hotel", [...R, "Could I have a room with a view?", "That's okay, thanks."], st);
    expect(r.s.view).toBeUndefined();
    r = play("s68-hotel", [...R, "Could I have a room with a view?", "Okay, thanks."], st);
    expect(r.s.view).toBeUndefined();
    expect(r.last).toMatch(/ocean view/);
    r = play("s68-hotel", [...R, "Could I have a room with a view?", "Yes, please."], st);
    expect(r.s.view).toBe(true);
    r = play("s68-hotel", [...R, "Could I have a room with a view?", "No, thanks, it's too expensive."], st);
    expect(r.s.view).toBeUndefined();
  });
  it("a walk-in who takes the view room isn't offered the king room again", () => {
    const r = play("s68-hotel", ["Do you have any rooms available?", "Two nights.", "Could I have a room with a view?", "Yes, please."], st);
    expect(r.s.roomChosen).toBe(true);
    expect(r.last).not.toMatch(/king bed/);
  });
  it("a yes to “What time do you need it?” (the taxi) asks the time again", () => {
    const r = play("s68-hotel", [...R, "Could you call me a taxi?", "Yes, please.", "At noon."], st);
    expect(r.said.at(-2)).toMatch(/What time/);
    expect(r.s.taxi).toBe(true);
  });
  it("“Yes, but we need two beds” isn't asked “a king bed … Is that right?” again", () => {
    const r = play("s68-hotel", ["Hi, I have a reservation.", "Mikalauskas.", "Yes, but we need two beds."], st);
    expect(r.last).toMatch(/two queen beds/);
    expect(r.last).not.toMatch(/king bed/);
    expect(r.s.confirmed).toBe(true);
  });
  it("a guest with a reservation who asks about rooms stays a guest with a reservation", () => {
    const r = play("s68-hotel", ["Hi, I have a reservation.", "Do you have any rooms available?", "Mikalauskas."], st);
    expect(r.s.kind).toBe("res");
    expect(r.last).toMatch(/I found it/);
  });
  it("no credit card: the $100 deposit is accepted (not the card asked again)", () => {
    const r = play("s68-hotel", ["Hi, I have a reservation.", "Mikalauskas.", "Yes, that is right.", "Here is my passport.", "I don't have a credit card.", "Here's a hundred dollars."], st);
    expect(r.said[4]).not.toMatch(/I'll need a credit card/);
    expect(r.s.cardGiven).toBe(true);
  });
});

describe("s31-doctor", () => {
  const off = { askDob: false, askMore: false, askScale: false, bpTwist: false, chartTwist: false, askPharmacy: false, offerNote: false };
  it("“I feel bad, I have a fever” is not asked “What are your symptoms?” (it stayed open)", () => {
    const r = play("s31-doctor", ["I feel bad, I have a fever.", "Since yesterday.", "No, nothing."], { ...off, feelingOpener: true });
    expect(r.said[0]).not.toMatch(/What are your symptoms/);
    expect(r.pending).not.toBe("sick_q");
    for (const s of r.said) expect(s).not.toMatch(/what brings you in|what can I do for you/i);
  });
  it("two questions before the exam get one “first”", () => {
    const r = play("s31-doctor", ["I have a sore throat.", "Can I go to work? Can I drive?"], { ...off, feelingOpener: false });
    expect((r.last.match(/first/g) ?? []).length).toBe(1);
  });
  it("an ear infection: no “Stay home” after “Yes, if you feel okay”; “Will it make me sleepy?” is not “Yes, it won't…”", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = play("s31-doctor", ["I have an earache.", "Since yesterday.", "No.", "No, nothing.", "Okay.", "Okay.", "Okay.", "No, I don't have any allergies.", "Can I go to work?", "Will it make me sleepy?"],
        { ...off, feelingOpener: false, askQ: true }, seed);
      expect(r.all).toMatch(/Yes, if you feel okay/);
      expect(r.all).not.toMatch(/Stay home/);
      expect(r.all).not.toMatch(/Yes, it won't make you sleepy/);
    }
  });
  it("the chart twist on a stomach bug: no “Before I prescribe anything” after “I'll give you something…”", () => {
    const r = play("s31-doctor", ["I have a stomachache.", "Since yesterday.", "No.", "No, nothing.", "Okay.", "Okay.", "Okay."],
      { ...off, feelingOpener: false, chartTwist: true, introFirst: false });
    expect(r.all).toMatch(/I'll give you something for your stomach/);
    expect(r.all).not.toMatch(/Before I prescribe anything/);
  });
});

describe("s32-supermarket", () => {
  const P = ["Yes, thanks.", "No, I don't have one."];
  const st = { sco: false, priceCheck: false, wine: false, joinOffer: false };
  it("“That's fine, thanks” / “I'm good” to “Do you need a bag?” is no bag; “Yes, I have one here” is my own", () => {
    for (const t of ["That's fine, thanks.", "I'm good, thanks.", "No need."]) expect(play("s32-supermarket", [...P, t], st).s.bags).toBe(0);
    const r = play("s32-supermarket", [...P, "Yes, I have one here."], st);
    expect(r.s.bags).toBe(0);
    expect(r.said[2]).toMatch(/your bag/);
  });
  it("“Do you have change for a fifty?” is answered (not “Sorry, we don't have that.”)", () => {
    const r = play("s32-supermarket", [...P, "No, thanks.", "Do you have change for a fifty?", "Here you go."], st);
    expect(r.said[3]).not.toMatch(/don't have that/);
    expect(r.last).toMatch(/37\.24/);
  });
  it("“Here's ten” then “here's five more” adds up", () => {
    const r = play("s32-supermarket", [...P, "No, thanks.", "Cash, please.", "Here's ten dollars.", "And here's five more."], st);
    expect(r.s.paid).toBe(true);
    expect(r.last).toMatch(/2\.24/);
  });
});

describe("s33-small-talk", () => {
  const st = { howOpener: false, rainTwist: false, lateTwist: false, busFrank: false, day: "mon", askWeek: false };
  it("a “not” that agrees gets Frank's agreeing reply", () => {
    let r = play("s33-small-talk", ["It's not hot today."], { ...st, weather: "cold" });
    expect(r.said[0]).not.toMatch(/tougher than me/);
    r = play("s33-small-talk", ["It's not cold today."], { ...st, weather: "lovely" });
    expect(r.said[0]).not.toMatch(/better than rain/);
    r = play("s33-small-talk", ["It's not cold."], { ...st, weather: "cold" });
    expect(r.said[0]).toMatch(/tougher than me/);
  });
});

describe("s34-meeting", () => {
  const st = { notesTwist: false, dlTwist: false, paulHelps: true, paulAdds: false };
  const B = ["Sara, you're on mute!", "I'm a little behind on the report. It'll be ready on Monday."];
  it("a thanks that turns Paul's help down is a no", () => {
    for (const t of ["No, thanks.", "Thanks, I'm fine.", "That's okay, thanks.", "I'm good, thanks.", "Thanks, but I can do it."]) {
      const r = play("s34-meeting", [...B, t], st);
      expect(r.s.helpAccepted).toBe(false);
      expect(r.said[2]).not.toMatch(/let's talk after the meeting/);
    }
    for (const t of ["Yes, please.", "That would be great, thanks!", "Thanks!"]) expect(play("s34-meeting", [...B, t], st).s.helpAccepted).toBe(true);
  });
  it("“Can I leave early on Friday?” at Any other business gets a yes (not “Good point… next week”)", () => {
    const AOB = ["Sara, you're on mute!", "I finished the report.", "Sure!", "Could you clarify that?", "Yes, thanks!", "No, nothing to add.", "I'm not sure I agree.", "It's too risky.", "Sure, let's talk later.", "I can do that."];
    const r = play("s34-meeting", [...AOB, "Can I leave early on Friday?"], st);
    expect(r.last).toMatch(/put it in the calendar/);
    expect(r.last).not.toMatch(/Good point|keep me posted/);
  });
});

describe("s35-gym", () => {
  const st = { outOfOrder: false, painTwist: false, askId: true, firstQ: false };
  const N = ["Hi, I'm new here!", "The monthly membership, please."];
  it("“No, I forgot it” to “I'll need a photo ID” is about the ID, not a lock", () => {
    const r = play("s35-gym", [...N, "No, I forgot it."], st);
    expect(r.last).not.toMatch(/buy one at the front desk/);
  });
  it("the locker room is in one place, however often it's asked", () => {
    const r = play("s35-gym", [...N, "Sure, here you go.", "Card, please.", "Where are the lockers?", "Sorry, where are the lockers?"], st);
    expect(r.all).not.toMatch(/on the left/);
  });
  it("“How much is a lock?” gets the price; “Is there another one?” at a working machine gets no “No, it's fine!”", () => {
    let r = play("s35-gym", [...N, "Sure, here you go.", "Card, please.", "Where are the lockers?", "How much is a lock?"], { ...st, askLock: true });
    expect(r.last).toMatch(/five dollars/);
    r = play("s35-gym", ["Hi, I'm new here!", "I'll take the monthly membership.", "Here you go.", "Card, please.", "Yes. Where are the lockers?", "Yes, I brought one.", "I'm back!", "The bike, please.", "Is there another one?"], { ...st, askFeel: false });
    expect(r.last).not.toMatch(/No, it's fine/);
  });
  it("“Tomorrow at 7 pm” is not “See you tomorrow, same time!”", () => {
    const W = ["Hi, I'm new here!", "I'll take the monthly membership.", "Here you go.", "Card, please.", "Yes. Where are the lockers?", "Yes, I brought one.", "I'm back!", "The bike, please.",
      "Is this machine free?", "How many sets should I do?", "Done!", "Can you spot me?", "I'm out of breath!", "Tomorrow at 7 pm."];
    for (const seed of [1, 2, 3, 4, 5, 6]) expect(play("s35-gym", W, { ...st, askFeel: false, nextAsk: "same" }, seed).last).not.toMatch(/same time/);
  });
});

describe("s62-visitor-center", () => {
  it("the café tip is offered at most twice", () => {
    const r = play("s62-visitor-center", ["Hi! Could I have a map, please?", "How do I get to the bank?", "Okay, got it.", "Right out the door.", "What time do you close?", "Where's the restroom?"]);
    expect((r.all.match(/have you tried Sunny Cup/g) ?? []).length).toBeLessThanOrEqual(2);
  });
});

describe("s63-party", () => {
  const ALL = ["from", "job", "numbers", "know", "time", "like", "fun"];
  const st = (plan: string[] = ALL, x: Record<string, any> = {}) => ({ plan, mishearTwist: false, cafeTwist: false, ...x });
  const P = ["Hi, I'm Tomas. Nice to meet you!", "We work together.", "I'm from Lithuania.", "It's in Europe.", "I'm a nurse."];
  it("“About a year. And you?” gets “I moved here in May” once", () => {
    const r = play("s63-party", [...P, "About a year. And you?"], st(["from", "job", "numbers", "time"]));
    expect((r.last.match(/moved here in May/g) ?? []).length).toBe(1);
  });
  it("a yes or no with “And you?” still answers the question", () => {
    let r = play("s63-party", [...P, "Yes. And you?"], st(["from", "job", "numbers", "like"]));
    expect(r.last).not.toMatch(/Do you like it here/);
    expect(r.last).toMatch(/Me too/);
    r = play("s63-party", [...P, "Not much, and you?"], st(["from", "job", "numbers", "like"]));
    expect(r.last).not.toMatch(/Do you like it here|I run, and I cook/);
    r = play("s63-party", [...P, "No, and you?"], st(["from", "job", "numbers"], { cafeTwist: true }));
    expect(r.last).not.toMatch(/Have you been to the new café/);
    expect(r.last).toMatch(/go together/);
  });
  it("“Yes, please. And you?” to Sophie's drink is a drink (not “I'm from Chicago”)", () => {
    for (const t of ["Yes, please. And you?", "A lemonade, please. And you?", "No, thanks. And you?"]) {
      const r = play("s63-party", ["Hi, I'm Tomas. Nice to meet you!", t], st(["from", "job", "numbers", "drink"]));
      expect(r.s.drinkDone).toBe(true);
      expect(r.last).not.toMatch(/Chicago/);
    }
  });
  it("“Ask me something!” again is only that line", () => {
    const r = play("s63-party", [...P, "Yes."], st(["from", "job", "numbers"]));
    expect(r.last).not.toMatch(/asking all the questions/);
  });
});

describe("s64a-checkin", () => {
  const B = ["To Boston, please.", "Here you go.", "Just one bag.", "Sure."];
  const st = { askSafety: false, overweight: false, noWindow: false };
  it("seats: one question after “not the middle”; the middle seat after window and aisle are refused", () => {
    let r = play("s64a-checkin", [...B, "I don't want the middle.", "Yes."], st);
    expect((r.last.match(/Window or aisle/g) ?? []).length).toBe(1);
    r = play("s64a-checkin", [...B, "I don't want a window seat.", "No."], st);
    expect(r.last).toMatch(/middle seat/);
    expect(r.last).not.toMatch(/Window or aisle/);
  });
  it("security is in one place", () => {
    const r = play("s64a-checkin", [...B, "Window, please.", "Where's security?", "Sorry, where is security?"], st);
    expect(r.all).not.toMatch(/straight ahead/);
  });
  it("after the $100 fee: no “Your bag is under 50 pounds”, no “nothing to pay today”", () => {
    const r = play("s64a-checkin", [...B, "I'll pay the fee.", "Here's my card.", "Actually, I'll take some things out.", "Can I pay by card?"], { ...st, overweight: true });
    expect(r.all).not.toMatch(/under 50 pounds|nothing to pay/);
  });
  it("“Do I have to pay for the bag?” at the overweight choice is the fee, not “one checked bag is included”", () => {
    let r = play("s64a-checkin", [...B, "Do I have to pay for the bag?"], { ...st, overweight: true });
    expect(r.last).toMatch(/\$100/);
    expect(r.last).not.toMatch(/included/);
    r = play("s64a-checkin", [...B, "How much is the overweight fee?"], st);
    expect(r.last).toMatch(/\$100/);
  });
  it("“Do you take cards?” before a bag that will be over is weighed: not “nothing to pay today”", () => {
    let r = play("s64a-checkin", ["To Boston, please.", "Here you go.", "Do you take cards?"], { ...st, overweight: true });
    expect(r.last).not.toMatch(/nothing to pay/);
    expect(r.last).toMatch(/limit/);
    r = play("s64a-checkin", ["To Boston, please.", "Here you go.", "Do you take cards?"], st);
    expect(r.last).toMatch(/nothing to pay/);
  });
});

describe("s64b-security", () => {
  const st = { camera: false, alarm: true, bagCheck: false, scanner: true, shoesNote: false };
  const D = ["Here you go.", "Okay, done.", "Okay."];
  it("“Done.” at an alarm question is “through again”, never a loop", () => {
    for (const t of ["Done.", "Okay.", "Ready.", "I took it out."]) {
      const r = play("s64b-security", [...D, t, "Okay."], st);
      expect(r.said[3]).toMatch(/step through again/);
      expect(r.s.walked).toBe(true);
      expect(r.pending).not.toBe("pockets");
    }
  });
  it("“Why?” at the alarm says what happened; “What do I do?” before the scanner is not its instructions", () => {
    let r = play("s64b-security", [...D, "Why?"], st);
    expect(r.last).toMatch(/scanner found something/);
    r = play("s64b-security", ["What do I do?"], st);
    expect(r.last).not.toMatch(/footprints/);
  });
  it("“Oh, sorry.” at the water bottle is an apology", () => {
    const r = play("s64b-security", [...D, "Yes, it is.", "Oh, sorry."], { ...st, alarm: false, bagCheck: true });
    expect(r.last).toMatch(/happens all the time/);
  });
  it("the bag is handed over after a side question (not “everything else looks fine” again)", () => {
    const r = play("s64b-security", [...D, "Yes, it is.", "Oh, sorry, I forgot.", "You can throw it away.", "Where's gate 8?"], { ...st, alarm: false, bagCheck: true });
    expect(r.s.collected).toBe(true);
    expect(r.last).not.toMatch(/everything else looks fine/);
  });
});

describe("s64c-gate", () => {
  const st = { delay: true, gateChange: false, fullFlight: false, earlyGroup: false };
  it("“Is flight 223 on time?” is not asked the flight number", () => {
    const r = play("s64c-gate", ["Is flight 223 on time?"], st);
    expect(r.last).not.toMatch(/flight number/);
    expect(r.last).toMatch(/delay|late/);
  });
  it("“That's okay, thanks” / “I only have a backpack” to the gate check are a no", () => {
    const B = ["Is this the right gate for flight 223 to Boston?", "Is the flight on time?", "No, that's all. Thank you.", "Thank you."];
    for (const t of ["That's okay, thanks.", "I only have a backpack.", "I don't have a bag."]) {
      const r = play("s64c-gate", [...B, t], { ...st, delay: false, fullFlight: true });
      expect(r.s.bagChecked).toBeFalsy();
    }
  });
});

describe("s65a-passport", () => {
  const base = { askBizKind: false, askWho: false, askAddress: false, showTicket: false, askReturn: false, askFirst: false, askJob: false, askAlone: false, askCash: false, dogTwist: false, fingers: false, photo: false };
  const P = ["Here you go.", "I'm here on vacation.", "Two weeks.", "At the Harborview Hotel."];
  it("a bare “Business.” / “Both.” at a later question never rewrites the purpose", () => {
    expect(play("s65a-passport", [...P, "Business."], { ...base, askJob: true }).s.purpose).toBe("vacation");
    expect(play("s65a-passport", [...P, "Both."], base).s.purpose).toBe("vacation");
    expect(play("s65a-passport", ["Here you go.", "I'm here on vacation.", "Both."], base).s.purpose).toBe("vacation");
  });
  it("“I haven't bought it yet” / “It's one-way” get no “check your email”", () => {
    for (const t of ["I haven't bought it yet.", "It's one-way.", "I only have a one-way ticket."]) {
      const r = play("s65a-passport", [...P, t], { ...base, askReturn: true });
      expect(r.last).not.toMatch(/check your email/);
      expect(r.last).toMatch(/90 days/);
    }
  });
  it("“Fine, thanks. It was a very long flight.”: the sympathy, then the passport", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const r = play("s65a-passport", ["Fine, thanks. It was a very long flight."], base, seed);
      if (!/How are you/.test(r.first)) continue;
      expect(r.last).toMatch(/sorry to hear that\. (Your )?[Pp]assport/);
      expect(r.last).not.toMatch(/Nice!|Glad/);
    }
  });
});

describe("s65b-baggage", () => {
  const st = { askConnection: false, askTag: false, foundTwist: false, askSize: false, askMaterial: false, askMarks: false, askBrand: false, askContents: false, offerKit: true };
  const B = ["My bag didn't arrive.", "It was flight 482 from New York.", "It's a large blue suitcase."];
  const K = [...B, "Yes, please deliver it to my hotel.", "At the Harborview Hotel.", "My number is 555 0142."];
  it("the overnight kit: “How much is it?” is the kit's price, not the delivery's; “That's okay, thanks” is a no", () => {
    let r = play("s65b-baggage", [...K, "How much is it?"], st);
    expect(r.last).not.toMatch(/delivery is free/);
    expect(r.last).toMatch(/^It's free\. Would you like an overnight kit\?/);
    r = play("s65b-baggage", [...B, "Is it free?"], st);
    expect(r.last).toMatch(/^Yes, the delivery is free\./);
    r = play("s65b-baggage", [...K, "How much is it?", "Yes, please."], st);
    expect(r.events.some((e) => e.name === "give" && e.data?.item === "overnight kit")).toBe(true);
    r = play("s65b-baggage", [...K, "That's okay, thanks."], st);
    expect(r.events.some((e) => e.name === "give" && e.data?.item === "overnight kit")).toBe(false);
  });
  it("asked “When?” first, the yes to the delivery doesn't say the time again", () => {
    const r = play("s65b-baggage", [...B, "When will I get it?", "Yes, please."], st);
    expect(r.last).not.toMatch(/24 hours|less than a day/);
  });
});

describe("s66-taxi", () => {
  const st = { askBag: false, askTalk: false, askRadio: false, askReceipt: false, volunteerTime: false, rideshare: false, trafficTwist: false };
  it("“How much is it to the airport?” gets the price (not “Where are you headed?”)", () => {
    const r = play("s66-taxi", ["How much is it to the airport?"], st);
    expect(r.last).toMatch(/\$\d+/);
    expect(r.last).not.toMatch(/Where are you headed/);
  });
  it("“That's okay, thanks” to “Want me to put it in the trunk?” is a no", () => {
    const r = play("s66-taxi", ["To the Harborview Hotel, please.", "That's okay, thanks."], { ...st, askBag: true });
    expect(r.s.trunk).toBe(false);
  });
});

describe("s67b-bus", () => {
  const st = { oos: false, fareHow: false, askKnown: false, midStop: false };
  it("“Is it the 12?” is not a $12 fare; “Where do I get off?” after arriving is “here”", () => {
    let r = play("s67b-bus", ["Does this bus go to Old Town?", "Is it the 12?"], st);
    expect(r.last).not.toMatch(/\$2\.50/);
    r = play("s67b-bus", ["Does this bus go to Old Town?", "Can I pay by card?", "Okay.", "Could you tell me when to get off?", "Thank you.", "Where do I get off?"], st);
    expect(r.last).toMatch(/this is your stop/);
  });
});

describe("s71a-rental", () => {
  const st = { hay: false, askSpell: false, askUpgrade: true, askPrepay: false, askExtras: false, tellSpot: false, freeUpgrade: false, firstNameTwist: false };
  const R = ["Hi, I have a reservation.", "It's Mikalauskas.", "Here you go."];
  it("prices: the upgrade's own rate; the compact's after a free upgrade; once per turn", () => {
    expect(play("s71a-rental", [...R, "How much is it?"], st).last).toMatch(/\$55 a day/);
    expect(play("s71a-rental", [...R, "How much is it per day?"], { ...st, freeUpgrade: true }).last).toMatch(/\$45 a day/);
    const r = play("s71a-rental", ["I'd like to rent a car.", "An SUV, please.", "How much is it for three days?"], st);
    expect((r.last.match(/\$75 a day/g) ?? []).length).toBe(1);
  });
});

describe("s71b-gas", () => {
  const st = { askExtras: false, askDebit: false, askReceipt: false, askAnything: false, oooTwist: false, troubleTwist: false };
  it("premium and diesel get their own prices", () => {
    const r = play("s71b-gas", ["How much is premium?", "How much is diesel?"], st);
    expect(r.said[0]).toMatch(/Premium is/);
    expect(r.said[1]).toMatch(/Diesel is/);
  });
  it("cash: exact money gets no change; too little pays nothing; more adds up", () => {
    let r = play("s71b-gas", ["Forty dollars on pump three, please.", "Here's forty dollars."], st);
    expect(r.s.paid).toBe(true);
    expect(r.last).not.toMatch(/change/);
    r = play("s71b-gas", ["Forty dollars on pump three, please.", "Here's twenty."], st);
    expect(r.s.paid).toBeFalsy();
    r = play("s71b-gas", ["Forty dollars on pump three, please.", "Here's twenty.", "Here's twenty more."], st);
    expect(r.s.paid).toBe(true);
  });
  it("a receipt asked before paying comes with the payment", () => {
    const r = play("s71b-gas", ["Forty dollars on pump three, please.", "Can I have a receipt?", "Card, please."], st);
    expect(r.said[1]).not.toMatch(/Here's your receipt/);
    expect(r.last).toMatch(/Here's your receipt/);
  });
});

describe("s72-cafe", () => {
  const st = { askMilk: true, askTemp: false, askName: false, askReceipt: false, outOfOat: false, cardDown: false };
  it("the restroom is in one place", () => {
    const r = play("s72-cafe", ["Where's the restroom?", "Sorry, where is the restroom?"], st);
    expect(r.all).not.toMatch(/by the window/);
  });
  it("“Keep the change” before the total pays nothing", () => {
    const r = play("s72-cafe", ["A medium latte with whole milk, please.", "Keep the change."], st);
    expect(r.s.paid).toBeFalsy();
  });
  it("an order after paying is paid (the extra alone), not free", () => {
    const r = play("s72-cafe", ["An espresso, please.", "No, that's all.", "For here.", "Card, please.", "Oh, and a croissant, please.", "Card, please."], st);
    expect(r.said[4]).toMatch(/\$3\.25/);
    expect(r.s.paid).toBe(true);
    expect(r.s.paidAmt).toBe(600);
  });
  it("taking back the only drink gets one reply", () => {
    const r = play("s72-cafe", ["A latte, please.", "Actually, no latte."], st);
    expect(r.last).not.toMatch(/Okay, no latte/);
    expect(r.last).toMatch(/instead/);
  });
});
