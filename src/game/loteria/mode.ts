import { Vector3, type Object3D } from "three";
import { NPCS } from "../../content/npcs";
import { getSituation, loadSituation } from "../../content/situations/catalog";
import type { Sentence } from "../../convo/compose";
import { EDITION } from "../../edition";
import {
  LOTERIA_CALLER as BETO, LOTERIA_DECK, LOTERIA_NEIGHBOR as TONA, LOTERIA_SITUATION as SIT, LOTERIA_UI,
  type LoteriaCard,
} from "../../editions/es/content/loteria";
import { LOTERIA_ACCEPT, LOTERIA_LINES } from "../../editions/es/content/loteria-lines";
import { countPlay } from "../../state/playStats";
import { L } from "../../ui/i18n";
import { audio } from "../audio";
import { createCharacter, type GameCharacter } from "../characters";
import { ModeDialogue } from "../kit/dialogue";
import type { ModeHost } from "../kit/host";
import { conversationLine, learnerTurn } from "../kit/lines";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { SayItRound, type SayItCue, type SayItTarget } from "../kit/sayIt";
import { keepPhrases, PhraseRun } from "../kit/phrases";
import { BETO_STAGE_YAW, frameLoteria, loteriaShot, TONA_STAGE_YAW } from "./framing";
import {
  BETOS_STAND, LEARNER_SEAT, LOTERIA_APPROACH, LOTERIA_BULBS, LOTERIA_HOLDER, TABLE_SEAT, TONAS_SEAT,
} from "./location";
import { cardsNeeded, listenStage, LoteriaRoundState, roundKind, SIDE } from "./logic";
import { loteriaNames, loteriaUi, resetLoteriaUi, useLoteria, type CardLabel, type Phase } from "./store";

const shoutKey = "lt_a_loteria";
const cardKey = ({ id }: LoteriaCard) => `lt_c_${id}`;
const phraseKeys = ["lt_b_check", "lt_b_buena", "lt_t_tiene", "lt_t_casi"];
const prettyCards = new Set(["rosa", "estrella", "colibri", "luna"]);
const callExtras = ["lt_b_next", "lt_b_ahi_va"];
const directions: Record<string, [number, number]> = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };

type LoteriaHost = Pick<ModeHost, "add" | "canStart" | "entered" | "fade" | "left" | "owns" | "place" | "player" | "prepare"
  | "rig" | "updatePose">;

interface LoteriaSceneHost {
  npc(id: string): GameCharacter | undefined;
  prop(id: string): Object3D | undefined;
  dusk(): () => void;
  save(): void;
}

interface Run {
  round: LoteriaRoundState;
  phase: Phase;
  busy: boolean;
  time: number;
  namedAt: number;
  coveredAt: number;
  readyAt: number;
  lastCoach: number;
  coaches: Map<string, number>;
  markTip: boolean;
  lateTip: boolean;
  uncalled: boolean;
  wrongShout: boolean;
  shout: boolean;
  shoutAt: number;
  shoutSentence: Sentence;
  speech: SayItRound;
  cue?: SayItCue;
  spotlight: number;
  review: PhraseRun;
}

interface Stage {
  beto: GameCharacter;
  tona: GameCharacter;
  guests: GameCharacter[];
  restore(): void;
  holder?: Object3D;
}

export function createLoteriaMode(host: LoteriaHost, scene: LoteriaSceneHost) {
  return EDITION.id === "es" ? new LoteriaMode(host, scene) : null;
}

export class LoteriaMode implements GameMode {
  readonly id = "loteria";
  readonly cleanScreen = "menu";
  readonly exitLabel = L(LOTERIA_UI.exit);
  readonly conversation = { situation: SIT, label: L(LOTERIA_UI.start) };
  private starting = false;
  private attempt = 0;
  private run: Run | null = null;
  private stage: Stage | null = null;
  private labels: Record<string, CardLabel> = {};
  private roundIndex = 0;
  private seed = 0;
  private speed = 1;
  private debugSeed: number | undefined;
  private speaker = BETO;
  private micOn = false;
  private dialogue = new ModeDialogue({
    speechFallback: true,
    allowBrowserVoice: true,
    framePlayback: true,
    say: (line) => {
      if (!line) return;
      if (!(this.run?.round.faceDown && line.key.startsWith("lt_c_"))) this.run?.review.add(line.sentence);
      if (line.key.startsWith("lt_v_")) loteriaUi({ verse: line, caller: null });
      else if (this.speaker === TONA) loteriaUi({ neighbor: line });
      else loteriaUi({ caller: line });
    },
    choices: (choices) => loteriaUi({ choices: choices.filter((line) => line.key !== shoutKey) }),
    mic: (mic) => loteriaUi({ mic }),
    animate: (seconds) => {
      const speaker = this.speaker;
      const actor = speaker === TONA ? this.stage?.tona : this.stage?.beto;
      actor?.talk(seconds, () => this.speaker === speaker ? audio.level() : -1, () => audio.vowel());
    },
  });

