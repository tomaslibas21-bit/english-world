import type { PhoneCall } from "@/content/phoneCalls";
import { EN_RELATIVE_DAYS, invitationDetails, LT_RELATIVE_DAYS, LT_WEEKDAYS, type Invitation } from "@/content/phoneInvitation";
import { EDITION } from "@/edition";
import { L } from "@/ui/i18n";
import { NPCS } from "./npcs";

export const PHONE_CALLS: Readonly<Record<string, PhoneCall>> = {
  "s76-dentist-call": { npc: "linda", name: `${NPCS.linda.name} · Clínica Dental Coral`, kind: "reminder",
    reason: L("Jau kelias dienas skauda dantį. Gal metas užsiregistruoti pas odontologą?") },
  "s80-support-call": { npc: "claire", name: "NetWave", kind: "reminder",
    reason: L("Neveikia internetas, modemo lemputė mirksi raudonai. Paskambink tiekėjui.") },
  "s89-video-call": { npc: "kate", name: `${NPCS.kate.name} · Línea Clara`, kind: "incoming", video: true },
  "s90-running-late": { npc: "harris", name: NPCS.harris.name, kind: "reminder",
    reason: L("8:50, o susirinkimas prasideda devintą. Pranešk viršininkui, kad vėluoji.") },
  "s83-invite-call": { npc: "lizzie", name: NPCS.lizzie.name, kind: "reminder",
    reason: L("Turi du bilietus į penktadienio koncertą. Pakviesk draugę!") },
  "p26-complaint": { npc: "kyle", name: "Hogar Puerto", kind: "reminder",
    reason: L("Nauja sofa atvežta pavėluotai ir sulūžusi. Skambink į parduotuvę – mandagiai, bet tvirtai.") },
  "p24-flood": { npc: "lizzie", name: NPCS.lizzie.name, kind: "incoming" },
};

export const FLOOD_INCOMING_INTRO = L("Šeštadienis, pusė devynių ryto, o tavo kojos šlapios: naktį viršuje trūko vamzdis, ir virtuvėje teka upė. Skambina Andrea – devintą turėjote susitikti pusryčių. Papasakok jai, kas nutiko (tú), paskui paskambink Don Gilbertui, pastato administratoriui (usted).");
export const OFFICE_TASK = L("Skubėk į biurą – susirinkimas jau prasidėjo");
export const MEETING_DONE = L("Susitikote su Andrea. Gero koncerto!");

const PLACES: Readonly<Record<string, { location: string; en: string; lt: string }>> = {
  kiosco: { location: "town-square", en: "at the bandstand", lt: "prie kiosko aikštėje" },
  malecon: { location: "the-pier", en: "on the boardwalk", lt: "prie krantinės" },
  taqueria: { location: "market", en: "at the taco place by the market", lt: "prie tako užkandinės šalia turgaus" },
  mercado: { location: "market", en: "at the market", lt: "prie turgaus" },
  cafe: { location: "sunny-cup", en: "at the café", lt: "prie kavinės" },
  entrada: { location: "town-square", en: "at the concert entrance", lt: "prie koncerto įėjimo" },
  iglesia: { location: "town-square", en: "at the church", lt: "prie bažnyčios" },
};

function meetingPlace(place: string) {
  return Object.hasOwn(PLACES, place) ? PLACES[place] : undefined;
}

export function invitationLocation(place: string) { return meetingPlace(place)?.location; }

export function concertInvitation(state: Record<string, unknown>): Invitation | undefined {
  const details = invitationDetails(state);
  if (!details) return;
  const { place, hour, minute, day } = details;
  const destination = meetingPlace(place);
  if (!destination) return;
  const english = EDITION.helper === "en";
  const weekday = Object.hasOwn(LT_WEEKDAYS, day)
    ? (english ? day.charAt(0).toUpperCase() + day.slice(1) : LT_WEEKDAYS[day])
    : Object.hasOwn(LT_RELATIVE_DAYS, day) ? (english ? EN_RELATIVE_DAYS[day] : LT_RELATIVE_DAYS[day]) : "";
  const time = english ? `${hour % 12 || 12}:${minute} p.m.` : `${hour}:${minute}`;
  return { place, chip: english ? destination.en : destination.lt, when: weekday ? `${weekday}${english ? ", " : " "}${time}` : time };
}

export const invitationTitle = ({ chip, when }: Invitation) => L("Susitik su Andrea {chip} · {when}", { chip, when });
