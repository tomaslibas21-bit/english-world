import { Vector3, type Group, type Object3D } from "three";
import { GOFISH_CONVERSATION, GOFISH_DECKS, GOFISH_NAMES, GOFISH_UI } from "../../content/gofish";
import { GOFISH_ACCEPT, GOFISH_LINES, GOFISH_SPEAKER_NAMES } from "../../content/gofish-lines";
import { NPCS } from "../../content/npcs";
import { prefetchSituations } from "../../content/situations/catalog";
import { coachVoice, npcVoice } from "../../content/voices";
import { countPlay, readPlayStats } from "../../state/playStats";
import { sitProgress } from "../../state/progress";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import type { GameCharacter } from "../characters";
import { ModeDialogue, type KitLine } from "../kit/dialogue";
import { actionHelp, type HelpLevel } from "../kit/help";
import type { ModeHost } from "../kit/host";
import { conversationLine } from "../kit/lines";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { keepPhrases } from "../kit/phrases";
import { STYLED } from "../style";
import { DINING, DINING_SEATS, DINNER_PROPS, GOFISH_PROMPT, SEAT_HEIGHT, diningShot, fitDiningView, hostBounds } from "./framing";
import { deal, defaultTarget, finished, finishTurn, npcAsk, prepareTurn, resolveAsk, seededRandom, targets,
  type Ask, type Npc, type Player, type Round, type TurnResult, type Word, winner } from "./logic";
import { TableCards } from "./props";
import { resetGoFishUi, useGoFish, type Step } from "./store";

const { situation } = GOFISH_CONVERSATION;
const ui = useGoFish.setState;
const view = useGoFish.getState;
const askKey = (word: Word) => `gf_ask_${word}`;
const YES = "gf_yes", NO = "gf_nope";
type RoomHost = {
  room(): Group | null;
  npc(id: Npc): GameCharacter | undefined;
  place(x: number, z: number, rot: number): void;
  savePlace(): void;
};

type Actor = ReturnType<typeof seatActor>;
type Run = {
  round: Round;
  actors: Record<Npc, Actor>;
  playerSeatY: GameCharacter["seatY"];
  playerVisible: boolean;
  playerFace: Vector3;
  dinnerProps?: Object3D;
  dinnerWasVisible?: boolean;
  props: TableCards;
  random: () => number;
  firstRound: boolean;
  asks: number;
  replies: number;
  right: number;
  handovers: number;
  npcStarted: boolean;
  tipListen: boolean;
  lucky: boolean;
  lastAsk?: KitLine;
  began: boolean;
  closing: boolean;
  wait?: { left: number; finish(ok: boolean): void };
  takeFish?: () => void;
  hostsFrame: Vector3[];
  tableFrame: Vector3[];
};

function seatedFace(ch: GameCharacter, standingHeight: number, build = 1) {
  const y = STYLED ? ch.height - 0.65 : SEAT_HEIGHT + 0.1 * build + standingHeight * (0.93 / 1.75);
  return ch.root.position.clone().add(new Vector3(0, y, 0.12).applyAxisAngle(new Vector3(0, 1, 0), ch.root.rotation.y));
}

function seatActor(ch: GameCharacter, id: Npc) {
  const { x, z, rot } = DINING_SEATS[id];
  const home = { position: ch.root.position.clone(), rot: ch.root.rotation.y, anim: ch.anim, seatY: ch.seatY,
    busy: ch.busy, watch: ch.watch, steady: ch.steady, attentive: ch.attentive };
  const height = ch.height;
  ch.root.position.set(x, 0, z);
  ch.root.rotation.y = rot;
  ch.seatY = SEAT_HEIGHT;
  ch.setAnim("sit");
  ch.busy = null;
  ch.attentive = ch.steady = true;
  return { ch, home, face: seatedFace(ch, height, NPCS[id].look.build) };
}

export function createGoFishMode(host: ModeHost, room: RoomHost) { return new GoFishMode(host, room); }

