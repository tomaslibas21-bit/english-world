import { create } from "zustand";
import { STREET_CHATTER, STREET_MOMENTS } from "../../content/street";
import { coachVoice } from "../../content/voices";
import type { Sentence } from "../../convo/compose";
import { cardKey, useCards } from "../../state/cards";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import { ModeDialogue, type KitLine, type KitMic } from "../kit/dialogue";
import { freeToWalk } from "../phone/schedule";
import { learnerTurn } from "../kit/lines";
import { keepPhrases } from "../kit/phrases";
import { byCast, resolveStreetLine, streetSpeechTexts, streetText, streetVoice, type Gender } from "./lines";
import { emptyStreet, localStreetDay, recordHelp, recordStart } from "./memory";
import {
  drawChatter, drawMoment, momentDue, newStreetClock, randomWait, reschedule, STREET_WAIT,
  streetContext, streetFree, tickStreetClock, type MomentDraw, type StreetSnapshot,
} from "./schedule";
import type { StreetChatter, StreetLine, StreetMoment } from "./types";
import { STREET_WORDS } from "./words";

export interface StreetCharacter {
  gender?: Gender;
  root: { userData: Record<string, unknown> };
  height: number;
  talk(seconds: number, level?: () => number | null, vowel?: () => number | null): void;
  react?(kind: "nod"): void;
}

export interface StreetAnchor { x: number; y: number }
export interface StreetProjection extends StreetAnchor { onScreen: boolean }

/** Initial placement clears the area occupied by a typical phone card. */
export const STREET_PHONE_CARD_BOTTOM = 0.38;

export interface StreetActor {
  person: StreetCharacter;
  tick(dt: number, waiting: boolean): void;
  answer(helped: boolean): void;
  tooFar(): boolean;
  projection(): { person: StreetProjection; prop: StreetProjection | null };
  leave(): void;
  dispose(): void;
}

export interface StreetPair {
  members: [{ person: StreetCharacter; gender: Gender }, { person: StreetCharacter; gender: Gender }];
  near?: StreetChatter["near"];
  hold(seconds: number): void;
}

export interface StreetWorld {
  near(kind: StreetMoment["near"]): boolean;
  prepare(draw: Omit<MomentDraw, "bag">): (() => StreetActor) | undefined;
  pairs(radius: number): StreetPair[];
  anchor(person: StreetCharacter, clamp?: boolean): StreetAnchor | null;
  gender(person: StreetCharacter): Gender | undefined;
  tick(dt: number, outdoors?: boolean): void;
  dispose(): void;
}

type StreetStep = "arrival" | "scene" | "open" | "choices" | "answer" | "reply" | "away" | "done";
type DisplayLine = KitLine & { voice: string; gender: Gender; learner?: boolean };
interface MomentView {
  key: number;
  draw: MomentDraw;
  step: StreetStep;
  exchange: number;
  named: boolean;
  role: string;
  scene?: string;
  reward?: Sentence;
  line: DisplayLine | null;
  hint: boolean;
  choices: KitLine[];
  mic: KitMic;
  choose(key: string): void;
  replay(): void;
  toggleMic(): void;
  dismiss(): void;
}

interface BubbleView {
  key: number;
  id: string;
  line: DisplayLine;
  anchor: StreetAnchor | null;
  translated: boolean;
  translate(): void;
}

interface LightChatter {
  key: number;
  lines: DisplayLine[];
  play(): void;
  dismiss(): void;
}

export const useStreet = create<{
  moment: MomentView | null;
  bubble: BubbleView | null;
  marker: StreetAnchor | null;
  lightChatter: LightChatter | null;
}>(() => ({ moment: null, bubble: null, marker: null, lightChatter: null }));

const silentMic: KitMic = { status: "off", heard: "" };
const STREET_CARD = "street";
const session = { pace: newStreetClock(Math.random) };
let viewKey = 0;

interface Active {
  draw: MomentDraw;
  view: MomentView;
  actor?: StreetActor;
  namedKey: string;
  hintKey?: string;
  lastReply?: DisplayLine;
  answerAge: number;
  age: number;
}

