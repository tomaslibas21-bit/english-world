export const CINEMA_SEAT = { x: 3.25, z: -3, heading: Math.PI / 2, approachX: 4.23 };
export const CINEMA_TITLE = { en: "Lunch on the Fly", lt: "Nuskridę pietūs" };
export const FILM_SECONDS = 72;

// A representative exposure for each shot doubles as the reduced-motion storyboard.
export const SHOTS = [
  { start: 0, still: 0 },        // title
  { start: 5, still: 10 },       // the keeper lifts his lunch, a gull sizes it up
  { start: 14, still: 19 },      // the theft
  { start: 23, still: 28 },      // the crate hurdles
  { start: 36, still: 42 },      // the gull doubles back, the keeper skids
  { start: 47, still: 53 },      // the sandwich tumbles; the keeper dives
  { start: 59, still: 64 },      // the gull lands on his head
  { start: 67, still: 70 },      // two halves, lunch together
] as const;

export function exposure(seconds: number, reduced: boolean) {
  const shot = SHOTS.findLastIndex(cut => seconds >= cut.start);
  return { shot, time: reduced ? SHOTS[shot].still : Math.floor(seconds * 24) / 24 };
}

// One bar answers the other; the keeper's bass lands on the downbeat, the gull answers offbeat.
const BARS = [
  [60, 0, 72, 76, 55, 0, 79, 76],
  [60, 72, 0, 69, 55, 67, 0, 71],
  [53, 0, 69, 72, 57, 0, 77, 76],
  [55, 74, 71, 0, 55, 67, 0, 0],
];
export function scoreNote(beat: number, shot: number) {
  const pitch = BARS[Math.floor(beat / 8) % BARS.length][beat % 8];
  if (!pitch || (shot === 5 && beat % 4 > 0)) return;
  const bass = beat % 4 === 0;
  return { hz: 440 * 2 ** ((pitch + (shot === 3 ? 5 : 0) - 69) / 12),
    length: bass ? 0.19 : 0.10, level: bass ? 0.08 : 0.055 };
}
