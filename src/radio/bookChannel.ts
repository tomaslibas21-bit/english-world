import type { createBookSource } from "./books";
import { TalkPlayer, type TalkOutput } from "./talkPlayer";
import { TalkProgress } from "./talkProgress";

export type BookSource = ReturnType<typeof createBookSource>;

export function createBookChannel(source: BookSource, output: TalkOutput) {
  const progress = new TalkProgress(source.profile);
  const player = new TalkPlayer({
    progress, output, load: source.load,
    clock: { now: Date.now, setTimeout(callback, delay) {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    } },
  });
  return { source, progress, player, output };
}

export type BookChannel = ReturnType<typeof createBookChannel>;
