// The game: renderer, zones (town + interiors), player, NPCs, input, guidance and conversations.
import { StreetLife, useStreet } from "./street/StreetLife";
import type { CarWaterAdapter, CarWaterFoot } from "./rides/carWaterRecovery";
import { flushSync } from "react-dom";
import { TownStreet } from "./street/world";
import type { StreetSnapshot } from "./street/schedule";
import * as THREE from "three";
import townCollisionAsset from "virtual:town-collision-url";
import { showConversationEvent } from "./convEvents";
import { buildTown, type Town, type Door } from "./world/town";
import { loadedCarModelCount, type ExteriorCarModels } from "./world/carModels";
import { CarVisuals } from "./world/carVisuals";
import { prepareExteriorCars } from "./exteriorAssets";
import { loadStartupModule, startupTask } from "./startupTask";
import { getInterior, INTERIOR_IDS, type Interior, type NpcSpot } from "./world/interiors";
import { OUTDOOR_NPCS, AIRPORT_EXIT, WORLD, ROADS, DROPOFF, SEA_Z, BEACH_Z, FOUNTAIN, PARK, SQUARE } from "./world/layout";
import { createCharacter, setBlobShadows, surfLook, withBackpack, type GameCharacter } from "./characters";
import { Character } from "./characters/Character";
import { styleRenderer, createStyleFx, type StyleFx } from "./styleScene";
import { CameraRig, FOLLOW } from "./camera";
import { Steer, Gait, Hop, angleDiff, smoothstep } from "./movement";
import { LAND, type Ledges } from "./ledges";
import { coach } from "./coach";
import { Wading, Splashes, floorY, waterY, bayHold, SEA_LEVEL, SHORE, SWIM, BAY } from "./water";
import { Rides, SHALLOWS, type Ride } from "./rides/Rides";
import { SpeedFeelLoader } from "./rides/speedFeelLoader";
import { KeepsakeInHand } from "./keepsake";
import { keepsakeFor } from "../content/keepsakes";
import { cenoteGuide, registerCenoteTown, townNpcs } from "./cenoteTour/town";
import { Undersea } from "./rides/undersea";
import { CAR, CAR_DRIFT, BOAT_DRIFT, BOAT, BAY_EDGE, controlsFrom, pointAndGo, type Controls } from "./rides/drive";
import { RIDES } from "./world/rides";
import { ROAD_EDITION, ROAD_UI } from "../content/road";
import { cabinetNear, type TownGame } from "./arcade/cabinets";
import { ArcadeMode, useArcade } from "./arcade/mode";
import { PHOTO_WALK_SITUATION } from "../content/photo-walk-lines";
import { SURF_SPOT } from "./world/surf";
import { RoadEntry, walkEdge } from "./road/entry";
import { isPlayWay, playWay, setPlayWay, type PlayWay, type WordGame } from "./road/save";
import { SEA_EDITION } from "../content/sea";
import { SeaEntry, seaReturn, cameraPose, crossingPose, RETURN_SETTLE, RETURN_SPEED, type SeaHandoff } from "./sea/entry";
import { TownQuests } from "./photowalk/mode";
import { useTownQuests, type Destination } from "./photowalk/store";
import { isTownQuest, type PhotoSpot } from "../content/townQuests";
import { useSurf } from "./surf/store";
import { RIDE_NAMES } from "../content/rides";
import { type GameMode, ModeRegistry } from "./kit/modes";
import { FrameFade } from "./kit/frameFade";
import type { ModeHost } from "./kit/host";
import { scoreShot } from "./kit/scoreShot";
import { BILLIARDS_NPC } from "../content/billiards-lines";
import { BilliardsMode, BILLIARDS_PLACE } from "./billiards/mode";
import { makeCue, TABLE_NAME, TABLE_PROMPT, type TableView } from "./billiards/table";
import type { Do, SurfArrow } from "./surf/logic";
import { FLOOD_INCOMING_INTRO, invitationLocation, invitationTitle, OFFICE_TASK } from "../content/phoneCalls";
import { TownPhone } from "./phone/Phone";
import { inTownRuins, reactionTestSpot, TownReactions } from "./life/townReactions";
import { speakTownLine } from "./life/townVoice";
import { ActorTalk, talkVoice } from "./talkNatural/binding";
import type { ReactKind } from "../content/reacts";
import { freeToWalk, type PhoneSnapshot } from "./phone/schedule";
import type { FriendMeeting } from "./phone/meeting";
import { createSurfMode } from "./surf/mode";
import { createTaxiMode, TAXI_APPROACH } from "./taxi/mode";
import { BARISTA_PROMPT, createBaristaMode } from "./barista/mode";
import { BARISTA_CONVERSATION } from "../content/barista";
import { createPoolMode } from "./pool/mode";
import { GYM_ENTRY } from "../content/gym-entry";
import { createGymMode } from "./gym/entry";
import { GYM_MAT } from "./world/gymMat";
import { createLoteriaMode, type LoteriaMode } from "./loteria/mode";
import { loteriaDusk } from "./loteria/scene";
import { LOTERIA_APPROACH } from "./loteria/location";
import { HOTEL_POOL, HOTEL_POOL_ENABLED, hotelPoolKidY, inHotelPool, POOL_CIRCLE, POOL_ENTRY, POOL_TALK, POOL_KIDS, POOL_SITUATION } from "./world/pool";
import type { OcclusionField } from "./occlusion";
import type { PropFader } from "./fade";
import { STYLED } from "./style";
import { TOWN_WEST, townLedgeDynamics } from "./townCollision";
import { initTownCollision, TOWN_COLLISION_METADATA_OFFSET } from "./townCollisionCache";
import { prepareTownCollision } from "./townCollisionPreparation";
import { CUT, withCutout } from "./cutout";
import type { TalkPresentation } from "./talkFraming";
import type { bindTownTalk } from "./talkNatural/view";
import { FLIGHT_SECONDS, flightAt } from "./flyover";
import { directionsTarget, Guidance } from "./guidance";
import { NavGrid } from "./nav";
import { Session } from "./session";
import { Ambient, Chatter, walkerLook } from "./ambient";
import { ROOM_PEOPLE } from "./world/roomPeople";
import { AMBIENT_LINES, STAFF_LINES, VENDOR_LINES } from "../content/ambient";
import { ambientVoice } from "../content/voices";
import { audio } from "./audio";
import { TOWN_SOUNDS } from "./townSounds";
import { MODE_SAMPLES, nearLevel, surfLevel, surfaceAt, type Surface } from "./soundscape";
import { radio } from "../radio";
import { Dust } from "./dust";
import { Pigeons } from "./pigeons";
import { audioDiagnosticsEnabled, audioDiagnosticsPaused, subscribeAudioDiagnostics } from "../convo/audioDiagnostics";
import { NPCS, type Look } from "../content/npcs";
import { LOCATIONS, placeLt } from "../content/locations";
import { SITUATIONS, SITUATION_BY_ID, loadSituation, prefetchSituations } from "../content/situations/catalog";
import { whenLoaded } from "./prefetch";
import type { SituationDef, SituationMeta } from "../content/types";
import { picturesOn, useStore, type HudState, type Toast } from "../state/store";
import { sceneFor } from "../ui/scenes";
import { sitProgress } from "../state/progress";
import { textTexture, rand } from "./world/util";
import { givenItem } from "./given";
import { L, TL } from "../ui/i18n";
import { roleSaid } from "../convo/compose";
import { EDITION } from "../edition";
import type { GameApi, NametagLayout, PlacedNametag, TagBox, WalkPlace } from "./gameRef";
import { attachPad, effectiveStick, type PadLink } from "./padLink";
import { THEME } from "./world/theme";
import { caveLure } from "./cave";
import { CAVE_ZONE, caveWays, groundsBounds, preferredCaveEntry } from "./cave/groundsPlan";
import { emptyCave, gateState, GATES, SPAWNS, TREE_SIT as CAVE_TREE, TREES, type CaveSave } from "./cave/plan";
import type { caveGateGrid } from "./cave/routing";
import type { CaveQuest } from "./cave/quest";
import type { CaveView } from "./cave/Cave";
import { CENOTE_TOUR, ORDERED_ROUTE, pickerSituations, ROUTE } from "../content/route";
export type { GameApi } from "./gameRef";

const CAVE_TREE_AT = TREES[1];

type WalkTarget = { kind: "npc" | "door" | "exit" | "point" | "cave-entry" | "glyph" | "tree"; id?: string; onward?: WalkPlace; directions?: Destination | null };
type GuideTarget = WalkTarget & { x: number; z: number; person?: { x: number; z: number } };
type GuideMode = "objective" | "cave";

interface NpcActor { id: string; ch: GameCharacter; home: THREE.Vector3; rot: number; tag: HTMLDivElement; tagBounds: PlacedNametag; tagSize?: [number, number]; sit?: boolean; waved: boolean; approach?: THREE.Vector3; alux?: { next: number; hop: number } }
const isGymTrainer = (actor: NpcActor) => actor.id === GYM_ENTRY.npc;
interface ZoneState { id: string; group: THREE.Group; colliders: import("./world/util").Colliders; nav: NavGrid; interior?: Interior; cave?: { view: CaveView; syncGates: ReturnType<typeof caveGateGrid> } }

/** Walking, the jog one falls into outdoors after a moment on the move, and running (Shift, the stick at its edge). */
const WALK = 4.4, JOG = 6.0, RUN = 7.4;
/** How long one walks steadily one way before the jog (s), and how long it takes to come on. */
const JOG_AFTER = 1.5, JOG_EASE = 0.9;

/** Where the learner stands in the airport on the very first visit, just off the plane. */
const ARRIVAL = { x: -14, z: -1, rot: Math.PI };
const isCall = (s: SituationMeta) => s.mode === "phone" || s.mode === "video" || s.location === "phone";
const cenoteGrounds = THEME.cenote?.open && groundsBounds(THEME.cenote.x, THEME.cenote.z, WORLD.minX);
/** A point `d` metres in front of someone facing `rot` (0 = +Z), turned towards them. */
/** A person's name tag: their name, their role in the practised language (in the Spanish chosen: roleSaid) and in the
 *  learner's language under it (unless it is the same word, like "Barista"). */
function nameTagHtml(def: (typeof NPCS)[string]): string {
  const lt = def.role.lt.toLowerCase() === def.role.en.toLowerCase() ? "" : `<i lang="${EDITION.helper}">${def.role.lt}</i>`;
  return `<b>${def.name}</b><span lang="${TL}">${roleSaid(def)}</span>${lt}`;
}

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
/** How long a walk to a spot waits at most for a car of the traffic in its way (s), then gives up as when held up. */
const CAR_WAIT = 12;
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

