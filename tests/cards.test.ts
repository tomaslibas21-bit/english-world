import { describe, expect, it } from "vitest";
import type { Sentence } from "../src/convo/compose";
import {
  cleanText, cardKey, cardId, unitInput, sentenceInput, newCard, addCards, answerCard, isDue, dueCards, nextDue, daysUntil,
  removeCard, parseCards, loadCards, saveCards, exportCards, exportCardsJSON, useCards, startOfDay, addDays, INTERVALS, STORAGE_KEY,
  fluentSlug, fluentCard, mirrorToFluentSteps, FLUENT_CARDS_KEY,
  type CardInput,
} from "../src/state/cards";

// Olivia's first line in s68-hotel, as the composer builds it
const OLIVIA: Sentence = {
  en: "Good evening! Welcome to the Harborview. Checking in?",
  nat: "Labas vakaras! Sveiki atvykę į „Harborview“. Registruojatės?",
  say: "Good evening! Welcome to the Harborview. Checking in?",
  units: [
    { en: "Good", lt: "Labas" }, { en: "evening!", lt: "vakaras!" }, { en: "Welcome", lt: "Sveiki atvykę" }, { en: "to", lt: "į" },
    { en: "the", lt: "—" }, { en: "Harborview.", lt: "„Harborview“." }, { en: "Checking in?", lt: "Registruojatės?" },
  ],
};
const PRICE: Sentence = {
  en: "That's $30.", nat: "Tai 30 dolerių.", say: "That's thirty dollars.",
  units: [{ en: "That's", lt: "Tai" }, { en: "$30.", lt: "30 dolerių." }],
};

const T0 = new Date(2026, 8, 26, 15, 30).getTime(); // 26 Sep 2026, 15:30 local
const day = (d: number, h = 0, m = 0) => new Date(2026, 8, d, h, m).getTime();
const input = (en: string, lt = "x"): CardInput => ({ en, lt, sentence: { en, lt }, situationId: "s68-hotel" });

class MemStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, String(v)); }
}
const broken = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } };

describe("card text", () => {
  it("strips sentence punctuation and stray quotes, keeps apostrophes and abbreviations", () => {
    expect(cleanText("evening!")).toBe("evening");
    expect(cleanText("Checking in?")).toBe("Checking in");
    expect(cleanText("„Harborview“.")).toBe("„Harborview“");
    expect(cleanText("“Hello,")).toBe("Hello");
    expect(cleanText("please.”")).toBe("please");
    expect(cleanText("I'd like")).toBe("I'd like");
    expect(cleanText("Mr.")).toBe("Mr.");
    expect(cleanText("at 7 a.m.,")).toBe("at 7 a.m.");
    expect(cleanText("  a   room  ")).toBe("a room");
  });
  it("compares by a normalized key", () => {
    expect(cardKey("Evening!")).toBe("evening");
    expect(cardKey("I’d like")).toBe(cardKey("i'd like"));
    expect(cardKey("Checking  in?")).toBe("checking in");
  });
  it("gives the same phrase the same id, and another id on a clash", () => {
    expect(cardId("Checking in?")).toBe(cardId("checking in"));
    expect(cardId("checking in")).not.toBe(cardId("check-out"));
    expect(cardId("checking in")).toMatch(/^ew-[0-9a-z]+$/);
    const taken = new Set([cardId("room")]);
    expect(cardId("room", taken)).toBe(cardId("room") + "-2");
  });
});

