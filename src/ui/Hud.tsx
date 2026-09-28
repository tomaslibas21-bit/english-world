import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { game } from "../game/gameRef";
import { WORLD, SEA_Z } from "../game/world/layout";
import { LOCATIONS } from "../content/locations";
import { SITUATION_BY_ID } from "../content/situations";
import { sitProgress, stars } from "../state/progress";
import { Icon, InlineIcon, Stars, drawIcon, iconForEmoji, splitLead, type IconName } from "./icons";
import { switchPlayMode } from "./playMode";
import { useCards, dueCards } from "../state/cards";
import "./light.css";

/** Inside English Master (VITE_BACK_URL, e.g. "/"): the way back to the course site. */
export const COURSE_URL = import.meta.env.VITE_BACK_URL as string | undefined;

function ToolButton({ icon, title, panel, hotkey, badge }: { icon: IconName; title: string; panel: "scenarios" | "map" | "journal" | "phone" | "phrasebook" | "settings"; hotkey?: string; badge?: number }) {
  return (
    <button className="icon-btn" onClick={() => useStore.getState().setHud({ panel })} title={title} aria-label={badge ? `${title} (${badge})` : title}>
      <Icon name={icon} size={25} />{hotkey && <span className="key" aria-hidden>{hotkey}</span>}
      {!!badge && <span className="due-badge" aria-hidden>{badge}</span>}
    </button>
  );
}

/** How many saved cards are due for review today. */
export function useDueCards(): number {
  const cards = useCards((c) => c.cards);
  return dueCards(cards, Date.now()).length;
}

export function Hud() {
  const hud = useStore((s) => s.hud);
  const conv = useStore((s) => s.conv);
  const due = useDueCards();
  const [helpOpen, setHelpOpen] = useState(() => { try { return localStorage.getItem("ew-help-closed") !== "1"; } catch { return true; } });
  if (conv.active) return <Fade />;
  const banner = hud.zoneBanner ? splitLead(hud.zoneBanner.title) : null;
  return (
    <div className="hud">
      <Objective />
      <Minimap />
      <div className="toolbar">
        {COURSE_URL && <a className="icon-btn" href={COURSE_URL} title="Grįžti į kursą" aria-label="Grįžti į kursą"><Icon name="home" size={25} /></a>}
        <ToolButton icon="clapper" title="Visos situacijos" panel="scenarios" />
        <ToolButton icon="map" title="Žemėlapis (M)" panel="map" hotkey="M" />
        <ToolButton icon="journal" title="Užduotys (J)" panel="journal" hotkey="J" />
        <ToolButton icon="smartphone" title="Telefonas (P)" panel="phone" hotkey="P" />
        <ToolButton icon="bookOpen" title="Frazių knygelė" panel="phrasebook" badge={due} />
        <ToolButton icon="settings" title="Nustatymai (Esc)" panel="settings" />
      </div>
      <button className="lite-btn" onClick={() => switchPlayMode("light")} title="Be 3D miesto: tik pokalbiai su piešiniais. Greičiau atsidaro ir taupo bateriją."><Icon name="list" size={18} strokeWidth={2} /> Lengvas režimas</button>
      {hud.zoneBanner && banner && <div className="zone-banner"><h2>{banner.icon && <Icon name={banner.icon} size="0.8em" className="zb-ico" />}{banner.rest}</h2>{hud.zoneBanner.sub && <p>{hud.zoneBanner.sub}</p>}</div>}
      {hud.prompt && !hud.panel && (
        <button className={"prompt" + (hud.showTouch ? " touch" : "")} onClick={() => game?.interact()}>
          <kbd>{hud.showTouch ? <Icon name="tap" size={18} /> : "E"}</kbd>{hud.prompt.label}
        </button>
      )}
      {helpOpen && !hud.showTouch && (
        <div className="help-strip">
          Vaikščiok <kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label="aukštyn" /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label="žemyn" /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label="kairėn" /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label="dešinėn" /></kbd> arba <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · bėgti <kbd>Shift</kbd><br />
          Spustelėk žemę – nueisi ten · tempk pele – apsidairyk · <kbd>E</kbd> – kalbėtis / įeiti<br />
          <kbd>G</kbd> – nueiti iki užduoties · <kbd>M</kbd> žemėlapis · <kbd>J</kbd> užduotys · <kbd>P</kbd> telefonas
          <button onClick={() => { setHelpOpen(false); try { localStorage.setItem("ew-help-closed", "1"); } catch { /* ignore */ } }}>Supratau <Icon name="close" size={15} strokeWidth={2.25} /></button>
        </div>
      )}
      {hud.showTouch && <TouchControls />}
      <Fade />
    </div>
  );
}

function Fade() {
  const fade = useStore((s) => s.hud.fade);
  return <div className="fade" style={{ opacity: fade }} />;
}

