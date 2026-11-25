import * as THREE from "three";
import { BARISTA_CONVERSATION, BARISTA_ORDERS, BARISTA_UI, type Pick, type Row } from "../../content/barista";
import { BARISTA_ACCEPT } from "../../content/barista-lines";
import { getSituation, loadSituation, prefetchSituations } from "../../content/situations/catalog";
import type { SituationDef } from "../../content/types";
import { NPCS } from "../../content/npcs";
import { coachVoice } from "../../content/voices";
import { audio } from "../audio";
import { createCharacter, type GameCharacter } from "../characters";
import { ModeDialogue, type KitLine } from "../kit/dialogue";
import type { ModeHost } from "../kit/host";
import { conversationLine } from "../kit/lines";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases, PhraseRun } from "../kit/phrases";
import { useStore } from "../../state/store";
import { sitProgress } from "../../state/progress";
import { countPlay } from "../../state/playStats";
import { sendStat } from "../../state/stats";
import { L } from "../../ui/i18n";
import { BaristaShift } from "./shift";
import { matchesPick, trayPhrases, trayRows } from "./tray";
import { CounterProps, CUP_AT, CUP_SERVED, disposeBaristaProps, makeServing } from "./props";
import { baristaMenu, baristaPieceLine, baristaThanks } from "./menu";
import { resetBaristaUi, useBarista } from "./store";
import { COUNTER_SEAT, MIA_ASIDE, counterDetails, counterShot, fitCounterView, scoreDetails, servingDetails, type CounterLens } from "./framing";

const { situation, npc } = BARISTA_CONVERSATION;
export const BARISTA_PROMPT = { x: -2.55, z: -2.03, rot: Math.PI };
const STAFF = { x: -1.2, z: -4.2, rot: 0 };
const TOWARD_BARISTA = Math.atan2(STAFF.x - COUNTER_SEAT.x, STAFF.z - COUNTER_SEAT.z);
const DOOR = new THREE.Vector3(0, 0, 5.8);
const AISLE = [new THREE.Vector3(1.72, 0, 4.18), new THREE.Vector3(1.68, 0, 1.28), new THREE.Vector3(0.63, 0, -0.95)];
const QUEUE = new THREE.Vector3(0.5, 0, -1.15);
const LEAVE = [new THREE.Vector3(-2.96, 0, -1.68), new THREE.Vector3(-3.3, 0, 0.7), new THREE.Vector3(-1.9, 0, 4.46), DOOR];
const ui = useBarista.setState;
const WALK_SPEED = 2.75;
const SERVE_LEAD = 0.28;
const SERVE_SLIDE = 0.64;

type Actor = { ch: GameCharacter; path: THREE.Vector3[]; idleYaw: number; serving?: THREE.Group; leaving?: boolean };
type RoomHost = {
  room(): THREE.Group | null;
  mia(): GameCharacter | undefined;
  place(x: number, z: number, rot: number): void;
  savePlace(): void;
};
type Run = {
  shift: BaristaShift;
  cafe: SituationDef;
  menu: ReturnType<typeof baristaMenu>;
  root: THREE.Group;
  props: CounterProps;
  originalProps?: THREE.Object3D;
  actors: Actor[];
  mia: Actor;
  miaHome: { position: THREE.Vector3; yaw: number; busy: GameCharacter["busy"]; watch: GameCharacter["watch"] };
  framing: ReturnType<typeof counterDetails>;
  picture?: { width: number; height: number; bottom: number; lens: CounterLens };
  servingFrame?: ReturnType<typeof servingDetails>;
  customer: Actor;
  queued?: Actor;
  serving: THREE.Group | null;
  slide: number;
  kept: Map<string, KitLine>;
  review: PhraseRun;
  wait?: { left: number; finish: (ok: boolean) => void };
  introStarted: boolean;
  guidedReady: boolean;
  replaying: boolean;
  closing: boolean;
};

export function createBaristaMode(host: ModeHost, room: RoomHost) { return new BaristaMode(host, room); }

