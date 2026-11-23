import assert from "node:assert/strict";

export async function sampleBoardRegistration(page, mode) {
  return page.evaluate((mode) => {
    const state = mode === "road" ? window.__ew.road.state() : window.__ew.sea();
    const { registration: frame, drawCalls } = state;
    const samples = [];
    if (!frame?.gateId) return { samples, drawCalls, renderSerial: frame?.renderSerial };
    const rect = document.querySelector(".stage canvas").getBoundingClientRect();
    const project = (m, v) => [0, 1, 2, 3].map((row) => v.reduce((total, n, col) => total + m[row + col * 4] * n, 0));
    const [w, h, z] = frame.faceSize;
    const group = document.querySelector(`.${mode}-overlay .road-gates[data-gate-id="${frame.gateId}"]`);
    if (!group) return { samples, drawCalls, renderSerial: frame.renderSerial };
    const points = [["tl", -w / 2, h / 2], ["tr", w / 2, h / 2], ["bl", -w / 2, -h / 2],
      ["br", w / 2, -h / 2], ["center", 0, 0]];
    for (const board of frame.boards) {
      if (!board.visible) continue;
      const node = group.querySelector(`.road-gate[data-lane="${board.lane}"]`);
      if (!node) {
        samples.push({ missing: `${frame.gateId}:${board.lane}` });
        continue;
      }
      const style = getComputedStyle(node);
      const lines = Array.from(node.querySelectorAll(":scope > span"), (line) => line.textContent);
      for (const [name, x, y] of points) {
        const world = project(board.world, [x, y, z, 1]);
        const [px, py, , pw] = project(frame.projection, project(frame.view, world));
        const probe = node.querySelector(`[data-face-probe="${name}"]`).getBoundingClientRect();
        const measured = [probe.left, probe.top];
        const projected = [rect.left + (px / pw + 1) * rect.width / 2, rect.top + (1 - py / pw) * rect.height / 2];
        samples.push({ key: `${frame.gateId}:${board.lane}:${name}`, measured, projected, lines,
          visible: style.visibility === "visible" && Number(style.opacity) > 0,
          layout: [style.fontFamily, style.fontSize], name });
      }
    }
    return { samples, drawCalls, renderSerial: frame.renderSerial };
  }, mode);
}

export class BoardRegistration {
  previous = new Map();
  maxError = 0;
  maxSecondDifference = 0;
  frameCount = 0;
  consecutive = 0;
  serial;

  constructor(mode, ms, drawLimit) {
    this.description = `${mode} at ${ms} ms`;
    this.drawLimit = drawLimit;
  }

  record({ samples, drawCalls, renderSerial }) {
    assert.ok(drawCalls > 0 && drawCalls <= this.drawLimit, `${this.description}: ${drawCalls} draw calls`);
    if (this.serial !== undefined && renderSerial !== undefined) assert.equal(renderSerial, this.serial + 1);
    this.serial = renderSerial;
    const current = new Map();
    for (const point of samples) {
      assert.ok(!point.missing && point.visible, `${this.description}: missing visible probe ${point.missing ?? point.key}`);
      const { key, measured, projected, lines, layout } = point;
      const e = [measured[0] - projected[0], measured[1] - projected[1]];
      const last = this.previous.get(key);
      this.maxError = Math.max(this.maxError, Math.hypot(...e));
      if (last) {
        assert.deepEqual(lines, last.lines, `${this.description}: line breaks changed for ${key}`);
        assert.deepEqual(layout, last.layout, `${this.description}: typesetting changed for ${key}`);
      }
      if (last?.before) {
        this.consecutive++;
        this.maxSecondDifference = Math.max(this.maxSecondDifference,
          Math.hypot(e[0] - 2 * last.e[0] + last.before[0], e[1] - 2 * last.e[1] + last.before[1]));
      }
      current.set(key, { e, lines, layout, before: last?.e });
    }
    if (current.size) this.frameCount++;
    this.previous = current;
  }

  verify() {
    assert.ok(this.frameCount >= 25 && this.consecutive >= 100, `${this.description}: insufficient continuously registered frames`);
    assert.ok(this.maxError <= 0.5, `${this.description}: registration error ${this.maxError.toFixed(3)} CSS px`);
    assert.ok(this.maxSecondDifference <= 0.5,
      `${this.description}: registration second difference ${this.maxSecondDifference.toFixed(3)} CSS px`);
  }
}
