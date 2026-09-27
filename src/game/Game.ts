// The game: renderer, zones (town + interiors), player, NPCs, input, guidance and conversations.
import * as THREE from "three";
import { buildTown, type Town, type Door } from "./world/town";
import { getInterior, type Interior } from "./world/interiors";
import { OUTDOOR_NPCS, AIRPORT_EXIT, WORLD, BUILDINGS, ROADS, DROPOFF } from "./world/layout";
import { createCharacter, type GameCharacter } from "./characters";
import { styleRenderer, createStyleFx, type StyleFx } from "./styleScene";
import { CameraRig } from "./camera";
import { Guidance } from "./guidance";
import { NavGrid } from "./nav";
import { Session } from "./session";
import { Ambient } from "./ambient";
import { AMBIENT_LINES, AMBIENT_VOICES } from "../content/ambient";
import { audio } from "./audio";
import { NPCS, type Look } from "../content/npcs";
import { LOCATIONS } from "../content/locations";
import { SITUATIONS, SITUATION_BY_ID } from "../content/situations";
import type { SituationDef } from "../content/types";
import { useStore } from "../state/store";
import { sceneFor } from "../ui/scenes";
import { sitProgress } from "../state/progress";
import { textTexture } from "./world/util";
import { givenItem } from "./given";
import type { GameApi } from "./gameRef";
export type { GameApi } from "./gameRef";

interface NpcActor { id: string; ch: GameCharacter; home: THREE.Vector3; rot: number; tag: HTMLDivElement; sit?: boolean; waved: boolean; approach?: THREE.Vector3 }
interface ZoneState { id: string; group: THREE.Group; colliders: import("./world/util").Colliders; nav: NavGrid; interior?: Interior }

const WALK = 4.4, RUN = 7.4;

const isCall = (s: SituationDef) => s.mode === "phone" || s.mode === "video" || s.location === "phone";
/** A point `d` metres in front of someone facing `rot` (0 = +Z), turned towards them. */
function inFrontOf(x: number, z: number, rot: number, d: number) {
  return { x: x + Math.sin(rot) * d, z: z + Math.cos(rot) * d, rot: rot + Math.PI };
}

export class Game implements GameApi {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  rig: CameraRig;
  town!: Town;
  zone!: ZoneState;
  private zones = new Map<string, ZoneState>();
  player!: GameCharacter;
  private npcs: NpcActor[] = [];
  private npcLayer: THREE.Group = new THREE.Group();
  private guidance = new Guidance();
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private sky!: THREE.Mesh;
  /** Trial world styles (Settings → "Pasaulio stilius"); null for the original "blocks" look. */
  private fx: StyleFx | null = null;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private vel = new THREE.Vector3();
  private heading = Math.PI;
  private autoPath: [number, number][] | null = null;
  private autoTarget: { kind: "npc" | "door" | "exit" | "point"; id?: string } | null = null;
  private clock = new THREE.Clock();
  private t = 0;
  private hudT = 0;
  private pathT = 0;
  private session: Session | null = null;
  private talkNpc: NpcActor | null = null;
  private tagLayer: HTMLDivElement;
  private nearest: { kind: "npc" | "door" | "exit"; id: string; label: string } | null = null;
  private pushDoorT = 0;
  private transitioning = false;
  private npcToSits = new Map<string, SituationDef[]>();
  private secondary = new Map<string, SituationDef>();
  private mapPanel: THREE.Mesh | null = null;
  private pointer = { down: false, id: -1, x: 0, y: 0, moved: 0, button: 0 };
  private raycaster = new THREE.Raycaster();
  private disposed = false;
  private ambient!: Ambient;
  onReady?: () => void;

