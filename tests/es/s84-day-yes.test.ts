// "¿Qué tal el sábado? ¿Tienes tiempo?" — a yes takes the day at once, in every Spanish (owner, 15 Nov 2026, from
// Maple Harbor: "Sure, that works" and "Yes, I'm free" got the question again; "What… Yes" got "Sure!" and it again).
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";
import { Conversation } from "../../src/convo/dialogue";
import { setKnownNames } from "../../src/convo/slots";

setKnownNames(["Tomas", "Mikalauskas"]);

function play(turns: string[], set: Record<string, any> = {}, seed = 3) {
  const sit = SITUATION_BY_ID["s84-date"];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, set); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: 1, seed, memory: {} });
  conv.start();
  const said = turns.map((t) => conv.input(t).lines.map((l: any) => l.sentence.en.replace(/ \| /g, " ")).join(" "));
  return { s: (conv as any).s, said, last: said.at(-1) ?? "" };
}

const ST = { opening: "meet", topics: [], askDrinks: false, askCheck: false, quick: false, busySat: false, coldTwist: false, likeJobQ: false };
const TO_DAY = ["¡Hola! ¡Qué gusto conocerte!", "Yo también la pasé muy bien", "¡Me encantaría!"];

describe("Puerto Colibrí s84: a yes to “¿Tienes tiempo?” takes the day", () => {
  for (const yes of ["Sí, estoy libre.", "Claro, me va bien.", "Sí.", "Claro, me queda bien.", "Sí, sí, estoy libre.", "¿Qué? Sí.", "Qué sí", "Sí, perfecto.", "Vale, me viene bien."]) {
    it(`“${yes}” takes Saturday at once`, () => {
      const r = play([...TO_DAY, yes], ST);
      expect(r.said[2], r.said.join(" / ")).toMatch(/sábado/);
      expect(r.s.dayAgreed, r.said.join(" / ")).toBe(true);
      expect(r.s.day).toBe("saturday");
      expect(r.last).not.toMatch(/¿Estás libre|¿Tienes tiempo|^¡Claro!|^Claro\./);
    });
  }
  it("after a no to Saturday, a yes to Sunday takes Sunday", () => {
    for (const yes of ["Sí, estoy libre.", "Claro, me va bien.", "¿Qué? Sí.", "Sí."]) {
      const r = play([...TO_DAY, "Lo siento, estoy ocupado", yes], ST);
      expect(r.said[3], r.said.join(" / ")).toMatch(/domingo/);
      expect(r.s.dayAgreed, `${yes}: ${r.said.join(" / ")}`).toBe(true);
      expect(r.s.day).toBe("sunday");
    }
  });
  it("“¿Qué?” alone still gets the question again", () => {
    const r = play([...TO_DAY, "¿Qué?"], ST);
    expect(r.s.dayAgreed).toBeFalsy();
    expect(r.last).toMatch(/sábado/);
  });
});

describe("Puerto Colibrí s81: a yes to “Lo dejo pasar con mi llave. ¿Le parece bien?” is taken", () => {
  it("“Sí, está bien”, “Sí, me va bien”, “Sí, estoy en casa” settle the visit (not the question again)", () => {
    const sit = SITUATION_BY_ID["s81-apartment"];
    for (const yes of ["Sí, está bien.", "Claro, me va bien.", "Sí.", "Sí, estoy libre.", "¿Qué? Sí."]) {
      const def = { ...sit, init: (c: any) => { sit.init?.(c); c.s.mode = "problem"; } };
      const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" }, visits: 1, seed: 1, memory: {} });
      conv.start();
      const said = ["¡Hola, Don Ernesto!", "Perdón que lo moleste, pero la llave de la cocina gotea.", "No, voy a estar trabajando.", yes]
        .map((t) => conv.input(t).lines.map((l: any) => l.sentence.en.replace(/ \| /g, " ")).join(" "));
      expect(said[2], yes).toMatch(/¿Le parece bien\?/);
      expect((conv as any).s.visitOk, `${yes}: ${said.join(" / ")}`).toBe(true);
      expect(said[3], yes).not.toMatch(/¿Le parece bien\?/);
    }
  });
});
