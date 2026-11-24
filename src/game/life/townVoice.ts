import { audio } from "../audio";
import type { GameCharacter } from "../characters";

export function speakTownLine(ch: GameCharacter | undefined, voice: string, female: boolean, text: string, seconds: number, signal?: AbortSignal) {
  if (!ch || audio.hasClip(voice, 1, text)) {
    void audio.play(voice, 1, text, { male: !female, ...(signal ? { optional: true, recordingOnly: !!ch, signal } : {}) });
    ch?.talk(audio.clipDuration(voice, 1, text) ?? seconds, () => audio.level(), () => audio.vowel());
  } else ch.talk(seconds);
}
