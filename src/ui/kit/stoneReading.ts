import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { ipaForSentence } from "../../convo/ipa";
import { useStore } from "../../state/store";
import { HL, TL } from "../i18n";
import { Icon } from "../icons";
import { Interlinear } from "../Interlinear";
import { resolvePhrase } from "./phraseLine";
import { PhraseSave } from "./PhraseSave";

type ReadingSetting = "lt" | "ltNatural" | "ipa";

// Supply the conversation primitives from the caller so lazy readers can use them without splitting the startup graph.
export const stoneReading = {
  labels: PHRASE_CARD_UI, targetLang: TL, helperLang: HL,
  Icon, Interlinear, PhraseSave, resolvePhrase, ipaForSentence,
  useSetting(key: ReadingSetting) { return useStore((s) => s.settings[key]); },
  toggle(key: ReadingSetting) {
    const { settings, setSettings } = useStore.getState();
    setSettings({ [key]: !settings[key] });
  },
};

export type StoneReading = typeof stoneReading;
