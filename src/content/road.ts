export const ROAD_CONES = ["cone.glb", "cone-flat.glb"] as const;

export const ROAD_UI = {
  title: "Kelias per dykumą", hint: "Klausykite ir važiuokite pro teisingus vartus",
  hear: "Ką išgirdote?", gap: "Kurio žodžio trūksta?", replay: "Klausyti dar kartą",
  right: "Teisingai!", wrong: "Ne visai. Teisingai:", streak: "Serija",
  ghost: "Geriausias važiavimas", time: "Laikas",
  controls: "Vairuokite rodyklėmis · Tarpas – driftas · H – signalas",
  drift: "Driftas", horn: "Signalas", drive: "Vairuoti",
  finish: "Važiavimas baigtas", points: "Taškai", correct: "Teisingi vartai",
  bestStreak: "Ilgiausia serija", distance: "Nuvažiuota", record: "Naujas rekordas!",
  missed: "Šiuos žodžius verta pakartoti", from: "Šis žodis skamba čia:", guide: "Nuvesk mane",
  again: "Dar kartą", town: "Atgal į miestą",
  cards: "Frazių kortelės", micOn: "Įjungti mikrofoną", micOff: "Išjungti mikrofoną",
  unavailable: "Pirmiausia pakalbėkite su žmonėmis mieste – tada čia atsiras žodžių.",
} as const;

// The west end of Main Street, beyond the traffic's turnaround.
export const ROAD_EDITION = {
  id: "maple-harbor",
  walkAnywhere: true,
  sign: "Desert Road",
  driver: { npc: "vinnie", situation: "s66-taxi" },
  edge: {
    street: "Main Street", x: -109.7, z: -8, width: 10, outward: -Math.PI / 2,
    sign: { x: -107, z: -1, rot: Math.PI / 2 },
    return: { x: -104.5, z: -9.65, rot: Math.PI / 2 },
  },
} as const;
