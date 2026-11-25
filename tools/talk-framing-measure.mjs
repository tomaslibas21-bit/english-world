#!/usr/bin/env node
// Playwright serializes measureTalk. Its browser-side dependencies are local or passed as data.
export const SIZES = [
  { label: "390x844", width: 390, height: 844 },
  { label: "390x664", width: 390, height: 664 },
  { label: "844x390", width: 844, height: 390 },
  { label: "1280x800", width: 1280, height: 800 },
];
export const CHECKS = ["view", "ui", "geo", "size"];

export function measurementConfig({ width, height }) {
  return { margin: 4, fraction: 0.97, settleMs: 4000, band: width < 768 && height > width ? [6, 32] : [8, 38] };
}

export async function measureTalk({ margin, fraction, settleMs, band, snapshot = false }) {
  const { game, store } = window.__ew ?? {};
  const state = () => store?.getState().conv;
  const rig = game?.rig;
  const cam = rig?.cam;
  const canvas = game?.renderer?.domElement;
  const settle = { status: snapshot ? "snapshot" : "unavailable", steps: 0, samples: 0, spanMm: null, wallMs: null };
  let settled = null;
  const vector = (v) => v?.toArray() ?? null;
  const pixels = (r) => r ? [r.x, r.y, r.width, r.height] : null;
  const result = (pass, reason, detail) => ({ status: pass ? "PASS" : "FAIL", reason, ...detail });
  const na = (reason) => ({ status: "n/a", reason });
  const telemetry = () => {
    const conv = state();
    const { calls, frame } = game?.renderer?.info?.render ?? {};
    return {
      position: cam ? vector(cam.getWorldPosition(cam.position.clone())) : null,
      rotation: cam ? vector(cam.getWorldQuaternion(cam.quaternion.clone())) : null,
      look: vector(rig?.presentedLook ?? rig?.curLook), target: vector(rig?.talk?.look),
      fov: cam?.fov ?? null, near: cam?.near ?? null, far: cam?.far ?? null,
      offset: cam?.view?.enabled ? [cam.view.offsetX, cam.view.offsetY] : null,
      panel: pixels(document.querySelector(".convo")?.getBoundingClientRect()),
      canvas: pixels(canvas?.getBoundingClientRect()), viewport: [innerWidth, innerHeight],
      headForward: null, headRotation: null, headAngle: null, landmarks: null,
      quality: store?.getState().settings?.quality ?? null, calls: calls ?? null, frame: frame ?? null,
      zone: game?.zone?.id ?? null, mode: rig?.mode ?? null, hostId: conv?.active ? conv.hostId : null,
    };
  };
  const lineOf = (conv) => conv?.speaking == null ? null
    : conv.transcript.find((line) => line.id === conv.speaking && line.who === "npc" && line.npc === conv.npcId);
  const identity = (conv) => [conv?.active ?? false, conv?.sitId ?? null, conv?.hostId ?? null, conv?.npcId ?? null,
    conv?.run ?? null, conv?.speaking ?? null, rig?.mode ?? null];
  const unavailable = (reason, speaker = null, kind = "unavailable") => ({
    kind, reason, speaker, speakerId: state()?.active ? state().npcId : null, settled, settle, face: null,
    line: lineOf(state())?.id ?? null, lineKey: state()?.lineKey ?? null, shot: telemetry(),
    checks: { view: { ...na(reason), settled }, ui: na(reason), geo: na(reason), size: na(reason) },
  });
  const within = (object, ancestor) => {
    if (!ancestor) return false;
    for (let node = object; node; node = node.parent) if (node === ancestor) return true;
    return false;
  };
  const headOf = (character) => {
    // Character keeps its original head joint. StyledCharacter uses builders.ts BONE.head.
    const head = character?.head ?? character?.bones?.[2] ?? character?.root?.getObjectByName("head");
    return head?.isObject3D && within(head, character?.root) ? head : null;
  };
  const actorFor = (id) => game?.talkCast?.find((member) => member.id === id && game.npcs?.includes(member));
  const initial = state();
  if (!cam?.isPerspectiveCamera) return unavailable("live talk camera unavailable");
  if (!initial?.active) return unavailable("conversation closed before measurement");
  if (rig.mode !== "talk") return unavailable("conversation opened without a 3D talk view");
  if (!actorFor(initial.npcId)) return unavailable(`speaker ${initial.npcId || "(missing ID)"} is absent from the live talk cast`);
  // Snapshot callers can sample the mounted view before speech starts.
  if (!snapshot && !lineOf(initial)) return unavailable("no held NPC transcript line");

  const initialIdentity = identity(initial);
  const sameLine = () => identity(state()).every((item, i) => item === initialIdentity[i]) && !!lineOf(state());
  const finiteVector = (p) => p?.toArray().every(Number.isFinite);
  // Ten changes between eleven rendered positions. Test the diameter of the
  // whole window and restart it on a change of speaker or look target.
  if (!snapshot) {
    const started = Date.now(), end = started + settleMs;
    const samples = [];
    let lastTarget, lastSpeaker;
    let invalidPose = false;
    const readSample = () => {
      const speaker = state()?.npcId;
      const look = rig.talk?.look;
      if (!look || !sameLine()) {
        samples.length = 0;
        settle.samples = 0;
        settle.spanMm = null;
        return false;
      }
      const position = cam.getWorldPosition(cam.position.clone());
      if (!finiteVector(position) || !finiteVector(look)) {
        invalidPose = true;
        return false;
      }
      if (speaker !== lastSpeaker || !lastTarget?.equals(look)) samples.length = 0;
      lastSpeaker = speaker;
      lastTarget = look.clone();
      samples.push(position);
      if (samples.length > 11) samples.shift();
      let spanSquared = 0;
      for (let i = 0; i < samples.length; i++) {
        for (let j = 0; j < i; j++) spanSquared = Math.max(spanSquared, samples[i].distanceToSquared(samples[j]));
      }
      settle.samples = samples.length;
      settle.spanMm = Math.sqrt(spanSquared) * 1000;
      return samples.length === 11 && spanSquared <= 0.001 ** 2;
    };
    const step = window.__step;
    if (typeof step === "function") {
      settled = readSample();
      const limit = Math.floor(settleMs * 60 / 1000);
      while (!settled && !invalidPose && sameLine() && settle.steps < limit && Date.now() < end) {
        step(1);
        settle.steps++;
        settled = readSample() && Date.now() <= end;
        // Allow layout, paint and timers between batches of real game frames.
        if (!settled && settle.steps % 12 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } else {
      settled = await new Promise((resolve) => {
        let frame;
        const timer = setTimeout(() => { cancelAnimationFrame(frame); resolve(false); }, settleMs);
        const tick = () => {
          settle.steps++;
          const stable = readSample() && Date.now() <= end;
          if (stable || invalidPose || !sameLine() || Date.now() >= end) {
            clearTimeout(timer);
            resolve(stable);
          } else frame = requestAnimationFrame(tick);
        };
        readSample();
        frame = requestAnimationFrame(tick);
      });
    }
    settle.wallMs = Date.now() - started;
    settle.status = settled ? "settled" : "limit";
    if (invalidPose || !sameLine()) {
      settled = null;
      settle.status = "unavailable";
      if (invalidPose) return unavailable("non-finite camera position or look target", null, "non-finite");
      return unavailable(state()?.active ? "held NPC line changed before measurement" : "conversation closed before measurement");
    }
  }

  const conv = state();
  const speakerId = conv.npcId;
  const actor = actorFor(speakerId);
  if (!actor) return unavailable(`speaker ${speakerId} left the live talk cast`);
  const speaker = actor.tag?.querySelector("b")?.textContent.trim() || actor.name || speakerId;
  const root = actor.ch?.root;
  const head = headOf(actor.ch);
  if (!root || !within(root, game.scene) || !head) return unavailable("speaker head joint is unavailable", speaker);
  if (!canvas?.isConnected) return unavailable("live renderer canvas unavailable", speaker);
  for (let node = root; node; node = node.parent) {
    if (node.visible) continue;
    const row = unavailable("speaker mesh is hidden", speaker);
    row.checks.view = { ...result(false, row.reason), settled };
    return row;
  }

  game.scene.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const rect = canvas.getBoundingClientRect();
  const [width, height] = [innerWidth, innerHeight];
  if (!rect.width || !rect.height || !height) return unavailable("renderer canvas or viewport has no screen area", speaker);
  const matrix = head.matrixWorld;
  if (!matrix.elements.every(Number.isFinite) || !cam.projectionMatrix.elements.every(Number.isFinite)) {
    return unavailable("non-finite head or camera matrix", speaker, "non-finite");
  }
  if (matrix.determinant() === 0) return unavailable("speaker head joint has no invertible pose", speaker);
  const local = matrix.clone().invert();
  const point = cam.position.clone();
  const localMin = point.clone().set(Infinity, Infinity, Infinity);
  const localMax = point.clone().set(-Infinity, -Infinity, -Infinity);
  const crown = localMax.clone();
  const chin = localMin.clone();
  const vertices = [];
  let invalidVertex = false;
  const materialPaints = (material) => material?.visible && material.opacity > 0 && material.colorWrite !== false;
  const paintsMesh = (mesh) => Array.isArray(mesh.material) ? mesh.material.some(materialPaints) : materialPaints(mesh.material);
  const onJoint = (mesh, i, boneMask) => {
    const { skinIndex, skinWeight } = mesh.geometry.attributes;
    const weights = [skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i)];
    const slot = weights.indexOf(Math.max(...weights));
    return weights[slot] > 0 && boneMask[skinIndex.getComponent(i, slot)];
  };
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh || !cam.layers.test(mesh.layers) || !paintsMesh(mesh) || !mesh.geometry?.attributes.position) return;
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    const bones = mesh.skeleton?.bones;
    const mask = bones?.map((bone) => within(bone, head));
    if (mesh.isSkinnedMesh ? !skinIndex || !skinWeight || !bones?.includes(head) : !within(mesh, head)) return;
    for (let i = 0; i < position.count; i++) {
      if (mesh.isSkinnedMesh && !onJoint(mesh, i, mask)) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      if (!finiteVector(point)) { invalidVertex = true; break; }
      if (point.y > crown.y) crown.copy(point);
      if (point.y < chin.y) chin.copy(point);
      vertices.push(point.clone());
      point.applyMatrix4(local);
      localMin.min(point);
      localMax.max(point);
    }
  });
  if (invalidVertex) return unavailable("non-finite posed head vertex", speaker, "non-finite");
  if (!vertices.length || !(crown.y > chin.y)) return unavailable("posed head geometry unavailable", speaker);

  const span = localMax.clone().sub(localMin);
  if (!(span.x > 0 && span.y > 0 && span.z > 0)) return unavailable("posed head geometry has no volume", speaker);
  const middle = localMin.clone().lerp(localMax, 0.5);
  // Crown and chin are the posed mesh extremes. The interior features follow
  // the head's +Z face and the cheeks follow its projected middle profile.
  const front = (x, y) => {
    const depth = Math.sqrt(Math.max(0, 1 - (2 * x) ** 2 - (2 * y - 1) ** 2));
    return point.set(middle.x + x * span.x, localMin.y + y * span.y, middle.z + depth * span.z / 2)
      .clone().applyMatrix4(matrix);
  };
  const cheeks = [front(-0.5, 0.42), front(0.5, 0.42)];
  let left = Infinity, right = -Infinity;
  for (const vertex of vertices) {
    const y = (point.copy(vertex).applyMatrix4(local).y - localMin.y) / span.y;
    if (y < 0.32 || y > 0.52) continue;
    const x = point.copy(vertex).project(cam).x;
    if (x < left) { left = x; cheeks[0] = vertex; }
    if (x > right) { right = x; cheeks[1] = vertex; }
  }
  const points = [
    ["centre", front(0, 0.5)], ["top of head", crown], ["chin", chin], ["left cheek", cheeks[0]],
    ["right cheek", cheeks[1]], ["left eye", front(-0.23, 0.57)], ["right eye", front(0.23, 0.57)],
    ["forehead", front(0, 0.76)], ["mouth", front(0, 0.31)],
  ].map(([name, world]) => {
    const depth = -point.copy(world).applyMatrix4(cam.matrixWorldInverse).z;
    const ndc = point.copy(world).project(cam);
    return { name, world, depth, z: ndc.z, x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2 };
  });
  const round = (n) => Math.round(n * 10) / 10;
  const inDepth = (p) => p.depth > 0 && p.z >= -1 && p.z <= 1;
  const shot = telemetry();
  const headCentre = middle.clone().applyMatrix4(matrix);
  const headForward = point.clone().set(0, 0, 1).transformDirection(matrix);
  const cameraToHead = cam.getWorldPosition(point).sub(headCentre);
  const angle = cameraToHead.angleTo(headForward) * 180 / Math.PI;
  shot.headForward = vector(headForward);
  shot.headRotation = vector(head.getWorldQuaternion(cam.quaternion.clone()));
  shot.headAngle = cameraToHead.lengthSq() > 0 && Number.isFinite(angle) ? round(angle) : null;
  shot.landmarks = Object.fromEntries(points.map(({ name, x, y }) =>
    [name, [Number.isFinite(x) ? round(x) : null, Number.isFinite(y) ? round(y) : null]]));
  if (points.some((p) => ![p.x, p.y, p.z, p.depth].every(Number.isFinite))) {
    return { ...unavailable("non-finite projected head landmark", speaker, "non-finite"), shot };
  }
  const opening = game.talkLayout?.picture;
  const landmarks = points.map(({ name, x, y, z, depth, world }) => ({
    name, x: round(x), y: round(y), z, depth, world: vector(world), inDepth: inDepth({ z, depth }),
    inOpening: opening ? x >= rect.left + opening.x0 && x <= rect.left + opening.x1
      && y >= rect.top + opening.y0 && y <= rect.top + opening.y1 : null,
  }));
  const cuts = [];
  const safe = {
    left: Math.max(0, rect.left) + margin, right: Math.min(width, rect.right) - margin,
    top: Math.max(0, rect.top) + margin, bottom: Math.min(height, rect.bottom) - margin,
  };
  if (points.some((p) => !inDepth(p))) cuts.push("outside camera depth");
  const visiblePoints = points.filter(inDepth);
  if (visiblePoints.some((p) => p.y < safe.top)) cuts.push("cut at top");
  if (visiblePoints.some((p) => p.y > safe.bottom)) cuts.push("cut at bottom");
  if (visiblePoints.some((p) => p.x < safe.left)) cuts.push("cut at left");
  if (visiblePoints.some((p) => p.x > safe.right)) cuts.push("cut at right");
  const view = result(!cuts.length, cuts.join(", ") || "all nine points inside the viewport margin", { settled });

  const x = points.map((p) => p.x), y = points.map((p) => p.y);
  const face = { x: round(Math.min(...x)), y: round(Math.min(...y)), w: round(Math.max(...x) - Math.min(...x)), h: round(Math.max(...y) - Math.min(...y)) };
  let size = na("crown or chin is outside camera depth");
  if (inDepth(points[1]) && inDepth(points[2])) {
    const heightPx = Math.abs(points[1].y - points[2].y);
    const percent = heightPx / height * 100;
    const pass = percent >= band[0] && percent <= band[1];
    size = result(pass, `${round(percent)}% of viewport height${pass ? "" : ` (expected ${band[0]}–${band[1]}%)`}`,
      { pixels: round(heightPx), percent: round(percent) });
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
    if (colorPaints(s.backgroundColor) || s.backgroundImage !== "none" || (s.backdropFilter && s.backdropFilter !== "none")) return true;
    if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth > 0;
    if (el.matches("canvas, video, svg image")) return true;
    if (el instanceof SVGGeometryElement) {
      const transform = el.getScreenCTM();
      if (!transform) return false;
      const svgPoint = new DOMPoint(x, y).matrixTransform(transform.inverse());
      return (colorPaints(s.fill) && +s.fillOpacity > 0 && el.isPointInFill(svgPoint))
        || (colorPaints(s.stroke) && +s.strokeOpacity > 0 && el.isPointInStroke(svgPoint));
    }
    const r = el.getBoundingClientRect();
    const distances = { Top: y - r.top, Right: r.right - x, Bottom: r.bottom - y, Left: x - r.left };
    for (const [side, distance] of Object.entries(distances)) {
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
        if ([...range.getClientRects()].some((r) => contains(r, x, y))) return true;
      }
    }
    return false;
  };
  const elementName = (el) => {
    if (el.matches(".view-chip img")) return "preview image (.view-chip img)";
    if (el.matches(".convo")) return "panel (.convo)";
    if (el instanceof SVGElement) el = el.closest("button, [role='img'], .ui-icon") ?? el;
    const label = el.getAttribute("data-testid") || el.getAttribute("aria-label");
    const kind = label || (el.classList[0] ? `.${el.classList[0]}` : el.getAttribute("role") || el.tagName.toLowerCase());
    return el.closest(".convo") ? `panel (${kind})` : kind;
  };
  const covers = [];
  let overCanvas = 0;
  // Use the browser's paint order and clipping while including pointer-transparent HUD elements.
  const hitStyle = document.createElement("style");
  hitStyle.textContent = "* { pointer-events: auto !important; }";
  document.head.append(hitStyle);
  try {
    for (const p of visiblePoints) {
      if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue;
      const stack = document.elementsFromPoint(p.x, p.y);
      const canvasIndex = stack.indexOf(canvas);
      if (canvasIndex < 0) continue;
      overCanvas++;
      const cover = stack.slice(0, canvasIndex).find((el) => !el.contains(canvas) && painted(el, p));
      if (cover) covers.push(`${elementName(cover)} covers ${p.name}`);
    }
  } finally {
    hitStyle.remove();
  }
  const ui = overCanvas ? result(covers.length === 0, covers[0] ?? "no painted UI at the on-screen face points", { covers })
    : na("no projected face points over the viewport canvas");

  let geo = na("scene raycaster unavailable");
  if (game.raycaster?.intersectObjects) {
    const ray = new game.raycaster.constructor();
    ray.camera = cam;
    ray.layers.mask = cam.layers.mask;
    const candidates = [];
    game.scene.traverseVisible((mesh) => {
      if (mesh.isMesh && ray.layers.test(mesh.layers) && !within(mesh, root) && paintsMesh(mesh)) candidates.push(mesh);
    });
    const blockerName = ({ object, face: triangle }) => {
      if (within(object, game.player?.root)) {
        const playerHead = headOf(game.player);
        const bones = object.skeleton?.bones, indices = object.geometry?.attributes.skinIndex;
        const joints = triangle && bones && indices ? [triangle.a, triangle.b, triangle.c].map((i) => bones[indices.getX(i)]) : [];
        if (within(object, playerHead) || joints.some((joint) => within(joint, playerHead))) return "learner head";
        if (joints.some((joint) => within(joint, game.player.backpack))) return "learner backpack";
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
    const blockers = [];
    let rays = 0;
    for (const p of points) {
      const distance = direction.subVectors(p.world, origin).length();
      if (!(distance > 0) || !Number.isFinite(distance)) continue;
      rays++;
      ray.set(origin, direction.divideScalar(distance));
      ray.far = distance * fraction;
      const hit = ray.intersectObjects(candidates, false).find((hit) => hit.distance <= ray.far
        && materialPaints(Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex] : hit.object.material));
      if (hit) blockers.push(`${blockerName(hit)} blocks ${p.name}`);
    }
    geo = rays === points.length ? result(blockers.length === 0, blockers[0] ?? "all nine rays clear", { blockers })
      : na("a landmark has no finite ray from the live camera");
  }
  return {
    kind: snapshot ? "snapshot" : "measured", face, speaker, speakerId, sitId: conv.sitId, run: conv.run,
    line: lineOf(conv)?.id ?? null, lineKey: conv.lineKey,
    settled, settle, checks: { view, ui, geo, size }, shot, landmarks,
  };
}
