import { expect, it } from "vitest";
import { portraitToolbarRows, toolbarColumns } from "../src/ui/toolbarLayout";

it.each([
  { hasRadio: false, hasCourse: false, columns: [4, 4] },
  { hasRadio: true, hasCourse: false, columns: [5, 4] },
  { hasRadio: false, hasCourse: true, columns: [5, 4] },
  { hasRadio: true, hasCourse: true, columns: [5, 5] },
])("balances the drawer with radio=$hasRadio and course link=$hasCourse", ({ hasRadio, hasCourse, columns }) => {
  const { single, split } = portraitToolbarRows({ hasHelp: true, hasRadio, hasCourse });
  expect([split, single - split]).toEqual(columns);
  expect(toolbarColumns(single, split)).toEqual(columns);
});

it.each([
  { buttons: 7, maxRows: 9, columns: [7] },
  { buttons: 8, maxRows: 4, columns: [4, 4] },
  { buttons: 9, maxRows: 4, columns: [3, 3, 3] },
  { buttons: 10, maxRows: 4, columns: [4, 3, 3] },
])("fits $buttons buttons into the fewest columns with $maxRows rows", ({ buttons, maxRows, columns }) => {
  expect(toolbarColumns(buttons, maxRows)).toEqual(columns);
});

it("counts only the six town actions and LR when the optional buttons are absent", () => {
  expect(portraitToolbarRows({ hasHelp: false, hasRadio: false, hasCourse: false })).toEqual({ single: 7, split: 4 });
});

it("reserves an extra row for the mode exit in the ride drawer", () => {
  expect(portraitToolbarRows({ hasHelp: true, hasRadio: false, hasCourse: false, modeExit: true })).toEqual({ single: 9, split: 5 });
});
