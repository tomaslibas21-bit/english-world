import { Box3, Plane, Raycaster, Vector2, Vector3 } from "three";
import { BILLIARDS_LINES, BILLIARDS_NPC, BILLIARDS_SITUATION, GROUP_ANSWERS, GROUP_KEYS, REPLY_KEYS } from "../../content/billiards-lines";
import { EDITION } from "../../edition";
import { getSituation, loadSituation } from "../../content/situations/catalog";
import { L } from "../../ui/i18n";
import { NPCS } from "../../content/npcs";
import { npcVoice } from "../../content/voices";
import { countPlay } from "../../state/playStats";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import type { GameCharacter } from "../characters";
import { ModeDialogue, type KitLine } from "../kit/dialogue";
import { updateHelp, type HelpProgress } from "../kit/help";
import type { ModeHost } from "../kit/host";
import { conversationLine } from "../kit/lines";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases, PhraseRun } from "../kit/phrases";
import { rand } from "../world/util";
import { chooseShot } from "./ai";
import { parseCall, sayItCall, type Call } from "./calls";
import { SayItRound, type SayItCue } from "../kit/sayIt";
import { ballAt, distance, FOOT, ghostBall, HEAD, headingTo, moving, POCKET_IDS, POCKETS, RADIUS, shoot, STEP, stepBalls, type Ball, type Impact, type Point, type Pocket } from "./physics";
import { callable, isGroup, judgeShot, otherGroup, ownerGroup, rack, remaining, respot, type Group, type Side, type Winner } from "./rules";
import { resetBilliards, useBilliards, type Phase } from "./store";
import { FELT_Y, TABLE_X, TABLE_Z, TABLE_PROMPT, TINA_HOME, type TableView } from "./table";

export const BILLIARDS_PLACE = "pool-hall";
const OWNER = NPCS[BILLIARDS_NPC];
const PLAY = L("Žaisti biliardą");
const waitingSpots = { learner: { x: -TABLE_X - 1.0, z: -0.25 }, tina: { x: TABLE_X + 1.0, z: -0.25 } };
const tableStage = () => ({ pos: new Vector3(0, 4.86, 1.90), look: new Vector3(0, FELT_Y, 0), fov: 48, rate: 8 });
const PHRASES = ["rules_ex", "bl_call", "bl_which", "bl_nice", "bl_close", "bl_your_turn", "bl_wrong_pocket", "bl_scratch"];
const impactSound = { click: "poolClick", cushion: "poolCushion", drop: "poolDrop" } as const;
const ui = useBilliards.setState;
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const callKey = (call: Call) => `${call.ball}:${call.pocket}`;
const pocketId = (value: unknown): value is Pocket => typeof value === "string" && POCKET_IDS.includes(value as Pocket);

interface Round {
  balls: Ball[];
  random: () => number;
  group: Group | null;
  side: Side;
  shots: number;
  made: number;
  streak: number;
  listens: number;
  understood: number;
  sayIt: SayItRound;
  announced: Set<Side>;
  review: PhraseRun;
}
interface Shot {
  call: Call | null;
  eightAllowed: boolean;
  alreadyDown: Set<number>;
  power: number;
  windup: number;
  rest: number;
}

function line(key: string, learner = false): KitLine {
  const sentence = conversationLine(BILLIARDS_SITUATION, BILLIARDS_NPC, key, BILLIARDS_LINES, learner);
  if (!sentence) throw new Error(`Missing billiards line ${key}`);
  return { key, sentence };
}

function callLine(call: Call, learner: boolean): KitLine {
  const pieces = [line(`bl_b${call.ball}`, learner).sentence, line(`bl_p_${call.pocket}`, learner).sentence];
  return {
    key: callKey(call), pieces,
    sentence: {
      units: pieces.flatMap((piece) => piece.units),
      en: pieces.map((piece) => piece.en).join(" "),
      nat: pieces.map((piece) => piece.nat).join(" "),
      say: pieces.map((piece) => piece.say).join(" "),
    },
  };
}

export class BilliardsMode implements GameMode {
  readonly id = "billiards";
  readonly cleanScreen = "menu";
  readonly exitLabel = L("Baigti partiją");
  readonly camera = "stage";
  readonly indoorPrompt = true;
  readonly conversation = { situation: BILLIARDS_SITUATION, label: PLAY };

