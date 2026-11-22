import { expect, it } from "vitest";
import { portraitToolbarRows } from "../src/ui/toolbarLayout";

it.each([
  { hasRadio: false, hasCourse: false, columns: [4, 4] },
  { hasRadio: true, hasCourse: false, columns: [5, 4] },
  { hasRadio: false, hasCourse: true, columns: [5, 4] },
  { hasRadio: true, hasCourse: true, columns: [5, 5] },
])("balances the drawer with radio=$hasRadio and course link=$hasCourse", ({ hasRadio, hasCourse, columns }) => {
  const { single, split } = portraitToolbarRows({ hasHelp: true, hasRadio, hasCourse });
  expect([split, single - split]).toEqual(columns);
});

it("reserves an extra row for the mode exit in the ride drawer", () => {
  expect(portraitToolbarRows({ hasHelp: true, hasRadio: false, hasCourse: false, modeExit: true })).toEqual({ single: 9, split: 5 });
});
