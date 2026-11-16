// The grotto's listening quest while someone is down there (plan.ts has its rules, Cave.ts its picture): the glyph
// stones call out, one at a time, a phrase the learner already knows, heard from where the stone stands (louder as one
// gets near, to the left or the right as it lies); at a stone, the learner picks what the phrase means or says it back,
// and the glyph lights; a chamber's three lit stones open the gate
// to the next. Each stone says a line of its own about the grotto (stones.ts), in the learner's coach voice; one
// whose clip is not there yet says one of the learner's own phrases instead, as before (16 Nov 2026).
import type * as THREE from "three";
import { audio } from "../audio";
import { useStore } from "../../state/store";
import { GLOBAL } from "../../content/global";
import { NPCS } from "../../content/npcs";
import { coachVoice } from "../../content/voices";
import { compose } from "../../convo/compose";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { rand } from "../world/util";
import { L } from "../../ui/i18n";
import type { CaveView } from "./Cave";
import * as P from "./plan";
import { STONE_LINE } from "./stones";
import { EDITION } from "../../edition";

/** What the learner sees at a stone (store hud.glyph; src/ui/Cave.tsx). */
export interface GlyphQuiz {
  id: string;
  /** What the stone says and what it means; word by word, units split by " | " (the stones' own lines). */
  text: string; lt: string; gloss?: string;
  options: string[]; answer: number;
  /** The meanings already tried and wrong; the words shown (after a miss, or asked for); solved. */
  wrong: number[]; shown: boolean; solved: boolean;
  /** Saying it back: the microphone's state and what it heard. */
  mic: "off" | "listening" | "missed" | "unsupported"; heard: string;
}
/** The little card that stands in for the map down here (store hud.cave). */
export interface CaveCard { n: number; of: number; name: string; lt: string; lit: number; stones: number; next: string; open: number }

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

export class CaveQuest {
  /** Each stone's phrase (none until the clip list is in). */
  private phrases = new Map<string, P.Phrase>();
  private all: P.Phrase[] = [];
  private voice = "";
  private nextCall = 2.5;
  private turn = 0;
  private callingId: string | null = null;
  private warned = new Map<string, number>();
  private cardT = 0;
  private attempt: ReturnType<typeof createSpeechAttempt> | null = null;
  private alive = true;
  /** Where the listener is, for the stone speaking now. */
  private ear = { x: 0, z: 0, yaw: 0 };

  constructor(private view: CaveView) {
    const st = useStore.getState(), s = save();
    this.voice = coachVoice(st.progress.profile?.gender);
    for (const g of P.GATES) view.setGate(g.id, P.gateState(g, s, SEE_ALL).open, true);
    for (const c of P.CHAMBERS) for (const q of c.stones) view.setStone(q.id, s.lit.includes(q.id));
    view.setHeart(!!s.heart, true);
    void audio.init().then(() => { if (this.alive) this.assign(); });
    this.card(0);
    if (!s.seen) {
      useStore.getState().updateProgress((p) => { p.cave = { ...(p.cave ?? P.emptyCave()), seen: true }; });
      setTimeout(() => { if (this.alive) useStore.getState().toast({ kind: "tip", title: L("Radai Aluksų grotą!"), body: L("Čia gyvena aluksai – mažos majų miško dvasios. Pasikalbėk su Kinu: jis saugo kelią."), ms: 9000 }); }, 1800);
    }
  }

  /** The stones' phrases: each stone its own line about the grotto (stones.ts), its meaning in the learner's language.
   *  A stone whose line has no recording yet (the clips not uploaded) says one of the learner's own phrases, the newest
   *  first, then the greetings, as before: a stone never stands silent. */
  private assign() {
    const st = useStore.getState(), ready = audio.ready;
    const has = (en: string) => !ready || audio.hasClip(this.voice, 1, en);
    const stones = P.CHAMBERS.flatMap((c) => c.stones);
    const lt = EDITION.helper === "lt";
    const own = (id: string): P.Phrase | null => {
      const l = STONE_LINE.get(id);
      return l && has(l.es) ? { en: l.es, lt: lt ? l.lt : l.en, gloss: lt ? l.ltGloss : l.enGloss } : null;
    };
    const missing = stones.filter((s) => !own(s.id)).length;
    const spare = missing ? P.pickPhrases(Object.values(st.progress.phrases), starters(), missing + 6, has) : [];
    this.phrases.clear();
    let k = 0;
    for (const s of stones) {
      const p = own(s.id) ?? (spare.length ? spare[k++ % spare.length] : null);
      if (p) this.phrases.set(s.id, p);
    }
    // (the meanings to choose from: the other stones')
    this.all = [...new Map([...this.phrases.values()].map((p) => [p.en, p])).values()];
  }

  dispose() {
    this.alive = false;
    this.attempt?.dispose();
    this.attempt = null;
    audio.stopCall();
    audio.stopCave();
    useStore.getState().setHud({ cave: null, glyph: null });
  }