interface Overheard {
  id: string;
  lines: DisplayLine[];
  pair?: StreetPair;
  speaker?: StreetCharacter;
  ms?: number;
  extended: boolean;
}

const memory = () => useStore.getState().progress.street ?? emptyStreet();
const today = () => localStreetDay(new Date());

export class StreetLife {
  private active: Active | null = null;
  private overheard: Overheard | null = null;
  private speaking: StreetCharacter | undefined;
  private beat: { left: number; finish(ok: boolean): void } | null = null;
  private bubbleLeft = 0;
  private chatterClock = 0;
  private chatterDue: number;
  private phoneWait = 0;
  private streetWait = 0;
  private snapshot: StreetSnapshot | undefined;
  private lastHidden = false;
  private lightFrame = 0;
  private lightLast: number | undefined;
  private requested: { wait: number; id?: string; cast?: string; chatter?: string } | null = null;
  private dialogue = new ModeDialogue({
    framePlayback: true,
    allowBrowserVoice: true,
    say: (line) => {
      this.patchMoment({ line: line as DisplayLine | null, hint: !!line && this.active?.hintKey === line.key });
    },
    choices: (choices) => this.patchMoment({ choices }),
    mic: (mic) => this.patchMoment({ mic }),
    answer: (line) => {
      const answer = line as DisplayLine;
      const active = this.active;
      if (!active) return;
      const { script, cast } = active.draw;
      let reward: Sentence | undefined;
      if (active.view.exchange === (script.then ? 1 : 0)) {
        const phrase = byCast(script.card, cast.id);
        reward = phrase ? this.displayLine(phrase, cast.gender, "card").sentence : answer.sentence;
      }
      this.showHint(active, answer);
      this.patchMoment({ step: "answer", line: answer, hint: active.hintKey === answer.key, reward });
      active.actor?.person.react?.("nod");
    },
    animate: (seconds) => this.speaking?.talk(seconds, () => audio.level(), () => audio.vowel()),
  });

  constructor(private world?: StreetWorld) {
    this.chatterDue = this.world ? randomWait(STREET_WAIT.chatter, Math.random) : STREET_WAIT.lightChatter;
  }

  get blocksPhone() { return !!this.active || this.streetWait > 0; }

  private patchMoment(patch: Partial<MomentView>) {
    if (!this.active) return;
    const previous = this.active.view.step;
    this.active.view = { ...this.active.view, ...patch };
    if (this.active.view.step !== "arrival") {
      if (previous === "arrival") {
        const { toasts, townToasts, dismissToast } = useStore.getState();
        for (const toast of [...toasts, ...townToasts.map(({ toast }) => toast)]) {
          if (toast.source === STREET_CARD) dismissToast(toast.id);
        }
      }
      useStreet.setState({ moment: this.active.view });
    }
  }

  private displayLine(line: StreetLine, gender: Gender, key: string, voice?: string, learner = false): DisplayLine {
    const profile = useStore.getState().progress.profile?.gender;
    const sentence = resolveStreetLine(line, profile ?? "f", gender);
    return {
      key, sentence, learner,
      voice: learner ? coachVoice(profile) : streetVoice(gender, voice, undefined, (id) => audio.hasClip(id, 1, sentence.say)),
      gender: learner ? profile ?? "f" : gender,
    };
  }

  private wait(seconds: number) {
    return new Promise<boolean>((finish) => { this.beat = { left: seconds, finish }; });
  }

  private cancelDialogue() {
    this.dialogue.cancel();
    this.beat?.finish(false);
    this.beat = null;
    this.speaking = undefined;
  }

  observe(snapshot: StreetSnapshot) {
    this.snapshot = snapshot;
    session.pace = tickStreetClock(session.pace, 0, snapshot);
    if (snapshot.cardOpen) this.phoneWait = STREET_WAIT.phone;
    const conflict = !streetContext(snapshot) || snapshot.cardOpen || (!snapshot.light && (snapshot.panel || snapshot.dialog));
    if (conflict && this.active) this.finishMoment(true);
    if (conflict || (snapshot.light && snapshot.panel)) this.clearChatter();
    if (!snapshot.town || !snapshot.outdoors) this.world?.tick(0, false);
    if (!snapshot.visible) this.lastHidden = true;
    if (!snapshot.visible || snapshot.light && snapshot.panel) this.dialogue.update(0, true);
  }

