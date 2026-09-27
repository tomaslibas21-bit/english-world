import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, type TranscriptLine } from "../state/store";
import { Interlinear } from "./Interlinear";
import { NPCS, COACH_VOICE } from "../content/npcs";
import { SITUATION_BY_ID } from "../content/situations";
import { GLOBAL } from "../content/global";
import { LOCATIONS } from "../content/locations";
import { compose, type Sentence } from "../convo/compose";
import type { EntityDef, HintGroup, SituationDef } from "../content/types";
import { audio } from "../game/audio";
import { game } from "../game/gameRef";
import { speechSupported } from "../convo/speech";
import { sitProgress } from "../state/progress";
import { toImperative } from "./lt";
import { Icon, InlineIcon, type IconName } from "./icons";
import { showToast } from "./Toasts";
import { modelAnswers, playerVars, type Guess, type HeardWord, type RepeatWord } from "../convo/suggest";
import "./answer.css";

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
      const st = useStore.getState();
      if (!st.conv.active) return; // walking around: the world has its own keys (Game.onKeyDown)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === "escape") { game?.closeConversation(); return; }
      if (k === "h") { e.preventDefault(); st.setConv({ openHint: st.conv.openHint ? null : (st.conv.hints[0] ?? "g_clarify") }); return; }
      if (k === "l") { e.preventDefault(); st.setSettings({ lt: !st.settings.lt }); return; }
      if (k === "i") { e.preventDefault(); st.setSettings({ ipa: !st.settings.ipa }); return; }
      if (k === "t") { e.preventDefault(); st.setConv({ typing: !st.conv.typing }); return; }
      if (k === "r") { e.preventDefault(); game?.activeSession?.repeatLast(false); return; }
      if ((k === " " || k === "enter") && st.conv.phase === "you") {
        e.preventDefault();
        const s = game?.activeSession;
        if (!s) return;
        if (st.conv.mic.status === "listening" || st.conv.mic.status === "starting" || st.conv.mic.status === "reconnecting") s.stopListening();
        else s.listen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!conv.active || !sit) return null;
  const loc = LOCATIONS[sit.location];
  const formal = !npc?.informal;
  const gender = useStore.getState().progress.profile?.gender ?? "m";

  const send = () => {
    const v = typed.trim();
    if (!v) return;
    setTyped("");
    game?.activeSession?.submit(v);
  };

  return (
    <div className="convo" role="dialog" aria-label={`Pokalbis: ${npc?.name ?? ""}`}>
      <div className="convo-head">
        <div className="avatar" style={{ background: avatarColor(conv.npcId) }}>{sit.mode === "phone" ? <Icon name="phoneCall" size={22} /> : sit.mode === "video" ? <Icon name="video" size={22} /> : (npc?.name ?? "?").replace(/^(Mr\.|Ms\.|Mrs\.|Officer) /, "").charAt(0)}</div>
        <div className="who">
          <b>{npc?.name}</b>
          <span>{npc?.role.en} · {sit.mode === "video" ? "Vaizdo skambutis" : loc?.lt ?? ""}</span>
        </div>
        <div className="toggles">
          <button className={"toggle" + (settings.lt ? " on" : "")} onClick={() => setSettings({ lt: !settings.lt })} title="Lietuviškas vertimas (L)" aria-pressed={settings.lt}>LT</button>
          <button className={"toggle" + (settings.ipa ? " on" : "")} onClick={() => setSettings({ ipa: !settings.ipa })} title="Tarimas IPA (I)" aria-pressed={settings.ipa}>IPA</button>
        </div>
        <div className="head-actions">
          <button className="close-x" onClick={() => game?.restartScenario()} title="Pradėti šį pokalbį iš naujo" aria-label="Pradėti iš naujo"><Icon name="restart" /></button>
          <button className="close-x" onClick={() => { game?.closeConversation(); useStore.getState().setHud({ panel: "scenarios" }); }} title="Visos situacijos" aria-label="Visos situacijos"><Icon name="list" /></button>
          <button className="close-x" onClick={() => game?.closeConversation()} title="Baigti pokalbį (Esc)" aria-label="Baigti pokalbį"><Icon name="close" /></button>
        </div>
      </div>

      {(sit.mode === "video" || sit.mode === "phone") && <CallStrip sit={sit} />}
      <Mission />

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
            <b>{conv.phase === "npc" ? `${npc?.name ?? ""} kalba…` : conv.phase === "thinking" ? "…" : "Tavo eilė"}</b>
            <div className="yt-actions">
              {conv.phase === "you" && (settings.guide || conv.openHint !== null) && (
                <div className="toggles say-toggles" role="group" aria-label="Po tavo atsakymų pavyzdžiais">
                  <button className={"toggle" + (settings.sayLt ? " on" : "")} onClick={() => setSettings({ sayLt: !settings.sayLt })} aria-pressed={settings.sayLt} title="Vertimas po tavo atsakymų pavyzdžiais"><span className="long">Vertimas</span><span className="short">LT</span></button>
                  <button className={"toggle" + (settings.sayIpa ? " on" : "")} onClick={() => setSettings({ sayIpa: !settings.sayIpa })} aria-pressed={settings.sayIpa} title="Tarimas (IPA) po tavo atsakymų pavyzdžiais">IPA</button>
                </div>
              )}
              <button className="btn soft small" onClick={() => setSettings({ guide: !settings.guide })}>{settings.guide ? "Slėpti pagalbą" : "Ką sakyti?"}</button>
            </div>
          </div>

          {conv.failures > 0 && conv.phase === "you" && conv.lastHeard && (
            <div className="miss-box" ref={missRef}>
              <div>Neatpažinau{conv.prefix ? " – atrodo, sakinys nebaigtas" : ""}. Girdėjau:</div>
              <div className="heard" lang="en">„{conv.guess ? <Marked words={conv.guess.heard} /> : conv.lastHeard}“</div>
              {conv.guess && <DidYouMean guess={conv.guess} lt={settings.sayLt} />}
              <div className="acts">
                {speechSupported() && <button className="btn small" onClick={() => game?.activeSession?.listen()}><Icon name="mic" size={17} /> Bandyti dar</button>}
                <button className="btn soft small" onClick={() => { setTyped(conv.lastHeard); setConv({ typing: true }); }}><Icon name="pencil" size={17} /> Pataisyti tekstą</button>
                <button className="btn ghost small" onClick={() => copyConversation(sit)} title="Nukopijuok ir atsiųsk mokytojui"><Icon name="clipboard" size={17} /> Kopijuoti</button>
              </div>
            </div>
          )}

          {settings.guide && <Guide sit={sit} formal={formal} gender={gender} />}

          <Hints sit={sit} formal={formal} gender={gender} />
          </div>

          <div className="yt-bottom">
          <div className="inputbar">
            <MicButton />
            <MicStatus />
            <button className={"type-toggle" + (conv.typing ? " on" : "")} onClick={() => setConv({ typing: !conv.typing })} title="Rašyti (T)" aria-label="Rašyti (T)" aria-pressed={conv.typing}><Icon name="keyboard" size={24} /></button>
          </div>
          {conv.typing && (
            <form className="typebox" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Parašyk angliškai…" lang="en" autoCapitalize="sentences" autoComplete="off" disabled={conv.phase !== "you"} />
              <button className="btn" type="submit" disabled={conv.phase !== "you" || !typed.trim()}>Siųsti</button>
            </form>
          )}
          </div>
        </div>
      ) : (
        <div className="yourturn ended-box">
          {conv.completed && <div className="ended-badge"><Icon name="check" size={30} strokeWidth={2.5} /></div>}
          <div className="ended-title">{conv.completed ? "Užduotis įvykdyta!" : "Pokalbis baigtas"}</div>
          {conv.newExpressions.length > 0 && <div className="ended-sub">Naujų frazių knygelėje: {conv.newExpressions.length}</div>}
          <div className="sit-actions" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => { const next = game?.nextScenarioId(sit.id); if (next) game?.startScenario(next); }}><Icon name="arrowRight" size={18} /> Kita situacija</button>
            <button className="btn soft" onClick={() => game?.restartScenario()}><Icon name="restart" size={18} /> Dar kartą</button>
            <button className="btn ghost" onClick={() => { game?.closeConversation(); useStore.getState().setHud({ panel: "scenarios" }); }}><Icon name="list" size={18} /> Visos situacijos</button>
          </div>
          <button className="copy-link" onClick={() => copyConversation(sit)}><Icon name="clipboard" size={17} /> Kopijuoti pokalbį mokytojui</button>
        </div>
      )}
    </div>
  );
}

