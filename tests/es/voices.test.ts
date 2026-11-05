// Puerto Colibrí's Gemini voices (docs/es/VOICES.md): the voice ids and the one switch for Mexican or neutral Spanish,
// the casting, the directions, and the batch tool's spelling and checks. Nothing here calls Gemini.
import { afterEach, describe, expect, it } from "vitest";
import { NPCS } from "../../src/content/npcs";
import { ambientVoice, audioDir, coachVoice, coachVoices, npcVoice } from "../../src/content/voices";
import { placeholders, setVariety } from "../../src/convo/compose";
import { chooseVariety } from "../../src/state/variety";
import { ACCENTS, CAST, SCENES, accentOf, castingProblems, roleOf, styleFor, whoOf } from "../../tools/es-voices/casting-es";
import { geminiTextEs, likenessEs, numbersToDigitsEs, syllables, withFx } from "../../tools/es-voices/voice-batch-es";
import { BINDINGS, LISTS, codeSpeakers, reachFilter, reachOf } from "../../tools/es-voices/reach-es";
import { betterWhy, mergeUtts } from "../../tools/es-voices/lines-es";
import { hintBinding } from "../../src/convo/target";
import { modelAnswers } from "../../src/convo/suggest";
import { SITUATION_BY_ID } from "../../src/content/situations";

afterEach(() => setVariety("default"));

describe("voice ids: one switch for the text and the accent", () => {
  it("plays the Mexican set by default", () => {
    expect(npcVoice(NPCS.mia)).toBe("es_mia");
    expect(coachVoice("m")).toBe("es_coach_m");
    expect(coachVoice(undefined)).toBe("es_coach_f");
    expect(coachVoices()).toEqual(["es_coach_f", "es_coach_m"]);
    expect(ambientVoice("f")).toBe("es_amb_f");
    expect(audioDir()).toBe("audio-es/");
  });
  it("plays the neutral set when the learner chooses neutral Spanish", () => {
    chooseVariety("neutral");
    expect(npcVoice(NPCS.mia)).toBe("esn_mia");
    expect(coachVoice("f")).toBe("esn_coach_f");
    expect(coachVoices()).toEqual(["esn_coach_f", "esn_coach_m"]);
    expect(ambientVoice("m")).toBe("esn_amb_m");
    expect(audioDir()).toBe("audio-es/");
    chooseVariety("default");
    expect(npcVoice(NPCS.mia)).toBe("es_mia");
  });
});

describe("casting", () => {
  it("casts every character, coach and passer-by, with no clashes in either casting", () => {
    for (const id of Object.keys(NPCS)) expect(roleOf(id)?.voice, id).toBeTruthy();
    expect(castingProblems("prebuilt")).toEqual([]);
    expect(castingProblems("mexico")).toEqual([]);
    for (const id of Object.keys(CAST)) expect(NPCS[id], id).toBeTruthy();
  });
  it("reads who and which accent from a voice id", () => {
    expect(whoOf("es_mia")).toBe("mia");
    expect(whoOf("esn_coach_f")).toBe("coach_f");
    expect(whoOf("g_mia")).toBeNull();
    expect(accentOf("es_mia")).toBe("mx");
    expect(accentOf("esn_mia")).toBe("neutral");
  });
  it("gives both accents the same manner and voice; only the accent direction differs", () => {
    const mx = styleFor("mia", ["s72-cafe"], { accent: "mx" }), nt = styleFor("mia", ["s72-cafe"], { accent: "neutral" });
    expect(mx.style.replace(ACCENTS.mx, "")).toBe(nt.style.replace(ACCENTS.neutral, ""));
    expect(mx.style).toContain(ACCENTS.mx);
    expect(nt.style).toContain(ACCENTS.neutral);
  });
  it("puts phone calls on a phone line, never the coach, and drops a setting a line shares with another", () => {
    expect(styleFor("linda", ["s76-dentist-call"]).fx).toBe("phone");
    expect(styleFor("kate", ["s89-video-call"]).fx).toBe("video");
    expect(styleFor("kate", ["s34-meeting"]).fx).toBeUndefined();
    expect(styleFor("sara", ["s34-meeting"]).fx).toBe("video");
    expect(styleFor("kate", ["s34-meeting", "s89-video-call"]).fx).toBeUndefined();
    expect(styleFor("coach_f", ["s76-dentist-call"]).fx).toBeUndefined();
    expect(styleFor("harold", ["s70-museum"]).style).toContain(SCENES["s70-museum"].setting);
    expect(styleFor("ben", ["s70-museum"]).style).not.toContain(SCENES["s70-museum"].setting);
  });
});

