import type { Session } from "../game/session";
import { useStore } from "../state/store";
import "./keeperAnswer.css";

const KEEPER_ANSWER = "Atsakyti";
const keeperAnswerName = (en: string) => `${KEEPER_ANSWER}: ${en}`;

export default function KeeperAnswer({ en, activeSession }: { en: string; activeSession: () => Session | null | undefined }) {
  return (
    <button type="button" className="btn ghost small" data-keeper-answer aria-label={keeperAnswerName(en)} onClick={() => {
      const session = activeSession();
      if (session?.sit.id === "x05-lighthouse-keeper" && useStore.getState().conv.phase === "you") void session.submit(en, [], "picked");
    }}>{KEEPER_ANSWER}</button>
  );
}
