// Whatever thin thing still stands right on the line from the follow camera to the player (a lamp post, a sign's pole,
// the edge of an awning: too thin for the camera to come in for, occlusion.ts) is drawn see-through there: a fine
// dither in a narrow tube round that line, between just after the camera and just before the player. Every surface of
// the town learns it once (its materials' shaders); `CUT.r` 0 turns it off (indoors, in a conversation): then they
// draw exactly as before.
import * as THREE from "three";

/** The tube: from `a` (the camera) to `b` (the player's chest), `r` m round (0: off). Shared by every material. */
export const CUT = { a: { value: new THREE.Vector3() }, b: { value: new THREE.Vector3() }, r: { value: 0 } };

const done = new WeakSet<THREE.Material>();

/** Teaches the see-through tube to the materials of every plain mesh under `root` (not the instanced props, which fade
 *  whole, fade.ts; not the people). */
export function withCutout(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (o as THREE.InstancedMesh).isInstancedMesh || (o as THREE.SkinnedMesh).isSkinnedMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) patch(mat);
  });
}

function patch(m: THREE.Material) {
  if (!m || done.has(m) || (m as THREE.ShaderMaterial).isShaderMaterial) return;
  done.add(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    if (!sh.vertexShader.includes("#include <project_vertex>") || !sh.fragmentShader.includes("void main() {")) return;
    sh.uniforms.uCutA = CUT.a;
    sh.uniforms.uCutB = CUT.b;
    sh.uniforms.uCutR = CUT.r;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvCutW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutW;\nuniform vec3 uCutA;\nuniform vec3 uCutB;\nuniform float uCutR;")
      .replace("void main() {", `void main() {
	if (uCutR > 0.0) {
		vec3 ab = uCutB - uCutA;
		float t = clamp(dot(vCutW - uCutA, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
		if (t > 0.03 && t < 0.9 && length(vCutW - (uCutA + ab * t)) < uCutR && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < 0.8) discard;
	}`);
  };
  const own = Object.prototype.hasOwnProperty.call(m, "customProgramCacheKey") ? m.customProgramCacheKey.bind(m) : null;
  const before = own ? own() : prev.toString();
  m.customProgramCacheKey = () => before + "|cut";
}