  private table: TableView | null = null;
  private round: Round | null = null;
  private phase: Phase = "intro";
  private selection: Partial<Call> = {};
  private ownCall: Call | null = null;
  private ai: ReturnType<typeof chooseShot> = null;
  private shot: Shot | null = null;
  private angle = Math.PI;
  private power = 0;
  private charge: number | null = null;
  private accumulator = 0;
  /** The shot being fired is the break (its recording plays once with the strike). */
  private breaking = false;
  private listened = 0;
  private answerDelay = 0;
  private afterFeedback: (() => void) | null = null;
  private replyDelay = 0;
  private heardCall = false;
  private scoreFraming = false;
  private replaying = false;
  private selecting = false;
  private saidYourTurn = false;
  private help: HelpProgress = { level: 0, streak: 0 };
  private raycaster = new Raycaster();
  private felt = new Plane(new Vector3(0, 1, 0), -FELT_Y);
  private viewport = new Vector2();
  private hit = new Vector3();
  private cueTarget = new Vector3();
  private lastImpact: Record<Impact, number> = { click: 0, cushion: 0, drop: 0 };
  private actorBox = new Box3();
  private frameBox = new Box3(new Vector3(-TABLE_X - 0.01, FELT_Y - 0.03, -TABLE_Z - 0.01),
    new Vector3(TABLE_X + 0.01, FELT_Y + 0.075, TABLE_Z + 0.01));
  private dialogue = new ModeDialogue({
    allowBrowserVoice: true, framePlayback: true,
    say: (line) => {
      if (line && (this.phase === "intro" || this.phase === "reply" || this.phase === "result"
        || (this.phase === "tina" && !useBilliards.getState().call))) this.round?.review.add(line.sentence);
      ui({ line });
    },
    choices: (choices) => {
      if (this.phase === "group" || this.phase === "reply") this.round?.review.lines(choices);
      ui({ choices });
    },
    mic: (mic) => ui({ mic }),
    animate: (seconds) => this.world.tina()?.talk(seconds, () => audio.level(), () => audio.vowel()),
  });

  constructor(private host: ModeHost, private world: {
    table(): TableView | null;
    tina(): GameCharacter | undefined;
    place(x: number, z: number, rot: number): void;
    save(): void;
  }) {}

  get active() { return this.table !== null; }
  /** Tina / Don Memo is staged by the game while it runs; the town's idle loop leaves them alone. */
  controlsNpc(id: string) { return this.active && id === BILLIARDS_NPC; }

  available() { return !!this.world.table(); }
  prompt(x: number, z: number) {
    const d = Math.hypot(x - TABLE_PROMPT.x, z - TABLE_PROMPT.z);
    return this.available() && d < 1.07 ? { distance: d, kind: "billiards" as const, label: PLAY, hint: BILLIARDS_NPC === "tina" ? L("Su Tina") : L("Su Don Memu") } : null;
  }

  event(name: string, data: unknown) {
    if (name !== this.id) return;
    const group = (data as { group?: unknown } | null)?.group;
    if (isGroup(group)) return group;
  }

  start(option?: string) {
    if (this.active || !this.host.canStart(true)) return false;
    const table = this.world.table();
    if (!table) return false;
    this.table = table;
    this.host.prepare();
    const tinaCue = this.world.tina()?.rightHand.getObjectByName("billiards-owner-cue");
    if (tinaCue) tinaCue.visible = false;
    this.world.place(waitingSpots.learner.x, waitingSpots.learner.z, Math.PI);
    this.host.entered(this.id);
    this.saidYourTurn = false;
    this.host.rig.mode = "stage";
    this.newRack(isGroup(option) ? option : null);
    return true;
  }

  private newRack(group: Group | null) {
    const seed = 401 + (useStore.getState().progress.play?.games?.billiards ?? 0);
    this.host.rig.stage = tableStage();
    this.host.rig.stageSnap();
    countPlay("games", this.id);
    const round: Round = { balls: rack(seed), random: rand(seed + 6013), group, side: "learner",
      shots: 0, made: 0, streak: 0, listens: 0, understood: 0, sayIt: new SayItRound(), announced: new Set(),
      review: new PhraseRun(BILLIARDS_SITUATION) };
    this.round = round;
    this.dialogue.cancel();
    this.dialogue.micOn = true;
    resetBilliards();
    this.ownCall = this.ai = this.shot = null;
    this.afterFeedback = null;
    this.answerDelay = this.replyDelay = 0;
    this.charge = null;
    this.power = 0;
    this.angle = Math.PI;
    this.scoreFraming = false;
    this.replaying = false;
    this.selecting = false;
    this.table!.setRack(round.balls);
    this.table!.hideAim();
    this.table!.indicate(null, null, false);
    this.setPhase("intro");
    this.updateRows();
    const open = () => {
      if (round !== this.round) return;
      ui({ pockets: POCKET_IDS.map((id) => ({ id, line: line(`bl_p_${id}`, true) })) });
      void this.open(round);
    };
    if (EDITION.id === "es" && EDITION.helper === "lt" && !getSituation(BILLIARDS_SITUATION)) {
      void loadSituation(BILLIARDS_SITUATION).then(open, open);
    } else open();
  }

