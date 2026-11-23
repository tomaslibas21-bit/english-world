// The town reacts (replaces src/content/reacts.ts): what people in Puerto Colibrí call out when the learner walks out
// in front of a moving car, bumps into someone, jumps onto a car, crashes a car into another one, takes a boat from
// the shore or swims out too far. Short and friendly, usted to a stranger. A line with a Mexican-only word has its
// `neutral` twin (shown and voiced for the neutral and Spain's Spanish); the rest is said the same everywhere. With the
// English meaning (the Lithuanian layer: src/editions/es-lt/content/reacts.ts).
export interface ReactLine { en: string; lt: string; neutral?: string }

export type ReactKind = "honk" | "bump" | "carJumpOwner" | "carJump" | "crashDriver" | "crash" | "boat" | "swim";

export const REACT_LINES: Record<ReactKind, ReactLine[]> = {
  honk: [
    { en: "¡Aguas! ¡Mire antes de cruzar!", lt: "Heads up! Look before you cross!", neutral: "¡Cuidado! ¡Mire antes de cruzar!" },
    { en: "¡Ojo, vienen autos!", lt: "Careful, cars coming!" },
    { en: "¡Use el cruce peatonal, por favor!", lt: "Please use the crosswalk!" },
    { en: "¡Espere a que paren los autos!", lt: "Wait till the cars stop!" },
  ],
  bump: [
    { en: "¡Uy, disculpe!", lt: "Oh, sorry!" },
    { en: "Perdón, no me fijé.", lt: "Sorry, I wasn't looking." },
    { en: "¿Todo bien?", lt: "You okay?" },
  ],
  carJumpOwner: [
    { en: "¡Si quiere manejar, le abro la puerta!", lt: "Want to drive? I'll open the door!" },
    { en: "¡Uy, se movió todo el auto!", lt: "Whoa! The whole car shook!" },
  ],
  carJump: [
    { en: "¡Baje con cuidado, por favor!", lt: "Careful getting down, please!" },
    { en: "¡Ese carro tiene dueño!", lt: "That's somebody's car!", neutral: "¡Ese auto tiene dueño!" },
  ],
  crashDriver: [
    { en: "¿Está bien? Es solo una abolladura.", lt: "You okay? It's just a dent." },
    { en: "Estoy bien. ¿Y usted?", lt: "I'm okay. How about you?" },
  ],
  crash: [
    { en: "¡Uf, quedó una abolladura!", lt: "Oof, that left a dent!" },
  ],
  boat: [
    { en: "¡Que disfrute el paseo!", lt: "Enjoy the ride!" },
  ],
  swim: [
    { en: "¡Vuelva a la orilla, por favor!", lt: "Come back to shore, please!" },
  ],
};
