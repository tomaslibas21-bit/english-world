import { KEEPER_ANSWER, KEEPER_SIT, keeperAnswerName } from "../content/keeper";
import type { Session } from "../game/session";
import { useStore } from "../state/store";
import "./keeperAnswer.css";

export default function KeeperAnswer({ en, activeSession }: { en: string; activeSession: () => Session | null | undefined }) {
  return (
    <button type="button" className="btn ghost small" data-keeper-answer aria-label={keeperAnswerName(en)} onClick={() => {
      const session = activeSession();
      if (session?.sit.id === KEEPER_SIT && useStore.getState().conv.phase === "you") void session.submit(en, [], "picked");
    }}>{KEEPER_ANSWER}</button>
  );
}
