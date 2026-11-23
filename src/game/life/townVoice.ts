import { variety } from "../../convo/compose";
import { EDITION } from "../../edition";
import { audio } from "../audio";
import type { GameCharacter } from "../characters";

export function speakTownLine(ch: GameCharacter | undefined, voice: string, female: boolean, text: string, seconds: number, signal?: AbortSignal) {
  const spanishLine = !!signal && EDITION.id === "es";
  if (audio.hasClip(voice, 1, text) || spanishLine) {
    const selected = variety();
    const fallbackLang = spanishLine ? (selected === "spain" ? "es-ES" : selected === "neutral" ? "es-419" : EDITION.target) : undefined;
    void audio.play(voice, 1, text, { male: !female, ...(signal ? { optional: true, recordingOnly: !spanishLine, fallbackLang, signal } : {}) });
    ch?.talk(audio.clipDuration(voice, 1, text) ?? seconds, () => audio.level(), () => audio.vowel());
  } else ch?.talk(seconds);
}
