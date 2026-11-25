import { coachVoice } from "../../content/voices";
import { createSpeechAttempt, hasNegation, speechSupported } from "../../convo/speech";
import { surfaceTokens } from "../../convo/normalize";
import { useStore } from "../../state/store";
import type { PhraseSource } from "../../ui/kit/PhraseSave";
import { audio } from "../audio";
import { chamberAt, TREES, type Stone } from "./plan";
import type { CaveNotice } from "./config";
import type { createCaveRouting } from "./routing";
import type { CaveRules, CaveSave } from "./progress";
import { allHeard, firstLine, nextLine, stoneMeaningChoices, type StonePhrase } from "./stonePhrases";

import { StoneCall, type Listener } from "./call";
import type { CaveView } from "./Cave";

export type { CaveSave } from "./progress";

const TREE = TREES[1];
const REARM = 40;
type Point = { x: number; z: number };

export interface GlyphQuiz {
  id: string;
  opening: number;
  source: PhraseSource;
  s: StonePhrase["s"];
  text: string;
  lt: string;
  options: string[];
  answer: number;
  wrong: number[];
  shown: boolean;
  solved: boolean;
  unavailable: boolean;
  mic: "off" | "listening" | "missed" | "unsupported";
  heard: string;
}

export interface CaveCard {
  n: number;
  of: number;
  name: string;
  lt: string;
  lit: number;
  stones: number;
  open: number;
  next: string;
  count: string;
  nextSitId?: string;
}

interface Opening {
  quiz: GlyphQuiz;
  phrase: StonePhrase;
  playback?: AbortController;
}

function announce(copy: CaveNotice, kind: "info" | "success" | "tip" | "stamp" = "success") {
  useStore.getState().toast({ kind, title: copy.title.lt, body: copy.body?.lt });
}

function saidBack(text: string, phrase: string) {
  const heard = surfaceTokens(text), expected = surfaceTokens(phrase);
  if (!heard.length || !expected.length || hasNegation(text) !== hasNegation(phrase)) return false;
  const matches = new Uint8Array(expected.length + 1);
  for (const word of heard) {
    let previous = 0;
    for (let i = 1; i <= expected.length; i++) {
      const old = matches[i];
      matches[i] = word === expected[i - 1] ? previous + 1 : Math.max(old, matches[i - 1]);
      previous = old;
    }
  }
  const n = matches[expected.length];
  return n / expected.length >= (expected.length <= 3 ? 1 : 0.8) && n / heard.length >= 0.6;
}
/** Owns physical progress, listening and the single reader opening for this visit. */
export class CaveQuest {
  save: CaveSave;
  mask = 0;
  readonly pool = new Map<string, StonePhrase>();
  readonly phrases = new Map<string, StonePhrase>();
  readonly relit = new Set<string>();
  private readonly countdowns = new Map<string, number>();
  get rearm(): ReadonlyMap<string, number> { return this.countdowns; }
  replay: boolean;

  private readonly rearming: string[];
  private rearmingCount = 0;
  private readonly callCandidates: Stone[];
  private lineChoices: StonePhrase[] = [];
  private lines: readonly StonePhrase[][] = [];
  private heard = new Set<string>();
  private taken = new Set<string>();
  private failed = new Set<string>();
  private voice = "";
  private ear: Listener = { x: 0, z: 0, yaw: 0 };
  private alive = true;
  private mounted = false;
  private opening?: Opening;
  private openingId = 0;
  private attempt?: ReturnType<typeof createSpeechAttempt>;
  private emitter = new StoneCall();
  private calling?: Stone;
  private callTime = 2.5;
  private flashTime = 0;
  private turn = 0;
  private treeAsked = false;
  private warned?: string;
  private warningTime = 0;
  private cardRoom = -1;

  constructor(private view: CaveView, initial: CaveSave | undefined, private persist: (save: CaveSave, phrase?: StonePhrase) => void,
    readonly rules: CaveRules, private routing: ReturnType<typeof createCaveRouting>, private syncGates: (mask: number) => void,
    private loadLibrary: () => Promise<readonly StonePhrase[][]>) {
    this.rearming = new Array(rules.sites.length);
    this.callCandidates = new Array(rules.sites.length);
    this.save = rules.normalize(initial);
    this.replay = !!this.save.tree;
    this.sync(true);
    for (const id of this.save.lit) if (!this.replay) this.view.setStone(id, true);
  }

