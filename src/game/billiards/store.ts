import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { ResolvedPhrase } from "../kit/phrases";
import type { SayItCue } from "../kit/sayIt";
import type { Call } from "./calls";
import type { Pocket } from "./physics";
import type { Side, Winner } from "./rules";

export type Phase = "intro" | "group" | "break" | "call" | "aim" | "rolling" | "tina" | "listen" | "feedback" | "reply" | "result";
export interface RackBall { id: number; down: boolean }
export interface Result { winner: Winner; shots: number; called: number; understood: number; listens: number; sunk: number; cards: number; said?: number }

interface BilliardsUI {
  phase: Phase;
  side: Side;
  line: KitLine | null;
  choices: KitLine[];
  mic: KitMic;
  micOn: boolean;
  balls: Record<Side, RackBall[]>;
  available: number[];
  pockets: { id: Pocket; line: KitLine }[];
  selection: Partial<Call>;
  callOptions: KitLine[];
  call: KitLine | null;
  sayIt: SayItCue | null;
  reveal: boolean;
  replaying: boolean;
  correct: boolean | null;
  power: number;
  aimHelp: boolean;
  result: Result | null;
  review?: ResolvedPhrase[];
}

const empty: BilliardsUI = {
  phase: "intro", side: "learner", line: null, choices: [],
  mic: { status: "off", heard: "" }, micOn: true,
  balls: { learner: [], tina: [] }, available: [], pockets: [], selection: {}, callOptions: [], call: null, sayIt: null,
  reveal: false, replaying: false, correct: null, power: 0, aimHelp: false, result: null, review: undefined,
};
export const useBilliards = create<BilliardsUI>(() => empty);
export const resetBilliards = () => useBilliards.setState(empty);
