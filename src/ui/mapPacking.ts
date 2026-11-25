export type MapPoint = { x: number; y: number };
export type MapPlacePoint = MapPoint & { id: string; reserved?: boolean; minSize?: number };
type SizedPoint = MapPoint & { size: number };
type MapPin<T> = SizedPoint & { members: T[]; reserved?: boolean };

/** Pack square hit boxes, keeping isolated points in place and giving the named landmarks priority. */
export function packMapPlaces<T extends MapPlacePoint>(places: readonly T[], width: number, height: number, size: number) {
  if (width < size || height < size) return [];
  // Leave a fraction of a pixel for layout rounding at fractional canvas widths.
  const spacing = size + 4.03125;
  const clamp = (value: number, extent: number, half: number) => Math.max(half, Math.min(extent - half, value));
  const center = ({ x, y }: MapPoint, pinSize = size): SizedPoint => ({
    x: clamp(x, width, pinSize / 2), y: clamp(y, height, pinSize / 2), size: pinSize,
  });
  const overlaps = (a: SizedPoint, b: SizedPoint) => {
    const gap = (a.size + b.size) / 2 + 4.03125;
    return Math.abs(a.x - b.x) < gap && Math.abs(a.y - b.y) < gap;
  };
  const distance = (a: MapPoint, b: MapPoint) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const pins: MapPin<T>[] = [];

  // A nearest free box can sit against an occupied box's edge on either axis.
  const nearestFree = (point: SizedPoint) => {
    const half = point.size / 2;
    const xs = [point.x, half, width - half];
    const ys = [point.y, half, height - half];
    for (const pin of pins) {
      const step = (pin.size + point.size) / 2 + 4.0625;
      xs.push(pin.x - step, pin.x + step);
      ys.push(pin.y - step, pin.y + step);
    }
    let best: SizedPoint | undefined;
    let score = Infinity;
    for (const x of xs) for (const y of ys) {
      if (x < half || x > width - half || y < half || y > height - half) continue;
      const candidate = { x, y, size: point.size };
      const d = distance(point, candidate);
      if (d >= score || pins.some((pin) => overlaps(pin, candidate))) continue;
      best = candidate;
      score = d;
    }
    return best;
  };

  for (const place of places) {
    if (!place.reserved) continue;
    const pinSize = Math.min(width, height, Math.max(size, place.minSize ?? size));
    const point = center(place, pinSize);
    const at = pins.some((pin) => overlaps(point, pin)) ? nearestFree(point) : point;
    if (at) pins.push({ ...at, members: [place], reserved: true });
  }

  const cells = new Map<string, T[]>();
  for (const place of places) {
    if (place.reserved) continue;
    const { x, y } = center(place);
    const key = size <= 32 ? place.id : `${Math.floor((x - width / 2) / spacing)},${Math.floor((y - height / 2) / spacing)}`;
    const cell = cells.get(key);
    if (cell) cell.push(place);
    else cells.set(key, [place]);
  }

  const candidates = [...cells.values()].map((members) => ({
    ...center({
      x: members.reduce((sum, p) => sum + p.x, 0) / members.length,
      y: members.reduce((sum, p) => sum + p.y, 0) / members.length,
    }),
    members,
  }));
  // Isolated places have first use of their own point before nearby groups can move.
  const crowded = new Set(candidates.filter((a) => pins.some((b) => overlaps(a, b))
    || candidates.some((b) => a !== b && overlaps(a, b))));
  candidates.sort((a, b) => Number(crowded.has(a)) - Number(crowded.has(b)));
  const maxShift = size <= 32 ? 8 : 18;
  for (const point of candidates) {
    const { members } = point;
    const collisions = pins.filter((pin) => overlaps(point, pin));
    if (!collisions.length) {
      pins.push(point);
      continue;
    }
    const closestGroup = (nearby: MapPin<T>[]) => nearby.filter((pin) => !pin.reserved)
      .sort((a, b) => distance(point, a) - distance(point, b))[0];
    const group = closestGroup(collisions);
    // Clear adjacent cells with a short move when there's room, or combine their places.
    const free = nearestFree(point);
    if (free && (!group || distance(point, free) <= maxShift ** 2 || group.members.length + members.length > 5)) {
      pins.push({ ...free, members });
    } else {
      (group ?? closestGroup(pins))?.members.push(...members);
    }
  }
  const order = new Map(places.map((p, i) => [p, i]));
  for (const pin of pins) pin.members.sort((a, b) => order.get(a)! - order.get(b)!);
  return pins;
}

export function mapPinForPlace<T extends MapPin<MapPlacePoint>>(pins: readonly T[], id: string | null) {
  return id === null ? undefined : pins.find((pin) => pin.members.some((place) => place.id === id));
}
