import * as THREE from "three";
import { lightFar } from "../kit/farShapes";
import { OpenSea, openSwell } from "../kit/openSea";
import { OpenSky } from "../kit/openSky";
import { colourMerge } from "../world/util";
import { SEA_VIEW, seaHorizon, type Coast } from "./look";

// Everything around the boat on the open water: the sky, the sea itself, the islands and sails on the horizon, the
// town's shore behind, a few clouds, and the light. It takes over from the town's own sky and bay over the first
// seconds, so leaving the bay has no seam, and then the run's timer is the time of day.

/** How far out the long rollers have reached their full height (m from the start). */
const OPEN_BY = 160;
const TAKEOVER = [0.4, 3.2] as const;

/** The surface the hull, the buoys and the wake ride on: the bay's swell at the start, open-sea rollers farther out. */
export const surface = { open: 0 };
export const seaSwell = (x: number, z: number, t: number) => openSwell(x, z, t, surface.open);

/** What the sea scene borrowed from the town, to hand over from. */
export type TownLook = {
  sky: THREE.Object3D; bay: THREE.Object3D; fog: THREE.Fog | null;
  hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight;
};

function makeClouds() {
  const geometry = colourMerge([
    [new THREE.IcosahedronGeometry(1, 0).scale(7.8, 1.5, 4.2), "#dfe3ea"],
    [new THREE.IcosahedronGeometry(1, 0).scale(5, 2.3, 3.8).translate(-1.8, 0.95, 0), "#f6f3ee"],
    [new THREE.IcosahedronGeometry(1, 0).scale(3.4, 1.8, 3.1).translate(3.1, 0.7, -0.85), "#ffffff"],
  ]);
  // A bank of cumulus standing on the horizon ahead and to the sides, and a few behind over the town.
  const spots = [[-520, 78, -1250, 15], [300, 96, -1400, 19], [900, 70, -1050, 13], [-1100, 84, -800, 15], [40, 60, -1500, 11],
    [1300, 80, -350, 14], [-700, 88, 1050, 16], [520, 72, 1200, 13], [-1350, 76, 150, 14]];
  const clouds = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, depthWrite: false }), spots.length);
  const matrix = new THREE.Matrix4();
  spots.forEach(([x, y, z, k], i) => {
    matrix.makeScale(k * (1 + i % 3 * 0.15), k * 0.55, k * 1.1).setPosition(x, y, z);
    clouds.setMatrixAt(i, matrix);
  });
  clouds.frustumCulled = false;
  clouds.renderOrder = -5;
  return clouds;
}

export class SeaBackdrop {
  readonly sky = new OpenSky(2300, SEA_VIEW.sky, SEA_VIEW.sunAzimuth, 0);
  readonly sea = new OpenSea(SEA_VIEW.water, 0, 1500);
  private horizon?: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private clouds = makeClouds();
  private from: { fog?: { color: THREE.Color; near: number; far: number }; hemi: [THREE.Color, THREE.Color, number]; sun: [THREE.Color, number] };
  private age = 0;
  private day = -1;
  private shown = -1;

  constructor(private scene: THREE.Scene, private town: TownLook, level: number) {
    const { fog, hemi, sun } = town;
    this.from = {
      fog: fog ? { color: fog.color.clone(), near: fog.near, far: fog.far } : undefined,
      hemi: [hemi.color.clone(), hemi.groundColor.clone(), hemi.intensity], sun: [sun.color.clone(), sun.intensity],
    };
    surface.open = 0;
    // A hair over the bay's own water while the two are blended, and drawn after it (the bay is 2: world/town.ts) and
    // after the boats' hull masks (1: rides/shapes.ts motorboatWaterMask), so the floor stays dry out at sea too.
    this.sea.mesh.position.y = level + 0.03;
    this.sea.mesh.renderOrder = 3;
    this.sea.wakeStrength = 0.55;
    town.sky.renderOrder = -11;
    this.sky.cover = this.sea.cover = 0;
    this.sea.mesh.visible = this.sky.mesh.visible = this.clouds.visible = false;
    scene.add(this.sky.mesh, this.sea.mesh, this.clouds);
  }

