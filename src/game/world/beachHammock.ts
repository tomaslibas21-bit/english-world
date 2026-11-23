import { BufferGeometry, Float32BufferAttribute, TubeGeometry, Vector3, LineCurve3, DoubleSide } from "three";
import type { AddPhotoSpot } from "../../content/townQuests";
import { mat, type Merger } from "./util";

export function addBeachHammock(merger: Merger, photo: AddPhotoSpot, { x1, x2, z }: { x1: number; x2: number; z: number }) {
  const colors = ["#bd3158", "#ed784a", "#f4bc5f", "#efda9b", "#2a8b83", "#1d6c82", "#bd3158"];
  const point = (t: number, across: number) => {
    const arch = Math.sin(t * Math.PI);
    return new Vector3(x1 + (x2 - x1) * t, 1.75 - (1.12 - 0.21 * across ** 2) * arch, z + across * 0.6 * arch);
  };

  // Each stripe follows the sag of the cloth and rises along its edges.
  for (const [stripe, color] of colors.entries()) {
    const vertices = [];
    for (let i = 0; i <= 12; i++) {
      for (const edge of [stripe, stripe + 1]) vertices.push(...point(0.12 + i * 0.76 / 12, 2 * edge / colors.length - 1).toArray());
    }
    const faces = [];
    for (let i = 0; i < 24; i += 2) faces.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
    const cloth = new BufferGeometry();
    cloth.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    cloth.setIndex(faces);
    cloth.computeVertexNormals();
    merger.add("hammock-" + color, mat(color, { side: DoubleSide }), cloth);
  }
  for (const end of [0, 1]) {
    for (const offset of [-1, -0.5, 0, 0.5, 1]) {
      const rope = new LineCurve3(point(end, 0), point(end === 0 ? 0.12 : 0.88, offset));
      merger.add("hammock-rope", mat("#e9cf9c"), new TubeGeometry(rope, 1, 0.018, 4, false));
    }
  }
  photo("hammock", (x1 + x2) / 2, 0.9, z);
}
