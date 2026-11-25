// The voice list lists only the lines the game can play (25 Nov 2026). On 17 Nov the audit voiced 445 static-fill
// combinations no one can hear (s87's ask_years_field2 ×105: Brooks asks it only about a field with two parts). The
// list (tools/enumerate.ts) is compared here with what the game itself says, through its own code: the Conversation
// the game runs, compose, the clip key (src/audio-key.ts) and the voice ids, played with inputs the list never used.
//  1. ask_years_field2: every field the learner can name is said to Brooks; the fields the game answers with
//     ask_years_field2 are exactly the fields the list voices it with, in Brooks' voice, nothing missing, nothing extra;
//  2. nothing reachable dropped, nothing added: the list before the cleanup (enumerateAll legacy) and after, for the
//     same conversation; whatever independent play says (the sims and random runs at seeds the list never uses) and the
//     old list had, the new list has; the new list has nothing the old one lacked;
//  3. nothing extra: none of the 445 (tests/fixtures/voice-17nov-static.json) is listed unless the game can say it;
//     every {X} line is listed only with items the game said it with or its own code says it with;
//  4. a line no play says and no code names is not listed (s62's yes_next_the).
// VOICE_LIST_SCOPE=s33-small-talk,p28-kitchen… or VOICE_LIST_ALL=1 (about 30 minutes) widen 2 and 3.
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { npcVoice } from "../src/content/voices";
import { audioKey, withoutAddressedNames } from "../src/audio-key";
import { Conversation, type SpokenLine } from "../src/convo/dialogue";
import { compose, placeholders } from "../src/convo/compose";
import type { EntityDef, SituationDef } from "../src/content/types";
import { enumerateAll, type Utt } from "../tools/enumerate";
import { itemsFor, referenced } from "../tools/line-reach";
import { playSim } from "../tools/sim-play";
import HISTORIC from "./fixtures/voice-17nov-static.json";

const NAMES = ["Tomas", "Mikalauskas"];
/** Item lines whose code names their items (line-reach.ts reads them): s35's machine lines say the exercise helper's
 *  two machines (exercise(c): chest_press or leg_press), never a membership or the treadmill (×14 on 17 Nov). */
const NAMED: Record<string, Record<string, string[]>> = {
  "s35-gym": { this_is_x: ["leg_press", "chest_press"], machine_intro: ["leg_press", "chest_press"], machine_next: ["leg_press", "chest_press"] },
};
const MINUTES = 60_000;
const byId = (id: string) => SITUATIONS.find((s) => s.id === id)!;
const lookIn = (sit: SituationDef) => (id: string): EntityDef | undefined => {
  for (const list of Object.values(sit.entities ?? {})) { const e = list.find((x) => x.id === id); if (e) return e; }
  return undefined;
};

/** The clip key the game asks for when it says this line (src/game/audio.ts: the line, or the line without the
 *  learner's name), or null when no clip is made for it (a value missing, or a name it can't do without). */
function clipKey(line: SpokenLine): string | null {
  const n = NPCS[line.npc];
  if (!n) return null;
  const say = line.sentence.say;
  if (!say.trim() || /\s[.,!?]/.test(say)) return null;
  const alt = withoutAddressedNames(say, NAMES);
  if (alt === null && /\b(Tomas|Mikalauskas)\b/.test(say)) return null;
  return audioKey(npcVoice(n, true), n.speed ?? 1, alt ?? say);
}

/** The list for these conversations, as the recording batch makes it (tools/voice-batch.ts: v2 voices, 120 runs). */
const lists = new Map<string, Utt[]>();
function listFor(sit: SituationDef): Utt[] {
  let utts = lists.get(sit.id);
  if (!utts) lists.set(sit.id, (utts = enumerateAll({ v2: true, fuzzRuns: 120, sits: [sit] }).utts));
  return utts;
}
const keysOf = (utts: Utt[]) => new Set(utts.map((u) => audioKey(u.voice, u.speed, u.say)));

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** What the game says in this conversation when played in ways the list did not use: its sims at seeds 7–9 and 40
 *  random runs at seeds the list never uses, with every hint example for every item as input (not only 12). */
