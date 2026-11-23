// Street life in Maple Harbor (batch 5, 23 Nov 2026): 24 street moments and 20 overheard chatters. Written by
// Claude; the shape is src/game/street/types.ts, the engine src/game/street/. American English; Lithuanian with a
// capital Jūs for one person; townspeople who don't know each other well say Jūs, friends chatting say tu; adults
// say tu to the kids and to the teen, who say Jūs back.
// Continuity the scripts lean on: Jess walks other people's dogs (Biscuit, brown; Daisy, white); Ruth's chubby
// pigeon is Lucky; the tourists come from Chicago (a), San Diego (b) and Florida (c) (a_postcard); the spilled fruit
// becomes an apple pie (a), the wife's orange cake (b) and lemon bars for Mom (c) (a_pie); Eli's new song is
// "Hello, Neighbor" (a_song); the old lady of i_change tips "the young man with the guitar" (Eli).
import type { StreetChatter, StreetLine, StreetMoment } from "../game/street/types";

const L = (en: string, lt: string): StreetLine => ({ en, lt });

export const STREET_MOMENTS: StreetMoment[] = [
  // ---------------------------------------------------------------- regulars
  {
    id: "r_musician", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "young", role: "Gatvės muzikantas", name: "Eli", prop: "guitar", voice: "st_eli" },
      { id: "b", gender: "m", age: "young", role: "Gatvės muzikantas", name: "Eli", prop: "small_guitar", voice: "st_eli" },
    ],
    first: {
      scene: { byCast: { a: "Jaunas vaikinas groja gitara.", b: "Jaunas vaikinas groja ukulele." } },
      open: [L("Hey there! Got a minute? This one's my own song.", "Sveiki! Turite minutėlę? Šią dainą parašiau pats.")],
      choices: [
        { say: L("Sure! I love music.", "Žinoma! Labai mėgstu muziką.") },
        { say: L("Sounds great! What's it called?", "Skamba puikiai! Kaip ji vadinasi?"),
          reply: [L("It's called “Maple Harbor Blues.” Thanks for listening!", "Ji vadinasi „Maple Harbor bliuzas“. Ačiū, kad klausotės!")] },
        { say: L("Sorry, I'm in a bit of a hurry!", "Atsiprašau, šiek tiek skubu!"), helped: false,
          reply: [L("No worries! Have a good one!", "Nieko tokio! Geros dienos!")] },
      ],
      reply: [L("Thanks! I play here most days. Come back anytime!", "Ačiū! Groju čia beveik kasdien. Užsukite bet kada!")],
      away: L("See you around!", "Iki pasimatymo!"),
    },
    second: {
      open: [L("Hey, you're back! I'm Eli, by the way. Any requests today?", "Ei, Jūs vėl čia! Beje, aš – Eli. Gal norite kokios dainos?")],
      choices: [
        { say: L("Play something happy!", "Sugrokite ką nors linksmo!") },
        { say: L("Your song again, please!", "Dar kartą savo dainą, prašau!") },
      ],
      reply: [L("You got it! This one's for you.", "Bus padaryta! Ši daina – Jums.")],
      away: L("Catch you later!", "Iki kito karto!"),
      named: true,
    },
    familiar: {
      open: [L("My favorite audience! How's your day going?", "Mano mėgstamiausia publika! Kaip sekasi šiandien?")],
      choices: [
        { say: L("Great, thanks! And you?", "Puikiai, ačiū! O Jums?") },
        { say: L("Pretty good! Nice music, as always.", "Visai neblogai! Muzika graži, kaip visada.") },
      ],
      reply: [L("Can't complain! The sun's out, and people are smiling.", "Negaliu skųstis! Šviečia saulė, žmonės šypsosi.")],
      away: L("See you tomorrow, I hope!", "Tikiuosi, iki rytojaus!"),
    },
  },
  {
    id: "r_pretzel", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Gatvės prekeivis", name: "Sal", prop: "cart", propKind: "pretzels", voice: "st_sal" },
      { id: "b", gender: "m", age: "old", role: "Gatvės prekeivis", name: "Sal", prop: "cart", propKind: "cider", voice: "st_sal" },
    ],
    first: {
      open: { byCast: {
        a: [L("Hot pretzels! Get 'em while they're hot!", "Karšti kringeliai! Imkite, kol karšti!")],
        b: [L("Hot apple cider! Perfect for a chilly day!", "Karštos obuolių sultys! Kaip tik vėsiai dienai!")],
      } },
      choices: [
        { say: L("Yes, please! How much?", "Taip, prašau! Kiek kainuoja?"),
          reply: { byCast: {
            a: [L("Three bucks. Here you go, nice and warm!", "Trys doleriai. Prašom, dar šiltas!")],
            b: [L("Two bucks. Here you go. Careful, it's hot!", "Du doleriai. Prašom. Atsargiai, karšta!")],
          } } },
        { say: L("Mmm, that smells amazing!", "Mmm, kaip skaniai kvepia!"),
          reply: [L("Thanks! It's my grandma's recipe.", "Ačiū! Mano močiutės receptas.")] },
        { say: L("Maybe next time, thanks!", "Gal kitą kartą, ačiū!"), helped: false,
          reply: [L("Sure thing! I'm here every day.", "Žinoma! Aš čia kasdien.")] },
      ],
      away: L("Have a good one!", "Geros dienos!"),
    },
    second: {
      open: { byCast: {
        a: [L("Hey, it's you again! I'm Sal, by the way.", "Ei, vėl Jūs! Beje, aš – Sal."), L("Pretzel today?", "Gal šiandien kringelio?")],
        b: [L("Hey, it's you again! I'm Sal, by the way.", "Ei, vėl Jūs! Beje, aš – Sal."), L("Hot cider today?", "Gal šiandien karštų sulčių?")],
      } },
      choices: [
        { say: L("Yes, please! Nice to meet you!", "Taip, prašau! Malonu susipažinti!") },
        { say: L("Not today. Just saying hi!", "Šiandien ne. Tik užsukau pasisveikinti!"),
          reply: [L("Well, hi yourself! Hellos are always free.", "Sveiki ir Jums! Pasisveikinti visada nemokama.")] },
      ],
      reply: { byCast: {
        a: [L("Here you go. Extra salt, just for you!", "Prašom. Su papildoma druska – specialiai Jums!")],
        b: [L("Here you go. Extra cinnamon, just for you!", "Prašom. Su papildomu cinamonu – specialiai Jums!")],
      } },
      away: L("See you around!", "Iki pasimatymo!"),
      named: true,
    },
    familiar: {
      open: [L("There's my favorite customer! The usual?", "Štai {m:mano mėgstamiausias klientas|f:mano mėgstamiausia klientė}! Tą patį, kaip visada?")],
      choices: [
        { say: L("The usual, please!", "Kaip visada, prašau!") },
        { say: L("You know me so well!", "Jūs mane taip gerai pažįstate!") },
      ],
      reply: [L("Coming right up! This one's on the house.", "Tuoj bus! Šįkart aš vaišinu.")],
      away: L("Take care now!", "Laikykitės!"),
    },
  },
  {
    id: "r_dogwalker", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Šunų vedžiotoja", name: "Jess", prop: "dog", propKind: "brown", voice: "st_jess" },
      { id: "b", gender: "f", age: "young", role: "Šunų vedžiotoja", name: "Jess", prop: "dog", propKind: "white", voice: "st_jess" },
    ],
    first: {
      scene: { byCast: {
        a: "Mergina veda rudą šunį. Šuo iškart pribėga susipažinti.",
        b: "Mergina veda baltą šunį. Šuo iškart pribėga susipažinti.",
      } },
      open: { byCast: {
        a: [L("Oops! Sorry, he just loves new people.", "Oi! Atsiprašau, jis tiesiog dievina naujus žmones.")],
        b: [L("Oops! Sorry, she just loves new people.", "Oi! Atsiprašau, ji tiesiog dievina naujus žmones.")],
      } },
      choices: [
        { say: { byCast: {
          a: L("That's okay! Can I pet him?", "Nieko tokio! Ar galiu jį paglostyti?"),
          b: L("That's okay! Can I pet her?", "Nieko tokio! Ar galiu ją paglostyti?"),
        } },
          reply: { byCast: {
            a: [L("Of course! He's a big softie.", "Žinoma! Jis didelis meilutis.")],
            b: [L("Of course! She's a big softie.", "Žinoma! Ji didelė meilutė.")],
          } } },
        { say: L("No problem! What a cute dog!", "Nieko tokio! Koks mielas šuo!"),
          reply: { byCast: {
            a: [L("Thanks! He's not mine, though. I'm a dog walker.", "Ačiū! Tik jis ne mano – aš šunų vedžiotoja.")],
            b: [L("Thanks! She's not mine, though. I'm a dog walker.", "Ačiū! Tik ji ne mano – aš šunų vedžiotoja.")],
          } } },
      ],
      away: L("Come on, let's go! Bye!", "Eime, eime! Iki!"),
    },
    second: {
      open: { byCast: {
        a: [L("Oh, hi again! I'm Jess, by the way.", "O, vėl sveiki! Beje, aš – Jess."), L("And this goofball is Biscuit.", "O šitas išdykėlis – Sausainiukas.")],
        b: [L("Oh, hi again! I'm Jess, by the way.", "O, vėl sveiki! Beje, aš – Jess."), L("And this little lady is Daisy.", "O ši panelė – Ramunė.")],
      } },
      choices: [
        { say: L("Nice to meet you, Jess!", "Malonu susipažinti, Jess!") },
        { say: { byCast: {
          a: L("Hi, Biscuit! Who's a good boy?", "Labas, Sausainiuk! Kas čia toks geras šuniukas?"),
          b: L("Hi, Daisy! Who's a good girl?", "Labas, Ramune! Kas čia tokia gera šunytė?"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Ha! He says hi back. We're out here every morning.", "Cha! Jis irgi sveikinasi. Mes čia būname kas rytą.")],
        b: [L("Ha! She says hi back. We're out here every morning.", "Cha! Ji irgi sveikinasi. Mes čia būname kas rytą.")],
      } },
      away: L("See you around!", "Iki pasimatymo!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey, friend! Biscuit, look who's here!", "Sveiki, drauge! Sausainiuk, žiūrėk, kas atėjo!"), L("Want to give him a treat?", "Norite duoti jam skanėstą?")],
        b: [L("Hey, friend! Daisy, look who's here!", "Sveiki, drauge! Ramune, žiūrėk, kas atėjo!"), L("Want to give her a treat?", "Norite duoti jai skanėstą?")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Sure! Sit, Biscuit! Good boy!", "Žinoma! Sėdėk, Sausainiuk! Šaunuolis!"),
          b: L("Sure! Sit, Daisy! Good girl!", "Žinoma! Sėdėk, Ramune! Šaunuolė!"),
        } } },
        { say: L("I'd love to!", "Mielai!") },
      ],
      reply: { byCast: {
        a: [L("Look at that! He listens to you better than me.", "Tik pažiūrėkite! Jūsų jis klauso geriau nei manęs.")],
        b: [L("Look at that! She listens to you better than me.", "Tik pažiūrėkite! Jūsų ji klauso geriau nei manęs.")],
      } },
      away: L("Bye! See you tomorrow!", "Iki! Pasimatysime rytoj!"),
    },
  },
  {
    id: "r_painter", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "f", age: "old", role: "Dailininkė", name: "Martha", prop: "easel", propKind: "lighthouse", voice: "st_martha" },
      { id: "b", gender: "f", age: "old", role: "Dailininkė", name: "Martha", prop: "easel", propKind: "boats", voice: "st_martha" },
    ],
    first: {
      scene: { byCast: {
        a: "Senyva moteris prie molberto tapo švyturį.",
        b: "Senyva moteris prie molberto tapo valtis uoste.",
      } },
      open: { byCast: {
        a: [L("Oh, hello! Do you like it? It's the lighthouse.", "O, sveiki! Ar Jums patinka? Čia švyturys.")],
        b: [L("Oh, hello! Do you like it? It's the boats in the harbor.", "O, sveiki! Ar Jums patinka? Čia valtys uoste.")],
      } },
      choices: [
        { say: L("It's beautiful! You're really good.", "Labai gražu! Jūs tikrai puikiai tapote.") },
        { say: L("I love the colors!", "Man labai patinka spalvos!") },
      ],
      reply: [L("Oh, thank you! I've been painting here for forty years.", "O, ačiū! Tapau čia jau keturiasdešimt metų.")],
      then: {
        open: [L("Do you paint too?", "O Jūs irgi tapote?")],
        choices: [
          { say: L("A little. Just for fun.", "Truputį. Tik savo malonumui."),
            reply: [L("That's the best reason! Come paint with me sometime.", "Tai pati geriausia priežastis! Ateikite kada nors patapyti kartu.")] },
          { say: L("No, but I love looking at art.", "Ne, bet labai mėgstu žiūrėti paveikslus."),
            reply: [L("Then we'll get along just fine!", "Tada {m:mudu|f:mudvi} puikiai sutarsime!")] },
        ],
      },
      away: L("Bye now, dear!", "Iki, {m:mielasis|f:mieloji}!"),
    },
    second: {
      open: { byCast: {
        a: [L("Oh, you're back! I'm Martha, by the way.", "O, Jūs sugrįžote! Beje, aš – Martha."), L("Today I'm painting the lighthouse in the fog. Tricky!", "Šiandien tapau švyturį rūke. Nelengva!")],
        b: [L("Oh, you're back! I'm Martha, by the way.", "O, Jūs sugrįžote! Beje, aš – Martha."), L("Look, I added a little red boat. What do you think?", "Žiūrėkite, pridėjau mažą raudoną valtelę. Kaip manote?")],
      } },
      choices: [
        { say: L("I love it! Can I take a picture?", "Labai patinka! Ar galiu nufotografuoti?"),
          reply: [L("Of course! Make me famous!", "Žinoma! Padarykite mane garsią!")] },
        { say: L("Nice to meet you, Martha!", "Malonu susipažinti, Martha!") },
      ],
      reply: [L("Nice to meet you too, dear.", "Ir man malonu, {m:mielasis|f:mieloji}.")],
      away: L("Bye now, dear!", "Iki, {m:mielasis|f:mieloji}!"),
      named: true,
    },
    familiar: {
      open: [L("There's my favorite art critic! What do you think today?", "Štai ir {m:mano mėgstamiausias meno kritikas|f:mano mėgstamiausia meno kritikė}! Ką šiandien pasakysite?")],
      choices: [
        { say: L("It's your best one yet!", "Tai geriausias Jūsų darbas iki šiol!"),
          reply: [L("You always say that! But I love hearing it.", "Jūs visada taip sakote! Bet man malonu girdėti.")] },
        { say: L("Hmm... maybe a little more blue?", "Hm... gal šiek tiek daugiau mėlynos?"),
          reply: [L("Ha! You're right. The sea is never blue enough.", "Cha! Teisybė. Jūra niekada nebūna pakankamai mėlyna.")] },
      ],
      away: L("Take care, dear!", "Laikykitės, {m:mielasis|f:mieloji}!"),
    },
  },
  {
    id: "r_kite", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "kid", role: "Berniukas su aitvaru", name: "Leo", prop: "kite", propKind: "red", voice: "st_leo" },
      { id: "b", gender: "m", age: "kid", role: "Berniukas su aitvaru", name: "Leo", prop: "kite", propKind: "dragon", voice: "st_leo" },
    ],
    first: {
      scene: { byCast: {
        a: "Berniukas bando paleisti raudoną aitvarą, bet šis vis nukrenta.",
        b: "Berniukas bando paleisti drakono formos aitvarą, bet šis vis nukrenta.",
      } },
      open: [L("It won't fly! Can you help me?", "Jis neskrenda! Gal galite man padėti?")],
      choices: [
        { say: L("Sure! I'll hold it, you run!", "Žinoma! Aš palaikysiu, o tu bėk!") },
        { say: L("Let's try together! Ready?", "Pabandykime kartu! Pasiruošęs?") },
      ],
      reply: [L("Whoa, it's flying! It's really flying!", "Oho, skrenda! Tikrai skrenda!"), L("Thank you! You're the best!", "Ačiū! Jūs {m:geriausias|f:geriausia}!")],
      away: L("Aww... Okay, bye!", "Ech... Gerai, iki!"),
    },
    second: {
      open: { byCast: {
        a: [L("Hey, it's you! I'm Leo. I'm seven!", "Ei, tai Jūs! Aš – Leo. Man septyneri!"), L("Watch! I can fly it all by myself now!", "Žiūrėkite! Dabar jau moku jį paleisti pats!")],
        b: [L("Hey, it's you! I'm Leo. I'm seven!", "Ei, tai Jūs! Aš – Leo. Man septyneri!"), L("Look, I got a dragon kite! Isn't it cool?", "Žiūrėkite, turiu aitvarą drakoną! Ar ne šaunus?")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Wow, great job, Leo!", "Oho, šaunuolis, Leo!"),
          b: L("Wow, that's so cool!", "Oho, kaip šaunu!"),
        } } },
        { say: L("Nice to meet you, Leo!", "Malonu susipažinti, Leo!") },
      ],
      reply: [L("Thanks! Want to see a trick? Look!", "Ačiū! Norite pamatyti triuką? Žiūrėkite!")],
      away: L("Bye! Come watch me again!", "Iki! Ateikite dar pažiūrėti!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("Hi! The wind is perfect today! Want to hold the string?", "Sveiki! Šiandien vėjas puikus! Norite palaikyti virvutę?")],
        b: [L("Hi! My dragon wants to say hi! Want to hold the string?", "Sveiki! Mano drakonas nori pasisveikinti! Norite palaikyti virvutę?")],
      } },
      choices: [
        { say: L("Sure! Whoa, it's pulling hard!", "Žinoma! Oho, kaip stipriai traukia!") },
        { say: L("Okay, but just for a minute!", "Gerai, bet tik minutėlę!") },
      ],
      reply: [L("Hold on tight! You're really good at this!", "Laikykite stipriai! Jums puikiai sekasi!")],
      away: L("Bye! See you next windy day!", "Iki! Iki kitos vėjuotos dienos!"),
    },
  },
  {
    id: "r_jogger", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Bėgikė", name: "Dana", voice: "st_dana" },
      { id: "b", gender: "f", age: "adult", role: "Bėgikė", name: "Dana", prop: "water_bottle", voice: "st_dana" },
    ],
    first: {
      open: [L("Phew! Hi! Sorry, I just need a quick break.", "Uf! Sveiki! Atsiprašau, man reikia trumpos pertraukėlės."), L("I'm training for the Turkey Trot. Do you run?", "Ruošiuosi „Turkey Trot“ bėgimui. O Jūs bėgiojate?")],
      choices: [
        { say: L("Sometimes! Just in the park.", "Kartais! Tik parke."),
          reply: [L("Nice! The park's the best place for it.", "Šaunu! Parkas tam – pati geriausia vieta.")] },
        { say: L("No, I like walking better!", "Ne, man labiau patinka vaikščioti!"),
          reply: [L("Walking counts too! Keep it up!", "Vaikščioti irgi puiku! Taip ir toliau!")] },
        { say: L("What's the Turkey Trot?", "Kas tas „Turkey Trot“?"),
          reply: [L("A fun race on Thanksgiving morning. Half the town runs it!", "Linksmas bėgimas Padėkos dienos rytą. Bėga pusė miesto!")] },
      ],
      away: L("Okay, back to it! Bye!", "Gerai, bėgu toliau! Iki!"),
    },
    second: {
      open: [L("Hey, it's you again! I'm Dana, by the way.", "Ei, vėl Jūs! Beje, aš – Dana."), L("Want to run the Turkey Trot with me? It's just for fun.", "Gal norite bėgti „Turkey Trot“ kartu su manimi? Tai tik dėl smagumo.")],
      choices: [
        { say: L("Why not? Count me in!", "Kodėl gi ne? Aš – su Jumis!"),
          reply: [L("Yes! I'll save you a spot at the start!", "Puiku! Palaikysiu Jums vietą starte!")] },
        { say: L("Maybe! How long is it?", "Galbūt! O kokio ilgio trasa?"),
          reply: [L("Just three miles. You can walk it too!", "Tik trys mylios. Galima ir pėsčiomis!")] },
        { say: L("Sorry, running's not really my thing!", "Atsiprašau, bėgimas – tikrai ne man!"), helped: false,
          reply: [L("No worries! Then come cheer for us!", "Nieko tokio! Tada ateikite mūsų palaikyti!")] },
      ],
      away: L("Gotta run! Literally. Bye!", "Turiu bėgti! Tiesiogine prasme. Iki!"),
      named: true,
    },
    familiar: {
      open: [L("Hey, neighbor! Guess what? I beat my best time today!", "Sveiki, kaimyne! Žinote ką? Šiandien pagerinau savo rekordą!")],
      choices: [
        { say: L("Way to go! That's awesome!", "Šaunuolė! Nuostabu!") },
        { say: L("Wow! What's your secret?", "Oho! Kokia Jūsų paslaptis?"),
          reply: [L("Coffee from Sunny Cup. Lots of it!", "Kava iš „Sunny Cup“. Daug kavos!")] },
      ],
      reply: [L("Thanks! See you at the finish line!", "Ačiū! Iki pasimatymo finiše!")],
      away: L("Bye! Gotta keep moving!", "Iki! Turiu judėti toliau!"),
    },
  },
  {
    id: "r_mail", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Laiškanešys", name: "Ray", prop: "mailbag", voice: "st_ray" },
      { id: "b", gender: "m", age: "adult", role: "Laiškanešys", name: "Ray", prop: "package", voice: "st_ray" },
    ],
    first: {
      open: [L("Hi there! I know every face on my route.", "Sveiki! Savo maršrute pažįstu kiekvieną veidą."), L("You must be new here!", "Jūs turbūt čia {m:naujas|f:nauja}!")],
      choices: [
        { say: L("Yes! I just moved here.", "Taip! Neseniai čia atsikrausčiau.") },
        { say: L("That's right! Nice to meet you!", "Teisingai! Malonu susipažinti!") },
      ],
      reply: [L("Well, welcome to Maple Harbor!", "Na, sveiki atvykę į Maple Harborą!")],
      then: {
        open: [L("Here's a tip: get your coffee at Sunny Cup. Mia's the best!", "Štai patarimas: kavos užsukite į „Sunny Cup“. Mija – geriausia!")],
        choices: [
          { say: L("Thanks for the tip!", "Ačiū už patarimą!") },
          { say: L("Sounds good! I will.", "Skamba puikiai! Taip ir padarysiu.") },
        ],
        reply: [L("Anytime! Have a nice day!", "Visada prašom! Geros dienos!")],
      },
      away: L("Well, back to work! Take care!", "Na, grįžtu prie darbo! Laikykitės!"),
    },
    second: {
      open: { byCast: {
        a: [L("Hey, you again! I'm Ray, by the way.", "Ei, vėl Jūs! Beje, aš – Ray."), L("No letters for you today, sorry!", "Šiandien laiškų Jums nėra, atsiprašau!")],
        b: [L("Hey, you again! I'm Ray, by the way.", "Ei, vėl Jūs! Beje, aš – Ray."), L("Whew, this box weighs a ton!", "Fiu, ši dėžė sveria visą toną!")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Oh well! Maybe tomorrow!", "Nieko tokio! Gal rytoj!"),
          b: L("Do you need a hand?", "Gal Jums padėti?"),
        } },
          reply: { byCast: {
            a: [L("Maybe! I'll keep an eye out for you.", "Gal! Pažiūrėsiu, ar kas nors Jums atkeliaus.")],
            b: [L("Thanks, but I've got it. This is my workout!", "Ačiū, bet susitvarkysiu. Čia mano treniruotė!")],
          } } },
        { say: L("Nice to meet you, Ray!", "Malonu susipažinti, Ray!") },
      ],
      reply: [L("Nice to meet you too! See you around.", "Ir man malonu! Dar pasimatysime.")],
      away: L("Gotta go. The mail won't wait!", "Turiu eiti. Paštas nelaukia!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey there! Rain or shine, the mail goes out!", "Sveiki! Lyja ar šviečia – paštas keliauja!")],
        b: [L("Hey there! Another big box. Somebody loves online shopping!", "Sveiki! Vėl didelė dėžė. Kažkas labai mėgsta apsipirkti internetu!")],
      } },
      choices: [
        { say: L("You work so hard!", "Jūs tiek daug dirbate!"),
          reply: [L("Thanks! But I love it. I know the whole town!", "Ačiū! Bet man patinka. Pažįstu visą miestą!")] },
        { say: L("Take a break sometime!", "Kada nors ir pailsėkite!"),
          reply: [L("Ha! On Sunday. No mail on Sundays!", "Cha! Sekmadienį. Sekmadieniais laiškų nenešiojame!")] },
      ],
      away: L("See you tomorrow!", "Iki rytojaus!"),
    },
  },
  {
    id: "r_fisher", kind: "regular", near: "water",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Žvejys", name: "Gus", prop: "fishing_rod", voice: "st_gus" },
      { id: "b", gender: "m", age: "old", role: "Žvejys", name: "Gus", prop: "fish_bucket", voice: "st_gus" },
    ],
    first: {
      open: { byCast: {
        a: [L("Shh! I think something's biting!", "Ššš! Rodos, kimba!")],
        b: [L("Look at this! Not a bad catch, huh?", "Pažiūrėkite! Neblogas laimikis, ką?")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Oh! Good luck!", "O! Sėkmės!"),
          b: L("Wow! Did you catch all of those?", "Oho! Ar visas pats pagavote?"),
        } },
          reply: { byCast: {
            a: [L("Darn, it got away! Oh well. There's always tomorrow.", "Ak tu, pabėgo! Nieko tokio. Yra dar rytojus.")],
            b: [L("Every last one! Fifty years of practice.", "Visas iki vienos! Penkiasdešimt metų praktikos.")],
          } } },
        { say: { byCast: {
          a: L("Sorry! I'll be quiet.", "Atsiprašau! Tylėsiu."),
          b: L("Nice! What kind of fish are they?", "Puiku! O kokios čia žuvys?"),
        } },
          reply: { byCast: {
            a: [L("Ha! Too late. It got away!", "Cha! Per vėlu – pabėgo!"), L("Oh well. There's always tomorrow.", "Nieko tokio. Yra dar rytojus.")],
            b: [L("Mackerel! The best fish in the harbor.", "Skumbrės! Geriausia žuvis uoste.")],
          } } },
      ],
      away: L("Take care now!", "Laikykitės!"),
    },
    second: {
      open: [L("Well, look who's back! I'm Gus.", "Na, žiūrėkite, kas sugrįžo! Aš – Gus."), L("I've fished here since I was a boy. Do you fish?", "Žvejoju čia nuo vaikystės. O Jūs žvejojate?")],
      choices: [
        { say: L("Yes! My grandpa taught me.", "Taip! Mane išmokė senelis."),
          reply: [L("Smart grandpa! Grandpas are the best teachers.", "Šaunuolis senelis! Geriausi mokytojai – seneliai.")] },
        { say: L("Never! Is it hard?", "Niekada! Ar sunku?"),
          reply: [L("Not at all. You just need lots of patience.", "Visai ne. Tiesiog reikia daug kantrybės.")] },
      ],
      away: L("Catch you later!", "Iki kito karto!"),
      named: true,
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey, my friend! Here, hold the rod for a second.", "Ei, drauge! Štai, palaikykite meškerę sekundėlę.")],
        b: [L("Hey, my friend! Look, the seals want my fish again!", "Ei, drauge! Žiūrėkite, ruoniai vėl taikosi į mano žuvį!")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Sure! Whoa, I think I got one!", "Žinoma! Oho, rodos, kimba!"),
          b: L("Ha! They're so cute!", "Cha! Jie tokie mieli!"),
        } } },
        { say: { byCast: {
          a: L("Okay! Like this?", "Gerai! Šitaip?"),
          b: L("Shoo! Go away, seals!", "Kš! Šalin, ruoniai!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Reel it in, slowly... You got one!", "Sukite ritę, lėtai... Pagavote!"), L("Ha! Beginner's luck!", "Cha! Naujokams sekasi!")],
        b: [L("Ha! They're my best customers.", "Cha! Jie mano geriausi klientai."), L("They just never pay!", "Tik niekada nemoka!")],
      } },
      away: L("See you, my friend!", "Iki, drauge!"),
    },
  },
  {
    id: "r_pigeons", kind: "regular",
    cast: [
      { id: "a", gender: "f", age: "old", role: "Ponia su balandžiais", name: "Ruth", prop: "bread_bag", voice: "st_ruth" },
      { id: "b", gender: "f", age: "old", role: "Ponia su balandžiais", name: "Ruth", prop: "bread_bag", propKind: "seeds", voice: "st_ruth" },
    ],
    first: {
      scene: { byCast: {
        a: "Senyva ponia ant suoliuko lesina balandžius.",
        b: "Senyva ponia ant suoliuko beria balandžiams sėklų.",
      } },
      open: [L("Come sit down, dear. They won't bite.", "Prisėskite, {m:mielasis|f:mieloji}. Jie nekanda."), L("That chubby one is Lucky.", "Tas apkūnėlis – Laimiukas.")],
      choices: [
        { say: L("Thanks! They're so friendly.", "Ačiū! Jie tokie draugiški."),
          reply: [L("Oh, they are. Better company than my TV!", "O, tikrai. Geresnė kompanija nei mano televizorius!")] },
        { say: L("Do they all have names?", "Ar jie visi turi vardus?"),
          reply: [L("Every single one! We're old friends.", "Kiekvienas! Mes seni draugai.")] },
        { say: L("Maybe another time. Have a nice day!", "Gal kitą kartą. Geros dienos!"), helped: false,
          reply: [L("You too, dear!", "Ir Jums, {m:mielasis|f:mieloji}!")] },
      ],
      away: L("Bye-bye, dear!", "Iki, {m:mielasis|f:mieloji}!"),
    },
    second: {
      open: [L("Oh, it's you again! I'm Ruth.", "O, vėl Jūs! Aš – Ruth."), L("Lucky missed you, you know.", "Žinote, Laimiukas Jūsų pasiilgo.")],
      choices: [
        { say: L("Hi, Ruth! Nice to meet you.", "Sveiki, Ruth! Malonu susipažinti.") },
        { say: L("Can I feed them too?", "Ar galiu ir aš juos palesinti?"),
          reply: { byCast: {
            a: [L("Of course! Here, take some bread.", "Žinoma! Štai, imkite duonos.")],
            b: [L("Of course! Here, take some seeds.", "Žinoma! Štai, imkite sėklų.")],
          } } },
      ],
      reply: [L("Nice to meet you too, dear. Come sit anytime!", "Ir man malonu, {m:mielasis|f:mieloji}. Prisėskite bet kada!")],
      away: L("Bye-bye, dear!", "Iki, {m:mielasis|f:mieloji}!"),
      named: true,
    },
    familiar: {
      open: [L("There you are! I saved you a seat.", "Štai ir Jūs! Palaikiau Jums vietą."), L("Want some gossip? Lucky has a girlfriend!", "Norite paskalų? Laimiukas susirado draugę!")],
      choices: [
        { say: L("No way! Good for him!", "Negali būti! Šaunuolis!") },
        { say: L("Ha! Tell me everything!", "Cha! Pasakokite viską!") },
      ],
      reply: [L("Oh, it's a big love story. Same time tomorrow?", "O, tai ilga meilės istorija. Rytoj tuo pačiu laiku?")],
      away: L("Same time tomorrow, dear!", "Rytoj tuo pačiu laiku, {m:mielasis|f:mieloji}!"),
    },
  },
  {
    id: "r_skater", kind: "regular",
    cast: [
      { id: "a", gender: "m", age: "teen", role: "Riedlentininkas", name: "Tyler", prop: "skateboard", voice: "st_tyler" },
      { id: "b", gender: "m", age: "teen", role: "Riedlentininkas", name: "Tyler", prop: "skateboard", propKind: "helmet", voice: "st_tyler" },
    ],
    first: {
      scene: "Paauglys bando riedlentės triuką – ir griūva.",
      choices: [
        { say: L("Whoa! Are you okay?", "Oho! Ar tau viskas gerai?") },
        { say: L("Ouch! That looked painful!", "Oi! Atrodė skaudžiai!") },
      ],
      reply: [L("I'm okay! I almost had it!", "Viskas gerai! Beveik pavyko!"), L("Watch, I'll try again!", "Žiūrėkite, bandysiu dar kartą!")],
      then: {
        open: [L("Did you see that? I landed it!", "Matėte? Pavyko!")],
        choices: [
          { say: L("Yes! That was awesome!", "Taip! Buvo nuostabu!") },
          { say: L("Nice! Way to go!", "Puiku! Šaunuolis!") },
        ],
        reply: [L("Thanks! You're my good luck charm.", "Ačiū! Jūs – mano talismanas.")],
      },
      away: L("See ya!", "Iki!"),
    },
    second: {
      open: { byCast: {
        a: [L("Hey, it's you! I'm Tyler. The guy who fell, remember?", "Ei, tai Jūs! Aš – Tyler. Tas, kuris griuvo, prisimenate?"), L("Watch this. No falling today!", "Žiūrėkite. Šiandien be griuvimų!")],
        b: [L("Hey, it's you! I'm Tyler. The guy who fell, remember?", "Ei, tai Jūs! Aš – Tyler. Tas, kuris griuvo, prisimenate?"), L("My mom says I have to wear a helmet now.", "Mama sako, kad dabar privalau nešioti šalmą.")],
      } },
      choices: [
        { say: L("Ha! Nice to meet you, Tyler!", "Cha! Malonu susipažinti, Tyler!"),
          reply: { byCast: {
            a: [L("You too! Okay, watch... Ta-da!", "Man irgi! Gerai, žiūrėkite... Ta-dam!")],
            b: [L("You too! Just don't laugh at the helmet, okay?", "Man irgi! Tik nesijuokite iš šalmo, gerai?")],
          } } },
        { say: { byCast: {
          a: L("Okay, I'm watching!", "Gerai, žiūriu!"),
          b: L("Smart mom! Safety first!", "Protinga mama! Saugumas – svarbiausia!"),
        } },
          reply: { byCast: {
            a: [L("Ta-da! See? Told you!", "Ta-dam! Matote? Sakiau gi!")],
            b: [L("Yeah, yeah. She's right, though.", "Taip, taip. Bet ji teisi.")],
          } } },
      ],
      away: L("Later!", "Iki!"),
      named: true,
    },
    familiar: {
      open: [L("Hey! Can you count to three for me? I'm trying something big.", "Ei! Gal galite suskaičiuoti iki trijų? Bandysiu kai ką rimto.")],
      choices: [
        { say: L("Sure! One, two, three!", "Žinoma! Vienas, du, trys!") },
        { say: L("Okay, but be careful!", "Gerai, tik būk atsargus!") },
      ],
      reply: [L("Yes! Nailed it!", "Taip! Pavyko tobulai!"), L("You're the best audience in town!", "Jūs – geriausia publika mieste!")],
      away: L("Later!", "Iki!"),
    },
  },

  // ---------------------------------------------------------------- incidents
  {
    id: "i_dropped", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Praeivis", prop: "wallet", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "adult", role: "Praeivė", prop: "keys", voice: "st_f_adult" },
      { id: "c", gender: "f", age: "old", role: "Senyva ponia", prop: "glove", voice: "st_f_old" },
    ],
    first: {
      scene: { byCast: {
        a: "Vyras pametė piniginę ir nieko nepastebėjo.",
        b: "Moteris pametė raktus ir nieko nepastebėjo.",
        c: "Senyva ponia pametė pirštinę ir nieko nepastebėjo.",
      } },
      choices: [
        { say: L("Excuse me! You dropped this!", "Atsiprašau! Jums kai kas iškrito!") },
        { say: { byCast: {
          a: L("Hey! Is this your wallet?", "Ei! Ar čia Jūsų piniginė?"),
          b: L("Hey! Are these your keys?", "Ei! Ar čia Jūsų raktai?"),
          c: L("Excuse me, ma'am! Is this your glove?", "Atsiprašau, ponia! Ar čia Jūsų pirštinė?"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Oh, wow! My wallet! Thank you so much!", "Oho! Mano piniginė! Labai Jums ačiū!"), L("You're a lifesaver.", "Jūs mane išgelbėjote.")],
        b: [L("My keys! I'd be locked out without them.", "Mano raktai! Be jų nebūčiau patekusi namo."), L("Thank you so much!", "Labai Jums ačiū!")],
        c: [L("Oh, my glove! Thank you, dear.", "Oi, mano pirštinė! Ačiū, {m:mielasis|f:mieloji}."), L("My hands get so cold without it.", "Be jos man taip šąla rankos.")],
      } },
      then: {
        choices: [
          { say: L("No problem!", "Nėra už ką!") },
          { say: L("Have a nice day!", "Geros dienos!") },
        ],
        reply: [L("You too! Thanks again!", "Ir Jums! Dar kartą ačiū!")],
      },
      card: { byCast: {
        a: L("You dropped your wallet!", "Jums iškrito piniginė!"),
        b: L("You dropped your keys!", "Jums iškrito raktai!"),
        c: L("You dropped your glove!", "Jums iškrito pirštinė!"),
      } },
    },
    second: {
      scene: { byCast: {
        a: "Tas pats vyras – ir vėl be piniginės!",
        b: "Ta pati moteris – ir vėl pametė raktus!",
        c: "Ta pati ponia – ir vėl pametė pirštinę!",
      } },
      choices: [
        { say: L("Excuse me! You dropped this again!", "Atsiprašau! Jums vėl kai kas iškrito!") },
        { say: L("Hey! Remember me?", "Ei! Prisimenate mane?") },
      ],
      reply: { byCast: {
        a: [L("You again? My hero, twice now!", "Vėl Jūs? Mano {m:didvyris|f:didvyrė} – jau antrą kartą!"), L("I should tie this wallet to my belt.", "Reikėtų šią piniginę pririšti prie diržo.")],
        b: [L("You again? My hero, twice now!", "Vėl Jūs? Mano {m:didvyris|f:didvyrė} – jau antrą kartą!"), L("Okay, these keys need a big key ring.", "Gerai, šiems raktams reikia didelio pakabuko.")],
        c: [L("Oh, it's you again! My hero, twice now!", "Oi, vėl Jūs! Mano {m:didvyris|f:didvyrė} – jau antrą kartą!"), L("Next time I'll get gloves on a string, like a kid.", "Kitą kartą pirksiu pirštines ant virvutės, kaip vaikas.")],
      } },
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey, it's my hero! Look, my wallet's in my pocket today.", "Ei, tai mano {m:didvyris|f:didvyrė}! Žiūrėkite, šiandien piniginė kišenėje.")],
        b: [L("Hi! Look, I got a big key ring. No more lost keys!", "Labas! Žiūrėkite, nusipirkau didelį pakabuką. Raktų nebepamesiu!")],
        c: [L("Hello, dear! Both gloves today, see?", "Sveiki, {m:mielasis|f:mieloji}! Šiandien abi pirštinės, matote?")],
      } },
      choices: [
        { say: L("Good job!", "Šaunu!") },
        { say: L("Ha! Good to see you!", "Cha! Malonu Jus matyti!") },
      ],
      reply: [L("Good to see you too! Take care!", "Ir man malonu! Laikykitės!")],
    },
  },
  {
    id: "i_tourist", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Turistas", prop: "map", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Turistė", prop: "phone", voice: "st_f_young" },
      { id: "c", gender: "m", age: "old", role: "Turistas", prop: "guidebook", voice: "st_m_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Excuse me! Can you help me? I'm a little lost.", "Atsiprašau! Gal galite padėti? Šiek tiek pasiklydau."), L("I'm looking for the lighthouse.", "Ieškau švyturio.")],
        b: [L("Excuse me! My phone's almost dead, and I'm lost.", "Atsiprašau! Telefonas beveik išsikrovė, o aš pasiklydau."), L("Do you know where the Harborview Hotel is?", "Gal žinote, kur „Harborview“ viešbutis?")],
        c: [L("Pardon me! My guidebook says there's a museum here.", "Atsiprašau! Kelionių vadove parašyta, kad čia yra muziejus."), L("Do you know where it is?", "Gal žinote, kur jis?")],
      } },
      choices: [
        { say: L("Let me check my map... It's not far!", "Tuoj pažiūrėsiu žemėlapyje... Visai netoli!") },
        { say: L("Try the visitor center! They can help you.", "Užsukite į turizmo informacijos centrą! Ten Jums padės.") },
        { say: L("Sorry, I'm new here too!", "Atsiprašau, aš irgi čia {m:naujas|f:nauja}!"), helped: false,
          reply: [L("Oh, no problem! I'll ask someone else. Thanks!", "O, nieko tokio! Paklausiu ko nors kito. Ačiū!")] },
      ],
      reply: { byCast: {
        a: [L("Great, thank you so much!", "Puiku, labai Jums ačiū!"), L("I hear the view up there is amazing.", "Sako, vaizdas iš ten nuostabus.")],
        b: [L("Oh, thank you! You're a lifesaver.", "O, ačiū! Jūs mane išgelbėjote.")],
        c: [L("Wonderful! Thank you, my friend.", "Puiku! Ačiū, mano drauge.")],
      } },
      away: L("Oh... okay. Thanks anyway!", "O... gerai. Vis tiek ačiū!"),
    },
    second: {
      open: { byCast: {
        a: [L("Oh, it's you again! I'm lost again. This map hates me!", "O, vėl Jūs! Ir vėl pasiklydau. Šis žemėlapis manęs nekenčia!"), L("Now I'm looking for Lucia's Trattoria.", "Dabar ieškau „Lucia's Trattoria“.")],
        b: [L("Oh, it's you! My phone died again. Can you believe it?", "O, tai Jūs! Telefonas vėl išsikrovė. Įsivaizduojate?"), L("Now I need the post office. I have postcards to send!", "Dabar man reikia pašto. Turiu išsiųsti atvirukų!")],
        c: [L("We meet again, my friend! Now I'm looking for the library.", "Vėl susitikome, mano drauge! Dabar ieškau bibliotekos."), L("My guidebook says it's lovely.", "Kelionių vadove rašoma, kad ji labai graži.")],
      } },
      choices: [
        { say: L("Ha! Let me check my map again.", "Cha! Tuoj vėl pažiūrėsiu žemėlapyje.") },
        { say: L("You're in luck! It's not far.", "Jums pasisekė! Tai visai netoli.") },
      ],
      reply: { byCast: {
        a: [L("What would I do without you?", "Ką aš be Jūsų daryčiau?"), L("Maybe I should just follow you around!", "Gal man tiesiog vaikščioti paskui Jus!")],
        b: [L("Thank you again! Seriously, you should be a tour guide.", "Vėl ačiū! Rimtai, Jums reikėtų dirbti {m:gidu|f:gide}.")],
        c: [L("Thank you, my friend. You're better than my guidebook!", "Ačiū, mano drauge. Jūs {m:geresnis|f:geresnė} už mano kelionių vadovą!")],
      } },
      away: L("Okay, I'll ask someone else. Bye!", "Gerai, paklausiu ko nors kito. Iki!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey, it's my tour guide! Look, I didn't get lost today!", "Ei, tai {m:mano gidas|f:mano gidė}! Žiūrėkite, šiandien nepasiklydau!")],
        b: [L("Hi! Look, I got a power bank. No more dead phone!", "Sveiki! Žiūrėkite, nusipirkau išorinę bateriją. Telefonas nebeišsikraus!")],
        c: [L("Hello, my friend! It's eighty degrees back home in Florida.", "Sveiki, mano drauge! Namie, Floridoje, dabar dvidešimt septyni laipsniai šilumos."), L("But I like it here better!", "Bet čia man patinka labiau!")],
      } },
      choices: [
        { say: L("Ha! Good for you!", "Cha! Šaunu!") },
        { say: L("Enjoy your stay!", "Malonios viešnagės!") },
      ],
      reply: [L("Thanks! Everyone here is so friendly.", "Ačiū! Čia visi tokie draugiški.")],
    },
  },
  {
    id: "i_spill", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Pirkėja", prop: "fruit", propKind: "apples", voice: "st_f_adult" },
      { id: "b", gender: "m", age: "old", role: "Pirkėjas", prop: "fruit", propKind: "oranges", voice: "st_m_old" },
      { id: "c", gender: "m", age: "young", role: "Pirkėjas", prop: "fruit", propKind: "lemons", voice: "st_m_young" },
    ],
    first: {
      scene: { byCast: {
        a: "Moteriai plyšo pirkinių maišelis – obuoliai rieda šaligatviu.",
        b: "Senyvam vyrui plyšo maišelis – apelsinai rieda šaligatviu.",
        c: "Vaikinui plyšo maišelis – citrinos rieda šaligatviu.",
      } },
      open: { byCast: {
        a: [L("Oh no! My apples!", "O ne! Mano obuoliai!")],
        b: [L("Oh, for Pete's sake! My oranges!", "Ak tu, Dieve! Mano apelsinai!")],
        c: [L("Whoa! My lemons!", "Oi! Mano citrinos!")],
      } },
      choices: [
        { say: L("Don't worry, I'll help you!", "Nesijaudinkite, aš padėsiu!") },
        { say: { byCast: {
          a: L("Here's one! And another one!", "Štai vienas! Ir dar vienas!"),
          b: L("Here's one! And another one!", "Štai vienas! Ir dar vienas!"),
          c: L("Here's one! And another one!", "Štai viena! Ir dar viena!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Thank you so much! They're for an apple pie.", "Labai Jums ačiū! Iš jų kepsiu obuolių pyragą.")],
        b: [L("Thank you, friend! They're for my wife's orange cake.", "Ačiū, drauge! Iš jų žmona kepa apelsininį pyragą.")],
        c: [L("Thanks a lot! I'm making lemon bars for my mom.", "Labai ačiū! Kepsiu mamai citrininių pyragaičių.")],
      } },
      away: L("Oh... never mind, I've got it!", "O... nieko, susitvarkysiu!"),
    },
    second: {
      scene: { byCast: {
        a: "Ta pati moteris – ir vėl obuoliai ant šaligatvio!",
        b: "Tas pats vyras – ir vėl apelsinai rieda!",
        c: "Tas pats vaikinas – ir vėl citrinos rieda!",
      } },
      open: { byCast: {
        a: [L("Oh no, not again! And it's you again!", "O ne, vėl! Ir vėl Jūs!")],
        b: [L("Well, would you look at that. My oranges, and my helper!", "Na, tik pažiūrėkite. Mano apelsinai – ir {m:mano pagalbininkas|f:mano pagalbininkė}!")],
        c: [L("Seriously? Again? Oh, hey, it's you!", "Rimtai? Vėl? O, sveiki, tai Jūs!")],
      } },
      choices: [
        { say: L("Don't worry! I'm a pro at this now.", "Nesijaudinkite! Dabar man tai – vieni juokai.") },
        { say: L("Maybe it's time for a new bag!", "Gal laikas įsigyti naują maišelį!") },
      ],
      reply: { byCast: {
        a: [L("Thank you, again! Next time I'm bringing a basket.", "Ir vėl ačiū! Kitą kartą imsiu pintinę.")],
        b: [L("Thank you! These bags aren't what they used to be.", "Ačiū! Šie maišeliai jau nebe tokie, kaip anksčiau.")],
        c: [L("Thanks again! I owe you a lemon bar!", "Dar kartą ačiū! Esu Jums skolingas citrininį pyragaitį!")],
      } },
      away: L("Oh... never mind, I've got it!", "O... nieko, susitvarkysiu!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hi there! Look, a basket! No more rolling apples.", "Sveiki! Žiūrėkite – pintinė! Daugiau jokių riedančių obuolių.")],
        b: [L("Hello, friend! Two bags today. I learned my lesson!", "Sveiki, drauge! Šiandien – du maišeliai. Pasimokiau!")],
        c: [L("Hey! Look, a backpack. The lemons are safe now!", "Sveiki! Žiūrėkite – kuprinė. Dabar citrinos saugios!")],
      } },
      choices: [
        { say: L("Smart! Good thinking!", "Protinga! Gera mintis!"),
          reply: [L("Thanks! I'm learning!", "Ačiū! Mokausi!")] },
        { say: L("Ha! Good to see you!", "Cha! Malonu Jus matyti!") },
      ],
      reply: [L("Good to see you too! Have a great day!", "Ir man malonu! Puikios dienos!")],
    },
  },
  {
    id: "i_photo", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Turistė", prop: "phone", voice: "st_f_young" },
      { id: "b", gender: "m", age: "adult", role: "Turistas", prop: "camera", voice: "st_m_adult" },
      { id: "c", gender: "m", age: "old", role: "Turistas", prop: "tablet", voice: "st_m_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Excuse me! Could you take a picture of me?", "Atsiprašau! Gal galėtumėte mane nufotografuoti?")],
        b: [L("Excuse me! Would you mind taking my picture?", "Atsiprašau! Ar nesunku būtų mane nufotografuoti?"), L("Just press the big button on top.", "Tiesiog paspauskite didelį mygtuką viršuje.")],
        c: [L("Excuse me! Could you take my picture with this tablet?", "Atsiprašau! Gal galėtumėte mane nufotografuoti šia planšete?"), L("A gift from my grandkids. I have no idea how it works!", "Anūkų dovana. Neturiu supratimo, kaip ji veikia!")],
      } },
      choices: [
        { say: L("Sure! Say cheese!", "Žinoma! Sakykite „sūris“!") },
        { say: L("Of course! One, two, three!", "Žinoma! Vienas, du, trys!") },
        { say: L("Sorry, I'm running late!", "Atsiprašau, vėluoju!"), helped: false,
          reply: [L("Oh, no problem! Have a nice day!", "O, nieko tokio! Geros dienos!")] },
      ],
      reply: { byCast: {
        a: [L("Oh, that's perfect! Thank you so much!", "O, tobula! Labai Jums ačiū!")],
        b: [L("Great shot! Thanks a lot!", "Puiki nuotrauka! Labai ačiū!")],
        c: [L("Ha! My grandkids won't believe it!", "Cha! Anūkai nepatikės!")],
      } },
      away: L("Oh... okay. Thanks anyway!", "O... gerai. Vis tiek ačiū!"),
      card: L("Could you take a picture of me?", "Gal galėtumėte mane nufotografuoti?"),
    },
    second: {
      open: { byCast: {
        a: [L("Oh, hi again! I need one more picture. Just one!", "O, vėl sveiki! Man reikia dar vienos nuotraukos. Tik vienos!"), L("Okay, maybe two.", "Na gerai, gal dviejų.")],
        b: [L("We meet again! Could you take another one?", "Vėl susitikome! Gal galėtumėte padaryti dar vieną?"), L("This time I'll try not to blink!", "Šįkart pasistengsiu nemirktelėti!")],
        c: [L("Hello again! Guess what? I figured out the camera!", "Vėl sveiki! Žinote ką? Išsiaiškinau, kaip veikia kamera!"), L("But I still can't take a picture of myself.", "Bet savęs nufotografuoti vis tiek nemoku.")],
      } },
      choices: [
        { say: L("Sure! Big smile!", "Žinoma! Plačiai nusišypsokite!") },
        { say: L("Again? Ha! Of course!", "Vėl? Cha! Žinoma!") },
      ],
      reply: { byCast: {
        a: [L("Perfect! Okay, now one more... Just kidding!", "Tobula! Gerai, o dabar dar vieną... Juokauju!")],
        b: [L("No blinking! You're a pro.", "Nemirktelėjau! Jūs – {m:tikras profesionalas|f:tikra profesionalė}.")],
        c: [L("Wonderful! I'll show everyone back home.", "Nuostabu! Parodysiu visiems namie.")],
      } },
      away: L("Oh, okay. Bye!", "O, gerai. Iki!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hi! Look, a selfie stick! No more bothering people.", "Sveiki! Žiūrėkite – asmenukių lazda! Nebereikės trukdyti žmonių.")],
        b: [L("Hey! My picture of the lighthouse came out great.", "Sveiki! Mano švyturio nuotrauka išėjo puiki.")],
        c: [L("Hello, my friend! My grandkids loved the picture!", "Sveiki, mano drauge! Anūkams nuotrauka labai patiko!")],
      } },
      choices: [
        { say: L("That's great!", "Puiku!") },
        { say: L("Nice! I'm happy for you!", "Šaunu! Džiaugiuosi dėl Jūsų!") },
      ],
      reply: [L("Thanks! Have a great day!", "Ačiū! Puikios dienos!")],
    },
  },
  {
    id: "i_wind", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "old", role: "Senyvas vyras", prop: "hat", voice: "st_m_old" },
      { id: "b", gender: "f", age: "adult", role: "Praeivė", prop: "scarf", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "adult", role: "Praeivis", prop: "newspaper", voice: "st_m_adult" },
    ],
    first: {
      scene: { byCast: {
        a: "Vėjas nupūtė senyvam vyrui skrybėlę – ji rieda šaligatviu.",
        b: "Vėjo gūsis nuplėšė moteriai šaliką.",
        c: "Vėjas išplėšė vyrui iš rankų laikraštį – lapai skrenda į visas puses.",
      } },
      choices: [
        { say: { byCast: {
          a: L("Got it! Here's your hat!", "Pagavau! Štai Jūsų skrybėlė!"),
          b: L("Got it! Here's your scarf!", "Pagavau! Štai Jūsų šalikas!"),
          c: L("I got a few pages! Here you go!", "Pagavau kelis lapus! Prašom!"),
        } } },
        { say: L("Whoa, so windy! Here you go!", "Oho, kaip pučia! Prašom!") },
      ],
      reply: { byCast: {
        a: [L("Thank you! I've had this hat for thirty years.", "Ačiū! Šią skrybėlę nešioju jau trisdešimt metų."), L("I'd hate to lose it now!", "Būtų gaila ją dabar pamesti!")],
        b: [L("Oh, thank you! My grandma knitted it for me.", "O, ačiū! Jį man numezgė močiutė.")],
        c: [L("Thanks! Now I can finish the sports page.", "Ačiū! Dabar galėsiu pabaigti skaityti sporto puslapį.")],
      } },
    },
    second: {
      scene: { byCast: {
        a: "Ir vėl vėjas – ir vėl ta pati skrybėlė!",
        b: "Ir vėl vėjas – ir vėl tas pats šalikas!",
        c: "Ir vėl vėjas – ir vėl to paties vyro laikraštis!",
      } },
      choices: [
        { say: { byCast: {
          a: L("Your hat again? Got it!", "Vėl Jūsų skrybėlė? Pagavau!"),
          b: L("Your scarf again? Got it!", "Vėl Jūsų šalikas? Pagavau!"),
          c: L("Your newspaper again? Got it!", "Vėl Jūsų laikraštis? Pagavau!"),
        } } },
        { say: L("This wind really loves your things!", "Šis vėjas tikrai pamilo Jūsų daiktus!") },
      ],
      reply: { byCast: {
        a: [L("You again! Are you following my hat?", "Vėl Jūs! Gal sekiojate mano skrybėlę?"), L("Ha! Thank you, my friend.", "Cha! Ačiū, mano drauge.")],
        b: [L("It's you again! I think my scarf likes you.", "Vėl Jūs! Atrodo, mano šalikas Jus pamėgo."), L("Thank you, really!", "Tikrai ačiū!")],
        c: [L("You again! Maybe I should read the news online.", "Vėl Jūs! Gal man jau laikas skaityti naujienas internete."), L("Thanks, my friend!", "Ačiū, drauge!")],
      } },
    },
    familiar: {
      open: { byCast: {
        a: [L("Hello again! See? I'm holding on to my hat today.", "Vėl sveiki! Matote? Šiandien skrybėlę laikau tvirtai.")],
        b: [L("Hi! Look, I tied my scarf twice today!", "Sveiki! Žiūrėkite, šiandien šaliką apsirišau dukart!")],
        c: [L("Hey! No newspaper today. I read the news on my phone now!", "Sveiki! Šiandien jokio laikraščio. Dabar naujienas skaitau telefone!")],
      } },
      choices: [
        { say: L("Ha! Smart move!", "Cha! Protinga!") },
        { say: L("Good to see you again!", "Malonu Jus vėl matyti!") },
      ],
      reply: [L("Thanks! Stay warm out there!", "Ačiū! Nesušalkite!")],
    },
  },
  {
    id: "i_change", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Vairuotojas", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Studentė", voice: "st_f_young" },
      { id: "c", gender: "f", age: "old", role: "Senyva ponia", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Excuse me! Do you have change for a dollar?", "Atsiprašau! Gal galite iškeisti dolerį smulkiais?"), L("The parking meter only takes quarters.", "Parkavimo automatas priima tik 25 centų monetas.")],
        b: [L("Sorry to bother you! Do you have change for a five?", "Atsiprašau, kad trukdau! Gal galite iškeisti penkinę?"), L("The bus driver can't make change.", "Autobuso vairuotojas grąžos neduoda.")],
        c: [L("Excuse me, dear. Could you break a twenty?", "Atsiprašau, {m:mielasis|f:mieloji}. Gal galite iškeisti dvidešimtinę?"), L("I want to tip that nice young man with the guitar.", "Noriu duoti arbatpinigių tam maloniam jaunuoliui su gitara.")],
      } },
      choices: [
        { say: L("Let me check... Yes! Here you go.", "Tuoj pažiūrėsiu... Taip! Prašom.") },
        { say: L("Sure! No problem.", "Žinoma! Jokių problemų.") },
        { say: L("Sorry, I don't have any cash on me.", "Atsiprašau, neturiu su savimi grynųjų."), helped: false,
          reply: [L("Oh, that's okay! I'll ask someone else.", "O, nieko tokio! Paklausiu ko nors kito.")] },
      ],
      reply: { byCast: {
        a: [L("Thanks a lot! No parking ticket for me today!", "Labai ačiū! Šiandien baudos negausiu!")],
        b: [L("Thank you so much! Oh, here comes my bus!", "Labai Jums ačiū! O, štai ir mano autobusas!")],
        c: [L("Thank you, dear! Music like that deserves a tip.", "Ačiū, {m:mielasis|f:mieloji}! Tokia muzika verta arbatpinigių.")],
      } },
      away: L("Oh... okay. Never mind!", "O... gerai. Nesvarbu!"),
      card: { byCast: {
        a: L("Do you have change for a dollar?", "Gal galite iškeisti dolerį smulkiais?"),
        b: L("Do you have change for a five?", "Gal galite iškeisti penkinę?"),
        c: L("Could you break a twenty?", "Gal galite iškeisti dvidešimtinę?"),
      } },
    },
    second: {
      open: { byCast: {
        a: [L("Hey, it's you! Guess what? The meter's hungry again.", "Ei, tai Jūs! Žinote ką? Automatas vėl alkanas."), L("Any quarters, by chance?", "Gal kartais turite 25 centų monetų?")],
        b: [L("Oh, hi again! I forgot coins for the bus again.", "O, vėl sveiki! Ir vėl pamiršau monetas autobusui."), L("I'm so sorry! Change for a five?", "Labai atsiprašau! Gal iškeistumėte penkinę?")],
        c: [L("Oh, hello, dear! That young man is playing again.", "O, sveiki, {m:mielasis|f:mieloji}! Tas jaunuolis vėl groja."), L("Could you break another twenty?", "Gal galite iškeisti dar vieną dvidešimtinę?")],
      } },
      choices: [
        { say: L("Ha! Sure. Here you go again!", "Cha! Žinoma. Ir vėl prašom!") },
        { say: L("Of course! I'm your personal bank now!", "Žinoma! Dabar aš – Jūsų asmeninis bankas!") },
      ],
      reply: { byCast: {
        a: [L("You're a lifesaver! I owe you one.", "Jūs mane gelbėjate! Liksiu Jums skolingas.")],
        b: [L("You're the best! I owe you one.", "Jūs {m:geriausias|f:geriausia}! Liksiu Jums skolinga.")],
        c: [L("You're a dear! He plays so beautifully.", "Jūs {m:toks mielas|f:tokia miela}! Jis taip gražiai groja.")],
      } },
      away: L("Oh, okay. Bye now!", "O, gerai. Iki!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey! I got a whole roll of quarters. I'm all set!", "Sveiki! Nusipirkau visą ritinėlį 25 centų monetų. Dabar esu pasiruošęs!")],
        b: [L("Hi! Look, I got a bus pass. No more coins!", "Sveiki! Žiūrėkite, įsigijau mėnesinį bilietą. Jokių monetų!")],
        c: [L("Hello, dear! I brought a whole purse of coins today.", "Sveiki, {m:mielasis|f:mieloji}! Šiandien atsinešiau pilną piniginę monetų.")],
      } },
      choices: [
        { say: L("Ha! Good for you!", "Cha! Šaunu!") },
        { say: L("Smart! Now I'm out of a job!", "Protinga! Dabar aš likau be darbo!") },
      ],
      reply: [L("Ha! Have a great day!", "Cha! Puikios dienos!")],
    },
  },
  {
    id: "i_lost_dog", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "kid", role: "Mergaitė", prop: "dog", propKind: "brown", voice: "st_kid_f" },
      { id: "b", gender: "f", age: "adult", role: "Šuns šeimininkė", prop: "dog", propKind: "white", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "old", role: "Šuns šeimininkas", prop: "dog", propKind: "black", voice: "st_m_old" },
    ],
    first: {
      scene: { byCast: {
        a: "Mažas rudas šuo ištrūko nuo pavadėlio. Paskui jį bėga mergaitė.",
        b: "Baltas šuo ištrūko nuo pavadėlio. Paskui jį bėga moteris.",
        c: "Juodas šuo ištrūko nuo pavadėlio. Senyvas vyras nespėja jo vytis.",
      } },
      open: { byCast: {
        a: [L("Max! Come back! Please, can you catch him?", "Maksai! Grįžk! Prašau, gal galite jį sugauti?")],
        b: [L("Bella, stop! Oh, can you grab her leash?", "Bela, stok! Oi, gal galite pagriebti jos pavadėlį?")],
        c: [L("Buster, come back! I can't run like I used to!", "Basteri, grįžk! Nebegaliu bėgti kaip anksčiau!")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Got him! Here he is!", "Pagavau! Štai jis!"),
          b: L("Got her! Here's her leash!", "Pagavau! Štai jos pavadėlis!"),
          c: L("Got him! Here you go!", "Pagavau! Prašom!"),
        } } },
        { say: { byCast: {
          a: L("Here, Max! Come here, boy!", "Maksai, čia! Ateik pas mane!"),
          b: L("Here, Bella! Come here, girl!", "Bela, čia! Ateik pas mane!"),
          c: L("Here, Buster! Come here, boy!", "Basteri, čia! Ateik pas mane!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Thank you! Mom would be so mad at me!", "Ačiū Jums! Mama ant manęs būtų labai supykusi!")],
        b: [L("Oh, thank goodness! Thank you so much!", "O, ačiū Dievui! Labai Jums ačiū!"), L("She saw a squirrel and just took off.", "Pamatė voverę ir tiesiog nulėkė.")],
        c: [L("Thank you, friend! These old legs aren't fast anymore.", "Ačiū, drauge! Šios senos kojos jau nebe tokios greitos."), L("He always chases the seagulls!", "Jis vis vaikosi žuvėdras!")],
      } },
      away: { byCast: {
        a: L("Oh no... Max, wait for me!", "O ne... Maksai, palauk manęs!"),
        b: L("Oh no... Bella, wait!", "O ne... Bela, palauk!"),
        c: L("Oh boy... Buster, wait for me!", "Ech... Basteri, palauk manęs!"),
      } },
    },
    second: {
      scene: { byCast: {
        a: "Ta pati mergaitė – ir vėl Maksas pabėgo!",
        b: "Ta pati moteris – ir vėl Bela pabėgo!",
        c: "Tas pats vyras – ir vėl Basteris pabėgo!",
      } },
      open: { byCast: {
        a: [L("Max ran away again! Can you help me again?", "Maksas vėl pabėgo! Gal vėl galite man padėti?")],
        b: [L("Not again! Bella, come back! Oh, it's you!", "Tik ne vėl! Bela, grįžk! O, tai Jūs!")],
        c: [L("Buster! Not again! Oh, it's you, my friend!", "Basteri! Ir vėl! O, tai Jūs, drauge!")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Got him! Max, you silly dog!", "Pagavau! Maksai, kvailiuk tu!"),
          b: L("Got her! Bella, you little troublemaker!", "Pagavau! Bela, tu išdykėle!"),
          c: L("Got him! Buster, you rascal!", "Pagavau! Basteri, tu nenaudėli!"),
        } } },
        { say: { byCast: {
          a: L("Don't worry! I know this dog!", "Nesijaudink! Šį šunį aš jau pažįstu!"),
          b: L("Don't worry! I know this dog!", "Nesijaudinkite! Šį šunį aš jau pažįstu!"),
          c: L("Don't worry! I know this dog!", "Nesijaudinkite! Šį šunį aš jau pažįstu!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Thank you! I think he ran to you on purpose!", "Ačiū! Man atrodo, jis tyčia bėgo pas Jus!")],
        b: [L("Thank you! You're Bella's favorite person now.", "Ačiū! Dabar Jūs – mėgstamiausias Belos žmogus.")],
        c: [L("You again! I think Buster runs away just to see you.", "Vėl Jūs! Man rodos, Basteris pabėga vien tam, kad Jus pamatytų.")],
      } },
      away: { byCast: {
        a: L("Oh no... Max, wait for me!", "O ne... Maksai, palauk manęs!"),
        b: L("Oh no... Bella, wait!", "O ne... Bela, palauk!"),
        c: L("Oh boy... Buster, wait for me!", "Ech... Basteri, palauk manęs!"),
      } },
    },
    familiar: {
      open: { byCast: {
        a: [L("Hi! Look, Max has a new leash! It's red!", "Sveiki! Žiūrėkite, Maksas turi naują pavadėlį! Raudoną!")],
        b: [L("Hi there! Bella's on a short leash today. No squirrels!", "Sveiki! Bela šiandien ant trumpo pavadėlio. Jokių voverių!")],
        c: [L("Hello, friend! Buster's too tired to run today. Ha!", "Sveiki, drauge! Basteris šiandien per daug pavargęs bėgioti. Cha!")],
      } },
      choices: [
        { say: L("Aw! Hi there, cutie!", "Oi! Labas, mieliuk!") },
        { say: { byCast: {
          a: L("Good to see you both!", "Malonu jus abu matyti!"),
          b: L("Good to see you both!", "Malonu jus abi matyti!"),
          c: L("Good to see you both!", "Malonu jus abu matyti!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("He says hi! Bye!", "Jis sveikinasi! Iki!")],
        b: [L("She says hi too! Take care!", "Ji irgi sveikinasi! Laikykitės!")],
        c: [L("Ha! He says hello. Take care!", "Cha! Jis sveikinasi. Laikykitės!")],
      } },
    },
  },
  {
    id: "i_bike", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "young", role: "Dviratininkas", prop: "bike", voice: "st_m_young" },
      { id: "b", gender: "f", age: "adult", role: "Dviratininkė", prop: "bike", voice: "st_f_adult" },
      { id: "c", gender: "m", age: "kid", role: "Berniukas", prop: "bike", propKind: "small", voice: "st_kid_m" },
    ],
    first: {
      scene: { byCast: {
        a: "Vaikinui nuo dviračio nukrito grandinė.",
        b: "Moteris stumia dviratį – priekinė padanga visai nuleista.",
        c: "Berniukas nukrito nuo dviračio ir sėdi ant šaligatvio.",
      } },
      open: { byCast: {
        a: [L("Ugh, my chain came off!", "Ech, nukrito grandinė!"), L("Could you hold my bike for a sec?", "Gal galite sekundėlę palaikyti dviratį?")],
        b: [L("Excuse me! My tire's flat.", "Atsiprašau! Mano padanga visai nuleista."), L("Do you know where I can get some air?", "Gal žinote, kur galėčiau ją pripūsti?")],
        c: [L("Ow... I fell off my bike.", "Ai... Nukritau nuo dviračio.")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Sure! I've got it.", "Žinoma! Laikau."),
          b: L("Try the gas station! They have air.", "Pabandykite degalinėje! Ten galima pripūsti padangas."),
          c: L("Oh no! Are you okay?", "O ne! Ar tau viskas gerai?"),
        } } },
        { say: { byCast: {
          a: L("No problem! Take your time.", "Jokių problemų! Neskubėkite."),
          b: L("Hmm... Maybe the gas station?", "Hm... Gal degalinėje?"),
          c: L("Here, let me help you up!", "Leisk, padėsiu tau atsikelti!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Thanks! Okay... there. All fixed!", "Ačiū! Na... štai. Sutvarkyta!"), L("Ha! Now my hands are covered in grease.", "Cha! Tik dabar rankos visos tepaluotos.")],
        b: [L("The gas station! Of course! Thank you!", "Degalinė! Na žinoma! Ačiū!")],
        c: [L("I'm okay. It's just a little scrape.", "Viskas gerai. Tik truputį nusibrozdinau."), L("Thanks! I didn't even cry!", "Ačiū! Aš net neverkiau!")],
      } },
      away: L("Oh... okay. Bye!", "O... gerai. Iki!"),
    },
    second: {
      open: { byCast: {
        a: [L("Hey, it's you! Guess what? My chain again!", "Ei, tai Jūs! Žinote ką? Vėl grandinė!"), L("Could you hold it one more time?", "Gal galite palaikyti dar kartą?")],
        b: [L("Oh, hi! Can you believe it? Another flat tire!", "O, sveiki! Įsivaizduojate? Vėl nuleista padanga!")],
        c: [L("Hi! Look! I can ride with no hands!", "Sveiki! Žiūrėkite! Moku važiuoti nesilaikydamas!")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Sure! You really need a new chain!", "Žinoma! Jums tikrai reikia naujos grandinės!"),
          b: L("Oh no! The gas station again?", "O ne! Vėl į degalinę?"),
          c: L("Whoa! Careful!", "Oho! Atsargiai!"),
        } },
          reply: { byCast: {
            a: [L("You're right. I'm getting a new one today!", "Teisybė. Šiandien pat perku naują!")],
            b: [L("Yep! At least I know the way now. Thanks!", "Taip! Bent jau dabar žinau kelią. Ačiū!")],
            c: [L("Okay, okay! You sound like my mom!", "Gerai, gerai! Kalbate kaip mano mama!")],
          } } },
        { say: { byCast: {
          a: L("Of course! Same time next week?", "Žinoma! Tuo pačiu laiku kitą savaitę?"),
          b: L("Maybe it's time for new tires!", "Gal laikas naujoms padangoms!"),
          c: L("Hands on the handlebars, please!", "Rankas ant vairo, prašau!"),
        } },
          reply: { byCast: {
            a: [L("Ha! I hope not! Thanks again!", "Cha! Tikiuosi, kad ne! Dar kartą ačiū!")],
            b: [L("I know, I know. Maybe a new bike!", "Žinau, žinau. O gal net naujo dviračio!")],
            c: [L("Okay, okay! You sound like my mom!", "Gerai, gerai! Kalbate kaip mano mama!")],
          } } },
      ],
      away: L("Okay, bye!", "Gerai, iki!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey! New chain! It runs like a dream.", "Sveiki! Nauja grandinė! Važiuoja kaip per sviestą.")],
        b: [L("Hi! New tires! No more flats for me.", "Sveiki! Naujos padangos! Daugiau jokių nuleistų padangų.")],
        c: [L("Hi! I rode all the way to the park! With both hands!", "Sveiki! Nuvažiavau iki pat parko! Laikydamasis abiem rankom!")],
      } },
      choices: [
        { say: L("Nice! Have a good ride!", "Puiku! Gero pasivažinėjimo!") },
        { say: L("Way to go!", "{nm:Šaunuolis|nf:Šaunuolė}!") },
      ],
      reply: [L("Thanks! See you around!", "Ačiū! Iki pasimatymo!")],
    },
  },
  {
    id: "i_carry", kind: "incident",
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Praeivis", prop: "box", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Praeivė", prop: "flowers", voice: "st_f_young" },
      { id: "c", gender: "f", age: "old", role: "Senyva ponia", prop: "cake_box", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Whoa, this box is heavy! Could you grab the other side?", "Oho, kokia sunki dėžė! Gal galite paimti iš kito šono?")],
        b: [L("Excuse me! Could you hold these flowers for a second?", "Atsiprašau! Gal galite sekundėlę palaikyti šias gėles?"), L("My shoelace came untied.", "Atsirišo batraištis.")],
        c: [L("Excuse me, dear. Could you help me carry this cake?", "Atsiprašau, {m:mielasis|f:mieloji}. Gal padėtumėte panešti šį tortą?"), L("It's for my granddaughter's birthday.", "Tai anūkės gimtadieniui.")],
      } },
      choices: [
        { say: L("Sure! Here, let me help.", "Žinoma! Leiskite, padėsiu.") },
        { say: { byCast: {
          a: L("Of course! Ready? One, two, three... lift!", "Žinoma! Pasiruošęs? Vienas, du, trys... keliam!"),
          b: L("Of course! Wow, they're beautiful!", "Žinoma! Oho, kokios gražios!"),
          c: L("Of course! I'll be very careful.", "Žinoma! Nešiu labai atsargiai."),
        } } },
      ],
      reply: { byCast: {
        a: [L("Thanks! Phew, that's much better.", "Ačiū! Fiu, taip daug lengviau."), L("It's my new TV. I can't wait!", "Tai mano naujas televizorius. Nekantrauju!")],
        b: [L("Thank you! They're for my grandma. She's turning ninety!", "Ačiū! Jos – močiutei. Jai sukanka devyniasdešimt!")],
        c: [L("Thank you, dear! It's chocolate. Her favorite!", "Ačiū, {m:mielasis|f:mieloji}! Šokoladinis. Jos mėgstamiausias!")],
      } },
      away: L("Oh... okay. I'll manage!", "O... gerai. Kaip nors susitvarkysiu!"),
    },
    second: {
      open: { byCast: {
        a: [L("Oh, hey! It's you again! Another box!", "O, sveiki! Vėl Jūs! Ir vėl dėžė!"), L("This time it's a microwave. Grab a side?", "Šįkart – mikrobangų krosnelė. Paimsite iš kito šono?")],
        b: [L("Oh, hi! It's you! My shoelace again, can you believe it?", "O, sveiki! Tai Jūs! Vėl batraištis, įsivaizduojate?"), L("Could you hold my flowers again?", "Gal vėl palaikytumėte gėles?")],
        c: [L("Oh, it's you, dear! Another cake, I'm afraid.", "O, tai Jūs, {m:mielasis|f:mieloji}! Ir vėl tortas, deja."), L("My grandson's birthday this time!", "Šįkart – anūko gimtadienis!")],
      } },
      choices: [
        { say: L("Ha! Sure, I'm getting good at this!", "Cha! Žinoma, man tai jau puikiai sekasi!") },
        { say: { byCast: {
          a: L("Of course! You buy a lot of stuff!", "Žinoma! Jūs daug ką perkate!"),
          b: L("Of course! Maybe try a double knot?", "Žinoma! Gal pabandykite dvigubą mazgą?"),
          c: L("Of course! Your family has lots of birthdays!", "Žinoma! Jūsų šeimoje daug gimtadienių!"),
        } } },
      ],
      reply: { byCast: {
        a: [L("Ha! I just moved in. Thanks, my friend!", "Cha! Ką tik įsikrausčiau. Ačiū, drauge!")],
        b: [L("Thank you! You're always here when I need help!", "Ačiū! Jūs visada čia, kai man reikia pagalbos!")],
        c: [L("Twelve grandkids, dear! Thank you so much.", "Dvylika anūkų, {m:mielasis|f:mieloji}! Labai Jums ačiū.")],
      } },
      away: L("Oh, okay. I'll manage!", "O, gerai. Susitvarkysiu!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hey! No boxes today! Just me.", "Sveiki! Šiandien jokių dėžių! Tik aš.")],
        b: [L("Hi! Look, no flowers, and my shoes are tied!", "Sveiki! Žiūrėkite – jokių gėlių, ir batai užrišti!")],
        c: [L("Hello, dear! The birthday was lovely. Everyone loved the cake.", "Sveiki, {m:mielasis|f:mieloji}! Gimtadienis buvo puikus. Tortas visiems labai patiko.")],
      } },
      choices: [
        { say: L("Nice! How's it going?", "Šaunu! Kaip sekasi?"),
          reply: [L("Pretty good, thanks! Take care!", "Visai neblogai, ačiū! Laikykitės!")] },
        { say: L("Good to see you!", "Malonu Jus matyti!"),
          reply: [L("You too! Take care!", "Man irgi malonu! Laikykitės!")] },
      ],
    },
  },
  {
    id: "i_survey", kind: "incident",
    cast: [
      { id: "a", gender: "f", age: "young", role: "Studentė", prop: "clipboard", voice: "st_f_young" },
      { id: "b", gender: "m", age: "adult", role: "Radijo žurnalistas", prop: "microphone", voice: "st_m_adult" },
      { id: "c", gender: "f", age: "old", role: "Bibliotekos savanorė", prop: "clipboard", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Hi! Can I ask you a quick question? It's for college.", "Sveiki! Gal galiu užduoti trumpą klausimą? Tai studijoms."), L("What's your favorite season?", "Koks Jūsų mėgstamiausias metų laikas?")],
        b: [L("Hi there! I'm with the local radio. Can I ask you something?", "Sveiki! Aš iš vietinio radijo. Galiu kai ko paklausti?"), L("What do you love about our town?", "Kas Jums labiausiai patinka mūsų mieste?")],
        c: [L("Hello, dear! The library book sale is on Saturday.", "Sveiki, {m:mielasis|f:mieloji}! Šeštadienį bibliotekoje – knygų mugė."), L("Would you like to help out?", "Gal norėtumėte padėti?")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Fall, for sure! I love the colors.", "Ruduo, be abejo! Man patinka jo spalvos."),
          b: L("The people! Everyone's so friendly.", "Žmonės! Visi tokie draugiški."),
          c: L("Sure! I love books.", "Žinoma! Labai mėgstu knygas."),
        } },
          reply: { byCast: {
            a: [L("Me too! That's the top answer today.", "Aš irgi! Šiandien tai populiariausias atsakymas.")],
            b: [L("I hear that a lot! Thanks for talking to me.", "Tai girdžiu dažnai! Ačiū, kad pakalbėjote.")],
            c: [L("Wonderful! I'll put you down for Saturday.", "Nuostabu! Užrašau Jus šeštadieniui.")],
          } } },
        { say: { byCast: {
          a: L("Summer! I love the sunshine.", "Vasara! Mėgstu saulę."),
          b: L("The harbor! It's so beautiful.", "Uostas! Jis toks gražus."),
          c: L("Maybe! What would I do?", "Galbūt! O ką reikėtų daryti?"),
        } },
          reply: { byCast: {
            a: [L("Good answer! Thanks for your help!", "Geras atsakymas! Ačiū už pagalbą!")],
            b: [L("Great answer! Listen for yourself on the radio!", "Puikus atsakymas! Klausykitės savęs per radiją!")],
            c: [L("Just sell books and drink coffee. Easy!", "Tik pardavinėti knygas ir gerti kavą. Paprasta!")],
          } } },
        { say: L("Sorry, not right now!", "Atsiprašau, dabar negaliu!"), helped: false,
          reply: [L("No worries! Have a great day!", "Nieko tokio! Puikios dienos!")] },
      ],
      away: L("Oh, okay! Thanks anyway!", "O, gerai! Vis tiek ačiū!"),
    },
    second: {
      open: { byCast: {
        a: [L("Hi again! One more question. Last one, I promise!", "Vėl sveiki! Dar vienas klausimas. Paskutinis, pažadu!"), L("Coffee or tea?", "Kava ar arbata?")],
        b: [L("Hey, it's you again! Quick one for the morning show.", "Ei, vėl Jūs! Trumpas klausimas rytinei laidai."), L("What's the best thing to do here in the fall?", "Ką geriausia čia veikti rudenį?")],
        c: [L("Hello again, dear! Now we need cookies for the book sale.", "Vėl sveiki, {m:mielasis|f:mieloji}! Dabar knygų mugei reikia sausainių."), L("Do you bake?", "Ar kepate?")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Coffee! From Sunny Cup, of course.", "Kava! Žinoma, iš „Sunny Cup“."),
          b: L("Walk by the harbor and look at the leaves!", "Pasivaikščioti prie uosto ir grožėtis lapais!"),
          c: L("A little! I can make cookies.", "Truputį! Sausainių iškepti moku."),
        } },
          reply: { byCast: {
            a: [L("Ha! Everybody loves Mia's coffee.", "Cha! Visi mėgsta Mijos kavą.")],
            b: [L("Beautiful! Thanks again!", "Gražiai pasakyta! Dar kartą ačiū!")],
            c: [L("Perfect! Chocolate chip, maybe?", "Puiku! Gal su šokolado gabalėliais?")],
          } } },
        { say: { byCast: {
          a: L("Tea! With honey.", "Arbata! Su medumi."),
          b: L("Pumpkin everything!", "Viskas su moliūgais!"),
          c: L("Not really, but I can buy some!", "Nelabai, bet galiu nupirkti!"),
        } },
          reply: { byCast: {
            a: [L("Tea! You're my first tea person today.", "Arbata! Jūs – {m:pirmas arbatos mėgėjas|f:pirma arbatos mėgėja} šiandien.")],
            b: [L("Ha! Pumpkin coffee, pumpkin pie... I love it!", "Cha! Moliūgų kava, moliūgų pyragas... Dievinu!")],
            c: [L("That works too! Thank you, dear.", "Tinka ir taip! Ačiū, {m:mielasis|f:mieloji}.")],
          } } },
      ],
      away: L("Okay! See you around!", "Gerai! Iki pasimatymo!"),
    },
    familiar: {
      open: { byCast: {
        a: [L("Hi! Guess what? I got an A on my project!", "Sveiki! Žinote ką? Už projektą gavau dešimtuką!")],
        b: [L("Hey, my favorite listener! No questions today, I promise.", "Ei, {m:mano mėgstamiausias klausytojas|f:mano mėgstamiausia klausytoja}! Šiandien jokių klausimų, pažadu.")],
        c: [L("Hello, dear! The book sale was a big success!", "Sveiki, {m:mielasis|f:mieloji}! Knygų mugė labai pavyko!")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Congratulations!", "Sveikinu!"),
          b: L("Ha! Good to hear!", "Cha! Malonu girdėti!"),
          c: L("Congratulations!", "Sveikinu!"),
        } } },
        { say: L("That's great!", "Puiku!") },
      ],
      reply: [L("Thanks! Enjoy the rest of your day!", "Ačiū! Gražios Jums dienos!")],
    },
  },

  // ---------------------------------------------------------------- arcs
  {
    id: "a_coffee", kind: "arc", after: { id: "i_dropped", helped: true },
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Praeivis", prop: "coffee_cup", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "adult", role: "Praeivė", prop: "coffee_cup", voice: "st_f_adult" },
      { id: "c", gender: "f", age: "old", role: "Senyva ponia", prop: "coffee_cup", voice: "st_f_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("There you are! You found my wallet yesterday.", "Štai kur Jūs! Vakar radote mano piniginę."),
          L("I got you a coffee from Sunny Cup. It's on me!", "Atnešiau Jums kavos iš „Sunny Cup“. Aš vaišinu!")],
        b: [L("Hey! You found my keys yesterday, remember?", "Ei! Vakar radote mano raktus, prisimenate?"),
          L("This coffee's for you. My treat!", "Ši kava – Jums. Aš vaišinu!")],
        c: [L("Oh, there you are, dear! You found my glove yesterday.", "Oi, štai kur Jūs, {m:mielasis|f:mieloji}! Vakar radote mano pirštinę."),
          L("I brought you a hot coffee, to warm your hands!", "Atnešiau Jums karštos kavos – rankoms sušildyti!")],
      } },
      choices: [
        { say: L("Aw, you didn't have to!", "Oi, nereikėjo!") },
        { say: L("Thank you! That's so kind of you.", "Ačiū! Labai malonu iš Jūsų pusės.") },
      ],
      reply: [L("It's the least I can do. Enjoy!", "Tai mažiausia, ką galiu padaryti. Skanaus!")],
      card: L("It's on me!", "Aš vaišinu!"),
    },
  },
  {
    id: "a_postcard", kind: "arc", after: { id: "i_tourist", helped: true },
    cast: [
      { id: "a", gender: "m", age: "adult", role: "Turistas", prop: "postcard", voice: "st_m_adult" },
      { id: "b", gender: "f", age: "young", role: "Turistė", prop: "postcard", voice: "st_f_young" },
      { id: "c", gender: "m", age: "old", role: "Turistas", prop: "postcard", voice: "st_m_old" },
    ],
    first: {
      open: { byCast: {
        a: [L("Hey, there you are! You helped me when I was lost.", "Ei, štai kur Jūs! Padėjote man, kai buvau pasiklydęs."),
          L("I'm heading home today. Here's a postcard from Chicago!", "Šiandien grįžtu namo. Štai Jums atvirukas iš Čikagos!")],
        b: [L("Oh, hi! You helped me when my phone died!", "O, sveiki! Padėjote man, kai išsikrovė telefonas!"),
          L("I fly home tomorrow. This is for you, from San Diego!", "Rytoj skrendu namo. Čia Jums – atvirukas iš San Diego!")],
        c: [L("There you are, my friend! You helped this old tourist find his way.", "Štai kur Jūs, mano drauge! Padėjote senam turistui rasti kelią."),
          L("My trip is over. Here's a postcard from Florida!", "Mano kelionė baigėsi. Štai Jums atvirukas iš Floridos!")],
      } },
      choices: [
        { say: L("Oh, thank you! I love it.", "O, ačiū! Labai gražus.") },
        { say: L("Have a safe trip home!", "Saugios kelionės namo!") },
        { say: L("Come back and visit soon!", "Būtinai atvažiuokite dar!") },
      ],
      reply: { byCast: {
        a: [L("Ha! Now I have a friend in Maple Harbor!", "Cha! Dabar turiu {m:draugą|f:draugę} Maple Harbore!")],
        b: [L("Aw, thanks! Take care, okay?", "Oi, ačiū! Laikykitės, gerai?")],
        c: [L("Thank you, my friend. Come see me in Florida sometime!", "Ačiū, mano drauge. Kada nors aplankykite mane Floridoje!")],
      } },
      away: L("Oh! Well, goodbye, then!", "O! Na, tada sudie!"),
      card: L("Have a safe trip home!", "Saugios kelionės namo!"),
    },
  },
  {
    id: "a_song", kind: "arc", after: { id: "r_musician", seen: 2 },
    cast: [{ id: "a", gender: "m", age: "young", role: "Gatvės muzikantas", name: "Eli", prop: "guitar", voice: "st_eli" }],
    first: {
      open: [L("Hey, you! Perfect timing. I finished my new song!", "Ei, tai Jūs! Kaip tik laiku. Užbaigiau naują dainą!"),
        L("You're the first one to hear it. Ready?", "Jūs ją išgirsite {m:pirmas|f:pirma}. {m:Pasiruošęs|f:Pasiruošusi}?")],
      choices: [
        { say: L("Yes! I'm all ears.", "Taip! {m:Visas|f:Visa} virstu ausimis!") },
        { say: L("Wow, I'm honored! Go for it!", "Oho, man didelė garbė! Pirmyn!") },
        { say: L("What's it called?", "Kaip ji vadinasi?"),
          reply: [L("It's called “Hello, Neighbor.” Here goes!", "Ji vadinasi „Labas, kaimyne“. Pradedu!")] },
      ],
      reply: [L("Okay, here goes... One, two, three, four!", "Gerai, pradedu... Vienas, du, trys, keturi!")],
      then: {
        open: [L("So? What do you think? Be honest!", "Na? Ką manote? Tik atvirai!")],
        choices: [
          { say: L("I love it! It's beautiful.", "Labai patinka! Graži daina.") },
          { say: L("Wow! It should be on the radio!", "Oho! Ją turėtų groti per radiją!") },
        ],
        reply: [L("Really? You just made my day!", "Tikrai? Jūs man ką tik praskaidrinote dieną!")],
      },
      away: L("Hey, wait! It's a short one!", "Ei, palaukite! Ji trumpa!"),
      card: L("You made my day!", "Jūs man praskaidrinote dieną!"),
    },
  },
  {
    id: "a_pie", kind: "arc", after: { id: "i_spill", helped: true },
    cast: [
      { id: "a", gender: "f", age: "adult", role: "Pirkėja", prop: "pie", voice: "st_f_adult" },
      { id: "b", gender: "m", age: "old", role: "Pirkėjas", prop: "pie", voice: "st_m_old" },
      { id: "c", gender: "m", age: "young", role: "Pirkėjas", prop: "pie", voice: "st_m_young" },
    ],
    first: {
      open: { byCast: {
        a: [L("There you are! Remember my apples? I baked a pie!", "Štai kur Jūs! Prisimenate mano obuolius? Iškepiau pyragą!"),
          L("Here, this piece is for you.", "Štai, šis gabalėlis – Jums.")],
        b: [L("Ah, my helper! Those oranges became an orange cake.", "A, {m:mano pagalbininkas|f:mano pagalbininkė}! Iš tų apelsinų išėjo apelsininis pyragas."),
          L("My wife says this slice is for you.", "Žmona sako, kad šis gabalėlis – Jums.")],
        c: [L("Hey! Remember my lemons? I made lemon bars!", "Sveiki! Prisimenate mano citrinas? Iškepiau citrininių pyragaičių!"),
          L("I saved the best one for you.", "Geriausią palikau Jums.")],
      } },
      choices: [
        { say: { byCast: {
          a: L("Oh, wow! It looks delicious!", "Oho! Atrodo labai skaniai!"),
          b: L("Oh, wow! It looks delicious!", "Oho! Atrodo labai skaniai!"),
          c: L("Oh, wow! They look delicious!", "Oho! Atrodo labai skaniai!"),
        } } },
        { say: L("You remembered! Thank you so much!", "Prisiminėte! Labai Jums ačiū!") },
        { say: L("That's so sweet of you!", "Kaip miela iš Jūsų pusės!") },
      ],
      reply: { byCast: {
        a: [L("Enjoy! It's still warm.", "Skanaus! Dar šiltas.")],
        b: [L("Enjoy! It's my wife's secret recipe.", "Skanaus! Žmonos slaptas receptas.")],
        c: [L("Enjoy! My mom says they're my best ones yet.", "Skanaus! Mama sako, kad tokių skanių dar nebuvau iškepęs.")],
      } },
      away: L("Oh! Well... I'll save it for you!", "O! Na... palaikysiu Jums!"),
    },
  },
];

