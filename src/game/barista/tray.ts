import { BARISTA_CHOCOLATE, BARISTA_CONVERSATION, type Pick, type Row } from "../../content/barista";
import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";
import type { baristaMenu } from "./menu";

export type Build = { size?: string; drink?: string; milk?: string; extras: string[]; dine?: string };

export const matchesPick = (build: Build, { row, id }: Pick) => row === "extras" ? build.extras.includes(id) : build[row] === id;

export function trayRows(build: Build): Row[] {
  return build.drink === BARISTA_CHOCOLATE
    ? ["size", "drink", "extras", "dine"]
    : ["size", "drink", "milk", "extras", "dine"];
}

export function trayPhrases(menu: ReturnType<typeof baristaMenu>, built: Build): PhraseReviewEntry[] {
  return trayRows(built).flatMap((row) => menu[row].map(({ en, lt }) => ({
    situationId: BARISTA_CONVERSATION.situation, sentence: { en, nat: lt, say: en, units: [] },
  })));
}