class GoFishMode implements GameMode {
  readonly id = "gofish";
  readonly cleanScreen = "menu";
  readonly camera = "stage";
  readonly indoorPrompt = true;
  readonly exitLabel = GOFISH_UI.exit;
  readonly conversation = { situation, label: GOFISH_UI.start, option: "conversation" };
  private run: Run | null = null;
  private starting = false;
  private debugSeed?: number;
  private speaker: Player = "dan";
  private playback = new ModeDialogue({
    allowBrowserVoice: true,
    framePlayback: true,
    say: (line) => ui({ line: line ? { ...line, speaker: this.speaker } : null }),
    choices: (choices) => ui({ choices }),
    mic: (mic) => ui({ mic }),
    answer: (line) => {
      this.speaker = "learner";
      ui({ line: { ...line, speaker: "learner" }, busy: true });
    },
    animate: (seconds) => {
      const speaker = this.speaker;
      if (speaker === "learner") return;
      this.room.npc(speaker)?.talk(seconds, () => this.speaker === speaker ? audio.level() : -1, () => audio.vowel());
    },
  });

  constructor(private host: ModeHost, private room: RoomHost) {}

  get active() { return this.run !== null; }
  ownsNpc(id: string) { return this.active && (id === "dan" || id === "nora"); }
  available() { return sitProgress(useStore.getState().progress, situation).completions > 0; }

  prompt(x: number, z: number) {
    if (view().offered || this.starting || !this.available() || !this.room.room()) return null;
    const distance = Math.hypot(x - GOFISH_PROMPT.x, z - GOFISH_PROMPT.z);
    if (distance > 1.2) return null;
    prefetchSituations([situation]);
    return { distance, label: GOFISH_UI.start, kind: "gofish" } as const;
  }

  start(option?: string) {
    const debug = import.meta.env.DEV && option === "debug";
    if (this.active || this.starting || !this.room.room() || !this.host.canStart(true) || (!debug && !this.available())) return false;
    if (debug || option === "conversation") return this.begin();
    if (!view().offered) {
      ui({ offered: true });
      this.speaker = "dan";
      void this.playback.say(situation, "dan", "gf_offer", GOFISH_LINES);
    }
    return true;
  }

  private begin(previous?: Run) {
    if (this.starting || !this.host.canStart(true)) return false;
    if (!this.host.fade(() => {
      if (!this.starting || !this.host.owns(this.id)) return;
      this.starting = false;
      if (previous) this.clearRun(previous);
      this.launch();
    })) return false;
    this.starting = true;
    this.playback.cancel();
    ui({ offered: false });
    if (previous) previous.closing = true;
    return true;
  }

  private launch() {
    const room = this.room.room(), dan = this.room.npc("dan"), nora = this.room.npc("nora");
    if (!room || !dan || !nora) { resetGoFishUi(); this.host.left(this.id); return; }
    resetGoFishUi();
    this.host.prepare();
    const progress = useStore.getState().progress;
    const played = readPlayStats(progress).games.gofish ?? 0;
    const random = seededRandom(this.debugSeed ?? Math.floor(Math.random() * 4294967296));
    this.debugSeed = undefined;
    const round = deal(played % GOFISH_DECKS.length, random);
    const player = this.host.player(), playerSeatY = player.seatY, standingHeight = player.height;
    const playerVisible = player.root.visible;
    const { x, z, rot } = DINING_SEATS.learner;
    this.room.place(x, z, rot);
    player.seatY = SEAT_HEIGHT;
    player.setAnim("sit");
    player.root.visible = false;
    const playerFace = seatedFace(player, standingHeight, progress.profile?.look?.build);
    const actors = { dan: seatActor(dan, "dan"), nora: seatActor(nora, "nora") };
    const hostsFrame = [actors.dan.face, actors.nora.face].flatMap(hostBounds);
    for (const id of GOFISH_SPEAKER_NAMES) actors[id].ch.watch = playerFace;
    const dinnerProps = room.getObjectByName(DINNER_PROPS);
    const dinnerWasVisible = dinnerProps?.visible;
    if (dinnerProps) dinnerProps.visible = false;
    const props = new TableCards(round.deck);
    room.add(props.root);
    this.host.rig.stage = { ...diningShot(), rate: 3, fov: 50 };
    this.host.rig.mode = "stage";
    this.host.rig.stageSnap();
    this.run = {
      round, actors, props, playerSeatY, playerVisible, playerFace, dinnerProps, dinnerWasVisible, random, firstRound: played === 0,
      asks: 0, replies: 0, right: 0, handovers: 0, npcStarted: false, tipListen: false, lucky: false,
      began: false, closing: false, hostsFrame,
      tableFrame: [...hostsFrame, new Vector3(DINING.x, DINING.surface, DINING.z + 0.45)],
    };
    this.playback.setMic(true);
    this.host.entered(this.id);
    countPlay("games", this.id);
  }