  private setPhase(phase: Phase, sayIt: SayItCue | null = null) {
    if (phase !== "listen") this.round?.sayIt.close();
    this.phase = phase;
    if (phase === "call" || phase === "listen") {
      for (const { line } of useBilliards.getState().pockets) this.round?.review.add(line.sentence);
    }
    ui({ phase, sayIt });
  }

  private say(key: string) { return this.dialogue.say(BILLIARDS_SITUATION, BILLIARDS_NPC, key, BILLIARDS_LINES); }

  private async sayAll(round: Round, keys: string[]) {
    for (const key of keys) {
      if (round !== this.round) return false;
      await this.say(key);
    }
    return round === this.round;
  }

  private async open(round: Round) {
    if (!round.group) {
      await this.say("bl_which");
      if (round !== this.round) return;
      this.setPhase("group");
      const chosen = await this.dialogue.expect(BILLIARDS_SITUATION, BILLIARDS_NPC, [...GROUP_KEYS], BILLIARDS_LINES, GROUP_ANSWERS);
      if (round !== this.round || !chosen) return;
      round.group = chosen.key === GROUP_KEYS[0] ? "solids" : "stripes";
      this.updateRows();
    }
    if (!await this.sayAll(round, [`bl_${round.group}`, "bl_break"])) return;
    this.dialogue.clearLine();
    this.angle = headingTo(round.balls[0], round.balls[1]);
    this.setPower(0);
    ui({ aimHelp: true });
    this.setPhase("break");
    audio.sfx("chalk"); // the cue chalked before the break
  }

  private group(side: Side) {
    const group = this.round!.group!;
    return side === "learner" ? group : otherGroup(group);
  }

  private validBalls() {
    return callable(this.round!.balls, this.group(this.round!.side));
  }

  private updateRows() {
    const round = this.round!;
    const row = (side: Side) => round.group ? round.balls.filter((b) => ownerGroup(b.id) === this.group(side))
      .sort((a, b) => a.id - b.id).map((ball) => ({ id: ball.id, down: !!ball.pocket })) : [];
    ui({ balls: { learner: row("learner"), tina: row("tina") } });
  }

  private async learnerTurn(round: Round) {
    const announce: string[] = [];
    if (!this.saidYourTurn) {
      announce.push("bl_your_turn");
      this.saidYourTurn = true;
    }
    if (round.shots < 2) announce.push("bl_call");
    if (!await this.sayAll(round, announce)) return;
    this.dialogue.clearLine();
    const options = this.validBalls().flatMap(({ id }) => POCKET_IDS.map((pocket) => callLine({ ball: id, pocket }, true)));
    const byKey = new Map(options.map((option) => [option.key, option]));
    this.setPhase("call");
    ui({ available: this.validBalls().map(({ id }) => id), callOptions: options });
    this.table!.markCall(round.balls, {}, true);
    const option = await this.dialogue.expectLines(options, {
      phrases: options.map(({ sentence }) => sentence.en),
      read: (text) => {
        const call = parseCall(text);
        const answer = call ? byKey.get(callKey(call)) : undefined;
        return { answer, verdict: answer ? "complete" : "prefix" };
      },
    });
    if (round !== this.round || !option) return;
    const call = parseCall(option.sentence.en)!;
    this.ownCall = call;
    this.selecting = false;
    const target = round.balls.find(({ id }) => id === call.ball)!;
    this.angle = headingTo(round.balls[0], round.shots < 2 ? ghostBall(target, call.pocket) : target);
    this.table!.markCall(round.balls, call, false);
    round.review.add(option.sentence);
    ui({ call: option, selection: call, aimHelp: round.shots < 1 });
    this.setPhase("aim");
  }