describe("a tapped word → a card", () => {
  it("takes the unit and its gloss, without the capital that only starts a sentence", () => {
    expect(unitInput(OLIVIA, 0, "s68-hotel")).toMatchObject({ en: "good", lt: "labas", situationId: "s68-hotel" });
    expect(unitInput(OLIVIA, 1, "s68-hotel")).toMatchObject({ en: "evening", lt: "vakaras" });
    expect(unitInput(OLIVIA, 2, "s68-hotel")).toMatchObject({ en: "welcome", lt: "sveiki atvykę" }); // after "evening!"
    expect(unitInput(OLIVIA, 5, "s68-hotel")).toMatchObject({ en: "Harborview", lt: "„Harborview“" }); // mid-sentence name
    expect(unitInput(OLIVIA, 6, "s68-hotel")).toMatchObject({ en: "checking in", lt: "registruojatės" });
  });
  it("keeps the source sentence (and its spoken form when different)", () => {
    const c = unitInput(OLIVIA, 6, "s68-hotel")!;
    expect(c.sentence).toEqual({ en: OLIVIA.en, lt: OLIVIA.nat });
    expect(unitInput(PRICE, 1, "s68-hotel")!.sentence).toEqual({ en: "That's $30.", lt: "Tai 30 dolerių.", say: "That's thirty dollars." });
  });
  it("has nothing of its own for a unit glossed \"—\" (the whole sentence is saved instead)", () => {
    expect(unitInput(OLIVIA, 4, "s68-hotel")).toBeNull();
    expect(sentenceInput(OLIVIA, "s68-hotel")).toMatchObject({ en: OLIVIA.en, lt: OLIVIA.nat, sentence: { en: OLIVIA.en, lt: OLIVIA.nat } });
  });
  it("keeps capitals of names, of I and of abbreviations", () => {
    const s: Sentence = { en: "Olivia can help. I think so.", nat: "", say: "", units: [
      { en: "Olivia", lt: "Olivija" }, { en: "can help.", lt: "gali padėti." }, { en: "I", lt: "Aš" }, { en: "think so.", lt: "taip manau." }] };
    expect(unitInput(s, 0, "x", (w) => w === "Olivia")!.en).toBe("Olivia");
    expect(unitInput(s, 2, "x")!.en).toBe("I");
    expect(unitInput(s, 1, "x")!.en).toBe("can help");
  });
  it("adds IPA only when every word is known", () => {
    expect(unitInput(OLIVIA, 6, "s68-hotel")!.ipa).toMatch(/ɪn$/);
    const s: Sentence = { en: "the Zorblax room", nat: "", say: "", units: [{ en: "the Zorblax room", lt: "Zorblakso kambarys" }] };
    expect(unitInput(s, 0, "x")!.ipa).toBeUndefined(); // no gaps in the middle
  });
});

describe("Leitner schedule", () => {
  it("starts new cards in box 1, due today", () => {
    const c = newCard(input("checking in"), T0);
    expect(c).toMatchObject({ box: 1, createdAt: T0, due: day(26) });
    expect(isDue(c, T0)).toBe(true);
  });
  it("moves a known card up a box: 1 → 2 → 3 → 4 → 5 with 2, 4, 8, 16 days to wait", () => {
    let c = newCard(input("room"), T0), now = T0;
    const waits: number[] = [];
    for (let i = 0; i < 5; i++) {
      c = answerCard(c, true, now);
      waits.push(daysUntil(c.due, now));
      now = c.due + 9 * 3_600_000; // review it on the day it's due, at 9:00
    }
    expect(waits).toEqual([2, 4, 8, 16, 16]);
    expect(c.box).toBe(5);
    expect(c.reviews).toBe(5);
  });
  it("sends a forgotten card back to box 1, due tomorrow", () => {
    const c = answerCard({ ...newCard(input("key card"), T0), box: 4 }, false, T0);
    expect(c).toMatchObject({ box: 1, due: day(27), lapses: 1, lastReview: T0 });
    expect(isDue(c, day(26, 23, 59))).toBe(false);
    expect(isDue(c, day(27))).toBe(true);
  });
  it("uses the interval list 1, 2, 4, 8, 16", () => {
    expect([...INTERVALS]).toEqual([1, 2, 4, 8, 16]);
  });
  it("counts calendar days (DST changes don't shift the due day)", () => {
    const oct24 = new Date(2026, 9, 24, 20, 0).getTime(); // the EU clocks go back on 25 Oct 2026
    const due = addDays(oct24, 2);
    expect(new Date(due).getDate()).toBe(26);
    expect(new Date(due).getHours()).toBe(0);
    expect(startOfDay(due)).toBe(due);
  });
  it("lists due cards (longest waiting first) and when the next one comes", () => {
    const a = { ...newCard(input("a"), T0), due: day(25) };
    const b = { ...newCard(input("b"), T0), due: day(20), box: 3 };
    const c = { ...newCard(input("c"), T0), due: day(29) };
    expect(dueCards([a, b, c], T0).map((x) => x.en)).toEqual(["b", "a"]);
    expect(nextDue([a, b, c], T0)).toBe(day(29));
    expect(nextDue([a, b], T0)).toBeNull();
  });
});

