// Conversation events that only change what the learner sees or hears, the same in the town and in light mode.
// Situations raise them with c.event(name, data); Game.ts and LightGame.ts add their own (rides, the map, payment).
import { audio } from "./audio";
import { useStore } from "../state/store";
import { NPCS } from "../content/npcs";

const who = (id?: string) => (id && NPCS[id]?.name) || "";

export function showConversationEvent(name: string, data: any) {
  const st = useStore.getState();
  switch (name) {
    // phone calls (P24, P26): dialing someone else, a call coming in, waiting on hold, a voicemail
    case "call": audio.sfx("ring"); st.toast({ kind: "info", title: `📞 ${data?.lt || `Skambini: ${who(data?.npc)}`}`, ms: 2600 }); break;
    case "incoming-call": audio.sfx("ring"); st.toast({ kind: "info", title: `📞 Skambina ${who(data?.npc)}`, ms: 2600 }); break;
    case "hold-music": st.toast({ kind: "info", title: "🎵 Laukiama ryšio…", ms: Math.max(2, Number(data?.seconds) || 3) * 1000 }); break;
    case "voicemail":
      if (data?.recording) st.toast({ kind: "info", title: "● Įrašoma žinutė", body: "Pasakyk visą žinutę: atsakymas bus, kai baigsi.", ms: 4500 });
      break;
    case "beep": audio.sfx("beep"); break;
    case "hang-up": audio.sfx("soft"); break;
    case "knock": audio.sfx("knock"); st.toast({ kind: "info", title: "🚪 Kažkas beldžiasi", ms: 2000 }); break;
    // the kitchen (P28): someone walks over, someone tastes in silence
    case "enter": if (data?.npc) st.toast({ kind: "info", title: `${who(data.npc)} prieina`, ms: 1800 }); break;
    case "taste": st.toast({ kind: "info", title: data?.by === "player" ? "🥄 Ragauji…" : `🥄 ${who(data?.by) || "Jis"} ragauja…`, ms: 1800 }); break;
    // how it ended, in a sentence (P24, P26)
    case "outro": if (data?.lt) st.toast({ kind: "info", title: String(data.lt), ms: 7000 }); break;
  }
}