  private revealCall() {
    const reveal = !this.heardCall || this.help.level === 0 || (this.help.level === 1 && this.listened >= 2);
    const { call } = useBilliards.getState();
    if (reveal && call) this.round?.review.add(call.sentence);
    ui({ reveal });
  }

  private async tinaTurn(round: Round, announceEight: boolean) {
    this.setPhase("tina");
    if (!await this.sayAll(round, announceEight ? ["bl_my_turn", "bl_eight"] : ["bl_my_turn"])) return;
    this.ai = chooseShot(round.balls, this.group("tina"), round.random);
    if (!this.ai) return;
    this.angle = this.ai.angle;
    this.selection = {};
    this.listened = 0;
    this.heardCall = true;
    const call = callLine(this.ai.call, false);
    if (this.help.level === 0) round.review.add(call.sentence);
    ui({ call, selection: {}, reveal: this.help.level === 0, available: this.validBalls().map(({ id }) => id) });
    this.heardCall = await this.dialogue.sayPieces(call, npcVoice(OWNER), OWNER.speed ?? 1, OWNER.gender === "m");
    if (round !== this.round) return;
    this.revealCall();
    this.setPhase("listen", round.sayIt.open(sayItCall(this.ai.call, call.sentence.en)));
    this.table!.markCall(round.balls, {}, true);
  }

  private async replay() {
    if (this.phase !== "listen" || this.replaying || !this.ai) return;
    const round = this.round;
    useBilliards.getState().sayIt?.cancel();
    this.replaying = true;
    ui({ replaying: true });
    const heard = await this.dialogue.sayPieces(callLine(this.ai.call, false), npcVoice(OWNER), OWNER.speed ?? 1, OWNER.gender === "m");
    if (round !== this.round) return;
    this.replaying = false;
    this.heardCall ||= heard;
    ui({ replaying: false });
    if (this.phase === "listen") this.revealCall();
  }

  private async nextTurn(round: Round, side: Side) {
    this.selection = {};
    this.ownCall = null;
    this.ai = null;
    ui({ side, available: [], selection: {}, call: null, correct: null, reveal: false });
    this.setPhase("intro");
    round.side = side;
    const announceEight = !round.announced.has(side) && !remaining(round.balls, this.group(side)).length;
    if (announceEight) round.announced.add(side);
    if (side === "tina") {
      await this.tinaTurn(round, announceEight);
    } else if (!announceEight || await this.sayAll(round, ["bl_eight"])) {
      await this.learnerTurn(round);
    }
  }

  private select(pick: Partial<Call>) {
    if (!this.round || this.selecting || (this.phase !== "call" && this.phase !== "listen") || this.replaying) return;
    if (pick.ball !== undefined && !this.validBalls().some(({ id }) => id === pick.ball)) return;
    this.selection = { ...this.selection, ...pick };
    const { ball, pocket } = this.selection;
    ui({ selection: { ...this.selection } });
    if (ball !== undefined && pocket !== undefined) {
      if (this.phase === "listen") {
        this.finishListening({ ball, pocket });
        return;
      }
      const call = callLine({ ball, pocket }, true);
      this.round.review.add(call.sentence);
      ui({ call });
    }
    this.table!.markCall(this.round.balls, this.selection, true);
  }

  private confirmCall() {
    const { ball, pocket } = this.selection;
    if (this.phase !== "call" || this.selecting || ball === undefined || pocket === undefined) return;
    this.selecting = true;
    this.dialogue.choose(callKey({ ball, pocket }));
  }

  private finishListening(answer: Call) {
    const round = this.round!, ai = this.ai!;
    const correct = answer.ball === ai.call.ball && answer.pocket === ai.call.pocket;
    round.listens++;
    if (correct) round.understood++;
    this.help = updateHelp(this.help, correct);
    const { call } = useBilliards.getState();
    if (call) round.review.add(call.sentence);
    this.setPhase("feedback");
    this.table!.markCall(round.balls, ai.call, false);
    ui({ correct, reveal: !correct });
    audio.sfx(correct ? "success" : "soft");
    this.answerDelay = correct ? 1.5 : 2.45;  // (a right answer shows the call too: time to read it)
    this.afterFeedback = () => this.fire(ai.power, ai.call);
  }

  private setPower(value: number) {
    if (value === this.power) return;
    this.power = value;
    ui({ power: value });
  }

  private get aiming() { return this.phase === "aim" || this.phase === "break"; }