  enter() {
    if (this.mounted) return;
    this.mounted = true;
    this.voice = coachVoice(useStore.getState().progress.profile?.gender);
    const returning = this.save.seen;
    this.replace({ ...this.save, seen: true });
    announce(returning ? this.rules.config.copy.toast.returning : this.rules.config.copy.toast.first, "tip");
    void this.loadLines();
  }

  async loadLines() {
    if (this.lines.length || !this.alive) return;
    const lines = await this.loadLibrary().catch(() => null);
    if (!lines || !this.alive || this.lines.length) return;
    this.lines = lines;
    this.lineChoices = new Array(lines.reduce((n, room) => n + room.length, 0));
    for (const group of lines) for (const line of group) this.pool.set(line.id, line);
    this.heard = new Set((this.save.heard ?? []).filter((id) => this.pool.has(id)));
    if (allHeard(lines, this.heard)) this.finishRound();
    else if (this.save.heard && this.heard.size !== this.save.heard.length) this.replace({ ...this.save, heard: [...this.heard] });
    this.assign();
  }

  private assign() {
    const { sites } = this.rules;
    for (let i = 0; i < sites.length; i++) {
      const { stone: { id }, chamber } = sites[i];
      if (this.phrases.has(id)) continue;
      const line = this.replay ? nextLine(this.lines, chamber, this.heard, this.taken, Math.random, this.lineChoices) : this.pool.get(firstLine(id));
      if (!line) continue;
      this.phrases.set(id, line);
      this.taken.add(line.id);
    }
  }

  private sync(initial = false) {
    const next = this.rules.gateMask(this.save), { gates } = this.rules.config;
    for (let i = 0; i < gates.length; i++) {
      const bit = 1 << i;
      if (initial || ((this.mask ^ next) & bit)) this.view.setGate(gates[i].id, !!(next & bit), initial);
    }
    if (initial || next !== this.mask) this.syncGates(next);
    this.mask = next;
    if (initial) this.view.setHeart(!!this.save.heart, true);
  }

  private eligible(id: string) {
    const entry = this.rules.stones.get(id);
    if (!entry) return false;
    const required = this.rules.config.stoneMasks[entry.chamber];
    return (this.mask & required) === required;
  }

  light(id: string) {
    if (!this.alive || !this.eligible(id) || this.save.lit.includes(id)) return false;
    this.replace({ ...this.save, lit: [...this.save.lit, id] });
    return true;
  }

  pass(gate: string) {
    const keeper = this.rules.keeperByGate.get(gate);
    if (!this.alive || !keeper || this.save.passed.includes(gate) || (this.mask & keeper.requires) !== keeper.requires) return false;
    this.replace({ ...this.save, passed: [...this.save.passed, gate] });
    this.callTime = 2.5;
    if (this.mounted) {
      announce(keeper.passed);
      audio.sfx("success");
    }
    return true;
  }

  treeNear(at: Point, reach = 4.7) {
    return this.mask === this.rules.fullMask && Math.hypot(TREE.x - at.x, TREE.z - at.z) < reach;
  }

  treeHeard() {
    if (!this.alive || this.mask !== this.rules.fullMask || this.save.tree) return false;
    this.replace({ ...this.save, tree: true });
    if (this.mounted) announce(this.rules.config.copy.toast.replayStart, "tip");
    return true;
  }

  restore(save: CaveSave) {
    this.applySave(save, true);
  }

  replace(save: CaveSave, phrase?: StonePhrase) {
    this.applySave(save);
    this.persist(this.save, phrase);
  }

  private applySave(save: CaveSave, restored = false) {
    const previous = this.save;
    this.save = this.rules.normalize(save);
    if (restored) this.heard = new Set((this.save.heard ?? []).filter((id) => this.pool.has(id)));
    const replay = !!this.save.tree;
    if (this.replay !== replay) {
      this.replay = replay;
      this.relit.clear();
      this.countdowns.clear();
      this.rearmingCount = 0;
      this.phrases.clear();
      this.taken.clear();
      this.assign();
      for (const { stone } of this.rules.sites) this.view.setStone(stone.id, !replay && this.save.lit.includes(stone.id));
      this.callTime = 2.5;
    } else if (!this.replay) {
      for (const id of previous.lit) if (!this.save.lit.includes(id)) this.view.setStone(id, false);
      for (const id of this.save.lit) if (!previous.lit.includes(id)) this.view.setStone(id, true);
    }
    if (previous.heart !== this.save.heart) this.view.setHeart(!!this.save.heart);
    this.sync();
    this.cardRoom = -1;
  }

