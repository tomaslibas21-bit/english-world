import * as THREE from "three";

const RANGE = 48 * 3;
type Position = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
type Mesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
type Pose = { geometry: THREE.BufferGeometry; revision: number; xyz: Float64Array; boxes: THREE.Box3[] };

export function rayReaches(ray: THREE.Ray, farSquared: number, box: THREE.Box3, point: THREE.Vector3) {
  return box.containsPoint(ray.origin) || (!!ray.intersectBox(box, point) && point.distanceToSquared(ray.origin) < farSquared);
}

/** Bound the triangle queries for merged scenery and reuse the actor's posed vertices within a fit. */
export class TalkMeshRanges {
  private readonly staticBoxes = new WeakMap<THREE.BufferGeometry, THREE.Box3[]>();
  private readonly poses = new WeakMap<THREE.SkinnedMesh, Pose>();
  private readonly local = new THREE.Ray();
  private readonly inverse = new THREE.Matrix4();
  private readonly point = new THREE.Vector3();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private revision = 0;

  beginFit() { this.revision++; }

  /** In exitOnly mode, find the winding of the first surface from inside the object. */
  hits(mesh: Mesh, ray: THREE.Ray, far: number, exitOnly = false): boolean | undefined {
    const geometry = mesh.geometry, { position } = geometry.attributes, index = geometry.index;
    const count = index?.count ?? position.count, begin = geometry.drawRange.start;
    const skin = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? mesh as THREE.SkinnedMesh : null;
    if ((!exitOnly && !skin && count < RANGE * 3) || begin % 3 || geometry.morphAttributes.position?.length
      || mesh.raycast !== (skin ? THREE.SkinnedMesh.prototype.raycast : THREE.Mesh.prototype.raycast)) return undefined;

    const pose = skin ? this.skinPose(skin) : undefined;
    let boxes = pose?.boxes ?? this.staticBoxes.get(geometry);
    if (!boxes) {
      boxes = [];
      this.fillBoxes(geometry, boxes);
      this.staticBoxes.set(geometry, boxes);
    }
    this.inverse.copy(mesh.matrixWorld).invert();
    this.local.copy(ray).applyMatrix4(this.inverse);
    let farSquared = ray.at(far, this.point).applyMatrix4(this.inverse).distanceToSquared(this.local.origin);
    let exit = false;
    const end = Math.min(count, begin + geometry.drawRange.count), side = mesh.material.side;
    for (let i = Math.floor(begin / RANGE); i < boxes.length && i * RANGE < end; i++) {
      if (!rayReaches(this.local, farSquared, boxes[i], this.point)) continue;
      const stop = Math.min(end, (i + 1) * RANGE);
      for (let k = Math.max(begin, i * RANGE); k + 2 < stop; k += 3) {
        this.vertex(this.a, position, index ? index.getX(k) : k, pose?.xyz);
        this.vertex(this.b, position, index ? index.getX(k + 1) : k + 1, pose?.xyz);
        this.vertex(this.c, position, index ? index.getX(k + 2) : k + 2, pose?.xyz);
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

  private vertex(to: THREE.Vector3, position: Position, index: number, xyz?: Float64Array) {
    return xyz ? to.fromArray(xyz, 3 * index) : to.fromBufferAttribute(position, index);
  }

  private fillBoxes(geometry: THREE.BufferGeometry, boxes: THREE.Box3[], xyz?: Float64Array) {
    const { position } = geometry.attributes, index = geometry.index, count = index?.count ?? position.count;
    boxes.length = Math.ceil(count / RANGE);
    for (let i = 0; i < boxes.length; i++) {
      const box = (boxes[i] ??= new THREE.Box3()).makeEmpty();
      const end = Math.min(count, (i + 1) * RANGE);
      for (let j = i * RANGE; j < end; j++) box.expandByPoint(this.vertex(this.point, position, index ? index.getX(j) : j, xyz));
    }
  }

  private skinPose(mesh: THREE.SkinnedMesh) {
    const geometry = mesh.geometry, count = geometry.attributes.position.count;
    let pose = this.poses.get(mesh);
    if (!pose || pose.geometry !== geometry) {
      pose = { geometry, revision: -1, xyz: new Float64Array(count * 3), boxes: [] };
      this.poses.set(mesh, pose);
    }
    if (pose.revision !== this.revision) {
      for (let i = 0; i < count; i++) mesh.getVertexPosition(i, this.point).toArray(pose.xyz, i * 3);
      this.fillBoxes(geometry, pose.boxes, pose.xyz);
      pose.revision = this.revision;
    }
    return pose;
  }
}
