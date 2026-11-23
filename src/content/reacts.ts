// The town reacts (batch 5, item 3): what people call out when the learner walks out in front of a moving car, bumps
// into someone on the pavement, jumps onto a car, crashes a car into another one, takes a boat from the shore or swims
// out too far. One short, friendly line, said by the person concerned, in a bubble over their head (the meaning on
// tap), in their own voice where it is recorded. Never rude; never more than now and then (game/life/reacts.ts keeps
// the cooldowns). The practised language and the learner's: each edition has its own file of this name.
export interface ReactLine { en: string; lt: string; neutral?: string }

/** Who says it, by what happened:
 *  - `honk`: the driver of a car of the traffic that had to stop for the learner on foot (after the horn);
 *  - `bump`: a passer-by the learner walked or ran into;
 *  - `carJumpOwner`: someone sitting in the car the learner jumped onto (a convertible's owner);
 *  - `carJump`: a passer-by nearby, when the learner jumps onto a parked car nobody sits in;
 *  - `crashDriver`: the driver of a car of the traffic the learner crashed into;
 *  - `crash`: a passer-by nearby, when the learner crashes into a parked car;
 *  - `boat`: someone on the shore or the pier, when the learner takes a boat from there;
 *  - `swim`: someone on the beach, when the learner swims out far. */
export type ReactKind = "honk" | "bump" | "carJumpOwner" | "carJump" | "crashDriver" | "crash" | "boat" | "swim";

export const REACT_LINES: Record<ReactKind, ReactLine[]> = {
  honk: [
    { en: "Look both ways first!", lt: "Pirma pažiūrėk į abi puses!" },
    { en: "Use the crosswalk, okay?", lt: "Eik per perėją, gerai?" },
    { en: "Wait till the cars stop!", lt: "Palauk, kol mašinos sustos!" },
    { en: "Heads up! Watch for cars!", lt: "Dėmesio! Saugokis mašinų!" },
  ],
  bump: [
    { en: "Oh, sorry about that!", lt: "Oi, atsiprašau!" },
    { en: "Excuse me!", lt: "Atsiprašau!" },
    { en: "Sorry, didn't see you!", lt: "Atsiprašau, nepastebėjau tavęs!" },
  ],
  carJumpOwner: [
    { en: "Want to drive? Hop in!", lt: "Nori pavairuoti? Sėsk!" },
    { en: "Whoa! You shook the whole car!", lt: "Oho! Net visa mašina sujudėjo!" },
  ],
  carJump: [
    { en: "Careful getting down!", lt: "Nulipk atsargiai!" },
    { en: "That's somebody's car!", lt: "Juk čia kažkieno mašina!" },
  ],
  crashDriver: [
    { en: "Well, it's just a dent.", lt: "Na, tik įlenkimas." },
    { en: "I'm okay. How about you?", lt: "Man viskas gerai. O tau?" },
  ],
  crash: [
    { en: "Oof! That'll leave a mark.", lt: "Oi! Liks žymė." },
  ],
  boat: [
    { en: "Have fun out there! Bring the boat back!", lt: "Smagiai paplaukiok! Tik parplukdyk valtį!" },
  ],
  swim: [
    { en: "Come on back to shore!", lt: "Parplauk į krantą!" },
  ],
};
