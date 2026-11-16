// The game: renderer, zones (town + interiors), player, NPCs, input, guidance and conversations.
import * as THREE from "three";
import { showConversationEvent } from "./convEvents";
import { buildTown, type Town, type Door } from "./world/town";
import { getInterior, type Interior } from "./world/interiors";
import { OUTDOOR_NPCS, AIRPORT_EXIT, WORLD, BUILDINGS, ROADS, DROPOFF, SEA_Z, BEACH_Z, FOUNTAIN, PARK, SQUARE } from "./world/layout";
import { createCharacter, setBlobShadows, withBackpack, type GameCharacter } from "./characters";
import { moodOf } from "./characters/mood";
import { styleRenderer, createStyleFx, type StyleFx } from "./styleScene";
import { CameraRig, FOLLOW } from "./camera";
import { Steer, Gait, Hop, angleDiff, smoothstep } from "./movement";
import { Ledges, LAND } from "./ledges";
import { coach } from "./coach";
import { Wading, Splashes, floorY, waterY, bayHold, SEA_LEVEL, SHORE, SWIM, BAY } from "./water";
import { Rides, type Ride } from "./rides/Rides";
import { Undersea } from "./rides/undersea";
import { CAR_DRIFT, BOAT_DRIFT, controlsFrom } from "./rides/drive";
import { RIDES } from "./world/rides";
import { RIDE_NAMES } from "../content/rides";
import { SURF_SPOT } from "./world/surf";
import { SURF } from "../content/surf";
import { SurfPlay } from "./surf/play";
import { useSurf } from "./surf/store";
import { OcclusionField } from "./occlusion";
import { PropFader } from "./fade";
import { CUT, withCutout } from "./cutout";
import { Guidance } from "./guidance";
import { NavGrid } from "./nav";
import { Session } from "./session";
import { Ambient, Chatter, walkerLook } from "./ambient";
import { ROOM_PEOPLE } from "./world/roomPeople";
import { AMBIENT_LINES } from "../content/ambient";
import { ambientVoice } from "../content/voices";
import { audio } from "./audio";
import { TOWN_SOUNDS } from "./townSounds";
import { nearLevel, surfLevel, surfaceAt, type Surface } from "./soundscape";
import { radio } from "../radio";
import { Dust } from "./dust";
import { Pigeons } from "./pigeons";
import { NPCS, type Look } from "../content/npcs";
import { LOCATIONS, placeLt } from "../content/locations";
import { SITUATIONS, SITUATION_BY_ID, prefetchSituations } from "../content/situations/catalog";
import { whenLoaded } from "./prefetch";
import type { SituationDef, SituationMeta } from "../content/types";
import { picturesOn, useStore } from "../state/store";
import { sceneFor } from "../ui/scenes";
import { sitProgress } from "../state/progress";
import { textTexture, rand } from "./world/util";
import { givenItem } from "./given";
import type { GameApi } from "./gameRef";
import { THEME } from "./world/theme";
export type { GameApi } from "./gameRef";

/** A box on the screen, in pixels (a name tag, or part of the HUD the tags keep clear of). */
type TagBox = { x0: number; x1: number; y0: number; y1: number };
interface NpcActor { id: string; ch: GameCharacter; home: THREE.Vector3; rot: number; tag: HTMLDivElement; tagSize?: [number, number]; sit?: boolean; waved: boolean; approach?: THREE.Vector3 }
interface ZoneState { id: string; group: THREE.Group; colliders: import("./world/util").Colliders; nav: NavGrid; interior?: Interior }

/** Walking, the jog one falls into outdoors after a moment on the move, and running (Shift, the stick at its edge). */
const WALK = 4.4, JOG = 6.0, RUN = 7.4;
/** How long one walks steadily one way before the jog (s), and how long it takes to come on. */
const JOG_AFTER = 1.5, JOG_EASE = 0.9;

const isCall = (s: SituationMeta) => s.mode === "phone" || s.mode === "video" || s.location === "phone";
/** A point `d` metres in front of someone facing `rot` (0 = +Z), turned towards them. */
function inFrontOf(x: number, z: number, rot: number, d: number) {
  return { x: x + Math.sin(rot) * d, z: z + Math.cos(rot) * d, rot: rot + Math.PI };
}
/** Marks the way-finding cells under one of the room's townspeople (a circle of radius `r` at x, z) as taken, so walks
 *  are planned round them. (Not the NPCs': a walk to one must end next to them, and their spots can be tucked in.) */
function blockNav(nav: NavGrid, x: number, z: number, r: number) {
  const reach = r + nav.cell * 0.5;
  for (let ox = -reach; ox <= reach + 1e-6; ox += nav.cell * 0.5) for (let oz = -reach; oz <= reach + 1e-6; oz += nav.cell * 0.5) {
    if (Math.hypot(ox, oz) > reach) continue;
    const i = nav.idx(x + ox, z + oz);
    if (i >= 0) nav.blocked[i] = 1;
  }
}

/** Where to go to talk to someone standing at `sp`: their `ax/az` when they have one (across a counter, a stall or a
 *  table; then `person` is where they stand, for the beacon), else their own spot. */
function talkAt(sp: { x: number; z: number; ax?: number; az?: number }) {
  return sp.ax !== undefined && sp.az !== undefined ? { x: sp.ax, z: sp.az, person: { x: sp.x, z: sp.z } } : { x: sp.x, z: sp.z };
}
/** Close enough to talk to someone (the "Kalbėtis" prompt shows): `talkDist` under this. */
const TALK_RANGE = 2.9;
/** How far `p` is from talking to `n`: from them, or from their spot to talk from plus a metre. */
function talkDist(n: NpcActor, p: THREE.Vector3) {
  const d = Math.hypot(n.home.x - p.x, n.home.z - p.z);
  return n.approach ? Math.min(d, Math.hypot(n.approach.x - p.x, n.approach.z - p.z) + 1) : d;
}

/** What people at work do with their hands while they wait for you: wipe the counter, or type (a till, a keyboard,
 *  the flowers on the stall). The rest look round, shift their weight, scratch their head. */
const AT_WORK: Record<string, "wipe" | "type"> = {
  mia: "wipe", marco: "wipe", dot: "wipe", whitaker: "wipe", russo: "wipe",
  diaz: "type", priya: "type", olivia: "type", chuck: "type", ben: "type", chloe: "type", okafor: "type", aaron: "type",
  gloria: "type", marco_host: "type", walter: "type", jake: "type", kevin: "type", nina: "type", reyes: "type",
  carter: "type", marcus: "type", tyler: "type", mrs_lee: "type", brooks: "type", greg: "type", kate: "type", paul: "type",
  emily: "type",
};

/** On a phone held upright, the height of the 3D picture above the conversation (styles.css
 *  --conversation-image-height and its shorter screens). */
function talkPictureHeight(h: number): number {
  return h <= 620 ? 100 : h <= 700 ? Math.max(100, h * 0.2) : Math.min(230, Math.max(110, h * 0.25));
}

const headBox = new THREE.Vector3();
/** How far above its feet the top of a person's head is, hair and hats included (the box of their own meshes; the
 *  blob shadow left out). */
function headTop(ch: GameCharacter): number {
  let top = -Infinity;
  ch.root.updateMatrixWorld(true);
  ch.root.traverse((o) => {
    const g = (o as THREE.Mesh).isMesh && o.visible ? (o as THREE.Mesh).geometry : null;
    if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox;
    if (!b || b.max.y - b.min.y < 0.05) return;
    for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) top = Math.max(top, headBox.set(x, b.max.y, z).applyMatrix4(o.matrixWorld).y);
  });
  return Number.isFinite(top) ? top - ch.root.position.y : ch.height * 1.04;
}

export class Game implements GameApi {
  readonly light = false;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  rig: CameraRig;
  town!: Town;
  zone!: ZoneState;
  private zones = new Map<string, ZoneState>();
  player!: GameCharacter;
  private npcs: NpcActor[] = [];
  /** The room's townspeople (roomPeople.ts) and the pairs of them talking. */
  private extras: GameCharacter[] = [];
  private extraChats: Chatter[] = [];
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
  private lastHeading = 0;
  private heading = Math.PI;
  private autoPath: [number, number][] | null = null;
  private autoTarget: { kind: "npc" | "door" | "exit" | "point"; id?: string } | null = null;
  private clock = new THREE.Clock();
  private t = 0;
  private hudT = 0;
  private moveT = 0;
  private stillT = 0;
  /** Footsteps and dust: the distance walked since the last step, and the speed a moment ago (stopping short). */
  private stepDist = 0;
  private lastSpeed = 0;
  private dust = new Dust();
  private pigeons!: Pigeons;
  private pathT = 0;
  private session: Session | null = null;
  private talkNpc: NpcActor | null = null;
  /** Where the learner's head is (kept up to date in updateNpcs): the people's eyes and heads turn to it (characters:
   *  `watch`); and the head of the person the learner talks with, for the player's own. */
  private learnerAt = new THREE.Vector3();
  private talkAt = new THREE.Vector3();
  private hudBoxCache: TagBox[] = [];
  private hudCheck = 0;
  private tagLayer: HTMLDivElement;
  private nearest: { kind: "npc" | "door" | "exit" | "ride" | "out" | "climb" | "surf"; id: string; label: string } | null = null;
  private pushDoorT = 0;
  private transitioning = false;
  private npcToSits = new Map<string, SituationMeta[]>();
  private secondary = new Map<string, SituationMeta>();
  private mapPanel: THREE.Mesh | null = null;
  private pointer = { down: false, id: -1, x: 0, y: 0, moved: 0, button: 0 };
  private raycaster = new THREE.Raycaster();
  private chest = new THREE.Vector3();
  private moveVel = new THREE.Vector3();
  private tmpV = new THREE.Vector3();
  private disposed = false;
  private ambient!: Ambient;
  private unbindAmbience: (() => void) | null = null;
  private ambienceAllowed = () => {
    const st = useStore.getState();
    return !this.disposed && !document.hidden && !st.conv.active && !st.hud.panel;
  };
  /** Walking under the player's own control (movement.ts): the direction pressed, the turn and the speed, a hop. */
  private steer = new Steer();
  private gait = new Gait();
  private gaitOn = false;
  private hop = new Hop();
  private joyRun = false;
  /** How long the player has walked steadily one way (the jog comes on after JOG_AFTER), and which way that was. */
  private jogT = 0;
  private jogDir: number | null = null;
  /** What can be jumped onto outdoors, from the town's own geometry (ledges.ts), and the shallows (water.ts). */
  private ledges: Ledges | null = null;
  private wading = new Wading();
  private splashes = new Splashes();
  private wet = false;
  private washT = 0;
  /** What one can drive (rides/Rides.ts): the convertibles and the boat; the jump button held (a brake at the wheel). */
  rides!: Rides;
  /** The surf lesson (surf/play.ts), where the town has a surf school (world/surf.ts); the one its conversation asked for. */
  surf: SurfPlay | null = null;
  private pendingSurf: "beginner" | "advanced" | null = null;
  private brake = false;
  private bumpT = 0;
  private braked = false;
  private dustT = 0;
  /** At a wheel: the way the camera looks along (the car's course: in a slide it is seen side on), how far it has
   *  pulled back for the speed, the lens's widening, whether the kick out of a slide has been heard, the tip given. */
  private rideCourse = 0;
  private rideBack = 0;
  private rideFov = 0;
  private kicked = false;
  private slideTold = false;
  /** Swimming (water.ts SWIM): in deep water now; how far into the stroke's pose (0–1); a dive: how long it still
   *  lasts (s) and how far under (0–1); the stroke's last splash. */
  private swimming = false;
  private swimK = 0;
  private diveT = 0;
  private diveK = 0;
  private strokeT = 0;
  private swimTip = false;
  /** What a dive shows (rides/undersea.ts), and the air's own fog and the camera's lean to go back to after it. */
  private undersea!: Undersea;
  private airFog: THREE.Fog | null = null;
  private dry: THREE.Object3D[] = [];
  private airCam: { pitch: number; dist: number } | null = null;
  /** Stepping out of a door by itself (m still to go), so the street shows ahead. */
  private stepOut = 0;
  /** The foot that came down last (the legs' swing, Character.stepPhase), for the footsteps. */
  private stepN: number | null = null;
  /** What the follow camera keeps clear of, from the town's own geometry (occlusion.ts), and the trees that fade out of
   *  its way (fade.ts). */
  private field!: OcclusionField;
  private fader!: PropFader;
  onReady?: () => void;

