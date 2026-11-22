import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { audioKey } from "../../src/audio-key";
import { NPCS } from "../../src/content/npcs";
import { ROAD_ACCEPT, ROAD_LINES } from "../../src/content/road-lines";
import { ROAD_EDITION } from "../../src/content/road";
import { loadSituation } from "../../src/content/situations/catalog";
import { audioDir } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { conversationLine, learnerTurn } from "../../src/game/kit/lines";
import { walkEdge } from "../../src/game/road/entry";
import { loadPool, makePicker, starterIds } from "../../src/game/road/words";
import { ROADS, WORLD } from "../../src/game/world/layout";
import { emptyProgress, sitProgress } from "../../src/state/progress";

const manifest: Record<string, number> = JSON.parse(readFileSync(new URL(`../../public/${audioDir()}manifest.json`, import.meta.url), "utf8"));
const hasClip = (voice: string, speed: number, text: string) => !!manifest[audioKey(voice, speed, text)];

describe("Puerto Colibrí road game", () => {
  it("runs through recorded starter prompts and adds Spanish gaps after completed conversations", async () => {
    expect(starterIds).toEqual(["s65a-passport", "s65b-baggage", "s66-taxi"]);
    const progress = emptyProgress();
    const starter = makePicker(await loadPool(progress, [], hasClip), () => 0.42);
    for (let i = 0; i < 8; i++) {
      const prompt = starter(i);
      expect(prompt).toBeDefined();
      const { word, options, right, gap } = prompt!;
      expect(starterIds).toContain(word.situation);
      expect(hasClip(word.clip.voice, word.clip.speed, word.clip.say)).toBe(true);
      expect(new Set(options.map((option) => option.toLowerCase())).size).toBe(3);
      expect(options[right]).toBe(word.lt);
      expect(gap).toBeUndefined();
    }
    for (const id of starterIds) progress.sits[id] = { ...sitProgress(progress, id), completions: 1 };
    const gap = makePicker(await loadPool(progress, [], hasClip), () => 0.42)(7);
    expect(gap?.gap?.sentence.en).toContain("____");
    expect(gap?.options[gap.right]).toBe(gap?.word.en.toLowerCase());
    const clip = gap?.gap?.clip;
    expect(clip && hasClip(clip.voice, clip.speed, clip.say)).toBe(true);
  });

  it("takes the Calle Ceiba exit and uses Don Rigo's authored lines, variants, and replies", async () => {
    const { driver, edge } = ROAD_EDITION;
    expect(ROAD_EDITION.id).toBe("puerto-colibri");
    expect(NPCS[driver.npc].name).toBe("Don Rigo");
    expect(ROADS.find(({ name }) => name === edge.street)).toMatchObject({ x1: 0, x2: 0, z2: WORLD.maxZ });
    expect(walkEdge(edge.x, edge.z, 0, 1)?.inward).toBe(Math.PI);
    expect(walkEdge(WORLD.minX, -8, -1, 0)).toBeUndefined();
    await loadSituation(driver.situation);
    const line = (key: string, learner = false) => conversationLine(driver.situation, driver.npc, key, ROAD_LINES, learner)!;
    try {
      expect(line("rd_lift").say).toBe("¿Le doy un aventón? Súbase, ¡hoy maneja usted!");
      setVariety("spain");
      expect(line("rd_lift").say).toBe("¿Le llevo? Suba, ¡hoy conduce usted!");
      expect(line("rd_start").say).toBe("¡Venga, vámonos a la carretera!");
      expect(line("rd_end").say).toBe("¡Muy bien conducido! Ya volvemos al pueblo.");
      const replies = learnerTurn(["rd_a_yes", "rd_a_no"].map((key) => ({ key, sentence: line(key, true) })), ROAD_ACCEPT);
      for (const [answer, variants] of Object.entries(ROAD_ACCEPT)) {
        for (const variant of variants) expect(replies.read(variant).answer?.key).toBe(answer);
      }
    } finally {
      setVariety("default");
    }
  });
});
