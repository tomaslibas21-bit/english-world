import { describe, expect, it } from "vitest";
import { emptyProgress, stars } from "../../src/state/progress";
import { emptyPlayStats } from "../../src/state/playStats";
import { loadCards } from "../../src/state/cards";
import { bookCatalog, courseStamps, readCourse, songCatalog } from "../../src/passport/course";
import { presentation, presentationPrefix } from "../../src/passport/presentation";
import { townStamps } from "../../src/passport/stamps";
import { courseProfile } from "../../src/passport/profile";
import { EDITION } from "../../src/edition";
import { SITUATION_BY_ID } from "../../src/content/situations/catalog";
import { KEEPSAKES, KIND, type KeepsakeKind } from "../../src/content/keepsakes";
import { L } from "../../src/ui/i18n";

const sm = EDITION.helper === "lt";
const profile = courseProfile("es", EDITION.helper, "fluentsteps")!;

const cafe = "s72-cafe";
const saved = (completions: number, used: string[] = [], twists: string[] = []) => ({ completions, visits: 1, used, twists, memory: {} });
const ids = (n: number) => Array.from({ length: n }, (_, i) => "phrase-" + i);
function town(n = 0, used: string[] = [], twists: string[] = []) {
  const p = emptyProgress();
  p.sits[cafe] = saved(n, used, twists);
  return townStamps(p, 0, profile);
}
describe("Puerto Colibrí town stamps", () => {
  it.each([[0, 0, 0, 0], [1, 5, 0, 1], [1, 6, 0, 2], [2, 6, 2, 3], [3, 0, 0, 2]])(
    "matches the journal for %i completions, %i expressions and %i twists", (n, u, t, expected) => {
      const rows = town(n, ids(u), ids(t));
      const sit = rows.find(r => r.id === "situations:" + cafe)!;
      expect(sit.stars).toBe(stars(saved(n, ids(u), ids(t))));
      expect(sit.stars).toBe(expected);
      expect(sit.href).toBe(sm ? "/situacijos/SS11" : "/situations/SS11");
      expect(rows.filter(r => r.earned).map(r => r.id)).toEqual(n ? ["situations:" + cafe, "places:sunny-cup", "keepsakes:coffee_cup"] : []);
    });
  it("deduplicates old expressions and twists and ignores broken counters", () => {
    expect(town(2, Array(6).fill("one"), ["a", "a"]).find(r => r.id === "situations:" + cafe)?.stars).toBe(1);
    const p = emptyProgress();
    Object.assign(p.sits, { fake: saved(10), [cafe]: saved(Infinity), "s90-running-late": { completions: "1" } });
    expect(townStamps(p, 0, null).some(r => r.earned || r.href)).toBe(false);
    p.sits = null!;
    expect(townStamps(p, 0, null).some(r => r.earned)).toBe(false);
  });
  it("groups ticket sources and never credits a workplace for a remote call", () => {
    const p = emptyProgress();
    for (const id of ["s70-museum", "s67a-tickets", "s89-video-call", "s65a-passport"]) p.sits[id] = saved(1);
    const done = townStamps(p, 0, profile).filter(s => s.earned);
    expect(done.find(r => r.id === "keepsakes:ticket")?.proof).toHaveLength(2);
    expect(done.some(r => r.id === "places:office" || r.id === "places:phone")).toBe(false);
    expect(done.some(r => r.id === "keepsakes:passport_stamp")).toBe(true);
  });
  it("uses counted game starts and the live deck; ignores phrases, pictures, and uncounted games", () => {
    const p = emptyProgress();
    p.seenIntro[cafe] = true;
    p.place = { zone: "sunny-cup", x: 0, z: 0, rot: 0 };
    p.phrases.test = { en: "please", lt: "prašau", sitId: cafe, count: 1, last: 1 };
    p.play = { ...emptyPlayStats(), games: { taxi: 2, gofish: 1, loteria: 3, pool: 2, madeup: 2, road: -1 } };
    p.pool = { rounds: 1, best: 0, rulesHeard: false };
    const done = (n: number) => townStamps(p, n, null).filter(r => r.earned);
    expect(done(1).map(r => r.id)).toEqual(["games:taxi", "games:loteria", "games:pool", "cards:pocket"]);
    expect(done(0)[0].proof[0]).toEqual({ en: "Partidas iniciadas · 2", lt: sm ? "Pradėtų žaidimų skaičius · 2" : "Games started · 2" });
    expect(done(0).find(r => r.id === "games:pool")?.proof[1].en).toBe("Rondas terminadas · 1");
    expect(done(0)).toHaveLength(3);
    delete p.play.games.pool;
    expect(done(0).find(r => r.id === "games:pool")).toBeUndefined();
  });
  it("uses PC titles, keepsake names and sources without linking bonus activities to the course", () => {
    const p = emptyProgress();
    p.sits["x10-loteria"] = saved(1);
    const rows = townStamps(p, 0, profile);
    expect(rows.find(r => r.id === "situations:x10-loteria")).toMatchObject({
      title: SITUATION_BY_ID["x10-loteria"].title, earned: true, href: undefined,
    });
    expect(rows.find(r => r.id === "keepsakes:loteria_card")).toMatchObject({
      title: { en: "Carta de lotería", lt: sm ? "Loterijos korta" : "Lotería card" }, earned: true,
      proof: [SITUATION_BY_ID["x10-loteria"].title],
    });
    const english: Record<KeepsakeKind, string> = {
      cue_chalk: "Pool chalk", passport_stamp: "Passport stamp", boarding_pass: "Boarding pass",
      baggage_tag: "Baggage claim ticket", ticket: "Ticket", room_key: "Room key", home_key: "Apartment key",
      car_key: "Car key", map: "Town map", coffee_cup: "Coffee cup", receipt: "Receipt", shopping_bag: "Shopping bag",
      business_card: "Business card", badge: "Employee badge", note: "Note", flower: "Flower", balloon: "Balloon",
      water_bottle: "Water bottle", prescription: "Prescription", wallet: "Wallet", loteria_card: "Lotería card",
      seashell: "Seashell", pebble: "Small stone", leaf: "Leaf",
    };
    expect(Object.keys(KIND)).toHaveLength(Object.keys(english).length);
    for (const kind of Object.keys(english) as KeepsakeKind[]) {
      const name = sm ? KIND[kind].nominative : english[kind];
      expect(L(KIND[kind].nominative), kind).toBe(name);
      if (Object.values(KEEPSAKES).includes(kind)) expect(rows.find(r => r.id === "keepsakes:" + kind)?.title.lt, kind).toBe(name);
    }
  });
  it("rejects future card save versions while preserving supported old decks", () => {
    const card = { en: "Hello", lt: "Labas" };
    const load = (v: unknown) => loadCards({ getItem: () => JSON.stringify(v), setItem() {} });
    expect(load({ v: 2, cards: [card] })).toHaveLength(0);
    expect(load([card])).toHaveLength(1);
    expect(load({ v: 1, cards: [card, card, null] })).toHaveLength(1);
  });
});
describe("Spanish Master course pages", () => {
  const item = (id: string) => ({ id, title: id, title_lt: id });
  const chapters = ["BK01-00", "BK01-01"].map(item);
  const books = bookCatalog({ books: [{ ...item("BK01"), chapters }] });
  const songs = songCatalog({ songs: [{ id: "SG01", t: "La cumbia del panadero", a: "/songs/audio/SG01.mp3" }] });
  const ids = (items: Record<string, unknown>) => courseStamps({ books, songs }, items, profile).filter(c => c.earned).map(c => c.id);
  it("credits indexed positive timestamps and exposes both proofs for one chapter", () => {
    const items = { "songs:SG01": { heard: 9 }, "songs:SG99": { heard: 8 }, "books:BK01-01": { heard: 5, read: 3 } };
    expect(ids(items)).toEqual(["songs:SG01", "books:BK01-01"]);
    const rows = courseStamps({ books, songs }, items, profile);
    expect(rows[0].href).toBe("/songs/SG01");
    expect(rows.at(-1)?.href).toBe(sm ? "/knygos/BK01-01" : "/books/BK01-01");
    expect(rows.at(-1)?.proof.map(p => p.en)).toEqual(["Leído en el curso", "Escuchado en el curso", "Capítulos terminados · 1/2"]);
    expect(ids({ ...items, "books:BK01-00": { read: 1 } })).toContain("covers:BK01");
  });
  it("ignores opens, unknown versions, invalid chapters and unavailable catalogs", () => {
    expect(ids({ "songs:SG01": { heard: Infinity, read: 1 }, "books:BK01-01": { first: 3, last: 4, opens: 2 } })).toEqual([]);
    expect(readCourse(JSON.stringify({ version: 2, items: { "songs:SG01": { heard: 1 } } }))).toEqual({});
    expect(readCourse("{")).toEqual({});
    expect(bookCatalog({ books: [{ ...item("BK01"), chapters: [...chapters, null] }] })).toEqual([]);
    expect(courseStamps({}, { "songs:SG01": { heard: 9 } }, profile)).toEqual([]);
  });
});
describe("visual presentation history", () => {
  it("separates standalone, SME and SM acknowledgments", () => {
    const sme = courseProfile("es", "en", "fluentsteps")!, sm = courseProfile("es", "lt", "fluentsteps")!;
    expect(new Set([sme, sm, null].map(course => presentationPrefix(course, 22))).size).toBe(3);
    expect(courseProfile("es", "lt", "")).toBeNull();
  });
  it.each([false, true])("baselines, merges individual IDs and survives denied storage (%s)", denied => {
    const kv = new Map<string, string>();
    const storage = { get length() { return kv.size; }, key: (i: number) => [...kv.keys()][i],
      getItem(k: string) { if (denied) throw Error(); return kv.get(k) ?? null; },
      setItem(k: string, v: string) { if (denied) throw Error(); kv.set(k, v); }, removeItem(k: string) { kv.delete(k); } } as Storage;
    const key = presentationPrefix(profile, denied ? 101 : 100);
    const a = presentation(key, storage), b = presentation(key, storage);
    expect(a.pending(["situations:a"])).toBeNull();
    a.presentBaseline(["situations:a"]);
    expect(b.pending(["situations:a", "games:b", "cards:pocket"])).toEqual(["games:b", "cards:pocket"]);
    a.present("cards:pocket"); b.present("games:b");
    expect(a.pending(["situations:a", "games:b"])).toEqual([]);
    expect(b.pending(["cards:pocket"])).toEqual([]);
    const fresh = presentation(presentationPrefix(profile, 102 + Number(denied)), storage);
    expect(fresh.pending([])).toBeNull();
    fresh.presentBaseline([]);
    expect([...kv.keys()].some(k => k.startsWith(key))).toBe(false);
    expect(a.pending([])).toBeNull();
  });
});