  constructor(private host: LoteriaHost, private scene: LoteriaSceneHost) {}

  get active() { return this.starting || this.stage !== null; }
  get camera() { return this.stage ? "stage" as const : undefined; }
  controlsNpc(id: string) { return id === TONA && this.stage !== null; }
  event(name: string) { if (name === this.id) return this.id; }

  start() {
    if (this.active || !this.host.canStart() || !this.scene.npc(TONA)) return false;
    this.starting = true;
    const attempt = ++this.attempt;
    const load = getSituation(SIT);
    if (load) return this.enter(attempt);
    void loadSituation(SIT).then((sit) => {
      if (this.attempt !== attempt || !this.starting || !this.host.owns(this.id)) return;
      if (!sit || !this.host.canStart()) this.exit(true);
      else this.enter(attempt);
    }, () => { if (this.attempt === attempt) this.exit(true); });
    return true;
  }

  private enter(attempt: number) {
    const fading = this.host.fade(() => {
      if (this.attempt !== attempt || !this.starting || !this.host.owns(this.id)) return;
      const tona = this.scene.npc(TONA);
      if (!tona) { this.exit(true); return; }
      this.host.prepare();
      const player = this.host.player();
      const oldSeat = player.seatY, oldVisible = player.root.visible;
      this.host.place(LEARNER_SEAT.x, LEARNER_SEAT.z, LEARNER_SEAT.rot);
      player.seatY = TABLE_SEAT;
      player.setAnim("sit");
      player.root.visible = false;

      const oldRotation = tona.root.rotation.y, oldWatch = tona.watch, oldSteady = tona.steady;
      tona.root.rotation.y = TONA_STAGE_YAW;
      tona.watch = null;
      tona.steady = true;
      const beto = this.person(BETO, BETOS_STAND.x, BETOS_STAND.z, BETO_STAGE_YAW);
      const guests = [
        this.person("chloe", 25.1, -26.02, Math.PI - 0.3, true),
        this.person("sam", 26.2, -26.02, Math.PI - 0.25, true),
        this.person("sara", 27.15, -26.02, Math.PI + 0.1, true),
      ];
      const bulbs = this.scene.prop(LOTERIA_BULBS);
      const unlit = this.scene.prop("loteria-bulbs-unlit");
      const holder = this.scene.prop(LOTERIA_HOLDER);
      const holderAngle = holder?.rotation.y;
      if (holder) holder.rotation.y = BETO_STAGE_YAW;
      if (bulbs) bulbs.visible = true;
      if (unlit) unlit.visible = false;
      const daylight = this.scene.dusk();
      this.stage = { beto, tona, guests, holder, restore: () => {
        daylight();
        if (bulbs) bulbs.visible = false;
        if (unlit) unlit.visible = true;
        if (holder && holderAngle !== undefined) holder.rotation.y = holderAngle;
        for (const person of [beto, ...guests]) { person.root.removeFromParent(); person.dispose?.(); }
        tona.talk(0);
        tona.root.rotation.y = oldRotation;
        tona.watch = oldWatch;
        tona.steady = oldSteady;
        player.seatY = oldSeat;
        player.setAnim("idle");
        player.root.visible = oldVisible;
      } };

      this.labels = Object.fromEntries(LOTERIA_DECK.map((card) => {
        const line = conversationLine(SIT, BETO, cardKey(card), LOTERIA_LINES, false);
        return [card.id, { name: line?.en ?? "", gloss: line?.nat ?? line?.units.map((unit) => unit.lt).join(" ") ?? "", sentence: line ?? undefined }];
      }));
      this.roundIndex = 0;
      this.seedForCues = 0;
      this.seed = this.debugSeed ?? Math.floor(Math.random() * 0x100000000);
      this.starting = false;
      this.host.entered(this.id);
      this.host.rig.stage = loteriaShot();
      this.host.rig.mode = "stage";
      this.host.rig.stageSnap();
      this.begin();
    });
    if (!fading) this.exit(true);
    return fading;
  }

