import { afterEach, describe, expect, it } from "vitest";
import { audioKey } from "../../src/audio-key";
import { STREET_CHATTER, STREET_MOMENTS } from "../../src/content/street";
import { ambientVoice, coachVoice, coachVoices } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { byCast, resolveStreetLine, streetVoice, type Gender } from "../../src/game/street/lines";
import { selectScript } from "../../src/game/street/schedule";
import type { StreetLine } from "../../src/game/street/types";
import { ES_VOICES, MX_VOICES, STREET, VOICES, accentOf, roleOf, voiceFor, whoOf } from "../../tools/es-voices/casting-es";
import { enumerateEs, type EsUtt } from "../../tools/es-voices/lines-es";

const genders = ["m", "f"] as const;
const varieties = [["default", "mx"], ["neutral", "neutral"], ["spain", "spain"]] as const;
const keyOf = ({ voice, speed, say }: Pick<EsUtt, "voice" | "speed" | "say">) => audioKey(voice, speed, say);

function streetRequests() {
  const requests = new Map<string, Pick<EsUtt, "voice" | "speed" | "say" | "where">>();
  const request = (line: StreetLine, voice: string, learner: Gender, speaker: Gender, where: string) => {
    const { say } = resolveStreetLine(line, learner, speaker);
    if (!/[a-z0-9]/i.test(say)) return;
    const clip = { voice, speed: 1, say, where };
    requests.set(keyOf(clip), clip);
  };

  for (const moment of STREET_MOMENTS) for (const member of moment.cast) for (const seen of [0, 1, 2]) {
    const id = member.id;
    const { cast, script, scriptName } = selectScript(moment, { seen, helped: 0, cast: { [id]: seen } }, id, id)!;
    const where = `street/${moment.id}/${scriptName}`;
    const turns = script.then ? [script, script.then] : [script];
    const town = turns.flatMap((turn) => [
      ...(byCast(turn.open, id) ?? []),
      ...turn.choices.flatMap((choice) => byCast(choice.reply ?? turn.reply, id) ?? []),
    ]);
    const away = byCast(script.away, id);
    if (away) town.push(away);
    const answers = turns.flatMap((turn) => turn.choices.map(({ say }) => byCast(say, id)!));
    const card = byCast(script.card, id);
    const saved = card ? [card] : turns.at(-1)!.choices.map(({ say }) => byCast(say, id)!);
    for (const learner of genders) {
      for (const line of town) request(line, streetVoice(cast.gender, cast.voice), learner, cast.gender, where);
      for (const line of answers) request(line, coachVoice(learner), learner, cast.gender, where);
      for (const line of saved) for (const coach of coachVoices()) request(line, coach, learner, cast.gender, where);
    }
  }

  for (const chatter of STREET_CHATTER) for (const line of chatter.lines) for (const speaker of genders) for (const learner of genders) {
    request(line, ambientVoice(speaker), learner, speaker, `street/chatter/${chatter.id}`);
  }
  return requests;
}

afterEach(() => setVariety("default"));

describe("Puerto Colibrí street voices", () => {
  it.each(varieties)("lists exactly the street clip keys for the %s variety", (variety, accent) => {
    const { utts } = enumerateEs({ only: ["street"], fuzzRuns: 0 });
    const listed = utts.filter(({ voice }) => accentOf(voice) === accent);
    setVariety(variety);
    const expected = streetRequests();
    const keys = new Set(listed.map(keyOf));
    expect(expected.size).toBeGreaterThan(0);
    expect([...expected.values()].filter((clip) => !keys.has(keyOf(clip))), "missing clips").toEqual([]);
    expect(listed.filter((clip) => !expected.has(keyOf(clip))), "unused clips").toEqual([]);
    expect(keys.size, "duplicate clip keys").toBe(listed.length);
    for (const { voice, where, neutral, spain } of listed) {
      expect(where).toMatch(/^street\//);
      expect(!!neutral).toBe(accent === "neutral");
      expect(!!spain).toBe(accent === "spain");
      const role = whoOf(voice)!;
      expect(voiceFor(role, accent), voice).toBeTruthy();
    }
  });

  it("casts every street role and gives every regular a distinct voice in each catalog", () => {
    const members = STREET_MOMENTS.flatMap(({ cast }) => cast);
    const regulars = new Set(STREET_MOMENTS.filter(({ kind }) => kind === "regular")
      .flatMap(({ cast }) => cast.map(({ voice }) => voice)));
    expect(Object.keys(STREET).sort()).toEqual([...new Set(members.map(({ voice }) => voice))].sort());

    for (const [catalog, accent, casting] of [
      [VOICES, "mx", "prebuilt"], [MX_VOICES, "mx", "mexico"], [ES_VOICES, "spain", "mexico"],
    ] as const) {
      const pick = (id: string) => voiceFor(id, accent, casting);
      for (const { voice, gender } of members) {
        expect(STREET[voice].g, voice).toBe(gender);
        expect(roleOf(voice, casting)?.manner, voice).toBeTruthy();
        expect(catalog.find(({ name }) => name === pick(voice))?.g, voice).toBe(gender);
        expect([pick("coach_m"), pick("coach_f")], voice).not.toContain(pick(voice));
      }
      expect(new Set([...regulars].map(pick)).size).toBe(regulars.size);
    }
  });
});
