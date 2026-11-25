import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import type { LOCATIONS, placeLt } from "../content/locations";
import type { ROUTE } from "../content/route";
import type { SITUATIONS as CATALOG } from "../content/situations/catalog";
import type { isTownQuest } from "../content/townQuests";
import type { SituationMeta } from "../content/types";
import type { preferredCaveEntry } from "../game/cave/groundsPlan";
import type { GameApi } from "../game/gameRef";
import type { AIRPORT_EXIT, OUTDOOR_NPCS } from "../game/world/layout";
import type { Door } from "../game/world/town";
import { GYM_ENTRY } from "../content/gym-entry";
import { useStore } from "../state/store";
import { HL, L, TL } from "./i18n";
import type { Icon, InlineIcon } from "./icons";
import { mapPinForPlace, packMapPlaces, type MapPoint } from "./mapPacking";
import type { isPhone, locIcon } from "./objective";
import type { SitIcon } from "./SitIcon";
import type { drawTownMap, groundBounds, mapPoint, townBounds } from "./worldMap";
import "./MapPlaces.css";

type WorldPoint = { x: number; z: number };
type Bounds = { width: number; height: number; size: number };

export type MapContent = {
  locations: typeof LOCATIONS;
  route: typeof ROUTE;
  cenoteTour?: SituationMeta;
  catalog: typeof CATALOG;
  outdoor: typeof OUTDOOR_NPCS;
  airport: typeof AIRPORT_EXIT;
  caveZone: string;
  caveEntry: typeof preferredCaveEntry;
  isTownQuest: typeof isTownQuest;
  isPhone: typeof isPhone;
  townBounds: typeof townBounds;
  mapPoint: typeof mapPoint;
};

function project({ x, z }: WorldPoint, { mapPoint, townBounds }: MapContent): MapPoint {
  const [u, v] = mapPoint(townBounds, x, z);
  return { x: u, y: v };
}

function position({ x, y }: MapPoint) {
  return { left: `${x * 100}%`, top: `${y * 100}%` };
}

function locationPoint(loc: string, doors: readonly Pick<Door, "loc" | "x" | "z">[] | undefined,
  { caveZone, caveEntry, airport, route, outdoor }: MapContent): WorldPoint | null {
  if (loc === caveZone) return caveEntry() ?? null;
  if (loc === "airport") return { x: airport.x + 12, z: airport.z };
  const door = doors?.find((d) => d.loc === loc);
  if (door) return door;
  const sit = route.find((s) => s.location === loc);
  return outdoor.find((n) => n.npc === sit?.npc) ?? null;
}

export function resolveMapPlaces(doors: Parameters<typeof locationPoint>[1], light: boolean, data: MapContent) {
  const { locations, route, catalog, caveZone, cenoteTour, isPhone, isTownQuest } = data;
  return Object.values(locations).flatMap((loc) => {
    if (loc.kind === "phone") return [];
    const { id } = loc;
    const source = id === caveZone || id === "pool-hall" ? catalog : route;
    const sits = source.filter((s) => s.location === id && !isPhone(s) && (
      id === caveZone ? s.npc === "alux_kin" || s.npc === "alux_nikte" : !light || !isTownQuest(s.id)
    ));
    const point = sits.length && locationPoint(id, doors, data);
    if (!point) return [];
    const tour = id === cenoteTour?.location ? cenoteTour : undefined;
    const reserved = id === "airport" || id === caveZone || id === "pool-hall" || !!tour;
    return [{ ...loc, ...project(point, data), sits, reserved, tour }];
  });
}

function reveal(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true });
  el?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Let the map marks show through the cream face while keeping the whole square clickable. */
