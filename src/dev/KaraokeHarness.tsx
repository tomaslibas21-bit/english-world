import { useEffect, useState } from "react";
import { usesBufferRecordings } from "../game/audio";
import { bindRadio, radio, useRadio } from "../radio";
import { SongCover } from "../ui/SongCover";

const street = () => {
  const { on, playing, held, needsTap, station, song, spot, shuffle, upNext, lyrics } = radio.store.getState();
  return {
    on, playing, held, needsTap, station, song: song?.id ?? null, spot: spot?.spot.id ?? null,
    seconds: spot ? radio.spotPosition() : radio.position(), shuffle, upNext: upNext?.id ?? null, lyrics,
  };
};

export function KaraokeHarness() {
  const state = useRadio((s) => s);
  const [id, setId] = useState("G01");
  const [offset, setOffset] = useState("6.27");
  const [before, setBefore] = useState<ReturnType<typeof street>>();
  const [after, setAfter] = useState<ReturnType<typeof street>>();
  const [, tick] = useState(0);
  const [voice, setVoice] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  useEffect(() => {
    bindRadio();
    const timer = setInterval(() => tick((n) => n + 1), 100);
    return () => { clearInterval(timer); radio.shutdown(); };
  }, []);
  const catalog = radio.karaokeCatalog();
  const entry = catalog.find((item) => item.song.id === id);
  const booth = state.karaoke;
  const take = booth?.store.getState();
  const start = () => {
    if (!booth) { setBefore(street()); setAfter(undefined); }
    void radio.openKaraoke()?.start(id);
  };
  return (
    <main style={{ maxWidth: 680, height: "100dvh", overflow: "auto", margin: "auto", padding: 18, color: "#252940" }}>
      <h1>Karaoke transport</h1>
      <p>{usesBufferRecordings() ? "Web Audio (iOS route)" : "HTML audio"} · Active outputs <output id="active-outputs">{Number(state.playing) + Number(take?.status === "playing")}</output></p>
      <section>
        <label>Song ID <input value={id} onChange={(e) => setId(e.target.value.trim().toUpperCase())} style={{ width: 80 }} /></label>
        {entry ? <p lang="en">{entry.song.id} · {entry.song.t} · {entry.song.tl}</p>
          : <p>{state.ready ? "Song ID unavailable" : "Configure VITE_RADIO_INDEX to load the catalog."}</p>}
        {entry && <SongCover entry={entry} />}
        <p>
          <button disabled={!entry} onClick={start}>Start song</button>{" "}
          <button disabled={!booth} onClick={() => booth?.pause()}>Pause</button>{" "}
          <button disabled={!booth} onClick={() => { void booth?.resume(); }}>Resume</button>{" "}
          <button disabled={!booth} onClick={() => { booth?.close(); setAfter(street()); }}>Go back</button>
        </p>
        <label>Seek seconds <input type="number" min="0" step="any" value={offset} onChange={(e) => setOffset(e.target.value)} style={{ width: 82 }} /></label>{" "}
        <button disabled={!take?.song || !offset} onClick={() => { void booth?.seek(Number(offset)); }}>Seek</button>
        {take?.issue && <p>{take.issue === "timing" ? "Timed lyrics are unavailable for this song." : "This song couldn’t play."}{" "}
          <button onClick={() => { void booth?.retry(); }}>Try again</button></p>}
      </section>
      <h2>Booth</h2>
      <output id="booth-state">{take?.status ?? "closed"} · {take?.song?.id ?? "—"} · {booth?.position().toFixed(3) ?? "—"} s · {take?.held ? "held" : "free"} · {take?.timeline?.lines.length ?? 0} timed rows</output>
      <h2>Street radio</h2>
      <button disabled={!!booth} onClick={() => radio.setOn(!state.on)}>{state.on ? "Turn radio off" : "Turn radio on"}</button>{" "}
      <button onClick={() => { if (voice) radio.release("voice"); else radio.hold("voice"); setVoice(!voice); }}>{voice ? "Release voice hold" : "Hold voice"}</button>{" "}
      <button onClick={() => { if (microphone) radio.release("microphone"); else radio.hold("microphone", true); setMicrophone(!microphone); }}>{microphone ? "Release microphone hold" : "Hold microphone"}</button>
      {[["Before", before], ["Current", street()], ["After", after]].map(([label, snapshot]) => (
        <div key={String(label)}><strong>{String(label)}</strong>
          <pre id={`street-${String(label).toLowerCase()}`} style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(snapshot ?? null)}</pre>
        </div>
      ))}
    </main>
  );
}