  private waiting = (id: string) => this.eligible(id) && this.phrases.has(id)
    && !(this.replay ? this.relit.has(id) : this.save.lit.includes(id));

  guide(p: Point) {
    return this.routing.target(p, this.save, false, this.replay ? this.waiting : undefined);
  }

  guideTo(npc: string, p: Point) {
    return this.routing.target(p, this.save, false, undefined, npc);
  }

  gateTarget(from: Point, to: Point) {
    return this.routing.firstClosedGate(from, to, this.save) ? this.guide(from) : null;
  }

  near(p: Point) {
    let best: Stone | null = null, distance = 2.7;
    const { sites } = this.rules;
    for (let i = 0; i < sites.length; i++) {
      const { stone } = sites[i];
      const d = Math.hypot(stone.x - p.x, stone.z - p.z);
      if (d < distance && this.waiting(stone.id) && !this.routing.firstClosedGate(p, stone, this.save)) {
        best = stone;
        distance = d;
      }
    }
    return best;
  }

  update(dt: number, p: Point, yaw: number, quiet: boolean, offerOak?: () => boolean) {
    if (!this.alive) return;
    this.ear.x = p.x; this.ear.z = p.z; this.ear.yaw = yaw;
    const room = chamberAt(p.x, p.z);
    if (!this.treeNear(p, 3.6)) this.treeAsked = false;
    if (!quiet && !this.opening) {
      if (!this.treeAsked && !this.save.tree && this.treeNear(p, 3.6)) this.treeAsked = !!offerOak?.();
      if (this.calling) {
        this.emitter.move(this.calling, this.ear);
        if (this.flashTime > 0 && (this.flashTime -= dt) <= 0) {
          this.view.setCalling(null);
          if (!this.callOwner) this.stopCall();
        }
      } else if ((this.callTime -= dt) <= 0) this.call(room);
      if ((this.warningTime -= dt) <= 0) { this.warningTime = 0.35; this.warnAtGate(p); }
    } else this.stopCall();

    if ((!quiet || this.opening) && this.rearmingCount) this.updateRearm(dt);
    if (room !== this.cardRoom) this.card(room);
  }

  private updateRearm(dt: number) {
    // Keep the solve order when several stones expire in the same tick.
    let active = 0;
    for (let i = 0; i < this.rearmingCount; i++) {
      const id = this.rearming[i], remaining = this.countdowns.get(id)!;
      if (remaining > dt || this.opening?.quiz.id === id) {
        this.countdowns.set(id, Math.max(0, remaining - dt));
        this.rearming[active++] = id;
      } else {
        this.countdowns.delete(id);
        this.relit.delete(id);
        this.taken.delete(this.phrases.get(id)!.id);
        this.phrases.delete(id);
        this.assign();
        this.view.setStone(id, false);
        this.cardRoom = -1;
      }
    }
    this.rearmingCount = active;
  }