  private person(id: string, x: number, z: number, rot: number, sit = false) {
    const npc = NPCS[id];
    const ch = createCharacter({ ...npc.look, female: npc.gender === "f" });
    ch.root.name = `loteria-${id}`;
    ch.root.position.set(x, 0, z);
    ch.root.rotation.y = rot;
    if (sit) { ch.seatY = TABLE_SEAT; ch.setAnim("sit"); }
    this.host.add(ch.root);
    return ch;
  }

  private begin() {
    this.dialogue.cancel();
    this.dialogue.setMic(this.micOn);
    resetLoteriaUi();
    const round = new LoteriaRoundState(this.roundIndex, this.seed + this.roundIndex);
    const shoutSentence = conversationLine(SIT, BETO, shoutKey, LOTERIA_LINES, true)!;
    const run: Run = this.run = {
      round, phase: "opening", busy: true, time: 0, namedAt: 0, coveredAt: Infinity, readyAt: Infinity,
      lastCoach: -Infinity, coaches: new Map(), markTip: false, lateTip: false, uncalled: false, wrongShout: false, shout: false, shoutAt: 0, speech: new SayItRound(), spotlight: -1,
      shoutSentence, review: new PhraseRun(SIT),
    };
    run.review.lines(loteriaNames(round.board, this.labels));
    loteriaUi({ board: round.board, labels: this.labels, kind: round.kind, next: roundKind(this.roundIndex + 1), micOn: this.micOn, shoutSentence });
    countPlay("games", this.id);
    void this.opening(run);
  }

  private async opening(run: Run) {
    if (!await this.say(run, "lt_b_open")) return;
    if (!await this.say(run, `lt_b_${run.round.kind}`)) return;
    audio.sfx("cardShuffle"); // Don Beto shuffles the deck
    if (run.round.index > 0 && !await this.say(run, "lt_t_suerte")) return;
    if (await this.say(run, "lt_b_go")) void this.call(run);
  }

  private async say(run: Run, key: string) {
    if (this.run !== run) return false;
    this.speaker = key.startsWith("lt_t_") ? TONA : BETO;
    loteriaUi({ neighbor: null, ...(this.speaker === BETO ? { caller: null } : {}) });
    const line = await this.dialogue.say(SIT, this.speaker, key, LOTERIA_LINES);
    return line != null && this.run === run;
  }

  private setPhase(run: Run, phase: Phase) {
    run.phase = phase;
    const ready = phase === "waiting" && !run.busy;
    loteriaUi({ phase, replay: ready && !!run.round.current, sayIt: ready ? run.cue : undefined });
  }

  private sync(run: Run) {
    const { round } = run;
    const card = round.current;
    if (card && !round.faceDown) {
      const sentence = this.labels[card.id]?.sentence;
      if (sentence) run.review.add(sentence);
    }
    const winningCells = round.winner ? [] : round.pattern ?? [];
    run.spotlight = round.board.findIndex((cell) => cell.id === card?.id);
    loteriaUi({
      current: card, faceDown: round.faceDown, covered: [...round.covered], ready: winningCells.length > 0, winningCells,
      called: round.called.slice(0, round.faceDown ? -1 : undefined).reverse(),
      glow: listenStage(round.index, round.called.length) === "glow" && !round.covered.has(run.spotlight) ? run.spotlight : -1,
    });
    if (this.stage?.holder) this.stage.holder.rotation.y = BETO_STAGE_YAW + (round.faceDown ? Math.PI : 0);
  }

  private async call(run: Run) {
    run.speech.close();
    run.cue = undefined;
    this.dialogue.cancelTurn();
    run.busy = true;
    this.setPhase(run, "calling");
    const { round } = run;
    const skipped = run.spotlight >= 0 && !round.covered.has(run.spotlight);
    const late = skipped && !run.lateTip;
    run.lateTip ||= late;
    loteriaUi({ tip: late ? "tipLate" : null, caller: null, neighbor: null, verse: null, glow: -1 });
    if (round.called.length && this.random() < 0.25 && !await this.say(run, callExtras[Math.floor(this.random() * 2)])) return;
    const card = round.draw();
    if (!card) { this.wait(run); return; }
    run.coveredAt = Infinity;
    audio.sfx("cardSlap"); // the caller slaps the card down (recorded; the synthesized flip stands in)
    this.sync(run);
    if (useLoteria.getState().glow >= 0 && !run.markTip && !late) {
      run.markTip = true;
      loteriaUi({ tip: "tipMark" });
    }
    if (!await this.sing(run, card)) return;
    const wasHidden = round.faceDown;
    if (run.shout) round.shout();
    round.reveal();
    this.sync(run);
    if (wasHidden) audio.sfx("cardFlip");
    if (round.winner) { void this.finish(run); return; }
    run.cue = run.speech.open(this.spokenTarget(cardKey(card)), {
      ...this.spokenTarget(shoutKey, run.shoutSentence),
      available: () => !!round.pattern && !run.shout,
      onAward: () => this.requestShout(run, true),
    });
    this.wait(run);
  }

