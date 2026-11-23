import * as THREE from "three";
import { SEA_LEVEL } from "../water";
import { seaSwell as swell } from "./backdrop";

const SAMPLES = 32, LIFE = 2.1, STEP = 0.07;
type Sample = { x: number; z: number; sideX: number; sideZ: number; born: number };

export class SeaWake {
  private readonly samples: Sample[] = [];
  private readonly position = new THREE.BufferAttribute(new Float32Array(SAMPLES * 6), 3).setUsage(THREE.DynamicDrawUsage);
  private readonly uv = new THREE.BufferAttribute(new Float32Array(SAMPLES * 4), 2).setUsage(THREE.DynamicDrawUsage);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: { clock: { value: 0 } },
    vertexShader: `
      varying vec2 ribbon;
      void main() {
        ribbon = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 ribbon;
      uniform float clock;
      void main() {
        float edge = abs(ribbon.x * 2.0 - 1.0);
        float age = clamp(ribbon.y, 0.0, 1.0);
        float crest = (edge - 0.73) * 6.8;
        float streak = exp(-crest * crest);
        float churn = (1.0 - smoothstep(0.14, 0.68, edge)) * (1.0 - 0.8 * age);
        float foam = 0.72 + 0.28 * sin(age * 89.0 + edge * 14.0 - clock * 6.0);
        float alpha = (0.79 * streak + 0.51 * churn) * foam * (1.0 - age) * (1.0 - age);
        gl_FragColor = vec4(0.91, 0.98, 1.0, alpha);
      }`,
  });
  readonly mesh = new THREE.Mesh(this.geometry, this.material);

  constructor() {
    const index: number[] = [];
    for (let i = 0; i < SAMPLES - 1; i++) {
      const v = i * 2;
      index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute("position", this.position);
    this.geometry.setAttribute("uv", this.uv);
    this.geometry.setDrawRange(0, 0);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  update(time: number, x: number, z: number, sideX: number, sideZ: number, beam: number, speed: number) {
    while (this.samples.length && time - this.samples[0].born >= LIFE) this.samples.shift();
    if (time - (this.samples.at(-1)?.born ?? -Infinity) >= STEP && speed > 3) {
      if (this.samples.length >= SAMPLES - 1) this.samples.shift();
      this.samples.push({ x, z, sideX, sideZ, born: time });
    }

    const tip = { x, z, sideX, sideZ, born: time };
    const count = this.samples.length + 1;
    for (let i = 0; i < count; i++) {
      const point = this.samples[i] ?? tip, age = (time - point.born) / LIFE;
      const spread = beam * 0.9 + age * 3.5;
      for (const side of [-1, 1]) {
        const j = i * 2 + (side + 1) / 2;
        const px = point.x + spread * point.sideX * side, pz = point.z + spread * point.sideZ * side;
        this.position.setXYZ(j, px, SEA_LEVEL + swell(px, pz, time) + 0.075, pz);
        this.uv.setXY(j, (side + 1) / 2, age);
      }
    }
    this.position.needsUpdate = this.uv.needsUpdate = true;
    this.geometry.setDrawRange(0, (count - 1) * 6);
    this.material.uniforms.clock.value = time;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
