// Load with the cave or its map/picker adapter. The situation catalog carries its own small metadata.
import type { CaveStoneGroup } from "./cave-stones";
import { CAVE_PRACTICE } from "./cave-picker-copy";

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
    gate: label("Walk up to the gate", "Prieiti prie vartų"),
  },
  map: {
    exterior: label("Slate Cove trail map", "Skalūnų įlankos takų žemėlapis"),
    interior: label("Cave map", "Olos žemėlapis"),
    entrancePin: label("Show the cave entrance on the map", "Rodyti įėjimą į olą žemėlapyje"),
    ringPin: label("Show the Old Stone Ring on the map", "Rodyti Senąjį akmenų ratą žemėlapyje"),
    select: label("Show the way", "Rodyti kelią"),
    exitRoute: label("The trail to your town stop starts at the dry exit.", "Pro išėjimą į sausą taką grįši prie kelio į savo užduoties vietą."),
    player: label("You are here", "Tu esi čia"),
    legend: label("Choose a place on the map. Yellow marks your task, red marks you.",
      "Pasirink vietą žemėlapyje. Geltonas taškas – tavo užduotis, raudonas – tu."),
  },
  picker: {
    blurb: label("Follow the gray path. Listen for the stones.", "Eik pilkuoju taku ir klausykis akmenų."),
    fernLocked: label("Light the Tide Hall stones and follow the path to Fern.", "Įžiebk Potvynių menės akmenis ir eik taku iki Fernos."),
    oakLocked: label("Light five stones and cross Fern's bridge.", "Įžiebk penkis akmenis ir pereik Fernos tiltą."),
    practice: CAVE_PRACTICE,
    practiceFern: label("Practice riddles with Fern here.", "Čia gali pamėginti įminti Fernos mįsles."),
    practiceOak: label("Practice the conversation with the Old Oak here.", "Čia gali pasitreniruoti kalbėti su senuoju ąžuolu."),
    completed: label("Visit the cave again", "Sugrįžti į olą"),
  },
  banner: {
    first: label("Bram knows the way to the stones.", "Bramas žino, kur rasti akmenis."),
    returning: label("The cave is just as you left it.", "Oloje viskas taip, kaip palikai."),
    replay: label("Listen for a new line.", "Pasiklausyk naujos akmens frazės."),
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
    round: (round: number) => label(`Round ${round}`, `${round} ratas`),
    oakSleeping: label("The Old Oak is asleep.", "Senasis ąžuolas dar miega."),
    oakAwake: label("The Old Oak is awake.", "Senasis ąžuolas pabudo."),
    completed: label("You heard the Old Oak.", "Pasiklausei senojo ąžuolo."),
    completedNext: label("Listen for more lines, or follow the dry trail out.", "Pasiklausyk kitų frazių arba išeik sausuoju taku."),
  },
  guide: {
    cave: label("Cave guide", "Kelias oloje"),
    town: label("Town guide", "Kelias į miestelį"),
    bram: label("Talk to Bram", "Pasikalbėk su Bramu"),
    fern: label("Ask Fern to let you cross", "Paprašyk Fernos leisti pereiti tiltą"),
    oak: label("Go to the Old Oak", "Prieik prie senojo ąžuolo"),
    stone: label("Find the next stone", "Rask kitą akmenį"),
    tideLeft: (left: number) => left === 1
      ? label("1 stone left in Tide Hall", "Potvynių menėje liko 1 akmuo")
      : label(`${left} stones left in Tide Hall`, `Potvynių menėje liko ${left} akmenys`),
    nextRoom: (room: CaveLabel) => label(`The way is open – ${room.en}`, `Kelias atviras – ${room.lt}`),
    oakLeft: (left: number) => left === 1
      ? label("1 more stone to wake the Oak", "Iki ąžuolo pabudimo liko 1 akmuo")
      : label(`${left} more stones to wake the Oak`, `Iki ąžuolo pabudimo liko ${left} akmenys`),
    replay: label("Follow the next speaking stone", "Eik ten, kur kalba kitas akmuo"),
    exit: label("Follow the dry trail out", "Išeik sausuoju taku"),
  },
  quiz: {
    title: label("Speaking stone", "Kalbantis akmuo"),
    question: label("What is the stone saying?", "Ką sako akmuo?"),
    pick: label("Choose what it means.", "Pasirink, ką tai reiškia."),
    wrong: label("Try another meaning.", "Pamėgink pasirinkti kitą reikšmę."),
    reveal: label("Show the words", "Rodyti žodžius"),
    solved: stoneLit,
    or: label("or", "arba"),
    speak: label("Say it back", "Pakartok balsu"),
    listening: label("Listening…", "Klausau…"),
    stopListening: label("Stop listening", "Baigti klausytis"),
    heard: (line: string) => label(`“${line}”`, `„${line}“`),
    missed: label("Try again, or choose a meaning.", "Pakartok arba pasirink reikšmę."),
    unrecorded: label("Read the words and choose what they mean.", "Perskaityk žodžius ir pasirink jų reikšmę."),
    replayUnavailable: label("Read the line again here.", "Čia gali dar kartą perskaityti frazę."),
    option: (index: number, meaning: string) => label(`Choice ${index}. ${meaning}`, `${index} pasirinkimas. ${meaning}`),
  },
  toast: {
    first: {
      title: label("You found Slate Cove Cave!", "Radai Skalūnų įlankos olą!"),
      body: label("Talk to Bram on the gray path.", "Pasikalbėk su Bramu ant pilkojo tako."),
    },
    returning: {
      title: label("Welcome back to the cave", "Smagu, kad sugrįžai į olą"),
      body: label("Follow the lights to pick up where you left off.", "Sek žiburėlius ir tęsk kelionę."),
    },
    bramLocked: {
      title: label("Bram keeps this gate", "Šiuos vartus saugo Bramas"),
      body: label("Talk to Bram first.", "Pirmiausia pasikalbėk su Bramu."),
    },
    fernLocked: {
      title: label("Fern keeps this bridge", "Šį tiltą saugo Ferna"),
      body: label("Try Fern's riddles before you cross.", "Pirma pamėgink įminti Fernos mįsles – tada pereisi tiltą."),
    },
    tideLocked: {
      title: gateClosed,
      body: label("Light all three stones in Tide Hall.", "Įžiebk visus tris Potvynių menės akmenis."),
    },
    rootLocked: {
      title: gateClosed,
      body: label("Light a stone in the Root Garden.", "Įžiebk akmenį Šaknų sode."),
    },
    oakLocked: {
      title: label("The Old Oak is asleep", "Senasis ąžuolas miega"),
      body: label("Light five different stones and cross Fern's bridge.", "Įžiebk penkis skirtingus akmenis ir pereik Fernos tiltą."),
    },
    bramPassed: {
      title: label("Bram opened the gate", "Bramas atvėrė vartus"),
      body: label("Follow the gray path to Tide Hall.", "Eik pilkuoju taku į Potvynių menę."),
    },
    fernPassed: {
      title: label("Fern let you pass", "Ferna leido pereiti"),
      body: label("Follow the bridge across the river.", "Pereik tiltą per upę."),
    },
    stoneLit: {
      title: stoneLit,
      body: (left: number) => left === 1
        ? label("1 stone left here.", "Čia liko 1 akmuo.")
        : label(`${left} stones left here.`, `Čia liko ${left} akmenys.`),
    },
    replayLit: {
      title: label("You heard a new line!", "Išgirdai naują frazę!"),
    },
    tideOpen: {
      title: label("All three stones are lit!", "Šviečia visi trys akmenys!"),
      body: label("The path to the Root Garden is open.", "Kelias į Šaknų sodą atviras."),
    },
    rootOpen: {
      title: label("The path is open!", "Kelias atviras!"),
      body: label("Follow the path to Fern's bridge.", "Eik taku iki Fernos tilto."),
    },
    oakAwoke: {
      title: label("The Old Oak woke up!", "Senasis ąžuolas pabudo!"),
      body: label("Five stones are lit. Find the Oak on its island.", "Šviečia penki akmenys. Saloje tavęs laukia ąžuolas."),
    },
    replayStart: {
      title: label("The stones speak again", "Akmenys vėl prabilo"),
      body: label("Listen for another line from each stone.", "Pasiklausyk, ką dar sako akmenys."),
    },
    replayDone: {
      title: label("You heard all 215 lines!", "Išgirdai visas 215 frazių!"),
      body: label("The stones are ready for another round.", "Akmenys pasiruošę prabilti iš naujo."),
    },
    exit: {
      title: label("Back on the trail", "Vėl ant tako"),
      body: label("Follow the trail back to town.", "Taku grįši į miestelį."),
    },
  },
  ending: {
    bram: label("Three stones are waiting in Tide Hall.", "Potvynių menėje tavęs laukia trys akmenys."),
    fern: label("The bridge is open. Follow the river path.", "Tiltas atviras. Eik taku palei upę."),
    oak: label("Follow the lights to the dry exit.", "Sek žiburėlius iki išėjimo į sausą taką."),
  },
} as const;
