import { t } from "../dsl";
import { GLOBAL } from "../global";
import { KEEPER_NPC, KEEPER_TITLE } from "../keeper";
import type { Ctx, HintGroup, SituationDef, StepDef } from "../types";

type KeeperStep = "life" | "light" | "routine" | "storm" | "gift";

const routineNote = "The first ‘do’ forms the question. The second ‘do’ means ‘darote’.";

const hints: Record<KeeperStep, HintGroup> = {
  life: { lt: "Paklausti apie gyvenimą saloje", items: [
    { id: "k_home", s: t("Do | you | live | on the island?", "Ar | Jūs | gyvenate | saloje?", "Ar gyvenate saloje?") },
    { id: "k_company", s: t("Is | it | quiet | here?", "Ar yra | — | tylu | čia?", "Ar čia tylu?",
      { flags: { 1: "Here, ‘it’ has no Lithuanian equivalent." } }) },
  ] },
  light: { lt: "Paklausti apie švyturio šviesą", items: [
    { id: "k_turn", s: t("Does | the | light | turn?", "Ar | — | šviesa | sukasi?", "Ar šviesa sukasi?") },
    { id: "k_boats", s: t("How | does | it | help | boats?", "Kaip | — | ji | padeda | laivams?", "Kaip šviesa padeda laivams?",
      { flags: { 1: "‘Does’ helps form a question." } }) },
  ] },
  routine: { lt: "Paklausti apie darbą", items: [
    { id: "k_morning", s: t("What | do | you | do | every | morning?", "Ką | — | Jūs | darote | kiekvieną | rytą?", "Ką darote kiekvieną rytą?",
      { flags: { 1: routineNote } }) },
    { id: "k_night", s: t("What | do | you | do | before | dark?", "Ką | — | Jūs | darote | prieš | sutemstant?", "Ką darote prieš sutemstant?",
      { flags: { 1: routineNote } }) },
  ] },
  storm: { lt: "Paklausti apie audrą", items: [
    { id: "k_stay", s: t("Where | did | you | stay?", "Kur | — | Jūs | likote?", "Kur likote per audrą?",
      { flags: { 1: "‘Did’ marks the past. In Lithuanian the verb form carries that meaning." } }) },
    { id: "k_light_on", s: t("Did | the | light | stay on?", "Ar | — | šviesa | tebeveikė?", "Ar šviesa vis dar veikė?") },
  ] },
  gift: { lt: "Priimti raštelį", items: [
    { id: "k_keep", s: t("I'll keep | it, | thanks.", "Pasiliksiu | jį, | ačiū.", "Pasiliksiu, ačiū.") },
    { id: "k_draw", s: t("Did | you | draw | it | yourself? | I'll take | it, | thanks.",
      "Ar | Jūs | nupiešėte | tai | pats? | Paimsiu | jį, | ačiū.", "Ar pats nupiešėte? Paimsiu, ačiū.") },
  ] },
};

function step(id: KeeperStep, label: string, suggestion: string, expects: string[], ask: StepDef["ask"]): StepDef & { label: string } {
  return { id, label, expects, ask, done: (c) => !!c.s[id], hints: [id], suggest: [{ lt: suggestion, hint: id }] };
}

const steps = [
  step("life", "Gyvenimas saloje", "Paklauskite apie gyvenimą saloje", ["k_home_ctx", "k_company_ctx"], (c) => c.say("k_life_ask")),
  step("light", "Švyturio šviesa", "Paklauskite apie švyturio šviesą", ["k_turn_ctx", "k_boats_ctx"], (c) => c.say("k_light_ask")),
  step("routine", "Kasdieniai darbai", "Paklauskite apie darbą", ["k_morning_ctx", "k_night_ctx"], (c) => c.say("k_routine_ask")),
  step("storm", "Paskutinė audra", "Paklauskite apie audrą", ["k_stay_ctx", "k_light_on_ctx"], (c) => c.say("k_storm_ask")),
  step("gift", "Raštelis atminimui", "Priimkite raštelį", ["k_keep_ctx", "k_draw_ctx"], (c) => { c.say("k_note"); c.say("k_offer"); }),
];

function answer(c: Ctx, id: KeeperStep, reply: string) {
  if (c.step !== id || c.s[id] || c.s.ended) return;
  c.s[id] = reply;
  c.say(reply);
  if (id === "gift") {
    c.s.ended = true;
    c.say("k_bye");
    c.complete();
    c.end();
    c.hold();
  }
}

