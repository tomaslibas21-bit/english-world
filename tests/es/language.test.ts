// The Spanish edition's language layer: numbers, pesos, times, days, letters, digits, normalisation, the composer, and
// how the engine understands Spanish (the "no", person and mood, a past tense, "y si", "así está bien").
// Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { EDITION } from "../../src/edition";
import { dateSlot, daySlot, digitsSlot, lettersSlot, priceSlot, readInt, timeSlot } from "../../src/convo/slots";
import { isConfirmation, surfaceTokens, tokenizeInput, tokenSimilarity } from "../../src/convo/normalize";
import { compose } from "../../src/convo/compose";
import { ent, t } from "../../src/content/dsl";
import type { EntityDef } from "../../src/content/types";
import { Nlu } from "../../src/convo/nlu";
import { LANG } from "../../src/convo/lang";
import { buildNlu } from "../../src/convo/dialogue";
import { SITUATION_BY_ID } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";

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

// ---------------------------------------------------------------------------------------------------------------------
// Understanding: the engine fixes of 2 Nov 2026 (the reviews of the travel chapter). A small grammar per case shows the
// engine's reading; the landed conversations show the outcome where money or a hand-over is at stake.

/** A grammar of a few intents ({intent: patterns}), with Spanish slots. */
function toy(intents: Record<string, string[]>): Nlu {
  const nlu = new Nlu();
  for (const [id, ps] of Object.entries(intents)) nlu.addIntent(id, ps, { contextual: id.endsWith("_ctx") });
  return nlu;
}
/** The best reading: its intents and its yes/no ("yn:no"); [] if nothing is understood. */
function read(nlu: Nlu, say: string, expected: string[] = []): string[] {
  const r = nlu.parse(say, expected);
  return r.ok && r.best ? [...r.best.segments.map((s) => s.intent), ...(r.best.yn ? ["yn:" + r.best.yn] : [])] : [];
}
/** Every reading the engine still has (best first), as above. */
function readings(nlu: Nlu, say: string, expected: string[] = []): string[][] {
  return nlu.parse(say, expected).alternatives.map((p) => [...p.segments.map((s) => s.intent), ...(p.yn ? ["yn:" + p.yn] : [])]);
}
const sitNlu = new Map<string, Nlu>();
/** A landed conversation's grammar, and the intents its step expects. */
function atStep(sitId: string, stepId: string): [Nlu, string[]] {
  const sit = SITUATION_BY_ID[sitId];
  if (!sitNlu.has(sitId)) sitNlu.set(sitId, buildNlu(sit, GLOBAL, NPCS));
  return [sitNlu.get(sitId)!, sit.steps.find((s) => s.id === stepId)!.expects ?? []];
}

describe("1. 'no' + a clitic + a verb keeps the 'no' on the verb", () => {
  const nlu = toy({
    throw: ["[mejor] (la | lo) tiro [yo]", "tirela"], throw_no: ["no (la | lo) (tiro | tire)"],
    drink: ["me la tomo"], empty: ["la vacio"], empty_no: ["no la vacio"],
    color: ["la (roja | grande | otra)"], bill: ["la cuenta"],
  });
  it("'No la tiro / tire / vacío' is a negated verb, never 'No,' + the choice", () => {
    expect(read(nlu, "No la tiro, me la tomo")).toEqual(["throw_no", "drink"]);
    expect(read(nlu, "No la tire, me la tomo")).toEqual(["throw_no", "drink"]);
    for (const s of ["No la tiro, me la tomo", "No la tire", "No la vacío, tírela", "No lo tiro"]) {
      expect(readings(nlu, s).filter((r) => r.includes("yn:no") || r.includes("empty") || r.includes("throw") && !r.includes("throw_no"))).toEqual([]);
    }
    // the security check: the bottle is drunk or emptied as said, never thrown away
    const [security, exp] = atStep("s64b-security", "bottle");
    expect(read(security, "No la tire, me la tomo", exp)).toEqual(["bottle_drink"]);
    expect(read(security, "No la tiro, me la tomo", exp)).toEqual(["bottle_drink"]);
    expect(read(security, "No la vacío, tírela", exp)).toEqual(["bottle_throw"]);
    expect(read(security, "No la tire", exp)).toEqual(["bottle_neg"]);
    for (const s of ["No la tire, me la tomo", "No la tiro, me la tomo", "No la tire"]) {
      expect(readings(security, s, exp).filter((r) => r.includes("bottle_throw"))).toEqual([]);
    }
  });
  it("'No, la roja' / 'No la roja' (no verb) is still a correction, and a comma still makes an answer", () => {
    expect(read(nlu, "No, la roja")).toEqual(["color", "yn:no"]);
    expect(read(nlu, "No la roja")).toEqual(["color", "yn:no"]);
    expect(read(nlu, "No la grande")).toEqual(["color", "yn:no"]);
    expect(read(nlu, "No la cuenta")).toEqual(["bill", "yn:no"]);
    // the comma allows "No, | la tiro" (commas are lost in speech, so the negated reading stays the likelier one)
    expect(readings(nlu, "No, la tiro")).toContainEqual(["throw", "yn:no"]);
  });
  it("what a 'no' right before it negates", () => {
    const neg = (s: string) => LANG.noNegates!(s.split(" "), 0);
    expect(["la tiro", "la tire", "me la tomo", "lo compre", "los tengo", "quiero", "pago"].map(neg)).toEqual([true, true, true, true, true, true, true]);
    expect(["la roja", "la cuenta", "la tarde", "las dos", "para llevar", "el grande", "manana"].map(neg)).toEqual([false, false, false, false, false, false, false]);
  });
});

