// The surf lesson's words (the engine is src/game/surf/): which conversation holds the instructor's lines (its
// `lines` have one key "sg_<cue>" per cue of src/game/surf/logic.ts CUES, so the voices, the cards and every learner
// layer treat them as any conversation's lines) and who the instructor is. Maple Harbor has no surf school yet.
export interface SurfContent {
  /** The conversation whose `lines` hold the cues, and the instructor (an id of NPCS). */
  situation: string;
  npc: string;
  /** The same lines by themselves (the conversation's own are used where it has them: a learner layer's text). */
  lines?: Record<string, import("./types").SentSrc[]>;
  /** A picture of what a cue asks for, where the edition has them (the lesson shows it beside her line): the folder
   *  under public/ and, per cue, the picture's file name without ".webp". An edition without pictures leaves it out. */
  pictures?: { dir: string; of: Record<string, string> };
}

export const SURF: SurfContent | null = null;
