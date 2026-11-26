import { StreetLife, useStreet } from "./street/StreetLife";
import { TownStreet } from "./street/world";
import type { StreetSnapshot } from "./street/schedule";
import { ROUTE } from "../content/route";
// The game: renderer, zones (town + interiors), player, NPCs, input, guidance and conversations.
import * as THREE from "three";
import townCollisionURL from "virtual:town-collision-url";
import { showConversationEvent } from "./convEvents";
import { buildTown, type Town, type Door } from "./world/town";
import { CAVE_ZONE, COVE_DOORS, PREFERRED_COVE_DOOR, SLATE_COVE, filterSlateCoveNav, inSlateCove, type CoveDoor } from "./world/slateCovePlan";
import { SlateCoveArt } from "./world/slateCoveArt";
import { CaveLoader, caveExitNear, caveExitSpawn, coveDoorClick, coveDoorNear, coveDoorPush } from "./cave/travel";
import { CaveGuide, caveMapRegion, drawCoveMap } from "./cave/guide";
import type { CaveZone } from "./cave/zone";
import { loadedCarModelCount, type ExteriorCarModels } from "./world/carModels";
import type { CarVisuals } from "./world/carVisuals";
import { prepareExteriorCars } from "./exteriorAssets";
import { startupTask } from "./startupTask";
import { getInterior, INTERIOR_IDS, type Interior } from "./world/interiors";
import { VISITOR_BENCH, OUTDOOR_NPCS, OUTDOOR_GUIDES, AIRPORT_EXIT, WORLD, ROADS, DROPOFF, SEA_Z, BEACH_Z, FOUNTAIN, PARK, SQUARE, taxiStandFrameAt } from "./world/layout";
import { HARBOR_SURF } from "./world/surf";
import { HARBOR_SURF_PLATE } from "./world/harborSurf";
import { createCharacter, setBlobShadows, withBackpack, type GameCharacter } from "./characters";
import { styleRenderer, createStyleFx, type StyleFx } from "./styleScene";
import { CameraRig, FOLLOW } from "./camera";
import { Steer, Gait, Hop, angleDiff, smoothstep } from "./movement";
import { LAND, type Ledges } from "./ledges";
import { coach } from "./coach";
import { Wading, Splashes, floorY, waterY, bayHold, SEA_LEVEL, SHORE, SWIM, BAY } from "./water";
import { Rides, SHALLOWS, type Ride } from "./rides/Rides";
import type { CarWaterFade } from "./rides/carWaterRecovery";
import type { SpeedFeel } from "./rides/speedFeel";
import { KeepsakeInHand } from "./keepsake";
import { keepsakeFor } from "../content/keepsakes";
import { Undersea } from "./rides/undersea";
import { CAR, CAR_DRIFT, BOAT_DRIFT, BOAT, BAY_EDGE, controlsFrom, pointAndGo, type Controls } from "./rides/drive";
import { RIDES } from "./world/rides";
import { islandGroundY, LIGHTHOUSE_ISLAND } from "./world/island";
import type { attachLighthouseIsland } from "./world/lighthouseIsland";
import { ROAD_EDITION, ROAD_UI } from "../content/road";
import { RoadEntry, walkEdge } from "./road/entry";
import { isPlayWay, playWay, setPlayWay, type PlayWay, type WordGame } from "./road/save";
import { SEA_EDITION } from "../content/sea";
import { SeaEntry, seaReturn, cameraPose, crossingPose, RETURN_SETTLE, RETURN_SPEED, type SeaHandoff } from "./sea/entry";
import { RIDE_NAMES } from "../content/rides";
import { TownQuests } from "./photowalk/mode";
import { useTownQuests, type Destination } from "./photowalk/store";
import { isTownQuest } from "../content/townQuests";
import { ModeRegistry } from "./kit/modes";
import { FrameFade } from "./kit/frameFade";
import type { ModeHost } from "./kit/host";
import { FLOOD_INCOMING_INTRO, invitationLocation, invitationTitle, OFFICE_TASK } from "../content/phoneCalls";
import { TownPhone } from "./phone/Phone";
import { reactionTestSpot, TownReactions } from "./life/townReactions";
import { speakTownLine } from "./life/townVoice";
import { ActorTalk } from "./talkNatural/binding";
import type { ReactKind } from "../content/reacts";
import { freeToWalk, type PhoneSnapshot } from "./phone/schedule";
import type { LizzieMeeting } from "./phone/meeting";
import { scoreShot } from "./kit/scoreShot";
import { useSurf } from "./surf/store";
import { createSurfMode } from "./surf/mode";
import { createTaxiMode } from "./taxi/mode";
import { BilliardsMode, BILLIARDS_PLACE } from "./billiards/mode";
import { makeCue, TABLE_NAME, TABLE_PROMPT, type TableView } from "./billiards/table";
import { BARISTA_PROMPT, createBaristaMode } from "./barista/mode";
import { BARISTA_CONVERSATION } from "../content/barista";
import { GOFISH_CONVERSATION } from "../content/gofish";
import { createGoFishMode } from "./gofish/mode";
import { GOFISH_PROMPT } from "./gofish/framing";
import { GYM_ENTRY } from "../content/gym-entry";
import { createGymMode } from "./gym/entry";
import type { OcclusionField } from "./occlusion";
import { STYLED } from "./style";
import { initTownCollision } from "./townCollisionCache";
import { prepareTownCollision } from "./townCollisionPreparation";
import type { PropFader } from "./fade";
import { CUT, withCutout } from "./cutout";
import type { TalkPresentation } from "./talkFraming";
import { bindNaturalTalk } from "./talkNatural/view";
import type { VoiceVisualOwner } from "./talkNatural/contract";
import { FLIGHT_SECONDS, flightAt } from "./flyover";
import { Guidance, guideVisualTarget } from "./guidance";
import { NavGrid, openIslandNav } from "./nav";
import { Session } from "./session";
import { Ambient, Chatter, walkerLook } from "./ambient";
import { ROOM_PEOPLE } from "./world/roomPeople";
import { AMBIENT_LINES, STAFF_LINES } from "../content/ambient";
import { ambientVoice } from "../content/voices";
import { audio } from "./audio";
import { TOWN_SOUNDS } from "./townSounds";
import { MODE_SAMPLES, nearLevel, surfLevel, surfaceAt, type Surface } from "./soundscape";
import { radio } from "../radio";
import { Dust } from "./dust";
import { Pigeons } from "./pigeons";
import { audioDiagnosticsEnabled, audioDiagnosticsPaused, subscribeAudioDiagnostics } from "../convo/audioDiagnostics";
import { KEEPER_NPC, NPCS, type Look } from "../content/npcs";
import { LOCATIONS, placeLt } from "../content/locations";
import { KEEPER_SIT, SITUATIONS, SITUATION_BY_ID, prefetchSituations } from "../content/situations/catalog";
import { whenLoaded } from "./prefetch";
import type { SituationDef, SituationMeta } from "../content/types";
import { picturesOn, useStore, type Toast } from "../state/store";
import { sceneFor } from "../ui/scenes";
import { sitProgress } from "../state/progress";
import { textTexture, rand } from "./world/util";
import { givenItem } from "./given";
import type { GameApi, GuideKind, NametagLayout, PlacedNametag, TagBox } from "./gameRef";
import { attachPad, effectiveStick, type PadLink } from "./padLink";
import { THEME } from "./world/theme";
export type { GameApi } from "./gameRef";

export interface TalkActor { id: string; ch: GameCharacter; home: THREE.Vector3; rot: number; sit?: boolean; approach?: THREE.Vector3 }
interface NpcActor extends TalkActor { tag: HTMLDivElement; tagSize?: [number, number]; waved: boolean; spirit?: { next: number; hop: number } }
const isGymTrainer = (actor: TalkActor) => actor.id === GYM_ENTRY.npc;
let speedFeelModule: Promise<typeof import("./rides/speedFeel") | null> | undefined;
interface ZoneState { id: string; group: THREE.Group; colliders: import("./world/util").Colliders; nav: NavGrid; interior?: Interior }

/** Walking, the jog one falls into outdoors after a moment on the move, and running (Shift, the stick at its edge). */
const WALK = 4.4, JOG = 6.0, RUN = 7.4;
/** How long one walks steadily one way before the jog (s), and how long it takes to come on. */
const JOG_AFTER = 1.5, JOG_EASE = 0.9;

/** Where the learner stands in the airport on the very first visit, just off the plane. */
const ARRIVAL = { x: -14, z: -1, rot: Math.PI };
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
/** How long a guided walk waits beside a car in its way before giving up (seconds). */
const CAR_WAIT_MAX = 20;
/** How far `p` is from talking to `n`: from them, or from their spot to talk from plus a metre. */
function talkDist(n: NpcActor, p: { x: number; z: number }) {
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

const DRIVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];
const RIDE_OUT_PROMPT = { label: "Išlipti", kind: "out" } as const;

/** The tree camera's portrait offset (the Old Oak in Slate Cove's cave) follows the scene strip in styles.css. */
function talkPictureHeight(h: number): number {
  return h <= 620 ? 100 : h <= 700 ? Math.max(100, h * 0.2) : Math.min(230, Math.max(110, h * 0.25));
}

