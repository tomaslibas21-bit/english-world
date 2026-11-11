import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useStore, type TranscriptLine } from "../state/store";
import { Interlinear } from "./Interlinear";
import { NPCS } from "../content/npcs";
import { coachVoice, npcVoice } from "../content/voices";
import { SITUATION_BY_ID } from "../content/situations";
import { GLOBAL } from "../content/global";
import { placeLtNamed } from "../content/locations";
import { compose, type Sentence } from "../convo/compose";
import type { EntityDef, HintGroup, SituationDef } from "../content/types";
import { audio } from "../game/audio";
import { game } from "../game/gameRef";
import { speechSupported } from "../convo/speech";
import { sitProgress } from "../state/progress";
import { toImperative } from "./lt";
import { Icon, InlineIcon, type IconName } from "./icons";
import { showToast } from "./Toasts";
import { Confetti } from "./Confetti";
import { L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import { modelAnswers, playerVars, type Guess, type HeardWord, type RepeatWord } from "../convo/suggest";
import "./answer.css";
import {ReportProblem} from "./ReportProblem";
import { SectionHelpButton } from "./sectionHelp";
import { useKeyboardHints } from "./keyboardHints";

export function avatarColor(npcId: string) {
  const n = NPCS[npcId];
  const pick = [n?.look.top, n?.look.accColor, n?.look.bottom, "#1f6f78"].find((c) => c && luminance(c) < 0.62);
  return pick ?? "#1f6f78";
}
function luminance(hex: string) {
  const v = parseInt(hex.replace("#", ""), 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function lookup(sit: SituationDef) {
  return (id: string): EntityDef | undefined => {
    for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
    return undefined;
  };
}

export function Conversation() {
  const keyboardHints = useKeyboardHints();
  const conv = useStore((s) => s.conv);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const setConv = useStore((s) => s.setConv);
  const sit = SITUATION_BY_ID[conv.sitId];
  const npc = NPCS[conv.npcId];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const missRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [conv.transcript.length, conv.phase]);
  useEffect(() => { if (conv.typing && conv.phase === "you") inputRef.current?.focus(); }, [conv.typing, conv.phase]);
  // half-typed text doesn't carry over into the next conversation
  useEffect(() => { setTyped(""); }, [conv.sitId, conv.active]);
  // "Did you mean…?" appeared: scroll it into view (phones show only a little of "your turn")
  useEffect(() => {
    const box = missRef.current;
    const sc = box?.closest(".yt-scroll") as HTMLElement | null;
    if (!conv.guess || !box || !sc) return;
    const b = box.getBoundingClientRect(), v = sc.getBoundingClientRect();
    if (b.bottom > v.bottom) sc.scrollTop += Math.min(b.top - v.top - 6, b.bottom - v.bottom);
  }, [conv.guess, conv.phase]);

  // keyboard shortcuts while talking
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
        if (e.key === "Escape") { (t as HTMLInputElement).blur(); }
        return;
      }
      const k = e.key.toLowerCase();
      if (e.defaultPrevented) return;
      const st = useStore.getState();
      if (!st.conv.active) return; // walking around: the world has its own keys (Game.onKeyDown)
      if (st.hud.panel || ((k === " " || k === "enter") && t.closest("button, a, summary, [contenteditable='true']"))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === "escape") { game?.closeConversation(); return; }
      if (k === "h") { e.preventDefault(); st.setConv({ openHint: st.conv.openHint ? null : (st.conv.hints[0] ?? "g_clarify") }); return; }
      if (k === "l") { e.preventDefault(); st.setSettings({ lt: !st.settings.lt }); return; }
      if (k === "n") { e.preventDefault(); st.setSettings({ ltNatural: !st.settings.ltNatural }); return; }
      if (k === "i") { e.preventDefault(); st.setSettings({ ipa: !st.settings.ipa }); return; }
      if (k === "t") { e.preventDefault(); st.setConv({ typing: !st.conv.typing }); return; }
      if (k === "r") { e.preventDefault(); game?.activeSession?.repeatLast(false); return; }
      if ((k === " " || k === "enter") && st.conv.phase === "you") {
        e.preventDefault();
        const s = game?.activeSession;
        if (!s) return;
        if (st.conv.mic.status === "listening" || st.conv.mic.status === "starting" || st.conv.mic.status === "reconnecting") s.finishListening();
        else s.listen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!conv.active || !sit) return null;
  const formal = !npc?.informal;
  const gender = useStore.getState().progress.profile?.gender ?? "m";
  const startNext = () => { const next = game?.nextScenarioId(sit.id); if (next) game?.startScenario(next); };
  const showAll = () => { game?.closeConversation(); useStore.getState().setHud({ panel: "scenarios" }); };

  const send = () => {
    const v = typed.trim();
    if (!v) return;
    setTyped("");
    game?.activeSession?.submit(v);
  };

  return (
    <>
    <div className="convo" data-phase={conv.phase} role="dialog" aria-label={L("Pokalbis: {name}", { name: npc?.name ?? "" })}>
      <div className="convo-tools">
      <div className="convo-head">
        <div className="toggles">
          <button className={"toggle" + (settings.lt ? " on" : "")} onClick={() => setSettings({ lt: !settings.lt })} title={L("Lietuviškas vertimas (L) · visas sakinys lietuviškai (N)")} aria-pressed={settings.lt}>{L("LT")}</button>
          <button className={"toggle" + (settings.ipa ? " on" : "")} onClick={() => setSettings({ ipa: !settings.ipa })} title={L("Tarimas IPA (I)")} aria-pressed={settings.ipa}>IPA</button>
          <button className={"toggle slow-toggle" + (conv.slowMode || settings.slowVoice ? " on" : "")} onClick={() => game?.activeSession?.setSlowMode(!conv.slowMode)} disabled={settings.slowVoice}
            title={settings.slowVoice ? L("Visi kalba lėčiau (Nustatymai)") : conv.slowMode ? L("Šis pašnekovas kalba lėčiau – paspausk, kad kalbėtų įprastai") : L("Kad šis pašnekovas kalbėtų lėčiau")} aria-pressed={conv.slowMode || settings.slowVoice} aria-label={L("Lėčiau")}>
            <Icon name="turtle" size={20} /><span className="long">{L("Lėčiau")}</span>
          </button>
        </div>
        <NpcInfo sit={sit} />
        <div className="head-actions">
          <button className="close-x" onClick={() => game?.restartScenario()} title={L("Pradėti šį pokalbį iš naujo")} aria-label={L("Pradėti iš naujo")}><Icon name="restart" /></button>
          <button className="close-x" onClick={() => { game?.closeConversation(); useStore.getState().setHud({ panel: "scenarios" }); }} title={L("Visos situacijos")} aria-label={L("Visos situacijos")}><Icon name="list" /></button>
          <button className="close-x" onClick={() => game?.closeConversation()} title={keyboardHints ? L("Baigti pokalbį (Esc)") : L("Baigti pokalbį")} aria-label={L("Baigti pokalbį")}><Icon name="close" /></button>
        </div>
      </div>

      <AudioRecovery />
      {(sit.mode === "video" || sit.mode === "phone") && <CallStrip sit={sit} />}
      <Mission />
      </div>

      <div className="transcript" ref={scrollRef} aria-live="polite">
        {conv.transcript.length === 0 && <div style={{ color: "var(--ink-faint)", textAlign: "center", marginTop: 20 }}>…</div>}
        {groupLines(conv.transcript).map((grp) => grp.length > 1
          ? <NpcGroup key={grp[0].id} lines={grp} speaking={grp.some((l) => l.id === conv.speaking)} lt={settings.lt} ipa={settings.ipa} nat={settings.ltNatural} reveal={conv.reveal} />
          : <Line key={grp[0].id} l={grp[0]} speaking={conv.speaking === grp[0].id} lt={settings.lt || !!conv.reveal[grp[0].id]} ipa={settings.ipa} nat={settings.ltNatural || !!conv.reveal[grp[0].id]} />)}
        {conv.note && <div className="msg note"><div className="bubble"><Icon name="note" size={22} className="note-ico" /><span>{conv.note.en}</span></div></div>}
      </div>

      {conv.phase !== "ended" ? (
        <div className="yourturn">
          <div className="yt-scroll">
          <div className={"yt-title phase-" + conv.phase}>
            <b>{conv.phase === "npc" ? L("{name} kalba…", { name: npc?.name ?? "" }) : conv.phase === "thinking" ? "…" : L("Tavo eilė")}</b>
            <div className="yt-actions">
              {conv.phase === "you" && (!conv.guideHidden || conv.openHint !== null) && (
                <div className="toggles say-toggles" role="group" aria-label={L("Po tavo atsakymų pavyzdžiais")}>
                  <button className={"toggle" + (settings.sayLt ? " on" : "")} onClick={() => setSettings({ sayLt: !settings.sayLt })} aria-pressed={settings.sayLt} title={L("Vertimas po tavo atsakymų pavyzdžiais")}><span className="long">{L("Vertimas")}</span><span className="short">{L("LT")}</span></button>
                  <button className={"toggle" + (settings.sayIpa ? " on" : "")} onClick={() => setSettings({ sayIpa: !settings.sayIpa })} aria-pressed={settings.sayIpa} title={L("Tarimas (IPA) po tavo atsakymų pavyzdžiais")}>IPA</button>
                </div>
              )}
              <button className="btn soft small guide-toggle" onClick={() => setConv({ guideHidden: !conv.guideHidden })} aria-label={conv.guideHidden ? L("Ką sakyti?") : L("Slėpti pagalbą")} title={conv.guideHidden ? L("Rodyti atsakymų pavyzdžius") : L("Slėpti atsakymų pavyzdžius")}>
                <span className="guide-toggle-label">{conv.guideHidden ? L("Ką sakyti?") : L("Slėpti pagalbą")}</span><Icon name={conv.guideHidden ? "bulb" : "chevronDown"} size={20} />
              </button>
            </div>
          </div>

          {!!conv.speechChoices?.length && <div className="miss-box">
            <p>{conv.speechChoices.length > 1 ? L("Atpažinimo variantai skiriasi žodžiu „ne“. Ką norėjai pasakyti?") : L("Ar teisingai išgirdo? Paspausk tekstą, kad išsiųstum, arba pataisyk.")}</p>
            {conv.speechChoices.map(text => <button className="btn soft small" key={text} lang={TL} disabled={conv.phase !== "you"}
              onClick={() => void game?.activeSession?.submit(text, [], "voice", true)}>{text}</button>)}
            <button className="btn ghost small" disabled={conv.phase !== "you"}
              onClick={() => { setTyped(conv.lastHeard); setConv({ typing: true, speechChoices: undefined }); }}>{L("Pataisyti tekstą")}</button>
          </div>}
          {conv.failures > 0 && conv.phase === "you" && conv.lastHeard && (
            <div className="miss-box" ref={missRef}>
              <div>{conv.prefix ? L("Neatpažinau – atrodo, sakinys nebaigtas. Girdėjau:") : L("Neatpažinau. Girdėjau:")}</div>
              <div className="heard" lang={TL}>{Lx("„{heard}“", { heard: conv.guess ? <Marked words={conv.guess.heard} /> : conv.lastHeard })}</div>
              {conv.guess && <DidYouMean guess={conv.guess} lt={settings.sayLt} />}
              <div className="acts">
                {speechSupported() && <button className="btn small" onClick={() => game?.activeSession?.listen()}><Icon name="mic" size={17} /> {L("Bandyti dar")}</button>}
                <button className="btn soft small" onClick={() => game?.activeSession?.repeatLast(true)}><Icon name="turtle" size={17} /> {L("Paklausyk lėčiau")}</button>
                <button className="btn soft small" onClick={() => { setTyped(conv.lastHeard); setConv({ typing: true }); }}><Icon name="pencil" size={17} /> {L("Pataisyti tekstą")}</button>
                <button className="btn ghost small" onClick={() => copyConversation(sit)} title={L("Nukopijuok ir atsiųsk mokytojui")}><Icon name="clipboard" size={17} /> {L("Kopijuoti")}</button>
              </div>
            </div>
          )}

          {!conv.guideHidden && <Guide sit={sit} formal={formal} gender={gender} />}

          <Hints sit={sit} formal={formal} gender={gender} />
          </div>

          <div className="yt-bottom">
          <div className="inputbar">
            <MicButton />
            <MicStatus />
            <button className={"type-toggle" + (conv.typing ? " on" : "")} onClick={() => setConv({ typing: !conv.typing })} title={keyboardHints ? L("Rašyti (T)") : L("Rašyti")} aria-label={keyboardHints ? L("Rašyti (T)") : L("Rašyti")} aria-pressed={conv.typing}><Icon name="keyboard" size={24} /></button>
          </div>
          {conv.typing && (
            <form className="typebox" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={L("Parašyk angliškai…")} lang={TL} autoCapitalize="sentences" autoComplete="off" disabled={conv.phase !== "you"} />
              <button className="btn" type="submit" disabled={conv.phase !== "you" || !typed.trim()}>{L("Siųsti")}</button>
            </form>
          )}
          </div>
        </div>
      ) : (
        <div className="yourturn ended-box">
          {conv.completed && <div className="ended-badge"><Icon name="check" size={30} strokeWidth={2.5} /></div>}
          <div className="ended-title">{conv.completed ? L("Užduotis įvykdyta!") : L("Pokalbis baigtas")}</div>
          {conv.newExpressions.length > 0 && <div className="ended-sub">{L("Naujų frazių knygelėje: {n}", { n: conv.newExpressions.length })}</div>}
          {game?.light ? (
            <div className="sit-actions" style={{ justifyContent: "center" }}>
              <button className="btn" onClick={startNext}><Icon name="arrowRight" size={18} /> {L("Kita situacija")}</button>
              <button className="btn soft" onClick={() => game?.restartScenario()}><Icon name="restart" size={18} /> {L("Dar kartą")}</button>
              <button className="btn ghost" onClick={showAll}><Icon name="list" size={18} /> {L("Visos situacijos")}</button>
            </div>
          ) : (
            <>
              {/* in the town: walk on (the next task shows as usual), or straight into the next conversation, the
                  two the same size (owner, 29 Oct 2026); the light mode above has no town, so it leads with the next */}
              <div className="ended-main">
                <button className="btn" onClick={() => game?.closeConversation()}><Icon name="walk" size={18} /> {L("Tęsti")}</button>
                <button className="btn soft" onClick={startNext}><Icon name="arrowRight" size={18} /> {L("Kita situacija")}</button>
              </div>
              <div className="sit-actions" style={{ justifyContent: "center" }}>
                <button className="btn soft small" onClick={() => game?.restartScenario()}><Icon name="restart" size={17} /> {L("Dar kartą")}</button>
                <button className="btn ghost small" onClick={showAll}><Icon name="list" size={17} /> {L("Visos situacijos")}</button>
              </div>
            </>
          )}
          <button className="copy-link" onClick={() => copyConversation(sit)}><Icon name="clipboard" size={17} /> {L("Kopijuoti pokalbį mokytojui")}</button>
        </div>
      )}
    </div>
    </>
  );
}

/** Identity and place stay one tap away without consuming the sentence/answer space. */
function NpcInfo({ sit }: { sit: SituationDef }) {
  const npcId = useStore((s) => s.conv.npcId);
  const run = useStore((s) => s.conv.run);
  const npc = NPCS[npcId];
  const [tapped, setTapped] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const dismissed = useRef(false);
  const open = tapped || hover || focused;
  const close = () => { dismissed.current = true; setTapped(false); setHover(false); setFocused(false); };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { close(); dismissed.current = false; }, [run]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape, true); };
  }, [open]);
  const ltRole = npc?.role.lt.toLowerCase() !== npc?.role.en.toLowerCase() ? npc?.role.lt : null;
  return <div className="npc-info" ref={ref}
    onPointerLeave={(e) => { if (e.pointerType === "mouse") { setHover(false); dismissed.current = false; } }}
    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}>
    <button className="npc-info-button" aria-label={L("Apie pašnekovą")} aria-expanded={open} aria-controls="npc-info-card"
      onPointerEnter={(e) => { if (e.pointerType === "mouse" && !dismissed.current) setHover(true); }}
      onFocus={(e) => setFocused(e.currentTarget.matches(":focus-visible"))} onClick={() => { dismissed.current = false; setTapped(!tapped); }}>
      <span aria-hidden="true">i</span>
    </button>
    <SectionHelpButton className="npc-info-button" onOpen={close} />
    {open && <div className="npc-info-card" id="npc-info-card" role="region" aria-label={L("Apie pašnekovą")}>
      <div className="npc-identity">
        <div className="avatar" style={{ background: avatarColor(npcId) }}>{(npc?.name ?? "?").replace(/^(Mr\.|Ms\.|Mrs\.|Officer) /, "").charAt(0)}</div>
        <div className="who"><b>{npc?.name}</b><span className="role"><em lang={TL}>{npc?.role.en}</em>{ltRole && <small lang={EDITION.helper}>{ltRole}</small>}</span></div>
        <button className="close-x" onClick={close} aria-label={L("Uždaryti informaciją")}><Icon name="close" size={20} /></button>
      </div>
      <p className="place" lang={EDITION.helper}>{sit.mode === "video" ? L("Vaizdo skambutis") : placeLtNamed(sit.location)}</p>
      {EDITION.reports && <ReportProblem />}
    </div>}
  </div>;
}

