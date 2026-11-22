import { ROUTE } from "../../content/route";
import { PHONE_CALLS } from "../../content/phoneCalls";
import type { Progress } from "../../state/progress";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import { canShowPhoneCard, freeToWalk, nextPhoneCall, PHONE_WAIT, type PhoneSnapshot } from "./schedule";

export class TownPhone {
  private elapsed = 0;
  private played = useStore.getState().progress.phone?.played ?? 0;
  private lastCard = useStore.getState().progress.phone?.lastCard ?? -Infinity;
  private calm = PHONE_WAIT.calm;
  private forceDue = false;
  private card: { id: string; expires: number; soundAgain: number } | null = null;
  private stopAlert: (() => void) | undefined;

  dueNow() { this.forceDue = true; }

  saveClock(p: Progress) {
    if (p.phone) p.phone.played = this.played;
  }

  private alert() {
    if (!this.card) return;
    this.stopAlert?.();
    const incoming = PHONE_CALLS[this.card.id].kind === "incoming";
    const stopSound = audio.phoneAlert(incoming);
    navigator.vibrate?.(incoming ? [400, 200, 400, 200, 400] : [150, 100, 150]);
    this.stopAlert = () => { stopSound?.(); navigator.vibrate?.(0); };
  }

  silence() {
    this.stopAlert?.();
    this.stopAlert = undefined;
  }

  observe(snapshot: PhoneSnapshot) {
    const { town, conversation, panel, dialog, mode, onFoot, loading, transition, visible, enabled } = snapshot;
    if (town && (conversation || panel || dialog || mode || !onFoot || loading || transition)) this.calm = 0;
    if (!visible) this.silence();
    // A hidden tab pauses a call. A conflicting activity dismisses it even if it starts in the background.
    if (this.card && (!freeToWalk(snapshot) || !enabled)) this.dismiss();
  }

  tick(dt: number, snapshot: PhoneSnapshot) {
    this.observe(snapshot);
    if (!snapshot.visible || !freeToWalk(snapshot)) return;
    this.elapsed += dt;
    this.played += dt;
    this.calm += dt;
    if (this.card) {
      if (this.played >= this.card.expires) this.dismiss();
      else if (this.played >= this.card.soundAgain) {
        this.card.soundAgain = this.played + 5;
        this.alert();
      }
      return;
    }
    const st = useStore.getState();
    if (!canShowPhoneCard(snapshot, {
      active: this.elapsed, sinceCard: this.played - this.lastCard, calm: this.calm, forceDue: this.forceDue,
    })) return;
    const id = nextPhoneCall(ROUTE, st.progress, this.played);
    if (!id) return;
    this.lastCard = this.played;
    this.forceDue = false;
    this.card = {
      id, expires: this.played + PHONE_WAIT.answer,
      soundAgain: PHONE_CALLS[id].kind === "incoming" ? this.played + 5 : Infinity,
    };
    st.updateProgress((p) => {
      p.phone ??= { played: this.played, missed: {} };
      p.phone.played = this.played;
      p.phone.lastCard = this.lastCard;
      const missed = p.phone.missed[id];
      if (missed) {
        missed.presentations++;
        missed.retryAt = this.played + PHONE_WAIT.retry;
      }
    });
    st.setHud({ phoneCard: id });
    this.alert();
  }

  answer(id: string) {
    if (this.card?.id !== id) return false;
    this.clear();
    return true;
  }

  dismiss(id = this.card?.id) {
    if (!id || this.card?.id !== id) return;
    this.clear();
    this.markMissed(id);
  }

  markMissed(id: string) {
    const st = useStore.getState();
    if (st.progress.sits[id]?.completions) return;
    st.updateProgress((p) => {
      p.phone ??= { played: this.played, missed: {} };
      p.phone.played = this.played;
      p.phone.missed[id] = {
        presentations: p.phone.missed[id]?.presentations ?? 1,
        retryAt: this.played + PHONE_WAIT.retry,
      };
    });
  }

  private clear() {
    this.card = null;
    this.silence();
    useStore.getState().setHud({ phoneCard: null });
  }
}
