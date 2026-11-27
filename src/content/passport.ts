import type { KeepsakeKind } from "./keepsakes";
import type { Words } from "../passport/words";

// The Puerto Colibrí overlay supplies its own game allowlist and keepsake titles.
export const games: Readonly<Record<string, Words>> = {};
export const keepsakeNames: Readonly<Partial<Record<KeepsakeKind, string>>> = {};
export const COURSE_MISSIONS: Readonly<Record<string, string>> = {};
