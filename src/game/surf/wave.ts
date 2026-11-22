/** Distances from the rendered crest, negative towards the beach. */
export const FRONT = 1.95, BACK = 4.5, WIDE = 48;
/** Retain the crest's original offset from the rules' position. */
export const AHEAD = 0.5;
/** Move the standing board down the face, leaving room under the pitching lip. */
export const RIDE_FORWARD = 0.25;

const FACE_TOP = 0.88, FACE_CURVE = 1.65;
const EDGE_START = 0.2, CREST_RIPPLE = 0.03;
const SWEEP = 0.36, SHOULDER = 7;
const LIP_UNDER = [0, 0.49, 0.84, 0];
const LIP_HEIGHT = [FACE_TOP, 0.83, 1, 1];

export function sstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Height of the shoreward face or seaward back, as a fraction of the lip's height. */
export function waveProfile(s: number) {
  if (s >= 0) return 1 - sstep(0, BACK, s);
  const n = Math.max(0, 1 + s / FRONT);
  return FACE_TOP * n * n * (1 + FACE_CURVE * (1 - n));
}

/** Rise per metre seaward, so a positive slope points a shore-facing board's nose down. */
export function waveFaceSlope(s: number) {
  if (s < 0) {
    const n = Math.max(0, 1 + s / FRONT);
    return FACE_TOP * n * (2 * (1 + FACE_CURVE) - 3 * FACE_CURVE * n) / FRONT;
  }
  const n = Math.min(1, s / BACK);
  return -6 * n * (1 - n) / BACK;
}

/** Keep the lesson's relative wave sizes while giving both ridden waves a full-height face. */
export const waveHeight = (h: number) => Math.min(h, 0.8) * 1.8 + Math.max(0, h - 0.8) * 0.25;
export const waveReach = (d: number) => sstep(0.5, 7, d);
export const waveEdge = (x: number, width: number) => 1 - sstep(EDGE_START, 0.5, Math.abs(x / width));
export const waveChop = (x: number, t: number) => 1 - CREST_RIPPLE * (1 + Math.sin(x * 0.59 + t * 0.85));

/** The clean shoulder trails seaward along the beach, with the ridden crest held in place. */
export const waveSweep = (x: number) => -SWEEP * x / Math.sqrt(1 + (x / SHOULDER) ** 2);
export const waveSweepSlope = (x: number) => -SWEEP / (1 + (x / SHOULDER) ** 2) ** 1.5;

/** Join the underside of the lip to the top of the crest with a cubic cross-section. */
export function waveLip(t: number) {
  const k = 1 - t;
  const weights = [k ** 3, 3 * k * k * t, 3 * k * t * t, t ** 3];
  return {
    forward: weights.reduce((sum, w, i) => sum + w * LIP_UNDER[i], 0),
    height: weights.reduce((sum, w, i) => sum + w * LIP_HEIGHT[i], 0),
    drop: 0.21 * Math.sin(Math.PI * t) ** 2 * k,
  };
}

/** Shared with the shader so the board follows the swept face. */
export const WAVE_GLSL = `
  float waveEdge(float x) {
    return 1.0 - smoothstep(${EDGE_START}, 0.5, abs(x) / ${WIDE.toFixed(1)});
  }
  float waveChop(float x, float t) {
    return 1.0 - ${CREST_RIPPLE} * (1.0 + sin(x * 0.59 + t * 0.85));
  }
  float waveSweep(float x) {
    float q = x / ${SHOULDER.toFixed(1)};
    return -${SWEEP} * x * inversesqrt(1.0 + q*q);
  }
`;