function AudioRecovery() {
  const state = useSyncExternalStore(audio.subscribe, audio.getState);
  if (state !== "blocked" && state !== "unavailable") return null;
  return <div className="audio-recovery" role="status">
    <span>{state === "blocked" ? L("Spausk „Klausyti“, kad įrašas tęstųsi.") : L("Balso įrašo nepavyko paleisti. Spausk „Bandyti dar“.")}</span>
    <button className="btn small" onClick={audio.retry}><Icon name="speaker" size={18} />{state === "blocked" ? L("Klausyti") : L("Bandyti dar")}</button>
    {state === "unavailable" && <>
      {audio.canUseBrowserVoice() && <button className="link-btn" onClick={audio.useBrowserVoice}>{L("Klausyti įrenginio balsu")}</button>}
      <button className="link-btn" onClick={audio.continueReading}>{L("Tęsti skaitant")}</button>
    </>}
  </div>;
}

/** Plain-text copy of the conversation, for students to send to the teacher (nothing is uploaded). */
async function copyConversation(sit: SituationDef) {
  const conv = useStore.getState().conv;
  const when = new Date().toLocaleString("lt-LT");
  const lines = conv.transcript.map((l) => l.who === "npc"
    ? `${NPCS[l.npc ?? ""]?.name ?? "NPC"}: ${l.sentence?.en ?? ""}`
    : l.who === "you" ? `${L("Aš:")} ${l.text ?? ""}${l.understood ? "" : "   ← " + L("NEATPAŽINTA")}` : "");
  const text = [L("English World – „{title}“ ({en}) · {when}", { title: sit.title.lt, en: sit.title.en, when }), "", ...lines.filter(Boolean)].join("\n");
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
  }
  showToast(ok ? { kind: "success", icon: "clipboard", title: L("Pokalbis nukopijuotas"), body: L("Įklijuok jį žinutėje mokytojui (Ctrl/Cmd + V)."), ms: 5000 }
    : { kind: "info", title: L("Nepavyko nukopijuoti"), body: L("Padaryk ekrano nuotrauką ir atsiųsk ją mokytojui.") });
}

