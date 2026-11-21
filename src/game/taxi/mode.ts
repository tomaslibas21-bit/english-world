import * as THREE from "three";
import { TAXI_CAR, TAXI_CONVERSATION, TAXI_ROUTES, TAXI_UI } from "../../content/taxi";
import { TAXI_ACCEPT, TAXI_LINES } from "../../content/taxi-lines";
import { NPCS } from "../../content/npcs";
import { prefetchSituations } from "../../content/situations/catalog";
import { useStore } from "../../state/store";
import { countPlay } from "../../state/playStats";
import { sendStat } from "../../state/stats";
import { audio } from "../audio";
import { createCharacter, type GameCharacter } from "../characters";
import { ModeDialogue, type KitLine } from "../kit/dialogue";
import { actionHelp, updateHelp, type HelpLevel } from "../kit/help";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases } from "../kit/phrases";
import { controlsFrom } from "../rides/drive";
import type { Ride } from "../rides/Rides";
import type { Door, StandTaxi } from "../world/town";
import { carModelEntry } from "../world/carModels";
import { CAR_SEATS } from "../rides/shapes";
import { approach, approachDistance, checkDecision, resetPose, taxiScore, type TaxiRoute } from "./route";
import { resetTaxiUi, useTaxi } from "./store";

type Phase = "opening" | "drive" | "wrong" | "passed" | "closing" | "result";
type Run = {
  route: TaxiRoute; door: Door; phase: Phase; index: number; first: number; missed: boolean; stopMiss: boolean; hardStop: boolean;
  crashes: number; collision: boolean; nearTime: number; spoken: boolean; pending: boolean;
  passTime: number; help: HelpLevel; kept: Map<string, KitLine>; cue: KitLine | null;
};

const { situation, npc } = TAXI_CONVERSATION;
const drivingKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "]);
const taxiModel = carModelEntry(TAXI_CAR.model);
const wheelRadius = 0.3 * taxiModel.scale[2];

export function createTaxiMode(host: ModeHost) {
  const stand = host.standTaxi;
  return stand && NPCS[npc] && TAXI_ROUTES.length ? new TaxiMode(host, stand) : null;
}

