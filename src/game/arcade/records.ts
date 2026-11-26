import { BARISTA_CONVERSATION } from "../../content/barista";
import { GOFISH_CONVERSATION } from "../../content/gofish";
import { PHOTO_THINGS } from "../../content/photo-walk-lines";
import { readPlayStats } from "../../state/playStats";
import { sitProgress, type Progress } from "../../state/progress";
import { readBest } from "../road/ghost";
import type { Cabinet, TownGame } from "./cabinets";

export const TOWN_DETAILS = {
  taxi: { title: "Drive a taxi", lt: "Vairuoti taksi", place: "Prie taksi stotelės." },
  sea: { title: "Open Sea", lt: "Atvira jūra", place: "Paplūdimyje įlipk į valtį ir plauk už plūdurų." },
  surf: { title: "Surf lesson", lt: "Banglenčių pamoka", place: "Prie „Harbor Surf“ prekystalio tavęs laukia Maren." },
  photowalk: { title: "Photo walk", lt: "Fotografavimo žygis", place: "Hana su nuotraukų albumu stovi prie Lankytojų centro." },
  gofish: { title: "Go Fish", lt: "Kortų žaidimas „Go Fish“", place: "Dano ir Noros namuose." },
  barista: { title: "Work a café shift", lt: "Dirbti pamainą kavinėje", place: "Prie „Sunny Cup“ prekystalio." },
  gym: { title: "Gym workout", lt: "Treniruotė sporto klube", place: "Sporto klube, prie kilimėlio." },
} satisfies Record<TownGame, { title: string; lt: string; place: string }>;

export function prerequisite(id: TownGame | Cabinet, progress: Progress) {
  if (id === "gofish" && !sitProgress(progress, GOFISH_CONVERSATION.situation).completions)
    return "Pirmiausia užbaik vakarienę su Danu ir Nora.";
  if (id === "barista" && !sitProgress(progress, BARISTA_CONVERSATION.situation).completions)
    return "Pirmiausia užbaik pokalbį kavinėje.";
}

export function arcadeRecord(id: TownGame | Cabinet, progress: Progress) {
  if (id === "road" || id === "sea") {
    const points = readBest("maple-harbor", undefined, id)?.points;
    return { label: "Asmeninis rekordas", value: points ?? "Rezultato dar nėra" };
  }
  if (id === "surf") {
    const waves = progress.surf?.waves;
    return { label: "Įveiktos bangos", value: typeof waves === "number" && Number.isSafeInteger(waves) && waves >= 0 ? waves : 0 };
  }
  if (id === "photowalk") {
    const found = progress.photoWalk?.found;
    const count = PHOTO_THINGS.filter(({ id }) => Array.isArray(found) && found.includes(id)).length;
    return { label: "Nufotografuoti objektai", value: `${count} / ${PHOTO_THINGS.length}` };
  }
  return { label: id === "barista" ? "Pradėtos pamainos" : "Pradėti žaidimai", value: readPlayStats(progress).games[id] ?? 0 };
}

const pointUnits = ["taškas", "taškai", "taškų"] as const;
const gameUnits = ["žaidimas", "žaidimai", "žaidimų"] as const;
const shiftUnits = ["pamaina", "pamainos", "pamainų"] as const;
const waveUnits = ["banga", "bangos", "bangų"] as const;
const ltPlural = new Intl.PluralRules("lt");
const ltNumber = new Intl.NumberFormat("lt-LT");

/** Keep the measurement with its unit, including the genitive after zero, tens and teens. */
export function formatArcadeMetric(id: TownGame | Cabinet, value: string | number) {
  if (typeof value === "string") return value;
  const units = id === "road" || id === "sea" ? pointUnits : id === "surf" ? waveUnits
    : id === "barista" ? shiftUnits : gameUnits;
  const plural = ltPlural.select(value);
  return ltNumber.format(value) + "\u00a0" + units[plural === "one" ? 0 : plural === "few" ? 1 : 2];
}
