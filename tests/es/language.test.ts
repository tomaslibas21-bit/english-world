// The Spanish edition's language layer: numbers, pesos, times, days, letters, digits, normalisation and the composer.
// Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { EDITION } from "../../src/edition";
import { dateSlot, daySlot, digitsSlot, lettersSlot, priceSlot, readInt, timeSlot } from "../../src/convo/slots";
import { isConfirmation, surfaceTokens, tokenizeInput, tokenSimilarity } from "../../src/convo/normalize";
import { compose } from "../../src/convo/compose";
import { ent, t } from "../../src/content/dsl";
import type { EntityDef } from "../../src/content/types";

const toks = (s: string) => tokenizeInput(s).variants[0];
/** The value of the reading that takes every word. */
const whole = (fn: (tk: string[], pos: number, prefix: boolean) => { end: number; value: unknown }[], s: string) => {
  const tk = toks(s);
  return fn(tk, 0, false).filter((r) => r.end === tk.length).map((r) => r.value);
};

describe("the Spanish edition", () => {
  it("is the edition these tests run in", () => {
    expect(EDITION.id).toBe("es");
    expect(EDITION.target).toBe("es-MX");
  });
});

describe("numbers", () => {
  const n = (s: string) => readInt(toks(s), 0).filter((r) => r.end === toks(s).length).map((r) => r.value);
  it.each([
    ["treinta y cinco", 35], ["veintiún", 21], ["cien", 100], ["ciento veinte", 120], ["doscientos cincuenta", 250],
    ["mil quinientos", 1500], ["dos mil veintiséis", 2026], ["quince mil", 15000], ["15 mil", 15000], ["sinco", 5], ["cien mil", 100000],
  ])("%s = %d", (s, v) => expect(n(s as string)).toContain(v));
  it("doesn't read a half number", () => {
    expect(n("treinta y")).toEqual([]);
  });
});

describe("prices in pesos (cents)", () => {
  it.each([
    ["85 pesos", 8500], ["$85", 8500], ["$1,250", 125000], ["ochenta y cinco pesos", 8500], ["ochenta y cinco pesos con cincuenta", 8550],
    ["ochenta y cinco con cincuenta centavos", 8550], ["ochenta y cinco cincuenta", 8550], ["mil quinientos pesos", 150000],
    ["cincuenta centavos", 50], ["cien varos", 10000], ["85.50", 8550], ["veintiún pesos", 2100],
  ])("%s", (s, v) => expect(whole(priceSlot, s as string)).toContain(v));
});

describe("clock times", () => {
  it.each([
    ["las ocho y media", { h: 8, m: 30 }], ["la una", { h: 1, m: 0 }], ["las tres y cuarto", { h: 3, m: 15 }],
    ["cuarto para las ocho", { h: 7, m: 45 }], ["diez para las nueve", { h: 8, m: 50 }], ["las cinco menos cuarto", { h: 4, m: 45 }],
    ["las 7:30", { h: 7, m: 30 }], ["ocho treinta", { h: 8, m: 30 }], ["las ocho de la noche", { h: 8, m: 0, ampm: "pm" }],
    ["mediodía", { h: 12, m: 0, ampm: "pm" }], ["las ocho en punto", { h: 8, m: 0 }],
  ])("%s", (s, v) => expect(whole(timeSlot, s as string)).toContainEqual(v));
});

describe("days and dates", () => {
  it.each([["el viernes", "friday"], ["mañana", "tomorrow"], ["pasado mañana", "day_after_tomorrow"], ["el próximo lunes", "monday"],
    ["esta noche", "tonight"], ["la semana que viene", "next_week"]])("%s", (s, v) => expect(whole(daySlot, s)).toContain(v));
  it.each([["el cuatro de junio", { day: 4, month: 6 }], ["el primero de mayo", { day: 1, month: 5 }], ["15 de septiembre", { day: 15, month: 9 }]])(
    "%s", (s, v) => expect(whole(dateSlot, s as string)).toContainEqual(v));
});

describe("spelled letters and phone digits", () => {
  it("letter names", () => {
    expect(whole(lettersSlot, "eme i ele ele e erre")).toContain("miller");
    expect(whole(lettersSlot, "doble ve a te te")).toContain("watt");
    expect(whole(lettersSlot, "be de burro ere a de i")).toContain("bradi");
  });
  it("digits, in pairs as Mexicans say them", () => {
    expect(whole(digitsSlot, "noventa y ocho cuarenta y cinco doce")).toContain("984512");
    expect(whole(digitsSlot, "nueve nueve ocho")).toContain("998");
  });
});

