// The scene card (src/ui/SceneIntro.tsx) shows each conversation's intro before its first line: every one speaks to
// the learner (tu, tavo, tau…), so it says who and where they are (the owner couldn't tell in p28, 13 Nov 2026).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "../src/content/situations";

describe("scene intros", () => {
  it("every conversation has one that speaks to the learner", () => {
    const you = /(?<![\p{L}])(tu|tau|tave|tavęs|tavo|tavimi|tavyje)(?![\p{L}])/iu;
    const bad = SITUATIONS.filter((s) => !s.intro || !you.test(s.intro)).map((s) => `${s.id}: ${s.intro?.slice(0, 60)}`);
    expect(bad).toEqual([]);
  });
});
