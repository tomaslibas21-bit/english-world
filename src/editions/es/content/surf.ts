// Puerto Colibrí's surf lesson (replaces src/content/surf.ts): Nayeli's commands are the "sg_…" lines of x01-surf
// (surf-lines.ts), in the three Spanishes like every line.
import type { SurfContent } from "@/content/surf";
import { SURF_LINES } from "./surf-lines";
export type { SurfContent } from "@/content/surf";

export const SURF: SurfContent | null = { situation: "x01-surf", npc: "surf", lines: SURF_LINES };
