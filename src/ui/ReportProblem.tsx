import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../state/store";
import {
  GAME_BUILD,
  keepReport,
  sendReport,
  flushReports,
  type GameReport,
} from "../state/reports";
export function ReportProblem() {
  const [open, setOpen] = useState(false),
    [kind, setKind] = useState<GameReport["kind"]>("dialogue"),
    [detail, setDetail] = useState(""),
    [expected, setExpected] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const situation = useStore((s) => s.conv.sitId);
  useEffect(() => {
    void flushReports();
    window.addEventListener("online", flushReports);
    return () => window.removeEventListener("online", flushReports);
  }, []);
  useEffect(() => {
    setOpen(false);
    setDetail("");
    setExpected("");
    setStatus("");
    setSubmitted(false);
  }, [situation]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function submit() {
    if (busy) return;
    setBusy(true);
    const c = useStore.getState().conv;
    const report: GameReport = {
      version: 1,
      id: crypto.randomUUID(),
      situation: c.sitId,
      kind,
      detail: detail.trim(),
      expected: expected.trim(),
      build: GAME_BUILD,
      step: c.stepId || "",
      input: c.typing ? "typed" : "voice",
      turns: c.transcript
        .slice(-12)
        .map((l) => ({
          who: l.who === "npc" ? "npc" : "you",
          text: (l.sentence?.en || l.text || "").slice(0, 700),
          lt: (l.sentence?.nat || "").slice(0, 700),
          heard: (l.heard || "").slice(0, 700),
          alternatives: (l.alternatives || []).slice(0, 3),
        })),
    };
    const kept = keepReport(report);
    const sent = await sendReport(report);
    setStatus(
      sent
        ? "Ačiū! Pranešimas išsiųstas."
        : kept
          ? "Pranešimas išsaugotas šiame įrenginyje. Išsiųsime, kai ryšys ir prisijungimas leis."
          : "Nepavyko išsaugoti. Nukopijuok pranešimą ir atsiųsk mokytojui.",
    );
    if (!kept && !sent) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        setStatus("Pranešimas nukopijuotas. Įklijuok jį žinutėje mokytojui.");
      } catch {
        /* preserve the form so the learner can copy their text */
      }
    }
    setSubmitted(kept || sent);
    setBusy(false);
  }
  return (
    <>
      <div className="beta-strip">
        <span>Beta · dar tobulinamas</span>
        <button
          type="button"
          onClick={() => {
            if (submitted) {
              setDetail("");
              setExpected("");
              setSubmitted(false);
            }
            setStatus("");
            setOpen(true);
          }}
        >
          Pranešti apie klaidą
        </button>
      </div>
      {createPortal(<dialog
        ref={dialog}
        className="problem-dialog"
        onCancel={() => setOpen(false)}
        aria-labelledby="problem-title"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h2 id="problem-title">Kas nepavyko?</h2>
          <p>
            Pranešimą gaus kurso kūrėjas. Pridėsime paskutines 12 šio pokalbio
            žinučių ir atpažintą tekstą. Garso įrašas nesiunčiamas.
          </p>
          <label>
            Klaidos pobūdis
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as GameReport["kind"])}
            >
              <option value="dialogue">
                Pokalbis užstrigo arba atsakė netinkamai
              </option>
              <option value="speech">Neteisingai išgirdo</option>
              <option value="translation">Vertimo netikslumas</option>
              <option value="other">Kita</option>
            </select>
          </label>
          <label>
            Kas įvyko?
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={1600}
              required
            />
          </label>
          <label>
            Ką norėjai pasakyti arba kokio atsakymo tikėjaisi?
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              maxLength={1000}
            />
          </label>
          <details>
            <summary>Pridedama pokalbio ištrauka</summary>
            <div className="problem-preview">
              {useStore
                .getState()
                .conv.transcript.slice(-12)
                .map((l) => (
                  <p key={l.id}>
                    {l.who === "npc" ? "Pašnekovas" : "Tu"}:{" "}
                    {l.sentence?.en || l.text}
                    {l.heard && l.heard !== l.text && ` (išgirdo: ${l.heard})`}
                  </p>
                ))}
            </div>
          </details>
          <p role="status">{status}</p>
          <div className="problem-actions">
            <button
              className="btn"
              type="submit"
              disabled={busy || !detail.trim() || submitted}
            >
              {busy ? "Siunčiama…" : "Siųsti pranešimą"}
            </button>
            <button
              className="btn soft"
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Grįžti į pokalbį
            </button>
          </div>
        </form>
      </dialog>, document.body)}
    </>
  );
}
