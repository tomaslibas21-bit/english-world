import type { BufferGeometry } from "three";

/** Half-open ranges of triangle indices (or nonindexed vertices) that participate in collision sampling. */
type CollisionRange = readonly [start: number, end: number];

export function collisionRanges(geometry: BufferGeometry): readonly CollisionRange[] {
  return geometry.userData.collisionRanges ?? [[0, geometry.index?.count ?? geometry.getAttribute("position").count]];
}

/** Surface finishes render in their normal batch, without changing the camera field or jump surfaces. */
export function visualOnly(geometry: BufferGeometry) {
  geometry.userData.collisionRanges = [];
  return geometry;
}

export function mergeCollisionRanges(target: BufferGeometry, parts: readonly BufferGeometry[]) {
  if (!parts.some((part) => part.userData.collisionRanges !== undefined)) return;
  const ranges: [number, number][] = [];
  let offset = 0;
  for (const part of parts) {
    for (const [start, end] of collisionRanges(part)) {
      const last = ranges.at(-1);
      if (last && last[1] === offset + start) last[1] = offset + end;
      else ranges.push([offset + start, offset + end]);
    }
    offset += part.index?.count ?? part.getAttribute("position").count;
  }
  target.userData.collisionRanges = ranges;
}