  private warnAtGate(p: Point) {
    const { gates } = this.rules.config;
    let nearby: typeof gates[number] | undefined;
    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i];
      if (!(this.mask & (1 << i)) && Math.hypot(gate.x - p.x, gate.z - p.z) < 3.4) {
        nearby = gate;
        break;
      }
    }
    if (nearby?.id === this.warned) return;
    this.warned = nearby?.id;
    if (nearby) announce(nearby.locked, "info");
  }

  private call(room: number) {
    this.callTime = 1.5;
    if (audio.getState() !== "idle") return;
    const stones = this.rules.config.chambers[room].stones;
    let available = 0;
    for (let i = 0; i < stones.length; i++) {
      const stone = stones[i];
      if (this.waiting(stone.id) && Math.hypot(stone.x - this.ear.x, stone.z - this.ear.z) <= 34 &&
          !this.routing.firstClosedGate(this.ear, stone, this.save)) this.callCandidates[available++] = stone;
    }
    if (!available) return;
    const stone = this.callCandidates[this.turn++ % available], phrase = this.phrases.get(stone.id)!;
    this.view.setCalling(stone.id);
    this.view.burst(stone.x, 1.5, stone.z, "#a7eee4");
    this.calling = stone;
    this.flashTime = 1.2;
    this.callTime = 2.5;
    if (!this.hasAudio(phrase) || !audio.volume) return;
    const call = this.emitter.start(this.voice, phrase.en, stone, this.ear, () => this.failed.add(phrase.id));
    const owner = this.callOwner = call;
    void call.then((said) => {
      if (this.callOwner !== owner) return;
      this.callOwner = undefined;
      this.stopCall();
      this.callTime = said ? 2.1 + Math.random() * 1.2 : 3.5;
    });
  }

  private callOwner?: Promise<boolean>;
  private stopCall() {
    if (!this.calling) return;
    this.callOwner = undefined;
    this.emitter.stop();
    this.calling = undefined;
    this.view.setCalling(null);
  }

  private card(room: number) {
    this.cardRoom = room;
    const { chambers, gates, copy: { guide, card }, wakeAt, treeSituation } = this.rules.config, c = chambers[room];
    const target = this.guide(this.ear);
    const keeper = target?.kind === "npc" ? this.rules.keeperByNpc.get(target.id) : undefined;
    const tree = target?.kind === "tree";
    const nextSitId = tree ? treeSituation : keeper?.sitId;
    let lit = 0, open = 1;
    if (this.replay) {
      for (let i = 0; i < c.stones.length; i++) if (this.relit.has(c.stones[i].id)) lit++;
    } else lit = this.rules.stonesLit(this.save, room);
    for (let i = 0; i < gates.length; i++) if (gates[i].to !== undefined && this.mask & (1 << i)) open++;
    const next = this.replay ? card.replayCount(this.heard.size).lt : (keeper?.guide ?? (tree ? guide.tree : guide.stone)).lt;
    const count = this.replay ? card.round((this.save.rounds ?? 0) + 1).lt : card.wakeCount(Math.min(this.save.lit.length, wakeAt)).lt;
    const st = useStore.getState(), previous = st.hud.cave;
    if (previous?.n === c.n && previous.lit === lit && previous.open === open && previous.next === next &&
        previous.nextSitId === nextSitId && previous.count === count) return;
    st.setHud({ cave: { n: c.n, of: chambers.length, name: c.label.en, lt: c.label.lt,
      lit, stones: c.stones.length, open, next, nextSitId, count } });
  }

  open(id: string, at: Point = this.ear) {
    const phrase = this.phrases.get(id);
    if (!this.alive || this.opening || !phrase || this.near(at)?.id !== id) return false;
    this.stopCall();
    const unavailable = !this.hasAudio(phrase);
    const quiz: GlyphQuiz = {
      id, opening: ++this.openingId, source: { situationId: this.rules.config.treeSituation, sourceLabel: this.rules.config.label },
      text: phrase.en, lt: phrase.lt, s: phrase.s, ...stoneMeaningChoices(id, phrase, this.save.lit.length, this.lines),
      wrong: [], shown: unavailable, solved: false, unavailable, mic: speechSupported() ? "off" : "unsupported", heard: "",
    };
    this.opening = { quiz, phrase };
    useStore.getState().setHud({ glyph: quiz, prompt: null });
    audio.hush("cave-reader", true, true);
    if (!unavailable) this.say();
    return true;
  }

  private hasAudio(phrase: StonePhrase) {
    return !this.failed.has(phrase.id) && audio.hasClip(this.voice, 1, phrase.en);
  }

  private patch(opening: Opening, patch: Partial<GlyphQuiz>) {
    if (this.opening !== opening) return;
    opening.quiz = { ...opening.quiz, ...patch };
    useStore.getState().setHud({ glyph: opening.quiz });
  }

  showWords(openingId = this.opening?.quiz.opening) {
    if (this.opening && this.opening.quiz.opening === openingId) this.patch(this.opening, { shown: true });
  }

  say(openingId = this.opening?.quiz.opening) {
    const opening = this.opening;
    if (!opening || opening.quiz.opening !== openingId || opening.playback) return;
    this.stopMic();
    if (!this.hasAudio(opening.phrase)) {
      if (!opening.quiz.unavailable) this.patch(opening, { shown: true, unavailable: true });
      return;
    }
    const playback = opening.playback = new AbortController();
    void audio.play(this.voice, 1, opening.phrase.en, {
      optional: true, recordingOnly: true, signal: playback.signal,
      onUnavailable: () => {
        if (audio.ready && this.opening === opening && opening.playback === playback) this.failed.add(opening.phrase.id);
      },
    }).then((played) => {
      if (this.opening !== opening || opening.playback !== playback) return;
      opening.playback = undefined;
      if (!played) this.patch(opening, { shown: true, unavailable: true });
      else if (opening.quiz.unavailable) this.patch(opening, { unavailable: false });
    });
  }

  pick(index: number, openingId = this.opening?.quiz.opening) {
    const opening = this.opening;
    if (!opening || opening.quiz.opening !== openingId || opening.quiz.solved || !opening.quiz.options[index] || opening.quiz.wrong.includes(index)) return;
    if (index === opening.quiz.answer) this.solve(opening);
    else this.patch(opening, { wrong: [...opening.quiz.wrong, index], shown: true });
  }

  listen(openingId = this.opening?.quiz.opening) {
    const opening = this.opening;
    if (!opening || opening.quiz.opening !== openingId || opening.quiz.solved || !speechSupported()) return;
    if (this.attempt?.running) { this.attempt.finish(); return; }
    this.stopPlayback(opening);
    this.stopMic();
    const attempt = createSpeechAttempt({
      lang: "en-US", phrases: [opening.phrase.en],
      preferLocal: useStore.getState().settings.onDevice,
      evaluate: (text) => saidBack(text, opening.phrase.en) ? "complete" : "open",
      onUpdate: (status) => {
        if (this.attempt !== attempt) return;
        const mic = status.status === "starting" || status.status === "reconnecting" || status.status === "listening" ? "listening"
          : status.status === "idle" ? "off" : "missed";
        this.patch(opening, { mic, heard: status.heard || opening.quiz.heard });
      },
      onCommit: (text, alts) => {
        if (this.attempt !== attempt || this.opening !== opening) return;
        if ([text, ...alts].some((line) => saidBack(line, opening.phrase.en))) this.solve(opening);
        else this.patch(opening, { mic: "missed", heard: text, shown: true });
      },
    });
    this.attempt = attempt;
    this.patch(opening, { mic: "listening", heard: "" });
    attempt.start();
  }

  private stopMic() {
    const attempt = this.attempt;
    this.attempt = undefined;
    attempt?.dispose();
    if (this.opening?.quiz.mic === "listening") this.patch(this.opening, { mic: "off" });
  }

  private stopPlayback(opening: Opening) {
    const playback = opening.playback;
    opening.playback = undefined;
    playback?.abort();
  }

  close(openingId = this.opening?.quiz.opening) {
    const opening = this.opening;
    if (!opening || opening.quiz.opening !== openingId) return;
    this.opening = undefined;
    this.stopMic();
    this.stopPlayback(opening);
    audio.hush("cave-reader", false);
    useStore.getState().setHud({ glyph: null });
    this.callTime = 2.5;
  }

  private finishRound() {
    this.heard.clear();
    this.replace({ ...this.save, heard: [], rounds: (this.save.rounds ?? 0) + 1 });
    if (this.mounted) announce(this.rules.config.copy.toast.replayDone, "stamp");
  }

  private solve(opening: Opening) {
    const { quiz, phrase } = opening;
    if (this.opening !== opening || quiz.solved || !this.waiting(quiz.id)) return;
    this.stopMic();
    this.stopPlayback(opening);
    this.patch(opening, { shown: true, solved: true, mic: speechSupported() ? "off" : "unsupported" });
    const { stone, chamber } = this.rules.stones.get(quiz.id)!;
    const before = this.save, mask = this.mask;
    this.heard.add(phrase.id);
    if (this.replay) {
      this.relit.add(quiz.id);
      this.countdowns.set(quiz.id, REARM);
      this.rearming[this.rearmingCount++] = quiz.id;
    }
    const lit = before.lit.includes(quiz.id) ? before.lit : [...before.lit, quiz.id];
    this.replace({ ...before, lit, heard: [...this.heard] }, phrase);
    if (this.replay) this.view.setStone(quiz.id, true);
    this.view.burst(stone.x, 1.5, stone.z, "#ffd76a");
    audio.sfx("success");
    const copy = this.rules.config.copy.toast;
    if (!before.heart && this.save.heart) announce(copy.treeAwoke, "stamp");
    else if (this.replay && !allHeard(this.lines, this.heard)) announce(copy.replayLit);
    else if (!this.replay) {
      const { gates, chambers } = this.rules.config;
      let opened: CaveNotice | undefined;
      for (let i = 0; i < gates.length && !opened; i++) if ((mask ^ this.mask) & (1 << i)) opened = gates[i].opened;
      const left = chambers[chamber].stones.length - this.rules.stonesLit(this.save, chamber);
      announce(opened ?? { title: copy.stoneLit.title, body: left ? copy.stoneLit.body(left) : undefined });
    }
    if (this.replay && allHeard(this.lines, this.heard)) this.finishRound();
    this.card(chamberAt(this.ear.x, this.ear.z));
  }

  dispose() {
    this.alive = false;
    this.close();
    this.stopCall();
    if (this.mounted) useStore.getState().setHud({ cave: null });
  }
}
