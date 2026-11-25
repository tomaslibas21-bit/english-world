import type { Object3D, Quaternion, Vector3 } from "three";
import type { GameCharacter } from "../characters";
import type { NaturalRig } from "./contract";

interface JointSnapshot {
  joint: Object3D;
  arm: number;
  position?: Vector3;
  rotation?: Quaternion;
  scale?: Vector3;
}

/** The local transforms the adapters animate, excluding the live lips and blink scales. */
export class PoseEntry {
  private readonly joints: JointSnapshot[];
  private readonly parent: Object3D | null;
  private occupied = 0;
  seated: boolean;

  constructor(readonly actor: GameCharacter, readonly rig: NaturalRig) {
    this.parent = actor.root.parent;
    const { body, head, upperL, foreL, upperR, foreR, thighL, thighR, shinL, shinR, eye, browL, browR, corners, hair } = rig;
    const joint = (joint: Object3D, position = false, rotation = true, arm = 0, scale = false): JointSnapshot => ({
      joint, arm, position: position ? joint.position.clone() : undefined,
      rotation: rotation ? joint.quaternion.clone() : undefined, scale: scale ? joint.scale.clone() : undefined,
    });
    this.joints = [
      joint(body, true, true, 0, true), joint(head),
      joint(upperL, true, true, 1), joint(foreL, false, true, 1),
      joint(upperR, true, true, 2), joint(foreR, false, true, 2),
      joint(thighL, true), joint(thighR, true), joint(shinL), joint(shinR),
      joint(eye, true, false), joint(browL, true),
    ];
    if (browR) this.joints.push(joint(browR, true));
    if (corners) this.joints.push(joint(corners, true, false));
    if (hair) this.joints.push(joint(hair));
    this.seated = actor.anim === "sit";
  }

  get mountedAsCaptured() { return this.actor.root.parent === this.parent; }

  capture() {
    this.seated = this.actor.anim === "sit";
    for (let i = 0; i < this.joints.length; i++) {
      const { joint, position, rotation, scale } = this.joints[i];
      position?.copy(joint.position);
      rotation?.copy(joint.quaternion);
      scale?.copy(joint.scale);
    }
  }

  mix(amount: number, blocked: number) {
    for (let i = 0; i < this.joints.length; i++) {
      const { joint, arm, position, rotation, scale } = this.joints[i];
      if (arm & blocked) continue;
      if (position) {
        if (arm) joint.position.y += (position.y - joint.position.y) * amount;
        else joint.position.lerp(position, amount);
      }
      if (rotation) joint.quaternion.slerp(rotation, amount);
      if (scale) joint.scale.lerp(scale, amount);
    }
  }

  mixArms(amount: number, blocked: number) {
    this.occupied |= blocked;
    for (let i = 0; i < this.joints.length; i++) {
      const { joint, arm, rotation } = this.joints[i];
      if (arm && rotation && !(arm & this.occupied)) joint.quaternion.slerp(rotation, amount);
    }
  }
}

/** Capture synchronously before aim, setAnim or a lazy handoff rewrites the displayed pose. */
export function captureConversationPose(actor: GameCharacter) {
  const rig = actor.naturalRig?.();
  return rig && new PoseEntry(actor, rig);
}
