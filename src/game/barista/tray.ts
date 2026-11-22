import type { Pick, Row } from "../../content/barista";

export type Build = { size?: string; drink?: string; milk?: string; extras: string[]; dine?: string };

export const matchesPick = (build: Build, { row, id }: Pick) => row === "extras" ? build.extras.includes(id) : build[row] === id;

export function trayRows(build: Build): Row[] {
  return build.drink === "hot_chocolate"
    ? ["size", "drink", "extras", "dine"]
    : ["size", "drink", "milk", "extras", "dine"];
}
