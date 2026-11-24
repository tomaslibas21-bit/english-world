// Shared by the full audit and the fixed browser contract. Playwright serializes
// measureTalk, so every browser-side dependency must be local or passed as data.
const PORTRAIT_PHONE_FACE_PERCENT = [6, 32];
const LANDSCAPE_DESKTOP_FACE_PERCENT = [8, 38];
const VIEW_MARGIN = 4;
const OCCLUSION_FRACTION = 0.97;
const SETTLE_MS = 4000;

export const SIZES = [
  { label: "390x844", width: 390, height: 844 },
  { label: "390x664", width: 390, height: 664 },
  { label: "844x390", width: 844, height: 390 },
  { label: "1280x800", width: 1280, height: 800 },
];
export const CHECKS = ["view", "ui", "geo", "size"];

export function measurementConfig({ width, height }) {
  return {
    margin: VIEW_MARGIN, fraction: OCCLUSION_FRACTION, settleMs: SETTLE_MS,
    band: width < 768 && height > width ? PORTRAIT_PHONE_FACE_PERCENT : LANDSCAPE_DESKTOP_FACE_PERCENT,
  };
}

export async function measureTalk({ margin, fraction, settleMs, band }) {
  const { game, store } = window.__ew ?? {};
  const state = () => store?.getState().conv;
  const cam = game?.rig?.cam;
  const canvas = game?.renderer?.domElement ?? document.querySelector(".stage canvas");
  let settled = null;
  const na = (reason) => ({ status: "n/a", reason });
  const result = (pass, reason) => ({ status: pass ? "PASS" : "FAIL", reason });
  const unavailable = (reason, speaker = null) => ({
    speaker, speakerId: state()?.npcId || null, settled, face: null,
    checks: { view: { ...na(reason), settled }, ui: na(reason), geo: na(reason), size: na(reason) },
  });
  const skip = (conv) => {
    if (conv?.mode === "video") return "video call";
    if (conv?.mode === "phone") return "phone call";
    if (["light", "picture"].includes(conv?.mode)) return "picture-only";
    if (conv?.mode === "narration") return "narration";
    if (game?.talkTree) return "the speaking tree has no character head";
    return null;
  };
  const skipped = skip(state());
  if (skipped) return { skipped };
  if (!cam?.position?.clone) return unavailable("talk camera hook unavailable", state()?.npcId ?? null);

  // Ten consecutive changes in camera position. Check the whole window against its first frame.
  let trackedSpeaker, trackedLook;
  const samples = [];
  const still = () => {
    const speaker = state()?.npcId;
    const look = game.rig.talk?.look;
    if (speaker !== trackedSpeaker || look !== trackedLook) samples.length = 0;
    trackedSpeaker = speaker;
    trackedLook = look;
    samples.push(cam.position.clone());
    if (samples.length > 11) samples.shift();
    return samples.length === 11 && samples.every((p) => p.distanceToSquared(samples[0]) < 0.001 ** 2);
  };
  if (typeof window.__step === "function") {
    const deadline = Date.now() + settleMs;
    const stepLimit = Math.floor(settleMs * 60 / 1000);
    settled = still();
    for (let i = 0; !settled && i < stepLimit && Date.now() < deadline; i++) {
      window.__step(1);
      settled = still();
      // Let browser timers, observers and paint run between batches, while
      // retaining every position sample in the ten-step settling window.
      if (!settled && (i + 1) % 12 === 0 && i + 1 < stepLimit) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } else {
    settled = await new Promise((resolve) => {
      let frame;
      const timer = setTimeout(() => { cancelAnimationFrame(frame); resolve(false); }, settleMs);
      const tick = () => {
        if (still()) {
          clearTimeout(timer);
          resolve(true);
        } else frame = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  const conv = state();
  if (!conv?.active) return unavailable("conversation closed before measurement");
  const speakerId = conv.npcId;
  if (game.rig.mode !== "talk") return unavailable("conversation opened without a 3D talk view", speakerId);
  const actor = game.talkCast?.find((n) => n.id === speakerId);
  if (!actor) return unavailable(`speaker ${speakerId || "(missing ID)"} is absent from the live talk cast`, speakerId);
  const speaker = actor.tag?.querySelector("b")?.textContent.trim() || actor.name || speakerId;
  const ch = actor.ch;
  const root = ch?.root;
  const headOf = (character) => character?.head ?? character?.bones?.[2] ?? character?.root?.getObjectByName?.("head");
  const head = headOf(ch);
  if (!root || !head?.matrixWorld) return unavailable("speaker head node or bone unavailable", speaker);
  // Character.head is the joint of a single baked SkinnedMesh. Only vertices bound
  // primarily to this joint or its children belong to the head. The mane is body-bound.
  const within = (object, ancestor) => {
    if (!ancestor) return false;
    for (let node = object; node; node = node.parent) if (node === ancestor) return true;
    return false;
  };
  for (let node = root; node; node = node.parent) {
    if (node.visible) continue;
    const row = unavailable("speaker mesh is hidden", speaker);
    row.checks.view = { ...result(false, "speaker mesh is hidden"), settled };
    return row;
  }
  const rootWorld = game.scene ?? root;
  rootWorld.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const local = head.matrixWorld.clone().invert();
  const point = cam.position.clone();
  const localMin = point.clone().set(Infinity, Infinity, Infinity);
  const localMax = point.clone().set(-Infinity, -Infinity, -Infinity);
  const worldMin = localMin.clone();
  const worldMax = localMax.clone();
  const crown = point.clone();
  const chin = point.clone();
  const vertices = [];
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh || typeof mesh.getVertexPosition !== "function" || !mesh.geometry?.attributes.position) return;
    const { position, skinIndex } = mesh.geometry.attributes;
    const bones = mesh.skeleton?.bones;
    const headBones = bones?.map((bone) => within(bone, head));
    if (mesh.isSkinnedMesh ? !skinIndex || !headBones?.some(Boolean) : !within(mesh, head)) return;
    for (let i = 0; i < position.count; i++) {
      if (mesh.isSkinnedMesh && !headBones[skinIndex.getX(i)]) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      if (point.y > worldMax.y) crown.copy(point);
      if (point.y < worldMin.y) chin.copy(point);
      worldMin.min(point);
      worldMax.max(point);
      vertices.push(point.clone());
      point.applyMatrix4(local);
      localMin.min(point);
      localMax.max(point);
    }
  });
  if (!vertices.length || !(worldMax.y > worldMin.y)) return unavailable("posed head geometry unavailable", speaker);
  if (!canvas) return unavailable("renderer canvas unavailable", speaker);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return unavailable("renderer canvas has no screen area", speaker);

  // The crown and chin are the extremes of the world box. Use the visible profile
  // of its middle for the cheeks and the model's +Z front for the interior landmarks.
  const span = localMax.clone().sub(localMin);
  const middle = localMin.clone().lerp(localMax, 0.5);
  const front = (x, y) => {
    const depth = Math.sqrt(Math.max(0, 1 - (2 * x) ** 2 - (2 * y - 1) ** 2));
    return point.set(middle.x + x * span.x, localMin.y + y * span.y, middle.z + depth * span.z / 2)
      .clone().applyMatrix4(head.matrixWorld);
  };
  const cheeks = [front(-0.5, 0.42), front(0.5, 0.42)];
  let left = Infinity, right = -Infinity;
  for (const vertex of vertices) {
    const height = (point.copy(vertex).applyMatrix4(local).y - localMin.y) / span.y;
    if (height < 0.32 || height > 0.52) continue;
    const x = point.copy(vertex).project(cam).x;
    if (x < left) { left = x; cheeks[0] = vertex; }
    if (x > right) { right = x; cheeks[1] = vertex; }
  }
  const points = [
    ["centre", front(0, 0.5)],
    ["top of head", crown],
    ["chin", chin],
    ["left cheek", cheeks[0]],
    ["right cheek", cheeks[1]],
    ["left eye", front(-0.23, 0.57)],
    ["right eye", front(0.23, 0.57)],
    ["forehead", front(0, 0.76)],
    ["mouth", front(0, 0.31)],
  ].map(([name, world]) => {
    const ndc = point.copy(world).project(cam);
    return { name, world, z: ndc.z, x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2 };
  });
  const [width, height] = [innerWidth, innerHeight];
  const projectable = (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.z >= -1 && p.z <= 1;
  const sides = [];
  if (points.some((p) => !projectable(p))) sides.push("outside camera depth");
  const cuts = points.filter(projectable);
  if (cuts.some((p) => p.y < margin)) sides.push("cut at top");
  if (cuts.some((p) => p.y > height - margin)) sides.push("cut at bottom");
  if (cuts.some((p) => p.x < margin)) sides.push("cut at left");
  if (cuts.some((p) => p.x > width - margin)) sides.push("cut at right");
  const view = { ...result(!sides.length, sides.join(", ") || "all nine points inside the viewport margin"), settled };

  const round = (n) => Math.round(n * 10) / 10;
  let face = null;
  let size = na("top or chin is outside camera depth");
  if (points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) {
    const x = points.map((p) => p.x), y = points.map((p) => p.y);
    face = { x: round(Math.min(...x)), y: round(Math.min(...y)), w: round(Math.max(...x) - Math.min(...x)), h: round(Math.max(...y) - Math.min(...y)) };
  }
  if (projectable(points[1]) && projectable(points[2])) {
    const pixels = Math.abs(points[1].y - points[2].y);
    const percent = pixels / height * 100;
    const passes = percent >= band[0] && percent <= band[1];
    size = {
      ...result(passes, `${round(percent)}% of viewport height${passes ? "" : ` (expected ${band[0]}–${band[1]}%)`}`),
      pixels: round(pixels), percent: round(percent),
    };
  }

  const colorPaints = (color) => color && color !== "transparent" && color !== "none"
    && !/^(?:rgba\([^)]*,\s*0(?:\.0+)?\s*\)|[^/]+\/\s*0(?:\.0+)?%?\s*\))$/.test(color);
  const contains = (r, x, y) => r.left <= x && x < r.right && r.top <= y && y < r.bottom;
  const painted = (el, { x, y }) => {
    const s = getComputedStyle(el);
    if (s.visibility !== "visible") return false;
    for (let p = el; p; p = p.parentElement) {
      const style = getComputedStyle(p);
      if (+style.opacity === 0 || /opacity\(0(?:%|\.0+)?\)/.test(style.filter)) return false;
    }
    if (colorPaints(s.backgroundColor) || s.backgroundImage !== "none") return true;
    if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) return true;
    if (el.matches("canvas, video, svg image")) return true;
    if (el instanceof SVGGeometryElement && (
      (colorPaints(s.fill) && +s.fillOpacity > 0) || (colorPaints(s.stroke) && +s.strokeOpacity > 0)
    )) return true;
    const r = el.getBoundingClientRect();
    const borderDistances = { Top: y - r.top, Right: r.right - x, Bottom: r.bottom - y, Left: x - r.left };
    for (const [side, distance] of Object.entries(borderDistances)) {
      if (distance >= 0 && distance < parseFloat(s[`border${side}Width`]) && colorPaints(s[`border${side}Color`])
          && !["none", "hidden"].includes(s[`border${side}Style`])) return true;
    }
    if (!colorPaints(s.color)) return false;
    for (const child of el.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE) continue;
      for (const match of child.textContent.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(child, match.index);
        range.setEnd(child, match.index + match[0].length);
        if (Array.from(range.getClientRects()).some((r) => contains(r, x, y))) return true;
      }
    }
    return false;
  };
  const elementName = (el) => {
    if (el.matches(".convo")) return "panel (.convo)";
    if (el instanceof SVGElement) el = el.closest("button, [role='img'], .ui-icon") ?? el;
    const label = el.getAttribute("data-testid") || el.getAttribute("aria-label");
    if (label) return label;
    const kind = el.classList[0] ? `.${el.classList[0]}` : el.getAttribute("role") || el.tagName.toLowerCase();
    return el.closest(".convo") ? `panel (${kind})` : kind;
  };
  let ui = na("no projected face points over the viewport canvas");
  // HUD labels and toasts may be painted with pointer-events:none. Include them in
  // the hit test for this synchronous probe, then restore ordinary event handling.
  const hitStyle = document.createElement("style");
  hitStyle.textContent = "* { pointer-events: auto !important; }";
  document.head.append(hitStyle);
  try {
    for (const p of points.filter(projectable)) {
      if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue;
      const stack = document.elementsFromPoint(p.x, p.y);
      const canvasIndex = stack.indexOf(canvas);
      if (canvasIndex < 0) continue;
      const cover = stack.slice(0, canvasIndex).find((el) => !el.contains(canvas) && painted(el, p));
      if (cover) {
        ui = result(false, `${elementName(cover)} covers ${p.name}`);
        break;
      }
      ui = result(true, "no painted UI at the on-screen face points");
    }
  } finally {
    hitStyle.remove();
  }

  let geo = na("scene or raycaster hook unavailable");
  if (game.scene?.traverseVisible && game.raycaster?.intersectObjects) {
    const candidates = [];
    const ray = new game.raycaster.constructor();
    ray.camera = cam;
    ray.layers.mask = cam.layers.mask;
    const materialPaints = (material) => material && material.visible && material.opacity > 0;
    game.scene.traverseVisible((mesh) => {
      if (mesh.isMesh && ray.layers.test(mesh.layers) && !within(mesh, root)
          && (Array.isArray(mesh.material) ? mesh.material.some(materialPaints) : materialPaints(mesh.material))) candidates.push(mesh);
    });
    const blockerName = ({ object, face: triangle }) => {
      if (within(object, game.player?.root)) {
        const head = headOf(game.player);
        const bones = object.skeleton?.bones, indices = object.geometry?.attributes.skinIndex;
        if (head && (within(object, head) || (triangle && bones && indices
            && [triangle.a, triangle.b, triangle.c].some((i) => within(bones[indices.getX(i)], head))))) return "learner head";
        return "learner mesh";
      }
      for (let node = object; node && node !== game.scene; node = node.parent) {
        const name = node.name || [node.userData?.name, node.userData?.label, node.userData?.id, node.userData?.kind]
          .find((info) => typeof info === "string" && info.length);
        if (name) return name;
      }
      const npc = game.npcs?.find((n) => within(object, n.ch.root));
      return npc?.tag?.querySelector("b")?.textContent.trim() || npc?.id
        || `${object.geometry?.type ?? object.type} mesh #${candidates.indexOf(object) + 1}`;
    };
    const origin = cam.getWorldPosition(cam.position.clone());
    const direction = origin.clone();
    geo = result(true, "all nine rays clear");
    for (const p of points) {
      const distance = direction.subVectors(p.world, origin).length();
      if (!distance) continue;
      ray.set(origin, direction.divideScalar(distance));
      ray.far = distance * fraction;
      const hit = ray.intersectObjects(candidates, false).find((hit) => hit.distance < ray.far
        && materialPaints(Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex] : hit.object.material));
      if (hit) {
        geo = result(false, `${blockerName(hit)} blocks ${p.name}`);
        break;
      }
    }
  }
  return { face, speaker, speakerId, settled, checks: { view, ui, geo, size } };
}
