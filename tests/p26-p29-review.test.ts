// P26 (the fridge complaint) and P29 (the landlord): regressions from the max-effort review of 27 Oct 2026 that
// the situations' own NLU tests and sims can't show (what the NPC says back, and what it never says).
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { setKnownNames } from "../src/convo/slots";

setKnownNames(["Tomas", "Mikalauskas"]);

function play(id: string, turns: string[], set: Record<string, any> = {}, seed = 1) {
  const sit = SITUATION_BY_ID[id];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, set); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: 0, seed, memory: {} });
  conv.start();
  const said: string[] = [];
  const outs: any[] = [];
  for (const t of turns) {
    const o = conv.input(t);
    outs.push(o);
    said.push(o.lines.map((l: any) => l.sentence.en).join(" "));
  }
  return { conv, said, outs, last: said.at(-1) ?? "" };
}

const P26 = ["Hi, I'd like to make a complaint. My new fridge stopped working.", "It's Tomas Mikalauskas."];
const P26B = [...P26, "Could I speak to your manager, please?", "Sure."];

describe("p26-complaint review fixes", () => {
  it("a deadline with “by” never hangs up the call", () => {
    let r = play("p26-complaint", [...P26, "I want a refund by Monday at the latest."], { pluggedTwist: false }, 2);
    expect(r.conv.ended).toBe(false);
    expect(r.conv.s.deadline).toBe("monday");
    expect(r.last).toMatch(/speak to my manager/);
    r = play("p26-complaint", [...P26B, "No, thank you. I'd like a full refund.", "By Monday at the latest."], { pluggedTwist: false, offerKind: "visit" }, 2);
    expect(r.conv.ended).toBe(false);
    expect(r.last).toMatch(/By Monday\?/);
    expect(r.last).not.toMatch(/reference number/);
  });
  it("“Refund or replacement?” is never asked after the remedy is approved", () => {
    const r = play("p26-complaint", [...P26B, "I don't want a new fridge, I want my money back.", "I'd like this resolved by Friday.", "Can I have that in writing?"],
      { pluggedTwist: false, offerKind: "coupon" }, 2);
    expect(r.conv.s.remedy).toBe("refund");
    for (const s of r.said.slice(-3)) expect(s).not.toMatch(/refund or a replacement/);
    expect(r.conv.pending?.id).not.toBe("refund_or");
  });
  it("“No, it isn't” to “Is it plugged in?” gets a reaction, then the call goes on", () => {
    const r = play("p26-complaint", ["Hi, I'd like to make a complaint. My new fridge stopped working.", "No, it isn't.", "It still doesn't work."], { pluggedTwist: true });
    expect(r.said[1]).toMatch(/plug it in|try that/);
    expect(r.said[1]).not.toMatch(/just had to ask/);
    expect(r.said[2]).toMatch(/Still nothing\?/);
    for (const t of ["Yes, I checked twice.", "I already did that."]) {
      const q = play("p26-complaint", ["Hi, I'd like to make a complaint. My new fridge stopped working.", t], { pluggedTwist: true });
      expect(q.outs[1].understood).toBe(true);
      expect(q.last).toMatch(/just had to ask/);
    }
  });
});

const P29 = ["Hi, Mr. Patel! The heating isn't working.", "It's been broken for a week.", "According to the lease, repairs are your responsibility.",
  "I'm sorry, but that's not what we agreed.", "When can someone come out?"];
const S29 = { thermoQ: false, homeQ: false, twist: null };

describe("p29-landlord review fixes", () => {
  it("“By Saturday.” and “by Friday” are a day, never a goodbye", () => {
    let r = play("p29-landlord", [...P29, "By Saturday."], S29);
    expect(r.last).not.toMatch(/Wait, wait/);
    expect(r.conv.s.date).toBe("saturday");
    r = play("p29-landlord", [...P29, "I need it fixed by Friday."], S29);
    expect(r.last).not.toMatch(/Wait, wait/);
    expect(r.conv.s.date).toBe("friday");
  });
  it("a day repeated only to refuse it never books it", () => {
    for (const seed of [1, 2, 3, 4]) {
      for (const t of ["Wednesday? No way.", "wednesday no way", "Next Wednesday? Are you kidding?", "Wednesday? It's freezing!", "Next Wednesday? That's too late."]) {
        const r = play("p29-landlord", [...P29, t], S29, seed);
        expect(r.last, `${t} (seed ${seed})`).not.toMatch(/Great\. Next Wednesday/);
        expect(r.conv.s.date, t).toBeUndefined();
        expect(r.last, t).toMatch(/Friday morning/);
      }
    }
    const r = play("p29-landlord", [...P29, "Next week is too late.", "Friday? That's still too late."], S29);
    expect(r.outs[6].understood).toBe(true);
    expect(r.last).toMatch(/Friday is the best I can do/);
    expect(r.conv.s.date).toBeUndefined();
  });
  it("he restates the duration only when it is a week", () => {
    for (const t of ["Five days.", "Since the weekend."]) {
      const r = play("p29-landlord", ["Hi, Mr. Patel! The heating isn't working.", t], { thermoQ: false, twist: null });
      expect(r.last, t).not.toMatch(/A week\?/);
    }
    const r = play("p29-landlord", ["Hi, Mr. Patel! The heating isn't working.", "It's broken a week."], { thermoQ: false, twist: null });
    expect(r.last).toMatch(/A week\?/);
    expect(r.outs[1].tips.map((t: any) => t.key)).toContain("tense_since");
  });
  it("one reaction per turn", () => {
    let r = play("p29-landlord", [...P29, "That's too late. Could he come sooner?"], S29);
    expect(r.last).not.toMatch(/best I can do/);
    r = play("p29-landlord", [...P29, "Friday is fine.", "No, that's all.", "Can I get a discount for this week?"], S29);
    expect(r.last).not.toMatch(/best I can do/);
  });
  it("a misheard name and “What's a thermostat?” are understood", () => {
    let r = play("p29-landlord", ["Mr. Petal, the heating isn't working."], { twist: null });
    expect(r.outs[0].understood).toBe(true);
    expect(r.conv.s.problem).toBe(true);
    r = play("p29-landlord", ["Hi, Mr. Patel! The heating isn't working.", "What's a thermostat?"], { thermoQ: true, twist: null });
    expect(r.said[1]).toMatch(/little box on the wall/);
  });
});