/** The tree camera’s original portrait offset follows the scene strip in styles.css. */
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
  private playerLook!: Look;
  private normalPlayer!: GameCharacter;
  private surfPlayer?: GameCharacter;
  get outfit(): "surf" | null { return this.surfPlayer && this.player === this.surfPlayer ? "surf" : null; }
  private keepsake = new KeepsakeInHand();
  keepsakeKind() { return this.keepsake.kind; }
  private npcs: NpcActor[] = [];
  /** The room's townspeople (roomPeople.ts) and the pairs of them talking. */
  private extras: GameCharacter[] = [];
  private extraChats: Chatter[] = [];
  /** The staff among them with one line to say (roomPeople.ts `says`). */
  private staff: { ch: GameCharacter; says: string; female: boolean }[] = [];
  private npcLayer: THREE.Group = new THREE.Group();
  private guidance = new Guidance();
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private sky!: THREE.Mesh;
  /** Trial world styles (Settings → "Pasaulio stilius"); null for the original "blocks" look. */
  private fx: StyleFx | null = null;
  private keys = new Set<string>();
  private gymHeldKeys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private waterNeutral = false;
  private waterActionHeld = false;
  private waterFade = false;
  private streetWorld!: TownStreet;
  private vel = new THREE.Vector3();
  private lastHeading = 0;
  private heading = Math.PI;
  private autoPath: [number, number][] | null = null;
  private autoTarget: WalkTarget | null = null;
  private guidedWalk: GuideMode | null = null;
  private caveGuideMode: GuideMode = "objective";
  private walkCheck = { time: 0, remaining: Infinity, wait: 0 };
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
  private talkNpc: NpcActor | null = null;
  /** Where the learner's head is (kept up to date in updateNpcs): the people's eyes and heads turn to it (characters:
   *  `watch`); and the head of the person the learner talks with, for the player's own. */
  private learnerAt = new THREE.Vector3();
  private talkAt = new THREE.Vector3();
  /** The grotto's tree speaks without a figure and keeps its own camera. */
  private talkTree = false;
  private talkCast: NpcActor[] = [];
  private talkSpeaker: NpcActor | null = null;
  private talkCamera?: TalkPresentation;
  private naturalView?: ReturnType<typeof bindTownTalk>;
  private get talkLayout() { return this.talkCamera?.layout ?? null; }

  private hudBoxCache: TagBox[] = [];
  private hudCheck = 0;
  private tagLayer: HTMLDivElement;
  private nametagLayout: NametagLayout | null = null;
  private placedNametags: PlacedNametag[] = [];
  private nearest: { kind: "npc" | "staff" | "door" | "exit" | "ride" | "out" | "climb" | "glyph" | "tree" | "mode"; id: string; label: string; prompt?: NonNullable<HudState["prompt"]> } | null = null;
  /** Puerto Colibrí's grotto (src/game/cave): its listening quest while the player is down there; what shows of it
   *  from the cenote; how long the player has swum at its mouth (swimming on in goes in). */
  cave: CaveQuest | null = null;
  private caveCode?: typeof import("./cave/zone");
  private caveLoading?: Promise<void>;
  private caveGates = 0;
  private caveLure: THREE.Group | null = null;
  private cavePushT = 0;
  /** The grotto's ways in (cave/grounds.ts): the ones a word has been said about; the one within reach now; the one
   *  gone in by (coming out of the grotto's water or its cleft comes up there). */
  private caveHinted = new Set<string>();
  private nearWay: string | null = null;
  private caveVia: string | null = null;
  /** The titles of the tips about the ways in that were shown (taken down on going in: the grotto has its own card). */
  private caveHints: string[] = [];
  private dropIn = 0;
  private townCam: { pitch: number; dist: number } | null = null;
  private pushDoorT = 0;
  private transitioning = false;
  private arcade?: ArcadeMode;
  private billiards!: BilliardsMode;
  private barista: ReturnType<typeof createBaristaMode> | null = null;
  private taxi: ReturnType<typeof createTaxiMode> = null;
  private frameFade = new FrameFade((fade) => useStore.getState().setHud({ fade, fadeOnFrames: this.frameFade.active }));
  private readonly phone = new TownPhone();
  private readonly reactions = new TownReactions(() => this.reactionsBlocked());
  streetLife!: StreetLife;
  private phoneWatch: (() => void)[] = [];
  private readonly debugAudio = audioDiagnosticsEnabled();
  private wasHidden = false;
  private conversationLoads = 0;
  private sceneDelays = new Set<ReturnType<typeof setTimeout>>();
  private meeting: FriendMeeting | undefined;
  private loadMeeting = false;
  private officeRequested = false;
  private modeHost!: ModeHost;
  private cenoteTour: ReturnType<typeof registerCenoteTown<NpcActor>>;
  private greeting?: ActorTalk;
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
  private cabinetPin = new THREE.Vector2(NaN, NaN);
  private lastCabinetCue?: string;
  private tmpV = new THREE.Vector3();
  private disposed = false;
  private screenW = 0;
  private screenH = 0;
  /** A phone held sideways, by the size the picture has now (useScreen's SIDEWAYS_PHONE, without waiting for the
   *  browser's media query: after a rotation that can still say what the screen was a moment ago). */
  private get sidewaysPhone() { return this.screenW > this.screenH && this.screenH <= 520; }
  private readonly visualViewport = window.visualViewport;
  private resizeObserver: ResizeObserver | null = null;
  private ambient!: Ambient;
  private carVisuals?: CarVisuals;
  private firstExteriorAt?: number;
  private firstExteriorDraw?: () => void;
  private enteringFirstExterior = false;
  private replyToExteriorError?: (retry: boolean) => void;
  private crashShadersScheduled = false;
  private crashShaderProbes?: THREE.Group;
  private crashShadersReady = false;
  private unbindAmbience: (() => void) | null = null;
  private ambienceAllowed = () => {
    const st = useStore.getState();
    return !this.disposed && !document.hidden && !st.conv.active && !st.hud.panel && !st.hud.glyph;
  };
  /** A room (the fixed camera, a floor at 0), as against the town and a place like the grotto (Interior.wild). */
  private get room() { return !!this.zone?.interior && !this.zone.interior.wild; }
  private get wild() { return this.zone?.interior?.wild ?? null; }
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

  get pool() { return this.modes.get("pool") as NonNullable<ReturnType<typeof createPoolMode>> | undefined; }
  // The surf overlay and browser diagnostics use the original controller.
  get surf() { return (this.modes.get("surf") as ReturnType<typeof createSurfMode>)?.play ?? null; }
  /** The surf event is held for the end card's lesson button. */
  private pendingSurf: { data: unknown } | null = null;
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
  /** At a wheel: the way the camera looks along (the car's course: in a slide it is seen side on), how far it has
   *  pulled back for the speed, the lens's widening, whether the kick out of a slide has been heard. */
  private rideCourse = 0;
  private crestAim = 0;
  private rideBack = 0;
  private rideFov = 0;
  private speedFeelLoader?: SpeedFeelLoader;
  private get speedFeel() { return this.speedFeelLoader?.current; }
  private roadTownView?: THREE.PerspectiveCamera;
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
  private fader!: PropFader;
  private initialization?: Promise<void>;
  private initialDrawn = false;
  private zoneTimers = new Set<ReturnType<typeof setTimeout>>();
  private collisionPreparation: ReturnType<typeof prepareTownCollision>;
  private ledgeTimer?: ReturnType<typeof setTimeout>;
  onReady?: () => void;
  onExteriorError?: (retry: () => void, back: () => void) => void;

  constructor(private container: HTMLElement, tagLayer: HTMLDivElement,
    private exteriorModels?: Promise<ExteriorCarModels>) {
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

  init(linked?: string | null, debug?: "billiards" | "barista") {
    return this.initialization ??= this.initialize(linked, debug);
  }

  private async initialize(linked?: string | null, debug?: "billiards" | "barista") {
    if (this.disposed) return;
    if (useStore.getState().screen !== "loading") useStore.getState().setScreen("loading");
    this.exteriorModels ??= prepareExteriorCars();
    void this.exteriorModels.catch(() => {});
    const collision = import.meta.env.PROD && townCollisionAsset && !STYLED
      ? prepareTownCollision(townCollisionAsset, TOWN_COLLISION_METADATA_OFFSET) : undefined;
    this.collisionPreparation = collision;
    let collisionBytes: ArrayBuffer | undefined;
    try {
      await startupTask();
      if (this.disposed) return;
      this.setupLights();
      this.town = buildTown({ movableParking: true, finalParking: true });
      await startupTask();
      if (this.disposed) return;
      if (collision) collisionBytes = await collision.join();
    } finally {
      collision?.cancel();
      this.collisionPreparation = undefined;
    }
    if (this.disposed) return;
    const st = useStore.getState();
    const taxiScenery: THREE.Mesh[] = [];
    const taxiRay = new THREE.Raycaster();
    const taxiHits: THREE.Intersection[] = [];
    const taxiSightline = (from: THREE.Vector3, to: THREE.Vector3) => {
      if (!taxiScenery.length) {
        // Include the opaque canopy and posts ignored by the walking camera.
        this.town.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material)
            || !mesh.material.visible || (mesh.material.transparent && mesh.material.opacity < 0.6)) return;
          for (let parent: THREE.Object3D | null = mesh; parent && parent !== this.town.group; parent = parent.parent) {
            if (parent === this.town.parkedCars.group || parent === this.pigeons.group || parent.userData.boat
              || parent.userData.gull || parent.userData.v !== undefined || parent.name.startsWith("town-thin-")) return;
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
    const { field, ledges, fader } = initTownCollision(this.town, collisionBytes, (next) => {
      this.ledgeTimer = setTimeout(() => {
        this.ledgeTimer = undefined;
        if (!this.disposed) next();
      }, 16);
    });
    this.field = field;
    this.ledges = ledges;
    this.fader = fader;
    withCutout(this.town.group);
    await startupTask();
    if (this.disposed) return;
    const nav = new NavGrid(WORLD.minX - TOWN_WEST, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, this.town.colliders);
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
    // (a walk by a tap goes round the sinkhole among the roots, cave/grounds.ts, unless it is where the tap was)
    for (const w of caveWays()) if (w.drop) nav.setCost(w.x - 2, w.z - 2, w.x + 2, w.z + 2, 40);
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
    this.streetLife = new StreetLife(this.streetWorld = new TownStreet(this.town.group, nav, this.town.colliders, this.ambient,
      this.rig.cam, () => this.player, () => useStore.getState().progress.profile?.look.top,
      this.field, () => this.screenW <= 600 && this.screenW < this.screenH || this.sidewaysPhone));
    // what one can drive: the convertibles at the curb with their people in them, the boat at the pier
    const game = this;
    this.rides = new Rides({
      cam: this.rig.cam, colliders: this.town.colliders, ledges: this.ledges, nav, ambient: this.ambient, quality: st.settings.quality,
      get player() { return game.player; },
      people: () => (this.zone.interior ? [] : this.npcs.filter((n) => n.ch.root.visible).map((n) => n.home)),
      say: (line, voice, female, ch) => {
        if (this.modes.active?.id !== "taxi") this.saysAloud(line, female, ch, voice);
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
        const cancel = this.afterZoneDelay(() => {
          if (this.rides.riding === ride && this.speedFeel?.release()) this.dust.clearRolling();
          put();
          const car = this.rides.riding;
          if (car) { this.rig.yaw = car.m.heading; this.rig.target.set(car.m.x, 0, car.m.z); this.rig.snap(); }
          useStore.getState().setHud({ fade: 0 });
          if (car === ride) this.showRideToast({ kind: "info", title: L("Mašina vėl gatvėje"), ms: 2600 });
        }, 280);
        return () => {
          cancel();
          if (!this.transitioning) useStore.getState().setHud({ fade: 0 });
        };
      },
      freed: () => this.showRideToast({ kind: "info", title: L("Mašina išlaisvinta"), body: L("Ji pati pasitraukė ten, kur laisva."), ms: 2600 }),
      waiting: () => this.showRideToast({ kind: "tip", title: L("Kelias užimtas"), body: L("Mašina sustoja pati. Pasuk į šoną ir apvažiuok arba pavažiuok atbulas."), ms: 5000 }, "waiting"),
      stuck: () => this.showRideToast({ kind: "tip", title: L("Užstrigai?"), body: useStore.getState().hud.showTouch ? L("Patrauk vairalazdę žemyn – važiuosi atbulas.") : L("Rodyklė žemyn – važiuosi atbulas."), ms: 5000 }),
      aground: () => this.showRideToast({ kind: "tip", title: L("Čia per sekli vieta"), body: useStore.getState().hud.showTouch ? L("Patrauk vairalazdę žemyn – valtis atsitrauks nuo kranto.") : L("Rodyklė žemyn – valtis atsitrauks nuo kranto."), ms: 5000 }),
      splash: (x, y, z, dx, dz, k) => this.splashes.burst(x, y, z, dx, dz, k),
      launchSound: () => audio.splash(0.9),
      fan: (x, y, z, dx, dz, k) => this.splashes.fan(x, y, z, dx, dz, k),
      outdoors: () => !this.zone.interior && !this.covered,
      openRoad: (car, controls) => this.road?.openEdge(car, controls),
      openSea: (boat) => this.sea?.openEdge(boat) ?? false,
    }, RIDES, this.town.group.children.filter((o) => o.userData.boat));
    this.carVisuals = new CarVisuals(this.town.parkedCars, this.ambient, (mesh) => this.rides.releaseCrashVisual(mesh));
    ledges.dynamic = townLedgeDynamics(this.ambient, this.rides);
    const { fleet } = this.town.parkedCars;
    fleet.cars.forEach((entry, index) => {
      const ride = this.rides.createModeCar({ ...entry.spot, id: `parked-${index}` }, entry.root, () => fleet.take(entry));
      ride.crashParking = {
        visual: () => entry.visual, solo: () => entry.taken && !entry.driven,
        take: () => fleet.take(entry, false), untake: () => fleet.untake(entry),
      };
    });
    this.rides.onLeft = (x, y, z, rot) => this.leftRide(x, y, z, rot);
    this.rides.onStuck = () => this.showRideToast({ kind: "info", title: L("Čia išlipti nėra kur"), body: L("Pavažiuok truputį toliau.") });
    this.undersea = new Undersea(RIDES.deep, RIDES.rocks);
    const host: ModeHost = this.modeHost = {
      acting: () => new ActorTalk(),
      npc: (id) => this.npcs.find((n) => n.id === id)?.ch,
      player: () => this.player, rig: this.rig, rides: this.rides, standTaxi: this.town.parkedCars.taxi, doors: this.town.doors, time: () => this.t,
      add: (...objects) => this.scene.add(...objects),
      canStart: (indoors) => !this.disposed && !this.session?.active && !useStore.getState().hud.panel
        && !useStore.getState().hud.glyph && !this.transitioning && !this.flight && this.rideTimer === undefined && (indoors || !this.zone.interior),
      fade: (fn) => { if (this.transitioning || this.disposed) return false; this.fadeThen(() => { if (!this.disposed) fn(); }); return true; },
      splash: (x, y, z, dx, dz, k) => this.splashes.burst(x, y, z, dx, dz, k),
      hideNpc: (id, hidden) => { const n = this.npcs.find((q) => q.id === id); if (n) n.ch.root.visible = !hidden; },
      // a mini-game's recorded effects load as it starts, and its room and music play while it runs (audio.bed)
      entered: (id) => { this.speedFeelLoader?.cancel(); this.modes.entered(id); audio.preload(MODE_SAMPLES[id] ?? []); audio.bed(id); },
      left: (id) => {
        if (!this.modes.owns(id)) return;
        this.modes.left(id); audio.bed(null);
        if (id === "road" && this.rides.riding) this.boardCarWater(this.rides.riding);
        this.arcade?.returnedFrom(id);
      }, owns: (id) => this.modes.owns(id),
      portrait: () => this.container.clientHeight > this.container.clientWidth * 1.15,
      prepare: () => this.prepareMode(),
      place: (x, z, rot) => this.placeOnFoot(x, z, rot),
      updatePose: (dt, heading) => this.updateModePose(dt, heading),
      board: (ride) => this.boardRide(ride, true),
      startTownDrive: (ride) => {
        const mode = this.modes.active;
        if (mode?.townDrive === ride && this.rides.riding === ride && this.zone.id === "town") this.loadTownSpeedFeel(ride, mode);
      },
      drive: (dt, controls) => this.updateRide(dt, controls,
        this.zone.id === "town" && this.modes.active?.townDrive === this.rides.riding),
      horn: () => this.horn(),
      dismount: (x, z, rot, keepParked) => {
        const point = this.rides.riding && this.rides.carExit(this.rides.riding)?.clone();
        this.endRide(keepParked);
        const p = point ?? this.player.root.position;
        this.placeOnFoot(x ?? p.x, z ?? p.z, rot ?? this.heading);
      },
      snapTaxi: ({ m, mesh }, dimensions) => {
        this.releaseTownSpeedFeel();
        this.rideCourse = m.heading;
        this.rig.target.set(m.x, 0, m.z);
        this.rig.snapTaxi({ position: mesh.position, heading: () => m.heading, ...dimensions }, taxiSightline);
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
    this.modes.register(createSurfMode(host, (outfit) => this.dressPlayer(outfit)));
    this.modes.register(this.taxi = createTaxiMode(host));
    const colectivoPhoto = new THREE.Vector3();
    this.modes.register(this.quests = new TownQuests(host, {
      spots: this.town.photoSpots.concat(this.ambient.traffic.filter((car) => car.kind === "colectivo").map((car): PhotoSpot => ({
        id: "colectivo",
        get x() { return car.mesh.position.x; },
        get y() { return car.mesh.position.y + 1.35; },
        get z() { return car.mesh.position.z; },
        visible: () => car.mesh.visible && !!car.whole && this.field.free(
          colectivoPhoto.copy(car.mesh.position).addScaledVector(THREE.Object3D.DEFAULT_UP, 1.35),
          this.rig.cam.position, 0, 0, 0, 0, 0,
        ) === 1,
      })), this.rides.list.filter((ride) => ride.id === "muelle" || ride.id === "playa").map((ride): PhotoSpot => ({
        id: "lancha",
        get x() { return ride.mesh.position.x; },
        get y() { return ride.mesh.position.y + 0.6; },
        get z() { return ride.mesh.position.z; },
        visible: () => ride.mesh.visible,
      }))),
      walking: () => this.questAvailable() && this.zone.id === "town" && this.rig.mode === "follow",
      available: () => this.questAvailable(),
      zone: () => this.zone.id,
      guide: (id) => {
        const door = this.town.doors.find((door) => door.loc === id);
        if (!door || this.zone.id !== "town") return;
        this.walkTo(door.outX, door.outZ, { kind: "point" });
        if (this.autoPath?.length) {
          this.autoTarget = { kind: "point", directions: useTownQuests.getState().directions };
          this.pathT = 0;
        }
      },
      actor: () => this.npcs.find(({ id }) => this.quests.handlesNpc(id))?.ch,
    }));
    if (THEME.roomExtras.cantina) {
      this.modes.register(this.arcade = new ArcadeMode(host, {
        here: () => this.zone.id === BILLIARDS_PLACE,
        place: ({ x, z, rot }) => {
          useStore.getState().setHud({ ride: null, prompt: null });
          this.placeOnFoot(x, z, rot, true);
        },
        start: (id, option) => this.modes.start(id, option),
        holdRadio: (playing) => playing ? radio.hold("arcade") : radio.release("arcade"),
        visit: (id) => this.visitArcadeGame(id),
        refocus: () => {
          if (this.disposed) return;
          this.updateHud();
          requestAnimationFrame(() => {
            if (useStore.getState().hud.prompt?.kind === "arcade" && !this.modes.engaged)
              document.querySelector<HTMLButtonElement>(".hud .prompt")?.focus({ preventScroll: true });
          });
        },
      }));
    }
    this.road = new RoadEntry({
      ...host,
      cabinetAvailable: () => this.zone.id === BILLIARDS_PLACE && useArcade.getState().playing === "road",
      environment: () => ({ sky: this.sky, fog: this.scene.fog as THREE.Fog | null, hemi: this.hemi, sun: this.sun,
        environment: this.scene.environment, environmentIntensity: this.scene.environmentIntensity }),
      roadSign: () => this.town.roadSign.root,
      roadOpening: () => this.town.roadOpening,
      viewport: () => ({ width: this.screenW, height: this.screenH }),
      approach: (roadApproach) => {
        const state = useStore.getState();
        if (!!state.hud.roadApproach !== roadApproach) state.setHud({ roadApproach });
      },
      holdTownPose: () => {
        if (this.roadTownView) this.rig.cam.copy(this.roadTownView, false);
        this.speedFeel?.holdTownPose(this.screenW, this.screenH);
        this.sky.position.copy(this.rig.cam.position);
      },
      clearTownHud: () => {
        this.releaseTownSpeedFeel();
        this.nearest = null;
        this.tagLayer.style.visibility = "hidden";
        useStore.getState().setHud({ prompt: null, ride: null, fast: false, speedLines: false });
      },
      speedFeel: (acquire) => {
        if (acquire) this.loadSpeedFeel(acquire);
        return this.speedFeel;
      },
      left: (id) => { this.speedFeel?.restoreTownPose(); this.tagLayer.style.visibility = ""; host.left(id); },
      deferLift: () => this.road?.deferLift(),
      returnCar: (car, onFoot) => this.returnRoadCar(car, onFoot),
    });
    this.modes.register(this.road);
    const indoorStageHost: ModeHost = {
      ...host,
      fade: (swap) => {
        if (this.transitioning || this.disposed) return false;
        this.transitioning = true;
        audio.sfx("door");
        this.frameFade.start(swap);
        return true;
      },
    };
    this.barista = createBaristaMode(indoorStageHost, {
      room: () => this.zone.id === BARISTA_CONVERSATION.location ? this.zone.group : null,
      mia: () => this.npcs.find((actor) => actor.id === BARISTA_CONVERSATION.npc)?.ch,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      savePlace: () => this.savePlace(),
    });
    this.modes.register(this.barista);
    this.modes.register(createPoolMode(host));
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
        tip: (title, body) => this.showRideToast({ kind: "tip", title: L(title), body: L(body) }),
      });
      this.modes.register(this.sea);
    }
    this.modes.register(createLoteriaMode(host, {
      npc: (id) => this.npcs.find((n) => n.id === id)?.ch,
      prop: (id) => this.town.group.getObjectByName(id),
      dusk: () => loteriaDusk(this.sky, this.sun, this.hemi, this.scene.fog),
      save: () => this.savePlace(),
    }));
    this.modes.register(this.billiards = new BilliardsMode(host, {
      table: () => this.zone.id === BILLIARDS_PLACE
        ? this.zone.group.getObjectByName(TABLE_NAME)?.userData.table as TableView ?? null : null,
      tina: () => this.npcs.find((actor) => actor.id === BILLIARDS_NPC)?.ch,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      save: () => this.savePlace(),
    }));
    this.cenoteTour = registerCenoteTown(this.modes, host, {
      container: this.container, undersea: this.undersea, inTown: () => !this.disposed && this.zone?.id === "town",
      wasHidden: () => this.wasHidden, cancelRide: () => this.cancelRide(), resetFootInput: () => this.resetFootInput(),
      save: () => this.savePlace(), drawStats: () => this.drawStats(),
      actors: () => this.npcs, colliders: () => this.zone.colliders, ambient: this.ambient,
      spawnNpc: (spot) => this.spawnNpc(spot), disposeNpc: (actor) => this.disposeNpc(actor),
    });
    this.modes.register(createGymMode(indoorStageHost, {
      room: () => this.zone.id === GYM_ENTRY.location ? this.zone.group : null,
      trainer: () => this.npcs.find(isGymTrainer)?.ch,
      heading: () => this.heading,
      place: (x, z, rot) => this.placeOnFoot(x, z, rot, true),
      savePlace: () => this.savePlace(),
      viewport: () => ({ width: this.screenW, height: this.screenH }),
    }));
    this.scene.add(this.npcLayer, this.guidance.group, this.ambient.group, this.rides.group, this.dust.group, this.splashes.group, this.undersea.group);
    // (a place like the grotto keeps the camera inside itself: Interior.wild.space)
    this.rig.space = {
      free: (a, b) => (this.wild ? this.wild.space.free(a, b) : this.zone?.interior ? 1 : this.field.free(a, b)),
      inside: (q) => (this.wild ? this.wild.space.inside(q) : !this.zone?.interior && this.field.solidAt(q.x, q.y, q.z, 0.15)),
      overSolid: (x, z) => !this.zone?.interior && this.field.overSolid(x, z),
    };
    // what shows of the grotto from the cenote (a glow in the cave's mouth)
    this.caveLure = caveLure();
    if (this.caveLure) this.town.group.add(this.caveLure);
    const prof = st.progress.profile!;
    this.playerLook = withBackpack({ ...prof.look, female: prof.look.female ?? prof.gender === "f" });
    this.player = this.normalPlayer = createCharacter(this.playerLook);
    this.player.fidgets = false;
    this.scene.add(this.player.root);
    // (the clip list loads meanwhile: the town doesn't wait for it, a conversation's first line does, audio.play)
    void audio.init();
    audio.volume = st.settings.volume;
    audio.sounds = st.settings.sounds;
    this.unbindAmbience = useStore.subscribe(() => {
      if (!this.ambienceAllowed() || useStore.getState().settings.volume <= 0) audio.stopAmbience();
    });
    await startupTask();
    if (this.disposed) return;
    const jump = debug === "billiards" ? { zone: BILLIARDS_PLACE, spawn: TABLE_PROMPT }
      : debug === "barista" ? { zone: BARISTA_CONVERSATION.location, spawn: BARISTA_PROMPT }
      : linked ? this.scenarioArrival(SITUATION_BY_ID[linked]) : undefined;
    const { place, launchedLanchas } = useStore.getState().progress;
    const saved = place && (place.zone === "town" || INTERIOR_IDS.includes(place.zone) || (place.zone === CAVE_ZONE && caveWays().length));
    const fly = !jump && !saved && this.wantsFlight();
    if (jump ? jump.zone === "town" : place?.zone === "town" || fly) {
      await this.awaitExterior();
      if (this.disposed) return;
    }
    for (const [id, parked] of Object.entries(launchedLanchas ?? {})) {
      const boat = this.rides.find(id);
      if (boat?.beach && [parked?.x, parked?.z, parked?.rot].every(Number.isFinite)) this.rides.resetPosition(boat, parked);
    }
    if (jump) {
      const berth = place?.zone === "town" ? place.boat : undefined;
      const boat = berth && this.rides.find(berth.id);
      if (boat?.kind === "boat" && berth && [berth.x, berth.z, berth.rot].every(Number.isFinite)) {
        const launch = boat.beach?.launch;
        const position = launch && berth.z > SHORE.edge ? launch : berth;
        this.rides.resetPosition(boat, { ...position, z: Math.max(BAY.z0 + 5, position.z) });
      }
      this.enterZone(jump.zone, jump.spawn, true);
    } else if (place && saved) {
      const entering = this.enterZone(place.zone, { x: place.x, z: place.z, rot: place.rot }, true);
      if (entering) await entering;
      if (this.disposed) return;
      if (place.zone === "town") this.ambient.clearPlayerSpawn(this.player.root.position, 0.38);
      if (place.zone === "town" && place.boat) {
        const saved = place.boat, boat = this.rides.find(saved.id);
        if (boat?.kind === "boat" && [saved.x, saved.z, saved.rot].every(Number.isFinite)) {
          const launch = boat.beach?.launch;
          const position = launch && saved.z > SHORE.edge ? launch : saved;
          this.rides.resetPosition(boat, { ...position, z: Math.max(BAY.z0 + 5, position.z) });
          if (this.rides.restoreBoat(boat, this.t)) {
            const mooring = saved.mooring;
            this.seaMooring = mooring && [mooring.x, mooring.z, mooring.rot].every(Number.isFinite) ? mooring : launch ?? boat.home;
            this.sea?.prefetch(boat);
            this.snapSeaBoat(boat);
          }
        }
      }
    }
    if (this.disposed) return;
    if (!this.zone) {
      if (fly) this.beginFlight();
      else this.enterZone("airport", ARRIVAL, true);
    }
    this.phoneWatch.push(useStore.subscribe((state, previous) => {
      if (this.pad?.input) {
        const h = state.hud, before = previous.hud;
        if (h.panel !== before.panel || !!h.glyph !== !!before.glyph || h.modeScreen !== before.modeScreen ||
            !!h.fade !== !!before.fade || h.phoneCard !== before.phoneCard || h.flight !== before.flight ||
            state.conv.active !== previous.conv.active || state.screen !== previous.screen) this.pad.cancel();
      }
      if (state.conv.active !== previous.conv.active || state.hud.panel !== previous.hud.panel || state.hud.phoneCard !== previous.hud.phoneCard) {
        this.reactions.observe(state.conv.active);
      }
      if (state.hud !== previous.hud || state.conv.active !== previous.conv.active || state.screen !== previous.screen || state.settings !== previous.settings) {
        this.observeStreetAndPhone();
      }
    }), radio.store.subscribe((state, previous) => {
      if (state.open !== previous.open) {
        this.pad?.cancel();
        this.observeStreetAndPhone();
      }
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
    this.syncSize();
    this.modes.tick(0, !this.zone.interior && !this.flight);
    this.rig.applyPose();
    this.rig.cam.fov = this.rig.fovFor(this.screenW, this.screenH, false);
    this.rig.cam.updateProjectionMatrix();
    this.applyWalkingViewShift(this.screenW, this.screenH, false);
    if (!this.zone.interior) {
      this.rig.cam.updateMatrixWorld();
      this.rides.updateVisuals(0, this.t);
      this.ambient.update(0, this.player.root.position, this.rig.cam.position, this.hop.y, this.hop.air,
        undefined, !this.rides.riding && !this.swimming && !this.aloft);
      this.carVisuals?.update(0);
      this.rides.updateParkingKeys(this.t, !this.flight);
      this.town.update(this.t, 0, this.rig.cam.position);
    }
    this.farCull();
    this.updateNpcs(0, false);
    this.player.update(0);
    this.zone.interior?.update?.(this.t, 0);
    this.wild?.frame?.(this.t, 0, this.rig.cam, this.player.root.position, this.screenH * this.renderer.getPixelRatio());
    this.updateViewLights();
    this.drawTown();
    this.initialDrawn = true;
    this.savePlace();
    this.updateHud();
    this.updateTags();
    this.bindInput();
    this.renderer.setAnimationLoop(this.loop);
    const ready = this.onReady;
    this.onReady = undefined;
    ready?.();
    if (this.disposed) return;
    if (import.meta.env.DEV) this.streetLife.devRequest();
    // the town's hints, each when its thing first matters (coach.ts); after the flight, if the visit opens with one
    if (!this.flight) coach.begin(true);
  }

  private async awaitExterior() {
    if (this.carVisuals?.ready) return;
    const models = this.exteriorModels ?? prepareExteriorCars();
    this.exteriorModels = undefined;
    await this.carVisuals!.initialize(models);
  }

  /** Renderer counters for the most recent frame. */
  drawStats() {
    const { calls, triangles } = this.renderer.info.render;
    return { calls, triangles };
  }

  /** Renderer counters for the most recent frame, plus the car assets and instances ready to draw. */
  carStats() {
    const models = this.carVisuals?.stats() ?? { trafficModels: 0, parkedModels: 0, taxi: false };
    return { ...this.drawStats(), loadedCarModels: loadedCarModelCount(), ...models };
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
    this.hemi = new THREE.HemisphereLight("#e4f3ff", "#8fbf6a", 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff0d8", 2.75);
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
    const cave = id === CAVE_ZONE ? this.caveCode?.buildCaveZone(id) : undefined;
    const it = cave?.interior ?? getInterior(id);
    if (!it) return null;
    const wb = it.wild?.bounds;
    const nav = wb ? new NavGrid(wb.minX, wb.minZ, wb.maxX, wb.maxZ, 0.5, it.colliders, 0.35) : new NavGrid(-it.w / 2 - 1, -it.d / 2 - 1, it.w / 2 + 1, it.d / 2 + 3, 0.5, it.colliders, 0.35);
    // (a place with a ground plan of its own: its walls and waters are in nobody's way-finding)
    if (it.wild) for (let i = 0; i < nav.blocked.length; i++) { const [x, z] = nav.center(i); if (!it.wild.walkable(x, z, 0.4)) nav.blocked[i] = 1; }
    const z: ZoneState = { id, group: it.group, colliders: it.colliders, nav, interior: it };
    if (cave && this.caveCode) z.cave = { view: cave.view, syncGates: this.caveCode.caveGateGrid(nav) };
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
  enterZone(id: string, spawn?: { x: number; z: number; rot: number }, instant = false, via?: "in" | "out", onEntered?: () => void, arrivalHold?: number): void | Promise<void> {
    if (this.disposed || this.enteringFirstExterior) return;
    if (id === CAVE_ZONE && !this.caveCode) {
      if (!caveWays().length) return;
      this.pad?.cancel();
      const from = this.zone;
      return this.caveLoading ??= loadStartupModule(import("./cave/zone")).then((code) => {
        if (this.disposed || this.zone !== from) return;
        this.caveCode = code;
        return this.enterZone(id, spawn, instant, via, onEntered, arrivalHold);
      }).catch((error) => {
        if (this.disposed || this.zone !== from) return;
        if (!this.initialDrawn) throw error;
        this.dropIn = 0;
        this.stopAutoWalk();
        useStore.getState().toast({ kind: "info", title: L("Ten nueiti negalima") });
      }).finally(() => { this.caveLoading = undefined; });
    }
    const z = this.getZone(id);
    if (!z) return;
    this.pad?.cancel();
    const doIt = () => {
      this.arcade?.forgetReturn();
      if (this.rides.water?.returning || this.rides.water?.wet) this.endRide();
      this.greeting?.release(0);
      this.phone.dismiss();
      if (this.modes.active || this.modes.owns("barista") || this.modes.owns("surf")) this.modes.exit(true);
      if (this.flight) {
        this.flight = null;
        this.rig.stage = null;
        this.player.root.visible = true;
        useStore.getState().setHud({ flight: false });
        coach.begin();
      }
      if (this.zone?.id === "town" && id !== "town") this.rides.healCrashes();
      if (this.zone !== z) this.clearNametagLayout();
      this.clearActorColliders();
      if (this.zone) this.scene.remove(this.zone.group);
      this.zone = z;
      this.streetLife?.observe(this.streetSnapshot());
      this.scene.add(z.group);
      const indoor = !!z.interior, wild = z.interior?.wild;
      this.jogT = 0;
      this.cave?.dispose();
      this.cave = null;
      // (out of whatever was driven, and out of the water: on foot wherever this puts them)
      this.endRide();
      this.rides.group.visible = !indoor;
      this.surface(true);
      const sp = spawn ?? (z.interior ? z.interior.spawn : { x: 0, z: 0, rot: 0 });
      // (on the sand where it slopes under the sea, if that is where they were)
      const floor = wild ? wild.floor(sp.x, sp.z) : indoor ? 0 : floorY(sp.x, sp.z);
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
      // (dropped in through a hole in the roof: they fall from up there, into the water)
      this.hop.land(floor + this.dropIn);
      this.dropIn = 0;
      this.fader.reset();
      CUT.r.value = 0;
      this.moveVel.set(0, 0, 0);
      this.nearest = null;
      this.spawnNpcs();
      // lighting & atmosphere
      this.sky.visible = !indoor;
      this.ambient.group.visible = !indoor;
      this.scene.fog = wild ? wild.fog : indoor ? null : new THREE.Fog("#cfe8f5", 110, 420);
      this.scene.background = wild ? new THREE.Color(wild.background)
        : indoor ? new THREE.Color(z.interior?.background ?? (z.interior?.warm ? "#2b2320" : "#23282e")) : null;
      // outdoors a little less flat fill and a little more sun than before (deeper colours, clearer shapes)
      // (a place like the grotto has its own light on the people there)
      this.hemi.intensity = wild ? wild.hemi[2] : id === BILLIARDS_PLACE ? 1.23 : indoor ? 1.9 : 1.4;
      this.sun.intensity = wild ? wild.sun[1] : id === BILLIARDS_PLACE ? 0.92 : indoor ? 1.6 : 2.75;
      this.hemi.color.set(wild ? wild.hemi[0] : "#e4f3ff");
      this.hemi.groundColor.set(wild ? wild.hemi[1] : "#8fbf6a");
      this.sun.color.set(wild ? wild.sun[0] : "#fff0d8");
      this.fx?.zone(indoor, !!z.interior?.warm);
      this.rig.mode = indoor && !wild ? "interior" : "follow";
      if (indoor && !wild) this.rig.interiorBounds = { w: z.interior!.w, d: z.interior!.d, cabinetCorner: !!this.arcade && id === BILLIARDS_PLACE };
      else this.rig.yaw = this.heading;
      // (the follow camera's lean and distance: the town's, or the place's own)
      // (the town's, as the player left it with the wheel, is kept for when they come back up)
      this.rig.homePitch = wild?.camera?.pitch ?? FOLLOW.pitch;
      if (wild?.camera && !this.townCam) { this.townCam = { pitch: this.rig.pitch, dist: this.rig.dist }; this.rig.pitch = wild.camera.pitch; this.rig.dist = wild.camera.dist; }
      else if (!wild && this.townCam) { this.rig.pitch = this.townCam.pitch; this.rig.dist = this.townCam.dist; this.townCam = null; }
      this.caveGuideMode = this.guidedWalk ?? (wild && !this.phoneTask() && this.currentObjective()?.location !== CAVE_ZONE ? "cave" : "objective");
      if (z.cave && this.caveCode) {
        const { view, syncGates } = z.cave;
        this.cave = new this.caveCode.CaveQuest(view, {
          tree: () => this.talkToTree(),
          gates: (save, all) => {
            syncGates(save, all);
            this.caveGates = GATES.reduce((mask, gate, i) => mask | (gateState(gate, save, all).open ? 1 << i : 0), 0);
            this.pathT = 0;
          },
        });
      }
      this.rig.target.copy(this.player.root.position);
      this.rig.snap();
      if (via) this.rig.arrive();
      const st = useStore.getState();
      const loc = LOCATIONS[id];
      const name = id === "town" ? EDITION.town : loc?.name ?? id;
      st.setHud({ zoneName: name, zoneBanner: { title: name, sub: id === "town" ? EDITION.town : loc?.lt }, prompt: null });
      this.afterZoneDelay(() => { if (useStore.getState().hud.zoneBanner?.title === name) useStore.getState().setHud({ zoneBanner: null }); }, 2600);
      this.refreshObjective();
      if (this.guidedWalk) this.walkObjective(this.guidedWalk);
      if (this.initialDrawn && !this.enteringFirstExterior) this.savePlace();
    };
    const enter = () => { doIt(); onEntered?.(); };
    if (!z.interior && this.initialDrawn && this.firstExteriorAt === undefined) {
      if (this.transitioning) return;
      this.enteringFirstExterior = true;
      this.fadeThen(async () => {
        try {
          if (!await this.prepareFirstExit() || this.disposed) return;
          doIt();
          await new Promise<void>((resolve) => { this.firstExteriorDraw = resolve; });
        } finally {
          this.enteringFirstExterior = false;
        }
        if (this.disposed) return;
        this.savePlace();
        onEntered?.();
      }, arrivalHold === undefined ? 320 : 0, arrivalHold);
    } else if (arrivalHold !== undefined) this.fadeThen(enter, 0, arrivalHold);
    else if (instant) enter();
    else this.fadeThen(enter);
  }

  private async prepareFirstExit() {
    while (!this.disposed) {
      try {
        await this.awaitExterior();
        return true;
      } catch (error) {
        if (this.disposed) return false;
        if (!this.onExteriorError) throw error;
        const retry = await new Promise<boolean>((resolve) => {
          this.replyToExteriorError = resolve;
          this.onExteriorError!(() => resolve(true), () => resolve(false));
        });
        this.replyToExteriorError = undefined;
        if (!retry) return false;
      }
    }
    return false;
  }

  private fadeThen(fn: () => void | Promise<void>, delay = 320, hold = 120) {
    if (this.transitioning || this.disposed) return;
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
      useStore.getState().toast({ kind: "info", title: L("Nepavyko įkelti žaidimo"),
        body: L("Patikrink interneto ryšį ir pabandyk dar kartą.") });
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
    return () => {
      clearTimeout(timer);
      this.zoneTimers.delete(timer);
    };
  }

  private chosenDatePartner() {
    const p = useStore.getState().progress.profile;
    return p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma");
  }

  private spawnNpcs() {
    this.placedNametags.length = 0;
    this.clearNpcs();
    const spots = this.zone.interior ? this.zone.interior.npcs : townNpcs;
    const partner = this.chosenDatePartner();
    for (const sp of spots) {
      if ((sp.npc === "sam" || sp.npc === "emma") && sp.npc !== partner) continue;
      const poolKid = !this.zone.interior && HOTEL_POOL_ENABLED ? POOL_KIDS.find((kid) => kid === sp.npc) : undefined;
      const actor = this.spawnNpc(sp, poolKid ? hotelPoolKidY(poolKid) : 0);
      if (!actor) continue;
      const { ch } = actor;
      if (sp.sit) { ch.seatY = sp.seat ?? 0.5; ch.setAnim("sit"); }
      ch.busy = AT_WORK[sp.npc] ?? null;
      if (sp.npc === BILLIARDS_NPC) {
        const cue = makeCue();
        cue.name = "billiards-owner-cue";
        cue.position.set(0.04, 0.61, 0.06);
        cue.rotation.z = 0.12;
        ch.rightHand.add(cue);
      }
      if (this.zone.cave) actor.alux = { next: 6 + Math.random() * 6, hop: 0 };
      this.npcs.push(actor);
      this.zone.colliders.circles.push({ x: sp.x, z: sp.z, r: 0.45, npc: sp.npc });
    }
    // passers-by step round the people standing in town
    if (!this.zone.interior) this.ambient.obstacles = this.npcs.map((n) => [n.home.x, n.home.z]);
    this.spawnRoomPeople();
  }

  private spawnNpc(sp: NpcSpot, y = 0): NpcActor | undefined {
    const def = NPCS[sp.npc];
    if (!def) return;
    const ch = createCharacter({ ...def.look, female: def.look.female ?? def.gender === "f" });
    ch.watch = this.learnerAt;
    ch.root.position.set(sp.x, y, sp.z);
    ch.root.rotation.y = sp.rot;
    this.npcLayer.add(ch.root);
    const tag = document.createElement("div");
    tag.className = "nametag";
    tag.innerHTML = nameTagHtml(def);
    this.tagLayer.appendChild(tag);
    return {
      id: sp.npc, ch, home: ch.root.position.clone(), rot: sp.rot, tag, sit: sp.sit, waved: false,
      tagBounds: { tag, x0: 0, x1: 0, y0: 0, y1: 0 },
      approach: sp.ax !== undefined && sp.az !== undefined ? new THREE.Vector3(sp.ax, 0, sp.az) : undefined,
    };
  }

  private disposeNpc(n: NpcActor) {
    n.ch.rightHand.getObjectByName("billiards-owner-cue")?.traverse((piece) => {
      if (piece instanceof THREE.Mesh) { piece.geometry.dispose(); piece.material.dispose(); }
    });
    n.ch.dispose?.(); this.npcLayer.remove(n.ch.root); n.tag.remove();
  }

  private clearNpcs() {
    for (const n of this.npcs) this.disposeNpc(n);
    this.npcs = [];
  }

  private clearRoomPeople() {
    for (const ch of this.extras) { ch.dispose?.(); this.npcLayer.remove(ch.root); }
    this.extras = [];
    this.extraChats = [];
    this.staff = [];
  }

  private clearActorColliders() {
    this.cenoteTour?.removeGuide();
    // The rooms and the cave keep their collider sets when cached.
    if (this.zone) this.zone.colliders.circles = this.zone.colliders.circles.filter((c) => !c.npc && !c.extra);
  }

  /** The room's townspeople: guests, customers, colleagues (roomPeople.ts), with looks drawn per room. Outdoors the
   *  passers-by are Ambient's. */
  private spawnRoomPeople() {
    this.clearRoomPeople();
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
        this.zone.colliders.circles.push({ x: p.x, z: p.z, r, extra: true });
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
      blocked: () => {
        const { hud } = useStore.getState();
        return !!(hud.fade || this.transitioning || this.rideTimer !== undefined || this.seaReturnView || this.sea?.padHandoff);
      },
      scope: () => {
        const { screen, conv, hud } = useStore.getState();
        if (screen !== "play" || conv.active || this.session?.active || this.conversationLoads || this.sceneDelays.size ||
            hud.panel || hud.glyph || hud.phoneCard || this.caveLoading || this.flight || this.modes.modal ||
            radio.store.getState().open || useStreet.getState().moment || useSurf.getState().picking) return null;
        const mode = this.modes.active;
        if (this.modes.engaged || hud.modeScreen) return mode?.padDriving || mode?.padAction ? mode : null;
        const ride = this.rides.riding;
        return ride ? this.rides.phase === "on" ? ride.kind : null : "foot";
      },
      canLook: () => this.rig.mode === "follow" && !this.pointer.down && !this.road?.active && !this.sea?.active,
      orbit: (dx, dy) => this.rig.drag(dx, dy),
      avatarBounds: () => {
        if (!this.player?.root.visible || this.flight) return;
        const q = this.tmpV.copy(this.player.root.position);
        const width = window.innerWidth, height = window.innerHeight;
        q.project(this.rig.cam);
        const foot = (1 - q.y) * height / 2;
        q.copy(this.player.root.position);
        q.y += this.player.height;
        q.project(this.rig.cam);
        if (q.z < -1 || q.z > 1) return;
        const x = (1 + q.x) * width / 2, head = (1 - q.y) * height / 2;
        const half = Math.max(16, Math.abs(foot - head) * 0.4);
        return new DOMRect(x - half, Math.min(head, foot) - 12, half * 2, Math.abs(foot - head) + 24);
      },
      back: (surface) => {
        if (surface === "meeting") {
          if (this.modes.active?.id !== "friend-meeting") return false;
          this.modeExit();
          return true;
        }
        return this.modes.padBackFrom(surface);
      },
      jump: () => this.jump(),
      interact: () => {
        // (the HUD looks for what is near only every 0.12 s: just after a mode closes, look now)
        if (!this.nearest && !this.rides.riding && !this.modes.active) this.updateHud();
        if (!this.rides.riding && (!this.nearest || !useStore.getState().hud.prompt)) return false;
        this.interact();
        return true;
      },
      horn: () => this.horn(),
      manual: (brake) => {
        if (brake) this.rideGoal = null;
        if (this.inputStick(true) === this.pad?.input) {
          this.stopAutoWalk();
          this.rideGoal = null;
        }
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
    el.addEventListener("wheel", (e) => { if (this.rig.mode === "follow") this.rig.zoom(e.deltaY); }, { passive: true });
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
    if (e.repeat && this.gymHeldKeys.has(k)) { e.preventDefault(); return; }
    if (st.conv.active) return; // the conversation panel handles its own keys
    if (st.hud.panel) { if (k === "escape") st.setHud({ panel: null }); return; }
    // (at a glyph stone: its card has the keys; Esc puts it away)
    if (st.hud.glyph) { if (k === "escape" && !e.defaultPrevented) { e.preventDefault(); if (!e.repeat) this.cave?.close(); } return; }
    if (this.modes.owns("gym")) {
      this.gymHeldKeys.add(k);
      const handled = (!this.transitioning || k === "escape") && this.modes.input({ kind: "key", key: k, repeat: e.repeat, keys: this.keys });
      if (handled || k.startsWith("arrow")) e.preventDefault();
      return;
    }
    if (this.modes.modal) {
      if (k === "escape") this.modes.exit();
      return;
    }
    if (k === "h" && !e.repeat && this.rides.riding?.kind === "car" && !this.modes.owns("road")) {
      this.horn(); e.preventDefault(); return;
    }
    if (this.modes.active) {
      if (!this.transitioning && this.modes.input({ kind: "key", key: k, repeat: e.repeat, keys: this.keys, shift: e.shiftKey })) e.preventDefault();
      return;
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(k)) {
      this.keys.add(k); this.stopAutoWalk(); this.rideGoal = null; e.preventDefault(); return;
    }
    // Space: talk or go in, as E, when there is someone or a door to; else a jump (in the air: the second jump). At a wheel it
    // is the brake, for as long as it is held; swimming, a dive
    if (k === " " && (this.rides.riding || this.rides.water?.returning)) { this.keys.add(" "); this.rideGoal = null; e.preventDefault(); return; }
    if (k === " ") {
      if (!this.keys.has(" ")) {
        if (this.nearest && !this.hop.air && !this.swimming) this.interact(); else if (!e.repeat) this.jump();
      }
      e.preventDefault(); return;
    }
    if (k === "e" || k === "enter") {
      const returning = !!this.rides.water?.returning;
      if (!e.repeat || !this.waterActionHeld) this.interact();
      this.waterActionHeld ||= returning || !!this.rides.water?.returning;
      e.preventDefault(); return;
    }
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
    if (key === "e" || key === "enter") this.waterActionHeld = false;
    this.releaseWaterInput();
    this.gymHeldKeys.delete(key);
    if (this.billiards.release(key)) e.preventDefault();
  };
  private onBlur = () => {
    this.cancelCabinetDrive();
    this.keys.clear(); this.gymHeldKeys.clear(); this.waterActionHeld = false;
    this.releaseWaterInput(); this.billiards.release(" ", true); this.modes.blur();
  };

  horn() {
    if (useStore.getState().hud.panel || this.transitioning || this.session?.active) return;
    if (this.modes.active?.id === "road") { this.modeAction("road", "horn"); return; }
    const car = this.rides.riding;
    if (this.rides.water?.returning) return;
    if (car?.kind !== "car" || this.rides.phase !== "on" || this.t - this.hornAt < 0.36) return;
    this.hornAt = this.t;
    audio.sfx("horn");
    if (this.ambient.nearbyTraffic(car.m.x, car.m.z, 16) && Math.random() < 0.38) this.trafficReplyAt = this.t + 0.45 + Math.random() * 0.45;
  }

  modeStart(id: string, option?: string) {
    this.modes.start(id, option);
    this.observeStreetAndPhone();
  }

  private returnRoadCar(car: Ride, onFoot: boolean) {
    this.pad?.cancel();
    const start = ROAD_EDITION.edge.return;
    const sin = Math.sin(start.rot), cos = Math.cos(start.rot);
    const spots = [[0, 0], [5, 0], [0, -3.4], [10, 0]];
    const position = spots.map(([along, across]) => ({
      x: start.x + sin * along + cos * across, z: start.z + cos * along - sin * across, rot: start.rot,
    })).find(({ x, z }) => this.rides.freeParkingAt(car, x, z)) ?? start;
    this.keys.clear();
    this.joy.x = this.joy.y = 0;
    this.brake = false;
    this.speedFeel?.restoreTownPose();
    this.rideFov = 0;
    this.rig.dist /= 1 + this.rideBack;
    this.rideBack = 0;
    if (onFoot && this.rides.riding === car) this.endRide(true);
    this.rides.resetPosition(car, position);
    const step = this.rides.carExit(car);
    if (this.rides.riding !== car) {
      this.placeOnFoot(step?.x ?? position.x, step?.z ?? position.z + 2, position.rot);
      if (!onFoot) this.boardRide(car);
    }
    if (!onFoot && this.rides.riding === car) {
      this.loadTownSpeedFeel(car);
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
    this.pad?.cancel();
    this.keys.clear();
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
    if (this.rides.water?.returning) return;
    if (!this.road || this.zone.interior || this.modes.active || this.modes.modal || this.swimming) return;
    if (this.rides.riding) return;
    const p = this.player.root.position;
    const edge = walkEdge(p.x, p.z, this.vel.x, this.vel.z);
    if (edge && this.road.offer(edge)) this.modes.start("road", "walk");
  }

  setJoystick(x: number, y: number) {
    this.joy.x = x; this.joy.y = y;
    if (x || y) { this.stopAutoWalk(); this.rideGoal = null; }
    else { this.helmSteer.reset(); this.releaseWaterInput(); }
  }

  private inputStick(driving = false) { return effectiveStick(this.joy, this.pad?.input, driving); }
  private get braking() { return this.keys.has(" ") || this.brake || !!this.pad?.input?.brake; }

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
    if (this.session?.active || st.conv.active || st.hud.panel || st.hud.glyph || this.transitioning || !this.player) return;
    if (this.modes.active && this.modes.input({ kind: "jump" })) return;
    // (at a wheel the button is the brake: hold(); in the water it is a dive, and the way back up)
    if (this.rides.riding || this.rides.water?.returning || this.waterNeutral) return;
    if (this.swimming) { this.dive(); return; }
    if (this.hop.air) { if (this.hop.flip()) { audio.jump(this.hop.doubled ? 1.5 : 1.3); if (this.hop.doubled) audio.whoosh(); coach.did("jump"); } return; }
    if (this.hop.start()) { audio.jump(); coach.did("jump"); }
  }

  /** The jump button held down or let go: at a wheel it is the brake. */
  hold(on: boolean) { this.brake = on; if (on) this.rideGoal = null; else this.releaseWaterInput(); }

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
    if (this.player) {
      this.player.swim = 0; this.player.dive = 0;
      this.player.setBackpack?.(true);
      this.player.wading = false;
    }
    this.underWater(false);
  }

  /** The picture under water or in the air again: the fog, the sky, the camera's lean. */
  private underWater(on: boolean) {
    if (on === !!this.airFog) return;
    if (on) {
      this.airFog = (this.scene.fog as THREE.Fog | null) ?? new THREE.Fog("#cfe8f5", 110, 420);
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
    speakTownLine({ actor: ch, id: own ?? voice, scope: "town" }, voice, female, line.en,
      1.1 + line.en.length * 0.045, undefined, this.greeting ??= new ActorTalk());
    useStore.getState().toast({ kind: "info", title: L("„{line}“", { line: line.en }), body: line.lt, ms: 3200, phrase: line });
  }

  /** A member of the room's staff with no conversation here says their one line (roomPeople.ts `says`), turned to the
   *  player. */
  private staffSays(i: number) {
    const s = this.staff[i], line = s && STAFF_LINES[s.says];
    if (!line || this.session?.active) return;
    this.saysAloud(line, s.female, s.ch);
  }

  /** Into a convertible or the boat: whatever the player was doing on foot stops there. */
  private boardRide(r: Ride, duringTransition = false) {
    const st = useStore.getState();
    if (this.session?.active || st.hud.panel || (this.transitioning && !duringTransition) || this.rides.riding) return false;
    this.stopAutoWalk();
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
      this.reactions.boat(this.ambient, r);
      this.seaMooring = r.beach?.launch ?? { x: r.m.x, z: r.m.z, rot: r.m.heading };
      this.sea?.prefetch(r);
      if (!r.beach) {
        const p = this.player.root.position;
        this.splashes.burst(r.m.x, waterY(p.x, p.z, this.t) ?? SEA_LEVEL, r.m.z, 0, 0, 0.5);
      }
      this.savePlace();
    } else {
      if (!this.modes.engaged) this.loadTownSpeedFeel(r);
      this.road?.prefetch(r);
      this.boardCarWater(r);
    }
    return true;
  }

  private boardCarWater(ride: Ride) {
    if (!this.rides.waterEligible(ride) || this.zone.id !== "town" || this.modes.engaged) return;
    this.rides.prefetchWater(ride, {
      eligible: () => !this.disposed && this.zone.id === "town" && !this.modes.engaged && !this.flight,
      drops: this.splashes,
      splash: strength => audio.splash(strength),
      wash: () => audio.wash(),
      peopleClear: (clear, reserve) => this.carWaterPeopleClear(clear, reserve),
      arrest: () => {
        this.waterNeutral = this.waterInputHeld();
        this.stopAutoWalk();
        this.rideGoal = null;
        this.trafficReplyAt = undefined;
        this.dustT = 0;
        this.braked = this.kicked = false;
        this.dust.clear();
        useStore.getState().dismissRideToasts();
      },
      foot: foot => this.carWaterFoot(foot),
      snap: () => {
        this.vel.set(0, 0, 0);
        this.moveVel.set(0, 0, 0);
        this.rideCourse = this.rig.yaw = this.heading = this.player.root.rotation.y;
        this.rig.target.copy(this.player.root.position);
        this.rig.motion.speed = 0;
        this.rig.motion.next.copy(this.rig.target);
        this.rig.snap();
      },
      fade: phase => this.carWaterFade(phase),
      save: () => {
        this.waterNeutral = this.waterInputHeld();
        this.hudT = 0;
        this.saveT = 5;
        this.savePlace();
      },
      event: event => { if (event === "contact" || event === "float") this.savePlace(); },
    });
  }

  private carWaterPeopleClear(clear: Parameters<CarWaterAdapter["peopleClear"]>[0], reserve: boolean) {
    for (const n of this.npcs) {
      const p = n.ch.root.position, at = n.approach;
      if (n.ch.root.visible && !clear(p.x, p.z, 0.45)) return false;
      if (reserve && (!clear(n.home.x, n.home.z, 0.55) || at && !clear(at.x, at.z, 0.55))) return false;
    }
    for (const ch of this.extras) if (ch.root.visible && !clear(ch.root.position.x, ch.root.position.z, 0.45)) return false;
    if (reserve) for (const d of this.town.doors) if (!clear(d.outX, d.outZ, 1.1)) return false;
    return this.streetWorld.carWaterPeopleClear(clear, reserve);
  }

  private carWaterFoot(foot: Readonly<CarWaterFoot>) {
    const ch = this.player;
    ch.root.position.set(foot.x, foot.y, foot.z);
    ch.root.rotation.set(0, foot.rot, 0);
    this.heading = foot.rot;
    this.hop.land(foot.y);
    this.applyHop();
    ch.swim = foot.swim * 0.6;
    ch.dive = 0;
  }

  private carWaterFade(phase: Parameters<CarWaterAdapter["fade"]>[0]) {
    if (phase === "clear" && !this.waterFade) return;
    this.waterFade = phase !== "clear";
    const style = document.querySelector<HTMLElement>(".fade")?.style;
    if (this.waterFade) style?.setProperty("--scene-fade-time", "0.18s");
    else style?.removeProperty("--scene-fade-time");
    // Commit the full viewport cover before the car and camera change sites.
    if (phase === "opaque") flushSync(() => useStore.getState().setHud({ fade: 1, fadeOnFrames: true }));
    else useStore.getState().setHud({ fade: phase === "cover" ? 1 : 0 });
  }

  private waterInputHeld() {
    if (this.joy.x || this.joy.y || this.brake) return true;
    const k = this.keys;
    return k.has(" ") || k.has("w") || k.has("a") || k.has("s") || k.has("d")
      || k.has("arrowup") || k.has("arrowleft") || k.has("arrowdown") || k.has("arrowright");
  }

  private releaseWaterInput() {
    if (this.waterNeutral && !this.rides?.water?.returning && !this.waterInputHeld()) this.waterNeutral = false;
  }

  private loadTownSpeedFeel(ride: Ride, mode?: GameMode) {
    this.loadSpeedFeel(() => this.rides.phase !== "out"
      && (mode ? this.modes.active === mode && mode.townDrive === ride : !this.modes.engaged), ride);
  }

  private loadSpeedFeel(accept: () => boolean, ride = this.rides.riding) {
    if (this.speedFeel || this.disposed) return;
    const { zone, session } = this;
    const loader = this.speedFeelLoader ??= new SpeedFeelLoader(this.container, this.rig.cam);
    void loader.acquire(() => import("./rides/speedFeel"), () => {
      const { screen, settings } = useStore.getState();
      return !this.disposed && this.zone === zone && this.session === session && !session?.active
        && this.rides.riding === ride && screen === "play" && settings.play === "town" && accept();
    });
  }

  private releaseTownSpeedFeel() {
    this.speedFeelLoader?.cancel();
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
    if (this.rides.water?.returning) {
      // Frame the learner at the sill on the first detached draw, including the narrow phone view.
      this.rig.target.copy(p);
      return;
    }
    if (this.seaMooring) {
      this.seaMooring = undefined;
      this.savePlace();
    }
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
    this.pad?.cancel();
    this.rig.clearTaxiShot();
    if (this.modes.active?.cleanScreen === "menu") useStore.getState().dismissRideToasts();
    const p = this.player.root.position;
    this.hop.land(p.y); this.applyHop();
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.gait.sync(this.heading, 0); this.gaitOn = false; this.steer.reset();
    // The touch brake becomes the jump button on exit and can lose its release handler.
    this.brake = false;
    if (!this.rides.water?.returning) this.keys.delete(" ");
    this.rideGoal = null;
    this.helmSteer.reset();
    this.ambient.riding = false;
    this.nearest = null;
    this.releaseTownSpeedFeel();
    audio.rush("squeal", 0);
    // (the camera comes back to where the player had it)
    this.rig.dist /= 1 + this.rideBack; this.rideBack = 0; this.rideFov = 0;
    this.rig.portraitHelm = false;
    useStore.getState().setHud({ prompt: null, ride: null, fast: false, speedLines: false });
  }

  /** Out of a ride at once, with no hop (a door's zone change, a taxi, a conversation picked from the list). */
  private endRide(keep = false) {
    if (!this.rides) return;
    this.waterNeutral = this.waterActionHeld = false;
    if (!this.rides.riding) {
      this.rides.transferWater();
      if (this.player) this.player.swim = 0;
      return;
    }
    this.rides.abandon(keep);
    this.seaMooring = undefined;
    this.afterRide();
  }

  /** Up on something higher than a bench (a car, a low wall): nobody is talked to and no door gone through from there. */
  private get aloft() { return !this.wild && this.hop.ground > LAND + 0.1; }

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

  private poolCompanion(id: string) {
    return HOTEL_POOL_ENABLED && id !== "vale" && POOL_KIDS.some((kid) => kid === id);
  }

  private onClick(cx: number, cy: number) {
    if (this.rides.water?.returning) return;
    const st = useStore.getState();
    if (this.modes.active || this.modes.modal) {
      if (!st.hud.panel && !this.transitioning) this.modes.input({ kind: "tap" });
      return;
    }
    if (st.conv.active || st.hud.panel || st.hud.glyph || this.transitioning || this.flight) return;
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
        // (a vendor behind a stall has lines of their own: theme.ts `vendors`)
        const pool = w.vendor && VENDOR_LINES.length ? VENDOR_LINES : AMBIENT_LINES;
        const line = pool[Math.floor(Math.random() * pool.length)];
        const voice = ambientVoice(female ? "f" : "m");
        speakTownLine({ actor: w.ch, id: `walker:${w.id}`, scope: "greeting" }, voice, female, line.en,
          1.2, undefined, this.greeting ??= new ActorTalk(), true);
        st.toast({ kind: "info", title: L("„{line}“", { line: line.en }), body: line.lt, phrase: line });
        return;
      }
    }
    // staff with a line of their own (roomPeople.ts `says`)?
    if (this.staff.length) {
      const sh = this.raycaster.intersectObjects(this.staff.map((x) => x.ch.root), true);
      const i = sh.length ? this.staff.findIndex((x) => { let o: THREE.Object3D | null = sh[0].object; while (o) { if (o === x.ch.root) return true; o = o.parent; } return false; }) : -1;
      if (i >= 0) { this.staffSays(i); return; }
    }
    // NPC hit?
    const hits = this.raycaster.intersectObjects(this.npcs.filter((n) => !this.poolCompanion(n.id)).map((n) => n.ch.root), true);
    if (hits.length) {
      const actor = this.npcs.find((n) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === n.ch.root) return true; o = o.parent; } return false; });
      if (actor) { const t = actor.approach ?? actor.home; this.walkTo(t.x, t.z, { kind: "npc", id: actor.id }); return; }
    }
    // ground
    if (!this.raycaster.ray.intersectPlane(plane, p)) return;
    // door near the click?
    if (!this.zone.interior) {
      const d = this.town.doors.find((dd) => Math.hypot(dd.outX - p.x, dd.outZ - p.z) < 3.5 || Math.hypot(dd.x - p.x, dd.z - p.z) < 3);
      if (d) { this.walkTo(d.outX, d.outZ, { kind: "door", id: d.loc }); return; }
    } else if (Math.hypot(p.x - this.zone.interior.exit.x, p.z - this.zone.interior.exit.z) < 1.8) {
      this.walkTo(this.zone.interior.exit.x, this.zone.interior.exit.z - 0.6, { kind: "exit" }); return;
    }
    // (in the grotto the ground has dips and an island: the click is taken where it lands, on the floor's level)
    if (this.wild && !this.wild.walkable(p.x, p.z, 0.3)) return;
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

  private stopAutoWalk() {
    this.autoPath = null;
    this.autoTarget = null;
    this.guidedWalk = null;
  }

  walkTo(x: number, z: number, target: WalkTarget | null) {
    if (this.rides.water?.returning) return;
    if (this.guidedWalk) this.stopAutoWalk();
    this.startWalk(x, z, target);
  }

  private startWalk(x: number, z: number, target: WalkTarget | null) {
    const p = this.player.root.position;
    const nav = this.zone.nav;
    const outdoors = !this.zone.interior;
    const toSea = outdoors && z < SHORE.limit;
    if (toSea) {
      x = THREE.MathUtils.clamp(x, BAY.x0, BAY.x1);
      z = Math.max(z, BAY.z0 + 0.5);
    }
    // standing on something they jumped onto (a bench's seat): first straight down off it, to the nearest open spot
    // that its back or a wall beside it doesn't stand in the way of; the walk is planned from there
    let from: [number, number] = [p.x, p.z], down: [number, number][] = [];
    if (outdoors && this.ledges && p.z >= SHORE.limit && this.hop.ground > 0.05) {
      let bd = Infinity;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const i = nav.idx(p.x + dx * nav.cell, p.z + dz * nav.cell);
        if (!nav.free(i)) continue;
        const [cx, cz] = nav.center(i), d = Math.hypot(cx - p.x, cz - p.z);
        if (d < bd && this.ledges.clear(p.x, p.z, cx, cz, this.hop.y)) { bd = d; from = [cx, cz]; down = [from]; }
      }
    }
    const inSea = outdoors && (p.z < SHORE.limit || (p.z < SHORE.top && p.y < -0.05 && this.wading.depth > 0.08));
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
      if (this.guidedWalk) this.stopAutoWalk();
      const now = performance.now();
      if (now - this.lastBlockedTap >= 6000) {
        this.lastBlockedTap = now;
        useStore.getState().toast({ kind: "info", title: L("Ten nueiti negalima") });
      }
      return;
    }
    const [endX, endZ] = path.at(-1)!;
    this.autoPath = [...down, ...path.slice(1)];
    const npc = target?.kind === "npc" ? this.npcs.find((n) => n.id === target.id) : undefined;
    if ((endX === x && endZ === z) || (npc && talkDist(npc, { x: endX, z: endZ }) < TALK_RANGE - 0.35)) this.autoTarget = target;
    this.walkCheck = { time: 0, remaining: Infinity, wait: 0 };
    this.stepOut = 0;
  }

  autoWalkToObjective(mode: GuideMode = this.phoneTask() ? "objective" : this.caveGuideMode) {
    // (at a wheel one drives there oneself: the marks on the ground lead the way)
    if (this.rides.riding) { useStore.getState().toast({ kind: "info", title: L("Pirmiausia išlipk"), body: L("Arba važiuok pats – rodyklės ant žemės rodo kelią.") }); return; }
    const followUp = mode === "objective" && this.phoneTask();
    const throughGrotto = mode === "cave" || this.cave || (!followUp && this.currentObjective()?.location === CAVE_ZONE);
    if (this.caveLoading || (this.transitioning && throughGrotto)) return;
    if (throughGrotto || followUp || (this.zone.interior && this.currentObjective() === CENOTE_TOUR)) {
      this.stopAutoWalk();
      this.guidedWalk = mode;
    }
    if (this.caveGuideMode !== mode) {
      this.caveGuideMode = mode;
      this.refreshObjective();
    }
    this.walkObjective(mode);
  }

  private walkObjective(mode: GuideMode) {
    const tgt = this.objectiveTarget(mode);
    if (tgt) {
      if (this.modes.owns("surf")) this.modes.exit(true);
      this.startWalk(tgt.x, tgt.z, tgt);
    }
    else {
      if (this.guidedWalk) this.stopAutoWalk();
      if (mode === "objective") useStore.getState().toast({ kind: "info", title: L("Ši užduotis atliekama telefonu"), body: L("Atidaryk telefoną (P) ir paskambink.") });
    }
  }

  // ------------------------------------------------------------------ interaction

  interact() {
    if (this.rides.water?.returning || this.rides.water?.owns(this.rides.riding)) {
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
    if (n.kind === "ride") { const r = this.rides.find(n.id); if (r) this.boardRide(r); }
    else if (n.kind === "climb") this.climbOut();
    else if (n.kind === "mode") this.modeStart(n.id);
    else if (n.kind === "npc") this.talkTo(n.id);
    else if (n.kind === "staff") this.staffSays(+n.id);
    else if (n.kind === "glyph") this.cave?.open(n.id);
    else if (n.kind === "tree") this.talkToTree();
    else if (n.kind === "door") this.enterDoor(n.id);
    else if (n.kind === "exit") this.exitInterior(this.wild ? n.id : undefined);
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
    if (loc === CAVE_ZONE) { this.enterCave(this.nearWay ?? "boca"); return; }
    if (!getInterior(loc)) return;
    this.enterZone(loc, undefined, false, "in");
  }

  /** Into the grotto by one of its ways (cave/grounds.ts): where that way comes out inside, dropped from above if it is
   *  the sinkhole. */
  private enterCave(wayId: string) {
    if (this.transitioning || this.caveLoading || !caveWays().some((w) => w.id === wayId)) return;
    const sp = SPAWNS[wayId];
    this.caveVia = wayId;
    this.dropIn = sp.drop ?? 0;
    const st = useStore.getState();
    for (const t of st.toasts) if (this.caveHints.includes(t.title)) st.dismissToast(t.id);
    this.caveHints = [];
    this.enterZone(CAVE_ZONE, { x: sp.x, z: sp.z, rot: sp.rot }, false, "in");
  }

  exitInterior(exitId?: string, onward = this.autoTarget?.onward) {
    if (!this.zone.interior) return;
    const onEntered = onward ? () => this.guideToPlace(onward) : undefined;
    const loc = this.zone.id;
    // (the grotto is left where one went in: its water comes up at the cave's mouth, its cleft at La Grieta; gone in
    // by the sinkhole, the water brings one up beside it, in the cenote)
    if (this.wild) {
      const id = exitId ?? this.wild.exits[0].id, W = caveWays();
      const way = W.find((w) => w.id === this.caveVia && w.exit === id) ?? W.find((w) => w.exit === id) ?? W[0];
      this.enterZone("town", way.out, false, undefined, onEntered);
      return;
    }
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
    if (this.session?.active || this.poolCompanion(npc)) return;
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
      useStore.getState().toast({ kind: "info", title: def ? L("{name}: „Hi there!“", { name: def.name }) : "Hi!",
        body: mainNpc ? L("Pirmiausia pasikalbėk su {main} – {name} prisijungs prie pokalbio.", { main: mainNpc.name, name: def?.name ?? L("šis žmogus") }) : L("Šis žmogus kol kas tik pasisveikina.") });
      return;
    }
    const actor = this.npcs.find((n) => n.id === npc) ?? null;
    this.requestConversation(sit.id, actor);
  }

  private scenarioArrival(sit?: SituationMeta) {
    if (!sit || isCall(sit)) return;
    const npc = sit.npc === "sam" || sit.npc === "emma" ? this.chosenDatePartner() : sit.npc;
    const kind = LOCATIONS[sit.location]?.kind;
    const outside = OUTDOOR_NPCS.find((n) => n.npc === npc);
    const hasRoom = kind === "interior" || (kind === "outdoor" && !outside
      && THEME.roomNpcs[sit.location]?.some((n) => n.npc === npc));
    const interior = !isTownQuest(sit.id) && sit.id !== POOL_SITUATION && hasRoom
      ? getInterior(sit.location) : null;
    const spot = interior ? interior.npcs.find((n) => n.npc === npc) : outside;
    const spawn = !spot ? undefined
      : spot.ax !== undefined && spot.az !== undefined ? { x: spot.ax, z: spot.az, rot: Math.atan2(spot.x - spot.ax, spot.z - spot.az) }
      : inFrontOf(spot.x, spot.z, spot.rot, interior ? ("sit" in spot && spot.sit ? 1.9 : 2.3) : 2.2);
    return { npc, zone: interior ? sit.location : "town", spawn };
  }

  /** Situation picker: take the player to the scene card, in front of the NPC or in a call. */
  startScenario(sitId: string, alreadyPlaced = false) {
    const sit = SITUATION_BY_ID[sitId];
    if (!sit || this.disposed || this.enteringFirstExterior) return;
    const st = useStore.getState();
    st.setHud({ panel: null });
    this.modes.exit(true);
    this.lastScenario = sitId;
    prefetchSituations([sitId]);
    const go = () => {
      const arrival = this.scenarioArrival(sit);
      if (!arrival) {
        // A link can open a call on the first visit before the flyover has landed.
        if (this.flight) this.enterZone("airport", ARRIVAL, true);
        this.call(sitId);
        return;
      }
      const talk = () => {
        if (sitId === CENOTE_TOUR?.id) this.cenoteTour?.updateGuide();
        this.afterSceneDelay(() => this.talkTo(arrival.npc, sitId), 150);
      };
      if (alreadyPlaced) talk();
      else this.enterZone(arrival.zone, arrival.spawn, true, undefined, talk);
    };
    // "Dar kartą" / "Kita situacija" after a taxi, bus or plane ride was queued: no ride (and no
    // teleport or black fade in the middle of the new conversation). Before close(), which runs endSession.
    this.cancelRide();
    this.phone.dismiss();
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
    const list = ORDERED_ROUTE;
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

  /** The grotto's great tree speaks (x04-yaxche; cave/quest.ts says when: the heart found, the learner on its
   *  island). Nobody stands for the tree: its conversation has no figure, and the camera is put on the tree itself. */
  private talkToTree() {
    if (this.session?.active || this.transitioning || !this.cave || !this.wild || useStore.getState().hud.glyph) return;
    whenLoaded(CAVE_TREE, (def) => { this.startSession(def, null); this.aimTree(); }, () => !this.session?.active && !!this.cave && !this.transitioning);
  }

  /** The camera for the tree's conversation: from behind the learner and to one side, out over the lake, looking up
   *  the trunk into the low boughs and their flowers, from where the grotto's own space is open.
   *  The learner turns to the tree. */
  private aimTree() {
    const wild = this.wild;
    if (!wild) return;
    const t = CAVE_TREE_AT, p = this.player.root.position;
    const dir = new THREE.Vector3(t.x - p.x, 0, t.z - p.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();
    this.heading = Math.atan2(dir.x, dir.z);
    this.player.setAnim("idle");
    // (a wide screen shows the trunk from the learner at its foot up into the low flowers; an upright phone's strip of a
    // picture, a narrow look up the trunk into the boughs and the hanging flowers)
    const upright = this.container.clientWidth <= 900 && this.container.clientHeight > this.container.clientWidth;
    const side = new THREE.Vector3(dir.z, 0, -dir.x), look = new THREE.Vector3(t.x, upright ? 6 : 3.6, t.z), head = new THREE.Vector3(p.x, p.y + 1.5, p.z);
    let best: THREE.Vector3 | null = null;
    // (the side the camera is on now first: the short way round)
    const now = Math.sign((this.rig.cam.position.x - p.x) * side.x + (this.rig.cam.position.z - p.z) * side.z) || 1;
    search: for (const back of upright ? [9.5, 8, 6.5, 5] : [7.5, 6.5, 5.5, 4.5]) for (const s of [now, -now]) for (const off of upright ? [1.3, 0.8] : [2.6, 1.8, 1.1]) {
      const pos = new THREE.Vector3(p.x, 0, p.z).addScaledVector(dir, -back).addScaledVector(side, s * off).setY(p.y + 2.3 + back * 0.08);
      if (wild.space.inside(pos) || wild.space.free(pos, head) < 0.999 || wild.space.free(pos, look) < 0.6) continue;
      best = pos;
      break search;
    }
    this.rig.talk = { pos: best ?? new THREE.Vector3(p.x, p.y + 2.4, p.z).addScaledVector(dir, -3.2), look };
    this.talkTree = true;
    this.rig.mode = "talk";
  }

  private requestConversation(sitId: string, actor: NpcActor | null, fromCard = false) {
    const zone = this.zone;
    if (actor) void loadTalkFraming();
    this.quests.stopReplay();
    this.conversationLoads++;
    this.observeStreetAndPhone();
    let opened = false;
    whenLoaded(sitId, (def) => {
      this.startSession(def, actor, fromCard && sitId === "p24-flood" ? FLOOD_INCOMING_INTRO : undefined);
      opened = true;
    }, () => !this.disposed && !this.enteringFirstExterior && !this.session?.active
      && (!actor || (this.zone === zone && this.npcs.includes(actor))), () => {
      if (this.disposed) return;
      this.conversationLoads--;
      if (fromCard && !opened) this.phone.markMissed(sitId);
    });
  }

  private phoneSnapshot(): PhoneSnapshot {
    const st = useStore.getState(), hud = st.hud;
    const p = this.player?.root.position;
    const atCenote = p && cenoteGrounds && !this.zone?.interior && p.x >= cenoteGrounds.minX && p.x <= cenoteGrounds.maxX
      && p.z >= cenoteGrounds.minZ && p.z <= cenoteGrounds.maxZ;
    const caveWalk = this.guidedWalk === "cave" || this.autoTarget?.kind === "cave-entry";
    return {
      town: !this.disposed && st.screen === "play" && st.settings.play === "town",
      onFoot: !!p && !this.rides?.riding && !this.swimming && !this.cave && !this.wild && !caveWalk && !atCenote && !(EDITION.id === "es" && this.wet),
      grounded: !this.hop.air && !this.aloft,
      visible: !document.hidden,
      enabled: st.settings.phoneCalls,
      conversation: !!this.session?.active || st.conv.active,
      panel: !!hud.panel,
      dialog: !!hud.glyph || radio.store.getState().open || (this.debugAudio && audioDiagnosticsPaused()),
      guide: !!hud.coach && !hud.phoneCard,
      banner: !!hud.zoneBanner,
      cardOpen: !!hud.phoneCard,
      streetBlocked: this.streetLife?.blocksPhone,
      flight: !!this.flight || hud.flight,
      loading: !!this.caveLoading || this.conversationLoads > 0 || this.sceneDelays.size > 0,
      transition: this.transitioning || !!hud.fade || this.rideTimer !== undefined,
      mode: this.modes.engaged || this.modes.hasQueued || !!hud.modeScreen,
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
  textsDueNow() { if (import.meta.env.DEV) this.phone.texts.dueNow(); }
  textsState() { return this.phone.textsState(); }

  private reactionsBlocked() {
    const s = this.phoneSnapshot();
    return this.zone?.id !== "town" || !s.town || !s.visible || s.conversation || s.panel || s.dialog ||
      s.cardOpen || s.flight || s.loading || s.transition || s.mode || this.rig.mode === "talk" ||
      inTownRuins(this.player.root.position);
  }

  react(kind: ReactKind, { force = false } = {}) {
    if (!import.meta.env.DEV || !this.player) return false;
    const { x, z } = this.player.root.position;
    return this.reactions.debug(kind, this.ambient, this.rides, x, z, force);
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

  private cancelCabinetDrive() {
    if (useArcade.getState().playing === "road" && this.modes.owns("road")) this.modes.exit(true);
  }

  private phoneVisibility = () => {
    if (document.hidden) this.cancelCabinetDrive();
    this.wasHidden = true;
    this.reactions.observe(!!this.session?.active || useStore.getState().conv.active);
    this.observeStreetAndPhone();
  };

  private phonePageHide = () => {
    this.reactions.clear();
    if (this.rides?.riding?.kind === "boat" || this.rides?.water?.safeSave() || this.cenoteTour?.active) this.savePlace();
    this.phone.dismiss();
    if (useStore.getState().progress.phone) {
      useStore.getState().updateProgress((p) => this.phone.saveClock(p));
    }
  };

  private startSession(sit: SituationDef, actor: NpcActor | null, introOverride?: string) {
    this.pad?.cancel();
    this.greeting?.release(0);
    this.naturalView?.stop();
    this.naturalView = undefined;
    this.modes.exit(true);
    this.keepsake.clear();
    this.cancelRide();
    // a hop ends at once, and the player's own walk gives way to the conversation's stop (as it always was)
    this.hop.land(this.hop.ground); this.applyHop();
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.fader.reset();
    CUT.r.value = 0;
    this.stopAutoWalk(); this.keys.clear(); this.joy = { x: 0, y: 0 };
    this.talkNpc = actor;
    coach.did("talk");
    const st = useStore.getState();
    st.setHud({ prompt: null, panel: null });
    if (actor) {
      // face each other (both turn in a moment: updatePlayer and updateNpcs); the camera on the person spoken with,
      // and then on whoever else taking part speaks, if they stand nearby (Mark at the party, Nora at dinner…): aimTalk
      const reach = THEME.talkCamera?.reach ?? 7, a = actor.ch.root.position;
      this.talkCast = [actor, ...(sit.npcs ?? []).map((id) => this.npcs.find((n) => n.id === id)).filter((n): n is NpcActor => !!n && n !== actor && n.ch.root.position.distanceTo(a) < reach)];
      this.aimTalk(actor);
      this.rig.mode = "talk";
      this.player.setAnim("idle");
    }
    const autoHandoff = sit.id === POOL_SITUATION || this.cenoteTour?.chat(sit.id);
    const session: Session = new Session(sit.id, {
      recordedOnly: autoHandoff,
      autoClose: autoHandoff ? () => this.modes.hasQueued : undefined,
      npcTalk: (id) => {
        if (this.session !== session || this.rig.mode !== "talk") return;
        const speaker = this.talkCast.find((n) => n.id === id);
        if (speaker) this.aimTalk(speaker);
      },
      npcVoice: actor && !isCall(sit) ? (id, line, replay) =>
        !this.disposed && this.session === session && session.active && this.rig.mode === "talk"
          ? talkVoice(this.talkCast, this.npcs, this.npcLayer, id, line, replay) : undefined : undefined,
      npcReact: (id, kind, repeat) => { if (this.session === session) this.naturalView?.feedback(id, repeat ? "repeat" : kind); },
      // ignore events from a conversation already closed (e.g. Esc during the driver's goodbye):
      // its "taxi-ride" would otherwise be queued for the next, unrelated conversation
      onEvent: (name, data) => { if (this.session === session) this.onSessionEvent(name, data); },
      onEnd: (s, completed) => this.endSession(s, completed),
    }, introOverride);
    this.session = session;
    this.session.begin();
    if (actor) this.startTalkCamera(session, actor);
  }

  private startTalkCamera(session: Session, host: NpcActor) {
    const zone = this.zone, people = this.npcs, { run, sitId, hostId } = useStore.getState().conv;
    const hasArt = !!sceneFor(sitId, hostId);
    const live = () => {
      const { conv } = useStore.getState();
      return !this.disposed && this.session === session && session.active && conv.active && conv.run === run
        && this.zone === zone && this.talkNpc === host && this.rig.mode === "talk";
    };
    const valid = (speaker: NpcActor) => live() && this.talkSpeaker === speaker && this.npcs.includes(speaker);
    void loadTalkFraming().then((module) => {
      const speaker = this.talkSpeaker;
      if (!module || !speaker || !valid(speaker)) return;
      this.talkCamera = new module.TalkPresentation(this.renderer.domElement, this.rig, speaker,
        (to) => to === this.talkSpeaker && valid(this.talkSpeaker), hasArt, () => ({
          learner: this.player, people: [...this.npcs.map((n) => n.ch), ...this.extras], cast: this.talkCast,
          scene: this.scene, room: zone.interior, wild: zone.interior?.wild?.space,
          field: zone.interior ? undefined : this.field, max: THEME.talkCamera?.max ?? 30,
        }), () => this.transitioning || (hasArt && picturesOn(useStore.getState().settings)));
      if (!isCall(session.sit)) this.naturalView = module.bindTownTalk({
        run, zone, host, cast: this.talkCast, people, player: this.player, audio,
        authoredCast: session.sit.npcs, extras: this.extras, layer: this.npcLayer, work: AT_WORK,
        speaker: () => this.npcs === people && live() ? this.talkSpeaker : null,
        mode: () => this.modes.active,
      }, hasArt, () => !!this.talkCamera?.layout && !!this.rig.talk && !this.covered, () => this.transitioning);
    });
  }

  private stopTalkCamera(release = false) {
    if (!this.naturalView?.stop(release)) this.naturalView = undefined;
    this.talkCamera?.dispose();
    this.talkCamera = undefined;
    this.talkSpeaker = null;
  }

  private aimTalk(to: NpcActor) {
    if (this.talkSpeaker === to || !this.talkCast.includes(to) || !this.npcs.includes(to)) return;
    this.talkSpeaker = to;
    const p = this.player.root.position, a = to.ch.root.position;
    if (Math.hypot(a.x - p.x, a.z - p.z) > 0.1) this.heading = Math.atan2(a.x - p.x, a.z - p.z);
    this.talkCamera?.aim(to);
    this.naturalView?.aim(to.id);
  }

  private onSessionEvent(name: string, data: any) {
    showConversationEvent(name, data);
    if (name === "pay") audio.sfx("coin");
    if (name === "taxi-ride" && data?.to) this.pendingRide = { to: data.to, by: "taxi" };
    if (name === "bus-ride" && data?.to) this.pendingRide = { to: data.to, by: "bus" };
    if (name === "go" && data?.zone) this.pendingRide = { to: data.zone, by: "taxi" };
    if (name === "board") this.pendingRide = { to: "airport", by: "plane" };
    // (an alux of the grotto lets the learner pass: their gate opens, src/game/cave)
    if (name === "alux-pass" && data?.gate) this.cave?.pass(data.gate);
    // (the grotto's great tree has said what it had to say: the stones speak again)
    if (name === "tree-heard") this.cave?.treeHeard();
    // "¿Probamos una ola?": remember the level for the end card's surf lesson button.
    if (name === "surf" && this.surf) this.pendingSurf = { data };
    else this.modes.event(name, data);
    const st = useStore.getState();
    if (name === "give" && data?.item) {
      // known props, else the situation's own item (a jacket, a medicine…) in the accusative
      const it = givenItem(this.session?.sit, data.item);
      st.toast({ kind: "success", title: `${it[0]} ${L("Gavai: {item}", { item: it[1] })}`, ms: 2600 });
    }
    if ((name === "mark-map" || name === "mark-location") && data?.to && LOCATIONS[data.to]) {
      st.toast({ kind: "info", title: `📍 ${L("Pažymėta žemėlapyje: {place}", { place: LOCATIONS[data.to].lt })}`, body: L("Žemėlapis – M."), ms: 4000 });
    }
    if (name === "sign") st.toast({ kind: "success", title: "✍️ " + L("Pasirašyta"), ms: 2200 });
  }
  private pendingRide: { to: string; by: "taxi" | "bus" | "plane" } | null = null;

  private endSession(sit: SituationDef, completed: boolean) {
    const reducedMotion = this.talkCamera?.reducedMotion;
    this.session = null;
    this.stopTalkCamera(true);
    useStore.getState().setConv({ active: false });
    this.rig.talk = null;
    this.talkTree = false;
    this.talkCast = [];
    this.player.root.visible = true;
    this.rig.mode = this.room ? "interior" : "follow";
    this.rig.cam.clearViewOffset();
    if (reducedMotion) this.rig.snap();
    // the person stays turned to the player and turns back home in their own time (updateNpcs)
    this.talkNpc = null;
    if (completed && !this.swimming && !this.rides.riding && !this.modes.active && !this.modes.hasQueued) {
      const kind = keepsakeFor(sit.id);
      if (kind) this.keepsake.show(this.player.rightHand, kind);
    }
    if (this.pendingRide) { const r = this.pendingRide; this.pendingRide = null; this.ride(r.to, r.by); }
    this.pendingSurf = null;
    this.modes.launchQueued();
    // (a conversation off the route, the grotto's aluxes, is nobody's task: the tasks stay as they were)
    if (completed && !sit.bonus) this.advanceObjective(sit);
    // (someone who has found the grotto hears when the town's conversations have woken another of its chambers)
    if (completed && !sit.bonus && caveWays().length) {
      const pr = useStore.getState().progress, n = ROUTE.filter((q) => sitProgress(pr, q.id).completions > 0).length;
      // (and someone who has not, a rumor, once: after their tenth conversation)
      if (!pr.cave?.seen && n === 10 && sitProgress(pr, sit.id).completions === 1) setTimeout(() => useStore.getState().toast({ kind: "tip", title: L("Sako, kad Ka'an cenotės oloje kažkas švyti…"), body: L("Cenotė – miestelio vakaruose, už apžvalgos aikštelės. Nuplauk pažiūrėti."), ms: 9000 }), 4200);
    }
    this.refreshObjective();
  }

  closeConversation() { this.session?.close(); }
  modeOffer(sitId: string) { return this.modes.offer(sitId); }
  modeFromConversation(id: string) {
    if (!this.modes.queue(id)) return;
    if (id === "surf" && this.pendingSurf) this.modes.event(id, this.pendingSurf.data);
    this.pendingRide = null;
    if (this.session?.active) this.session.close(); else this.modes.launchQueued();
  }
  modeExit() { this.modes.exit(); }
  modeAction(id: string, name: string, value?: string | boolean) {
    if (this.transitioning || useStore.getState().hud.panel) return;
    if (id === "directions") { this.quests.directionAction(name); return; }
    const mode = this.modes.active ?? (id === "barista" && this.modes.owns(id) ? this.modes.get(id) : null);
    if (mode?.id === id) {
      if (id === "road" && name === "guide") this.arcade?.forgetReturn();
      mode.action?.(name, value);
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
  debugLoteria() {
    if (!import.meta.env.DEV) return undefined;
    const mode = this.modes.get("loteria") as LoteriaMode | undefined;
    if (!mode) return undefined;
    return {
      stage: (seed = 1, speed = 1) => {
        if (this.transitioning || this.modes.engaged || this.session?.active) return false;
        useStore.getState().setHud({ panel: null });
        this.enterZone("town", LOTERIA_APPROACH, true, undefined, () => mode.debug(seed, speed));
        return true;
      },
      state: () => mode.state(),
    };
  }
  get activeSession() { return this.session; }

  /** Taxi or bus: fade, travel, arrive in front of the destination. After boarding a plane the
   *  trip is over and the player is back outside the airport. */
  ride(to: string, by: "taxi" | "bus" | "plane" = "taxi") {
    if (this.disposed || this.transitioning) return;
    const st = useStore.getState();
    const dest = by === "plane" ? AIRPORT_EXIT : this.arrivalPoint(to);
    if (!dest) return;
    this.keepsake.clear();
    const banner = by === "plane" ? { title: "✈️ " + L("Gero skrydžio!"), sub: L("…ir sveiki sugrįžę į Maple Harbor") }
      : { title: by === "bus" ? "🚌 " + L("Važiuojame autobusu…") : "🚕 " + L("Važiuojame…"), sub: LOCATIONS[to]?.name };
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
    // (and a surf lesson the conversation asked for: another conversation was picked instead)
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
    if (this.cenoteTour && loc === CENOTE_TOUR?.location) return this.cenoteTour.home;
    const o = OUTDOOR_NPCS.find((n) => this.sitsForNpc(n.npc).some((s) => s.location === loc));
    return o ? { x: o.ax ?? o.x, z: (o.az ?? o.z) + 2.5, rot: Math.PI } : null;
  }

  private visitArcadeGame(id: TownGame) {
    switch (id) {
      case "barista":
        if (this.barista?.available()) this.enterZone(BARISTA_CONVERSATION.location, BARISTA_PROMPT);
        else this.visitArcadeHost(BARISTA_CONVERSATION.situation);
        break;
      case "photowalk": this.visitArcadeHost(PHOTO_WALK_SITUATION); break;
      case "gym": this.enterZone(GYM_ENTRY.location, { ...GYM_MAT, rot: Math.PI / 2 }); break;
      case "surf": if (SURF_SPOT) this.enterZone("town", SURF_SPOT.start); break;
      case "taxi": this.enterZone("town", TAXI_APPROACH); break;
      case "loteria": this.enterZone("town", LOTERIA_APPROACH); break;
      case "pool": {
        const spot = sitProgress(useStore.getState().progress, POOL_SITUATION).completions ? POOL_CIRCLE.learner : POOL_TALK;
        this.enterZone("town", { ...spot, rot: Math.PI });
        break;
      }
      case "sea": {
        const beach = this.rides.find("playa")!.home;
        const shore = inFrontOf(beach.x, beach.z, beach.rot + Math.PI, BOAT.half + 0.7);
        this.enterZone("town", this.rides.boatApproach(shore.x, shore.z) ?? shore);
        break;
      }
    }
  }

  private visitArcadeHost(situation: string) {
    const arrival = this.scenarioArrival(SITUATION_BY_ID[situation]);
    if (arrival?.spawn) this.enterZone(arrival.zone, arrival.spawn);
  }

  teleportTo(loc: string) {
    const dest = this.arrivalPoint(loc);
    if (dest) { this.modes.exit(true); this.enterZone("town", dest); }
  }

  // ------------------------------------------------------------------ objectives

  orderedSituations(): SituationMeta[] {
    return pickerSituations();
  }

  guideToPoolHall() { this.guideToPlace(BILLIARDS_PLACE); }

  guideToPlace(place: WalkPlace) {
    if (this.rides.riding || this.modes.active) return;
    if (this.zone.id === place) {
      if (place === GYM_ENTRY.location) this.walkTo(GYM_MAT.x, GYM_MAT.z, { kind: "point" });
      return;
    }
    const door = this.town.doors.find((d) => d.loc === place);
    if (!door) return;
    if (!this.zone.interior) {
      this.walkTo(door.outX, door.outZ, { kind: "point" });
    } else if (this.wild) {
      const saved = useStore.getState().progress.cave ?? emptyCave();
      const exit = this.caveExitTarget(saved);
      this.walkTo(exit.x, exit.z, exit.kind === "exit" ? { ...exit, onward: place } : { kind: "point" });
    } else {
      const { x, z } = this.zone.interior.exit;
      this.walkTo(x, z - 0.6, { kind: "exit", onward: place });
    }
  }

  setObjective(sitId: string | null) {
    if (this.guidedWalk) this.stopAutoWalk();
    this.caveGuideMode = "objective";
    useStore.getState().updateProgress((p) => { p.objective = sitId; });
    this.refreshObjective();
  }

  private advanceObjective(done: SituationDef) {
    const pr = useStore.getState().progress;
    if (pr.objective && pr.objective !== done.id) return;
    const next = ORDERED_ROUTE.find((s) => !sitProgress(pr, s.id).completions);
    this.setObjective(next?.id ?? null);
    // (in the situation picker flow the end-of-conversation buttons offer the next one instead)
    if (next && !this.lastScenario) setTimeout(() => useStore.getState().toast({ kind: "info", sitId: next.id, title: L("Kita užduotis"), body: `${next.title.lt} — ${LOCATIONS[next.location]?.lt ?? ""}` }), 2500);
  }

  currentObjective(): SituationMeta | null {
    const pr = useStore.getState().progress;
    if (pr.objective && SITUATION_BY_ID[pr.objective]) return SITUATION_BY_ID[pr.objective];
    const first = ORDERED_ROUTE.find((s) => !sitProgress(pr, s.id).completions) ?? null;
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
      // Puerto Colibrí's learner table arrives with s83, including after loading a saved invitation.
      const lines = EDITION.id === "es" ? loadSituation("s83-invite-call") : undefined;
      void Promise.all([import("./phone/meeting"), lines]).then(([{ FriendMeeting }]) => {
        if (this.disposed) return;
        const mode = this.meeting = new FriendMeeting(this.modeHost, this.town, () => this.refreshObjective());
        this.modes.register(mode);
      }, (error) => console.warn("Friend meeting unavailable", error));
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

  private caveExitTarget(saved: CaveSave): GuideTarget {
    const exits = this.wild!.exits;
    const exit = exits.find((e) => e.id === "grieta") ?? exits[0];
    return this.caveCode?.caveGateTarget(this.player.root.position, exit, saved, this.cave?.seeAll) ?? { ...exit, kind: "exit" };
  }

  /** The destination of the current leg, or the saved task's exterior target for the town map. Cave prerequisites use
   *  the same route for the arrow, beacon and walk. */
  objectiveTarget(mode: GuideMode = "objective", townMap = false): GuideTarget | null {
    const task = mode === "objective" ? this.phoneTask() : null;
    const sit = this.currentObjective();
    const p = this.player.root.position;
    const loc = sit && LOCATIONS[sit.location];
    const interior = townMap ? undefined : this.zone.interior;
    const saved = !townMap && this.cave ? useStore.getState().progress.cave ?? emptyCave() : null;
    const all = this.cave?.seeAll;
    const stayInCave = mode === "cave" || (!task && sit?.location === CAVE_ZONE);
    if (this.cave && saved && mode === "cave") {
      const next = this.cave.guide(p);
      return next && (this.caveCode?.caveGateTarget(p, next, saved, all) ?? next);
    }
    if (mode === "objective" && !task && (!sit || !loc || isCall(sit))) return null;
    if (saved && !stayInCave) return this.caveExitTarget(saved);
    if (stayInCave && !interior) {
      const way = preferredCaveEntry();
      if (!way) return null;
      const stand = way.id === "grieta" ? way.out : way;
      return { kind: "cave-entry", id: way.id, x: stand.x, z: stand.z, person: way };
    }
    const exit = interior ? { kind: "exit" as const, x: interior.exit.x, z: interior.exit.z - 0.4 } : null;
    if (task) {
      if (!townMap && this.zone.id === "office" && task.loc === "office") {
        const kate = this.npcs.find((npc) => npc.id === "kate");
        return kate ? { kind: "point", x: kate.home.x, z: kate.home.z } : null;
      }
      if (exit) return exit;
      const point = this.arrivalPoint(task.loc);
      return point ? { kind: "point", x: point.x, z: point.z } : null;
    }
    // An outdoor place can have a room inside it, where the person is found through the door.
    if (!sit || !loc || mode === "cave") return exit;
    const outside = loc.kind === "outdoor" || isTownQuest(sit.id) || sit.id === POOL_SITUATION ? OUTDOOR_NPCS.find((n) => n.npc === sit.npc) : undefined;
    if (outside) return exit ?? { kind: "npc", id: sit.npc, ...talkAt(outside) };
    if (loc.kind === "outdoor" && !THEME.roomNpcs[sit.location]?.some((n) => n.npc === sit.npc)) return null;
    if (this.zone.id === sit.location && interior) {
      const npc = sit.npc === "sam" || sit.npc === "emma" ? this.chosenDatePartner() : sit.npc;
      const npcs = interior.npcs;
      const spot = npcs.find((n) => n.npc === npc) ?? npcs[0];
      if (!spot) return null;
      const target = { kind: "npc" as const, id: spot.npc, ...talkAt(spot) };
      return (saved && this.caveCode?.caveGateTarget(p, target, saved, all)) || target;
    }
    if (exit) return exit;
    if (sit.location === "airport") return { kind: "door", id: "airport", x: AIRPORT_EXIT.x, z: AIRPORT_EXIT.z };
    const d = this.town.doors.find((dd) => dd.loc === sit.location);
    return d ? { kind: "door", id: d.loc, x: d.outX, z: d.outZ } : null;
  }

  private guidanceTarget() {
    // A requested cave quest walk keeps its own route while it is in progress.
    const mode = this.phoneTask() && this.guidedWalk !== "cave" ? "objective" : this.caveGuideMode;
    return this.objectiveTarget(mode);
  }

  private routeVisualTarget() {
    const target = this.autoTarget;
    return target?.directions && this.zone.id === "town"
      ? directionsTarget(this.autoPath, target, useTownQuests.getState().directions) : null;
  }

  refreshObjective() {
    // (the talk spots marked all the time, in the town: theme.ts `talkMarks`)
    this.guidance.setMarks(this.zone?.interior ? [] : THEME.talkMarks.flatMap((id) => { const o = OUTDOOR_NPCS.find((n) => n.npc === id); return o ? [talkAt(o)] : []; }));
    const sit = this.currentObjective();
    const st = useStore.getState();
    const task = this.phoneTask();
    if (task) {
      st.setHud({ objective: { followUp: true, targetLoc: task.loc, sitId: task.id, title: task.title, goal: "", where: LOCATIONS[task.loc].lt, dist: null, angle: null, inside: this.zone.id === task.loc } });
      this.showBeacon(this.guidanceTarget());
      this.pathT = 0;
      return;
    }
    if (!this.cave && this.caveGuideMode === "cave") {
      st.setHud({ objective: { sitId: CAVE_ZONE, title: LOCATIONS[CAVE_ZONE].name, goal: "", where: "", dist: null, angle: null, inside: false } });
      this.showBeacon(this.guidanceTarget());
      this.pathT = 0;
      return;
    }
    if (!sit) {
      st.setHud({ objective: null });
      this.showBeacon(this.guidanceTarget());
      this.guidance.setPath(null);
      this.pathT = 0;
      return;
    }
    const loc = LOCATIONS[sit.location];
    const tgt = this.guidanceTarget();
    st.setHud({ objective: { sitId: sit.id, title: sit.title.lt, goal: sit.goal, where: loc?.lt ?? "", dist: null, angle: null, inside: this.zone.id === sit.location } });
    this.showBeacon(tgt);
    this.pathT = 0;
  }

  /** The beacon over the objective's door or person; for someone talked to across a counter (a spot of their own), it
   *  stays over them and its ring lies on that spot, where the trail ends. */
  private showBeacon(tgt: ReturnType<Game["objectiveTarget"]>, hideBeam = false) {
    if (!tgt) { this.guidance.setBeacon(null); return; }
    const over = tgt.person ?? tgt;
    this.guidance.setBeacon(over.x, over.z, this.cave ? 1.8 : tgt.kind === "npc" ? 2.9 : 3.8,
      tgt.person ? { x: tgt.x, z: tgt.z } : undefined, hideBeam || !!this.cave);
  }

  // ------------------------------------------------------------------ loop

  private onResize = () => { if (!this.disposed) this.syncSize(); };

  private syncSize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w <= 0 || h <= 0 || (w === this.screenW && h === this.screenH)) return;
    if (!this.modes.owns("road")) this.speedFeel?.clearPose();
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

  /** How short an upright phone is for the taxi's greeting shot (0 at 844 px and taller, 1 at 664 px and shorter): Don
   *  Rigo's words with their glosses fill the top, the stick and the brake the bottom, so the shot widens and sits
   *  lower to keep the whole taxi between them. */
  private shortGreeting(w: number, h: number) {
    return this.sidewaysPhone || h <= w ? 0 : THREE.MathUtils.clamp((844 - h) / 180, 0, 1);
  }

  private applyWalkingViewShift(w: number, h: number, talking: boolean, greetingLift = 0) {
    const stageShift = this.rig.mode === "stage" ? this.rig.stage?.shiftY : undefined;
    const walkingLens = this.rig.mode === "follow" || this.rig.mode === "interior";
    const uprightShift = this.rig.mode !== "talk" && h > w * 1.15 ? (this.rig.mode === "follow" ? 0.12 : 0.1) : 0;
    const corner = this.rig.mode === "interior" ? this.rig.cabinetCornerFrame() : 0;
    const shift = this.sidewaysPhone && walkingLens && !talking ? 0.1 : uprightShift - 0.13 * corner;
    // (the taxi's greeting lift eases toward a higher shot; 0 keeps the plain walking shift)
    // (sideways the stick and the brake keep to the sides: the taxi goes lower, under Don Rigo's words)
    const lifted = this.sidewaysPhone ? -0.05 : 0.14 - 0.075 * this.shortGreeting(w, h);
    const viewShift = greetingLift ? THREE.MathUtils.lerp(-shift, lifted, greetingLift) : -shift;
    this.rig.applyViewShift(w, h, 0, h * (stageShift ?? viewShift));
  }

  private updateViewLights() {
    const p = this.player.root.position;
    this.sun.position.set(p.x - 40, 70, p.z + 30);
    this.sun.target.position.set(p.x, 0, p.z);
    this.fx?.frame(p, !!this.zone.interior);
    this.sky.position.copy(this.rig.cam.position);
  }

  private drawTown() {
    this.rides.water?.cameraFloor(this.rig.cam.position, this.t);
    this.renderer.render(this.scene, this.rig.cam);
    if (!this.wasHidden) this.rides.water?.presented();
    this.presentWorld("town");
    if (!this.zone.interior && this.firstExteriorAt === undefined) {
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
    const dt = this.sea?.handingOff ? 0 : Math.min(0.05, elapsed);
    this.t += dt;
    this.pad?.tick(dt);
    if (this.seaReturnView) Object.assign(this.rig.cam, this.seaReturnView.live);
    if (this.frameFade.active) {
      this.frameFade.update(dt);
      this.transitioning = this.frameFade.active;
    }
    const st = useStore.getState();
    const talking = !!this.session?.active;
    const mode = this.modes.active;
    if (this.naturalView && !this.naturalView.update(st.conv, dt)) this.naturalView = undefined;
    this.reactions.observe(talking || st.conv.active);
    if (this.flight && this.rig.stage) {
      // the first visit's flight over the town: the camera along its path, and down to the airport at its end
      this.flight.t += dt;
      flightAt(THEME.flyover, this.flight.t / FLIGHT_SECONDS, this.rig.stage.pos, this.rig.stage.look);
      if (this.flight.t >= FLIGHT_SECONDS) this.endFlight();
    }
    const blocked = talking || !!st.hud.panel || !!st.hud.glyph || this.transitioning || !!this.caveLoading || this.modes.modal || !!this.flight;
    this.greeting?.pause(blocked || document.hidden);
    const support = this.updatePlayer(dt, blocked, this.transitioning && !this.frameFade.active && !talking && !st.hud.panel && !st.hud.glyph && !mode);
    this.rides.water?.learnerFace(this.player, this.t);
    if (!blocked) this.checkRoadEntry();

    const phoneState = this.phoneSnapshot();
    this.updatePhoneTasks(dt, phoneState);
    // Do not count the gap between animation frames across a tab visibility change.
    const visibleElapsed = this.wasHidden ? 0 : elapsed;
    this.phone.tick(visibleElapsed, this.phoneSnapshot());
    this.wasHidden = document.hidden;

    // (the open road and the open sea draw their own scenes, at the size syncSize has just applied)
    const roadDrawn = this.road?.render(this.renderer, w, h);
    if (roadDrawn || this.sea?.render(this.renderer, w, h)) {
      this.streetLife.observe(this.streetSnapshot());
      this.presentWorld(roadDrawn ? "road" : "sea");
      this.sampleFps(true);
      return;
    }
    this.keepsake.tick();
    // (what one can drive: its people, the way back to its curb; at the wheel it is moved from updatePlayer)
    const riding = this.rides.riding;
    if (!riding) this.rides.update(dt, this.t, null);
    const motor = riding && this.rides.phase === "on" && !this.zone.interior && !this.modes.owns("road") ? riding.kind : null;
    const townCar = motor === "car" && this.zone.id === "town";
    const taxiDriver = townCar && this.modes.active?.townDrive === riding;
    const townDriver = townCar && (!this.modes.engaged || taxiDriver);
    const townFeedback = townDriver && !blocked && st.screen === "play" && st.settings.play === "town";
    if (townFeedback && this.speedFeel) this.speedFeel.sound();
    else {
      const released = this.speedFeel?.release();
      if (released || taxiDriver && !townFeedback) this.dust.clearRolling();
      if (!released && taxiDriver) audio.motor(null);
      else if (!townDriver && (!released || motor && mode?.id !== "taxi")) audio.motor(motor, this.rides.revs);
    }
    this.updateNpcs(dt, talking, mode ?? undefined);
    if (!this.zone.interior) {
      const driver = riding?.kind === "car" && this.rides.phase === "on" ? riding.m : undefined;
      this.ambient.update(dt, this.player.root.position, this.rig.cam.position, this.hop.y, this.hop.air, driver, !riding && !this.swimming && !this.aloft);
      if (this.trafficReplyAt !== undefined && this.t >= this.trafficReplyAt) {
        this.trafficReplyAt = undefined;
        if (driver && !blocked && this.ambient.nearbyTraffic(driver.x, driver.z, 20)) audio.sfx("hornReply");
      }
      this.rides.updateCrashes(dt);
      this.carVisuals?.update(dt);
    }
    this.town.update(this.t, dt, this.rig.cam.position);
    this.zone.interior?.update?.(this.t, dt);
    // (the grotto: its water, lights and sparks, and its stones calling)
    this.wild?.frame?.(this.t, dt, this.rig.cam, this.player.root.position, h * this.renderer.getPixelRatio());
    this.cave?.update(dt, this.player.root.position, this.rig.yaw, !this.ambienceAllowed() || this.transitioning);
    if (this.caveLure && !this.zone.interior) this.caveLure.userData.tick(this.t, this.player.root.position.x, this.player.root.position.z);
    this.modes.tick(dt, !this.zone.interior && !talking && !this.wild && !this.flight);
    this.guidance.visible = !talking && !mode && !this.flight;
    this.guidance.group.visible = this.guidance.visible;
    this.guidance.update(dt, this.wild?.floor ?? (this.zone.interior ? undefined : floorY));
    // guidance path (throttled)
    this.pathT -= dt;
    if (this.pathT <= 0 && !talking && !mode) {
      this.pathT = 0.5;
      const route = this.routeVisualTarget();
      const tgt = route ?? this.guidanceTarget();
      const p = this.player.root.position;
      if (tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) > 2.2) {
        this.guidance.setPath(route ? [[p.x, p.z], ...this.autoPath!] : this.zone.nav.path(p.x, p.z, tgt.x, tgt.z));
      }
      else this.guidance.setPath(null);
      this.showBeacon(tgt, !!route);
    }
    // camera: where the player is heading and how fast (it swings in behind them after a moment, camera.ts)
    const speed = Math.hypot(this.moveVel.x, this.moveVel.z);
    // (at a wheel the camera stays behind the car, backing up too; on an upright phone heading out over the desert
    // road's crest it swings a little toward the bend beyond, so the crest frame has sand on both sides: road/entry.ts)
    const crestAim = riding && !mode && h > w * 1.15 ? this.road?.crestAim ?? 0 : 0;
    this.crestAim = riding ? this.crestAim + (crestAim - this.crestAim) * Math.min(1, dt * 6) : 0;
    this.rig.motion.dir = riding ? this.rideCourse + this.crestAim : mode ? this.heading : speed > 0.3 ? Math.atan2(this.moveVel.x, this.moveVel.z) : this.heading;
    this.rig.motion.speed = speed;
    // (where they will be in a moment, walking on as now, out of the walls: the camera makes room before it is needed)
    this.rig.motion.next.copy(this.player.root.position).addScaledVector(this.moveVel, 0.3).setY(0);
    if (speed > 0.3) this.zone.colliders.resolve(this.rig.motion.next, 0.38, !this.zone.interior, !!this.road?.inStrip);
    this.rig.dragging = this.pointer.down && this.pointer.moved > 6;
    this.rig.hold = this.hop.air && !this.zone.interior;
    // (up with a jump by half its height: the second jump's top stays in the picture)
    this.rig.target.lerp(this.tmpV.copy(this.player.root.position).setY(this.player.root.position.y + this.hop.lift * 0.5), Math.min(1, dt * 10));
    if (mode?.camera && this.modes.active === mode) this.rig.mode = mode.camera;
    const roadAtCrest = !blocked && !mode && riding?.kind === "car" && this.rides.phase === "on" && this.road?.shouldStart(riding);
    // The live camera still has the last draw if the lazy feedback controller missed that frame.
    if (roadAtCrest && !this.speedFeel?.hasTownPose(w, h)) this.roadTownView = this.rig.cam.clone();
    // The rig can finish blending during update and still draw the final frame of the taxi shot.
    const taxiShot = this.rig.hasTaxiShot;
    const actorTalk = talking && !!this.talkNpc && this.rig.mode === "talk";
    if (actorTalk) this.talkCamera?.update(dt);
    else this.rig.update(dt, this.heading, speed > 0.7, true, (st.settings.cameraFollow || !!riding) && !this.pointer.down,
      w <= 600 && w < h && !blocked && !riding && !this.swimming && !this.zone.interior && !this.cave && !this.aloft && !this.modes.engaged);
    // The snorkel rig sees the same bay below its surface without putting the character in free-swim state.
    const tourSurface = this.cenoteTour?.surface;
    if (tourSurface != null) {
      this.undersea.update(dt, this.t, true, this.rig.cam.position, 0, tourSurface);
    } else {
      const cp = this.rig.cam.position, pp1 = this.player.root.position, sur = this.zone.interior ? null : waterY(pp1.x, pp1.z, this.t);
      const under = sur !== null && this.diveK > 0.2 && cp.y < sur - 0.1;
      if (this.swimming || this.undersea.on) this.undersea.update(dt, this.t, under, this.tmpV.set(pp1.x + Math.sin(this.heading) * 0.4, pp1.y + 1.2, pp1.z + Math.cos(this.heading) * 0.4), speed / SWIM.speed);
    }
    this.underWater(this.undersea.on);
    const sideways = this.sidewaysPhone;
    const greetingLift = mode === this.taxi && st.hud.showTouch && (sideways || w <= 600) ? this.taxi?.greetingLift ?? 0 : 0;
    // Walking, tree and mode lenses ease through the rig. Actor talk owns its validated lens. At a car's wheel in town
    // the speed feel (rides/speedFeel.ts) presents the eased lens.
    if (!actorTalk) {
      const { cam } = this.rig, follow = this.rig.mode === "follow", car = riding?.kind === "car";
      const fov = this.rig.fovFor(w, h, follow && !car && this.vel.lengthSq() > 30)
        + (follow ? (car ? 0 : this.rideFov) + greetingLift * (sideways ? 12 : 10 + 16 * this.shortGreeting(w, h)) : 0);
      const base = this.speedFeel?.baseFov ?? cam.fov, d = fov - base;
      const lens = Math.abs(d) < 0.05 ? fov : base + d * Math.min(1, dt * (this.rig.mode === "talk" ? 4.5 : 3));
      const presented = townFeedback ? this.speedFeel?.presentTown(lens, dt, this.t, follow, taxiShot) ?? lens : lens;
      if (presented !== cam.fov) {
        cam.fov = presented;
        cam.updateProjectionMatrix();
      }
    }
    // people and cars far down the street, a few pixels tall in the haze, are left out of the walking view (it is wider
    // than it was: this keeps its draw calls as they were)
    this.farCull();
    // Walking clears the player's sightline. The pool stage also clears the nearby selva from the edge of the frame.
    const pp0 = this.player.root.position;
    this.chest.set(pp0.x, 1.35, pp0.z);
    const stageClearance = this.rig.mode === "stage" && this.modes.owns("pool") ? 5.5 : 0;
    this.fader.update(dt, this.rig.cam.position, this.chest, this.rig.mode === "follow" && !this.zone.interior, stageClearance);
    // and what is too thin for either (a lamp post right in the way) is see-through along the line to the player
    CUT.a.value.copy(this.rig.cam.position);
    CUT.b.value.copy(this.chest);
    CUT.r.value = this.rig.mode === "follow" && !this.zone.interior ? 0.55 : 0;
    // Preserve the tree and mode offsets, and the lower walking composition on phones.
    if (!actorTalk) {
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
      } else if (mode?.frameStage) {
        mode.frameStage(w, h);
      } else {
        // Place the wider greeting shot between the dialogue and the touch controls.
        this.applyWalkingViewShift(w, h, talking, greetingLift);
      }
    }
    this.applySeaReturnView(dt, w, h);
    this.quests.observe(this.rig.cam);
    // Street subjects use the camera and lens that will draw this frame.
    this.streetLife.tick(dt, this.streetSnapshot(), visibleElapsed);
    this.updateViewLights();
    // an illustrated scene covers the view during the conversation: save the phone's battery
    const covered = this.covered = talking && picturesOn(st.settings) && !!sceneFor(st.conv.sitId, st.conv.hostId);
    this.rides.updateParkingKeys(this.t, !this.zone.interior && !talking && !this.flight && !this.modes.active && !this.transitioning, support);
    if (!covered || this.firstExteriorDraw) {
      this.road?.stage(this.renderer);
      if (roadAtCrest) {
        const started = this.modes.start("road");
        this.roadTownView = undefined;
        if (started) this.rides.transferWater();
        if (started && this.road?.render(this.renderer, w, h)) {
          this.presentWorld("road");
          this.sampleFps(true);
          return;
        }
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
      const probes = this.crashShaderProbes && this.canWarmCrashShaders() ? this.crashShaderProbes : undefined;
      if (probes) {
        // Submit the shaders once with the town's actual framebuffer and lighting. The probes sit behind the near plane.
        const cam = this.rig.cam;
        probes.position.set(0, 0, 2).applyQuaternion(cam.quaternion).add(cam.position);
        this.scene.add(probes);
      }
      this.drawTown();
      if (townFeedback) this.speedFeel?.rememberTownPose(w, h);
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
      audio.ambience(this.ambienceAllowed(), {
        sea, surf: out ? surfLevel(pz - SHORE.top) : 0, gulls: out && sea > 0.4, birds: out ? (inPark ? 1 : 0.35 * (1 - sea)) : 0, cafe,
        market, harbor: out ? near("the-pier", 34) * sea : 0, plaza: out && onSquare ? 1 : 0, tropical,
      });
      // the edition's own town sounds (theme.ts: Puerto Colibrí's church bell, street vendors and trucks; none in
      // Maple Harbor): how near the church, the square and the streets of houses are
      // near one of the grotto's ways in (cave/grounds.ts), its own quiet is heard: drips, a breath of air, two notes
      if (out) {
        let nearWay = 0;
        for (const w of caveWays()) nearWay = Math.max(nearWay, 1 - Math.hypot(w.x - px, w.z - pz) / 14);
        if (nearWay > 0.04) audio.cave(this.ambienceAllowed(), { level: nearWay * 0.85 }); else audio.stopCave();
      }
      const sn = THEME.sounds;
      if (sn) audio.townSounds(out && this.ambienceAllowed(), {
        bell: out ? THREE.MathUtils.clamp(1 - Math.hypot(px - sn.bell[0], pz - sn.bell[1]) / 150, 0, 1) : 0,
        vendors: out ? THREE.MathUtils.clamp(1 - Math.hypot(px - sn.vendors[0], pz - sn.vendors[1]) / 50, 0, 1) : 0,
        homes: out ? THREE.MathUtils.clamp((pz - sn.homesZ) / 12, 0, 1) : 0,
      });
    }
    // "walking" for the HUD (the task card folds away while you walk): after 0.4 s on the move, until
    // 1.2 s standing still
    if (this.vel.lengthSq() > 1) { this.moveT += dt; this.stillT = 0; } else { this.stillT += dt; this.moveT = 0; }
    const walking = st.hud.walking ? this.stillT < 1.2 : this.moveT > 0.4;
    if (walking !== st.hud.walking) st.setHud({ walking });
  };

  /** An illustrated scene covers the town (a conversation in pictures). */
  private covered = false;

  /** The keys or the stick, for a ride of the town's or a mini-game's (kit modes get them as they are). */
  private driveInput(blocked: boolean, stick = this.inputStick(true)) {
    let x = 0, y = 0;
    const brake = this.braking;
    if (!blocked) {
      if (this.keys.has("arrowup") || this.keys.has("w")) y += 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) y -= 1;
      if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
      if (stick !== this.joy) {
        x = stick.x;
        y = brake ? 0 : this.pad?.input?.throttle || stick.y;
      } else if (stick.x || stick.y) { x = stick.x; y = stick.y; }
    }
    return { x, y, brake };
  }

  /** At a car's wheel or a boat's helm in the town: the keys or the stick drive it (rides/drive.ts); at the helm on a
   *  phone the stick points the way (point and go); a tap on the ground or the water drives there (`rideGoal`). */
  private townRideControls(dt: number, blocked: boolean): Controls | null {
    const r = this.rides.riding!, m = r.m;
    const source = this.inputStick(true), fromPad = source !== this.joy;
    const stick = !blocked && (fromPad || !!(source.x || source.y));
    const trigger = fromPad && !!this.pad?.input?.throttle;
    const { x, y, brake } = this.driveInput(blocked, source);
    let hands = controlsFrom(x, y, brake);
    if (r.kind === "boat") {
      const point = stick && !trigger;
      const aim = this.helmSteer.update(point ? x : 0, point ? y : 0, true, this.rig.yaw, this.rig.manualTurn, dt);
      if (aim.dir !== null && !brake) hands = pointAndGo(m.heading, aim.dir, aim.mag, m.speed);
    }
    if (fromPad && (r.kind === "car" || trigger)) hands.throttle = y;
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
  private updateRide(dt: number, controls: Controls | null, townDriver = false) {
    const r = this.rides.riding!, m = r.m;
    this.rides.update(dt, this.t, controls);
    // (getting out ends the ride inside update: the player is on foot again, leftRide has set them down)
    if (this.rides.riding !== r) {
      if (this.rides.water?.returning) this.splashes.update(dt, this.t, null, 0);
      return;
    }
    const on = this.rides.phase === "on", v = on ? m.speed : 0, pace = on ? m.pace : 0, car = r.kind === "car";
    const wet = car && !!this.rides.water?.owns(r);
    // (in the water the speed feel winds down)
    if (car && on && townDriver && controls) this.speedFeel?.stepTown(dt, wet ? 0 : pace, CAR.max);
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
      const k = on ? Math.max(0, Math.min(1.2, (pace - m.spec.town * 0.8) / (m.spec.max - m.spec.town * 0.8))) : 0, kick = on && m.boost > 0 ? 1 : 0;
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
      if (!car || this.modes.engaged && !townDriver) audio.rush("wind", on ? Math.max(0, (pace - 6) / (m.spec.max - 3)) * (car ? 1 : 0.8) + (!car ? slide * 0.5 : 0) : 0, Math.min(1, pace / 16));
      if (on && m.boost > 0 && !this.kicked) { this.kicked = true; audio.kickRush(); }
      if (!on || m.boost <= 0) this.kicked = false;
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
    // A boat's wake at the hull, and dust behind a car's wheels on loose ground or in a skid.
    if (r.kind === "boat" && on) this.splashes.boatRing(dt, this.t, m);
    else this.splashes.update(dt, this.t, null, 0);
    const reduced = car && !!this.speedFeelLoader?.reducedMotion;
    if (wet) this.braked = false;
    else if (car && on) {
      const braking = !!controls && !m.drift && (controls.brake || controls.throttle < -0.35) && v > 0;
      if (braking && !this.braked && pace > 8.5) audio.skid(Math.min(1, pace / 15));
      this.braked = braking;
      this.dustT -= dt;
      const sliding = m.sliding && pace > 3, rolling = !sliding && !(braking && pace > 5);
      const high = useStore.getState().settings.quality === "high";
      const rollingAllowed = !reduced && (townDriver || this.modes.engaged);
      if (this.dustT <= 0 && (sliding || high && (!rolling || rollingAllowed && pace > 3 && !this.rides.asphalt.has(m.x, m.z)))) {
        this.dustT = sliding ? 0.05 : 0.11;
        const s = Math.sign(v) || 1, cx = pace > 0.5 ? -m.vx / pace : -m.fx * s, cz = pace > 0.5 ? -m.vz / pace : -m.fz * s;
        const fx = m.fx, fz = m.fz;
        for (let wheel = 0; wheel < (high ? 2 : 1); wheel++) {
          const side = wheel === 0 && (high || Math.random() < 0.5) ? -0.8 : 0.8;
          this.dust.puff(m.x - fx * 1.4 * s + fz * side, m.z - fz * 1.4 * s - fx * side, cx, cz, (sliding ? 1.25 : 0.8) + pace / 15, rolling);
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
    const { x, z } = this.player.root.position;
    const at = this.modes.active?.id === "pool" ? { x, y: HOTEL_POOL.water, z } : null;
    this.splashes.update(dt, this.t, at, 0);
    this.dust.update(dt);
  }

  private prepareMode() {
    if (this.modes.owns("gym")) for (const key of this.keys) this.gymHeldKeys.add(key);
    this.pad?.cancel();
    this.greeting?.release(0);
    this.keepsake.clear();
    this.endRide();
    this.stopAutoWalk();
    this.steer.reset(); this.gaitOn = false; this.stepOut = 0; this.jogT = 0;
    this.vel.set(0, 0, 0); this.moveVel.set(0, 0, 0);
    this.hop.land(0); this.applyHop();
    this.surface(true);
    this.player.bank = 0;
    this.keys.clear();
    this.nearest = null;
    this.guidance.setPath(null);
  }

  private resetFootInput() {
    this.wet = this.brake = this.pointer.down = false;
    this.rideGoal = null;
    this.wading.depth = 0;
    this.setJoystick(0, 0);
  }

  private placeOnFoot(x: number, z: number, rot: number, stayInside = false) {
    this.pad?.cancel();
    if (this.zone.interior && !stayInside) { this.enterZone("town", { x, z, rot }, true); return; }
    const p = this.player.root.position;
    p.set(x, this.zone.interior ? 0 : floorY(x, z), z);
    this.heading = rot;
    this.player.root.rotation.set(0, rot, 0);
    this.hop.land(p.y); this.applyHop();
    this.gait.sync(this.heading, 0); this.gaitOn = false; this.steer.reset();
    this.keys.clear();
    this.rig.mode = this.zone.interior ? "interior" : "follow";
    this.rig.target.copy(p);
    this.rig.yaw = rot; this.rig.snap();
    this.nearest = null;
  }

  /** The same debug spawn with or without the pool geometry. */
  poolTeleport() {
    if (!THEME.hotelPool || !this.player || this.session?.active) return false;
    this.enterZone("town", POOL_ENTRY, true);
    return true;
  }

  /** Projection, subject sightlines and foreground coverage for the browser test. */
  poolFraming() {
    const ball = this.scene.getObjectByName("hotel-pool-ball");
    if (this.modes.active?.id !== "pool" || !ball?.visible) return null;
    const camera = this.rig.cam;
    const actors = this.npcs.filter((n) => POOL_KIDS.some((kid) => kid === n.id));
    const players = [{ id: "learner", ch: this.player }, ...actors];
    const allowed = new Set<THREE.Object3D>([ball]);
    this.splashes.group.traverse((object) => allowed.add(object));
    for (const { ch } of players) ch.root.traverse((object) => allowed.add(object));
    const solids: THREE.Mesh[] = [];
    this.scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    this.scene.traverseVisible((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && !allowed.has(mesh) && mesh.name !== "hotel-pool-water") solids.push(mesh);
    });
    const points = players.map(({ id, ch }) => ({
      id, point: ch.headPosition?.(new THREE.Vector3()) ?? ch.root.position.clone().add(new THREE.Vector3(0, ch.height * 0.9, 0)),
    }));
    points.push({ id: "ball", point: ball.getWorldPosition(new THREE.Vector3()) });
    const ray = new THREE.Raycaster();
    ray.layers.mask = camera.layers.mask;
    const visibleHit = ({ object, instanceId }: THREE.Intersection) => instanceId === undefined
      || (object as THREE.InstancedMesh).geometry.getAttribute("aFadeOut")?.getX(instanceId) !== 1;
    const subjects = points.map(({ id, point }) => {
      const direction = point.clone().sub(camera.position);
      ray.far = direction.length();
      ray.set(camera.position, direction.normalize());
      const blockers = [...new Set(ray.intersectObjects(solids, false).filter(visibleHit).map(({ object }) => object.name || object.type))];
      return { id, point: point.project(camera).toArray(), blockers };
    });
    const foreground = [];
    const sample = new THREE.Vector2();
    // The broad selva crowns can still fill a corner at over 6 m. Check them beyond the immediate foreground.
    ray.near = camera.near;
    ray.far = 9.5;
    for (let row = 0; row <= 8; row++) {
      for (let col = 0; col <= 12; col++) {
        sample.set(-0.99 + col * 1.98 / 12, -0.99 + row * 1.98 / 8);
        ray.setFromCamera(sample, camera);
        const hit = ray.intersectObjects(solids, false).find(visibleHit);
        if (hit && (hit.distance < 4 || hit.object.userData.fadeNearStage)) {
          foreground.push({ row, col, mesh: hit.object.name || hit.object.type, distance: hit.distance });
        }
      }
    }
    return { subjects, foreground };
  }

  /** Change clothes in place, keeping both characters ready to use again. */
  dressPlayer(outfit: "surf" | null) {
    if (!this.player || this.outfit === outfit) return;
    // The block character has the poses used by the lesson in every world style.
    const next = outfit === "surf" ? (this.surfPlayer ??= new Character(surfLook(this.playerLook))) : this.normalPlayer;
    const before = this.player;
    next.fidgets = false;
    next.root.position.copy(before.root.position);
    next.root.rotation.copy(before.root.rotation);
    next.root.scale.copy(before.root.scale);
    next.root.visible = before.root.visible;
    if (before.seatY !== undefined) next.seatY = before.seatY;
    next.setAnim(before.anim);
    if (!outfit) next.setBackpack?.(true);
    const parent = before.root.parent;
    before.root.removeFromParent();
    this.player = next;
    parent?.add(next.root);
  }

  // (the surf lesson's buttons on the screen: src/ui/Surf.tsx)
  surfStart(level: "beginner" | "advanced") { if (!this.session?.active && !this.zone.interior) this.modeStart("surf", level); }
  surfStop() { if (this.modes.owns("surf")) this.modes.exit(); }
  surfChoose(cue: string) { if (!this.transitioning) this.surf?.choose(cue); }
  /** The move the instructor asked for, by a tap on its button; her line again; the microphone on or off, or done. */
  surfAct(what: Do) { if (!this.transitioning && !useStore.getState().hud.panel) this.surf?.act(what); }
  surfArrow(dir: SurfArrow, down: boolean) {
    if (!down || (!this.transitioning && !useStore.getState().hud.panel)) this.surf?.arrow(dir, down);
  }
  surfRepeat() { this.surf?.repeat(); }
  surfMic(on: boolean | "finish") { if (on === "finish") this.surf?.finishListening(); else this.surf?.setMic(on); }
  surfAgain(level?: "beginner" | "advanced") { this.surf?.again(level); }

  /** `through`: a door's fade is under way: the player holds still, and a walk under way carries on on the other side. */
  private updatePlayer(dt: number, blocked: boolean, through = false) {
    if (this.rides.water?.tick(dt, this.t, this.wasHidden)) {
      if (!this.rides.water.returning) this.waterNeutral = this.waterInputHeld();
      if (this.rides.riding && this.rides.water.returning) this.updateRide(dt, null);
      else {
        this.player.update(dt);
        this.splashes.update(dt, this.t, null, 0);
      }
      return;
    }
    if (this.waterNeutral) {
      this.releaseWaterInput();
      if (this.waterNeutral) { blocked = true; through = false; }
    }
    const mode = this.modes.active;
    if (mode) {
      this.rideGoal = null;
      this.modes.update({ dt, time: this.t, blocked, ...this.driveInput(blocked) });
      if (mode.cleanScreen === "menu") {
        if (!this.allowsRideHints()) useStore.getState().dismissRideToasts();
        else if (!this.rides.waitingForTraffic) useStore.getState().dismissRideToasts("waiting");
      }
      return;
    }
    if (this.rides.riding) {
      const r = this.rides.riding, x0 = r.m.x, z0 = r.m.z, heading0 = r.m.heading;
      const controls = this.townRideControls(dt, blocked);
      const goal = blocked ? null : this.rideGoal;
      this.updateRide(dt, controls, !blocked && this.zone.id === "town");
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
    const jm = Math.hypot(this.joy.x, this.joy.y);
    this.joyRun = stick && source === this.joy && (jm > 0.9 || (this.joyRun && jm > 0.8));
    const stickRun = source === this.joy ? this.joyRun : stick && this.pad?.input?.running;
    const turned = this.rig.manualTurn;
    this.rig.manualTurn = 0;
    const camYaw = this.rig.mode === "follow" ? this.rig.yaw : Math.PI;
    const steer = this.steer.update(stick ? source.x : ix, stick ? source.y : iz, stick, camYaw, turned, dt);
    if (steer.dir !== null) this.stepOut = 0;
    let want = new THREE.Vector3();
    // the pace: a walk; outdoors a jog after a moment's steady walking one way (a turn, a stop or deep water starts the
    // count again), a run with Shift or the stick at its edge; indoors always a walk; slower the deeper one wades
    // (`indoor`: not the town: a room or a place like the grotto; `room`: a room, where one only walks)
    const interior = this.zone.interior;
    const indoor = !!interior, wild = interior?.wild, room = indoor && !wild;
    const ledges = interior ? interior.ledges : this.ledges;
    if (!room && steer.dir !== null && this.wading.depth < 0.3 && !this.swimming && !(this.jogT > 0.4 && this.lastSpeed < 2)) {
      if (this.jogDir === null || Math.abs(angleDiff(steer.dir, this.jogDir)) > 0.55) { this.jogDir = steer.dir; this.jogT = 0; }
      // (a long curve is still one way: the direction counted from follows slowly)
      this.jogDir += angleDiff(steer.dir, this.jogDir) * Math.min(1, dt * 0.8);
      this.jogT += dt;
    } else { this.jogT = 0; this.jogDir = null; }
    const pace = indoor ? 1 : Wading.pace(this.wading.depth);
    let speed = (room ? WALK : this.keys.has("shift") || stickRun ? RUN : WALK + (JOG - WALK) * smoothstep(JOG_AFTER, JOG_AFTER + JOG_EASE, this.jogT)) * pace;
    // (in deep water: a calm stroke, quicker with Shift or the stick at its edge; slower under water)
    if (this.swimming) speed = this.diveK > 0.5 ? SWIM.speed * 0.85 : this.keys.has("shift") || stickRun ? SWIM.fast : SWIM.speed;
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
      let dir = steer.dir, goal = speed * (stick && !stickRun ? Math.min(1, steer.mag / 0.9) : 1);
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
          if (!this.swimming) speed = (remaining > 12 && !room ? RUN : WALK) * pace;
          // arrive next to an NPC rather than on top of them (a spot of their own to talk from, across a counter or a
          // table, is walked onto); and, held up on the way (walking but getting nowhere: someone in the way), as soon
          // as they are close enough to talk to
          const npc = this.autoTarget?.kind === "npc" ? this.npcs.find((n) => n.id === this.autoTarget?.id) : undefined;
          const nearNpc = npc && talkDist(npc, p) < TALK_RANGE;
          const heldUp = this.vel.lengthSq() > 4 && this.lastSpeed < 0.5;
          const check = this.walkCheck;
          if (nearNpc && (heldUp || (this.autoPath.length === 1 && d < 1.6 && !npc.approach))) {
            this.arrived();
            want.set(0, 0, 0);
          } else if (!indoor && !this.swimming && check.wait < CAR_WAIT && this.ambient.carInWay(p.x, p.z, want.x, want.z, 0.38)) {
            // a car of the traffic in the way (standing on the crosswalk, or going by): wait for it, then walk on
            check.wait += dt;
            check.time = 0;
            want.set(0, 0, 0);
          } else {
            if (check.time === 0) check.remaining = remaining;
            check.time += dt;
            if (check.time >= 0.8) {
              if (check.remaining - remaining < 0.2) {
                if (!nearNpc) this.autoTarget = null;
                this.arrived();
                want.set(0, 0, 0);
              } else check.wait = 0;
              check.time = 0;
            }
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
      this.zone.colliders.resolve(p, 0.38, !wild);
      ledges?.resolve(p, 0.38, this.hop.y, this.hop.air);
      if (!indoor) {
        this.ambient.resolvePlayer(p, 0.38); this.ambient.resolvePeople(p, 0.38, true);
        // (the convertibles and their people standing about; swimming, the rocks and the boats at anchor)
        this.rides.resolvePlayer(p, 0.38, this.swimming, this.hop.y);
        if (p.z < BAY.z0) p.z = BAY.z0;
      }
    }
    if (this.stepOut > 0) {
      // (stepping out of a door: done after its two steps, or at once if something stands in the way)
      const dd = p.distanceTo(before);
      this.stepOut = dd < 1e-3 && this.gait.speed > 1 ? 0 : Math.max(0, this.stepOut - dd);
    }
    // interior bounds / door push
    if (wild) {
      // (walking on into the water one came through, or out through the cleft's slit of daylight: back up to the town)
      for (const ex of wild.exits) if (Math.hypot(p.x - ex.x, p.z - ex.z) < ex.push && this.vel.x * ex.dir[0] + this.vel.z * ex.dir[1] > 0.5 && !blocked && !this.hop.air) { this.exitInterior(ex.id); break; }
    } else if (interior) {
      if (p.z > interior.d / 2 - 0.2 && Math.abs(p.x) < 1.2 && this.vel.z > 0.5 && !this.aloft) { this.exitInterior(); }
    } else {
      this.checkDoorPush(dt);
      this.checkCavePush(dt);
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
    coach.stroll(dt, indoor || blocked || !this.gaitOn || moved < 2 || this.keys.has("shift") || !!stickRun);
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
    const ground = wild ? wild.floor(p.x, p.z) : on > 0 ? on : indoor ? 0 : floorY(p.x, p.z);
    // the water here (the sea with its swell, a pool's), and how much of it is over what is underfoot
    const sur = indoor ? null : waterY(p.x, p.z, this.t), surface = sur ?? -99;
    const over = sur === null || on > 0 ? 0 : sur - ground;
    // deep enough, and in it (someone who jumps off the pier swims once their feet are under): they float and swim
    const wasSwimming = this.swimming;
    const hotelWater = HOTEL_POOL_ENABLED && !indoor && inHotelPool(p.x, p.z);
    const swim = hotelWater ? HOTEL_POOL.swim : SWIM;
    this.swimming = !through && over > (wasSwimming ? swim.out : swim.depth) && this.hop.y < surface - 0.3;
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
        useStore.getState().toast({ kind: "tip", title: L("Plauki!"), body: touch ? L("Mygtukas su rodykle žemyn – panerti.") : L("Tarpas – panerti, Shift – plaukti greičiau."), ms: 5000 });
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
    this.player.setBackpack?.(!(hotelWater && depth > 0.05));
    this.player.wading = hotelWater && wet;
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
      } else if (step && wild && ground < -0.06) {
        // (a ford in the grotto: ankle-deep)
        audio.splash(0.22);
      } else if (step) {
        audio.step(this.underfoot(ground > 0.05), running);
        if (fancy && running) this.dust.puff(p.x, p.z, this.vel.x / moved, this.vel.z / moved);
      }
    } else { this.stepDist = 0.6; this.stepN = null; }
    if (landed > 0 && wet) {
      audio.splash(Math.min(1, 0.5 + landed));
      this.splashes.burst(p.x, surface, p.z, 0, 0, 1);
    } else if (landed > 0 && wild && ground < -0.06) {
      // (into the grotto's water: dropped in through the sinkhole, or a jump in a ford)
      audio.splash(Math.min(1, 0.4 + landed));
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
    return surfacePiece;
  }

  /** The grotto's ways in from the town (cave/grounds.ts): swimming on into the cave's mouth goes in; stepping into
   *  the sinkhole drops one in; and a word, once, about each of them one comes near before ever having been down. */
  private checkCavePush(dt: number) {
    const W = caveWays(), p = this.player.root.position;
    if (!W.length) return;
    let pushing = false;
    const guidedEntry = this.autoTarget?.kind === "cave-entry" ? this.autoTarget.id : undefined;
    for (const w of W) {
      const d = Math.hypot(w.x - p.x, w.z - p.z);
      if (d < (w.swim ? 9 : 7) && (w.swim ? this.swimming : !this.swimming) && !this.caveHinted.has(w.id)) {
        this.caveHinted.add(w.id);
        if (!useStore.getState().progress.cave?.seen) {
          const hint = w.id === "boca" ? { title: L("Olos angoje kažkas švyti…"), body: L("Nuplauk prie jos, kitame cenotės krašte.") }
            : w.id === "grieta" ? { title: L("Uolos plyšyje kažkas švyti…"), body: L("Prieik arčiau – pro jį galima įlįsti.") }
            : { title: L("Iš duobės tarp šaknų kyla šviesa…"), body: L("Tai El Ojo – „akis“. Įšok, jei drįsti: apačioje vanduo.") };
          this.caveHints.push(hint.title);
          useStore.getState().toast({ kind: "tip", ms: 8000, ...hint });
        }
      }
      if (guidedEntry && w.id !== guidedEntry) continue;
      if (w.swim && this.swimming && this.diveK < 0.3 && d < 1.1 && this.vel.x < -0.8) pushing = true;
      // (the sinkhole: over its edge and down)
      if (w.drop && d < 1.05 && !this.transitioning) { this.enterCave(w.id); return; }
    }
    if (pushing) {
      this.cavePushT += dt;
      if (this.cavePushT > 0.35) { this.cavePushT = 0; this.enterCave("boca"); }
    } else this.cavePushT = 0;
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
    if (t.kind === "cave-entry" && t.id) { this.enterCave(t.id); return; }
    if (t.kind === "exit") {
      this.exitInterior(t.id, t.onward);
      return;
    }
    if (t.kind === "door" && t.id) {
      this.enterDoor(t.id);
      return;
    }
    this.guidedWalk = null;
    // The walk to Inés ends at her hut prompt so the learner opens the invitation.
    if (t.kind === "npc" && t.id && t.id !== cenoteGuide?.npc) this.talkTo(t.id);
    else if (t.kind === "glyph" && t.id && this.cave?.near(this.player.root.position)?.id === t.id) this.cave.open(t.id);
    else if (t.kind === "tree") this.talkToTree();
  }

  private updateNpcs(dt: number, talking: boolean, mode?: GameMode) {
    const p = this.player.root.position;
    const taking = talking ? this.session?.sit.npcs ?? [] : [];
    // the people look at the learner's head; the player at the one they talk with
    this.learnerAt.set(p.x, p.y + (this.player.lift ?? 0) + 1.5, p.z);
    const partner = talking ? this.talkNpc : null;
    if (partner) { const q = partner.ch.root.position; this.talkAt.set(q.x, q.y + (partner.sit ? 1.3 : 1.5), q.z); }
    this.player.watch = partner ? this.talkAt : null;
    this.player.steady = !!partner;
    for (const n of this.npcs) {
      if ((this.barista && mode === this.barista && n.id === BARISTA_CONVERSATION.npc) || mode?.controlsNpc?.(n.id)) continue;
      if (n.alux) {
        const d = Math.hypot(p.x - n.home.x, p.z - n.home.z);
        const near = d < 6;
        const participating = talking && (n === partner || taking.includes(n.id));
        n.ch.attentive = near || participating;
        n.ch.steady = near || participating;
        const turn = near || participating ? Math.atan2(p.x - n.home.x, p.z - n.home.z) : n.rot;
        n.ch.root.rotation.y += angleDiff(turn, n.ch.root.rotation.y) * Math.min(1, dt * (near ? 5 : 2));
        const hopTime = 0.42;
        if (talking) n.alux.hop = 0;
        else if (n.alux.hop > 0) n.alux.hop = Math.max(0, n.alux.hop - dt);
        else if ((n.alux.next -= dt) <= 0) {
          n.alux.next = 6 + Math.random() * 6 - hopTime;
          n.alux.hop = hopTime;
        }
        const phase = n.alux.hop / hopTime, arc = 4 * phase * (1 - phase);
        n.ch.lift = arc * (n.sit ? 0.16 : 0.24);
        n.ch.tuck = n.sit ? 0 : arc * 0.42;
        n.ch.update(dt);
        continue;
      }
      if (!this.zone.interior && this.pool?.poseKid(n.ch, n.id, dt, n === partner)) { n.ch.update(dt); continue; }
      if (n.id === "vale" && n === partner) n.ch.watch = this.learnerAt;
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

  watchNametagLayout(create: (layer: HTMLElement) => NametagLayout) {
    this.clearNametagLayout();
    const layout = this.nametagLayout = create(this.tagLayer);
    return () => { if (this.nametagLayout === layout) this.clearNametagLayout(); };
  }

  private clearNametagLayout() {
    this.nametagLayout?.dispose();
    this.nametagLayout = null;
  }

  private updateTags() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    const overlay = useStore.getState().hud;
    const anchor = overlay.prompt?.anchor;
    if (anchor && !overlay.modeScreen && !overlay.panel) {
      v.set(anchor.x, anchor.y, anchor.z).project(this.rig.cam);
      const x = Math.round((1 + v.x) * w / 2), y = Math.round((1 - v.y) * h / 2);
      if (x !== this.cabinetPin.x || y !== this.cabinetPin.y) {
        this.cabinetPin.set(x, y);
        const style = this.container.parentElement!.style;
        style.setProperty("--cabinet-x", x + "px");
        style.setProperty("--cabinet-y", y + "px");
      }
    }
    const obj = this.currentObjective();
    // in a conversation the header names the person and every line its speaker: no tags over heads
    const talking = !!this.session?.active, modeMenu = useStore.getState().hud.modeScreen?.kind === "menu";
    const shown: { n: NpcActor; x: number; y: number; dist: number }[] = [];
    for (const n of this.npcs) {
      if (this.poolCompanion(n.id)) { n.tag.style.display = "none"; continue; }
      const p = n.ch.root.position;
      const floor = HOTEL_POOL_ENABLED && n.id === "vale" ? p.y : 0;
      v.set(p.x, floor + n.ch.height + (n.sit ? -0.1 : 0.45) + (n.alux ? n.ch.lift ?? 0 : 0), p.z);
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
    const hud = this.hudBoxes(), m = 6;
    const placed = this.placedNametags;
    placed.length = 0;
    const layout = this.nametagLayout;
    const chatter = shown.length ? layout?.blocker() : undefined;
    if (chatter) hud.push(chatter);
    for (const s of shown) {
      const { n } = s;
      const size = layout?.size(n.tag, n.tagSize) ?? n.tagSize ?? [n.tag.offsetWidth, n.tag.offsetHeight];
      const [tw, th] = size;
      if (layout && (!tw || !th)) continue;
      n.tagSize = size;
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
      const bounds = s.n.tagBounds;
      bounds.x0 = x - tw / 2;
      bounds.x1 = x + tw / 2;
      bounds.y0 = y - th;
      bounds.y1 = y;
      placed.push(bounds);
      s.n.tag.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
    if (chatter) hud.pop();
    layout?.position(placed);
  }

  /** Where the task card, the little map and the buttons are in the picture (the tags keep clear of them), read about
   *  six times a second. */
  private hudBoxes() {
    if (--this.hudCheck > 0) return this.hudBoxCache;
    this.hudCheck = 10;
    const c = this.container.getBoundingClientRect();
    this.hudBoxCache = [];
    const selectors = [
      ".objective-card", ".cave-card", ".phone-ring", ".directions-card", ".photo-chip",
      ".street-card", ".minimap", ".toolbar",
      ".toolbar.menu-open:not(.portrait-toolbar) .toolbar-tools",
      ".portrait-toolbar.menu-open .toolbar-drawer",
      ".portrait-toolbar.in-ride:not(.menu-open) .radio-tool",
    ];
    for (const el of document.querySelectorAll<HTMLElement>(selectors.join(", "))) {
      if (!el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) this.hudBoxCache.push({ x0: r.left - c.left, x1: r.right - c.left, y0: r.top - c.top, y1: r.bottom - c.top });
    }
    return this.hudBoxCache;
  }

  private updateHud() {
    this.cenoteTour?.updateGuide();
    if (this.cenoteTour?.active) { this.saveAtHudTick(); return; }
    const st = useStore.getState();
    const p = this.player.root.position;
    // nearest interactable
    let best: Game["nearest"] = null;
    let bd = Infinity;
    const riding = this.rides.riding;
    if (this.modes.active) { this.nearest = null; return; }
    if (riding) {
      // at the wheel: only the way out (nobody is talked to, no door gone through)
      if (this.rides.phase === "on" && !this.session?.active) best = { kind: "out", id: riding.id, label: L("Išlipti") };
    } else if (!this.rides.water?.returning && !this.session?.active && !this.aloft) {
      for (const n of this.npcs) {
        if (this.poolCompanion(n.id)) continue;
        const d = talkDist(n, p);
        if (d < TALK_RANGE && d < bd) { bd = d; best = { kind: "npc", id: n.id, label: NPCS[n.id]?.name ?? n.id }; }
      }
      // staff with one line to say (across their counter, as a clerk's talk spot is)
      this.staff.forEach((x, i) => {
        const q = x.ch.root.position, d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < TALK_RANGE && d < bd) { bd = d; best = { kind: "staff", id: String(i), label: L("Pasisveikinti") }; }
      });
      // a convertible or the boat within a step (a boat from the water too), a pier's boards beside a swimmer
      if (!this.zone.interior && !this.hop.air && this.diveK < 0.3) {
        const r = this.rides.near(p.x, p.z);
        if (r && (r.kind === "boat" || !this.swimming) && 1 < bd) { bd = 1; best = { kind: "ride", id: r.id, label: r.parked ? "parked" : r.kind }; }
        else if (this.swimming && !best && this.rides.climbOut(p.x, p.z)) { bd = 1; best = { kind: "climb", id: "pier", label: L("Užlipti ant prieplaukos") }; }
      }
      if (!this.swimming && !this.hop.air && this.diveK < 0.3) {
        const m = this.modes.prompt(p.x, p.z, best?.kind === "ride" ? 0 : bd, !!this.zone.interior);
        if (m) {
          bd = m.distance;
          best = { kind: "mode", id: m.id, label: m.label, prompt: { label: m.label, lt: m.hint, kind: m.kind, anchor: m.anchor } };
        }
      }
      if (!this.zone.interior) {
        for (const dd of this.town.doors) {
          const d = Math.hypot(dd.outX - p.x, dd.outZ - p.z);
          if (d < 3 && d < bd && !this.swimming) { bd = d; best = { kind: "door", id: dd.loc, label: dd.name }; }
        }
        // a way into the grotto (cave/grounds.ts): the cave's mouth swum up to, the cleft walked up to, the sinkhole
        this.nearWay = null;
        for (const w of caveWays()) {
          if (Math.hypot(w.x - p.x, w.z - p.z) > w.reach || this.diveK > 0.3 || (w.swim ? !this.swimming && this.wading.depth < 0.2 : this.swimming)) continue;
          bd = 0.5; best = { kind: "door", id: CAVE_ZONE, label: LOCATIONS[CAVE_ZONE]?.name ?? CAVE_ZONE };
          this.nearWay = w.id;
          break;
        }
      } else {
        // a glyph stone that still waits, within reach
        const stone = this.cave?.near(p);
        if (stone && !best) { bd = 1; best = { kind: "glyph", id: stone.id, label: L("akmuo") }; }
        // the great tree, once the heart is found: it speaks to whoever stands on its island
        else if (!best && this.cave?.treeNear(p)) { bd = 1; best = { kind: "tree", id: "yaxche", label: NPCS.yaxche?.name ?? "Yaxché" }; }
        const ex = this.zone.interior.exit;
        const d = Math.hypot(ex.x - p.x, ex.z - p.z);
        if (!this.wild && d < 1.8 && d < bd) { bd = d; best = { kind: "exit", id: "exit", label: L("Išeiti") }; }
        // (the grotto's ways out: its water, its cleft)
        for (const e of this.wild?.exits ?? []) { const de = Math.hypot(e.x - p.x, e.z - p.z); if (de < e.reach && de < bd) { bd = de; best = { kind: "exit", id: e.id, label: L("Išeiti") }; } }
      }
    }
    // Closing a menu restores the prompt under the learner. Only a new approach rings the cabinet.
    if (this.lastCabinetCue && (this.zone.id !== BILLIARDS_PLACE || !cabinetNear(p.x, p.z))) this.lastCabinetCue = undefined;
    const changed = best?.kind !== this.nearest?.kind || best?.id !== this.nearest?.id
      || (best?.prompt?.kind === "arcade" && best.label !== this.nearest?.label);
    this.nearest = best;
    if (changed) {
      if (best) {
        if (best.prompt?.kind !== "arcade") audio.sfx("tick");
        else if (this.lastCabinetCue !== best.label) {
          this.lastCabinetCue = best.label;
          audio.sfx("coin", 0.35);
        }
      }
      const names = RIDE_NAMES;
      st.setHud({ prompt: !best ? null
        : best.kind === "ride" ? (best.label === "parked" ? { label: L(ROAD_UI.drive), kind: "drive" }
          : best.label === "car" ? { label: L("Vairuoti: {name}", { name: names.car.en }), lt: names.car.lt || undefined, kind: "drive" }
          : { label: L("Plaukti: {name}", { name: names.boat.en }), lt: names.boat.lt || undefined, kind: "boat" })
        : best.kind === "out" ? { label: L("Išlipti"), kind: "out" }
        : best.kind === "climb" ? { label: best.label, kind: "climb" }
        : best.kind === "glyph" ? { label: L("Klausytis: kalbantis akmuo"), kind: "listen" }
        : best.kind === "tree" ? { label: L("Kalbėtis: {name}", { name: best.label }), lt: NPCS.yaxche?.role.lt, kind: "talk" }
        : best.kind === "exit" && this.wild ? { label: best.id === "grieta" ? L("Išlįsti pro plyšį") : L("Grįžti į cenotę"), kind: "exit" }
        : best.kind === "door" && this.nearWay === "ojo" ? { label: L("Šokti žemyn: {place}", { place: best.label }), lt: placeLt(best.id), kind: "enter" }
        : best.kind === "mode" ? best.prompt!
        : best.kind === "staff" ? { label: best.label, kind: "talk" }
        : { label: best.kind === "npc" ? L("Kalbėtis: {name}", { name: best.label }) : best.kind === "door" ? L("Įeiti: {place}", { place: best.label }) : L("Išeiti į lauką"), lt: best.kind === "door" ? placeLt(best.id) : undefined, kind: best.kind === "npc" ? "talk" : best.kind === "door" ? "enter" : "exit" } });
    }
    // what the player does instead of walking, for the buttons and the hints
    const ride = riding ? riding.kind : this.swimming ? (this.diveK > 0.5 ? "dive" : "swim") : null;
    const wading = !ride && !this.zone.interior && this.wet;
    if (st.hud.ride !== ride || st.hud.wading !== wading) st.setHud({ ride, wading });
    // Objective and cave quest arrows use the same destinations as the walk buttons.
    const o = st.hud.objective;
    const tgt = this.cave || o?.followUp ? this.objectiveTarget() : this.guidanceTarget();
    if (o) {
      const dist = tgt ? Math.round(Math.hypot(tgt.x - p.x, tgt.z - p.z)) : null;
      const angle = tgt ? Math.atan2(tgt.x - p.x, tgt.z - p.z) : null;
      if (o.dist !== dist || (angle !== null && Math.abs((o.angle ?? 0) - angle) > 0.05)) st.setHud({ objective: { ...o, dist, angle } });
    }
    const mm = st.hud.minimap, zone = this.zone.id;
    const quest = this.cave ? this.objectiveTarget("cave") : null;
    const marker = this.routeVisualTarget() ?? (this.cave || o?.followUp ? this.guidanceTarget() : tgt);
    const gates = this.cave ? this.caveGates : undefined;
    if (Math.abs(mm.px - p.x) > 0.3 || Math.abs(mm.pz - p.z) > 0.3 || Math.abs(mm.heading - this.heading) > 0.05 ||
      mm.zone !== zone || mm.targetX !== marker?.x || mm.targetZ !== marker?.z ||
      mm.questX !== quest?.x || mm.questZ !== quest?.z || mm.gates !== gates) {
      st.setHud({ minimap: { px: p.x, pz: p.z, heading: this.heading, targetX: marker?.x, targetZ: marker?.z, zone, gates, questX: quest?.x, questZ: quest?.z } });
    }
    this.saveAtHudTick();
  }

  private saveAtHudTick() {
    this.saveT -= 0.12;
    if (this.saveT <= 0) { this.saveT = 5; this.savePlace(); }
  }
  private saveT = 5;

  private savePlace() {
    if (!this.initialDrawn || this.enteringFirstExterior || !this.player || !this.zone) return;
    const safe = this.zone.id === "town" ? this.rides.water?.safeSave() : undefined;
    const p = safe ?? this.player.root.position;
    useStore.getState().updateProgress((pr) => {
      pr.place = this.cenoteTour?.savedPlace()
        ?? { zone: this.zone.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), rot: +(safe?.rot ?? this.heading).toFixed(2) };
      const boat = this.rides.riding;
      const atSea = this.modes.owns("sea");
      if (this.zone.id === "town" && boat?.kind === "boat" && this.rides.phase !== "out") {
        const position = atSea ? seaReturn(boat) : boat.beach?.launch ?? { x: boat.m.x, z: boat.m.z, rot: boat.m.heading };
        pr.place.boat = { id: boat.id, ...position, mooring: this.seaMooring };
        if (atSea || boat.beach) Object.assign(pr.place, position);
      }
      for (const ride of this.rides.list) {
        if (!ride.townBoat?.beached || ride.beach) continue;
        const position = ride === boat && atSea ? seaReturn(ride) : { x: ride.m.x, z: ride.m.z, rot: ride.m.heading };
        (pr.launchedLanchas ??= {})[ride.id] = position;
      }
      this.phone.saveClock(pr);
    });
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

  refreshNameTags() {
    for (const n of this.npcs) {
      const def = NPCS[n.id];
      if (!def) continue;
      const html = nameTagHtml(def);
      if (n.tag.innerHTML !== html) { n.tag.innerHTML = html; n.tagSize = undefined; }
    }
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
    this.disposed = true;
    this.greeting?.release(0);
    this.pad?.dispose();
    this.clearNametagLayout();
    this.placedNametags.length = 0;
    this.stopTalkCamera();
    this.onReady = undefined;
    this.onExteriorError = undefined;
    this.replyToExteriorError?.(false);
    this.firstExteriorDraw?.();
    this.firstExteriorDraw = undefined;
    this.exteriorModels = undefined;
    clearTimeout(this.rideTimer);
    this.collisionPreparation?.cancel();
    this.collisionPreparation = undefined;
    clearTimeout(this.ledgeTimer);
    this.ledgeTimer = undefined;
    for (const unsubscribe of this.phoneWatch) unsubscribe();
    document.removeEventListener("visibilitychange", this.phoneVisibility);
    window.removeEventListener("pagehide", this.phonePageHide);
    if (this.initialDrawn) this.phonePageHide();
    for (const timer of this.zoneTimers) clearTimeout(timer);
    this.zoneTimers.clear();
    for (const timer of this.sceneDelays) clearTimeout(timer);
    this.sceneDelays.clear();
    this.keepsake.dispose();
    this.streetLife?.dispose();
    this.speedFeelLoader?.dispose();
    this.modes.dispose();
    this.cenoteTour?.removeInspection();
    this.undersea?.dispose();
    this.player?.root.removeFromParent();
    this.normalPlayer?.dispose?.();
    this.surfPlayer?.dispose?.();
    audio.bed(null);
    this.frameFade.clear();
    this.rides?.disposeWater();
    this.rides?.disposeCrashes();
    this.carVisuals?.dispose();
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
    this.clearActorColliders();
    this.clearNpcs();
    this.clearRoomPeople();
    this.cave?.dispose();
    this.cave = null;
    this.renderer.domElement.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export { game, setGame } from "./gameRef";
void textTexture;