/** Plain-text copy of the conversation, for students to send to the teacher (nothing is uploaded). */
async function copyConversation(sit: SituationDef) {
  const conv = useStore.getState().conv;
  const when = new Date().toLocaleString("lt-LT");
  const lines = conv.transcript.map((l) => l.who === "npc"
    ? `${NPCS[l.npc ?? ""]?.name ?? "NPC"}: ${l.sentence?.en ?? ""}`
    : l.who === "you" ? `Aš: ${l.text ?? ""}${l.understood ? "" : "   ← NEATPAŽINTA"}` : "");
  const text = [`English World – „${sit.title.lt}“ (${sit.title.en}) · ${when}`, "", ...lines.filter(Boolean)].join("\n");
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
  }
  showToast(ok ? { kind: "success", icon: "clipboard", title: "Pokalbis nukopijuotas", body: "Įklijuok jį žinutėje mokytojui (Ctrl/Cmd + V).", ms: 5000 }
    : { kind: "info", title: "Nepavyko nukopijuoti", body: "Padaryk ekrano nuotrauką ir atsiųsk ją mokytojui." });
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
    for (const l of lines) await audio.play(npc?.voice ?? "af_bella", npc?.speed ?? 1, l.sentence!.say, { slow, male: npc?.gender === "m" });
  };
  return (
    <div className={"msg npc" + (speaking ? " speaking" : "")}>
      <div className="meta">
        <span>{npc?.name}</span>
        <ReplayButtons replay={replay} />
      </div>
      <div className="bubble">
        {lines.map((l) => <div className="bubble-part" key={l.id}><Interlinear s={l.sentence!} lt={lt || !!reveal[l.id]} ipa={ipa} nat={nat || !!reveal[l.id]} /></div>)}
      </div>
    </div>
  );
}

