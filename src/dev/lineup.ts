// Dev-only character lineup (open /lineup.html in `npm run dev`; it is not part of the build): every look
// side by side under the town's light, for checking faces, bodies and accessories at a glance.
//   ?view=face   close-up of the head (inspection, larger than in the game)
//   ?view=talk   the conversation camera outdoors (about 6 m away, from 3.2 m up), at the game's pixel size
//   ?view=walk   the follow camera while walking (10 m behind, pitch 0.42), at the game's pixel size
//   ?view=room   the fixed camera indoors (about 12 m away, pitch 0.78), at the game's pixel size
//   ?ids=mia,ben,…  which people (NPC ids, the player's looks f1…m3, or "walkers" for passers-by); default all NPCs
//   ?yaw=30      turn them (degrees; 0 = facing the camera)   ?anim=idle|talk|blink|walk|wave|sit   ?t=1.3 (pose time)
//   ?cols=10 &cell=150 (cell width in px) &screenH=800 (game viewport height the pixel size is matched to)
import * as THREE from "three";
import { NPCS, type Look } from "../content/npcs";
import { LOOKS } from "../ui/Title";
import { createCharacter } from "../game/characters";
import { walkerLook } from "../game/ambient";
import { rand } from "../game/world/util";

const q = new URLSearchParams(location.search);
const view = q.get("view") ?? "face";
const yaw = THREE.MathUtils.degToRad(+(q.get("yaw") ?? 0));
const anim = q.get("anim") ?? "idle";
const poseT = +(q.get("t") ?? 0.6);
const cols = +(q.get("cols") ?? 10);
const cellW = +(q.get("cell") ?? 150);
const cellH = Math.round(cellW * (view === "face" ? 1.15 : 1.6));
const screenH = +(q.get("screenH") ?? 800);

const people: { name: string; look: Look }[] = [];
for (const id of (q.get("ids") ?? Object.keys(NPCS).join(",")).split(",")) {
  if (NPCS[id]) people.push({ name: NPCS[id].name, look: NPCS[id].look });
  else if (id === "player") for (const l of LOOKS) people.push({ name: l.id, look: l.look });
  else if (LOOKS.some((l) => l.id === id)) people.push({ name: id, look: LOOKS.find((l) => l.id === id)!.look });
  else if (id.startsWith("walkers")) {
    // the same random stream as the town's passers-by (Ambient), so the first seven are the town's own
    const n = +(id.slice(7) || 12), r = rand(4242);
    for (let i = 0; i < n; i++) people.push({ name: `walker ${i}`, look: walkerLook(i % 2 === 0, r) });
  }
}

const rows = Math.ceil(people.length / cols);
const W = cols * cellW, H = rows * cellH;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setScissorTest(true);
const grid = document.getElementById("grid")!;
grid.style.width = W + "px";
grid.appendChild(renderer.domElement);

// the town's light (Game.setupLights): sky/ground hemisphere and a warm sun from the front left
const scene = new THREE.Scene();
scene.background = new THREE.Color("#cfdde6");
scene.add(new THREE.HemisphereLight("#e4f3ff", "#8fbf6a", 1.6));
const sun = new THREE.DirectionalLight("#fff1dc", 2.5);
sun.position.set(-40, 70, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 200 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: "#e9e4da" }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const cam = new THREE.PerspectiveCamera(50, cellW / cellH, 0.05, 200);
/** The camera for one person (standing at the origin, facing +Z turned by `yaw`). */
function place(height: number) {
  // in-game views: the vertical field of view narrowed so a cell shows people at the game's pixel size
  const gameFov = (fovGame: number) => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fovGame / 2)) * cellH / screenH));
  if (view === "face") {
    cam.fov = 21;
    const y = height - 0.24;
    cam.position.set(0, y + 0.05, 2.1);
    cam.lookAt(0, y - 0.03, 0);
  } else if (view === "talk") {
    cam.fov = gameFov(50);
    cam.position.set(0, 3.2, 6);
    cam.lookAt(0, 1.35, 0);
    cam.fov = gameFov(50);
    // keep the person centred in the narrow cell (in the game they sit somewhere in a wide picture)
    cam.lookAt(0, height * 0.55, 0);
  } else if (view === "walk") {
    cam.fov = gameFov(50);
    const pitch = 0.42, d = 10;
    cam.position.set(0, 1.3 + Math.sin(pitch) * d, Math.cos(pitch) * d);
    cam.lookAt(0, height * 0.55, 0);
  } else {
    cam.fov = gameFov(50);
    const pitch = 0.78, d = 12;
    cam.position.set(0, 1.2 + Math.sin(pitch) * d, Math.cos(pitch) * d);
    cam.lookAt(0, height * 0.55, 0);
  }
  cam.updateProjectionMatrix();
}

renderer.setClearColor("#cfdde6");
renderer.clear();
people.forEach((p, i) => {
  const ch = createCharacter(p.look);
  ch.root.rotation.y = yaw;
  if (anim === "walk" || anim === "wave" || anim === "sit") ch.setAnim(anim);
  if (anim === "talk") ch.talk(30);
  // pose at a fixed time: update() advances the character's own clock, which starts at a random value
  const c = ch as unknown as { t: number; blinkT: number };
  c.t = 0;
  c.blinkT = anim === "blink" ? 0.087 : 99;
  ch.update(poseT);
  if (anim === "blink") { c.blinkT = 0.087; ch.update(0.001); }
  scene.add(ch.root);
  const col = i % cols, row = Math.floor(i / cols);
  const x = col * cellW, y = H - (row + 1) * cellH;
  renderer.setViewport(x, y, cellW, cellH);
  renderer.setScissor(x, y, cellW, cellH);
  place(ch.height);
  renderer.render(scene, cam);
  scene.remove(ch.root);
  ch.dispose?.();
  const lbl = document.createElement("div");
  lbl.className = "lbl";
  Object.assign(lbl.style, { left: x + "px", top: row * cellH + cellH - 16 + "px", width: cellW + "px" });
  lbl.textContent = p.name;
  grid.appendChild(lbl);
});
(window as unknown as { lineupReady: boolean }).lineupReady = true;
