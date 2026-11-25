import { t } from "@/content/dsl";
import type { PAD_LINES as DefaultPadLines } from "@/content/gamepad";
import type { SentSrc } from "@/content/types";

export const PAD_LINES: Record<keyof typeof DefaultPadLines, SentSrc> = {
  connected: t("Control | conectado", "Controller | connected", "Controller connected"),
  disconnected: t("Control | desconectado", "Controller | disconnected", "Controller disconnected"),
  move: t("Moverse", "Move", "Move"),
  look: t("Mirar alrededor", "Look around", "Look around"),
  jump: t("Saltar", "Jump", "Jump"),
  interact: t("Usar", "Use", "Use"),
  choose: t("Elegir", "Choose", "Choose"),
  back: t("Volver", "Go back", "Go back"),
};
