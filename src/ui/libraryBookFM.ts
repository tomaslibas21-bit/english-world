import type { GameApi } from "../game/gameRef";
import type { Radio } from "../radio/radio";

export interface LibraryBookHost {
  zone(): string;
  subscribe(update: () => void): () => void;
  defer(action: () => void): void;
  canFocus(): boolean;
  focusStand(): void;
  focusWorld(): void;
}

/** A view handoff to the existing Book FM channel. No player, output, bookmark or audio intent lives here. */
export function bindLibraryBookFM(game: GameApi, radio: Radio, host: LibraryBookHost) {
  if (!radio.books || game.light) return () => {};
  const previousShelf = game.onLibraryShelf, previousReader = game.onLibraryReader;
  let disposed = false, owned = false, openedChair: number | null = null;
  let lastChair = game.libraryChair ?? null, version = 0;
  let pendingFocus: "stand" | "world" | null = null;
  const focus = (target: "stand" | "world") => {
    pendingFocus = target;
    const request = ++version;
    host.defer(() => {
      if (disposed || request !== version || !pendingFocus || radio.store.getState().open || !host.canFocus()) return;
      const stand = pendingFocus === "stand" && host.zone() === "library" && game.libraryChair != null;
      pendingFocus = null;
      if (stand) host.focusStand(); else host.focusWorld();
    });
  };
  const open = (view: "shelf" | "reader", chair = game.libraryChair ?? null) => {
    if (disposed || host.zone() !== "library" || (view === "reader" && game.libraryChair !== chair)) return;
    pendingFocus = null; version++;
    owned = true; openedChair = chair;
    if (!(view === "shelf" ? radio.openLibraryShelf() : radio.openLibraryReader())) owned = false;
  };
  const shelf = () => open("shelf");
  const reader = (chair: number) => open("reader", chair);
  game.onLibraryShelf = shelf;
  game.onLibraryReader = reader;
  const stopRadio = radio.store.subscribe((state, before) => {
    if (disposed) return;
    if (owned && before.libraryOpen && !state.libraryOpen) {
      owned = false;
      focus(game.libraryChair != null && host.zone() === "library" ? "stand" : "world");
    }
    if (state.open && !state.libraryOpen) { pendingFocus = null; version++; }
  });
  const stopWorld = host.subscribe(() => {
    if (disposed) return;
    const chair = game.libraryChair ?? null, stood = lastChair !== null && lastChair !== chair;
    lastChair = chair;
    if (owned && (host.zone() !== "library" || (openedChair !== null && openedChair !== chair))) {
      owned = false;
      radio.setOpen(false);
      focus("world");
    } else if (stood) focus("world");
    else if (pendingFocus) focus(pendingFocus);
  });
  return () => {
    disposed = true; version++; pendingFocus = null;
    stopRadio(); stopWorld();
    if (owned && radio.store.getState().libraryOpen) radio.setOpen(false);
    if (game.onLibraryShelf === shelf) game.onLibraryShelf = previousShelf;
    if (game.onLibraryReader === reader) game.onLibraryReader = previousReader;
  };
}
