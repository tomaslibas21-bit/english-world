import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  audioDiagnostic,
  audioDiagnosticsCount,
  audioDiagnosticsEnabled,
  audioDiagnosticsReport,
  audioSessionSnapshot,
  observeAudioDiagnostics,
  pauseAudioDiagnostics,
  subscribeAudioDiagnostics,
} from "../convo/audioDiagnostics";
import { microphoneHandoffState } from "../convo/audioFocus";
import { audio } from "../game/audio";
import { game } from "../game/gameRef";
import { useStore } from "../state/store";
import "./audio-diagnostics.css";

/** Visible only through an explicit support link. It never submits a learner answer or advances a turn. */
export function AudioDiagnostics() {
  return audioDiagnosticsEnabled() ? <DeviceAudioDiagnostics /> : null;
}

function DeviceAudioDiagnostics() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"before-mic" | "after-mic">("before-mic");
  const [answer, setAnswer] = useState("");
  const events = useSyncExternalStore(
    subscribeAudioDiagnostics,
    audioDiagnosticsCount,
    () => 0,
  );
  const sample = useSyncExternalStore(
    audio.subscribeDiagnostics,
    audio.getDiagnosticState,
  );
  const playback = useSyncExternalStore(audio.subscribe, audio.getState);
  const phase = useStore((s) => (s.conv.active ? s.conv.phase : null));
  const mic = microphoneHandoffState();
  const busy =
    phase === "npc" ||
    phase === "thinking" ||
    playback !== "idle" ||
    mic.captures > 0;
  const prepared =
    !!sample.clipId && ["ready", "playing", "blocked"].includes(sample.status);
  useEffect(() => observeAudioDiagnostics(), []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(
    () => () => {
      audio.stopDiagnostic("unmount");
      pauseAudioDiagnostics(false);
    },
    [],
  );

  const openPanel = (quiet: boolean) => {
    // Capture the broken state before stopListening or any diagnostic playback changes it.
    audioDiagnostic(quiet ? "diagnostic.quiet" : "diagnostic.inspect", {
      ...audioSessionSnapshot(),
      ...mic,
    });
    if (quiet) setStage("after-mic");
    pauseAudioDiagnostics(true);
    game?.activeSession?.stopListening();
    audio.stopAmbience();
    setOpen(true);
  };
  const close = () => {
    audio.stopDiagnostic("close");
    pauseAudioDiagnostics(false);
    setOpen(false);
  };
  const recordAnswer = (
    audibility: "normal" | "quieter" | "silent",
    label: string,
  ) => {
    audioDiagnostic("comparison.heard", {
      stage,
      audibility,
      pipeline: sample.pipeline,
      clipId: sample.clipId,
      volume: sample.volume,
    });
    setAnswer(label);
  };
  const download = () => {
    audioDiagnostic("diagnostic.export", { stage });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(audioDiagnosticsReport(), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "english-world-garso-patikra.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div data-audio-diagnostics>
      <div className="audio-debug-tools">
        <button type="button" onClick={() => openPanel(false)}>
          Garso patikra
        </button>
        <button type="button" onClick={() => openPanel(true)}>
          Garsas pritilo
        </button>
      </div>
      <dialog
        ref={dialog}
        className="audio-debug-dialog"
        aria-labelledby="audio-debug-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header>
          <h1 id="audio-debug-title">Garso patikra telefone</h1>
          <button type="button" onClick={close}>
            Uždaryti
          </button>
        </header>
        <p>
          Ši patikra padės rasti, kodėl garsas prityla. Ji dar nėra garso
          problemos pataisymas.
        </p>
        <ol>
          <li>
            Atidaryk patikrą dar grojant pirmajai pašnekovo frazei – taip
            pristabdysi automatinį mikrofono įjungimą. Palauk, kol pašnekovas
            baigs kalbėti, paruošk įrašą ir išklausyk A bei B.
          </li>
          <li>
            Uždaryk patikrą ir vieną kartą atsakyk per mikrofoną. Jei garsas
            pritilo, spausk „Garsas pritilo“.
          </li>
          <li>
            Vėl išklausyk A bei B. Naujo įrašo neruošk – bus naudojamas tas pats
            pirmasis įrašas. Nekeisk telefono garsumo.
          </li>
        </ol>
        <p>
          Kiekvieną būdą palygink su jo garsu prieš mikrofono naudojimą. A ir B
          gali skirtis net esant tam pačiam pasirinktam garsumui.
        </p>
        <fieldset>
          <legend>Kada klausaisi?</legend>
          <label>
            <input
              type="radio"
              name="audio-debug-stage"
              checked={stage === "before-mic"}
              onChange={() => {
                setStage("before-mic");
                setAnswer("");
              }}
            />{" "}
            Prieš mikrofoną
          </label>
          <label>
            <input
              type="radio"
              name="audio-debug-stage"
              checked={stage === "after-mic"}
              onChange={() => {
                setStage("after-mic");
                setAnswer("");
              }}
            />{" "}
            Po mikrofono
          </label>
        </fieldset>
        <div className="audio-debug-row">
          <button
            type="button"
            disabled={
              sample.status === "preparing" || sample.status === "playing"
            }
            onClick={() => {
              setAnswer("");
              void audio.prepareDiagnosticComparison();
            }}
          >
            Paruošti tą patį įrašą
          </button>
          <button
            type="button"
            disabled={!prepared || busy}
            onClick={() => {
              setAnswer("");
              audioDiagnostic("comparison.stage", { stage });
              audio.playDiagnostic("html");
            }}
          >
            A · Įprastas grotuvas
          </button>
          <button
            type="button"
            disabled={!prepared || busy}
            onClick={() => {
              setAnswer("");
              audioDiagnostic("comparison.stage", { stage });
              audio.playDiagnostic("buffer");
            }}
          >
            B · Web Audio
          </button>
          <button
            type="button"
            disabled={
              sample.status !== "playing" && sample.status !== "preparing"
            }
            onClick={() => audio.stopDiagnostic("user-stop")}
          >
            Sustabdyti
          </button>
        </div>
        <p role="status" aria-live="polite">
          {busy
            ? "Palauk, kol pašnekovas baigs kalbėti ir mikrofonas išsijungs."
            : sample.status === "preparing"
              ? "Ruošiamas vienas įrašas abiem būdams…"
              : sample.status === "playing"
                ? `Groja ${sample.pipeline === "html" ? "A" : "B"}.`
                : sample.status === "ready"
                  ? "Tas pats įrašas paruoštas abiem būdams."
                  : sample.status === "blocked"
                    ? "Garsas neprasidėjo arba sustojo. Gali dar kartą spausti A arba B."
                    : sample.status === "unavailable"
                      ? "Įrašo paruošti nepavyko. Pabandyk dar kartą po kitos trumpos pašnekovo frazės."
                      : "Pirmiausia išklausyk bent vieną įrašytą pašnekovo frazę."}
        </p>
        {!!mic.unconfirmed && (
          <p>
            Atpažinimo pabaiga nepatvirtinta. Šis faktas bus ataskaitoje;
            patikra pati mikrofono neįjungia.
          </p>
        )}
        <fieldset disabled={!sample.pipeline}>
          <legend>Kaip girdėjai paskutinį A arba B įrašą?</legend>
          <div className="audio-debug-row">
            <button
              type="button"
              onClick={() =>
                recordAnswer("normal", "Pažymėta: girdžiu įprastai.")
              }
            >
              Girdžiu įprastai
            </button>
            <button
              type="button"
              onClick={() =>
                recordAnswer("quieter", "Pažymėta: girdžiu tyliau.")
              }
            >
              Girdžiu tyliau
            </button>
            <button
              type="button"
              onClick={() => recordAnswer("silent", "Pažymėta: negirdžiu.")}
            >
              Negirdžiu
            </button>
          </div>
          {answer && <p role="status">{answer}</p>}
        </fieldset>
        <p>
          Ataskaitoje bus tik techninių įvykių laikai ir tavo pasirinkimai.
          Balso, pasakytų žodžių ir prisijungimo duomenų joje nėra. Ji niekur
          nesiunčiama automatiškai.
        </p>
        <button type="button" onClick={download}>
          Atsisiųsti ataskaitą
        </button>
        <p className="audio-debug-note">
          Įvykių: {events}. Uždarius patikrą, mikrofoną įjunk pats. Patikros
          įrašai nekeičia mokymosi pažangos.
        </p>
      </dialog>
    </div>
  );
}