  private live(run: Run) { return this.run === run && !run.closing; }

  private async say(run: Run, speaker: Npc, key: string, to: Player = "learner") {
    if (!this.live(run)) return false;
    this.speaker = speaker;
    run.actors[speaker].ch.watch = to === "learner" ? run.playerFace : run.actors[to].face;
    ui({ busy: true });
    const line = await this.playback.say(situation, speaker, key, GOFISH_LINES);
    if (!this.live(run)) return false;
    ui({ busy: false });
    return !!line;
  }

  private async expect(run: Run, npc: Npc, keys: string[], names?: Npc[]) {
    const line = await this.playback.expect(situation, npc, keys, GOFISH_LINES, GOFISH_ACCEPT,
      names && { names, select: (name) => this.selectTarget(run, name as Npc) });
    if (!this.live(run)) return null;
    ui({ busy: false });
    return line;
  }

  private phase(step: Step, patch: Partial<ReturnType<typeof view>> = {}) {
    ui({ step, target: null, picked: null, hintCard: null, hintReply: null, tip: null, ...patch });
  }

  private delay(run: Run, seconds: number) {
    return new Promise<boolean>((finish) => { run.wait = { left: seconds, finish }; });
  }

  private help(run: Run, count: number): HelpLevel {
    if (run.firstRound && count < 2) return 0;
    return count < 5 ? 1 : 2;
  }

  private showHelp(level: HelpLevel) {
    ui({ gloss: level < 2 });
    return actionHelp(level, 0).action;
  }

  private sync(run: Run, round: Round) {
    run.round = round;
    ui({ round });
    run.props.sync(round);
  }

  private async playRound(run: Run) {
    if (!await this.say(run, "nora", "gf_intro") || !await this.say(run, "nora", "gf_shuffle")) return;
    this.sync(run, run.round);
    if (!await this.say(run, "nora", "gf_first")) return;
    while (this.live(run) && !finished(run.round)) {
      const { turn } = run.round;
      const preparation = prepareTurn(run.round);
      if (preparation?.kind === "skip") {
        if (!await this.advance(run, preparation.round)) return;
        continue;
      }
      if (preparation?.kind === "refill") {
        if (turn === "learner") this.showHelp(this.help(run, run.asks));
        const tip = turn === "learner" && !run.round.hands.learner.length ? GOFISH_UI.outOfCards : null;
        if (!await this.fish(run, tip) || !await this.resolve(run, preparation.outcome, false)) return;
        continue;
      }
      const ask = turn === "learner" ? await this.learnerAsk(run) : await this.computerAsk(run, turn);
      if (!ask || !this.live(run)) return;
      if (!await this.answerAsk(run, ask)) return;
    }
    if (this.live(run)) await this.score(run);
  }

  private async learnerAsk(run: Run): Promise<Ask | null> {
    const names = targets(run.round) as Npc[];
    const target = defaultTarget(run.round) as Npc;
    const guided = this.showHelp(this.help(run, run.asks));
    this.phase("ask", { target, tip: guided ? GOFISH_UI.tipAsk : null });
    const line = await this.expect(run, target, run.round.hands.learner.map(askKey), names);
    if (!line) return null;
    const addressee = view().target ?? target;
    run.actors[addressee].ch.watch = run.playerFace;
    run.lastAsk = line;
    run.asks++;
    return { target: addressee, word: line.key.slice("gf_ask_".length) };
  }