class BaristaMode implements GameMode {
  readonly id = "barista";
  readonly cleanScreen = "menu";
  readonly exitLabel = L(BARISTA_UI.exit);
  readonly camera = "stage";
  readonly indoorPrompt = true;
  readonly conversation = { situation, label: L(BARISTA_UI.start), option: "conversation" };
  private run: Run | null = null;
  private offered = false;
  private starting = false;
  private loading: Promise<SituationDef | null> | null = null;
  private speaker?: GameCharacter;
  private cueAnchor = new THREE.Vector3();
  private cueAnchorRight = new THREE.Vector3();
  private playback = new ModeDialogue({
    allowBrowserVoice: true,
    framePlayback: true,
    say: (line) => {
      const { hiddenOrder, repair } = useBarista.getState();
      if (line && (!hiddenOrder.length || repair)) this.run?.review.add(line.sentence);
      ui({ line });
    },
    choices: (choices) => {
      this.run?.review.lines(choices);
      ui({ choices });
    },
    mic: (mic) => ui({ mic }),
    animate: (seconds) => this.speaker?.talk(seconds, () => audio.level(), () => audio.vowel()),
  });

  constructor(private host: ModeHost, private café: RoomHost) {}

  get active() { return this.run !== null; }
  available() { return sitProgress(useStore.getState().progress, situation).completions > 0; }

  prompt(x: number, z: number) {
    if (this.offered || this.starting || !this.available() || !this.café.room()) return null;
    const distance = Math.hypot(x - BARISTA_PROMPT.x, z - BARISTA_PROMPT.z);
    if (distance > 1.2) return null;
    prefetchSituations([situation]);
    return { distance, label: this.conversation.label, kind: "barista" } as const;
  }

  start(option?: string) {
    const debug = import.meta.env.DEV && option === "debug";
    if (this.run || !this.café.room() || !this.host.canStart(true) || (!debug && !this.available())) return false;
    if (debug || option === "conversation") return this.begin();
    if (this.offered) return true;
    this.offered = true;
    return this.withCafe(() => {
      ui({ offered: true });
      void this.sayMia("bs_offer", this.café.mia());
      return true;
    });
  }

  private begin(previous?: Run) {
    return this.withCafe((cafe) => this.fadeIntoShift(cafe, previous));
  }

  private withCafe(ready: (cafe: SituationDef) => boolean) {
    const cafe = getSituation(situation);
    if (cafe) return ready(cafe);
    if (this.loading) return true;
    // The catalog applies the learner's table before publishing the café's lines.
    const loading = loadSituation(situation).catch(() => null);
    this.loading = loading;
    void loading.then((definition) => {
      if (this.loading !== loading || !this.host.owns(this.id)) return;
      this.loading = null;
      if (definition && this.café.room() && this.host.canStart(true) && ready(definition)) return;
      this.exit(true);
    });
    return true;
  }

  private fadeIntoShift(cafe: SituationDef, previous?: Run) {
    const offer = this.offered ? useBarista.getState().line : null;
    const started = this.host.fade(() => {
      this.starting = false;
      if (!this.host.owns(this.id) || (previous && previous !== this.run)) return;
      if (previous) this.clearRun(previous);
      this.launch(cafe, offer);
    });
    if (!started) return false;
    this.starting = true;
    this.offered = false;
    this.playback.cancel();
    ui({ offered: false });
    if (previous) previous.closing = true;
    return true;
  }

