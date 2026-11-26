import * as THREE from "three";
import { KARAOKE_SIGN } from "../../content/karaokeCopy";
import { THEME } from "../world/theme";
import type { CameraRig } from "../camera";
import type { GameCharacter } from "../characters";
import { Merger, mat, boxGeo, cylGeo, colourMerge, textTexture, type Colliders } from "../world/util";

export const KARAOKE_PLACE = "sunny-cup";
export const KARAOKE_PROMPT = { x: 4.2, z: 2.8 };
export const KARAOKE_MARK = { x: 5.7, z: 2.6, y: 0.08, rot: -2.35 };

export function makeKaraokeMic() {
  const group = new THREE.Group();
  group.name = "karaoke-hand-mic";
  const merger = new Merger();
  // The origin is the middle of the grip, rather than the bottom of the handle.
  merger.add("mic-handle", mat("#223b52"), cylGeo(0.035, 0.04, 0.22, 0, 0, 0, 8), false);
  merger.add("mic-grille", mat("#c9a45c"), new THREE.SphereGeometry(0.066, 8, 6).scale(1, 1.2, 1).translate(0, 0.15, 0), false);
  merger.build(group);
  group.rotation.x = -0.7;
  return group;
}

const grip = new THREE.Vector3(), mouth = new THREE.Vector3(), direction = new THREE.Vector3();
const handRotation = new THREE.Quaternion(), shaftRotation = new THREE.Quaternion();
const shaftUp = new THREE.Vector3(0, 1, 0);

/** Both rigs' hand sockets are biased forward for cups. Seat the shaft inside the palm and raise it to sing. */
export function poseKaraokeSinger(player: GameCharacter, mic: THREE.Group) {
  const arm = player.joint("armR"), fore = player.joint("foreR");
  // The styled rigs' shoulders sit higher relative to their heads. Use a lower elbow there.
  const highShoulder = THREE.MathUtils.clamp((arm.position.y / player.height - 0.69) / 0.1, 0, 1);
  arm.rotation.set(THREE.MathUtils.lerp(-1.05, -0.45, highShoulder), -0.32, 0.08);
  fore.rotation.set(THREE.MathUtils.lerp(-1.85, -1.45, highShoulder), 0, 0);
  const hand = player.rightHand;
  mic.position.set(-hand.position.x, 0, -hand.position.z * 0.55)
    .applyQuaternion(handRotation.copy(hand.quaternion).invert());
  player.root.updateMatrixWorld(true);
  mic.getWorldPosition(grip);
  mouth.set(0.04, player.height * 0.83, 0.18);
  player.root.localToWorld(mouth);
  direction.subVectors(mouth, grip).normalize();
  shaftRotation.setFromUnitVectors(shaftUp, direction);
  hand.getWorldQuaternion(handRotation).invert();
  mic.quaternion.copy(handRotation.multiply(shaftRotation));
}

/** The café owns these static meshes for the lifetime of its cached interior. */
export function addKaraokeBooth(room: THREE.Group, colliders: Colliders) {
  const group = new THREE.Group();
  group.name = "karaoke-booth";
  const merger = new Merger();
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const box = (color: string, w: number, h: number, d: number, x: number, y: number, z: number) =>
    parts.push([boxGeo(w, h, d, x, y, z), color]);
  const { panel, trim, floor, stand } = THEME.karaoke ?? {
    panel: "#223b52", trim: "#c9a45c", floor: "#b98050", stand: "#faf5e9",
  };
  box(trim, 2.4, 0.045, 1.8, 5.8, 0.0225, 2.6);
  box(floor, 2.32, 0.035, 1.72, 5.8, 0.0625, 2.6);
  box(panel, 0.09, 2.35, 1.8, 7.03, 1.2, 2.6);
  box(trim, 0.12, 0.045, 1.85, 6.97, 2.38, 2.6);
  // A clear, walk-up lectern at the aisle side of the platform.
  box(panel, 0.48, 0.06, 0.42, 5.02, 0.11, 3.05);
  box(THEME.karaoke ? stand : floor, 0.08, 0.87, 0.08, 5.02, 0.55, 3.05);
  box(stand, 0.58, 0.06, 0.42, 5.02, 1.02, 3.05);
  box("#954336", 0.045, 0.009, 0.4, 4.82, 1.055, 3.05);
  // Upright stand and cradle. The docked microphone disappears while the avatar carries it.
  parts.push([cylGeo(0.19, 0.22, 0.035, 5.7, 0.1, 2.5, 12), panel]);
  parts.push([cylGeo(0.018, 0.024, 1.15, 5.7, 0.69, 2.5, 8), panel]);
  parts.push([new THREE.CircleGeometry(0.72, 24).rotateX(-Math.PI / 2).scale(1.3, 1, 1)
    .translate(5.65, KARAOKE_MARK.y + 0.002, 2.58), THEME.karaoke ? "#ce8961" : "#ca935d"]);
  for (const z of [1.91, 3.29]) {
    box("#223b52", 0.14, 0.32, 0.24, 6.9, 2.07, z);
    merger.add("booth-lamps", mat("#ffcf7a", { emissive: "#9c571f" }), boxGeo(0.02, 0.23, 0.17, 6.81, 2.07, z), false);
  }
  const set = new THREE.Mesh(colourMerge(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  set.name = "karaoke-static";
  group.add(set);
  merger.build(group);
  const docked = makeKaraokeMic();
  docked.name = "karaoke-docked-mic";
  docked.position.set(5.7, 1.36, 2.5);
  group.add(docked);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.38), new THREE.MeshBasicMaterial({
    map: textTexture(KARAOKE_SIGN, { bg: panel, fg: stand, w: 512, h: 144 }),
  }));
  sign.name = "karaoke-sign";
  if (THEME.karaoke) {
    sign.position.set(6.977, 2.05, 2.6);
    sign.rotation.y = -Math.PI / 2;
  } else sign.position.set(5.8, 2.06, 1.74);
  group.add(sign);
  room.add(group);
  colliders.addBox(5.8, 2.6, 2.4, 1.8);
  colliders.addBox(5.02, 3.05, 0.58, 0.42);
  return group;
}

export function karaokeShot(aspect: number): NonNullable<CameraRig["stage"]> {
  return {
    // Move beside the foreground guest on portrait phones so their shoulder cannot fill the narrow picture.
    pos: new THREE.Vector3(0.65, 1.5, aspect < 0.9 ? 2.3 : 1.3), look: new THREE.Vector3(5.7, 0.6, 2.6),
    fov: aspect < 0.9 ? 48 : 43, rate: 18,
  };
}

/** Only privately owned hand-prop geometries are disposed. The material cache stays shared. */
export function disposeKaraokeMic(mic: THREE.Group) {
  mic.removeFromParent();
  mic.traverse((part) => { if (part instanceof THREE.Mesh) part.geometry.dispose(); });
}
