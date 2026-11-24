import { t } from "@/content/dsl";
import type { HintGroup } from "@/content/types";

const answers = {
  go_yes: t("Sí, | quiero | ir.", "Yes, | I-want | to-go.", "Yes, I'd like to go."),
  go_no: t("Hoy | no, | gracias.", "Today | no, | thanks.", "Not today, thanks."),
  want_fish: t("Quiero | ver | los | peces.", "I-want | to-see | the | fish.", "I'd like to see the fish."),
  want_turtles: t("Quiero | ver | las | tortugas.", "I-want | to-see | the | turtles.", "I'd like to see the turtles."),
  see_yes: t("Sí, | los | veo.", "Yes, | them | I-see.", "Yes, I see them.", {
    flags: { 1: "Here los means “them” and stands for los peces." },
  }),
  see_where: t("¿Dónde | están?", "Where | are-they?", "Where are they?"),
  see_one: t("Veo | una.", "I-see | one.", "I see one."),
  see_two: t("Veo | dos.", "I-see | two.", "I see two."),
};

export const CENOTE_HINTS = {
  invite: { lt: "Answer the invitation", items: [{ id: "go_yes", s: answers.go_yes }, { id: "go_no", s: answers.go_no }] },
  interest: { lt: "Say what you'd like to see", items: [{ id: "want_fish", s: answers.want_fish }, { id: "want_turtles", s: answers.want_turtles }] },
  spot: { lt: "Spot the fish", items: [{ id: "see_yes", s: answers.see_yes }, { id: "see_where", s: answers.see_where }] },
  count: { lt: "Count the turtles", items: [{ id: "see_one", s: answers.see_one }, { id: "see_two", s: answers.see_two }] },
} satisfies Record<string, HintGroup>;

/** Extra readings for the two response gates. ModeDialogue also accepts the composed example for each key. */
export const CENOTE_TOUR_ACCEPT = {
  see_yes: ["sí", "sí, claro", "sí los veo", "los veo", "ya los veo", "sí, veo los peces"],
  see_where: ["¿dónde?", "¿en dónde?", "¿en dónde están?", "¿dónde están los peces?", "¿por dónde?", "no", "no los veo", "no, ¿dónde?"],
  see_one: ["una", "uno", "solo una", "nomás una", "veo una tortuga", "solo veo una", "nada más veo una"],
  see_two: ["dos", "las dos", "veo las dos", "veo dos tortugas", "hay dos", "sí, las dos"],
} satisfies Record<string, readonly string[]>;

export const CENOTE_TOUR_LINES = {
  ct_fresh: [t("Mire, | bajo | la | plataforma | hay | agua | dulce | y | clara.", "Look, | under | the | deck | there's | water | fresh | and | clear.", "Look, there's clear fresh water under the deck.")],
  ct_walk: [t("Ahora | vamos | a | pie | hasta | la | bahía.", "Now | let's-go | on | foot | to | the | bay.", "Now let's walk to the bay.")],
  ct_fish: [t("Mire, | ahí | van | los | peces | juntos.", "Look, | there | they-go | the | fish | together.", "Look, the fish are swimming together.")],
  ct_see: [t("¿Ve | los | peces?", "Do-you-see | the | fish?", "Can you see the fish?")],
  ct_together: [t("Mire | cómo | giran | todos | juntos.", "Look-at | how | they-turn | all | together.", "Look how they all turn together.")],
  ct_ahead: [t("Mire, | ahí | enfrente.", "Look, | there | ahead.", "Look, right up ahead.")],
  ct_turtle: [t("Mire, | ahí | va | una | tortuga | marina.", "Look, | there | goes | a | turtle | sea.", "Look, there's a sea turtle.")],
  ct_howmany: [t("¿Cuántas | tortugas | ve?", "How-many | turtles | do-you-see?", "How many turtles can you see?")],
  ct_second: [t("Mire, | hay | otra | tortuga.", "Look, | there-is | another | turtle.", "Look, there’s another turtle.")],
  ct_pair: [t("Las | dos | se deslizan | juntas.", "The | two | glide | together.", "They're gliding side by side.")],
  ct_back: [t("Volvamos | a | la | orilla.", "Let's-go-back | to | the | shore.", "Let's head back to shore.")],
  ct_home: [t("Ya | estamos | en | la | caseta. | Gracias | por | venir.", "Now | we're | at | the | hut. | Thanks | for | coming.", "We're back at the hut. Thanks for coming.")],
  go_yes: [answers.go_yes],
  go_no: [answers.go_no],
  want_fish: [answers.want_fish],
  want_turtles: [answers.want_turtles],
  see_yes: [answers.see_yes],
  see_where: [answers.see_where],
  see_one: [answers.see_one],
  see_two: [answers.see_two],
};
