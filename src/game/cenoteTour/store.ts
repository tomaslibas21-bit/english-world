import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";

const silent: KitMic = { status: "off", heard: "" };
const initial = { line: null, answer: null, choices: [], mic: silent, micOn: true } as {
  line: KitLine | null; answer: KitLine | null; choices: KitLine[]; mic: KitMic; micOn: boolean;
};
export const useCenoteTour = create(() => initial);
export const resetCenoteTour = () => useCenoteTour.setState(initial);
