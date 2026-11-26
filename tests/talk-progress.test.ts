import { describe, expect, it, vi } from "vitest";
import { TalkProgress, readTalkProgress, type TalkBookmark } from "../src/radio/talkProgress";

const cant = { itemKey: "book/BOOK-CANT/author", chapterId: "BOOK-CANT-01" } as const;
const cant2 = { ...cant, chapterId: "BOOK-CANT-02" };
const gatsby = { itemKey: "book/BOOK-GATSBY/easy", chapterId: "BOOK-GATSBY-01" } as const;
const scene = { itemKey: "scene/s72-cafe/mh", chapterId: "s72-cafe" } as const;
const sample = (changes: Partial<TalkBookmark> = {}) => ({
  sentence: "BOOK-CANT-01-S003", leg: "lt" as const, offsetSec: 0.8, textHash: "abc12345",
  fraction: 0.07, complete: false, audioVersion: "12345678", ...changes,
});

function memory() {
  const data = new Map<string, string>();
  const storage = { getItem: vi.fn((k) => data.get(k) ?? null), setItem: vi.fn((k, v) => { data.set(k, v); }) };
  const events = new EventTarget();
  const send = (key: string, newValue: string | null) => {
    const event = Object.assign(new Event("storage"), { key, newValue, storageArea: storage });
    events.dispatchEvent(event);
  };
  return { storage, events, send };
}