  private fire(power: number, call: Call | null) {
    if (!this.round || this.shot || !Number.isFinite(power)) return;
    const { balls, side } = this.round;
    if (side === "learner" && call) this.round.shots++;
    this.charge = null;
    this.shot = {
      power: clamp(power, 0.055, 1), windup: 0.17, rest: 0, call,
      eightAllowed: !!call && call.ball === 8 && !remaining(balls, this.group(side)).length,
      alreadyDown: new Set(balls.filter((ball) => ball.pocket).map((ball) => ball.id)),
    };
    this.accumulator = 0;
    this.table!.hideAim();
    this.breaking = this.phase === "break";
    this.setPhase("rolling");
  }

  private async finishShot(round: Round, shot: Shot) {
    this.shot = null;
    this.setPower(0);
    this.table!.hideAim();
    this.table!.indicate(null, null, false);
    const sunk = new Set(round.balls.filter((ball) => ball.pocket && !shot.alreadyDown.has(ball.id)).map((ball) => ball.id));
    const judgement = judgeShot(round.balls, { ...shot, sunk, side: round.side, group: this.group(round.side), number: round.shots });
    const cues: string[] = [];
    if (judgement.scratch) {
      cues.push("bl_scratch");
      respot(round.balls[0], round.balls, HEAD);
    }
    if (judgement.eightBack) {
      cues.push("bl_eight_back");
      respot(round.balls.find(({ id }) => id === 8)!, round.balls, FOOT);
    }
    if (round.side === "learner") {
      round.streak = judgement.scored ? round.streak + 1 : 0;
      if (judgement.scored && shot.call) {
        round.made++;
        this.table!.showPoint(shot.call.pocket);
        cues.push(round.streak > 1 ? "bl_again" : "bl_nice");
      } else if (judgement.wrongPocket) cues.push("bl_wrong_pocket");
      else if (judgement.wrongBall) cues.push("bl_wrong_ball");
      else if (shot.call && sunk.size === 0) {
        const called = round.balls.find(({ id }) => id === shot.call!.ball)!;
        if (distance(called, POCKETS[shot.call.pocket]) <= 0.15) cues.push("bl_close");
      }
    } else cues.push(judgement.scored ? "bl_yes" : "bl_missed");
    this.updateRows();
    if (judgement.time) cues.push("bl_time");
    ui({ call: null, reveal: false, correct: null });
    this.setPhase("intro");
    if (!await this.sayAll(round, cues)) return;
    if (judgement.winner) await this.finish(round, judgement.winner);
    else await this.nextTurn(round, judgement.next);
  }

  private async finish(round: Round, winner: Winner) {
    const key = winner === "learner" ? "bl_you_win" : winner === "tina" ? "bl_i_win" : "bl_tie";
    if (winner === "learner") audio.sfx("winSting");
    if (!await this.sayAll(round, [key])) return;
    this.setPhase("reply");
    this.replyDelay = 8;
    await this.dialogue.expect(BILLIARDS_SITUATION, BILLIARDS_NPC, [...REPLY_KEYS], BILLIARDS_LINES);
    if (round !== this.round || !await this.sayAll(round, ["bl_thanks"])) return;
    const phrases = [...PHRASES, key].map((key) => line(key).sentence);
    keepPhrases(BILLIARDS_SITUATION, phrases);
    this.setPhase("result");
    const tina = this.world.tina();
    const shot = this.host.scoreShot(tina ? new Box3().setFromObject(tina.root) : undefined);
    // The dollhouse is open on its near side. Skip a score camera whose view would cross a wall.
    if (shot && (shot.pos.y >= 4.2 || (shot.pos.z > 5 && Math.abs(shot.pos.x) < 5.0))) {
      this.scoreFraming = true;
      this.host.rig.cam.zoom = 1;
      this.host.rig.cam.clearViewOffset();
      this.host.rig.stage = shot;
    }
    const rematch = this.say("bl_rematch");
    ui({ result: { winner, shots: round.shots, called: round.made, listens: round.listens, understood: round.understood,
      sunk: 4 - remaining(round.balls, this.group("learner")).length, cards: phrases.length, review: round.review.finish(), ...round.sayIt.result } });
    await rematch;
  }

