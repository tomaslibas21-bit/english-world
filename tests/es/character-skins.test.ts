import { expect, it, vi } from "vitest";
import * as THREE from "three";
import { BILLIARDS_NPC } from "../../src/content/billiards-lines";
import { NPCS } from "../../src/content/npcs";
import { makeCue } from "../../src/game/billiards/table";
import { addFarVersion } from "../../src/game/characters";
import { Character } from "../../src/game/characters/Character";
import { THEME } from "../../src/game/world/theme";

const skins = (actor: Character) => actor.root.children.filter((object): object is THREE.SkinnedMesh =>
  object instanceof THREE.SkinnedMesh);

function expectPackedSkin({ geometry, skeleton }: THREE.SkinnedMesh) {
  const { position, normal, color, skinIndex, skinWeight } = geometry.attributes;
  expect(position.array).toBeInstanceOf(Float32Array);
  expect(normal.array).toBeInstanceOf(Int16Array);
  expect(color.array).toBeInstanceOf(Uint16Array);
  expect(skinIndex.array).toBeInstanceOf(Uint8Array);
  expect(skinWeight.array).toBeInstanceOf(Uint16Array);
  expect([normal, color, skinWeight].every((attribute) => attribute.normalized)).toBe(true);
  expect(skinIndex.normalized).toBe(false);
  expect([normal, color, skinIndex, skinWeight].every((attribute) => attribute.count === position.count)).toBe(true);
  expect(skinIndex.array.every((index) => index < skeleton.bones.length)).toBe(true);
  expect(geometry.index!.array).toBeInstanceOf(Uint16Array);
  expect(geometry.index!.array.every((index) => index < position.count)).toBe(true);
  expect(geometry.boundingBox!.isEmpty()).toBe(false);
}

function expectBindPose(actor: Character, skin: THREE.SkinnedMesh) {
  const { bones, boneInverses } = skin.skeleton;
  const scales = bones.map((bone) => bone.scale.clone());
  const identity = new THREE.Matrix4().elements;
  const product = new THREE.Matrix4();
  try {
    for (const bone of bones) bone.scale.setScalar(1);
    actor.root.updateMatrixWorld(true);
    expect(skin.bindMatrix.elements).toEqual(skin.matrixWorld.elements);
    expect(boneInverses).toHaveLength(bones.length);
    for (const [index, bone] of bones.entries()) {
      product.multiplyMatrices(bone.matrixWorld, boneInverses[index]);
      expect(product.elements.every((value, i) => Math.abs(value - identity[i]) < 1e-10), `bone ${index}`).toBe(true);
    }
  } finally {
    bones.forEach((bone, index) => bone.scale.copy(scales[index]));
    actor.root.updateMatrixWorld(true);
  }
}

it("keeps Don Memo's seated skins and his cue on the correct bones through a re-bake", () => {
  const { look } = NPCS[BILLIARDS_NPC];
  const actor = new Character(look);
  const cue = makeCue();
  const grip = new THREE.Vector3(0.04, 0.61, 0.06);
  const cueDisposal = vi.fn();
  cue.position.copy(grip);
  cue.rotation.z = 0.12;
  actor.rightHand.add(cue);
  const cuePieces = cue.children as THREE.Mesh<THREE.BufferGeometry, THREE.Material>[];
  for (const piece of cuePieces) piece.geometry.addEventListener("dispose", cueDisposal);
  try {
    actor.root.position.set(2, 0, -3);
    actor.root.rotation.y = 0.37;
    skins(actor)[0].castShadow = false;
    actor.seatY = 0.5;
    actor.setAnim("sit");
    expect(addFarVersion(actor, look)).toBe(true);
    const [near, far] = skins(actor);
    expect(far.skeleton).toBe(near.skeleton);
    expect(far.geometry.index!.count).toBeLessThan(near.geometry.index!.count);
    for (const skin of [near, far]) {
      expectPackedSkin(skin);
      expectBindPose(actor, skin);
      expect(skin.castShadow).toBe(false);
    }

    expect(THEME.farPeople).toBe(24);
    actor.setFar(true);
    expect(skins(actor).filter((skin) => skin.visible)).toEqual([far]);
    actor.setFar(false);
    expect(skins(actor).filter((skin) => skin.visible)).toEqual([near]);

    const skinDisposal = vi.fn();
    for (const skin of [near, far]) skin.geometry.addEventListener("dispose", skinDisposal);
    actor.setAnim("idle");
    expect(skins(actor)).toEqual([near, far]);
    actor.seatY = 0.7;
    actor.setAnim("sit");
    const [seated] = skins(actor);
    expect(skins(actor)).toHaveLength(1);
    expect(seated.skeleton).not.toBe(near.skeleton);
    expect(seated.visible).toBe(true);
    expect(seated.castShadow).toBe(false);
    expectPackedSkin(seated);
    expectBindPose(actor, seated);
    expect(skinDisposal).toHaveBeenCalledTimes(2);
    expect(cue.parent).toBe(actor.rightHand);
    expect(cue.position).toEqual(grip);
    expect(cue.children).toHaveLength(4);
  } finally {
    actor.dispose();
    for (const piece of cuePieces) {
      piece.geometry.removeEventListener("dispose", cueDisposal);
      piece.geometry.dispose();
      piece.material.dispose();
    }
  }
  expect(cueDisposal).not.toHaveBeenCalled();
});