/** Consecutive lines of the same NPC (one turn) are shown as one message. */
function groupLines(lines: TranscriptLine[]): TranscriptLine[][] {
  const out: TranscriptLine[][] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (last && l.who === "npc" && last[0].who === "npc" && last[0].npc === l.npc && l.sentence && last[0].sentence) last.push(l);
    else out.push([l]);
  }
  return out;
}

function NpcGroup({ lines, speaking, lt, ipa, nat, reveal }: { lines: TranscriptLine[]; speaking: boolean; lt: boolean; ipa: boolean; nat: boolean; reveal: Record<number, boolean> }) {
  const npc = NPCS[lines[0].npc!];
  const replay = async (slow: boolean) => {
    game?.activeSession?.stopListening();
    for (const l of lines) if (!await audio.play(npcVoice(npc), npc?.speed ?? 1, l.sentence!.say, { slow, male: npc?.gender === "m" })) return;
  };
  return (
    <div className={"msg npc" + (speaking ? " speaking" : "")}>
      <div className="meta">
        <span>{npc?.name}</span>
        <ReplayButtons replay={replay} />
      </div>
      <div className="bubble">
        {lines.map((l) => <div className="bubble-part" key={l.id}><Interlinear s={l.sentence!} lt={lt || !!reveal[l.id]} ipa={ipa} nat={nat || !!reveal[l.id]} natTip /></div>)}
      </div>
    </div>
  );
}

