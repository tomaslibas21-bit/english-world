import { afterEach, describe, expect, it } from "vitest";
import { BILLIARDS_LINES, BILLIARDS_NPC, BILLIARDS_SITUATION } from "@/content/billiards-lines";
import { keepsakeFor } from "@/content/keepsakes";
import { LOCATIONS } from "@/content/locations";
import { NPCS } from "@/content/npcs";
import { ROUTE } from "@/content/route";
import { SITUATION_BY_ID } from "@/content/situations";
import { addressInformal, compose, setVariety } from "@/convo/compose";
import { parseCall } from "@/game/billiards/calls";
import { POCKET_IDS } from "@/game/billiards/physics";
import { BUILDINGS } from "@/game/world/layout";
import { learnerItems } from "@/editions/es/learner/walk";
import { playSim } from "../../tools/sim-play";

const sit = SITUATION_BY_ID[BILLIARDS_SITUATION];
const options = { look: () => undefined, formal: true };

afterEach(() => setVariety("default"));

describe("La Buchaca", () => {
  it("registers its cantina, owner and keepsake off the route", () => {
    expect(sit).toMatchObject({ id: "x11-billar", bonus: true, location: "pool-hall", npc: "memo", mode: "talk" });
    expect(ROUTE.some(({ id }) => id === sit.id)).toBe(false);
    expect(LOCATIONS[sit.location]).toMatchObject({ name: "Cantina La Buchaca", kind: "interior" });
    expect(BUILDINGS.find(({ loc }) => loc === sit.location)).toMatchObject({ x: -14, z: 23 });
    expect(NPCS[BILLIARDS_NPC]).toMatchObject({ name: "Don Memo", gender: "m", informal: false, informalSpain: false });
    expect(keepsakeFor(sit.id)).toBe("cue_chalk");
    expect(learnerItems(sit)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "sent", es: "Cante | su | tiro." }),
      expect.objectContaining({ kind: "sent", es: "a | la esquina | del fondo, | a la izquierda." }),
      expect.objectContaining({ kind: "sent", es: "¡Gracias, | estuvo | divertido!" }),
    ]));
  });

  it.each(["default", "neutral", "spain"] as const)("finishes the chat in %s with the chosen group", (variety) => {
    setVariety(variety);
    expect(addressInformal(NPCS[BILLIARDS_NPC])).toBe(false);
    for (const sim of sit.sims ?? []) {
      const run = playSim(sit, sim, 1);
      const events = run.turns.flatMap(({ out }) => out.events);
      expect(run.conv.completed).toBe(sim.expect.complete);
      if (sim.expect.complete) {
        expect(events).toEqual([expect.objectContaining({ name: "billiards", data: { group: sim.expect.state?.group } })]);
      } else {
        expect(events).toEqual([]);
      }
    }
  });

  it.each(["default", "neutral", "spain"] as const)("parses every authored ball and pocket in %s", (variety) => {
    setVariety(variety);
    for (let ball = 1; ball <= 15; ball++) {
      const ballLine = compose(BILLIARDS_LINES[`bl_b${ball}`][0], {}, options);
      for (const pocket of POCKET_IDS) {
        const pocketLine = compose(BILLIARDS_LINES[`bl_p_${pocket}`][0], {}, options);
        expect(parseCall(`${ballLine.en} ${pocketLine.en}`)).toEqual({ ball, pocket });
      }
    }
  });

  it.each([
    ["Bola 15 a la buchaca de la esquina de allá a la derecha", 15, "fr"],
    ["La bola 7 a la tronera de la esquina del fondo a la izquierda", 7, "fl"],
    ["Dos, izquierda de acá", 2, "nl"],
    ["La trece, a la esquina derecha de aquí", 13, "nr"],
    ["Catorce, del centro a la izquierda", 14, "ls"],
    ["Bola diez, a la tronera del medio derecha", 10, "rs"],
    ["Cinco a la buchaca de en medio a la derecha", 5, "rs"],
  ])("reads %s", (text, ball, pocket) => expect(parseCall(text)).toEqual({ ball, pocket }));

  it.each(["siete", "a la izquierda", "la ocho a la esquina", "16 del medio izquierda", "cero del fondo derecha", "siete de acá"])(
    "requires a valid number and specific pocket in %s", (text) => expect(parseCall(text)).toBeNull(),
  );
});
