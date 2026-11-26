import { compose, type Sentence } from "../convo/compose";
import { LOCATIONS, type LocationDef } from "./locations";
import { NPCS, type NpcDef } from "./npcs";
import { PHONE_CALLS } from "./phoneCalls";
import { loadSituation, SITUATIONS } from "./situations/catalog";
import type { SituationMeta } from "./types";
import { coachVoice, npcVoice } from "./voices";

export type PracticeId = "s83-invite-call" | "s90-running-late";
type TurnSource = { line: string } | { group: string; hint: string };
export const PRACTICES: Record<PracticeId, { topic: string; mission: string; turns: TurnSource[] }> = {
  "s83-invite-call": {
    topic: "Pakviesti draugę", mission: "S83",
    turns: [{ line: "hello_q" }, { group: "free", hint: "free_q" }, { line: "free_yes" }, { group: "invite", hint: "inv_tickets" }],
  },
  "s90-running-late": {
    topic: "Pranešti apie vėlavimą", mission: "S90",
    turns: [{ line: "hello" }, { group: "late", hint: "running_late" }, { line: "ask_eta" }, { group: "eta", hint: "eta_halfhour" }],
  },
};

export interface Contact {
  npc: NpcDef;
  places: LocationDef[];
  calls: SituationMeta[];
  organizations: string[];
  practice?: PracticeId;
}

/** Metadata only. A second speaker can be found at a shared scene, but missed calls
 * belong to the person or business at the other end of the initial call. */
export function townDirectory() {
  const people = new Map<string, Contact>();
  for (const sit of SITUATIONS) {
    const call = PHONE_CALLS[sit.id];
    for (const id of new Set([sit.npc, ...(sit.npcs ?? [])])) {
      if (!NPCS[id] || ["sco", "netwave_bot", "cave_oak"].includes(id)) continue;
      const entry: Contact = people.get(id) ?? { npc: NPCS[id], places: [], calls: [], organizations: [] };
      people.set(id, entry);
      if (call) {
        if (id !== call.npc) continue;
        entry.calls.push(sit);
        const org = call.organization;
        if (org && !entry.organizations.includes(org)) entry.organizations.push(org);
        if (sit.id === "s83-invite-call" || sit.id === "s90-running-late") entry.practice = sit.id;
      } else {
        const place = LOCATIONS[sit.location];
        if (place && place.kind !== "phone" && !entry.places.includes(place)) entry.places.push(place);
      }
    }
  }
  return [...people.values()].sort((a, b) => Number(!!b.practice) - Number(!!a.practice) || a.npc.name.localeCompare(b.npc.name, "en"));
}

export interface PracticeTurn { learner: boolean; voice: string; sentence: Sentence }
export async function practiceTurns(id: PracticeId, gender: "f" | "m"): Promise<PracticeTurn[]> {
  const sit = await loadSituation(id);
  if (!sit) throw new Error(`Missing practice situation ${id}`);
  const npc = NPCS[sit.npc];
  return PRACTICES[id].turns.map((source) => {
    const learner = "hint" in source;
    const template = learner ? sit.hints[source.group]?.items.find(item => item.id === source.hint)?.s : sit.lines[source.line]?.[0];
    if (!template) throw new Error(`Missing practice turn in ${id}`);
    const sentence = compose(template, {}, { look: () => undefined, addressee: gender, speaker: npc.gender, formal: !npc.informal });
    return { learner, sentence, voice: learner ? coachVoice(gender) : npcVoice(npc) };
  });
}

export function missionUrl(id: PracticeId, course: string | undefined, here: string) {
  if (course) return new URL("/situacijos/" + PRACTICES[id].mission, new URL(course, here)).href;
}