describe("the values a line can really be said with (reach-es.ts)", () => {
  const sit = (id: string) => SITUATION_BY_ID[id];
  it("gives a line said only with a fixed value that value alone", () => {
    const f = reachFilter(sit("s31-doctor"), "consult_price")!;
    expect(f({ price: 50000 })).toBe(true);
    expect(f({ price: 45000 })).toBe(false);
    expect(reachFilter(sit("s73-restaurant"), "soup_offer")!({ price: 11000 })).toBe(true);
    expect(reachOf(sit("s71a-rental")).get("ask_upgrade")?.how).toBe("fixed");
  });
  it("keeps the whole list where the value comes from the learner or a sum", () => {
    expect(reachFilter(sit("s73-restaurant"), "total_is")).toBeNull();
    expect(reachFilter(sit("s79-post"), "say_total")).toBeNull();
  });
  it("keeps values that hang together together", () => {
    const sale = reachFilter(sit("s74-clothes"), "price_sale")!;
    expect(sale({ price: 59900, pct: 20, amount: 47900 })).toBe(true);
    expect(sale({ price: 59900, pct: 20, amount: 59900 })).toBe(false);
    expect(reachFilter(sit("s31-doctor"), "change_is")!({ price: 160000 })).toBe(false);
  });
  it("keeps the values and items the audits read in the code (5 Nov)", () => {
    const seat = (en: string) => ({ en, lt: en, say: en });
    expect(reachFilter(sit("s64a-checkin"), "seat_which")!({ sa: seat("ventana"), sb: seat("pasillo") })).toBe(true);
    expect(reachFilter(sit("s64a-checkin"), "seat_which")!({ sa: seat("ventana"), sb: seat("ventana") })).toBe(false);
    expect(reachFilter(sit("s68-hotel"), "walkin_twobeds")!({ price: 250000 })).toBe(true);
    expect(reachFilter(sit("s68-hotel"), "walkin_twobeds")!({ price: 170000 })).toBe(false);
    expect(reachFilter(sit("s68-hotel"), "eco_fee")!({ price: 3500 })).toBe(true);
    expect(reachFilter(sit("s71a-rental"), "rate_is")!({ price: 65000 })).toBe(true);
    expect(reachFilter(sit("s71a-rental"), "rate_is")!({ price: 15000 })).toBe(false); // the GPS's rate, not a car's
    expect(reachFilter(sit("s72-cafe"), "price_is")!({ amount: 30000 })).toBe(false);
    // the audio guide in a language the museum has; "no la tenemos" only in one it hasn't
    expect(reachFilter(sit("s70-museum"), "guide_here")!({ X: "spanish" })).toBe(true);
    expect(reachFilter(sit("s70-museum"), "guide_here")!({ X: "japanese" })).toBe(false);
    expect(reachFilter(sit("s70-museum"), "no_lang")!({ X: "japanese" })).toBe(true);
    const sized = sit("s72-cafe").entities!.drink.filter((e) => e.attrs?.sized && !e.attrs?.generic);
    expect(sized.length).toBeGreaterThan(0);
    expect(reachFilter(sit("s72-cafe"), "ask_size_of")!({ X: sized[0].id })).toBe(true);
    // s76: the offered pair is always one of OFFERS' eleven (the existing appointment is said like "early")
    const dom = sit("s76-dentist-call").domains!;
    const slots = dom.slot2() as { say: string }[];
    const ok = dom.slot().flatMap((a) => slots.map((b) => ({ slot: a, slot2: b }))).filter(reachFilter(sit("s76-dentist-call"), "availability")!);
    expect(new Set(ok.map((b) => `${(b.slot as { say: string }).say}|${b.slot2.say}`)).size).toBe(11);
  });
  it("keeps s80's technician windows to their own days", () => {
    const dom = sit("s80-support-call").domains!;
    const f = reachFilter(sit("s80-support-call"), "tech_offer")!;
    const ok = dom.weekday().flatMap((weekday) => dom.win().map((win) => ({ weekday, win }))).filter(f);
    expect(new Set(ok.map((b) => `${(b.weekday as { say: string }).say}|${(b.win as { say: string }).say}`))).toEqual(new Set(["jueves|las nueve y las dos", "jueves|las dos y las seis", "viernes|las nueve y las dos", "sábado|las nueve y la una"]));
  });
  it("has no rule or binding that no longer fits its line (a line changed after it was read)", () => {
    for (const [k, f] of Object.entries(BINDINGS)) {
      const [sid, lid] = k.split(":");
      const need = [...new Set((sit(sid).lines[lid] ?? []).flatMap((v) => [...placeholders(v).entities, ...placeholders(v).values]))];
      const bs = f(sit(sid));
      expect(need.length, k).toBeGreaterThan(0);
      expect(bs.length, k).toBeGreaterThan(0);
      for (const b of bs) for (const n of need) expect(n in b, `${k} binds ${n}`).toBe(true);
    }
    for (const [k, lists] of Object.entries(LISTS)) {
      const [sid, lid] = k.split(":");
      expect(sit(sid).lines[lid], k).toBeTruthy();
      for (const l of lists) expect(sit(sid).entities?.[l]?.length, `${k}: ${l}`).toBeGreaterThan(0);
    }
  });
  it("lists the lines with two placeholders the code binds together", () => {
    const fares = BINDINGS["s66-taxi:fare_is"](sit("s66-taxi"));
    const dest = sit("s66-taxi").entities!.dest;
    expect(fares.length).toBe(dest.filter((e) => !e.attrs?.here).length);
    for (const b of fares) expect(b.fare).toBe(dest.find((e) => e.id === b.X)!.attrs!.fare);
    const list = BINDINGS["s74-clothes:color_list_pl"](sit("s74-clothes"));
    expect(list.every((b) => (b.X as { qty: number }).qty === 2)).toBe(true);
    expect(list.map((b) => (b.X as { id: string }).id)).toContain("pantalon");
    expect(BINDINGS["s74-clothes:color_yes"](sit("s74-clothes")).some((b) => (b.X as { id: string }).id === "pantalon")).toBe(false);
  });
  it("reads who says a line where the code chooses the speaker", () => {
    expect([...codeSpeakers(sit("s85-dinner")).get("glad_you_like") ?? []].sort()).toEqual(["dan", "nora"]);
    const s34 = codeSpeakers(sit("s34-meeting"));
    expect(s34.get("np_paul")).toEqual(new Set(["paul"]));
    expect(s34.get("sure_welcome")).toEqual(new Set(["kate"]));
  });
});

