// One conversation between the learner and an NPC: plays NPC lines, opens the learner's
// turn (speech or typing), sends answers to the dialogue engine and records progress.
import { Conversation, type TurnOut } from "../convo/dialogue";
import { createSpeechAttempt, speechSupported } from "../convo/speech";
import { GLOBAL } from "../content/global";
import { COACH_VOICE, NPCS } from "../content/npcs";
import { SITUATION_BY_ID } from "../content/situations";
import type { SituationDef } from "../content/types";
import { useStore, type TranscriptLine } from "../state/store";
import { sitProgress, stars } from "../state/progress";
import { audio } from "./audio";
import { displayUtterance } from "../convo/normalize";
import { compose } from "../convo/compose";
import { setKnownNames } from "../convo/slots";
import type { Nlu } from "../convo/nlu";
import { answerCandidates, compareRepeat, makeGuess, pickSuggestions, playerVars, rankAnswers, repeatProgress, yesPicksGuess, type Guess } from "../convo/suggest";

const nluCache = new Map<string, Nlu>();
let lineId = 1;

export interface SessionHooks {
  npcTalk(npcId: string, seconds: number): void;
  onEvent(name: string, data: any): void;
  onEnd(sit: SituationDef, completed: boolean): void;
}

export class Session {
  sit: SituationDef;
  conv: Conversation;
  private speech: ReturnType<typeof createSpeechAttempt> | null = null;
  private alive = true;
  private busy = false;
  private hooks: SessionHooks;
  private wasCompleted = false;
  /** The pending "open the mic by itself" (after the person's turn, or after a miss). */
  private autoTimer: ReturnType<typeof setTimeout> | null = null;
  /** `speech` is a "listen and repeat" attempt (practice), not an answer. */
  private practicing = false;
  /** Bumped whenever a practice starts or is cancelled (a stale one never goes on to listen). */
  private practiceRun = 0;

  constructor(sitId: string, hooks: SessionHooks) {
    const sit = SITUATION_BY_ID[sitId];
    if (!sit) throw new Error("Unknown situation " + sitId);
    this.sit = sit;
    this.hooks = hooks;
    const st = useStore.getState();
    const prof = st.progress.profile;
    const sp = sitProgress(st.progress, sitId);
    const player = { name: prof?.name || "Tomas", surname: prof?.surname || "", gender: prof?.gender || "m", datePartner: prof?.datePartner };
    setKnownNames([player.name, player.surname].filter(Boolean));
    audio.names = [player.name, player.surname].filter(Boolean);
    this.conv = new Conversation(sit, {
      global: GLOBAL, npcs: NPCS, player, visits: sp.completions, memory: sp.memory, sharedNlu: nluCache,
    });
    st.updateProgress((p) => {
      const s = sitProgress(p, sitId);
      s.visits++; s.lastPlayed = Date.now();
      p.sits[sitId] = s;
    });
  }

  async begin() {
    const st = useStore.getState();
    const prof = st.progress.profile;
    const date = this.sit.npc === "sam" || this.sit.npc === "emma";
    const npcId = date ? prof?.datePartner ?? (prof?.gender === "f" ? "sam" : "emma") : this.sit.npc;
    st.setConv({
      active: true, sitId: this.sit.id, npcId, hostId: npcId, mode: this.sit.mode ?? "talk", transcript: [], phase: "npc",
      suggest: [], hints: [], chosen: {}, openHint: null, mic: { status: speechSupported() ? "off" : "unsupported", heard: "" },
      failures: 0, lastHeard: "", prefix: false, completed: false, speaking: null, reveal: {}, note: null, typing: !speechSupported(), newExpressions: [],
      checklist: [], focus: 0, stepId: null, guess: null, practice: null, run: st.conv.run + 1, guideHidden: false,
    });
    const out = this.conv.start();
    await this.play(out);
  }

  private pushLine(l: Omit<TranscriptLine, "id">) {
    const id = lineId++;
    useStore.getState().setConv((c) => ({ transcript: [...c.transcript, { ...l, id }].slice(-40) }));
    return id;
  }