  private launch(cafe: SituationDef, offer: KitLine | null) {
    const room = this.café.room();
    const barista = this.café.mia();
    if (!room || !barista) { this.host.left(this.id); return; }
    this.host.prepare();
    const player = this.host.player();
    const miaHome = {
      position: barista.root.position.clone(), yaw: barista.root.rotation.y, busy: barista.busy, watch: barista.watch,
    };
    barista.setAnim("idle");
    barista.busy = null;
    barista.watch = null;
    this.café.place(miaHome.position.x, miaHome.position.z, STAFF.rot);
    player.setAnim("idle");

    const root = new THREE.Group();
    root.name = "barista-shift";
    const props = new CounterProps();
    root.add(props.root);
    room.add(root);
    const originalProps = room.getObjectByName("sunny-cup-counter-props");
    if (originalProps) originalProps.visible = false;
    // Stage Mia in the aisle under the fade. She can welcome guests and see the learner's work.
    const mia = { ch: barista, path: [], idleYaw: Math.atan2(STAFF.x - MIA_ASIDE.x, STAFF.z - MIA_ASIDE.z) };
    barista.root.position.copy(MIA_ASIDE);
    barista.root.rotation.y = mia.idleYaw;
    const shift = new BaristaShift();
    const customer = this.actor(root, shift.order.npc, DOOR, [...AISLE, COUNTER_SEAT]);
    const run: Run = {
      shift, cafe, menu: baristaMenu(cafe), root, props, originalProps, mia, miaHome, customer, actors: [mia, customer],
      framing: counterDetails(customer.ch.height, barista.height),
      serving: null, slide: 0, kept: new Map(), review: new PhraseRun(situation),
      introStarted: false, guidedReady: false, replaying: false, closing: false,
    };
    if (offer) run.review.add(offer.sentence);
    this.run = run;
    resetBaristaUi();
    ui({ micOn: this.playback.micOn, menu: run.menu });
    this.host.entered(this.id);
    this.host.rig.mode = "stage";
    const shot = counterShot(player.root.position, player.height);
    this.host.rig.stage = { ...shot, rate: 8 };
    this.host.rig.stageSnap();
    this.paint(run);
    sendStat("barista_start");
  }

  private actor(root: THREE.Group, id: string, at: THREE.Vector3, path: THREE.Vector3[]): Actor {
    const { look, gender } = NPCS[id];
    const ch = createCharacter({ ...look, female: look.female ?? gender === "f" });
    ch.root.name = `barista-${id}`;
    ch.root.position.copy(at);
    ch.fidgets = false;
    root.add(ch.root);
    return { ch, path, idleYaw: TOWARD_BARISTA };
  }

  private paint(run: Run) {
    const { shift } = run;
    const guided = shift.step === "order" && shift.help < 2;
    const fix = shift.correction;
    const tray = guided || shift.step === "build" || shift.step === "correction";
    const previous = useBarista.getState();
    const trayReview = tray
      ? previous.tray && previous.built.drink === shift.built.drink ? previous.trayReview : trayPhrases(run.menu, shift.built)
      : undefined;
    if (trayReview && trayReview !== previous.trayReview) run.review.entries(trayReview);
    ui({
      customer: shift.step === "intro" || shift.step === "closing" ? 0 : shift.index + 1,
      step: shift.step, built: { ...shift.built },
      highlight: fix?.chip ?? (guided && shift.help === 0 ? shift.currentPiece : null),
      repair: !!fix,
      correctionSelected: fix?.selected ?? null,
      tray, trayReview,
      ready: (guided && run.guidedReady) || (shift.step === "build" && !run.replaying),
    });
  }

  private sayMia(key: string, ch?: GameCharacter) {
    this.speaker = ch;
    return this.playback.say(situation, npc, key);
  }

  private sayCustomer(run: Run, line: KitLine) {
    const { gender } = run.shift.order;
    this.speaker = run.customer.ch;
    return this.playback.sayLine(line, coachVoice(gender), 1, gender === "m");
  }

  private async answer(run: Run, key: string) {
    const line = await this.playback.expect(situation, npc, [key], undefined, BARISTA_ACCEPT);
    if (!line || this.run !== run || run.closing) return false;
    run.kept.set(line.key, line);
    return true;
  }

  private delay(run: Run, seconds: number) {
    return new Promise<boolean>((finish) => { run.wait = { left: seconds, finish }; });
  }

  private async open(run: Run) {
    if (!await this.sayMia("bs_intro", run.mia.ch) || this.run !== run || run.closing) return;
    this.playback.clearLine();
    run.shift.step = "arrive";
    this.paint(run);
  }

