import { describe, expect, it } from "vitest";
import { emptyProgress, stars } from "../src/state/progress";
import { emptyPlayStats } from "../src/state/playStats";
import { loadCards } from "../src/state/cards";
import { bookCatalog, courseStamps, readCourse, songCatalog } from "../src/passport/course";
import { presentation, presentationPrefix } from "../src/passport/presentation";
import { townStamps } from "../src/passport/stamps";
import { keepsakeNames } from "../src/passport/words";

const cafe = "s72-cafe";
const saved = (completions: number, used: string[] = [], twists: string[] = []) => ({ completions, visits: 1, used, twists, memory: {} });
const ids = (n: number) => Array.from({ length: n }, (_, i) => "phrase-" + i);
function town(n = 0, used: string[] = [], twists: string[] = []) {
  const p = emptyProgress();
  p.sits[cafe] = saved(n, used, twists);
  return townStamps(p, 0, true);
}
describe("Maple Harbor town stamps", () => {
  it("uses the owner's English keepsake names", () => {
    expect(keepsakeNames).toEqual({
      cue_chalk: "Pool chalk",
      passport_stamp: "Passport stamp",
      boarding_pass: "Boarding pass",
      baggage_tag: "Baggage claim ticket",
      ticket: "Ticket",
      room_key: "Room key",
      home_key: "Apartment key",
      car_key: "Car key",
      map: "Town map",
      coffee_cup: "Coffee cup",
      receipt: "Receipt",
      shopping_bag: "Shopping bag",
      business_card: "Business card",
      badge: "Employee badge",
      note: "Note",
      flower: "Flower",
      balloon: "Balloon",
      water_bottle: "Water bottle",
      prescription: "Prescription",
      wallet: "Wallet",
      slate_pebble: "Small slate pebble",
      oak_leaf: "Oak leaf",
    });
  });
  it.each([[0, 0, 0, 0], [1, 5, 0, 1], [1, 6, 0, 2], [2, 6, 2, 3], [3, 0, 0, 2]])(
    "matches the journal for %i completions, %i expressions and %i twists", (n, u, t, expected) => {
      const rows = town(n, ids(u), ids(t));
      const sit = rows.find(r => r.id === "situations:" + cafe)!;
      expect(sit.stars).toBe(stars(saved(n, ids(u), ids(t))));
      expect(sit.stars).toBe(expected);
      expect(sit.href).toBe("/situacijos/S72");
      expect(rows.filter(r => r.earned).map(r => r.id)).toEqual(n ? ["situations:" + cafe, "places:sunny-cup", "keepsakes:coffee_cup"] : []);
    });
  it("deduplicates old expressions and twists and ignores broken counters", () => {
    expect(town(2, Array(6).fill("one"), ["a", "a"]).find(r => r.id === "situations:" + cafe)?.stars).toBe(1);
    const p = emptyProgress();
    Object.assign(p.sits, { fake: saved(10), [cafe]: saved(Infinity), "s90-running-late": { completions: "1" } });
    expect(townStamps(p, 0, false).some(r => r.earned || r.href)).toBe(false);
    p.sits = null!;
    expect(townStamps(p, 0, false).some(r => r.earned)).toBe(false);
  });
  it("groups ticket sources and never credits a workplace for a remote call", () => {
    const p = emptyProgress();
    for (const id of ["s70-museum", "s67a-tickets", "s89-video-call", "s65a-passport"]) p.sits[id] = saved(1);
    const done = townStamps(p, 0, true).filter(s => s.earned);
    expect(done.find(r => r.id === "keepsakes:ticket")?.proof).toHaveLength(2);
    expect(done.some(r => r.id === "places:office" || r.id === "places:phone")).toBe(false);
    expect(done.some(r => r.id === "keepsakes:passport_stamp")).toBe(true);
  });
  it("uses counted game starts and the live deck; ignores phrases, pictures, and uncounted games", () => {
    const p = emptyProgress();
    p.seenIntro[cafe] = true;
    p.place = { zone: "sunny-cup", x: 0, z: 0, rot: 0 };
    p.phrases.test = { en: "please", lt: "prašau", sitId: cafe, count: 1, last: 1 };
    p.play = { ...emptyPlayStats(), games: { taxi: 2, gofish: 1, loteria: 3, madeup: 2, road: -1 } };
    const done = (n: number) => townStamps(p, n, false).filter(r => r.earned);
    expect(done(1).map(r => r.id)).toEqual(["games:taxi", "games:gofish", "cards:pocket"]);
    expect(done(0)[0].proof[0].en).toBe("Games started · 2");
    expect(done(0)).toHaveLength(2);
  });
  it("rejects future card save versions while preserving supported old decks", () => {
    const card = { en: "Hello", lt: "Labas" };
    const load = (v: unknown) => loadCards({ getItem: () => JSON.stringify(v), setItem() {} });
    expect(load({ v: 2, cards: [card] })).toHaveLength(0);
    expect(load([card])).toHaveLength(1);
    expect(load({ v: 1, cards: [card, card, null] })).toHaveLength(1);
  });
});
describe("English Master pages", () => {
  const item = (id: string) => ({ id, title: id, title_lt: id });
  const chapters = ["BOOK-CANT-INTRO", "BOOK-CANT-01"].map(item);
  const books = bookCatalog({ books: [{ ...item("BOOK-CANT"), chapters }] });
  const songs = songCatalog({ songs: [{ id: "G01", t: "The Long Way Home", a: "/songs/audio/G01.mp3" }] });
  const ids = (items: Record<string, unknown>) => courseStamps({ books, songs }, items).filter(c => c.earned).map(c => c.id);
  it("credits indexed positive timestamps and exposes both proofs for one chapter", () => {
    const items = { "songs:G01": { heard: 9 }, "songs:G99": { heard: 8 }, "books:BOOK-CANT-01": { heard: 5, read: 3 } };
    expect(ids(items)).toEqual(["songs:G01", "books:BOOK-CANT-01"]);
    const rows = courseStamps({ books, songs }, items);
    expect(rows[0].href).toBe("/songs/G01");
    expect(rows.at(-1)?.href).toBe("/knygos/BOOK-CANT-01");
    expect(rows.at(-1)?.proof.map(p => p.en)).toEqual(["Read in the course", "Heard in the course", "Chapters completed · 1/2"]);
    expect(ids({ ...items, "books:BOOK-CANT-INTRO": { read: 1 } })).toContain("covers:BOOK-CANT");
  });
  it("ignores opens, unknown versions, invalid chapters and unavailable catalogs", () => {
    expect(ids({ "songs:G01": { heard: Infinity, read: 1 }, "books:BOOK-CANT-01": { first: 3, last: 4, opens: 2 } })).toEqual([]);
    expect(readCourse(JSON.stringify({ version: 2, items: { "songs:G01": { heard: 1 } } }))).toEqual({});
    expect(readCourse("{")).toEqual({});
    expect(bookCatalog({ books: [{ ...item("BOOK-CANT"), chapters: [...chapters, null] }] })).toEqual([]);
    expect(courseStamps({}, { "songs:G01": { heard: 9 } })).toEqual([]);
  });
});
describe("visual presentation history", () => {
  it.each([false, true])("baselines, merges individual IDs and survives denied storage (%s)", denied => {
    const kv = new Map<string, string>();
    const storage = { get length() { return kv.size; }, key: (i: number) => [...kv.keys()][i],
      getItem(k: string) { if (denied) throw Error(); return kv.get(k) ?? null; },
      setItem(k: string, v: string) { if (denied) throw Error(); kv.set(k, v); }, removeItem(k: string) { kv.delete(k); } } as Storage;
    const key = presentationPrefix(false, denied ? 101 : 100);
    const a = presentation(key, storage), b = presentation(key, storage);
    expect(a.pending(["situations:a"])).toBeNull();
    a.presentBaseline(["situations:a"]);
    expect(b.pending(["situations:a", "games:b", "cards:pocket"])).toEqual(["games:b", "cards:pocket"]);
    a.present("cards:pocket"); b.present("games:b");
    expect(a.pending(["situations:a", "games:b"])).toEqual([]);
    expect(b.pending(["cards:pocket"])).toEqual([]);
    const fresh = presentation(presentationPrefix(false, 102 + Number(denied)), storage);
    expect(fresh.pending([])).toBeNull();
    fresh.presentBaseline([]);
    expect([...kv.keys()].some(k => k.startsWith(key))).toBe(false);
    expect(a.pending([])).toBeNull();
  });
});
