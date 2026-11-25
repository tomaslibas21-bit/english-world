// The grotto's listening quest while someone is down there (plan.ts has its rules, Cave.ts its picture): the glyph
// stones call out, one at a time, a phrase the learner already knows, heard from where the stone stands (louder as one
// gets near, to the left or the right as it lies); at a stone, the learner picks what the phrase means or says it back,
// and the glyph lights; a chamber's three lit stones open the gate
// to the next. Each stone says a line of its own about the grotto (x04-yaxche's hint groups: content/stones.ts), in the
// learner's coach voice; one whose clip is not there yet says one of the learner's own phrases instead.
// Once the heart is found (18 Nov 2026): the great tree speaks when the learner walks up to it (x04, started by Game
// through `hooks.tree`), and from then on the stones speak again whenever the learner comes back: every stone a line
// not heard yet, re-armed a while after it is understood, until all have been heard; then round again (plan.ts
// nextLine). The first time through nothing changes.
import type * as THREE from "three";
import { audio } from "../audio";
import { useStore } from "../../state/store";
import { GLOBAL } from "../../content/global";
import { NPCS } from "../../content/npcs";
import { coachVoice } from "../../content/voices";
import { compose } from "../../convo/compose";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { L } from "../../ui/i18n";
import type { CaveView } from "./Cave";
import * as P from "./plan";
import { caveQuestTarget } from "./routing";
import { assignStonePhrases, stoneMeaningChoices, type StoneMeanings } from "./stonePhrases";
import type { Sentence } from "../../convo/compose";
import { SITUATIONS, loadSituation } from "../../content/situations/catalog";
import type { PhraseSource } from "../../ui/kit/phraseLine";

/** What the learner sees at a stone (store hud.glyph; src/ui/Cave.tsx). */
export interface GlyphQuiz {
  id: string;
  opening: number;
  source: PhraseSource;
  /** What the stone says and what it means; the whole sentence (a stone's own line: its glosses and IPA, shown once
   *  the stone is lit). */
  text: string; lt: string; s?: Sentence;
  options: string[]; answer: number;
  /** The meanings already tried and wrong; the words shown (after a miss, or asked for); solved. */
  wrong: number[]; shown: boolean; solved: boolean;
  /** Saying it back: the microphone's state and what it heard. */
  mic: "off" | "listening" | "missed" | "unsupported"; heard: string;
}
/** The chamber and quest card (store hud.cave). */
export interface CaveCard { n: number; of: number; name: string; lt: string; lit: number; stones: number; next: string; nextSitId?: string; open: number }

/** How long a stone rests after it is understood, once the stones speak again (s). */
const REARM = 40;
/** From how near the tree is spoken with (m from its middle: on its island), and where the first time starts by itself. */
const TREE_REACH = 4.7, TREE_AUTO = 3.6;

