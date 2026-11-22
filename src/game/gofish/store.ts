import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { Npc, Player, Round, Word } from "./logic";

export type Step = "intro" | "listen" | "ask" | "reply" | "fish" | "pair" | "move" | "score";
export type Result = { winner: Player | null; right: number; replies: number; cards: number };
type Cue = KitLine & { speaker: Player };

interface GoFishUi {
  offered: boolean;
  round: Round | null;
  step: Step;
  line: Cue | null;
  choices: KitLine[];
  mic: KitMic;
  micOn: boolean;
  target: Npc | null;
  picked: Word | null;
  hintCard: Word | null;
  hintReply: string | null;
  tip: string | null;
  gloss: boolean;
  busy: boolean;
  drawn: Word | null;
  result: Result | null;
}

const empty: GoFishUi = {
  offered: false, round: null, step: "intro", line: null, choices: [], mic: { status: "off", heard: "" }, micOn: true,
  target: null, picked: null, hintCard: null, hintReply: null, tip: null, gloss: true, busy: false, drawn: null, result: null,
};

export const useGoFish = create<GoFishUi>(() => empty);
export function resetGoFishUi() { useGoFish.setState(empty); }
