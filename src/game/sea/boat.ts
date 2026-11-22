import { MathUtils } from "three";
import { CRUISE_SPEED, FAST_SPEED, LANE_WIDTH, SLOW_SPEED, laneAt, laneOffset } from "./course";

const TURN_SECONDS = 1.5;

export class SeaBoat {
  x = 0;
  distance = 0;
  speed: number;
  heading: number;
  lateral = 0;
  boost = 0;
  wobble = 0;
  age = 0;
  private target = 0;
  private slowHold = 0;
  private turn?: { time: number; heading: number; shore: number };

  constructor(readonly startX: number, readonly startZ: number, heading: number, speed: number) {
    this.heading = heading;
    this.speed = Math.max(SLOW_SPEED, speed);
  }

  get worldX() { return this.startX + this.x; }
  get worldZ() { return this.startZ - this.distance; }
  get lane() { return laneAt(this.x); }
  get turning() { return !!this.turn; }
  get turnProgress() { return MathUtils.smoothstep(this.turn?.time ?? 0, 0, TURN_SECONDS); }

  steer(lane: number) {
    if (!this.turn && Number.isInteger(lane) && lane >= 0 && lane < 3) this.target = laneOffset(lane);
  }

  drive(dt: number, x: number, y: number) {
    this.age += dt;
    this.boost = Math.max(0, this.boost - dt);
    this.wobble = Math.max(0, this.wobble - dt);
    const throttle = Math.abs(y) > 0.15 ? y : 0;
    const desired = CRUISE_SPEED + throttle * (throttle < 0 ? CRUISE_SPEED - SLOW_SPEED : FAST_SPEED - CRUISE_SPEED)
      + 2.5 * Math.min(1, this.boost * 2);
    this.speed += MathUtils.clamp(desired - this.speed, -7 * dt, 5 * dt);
    this.distance += this.speed * dt;
    if (Math.abs(x) > 0.16) this.target = MathUtils.clamp(this.target + x * 12 * dt, -LANE_WIDTH, LANE_WIDTH);
    this.lateral = MathUtils.clamp((this.target - this.x) * 4, -12, 12);
    this.x += this.lateral * dt;
    const want = Math.PI + Math.atan2(-this.lateral, this.speed) * 0.46;
    const delta = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
    this.heading += delta * (1 - Math.exp(-dt * 4));
    this.slowHold = y < -0.85 && this.speed <= SLOW_SPEED + 0.15 ? this.slowHold + dt : 0;
    return this.slowHold >= 1.2;
  }

  turnAround() {
    const shore = Math.round(this.heading / (Math.PI * 2)) * Math.PI * 2;
    this.turn ??= { time: 0, heading: this.heading, shore };
  }

  advanceTurn(dt: number) {
    const turn = this.turn!;
    this.age += dt;
    turn.time += dt;
    this.heading = MathUtils.lerp(turn.heading, turn.shore, this.turnProgress);
    this.speed += (SLOW_SPEED - this.speed) * Math.min(1, dt * 4);
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.distance -= Math.cos(this.heading) * this.speed * dt;
    this.lateral = 0;
    this.wobble = Math.max(0, this.wobble - dt);
    return turn.time >= TURN_SECONDS - 1e-8;
  }
}