class TaxiMode implements GameMode {
  readonly id = "taxi";
  readonly cleanScreen = "menu";
  readonly exitLabel = TAXI_UI.exit;
  readonly camera = "follow";
  readonly conversation = { situation, label: TAXI_UI.start };
  private run: Run | null = null;
  private passenger: GameCharacter | null = null;
  readonly car: Ride;
  private wheels?: THREE.Object3D[];
  private assist = false;
  private marker = new THREE.Group();
  private ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.84, 36).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.85, depthWrite: false }));
  private halo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 36).rotateX(-Math.PI / 2), this.ring.material.clone());
  private highlight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.23, depthWrite: false }));
  private markerTime = 0;
  private dialogue = new ModeDialogue({
    say: (line) => useTaxi.setState({ line }),
    choices: (choices) => useTaxi.setState({ choices }),
    mic: (mic) => useTaxi.setState({ mic }),
    animate: (seconds) => this.passenger?.talk(seconds, () => audio.level(), () => audio.vowel()),
  });

  constructor(private host: ModeHost, private stand: StandTaxi) {
    this.car = host.rides.createModeCar(TAXI_CAR, stand.root);
    this.marker.position.set(this.car.home.x, 0.04, this.car.home.z + 1.85);
    this.marker.add(this.ring, this.halo);
    this.highlight.visible = false;
    host.add(this.marker, this.highlight);
  }

  get active() { return this.run !== null; }
  get route() { return this.run?.route; }

  tick(dt: number, outdoors: boolean) {
    this.marker.visible = outdoors && !this.active;
    if (!this.marker.visible) return;
    this.markerTime = (this.markerTime + dt * 0.7) % 1;
    this.halo.scale.setScalar(1 + this.markerTime * 0.6);
    this.halo.material.opacity = 0.45 * (1 - this.markerTime);
  }

  prompt(x: number, z: number) {
    const distance = Math.hypot(x - this.marker.position.x, z - this.marker.position.z);
    if (distance > 2.5) return null;
    prefetchSituations([situation]);
    return { distance, label: TAXI_UI.start, kind: "taxi" } as const;
  }

  start() {
    if (!this.host.canStart(true) || this.active) return false;
    prefetchSituations([situation]);
    return this.host.fade(() => { if (this.host.owns(this.id)) this.launch(); });
  }

  private launch() {
    const progress = useStore.getState().progress;
    const next = progress.taxi?.nextRoute ?? 0;
    const index = Number.isInteger(next) && next >= 0 ? next % TAXI_ROUTES.length : 0;
    const route = TAXI_ROUTES[index];
    const door = this.host.doors.find((d) => d.loc === route.destination);
    if (!door) { this.host.left(this.id); return; }

    const { x, z, rot } = route.start;
    this.host.prepare();
    const player = this.host.player().root.position;
    if (Math.hypot(player.x - x, player.z - z) > 5) this.host.place(x, z + 2.5, rot);
    this.host.rides.resetPosition(this.car, route.start);
    if (!this.host.board(this.car)) { this.host.left(this.id); return; }
    this.host.snapRide(this.car);
    this.host.hideNpc(npc, true);
    this.passenger = createCharacter(NPCS[npc].look);
    this.passenger.root.traverse((part) => { part.castShadow = false; });
    this.passenger.fidgets = false;
    this.passenger.seatY = CAR_SEATS.seat;
    this.passenger.recline = 0.12;
    this.passenger.setAnim("sit");
    this.car.mesh.add(this.passenger.root);
    this.passenger.root.position.set(-0.43, CAR_SEATS.floor, -0.91);
    this.assist = false;
    const help = progress.miniGameHelp?.[this.id]?.level ?? 0;
    resetTaxiUi();
    useTaxi.setState({ micOn: this.dialogue.micOn, gloss: help === 0 });
    const run: Run = {
      route, door, phase: "opening", index: 0, first: 0, missed: false, stopMiss: false, hardStop: false, crashes: 0, collision: false,
      nearTime: 0, spoken: false, pending: false, passTime: 0, help, kept: new Map(), cue: null,
    };
    this.run = run;
    this.host.entered(this.id);
    useStore.getState().setHud({ ride: "taxi" });
    useStore.getState().updateProgress((p) => { p.taxi = { nextRoute: (index + 1) % TAXI_ROUTES.length }; });
    void this.opening(run);
  }

  private say(key: string) { return this.dialogue.say(situation, npc, key, TAXI_LINES); }

  private async answer(run: Run, key: string) {
    const answer = await this.dialogue.expect(situation, npc, [key], TAXI_LINES, TAXI_ACCEPT);
    if (answer && this.run === run) run.kept.set(answer.key, answer);
    return !!answer && this.run === run;
  }

  private async opening(run: Run) {
    if (!await this.say("tx_hello") || this.run !== run) return;
    if (!await this.answer(run, "tx_a_where")) return;
    if (!await this.say(`tx_${run.route.id}_dest`) || this.run !== run) return;
    run.phase = "drive";
  }

  private async cue(run: Run) {
    run.spoken = true;
    run.pending = true;
    run.nearTime = 0;
    run.cue = await this.say(run.route.decisions[run.index].key);
    run.pending = false;
  }

  private async wrong(run: Run) {
    this.miss(run);
    if (run.route.decisions[run.index].action === "stop") run.stopMiss = true;
    run.phase = "wrong";
    useTaxi.setState({ gloss: run.help === 0 });
    if (await this.say("tx_wrong") && this.run === run) this.resetDecision(run);
  }

  private async passed(run: Run) {
    run.stopMiss = true;
    this.miss(run);
    run.phase = "passed";
    run.passTime = 0;
    run.pending = true;
    await this.say("tx_passed");
    run.pending = false;
  }

  private miss(run: Run) {
    run.missed = true;
    this.train(run, false);
  }

  private train(run: Run, clean: boolean) {
    useStore.getState().updateProgress((p) => {
      const help = updateHelp(p.miniGameHelp?.[this.id], clean);
      p.miniGameHelp = { ...p.miniGameHelp, [this.id]: help };
      run.help = help.level;
    });
  }

  private resetDecision(run: Run) {
    this.host.fade(() => {
      if (this.run !== run) return;
      this.host.rides.resetPosition(this.car, resetPose(approach(run.route, run.index)));
      this.host.snapRide(this.car);
      this.assist = false;
      run.phase = "drive";
      run.spoken = false;
      run.cue = null;
    });
  }

  private async closing(run: Run) {
    const { route } = run;
    const score = taxiScore(route.decisions.length - 1, run.first, !run.stopMiss && !run.hardStop, run.crashes);
    const prefix = `tx_${route.id}`;
    if (!await this.answer(run, "tx_a_here")) return;
    if (!await this.say("tx_owe") || this.run !== run) return;
    if (!await this.answer(run, `${prefix}_a_fare`)) return;
    if (!await this.say(`${prefix}_tip_${score.tier}`) || this.run !== run) return;
    audio.sfx("coin");
    if (!await this.answer(run, "tx_a_bye")) return;
    if (!await this.say("tx_bye") || this.run !== run) return;

    this.host.fade(() => {
      if (this.run !== run) return;
      this.clearPassenger();
      const { door } = run;
      this.host.dismount(door.outX, door.outZ, door.rot);
      this.dialogue.clearLine();
      keepPhrases(situation, [...run.kept.values()].map((line) => line.sentence));
      useTaxi.setState({ result: { ...score, fare: route.fare, tip: route.tips[score.tier], onTarget: !run.stopMiss, cards: run.kept.size } });
      run.phase = "result";
      countPlay("games", this.id);
      sendStat("taxi", { section: route.id, n: score.points });
    });
  }

  private clearPassenger() {
    if (!this.passenger) return;
    this.passenger.root.removeFromParent();
    this.passenger.dispose?.();
    this.passenger = null;
    this.host.hideNpc(npc, false);
  }

  update({ dt, x, y, brake, blocked }: ModeFrame) {
    const run = this.run;
    if (!run || run.phase === "result") return;
    if (this.host.rides.riding !== this.car) { this.exit(true); return; }
    this.dialogue.update(dt, blocked);
    const drive = run.phase === "drive" || run.phase === "passed";
    const m = this.car.m, previousPace = m.pace;
    const step = run.route.decisions[run.index];
    if (drive && this.assist && useTaxi.getState().action) {
      x = step.action === "left" ? -1 : step.action === "right" ? 1 : 0;
      y = step.action === "stop" ? 0 : 1;
      brake = step.action === "stop";
    }
    const controls = drive && !blocked ? controlsFrom(x, y, brake) : null;
    this.host.drive(dt, controls);
    const { instance } = this.stand;
    if (!this.wheels && instance) {
      this.wheels = taxiModel.wheelNodes.map((name) => instance.getObjectByName(name)!);
    }
    this.wheels?.forEach((wheel) => wheel.rotateX(m.speed * dt / wheelRadius));
    this.passenger?.update(dt);
    if (!drive || blocked) { this.showHelp(run, false); return; }

    const bumped = m.bump > 0.3;
    if (bumped && !run.collision) { run.crashes++; this.train(run, false); }
    run.collision = bumped;

    const path = approach(run.route, run.index);
    const { remaining, nearest } = approachDistance(path, m);
    const result = checkDecision(run.route, run.index, m);
    if (!run.spoken && (remaining <= 50 || result === "wrong")) void this.cue(run);
    if (!run.spoken) return;

    const near = remaining <= (step.action === "stop" ? 25 : 18) && nearest < 18;
    run.nearTime = near ? run.nearTime + dt : 0;
    this.showHelp(run, near && run.phase === "drive");
    if (step.action === "stop" && near && remaining <= 5 && (controls?.brake || (controls?.throttle ?? 0) < 0)
      && previousPace > 2.5 && previousPace - m.pace > 9 * dt) run.hardStop = true;
    if (run.pending) return;

    if (result === "stopped") {
      if (run.cue) run.kept.set(run.cue.key, run.cue);
      if (!run.missed) this.train(run, !run.hardStop);
      run.phase = "closing";
      this.showHelp(run, false);
      void this.closing(run);
    } else if (run.phase === "passed") {
      run.passTime += dt;
      if (run.passTime >= 5) this.resetDecision(run);
    } else if (result === "passed") {
      void this.passed(run);
    } else if (result === "wrong") {
      void this.wrong(run);
    } else if (result === "followed") {
      if (run.cue) run.kept.set(run.cue.key, run.cue);
      if (!run.missed) { run.first++; this.train(run, true); }
      run.index++;
      run.missed = run.spoken = false;
      this.assist = false;
      this.showHelp(run, false);
    }
  }

  private showHelp(run: Run, near: boolean) {
    const help = actionHelp(run.help, run.nearTime);
    const step = run.route.decisions[run.index];
    const action = near && help.action ? step.action : null;
    const ui = useTaxi.getState();
    if (ui.action !== action || ui.gloss !== help.gloss) useTaxi.setState({ action, gloss: help.gloss });
    this.highlight.visible = !!action;
    if (!action) return;
    const path = approach(run.route, run.index);
    const prev = path[path.length - 2], next = run.route.decisions[run.index + 1];
    const goal = action === "stop" || action === "straight" ? step.at : next.via?.[0] ?? next.at;
    const origin = action === "stop" || action === "straight" ? prev : step.at;
    const z = goal.z - origin.z, x = goal.x - origin.x, yaw = Math.atan2(x, z);
    const ahead = action === "stop" ? 0 : 7;
    this.highlight.position.set(step.at.x + Math.sin(yaw) * ahead, 0.045, step.at.z + Math.cos(yaw) * ahead);
    this.highlight.rotation.y = yaw;
    this.highlight.scale.set(action === "stop" ? 3.6 : 2.15, 1, 8);
  }

  input(input: ModeInput) {
    if (!this.run) return false;
    if (input.kind !== "key") return true;
    const { key, keys, repeat } = input;
    const driving = this.run.phase === "drive" || this.run.phase === "passed";
    if (driving && drivingKeys.has(key)) { keys.add(key); return true; }
    if (key === "escape" && !repeat) this.exit(false);
    else if (!repeat && this.dialogue.key(key)) useTaxi.setState({ micOn: this.dialogue.micOn });
    else return false;
    return true;
  }

  action(name: string, value?: string | boolean) {
    if (name === "choose") this.dialogue.choose(String(value));
    else if (name === "mic") {
      this.dialogue.setMic(!!value);
      useTaxi.setState({ micOn: this.dialogue.micOn });
    } else if (name === "assist") this.assist = !!value;
    else if (name === "again" && this.run?.phase === "result") {
      this.host.fade(() => { if (this.active) { this.dialogue.cancel(); this.launch(); } });
    }
  }

  exit(immediate: boolean) {
    const run = this.run;
    if (!run) return;
    const leave = () => {
      if (this.run !== run) return;
      this.dialogue.cancel();
      this.clearPassenger();
      if (run.phase !== "result") {
        this.host.dismount();
      }
      this.run = null;
      this.assist = false;
      this.highlight.visible = false;
      resetTaxiUi();
      this.host.left(this.id);
    };
    if (immediate || run.phase === "result" || !this.host.fade(leave)) leave();
  }

  dispose() {
    this.host.rides.removeModeCar(this.car);
    if (this.stand.fallback.parent) this.stand.fallback.geometry.dispose();
    this.marker.removeFromParent();
    this.highlight.removeFromParent();
    for (const mesh of [this.ring, this.halo, this.highlight]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}
