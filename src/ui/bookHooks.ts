import { useEffect, useState, useSyncExternalStore } from "react";
import type { BookChannel } from "../radio/bookChannel";
import type { TalkSnapshot } from "../radio/talkPlayer";

export function useBookState<T>(channel: BookChannel, pick: (state: Readonly<TalkSnapshot>) => T): T {
  const snapshot = () => pick(channel.player.getSnapshot());
  return useSyncExternalStore(channel.player.subscribe, snapshot, snapshot);
}

export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}
