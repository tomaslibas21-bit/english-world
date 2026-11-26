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

/** Keeps library dialogs and focus in step with the room and the current chair. */
export function bindLibraryBookFM(game: GameApi, radio: Radio, host: LibraryBookHost) {
  if (!radio.books || game.light) return () => {};
  const previousShelf = game.onLibraryShelf, previousReader = game.onLibraryReader;
  let disposed = false, owned = false, openedChair: number | null = null;
  let lastChair = game.libraryChair ?? null, focusScheduled = false;
  let pendingFocus: "stand" | "world" | null = null;
  const scheduleFocus = () => {
    if (focusScheduled || !pendingFocus || !host.canFocus()) return;
    focusScheduled = true;
    host.defer(() => {
      focusScheduled = false;
      if (disposed || !pendingFocus || radio.store.getState().open || !host.canFocus()) return;
      const stand = pendingFocus === "stand" && host.zone() === "library" && game.libraryChair != null;
      pendingFocus = null;
      if (stand) host.focusStand(); else host.focusWorld();
    });
  };
  const focus = (target: "stand" | "world") => {
    pendingFocus = target;
    scheduleFocus();
  };
  const open = (view: "shelf" | "reader", chair: number | null, bookId?: string) => {
    if (disposed || host.zone() !== "library" || (view === "reader" && game.libraryChair !== chair)) return;
    pendingFocus = null;
    owned = true; openedChair = chair;
    if (!(view === "shelf" ? radio.openLibraryShelf(bookId) : radio.openLibraryReader())) owned = false;
  };
  const shelf = (bookId?: string) => open("shelf", game.libraryChair ?? null, bookId);
  const reader = (chair: number) => open("reader", chair);
  game.onLibraryShelf = shelf;
  game.onLibraryReader = reader;
  const stopRadio = radio.store.subscribe((state, before) => {
    if (disposed) return;
    if (owned && before.library && !state.library) {
      owned = false;
      focus(game.libraryChair != null && host.zone() === "library" ? "stand" : "world");
    }
    if (state.open && !state.library) pendingFocus = null;
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
    else scheduleFocus();
  });
  return () => {
    disposed = true; pendingFocus = null;
    stopRadio(); stopWorld();
    if (owned && radio.store.getState().library) radio.setOpen(false);
    if (game.onLibraryShelf === shelf) game.onLibraryShelf = previousShelf;
    if (game.onLibraryReader === reader) game.onLibraryReader = previousReader;
  };
}