  tick(dt: number, snapshot: StreetSnapshot, elapsed = dt) {
    this.observe(snapshot);
    if (!snapshot.visible) return;
    if (this.lastHidden) { this.lastHidden = false; elapsed = 0; dt = 0; }
    this.updatePacing(elapsed, snapshot);
    const paused = !!(snapshot.light && snapshot.panel);
    this.dialogue.update(dt, paused);
    if (!paused) this.updateActivity(dt);
    if (snapshot.town && snapshot.outdoors) this.world?.tick(dt);
    if (this.runRequest(dt) || this.active || !this.canStart()) return;
    if (momentDue(session.pace)) {
      if (this.startMoment()) return;
      session.pace = reschedule(session.pace, false, Math.random);
    }
    if (this.chatterClock >= this.chatterDue && !this.overheard && !this.startChatter()) {
      this.chatterDue = this.chatterClock + 0.4;
    }
  }

  private updatePacing(elapsed: number, snapshot: StreetSnapshot) {
    session.pace = tickStreetClock(session.pace, elapsed, snapshot);
    if (snapshot.visible && freeToWalk(snapshot)) this.streetWait = Math.max(0, this.streetWait - elapsed);
    if (!streetFree(snapshot)) return;
    this.phoneWait = Math.max(0, this.phoneWait - elapsed);
    if (!this.active && !this.phoneWait) this.chatterClock += elapsed;
  }

  private updateActivity(dt: number) {
    const active = this.active;
    if (active) {
      active.age += dt;
      const waiting = active.view.step === "choices";
      if (active.view.step !== "done") active.actor?.tick(dt, waiting);
      const marker = waiting && active.actor ? this.world?.anchor(active.actor.person) ?? null : null;
      this.setMarker(marker);
      if (waiting) active.answerAge += dt;
      if (active.view.step !== "away" && active.view.step !== "done" &&
          (active.actor?.tooFar() || active.answerAge >= STREET_WAIT.answer || active.age >= 45)) this.walkAway(active);
    }
    if (this.beat && (this.beat.left -= dt) <= 0) {
      const beat = this.beat;
      this.beat = null;
      beat.finish(true);
    }
    const bubble = useStreet.getState().bubble;
    if (bubble && this.overheard?.speaker) {
      this.bubbleLeft -= dt;
      const anchor = this.world?.anchor(this.overheard.speaker, true) ?? null;
      if (anchor?.x !== bubble.anchor?.x || anchor?.y !== bubble.anchor?.y) useStreet.setState({ bubble: { ...bubble, anchor } });
    }
  }

  private setMarker(marker: StreetAnchor | null) {
    const old = useStreet.getState().marker;
    if (marker?.x !== old?.x || marker?.y !== old?.y) useStreet.setState({ marker });
  }

  private canStart() {
    const s = this.snapshot;
    return !!s && streetFree(s) && !s.panel && !s.dialog && this.phoneWait <= 0;
  }

  private startMoment(dev?: { id?: string; cast?: string }) {
    if (this.active || !this.canStart()) return false;
    let place: (() => StreetActor) | undefined;
    const day = today();
    const next = drawMoment(STREET_MOMENTS, memory(), day, Math.random, (draw) => {
      if (!this.world) return true;
      if (!this.world.near(draw.moment.near)) return false;
      place = this.world.prepare(draw);
      return !!place;
    }, dev);
    if (!next) return false;
    this.clearChatter();
    const { moment, cast } = next;
    const st = useStore.getState();
    const origin = STREET_MOMENTS.find((item) => item.id === moment.after?.id) ?? moment;
    const namedKey = `street:name:${origin.id}:${cast.name ?? cast.id}`;
    const profile = st.progress.profile?.gender ?? "f";
    const scene = byCast(next.script.scene, cast.id);
    const view: MomentView = {
      key: ++viewKey, draw: next, step: "arrival", exchange: 0, named: !!st.progress.seenIntro[namedKey],
      role: streetText(cast.role, profile, cast.gender), scene: scene && streetText(scene, profile, cast.gender),
      choices: [], line: null, hint: false, mic: silentMic,
      choose: (key) => this.dialogue.choose(key), replay: () => this.replayMoment(),
      toggleMic: () => this.toggleMic(), dismiss: () => { if (this.active === active) this.walkAway(active); },
    };
    const active = this.active = { draw: next, view, actor: place?.(), namedKey, age: 0, answerAge: 0 };
    session.pace = { ...session.pace, sessionCount: session.pace.sessionCount + 1 };
    st.updateProgress((p) => recordStart(p.street ??= emptyStreet(), moment.id, cast.id, day, next.bag));
    this.dialogue.setMic(false);
    void this.runMoment(active);
    return true;
  }