describe("2. 'no traigo' is a no", () => {
  const nlu = toy({ cash: ["(traigo | tengo) efectivo"] });
  it("a bare 'No traigo' answers '¿Trae efectivo?'", () => {
    expect(read(nlu, "No traigo.")).toEqual(["yn:no"]);
    expect(read(nlu, "No, no lo traigo")).toEqual(["yn:no"]);
    expect(read(nlu, "Sí, traigo")).toEqual(["yn:yes"]);
    expect(read(nlu, "No traigo efectivo")).not.toContain("cash");
  });
});

describe("3. a second part after a negative one", () => {
  const nlu = toy({
    no_cash: ["no (tengo | traigo) efectivo"], cash_no: ["efectivo no"], pay_card: ["(quiero | quisiera | prefiero) pagar con tarjeta", "pago con tarjeta", "con tarjeta"],
    purpose_neg: ["no (vengo | vine) de vacaciones"], purpose: ["(vengo | vine) (a una conferencia | a trabajar)", "estoy aqui por trabajo", "voy a una conferencia"],
    today_no: ["hoy no"], tomorrow: ["manana"],
  });
  it("'quiero', 'quisiera', 'pago', 'prefiero', 'vengo', 'vine', 'estoy' start one", () => {
    for (const v of ["quiero pagar", "quisiera pagar", "prefiero pagar", "pago"]) expect(read(nlu, `No tengo efectivo, ${v} con tarjeta`)).toEqual(["no_cash", "pay_card"]);
    expect(read(nlu, "No vengo de vacaciones, vengo a una conferencia")).toEqual(["purpose_neg", "purpose"]);
    expect(read(nlu, "No vine de vacaciones, vine a trabajar")).toEqual(["purpose_neg", "purpose"]);
    expect(read(nlu, "No vengo de vacaciones, estoy aquí por trabajo")).toEqual(["purpose_neg", "purpose"]);
  });
  it("but never right after a 'no': that 'no' is the verb's", () => {
    for (const s of ["Efectivo no quiero pagar con tarjeta", "Efectivo no prefiero pagar con tarjeta", "Efectivo no pago con tarjeta"]) {
      expect(readings(nlu, s).filter((r) => r.includes("cash_no"))).toEqual([]);
    }
    expect(read(nlu, "Efectivo no, con tarjeta")).toEqual(["cash_no", "pay_card"]);
    expect(read(nlu, "Hoy no, mañana")).toEqual(["today_no", "tomorrow"]);
  });
  it("'No voy a Cancún, voy a Mérida' stays one correction (s67a)", () => {
    const [tickets, exp] = atStep("s67a-tickets", "trip");
    expect(read(tickets, "No voy a Cancún, voy a Mérida", exp)).toEqual(["change_dest"]);
  });
});