  private advanceShot(dt: number, withSound: boolean) {
    const round = this.round!, shot = this.shot!, balls = round.balls;
    if (shot.windup > 0) {
      shot.windup = Math.max(0, shot.windup - dt);
      if (shot.windup > 0) {
        const t = shot.windup / 0.17;
        this.table!.drawCue(balls[0], this.angle, RADIUS + (0.04 + 0.21 * shot.power) * t);
        return;
      }
      this.table!.hideAim();
      shoot(balls[0], this.angle, shot.power);
      if (withSound) audio.sfx("cueStrike", shot.power);
      // the rack bursting apart: a recording of a real break under the clicks the balls make
      if (withSound && this.breaking) audio.sfx("breakShot", 0.5 + 0.5 * shot.power);
      this.breaking = false;
    }
    this.accumulator += dt;
    while (this.accumulator + 1e-10 >= STEP) {
      this.accumulator -= STEP;
      stepBalls(balls, withSound ? (kind, speed) => {
        const now = this.host.time();
        if (now - this.lastImpact[kind] < 0.035) return;
        this.lastImpact[kind] = now;
        audio.sfx(impactSound[kind], clamp(speed / 2.5, 0.16, 1));
      } : undefined);
    }
    if (moving(balls)) shot.rest = 0;
    else if ((shot.rest += dt) >= 0.26) void this.finishShot(round, shot);
  }

  private pose(dt: number) {
    const { balls, side } = this.round!;
    const cue = balls[0];
    const player = this.host.player(), tina = this.world.tina();
    const takingShot = this.aiming || (this.shot?.windup ?? 0) > 0;
    const slide = 1 - Math.exp(-dt * 11);
    const stand = (actor: GameCharacter, who: Side) => {
      let at: Point = waitingSpots[who];
      if (who === side && takingShot) {
        const x = cue.x - Math.sin(this.angle) * 0.98;
        const z = cue.z - Math.cos(this.angle) * 0.98;
        // The near end is underneath the camera. Approach from a long side there.
        if (z < -TABLE_Z - 0.52) at = { x, z };
        else {
          const edge = Math.abs(x) > 0.1 ? Math.sign(x) : Math.sign(at.x);
          at = { x: edge * Math.max(TABLE_X + 0.72, Math.abs(x)), z: clamp(z, -1.36, 0.78) };
        }
      }
      actor.root.position.lerp(this.cueTarget.set(at.x, 0, at.z), slide);
      actor.root.rotation.y = headingTo(actor.root.position, cue);
    };
    stand(player, "learner");
    if (tina) {
      stand(tina, "tina");
      tina.update(dt);
    }
    this.host.updatePose(dt, player.root.rotation.y);
  }

  update({ dt, blocked }: ModeFrame) {
    const round = this.round;
    if (!round) return;
    this.dialogue.update(dt, blocked || document.hidden);
    if (blocked || document.hidden) return;
    if (this.charge !== null) {
      this.charge += dt;
      const cycle = (this.charge / 1.2) % 2;
      this.setPower(cycle <= 1 ? cycle : 2 - cycle);
    }
    if (this.phase === "listen" && this.help.level === 1 && this.listened < 2) {
      this.listened += dt;
      if (this.listened >= 2) this.revealCall();
    }
    if (this.phase === "feedback" && (this.answerDelay -= dt) <= 0) {
      const after = this.afterFeedback;
      this.afterFeedback = null;
      after?.();
    }
    if (this.phase === "reply" && (this.replyDelay -= dt) <= 0) this.dialogue.skipTurn();
    if (this.shot) this.advanceShot(dt, true);
    this.table!.sync(round.balls, dt);
    if (this.shot?.call) this.table!.markCall(round.balls, this.shot.call, false);
    if (this.aiming) this.table!.drawAim(round.balls, this.angle, this.power);
    this.pose(dt);
  }

  input(input: ModeInput) {
    if (input.kind !== "key") return true;
    const { key, repeat } = input;
    if (key === "escape") { this.exit(); return true; }
    if (this.aiming) {
      if (key === " ") {
        if (!repeat && this.charge === null) this.charge = 0;
        return true;
      }
      if (key === "arrowleft" || key === "arrowright") {
        this.nudge((key === "arrowleft" ? -1 : 1) * (input.shift ? 0.1 : 0.5));
        return true;
      }
    }
    if (key === "m" && ["call", "group", "reply"].includes(this.phase) && this.dialogue.key(key)) {
      ui({ micOn: this.dialogue.micOn });
      return true;
    }
    return (this.phase === "group" || this.phase === "reply") && this.dialogue.key(key);
  }

