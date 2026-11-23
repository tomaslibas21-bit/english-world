// The learner's taxi and road answers (and the three fares) are listed for voicing in the coach voices of all three
// sets, as the kit plays a tapped answer, and never in Don Rigo's voice (tools/es-voices/reach-es.ts UNSPOKEN,
// 23 Nov 2026). Before, five were listed in his voice and the fares not at all.
import { afterEach, describe, expect, it } from "vitest";
import { NPCS } from "../../src/content/npcs";
import { loadSituation } from "../../src/content/situations/catalog";
import { coachVoice, npcVoice } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { conversationLine } from "../../src/game/kit/lines";
import { enumerateEs } from "../../tools/es-voices/lines-es";

const varieties = ["default", "neutral", "spain"] as const;
const LEARNER = ["tx_a_where", "tx_a_here", "tx_a_bye", "tx_r1_a_fare", "tx_r2_a_fare", "tx_r3_a_fare", "rd_a_yes", "rd_a_no"];

describe("taxi learner lines (Puerto Colibrí)", () => {
  afterEach(() => setVariety("default"));
  it("lists them in both coach voices of every set, not in the driver's", async () => {
    await loadSituation("s66-taxi");
    const { utts } = enumerateEs({ only: ["s66-taxi"], fuzzRuns: 0, probes: false });
    for (const variety of varieties) {
      setVariety(variety);
      for (const key of LEARNER) {
        for (const g of ["f", "m"] as const) {
          const sentence = conversationLine("s66-taxi", "vinnie", key, undefined, true);
          expect(sentence, key).toBeTruthy();
          expect(utts.some((u) => u.voice === coachVoice(g) && u.say === sentence!.say), `${variety} ${g} ${key}`).toBe(true);
          expect(utts.some((u) => u.voice === npcVoice(NPCS.vinnie) && u.say === sentence!.say && u.where.includes(key)), `${variety} driver ${key}`).toBe(false);
        }
      }
    }
  });
});
