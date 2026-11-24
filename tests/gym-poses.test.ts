import { describe, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import { type GameCharacter, type CharacterJoint, withBackpack } from "../src/game/characters";
import { Character } from "../src/game/characters/Character";
import { StyledCharacter } from "../src/game/characters/StyledCharacter";
import { NPCS } from "../src/content/npcs";
import { GymPoseRig } from "../src/game/gym/poses";
import { GYM_MOVES } from "../src/game/gym/round";

const joints = ["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"] as const;
const snapshot = (actor: GameCharacter) => joints.map((name) => {
  const { position, rotation, scale } = actor.joint(name);
  return [...position.toArray(), ...rotation.toArray().slice(0, 3), ...scale.toArray()];
});
const point = (actor: GameCharacter, joint: CharacterJoint, y = 0, z = 0) =>
  actor.joint(joint).localToWorld(new Vector3(0, y, z));

describe.each([Character, StyledCharacter])("%p gym poses", (Rig) => {
  it("applies distinct peaks to the live joints, ticks once and restores all their axes", () => {
    const actor: GameCharacter = new Rig(withBackpack({ ...NPCS.jordan.look, height: 0.91 }));
    actor.setAnim("wave");
    actor.update(0.1);
    const home = snapshot(actor), update = vi.spyOn(actor, "update"), joint = vi.spyOn(actor, "joint");
    const pose = new GymPoseRig(actor);
    expect(joint).toHaveBeenCalledTimes(joints.length);
    actor.setAnim("idle");
    actor.attentive = true;
    pose.stand(Math.PI / 2);
    const neutral = snapshot(actor);
    const shapes = new Set<string>();
    for (const move of GYM_MOVES) {
      update.mockClear();
      joint.mockClear();
      pose.tick(0, move, 0.4);
      expect(update).toHaveBeenCalledOnce();
      expect(joint).not.toHaveBeenCalled();
      const first = snapshot(actor);
      expect(first).not.toEqual(neutral);
      shapes.add(JSON.stringify(first));
      for (let i = 0; i < 20; i++) pose.tick(0, move, 0.4);
      expect(snapshot(actor)).toEqual(first);
      pose.tick(0, move, 1);
      expect(snapshot(actor)).toEqual(neutral);
      pose.tick(0, null, 0);
      expect(snapshot(actor)).toEqual(neutral);
      expect(actor.root.rotation.y).toBe(Math.PI / 2);
    }
    expect(shapes.size).toBe(GYM_MOVES.length);
    pose.restore();
    expect(snapshot(actor)).toEqual(home);
    actor.dispose?.();
  });

  it("opens the jack, keeps the reach narrow, hinges over the feet and presses on a grounded plank", () => {
    const actor: GameCharacter = new Rig(withBackpack({ ...NPCS.jordan.look, female: true }));
    const pose = new GymPoseRig(actor);
    pose.stand(Math.PI / 2);
    const hip = actor.joint("legL").position.y;
    const shin = hip + actor.joint("shinL").position.y;
    const shoe = (joint: "shinL" | "shinR") => point(actor, joint, -shin, 0.185 * actor.height / 1.75);
    const palm = () => point(actor, "foreR", actor.rightHand.position.y);
    const palmHeight = 0.055 * actor.height / 1.75;
    const spread = () => shoe("shinL").distanceTo(shoe("shinR"));
    const standing = spread(), y0 = shoe("shinL").y;
    pose.tick(0, "jacks", 0.5);
    expect(spread()).toBeGreaterThan(standing + 0.35);
    expect(shoe("shinL").y - y0).toBeGreaterThan(0.09);
    pose.tick(0, "reach", 0.5);
    expect(spread()).toBeCloseTo(standing, 2);
    expect(actor.rightHand.getWorldPosition(new Vector3()).y).toBeGreaterThan(actor.height * 0.94);
    pose.tick(0, "toes", 0.5);
    expect(actor.joint("body").rotation.x).toBeGreaterThan(1.15);
    expect(Math.abs(shoe("shinL").y - y0)).toBeLessThan(0.04);
    expect(actor.rightHand.getWorldPosition(new Vector3()).y).toBeLessThan(1);
    pose.tick(0, "squats", 0.5);
    expect(point(actor, "legL").y).toBeLessThan(hip - 0.13);
    expect(actor.joint("shinL").rotation.x).toBeGreaterThan(1.2);
    pose.tick(0, "lunges", 0.5);
    expect(shoe("shinL").x - shoe("shinR").x).toBeGreaterThan(0.33);
    expect(point(actor, "legR").y).toBeLessThan(hip - 0.12);
    pose.tick(0, "pushups", 0.2);
    const high = point(actor, "armL").y;
    expect(actor.joint("body").rotation.x).toBeGreaterThan(1.3);
    const palmHigh = palm();
    expect(Math.abs(palmHigh.y - palmHeight)).toBeLessThan(0.018);
    pose.tick(0, "pushups", 0.45);
    expect(high - point(actor, "armL").y).toBeGreaterThan(0.1);
    expect(palm().distanceTo(palmHigh)).toBeLessThan(0.025);
    expect(Math.abs(shoe("shinL").y)).toBeLessThan(0.02);
    expect(point(actor, "shinL").y).toBeGreaterThan(0.1);
    expect(point(actor, "head").y).toBeGreaterThan(0.25);
    actor.dispose?.();
  });

  it("keeps arm circles and strides moving at different times and returns to neutral", () => {
    const actor: GameCharacter = new Rig(NPCS.jordan.look);
    const pose = new GymPoseRig(actor);
    pose.stand(Math.PI / 2);
    const neutral = snapshot(actor);
    pose.tick(0, "circles", 0.3);
    const hand = actor.rightHand.getWorldPosition(new Vector3());
    pose.tick(0, "circles", 0.5);
    expect(hand.distanceTo(actor.rightHand.getWorldPosition(new Vector3()))).toBeGreaterThan(0.12);
    pose.tick(0, "run", 0.375);
    expect(actor.joint("legL").rotation.x).toBeGreaterThan(0.6);
    pose.tick(0, "run", 0.625);
    expect(actor.joint("legL").rotation.x).toBeLessThan(-0.6);
    pose.tick(0, null, 0);
    expect(snapshot(actor)).toEqual(neutral);
    actor.dispose?.();
  });
});