/** "Say it again" and "slower" next to what a person said. */
function ReplayButtons({ replay }: { replay: (slow: boolean) => void }) {
  const speaking = useStore((s) => s.conv.phase === "npc");
  return (
    <>
      <button disabled={speaking} onClick={() => replay(false)} title={L("Pakartoti")} aria-label={L("Pakartoti")}><Icon name="speaker" size={18} /></button>
      <button disabled={speaking} onClick={() => replay(true)} title={L("Lėčiau")} aria-label={L("Lėčiau")}><Icon name="turtle" size={23} /></button>
    </>
  );
}

/** Mission checklist: progress, what to do now, and the full list on tap. */
function Mission() {
  const conv = useStore((s) => s.conv);
  const [open, setOpen] = useState(false);
  // the moment the task is done: confetti from the bar (the chime is Session.onCompleted's)
  const bar = useRef<HTMLButtonElement>(null);
  const was = useRef(conv.completed);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (conv.completed && !was.current) setBurst(Date.now());
    was.current = conv.completed;
  }, [conv.completed]);
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(0), 2600);
    return () => clearTimeout(t);
  }, [burst]);
  const items = conv.checklist;
  if (!items.length) return null;
  const done = items.filter((i) => i.done).length;
  const cur = items.find((i) => i.current) ?? items.find((i) => !i.done);
  return (
    <div className={"mission" + (conv.completed ? " complete" : "")}>
      <button ref={bar} className="mission-bar" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="mission-count">{done}/{items.length}</span>
        <span className="mission-dots" aria-hidden>{items.map((i) => <i key={i.id} className={i.done ? "d" : i.current ? "c" : ""} />)}</span>
        <span className="mission-now">{conv.completed ? <><Icon name="check" size={17} strokeWidth={2.25} className="done-ico" /> {L("Užduotis įvykdyta!")}</> : cur ? toImperative(cur.lt) : ""}</span>
        <Icon name="chevronDown" size={18} className="chev" />
      </button>
      {open && (
        <ol className="mission-list">
          {items.map((i) => <li key={i.id} className={i.done ? "d" : i.current ? "c" : ""}><span className="mk"><Icon name={i.done ? "check" : i.current ? "arrowRight" : "ring"} size={16} strokeWidth={i.done ? 2.25 : 2} /></span>{toImperative(i.lt)}</li>)}
        </ol>
      )}
      {burst > 0 && <Confetti key={burst} from={bar} />}
    </div>
  );
}