describe("normalising what the learner said", () => {
  it("drops 'por favor' and records it", () => {
    const r = tokenizeInput("Un café, por favor.");
    expect(r.variants[0]).toEqual(["un", "cafe"]);
    expect(r.please).toBe(true);
    expect(tokenizeInput("Por favor.").variants[0]).toEqual(["si"]);
  });
  it("sees a 'No,' answer apart from a negated verb", () => {
    expect(tokenizeInput("¡No, gracias!").noPause).toBe(true);
    expect(tokenizeInput("No quiero leche").noPause).toBe(false);
  });
  it("folds accents and reads $ as pesos", () => {
    expect(surfaceTokens("¿Cuánto cuesta? $45")).toEqual(["cuanto", "cuesta", "45", "pesos"]);
  });
  it("hears the same sounds spelled differently, never a negation", () => {
    expect(tokenSimilarity("baso", "vaso")).toBeGreaterThan(0.9);
    expect(tokenSimilarity("serbesa", "cerveza")).toBeGreaterThan(0.9);
    expect(tokenSimilarity("ola", "hola")).toBeGreaterThan(0.9);
    expect(tokenSimilarity("quiere", "quiero")).toBeGreaterThan(0.8);
    expect(tokenSimilarity("la", "el")).toBeGreaterThan(0.8);
    expect(tokenSimilarity("no", "nunca")).toBe(0);
    expect(tokenSimilarity("sin", "con")).toBe(0);
  });
  it("a plain yes, in Spanish or the learner's English", () => {
    expect(isConfirmation("Sí, por favor")).toBe(true);
    expect(isConfirmation("Claro")).toBe(true);
    expect(isConfirmation("yes", true)).toBe(true);
    expect(isConfirmation("No")).toBe(false);
  });
});

describe("composing Spanish lines with English glosses", () => {
  const E: EntityDef[] = [
    ent("latte", "latte", "latte", "m", { pl: "lattes" }),
    ent("horchata", "horchata", "horchata", "f"),
    ent("agua", "agua", "water", "f", { art: "un", def: "el" }),
    ent("leche", "leche", "milk", "f", { art: "" }),
    ent("grande", "grande", "large", "m"),
    ent("chico", "chico", "small", "m"),
    ent("con_hielo", "con | hielo", "with | ice", "m"),
  ];
  const look = (id: string) => E.find((e) => e.id === id);
  const c = (src: ReturnType<typeof t>, vars: Record<string, unknown>, formal = true) => compose(src, vars, { look, addressee: "f", speaker: "m", formal });

  it("articles, gender and agreement follow the Spanish noun", () => {
    const s = t("Quiero | {X.np}.", "I want | {X.np}.", "I want {X.np}.");
    expect(c(s, { X: "horchata" }).en).toBe("Quiero una horchata.");
    expect(c(s, { X: { id: "horchata", mods: ["chico"] } }).en).toBe("Quiero una horchata chica.");
    expect(c(s, { X: { id: "latte", mods: ["grande"], qty: 2 } }).en).toBe("Quiero dos lattes grandes.");
    expect(c(s, { X: "agua" }).en).toBe("Quiero un agua.");
    expect(c(s, { X: "leche" }).en).toBe("Quiero leche.");
    const big = c(s, { X: { id: "latte", mods: ["grande", "con_hielo"] } });
    expect(big.en).toBe("Quiero un latte grande con hielo.");
    expect(big.units.map((u) => u.lt)).toEqual(["I want", "a", "latte", "large", "with", "ice."]);
    expect(big.nat).toBe("I want a large latte with ice.");
    expect(c(t("{X.the}, | por favor.", "{X.the}, | please.", "{X.the}, please."), { X: "agua" }).en).toBe("El agua, por favor.");
  });

  it("usted or tú, the learner's gender, and agreement written into the line", () => {
    const s = t("¿Qué | {u:le|t:te} | sirvo?", "What | (to) you | I-serve?", "What can I get you?");
    expect(c(s, {}, true).en).toBe("¿Qué le sirvo?");
    expect(c(s, {}, false).en).toBe("¿Qué te sirvo?");
    expect(c(t("¿{m:Listo|f:Lista}?", "Ready?", "Ready?"), {}).en).toBe("¿Lista?");
    expect(c(t("¿{lo@X} | quiere | {frío@X}?", "It | you-want | cold?", "Do you want it cold?"), { X: "horchata" }).en).toBe("¿La quiere fría?");
  });

  it("pesos and times are written and said the Mexican way", () => {
    const p = c(t("Son | {$price}.", "That's | {$price}.", "That's {$price}."), { price: 8550 });
    expect(p.en).toBe("Son $85.50.");
    expect(p.nat).toBe("That's 85.50 pesos.");
    expect(p.say).toBe("Son ochenta y cinco pesos con cincuenta centavos.");
    expect(c(t("Son | {$price}.", "That's | {$price}.", "That's {$price}."), { price: 2100 }).say).toBe("Son veintiún pesos.");
    const h = c(t("A | {$time}.", "At | {$time}.", "At {$time}."), { time: { h: 20, m: 30 } });
    expect(h.en).toBe("A las 8:30.");
    expect(h.say).toBe("A las ocho y media.");
    expect(c(t("A | {$time}.", "At | {$time}.", "At {$time}."), { time: { h: 13, m: 0 } }).say).toBe("A la una.");
  });
});
