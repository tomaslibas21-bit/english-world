export const KEEPER_NPC = "lighthouse_keeper";
export const KEEPER_SIT = "x05-lighthouse-keeper";
export const KEEPER_PLACE = { en: "Lighthouse", lt: "Švyturys" };
export const KEEPER_ROLE = { en: "Lighthouse keeper", lt: "Švyturio prižiūrėtojas" };
export const KEEPER_TITLE = { en: "A Visit to the Lighthouse", lt: "Viešnagė švyturyje" };
export const KEEPER_MAP_DETAIL = "Prie namelio laukia švyturio prižiūrėtojas.";
export const KEEPER_TALK = "Pasikalbėti su prižiūrėtoju";
export const KEEPER_ANSWER = "Atsakyti";
export const keeperAnswerName = (en: string) => `${KEEPER_ANSWER}: ${en}`;

export const KEEPER_LOOK = {
  skin: "#d3a07f", hair: { style: "short" as const, color: "#bfc1be" },
  acc: ["beard" as const], top: "#284c59", bottom: "#71604e", shoes: "#374548",
  height: 1.02, build: 1.08, face: { lines: true },
};
