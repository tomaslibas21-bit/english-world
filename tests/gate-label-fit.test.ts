import { describe, expect, it } from "vitest";
import { faceHeight } from "../src/game/kit/boardFaces";
import { fitGateLabel } from "../src/ui/kit/gateLabelFit";

const phrase = "Quería pedir una cita, por favor.";
const balanced = ["Quería pedir", "una cita,", "por favor."];

function measure(line: string) {
  const width = line.length * 50;
  return { width, actualBoundingBoxLeft: 0, actualBoundingBoxRight: width,
    actualBoundingBoxAscent: line.includes("Quería") ? 78.2 : line === "una" ? 50.1 : 73.2,
    actualBoundingBoxDescent: /[Qp]/.test(line) ? 20.7 : line.includes(",") ? 13.7 : 1.1,
    fontBoundingBoxAscent: 101.1, fontBoundingBoxDescent: 35.3 };
}

describe("gate label fitting", () => {
  it("prefers balanced breaks among layouts at the same type size", () => {
    const layout = fitGateLabel(phrase, "road", measure, { maxSize: 19, maxLines: 3 });
    expect(layout.size).toBe(19);
    expect(layout.lines).toEqual(balanced);
  });

  it("keeps a short word with its neighbors when its own line would gain a little size", () => {
    const layout = fitGateLabel(phrase, "road", measure, { maxSize: 25, maxLines: 3 });
    expect(layout.lines).toEqual(balanced);
    const first = measure(layout.lines[0]);
    const baseline = (first.fontBoundingBoxAscent - first.fontBoundingBoxDescent) / 2;
    const topInk = layout.size * (layout.lineHeight + (first.actualBoundingBoxAscent - baseline) / 100);
    expect(topInk).toBeLessThan(faceHeight("road") / 2);
  });

  it("caps the narrow sea type-size floor when tall ink needs more room", () => {
    const layout = fitGateLabel("Quería", "sea", (line) => ({
      ...measure(line), actualBoundingBoxAscent: 155, actualBoundingBoxDescent: 95,
    }), { minSize: 21 });
    expect(layout.size).toBeLessThan(21);
    expect(layout.size * (95 + 32.9) / 100).toBeLessThan(faceHeight("sea") / 2);
  });
});
