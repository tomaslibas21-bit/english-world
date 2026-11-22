import { t } from "@/content/dsl";

export const nameHint = () => t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.");
export const countryHint = () => t("Soy | de | {X}.", "I'm | from | {X}.", "I'm from {X}.");
