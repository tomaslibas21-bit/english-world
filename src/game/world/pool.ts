import { THEME } from "./theme";

export const HOTEL_POOL_ENABLED = THEME.hotelPool && !(
  import.meta.env?.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).get("nopool") === "1"
);

export const POOL_SITUATION = "x09-alberca";
export const poolMotionPreference = typeof matchMedia === "function"
  ? matchMedia("(prefers-reduced-motion: reduce)") : null;

export const HOTEL_POOL = {
  x: -106,
  z: -32,
  halfWidth: 3,
  halfLength: 5,
  water: -0.12,
  shallow: -1.16,
  swim: { depth: 1.18, out: 1.09 },
  floatSeat: 0.60,
  bench: { x0: -0.65, x1: 3, z0: 0.5, z1: 2.7, y: -0.88 },
  deep: -1.97,
  steps: { x: 1.2, width: 2.55, foot: 3.35 },
  deck: { halfWidth: 5.5, north: -8.9, south: 7.5 },
} as const;

export const POOL_KIDS = ["vale", "diego", "santi"] as const;
export type PoolKid = typeof POOL_KIDS[number];

const { x, z, steps } = HOTEL_POOL;
export const POOL_ENTRY = { x: x + steps.x, z: z + 6, rot: Math.PI };
export const POOL_TALK = { x: x + steps.x, z: z + 4.6 };
export const POOL_CIRCLE = {
  learner: { x, z: z + 3.25 },
  vale: { x: x + 1.55, z: z + 2.15 },
  diego: { x, z: z + 0.9 },
  santi: { x: x - 1.55, z: z + 2.15 },
};
export const POOL_CENTER = { x, z: z + 2.15 };
export const POOL_SPOTS = POOL_KIDS.map((npc) => ({
  npc, ...POOL_CIRCLE[npc],
  rot: npc === "vale" ? 0 : npc === "santi" ? Math.PI / 2 : 0,
  ...(npc === "vale" ? { ax: POOL_TALK.x, az: POOL_TALK.z } : {}),
}));

export function hotelPoolBounds() {
  const { x, z, halfWidth, halfLength } = HOTEL_POOL;
  return { x0: x - halfWidth, x1: x + halfWidth, z0: z - halfLength, z1: z + halfLength };
}

/** Paint the four deck strips in one running bond, clipped to the basin even across the stair opening. */
export function paintHotelPoolPaving(rect: (x0: number, z0: number, x1: number, z1: number, color: string) => void) {
  const { x, z, deck } = HOTEL_POOL, basin = hotelPoolBounds();
  const left = x - deck.halfWidth, right = x + deck.halfWidth;
  const north = z + deck.north, south = z + deck.south;
  const pads = [
    [left, north, right, basin.z0], [left, basin.z1, right, south],
    [left, basin.z0, basin.x0, basin.z1], [basin.x1, basin.z0, right, basin.z1],
  ];
  const width = 0.9, depth = 0.55, joint = 0.045;
  for (const [x0, z0, x1, z1] of pads) {
    rect(x0, z0, x1, z1, "#c2b097");
    for (let row = Math.floor((z0 - north) / depth); north + row * depth < z1; row++) {
      const top = north + row * depth;
      const start = left - (row % 2) * width / 2;
      for (let col = Math.floor((x0 - start) / width); start + col * width < x1; col++) {
        const edge = start + col * width;
        const ax = Math.max(x0, edge), bx = Math.min(x1, edge + width - joint);
        const az = Math.max(z0, top), bz = Math.min(z1, top + depth - joint);
        if (ax < bx && az < bz) rect(ax, az, bx, bz, (col + row * 3) % 5 < 2 ? "#d4bf9d" : "#ddcbab");
      }
    }
  }
}

export function inHotelPool(x: number, z: number) {
  const { halfWidth, halfLength } = HOTEL_POOL;
  return Math.abs(x - HOTEL_POOL.x) < halfWidth && Math.abs(z - HOTEL_POOL.z) < halfLength;
}

export function hotelPoolKidY(kid: PoolKid) {
  if (kid === "santi") return HOTEL_POOL.water - HOTEL_POOL.floatSeat;
  const { x, z } = POOL_CIRCLE[kid];
  return hotelPoolBed(x, z);
}

export function hotelPoolBed(x: number, z: number) {
  const dx = x - HOTEL_POOL.x, dz = z - HOTEL_POOL.z;
  const { bench, steps, halfLength, shallow, deep } = HOTEL_POOL;
  if (dx > bench.x0 && dx < bench.x1 && dz > bench.z0 && dz < bench.z1) return bench.y;
  if (dz > steps.foot && Math.abs(dx - steps.x) < steps.width / 2) {
    const climb = (dz - steps.foot) / (halfLength - steps.foot);
    return shallow * (1 - climb);
  }
  // A gentle slope between the level shallow shelf and the deep end.
  const down = Math.min(1, Math.max(0, (0.5 - dz) / 2.7));
  return shallow + (deep - shallow) * down;
}