/** The corridor: what to do now (one instruction) and 2–3 model answers to listen to and say. */
function Guide({ sit, formal, gender }: { sit: SituationDef; formal: boolean; gender: "m" | "f" }) {
  const conv = useStore((s) => s.conv);
  const settings = useStore((s) => s.settings);
  const setConv = useStore((s) => s.setConv);
  const [allChips, setAllChips] = useState(false);
  // hiding the guide mid-practice stops it (the mic is never left on unseen)
  useEffect(() => () => {
    const p = useStore.getState().conv.practice;
    if (p && (p.status === "playing" || p.status === "listening")) game?.activeSession?.stopListening();
  }, []);
  if (conv.phase !== "you" || !conv.suggest.length) return null;
  const focus = Math.min(conv.focus, conv.suggest.length - 1);
  const sg = conv.suggest[focus];
  const groupId = sg.hint;
  const group = groupId ? sit.hints[groupId] ?? GLOBAL.hints[groupId] : undefined;
  const lastNpc = [...conv.transcript].reverse().find((l) => l.who === "npc" && l.npc)?.npc ?? conv.npcId;
  const examples = group && groupId ? modelAnswers(sit, group, conv.chosen[groupId], { formal, gender, npcGender: NPCS[lastNpc]?.gender ?? "f", vars: playerVars(useStore.getState().progress.profile) }, 3) : [];
  const opts = optionEntities(sit, sg.options);
  const shown = allChips || opts.length <= 7 ? opts : opts.slice(0, 6);
  return (
    <div className="guide">
      <div className="guide-task" tabIndex={0}><Icon name="next" size={24} className="task-ico" /><span>{toImperative(sg.lt)}</span></div>
      {opts.length > 0 && groupId && (
        <div className="chips">
          {shown.map((e) => {
            const on = conv.chosen[groupId] === e.id;
            return <button key={e.id} className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => { const chosen = { ...conv.chosen }; if (on) delete chosen[groupId]; else chosen[groupId] = e.id; setConv({ chosen }); }}>{on && <Icon name="check" size={15} strokeWidth={2.25} />}{chipLabel(e, gender === "f")}</button>;
          })}
          {shown.length < opts.length && <button className="chip" onClick={() => setAllChips(true)}>+{opts.length - shown.length}</button>}
        </div>
      )}
      {examples.length > 0 && (
        <div className="guide-examples">
          {examples.map((ex, i) => (
            <div className="gx" key={i}>
              <button className="play" onClick={() => { game?.activeSession?.stopListening(); audio.play(coachVoice(useStore.getState().progress.profile?.gender), 1, ex.say); }} title={L("Klausyti")} aria-label={L("Klausyti")}><Icon name="speaker" size={19} /></button>
              <div className="gx-text" tabIndex={0} role="region" aria-label={L("Atsakymo pavyzdys {n}", { n: i + 1 })}>
                {/* Keep the glosses; differing natural wording is available on tap or hover. */}
                <Interlinear s={ex} lt={settings.sayLt} ipa={settings.sayIpa} compactNat />
                <RepeatResult en={ex.en} />
              </div>
              <RepeatButton ex={ex} />
            </div>
          ))}
        </div>
      )}
      {conv.suggest.length > 1 && (
        <div className="guide-alt">
          <span>{L("Arba:")}</span>
          {conv.suggest.map((x, i) => i === focus ? null : <button key={i} onClick={() => setConv({ focus: i })}>{toImperative(x.lt)}</button>)}
        </div>
      )}
    </div>
  );
}

/** Phone and video calls: who is on the call, and who is talking right now. */
function CallStrip({ sit }: { sit: SituationDef }) {
  const conv = useStore((s) => s.conv);
  const profile = useStore((s) => s.progress.profile);
  const [secs, setSecs] = useState(0);
  // the clock stops when the call is over (the end box stays until the learner leaves)
  const ended = conv.phase === "ended";
  useEffect(() => { if (ended) return; const t = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(t); }, [ended]);
  const speakingNpc = conv.transcript.find((l) => l.id === conv.speaking)?.npc;
  const listening = ["listening", "starting", "reconnecting"].includes(conv.mic.status);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  if (sit.mode === "phone") {
    return <div className="call-strip phone">{ended ? L("Skambutis baigtas") : <><span className="dot" /> {L("Skambutis")}</>} · {clock}</div>;
  }
  const people = [sit.npc, ...(sit.npcs ?? [])].filter((id, i, a) => NPCS[id] && a.indexOf(id) === i);
  return (
    <div className="call-strip video" aria-label={L("Vaizdo skambutis")}>
      {people.map((id) => (
        <div key={id} className={"tile" + (speakingNpc === id ? " talking" : "")}>
          <span className="face" style={{ background: avatarColor(id) }}>{NPCS[id].name.charAt(0)}</span>
          <span className="nm">{NPCS[id].name}</span>
        </div>
      ))}
      <div className={"tile you" + (listening ? " talking" : "")}>
        <span className="face" style={{ background: "#1f6f78" }}>{(profile?.name ?? L("Tu")).charAt(0)}</span>
        <span className="nm">{profile?.name ?? L("Tu")}</span>
      </div>
      <span className="clock">{clock}</span>
    </div>
  );
}

