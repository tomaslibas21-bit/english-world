import type { Vector3 } from "three";
import type { GameCharacter } from "../characters";

interface KeeperActor {
  ch: GameCharacter;
  home: Vector3;
  rot: number;
  sit?: boolean;
}
export type KeeperMotion = { next: number; hop: number };

export function updateKeeper(n: KeeperActor, motion: KeeperMotion, p: Vector3, dt: number, talking: boolean) {
  const d = n.home.distanceToSquared(p);
  n.ch.root.visible = d < 32 * 32;
  if (!n.ch.root.visible) return;
  const near = d < 36;
  n.ch.attentive = n.ch.steady = near || talking;
  const yaw = near || talking ? Math.atan2(p.x - n.home.x, p.z - n.home.z) : n.rot;
  const turn = yaw - n.ch.root.rotation.y;
  n.ch.root.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * (near ? 5 : 2));
  if (talking || !near) motion.hop = 0;
  else if (motion.hop > 0) motion.hop = Math.max(0, motion.hop - dt);
  else if ((motion.next -= dt) <= 0) { motion.next = 6 + Math.random() * 6; motion.hop = 0.42; }
  const t = motion.hop / 0.42, arc = 4 * t * (1 - t);
  n.ch.lift = arc * (n.sit ? 0.16 : 0.24);
  n.ch.tuck = n.sit ? 0 : arc * 0.42;
  n.ch.update(dt);
}
