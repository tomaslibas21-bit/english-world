import type { Group } from "three";
import { OcclusionField } from "../occlusion";
import type { CoveDoor } from "./slateCovePlan";

export class SlateCoveArt {
  private mesh?: ReturnType<typeof import("./slateCove").buildSlateCove>;
  private loading?: Promise<void>;
  private disposed = false;
  private retryAt = 0;
  private code?: typeof import("./slateCove");
  field?: OcclusionField;

  get ready() { return !!this.mesh; }
  cameraField(x: number, z: number) {
    return x < -89 && z > -95 && z < -17 ? this.field : undefined;
  }

  load(parent: Group) {
    if (this.disposed || this.mesh || this.loading || performance.now() < this.retryAt) return;
    this.loading = import("./slateCove").then((code) => {
      if (this.disposed) return;
      this.code = code;
      const mesh = code.buildSlateCove();
      mesh.visible = false;
      this.field = OcclusionField.fromObject(mesh, { minX: -143, maxX: -106, minZ: -72, maxZ: -40 });
      this.mesh = mesh;
      parent.add(mesh);
    }).catch(() => { this.retryAt = performance.now() + 2500; }).finally(() => { this.loading = undefined; });
  }

  update(town: Group, outdoors: boolean, x: number, z: number, load = true) {
    if (!this.mesh && load && outdoors && x < -91 && z > -77 && z < -32) this.load(town);
    if (this.mesh) this.mesh.visible = outdoors && x < -81 && z > -99 && z < -14;
  }

  prompt(door: CoveDoor) {
    return this.code?.COVE_PROMPTS[door];
  }

  dispose() {
    this.disposed = true;
    this.mesh?.removeFromParent();
    this.mesh?.geometry.dispose();
    this.mesh?.material.dispose();
    this.mesh = undefined;
    this.field = undefined;
  }
}