  private async greet(run: Run) {
    const { shift } = run;
    shift.step = "greet";
    this.paint(run);
    if (!await this.answer(run, "bs_a_hi")) return;
    if (shift.help < 2) void this.guidedPiece(run);
    else void this.fullOrder(run);
  }

  private row(row: Row, id?: string) {
    const page = id ? Math.max(0, Math.floor((this.run?.menu[row].findIndex((chip) => chip.id === id) ?? 0) / 4)) : 0;
    ui({ row, page });
  }

  private async guidedPiece(run: Run) {
    const { shift } = run;
    const piece = shift.currentPiece;
    shift.step = "order";
    run.guidedReady = false;
    this.row(piece.row, shift.help === 0 ? piece.id : undefined);
    this.paint(run);
    if (!await this.sayCustomer(run, baristaPieceLine(run.cafe, piece, shift.order.gender)) || this.run !== run || run.closing) return;
    run.guidedReady = true;
    this.paint(run);
  }

  private async fullOrder(run: Run) {
    const { shift } = run;
    const lines = shift.order.pieces.map((piece) => baristaPieceLine(run.cafe, piece, shift.order.gender));
    run.replaying = true;
    shift.step = "order";
    ui({ hiddenOrder: lines });
    this.paint(run);
    for (const [i, line] of lines.entries()) {
      if (i && !await this.delay(run, 0.2)) return;
      if (!await this.sayCustomer(run, line) || this.run !== run || run.closing) return;
    }
    this.playback.clearLine();
    run.replaying = false;
    shift.step = "build";
    this.paint(run);
  }

  private pick(run: Run, pick: Pick) {
    const { shift } = run;
    if (!useBarista.getState().ready || !run.menu[pick.row].some(({ id }) => id === pick.id)) return;
    const correction = shift.correction;
    const expected = shift.step === "order" ? shift.currentPiece : correction?.chip;
    shift.select(pick);
    if (expected?.row === pick.row && expected.id === pick.id && matchesPick(shift.built, pick) === (correction?.selected ?? true)) {
      audio.sfx("tick");
    }
    this.rebuild(run);
    if (shift.step === "order") {
      const p = shift.currentPiece;
      if (p.row === pick.row && p.id === pick.id && matchesPick(shift.built, p)) {
        if (++shift.piece < shift.order.pieces.length) { void this.guidedPiece(run); return; }
        shift.step = "build";
        this.row("size");
      }
    } else {
      const rows = trayRows(shift.built);
      const next = rows[rows.indexOf(pick.row) + 1];
      if (pick.row === useBarista.getState().row && pick.row !== "extras" && next && !shift.correction) this.row(next);
      else if (pick.row !== useBarista.getState().row) this.row(pick.row, pick.id);
    }
    this.paint(run);
  }

  private rebuild(run: Run) {
    if (run.serving) disposeBaristaProps(run.serving);
    const built = run.shift.built;
    run.serving = built.drink ? makeServing(built) : null;
    if (run.serving) run.root.add(run.serving);
  }

