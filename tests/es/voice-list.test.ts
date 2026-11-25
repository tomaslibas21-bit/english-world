// Puerto Colibrí's voice list lists only the lines the game can play (25 Nov 2026, as tests/voice-list.test.ts does for
// Maple Harbor). The list (tools/es-voices/lines-es.ts) is compared with what the game itself says, through its own code
// (the Conversation the game runs, compose, the clip key, the voice ids), played by tools/es-voices/runs-es.ts with runs
// and sim seeds the list never uses:
//  1. nothing reachable dropped, nothing added: the list before the cleanup (enumerateEs legacy) and after, for the same
//     conversation; whatever independent play says and the old list had, the new list has; the new list has nothing the
//     old one lacked;
//  2. a line no run, sim or probe says and no code names is not listed (it was, voiced in every speaker's voice).
// VOICE_LIST_SCOPE=s31-doctor,s73-restaurant… widens the conversations checked (about two minutes each).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "../../src/content/situations";
import { NPCS } from "../../src/content/npcs";
import { npcVoice } from "../../src/content/voices";
import { audioKey, withoutAddressedNames } from "../../src/audio-key";
import { EDITION } from "../../src/edition";
import type { SpokenLine } from "../../src/convo/dialogue";
import { enumerateEs, type EsUtt } from "../../tools/es-voices/lines-es";
import { observe } from "../../tools/es-voices/runs-es";

const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];
const NAMES_RE = new RegExp(`\\b(${NAMES.join("|")})\\b`);
const MINUTES = 60_000;

/** The clip the game asks for when it says this line (src/game/audio.ts), or null when none is made for it. */
function clipKey(line: SpokenLine): string | null {
  const n = NPCS[line.npc];
  if (!n) return null;
  const say = line.sentence.say;
  if (!say.trim() || /\s[.,!?]/.test(say)) return null;
  const alt = withoutAddressedNames(say, NAMES);
  if (alt === null && NAMES_RE.test(say)) return null;
  return audioKey(npcVoice(n), n.speed ?? 1, alt ?? say);
}
const keysOf = (utts: EsUtt[]) => new Set(utts.map((u) => audioKey(u.voice, u.speed, u.say)));

const scope = process.env.VOICE_LIST_SCOPE?.split(",").filter(Boolean) ?? ["x01-surf", "s35-gym", "s34-meeting"];

describe("Puerto Colibrí's voice list against what the game can play", () => {
  it.each(scope)("%s: the cleanup drops only what the game can't say, and adds nothing", (id) => {
    const sit = SITUATIONS.find((s) => s.id === id)!;
    expect(sit).toBeTruthy();
    const after = enumerateEs({ fuzzRuns: 120, only: [id] });
    const before = enumerateEs({ fuzzRuns: 120, only: [id], legacy: true });
    const keys = keysOf(after.utts), old = keysOf(before.utts);

    // independent play: other random runs (from 1000), other sim seeds, the probes, in the default Spanish
    const heard = new Map<string, SpokenLine>();
    observe(sit, { fuzzRuns: 40, firstRun: 1000, simSeeds: (g) => (g === "m" ? [31, 51] : [32, 52]), probes: true,
      onLine: (h) => { const k = clipKey(h.line); if (k && !heard.has(k)) heard.set(k, h.line); } });
    const line = (k: string, l: SpokenLine) => `${k} ${l.npc}:${l.lineId} "${l.sentence.say}"`;

    expect([...keys].filter((k) => !old.has(k))).toEqual([]);
    expect([...heard].filter(([k]) => old.has(k) && !keys.has(k)).map(([k, l]) => line(k, l))).toEqual([]);
    const neither = [...heard].filter(([k]) => !old.has(k) && !keys.has(k));
    if (neither.length) console.log(`${id}: ${neither.length} lines independent play says that neither list has (unchanged by the cleanup), e.g. ${neither.slice(0, 3).map(([k, l]) => line(k, l)).join("; ")}`);
    console.log(`${id}: ${old.size} → ${keys.size} keys (${old.size - keys.size} dropped); independent play said ${heard.size}`);

    // lines no play says and no code names: reported, and none of their text is listed under them any more
    const unnamed = (after.unreached ?? []).filter((u) => u.sit === id && !u.named).map((u) => u.line);
    for (const lid of unnamed) expect(after.utts.filter((u) => u.where.startsWith(`${id}:${lid}[`)).map((u) => u.say)).toEqual([]);
  }, 20 * MINUTES);
});
