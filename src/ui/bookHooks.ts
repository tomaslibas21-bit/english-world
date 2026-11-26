import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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

export function useBookMedia(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    const media = matchMedia(query);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }, [query]);
  const snapshot = useCallback(() => matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
