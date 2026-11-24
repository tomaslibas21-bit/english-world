type Bounds = Pick<DOMRect, "left" | "right" | "top" | "bottom">;
type Point = { x: number; y: number };

const EDGE = 8;
const GAP = 9;
const NEAR = 44;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function placeBubble(head: Point, width: number, height: number, screenWidth: number, screenHeight: number,
  hud: Bounds[]) {
  const maxX = screenWidth - width - EDGE, maxY = screenHeight - height - EDGE;
  if (maxX < EDGE || maxY < EDGE) return;

  // Rectangles in top-left coordinates that would put the bubble over the HUD or the speaker.
  // The clearance also leaves room for the pointer.
  const blocked = [...hud, { left: head.x, right: head.x, top: head.y, bottom: head.y }].map((rect) => ({
    left: rect.left - width - GAP, right: rect.right + GAP,
    top: rect.top - height - GAP, bottom: rect.bottom + GAP,
  }));
  // A nearest free position is either aligned with the head or bounded by a HUD or screen edge.
  const xs = [EDGE, maxX, clamp(head.x - width / 2, EDGE, maxX)];
  const ys = [EDGE, maxY, clamp(head.y - height / 2, EDGE, maxY)];
  for (const box of blocked) {
    if (box.left > EDGE && box.left < maxX) xs.push(box.left);
    if (box.right > EDGE && box.right < maxX) xs.push(box.right);
    if (box.top > EDGE && box.top < maxY) ys.push(box.top);
    if (box.bottom > EDGE && box.bottom < maxY) ys.push(box.bottom);
  }

  let best: { x: number; y: number; dx: number; dy: number; vertical: boolean; priority: number; distance: number; alignment: number } | undefined;
  for (const x of xs) for (const y of ys) {
    if (blocked.some((box) => x > box.left && x < box.right && y > box.top && y < box.bottom)) continue;
    const dx = head.x - clamp(head.x, x, x + width), dy = head.y - clamp(head.y, y, y + height);
    const distance = Math.hypot(dx, dy);
    const vertical = Math.abs(dy) >= Math.abs(dx);
    // Prefer above, beside, then below when close to the head. Farther away, use the nearest free space.
    const priority = distance > NEAR ? 3 : !vertical ? 1 : dy > 0 ? 0 : 2;
    const alignment = vertical ? Math.abs(head.x - x - width / 2) : Math.abs(head.y - y - height / 2);
    if (!best || priority < best.priority || (priority === best.priority &&
      (distance < best.distance || (distance === best.distance && alignment < best.alignment)))) {
      best = { x, y, dx, dy, vertical, priority, distance, alignment };
    }
  }
  if (!best) return;

  const { x, y, dx, dy, vertical } = best;
  const tail = vertical
    ? { x: clamp(head.x - x, 13, width - 13), y: dy > 0 ? height : 0, angle: dy > 0 ? 0 : 180 }
    : { x: dx > 0 ? width : 0, y: clamp(head.y - y, 13, height - 13), angle: dx > 0 ? -90 : 90 };
  return { x, y, tail };
}
