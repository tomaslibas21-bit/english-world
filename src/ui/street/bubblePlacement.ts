const EDGE = 8;
const GAP = 9;
const NEAR = 44;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createBubblePlacement(capacity: number) {
  // The extra slot keeps the bubble and its tail clear of the speaker.
  const blockers = Array.from({ length: capacity + 1 }, () => ({ left: 0, right: 0, top: 0, bottom: 0 }));
  const xs = new Float64Array(3 + blockers.length * 2);
  const ys = new Float64Array(xs.length);
  const result = { x: 0, y: 0, height: 0, tail: { x: 0, y: 0, angle: 0 } };
  let count = 0, headX = 0, headY = 0, width = 0, screenHeight = 0, nx = 0;
  let bestDx = 0, bestDy = 0;

  // The nearest free top-left corner for a bubble of this height, or false. Obstacles already carry the
  // bubble's width and the clearance; their tops move up by the height being tried.
  function search(height: number) {
    const maxY = screenHeight - height - EDGE;
    if (maxY < EDGE) return false;
    ys[0] = EDGE;
    ys[1] = maxY;
    ys[2] = clamp(headY - height / 2, EDGE, maxY);
    let ny = 3;
    for (let i = 0; i < count; i++) {
      const box = blockers[i];
      const top = box.top - height;
      if (top > EDGE && top < maxY) ys[ny++] = top;
      if (box.bottom > EDGE && box.bottom < maxY) ys[ny++] = box.bottom;
    }

    let bestPriority = Infinity, bestDistance = Infinity, bestAlignment = Infinity;
    for (let i = 0; i < nx; i++) {
      const x = xs[i];
      candidate: for (let j = 0; j < ny; j++) {
        const y = ys[j];
        for (let k = 0; k < count; k++) {
          const box = blockers[k];
          if (x > box.left && x < box.right && y > box.top - height && y < box.bottom) continue candidate;
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
    if (bestPriority === Infinity) return false;
    result.height = height;
    return true;
  }

  /** Places the bubble at its full height, or (given a smaller `minHeight`) at the tallest height that fits, at least
   *  `minHeight`; the caller then lets the text scroll inside that height. */
  function place(hx: number, hy: number, w: number, height: number, sw: number, sh: number, n: number, minHeight = height) {
    const maxX = sw - w - EDGE;
    if (maxX < EDGE || sh - 2 * EDGE < minHeight) return;
    headX = hx;
    headY = hy;
    width = w;
    screenHeight = sh;
    count = n;
    const head = blockers[count++];
    head.left = head.right = headX;
    head.top = head.bottom = headY;

    // The nearest free position aligns with the speaker or with a screen or blocker edge.
    xs[0] = EDGE;
    xs[1] = maxX;
    xs[2] = clamp(headX - width / 2, EDGE, maxX);
    nx = 3;
    for (let i = 0; i < count; i++) {
      // Express each obstacle in the coordinates of the bubble's top-left corner (the height is added per try).
      const box = blockers[i];
      box.left -= width + GAP;
      box.top -= GAP;
      box.right += GAP;
      box.bottom += GAP;
      if (box.left > EDGE && box.left < maxX) xs[nx++] = box.left;
      if (box.right > EDGE && box.right < maxX) xs[nx++] = box.right;
    }

    if (!search(height)) {
      // Keep as much of the line visible as fits: the tallest height that still has a free spot.
      if (minHeight >= height || !search(minHeight)) return;
      let low = minHeight, high = height;
      while (high - low > 1) {
        const mid = (low + high) / 2;
        if (search(mid)) low = mid;
        else high = mid;
      }
      search(low);
    }

    const { x, y, height: fitted } = result;
    if (Math.abs(bestDy) >= Math.abs(bestDx)) {
      result.tail.x = clamp(headX - x, 13, width - 13);
      result.tail.y = bestDy > 0 ? fitted : 0;
    } else {
      result.tail.x = bestDx > 0 ? width : 0;
      result.tail.y = clamp(headY - y, 13, fitted - 13);
    }
    // Point the tail at the speaker (0° = straight down).
    result.tail.angle = Math.atan2(x + result.tail.x - headX, headY - y - result.tail.y) * 180 / Math.PI;
    return result;
  }

  return { blockers, place };
}
