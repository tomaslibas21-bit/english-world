// The scene card (src/ui/SceneIntro.tsx) shows each conversation's intro before its first line: every one has an
// intro that tells the learners who they are and where (the owner couldn't tell in p28, 13 Nov 2026).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";

describe("scene intros", () => {
  it("every conversation has one that speaks to the learner", () => {
    const bad = SITUATIONS.filter((s) => !s.intro || !/\b(you|your|you're|you've)\b/i.test(s.intro)).map((s) => s.id);
    expect(bad).toEqual([]);
  });
});