  private async runMoment(active: Active) {
    const { script, cast } = active.draw;
    if (!await this.wait(1) || this.active !== active) return;
    if (active.view.scene) {
      this.patchMoment({ step: "scene" });
      if (!await this.wait(1.25) || this.active !== active || active.view.step === "away") return;
    }
    let helped = true;
    for (const [exchange, part] of [script, script.then].entries()) {
      if (!part) continue;
      const open = byCast(part.open, cast.id);
      if (open?.length && !await this.sayMomentLines(active, open, "open", exchange)) return;
      if (script.named && exchange === 0 && open?.length) this.revealName(active);
      const sources = part.choices.map(({ say }) => byCast(say, cast.id)!);
      const choices = sources.map((line, i) => this.displayLine(line, cast.gender, `${exchange}:choice:${i}`, undefined, true));
      const profile = useStore.getState().progress.profile?.gender ?? "f";
      const accept = Object.fromEntries(choices.map(({ key }, i) => [key, streetSpeechTexts(sources[i], profile, cast.gender)]));
      active.answerAge = 0;
      this.patchMoment({ exchange, step: "choices" });
      const answer = await this.dialogue.expectLines(choices, learnerTurn(choices, accept)) as DisplayLine | null;
      if (!answer || this.active !== active || active.view.step === "away") return;
      const picked = part.choices[choices.indexOf(answer)];
      if (exchange === 0) active.actor?.answer(picked.helped !== false);
      helped &&= picked.helped !== false;
      const reply = byCast(picked.reply ?? part.reply, cast.id);
      if (reply?.length && !await this.sayMomentLines(active, reply, "reply", exchange)) return;
    }
    const { reward, role } = active.view;
    if (!reward || this.active !== active || active.view.step === "away") return;
    if (script.named) this.revealName(active);
    const { moment } = active.draw;
    const store = useStore.getState();
    if (helped) store.updateProgress((p) => recordHelp(p.street ??= emptyStreet(), moment.id, cast.id, today()));
    const key = cardKey(reward.en);
    const known = useCards.getState().keys.has(key);
    keepPhrases(STREET_CARD, [reward], role);
    if (!known && useCards.getState().keys.has(key)) {
      store.toast({ kind: "success", source: STREET_CARD, title: `${STREET_WORDS.newCard}: ${reward.en}`, ms: 2600 });
    }
    active.actor?.leave();
    const line = active.lastReply ?? active.view.line;
    this.patchMoment({ step: "done", line, hint: !!line && active.hintKey === line.key });
    if (await this.wait(2) && this.active === active) this.finishMoment(false);
  }

  private revealName(active: Active) {
    if (active.view.named || !active.draw.cast.name) return;
    useStore.getState().updateProgress((p) => { p.seenIntro[active.namedKey] = true; });
    this.patchMoment({ named: true });
  }

  private async sayMomentLines(active: Active, lines: StreetLine[], step: StreetStep, exchange: number) {
    const { cast } = active.draw;
    this.speaking = active.actor?.person;
    for (const [i, source] of lines.entries()) {
      const line = this.displayLine(source, cast.gender, `${exchange}:${step}:${i}`, cast.voice);
      this.showHint(active, line);
      this.patchMoment({ step, exchange, line, hint: active.hintKey === line.key });
      const said = await this.dialogue.sayLine(line, line.voice, 1, line.gender === "m");
      if (!said || this.active !== active || active.view.step !== step) return false;
      if (step === "reply") active.lastReply = line;
    }
    return true;
  }