const lighthouseKeeper: SituationDef = {
  id: "x05-lighthouse-keeper",
  bonus: true,
  optionalVoice: true,
  song: "",
  songTitle: "",
  title: KEEPER_TITLE,
  topic: { en: "Life at the lighthouse", lt: "Gyvenimas prie švyturio" },
  chapter: 9,
  order: 12,
  location: "lighthouse",
  npc: KEEPER_NPC,
  mode: "talk",
  goal: "Paklauskite prižiūrėtojo apie gyvenimą saloje, jo darbą ir audrą. Pasiimkite jo raštelį atminimui.",
  intro: "Prie namelio durų Jus pasitinka švyturio prižiūrėtojas. Šalia stovi suolas.",

  merges: {
    "stay on": { reason: "lexical_expression", split: "Stay → likti and on → ant would put the light somewhere. The expression means continuing to work.", minimal: "The light itself stands outside the verb and particle." },
  },

  lines: {
    k_welcome: [t("Hello. | Have a seat | by | the | door.", "Sveiki. | Prisėskite | prie | — | durų.", "Sveiki. Prisėskite prie durų.")],
    k_again: [t("Hello | again. | Have a seat.", "Sveiki | dar kartą. | Prisėskite.", "Sveiki dar kartą. Prisėskite.")],
    k_life_ask: [t("Ask | me | about | life | here.", "Paklauskite | manęs | apie | gyvenimą | čia.", "Klauskite apie gyvenimą saloje.")],
    k_home_reply: [t("This | cottage | is | my | home | all | year.", "Šis | namelis | yra | mano | namai | visus | metus.", "Šiame namelyje gyvenu visus metus.")],
    k_company_reply: [t("It's | quiet | until | the | gulls | wake | me. | They | never | miss | a | morning.",
      "Yra | tylu, | kol | — | kirai | pažadina | mane. | Jie | niekada | nepraleidžia | — | ryto.",
      "Čia tylu, kol kirai mane pažadina. Nė vieno ryto nepraleidžia.")],
    k_light_ask: [t("See | that | tower? | Ask | me | about | the | light.", "Matote | tą | bokštą? | Paklauskite | manęs | apie | — | šviesą.", "Matote tą bokštą? Klauskite apie šviesą.")],
    k_turn_reply: [t("The | light | turns | slowly, | so | people | on boats | see | a | flash.",
      "— | šviesa | sukasi | lėtai, | todėl | žmonės | laivuose | mato | — | blyksnį.", "Šviesa sukasi lėtai, todėl žmonės laivuose mato blyksnį.")],
    k_boats_reply: [t("People | on boats | see | the | flash. | It | shows | them | where | the | rocks | are.",
      "Žmonės | laivuose | mato | — | blyksnį. | Jis | parodo | jiems, | kur | — | uolos | yra.", "Laivuose žmonės pamato blyksnį. Jis parodo, kur yra uolos.")],
    k_routine_ask: [t("Want | to hear | about | my | work?", "Norite | išgirsti | apie | mano | darbą?", "Norite išgirsti apie mano darbą?")],
    k_morning_reply: [t("I | clean | the | glass | every | morning. | I | check | the | light | before | dark.",
      "Aš | valau | — | stiklą | kiekvieną | rytą. | Aš | patikrinu | — | šviesą | prieš | sutemstant.", "Kas rytą nuvalau stiklą. Prieš sutemstant patikrinu šviesą.")],
    k_night_reply: [t("I | check | the | light | before | dark. | I | clean | the | glass | every | morning.",
      "Aš | patikrinu | — | šviesą | prieš | sutemstant. | Aš | valau | — | stiklą | kiekvieną | rytą.", "Prieš sutemstant patikrinu šviesą. Kas rytą nuvalau stiklą.")],
    k_storm_ask: [t("The | wind | shook | my | door | in | the | last | storm. | Ask | me | about | that | day.",
      "— | vėjas | purtė | mano | duris | per | — | paskutinę | audrą. | Paklauskite | manęs | apie | tą | dieną.", "Per paskutinę audrą vėjas purtė duris. Klauskite apie tą dieną.")],
    k_stay_reply: [t("I | stayed | inside. | I | checked | the | light | again | and | again.",
      "Aš | likau | viduje. | Aš | tikrinau | — | šviesą | vėl | ir | vėl.", "Likau viduje. Vis tikrinau, ar šviesa dega.")],
    k_storm_light_reply: [t("Yes. | I | could | still | see | the | flash | through | the | rain.",
      "Taip. | Aš | galėjau | vis dar | matyti | — | blyksnį | pro | — | lietų.", "Taip. Blyksnį mačiau net per lietų.")],
    k_note: [t("Look | at | this | little | yellow | note. | I | drew | the | lighthouse | on | it.",
      "Pažiūrėkite | į | šį | mažą | geltoną | raštelį. | Aš | nupiešiau | — | švyturį | ant | jo.", "Pažiūrėkite į šį mažą geltoną raštelį. Ant jo nupiešiau švyturį.")],
    k_offer: [t("You | can | keep | it | to remember | your | visit.",
      "Jūs | galite | pasilikti | jį | kad prisimintumėte | savo | viešnagę.", "Čia Jums – kad prisimintumėte viešnagę.")],
    k_keep_reply: [t("Here you go. | I | hope | you | like | it.", "Prašom. | Aš | tikiuosi | Jums | patiks | jis.", "Prašom. Tikiuosi, Jums patiks.")],
    k_draw_reply: [t("I | did. | Here, | it's | yours.", "Aš | nupiešiau. | Štai, | tai yra | Jūsų.", "Taip, aš. Štai, čia Jums.")],
    k_bye: [t("Have | a | good | trip | back!", "Linkiu | — | geros | kelionės | atgal!", "Geros kelionės atgal!")],
    k_later: [t("Come | back | anytime.", "Užsukite | vėl | kada tik norite.", "Užsukite, kada panorėsite.")],
  },

  hints,
  steps,
  mission: steps.map(({ id, label }) => ({ step: id, lt: label })),
  intents: {
    k_home_ctx: { patterns: [
      "do you live (here | on the island | on this island | in (this | the) cottage | here all year) #h:k_home",
      "(is this your home | is this where you live | do you live here year round | you live here | your home) #h:k_home",
    ] },
    k_company_ctx: { patterns: [
      "is it (quiet | peaceful) [here | on the island] #h:k_company",
      "(quiet here | is this a quiet place | is the island quiet | it is quiet here) #h:k_company",
    ] },
    k_turn_ctx: { patterns: [
      "does (the light | it) (turn | spin | go around | move) #h:k_turn",
      "(is the light turning | does the light go round | does the light turn around | the light turns) #h:k_turn",
    ] },
    k_boats_ctx: { patterns: [
      "how does (it | the light | the lighthouse) help (boats | ships) #h:k_boats",
      "(how does the light help | how do boats see the light | what is the light for | how does that help boats) #h:k_boats",
    ] },
    k_morning_ctx: { patterns: [
      "what do you do (every morning | in the morning | each morning | in the mornings) #h:k_morning",
      "(what is your morning job | what is your morning routine | what about the morning | in the morning) #h:k_morning",
    ] },
    k_night_ctx: { patterns: [
      "what do you do (before (dark | sunset | night) | in the evening | at night) #h:k_night",
      "(do you check the light at night | what about before dark | before dark) #h:k_night",
    ] },
    k_stay_ctx: { patterns: [
      "where did you (stay | go | wait) [during the storm | in the storm] #h:k_stay",
      "(did you stay inside | were you inside | did you stay in the cottage | where were you | inside the cottage) #h:k_stay",
    ] },
    k_light_on_ctx: { patterns: [
      "did (the light | it) (stay on | keep (working | flashing) | still work) [in the storm | during the storm] #h:k_light_on",
      "(was the light still on | was it still on | did the light work | was the light on | still on) #h:k_light_on",
    ] },
    k_keep_ctx: { patterns: [
      "(i will (keep | take) it | i would like (it | the note) | (can | may) i keep it) [thanks | thank you] #h:k_keep",
      "(yes please | yes thank you | yes thanks | sure thanks) #h:k_keep",
    ] },
    k_draw_ctx: { patterns: [
      "(did you draw (it | this | that) [yourself] | did you make the drawing | is this your drawing) (i will (take | keep) it | i would love it | yes please) [thanks | thank you] #h:k_draw",
    ] },
    g_bye: { patterns: [
      ...GLOBAL.intents.g_bye.patterns.filter((pattern) => pattern !== "you too"),
      "#leaving maybe another time",
    ] },
  },
  start(c) { c.say(c.visits ? "k_again" : "k_welcome"); },
  handlers: {
    k_home_ctx: (c) => answer(c, "life", "k_home_reply"),
    k_company_ctx: (c) => answer(c, "life", "k_company_reply"),
    k_turn_ctx: (c) => answer(c, "light", "k_turn_reply"),
    k_boats_ctx: (c) => answer(c, "light", "k_boats_reply"),
    k_morning_ctx: (c) => answer(c, "routine", "k_morning_reply"),
    k_night_ctx: (c) => answer(c, "routine", "k_night_reply"),
    k_stay_ctx: (c) => answer(c, "storm", "k_stay_reply"),
    k_light_on_ctx: (c) => answer(c, "storm", "k_storm_light_reply"),
    k_keep_ctx: (c) => answer(c, "gift", "k_keep_reply"),
    k_draw_ctx: (c) => answer(c, "gift", "k_draw_reply"),
    g_bye(c) {
      if (!c.step || c.s.ended) return;
      c.s.ended = true;
      c.say("k_later");
      c.end();
      c.hold();
    },
  },
  tests: [
    { step: "life", say: "Do you live on the island?", intent: "k_home_ctx" },
    { step: "life", say: "Is this where you live?", intent: "k_home_ctx" },
    { step: "life", say: "Is it quiet here?", intent: "k_company_ctx" },
    { step: "life", say: "Is it peaceful on the island?", intent: "k_company_ctx" },
    { step: "light", say: "Does the light turn?", intent: "k_turn_ctx" },
    { step: "light", say: "Does it spin?", intent: "k_turn_ctx" },
    { step: "light", say: "How does it help boats?", intent: "k_boats_ctx" },
    { step: "light", say: "What's the light for?", intent: "k_boats_ctx" },
    { step: "routine", say: "What do you do every morning?", intent: "k_morning_ctx" },
    { step: "routine", say: "In the morning?", intent: "k_morning_ctx" },
    { step: "routine", say: "What do you do before dark?", intent: "k_night_ctx" },
    { step: "routine", say: "Before dark?", intent: "k_night_ctx" },
    { step: "storm", say: "Where did you stay?", intent: "k_stay_ctx" },
    { step: "storm", say: "Were you inside?", intent: "k_stay_ctx" },
    { step: "storm", say: "Did the light stay on?", intent: "k_light_on_ctx" },
    { step: "storm", say: "Was it still on?", intent: "k_light_on_ctx" },
    { step: "gift", say: "I'll keep it, thanks.", intent: "k_keep_ctx" },
    { step: "gift", say: "Yes, please.", intent: "k_keep_ctx" },
    { step: "gift", say: "Did you draw it yourself? I'll take it, thanks.", intent: "k_draw_ctx", not: ["k_keep_ctx"] },
    { step: "gift", say: "Is this your drawing? I'd love it.", intent: "k_draw_ctx", not: ["k_keep_ctx"] },
    { step: "life", say: "Goodbye.", intent: "g_bye" },
    { step: "gift", say: "Maybe another time.", intent: "g_bye" },
    { step: "light", say: "Could you say that again?", intent: "g_repeat" },
    { step: "routine", say: "I don't understand.", intent: "g_dont_understand" },
    { step: "life", say: "Does the light turn?", intent: "none" },
    { step: "storm", say: "I'll keep it, thanks.", intent: "none" },
    { step: "gift", say: "I don't want it.", intent: "none" },
    { step: "gift", say: "Did you draw it? I won't take it.", intent: "none" },
    { step: "light", say: "The light doesn't turn.", intent: "none" },
    { step: "routine", say: "Purple refrigerator.", intent: "none" },
  ],
  sims: [
    { name: "cottage, turning light, morning, inside, keeps note",
      turns: ["Do you live on the island?", "Does the light turn?", "What do you do every morning?", "Where did you stay?", "I'll keep it, thanks."],
      expect: { complete: true, state: { life: "k_home_reply", light: "k_turn_reply", routine: "k_morning_reply", storm: "k_stay_reply", gift: "k_keep_reply" } } },
    { name: "quiet, boats, before dark, light on, asks about drawing",
      turns: ["Is it quiet here?", "How does it help boats?", "What do you do before dark?", "Did the light stay on?", "Did you draw it yourself? I'll take it, thanks."],
      expect: { complete: true, state: { life: "k_company_reply", light: "k_boats_reply", routine: "k_night_reply", storm: "k_storm_light_reply", gift: "k_draw_reply" } } },
    { name: "return and short questions, with repeat and clarification",
      turns: ["Quiet here?", "Could you say that again?", "Does it spin?", "Before dark?", "I don't understand.", "Were you inside?", "Yes, please."],
      expect: { complete: true, state: { life: "k_company_reply", light: "k_turn_reply", routine: "k_night_reply", storm: "k_stay_reply", gift: "k_keep_reply" } } },
    { name: "goodbye at the door", turns: ["Goodbye."],
      expect: { complete: false, state: { ended: true } } },
    { name: "leaves without the note",
      turns: ["Is this where you live?", "What's the light for?", "In the morning?", "Was it still on?", "Maybe another time."],
      expect: { complete: false, state: { storm: "k_storm_light_reply", ended: true } } },
  ],
};

export default lighthouseKeeper;
