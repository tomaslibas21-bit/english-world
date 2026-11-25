import { useId, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from "react";
import type { createPortal } from "react-dom";
import { LOCATIONS } from "../content/locations";
import type { SituationMeta } from "../content/types";
import { isTownQuest } from "../content/townQuests";
import { AIRPORT_EXIT, OUTDOOR_NPCS, WORLD } from "../game/world/layout";
import type { IslandPlan, IslandPoint } from "../game/world/island";
import type { Door } from "../game/world/town";
import type { Progress } from "../state/progress";
import { useStore } from "../state/store";
import type { Icon as PlaceIcon } from "./icons";
import { packMapPlaces, type MapPoint } from "./mapPacking";
import "./MapPlaces.css";

type PositionFor = (loc: string) => IslandPoint | null;
type Bounds = { width: number; height: number; size: number };

function project({ x, z }: IslandPoint, north: number): MapPoint {
  return { x: (x - WORLD.minX) / (WORLD.maxX - WORLD.minX), y: (z - north) / (WORLD.maxZ - north) };
}

function position({ x, y }: MapPoint) {
  return { left: `${x * 100}%`, top: `${y * 100}%` };
}

function PlayerDot({ north }: { north: number }) {
  const x = useStore((s) => s.hud.minimap.zone === "town" ? s.hud.minimap.px : undefined);
  const z = useStore((s) => s.hud.minimap.zone === "town" ? s.hud.minimap.pz : undefined);
  return x === undefined || z === undefined ? null
    : <div className="map-me" style={position(project({ x, z }, north))} title="Tu esi čia" />;
}

function outdoorObjective(sit: SituationMeta | undefined, targetLoc: string | undefined, doors: Door[] | undefined, positionFor: PositionFor) {
  // A follow-up with a physical destination takes precedence over its original call.
  const loc = targetLoc ?? (sit?.mode === "phone" || sit?.mode === "video" ? undefined : sit?.location);
  if (!loc || LOCATIONS[loc]?.kind === "phone") return null;
  if (loc === "airport") return AIRPORT_EXIT;
  const door = doors?.find((d) => d.loc === loc);
  if (door) return { x: door.outX, z: door.outZ };
  if (LOCATIONS[loc]?.kind !== "outdoor") return null;
  const person = !targetLoc && sit && OUTDOOR_NPCS.find((n) => n.npc === sit.npc);
  return person ? { x: person.ax ?? person.x, z: person.az ?? person.z } : positionFor(loc);
}

function reveal(el: HTMLElement | null) {
  el?.focus({ preventScroll: true });
  el?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Keep the gold diamond visible through a transparent part of the hit box. */
function faceOffset(pin: MapPoint, mark: MapPoint | null, { size, height }: Bounds) {
  if (!mark || Math.abs(mark.x - pin.x) > size / 2 + 8 || Math.abs(mark.y - pin.y) > size / 2 + 8) return;
  const above = mark.y - 20, below = mark.y + 20;
  const y = above >= 11 && (below > height - 11 || mark.y >= pin.y) ? above : below;
  return y - pin.y;
}

export default function MapPlaces({ canvas, island, north, positionFor, progress, selected, onSelect,
  route, situations, doors, landmark, Icon, MapPlaceIcon, portal }: {
  canvas: RefObject<HTMLCanvasElement | null>;
  island?: IslandPlan;
  north: number;
  positionFor: PositionFor;
  progress: Progress;
  selected: string | null;
  onSelect: (id: string) => void;
  route: readonly SituationMeta[];
  situations: readonly SituationMeta[];
  doors?: Door[];
  landmark: string;
  Icon: typeof PlaceIcon;
  MapPlaceIcon: ComponentType<{ loc: string; size: number }>;
  portal: typeof createPortal;
}) {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [openPlace, setOpenPlace] = useState<string | null>(null);
  const touch = useStore((s) => s.hud.showTouch);
  const objectiveId = useStore((s) => s.hud.objective?.sitId);
  const targetLoc = useStore((s) => s.hud.objective?.targetLoc);
  const prefix = useId();
  const pendingFocus = useRef<"members" | "details" | null>(null);
  const lastFocus = useRef<{ el: HTMLElement; place: string } | null>(null);

  useLayoutEffect(() => {
    const frame = canvas.current!.parentElement!;
    const media = matchMedia("(any-pointer: coarse), (max-width: 600px)");
    const pinSize = () => touch || media.matches ? 44 : 30;
    // The plane stays the same size when the details or list grow.
    const observer = new ResizeObserver(([{ contentRect: { width, height } }]) => {
      const size = pinSize();
      setBounds((old) => old?.width === width && old.height === height && old.size === size ? old : { width, height, size });
    });
    const onMedia = () => {
      const size = pinSize();
      setBounds((old) => old && old.size !== size ? { ...old, size } : old);
    };
    observer.observe(frame);
    media.addEventListener("change", onMedia);
    return () => { observer.disconnect(); media.removeEventListener("change", onMedia); };
  }, [canvas, touch]);

  const places = useMemo(() => {
    const points = Object.values(LOCATIONS).flatMap(({ id, kind, lt, name }) => {
      if (kind === "phone" || (id !== "pool-hall" && id !== landmark && !route.some((s) => s.location === id))) return [];
      const point = positionFor(id);
      return point ? [{ id, lt, name, reserved: id === "airport" || id === landmark, ...project(point, north) }] : [];
    });
    if (island) points.push({ id: "lighthouse", lt: island.lt, name: island.name, reserved: true, ...project(island.center, north) });
    return points;
  }, [north, island, positionFor, route, doors, landmark]);

  const completed = useMemo(() => {
    const names = new Set<string>();
    for (const { id } of places) {
      const sits = situations.filter((s) => s.location === id && !isTownQuest(s.id));
      if (sits.length && sits.every((s) => progress.sits[s.id]?.completions > 0)) names.add(id);
    }
    return names;
  }, [places, progress.sits, situations]);

  const pins = useMemo(() => {
    if (!bounds) return [];
    const { width, height, size } = bounds;
    return packMapPlaces(places.map((p) => ({ ...p, x: p.x * width, y: p.y * height })), width, height, size)
      .map((pin) => ({ ...pin, key: pin.members.map((p) => p.id).join("-") }));
  }, [bounds, places]);

  const objective = useMemo(() => {
    // The minimap can show the temporary directions route. The full map marks the task itself.
    const point = island && objectiveId === island.keeper.says ? island.keeper.approach
      : outdoorObjective(situations.find((s) => s.id === objectiveId), targetLoc, doors, positionFor);
    return point && project(point, north);
  }, [objectiveId, targetLoc, island, north, positionFor, doors, situations]);
  const active = pins.find((pin) => pin.members.length > 1 && pin.members.some((p) => p.id === openPlace));
  const details = () => canvas.current?.closest(".map-wrap")?.querySelector<HTMLElement>(".place-title") ?? null;
  const pinId = (key: string) => `${prefix}-pin-${key}`;
  const listId = (key: string) => `${prefix}-members-${key}`;
  const select = (id: string) => {
    if (id === selected) reveal(details());
    else pendingFocus.current = "details";
    onSelect(id);
  };

  useLayoutEffect(() => {
    const order = pendingFocus.current;
    pendingFocus.current = null;
    if (order === "details") reveal(details());
    else if (order === "members" && active) reveal(document.getElementById(listId(active.key))?.querySelector("button") ?? null);
    else {
      const focus = lastFocus.current;
      if (!focus || focus.el.isConnected || document.activeElement !== document.body) return;
      const successor = pins.find((pin) => pin.members.some((p) => p.id === focus.place));
      reveal(successor ? document.getElementById(pinId(successor.key))
        : canvas.current!.closest(".map-sheet")!.querySelector(".close-x"));
    }
  });

  if (!bounds) return null;
  const mark = objective && { x: objective.x * bounds.width, y: objective.y * bounds.height };
  const chosen = places.find((p) => p.id === selected);
  const chosenPin = pins.find((pin) => pin.members.some((p) => p.id === selected));
  const showPoint = chosen && chosenPin && (chosenPin.members.length > 1 || chosenPin.x !== chosen.x * bounds.width
    || chosenPin.y !== chosen.y * bounds.height || faceOffset(chosenPin, mark, bounds) !== undefined);
  const check = <span className="pin-done"><Icon name="check" size={11} strokeWidth={3} label="įveikta" /></span>;

  return <>
    {portal(<>
      <PlayerDot north={north} />
      {objective && <div className="map-objective" style={position(objective)} aria-hidden />}
      {pins.map((pin) => {
        const place = pin.members[0];
        const group = pin.members.length > 1;
        const lighthouse = place.id === "lighthouse";
      const done = pin.members.every((p) => completed.has(p.id));
        const name = group ? pin.members.map((p) => p.lt).join(", ") : lighthouse ? `${place.name} · ${place.lt}` : place.name;
        const selected = chosenPin === pin;
        const offset = faceOffset(pin, mark, bounds);
        const expanded = active === pin;
        return <button key={pin.key} id={pinId(pin.key)} type="button"
          className={"map-pin" + (selected ? " sel" : "") + (done ? " done" : "")}
          style={{ left: pin.x, top: pin.y, width: bounds.size, height: bounds.size,
            "--face-y": offset === undefined ? undefined : `${offset}px` } as CSSProperties}
          title={name} aria-label={name} aria-pressed={group ? undefined : selected}
          aria-expanded={group ? expanded : undefined} aria-controls={group ? listId(pin.key) : undefined}
          onFocus={(event) => { lastFocus.current = { el: event.currentTarget, place: selected ? chosen!.id : place.id }; }}
          onClick={() => {
            if (group) {
              if (!expanded) pendingFocus.current = "members";
              setOpenPlace(expanded ? null : selected ? chosen!.id : place.id);
            } else {
              setOpenPlace(null);
              select(place.id);
            }
          }}>
          <span className={"map-pin-face" + (offset === undefined ? "" : " clears-objective")}>
            <MapPlaceIcon loc={place.id} size={group && bounds.size === 30 ? 14 : 18} />
            {group && <span className="map-pin-count">{pin.members.length}</span>}
            {done && check}
            {lighthouse && <span className="map-place-label">{name}</span>}
          </span>
        </button>;
      })}
      {showPoint && <div className="map-selected-point" style={position(chosen)} aria-hidden />}
    </>, canvas.current!.parentElement!)}
    {pins.filter((pin) => pin.members.length > 1).map((pin) =>
      <div key={pin.key} id={listId(pin.key)} className="map-member-list" role="group" aria-labelledby={pinId(pin.key)} hidden={pin !== active}>
        {pin === active && pin.members.map(({ id, lt, name }) =>
          <button key={id} type="button" className="map-member" aria-pressed={id === selected}
            onFocus={(event) => { lastFocus.current = { el: event.currentTarget, place: id }; }}
            onClick={() => { setOpenPlace(id); select(id); }}>
            <MapPlaceIcon loc={id} size={20} />
            <span><b lang="lt">{lt}</b><small lang="en">{name}</small></span>
            {completed.has(id) && <Icon name="check" size={16} strokeWidth={3} label="įveikta" />}
          </button>)}
      </div>)}
  </>;
}
