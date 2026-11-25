import { isTownQuest } from "../content/townQuests";
import { StreetLife } from "./street";
import type { StreetSnapshot } from "./street/schedule";
import { ROUTE } from "../content/route";
// The light mode: the situation list and the conversations with their illustrated pictures, without the
// 3D town (no Three.js scene, no WebGL), so it opens in seconds and saves a phone's battery. The UI
// talks to it through the same members it uses on the 3D game (GameApi); the world ones do nothing.
import type { GameApi } from "./gameRef";
import { showConversationEvent } from "./convEvents";
import type { Door } from "./world/town";
import { Session } from "./session";
import { audio } from "./audio";
import { givenItem } from "./given";
import { SITUATION_BY_ID, getSituation, loadSituation } from "../content/situations/catalog";
import type { SituationDef, SituationMeta } from "../content/types";
import { useStore } from "../state/store";
import { sitProgress } from "../state/progress";
import { attachPad, type PadLink } from "./padLink";

export class LightGame implements GameApi {
  readonly light = true;
  private session: Session | null = null;
  lastScenario: string | null = null;
  onReady?: () => void;
  /** The voice clip list: a conversation tapped while it loads starts a moment later. */
  private loading: Promise<void> | null = null;
  private loaded = false;
  private pending = 0;
  private disposed = false;
  private opening = false;
  readonly streetLife = new StreetLife();
  private unwatchStreet?: () => void;
  private pad?: PadLink;

  init() {
    audio.stopAmbience();
    this.loading = audio.init().then(() => {
      this.loaded = true;
      audio.volume = useStore.getState().settings.volume;
      audio.sounds = useStore.getState().settings.sounds;
    });
    window.addEventListener("keydown", this.onKeyDown);
    this.pad = attachPad();
    this.onReady?.();
    this.unwatchStreet = useStore.subscribe((state, previous) => {
      if (state.screen !== previous.screen || state.conv.active !== previous.conv.active || state.hud.panel !== previous.hud.panel) this.observeStreet();
    });
    document.addEventListener("visibilitychange", this.observeStreet);
    this.streetLife.startLight(() => this.streetSnapshot(), this.pad.tick);
    if (import.meta.env.DEV) this.streetLife.devRequest();
  }

  dispose() {
    this.disposed = true;
    this.pad?.dispose();
    this.unwatchStreet?.();
    document.removeEventListener("visibilitychange", this.observeStreet);
    this.streetLife.dispose();
    window.removeEventListener("keydown", this.onKeyDown);
    this.session?.close();
    audio.stopAmbience();
    audio.stop();
  }

  /** Esc closes an open panel (the conversation panel handles its own keys). */
  private onKeyDown = (e: KeyboardEvent) => {
    const st = useStore.getState();
    if (e.key !== "Escape" || st.conv.active || !st.hud.panel) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    st.setHud({ panel: null });
  };

  get activeSession() { return this.session; }

  /** A situation from the list, the end box ("Kita situacija", "Dar kartą") or the journal: the
   *  conversation starts at once (a running one is closed first, and the panel just changes). */
  startScenario(sitId: string) {
    const sit = SITUATION_BY_ID[sitId];
    if (!sit || isTownQuest(sitId)) return;
    useStore.getState().setHud({ panel: null });
    this.lastScenario = sitId;
    this.session?.close();
    const ticket = ++this.pending;
    this.opening = true;
    this.observeStreet();
    const go = (def: SituationDef | null) => {
      if (ticket !== this.pending || this.disposed) return;
      this.opening = false;
      if (def && !this.session?.active) this.begin(def);
    };
    // the voices (the first time) and the conversation's own file (src/content/situations/catalog.ts)
    const def = getSituation(sitId);
    if (def && (this.loaded || !this.loading)) { go(def); return; }
    const slow = setTimeout(() => useStore.getState().toast({ kind: "info", title: def ? "Ruošiami balsai…" : "Kraunamas pokalbis…", ms: 2500 }), 500);
    Promise.all([loadSituation(sitId), this.loaded ? null : this.loading]).then(
      ([d]) => { clearTimeout(slow); go(d); },
      () => { clearTimeout(slow); go(null); useStore.getState().toast({ kind: "info", title: "Nepavyko atsisiųsti pokalbio", body: "Patikrink interneto ryšį ir pabandyk dar kartą." }); },
    );
  }

  /** The same situation again, from the start. */
  restartScenario() {
    const id = this.session?.sit.id ?? this.lastScenario;
    if (id) this.startScenario(id);
  }

  /** The next situation in the recommended order. */
  nextScenarioId(after?: string): string | null {
    const list = this.orderedSituations();
    const i = list.findIndex((s) => s.id === (after ?? this.lastScenario));
    return list[(i + 1) % list.length]?.id ?? null;
  }

