import type { DirectionalLight, HemisphereLight, Scene } from "three";
import { FOLLOW, type CameraRig } from "../camera";
import type { Interior } from "../world/interiors";

export function applyCaveScene(wild: NonNullable<Interior["wild"]>, scene: Scene, rig: CameraRig,
  hemi: HemisphereLight, sun: DirectionalLight, restore?: () => void) {
  if (!restore) {
    const pitch = rig.pitch, dist = rig.dist;
    const sky = hemi.color.getHex(), ground = hemi.groundColor.getHex(), sunlight = sun.color.getHex();
    restore = () => {
      hemi.color.setHex(sky);
      hemi.groundColor.setHex(ground);
      sun.color.setHex(sunlight);
      rig.homePitch = FOLLOW.pitch;
      rig.pitch = pitch;
      rig.dist = dist;
    };
  }
  scene.fog = wild.fog;
  scene.background = wild.fog.color;
  hemi.color.set(wild.hemi[0]);
  hemi.groundColor.set(wild.hemi[1]);
  hemi.intensity = wild.hemi[2];
  sun.color.set(wild.sun[0]);
  sun.intensity = wild.sun[1];
  if (wild.camera) {
    rig.homePitch = rig.pitch = wild.camera.pitch;
    rig.dist = wild.camera.dist;
  }
  return restore;
}
