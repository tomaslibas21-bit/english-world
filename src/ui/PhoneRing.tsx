import { PHONE_CALLS } from "../content/phoneCalls";
import { game } from "../game/gameRef";
import { Icon } from "./icons";
import { usePortrait } from "./usePortrait";

export function PhoneRing({ id }: { id: string }) {
  const call = PHONE_CALLS[id];
  const portrait = usePortrait(call?.npc);
  if (!call) return null;
  const incoming = call.kind === "incoming";
  return (
    <section className="phone-ring" data-call={id} data-kind={call.kind} aria-label={call.name} lang="lt">
      <div className="phone-ring-id" aria-live="polite">
        <div className="phone-ring-avatar" aria-hidden>
          {portrait ? <img src={portrait} alt="" /> : <Icon name={incoming && call.video ? "video" : "phoneCall"} size={24} />}
        </div>
        <div>
          {!incoming && <small>Laikas paskambinti</small>}
          <strong>{call.name}</strong>
          {incoming && <small>{call.video ? "kviečia į vaizdo skambutį" : "skambina"}</small>}
        </div>
      </div>
      {!incoming && <p>{call.reason}</p>}
      <div className="phone-ring-actions">
        <button className="btn soft" onClick={() => game?.handlePhoneCard?.(id, false)}>{incoming ? "Atmesti" : "Vėliau"}</button>
        <button className="btn" onClick={() => game?.handlePhoneCard?.(id, true)}>{incoming ? "Atsiliepti" : "Skambinti"}</button>
      </div>
    </section>
  );
}