  private async sing(run: Run, card: LoteriaCard) {
    if (card.verse && !await this.say(run, `lt_v_${card.id}`)) return false;
    return this.say(run, cardKey(card));
  }

  private random() {
    // Separate from the round RNG so dialogue has no influence on the boards or the draw.
    const n = Math.sin(++this.seedForCues * 127.1 + this.seed * 0.13) * 43758.5453;
    return n - Math.floor(n);
  }
  private seedForCues = 0;

  private wait(run: Run) {
    run.namedAt = run.time;
    if (run.round.covered.has(run.spotlight)) run.coveredAt = run.time;
    run.busy = false;
    this.setPhase(run, "waiting");
  }

  private spokenTarget(key: string, sentence = conversationLine(SIT, BETO, key, LOTERIA_LINES, true)!): SayItTarget {
    const match = learnerTurn([{ key, sentence }], LOTERIA_ACCEPT);
    return {
      phrases: match.phrases,
      evaluate: (text) => {
        const heard = match.read(text);
        return heard.answer ? "complete" : heard.verdict;
      },
    };
  }

  private cover(run: Run, index: number) {
    if (run.phase !== "calling" && run.phase !== "waiting") return;
    loteriaUi({ focus: index });
    const result = run.round.cover(index);
    if (result === "uncalled") {
      const count = (useLoteria.getState().bounce?.count ?? 0) + 1;
      loteriaUi({ bounce: { index, count }, tip: "tipNotYet" });
      audio.sfx("soft");
      if (!run.coaches.has("lt_t_noyet")) run.uncalled = true;
    }
    if (result !== "covered") return;
    audio.sfx("beanDrop");
    if (index === run.spotlight) run.coveredAt = Math.max(run.namedAt, run.time);
    if (run.round.pattern && run.readyAt === Infinity) run.readyAt = run.time;
    this.sync(run);
  }

  private requestShout(run: Run, spoken = false) {
    if (run.phase !== "calling" && run.phase !== "waiting") return;
    if (run.round.pattern) {
      run.shout = true;
      run.shoutAt = run.time + (spoken ? 0.55 : 0);
    } else run.wrongShout = true;
  }

  private async repeat(run: Run) {
    const card = run.round.current;
    if (!card || run.phase !== "waiting" || run.busy) return;
    run.busy = true;
    run.cue?.cancel();
    loteriaUi({ replay: false, sayIt: undefined, neighbor: null, caller: null, verse: null });
    this.dialogue.cancelTurn();
    if (await this.sing(run, card)) this.wait(run);
  }

  private coachLine(run: Run) {
    const { round } = run;
    const call = round.called.length;
    if (call - run.lastCoach < 3) return;
    const used = (key: string) => run.coaches.get(key) ?? 0;
    if (run.uncalled && !used("lt_t_noyet")) return "lt_t_noyet";
    if (round.pattern) {
      if (!used("lt_t_grite") && run.time - run.readyAt >= 5) return "lt_t_grite";
      return;
    }
    if (call > round.deck.length - 3) return;
    if (call <= 14 && run.spotlight >= 0 && !round.covered.has(run.spotlight) && run.time - run.namedAt >= 4 && used("lt_t_tiene") < 2) return "lt_t_tiene";
    if (!used("lt_t_casi") && cardsNeeded(round.kind, round.covered) === 1) return "lt_t_casi";
    if (!used("lt_t_falta") && cardsNeeded(round.kind, round.neighborCovered) === 1) return "lt_t_falta";
    if (!used("lt_t_nada") && call >= 3 && call <= 5 && !round.neighborCovered.size) return "lt_t_nada";
    if (!used("lt_t_esquites") && call >= 8 && call <= 12) return "lt_t_esquites";
    if (!used("lt_t_bonita") && prettyCards.has(round.current?.id ?? "")) return "lt_t_bonita";
  }