function independentPlay(sit: SituationDef): Map<string, SpokenLine> {
  const heard = new Map<string, SpokenLine>();
  const take = (lines: SpokenLine[]) => { for (const l of lines) { const k = clipKey(l); if (k && !heard.has(k)) heard.set(k, l); } };
  for (const sim of sit.sims ?? []) for (let seed = 7; seed <= 9; seed++) {
    try { playSim(sit, sim, seed, { gender: seed % 2 ? "m" : "f", onTurn: (_c, _t, o) => take(o.lines) }); } catch { /* check-content reports */ }
  }
  const look = lookIn(sit);
  const inputs: string[] = [];
  for (const t of sit.tests ?? []) if (t.intent !== "none") inputs.push(t.say);
  for (const sim of sit.sims ?? []) { inputs.push(...sim.turns); inputs.push(...Object.values(sim.auto ?? {})); }
  for (const g of Object.values(sit.hints)) {
    const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
    for (const it of g.items) {
      const pool = ents.filter((e) => !it.only || it.only(e));
      for (const e of pool.length ? pool : [null]) {
        try { inputs.push(compose(it.s, e ? { X: e.id, name: "Tomas" } : { name: "Tomas" }, { look }).en); } catch { /* skip */ }
      }
    }
  }
  for (let r = 0; r < 40; r++) {
    const rand = rng(900_001 + r * 104_729 + sit.id.length);
    let conv: Conversation;
    try {
      conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, visits: Math.floor(rand() * 4), seed: 50_000 + r,
        player: { name: "Tomas", surname: "Mikalauskas", gender: rand() < 0.5 ? "m" : "f", datePartner: rand() < 0.5 ? "sam" : "emma" } });
      take(conv.start().lines);
    } catch { continue; }
    for (let t = 0; t < 16 && !conv.ended; t++) {
      try { take(conv.input(inputs[Math.floor(rand() * inputs.length)] ?? "yes").lines); } catch { break; }
    }
  }
  return heard;
}

