// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's convertible owners and passers-by
// with the meaning of their lines in Lithuanian (replaces src/editions/es/content/rides.ts in this layer; the Spanish
// is the same, word for word: tests/es-lt checks it).

export interface RideLine { en: string; lt: string }
export interface RideOwner { id: string; female: boolean; take: RideLine[]; back: RideLine[] }

/** Who sits in which convertible (world/rides.ts: the cars' ids), the driver first. */
export const RIDE_OWNERS: Record<string, RideOwner[]> = {
  park: [
    // Valeria, in the pink one by the park: cheerful, quick to laugh
    {
      id: "park", female: true,
      take: [
        { en: "¡Claro, date una vuelta!", lt: "Žinoma, pasivažinėk!" },
        { en: "¡Oye, cuídamelo!", lt: "Ei, saugok jį!" },
        { en: "¡Todo tuyo! ¡Diviértete!", lt: "Jis visas tavo! Gerai pasilinksmink!" },
        { en: "¡Ve con cuidado, eh!", lt: "Važiuok atsargiai, gerai?" },
      ],
      back: [
        { en: "¡Gracias por traerlo de vuelta!", lt: "Ačiū, kad parvežei!" },
        { en: "¡Ni un rasguño! ¡Muy bien!", lt: "Nė įbrėžimo! Šaunu!" },
      ],
    },
  ],
  east: [
    // Don Rafa, in the turquoise one looking out to sea: unhurried, kind
    {
      id: "east", female: false,
      take: [
        { en: "¡Adelante, con confianza!", lt: "Pirmyn, drąsiai!" },
        { en: "Las llaves están puestas. ¡Disfrútalo!", lt: "Rakteliai viduje. Mėgaukis!" },
        { en: "Con calma en las curvas, ¿eh?", lt: "Posūkiuose ramiai, gerai?" },
        { en: "Sin prisa. Tengo todo el día.", lt: "Neskubėk. Turiu visą dieną." },
      ],
      back: [
        { en: "¿Ya de vuelta? ¡Qué rápido!", lt: "Jau grįžai? Kaip greitai!" },
        { en: "¡Gracias! Quedó como nuevo.", lt: "Ačiū! Kaip naujas." },
      ],
    },
  ],
  west: [
    // the pair in the yellow one: Marisol, dry and fond of her car
    {
      id: "west1", female: true,
      take: [
        { en: "Bueno, ¡pero lo quiero de vuelta antes del atardecer!", lt: "Gerai, bet noriu jį atgauti iki saulėlydžio!" },
        { en: "No te preocupes, tiene seguro.", lt: "Nesijaudink, jis apdraustas." },
        { en: "Trátalo bien. Es un clásico.", lt: "Elkis su juo gražiai. Tai klasika." },
        { en: "Está bien, está bien. ¡Ve a divertirte!", lt: "Gerai jau, gerai. Eik, pasilinksmink!" },
      ],
      back: [
        { en: "¡Ahí está! Gracias.", lt: "Štai ir jis! Ačiū." },
        { en: "¿Ves? Sabía que lo ibas a traer.", lt: "Matai? Žinojau, kad parveši." },
      ],
    },
    // and Beto, who can't wait for you to try it
    {
      id: "west2", female: false,
      take: [
        { en: "¡Te va a encantar!", lt: "Tau labai patiks!" },
        { en: "¡Prueba la radio! ¡Suena genial!", lt: "Išbandyk radiją! Skamba puikiai!" },
        { en: "¡Ve por el malecón, es precioso!", lt: "Važiuok krantine, ten labai gražu!" },
        { en: "¡Saluda cuando pases!", lt: "Pamojuok, kai važiuosi pro šalį!" },
      ],
      back: [
        { en: "¿Qué tal? Divertido, ¿verdad?", lt: "Na, kaip? Smagu, ar ne?" },
        { en: "¡Te dije que era genial!", lt: "Sakiau, kad puiku!" },
      ],
    },
  ],
};

/** What someone on foot calls out when a car goes by too close and too fast (a passer-by's voice). Nobody is ever hit. */
export const RIDE_SHOUTS: RideLine[] = [
  { en: "¡Oye, cuidado!", lt: "Ei, atsargiai!" },
  { en: "¡Eh, más despacio!", lt: "Ei, lėčiau!" },
  { en: "¡Cuidado!", lt: "Atsargiai!" },
  { en: "¡Con calma!", lt: "Ramiau!" },
  { en: "¡Mira por dónde vas!", lt: "Žiūrėk, kur važiuoji!" },
  { en: "¡Despacio, por favor!", lt: "Lėčiau, prašau!" },
];

/** What the things are called, for the prompt: in Spanish, and what that means in Lithuanian. */
export const RIDE_NAMES = { car: { en: "Convertible", lt: "Kabrioletas" }, boat: { en: "Lancha", lt: "Motorinė valtis" } };