  private showHint(active: Active, line: DisplayLine) {
    const st = useStore.getState();
    const key = "street:translation";
    if (st.progress.seenIntro[key]) return;
    active.hintKey = line.key;
    st.updateProgress((p) => { p.seenIntro[key] = true; });
  }

  private replayMoment() {
    const active = this.active;
    const line = active?.view.line;
    if (!line) return;
    this.speaking = active.actor?.person;
    void this.dialogue.replayLine(line, line.voice, 1, line.gender === "m", line.learner);
  }

  private toggleMic() {
    if (!this.active) return;
    const { status } = this.active.view.mic;
    this.dialogue.setMic(status !== "listening" && status !== "starting");
  }

  private walkAway(active: Active) {
    if (active.view.step === "away" || active.view.step === "done") { this.finishMoment(false); return; }
    const { script, cast } = active.draw;
    const away = byCast(script.away, cast.id);
    if (!away) { this.finishMoment(false); return; }
    this.cancelDialogue();
    this.patchMoment({ step: "away", reward: undefined });
    void this.sayMomentLines(active, [away], "away", active.view.exchange).then(async (said) => {
      if (said && await this.wait(0.65) && this.active === active) this.finishMoment(false);
    });
  }

  private finishMoment(silent: boolean) {
    const active = this.active;
    if (!active) return;
    this.active = null;
    this.cancelDialogue();
    useStreet.setState({ moment: null, marker: null });
    if (active.view.step !== "done") {
      if (silent && !(this.snapshot?.town && this.snapshot.outdoors)) active.actor?.dispose();
      else active.actor?.leave();
    }
    this.streetWait = STREET_WAIT.phone;
    session.pace = reschedule(session.pace, true, Math.random);
  }

  private startChatter(id?: string, forced = false) {
    if (this.active || !this.canStart() || this.overheard) return false;
    const saved = memory().chatterBag;
    const candidates = this.world ? this.world.pairs(forced ? 25 : 5) : [undefined];
    for (const pair of candidates) {
      const next = drawChatter(STREET_CHATTER, saved, Math.random, pair?.near, id, !this.world);
      if (!next) continue;
      useStore.getState().updateProgress((p) => { (p.street ??= emptyStreet()).chatterBag = next.bag; });
      this.chatterDue = this.chatterClock + (pair ? randomWait(STREET_WAIT.chatter, Math.random) : STREET_WAIT.lightChatter);
      const lines = next.chatter.lines.map((line, i) => this.displayLine(line, pair?.members[i].gender ?? (i ? "f" : "m"), String(i)));
      if (pair) void this.runBubbles({ id: next.chatter.id, pair, lines, extended: false });
      else this.showLightChatter(next.chatter.id, lines);
      return true;
    }
    return false;
  }

  private async runBubbles(snippet: Overheard) {
    this.overheard = snippet;
    for (const [i, line] of snippet.lines.entries()) {
      const speaker = snippet.pair?.members[i].person ?? snippet.speaker;
      if (!speaker) break;
      snippet.speaker = this.speaking = speaker;
      snippet.extended = false;
      const duration = (snippet.ms ?? 3500) / 1000;
      this.bubbleLeft = duration;
      snippet.pair?.hold(duration + 12);
      useStreet.setState({ bubble: {
        key: ++viewKey, id: snippet.id, line, anchor: this.world?.anchor(speaker, true) ?? null, translated: false,
        translate: () => this.translateBubble(snippet),
      } });
      if (!await this.dialogue.sayLine(line, line.voice, 1, line.gender === "m") || this.overheard !== snippet) return;
      while (this.bubbleLeft > 0 && this.overheard === snippet) {
        if (!await this.wait(this.bubbleLeft)) return;
      }
    }
    if (this.overheard === snippet) this.clearChatter();
  }