  constructor(private container: HTMLElement, tagLayer: HTMLDivElement) {
    this.tagLayer = tagLayer;
    const q = useStore.getState().settings.quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: q === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 1.75 : 1));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = q === "high";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.rig = new CameraRig(container.clientWidth / container.clientHeight);
    styleRenderer(this.renderer, this.rig.cam, q);
    for (const s of SITUATIONS) {
      const ids = s.npc === "sam" || s.npc === "emma" ? ["sam", "emma"] : [s.npc];
      for (const id of ids) {
        const list = this.npcToSits.get(id) ?? [];
        list.push(s);
        this.npcToSits.set(id, list);
      }
      // secondary speakers (Marco the server, Harold the guard, Mark at the party…) point to the main NPC
      for (const id of s.npcs ?? []) if (id !== "sam" && id !== "emma" && !this.secondary.has(id)) this.secondary.set(id, s);
    }
  }

  async init() {
    const st = useStore.getState();
    st.setScreen("loading");
    this.setupLights();
    this.town = buildTown();
    const nav = new NavGrid(WORLD.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, this.town.colliders);
    // pedestrians prefer sidewalks: roads cost more, crosswalks are cheap
    for (const r of ROADS) {
      const h = r.z1 === r.z2;
      if (h) nav.setCost(r.x1, r.z1 - r.w / 2, r.x2, r.z1 + r.w / 2, 5);
      else nav.setCost(r.x1 - r.w / 2, r.z1, r.x1 + r.w / 2, r.z2, 5);
    }
    const vs = ROADS.filter((r) => r.x1 === r.x2), hs = ROADS.filter((r) => r.z1 === r.z2);
    for (const v of vs) for (const h of hs) {
      nav.setCost(v.x1 - v.w / 2, h.z1 - h.w / 2 - 1.8, v.x1 + v.w / 2, h.z1 - h.w / 2 + 0.2, 1.2);
      nav.setCost(v.x1 - v.w / 2, h.z1 + h.w / 2 - 0.2, v.x1 + v.w / 2, h.z1 + h.w / 2 + 1.8, 1.2);
      nav.setCost(v.x1 - v.w / 2 - 1.8, h.z1 - h.w / 2, v.x1 - v.w / 2 + 0.2, h.z1 + h.w / 2, 1.2);
      nav.setCost(v.x1 + v.w / 2 - 0.2, h.z1 - h.w / 2, v.x1 + v.w / 2 + 1.8, h.z1 + h.w / 2, 1.2);
    }
    for (const cx of [-50, 22, 100]) nav.setCost(cx - 1.5, -13, cx + 1.5, -3, 1.2);
    this.zones.set("town", { id: "town", group: this.town.group, colliders: this.town.colliders, nav });
    // passers-by walk between shop doors, the square, the beach and the bus stop
    const places: [number, number][] = this.town.doors.filter((d) => d.loc !== "airport").map((d) => [d.outX, d.outZ]);
    places.push([22, -20], [40, -46], [16, -36], [-12, -62], [30, -63], [-30, -61], [96, -30], [-6, 46], [62, 44], [-42, 44], [118, 2]);
    this.ambient = new Ambient(nav, places, st.settings.quality);
    this.scene.add(this.npcLayer, this.guidance.group, this.ambient.group);
    // camera never goes inside buildings
    const boxes = BUILDINGS.map((b) => ({ x0: b.x - b.w / 2 - 0.4, x1: b.x + b.w / 2 + 0.4, z0: b.z - b.d / 2 - 0.4, z1: b.z + b.d / 2 + 0.4, h: b.h + (b.roof === "gable" ? Math.min(b.w, b.d) * 0.32 : 0) + 0.8 }));
    boxes.push({ x0: 125.5, x1: 134.5, z0: -18.5, z1: 2.5, h: 6.2 }); // terminal canopy
    this.rig.occluder = (from, to) => {
      if (this.zone?.interior) return 1;
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t, z = from.z + (to.z - from.z) * t;
        for (const b of boxes) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h) return (i - 1) / steps;
      }
      return 1;
    };
    const prof = st.progress.profile!;
    this.player = createCharacter(prof.look);
    this.scene.add(this.player.root);
    await audio.init();
    audio.volume = st.settings.volume;
    // start where the player left off, or in the airport on the very first visit
    const place = st.progress.place;
    if (place && (place.zone === "town" || getInterior(place.zone))) this.enterZone(place.zone, { x: place.x, z: place.z, rot: place.rot }, true);
    else this.enterZone("airport", { x: -14, z: -1, rot: Math.PI }, true);
    this.bindInput();
    window.addEventListener("resize", this.onResize);
    this.renderer.setAnimationLoop(this.loop);
    this.refreshObjective();
    this.onReady?.();
  }

  private setupLights() {
    this.hemi = new THREE.HemisphereLight("#e4f3ff", "#8fbf6a", 1.6);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff1dc", 2.5);
    this.sun.position.set(-40, 70, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 42;
    Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 200 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    // sky dome
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color("#5fb0e8") }, mid: { value: new THREE.Color("#a9d8f5") }, bottom: { value: new THREE.Color("#fdf0d8") } },
      vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP - cameraPosition).y; vec3 c = h > 0.15 ? mix(mid, top, smoothstep(0.15, 0.7, h)) : mix(bottom, mid, smoothstep(-0.05, 0.15, h)); gl_FragColor = vec4(c,1.); }",
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), skyMat);
    this.scene.add(this.sky);
    this.fx = createStyleFx({ renderer: this.renderer, scene: this.scene, hemi: this.hemi, sun: this.sun, sky: this.sky, cam: this.rig.cam });
  }

  // ------------------------------------------------------------------ zones

  private getZone(id: string): ZoneState | null {
    if (this.zones.has(id)) return this.zones.get(id)!;
    const it = getInterior(id);
    if (!it) return null;
    const nav = new NavGrid(-it.w / 2 - 1, -it.d / 2 - 1, it.w / 2 + 1, it.d / 2 + 3, 0.5, it.colliders, 0.35);
    const z: ZoneState = { id, group: it.group, colliders: it.colliders, nav, interior: it };
    if (id === "visitor-center" && it.group.userData.mapSpot) {
      const m = it.group.userData.mapSpot;
      const tex = new THREE.CanvasTexture(this.town.groundCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.mapPanel = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      this.mapPanel.position.set(m.x, m.y, m.z);
      it.group.add(this.mapPanel);
    }
    this.zones.set(id, z);
    return z;
  }

  enterZone(id: string, spawn?: { x: number; z: number; rot: number }, instant = false) {
    const z = this.getZone(id);
    if (!z) return;
    const doIt = () => {
      if (this.zone) this.scene.remove(this.zone.group);
      this.zone = z;
      this.scene.add(z.group);
      const indoor = !!z.interior;
      const sp = spawn ?? (z.interior ? z.interior.spawn : { x: 0, z: 0, rot: 0 });
      this.player.root.position.set(sp.x, 0, sp.z);
      this.heading = sp.rot;
      this.player.root.rotation.y = sp.rot;
      this.vel.set(0, 0, 0);
      this.autoPath = null; this.autoTarget = null;
      this.nearest = null;
      this.spawnNpcs();
      // lighting & atmosphere
      this.sky.visible = !indoor;
      this.ambient.group.visible = !indoor;
      this.scene.fog = indoor ? null : new THREE.Fog("#cfe8f5", 110, 420);
      this.scene.background = indoor ? new THREE.Color(z.interior?.warm ? "#2b2320" : "#23282e") : null;
      this.hemi.intensity = indoor ? 1.9 : 1.6;
      this.sun.intensity = indoor ? 1.6 : 2.5;
      this.fx?.zone(indoor, !!z.interior?.warm);
      this.rig.mode = indoor ? "interior" : "follow";
      if (indoor) this.rig.interiorBounds = { w: z.interior!.w, d: z.interior!.d };
      else this.rig.yaw = this.heading;
      this.rig.target.copy(this.player.root.position);
      this.rig.snap();
      const st = useStore.getState();
      const loc = LOCATIONS[id];
      const name = id === "town" ? "Maple Harbor" : loc?.name ?? id;
      st.setHud({ zoneName: name, zoneBanner: { title: name, sub: id === "town" ? "Maple Harbor" : loc?.lt }, prompt: null });
      setTimeout(() => { if (useStore.getState().hud.zoneBanner?.title === name) useStore.getState().setHud({ zoneBanner: null }); }, 2600);
      this.refreshObjective();
      this.savePlace();
    };
    if (instant) { doIt(); return; }
    this.fadeThen(doIt);
  }

  private fadeThen(fn: () => void) {
    if (this.transitioning) return;
    this.transitioning = true;
    const st = useStore.getState();
    st.setHud({ fade: 1 });
    audio.sfx("door");
    setTimeout(() => {
      fn();
      setTimeout(() => { useStore.getState().setHud({ fade: 0 }); this.transitioning = false; }, 120);
    }, 320);
  }

  private chosenDatePartner() {
    const p = useStore.getState().progress.profile;
    return p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma");
  }

  private spawnNpcs() {
    for (const n of this.npcs) { n.ch.dispose?.(); this.npcLayer.remove(n.ch.root); n.tag.remove(); }
    this.npcs = [];
    const spots = this.zone.interior ? this.zone.interior.npcs : OUTDOOR_NPCS;
    const partner = this.chosenDatePartner();
    for (const sp of spots) {
      if ((sp.npc === "sam" || sp.npc === "emma") && sp.npc !== partner) continue;
      const def = NPCS[sp.npc];
      if (!def) continue;
      const ch = createCharacter(def.look);
      ch.root.position.set(sp.x, 0, sp.z);
      ch.root.rotation.y = sp.rot;
      if (sp.sit) ch.setAnim("sit");
      this.npcLayer.add(ch.root);
      const tag = document.createElement("div");
      tag.className = "nametag";
      tag.innerHTML = `<b>${def.name}</b><span>${def.role.en}</span>`;
      this.tagLayer.appendChild(tag);
      const ap = sp as { ax?: number; az?: number };
      this.npcs.push({ id: sp.npc, ch, home: new THREE.Vector3(sp.x, 0, sp.z), rot: sp.rot, tag, sit: sp.sit, waved: false, approach: ap.ax !== undefined && ap.az !== undefined ? new THREE.Vector3(ap.ax, 0, ap.az) : undefined });
      this.zone.colliders.circles = this.zone.colliders.circles.filter((c) => !(c as any).npc || (c as any).npc !== sp.npc);
      const c = { x: sp.x, z: sp.z, r: 0.45, npc: sp.npc } as any;
      this.zone.colliders.circles.push(c);
    }
  }

  // ------------------------------------------------------------------ input

  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    const el = this.renderer.domElement;
    // one pointer at a time: while the first finger is down, a second one neither drags nor clicks
    el.addEventListener("pointerdown", (e) => {
      if (this.pointer.down && e.pointerId !== this.pointer.id && el.hasPointerCapture(this.pointer.id)) return;
      this.pointer = { down: true, id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, button: e.button };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!this.pointer.down || e.pointerId !== this.pointer.id) return;
      const dx = e.clientX - this.pointer.x, dy = e.clientY - this.pointer.y;
      this.pointer.moved += Math.abs(dx) + Math.abs(dy);
      this.pointer.x = e.clientX; this.pointer.y = e.clientY;
      if (this.pointer.moved > 6 && this.rig.mode === "follow") this.rig.drag(dx, dy);
    });
    el.addEventListener("pointerup", (e) => {
      if (e.pointerId !== this.pointer.id) return;
      const wasClick = this.pointer.down && this.pointer.moved < 8;
      this.pointer.down = false;
      if (wasClick && e.button === 0) this.onClick(e.clientX, e.clientY);
    });
    // an iOS edge gesture, a lost capture…: the touch is over (no click), and the camera may follow again
    const release = (e: PointerEvent) => { if (e.pointerId === this.pointer.id) this.pointer.down = false; };
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    el.addEventListener("wheel", (e) => { if (this.rig.mode === "follow") this.rig.zoom(e.deltaY); }, { passive: true });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private typingInField(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.typingInField(e)) return;
    const st = useStore.getState();
    const k = e.key.toLowerCase();
    if (st.conv.active) return; // the conversation panel handles its own keys
    if (st.hud.panel) { if (k === "escape") st.setHud({ panel: null }); return; }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(k)) {
      this.keys.add(k); this.autoPath = null; this.autoTarget = null; e.preventDefault(); return;
    }
    if (k === "e" || k === "enter" || k === " ") { this.interact(); e.preventDefault(); return; }
    if (k === "m") st.setHud({ panel: "map" });
    if (k === "j") st.setHud({ panel: "journal" });
    if (k === "p") st.setHud({ panel: "phone" });
    if (k === "g") this.autoWalkToObjective();
    if (k === "escape") st.setHud({ panel: "settings" });
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  private onBlur = () => { this.keys.clear(); };

  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; if (x || y) { this.autoPath = null; this.autoTarget = null; } }

  private onClick(cx: number, cy: number) {
    const st = useStore.getState();
    if (st.conv.active || st.hud.panel) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.rig.cam);
    // a passer-by?
    if (!this.zone.interior) {
      const wh = this.raycaster.intersectObjects(this.ambient.walkerRoots, true);
      const w = wh.length ? this.ambient.walkerFor(wh[0].object) : null;
      if (w && wh[0].distance < 40) {
        const p = this.player.root.position;
        const { female } = this.ambient.greet(w, p.x, p.z);
        const line = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)];
        audio.play(female ? AMBIENT_VOICES.f : AMBIENT_VOICES.m, 1, line.en, { male: !female });
        st.toast({ kind: "info", title: `„${line.en}“`, body: line.lt });
        return;
      }
    }
    // NPC hit?
    const hits = this.raycaster.intersectObjects(this.npcs.map((n) => n.ch.root), true);
    if (hits.length) {
      const actor = this.npcs.find((n) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === n.ch.root) return true; o = o.parent; } return false; });
      if (actor) { const t = actor.approach ?? actor.home; this.walkTo(t.x, t.z, { kind: "npc", id: actor.id }); return; }
    }
    // ground
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, p)) return;
    // door near the click?
    if (!this.zone.interior) {
      const d = this.town.doors.find((dd) => Math.hypot(dd.outX - p.x, dd.outZ - p.z) < 3.5 || Math.hypot(dd.x - p.x, dd.z - p.z) < 3);
      if (d) { this.walkTo(d.outX, d.outZ, { kind: "door", id: d.loc }); return; }
    } else if (Math.hypot(p.x - this.zone.interior.exit.x, p.z - this.zone.interior.exit.z) < 1.8) {
      this.walkTo(this.zone.interior.exit.x, this.zone.interior.exit.z - 0.6, { kind: "exit" }); return;
    }
    this.walkTo(p.x, p.z, { kind: "point" });
    this.clickMarker(p.x, p.z);
  }

  private clickMarker(x: number, z: number) {
    const mat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, depthWrite: false });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 20).rotateX(-Math.PI / 2), mat);
    m.position.set(x, 0.05, z);
    this.scene.add(m);
    const t0 = performance.now();
    const tick = () => {
      const k = (performance.now() - t0) / 600;
      m.scale.setScalar(1 + k * 1.5);
      mat.opacity = 0.9 * (1 - k);
      if (k < 1) requestAnimationFrame(tick); else { this.scene.remove(m); m.geometry.dispose(); mat.dispose(); }
    };
    tick();
  }

  walkTo(x: number, z: number, target: Game["autoTarget"]) {
    const p = this.player.root.position;
    const path = this.zone.nav.path(p.x, p.z, x, z);
    if (!path) { useStore.getState().toast({ kind: "info", title: "Ten nueiti negalima" }); return; }
    this.autoPath = path.slice(1);
    this.autoTarget = target;
  }

  autoWalkToObjective() {
    const tgt = this.objectiveTarget();
    if (!tgt) { useStore.getState().toast({ kind: "info", title: "Ši užduotis atliekama telefonu", body: "Atidaryk telefoną (P) ir paskambink." }); return; }
    const actor = tgt.kind === "npc" ? this.npcs.find((n) => n.id === tgt.id) : undefined;
    const to = actor?.approach ?? { x: tgt.x, z: tgt.z };
    this.walkTo(to.x, to.z, tgt.kind === "npc" ? { kind: "npc", id: tgt.id } : tgt.kind === "door" ? { kind: "door", id: tgt.id } : { kind: "exit" });
  }

  // ------------------------------------------------------------------ interaction

  interact() {
    const n = this.nearest;
    if (!n) return;
    if (n.kind === "npc") this.talkTo(n.id);
    else if (n.kind === "door") this.enterDoor(n.id);
    else if (n.kind === "exit") this.exitInterior();
  }

  private enterDoor(loc: string) {
    const it = getInterior(loc);
    if (!it) return;
    this.enterZone(loc);
  }

  exitInterior() {
    if (!this.zone.interior) return;
    const loc = this.zone.id;
    const door = this.town.doors.find((d) => d.loc === loc);
    if (loc === "airport") { this.enterZone("town", AIRPORT_EXIT); return; }
    if (door) this.enterZone("town", { x: door.outX, z: door.outZ, rot: door.rot });
    else this.enterZone("town");
  }

  sitsForNpc(npc: string): SituationDef[] { return this.npcToSits.get(npc) ?? []; }

  /** Which situation to start with this NPC face to face: the objective, else the first not yet completed, else
   *  the first. Calls never start this way (Kate calls you on video, and also leads the team meeting in the office). */
  pickSituation(npc: string): SituationDef | null {
    const list = this.sitsForNpc(npc).filter((s) => !isCall(s));
    if (!list.length) return null;
    const pr = useStore.getState().progress;
    const obj = list.find((s) => s.id === pr.objective);
    if (obj) return obj;
    return list.find((s) => !sitProgress(pr, s.id).completions) ?? list[0];
  }

  talkTo(npc: string, sitId?: string) {
    if (this.session?.active) return;
    const sit = sitId ? SITUATION_BY_ID[sitId] : this.pickSituation(npc);
    if (!sit) {
      const def = NPCS[npc];
      const main = this.secondary.get(npc);
      const mainNpc = main ? NPCS[main.npc] : null;
      if (def) { const a = this.npcs.find((n) => n.id === npc); a?.ch.setAnim("wave"); setTimeout(() => { if (a?.ch.anim === "wave") a.ch.setAnim(a.sit ? "sit" : "idle"); }, 1400); }
      useStore.getState().toast({ kind: "info", title: def ? `${def.name}: „Hi there!“` : "Hi!",
        body: mainNpc ? `Pirmiausia pasikalbėk su ${mainNpc.name} – ${def?.name ?? "šis žmogus"} prisijungs prie pokalbio.` : "Šis žmogus kol kas tik pasisveikina." });
      return;
    }
    const actor = this.npcs.find((n) => n.id === npc) ?? null;
    this.startSession(sit, actor);
  }

  /** Situation picker: go straight into a conversation (no walking). The player appears in front of
   *  the NPC in the right place; phone and video calls start at once. */
  startScenario(sitId: string) {
    const sit = SITUATION_BY_ID[sitId];
    if (!sit) return;
    const st = useStore.getState();
    st.setHud({ panel: null });
    this.lastScenario = sitId;
    const go = () => {
      if (isCall(sit)) { this.call(sitId); return; }
      const npc = sit.npc === "sam" || sit.npc === "emma" ? this.chosenDatePartner() : sit.npc;
      const loc = LOCATIONS[sit.location];
      let spawn: { x: number; z: number; rot: number } | null = null;
      let zone = "town";
      if (loc?.kind === "interior" && getInterior(sit.location)) {
        zone = sit.location;
        const it = this.getZone(zone)?.interior;
        const sp = it?.npcs.find((n) => n.npc === npc);
        if (sp) spawn = sp.ax !== undefined && sp.az !== undefined ? { x: sp.ax, z: sp.az, rot: Math.atan2(sp.x - sp.ax, sp.z - sp.az) } : inFrontOf(sp.x, sp.z, sp.rot, sp.sit ? 1.9 : 2.3);
      } else {
        const o = OUTDOOR_NPCS.find((n) => n.npc === npc);
        if (o) spawn = o.ax !== undefined && o.az !== undefined ? { x: o.ax, z: o.az, rot: Math.atan2(o.x - o.ax, o.z - o.az) } : inFrontOf(o.x, o.z, o.rot, 2.2);
      }
      this.enterZone(zone, spawn ?? undefined, true);
      // let the NPCs spawn, then talk
      setTimeout(() => this.talkTo(npc, sitId), 150);
    };
    // "Dar kartą" / "Kita situacija" after a taxi, bus or plane ride was queued: no ride (and no
    // teleport or black fade in the middle of the new conversation). Before close(), which runs endSession.
    this.cancelRide();
    if (this.session?.active) { this.session.close(); setTimeout(go, 250); } else go();
  }
  lastScenario: string | null = null;

  /** The same situation again, from the start. */
  restartScenario() {
    const id = this.session?.sit.id ?? this.lastScenario;
    if (id) this.startScenario(id);
  }

  /** The next situation in the recommended order. */
  nextScenarioId(after?: string): string | null {
    const list = this.orderedSituations();
    const i = list.findIndex((s) => s.id === (after ?? this.lastScenario));
    return list[(i + 1) % list.length]?.id ?? null;
  }

  /** Phone and video calls from the phone UI. */
  call(sitId: string) {
    if (this.session?.active) return;
    const sit = SITUATION_BY_ID[sitId];
    if (!sit) return;
    useStore.getState().setHud({ panel: null });
    this.startSession(sit, null);
  }

  private startSession(sit: SituationDef, actor: NpcActor | null) {
    this.cancelRide();
    this.autoPath = null; this.autoTarget = null; this.keys.clear(); this.joy = { x: 0, y: 0 };
    this.talkNpc = actor;
    const st = useStore.getState();
    st.setHud({ prompt: null, panel: null });
    if (actor) {
      // face each other and frame both characters
      const p = this.player.root.position, a = actor.ch.root.position;
      const dir = new THREE.Vector3(a.x - p.x, 0, a.z - p.z);
      if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
      dir.normalize();
      this.heading = Math.atan2(dir.x, dir.z);
      this.player.root.rotation.y = this.heading;
      if (!actor.sit) actor.ch.root.rotation.y = Math.atan2(-dir.x, -dir.z);
      // frame the player, the main NPC and anyone else taking part who stands nearby (Mark at the party, Nora at dinner…)
      const others = (sit.npcs ?? []).map((id) => this.npcs.find((n) => n.id === id)).filter((n): n is NpcActor => !!n && n !== actor && n.ch.root.position.distanceTo(a) < 7);
      const pts = [p, a, ...others.map((n) => n.ch.root.position)];
      const mid = new THREE.Vector3(pts.reduce((t, q) => t + q.x, 0) / pts.length, 0, pts.reduce((t, q) => t + q.z, 0) / pts.length);
      const spread = Math.max(...pts.map((q) => Math.hypot(q.x - mid.x, q.z - mid.z)));
      const dist = Math.max(6, spread * 2.6);
      if (this.zone.interior) {
        this.rig.talk = { pos: new THREE.Vector3(mid.x, 4.2 + dist * 0.07, mid.z + dist + 0.2), look: new THREE.Vector3(mid.x, 1.3, mid.z) };
      } else {
        const side = new THREE.Vector3(dir.z, 0, -dir.x);
        let pos = mid.clone().addScaledVector(side, dist).setY(3.2);
        if (this.town.colliders.blocked(pos.x, pos.z, 0.5)) pos = mid.clone().addScaledVector(side, -dist).setY(3.2);
        pos.addScaledVector(dir, -1.2);
        this.rig.talk = { pos, look: new THREE.Vector3(mid.x, 1.35, mid.z) };
      }
      this.rig.mode = "talk";
      this.player.setAnim("idle");
    }
    const session: Session = new Session(sit.id, {
      npcTalk: (npcId, secs) => {
        const n = this.npcs.find((x) => x.id === npcId);
        if (n) n.ch.talk(secs);
      },
      // ignore events from a conversation already closed (e.g. Esc during the driver's goodbye):
      // its "taxi-ride" would otherwise be queued for the next, unrelated conversation
      onEvent: (name, data) => { if (this.session === session) this.onSessionEvent(name, data); },
      onEnd: (s, completed) => this.endSession(s, completed),
    });
    this.session = session;
    this.session.begin();
  }

  private onSessionEvent(name: string, data: any) {
    if (name === "pay") audio.sfx("coin");
    if (name === "taxi-ride" && data?.to) this.pendingRide = { to: data.to, by: "taxi" };
    if (name === "bus-ride" && data?.to) this.pendingRide = { to: data.to, by: "bus" };
    if (name === "go" && data?.zone) this.pendingRide = { to: data.zone, by: "taxi" };
    if (name === "board") this.pendingRide = { to: "airport", by: "plane" };
    const st = useStore.getState();
    if (name === "give" && data?.item) {
      // known props, else the situation's own item (a jacket, a medicine…) in the accusative
      const it = givenItem(this.session?.sit, data.item);
      st.toast({ kind: "success", title: `${it[0]} Gavai: ${it[1]}`, ms: 2600 });
    }
    if ((name === "mark-map" || name === "mark-location") && data?.to && LOCATIONS[data.to]) {
      st.toast({ kind: "info", title: `📍 Pažymėta žemėlapyje: ${LOCATIONS[data.to].lt}`, body: "Žemėlapis – M.", ms: 4000 });
    }
    if (name === "sign") st.toast({ kind: "success", title: "✍️ Pasirašyta", ms: 2200 });
  }
  private pendingRide: { to: string; by: "taxi" | "bus" | "plane" } | null = null;

  private endSession(sit: SituationDef, completed: boolean) {
    this.session = null;
    useStore.getState().setConv({ active: false });
    this.rig.talk = null;
    this.rig.mode = this.zone.interior ? "interior" : "follow";
    this.rig.cam.clearViewOffset();
    if (this.talkNpc && !this.talkNpc.sit) this.talkNpc.ch.root.rotation.y = this.talkNpc.rot;
    this.talkNpc = null;
    if (this.pendingRide) { const r = this.pendingRide; this.pendingRide = null; this.ride(r.to, r.by); }
    if (completed) this.advanceObjective(sit);
    this.refreshObjective();
  }

  closeConversation() { this.session?.close(); }
  get activeSession() { return this.session; }

  /** Taxi or bus: fade, travel, arrive in front of the destination. After boarding a plane the
   *  trip is over and the player is back outside the airport. */
  ride(to: string, by: "taxi" | "bus" | "plane" = "taxi") {
    const st = useStore.getState();
    const dest = by === "plane" ? AIRPORT_EXIT : this.arrivalPoint(to);
    if (!dest) return;
    const banner = by === "plane" ? { title: "✈️ Gero skrydžio!", sub: "…ir sveiki sugrįžę į Maple Harbor" }
      : { title: by === "bus" ? "🚌 Važiuojame autobusu…" : "🚕 Važiuojame…", sub: LOCATIONS[to]?.name };
    st.setHud({ fade: 1, zoneBanner: banner });
    audio.sfx("car");
    clearTimeout(this.rideTimer);
    this.rideTimer = setTimeout(() => {
      this.rideTimer = undefined;
      // a conversation has started meanwhile: stay put, just lift the fade
      if (this.session?.active) { useStore.getState().setHud({ fade: 0, zoneBanner: null }); return; }
      this.enterZone("town", dest, true);
      useStore.getState().setHud({ zoneBanner: banner });
      setTimeout(() => useStore.getState().setHud({ fade: 0 }), 700);
      setTimeout(() => { if (useStore.getState().hud.zoneBanner?.title === banner.title) useStore.getState().setHud({ zoneBanner: null }); }, 3200);
    }, by === "plane" ? 2600 : 1400);
  }
  private rideTimer: ReturnType<typeof setTimeout> | undefined;
  taxiRide(to: string) { this.ride(to, "taxi"); }

  /** A new conversation is starting: forget a queued ride, and call off one still on its way
   *  (lift its fade and banner; the player stays where the conversation puts them). */
  private cancelRide() {
    this.pendingRide = null;
    if (this.rideTimer === undefined) return;
    clearTimeout(this.rideTimer);
    this.rideTimer = undefined;
    useStore.getState().setHud({ fade: 0, zoneBanner: null });
  }

  /** Where the player appears when arriving at a place by taxi (outside its door, or a drop-off spot). */
  private arrivalPoint(loc: string): { x: number; z: number; rot: number } | null {
    if (loc === "airport") return AIRPORT_EXIT;
    const door = this.town.doors.find((d) => d.loc === loc);
    if (door) {
      const off = 1.5;
      const dx = door.face === "e" ? off : door.face === "w" ? -off : 0, dz = door.face === "s" ? off : door.face === "n" ? -off : 0;
      return { x: door.outX + dx, z: door.outZ + dz, rot: door.rot };
    }
    if (DROPOFF[loc]) return DROPOFF[loc];
    const o = OUTDOOR_NPCS.find((n) => this.sitsForNpc(n.npc).some((s) => s.location === loc));
    return o ? { x: o.ax ?? o.x, z: (o.az ?? o.z) + 2.5, rot: Math.PI } : null;
  }

  teleportTo(loc: string) {
    const dest = this.arrivalPoint(loc);
    if (dest) this.enterZone("town", dest);
  }

  // ------------------------------------------------------------------ objectives

  orderedSituations(): SituationDef[] {
    return [...SITUATIONS].sort((a, b) => a.chapter - b.chapter || a.order - b.order || a.id.localeCompare(b.id));
  }

  setObjective(sitId: string | null) {
    useStore.getState().updateProgress((p) => { p.objective = sitId; });
    this.refreshObjective();
  }

  private advanceObjective(done: SituationDef) {
    const pr = useStore.getState().progress;
    if (pr.objective && pr.objective !== done.id) return;
    const next = this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions);
    this.setObjective(next?.id ?? null);
    // (in the situation picker flow the end-of-conversation buttons offer the next one instead)
    if (next && !this.lastScenario) setTimeout(() => useStore.getState().toast({ kind: "info", title: "Kita užduotis", body: `${next.title.lt} — ${LOCATIONS[next.location]?.lt ?? ""}` }), 2500);
  }

  currentObjective(): SituationDef | null {
    const pr = useStore.getState().progress;
    if (pr.objective && SITUATION_BY_ID[pr.objective]) return SITUATION_BY_ID[pr.objective];
    const first = this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions) ?? null;
    return first;
  }

  /** Where to guide the player right now for the current objective. */
  objectiveTarget(): { kind: "npc" | "door" | "exit"; id?: string; x: number; z: number; label: string } | null {
    const sit = this.currentObjective();
    if (!sit) return null;
    const loc = LOCATIONS[sit.location];
    if (!loc || loc.kind === "phone" || sit.mode === "phone" || sit.mode === "video") return null;
    const npcSpotInterior = (it: Interior) => it.npcs.find((n) => n.npc === sit.npc) ?? it.npcs[0];
    if (loc.kind === "outdoor") {
      if (this.zone.interior) return { kind: "exit", x: this.zone.interior.exit.x, z: this.zone.interior.exit.z - 0.4, label: "Išeiti į lauką" };
      const o = OUTDOOR_NPCS.find((n) => n.npc === sit.npc);
      return o ? { kind: "npc", id: sit.npc, x: o.x, z: o.z, label: NPCS[sit.npc]?.name ?? "" } : null;
    }
    if (this.zone.id === sit.location && this.zone.interior) {
      const s = npcSpotInterior(this.zone.interior);
      const npc = sit.npc === "sam" || sit.npc === "emma" ? this.chosenDatePartner() : sit.npc;
      const spot = this.zone.interior.npcs.find((n) => n.npc === npc) ?? s;
      return { kind: "npc", id: spot.npc, x: spot.x, z: spot.z, label: NPCS[spot.npc]?.name ?? "" };
    }
    if (this.zone.interior) return { kind: "exit", x: this.zone.interior.exit.x, z: this.zone.interior.exit.z - 0.4, label: "Išeiti į lauką" };
    if (sit.location === "airport") return { kind: "door", id: "airport", x: AIRPORT_EXIT.x, z: AIRPORT_EXIT.z, label: loc.name };
    const d = this.town.doors.find((dd) => dd.loc === sit.location);
    return d ? { kind: "door", id: d.loc, x: d.outX, z: d.outZ, label: d.name } : null;
  }

  refreshObjective() {
    const sit = this.currentObjective();
    const st = useStore.getState();
    if (!sit) { st.setHud({ objective: null }); this.guidance.setBeacon(null); this.guidance.setPath(null); return; }
    const loc = LOCATIONS[sit.location];
    const tgt = this.objectiveTarget();
    st.setHud({ objective: { sitId: sit.id, title: sit.title.lt, goal: sit.goal, where: loc?.lt ?? "", dist: null, angle: null, inside: this.zone.id === sit.location } });
    if (tgt) this.guidance.setBeacon(tgt.x, tgt.z, tgt.kind === "npc" ? 2.9 : 3.8);
    else this.guidance.setBeacon(null);
    this.pathT = 0;
  }

  // ------------------------------------------------------------------ loop

  private onResize = () => {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.rig.cam.aspect = w / h;
    this.rig.cam.updateProjectionMatrix();
  };

  private loop = () => {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    const st = useStore.getState();
    const talking = !!this.session?.active;
    const blocked = talking || !!st.hud.panel || this.transitioning;
    this.updatePlayer(dt, blocked);
    this.updateNpcs(dt, talking);
    if (!this.zone.interior) this.ambient.update(dt, this.player.root.position);
    this.town.update(this.t, dt);
    this.guidance.visible = !talking;
    this.guidance.group.visible = !talking;
    this.guidance.update(dt);
    // guidance path (throttled)
    this.pathT -= dt;
    if (this.pathT <= 0 && !talking) {
      this.pathT = 0.5;
      const tgt = this.objectiveTarget();
      const p = this.player.root.position;
      if (tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) > 2.2) this.guidance.setPath(this.zone.nav.path(p.x, p.z, tgt.x, tgt.z));
      else this.guidance.setPath(null);
      if (tgt) this.guidance.setBeacon(tgt.x, tgt.z, tgt.kind === "npc" ? 2.9 : 3.8);
    }
    // camera
    const moving = this.vel.lengthSq() > 0.5;
    const camFwd = new THREE.Vector3(Math.sin(this.rig.yaw), 0, Math.cos(this.rig.yaw));
    const velDir = this.vel.clone().setY(0).normalize();
    const forwardish = velDir.dot(camFwd) > 0.35;
    this.rig.target.lerp(this.player.root.position, Math.min(1, dt * 10));
    this.rig.update(dt, this.heading, moving, forwardish, st.settings.cameraFollow && !this.pointer.down);
    // shift the picture while the conversation panel is open
    if (talking && this.talkNpc) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const wide = w > 900;
      this.rig.applyViewShift(w, h, wide ? Math.min(w * 0.22, 380) : 0, wide ? 0 : h * 0.25);
    }
    // sun follows the player for crisp shadows
    const pp = this.player.root.position;
    this.sun.position.set(pp.x - 40, 70, pp.z + 30);
    this.sun.target.position.set(pp.x, 0, pp.z);
    this.fx?.frame(pp, !!this.zone.interior);
    this.sky.position.copy(this.rig.cam.position);
    // an illustrated scene covers the view during the conversation: save the phone's battery
    const covered = talking && st.settings.scenes !== false && !!sceneFor(st.conv.sitId, st.conv.hostId);
    if (!covered) {
      this.renderer.render(this.scene, this.rig.cam);
      this.updateTags();
    }
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.12; this.updateHud(); }
  };

  private updatePlayer(dt: number, blocked: boolean) {
    const p = this.player.root.position;
    let ix = 0, iz = 0;
    if (!blocked) {
      if (this.keys.has("arrowup") || this.keys.has("w")) iz += 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) iz -= 1;
      if (this.keys.has("arrowleft") || this.keys.has("a")) ix -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) ix += 1;
      if (this.joy.x || this.joy.y) { ix += this.joy.x; iz += this.joy.y; }
    }
    let want = new THREE.Vector3();
    let speed = this.keys.has("shift") || Math.hypot(this.joy.x, this.joy.y) > 0.92 ? RUN : WALK;
    if (ix || iz) {
      // camera-relative movement
      const yaw = this.rig.mode === "follow" ? this.rig.yaw : Math.PI;
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      want.addScaledVector(fwd, iz).addScaledVector(right, ix);
      if (want.lengthSq() > 1) want.normalize();
    } else if (this.autoPath && this.autoPath.length && !blocked) {
      const [tx, tz] = this.autoPath[0];
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d < 0.35) {
        this.autoPath.shift();
        if (!this.autoPath.length) this.arrived();
      } else {
        want.set(tx - p.x, 0, tz - p.z).normalize();
        const remaining = d + this.autoPath.slice(1).reduce((a, b, i, arr) => a + (i ? Math.hypot(b[0] - arr[i - 1][0], b[1] - arr[i - 1][1]) : 0), 0);
        speed = remaining > 12 ? RUN : WALK;
        // arrive next to an NPC rather than on top of them
        if (this.autoTarget?.kind === "npc" && this.autoPath.length === 1 && d < 1.6) { this.autoPath = []; this.arrived(); want.set(0, 0, 0); }
      }
    }
    const target = want.multiplyScalar(speed);
    this.vel.lerp(target, Math.min(1, dt * (target.lengthSq() ? 10 : 12)));
    if (this.vel.lengthSq() < 0.0004) this.vel.set(0, 0, 0);
    const before = p.clone();
    p.addScaledVector(this.vel, dt);
    this.zone.colliders.resolve(p, 0.38);
    if (!this.zone.interior) this.ambient.resolvePlayer(p, 0.38);
    // interior bounds / door push
    if (this.zone.interior) {
      const it = this.zone.interior;
      if (p.z > it.d / 2 - 0.2 && Math.abs(p.x) < 1.2 && this.vel.z > 0.5) { this.exitInterior(); }
    } else {
      this.checkDoorPush(dt);
    }
    const moved = p.distanceTo(before) / Math.max(dt, 1e-4);
    if (this.vel.lengthSq() > 0.05) {
      const h = Math.atan2(this.vel.x, this.vel.z);
      let d = h - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 12);
      this.player.root.rotation.y = this.heading;
    }
    this.player.setAnim(moved > 5.5 ? "run" : moved > 0.4 ? "walk" : "idle");
    this.player.update(dt);
  }

  private checkDoorPush(dt: number) {
    const p = this.player.root.position;
    const d = this.town.doors.find((dd) => Math.hypot(dd.x - p.x, dd.z - p.z) < 1.3);
    if (d && this.vel.lengthSq() > 1) {
      this.pushDoorT += dt;
      if (this.pushDoorT > 0.25) { this.pushDoorT = 0; this.enterDoor(d.loc); }
    } else this.pushDoorT = 0;
  }

  private arrived() {
    const t = this.autoTarget;
    this.autoTarget = null;
    this.autoPath = null;
    if (!t) return;
    if (t.kind === "npc" && t.id) this.talkTo(t.id);
    else if (t.kind === "door" && t.id) this.enterDoor(t.id);
    else if (t.kind === "exit") this.exitInterior();
  }

  private updateNpcs(dt: number, talking: boolean) {
    const p = this.player.root.position;
    for (const n of this.npcs) {
      const d = n.ch.root.position.distanceTo(p);
      if (!talking && !n.sit && d < 5.5) {
        const want = Math.atan2(p.x - n.home.x, p.z - n.home.z);
        let dd = want - n.ch.root.rotation.y;
        dd = Math.atan2(Math.sin(dd), Math.cos(dd));
        n.ch.root.rotation.y += dd * Math.min(1, dt * 4);
        if (!n.waved && d < 4.5) { n.waved = true; n.ch.setAnim("wave"); setTimeout(() => { if (n.ch.anim === "wave") n.ch.setAnim("idle"); }, 1400); }
      } else if (!talking && !n.sit && d > 9) {
        let dd = n.rot - n.ch.root.rotation.y;
        dd = Math.atan2(Math.sin(dd), Math.cos(dd));
        n.ch.root.rotation.y += dd * Math.min(1, dt * 2);
        if (d > 14) n.waved = false;
      }
      n.ch.update(dt);
    }
  }

  private updateTags() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    const obj = this.currentObjective();
    const talking = !!this.session?.active;
    for (const n of this.npcs) {
      v.set(n.ch.root.position.x, n.ch.height + (n.sit ? -0.1 : 0.45), n.ch.root.position.z);
      const dist = v.distanceTo(this.rig.cam.position);
      v.project(this.rig.cam);
      const visible = v.z < 1 && dist < 34 && !(talking && n !== this.talkNpc);
      if (!visible) { n.tag.style.display = "none"; continue; }
      n.tag.style.display = "";
      n.tag.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      const isObj = !!obj && !isCall(obj) && (obj.npc === n.id || ((obj.npc === "sam" || obj.npc === "emma") && (n.id === "sam" || n.id === "emma")));
      n.tag.classList.toggle("objective", isObj && !talking);
      n.tag.style.opacity = String(Math.max(0.35, 1 - (dist - 12) / 22));
    }
  }

  private updateHud() {
    const st = useStore.getState();
    const p = this.player.root.position;
    // nearest interactable
    let best: Game["nearest"] = null;
    let bd = Infinity;
    if (!this.session?.active) {
      for (const n of this.npcs) {
        let d = Math.hypot(n.home.x - p.x, n.home.z - p.z);
        if (n.approach) d = Math.min(d, Math.hypot(n.approach.x - p.x, n.approach.z - p.z) + 1);
        if (d < 2.9 && d < bd) { bd = d; best = { kind: "npc", id: n.id, label: NPCS[n.id]?.name ?? n.id }; }
      }
      if (!this.zone.interior) {
        for (const dd of this.town.doors) {
          const d = Math.hypot(dd.outX - p.x, dd.outZ - p.z);
          if (d < 3 && d < bd) { bd = d; best = { kind: "door", id: dd.loc, label: dd.name }; }
        }
      } else {
        const ex = this.zone.interior.exit;
        const d = Math.hypot(ex.x - p.x, ex.z - p.z);
        if (d < 1.8 && d < bd) { bd = d; best = { kind: "exit", id: "exit", label: "Išeiti" }; }
      }
    }
    const changed = (best?.kind + ":" + best?.id) !== (this.nearest?.kind + ":" + this.nearest?.id);
    this.nearest = best;
    if (changed) {
      st.setHud({ prompt: best ? { label: best.kind === "npc" ? `Kalbėtis: ${best.label}` : best.kind === "door" ? `Įeiti: ${best.label}` : "Išeiti į lauką", kind: best.kind === "npc" ? "talk" : best.kind === "door" ? "enter" : "exit" } : null });
    }
    // objective distance & minimap
    const tgt = this.objectiveTarget();
    const o = st.hud.objective;
    if (o) {
      const dist = tgt ? Math.round(Math.hypot(tgt.x - p.x, tgt.z - p.z)) : null;
      const angle = tgt ? Math.atan2(tgt.x - p.x, tgt.z - p.z) : null;
      if (o.dist !== dist || (angle !== null && Math.abs((o.angle ?? 0) - angle) > 0.05)) st.setHud({ objective: { ...o, dist, angle } });
    }
    const mm = st.hud.minimap;
    const zone = this.zone.id;
    if (Math.abs(mm.px - p.x) > 0.3 || Math.abs(mm.pz - p.z) > 0.3 || Math.abs(mm.heading - this.heading) > 0.05 || mm.zone !== zone || mm.targetX !== tgt?.x) {
      st.setHud({ minimap: { px: p.x, pz: p.z, heading: this.heading, targetX: tgt?.x, targetZ: tgt?.z, zone } });
    }
    this.saveT -= 0.12;
    if (this.saveT <= 0) { this.saveT = 5; this.savePlace(); }
  }
  private saveT = 5;

  private savePlace() {
    if (!this.player || !this.zone) return;
    const p = this.player.root.position;
    useStore.getState().updateProgress((pr) => { pr.place = { zone: this.zone.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), rot: +this.heading.toFixed(2) }; });
  }

  get groundCanvas() { return this.town?.groundCanvas; }
  get doors(): Door[] { return this.town?.doors ?? []; }
  get zoneId() { return this.zone?.id; }

  setQuality(q: "high" | "low") {
    this.renderer.shadowMap.enabled = q === "high";
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 1.75 : 1));
    this.fx?.quality(q);
    this.onResize();
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    audio.stop();
    for (const n of this.npcs) n.tag.remove();
    this.npcs = [];
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}

export { game, setGame } from "./gameRef";
void textTexture;