function chipLabel(e: EntityDef, fem = false) {
  if (fem && e.ltF) return e.ltF.split(" | ").map((p) => p.split("/")[0]).join(" ");
  if (e.chip) return e.chip;
  const parts = e.lt.split(" | ").map((p) => p.split("/")[0]);
  return parts.join(" ");
}

function optionEntities(sit: SituationDef, options?: string | string[]): EntityDef[] {
  if (!options) return [];
  const all = Object.values(sit.entities || {}).flat();
  if (Array.isArray(options)) return options.map((id) => all.find((e) => e.id === id)).filter(Boolean) as EntityDef[];
  return sit.entities?.[options] ?? [];
}

function Line({ l, speaking, lt, ipa, nat }: { l: TranscriptLine; speaking: boolean; lt: boolean; ipa: boolean; nat: boolean }) {
  if (l.who === "npc" && l.sentence) {
    const npc = NPCS[l.npc!];
    const replay = (slow: boolean) => { game?.activeSession?.stopListening(); audio.play(npcVoice(npc), npc?.speed ?? 1, l.sentence!.say, { slow, male: npc?.gender === "m" }); };
    return (
      <div className={"msg npc" + (speaking ? " speaking" : "")}>
        <div className="meta">
          <span>{npc?.name}</span>
          <ReplayButtons replay={replay} />
        </div>
        <div className="bubble"><Interlinear s={l.sentence} lt={lt} ipa={ipa} nat={nat} natTip /></div>
      </div>
    );
  }
  if (l.who === "you") {
    return (
      <div className={"msg you" + (l.understood ? "" : " miss")}>
        <div className="bubble">{l.via && <Via via={l.via} />}{l.text}{l.understood ? <span className="ok"><Icon name="check" size={14} strokeWidth={2.5} label={L("Suprasta")} /></span> : null}</div>
      </div>
    );
  }
  return null;
}

// --------------------------------------------------------------------------------------------