  constructor(private container: HTMLElement, tagLayer: HTMLDivElement) {
    this.tagLayer = tagLayer;
    const q = useStore.getState().settings.quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: q === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 1.75 : 1));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = q === "high";
    // soft edges come from the sun's shadow.radius (three.js no longer has PCFSoftShadowMap)
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    setBlobShadows(q !== "high");
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
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
    // the follow camera never goes into or behind anything built in the town (the church, a gazebo, a canopy…: all of
    // it, from the meshes themselves), and the trees in its way fade; not what moves (clouds, gulls, boats)
    // (nor what is thin and looked through, userData.thin: the gas station's canopy)
    const moves = (o: THREE.Object3D) => o.userData?.v !== undefined || !!o.userData?.gull || !!o.userData?.boat || !!o.userData?.thin;
    this.field = OcclusionField.fromObject(this.town.group, { minX: WORLD.minX - 24, maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24 }, { skip: moves });
    this.field.fillFootprints(this.town.colliders.boxes, this.town.colliders.circles);
    this.fader = new PropFader(this.town.group, moves);
    // what is low enough to jump onto (benches, planters, low walls), read from the meshes a few milliseconds at a
    // time once the town is up; never a café table's chairs, nor what the camera's field holds solid (a gazebo)
    // (what is thin and looked through, a stall's awning, is no top, but nobody stands on the stall's table under it)
    this.ledges = Ledges.build(this.town.group, this.town.colliders, {
      skip: (o) => o.userData?.v !== undefined || !!o.userData?.gull || !!o.userData?.boat, thin: (o) => !!o.userData?.thin, keep: this.town.seats.filter((s) => s.table).map((s) => [s.x, s.z]), tall: (x, z) => this.field.overSolid(x, z),
      beside: OUTDOOR_NPCS.flatMap((n) => (n.ax !== undefined && n.az !== undefined ? [[n.x, n.z], [n.ax, n.az]] : [[n.x, n.z]]) as [number, number][]),
    }, (next) => setTimeout(next, 16));
    // (a car that has stopped is climbed like a parked one: its pieces come and go with it)
    this.ledges.dynamic = (x, z) => this.ambient.carPieces(x, z);
    // the boats lying in the shallows are in a wader's way
    const hull = new THREE.Box3();
    for (const o of this.town.group.children) if (o.userData.boat) {
      hull.setFromObject(o);
      // (all of them: one swims out among them now)
      this.ledges.add({ minX: hull.min.x, maxX: hull.max.x, minZ: hull.min.z, maxZ: hull.max.z, top: Infinity });
    }
    withCutout(this.town.group);
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
    // pigeons round the fountain (in the town's group, so they are hidden indoors); their wings when they take off
    this.pigeons = new Pigeons(FOUNTAIN.x, FOUNTAIN.z, 4.6, 9.5);
    this.pigeons.onTakeOff = (n) => {
      if (this.ambienceAllowed()) audio.flutter(Math.min(1, 0.5 + n * 0.15));
    };
    this.town.group.add(this.pigeons.group);
    // passers-by walk between shop doors, the square, the beach and the bus stop
    const places: [number, number][] = this.town.doors.filter((d) => d.loc !== "airport").map((d) => [d.outX, d.outZ]);
    places.push([22, -20], [40, -46], [16, -36], [-12, -62], [30, -63], [-30, -61], [96, -30], [-6, 46], [62, 44], [-42, 44], [118, 2]);
    this.ambient = new Ambient(nav, places, st.settings.quality, this.town.seats, this.town.colliders);
    // what one can drive: the convertibles at the curb with their people in them, the boat at the pier
    this.rides = new Rides({
      cam: this.rig.cam, colliders: this.town.colliders, nav, ambient: this.ambient, player: null as unknown as GameCharacter, quality: st.settings.quality,
      people: () => (this.zone.interior ? [] : this.npcs.map((n) => n.home)),
      say: (line, voice, female, ch) => this.saysAloud(line, female, ch, voice),
      thud: (k) => { if (this.bumpT <= 0) { audio.bump(Math.min(1, 0.35 + k * 0.65)); this.bumpT = 0.12; } },
      rescue: (put) => {
        const hud = useStore.getState();
        hud.setHud({ fade: 1 });
        setTimeout(() => {
          put();
          const car = this.rides.riding;
          if (car) { this.rig.yaw = car.m.heading; this.rig.target.set(car.m.x, 0, car.m.z); this.rig.snap(); }
          useStore.getState().setHud({ fade: 0 });
          useStore.getState().toast({ kind: "info", title: "Mašina vėl gatvėje", ms: 2600 });
        }, 280);
      },
      waiting: () => useStore.getState().toast({ kind: "tip", title: "Kelias užimtas", body: "Mašina sustoja pati. Pasuk į šoną ir apvažiuok arba pavažiuok atbulas.", ms: 5000 }),
      freed: () => useStore.getState().toast({ kind: "info", title: "Mašina išlaisvinta", body: "Ji pati pasitraukė ten, kur laisva.", ms: 2600 }),
      stuck: () => useStore.getState().toast({ kind: "tip", title: "Užstrigai?", body: useStore.getState().hud.showTouch ? "Patrauk vairalazdę žemyn – važiuosi atbulas." : "Rodyklė žemyn – važiuosi atbulas.", ms: 5000 }),
      aground: () => useStore.getState().toast({ kind: "tip", title: "Čia per sekli vieta", body: useStore.getState().hud.showTouch ? "Patrauk vairalazdę žemyn – valtis atsitrauks nuo kranto." : "Rodyklė žemyn – valtis atsitrauks nuo kranto.", ms: 5000 }),
      splash: (x, y, z, dx, dz, k) => this.splashes.burst(x, y, z, dx, dz, k),
      fan: (x, y, z, dx, dz, k) => this.splashes.fan(x, y, z, dx, dz, k),
      outdoors: () => !this.zone.interior && !this.covered,
    }, RIDES, this.town.group.children.filter((o) => o.userData.boat));
    this.rides.onLeft = (x, y, z, rot) => this.leftRide(x, y, z, rot);
    this.rides.onStuck = () => useStore.getState().toast({ kind: "info", title: "Čia išlipti nėra kur", body: "Pavažiuok truputį toliau." });
    this.undersea = new Undersea(RIDES.deep, RIDES.rocks);
    if (SURF_SPOT && SURF && NPCS[SURF.npc]) {
      this.surf = new SurfPlay(SURF_SPOT, SURF, {
        player: () => this.player, rig: this.rig, time: () => this.t,
        splash: (x, y, z, dx, dz, k) => this.splashes.burst(x, y, z, dx, dz, k),
        fade: (fn) => { if (this.transitioning) return false; this.fadeThen(fn); return true; },
        hideNpc: (id, hidden) => { const n = this.npcs.find((q) => q.id === id); if (n) n.ch.root.visible = !hidden; },
        entered: () => this.onSurf(),
        left: (x, z, rot) => this.offSurf(x, z, rot),
        portrait: () => this.container.clientHeight > this.container.clientWidth * 1.15,
      });
      this.scene.add(this.surf.group);
    }
    this.scene.add(this.npcLayer, this.guidance.group, this.ambient.group, this.rides.group, this.dust.group, this.splashes.group, this.undersea.group);
    this.rig.space = {
      free: (a, b) => (this.zone?.interior ? 1 : this.field.free(a, b)),
      inside: (q) => !this.zone?.interior && this.field.solidAt(q.x, q.y, q.z, 0.15),
      overSolid: (x, z) => !this.zone?.interior && this.field.overSolid(x, z),
    };
    const prof = st.progress.profile!;
    this.player = createCharacter(withBackpack({ ...prof.look, female: prof.look.female ?? prof.gender === "f" }));
    this.player.fidgets = false;
    this.rides.host.player = this.player;
    this.scene.add(this.player.root);
    // (the clip list loads meanwhile: the town doesn't wait for it, a conversation's first line does, audio.play)
    void audio.init();
    audio.volume = st.settings.volume;
    audio.sounds = st.settings.sounds;
    this.unbindAmbience = useStore.subscribe(() => {
      if (!this.ambienceAllowed() || useStore.getState().settings.volume <= 0) audio.stopAmbience();
    });
    // start where the player left off, or in the airport on the very first visit
    const place = st.progress.place;
    if (place && (place.zone === "town" || getInterior(place.zone))) this.enterZone(place.zone, { x: place.x, z: place.z, rot: place.rot }, true);
    else this.enterZone("airport", { x: -14, z: -1, rot: Math.PI }, true);
    this.bindInput();
    window.addEventListener("resize", this.onResize);
    this.renderer.setAnimationLoop(this.loop);
    this.refreshObjective();
    // Keep the logo over the canvas until an actual town frame is ready to show.
    this.renderer.render(this.scene, this.rig.cam);
    this.onReady?.();
    // the first time in the town: a few hints, one at a time (coach.ts)
    coach.begin();
  }

  private setupLights() {
    this.hemi = new THREE.HemisphereLight(THEME.light.sky, THEME.light.ground, THEME.light.fill);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(THEME.light.sun, THEME.light.sunPower);
    this.sun.position.set(-40, 70, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 42;
    Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 200 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target);
    // sky dome
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(THEME.light.dome[0]) }, mid: { value: new THREE.Color(THEME.light.dome[1]) }, bottom: { value: new THREE.Color(THEME.light.dome[2]) } },
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

  /** `via`: through a door ("in" or "out"): the camera starts near the player and settles; out into the street, with
   *  nothing held, the player takes two steps out of the doorway. */
  enterZone(id: string, spawn?: { x: number; z: number; rot: number }, instant = false, via?: "in" | "out") {
    const z = this.getZone(id);
    if (!z) return;
    const doIt = () => {
      if (this.zone) this.scene.remove(this.zone.group);
      this.zone = z;
      this.scene.add(z.group);
      const indoor = !!z.interior;
      this.jogT = 0;
      // (out of whatever was driven, and out of the water: on foot wherever this puts them)
      this.endRide();
      this.rides.group.visible = !indoor;
      this.surface(true);
      const sp = spawn ?? (z.interior ? z.interior.spawn : { x: 0, z: 0, rot: 0 });
      // (on the sand where it slopes under the sea, if that is where they were)
      const floor = indoor ? 0 : floorY(sp.x, sp.z);
      this.player.root.position.set(sp.x, floor, sp.z);
      this.heading = sp.rot;
      this.player.root.rotation.y = sp.rot;
      this.vel.set(0, 0, 0);
      this.autoPath = null; this.autoTarget = null;
      // still walking (the keys or the stick held through the door): on the other side they keep going the way they now
      // face, at the same pace
      this.steer.carry(sp.rot, indoor ? Math.PI : sp.rot);
      this.gait.sync(sp.rot, this.steer.held ? this.gait.speed : 0);
      this.gaitOn = this.steer.held;
      this.stepOut = via === "out" && !this.steer.held && this.town.walkableAt(sp.x + Math.sin(sp.rot) * 1.4, sp.z + Math.cos(sp.rot) * 1.4) ? 1.2 : 0;
      this.hop.land(floor);
      this.fader.reset();
      CUT.r.value = 0;
      this.moveVel.set(0, 0, 0);
      this.nearest = null;
      this.spawnNpcs();
      // lighting & atmosphere
      this.sky.visible = !indoor;
      this.ambient.group.visible = !indoor;
      this.scene.fog = indoor ? null : new THREE.Fog(THEME.light.haze, 110, 420);
      this.scene.background = indoor ? new THREE.Color(z.interior?.warm ? "#2b2320" : "#23282e") : null;
      // outdoors a little less flat fill and a little more sun than before (deeper colours, clearer shapes)
      this.hemi.intensity = indoor ? 1.9 : THEME.light.fill;
      this.sun.intensity = indoor ? 1.6 : THEME.light.sunPower;
      this.fx?.zone(indoor, !!z.interior?.warm);
      this.rig.mode = indoor ? "interior" : "follow";
      if (indoor) this.rig.interiorBounds = { w: z.interior!.w, d: z.interior!.d };
      else this.rig.yaw = this.heading;
      this.rig.target.copy(this.player.root.position);
      this.rig.snap();
      if (via) this.rig.arrive();
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
      const ch = createCharacter({ ...def.look, female: def.look.female ?? def.gender === "f" });
      ch.watch = this.learnerAt;
      ch.root.position.set(sp.x, 0, sp.z);
      ch.root.rotation.y = sp.rot;
      if (sp.sit) { ch.seatY = sp.seat ?? 0.5; ch.setAnim("sit"); }
      ch.busy = AT_WORK[sp.npc] ?? null;
      this.npcLayer.add(ch.root);
      const tag = document.createElement("div");
      tag.className = "nametag";
      // who they are in English, and in Lithuanian under it (unless it is the same word, like "Barista")
      const lt = def.role.lt.toLowerCase() === def.role.en.toLowerCase() ? "" : `<i lang="lt">${def.role.lt}</i>`;
      tag.innerHTML = `<b>${def.name}</b><span lang="en">${def.role.en}</span>${lt}`;
      this.tagLayer.appendChild(tag);
      const ap = sp as { ax?: number; az?: number };
      this.npcs.push({ id: sp.npc, ch, home: new THREE.Vector3(sp.x, 0, sp.z), rot: sp.rot, tag, sit: sp.sit, waved: false, approach: ap.ax !== undefined && ap.az !== undefined ? new THREE.Vector3(ap.ax, 0, ap.az) : undefined });
      this.zone.colliders.circles = this.zone.colliders.circles.filter((c) => !(c as any).npc || (c as any).npc !== sp.npc);
      const c = { x: sp.x, z: sp.z, r: 0.45, npc: sp.npc } as any;
      this.zone.colliders.circles.push(c);
    }
    // passers-by step round the people standing in town
    if (!this.zone.interior) this.ambient.obstacles = this.npcs.map((n) => [n.home.x, n.home.z]);
    this.spawnRoomPeople();
  }

  /** The room's townspeople: guests, customers, colleagues (roomPeople.ts), with looks drawn per room. Outdoors the
   *  passers-by are Ambient's. */
  private spawnRoomPeople() {
    for (const ch of this.extras) { ch.dispose?.(); this.npcLayer.remove(ch.root); }
    this.extras = [];
    this.extraChats = [];
    this.zone.colliders.circles = this.zone.colliders.circles.filter((c) => !(c as any).extra);
    const people = this.zone.interior ? ROOM_PEOPLE[this.zone.id] ?? [] : [];
    const r = rand([...this.zone.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100000, 17));
    const talking = new Map<number, GameCharacter>();
    for (const p of people) {
      const female = r() < 0.5;
      const ch = createCharacter({ ...walkerLook(female, r), carry: p.carry, phone: p.phone ?? (!p.sit && !p.run && r() < 0.5) });
      ch.watch = this.learnerAt;
      ch.noticeWithin = 3.5;
      ch.root.position.set(p.x, p.run ?? 0, p.z);
      ch.root.rotation.y = p.rot;
      if (p.sit !== undefined) { ch.seatY = p.sit; ch.setAnim("sit"); }
      if (p.run !== undefined) { ch.setAnim("run"); ch.moveSpeed = 3.4; }
      if (p.busy) ch.busy = p.busy;
      this.npcLayer.add(ch.root);
      this.extras.push(ch);
      // nobody walks through them, sitting or standing (and the way-finding goes round them)
      if (p.run === undefined) {
        const r = p.sit !== undefined ? 0.3 : 0.38;
        this.zone.colliders.circles.push({ x: p.x, z: p.z, r, extra: true } as any);
        blockNav(this.zone.nav, p.x, p.z, r);
      }
      if (p.chat !== undefined) {
        const other = talking.get(p.chat);
        if (other) this.extraChats.push(new Chatter(other, ch, r)); else talking.set(p.chat, ch);
      }
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
    // in the surf lesson the keys are the board's (surf/play.ts)
    if (useSurf.getState().picking) { if (k === "escape") this.surf?.cancel(); return; }
    if (this.surf?.active) { if (!this.transitioning && this.surf.key(k, e.repeat, this.keys)) e.preventDefault(); return; }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(k)) {
      this.keys.add(k); this.autoPath = null; this.autoTarget = null; e.preventDefault(); return;
    }
    // Space: talk or go in, as E, when there is someone or a door to; else a jump (in the air: the second jump). At a wheel it
    // is the brake, for as long as it is held; swimming, a dive
    if (k === " " && this.rides.riding) { this.keys.add(" "); e.preventDefault(); return; }
    if (k === " ") { if (this.nearest && !this.hop.air && !this.swimming) this.interact(); else if (!e.repeat) this.jump(); e.preventDefault(); return; }
    if (k === "e" || k === "enter") { this.interact(); e.preventDefault(); return; }
    if (k === "m") st.setHud({ panel: "map" });
    if (k === "j") st.setHud({ panel: "journal" });
    if (k === "p") st.setHud({ panel: "phone" });
    if (k === "g") this.autoWalkToObjective();
    if (k === "r" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) radio.power();
    if (k === "escape") st.setHud({ panel: "settings" });
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  private onBlur = () => { this.keys.clear(); };

  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; if (x || y) { this.autoPath = null; this.autoTarget = null; } }

  /** What the player stands on, for the sound of their steps (soundscape.ts): `raised` on a pier's or a terrace's
   *  boards or a bench (ledges.ts). */
  private underfoot(raised: boolean): Surface {
    const p = this.player.root.position;
    return surfaceAt({ indoor: !!this.zone.interior, warm: !!this.zone.interior?.warm, raised, x: p.x, z: p.z, beachZ: BEACH_Z, park: PARK });
  }

  /** A jump (Space, or the phone's button): not in a conversation, over a panel or through a door. A second press in
   *  the air is a flip, a third the high jump (much higher, two somersaults in all). */
  jump() {
    const st = useStore.getState();
    if (this.session?.active || st.conv.active || st.hud.panel || this.transitioning || !this.player) return;
    // (on a surfboard it is getting to one's feet, and the trick)
    if (this.surf?.active) { this.surf.up(); return; }
    // (at a wheel the button is the brake: hold(); in the water it is a dive, and the way back up)
    if (this.rides.riding) return;
    if (this.swimming) { this.dive(); return; }
    if (this.hop.air) { if (this.hop.flip()) { audio.jump(this.hop.doubled ? 1.5 : 1.3); if (this.hop.doubled) audio.whoosh(); coach.did("jump"); } return; }
    if (this.hop.start()) { audio.jump(); coach.did("jump"); }
  }

  /** The jump button held down or let go: at a wheel it is the brake. */
  hold(on: boolean) { this.brake = on; }

  /** Under the water for a few breaths (and back up at once on a second press): only where it is deep enough for the
   *  camera to follow. */
  private dive() {
    if (this.diveT > 0) { this.diveT = 0; return; }
    const p = this.player.root.position, sur = waterY(p.x, p.z, this.t);
    if (sur === null || sur - floorY(p.x, p.z) < SWIM.dive + 0.9) { audio.splash(0.5); this.splashes.burst(p.x, sur ?? SEA_LEVEL, p.z, 0, 0, 0.8); return; }
    this.diveT = SWIM.breath;
    this.undersea.build();
    audio.splash(0.9);
    this.splashes.burst(p.x, sur, p.z, 0, 0, 1);
  }

  /** Out of the water's own state at once (a door, a ride, a teleport), or (`all` false) only up from a dive. */
  private surface(all: boolean) {
    this.diveT = 0;
    if (!all) return;
    this.swimming = false; this.swimK = 0; this.diveK = 0;
    if (this.player) { this.player.swim = 0; this.player.dive = 0; }
    this.underWater(false);
  }

  /** The picture under water or in the air again: the fog, the sky, the camera's lean. */
  private underWater(on: boolean) {
    if (on === !!this.airFog) return;
    if (on) {
      this.airFog = (this.scene.fog as THREE.Fog | null) ?? new THREE.Fog(THEME.light.haze, 110, 420);
      this.scene.fog = this.undersea.fog;
      this.scene.background = this.undersea.fog.color;
      this.sky.visible = false;
      // (the town is above the water, out of sight: left out of the picture, but for the pier and the boats' hulls,
      // so a dive costs a phone less than the street does)
      for (const o of this.town.group.children) if (o.visible && !o.userData.boat && !/^pier/.test(o.name)) { o.visible = false; this.dry.push(o); }
      this.ambient.group.visible = false;
      this.npcLayer.visible = false;
    } else {
      this.scene.fog = this.zone?.interior ? null : this.airFog;
      this.scene.background = this.zone?.interior ? this.scene.background : null;
      this.sky.visible = !this.zone?.interior;
      this.airFog = null;
      for (const o of this.dry) o.visible = true;
      this.dry.length = 0;
      this.ambient.group.visible = !this.zone?.interior;
      this.npcLayer.visible = true;
    }
  }

  /** A passer-by's kind of line said by someone in the town: a bubble with its meaning, their mouth moving, and their
   *  voice where the passers-by's voices have the line recorded. */
  private saysAloud(line: { en: string; lt: string }, female: boolean, ch: GameCharacter, own: string | null = null) {
    // (their own voice, if they have one and it has this line; else a passer-by's)
    const voice = own && audio.hasClip(own, 1, line.en) ? own : ambientVoice(female ? "f" : "m");
    let secs = 1.1 + line.en.length * 0.045;
    if (audio.hasClip(voice, 1, line.en)) {
      void audio.play(voice, 1, line.en, { male: !female });
      secs = audio.clipDuration(voice, 1, line.en) ?? secs;
      ch.talk(secs, () => audio.level(), () => audio.vowel());
    } else ch.talk(secs);
    useStore.getState().toast({ kind: "info", title: `„${line.en}“`, body: line.lt, ms: 3200 });
  }

  /** Into a convertible or the boat: whatever the player was doing on foot stops there. */
  private boardRide(r: Ride) {
    const st = useStore.getState();
    if (this.session?.active || st.hud.panel || this.transitioning || this.rides.riding) return;
    this.autoPath = null; this.autoTarget = null;
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.vel.set(0, 0, 0);
    this.hop.land(this.player.root.position.y); this.applyHop();
    this.surface(true);
    this.player.bank = 0;
    if (!this.rides.board(r)) return;
    this.ambient.riding = r.kind === "car";
    this.nearest = null;
    this.brake = false;
    st.setHud({ prompt: null });
    audio.sfx("pop");
    if (r.kind === "boat") { const p = this.player.root.position; this.splashes.burst(r.m.x, waterY(p.x, p.z, this.t) ?? SEA_LEVEL, r.m.z, 0, 0, 0.5); }
  }

  /** On foot again (Rides.onLeft): where the player stands now, facing away from what they got out of. */
  private leftRide(x: number, y: number, z: number, rot: number) {
    const p = this.player.root.position;
    p.set(x, y, z);
    this.heading = rot;
    this.player.root.rotation.set(0, rot, 0);
    this.afterRide();
    const sur = waterY(x, z, this.t);
    if (sur !== null && sur - y > 0.3) { audio.splash(Math.min(1, 0.4 + (sur - y) * 0.4)); this.splashes.burst(x, sur, z, 0, 0, 1); }
    else audio.land(this.underfoot(y > 0.05), 0.5);
  }

  /** What getting out of a ride leaves behind, however it ended. */
  private afterRide() {
    const p = this.player.root.position;
    this.hop.land(p.y); this.applyHop();
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.gait.sync(this.heading, 0); this.gaitOn = false; this.steer.reset();
    this.keys.delete(" "); this.brake = false;
    this.ambient.riding = false;
    this.nearest = null;
    audio.motor(null);
    audio.rush("squeal", 0); audio.rush("wind", 0);
    // (the camera comes back to where the player had it)
    this.rig.dist /= 1 + this.rideBack; this.rideBack = 0; this.rideFov = 0;
    useStore.getState().setHud({ prompt: null, ride: null, fast: false });
  }

  /** Out of a ride at once, with no hop (a door's zone change, a taxi, a conversation picked from the list). */
  private endRide() {
    if (!this.rides?.riding) return;
    this.rides.abandon();
    this.afterRide();
  }

  /** Up on something higher than a bench (a car, a low wall): nobody is talked to and no door gone through from there. */
  private get aloft() { return !this.zone.interior && this.hop.ground > LAND + 0.1; }

  /** Outdoors, walking: the passers-by, their dogs, the cars and the town's people (not the player) that would stand
   *  under about 8 px tall in the picture are left out of it (layer 0 off; back on as they come nearer, and always in a
   *  conversation or a room). */
  private farCull() {
    // (in the surf lesson too: the town is looked at from the sea)
    const on = (this.rig.mode === "follow" || this.rig.mode === "stage") && !this.zone.interior;
    const cam = this.rig.cam, focal = this.container.clientHeight / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const far2 = (2 * focal / 8) ** 2;
    for (const g of [this.ambient.group, this.npcLayer, this.rides.group]) for (const o of g.children) {
      // (not a dog's lead: a line drawn in the world's own coordinates, its place the world's middle)
      if ((o as THREE.Line).isLine) continue;
      const far = on && o.position.distanceToSquared(cam.position) > far2;
      if ((o.userData.far ?? false) === far) continue;
      o.userData.far = far;
      o.traverse((m) => {
        m.userData.l0 ??= m.layers.isEnabled(0);
        if (!m.userData.l0) return;
        if (far) m.layers.disable(0); else m.layers.enable(0);
      });
    }
  }

  /** The hop as drawn (the body off the ground, the legs, the landing's squash). */
  private applyHop() {
    this.player.lift = this.hop.lift;
    this.player.tuck = this.hop.tuck;
    this.player.squash = this.hop.squash;
    this.player.flip = this.hop.spin;
  }

  private onClick(cx: number, cy: number) {
    const st = useStore.getState();
    // (in the surf lesson a tap on the picture is a paddle stroke)
    if (this.surf?.active) { if (!st.hud.panel && !this.transitioning) this.surf.stroke(); return; }
    if (useSurf.getState().picking) return;
    if (st.conv.active || st.hud.panel || this.rides.riding) return;
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
        const voice = ambientVoice(female ? "f" : "m");
        audio.play(voice, 1, line.en, { male: !female });
        w.ch.talk(audio.clipDuration(voice, 1, line.en) ?? 1.2, () => audio.level(), () => audio.vowel());
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
    const nav = this.zone.nav;
    // standing on something they jumped onto (a bench's seat): first straight down off it, to the nearest open spot
    // that its back or a wall beside it doesn't stand in the way of; the walk is planned from there
    let from: [number, number] = [p.x, p.z], down: [number, number][] = [];
    if (!this.zone.interior && this.ledges && this.hop.ground > 0.05) {
      let bd = Infinity;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const i = nav.idx(p.x + dx * nav.cell, p.z + dz * nav.cell);
        if (!nav.free(i)) continue;
        const [cx, cz] = nav.center(i), d = Math.hypot(cx - p.x, cz - p.z);
        if (d < bd && this.ledges.clear(p.x, p.z, cx, cz, this.hop.y)) { bd = d; from = [cx, cz]; down = [from]; }
      }
    }
    const path = nav.path(from[0], from[1], x, z);
    if (!path) { useStore.getState().toast({ kind: "info", title: "Ten nueiti negalima" }); return; }
    this.autoPath = [...down, ...path.slice(1)];
    this.autoTarget = target;
    this.stepOut = 0;
  }

  autoWalkToObjective() {
    // (at a wheel one drives there oneself: the marks on the ground lead the way)
    if (this.rides.riding) { useStore.getState().toast({ kind: "info", title: "Pirmiausia išlipk", body: "Arba važiuok pats – rodyklės ant žemės rodo kelią." }); return; }
    const tgt = this.objectiveTarget();
    if (!tgt) { useStore.getState().toast({ kind: "info", title: "Ši užduotis atliekama telefonu", body: "Atidaryk telefoną (P) ir paskambink." }); return; }
    this.walkTo(tgt.x, tgt.z, tgt.kind === "npc" ? { kind: "npc", id: tgt.id } : tgt.kind === "door" ? { kind: "door", id: tgt.id } : { kind: "exit" });
  }

  // ------------------------------------------------------------------ interaction

  interact() {
    // (lying on a surfboard: a paddle stroke)
    if (this.surf?.active) { if (!this.session?.active && !useStore.getState().hud.panel && !this.transitioning) this.surf.stroke(); return; }
    if (this.rides.riding) { if (!this.session?.active && !useStore.getState().hud.panel) this.rides.leave(); return; }
    const n = this.nearest;
    if (!n) return;
    if (n.kind === "ride") { const r = this.rides.list.find((q) => q.id === n.id); if (r) this.boardRide(r); }
    else if (n.kind === "climb") this.climbOut();
    else if (n.kind === "surf") this.surf?.open();
    else if (n.kind === "npc") this.talkTo(n.id);
    else if (n.kind === "door") this.enterDoor(n.id);
    else if (n.kind === "exit") this.exitInterior();
  }

  /** Out of the water onto a pier's boards (a swimmer beside them). */
  private climbOut() {
    const p = this.player.root.position, to = this.rides.climbOut(p.x, p.z);
    if (!to) return;
    const rot = Math.atan2(to.x - p.x, to.z - p.z);
    this.surface(true);
    p.copy(to);
    this.heading = rot;
    this.player.root.rotation.set(0, rot, 0);
    this.afterRide();
    audio.splash(0.6);
    audio.land(this.underfoot(true), 0.6);
  }

  private enterDoor(loc: string) {
    const it = getInterior(loc);
    if (!it) return;
    this.enterZone(loc, undefined, false, "in");
  }

  exitInterior() {
    if (!this.zone.interior) return;
    const loc = this.zone.id;
    const door = this.town.doors.find((d) => d.loc === loc);
    if (loc === "airport") { this.enterZone("town", AIRPORT_EXIT, false, "out"); return; }
    if (door) {
      // a metre further out than the door's own spot (clear of an awning's edge, so the camera has room behind)
      const x = door.outX + Math.sin(door.rot), z = door.outZ + Math.cos(door.rot);
      const out = this.town.walkableAt(x, z) ? { x, z } : { x: door.outX, z: door.outZ };
      this.enterZone("town", { ...out, rot: door.rot }, false, "out");
    } else this.enterZone("town");
  }

  sitsForNpc(npc: string): SituationMeta[] { return this.npcToSits.get(npc) ?? []; }

  /** Which situation to start with this NPC face to face: the objective, else the first not yet completed, else
   *  the first. Calls never start this way (Kate calls you on video, and also leads the team meeting in the office). */
  pickSituation(npc: string): SituationMeta | null {
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
    whenLoaded(sit.id, (def) => this.startSession(def, actor), () => !this.session?.active);
  }

  /** Situation picker: go straight into a conversation (no walking). The player appears in front of
   *  the NPC in the right place; phone and video calls start at once. */
  startScenario(sitId: string) {
    const sit = SITUATION_BY_ID[sitId];
    if (!sit) return;
    const st = useStore.getState();
    st.setHud({ panel: null });
    // (a conversation picked from the list in the middle of a surf lesson: the lesson is over)
    this.surf?.stop(true);
    this.lastScenario = sitId;
    prefetchSituations([sitId]);
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
    whenLoaded(sitId, (def) => this.startSession(def, null), () => !this.session?.active);
  }

  private startSession(sit: SituationDef, actor: NpcActor | null) {
    this.cancelRide();
    // a hop ends at once, and the player's own walk gives way to the conversation's stop (as it always was)
    this.hop.land(this.hop.ground); this.applyHop();
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.fader.reset();
    CUT.r.value = 0;
    this.autoPath = null; this.autoTarget = null; this.keys.clear(); this.joy = { x: 0, y: 0 };
    this.talkNpc = actor;
    coach.did("talk");
    const st = useStore.getState();
    st.setHud({ prompt: null, panel: null });
    if (actor) {
      // face each other (both turn in a moment: updatePlayer and updateNpcs) and frame both characters
      const p = this.player.root.position, a = actor.ch.root.position;
      const dir = new THREE.Vector3(a.x - p.x, 0, a.z - p.z);
      if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
      dir.normalize();
      this.heading = Math.atan2(dir.x, dir.z);
      // frame the player, the main NPC and anyone else taking part who stands nearby (Mark at the party, Nora at dinner…)
      const tc = THEME.talkCamera;
      const reach = tc ? tc.reach : 7;
      const others = (sit.npcs ?? []).map((id) => this.npcs.find((n) => n.id === id)).filter((n): n is NpcActor => !!n && n !== actor && n.ch.root.position.distanceTo(a) < reach);
      const pts = [p, a, ...others.map((n) => n.ch.root.position)];
      const mid = new THREE.Vector3(pts.reduce((t, q) => t + q.x, 0) / pts.length, 0, pts.reduce((t, q) => t + q.z, 0) / pts.length);
      const spread = Math.max(...pts.map((q) => Math.hypot(q.x - mid.x, q.z - mid.z)));
      const dist = Math.max(6, spread * 2.6);
      /** The camera `d` metres from the people; outdoors on their `side` (1 or -1; by default 1, or -1 if 1 is blocked). */
      const frame = (d: number, sideOf?: 1 | -1) => {
        if (this.zone.interior) {
          // from the open front, a little to the person's side, so the player's head doesn't hide their face
          const side = Math.sign(a.x - p.x) || 1, half = this.zone.interior.w / 2 - 1;
          const cx = THREE.MathUtils.clamp(mid.x + side * 1.8, -half, half);
          return { pos: new THREE.Vector3(cx, 4.2 + d * 0.07, mid.z + d + 0.2), look: new THREE.Vector3(mid.x, 1.3, mid.z) };
        }
        const side = new THREE.Vector3(dir.z, 0, -dir.x);
        let pos = mid.clone().addScaledVector(side, (sideOf ?? 1) * d).setY(3.2);
        if (!sideOf && this.town.colliders.blocked(pos.x, pos.z, 0.5)) pos = mid.clone().addScaledVector(side, -d).setY(3.2);
        pos.addScaledVector(dir, -1.2);
        return { pos, look: new THREE.Vector3(mid.x, 1.35, mid.z) };
      };
      // (this edition's camera, theme.ts talkCamera: backed off until everyone taking part is in the picture)
      this.rig.talk = tc ? this.fitTalk(frame, dist, tc.max, [{ ch: this.player }, actor, ...others]) : frame(dist);
      this.rig.mode = "talk";
      this.player.setAnim("idle");
    }
    const session: Session = new Session(sit.id, {
      npcTalk: (npcId, secs, text) => {
        const n = this.npcs.find((x) => x.id === npcId);
        if (!n) return;
        // the mouth follows the recording while the line is this person's (its loudness and its sound), and the face
        // what the line says
        n.ch.talk(secs, () => (useStore.getState().conv.npcId === npcId ? audio.level() : -1), () => audio.vowel());
        if (text) n.ch.express?.(moodOf(text), secs + 1.2);
      },
      npcReact: (npcId, kind) => { this.npcs.find((x) => x.id === npcId)?.ch.react?.(kind); },
      // ignore events from a conversation already closed (e.g. Esc during the driver's goodbye):
      // its "taxi-ride" would otherwise be queued for the next, unrelated conversation
      onEvent: (name, data) => { if (this.session === session) this.onSessionEvent(name, data); },
      onEnd: (s, completed) => this.endSession(s, completed),
    });
    this.session = session;
    this.session.begin();
  }

  /** The conversation's camera that keeps everyone taking part in the picture (theme.ts talkCamera). The framing at
   *  `d0` metres stays if the head and the chest of each of `who` (and a hand's breadth to each side) fall in the part
   *  of the screen the conversation panel leaves free (the picture shifted as the loop shifts it, applyViewShift) and,
   *  outdoors, nothing stands in front of them (see `seen`). Otherwise the camera backs off, a step at a time up to
   *  `max`, on either side of them outdoors, rising as it goes: indoors at the same angle, outdoors looking down at
   *  least 26° (more of the ground and less of the town behind them in the picture). The widest framing tried if none
   *  fits. */
  private fitTalk(frame: (d: number, side?: 1 | -1) => { pos: THREE.Vector3; look: THREE.Vector3 }, d0: number, max: number, who: { ch: GameCharacter; sit?: boolean }[]) {
    type Shot = { pos: THREE.Vector3; look: THREE.Vector3 };
    const w = this.container.clientWidth, h = this.container.clientHeight, wide = w > 900;
    // styles.css .convo: on a wide screen a panel min(500px, 42vw) wide on the right, 14 px in; on a phone 58vh tall
    // at the bottom, 8 px up. The free part of the screen, 10 px in from its edges, and the loop's shift of the picture.
    const m = 10;
    const x0 = m, x1 = (wide ? w - 14 - Math.min(500, 0.42 * w) : w) - m, y0 = m, y1 = (wide ? h : h - 8 - 0.58 * h) - m;
    const sx = wide ? Math.min(w * 0.22, 380) : 0, sy = wide ? 0 : h * 0.25;
    const cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 900);
    const v = new THREE.Vector3(), right = new THREE.Vector3();
    /** Each of the points checked on the people (their head and chest, and a hand's breadth to each side of them),
     *  seen from `f`, until `each` says no (`i`: whose). */
    const points = (f: Shot, each: (q: THREE.Vector3, i: number) => boolean) => {
      cam.position.copy(f.pos);
      cam.lookAt(f.look);
      cam.updateMatrixWorld();
      right.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
      for (let i = 0; i < who.length; i++) {
        const { ch, sit } = who[i], q = ch.root.position;
        for (const y of sit ? [0.72, 0.45] : [0.9, 0.62]) for (const s of [-0.25, 0, 0.25]) {
          if (!each(v.copy(q).addScaledVector(right, s).setY(q.y + y * ch.height), i)) return false;
        }
      }
      return true;
    };
    // On a phone held upright the picture is only the strip above the conversation (styles.css
    // --conversation-image-height; the loop's applyViewShift centres it there): each point must fall in that strip too,
    // 10 px in, for the people spoken with. A framing the old test passed and the strip shows stays as it was.
    const sideways = h <= 520 && w > h, strip = !wide && !sideways ? talkPictureHeight(h) : 0, ssy = (h - strip) / 2;
    // And the top of the head of each person spoken with (hair and hats included, 0.12 m to each side) under the
    // picture's top edge, 10 px in: the head and chest points alone passed with the top of a head cut off by the
    // strip's top edge (s65a's officer, s79's clerk…).
    const tops = who.map(({ ch }) => headTop(ch));
    const fits = (f: Shot) => points(f, (q, i) => {
      q.project(cam);
      const px = (q.x + 1) / 2 * w - sx, py = (1 - q.y) / 2 * h - sy;
      if (!(q.z <= 1 && px >= x0 && px <= x1 && py >= y0 && py <= y1)) return false;
      // (the people spoken with: the player, nearest the camera, may reach below the strip)
      const sy2 = (1 - q.y) / 2 * h - ssy;
      return !strip || i === 0 || (sy2 >= m && sy2 <= strip - m);
    }) && who.every(({ ch }, i) => i === 0 || [-0.12, 0, 0.12].every((s) => {
      const q = v.copy(ch.root.position).addScaledVector(right, s).setY(ch.root.position.y + tops[i]).project(cam);
      return q.z <= 1 && (strip ? (1 - q.y) / 2 * h - ssy : (1 - q.y) / 2 * h - sy) >= m;
    }));
    // Outdoors: the camera clear of anything solid, and nothing in front of anyone: of the six lines from the camera to
    // a person's points, at most three may pass through a building (to its roof), a post or a trunk (the colliders'
    // circles, to 4 m; not the people's own) or something low (the colliders' boxes: cars, counters, walls, to 1.2 m).
    const col = this.town.colliders;
    const boxes = this.zone.interior ? [] : BUILDINGS.map((b) => ({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2, h: b.h + (b.roof === "gable" ? Math.min(b.w, b.d) * 0.32 : 0) }));
    const seen = (f: Shot) => {
      if (this.zone.interior) return true;
      if (col.blocked(f.pos.x, f.pos.z, 0.5)) return false;
      const o = f.pos;
      // (only what stands within the lines' reach)
      let x0 = o.x, x1 = o.x, z0 = o.z, z1 = o.z;
      for (const { ch } of who) { const q = ch.root.position; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
      const near = <T extends { minX: number; maxX: number; minZ: number; maxZ: number }>(b: T) => b.maxX > x0 - 1 && b.minX < x1 + 1 && b.maxZ > z0 - 1 && b.minZ < z1 + 1;
      const tall = boxes.filter(near), low = col.boxes.filter(near);
      const posts = col.circles.filter((c) => !(c as { npc?: string }).npc && c.x > x0 - 1 - c.r && c.x < x1 + 1 + c.r && c.z > z0 - 1 - c.r && c.z < z1 + 1 + c.r);
      const hidden = who.map(() => 0);
      return points(f, (q, k) => {
        for (let i = 1; i < 30; i++) {
          const t = i / 30, x = o.x + (q.x - o.x) * t, y = o.y + (q.y - o.y) * t, z = o.z + (q.z - o.z) * t;
          const inside = (b: { minX: number; maxX: number; minZ: number; maxZ: number }) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
          if (tall.some((b) => y < b.h && inside(b)) || (y < 1.2 && low.some(inside)) || (y < 4 && posts.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r))) return ++hidden[k] < 4;
        }
        return true;
      });
    };
    const first = frame(d0);
    if (seen(first) && fits(first)) return first;
    const lift = first.pos.y - first.look.y;
    const at = (d: number, side?: 1 | -1) => {
      const f = frame(d, side);
      const run = Math.hypot(f.pos.x - f.look.x, f.pos.z - f.look.z);
      f.pos.y = f.look.y + (this.zone.interior ? lift * d / d0 : Math.max(lift * d / d0, run * 0.5));
      return f;
    };
    // On a phone held upright the camera also looks a little higher (up to 0.4 m at the people) before it backs off:
    // the heads come down into the strip and the people keep their size; the player, in front, sinks a little.
    const raise = strip ? [0, 0.1, 0.2, 0.3, 0.4] : [0];
    let best: Shot | null = null;
    for (let d = d0; d <= max * 1.001; d = Math.min(d * 1.08, d < max ? max : d * 2)) {
      for (const side of this.zone.interior ? [undefined] : [1, -1] as const) {
        const f0 = at(d, side);
        if (!seen(f0)) continue;
        best ??= f0;
        for (const r of raise) {
          const f = r ? { pos: f0.pos, look: f0.look.clone().setY(f0.look.y + r) } : f0;
          if (fits(f)) return f;
        }
      }
    }
    return best ?? first;
  }

  private onSessionEvent(name: string, data: any) {
    showConversationEvent(name, data);
    if (name === "pay") audio.sfx("coin");
    if (name === "taxi-ride" && data?.to) this.pendingRide = { to: data.to, by: "taxi" };
    if (name === "bus-ride" && data?.to) this.pendingRide = { to: data.to, by: "bus" };
    if (name === "go" && data?.zone) this.pendingRide = { to: data.zone, by: "taxi" };
    if (name === "board") this.pendingRide = { to: "airport", by: "plane" };
    // "¿Probamos una ola?": the surf lesson starts as the conversation ends
    if (name === "surf" && this.surf) this.pendingSurf = data?.level === "advanced" ? "advanced" : "beginner";
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
    // the person stays turned to the player and turns back home in their own time (updateNpcs)
    this.talkNpc = null;
    if (this.pendingRide) { const r = this.pendingRide; this.pendingRide = null; this.ride(r.to, r.by); }
    if (this.pendingSurf) { const l = this.pendingSurf; this.pendingSurf = null; if (completed) this.surf?.start(l); }
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

  orderedSituations(): SituationMeta[] {
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

  currentObjective(): SituationMeta | null {
    const pr = useStore.getState().progress;
    if (pr.objective && SITUATION_BY_ID[pr.objective]) return SITUATION_BY_ID[pr.objective];
    const first = this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions) ?? null;
    return first;
  }

  /** Where to guide the player right now for the current objective; for a person, where to stand to talk to them (their
   *  `ax/az` across a counter, a stall or a table, with `person` where they stand; else where they stand). */
  objectiveTarget(): { kind: "npc" | "door" | "exit"; id?: string; x: number; z: number; person?: { x: number; z: number }; label: string } | null {
    const sit = this.currentObjective();
    if (!sit) return null;
    const loc = LOCATIONS[sit.location];
    if (!loc || loc.kind === "phone" || sit.mode === "phone" || sit.mode === "video") return null;
    const npcSpotInterior = (it: Interior) => it.npcs.find((n) => n.npc === sit.npc) ?? it.npcs[0];
    if (loc.kind === "outdoor") {
      if (this.zone.interior) return { kind: "exit", x: this.zone.interior.exit.x, z: this.zone.interior.exit.z - 0.4, label: "Išeiti į lauką" };
      const o = OUTDOOR_NPCS.find((n) => n.npc === sit.npc);
      return o ? { kind: "npc", id: sit.npc, ...talkAt(o), label: NPCS[sit.npc]?.name ?? "" } : null;
    }
    if (this.zone.id === sit.location && this.zone.interior) {
      const s = npcSpotInterior(this.zone.interior);
      const npc = sit.npc === "sam" || sit.npc === "emma" ? this.chosenDatePartner() : sit.npc;
      const spot = this.zone.interior.npcs.find((n) => n.npc === npc) ?? s;
      return { kind: "npc", id: spot.npc, ...talkAt(spot), label: NPCS[spot.npc]?.name ?? "" };
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
    this.showBeacon(tgt);
    this.pathT = 0;
  }

  /** The beacon over the objective's door or person; for someone talked to across a counter (a spot of their own), it
   *  stays over them and its ring lies on that spot, where the trail ends. */
  private showBeacon(tgt: ReturnType<Game["objectiveTarget"]>) {
    if (!tgt) { this.guidance.setBeacon(null); return; }
    const over = tgt.person ?? tgt;
    this.guidance.setBeacon(over.x, over.z, tgt.kind === "npc" ? 2.9 : 3.8, tgt.person ? { x: tgt.x, z: tgt.z } : undefined);
  }

  // ------------------------------------------------------------------ loop

  private onResize = () => {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.rig.cam.aspect = w / h;
    this.rig.cam.updateProjectionMatrix();
  };

  /** Resolution that follows the phone: every 2 s, slow frames (under about 45 a second) lower the pixel ratio a
   *  step, and 6 s of easy frames raise it again, between 1 and the quality's top. */
  private perf = { last: 0, acc: 0, n: 0, easy: 0 };
  private adaptResolution(now: number) {
    const p = this.perf;
    if (p.last) { p.acc += Math.min(now - p.last, 100); p.n++; }
    p.last = now;
    if (p.acc < 2000) return;
    const avg = p.acc / p.n, q = useStore.getState().settings.quality;
    p.acc = 0; p.n = 0;
    const top = Math.min(window.devicePixelRatio, q === "high" ? 1.75 : 1), pr = this.renderer.getPixelRatio();
    if (avg > 22 && pr > 1) { this.renderer.setPixelRatio(Math.max(1, pr - 0.25)); this.onResize(); p.easy = 0; }
    else if (avg < 17 && pr < top) { if ((p.easy += 2) >= 6) { this.renderer.setPixelRatio(Math.min(top, pr + 0.25)); this.onResize(); p.easy = 0; } }
    else p.easy = 0;
  }

  private loop = () => {
    if (this.disposed) return;
    this.adaptResolution(performance.now());
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    const st = useStore.getState();
    const talking = !!this.session?.active;
    const surfing = !!this.surf?.active;
    const blocked = talking || !!st.hud.panel || this.transitioning || useSurf.getState().picking;
    this.updatePlayer(dt, blocked, this.transitioning && !talking && !st.hud.panel && !surfing);
    // (what one can drive: its people, the way back to its curb; at the wheel it is moved from updatePlayer)
    const riding = this.rides.riding;
    if (!riding) this.rides.update(dt, this.t, null);
    audio.motor(riding && this.rides.phase === "on" && !this.zone.interior ? riding.kind : null, this.rides.revs);
    this.updateNpcs(dt, talking);
    if (!this.zone.interior) this.ambient.update(dt, this.player.root.position);
    this.town.update(this.t, dt);
    this.zone.interior?.update?.(this.t, dt);
    this.guidance.visible = !talking && !surfing;
    this.guidance.group.visible = !talking && !surfing;
    this.guidance.update(dt, this.zone.interior ? undefined : floorY);
    // guidance path (throttled)
    this.pathT -= dt;
    if (this.pathT <= 0 && !talking && !surfing) {
      this.pathT = 0.5;
      const tgt = this.objectiveTarget();
      const p = this.player.root.position;
      if (tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) > 2.2) this.guidance.setPath(this.zone.nav.path(p.x, p.z, tgt.x, tgt.z));
      else this.guidance.setPath(null);
      if (tgt) this.showBeacon(tgt);
    }
    // camera: where the player is heading and how fast (it swings in behind them after a moment, camera.ts)
    const speed = Math.hypot(this.moveVel.x, this.moveVel.z);
    // (at a wheel the camera stays behind the car, backing up too)
    this.rig.motion.dir = riding ? this.rideCourse : surfing ? this.heading : speed > 0.3 ? Math.atan2(this.moveVel.x, this.moveVel.z) : this.heading;
    this.rig.motion.speed = speed;
    // (where they will be in a moment, walking on as now, out of the walls: the camera makes room before it is needed)
    this.rig.motion.next.copy(this.player.root.position).addScaledVector(this.moveVel, 0.3).setY(0);
    if (speed > 0.3) this.zone.colliders.resolve(this.rig.motion.next, 0.38, !this.zone.interior);
    this.rig.dragging = this.pointer.down && this.pointer.moved > 6;
    this.rig.hold = this.hop.air && !this.zone.interior;
    // (up with a jump by half its height: the second jump's top stays in the picture)
    this.rig.target.lerp(this.tmpV.copy(this.player.root.position).setY(this.player.root.position.y + this.hop.lift * 0.5), Math.min(1, dt * 10));
    this.rig.update(dt, this.heading, speed > 0.7, true, (st.settings.cameraFollow || !!riding) && !this.pointer.down);
    // under the water (a dive: the camera below the surface): the seabed, the fish, the water's own light
    {
      const cp = this.rig.cam.position, pp1 = this.player.root.position, sur = this.zone.interior ? null : waterY(pp1.x, pp1.z, this.t);
      const under = sur !== null && this.diveK > 0.2 && cp.y < sur - 0.1;
      if (this.swimming || this.undersea.on) this.undersea.update(dt, this.t, under, this.tmpV.set(pp1.x + Math.sin(this.heading) * 0.4, pp1.y + 1.2, pp1.z + Math.cos(this.heading) * 0.4), speed / SWIM.speed);
      this.underWater(this.undersea.on);
    }
    // the lens (camera.ts fovFor): wider while walking, a touch more at a run (a sense of speed), the conversation's
    // 50° exactly
    {
      const fov = this.rig.fovFor(this.container.clientWidth, this.container.clientHeight, this.rig.mode === "follow" && this.vel.lengthSq() > 30) + (this.rig.mode === "follow" ? this.rideFov : 0);
      const d = fov - this.rig.cam.fov;
      if (d !== 0) {
        this.rig.cam.fov = Math.abs(d) < 0.05 ? fov : this.rig.cam.fov + d * Math.min(1, dt * (this.rig.mode === "talk" ? 4.5 : 3));
        this.rig.cam.updateProjectionMatrix();
      }
    }
    // people and cars far down the street, a few pixels tall in the haze, are left out of the walking view (it is wider
    // than it was: this keeps its draw calls as they were)
    this.farCull();
    // the trees between the camera and the player fade (fade.ts); none in a conversation or indoors
    const pp0 = this.player.root.position;
    this.chest.set(pp0.x, 1.35, pp0.z);
    this.fader.update(dt, this.rig.cam.position, this.chest, this.rig.mode === "follow" && !this.zone.interior);
    // and what is too thin for either (a lamp post right in the way) is see-through along the line to the player
    CUT.a.value.copy(this.rig.cam.position);
    CUT.b.value.copy(this.chest);
    CUT.r.value = this.rig.mode === "follow" && !this.zone.interior ? 0.55 : 0;
    // shift the picture while the conversation panel is open; on a phone held upright, walking around, the player
    // stands lower in the picture (about two thirds down), so the street ahead shows instead of the ground underfoot
    {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (talking && this.talkNpc) {
        const sideways = h <= 520 && w > h;
        const wide = w > 900 && !sideways;
        // Match the conversation's visible picture area, including scenes-off 3D conversations.
        const pictureHeight = talkPictureHeight(h);
        this.rig.applyViewShift(w, h, sideways ? w * 0.375 : wide ? Math.min(w * 0.22, 380) : 0,
          wide || sideways ? 0 : (h - pictureHeight) / 2);
      } else this.rig.applyViewShift(w, h, 0, this.rig.mode !== "talk" && h > w * 1.15 ? -h * (this.rig.mode === "follow" ? 0.12 : 0.1) : 0);
    }
    // sun follows the player for crisp shadows
    const pp = this.player.root.position;
    this.sun.position.set(pp.x - 40, 70, pp.z + 30);
    this.sun.target.position.set(pp.x, 0, pp.z);
    this.fx?.frame(pp, !!this.zone.interior);
    this.sky.position.copy(this.rig.cam.position);
    // an illustrated scene covers the view during the conversation: save the phone's battery
    const covered = this.covered = talking && picturesOn(st.settings) && !!sceneFor(st.conv.sitId, st.conv.hostId);
    if (!covered) {
      this.renderer.render(this.scene, this.rig.cam);
      this.updateTags();
    }
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.12;
      this.updateHud();
      // The town's sounds where the player stands (audio.ambience), only while the town is visible and no
      // conversation or panel is open: gulls, birds and the surf by the sea, a murmur where people gather, a cup in a
      // café, the harbour's bell by the pier, a few far-off notes on the square.
      const px = this.player.root.position.x, pz = this.player.root.position.z, sea = THREE.MathUtils.clamp(1 - (pz - SEA_Z) / 70, 0, 1);
      const out = !this.zone.interior, { tropical, marketOutdoors } = TOWN_SOUNDS;
      const inPark = px > PARK.x1 - 6 && px < PARK.x2 + 6 && pz > PARK.z1 - 6 && pz < PARK.z2 + 6;
      const onSquare = px > SQUARE.x1 - 4 && px < SQUARE.x2 + 4 && pz > SQUARE.z1 - 4 && pz < SQUARE.z2 + 4;
      const cafe = this.zone.interior && ["sunny-cup", "trattoria", "the-pier"].includes(this.zone.id);
      const near = (loc: string, reach?: number) => { const d = this.town.doors.find((door) => door.loc === loc); return d ? nearLevel(Math.hypot(px - d.outX, pz - d.outZ), reach) : 0; };
      // people's murmur: in the market and the cafés; outdoors on the square, and around a market hall's door
      const market = !out ? (this.zone.id === "market" ? 0.75 : cafe ? 0.45 : 0) : Math.max(onSquare ? 0.3 : 0, marketOutdoors ? near("market") : 0);
      audio.ambience(this.ambienceAllowed(), {
        sea, surf: out ? surfLevel(pz - SHORE.top) : 0, gulls: out && sea > 0.4, birds: out ? (inPark ? 1 : 0.35 * (1 - sea)) : 0, cafe,
        market, harbor: out ? near("the-pier", 34) * sea : 0, plaza: out && onSquare ? 1 : 0, tropical,
      });
    }
    // "walking" for the HUD (the task card folds away on a phone while you walk): after 0.4 s on the move, until
    // 1.2 s standing still
    if (this.vel.lengthSq() > 1) { this.moveT += dt; this.stillT = 0; } else { this.stillT += dt; this.moveT = 0; }
    const walking = st.hud.walking ? this.stillT < 1.2 : this.moveT > 0.4;
    if (walking !== st.hud.walking) st.setHud({ walking });
  };

  /** An illustrated scene covers the town (a conversation in pictures). */
  private covered = false;

  /** At a car's wheel or a boat's helm: the keys or the stick drive it (rides/drive.ts), the player sits in it. */
  private updateRide(dt: number, blocked: boolean) {
    const r = this.rides.riding!, m = r.m;
    let x = 0, y = 0;
    if (!blocked) {
      if (this.keys.has("arrowup") || this.keys.has("w")) y += 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) y -= 1;
      if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
      if (this.joy.x !== 0 || this.joy.y !== 0) { x = this.joy.x; y = this.joy.y; }
    }
    this.rides.update(dt, this.t, blocked ? null : controlsFrom(x, y, this.keys.has(" ") || this.brake));
    // (getting out ends the ride inside update: the player is on foot again, leftRide has set them down)
    if (this.rides.riding !== r) return;
    const on = this.rides.phase === "on", v = on ? m.speed : 0, pace = on ? m.pace : 0, car = r.kind === "car";
    this.heading = on ? m.heading : this.player.root.rotation.y;
    this.vel.set(on ? m.vx : 0, 0, on ? m.vz : 0);
    this.moveVel.lerp(this.vel, Math.min(1, dt * 15));
    this.lastSpeed = pace;
    // the camera looks along the way it is going: in a slide that is not where it points, and the car is seen side on
    {
      const want = on && pace > 2.5 && v > 0 && Math.abs(m.slip) > 1 ? Math.atan2(m.vx, m.vz) : this.heading;
      const d = Math.atan2(Math.sin(want - this.rideCourse), Math.cos(want - this.rideCourse));
      this.rideCourse += d * Math.min(1, dt * (Math.abs(d) > 2 ? 30 : 7));
    }
    // a sense of speed: at its open-road pace the camera drops back a little and the lens widens; more for the kick
    {
      const k = on ? Math.max(0, Math.min(1.2, (pace - m.spec.town * 0.8) / (m.spec.max - m.spec.town * 0.8))) : 0, kick = on && m.boost > 0 ? 1 : 0;
      const back = k * (car ? 0.13 : 0.1) + kick * 0.05;
      // (the wheel's own zoom stays the player's: only what was added is taken off again)
      const base = this.rig.dist / (1 + this.rideBack);
      this.rideBack += (back - this.rideBack) * Math.min(1, dt * 2.2);
      this.rig.dist = base * (1 + this.rideBack);
      this.rideFov += (k * (car ? 9 : 6) + kick * 5 - this.rideFov) * Math.min(1, dt * 3);
    }
    // the sounds of it: the tires in a slide (or the hull's rush), the air at speed, a rush at the kick
    {
      const slide = on ? Math.min(1, Math.max(0, (Math.abs(m.slip) - 1.2) / 4.5)) : 0;
      audio.rush("squeal", car && slide > 0 && pace > 2.5 && this.rides.asphalt.has(m.x, m.z) ? 0.35 + 0.65 * slide : 0, Math.min(1, pace / 14));
      audio.rush("wind", on ? Math.max(0, (pace - 6) / (m.spec.max - 3)) * (car ? 1 : 0.8) + (!car ? slide * 0.5 : 0) : 0, Math.min(1, pace / 16));
      if (on && m.boost > 0 && !this.kicked) { this.kicked = true; audio.kickRush(); }
      if (!on || m.boost <= 0) this.kicked = false;
      // (the first time it goes fast: a word about the slide)
      if (on && !this.slideTold && pace > m.spec.town * 0.92 && Math.abs(m.steer) < 0.3) {
        this.slideTold = true;
        const touch = useStore.getState().hud.showTouch;
        useStore.getState().toast({ kind: "tip", title: car ? "Paslysk posūkyje!" : "Paslysk bangomis!", body: touch ? "Sukdamas laikyk STOP – šonu per posūkį. Paleidęs gausi pagreitį." : "Sukdamas laikyk Tarpą – šonu per posūkį. Paleidęs gausi pagreitį.", ms: 6000 });
      }
    }
    {
      const fast = on && pace > (car ? CAR_DRIFT.from : BOAT_DRIFT.from);
      const hud = useStore.getState();
      if (hud.hud.fast !== fast) hud.setHud({ fast });
    }
    this.player.moveSpeed = 0;
    this.player.update(dt);
    this.bumpT -= dt;
    if (m.bump > 0.3 && this.bumpT <= 0) { audio.bump(m.bump); this.bumpT = 0.45; }
    // a boat's wake: the water's rings round its hull, wider and brighter the faster it goes; a car's dust at its back
    // wheels when it goes fast or over open ground, a short skid when it is braked hard
    const av = pace;
    if (r.kind === "boat" && on) this.splashes.update(dt, this.t, { x: m.x - m.fx * 0.6, y: (waterY(m.x, m.z, this.t) ?? SEA_LEVEL) + 0.02, z: m.z - m.fz * 0.6 }, Math.min(1, av / 6), 2.6 + Math.min(1.4, Math.abs(m.slip) * 0.3));
    else this.splashes.update(dt, this.t, null, 0);
    if (r.kind === "car" && on) {
      const braking = !blocked && !m.drift && (this.keys.has(" ") || this.brake || y < -0.35) && v > 0;
      if (braking && !this.braked && av > 8.5) audio.skid(Math.min(1, av / 15));
      this.braked = braking;
      this.dustT -= dt;
      // (smoke off the back wheels in a slide, thick and fast; dust at speed, over open ground, braked hard)
      const sliding = m.sliding && av > 3;
      if (this.dustT <= 0 && (sliding || useStore.getState().settings.quality === "high") && (sliding || av > 9 || (av > 3 && !this.rides.asphalt.has(m.x, m.z)) || (braking && av > 5))) {
        this.dustT = sliding ? 0.05 : 0.11;
        const s = Math.sign(v) || 1, cx = av > 0.5 ? -m.vx / av : -m.fx * s, cz = av > 0.5 ? -m.vz / av : -m.fz * s;
        for (const side of sliding && useStore.getState().settings.quality !== "high" ? [Math.random() < 0.5 ? -0.8 : 0.8] : [-0.8, 0.8]) this.dust.puff(m.x - m.fx * 1.4 * s + m.fz * side, m.z - m.fz * 1.4 * s - m.fx * side, cx, cz, (sliding ? 1.25 : 0.8) + av / 15);
      }
    }
    this.dust.update(dt);
    // (the pigeons on the square take off before a car as before anyone running)
    if (r.kind === "car" && !this.zone.interior) this.pigeons.update(dt, this.player.root.position, Math.abs(v));
    coach.stroll(dt, true, useStore.getState().hud.showTouch);
  }

  /** In the surf lesson (surf/play.ts): the keys or the stick are the board's, the lesson puts the player where they are. */
  private updateSurf(dt: number, blocked: boolean) {
    let x = 0, y = 0;
    if (!blocked) {
      if (this.keys.has("arrowup") || this.keys.has("w")) y += 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) y -= 1;
      if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
      if (this.joy.x !== 0 || this.joy.y !== 0) { x = this.joy.x; y = this.joy.y; }
    }
    this.surf!.update(dt, this.t, x, y, blocked);
    if (!this.surf!.active) return;
    this.heading = this.surf!.heading;
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.lastSpeed = 0;
    this.player.update(dt);
    this.splashes.update(dt, this.t, null, 0);
    this.dust.update(dt);
  }

  /** Onto the surfboard: whatever the player was doing on foot stops there. */
  private onSurf() {
    this.endRide();
    this.autoPath = null; this.autoTarget = null;
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.hop.land(0); this.applyHop();
    this.surface(true);
    this.player.bank = 0;
    this.keys.clear();
    this.nearest = null;
    this.guidance.setPath(null);
  }

  /** Off it: on the sand by the school's boards, the walking camera behind them. */
  private offSurf(x: number, z: number, rot: number) {
    const p = this.player.root.position;
    p.set(x, floorY(x, z), z);
    this.heading = rot;
    this.player.root.rotation.set(0, rot, 0);
    this.hop.land(p.y); this.applyHop();
    this.gait.sync(this.heading, 0); this.gaitOn = false; this.steer.reset();
    this.keys.clear();
    this.rig.mode = "follow";
    this.rig.target.copy(p);
    this.rig.yaw = rot; this.rig.snap();
    this.nearest = null;
  }

  // (the surf lesson's buttons on the screen: src/ui/Surf.tsx)
  surfStart(level: "beginner" | "advanced") { if (!this.session?.active && !this.zone.interior) this.surf?.start(level); }
  surfStop() { this.surf?.stop(); }
  surfChoose(cue: string) { if (!this.transitioning) this.surf?.choose(cue); }
  surfAgain(level?: "beginner" | "advanced") { this.surf?.again(level); }

  /** `through`: a door's fade is under way: the player holds still, and a walk under way carries on on the other side. */
  private updatePlayer(dt: number, blocked: boolean, through = false) {
    if (this.surf?.active) { this.updateSurf(dt, blocked); return; }
    if (this.rides.riding) { this.updateRide(dt, blocked); return; }
    const p = this.player.root.position;
    let ix = 0, iz = 0;
    if (!blocked || through) {
      if (this.keys.has("arrowup") || this.keys.has("w")) iz += 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) iz -= 1;
      if (this.keys.has("arrowleft") || this.keys.has("a")) ix -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) ix += 1;
    }
    // the keys or the stick → a heading (movement.ts Steer: the direction as the camera shows it when pressed; the
    // camera's own swing behind the player doesn't turn it, the player's drag does); the stick pushed far: a run
    const stick = (!blocked || through) && (this.joy.x !== 0 || this.joy.y !== 0);
    const jm = Math.hypot(this.joy.x, this.joy.y);
    this.joyRun = stick && (jm > 0.9 || (this.joyRun && jm > 0.8));
    const turned = this.rig.manualTurn;
    this.rig.manualTurn = 0;
    const camYaw = this.rig.mode === "follow" ? this.rig.yaw : Math.PI;
    const steer = this.steer.update(stick ? this.joy.x : ix, stick ? this.joy.y : iz, stick, camYaw, turned, dt);
    if (steer.dir !== null) this.stepOut = 0;
    let want = new THREE.Vector3();
    // the pace: a walk; outdoors a jog after a moment's steady walking one way (a turn, a stop or deep water starts the
    // count again), a run with Shift or the stick at its edge; indoors always a walk; slower the deeper one wades
    const indoor = !!this.zone.interior;
    if (!indoor && steer.dir !== null && this.wading.depth < 0.3 && !this.swimming && !(this.jogT > 0.4 && this.lastSpeed < 2)) {
      if (this.jogDir === null || Math.abs(angleDiff(steer.dir, this.jogDir)) > 0.55) { this.jogDir = steer.dir; this.jogT = 0; }
      // (a long curve is still one way: the direction counted from follows slowly)
      this.jogDir += angleDiff(steer.dir, this.jogDir) * Math.min(1, dt * 0.8);
      this.jogT += dt;
    } else { this.jogT = 0; this.jogDir = null; }
    const pace = indoor ? 1 : Wading.pace(this.wading.depth);
    let speed = (indoor ? WALK : this.keys.has("shift") || this.joyRun ? RUN : WALK + (JOG - WALK) * smoothstep(JOG_AFTER, JOG_AFTER + JOG_EASE, this.jogT)) * pace;
    // (in deep water: a calm stroke, quicker with Shift or the stick at its edge; slower under water)
    if (this.swimming) speed = this.diveK > 0.5 ? SWIM.speed * 0.85 : this.keys.has("shift") || this.joyRun ? SWIM.fast : SWIM.speed;
    const before = p.clone();
    if (through) {
      // (through a door: nothing moves until the other side)
    } else if (!blocked && (steer.dir !== null || ((this.stepOut > 0 || this.gaitOn) && !this.autoPath?.length))) {
      // the player's own walk: turn towards the direction (quickly, eased; a big turn slows them first), the speed eased
      // in and out (movement.ts Gait)
      if (!this.gaitOn) {
        this.gait.sync(this.heading, Math.max(0, this.vel.x * Math.sin(this.heading) + this.vel.z * Math.cos(this.heading)));
        this.gaitOn = true;
      }
      let dir = steer.dir, goal = speed * (stick && !this.joyRun ? Math.min(1, steer.mag / 0.9) : 1);
      if (dir === null && this.stepOut > 0) { dir = this.heading; goal = 2.6; }
      const v = this.gait.step(dt, dir, dir === null ? 0 : goal);
      this.vel.set(v.vx, 0, v.vz);
      if (dir === null && this.gait.speed === 0) this.gaitOn = false;
    } else {
      this.gaitOn = false;
      // walking to a clicked spot, a door or a person (G, a tap), and the stop when a conversation starts: as before
      if (this.autoPath && this.autoPath.length && !blocked) {
        const [tx, tz] = this.autoPath[0];
        const d = Math.hypot(tx - p.x, tz - p.z);
        if (d < 0.35) {
          this.autoPath.shift();
          if (!this.autoPath.length) this.arrived();
        } else {
          want.set(tx - p.x, 0, tz - p.z).normalize();
          const remaining = d + this.autoPath.slice(1).reduce((a, b, i, arr) => a + (i ? Math.hypot(b[0] - arr[i - 1][0], b[1] - arr[i - 1][1]) : 0), 0);
          speed = (remaining > 12 && !indoor ? RUN : WALK) * pace;
          // arrive next to an NPC rather than on top of them (a spot of their own to talk from, across a counter or a
          // table, is walked onto); and, held up on the way (walking but getting nowhere: someone in the way), as soon
          // as they are close enough to talk to
          if (this.autoTarget?.kind === "npc") {
            const a = this.npcs.find((n) => n.id === this.autoTarget!.id);
            const heldUp = this.vel.lengthSq() > 4 && this.lastSpeed < 0.5;
            if ((this.autoPath.length === 1 && d < 1.6 && !a?.approach) || (a && heldUp && talkDist(a, p) < TALK_RANGE)) { this.autoPath = []; this.arrived(); want.set(0, 0, 0); }
          }
        }
      }
      const target = want.multiplyScalar(speed);
      this.vel.lerp(target, Math.min(1, dt * (target.lengthSq() ? 10 : 12)));
      if (this.vel.lengthSq() < 0.0004) this.vel.set(0, 0, 0);
    }
    if (!through) {
      // (past the wading limit one swims; a step out of the bay fades to nothing at its edge: no wall, no bounce)
      const sea = !indoor && p.z < SHORE.limit;
      p.x += sea ? bayHold(p.x, bayHold(p.x, this.vel.x * dt, BAY.x0, -1), BAY.x1, 1) : this.vel.x * dt;
      p.z += sea ? bayHold(p.z, this.vel.z * dt, BAY.z0, -1) : this.vel.z * dt;
      // outdoors the player's own ground plan: what is low enough to jump onto has its height (ledges.ts), and the
      // sea's edge is open as far as one can wade
      this.zone.colliders.resolve(p, 0.38, !indoor);
      if (!indoor) {
        this.ledges?.resolve(p, 0.38, this.hop.y, this.hop.air);
        this.ambient.resolvePlayer(p, 0.38); this.ambient.resolvePeople(p, 0.38, true);
        // (the convertibles and their people standing about; swimming, the rocks and the boats at anchor)
        this.rides.resolvePlayer(p, 0.38, this.swimming);
        if (p.z < BAY.z0) p.z = BAY.z0;
      }
    }
    if (this.stepOut > 0) {
      // (stepping out of a door: done after its two steps, or at once if something stands in the way)
      const dd = p.distanceTo(before);
      this.stepOut = dd < 1e-3 && this.gait.speed > 1 ? 0 : Math.max(0, this.stepOut - dd);
    }
    // interior bounds / door push
    if (this.zone.interior) {
      const it = this.zone.interior;
      if (p.z > it.d / 2 - 0.2 && Math.abs(p.x) < 1.2 && this.vel.z > 0.5) { this.exitInterior(); }
    } else {
      this.checkDoorPush(dt);
    }
    const moved = p.distanceTo(before) / Math.max(dt, 1e-4);
    // how the player really moves (sliding along a wall, not into it), for the camera
    if (dt > 0) this.moveVel.lerp(this.tmpV.subVectors(p, before).divideScalar(dt).setY(0), Math.min(1, dt * 15));
    if (this.gaitOn) {
      this.heading = this.gait.facing;
      this.player.root.rotation.y = this.heading;
    } else if (this.vel.lengthSq() > 0.05) {
      const h = Math.atan2(this.vel.x, this.vel.z);
      let d = h - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 12);
      this.player.root.rotation.y = this.heading;
    } else {
      // standing still: finish turning to the heading (towards someone a conversation has just started with)
      let d = this.heading - this.player.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > 1e-3) this.player.root.rotation.y += d * Math.min(1, dt * 9);
    }
    const running = moved > 5.5 || (through && this.gaitOn && this.gait.speed > 5.5);
    const going = through && this.gaitOn ? this.gait.speed : moved;
    this.player.setAnim(this.swimK > 0.5 ? "idle" : running ? "run" : going > 0.4 ? "walk" : "idle");
    this.player.moveSpeed = going;
    // the guide's hints about walking and running tick themselves off; later, a long stretch at a walk brings the tip
    // about running, once
    if (this.gaitOn && !blocked) {
      coach.did("walk", moved * dt);
      if (moved > 5.5) coach.did("run", dt);
    }
    coach.stroll(dt, indoor || blocked || !this.gaitOn || moved < 2 || this.keys.has("shift") || this.joyRun, useStore.getState().hud.showTouch);
    // a lean into turns, more the faster you go
    const dh = Math.atan2(Math.sin(this.heading - this.lastHeading), Math.cos(this.heading - this.lastHeading));
    const turn = this.vel.lengthSq() > 0.05 ? dh / Math.max(dt, 1e-4) : 0;
    this.lastHeading = this.heading;
    const bank = THREE.MathUtils.clamp(-turn * moved * 0.012, -0.14, 0.14);
    this.player.bank = (this.player.bank ?? 0) + (bank - (this.player.bank ?? 0)) * Math.min(1, dt * 8);
    // what is under their feet: a bench's seat or a planter's rim they jumped onto, else the ground, which by the sea
    // is the sand sloping down under the water (but for a pier's or a terrace's boards over it). A jump lands on it;
    // walking off an edge is a fall.
    const on = indoor ? 0 : this.ledges?.support(p.x, p.z, this.hop.y, this.hop.air) ?? 0;
    const ground = indoor ? 0 : on > 0 ? on : floorY(p.x, p.z);
    // the water here (the sea with its swell, a pool's), and how much of it is over what is underfoot
    const sur = indoor ? null : waterY(p.x, p.z, this.t), surface = sur ?? -99;
    const over = sur === null || on > 0 ? 0 : sur - ground;
    // deep enough, and in it (someone who jumps off the pier swims once their feet are under): they float and swim
    const wasSwimming = this.swimming;
    this.swimming = !through && over > (wasSwimming ? SWIM.out : SWIM.depth) && this.hop.y < surface - 0.3;
    let landed = 0;
    if (this.swimming) {
      // the chest at the surface, the body along it (Character.swim); on a dive, under, but clear of the bed
      const tall = this.player.height / 1.75, float = surface - SWIM.float * tall;
      if (this.diveT > 0 && (this.diveT -= dt) <= 0) this.diveT = 0;
      if (over < SWIM.dive + 0.7) this.diveT = 0;
      this.diveK = Math.max(0, Math.min(1, this.diveK + (this.diveT > 0 ? dt * 1.6 : -dt * 2.2)));
      const k = this.diveK * this.diveK * (3 - 2 * this.diveK);
      const want = Math.max(ground - 0.75, float - k * SWIM.dive);
      if (!wasSwimming && this.hop.air) { audio.splash(1); this.splashes.burst(p.x, surface, p.z, 0, 0, 1); }
      this.hop.land(this.hop.y + (want - this.hop.y) * Math.min(1, dt * (wasSwimming ? 6 : 3)));
      if (!this.swimTip && !blocked) {
        this.swimTip = true;
        this.undersea.build();
        const touch = useStore.getState().hud.showTouch;
        useStore.getState().toast({ kind: "tip", title: "Plauki!", body: touch ? "Mygtukas su rodykle žemyn – panerti." : "Tarpas – panerti, Shift – plaukti greičiau.", ms: 5000 });
      }
    } else {
      this.diveT = 0; this.diveK = Math.max(0, this.diveK - dt * 3);
      landed = this.hop.update(dt, ground);
    }
    this.swimK = Math.max(0, Math.min(1, this.swimK + (this.swimming ? dt / 0.4 : -dt / 0.3)));
    this.player.swim = this.swimK * this.swimK * (3 - 2 * this.swimK);
    this.player.dive = this.diveK;
    // (the camera goes under with a diver: level behind them, close; and back to where it was)
    if (this.diveK > 0 && !this.airCam) this.airCam = { pitch: this.rig.pitch, dist: this.rig.dist };
    if (this.airCam) {
      const k = this.diveK * this.diveK * (3 - 2 * this.diveK);
      // (a phone held upright sees less to the sides: from further back there, and lower, to stay under the surface)
      const upright = this.container.clientHeight > this.container.clientWidth * 1.15;
      this.rig.pitch = this.airCam.pitch + ((upright ? 0.15 : 0.24) - this.airCam.pitch) * k;
      this.rig.dist = this.airCam.dist + ((upright ? 7.4 : 4.6) - this.airCam.dist) * k;
      if (this.diveK <= 0) this.airCam = null;
    }
    this.applyHop();
    // the water at their feet: deep enough to wade in, it slows them, splashes at each step and rings their legs
    const depth = indoor ? 0 : Math.max(0, surface - this.hop.y);
    this.wading.depth = indoor || this.swimming ? 0 : Math.max(0, over);
    const wet = depth > 0.05 && this.diveK < 0.5;
    this.washT -= dt;
    if (wet && !this.wet && this.washT <= 0 && moved > 1) { audio.wash(); this.washT = 6; }
    this.wet = wet;
    this.splashes.update(dt, this.t, wet ? { x: p.x, y: surface, z: p.z } : null, Math.min(1, moved / WALK));
    // footsteps when a foot comes down (in time with the legs, Character.stepPhase; else a stride's distance apart) and,
    // outdoors at a run, dust at the heels; a puff when stopping short or landing
    const fancy = useStore.getState().settings.quality === "high" && !this.zone.interior && !wet && ground < 0.2;
    const phase = this.player.stepPhase;
    if (this.swimming) {
      // a stroke's small splash, in time with the arms
      this.stepN = null; this.stepDist = 0.6;
      this.strokeT -= moved > 0.3 ? dt : 0;
      if (this.strokeT <= 0 && moved > 0.3 && this.diveK < 0.3) {
        this.strokeT = 1.35;
        audio.splash(0.22);
        this.splashes.burst(p.x + Math.sin(this.heading) * 0.7, surface, p.z + Math.cos(this.heading) * 0.7, Math.sin(this.heading), Math.cos(this.heading), 0.2);
      }
    } else if (moved > 0.4 && !this.hop.air) {
      let step = false;
      if (phase !== undefined) {
        const n = Math.floor((phase - Math.PI / 2) / Math.PI);
        step = this.stepN !== null && n !== this.stepN;
        this.stepN = n;
      } else {
        this.stepDist += moved * dt;
        const stride = running ? 2.1 : 1.84;
        if (this.stepDist > stride) { this.stepDist -= stride; step = true; }
      }
      if (step && wet) {
        const k = Math.min(1, depth / 0.5) * Math.min(1, moved / WALK);
        audio.splash(k);
        this.splashes.burst(p.x, surface, p.z, this.vel.x / moved, this.vel.z / moved, k);
      } else if (step) {
        audio.step(this.underfoot(ground > 0.05), running);
        if (fancy && running) this.dust.puff(p.x, p.z, this.vel.x / moved, this.vel.z / moved);
      }
    } else { this.stepDist = 0.6; this.stepN = null; }
    if (landed > 0 && wet) {
      audio.splash(Math.min(1, 0.5 + landed));
      this.splashes.burst(p.x, surface, p.z, 0, 0, 1);
    } else if (landed > 0) {
      audio.land(this.underfoot(ground > 0.05), landed);
      if (fancy) this.dust.puff(p.x, p.z, Math.sin(this.heading), Math.cos(this.heading), 0.9);
      // (down from the high jump: dust all round)
      if (fancy && this.hop.doubled) for (let i = 0; i < 6; i++) this.dust.puff(p.x, p.z, Math.sin(i * 1.047), Math.cos(i * 1.047), 1.25);
    }
    if (fancy && this.lastSpeed > 6 && moved < 2.5) this.dust.puff(p.x, p.z, Math.sin(this.heading), Math.cos(this.heading), 1.3);
    this.lastSpeed = moved;
    this.dust.update(dt);
    if (!this.zone.interior) this.pigeons.update(dt, p, moved);
    // (the character stands on what is under them: the blob shadow and the camera with it; `lift` is the jump above it)
    p.y = this.hop.ground;
    this.player.update(dt);
  }

  private checkDoorPush(dt: number) {
    const p = this.player.root.position;
    const d = this.town.doors.find((dd) => Math.hypot(dd.x - p.x, dd.z - p.z) < 1.3);
    if (d && this.vel.lengthSq() > 1 && !this.aloft) {
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
    const taking = talking ? this.session?.sit.npcs ?? [] : [];
    // the people look at the learner's head; the player at the one they talk with
    this.learnerAt.set(p.x, p.y + (this.player.lift ?? 0) + 1.5, p.z);
    const partner = talking ? this.talkNpc : null;
    if (partner) { const q = partner.ch.root.position; this.talkAt.set(q.x, q.y + (partner.sit ? 1.3 : 1.5), q.z); }
    this.player.watch = partner ? this.talkAt : null;
    this.player.steady = !!partner;
    for (const n of this.npcs) {
      const d = n.ch.root.position.distanceTo(p);
      // with the player close by, or in the conversation, they stop what they were doing and pay attention
      n.ch.attentive = d < 5.5 || (talking && (n === this.talkNpc || taking.includes(n.id)));
      n.ch.steady = talking && (n === this.talkNpc || taking.includes(n.id));
      if (talking && !n.sit && d < 7 && (n === this.talkNpc || taking.includes(n.id))) {
        // in a conversation the people taking part turn to the player
        const want = Math.atan2(p.x - n.home.x, p.z - n.home.z);
        let dd = want - n.ch.root.rotation.y;
        dd = Math.atan2(Math.sin(dd), Math.cos(dd));
        n.ch.root.rotation.y += dd * Math.min(1, dt * 7);
      } else if (!talking && !n.sit && d < 5.5) {
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
    for (const c of this.extraChats) c.update(dt);
    for (const ch of this.extras) ch.update(dt);
  }

  private updateTags() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    const obj = this.currentObjective();
    // in a conversation the header names the person and every line its speaker: no tags over heads
    const talking = !!this.session?.active;
    const shown: { n: NpcActor; x: number; y: number; dist: number }[] = [];
    for (const n of this.npcs) {
      v.set(n.ch.root.position.x, n.ch.height + (n.sit ? -0.1 : 0.45), n.ch.root.position.z);
      const dist = v.distanceTo(this.rig.cam.position);
      v.project(this.rig.cam);
      // only for people in the picture (a tag kept inside it never points at someone out of sight)
      // (nor for someone who is away from their spot: the surf instructor during a lesson)
      const visible = !talking && n.ch.root.visible && v.z < 1 && dist < 34 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      if (!visible) { n.tag.style.display = "none"; continue; }
      n.tag.style.display = "";
      shown.push({ n, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, dist });
      const isObj = !!obj && !isCall(obj) && (obj.npc === n.id || ((obj.npc === "sam" || obj.npc === "emma") && (n.id === "sam" || n.id === "emma")));
      n.tag.classList.toggle("objective", isObj && !talking);
      n.tag.style.opacity = String(Math.max(0.35, 1 - (dist - 12) / 22));
    }
    // Each tag takes the free spot nearest its person, the nearer people first: where it is; beside or above a tag
    // already placed (Kate and Paul at their table; below one only when nothing else is free); beside, below or above
    // the task card, the little map and the buttons, which would cover it. Always inside the picture.
    shown.sort((a, b) => a.dist - b.dist);
    const hud = this.hudBoxes(), m = 6;
    const placed: TagBox[] = [];
    for (const s of shown) {
      const [tw, th] = (s.n.tagSize ??= [s.n.tag.offsetWidth, s.n.tag.offsetHeight]);
      const spots: [number, number, number][] = [[s.x, s.y, 0]];
      for (const p of placed) spots.push([p.x1 + tw / 2 + 4, s.y, 0], [p.x0 - tw / 2 - 4, s.y, 0], [s.x, p.y0 - 4, 0], [s.x, p.y1 + th + 4, 60]);
      for (const p of hud) spots.push([p.x1 + tw / 2 + 6, s.y, 0], [p.x0 - tw / 2 - 6, s.y, 0], [s.x, p.y1 + th + 6, 0], [s.x, p.y0 - 6, 0]);
      let best: [number, number] | null = null, bestD = Infinity;
      for (const [sx, sy, extra] of spots) {
        const x = Math.min(w - m - tw / 2, Math.max(m + tw / 2, sx)), y = Math.min(h - m, Math.max(m + th, sy));
        const hits = (p: TagBox) => x - tw / 2 < p.x1 && x + tw / 2 > p.x0 && y - th < p.y1 && y > p.y0;
        if (hud.some(hits) || placed.some(hits)) continue;
        const d = Math.hypot(x - s.x, y - s.y) + extra;
        if (d < bestD) { bestD = d; best = [x, y]; }
      }
      const [x, y] = best ?? [Math.min(w - m - tw / 2, Math.max(m + tw / 2, s.x)), Math.min(h - m, Math.max(m + th, s.y))];
      placed.push({ x0: x - tw / 2, x1: x + tw / 2, y0: y - th, y1: y });
      s.n.tag.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }

  /** Where the task card, the little map and the buttons are in the picture (the tags keep clear of them), read about
   *  six times a second. */
  private hudBoxes() {
    if (--this.hudCheck > 0) return this.hudBoxCache;
    this.hudCheck = 10;
    const c = this.container.getBoundingClientRect();
    this.hudBoxCache = [];
    for (const el of document.querySelectorAll<HTMLElement>(".objective-card, .minimap, .toolbar")) {
      if (!el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) this.hudBoxCache.push({ x0: r.left - c.left, x1: r.right - c.left, y0: r.top - c.top, y1: r.bottom - c.top });
    }
    return this.hudBoxCache;
  }

  private updateHud() {
    const st = useStore.getState();
    const p = this.player.root.position;
    // nearest interactable
    let best: Game["nearest"] = null;
    let bd = Infinity;
    const riding = this.rides.riding;
    // (in the surf lesson the buttons are its own: surf/play.ts keeps them)
    if (this.surf?.active) { this.nearest = null; return; }
    if (riding) {
      // at the wheel: only the way out (nobody is talked to, no door gone through)
      if (this.rides.phase === "on" && !this.session?.active) best = { kind: "out", id: riding.id, label: "Išlipti" };
    } else if (!this.session?.active && !this.aloft) {
      for (const n of this.npcs) {
        const d = talkDist(n, p);
        if (d < TALK_RANGE && d < bd) { bd = d; best = { kind: "npc", id: n.id, label: NPCS[n.id]?.name ?? n.id }; }
      }
      // a convertible or the boat within a step (a boat from the water too), a pier's boards beside a swimmer
      if (!this.zone.interior && !this.hop.air && this.diveK < 0.3) {
        const r = this.rides.near(p.x, p.z);
        if (r && (r.kind === "boat" || !this.swimming) && 1 < bd) { bd = 1; best = { kind: "ride", id: r.id, label: r.kind }; }
        else if (this.swimming && !best && this.rides.climbOut(p.x, p.z)) { bd = 1; best = { kind: "climb", id: "pier", label: "Užlipti ant prieplaukos" }; }
        // the surf school's boards at the water's edge: a lesson
        if (this.surf && !this.swimming && best?.kind !== "ride") { const d = this.surf.reach(p.x, p.z); if (d < bd) { bd = d; best = { kind: "surf", id: "surf", label: "Banglenčių pamoka" }; } }
      }
      if (!this.zone.interior) {
        for (const dd of this.town.doors) {
          const d = Math.hypot(dd.outX - p.x, dd.outZ - p.z);
          if (d < 3 && d < bd && !this.swimming) { bd = d; best = { kind: "door", id: dd.loc, label: dd.name }; }
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
      if (best) audio.sfx("tick");
      const names = RIDE_NAMES;
      st.setHud({ prompt: !best ? null
        : best.kind === "ride" ? (best.label === "car" ? { label: `Vairuoti: ${names.car.en}`, lt: names.car.lt || undefined, kind: "drive" } : { label: `Plaukti: ${names.boat.en}`, lt: names.boat.lt || undefined, kind: "boat" })
        : best.kind === "out" ? { label: "Išlipti", kind: "out" }
        : best.kind === "climb" ? { label: best.label, kind: "climb" }
        : best.kind === "surf" ? { label: best.label, lt: this.surf?.npc?.name, kind: "surf" }
        : { label: best.kind === "npc" ? `Kalbėtis: ${best.label}` : best.kind === "door" ? `Įeiti: ${best.label}` : "Išeiti į lauką", lt: best.kind === "door" ? placeLt(best.id) : undefined, kind: best.kind === "npc" ? "talk" : best.kind === "door" ? "enter" : "exit" } });
    }
    // what the player does instead of walking, for the buttons and the hints
    const ride = riding ? riding.kind : this.swimming ? (this.diveK > 0.5 ? "dive" : "swim") : null;
    if (st.hud.ride !== ride) st.setHud({ ride });
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
  /** For the round map: the boats and the convertibles, where they are now. */
  rideMarks() { return this.rides?.marksForMap() ?? []; }
  get doors(): Door[] { return this.town?.doors ?? []; }
  get zoneId() { return this.zone?.id; }
  /** The conversations of the people within `r` m of the player (indoors: everyone in the room), for prefetch.ts. */
  nearSituations(r = 25): string[] {
    const p = this.player?.root.position, out: string[] = [];
    if (!p) return out;
    for (const n of this.npcs) {
      if (this.zone?.id === "town" && n.ch.root.position.distanceTo(p) > r) continue;
      for (const s of this.sitsForNpc(n.id)) out.push(s.id);
      const main = this.secondary.get(n.id);
      if (main) out.push(main.id);
    }
    return out;
  }

  setQuality(q: "high" | "low") {
    this.renderer.shadowMap.enabled = q === "high";
    setBlobShadows(q !== "high");
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 1.75 : 1));
    this.fx?.quality(q);
    this.onResize();
  }

  dispose() {
    this.disposed = true;
    useStore.getState().setHud({ coach: null });
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    this.unbindAmbience?.();
    this.unbindAmbience = null;
    audio.stopAmbience();
    audio.motor(null);
    audio.stop();
    radio.shutdown();
    for (const n of this.npcs) n.tag.remove();
    this.npcs = [];
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}

export { game, setGame } from "./gameRef";
void textTexture;
