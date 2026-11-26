import { create } from "zustand";
import type { KaraokeCatalogEntry } from "../../radio/songs";
import type { Station } from "../../radio/playlist";
import type { KaraokeSession } from "../../radio/karaokeSession";

interface KaraokeUi {
  phase: "closed" | "picker" | "stage";
  detail: string | null;
  selected: string | null;
  filter: string;
  scroll: number;
  loading: boolean;
  failed: boolean;
  take: KaraokeSession | null;
}

const empty: KaraokeUi = {
  phase: "closed", detail: null, selected: null, filter: "all", scroll: 0, loading: false, failed: false, take: null,
};
export const useKaraoke = create<KaraokeUi>(() => empty);
export function resetKaraokeUi() { useKaraoke.setState(empty); }

export function karaokeStations(entries: readonly KaraokeCatalogEntry[], stations: readonly Station[]) {
  return stations.filter((station) => !station.kind && entries.some(({ song }) => station.has(song)));
}

export function karaokeSongs(entries: readonly KaraokeCatalogEntry[], filter: string, stations: readonly Station[], favorites: readonly string[]) {
  if (filter === "all") return entries;
  if (filter === "favorites") {
    const liked = new Set(favorites);
    return entries.filter(({ song }) => liked.has(song.id));
  }
  const station = stations.find((station) => station.id === filter && !station.kind);
  return station ? entries.filter(({ song }) => station.has(song)) : [];
}