  private async play(out: TurnOut) {
    if (!this.alive) return;
    const st = useStore.getState();
    // the question the person is about to ask (the phase picture changes as they start speaking);
    // "closing" when this turn is the goodbye
    st.setConv({ phase: "npc", stepId: this.conv.ended ? "closing" : this.conv.pending?.id ?? this.conv.effectiveStep()?.id ?? null });
    this.stopListening();
    if (out.note) st.setConv({ note: out.note });
    for (const l of out.lines) {
      if (!this.alive) return;
      const npc = NPCS[l.npc];
      const id = this.pushLine({ who: "npc", npc: l.npc, sentence: l.sentence, slow: l.slow });
      const slow = !!l.slow || useStore.getState().settings.slowVoice;
      useStore.getState().setConv({ speaking: id, npcId: l.npc });
      const dur = audio.clipDuration(npc?.voice ?? "af_bella", npc?.speed ?? 1, l.sentence.say) ?? Math.max(1.2, l.sentence.say.length * 0.06);
      this.hooks.npcTalk(l.npc, dur / (slow ? 0.82 : 1));
      await audio.play(npc?.voice ?? "af_bella", npc?.speed ?? 1, l.sentence.say, { slow, male: npc?.gender === "m" });
      await wait(160);
    }
    // the learner left (Esc, another situation) while the person was talking: no events (a taxi
    // ride…) or next turn from this conversation (close() has already counted a completed task)
    if (!this.alive) return;
    useStore.getState().setConv({ speaking: null });
    if (out.showMeaning) {
      // reveal the Lithuanian of the NPC's last turn
      const tr = useStore.getState().conv.transcript;
      const rv: Record<number, boolean> = {};
      for (const t of tr.slice(-out.lines.length - 3)) if (t.who === "npc") rv[t.id] = true;
      useStore.getState().setConv((c) => ({ reveal: { ...c.reveal, ...rv } }));
    }
    for (const e of out.events) this.hooks.onEvent(e.name, e.data);
    if (out.completed && !this.wasCompleted) this.onCompleted();
    if (this.conv.ended) { this.finish(); return; }
    this.yourTurn();
  }

  private yourTurn() {
    if (!this.alive) return;
    const st = useStore.getState();
    const sup = this.conv.support();
    st.setConv({ phase: "you", suggest: sup.suggest, hints: sup.hints, focus: 0, checklist: this.conv.checklist(), openHint: st.settings.hintsOpen ? (sup.hints[0] ?? null) : st.conv.openHint && sup.hints.includes(st.conv.openHint) ? st.conv.openHint : null });
    if (st.settings.autoListen && speechSupported() && !st.conv.typing && document.visibilityState === "visible") this.autoListen(250);
  }

  /** Opens the mic by itself after `ms`, unless the learner has meanwhile started an attempt
   *  (listen() cancels this), switched to typing, listened to something or left. */
  private autoListen(ms: number) {
    this.cancelAutoListen();
    this.autoTimer = setTimeout(() => {
      this.autoTimer = null;
      const c = useStore.getState().conv;
      if (this.alive && c.phase === "you" && !c.typing && !this.speech) this.listen();
    }, ms);
  }

  private cancelAutoListen() {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
  }

  /** Vocabulary to bias recognition toward for the current turn. */
  private phrases(): string[] {
    const out = new Set<string>();
    for (const list of Object.values(this.sit.entities || {})) for (const e of list) out.add(e.en.split(" | ").join(" "));
    return [...out].slice(0, 60);
  }

  listen() {
    this.cancelAutoListen();
    if (!this.alive || !speechSupported()) return;
    const st = useStore.getState();
    if (st.conv.phase !== "you") return;
    this.stopListening();
    audio.sfx("listen");
    this.speech = createSpeechAttempt({
      evaluate: (t) => this.conv.nlu.probe(t, this.conv.expectedIntents()),
      phrases: this.phrases(),
      preferLocal: st.settings.onDevice,
      onUpdate: (s) => {
        const map: Record<string, any> = { idle: "off", starting: "starting", listening: "listening", reconnecting: "reconnecting", denied: "denied", error: "error", nothing: "nothing" };
        useStore.getState().setConv({ mic: { status: map[s.status], heard: s.heard, error: s.error } });
      },
      onCommit: (text, alts) => { this.submit(text, alts, "voice"); },
    });
    this.speech.start();
  }

  stopListening() {
    this.cancelAutoListen();
    this.cancelPractice();
    if (this.speech) { this.speech.dispose(); this.speech = null; }
    const st = useStore.getState();
    if (st.conv.mic.status !== "unsupported") st.setConv({ mic: { status: "off", heard: st.conv.mic.heard } });
  }