export function pinFace(pin: MapPoint, bounds: Bounds, marks: (MapPoint | null | undefined)[]) {
  const half = bounds.size / 2;
  const nearby = marks.flatMap((mark, i) => {
    if (!mark) return [];
    const radius = [12, 9, 16][i];
    const x = mark.x * bounds.width - pin.x;
    const y = mark.y * bounds.height - pin.y;
    if (Math.abs(x) > half + radius || Math.abs(y) > half + radius) return [];
    return [{ x: x + half, y: y + half, radius }];
  });
  if (!nearby.length) return;
  // Move the icon or count away from the marks. The face and hit box keep their full size.
  const inset = 8, far = bounds.size - inset;
  let glyphX = inset, glyphY = inset, clearance = -Infinity;
  for (const [x, y] of [[inset, inset], [inset, far], [far, far]]) {
    const distance = Math.min(...nearby.map((mark) => Math.hypot(x - mark.x, y - mark.y) - mark.radius));
    if (distance > clearance) { glyphX = x; glyphY = y; clearance = distance; }
  }
  return {
    "--glyph-x": `${glyphX}px`,
    "--glyph-y": `${glyphY}px`,
    "--pin-mask": nearby.map(({ x, y, radius }) =>
      `radial-gradient(circle at ${x}px ${y}px, transparent ${radius}px, black ${radius + 0.5}px)`).join(", "),
  };
}

type Actions = { s: SituationMeta; close: () => void };

type MapPlacesProps = {
  close: () => void;
  town: GameApi | null;
  townName: string;
  data: MapContent;
  groundBounds: typeof groundBounds;
  drawTownMap: typeof drawTownMap;
  Icon: typeof Icon;
  InlineIcon: typeof InlineIcon;
  SitIcon: typeof SitIcon;
  locIcon: typeof locIcon;
  placeLt: typeof placeLt;
  SitCard: ComponentType<{ s: SituationMeta; open: boolean; onClick: () => void }>;
  SitActions: ComponentType<Actions>;
};

export function resolveMapObjective(town: Pick<GameApi, "objectiveTarget" | "currentObjective"> | null,
  zone: string, followUp: string | undefined, doors: Parameters<typeof locationPoint>[1], data: MapContent) {
  // The minimap can follow Queta's detour or an underground leg. Resolve the saved task for the town.
  const target = town?.objectiveTarget?.("objective", true);
  if (!target) return null;
  const loc = followUp ?? town?.currentObjective()?.location;
  const point = zone !== "town" && loc && data.locations[loc]?.kind === "interior" ? locationPoint(loc, doors, data) : target;
  return point && project(point, data);
}

