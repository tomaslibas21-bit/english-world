export const SEA_SECONDS = 120;
export const CRUISE_SPEED = 12;
export const SLOW_SPEED = 6;
export const FAST_SPEED = 16;
export const FIRST_GATE = CRUISE_SPEED * 6;
export const GATE_SPACING = CRUISE_SPEED * 8;
export const LANE_WIDTH = 7;
export const WIDE_GATE_VIEW = 900;

export const nextGate = (distance: number) => distance + GATE_SPACING;
export const laneOffset = (lane: number) => (lane - 1) * LANE_WIDTH;
export const laneAt = (x: number) => Math.max(0, Math.min(2, Math.round(x / LANE_WIDTH) + 1));