/** "Say it again" and "slower" next to what a person said. */
function ReplayButtons({ replay }: { replay: (slow: boolean) => void }) {
  return (
    <>
      <button onClick={() => replay(false)} title="Pakartoti" aria-label="Pakartoti"><Icon name="speaker" size={18} /></button>
      <button onClick={() => replay(true)} title="Lėčiau" aria-label="Lėčiau"><Icon name="turtle" size={23} /></button>
    </>
  );
}

/** Mission checklist: progress, what to do now, and the full list on tap. */
function Mission() {
  const conv = useStore((s) => s.conv);
  const [open, setOpen] = useState(false);
  const items = conv.checklist;
  if (!items.length) return null;
  const done = items.filter((i) => i.done).length;
  const cur = items.find((i) => i.current) ?? items.find((i) => !i.done);
  return (
    <div className={"mission" + (conv.completed ? " complete" : "")}>
      <button className="mission-bar" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="mission-count">{done}/{items.length}</span>
        <span className="mission-dots" aria-hidden>{items.map((i) => <i key={i.id} className={i.done ? "d" : i.current ? "c" : ""} />)}</span>
        <span className="mission-now">{conv.completed ? <><Icon name="check" size={17} strokeWidth={2.25} className="done-ico" /> Užduotis įvykdyta!</> : cur ? toImperative(cur.lt) : ""}</span>
        <Icon name="chevronDown" size={18} className="chev" />
      </button>
      {open && (
        <ol className="mission-list">
          {items.map((i) => <li key={i.id} className={i.done ? "d" : i.current ? "c" : ""}><span className="mk"><Icon name={i.done ? "check" : i.current ? "arrowRight" : "ring"} size={16} strokeWidth={i.done ? 2.25 : 2} /></span>{toImperative(i.lt)}</li>)}
        </ol>
      )}
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
      <div className="guide-task"><Icon name="next" size={24} className="task-ico" /><span>{toImperative(sg.lt)}</span></div>
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
              <button className="play" onClick={() => { game?.activeSession?.stopListening(); audio.play(COACH_VOICE, 1, ex.say); }} title="Klausyti" aria-label="Klausyti"><Icon name="speaker" size={19} /></button>
              <div className="gx-text">
                <Interlinear s={ex} lt={false} ipa={settings.sayIpa} />
                {settings.sayLt && <div className="gx-lt" lang="lt">{ex.nat}</div>}
                <RepeatResult en={ex.en} />
              </div>
              <RepeatButton ex={ex} />
            </div>
          ))}
        </div>
      )}
      {conv.suggest.length > 1 && (
        <div className="guide-alt">
          <span>Arba:</span>
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
    return <div className="call-strip phone">{ended ? "Skambutis baigtas" : <><span className="dot" /> Skambutis</>} · {clock}</div>;
  }
  const people = [sit.npc, ...(sit.npcs ?? [])].filter((id, i, a) => NPCS[id] && a.indexOf(id) === i);
  return (
    <div className="call-strip video" aria-label="Vaizdo skambutis">
      {people.map((id) => (
        <div key={id} className={"tile" + (speakingNpc === id ? " talking" : "")}>
          <span className="face" style={{ background: avatarColor(id) }}>{NPCS[id].name.charAt(0)}</span>
          <span className="nm">{NPCS[id].name}</span>
        </div>
      ))}
      <div className={"tile you" + (listening ? " talking" : "")}>
        <span className="face" style={{ background: "#1f6f78" }}>{(profile?.name ?? "Tu").charAt(0)}</span>
        <span className="nm">{profile?.name ?? "Tu"}</span>
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
    const replay = (slow: boolean) => { game?.activeSession?.stopListening(); audio.play(npc?.voice ?? "af_bella", npc?.speed ?? 1, l.sentence!.say, { slow, male: npc?.gender === "m" }); };
    return (
      <div className={"msg npc" + (speaking ? " speaking" : "")}>
        <div className="meta">
          <span>{npc?.name}</span>
          <ReplayButtons replay={replay} />
        </div>
        <div className="bubble"><Interlinear s={l.sentence} lt={lt} ipa={ipa} nat={nat} /></div>
      </div>
    );
  }
  if (l.who === "you") {
    return (
      <div className={"msg you" + (l.understood ? "" : " miss")}>
        <div className="bubble">{l.via && <Via via={l.via} />}{l.text}{l.understood ? <span className="ok"><Icon name="check" size={14} strokeWidth={2.5} label="Suprasta" /></span> : null}</div>
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
        <Icon name="bulb" size={21} className="bulb" /> Daugiau frazių <span className="key">(H)</span><Icon name="chevronDown" size={18} className="chev" />
      </button>
      {open && (
        <div>
          {groups.map(([id, g]) => <HintGroupView key={id} id={id} g={g} sit={sit} formal={formal} gender={gender} chosen={conv.chosen[id]} lt={settings.sayLt} ipa={settings.sayIpa} used={used} />)}
          {!conv.hints.includes("g_clarify") && (
            <details className="hint-group">
              <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--ink-soft)", margin: "6px 2px" }}>Visada naudinga: paprašyti pakartoti, lėčiau, paraidžiui…</summary>
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
          {hasGap && <div className="pat">{renderGap(gap.en)}{it.register && <span className={"tag " + it.register}>{it.register === "polite" ? "mandagu" : it.register === "casual" ? "laisviau" : ""}</span>}</div>}
          <div className="ex">
            <Interlinear s={full} lt={lt} ipa={ipa} nat={lt} />
            {!hasGap && it.register && <span className={"tag " + it.register}>{it.register === "polite" ? "mandagu" : "laisviau"}</span>}
            {it.note && <div className="note">{it.note}</div>}
          </div>
          <button className="play" onClick={() => { game?.activeSession?.stopListening(); audio.play(COACH_VOICE, 1, full.say); }} title="Klausyti" aria-label="Klausyti"><Icon name="speaker" size={20} /></button>
        </div>
      ))}
    </div>
  );
}

const VIA: Record<NonNullable<TranscriptLine["via"]>, [IconName, string]> = {
  voice: ["mic", "Pasakyta balsu"],
  typed: ["keyboard", "Parašyta"],
  picked: ["bulb", "Pasirinkta iš pasiūlymų"],
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
  return (
    <div className="dym">
      <div className="dym-q">Ar norėjai pasakyti:</div>
      {guess.options.map((o) => (
        <button key={o.en} className="dym-opt" onClick={() => game?.activeSession?.submit(o.en, [], "picked")}>
          <span className="dym-text">
            <span className="dym-en" lang="en">{o.en}</span>
            {lt && <span className="dym-lt" lang="lt">{o.nat}</span>}
          </span>
          <Icon name="arrowRight" size={18} className="dym-go" />
        </button>
      ))}
      <div className="dym-hint">Paliesk sakinį arba {speechSupported() ? "pasakyk" : "parašyk"} „yes“.</div>
    </div>
  );
}

/** "Pakartok": plays the example, then listens once (practice only). While busy it stops or cancels. */
function RepeatButton({ ex }: { ex: Sentence }) {
  const p = useStore((s) => s.conv.practice);
  if (!speechSupported()) return null;
  const state = p?.en === ex.en && (p.status === "playing" || p.status === "listening") ? p.status : null;
  const label = state === "listening" ? "Baigti" : state === "playing" ? "Atšaukti" : "Pakartok";
  return (
    <button className={"rp-btn" + (state ? " " + state : "")} aria-pressed={!!state} aria-label={label}
      title={state ? label : "Paklausyk ir pakartok garsiai"}
      onClick={() => { const s = game?.activeSession; if (!s) return; if (state) s.stopPractice(); else s.practice(ex.en, ex.say); }}>
      <Icon name={state === "listening" ? "stop" : "mic"} size={18} /><span className="rp-label">{label}</span>
    </button>
  );
}

const VERDICT = { great: "Puiku!", almost: "Beveik!", again: "Pabandyk dar kartą" } as const;

/** Under a guide example: what happens now, then which words were said and a short verdict. */
function RepeatResult({ en }: { en: string }) {
  const p = useStore((s) => s.conv.practice);
  if (!p || p.en !== en) return null;
  switch (p.status) {
    case "playing": return <div className="rp-res wait">Klausyk…</div>;
    case "listening": return <div className="rp-res wait"><span className="rp-dot" />{p.heard ? <span className="rp-heard" lang="en">„{p.heard}“</span> : "Dabar tu – pakartok garsiai"}</div>;
    case "nothing": return <div className="rp-res">Nieko negirdėjau. Spausk „Pakartok“ ir kalbėk.</div>;
    case "denied": return <div className="rp-res">Leisk naršyklei naudoti mikrofoną ir bandyk dar.</div>;
    case "error": return <div className="rp-res">Nepavyko išgirsti. Pabandyk dar kartą.</div>;
  }
  const r = p.result;
  if (!r) return null;
  return (
    <div className={"rp-res done " + r.verdict} aria-live="polite">
      <span className="rp-verdict">{VERDICT[r.verdict]}</span>
      <span className="rp-words" lang="en"><Marked words={r.words} /></span>
      {r.verdict !== "great" && <span className="rp-heard">Girdėjau: <span lang="en">„{p.heard}“</span></span>}
    </div>
  );
}

function renderGap(en: string) {
  const parts = en.split("…");
  return parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <span className="gap">…</span>}</span>);
}

