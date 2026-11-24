// Served by Vite. These imports go through the same edition and learner overlays as the game.
import { ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_SITUATION, ASK_WAY_UI } from "../../../src/content/ask-way-lines.ts";
import { BILLIARDS_LINES, BILLIARDS_NPC, BILLIARDS_SITUATION, REPLY_KEYS } from "../../../src/content/billiards-lines.ts";
import { GLOBAL_HINTS } from "../../../src/content/global.ts";
import { KIND, keepsakeFor } from "../../../src/content/keepsakes.ts";
import { LOCATIONS } from "../../../src/content/locations.ts";
import { PHOTO_THINGS, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION, PHOTO_WALK_UI } from "../../../src/content/photo-walk-lines.ts";
import { ROAD_UI } from "../../../src/content/road.ts";
import { SAY_IT_UI } from "../../../src/content/say-it.ts";
import { loadSituation, SITUATION_BY_ID } from "../../../src/content/situations/catalog.ts";
import { coachVoice } from "../../../src/content/voices.ts";
import { addressInformal, compose } from "../../../src/convo/compose.ts";
import { entityLookup } from "../../../src/convo/suggest.ts";
import { NPCS } from "../../../src/content/npcs.ts";
import { EDITION } from "../../../src/edition.ts";
import { conversationLine } from "../../../src/game/kit/lines.ts";
import { PARKED_CARS } from "../../../src/game/world/layout.ts";
import { HL, L, TL } from "../../../src/ui/i18n.ts";
import { objectiveLabels } from "../../../src/ui/objective.ts";
import { STRINGS } from "../../../src/ui/strings.ts";

export { EDITION, HL, L, TL, objectiveLabels };

const labels = (words) => Object.fromEntries(Object.entries(words).map(([key, value]) => [key, L(value)]));
const hintSource = (group, id) => group.items.find((item) => item.id === id).s;
const plain = (source) => source.en.replaceAll(" | ", " ");

export async function photoWalkContent() {
  const sit = await loadSituation(PHOTO_WALK_SITUATION);
  const mailbox = PHOTO_THINGS.find(({ id }) => id === "mailbox");
  return {
    npc: PHOTO_WALK_NPC, situation: sit.id, things: PHOTO_THINGS.map(({ id }) => id),
    accept: plain(hintSource(sit.hints.help, "h_sure")), later: plain(hintSource(sit.hints.help, "h_later")),
    spokenName: mailbox.say[0],
    name: conversationLine(sit.id, PHOTO_WALK_NPC, "pw_n_mailbox", undefined, false),
    words: {
      ...labels(PHOTO_WALK_UI),
      quit: STRINGS[`photowalk:${PHOTO_WALK_UI.quit}`] ?? L(PHOTO_WALK_UI.quit),
      found: L(PHOTO_WALK_UI.found, { n: 1, of: PHOTO_THINGS.length }),
    },
  };
}

export async function directionsContent() {
  const sit = await loadSituation(ASK_WAY_SITUATION);
  const { id, location, lines } = ASK_WAY_PLACES[0];
  const place = LOCATIONS[location].lt;
  return {
    npc: ASK_WAY_NPC, situation: sit.id, title: sit.title.en, destination: id, location, place,
    lines: lines.map((key) => ({ key, ...conversationLine(sit.id, ASK_WAY_NPC, key, undefined, false) })),
    ask: plain(hintSource(sit.hints.where, `h_${id}`)), thank: plain(hintSource(sit.hints.thanks, "h_thanks")),
    words: { ...labels(ASK_WAY_UI), to: L(ASK_WAY_UI.to, { place }) },
  };
}

export function sayItContent() {
  const { x, z } = PARKED_CARS.find(({ model }) => model === "van");
  // Words mode can pick “Muchas gracias” as its first Spanish cue.
  const unrelatedSpeech = EDITION.id === "es" ? hintSource(GLOBAL_HINTS.g_clarify, "c_learning")
    : hintSource(GLOBAL_HINTS.g_social, "s_thanks");
  return {
    words: labels({ ...SAY_IT_UI, drive: ROAD_UI.drive }),
    target: EDITION.target,
    driveStart: { x, z: z - 1.85, rot: 0 }, reply: REPLY_KEYS[0],
    unrelatedSpeech: plain(unrelatedSpeech),
  };
}

export function wrongBilliardsCall({ ball, pocket }) {
  const otherPocket = pocket.endsWith("s") ? "fl" : "ls";
  return [`bl_b${ball}`, `bl_p_${otherPocket}`].map((key) =>
    conversationLine(BILLIARDS_SITUATION, BILLIARDS_NPC, key, BILLIARDS_LINES, false).en).join(" ");
}

export async function endCardContent(id, gender) {
  const sit = await loadSituation(id);
  const npc = NPCS[sit.npc];
  const options = { look: entityLookup(sit), addressee: npc.gender, speaker: gender, formal: !addressInformal(npc) };
  const answer = (group, hint, vars = {}) => compose(hintSource(group, hint), vars, options).en;
  const keepsake = keepsakeFor(id);
  return {
    answers: {
      howareyou: answer(GLOBAL_HINTS.g_howareyou, "h_pretty"),
      order: answer(sit.hints.order_drink, EDITION.id === "es" ? "please_only" : "ill_have", { X: "espresso" }),
      more: answer(sit.hints.more, "more_all"),
      dine: answer(sit.hints.dine, "dine_short"),
      pay: answer(sit.hints.pay, "pay_card_short"),
      receipt: answer(GLOBAL_HINTS.g_yesno, "yn_no_thanks"),
      closing: answer(GLOBAL_HINTS.g_social, "s_thanks"),
    },
    keepsake, voice: coachVoice(gender),
    words: {
      ...labels({ start: "Pradėti", send: "Siųsti", complete: "Užduotis įvykdyta!", phrase: "Tavo frazė", listen: "Klausyti",
        resume: "Tęsti", next: "Kita situacija", guide: "Nuvesk mane", journal: "Užduotys (J)", tasks: "Užduotys", close: "Uždaryti" }),
      cup: L(KIND[keepsake].nominative), got: L("Gavai {item}", { item: L(KIND[keepsake].accusative) }),
    },
  };
}

export function nextDestination(id) {
  const next = SITUATION_BY_ID[window.__ew.game.nextScenarioId(id)];
  return { id: next.id, ...objectiveLabels(next) };
}