describe("the voice list against what the game can play", () => {
  it("ask_years_field2 only with the fields Brooks asks it about (named case of 17 Nov: ×105)", () => {
    const sit = byId("s87-interview");
    const look = lookIn(sit);
    const fields = sit.entities!.field;
    const hint = Object.values(sit.hints).find((g) => g.slot === "field")!;
    // every field the learner can name, said the way the hints show, after the greeting and the name (seed 5 reaches
    // Brooks' question about the years with any field: the game's own route, not a copy of it)
    const said = new Map<string, Set<string>>();
    const keys = new Map<string, Set<string>>();
    for (const e of fields) for (const it of hint.items.filter((i) => !i.only || i.only(e))) {
      const answer = compose(it.s, { X: e.id, name: "Tomas" }, { look }).en;
      const conv = new Conversation(sit, { global: GLOBAL, npcs: NPCS, visits: 0, seed: 5, player: { name: "Tomas", surname: "Mikalauskas", gender: "m" } });
      const lines = [...conv.start().lines];
      for (const input of ["Good morning! I have an interview at 9:30.", "My name is Tomas.", answer]) lines.push(...conv.input(input).lines);
      for (const l of lines) if (/^ask_years_field2?$/.test(l.lineId)) {
        const id = typeof l.vars.X === "string" ? l.vars.X : (l.vars.X as { id: string }).id;
        (said.get(l.lineId) ?? said.set(l.lineId, new Set()).get(l.lineId)!).add(id);
        (keys.get(l.lineId) ?? keys.set(l.lineId, new Set()).get(l.lineId)!).add(clipKey(l)!);
      }
    }
    const multi = fields.filter((e) => e.attrs?.multi).map((e) => e.id).sort();
    expect([...said.get("ask_years_field2") ?? []].sort()).toEqual(multi);
    expect(multi).toEqual(["customer_service"]);
    // the single-part fields get the other question: every one of the 27 the game asked about
    expect([...said.get("ask_years_field") ?? []].every((id) => !multi.includes(id))).toBe(true);
    expect(said.get("ask_years_field")?.size ?? 0).toBeGreaterThanOrEqual(20);

    // the list: every variant of the line, with exactly those fields, in the voice of Brooks
    const brooks = NPCS.brooks;
    const expected = new Set<string>();
    sit.lines.ask_years_field2.forEach((src) => {
      for (const id of said.get("ask_years_field2")!) {
        const s = compose(src, { X: id }, { look, addressee: "m", speaker: brooks.gender, formal: !brooks.informal });
        expected.add(audioKey(npcVoice(brooks, true), brooks.speed ?? 1, s.say));
      }
    });
    // (a clip the list's own runs met first is filed under ":fuzz", so the whole list is searched for the expected keys)
    const all = keysOf(listFor(sit));
    const listed = listFor(sit).filter((u) => u.where.startsWith("s87-interview:ask_years_field2["));
    expect([...expected].filter((k) => !all.has(k))).toEqual([]);
    expect([...keysOf(listed)].filter((k) => !expected.has(k))).toEqual([]);
    // the clip the game played for customer_service (the browser check's key) is on the list
    for (const k of keys.get("ask_years_field2")!) expect(all.has(k)).toBe(true);
    expect(all.has("dcb33a0985ec")).toBe(true);
    // and none of the 105 voiced on 17 Nov (each an item Brooks never asks about this way; the customer_service clip of
    // today, dcb33a0985ec, was voiced under its sibling's key then)
    const historic = HISTORIC.filter((h) => h.where.startsWith("s87-interview:ask_years_field2["));
    expect(historic.length).toBe(105);
    expect(historic.filter((h) => all.has(h.key)).map((h) => h.key)).toEqual([]);
  }, 10 * MINUTES);

  // the conversations whose static fills or speakers were in the 17 Nov cohort (with VOICE_LIST_ALL: all of them)
  const cohort = [...new Set(HISTORIC.map((h) => h.where.split(":")[0]))].sort();
  // (by default the conversations where the cleanup narrowed most: item fills, an unnamed line, guessed speakers;
  // VOICE_LIST_SCOPE=id,id… or VOICE_LIST_ALL=1 for more)
  const scope = process.env.VOICE_LIST_ALL ? SITUATIONS.map((s) => s.id)
    : process.env.VOICE_LIST_SCOPE?.split(",").filter(Boolean) ?? ["s87-interview", "s62-visitor-center", "s35-gym", "s34-meeting", "s91b-police"];

  it.each(scope)("%s: the cleanup drops only what the game can't say, and adds nothing", (id) => {
    const sit = byId(id);
    const after = listFor(sit);
    const before = enumerateAll({ v2: true, fuzzRuns: 120, sits: [sit], legacy: true }).utts;
    const keys = keysOf(after), old = keysOf(before);
    const heard = independentPlay(sit);
    const line = (k: string, l: SpokenLine) => `${k} ${l.npc}:${l.lineId} "${l.sentence.say}"`;

    // nothing extra: the cleanup only removes
    expect([...keys].filter((k) => !old.has(k))).toEqual([]);
    // nothing reachable dropped: whatever the game says in independent play and the old list had, the new list has
    const dropped = [...heard].filter(([k]) => old.has(k) && !keys.has(k)).map(([k, l]) => line(k, l));
    expect(dropped).toEqual([]);
    // (what the game says that neither list has: dynamic renderings the runs did not meet, a spelled name, a described
    // wallet; not this cleanup's to add, reported for the owner)
    const neither = [...heard].filter(([k]) => !old.has(k) && !keys.has(k));
    if (neither.length) console.log(`${id}: ${neither.length} lines independent play says that neither list has (unchanged by the cleanup), e.g. ${neither.slice(0, 3).map(([k, l]) => line(k, l)).join("; ")}`);
    console.log(`${id}: ${old.size} → ${keys.size} keys (${old.size - keys.size} dropped); independent play said ${heard.size}, all on the new list where the old had them`);

    // the 17 Nov cohort: still listed only where the game can say it (independent play, or the list's own runs)
    const fuzz = new Set(after.filter((u) => /:fuzz$/.test(u.where)).map((u) => audioKey(u.voice, u.speed, u.say)));
    const unexplained = HISTORIC.filter((h) => h.where.startsWith(`${id}:`) && keys.has(h.key) && !heard.has(h.key) && !fuzz.has(h.key));
    expect(unexplained.map((h) => `${h.key} ${h.where} ${h.voice} "${h.say}"`)).toEqual([]);

    // named item lines of the 17 Nov kind: listed with the items their code gives them, not with whole lists
    for (const [lid, items] of Object.entries(NAMED[id] ?? {})) {
      const look = lookIn(sit);
      const people = [sit.npc, ...(sit.npcs ?? [])].map((n) => NPCS[n]).filter(Boolean);
      const allowed = new Set(sit.lines[lid].flatMap((src) => items.flatMap((x) => people.map((n) => {
        try { return audioKey(npcVoice(n, true), n.speed ?? 1, compose(src, { X: x }, { look, addressee: "m", speaker: n.gender, formal: !n.informal }).say); }
        catch { return ""; }
      }))));
      const rows = [...keysOf(after.filter((u) => u.where.startsWith(`${id}:${lid}[`)))];
      expect({ lid, extra: rows.filter((k) => !allowed.has(k)) }).toEqual({ lid, extra: [] });
    }
  }, 20 * MINUTES);

  it("a line no play says and no code names is not listed (s62's yes_next_the, 13 clips on 17 Nov)", () => {
    const sit = byId("s62-visitor-center");
    expect(referenced(sit, "yes_next_the")).toBe(false);
    const listed = listFor(sit);
    expect(listed.filter((u) => u.where.startsWith("s62-visitor-center:yes_next_the["))).toEqual([]);
    const historic = HISTORIC.filter((h) => h.where.startsWith("s62-visitor-center:yes_next_the["));
    expect(historic.length).toBe(13);
    expect(historic.filter((h) => keysOf(listed).has(h.key))).toEqual([]);
    expect(cohort.length).toBeGreaterThan(10);
  }, 10 * MINUTES);
});