function Objective() {
  const o = useStore((s) => s.hud.objective);
  const progress = useStore((s) => s.progress);
  const [collapsed, setCollapsed] = useState(false);
  if (!o) {
    return (
      <div className="objective-card">
        <div className="kicker">Visos užduotys atliktos <InlineIcon name="party" /></div>
        <p>Grįžk į bet kurią vietą ir pabandyk pasakyti kitaip – žmonės kaskart kalba šiek tiek skirtingai.</p>
      </div>
    );
  }
  const sit = SITUATION_BY_ID[o.sitId];
  const phone = sit?.mode === "phone" || sit?.mode === "video" || sit?.location === "phone";
  const st = stars(sitProgress(progress, o.sitId));
  return (
    <div className={"objective-card" + (collapsed ? " collapsed" : "")}>
      <div className="kicker">
        <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> Užduotis</span>
        {st > 0 && <Stars n={st} size={14} />}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Suskleisti" aria-expanded={!collapsed}><Icon name={collapsed ? "chevronDown" : "chevronUp"} size={18} strokeWidth={2} /></button>
      </div>
      <h3>{o.title} <span className="en-title">· {sit?.title.en}</span></h3>
      <p>{o.goal}</p>
      <div className="row">
        {phone ? (
          <button className="btn small" onClick={() => useStore.getState().setHud({ panel: "phone" })}><Icon name="smartphone" size={17} /> Paskambinti</button>
        ) : (
          <>
            <span className="dist">
              {o.angle !== null && <Arrow angle={o.angle} />}
              {o.inside && o.dist !== null && o.dist < 4 ? "Čia pat!" : o.dist !== null ? `${o.dist} m` : ""} · {o.where}
            </span>
            <button className="btn small" onClick={() => game?.autoWalkToObjective()} title="G"><Icon name="walk" size={17} /> Nuvesk mane</button>
          </>
        )}
        <button className="btn ghost small" onClick={() => useStore.getState().setHud({ panel: "journal" })}>Kita užduotis</button>
      </div>
    </div>
  );
}

function Arrow({ angle }: { angle: number }) {
  // angle: direction to target in world space (atan2(dx, dz)); screen: north (-z) is up
  const deg = 180 - (angle * 180) / Math.PI;
  return (
    <svg className="arrow" viewBox="0 0 24 24" style={{ transform: `rotate(${deg}deg)` }} aria-hidden>
      <path d="M12 2 L20 20 L12 16 L4 20 Z" fill="currentColor" />
    </svg>
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mm = useStore((s) => s.hud.minimap);
  const zoneName = useStore((s) => s.hud.zoneName);
  useEffect(() => {
    const c = ref.current;
    const g = game?.groundCanvas;
    if (!c) return;
    const x = c.getContext("2d")!;
    const S = 220;
    c.width = S; c.height = S;
    x.clearRect(0, 0, S, S);
    if (mm.zone !== "town") {
      x.fillStyle = "#f3eadb"; x.fillRect(0, 0, S, S);
      drawIcon(x, "home", S / 2, S / 2 - 14, 46, "#1f6f78");
      x.font = "800 15px Nunito"; x.fillStyle = "#52606d"; x.textAlign = "center";
      x.fillText("Viduje", S / 2, S / 2 + 28);
      return;
    }
    if (!g) return;
    const PPM = g.width / (WORLD.maxX - WORLD.minX);
    const view = 90; // metres across
    const sx = (mm.px - WORLD.minX) * PPM - (view / 2) * PPM;
    const sz = (mm.pz - (SEA_Z - 2)) * PPM - (view / 2) * PPM;
    x.fillStyle = "#3f8fb5"; x.fillRect(0, 0, S, S);
    x.drawImage(g, sx, sz, view * PPM, view * PPM, 0, 0, S, S);
    // target
    if (mm.targetX !== undefined && mm.targetZ !== undefined) {
      const tx = ((mm.targetX - mm.px) / view + 0.5) * S, tz = ((mm.targetZ - mm.pz) / view + 0.5) * S;
      const inside = tx > 10 && tx < S - 10 && tz > 10 && tz < S - 10;
      const cx = Math.max(12, Math.min(S - 12, tx)), cz = Math.max(12, Math.min(S - 12, tz));
      x.fillStyle = "#ffb703"; x.strokeStyle = "#fff"; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cz, inside ? 9 : 7, 0, Math.PI * 2); x.fill(); x.stroke();
    }
    // player arrow
    x.save(); x.translate(S / 2, S / 2); x.rotate(Math.PI - mm.heading);
    x.fillStyle = "#e63946"; x.strokeStyle = "#fff"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -12); x.lineTo(9, 10); x.lineTo(0, 5); x.lineTo(-9, 10); x.closePath(); x.stroke(); x.fill();
    x.restore();
  }, [mm]);
  return (
    <div className="minimap" onClick={() => useStore.getState().setHud({ panel: "map" })} title="Žemėlapis (M)">
      <canvas ref={ref} />
      <div className="label">{zoneName}</div>
    </div>
  );
}

function TouchControls() {
  const ref = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const prompt = useStore((s) => s.hud.prompt);
  useEffect(() => {
    const el = ref.current!;
    let id: number | null = null;
    const R = 60;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const r = el.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
      game?.setJoystick(dx / R, -dy / R);
    };
    const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = null; knob.current!.style.transform = ""; game?.setJoystick(0, 0); };
    const down = (e: PointerEvent) => { id = e.pointerId; el.setPointerCapture(e.pointerId); move(e); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
  }, []);
  return (
    <>
      <div className="joy" ref={ref}><div className="knob" ref={knob} /></div>
      {prompt && <button className="act-btn" onClick={() => game?.interact()}>{prompt.kind === "talk" ? "Kalbėti" : prompt.kind === "exit" ? "Išeiti" : "Įeiti"}</button>}
    </>
  );
}

/** The icon of a place (its emoji in the location data, drawn as one of our icons). */
export function locIcon(id: string): IconName { return iconForEmoji(LOCATIONS[id]?.icon) ?? "pin"; }
