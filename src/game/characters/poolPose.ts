import { MathUtils, type Object3D } from "three";

export interface PoolPose {
  paddle: number;
  reach: number;
  surprise: number;
  laugh: number;
}

function poolArm({ paddle, reach, surprise, laugh }: PoolPose, side: number, arm: Object3D, forearm: Object3D) {
  const lerp = MathUtils.lerp;
  // Scull at the waterline, then extend into a high V as the ball leaves the hands.
  let forward = lerp(-0.46 - side * 0.31 * paddle, -2.83, reach);
  let out = lerp(side * 0.68 - 0.24 * paddle, side * 0.6, reach);
  let elbow = lerp(-0.78, -0.15, reach);
  // Wide elbows bring the hands back to the temples. A laughing child covers their mouth.
  forward = lerp(forward, -0.25, surprise);
  out = lerp(out, side * 2.05, surprise);
  elbow = lerp(elbow, -0.45, surprise);
  let curl = side * 1.98 * surprise;
  if (side === 1) {
    forward = lerp(forward, -1.08, laugh);
    out = lerp(out, 0.28, laugh);
    elbow = lerp(elbow, -1.9, laugh);
    curl -= 0.8 * laugh;
  }
  arm.rotation.set(forward, 0, out);
  forearm.rotation.set(elbow, 0, curl);
}

export function applyPoolPose(pose: PoolPose, body: Object3D, head: Object3D,
  leftArm: Object3D, leftForearm: Object3D, rightArm: Object3D, rightForearm: Object3D) {
  poolArm(pose, -1, leftArm, leftForearm);
  poolArm(pose, 1, rightArm, rightForearm);
  body.position.y += 0.046 * pose.paddle + 0.11 * pose.reach - 0.045 * pose.laugh;
  body.rotation.x += 0.25 * pose.laugh - 0.09 * pose.reach;
  body.rotation.z += 0.048 * pose.paddle + 0.09 * pose.laugh;
  head.rotation.x += 0.18 * pose.laugh - 0.15 * (pose.reach + pose.surprise);
}