  private async give(run: Run) {
    const { shift } = run;
    if (shift.step !== "build") return;
    const fix = shift.handover();
    this.paint(run);
    if (fix) {
      const key = "bs_c_sorry";
      const sentence = conversationLine(situation, shift.order.npc, key, undefined, false);
      if (sentence && !await this.sayCustomer(run, { key, sentence })) return;
      if (this.run !== run || run.closing) return;
      this.row(fix.chip.row, fix.chip.id);
      if (!await this.sayCustomer(run, baristaPieceLine(run.cafe, fix.piece, shift.order.gender)) || this.run !== run || run.closing) return;
      shift.step = "build";
      this.paint(run);
      return;
    }

    this.playback.clearLine();
    ui({ hiddenOrder: [], revealed: false });
    const next = BARISTA_ORDERS[shift.index + 1];
    if (next) {
      run.queued = this.actor(run.root, next.npc, DOOR, [...AISLE, QUEUE]);
      run.actors.push(run.queued);
    }
    run.slide = 0;
    if (run.serving) run.servingFrame = servingDetails(run.customer.ch.height, run.serving);
    if (!await this.delay(run, SERVE_LEAD + SERVE_SLIDE + 0.35) || run.closing) return;
    run.customer.ch.react?.("nod");
    run.props.price(shift.order.price);
    shift.step = "price";
    ui({ price: shift.order.price });
    this.paint(run);
    if (!await this.answer(run, shift.order.priceLine)) return;
    shift.step = "thanks";
    this.paint(run);
    if (!await this.sayCustomer(run, baristaThanks(run.cafe, shift.order.gender)) || this.run !== run || run.closing) return;
    shift.step = "reply";
    this.paint(run);
    if (!await this.answer(run, "bs_a_welcome")) return;

    for (const piece of shift.order.pieces) {
      const line = baristaPieceLine(run.cafe, piece, shift.order.gender);
      run.kept.set(line.key, line);
    }
    this.playback.clearLine();
    run.props.price(null);
    ui({ price: null });
    run.servingFrame = undefined;
    run.customer.serving = run.serving ?? undefined;
    run.serving = null;
    run.customer.path = [...LEAVE];
    run.customer.leaving = true;
    if (shift.next() && run.queued) {
      run.customer = run.queued;
      run.queued = undefined;
      run.customer.path.push(COUNTER_SEAT);
      run.framing = counterDetails(run.customer.ch.height, run.mia.ch.height);
      this.row("size");
      this.paint(run);
    } else {
      this.paint(run);
      run.mia.idleYaw = TOWARD_BARISTA;
      run.mia.path.push(COUNTER_SEAT);
      run.framing = scoreDetails(run.mia.ch.height);
      this.host.rig.stage = {
        pos: new THREE.Vector3(-3.55, 2.82, -5.64), look: COUNTER_SEAT.clone().setY(1.1), rate: 2.4,
      };
      const walkTime = run.mia.ch.root.position.distanceTo(COUNTER_SEAT) / WALK_SPEED;
      const [line, arrived] = await Promise.all([this.sayMia("bs_done", run.mia.ch), this.delay(run, walkTime)]);
      if (!line || !arrived || this.run !== run || run.closing) return;
      this.playback.clearLine();
      shift.step = "score";
      keepPhrases(situation, [...run.kept.values()].map((line) => line.sentence));
      this.paint(run);
      ui({ result: { served: shift.served, firstTime: shift.firstTime, cards: run.kept.size, review: run.review.finish() } });
      countPlay("games", this.id);
      sendStat("barista", { n: shift.served, first: shift.firstTime, wrong: shift.wrong });
    }
  }

  private move(actor: Actor, dt: number) {
    const { ch, path } = actor;
    const target = path[0];
    if (target) {
      const delta = target.clone().sub(ch.root.position);
      const length = delta.length();
      const speed = WALK_SPEED * dt;
      if (length <= speed) {
        ch.root.position.copy(target);
        path.shift();
      } else {
        ch.root.rotation.y = Math.atan2(delta.x, delta.z);
        ch.root.position.addScaledVector(delta, speed / length);
        if (ch.anim !== "walk") ch.setAnim("walk");
        ch.moveSpeed = WALK_SPEED;
      }
    }
    if (target && !path.length) {
      ch.setAnim("idle");
      ch.moveSpeed = 0;
      ch.root.rotation.y = actor.idleYaw;
    }
    ch.update(dt);
    if (actor.serving) {
      ch.rightHand.getWorldPosition(actor.serving.position);
      actor.serving.position.y += 0.06;
    }
  }

