// The scene card (src/ui/SceneIntro.tsx) shows each conversation's intro before its first line: every one speaks to
// the learner (tu, tavo, tau…), so it says who and where they are (the owner couldn't tell in p28, 13 Nov 2026).
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
    const you = /(?<![\p{L}])(tu|tau|tave|tavęs|tavo|tavimi|tavyje)(?![\p{L}])/iu;
    const bad = SITUATIONS.filter((s) => !questIntros.has(s.id) && (!s.intro || !you.test(s.intro))).map((s) => `${s.id}: ${s.intro?.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });
});
