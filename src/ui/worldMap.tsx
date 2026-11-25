import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { CAVE_COPY } from "../content/cave-copy";
import { LOCATIONS, TOWN_LT, placeLt } from "../content/locations";
import { ROUTE } from "../content/route";
import { SITUATIONS } from "../content/situations/catalog";
import { isTownQuest } from "../content/townQuests";
import type { SituationMeta } from "../content/types";
import { game } from "../game/gameRef";
import { LIGHTHOUSE_ISLAND } from "../game/world/island";
import { AIRPORT_EXIT, OUTDOOR_NPCS, SEA_Z, WORLD } from "../game/world/layout";
import { COVE_DOORS, RING_TARGET } from "../game/world/slateCovePlan";
import { sitProgress } from "../state/progress";
import { useStore } from "../state/store";
import { Icon, InlineIcon, type IconName } from "./icons";
import { drawIslandMap, mapPosition } from "./mapMarks";
import { locIcon } from "./objective";
import "./cave.css";

type Props = {
  close(): void;
  SheetHead: ComponentType<{ icon: IconName; title: ReactNode; close(): void }>;
  SitCard: ComponentType<{ s: SituationMeta; open: boolean; onClick(): void }>;
  SitActions: ComponentType<{ s: SituationMeta; close(): void }>;
};

const landmarks = ["gruta", "old-stone-ring"];
const locs = Object.values(LOCATIONS).filter((l) => l.id === "pool-hall" || landmarks.includes(l.id) ||
  (l.kind !== "phone" && ROUTE.some((s) => s.location === l.id)));

function locationPoint(loc: string): { x: number; z: number } | null {
  if (loc === "airport") return { x: AIRPORT_EXIT.x + 12, z: AIRPORT_EXIT.z };
  if (loc === "gruta") return COVE_DOORS.main;
  if (loc === "old-stone-ring") return RING_TARGET;
  const d = game?.doors.find((dd) => dd.loc === loc);
  if (d) return d;
  const s = SITUATIONS.find((x) => x.location === loc);
  return (s && OUTDOOR_NPCS.find((n) => n.npc === s.npc)) || null;
}

function walkLabel() {
  return <><Icon name="walk" size={17} /> Nuvesk mane</>;
}

