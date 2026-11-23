// Street life in Puerto Colibrí (batch 5): 24 street moments and 20 overheard chatters. Shape:
// ../game/street/types.ts. `en` = Spanish (Mexican by default; `neutral` / `spain` twins), `lt` = natural English
// (the Lithuanian layer comes from ../street-lt.json). ROSTER: ids, kinds, cast, props, voices and `near` are fixed;
// i_dropped.first and the chatter c_calor are the tone examples; every other script is a stub to replace.
import type { StreetChatter, StreetLine, StreetMoment, StreetScript } from "@/game/street/types";

const L = (en: string, lt: string, twins: { neutral?: string; spain?: string } = {}): StreetLine => ({ en, lt, ...twins });
const stub = (): StreetScript => ({ choices: [{ say: L("¡Hola!", "Hi!") }], reply: [L("¡Buenas!", "Hi there!")] });

export const STREET_MOMENTS: StreetMoment[] = [
  // ---------------------------------------------------------------- regulars
  { id: "r_trovador", kind: "regular", near: "square",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Street singer", name: "Don Chucho", prop: "guitar", voice: "st_chucho" },
      { id: "b", gender: "m", age: "old", role: "Street singer", name: "Don Chucho", prop: "small_guitar", voice: "st_chucho" },
    ],
    first: {
      open: [L("¿Le gustan los boleros?", "Do you like boleros?"),
        L("También canto trova yucateca.", "I sing Yucatecan ballads, too.")],
      choices: [
        { say: L("Sí. ¿Me canta un bolero?", "Yes. Could you sing me a bolero?"),
          reply: [L("Con gusto. Este es para escuchar a la sombra.", "I'd love to. This one's for listening in the shade.")] },
        { say: L("¿Y cómo es la trova?", "And what are those ballads like?"),
          reply: [L("Canciones de amor, casi siempre. Con guitarra, claro.", "Mostly love songs. With a guitar, of course.")] },
      ],
      away: L("¡Que disfrute el paseo!", "Enjoy your stroll!"),
    },
    second: {
      open: [L("¡Qué gusto {m:verlo|f:verla} por aquí otra vez!", "Good to see you here again!", { spain: "¡Qué alegría {m:verlo|f:verla} por aquí otra vez!" }),
        L("Soy Chucho. Aquí me dicen Don Chucho.", "I'm Chucho. Around here they call me Don Chucho.")],
      choices: [
        { say: L("Mucho gusto, Don Chucho.", "Nice to meet you, Don Chucho."),
          reply: [L("Igualmente. Da gusto cantar cuando alguien se queda.", "Likewise. It's nice when someone stays to listen.")] },
        { say: L("¿Hace mucho que canta aquí?", "Have you been singing here long?"),
          reply: [L("Desde hace años. El kiosco ya me conoce bien.", "For years. The bandstand knows me pretty well by now.")] },
      ],
      away: L("¡Nos vemos en el zócalo!", "See you in the square!"),
      named: true,
    },
    familiar: {
      open: [L("¡Buenas! Hoy le toca escoger la canción.", "Hello! You get to pick the song today."),
        L("¿Un bolero o una de trova?", "A bolero or a ballad?")],
      choices: [
        { say: L("Un bolero, por favor.", "A bolero, please."),
          reply: [L("Con gusto. Este bolero va para usted.", "Of course. This bolero is for you.")] },
        { say: L("Una de trova, por favor.", "A ballad, please."),
          reply: [L("Esta se la dedico. Es de aquí, de Yucatán.", "This one's for you. It's from right here in Yucatán.")] },
      ],
      away: L("La canción se queda para otro día.", "I'll save the song for another day."),
    },
  },
  { id: "r_elotes", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Corn vendor", name: "Don Beto", prop: "cart", propKind: "elotes", voice: "st_beto" },
      { id: "b", gender: "m", age: "old", role: "Corn vendor", name: "Don Beto", prop: "cart", propKind: "esquites", voice: "st_beto" },
    ],
    first: {
      open: { byCast: {
        a: [L("¡Elotes calientitos! ¿Le sirvo uno?", "Hot corn on the cob! Would you like one?", { neutral: "¡Mazorcas de maíz calientes! ¿Le sirvo una?", spain: "¡Mazorcas de maíz calentitas! ¿Le pongo una?" })],
        b: [L("¡Esquites calientitos! ¿Le sirvo un vasito?", "Hot corn in a cup! Would you like some?", { neutral: "¡Vasitos de maíz caliente! ¿Le sirvo uno?", spain: "¡Vasitos de maíz calentito! ¿Le pongo uno?" })],
      } },
      choices: [
        { say: L("Sí, por favor. ¿Cuánto cuesta?", "Yes, please. How much is it?"),
          reply: [L("Son treinta pesos.", "It's thirty pesos.")] },
        { say: L("¿Qué le pone?", "What goes on it?"),
          reply: [L("Mayonesa, queso, chile y limón.", "Mayo, cheese, chili, and lime.", { neutral: "Mayonesa, queso, chile y lima." })] },
      ],
      then: {
        open: [L("¿Con todo?", "Everything on it?")],
        choices: [
          { say: L("Sí, con todo, por favor.", "Yes, everything, please.") },
          { say: L("Sin chile, por favor.", "No chili, please.") },
        ],
        reply: [L("Con gusto. Aquí tiene.", "Of course. Here you go.")],
      },
      away: L("¡Hasta otro día!", "See you another day!"),
    },
    second: {
      open: { byCast: {
        a: [L("¡Qué gusto que volvió! Soy Don Beto.", "Glad you're back! I'm Don Beto.", { spain: "¡Qué alegría que haya vuelto! Soy Don Beto." }),
          L("¿Hoy quiere un elote?", "Corn on the cob today?", { neutral: "¿Hoy quiere una mazorca de maíz?" })],
        b: [L("¡Qué gusto que volvió! Soy Don Beto.", "Glad you're back! I'm Don Beto.", { spain: "¡Qué alegría que haya vuelto! Soy Don Beto." }),
          L("¿Hoy quiere un vasito de esquites?", "A cup of corn today?", { neutral: "¿Hoy quiere un vasito de maíz?" })],
      } },
      choices: [
        { say: L("Sí, por favor. Con poquito chile.", "Yes, please. Just a little chili."),
          reply: [L("Claro. Solo para darle sabor.", "Sure. Just enough for a little flavor.")] },
        { say: L("Hoy sin chile, por favor.", "No chili for me today, please."),
          reply: [L("Claro. Con el limón queda buenísimo.", "Sure. It's really good with lime.", { neutral: "Claro. Con la lima queda buenísimo." })] },
      ],
      away: L("¡Aquí estaré!", "I'll be here!"),
      named: true,
    },
    familiar: {
      open: [L("¡Buenas! ¿Lo de siempre?", "Hi! The usual?")],
      choices: [
        { say: L("Sí, con todo.", "Yes, with everything on it."),
          reply: [L("Claro. Y un poquito más de queso.", "Sure. And a little extra cheese.")] },
        { say: L("Hoy con más limón, por favor.", "Extra lime today, please.", { neutral: "Hoy con más lima, por favor." }),
          reply: [L("Claro. Un chorrito más.", "Sure. An extra squeeze.")] },
      ],
      away: L("¡Nos vemos, que le vaya bien!", "See you! Have a good one!", { spain: "¡Nos vemos, que vaya bien!" }),
    },
  },
  { id: "r_marquesitas", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Crepe roll vendor", name: "Doña Yoli", prop: "cart", propKind: "marquesitas", voice: "st_yoli" },
      { id: "b", gender: "f", age: "adult", role: "Crepe roll vendor", name: "Doña Yoli", prop: "cart", propKind: "marquesitas", voice: "st_yoli" },
    ],
    first: {
      open: { byCast: {
        a: [L("¡Marquesitas! La de queso de bola es la clásica.", "Crepe rolls! The Edam cheese one is the classic.", { neutral: "¡Crepas enrolladas! La de queso de bola es la clásica." }),
          L("¿De queso de bola o de Nutella?", "Edam cheese or Nutella?")],
        b: [L("¡Marquesitas! La de Nutella es la más pedida.", "Crepe rolls! Nutella is the most popular.", { neutral: "¡Crepas enrolladas! La de Nutella es la más pedida." }),
          L("¿De queso de bola o de Nutella?", "Edam cheese or Nutella?")],
      } },
      choices: [
        { say: L("De queso de bola, por favor.", "Edam cheese, please."),
          reply: [L("Claro. Le pongo el queso recién rallado.", "Sure. I'll use freshly grated cheese.", { spain: "Claro. Te pongo el queso recién rallado." })] },
        { say: L("De Nutella, por favor.", "Nutella, please."),
          reply: [L("Claro. La enrollo en cuanto sale.", "Sure. I'll roll it as soon as it's done.")] },
      ],
      away: L("¡Hasta mañana!", "See you tomorrow!"),
    },
    second: {
      open: { byCast: {
        a: [L("¡Volvió justo a tiempo! Soy Doña Yoli.", "You're back just in time! I'm Doña Yoli.", { spain: "¡Has vuelto justo a tiempo! Soy Doña Yoli." }),
          L("Acabo de rallar el queso de bola.", "I just grated the Edam cheese.")],
        b: [L("¡Volvió justo a tiempo! Soy Doña Yoli.", "You're back just in time! I'm Doña Yoli.", { spain: "¡Has vuelto justo a tiempo! Soy Doña Yoli." }),
          L("Acabo de abrir un frasco de Nutella.", "I just opened a jar of Nutella.", { spain: "Acabo de abrir un bote de Nutella." })],
      } },
      choices: [
        { say: L("¿Cómo hace para que quede tan crujiente?", "How do you get it so crispy?", { spain: "¿Cómo haces para que quede tan crujiente?" }),
          reply: [L("La masa va bien delgada. Luego la enrollo.", "I spread the batter thin, then roll the crepe.")] },
        { say: L("Me llevo una, por favor.", "I'll take one, please."),
          reply: [L("Con gusto. Se la doy bien crujiente.", "Of course. I'll make it nice and crisp.", { spain: "Claro. Te la doy bien crujiente." })] },
      ],
      away: L("¡Que tenga bonita tarde!", "Have a lovely afternoon!", { spain: "¡Que pases buena tarde!" }),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Buenas! Ya está listo el queso de bola.", "Hi! The Edam cheese is ready."),
          L("¿Una para el camino?", "Want one for the road?")],
        b: [L("¡Buenas! Hoy tengo Nutella para rato.", "Hi! I've got plenty of Nutella today."),
          L("¿Una para el camino?", "Want one for the road?")],
      } },
      choices: [
        { say: L("Sí. Para comerla en el camino.", "Yes. I'll eat it on the way.", { spain: "Sí. Para comérmela por el camino." }),
          reply: [L("Aquí tiene. Todavía está calientita.", "Here you go. It's still warm.", { spain: "Aquí tienes. Todavía está calentita." })] },
        { say: L("¿Me la puede partir en dos?", "Could you break it in half for me?", { spain: "¿Me la puedes partir en dos?" }),
          reply: [L("Claro. Si cruje, es buena señal.", "Sure. If it crunches, that's a good sign.")] },
      ],
      away: L("¡Vuelva cuando quiera!", "Come by anytime!", { spain: "¡Vuelve cuando quieras!" }),
    },
  },
  { id: "r_dogwalker", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Dog walker", name: "Lupita", prop: "dog", propKind: "brown", voice: "st_lupita" },
      { id: "b", gender: "f", age: "young", role: "Dog walker", name: "Lupita", prop: "dog", propKind: "white", voice: "st_lupita" },
    ],
    first: {
      open: [L("¿Le gustan los perros?", "Do you like dogs?", { spain: "¿Te gustan los perros?" }),
        L("Este saluda hasta a las palomas.", "He even says hi to the pigeons.")],
      choices: [
        { say: L("Sí, me encantan.", "I love dogs."),
          reply: [L("Pues ya tiene otro amigo en el pueblo.", "Then you've got a new friend in town.", { spain: "Pues ya tienes otro amigo en el pueblo." })] },
        { say: L("Sí, pero me dan un poco de miedo.", "I do, but dogs make me a little nervous."),
          reply: [L("No pasa nada. Se queda aquí conmigo.", "That's okay. He'll stay right here with me.")] },
      ],
      away: L("Bueno, seguimos. ¡Hasta luego!", "Well, we'd better keep going. See you!"),
    },
    second: {
      open: [L("¡Otra vez por aquí! Por cierto, soy Lupita.", "Hey, we meet again! I'm Lupita, by the way.")],
      choices: [
        { say: L("Mucho gusto, Lupita.", "Nice to meet you, Lupita."),
          reply: [L("Igualmente. Da gusto ver una cara conocida.", "Nice to meet you, too. It's good to see a familiar face.")] },
        { say: L("¿Y cómo se llama su perro?", "And what's your dog's name?", { spain: "¿Y cómo se llama tu perro?" }),
          reply: { byCast: {
            a: [L("Cacao. Con ese color, ¿cómo más?", "Cacao. Like chocolate! With that color, what else?")],
            b: [L("Copo. Aquí no nieva, pero un copo sí tenemos.", "Copo means 'snowflake.' It never snows here, but we've got one.")],
          } } },
      ],
      away: L("¡Hasta la próxima!", "See you next time!"),
      named: true,
    },
    familiar: {
      open: [L("¡Qué gusto {m:verlo|f:verla}!", "Good to see you!", { spain: "¡Qué alegría verte!" }),
        L("¿Nos hablamos de tú?", "Shall we switch to tú?", { spain: "Ya hay confianza, ¿no?" })],
      choices: [
        { say: L("Claro, Lupita. ¿Cómo estás?", "Of course, Lupita. How are you?"),
          reply: [L("Muy bien. Me gusta encontrarte por aquí.", "I'm good. I like running into you around here.")] },
        { say: L("Sí, Lupita. ¿Otra vuelta con el perro?", "Sure, Lupita. Out with the dog again?"),
          reply: [L("Sí. Ya sabes, tiene que saludar a las palomas.", "Yep. You know he's got to say hi to the pigeons.")] },
      ],
      away: L("¡Nos vemos por aquí!", "See you around!"),
      card: L("¿Nos hablamos de tú?", "Shall we switch to tú?", { spain: "Ya hay confianza, ¿no?" }),
    },
  },
  { id: "r_hamacas", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Hammock seller", name: "Don Teo", prop: "hammocks", voice: "st_teo" },
      { id: "b", gender: "m", age: "old", role: "Hammock seller", name: "Don Teo", prop: "hammocks", propKind: "sombreros", voice: "st_teo" },
    ],
    first: {
      open: { byCast: {
        a: [L("¡Hamacas hechas en Yucatán! Puede tocarlas, si quiere.", "Hammocks made in Yucatán! Feel free to touch them.")],
        b: [L("¡Hamacas y sombreros! Todo hecho en Yucatán.", "Hammocks and hats! All made in Yucatán.")],
      } },
      choices: [
        { say: L("¿De qué material son las hamacas?", "What are the hammocks made of?"),
          reply: [L("De algodón. Se siente fresco con este calor.", "Cotton. It feels cool in this heat.")] },
        { say: L("Solo estoy viendo, gracias.", "I'm just looking, thanks."), helped: false,
          reply: [L("Con toda confianza. Mire lo que quiera.", "Of course. Feel free to look around.")] },
      ],
      away: L("¡Gracias por pasar!", "Thanks for stopping by!"),
    },
    second: {
      open: { byCast: {
        a: [L("¡Buenas! Nos volvemos a encontrar. Soy Don Teo.", "Hello! We meet again. I'm Don Teo."),
          L("Hoy tengo hamacas de varios colores.", "I've got hammocks in several colors today.")],
        b: [L("¡Buenas! Nos volvemos a encontrar. Soy Don Teo.", "Hello! We meet again. I'm Don Teo."),
          L("Hoy también traje sombreros para el sol.", "I brought some sun hats today, too.", { spain: "Hoy también he traído sombreros para el sol." })],
      } },
      choices: [
        { say: L("Mucho gusto, Don Teo.", "Nice to meet you, Don Teo."),
          reply: [L("Igualmente. Aquí puede mirar con calma.", "Likewise. Take your time looking around.")] },
        { say: { byCast: {
          a: L("¿Las puedo ver de cerca?", "Can I take a closer look at them?"),
          b: L("¿Me puedo probar un sombrero?", "Can I try on a hat?"),
        } },
          reply: { byCast: {
            a: [L("Claro. De cerquita se ve mejor el tejido.", "Sure. You can see the weave better up close.", { spain: "Claro. De cerca se ve mejor el tejido." })],
            b: [L("Claro. Así ve si le queda bien.", "Sure. See how it fits.")],
          } } },
      ],
      away: L("¡Cuídese mucho!", "Take care!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Buenas! Qué gusto que pase a saludar.", "Hi! I'm glad you stopped to say hello.", { spain: "¡Buenas! Qué alegría que pase a saludar." }),
          L("Estas hamacas dan ganas de echarse una siesta.", "These hammocks make you want to take a nap.")],
        b: [L("¡Buenas! Qué gusto que pase a saludar.", "Hi! I'm glad you stopped to say hello.", { spain: "¡Buenas! Qué alegría que pase a saludar." }),
          L("Con un sombrero, se lleva la sombra puesta.", "With a hat, you've got shade wherever you go.")],
      } },
      choices: [
        { say: L("Hoy vine a saludar, Don Teo.", "I just came by to say hi, Don Teo.", { spain: "Hoy he venido a saludar, Don Teo." }),
          reply: [L("Con eso basta. ¡Que tenga buen día!", "That's plenty. Have a good day!", { spain: "Con eso basta. ¡Que tenga un buen día!" })] },
        { say: { byCast: {
          a: L("Un día de estos me llevo una.", "One of these days I'll take one home."),
          b: L("Con este sol, sí dan ganas de usar sombrero.", "This sun makes me want a hat.", { spain: "Con este sol, sí que apetece llevar sombrero." }),
        } },
          reply: [L("Aquí estaré. Piénselo con calma.", "I'll be here. Take your time deciding.")] },
      ],
      away: L("¡Hasta la próxima!", "See you next time!"),
    },
  },
  { id: "r_kite", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "m", age: "kid", role: "Boy with a kite", name: "Mateo", prop: "kite", propKind: "red", voice: "st_mateo" },
      { id: "b", gender: "m", age: "kid", role: "Boy with a kite", name: "Mateo", prop: "kite", propKind: "fish", voice: "st_mateo" },
    ], first: stub() },
  { id: "r_pescador", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Fisherman", name: "Don Chema", prop: "net", voice: "st_chema" },
      { id: "b", gender: "m", age: "old", role: "Fisherman", name: "Don Chema", prop: "fish_bucket", voice: "st_chema" },
    ], first: stub() },
  { id: "r_chayo", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "old", role: "Neighbor at her door", name: "Doña Chayo", prop: "chair_fan", voice: "st_chayo" },
      { id: "b", gender: "f", age: "old", role: "Neighbor at her door", name: "Doña Chayo", prop: "watering_can", voice: "st_chayo" },
    ], first: stub() },
  { id: "r_cocos", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Coconut seller", name: "Don Polo", prop: "coconuts", voice: "st_polo" },
      { id: "b", gender: "m", age: "adult", role: "Coconut seller", name: "Don Polo", prop: "coconuts", propKind: "coconut_water", voice: "st_polo" },
    ], first: stub() },
  { id: "r_bolero", kind: "regular", near: "square",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Shoeshiner", name: "Don Rafa", prop: "shoeshine_box", voice: "st_rafa" },
      { id: "b", gender: "m", age: "old", role: "Shoeshiner", name: "Don Rafa", prop: "shoeshine_box", propKind: "newspaper", voice: "st_rafa" },
    ], first: stub() },

  // ---------------------------------------------------------------- incidents
  { id: "i_dropped", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", prop: "wallet", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "adult", role: "Passer-by", prop: "keys", voice: "st_f_adult" },
      { id: "c", gender: "f", age: "old", role: "Older lady", prop: "sunglasses", voice: "st_f_old" },
    ],
    first: {
      scene: { byCast: {
        a: "A man dropped his wallet and didn't notice.",
        b: "A woman dropped her keys and didn't notice.",
        c: "An older lady dropped her sunglasses and didn't notice.",
      } },
      choices: [
        { say: L("¡Disculpe! ¡Se le cayó algo!", "Excuse me! You dropped something!", { spain: "¡Perdone! ¡Se le ha caído algo!" }) },
        { say: { byCast: {
          a: L("¡Oiga! ¿Es su cartera?", "Hey! Is this your wallet?", { neutral: "¡Oiga! ¿Es su billetera?" }),
          b: L("¡Oiga! ¿Son sus llaves?", "Hey! Are these your keys?"),
          c: L("¡Señora! ¿Son sus lentes?", "Ma'am! Are these your sunglasses?", { spain: "¡Señora! ¿Son sus gafas de sol?" }),
        } } },
      ],
      reply: { byCast: {
        a: [L("¡Ay, mi cartera! ¡Muchísimas gracias!", "Oh, my wallet! Thank you so much!", { neutral: "¡Ay, mi billetera! ¡Muchísimas gracias!" }),
          L("Me salvó el día.", "You saved my day.", { spain: "Me ha salvado el día." })],
        b: [L("¡Mis llaves! Sin ellas no entro a mi casa.", "My keys! I can't get into my house without them.", { spain: "¡Mis llaves! Sin ellas no entro en casa." }),
          L("¡Mil gracias!", "Thanks a million!")],
        c: [L("¡Ay, mis lentes! Gracias, {m:joven|f:señorita}.", "Oh, my sunglasses! Thank you, dear.", { spain: "¡Ay, mis gafas! Gracias, {m:hijo|f:hija}." }),
          L("Sin ellos no veo nada con este sol.", "I can't see a thing in this sun without them.", { spain: "Sin ellas no veo nada con este sol." })],
      } },
      then: {
        choices: [
          { say: L("¡De nada!", "You're welcome!") },
          { say: L("¡Que le vaya bien!", "Have a good day!", { spain: "¡Que vaya bien!" }) },
        ],
        reply: [L("¡Igualmente! ¡Gracias otra vez!", "You too! Thanks again!")],
      },
      card: { byCast: {
        a: L("¡Se le cayó la cartera!", "You dropped your wallet!", { neutral: "¡Se le cayó la billetera!", spain: "¡Se le ha caído la cartera!" }),
        b: L("¡Se le cayeron las llaves!", "You dropped your keys!", { spain: "¡Se le han caído las llaves!" }),
        c: L("¡Se le cayeron los lentes!", "You dropped your sunglasses!", { spain: "¡Se le han caído las gafas!" }),
      } },
    },
    second: {
      scene: { byCast: {
        a: "The same man's wallet slips out of his pocket again.",
        b: "The same woman's keys fall to the ground again.",
        c: "The older lady's sunglasses slip to the ground again.",
      } },
      choices: [
        { say: L("¡Disculpe! ¡Se le cayó algo otra vez!", "Excuse me! You dropped something again!", { spain: "¡Perdone! ¡Se le ha vuelto a caer algo!" }) },
        { say: { byCast: {
          a: L("¡Oiga! Aquí tiene su cartera.", "Hey! Here's your wallet.", { neutral: "¡Oiga! Aquí tiene su billetera.", spain: "¡Oiga! Aquí tiene su cartera." }),
          b: L("¡Oiga! Aquí tiene sus llaves.", "Hey! Here are your keys."),
          c: L("¡Señora! Aquí tiene sus lentes de sol.", "Ma'am! Here are your sunglasses.", { neutral: "¡Señora! Aquí tiene sus anteojos de sol.", spain: "¡Señora! Aquí tiene sus gafas de sol." }),
        } } },
      ],
      reply: { byCast: {
        a: [L("¿Otra vez usted? ¡Ya me salvó dos veces!", "You again? That's twice you've saved me!", { spain: "¿Otra vez usted? ¡Ya me ha salvado dos veces!" }),
          L("Creo que mi bolsillo tiene una puerta secreta.", "I think my pocket has a secret door.")],
        b: [L("¡Es usted! Ya van dos veces que me salva.", "It's you! You've saved me twice now."),
          L("Si sigo así, entro por la ventana.", "At this rate I'll be climbing in through a window.")],
        c: [L("¡Ay, {m:joven|f:señorita}! ¡Me volvió a salvar!", "Oh! You've saved me again, dear!", { spain: "¡Ay, {m:hijo|f:hija}! ¡Me ha vuelto a salvar!" }),
          L("Les voy a poner correa, como a los perros.", "I ought to put these on a leash.")],
      } },
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Ah, es usted! Hoy mi cartera va bien guardada.", "Oh, it's you! My wallet's tucked away today.", { neutral: "¡Ah, es usted! Hoy mi billetera va bien guardada.", spain: "¡Ah, es usted! Hoy llevo la cartera bien guardada." }),
          L("La reviso cada vez que cruzo la calle.", "I check for it every time I cross the street.")],
        b: [L("¡Hola otra vez! Hoy traigo las llaves en la mano.", "Hi again! I've got my keys in my hand today.", { spain: "¡Hola otra vez! Hoy llevo las llaves en la mano." }),
          L("Ni para saludar las suelto.", "I won't even let go to wave.")],
        c: [L("¡Hola! Hoy sí traigo mis lentes de sol.", "Hello! I've got my sunglasses today.", { neutral: "¡Hola! Hoy sí traigo mis anteojos de sol.", spain: "¡Hola! Hoy sí llevo mis gafas de sol." }),
          L("Ya hasta les puse un cordón.", "I even put them on a cord.", { spain: "Hasta les he puesto un cordón." })],
      } },
      choices: [
        { say: L("¡Qué buena idea!", "Good idea!"),
          reply: [L("Ya aprendí la lección. ¡Gracias otra vez!", "Lesson learned. Thanks again!", { spain: "Ya he aprendido la lección. ¡Gracias otra vez!" })] },
        { say: L("Me da gusto volver a {nm:verlo|nf:verla}.", "It's good to see you again.", { spain: "Me alegro de volver a {nm:verlo|nf:verla}." }),
          reply: [L("A mí también. ¡Y gracias por avisarme!", "You too! And thanks for the heads-up!")] },
        { say: L("¡Hola! ¿Va de paseo?", "Hi! Out for a walk?"),
          reply: [L("Sí, a dar una vuelta. ¡Hasta luego!", "Just taking a little walk. See you!")] },
      ],
      away: L("¡Que le vaya bien!", "Have a good day!", { spain: "¡Que vaya bien!" }),
    },
  },
  { id: "i_tourist", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Tourist", prop: "map", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Tourist", prop: "phone", voice: "st_f_young" },
      { id: "c", gender: "m", age: "old", role: "Tourist", prop: "guidebook", voice: "st_m_old" },
    ], first: stub() },
  { id: "i_spill", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Shopper", prop: "fruit", propKind: "mangos", voice: "st_f_adult" },
      { id: "b", gender: "m", age: "old", role: "Shopper", prop: "fruit", propKind: "oranges", voice: "st_m_old" },
      { id: "c", gender: "f", age: "young", role: "Shopper", prop: "fruit", propKind: "limes", voice: "st_f_young" },
    ],
    first: {
      scene: { byCast: {
        a: "Mangoes roll out of a woman's torn shopping bag.",
        b: "Oranges roll out of an older man's torn shopping bag.",
        c: "Limes roll out of a young woman's torn shopping bag.",
      } },
      open: { byCast: {
        a: [L("¡Ay, mis mangos! ¿Me ayuda a recogerlos?", "Oh no, my mangoes! Can you help me pick them up?")],
        b: [L("¡Mis naranjas! ¿Me ayuda a recogerlas?", "My oranges! Can you help me pick them up?")],
        c: [L("¡Ay, mis limones! ¿Me ayuda a recogerlos?", "Oh no, my limes! Can you help me pick them up?", { neutral: "¡Ay, mis limas! ¿Me ayuda a recogerlas?", spain: "¡Ay, mis limas! ¿Me ayudas a recogerlas?" })],
      } },
      choices: [
        { say: { byCast: {
          a: L("¡Claro! Yo le ayudo.", "Of course! I'll help you."),
          b: L("¡Claro! Yo le ayudo.", "Of course! I'll help you."),
          c: L("¡Claro! Yo le ayudo.", "Of course! I'll help you.", { spain: "¡Claro! Yo te ayudo." }),
        } } },
        { say: L("¡Ya encontré más por acá!", "I found some more over here!", { spain: "¡He encontrado más por aquí!" }) },
        { say: L("Lo siento, tengo prisa.", "Sorry, I'm in a hurry."), helped: false,
          reply: [L("No pasa nada. Ya me las arreglo.", "No worries. I'll manage.")] },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Ya se me antojaban con chile.", "Thanks! I've been craving mangoes with chili.", { neutral: "¡Gracias! Ya tenía ganas de comerlos con chile.", spain: "¡Gracias! Ya me apetecía comerlos con chile." })],
        b: [L("¡Muchas gracias! ¡Cómo ruedan estas naranjas!", "Thanks so much! Those oranges can really roll!")],
        c: [L("¡Gracias! Son para hacer agua de limón.", "Thanks! I'm making limeade with them.", { neutral: "¡Gracias! Son para hacer limonada.", spain: "¡Gracias! Con ellas voy a hacer limonada." })],
      } },
      away: L("Bueno, yo me encargo.", "It's okay, I've got it."),
      card: { byCast: {
        a: L("¿Me ayuda a recoger la fruta?", "Can you help me pick up the fruit?"),
        b: L("¿Me ayuda a recoger la fruta?", "Can you help me pick up the fruit?"),
        c: L("¿Me ayuda a recoger la fruta?", "Can you help me pick up the fruit?", { spain: "¿Me ayudas a recoger la fruta?" }),
      } },
    },
    second: {
      scene: { byCast: {
        a: "The same woman's bag splits again, sending mangoes rolling.",
        b: "The older man's bag splits again, and oranges roll out.",
        c: "The young woman's bag splits again, and limes scatter.",
      } },
      open: [L("¡No puede ser! ¡Otra vez!", "Oh, come on! Again?")],
      choices: [
        { say: L("¡Ya junté la fruta! Una bolsa de tela aguanta más.", "I've got the fruit! A cloth bag holds up better.", { spain: "¡Ya he recogido la fruta! Una bolsa de tela aguanta más." }) },
        { say: L("Yo recojo la fruta de este lado.", "I'll get the fruit on this side.") },
      ],
      reply: { byCast: {
        a: [L("¡Ah, es usted! ¡Gracias por ayudarme!", "Oh, it's you! Thanks for helping!"),
          L("Mis mangos siempre salen corriendo.", "My mangoes are always making a run for it.")],
        b: [L("¡Nos volvemos a encontrar! ¡Muchas gracias!", "We meet again! Thanks so much!"),
          L("Voy a tener que comprar naranjas cuadradas.", "I'm going to have to buy square oranges.")],
        c: [L("¡Otra vez por aquí! ¡Menos mal!", "You again! Am I glad to see you!"),
          L("Mis limones ruedan más rápido que yo.", "My limes can outrun me.", { neutral: "Mis limas ruedan más rápido que yo.", spain: "Mis limas ruedan más deprisa que yo." })],
      } },
      away: L("Bueno, yo me encargo.", "It's okay, I've got it."),
    },
    familiar: {
      open: [L("¡Buenas! Ahora llevo la fruta en bolsa de tela.", "Hi! I'm carrying my fruit in a cloth bag now."),
        L("Hoy hay buena fruta en el mercado.", "The market has some good fruit today.")],
      choices: [
        { say: L("¡Qué bien! ¿Qué hay de bueno?", "Oh, nice! What's good today?"),
          reply: { byCast: {
            a: [L("Los mangos están dulcísimos.", "The mangoes are incredibly sweet.")],
            b: [L("Las naranjas salieron muy dulces.", "The oranges turned out really sweet.", { spain: "Las naranjas han salido muy dulces." })],
            c: [L("Los limones están bien jugosos.", "The limes are nice and juicy.", { neutral: "Las limas están bien jugosas.", spain: "Las limas están muy jugosas." })],
          } } },
        { say: L("Gracias por el dato. Me doy una vuelta.", "Thanks for the tip. I'll stop by.", { spain: "Gracias por el aviso. Me paso luego." }),
          reply: [L("Sí, vale la pena. ¡Nos vemos!", "Yeah, it's worth a look. See you!")] },
      ],
      away: L("¡Buen paseo!", "Enjoy your walk!"),
    },
  },
  { id: "i_photo", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Tourist", prop: "phone", voice: "st_f_young" },
      { id: "b", gender: "m", age: "adult", role: "Tourist", prop: "camera", voice: "st_m_adult" },
      { id: "c", gender: "f", age: "old", role: "Tourist", prop: "tablet", voice: "st_f_old" },
    ], first: stub() },
  { id: "i_wind", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Older man", prop: "hat", voice: "st_m_old" },
      { id: "b", gender: "f", age: "adult", role: "Passer-by", prop: "scarf", propKind: "pareo", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "young", role: "Passer-by", prop: "cap", voice: "st_m_young" },
    ], first: stub() },
  { id: "i_change", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Student", voice: "st_f_young" },
      { id: "c", gender: "f", age: "old", role: "Older lady", voice: "st_f_old" },
    ], first: stub() },
  { id: "i_lost_dog", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "kid", role: "Little girl", prop: "dog", propKind: "brown", voice: "st_kid_f" },
      { id: "b", gender: "f", age: "adult", role: "Dog owner", prop: "dog", propKind: "white", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "old", role: "Dog owner", prop: "dog", propKind: "black", voice: "st_m_old" },
    ], first: stub() },
  { id: "i_bike", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "young", role: "Cyclist", prop: "bike", voice: "st_m_young" },
      { id: "b", gender: "f", age: "adult", role: "Cyclist", prop: "bike", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "kid", role: "Boy", prop: "bike", propKind: "small", voice: "st_kid_m" },
    ], first: stub() },
  { id: "i_carry", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", prop: "water_jug", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Passer-by", prop: "market_bags", voice: "st_f_young" },
      { id: "c", gender: "f", age: "old", role: "Older lady", prop: "cake_box", voice: "st_f_old" },
    ], first: stub() },
  { id: "i_survey", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Student", prop: "clipboard", voice: "st_f_young" },
      { id: "b", gender: "m", age: "adult", role: "Radio reporter", prop: "microphone", voice: "st_m_adult" },
      { id: "c", gender: "f", age: "old", role: "Church volunteer", prop: "clipboard", voice: "st_f_old" },
    ], first: stub() },

  // ---------------------------------------------------------------- arcs
  { id: "a_cafe", kind: "arc", after: { id: "i_dropped", helped: true },
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", prop: "coffee_cup", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "adult", role: "Passer-by", prop: "coffee_cup", voice: "st_f_adult" },
      { id: "c", gender: "f", age: "old", role: "Older lady", prop: "coffee_cup", voice: "st_f_old" },
    ], first: stub() },
  { id: "a_pulsera", kind: "arc", after: { id: "i_tourist", helped: true },
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Tourist", prop: "bracelet", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Tourist", prop: "bracelet", voice: "st_f_young" },
      { id: "c", gender: "m", age: "old", role: "Tourist", prop: "bracelet", voice: "st_m_old" },
    ], first: stub() },
  { id: "a_serenata", kind: "arc", after: { id: "r_trovador", seen: 2 },
    cast: [{ id: "a", gender: "m", age: "old", role: "Street singer", name: "Don Chucho", prop: "guitar", voice: "st_chucho" }],
    first: stub() },
  { id: "a_mango", kind: "arc", after: { id: "i_spill", helped: true },
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Shopper", prop: "fruit_cup", voice: "st_f_adult" },
      { id: "b", gender: "m", age: "old", role: "Shopper", prop: "fruit_cup", voice: "st_m_old" },
      { id: "c", gender: "f", age: "young", role: "Shopper", prop: "fruit_cup", voice: "st_f_young" },
    ], first: stub() },
];

