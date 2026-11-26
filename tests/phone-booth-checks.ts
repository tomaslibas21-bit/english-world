import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { audioKey } from "@/audio-key";
import { setVariety, variety } from "@/convo/compose";
import { missionUrl, practiceTurns, townDirectory, type PracticeId } from "@/editions/es/content/phoneBooth";

const scripts = {
  "s83-invite-call": [
    ["¿Bueno?", "Hello?", "Alio?", "b30688932f25"],
    ["¿Estás libre el viernes?", "Are you free on Friday?", "Ar esi laisva penktadienį?", "5642f36306d3", "a48b409a5aba"],
    ["Creo que sí. ¿Por qué?", "I think so. Why?", "Manau, kad taip. O ką?", "53c7f9188e1b"],
    ["Tengo dos boletos para un concierto.", "I've got two tickets for a concert.", "Turiu du bilietus į koncertą.", "71bfcc408e41", "5ecbb3b151eb"],
  ],
  "s90-running-late": [
    ["¿Bueno? Buenos días.", "Hello? Good morning.", "Alio? Labas rytas.", "38f1d3b015fa"],
    ["Voy tarde.", "I'm running late.", "Vėluoju.", "4d8a1180bc3f", "bdf12ae5c67a"],
    ["¿Como a qué hora llega?", "Around what time will you get here?", "Maždaug kada atvyksite?", "6b6cb0594d5c"],
    ["En media hora, más o menos.", "In about half an hour.", "Maždaug po pusvalandžio.", "d8dfe3939af8", "141a6508eedf"],
  ],
};

export function checkPhoneBooth(helper: "en" | "lt") {
  it("groups Andrea’s calls and lists authored places and remote organizations once", () => {
    const people = townDirectory();
    expect(people.slice(0, 2).map(p => p.npc.name)).toEqual(["Andrea", "Ingeniero Montes"]);
    expect(new Set(people.map(p => p.npc.id)).size).toBe(people.length);
    expect(people[0].calls.map(s => s.id).sort()).toEqual(["p24-flood", "s83-invite-call"]);
    expect(people[0].npc.role.lt).toBe(helper === "lt" ? "Tavo draugė" : "Your friend");
    expect(people.find(p => p.npc.id === "walter")?.places.map(p => p.name)).toContain("Terminal de Autobuses");
    expect(people.find(p => p.npc.id === "claire")?.organizations).toEqual(["NetWave"]);
  });
  it.each(Object.keys(scripts) as PracticeId[])("resolves the four recorded Mexican turns and companion mission for %s", async id => {
    const manifest = JSON.parse(readFileSync("public/audio-es/manifest.json", "utf8"));
    const original = variety();
    try {
      for (const personal of ["neutral", "spain"] as const) {
        setVariety(personal);
        for (const gender of ["f", "m"] as const) {
          const turns = await practiceTurns(id, gender);
          expect(turns.map(row => row.learner)).toEqual([false, true, false, true]);
          turns.forEach(({ learner, voice, sentence }, i) => {
            const [target, english, lithuanian, female, male] = scripts[id][i];
            expect(sentence.en).toBe(target);
            expect(sentence.nat).toBe(helper === "lt" ? lithuanian : english);
            const key = audioKey(voice, 1, sentence.say);
            expect(key).toBe(learner && gender === "m" ? male : female);
            expect(manifest[key]).toBeGreaterThan(0);
          });
          expect(variety()).toBe(personal);
        }
      }
    } finally { setVariety(original); }
    const course = "https://course.example/", game = "https://game.example/pc/";
    const path = helper === "lt" ? "situacijos" : "situations";
    expect(missionUrl(id, course, game)).toBe(course + path + (id === "s83-invite-call" ? "/SS22" : "/SS29"));
    expect(missionUrl(id, undefined, game)).toBeUndefined();
  });
}
