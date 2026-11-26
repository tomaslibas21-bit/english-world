import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { audioKey } from "../src/audio-key";
import { NPCS } from "../src/content/npcs";
import { npcVoice } from "../src/content/voices";
import { emptyProgress, sitProgress } from "../src/state/progress";
import { addCards, parseCards } from "../src/state/cards";
import { courseCardsUrl, keepsakePockets, practicedRows, sourceName, unitRange } from "../src/ui/notebookData";
import { notebookClips } from "../src/ui/notebookAudio";

const friday = "Are you free on Friday?";
const line = { en: friday, sentence: { en: friday, lt: "Ar turi laiko penktadienį?" } };
const manifest = JSON.parse(readFileSync("public/audio-v2/manifest.json", "utf8"));
const has = (v: string, s: number, t: string) => !!manifest[audioKey(v, s, t)];

describe("Maple Harbor notebook", () => {
  it.each([["f", "5fb44353be01"], ["m", "e6086c3c84ee"]] as const)("finds the Friday take for %s", (gender, key) => {
    const clips = notebookClips(line, gender, has);
    expect(clips).toHaveLength(1);
    const { kind, voice, speed, text } = clips[0];
    expect(kind).toBe("phrase");
    expect(audioKey(voice, speed, text)).toBe(key);
  });
  it("checks the exact unit and authored spoken form independently", () => {
    const price = { en: "$30", sentence: { en: "That's $30.", say: "That's thirty dollars.", lt: "Trisdešimt dolerių." } };
    expect(notebookClips(price, "f", () => true).map((c) => c.kind)).toEqual(["phrase", "source"]);
    expect(notebookClips(price, "f", (_v, _s, t) => t === price.sentence.say)).toMatchObject([{ kind: "source", text: price.sentence.say }]);
    expect(notebookClips({ ...price, en: price.sentence.en }, "f", () => true)).toMatchObject([{ kind: "phrase", text: price.sentence.say }]);
    expect(notebookClips(price, "f", () => false)).toEqual([]);
  });
  it("uses an identified speaker's authored speed and preserves old and duplicate cards", () => {
    const original = parseCards([{ ...line, lt: line.sentence.lt, id: "legacy", situationId: "s83-invite-call",
      sourceLabel: "Old label", box: 5, due: 123, reviews: 7 }]);
    const input = { ...line, lt: line.sentence.lt, situationId: "s68-hotel", speakerId: "olivia" };
    const fresh = parseCards(addCards([], [input], 0).cards);
    expect(notebookClips(fresh[0], "m", () => true)).toMatchObject([{ voice: npcVoice(NPCS.olivia), speed: NPCS.olivia.speed ?? 1 }]);
    expect(addCards(original, [input], 0).cards).toEqual(original);
    expect(notebookClips(original[0], "m", has)[0].voice).toBe("g_coach_m");
    expect(sourceName("old-source", "Old label")).toBe("Old label");
  });
  it("groups practiced rows by most recent source, including practice-only activities", () => {
    const row = (sitId: string, last: number) => ({ en: "Hi!", lt: "Labas!", count: 4, sitId, last });
    const phrases = { a: row("tree", 3), b: row("other", 4), c: row("tree", 8) };
    expect(practicedRows(phrases).map(([id]) => id)).toEqual(["c", "a", "b"]);
    expect(practicedRows(phrases, "tree").map(([id]) => id)).toEqual(["c", "a"]);
    expect(practicedRows(phrases, "unused")).toEqual([]);
  });
  it("collects one pocket per reward with one row per completed catalog situation", () => {
    const p = emptyProgress();
    for (const [id, n] of [["s72-cafe", 3], ["s67a-tickets", 1], ["s70-museum", 2], ["unknown", 1], ["s73-restaurant", 0]] as const)
      p.sits[id] = { ...sitProgress(p, id), completions: n };
    const pockets = keepsakePockets(p);
    expect(pockets.size).toBe(2);
    expect(pockets.get("ticket")?.map((s) => s.id).sort()).toEqual(["s67a-tickets", "s70-museum"]);
    expect(pockets.get("coffee_cup")).toHaveLength(1);
  });
  it("marks only a single complete unit", () => {
    expect(unitRange("Checking in?", "checking in")).toEqual([0, 11]);
    expect(unitRange("It is inside.", "in")).toBeUndefined();
    expect(unitRange("Can I have a can?", "can")).toBeUndefined();
    expect(unitRange("I can't go.", "can")).toBeUndefined();
  });
  it("links only an exported course build to its own collection", () => {
    const origin = "https://example.test";
    expect(courseCardsUrl(undefined, "/", origin)).toBeUndefined();
    expect(courseCardsUrl("fluentsteps", "/", origin)).toBe(origin + "/korteles?mode=mine");
    expect(courseCardsUrl("fluentsteps", "https://course.test/home", origin)).toBe("https://course.test/korteles?mode=mine");
    expect(courseCardsUrl("fluentsteps", "about:blank", origin)).toBeUndefined();
  });
});