describe("hint examples with an always-plural item (p18, s34, s73, s89)", () => {
  it("bind it with two, as the conversations' lines do, so the example agrees", () => {
    const p18 = SITUATION_BY_ID["p18-startup"];
    const bugs = Object.values(p18.entities!).flat().find((e) => e.id === "bugs")!;
    expect(hintBinding(bugs, "bugs")).toEqual({ id: "bugs", qty: 2 });
    expect(hintBinding(Object.values(p18.entities!).flat().find((e) => e.id === "budget"), "budget")).toBe("budget");
    const says = modelAnswers(p18, p18.hints.overload, "bugs", { formal: false, gender: "f", npcGender: "m", vars: {} }, 3).map((s) => s.say);
    expect(says.some((s) => s.includes("los reportes de errores"))).toBe(true);
    expect(says.some((s) => s.includes("el reporte de errores"))).toBe(false);
  });
});

describe("the line list (lines-es.ts)", () => {
  it("keeps a clip heard in a run over one made from a guess, and merges the workers' lists", () => {
    expect(betterWhy("item list? qty?", "heard")).toBe("heard");
    expect(betterWhy("item list? qty?", "item qty?")).toBe("item qty?");
    const a = { voice: "es_marco", speed: 1, say: "Claro.", shown: "Claro.", where: "s73-restaurant:ack[0]", sits: ["s73-restaurant"], why: "line who?" };
    const merged = mergeUtts([[a], [{ ...a, where: "s73-restaurant:sim", sits: ["s69-local"], why: "heard" }]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sits).toEqual(["s73-restaurant", "s69-local"]);
    expect(merged[0].why).toBe("heard");
  });
});

describe("the batch tool", () => {
  it("spells for Gemini: pesos, y, no sound tags", () => {
    expect(geminiTextEs("Son $85.50, ¿verdad?")).toBe("Son 85.50 pesos, ¿verdad?");
    expect(geminiTextEs("Sal & pimienta — <risa> “por favor”…")).toBe("Sal y pimienta, risa \"por favor\"...");
  });
  it("reads Spanish numbers as Whisper writes them", () => {
    expect(numbersToDigitsEs("ochenta y cinco pesos con cincuenta centavos.")).toBe("85 pesos con 50 centavos.");
    expect(numbersToDigitsEs("dos mil trescientos cincuenta")).toBe("2350");
    expect(numbersToDigitsEs("noventa y ocho, cuarenta y cinco")).toBe("98, 45");
  });
  it("compares what was said with what Whisper heard", () => {
    expect(likenessEs("Son ochenta y cinco pesos con cincuenta centavos.", "Son $85.50.")).toBe(1);
    expect(likenessEs("Lo espero a las ocho y media.", "Lo espero a las 8:30.")).toBe(1);
    expect(likenessEs("Gracias.", "Adiós.")).toBeLessThan(0.6);
    expect(syllables("¿Qué le sirvo?")).toBe(4);
  });
  it("puts a phone line on a clip without changing its length or loudness", () => {
    const sr = 24000, x = new Float32Array(sr).map((_, i) => 0.2 * Math.sin((2 * Math.PI * 440 * i) / sr) + 0.1 * Math.sin((2 * Math.PI * 6000 * i) / sr));
    const y = withFx(x, sr, "phone");
    expect(y.length).toBe(x.length);
    const rms = (a: Float32Array) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
    expect(Math.abs(20 * Math.log10(rms(y)) - -19)).toBeLessThan(0.5);
    expect(withFx(x, sr)).toBe(x);
  });
});
