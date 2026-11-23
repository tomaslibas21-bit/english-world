// Text messages (replaces src/content/texts.ts): now and then someone the learner has met in Puerto Colibrí sends a
// short thread to the town phone, after its conversation (`after`): `later` = once the learner has walked the town a
// while after it, `nextDay` = on a later day. Friends write tú, neighbors and older people usted, as in their
// conversations. A line with a Mexican-only word has its `neutral` twin. With the English meaning (the Lithuanian
// layer: src/editions/es-lt/content/texts.ts).
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
      { en: "¡Buenos días! A Natalia y a mí nos encantó cenar contigo.", lt: "Morning! Natalia and I loved having you over for dinner." },
      { en: "Quedó flan. Adivina qué voy a desayunar. 😄", lt: "There's flan left. Guess what I'm having for breakfast. 😄" },
    ],
    replies: [
      { en: "¡Gracias por invitarme! ¿Quién hizo el flan?", lt: "Thanks for having me! Who made the flan?",
        answer: [{ en: "Natalia. Es la receta de su abuela.", lt: "Natalia. It's her grandma's recipe." }] },
      { en: "¿Flan para desayunar? ¡Qué buena idea!", lt: "Flan for breakfast? Great idea!",
        answer: [{ en: "¡Sí! Y ni siquiera tengo que cocinar.", lt: "Yep! And I don't even have to cook." }] },
    ],
  },
  {
    id: "rita-package", from: "rita", after: "s82-neighbor", wait: "nextDay",
    lines: [
      { en: "¡Buenos días! Soy Lupita, la del 1C.", lt: "Good morning! It's Lupita from 1C." },
      { en: "El repartidor me dejó un paquete para usted.", lt: "The delivery guy left your package with me." },
    ],
    replies: [
      { en: "Gracias, Doña Lupita. ¿Puedo pasar a recogerlo?", lt: "Thanks, Doña Lupita. Can I come by to pick it up?",
        answer: [{ en: "Claro, toque el timbre cuando le quede bien.", lt: "Sure, just ring the doorbell whenever works for you." }] },
      { en: "¡Qué amable, Doña Lupita! Gracias por guardármelo.", lt: "That's so kind of you, Doña Lupita! Thanks for holding on to it.",
        answer: [{ en: "De nada. Su paquete y yo estamos aquí al lado. 😊", lt: "You're welcome. Your package and I are right next door. 😊" }] },
    ],
  },
  {
    id: "memo-tournament", from: "memo", after: "x11-billar", wait: "later",
    lines: [
      { en: "Soy Don Memo. Habrá un torneo de billar en La Buchaca. 🎱", lt: "It's Don Memo. There's a pool tournament coming up at La Buchaca. 🎱" },
      { en: "Si se anima, venga a jugar.", lt: "Come play if you feel like it." },
    ],
    replies: [
      { en: "¡Cuente conmigo! ¿También hay que cantar cada tiro?", lt: "Count me in! Do we call every shot this time, too?",
        answer: [{ en: "Sí. Cante la bola y la buchaca antes de tirar.", lt: "Yes. Call the ball and the pocket before you shoot.", neutral: "Sí. Cante la bola y la tronera antes de tirar." }] },
      { en: "Esta vez paso. ¡Gracias por avisarme!", lt: "I'll sit this one out. Thanks for letting me know!",
        answer: [{ en: "Cuando quiera, venga a jugar otra partida.", lt: "Come by for another game whenever you like." }] },
    ],
  },
  {
    id: "lucy-coffee", from: "lucy", after: "s86-old-friend", wait: "later",
    lines: [
      { en: "¡Qué gusto encontrarte en el zócalo después de tantos años!", lt: "It was so good to run into you in the square after all these years!" },
      { en: "¿Vamos por un café a La Ceiba? ☕", lt: "Want to get coffee at La Ceiba? ☕" },
    ],
    replies: [
      { en: "¡Sí! Tenemos mucho de qué hablar.", lt: "Yes! We have a lot to catch up on.",
        answer: [{ en: "¡Y que esta vez no pasen tantos años!", lt: "Let's not wait so many years this time!" }] },
      { en: "¿La próxima semana te queda bien?", lt: "Does next week work for you?",
        answer: [{ en: "¡Va! Te escribo y vemos qué día.", lt: "Sounds good! I'll text you and we'll pick a day.", neutral: "¡De acuerdo! Te escribo y vemos qué día." }] },
    ],
  },
  {
    id: "tona-loteria", from: "tona", after: "x10-loteria", wait: "later",
    lines: [
      { en: "Hola, soy Doña Toña. El viernes hay lotería en el zócalo.", lt: "Hi, it's Doña Toña. There's lotería in the square on Friday." },
      { en: "Si viene, le guardo una tablita y unos frijolitos.", lt: "If you come, I'll save you a board and some beans." },
    ],
    replies: [
      { en: "Iré con gusto. ¿Me guarda un lugar a su lado?", lt: "I'd love to come. Can you save me a seat next to you?",
        answer: [{ en: "Claro. Desde ahí se oye bien a Don Beto.", lt: "Of course. You'll be able to hear Don Beto from there." }] },
      { en: "Este viernes no puedo. ¡Que se divierta, Doña Toña!", lt: "I can't this Friday. Have fun, Doña Toña!",
        answer: [{ en: "¡Gracias! Jugamos todos los viernes. Venga cuando quiera.", lt: "Thanks! We play every Friday. Come whenever you like." }] },
    ],
  },
];