// --------------------------------------------------------------------------------------------

function MicButton() {
  const conv = useStore((s) => s.conv);
  const supported = speechSupported();
  const listening = ["listening", "starting", "reconnecting"].includes(conv.mic.status);
  if (!supported) return <button className="mic" disabled title="Balso atpažinimas šioje naršyklėje nepalaikomas" aria-label="Balso atpažinimas šioje naršyklėje nepalaikomas"><Icon name="mic" size={30} /></button>;
  const title = listening ? "Baigti klausytis (tarpo klavišas)" : "Kalbėti (tarpo klavišas)";
  return (
    <button className={"mic" + (listening ? " listening" : "")} disabled={conv.phase !== "you"} aria-pressed={listening}
      title={title} aria-label={title}
      onClick={() => { const s = game?.activeSession; if (!s) return; if (listening) s.stopListening(); else s.listen(); }}>
      {listening ? <Icon name="stop" size={24} /> : <Icon name="mic" size={30} />}
    </button>
  );
}

const MIC = <InlineIcon name="mic" label="mikrofono mygtuką" />;
const KEYS = <InlineIcon name="keyboard" label="klaviatūra" />;

function MicStatus() {
  const conv = useStore((s) => s.conv);
  const f = useStore((s) => s.progress.profile?.gender === "f");
  const m = conv.mic;
  if (!speechSupported()) return <div className="mic-status"><b>Rašyk atsakymą</b><span className="sub">Ši naršyklė neturi balso atpažinimo (Chrome, Edge ir Safari turi).</span></div>;
  if (conv.phase === "npc") return <div className="mic-status"><span className="sub">Klausyk… (mikrofonas įsijungs, kai baigs kalbėti)</span></div>;
  if (conv.phase === "thinking") return <div className="mic-status"><span className="sub">…</span></div>;
  switch (m.status) {
    case "starting": return <div className="mic-status"><b>Jungiamas mikrofonas…</b></div>;
    case "listening": case "reconnecting":
      return <div className="mic-status"><b>Klausau – kalbėk {f ? "neskubėdama" : "neskubėdamas"}</b>{m.heard ? <span className="heard">„{m.heard}“</span> : <span className="sub">Gali daryti pauzes – palauksiu.</span>}</div>;
    case "denied": return <div className="mic-status"><b>Leisk naudoti mikrofoną</b><span className="sub">Naršyklės adreso juostoje leisk mikrofoną ir spausk {MIC} dar kartą. Arba rašyk {KEYS}.</span></div>;
    case "error": return <div className="mic-status"><b>{m.error === "network" ? "Nepavyko prisijungti prie atpažinimo" : m.error === "audio-capture" ? "Nerastas mikrofonas" : "Klausymas nepavyko"}</b><span className="sub">Spausk {MIC} ir bandyk dar arba rašyk {KEYS}.</span></div>;
    case "nothing": return <div className="mic-status"><b>Nieko negirdėjau</b><span className="sub">Spausk {MIC} (arba tarpo klavišą), kai būsi {f ? "pasiruošusi" : "pasiruošęs"}.</span></div>;
    default: return <div className="mic-status"><b>Spausk {MIC} ir kalbėk</b><span className="sub">arba tarpo klavišą · rašyti {KEYS} (T)</span></div>;
  }
}
