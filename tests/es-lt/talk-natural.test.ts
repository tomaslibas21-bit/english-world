import { expect, it } from "vitest";
import { Group } from "three";
import { EDITION } from "@/edition";
import { ASK_WAY_LINES } from "@/content/ask-way-lines";
import { classifyTalk, talkPersonality } from "@/content/talkNatural";
import { talkRoomAnchors } from "@/game/world/talkNatural";
import { compose, setVariety } from "@/convo/compose";
import { ASK_WAY_LINES as enLines } from "../../src/editions/es/content/ask-way-lines";
import { classifyTalk as enClassify, talkPersonality as enPersonality } from "../../src/editions/es/content/talkNatural";
import { talkRoomAnchors as enAnchors } from "../../src/editions/es/game/world/talkNatural";

it("uses the same Spanish directions, personality and staged anchors for Lithuanian learners", () => {
  expect([EDITION.id, EDITION.helper]).toEqual(["es", "lt"]);
  expect(classifyTalk).toBe(enClassify);
  expect(talkPersonality).toBe(enPersonality);
  expect(talkRoomAnchors).toBe(enAnchors);
  try {
    for (const variety of ["default", "neutral", "spain"] as const) {
      setVariety(variety);
      for (const key of ["aw_greet", "aw_post_1", "aw_cafe_1", "aw_pier_1", "aw_easy", "aw_bye"]) {
        const opts = { look: () => undefined, formal: true };
        const spoken = compose(ASK_WAY_LINES[key][0], {}, opts).say;
        const expected = compose(enLines[key][0], {}, opts).say;
        expect(spoken).toBe(expected);
        expect(classifyTalk(spoken, "town", key === "aw_greet")).toEqual(enClassify(expected, "town", key === "aw_greet"));
      }
    }
  } finally { setVariety("default"); }
  expect(talkRoomAnchors("gas-station", new Group()).handoff?.toArray()).toEqual([-3, 1.08, -2.8]);
});
