// The Spanish edition's language layer: numbers, pesos, times, days, letters, digits, normalisation, the composer, and
// how the engine understands Spanish (the "no", person and mood, a past tense, "y si", "así está bien").
// Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { EDITION } from "../../src/edition";
import { BUILTIN_SLOTS, dateSlot, daySlot, digitsSlot, lettersSlot, priceSlot, readInt, timeSlot } from "../../src/convo/slots";
import { isConfirmation, surfaceTokens, tokenizeInput, tokenSimilarity } from "../../src/convo/normalize";
import { compose } from "../../src/convo/compose";
import { ent, t } from "../../src/content/dsl";
import type { EntityDef } from "../../src/content/types";
import { Nlu } from "../../src/convo/nlu";
import { LANG } from "../../src/convo/lang";
import { buildNlu, Conversation, type NpcInfo } from "../../src/convo/dialogue";
import { setVariety } from "../../src/convo/compose";
import { expectHowAreYou } from "../../src/content/global";
import type { Ctx, Pending, SituationDef, StepDef } from "../../src/content/types";
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
  it("'Sí / Claro, ¿por qué no?' is a yes; a bare '¿Por qué no?' is a question for the conversation", () => {
    const nlu = toy({ thanks: ["gracias"] });
    for (const s of ["Sí, ¿por qué no?", "si porque no", "Claro, ¿por qué no?"]) expect(read(nlu, s)).toEqual(["yn:yes"]);
    expect(read(nlu, "¿Por qué no?")).toEqual([]);
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

// ---------------------------------------------------------------------------------------------------------------------
// The dialogue audit's shared fixes (5 Nov 2026, AUDIT/FOLLOWUPS.md): the language layer, the global skills and the
// engine, edition-wide. Each conversation's own guards stay (their tests are in their files).

/** A toy conversation with Spanish slots and the global skills: the intents, lines and steps given. */
function toySit(o: { intents?: Record<string, string[]>; lines?: Record<string, ReturnType<typeof t>[]>; steps?: StepDef[];
  start?: (c: Ctx) => void; handlers?: SituationDef["handlers"]; npc?: string }): SituationDef {
  return {
    id: "toy-test", song: 0, songTitle: "", title: { en: "", lt: "" }, topic: { en: "", lt: "" }, chapter: 1, order: 1, location: "x",
    npc: o.npc ?? "staff", goal: "", hints: {},
    intents: Object.fromEntries(Object.entries(o.intents ?? {}).map(([k, v]) => [k, { patterns: v }])),
    lines: { hi: [t("¡Hola!", "Hi!", "Hi!")], ...(o.lines ?? {}) }, steps: o.steps ?? [], handlers: o.handlers ?? {},
    start: o.start ?? ((c) => c.say("hi")),
  } as unknown as SituationDef;
}
const TOY_NPCS: Record<string, NpcInfo> = {
  staff: { id: "staff", name: "Lupe", gender: "f", voice: "x" },
  friend: { id: "friend", name: "Paola", gender: "f", voice: "x", informal: true },
};
function talk(sit: SituationDef, seed = 1) {
  const conv = new Conversation(sit, { global: GLOBAL, npcs: TOY_NPCS, player: { name: "Ryan", surname: "Miller", gender: "m" }, visits: 0, seed, memory: {} });
  conv.start();
  /** What the learner says: the ids of the lines said back. */
  const say = (text: string) => conv.input(text).lines.map((l) => l.lineId);
  return { conv, say };
}
const L = (es: string) => [t(es, es, es)];
const toyRead = (sit: SituationDef, say: string, expected: string[] = []) => read(buildNlu(sit, GLOBAL, TOY_NPCS), say, expected);

describe("10. a reason or a request after 'vengo porque', 'vine porque', 'porque'", () => {
  const nlu = toy({ sore: ["me duele la garganta"], fever: ["tengo fiebre"], tickets: ["tengo dos boletos [para el concierto]"] });
  it("is the request itself", () => {
    expect(read(nlu, "Vengo porque me duele la garganta")).toEqual(["sore"]);
    expect(read(nlu, "Vine porque tengo fiebre")).toEqual(["fever"]);
    expect(read(nlu, "Porque tengo dos boletos para el concierto")).toEqual(["tickets"]);
  });
  it("but a closing 'porque no' is the question '¿por qué no?', never a no", () => {
    expect(read(nlu, "Porque no")).toEqual([]);
    expect(read(nlu, "Claro, porque no")).toEqual(["yn:yes"]);
    expect(read(nlu, "No vengo porque tengo fiebre")).not.toContain("fever");
  });
});

describe("11. a trailing 'perdón' / 'lo siento' softens the answer", () => {
  const nlu = toy({ cant: ["no puedo [esta semana]"], order: ["un latte"] });
  it("is understood after any answer, and is no apology of its own", () => {
    expect(read(nlu, "No puedo esta semana, perdón.")).toEqual(["cant"]);
    expect(read(nlu, "No puedo esta semana, lo siento")).toEqual(["cant"]);
    expect(read(nlu, "No puedo, perdón.")).toEqual(["yn:no"]);
    expect(read(nlu, "Un latte, perdón")).toEqual(["order"]);
    expect(nlu.parse("Un latte, lo siento").best!.flags.has("sorry")).toBe(true);
    expect(read(nlu, "Perdón")).toEqual([]);
  });
});

describe("12. 'No está…' / 'No queda…' is a negated verb, never 'No.' + a place", () => {
  const nlu = toy({ place: ["[esta | queda] en {country}"], far: ["[esta | queda] lejos"] });
  nlu.g.defineSlots({ country: { lexicon: [{ id: "canada", forms: ["canada"] }, { id: "mexico", forms: ["mexico"] }] } });
  it("without a comma the 'no' is the verb's", () => {
    for (const s of ["No está en Canadá", "No queda lejos", "No están en México"]) expect(readings(nlu, s).filter((r) => r.includes("yn:no")), s).toEqual([]);
    expect(read(nlu, "No, está en Canadá")).toEqual(["place", "yn:no"]);
    expect(["esta", "queda", "estan", "quedan"].map((w) => LANG.noNegates!([w], 0))).toEqual([true, true, true, true]);
  });
  it("in the party, 'No está en Canadá' says where the city is not, never 'No.' + Canada", () => {
    const party = buildNlu(SITUATION_BY_ID["s63-party"], GLOBAL, NPCS);
    expect(read(party, "No está en Canadá")).toEqual(["city_not"]);
    expect(readings(party, "No está en Canadá").filter((r) => r.includes("city_country"))).toEqual([]);
  });
});

describe("13. the persons of poder", () => {
  it("the learner's 'puedo' (I) is never 'puede' / 'pueden' (you); tú/usted slips, '¿Se puede…?' and '¿Podría…?' stay", () => {
    for (const [a, b] of [["puedo", "puede"], ["puedo", "pueden"], ["podemos", "pueden"], ["puedo", "podria"], ["pude", "pudo"]]) {
      expect(tokenSimilarity(a, b), `${a} / ${b}`).toBe(0);
    }
    for (const [a, b] of [["puedes", "puede"], ["pueden", "puede"], ["podria", "puedo"], ["podria", "puede"], ["pudiera", "pueden"], ["podemos", "puedo"],
      ["podrias", "podria"], ["puede", "puedo"]]) {
      expect(tokenSimilarity(a, b), `${a} / ${b}`).toBeGreaterThan(0.8);
    }
    expect(toks("Yo puede llevarla")).toEqual(["yo", "puedo", "llevarla"]);
  });
  it("at the baggage desk, 'Yo puedo llevarla' is no yes to the delivery", () => {
    const nlu = buildNlu(SITUATION_BY_ID["s65b-baggage"], GLOBAL, NPCS);
    for (const s of ["Yo puedo llevarla", "Yo puede llevarla", "Puedo llevarla yo"]) expect(read(nlu, s), s).not.toContain("delivery");
    for (const s of ["¿Pueden llevarla?", "¿Podría llevarla?", "¿Puedes llevarla?"]) expect(read(nlu, s), s).toEqual(["delivery"]);
  });
});

describe("14. 'obvio' is a Mexican yes", () => {
  const nlu = toy({ thanks: ["gracias"] });
  it("'obvio', 'obvio que sí', 'obviamente'; 'obvio que no' is a no", () => {
    for (const s of ["Obvio", "¡Obvio que sí!", "Obviamente", "Sí, obvio"]) expect(read(nlu, s), s).toEqual(["yn:yes"]);
    expect(read(nlu, "Obvio que no")).toEqual(["yn:no"]);
    expect(isConfirmation("Obvio")).toBe(true);
  });
});

describe("15. a conjunction is never heard as a name", () => {
  it("'porque', 'pero', 'cuando' never start or end a sound-alike ('porque' was 'parroquia')", () => {
    for (const w of ["porque", "pero", "aunque", "cuando", "donde", "como", "pues", "entonces"]) expect(LANG.soundEdge.has(w), w).toBe(true);
  });
});

describe("16. a set phrase with 'no' before a question", () => {
  const nlu = toy({ reassure: ["(no te preocupes | no pasa nada | no hay problema | tranquila)"], dog: ["tienes perro"], local: ["eres de aqui"],
    price_ok: ["no importa"], ask_price: ["el precio"] });
  it("doesn't block it", () => {
    expect(read(nlu, "No te preocupes. ¿Tienes perro?")).toEqual(["reassure", "dog"]);
    expect(read(nlu, "No pasa nada. ¿Eres de aquí?")).toEqual(["reassure", "local"]);
    expect(read(nlu, "No hay problema. ¿Tienes perro?")).toContain("dog");
  });
  it("but a real negative still does ('No importa el precio' is no price question)", () => {
    expect(read(nlu, "No importa el precio")).toEqual([]);
    expect(LANG.settledNegative!(["no", "te", "preocupes"])).toBe(true);
    expect(LANG.settledNegative!(["no", "quiero", "no", "te", "preocupes"])).toBe(false);
  });
});

describe("17. 'El calentador sí funciona' is no acceptance of the heater", () => {
  const nlu = toy({ heater: ["el calentador"], card: ["con tarjeta"] });
  it("a bare 'funciona' (and 'sí funciona') is a predicate; 'me funciona', 'está bien' still accept", () => {
    expect(read(nlu, "El calentador sí funciona")).toEqual([]);
    expect(read(nlu, "El calentador funciona")).toEqual([]);
    expect(read(nlu, "Con tarjeta me funciona")).toEqual(["card"]);
    expect(read(nlu, "Con tarjeta está bien")).toEqual(["card"]);
  });
});

describe("18. a greeting reply, then a request, in one turn", () => {
  it("'Muy bien, gracias. Oiga, ¿me presta…?' and '¡Ah, ya sé! ¡Muchas gracias!'", () => {
    const nlu = buildNlu(SITUATION_BY_ID["s82-neighbor"], GLOBAL, NPCS);
    for (const s of ["Muy bien, gracias. Oiga, ¿me presta una escalera?", "Bien, gracias. Oiga, ¿me presta una escalera?", "Bien. Mire, ¿me presta una escalera?"]) {
      expect(read(nlu, s), s).toContain("borrow");
    }
    expect(read(nlu, "¡Ah, ya sé! ¡Muchas gracias!")).toEqual(["g_ok"]);
    // "Ya sé dónde está…" says what the learner knows: no "Ya sé" + a question
    const tour = buildNlu(SITUATION_BY_ID["s88-first-day"], GLOBAL, NPCS);
    expect(read(tour, "Ya sé dónde está el baño", SITUATION_BY_ID["s88-first-day"].steps.find((s) => s.id === "tour")!.expects)).not.toContain("q_restroom");
  });
});

describe("19. a piece may begin with va / sale / está after a clause of its own", () => {
  const nlu = toy({ flight: ["(voy en | tengo) el [vuelo] {number}"], subj: ["el vuelo {number}"], ontime: ["(va | sale | esta) a tiempo"] });
  it("'Voy en el 223, ¿va a tiempo?' is two pieces; 'El vuelo 223 va a tiempo' (subject and verb) isn't", () => {
    expect(read(nlu, "Voy en el 223, ¿va a tiempo?")).toEqual(["flight", "ontime"]);
    expect(read(nlu, "Tengo el 223, ¿sale a tiempo?")).toEqual(["flight", "ontime"]);
    expect(readings(nlu, "El vuelo 223 va a tiempo").filter((r) => r.join() === "subj,ontime")).toEqual([]);
  });
});

describe("20. 'Ya voy' / 'Ya vamos' (coming) are no goodbye", () => {
  const sit = toySit({ lines: { ask: L("¿Ya viene?") } });
  it("only 'ya me voy' leaves", () => {
    for (const s of ["Ya voy", "¡Ya voy!", "Ya vamos", "Ahí voy"]) expect(toyRead(sit, s), s).toEqual(["g_ok"]);
    expect(toyRead(sit, "Ya me voy")).toEqual(["g_bye"]);
    const { conv, say } = talk(sit);
    say("¡Ya voy!");
    expect(conv.ended).toBe(false);
  });
});

describe("21. '¿Qué significa…?' / '¿Qué es…?' asks about a word", () => {
  const sit = toySit({ intents: { tool_ctx: ["(maquina | tijera)"], what_dish: ["que es la cochinita [pibil]"] },
    steps: [{ id: "tool", done: (c) => !!c.s.tool, ask: (c) => c.say("hi"), expects: ["tool_ctx"] }],
    handlers: { tool_ctx: (c) => { c.s.tool = c.heard; } } });
  const nlu = buildNlu(sit, GLOBAL, TOY_NPCS);
  it("'¿Qué significa máquina?' is the word asked about, never the answer 'máquina'", () => {
    expect(read(nlu, "¿Qué significa máquina?", ["tool_ctx"])).toEqual(["g_meaning"]);
    expect(nlu.parse("¿Qué significa máquina?", ["tool_ctx"]).best!.segments[0].slots.w).toBe("maquina");
    const { conv, say } = talk(sit);
    say("¿Qué significa máquina?");
    expect(conv.s.tool).toBeUndefined();
  });
  it("an expression, '¿Qué es (una) X?', '¿Qué es eso?'", () => {
    expect(read(nlu, "¿Qué significa de un jalón?")).toEqual(["g_meaning"]);
    for (const s of ["¿Qué es una charola?", "¿Qué es el CURP?", "¿Qué es charola?"]) expect(read(nlu, s), s).toEqual(["g_meaning"]);
    expect(read(nlu, "¿Qué es la cochinita pibil?")).toEqual(["what_dish"]);
    // another global skill may follow it
    expect(read(nlu, "¿Qué significa? No entiendo.")).toEqual(["g_meaning", "g_dont_understand"]);
  });
  it("but '¿Qué es mejor?' / '¿Qué es más barato?' / '¿Qué es lo que…?' aren't, and '¿Qué es eso?' is each conversation's", () => {
    for (const s of ["¿Qué es mejor?", "¿Qué es más barato?", "¿Qué es lo que tiene?", "¿Qué es eso?"]) expect(read(nlu, s), s).not.toContain("g_meaning");
    const term = (BUILTIN_SLOTS as unknown as Record<string, { fn: (tk: string[], pos: number, prefix: boolean) => { value: unknown }[] }>).term;
    expect(term.fn(["una", "charola"], 0, false).map((r) => r.value)).toContain("charola");
    expect(term.fn(["mejor"], 0, false)).toEqual([]);
  });
});

describe("22. '¿Qué hora es?'", () => {
  const sit = toySit({});
  it("is understood (nobody gives the time); '¿A qué hora es?' isn't that", () => {
    expect(toyRead(sit, "¿Qué hora es?")).toEqual(["g_time"]);
    expect(toyRead(sit, "¿Qué horas son?")).toEqual(["g_time"]);
    const { say } = talk(sit);
    expect(say("¿Qué hora es?")).toEqual(["g_no_watch"]);
    expect(say("¿A qué hora es?")).not.toContain("g_no_watch");
  });
});

describe("23. days and clock times", () => {
  it("'la semana que entra', 'la otra semana', 'el lunes que entra'", () => {
    expect(whole(daySlot, "la semana que entra")).toContain("next_week");
    expect(whole(daySlot, "la otra semana")).toContain("next_week");
    expect(whole(daySlot, "el lunes que entra")).toContain("monday");
  });
  it("a bare 'uno' / 'una' is no one o'clock; 'la una', 'una y media', 'una de la tarde' are", () => {
    expect(whole(timeSlot, "uno")).toEqual([]);
    expect(whole(timeSlot, "una")).toEqual([]);
    expect(whole(timeSlot, "la una")).toContainEqual({ h: 1, m: 0 });
    expect(whole(timeSlot, "una y media")).toContainEqual({ h: 1, m: 30 });
    expect(whole(timeSlot, "una de la tarde")).toContainEqual({ h: 1, m: 0, ampm: "pm" });
    expect(whole(timeSlot, "dos")).toContainEqual({ h: 2, m: 0 });
  });
});

describe("24. a question is never split into a question and the open question's answer", () => {
  const nlu = toy({ ask_next: ["a que hora sale"], ask_price: ["cuanto cuesta"], time_ctx: ["el (ultimo | primero)", "{time}"], size_ctx: ["el grande"], dest_ctx: ["a merida"] });
  it("'¿A qué hora sale el último?' doesn't answer with 'el último'", () => {
    expect(readings(nlu, "¿A qué hora sale el último?", ["time_ctx"]).filter((r) => r.includes("time_ctx"))).toEqual([]);
    expect(readings(nlu, "¿Cuánto cuesta el grande?", ["size_ctx"]).filter((r) => r.includes("size_ctx"))).toEqual([]);
    expect(read(nlu, "El último", ["time_ctx"])).toEqual(["time_ctx"]);
  });
  it("but an answer that begins with a preposition is one ('¿Cuánto cuesta a Mérida?' names the destination)", () => {
    expect(read(nlu, "¿Cuánto cuesta a Mérida?", ["dest_ctx"])).toEqual(["ask_price", "dest_ctx"]);
  });
});

describe("25. '¿Cómo está?': one reply a turn, bad news first, a bare 'No'", () => {
  const sit = toySit({
    intents: { tired_ctx: ["un poco (cansado | cansada)", "pero un poco (cansado | cansada)"] },
    lines: { how: L("¿Cómo está?"), next: L("¿Qué le sirvo?"), appt_no: L("¿Sin cita?") },
    steps: [{ id: "appt", done: (c) => !!c.s.appt, ask: (c) => c.say("next"), no: (c) => { c.s.appt = "none"; c.say("appt_no"); } } as StepDef],
    start: (c) => { c.say("how"); expectHowAreYou(c); },
  });
  it("'Bien, pero un poco cansada' gets '¡Ay, lo siento!' only", () => {
    const { say } = talk(sit);
    const out = say("Bien, pero un poco cansada");
    expect(out.filter((l) => l === "g_glad" || l === "g_sorry_to_hear")).toEqual(["g_sorry_to_hear"]);
  });
  it("'Muy bien, gracias' is good news; 'No' is how they are, not the next question's no", () => {
    expect(talk(sit).say("Muy bien, gracias")).toContain("g_glad");
    const { conv, say } = talk(sit);
    expect(say("No")).toContain("g_sorry_to_hear");
    expect(conv.s.appt).toBeUndefined();
  });
  it("a bare '¿Cómo?' asks to hear it again ('¿De verdad? ¿Cómo?')", () => {
    const sit2 = toySit({ intents: { really: ["de verdad"] }, lines: { news: L("Me caí de la escalera.") }, start: (c) => c.say("news"), handlers: { really: () => {} } });
    const { say } = talk(sit2);
    expect(say("¿De verdad? ¿Cómo?")).not.toContain("g_howareyou_reply");
    expect(say("¿Cómo está?")).toContain("g_howareyou_reply");
  });
});

describe("26. goodbyes", () => {
  const wishes = toySit({ lines: { nice: L("¡Mucho gusto!"), wish: L("¡Que le vaya bien!") }, start: (c) => c.say("nice"),
    intents: { leave_ctx: ["ya me tengo que ir"] }, handlers: { leave_ctx: (c) => c.say("wish") },
    steps: [{ id: "chat", done: () => false, ask: (c) => c.say("nice"), expects: ["leave_ctx"] }] });
  it("'Igualmente' answers 'Mucho gusto' without leaving, and a goodbye wish by leaving", () => {
    const { conv, say } = talk(wishes);
    say("Igualmente");
    expect(conv.ended).toBe(false);
    say("Ya me tengo que ir");
    say("¡Igualmente!");
    expect(conv.ended).toBe(true);
  });
  it("fits the part of the day a greeting named", () => {
    const sit = toySit({});
    const bye = (hello: string | null) => { const { say } = talk(sit); if (hello) say(hello); return say("Adiós").filter((l) => l.startsWith("g_bye")); };
    expect(bye("Buenos días")).toEqual(["g_bye_day"]);
    expect(bye("Buenas tardes")).toEqual(["g_bye_afternoon"]);
    expect(bye("Buenas noches")).toEqual(["g_bye_night"]);
    expect(bye(null)).toEqual(["g_bye"]);
  });
  it("'Buenas noches' at the end of the evening is good night", () => {
    const sit = toySit({ steps: [{ id: "x", done: (c) => !!c.s.x, ask: (c) => c.say("hi"), expects: ["done_ctx"] }], intents: { done_ctx: ["listo"] },
      handlers: { done_ctx: (c) => { c.s.x = true; c.complete(); } } });
    const { conv, say } = talk(sit);
    expect(say("Buenas noches")).toContain("g_hello");
    expect(conv.ended).toBe(false);
    // the person's own "¡Buenas noches!" greeting answered with one
    const night = talk(toySit({ lines: { evening: L("¡Buenas noches! Pase, pase.") }, start: (c) => c.say("evening"),
      steps: [{ id: "x", done: () => false, ask: (c) => c.say("hi") }] }));
    night.say("¡Buenas noches!");
    expect(night.conv.ended).toBe(false);
    night.say("Igualmente");
    expect(night.conv.ended).toBe(false);
    say("Listo");
    say("Buenas noches");
    expect(conv.ended).toBe(true);
    const b = talk(sit);
    b.say("Hola");
    b.say("Listo");
    b.say("Gracias, buenas noches");
    expect(b.conv.ended).toBe(true);
  });
});

describe("27. thanks", () => {
  it("'¡A la orden!' only from someone who serves the learner (usted)", () => {
    expect(talk(toySit({})).say("Gracias")).toEqual(["g_welcome_staff"]);
    expect(talk(toySit({ npc: "friend" })).say("Gracias")).toEqual(["g_welcome"]);
    expect(GLOBAL.lines.g_welcome.some((l) => l.en.includes("A la orden"))).toBe(false);
  });
  it("'Gracias por la oferta'", () => {
    expect(toyRead(toySit({}), "Gracias por la oferta")).toEqual(["g_thanks"]);
    expect(toyRead(toySit({}), "Muchas gracias por la invitación")).toEqual(["g_thanks"]);
  });
});

describe("28. 'Gracias', 'Está bien, gracias', 'Gracias, es todo' at an offer are its no, never a yes", () => {
  const offer = (q: string, on?: Pending["on"]) => toySit({
    lines: { q: L(q), took: L("Ahí va."), left: L("Sale.") },
    start: (c) => { c.say("q"); c.expect({ id: "offer", yes: (cc) => { cc.s.took = true; cc.say("took"); }, no: (cc) => { cc.s.took = false; cc.say("left"); }, on }); },
  });
  it("at '¿Le pongo hielo?' / '¿Quiere bolsa?' / '¿Algo más?'", () => {
    for (const q of ["¿Le pongo hielo?", "¿Quiere bolsa?", "¿Algo más?"]) for (const s of ["Gracias", "Muchas gracias", "Está bien, gracias", "Gracias, es todo"]) {
      const { conv, say } = talk(offer(q));
      const out = say(s);
      expect(conv.s.took, `${q} ${s}`).toBe(false);
      expect(out, `${q} ${s}`).toContain("left");
    }
    const { conv, say } = talk(offer("¿Le pongo hielo?"));
    say("Sí, gracias");
    expect(conv.s.took).toBe(true);
  });
  it("elsewhere they keep their meaning: '¿Le parece bien el martes?' – 'Está bien, gracias' is a yes", () => {
    const a = talk(offer("¿Le parece bien el martes?"));
    a.say("Está bien, gracias");
    expect(a.conv.s.took).toBe(true);
    const b = talk(offer("¿Le parece bien el martes?"));
    expect(b.say("Gracias")).toContain("g_welcome_staff");
    expect(b.conv.s.took).toBeUndefined();
  });
  it("a conversation that reads thanks at its offer itself keeps it", () => {
    const { conv, say } = talk(offer("¿Le pongo hielo?", { g_thanks: (cc) => { cc.s.took = "thanks"; } }));
    say("Gracias");
    expect(conv.s.took).toBe("thanks");
  });
  it("and '¿Algo más?' as a step closes on 'Gracias, es todo'", () => {
    const sit = toySit({ lines: { more: L("¿Algo más?"), bye: L("¡Hasta luego!") },
      steps: [{ id: "more", done: (c) => c.s.more !== undefined, ask: (c) => c.say("more"), no: (c) => { c.s.more = false; c.say("bye"); } } as StepDef] });
    const { conv, say } = talk(sit);
    say("Hola");
    say("Gracias, es todo");
    expect(conv.s.more).toBe(false);
  });
});

describe("29. 'No sé'", () => {
  it("to a question about a fact gets '¡No se preocupe!', not 'Sin prisa'; at an offer one takes one's time", () => {
    const ask = (q: string) => toySit({ lines: { q: L(q) }, start: (c) => { c.say("q"); c.expect({ id: "q", yes: () => {}, no: () => {} }); } });
    expect(talk(ask("¿Va a estar en casa?")).say("No sé")).toEqual(["g_no_worries"]);
    expect(talk(ask("¿Quiere postre?")).say("No sé")).toEqual(["g_take_time"]);
  });
  it("a step's help that only reassures asks the step again", () => {
    const sit = toySit({ lines: { q: L("¿Qué día le queda?"), calm: L("Bueno, no se preocupe.") },
      steps: [{ id: "day", done: (c) => !!c.s.day, ask: (c) => c.say("q"), help: (c) => c.say("calm") } as StepDef] });
    const { say } = talk(sit);
    say("Hola");
    expect(say("No sé")).toEqual(["calm", "q"]);
  });
});

describe("30. what the voices say: the neutral noun, letter names, capitals", () => {
  const E: EntityDef[] = [
    ent("jitomate", "jitomate", "tomato", "m", { pl: "jitomates", ltPl: "tomatoes", attrs: { neutral: "tomate" } }),
    ent("lucia", "Cocina | de | Lucía", "Kitchen | of | Lucía", "f", { def: "" as any, attrs: { nat: "Cocina de Lucía" } }),
    ent("latte", "latte", "latte", "m"),
    ent("licencia", "licencia de manejo", "driver's license", "f", { attrs: { neutral: "licencia de conducir" } }),
  ];
  const look = (id: string) => E.find((e) => e.id === id);
  const c = (src: ReturnType<typeof t>, vars: Record<string, unknown>) => compose(src, vars, { look, addressee: "m", speaker: "f", formal: true });
  it("the neutral text says the entity's neutral noun", () => {
    const s = t("Un kilo de {X.pl}, | ¿{lo@X:pl} | quiere | {maduro@X:pl}?", "A kilo of {X.pl}, | them | you-want | ripe?", "A kilo of {X.pl}, ripe?");
    expect(c(s, { X: "jitomate" }).en).toBe("Un kilo de jitomates, ¿los quiere maduros?");
    setVariety("neutral");
    try {
      expect(c(s, { X: "jitomate" }).en).toBe("Un kilo de tomates, ¿los quiere maduros?");
      expect(c(t("{X.np}", "{X.np}", "{X.np}"), { X: "jitomate" }).en).toBe("Un tomate");
      expect(c(t("{X.np}", "{X.np}", "{X.np}"), { X: { id: "licencia", qty: 2 } }).en).toBe("Dos licencias de conducir");
    } finally { setVariety("default"); }
  });
  it("letters as Mexico spells them (B, V, Y), and the neutral names", () => {
    const s = t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}.", { say: "Se escribe: {$letters}." });
    expect(c(s, { letters: "Bevy" }).say).toBe("Se escribe: be grande, e, ve chica, i griega.");
    setVariety("neutral");
    try { expect(c(s, { letters: "Bevy" }).say).toBe("Se escribe: be larga, e, ve corta, i griega."); } finally { setVariety("default"); }
  });
  it("no 'the' in English for a name said without an article, and a capital after a lone ¿", () => {
    expect(c(t("Voy | a | {X.the}.", "I'm going | to | {X.the}.", "I'm going to {X.the}."), { X: "lucia" }).nat).toBe("I'm going to Cocina de Lucía.");
    expect(c(t("¿Lo de siempre? | ¿{X.np}?", "The usual? | {X.np}?", "The usual? {X.np}?"), { X: "latte" }).en).toBe("¿Lo de siempre? ¿Un latte?");
  });
});
