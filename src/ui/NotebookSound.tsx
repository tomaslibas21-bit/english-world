import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { audio } from "../game/audio";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import { notebookClips, type NotebookLine } from "./notebookAudio";

/** Mounted only for the current detail or revealed review answer. Focus never plays a clip. */
export function NotebookSound({ line }: { line: NotebookLine }) {
  const gender = useStore((s) => s.progress.profile?.gender);
  const [ready, setReady] = useState(audio.ready);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState("");
  const playback = useRef<AbortController | null>(null);
  useEffect(() => {
    let current = true;
    void audio.init(attempt > 0).then(() => { if (current) setReady(audio.ready); });
    return () => { current = false; };
  }, [attempt]);
  useLayoutEffect(() => {
    const stop = () => { playback.current?.abort(); playback.current = null; };
    const onHide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", stop);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", stop);
    };
  }, [line.en, line.sentence.say, line.sentence.en, line.speakerId, gender]);
  const clips = ready ? notebookClips(line, gender, (v, s, t) => audio.hasClip(v, s, t)) : [];
  const play = async (clip: typeof clips[number]) => {
    playback.current?.abort();
    const request = new AbortController();
    playback.current = request;
    setFailed("");
    try {
      const ok = await audio.play(clip.voice, clip.speed, clip.text, {
        recordingOnly: true, optional: true, signal: request.signal,
      });
      if (!ok && !request.signal.aborted) setFailed(clip.kind);
    } catch {
      if (!request.signal.aborted) setFailed(clip.kind);
    } finally {
      if (playback.current === request) playback.current = null;
    }
  };
  return <div className="nb-sound">
    {(!clips.length || failed) && <span role="status">Garso įrašas nepasiekiamas</span>}
    {!ready && <button onClick={() => setAttempt((n) => n + 1)}>Bandyti dar kartą</button>}
    {clips.map((clip) => {
      const label = clip.kind === "phrase" ? "Klausytis frazės" : "Klausytis viso sakinio";
      return <button key={clip.kind} onClick={() => void play(clip)}>
        <Icon name="speaker" size={18} />{failed === clip.kind ? `Bandyti dar kartą · ${label}` : label}
      </button>;
    })}
  </div>;
}