describe("talk progress ledger", () => {
  it("writes one validated update with isolated books, editions, and scenes", () => {
    const { storage } = memory();
    const ledger = new TalkProgress("em-lt", { storage, now: () => 99 });
    const prefs = { ...ledger.getSnapshot().prefs, mode: "helper" as const };
    ledger.checkpoint(cant, sample(), prefs);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[0][0]).toBe("ew-talk-v1:em-lt");
    ledger.checkpoint(gatsby, sample({ offsetSec: 1.8, sentence: "BOOK-GATSBY-01-S002" }));
    ledger.checkpoint(scene, sample({ sentence: "s72-cafe-001", leg: "en" }));
    const loaded = new TalkProgress("em-lt", { storage });
    expect(loaded.get(cant)).toMatchObject({ offsetSec: 0.8, leg: "lt" });
    expect(loaded.get(gatsby)?.offsetSec).toBe(1.8);
    expect(loaded.get({ ...gatsby, itemKey: "book/BOOK-GATSBY/author" })).toBeUndefined();
    expect(loaded.getSnapshot()).toMatchObject({ lastScene: scene.itemKey, prefs });
  });

  it("selects the freshest unfinished book or story and preserves completion through replays", () => {
    const { storage } = memory();
    let now = 0;
    const ledger = new TalkProgress("em-lt", { storage, now: () => ++now });
    ledger.checkpoint(cant, sample());
    ledger.checkpoint(gatsby, sample());
    expect(ledger.continueListening()).toEqual(gatsby);
    ledger.checkpoint(gatsby, sample({ complete: true, fraction: 1 }));
    ledger.checkpoint(gatsby, sample({ complete: false, fraction: 0.1, offsetSec: 0.5 }));
    ledger.checkpoint(scene, sample({ sentence: "s72-cafe-001" }));
    expect(ledger.continueListening()).toEqual(cant);
    expect(ledger.get(gatsby)).toMatchObject({ complete: true, fraction: 0.1 });
    expect(ledger.getSnapshot().lastBook).toBe(gatsby.itemKey);
    expect(ledger.getSnapshot().lastScene).toBe(scene.itemKey);
  });

  it("uses memory if storage access and writes are denied", () => {
    const denied = () => { throw new Error("denied"); };
    const ledger = new TalkProgress("em-lt", { storage: { getItem: denied, setItem: denied } });
    ledger.checkpoint(cant, sample());
    expect(ledger.get(cant)).toMatchObject({ offsetSec: 0.8 });
    expect(ledger.continueListening()).toEqual(cant);
  });

  it("ignores corrupt notes, malformed values and unknown fields", () => {
    expect(readTalkProgress("em-lt", "{").items).toEqual({});
    expect(readTalkProgress("em-lt", '{"v":2,"items":{}}').items).toEqual({});
    const data = readTalkProgress("em-lt", JSON.stringify({
      v: 1, lastBook: "bad", items: {
        [cant.itemKey]: { lastChapter: "../other", chapters: {
          [cant.chapterId]: { ...sample(), updatedAt: 10, token: "secret" },
          [cant2.chapterId]: sample({ offsetSec: -2, updatedAt: 1 }),
          wrongLeg: sample({ leg: "es", updatedAt: 1 }),
          wrongFraction: sample({ fraction: 2, updatedAt: 1 }),
          wrongNumber: sample({ updatedAt: Infinity }),
          wrongType: { ...sample(), complete: "true", updatedAt: 1 },
          unsafeVersion: { ...sample(), audioVersion: "file?t=secret", updatedAt: 1 },
        } },
        "book/../author": { chapters: { bad: sample({ updatedAt: 2 }) } },
        [scene.itemKey]: { chapters: { anotherScene: sample({ updatedAt: 2 }) } },
      },
      prefs: { mode: "bogus", rates: { en: 2, lt: 1.5, es: 1 }, autoplay: "false", interlinear: false },
      sleep: 15,
    }));
    expect(Object.keys(data.items)).toEqual([cant.itemKey]);
    expect(Object.keys(data.items[cant.itemKey]!.chapters)).toEqual([cant.chapterId]);
    expect(data.items[cant.itemKey]?.lastChapter).toBe(cant.chapterId);
    expect(data.prefs).toEqual({ mode: "paired", rates: { en: 0.75, lt: 1.5 }, autoplay: true, interlinear: false });
    expect(JSON.stringify(data)).not.toMatch(/secret|sleep/);
  });

  it("merges racing tabs by chapter and keeps newer positions and any completion", () => {
    const { storage, events, send } = memory();
    let now = 100;
    const a = new TalkProgress("em-lt", { storage, events, now: () => ++now });
    const b = new TalkProgress("em-lt", { storage, events, now: () => ++now });
    a.checkpoint(cant, sample({ complete: true, fraction: 1 }));
    const older = storage.getItem(a.key)!;
    // Simulate both tabs reading an empty note before either write reached the other tab.
    storage.getItem.mockReturnValueOnce(null);
    b.checkpoint(cant2, sample({ sentence: "BOOK-CANT-02-S001" }));
    const newer = storage.getItem(a.key)!;
    expect(Object.keys(b.getSnapshot().items[cant.itemKey]!.chapters)).toEqual([cant2.chapterId]);
    send(a.key, older);
    send(a.key, newer);
    const reopened = new TalkProgress("em-lt", { storage });
    for (const ledger of [a, b, reopened]) {
      expect(ledger.get(cant)?.complete).toBe(true);
      expect(ledger.get(cant2)?.sentence).toBe("BOOK-CANT-02-S001");
    }
    b.checkpoint(cant, sample({ offsetSec: 1.2 }));
    send(a.key, storage.getItem(a.key));
    send(a.key, older);
    expect(a.get(cant)).toMatchObject({ offsetSec: 1.2, complete: true });
    a.dispose();
    b.dispose();
  });

  it("isolates both Spanish learner profiles on the same origin", () => {
    const { storage, events, send } = memory();
    const sm = new TalkProgress("sm-lt", { storage, events });
    const sme = new TalkProgress("sme-en", { storage, events });
    const book = { itemKey: "book/BK01/standard", chapterId: "BK01-01" } as const;
    sme.checkpoint(book, sample({ sentence: "BK01-01-001", leg: "en" }));
    send(sme.key, storage.getItem(sme.key));
    expect(sm.get(book)).toBeUndefined();
    expect(sme.get(book)?.leg).toBe("en");
    expect(sm.getSnapshot().prefs.rates).toEqual({ es: 0.75, lt: 1 });
  });
});
