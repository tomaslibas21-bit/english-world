import type { createBookSource } from "./books";
import { loadSceneProgram } from "./sceneProgram";
import { TalkPlayer, type TalkOutput } from "./talkPlayer";
import { TalkProgress } from "./talkProgress";

export type BookSource = ReturnType<typeof createBookSource>;

export function createTalkChannel(source: BookSource | null, output: TalkOutput, sceneOutput?: TalkOutput) {
  const progress = new TalkProgress(source?.profile ?? "em-lt");
  const player = new TalkPlayer({
    progress, output, sceneOutput,
    load: async (selection, signal, fresh) => {
      if (sceneOutput && selection.itemKey.startsWith("scene/")) return loadSceneProgram(selection, signal, fresh, progress);
      if (!source) throw { kind: "missing" };
      return source.load(selection, signal);
    },
    clock: { now: Date.now, setTimeout(callback, delay) {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    } },
  });
  return { progress, player, output, sceneOutput };
}

export function createBookChannel(source: BookSource, output: TalkOutput) {
  return { source, ...createTalkChannel(source, output) };
}

export type TalkChannel = ReturnType<typeof createTalkChannel>;
export type BookChannel = ReturnType<typeof createBookChannel>;