  private async aside(run: Run, key: string) {
    run.busy = true;
    run.cue?.cancel();
    loteriaUi({ replay: false, sayIt: undefined });
    this.dialogue.cancelTurn();
    if (key.startsWith("lt_t_")) {
      run.lastCoach = run.round.called.length;
      run.coaches.set(key, (run.coaches.get(key) ?? 0) + 1);
    }
    if (!await this.say(run, key)) return;
    loteriaUi({ neighbor: null });
    run.busy = false;
    this.setPhase(run, "waiting");
  }

  private async finish(run: Run) {
    run.speech.close();
    const { round } = run;
    this.dialogue.cancelTurn();
    run.busy = true;
    this.setPhase(run, "finishing");
    loteriaUi({ tip: null, glow: -1, ready: false, winningCells: [] });
    const pattern = round.winner === "learner" ? round.pattern ?? [] : [];
    const winning = pattern.map((index) => round.board[index]);
    audio.sfx("crowdCheer"); // the plaza cheers "¡Lotería!"
    if (round.winner === "learner") {
      if (!await this.say(run, "lt_b_check")) return;
      if (round.kind !== "llena") {
        this.setPhase(run, "reading");
        run.review.lines(loteriaNames(winning, this.labels));
        loteriaUi({ read: winning });
        const pending = [...winning];
        while (pending.length) {
          const choice = await this.dialogue.expect(SIT, BETO, pending.map(cardKey), LOTERIA_LINES, LOTERIA_ACCEPT);
          if (!choice || this.run !== run) return;
          pending.splice(pending.findIndex((card) => cardKey(card) === choice.key), 1);
          loteriaUi({ read: [...pending] });
        }
        this.setPhase(run, "finishing");
      }
      if (!await this.say(run, "lt_b_buena") || !await this.say(run, "lt_t_felicidades")) return;
    } else {
      for (const key of ["lt_t_gane", "lt_b_tona", "lt_t_otra"]) if (!await this.say(run, key)) return;
    }
    if (!await this.say(run, "lt_b_end")) return;
    const rewardKeys = [...phraseKeys, ...winning.slice(0, 3).map(cardKey)];
    const phrases = [run.shoutSentence, ...rewardKeys.flatMap((key) =>
      conversationLine(SIT, key.startsWith("lt_t_") ? TONA : BETO, key, LOTERIA_LINES, false) ?? [])];
    keepPhrases(SIT, phrases);
    run.review.add(run.shoutSentence);
    this.host.rig.stage = loteriaShot(true);
    this.setPhase(run, "score");
    loteriaUi({
      caller: null, neighbor: null, result: {
        winner: round.winner!, calls: round.called.length, covered: round.covered.size, heard: round.byEar.size, phrases: phrases.length,
        review: run.review.finish(), ...run.speech.result,
      },
    });
  }

  private head(person: GameCharacter) {
    return person.headPosition?.(new Vector3()) ?? person.root.position.clone().add(new Vector3(0, person.height * 0.86, 0));
  }

  frameStage(width: number, height: number) {
    if (!this.stage || !this.run) return;
    const area = document.querySelector(".loteria-scene, .loteria-score-scene")?.getBoundingClientRect();
    if (!area?.height || !area.width) return;
    const { beto, tona } = this.stage;
    frameLoteria(this.host.rig.cam, width, height, area, this.head(beto), this.head(tona), this.run.phase === "score");
  }

  update({ dt, blocked }: ModeFrame) {
    const { run, stage } = this;
    if (!run || !stage) return;
    const paused = blocked || (typeof document !== "undefined" && document.hidden);
    const step = dt * this.speed;
    this.dialogue.update(step, paused);
    this.host.updatePose(dt, LEARNER_SEAT.rot);
    for (const actor of [stage.beto, stage.tona, ...stage.guests]) actor.update(dt);
    if (paused) { run.cue?.cancel(); return; }
    run.time += step;
    if (run.phase !== "waiting" || run.busy) return;

    if (run.shout) {
      if (run.time >= run.shoutAt && run.round.shout()) void this.finish(run);
      return;
    }
    if (run.cue?.getSnapshot() === "listening") return;
    if (run.wrongShout) { run.wrongShout = false; void this.aside(run, "lt_b_notyet"); return; }
    const coaching = this.coachLine(run);
    if (coaching) { void this.aside(run, coaching); return; }
    const call = run.round.called.length;
    if (call >= run.round.deck.length) return;
    const due = run.spotlight < 0 ? run.namedAt + 4 : Math.min(run.coveredAt + 1.2, run.namedAt + (call <= 6 ? 10 : 7));
    if (run.time >= due) void this.call(run);
  }

