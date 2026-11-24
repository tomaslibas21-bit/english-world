const EDGE = 8;
const GAP = 9;
const NEAR = 44;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createBubblePlacement(capacity: number) {
  // Reserve one extra blocker for the head. Only the live prefix is read each frame.
  const blockers = Array.from({ length: capacity + 1 }, () => ({ left: 0, right: 0, top: 0, bottom: 0 }));
  const xs = new Float64Array(3 + blockers.length * 2);
  const ys = new Float64Array(xs.length);
  const result = { x: 0, y: 0, tail: { x: 0, y: 0, angle: 0 } };

  function place(headX: number, headY: number, width: number, height: number, screenWidth: number, screenHeight: number,
    count: number) {
    const maxX = screenWidth - width - EDGE, maxY = screenHeight - height - EDGE;
    if (maxX < EDGE || maxY < EDGE) return;

    const head = blockers[count++];
    head.left = head.right = headX;
    head.top = head.bottom = headY;

    // A free position nearest to the head aligns with it or with a blocker or screen edge.
    xs[0] = ys[0] = EDGE;
    xs[1] = maxX;
    ys[1] = maxY;
    xs[2] = clamp(headX - width / 2, EDGE, maxX);
    ys[2] = clamp(headY - height / 2, EDGE, maxY);
    let nx = 3, ny = 3;
    for (let i = 0; i < count; i++) {
      // Convert to top-left coordinates that would put the bubble or tail over the blocker.
      const box = blockers[i];
      box.left = box.left - width - GAP;
      box.right += GAP;
      box.top = box.top - height - GAP;
      box.bottom += GAP;
      if (box.left > EDGE && box.left < maxX) xs[nx++] = box.left;
      if (box.right > EDGE && box.right < maxX) xs[nx++] = box.right;
      if (box.top > EDGE && box.top < maxY) ys[ny++] = box.top;
      if (box.bottom > EDGE && box.bottom < maxY) ys[ny++] = box.bottom;
    }

    let bestPriority = Infinity, bestDistance = Infinity, bestAlignment = Infinity;
    let bestDx = 0, bestDy = 0;
    for (let i = 0; i < nx; i++) {
      const x = xs[i];
      candidate: for (let j = 0; j < ny; j++) {
        const y = ys[j];
        for (let k = 0; k < count; k++) {
          const box = blockers[k];
          if (x > box.left && x < box.right && y > box.top && y < box.bottom) continue candidate;
        }
        const dx = headX - clamp(headX, x, x + width), dy = headY - clamp(headY, y, y + height);
        const distance = Math.hypot(dx, dy);
        const vertical = Math.abs(dy) >= Math.abs(dx);
        // Prefer above, beside, then below when close to the head. Farther away, use the nearest free space.
        const priority = distance > NEAR ? 3 : !vertical ? 1 : dy > 0 ? 0 : 2;
        const alignment = vertical ? Math.abs(headX - x - width / 2) : Math.abs(headY - y - height / 2);
        if (priority < bestPriority || (priority === bestPriority &&
          (distance < bestDistance || (distance === bestDistance && alignment < bestAlignment)))) {
          bestPriority = priority;
          bestDistance = distance;
          bestAlignment = alignment;
          bestDx = dx;
          bestDy = dy;
          result.x = x;
          result.y = y;
        }
      }
    }
    if (bestPriority === Infinity) return;
    if (Math.abs(bestDy) >= Math.abs(bestDx)) {
      result.tail.x = clamp(headX - result.x, 13, width - 13);
      result.tail.y = bestDy > 0 ? height : 0;
      result.tail.angle = bestDy > 0 ? 0 : 180;
    } else {
      result.tail.x = bestDx > 0 ? width : 0;
      result.tail.y = clamp(headY - result.y, 13, height - 13);
      result.tail.angle = bestDx > 0 ? -90 : 90;
    }
    return result;
  }

  return { blockers, place };
}