  private async computerAsk(run: Run, npc: Npc) {
    const ask = npcAsk(run.round, run.random);
    if (!ask) return null;
    const guided = this.showHelp(this.help(run, run.replies));
    const listening = ask.target !== "learner" && !run.tipListen;
    const tip = listening ? GOFISH_UI.tipListen(GOFISH_NAMES[npc].nom, GOFISH_NAMES[ask.target as Npc].gen)
      : ask.target === "learner" && guided ? GOFISH_UI.tipAsked(GOFISH_NAMES[npc].nom) : null;
    this.phase("listen", { tip });
    if (listening) run.tipListen = true;
    if (!run.npcStarted) {
      run.npcStarted = true;
      if (!await this.say(run, npc, "gf_my_turn")) return null;
    }
    if (run.random() < 0.3 && !await this.say(run, npc, "gf_hmm", ask.target)) return null;
    return await this.say(run, npc, askKey(ask.word), ask.target) ? ask : null;
  }

  private async learnerReply(run: Run, npc: Npc, word: Word, has: boolean) {
    const question = view().line;
    const guided = actionHelp(this.help(run, run.replies), 0).action;
    const right = has ? YES : NO;
    let first = true;
    for (;;) {
      this.phase("reply", {
        line: question, tip: guided ? GOFISH_UI.tipReply : null,
        hintCard: (guided || !first) && has ? word : null,
        hintReply: (guided || !first) && !has ? NO : null,
      });
      const line = await this.expect(run, npc, [YES, NO]);
      if (!line) return false;
      if (line.key === right) {
        run.replies++;
        if (first) run.right++;
        return true;
      }
      first = false;
      this.phase("listen");
      if (!await this.say(run, npc, "gf_sure")) return false;
    }
  }

  private async answerAsk(run: Run, ask: Ask) {
    const { turn, hands } = run.round;
    const has = hands[ask.target].includes(ask.word);
    if (ask.target === "learner") {
      if (!await this.learnerReply(run, turn as Npc, ask.word, has)) return false;
    } else {
      if (view().step !== "listen") this.phase("listen");
      if (!await this.say(run, ask.target, has ? YES : NO, turn)) return false;
    }
    const guided = turn === "learner" && actionHelp(this.help(run, run.asks - 1), 0).action;
    if (!has && !await this.fish(run, guided ? GOFISH_UI.tipFish : null)) return false;
    const outcome = resolveAsk(run.round, ask);
    return !!outcome && await this.resolve(run, outcome, guided, ask);
  }

  private async fish(run: Run, tip: string | null) {
    if (!run.round.pond.length) {
      this.phase("listen", { tip: GOFISH_UI.pondEmpty });
      return this.delay(run, 0.65);
    }
    if (run.round.turn !== "learner") return true;
    this.phase("fish", { tip });
    return new Promise<boolean>((finish) => {
      run.takeFish = () => { run.takeFish = undefined; finish(this.live(run)); };
    });
  }

  private async resolve(run: Run, outcome: TurnResult, guided: boolean, ask?: Ask) {
    const { round, move, pair, again } = outcome;
    const { turn } = round;
    if (move) {
      const revealed = move.from === "pond" && turn === "learner";
      const duration = revealed ? 0.95 : 0.38;
      this.phase("move", { drawn: revealed ? move.word : null });
      if (move.from === "pond") {
        // Shrink the pond immediately, then add the received card to the hand on landing.
        ui({ round: { ...run.round, pond: round.pond } });
        run.props.sync({ ...run.round, pond: round.pond });
      }
      audio.sfx(revealed ? "pop" : "tick");
      run.props.slide(move.from, turn, round.pond.length, move.word, duration);
      if (!await this.delay(run, duration)) return false;
      this.sync(run, round);
      ui({ drawn: null });
      if (move.from !== "pond" && turn !== "learner" && !await this.say(run, turn, "gf_thanks", move.from)) return false;
      if (move.from === "pond" && pair && again && ask && turn !== "learner") {
        run.lucky = true;
        if (!await this.say(run, turn, "gf_lucky")) return false;
      }
    }
    if (pair) {
      if (turn === "learner") {
        this.phase("pair", { tip: guided ? GOFISH_UI.tipPair : null, hintCard: guided ? pair : null });
        if (!await this.expect(run, ask?.target === "nora" ? "nora" : "dan", ["gf_pair"])) return false;
      } else if (!await this.say(run, turn, "gf_pair")) return false;
      audio.sfx("success");
    }
    const next = finishTurn(outcome);
    if (pair && again && turn === "learner" && !finished(next)) {
      this.sync(run, next);
      this.phase("listen");
      return this.say(run, ask?.target === "dan" ? "nora" : "dan", "gf_again");
    }
    return this.advance(run, next);
  }

