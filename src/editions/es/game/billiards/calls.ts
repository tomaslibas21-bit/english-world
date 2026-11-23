import { BALL_WORDS } from "@/content/billiards-lines";
import { foldAccents } from "@/convo/normalize";
import type { Call } from "@/game/billiards/calls";
import type { Pocket } from "@/game/billiards/physics";

const direction = "(izquierda|derecha)";
const end = "(de alla|del fondo|de aca|de aqui)";
const corner = "(?:(?:de la )?esquina )?";
const address = "(?:(?:a la|a|la) )?(?:(?:buchaca|tronera) )?";
const cornerFirst = new RegExp(`^${address}${corner}${end} (?:a la )?${direction}$`);
const directionFirst = new RegExp(`^${address}${corner}(?:a la )?${direction} ${end}$`);
const middle = new RegExp(`^${address}(?:de en medio|del medio|del centro) (?:a la )?${direction}$`);

export function parseCall(text: string): Call | null {
  const words = foldAccents(text.toLowerCase()).match(/[a-z]+|\d+/g)?.join(" ") ?? "";
  const match = /^(?:la )?(?:bola )?([a-z]+|\d+) (.+)$/.exec(words);
  if (!match) return null;
  const ball = /^\d+$/.test(match[1]) ? Number(match[1]) : BALL_WORDS.indexOf(match[1]) + 1;
  if (ball < 1 || ball > 15) return null;

  const pocket = match[2];
  const side = middle.exec(pocket);
  if (side) return { ball, pocket: side[1] === "izquierda" ? "ls" : "rs" };
  const first = cornerFirst.exec(pocket);
  const second = directionFirst.exec(pocket);
  const distance = first?.[1] ?? second?.[2];
  const edge = first?.[2] ?? second?.[1];
  if (!distance || !edge) return null;
  const row = distance === "de alla" || distance === "del fondo" ? "f" : "n";
  return { ball, pocket: `${row}${edge === "izquierda" ? "l" : "r"}` as Pocket };
}
