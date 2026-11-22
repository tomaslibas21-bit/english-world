import * as THREE from "three";

// Soft round puffs for the games outside town: dust behind a drifting car, spray off a bow, foam in a wake.
// One instanced draw call of camera-facing quads; a puff swells, rises and fades by its own age.

const vertex = /* glsl */ `
attribute vec4 puff;   // centre (world) and size
attribute float fade;
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = uv - 0.5;
  vFade = fade;
  vec4 eye = viewMatrix * vec4(puff.xyz, 1.0);
  eye.xy += position.xy * puff.w;
  gl_Position = projectionMatrix * eye;
}`;

const fragment = /* glsl */ `
uniform vec3 tint;
uniform float opacity;
varying vec2 vUv;
varying float vFade;
void main() {
  float soft = smoothstep(0.5, 0.12, length(vUv));
  gl_FragColor = vec4(tint, soft * vFade * opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

type Puff = { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; grow: number; age: number; life: number };

export class SoftPuffs {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private live: Puff[] = [];
  private spots: THREE.InstancedBufferAttribute;
  private fades: THREE.InstancedBufferAttribute;

  constructor(private capacity: number, colour: THREE.ColorRepresentation, opacity = 0.5) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute("position", quad.attributes.position);
    geometry.setAttribute("uv", quad.attributes.uv);
    this.spots = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.fades = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("puff", this.spots);
    geometry.setAttribute("fade", this.fades);
    geometry.instanceCount = 0;
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, fog: false,
      uniforms: { tint: { value: new THREE.Color(colour) }, opacity: { value: opacity } },
    }));
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 2;
  }

  get tint() { return this.mesh.material.uniforms.tint.value as THREE.Color; }
  get count() { return this.live.length; }

  /** A puff at `p`, `size` metres across, living `life` seconds; it drifts by `v` (m/s) and swells by `grow` (×/life). */
  emit(p: THREE.Vector3, size: number, life: number, v?: { x: number; y: number; z: number }, grow = 1.6) {
    if (this.live.length >= this.capacity) this.live.shift();
    this.live.push({ x: p.x, y: p.y, z: p.z, vx: v?.x ?? 0, vy: v?.y ?? 0.5, vz: v?.z ?? 0, size, grow, age: 0, life });
  }

  update(dt: number) {
    let n = 0;
    for (const puff of this.live) {
      puff.age += dt;
      if (puff.age >= puff.life) continue;
      this.live[n] = puff;
      const t = puff.age / puff.life;
      puff.x += puff.vx * dt; puff.y += puff.vy * dt; puff.z += puff.vz * dt;
      this.spots.setXYZW(n, puff.x, puff.y, puff.z, puff.size * (1 + puff.grow * t));
      // In quickly, out slowly.
      this.fades.setX(n, Math.min(1, t * 8) * (1 - t) * (1 - t));
      n++;
    }
    this.live.length = n;
    this.mesh.geometry.instanceCount = n;
    this.mesh.visible = n > 0;
    if (n) this.spots.needsUpdate = this.fades.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
