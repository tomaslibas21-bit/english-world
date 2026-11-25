import { variety } from "../../convo/compose";
import { EDITION } from "../../edition";
import { audio } from "../audio";
import type { ActingTarget, ActorTalk } from "../talkNatural/binding";

export function speakTownLine(target: ActingTarget | undefined, voice: string, female: boolean, text: string, seconds: number,
  signal?: AbortSignal, talk?: ActorTalk, fallback = false) {
  if (signal?.aborted) return;
  const spanishLine = !!signal && EDITION.id === "es";
  const voiced = fallback || audio.hasClip(voice, 1, text) || spanishLine;
  const line = target && talk?.speak(target, text, text, audio.clipDuration(voice, 1, text) ?? seconds, voiced && audio.volume > 0);
  if (voiced) {
    const selected = variety();
    const fallbackLang = spanishLine ? (selected === "spain" ? "es-ES" : selected === "neutral" ? "es-419" : EDITION.target) : undefined;
    void audio.play(voice, 1, text, { male: !female, visual: line?.owner,
      ...(signal ? { optional: true, recordingOnly: !spanishLine, fallbackLang, signal } : {}) })
      .then(() => talk?.finish(line));
  }
}