  /** Phone and video calls (the phone panel): like any other situation here. */
  call(sitId: string) {
    if (this.session?.active) return;
    this.startScenario(sitId);
  }

  closeConversation() { this.session?.close(); }

  orderedSituations(): SituationMeta[] {
    return [...ROUTE].sort((a, b) => a.chapter - b.chapter || a.order - b.order || a.id.localeCompare(b.id));
  }

  currentObjective(): SituationMeta | null {
    const pr = useStore.getState().progress;
    if (pr.objective && SITUATION_BY_ID[pr.objective] && !SITUATION_BY_ID[pr.objective].bonus) return SITUATION_BY_ID[pr.objective];
    return this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions) ?? null;
  }

  setObjective(sitId: string | null) {
    if (sitId && SITUATION_BY_ID[sitId]?.bonus) return;
    useStore.getState().updateProgress((p) => { p.objective = sitId; });
  }

  private streetSnapshot(): StreetSnapshot {
    const { conv, hud, screen } = useStore.getState();
    return {
      light: true, town: !this.disposed && screen === "play", outdoors: true, visible: !document.hidden,
      onFoot: true, grounded: true, conversation: conv.active || !!this.session?.active, panel: !!hud.panel,
      loading: this.opening, dialog: false, guide: false, banner: false, cardOpen: false,
      flight: false, transition: false, mode: false, enabled: false,
    };
  }

  private observeStreet = () => this.streetLife.observe(this.streetSnapshot());

  streetNow = import.meta.env.DEV ? (id?: string, cast?: string) => {
    this.observeStreet();
    return this.streetLife.streetNow(id, cast);
  } : undefined;

  streetChatterNow = import.meta.env.DEV ? (id?: string) => {
    this.observeStreet();
    return this.streetLife.streetChatterNow(id);
  } : undefined;

  streetState = import.meta.env.DEV ? () => this.streetLife.streetState() : undefined;
  streetAdvance = import.meta.env.DEV ? (seconds: number) => this.streetLife.streetAdvance(seconds, this.streetSnapshot()) : undefined;

  // ------------------------------------------------------------------ no 3D world

  interact() { /* no world to interact with */ }
  setJoystick(_x: number, _y: number) { /* no walking */ }
  jump() { /* no walking */ }
  hold(_on: boolean) { /* no walking */ }
  setQuality(_q: "high" | "low") { /* nothing is rendered in 3D */ }
  modeStart() { /* mini-games are in the 3D town */ }
  modeExit() {}
  modeAction() {}
  modeOffer() { return null; }
  modeFromConversation() {}
  /** "Nuvesk mane" (the journal): there is nowhere to walk, so the task's conversation starts. */
  autoWalkToObjective() {
    const o = this.currentObjective();
    if (o) this.startScenario(o.id);
  }
  /** "Nuvykti taksi" (the journal): likewise, straight into the task's conversation. */
  teleportTo(loc: string) {
    const o = this.currentObjective();
    if (o && o.location === loc) this.startScenario(o.id);
  }
  get groundCanvas(): HTMLCanvasElement | undefined { return undefined; }
  get doors(): Door[] { return []; }

  // ------------------------------------------------------------------ conversations

  private begin(sit: SituationDef) {
    const session: Session = new Session(sit.id, {
      npcTalk: () => { /* no characters to animate */ },
      onEvent: (name, data) => { if (this.session === session) this.onSessionEvent(name, data); },
      onEnd: (s, completed) => {
        if (this.session !== session) return;
        this.session = null;
        useStore.getState().setConv({ active: false });
        if (completed && !s.bonus) this.advanceObjective(s);
      },
    });
    this.session = session;
    session.begin();
  }

  /** What happens in a conversation that the learner sees without the town: things handed over, paying,
   *  signing. Taxi and bus rides, boarding and marks on the map need the town, so they do nothing here. */
  private onSessionEvent(name: string, data: any) {
    showConversationEvent(name, data);
    const st = useStore.getState();
    if (name === "pay") audio.sfx("coin");
    if (name === "give" && data?.item) {
      const it = givenItem(this.session?.sit, data.item);
      st.toast({ kind: "success", title: `${it[0]} Gavai: ${it[1]}`, ms: 2600 });
    }
    if (name === "sign") st.toast({ kind: "success", title: "✍️ Pasirašyta", ms: 2200 });
  }

  /** The task is done: the next one not yet completed becomes the task (as in the town). */
  private advanceObjective(done: SituationDef) {
    const pr = useStore.getState().progress;
    if (pr.objective && pr.objective !== done.id && !SITUATION_BY_ID[pr.objective]?.bonus) return;
    const next = this.orderedSituations().find((s) => !sitProgress(pr, s.id).completions);
    this.setObjective(next?.id ?? null);
  }
}