export default function MapPanel({ close, SheetHead, SitCard, SitActions }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [town, setTown] = useState(false);
  const progress = useStore((s) => s.progress);
  const mm = useStore((s) => s.hud.minimap);
  const cave = !town && game?.caveMapBounds;
  const island = game?.guideToLighthouse ? LIGHTHOUSE_ISLAND : undefined;
  const bounds = cave || {
    ...WORLD, minX: game?.townMapWest ?? WORLD.minX, minZ: island ? WORLD.minZ : SEA_Z - 2,
  };
  const { minX: west, minZ: north } = bounds;
  const W = bounds.maxX - west, D = bounds.maxZ - north;
  const region = cave ? "gruta" : game?.townMapWest !== undefined ? "slate-cove" : undefined;
  const gates = cave ? mm.gates : undefined;

  useEffect(() => {
    const ground = game?.groundCanvas, c = ref.current;
    if (!ground || !c) return;
    const ppm = cave ? 3 : ground.width / (WORLD.maxX - WORLD.minX), sea = (SEA_Z - 2 - north) * ppm;
    c.width = Math.round(W * ppm); c.height = Math.round(D * ppm);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (cave) { game?.drawRegionMap?.(ctx, west, north, ppm); return; }
    ctx.fillStyle = "#3f8fb5";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#86b866";
    ctx.fillRect(0, (SEA_Z + 1 - north) * ppm, (WORLD.minX - west) * ppm, c.height);
    ctx.drawImage(ground, (WORLD.minX - west) * ppm, sea);
    game?.drawRegionMap?.(ctx, west, north, ppm, true);
    if (island) drawIslandMap(ctx, island, west, north, ppm);
  }, [D, W, cave, gates, island, north, west]);

  const pct = (x: number, z: number) => mapPosition(bounds, x, z);
  const selSits = sel ? SITUATIONS.filter((s) => s.location === sel && !(game?.light && isTownQuest(s.id))) : [];
  function guide(loc: string, walk = false) {
    close();
    game?.guideToPlace?.(loc);
    if (walk) game?.autoWalkToObjective("cave");
  }
  return <div className="sheet">
    <SheetHead icon="map" title={cave ? LOCATIONS.gruta.name : "Maple Harbor"} close={close} />
    <div className="sheet-body">
      <div className="town-lt" lang="lt">{cave ? LOCATIONS.gruta.lt : TOWN_LT}</div>
      {mm.zone === "gruta" && <div className="cave-landmarks">
        <button type="button" className="btn ghost small" onClick={() => { setSel(null); setTown(!town); }}>
          {(town ? CAVE_COPY.map.interior : CAVE_COPY.map.exterior).lt}
        </button>
      </div>}
      <div className="map-wrap">
        <div>
          <div className={"map-canvas" + (cave ? " cave-atlas" : "")} style={{ aspectRatio: W / D }}>
            <canvas ref={ref} data-map={region} data-gates={gates} />
            {(cave || mm.zone === "town") && <div className="map-me" style={pct(mm.px, mm.pz)} title="Tu esi čia" />}
            {cave && mm.questX != null && mm.questZ != null && <div className="map-waypoint" style={pct(mm.questX, mm.questZ)} title={CAVE_COPY.guide.cave.lt} />}
            {cave && mm.exitX != null && mm.exitZ != null && <div className="map-waypoint town" style={pct(mm.exitX, mm.exitZ)} title={CAVE_COPY.guide.town.lt} />}
            {!cave && island && <button className={"map-pin map-place-label" + (sel === "lighthouse" ? " sel" : "")}
              style={pct(island.center.x, island.center.z)} aria-pressed={sel === "lighthouse"} onClick={() => setSel("lighthouse")}>
              <span>{island.name} <span lang="lt">· {island.lt}</span></span>
            </button>}
            {!cave && locs.map((loc) => {
              const p = locationPoint(loc.id);
              if (!p) return null;
              const sits = SITUATIONS.filter((s) => s.location === loc.id && !isTownQuest(s.id));
              const allDone = sits.length > 0 && sits.every((s) => sitProgress(progress, s.id).completions > 0);
              return <button key={loc.id} className={"map-pin" + (sel === loc.id ? " sel" : "") + (allDone ? " done" : "")}
                style={pct(p.x, p.z)} onClick={() => setSel(loc.id)} title={loc.name} aria-label={loc.name} aria-pressed={sel === loc.id}>
                <Icon name={locIcon(loc.id)} size={18} />
                {allDone && <span className="pin-done"><Icon name="check" size={11} strokeWidth={3} label="įveikta" /></span>}
              </button>;
            })}
          </div>
          {!cave && game?.guideToPlace && <div className="cave-landmarks">
            {landmarks.map((id) => <button key={id} type="button" className="btn ghost small" aria-pressed={sel === id}
              aria-label={(id === "gruta" ? CAVE_COPY.map.entrancePin : CAVE_COPY.map.ringPin).en}
              onClick={() => setSel(id)}><span lang="en">{LOCATIONS[id].name}</span></button>)}
          </div>}
        </div>
        <div>
          {cave ? <div className="cave-landmarks">
            <button type="button" className="btn soft small" data-guide="cave" onClick={() => guide("gruta")}>{CAVE_COPY.guide.cave.lt}</button>
            <button type="button" className="btn soft small" data-guide="objective" onClick={() => { close(); game?.autoWalkToObjective("objective"); }}>{walkLabel()}</button>
          </div> : <>
            {!sel && <div className="info-box">Pasirink vietą žemėlapyje. Geltonas taškas – tavo užduotis, raudonas – tu.<br /><br /><InlineIcon name="smartphone" /> Kai kurios užduotys atliekamos telefonu (P).</div>}
            {island && sel === "lighthouse" && <div>
              <h3 className="place-title">{island.name}</h3>
              <div lang="lt" style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{island.lt}</div>
              <button className="btn soft small" onClick={() => { close(); game?.guideToLighthouse?.(); }}>{walkLabel()}</button>
            </div>}
            {sel && LOCATIONS[sel] && <div>
              <h3 className="place-title" lang="en"><span className="place-ico"><Icon name={locIcon(sel)} size={22} /></span>{LOCATIONS[sel].name}</h3>
              <div lang="lt" style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{placeLt(sel)}</div>
              {sel === "pool-hall" && <p>Biliardo salė – partija su Tina</p>}
              {landmarks.includes(sel) && <button type="button" className="btn soft" onClick={() => guide(sel, true)}>{walkLabel()}</button>}
              <div className="sit-list">
                {selSits.map((s) => <div key={s.id}>
                  <SitCard s={s} open onClick={() => {}} />
                  <div style={{ padding: "6px 4px" }}>
                    <div style={{ color: "var(--ink-soft)", fontSize: "0.9em" }}>{s.goal}</div>
                    <SitActions s={s} close={close} />
                  </div>
                </div>)}
                {!selSits.length && !landmarks.includes(sel) && <div className="info-box">Čia kol kas nėra užduočių.</div>}
              </div>
            </div>}
          </>}
        </div>
      </div>
    </div>
  </div>;
}