  release(key: string, cancel = false) {
    if (key !== " " || this.charge === null) return false;
    this.charge = null;
    const power = this.power;
    if (!cancel && this.aiming && power >= 0.04) this.fire(power, this.ownCall);
    else this.setPower(0);
    return true;
  }

  private nudge(degrees: number) {
    if (this.aiming && Number.isFinite(degrees)) this.angle -= degrees * Math.PI / 180;
  }

  private tableTap(x: number, y: number) {
    const round = this.round!;
    const camera = this.host.rig.cam;
    this.viewport.set(2 * x / window.innerWidth - 1, 1 - 2 * y / window.innerHeight);
    this.raycaster.setFromCamera(this.viewport, camera);
    if (!this.raycaster.ray.intersectPlane(this.felt, this.hit)) return;
    if (Math.abs(this.hit.x) > TABLE_X + 0.055 || Math.abs(this.hit.z) > TABLE_Z + 0.055) return;
    if (this.aiming) {
      if (distance(round.balls[0], this.hit) > 0.025) this.angle = headingTo(round.balls[0], this.hit);
      return;
    }
    if (this.phase !== "listen" && this.phase !== "call") return;
    const point = (p: Point, height: number) => this.cueTarget.set(p.x, height, p.z).project(camera);
    const pixels = (p: Vector3) => Math.hypot((p.x - this.viewport.x) * window.innerWidth / 2, (p.y - this.viewport.y) * window.innerHeight / 2);
    const pocket = POCKET_IDS.find((id) => pixels(point(POCKETS[id], FELT_Y)) < 19);
    if (pocket) { this.select({ pocket }); return; }
    const balls = this.validBalls().map((ball) => ({ ball, px: pixels(point(ball, FELT_Y + RADIUS)) }));
    balls.sort((a, b) => a.px - b.px);
    if (balls[0]?.px < 20) this.select({ ball: balls[0].ball.id });
  }

