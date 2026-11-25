import { PHONE_CALLS } from "../content/phoneCalls";
import { game } from "../game/gameRef";
import { Icon } from "./icons";
import { HL, L } from "./i18n";
import { usePortrait } from "./usePortrait";

export function PhoneRing({ id }: { id: string }) {
  const call = PHONE_CALLS[id];
  const portrait = usePortrait(call?.npc);
  if (!call) return null;
  const incoming = call.kind === "incoming";
  return (
    <section className="phone-ring" data-pad-scope="phone-ring" data-call={id} data-kind={call.kind} aria-label={call.name} lang={HL}>
      <div className="phone-ring-id" aria-live="polite">
        <div className="phone-ring-avatar" aria-hidden>
          {portrait ? <img src={portrait} alt="" /> : <Icon name={incoming && call.video ? "video" : "phoneCall"} size={24} />}
        </div>
        <div>
          {!incoming && <small>{L("Laikas paskambinti")}</small>}
          <strong>{call.name}</strong>
          {incoming && <small>{call.video ? L("kviečia į vaizdo skambutį") : L("skambina")}</small>}
        </div>
      </div>
      {!incoming && <p>{call.reason}</p>}
      <div className="phone-ring-actions">
        <button className="btn soft" data-pad-back onClick={() => game?.handlePhoneCard?.(id, false)}>{incoming ? L("Atmesti") : L("Vėliau")}</button>
        <button className="btn" data-pad-default onClick={() => game?.handlePhoneCard?.(id, true)}>{incoming ? L("Atsiliepti") : L("Skambinti")}</button>
      </div>
    </section>
  );
}
