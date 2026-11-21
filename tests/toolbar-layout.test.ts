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
