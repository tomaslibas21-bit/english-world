// Puerto Colibrí's Gemini voices (docs/es/VOICES.md): the voice ids and the one switch for Mexican or neutral Spanish,
// the casting, the directions, and the batch tool's spelling and checks. Nothing here calls Gemini.
import { afterEach, describe, expect, it } from "vitest";
import { NPCS } from "../../src/content/npcs";
import { ambientVoice, audioDir, coachVoice, coachVoices, npcVoice } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { chooseVariety } from "../../src/state/variety";
import { ACCENTS, CAST, SCENES, accentOf, castingProblems, roleOf, styleFor, whoOf } from "../../tools/es-voices/casting-es";
import { geminiTextEs, likenessEs, numbersToDigitsEs, syllables, withFx } from "../../tools/es-voices/voice-batch-es";

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
