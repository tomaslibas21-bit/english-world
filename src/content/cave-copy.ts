// Load with the cave or its map/picker adapter. The situation catalog carries its own small metadata.
import type { CaveStoneGroup } from "./cave-stones";

export type CaveLabel = Readonly<{ en: string; lt: string }>;
const label = (en: string, lt: string): CaveLabel => ({ en, lt });

export const CAVE_ROOMS: Readonly<Record<CaveStoneGroup, CaveLabel>> = {
  tide: label("Tide Hall", "Potvynių menė"),
  root: label("Root Garden", "Šaknų sodas"),
  river: label("Hidden River", "Slaptoji upė"),
  star: label("Star Hall", "Žvaigždžių menė"),
  oak: label("Oak Heart", "Ąžuolo širdis"),
};

export const CAVE_GOALS = { firstRoom: 3, rooms: 5, oak: 5, replay: 215 } as const;
export type CaveGate = "bram" | "fern";

const gateClosed = label("The gate is still closed", "Vartai dar uždaryti");
const stoneLit = label("The stone lit up!", "Akmuo sušvito!");

export const CAVE_COPY = {
  door: {
    main: label("Cave entrance", "Įėjimas į olą"),
    cleft: label("Slate cleft", "Skalūno plyšys"),
    dryExit: label("Exit to the trail", "Išėjimas į taką"),
    ring: label("Ring entrance", "Įėjimas į akmenų ratą"),
    lookout: label("Harbor lookout", "Uosto apžvalgos aikštelė"),
    bram: label("Bram's gate", "Bramo vartai"),
    tide: label("Tide Hall gate", "Potvynių menės vartai"),
    root: label("Root Garden gate", "Šaknų sodo vartai"),
    fern: label("Fern's bridge", "Fernos tiltas"),
    star: label("Star Hall gate", "Žvaigždžių menės vartai"),
    oak: label("Oak Heart gate", "Ąžuolo širdies vartai"),
  },
  action: {
    enter: label("Enter the cave", "Įeiti į olą"),
    exit: label("Leave the cave", "Išeiti iš olos"),
    ring: label("Visit the ring", "Aplankyti akmenų ratą"),
    lookout: label("Climb to the lookout", "Užlipti į apžvalgos aikštelę"),
    bram: label("Talk to Bram", "Pasikalbėti su Bramu"),
    fern: label("Talk to Fern", "Pasikalbėti su Ferna"),
    oak: label("Listen to the Old Oak", "Pasiklausyti senojo ąžuolo"),
    stone: label("Listen to the stone", "Pasiklausyti akmens"),
    gate: label("Check the gate", "Prieiti prie vartų"),
  },
  map: {
    exterior: label("Slate Cove trail map", "Skalūnų įlankos takų žemėlapis"),
    interior: label("Cave map", "Olos žemėlapis"),
    entrancePin: label("Show the cave entrance on the map", "Rodyti įėjimą į olą žemėlapyje"),
    ringPin: label("Show the Old Stone Ring on the map", "Rodyti Senąjį akmenų ratą žemėlapyje"),
    select: label("Show the way", "Rodyti kelią"),
    exitRoute: label("The trail to your town stop starts at the dry exit.", "Į miestelį grįšite pro išėjimą į sausą taką."),
  },
  picker: {
    blurb: label("Follow the gray path. Listen for the stones.", "Eikite pilkuoju taku ir pasiklausykite akmenų."),
    fernLocked: label("Light the Tide Hall stones and follow the path to Fern.", "Įžiebkite Potvynių menės akmenis ir eikite taku iki Fernos."),
    oakLocked: label("Light five stones and cross Fern's bridge.", "Įžiebkite penkis akmenis ir pereikite Fernos tiltą."),
    practice: label("Practice the conversation", "Pasipraktikuoti kalbėtis"),
    practiceFern: label("Practice riddles with Fern here.", "Čia galite pamėginti įminti Fernos mįsles."),
    practiceOak: label("Practice the conversation with the Old Oak here.", "Čia galite pasipraktikuoti kalbėtis su senuoju ąžuolu."),
    completed: label("Visit the cave again", "Sugrįžti į olą"),
  },
  banner: {
    first: label("Bram knows the way to the stones.", "Bramas žino, kur rasti akmenis."),
    returning: label("The cave is just as you left it.", "Oloje viskas taip, kaip palikote."),
    replay: label("Listen for a new line.", "Pasiklausykite naujos akmens frazės."),
  },
  card: {
    title: label("Cave progress", "Kelionė po olą"),
    expand: label("Show cave details", "Rodyti kelionės po olą eigą"),
    collapse: label("Fold cave details", "Suskleisti olos kortelę"),
    roomCount: (room: number) => label(`Room ${room} of ${CAVE_GOALS.rooms}`, `Menė ${room} iš ${CAVE_GOALS.rooms}`),
    hallsOpen: (open: number) => label(`${open} of ${CAVE_GOALS.rooms} rooms open`, `Atviros menės – ${open} iš ${CAVE_GOALS.rooms}`),
    litCount: (lit: number) => label(`${lit} of ${CAVE_GOALS.firstRoom} stones lit here`, `Čia šviečia ${lit} iš ${CAVE_GOALS.firstRoom} akmenų`),
    oakCount: (lit: number) => label(`${lit} of ${CAVE_GOALS.oak} stones for the Oak`, `Ąžuolui įžiebta ${lit} iš ${CAVE_GOALS.oak} akmenų`),
    replayCount: (heard: number) => label(`${heard} of ${CAVE_GOALS.replay} lines heard`, `Išgirsta ${heard} iš ${CAVE_GOALS.replay} frazių`),
    round: (round: number) => label(`Round ${round}`, `Ratas nr. ${round}`),
    oakSleeping: label("The Old Oak is asleep.", "Senasis ąžuolas dar miega."),
    oakAwake: label("The Old Oak is awake.", "Senasis ąžuolas pabudo."),
    completed: label("You heard the Old Oak.", "Pasiklausėte senojo ąžuolo."),
    completedNext: label("Listen for more lines, or follow the dry trail out.", "Pasiklausykite kitų frazių arba išeikite sausuoju taku."),
  },
  guide: {
    cave: label("Cave guide", "Kelias oloje"),
    town: label("Town guide", "Kelias į miestelį"),
    bram: label("Talk to Bram", "Pasikalbėkite su Bramu"),
    fern: label("Ask Fern to cross", "Paprašykite Fernos leisti pereiti tiltą"),
    oak: label("Go to the Old Oak", "Prieikite prie senojo ąžuolo"),
    stone: label("Find the next stone", "Raskite kitą akmenį"),
    tideLeft: (left: number) => left === 1
      ? label("1 stone left in Tide Hall", "Potvynių menėje liko 1 akmuo")
      : label(`${left} stones left in Tide Hall`, `Potvynių menėje liko ${left} akmenys`),
    nextRoom: (room: CaveLabel) => label(`The way is open – ${room.en}`, `Kelias atviras – ${room.lt}`),
    oakLeft: (left: number) => left === 1
      ? label("1 more stone to wake the Oak", "Iki ąžuolo pabudimo liko 1 akmuo")
      : label(`${left} more stones to wake the Oak`, `Iki ąžuolo pabudimo liko ${left} akmenys`),
    replay: label("Follow the next speaking stone", "Eikite ten, kur kalba kitas akmuo"),
    exit: label("Follow the dry trail out", "Išeikite sausuoju taku"),
  },
  quiz: {
    title: label("Speaking stone", "Kalbantis akmuo"),
    question: label("What is the stone saying?", "Ką sako akmuo?"),
    pick: label("Choose what it means.", "Pasirinkite, ką tai reiškia."),
    wrong: label("Try another meaning.", "Pamėginkite pasirinkti kitą reikšmę."),
    reveal: label("Show the words", "Rodyti žodžius"),
    solved: stoneLit,
    or: label("or", "arba"),
    speak: label("Say it back", "Pakartokite balsu"),
    listening: label("Listening…", "Klausau…"),
    stopListening: label("Stop listening", "Baigti klausytis"),
    heard: (line: string) => label(`“${line}”`, `„${line}“`),
    missed: label("Try again, or choose a meaning.", "Pakartokite arba pasirinkite reikšmę."),
    unrecorded: label("Read the words and choose what they mean.", "Perskaitykite žodžius ir pasirinkite jų reikšmę."),
    replayUnavailable: label("Read the line again here.", "Dar kartą perskaitykite frazę čia."),
    option: (index: number, meaning: string) => label(`Choice ${index}. ${meaning}`, `${index} pasirinkimas. ${meaning}`),
  },
  toast: {
    first: {
      title: label("You found Slate Cove Cave!", "Radote Skalūnų įlankos olą!"),
      body: label("Talk to Bram on the gray path.", "Pasikalbėkite su Bramu ant pilkojo tako."),
    },
    returning: {
      title: label("Welcome back to the cave", "Smagu, kad sugrįžote į olą"),
      body: label("Follow the lights to pick up where you left off.", "Sekite žiburėlius ir tęskite kelionę."),
    },
    bramLocked: {
      title: label("Bram keeps this gate", "Šiuos vartus saugo Bramas"),
      body: label("Talk to Bram first.", "Pirmiausia pasikalbėkite su Bramu."),
    },
    fernLocked: {
      title: label("Fern keeps this bridge", "Šį tiltą saugo Ferna"),
      body: label("Try Fern's riddles before you cross.", "Prieš pereidami tiltą pamėginkite įminti Fernos mįsles."),
    },
    tideLocked: {
      title: gateClosed,
      body: label("Light all three stones in Tide Hall.", "Įžiebkite visus tris Potvynių menės akmenis."),
    },
    rootLocked: {
      title: gateClosed,
      body: label("Light a stone in the Root Garden.", "Įžiebkite akmenį Šaknų sode."),
    },
    oakLocked: {
      title: label("The Old Oak is asleep", "Senasis ąžuolas miega"),
      body: label("Light five different stones and cross Fern's bridge.", "Įžiebkite penkis skirtingus akmenis ir pereikite Fernos tiltą."),
    },
    bramPassed: {
      title: label("Bram opened the gate", "Bramas atvėrė vartus"),
      body: label("Follow the gray path to Tide Hall.", "Eikite pilkuoju taku į Potvynių menę."),
    },
    fernPassed: {
      title: label("Fern let you pass", "Ferna leido pereiti"),
      body: label("Follow the bridge across the river.", "Pereikite tiltą per upę."),
    },
    stoneLit: {
      title: stoneLit,
      body: (left: number) => left === 1
        ? label("1 stone left here.", "Čia liko 1 akmuo.")
        : label(`${left} stones left here.`, `Čia liko ${left} akmenys.`),
    },
    replayLit: {
      title: label("You heard a new line!", "Išgirdote naują frazę!"),
    },
    tideOpen: {
      title: label("All three stones are lit!", "Šviečia visi trys akmenys!"),
      body: label("The path to the Root Garden is open.", "Kelias į Šaknų sodą atviras."),
    },
    rootOpen: {
      title: label("The path is open!", "Kelias atviras!"),
      body: label("Follow the path to Fern's bridge.", "Eikite taku iki Fernos tilto."),
    },
    oakAwoke: {
      title: label("The Old Oak woke up!", "Senasis ąžuolas pabudo!"),
      body: label("Five stones are lit. Find the Oak on its island.", "Šviečia penki akmenys. Saloje Jūsų laukia ąžuolas."),
    },
    replayStart: {
      title: label("The stones speak again", "Akmenys vėl prabilo"),
      body: label("Listen for another line from each stone.", "Pasiklausykite, ką dar sako akmenys."),
    },
    replayDone: {
      title: label("You heard all 215 lines!", "Išgirdote visas 215 frazių!"),
      body: label("The stones are ready for another round.", "Akmenys pasiruošę prabilti iš naujo."),
    },
    exit: {
      title: label("Back on the trail", "Vėl ant tako"),
      body: label("Follow the trail back to town.", "Taku grįšite į miestelį."),
    },
  },
  ending: {
    bram: label("Three stones are waiting in Tide Hall.", "Potvynių menėje Jūsų laukia trys akmenys."),
    fern: label("The bridge is open. Follow the river path.", "Tiltas atviras. Eikite taku palei upę."),
    oak: label("Follow the lights to the dry exit.", "Sekite žiburėlius iki išėjimo į sausą taką."),
  },
} as const;
