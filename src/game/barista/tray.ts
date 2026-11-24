import type { Pick, Row } from "../../content/barista";

export type Build = { size?: string; drink?: string; milk?: string; extras: string[]; dine?: string };

export const matchesPick = (build: Build, { row, id }: Pick) => row === "extras" ? build.extras.includes(id) : build[row] === id;

const rowsWithMilk: readonly Row[] = ["size", "drink", "milk", "extras", "dine"];
const rowsWithoutMilk: readonly Row[] = ["size", "drink", "extras", "dine"];

export function trayRows(build: Build): readonly Row[] {
  return build.drink === "hot_chocolate" ? rowsWithoutMilk : rowsWithMilk;
}