  action(name: string, value?: string | boolean) {
    if (!this.round) return;
    if (name === "ball") this.select({ ball: Number(value) });
    else if (name === "pocket" && pocketId(value)) this.select({ pocket: value });
    else if (name === "confirm") this.confirmCall();
    else if (name === "replay") void this.replay();
    else if (name === "choice" && typeof value === "string") this.dialogue.choose(value);
    else if (name === "skip" && this.phase === "reply") this.dialogue.skipTurn();
    else if (name === "again" && this.phase === "result") this.newRack(this.round.group);
    else if (name === "nudge") this.nudge(Number(value));
    else if (name === "power" && this.aiming && this.charge === null) this.setPower(clamp(Number(value) || 0, 0, 1));
    else if (name === "shoot" && this.aiming && this.charge === null) {
      if (this.power >= 0.04) this.fire(this.power, this.ownCall);
      else this.setPower(0);
    } else if (name === "tap" && typeof value === "string") {
      const [x, y] = value.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) this.tableTap(x, y);
    }
  }

  frameView(width: number, height: number, free: DOMRect | undefined) {
    if (this.scoreFraming) {
      const rig = this.host.rig;
      rig.applyViewShift(width, height, 0, height * (rig.stage?.shiftY ?? 0));
      this.host.player().root.visible = true;
      const tina = this.world.tina();
      if (tina) tina.root.visible = true;
      return;
    }
    if (!free || !width || !height || free.height < 10) return;
    const camera = this.host.rig.cam;
    camera.zoom = 1;
    camera.clearViewOffset();
    camera.updateMatrixWorld();
    const bounds = this.tableBounds(width, height);
    const zoom = clamp(Math.min((free.width - 12) / bounds.width, (free.height - 12) / bounds.height), 0.1, 2.3);
    camera.zoom = zoom;
    const x = (bounds.left + bounds.width / 2 - width / 2) * zoom + width / 2 - (free.left + free.width / 2);
    const y = (bounds.top + bounds.height / 2 - height / 2) * zoom + height / 2 - (free.top + free.height / 2);
    camera.setViewOffset(width, height, x, y, width, height);
    const table = this.tableBounds(width, height);
    for (const actor of [this.host.player(), this.world.tina()]) {
      if (!actor) continue;
      const body = this.actorBounds(actor, width, height);
      const padding = 8;
      const clearsTable = body.right <= table.left - padding || body.left >= table.right + padding
        || body.bottom <= table.top - padding || body.top >= table.bottom + padding;
      // Hide a partially framed actor before their head can come into the table or control strip.
      actor.root.visible = clearsTable && body.top >= free.top && body.bottom <= free.top + free.height
        && (!this.aiming || body.right <= free.left + free.width);
    }
  }

  private tableBounds(w: number, h: number) { return this.projectBox(this.frameBox, w, h); }

  private actorBounds(actor: GameCharacter, w: number, h: number) {
    const { x, y, z } = actor.root.position;
    this.actorBox.min.set(x - 0.52, y - 0.03, z - 0.52);
    this.actorBox.max.set(x + 0.52, y + actor.height + 0.22, z + 0.52);
    return this.projectBox(this.actorBox, w, h);
  }

  private projectBox(box: Box3, w: number, h: number) {
    const camera = this.host.rig.cam, { min, max } = box;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      const point = this.cueTarget.set(x, y, z).project(camera);
      left = Math.min(left, (point.x + 1) * w / 2);
      right = Math.max(right, (point.x + 1) * w / 2);
      top = Math.min(top, (1 - point.y) * h / 2);
      bottom = Math.max(bottom, (1 - point.y) * h / 2);
    }
    return { left, right, top, bottom, width: right - left, height: bottom - top };
  }

  exit() {
    if (!this.active) return;
    this.round?.sayIt.close();
    this.round = null;
    this.shot = null;
    this.charge = null;
    this.replaying = false;
    this.dialogue.cancel();
    this.table!.setRack(rack(401));
    this.table!.hideAim();
    this.table!.indicate(null, null, false);
    this.table = null;
    const tina = this.world.tina();
    this.host.player().root.visible = true;
    tina?.root.position.set(TINA_HOME.x, 0, TINA_HOME.z);
    if (tina) {
      tina.root.rotation.y = TINA_HOME.rot;
      tina.root.visible = true;
      const tinaCue = tina.rightHand.getObjectByName("billiards-owner-cue");
      if (tinaCue) tinaCue.visible = true;
    }
    this.host.rig.stage = null;
    this.host.rig.cam.zoom = 1;
    this.host.rig.cam.clearViewOffset();
    resetBilliards();
    this.world.place(TABLE_PROMPT.x, TABLE_PROMPT.z, TABLE_PROMPT.rot);
    this.host.left(this.id);
    this.world.save();
  }

  dispose() { this.exit(); }

  debug() {
    if (!import.meta.env.DEV) return undefined;
    return {
      state: () => this.round ? { ...useBilliards.getState(), group: this.round.group, shots: this.round.shots,
        sayIt: undefined, said: this.round.sayIt.count,
        ai: this.ai?.call, angle: this.angle, layout: this.round.balls.map((ball) => ({ ...ball })),
        table: this.tableBounds(window.innerWidth, window.innerHeight),
        actors: [this.host.player(), this.world.tina()].flatMap((actor) => actor ? [{
          ...this.actorBounds(actor, window.innerWidth, window.innerHeight), visible: actor.root.visible,
        }] : []),
      } : null,
      callShot: (ball: number, pocket: Pocket) => { if (this.phase === "call" && pocketId(pocket)) { this.select({ ball, pocket }); this.confirmCall(); } },
      aimAtGhost: () => {
        if (!this.round || !this.aiming || !this.ownCall) return;
        const ball = this.round.balls.find(({ id }) => id === this.ownCall!.ball)!;
        this.angle = headingTo(this.round.balls[0], ghostBall(ball, this.ownCall.pocket));
      },
      aimAt: (point: Point) => { if (this.round && this.aiming) this.angle = headingTo(this.round.balls[0], point); },
      shoot: (power: number) => { if (this.aiming) this.fire(power, this.ownCall); },
      settle: () => {
        for (let i = 0; this.round && this.shot && i < 600; i++) {
          this.advanceShot(1 / 60, false);
          this.table!.sync(this.round.balls, 1 / 60);
        }
      },
      layout: (positions: { id: number; x: number; z: number; pocket?: Pocket }[]) => {
        if (!this.round || this.shot) return;
        for (const { id, x, z, pocket = null } of positions) {
          const ball = this.round.balls.find((ball) => ball.id === id);
          if (ball) Object.assign(ball, { ...ballAt(id, x, z), pocket });
        }
        this.table!.setRack(this.round.balls);
        this.table!.sync(this.round.balls, 0.26);
        this.updateRows();
      },
    };
  }
}
