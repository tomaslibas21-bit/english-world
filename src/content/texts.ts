// Text messages (batch 5, item 4): now and then someone the learner has already met sends a short thread to the town
// phone. Each one arrives after its conversation has been done (`after`): `later` = once the learner has walked the
// town a while after it, `nextDay` = on a later day. The meaning of every message shows on tap; replying is optional,
// with one or two replies to pick from, and the person answers the reply. The practised language and the learner's:
// each edition has its own file of this name.
export interface TextLine { en: string; lt: string; neutral?: string }
export interface TextReply extends TextLine { answer: TextLine[] }
export interface TextThread {
  id: string;
  /** Who writes (content/npcs.ts id): their name and face come from there. */
  from: string;
  /** The conversation after which it comes (its id). */
  after: string;
  wait: "later" | "nextDay";
  lines: TextLine[];
  replies: TextReply[];
}

export const TEXT_THREADS: TextThread[] = [
  {
    id: "dan-dinner", from: "dan", after: "s85-dinner", wait: "nextDay",
    lines: [
      { en: "Morning! Nora and I had a great time last night.", lt: "Labas rytas! Mums su Nora vakar buvo labai smagu." },
      { en: "I'm having the last piece of lasagna for breakfast. 😄", lt: "Pusryčiams valgau paskutinį lazanijos gabalėlį. 😄" },
    ],
    replies: [
      { en: "Thanks for having me! The lasagna was so good.", lt: "Ačiū, kad pakvietėte! Lazanija buvo labai skani.",
        answer: [{ en: "I'll tell Nora. It's her recipe!", lt: "Pasakysiu Norai. Čia jos receptas!" }] },
      { en: "I'd eat lasagna for breakfast, too.", lt: "Ir aš pusryčiams valgyčiau lazaniją.",
        answer: [{ en: "It's even better the next day!", lt: "Kitą dieną ji dar skanesnė!" }] },
    ],
  },
  {
    id: "rita-package", from: "rita", after: "s82-neighbor", wait: "nextDay",
    lines: [
      { en: "Hi! It's Rita from next door.", lt: "Labas! Čia Rita iš gretimo buto." },
      { en: "I took in a package for you.", lt: "Priėmiau tau skirtą siuntinį." },
    ],
    replies: [
      { en: "Thanks! Can I come by later?", lt: "Ačiū! Ar galiu vėliau užsukti?",
        answer: [{ en: "Of course! Just knock.", lt: "Žinoma! Tiesiog pasibelsk." }] },
      { en: "Thanks for taking it in!", lt: "Ačiū, kad priėmei siuntinį!",
        answer: [{ en: "Anytime! Glad I could help.", lt: "Visada prašom! Smagu, kad galėjau padėti." }] },
    ],
  },
  {
    id: "tina-tournament", from: "tina", after: "x01-pool-hall", wait: "later",
    lines: [
      { en: "It's Tina! There's a pool tournament coming up. 🎱", lt: "Čia Tina! Netrukus bus biliardo turnyras. 🎱" },
      { en: "Come play if you feel like it.", lt: "Jei norėsi, ateik pažaisti." },
    ],
    replies: [
      { en: "Count me in!", lt: "Aš dalyvauju!",
        answer: [{ en: "Great! Remember to call the ball and the pocket.", lt: "Puiku! Nepamiršk pasakyti, kurį kamuolį į kurią kišenę muši." }] },
      { en: "I'll sit this one out, but thanks!", lt: "Šįkart praleisiu, bet ačiū!",
        answer: [{ en: "No problem. We can play another time.", lt: "Nieko tokio. Galėsim pažaisti kitą kartą." }] },
    ],
  },
  {
    id: "lucy-coffee", from: "lucy", after: "s86-old-friend", wait: "later",
    lines: [
      { en: "It was so good to see you at the market!", lt: "Buvo taip smagu sutikti tave turguje!" },
      { en: "Let's catch up over coffee sometime. ☕", lt: "Gal kada susitinkam kavos ir pasikalbam? ☕" },
    ],
    replies: [
      { en: "I'd love to! We have a lot to catch up on.", lt: "Mielai! Turėsim apie ką pasikalbėti.",
        answer: [{ en: "After all these years, we might need a second cup!", lt: "Po tiek metų gali prireikti ir antro puodelio!" }] },
      { en: "Sounds good! Maybe next week?", lt: "Puiki mintis! Gal kitą savaitę?",
        answer: [{ en: "Next week works for me!", lt: "Man tinka kita savaitė!" }] },
    ],
  },
  {
    id: "maria-coffee", from: "maria", after: "s88-first-day", wait: "nextDay",
    lines: [
      { en: "Morning! I'm at the coffee machine by the fridge.", lt: "Labas rytas! Aš prie kavos aparato šalia šaldytuvo." },
      { en: "Want a cup? I'm making one anyway. ☕", lt: "Nori kavos? Kaip tik darausi. ☕" },
    ],
    replies: [
      { en: "Yes, please! Thanks for showing me around.", lt: "Taip, prašau! Ačiū, kad aprodei biurą.",
        answer: [{ en: "Anytime! See you in the kitchen.", lt: "Visada prašom! Pasimatysim virtuvėje." }] },
      { en: "Thanks! I'll grab some later.", lt: "Ačiū! Išgersiu kavos vėliau.",
        answer: [{ en: "Sure thing! See you in a bit.", lt: "Gerai! Tuoj pasimatysim." }] },
    ],
  },
];