  private async advance(run: Run, next: Round) {
    const last = run.round.turn;
    this.sync(run, next);
    this.phase("listen");
    if (last !== "learner" && next.turn === "learner" && !finished(next) && run.handovers < 3) {
      run.handovers++;
      this.showHelp(this.help(run, run.asks));
      return this.say(run, last, "gf_your_turn");
    }
    return true;
  }

  private async score(run: Run) {
    const won = winner(run.round);
    ui({ gloss: true });
    if (!await this.say(run, won === "nora" ? "nora" : "dan", won === "learner" ? "gf_win_you" : won ? "gf_win_me" : "gf_tie")) return;
    if (!await this.say(run, "dan", "gf_bye")) return;
    const keys = [YES, NO, "gf_pair", "gf_your_turn", ...(run.lucky ? ["gf_lucky"] : [])];
    const sentences = keys.flatMap((key) => conversationLine(situation, "dan", key, GOFISH_LINES, true) ?? []);
    if (run.lastAsk) sentences.unshift(run.lastAsk.sentence);
    keepPhrases(situation, sentences);
    this.playback.clearLine();
    if (won === "learner") audio.sfx("listen");
    this.phase("score", { result: { winner: won, right: run.right, replies: run.replies, cards: sentences.length } });
  }

  private selectTarget(run: Run, target: Npc) {
    if (!targets(run.round).includes(target)) return;
    run.actors[target].ch.watch = run.playerFace;
    ui({ target });
  }

  private async replay(run: Run) {
    const { line } = view();
    if (!line) return;
    const { speaker } = line;
    this.speaker = speaker;
    ui({ busy: true });
    if (speaker === "learner") {
      const gender = useStore.getState().progress.profile?.gender;
      await this.playback.replayLine(line, coachVoice(gender), 1, gender === "m", true);
    } else {
      const npc = NPCS[speaker];
      await this.playback.replayLine(line, npcVoice(npc), npc.speed ?? 1, npc.gender === "m");
    }
    if (this.live(run)) ui({ busy: false });
  }

