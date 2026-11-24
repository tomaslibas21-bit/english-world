import { describe, expect, it, vi } from "vitest";
import { SkinnedMesh, Vector3 } from "three";
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

// Match the renderer's attached bind matrices, then identify vertices by their rig subtree.
function limbVertices(actor: GameCharacter, joint: CharacterJoint) {
  const limb = actor.joint(joint);
  const result: { mesh: SkinnedMesh; index: number; local: Vector3 }[] = [];
  actor.root.updateMatrixWorld(true);
  actor.root.traverseVisible((mesh) => {
    if (!(mesh instanceof SkinnedMesh)) return;
    const bones = new Set<number>();
    mesh.skeleton.bones.forEach((bone, index) => {
      for (let node: typeof limb | null = bone; node; node = node.parent) {
        if (node === limb) bones.add(index);
      }
    });
    const skin = mesh.geometry.attributes.skinIndex;
    for (let index = 0; index < skin.count; index++) {
      if (!bones.has(skin.getX(index))) continue;
      const local = mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld);
      limb.worldToLocal(local);
      result.push({ mesh, index, local });
    }
  });
  expect(result.length).toBeGreaterThan(0);
  return result;
}

type LimbVertices = ReturnType<typeof limbVertices>;
const vertex = ({ mesh, index }: LimbVertices[number], target: Vector3) =>
  mesh.getVertexPosition(index, target).applyMatrix4(mesh.matrixWorld);
function lowestY(vertices: LimbVertices, scratch: Vector3) {
  let y = Infinity;
  for (const entry of vertices) y = Math.min(y, vertex(entry, scratch).y);
  return y;
}

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
    const sole = limbVertices(actor, "shinL");
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
    actor.root.updateMatrixWorld(true);
    expect(Math.abs(lowestY(sole, new Vector3()))).toBeLessThan(0.02);
    expect(point(actor, "shinL").y).toBeGreaterThan(0.1);
    expect(point(actor, "head").y).toBeGreaterThan(0.25);
    actor.dispose?.();
  });

  it.each([["short", 0.91], ["Jordan", NPCS.jordan.look.height], ["tall", 1.12]] as const)(
    "keeps the %s rig supported and reaches both toes through the pose paths",
    (_label, height) => {
      const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
      const actor: GameCharacter = new Rig({ ...NPCS.jordan.look, height });
      random.mockRestore();
      actor.attentive = true;
      const pose = new GymPoseRig(actor);
      pose.stand(Math.PI / 2);
      const neutral = snapshot(actor);
      const scratch = new Vector3(), finger = new Vector3();
      const head = limbVertices(actor, "head");
      const limbs = (["L", "R"] as const).map((side) => {
        const shin = limbVertices(actor, `shin${side}`);
        const fore = limbVertices(actor, `fore${side}`);
        const front = Math.max(...shin.map(({ local }) => local.z));
        const tip = Math.min(...fore.map(({ local }) => local.y));
        return {
          shin,
          arm: limbVertices(actor, `arm${side}`),
          fore,
          toes: shin.filter(({ local }) => local.z > front - 0.025),
          fingers: fore.filter(({ local }) => local.y < tip + 0.025),
          knee: actor.joint(`shin${side}`),
        };
      });
      const floor = Math.min(...limbs.map(({ shin }) => lowestY(shin, scratch)));
      for (const move of GYM_MOVES) for (let i = 0; i <= 40; i++) {
        const t = i / 40, frame = `${move} at ${t}`;
        pose.tick(0, move, t);
        actor.root.updateMatrixWorld(true);
        const soles = limbs.map(({ shin }) => lowestY(shin, scratch));
        for (const y of soles) expect(y, frame).toBeGreaterThanOrEqual(floor - 0.01);
        if (move !== "jacks") expect(Math.min(...soles), frame).toBeLessThanOrEqual(floor + 0.01);
        if (move === "jacks" && t === 0.5) expect(Math.min(...soles), frame).toBeGreaterThan(floor + 0.09);
        if (move === "run" && (t === 0.375 || t === 0.625)) {
          const planted = t === 0.375 ? 1 : 0;
          expect(soles[1 - planted] - soles[planted], frame).toBeGreaterThan(0.025);
        }
        if (t === 0 || t === 1) expect(snapshot(actor), frame).toEqual(neutral);
        if (t === 0.5 && ["toes", "squats", "reach", "lunges", "pushups"].includes(move)) {
          for (const y of soles) expect(y, frame).toBeLessThanOrEqual(floor + 0.01);
        }
        if (move === "pushups") {
          for (const { fore } of limbs) {
            const palmY = lowestY(fore, scratch);
            expect(palmY, frame).toBeGreaterThanOrEqual(-0.01);
            if (t === 0.2 || t === 0.45) expect(palmY, frame).toBeLessThan(0.02);
          }
        }
        if (move === "toes") {
          expect(lowestY(head, scratch), frame).toBeGreaterThan(floor + 0.2);
          const knees = limbs.map(({ knee }) => knee.getWorldPosition(new Vector3()));
          for (const { arm } of limbs) {
            expect(lowestY(arm, scratch), frame).toBeGreaterThan(floor);
            let clearance = Infinity;
            for (const entry of arm) {
              vertex(entry, scratch);
              for (const knee of knees) clearance = Math.min(clearance, scratch.distanceTo(knee));
            }
            expect(clearance, frame).toBeGreaterThan(0.055);
          }
          if (t < 0.4 || t > 0.6) continue;
          expect(actor.joint("body").rotation.x, frame).toBeGreaterThan(70 * Math.PI / 180);
          expect(knees[0].distanceTo(knees[1]), frame).toBeGreaterThan(0.21);
          expect(point(actor, "head").y, frame).toBeGreaterThan(Math.max(knees[0].y, knees[1].y) + 0.18);
          for (const { toes, fingers } of limbs) {
            let gap = Infinity;
            for (const entry of fingers) {
              vertex(entry, finger);
              for (const toe of toes) gap = Math.min(gap, finger.distanceTo(vertex(toe, scratch)));
            }
            expect(gap, frame).toBeLessThanOrEqual(0.12);
          }
        }
      }
      actor.dispose?.();
    },
  );

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