  private translateBubble(snippet: Overheard) {
    const bubble = useStreet.getState().bubble;
    if (!bubble || this.overheard !== snippet || snippet.extended) return;
    snippet.extended = true;
    this.bubbleLeft = Math.max(0, this.bubbleLeft) + 4;
    snippet.pair?.hold(this.bubbleLeft + 12);
    useStreet.setState({ bubble: { ...bubble, translated: true } });
  }

  private showLightChatter(id: string, lines: DisplayLine[]) {
    const card: LightChatter = {
      key: ++viewKey, lines,
      dismiss: () => { if (useStreet.getState().lightChatter === card) this.clearChatter(); },
      play: async () => {
        if (!this.canStart() || this.active || this.overheard || useStreet.getState().lightChatter !== card) return;
        const snippet = this.overheard = { id, lines, extended: false };
        for (const line of lines) {
          if (!await this.dialogue.sayLine(line, line.voice, 1, line.gender === "m") || this.overheard !== snippet) return;
        }
        this.overheard = null;
      },
    };
    useStreet.setState({ lightChatter: card });
  }

  private clearChatter() {
    if (this.overheard) {
      this.overheard.pair?.hold(0.35);
      this.overheard = null;
      this.cancelDialogue();
    }
    const view = useStreet.getState();
    if (view.bubble || view.lightChatter) useStreet.setState({ bubble: null, lightChatter: null });
  }

  say(character: StreetCharacter, line: StreetLine, opts?: { ms?: number }) {
    if (!this.world || this.active || !this.canStart() || this.overheard) return;
    const gender = character.gender ?? this.world.gender(character) ?? "f";
    void this.runBubbles({ id: "", lines: [this.displayLine(line, gender, "say")], speaker: character, ms: opts?.ms, extended: false });
  }

  startLight(snapshot: () => StreetSnapshot, inputTick?: (dt: number) => void) {
    const tick = (now: number) => {
      const elapsed = this.lightLast === undefined ? 0 : Math.max(0, (now - this.lightLast) / 1000);
      this.lightLast = now;
      const dt = Math.min(0.05, elapsed);
      inputTick?.(dt);
      this.tick(dt, snapshot(), elapsed);
      this.lightFrame = requestAnimationFrame(tick);
    };
    this.lightFrame = requestAnimationFrame(tick);
  }

  devRequest() {
    if (!import.meta.env.DEV) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("street") || undefined;
    const chatter = params.get("chatter") || undefined;
    if (id || chatter) this.requested = { wait: 3, id, cast: params.get("cast") || undefined, chatter };
  }

  private runRequest(dt: number) {
    const request = this.requested;
    if (!request || !this.canStart() || this.active) return false;
    request.wait -= dt;
    if (request.wait > 0) return false;
    this.requested = null;
    return request.id ? this.streetNow(request.id, request.cast) : this.streetChatterNow(request.chatter === "1" ? undefined : request.chatter);
  }

  streetNow(id?: string, cast?: string) { return import.meta.env.DEV && this.startMoment({ id, cast }); }
  streetChatterNow(id?: string) {
    if (!import.meta.env.DEV || !this.canStart() || this.active) return false;
    this.clearChatter();
    return this.startChatter(id, true);
  }
  streetState() {
    if (!import.meta.env.DEV) return undefined;
    const active = this.active;
    const saved = memory();
    const { clock, due, sessionCount } = session.pace;
    return { clock, due, sessionCount, active: active ? {
      id: active.draw.moment.id, cast: active.draw.cast.id, script: active.draw.scriptName, step: active.view.step,
      ...(active.actor?.projection() ?? { person: null, prop: null }),
    } : null, bag: [...saved.bag], memory: structuredClone(saved.moments) };
  }
  streetAdvance(seconds: number, snapshot: StreetSnapshot) {
    if (!import.meta.env.DEV || !Number.isFinite(seconds) || seconds < 0) return;
    this.tick(0, snapshot, seconds);
  }

  dispose() {
    if (this.lightFrame) cancelAnimationFrame(this.lightFrame);
    this.finishMoment(true);
    this.clearChatter();
    this.world?.dispose();
  }
}
