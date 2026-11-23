import { smoothstep } from "../movement";

export const DEPARTURE_SECONDS = 1.6;
export const TITLE_SECONDS = 1.2;
export const RETURN_SEAM = 1.2;

export const crest = (age: number) => smoothstep(0.06, 0.64, age) * (1 - smoothstep(0.64, 1.22, age));
export const titleOpacity = (age: number) => smoothstep(0.12, 0.38, age) * (1 - smoothstep(0.88, TITLE_SECONDS, age));
