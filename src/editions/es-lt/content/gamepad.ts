import { t } from "@/content/dsl";
import { PAD_LINES as ES_PAD_LINES } from "../../es/content/gamepad";
import { sentKey, type SentLt } from "../../es/learner/walk";
import table from "../tables/ui-gamepad.json";

const translations: Record<string, SentLt | undefined> = table.sent;

export const PAD_LINES = Object.fromEntries(
  Object.entries(ES_PAD_LINES).map(([id, source]) => {
    const translation = translations[sentKey(source.en, source.lt, source.nat)];
    if (!translation) throw new Error(`Missing Lithuanian gamepad translation for PAD_LINES.${id}`);
    return [id, t(source.en, translation.gloss, translation.nat)];
  }),
) as typeof ES_PAD_LINES;
