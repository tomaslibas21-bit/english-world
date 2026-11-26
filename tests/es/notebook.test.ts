import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EDITION } from "../../src/edition";
import { audioKey } from "../../src/audio-key";
import { NPCS } from "../../src/content/npcs";
import { npcVoice } from "../../src/content/voices";
import { emptyProgress, sitProgress } from "../../src/state/progress";
import { addCards, parseCards } from "../../src/state/cards";
import { courseCardsUrl, keepsakePockets, practicedRows, sourceName, unitRange } from "../../src/ui/notebookData";
import { notebookClips } from "../../src/ui/notebookAudio";
import { SITUATION_BY_ID } from "../../src/content/situations/catalog";
import { setVariety } from "../../src/convo/compose";

const lt = EDITION.helper === "lt";
const friday = "¿Estás libre el viernes?";
const line = { en: friday, sentence: { en: friday, lt: lt ? "Ar esi laisva penktadienį?" : "Are you free on Friday?" } };
const manifest = JSON.parse(readFileSync("public/audio-es/manifest.json", "utf8"));
const has = (v: string, s: number, t: string) => !!manifest[audioKey(v, s, t)];

describe("Puerto Colibrí notebook", () => {
  it.each([["f", "5642f36306d3"], ["m", "a48b409a5aba"]] as const)("finds the Friday take for %s", (gender, key) => {
    const clips = notebookClips(line, gender, has);
    expect(clips).toHaveLength(1);
    const { kind, voice, speed, text } = clips[0];
    expect(kind).toBe("phrase");
    expect(audioKey(voice, speed, text)).toBe(key);
  });
  it("checks the Mexican take for the saved wording after a variety change", () => {
    setVariety("spain");
    try {
      expect(notebookClips(line, "f", has)[0]?.voice).toBe("es_coach_f");
      const other = "Mi coche está en el aparcamiento.";
      expect(notebookClips({ en: other, sentence: { en: other, lt: "" } }, "f", has)).toEqual([]);
    } finally { setVariety("default"); }
  });
  it("checks the exact unit and authored spoken form independently", () => {
    const price = { en: "$30", sentence: { en: "Son $30.", say: "Son treinta pesos.", lt: lt ? "Trisdešimt pesų." : "Thirty pesos." } };
    expect(notebookClips(price, "f", () => true).map((c) => c.kind)).toEqual(["phrase", "source"]);
    expect(notebookClips(price, "f", (_v, _s, t) => t === price.sentence.say)).toMatchObject([{ kind: "source", text: price.sentence.say }]);
    expect(notebookClips({ ...price, en: price.sentence.en }, "f", () => true)).toMatchObject([{ kind: "phrase", text: price.sentence.say }]);
    expect(notebookClips(price, "f", () => false)).toEqual([]);
    // Punctuation and capitalization can distinguish a saved unit from its recorded sentence.
    const unit = { en: "treinta", sentence: { en: "Treinta.", lt: "30" } };
    expect(notebookClips(unit, "m", (_v, _s, t) => t === "Treinta.")).toMatchObject([{ kind: "source" }]);
  });
  it("uses an identified speaker's authored speed and preserves old and duplicate cards", () => {
    const original = parseCards([{ ...line, lt: line.sentence.lt, id: "legacy", situationId: "s83-invite-call",
      sourceLabel: "Old label", box: 5, due: 123, reviews: 7 }]);
    const speakerId = SITUATION_BY_ID["s68-hotel"].npc;
    const input = { ...line, lt: line.sentence.lt, situationId: "s68-hotel", speakerId };
    const fresh = parseCards(addCards([], [input], 0).cards);
    expect(notebookClips(fresh[0], "m", () => true)).toMatchObject([{ voice: npcVoice(NPCS[speakerId]), speed: NPCS[speakerId].speed ?? 1 }]);
    expect(addCards(original, [input], 0).cards).toEqual(original);
    expect(notebookClips(original[0], "m", has)[0].voice).toBe("es_coach_m");
    expect(sourceName("old-source", "Old label")).toBe("Old label");
  });
  it("uses a spoiler-free source for fresh and previously labeled Friday cards", () => {
    expect(sourceName("s83-invite-call")).toBe(lt ? "Pokalbis telefonu" : "Phone conversation");
    expect(sourceName("s83-invite-call", line.sentence.lt)).toBe(lt ? "Pokalbis telefonu" : "Phone conversation");
    expect(sourceName("s83-invite-call", "Pokalbis telefonu")).toBe(lt ? "Pokalbis telefonu" : "Phone conversation");
  });
  it("groups practiced rows by most recent source, including practice-only activities", () => {
    const row = (sitId: string, last: number) => ({ en: "¡Hola!", lt: lt ? "Labas!" : "Hi!", count: 4, sitId, last });
    const phrases = { a: row("x04-yaxche", 3), b: row("other", 4), c: row("x04-yaxche", 8) };
    expect(practicedRows(phrases).map(([id]) => id)).toEqual(["c", "a", "b"]);
    expect(practicedRows(phrases, "x04-yaxche").map(([id]) => id)).toEqual(["c", "a"]);
    expect(practicedRows(phrases, "unused")).toEqual([]);
  });
  it("collects one pocket per reward with one row per completed catalog situation", () => {
    const p = emptyProgress();
    for (const [id, n] of [["x10-loteria", 2], ["s72-cafe", 3], ["s67a-tickets", 1], ["s70-museum", 2], ["unknown", 1], ["s73-restaurant", 0]] as const)
      p.sits[id] = { ...sitProgress(p, id), completions: n };
    const pockets = keepsakePockets(p);
    expect(pockets.size).toBe(3);
    expect(pockets.get("loteria_card")?.map((s) => s.id)).toEqual(["x10-loteria"]);
    expect(pockets.get("ticket")?.map((s) => s.id).sort()).toEqual(["s67a-tickets", "s70-museum"]);
    expect(pockets.get("coffee_cup")).toHaveLength(1);
  });
  it("marks only a single complete unit", () => {
    expect(unitRange("¿Tiene una habitación libre?", "una habitación")).toEqual([7, 21]);
    expect(unitRange("No tengo boletos.", "en")).toBeUndefined();
    expect(unitRange("¿Dos cafés para dos?", "dos")).toBeUndefined();
    expect(unitRange("I can't go.", "can")).toBeUndefined();
  });
  it("links only an exported course build to its own collection", () => {
    const origin = "https://example.test";
    const route = lt ? "/korteles?mode=mine" : "/flashcards?mode=mine";
    expect(courseCardsUrl(undefined, "/", origin)).toBeUndefined();
    expect(courseCardsUrl("fluentsteps", "/", origin)).toBe(origin + route);
    expect(courseCardsUrl("fluentsteps", "https://course.test/home", origin)).toBe("https://course.test" + route);
    expect(courseCardsUrl("fluentsteps", "about:blank", origin)).toBeUndefined();
  });
});
