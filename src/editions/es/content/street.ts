// Street life in Puerto Colibrí (batch 5): 24 street moments and 20 overheard chatters. Shape:
// ../game/street/types.ts. `en` = Spanish (Mexican by default; `neutral` / `spain` twins), `lt` = natural English
// (the Lithuanian layer comes from ../street-lt.json). ROSTER: ids, kinds, cast, props, voices and `near` are fixed;
import type { StreetChatter, StreetLine, StreetMoment } from "@/game/street/types";

const L = (en: string, lt: string, twins: { neutral?: string; spain?: string } = {}): StreetLine => ({ en, lt, ...twins });

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
        a: [L("¡Elotes calientitos! ¿Le sirvo uno?", "Hot corn on the cob! Would you like one?", { spain: "¡Elotes calentitos! ¿Le pongo uno?" })],
        b: [L("¡Esquites calientitos! ¿Le sirvo un vasito?", "Hot corn in a cup! Would you like some?", { spain: "¡Esquites calentitos! ¿Le pongo un vasito?" })],
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
          L("¿Hoy quiere un elote?", "Corn on the cob today?")],
        b: [L("¡Qué gusto que volvió! Soy Don Beto.", "Glad you're back! I'm Don Beto.", { spain: "¡Qué alegría que haya vuelto! Soy Don Beto." }),
          L("¿Hoy quiere un vasito de esquites?", "A cup of corn today?")],
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
        a: [L("¡Marquesitas! La de queso de bola es la clásica.", "Crepe rolls! The Edam cheese one is the classic."),
          L("¿De queso de bola o de Nutella?", "Edam cheese or Nutella?")],
        b: [L("¡Marquesitas! La de Nutella es la más pedida.", "Crepe rolls! Nutella is the most popular."),
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
          reply: [L("Extiendo la masa bien delgada. La enrollo al sacarla.", "I spread the batter thin, then roll the crepe.")] },
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
    ],
    first: {
      scene: { byCast: {
        a: "On the beach, a boy lifts a red kite into the breeze.",
        b: "On the beach, a boy holds up a fish-shaped kite.",
      } },
      open: { byCast: {
        a: [L("¡Mire mi papalote rojo!", "Look at my red kite!", { neutral: "¡Mire mi cometa roja!" }),
          L("¿Me ayuda a volarlo?", "Can you help me fly it?", { neutral: "¿Me ayuda a volarla?" })],
        b: [L("¡Mire! ¡Mi papalote parece un pez!", "Look! My kite looks like a fish!", { neutral: "¡Mire! ¡Mi cometa parece un pez!" }),
          L("¿Me ayuda a volarlo?", "Can you help me fly it?", { neutral: "¿Me ayuda a volarla?" })],
      } },
      choices: [
        { say: L("¡Corre! Yo lo suelto.", "Run! I'll let go.", { neutral: "¡Corre! Yo la suelto." }) },
        { say: L("Espera a que sople un poquito más.", "Wait for a little more wind.") },
      ],
      reply: [L("¡Ya sopla! ¡Mire, está volando!", "Here comes the wind! Look, it's flying!")],
      away: L("¡Bueno, voy a probar otra vez!", "Okay, I'll try again!"),
    },
    second: {
      open: { byCast: {
        a: [L("¡Ah, es usted! Me llamo Mateo.", "Oh, it's you! I'm Mateo."),
          L("¡Hoy el rojo va a tocar las nubes!", "Today the red one is going to touch the clouds!", { neutral: "¡Hoy la roja va a tocar las nubes!" })],
        b: [L("¡Ah, es usted! Me llamo Mateo.", "Oh, it's you! I'm Mateo."),
          L("¡Hoy mi pez va a nadar en el cielo!", "Today my fish is going to swim in the sky!")],
      } },
      choices: [
        { say: L("¡Qué gusto verte, Mateo!", "Good to see you, Mateo!", { spain: "¡Qué alegría verte, Mateo!" }),
          reply: [L("¡A mí también! ¡Mire qué alto va!", "You too! Look how high it's going!")] },
        { say: L("¿Me enseñas cómo lo haces?", "Can you show me how you do it?"),
          reply: [L("¡Sí! Cuando sopla fuerte, corro.", "Yep! When the wind picks up, I run.")] },
      ],
      away: L("¡La próxima vez vuela más alto!", "Next time it'll fly even higher!"),
      named: true,
    },
    familiar: {
      open: [L("¡Mire, hoy sí jala fuerte!", "Look how hard it's pulling today!", { neutral: "¡Mire, hoy sí tira fuerte!" }),
        L("¿Quiere sostener el hilo?", "Want to hold the string?", { spain: "¿Quiere sujetar el hilo?" })],
      choices: [
        { say: L("¡Sí! Pásame el hilo.", "Yes! Hand me the string."),
          reply: [L("¡Agárrelo bien! ¡Ya casi llega a la nube!", "Hold on tight! It's almost at the cloud!", { spain: "¡Sujételo bien! ¡Ya casi llega a la nube!" })] },
        { say: L("¡Tú sigue! ¡Va altísimo!", "Keep going! It's way up there!"),
          reply: [L("¡Mire! ¡Ya se ve chiquitito!", "Look! It looks tiny now!")] },
      ],
      away: L("¡Otro día le enseño un truco!", "I'll show you a trick another day!"),
    },
  },
  { id: "r_pescador", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Fisherman", name: "Don Chema", prop: "net", voice: "st_chema" },
      { id: "b", gender: "m", age: "old", role: "Fisherman", name: "Don Chema", prop: "fish_bucket", voice: "st_chema" },
    ],
    first: {
      scene: { byCast: {
        a: "A fisherman mends his net by the pier.",
        b: "A fisherman stands by the pier with a bucket of fish.",
      } },
      open: { byCast: {
        a: [L("Cuando entra el norte, aprovecho para remendar la red.", "When the north wind blows, I mend my net.", { neutral: "Cuando sopla el viento del norte, remiendo la red." })],
        b: [L("¡Mire! Hoy pesqué sardinas.", "Look! I caught sardines today.", { spain: "¡Mire! Hoy he pescado sardinas." })],
      } },
      choices: [
        { say: { byCast: {
          a: L("¿Usted mismo la arregla?", "Do you fix it yourself?"),
          b: L("¿Las pescó cerca del muelle?", "Did you catch them near the pier?", { spain: "¿Las ha pescado cerca del muelle?" }),
        } },
          reply: { byCast: {
            a: [L("Sí. Mi papá me enseñó a hacer los nudos.", "Yes. My dad taught me how to tie the knots.", { spain: "Sí. Mi padre me enseñó a hacer los nudos." })],
            b: [L("Un poco más lejos. Salí antes de amanecer.", "A little farther out. I went out before dawn.")],
          } } },
        { say: L("¿Cómo está el mar hoy?", "How's the sea today?"),
          reply: { byCast: {
            a: [L("Algo picado. Hoy prefiero quedarme en el muelle.", "A little choppy. I'd rather stay on the pier today.")],
            b: [L("Estaba tranquilo al amanecer. Así da gusto pescar.", "It was calm at dawn. That's good fishing weather.")],
          } } },
      ],
      away: L("¡Que tenga buen día!", "Have a good one!", { spain: "¡Que tenga un buen día!" }),
    },
    second: {
      open: { byCast: {
        a: [L("¡Buenas! Otra vez por aquí. Dígame Don Chema.", "Hello again! Call me Don Chema."),
          L("Hoy estoy cerrando un agujero en la red.", "I'm patching a hole in the net today.")],
        b: [L("¡Buenas! Otra vez por aquí. Dígame Don Chema.", "Hello again! Call me Don Chema."),
          L("Hoy salí temprano. Apenas se veía el muelle.", "I went out early today. You could barely see the pier.", { spain: "Hoy he salido temprano. Apenas se veía el muelle." })],
      } },
      choices: [
        { say: { byCast: {
          a: L("¿Queda lista para mañana?", "Will it be ready for tomorrow?"),
          b: L("¿Y qué pescó?", "So what did you catch?", { spain: "¿Y qué ha pescado?" }),
        } },
          reply: { byCast: {
            a: [L("Dos nudos más y queda lista. Luego manda el viento.", "Two more knots and it's ready. Then it's up to the wind.")],
            b: [L("Sardinas. El mar estaba tranquilo, por suerte.", "Sardines. Luckily, the sea was calm.")],
          } } },
        { say: L("¿Cree que vaya a entrar un norte?", "Do you think a north wind is coming?", { neutral: "¿Cree que vaya a soplar viento del norte?", spain: "¿Cree que va a soplar viento del norte?" }),
          reply: [L("Puede ser. Más vale mirar el cielo antes de salir.", "Could be. Best to look at the sky before heading out.")] },
      ],
      away: L("¡Cuídese mucho!", "Take care!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Buenas! La red ya quedó. Hoy toca pescar.", "Hi! The net's ready. Today's a fishing day.", { spain: "¡Buenas! La red ya está lista. Hoy toca pescar." })],
        b: [L("¡Buenas! Hoy sí hay pescado para la casa.", "Hi! I've got fish to take home today.", { spain: "¡Buenas! Hoy sí que llevo pescado a casa." })],
      } },
      choices: [
        { say: L("Siempre aprendo algo cuando paso por aquí.", "I always learn something when I stop by."),
          reply: [L("Y eso que el mar da tema para rato.", "And there's plenty more to say about the sea.")] },
        { say: L("¿Mañana también sale a pescar?", "Are you going out fishing tomorrow, too?"),
          reply: [L("Si el mar está tranquilo, sí.", "I will if the sea's calm.")] },
      ],
      away: L("¡Nos vemos en el muelle!", "See you at the pier!"),
    },
  },
  { id: "r_chayo", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "old", role: "Neighbor at her door", name: "Doña Chayo", prop: "chair_fan", voice: "st_chayo" },
      { id: "b", gender: "f", age: "old", role: "Neighbor at her door", name: "Doña Chayo", prop: "watering_can", voice: "st_chayo" },
    ],
    first: {
      scene: { byCast: {
        a: "An older woman sits by her door waving a fan.",
        b: "An older woman waters plants by her door.",
      } },
      open: { byCast: {
        a: [L("¡Buenas, {m:mijo|f:mija}!", "Hello, dear!", { neutral: "¡Buenas, {m:hijo|f:hija}!" }),
          L("Con este calor, hasta mi abanico pide descanso.", "In this heat, even my fan needs a break.")],
        b: [L("¡Buenas, {m:mijo|f:mija}!", "Hello, dear!", { neutral: "¡Buenas, {m:hijo|f:hija}!" }),
          L("Mis plantas también tienen sed con este calor.", "My plants get thirsty in this heat, too.")],
      } },
      choices: [
        { say: L("¿Le ayudo con algo?", "Can I help you with anything?"),
          reply: { byCast: {
            a: [L("Gracias. Con un saludo me basta.", "Thanks. A hello is plenty.")],
            b: [L("Gracias. Ya casi termino de regar.", "Thanks. I'm almost done watering.", { spain: "Gracias. Ya casi he terminado de regar." })],
          } } },
        { say: L("¿Siempre hace tanto calor por aquí?", "Is it always this hot around here?"),
          reply: [L("Al caer el sol, ya se platica a gusto.", "Once the sun goes down, it's nice to sit and chat.", { neutral: "Al caer el sol, ya se conversa a gusto.", spain: "Al caer el sol, ya se charla a gusto." })] },
        { say: L("Disculpe, voy de prisa.", "Excuse me, I'm in a rush."), helped: false,
          reply: [L("No se preocupe. Otro día platicamos.", "Don't worry. We'll chat another day.", { neutral: "No se preocupe. Otro día conversamos.", spain: "No se preocupe. Otro día charlamos." })] },
      ],
      away: L("¡Hasta luego! Que le vaya bien.", "See you later. Have a good day!", { spain: "¡Hasta luego! Que vaya bien." }),
    },
    second: {
      open: { byCast: {
        a: [L("¡Qué gusto que volvió! Dígame Doña Chayo.", "I'm glad you're back! Call me Doña Chayo.", { spain: "¡Qué alegría que haya vuelto! Dígame Doña Chayo." }),
          L("Con el abanico, ya aguanto mejor la tarde.", "This fan makes the afternoons a little easier.")],
        b: [L("¡Qué gusto que volvió! Dígame Doña Chayo.", "I'm glad you're back! Call me Doña Chayo.", { spain: "¡Qué alegría que haya vuelto! Dígame Doña Chayo." }),
          L("Hoy hasta las plantas quieren sombra.", "Even the plants want shade today.")],
      } },
      choices: [
        { say: L("Mucho gusto, Doña Chayo.", "Nice to meet you, Doña Chayo."),
          reply: [L("Igualmente. Aquí siempre hay tiempo para un saludo.", "Nice to meet you, too. There's always time to say hello here.")] },
        { say: L("¿Hace mucho que vive aquí?", "Have you lived here long?"),
          reply: [L("Desde niña. Aquí aprendí hasta a andar en bicicleta.", "Since I was a girl. I even learned to ride a bike here.", { spain: "Desde niña. Aquí aprendí hasta a montar en bici." })] },
      ],
      away: L("¡Pase a saludar cuando quiera!", "Stop and say hello anytime!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Pásele a la sombrita, {m:mijo|f:mija}!", "Come into the shade, dear!", { neutral: "¡Pase a la sombra, {m:hijo|f:hija}!", spain: "¡Venga a la sombra, {m:hijo|f:hija}!" }),
          L("¿Ya se acostumbró al calor?", "Are you getting used to the heat yet?", { spain: "¿Ya se ha acostumbrado al calor?" })],
        b: [L("¡Hola, {m:mijo|f:mija}! Las plantas ya están regadas.", "Hi, dear! The plants are all watered.", { neutral: "¡Hola, {m:hijo|f:hija}! Las plantas ya están regadas." }),
          L("¿Ya se acostumbró al calor?", "Are you getting used to the heat yet?", { spain: "¿Ya se ha acostumbrado al calor?" })],
      } },
      choices: [
        { say: L("Todavía busco sombra.", "I'm still looking for shade."),
          reply: [L("Ya sabe lo más importante del barrio.", "Then you know the most important thing about the neighborhood.")] },
        { say: L("Ya casi. Lo que más me gusta es el barrio.", "Almost. My favorite part is the neighborhood."),
          reply: [L("Y al barrio le gusta {m:verlo|f:verla} por aquí.", "And the neighborhood's happy to see you around.")] },
      ],
      away: L("¡Que esté bien!", "Be well!"),
    },
  },
  { id: "r_cocos", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Coconut seller", name: "Don Polo", prop: "coconuts", voice: "st_polo" },
      { id: "b", gender: "m", age: "adult", role: "Coconut seller", name: "Don Polo", prop: "coconuts", propKind: "coconut_water", voice: "st_polo" },
    ],
    first: {
      open: { byCast: {
        a: [L("¡Cocos fríos! ¿Se lo preparo?", "Cold coconuts! Want me to open one for you?", { spain: "¡Cocos fríos! ¿Te lo preparo?" })],
        b: [L("¡Agua de coco bien fría! ¿Le sirvo un vaso?", "Ice-cold coconut water! Can I get you a cup?", { spain: "¡Agua de coco bien fría! ¿Te pongo un vaso?" })],
      } },
      choices: [
        { say: L("¿Cuánto le debo?", "How much do I owe you?", { spain: "¿Cuánto te debo?" }),
          reply: { byCast: {
            a: [L("Son treinta y cinco pesos.", "It's thirty-five pesos.")],
            b: [L("Son veinticinco pesos.", "It's twenty-five pesos.")],
          } } },
        { say: L("Sí, por favor. Bien frío.", "Yes, please. Nice and cold."),
          reply: { byCast: {
            a: [L("Le abro uno y le pongo un popote.", "I'll open one up and put a straw in it.", { neutral: "Le abro uno y le pongo una pajilla.", spain: "Te abro uno y te pongo una pajita." })],
            b: [L("Claro. Aquí tiene su vaso de agua de coco.", "Sure. Here's your cup of coconut water.", { spain: "Claro. Aquí tienes tu vaso de agua de coco." })],
          } } },
        { say: L("En otro rato, gracias.", "Maybe in a bit, thanks.", { spain: "En un rato, gracias." }), helped: false,
          reply: [L("Claro. Aquí seguimos en la playa.", "Sure. I'll be here on the beach.")] },
      ],
      away: L("¡Que disfrute la playa!", "Enjoy the beach!", { spain: "¡Que disfrutes de la playa!" }),
    },
    second: {
      open: { byCast: {
        a: [L("¡Ya volvió! Soy Don Polo.", "You're back! I'm Don Polo.", { spain: "¡Ya has vuelto! Soy Don Polo." }),
          L("Hoy los cocos salieron bien dulces.", "Today's coconuts turned out nice and sweet.", { spain: "Hoy los cocos han salido bien dulces." })],
        b: [L("¡Ya volvió! Soy Don Polo.", "You're back! I'm Don Polo.", { spain: "¡Ya has vuelto! Soy Don Polo." }),
          L("El agua de coco ya está bien fría.", "The coconut water's nice and cold now.")],
      } },
      choices: [
        { say: L("Mucho gusto. ¿Le pone azúcar?", "Nice to meet you. Do you add sugar?", { spain: "Un placer. ¿Le pones azúcar?" }),
          reply: [L("Solo la que trae el coco.", "Just the sugar that's already in the coconut.")] },
        { say: L("¿Puedo tomarlo aquí frente al mar?", "Can I drink it right here by the water?", { spain: "¿Me lo puedo tomar aquí frente al mar?" }),
          reply: [L("Claro. Con esta vista sabe todavía mejor.", "Of course. It tastes even better with this view.")] },
      ],
      away: L("¡Me saluda si vuelve a pasar!", "Say hi if you come by again!", { spain: "¡Salúdame si vuelves a pasar!" }),
      named: true,
    },
    familiar: {
      open: [L("¿Uno bien frío, como siempre?", "A nice cold one, as usual?")],
      choices: [
        { say: L("Como siempre, Don Polo.", "The usual, Don Polo."),
          reply: [L("Claro. Bien frío para este calor.", "Sure. Nice and cold for a day like this.")] },
        { say: L("¿Hoy me puede preparar dos?", "Could you get me two today?", { spain: "¿Hoy me puedes preparar dos?" }),
          reply: [L("Claro. Dos bien fríos, de una vez.", "Sure. Two nice cold ones, coming right up.", { spain: "Claro. Ahora mismo te preparo dos bien fríos." })] },
      ],
      away: L("¡Nos vemos por la playa!", "See you around the beach!"),
    },
  },
  { id: "r_bolero", kind: "regular", near: "square",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Shoeshiner", name: "Don Rafa", prop: "shoeshine_box", voice: "st_rafa" },
      { id: "b", gender: "m", age: "old", role: "Shoeshiner", name: "Don Rafa", prop: "shoeshine_box", propKind: "newspaper", voice: "st_rafa" },
    ],
    first: {
      scene: { byCast: {
        a: "An older man sets a stool beside his shoeshine box.",
        b: "An older man reads a newspaper beside his shoeshine box.",
      } },
      open: { byCast: {
        a: [L("¿Una boleada? Con tenis o sandalias, también podemos platicar.", "Shoe shine? If you're in sneakers or sandals, we can still chat.", { neutral: "¿Le lustro los zapatos? Con zapatillas deportivas o sandalias, también podemos conversar.", spain: "¿Le doy brillo a los zapatos? Con zapatillas o sandalias, también podemos charlar." }),
          L("Tengo el banquito libre.", "My little stool's free.")],
        b: [L("¿Una boleada? Con tenis o sandalias, también podemos platicar.", "Shoe shine? If you're in sneakers or sandals, we can still chat.", { neutral: "¿Le lustro los zapatos? Con zapatillas deportivas o sandalias, también podemos conversar.", spain: "¿Le doy brillo a los zapatos? Con zapatillas o sandalias, también podemos charlar." }),
          L("Mientras llega alguien, me leo el periódico.", "I read the paper while I wait for customers.")],
      } },
      choices: [
        { say: L("¿Qué se cuenta hoy?", "What's the news today?"),
          reply: [L("Hoy las palomas volvieron a ganarnos la sombra.", "The pigeons beat us to the shade again today.", { spain: "Hoy las palomas nos han vuelto a ganar el sitio a la sombra." })] },
        { say: L("Hoy solo vine a saludar.", "I just stopped to say hello today.", { spain: "Hoy solo he venido a saludar." }),
          reply: [L("Pues los saludos siempre caen bien.", "Well, a hello is always welcome.")] },
      ],
      away: L("¡Aquí estaré por si quiere platicar!", "I'll be here if you feel like chatting!", { neutral: "¡Aquí estaré por si quiere conversar!", spain: "¡Aquí estaré por si quiere charlar!" }),
    },
    second: {
      open: { byCast: {
        a: [L("¡Buenas otra vez! Soy Don Rafa.", "Hello again! I'm Don Rafa."),
          L("Desde este banquito se entera uno de todo.", "You hear everything from this little stool.")],
        b: [L("¡Buenas otra vez! Soy Don Rafa.", "Hello again! I'm Don Rafa."),
          L("Me entero de más aquí que leyendo el periódico.", "I learn more sitting here than reading the paper.")],
      } },
      choices: [
        { say: L("Mucho gusto, Don Rafa. ¿Algo interesante hoy?", "Nice to meet you, Don Rafa. Anything interesting today?"),
          reply: [L("Dicen que el kiosco va a tener luces nuevas.", "They say the bandstand's getting new lights.")] },
        { say: L("Qué buen lugar para enterarse de todo.", "What a good spot to hear what's going on."),
          reply: [L("Sí. Las noticias llegan solitas a este rincón.", "Yep. The news comes straight to this little corner.")] },
      ],
      away: L("¡Nos vemos en la plaza!", "See you around the square!"),
      named: true,
    },
    familiar: {
      open: [L("¡Buenas! Hoy pusieron flores frente a la iglesia.", "Hi! They put flowers in front of the church today.", { spain: "¡Buenas! Hoy han puesto flores frente a la iglesia." }),
        L("Es mi noticia favorita del día.", "That's my favorite news of the day.")],
      choices: [
        { say: L("¡Qué bonito! Alegra toda la plaza.", "How lovely! That brightens up the whole square."),
          reply: [L("Eso pensé. Hasta me puse a silbar.", "That's what I thought. I even started whistling.", { spain: "Eso mismo he pensado. Hasta me he puesto a silbar." })] },
        { say: L("Siempre tiene usted buenas noticias, Don Rafa.", "You always have good news, Don Rafa."),
          reply: [L("Hoy sí. Las flores se ganaron la primera página.", "Today I do. Those flowers deserve the front page.")] },
      ],
      away: L("¡Que tenga buena tarde!", "Have a nice afternoon!"),
    },
  },

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
    ],
    first: {
      scene: { byCast: {
        a: "A man studies an unfolded map.",
        b: "A young woman keeps checking her phone.",
        c: "An older man looks up from his guidebook.",
      } },
      open: { byCast: {
        a: [L("Disculpe, ¿me ayuda? Busco el cenote.", "Excuse me, can you help? I'm looking for the cenote.", { spain: "Perdone, ¿me ayuda? Busco el cenote." })],
        b: [L("Disculpe, a mi celular casi no le queda batería.", "Excuse me, my phone's about to die.", { spain: "Perdona, a mi móvil casi no le queda batería." }),
          L("¿Sabe dónde está el Hotel Mar Azul?", "Do you know where the Mar Azul Hotel is?", { spain: "¿Sabes dónde está el Hotel Mar Azul?" })],
        c: [L("Mi guía habla del Museo de la Costa Maya.", "My guidebook mentions the Maya Coast Museum."),
          L("¿Sabe dónde queda?", "Do you know where it is?", { spain: "¿Sabe dónde está?" })],
      } },
      choices: [
        { say: { byCast: {
          a: L("Puede preguntar en Información Turística.", "You could ask at the visitor center."),
          b: L("Puede preguntar en Información Turística.", "You could ask at the visitor center.", { spain: "Puedes preguntar en Información Turística." }),
          c: L("Puede preguntar en Información Turística.", "You could ask at the visitor center."),
        } } },
        { say: L("A lo mejor saben en Café La Ceiba.", "Someone at La Ceiba Café might know.") },
        { say: L("Lo siento, yo también soy {m:nuevo|f:nueva} aquí.", "Sorry, I'm new here too."), helped: false,
          reply: [L("No se preocupe. Pregunto por aquí.", "No problem. I'll ask around.", { spain: "No pasa nada. Preguntaré por aquí." })] },
      ],
      reply: { byCast: {
        a: [L("Gracias. No quiero irme sin conocer el cenote.", "Thanks. I don't want to leave without seeing the cenote.")],
        b: [L("¡Gracias! A ver si llego antes de que se apague.", "Thanks! Let's see if I get there before my phone dies.")],
        c: [L("Muchas gracias. Ese museo es el primero de mi lista.", "Thanks so much. That museum is first on my list.")],
      } },
      away: L("¡Gracias de todos modos!", "Thanks anyway!"),
    },
    second: {
      open: { byCast: {
        a: [L("¡Otra vez usted! Ahora ando buscando las ruinas.", "It's you again! Now I'm looking for the ruins.", { spain: "¡Otra vez usted! Ahora estoy buscando las ruinas." }),
          L("Creo que tengo el mapa al revés.", "I think I'm holding my map upside down.")],
        b: [L("¡Hola! Ahora sí se me apagó el celular.", "Hi! Now my phone really is dead.", { spain: "¡Hola! Ahora sí se me ha apagado el móvil." }),
          L("¿Sabe dónde está la Oficina de Correos?", "Do you know where the post office is?", { spain: "¿Sabes dónde está la Oficina de Correos?" })],
        c: [L("¡Nos volvemos a encontrar! Busco la iglesia del zócalo.", "We meet again! I'm looking for the church in the square."),
          L("Mi guía solo trae una foto.", "All my guidebook gives me is a picture.", { spain: "Mi guía solo tiene una foto." })],
      } },
      choices: [
        { say: L("Lo mejor es preguntar en Información Turística.", "The visitor center is a good place to ask.") },
        { say: L("En el mercado quizá sepan.", "Someone at the market might know.") },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Sin mapa me pierdo. ¡Y con mapa también!", "Thanks! I get lost without a map. With one, too!")],
        b: [L("¡Gracias! Ya extraño los mapas de papel.", "Thanks! I'm starting to miss paper maps.", { spain: "¡Gracias! Ya echo de menos los mapas de papel." })],
        c: [L("Gracias. Mi guía pesa más de lo que ayuda.", "Thanks. My guidebook is better as a paperweight.")],
      } },
      away: L("Bueno, sigo buscando. ¡Hasta luego!", "Well, I'll keep looking. See you!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Hola! Ya conocí el cenote y las ruinas.", "Hi! I got to see the cenote and the ruins.", { spain: "¡Hola! Ya he visitado el cenote y las ruinas." })],
        b: [L("¡Hola! Encontré el hotel y la Oficina de Correos.", "Hi! I found the hotel and the post office.", { spain: "¡Hola! He encontrado el hotel y la Oficina de Correos." })],
        c: [L("¡Qué gusto {m:verlo|f:verla}! Encontré el museo y la iglesia.", "Good to see you! I found the museum and the church.", { spain: "¡Qué alegría {m:verlo|f:verla}! He encontrado el museo y la iglesia." })],
      } },
      choices: [
        { say: L("¡Qué bien! ¿Qué fue lo mejor?", "That's great! What was the best part?"),
          reply: { byCast: {
            a: [L("El agua del cenote. ¡Nunca había visto ese color!", "The water in the cenote. I'd never seen that color before!")],
            b: [L("El enchufe del hotel. ¡Mi celular volvió a la vida!", "The outlet at the hotel. My phone came back to life!", { spain: "El enchufe del hotel. ¡Mi móvil ha vuelto a la vida!" })],
            c: [L("El museo. Pasé toda la mañana ahí.", "The museum. I spent the whole morning there.", { spain: "El museo. Pasé toda la mañana allí." })],
          } } },
        { say: L("¡Que siga disfrutando del viaje!", "Enjoy the rest of your trip!", { spain: "¡A seguir disfrutando del viaje!" }),
          reply: [L("Muchas gracias. ¡Nos vemos por el pueblo!", "Thank you! See you around town!")] },
      ],
      away: L("¡Hasta luego!", "See you later!"),
    },
  },
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
    ],
    first: {
      open: { byCast: {
        a: [L("Disculpe, ¿nos toma una foto con mi celular?", "Excuse me, could you take our picture with my phone?", { spain: "Perdona, ¿nos haces una foto con mi móvil?" })],
        b: [L("Disculpe, ¿nos toma una foto?", "Excuse me, could you take our picture?", { spain: "Perdone, ¿nos hace una foto?" }),
          L("La cámara está en automático.", "The camera's on auto.")],
        c: [L("Disculpe, ¿nos toma una foto con la tableta?", "Excuse me, could you take our picture with the tablet?", { spain: "Perdone, ¿nos hace una foto con la tableta?" })],
      } },
      choices: [
        { say: L("¡Claro! Digan «whisky».", "Sure! Say cheese!", { spain: "¡Claro! Decid «patata»." }) },
        { say: L("Con gusto. A la cuenta de tres.", "Of course. On the count of three.", { spain: "Claro. A la de tres." }) },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Ahora sí salimos todos.", "Thanks! You got everybody in the shot.")],
        b: [L("¡Quedó muy bien! Muchas gracias.", "It turned out great! Thanks so much.", { spain: "¡Ha quedado muy bien! Muchas gracias." })],
        c: [L("¡Gracias! Ya puedo mandarla al grupo de la familia.", "Thanks! Now I can send it to the family group chat.")],
      } },
      away: L("¡Gracias de todos modos!", "Thanks anyway!"),
      card: { byCast: {
        a: L("¿Nos toma una foto?", "Could you take a picture of us?", { spain: "¿Nos haces una foto?" }),
        b: L("¿Nos toma una foto?", "Could you take a picture of us?", { spain: "¿Nos hace una foto?" }),
        c: L("¿Nos toma una foto?", "Could you take a picture of us?", { spain: "¿Nos hace una foto?" }),
      } },
    },
    second: {
      open: { byCast: {
        a: [L("¡Qué suerte {m:encontrarlo|f:encontrarla}! ¿Nos toma otra?", "Lucky we ran into you! Could you take another one?", { spain: "¡Qué suerte encontrarte! ¿Nos haces otra?" }),
          L("Ahora también queremos una con cara seria.", "This time we want one with straight faces, too.")],
        b: [L("¡Ah, es usted! ¿Nos toma otra foto?", "Oh, it's you! Could you take another picture of us?", { spain: "¡Ah, es usted! ¿Nos hace otra foto?" }),
          L("Esta vez prometo no parpadear.", "I promise I won't blink this time.")],
        c: [L("¡Hola otra vez! ¿Nos toma otra foto?", "Hello again! Could you take one more picture of us?", { spain: "¡Hola otra vez! ¿Nos hace otra foto?" }),
          L("Mi familia ya pidió una más.", "My family already asked for another one.", { spain: "Mi familia ya me ha pedido otra." })],
      } },
      choices: [
        { say: L("¡Claro! Esta vez, sin moverse.", "Of course! Hold still this time.") },
        { say: L("¿Otra? ¡Con gusto! Un poquito más juntos.", "Another one? Sure! A little closer together.") },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Eso de salir con cara seria cuesta trabajo.", "Thanks! Keeping a straight face is hard.", { spain: "¡Gracias! Lo de salir con cara seria cuesta." })],
        b: [L("¡Listo! Ni un parpadeo. Soy casi modelo.", "Got it! I didn't blink. I'm practically a model.")],
        c: [L("¡Gracias! Van a creer que tengo {m:fotógrafo|f:fotógrafa} personal.", "Thanks! They'll think I have a personal photographer.")],
      } },
      away: L("Bueno, para otra vez. ¡Gracias!", "Another time, then. Thanks!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Mire cómo quedó la foto!", "Look how the photo turned out!", { spain: "¡Mira cómo ha quedado la foto!" }),
          L("Salió tan bien que la puse de fondo.", "It came out so well, I made it my wallpaper.", { spain: "Ha quedado tan bien que la he puesto de fondo." })],
        b: [L("¡Mire cómo quedó la foto!", "Look how the photo turned out!", { spain: "¡Mire cómo ha quedado la foto!" }),
          L("¡Hasta salí con los ojos abiertos!", "I've even got my eyes open!", { spain: "¡Hasta he salido con los ojos abiertos!" })],
        c: [L("¡Mire cómo quedó la foto!", "Look how the photo turned out!", { spain: "¡Mire cómo ha quedado la foto!" }),
          L("A toda la familia le encantó.", "The whole family loved it.", { spain: "A toda la familia le ha encantado." })],
      } },
      choices: [
        { say: L("¡Qué buena foto!", "That's a great picture!"),
          reply: [L("Gracias. Esa sí la voy a guardar.", "Thanks. That's one I'm keeping.")] },
        { say: L("Me dio gusto ayudar.", "I was glad to help.", { spain: "Me alegro de haber ayudado." }),
          reply: [L("Y a mí encontrar a alguien con tanta paciencia.", "And I was glad to find someone so patient.")] },
      ],
      away: L("¡Gracias por las fotos!", "Thanks for the pictures!"),
    },
  },
  { id: "i_wind", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Older man", prop: "hat", voice: "st_m_old" },
      { id: "b", gender: "f", age: "adult", role: "Passer-by", prop: "scarf", propKind: "pareo", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "young", role: "Passer-by", prop: "cap", voice: "st_m_young" },
    ],
    first: {
      scene: { byCast: {
        a: "The sea breeze lifts an older man's hat right off his head.",
        b: "A gust catches a woman's beach wrap and sends it flying.",
        c: "The wind whips a young man's cap away.",
      } },
      choices: [
        { say: { byCast: {
          a: L("¡Aquí está su sombrero!", "Here's your hat!"),
          b: L("¡Aquí está su pareo!", "Here's your beach wrap!"),
          c: L("¡Aquí está su gorra!", "Here's your cap!", { spain: "¡Aquí está tu gorra!" }),
        } } },
        { say: L("¡Por poco se va! ¡Aquí está!", "It almost got away! Here it is!") },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Sin sombrero me derrito con este sol.", "Thanks! I'd melt in this sun without my hat.")],
        b: [L("¡Gracias! Casi se va a nadar sin mí.", "Thanks! It almost went for a swim without me.")],
        c: [L("¡Gracias! Esta gorra me la regaló mi hermano.", "Thanks! My brother gave me that cap.")],
      } },
    },
    second: {
      scene: { byCast: {
        a: "The same man's hat goes flying again.",
        b: "The same woman's beach wrap flutters away again.",
        c: "The young man's cap takes off in the breeze again.",
      } },
      choices: [
        { say: { byCast: {
          a: L("¡Otra vez el viento! Aquí tiene su sombrero.", "That wind again! Here's your hat."),
          b: L("¡Otra vez el viento! Aquí tiene su pareo.", "That wind again! Here's your beach wrap."),
          c: L("¡Otra vez el viento! Aquí tiene su gorra.", "That wind again! Here's your cap.", { spain: "¡Otra vez el viento! Aquí tienes tu gorra." }),
        } } },
        { say: L("¡Uf! ¡Por poco! Aquí está.", "Whew! That was close. Here it is.") },
      ],
      reply: { byCast: {
        a: [L("¡Otra vez usted, qué suerte!", "You again! What luck!"),
          L("A mi sombrero le falta un ancla.", "My hat needs an anchor.")],
        b: [L("¡Ah, es usted! ¡Me salvó el pareo otra vez!", "Oh, it's you! You saved my wrap again!", { spain: "¡Ah, es usted! ¡Me ha salvado el pareo otra vez!" }),
          L("Este pareo ya se cree papalote.", "This wrap thinks it's a kite.", { neutral: "Este pareo ya se cree una cometa." })],
        c: [L("¡Qué suerte que pasó por aquí! ¡Gracias otra vez!", "Lucky you came by! Thanks again!", { spain: "¡Qué suerte que hayas pasado por aquí! ¡Gracias otra vez!" }),
          L("Mi gorra quiere viajar gratis.", "My cap wants to travel for free.")],
      } },
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Buenas! Ahora el sombrero va atado bajo la barbilla.", "Hi! I tie my hat under my chin now.")],
        b: [L("¡Hola! Hoy le hice doble nudo al pareo.", "Hi! I tied my wrap with a double knot today.", { spain: "¡Hola! Hoy le he hecho un nudo doble al pareo." })],
        c: [L("¡Hola! Hoy até la gorra al cinturón.", "Hi! I tied my cap to my belt today.", { spain: "¡Hola! Hoy he atado la gorra al cinturón." })],
      } },
      choices: [
        { say: L("¡Buena idea! Con este viento, hace falta.", "Good idea! You need it in this wind."),
          reply: [L("Sí. Ya aprendí a ganarle al viento.", "Yep. I've learned how to outsmart the wind.", { spain: "Sí. Ya he aprendido a ganarle al viento." })] },
        { say: L("¡Qué gusto encontrarnos otra vez!", "It's nice running into you again!", { spain: "¡Qué alegría volver a coincidir!" }),
          reply: [L("Igualmente. ¡Que le vaya bien!", "Same here. Have a good day!", { spain: "Igualmente. ¡Que vaya bien!" })] },
      ],
      away: L("¡Hasta otro día!", "See you another day!"),
    },
  },
  { id: "i_change", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Student", voice: "st_f_young" },
      { id: "c", gender: "f", age: "old", role: "Older lady", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("¿Tiene cambio de doscientos?", "Do you have change for two hundred pesos?"),
          L("Es para el colectivo.", "It's for the shared van.", { neutral: "Es para el minibús.", spain: "Es para pagar el colectivo." })],
        b: [L("¿Tiene cambio de doscientos?", "Do you have change for two hundred pesos?", { spain: "¿Tienes cambio de doscientos?" }),
          L("En el puesto no me pueden cambiar el billete.", "They can't break the bill at the stall.")],
        c: [L("¿Tiene cambio de doscientos?", "Do you have change for two hundred pesos?"),
          L("Es para pagar el garrafón de agua.", "It's to pay for the water jug delivery.", { neutral: "Es para pagar el bidón de agua.", spain: "Es para pagar la garrafa de agua." })],
      } },
      choices: [
        { say: { byCast: {
          a: L("Déjeme ver… Sí, aquí tiene.", "Let me see… Yes, here you go."),
          b: L("Déjeme ver… Sí, aquí tiene.", "Let me see… Yes, here you go.", { spain: "Déjame ver… Sí, aquí tienes." }),
          c: L("Déjeme ver… Sí, aquí tiene.", "Let me see… Yes, here you go."),
        } } },
        { say: L("Lo siento, no traigo cambio.", "Sorry, I don't have any change on me.", { spain: "Lo siento, no llevo cambio." }), helped: false,
          reply: [L("No pasa nada. ¡Gracias de todos modos!", "No worries. Thanks anyway!")] },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Así ya puedo pagar el pasaje.", "Thanks! Now I can pay my fare.", { spain: "¡Gracias! Así ya puedo pagar el billete." })],
        b: [L("¡Gracias! Ya venía con ganas de comer.", "Thanks! I came here hungry.")],
        c: [L("¡Gracias! Ya me estaban esperando con el agua.", "Thanks! They're already waiting with the water.")],
      } },
      away: L("Bueno, voy a preguntar por ahí.", "All right, I'll ask around."),
      card: { byCast: {
        a: L("¿Tiene cambio de doscientos?", "Do you have change for two hundred pesos?"),
        b: L("¿Tiene cambio de doscientos?", "Do you have change for two hundred pesos?", { spain: "¿Tienes cambio de doscientos?" }),
        c: L("¿Tiene cambio de doscientos?", "Do you have change for two hundred pesos?"),
      } },
    },
    second: {
      open: { byCast: {
        a: [L("¡Ah, es usted! Otra vez me falta cambio.", "Oh, it's you! I'm short on change again."),
          L("¿Me cambia doscientos? Es para el colectivo.", "Could you break two hundred? It's for the van.", { neutral: "¿Me cambia doscientos? Es para el minibús.", spain: "¿Puede cambiarme doscientos? Es para el colectivo." })],
        b: [L("¡Hola otra vez! En el puesto siguen sin cambio.", "Hi again! They still have no change at the stall."),
          L("¿Me cambia este billete?", "Could you break this bill for me?", { spain: "¿Me cambias este billete?" })],
        c: [L("¡Qué bueno que {m:lo|f:la} veo! Llegó el garrafón.", "So glad to see you! The water jug's here.", { neutral: "¡Qué bueno que {m:lo|f:la} veo! Llegó el bidón de agua.", spain: "¡Qué bien {m:verlo|f:verla}! Ha llegado la garrafa de agua." }),
          L("¿Tendrá cambio de doscientos?", "Any chance you have change for two hundred today?")],
      } },
      choices: [
        { say: L("Claro. Tengo cambio.", "Sure. I've got change.") },
        { say: L("¡Sí! Tengo billetes de veinte.", "Yes! I've got twenties.") },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Voy a tener que viajar con mi alcancía.", "Thanks! I'll have to travel with my piggy bank.", { spain: "¡Gracias! Voy a tener que viajar con mi hucha." })],
        b: [L("¡Gracias! Entre el puesto y yo, nunca hay cambio.", "Thanks! Between me and the stall, nobody has change.")],
        c: [L("¡Gracias! Voy a guardar cambio hasta en la cocina.", "Thanks! I'll start keeping spare change in the kitchen.")],
      } },
      away: L("Bueno, voy a preguntar por ahí.", "All right, I'll ask around."),
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Buenas! Ahora llevo monedas para el pasaje.", "Hi! I carry coins for the fare now.", { spain: "¡Buenas! Ahora llevo monedas para el billete." })],
        b: [L("¡Hola! Ahora llevo billetes chicos al puesto.", "Hi! I bring smaller bills to the stall now.", { spain: "¡Hola! Ahora llevo billetes pequeños al puesto." })],
        c: [L("¡Buenas! Ya tengo un frasco con cambio para el agua.", "Hi! I've got a jar of change for the water now.", { spain: "¡Buenas! Ya tengo un bote con cambio para el agua." })],
      } },
      choices: [
        { say: L("¡Ya tiene todo listo!", "You're all set now!", { spain: "¡Ya está todo listo!" }),
          reply: [L("Sí. Hoy sí me acordé del cambio.", "Yep. I remembered my change today.", { spain: "Sí. Hoy sí me he acordado del cambio." })] },
        { say: L("¡Qué bueno! Así se ahorra tiempo.", "That's great! That saves you some time.", { spain: "¡Qué bien! Así se ahorra tiempo." }),
          reply: [L("Y hasta me queda tiempo para saludar.", "Now I've even got time to say hello.")] },
      ],
      away: L("¡Buen día!", "Have a nice day!", { spain: "¡Que vaya bien!" }),
    },
  },
  { id: "i_lost_dog", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "kid", role: "Little girl", prop: "dog", propKind: "brown", voice: "st_kid_f" },
      { id: "b", gender: "f", age: "adult", role: "Dog owner", prop: "dog", propKind: "white", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "old", role: "Dog owner", prop: "dog", propKind: "black", voice: "st_m_old" },
    ],
    first: {
      scene: { byCast: {
        a: "A little girl looks around while a brown dog sniffs nearby.",
        b: "A woman looks around while a white dog sniffs nearby.",
        c: "An older man scans the street while a black dog trots nearby.",
      } },
      open: { byCast: {
        a: [L("¿Me ayuda? Mi perro Churro se escapó.", "Can you help me? My dog Churro got away.", { spain: "¿Me ayuda? Mi perro Churro se ha escapado." })],
        b: [L("Se me escapó Nube. ¿Me ayuda a buscarla?", "Nube got away. Can you help me look for her?", { spain: "Se me ha escapado Nube. ¿Me ayuda a buscarla?" })],
        c: [L("¿No ha visto a Rayo? Es mi perro.", "Have you seen Rayo? He's my dog.")],
      } },
      choices: [
        { say: { byCast: {
          a: L("¡Ahí está! ¿Es ese?", "There he is! Is that him?"),
          b: L("¡Ahí está! ¿Es esa?", "There she is! Is that her?"),
          c: L("¡Ahí está! ¿Es ese?", "There he is! Is that him?"),
        } } },
        { say: { byCast: {
          a: L("¡Ven, Churro! ¡Aquí!", "Come here, Churro!"),
          b: L("¡Ven, Nube! ¡Aquí!", "Come here, Nube!"),
          c: L("¡Ven, Rayo! ¡Aquí!", "Come here, Rayo!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("¡Churro! ¡Gracias, ya me estaba asustando!", "Churro! Thank you, I was getting scared!")],
        b: [L("¡Nube! Gracias. Se distrae con cualquier cosa.", "Nube! Thanks. Anything can distract her.")],
        c: [L("¡Gracias! Rayo corre como un rayo.", "Thanks! Rayo runs like lightning.")],
      } },
      away: { byCast: {
        a: L("¡Churro, espérame!", "Churro, wait for me!"),
        b: L("¡Nube, ven para acá!", "Nube, over here!", { spain: "¡Nube, ven aquí!" }),
        c: L("¡Rayo! ¿Adónde vas tan rápido?", "Rayo! Where are you going in such a hurry?"),
      } },
    },
    second: {
      scene: { byCast: {
        a: "The little girl's brown dog slips away again.",
        b: "The woman's white dog wanders off again.",
        c: "The older man's black dog darts away again.",
      } },
      open: { byCast: {
        a: [L("¡Churro se escapó otra vez! ¡Qué bueno que {m:lo|f:la} veo!", "Churro got away again! I'm so glad to see you!", { spain: "¡Churro se ha escapado otra vez! ¡Menos mal que {m:lo|f:la} veo!" })],
        b: [L("¡Nube! Otra vez se me soltó. ¡Ah, es usted!", "Nube! She got loose again. Oh, it's you!", { spain: "¡Nube! Se me ha soltado otra vez. ¡Ah, es usted!" })],
        c: [L("¡Rayo, otra vez! ¡Qué suerte que anda por aquí!", "Rayo, not again! Lucky you're here!", { spain: "¡Rayo, otra vez! ¡Menos mal que está por aquí!" })],
      } },
      choices: [
        { say: L("¡Ven, ven! ¡Por aquí!", "Come on! Over here!") },
        { say: L("¡Ya viene! Me quedo {m:quieto|f:quieta}.", "Here comes the dog. I'll stay still.") },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! ¡Otra vez me ayudó!", "Thank you! You helped me again!", { spain: "¡Gracias! ¡Me ha ayudado otra vez!" }),
          L("Churro, ¡me vas a sacar canas!", "Churro, you're going to give me gray hair!")],
        b: [L("¡Ya van dos veces que me ayuda! Muchas gracias.", "That's twice you've helped me! Thank you so much."),
          L("Nube se cree dueña de toda la calle.", "Nube thinks she owns the whole street.")],
        c: [L("Ya nos conoce a los dos. ¡Gracias otra vez!", "You've gotten to know both of us now. Thanks again!"),
          L("Rayo quiere hacer ejercicio por los dos.", "Rayo wants to get enough exercise for both of us.")],
      } },
      away: { byCast: {
        a: L("¡Churro, espérame!", "Churro, wait for me!"),
        b: L("¡Nube, ven para acá!", "Nube, over here!", { spain: "¡Nube, ven aquí!" }),
        c: L("¡Rayo! ¿Adónde vas tan rápido?", "Rayo! Where are you going in such a hurry?"),
      } },
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Mire! Churro ya trae correa.", "Look! Churro's on a leash now.", { spain: "¡Mire! Churro ya lleva correa." })],
        b: [L("¡Hola! Ahora Nube siempre va con correa.", "Hi! Nube always goes out on a leash now.")],
        c: [L("¡Buenas! Con la correa, Rayo y yo vamos juntos.", "Hey there! This leash keeps Rayo and me together.")],
      } },
      choices: [
        { say: { byCast: {
          a: L("¡Qué bien! ¿Me dejas acariciarlo?", "Oh, good! Can I pet him?"),
          b: L("¡Qué bien! ¿Me deja acariciarla?", "Oh, good! May I pet her?"),
          c: L("¿Puedo acariciar a Rayo?", "May I pet Rayo?"),
        } },
          reply: { byCast: {
            a: [L("¡Sí! Le encantan las caricias.", "Yes! He loves being petted.")],
            b: [L("Claro. Si se sienta, es que quiere más.", "Sure. If she sits, that means she wants more.")],
            c: [L("Con gusto. Hoy tiene tiempo para saludar.", "Of course. He's got time to say hello today.")],
          } } },
        { say: L("¡Qué buen día para pasear juntos!", "What a nice day for a walk together!"),
          reply: [L("¡Sí! Hoy vamos al mismo paso.", "Yes! We're going at the same pace today.")] },
      ],
      away: L("¡Hasta luego!", "See you later!"),
    },
  },
  { id: "i_bike", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "young", role: "Cyclist", prop: "bike", voice: "st_m_young" },
      { id: "b", gender: "f", age: "adult", role: "Cyclist", prop: "bike", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "kid", role: "Boy", prop: "bike", propKind: "small", voice: "st_kid_m" },
    ],
    first: {
      scene: { byCast: {
        a: "A young cyclist looks down at his loose chain.",
        b: "A woman squeezes her bike's flat tire.",
        c: "A boy tries to turn a pedal on his jammed bike.",
      } },
      open: { byCast: {
        a: [L("Se me salió la cadena. ¿Me ayuda un momento?", "My chain came off. Can you help for a second?", { spain: "Se me ha salido la cadena. ¿Me ayudas un momento?" })],
        b: [L("Tengo una llanta ponchada. ¿Me ayuda?", "I've got a flat tire. Can you help me?", { neutral: "Tengo una llanta pinchada. ¿Me ayuda?", spain: "Tengo una rueda pinchada. ¿Me ayuda?" })],
        c: [L("¡Se atoró mi cadena! ¿Me ayuda?", "My chain's stuck! Can you help?", { neutral: "¡Se trabó mi cadena! ¿Me ayuda?", spain: "¡Se me ha atascado la cadena! ¿Me ayuda?" })],
      } },
      choices: [
        { say: { byCast: {
          a: L("¿Le detengo la bici?", "Want me to hold the bike?", { spain: "¿Te sujeto la bici?" }),
          b: L("¿Le detengo la bici?", "Want me to hold the bike?", { spain: "¿Le sujeto la bici?" }),
          c: L("¿Te detengo la bici?", "Want me to hold your bike?", { spain: "¿Te sujeto la bici?" }),
        } },
          reply: { byCast: {
            a: [L("Sí, gracias. Así puedo mirar la cadena.", "Yes, thanks. Now I can take a look at the chain.")],
            b: [L("Sí, gracias. Voy a ver si tiene un agujero.", "Yes, thanks. I'll check for a hole.")],
            c: [L("¡Gracias! Ya puedo ver dónde se atoró.", "Thanks! Now I can see where it's stuck.", { neutral: "¡Gracias! Ya puedo ver dónde se trabó.", spain: "¡Gracias! Ya puedo ver dónde se ha atascado." })],
          } } },
        { say: { byCast: {
          a: L("¿Apartamos la bici un momento?", "Shall we move the bike to the side for a moment?"),
          b: L("En la Gasolinera El Faro tienen aire.", "There's an air pump at El Faro gas station."),
          c: L("Vamos a poner la bici a un lado.", "Let's move the bike off to the side."),
        } },
          reply: { byCast: {
            a: [L("Buena idea. Así la reviso con calma.", "Good idea. Then I can check it without rushing.")],
            b: [L("Muchas gracias. Ahí puedo preguntar por un parche.", "Thanks so much. I can ask about a patch there.")],
            c: [L("Sí. Aquí puedo mirar sin estorbar.", "Yeah. I can look at it here without getting in the way.")],
          } } },
      ],
      away: L("Bueno, voy a mirar de nuevo.", "All right, I'll take another look."),
    },
    second: {
      scene: { byCast: {
        a: "The same young man's bike chain has slipped off again.",
        b: "The same woman has another flat bike tire.",
        c: "The boy's bike pedals are stuck again.",
      } },
      open: { byCast: {
        a: [L("¡Otra vez usted! Se me volvió a salir la cadena.", "It's you again! My chain came off again.", { spain: "¡Qué alegría verte! Se me ha vuelto a salir la cadena." })],
        b: [L("¡Hola otra vez! Otra llanta ponchada.", "Hi again! Another flat tire.", { neutral: "¡Hola otra vez! Otra llanta pinchada.", spain: "¡Hola otra vez! Otra rueda pinchada." })],
        c: [L("¡Soy yo otra vez! Mi cadena se atoró.", "It's me again! My chain got stuck.", { neutral: "¡Soy yo otra vez! Mi cadena se trabó.", spain: "¡Soy yo otra vez! Se me ha atascado la cadena." })],
      } },
      choices: [
        { say: { byCast: {
          a: L("¿La sostengo mientras la revisa?", "Shall I hold it while you check it?", { spain: "¿La sujeto mientras la revisas?" }),
          b: L("¿La sostengo mientras la revisa?", "Shall I hold it while you check it?", { spain: "¿La sujeto mientras la revisa?" }),
          c: L("¿La sostengo mientras la miras?", "How about I hold it while you look?", { spain: "¿La sujeto mientras la miras?" }),
        } } },
        { say: { byCast: {
          a: L("Vamos a poner la bici a un lado.", "Let's move the bike off to the side."),
          b: L("En la Gasolinera El Faro tienen aire.", "There's an air pump at El Faro gas station."),
          c: L("Vamos a poner la bici a un lado.", "Let's move the bike off to the side."),
        } } },
      ],
      reply: { byCast: {
        a: [L("¡Gracias otra vez! Hasta la cadena ya {m:lo|f:la} reconoce.", "Thanks again! Even the chain recognizes you now.", { spain: "¡Gracias otra vez! Hasta la cadena te reconoce ya." })],
        b: [L("¡Gracias! Mi bici se empeña en que camine.", "Thanks! My bike's determined to make me walk.")],
        c: [L("¡Gracias! Mi bici necesita recreo, igual que yo.", "Thanks! My bike needs recess, just like me.")],
      } },
      away: L("Bueno, voy a mirar de nuevo.", "All right, I'll take another look."),
    },
    familiar: {
      scene: "The cyclist rides by and waves.",
      open: { byCast: {
        a: [L("¡Hola! Ahora la cadena sí se queda en su lugar.", "Hi! The chain's staying where it belongs now.")],
        b: [L("¡Buenas! Ya cambié la llanta.", "Hi! I've changed the tire.", { spain: "¡Buenas! Ya he cambiado la rueda." })],
        c: [L("¡Mire, ya puedo pedalear otra vez!", "Look, I can pedal again!")],
      } },
      choices: [
        { say: L("¡Qué bien que ya rueda!", "Glad it's rolling again!"),
          reply: [L("Sí. ¡Qué gusto volver a andar en bici!", "Yeah. It feels good to be back on the bike!", { spain: "Sí. ¡Qué gusto volver a montar en bici!" })] },
        { say: L("¡Buen paseo en bici!", "Enjoy the ride!"),
          reply: [L("¡Gracias! Nos vemos en la próxima vuelta.", "Thanks! See you on my next ride.")] },
      ],
      away: L("¡Hasta la próxima vuelta!", "See you on the next ride!"),
    },
  },
  { id: "i_carry", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", prop: "water_jug", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Passer-by", prop: "market_bags", voice: "st_f_young" },
      { id: "c", gender: "f", age: "old", role: "Older lady", prop: "cake_box", voice: "st_f_old" },
    ],
    first: {
      scene: { byCast: {
        a: "A man holds a large water jug with both hands.",
        b: "A young woman carries a market bag in each hand.",
        c: "An older woman balances a cake box in her arms.",
      } },
      open: { byCast: {
        a: [L("¿Me ayuda tantito?", "Could you help me for a second?", { neutral: "¿Me ayuda un momento?" }),
          L("¿Me abre el portón? Traigo el garrafón de agua.", "Could you open the gate? I've got this water jug.", { neutral: "¿Me abre el portón? Traigo el bidón de agua.", spain: "¿Me abre el portón? Llevo la garrafa de agua." })],
        b: [L("¿Me ayuda tantito?", "Could you help me for a second?", { neutral: "¿Me ayuda un momento?", spain: "¿Me ayudas un momento?" }),
          L("¿Me sostiene una bolsa del mercado?", "Could you hold one of my market bags?", { spain: "¿Me sujetas una de las bolsas del mercado?" })],
        c: [L("¿Me ayuda tantito?", "Could you help me for a second?", { neutral: "¿Me ayuda un momento?" }),
          L("¿Me sostiene la caja del pastel?", "Could you hold the cake box for me?", { spain: "¿Me sujeta la caja de la tarta?" })],
      } },
      choices: [
        { say: { byCast: {
          a: L("Claro. Yo le abro el portón.", "Sure. I'll open the gate for you."),
          b: L("Claro. Le sostengo una bolsa.", "Sure. I'll hold one of the bags.", { spain: "Claro. Te sujeto una bolsa." }),
          c: L("Claro. Aquí le sostengo la caja.", "Sure. I'll hold the box right here.", { spain: "Claro. Aquí le sujeto la caja." }),
        } } },
        { say: L("Sí, sin problema.", "Yes, happy to help.") },
      ],
      reply: { byCast: {
        a: [L("Gracias. Con las manos ocupadas no podía abrir.", "Thanks. I couldn't open it with my hands full.")],
        b: [L("Gracias. Siempre compro más de lo que pensaba.", "Thanks. I always buy more than I meant to.")],
        c: [L("Gracias. Así puedo acomodar bien la tapa.", "Thanks. Now I can put the lid back on right.", { spain: "Gracias. Así puedo colocar bien la tapa." })],
      } },
      away: L("Bueno, me las arreglo. Gracias.", "All right, I'll manage. Thanks.", { spain: "Bueno, ya me apaño. Gracias." }),
    },
    second: {
      scene: { byCast: {
        a: "The same man has both hands on another water jug.",
        b: "The same young woman is back with both hands full of bags.",
        c: "The older woman is back with another cake box.",
      } },
      open: { byCast: {
        a: [L("¡Ah, es usted! Otra vez tengo las manos ocupadas.", "Oh, it's you! My hands are full again."),
          L("¿Me abre el portón otra vez?", "Could you get the gate for me again?")],
        b: [L("¡Ah, es usted! Otra vez salí con demasiadas bolsas.", "Oh, it's you! I came out with too many bags again.", { spain: "¡Ah, eres tú! Otra vez he salido con demasiadas bolsas." }),
          L("¿Me sostiene una un momento?", "Could you hold one for a moment?", { spain: "¿Me sujetas una un momento?" })],
        c: [L("¡Otra vez usted, qué suerte! Traigo otro pastel.", "You again, lucky me! I've got another cake.", { spain: "¡Qué suerte {m:encontrarlo|f:encontrarla}! Llevo otra tarta." }),
          L("¿Me sostiene la caja un momento?", "Could you hold the box for a moment?", { spain: "¿Me sujeta la caja un momento?" })],
      } },
      choices: [
        { say: L("¡Claro! Entre dos es más fácil.", "Of course! It's easier with two people.") },
        { say: { byCast: {
          a: L("Espere. Le detengo el portón.", "Hang on. I'll hold the gate for you.", { spain: "Espere. Le sujeto el portón." }),
          b: L("Páseme la bolsa más pesada.", "Hand me the heaviest bag.", { spain: "Pásame la bolsa más pesada." }),
          c: L("Sí. La sostengo con las dos manos.", "Yes. I'll hold it with both hands.", { spain: "Sí. La sujeto con las dos manos." }),
        } } },
      ],
      reply: { byCast: {
        a: [L("¡Gracias! Ya parece un trabajo de dos.", "Thanks! This is turning into a two-person job.")],
        b: [L("¡Gracias otra vez! Siempre digo que compraré poquito.", "Thanks again! I always say I'll buy just a little.", { spain: "¡Gracias otra vez! Siempre digo que voy a comprar poco." })],
        c: [L("¡Gracias! Hoy el pastel viaja en primera clase.", "Thanks! The cake's traveling first class today.", { spain: "¡Gracias! Hoy la tarta viaja en primera clase." })],
      } },
      away: L("Bueno, me las arreglo. Gracias.", "All right, I'll manage. Thanks.", { spain: "Bueno, ya me apaño. Gracias." }),
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Buenas! A usted ya {m:lo|f:la} saludo desde lejos.", "Hi! I start saying hello as soon as I spot you now.")],
        b: [L("¡Hola! Da gusto encontrarse caras conocidas.", "Hi! It's nice to run into a familiar face.")],
        c: [L("¡Hola de nuevo! Qué gusto {m:verlo|f:verla}.", "Hello again! It's lovely to see you.", { spain: "¡Hola de nuevo! Qué alegría {m:verlo|f:verla}." })],
      } },
      choices: [
        { say: L("¡Qué gusto encontrarnos por aquí!", "It's good to run into you around here!", { spain: "¡Qué alegría coincidir por aquí!" }),
          reply: [L("Igualmente. Siempre alegra un buen saludo.", "Same here. A friendly hello always cheers me up.")] },
        { say: L("¡Que siga bien el día!", "Enjoy the rest of your day!"),
          reply: [L("¡Gracias! Que también le vaya bien.", "Thanks! Hope you have a good day, too.", { spain: "¡Gracias! Igualmente, que vaya bien." })] },
      ],
      away: L("¡Hasta que nos volvamos a cruzar!", "Till we cross paths again!"),
    },
  },
  { id: "i_survey", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Student", prop: "clipboard", voice: "st_f_young" },
      { id: "b", gender: "m", age: "adult", role: "Radio reporter", prop: "microphone", voice: "st_m_adult" },
      { id: "c", gender: "f", age: "old", role: "Church volunteer", prop: "clipboard", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Disculpe. Es para una encuesta de la escuela.", "Excuse me. It's for a school survey.", { spain: "Perdona. Es para un trabajo de clase." }),
          L("¿Qué es lo que más le gusta de Puerto Colibrí?", "What do you like most about Puerto Colibrí?", { spain: "¿Qué es lo que más te gusta de Puerto Colibrí?" })],
        b: [L("Soy de Radio Puerto Colibrí. ¿Tiene un momento?", "I'm with Radio Puerto Colibrí. Got a moment?"),
          L("¿Qué es lo que más le gusta de Puerto Colibrí?", "What do you like most about Puerto Colibrí?")],
        c: [L("Estoy haciendo una encuesta para la iglesia.", "I'm doing a survey for the church."),
          L("¿Qué es lo que más le gusta de Puerto Colibrí?", "What do you like most about Puerto Colibrí?")],
      } },
      choices: [
        { say: L("¡La playa!", "The beach!"),
          reply: [L("¡Gracias! Esa respuesta se oye mucho.", "Thanks! I hear that answer a lot.")] },
        { say: { byCast: {
          a: L("¡La comida!", "The food!"),
          b: L("¡La gente!", "The people!"),
          c: L("¡La gente!", "The people!"),
        } },
          reply: [L("¡Gracias! Esa también la apunto.", "Thanks! I'll put that one down, too.")] },
        { say: { byCast: {
          a: L("Ahorita no puedo, perdone.", "Sorry, I can't right now.", { neutral: "Ahora no puedo, perdone.", spain: "Ahora no puedo, perdona." }),
          b: L("Ahorita no puedo, perdone.", "Sorry, I can't right now.", { neutral: "Ahora no puedo, perdone." }),
          c: L("Ahorita no puedo, perdone.", "Sorry, I can't right now.", { neutral: "Ahora no puedo, perdone." }),
        } }, helped: false,
          reply: [L("Claro. Gracias de todos modos.", "Of course. Thanks anyway.")] },
      ],
      away: L("¡Que tenga un buen paseo!", "Have a lovely walk!", { spain: "¡Que vaya bien el paseo!" }),
    },
    second: {
      open: { byCast: {
        a: [L("¡Hola otra vez! Ya casi termino la encuesta.", "Hi again! I'm almost done with the survey.", { spain: "¡Hola otra vez! Ya casi he terminado la encuesta." }),
          L("¿Qué le diría a quien llega por primera vez?", "What would you tell someone visiting for the first time?", { spain: "¿Qué le dirías a quien llega por primera vez?" })],
        b: [L("¡Buenas otra vez! Hoy quiero consejos para los visitantes.", "Hello again! Today I'm after tips for visitors."),
          L("¿Qué le diría a quien llega por primera vez?", "What would you tell someone visiting for the first time?")],
        c: [L("¡Hola! Se me ocurrió otra pregunta para la encuesta.", "Hello! I thought of another question for the survey.", { spain: "¡Hola! Se me ha ocurrido otra pregunta para la encuesta." }),
          L("¿Qué le diría a quien llega por primera vez?", "What would you tell someone visiting for the first time?")],
      } },
      choices: [
        { say: L("Que se tome su tiempo para ver el mar.", "I'd say to take their time and enjoy the sea."),
          reply: [L("Qué buen consejo. Eso se lo diría yo también.", "That's good advice. I'd tell them that, too.")] },
        { say: L("Que venga con ganas de probar la comida.", "I'd say to come ready to try the food."),
          reply: [L("¡Buen consejo! Siempre hay algo rico que probar.", "Good advice! There's always something tasty to try.")] },
      ],
      away: L("Bueno, sigo con las preguntas. ¡Gracias!", "All right, I'll keep asking around. Thanks!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("¡Hola! Ya conté todas las respuestas.", "Hi! I counted all the answers.", { spain: "¡Hola! Ya he contado todas las respuestas." }),
          L("¡Ganó la playa!", "The beach won!", { spain: "¡Ha ganado la playa!" })],
        b: [L("¡Buenas! Ya dimos el resultado en la radio.", "Hi! We announced the result on the radio.", { spain: "¡Buenas! Ya hemos dado el resultado en la radio." }),
          L("¡La playa fue la más votada!", "The beach got the most votes!", { spain: "¡La playa ha sido la más votada!" })],
        c: [L("¡Hola! Ya tenemos el resultado de la encuesta.", "Hello! We've got the survey result."),
          L("La playa quedó en primer lugar.", "The beach came in first.", { spain: "La playa ha quedado en primer lugar." })],
      } },
      choices: [
        { say: L("¡Qué bien! ¿Y qué quedó en segundo lugar?", "That's great! And what came in second?", { spain: "¡Qué bien! ¿Y qué ha quedado en segundo lugar?" }),
          reply: [L("La comida. Casi alcanzó a la playa.", "The food. It nearly caught up with the beach.")] },
        { say: L("¡Qué bueno! A mí también me gusta la playa.", "Nice! I like the beach, too."),
          reply: [L("Sí. Hubo quien contestó sin pensarlo.", "Yep. Some people answered without even thinking.", { spain: "Sí. Hay quien ha contestado sin pensarlo." })] },
      ],
      away: L("¡Nos vemos por el pueblo!", "See you in town!"),
    },
  },

  // ---------------------------------------------------------------- arcs
  { id: "a_cafe", kind: "arc", after: { id: "i_dropped", helped: true },
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Passer-by", prop: "coffee_cup", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "adult", role: "Passer-by", prop: "coffee_cup", voice: "st_f_adult" },
      { id: "c", gender: "f", age: "old", role: "Older lady", prop: "coffee_cup", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Ayer me devolvió la cartera. Eso no se olvida.", "Yesterday you brought my wallet back. That sticks with you.", { neutral: "Ayer me devolvió la billetera. Eso no se olvida.", spain: "Ayer me devolvió la cartera. Eso no se olvida." }),
          L("Hoy le invito un café de olla de Café La Ceiba.", "Today I'm treating you to spiced coffee from La Ceiba Café.", { spain: "Hoy le invito a un café de olla de Café La Ceiba." })],
        b: [L("Ayer me salvó con las llaves.", "You saved me yesterday when I dropped my keys."),
          L("Hoy le invito un café de olla de Café La Ceiba.", "Today I'm treating you to spiced coffee from La Ceiba Café.", { spain: "Hoy le invito a un café de olla de Café La Ceiba." })],
        c: [L("Ayer me encontró los lentes de sol.", "You found my sunglasses for me yesterday.", { neutral: "Ayer me encontró los anteojos de sol.", spain: "Ayer me encontró las gafas de sol." }),
          L("Hoy le invito un café de olla de Café La Ceiba.", "Today I'm treating you to spiced coffee from La Ceiba Café.", { spain: "Hoy le invito a un café de olla de Café La Ceiba." })],
      } },
      choices: [
        { say: L("¡Qué detalle! Muchas gracias.", "That's so thoughtful. Thank you so much!") },
        { say: L("¡Justo se me antojaba un café!", "I was just in the mood for coffee!", { neutral: "¡Justo tenía ganas de tomar un café!", spain: "¡Justo me apetecía un café!" }) },
      ],
      reply: { byCast: {
        a: [L("Gracias a usted. Todavía está calientito.", "Thank you. It's still nice and warm.", { spain: "Gracias a usted. Todavía está calentito." })],
        b: [L("De nada. Hoy sí guardé bien las llaves.", "You're welcome. My keys are tucked away today.", { spain: "De nada. Hoy sí he guardado bien las llaves." })],
        c: [L("De nada. Para que lo disfrute a la sombra.", "You're welcome. It's for you to enjoy in the shade.")],
      } },
      away: L("Bueno, se lo guardo para luego.", "All right, I'll save it for you."),
      card: L("Le invito un café.", "Coffee's on me.", { spain: "Le invito a un café." }),
    },
  },
  { id: "a_pulsera", kind: "arc", after: { id: "i_tourist", helped: true },
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Tourist", prop: "bracelet", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Tourist", prop: "bracelet", voice: "st_f_young" },
      { id: "c", gender: "m", age: "old", role: "Tourist", prop: "bracelet", voice: "st_m_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Mañana me voy. Esta pulsera tejida es para usted.", "I leave tomorrow. This woven bracelet is for you."),
          L("La compré a los artesanos junto a las ruinas.", "I bought it from the artisans by the ruins.")],
        b: [L("Mañana me voy. Quería darle esta pulsera tejida.", "I'm leaving tomorrow. I wanted you to have this woven bracelet.", { spain: "Mañana me voy. Quería darte esta pulsera tejida." }),
          L("La compré a los artesanos junto a las ruinas.", "I bought it from the artisans by the ruins.")],
        c: [L("Mañana salgo del pueblo. Le traje esta pulsera tejida.", "I'm leaving town tomorrow. I brought you this woven bracelet.", { spain: "Mañana me voy del pueblo. Le he traído esta pulsera tejida." }),
          L("La compré a los artesanos junto a las ruinas.", "I bought it from the artisans by the ruins.")],
      } },
      choices: [
        { say: L("¡Qué bonita! Muchas gracias.", "It's beautiful! Thank you so much.") },
        { say: L("La voy a guardar de recuerdo.", "I'll keep it as a souvenir.") },
      ],
      reply: { byCast: {
        a: [L("Es un detalle. Gracias por lo del cenote.", "A little something to thank you for the tip about the cenote.")],
        b: [L("Es un detalle. Gracias por ayudarme con el hotel.", "A little something to thank you for helping me find my hotel.")],
        c: [L("Es un detalle. Gracias por lo del museo.", "A little something to thank you for the help with the museum.")],
      } },
      away: L("Bueno, me despido. ¡Que le vaya bien!", "Well, I'll say goodbye. All the best!", { spain: "Bueno, me despido. ¡Que vaya bien!" }),
      card: L("Es un detalle.", "It's a little something."),
    },
  },
  { id: "a_serenata", kind: "arc", after: { id: "r_trovador", seen: 2 },
    cast: [{ id: "a", gender: "m", age: "old", role: "Street singer", name: "Don Chucho", prop: "guitar", voice: "st_chucho" }],
    first: {
      scene: "Don Chucho lifts his guitar as people stop to listen.",
      open: { byCast: {
        a: [L("¡Un momentito, vecinos! Hoy voy a cantar un bolero.", "A moment, neighbors! I'm going to sing a bolero."),
          L("Esta canción va para usted.", "This song is for you.")],
      } },
      choices: [
        { say: L("Qué honor, Don Chucho. Lo escucho con gusto.", "What an honor, Don Chucho. I'd love to hear it.") },
        { say: L("Gracias, Don Chucho. Me hizo sonreír.", "Thank you, Don Chucho. You made me smile.", { spain: "Gracias, Don Chucho. Me ha hecho sonreír." }) },
      ],
      reply: [L("Ojalá le haga tanta compañía como a mí.", "I hope it keeps you company the way it does for me."),
        L("Que el mar le cante bajito camino a casa.", "May the sea sing softly to you on your way home.")],
      away: L("Otro día se la canto, con mucho gusto.", "I'd be happy to sing it for you another day."),
      card: L("Esta canción va para usted.", "This song is for you."),
    },
  },
  { id: "a_mango", kind: "arc", after: { id: "i_spill", helped: true },
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Shopper", prop: "fruit_cup", voice: "st_f_adult" },
      { id: "b", gender: "m", age: "old", role: "Shopper", prop: "fruit_cup", voice: "st_m_old" },
      { id: "c", gender: "f", age: "young", role: "Shopper", prop: "fruit_cup", voice: "st_f_young" },
    ],
    first: {
      open: { byCast: {
        a: [L("¿Se acuerda de los mangos? Le guardé un vasito.", "Remember the mangoes? I saved you a cup.", { spain: "¿Se acuerda de los mangos? Le he guardado un vasito." }),
          L("Con chile y limón. Para usted.", "With chili and lime. It's for you.", { neutral: "Con chile y lima. Para usted." })],
        b: [L("¿Se acuerda de mis naranjas? Le traje un vasito.", "Remember my oranges? I brought you a cup.", { spain: "¿Se acuerda de mis naranjas? Le he traído un vasito." }),
          L("Con chile y limón. Para usted.", "With chili and lime. It's for you.", { neutral: "Con chile y lima. Para usted." })],
        c: [L("¡Hola! Le traje un vasito de fruta.", "Hi! I brought you a fruit cup.", { spain: "¡Hola! Te he traído un vasito de fruta." }),
          L("Con chile y el jugo de aquellos limones.", "With chili and juice from those limes.", { neutral: "Con chile y el jugo de aquellas limas.", spain: "Con chile y el zumo de aquellas limas." })],
      } },
      choices: [
        { say: L("¡Se ve buenísimo! Muchas gracias.", "That looks delicious! Thank you so much.", { spain: "¡Tiene una pinta estupenda! Muchas gracias." }) },
        { say: L("¿Con chile? Justo como me gusta.", "With chili? Just the way I like it.") },
      ],
      reply: { byCast: {
        a: [L("Buen provecho. Son de los que juntamos aquel día.", "Enjoy. They're from the mangoes we picked up that day.", { spain: "Que aproveche. Son de los que recogimos aquel día." })],
        b: [L("Buen provecho. Estas naranjas se portaron mejor.", "Enjoy. These oranges behaved themselves better.", { spain: "Que aproveche. Estas naranjas se han portado mejor." })],
        c: [L("Buen provecho. Esta vez los limones se quedaron quietos.", "Enjoy. This time the limes stayed put.", { neutral: "Buen provecho. Esta vez las limas se quedaron quietas.", spain: "Que aproveche. Esta vez las limas se han quedado quietas." })],
      } },
      away: L("Se lo guardo para más tarde.", "I'll keep it for you for later.", { spain: "Te lo guardo para más tarde." }),
      card: L("¡Buen provecho!", "Enjoy your food!", { spain: "¡Que aproveche!" }),
    },
  },
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
  { id: "c_fiesta_iglesia", near: "square", lines: [
    L("¿Vas a la fiesta de la iglesia?", "Are you going to the church festival?"),
    L("Claro. Esta vez sí me aprendo los pasos.", "Of course. This time I'm learning the dance steps."),
  ] },
  { id: "c_quince", near: "square", lines: [
    L("¿Ya ensayaste el vals para la quinceañera?", "Have you practiced the waltz for the quinceañera?", { neutral: "¿Ya ensayaste el vals para la fiesta de quince años?", spain: "¿Has ensayado ya el vals para la fiesta de quince años?" }),
    L("Sí. La silla ya se sabe todos los pasos.", "Yep. The chair knows all the steps by now."),
  ] },
  { id: "c_radio", near: "cafe", lines: [
    L("¿Oyes? La ponen mucho en Radio Puerto Colibrí.", "Hear that? They play it a lot on Radio Puerto Colibrí."),
    L("Ya me la sé. Hasta la canto lavando platos.", "I know it by heart now. I even sing it while doing dishes."),
  ] },
  { id: "c_cafe_de_olla", near: "cafe", lines: [
    L("¿Ya probaste el café de olla?", "Have you tried the spiced coffee yet?", { spain: "¿Has probado ya el café de olla?" }),
    L("Sí. Huele a canela hasta en la banqueta.", "Yeah. You can smell the cinnamon out on the sidewalk.", { neutral: "Sí. Huele a canela hasta en la acera." }),
  ] },
  { id: "c_apagon", lines: [
    L("¿Se te fue la luz anoche?", "Did your power go out last night?"),
    L("Sí. Hasta saqué la silla para ver las estrellas.", "Yep. I even took a chair outside to watch the stars."),
  ] },
  { id: "c_lanchas", near: "water", lines: [
    L("¿Ya viste las lanchas que vuelven al muelle?", "Have you seen the boats coming back to the pier?", { spain: "¿Has visto ya las lanchas que vuelven al muelle?" }),
    L("Sí. Las gaviotas llegaron primero, como siempre.", "Yep. The gulls got here first, as usual.", { spain: "Sí. Las gaviotas han llegado primero, como siempre." }),
  ] },
  { id: "c_papel_picado", near: "square", lines: [
    L("¿Ya viste el papel picado del kiosco?", "Have you seen the cut-paper banners on the bandstand?", { spain: "¿Has visto ya el papel picado del kiosco?" }),
    L("Sí. Mi abuela hizo el azul.", "Yeah. My grandma made the blue ones."),
  ] },
  { id: "c_merida", lines: [
    L("¿Cuándo llega tu sobrino de Mérida?", "When's your nephew coming from Mérida?"),
    L("Mañana. Dice que viene por el mar y los mangos.", "Tomorrow. He says he's coming for the sea and the mangoes."),
  ] },
  { id: "c_surf", lines: [
    L("¿Te animas a una clase de surf en La Ola?", "Feel like taking a surf lesson at La Ola?"),
    L("Sí. Primero quiero aprender a caer con estilo.", "Yeah. First I want to learn to fall with style."),
  ] },
  { id: "c_boda", lines: [
    L("¿Vas a la boda de tu prima?", "Are you going to your cousin's wedding?"),
    L("Sí. Dice que vamos a bailar hasta que amanezca.", "Yeah. She says we're going to dance till sunrise."),
  ] },
  { id: "c_palapa", near: "water", lines: [
    L("¿Te quedas bajo la palapa?", "Are you staying under the beach shelter?"),
    L("Sí. Hoy el sol trabaja más que yo.", "Yep. The sun's working harder than I am today."),
  ] },
  { id: "c_wifi", near: "cafe", lines: [
    L("¿Te funciona el wifi aquí?", "Does the Wi-Fi work for you here?"),
    L("Sí, pero los mensajes pueden esperar a que termine mi café.", "Yeah, but my messages can wait till I finish my coffee."),
  ] },
  { id: "c_flores", near: "square", lines: [
    L("¿Ya viste las flores frente a la iglesia?", "Have you seen the flowers in front of the church?", { spain: "¿Has visto ya las flores frente a la iglesia?" }),
    L("Sí. Mi tía dice que alegran la plaza.", "Yeah. My aunt says they brighten up the square."),
  ] },
  { id: "c_colectivo", lines: [
    L("¿Alcanzaste el colectivo?", "Did you make it to the shared van in time?", { neutral: "¿Alcanzaste el minibús?", spain: "¿Has llegado a coger el colectivo?" }),
    L("Sí. Corrí tanto que me gané el asiento.", "Yep. I ran so hard I earned my seat.", { spain: "Sí. He corrido tanto que me he ganado el asiento." }),
  ] },
  { id: "c_mercado", lines: [
    L("¿Cuánto pagaste por los mangos en el mercado?", "How much did you pay for mangoes at the market?", { spain: "¿Cuánto has pagado por los mangos en el mercado?" }),
    L("Treinta pesos el kilo. Me dieron uno para probar.", "Thirty pesos a kilo. They gave me one to try.", { spain: "Treinta pesos el kilo. Me han dado uno para probar." }),
  ] },
  { id: "c_crucero", lines: [
    L("¿Viste a los del crucero en el mercado?", "Did you see the cruise passengers at the market?", { spain: "¿Has visto a los del crucero en el mercado?" }),
    L("Sí. Salieron con sombreros para todos.", "Yep. They left with hats for everybody.", { spain: "Sí. Han salido con sombreros para todos." }),
  ] },
];
