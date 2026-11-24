// The scene card (src/ui/SceneIntro.tsx) shows each conversation's intro before its first line: every one speaks to
// the learner in the scene's register, so it says who and where they are (the owner couldn't tell in p28, 13 Nov 2026).
import { describe, expect, it } from "vitest";
import { ASK_WAY_META, ASK_WAY_SITUATION } from "../src/content/ask-way-lines";
import { PHOTO_WALK_META, PHOTO_WALK_SITUATION } from "../src/content/photo-walk-lines";
import { SITUATIONS } from "../src/content/situations";

describe("scene intros", () => {
  const questIntros = new Map([[PHOTO_WALK_SITUATION, PHOTO_WALK_META.intro], [ASK_WAY_SITUATION, ASK_WAY_META.intro]]);
  it("the supplied quest introductions describe the person", () => {
    for (const [id, intro] of questIntros) expect(SITUATIONS.find((s) => s.id === id)?.intro).toBe(intro);
  });

  it("the other conversations speak to the learner in the intro", () => {
    const informalYou = /(?<![\p{L}])(tu|tau|tave|tavęs|tavo|tavimi|tavyje)(?![\p{L}])/iu;
    const surfId = "x04-surf";
    expect(SITUATIONS.some((s) => s.id === surfId), `${surfId} must exist`).toBe(true);

    for (const { id, intro } of SITUATIONS) {
      if (questIntros.has(id)) continue;
      if (id === surfId) {
        expect(intro).toMatch(/^Jūs prieinate prie „Harbor Surf“ namelio vakariniame paplūdimyje\./u);
        expect(intro).toContain("Maren Pike nuomoja lentas ir moko čiuožti banglente.");
        expect(intro).toContain("Atėjote išsinuomoti įrangos arba susitarti dėl pamokos.");
        expect(intro).not.toMatch(informalYou);
      } else {
        expect(intro ?? "", id).toMatch(informalYou);
      }
    }
  });
});
