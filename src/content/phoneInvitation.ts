export interface Invitation {
  place: string;
  chip: string;
  when: string;
}

export function invitationDetails(state: Record<string, unknown>) {
  const { place, meetTime, day } = state;
  if (typeof place !== "string" || !meetTime || typeof meetTime !== "object") return;
  const { h, m } = meetTime as { h: number; m: number };
  if (!Number.isInteger(h) || h < 1 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) return;
  return {
    place,
    hour: h < 12 ? h + 12 : h,
    minute: String(m).padStart(2, "0"),
    day: typeof day === "string" ? day : "",
  };
}

export const LT_WEEKDAYS: Readonly<Record<string, string>> = {
  monday: "pirmadienį", tuesday: "antradienį", wednesday: "trečiadienį",
  thursday: "ketvirtadienį", friday: "penktadienį", saturday: "šeštadienį", sunday: "sekmadienį",
};

/** s83 also lets the learner agree on "tonight" / "tomorrow" (same words as s83's own glosses). */
export const LT_RELATIVE_DAYS: Readonly<Record<string, string>> = { tonight: "šįvakar", tomorrow: "rytoj" };
export const EN_RELATIVE_DAYS: Readonly<Record<string, string>> = { tonight: "Tonight", tomorrow: "Tomorrow" };