  frameView(width: number, height: number, freeBottom: number, cue?: HTMLElement | null) {
    const run = this.run;
    if (!run || width <= 0 || height <= 0) return;
    const previous = run.picture;
    const closing = run.shift.step === "closing" || run.shift.step === "score";
    const reservation = height - Math.min(width <= 600 ? 350 : 325, height * 0.54);
    const sameViewport = previous?.width === width && previous.height === height;
    const cam = this.host.rig.cam;
    if (width <= 600 && run.servingFrame) {
      // The empty space below the removed tray showed the learner's back. Use it for
      // the cup, settle before it moves, then hold the composition through payment.
      const progress = THREE.MathUtils.smoothstep(run.slide, 0, SERVE_LEAD);
      fitCounterView(cam, width, height, Math.min(freeBottom, height * 0.77), run.servingFrame, 0,
        sameViewport ? previous.lens : undefined, progress);
    } else {
      const hold = run.servingFrame && sameViewport;
      const bottom = hold ? previous.bottom : Math.min(closing ? height * 0.56 : reservation, freeBottom);
      // Reserve room for a side plate throughout pastry orders, including before it is built.
      const hasPastry = run.shift.order.pieces.some(({ hint }) => hint.group === "order_food");
      const crop = width <= 600 && useBarista.getState().tray
        ? THREE.MathUtils.smoothstep(bottom / width, 0.84, 1.1) * (hasPastry ? 0.5 : 1) : 0;
      const lens = fitCounterView(cam, width, height, bottom, run.framing, crop);
      run.picture = { width, height, bottom, lens };
    }
    if (cue && this.speaker) {
      const anchor = this.cueAnchor.copy(this.speaker.root.position);
      anchor.y += this.speaker.height * 0.91;
      // Project the far cheek so the bubble clears the head at every zoom level.
      const before = width <= 600 && (this.speaker === run.customer.ch || closing);
      anchor.addScaledVector(this.cueAnchorRight.setFromMatrixColumn(cam.matrixWorld, 0), before ? -0.34 : 0.34);
      anchor.project(cam);
      cue.classList.toggle("barista-cue-before", before);
      const inset = (1 + (before ? -anchor.x : anchor.x)) * width / 2;
      cue.style.setProperty("--cue-inset", `${Math.round(inset) + 6}px`);
      cue.style.setProperty("--cue-top", `${Math.round((1 - anchor.y) * height / 2) - 17}px`);
      cue.style.setProperty("--cue-bottom", `${Math.round(freeBottom) - 5}px`);
    }
  }

  tick(dt: number) {
    if (!this.offered) return;
    const { x, z } = this.host.player().root.position;
    if (!this.café.room() || Math.hypot(x - BARISTA_PROMPT.x, z - BARISTA_PROMPT.z) > 1.75 || useStore.getState().hud.panel) {
      this.exit(true);
      return;
    }
    this.playback.update(dt, false);
  }

  update({ dt, blocked }: ModeFrame) {
    const run = this.run;
    if (!run || run.closing) return;
    this.playback.update(dt, blocked);
    if (blocked) return;
    this.host.updatePose(dt, STAFF.rot);
    if (!run.introStarted) {
      run.introStarted = true;
      void this.open(run);
    }
    for (const actor of run.actors) this.move(actor, dt);
    run.actors = run.actors.filter((actor) => {
      if (!actor.leaving || actor.path.length) return true;
      this.clearActor(actor);
      return false;
    });

    if (run.shift.step === "arrive" && !run.customer.path.length) void this.greet(run);
    if (run.shift.step === "handover" && run.serving) {
      run.slide += dt;
      run.serving.position.lerpVectors(CUP_AT, CUP_SERVED, THREE.MathUtils.smoothstep(run.slide, SERVE_LEAD, SERVE_LEAD + SERVE_SLIDE));
    }
    const wait = run.wait;
    if (wait && (wait.left -= dt) <= 0) {
      run.wait = undefined;
      wait.finish(true);
    }
  }

