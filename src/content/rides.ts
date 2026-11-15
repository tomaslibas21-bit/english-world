// The people in the convertibles and what they say (src/game/rides): each has a voice of their own and a few lines of
// their own, so the same words seldom come twice: `take`, as they hop out and leave you the wheel; `back`, when they
// have their car again. And what passers-by call out when a car goes by too close and too fast. A bubble with its
// meaning, and their recorded voice (docs/RIDES.md "Voices"). The practised language and the learner's: each edition
// has its own file of this name.
export interface RideLine { en: string; lt: string }
/** Someone who sits in a convertible: `id` is their voice's (content/voices.ts `rideVoice`). */
export interface RideOwner { id: string; female: boolean; take: RideLine[]; back: RideLine[] }

/** Who sits in which convertible (world/rides.ts: the cars' ids), the driver first. */
export const RIDE_OWNERS: Record<string, RideOwner[]> = {
  // Jess, in the turquoise one by the park: cheerful, quick to laugh
  park: [{
    id: "park", female: true,
    take: [
      { en: "Sure, take it for a spin!", lt: "Žinoma, pasivažinėk!" },
      { en: "Hey, bring it back in one piece!", lt: "Ei, tik parvežk ją sveiką!" },
      { en: "Go ahead! Just watch the paint.", lt: "Pirmyn! Tik saugok dažus." },
      { en: "It's all yours. Have fun!", lt: "Ji tavo. Gerai pasivažinėk!" },
    ],
    back: [
      { en: "Thanks for bringing it back!", lt: "Ačiū, kad parvežei!" },
      { en: "Not a scratch? Nice driving!", lt: "Nė įbrėžimo? Gerai vairuoji!" },
    ],
  }],
  // Walt, in the yellow one looking out to sea: unhurried, kind
  east: [{
    id: "east", female: false,
    take: [
      { en: "Go for it, buddy!", lt: "Pirmyn, bičiuli!" },
      { en: "The keys are in it. Enjoy the ride!", lt: "Rakteliai viduje. Gero kelio!" },
      { en: "Take it easy on the brakes, okay?", lt: "Stabdyk švelniai, gerai?" },
      { en: "No rush. I've got all day.", lt: "Neskubėk. Turiu visą dieną." },
    ],
    back: [
      { en: "Back already? That was quick!", lt: "Jau grįžai? Greitai apsisukai!" },
      { en: "Thanks! Good as new.", lt: "Ačiū! Kaip nauja." },
    ],
  }],
  // the pair in the coral one: Carol, dry and fond of her car; Pete, who can't wait for you to try it
  west: [{
    id: "west1", female: true,
    take: [
      { en: "Fine, but I want it back by sunset!", lt: "Gerai, bet noriu ją atgauti iki saulėlydžio!" },
      { en: "Don't worry, it's insured.", lt: "Nesijaudink, ji apdrausta." },
      { en: "Be nice to her. She's a classic.", lt: "Elkis su ja gražiai. Ji – klasika." },
      { en: "Okay, okay. Go have your fun.", lt: "Gerai jau, gerai. Eik, pasilinksmink." },
    ],
    back: [
      { en: "There she is! Thank you.", lt: "Štai ir ji! Ačiū." },
      { en: "See? I knew you'd bring it back.", lt: "Matai? Žinojau, kad parveši." },
    ],
  }, {
    id: "west2", female: false,
    take: [
      { en: "Oh, you're going to love this car!", lt: "O, tau ši mašina labai patiks!" },
      { en: "Try the radio. It's great!", lt: "Išbandyk radiją. Jis puikus!" },
      { en: "Take the road by the sea!", lt: "Važiuok keliu palei jūrą!" },
      { en: "Wave when you drive by!", lt: "Pamojuok, kai važiuosi pro šalį!" },
    ],
    back: [
      { en: "How was it? Fun, right?", lt: "Na, kaip? Smagu, ar ne?" },
      { en: "Told you it was a great car!", lt: "Sakiau, kad puiki mašina!" },
    ],
  }],
};

/** What someone on foot calls out when a car goes by too close and too fast (in a passer-by's voice, a woman's or a
 *  man's). Nobody is ever hit: they jump aside, and this is all there is to it. */
export const RIDE_SHOUTS: RideLine[] = [
  { en: "Hey, watch out!", lt: "Ei, atsargiai!" },
  { en: "Whoa, slow down!", lt: "Oho, lėčiau!" },
  { en: "Hey, careful!", lt: "Ei, atsargiau!" },
  { en: "Easy there!", lt: "Ramiau!" },
  { en: "Watch where you're going!", lt: "Žiūrėk, kur važiuoji!" },
  { en: "Slow down, please!", lt: "Lėčiau, prašau!" },
];

/** What the things are called, for the prompt ("Vairuoti: …", "Plaukti: …"): in the practised language, and what
 *  that means in the learner's under it ("": the same word). */
export const RIDE_NAMES = { car: { en: "Convertible", lt: "Kabrioletas" }, boat: { en: "Motorboat", lt: "Motorinė valtis" } };