  /** The learner's answer (spoken, typed, or a picked "Did you mean…?" suggestion). Tries recogniser
   *  alternatives if the first one is not understood. */
  async submit(text: string, alts: string[] = [], via: "voice" | "typed" | "picked" = "typed") {
    if (!this.alive || this.busy) return;
    let clean = text.trim();
    if (!clean) return;
    this.busy = true;
    this.stopListening();
    const st = useStore.getState();
    // "Yes" / „taip“ right after "Did you mean…?" takes the first suggestion, unless the engine has a
    // use for the "yes" itself (a yes/no question is open): an understood answer is never replaced
    const guess = st.conv.guess;
    if (guess?.options.length && this.yesPicksGuess(clean, via === "voice")) { clean = guess.options[0].en; alts = []; via = "picked"; }
    st.setConv({ phase: "thinking", lastHeard: clean, guess: null, practice: null });
    let chosen = clean;
    let out = this.conv.input(clean);
    if (!out.understood) {
      for (const a of alts) {
        const probe = this.conv.nlu.parse(a, this.conv.expectedIntents());
        if (probe.ok) { this.conv.failures = Math.max(0, this.conv.failures - 1); chosen = a; out = this.conv.input(a); break; }
      }
    }
    this.pushLine({ who: "you", text: displayUtterance(chosen), understood: out.understood, tips: out.tips, via });
    if (out.understood) {
      audio.sfx("success");
      st.setConv({ failures: 0, prefix: false, mic: { status: "off", heard: "" } });
      this.recordExpressions(out.hintsUsed);
      for (const t of out.tips) st.toast({ kind: "tip", title: "Patarimas", body: t.lt, better: t.better });
    } else {
      audio.sfx("soft");
      st.setConv({ failures: out.failures || this.conv.failures, prefix: !!out.prefix, guess: this.didYouMean(clean, alts) });
    }
    this.busy = false;
    if (out.lines.length) await this.play(out);
    else if (!out.understood) {
      // first miss: no NPC reaction, just let the learner try again (or type)
      useStore.getState().setConv({ phase: "you" });
      if (useStore.getState().settings.autoListen && speechSupported() && !useStore.getState().conv.typing) this.autoListen(1400);
    } else this.yourTurn();
  }

  /** "Did you mean…?": the 1–2 model answers of the current hint groups closest to what was heard
   *  (and understood by the engine right now), or null (silence, noise, nothing close). */
  private didYouMean(heard: string, alts: string[]): Guess | null {
    try {
      const st = useStore.getState();
      const c = st.conv;
      const ids = [...new Set([...c.suggest.map((x) => x.hint).filter(Boolean) as string[], ...c.hints])];
      const groups = ids.map((id) => ({ g: this.sit.hints[id] ?? GLOBAL.hints[id], chosen: c.chosen[id] })).filter((x) => !!x.g);
      const lastNpc = [...c.transcript].reverse().find((l) => l.who === "npc" && l.npc)?.npc ?? c.npcId;
      const prof = st.progress.profile;
      const opts = { formal: !NPCS[c.npcId]?.informal, gender: prof?.gender ?? "m", npcGender: NPCS[lastNpc]?.gender ?? "f", vars: playerVars(prof) } as const;
      const heardAll = [heard, ...alts.slice(0, 3)];
      const ranked = rankAnswers(heardAll, answerCandidates(this.sit, groups, opts, heardAll));
      const expected = this.conv.expectedIntents();
      return makeGuess(heard, pickSuggestions(ranked, (en) => this.conv.nlu.parse(en, expected).ok));
    } catch { return null; }
  }

  /** A plain "yes" / „taip“ that should pick the first "Did you mean…?" suggestion. */
  private yesPicksGuess(text: string, spoken: boolean): boolean {
    try {
      const yesAnswers = !!(this.conv.pending?.yes || this.conv.effectiveStep()?.yes);
      return yesPicksGuess(text, spoken, { parse: (t) => this.conv.nlu.parse(t, this.conv.expectedIntents()), yesAnswers });
    } catch { return false; }
  }

  /** "Listen and repeat" a model answer from the guide (practice only: it never answers the person).
   *  Plays the sentence, then listens once and compares what was heard with it, word by word (conv.practice). */
  async practice(en: string, say: string) {
    if (!this.alive || !speechSupported() || useStore.getState().conv.phase !== "you") return;
    this.stopListening(); // the conversation's own mic off, and no auto-listen
    const run = ++this.practiceRun;
    useStore.getState().setConv({ practice: { en, status: "playing", heard: "" } });
    await audio.play(COACH_VOICE, 1, say);
    // cancelled meanwhile (another button, the mic, the person's turn, left)?
    if (run !== this.practiceRun || !this.alive || this.speech || useStore.getState().conv.phase !== "you") return;
    audio.sfx("listen");
    const attempt = createSpeechAttempt({
      evaluate: (t) => repeatProgress(en, t),
      preferLocal: useStore.getState().settings.onDevice,
      onUpdate: (s) => {
        if (run !== this.practiceRun || s.status === "idle") return; // "idle": the result follows (onCommit)
        const status = s.status === "nothing" || s.status === "denied" || s.status === "error" ? s.status : "listening";
        useStore.getState().setConv({ practice: { en, status, heard: s.heard } });
        if (status !== "listening") this.endPractice(attempt);
      },
      onCommit: (heard) => {
        if (run !== this.practiceRun) return;
        this.endPractice(attempt);
        useStore.getState().setConv({ practice: { en, status: "done", heard, result: compareRepeat(en, heard) } });
      },
    });
    this.speech = attempt;
    this.practicing = true;
    attempt.start();
  }

