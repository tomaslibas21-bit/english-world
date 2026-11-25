import { faceHeight, FACE_WIDTH, type FaceMode } from "../../game/kit/boardFaces";

type FitOptions = { preferSingleLine?: boolean; minSize?: number; maxSize?: number; maxLines?: 2 | 3 };
type LineMeasurement = Pick<TextMetrics, "width" | "actualBoundingBoxLeft" | "actualBoundingBoxRight"
  | "actualBoundingBoxAscent" | "actualBoundingBoxDescent" | "fontBoundingBoxAscent" | "fontBoundingBoxDescent">;
type MeasureLine = (line: string) => LineMeasurement | undefined;

const shortWord = /^\p{P}*(?:\p{L}\p{M}*){1,3}\p{P}*$/u;

export function fitGateLabel(text: string, mode: FaceMode, measure: MeasureLine, {
  preferSingleLine = false, minSize = 0, maxSize = 32, maxLines = 2,
}: FitOptions = {}) {
  const words = text.split(/\s+/);
  const splits = [[text]];
  for (let first = 1; first < words.length; first++) {
    const start = words.slice(0, first).join(" ");
    splits.push([start, words.slice(first).join(" ")]);
    if (maxLines === 3) {
      for (let second = first + 1; second < words.length; second++) {
        splits.push([start, words.slice(first, second).join(" "), words.slice(second).join(" ")]);
      }
    }
  }

  // Measure at 100px and keep a small inset from the physical face on every side.
  const height = faceHeight(mode) - 2;
  const metrics = new Map<string, ReturnType<typeof lineMetrics>>();
  function lineMetrics(line: string) {
    const m = measure(line);
    const advance = m?.width ?? line.length * 58;
    const width = Math.max(advance, advance + 2 * (m?.actualBoundingBoxLeft ?? 0),
      2 * (m?.actualBoundingBoxRight ?? advance) - advance);
    const ascent = m?.actualBoundingBoxAscent ?? 80;
    const descent = m?.actualBoundingBoxDescent ?? 20;
    const baseline = ((m?.fontBoundingBoxAscent ?? 80) - (m?.fontBoundingBoxDescent ?? 20)) / 2;
    return { width, ascent, descent, aboveCenter: ascent - baseline, belowCenter: descent + baseline };
  }

  const candidates = splits.map((lines) => {
    const measured = lines.map((line) => {
      const m = metrics.get(line) ?? lineMetrics(line);
      metrics.set(line, m);
      return m;
    });
    const widths = measured.map(({ width }) => width);
    const widest = Math.max(...widths);
    const fitWidth = (FACE_WIDTH - 4) * 100 / widest;
    const compact = mode === "road" && lines.length === 3;
    const minScale = compact ? 0.83 : 0.88;
    let leading = lines.length === 3 ? (compact ? 76 : 90) : 106;
    for (let i = 1; i < measured.length; i++) {
      leading = Math.max(leading, measured[i - 1].descent + measured[i].ascent + 2);
    }
    const halfInk = Math.max(leading / 2, ...measured.map(({ aboveCenter, belowCenter }) => Math.max(aboveCenter, belowCenter)));
    const fitHeight = height * 100 / ((lines.length - 1) * leading + 2 * halfInk);
    const size = Math.min(maxSize, fitHeight, fitWidth / minScale);
    return { lines, size, fitHeight, fitWidth, lineHeight: leading / 100,
      shortLines: lines.length > 1 ? lines.filter((line) => shortWord.test(line)).length : 0,
      spread: widest - Math.min(...widths) };
  });

  const largest = Math.max(...candidates.map(({ size }) => size));
  const best = preferSingleLine && candidates[0].size >= 20 ? candidates[0]
    : candidates.filter(({ size }) => size >= largest * 0.9).sort((a, b) =>
      // A slight size gain can come from leaving a short word alone between taller lines.
      a.shortLines - b.shortLines || b.size - a.size || a.lines.length - b.lines.length || a.spread - b.spread)[0];
  // On narrow sea views the minimum can compress the label horizontally, within the height budget.
  const size = Math.min(best.fitHeight, Math.max(minSize, best.size));
  return { lines: best.lines, size, scale: Math.min(1, best.fitWidth / size), lineHeight: best.lineHeight };
}