  /** The run starts here, heading out along -z. `shore`: where the town's waterfront lies, in world coordinates. */
  begin(x: number, z: number, shore?: Coast) {
    this.horizon?.removeFromParent();
    this.horizon?.geometry.dispose();
    this.horizon?.material.dispose();
    const coast = shore && { x0: shore.x0 - x, x1: shore.x1 - x, z: shore.z - z,
      lighthouse: shore.lighthouse && { x: shore.lighthouse.x - x, z: shore.lighthouse.z - z } };
    this.horizon = seaHorizon(this.sky, coast) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    this.horizon.position.set(x, this.sea.mesh.position.y, z);
    this.horizon.material.uniforms.show.value = 0;
    this.scene.add(this.horizon);
    this.clouds.position.set(x, 0, z);
  }

  /** `day`: 0 as the run starts, 1 as it ends. `out`: metres from the start. `speed`: 0–1. */
  update(dt: number, time: number, day: number, boat: { x: number; z: number; heading: number; out: number; speed: number }, camera: THREE.Camera) {
    this.age += dt;
    const show = THREE.MathUtils.smoothstep(this.age, TAKEOVER[0], TAKEOVER[1]);
    surface.open = THREE.MathUtils.smoothstep(boat.out, 20, OPEN_BY);
    const { sky, sea, town } = this;
    if (Math.abs(day - this.day) > 0.003 || show !== this.shown) {
      this.day = day;
      sky.blend(day);
      const { fog, hemi, sun } = town, from = this.from;
      if (fog && from.fog) {
        fog.color.copy(from.fog.color).lerp(sky.haze, show);
        fog.near = THREE.MathUtils.lerp(from.fog.near, 260, show);
        fog.far = THREE.MathUtils.lerp(from.fog.far, 1500, show);
      }
      hemi.color.copy(from.hemi[0]).lerp(sky.fillSky, show);
      hemi.groundColor.copy(from.hemi[1]).lerp(sky.fillGround, show);
      hemi.intensity = THREE.MathUtils.lerp(from.hemi[2], sky.fill * 1.05, show);
      sun.color.copy(from.sun[0]).lerp(sky.light, show);
      sun.intensity = THREE.MathUtils.lerp(from.sun[1], sky.lightPower * 1.15, show);
      sea.light(sky.mesh.material.uniforms.mid.value, sky.haze, sky.halo, sky.sunDir);
      if (this.horizon) lightFar(this.horizon.material, sky.haze, sky.light);
      const clouds = this.clouds.material as THREE.MeshBasicMaterial;
      clouds.color.copy(sky.cloud);
      clouds.opacity = show * 0.96;
    }
    if (show !== this.shown) {
      this.shown = show;
      sky.cover = sea.cover = show;
      sky.mesh.visible = sea.mesh.visible = this.clouds.visible = show > 0;
      town.sky.visible = town.bay.visible = show < 1;
      if (this.horizon) this.horizon.material.uniforms.show.value = show;
    }
    sky.update(dt, camera.position);
    sea.update(time, boat.x, boat.z, boat.heading, boat.speed, surface.open);
    // The clouds keep their distance: they never arrive.
    this.clouds.position.z = boat.z;
  }

  /** The gate ahead: its floats get rings on the water. `gap`: metres between two floats. */
  gate(at: { x: number; z: number } | undefined, gap: number, shown = 1) { this.sea.floats(at?.x ?? 0, at?.z ?? 0, gap, at ? shown : 0); }

  /** The right gate: the sun flares for a moment. */
  celebrate() { this.sky.pulse(); }

  dispose() {
    const { town, from } = this;
    // The lights and the fog belong to the sea scene's own copies, but leave them as they came.
    if (town.fog && from.fog) { town.fog.color.copy(from.fog.color); town.fog.near = from.fog.near; town.fog.far = from.fog.far; }
    this.sky.mesh.removeFromParent();
    this.sea.mesh.removeFromParent();
    this.clouds.removeFromParent();
    this.horizon?.removeFromParent();
    this.sky.dispose();
    this.sea.dispose();
    this.horizon?.geometry.dispose();
    this.horizon?.material.dispose();
    this.clouds.geometry.dispose();
    (this.clouds.material as THREE.Material).dispose();
    this.clouds.dispose();
    surface.open = 0;
  }
}