  /** The "Pakartok" button while practising: listening → use what was heard so far; playing → cancel. */
  stopPractice() {
    const p = useStore.getState().conv.practice;
    if (this.practicing && this.speech?.running && p?.status === "listening") this.speech.finish();
    else this.cancelPractice();
  }

  private endPractice(a: ReturnType<typeof createSpeechAttempt>) {
    if (this.speech === a) { this.speech = null; this.practicing = false; }
    a.dispose();
  }

  /** Stops a practice that is playing or listening (a finished result stays until the next answer). */
  private cancelPractice() {
    this.practiceRun++;
    if (this.practicing && this.speech) { this.speech.dispose(); this.speech = null; }
    this.practicing = false;
    const p = useStore.getState().conv.practice;
    if (p && (p.status === "playing" || p.status === "listening")) {
      if (p.status === "playing") audio.stop();
      useStore.getState().setConv({ practice: null });
    }
  }

  private recordExpressions(ids: string[]) {
    if (!ids.length) return;
    const st = useStore.getState();
    const fresh: string[] = [];
    st.updateProgress((p) => {
      const s = sitProgress(p, this.sit.id);
      for (const id of ids) {
        if (!s.used.includes(id)) { s.used.push(id); fresh.push(id); }
        const src = findHint(this.sit, id);
        if (src) {
          const key = this.sit.id + ":" + id;
          const prev = p.phrases[key];
          p.phrases[key] = { en: src.en, lt: src.lt, sitId: this.sit.id, count: (prev?.count ?? 0) + 1, last: Date.now() };
        }
      }
      p.sits[this.sit.id] = s;
    });
    if (fresh.length) st.setConv((c) => ({ newExpressions: [...c.newExpressions, ...fresh] }));
  }

  private onCompleted() {
    this.wasCompleted = true;
    const st = useStore.getState();
    let before = 0, after = 0;
    st.updateProgress((p) => {
      const s = sitProgress(p, this.sit.id);
      before = stars(s);
      s.completions++;
      for (const t of this.conv.twists) if (!s.twists.includes(t)) s.twists.push(t);
      s.memory = { ...s.memory, ...this.conv.memoryOut };
      after = stars(s);
      p.sits[this.sit.id] = s;
    });
    st.setConv({ completed: true, checklist: this.conv.checklist() });
    audio.sfx("stamp");
    st.toast({ kind: "stamp", title: after > before ? `${"★".repeat(after)} ${this.sit.title.en}` : `✓ ${this.sit.title.en}`, body: after > before ? "Nauja žvaigždutė! Situacija įveikta." : "Puiku! Situacija įveikta dar kartą." });
  }

  /** The learner leaves the conversation (Esc, a button, another situation). */
  close() {
    if (!this.alive) return;
    this.finish(true);
  }

  /** A natural end (`leave` false) only shows the end box ("Kita situacija", "Dar kartą", "Kopijuoti…"),
   *  which stays until the learner picks a button or presses Esc: both call close(), and only then
   *  does the game take over (Game.endSession: the objective, a taxi ride…). */
  private finish(leave = false) {
    if (!this.alive) return;
    this.stopListening();
    useStore.getState().setConv({ phase: "ended" });
    if (!leave) return;
    this.alive = false;
    audio.stop();
    // left during the person's last lines of the turn that completed the task: it still counts
    if (this.conv.completed && !this.wasCompleted) this.onCompleted();
    if (Object.keys(this.conv.memoryOut).length) {
      useStore.getState().updateProgress((p) => { const s = sitProgress(p, this.sit.id); s.memory = { ...s.memory, ...this.conv.memoryOut }; p.sits[this.sit.id] = s; });
    }
    this.hooks.onEnd(this.sit, this.conv.completed);
  }

  repeatLast(slow: boolean) {
    if (!this.alive || useStore.getState().conv.phase !== "you") return;
    this.stopListening();
    const out = this.conv.repeat(slow);
    this.play(out);
  }

  get active() { return this.alive; }
}

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function findHint(sit: SituationDef, id: string): { en: string; lt: string } | null {
  const groups = [...Object.values(sit.hints), ...Object.values(GLOBAL.hints)];
  for (const g of groups) for (const it of g.items) if (it.id === id) {
    const look = (eid: string) => { for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === eid); if (e) return e; } return undefined; };
    const ex = g.examples?.[0] ?? (g.slot ? sit.entities?.[g.slot]?.[0]?.id : undefined);
    try {
      const s = compose(it.s, ex ? { X: ex, name: useStore.getState().progress.profile?.name || "Tomas" } : { name: useStore.getState().progress.profile?.name || "Tomas" }, { look });
      return { en: s.en, lt: s.nat };
    } catch { return null; }
  }
  return null;
}