  input(input: ModeInput) {
    const { run } = this;
    if (input.kind !== "key" || !run) return false;
    const { key, repeat } = input;
    if (key === "escape") { if (!repeat) this.exit(false); return true; }
    if (run.phase === "reading" && this.dialogue.key(key)) {
      loteriaUi({ micOn: this.micOn = this.dialogue.micOn });
      return true;
    }
    if (run.phase !== "waiting" && run.phase !== "calling") return false;
    const dir = directions[key];
    if (dir) {
      const index = useLoteria.getState().focus;
      const col = Math.max(0, Math.min(SIDE - 1, index % SIDE + dir[0]));
      const row = Math.max(0, Math.min(SIDE - 1, Math.floor(index / SIDE) + dir[1]));
      loteriaUi({ focus: row * SIDE + col });
      return true;
    }
    if (![" ", "enter", "l", "r"].includes(key)) return false;
    if (!repeat) {
      if (key === "l") this.requestShout(run);
      else if (key === "r") void this.repeat(run);
      else this.cover(run, useLoteria.getState().focus);
    }
    return true;
  }

  action(name: string, value?: string | boolean) {
    const { run } = this;
    if (!run) return;
    if (name === "exit") { this.exit(false); return; }
    if (name === "again" && run.phase === "score") {
      this.roundIndex++;
      this.host.rig.stage = loteriaShot();
      this.begin();
    }
    if (name === "cover" && typeof value === "string" && /^\d+$/.test(value) && run.round.board[Number(value)]) this.cover(run, Number(value));
    if (name === "focus" && (run.phase === "waiting" || run.phase === "calling") && typeof value === "string") {
      const focus = Number(value);
      if (run.round.board[focus] && useLoteria.getState().focus !== focus) loteriaUi({ focus });
    }
    if (name === "replay") void this.repeat(run);
    if (name === "shout") this.requestShout(run);
    if (name === "read" && run.phase === "reading" && typeof value === "string") this.dialogue.choose(value);
    if (name === "mic" && run.phase === "reading") {
      this.micOn = value === true;
      this.dialogue.setMic(this.micOn);
      loteriaUi({ micOn: this.micOn });
    }
  }

  exit(immediate: boolean) {
    if (!this.active) return;
    this.run?.speech.close();
    if (!immediate && this.run && this.stage) {
      if (this.run.phase !== "leaving") {
        if (this.run.phase === "score") this.host.rig.stage = loteriaShot();
        this.dialogue.cancel();
        // Invalidate all of the previous round's pending continuations.
        const leaving = this.run = { ...this.run, phase: "leaving", busy: true, review: new PhraseRun(SIT) };
        loteriaUi({ result: null, caller: null, verse: null, read: [], ready: false, winningCells: [], replay: false, tip: null, glow: -1 });
        this.setPhase(leaving, "leaving");
        void this.say(leaving, "lt_t_bye").then(() => { if (this.run === leaving) this.exit(true); });
      }
      return;
    }

    this.starting = false;
    this.attempt++;
    this.run = null;
    this.labels = {};
    this.dialogue.cancel();
    const stage = this.stage;
    this.stage = null;
    if (stage) {
      stage.restore();
      this.host.rig.stage = null;
      this.host.rig.cam.zoom = 1;
      this.host.rig.cam.clearViewOffset();
      this.host.place(LOTERIA_APPROACH.x, LOTERIA_APPROACH.z, LOTERIA_APPROACH.rot);
      this.scene.save();
    }
    resetLoteriaUi();
    this.host.left(this.id);
  }

  debug(seed: number, speed: number) {
    if (!import.meta.env.DEV) return;
    this.debugSeed = seed;
    this.speed = Math.max(1, Math.min(speed, 12));
  }

  state() {
    const { run, stage } = this;
    if (!import.meta.env.DEV || !run || !stage) return null;
    const { phase, round } = run;
    return { phase, kind: round.kind, board: round.board.map(({ id }) => id), current: round.current?.id, faceDown: round.faceDown, covered: [...round.covered],
      said: run.speech.count, calls: round.called.map(({ id }) => id), ready: !!round.pattern, heads: [this.head(stage.beto), this.head(stage.tona)] };
  }

  dispose() { this.exit(true); }
}