  input(input: ModeInput) {
    const run = this.run;
    if (!run || run.closing || input.kind !== "key" || input.repeat) return false;
    const { key } = input;
    if (key === "escape") { this.exit(false); return true; }
    if (this.playback.key(key)) {
      if (key === "m") ui({ micOn: this.playback.micOn });
      return true;
    }
    const { row, page, ready } = useBarista.getState();
    if (!ready) return false;
    if (key === "enter") { void this.give(run); return true; }
    if (/^[1-4]$/.test(key)) {
      const chip = run.menu[row][page * 4 + Number(key) - 1];
      if (chip) this.pick(run, { row, id: chip.id });
      return true;
    }
    if (key === "arrowleft" || key === "arrowright") {
      const next = page + (key === "arrowright" ? 1 : -1);
      ui({ page: THREE.MathUtils.clamp(next, 0, Math.ceil(run.menu[row].length / 4) - 1) });
      return true;
    }
    if (key === "arrowup" || key === "arrowdown") {
      const rows = trayRows(run.shift.built);
      const i = rows.indexOf(row) + (key === "arrowdown" ? 1 : -1);
      this.row(rows[(i + rows.length) % rows.length]);
      return true;
    }
    return false;
  }

  action(name: string, value?: string | boolean) {
    if (name === "start" && this.offered) { this.begin(); return; }
    const run = this.run;
    if (!run || run.closing) return;
    if (name === "choose" && typeof value === "string") this.playback.choose(value);
    if (name === "mic") { this.playback.setMic(value === true); ui({ micOn: this.playback.micOn }); }
    if (name === "give") void this.give(run);
    if (name === "again" && run.shift.step === "score") this.begin(run);
    if (name === "show") {
      const { hiddenOrder, revealed, repair } = useBarista.getState();
      if (hiddenOrder.length && !revealed && !repair) {
        run.review.lines(hiddenOrder);
        ui({ revealed: true });
      }
    }
    if (name === "hear" && run.shift.step === "build" && run.shift.help === 2 && !run.shift.correction) void this.fullOrder(run);
    if (typeof value === "string") {
      if (name === "row" && trayRows(run.shift.built).includes(value as Row)) this.row(value as Row);
      if (Object.hasOwn(run.menu, name)) this.pick(run, { row: name as Row, id: value });
    }
  }

  state() {
    const run = this.run;
    if (!run) {
      if (this.starting || this.loading) return { step: "starting" as const };
      return this.offered ? { step: "offer" as const } : null;
    }
    const { shift } = run;
    return {
      customer: shift.index + 1, step: shift.step, built: { ...shift.built, extras: [...shift.built.extras] },
      wrong: shift.wrong, help: shift.help, piece: shift.piece, served: shift.served, firstTime: shift.firstTime,
    };
  }

  private clearActor(actor: Actor) {
    actor.ch.root.removeFromParent();
    actor.ch.dispose?.();
    if (actor.serving) disposeBaristaProps(actor.serving);
  }

  private clearRun(run: Run) {
    this.playback.cancel();
    this.speaker = undefined;
    run.wait?.finish(false);
    for (const actor of run.actors) {
      if (actor !== run.mia) this.clearActor(actor);
    }
    const { ch } = run.mia;
    ch.root.position.copy(run.miaHome.position);
    ch.root.rotation.y = run.miaHome.yaw;
    ch.busy = run.miaHome.busy;
    ch.watch = run.miaHome.watch;
    ch.setAnim("idle");
    disposeBaristaProps(run.root);
    if (run.originalProps) run.originalProps.visible = true;
    this.host.rig.stage = null;
    this.host.rig.cam.zoom = 1;
    this.host.rig.cam.clearViewOffset();
    this.run = null;
  }

  exit(immediate: boolean) {
    const run = this.run;
    if (!immediate && run?.closing) return;
    this.offered = false;
    this.starting = false;
    this.loading = null;
    this.playback.cancel();
    const close = () => {
      if (run && this.run !== run) return;
      if (run) {
        this.clearRun(run);
        this.café.place(BARISTA_PROMPT.x, BARISTA_PROMPT.z, BARISTA_PROMPT.rot);
        this.café.savePlace();
      }
      resetBaristaUi();
      this.host.left(this.id);
    };
    if (run) run.closing = true;
    if (immediate || !run || !this.host.fade(close)) close();
  }

  dispose() { if (this.run || this.offered || this.starting || this.loading) this.exit(true); }
}