it("binds Doña Rosario's mouth corners and deforms her talking mouth with the voice", () => {
  const { look, gender } = NPCS.rosario;
  const actor = new Character({ ...look, female: look.female ?? gender === "f" });
  actor.fidgets = false;
  try {
    const [skin] = skins(actor);
    expectPackedSkin(skin);
    expectBindPose(actor, skin);
    const { smile, corners, mouth } = actor as unknown as Record<"smile" | "corners" | "mouth", THREE.Bone>;
    const { bones } = skin.skeleton;
    const smileIndex = bones.indexOf(smile), cornerIndex = bones.indexOf(corners), mouthIndex = bones.indexOf(mouth);
    expect(Math.min(smileIndex, cornerIndex, mouthIndex)).toBeGreaterThanOrEqual(0);
    const { skinIndex, skinWeight } = skin.geometry.attributes;
    expect(skinIndex.array.some((index, offset) => offset % 4 === 0 && index === cornerIndex)).toBe(false);
    let blendVertex = -1, openVertex = -1;
    for (let vertex = 0; vertex < skinIndex.count; vertex++) {
      const primary = skinIndex.getX(vertex);
      if (primary === smileIndex && skinIndex.getY(vertex) === cornerIndex &&
          skinWeight.getX(vertex) > 0 && skinWeight.getY(vertex) > 0) blendVertex = vertex;
      if (primary === mouthIndex) openVertex = vertex;
    }
    expect(blendVertex).toBeGreaterThanOrEqual(0);
    expect(openVertex).toBeGreaterThanOrEqual(0);
    expect(skinWeight.getX(blendVertex) + skinWeight.getY(blendVertex)).toBeCloseTo(1, 4);
    expect(skinWeight.getX(openVertex)).toBe(1);

    actor.update(0.1);
    actor.root.updateMatrixWorld(true);
    const closed = skin.getVertexPosition(openVertex, new THREE.Vector3());
    let level = 0.9, vowel = 1;
    actor.talk(1, () => level, () => vowel);
    actor.update(0.1);
    actor.root.updateMatrixWorld(true);
    const round = mouth.scale.clone();
    expect(round.y).toBeGreaterThan(0.75);
    expect(smile.scale.x).toBeLessThan(0.001);
    expect(corners.scale.x).toBeLessThan(0.001);
    expect(skin.getVertexPosition(openVertex, new THREE.Vector3()).distanceTo(closed)).toBeGreaterThan(0.01);
    vowel = 0;
    actor.update(0.1);
    expect(mouth.scale.x).toBeGreaterThan(round.x);
    expect(mouth.scale.y).toBeLessThan(round.y);
    level = -1;
    actor.update(0.1);
    expect(mouth.scale.x).toBeLessThan(0.001);
    expect(smile.scale.x).toBeGreaterThanOrEqual(1);
  } finally {
    actor.dispose();
  }
});