  /** The stone within reach that still waits (for the prompt), if any. */
  near(p: THREE.Vector3): P.Stone | null {
    const s = save();
    let best: P.Stone | null = null, bd = 2.7;
    for (const c of P.CHAMBERS) for (const q of c.stones) {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd && !s.lit.includes(q.id) && this.phrases.has(q.id)) { bd = d; best = q; }
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
    if ((this.cardT -= dt) <= 0) { this.cardT = 0.4; this.card(here); }
  }

  /** The next stone of this chamber that still waits says its phrase, from where it stands. */
  private call(s: P.CaveSave, here: number) {
    // (nothing calls before Kin has said what the stones are)
    const waiting = s.passed.includes("kin") || SEE_ALL ? P.CHAMBERS[here].stones.filter((q) => !s.lit.includes(q.id) && this.phrases.has(q.id)) : [];
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
      : step.kind === "heart" ? L("Uždek paskutinius akmenis") : L("Radai Ka'an širdį!");
    const card: CaveCard = { n: c.n, of: P.CHAMBERS.length, name: c.name, lt: L(c.lt), lit: P.stonesLit(s, here), stones: c.stones.length, next, open: P.chambersOpen(s, SEE_ALL) };
    const old = useStore.getState().hud.cave;
    if (!old || old.n !== card.n || old.lit !== card.lit || old.next !== card.next || old.open !== card.open) useStore.getState().setHud({ cave: card });
  }

  // ----------------------------------------------------------------------------------------- at a stone

  /** The stone's card opens: it says its phrase, the learner picks its meaning or says it back. */
  open(id: string) {
    const phrase = this.phrases.get(id);
    if (!phrase || useStore.getState().hud.glyph) return;
    audio.stopCall(); this.callingId = null; this.view.setCalling(null);
    const seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) + save().lit.length * 977;
    const { options, answer } = P.meaningChoices(phrase, this.all.filter((q) => q.en !== phrase.en), rand(seed));
    useStore.getState().setHud({ prompt: null, glyph: { id, text: phrase.en, lt: phrase.lt, gloss: phrase.gloss, options, answer, wrong: [], shown: false, solved: false, mic: speechSupported() ? "off" : "unsupported", heard: "" } });
    this.say();
  }
  private patch(p: Partial<GlyphQuiz>) { const g = useStore.getState().hud.glyph; if (g) useStore.getState().setHud({ glyph: { ...g, ...p } }); }
  /** The stone says it again. */
  say() {
    const g = useStore.getState().hud.glyph;
    if (!g) return;
    this.stopMic();
    void audio.play(this.voice, 1, g.text, { male: this.voice.endsWith("_m") });
  }
  showWords() { this.patch({ shown: true }); }
  /** A meaning picked. */
  pick(i: number) {
    const g = useStore.getState().hud.glyph;
    if (!g || g.solved) return;
    if (i === g.answer) { this.solve(); return; }
    audio.sfx("error");
    this.patch({ wrong: [...g.wrong, i], shown: true });
    setTimeout(() => { if (this.alive && useStore.getState().hud.glyph?.id === g.id && !useStore.getState().hud.glyph?.solved) this.say(); }, 500);
  }
  /** Saying it back: the microphone listens for the stone's phrase. */
  listen() {
    const g = useStore.getState().hud.glyph;
    if (!g || g.solved || !speechSupported()) return;
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
    this.attempt?.dispose(); this.attempt = null;
    audio.stop();
    useStore.getState().setHud({ glyph: null });
    this.nextCall = 1.6;
  }

  /** The phrase was understood: the glyph lights, and whatever that opens, opens. */
  private solve() {
    const g = useStore.getState().hud.glyph;
    if (!g || g.solved) return;
    this.attempt?.dispose(); this.attempt = null;
    this.patch({ solved: true, shown: true, mic: speechSupported() ? "off" : "unsupported" });
    const stone = P.CHAMBERS.flatMap((c) => c.stones).find((q) => q.id === g.id)!, ci = P.CHAMBERS.findIndex((c) => c.stones.includes(stone));
    useStore.getState().updateProgress((p) => { const c = p.cave ?? P.emptyCave(); if (!c.lit.includes(g.id)) c.lit.push(g.id); p.cave = c; });
    this.view.setStone(g.id, true);
    this.view.burst(stone.x, 1.5, stone.z, "#ffd76a");
    audio.chime("stone");
    setTimeout(() => {
      if (!this.alive) return;
      if (useStore.getState().hud.glyph?.id === g.id) this.close();
      this.after(ci);
    }, 1700);
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
        st.toast({ kind: "stamp", title: L("Radai Ka'an širdį!"), body: L("Yaxché – medis, laikantis pasaulį – pražydo tau. Aluksai tavęs nepamirš."), ms: 9000 });
      }
      return;
    }
    const next = P.CHAMBERS[gate.to!];
    this.view.setGate(gate.id, true);
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
    if (!was) { this.view.burst(g.x, 2, g.z, "#7ff5ea"); audio.chime("gate"); }
    this.nextCall = 4;
  }
  get seeAll() { return SEE_ALL; }
}
