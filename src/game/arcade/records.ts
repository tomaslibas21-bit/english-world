import { BARISTA_CONVERSATION } from "../../content/barista";
import { ROAD_EDITION } from "../../content/road";
import { POOL_SITUATION } from "../world/pool";
import { HL, L } from "../../ui/i18n";
import { PHOTO_THINGS } from "../../content/photo-walk-lines";
import { readPlayStats } from "../../state/playStats";
import { sitProgress, type Progress } from "../../state/progress";
import { readBest } from "../road/ghost";
import type { Cabinet, TownGame } from "./cabinets";

export const TOWN_DETAILS = {
  taxi: { title: "Manejar un taxi", helper: L("Vairuoti taksi"),
    place: L("Prie taksi stotelės.") },
  sea: { title: "Mar abierto", helper: L("Atvira jūra"),
    place: L("Paplūdimyje įlipk į valtį ir plauk už plūdurų.") },
  surf: { title: "Clase de surf", helper: L("Banglenčių pamoka"),
    place: L("Prie banglenčių stovo šalia „La Ola“.") },
  photowalk: { title: "Paseo fotográfico", helper: L("Pasivaikščiojimas su fotoaparatu"),
    place: L("Renata su nuotraukų albumu laukia prie turizmo informacijos centro.") },
  loteria: { title: "Lotería", helper: L("Loterija"),
    place: L("Prie loterijos stalo pagrindinėje aikštėje tavęs laukia Doña Toña.") },
  barista: { title: "Trabajar un turno en el café", helper: L("Dirbti pamainą kavinėje"),
    place: L("Prie kavinės „La Ceiba“ prekystalio.") },
  gym: { title: "Entrenamiento en el gimnasio", helper: L("Treniruotė sporto klube"),
    place: L("Sporto klube, prie kilimėlio.") },
  pool: { title: "Juego de pelota en la alberca", helper: L("Žaidimas su kamuoliu baseine"),
    place: L("Viešbučio „Mar Azul“ baseine.") },
} satisfies Record<TownGame, { title: string; helper: string; place: string }>;

export function prerequisite(id: TownGame | Cabinet, progress: Progress) {
  if (id === "pool" && !sitProgress(progress, POOL_SITUATION).completions)
    return L("Pirmiausia pasikalbėk su Vale prie baseino.");
  if (id === "barista" && !sitProgress(progress, BARISTA_CONVERSATION.situation).completions)
    return L("Pirmiausia užbaik pokalbį kavinėje.");
}

export function arcadeRecord(id: TownGame | Cabinet, progress: Progress) {
  if (id === "road" || id === "sea") {
    const points = readBest(ROAD_EDITION.id, undefined, id)?.points;
    return { label: L("Asmeninis rekordas"), value: points ?? L("Rezultato dar nėra") };
  }
  if (id === "pool") {
    const best = progress.pool?.best;
    return { label: L("Ilgiausia perdavimų serija"), value: typeof best === "number" && Number.isSafeInteger(best) && best >= 0
      ? best : L("Rezultato dar nėra") };
  }
  if (id === "surf") {
    const waves = progress.surf?.waves;
    return { label: L("Įveiktos bangos"), value: typeof waves === "number" && Number.isSafeInteger(waves) && waves >= 0 ? waves : 0 };
  }
  if (id === "photowalk") {
    const found = progress.photoWalk?.found;
    const count = PHOTO_THINGS.filter(({ id }) => Array.isArray(found) && found.includes(id)).length;
    return { label: L("Nufotografuoti objektai"), value: `${count} / ${PHOTO_THINGS.length}` };
  }
  return { label: id === "barista" ? L("Pradėtos pamainos") : L("Pradėti žaidimai"), value: readPlayStats(progress).games[id] ?? 0 };
}

const pointUnits = ["taškas", "taškai", "taškų"] as const;
const gameUnits = ["žaidimas", "žaidimai", "žaidimų"] as const;
const shiftUnits = ["pamaina", "pamainos", "pamainų"] as const;
const waveUnits = ["banga", "bangos", "bangų"] as const;
const passUnits = ["perdavimas", "perdavimai", "perdavimų"] as const;
const pluralRules = new Intl.PluralRules(HL);
const numberFormat = new Intl.NumberFormat(HL);

/** Keep the measurement with its unit, including the genitive after zero, tens and teens. */
export function formatArcadeMetric(id: TownGame | Cabinet, value: string | number) {
  if (typeof value === "string") return value;
  const units = id === "road" || id === "sea" ? pointUnits : id === "surf" ? waveUnits
    : id === "barista" ? shiftUnits : id === "pool" ? passUnits : gameUnits;
  const plural = pluralRules.select(value);
  return numberFormat.format(value) + "\u00a0" + L(units[plural === "one" ? 0 : plural === "few" ? 1 : 2]);
}
