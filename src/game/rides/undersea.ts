// Under the water: what a dive shows. The sea's surface is opaque from above, so none of this is in the picture (or
// costs a frame anything) until the camera goes under it: a sandy bed that follows the seabed (water.ts seaBedY), rocks,
// coral, sea grass, starfish and shells on it, a few small schools of fish, the surface seen from below, bubbles.
// Three meshes and a few points, built the first time someone swims.
import * as THREE from "three";
import { colourMerge, rand } from "../world/util";
import { BAY, SEA_LEVEL, SHORE, floorY, POOLS, poolBedY, type Pool } from "../water";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

const FISH = 30;
const FISH_COLORS = ["#ffd23f", "#ff8a3d", "#4cc9f0", "#f4f1de", "#f25c54", "#9bdeac"];

export class Undersea {
  group = new THREE.Group();
  /** The camera is under the water now. */
  on = false;
  private built = false;
  private fish: THREE.InstancedMesh | null = null;
  private schools: { x: number; y: number; z: number; r: number; w: number; n: number; a: number }[] = [];
  private under: THREE.Mesh | null = null;
  private far: THREE.Mesh | null = null;
  private underU = { uTime: { value: 0 }, uDeep: { value: new THREE.Color() }, uLight: { value: new THREE.Color("#d6fbff") } };
  private bedU = { uTime: { value: 0 } };
  private bubbles: THREE.Points | null = null;
  private bub = new Float32Array(18 * 3).fill(-999);
  private bubNext = 0;
  private bubT = 0;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);
  readonly fog: THREE.Fog;

  /** `deep`: the water's colour seen from inside it; `rocks`: the bay's rocks (x, z, radius), which go on down. */
  constructor(private deep: string, private rocks: [number, number, number][]) {
    this.group.name = "undersea";
    this.group.visible = false;
    this.fog = new THREE.Fog(deep, 0.5, 32);
    this.underU.uDeep.value.set(deep);
  }

  /** Builds it (once; a few milliseconds): called when someone starts to swim, so a dive finds it ready. */
  build() {
    if (this.built) return;
    this.built = true;
    const r = rand(2718), parts: Part[] = [];
    // ---- the bed: fine by the shore where it falls away, coarse further out
    const x0 = BAY.x0 - 16, x1 = BAY.x1 + 16, zs: number[] = [];
    for (let z = SHORE.edge + 0.5; z > SHORE.limit - 12; z -= 1) zs.push(z);
    for (let z = SHORE.limit - 12; z > BAY.z0 - 24; z -= 4) zs.push(z);
    const nx = Math.round((x1 - x0) / 3), pos: number[] = [], col: number[] = [], idx: number[] = [];
    const sand = new THREE.Color("#ecdcae"), dark = new THREE.Color("#cdbb8a"), c = new THREE.Color();
    for (const z of zs) for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      pos.push(x, floorY(x, z) + (z < SHORE.limit - 3 ? Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.12 : 0), z);
      // ripples of light and darker sand, and patches
      const k = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 0.5) * 2) * Math.sin(z * 0.7 + x * 0.13);
      c.copy(sand).lerp(dark, k * 0.55 + 0.25 * Math.sin(x * 0.07 + z * 0.11));
      col.push(c.r, c.g, c.b);
    }
    for (let k = 0; k + 1 < zs.length; k++) for (let i = 0; i < nx; i++) {
      const a = k * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    const bedG = new THREE.BufferGeometry();
    bedG.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    bedG.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    bedG.setIndex(idx);
    bedG.computeVertexNormals();
    const bedM = new THREE.MeshLambertMaterial({ vertexColors: true });
    // the light through the waves plays on the bed
    bedM.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.bedU.uTime;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSeaW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvSeaW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vSeaW; uniform float uTime;")
        .replace("#include <color_fragment>", `#include <color_fragment>
          float ca = sin(vSeaW.x * 1.7 + uTime * 1.1 + sin(vSeaW.z * 1.3 - uTime * 0.7) * 1.6) * sin(vSeaW.z * 1.9 - uTime * 0.9 + sin(vSeaW.x * 1.1 + uTime * 0.5) * 1.4);
          diffuseColor.rgb *= 0.88 + 0.34 * smoothstep(0.35, 1.0, ca) + 0.08 * ca;`);
    };
    const bed = new THREE.Mesh(bedG, bedM);
    bed.name = "seabed";
    bed.frustumCulled = false;
    // ---- what lies and grows on it, one mesh
    const stone = (x: number, y: number, z: number, s: number, colour = ["#8d8f93", "#7c8086", "#9a9c9f", "#6f7479"][Math.floor(r() * 4)]) =>
      parts.push([new THREE.DodecahedronGeometry(s, 0).scale(1 + r() * 0.4, 0.6 + r() * 0.3, 1 + r() * 0.4).rotateY(r() * 3).translate(x, y, z), colour]);
    const coral = (x: number, y: number, z: number) => {
      const colour = ["#ff7f6b", "#ffb347", "#e86fa5", "#b08cff", "#ffd166"][Math.floor(r() * 5)], n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const h = 0.35 + r() * 0.5, a = r() * Math.PI * 2, lean = 0.2 + r() * 0.5;
        parts.push([new THREE.CylinderGeometry(0.04, 0.09, h, 5).translate(0, h / 2, 0).rotateZ(lean).rotateY(a).translate(x, y, z), colour]);
        parts.push([new THREE.IcosahedronGeometry(0.1, 0).translate(0, h, 0).rotateZ(lean).rotateY(a).translate(x, y, z), colour]);
      }
    };
    const grass = (x: number, y: number, z: number) => {
      for (let i = 0; i < 5; i++) {
        const h = 0.5 + r() * 0.9;
        parts.push([new THREE.ConeGeometry(0.07, h, 3).translate(0, h / 2, 0).rotateZ((r() - 0.5) * 0.5).translate(x + (r() - 0.5) * 0.7, y, z + (r() - 0.5) * 0.7), ["#2f8f5b", "#3fa66a", "#27784c"][i % 3]]);
      }
    };
    const star = (x: number, y: number, z: number) => {
      const s = new THREE.Shape(), R = 0.2, q = 0.085;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, rr = i % 2 ? q : R; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      parts.push([new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2).rotateY(r() * 3).translate(x, y + 0.02, z), r() < 0.5 ? "#ff7a45" : "#e8475f"]);
    };
    const shell = (x: number, y: number, z: number) => parts.push([new THREE.SphereGeometry(0.11, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1.2).rotateY(r() * 3).translate(x, y, z), ["#fff1e0", "#ffd9c7", "#f6e7c9"][Math.floor(r() * 3)]]);
    // the bay's rocks go on down to the bed
    // (inside the circle a swimmer is kept out of)
    for (const [x, z, rad] of this.rocks) for (let i = 0; i < 16; i++) {
      const size = 1 + r() * 0.9, a = r() * Math.PI * 2, d = Math.sqrt(r()) * Math.max(0, rad - size * 1.5 - 0.4), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      stone(px, floorY(px, pz) + 0.5 + r() * 1.4, pz, size);
    }
    // little reefs scattered over the bay (out past the wading limit), each a few stones with coral and sea grass
    for (let i = 0; i < 46; i++) {
      const x = BAY.x0 + r() * (BAY.x1 - BAY.x0), z = SHORE.limit - 5 - r() * (SHORE.limit - 8 - BAY.z0), y = floorY(x, z);
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) stone(x + (r() - 0.5) * 2.2, y + 0.1, z + (r() - 0.5) * 2.2, 0.35 + r() * 0.6);
      if (r() < 0.8) coral(x + (r() - 0.5) * 1.6, y + 0.15, z + (r() - 0.5) * 1.6);
      if (r() < 0.7) grass(x + (r() - 0.5) * 2.4, y, z + (r() - 0.5) * 2.4);
    }
    for (let i = 0; i < 70; i++) {
      const x = BAY.x0 + r() * (BAY.x1 - BAY.x0), z = SHORE.limit - 1 - r() * (SHORE.limit - 4 - BAY.z0), y = floorY(x, z);
      if (r() < 0.45) star(x, y, z); else if (r() < 0.6) shell(x, y, z); else grass(x, y, z);
    }
    for (const p of POOLS) this.poolBed(p, parts, r);
    const things = new THREE.Mesh(colourMerge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
    things.name = "seabed-things";
    things.frustumCulled = false;
    // ---- the surface from below: bright, moving
    const under = new THREE.Mesh(new THREE.PlaneGeometry(BAY.x1 - BAY.x0 + 120, SHORE.top - BAY.z0 + 60).rotateX(Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: this.underU, fog: false,
      vertexShader: "varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }",
      fragmentShader: `varying vec3 vW; uniform float uTime; uniform vec3 uDeep; uniform vec3 uLight;
        void main(){
          float w = sin(vW.x * 0.9 + uTime * 1.3 + sin(vW.z * 0.7 + uTime * 0.6) * 1.5) * sin(vW.z * 1.1 - uTime * 1.1 + sin(vW.x * 0.6) * 1.3);
          float d = length(vW.xz - cameraPosition.xz);
          vec3 c = mix(uDeep * 1.25, uLight, smoothstep(0.1, 1.0, w) * 0.75 + 0.18);
          // (straight overhead the sky shows bright; further off the water's own colour takes over)
          c = mix(c, uDeep, smoothstep(4.0, 26.0, d));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    under.position.set((BAY.x0 + BAY.x1) / 2, SEA_LEVEL - 0.3, (SHORE.top + BAY.z0) / 2);
    under.frustumCulled = false;
    this.under = under;
    // ---- fish: one instanced mesh, in small schools that circle near whoever dives
    const fg = colourMerge([
      [new THREE.OctahedronGeometry(0.16, 0).scale(0.42, 0.8, 1.5), "#ffffff"],
      [new THREE.ConeGeometry(0.11, 0.2, 3).rotateX(-Math.PI / 2).scale(0.3, 1, 1).translate(0, 0, -0.3), "#e9e9e9"],
      [new THREE.SphereGeometry(0.022, 4, 3).translate(0.06, 0.03, 0.14), "#1c1c1c"], [new THREE.SphereGeometry(0.022, 4, 3).translate(-0.06, 0.03, 0.14), "#1c1c1c"],
    ]).scale(1.35, 1.35, 1.35);
    const fish = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true }), FISH);
    fish.frustumCulled = false;
    for (let i = 0; i < FISH; i++) fish.setColorAt(i, c.set(FISH_COLORS[Math.floor(i / 6) % FISH_COLORS.length]));
    this.fish = fish;
    for (let k = 0; k < FISH / 6; k++) this.schools.push({ x: 0, y: -99, z: 0, r: 2.5 + r() * 2.5, w: (0.25 + r() * 0.3) * (k % 2 ? 1 : -1), n: 6, a: r() * 6 });
    // ---- bubbles from the diver
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(this.bub, 3));
    this.bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ color: "#eaffff", size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    this.bubbles.frustumCulled = false;
    // ---- the water all round, beyond where anything can be seen: the fog's own colour, as the fog draws it
    const far = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 16, 20, 1, true), new THREE.MeshBasicMaterial({ color: this.deep, side: THREE.BackSide }));
    far.frustumCulled = false;
    this.far = far;
    this.group.add(bed, things, under, far, fish, this.bubbles);
  }

  /** A pool's bowl (a cenote): pale limestone walls and floor, stones, roots hanging in from its rim. */
  private poolBed(p: Pool, parts: Part[], r: () => number) {
    const N = 28, rings = 7, pos: number[] = [], idx: number[] = [];
    for (let k = 0; k <= rings; k++) for (let i = 0; i <= N; i++) {
      const t = k / rings, a = (i / N) * Math.PI * 2, rr = p.r * (1.04 - t * 1.04);
      const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      pos.push(x, k === 0 ? p.y + 0.02 : poolBedY(p, x, z), z);
    }
    for (let k = 0; k < rings; k++) for (let i = 0; i < N; i++) {
      const a = k * (N + 1) + i, b = a + 1, d = a + N + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    parts.push([g.toNonIndexed(), "#d9d2bd"]);
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * p.r * 0.8, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      parts.push([new THREE.DodecahedronGeometry(0.3 + r() * 0.5, 0).scale(1.2, 0.6, 1).rotateY(r() * 3).translate(x, poolBedY(p, x, z) + 0.1, z), ["#c9bfa6", "#b8ad93", "#e2dac6"][i % 3]]);
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.5 + r() * Math.PI, rr = p.r * (0.93 - r() * 0.12), h = 0.8 + r() * 2.2;
      parts.push([new THREE.CylinderGeometry(0.02, 0.035, h, 4).translate(p.x + Math.cos(a) * rr, p.y - h / 2, p.z + Math.sin(a) * rr), ["#5a4232", "#6b5040"][i % 2]]);
    }
  }

  /** Every frame someone is in the water. `under`: the camera is below its surface; `at`: where the diver is. */
  update(dt: number, t: number, under: boolean, at: THREE.Vector3, moving: number) {
    if (under && !this.built) this.build();
    this.on = under && this.built;
    this.group.visible = this.on;
    if (!this.on) return;
    this.underU.uTime.value = t;
    this.bedU.uTime.value = t;
    // (a pool's surface is its own: the plane moves over the diver's water)
    const pool = POOLS.find((p) => (at.x - p.x) ** 2 + (at.z - p.z) ** 2 < (p.r + 2) ** 2);
    this.under!.position.y = (pool ? pool.y : SEA_LEVEL) - 0.3;
    this.far!.position.set(at.x, -3, at.z);
    // the schools circle; one that is left far behind turns up again ahead of the diver
    const fish = this.fish!;
    let i = 0;
    this.schools.forEach((s, k) => {
      const far = Math.hypot(s.x - at.x, s.z - at.z);
      if (s.y < -50 || far > 26) {
        const a = Math.random() * Math.PI * 2, d = pool ? Math.random() * pool.r * 0.4 : 7 + Math.random() * 9;
        s.x = (pool ? pool.x : at.x) + Math.cos(a) * d; s.z = (pool ? pool.z : at.z) + Math.sin(a) * d;
        if (pool) s.r = 1.2 + (k % 3) * 0.7;
        const bedY = floorY(s.x, s.z), top = (pool ? pool.y : SEA_LEVEL) - 0.7;
        s.y = Math.min(top, bedY + 0.5 + Math.random() * Math.max(0.2, top - bedY - 0.6));
      }
      s.a += s.w * dt;
      for (let j = 0; j < s.n; j++, i++) {
        const a = s.a + j * 0.42 + Math.sin(t * 0.7 + j) * 0.12, rr = s.r + Math.sin(j * 2.1 + k) * 0.5;
        this.v.set(s.x + Math.cos(a) * rr, s.y + Math.sin(t * 0.9 + j * 1.7) * 0.18 + (j % 3) * 0.16, s.z + Math.sin(a) * rr);
        // (nose along the circle, a wag of the tail)
        this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -a + (s.w > 0 ? 0 : Math.PI) + Math.sin(t * 9 + j) * 0.18);
        fish.setMatrixAt(i, this.m4.compose(this.v, this.q, this.s));
      }
    });
    fish.instanceMatrix.needsUpdate = true;
    // bubbles: a few from the diver's mouth, more while they move, rising
    this.bubT -= dt * (0.6 + moving);
    if (this.bubT <= 0) {
      this.bubT = 0.16 + Math.random() * 0.3;
      const j = this.bubNext; this.bubNext = (this.bubNext + 1) % 18;
      this.bub[j * 3] = at.x + (Math.random() - 0.5) * 0.3; this.bub[j * 3 + 1] = at.y; this.bub[j * 3 + 2] = at.z + (Math.random() - 0.5) * 0.3;
    }
    const top = (pool ? pool.y : SEA_LEVEL) - 0.35;
    for (let j = 0; j < 18; j++) {
      if (this.bub[j * 3 + 1] < -50) continue;
      this.bub[j * 3 + 1] += dt * (0.9 + (j % 4) * 0.2);
      this.bub[j * 3] += Math.sin(t * 5 + j) * dt * 0.12;
      if (this.bub[j * 3 + 1] > top) this.bub[j * 3 + 1] = -999;
    }
    (this.bubbles!.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
