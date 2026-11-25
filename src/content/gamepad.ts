import { t } from "./dsl";
import type { SentSrc } from "./types";

type PadLineKey = "connected" | "disconnected" | "move" | "look" | "jump" | "interact" | "choose" | "back";

export const PAD_LINES: Record<PadLineKey, SentSrc> = {
  connected: t("Controller | connected", "Valdiklis | prijungtas", "Valdiklis prijungtas"),
  disconnected: t("Controller | disconnected", "Valdiklis | atjungtas", "Valdiklis atsijungė"),
  move: t("Move", "Judėti", "Judėti"),
  look: t("Look", "Žiūrėti", "Apsidairyti"),
  jump: t("Jump", "Šokti", "Pašokti"),
  interact: t("Use", "Naudoti", "Naudoti"),
  choose: t("Choose", "Pasirinkti", "Pasirinkti"),
  back: t("Go back", "Grįžti", "Grįžti"),
};