describe("adding and removing", () => {
  it("doesn't add the same English twice", () => {
    const r1 = addCards([], [input("Checking in?"), input("checking in"), input("room")], T0);
    expect(r1.added.map((c) => c.en)).toEqual(["Checking in?", "room"]);
    const r2 = addCards(r1.cards, [input("Room"), input("key")], T0);
    expect(r2.added.map((c) => c.en)).toEqual(["key"]);
    expect(r2.cards).toHaveLength(3);
    expect(addCards(r2.cards, [input("key")], T0).cards).toBe(r2.cards); // nothing new: same list
  });
  it("skips empty cards", () => {
    expect(addCards([], [input("  !! "), input("word", " ")], T0).added).toHaveLength(0);
  });
  it("removes by id", () => {
    const { cards } = addCards([], [input("a"), input("b")], T0);
    expect(removeCard(cards, cards[0].id).map((c) => c.en)).toEqual(["b"]);
  });
});

describe("storage", () => {
  it("saves and loads", () => {
    const st = new MemStorage();
    const { cards } = addCards([], [unitInput(OLIVIA, 6, "s68-hotel")!, sentenceInput(PRICE, "s68-hotel")], T0);
    const reviewed = [answerCard(cards[0], true, T0), cards[1]];
    expect(saveCards(reviewed, st)).toBe(true);
    expect(loadCards(st)).toEqual(reviewed);
    expect(JSON.parse(st.getItem(STORAGE_KEY)!)).toMatchObject({ v: 1 });
  });
  it("never throws: blocked or missing storage, broken JSON", () => {
    expect(loadCards(broken)).toEqual([]);
    expect(saveCards([], broken)).toBe(false);
    expect(loadCards(null)).toEqual([]);
    expect(saveCards([], null)).toBe(false);
    const st = new MemStorage();
    st.setItem(STORAGE_KEY, "{not json");
    expect(loadCards(st)).toEqual([]);
  });
  it("repairs what it can and drops the rest", () => {
    const cards = parseCards({ v: 1, cards: [
      null, 7, { en: "" }, { en: "room" }, // no Lithuanian
      { en: "room", lt: "kambarys", box: 9, due: "soon", sentence: "?" },
      { en: "Room!", lt: "kambarį" }, // the same card again
      { id: "ew-x", en: "key", lt: "raktas", box: 0, createdAt: T0, ipa: "ki", reviews: 2, sentence: { en: "Your key.", lt: "Jūsų raktas." } },
    ] }, T0);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ en: "room", lt: "kambarys", box: 5, due: day(26), sentence: { en: "room", lt: "kambarys" }, situationId: "" });
    expect(cards[1]).toMatchObject({ id: "ew-x", box: 1, ipa: "ki", reviews: 2, sentence: { en: "Your key.", lt: "Jūsų raktas." } });
    expect(parseCards("nonsense")).toEqual([]);
    expect(parseCards([{ en: "a", lt: "b" }], T0)).toHaveLength(1); // a bare list works too
  });
});

