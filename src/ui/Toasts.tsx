import { useStore, usesTownNotes, type Toast } from "../state/store";
import { useSurf } from "../game/surf/store";
import { townNote } from "../state/townNotes";
import { Icon, Stars, splitLead, withIcons, type IconName } from "./icons";

/** A toast from the UI can name its own icon (game toasts put an emoji at the start of the title). */
export type ToastInput = Omit<Toast, "id"> & { icon?: IconName };
export function showToast(t: ToastInput) { useStore.getState().toast(t); }

const KIND_ICON: Record<Toast["kind"], IconName> = { tip: "bulb", stamp: "medal", success: "checkCircle", info: "info" };

export function Toasts() {
  // The surf picker and lesson can change screens without changing the main store.
  useSurf((s) => s.active || s.picking);
  const toasts = useStore((s) => usesTownNotes(s) ? null : s.toasts);
  const modeMenu = useStore((s) => s.hud.modeScreen?.kind === "menu");
  return <ToastList toasts={(modeMenu ? toasts?.filter((t) => t.rideHint) : toasts) ?? []} />;
}

export function TownToast() {
  const picking = useSurf((s) => s.picking);
  const toast = useStore((s) => usesTownNotes(s) && townNote(s.hud) === "toast" && s.townToasts[0]?.startedAt != null ? s.townToasts[0].toast : null);
  return <ToastList toasts={!picking && toast ? [toast] : []} town />;
}

function ToastList({ toasts, town }: { toasts: Toast[]; town?: boolean }) {
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className={"toasts" + (town ? " town-toasts" : "")} aria-live="polite">
      {toasts.map((t) => {
        const lead = splitLead(t.title);
        const icon = (t as ToastInput).icon ?? lead.icon ?? KIND_ICON[t.kind] ?? "info";
        return (
          <div key={t.id} className={"toast " + t.kind} data-ride-hint={t.rideHint}>
            <span className="t-icon"><Icon name={icon} size={22} /></span>
            <div className="t-text">
              <b>{lead.stars > 0 && <Stars n={lead.stars} of={lead.stars} size={17} label={`${lead.stars} iš 3`} />}{withIcons(lead.rest)}</b>
              {t.body && <p>{withIcons(t.body)}</p>}
              {t.better && <div className="better">{t.better}</div>}
            </div>
            <button className="x" onClick={() => dismiss(t.id)} aria-label="Uždaryti"><Icon name="close" size={18} /></button>
          </div>
        );
      })}
    </div>
  );
}
