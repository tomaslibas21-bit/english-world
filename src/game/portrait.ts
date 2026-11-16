// A person's portrait, drawn once from their own 3D figure: head and shoulders, turned a little, looking at the
// learner. For the picture-less places of the game that have no 3D town to show them in: the light mode's screen
// behind a conversation that has no illustrated scene (LightHome.tsx CallBackdrop; before, an initial in a circle).
// Loaded only when such a conversation starts (it brings three.js with it); one small frame, then the renderer is let
// go. Null where it cannot be drawn (no WebGL): the caller keeps what it showed before.
import * as THREE from "three";
import { createCharacter } from "./characters";
import { NPCS } from "../content/npcs";

const made = new Map<string, string | null>();

export function portrait(npcId: string, px = 360): string | null {
  if (made.has(npcId)) return made.get(npcId)!;
  let url: string | null = null;
  const def = NPCS[npcId];
  if (def) {
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(px, px, false);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // the town's light (Game.setupLights), the sun from the front left
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight("#e4f3ff", "#c9b99a", 1.7));
      const sun = new THREE.DirectionalLight("#fff1dc", 2.3);
      sun.position.set(-3, 5, 6);
      scene.add(sun);
      const ch = createCharacter({ ...def.look, female: def.look.female ?? def.gender === "f" });
      ch.root.rotation.y = -0.32;
      scene.add(ch.root);
      // head and shoulders: from a hand above the hair or the hat down to the chest
      const cam = new THREE.PerspectiveCamera(22, 1, 0.05, 50);
      ch.setAnim("idle");
      ch.attentive = true;
      ch.steady = true;
      // (the head is a ball of 0.27 m at 1.52 of their scale, whatever their height (Character.ts): the frame is a
      // square a third bigger than it with its hair or hat, so a round frame cuts nothing off: a small alux under a
      // broad hat as well as a tall man; set a little low, for the neck and the shoulders)
      const scale = ch.height / 1.75, box = boxOf(ch), under = 1.52 * scale - 0.27, over = Math.max(box.top, 1.52 * scale + 0.27);
      const hat = (def.look.acc ?? []).some((a) => /hat|jipi|sombrero|cap/i.test(a));
      const span = Math.max(over - under, hat ? Math.min(box.wide, 0.5) * 1.62 : 0.6) * 1.32;
      const mid = (over + under) / 2 - span * 0.08;
      cam.position.set(0, mid + span * 0.1, span / 2 / Math.tan(THREE.MathUtils.degToRad(11)));
      cam.lookAt(0, mid, 0);
      ch.watch = cam.position.clone();
      for (let i = 0; i < 12; i++) ch.update(1 / 30);
      renderer.render(scene, cam);
      url = renderer.domElement.toDataURL("image/png");
      ch.dispose?.();
    } catch {
      url = null;
    } finally {
      try { renderer?.dispose(); renderer?.forceContextLoss(); } catch { /* nothing to let go */ }
    }
  }
  made.set(npcId, url);
  return url;
}

const v = new THREE.Vector3();
/** The top of their head above their feet (hair and hats included, as Game.ts headTop), and how far to either side
 *  the figure goes (its arms, or a hat's brim). */
function boxOf(ch: { root: THREE.Object3D; height: number }): { top: number; wide: number } {
  let top = -Infinity, wide = 0;
  ch.root.updateMatrixWorld(true);
  ch.root.traverse((o) => {
    const g = (o as THREE.Mesh).isMesh && o.visible ? (o as THREE.Mesh).geometry : null;
    if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox;
    if (!b || b.max.y - b.min.y < 0.05) return;
    for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
      v.set(x, b.max.y, z).applyMatrix4(o.matrixWorld);
      top = Math.max(top, v.y); wide = Math.max(wide, Math.hypot(v.x, v.z) * 0.72);
    }
  });
  return Number.isFinite(top) ? { top, wide } : { top: ch.height * 1.04, wide: 0.3 };
}