/** Everything open, whatever has been done in the town (to look round: `?gruta=all` in the page's address). */
const SEE_ALL = (() => { try { return /[?&#]gruta=all\b/.test(location.search + location.hash); } catch { return false; } })();

const save = () => useStore.getState().progress.cave ?? P.emptyCave();

/** The greetings everyone starts with (the town-wide phrases every conversation has), as the stones say them. */
function starters(): P.Phrase[] {
  const out: P.Phrase[] = [], name = useStore.getState().progress.profile?.name || "Tomas";
  for (const g of ["g_greet", "g_social", "g_yesno", "g_howareyou", "g_clarify"]) for (const it of GLOBAL.hints[g]?.items ?? []) {
    try { const s = compose(it.s, { name }, { look: () => undefined, formal: false }); out.push({ en: s.en, lt: s.nat }); } catch { /* a phrase that needs more than a name */ }
  }
  return out;
}

interface GlyphOpening {
  id: string;
  phrase: P.Phrase;
  wrongReplay?: ReturnType<typeof setTimeout>;
  complete?: () => void;
}

let openingNumber = 0;

export class CaveQuest {
  /** Each stone's phrase, and the real meanings available as quiz distractors. */
  private phrases = new Map<string, P.Phrase>();
  private meanings: StoneMeanings = { preferred: [], extra: [] };
  private lines: string[][] = [];
  private readonly starters = starters();
  private voice = "";
  private nextCall = 2.5;
  private turn = 0;
  private callingId: string | null = null;
  private warned = new Map<string, number>();
  private cardT = 0;
  private attempt: ReturnType<typeof createSpeechAttempt> | null = null;
  private alive = true;
  private glyphOpening: GlyphOpening | null = null;
  /** Where the listener is, for the stone speaking now. */
  private ear = { x: 0, z: 0, yaw: 0 };
  /** The stones' own lines (x04's hint groups), by id, once its file is in. */
  private pool = new Map<string, P.Phrase>();
  /** The stones speak again (the heart was found before this visit, or the tree has just been heard): which are lit
   *  now, and when each lit one wakes with its next line (s). */
  private replay = false;
  private relit = new Set<string>();
  private rearm = new Map<string, number>();
  private treeAsked = false;
  private petalT = 0;

  constructor(private view: CaveView, private hooks: { tree?: () => void; gates?: (save: P.CaveSave, all: boolean) => void } = {}) {
    const st = useStore.getState(), s = save();
    this.voice = coachVoice(st.progress.profile?.gender);
    this.replay = !!s.heart;
    for (const g of P.GATES) view.setGate(g.id, P.gateState(g, s, SEE_ALL).open, true);
    this.hooks.gates?.(s, SEE_ALL);
    for (const c of P.CHAMBERS) for (const q of c.stones) view.setStone(q.id, this.isLit(q.id, s));
    view.setHeart(!!s.heart, true);
    void audio.init().then(() => { if (this.alive) this.assign(); });
    void this.loadLines();
    this.card(0);
    if (!s.seen) {
      useStore.getState().updateProgress((p) => { p.cave = { ...(p.cave ?? P.emptyCave()), seen: true }; });
      setTimeout(() => { if (this.alive) useStore.getState().toast({ kind: "tip", title: L("Radai Aluksų grotą!"), body: L("Čia gyvena aluksai – mažos majų miško dvasios. Pasikalbėk su Kinu: jis saugo kelią."), ms: 9000 }); }, 1800);
    }
  }

  /** Lit, as the learner sees it: saved for good the first time through; for this visit once the stones speak again. */
  private isLit(id: string, s = save()) { return this.replay ? this.relit.has(id) : s.lit.includes(id); }

  /** The stones' own lines: x04-yaxche's file (a chunk of its own), each line with its meaning in the learner's
   *  language (the layer's table comes with the file). */
  private async loadLines() {
    const def = await loadSituation(P.TREE_SIT).catch(() => null);
    if (!def || !this.alive) return;
    P.CHAMBERS.forEach((c, ci) => {
      for (const it of def.hints[P.stoneGroup(c.id)]?.items ?? []) {
        try { const sent = compose(it.s, {}, { look: () => undefined, formal: false }); this.pool.set(it.id, { id: it.id, chamber: ci, en: sent.en, lt: sent.nat, s: sent }); } catch { /* never: the lines take nothing in */ }
      }
    });
    this.assign();
  }

  /** The authored lines in the current round, by chamber. */
  private sayable(): string[][] { return this.lines; }

  private assign(waking?: string) {
    const { progress } = useStore.getState(), ready = audio.ready;
    ({ phrases: this.phrases, lines: this.lines, meanings: this.meanings } = assignStonePhrases({
      pool: this.pool, previous: this.phrases, book: Object.values(progress.phrases), starters: this.starters,
      heard: progress.cave?.heard ?? [], replay: this.replay, opening: this.glyphOpening, waking,
      has: (en) => !ready || audio.hasClip(this.voice, 1, en),
    }));
  }

  /** The stones wake again: all of them wait, each with a line not heard yet. */
  private startReplay() {
    this.replay = true;
    this.relit.clear(); this.rearm.clear();
    this.phrases.clear();
    this.assign();
    for (const c of P.CHAMBERS) for (const q of c.stones) this.view.setStone(q.id, false);
    this.nextCall = 3;
  }

  /** How many of the stones' lines the learner has understood in this round, of how many there are to hear. */
  private progress(): { n: number; of: number } {
    const all = this.sayable().flat(), heard = save().heard ?? [];
    return { n: all.filter((id) => heard.includes(id)).length, of: all.length };
  }

  // ----------------------------------------------------------------------------------------- the tree

  /** Is the learner where the tree is spoken with (on its island, the heart found)? */
  treeNear(p: THREE.Vector3): boolean {
    const t = P.TREES[1];
    return !!save().heart && Math.hypot(p.x - t.x, p.z - t.z) < TREE_REACH;
  }
  /** The tree has said what it had to say (x04's "tree-heard"): the stones speak again from now on. */
  treeHeard() {
    const first = !save().tree;
    useStore.getState().updateProgress((p) => { p.cave = { ...(p.cave ?? P.emptyCave()), tree: true }; });
    if (!this.replay) this.startReplay();
    if (first) setTimeout(() => { if (this.alive) useStore.getState().toast({ kind: "success", title: L("Akmenys vėl prabilo"), body: L("Kiekvienas turi tau naują frazę. Klausyk, kur jie kalba."), ms: 7000 }); }, 2500);
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    if (this.glyphOpening) {
      clearTimeout(this.glyphOpening.wrongReplay);
      this.glyphOpening = null;
      audio.stop();
    }
    this.attempt?.dispose();
    this.attempt = null;
    audio.stopCall();
    audio.stopCave();
    useStore.getState().setHud({ cave: null, glyph: null });
  }

  guide(p: { x: number; z: number }) {
    const s = save();
    const replay = this.replay && s.tree ? (id: string) => !this.relit.has(id) && this.phrases.has(id) : undefined;
    return caveQuestTarget(p, s, SEE_ALL, replay);
  }

  /** The stone within reach that still waits (for the prompt), if any. */
  near(p: THREE.Vector3): P.Stone | null {
    const s = save();
    let best: P.Stone | null = null, bd = 2.7;
    for (const c of P.CHAMBERS) for (const q of c.stones) {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd && !this.isLit(q.id, s) && this.phrases.has(q.id)) { bd = d; best = q; }
    }
    return best;
  }

  /** Every frame down here. `quiet`: a conversation, a panel or a stone's card is open (nothing calls). */
  update(dt: number, p: THREE.Vector3, yaw: number, quiet: boolean) {
    this.ear.x = p.x; this.ear.z = p.z; this.ear.yaw = yaw;
    const s = save(), here = P.chamberAt(p.x, p.z);
    // the place's own sounds: the falls as near as they are, deeper in a little more of the chimes
    let falls = 0;
    for (const f of P.FALLS) falls = Math.max(falls, 1 - Math.hypot(f.x - p.x, f.z - p.z) / 26);
    audio.cave(!quiet && !document.hidden, { falls, deep: here / 4 });
    if (quiet) { if (this.callingId) { audio.stopCall(); this.callingId = null; this.view.setCalling(null); } this.nextCall = Math.max(this.nextCall, 1.2); }
    else if (!this.callingId && (this.nextCall -= dt) <= 0) this.call(s, here);
    // a shut gate one walks up to says why
    for (const g of P.GATES) {
      const d = Math.hypot(g.x - p.x, g.z - p.z), state = P.gateState(g, s, SEE_ALL);
      if (state.open || d > 3.4 || quiet) continue;
      const last = this.warned.get(g.id) ?? -99, now = performance.now() / 1000;
      if (now - last < 10) continue;
      this.warned.set(g.id, now);
      const st = useStore.getState();
      if (state.why === "alux") st.toast({ kind: "info", title: L("Kelias uždarytas"), body: L("Pirmiausia pasikalbėk su {name}.", { name: NPCS["alux_" + g.alux]?.name ?? "" }) });
      else st.toast({ kind: "info", title: L("Vartai dar uždaryti"), body: L("Jie atsivers, kai užsidegs visi trys šios salės akmenys. Klausyk, kur jie kalba.") });
    }
    // once the stones speak again: a stone that was understood rests a while, then wakes with its next line
    for (const [id, t] of this.rearm) {
      // (not while its card is still open)
      if (t - dt > 0 || this.glyphOpening?.id === id) { this.rearm.set(id, Math.max(0, t - dt)); continue; }
      this.rearm.delete(id);
      this.relit.delete(id);
      this.assign(id);
      this.view.setStone(id, false);
    }
    // the tree: the first time the learner comes up to it after the heart is found, it speaks by itself; and while it
    // speaks, petals of light come down round it
    const tree = P.TREES[1], td = Math.hypot(p.x - tree.x, p.z - tree.z);
    if (s.heart && !s.tree && !this.treeAsked && !quiet && td < TREE_AUTO && !useStore.getState().hud.glyph) { this.treeAsked = true; this.hooks.tree?.(); }
    const conv = useStore.getState().conv;
    if (conv.active && conv.sitId === P.TREE_SIT && conv.speaking !== null && (this.petalT -= dt) <= 0) {
      this.petalT = 1.1 + Math.random() * 0.8;
      const a = Math.random() * 6.283, d = 2 + Math.random() * 3.5;
      this.view.burst(tree.x + Math.cos(a) * d, 3.2 + Math.random() * 2.5, tree.z + Math.sin(a) * d, Math.random() < 0.5 ? "#ffd7ee" : "#fff3c4");
    }
    if ((this.cardT -= dt) <= 0) { this.cardT = 0.4; this.card(here); }
  }

  /** The next stone of this chamber that still waits says its phrase, from where it stands. */
  private call(s: P.CaveSave, here: number) {
    // (nothing calls before Kin has said what the stones are)
    const waiting = s.passed.includes("kin") || SEE_ALL ? P.CHAMBERS[here].stones.filter((q) => !this.isLit(q.id, s) && this.phrases.has(q.id)) : [];
    if (here + 1 > P.chambersOpen(s, SEE_ALL) || !waiting.length) { this.nextCall = 1.5; return; }
    const stone = waiting[this.turn++ % waiting.length], phrase = this.phrases.get(stone.id)!;
    this.callingId = stone.id;
    this.view.setCalling(stone.id);
    const at = () => { const h = P.heard(this.ear.x, this.ear.z, this.ear.yaw, stone.x, stone.z); return { gain: h.gain, pan: h.pan }; };
    void audio.callFrom(this.voice, 1, phrase.en, at).then((said) => {
      if (this.callingId !== stone.id) return;
      this.callingId = null;
      this.view.setCalling(null);
      // (a breath between them; longer when nothing could be played: no clip, the sound off)
      this.nextCall = said ? 2.1 + Math.random() * 1.2 : 3.5;
    });
  }

  private card(here: number) {
    const s = save(), c = P.CHAMBERS[here], step = P.nextStep(here, s, SEE_ALL);
    const next = step.kind === "alux" ? L("Pasikalbėk su {name}", { name: NPCS[step.npc]?.name ?? "" })
      : step.kind === "stones" ? L("Surask akmenis pagal balsą: liko {n}", { n: step.left })
      : step.kind === "on" ? L("Kelias atviras: „{name}“", { name: step.name })
      : step.kind === "heart" ? L("Uždek paskutinius akmenis")
      // the heart found: the tree waits to be heard; then the stones' lines, counted
      : !s.tree ? L("Prieik prie didžiojo medžio – jis nori tau kai ką pasakyti")
      : ((g) => (g.of ? L("Akmenys vėl kalba. Išgirsta frazių: {n} iš {of}", g) : L("Radai Ka'an širdį!")))(this.progress());
    const nextSitId = step.kind === "alux" ? SITUATIONS.find((sit) => sit.npc === step.npc)?.id
      : step.kind === "done" && !s.tree ? P.TREE_SIT : undefined;
    const lit = this.replay ? c.stones.filter((q) => this.relit.has(q.id)).length : P.stonesLit(s, here);
    const card: CaveCard = { n: c.n, of: P.CHAMBERS.length, name: c.name, lt: L(c.lt), lit, stones: c.stones.length, next, nextSitId, open: P.chambersOpen(s, SEE_ALL) };
    const old = useStore.getState().hud.cave;
    if (!old || old.n !== card.n || old.lit !== card.lit || old.next !== card.next || old.nextSitId !== card.nextSitId || old.open !== card.open) useStore.getState().setHud({ cave: card });
  }

  // ----------------------------------------------------------------------------------------- at a stone

  /** The stone's card opens: it says its phrase, the learner picks its meaning or says it back. */
  open(id: string) {
    const phrase = this.phrases.get(id);
    if (!this.alive || !phrase || useStore.getState().hud.glyph) return;
    audio.stopCall(); this.callingId = null; this.view.setCalling(null);
    const line = { ...phrase }, situationId = line.id ? P.TREE_SIT : line.sitId ?? "";
    const { options, answer } = stoneMeaningChoices(id, line, save().lit.length, this.meanings);
    const source = situationId ? { situationId } : { situationId, sourceLabel: L("Kalbantis akmuo") };
    this.glyphOpening = { id, phrase: line };
    useStore.getState().setHud({ prompt: null, glyph: { id, opening: ++openingNumber, source, text: line.en, lt: line.lt, s: line.s, options, answer, wrong: [], shown: false, solved: false, mic: speechSupported() ? "off" : "unsupported", heard: "" } });
    void this.playGlyph(line.en);
  }
  private patch(p: Partial<GlyphQuiz>) { const g = useStore.getState().hud.glyph; if (g) useStore.getState().setHud({ glyph: { ...g, ...p } }); }
  /** The stone says it again. */
  say() {
    const opening = this.glyphOpening;
    if (!opening) return;
    clearTimeout(opening.wrongReplay);
    void this.playGlyph(opening.phrase.en);
  }

  private playGlyph(text: string) {
    this.stopMic();
    return audio.play(this.voice, 1, text, { male: this.voice.endsWith("_m"), optional: true, recordingOnly: true });
  }

  showWords() { this.patch({ shown: true }); }
  /** A meaning picked. */
  pick(i: number) {
    const g = useStore.getState().hud.glyph, opening = this.glyphOpening;
    if (!g || g.solved || !opening || !g.options[i] || g.wrong.includes(i)) return;
    if (i === g.answer) { this.solve(); return; }
    audio.sfx("error");
    this.patch({ wrong: [...g.wrong, i], shown: true });
    clearTimeout(opening.wrongReplay);
    opening.wrongReplay = setTimeout(() => {
      if (this.glyphOpening === opening && !useStore.getState().hud.glyph?.solved) void this.playGlyph(opening.phrase.en);
    }, 500);
  }
  /** Saying it back: the microphone listens for the stone's phrase. */
  listen() {
    if (!this.glyphOpening) return;
    const g = useStore.getState().hud.glyph;
    if (!g || g.solved || !speechSupported()) return;
    clearTimeout(this.glyphOpening.wrongReplay);
    if (this.attempt?.running) { this.attempt.finish(); return; }
    audio.stop();
    this.attempt?.dispose();
    const attempt = createSpeechAttempt({
      evaluate: (t) => (P.saidBack(t, g.text) ? "complete" : "open"),
      phrases: [g.text],
      preferLocal: useStore.getState().settings.onDevice,
      onUpdate: (s) => {
        if (!this.alive || this.attempt !== attempt) return;
        this.patch({ mic: s.status === "listening" || s.status === "starting" || s.status === "reconnecting" ? "listening" : s.status === "idle" ? "off" : "missed", heard: s.heard || useStore.getState().hud.glyph?.heard || "" });
      },
      onCommit: (text, alts) => {
        if (!this.alive || this.attempt !== attempt) return;
        if ([text, ...alts].some((t) => P.saidBack(t, g.text))) this.solve();
        else { audio.sfx("soft"); this.patch({ mic: "missed", heard: text, shown: true }); }
      },
    });
    this.attempt = attempt;
    this.patch({ mic: "listening", heard: "" });
    attempt.start();
  }
  private stopMic() { if (this.attempt?.running) this.attempt.stop(); }
  /** The card is put away (Esc, the cross, a tap beside it). */
  close() {
    const opening = this.glyphOpening;
    if (!opening) return;
    this.glyphOpening = null;
    clearTimeout(opening.wrongReplay);
    this.attempt?.dispose(); this.attempt = null;
    audio.stop();
    useStore.getState().setHud({ glyph: null });
    this.nextCall = 1.6;
    opening.complete?.();
  }

  /** The phrase was understood: the glyph lights, and whatever that opens, opens. */
  private solve() {
    const g = useStore.getState().hud.glyph, opening = this.glyphOpening;
    if (!g || g.solved || !opening) return;
    clearTimeout(opening.wrongReplay);
    this.attempt?.dispose(); this.attempt = null;
    const stone = P.CHAMBERS.flatMap((c) => c.stones).find((q) => q.id === g.id)!, ci = P.CHAMBERS.findIndex((c) => c.stones.includes(stone));
    const line = opening.phrase, replay = this.replay;
    if (replay) { this.relit.add(g.id); this.rearm.set(g.id, REARM); }
    useStore.getState().updateProgress((p) => {
      const c = p.cave ?? P.emptyCave();
      if (!replay && !c.lit.includes(g.id)) c.lit.push(g.id);
      // a stone's own line: heard in this round, and a phrase of the learner's own from now on (the phrasebook, under
      // the tree's conversation; its cards)
      if (line.id) {
        c.heard = [...new Set([...(c.heard ?? []), line.id])];
        const key = P.TREE_SIT + ":" + line.id, prev = p.phrases[key];
        p.phrases[key] = { en: line.en, lt: line.lt, sitId: P.TREE_SIT, count: (prev?.count ?? 0) + 1, last: Date.now() };
      }
      p.cave = c;
    });
    this.view.setStone(g.id, true);
    this.view.burst(stone.x, 1.5, stone.z, "#ffd76a");
    audio.chime("stone");
    opening.complete = () => {
      if (replay) this.afterAgain(); else this.after(ci);
    };
    this.patch({ solved: true, shown: true, mic: speechSupported() ? "off" : "unsupported" });
  }

  /** After a stone was understood once the stones speak again: how many lines are heard; and when every one is, the
   *  round starts again. */
  private afterAgain() {
    const st = useStore.getState(), lines = this.sayable(), g = this.progress();
    if (P.allHeard(lines, save().heard ?? [])) {
      st.updateProgress((p) => { const c = p.cave ?? P.emptyCave(); c.heard = []; c.rounds = (c.rounds ?? 0) + 1; p.cave = c; });
      audio.chime("heart");
      st.toast({ kind: "stamp", title: L("Išgirdai visas akmenų frazes!"), body: L("Jų buvo {of}. Akmenys pradeda iš naujo – ir tu jau daug ką supranti.", { of: g.of }), ms: 9000 });
      return;
    }
    st.toast({ kind: "success", title: L("Akmuo užsidegė!"), body: L("Išgirsta frazių: {n} iš {of}.", g), ms: 3200 });
  }

  /** After a stone lit in chamber `ci`: its gate, or the heart. */
  private after(ci: number) {
    const s = save(), st = useStore.getState(), left = P.CHAMBERS[ci].stones.length - P.stonesLit(s, ci);
    if (left > 0) { st.toast({ kind: "success", title: L("Akmuo užsidegė!"), body: L("Šioje salėje liko: {n}.", { n: left }), ms: 3200 }); return; }
    const gate = P.GATES.find((g) => g.stones === ci);
    if (!gate) {
      // the last chamber: the Yaxché flowers
      if (!s.heart) {
        st.updateProgress((p) => { p.cave = { ...(p.cave ?? P.emptyCave()), heart: true }; });
        this.view.setHeart(true);
        const t = P.TREES[1];
        this.view.burst(t.x, 6, t.z, "#ffd7ee");
        audio.chime("heart");
        st.toast({ kind: "stamp", title: L("Radai Ka'an širdį!"), body: L("Yaxché – medis, laikantis pasaulį – pražydo tau. Prieik prie jo: jis nori tau kai ką pasakyti."), ms: 9000 });
      }
      return;
    }
    const next = P.CHAMBERS[gate.to!];
    this.view.setGate(gate.id, true);
    this.hooks.gates?.(save(), SEE_ALL);
    this.view.burst(gate.x, 2.2, gate.z, "#7ff5ea");
    audio.chime("gate");
    st.toast({ kind: "success", title: L("Visi trys akmenys dega!"), body: L("Kelias atviras: „{name}“.", { name: next.name }), ms: 5200 });
  }

  /** An alux has let the learner pass (their conversation's "alux-pass" event). */
  pass(gate: string) {
    const g = P.GATES.find((q) => q.alux === gate);
    if (!g) return;
    const was = save().passed.includes(gate);
    useStore.getState().updateProgress((p) => { const c = p.cave ?? P.emptyCave(); if (!c.passed.includes(gate)) c.passed.push(gate); p.cave = c; });
    this.view.setGate(g.id, true);
    this.hooks.gates?.(save(), SEE_ALL);
    if (!was) { this.view.burst(g.x, 2, g.z, "#7ff5ea"); audio.chime("gate"); }
    this.nextCall = 4;
  }
  get seeAll() { return SEE_ALL; }
}
