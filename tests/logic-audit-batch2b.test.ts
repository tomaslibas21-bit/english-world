// Logic bugs the Spanish edition's dialogue audit (5 Nov 2026, batch 2: s69, s73–s82) found and that Maple Harbor's
// originals had too: money or a booking on a bare or polite yes, a question taken as a yes, a charge missing or
// repeated, questions asked again, side questions answered wrongly or not at all, the wrong speaker answering.
// Each bug is played through the dialogue engine; what the NPC says back (and never says) is checked.
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
  const who: string[][] = [];
  const events: any[] = [];
  for (const t of turns) {
    const o = conv.input(t);
    said.push(o.lines.map((l: any) => l.sentence.en).join(" "));
    who.push(o.lines.map((l: any) => l.npc));
    events.push(...o.events);
  }
  const c = conv as any;
  return { conv, s: c.s, said, who, first, last: said.at(-1) ?? "", all: [first, ...said].join(" "), events, pending: c.pending?.id as string | undefined };
}
const pays = (events: any[]) => events.filter((e) => e.name === "pay").map((e) => e.data?.amount);

describe("s69-local", () => {
  it("“No, thanks” to “What do you feel like?” gets her pick, not the same question again", () => {
    const r = play("s69-local", ["Can you recommend a place to eat?", "No, thanks."]);
    expect(r.last).not.toMatch(/What kind of food/);
    expect(r.last).toMatch(/how about this/);
  });
  it("Lucia's takes reservations (as the host in s73 asks), the bus and the way are answered", () => {
    expect(play("s69-local", ["Can you recommend a place to eat?", "Italian", "Do I need to book?"]).last).not.toMatch(/don't take reservations/);
    expect(play("s69-local", ["What should I see while I'm here?", "Where do I catch the bus?"]).last).toMatch(/bus number three/);
    expect(play("s69-local", ["Can you recommend a place to eat?", "Seafood", "Where is The Pier?"]).last).toMatch(/Harbor Road/);
    expect(play("s69-local", ["Hi!", "Where's a nice place to watch the sunset?"]).last).toMatch(/lighthouse/);
  });
});

describe("s73-restaurant", () => {
  const st = { wrongTwist: false, soupTwist: false };
  const B = ["Hi! I have a reservation for two at seven.", "It's under Tomas.", "A lemonade and a glass of red wine, please.", "Thank you!"];
  const M = [...B, "I'll have the lasagna, please.", "Thank you!", "Thank you!", "Everything is delicious, thank you!", "Thank you!", "No, thanks."];
  it("“A dessert, please” at the dessert question gets the list", () => {
    for (const t of ["A dessert, please.", "Yes, a dessert.", "Dessert."]) expect(play("s73-restaurant", [...M, t], st).last).toMatch(/tiramisu/);
  });
  it("“Do you take cards?” during the meal doesn't bring the check unasked (and dessert is still offered)", () => {
    const r = play("s73-restaurant", [...B, "Do you take cards?", "I'll have the lasagna, please.", "Thank you!", "Thank you!", "Everything is delicious, thank you!", "Thank you!"], st);
    expect(r.all).not.toMatch(/bring the check right over/);
    expect(r.s.checkAsked).toBeFalsy();
  });
  it("“How much is the water?” → “Which one?” → “Sparkling.” is its price, nothing ordered", () => {
    const r = play("s73-restaurant", ["Hi! I have a reservation for two at seven.", "It's under Tomas.", "How much is the water?", "Sparkling."], st);
    expect(r.last).toMatch(/^It's \$4\./);
    expect(r.s.items.length).toBe(0);
    expect(play("s73-restaurant", ["Hi! I have a reservation for two at seven.", "It's under Tomas.", "How much is the coffee?"], st).last).toMatch(/^It's \$3\./);
  });
});

describe("s74-clothes", () => {
  const st = { returnVisit: false, askBag: true, askRewards: false, askColor: false };
  const R = ["Hi, I'd like to return this jacket.", "Yes, here it is.", "It has a hole.", "I'd like to exchange it."];
  const SH = ["Hi! I'm looking for a jacket.", "Medium, please.", "Yes, please."];
  it("the exchange: “A different size / color”, “I want another size”, “The same one” are answered (they looped)", () => {
    expect(play("s74-clothes", [...R, "A different size."], st).last).toMatch(/What size would you like instead/);
    expect(play("s74-clothes", [...R, "Another size, please."], st).last).toMatch(/What size would you like instead/);
    expect(play("s74-clothes", [...R, "I want another size."], st).last).not.toMatch(/Same style/);
    expect(play("s74-clothes", [...R, "A different color."], st).last).toMatch(/Which color would you like instead/);
    expect(play("s74-clothes", [...R, "The same one."], st).last).toMatch(/new one in the same size/);
  });
  it("“I changed my mind” while shopping is not taking it (it started a return)", () => {
    const r = play("s74-clothes", [...SH, "It fits perfectly.", "I changed my mind."], st);
    expect(r.s.mode).not.toBe("return");
    expect(r.last).not.toMatch(/receipt/);
  });
  it("her opinion, “So-so”, the receipt by name, “Do you have bags?”, the total", () => {
    expect(play("s74-clothes", [...SH, "Does it look good on me?"], st).last).toMatch(/suits you|looks/);
    expect(play("s74-clothes", [...SH, "So-so."], st).last).not.toMatch(/sorry to hear/);
    expect(play("s74-clothes", [...SH, "It fits perfectly.", "I'll take it.", "Card, please.", "No, thanks.", "The receipt, please."], st).last).toMatch(/Here's your receipt/);
    expect(play("s74-clothes", [...SH, "It fits perfectly.", "I'll take it.", "Card, please.", "Do you have bags?"], st).last).not.toMatch(/don't carry/);
    expect(play("s74-clothes", [...SH, "It fits perfectly.", "I'll take it.", "How much do I owe you?"], st).last).toMatch(/\$63\.59/);
  });
  it("one question at a time; “I want to see something else” isn't “we don't carry that”", () => {
    expect(play("s74-clothes", ["Hi! I'm looking for a jacket.", "Medium, please.", "No, thanks.", "It fits perfectly.", "No, thanks.", "Yes."], st).last).toBe("Sure! What would you like to see?");
    expect(play("s74-clothes", ["Hi! I'm looking for a jacket.", "I want to see something else."], st).last).not.toMatch(/don't carry/);
    expect(play("s74-clothes", ["No, I'm here to buy something."], { ...st, returnVisit: true }).last).toMatch(/How can I help you/);
    expect(play("s74-clothes", ["Hi! I'm looking for a jacket.", "Medium, please.", "I don't mind."], { ...st, askColor: true }).last).toMatch(/We have it in/);
  });
});

describe("s75-pharmacy", () => {
  const q = { askWho: false, askHowLong: false, askMeds: false, askAllergy: false, askMore: false, askBag: false, volunteer: false, storeBrand: false, rxPrompt: false };
  it("no ibuprofen after an aspirin allergy or with blood-pressure pills or antidepressants", () => {
    let r = play("s75-pharmacy", ["I have a headache.", "I'm allergic to aspirin.", "No, thanks."], q);
    expect(r.last).not.toMatch(/ibuprofen/);
    r = play("s75-pharmacy", ["I have a headache.", "I'm allergic to aspirin.", "Can I have ibuprofen instead?"], q);
    expect(r.last).toMatch(/acetaminophen instead/);
    expect(r.s.product).not.toBe("ibuprofen");
    for (const t of ["I take blood pressure pills.", "I take antidepressants.", "I take heart medicine."]) {
      r = play("s75-pharmacy", ["I have a headache.", t], q);
      expect(r.last).toMatch(/acetaminophen instead/);
    }
    r = play("s75-pharmacy", ["I have a headache.", "Okay, I'll try it.", "Oh, but I'm allergic to ibuprofen."], q);
    expect(r.s.product).toBe("acetaminophen");
  });
  it("an acetaminophen allergy: ibuprofen for a fever", () => {
    const r = play("s75-pharmacy", ["I have a fever.", "I'm allergic to acetaminophen."], q);
    expect(r.last).toMatch(/ibuprofen/);
  });
  it("sunscreen for kids is no dose by weight; “So-so” gets the directions; the receipt isn't “we don't have that”", () => {
    expect(play("s75-pharmacy", ["Do you have sunscreen?", "Is it okay for kids?"], q).last).not.toMatch(/weight/);
    expect(play("s75-pharmacy", ["Have you got any paracetamol?", "So-so."], q).last).toMatch(/every six hours/);
    expect(play("s75-pharmacy", ["I have a headache.", "Okay, I'll try it.", "Card, please.", "Can I have the receipt?"], q).last).not.toMatch(/don't have that/);
    expect(play("s75-pharmacy", ["I have a headache.", "I don't know."], { ...q, askMeds: true }).last).toMatch(/acetaminophen/);
    expect(play("s75-pharmacy", ["Hi!", "Do you have something natural?"], q).last).toMatch(/symptoms/);
  });
});

describe("s76-dentist-call", () => {
  const st = { moveTwist: false, askPainLen: false, askHold: false, badLineAt: null, spellOnMove: false };
  const B = ["Hi, I'd like to make an appointment for a checkup.", "No, I've been there before.", "Tomas Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S.", "June 4th, 1990."];
  it("a question books nothing: “Tuesday?” gets the offer again", () => {
    let r = play("s76-dentist-call", [...B, "Tuesday?"], st);
    expect(r.s.appt).toBeFalsy();
    expect(r.last).toMatch(/^So, Tuesday at 10:00\?/);
    r = play("s76-dentist-call", [...B, "Tuesday?", "Yes."], st);
    expect(r.s.appt).toBeTruthy();
  });
  it("“That works, but…” with a change books nothing yet", () => {
    let r = play("s76-dentist-call", [...B, "That works, but could we do Wednesday instead?"], st);
    expect(r.s.appt).toBeFalsy();
    expect(r.last).toMatch(/Wednesday/);
    r = play("s76-dentist-call", [...B, "Yes, that works, but do you have anything earlier?"], st);
    expect(r.s.appt).toBeFalsy();
  });
  it("“Maybe.”, “What time?”, “What time is my appointment?”, “Yes, one question.”", () => {
    expect(play("s76-dentist-call", [...B, "Maybe."], st).s.appt).toBeFalsy();
    expect(play("s76-dentist-call", [...B, "What time?"], st).last).toMatch(/Tuesday at 10:00/);
    expect(play("s76-dentist-call", [...B, "That works for me.", "What time is my appointment?"], st).last).toMatch(/Tuesday at 10:00/);
    expect(play("s76-dentist-call", [...B, "That works for me.", "Yes, one question."], st).last).toMatch(/what can I do for you/);
  });
});

describe("s77-salon", () => {
  const st = { askDrink: false, askLayers: false, askBangs: false, askWash: true, askDry: true, askBook: true, tooShort: false, walkinWait: false };
  const W = ["Hi! I have an appointment at three.", "It's Tomas.", "Just a trim, please.", "Just an inch."];
  const D = [...W, "No, thanks.", "No, thanks."];
  const R = [...D, "No, thanks."];
  it("“That's fine, thanks” / “I'm good, thanks” at a paid extra is a no (it was “Sounds good.” and the question again)", () => {
    expect(play("s77-salon", [...W, "That's fine, thanks."], st).s.wash).toBe(false);
    expect(play("s77-salon", [...D, "That's fine, thanks."], st).s.blowdry).toBe(false);
    expect(play("s77-salon", [...D, "I'm good, thanks."], st).s.blowdry).toBe(false);
  });
  it("the price at the wash is the extra's; “Is it extra?” is answered", () => {
    expect(play("s77-salon", [...W, "How much is it?"], st).last).not.toMatch(/A cut is/);
    expect(play("s77-salon", [...W, "Is it extra?"], st).last).toMatch(/five dollars extra/);
  });
  it("the twist: a bare yes, “Yes, a little”, “Oh no!”, “It doesn't matter” all get the apology and the $10 off", () => {
    for (const t of ["Yes.", "Yes, a little.", "Oh no!", "It doesn't matter."]) {
      const r = play("s77-salon", [...R, t], { ...st, tooShort: true });
      expect(r.s.discount).toBe(true);
      expect(r.last).toMatch(/\$25/);
    }
  });
  it("a length past the list isn't said wrong (“Thirty centimeters” → “20 centimeters?”)", () => {
    expect(play("s77-salon", [...W.slice(0, 3), "Thirty centimeters."], st).last).not.toMatch(/20 centimeters/);
    expect(play("s77-salon", [...W.slice(0, 3), "Ten inches."], st).last).not.toMatch(/8 inches/);
  });
});

describe("s78-bank", () => {
  const st = { customer: false, cardTwist: false, hay: null, idProofTogether: false, offerSavings: false, offerApp: false, extraInfo: "none", slowTwist: false, askPin: false, offerCash: true, askBills: true };
  const O = ["Hi! I need a bank account.", "Checking.", "Here you go.", "I have a bank statement.", "Not yet.", "Where do I sign?", "Okay, I signed it.", "Two hundred."];
  it("“Is it free?” at the savings offer, the app or the exchange is their price, not the checking fee", () => {
    expect(play("s78-bank", [...O, "Is it free?"], { ...st, offerSavings: true }).last).toMatch(/no monthly fee/);
    expect(play("s78-bank", [...O, "Is it free?"], { ...st, offerApp: true }).last).toMatch(/app is free/);
    expect(play("s78-bank", ["Hi! Could I exchange some euros?", "Is it free?"], st).last).toMatch(/\$5 fee/);
  });
  it("no loop at “How can I help you?”; one goodbye after “Thanks, that's all”", () => {
    let r = play("s78-bank", ["Hello!", "No, thanks."], st);
    expect(r.conv.ended).toBe(true);
    r = play("s78-bank", ["Hi! Could I exchange some euros?", "No, thanks.", "Thanks, that's all."], st);
    expect(r.conv.ended).toBe(true);
    expect(r.last).not.toMatch(/My pleasure/);
  });
  it("a typed “A hundred?” at an amount moves no money", () => {
    const r = play("s78-bank", ["Hi! Could I exchange some euros?", "A hundred?"], { ...st, customer: true });
    expect(r.s.exchange).not.toBe("done");
    expect(r.events.some((e) => e.name === "give")).toBe(false);
  });
  it("“What is that?” at the proof of address isn't the Social Security number; “The first one” is checking", () => {
    expect(play("s78-bank", ["Hi! I need a bank account.", "Checking.", "Here you go.", "What is that?"], st).last).not.toMatch(/nine-digit/);
    expect(play("s78-bank", ["Hi! I need a bank account.", "The first one."], st).s.type).toBe("checking");
  });
});

describe("s79-post", () => {
  const st = { profile: 0, pickupTwist: false, returnTwist: false, askGift: true, askInsurance: true, offerStamps: true, askPay: true, trackTip: false };
  const A = ["Hi! I'd like to send this package to Lithuania.", "No, just a scarf, chocolate and tea."];
  const P = [...A, "Priority, please.", "It's a scarf and some chocolate.", "About fifty dollars.", "Yes, it's a gift for my mom.", "Sure."];
  it("insurance only on a clear yes at its offer", () => {
    expect(play("s79-post", [...A, "Priority, please.", "It's a scarf and some chocolate.", "About fifty dollars.", "Yes, just in case."], st).s.insurance).not.toBe(true);
    expect(play("s79-post", [...P, "That's fine, thanks."], st).s.insurance).toBe(false);
    let r = play("s79-post", [...P, "Okay, thanks."], st);
    expect(r.s.insurance).not.toBe(true);
    expect(r.last).toMatch(/extra insurance/);
    r = play("s79-post", [...P, "Okay, thanks.", "Yes, please."], st);
    expect(r.s.insurance).toBe(true);
  });
  it("the stamps' price is answered (nothing bought), stamps after paying are charged", () => {
    let r = play("s79-post", [...P, "No, thanks.", "How much are five stamps?"], st);
    expect(r.last).toMatch(/\$1\.75 each/);
    expect(r.s.stampQty).toBeFalsy();
    r = play("s79-post", [...P, "No, thanks.", "No, thanks.", "Card, please.", "Could I also get some stamps for postcards?", "Five, please.", "Card, please."], st);
    expect(pays(r.events)).toEqual([7640, 875]);
    expect(r.last).toMatch(/your stamps/);
  });
  it("no “How would you like to pay?” after “I'll pay cash”; “Thanks, that's all” closes", () => {
    let r = play("s79-post", [...A, "Priority, please.", "I'll pay cash.", "It's a scarf and some chocolate.", "About fifty dollars.", "Yes, it's a gift for my mom.", "Sure.", "No, thanks.", "No, thanks."], st);
    expect(r.last).not.toMatch(/How would you like to pay/);
    r = play("s79-post", [...P, "No, thanks.", "No, thanks.", "Card, please.", "Thanks, that's all."], st);
    expect(r.s.moreDone).toBe(true);
  });
});

describe("s80-support-call", () => {
  const st = { longHold: false, chargeTwist: false, badLine: false, askSince: false, menuSales: false, firstWindow: "thu_am" };
  const K = ["Technical support.", "Hi, my name is Tomas Mikalauskas.", "My account number is 742-9133.", "My internet stopped working yesterday."];
  it("the recorded menu only routes: nothing of Claire's in its voice, Claire not on before routing", () => {
    for (const t of ["My account number is 742-9133.", "Can you hear me?", "Thank you.", "I don't know.", "How are you?", "I've been waiting for twenty minutes."]) {
      const r = play("s80-support-call", [t], st);
      expect(r.who[0].every((n) => n === "netwave_bot")).toBe(true);
      expect(r.last).toMatch(/For billing/);
    }
    const r = play("s80-support-call", ["Technical support. The light is blinking red."], st);
    expect(r.last).not.toMatch(/no signal/);
  });
  it("“I don't know” goes on; the visit's time and price are answered", () => {
    expect(play("s80-support-call", [...K, "I don't know."], st).last).toMatch(/restarting/);
    expect(play("s80-support-call", [...K, "The light is blinking red.", "I don't know."], st).last).toMatch(/unplug/);
    const B = [...K, "The light is blinking red.", "Yes, I tried that three times.", "That works for me."];
    expect(play("s80-support-call", [...B, "What time will the technician come?"], st).last).toMatch(/call you 30 minutes/);
    expect(play("s80-support-call", [...B, "How much is it?"], st).last).toMatch(/no charge/);
  });
});

describe("s81-apartment", () => {
  const st = { mode: "view", greetKind: "help", tourExtra: false, askMovein: false, askPeople: false, askPets: false, askDocs: true, otherApplicant: false };
  const D = ["Hi, I'm here to see the apartment.", "How much is the rent?", "No, that's all, thanks."];
  it("a polite “That's fine, thanks” / “Okay, thanks” or “I love it” doesn't rent the apartment; a yes then does", () => {
    for (const t of ["That's fine, thanks.", "Okay, thanks.", "I really like it.", "I love it."]) {
      const r = play("s81-apartment", [...D, t], st);
      expect(r.s.decision).not.toBe("take");
      expect(r.last).toMatch(/are you interested/);
    }
    expect(play("s81-apartment", [...D, "I love it.", "Yes."], st).s.decision).toBe("take");
    expect(play("s81-apartment", [...D, "Okay, thanks.", "Okay, thanks."], st).s.decision).toBe("think");
  });
  it("“I'm interested, how much is the rent?” is the question", () => {
    const r = play("s81-apartment", ["Hi, I'm here to see the apartment.", "I'm interested, how much is the rent?"], st);
    expect(r.s.decision).toBeUndefined();
    expect(r.last).toMatch(/\$1,400 a month/);
  });
});

describe("s82-neighbor", () => {
  const st = { known: false, askFrom: true, askLike: true, coffeeInvite: true, complaint: false, pkgTwist: false };
  const cp = { ...st, known: true, askFrom: false, askLike: false, coffeeInvite: false, complaint: true };
  it("the complaint: “Sure, no worries” accepts; “What time?” / “My music?” keep it (not yes to coffee)", () => {
    expect(play("s82-neighbor", ["Hi, Rita!", "Sure, no worries."], cp).s.complaintDone).toBe(true);
    let r = play("s82-neighbor", ["Hi, Rita!", "What time?"], cp);
    expect(r.last).toMatch(/last night/);
    expect(r.s.complaintDone).toBeFalsy();
    r = play("s82-neighbor", ["Hi, Rita!", "My music?"], cp);
    expect(r.last).toMatch(/turn it down/);
  });
  it("no “I'm so glad!” to an invitation not made; the key after “I don't know yet”; a goodbye completes the favor", () => {
    const T = ["Hi! I'm Tomas. I just moved in next door.", "I'm from Lithuania.", "I love it.", "Where does the trash go?"];
    expect(play("s82-neighbor", [...T, "Yes, should I bring anything?"], st).last).not.toMatch(/glad/);
    const p = { ...st, askFrom: false, askLike: false, coffeeInvite: false };
    expect(play("s82-neighbor", ["Hi, I'm your new neighbor.", "Could you water my plants while I'm on vacation?", "I don't know yet."], p).last).toMatch(/key/);
    const r = play("s82-neighbor", ["Hi, I'm your new neighbor.", "Could you water my plants while I'm on vacation?", "Bye!"], p);
    expect(r.conv.completed).toBe(true);
  });
});
