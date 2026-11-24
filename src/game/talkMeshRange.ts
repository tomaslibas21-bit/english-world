import * as THREE from "three";

const STEP = 48 * 3;
type Mesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
type Pose = { fit: number; xyz: Float64Array; boxes: THREE.Box3[]; geometry: THREE.BufferGeometry };

export function rayReaches(ray: THREE.Ray, farSquared: number, box: THREE.Box3, point: THREE.Vector3) {
  return box.containsPoint(ray.origin) || (!!ray.intersectBox(box, point) && point.distanceToSquared(ray.origin) < farSquared);
}

/** Limit triangle work inside the game's merged meshes and reuse a local actor's posed vertices across its rays. */
export class TalkMeshRanges {
  private staticBoxes = new WeakMap<THREE.BufferGeometry, THREE.Box3[]>();
  private poses = new WeakMap<THREE.SkinnedMesh, Pose>();
  private local = new THREE.Ray();
  private inverse = new THREE.Matrix4();
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private c = new THREE.Vector3();
  private point = new THREE.Vector3();
  fit = 0;

  /** With exitOnly, check the winding of the nearest surface even when it is viewed from inside.
   *  Undefined leaves instancing, custom raycasts and material groups to Three's mesh raycaster. */
  hits(mesh: Mesh, ray: THREE.Ray, far: number, exitOnly = false): boolean | undefined {
    const geometry = mesh.geometry, { position } = geometry.attributes;
    const skin = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : null;
    const index = geometry.index, count = index?.count ?? position.count;
    if ((!exitOnly && count < STEP * 3) || (skin ? mesh.raycast !== THREE.SkinnedMesh.prototype.raycast : mesh.raycast !== THREE.Mesh.prototype.raycast)
      || geometry.morphAttributes.position?.length || geometry.drawRange.start % 3 || Array.isArray(mesh.material)) return undefined;

    const xyz = skin ? this.skinPose(skin) : undefined;
    let boxes = xyz?.boxes ?? this.staticBoxes.get(geometry);
    if (!boxes) {
      boxes = [];
      this.staticBoxes.set(geometry, boxes);
      this.fillBoxes(geometry, boxes);
    }
    this.inverse.copy(mesh.matrixWorld).invert();
    this.local.copy(ray).applyMatrix4(this.inverse);
    let farSquared = ray.at(far, this.point).applyMatrix4(this.inverse).distanceToSquared(this.local.origin);
    let exit = false;
    const begin = geometry.drawRange.start, end = Math.min(count, begin + geometry.drawRange.count);
    const side = mesh.material.side;
    for (let i = Math.floor(begin / STEP); i < boxes.length && i * STEP < end; i++) {
      if (!rayReaches(this.local, farSquared, boxes[i], this.point)) continue;
      const stop = Math.min(end, (i + 1) * STEP);
      for (let k = Math.max(begin, i * STEP); k + 2 < stop; k += 3) {
        this.read(this.a, position, index ? index.getX(k) : k, xyz?.xyz);
        this.read(this.b, position, index ? index.getX(k + 1) : k + 1, xyz?.xyz);
        this.read(this.c, position, index ? index.getX(k + 2) : k + 2, xyz?.xyz);
        const hit = !exitOnly && side === THREE.BackSide
          ? this.local.intersectTriangle(this.c, this.b, this.a, true, this.point)
          : this.local.intersectTriangle(this.a, this.b, this.c, !exitOnly && side !== THREE.DoubleSide, this.point);
        if (!hit) continue;
        const distance = hit.distanceToSquared(this.local.origin);
        if (distance >= farSquared) continue;
        if (!exitOnly) return true;
        farSquared = distance;
        exit = this.b.sub(this.a).cross(this.c.sub(this.a)).dot(this.local.direction) > 0;
      }
    }
    return exit;
  }

  private read(to: THREE.Vector3, position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, i: number, xyz?: Float64Array) {
    if (xyz) to.fromArray(xyz, 3 * i);
    else to.fromBufferAttribute(position, i);
  }

  private fillBoxes(geometry: THREE.BufferGeometry, boxes: THREE.Box3[], xyz?: Float64Array) {
    const { position } = geometry.attributes, index = geometry.index, count = index?.count ?? position.count;
    boxes.length = Math.ceil(count / STEP);
    for (let i = 0; i < boxes.length; i++) {
      const box = (boxes[i] ??= new THREE.Box3()).makeEmpty();
      const end = Math.min(count, (i + 1) * STEP);
      for (let j = i * STEP; j < end; j++) {
        this.read(this.point, position, index ? index.getX(j) : j, xyz);
        box.expandByPoint(this.point);
      }
    }
  }

  private skinPose(mesh: THREE.SkinnedMesh) {
    const geometry = mesh.geometry, count = geometry.attributes.position.count;
    let pose = this.poses.get(mesh);
    if (!pose || pose.geometry !== geometry) {
      pose = { fit: -1, xyz: new Float64Array(3 * count), boxes: [], geometry };
      this.poses.set(mesh, pose);
    }
    if (pose.fit !== this.fit) {
      for (let i = 0; i < count; i++) mesh.getVertexPosition(i, this.point).toArray(pose.xyz, 3 * i);
      this.fillBoxes(geometry, pose.boxes, pose.xyz);
      pose.fit = this.fit;
    }
    return pose;
  }
}