function Hints({ sit, formal, gender }: { sit: SituationDef; formal: boolean; gender: "m" | "f" }) {
  const conv = useStore((s) => s.conv);
  const settings = useStore((s) => s.settings);
  const setConv = useStore((s) => s.setConv);
  const used = useStore((s) => sitProgress(s.progress, sit.id).used);
  const open = conv.openHint !== null;
  const groups = useMemo(() => {
    const ids = [...conv.hints];
    if (conv.openHint && !ids.includes(conv.openHint)) ids.unshift(conv.openHint);
    const own = ids.map((id) => [id, sit.hints[id] ?? GLOBAL.hints[id]] as [string, HintGroup | undefined]).filter((x) => x[1]) as [string, HintGroup][];
    // the open group first
    own.sort((a, b) => (a[0] === conv.openHint ? -1 : b[0] === conv.openHint ? 1 : 0));
    return own;
  }, [conv.hints, conv.openHint, sit]);

  return (
    <div className="hints">
      <button className={"hint-toggle" + (open ? " open" : "")} onClick={() => setConv({ openHint: open ? null : (conv.hints[0] ?? "g_clarify") })} aria-expanded={open}>
        <Icon name="bulb" size={21} className="bulb" /> {L("Daugiau frazių")} <span className="key">(H)</span><Icon name="chevronDown" size={18} className="chev" />
      </button>
      {open && (
        <div>
          {groups.map(([id, g]) => <HintGroupView key={id} id={id} g={g} sit={sit} formal={formal} gender={gender} chosen={conv.chosen[id]} lt={settings.sayLt} ipa={settings.sayIpa} used={used} />)}
          {!conv.hints.includes("g_clarify") && (
            <details className="hint-group">
              <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--ink-soft)", margin: "6px 2px" }}>{L("Visada naudinga: paprašyti pakartoti, lėčiau, paraidžiui…")}</summary>
              <HintGroupView id="g_clarify" g={GLOBAL.hints.g_clarify} sit={sit} formal={formal} gender={gender} lt={settings.sayLt} ipa={settings.sayIpa} used={used} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function HintGroupView({ id, g, sit, formal, gender, chosen, lt, ipa, used }: { id: string; g: HintGroup; sit: SituationDef; formal: boolean; gender: "m" | "f"; chosen?: string; lt: boolean; ipa: boolean; used: string[] }) {
  // In hints the learner speaks: {m:…|f:…} is the learner, {sm:…|sf:…} the NPC being spoken to
  // (the one who spoke last, e.g. Dan or Nora at dinner).
  const conv = useStore.getState().conv;
  const lastNpc = [...conv.transcript].reverse().find((l) => l.who === "npc" && l.npc)?.npc ?? conv.npcId;
  const npcGender = NPCS[lastNpc]?.gender ?? "f";
  const look = lookup(sit);
  const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
  const examples = g.examples?.length ? g.examples : ents.slice(0, 4).map((e) => e.id);
  const prof = useStore.getState().progress.profile;
  const name = prof?.name || "Tomas";
  const surname = prof?.surname || undefined;
  const items = g.items.map((it, i) => {
    const pool = ents.filter((e) => !it.only || it.only(e));
    let ex: string | undefined = chosen && pool.some((e) => e.id === chosen) ? chosen : undefined;
    if (!ex && g.slot) ex = examples.find((x) => pool.some((e) => e.id === x) && examples.indexOf(x) === i % examples.length) ?? pool.find((e) => examples.includes(e.id))?.id ?? pool[0]?.id;
    if (g.slot && chosen && !pool.some((e) => e.id === chosen)) return null; // this pattern doesn't suit the chosen item
    let gap: Sentence | null = null, full: Sentence | null = null;
    try {
      gap = compose(it.s, { name: "…" }, { look, addressee: gender, speaker: npcGender, formal });
      full = compose(it.s, { X: ex, name, surname, letters: surname }, { look, addressee: gender, speaker: npcGender, formal });
    } catch { return null; }
    return { it, gap, full, hasGap: gap.en !== full.en };
  }).filter(Boolean) as { it: any; gap: Sentence; full: Sentence; hasGap: boolean }[];

  return (
    <div className="hint-group">
      <h4>{g.lt}</h4>
      {items.map(({ it, gap, full, hasGap }, i) => (
        <div className={"hint-row" + (used.includes(it.id) ? " used" : "")} key={it.id + i}>
          {hasGap && <div className="pat">{renderGap(gap.en)}{it.register && <span className={"tag " + it.register}>{it.register === "polite" ? L("mandagu") : it.register === "casual" ? L("laisviau") : ""}</span>}</div>}
          <div className="ex">
            <Interlinear s={full} lt={lt} ipa={ipa} compactNat />
            {!hasGap && it.register && <span className={"tag " + it.register}>{it.register === "polite" ? L("mandagu") : L("laisviau")}</span>}
            {it.note && <div className="note">{it.note}</div>}
          </div>
          <button className="play" onClick={() => { game?.activeSession?.stopListening(); audio.play(coachVoice(useStore.getState().progress.profile?.gender), 1, full.say); }} title={L("Klausyti")} aria-label={L("Klausyti")}><Icon name="speaker" size={20} /></button>
        </div>
      ))}
    </div>
  );
}

const VIA: Record<NonNullable<TranscriptLine["via"]>, [IconName, string]> = {
  voice: ["mic", L("Pasakyta balsu")],
  typed: ["keyboard", L("Parašyta")],
  picked: ["bulb", L("Pasirinkta iš pasiūlymų")],
  helped: ["bulb", L("Pasirinkta, kai nepavyko pasakyti")],
};
/** How the learner answered: a tiny mic (spoken) or keyboard (typed) in the bubble. */
function Via({ via }: { via: NonNullable<TranscriptLine["via"]> }) {
  const [icon, label] = VIA[via];
  return <span className="via" title={label}><Icon name={icon} size={15} strokeWidth={2} label={label} /></span>;
}

// --------------------------------------------------------------------------------------------
// "Did you mean…?" (after an answer that wasn't understood) and "Listen and repeat" (in the guide)

/** Words, with the marked ones highlighted (heard words not in the suggestion / model words not heard). */
function Marked({ words }: { words: (HeardWord | RepeatWord)[] }) {
  return <>{words.map((x, i) => <span key={i}>{i > 0 && " "}{("miss" in x ? x.miss : !x.ok) ? <mark className="hw-miss">{x.w}</mark> : x.w}</span>)}</>;
}

function DidYouMean({ guess, lt }: { guess: Guess; lt: boolean }) {
  // after two misses in a row the learner is never stuck: tap what you wanted to say, or skip this answer
  const via = guess.stuck ? "helped" : "picked";
  return (
    <div className="dym">
      <div className="dym-q">{guess.stuck ? L("Nepavyksta? Pasirink, ką norėjai pasakyti:") : L("Ar norėjai pasakyti:")}</div>
      {guess.options.map((o) => (
        <button key={o.en} className="dym-opt" onClick={() => game?.activeSession?.submit(o.en, [], via)}>
          <span className="dym-text">
            <span className="dym-en" lang={TL}>{o.en}</span>
            {lt && <span className="dym-lt" lang={EDITION.helper}>{o.nat}</span>}
          </span>
          <Icon name="arrowRight" size={18} className="dym-go" />
        </button>
      ))}
      <div className="dym-hint">{speechSupported() ? L("Paliesk sakinį arba pasakyk „yes“.") : L("Paliesk sakinį arba parašyk „yes“.")}
        {guess.stuck && <> <button className="link-btn" onClick={() => game?.activeSession?.submit(guess.options[0].en, [], "helped")}>{L("Praleisti")}</button></>}
      </div>
    </div>
  );
}

/** "Pakartok": plays the example, then listens once (practice only). While busy it stops or cancels. */
function RepeatButton({ ex }: { ex: Sentence }) {
  const p = useStore((s) => s.conv.practice);
  if (!speechSupported()) return null;
  const state = p?.en === ex.en && (p.status === "playing" || p.status === "listening") ? p.status : null;
  const label = state === "listening" ? L("Baigti") : state === "playing" ? L("Atšaukti") : L("Pakartok");
  return (
    <button className={"rp-btn" + (state ? " " + state : "")} aria-pressed={!!state} aria-label={label}
      title={state ? label : L("Paklausyk ir pakartok garsiai")}
      onClick={() => { const s = game?.activeSession; if (!s) return; if (state) s.stopPractice(); else s.practice(ex.en, ex.say); }}>
      <Icon name={state === "listening" ? "stop" : "mic"} size={18} /><span className="rp-label">{label}</span>
    </button>
  );
}

const VERDICT = { great: L("Puiku!"), almost: L("Beveik!"), again: L("Pabandyk dar kartą") } as const;

/** Under a guide example: what happens now, then which words were said and a short verdict. */
function RepeatResult({ en }: { en: string }) {
  const p = useStore((s) => s.conv.practice);
  if (!p || p.en !== en) return null;
  switch (p.status) {
    case "playing": return <div className="rp-res wait">{L("Klausyk…")}</div>;
    case "listening": return <div className="rp-res wait"><span className="rp-dot" />{p.heard ? <span className="rp-heard" lang={TL}>{Lx("„{heard}“", { heard: p.heard })}</span> : L("Dabar tu – pakartok garsiai")}</div>;
    case "nothing": return <div className="rp-res">{L("Nieko negirdėjau. Spausk „Pakartok“ ir kalbėk.")}</div>;
    case "denied": return <div className="rp-res">{L("Leisk naršyklei naudoti mikrofoną ir bandyk dar.")}</div>;
    case "error": return <div className="rp-res">{L("Nepavyko išgirsti. Pabandyk dar kartą.")}</div>;
  }
  const r = p.result;
  if (!r) return null;
  return (
    <div className={"rp-res done " + r.verdict} aria-live="polite">
      <span className="rp-verdict">{VERDICT[r.verdict]}</span>
      <span className="rp-words" lang={TL}><Marked words={r.words} /></span>
      {r.verdict !== "great" && <span className="rp-heard">{L("Girdėjau:")} <span lang={TL}>{Lx("„{heard}“", { heard: p.heard })}</span></span>}
    </div>
  );
}

function renderGap(en: string) {
  const parts = en.split("…");
  return parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <span className="gap">…</span>}</span>);
}

// --------------------------------------------------------------------------------------------

function MicButton() {
  const keyboardHints = useKeyboardHints();
  const conv = useStore((s) => s.conv);
  const supported = speechSupported();
  const listening = ["listening", "starting", "reconnecting"].includes(conv.mic.status);
  if (!supported) return <button className="mic" disabled title={L("Balso atpažinimas šioje naršyklėje nepalaikomas")} aria-label={L("Balso atpažinimas šioje naršyklėje nepalaikomas")}><Icon name="mic" size={30} /></button>;
  const title = listening ? (keyboardHints ? L("Baigti atsakymą (tarpo klavišas)") : L("Baigti atsakymą")) : (keyboardHints ? L("Įjungti mikrofoną dar kartą (tarpo klavišas)") : L("Įjungti mikrofoną dar kartą"));
  return (
    <button className={"mic" + (listening ? " listening" : "")} disabled={conv.phase !== "you"} aria-pressed={listening}
      title={title} aria-label={title}
      onClick={() => { const s = game?.activeSession; if (!s) return; if (listening) s.finishListening(); else s.listen(); }}>
      {listening ? <Icon name="stop" size={24} /> : <Icon name="mic" size={30} />}
    </button>
  );
}

const MIC = <InlineIcon name="mic" label={L("mikrofono mygtuką")} />;
const KEYS = <InlineIcon name="keyboard" label={L("klaviatūra")} />;

function MicStatus() {
  const keyboardHints = useKeyboardHints();
  const conv = useStore((s) => s.conv);
  const f = useStore((s) => s.progress.profile?.gender === "f");
  const m = conv.mic;
  if (!speechSupported()) return <div className="mic-status"><b>{L("Rašyk atsakymą")}</b><span className="sub">{L("Ši naršyklė neturi balso atpažinimo (Chrome, Edge ir Safari turi).")}</span></div>;
  if (conv.phase === "npc") return <div className="mic-status"><span className="sub">{conv.typing ? L("Klausyk…") : L("Klausyk… (mikrofonas įsijungs, kai baigs kalbėti)")}</span></div>;
  if (conv.phase === "thinking") return <div className="mic-status"><span className="sub">…</span></div>;
  if (conv.typing) return <div className="mic-status"><b>{L("Rašyk atsakymą")}</b><span className="sub">{Lx("Jei nori kalbėti, spausk {mic}.", { mic: MIC })}</span></div>;
  switch (m.status) {
    case "starting": return <div className="mic-status"><b>{L("Jungiamas mikrofonas…")}</b></div>;
    case "listening": case "reconnecting":
      return <div className="mic-status"><b>{L("Klausau – kalbėk {calmly}", { calmly: f ? L("neskubėdama") : L("neskubėdamas") })}</b>{m.heard ? <span className="heard">{Lx("„{heard}“", { heard: m.heard })}</span> : <span className="sub">{L("Gali daryti pauzes – palauksiu.")}</span>}</div>;
    case "denied": return <div className="mic-status"><b>{L("Leisk naudoti mikrofoną")}</b><span className="sub">{Lx("Naršyklės adreso juostoje leisk mikrofoną ir spausk {mic} dar kartą. Arba rašyk {keys}.", { mic: MIC, keys: KEYS })}</span></div>;
    case "error": return <div className="mic-status"><b>{m.error === "network" ? L("Nepavyko prisijungti prie atpažinimo") : m.error === "audio-capture" ? L("Nerastas mikrofonas") : L("Klausymas nepavyko")}</b><span className="sub">{Lx("Spausk {mic} ir bandyk dar arba rašyk {keys}.", { mic: MIC, keys: KEYS })}</span></div>;
    case "nothing": return <div className="mic-status"><b>{L("Nieko negirdėjau")}</b><span className="sub">{keyboardHints ? Lx("Spausk {mic} (arba tarpo klavišą), kai būsi {ready}.", { mic: MIC, ready: f ? L("pasiruošusi") : L("pasiruošęs") }) : Lx("Spausk {mic}, kai būsi {ready}.", { mic: MIC, ready: f ? L("pasiruošusi") : L("pasiruošęs") })}</span></div>;
    default: return <div className="mic-status"><b>{L("Tavo eilė")}</b><span className="sub">{keyboardHints ? Lx("Mikrofonas įsijungia automatiškai. Jei reikia bandyti dar kartą, spausk {mic} arba tarpo klavišą. Rašyti – {keys} (T).", { mic: MIC, keys: KEYS }) : Lx("Mikrofonas įsijungia automatiškai. Jei reikia bandyti dar kartą, spausk {mic}. Rašyti – {keys}.", { mic: MIC, keys: KEYS })}</span></div>;
  }
}