describe("4. a verb's last vowel carries its person and mood", () => {
  it("no slip between tengo / tenga, tomo / tome / toma, pago / pague / paga, traigo / traiga, llevo / lleve / lleva, quiero / quiera", () => {
    for (const [a, b] of [["tengo", "tenga"], ["tomo", "tome"], ["tomo", "toma"], ["tome", "toma"], ["pago", "pague"], ["pago", "paga"],
      ["traigo", "traiga"], ["llevo", "lleve"], ["llevo", "lleva"], ["quiero", "quiera"], ["tiro", "tires"], ["tarde", "tardo"]]) {
      expect(tokenSimilarity(a, b), `${a} / ${b}`).toBe(0);
      expect(tokenSimilarity(b, a), `${b} / ${a}`).toBe(0);
    }
  });
  it("the gender slips stay, and the common verbs' person slips", () => {
    for (const [a, b] of [["rojo", "roja"], ["rojos", "rojas"], ["otro", "otra"], ["lleno", "llena"], ["cerrado", "cerrada"], ["el", "la"], ["quiero", "quiere"], ["tome", "tomes"]]) {
      expect(tokenSimilarity(a, b), `${a} / ${b}`).toBeGreaterThan(0.8);
    }
  });
  it("'Tengo el vuelo…' and 'Tomo el vuelo…' never hand anything over", () => {
    const nlu = toy({ give: ["(tenga | tome | toma) [mi | el] [pasaporte]"], flight: ["(tengo | tomo) el (vuelo | de) [de] {time}"] });
    expect(read(nlu, "Tengo el vuelo de las ocho y diez")).toEqual(["flight"]);
    expect(read(nlu, "Tomo el de las ocho")).toEqual(["flight"]);
    expect(read(nlu, "Tenga mi pasaporte")).toEqual(["give"]);
    for (const s of ["Tengo", "Tomo", "Tengo mi pasaporte"]) expect(read(nlu, s, ["give"])).not.toContain("give");
    const [checkin, exp] = atStep("s64a-checkin", "passport");
    expect(read(checkin, "Tengo el vuelo de las ocho y diez", exp)).not.toContain("give");
    expect(read(checkin, "Tomo el vuelo de las ocho", exp)).not.toContain("give");
    expect(read(checkin, "Tenga", exp)).toEqual(["give"]);
  });
});

describe("5. a past tense said with its accent", () => {
  it("is kept apart from the present and the command it folds to", () => {
    expect(toks("Pagué todo")).toEqual(["pagu'e", "todo"]);
    expect(toks("Ya pagó")).toEqual(["ya", "pag'o"]);
    expect(toks("Pague todo")).toEqual(["pague", "todo"]);
    // not a past: -ió, a future, "esté", nouns and names
    expect(toks("Salió, pagaré, tendré, esté, café, José, té")).toEqual(["salio", "pagare", "tendre", "este", "cafe", "jose", "te"]);
    expect(tokenSimilarity("pagu'e", "pague")).toBe(0);
    expect(tokenSimilarity("pag'o", "pago")).toBe(0);
    expect(tokenSimilarity("pagu'e", "pago")).toBe(0);
    // without the accent, today's reading: the learner's "pague" is the pattern's "pagué"
    expect(tokenSimilarity("pague", "pagu'e")).toBe(1);
    expect(tokenSimilarity("pago", "pag'o")).toBe(1);
  });
  it("'Pagué todo' never pays, 'Tomé…' never hands over", () => {
    const nlu = toy({ pay: ["[ok] lo pago", "pago todo"], paid: ["[ya] [lo] pagué [todo]"], give: ["tome"], took: ["tomé el de las ocho"] });
    expect(read(nlu, "Pagué todo")).toEqual(["paid"]);
    expect(read(nlu, "Ya lo pagué")).toEqual(["paid"]);
    expect(read(nlu, "Pague todo")).toEqual(["paid"]);
    expect(read(nlu, "Lo pago")).toEqual(["pay"]);
    for (const s of ["Pagué todo", "Ya pagó", "Lo pagó", "Pagó todo"]) expect(read(nlu, s, ["pay"])).not.toContain("pay");
    expect(read(nlu, "Tomé", ["give"])).not.toContain("give");
    expect(read(nlu, "Tomé el de las ocho")).toEqual(["took"]);
    expect(read(nlu, "Tome")).toEqual(["give"]);
  });
  it("in the rental, at the mandatory insurance", () => {
    const [rental, exp] = atStep("s71a-rental", "tpl");
    expect(read(rental, "Pagué todo", exp)).toEqual(["tpl_refuse_ctx"]);
    expect(read(rental, "Pero ya lo pagué en línea", exp)).toEqual(["tpl_refuse_ctx"]);
    expect(read(rental, "Lo pago", exp)).toEqual(["ok_ack"]);
    const [, ins] = atStep("s71a-rental", "insurance");
    for (const s of ["Pagué todo", "Ya pagó", "Lo pagué"]) expect(read(rental, s, ins)).toEqual([]);
  });
});