  tick(dt: number) {
    if (!view().offered) return;
    const { x, z } = this.host.player().root.position;
    if (!this.room.room() || Math.hypot(x - GOFISH_PROMPT.x, z - GOFISH_PROMPT.z) > 1.75 || useStore.getState().hud.panel) {
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
    if (!run.began) { run.began = true; void this.playRound(run); }
    const player = this.host.player();
    const { target, step, line } = view();
    const speaker = line?.speaker;
    const partner = target ?? (speaker && speaker !== "learner" ? speaker : "dan");
    player.watch = run.actors[partner].face;
    this.host.updatePose(dt, DINING_SEATS.learner.rot);
    for (const actor of Object.values(run.actors)) actor.ch.update(dt);
    run.props.update(dt, step === "fish");
    if (run.wait && (run.wait.left -= dt) <= 0) {
      const { finish } = run.wait;
      run.wait = undefined;
      finish(true);
    }
  }

  frameView(width: number, height: number, top: number, bottom: number) {
    const run = this.run;
    if (!run || width <= 0 || height <= 0) return;
    const scoring = view().step === "score";
    const header = scoring ? 12 : Math.max(top, Math.min(140, height * 0.21));
    const floor = scoring ? bottom : Math.min(bottom, height - Math.min(228, height * 0.4));
    fitDiningView(this.host.rig.cam, width, height, header, floor, scoring ? run.hostsFrame : run.tableFrame);
  }

  input(input: ModeInput) {
    if (input.kind !== "key" || input.repeat) return false;
    const { key } = input;
    if (key === "escape" && (this.active || view().offered || this.starting)) { this.exit(false); return true; }
    const { step, picked, choices } = view();
    if (step === "reply" && (key === "y" || key === "n")) this.action("choose", key === "y" ? YES : NO);
    else if (step === "ask" && /^[0-9]$/.test(key)) this.action("card", view().round?.hands.learner[key === "0" ? 9 : Number(key) - 1]);
    else if (step === "ask" && ["arrowleft", "arrowright", "d", "n"].includes(key)) {
      this.action("target", key === "d" || key === "arrowleft" ? "dan" : "nora");
    } else if (step === "fish" && key === "f") this.action("fish");
    else if (key === "enter" && step === "ask" && picked) this.action("choose", askKey(picked));
    else if (key === "enter" && choices.length === 1) this.action("choose", choices[0].key);
    else if (key === "m" && choices.length) this.action("mic", !this.playback.micOn);
    else return false;
    return true;
  }

  action(name: string, value?: string | boolean) {
    if (name === "start" && view().offered) { this.begin(); return; }
    const run = this.run;
    if (!run || run.closing) return;
    const { step, choices, picked, busy } = view();
    if (name === "again" && step === "score") this.begin(run);
    if (name === "show") ui({ gloss: true });
    if (name === "mic") { this.playback.setMic(value === true); ui({ micOn: this.playback.micOn }); }
    if (busy) return;
    if (name === "hear") void this.replay(run);
    if (name === "fish" && step === "fish") run.takeFish?.();
    if (step === "ask" && choices.length) {
      if (name === "target" && (value === "dan" || value === "nora")) this.selectTarget(run, value);
      if (name === "card" && typeof value === "string" && run.round.hands.learner.includes(value)) {
        ui({ picked: value, tip: view().tip ? GOFISH_UI.tipWhom : null });
      }
    }
    if (name === "choose" && typeof value === "string" && (step !== "ask" || picked && value === askKey(picked))) {
      this.playback.choose(value);
    }
  }

  state() {
    if (this.starting) return { step: "starting" as const };
    if (view().offered) return { step: "offer" as const };
    const run = this.run;
    return run ? { step: view().step, round: run.round, asks: run.asks, replies: run.replies, right: run.right } : null;
  }

  seed(seed: number) { if (import.meta.env.DEV) this.debugSeed = seed; }

  private clearRun(run: Run) {
    run.closing = true;
    this.playback.cancel();
    run.wait?.finish(false);
    run.takeFish?.();
    for (const { ch, home } of Object.values(run.actors)) {
      ch.root.position.copy(home.position);
      ch.root.rotation.y = home.rot;
      ch.seatY = home.seatY;
      ch.busy = home.busy;
      ch.watch = home.watch;
      ch.steady = home.steady;
      ch.attentive = home.attentive;
      ch.talk(0, () => -1);
      ch.setAnim(home.anim === "wave" ? "idle" : home.anim);
    }
    const player = this.host.player();
    player.seatY = run.playerSeatY;
    player.root.visible = run.playerVisible;
    player.watch = null;
    player.setAnim("idle");
    run.props.dispose();
    if (run.dinnerProps) run.dinnerProps.visible = !!run.dinnerWasVisible;
    this.host.rig.stage = null;
    this.host.rig.cam.zoom = 1;
    this.host.rig.cam.clearViewOffset();
    this.run = null;
  }

  exit(immediate: boolean) {
    const run = this.run;
    if (!immediate && run?.closing && !this.starting) return;
    this.starting = false;
    this.playback.cancel();
    if (run) run.closing = true;
    const close = () => {
      if (run && this.run === run) {
        this.clearRun(run);
        this.room.place(GOFISH_PROMPT.x, GOFISH_PROMPT.z, GOFISH_PROMPT.rot);
        this.room.savePlace();
      }
      resetGoFishUi();
      this.host.left(this.id);
    };
    if (immediate || !run || !this.host.fade(close)) close();
  }

  dispose() { if (this.run || this.starting || view().offered) this.exit(true); }
}