export const STREET_CHATTER: StreetChatter[] = [
  { id: "c_cold", lines: [L("Brr, it's getting cold!", "Brr, darosi šalta!"), L("Yep. Fall is here for real.", "Taip. Ruduo tikrai atėjo.")] },
  { id: "c_game", lines: [L("Did you see the game last night?", "Matei vakar rungtynes?"), L("Don't remind me. We lost again!", "Nė neprimink. Vėl pralaimėjome!")] },
  { id: "c_festival", near: "square", lines: [L("Are you going to the fall festival?", "Eisi į rudens šventę?"), L("Of course! I never miss the pie contest.", "Žinoma! Pyragų konkurso niekada nepraleidžiu.")] },
  { id: "c_coffee", near: "cafe", lines: [L("How's your coffee?", "Kaip tavo kava?"), L("Perfect. Best in town.", "Tobula. Geriausia mieste.")] },
  { id: "c_muffins", near: "cafe", lines: [L("Mia has pumpkin muffins today!", "Mija šiandien turi moliūginių keksiukų!"), L("Really? Save me one!", "Tikrai? Palik man vieną!")] },
  { id: "c_latte", near: "cafe", lines: [L("Pumpkin spice latte again?", "Vėl moliūgų latė?"), L("Hey, don't start! It's only here in the fall.", "Tik nepradėk! Ji būna tik rudenį.")] },
  { id: "c_ferry", near: "water", lines: [L("Is the ferry running today?", "Ar keltas šiandien plaukia?"), L("Only in the morning. The wind's too strong.", "Tik ryte. Vėjas per stiprus.")] },
  { id: "c_lobster", near: "water", lines: [L("Lobster's so expensive this year!", "Omarai šiemet tokie brangūs!"), L("Tell me about it. I'm eating fish sticks!", "Nė nesakyk. Aš valgau žuvies pirštelius!")] },
  { id: "c_seals", near: "water", lines: [L("Did you see the seals by the dock?", "Matei ruonius prie prieplaukos?"), L("Yes! One of them waved at me!", "Taip! Vienas man net pamojavo!")] },
  { id: "c_lights", near: "square", lines: [L("They're putting up the lights in the square!", "Aikštėje jau kabina lemputes!"), L("Already? It's not even Thanksgiving!", "Jau? Dar net Padėkos dienos nebuvo!")] },
  { id: "c_cider", near: "square", lines: [L("Have you tried Sal's hot cider?", "Ragavai Salo karštų obuolių sulčių?"), L("Every day! Best part of fall.", "Kasdien! Geriausia rudens dalis.")] },
  { id: "c_pumpkins", lines: [L("Did you carve a pumpkin for Halloween yet?", "Jau išskaptavai moliūgą Helovinui?"), L("Not yet. My kids want a scary one this year!", "Dar ne. Vaikai šiemet nori baisaus!")] },
  { id: "c_halloween", lines: [L("What are you going as for Halloween?", "Kuo persirengsi per Heloviną?"), L("A ghost, like every year!", "Vaiduokliu, kaip kasmet!")] },
  { id: "c_fog", lines: [L("Look at this fog! I can't even see the lighthouse.", "Pažiūrėk, koks rūkas! Net švyturio nesimato."), L("That's what the foghorn is for!", "Štai kam reikalinga rūko sirena!")] },
  { id: "c_car", lines: [L("Where's your car?", "Kur tavo mašina?"), L("In the shop again. I'm walking everywhere!", "Vėl remonte. Dabar visur vaikštau pėsčiomis!")] },
  { id: "c_wifi", lines: [L("Is the town Wi-Fi down again?", "Ar miesto „Wi-Fi“ vėl neveikia?"), L("Yep. Guess we'll have to actually talk!", "Jo. Teks tiesiog pasikalbėti!")] },
  { id: "c_cousin", lines: [L("My cousin's visiting from Boston this week.", "Šią savaitę pas mane svečiuojasi pusbrolis iš Bostono."), L("Nice! Bring him to the fall festival!", "Puiku! Atsivesk jį į rudens šventę!")] },
  { id: "c_leaves", lines: [L("I raked my yard three times this week!", "Šią savaitę kiemą grėbiau jau tris kartus!"), L("And the leaves just keep coming. That's fall!", "O lapai vis krenta. Ruduo, ką padarysi!")] },
  { id: "c_booksale", lines: [L("The library book sale is this Saturday.", "Šį šeštadienį bibliotekoje – knygų mugė."), L("I'll be there! I always buy too many.", "Būtinai ateisiu! Visada nusiperku per daug.")] },
  { id: "c_turkey", lines: [L("Who's hosting Thanksgiving this year?", "Kas šiemet ruošia Padėkos dienos vakarienę?"), L("Me! Twelve people and one tiny oven.", "Aš! Dvylika žmonių ir viena mažytė orkaitė.")] },
];
