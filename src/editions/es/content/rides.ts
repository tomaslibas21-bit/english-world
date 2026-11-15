// The people in Puerto Colibrí's convertibles and what they say (replaces src/content/rides.ts): each has a voice of
// their own and a few lines of their own; and what passers-by call after a car that goes by too close and too fast.
// Spanish that is said the same in every country (one text for the Mexican, the neutral and Spain's set; only the
// voices differ), with the English meaning.

export interface RideLine { en: string; lt: string }
export interface RideOwner { id: string; female: boolean; take: RideLine[]; back: RideLine[] }

/** Who sits in which convertible (world/rides.ts: the cars' ids), the driver first. */
export const RIDE_OWNERS: Record<string, RideOwner[]> = {
  park: [
    // Valeria, in the pink one by the park: cheerful, quick to laugh
    {
      id: "park", female: true,
      take: [
        { en: "¡Claro, date una vuelta!", lt: "Sure, take it for a spin!" },
        { en: "¡Oye, cuídamelo!", lt: "Hey, take good care of it for me!" },
        { en: "¡Todo tuyo! ¡Diviértete!", lt: "It's all yours! Have fun!" },
        { en: "¡Ve con cuidado, eh!", lt: "Drive carefully, okay!" },
      ],
      back: [
        { en: "¡Gracias por traerlo de vuelta!", lt: "Thanks for bringing it back!" },
        { en: "¡Ni un rasguño! ¡Muy bien!", lt: "Not a scratch! Well done!" },
      ],
    },
  ],
  east: [
    // Don Rafa, in the turquoise one looking out to sea: unhurried, kind
    {
      id: "east", female: false,
      take: [
        { en: "¡Adelante, con confianza!", lt: "Go ahead, feel free!" },
        { en: "Las llaves están puestas. ¡Disfrútalo!", lt: "The keys are in it. Enjoy it!" },
        { en: "Con calma en las curvas, ¿eh?", lt: "Take the bends gently, okay?" },
        { en: "Sin prisa. Tengo todo el día.", lt: "No rush. I have all day." },
      ],
      back: [
        { en: "¿Ya de vuelta? ¡Qué rápido!", lt: "Back already? That was quick!" },
        { en: "¡Gracias! Quedó como nuevo.", lt: "Thanks! It's as good as new." },
      ],
    },
  ],
  west: [
    // the pair in the yellow one: Marisol, dry and fond of her car
    {
      id: "west1", female: true,
      take: [
        { en: "Bueno, ¡pero lo quiero de vuelta antes del atardecer!", lt: "All right, but I want it back before sunset!" },
        { en: "No te preocupes, tiene seguro.", lt: "Don't worry, it's insured." },
        { en: "Trátalo bien. Es un clásico.", lt: "Treat it well. It's a classic." },
        { en: "Está bien, está bien. ¡Ve a divertirte!", lt: "All right, all right. Go have fun!" },
      ],
      back: [
        { en: "¡Ahí está! Gracias.", lt: "There it is! Thank you." },
        { en: "¿Ves? Sabía que lo ibas a traer.", lt: "See? I knew you'd bring it back." },
      ],
    },
    // and Beto, who can't wait for you to try it
    {
      id: "west2", female: false,
      take: [
        { en: "¡Te va a encantar!", lt: "You're going to love it!" },
        { en: "¡Prueba la radio! ¡Suena genial!", lt: "Try the radio! It sounds great!" },
        { en: "¡Ve por el malecón, es precioso!", lt: "Go along the malecón, it's beautiful!" },
        { en: "¡Saluda cuando pases!", lt: "Wave when you go by!" },
      ],
      back: [
        { en: "¿Qué tal? Divertido, ¿verdad?", lt: "How was it? Fun, right?" },
        { en: "¡Te dije que era genial!", lt: "I told you it was great!" },
      ],
    },
  ],
};

/** What someone on foot calls out when a car goes by too close and too fast (a passer-by's voice). Nobody is ever hit. */
export const RIDE_SHOUTS: RideLine[] = [
  { en: "¡Oye, cuidado!", lt: "Hey, watch out!" },
  { en: "¡Eh, más despacio!", lt: "Hey, slow down!" },
  { en: "¡Cuidado!", lt: "Careful!" },
  { en: "¡Con calma!", lt: "Easy there!" },
  { en: "¡Mira por dónde vas!", lt: "Watch where you're going!" },
  { en: "¡Despacio, por favor!", lt: "Slowly, please!" },
];

/** What the things are called, for the prompt: in Spanish, and what that means in English ("": the same word). */
export const RIDE_NAMES = { car: { en: "Convertible", lt: "" }, boat: { en: "Lancha", lt: "Motorboat" } };
