import { audio } from "../audio";
import { ActorTalk, type ActingTarget } from "../talkNatural/binding";

export function speakTownLine(target: ActingTarget | undefined, voice: string, female: boolean, text: string, seconds: number,
  signal?: AbortSignal, talk?: ActorTalk) {
  if (signal?.aborted) return;
  const voiced = !target || target.scope === "greeting" || audio.hasClip(voice, 1, text);
  const acting = target && (talk ?? new ActorTalk()).speak(target, text, text, seconds, voiced);
  if (voiced) {
    void audio.play(voice, 1, text, { male: !female, visual: acting?.owner,
      ...(signal ? { optional: true, recordingOnly: !!target, signal } : {}) })
      .then(() => { if (acting) acting.finished = true; });
  }
}
