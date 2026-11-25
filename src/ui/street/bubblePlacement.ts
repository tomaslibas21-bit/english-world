type Bounds = Pick<DOMRect, "left" | "right" | "top" | "bottom">;
type Point = { x: number; y: number };

const EDGE = 8;
const GAP = 9;
const NEAR = 44;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function placeBubble(head: Point, width: number, height: number, screenWidth: number, screenHeight: number,
  hud: Bounds[], minHeight = height) {
  const maxX = screenWidth - width - EDGE, screenBottom = screenHeight - EDGE;
  if (maxX < EDGE || screenBottom - EDGE < minHeight) return;

  // Expand the obstacles by the pointer clearance and the width of the bubble on their left.
  const blocked = [...hud, { left: head.x, right: head.x, top: head.y, bottom: head.y }].map((rect) => ({
    left: rect.left - width - GAP, right: rect.right + GAP,
    top: rect.top - GAP, bottom: rect.bottom + GAP,
  })).sort((a, b) => a.top - b.top);
  const xs = [EDGE, maxX, clamp(head.x - width / 2, EDGE, maxX)];
  for (const box of blocked) {
    if (box.left > EDGE && box.left < maxX) xs.push(box.left);
    if (box.right > EDGE && box.right < maxX) xs.push(box.right);
  }

  let best: { x: number; y: number; height: number; dx: number; dy: number; vertical: boolean; priority: number; distance: number; alignment: number } | undefined;
  const considerGap = (x: number, top: number, bottom: number) => {
    const fittedHeight = Math.min(height, bottom - top);
    if (fittedHeight < minHeight || (best && fittedHeight < best.height)) return;
    const maxY = bottom - fittedHeight;
    for (const y of [top, maxY, clamp(head.y - fittedHeight / 2, top, maxY)]) {
      const dx = head.x - clamp(head.x, x, x + width), dy = head.y - clamp(head.y, y, y + fittedHeight);
      const distance = Math.hypot(dx, dy);
      const vertical = Math.abs(dy) >= Math.abs(dx);
      // Keep as much text visible as possible, then prefer above, beside or below a nearby speaker.
      const priority = distance > NEAR ? 3 : !vertical ? 1 : dy > 0 ? 0 : 2;
      const alignment = vertical ? Math.abs(head.x - x - width / 2) : Math.abs(head.y - y - fittedHeight / 2);
      if (!best || fittedHeight > best.height || priority < best.priority || (priority === best.priority &&
        (distance < best.distance || (distance === best.distance && alignment < best.alignment)))) {
        best = { x, y, height: fittedHeight, dx, dy, vertical, priority, distance, alignment };
      }
    }
  };
  for (const x of xs) {
    let top = EDGE;
    for (const box of blocked) {
      if (x <= box.left || x >= box.right) continue;
      considerGap(x, top, Math.min(box.top, screenBottom));
      top = Math.max(top, box.bottom);
    }
    considerGap(x, top, screenBottom);
  }
  if (!best) return;

  const { x, y, height: fittedHeight, dx, dy, vertical } = best;
  const tail = vertical
    ? { x: clamp(head.x - x, 13, width - 13), y: dy > 0 ? fittedHeight : 0 }
    : { x: dx > 0 ? width : 0, y: clamp(head.y - y, 13, fittedHeight - 13) };
  const angle = Math.atan2(x + tail.x - head.x, head.y - y - tail.y) * 180 / Math.PI;
  return { x, y, height: fittedHeight, tail: { ...tail, angle } };
}