export default function MapPlaces({ close, town, townName, data, groundBounds, drawTownMap, SitCard, SitActions,
  Icon, InlineIcon, SitIcon, locIcon, placeLt }: MapPlacesProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [openPlace, setOpenPlace] = useState<string | null>(null);
  const prefix = useId();
  const pendingFocus = useRef<"members" | "details" | null>(null);
  const lastFocus = useRef<{ el: HTMLElement; place: string } | null>(null);
  const { townBounds, caveZone, isTownQuest } = data;
  const townWidth = townBounds.maxX - townBounds.minX, townDepth = townBounds.maxZ - townBounds.minZ;
  const light = !!town?.light;
  const doors = light ? undefined : town?.doors;
  const touch = useStore((s) => s.hud.showTouch);
  const sits = useStore((s) => s.progress.sits);
  const savedTask = useStore((s) => s.progress.objective);
  const hudTask = useStore((s) => s.hud.objective?.sitId);
  const followUp = useStore((s) => s.hud.objective?.targetLoc);
  const zone = useStore((s) => s.hud.minimap.zone);
  const playerX = useStore((s) => s.hud.minimap.zone === "town" ? s.hud.minimap.px : null);
  const playerZ = useStore((s) => s.hud.minimap.zone === "town" ? s.hud.minimap.pz : null);

  useLayoutEffect(() => {
    const ground = town?.groundCanvas, c = canvas.current;
    if (!ground || !c) return;
    const ppm = ground.width / (groundBounds.maxX - groundBounds.minX);
    c.width = Math.round(townWidth * ppm);
    c.height = Math.round(townDepth * ppm);
    c.dataset.map = drawTownMap(c, ground, townBounds) ? "cenote" : "town";
  }, [town, drawTownMap, groundBounds, townBounds, townWidth, townDepth]);

  useLayoutEffect(() => {
    const c = canvas.current!;
    const media = matchMedia("(any-pointer: coarse)");
    const size = () => touch || media.matches ? 44 : 30;
    const measure = (width: number, height: number) => {
      const pin = size();
      setBounds((old) => old?.width === width && old.height === height && old.size === pin ? old : { width, height, size: pin });
    };
    const observer = new ResizeObserver(([{ contentRect }]) => measure(contentRect.width, contentRect.height));
    const onMedia = () => setBounds((old) => old && old.size !== size() ? { ...old, size: size() } : old);
    observer.observe(c);
    media.addEventListener("change", onMedia);
    return () => { observer.disconnect(); media.removeEventListener("change", onMedia); };
  }, [touch]);

  const places = useMemo(() => resolveMapPlaces(doors, light, data), [doors, light, data]);
  const completed = useMemo(() => new Set(places.filter(({ sits: atPlace }) => {
    const required = atPlace.filter((s) => !isTownQuest(s.id));
    return required.length > 0 && required.every((s) => (sits[s.id]?.completions ?? 0) > 0);
  }).map(({ id }) => id)), [places, sits, isTownQuest]);
  const pins = useMemo(() => {
    if (!bounds) return [];
    const { width, height, size } = bounds;
    return packMapPlaces(places.map((p) => ({
      id: p.id, place: p, reserved: p.reserved, minSize: p.tour ? 44 : undefined, x: p.x * width, y: p.y * height,
    })), width, height, size)
      .map((pin) => ({ ...pin, key: pin.members.map(({ id }) => id).join(":") }));
  }, [bounds, places]);

  const objective = useMemo(() => resolveMapObjective(town, zone, followUp, doors, data),
    [town, doors, zone, followUp, hudTask, savedTask, sits, data]);
  const player = playerX === null || playerZ === null ? null : project({ x: playerX, z: playerZ }, data);
  const chosen = places.find(({ id }) => id === selected);
  const chosenPin = mapPinForPlace(pins, selected);
  const openPin = mapPinForPlace(pins, openPlace);
  const active = openPin && openPin.members.length > 1 ? openPin : undefined;
  const selectedPoint = chosen && chosenPin && bounds && (chosenPin.members.length > 1 ||
    chosen.x * bounds.width !== chosenPin.x || chosen.y * bounds.height !== chosenPin.y) ? chosen : null;
  const pinId = (key: string) => `${prefix}-pin-${key}`;
  const listId = (key: string) => `${prefix}-places-${key}`;
  const doneId = `${prefix}-completed`;
  const select = (id: string) => {
    if (id === selected) reveal(title.current);
    else pendingFocus.current = "details";
    setSelected(id);
  };

  useLayoutEffect(() => {
    const order = pendingFocus.current;
    pendingFocus.current = null;
    if (order === "details") reveal(title.current);
    else if (order === "members" && active) {
      reveal(document.getElementById(listId(active.key))?.querySelector("button"));
    } else {
      const focus = lastFocus.current;
      if (!focus || focus.el.isConnected || document.activeElement !== document.body) return;
      const successor = mapPinForPlace(pins, focus.place);
      reveal(successor ? document.getElementById(pinId(successor.key))
        : canvas.current?.closest(".map-sheet")?.querySelector(".close-x"));
    }
  });

  const check = <Icon name="check" size={13} strokeWidth={3} />;
  return (
    <div className="sheet-body">
      <div className="town-lt" lang={HL}>{townName}</div>
      <div className="map-wrap" data-show-return={selected || openPlace || undefined} style={{ "--map-aspect": townWidth / townDepth } as CSSProperties}>
        <span id={doneId} lang={HL} hidden>{L("įveikta")}</span>
        <div className="map-canvas">
          <canvas ref={canvas} aria-hidden />
          {player && <div className="map-me" style={position(player)} title={L("Tu esi čia")} aria-hidden />}
          {objective && <div className="map-objective" style={position(objective)} aria-hidden />}
          {selectedPoint && <div className="map-selected-point" style={position(selectedPoint)} aria-hidden />}
          {bounds && pins.map((pin) => {
            const { place } = pin.members[0];
            const group = pin.members.length > 1;
            const name = group ? pin.members.map(({ place }) => place.name).join(", ") : place.name;
            const done = pin.members.every(({ id }) => completed.has(id));
            const selected = chosenPin === pin;
            const expanded = active === pin;
            const tour = place.tour;
            const face = pinFace(pin, { ...bounds, size: pin.size }, [player, objective, selectedPoint]);
            const dx = pin.x - place.x * bounds.width, dy = pin.y - place.y * bounds.height;
            return (
              <Fragment key={pin.key}>
                {tour && <span className="map-tour-marker" aria-hidden style={{
                  ...position(place), width: Math.hypot(dx, dy), rotate: `${Math.atan2(dy, dx)}rad`,
                }} />}
                <button id={pinId(pin.key)} type="button"
                  className={"map-pin" + (tour ? " taquilla" : "") + (selected ? " sel" : "") + (done ? " done" : "")}
                  data-place={group ? undefined : place.id} data-location={group ? undefined : place.id}
                  style={{ left: pin.x, top: pin.y, width: pin.size, height: pin.size, ...face }}
                  lang={TL} title={name} aria-label={name} aria-describedby={done ? doneId : undefined} aria-pressed={group ? undefined : selected}
                  aria-description={tour ? place.lt : undefined}
                  aria-expanded={group ? expanded : undefined} aria-controls={group ? listId(pin.key) : undefined}
                  onFocus={(e) => { lastFocus.current = { el: e.currentTarget, place: selected ? chosen!.id : place.id }; }}
                  onClick={() => {
                    if (group) {
                      if (!expanded) pendingFocus.current = "members";
                      setOpenPlace(expanded ? null : selected ? chosen!.id : place.id);
                    } else {
                      setOpenPlace(null);
                      select(place.id);
                    }
                  }}>
                  <span className="map-pin-face" aria-hidden />
                  <span className={"map-pin-icon" + (face ? " offset" : "")} aria-hidden>
                    {tour ? <SitIcon id={tour.id} size={18} /> : <Icon name={locIcon(place.id)} size={group && pin.size === 30 ? 13 : 18} />}
                    {group && <span className="map-pin-count">{pin.members.length}</span>}
                  </span>
                  {done && <span className="pin-done">{check}</span>}
                </button>
              </Fragment>
            );
          })}
        </div>
        <div className="map-details">
          {pins.filter((pin) => pin.members.length > 1).map((pin) =>
            <div key={pin.key} id={listId(pin.key)} className="map-member-list" role="group" aria-labelledby={pinId(pin.key)} hidden={pin !== active}>
              {pin === active && pin.members.map(({ id, place: { name, lt } }) =>
                <button key={id} type="button" className="map-member" data-place={id} aria-pressed={id === selected}
                  aria-label={name} lang={TL} aria-describedby={`${prefix}-learner-${id}${completed.has(id) ? ` ${doneId}` : ""}`}
                  onFocus={(e) => { lastFocus.current = { el: e.currentTarget, place: id }; }}
                  onClick={() => { setOpenPlace(id); select(id); }}>
                  <Icon name={locIcon(id)} size={20} />
                  <span><b>{name}</b><small id={`${prefix}-learner-${id}`} lang={HL}>{lt}</small></span>
                  {completed.has(id) && check}
                </button>)}
            </div>)}
          {!chosen && <div className="info-box">{L("Pasirink vietą žemėlapyje. Geltonas taškas – tavo užduotis, raudonas – tu.")}<br /><br /><InlineIcon name="smartphone" /> {L("Kai kurios užduotys atliekamos telefonu (P).")}</div>}
          {chosen && <>
            <h3 className="place-title" tabIndex={-1} ref={title} lang={TL}>
              <span className="place-ico"><Icon name={locIcon(chosen.id)} size={22} /></span>{chosen.name}
            </h3>
            <div className="map-place-learner" lang={HL}>{placeLt(chosen.id)}</div>
            {chosen.id === GYM_ENTRY.location && town?.light === false && <p>{GYM_ENTRY.mapLabel}</p>}
            <div className="sit-list">
              {chosen.id === caveZone && !light && zone !== caveZone && (
                <button className="btn soft small" onClick={() => { close(); town?.autoWalkToObjective("cave"); }}>
                  <Icon name="walk" size={17} /> {L("Nuvesk mane")}
                </button>
              )}
              {chosen.sits.map((s) => (
                <div key={s.id}>
                  <SitCard s={s} open onClick={() => {}} />
                  <div className="map-sit-detail"><div>{s.goal}</div><SitActions s={s} close={close} /></div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
