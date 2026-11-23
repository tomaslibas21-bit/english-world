import { describe, expect, it } from "vitest";
import { audioKey } from "../src/audio-key";
import { LOCATIONS } from "../src/content/locations";
import { STREET_CHATTER, STREET_MOMENTS } from "../src/content/street";
import { SITUATIONS } from "../src/content/situations";
import { ambientVoice, coachVoice, coachVoices } from "../src/content/voices";
import { byCast, resolveStreetLine, streetVoice, type Gender } from "../src/game/street/lines";
import { selectScript } from "../src/game/street/schedule";
import type { StreetLine, StreetMoment } from "../src/game/street/types";
import { OUTDOOR_NPCS } from "../src/game/world/layout";
import { CAST, COACH, roleFor, STREET, VOICES } from "../tools/casting";
import { enumerateAll, type Utt } from "../tools/enumerate";

const genders = ["f", "m"] as const;
const varieties = ["mexico", "neutral", "spain"] as const;
const keyFor = ({ voice, speed, say }: Utt) => audioKey(voice, speed, say);
const streetClips = (v2: boolean) => enumerateAll({ v2, fuzzRuns: 0 }).utts
  .filter(({ where, voice }) => where.startsWith("street/") || voice.startsWith("g_st_"));

function streetRequests(v2: boolean) {
  const requests = new Map<string, Utt>();
  const request = (line: StreetLine, voice: string, learner: Gender, speaker: Gender, where: string) => {
    for (const variety of varieties) {
      const { en, say } = resolveStreetLine(line, learner, speaker, variety);
      if (/[a-z0-9]/i.test(say)) {
        const clip = { voice, speed: 1, en, say, where };
        requests.set(keyFor(clip), clip);
      }
    }
  };

  for (const moment of STREET_MOMENTS) for (const member of moment.cast) for (const seen of [0, 1, 2]) {
    const id = member.id;
    // Select the script from the meeting history, with the cast overrides available in streetNow.
    const { cast, script, scriptName } = selectScript(moment, { seen, helped: 0, cast: { [id]: seen } }, id, id)!;
    const where = `street/${moment.id}/${scriptName}`;
    const turns = script.then ? [script, script.then] : [script];
    const town = turns.flatMap((turn) => [
      ...(byCast(turn.open, id) ?? []),
      ...turn.choices.flatMap((choice) => byCast(choice.reply ?? turn.reply, id) ?? []),
    ]);
    const answers = turns.flatMap((turn) => turn.choices.map((choice) => byCast(choice.say, id)!));
    const away = byCast(script.away, id);
    if (away) town.push(away);
    const card = byCast(script.card, id);
    const saved = card ? [card] : turns.at(-1)!.choices.map((choice) => byCast(choice.say, id)!);
    for (const learner of genders) {
      for (const line of town) request(line, streetVoice(cast.gender, cast.voice, v2), learner, cast.gender, where);
      for (const line of answers) request(line, coachVoice(learner, v2), learner, cast.gender, where);
      for (const line of saved) for (const coach of coachVoices(v2)) request(line, coach, learner, cast.gender, where);
    }
  }

  for (const chatter of STREET_CHATTER) for (const line of chatter.lines) for (const speaker of genders) for (const learner of genders) {
    request(line, ambientVoice(speaker, v2), learner, speaker, `street/chatter/${chatter.id}`);
  }
  return requests;
}

