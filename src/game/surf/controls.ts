import type { Do } from "./logic";

export const DIRECTIONS = ["up", "left", "down", "right"] as const;
export type SurfArrow = typeof DIRECTIONS[number];

const UP = Object.freeze(["up"] as const);
const DOWN = Object.freeze(["down"] as const);
const LEFT = Object.freeze(["left"] as const);
const RIGHT = Object.freeze(["right"] as const);
const MOVE_ARROWS: Readonly<Record<Do, readonly SurfArrow[]>> = Object.freeze({
  paddle: UP, up: UP, fwd: UP, jump: UP,
  duck: DOWN, down: DOWN, turn: Object.freeze(["left", "right"] as const),
  left: LEFT, right: RIGHT, steady: Object.freeze([]),
});

export function arrowFor(move: Do) { return MOVE_ARROWS[move]; }

export const ARROW_BITS: Readonly<Record<SurfArrow, number>> = { up: 1, left: 2, down: 4, right: 8 };

export const KEY_DIRECTION = new Map<string, SurfArrow>([
  ["arrowup", "up"], ["w", "up"], ["arrowdown", "down"], ["s", "down"],
  ["arrowleft", "left"], ["a", "left"], ["arrowright", "right"], ["d", "right"],
]);
