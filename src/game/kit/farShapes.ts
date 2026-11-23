import * as THREE from "three";

// Things on a far horizon (islands, ships, a coast): flat vertex colours that fade into the sky's haze with distance,
// well beyond the scene's own fog. Merge them into one geometry and they are one draw call.

const vertex = /* glsl */ `
attribute vec3 color;
varying vec3 vColor;
varying float vFar;
varying float vShade;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 eye = viewMatrix * world;
  vColor = color;
  vFar = length(eye.xyz);
  vShade = dot(normalize(mat3(modelMatrix) * normal), vec3(-0.42, 0.72, 0.55)) * 0.5 + 0.5;
  gl_Position = projectionMatrix * eye;
}`;

const fragment = /* glsl */ `
uniform vec3 haze, tint;
uniform vec2 range;
uniform float veil, show;
varying vec3 vColor;
varying float vFar;
varying float vShade;
void main() {
  vec3 c = vColor * (0.62 + 0.5 * vShade) * tint;
  gl_FragColor = vec4(mix(c, haze, max(smoothstep(range.x, range.y, vFar) * veil, 1.0 - show)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** `near`–`far`: where the haze starts and where it is thickest; `veil`: how much of a shape the thickest haze hides. */
export function farMaterial(near: number, far: number, veil = 0.9) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, fog: false,
    uniforms: { haze: { value: new THREE.Color() }, tint: { value: new THREE.Color("#ffffff") }, range: { value: new THREE.Vector2(near, far) }, veil: { value: veil }, show: { value: 1 } },
  });
}

/** The haze the shapes fade into and the colour of the day's light. */
export function lightFar(material: THREE.ShaderMaterial, haze: THREE.Color, light: THREE.Color) {
  material.uniforms.haze.value.copy(haze);
  const peak = Math.max(light.r, light.g, light.b, 1e-3);
  material.uniforms.tint.value.copy(light).multiplyScalar(1 / peak);
}