describe("street voices", () => {
  it.each([true, false])("enumerates exactly the requestable street clips with v2=%s", (v2) => {
    const expected = streetRequests(v2);
    const listed = streetClips(v2);
    const keys = new Set(listed.map(keyFor));
    expect([...expected.values()].filter((clip) => !keys.has(keyFor(clip))), "missing clips").toEqual([]);
    expect(listed.filter((clip) => !expected.has(keyFor(clip))), "unused clips").toEqual([]);
    expect(keys.size, "duplicate clip keys").toBe(listed.length);
    expect(listed.every(({ where }) => /^street\/[^/]+\/[^/]+$/.test(where))).toBe(true);
  });

  it("resolves gender, cast and variety, and voices only replies the engine can pick", () => {
    const fixture: StreetMoment = {
      id: "street-voice-fixture", kind: "arc",
      cast: [
        { id: "a", gender: "f", age: "adult", role: "Host", voice: "st_f_adult" },
        { id: "b", gender: "m", age: "adult", role: "Host", voice: "st_m_adult" },
      ],
      first: {
        choices: [{ say: { en: "{m:Ready, sir|f:Ready, ma'am}!", lt: "Ready" }, reply: { byCast: {
          a: [{ en: "Hello from the first host!", lt: "Hello" }], b: [],
        } } }],
        reply: [{ en: "This reply is overridden.", lt: "Overridden" }],
        then: { choices: [{ say: { en: "{m:I found it|f:I have it}.", lt: "Found it" } }] },
        away: {
          en: "{nm:Goodbye|nf:See you}, Tomas!",
          neutral: "{m:Adiós|f:Hasta luego}, Tomas!",
          spain: "{nm:Hasta pronto|nf:Nos vemos}, Tomas!",
          lt: "Goodbye",
        },
      },
      second: { choices: [{ say: { en: "Arcs never select this script.", lt: "Unused" } }] },
    };
    const chatterLine = { en: "{nm:Say hello|nf:Say hi} to {m:him|f:her}.", lt: "Hello" };
    STREET_MOMENTS.push(fixture);
    STREET_CHATTER.push({ id: "street-voice-fixture", lines: [chatterLine, chatterLine] });
    try {
      const clips = new Set(streetClips(true).filter(({ where }) => where.split("/").includes(fixture.id)).map(keyFor));
      for (const [voice, text] of [
        ["g_coach_m", "Ready, sir!"], ["g_coach_f", "Ready, ma'am!"],
        ["g_coach_m", "I found it."], ["g_coach_f", "I have it."],
        ["g_coach_f", "I found it."], ["g_coach_m", "I have it."], // the last answer can be replayed from a saved card
        ["g_st_f_adult", "Hello from the first host!"],
        ["g_st_f_adult", "See you, Tomas!"], ["g_st_m_adult", "Goodbye, Tomas!"],
        ["g_st_f_adult", "Adiós, Tomas!"], ["g_st_f_adult", "Hasta luego, Tomas!"],
        ["g_st_f_adult", "Nos vemos, Tomas!"], ["g_st_m_adult", "Hasta pronto, Tomas!"],
        ["g_amb_f", "Say hi to him."], ["g_amb_f", "Say hi to her."],
        ["g_amb_m", "Say hello to him."], ["g_amb_m", "Say hello to her."],
      ]) expect(clips.has(audioKey(voice, 1, text)), `${voice} · ${text}`).toBe(true);
      for (const [voice, text] of [
        ["g_coach_f", "Ready, sir!"], ["g_coach_m", "Ready, ma'am!"],
        ["g_st_m_adult", "Hello from the first host!"],
        ["g_st_f_adult", "This reply is overridden."], ["g_st_m_adult", "This reply is overridden."],
        ["g_coach_f", "Arcs never select this script."], ["g_coach_m", "Arcs never select this script."],
      ]) expect(clips.has(audioKey(voice, 1, text)), `${voice} · ${text}`).toBe(false);
    } finally {
      STREET_CHATTER.pop();
      STREET_MOMENTS.pop();
    }
  });

  it("casts every authored street voice and keeps regulars distinct from nearby conversation characters", () => {
    const cast = STREET_MOMENTS.flatMap((moment) => moment.cast);
    expect(Object.keys(STREET).sort()).toEqual([...new Set(cast.map(({ voice }) => voice))].sort());

    const outdoorVoices = new Set(OUTDOOR_NPCS.map(({ npc }) => CAST[npc]?.voice));
    const harborVoices = new Set(SITUATIONS.filter((s) => LOCATIONS[s.location]?.district === "harbor")
      .flatMap((s) => [s.npc, ...(s.npcs ?? [])]).map((npc) => CAST[npc]?.voice));
    for (const member of cast) {
      const role = STREET[member.voice];
      expect(roleFor(`g_${member.voice}`)).toEqual({ ...role, who: member.voice });
      expect(VOICES.find(({ name }) => name === role.voice)?.g, member.voice).toBe(member.gender);
      expect(outdoorVoices.has(role.voice), member.voice).toBe(false);
      expect([COACH.f.voice, COACH.m.voice], member.voice).not.toContain(role.voice);
      expect(role.style.trim(), member.voice).not.toBe("");
      expect(role.note.trim(), member.voice).not.toBe("");
      if (member.name) expect(role.note, member.voice).toContain(member.name);
    }

    const regulars = new Set(STREET_MOMENTS.filter((moment) => moment.kind === "regular")
      .flatMap((moment) => moment.cast.map(({ voice }) => voice)));
    expect(new Set([...regulars].map((id) => STREET[id].voice)).size).toBe(regulars.size);
    for (const moment of STREET_MOMENTS.filter((moment) => moment.near === "water")) {
      for (const member of moment.cast) expect(harborVoices.has(STREET[member.voice].voice), member.voice).toBe(false);
    }
  });
});
