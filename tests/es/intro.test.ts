// The scene card (src/ui/SceneIntro.tsx) shows each conversation's intro before its first line: every one has an
// intro that tells the learners who they are and where (the owner couldn't tell in p28, 13 Nov 2026).
import { describe, expect, it } from "vitest";
import { ASK_WAY_META, ASK_WAY_SITUATION } from "@/content/ask-way-lines";
import { PHOTO_WALK_META, PHOTO_WALK_SITUATION } from "@/content/photo-walk-lines";
import { SITUATIONS } from "@/content/situations";
import { LOTERIA_SITUATION } from "../../src/editions/es/content/loteria";

describe("scene intros", () => {
  it("every conversation has one that speaks to the learner", () => {
    // Lotería's authored intro describes the scene and its separate goal addresses the learner.
    const quests = new Map([[PHOTO_WALK_SITUATION, PHOTO_WALK_META.intro], [ASK_WAY_SITUATION, ASK_WAY_META.intro]]);
    for (const [id, intro] of quests) expect(SITUATIONS.find((sit) => sit.id === id)?.intro).toBe(intro);
    const bad = SITUATIONS.filter((s) => !quests.has(s.id)).filter((s) => !s.intro || (s.id === LOTERIA_SITUATION
      ? !s.goal?.startsWith("Sit down")
      : !/\b(you|your|you're|you've)\b/i.test(s.intro))).map((s) => s.id);
    expect(bad).toEqual([]);
  });
});
