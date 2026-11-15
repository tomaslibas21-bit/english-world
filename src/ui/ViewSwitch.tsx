import { useEffect, useId, useState } from "react";
import { picturesOn, useStore } from "../state/store";
import { game } from "../game/gameRef";
import type { Game } from "../game/Game";
import { sceneFor, sceneUrl } from "./scenes";
import { Icon } from "./icons";

/** In a conversation in the 3D town, where the place has a picture: a small preview of the other view in the corner
 *  of the scene, beside the panel (styles.css `.view-chip`). With the person in 3D it is the place's own picture
 *  ("talk in front of the picture instead"); in front of the picture it is the town as the conversation's camera
 *  sees it (the way back to the person, whose lips follow the voice). One tap switches; so does P. It is the same
 *  setting as „Iliustruotos scenos“ in Nustatymai, here in the game's own picture where the learner looks for it
 *  (owner, 15 Nov 2026: after a conversation in 3D he could not find the pictures again). A conversation starts
 *  with the person in 3D unless the learner picked the picture (store.ts `picturesOn`). The first time someone
 *  talks in 3D at a place with a picture, a short hint beside it says what it is for. A place without a picture has
 *  no chip, and the pictures-only mode has no 3D town, so it has none either. */
export function ViewSwitch() {
  const active = useStore((s) => s.conv.active);
  const sitId = useStore((s) => s.conv.sitId);
  const hostId = useStore((s) => s.conv.hostId);
  const run = useStore((s) => s.conv.run);
  const light = useStore((s) => s.settings.play === "light");
  const pictures = useStore((s) => picturesOn(s.settings));
  const panel = useStore((s) => s.hud.panel);
  const touch = useStore((s) => s.hud.showTouch);
  const art = active && !light ? sceneFor(sitId, hostId) : undefined;
  const shown = !!art && !panel;
  const tipId = useId();

  // in front of the picture: the town's preview, drawn now and once more when the conversation's camera has settled
  const [town, setTown] = useState<string | null>(null);
  useEffect(() => {
    if (!shown || !pictures) return;
    const take = () => { const url = townPreview(); if (url) setTown(url); };
    take();
    const t = setTimeout(take, 1400);
    return () => clearTimeout(t);
  }, [shown, pictures, run]);

  // a picture that did not arrive: the icon alone (a new conversation tries again)
  const [failed, setFailed] = useState<string | null>(null);

  // the first conversation in 3D at a place with a picture: the hint, once, for a few seconds
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!shown || pictures) { setHint(false); return; }
    if (useStore.getState().progress.coach?.view) return;
    const on = setTimeout(() => {
      setHint(true);
      useStore.getState().updateProgress((p) => { p.coach = { ...p.coach, view: true }; });
    }, 1200);
    const off = setTimeout(() => setHint(false), 1200 + HINT_MS);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [shown, pictures, run]);

  if (!art || !shown) return null;
  const toPicture = !pictures;
  const src = toPicture ? sceneUrl(art.start) : town;
  const img = src && src !== failed ? src : null;
  const focus = `${art.focus[0]}% ${art.focus[1]}%`;
  const says = toPicture ? "Kalbėtis prie piešinio" : "Kalbėtis su žmogumi 3D mieste";
  return (
    <div className={"view-chip" + (toPicture ? " to-picture" : " to-town") + (hint ? " hint" : "")}>
      <button type="button" aria-label={`${says} (P)`} aria-describedby={tipId}
        onClick={() => { setHint(false); useStore.getState().setSettings({ scenes: toPicture }); }}>
        {img
          ? <img src={img} alt="" draggable={false} onError={() => setFailed(img)}
              style={toPicture ? { objectPosition: focus, transformOrigin: focus } : undefined} />
          : <span className="vc-blank" aria-hidden><Icon name={toPicture ? "frame" : "walk"} size={22} strokeWidth={1.8} /></span>}
        <span className="vc-label" aria-hidden>{toPicture ? "Piešinys" : "3D"}</span>
      </button>
      <span className="vc-tip" id={tipId} role="tooltip">
        {hint ? `Nori kalbėtis prie piešinio? ${touch ? "Bakstelėk čia." : "Spausk čia arba P."}` : <>{says}{!touch && <kbd>P</kbd>}</>}
      </span>
    </div>
  );
}

/** How long the first-time hint stays (ms). */
const HINT_MS = 12000;

/** A small picture of the town as the conversation's camera sees it: the part of the view beside (or above) the
 *  panel, around its middle. The town is not drawn while a picture covers it, so one frame is drawn for this. */
function townPreview(): string | null {
  const g = game as unknown as Game | null;
  if (!g || g.light || !g.renderer) return null;
  try {
    const el = g.renderer.domElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return null;
    // the scene's own part of the screen: left of the panel on a computer or a sideways phone, above it on a phone
    const panel = document.querySelector(".convo")?.getBoundingClientRect();
    let rw = w, rh = h;
    if (panel && panel.top > 60) rh = Math.min(h, panel.top);
    else if (panel && panel.left > 60) rw = Math.min(w, panel.left);
    g.renderer.render(g.scene, g.rig.cam);
    // a 4:3 window around the people talking (the point the conversation's camera looks at), kept inside that part
    let mx = rw / 2, my = rh * 0.46;
    const look = g.rig.talk?.look.clone().project(g.rig.cam);
    if (look && Math.abs(look.x) <= 1 && Math.abs(look.y) <= 1) { mx = ((look.x + 1) / 2) * w; my = ((1 - look.y) / 2) * h; }
    const ch = Math.min(rh, h * 0.5, (rw * 3) / 4), cw = (ch * 4) / 3;
    const cx = Math.max(0, Math.min(rw - cw, mx - cw / 2)), cy = Math.max(0, Math.min(rh - ch, my - ch * 0.56));
    const k = el.width / w;
    const out = document.createElement("canvas");
    out.width = 176; out.height = 132;
    const c = out.getContext("2d");
    if (!c) return null;
    c.drawImage(el, cx * k, cy * k, cw * k, ch * k, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}