let talkFramingModule: Promise<typeof import("./talkFraming") | undefined> | undefined;
function loadTalkFraming() {
  return talkFramingModule ??= import("./talkFraming").catch(() => { talkFramingModule = undefined; return undefined; });
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
  private keepsake = new KeepsakeInHand();
  keepsakeKind() { return this.keepsake.kind; }
  private npcs: NpcActor[] = [];
  /** The room's townspeople (roomPeople.ts) and the pairs of them talking. */
  private extras: GameCharacter[] = [];
  /** The staff among them with one line to say (roomPeople.ts `says`). */
  private staff: { ch: GameCharacter; says: string; female: boolean }[] = [];
  private extraChats: Chatter[] = [];
  private npcLayer: THREE.Group = new THREE.Group();
  private guidance = new Guidance();
  private islandGuide = false;
  private islandLoad?: Promise<void>;
  private islandScene?: ReturnType<typeof attachLighthouseIsland>;
  private keeperNear = false;
  private keeperWarned = false;
  private keeperRequest?: { picker: boolean };
  private keeperSpokeAt = -Infinity;
  private keeperFrame = 0;
  private keeperFrameDismissed = false;
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private sky!: THREE.Mesh;
  /** Trial world styles (Settings → "Pasaulio stilius"); null for the original "blocks" look. */
  private fx: StyleFx | null = null;
  private keys = new Set<string>();
  private gymHeldKeys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private vel = new THREE.Vector3();
  private lastHeading = 0;
  private heading = Math.PI;
  private autoPath: [number, number][] | null = null;
  private autoTarget: {
    kind: "npc" | "door" | "exit" | "point" | "cave-entry" | "cave-exit" | "glyph" | "tree";
    id?: string;
    directions?: Destination | null;
    rot?: number;
    alignCamera?: boolean;
    onward?: boolean;
  } | null = null;
  private walkCheck = { time: 0, remaining: Infinity, carWait: 0, waited: 0 };
  private lastBlockedTap = -Infinity;
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
  private talkNpc: TalkActor | null = null;
  /** Where the learner's head is (kept up to date in updateNpcs): the people's eyes and heads turn to it (characters:
   *  `watch`); and the head of the person the learner talks with, for the player's own. */
  private learnerAt = new THREE.Vector3();
  private talkAt = new THREE.Vector3();
  private talkCast: TalkActor[] = [];
  private talkSpeaker: TalkActor | null = null;
  private talkCamera?: TalkPresentation;
  private naturalView?: ReturnType<typeof bindNaturalTalk>;
  private get naturalTalk() { return this.naturalView?.presentation; }
  private get talkLayout() { return this.talkCamera?.layout ?? null; }
  private hudBoxCache: TagBox[] = [];
  private hudCheck = 0;
  private tagLayer: HTMLDivElement;
  private nametagLayout: NametagLayout | null = null;
  private benchReturn: THREE.Vector3 | null = null;
  private nearest: { kind: "bench" | "npc" | "staff" | "door" | "exit" | "ride" | "out" | "climb" | "mode" | "cave-entry" | "tree" | "glyph"; id: string; label: string; prompt?: NonNullable<import("../state/store").HudState["prompt"]> } | null = null;
  private pushDoorT = 0;
  private transitioning = false;
  private billiards!: BilliardsMode;
  private barista: ReturnType<typeof createBaristaMode> | null = null;
  private gofish: ReturnType<typeof createGoFishMode> | null = null;
  private frameFade = new FrameFade((fade) => useStore.getState().setHud({ fade, fadeOnFrames: true }));
  private readonly phone = new TownPhone();
  private readonly reactions = new TownReactions(() => this.reactionsBlocked());
  streetLife!: StreetLife;
  private streetWorld!: TownStreet;
  private townTalk?: ActorTalk;
  private phoneWatch: (() => void)[] = [];
  private readonly debugAudio = audioDiagnosticsEnabled();
  private wasHidden = false;
  private conversationLoads = 0;
  private keeperPick = 0;
  private sceneDelays = new Set<ReturnType<typeof setTimeout>>();
  private zoneTimers = new Set<ReturnType<typeof setTimeout>>();
  private meeting: LizzieMeeting | undefined;
  private loadMeeting = false;
  private officeRequested = false;
  private modeHost!: ModeHost;
  private quests!: TownQuests;
  /** The first visit's look at the town from the air (flyover.ts): how long it has been going (s). */
  private flight: { t: number } | null = null;
  private npcToSits = new Map<string, SituationMeta[]>();
  private secondary = new Map<string, SituationMeta>();
  private mapPanel: THREE.Mesh | null = null;
  private pointer = { down: false, id: -1, x: 0, y: 0, moved: 0, button: 0 };
  private raycaster = new THREE.Raycaster();
  private chest = new THREE.Vector3();
  private moveVel = new THREE.Vector3();
  private tmpV = new THREE.Vector3();
  private disposed = false;
  private coveArt = new SlateCoveArt();
  private get caveCode() { return this.caveTravel.code; }
  private caveZone?: CaveZone;
  private caveTravel = new CaveLoader();
  private caveStickHeld = false;
  private caveKeys = new Set<string>();
  private restoreCaveScene?: () => void;
  private talkTree = false;
  private walkFrom = new THREE.Vector3();
  private walkWant = new THREE.Vector3();

  private caveGuide = new CaveGuide();
  get caveGuideNpc() { return this.caveGuide.npc; }
  get cave() { return this.caveZone?.quest ?? null; }
  get caveMapBounds() { return this.wild ? this.caveCode?.BOUNDS : undefined; }
  private get wild() { return this.zone?.interior?.wild; }
  private get walkCamera() { return this.zone.interior && !this.wild ? "interior" : "follow"; }
  private screenW = 0;
  private screenH = 0;
  /** A phone held sideways, by the size the picture has now (useScreen's SIDEWAYS_PHONE, without waiting for the
   *  browser's media query: after a rotation that can still say what the screen was a moment ago). */
  private get sidewaysPhone() { return this.screenW > this.screenH && this.screenH <= 520; }
  private readonly visualViewport = window.visualViewport;
  private resizeObserver: ResizeObserver | null = null;
  private ambient!: Ambient;
  private carVisuals?: CarVisuals;
  private carVisualPreparation?: Promise<void>;
  private firstExteriorAt?: number;
  private firstExteriorDraw?: () => void;
  private enteringFirstExterior = false;
  private initialization?: Promise<void>;
  private initialDrawn = false;
  private crashShadersScheduled = false;
  private crashShaderProbes?: THREE.Group;
  private crashShadersReady = false;
  private unbindAmbience: (() => void) | null = null;
  private ambienceAllowed = () => {
    const st = useStore.getState();
    return !this.disposed && !document.hidden && !st.conv.active && !st.hud.panel;
  };
  /** Walking under the player's own control (movement.ts): the direction pressed, the turn and the speed, a hop. */
  private steer = new Steer();
  // At the helm a held stick keeps the same world direction, even on the way back.
  private helmSteer = new Steer(0, false);
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
  readonly modes = new ModeRegistry({
    read: () => useStore.getState().hud.modeScreen,
    set: (modeScreen) => {
      const st = useStore.getState();
      if (st.hud.modeScreen?.kind === "menu" && st.hud.modeScreen !== modeScreen) st.dismissRideToasts();
      st.setHud({ modeScreen });
    },
  });

  // Retained for the surf browser tests and diagnostics.
  get surf() { return (this.modes.get("surf") as ReturnType<typeof createSurfMode>) ?? null; }
  get surf_picking() { return useSurf.getState().picking; }
  get outfit() { return this.surf?.outfit ?? null; }
  surfStart(level: "beginner" | "advanced") { this.modeStart("surf", level); }
  surfChoose(cue: string) { this.modeAction("surf", "choose", cue); }
  surfAgain(level?: "beginner" | "advanced") { this.modeAction("surf", "again", level); }
  surfStop() { if (this.modes.owns("surf")) this.modes.exit(); }

  /** The level agreed in the conversation, available from the end card's surf lesson button. */
  private pendingSurf: "beginner" | "advanced" | null = null;
  private brake = false;
  private pad?: PadLink;
  /** Where a tap from the wheel or the helm sent the car or the boat (it drives there by itself until it is there, is
   *  stuck, or the player takes the wheel): how long it has got nowhere (s), whether it is stopping, how long it is
   *  still to back up with the wheel the other way round (a turn in three: a tap behind a parked car), how many times
   *  it has backed up, how long it has been going (s). */
  rideGoal: { x: number; z: number; still: number; stopping: boolean; back: number; turn: boolean; tries: number; age: number } | null = null;
  private bumpT = 0;
  private braked = false;
  private dustT = 0;
  private wetRide = false;
  /** At a wheel: the way the camera looks along (the car's course: in a slide it is seen side on), how far it has
   *  pulled back for the speed, the lens's widening, whether the kick out of a slide has been heard. */
  private rideCourse = 0;
  private rideBack = 0;
  private rideFov = 0;
  private speedFeel?: SpeedFeel;
  private speedFeelBoard?: object;
  private carMotionQuery?: MediaQueryList;
  private road?: RoadEntry;
  private sea?: SeaEntry;
  private seaMooring?: Ride["home"];
  private fpsAverage = 0;
  private lastRender = 0;
  private lastRenderWasRoad = false;
  private hornAt = -Infinity;
  private trafficReplyAt?: number;
  private kicked = false;
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
  private collisionPreparation?: ReturnType<typeof prepareTownCollision>;
  private fader!: PropFader;
  onReady?: () => void;

  constructor(private container: HTMLElement, tagLayer: HTMLDivElement,
    private exteriorModels: Promise<ExteriorCarModels> | undefined = prepareExteriorCars()) {
    void this.exteriorModels?.catch(() => {});
    this.tagLayer = tagLayer;
    const q = useStore.getState().settings.quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: q === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 1.75 : 1));
    this.renderer.shadowMap.enabled = q === "high";
    // soft edges come from the sun's shadow.radius (three.js no longer has PCFSoftShadowMap)
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    setBlobShadows(q !== "high");
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.tabIndex = -1;
    container.appendChild(this.renderer.domElement);
    this.rig = new CameraRig(1);
    this.syncSize();
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

  init(linked?: string | null, debug?: "barista" | "gofish" | "billiards") {
    return this.initialization ??= this.initialize(linked, debug).finally(() => this.cancelCollisionPreparation());
  }

  private cancelCollisionPreparation() {
    this.collisionPreparation?.cancel();
    this.collisionPreparation = undefined;
  }

  private async initialize(linked?: string | null, debug?: "barista" | "gofish" | "billiards") {
    if (this.disposed) return;
    const st = useStore.getState();
    if (st.screen !== "loading") st.setScreen("loading");
    if (townCollisionURL && !STYLED) {
      this.collisionPreparation = prepareTownCollision(new URL(townCollisionURL, document.baseURI).href);
    }
    await startupTask();
    if (this.disposed) return;
    this.setupLights();
    this.town = buildTown();
    const taxiScenery: THREE.Mesh[] = [];
    const taxiRay = new THREE.Raycaster();
    const taxiHits: THREE.Intersection[] = [];
    const taxiSightline = (from: THREE.Vector3, to: THREE.Vector3) => {
      if (!taxiScenery.length) {
        // Test the actual opaque roof and posts as well as the standing scenery.
        this.town.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material)
            || !mesh.material.visible || (mesh.material.transparent && mesh.material.opacity < 0.6)) return;
          for (let parent: THREE.Object3D | null = mesh; parent && parent !== this.town.group; parent = parent.parent) {
            if (parent === this.town.parkedCars.group || parent === this.pigeons.group || parent.userData.boat
              || parent.userData.gull || parent.userData.v !== undefined) return;
          }
          taxiScenery.push(mesh);
        });
      }
      taxiRay.ray.origin.copy(from);
      taxiRay.ray.direction.subVectors(to, from);
      taxiRay.far = taxiRay.ray.direction.length();
      taxiRay.ray.direction.divideScalar(taxiRay.far);
      taxiHits.length = 0;
      taxiRay.intersectObjects(taxiScenery, false, taxiHits);
      return taxiHits.length === 0;
    };
    const nav = new NavGrid(SLATE_COVE.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, this.town.colliders);
    filterSlateCoveNav(nav, this.town.colliders);
    const island = LIGHTHOUSE_ISLAND;
    if (island) openIslandNav(island, nav, this.town.colliders);
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
    // Capture the same town geometry and colliders before adding actors or handing boats to rides.
    const collision = this.collisionPreparation;
    const collisionBytes = collision ? await collision.join() : undefined;
    this.collisionPreparation = undefined;
    if (this.disposed) return;
    const { field, ledges, fader } = initTownCollision(this.town, collisionBytes,
      (next) => setTimeout(() => { if (!this.disposed) next(); }, 16));
    this.field = field;
    this.ledges = ledges;
    this.fader = fader;
    // The traffic's climbable pieces move with the cars (a mini-game's parked car is climbed too).
    ledges.dynamic = (x, z) => {
      const moving = this.ambient.carPieces(x, z);
      const parked = this.rides.townCarPieces(x, z);
      return parked.length ? moving.concat(parked) : moving;
    };
    withCutout(this.town.group);
    await startupTask();
    if (this.disposed) return;
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
    this.ambient = new Ambient(nav, places, st.settings.quality, this.town.seats, this.town.colliders, true);
    this.ambient.onHonk = (car) => this.reactions.honk(car);
    this.ambient.onBump = (walker, look) => this.reactions.bump(walker, look);
    this.streetWorld = new TownStreet(this.town.group, nav, this.town.colliders, this.ambient,
      this.rig.cam, () => this.player, () => useStore.getState().progress.profile?.look.top,
      this.field, () => this.screenW <= 600 && this.screenW < this.screenH || this.sidewaysPhone);
    this.streetLife = new StreetLife(this.streetWorld);
    // what one can drive: the convertibles at the curb with their people in them, the boat at the pier
    this.rides = new Rides({
      cam: this.rig.cam, colliders: this.town.colliders, nav, ambient: this.ambient, player: null as unknown as GameCharacter, quality: st.settings.quality,
      people: () => (this.zone.interior ? [] : this.npcs.map((n) => n.home)),
      say: (line, voice, female, ch) => {
        if (this.modes.active?.cleanScreen !== "menu") this.saysAloud(line, female, ch, voice);
      },
      thud: (k) => { if (this.bumpT <= 0) { audio.bump(Math.min(1, 0.35 + k * 0.65)); this.bumpT = 0.12; } },
      crashSound: (sound, k) => { audio.carCrash(sound, k); if (sound === "crunch") this.rig.jolt(k); },
      carImpact: (target) => this.reactions.crash(this.ambient, target),
      allowsCrashes: () => this.zone.id === "town" && !this.modes.owns("road"),
      allowsHints: () => this.allowsRideHints(),
      rescue: (put) => {
        const ride = this.rides.riding;
        const hud = useStore.getState();
        hud.setHud({ fade: 1 });
        setTimeout(() => {
          if (this.rides.riding === ride) this.speedFeel?.release();
          put();
          const car = this.rides.riding;
          if (car) { this.rig.yaw = car.m.heading; this.rig.target.set(car.m.x, 0, car.m.z); this.rig.snap(); }
          useStore.getState().setHud({ fade: 0 });
          if (car === ride) this.showRideToast({ kind: "info", title: "Mašina vėl gatvėje", ms: 2600 });
        }, 280);
      },
      waiting: () => this.showRideToast({ kind: "tip", title: "Kelias užimtas", body: "Mašina sustoja pati. Pasuk į šoną ir apvažiuok arba pavažiuok atbulas.", ms: 5000 }, "waiting"),
      freed: () => this.showRideToast({ kind: "info", title: "Mašina išlaisvinta", body: "Ji pati pasitraukė ten, kur laisva.", ms: 2600 }),
      stuck: () => this.showRideToast({ kind: "tip", title: "Užstrigai?", body: useStore.getState().hud.showTouch ? "Patrauk vairalazdę žemyn – važiuosi atbulas." : "Rodyklė žemyn – važiuosi atbulas.", ms: 5000 }),
      aground: () => this.showRideToast({ kind: "tip", title: "Čia per sekli vieta", body: useStore.getState().hud.showTouch ? "Patrauk vairalazdę žemyn – valtis atsitrauks nuo kranto." : "Rodyklė žemyn – valtis atsitrauks nuo kranto.", ms: 5000 }),
      splash: (x, y, z, dx, dz, k) => this.splashes.burst(x, y, z, dx, dz, k),
      fan: (x, y, z, dx, dz, k) => this.splashes.fan(x, y, z, dx, dz, k),
      outdoors: () => !this.zone.interior && !this.covered,
      openRoad: (car, controls) => this.road?.openEdge(car, controls),
      openSea: (boat) => this.sea?.openEdge(boat) ?? false,
    }, RIDES, this.town.group.children.filter((o) => o.userData.boat));
    const { fleet } = this.town.parkedCars;
    fleet.cars.forEach((entry, index) => {
      const ride = this.rides.createModeCar({ ...entry.spot, id: `parked-${index}` }, entry.root, () => fleet.take(entry));
      ride.crashParking = {
        visual: () => entry.visual, solo: () => entry.taken && !entry.driven,
        take: () => fleet.take(entry, false), untake: () => fleet.untake(entry),
      };
    });
    this.rides.onLeft = (x, y, z, rot) => this.leftRide(x, y, z, rot);
    if (island) this.rides.onIslandBoatReleased = (id) => {
      const state = useStore.getState();
      if (state.progress.lighthouse?.boat?.id === id) state.updateProgress((p) => { delete p.lighthouse?.boat; });
    };
    this.rides.onStuck = () => this.showRideToast({ kind: "info", title: "Čia išlipti nėra kur", body: "Pavažiuok truputį toliau." });
    this.undersea = new Undersea(RIDES.deep, RIDES.rocks);
    const host: ModeHost = this.modeHost = {
      acting: () => new ActorTalk(),
      player: () => this.player, rig: this.rig, rides: this.rides, standTaxi: this.town.parkedCars.taxi, doors: this.town.doors, time: () => this.t,
      add: (...objects) => this.scene.add(...objects),
      canStart: (indoors, duringTransition) => !this.disposed && !this.session?.active && !useStore.getState().hud.panel
        && (duringTransition || !this.transitioning) && !this.flight && this.rideTimer === undefined && (indoors || !this.zone.interior),
      fade: (fn) => { if (this.transitioning || this.disposed) return false; this.fadeThen(() => { if (!this.disposed) fn(); }); return true; },
      splash: (x, y, z, dx, dz, k) => this.splashes.burst(x, y, z, dx, dz, k),
      hideNpc: (id, hidden) => {
        const n = this.npcs.find((q) => q.id === id);
        if (!n) return;
        const visible = n.ch.root.visible;
        n.ch.root.visible = !hidden;
        return visible;
      },
      // a mini-game's recorded effects load as it starts, and its room and music play while it runs (audio.bed)
      entered: (id) => { this.modes.entered(id); audio.preload(MODE_SAMPLES[id] ?? []); audio.bed(id); },
      left: (id) => { this.modes.left(id); audio.bed(null); }, owns: (id) => this.modes.owns(id),
      portrait: () => this.container.clientHeight > this.container.clientWidth * 1.15,
      prepare: () => this.prepareMode(),
      place: (x, z, rot) => this.placeOnFoot(x, z, rot),
      updatePose: (dt, heading) => this.updateModePose(dt, heading),
      board: (ride) => this.boardRide(ride, true),
      drive: (dt, controls) => this.updateRide(dt, controls),
      dismount: (x, z, rot, keepParked) => {
        const point = this.rides.riding && this.rides.carExit(this.rides.riding)?.clone();
        this.endRide(keepParked);
        const p = point ?? this.player.root.position;
        this.placeOnFoot(x ?? p.x, z ?? p.z, rot ?? this.heading);
      },
      snapTaxi: ({ m, mesh }, dimensions) => {
        this.speedFeel?.release();
        this.rideCourse = m.heading;
        this.rig.target.set(m.x, 0, m.z);
        this.rig.snapTaxi({ position: mesh.position, heading: () => m.heading, ...dimensions }, taxiSightline);
        this.applyWalkingViewShift(this.screenW, this.screenH, false);
      },
      scoreShot: (beside) => {
        const { root: { position: p }, height } = this.player;
        const subject = new THREE.Box3(
          new THREE.Vector3(p.x - 0.35, p.y, p.z - 0.35),
          new THREE.Vector3(p.x + 0.35, p.y + height + 0.15, p.z + 0.35),
        );
        return scoreShot(subject, this.heading, this.rig.cam.aspect, this.rig.space,
          (x, z) => this.zone.colliders.blocked(x, z, 0.65), beside);
      },
    };
    this.modes.register(createSurfMode(host, (player) => { this.player = this.rides.host.player = player; }));
    this.modes.register(createTaxiMode(host));
    this.modes.register(this.quests = new TownQuests(host, {
      spots: this.town.photoSpots,
      walking: () => this.questAvailable() && this.zone.id === "town" && this.rig.mode === "follow",
      available: () => this.questAvailable(),
      zone: () => this.zone.id,
      guide: (id) => this.guideToPlace(id, useTownQuests.getState().directions),
      actor: () => this.npcs.find(({ id, ch }) =>
        this.quests.handlesNpc(id) && ch.root.visible && ch.root.position.distanceTo(this.player.root.position) < 8)?.ch,
    }));
    const stageHost: ModeHost = {
      ...host,
      fade: (swap) => {
        if (this.transitioning || this.disposed) return false;
        this.clearCarWaterFade();
        this.transitioning = true;
        audio.sfx("door");
        this.frameFade.start(swap);
        return true;
      },
    };
    this.barista = createBaristaMode(stageHost, {
      room: () => this.zone.id === BARISTA_CONVERSATION.location ? this.zone.group : null,
      mia: () => this.npcs.find((actor) => actor.id === BARISTA_CONVERSATION.npc)?.ch,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      savePlace: () => this.savePlace(),
    });
    this.modes.register(this.barista);
    this.modes.register(this.gofish = createGoFishMode(stageHost, {
      room: () => this.zone.id === GOFISH_CONVERSATION.location ? this.zone.group : null,
      npc: (id) => this.npcs.find((actor) => actor.id === id)?.ch,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      savePlace: () => this.savePlace(),
    }));
    this.modes.register(this.billiards = new BilliardsMode(host, {
      table: () => this.zone.id === BILLIARDS_PLACE
        ? this.zone.group.getObjectByName(TABLE_NAME)?.userData.table as TableView ?? null : null,
      tina: () => this.npcs.find((actor) => actor.id === "tina")?.ch,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      save: () => this.savePlace(),
    }));
    if (ROAD_EDITION.enabled) {
      this.road = new RoadEntry({
        ...host,
        environment: () => ({ sky: this.sky, fog: this.scene.fog as THREE.Fog | null, hemi: this.hemi, sun: this.sun,
          environment: this.scene.environment, environmentIntensity: this.scene.environmentIntensity, exitHills: this.town.exitHills }),
        roadSign: () => this.town.group.getObjectByName("desert-road-sign"),
        roadOpening: () => this.town.roadOpening,
        viewport: () => ({ width: this.screenW, height: this.screenH }),
        approach: (roadApproach) => {
          const state = useStore.getState();
          if (!!state.hud.roadApproach !== roadApproach) state.setHud({ roadApproach });
        },
        clearTownHud: () => {
          this.releaseSpeedFeel();
          this.nearest = null;
          this.tagLayer.style.visibility = "hidden";
          useStore.getState().setHud({ prompt: null, ride: null, fast: false, speedLines: false });
        },
        speedFeel: (accept) => {
          if (accept) this.loadSpeedFeel(accept);
          return this.speedFeel;
        },
        left: (id) => { this.tagLayer.style.visibility = ""; host.left(id); },
        deferLift: () => this.road?.deferLift(),
        returnCar: (car, onFoot) => this.returnRoadCar(car, onFoot),
      });
      this.modes.register(this.road);
    }
    if (SEA_EDITION.enabled) {
      this.sea = new SeaEntry({
        ...host,
        environment: () => ({ sky: this.sky, sea: this.town.sea, rings: this.splashes, fog: this.scene.fog as THREE.Fog | null, hemi: this.hemi, sun: this.sun }),
        clearTownHud: () => {
          this.nearest = null;
          this.tagLayer.style.visibility = "hidden";
          useStore.getState().dismissRideToasts();
          useStore.getState().setHud({ prompt: null, ride: null, fast: false, speedLines: false });
        },
        left: (id) => { this.tagLayer.style.visibility = ""; host.left(id); },
        returnBoat: (boat, onFoot, handoff) => this.returnSeaBoat(boat, onFoot, handoff),
        tip: (title, body) => this.showRideToast({ kind: "tip", title, body }),
      });
      this.modes.register(this.sea);
    }
    this.modes.register(createGymMode(stageHost, {
      room: () => this.zone.id === GYM_ENTRY.location ? this.zone.group : null,
      trainer: () => this.npcs.find(isGymTrainer)?.ch,
      heading: () => this.heading,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      savePlace: () => this.savePlace(),
      viewport: () => ({ width: this.screenW, height: this.screenH }),
    }));
    this.scene.add(this.npcLayer, this.guidance.group, this.ambient.group, this.rides.group, this.dust.group, this.splashes.group, this.undersea.group);
    this.rig.space = {
      free: (a, b) => this.wild?.space.free(a, b) ?? (this.zone?.interior ? 1 : Math.min(this.field.free(a, b), this.coveArt.cameraField(a.x, a.z)?.free(a, b) ?? 1)),
      inside: (q) => this.wild?.space.inside(q) ?? (!this.zone?.interior && (this.field.solidAt(q.x, q.y, q.z, 0.15) || !!this.coveArt.field?.solidAt(q.x, q.y, q.z, 0.15))),
      overSolid: (x, z) => !this.zone?.interior && (this.field.overSolid(x, z) || !!this.coveArt.field?.overSolid(x, z)),
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
    const linkedKeeper = !debug && linked === KEEPER_SIT && !!island;
    const jump = debug === "barista" ? { zone: BARISTA_CONVERSATION.location, spawn: BARISTA_PROMPT }
      : debug === "gofish" ? { zone: GOFISH_CONVERSATION.location, spawn: GOFISH_PROMPT }
      : debug === "billiards" ? { zone: BILLIARDS_PLACE, spawn: TABLE_PROMPT }
      : linkedKeeper ? { zone: "town", spawn: undefined }
      : linked && this.scenarioArrival(SITUATION_BY_ID[linked]);
    const saved = st.progress.place;
    // (a save in Slate Cove's cave: back at its cleft outside, then into the cave behind the fade)
    const inCave = !jump && saved?.zone === CAVE_ZONE ? saved : undefined;
    const place = saved && (saved.zone === "town" || INTERIOR_IDS.includes(saved.zone)) ? saved : undefined;
    const fly = !jump && !place && !inCave && this.wantsFlight();
    const outdoors = jump ? jump.zone === "town" : place?.zone === "town" || fly || !!inCave;
    if (outdoors) {
      await this.awaitExterior();
      if (this.disposed) return;
    }
    if (linkedKeeper || (place?.zone === "town" && !place.boat && island && islandGroundY(island, place.x, place.z) !== undefined)) {
      this.rides.restoreIslandBoat(st.progress.lighthouse?.boat);
    }
    if (jump) {
      // A linked scene moves the learner off the helm, but a harbor boat stays where it was left.
      const berth = place?.zone === "town" ? place.boat : undefined;
      const boat = berth && this.rides.find(berth.id);
      if (boat?.townBoat && berth && this.rides.islandBoat()?.id !== boat.id && [berth.x, berth.z, berth.rot].every(Number.isFinite)) {
        this.rides.resetPosition(boat, { ...berth, z: Math.max(BAY.z0 + 5, berth.z) });
      }
      this.enterZone(jump.zone, linkedKeeper ? this.islandScene?.keeperSpawn : jump.spawn, true);
    } else if (inCave) {
      this.enterZone("town", COVE_DOORS.cleft.out, true, undefined, undefined, undefined, true);
      st.setHud({ fade: 1 });
      void this.openCave(PREFERRED_COVE_DOOR, inCave, true)?.finally(() => {
        if (!this.disposed) useStore.getState().setHud({ fade: 0 });
      });
    } else if (place) {
      this.enterZone(place.zone, { x: place.x, z: place.z, rot: place.rot }, true);
      if (place.zone === "town" && place.boat) {
        const saved = place.boat, boat = this.rides.find(saved.id);
        if (boat?.kind === "boat" && [saved.x, saved.z, saved.rot].every(Number.isFinite)) {
          this.rides.resetPosition(boat, { ...saved, z: Math.max(BAY.z0 + 5, saved.z) });
          if (this.rides.restoreBoat(boat, this.t)) {
            this.seaMooring = saved.mooring ?? boat.home;
            this.sea?.prefetch(boat);
            this.snapSeaBoat(boat);
            this.savePlace();
          }
        }
      }
    } else if (fly) this.beginFlight();
    else this.enterZone("airport", ARRIVAL, true);
    this.phoneWatch.push(useStore.subscribe((state, previous) => {
      const h = state.hud, before = previous.hud;
      if (this.pad?.input && ((h.panel && h.panel !== before.panel) || (h.modeScreen && h.modeScreen !== before.modeScreen) ||
          (h.fade && !before.fade) || (h.phoneCard && h.phoneCard !== before.phoneCard) ||
          (state.conv.active && !previous.conv.active) || (state.screen !== "play" && previous.screen === "play"))) {
        this.pad.cancel();
      }
      if (state.hud.panel === "phrasebook" && previous.hud.panel !== "phrasebook" && !this.rides.riding && !this.modes.active) {
        this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
        this.gaitOn = false; this.keys.clear(); this.stepOut = 0;
      }
      if (state.conv.active !== previous.conv.active || state.hud.panel !== previous.hud.panel || state.hud.phoneCard !== previous.hud.phoneCard) {
        this.reactions.observe(state.conv.active);
      }
      if (state.hud !== previous.hud || state.conv.active !== previous.conv.active || state.screen !== previous.screen || state.settings !== previous.settings) {
        this.observeStreetAndPhone();
      }
    }), radio.store.subscribe((state, previous) => {
      if (state.open && !previous.open) this.pad?.cancel();
      if (state.open !== previous.open) this.observeStreetAndPhone();
    }));
    if (this.debugAudio) this.phoneWatch.push(subscribeAudioDiagnostics(() => this.observeStreetAndPhone()));
    document.addEventListener("visibilitychange", this.phoneVisibility);
    window.addEventListener("pagehide", this.phonePageHide);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    window.addEventListener("pageshow", this.onResize);
    this.visualViewport?.addEventListener("resize", this.onResize);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.container);
    }
    this.refreshObjective();
    // Draw the restored camera and lighting under the logo before the HUD or input can take over.
    this.syncSize();
    this.modes.tick(0, !this.zone.interior && !this.flight);
    this.rig.applyPose();
    this.rig.cam.fov = this.rig.fovFor(this.screenW, this.screenH, false);
    this.rig.cam.updateProjectionMatrix();
    this.applyWalkingViewShift(this.screenW, this.screenH, false);
    if (outdoors) {
      this.town.update(this.t, 0);
      this.rides.updateBoatMarkers(this.t);
      this.rides.updateParkingKeys(this.t, !this.flight);
    }
    this.updateViewLights();
    this.drawTown();
    this.initialDrawn = true;
    this.bindInput();
    this.renderer.setAnimationLoop(this.loop);
    this.onReady?.();
    if (this.disposed) return;
    if (!outdoors) void startupTask().then(() => {
      if (!this.disposed) void this.prepareCarVisuals().catch(() => {});
    });
    if (import.meta.env.DEV) this.streetLife.devRequest();
    // the town's hints, each when its thing first matters (coach.ts); after the flight, if the visit opens with one
    if (!this.flight) coach.begin(true);
  }

  private prepareCarVisuals() {
    if (!this.carVisualPreparation) {
      const models = this.exteriorModels ?? prepareExteriorCars();
      this.exteriorModels = undefined;
      this.carVisualPreparation = import("./world/carVisuals").then(({ CarVisuals }) => {
        if (this.disposed) return;
        this.carVisuals ??= new CarVisuals(this.town.parkedCars, this.ambient);
        return this.carVisuals.initialize(models);
      });
      void models.catch(() => {});
    }
    return this.carVisualPreparation;
  }

  private async awaitExterior() {
    const cars = this.prepareCarVisuals();
    try {
      await Promise.all([this.loadIsland(), cars]);
    } catch (error) {
      if (this.carVisualPreparation === cars) this.carVisualPreparation = undefined;
      throw error;
    }
  }

  /** Renderer counters for the most recent frame, plus the car assets and instances ready to draw. */
  carStats() {
    const { calls, triangles } = this.renderer.info.render;
    const models = this.carVisuals?.stats() ?? { trafficModels: 0, parkedModels: 0, taxi: false };
    return { calls, triangles, loadedCarModels: loadedCarModelCount(), ...models };
  }

  private seaDeparture?: ReturnType<typeof crossingPose>;
  private townSeaFrame?: ReturnType<typeof crossingPose>;
  private seaReturnView?: {
    age: number; from: THREE.PerspectiveCamera; offset: THREE.Vector3;
    live: { fov: number; far: number; near: number };
  };
  private seaReturnFrame?: {
    age: number; eye: number[]; rotation: number[];
    live: ReturnType<typeof cameraPose>;
  };
  private presentedWorld?: { serial: number; scene: "town" | "road" | "sea" };

  private presentWorld(scene: "town" | "road" | "sea") {
    if (!import.meta.env.DEV) return;
    this.presentedWorld = { serial: this.renderer.info.render.frame, scene };
    const boat = this.rides.riding;
    this.townSeaFrame = scene === "town" && boat?.kind === "boat"
      ? crossingPose(this.rig.cam, boat.mesh, this.player.root, this.t) : undefined;
  }

  roadDebug() {
    return { ...this.road?.debug(), presented: this.presentedWorld, drawCalls: this.renderer.info.render.calls, fps: this.fpsAverage };
  }

  roadPreviewOptions(options?: readonly string[]) { if (import.meta.env.DEV) this.road?.previewOptions(options); }

  roadSteer(lane: number) { this.road?.steer(lane); }
  roadJumpTimer(seconds?: number) { this.road?.jumpTimer(seconds); }

  wordGameWay(id: WordGame, way?: PlayWay) {
    if (!import.meta.env.DEV) return;
    const town = id === "road" ? ROAD_EDITION.id : SEA_EDITION.id;
    if (isPlayWay(way)) {
      useStore.getState().updateProgress((progress) => setPlayWay(progress, town, id, way));
      this.modes.get(id)?.action?.("way", way);
    }
    return playWay(useStore.getState().progress, town, id);
  }

  wordGameStart(id: WordGame, way: PlayWay = "phrases") {
    if (!import.meta.env.DEV || !isPlayWay(way)) return false;
    if (!this.modes.owns(id) && !this.modes.start(id)) return false;
    const entry = id === "road" ? this.road : this.sea;
    entry?.action("again");
    return entry?.startWay(way) ?? false;
  }

  wordGameForceGate(id: WordGame, correct: boolean) {
    if (!import.meta.env.DEV || !this.modes.owns(id)) return false;
    return (id === "road" ? this.road : this.sea)?.forceGate(correct) ?? false;
  }

  seaDebug() {
    if (!import.meta.env.DEV) return;
    const r = this.rides.riding, cam = this.rig.cam;
    return {
      ...this.sea?.debug(), drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      presented: this.presentedWorld, departureFrom: this.seaDeparture, townFrame: this.townSeaFrame,
      townBlend: this.seaReturnFrame, edge: BAY.z0,
      town: r?.kind === "boat" ? { id: r.id, phase: this.rides.phase, x: r.m.x, z: r.m.z, heading: r.m.heading,
        speed: r.m.speed, bowZ: r.m.z + r.m.fz * r.m.spec.half, hull: r.mesh.position.toArray(),
        camera: { position: cam.position.toArray(), rotation: cam.quaternion.toArray(), fov: cam.fov } } : undefined,
    };
  }

  seaSteer(lane: number) { if (import.meta.env.DEV) this.sea?.steer(lane); }
  seaTimer(seconds?: number) { if (import.meta.env.DEV) this.sea?.jumpTimer(seconds); }

  seaPlaceBoat(x: number, z: number, heading = Math.PI) {
    const boat = this.rides.riding;
    if (!import.meta.env.DEV || this.modes.active || boat?.kind !== "boat" || this.rides.phase !== "on") return false;
    this.rides.resetPosition(boat, { x, z, rot: heading });
    this.snapSeaBoat(boat);
    return true;
  }

  private sampleFps(road: boolean) {
    const now = performance.now(), ms = now - this.lastRender;
    if (ms > 0 && this.lastRender > 0 && road === this.lastRenderWasRoad) {
      this.fpsAverage = this.fpsAverage ? this.fpsAverage * 0.92 + 80 / ms : 1000 / ms;
    } else if (road !== this.lastRenderWasRoad) this.fpsAverage = 0;
    this.lastRender = now;
    this.lastRenderWasRoad = road;
  }

  /** The very first visit (nothing saved of where the learner was) opens with a few seconds' flight over the town,
   *  down to the airport they have just landed at (flyover.ts; theme.ts `flyover`). Not for someone who asked their
   *  device for less motion. */
  private wantsFlight() {
    return THEME.flyover.length > 1 && !(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  private beginFlight() {
    this.enterZone("town", { x: AIRPORT_EXIT.x, z: AIRPORT_EXIT.z, rot: AIRPORT_EXIT.rot }, true);
    this.flight = { t: 0 };
    this.player.root.visible = false;
    const f = flightAt(THEME.flyover, 0);
    this.rig.stage = { pos: f.pos, look: f.look, rate: 60 };
    this.rig.mode = "stage";
    this.rig.stageSnap();
    useStore.getState().setHud({ flight: true, zoneBanner: null, prompt: null });
  }
  /** The flight is over, or cut short (any key, a tap, "Praleisti"): into the airport, where the first task is. */
  endFlight() {
    if (!this.flight || this.transitioning) return;
    this.enterZone("airport", ARRIVAL);
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

  private openCave(door: CoveDoor, saved?: { x: number; z: number; rot: number }, instant = false, crossing = false, onEntered?: () => void) {
    const origin = this.zone;
    if (!instant && origin.id !== "town") return;
    return this.caveTravel.open({ door, saved, instant, crossing }, {
      ready: () => !this.disposed && !this.transitioning && !this.caveZone && this.zone === origin,
      position: () => {
        if (this.disposed || this.zone !== origin || (crossing && (this.session?.active || useStore.getState().hud.panel ||
          this.rides.riding || this.swimming || this.hop.air || this.modes.active || this.modes.modal))) return;
        return this.player.root.position;
      },
      fade: (commit) => this.fadeThen(commit),
      save: () => useStore.getState().progress.cave,
      mount: (zone, spawn) => {
        this.caveZone = zone;
        this.enterZone(zone.id, spawn, true);
        if (this.zone === zone) return true;
        this.caveZone = undefined;
        return false;
      },
      entered: onEntered,
    });
  }

  private leaveCave(id?: string, onEntered?: () => void) {
    if (!this.wild || this.transitioning) return;
    const spawn = caveExitSpawn(this.wild.exits, id);
    if (!spawn) return;
    this.coveArt.load(this.town.group);
    this.enterZone("town", spawn, false, undefined, onEntered);
  }

  private checkCoveDoor(p: THREE.Vector3, blocked: boolean) {
    if (blocked || this.hop.air || this.swimming) return;
    const aim = this.autoTarget;
    if (this.wild) {
      const exit = caveExitNear(this.wild.exits, p, this.vel);
      if (exit) this.leaveCave(exit.id, aim?.kind === "cave-exit" && aim.onward ? this.resumeObjectiveWalk : undefined);
    } else if (this.coveArt.ready) {
      const door = coveDoorPush(p, this.vel);
      if (door) void this.openCave(door, undefined, false, true, aim?.kind === "cave-entry" && aim.onward ? this.resumeCaveWalk : undefined);
    }
  }

  private getZone(id: string): ZoneState | null {
    if (id === CAVE_ZONE) return this.caveZone ?? null;
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
  enterZone(id: string, spawn?: { x: number; z: number; rot: number }, instant = false, via?: "in" | "out", onEntered?: () => void, arrivalHold?: number, skipSave = false) {
    if (this.disposed || this.enteringFirstExterior) return;
    if (id === CAVE_ZONE && !this.caveZone) return this.openCave(PREFERRED_COVE_DOOR, spawn, instant, false, onEntered);
    const z = this.getZone(id);
    if (!z || (!instant && this.transitioning)) return;
    this.leaveBench();
    if (id !== CAVE_ZONE) this.caveTravel.cancel();
    if (this.modes.owns("surf")) this.modes.exit(true);
    this.pad?.cancel();
    const doIt = () => {
      const departing = this.wild;
      const wild = z.interior?.wild;
      this.caveTravel.cancel();
      this.townTalk?.release(0);
      if (this.talkNpc) this.stopTalkLayout();
      else this.stopNaturalTalk(false);
      const shore = this.rides.water?.wet || this.rides.water?.returning;
      if (shore) this.endRide();
      this.keeperRequest = undefined;
      this.keeperNear = false;
      this.phone.dismiss();
      if (this.modes.active || this.modes.owns("barista") || this.modes.owns("gofish")) this.modes.exit(true);
      if (this.flight) {
        this.flight = null;
        this.rig.stage = null;
        this.player.root.visible = true;
        useStore.getState().setHud({ flight: false });
        coach.begin();
      }
      if (this.zone?.id === "town" && id !== "town") this.rides.healCrashes();
      if (this.zone) this.scene.remove(this.zone.group);
      if (departing && !wild) {
        this.caveZone?.dispose();
        this.caveZone = undefined;
        this.caveGuide.leave();
        this.caveCode?.announceCaveExit();
      }
      if (wild && !departing) this.caveGuide.enter(!!this.phoneTask());
      if (wild && departing) this.caveZone?.restoreProgress();
      if (departing || wild) {
        this.caveStickHeld ||= !!(this.joy.x || this.joy.y);
        for (const key of this.keys) this.caveKeys.add(key);
        this.keys.clear();
        this.joy.x = this.joy.y = 0;
        this.steer.reset();
        audio.stopAmbience();
      }
      this.zone = z;
      this.streetLife?.observe(this.streetSnapshot());
      this.scene.add(z.group);
      const indoor = !!z.interior;
      this.jogT = 0;
      // (out of whatever was driven, and out of the water: on foot wherever this puts them)
      if (!shore) this.endRide();
      this.rides.group.visible = !indoor;
      this.surface(true);
      const sp = spawn ?? (z.interior ? z.interior.spawn : { x: 0, z: 0, rot: 0 });
      // (on the sand where it slopes under the sea, if that is where they were)
      const floor = wild?.floor(sp.x, sp.z) ?? (indoor ? 0 : floorY(sp.x, sp.z));
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
      const poolHall = id === BILLIARDS_PLACE;
      this.hemi.intensity = indoor ? (poolHall ? 1.23 : 1.9) : THEME.light.fill;
      this.sun.intensity = indoor ? (poolHall ? 0.92 : 1.6) : THEME.light.sunPower;
      this.fx?.zone(indoor, !!z.interior?.warm);
      if (wild) this.restoreCaveScene = this.caveCode?.applyCaveScene(wild, this.scene, this.rig, this.hemi, this.sun, this.restoreCaveScene);
      else if (departing) {
        this.restoreCaveScene?.();
        this.restoreCaveScene = undefined;
      }
      this.rig.mode = this.walkCamera;
      if (indoor && !wild) this.rig.interiorBounds = { w: z.interior!.w, d: z.interior!.d };
      else this.rig.yaw = this.heading;
      this.rig.target.copy(this.player.root.position);
      this.rig.snap();
      if (via) this.rig.arrive();
      const st = useStore.getState();
      const loc = LOCATIONS[id];
      const name = id === "town" ? "Maple Harbor" : loc?.name ?? id;
      if (wild || departing) st.setHud({ minimap: { px: sp.x, pz: sp.z, heading: sp.rot, zone: id, gates: this.cave?.mask } });
      st.setHud({ zoneName: name, zoneBanner: { title: name, sub: id === "town" ? "Maple Harbor" : loc?.lt }, prompt: null });
      this.afterZoneDelay(() => { if (useStore.getState().hud.zoneBanner?.title === name) useStore.getState().setHud({ zoneBanner: null }); }, 2600);
      this.refreshObjective();
      if (!skipSave) this.savePlace();
      if (!skipSave && !indoor && inSlateCove(sp.x, sp.z)) this.coveArt.load(this.town.group);
    };
    const enter = () => { doIt(); onEntered?.(); };
    if (!z.interior && this.initialDrawn && this.firstExteriorAt === undefined) {
      if (this.transitioning) return;
      this.enteringFirstExterior = true;
      this.fadeThen(async () => {
        try {
          await this.awaitExterior();
          if (this.disposed) return;
          doIt();
          await new Promise<void>((resolve) => { this.firstExteriorDraw = resolve; });
          if (!this.disposed) onEntered?.();
        } finally {
          this.enteringFirstExterior = false;
        }
      }, arrivalHold === undefined ? 320 : 0, arrivalHold);
    } else if (arrivalHold !== undefined) this.fadeThen(enter, 0, arrivalHold);
    else if (instant) enter();
    else this.fadeThen(enter);
  }

  private fadeThen(fn: () => void | Promise<void>, delay = 320, hold = 120) {
    if (this.transitioning || this.disposed) return;
    this.clearCarWaterFade();
    this.transitioning = true;
    useStore.getState().setHud({ fade: 1, fadeOnFrames: false });
    if (delay) audio.sfx("door");
    const finish = () => {
      if (!this.disposed) this.afterZoneDelay(() => {
        useStore.getState().setHud({ fade: 0 });
        this.transitioning = false;
      }, hold);
    };
    const failed = (error: unknown) => {
      if (this.disposed) return;
      console.warn("Town transition failed", error);
      useStore.getState().toast({ kind: "info", title: "Nepavyko įkelti miesto",
        body: "Patikrink interneto ryšį ir pabandyk dar kartą." });
      finish();
    };
    const swap = () => {
      try {
        const pending = fn();
        if (pending) void pending.then(finish, failed);
        else finish();
      } catch (error) {
        failed(error);
      }
    };
    if (delay) this.afterZoneDelay(swap, delay);
    else swap();
  }

  private afterZoneDelay(run: () => void, delay: number) {
    const timer = setTimeout(() => {
      this.zoneTimers.delete(timer);
      if (!this.disposed) run();
    }, delay);
    this.zoneTimers.add(timer);
  }

  private chosenDatePartner() {
    const p = useStore.getState().progress.profile;
    return p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma");
  }

  private spawnNpcs() {
    if (this.nametagLayout) this.nametagLayout.boxes = undefined;
    for (const n of this.npcs) {
      n.ch.rightHand.getObjectByName("tina-cue")?.traverse((piece) => {
        if (piece instanceof THREE.Mesh) { piece.geometry.dispose(); piece.material.dispose(); }
      });
      n.ch.dispose?.(); this.npcLayer.remove(n.ch.root); n.tag.remove();
    }
    this.npcs = [];
    const spots = this.zone.interior ? this.zone.interior.npcs : OUTDOOR_NPCS;
    const partner = this.chosenDatePartner();
    for (const sp of spots) {
      if ((sp.npc === "sam" || sp.npc === "emma") && sp.npc !== partner) continue;
      const def = NPCS[sp.npc];
      if (!def) continue;
      const caveLook = this.wild ? this.caveCode?.keeperLooks[sp.npc] : undefined;
      const ch = createCharacter({ ...def.look, ...caveLook, female: def.look.female ?? def.gender === "f" });
      ch.watch = this.learnerAt;
      ch.root.position.set(sp.x, 0, sp.z);
      ch.root.rotation.y = sp.rot;
      if (sp.sit) { ch.seatY = sp.seat ?? 0.5; ch.setAnim("sit"); }
      ch.busy = AT_WORK[sp.npc] ?? null;
      if (sp.npc === "tina") {
        const cue = makeCue();
        cue.name = "tina-cue";
        cue.position.set(0.04, 0.61, 0.06);
        cue.rotation.z = 0.12;
        ch.rightHand.add(cue);
      }
      this.npcLayer.add(ch.root);
      const tag = document.createElement("div");
      tag.className = "nametag";
      // who they are in English, and in Lithuanian under it (unless it is the same word, like "Barista")
      const lt = def.role.lt.toLowerCase() === def.role.en.toLowerCase() ? "" : `<i lang="lt">${def.role.lt}</i>`;
      tag.innerHTML = `<b>${def.name}</b><span lang="en">${def.role.en}</span>${lt}`;
      this.tagLayer.appendChild(tag);
      const ap = sp as { ax?: number; az?: number };
      this.npcs.push({ id: sp.npc, ch, home: new THREE.Vector3(sp.x, 0, sp.z), rot: sp.rot, tag, sit: sp.sit, waved: false, spirit: this.wild ? { next: sp.sit ? 8 : 6, hop: 0 } : undefined, approach: ap.ax !== undefined && ap.az !== undefined ? new THREE.Vector3(ap.ax, 0, ap.az) : undefined });
      if (this.wild) continue;
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
    this.staff = [];
    this.zone.colliders.circles = this.zone.colliders.circles.filter((c) => !(c as any).extra);
    const people = this.zone.interior ? ROOM_PEOPLE[this.zone.id] ?? [] : [];
    const r = rand([...this.zone.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100000, 17));
    const talking = new Map<number, GameCharacter>();
    for (const p of people) {
      // (the same draw of the dice either way, so that the room's other people keep their looks)
      const coin = r() < 0.5, female = p.female ?? coin;
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
      if (p.says && STAFF_LINES[p.says]) this.staff.push({ ch, says: p.says, female });
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
    this.pad = attachPad({
      scope: () => {
        const st = useStore.getState();
        if (st.screen !== "play" || st.hud.fade || this.transitioning || this.flight || this.rideTimer !== undefined ||
            this.sea?.padHandoff) return false;
        if (st.conv.active || this.session?.active || this.conversationLoads || this.sceneDelays.size ||
            st.hud.panel || useStreet.getState().moment || st.hud.phoneCard || radio.store.getState().open) return null;
        const mode = this.modes.active;
        if (this.modes.engaged || st.hud.modeScreen) return mode?.padDriving || mode?.padAction ? mode : mode?.padMenu ? "menu" : null;
        if (useSurf.getState().picking) return null;
        const ride = this.rides.riding;
        return ride ? (this.rides.phase === "on" ? ride.kind : null) : "foot";
      },
      canLook: () => this.rig.mode === "follow" && !this.pointer.down && !this.road?.active && !this.sea?.active,
      orbit: (dx, dy) => {
        if (this.keeperFrame > 0.001) this.keeperFrameDismissed = true;
        this.rig.drag(dx, dy);
      },
      jump: () => this.jump(),
      interact: () => {
        // (the HUD looks for what is near only every 0.12 s: just after a mode such as the photo quiz closes, a press
        // would find nothing yet and fall through to the camera, so look now)
        if (!this.nearest && !this.rides.riding && !this.modes.active) this.updateHud();
        if (!this.nearest && !this.rides.riding) return false;
        this.interact();
      },
      horn: () => { if (!this.modes.owns("road")) this.horn(); },
      back: () => this.modes.exit(),
      manual: (brake) => {
        if (brake) this.rideGoal = null;
        if (this.inputStick(true) === this.pad?.input) this.cancelManualPath();
      },
    });
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
    el.addEventListener("wheel", (e) => {
      if (this.rig.mode === "follow") {
        if (this.keeperFrame > 0.001) this.keeperFrameDismissed = true;
        this.rig.zoom(e.deltaY);
      }
    }, { passive: true });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private typingInField(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.typingInField(e)) return;
    // (any key ends the first visit's flight over the town)
    if (this.flight) { if (!e.metaKey && !e.ctrlKey && !e.altKey) { this.endFlight(); e.preventDefault(); } return; }
    const st = useStore.getState();
    const k = e.key.toLowerCase();
    const gym = this.modes.owns("gym");
    if (gym) this.gymHeldKeys.add(k);
    else if (e.repeat && this.gymHeldKeys.has(k)) { e.preventDefault(); return; }
    if (st.conv.active || st.hud.glyph) return; // the active reader or conversation handles its own keys
    if (st.hud.panel) { if (k === "escape") st.setHud({ panel: null }); return; }
    if (k === "h" && !e.repeat && this.rides.riding?.kind === "car" && !this.modes.owns("road")) {
      this.horn(); e.preventDefault(); return;
    }
    if (this.modes.modal || this.modes.active) {
      if ((!this.transitioning || (k === "escape" && (gym || this.modes.owns("surf"))))
        && this.modes.input({ kind: "key", key: k, repeat: e.repeat, keys: this.keys, shift: e.shiftKey })) e.preventDefault();
      return;
    }
    if (k === "escape" && this.modes.input({ kind: "key", key: k, repeat: e.repeat, keys: this.keys })) {
      e.preventDefault(); return;
    }
    if (e.repeat && (this.caveKeys.has(k) || ((this.wild || this.mapRegion(this.player.root.position.x, this.player.root.position.z)) && (k === "e" || k === "enter" || k === " ")))) return;
    this.caveKeys.delete(k);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(k)) {
      this.keys.add(k); this.autoPath = null; this.autoTarget = null; this.rideGoal = null; e.preventDefault(); return;
    }
    // Space: talk or go in, as E, when there is someone or a door to; else a jump (in the air: the second jump). At a wheel it
    // is the brake, for as long as it is held; swimming, a dive
    if (k === " " && this.rides.riding) { this.keys.add(" "); this.rideGoal = null; e.preventDefault(); return; }
    if (k === " ") {
      if (!(this.waterNeutral && this.keys.has(" "))) {
        if (this.nearest && !this.hop.air && !this.swimming) this.interact(e.repeat);
        else if (!e.repeat) this.jump();
      }
      e.preventDefault();
      return;
    }
    if (k === "e" || k === "enter") { this.interact(e.repeat); e.preventDefault(); return; }
    if (k === "c" && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey && this.modes.start(this.quests.id, "camera")) { e.preventDefault(); return; }
    if (k === "m") st.setHud({ panel: "map" });
    if (k === "j") st.setHud({ panel: "journal" });
    if (k === "p") st.setHud({ panel: "phone" });
    if (k === "g") this.autoWalkToObjective();
    if (k === "r" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) radio.power();
    if (k === "escape") st.setHud({ panel: "settings" });
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
    this.gymHeldKeys.delete(key);
    this.caveKeys.delete(key);
    if (this.modes.owns("surf")) this.modeAction("surf", "key-up", key);
    if (this.billiards.release(key)) e.preventDefault();
  };
  private onBlur = () => {
    this.keys.clear();
    this.caveKeys.clear();
    this.caveStickHeld = false;
    this.gymHeldKeys.clear();
    this.billiards.release(" ", true);
    if (this.modes.owns("surf")) this.modeAction("surf", "clear");
  };

  horn() {
    if (useStore.getState().hud.panel || this.transitioning || this.session?.active) return;
    if (this.modes.active?.id === "road") { this.modeAction("road", "horn"); return; }
    const car = this.rides.riding;
    if (car?.kind !== "car" || this.rides.phase !== "on" || this.t - this.hornAt < 0.36) return;
    this.hornAt = this.t;
    audio.sfx("horn");
    if (this.ambient.nearbyTraffic(car.m.x, car.m.z, 16) && Math.random() < 0.38) this.trafficReplyAt = this.t + 0.45 + Math.random() * 0.45;
  }

  private returnRoadCar(car: Ride, onFoot: boolean) {
    const start = ROAD_EDITION.edge.return;
    const sin = Math.sin(start.rot), cos = Math.cos(start.rot);
    const spots = [[0, 0], [5, 0], [0, -3.4], [10, 0]];
    const position = spots.map(([along, across]) => ({
      x: start.x + sin * along + cos * across, z: start.z + cos * along - sin * across, rot: start.rot,
    })).find(({ x, z }) => this.rides.freeParkingAt(car, x, z)) ?? start;
    this.keys.clear();
    this.pad?.cancel();
    this.joy.x = this.joy.y = 0;
    this.brake = false;
    this.releaseSpeedFeel();
    this.rideFov = 0;
    this.rig.dist /= 1 + this.rideBack;
    this.rideBack = 0;
    if (onFoot && this.rides.riding === car) this.endRide(true);
    this.rides.resetPosition(car, position);
    const step = this.rides.carExit(car);
    if (this.rides.riding !== car) {
      this.placeOnFoot(step?.x ?? position.x, step?.z ?? position.z + 2, position.rot);
      if (!onFoot) this.boardRide(car);
    } else if (!onFoot) this.loadTownSpeedFeel(car);
    if (!onFoot && this.rides.riding === car) {
      this.rides.update(0, this.t, null);
      this.rideCourse = this.rig.yaw = position.rot;
      this.rig.target.set(position.x, 0, position.z);
      this.rig.snap();
      useStore.getState().setHud({ ride: "car" });
    } else useStore.getState().setHud({ ride: null });
    this.savePlace();
  }

  private snapSeaBoat(boat: Ride) {
    this.surface(true);
    this.rides.syncBoatRider(boat, this.t);
    this.heading = this.rideCourse = this.rig.yaw = boat.m.heading;
    this.rig.mode = "follow";
    this.rig.target.copy(this.player.root.position);
    this.rig.snap();
    useStore.getState().setHud({ ride: "boat", prompt: null });
  }

  private returnSeaBoat(boat: Ride, onFoot: boolean, handoff?: SeaHandoff) {
    this.keys.clear();
    this.pad?.cancel();
    this.setJoystick(0, 0);
    this.brake = false;
    if (onFoot) {
      const mooring = this.seaMooring ?? boat.home;
      this.endRide(true);
      this.rides.resetPosition(boat, mooring);
      const x = Math.max(WORLD.minX + 3, Math.min(WORLD.maxX - 3, mooring.x)), z = SHORE.top + 1;
      const beach = [0, -5, 5, -10, 10].map((d) => ({ x: x + d, z }))
        .find((p) => this.town.walkableAt(p.x, p.z)) ?? { x, z: z + 5 };
      this.placeOnFoot(beach.x, beach.z, 0);
    } else {
      this.rideFov = 0;
      this.rig.dist /= 1 + this.rideBack;
      this.rideBack = 0;
      this.rides.resetBoatReturn(boat, seaReturn(boat), RETURN_SPEED);
      this.moveVel.set(0, 0, 0);
      this.snapSeaBoat(boat);
      if (handoff) {
        const { camera, time } = handoff, cam = this.rig.cam;
        const offset = camera.position.clone().sub(boat.mesh.position);
        this.seaReturnView = { age: 0, from: camera, offset, live: { fov: cam.fov, far: cam.far, near: cam.near } };
        this.splashes.clearDrops();
        this.splashes.boatRing(0, time, boat.m, { match: true });
      }
    }
    this.savePlace();
  }

  private applySeaReturnView(dt: number, w: number, h: number) {
    this.seaReturnFrame = undefined;
    const state = this.seaReturnView;
    const boat = this.rides.riding;
    if (!state || boat?.kind !== "boat" || this.rig.mode !== "follow") {
      this.seaReturnView = undefined;
      return;
    }
    const { cam } = this.rig, { from, offset } = state;
    state.age = Math.min(RETURN_SETTLE, state.age + dt);
    const mix = smoothstep(0, RETURN_SETTLE, state.age);
    const eye = offset.clone().add(boat.mesh.position);
    if (import.meta.env.DEV) this.seaReturnFrame = { age: state.age, eye: eye.toArray(),
      rotation: from.quaternion.toArray(), live: cameraPose(cam) };
    state.live = { near: cam.near, far: cam.far, fov: cam.fov };
    if (mix === 1) {
      this.seaReturnView = undefined;
      return;
    }
    const view = cam.view?.enabled ? cam.view : undefined;
    if (view && mix > 0) cam.setViewOffset(w, h, view.offsetX * mix, view.offsetY * mix, w, h);
    else cam.clearViewOffset();
    cam.position.lerp(eye, 1 - mix);
    cam.quaternion.slerp(from.quaternion, 1 - mix);
    cam.fov = THREE.MathUtils.lerp(from.fov, cam.fov, mix);
    cam.near = THREE.MathUtils.lerp(from.near, cam.near, mix);
    cam.far = THREE.MathUtils.lerp(from.far, cam.far, mix);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    this.rig.seedFollow();
  }

  private checkRoadEntry() {
    if (!this.road || this.zone.interior || this.modes.active || this.modes.modal || this.swimming) return;
    if (this.rides.riding || this.rides.water?.suppressInput) return;
    const p = this.player.root.position;
    // (the west edge beside Slate Cove is the dry trail and its cliffs, not the open road)
    if (p.x < WORLD.minX + 1 && p.z >= SLATE_COVE.minZ - 1 && p.z <= SLATE_COVE.maxZ + 1) return;
    const edge = walkEdge(p.x, p.z, this.vel.x, this.vel.z);
    if (edge && this.road.offer(edge)) this.modes.start("road", "walk");
  }

  setJoystick(x: number, y: number) {
    if (this.caveStickHeld && (x || y)) return;
    this.caveStickHeld = false;
    this.joy.x = x; this.joy.y = y;
    if (x || y) this.cancelManualPath();
    else this.helmSteer.reset();
  }

  private cancelManualPath() { this.autoPath = null; this.autoTarget = null; this.rideGoal = null; }
  private inputStick(driving = false) { return effectiveStick(this.joy, this.pad?.input, driving); }
  private get braking() { return this.keys.has(" ") || this.brake || !!this.pad?.input?.brake; }

  /** What the player stands on, for the sound of their steps (soundscape.ts): `raised` on a pier's or a terrace's
   *  boards or a bench (ledges.ts). */
  private underfoot(raised: boolean): Surface {
    if (this.wild) return "stone";
    const p = this.player.root.position;
    const island = !this.zone.interior && LIGHTHOUSE_ISLAND;
    if (island && p.z < SHORE.limit && islandGroundY(island, p.x, p.z) === island.y) return "grass";
    return surfaceAt({ indoor: !!this.zone.interior, warm: !!this.zone.interior?.warm, raised, x: p.x, z: p.z, beachZ: BEACH_Z, park: PARK });
  }

  /** A jump (Space, or the phone's button): not in a conversation, over a panel or through a door. A second press in
   *  the air is a flip, a third the high jump (much higher, two somersaults in all). */
  jump() {
    const st = useStore.getState();
    if (this.session?.active || st.conv.active || st.hud.panel || this.transitioning || !this.player || this.rides.water?.suppressInput) return;
    this.leaveBench();
    if (this.modes.input({ kind: "jump" })) return;
    // (at a wheel the button is the brake: hold(); in the water it is a dive, and the way back up)
    if (this.rides.riding) return;
    if (this.swimming) { this.dive(); return; }
    if (this.hop.air) { if (this.hop.flip()) { audio.jump(this.hop.doubled ? 1.5 : 1.3); if (this.hop.doubled) audio.whoosh(); coach.did("jump"); } return; }
    if (this.hop.start()) { audio.jump(); coach.did("jump"); }
  }

  /** The jump button held down or let go: at a wheel it is the brake. */
  hold(on: boolean) { this.brake = on; if (on) this.rideGoal = null; }

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
  private saysAloud(line: { en: string; lt: string }, female: boolean, ch: GameCharacter, own: string | null = null, source?: "keeper-greeting") {
    // (their own voice, if they have one and it has this line; else a passer-by's)
    const voice = own && audio.hasClip(own, 1, line.en) ? own : ambientVoice(female ? "f" : "m");
    speakTownLine({ actor: ch, id: ch.root.name || voice, scope: "town" }, voice, female, line.en, 1.1 + line.en.length * 0.045,
      undefined, this.townTalk ??= new ActorTalk());
    useStore.getState().toast({ kind: "info", title: `„${line.en}“`, body: line.lt, ms: 3200, phrase: line, ...(source && { source }) });
  }

  /** A member of the room's staff with no conversation here says their one line (roomPeople.ts `says`). */
  private staffSays(i: number) {
    const s = this.staff[i], line = s && STAFF_LINES[s.says];
    if (!line || this.session?.active) return;
    this.saysAloud(line, s.female, s.ch);
  }

  private speakKeeper() {
    const keeper = LIGHTHOUSE_ISLAND?.keeper, ch = this.islandScene?.keeper;
    if (!keeper || !ch || this.session?.active || this.t - this.keeperSpokeAt < 3.2) return;
    const st = useStore.getState();
    const id = st.progress.lighthouse?.greeted ? keeper.repeat : keeper.says;
    const line = STAFF_LINES[id];
    if (!line) return;
    this.keeperNear = true;
    if (id === keeper.repeat) this.keeperWarned = true;
    this.keeperSpokeAt = this.t;
    this.keeperFrameDismissed = false;
    this.saysAloud(line, false, ch, null, "keeper-greeting");
    if (!st.progress.lighthouse?.greeted) st.updateProgress((p) => { p.lighthouse = { ...p.lighthouse, greeted: true }; });
    if (this.islandGuide) { this.islandGuide = false; this.refreshObjective(); }
  }

  private keeperInRange() {
    const ch = this.islandScene?.keeper;
    return !!ch && !this.zone.interior && !this.rides.riding && !this.swimming && !this.aloft
      && ch.root.position.distanceTo(this.player.root.position) < TALK_RANGE;
  }

  private interactKeeper() {
    if (!this.keeperInRange()) return false;
    if (!this.transitioning && !this.session?.active && this.t - this.keeperSpokeAt >= 3.2) {
      if (this.keeperWarned) this.openKeeper();
      else this.speakKeeper();
    }
    return true;
  }

  /** Only the request that still owns the visit can move the player or start the chat. */
  private openKeeper(picker = false, alreadyPlaced = false) {
    if (!LIGHTHOUSE_ISLAND || this.keeperRequest || this.session?.active) return;
    const request = this.keeperRequest = { picker };
    const pick = this.keeperPick;
    const settled = () => { if (this.keeperRequest === request) this.keeperRequest = undefined; };
    const ready = () => this.keeperRequest === request && !this.disposed && !this.enteringFirstExterior && !this.session?.active && !this.transitioning
      && !this.modes.active && !this.modes.modal && !useStore.getState().hud.panel && (picker || this.keeperInRange());
    const open = () => {
      const island = this.islandScene;
      if (!island || !ready()) { settled(); return; }
      this.requestConversation(KEEPER_SIT, island.keeperActor, false, (start) => {
        if (!ready()) return;
        this.islandGuide = false;
        const arrived = () => {
          if (this.disposed || pick !== this.keeperPick) return;
          if (picker && !alreadyPlaced) {
            this.rides.restoreIslandBoat(useStore.getState().progress.lighthouse?.boat);
            this.savePlace();
          }
          if (useStore.getState().hud.panel) return;
          this.keeperNear = true;
          start();
        };
        if (!picker || alreadyPlaced) arrived();
        else this.enterZone("town", island.keeperSpawn, true, undefined, arrived);
      }, settled);
    };
    if (this.islandScene) open();
    else void this.loadIsland().then(open, (error) => {
      settled();
      if (!this.disposed) console.warn("Lighthouse island unavailable", error);
    });
  }

  private updateIsland(dt: number, interrupted: boolean) {
    const island = LIGHTHOUSE_ISLAND, scene = this.islandScene;
    if (!island || !scene || this.zone.interior || this.undersea.on) return;
    scene.update(this.t);
    const p = this.player.root.position, ch = scene.keeper, q = ch.root.position;
    const dist = q.distanceTo(p);
    if (dist > 7) this.keeperFrameDismissed = false;
    if (dist > 4.3) this.keeperNear = false;
    const near = !this.rides.riding && !this.swimming && !this.aloft && dist < TALK_RANGE;
    if (!near && this.keeperRequest?.picker === false) this.keeperRequest = undefined;
    if (near) {
      const want = Math.atan2(p.x - q.x, p.z - q.z);
      ch.root.rotation.y += angleDiff(want, ch.root.rotation.y) * Math.min(1, dt * 5);
      if (!interrupted && !this.keeperNear) this.speakKeeper();
    }
    ch.steady = near;
    ch.attentive = near;
    if (dist < 85) ch.update(dt);
  }

  private frameKeeper(dt: number, blocked: boolean) {
    const scene = this.islandScene;
    if (!scene || blocked || this.zone.interior || this.rig.mode !== "follow" || this.rides.riding || this.swimming) {
      this.keeperFrame = 0;
      return;
    }
    const p = this.player.root.position, q = scene.keeper.root.position;
    const distance = p.distanceTo(q);
    if (distance > 8) { this.keeperFrame = 0; return; }
    if (this.rig.dragging) this.keeperFrameDismissed = true;
    const guided = this.islandGuide && !!this.autoPath?.length;
    const greeting = this.t - this.keeperSpokeAt < 3.2 && !this.gaitOn;
    const focus = !this.keeperFrameDismissed && (guided || greeting) && p.z >= q.z - 0.3
      ? 1 - smoothstep(TALK_RANGE, 7, distance) : 0;
    this.keeperFrame = THREE.MathUtils.damp(this.keeperFrame, focus, 9, dt);
    if (this.keeperFrame < 0.001) return;
    const cam = this.rig.cam, { pos, look } = scene.keeperView;
    const aim = cam.getWorldDirection(this.tmpV).multiplyScalar(cam.position.distanceTo(look)).add(cam.position);
    cam.position.lerp(pos, this.keeperFrame);
    cam.lookAt(aim.lerp(look, this.keeperFrame));
  }

  /** Into a convertible or the boat: whatever the player was doing on foot stops there. */
  private boardRide(r: Ride, duringTransition = false) {
    const st = useStore.getState();
    if (this.session?.active || st.hud.panel || (this.transitioning && !duringTransition) || this.rides.riding || this.rides.water?.suppressInput) return false;
    this.autoPath = null; this.autoTarget = null;
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.vel.set(0, 0, 0);
    this.hop.land(this.player.root.position.y); this.applyHop();
    this.surface(true);
    this.player.bank = 0;
    if (!this.rides.board(r)) return false;
    this.pad?.cancel();
    this.observeStreetAndPhone();
    this.keepsake.clear();
    this.ambient.riding = r.kind === "car";
    this.nearest = null;
    this.brake = false;
    st.setHud({ prompt: null });
    audio.sfx("pop");
    if (r.kind === "boat") {
      this.reactions.boat(this.ambient, r, this.islandScene?.keeper);
      this.seaMooring = { x: r.m.x, z: r.m.z, rot: r.m.heading };
      this.sea?.prefetch(r);
      const p = this.player.root.position;
      this.splashes.burst(r.m.x, waterY(p.x, p.z, this.t) ?? SEA_LEVEL, r.m.z, 0, 0, 0.5);
      this.savePlace();
    } else {
      this.carMotionQuery ??= window.matchMedia?.("(prefers-reduced-motion: reduce)");
      this.loadTownSpeedFeel(r);
      this.road?.prefetch(r);
      const eligible = (car: Ride) => !this.disposed && this.zone.id === "town" && !this.modes.engaged
        && !this.road?.inStrip && this.rides.townCar(car);
      if (eligible(r)) this.rides.prefetchWater(r, {
        eligible,
        peopleClear: (clear, reserved) => {
          for (const actor of this.npcs) {
            const p = actor.ch.root.position;
            if (!clear(p.x, p.z, 0.45) || reserved && !clear(actor.home.x, actor.home.z, 2)) return false;
            const a = actor.approach;
            if (reserved && a && !clear(a.x, a.z, 2)) return false;
          }
          if (!this.streetWorld.carWaterPeopleClear(clear)) return false;
          if (reserved) {
            if (!clear(AIRPORT_EXIT.x, AIRPORT_EXIT.z, 2.5)) return false;
            // Include Lizzie's authored standing offsets and walk-off beside the meeting arrivals.
            for (const door of this.town.doors) {
              const radius = door.loc === "station" || door.loc === "sunny-cup" ? 5.3 : 2.5;
              if (!clear(door.outX, door.outZ, radius)) return false;
            }
            for (const id in DROPOFF) {
              const p = DROPOFF[id], radius = id === "bus-stop" || id === "town-square" ? 5.3 : 2.5;
              if (!clear(p.x, p.z, radius)) return false;
            }
          }
          return true;
        },
        arrest: () => this.resetCarWaterDrive(),
        foot: ({ x, y, z, rot, swim }, snap) => {
          const ch = this.player, p = ch.root.position;
          const wading = !snap && !swim && (p.x - x) ** 2 + (p.z - z) ** 2 > 0.0001;
          p.set(x, y, z);
          this.heading = rot;
          ch.root.rotation.set(0, rot, 0);
          ch.swim = swim;
          ch.dive = 0;
          ch.moveSpeed = wading ? 1.8 : 0;
          const anim = wading ? "walk" : "idle";
          if (ch.anim !== anim) ch.setAnim(anim);
          this.hop.land(y); this.applyHop();
        },
        snap: () => this.snapCarWater(),
        fade: (stage) => this.fadeCarWater(stage),
        clearFade: () => this.clearCarWaterFade(),
        save: () => this.savePlace(),
        drops: this.splashes,
        splash: (k) => audio.splash(k),
        wash: () => audio.wash(),
      });
    }
    return true;
  }

  private waterNeutral = false;
  private waterFade?: HTMLElement;
  private waterRevealFrame = Infinity;
  private waterFadeEnd = Infinity;

  private carWaterInputHeld() {
    if (this.joy.x || this.joy.y || this.brake || this.keys.has(" ")) return true;
    for (let i = 0; i < DRIVE_KEYS.length; i++) if (this.keys.has(DRIVE_KEYS[i])) return true;
    return false;
  }

  private resetCarWaterDrive() {
    this.waterNeutral = true;
    this.rideGoal = null; this.autoPath = null; this.autoTarget = null;
    this.braked = this.kicked = false;
    this.dustT = 0;
    this.trafficReplyAt = undefined;
    this.dust.clear();
    this.surface(true);
    this.wading.depth = 0;
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.hop.land(this.player.root.position.y); this.applyHop();
    const riding = this.rides.riding;
    this.nearest = riding && !this.modes.active ? this.rideOut(riding) : null;
    const st = useStore.getState();
    st.dismissRideToasts();
    st.setHud({ prompt: this.nearest ? RIDE_OUT_PROMPT : null, fast: false, speedLines: false });
  }

  private snapCarWater() {
    const p = this.player.root.position, rig = this.rig;
    this.rideCourse = this.rides.riding?.m.heading ?? this.heading;
    rig.target.copy(p);
    rig.motion.next.copy(p).setY(0);
    rig.motion.dir = this.rideCourse;
    rig.motion.speed = 0;
    rig.snap();
  }

  private fadeCarWater(stage: CarWaterFade) {
    if (this.transitioning || useStore.getState().hud.fade) { this.clearCarWaterFade(); return; }
    if (stage === "reveal") { this.waterRevealFrame = this.renderer.info.render.frame; return; }
    const node = this.waterFade ??= document.querySelector<HTMLElement>(".fade") ?? undefined;
    if (!node) return;
    this.waterRevealFrame = Infinity;
    this.waterFadeEnd = Infinity;
    node.style.transition = stage === "opaque" ? "none" : "opacity 0.18s ease";
    node.style.opacity = "1";
  }

  private updateCarWaterFade(node: HTMLElement) {
    if (this.transitioning || useStore.getState().hud.fade || Date.now() >= this.waterFadeEnd) {
      this.clearCarWaterFade();
      return;
    }
    if (this.renderer.info.render.frame <= this.waterRevealFrame) return;
    // Present the landed scene under full cover first, including a handback triggered between frames by input.
    void node.offsetWidth;
    node.style.transition = "opacity 0.18s ease";
    node.style.opacity = "0";
    this.waterFadeEnd = Date.now() + 180;
    this.waterRevealFrame = Infinity;
  }

  private clearCarWaterFade() {
    const node = this.waterFade;
    this.waterFade = undefined;
    this.waterRevealFrame = Infinity;
    this.waterFadeEnd = Infinity;
    if (node) {
      const { fade, fadeOnFrames } = useStore.getState().hud;
      node.style.opacity = String(fade);
      node.style.transition = fadeOnFrames ? "none" : "";
    }
  }

  private loadTownSpeedFeel(ride: Ride) {
    if (this.speedFeel) return;
    const board = this.speedFeelBoard = {}, zone = this.zone;
    this.loadSpeedFeel(() => this.speedFeelBoard === board && this.zone === zone
      && this.rides.riding === ride && this.rides.phase !== "out" && !this.modes.owns("road"));
  }

  private loadSpeedFeel(accept: () => boolean) {
    if (this.speedFeel) return;
    speedFeelModule ??= import("./rides/speedFeel").catch(() => null);
    void speedFeelModule.then((module) => {
      if (!module || this.speedFeel || this.disposed || !accept()) return;
      const st = useStore.getState();
      if (st.screen !== "play" || st.settings.play !== "town") return;
      this.carMotionQuery ??= window.matchMedia?.("(prefers-reduced-motion: reduce)");
      this.speedFeel = new module.SpeedFeel(this.container, this.rig.cam, CAR.max, this.carMotionQuery);
    }).catch(() => {});
  }

  private releaseSpeedFeel() {
    this.speedFeelBoard = undefined;
    this.dust.clearRolling();
    if (!this.speedFeel?.release()) {
      audio.motor(null);
      audio.rush("wind", 0);
    }
  }

  /** On foot again (Rides.onLeft): where the player stands now, facing away from what they got out of. */
  private leftRide(x: number, y: number, z: number, rot: number) {
    const p = this.player.root.position;
    p.set(x, y, z);
    this.heading = rot;
    this.player.root.rotation.set(0, rot, 0);
    this.afterRide();
    if (this.seaMooring || (LIGHTHOUSE_ISLAND && islandGroundY(LIGHTHOUSE_ISLAND, x, z) !== undefined)) {
      this.seaMooring = undefined;
      this.savePlace();
    }
    if (this.rides.water?.returning) return;
    const sur = waterY(x, z, this.t);
    if (sur !== null && sur - y > 0.3) { audio.splash(Math.min(1, 0.4 + (sur - y) * 0.4)); this.splashes.burst(x, sur, z, 0, 0, 1); }
    else audio.land(this.underfoot(y > 0.05), 0.5);
  }

  private allowsRideHints() {
    const mode = this.modes.active;
    return !mode || (!this.transitioning && !!mode.allowsRideHints?.());
  }

  private showRideToast(toast: Omit<Toast, "id" | "rideHint">, rideHint: NonNullable<Toast["rideHint"]> = "other") {
    if (this.rides.riding && this.allowsRideHints()) useStore.getState().toast({ ...toast, rideHint });
  }

  /** What getting out of a ride leaves behind, however it ended. */
  private afterRide() {
    this.rig.clearTaxiShot();
    if (this.modes.active) useStore.getState().dismissRideToasts();
    const p = this.player.root.position;
    this.hop.land(p.y); this.applyHop();
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.gait.sync(this.heading, 0); this.gaitOn = false; this.steer.reset();
    if (!this.rides.water?.returning) this.keys.delete(" ");
    this.brake = false;
    this.wetRide = false;
    this.pad?.cancel();
    this.rideGoal = null;
    this.helmSteer.reset();
    this.ambient.riding = false;
    this.nearest = null;
    this.releaseSpeedFeel();
    audio.rush("squeal", 0);
    // (the camera comes back to where the player had it)
    this.rig.dist /= 1 + this.rideBack; this.rideBack = 0; this.rideFov = 0;
    this.rig.portraitHelm = false;
    useStore.getState().setHud({ prompt: null, ride: null, fast: false, speedLines: false });
  }

  /** Out of a ride at once, with no hop (a door's zone change, a taxi, a conversation picked from the list). */
  private endRide(keep = false) {
    const riding = this.rides?.riding;
    this.rides?.abandon(keep);
    this.waterNeutral = false;
    if (!riding) return;
    this.seaMooring = undefined;
    this.afterRide();
  }

  /** Up on something higher than a bench (a car, a low wall): nobody is talked to and no door gone through from there. */
  private get aloft() {
    if (this.zone.interior) return this.hop.ground > LAND + 0.1;
    const p = this.player.root.position, island = LIGHTHOUSE_ISLAND;
    const floor = island && p.z < SHORE.limit ? islandGroundY(island, p.x, p.z) : undefined;
    return this.hop.ground > (floor ?? LAND) + 0.1;
  }

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
    if (this.modes.active || this.modes.modal) {
      if (!st.hud.panel && !this.transitioning) this.modes.input({ kind: "tap" });
      return;
    }
    if (st.conv.active || st.hud.panel || this.transitioning || this.flight || this.rides.water?.suppressInput || this.waterNeutral) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.rig.cam);
    const r = this.rides.riding;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), r?.kind === "boat" ? -SEA_LEVEL : 0);
    const p = new THREE.Vector3();
    if (r) {
      const stick = this.inputStick(true);
      if (this.rides.phase !== "on" || this.keys.size || stick.x || stick.y || stick !== this.joy || this.braking ||
          !this.raycaster.ray.intersectPlane(plane, p)) return;
      if (r.kind === "boat") {
        // Leave room for the turn the bay puts into the boat as it approaches its edges.
        const inset = BAY_EDGE.inset + BAY_EDGE.band / 2;
        p.x = THREE.MathUtils.clamp(p.x, BAY.x0 + inset, BAY.x1 - inset);
        p.z = THREE.MathUtils.clamp(p.z, BAY.z0 + inset, SHALLOWS - (BOAT.half - BOAT.wide));
      }
      this.rideGoal = { x: p.x, z: p.z, still: 0, stopping: false, back: 0, turn: false, tries: 0, age: 0 };
      this.clickMarker(p.x, p.z);
      return;
    }
    // a passer-by?
    if (!this.zone.interior) {
      const wh = this.raycaster.intersectObjects(this.ambient.walkerRoots, true);
      const w = wh.length ? this.ambient.walkerFor(wh[0].object) : null;
      if (w && wh[0].distance < 40) {
        const p = this.player.root.position;
        const { female } = this.ambient.greet(w, p.x, p.z);
        const line = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)];
        const voice = ambientVoice(female ? "f" : "m");
        speakTownLine({ actor: w.ch, id: `walker:${w.id}`, scope: "greeting" }, voice, female, line.en,
          audio.clipDuration(voice, 1, line.en) ?? 1.2, undefined, this.townTalk ??= new ActorTalk());
        st.toast({ kind: "info", title: `„${line.en}“`, body: line.lt, phrase: line });
        return;
      }
    }
    const island = !this.zone.interior ? LIGHTHOUSE_ISLAND : undefined;
    const keeper = island?.keeper, keeperActor = this.islandScene?.keeper;
    const here = this.player.root.position;
    if (island && keeper && keeperActor && islandGroundY(island, here.x, here.z) !== undefined
      && this.raycaster.intersectObject(keeperActor.root, true).length) {
      if (!this.interactKeeper()) this.walkTo(keeper.approach.x, keeper.approach.z, { kind: "point" });
      return;
    }
    // staff with a line of their own (roomPeople.ts `says`)?
    if (this.staff.length) {
      const sh = this.raycaster.intersectObjects(this.staff.map((x) => x.ch.root), true);
      const i = sh.length ? this.staff.findIndex((x) => { let o: THREE.Object3D | null = sh[0].object; while (o) { if (o === x.ch.root) return true; o = o.parent; } return false; }) : -1;
      if (i >= 0) { this.staffSays(i); return; }
    }
    // NPC hit?
    const hits = this.raycaster.intersectObjects(this.npcs.map((n) => n.ch.root), true);
    if (hits.length) {
      const actor = this.npcs.find((n) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === n.ch.root) return true; o = o.parent; } return false; });
      if (actor) { const t = actor.approach ?? actor.home; this.walkTo(t.x, t.z, { kind: "npc", id: actor.id }); return; }
    }
    // ground
    if (island && islandGroundY(island, here.x, here.z) !== undefined) {
      plane.constant = -island.jetty.y;
      if (this.raycaster.ray.intersectPlane(plane, p) && islandGroundY(island, p.x, p.z) === island.jetty.y) {
        this.walkTo(p.x, p.z, { kind: "point" });
        this.clickMarker(p.x, p.z);
        return;
      }
      plane.constant = -island.y;
      if (!this.raycaster.ray.intersectPlane(plane, p) || islandGroundY(island, p.x, p.z) === undefined) return;
    }
    if (!this.raycaster.ray.intersectPlane(plane, p)) return;
    // door near the click?
    if (!this.zone.interior) {
      const mouth = this.coveArt.ready && coveDoorClick(p);
      if (mouth) { this.walkTo(mouth.x, mouth.z, { kind: "cave-entry", id: mouth.id }); return; }
      const d = this.town.doors.find((dd) => Math.hypot(dd.outX - p.x, dd.outZ - p.z) < 3.5 || Math.hypot(dd.x - p.x, dd.z - p.z) < 3);
      if (d) { this.walkTo(d.outX, d.outZ, { kind: "door", id: d.loc }); return; }
    } else if (this.wild) {
      const exit = caveExitNear(this.wild.exits, p);
      if (exit) { this.walkTo(exit.x, exit.z, { kind: "cave-exit", id: exit.id }); return; }
    } else if (Math.hypot(p.x - this.zone.interior.exit.x, p.z - this.zone.interior.exit.z) < 1.8) {
      this.walkTo(this.zone.interior.exit.x, this.zone.interior.exit.z - 0.6, { kind: "exit" }); return;
    }
    this.walkTo(p.x, p.z, { kind: "point" });
    this.clickMarker(p.x, p.z);
  }

  private clickMarker(x: number, z: number) {
    const mat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, depthWrite: false });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 20).rotateX(-Math.PI / 2), mat);
    const islandY = !this.zone.interior && LIGHTHOUSE_ISLAND ? islandGroundY(LIGHTHOUSE_ISLAND, x, z) : undefined;
    m.position.set(x, (islandY ?? 0) + 0.05, z);
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
    const outdoors = !this.zone.interior;
    const island = outdoors ? LIGHTHOUSE_ISLAND : undefined;
    const islandY = island && islandGroundY(island, p.x, p.z);
    // (on the lighthouse island one walks its own cells: a tap out on the water goes as far as the island lets one)
    const toSea = outdoors && islandY === undefined && z < SHORE.limit;
    if (toSea) {
      x = THREE.MathUtils.clamp(x, BAY.x0, BAY.x1);
      z = Math.max(z, BAY.z0 + 0.5);
    }
    // standing on something they jumped onto (a bench's seat): first straight down off it, to the nearest open spot
    // that its back or a wall beside it doesn't stand in the way of; the walk is planned from there
    let from: [number, number] = [p.x, p.z], down: [number, number][] = [];
    if (islandY !== undefined && island && islandGroundY(island, x, z) !== undefined) {
      // The last cell near a rock or the rim may be closed. Stop at the free cell instead of stepping past it.
      const i = nav.nearestFree(x, z);
      if (i >= 0 && !nav.free(nav.idx(x, z))) [x, z] = nav.center(i);
    }
    if (outdoors && this.ledges && !inSlateCove(p.x, p.z) && (islandY !== undefined || p.z >= SHORE.limit) && this.hop.ground > (islandY ?? 0) + 0.05) {
      let bd = Infinity;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const i = nav.idx(p.x + dx * nav.cell, p.z + dz * nav.cell);
        if (!nav.free(i)) continue;
        const [cx, cz] = nav.center(i), d = Math.hypot(cx - p.x, cz - p.z);
        if (d < bd && this.ledges.clear(p.x, p.z, cx, cz, this.hop.y)) { bd = d; from = [cx, cz]; down = [from]; }
      }
    }
    const inSea = outdoors && islandY === undefined && (p.z < SHORE.limit || (p.z < SHORE.top && p.y < -0.05 && this.wading.depth > 0.08));
    // (a tap on the ground goes as far towards it as one can; a person's talk spot, a door or the way out is walked
    // onto exactly, even when it sits in a grid cell a counter or a wall fills)
    const toward = target?.kind === "point";
    let path: [number, number][] | null = inSea ? [[p.x, p.z], [x, z]]
      : nav.path(from[0], from[1], x, toSea ? SHORE.limit + 0.5 : z, toward);
    if (toSea && !inSea) {
      // The pedestrian grid usually stops above the wading limit. Start the swim from its last reachable shore cell.
      const end = path?.at(-1) ?? from;
      if (end[1] <= SEA_Z + 1.5 * nav.cell) {
        path ??= [from];
        path.push([x, z]);
      }
    }
    if (!path && down.length) path = [from];
    this.autoPath = null; this.autoTarget = null;
    if (!path) {
      const now = performance.now();
      if (now - this.lastBlockedTap >= 6000) {
        this.lastBlockedTap = now;
        useStore.getState().toast({ kind: "info", title: "Ten nueiti negalima" });
      }
      return;
    }
    const [endX, endZ] = path.at(-1)!;
    this.autoPath = [...down, ...path.slice(1)];
    const npc = target?.kind === "npc" ? this.npcs.find((n) => n.id === target.id) : undefined;
    if ((endX === x && endZ === z) || (npc && talkDist(npc, { x: endX, z: endZ }) < TALK_RANGE - 0.35)) this.autoTarget = target;
    this.walkCheck = { time: 0, remaining: Infinity, carWait: 0, waited: 0 };
    this.stepOut = 0;
  }

  private resumeObjectiveWalk = () => this.autoWalkToObjective();
  private resumeCaveWalk = () => this.autoWalkToObjective("cave");

  autoWalkToObjective(mode: GuideKind = this.caveGuide.mode) {
    // (at a wheel one drives there oneself: the marks on the ground lead the way)
    if (this.islandGuide && (this.rides.riding?.kind === "boat" || this.swimming)) { this.pathT = 0; return; }
    if (this.rides.riding) { useStore.getState().toast({ kind: "info", title: "Pirmiausia išlipk", body: "Arba važiuok pats – rodyklės ant žemės rodo kelią." }); return; }
    if ((this.cave || this.caveGuide.place) && (this.caveTravel.pending || useStore.getState().hud.glyph)) return;
    if (mode !== this.caveGuide.mode) {
      this.caveGuide.mode = mode;
      this.refreshObjective();
    }
    const tgt = this.objectiveTarget(mode);
    if (!tgt) {
      if (mode === "cave") return;
      if (!this.islandGuide) useStore.getState().toast({ kind: "info", title: "Ši užduotis atliekama telefonu", body: "Atidaryk telefoną (P) ir paskambink." });
      return;
    }
    if (this.wild && tgt.kind === "exit") {
      this.walkTo(tgt.x, tgt.z, { kind: "cave-exit", id: tgt.id, onward: true });
      return;
    }
    if (mode === "cave") {
      this.walkTo(tgt.x, tgt.z, { kind: tgt.kind, id: tgt.id, onward: true });
      return;
    }
    const followUp = useStore.getState().hud.objective?.followUp;
    this.walkTo(tgt.x, tgt.z, followUp && tgt.kind !== "exit" ? { kind: "point" } : tgt.kind === "npc" ? { kind: "npc", id: tgt.id } : tgt.kind === "door" ? { kind: "door", id: tgt.id } : { kind: "exit" });
  }

  // ------------------------------------------------------------------ interaction

  private leaveBench() {
    if (!this.benchReturn) return;
    this.player.root.position.copy(this.benchReturn);
    this.player.setAnim("idle");
    this.player.seatY = 0.5;
    this.benchReturn = null;
  }

  interact(repeat = false) {
    if (this.transitioning || this.caveTravel?.pending || useStore.getState().hud.glyph) return;

    if (this.rides.water?.suppressInput || this.rides.water?.owns(this.rides.riding)) {
      const st = useStore.getState();
      if (this.rides.riding && !this.session?.active && !st.conv.active && !st.hud.panel
        && !this.transitioning && !this.modes.engaged && !this.flight) this.rides.leave();
      return;
    }
    if (this.modes.active) {
      if (!this.session?.active && !useStore.getState().hud.panel && !this.transitioning) this.modes.input({ kind: "interact" });
      return;
    }
    const ride = this.rides.riding;
    if (ride) {
      if (!this.session?.active && !useStore.getState().hud.panel) {
        this.rideGoal = null;
        if (ride.kind === "car" && this.road?.inStrip && !this.rides.carExit(ride)) {
          this.road.leaveStrip();
          this.returnRoadCar(ride, true);
        } else this.rides.leave();
      }
      return;
    }
    // (the HUD looks for what is near only every 0.12 s, and a step to a new spot (placeOnFoot) forgets it while the
    // prompt still shows: E or the Talk button pressed in that moment looks now)
    if (!this.nearest) this.updateHud();
    const n = this.nearest;
    if (!n) return;
    if (n.kind === "bench") {
      if (repeat || useStore.getState().hud.panel || this.session?.active) return;
      if (this.benchReturn) this.leaveBench();
      else {
        // The reader occupies the west half. The east seat faces south.
        const p = this.player.root.position;
        if (this.zone.id !== "town" || Math.hypot(p.x - VISITOR_BENCH.x, p.z - VISITOR_BENCH.z) > 2) return;
        this.benchReturn = p.clone();
        this.cancelManualPath();
        this.gaitOn = false; this.stepOut = 0;
        p.set(VISITOR_BENCH.x + .45, 0, VISITOR_BENCH.z);
        this.player.root.rotation.y = this.heading = 0;
        this.player.seatY = .55;
        this.player.setAnim("sit");
      }
      this.updateHud();
    }
    else if (n.kind === "ride") { const r = this.rides.find(n.id); if (r) this.boardRide(r); }
    else if (n.kind === "climb") this.climbOut();
    else if (n.kind === "mode") this.modeStart(n.id);
    else if (n.kind === "npc") this.talkTo(n.id);
    else if (n.kind === "staff") {
      if (n.id !== LIGHTHOUSE_ISLAND?.keeper.says) this.staffSays(+n.id);
      else if (!repeat) this.interactKeeper();
    }
    else if (n.kind === "door") this.enterDoor(n.id);
    else if (n.kind === "exit") this.wild ? this.leaveCave(n.id) : this.exitInterior();
    else if (n.kind === "cave-entry") void this.openCave(n.id as CoveDoor, undefined, false, true);
    else if (n.kind === "tree") this.talkToTree();
    else if (n.kind === "glyph") this.openGlyph(n.id);
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

  exitInterior(onEntered?: () => void) {
    if (!this.zone.interior) return;
    if (this.wild) { this.leaveCave(undefined, onEntered); return; }
    const loc = this.zone.id;
    const door = this.town.doors.find((d) => d.loc === loc);
    if (loc === "airport") { this.enterZone("town", AIRPORT_EXIT, false, onEntered ? undefined : "out", onEntered); return; }
    if (door) {
      // a metre further out than the door's own spot (clear of an awning's edge, so the camera has room behind)
      const x = door.outX + Math.sin(door.rot), z = door.outZ + Math.cos(door.rot);
      const out = this.town.walkableAt(x, z) ? { x, z } : { x: door.outX, z: door.outZ };
      this.enterZone("town", { ...out, rot: door.rot }, false, onEntered ? undefined : "out", onEntered);
    } else this.enterZone("town", undefined, false, undefined, onEntered);
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

  private questAvailable() {
    return this.modeHost.canStart(true) && !this.modes.active && !this.modes.modal && !this.rides.riding && !this.swimming
      && !useSurf.getState().picking && !document.hidden;
  }

  talkTo(npc: string, sitId?: string) {
    if (this.disposed || this.enteringFirstExterior || this.session?.active) return;
    if (npc === KEEPER_NPC) { this.interactKeeper(); return; }
    if (this.quests.handlesNpc(npc)) {
      this.modes.start(this.quests.id, "visit");
      return;
    }
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
    if (sit.location === CAVE_ZONE && (!this.wild || !actor || talkDist(actor, this.player.root.position) >= TALK_RANGE)) return;
    this.requestConversation(sit.id, actor);
    return true;
  }

  private scenarioArrival(sit?: SituationMeta) {
    if (!sit || isCall(sit)) return;
    const npc = sit.npc === "sam" || sit.npc === "emma" ? this.chosenDatePartner() : sit.npc;
    const loc = LOCATIONS[sit.location];
    const interior = !isTownQuest(sit.id) && loc?.kind === "interior" ? getInterior(sit.location) : null;
    const spot = interior ? interior.npcs.find((n) => n.npc === npc) : OUTDOOR_NPCS.find((n) => n.npc === npc);
    const spawn = !spot ? undefined
      : spot.ax !== undefined && spot.az !== undefined ? { x: spot.ax, z: spot.az, rot: Math.atan2(spot.x - spot.ax, spot.z - spot.az) }
      : inFrontOf(spot.x, spot.z, spot.rot, interior ? ("sit" in spot && spot.sit ? 1.9 : 2.3) : 2.2);
    return { npc, zone: interior ? sit.location : "town", spawn };
  }

  /** Situation picker: take the player to the scene card, in front of the NPC or in a call. */
  startScenario(sitId: string, alreadyPlaced = false) {
    const sit = SITUATION_BY_ID[sitId];
    if (!sit || this.disposed || this.enteringFirstExterior) return;
    this.keeperRequest = undefined;
    const pick = ++this.keeperPick;
    const keeper = sitId === KEEPER_SIT;
    if (!isCall(sit)) void loadTalkFraming();
    const st = useStore.getState();
    st.setHud({ panel: null });
    this.modes.exit(true);
    this.lastScenario = sitId;
    if (sit.location === CAVE_ZONE) {
      this.session?.close();
      if (!this.cave || !this.caveCode?.startCaveEncounter(this.cave, sit.npc, this.player.root.position,
        (npc) => this.talkTo(npc, sitId) === true, this.offerOak)) this.guideToPlace(CAVE_ZONE, undefined, sit.npc);
      return;
    }
    if (this.cave) {
      this.session?.close();
      if (sit.bonus) this.guideToPlace(sit.location);
      else this.setObjective(sitId);
      return;
    }
    prefetchSituations([sitId]);
    const go = () => {
      if (pick !== this.keeperPick) return;
      const arrival = this.scenarioArrival(sit);
      if (!arrival) {
        // A link can open a call on the first visit before the flyover has landed.
        if (this.flight) this.enterZone("airport", ARRIVAL, true);
        this.call(sitId);
        return;
      }
      const talk = () => this.afterSceneDelay(() => {
        if (pick === this.keeperPick) this.talkTo(arrival.npc, sitId);
      }, 150);
      if (alreadyPlaced) talk();
      else this.enterZone(arrival.zone, arrival.spawn, true, undefined, talk);
    };
    // "Dar kartą" / "Kita situacija" after a taxi, bus or plane ride was queued: no ride (and no
    // teleport or black fade in the middle of the new conversation). Before close(), which runs endSession.
    this.cancelRide();
    this.phone.dismiss();
    if (keeper) { this.session?.close(); this.openKeeper(true, alreadyPlaced); return; }
    if (this.session?.active) { this.session.close(); this.afterSceneDelay(go, 250); } else go();
  }
  private afterSceneDelay(run: () => void, delay: number) {
    const timer = setTimeout(() => {
      try { if (!this.disposed) run(); } finally { this.sceneDelays.delete(timer); }
    }, delay);
    this.sceneDelays.add(timer);
    this.observeStreetAndPhone();
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
  call(sitId: string, fromCard = false) {
    if (this.disposed || this.enteringFirstExterior || this.session?.active) return;
    const sit = SITUATION_BY_ID[sitId];
    if (!sit) return;
    useStore.getState().setHud({ panel: null });
    this.requestConversation(sitId, null, fromCard);
  }

  private requestConversation(sitId: string, actor: TalkActor | null, fromCard = false, prepare?: (start: () => void) => void, settled?: () => void) {
    if (sitId === KEEPER_SIT && !actor) return;
    if (!prepare) this.keeperRequest = undefined;
    if (actor) void loadTalkFraming();
    this.quests.stopReplay();
    this.conversationLoads++;
    this.observeStreetAndPhone();
    const pick = this.keeperPick;
    let opened = false;
    const cave = this.caveZone;
    whenLoaded(sitId, (def) => {
      const start = () => {
        if (this.disposed || this.session?.active || pick !== this.keeperPick) return;
        this.startSession(def, actor, fromCard && sitId === "p24-flood" ? FLOOD_INCOMING_INTRO : undefined);
        opened = true;
      };
      if (prepare) prepare(start);
      else start();
    }, () => !this.disposed && !this.enteringFirstExterior && !this.session?.active && pick === this.keeperPick
      && (!cave || (cave === this.caveZone && !this.transitioning)), () => {
      this.conversationLoads--;
      if (fromCard && !opened && !this.disposed) this.phone.markMissed(sitId);
      settled?.();
    });
  }

  private phoneSnapshot(): PhoneSnapshot {
    const st = useStore.getState(), hud = st.hud;
    return {
      town: !this.disposed && this.zone?.id === "town" && st.screen === "play" && st.settings.play === "town",
      onFoot: !!this.player && !this.rides?.riding && !this.rides?.water?.assistedOnFoot && !this.swimming,
      grounded: !this.hop.air && !this.aloft,
      visible: !document.hidden,
      enabled: st.settings.phoneCalls,
      conversation: !!this.session?.active || st.conv.active,
      panel: !!hud.panel,
      dialog: radio.store.getState().open || (this.debugAudio && audioDiagnosticsPaused()),
      guide: !!hud.coach && !hud.phoneCard,
      banner: !!hud.zoneBanner,
      cardOpen: !!hud.phoneCard,
      streetBlocked: this.streetLife?.blocksPhone,
      flight: !!this.flight || hud.flight,
      loading: this.conversationLoads > 0 || this.sceneDelays.size > 0,
      transition: this.transitioning || !!hud.fade || this.rideTimer !== undefined,
      mode: this.modes.engaged || !!hud.modeScreen,
    };
  }

  private streetSnapshot(snapshot = this.phoneSnapshot()): StreetSnapshot {
    return { ...snapshot, outdoors: this.zone?.id === "town" };
  }

  private observeStreetAndPhone() {
    this.phone.observe(this.phoneSnapshot());
    this.streetLife?.observe(this.streetSnapshot());
  }

  streetNow = import.meta.env.DEV ? (id?: string, cast?: string) => {
    this.streetLife?.observe(this.streetSnapshot());
    return this.streetLife?.streetNow(id, cast) ?? false;
  } : undefined;

  streetChatterNow = import.meta.env.DEV ? (id?: string) => {
    this.streetLife?.observe(this.streetSnapshot());
    return this.streetLife?.streetChatterNow(id) ?? false;
  } : undefined;

  streetState = import.meta.env.DEV ? () => this.streetLife?.streetState() : undefined;
  streetAdvance = import.meta.env.DEV ? (seconds: number) => this.streetLife?.streetAdvance(seconds, this.streetSnapshot()) : undefined;

  handlePhoneCard(id: string, answer: boolean) {
    const snapshot = this.phoneSnapshot();
    this.phone.observe(snapshot);
    if (!answer) this.phone.dismiss(id);
    else if (snapshot.visible && this.phone.answer(id)) this.call(id, true);
  }

  phoneDueNow() { this.phone.dueNow(); }
  textsDueNow() { this.phone.texts.dueNow(); }
  textsState() { return this.phone.textsState(); }

  private reactionsBlocked() {
    const s = this.phoneSnapshot();
    return !s.town || !s.visible || s.conversation || s.panel || s.dialog || s.cardOpen || s.flight || s.loading || s.transition || s.mode || this.rig.mode === "talk";
  }

  react(kind: ReactKind, { force = false } = {}) {
    if (!import.meta.env.DEV || !this.player) return false;
    const { x, z } = this.player.root.position;
    return this.reactions.debug(kind, this.ambient, this.rides, x, z, this.islandScene?.keeper, force);
  }
  reactState() { return this.reactions.schedule.state(); }
  reactPosition(id: number) { return this.reactions.position(id, this.rig.cam, this.container.clientWidth, this.container.clientHeight); }
  extendReaction(id: number) { this.reactions.extend(id); }

  placeForReaction(kind: "honk" | "bump", excludeCar?: number) {
    if (!import.meta.env.DEV || this.reactionsBlocked() || !this.player || this.rides.riding) return false;
    const spot = reactionTestSpot(this.ambient, this.zone.colliders, this.player.root.position, kind, excludeCar);
    if (!spot) return false;
    this.autoPath = null; this.autoTarget = null;
    this.vel.set(0, 0, 0);
    this.setJoystick(0, 0);
    this.placeOnFoot(spot.x, spot.z, spot.heading);
    return spot;
  }

  phoneState() {
    const { hud, progress } = useStore.getState();
    return { card: hud.phoneCard, missed: progress.phone?.missed ?? {}, invitation: progress.phone?.invitation ?? null };
  }

  finishPhoneCallForTest(id: string, state: Record<string, unknown> = {}) {
    const session = this.session;
    if (!session?.active || session.sit.id !== id || !isCall(session.sit)) return false;
    Object.assign(session.conv.s, state);
    session.conv.completed = true;
    session.close();
    return true;
  }

  private phoneVisibility = () => {
    this.wasHidden = true;
    this.reactions.observe(!!this.session?.active || useStore.getState().conv.active);
    this.observeStreetAndPhone();
  };

  private phonePageHide = () => {
    this.reactions.clear();
    if (this.wild || this.rides?.riding?.kind === "boat" || this.rides?.water?.wet || this.rides?.water?.returning) this.savePlace();
    this.phone.dismiss();
    if (useStore.getState().progress.phone) {
      useStore.getState().updateProgress((p) => this.phone.saveClock(p));
    }
  };

  private offerOak = () => this.talkToTree();

  talkToTree() {
    const cave = this.caveZone, code = this.caveCode;
    const free = () => !this.disposed && this.caveZone === cave && !this.session?.active && !this.transitioning &&
      !this.hop.air && !useStore.getState().hud.panel && !useStore.getState().hud.glyph && !!cave?.nearOak(this.player.root.position);
    if (!code || !cave || !free() || this.conversationLoads) return false;
    this.conversationLoads++;
    whenLoaded(code.treeSituation, (def) => {
      this.startSession(def, null);
      this.aimTree();
    }, free, () => { this.conversationLoads--; });
    return true;
  }

  private openGlyph(id: string) {
    const st = useStore.getState();
    if (this.transitioning || this.session?.active || st.hud.panel || this.hop.air || !this.cave?.open(id, this.player.root.position)) return;
    this.keys.clear();
    this.caveStickHeld ||= !!(this.joy.x || this.joy.y);
    this.joy.x = this.joy.y = 0;
    this.autoPath = this.autoTarget = null;
    this.nearest = null;
    this.vel.set(0, 0, 0);
  }

  private aimTree() {
    if (!this.wild || !this.caveCode) return;
    const p = this.player.root.position;
    const shot = this.caveCode.aimTree(this.wild.space, p, this.rig.cam.position, this.screenW <= 900 && !this.sidewaysPhone);
    this.heading = Math.atan2(shot.look.x - p.x, shot.look.z - p.z);
    this.rig.talk = shot;
    this.rig.mode = "talk";
    this.talkTree = true;
  }

  private startSession(sit: SituationDef, actor: TalkActor | null, introOverride?: string) {
    this.leaveBench();
    this.townTalk?.release();
    this.stopNaturalTalk(false);
    this.modes.exit(true);
    this.keepsake.clear();
    if (this.cave) {
      this.cave.close();
      this.caveGuide.talk(sit.npc);
    }
    this.cancelRide();
    // a hop ends at once, and the player's own walk gives way to the conversation's stop (as it always was)
    this.hop.land(this.hop.ground); this.applyHop();
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.fader.reset();
    CUT.r.value = 0;
    this.autoPath = null; this.autoTarget = null; this.keys.clear(); this.joy = { x: 0, y: 0 };
    this.pad?.cancel();
    this.talkNpc = actor;
    coach.did("talk");
    const st = useStore.getState();
    st.setHud({ prompt: null, panel: null });
    if (actor) {
      // face each other (both turn in a moment: updatePlayer and updateNpcs); the camera on the person spoken with,
      // and then on whoever else taking part speaks, if they stand nearby (Mark at the party, Nora at dinner…): aimTalk
      const reach = THEME.talkCamera?.reach ?? 7, a = actor.ch.root.position;
      this.talkCast = [actor, ...(sit.npcs ?? []).map((id) => this.npcs.find((n) => n.id === id)).filter((n): n is NpcActor => !!n && n !== actor && n.ch.root.position.distanceTo(a) < reach)];
      this.rig.mode = "talk";
      this.aimTalk(actor);
      this.player.setAnim("idle");
    }
    const speaker = (id: string) => actor?.id === id ? actor : this.npcs.find((n) => n.id === id);
    const people = this.npcs, acting = !!actor && !isCall(sit);
    const voice = (n: TalkActor | undefined, line: number, replay?: VoiceVisualOwner["replay"]) =>
      acting && n && this.npcs === people && !this.disposed && this.session === session && session.active ? { actor: n.ch, line, replay } : undefined;
    const session: Session = new Session(sit.id, {
      npcTalk: (npcId, line, replay) => {
        const n = speaker(npcId);
        // the camera follows changes of speaker
        if (n && this.rig.mode === "talk" && this.talkCast.includes(n)) this.aimTalk(n);
        return voice(n, line, replay);
      },
      npcVoice: (id, line, replay) => voice(speaker(id), line, replay),
      npcReact: (id, kind) => {
        if (this.session === session && session.active) this.naturalView?.feedback(id, kind);
      },
      // ignore events from a conversation already closed (e.g. Esc during the driver's goodbye):
      // its "taxi-ride" would otherwise be queued for the next, unrelated conversation
      onEvent: (name, data) => { if (this.session === session) this.onSessionEvent(name, data); },
      onEnd: (s, completed) => this.endSession(s, completed),
    }, introOverride);
    this.session = session;
    audio.recordedDialogue = sit.location === CAVE_ZONE;
    this.session.begin();
    if (actor) this.startTalkLayout(session, actor);
  }

  private startTalkLayout(session: Session, actor: TalkActor) {
    const zone = this.zone, { run, sitId, hostId } = useStore.getState().conv;
    const hasArt = !!sceneFor(sitId, hostId);
    const valid = () => {
      const { conv } = useStore.getState();
      return !this.disposed && this.session === session && session.active && conv.active && conv.run === run
        && this.zone === zone && this.talkNpc === actor && this.rig.mode === "talk"
        && !!this.talkSpeaker && this.talkCast.includes(this.talkSpeaker);
    };
    if (!isCall(session.sit)) this.naturalView = bindNaturalTalk({
      run, zone, host: actor, cast: this.talkCast, people: this.npcs,
      extras: this.extras.filter((_, i) => ROOM_PEOPLE[zone.id]?.[i]?.chat === undefined),
      authoredCast: session.sit.npcs, player: this.player, audio, free: (n) => !this.modes.active?.ownsNpc?.(n.id),
    }, hasArt, valid, () => this.transitioning || !!this.modes.active);
    void loadTalkFraming().then((module) => {
      if (!module || !valid() || !this.talkSpeaker) return;
      this.talkCamera = new module.TalkPresentation(this.renderer.domElement, this.rig, this.talkSpeaker, valid, hasArt, () => {
        const player = this.player.root.position;
        const distance = ([x, , z]: [number, number, number]) => (player.x - x) ** 2 + (player.z - z) ** 2;
        const speaker = this.talkSpeaker!;
        const shop = HARBOR_SURF;
        // From seaward of the counter, the low lens sees under the eave and fits the sign beside Maren.
        const seaward = !zone.interior && speaker.id === this.surf?.content.npc && player.z < shop.counter.z
          && Math.hypot(player.x - shop.approach.x, player.z - shop.approach.z) < 1.2;
        const hint = THEME.talkCamera?.hints?.[zone.id]?.[speaker.id]?.reduce((a, b) => distance(a) <= distance(b) ? a : b);
        return {
          learner: this.player, people: [...this.npcs.map((n) => n.ch), ...this.extras], scene: this.scene,
          room: zone.interior?.wild ? undefined : zone.interior, wild: zone.interior?.wild?.space,
          field: zone.interior ? undefined : this.field, max: THEME.talkCamera?.max ?? 30,
          hint: hint && new THREE.Vector3(...hint),
          // An upright phone keeps the wide lens (her face 6.6 % of the height, inside its 6–32 % band); a wider screen
          // narrows it so her face reaches its 8–38 % band (about 9 %) with the sign still beside her.
          composition: seaward ? {
            pos: new THREE.Vector3(-103.25, 3, -74.7), look: new THREE.Vector3(-100.65, 1.61, shop.coach.z),
            fov: this.screenW < this.screenH && this.screenW < 768 ? undefined : 38,
          } : undefined,
        };
      }, () => this.transitioning || (hasArt && picturesOn(useStore.getState().settings)));
    });
  }

  private stopNaturalTalk(release: boolean) {
    if (!this.naturalView?.stop(release)) this.naturalView = undefined;
  }

  private stopTalkLayout(release = false) {
    this.stopNaturalTalk(release);
    this.talkCamera?.dispose();
    this.talkCamera = undefined;
    this.talkSpeaker = null;
  }

  private aimTalk(to: TalkActor) {
    if (to === this.talkSpeaker) return;
    this.talkSpeaker = to;
    const p = this.player.root.position, a = to.ch.root.position;
    if (Math.hypot(a.x - p.x, a.z - p.z) > 0.1) this.heading = Math.atan2(a.x - p.x, a.z - p.z);
    this.talkCamera?.aim(to);
  }

  private onSessionEvent(name: string, data: any) {
    if (this.cave) this.caveCode?.applyCaveEvent(this.cave, this.session, this.talkNpc?.id, this.talkTree, name, data);
    showConversationEvent(name, data);
    if (name === "pay") audio.sfx("coin");
    if (name === "taxi-ride" && data?.to) this.pendingRide = { to: data.to, by: "taxi" };
    if (name === "bus-ride" && data?.to) this.pendingRide = { to: data.to, by: "bus" };
    if (name === "go" && data?.zone) this.pendingRide = { to: data.zone, by: "taxi" };
    if (name === "board") this.pendingRide = { to: "airport", by: "plane" };
    if (name === "surf") {
      if (this.surf) this.pendingSurf = data?.level === "advanced" ? "advanced" : "beginner";
    } else this.modes.event(name, data);
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
    const reduceMotion = this.talkCamera?.reducedMotion;
    this.session = null;
    this.stopTalkLayout(true);
    audio.recordedDialogue = false;
    useStore.getState().setConv({ active: false });
    this.rig.talk = null;
    this.talkCast = [];
    this.player.root.visible = true;
    this.talkTree = false;
    this.rig.mode = this.walkCamera;
    this.rig.cam.clearViewOffset();
    if (reduceMotion) this.rig.snap();
    // the person stays turned to the player and turns back home in their own time (updateNpcs)
    this.talkNpc = null;
    if (completed && !this.swimming && !this.rides.riding && !this.modes.active && !this.modes.modal) {
      this.keepsake.show(this.player.rightHand, keepsakeFor(sit.id));
    }
    if (this.pendingRide) { const r = this.pendingRide; this.pendingRide = null; this.ride(r.to, r.by); }
    this.pendingSurf = null;
    this.modes.launchQueued();
    if (completed && !sit.bonus) this.advanceObjective(sit);
    this.refreshObjective();
  }

  closeConversation() { this.session?.close(); }
  modeOffer(sitId: string) { return this.modes.offer(sitId); }
  modeFromConversation(id: string) {
    if (!this.modes.queue(id)) return;
    if (id === "surf" && this.pendingSurf) this.modes.event(id, { level: this.pendingSurf });
    this.pendingRide = null;
    if (this.session?.active) this.session.close(); else this.modes.launchQueued();
  }
  modeStart(id: string, option?: string) {
    this.modes.start(id, option);
    this.observeStreetAndPhone();
  }
  modeExit() { this.modes.exit(); }
  modeAction(id: string, name: string, value?: string | boolean) {
    const release = id === "surf" && (name === "clear" || name === "key-up" || (name.startsWith("arrow:") && value === false));
    if (!release && (this.transitioning || useStore.getState().hud.panel)) return;
    if (id === "directions") this.quests.directionAction(name);
    else if (this.modes.owns(id)) {
      if (id === "surf" && name === "clear") this.setJoystick(0, 0);
      this.modes.get(id)?.action?.(name, value);
    }
  }
  debugBilliards() {
    const debug = this.billiards.debug();
    if (!debug) return undefined;
    return {
      ...debug,
      start: (group?: "solids" | "stripes") => {
        if (this.transitioning || this.modes.active || this.session?.active) return false;
        useStore.getState().setHud({ panel: null });
        if (this.zone.id !== BILLIARDS_PLACE) this.enterZone(BILLIARDS_PLACE, TABLE_PROMPT, true);
        return this.modes.start("billiards", group);
      },
    };
  }
  debugBarista() {
    if (!import.meta.env.DEV) return undefined;
    return {
      start: () => {
        if (this.transitioning || this.modes.active || this.session?.active) return false;
        useStore.getState().setHud({ panel: null });
        if (this.zone.id !== BARISTA_CONVERSATION.location) this.enterZone(BARISTA_CONVERSATION.location, BARISTA_PROMPT, true);
        return this.modes.start("barista", "debug");
      },
      state: () => this.barista?.state() ?? null,
    };
  }
  debugGoFish() {
    if (!import.meta.env.DEV) return undefined;
    return {
      start: (seed?: number) => {
        if (this.transitioning || this.modes.active || this.session?.active) return false;
        useStore.getState().setHud({ panel: null });
        if (this.zone.id !== GOFISH_CONVERSATION.location) this.enterZone(GOFISH_CONVERSATION.location, GOFISH_PROMPT, true);
        if (seed !== undefined) this.gofish?.seed(seed);
        return this.modes.start("gofish", "debug");
      },
      seed: (seed: number) => this.gofish?.seed(seed),
      state: () => this.gofish?.state() ?? null,
    };
  }
  get activeSession() { return this.session; }

  /** Taxi or bus: fade, travel, arrive in front of the destination. After boarding a plane the
   *  trip is over and the player is back outside the airport. */
  ride(to: string, by: "taxi" | "bus" | "plane" = "taxi") {
    if (this.disposed || this.enteringFirstExterior || this.transitioning) return;
    const st = useStore.getState();
    const dest = by === "plane" ? AIRPORT_EXIT : this.arrivalPoint(to);
    if (!dest) return;
    this.keepsake.clear();
    const banner = by === "plane" ? { title: "✈️ Gero skrydžio!", sub: "…ir sveiki sugrįžę į Maple Harbor" }
      : { title: by === "bus" ? "🚌 Važiuojame autobusu…" : "🚕 Važiuojame…", sub: LOCATIONS[to]?.name };
    st.setHud({ fade: 1, fadeOnFrames: false, zoneBanner: banner });
    audio.sfx("car");
    clearTimeout(this.rideTimer);
    this.rideTimer = setTimeout(() => {
      this.rideTimer = undefined;
      if (this.disposed) return;
      // a conversation has started meanwhile: stay put, just lift the fade
      if (this.session?.active) { useStore.getState().setHud({ fade: 0, zoneBanner: null }); return; }
      this.enterZone("town", dest, true, undefined, () => {
        useStore.getState().setHud({ zoneBanner: banner });
        this.afterZoneDelay(() => {
          if (useStore.getState().hud.zoneBanner?.title === banner.title) useStore.getState().setHud({ zoneBanner: null });
        }, 3200);
      }, 700);
    }, by === "plane" ? 2600 : 1400);
  }
  private rideTimer: ReturnType<typeof setTimeout> | undefined;
  taxiRide(to: string) { this.ride(to, "taxi"); }

  /** A new conversation is starting: forget a queued ride, and call off one still on its way
   *  (lift its fade and banner; the player stays where the conversation puts them). */
  private cancelRide() {
    this.pendingRide = null;
    this.modes.cancelQueued();
    this.pendingSurf = null;
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
    if (dest) { this.modes.exit(true); this.enterZone("town", dest); }
  }

  // ------------------------------------------------------------------ objectives

  orderedSituations(): SituationMeta[] {
    return [...ROUTE].sort((a, b) => a.chapter - b.chapter || a.order - b.order || a.id.localeCompare(b.id));
  }

  guideToPlace(loc: string, directions?: Destination | null, npc?: string) {
    if (this.caveGuide.select(loc, npc)) {
      this.coveArt.load(this.town.group);
      this.islandGuide = false;
      this.autoPath = this.autoTarget = null;
      this.refreshObjective();
      return;
    }
    const door = this.town.doors.find((d) => d.loc === loc);
    const outdoor = OUTDOOR_GUIDES[loc];
    if ((!door && !outdoor) || this.zone.id === loc || this.rides.riding) return;
    if (this.zone.interior) {
      this.walkTo(this.zone.interior.exit.x, this.zone.interior.exit.z - 0.6, { kind: "exit", id: loc, directions });
    } else if (door) {
      this.walkTo(door.outX, door.outZ, { kind: "point", id: loc, directions });
    } else if (outdoor) {
      this.walkTo(outdoor.x, outdoor.z, { kind: "point", id: loc, directions, rot: outdoor.rot, alignCamera: outdoor.alignCamera });
    }
    if (this.autoTarget) this.pathT = 0;
  }

  private routeVisualTarget() {
    const target = this.autoTarget;
    return guideVisualTarget(this.autoPath, target, target?.directions ? useTownQuests.getState().directions : null);
  }

  guideToLighthouse() {
    if (!LIGHTHOUSE_ISLAND) return;
    this.islandGuide = true;
    this.caveGuide.mode = "objective";
    this.refreshObjective();
    if (!this.rides.riding) this.autoWalkToObjective();
  }

  setObjective(sitId: string | null) {
    const sit = sitId ? SITUATION_BY_ID[sitId] : undefined;
    if (sit?.location === CAVE_ZONE) { this.guideToPlace(CAVE_ZONE, undefined, sit.npc); return; }
    if (sit?.bonus) return;
    if (this.caveGuide.mode === "cave") this.autoPath = this.autoTarget = null;
    this.caveGuide.clear();
    this.islandGuide = false;
    useStore.getState().updateProgress((p) => { p.objective = sitId; });
    this.refreshObjective();
  }

  private advanceObjective(done: SituationDef) {
    const pr = useStore.getState().progress;
    if (pr.objective && pr.objective !== done.id && !SITUATION_BY_ID[pr.objective]?.bonus) return;
    const next = this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions);
    this.setObjective(next?.id ?? null);
    // (in the situation picker flow the end-of-conversation buttons offer the next one instead)
    if (next && !this.lastScenario) setTimeout(() => useStore.getState().toast({ kind: "info", sitId: next.id, title: "Kita užduotis", body: `${next.title.lt} — ${LOCATIONS[next.location]?.lt ?? ""}` }), 2500);
  }

  currentObjective(): SituationMeta | null {
    const pr = useStore.getState().progress;
    if (pr.objective && SITUATION_BY_ID[pr.objective] && !SITUATION_BY_ID[pr.objective].bonus) return SITUATION_BY_ID[pr.objective];
    const first = this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions) ?? null;
    return first;
  }

  private phoneTask() {
    const phone = useStore.getState().progress.phone;
    if (phone?.office && (phone.followUp === "office" || !phone.invitation)) {
      return { id: "s90-running-late", loc: "office", title: OFFICE_TASK };
    }
    const invite = phone?.invitation;
    const loc = invite && invitationLocation(invite.place);
    return invite && loc ? { id: "s83-invite-call", loc, title: invitationTitle(invite) } : null;
  }

  private updatePhoneTasks(dt: number, snapshot: PhoneSnapshot) {
    const progress = useStore.getState().progress.phone;
    const invite = progress?.invitation;
    if (!progress?.office) this.officeRequested = false;
    if (!invite && !progress?.office && !this.meeting) return;
    const outdoors = !this.zone.interior;
    if (invite && outdoors && !this.meeting && !this.loadMeeting) {
      this.loadMeeting = true;
      void import("./phone/meeting").then(({ LizzieMeeting }) => {
        if (this.disposed) return;
        const mode = this.meeting = new LizzieMeeting(this.modeHost, this.town, () => this.refreshObjective());
        this.modes.register(mode);
      }, (error) => console.warn("Lizzie meeting unavailable", error));
    }

    if (this.meeting) {
      this.meeting.waitAt((invite && invitationLocation(invite.place)) ?? null);
      this.meeting.updateActor(dt, outdoors);
    }
    if (!snapshot.visible || !freeToWalk(snapshot)) return;
    if (outdoors && this.meeting?.nearPlayer()) {
      this.modeStart(this.meeting.id);
      return;
    }
    if (progress?.office) {
      const door = outdoors && this.town.doors.find((d) => d.loc === "office");
      const p = this.player.root.position;
      const indoors = this.zone.id === "office";
      const atDoor = !!door && Math.hypot(door.outX - p.x, door.outZ - p.z) < 3;
      if (!indoors && !atDoor) this.officeRequested = false;
      else if (!this.officeRequested) {
        this.officeRequested = true;
        if (indoors) this.startScenario("s34-meeting");
        else this.fadeThen(() => { if (!this.disposed) this.startScenario("s34-meeting"); });
      }
    }
  }

  /** Where to guide the player right now for the current objective; for a person, where to stand to talk to them (their
   *  `ax/az` across a counter, a stall or a table, with `person` where they stand; else where they stand). */
  objectiveTarget(mode: GuideKind = this.caveGuide.mode): {
    kind: "npc" | "door" | "exit" | "point" | "cave-entry" | "glyph" | "tree";
    id?: string; x: number; z: number; person?: { x: number; z: number }; label: string
  } | null {
    const island = LIGHTHOUSE_ISLAND;
    if (mode === "cave") return this.caveGuide.target(this.player.root.position, this.caveZone, this.wild ? undefined : this.zone.interior?.exit);
    if (this.wild) return this.caveZone?.exitTarget ?? null;
    if (this.islandGuide && island) {
      if (this.zone.interior) return { kind: "exit", x: this.zone.interior.exit.x, z: this.zone.interior.exit.z - 0.4, label: "Išeiti į lauką" };
      const p = this.player.root.position, d = island.jetty;
      if (this.rides.riding?.kind === "boat" || this.swimming) return { kind: "point", x: d.x0 + 0.9, z: (d.z0 + d.z1) / 2, label: island.name };
      if (islandGroundY(island, p.x, p.z) !== undefined) return { kind: "point", ...island.keeper.approach, person: island.keeper, label: island.name };
      const boat = this.rides.boatApproach(p.x, p.z);
      return boat && { kind: "point", ...boat, label: island.name };
    }
    const task = this.phoneTask();
    if (task) {
      const loc = LOCATIONS[task.loc];
      if (this.zone.id === "office" && task.loc === "office") {
        const kate = this.npcs.find((npc) => npc.id === "kate");
        if (kate) return { kind: "npc", id: "kate", x: kate.home.x, z: kate.home.z, label: NPCS.kate.name };
      }
      if (this.zone.interior) return { kind: "exit", x: this.zone.interior.exit.x, z: this.zone.interior.exit.z - 0.4, label: "Išeiti į lauką" };
      const point = this.arrivalPoint(task.loc);
      return point ? { kind: "door", id: task.loc, x: point.x, z: point.z, label: loc.name } : null;
    }
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
    this.guidance.setKind(this.caveGuide.mode);
    const sit = this.currentObjective();
    const st = useStore.getState();
    const island = LIGHTHOUSE_ISLAND;
    const guide = this.routeVisualTarget();
    const coveObjective = !this.wild && this.caveGuide.exteriorObjective();
    if (coveObjective) {
      st.setHud({ objective: coveObjective });
      this.showBeacon(this.objectiveTarget());
      this.pathT = 0;
      return;
    }
    if (this.islandGuide && island) {
      st.setHud({ objective: { sitId: island.keeper.says, title: island.name, titleLt: island.lt, goal: "", where: "", dist: null, angle: null, inside: false } });
      this.showBeacon(guide ?? this.objectiveTarget());
      this.pathT = 0;
      return;
    }
    const task = this.phoneTask();
    if (task) {
      st.setHud({ objective: { followUp: true, targetLoc: task.loc, sitId: task.id, title: task.title, goal: "", where: LOCATIONS[task.loc].lt, dist: null, angle: null, inside: this.zone.id === task.loc } });
      this.showBeacon(guide ?? this.objectiveTarget());
      this.pathT = 0;
      return;
    }
    if (!sit) { st.setHud({ objective: null }); this.showBeacon(guide); if (!guide) this.guidance.setPath(null); return; }
    const loc = LOCATIONS[sit.location];
    st.setHud({ objective: { sitId: sit.id, title: sit.title.lt, goal: sit.goal, where: loc?.lt ?? "", dist: null, angle: null, inside: this.zone.id === sit.location } });
    this.showBeacon(guide ?? this.objectiveTarget());
    this.pathT = 0;
  }

  /** The beacon over the objective's door or person; for someone talked to across a counter (a spot of their own), it
   *  stays over them and its ring lies on that spot, where the trail ends. */
  private showBeacon(tgt: { kind: string; x: number; z: number; person?: { x: number; z: number } } | null) {
    if (!tgt) { this.guidance.setBeacon(null); return; }
    const over = tgt.person ?? tgt;
    const y = this.islandGuide && LIGHTHOUSE_ISLAND && !this.zone.interior ? islandGroundY(LIGHTHOUSE_ISLAND, over.x, over.z) : undefined;
    this.guidance.setBeacon(over.x, over.z, tgt.kind === "npc" || tgt.person ? 2.9 : 3.8, tgt.person ? tgt : undefined, y);
  }

  // ------------------------------------------------------------------ loop

  private onResize = () => {
    if (this.disposed) return;
    this.syncSize();
    this.talkCamera?.resize();
  };

  private syncSize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w <= 0 || h <= 0 || (w === this.screenW && h === this.screenH)) return;
    this.speedFeel?.clearPose();
    this.renderer.setSize(w, h);
    this.rig.resize(w, h, w > h && h <= 520);
    this.screenW = w;
    this.screenH = h;
    this.talkCamera?.resize();
    if (this.talkTree) this.aimTree();
  }

  screenState() {
    const { width: bufferW, height: bufferH } = this.renderer.domElement;
    const { aspect, fov } = this.rig.cam;
    return { w: this.container.clientWidth, h: this.container.clientHeight, bufferW, bufferH, pixelRatio: this.renderer.getPixelRatio(), aspect, fov, follow: this.rig.followScale };
  }

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
    if (avg > 22 && pr > 1) { this.renderer.setPixelRatio(Math.max(1, pr - 0.25)); p.easy = 0; }
    else if (avg < 17 && pr < top) { if ((p.easy += 2) >= 6) { this.renderer.setPixelRatio(Math.min(top, pr + 0.25)); p.easy = 0; } }
    else p.easy = 0;
  }

  private applyWalkingViewShift(w: number, h: number, talking: boolean) {
    const stageShift = this.rig.mode === "stage" ? this.rig.stage?.shiftY : undefined;
    const walkingLens = this.rig.mode === "follow" || this.rig.mode === "interior";
    const uprightShift = this.rig.mode !== "talk" && h > w * 1.15 ? (this.rig.mode === "follow" ? 0.12 : 0.1) : 0;
    const shift = this.sidewaysPhone && walkingLens && !talking ? 0.1 : uprightShift;
    this.rig.applyViewShift(w, h, 0, h * (stageShift ?? this.rig.standView?.shiftY ?? -shift));
  }

  private taxiStandFrame() {
    // A mode owns its pending launch too, before active/riding are set by the fade callback.
    if (this.zone.id !== "town" || this.rides.riding || this.modes.engaged || this.transitioning || this.session?.active || this.aloft) return undefined;
    const { x, z } = this.player.root.position;
    return taxiStandFrameAt(x, z, this.rig.cam.aspect);
  }

  private updateViewLights() {
    const pp = this.player.root.position;
    this.sun.position.set(pp.x - 40, 70, pp.z + 30);
    this.sun.target.position.set(pp.x, 0, pp.z);
    this.fx?.frame(pp, !!this.zone.interior);
    this.sky.position.copy(this.rig.cam.position);
  }

  private drawTown() {
    const firstExterior = !this.zone.interior && this.firstExteriorAt === undefined;
    const scenery = firstExterior && this.town.exitHills
      ? [this.town.exitHills, this.town.group.getObjectByName("desert-road-crest")!]
      : undefined;
    // Submit the static exit meshes under the loader even when the restored camera faces away from them.
    if (scenery) for (const mesh of scenery) mesh.frustumCulled = false;
    try { this.renderer.render(this.scene, this.rig.cam); }
    finally { if (scenery) for (const mesh of scenery) mesh.frustumCulled = true; }
    this.presentWorld("town");
    if (firstExterior) {
      this.firstExteriorAt = this.t;
      this.firstExteriorDraw?.();
      this.firstExteriorDraw = undefined;
    }
  }

  private canWarmCrashShaders() {
    return this.firstExteriorAt !== undefined && this.t - this.firstExteriorAt >= 1
      && this.zone.id === "town" && this.ledges?.ready && this.carVisuals?.ready
      && !document.hidden && !this.transitioning && !this.session?.active && !this.modes.active
      && !this.keys.size && !this.joy.x && !this.joy.y && !this.pointer.down && !this.rides.riding
      && this.moveVel.lengthSq() < 0.01;
  }

  private loop = () => {
    if (this.disposed) return;
    this.syncSize();
    const w = this.screenW, h = this.screenH;
    if (!w || !h) return;
    this.adaptResolution(performance.now());
    const elapsed = this.clock.getDelta();
    // Both sides of the water handoff present the same simulation instant.
    const wallDt = Math.min(0.05, Math.max(0, elapsed));
    const dt = this.sea?.handingOff ? 0 : wallDt;
    this.t += dt;
    if (this.seaReturnView) Object.assign(this.rig.cam, this.seaReturnView.live);
    if (this.frameFade.active) {
      this.frameFade.update(dt);
      this.transitioning = this.frameFade.active;
    }
    this.pad?.tick(wallDt);
    const st = useStore.getState();
    const talking = !!this.session?.active;
    const mode = this.modes.active;
    if (this.naturalView && !this.naturalView.update(st.conv, dt)) this.naturalView = undefined;
    const speaker = this.naturalTalk?.speaker;
    if (speaker) {
      speaker.headJoint.getWorldPosition(this.talkAt);
      this.player.watch = this.talkAt;
      this.player.steady = true;
    }
    this.reactions.observe(talking || st.conv.active);
    if (this.flight && this.rig.stage) {
      // the first visit's flight over the town: the camera along its path, and down to the airport at its end
      this.flight.t += dt;
      flightAt(THEME.flyover, this.flight.t / FLIGHT_SECONDS, this.rig.stage.pos, this.rig.stage.look);
      if (this.flight.t >= FLIGHT_SECONDS) this.endFlight();
    }
    const blocked = talking || !!st.hud.glyph || !!st.hud.panel || this.caveTravel.pending || this.transitioning || this.modes.modal || !!this.flight;
    this.updatePlayer(dt, blocked, this.transitioning && !this.frameFade.active && !talking && !st.hud.panel && !mode);
    const phoneState = this.phoneSnapshot();
    this.updatePhoneTasks(dt, phoneState);
    // Do not count the gap between animation frames across a tab visibility change.
    const visibleElapsed = this.wasHidden ? 0 : elapsed;
    this.phone.tick(visibleElapsed, this.phoneSnapshot());
    this.wasHidden = document.hidden;
    if (!blocked) this.checkRoadEntry();
    // (the open road and the open sea draw their own scenes, at the size syncSize has just applied)
    const roadDrawn = this.road?.render(this.renderer, w, h);
    if (roadDrawn || this.sea?.render(this.renderer, w, h)) {
      this.presentWorld(roadDrawn ? "road" : "sea");
      this.streetLife.observe(this.streetSnapshot());
      this.sampleFps(true);
      return;
    }
    this.keepsake.tick();
    // (what one can drive: its people, the way back to its curb; at the wheel it is moved from updatePlayer)
    const riding = this.rides.riding;
    if (!riding) this.rides.update(dt, this.t, null);
    const motor = riding && this.rides.phase === "on" && !this.zone.interior && !this.modes.owns("road") ? riding.kind : null;
    if (motor === "car" && !st.hud.panel && this.speedFeel) this.speedFeel.sound();
    else if (!this.speedFeel?.release() || motor === "boat") {
      audio.motor(st.hud.panel && motor === "car" ? null : motor, motor === "boat" ? this.rides.revs : 0);
    }
    this.updateNpcs(dt, talking, mode);
    this.updateIsland(dt, blocked || !!mode);
    if (!this.zone.interior) {
      const driver = riding?.kind === "car" && this.rides.phase === "on" && !this.rides.water?.suppressInput ? riding.m : undefined;
      this.ambient.update(dt, this.player.root.position, this.hop.y, this.hop.air, driver, !riding && !this.swimming && !this.aloft && !this.rides.water?.assistedOnFoot);
      if (this.trafficReplyAt !== undefined && this.t >= this.trafficReplyAt) {
        this.trafficReplyAt = undefined;
        if (driver && !blocked && this.ambient.nearbyTraffic(driver.x, driver.z, 20)) audio.sfx("hornReply");
      }
      this.rides.updateCrashes(dt);
      this.carVisuals?.update(dt);
    }
    if (!this.wild) this.town.update(this.t, dt);
    this.zone.interior?.update?.(this.t, dt);
    this.wild?.frame?.(this.t, dt, this.rig.cam, this.player.root.position, h * this.renderer.getPixelRatio());
    const position = this.player.root.position;
    this.coveArt.update(this.town.group, this.zone.id === "town", position.x, position.z, !this.caveTravel.pending);
    this.cave?.update(dt, position, this.heading, blocked || !!this.conversationLoads || document.hidden || this.hop.air,
      this.offerOak);
    this.modes.tick(dt, !this.zone.interior && !talking && !this.flight);
    this.guidance.visible = !talking && !mode && !this.flight;
    this.guidance.group.visible = !talking && !mode && !this.flight;
    this.guidance.update(dt, this.wild?.floor ?? (this.zone.interior ? undefined : floorY));
    // guidance path (throttled)
    this.pathT -= dt;
    if (this.pathT <= 0 && !talking && !mode) {
      this.pathT = 0.5;
      const guide = this.routeVisualTarget();
      const tgt = guide ?? this.objectiveTarget();
      const p = this.player.root.position;
      if (tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) > 2.2) {
        const afloat = this.islandGuide && (riding?.kind === "boat" || this.swimming);
        this.guidance.setPath(guide && this.autoPath ? [[p.x, p.z], ...this.autoPath]
          : afloat ? [[p.x, p.z], [tgt.x, tgt.z]] : this.zone.nav.path(p.x, p.z, tgt.x, tgt.z));
      } else this.guidance.setPath(null);
      this.showBeacon(tgt);
    }
    // camera: where the player is heading and how fast (it swings in behind them after a moment, camera.ts)
    const speed = Math.hypot(this.moveVel.x, this.moveVel.z);
    // (at a wheel the camera stays behind the car, backing up too)
    this.rig.motion.dir = riding ? this.rideCourse : mode ? this.heading : speed > 0.3 ? Math.atan2(this.moveVel.x, this.moveVel.z) : this.heading;
    this.rig.motion.speed = speed;
    // (where they will be in a moment, walking on as now, out of the walls: the camera makes room before it is needed)
    this.rig.motion.next.copy(this.player.root.position).addScaledVector(this.moveVel, 0.3).setY(0);
    if (speed > 0.3) this.zone.colliders.resolve(this.rig.motion.next, 0.38, !this.zone.interior, !!this.road?.inStrip);
    this.rig.dragging = this.pointer.down && this.pointer.moved > 6;
    this.rig.hold = this.hop.air && !this.zone.interior;
    // (up with a jump by half its height: the second jump's top stays in the picture)
    this.rig.target.lerp(this.tmpV.copy(this.player.root.position).setY(this.player.root.position.y + this.hop.lift * 0.5), Math.min(1, dt * 10));
    if (mode?.camera && this.modes.active === mode) this.rig.mode = mode.camera;
    const actorTalk = talking && !!this.talkNpc && this.rig.mode === "talk";
    if (actorTalk) this.talkCamera?.update(dt);
    // Keep the visible view while the talk chunk or measured panel is pending.
    const awaitingShot = actorTalk && !this.rig.talk;
    if (!awaitingShot) {
      const standFrame = this.taxiStandFrame();
      this.rig.update(dt, this.heading, speed > 0.7, true, (st.settings.cameraFollow || !!riding) && !this.pointer.down, standFrame);
    }
    this.frameKeeper(dt, blocked || !!mode);
    // under the water (a dive: the camera below the surface): the seabed, the fish, the water's own light
    {
      const cp = this.rig.cam.position, pp1 = this.player.root.position, sur = this.zone.interior ? null : waterY(pp1.x, pp1.z, this.t);
      const under = sur !== null && this.diveK > 0.2 && cp.y < sur - 0.1;
      if (this.swimming || this.undersea.on) this.undersea.update(dt, this.t, under, this.tmpV.set(pp1.x + Math.sin(this.heading) * 0.4, pp1.y + 1.2, pp1.z + Math.cos(this.heading) * 0.4), speed / SWIM.speed);
      this.underWater(this.undersea.on);
    }
    // Walking eases the lens. A conversation uses the lens its shot was fitted with. At a car's wheel the speed feel
    // (rides/speedFeel.ts) presents the eased lens.
    if (!awaitingShot) {
      const { cam } = this.rig, follow = this.rig.mode === "follow", car = riding?.kind === "car";
      const fov = this.rig.fovFor(w, h, follow && !car && this.vel.lengthSq() > 30) + (follow && !car ? this.rideFov : 0);
      const base = this.speedFeel?.baseFov ?? cam.fov, d = fov - base;
      const lens = this.rig.mode === "talk" || Math.abs(d) < 0.05 ? fov : base + d * Math.min(1, dt * 3);
      const presented = this.speedFeel?.present(lens, dt, this.t, car && follow && !blocked && !this.modes.engaged) ?? lens;
      if (presented !== cam.fov) {
        cam.fov = presented;
        cam.updateProjectionMatrix();
      }
    }
    this.quests.observe(this.rig.cam);
    // people and cars far down the street, a few pixels tall in the haze, are left out of the walking view (it is wider
    // than it was: this keeps its draw calls as they were)
    this.farCull();
    // the trees between the camera and the player fade (fade.ts); none in a conversation or indoors
    this.chest.set(position.x, 1.35, position.z);
    this.fader.update(dt, this.rig.cam.position, this.chest, this.rig.mode === "follow" && !this.zone.interior);
    // and what is too thin for either (a lamp post right in the way) is see-through along the line to the player
    CUT.a.value.copy(this.rig.cam.position);
    CUT.b.value.copy(this.chest);
    CUT.r.value = this.rig.mode === "follow" && !this.zone.interior ? 0.55 : 0;
    // Let the player stand lower while walking on a phone.
    if (!actorTalk) {
      const sideways = this.sidewaysPhone;
      if (talking && this.talkTree) {
        const wide = w > 900 && !sideways;
        // Match the conversation's visible picture area, including scenes-off 3D conversations.
        const pictureHeight = talkPictureHeight(h);
        this.rig.applyViewShift(w, h, sideways ? w * 0.375 : wide ? Math.min(w * 0.22, 380) : 0,
          wide || sideways ? 0 : (h - pictureHeight) / 2);
      } else if (mode === this.billiards) {
        this.billiards.frameView(w, h, document.querySelector(".bl-table-pad")?.getBoundingClientRect());
      } else if (this.barista && mode === this.barista) {
        const bottom = document.querySelector(".barista-bottom, .barista-result .mode-score-card")?.getBoundingClientRect().top;
        this.barista.frameView(w, h, bottom ?? h, document.querySelector<HTMLElement>(".barista-cue"));
      } else if (this.gofish && mode === this.gofish) {
        const top = document.querySelector(".gofish-top")?.getBoundingClientRect().bottom;
        const tags = document.querySelector(".gofish-opponents")?.getBoundingClientRect();
        const panel = document.querySelector(".gofish-bottom, .gofish-result .mode-score-card")?.getBoundingClientRect();
        this.gofish.frameView(w, h, top ?? 0, tags, panel);
      } else this.applyWalkingViewShift(w, h, talking);
    }
    this.applySeaReturnView(dt, w, h);
    if (this.rides.water?.cameraFloor(this.rig.cam.position, this.t)) this.rig.cam.updateMatrixWorld(true);
    // Street subjects use the camera and lens that will draw this frame.
    this.streetLife.tick(dt, this.streetSnapshot(), visibleElapsed);
    this.updateViewLights();
    // an illustrated scene covers the view during the conversation: save the phone's battery
    const covered = this.covered = talking && picturesOn(st.settings) && !!sceneFor(st.conv.sitId, st.conv.hostId);
    const showParkingKeys = !this.zone.interior && !talking && !this.flight && !this.modes.active && !this.transitioning;
    const underfoot = showParkingKeys && !this.rides.riding && this.hop.y > 0
      ? this.ledges?.supportPiece(position.x, position.z, this.hop.y, this.hop.air) : undefined;
    this.rides.updateParkingKeys(this.t, showParkingKeys, underfoot);
    if (!covered || this.firstExteriorDraw) {
      this.road?.stage(this.renderer);
      if (!blocked && !mode && !this.rides.water?.suppressInput && riding?.kind === "car" && this.rides.phase === "on" && this.road?.shouldStart(riding)
        && this.modes.start("road") && this.road.render(this.renderer, w, h)) {
        this.presentWorld("road");
        this.streetLife.observe(this.streetSnapshot());
        this.sampleFps(true);
        return;
      }
      if (!blocked && !mode && riding?.kind === "boat" && this.rides.phase === "on" && this.sea?.shouldStart(riding)) {
        if (import.meta.env.DEV) {
          this.rig.cam.updateMatrixWorld(true);
          this.seaDeparture = crossingPose(this.rig.cam, riding.mesh, this.player.root, this.t);
        }
        if (this.modes.start("sea")) {
          this.savePlace();
          this.sea.render(this.renderer, w, h);
          this.presentWorld("sea");
          this.sampleFps(true);
          return;
        }
      }
      const probes = this.canWarmCrashShaders() ? this.crashShaderProbes : undefined;
      if (probes) {
        // Submit the shaders once with the town's actual framebuffer and lighting. The probes sit behind the near plane.
        const cam = this.rig.cam;
        probes.position.set(0, 0, 2).applyQuaternion(cam.quaternion).add(cam.position);
        this.scene.add(probes);
      }
      this.drawTown();
      this.quests.capture(this.renderer.domElement);
      if (probes) {
        probes.removeFromParent();
        this.rides.finishCrashShaderWarmup();
        this.crashShaderProbes = undefined;
        this.crashShadersReady = true;
      } else this.sampleFps(false);
      if (!this.crashShadersScheduled && this.canWarmCrashShaders()) {
        this.crashShadersScheduled = true;
        const warm = () => {
          if (this.disposed) return;
          if (!this.canWarmCrashShaders()) {
            this.crashShadersScheduled = false;
            return;
          }
          void this.rides.compileCrashShaders(this.renderer, this.scene).then((group) => {
            if (!this.disposed) this.crashShaderProbes = group;
          }).catch((error) => { if (!this.disposed) console.warn("Crash shader warmup unavailable", error); });
        };
        if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 750 });
        else setTimeout(warm, 0);
      }
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
      audio.ambience(this.ambienceAllowed() && (!this.wild || !this.transitioning), {
        sea, surf: out ? surfLevel(pz - SHORE.top) : this.wild ? this.caveCode!.caveWaterLevel(px, pz) : 0, gulls: out && sea > 0.4, birds: out ? (inPark ? 1 : 0.35 * (1 - sea)) : 0, cafe,
        market, harbor: out ? near("the-pier", 34) * sea : 0, plaza: out && onSquare ? 1 : 0, tropical,
      });
    }
    // "walking" for the HUD (the task card folds away while you walk): after 0.4 s on the move, until
    // 1.2 s standing still
    if (this.vel.lengthSq() > 1) { this.moveT += dt; this.stillT = 0; } else { this.stillT += dt; this.moveT = 0; }
    const walking = st.hud.walking ? this.stillT < 1.2 : this.moveT > 0.4;
    if (walking !== st.hud.walking) st.setHud({ walking });
  };

  private loadIsland() {
    const island = LIGHTHOUSE_ISLAND;
    if (!island) return Promise.resolve();
    return this.islandLoad ??= import("./world/lighthouseIsland").then(({ attachLighthouseIsland }) => {
      if (this.disposed) return;
      this.islandScene = attachLighthouseIsland(island, this.town.group, this.field, this.learnerAt,
        this.undersea.on ? this.dry : undefined);
      this.islandScene.update(this.t);
    }).catch((error) => {
      this.islandLoad = undefined;
      throw error;
    });
  }

  /** An illustrated scene covers the town (a conversation in pictures). */
  private covered = false;

  /** The keys or the stick, for a ride of the town's or a mini-game's (kit modes get them as they are). */
  private driveInput(blocked: boolean, out = { x: 0, y: 0, brake: false }) {
    let x = 0, y = 0;
    if (!blocked) {
      if (this.keys.has("arrowup") || this.keys.has("w")) y += 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) y -= 1;
      if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
      const pad = this.pad?.input, stick = this.inputStick(true);
      if (stick === pad && pad) { x = pad.x; y = pad.brake ? 0 : pad.throttle || pad.y; }
      else if (stick.x || stick.y) { x = stick.x; y = stick.y; }
    }
    out.x = x; out.y = y; out.brake = this.braking;
    return out;
  }

  /** At a car's wheel or a boat's helm in the town: the keys or the stick drive it (rides/drive.ts); at the helm on a
   *  phone the stick points the way (point and go); a tap on the ground or the water drives there (`rideGoal`). */
  private townRideControls(dt: number, blocked: boolean): Controls | null {
    const r = this.rides.riding!, m = r.m;
    const source = this.inputStick(true), pad = this.pad?.input;
    const fromPad = source === pad;
    const stick = !blocked && !!(source.x || source.y || fromPad);
    const { x, y, brake } = this.driveInput(blocked);
    let hands = controlsFrom(x, y, brake);
    if (r.kind === "boat") {
      const point = stick && !(fromPad && pad?.throttle);
      const aim = this.helmSteer.update(point ? x : 0, point ? y : 0, true, this.rig.yaw, this.rig.manualTurn, dt);
      if (aim.dir !== null && !brake) hands = pointAndGo(m.heading, aim.dir, aim.mag, m.speed);
    } else if (stick && fromPad) hands.throttle = y;
    this.rig.manualTurn = 0;
    if (this.keys.size || stick || brake || this.rides.phase !== "on") this.rideGoal = null;
    const goal = blocked ? null : this.rideGoal;
    if (goal) {
      const dx = goal.x - m.x, dz = goal.z - m.z;
      const d = Math.hypot(dx, dz), want = Math.atan2(dx, dz), off = angleDiff(want, m.heading);
      const closing = d > 0 ? Math.max(0, (dx * m.vx + dz * m.vz) / d) : 0;
      goal.age += dt;
      goal.stopping ||= d <= 3;
      // a car whose goal lies behind it, standing (a tap behind a parked car), first backs up with the wheel the other
      // way, so its nose comes round, then goes forwards: a turn in three, not a pivot into the kerb
      if (r.kind === "car" && !goal.stopping && goal.back <= 0 && goal.tries === 0 && Math.abs(off) > 2.2 && Math.abs(m.speed) < 1.5) { goal.back = 1.6; goal.turn = true; goal.tries = 1; }
      const braking = goal.stopping || d <= 2 + closing * closing / (2 * m.spec.brake);
      if (goal.back > 0 && !braking) {
        // (the turn in three ends as soon as the nose is round; backing out of a tight spot goes on for its time)
        goal.back = goal.turn && Math.abs(off) < 1.2 ? 0 : goal.back - dt;
        hands = { throttle: -0.7, steer: off > 0 ? 1 : -1, brake: false };
      } else hands = braking ? controlsFrom(0, 0, true)
        : pointAndGo(m.heading, want, 0.55 + 0.45 * smoothstep(3, 20, d), m.speed, false);
    }
    return blocked ? null : hands;
  }

  /** After a frame of driving to a tapped spot: how it went (stuck, backing out, there). */
  private followRideGoal(goal: NonNullable<Game["rideGoal"]>, r: Ride, dt: number, x0: number, z0: number, heading0: number) {
    const m = r.m;
    const pace = Math.hypot(m.x - x0, m.z - z0) / Math.max(dt, 1e-4);
    const turning = Math.abs(angleDiff(m.heading, heading0)) > 0.18 * dt;
    goal.still = !goal.stopping && pace < 0.5 && !turning ? goal.still + dt : 0;
    // (wedged going forwards: back up a little with the wheel the other way and try again, three times at most)
    if (goal.still >= 0.8 && goal.back <= 0 && goal.tries < 3 && r.kind === "car") { goal.back = 1.2; goal.turn = false; goal.tries++; goal.still = 0; }
    // (someone standing in its way, the owners who have just handed it over: it waits a moment before giving up)
    if ((goal.stopping && m.pace < 0.05) || goal.still >= 2 || goal.age > 30) this.rideGoal = null;
  }

  /** At a car's wheel or a boat's helm (the town's, or a mini-game's through the kit's `drive`), the player sits in it. */
  private updateRide(dt: number, controls: Controls | null, shoreFrame = false) {
    const r = this.rides.riding!, m = r.m;
    this.rides.update(dt, this.t, controls, shoreFrame);
    // (getting out ends the ride inside update: the player is on foot again, leftRide has set them down)
    if (this.rides.riding !== r) {
      if (r.kind === "car") this.splashes.update(dt, this.t, null, 0);
      return;
    }
    const on = this.rides.phase === "on", v = on ? m.speed : 0, pace = on ? m.pace : 0, car = r.kind === "car";
    const wet = car && !!this.rides.water?.owns(r);
    if (wet && !this.wetRide) { this.dust.clear(); this.dustT = 0; }
    this.wetRide = wet;
    const portraitHelm = on && !car && useStore.getState().hud.showTouch && this.container.clientHeight > this.container.clientWidth * 1.15;
    this.rig.portraitHelm = portraitHelm;
    this.heading = on ? m.heading : this.player.root.rotation.y;
    this.vel.set(on ? m.vx : 0, 0, on ? m.vz : 0);
    this.moveVel.lerp(this.vel, Math.min(1, dt * 15));
    this.lastSpeed = pace;
    // the camera looks along the way it is going: in a slide that is not where it points, and the car is seen side on
    {
      const want = on && pace > 2.5 && v > 0 && Math.abs(m.slip) > 1 ? Math.atan2(m.vx, m.vz) : this.heading;
      const d = Math.atan2(Math.sin(want - this.rideCourse), Math.cos(want - this.rideCourse));
      this.rideCourse += d * Math.min(1, dt * (portraitHelm ? 4 : Math.abs(d) > 2 ? 30 : 7));
    }
    // At the helm the camera drops back a little and the lens widens, more for the kick.
    if (!car) {
      const k = on && !wet ? Math.max(0, Math.min(1.2, (pace - m.spec.town * 0.8) / (m.spec.max - m.spec.town * 0.8))) : 0, kick = on && !wet && m.boost > 0 ? 1 : 0;
      const back = k * 0.1 + kick * 0.05;
      // (the wheel's own zoom stays the player's: only what was added is taken off again)
      const base = this.rig.dist / (1 + this.rideBack);
      this.rideBack += (back - this.rideBack) * Math.min(1, dt * 2.2);
      this.rig.dist = base * (1 + this.rideBack);
      this.rideFov += (k * 6 + kick * 5 - this.rideFov) * Math.min(1, dt * 3);
    }
    // the sounds of it: the tires in a slide (or the hull's rush), the air at speed, a rush at the kick
    {
      const slide = on ? Math.min(1, Math.max(0, (Math.abs(m.slip) - 1.2) / 4.5)) : 0;
      audio.rush("squeal", car && !wet && slide > 0 && pace > 2.5 && this.rides.asphalt.has(m.x, m.z) ? 0.35 + 0.65 * slide : 0, Math.min(1, pace / 14));
      if (!car) audio.rush("wind", on && !wet ? Math.max(0, (pace - 6) / (m.spec.max - 3)) * 0.8 + slide * 0.5 : 0, Math.min(1, pace / 16));
      if (on && !wet && m.boost > 0 && !this.kicked) { this.kicked = true; audio.kickRush(); }
      if (!on || wet || m.boost <= 0) this.kicked = false;
    }
    {
      const fast = on && !wet && pace > (car ? CAR_DRIFT.from : BOAT_DRIFT.from);
      const hud = useStore.getState();
      // (in the water the speed feel winds down: no streaks, wind or lens for a car that is wading)
      if (car && on && !hud.hud.panel) this.speedFeel?.stepTown(dt, wet ? 0 : pace);
      if (hud.hud.fast !== fast || hud.hud.speedLines) hud.setHud({ fast, speedLines: false });
    }
    this.player.moveSpeed = 0;
    this.player.update(dt);
    this.bumpT -= dt;
    if (m.bump > 0.3 && this.bumpT <= 0) { audio.bump(m.bump); this.bumpT = 0.45; }
    // A boat's wake at the hull, and dust behind a car's wheels on loose ground or in a skid.
    if (r.kind === "boat" && on) this.splashes.boatRing(dt, this.t, m);
    else this.splashes.update(dt, this.t, null, 0);
    const reduced = car && !!this.carMotionQuery?.matches;
    if (wet) this.braked = false;
    else if (car && on) {
      const braking = !!controls && !m.drift && (controls.brake || controls.throttle < 0) && v > 0;
      if (braking && !this.braked && pace > 8.5) audio.skid(Math.min(1, pace / 15));
      this.braked = braking;
      this.dustT -= dt;
      const sliding = m.sliding && pace > 3, rolling = !sliding && !(braking && pace > 5);
      const high = useStore.getState().settings.quality === "high";
      if (this.dustT <= 0 && (sliding || high && (!rolling || !reduced && pace > 3 && !this.rides.asphalt.has(m.x, m.z)))) {
        this.dustT = sliding ? 0.05 : 0.11;
        const s = Math.sign(v) || 1, cx = pace > 0.5 ? -m.vx / pace : -m.fx * s, cz = pace > 0.5 ? -m.vz / pace : -m.fz * s;
        for (let i = 0; i < (high ? 2 : 1); i++) {
          const side = i === 0 && (high || Math.random() < 0.5) ? -0.8 : 0.8;
          this.dust.puff(m.x - m.fx * 1.4 * s + m.fz * side, m.z - m.fz * 1.4 * s - m.fx * side, cx, cz, (sliding ? 1.25 : 0.8) + pace / 15, rolling);
        }
      }
    }
    this.dust.update(dt, reduced);
    // (the pigeons on the square take off before a car as before anyone running)
    if (r.kind === "car" && !this.zone.interior) this.pigeons.update(dt, this.player.root.position, Math.abs(v));
    coach.stroll(dt, true);
  }

  private updateModePose(dt: number, heading: number) {
    this.heading = heading;
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.lastSpeed = 0;
    this.player.update(dt);
    this.splashes.update(dt, this.t, null, 0);
    this.dust.update(dt);
  }

  private prepareMode() {
    this.leaveBench();
    if (this.modes.owns("surf")) this.setJoystick(0, 0);
    // A key the workout takes over must be released before its repeats can move the player again.
    if (this.modes.owns("gym")) for (const key of this.keys) this.gymHeldKeys.add(key);
    this.townTalk?.release();
    this.keepsake.clear();
    useStore.getState().dismissRideToasts();
    this.endRide();
    this.autoPath = null; this.autoTarget = null;
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.hop.land(0); this.applyHop();
    this.surface(true);
    this.player.bank = 0;
    this.keys.clear();
    this.pad?.cancel();
    this.nearest = null;
    this.guidance.setPath(null);
  }

  private placeOnFoot(x: number, z: number, rot: number, stayInside = false) {
    if (this.zone.interior && !stayInside) { this.enterZone("town", { x, z, rot }, true); return; }
    const p = this.player.root.position;
    p.set(x, this.wild?.floor(x, z) ?? (this.zone.interior ? 0 : floorY(x, z)), z);
    this.heading = rot;
    this.player.root.rotation.set(0, rot, 0);
    this.hop.land(p.y); this.applyHop();
    this.gait.sync(this.heading, 0); this.gaitOn = false; this.steer.reset();
    this.keys.clear();
    this.pad?.cancel();
    this.rig.mode = this.walkCamera;
    this.rig.target.copy(p);
    this.rig.yaw = rot; this.rig.snap();
    this.nearest = null;
  }

  private readonly modeFrame = { dt: 0, time: 0, blocked: false, x: 0, y: 0, brake: false };

  /** `through`: a door's fade is under way: the player holds still, and a walk under way carries on on the other side. */
  private updatePlayer(dt: number, blocked: boolean, through = false) {
    if (this.waterFade) this.updateCarWaterFade(this.waterFade);
    if (this.rides.water?.tick(dt, this.t, this.wasHidden && !document.hidden)) {
      if (this.rides.riding) this.updateRide(dt, null, true);
      else this.updateModePose(dt, this.heading);
      return;
    }
    if (this.waterNeutral) {
      if (!this.carWaterInputHeld()) this.waterNeutral = false;
      else { blocked = true; through = false; }
    }
    const mode = this.modes.active;
    if (mode) {
      this.rideGoal = null;
      const frame = this.modeFrame;
      frame.dt = dt; frame.time = this.t; frame.blocked = blocked;
      this.driveInput(blocked, frame);
      // The sea uses a down-stick command for slowing and turning back.
      if (mode === this.sea && !blocked && this.pad?.input?.brake) frame.y = -1;
      this.modes.update(frame);
      if (!this.allowsRideHints()) useStore.getState().dismissRideToasts();
      else if (!this.rides.waitingForTraffic) useStore.getState().dismissRideToasts("waiting");
      return;
    }
    if (this.rides.riding) {
      const r = this.rides.riding, x0 = r.m.x, z0 = r.m.z, heading0 = r.m.heading;
      const controls = this.townRideControls(dt, blocked);
      const goal = blocked ? null : this.rideGoal;
      this.updateRide(dt, controls);
      if (goal) this.followRideGoal(goal, r, dt, x0, z0, heading0);
      return;
    }
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
    const source = this.inputStick();
    const stick = (!blocked || through) && (source.x !== 0 || source.y !== 0);
    if (this.benchReturn) {
      if (!blocked && (ix || iz || stick || this.autoPath?.length)) this.leaveBench();
      else { this.updateModePose(dt, this.heading); return; }
    }
    const jm = Math.hypot(source.x, source.y);
    this.joyRun = stick && (jm > 0.9 || (this.joyRun && jm > 0.8));
    const turned = this.rig.manualTurn;
    this.rig.manualTurn = 0;
    const camYaw = this.rig.mode === "follow" ? this.rig.yaw : Math.PI;
    const steer = this.steer.update(stick ? source.x : ix, stick ? source.y : iz, stick, camYaw, turned, dt);
    if (steer.dir !== null) this.stepOut = 0;
    const want = this.walkWant.set(0, 0, 0);
    // the pace: a walk; outdoors a jog after a moment's steady walking one way (a turn, a stop or deep water starts the
    // count again), a run with Shift or the stick at its edge; indoors always a walk; slower the deeper one wades
    const interior = this.zone.interior;
    const indoor = !!interior, ledges = interior ? interior.ledges : this.ledges;
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
    const before = this.walkFrom.copy(p);
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
          let remaining = d;
          for (let i = 1; i < this.autoPath.length; i++) {
            const [ax, az] = this.autoPath[i - 1], [bx, bz] = this.autoPath[i];
            remaining += Math.hypot(bx - ax, bz - az);
          }
          if (!this.swimming) speed = (remaining > 12 && !indoor ? RUN : WALK) * pace;
          // arrive next to an NPC rather than on top of them (a spot of their own to talk from, across a counter or a
          // table, is walked onto); and, held up on the way (walking but getting nowhere: someone in the way), as soon
          // as they are close enough to talk to
          const npc = this.autoTarget?.kind === "npc" ? this.npcs.find((n) => n.id === this.autoTarget?.id) : undefined;
          const nearNpc = npc && talkDist(npc, p) < TALK_RANGE;
          const heldUp = this.vel.lengthSq() > 4 && this.lastSpeed < 0.5;
          if (nearNpc && (heldUp || (this.autoPath.length === 1 && d < 1.6 && !npc.approach))) {
            this.arrived();
            want.set(0, 0, 0);
          } else {
            const check = this.walkCheck;
            // a car in the street held them up (standing on the crosswalk, passing by): they wait at its side and walk
            // on when it has gone, as the live build did, rather than giving up the walk there (26 Nov 2026); a car
            // that stays put (or anything else) still ends the walk, after a longer wait
            if (check.carWait > 0) {
              if (!indoor && this.ambient.carAt(p.x, p.z, 1.1) && check.carWait < CAR_WAIT_MAX) {
                check.carWait += dt;
                want.set(0, 0, 0);
              } else { check.carWait = 0; check.time = 0; }
            } else {
              if (check.time === 0) check.remaining = remaining;
              check.time += dt;
              if (check.time >= 0.8) {
                if (check.remaining - remaining < 0.2) {
                  if (!indoor && !nearNpc && check.waited < CAR_WAIT_MAX && this.ambient.carAt(p.x, p.z, 1.1)) {
                    check.carWait = dt;
                    want.set(0, 0, 0);
                  } else {
                    if (!nearNpc) this.autoTarget = null;
                    this.arrived();
                    want.set(0, 0, 0);
                  }
                }
                check.time = 0;
              }
            }
            if (check.carWait > 0) check.waited += dt;
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
      if (!indoor && !blocked && !this.swimming && !this.hop.air && this.hop.y < 0.5) this.ambient.checkBump(before, p, dt);
      // The player uses the prebuilt heights for low props. Outdoors the sea is also open to wading.
      if (this.caveZone) this.caveZone.resolveStep(p, before, 0.38);
      else this.zone.colliders.resolve(p, 0.38, true);
      ledges?.resolve(p, 0.38, this.hop.y, this.hop.air);
      if (!indoor) {
        this.ambient.resolvePlayer(p, 0.38); this.ambient.resolvePeople(p, 0.38, true);
        // (the convertibles and their people standing about; swimming, the rocks and the boats at anchor)
        this.rides.resolvePlayer(p, 0.38, this.swimming, this.hop.y);
        if (p.z < BAY.z0) p.z = BAY.z0;
        if (p.x < WORLD.minX && p.z >= SHORE.limit && !inSlateCove(p.x, p.z)) {
          p.x = before.x < WORLD.minX && inSlateCove(before.x, before.z) ? before.x : WORLD.minX + 0.38;
          if (p.x < WORLD.minX) p.z = before.z;
        }
      }
    }
    if (this.stepOut > 0) {
      // (stepping out of a door: done after its two steps, or at once if something stands in the way)
      const dd = p.distanceTo(before);
      this.stepOut = dd < 1e-3 && this.gait.speed > 1 ? 0 : Math.max(0, this.stepOut - dd);
    }
    // interior bounds / door push
    this.checkCoveDoor(p, blocked);
    if (interior && !this.wild) {
      if (p.z > interior.d / 2 - 0.2 && Math.abs(p.x) < 1.2 && this.vel.z > 0.5 && !this.aloft) { this.exitInterior(); }
    } else if (!indoor) {
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
    coach.stroll(dt, indoor || blocked || !this.gaitOn || moved < 2 || this.keys.has("shift") || this.joyRun);
    // a lean into turns, more the faster you go
    const dh = Math.atan2(Math.sin(this.heading - this.lastHeading), Math.cos(this.heading - this.lastHeading));
    const turn = this.vel.lengthSq() > 0.05 ? dh / Math.max(dt, 1e-4) : 0;
    this.lastHeading = this.heading;
    const bank = THREE.MathUtils.clamp(-turn * moved * 0.012, -0.14, 0.14);
    this.player.bank = (this.player.bank ?? 0) + (bank - (this.player.bank ?? 0)) * Math.min(1, dt * 8);
    // what is under their feet: a bench's seat or a planter's rim they jumped onto, else the ground, which by the sea
    // is the sand sloping down under the water (but for a pier's or a terrace's boards over it). A jump lands on it;
    // walking off an edge is a fall.
    const surfacePiece = ledges?.supportPiece(p.x, p.z, this.hop.y, this.hop.air);
    const on = surfacePiece?.top ?? 0;
    const ground = this.wild?.floor(p.x, p.z) ?? (on > 0 ? on : indoor ? 0 : floorY(p.x, p.z));
    // the water here (the sea with its swell, a pool's), and how much of it is over what is underfoot
    const sur = indoor ? null : waterY(p.x, p.z, this.t), surface = sur ?? -99;
    const over = sur === null || on > 0 ? 0 : sur - ground;
    // deep enough, and in it (someone who jumps off the pier swims once their feet are under): they float and swim
    const wasSwimming = this.swimming;
    this.swimming = !through && over > (wasSwimming ? SWIM.out : SWIM.depth) && this.hop.y < surface - 0.3;
    if (this.swimming || wasSwimming) this.reactions.swim(this.ambient, p, this.swimming);
    if (this.swimming && !wasSwimming) this.keepsake.clear();
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
      const car = !indoor && landed > 0 && surfacePiece && this.rides.carUnder(surfacePiece);
      if (car) this.reactions.landing(this.ambient, car);
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
    if (wet && !blocked) coach.cue("water");
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
    else if (t.kind === "glyph" && t.id) this.openGlyph(t.id);
    else if (t.kind === "tree") this.talkToTree();
    else if (t.kind === "cave-entry" && t.id) void this.openCave(t.id as CoveDoor, undefined, false, true,
      t.onward ? this.resumeCaveWalk : undefined);
    else if (t.kind === "cave-exit") this.leaveCave(t.id, t.onward ? this.resumeObjectiveWalk : undefined);
    else if (t.kind === "exit") this.exitInterior(t.onward ? this.resumeObjectiveWalk
      : t.id ? () => this.guideToPlace(t.id!, t.directions) : this.islandGuide ? () => this.autoWalkToObjective() : undefined);
    else if (t.kind === "point" && t.rot !== undefined) {
      this.vel.set(0, 0, 0);
      this.heading = t.rot;
      if (t.alignCamera && this.rig.mode === "follow" && useStore.getState().settings.cameraFollow
        && !this.pointer.down && !this.rig.manuallyAiming) {
        this.moveVel.set(0, 0, 0);
        this.rig.target.copy(this.player.root.position);
        this.rig.snap(t.rot);
      }
    }
  }

  private updateNpcs(dt: number, talking: boolean, mode: ReturnType<ModeRegistry["get"]> | null) {
    const p = this.player.root.position;
    const taking = talking ? this.session?.sit.npcs ?? [] : [];
    // the people look at the learner's head; the player at the one they talk with
    this.learnerAt.set(p.x, p.y + (this.player.lift ?? 0) + 1.5, p.z);
    const partner = talking ? this.talkNpc : null;
    if (partner && !this.naturalTalk?.speaker) { const q = partner.ch.root.position; this.talkAt.set(q.x, q.y + (partner.sit ? 1.3 : 1.5), q.z); }
    this.player.watch = partner ? this.talkAt : null;
    this.player.steady = !!partner;
    for (const n of this.npcs) {
      if (mode?.ownsNpc?.(n.id)) continue;
      if (n.spirit && this.caveCode) {
        this.caveCode.updateKeeper(n, n.spirit, p, dt, talking && n === partner);
        continue;
      }
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

  watchNametagLayout(layout: NametagLayout | null) {
    if (this.nametagLayout) this.nametagLayout.boxes = this.nametagLayout.rect = undefined;
    this.nametagLayout = layout;
    return this.tagLayer;
  }

  private updateTags() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    const obj = this.currentObjective();
    // in a conversation the header names the person and every line its speaker: no tags over heads
    const talking = !!this.session?.active, modeMenu = useStore.getState().hud.modeScreen?.kind === "menu";
    const shown: { n: NpcActor; x: number; y: number; dist: number }[] = [];
    for (const n of this.npcs) {
      v.set(n.ch.root.position.x, n.ch.height + (n.sit ? -0.1 : 0.45), n.ch.root.position.z);
      const dist = v.distanceTo(this.rig.cam.position);
      v.project(this.rig.cam);
      // only for people in the picture (a tag kept inside it never points at someone out of sight)
      // (nor for someone who is away from their spot: the surf instructor during a lesson)
      const visible = !talking && !this.flight && !modeMenu && n.ch.root.visible && v.z < 1 && dist < 34 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      if (!visible) { n.tag.style.display = "none"; continue; }
      n.tag.style.display = "";
      shown.push({ n, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, dist });
      const isObj = !!obj && !isCall(obj) && (obj.npc === n.id || ((obj.npc === "sam" || obj.npc === "emma") && (n.id === "sam" || n.id === "emma")));
      n.tag.classList.toggle("objective", isObj && !talking);
      n.tag.classList.toggle("quest-available", this.quests.marker(n.id));
      n.tag.style.opacity = String(Math.max(0.35, 1 - (dist - 12) / 22));
    }
    // Each tag takes the free spot nearest its person, the nearer people first: where it is; beside or above a tag
    // already placed (Kate and Paul at their table; below one only when nothing else is free); beside, below or above
    // the task card, the little map and the buttons, which would cover it. Always inside the picture.
    shown.sort((a, b) => a.dist - b.dist);
    let hud = this.hudBoxes();
    const bubble = document.querySelector<HTMLElement>(".street-bubble");
    const layout = this.nametagLayout;
    // Share the layer measurement with the HUD and use its local CSS pixels for tag placement.
    const rect = layout && bubble && shown.length && useStreet.getState().bubble?.anchor
      ? this.tagLayer.getBoundingClientRect() : undefined;
    const scaleX = rect?.width ? rect.width / (this.tagLayer.offsetWidth || 1) : 1;
    const scaleY = rect?.height ? rect.height / (this.tagLayer.offsetHeight || 1) : 1;
    let bubbleBox: TagBox | undefined;
    if (bubble?.style.visibility === "visible") {
      // Read the bubble every frame: it moves with the speaker and grows as soon as it is translated.
      const r = bubble.getBoundingClientRect();
      if (r.width && r.height) {
        const c = rect ?? this.container.getBoundingClientRect(), tail = 6;
        bubbleBox = { x0: (r.left - c.left) / scaleX - tail, x1: (r.right - c.left) / scaleX + tail,
          y0: (r.top - c.top) / scaleY - tail, y1: (r.bottom - c.top) / scaleY + tail };
        hud = [...hud, bubbleBox];
      }
    }
    // Batch the live size reads before writing transforms. Translated text and font changes can resize a tag.
    if (rect) for (let i = 0; i < shown.length; i++) {
      const { n } = shown[i];
      const size = n.tagSize ??= [0, 0];
      size[0] = n.tag.offsetWidth;
      size[1] = n.tag.offsetHeight;
    }
    const m = 6;
    const surfNpc = this.surf?.content.npc;
    const surfSign = this.zone.id === "town" && shown.some(({ n }) => n.id === surfNpc)
      ? this.surfSignBox(w, h, v) : undefined;
    const placed: PlacedNametag[] = [];
    for (const s of shown) {
      const sign = s.n.id === surfNpc ? surfSign : undefined;
      const obstacles = sign ? [...hud, sign] : hud;
      const [tw, th] = (s.n.tagSize ??= [s.n.tag.offsetWidth, s.n.tag.offsetHeight]);
      if (rect && (!tw || !th)) continue;
      const hits = (x: number, y: number, p: TagBox) => x - tw / 2 < p.x1 && x + tw / 2 > p.x0 && y - th < p.y1 && y > p.y0;
      const spots: [number, number, number][] = [[s.x, s.y, 0]];
      for (const p of placed) spots.push([p.x1 + tw / 2 + 4, s.y, 0], [p.x0 - tw / 2 - 4, s.y, 0], [s.x, p.y0 - 4, 0], [s.x, p.y1 + th + 4, 60]);
      for (const p of obstacles) spots.push([p.x1 + tw / 2 + 6, s.y, 0], [p.x0 - tw / 2 - 6, s.y, 0], [s.x, p.y1 + th + 6, 0], [s.x, p.y0 - 6, 0]);
      const signOnRight = sign && s.x <= (sign.x0 + sign.x1) / 2;
      if (sign) {
        // Keep Maren's tag above the plate or beside it on her side. Combine those offsets with HUD clearance on short screens.
        const side = signOnRight ? sign.x0 - tw / 2 - 6 : sign.x1 + tw / 2 + 6;
        for (const [x, y, extra] of spots.slice()) {
          spots.push([signOnRight ? Math.min(x, side) : Math.max(x, side), y, extra], [x, Math.min(y, sign.y0 - 6), extra]);
        }
      }
      let best: [number, number] | null = null, bestD = Infinity, bestBySign = false;
      for (const [sx, sy, extra] of spots) {
        const x = Math.min(w - m - tw / 2, Math.max(m + tw / 2, sx)), y = Math.min(h - m, Math.max(m + th, sy));
        if (obstacles.some((p) => hits(x, y, p)) || placed.some((p) => hits(x, y, p))) continue;
        const bySign = !sign || y <= sign.y0 || (signOnRight ? x + tw / 2 <= sign.x0 : x - tw / 2 >= sign.x1);
        const d = Math.hypot(x - s.x, y - s.y) + extra;
        if (bySign === bestBySign ? d < bestD : bySign) {
          bestD = d;
          best = [x, y];
          bestBySign = bySign;
        }
      }
      const [x, y] = best ?? [Math.min(w - m - tw / 2, Math.max(m + tw / 2, s.x)), Math.min(h - m, Math.max(m + th, s.y))];
      if (!best && bubbleBox && hits(x, y, bubbleBox)) {
        s.n.tag.style.display = "none";
        continue;
      }
      placed.push({ x0: x - tw / 2, x1: x + tw / 2, y0: y - th, y1: y, tag: s.n.tag });
      s.n.tag.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
    if (layout) {
      layout.rect = rect;
      layout.scaleX = scaleX;
      layout.scaleY = scaleY;
      layout.boxes = bubble ? placed : undefined;
    }
  }

  /** Project the plate into the same screen coordinates used by the name tags. */
  private surfSignBox(w: number, h: number, v: THREE.Vector3): TagBox | undefined {
    const cam = this.rig.cam, plate = HARBOR_SURF_PLATE;
    if (cam.position.z >= plate.front) return;
    const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const dx of [-plate.w / 2, plate.w / 2]) {
      for (const dy of [-plate.h / 2, plate.h / 2]) {
        v.set(plate.x + dx, plate.y + dy, plate.front).project(cam);
        if (v.z < -1 || v.z > 1) return;
        const x = (v.x + 1) * w / 2, y = (1 - v.y) * h / 2;
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
      }
    }
    if (box.x0 < w && box.x1 > 0 && box.y0 < h && box.y1 > 0) return box;
  }

  /** Where the task card, the little map and the buttons are in the picture (the tags keep clear of them), read about
   *  six times a second. */
  private hudBoxes() {
    if (--this.hudCheck > 0) return this.hudBoxCache;
    this.hudCheck = 10;
    const c = this.container.getBoundingClientRect();
    this.hudBoxCache = [];
    for (const el of document.querySelectorAll<HTMLElement>(".objective-card, .cave-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, .toolbar, .toolbar.menu-open:not(.portrait-toolbar) .toolbar-tools, .portrait-toolbar.menu-open .toolbar-drawer, .portrait-toolbar.in-ride:not(.menu-open) .radio-tool")) {
      if (!el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) this.hudBoxCache.push({ x0: r.left - c.left, x1: r.right - c.left, y0: r.top - c.top, y1: r.bottom - c.top });
    }
    return this.hudBoxCache;
  }

  private rideOut(riding: Ride): Game["nearest"] {
    if (this.rides.phase !== "on" || this.session?.active) return null;
    const nearest = this.nearest;
    return nearest?.kind === "out" && nearest.id === riding.id ? nearest
      : { kind: "out", id: riding.id, label: RIDE_OUT_PROMPT.label };
  }

  private updateHud() {
    const st = useStore.getState();
    const p = this.player.root.position;
    // nearest interactable
    let best: Game["nearest"] = null;
    let bd = Infinity;
    const riding = this.rides.riding;
    if (this.modes.active) { this.nearest = null; return; }
    if (riding) {
      // at the wheel: only the way out (nobody is talked to, no door gone through)
      best = this.rideOut(riding);
    } else if (!this.rides.water?.suppressInput && !this.session?.active && !this.aloft && !st.hud.glyph) {
      for (const n of this.npcs) {
        const d = talkDist(n, p);
        if (d < TALK_RANGE && d < bd) { bd = d; best = { kind: "npc", id: n.id, label: NPCS[n.id]?.name ?? n.id }; }
      }
      // staff with one line to say (across their counter, as a clerk's talk spot is)
      this.staff.forEach((x, i) => {
        const q = x.ch.root.position, d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < TALK_RANGE && d < bd) { bd = d; best = { kind: "staff", id: String(i), label: "Pasisveikinti" }; }
      });
      const island = LIGHTHOUSE_ISLAND, keeper = this.islandScene?.keeper;
      if (!this.zone.interior && island && keeper && !this.swimming) {
        const d = keeper.root.position.distanceTo(p);
        if (d < TALK_RANGE && d < bd) { bd = d; best = { kind: "staff", id: island.keeper.says, label: this.keeperWarned ? "Pasikalbėti su prižiūrėtoju" : "Pasisveikinti" }; }
      }
      // a convertible or the boat within a step (a boat from the water too), a pier's boards beside a swimmer
      if (!this.zone.interior && !this.hop.air && this.diveK < 0.3) {
        const r = this.rides.near(p.x, p.z);
        if (r && (r.kind === "boat" || !this.swimming) && 1 < bd) { bd = 1; best = { kind: "ride", id: r.id, label: r.parked ? ROAD_UI.drive : r.kind }; }
        else if (this.swimming && !best && this.rides.climbOut(p.x, p.z)) { bd = 1; best = { kind: "climb", id: "pier", label: "Užlipti ant prieplaukos" }; }
      }
      if (!this.swimming && !this.hop.air && this.diveK < 0.3) {
        const m = this.modes.prompt(p.x, p.z, best?.kind === "ride" ? 0 : bd, !!this.zone.interior);
        if (m) {
          bd = m.distance;
          best = { kind: "mode", id: m.id, label: m.label, prompt: { label: m.label, lt: m.hint, kind: m.kind } };
        }
      }
      if (!this.zone.interior) {
        // The normal, throttled town prompt; the backpack itself has no world hit target.
        if (!best && (this.benchReturn || (!this.hop.air && Math.hypot(p.x - VISITOR_BENCH.x, p.z - VISITOR_BENCH.z) <= 2))) {
          const label = this.benchReturn ? "Atsistoti" : "Prisėsti ant suolelio";
          best = { kind: "bench", id: label, label, prompt: { label, kind: "bench" } };
        }
        for (const dd of this.town.doors) {
          const d = Math.hypot(dd.outX - p.x, dd.outZ - p.z);
          if (d < 3 && d < bd && !this.swimming) { bd = d; best = { kind: "door", id: dd.loc, label: dd.name }; }
        }
        if (this.coveArt.ready && !this.swimming && inSlateCove(p.x, p.z)) {
          const door = coveDoorNear(p, Math.sin(this.heading), Math.cos(this.heading));
          if (door) best = this.coveArt.prompt(door) ?? best;
        }
      } else if (this.caveZone) {
        best = this.caveZone.prompt(p, bd, !!best) ?? best;
      } else {
        const ex = this.zone.interior.exit;
        const d = Math.hypot(ex.x - p.x, ex.z - p.z);
        if (d < 1.8 && d < bd) { bd = d; best = { kind: "exit", id: "exit", label: "Išeiti" }; }
      }
    }
    const changed = best?.kind !== this.nearest?.kind || best?.id !== this.nearest?.id;
    this.nearest = best;
    if (changed || (best?.kind === "staff" && best.label !== st.hud.prompt?.label)) {
      if (changed && best) audio.sfx("tick");
      const names = RIDE_NAMES;
      const keeperPrompt = best?.kind === "npc" ? this.caveZone?.keeperPrompts.get(best.id) : undefined;
      st.setHud({ prompt: !best ? null
        : best.kind === "ride" ? (best.label === ROAD_UI.drive ? { label: ROAD_UI.drive, kind: "drive" } : best.label === "car" ? { label: `Vairuoti: ${names.car.en}`, lt: names.car.lt || undefined, kind: "drive" } : { label: `Plaukti: ${names.boat.en}`, lt: names.boat.lt || undefined, kind: "boat" })
        : best.kind === "out" ? RIDE_OUT_PROMPT
        : best.kind === "climb" ? { label: best.label, kind: "climb" }
        : best.prompt ?? keeperPrompt ?? (
          best.kind === "staff" ? { label: best.label, kind: "talk" }
          : { label: best.kind === "npc" ? `Kalbėtis: ${best.label}` : best.kind === "door" ? `Įeiti: ${best.label}` : "Išeiti į lauką", lt: best.kind === "door" ? placeLt(best.id) : undefined, kind: best.kind === "npc" ? "talk" : best.kind === "door" ? "enter" : "exit" }) });
    }
    // what the player does instead of walking, for the buttons and the hints
    const ride = riding ? riding.kind : this.swimming ? (this.diveK > 0.5 ? "dive" : "swim") : null;
    if (st.hud.ride !== ride) st.setHud({ ride });
    // objective distance & minimap
    const tgt = this.objectiveTarget();
    const quest = this.caveGuide.questTarget(p, this.caveZone, tgt);
    const exit = this.caveZone?.exitTarget;
    const o = st.hud.objective;
    if (o) {
      const task = exit ?? tgt;
      const dist = task ? Math.round(Math.hypot(task.x - p.x, task.z - p.z)) : null;
      const angle = task ? Math.atan2(task.x - p.x, task.z - p.z) : null;
      if (o.dist !== dist || (angle !== null && Math.abs((o.angle ?? 0) - angle) > 0.05)) st.setHud({ objective: { ...o, dist, angle } });
    }
    const mm = st.hud.minimap;
    const zone = this.zone.id, gates = this.cave?.mask;
    const mark = this.routeVisualTarget() ?? tgt;
    if (mm.gates !== gates || Math.abs(mm.px - p.x) > 0.3 || Math.abs(mm.pz - p.z) > 0.3 || Math.abs(mm.heading - this.heading) > 0.05 || mm.zone !== zone || mm.targetX !== mark?.x || mm.targetZ !== mark?.z || mm.questX !== quest?.x || mm.questZ !== quest?.z) {
      st.setHud({ minimap: { px: p.x, pz: p.z, heading: this.heading, targetX: mark?.x, targetZ: mark?.z, zone, gates, questX: quest?.x, questZ: quest?.z, exitX: exit?.x, exitZ: exit?.z } });
    }
    this.saveT -= 0.12;
    if (this.saveT <= 0) { this.saveT = 5; this.savePlace(); }
  }
  private saveT = 5;

  private savePlace() {
    if (!this.player || !this.zone || this.surf?.active || this.caveTravel?.pending) return;
    const p = this.benchReturn ?? this.player.root.position;
    const safe = this.rides.water?.safeSave();
    if (!safe && (this.rides.water?.wet || this.rides.water?.returning)) return;
    useStore.getState().updateProgress((pr) => {
      pr.place = { zone: this.zone.id, x: +(safe?.x ?? p.x).toFixed(2), z: +(safe?.z ?? p.z).toFixed(2), rot: +(safe?.rot ?? this.heading).toFixed(2) };
      const boat = this.rides.riding;
      if (this.zone.id === "town" && boat?.kind === "boat" && this.rides.phase !== "out") {
        const position = this.modes.owns("sea") ? seaReturn(boat) : { x: boat.m.x, z: boat.m.z, rot: boat.m.heading };
        pr.place.boat = { id: boat.id, ...position, mooring: this.seaMooring };
        if (this.modes.owns("sea")) Object.assign(pr.place, position);
        if (pr.lighthouse?.boat?.id === boat.id) delete pr.lighthouse.boat;
      }
      // Indoors after reload the docked boat may not have been restored into the town yet.
      const moored = this.rides.islandBoat();
      if (moored) (pr.lighthouse ??= {}).boat = moored;
      this.phone.saveClock(pr);
    });
  }

  get townMapWest() { return SLATE_COVE.minX; }
  mapRegion(x: number, z: number) {
    return caveMapRegion(this.zone?.id, x, z);
  }
  drawRegionMap(ctx: CanvasRenderingContext2D, west: number, north: number, scale: number, town = false) {
    if (!town && this.wild) this.caveCode?.drawCaveMap(ctx, west, north, scale, this.cave?.mask ?? 0);
    else drawCoveMap(ctx, west, north, scale);
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
    this.rides?.crashQuality(q);
    this.onResize();
  }

  dispose() {
    if (this.disposed) return;
    if (this.session?.sit.location === CAVE_ZONE) this.session.close();
    this.disposed = true;
    this.pad?.dispose();
    this.watchNametagLayout(null);
    this.firstExteriorDraw?.();
    this.firstExteriorDraw = undefined;
    clearTimeout(this.rideTimer);
    this.cancelCollisionPreparation();
    for (const unsubscribe of this.phoneWatch) unsubscribe();
    document.removeEventListener("visibilitychange", this.phoneVisibility);
    window.removeEventListener("pagehide", this.phonePageHide);
    if (this.initialDrawn) this.phonePageHide();
    for (const timer of this.sceneDelays) clearTimeout(timer);
    this.sceneDelays.clear();
    for (const timer of this.zoneTimers) clearTimeout(timer);
    this.zoneTimers.clear();
    this.keepsake.dispose();
    this.streetLife?.dispose();
    this.townTalk?.release(0);
    this.rides?.disposeWater();
    this.stopTalkLayout();
    this.speedFeel?.dispose();
    this.caveTravel.cancel();
    this.caveZone?.dispose();
    this.coveArt.dispose();
    this.modes.dispose();
    audio.bed(null);
    this.frameFade.clear();
    this.rides?.disposeCrashes();
    this.carVisuals?.dispose();
    this.islandScene?.dispose();
    this.town?.parkedCars.fleet.dispose();
    this.rides?.disposeParkingKeys();
    useStore.getState().setHud({ coach: null });
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.removeEventListener("pageshow", this.onResize);
    this.visualViewport?.removeEventListener("resize", this.onResize);
    this.resizeObserver?.disconnect();
    window.removeEventListener("blur", this.onBlur);
    this.unbindAmbience?.();
    this.unbindAmbience = null;
    audio.stopAmbience();
    audio.motor(null);
    audio.stop();
    radio.shutdown();
    for (const n of this.npcs) { n.ch.talkPose?.interrupt(); n.tag.remove(); }
    this.player?.talkPose?.interrupt();
    this.npcs = [];
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}

export { game, setGame } from "./gameRef";
void textTexture;
