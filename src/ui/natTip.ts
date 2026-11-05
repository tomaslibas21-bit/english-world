// The small "*" after the other person's sentence (Interlinear.tsx, NatTip): when the word-by-word Lithuanian is
// on but the whole natural sentence isn't shown under it ("Visas sakinys lietuviškai" off), a line whose natural
// translation says something its word glosses don't gets an asterisk, and the natural sentence in a tooltip.
// "My pleasure!" is "Mano | malonumas!" word by word but "Mielai!" naturally, so it gets one; "Business or
// pleasure?" reads "Darbo reikalais ar poilsiui?" both ways, so it doesn't.
import type { Sentence } from "../convo/compose";

/** A sentence made comparable: lower case, no punctuation (quotes „“”"«», dashes, „…“, !?.,), single spaces. */
export function natNorm(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\p{P}+/gu, " ").replace(/\s+/g, " ").trim();
}

/** The word glosses read one after another, without the "—" units (words Lithuanian doesn't say on their own;
 *  the same test as isDashGloss in state/cards.ts). */
export function glossLine(units: Sentence["units"]): string {
  return units.filter((u) => !u.lt.trim().startsWith("—")).map((u) => u.lt).join(" ");
}

/** Does the natural translation say something the word glosses don't? A difference only in punctuation or
 *  capitals doesn't count; a missing natural translation never does. */
export function natDiffers(s: Pick<Sentence, "units" | "nat">): boolean {
  const nat = natNorm(s.nat ?? "");
  return nat !== "" && nat !== natNorm(glossLine(s.units));
}

export interface Box { left: number; top: number; right: number; bottom: number }
export interface TipSpot { left: number; top: number; below: boolean; arrow: number }

/** Where the tooltip goes: centred above the asterisk, or below it when there's no room above; always inside
 *  `box` (the conversation panel), `m` px from its edges. `arrow` is the arrow's x inside the tooltip. */
export function placeTip(a: Box, w: number, h: number, box: Box, m = 8, gap = 8): TipSpot {
  const cx = (a.left + a.right) / 2;
  const left = Math.round(Math.max(box.left + m, Math.min(box.right - m - w, cx - w / 2)));
  const fitsAbove = a.top - gap - h >= box.top + m;
  const fitsBelow = a.bottom + gap + h <= box.bottom - m;
  // neither fits (a very short panel): the side with more room
  const below = !fitsAbove && (fitsBelow || box.bottom - a.bottom > a.top - box.top);
  const top = Math.round(below ? Math.min(a.bottom + gap, box.bottom - m - h) : Math.max(box.top + m, a.top - gap - h));
  return { left, top, below, arrow: Math.round(Math.max(14, Math.min(w - 14, cx - left))) };
}
