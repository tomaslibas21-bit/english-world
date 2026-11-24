import { t } from "@/content/dsl";
import type { Ctx, SituationDef } from "@/content/types";
import { foldAccents } from "@/convo/normalize";
import { CENOTE_HINTS, CENOTE_TOUR_LINES } from "../cenote-tour-lines";

const readinessIntents = ["go_yes", "go_no"];

function accept(c: Ctx) {
  if (c.s.closed) return;
  // A positive fragment can follow a recognized "no" in the same utterance.
  if (/\bno\b/i.test(c.heard)) return;
  if (c.step === "invite") c.s.invited = true;
  if (c.step === "ready") c.s.ready = true;
}

function leave(c: Ctx) {
  if (c.s.closed) return;
  c.s.closed = true;
  c.say("later");
  c.end();
  c.hold();
}

function decline(c: Ctx) {
  if (c.step === "invite" || c.step === "ready") leave(c);
}

function interest(c: Ctx, plan: "fish_plan" | "turtle_plan") {
  if (c.step !== "interest" || c.s.plan || c.s.closed) return;
  c.s.plan = plan;
  c.say(plan);
}

const cenote: SituationDef = {
  id: "x14-cenote",
  bonus: true,
  optionalVoice: true,
  mode: "talk",
  chapter: 9,
  order: 12,
  song: "",
  songTitle: "",
  title: { en: "Cenote Ka'an", lt: "At Cenote Ka'an" },
  topic: { en: "Snorkel en la bahía", lt: "Snorkel in the bay" },
  location: "cenote-tour",
  npc: "ines",
  goal: "Tell Inés what you'd like to see in the bay and decide if you want to go.",
  intro: "You meet Inés by the hut at Cenote Ka'an. She has a snorkel mask for you and knows the path to the bay.",

  intents: {
    go_yes: { patterns: [
      "[si] [claro] [yo] (quiero | me gustaria) (ir | venir | salir | acompanarla | hacer snorkel) [con usted] [ahora | ahorita] #h:go_yes",
      "[si] [claro] (vamos | vamonos) [ahora | ahorita] #h:go_yes",
    ] },
    go_no: { patterns: [
      "(hoy | ahora | ahorita | por ahora) no [gracias] #h:go_no",
      "no (hoy | ahora | ahorita | por ahora) [gracias] #h:go_no",
      "no [yo] (quiero | puedo) (ir | venir | salir | hacer snorkel) [ahora | ahorita | hoy] [gracias] #h:go_no",
      "[no] [mejor] (otro dia | en otra ocasion | mas tarde | luego) [gracias] #h:go_no",
      "(gracias pero no | no por el momento) #h:go_no",
    ] },
    want_fish: { patterns: [
      "[yo] (quiero | me gustaria | quisiera | prefiero) ver [los | unos] peces [por favor] #h:want_fish",
      "[los | unos] peces [por favor] #h:want_fish",
    ] },
    want_turtles: { patterns: [
      "[yo] (quiero | me gustaria | quisiera | prefiero) ver [las | unas] tortugas [marinas] [por favor] #h:want_turtles",
      "[las | unas] tortugas [marinas] [por favor] #h:want_turtles",
    ] },
  },

  lines: {
    greet: [t("Soy | Inés. | ¿Quiere | venir | a | hacer | snorkel | un | rato?", "I'm | Inés. | Would-you-like | to-come | to | do | snorkeling | a | bit?", "I'm Inés. Would you like to come snorkeling for a bit?")],
    again: [t("¡Qué | gusto | verle | de nuevo! | ¿Quiere | venir | a | hacer | snorkel?", "How | nice | to-see-you | again! | Would-you-like | to-come | to | do | snorkeling?", "Good to see you again! Would you like to come snorkeling?")],
    ask_interest: [t("¿Qué | le | gustaría | ver?", "What | to-you | would-be-pleasing | to-see?", "What would you like to see?")],
    fish_plan: [t("En | la | bahía | nadan | peces | en | grupo.", "In | the | bay | swim | fish | in | a-group.", "Fish swim in groups in the bay.")],
    turtle_plan: [t("En | la | bahía | hay | tortugas | marinas.", "In | the | bay | there-are | turtles | sea.", "There are sea turtles in the bay.")],
    ask_ready: [t("Aquí | tiene | la | máscara. | ¿Quiere | salir | ahora?", "Here | you-have | the | mask. | Do-you-want | to-head-out | now?", "Here's the mask. Would you like to go now?")],
    meet_deck: [t("Venga | a | la | plataforma | del | cenote.", "Come | to | the | deck | of-the | cenote.", "Come to the cenote deck.")],
    later: [t("Claro. | Hasta luego.", "Of-course. | See-you-later.", "Of course. See you later.")],
    g_not_understood: [t("¿Puede | decirlo | de nuevo?", "Could-you | say-it | again?", "Could you say that again?")],
    ...CENOTE_TOUR_LINES,
  },
  hints: CENOTE_HINTS,
  mission: [
    { step: "invite", lt: "Answer Inés's invitation" },
    { step: "interest", lt: "Tell Inés what you'd like to see" },
    { step: "ready", lt: "Say if you'd like to go now" },
  ],
  steps: [
    { id: "invite", done: (c) => !!c.s.invited, ask: (c) => c.say(c.visits || c.memory.metInes ? "again" : "greet"),
      expects: readinessIntents, suggest: [{ lt: "Answer the invitation", hint: "invite" }], yes: accept, no: decline },
    { id: "interest", done: (c) => !!c.s.plan, ask: (c) => c.say("ask_interest"),
      expects: ["want_fish", "want_turtles"], suggest: [{ lt: "Say what you'd like to see", hint: "interest" }] },
    { id: "ready", done: (c) => !!c.s.ready, ask: (c) => c.say("ask_ready"),
      expects: readinessIntents, suggest: [{ lt: "Decide whether to go now", hint: "invite" }],
      hints: ["invite", "spot", "count"], yes: accept, no: decline },
  ],
  handlers: {
    go_yes: accept,
    go_no: decline,
    want_fish: (c) => interest(c, "fish_plan"),
    want_turtles: (c) => interest(c, "turtle_plan"),
    g_bye(c) {
      // Courtesy replies to a good wish use the same global intent as an actual goodbye.
      const words = foldAccents(c.heard).toLowerCase().match(/[a-z]+/g)?.join(" ");
      if (words && /^(?:(?:muchas )?gracias )?(?:igualmente|usted tambien|tu tambien)(?: (?:muchas )?gracias)?$/.test(words)) return;
      leave(c);
    },
  },
  start(c) {
    c.remember({ metInes: true });
    c.ask("invite");
  },
  finish(c) {
    if (!c.s.ready || c.s.closed) return;
    c.s.closed = true;
    c.say("meet_deck");
    c.event("cenote-tour");
    c.complete();
    c.end();
  },

  tests: [
    { say: "Sí, quiero ir.", intent: "go_yes", step: "invite" },
    { say: "¿Puede repetir?", intent: "g_repeat", step: "invite" },
    { say: "Hoy no, gracias.", intent: "go_no", step: "invite" },
    { say: "Quiero ver los peces.", intent: "want_fish", step: "interest" },
    { say: "Quiero ver las tortugas.", intent: "want_turtles", step: "interest" },
    { say: "Las tortugas marinas", intent: "want_turtles", step: "interest" },
    { say: "Claro, vamos.", intent: "go_yes", step: "ready" },
    { say: "Ahorita no, gracias", intent: "go_no", step: "ready", not: ["go_yes"] },
    { say: "No quiero ir.", intent: "go_no", step: "ready", not: ["go_yes"] },
    { say: "Mi ventana es cuadrada.", intent: "none", step: "ready" },
    { say: "Hasta luego.", intent: "g_bye", step: "interest" },
  ],
  sims: [
    { name: "yes, fish, ready", turns: ["Sí, quiero ir.", "Quiero ver los peces.", "Sí."],
      expect: { complete: true, state: { invited: true, plan: "fish_plan", ready: true } } },
    { name: "yes, turtles, ready", turns: ["Claro, vamos.", "Las tortugas marinas", "Sí, quiero ir."],
      expect: { complete: true, state: { invited: true, plan: "turtle_plan", ready: true } } },
    { name: "decline the invitation", turns: ["Hoy no, gracias."], expect: { complete: false, state: { closed: true } } },
    { name: "decline after choosing", turns: ["Sí.", "Quiero ver los peces.", "No."],
      expect: { complete: false, state: { plan: "fish_plan", closed: true } } },
    { name: "ask for a repeat", turns: ["¿Puede repetir?", "Sí.", "Quiero ver las tortugas.", "¿Puede repetir?", "Sí."],
      expect: { complete: true, state: { plan: "turtle_plan", ready: true } } },
    { name: "unrelated twice, ask for help, then decline", turns: ["Mi ventana es cuadrada.", "Mi ventana es cuadrada.", "No entiendo.", "Hoy no, gracias."],
      expect: { complete: false, state: { closed: true } } },
    { name: "goodbye while talking about the bay", turns: ["Sí.", "Hasta luego."],
      expect: { complete: false, state: { invited: true, closed: true } } },
  ],
};

export default cenote;
