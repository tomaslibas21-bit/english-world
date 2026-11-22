import { NPCS } from "./npcs";

type Caller = { npc: string; name: string };
export type PhoneCall = Caller & ({ kind: "incoming"; video?: boolean } | { kind: "reminder"; reason: string });

const caller = (npc: string, organization?: string): Caller => ({
  npc, name: [NPCS[npc].name, organization].filter(Boolean).join(" · "),
});

export const PHONE_CALLS: Readonly<Record<string, PhoneCall>> = {
  "s76-dentist-call": { ...caller("linda", "Green Street Dental"), kind: "reminder", reason: "Jau kelias dienas skauda dantį. Gal metas užsiregistruoti pas odontologą?" },
  "s80-support-call": { npc: "claire", name: "NetWave", kind: "reminder", reason: "Neveikia internetas, lemputė mirksi raudonai. Paskambink tiekėjui." },
  "s89-video-call": { ...caller("kate", "Brightline"), kind: "incoming", video: true },
  "s90-running-late": { ...caller("harris"), kind: "reminder", reason: "8:50, o susirinkimas prasideda devintą. Pranešk viršininkui, kad vėluoji." },
  "s83-invite-call": { ...caller("lizzie"), kind: "reminder", reason: "Turi du bilietus į penktadienio koncertą. Pakviesk draugę!" },
  "p26-complaint": { npc: "kyle", name: "Harbor Home", kind: "reminder", reason: "Naujas šaldytuvas vėl neveikia. Skambink į parduotuvę – mandagiai, bet tvirtai." },
  "p24-flood": { ...caller("lizzie"), kind: "incoming" },
};

export const FLOOD_INCOMING_INTRO = "Šeštadienis, pusė devynių ryto, o tavo kojos šlapios: skalbimo mašina „kaip ir sprogo“, virtuvėje teka upė. Skambina Lizzie – su ja šiandien turėjai eiti į brunčą. Papasakok jai, kas nutiko, paskui paskambink nuomotojui ponui Grantui. Tie patys faktai, du skirtingi tonai.";
export const OFFICE_TASK = "Skubėk į biurą – susirinkimas jau prasidėjo";

const LOCATIONS = {
  station: "station",
  cafe: "sunny-cup",
  bus_stop: "bus-stop",
  entrance: "town-square",
} as const;

const DAYS: Readonly<Record<string, string>> = {
  monday: "pirmadienį", tuesday: "antradienį", wednesday: "trečiadienį",
  thursday: "ketvirtadienį", friday: "penktadienį", saturday: "šeštadienį", sunday: "sekmadienį",
  // s83 also accepts these two (same words as its own glosses).
  tonight: "šįvakar", tomorrow: "rytoj",
};

export interface Invitation {
  place: keyof typeof LOCATIONS;
  chip: string;
  when: string;
}

export function invitationLocation(place: string) {
  return Object.hasOwn(LOCATIONS, place) ? LOCATIONS[place as keyof typeof LOCATIONS] : undefined;
}

export function concertInvitation(state: Record<string, unknown>, places: readonly { id: string; chip?: string }[]): Invitation | undefined {
  const { place, meetTime, day } = state;
  if (typeof place !== "string" || !invitationLocation(place) || !meetTime || typeof meetTime !== "object") return;
  const chip = places.find((entity) => entity.id === place)?.chip;
  const { h, m } = meetTime as { h: number; m: number };
  if (!chip || !Number.isInteger(h) || h < 1 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) return;
  // s83 stores a twelve-hour time and the concert is in the evening.
  const time = `${h < 12 ? h + 12 : h}:${String(m).padStart(2, "0")}`;
  const weekday = typeof day === "string" && Object.hasOwn(DAYS, day) ? DAYS[day] : undefined;
  return { place: place as Invitation["place"], chip, when: weekday ? `${weekday} ${time}` : time };
}

export const invitationTitle = ({ chip, when }: Invitation) => `Susitik su Lizzie ${chip} · ${when}`;
