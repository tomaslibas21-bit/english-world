type Stroke = readonly [number, number, number, number];

/** Decorative stem and notches shared by the carved slate outside and the cave atlas. */
export function slateRune(cell: number): Stroke[] {
  const strokes: Stroke[] = [[22, 106, 102, 22]];
  const count = cell % 5 + 1, style = Math.floor(cell / 5) % 3;
  for (let k = 0; k < count; k++) {
    const t = 0.5 + (k - (count - 1) / 2) * 0.118;
    const x = 22 + 80 * t, y = 106 - 84 * t;
    const lo = style === 1 ? 0 : 17, hi = style === 0 ? 0 : 17;
    strokes.push([x - lo, y - lo, x + hi, y + hi]);
  }
  return strokes;
}