describe("6. 'y si' is an 'if', not 'and yes'", () => {
  it("in what is said and in the patterns", () => {
    expect(toks("¿Y si cancelo?")).toEqual(["y", "s'i", "cancelo"]);
    expect(toks("¿Qué pasa si cancelo?")).toEqual(["que", "pasa", "s'i", "cancelo"]);
    expect(toks("Si no me queda")).toEqual(["s'i", "no", "me", "queda"]);
    expect(toks("Sí, no me queda")).toEqual(["si", "no", "me", "queda"]);
    expect(toks("Si, no me queda")).toEqual(["si", "no", "me", "queda"]);
    expect(toks("Y sí, cancelo")).toEqual(["y", "si", "cancelo"]);
    expect(toks("Sí, cancelo")).toEqual(["si", "cancelo"]);
    expect(toks("si no al hotel")).toEqual(["si", "no", "al", "hotel"]);
  });
  it("never books, pays or cancels", () => {
    const nlu = toy({ cancel: ["[si] cancelo"], prepay: ["[si] lo pago por adelantado"], cover: ["[si] quiero la cobertura"], cancel_q: ["(y si | que pasa si) cancelo"] });
    expect(read(nlu, "¿Y si cancelo?")).toEqual(["cancel_q"]);
    expect(read(nlu, "¿Qué pasa si cancelo?")).toEqual(["cancel_q"]);
    expect(read(nlu, "Sí, cancelo")).toContain("cancel");
    for (const s of ["¿Y si lo pago por adelantado?", "¿Y si quiero la cobertura?", "Y si no me queda?"]) {
      expect(read(nlu, s, ["prepay", "cover", "cancel"])).toEqual([]);
    }
    const [rental, exp] = atStep("s71a-rental", "tpl");
    expect(read(rental, "¿Y si cancelo?", exp)).toEqual(["cancel_q_ctx"]);
    expect(read(rental, "Sí, cancelo", exp)).toEqual(["tpl_leave_ctx", "yn:yes"]);
  });
  it("but a reassurance on its own is the yes of 'Sí, no hay problema'", () => {
    expect(toks("si no hay problema")).toEqual(["si", "no", "hay", "problema"]);
    expect(toks("si no importa gracias")[0]).toBe("si");
    expect(toks("Si no hay problema, me lo llevo")[0]).toBe("s'i");
    const nlu = toy({ ok_ack: ["(ok | claro | perfecto) [no hay problema]", "no hay problema", "no importa", "no pasa nada"] });
    for (const s of ["si no hay problema", "si no importa", "si no pasa nada", "si no hay problema gracias"]) {
      expect(read(nlu, s)).toContain("yn:yes");
    }
  });
});

describe("7. 'Claro que no' is a no", () => {
  const nlu = toy({ ok_ack: ["(ok | claro | perfecto) [no hay problema]", "por que no"] });
  it("'claro / por supuesto / desde luego que no', but 'claro que no hay (ningún) problema' is a yes", () => {
    for (const s of ["Claro que no", "Por supuesto que no", "Desde luego que no", "¡Claro que no!"]) {
      expect(read(nlu, s), s).toEqual(["yn:no"]);
      expect(read(nlu, s, ["ok_ack"]), s).toEqual(["yn:no"]);
    }
    expect(read(nlu, "Claro que no hay problema", ["ok_ack"])).not.toContain("yn:no");
    expect(read(nlu, "Claro que no hay ningún problema")).toEqual(["yn:yes"]);
    expect(read(nlu, "¿Por qué no?", ["ok_ack"])).toEqual(["ok_ack"]);
  });
});

describe("8. 'Así está bien' (as it is) is a no", () => {
  const nlu = toy({ add: ["[si] agreguela"] });
  it("at an offer it declines; 'Sí, así está bien' is still a yes", () => {
    for (const s of ["Así está bien", "Está bien así", "Déjelo así", "Así estoy bien", "No, así está bien", "Así está bien, gracias"]) {
      expect(read(nlu, s, ["add"]), s).toEqual(["yn:no"]);
    }
    expect(read(nlu, "Sí, así está bien")).toEqual(["yn:yes"]);
  });
});

describe("9. spelling: 'doble ele', 'doble erre', 'eñe', 'che'", () => {
  it.each([
    ["eme, i, doble ele, e, erre", "miller"], ["be, a, doble erre, o", "barro"], ["pe, e, doble ese", "pess"], ["doble u, a, te, te", "watt"],
    ["doble ve, a, te, te", "watt"], ["i griega, e, ese", "yes"], ["ye, e, ese", "yes"], ["eme, u, eñe, o, zeta", "muñoz"], ["M U Ñ O Z", "muñoz"],
    ["che, a, ve, e, zeta", "chavez"], ["ese, a, ene, che, e, zeta", "sanchez"],
  ])("%s", (s, v) => expect(whole(lettersSlot, s)).toContain(v));
  it("in the rental, spelled before or after the name", () => {
    const [rental, exp] = atStep("s71a-rental", "spell");
    expect(read(rental, "Eme, i, doble ele, e, erre", exp)).toEqual(["letters_ctx"]);
    expect(rental.parse("Eme, i, doble ele, e, erre", exp).best!.segments[0].slots.letters).toBe("miller");
  });
});