describe("export for English Master", () => {
  it("is simple JSON with ISO times and local due dates", () => {
    const { cards } = addCards([], [unitInput(OLIVIA, 6, "s68-hotel")!, sentenceInput(PRICE, "s68-hotel")], T0);
    const done = [answerCard(cards[0], true, T0), cards[1]];
    const ex = exportCards(done, T0);
    expect(ex).toMatchObject({ format: "english-world-cards", version: 1, exportedAt: new Date(T0).toISOString() });
    expect(ex.cards[0]).toMatchObject({
      id: cards[0].id, en: "checking in", lt: "registruojatės", situationId: "s68-hotel", box: 2, due: "2026-09-28",
      createdAt: new Date(T0).toISOString(), sentence: { en: OLIVIA.en, lt: OLIVIA.nat },
    });
    expect(ex.cards[1].sentence).toEqual({ en: "That's $30.", lt: "Tai 30 dolerių." }); // no internal voice key
    expect(Object.keys(ex.cards[1]).sort()).toEqual(["box", "createdAt", "due", "en", "id", "lt", "sentence", "situationId"].concat(ex.cards[1].ipa ? ["ipa"] : []).sort());
    expect(JSON.parse(exportCardsJSON(done, T0))).toEqual(ex);
  });
});

describe("the store", () => {
  it("adds once, reviews and removes (in memory when there's no storage)", () => {
    const st = useCards.getState();
    const c = st.add(input("late check-out", "vėlyvas išsiregistravimas"))!;
    expect(c.box).toBe(1);
    expect(useCards.getState().add(input("Late check-out!"))!.id).toBe(c.id);
    expect(useCards.getState().keys.has("late check-out")).toBe(true);
    expect(useCards.getState().addMany([input("late check-out"), input("towels", "rankšluosčiai")])).toBe(1);
    useCards.getState().answer(c.id, true);
    expect(useCards.getState().cards.find((x) => x.id === c.id)!.box).toBe(2);
    useCards.getState().remove(c.id);
    expect(useCards.getState().cards.some((x) => x.id === c.id)).toBe(false);
    expect(useCards.getState().keys.has("late check-out")).toBe(false);
  });
});

describe("English Master (Fluent Steps) flashcards", () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
  const word = newCard({ en: "Checking in", lt: "Registruojatės", sentence: { en: OLIVIA.en, lt: OLIVIA.nat }, situationId: "s68-hotel" }, 0);

  it("uses the course's slugs for its card ids", () => {
    expect(fluentSlug("Checking in?")).toBe("checking-in");
    expect(fluentSlug("I’m (really) fine")).toBe("i'm-fine");
    expect(fluentCard(word, 5).id).toBe("word:checking-in|registruojatės");
  });

  it("makes a new \"Mano žodžiai\" card: Lithuanian front, English back, the sentence as the note", () => {
    const c = fluentCard(word, 5);
    expect(c).toMatchObject({ deck: "words", kind: "phrase", front: "Registruojatės", back: "Checking in", note: OLIVIA.en, source: { kind: "custom" }, added: 5 });
    expect(c.srs).toMatchObject({ reviews: 0, due_at: null, interval_days: 0, ease_factor: 2.5 });
  });

  it("adds new cards first, keeps the course's own cards, and skips ones already there", () => {
    const st = mem();
    st.setItem(FLUENT_CARDS_KEY, JSON.stringify({ version: 1, cards: [{ id: "line:s1:hello", deck: "lines" }] }));
    expect(mirrorToFluentSteps([word], 5, st)).toBe(1);
    expect(mirrorToFluentSteps([word], 6, st)).toBe(0);
    const saved = JSON.parse(st.getItem(FLUENT_CARDS_KEY)!);
    expect(saved.version).toBe(1);
    expect(saved.cards.map((c: { id: string }) => c.id)).toEqual(["word:checking-in|registruojatės", "line:s1:hello"]);
  });

  it("starts the course's store when it has none, and survives broken data", () => {
    const st = mem();
    expect(mirrorToFluentSteps([word], 5, st)).toBe(1);
    st.setItem(FLUENT_CARDS_KEY, "{not json");
    expect(mirrorToFluentSteps([word], 5, st)).toBe(0);
    expect(mirrorToFluentSteps([word], 5, null)).toBe(0);
  });
});