export const STREET_CHATTER: StreetChatter[] = [
  { id: "c_calor", lines: [L("¡Qué calor hace hoy!", "It's so hot today!"),
    L("¡Ni me digas! Y apenas son las diez.", "Tell me about it! And it's only ten.", { spain: "¡Ni me lo digas! Y solo son las diez." })] },
  { id: "c_norte", near: "water", lines: [
    L("¿Ya sentiste el norte?", "Feel that north wind yet?", { neutral: "¿Ya sentiste el viento del norte?", spain: "¿Ya has notado el viento del norte?" }),
    L("Sí. Hasta las lanchas están bailando.", "Yep. Even the boats are dancing."),
  ] },
  { id: "c_tianguis", near: "square", lines: [
    L("¿Vamos al tianguis por unos chiles?", "Want to go to the street market for some chiles?", { neutral: "¿Vamos al mercado al aire libre por unos chiles?", spain: "¿Vamos al tianguis a por unos chiles?" }),
    L("Va. Pero esta vez tú los pruebas.", "Sure. But this time you're the one tasting them.", { neutral: "Está bien. Pero esta vez tú los pruebas.", spain: "Vale. Pero esta vez los pruebas tú." }),
  ] },
  { id: "c_cenote", near: "cafe", lines: [
    L("¿Cómo estaba el agua del cenote? ¿Sí te metiste?", "How was the water in the cenote? Did you get in?", { spain: "¿Cómo estaba el agua del cenote? ¿Al final te metiste?" }),
    L("Helada. Tardé más en entrar que en salir.", "Freezing. I got out a lot faster than I got in."),
  ] },
];
