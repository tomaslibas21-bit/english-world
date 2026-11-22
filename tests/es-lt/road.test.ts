import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { audioKey } from "../../src/audio-key";
import { audioDir } from "../../src/content/voices";
import { loadPool, makePicker, starterIds } from "../../src/game/road/words";
import { emptyProgress, sitProgress } from "../../src/state/progress";

const manifest: Record<string, number> = JSON.parse(readFileSync(new URL(`../../public/${audioDir()}manifest.json`, import.meta.url), "utf8"));
const hasClip = (voice: string, speed: number, text: string) => !!manifest[audioKey(voice, speed, text)];

it("uses Lithuanian gate glosses and Spanish gaps with the same recorded prompts", async () => {
  const progress = emptyProgress();
  for (const id of starterIds) progress.sits[id] = { ...sitProgress(progress, id), completions: 1 };
  const pick = makePicker(await loadPool(progress, [], hasClip), () => 0.41);
  const first = Array.from({ length: 7 }, (_, i) => pick(i)!);
  expect(first.every(({ word, options, right }) => options[right] === word.lt && hasClip(word.clip.voice, word.clip.speed, word.clip.say))).toBe(true);
  expect(first.flatMap(({ options }) => options).some((text) => /[ąčęėįšųūž]/i.test(text))).toBe(true);
  const eighth = pick(7);
  expect(eighth?.gap?.sentence.en).toContain("____");
  expect(eighth?.options[eighth.right]).toBe(eighth?.word.en.toLowerCase());
  expect(eighth?.gap?.full.nat).toBeTruthy();
});
