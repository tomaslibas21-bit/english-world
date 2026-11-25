import type { AnchorKind, ClassifiedCue, TalkPersonality } from "../game/talkNatural/contract";

const reserved: TalkPersonality = { armChance: 0.45, farewell: "yes", energy: 0.75 };
const sociable: TalkPersonality = { armChance: 0.70, farewell: "wave", energy: 1.25 };
const steady: TalkPersonality = { armChance: 0.55, farewell: "heart", energy: 1 };
const PERSONALITIES: Record<string, TalkPersonality> = {
  diaz: reserved, walter: reserved, priya: reserved, aaron: reserved,
  vinnie: sociable, dan: sociable, earl: sociable, mia: sociable,
  sam: sociable, emma: sociable, nora: sociable,
};

export function talkPersonality(actorId: string) {
  return PERSONALITIES[actorId] ?? steady;
}

const goodbye = /\b(?:goodbye|bye(?:-bye)?|have (?:a (?:good|great|nice|safe) (?:one|day|night|evening|trip|flight|weekend)|fun)|safe travels|enjoy (?:your (?:stay|trip|walk|visit)|maple harbor))\b|(?:^|[.!]\s*|,\s*)(?:take care(?=$|[,.!])|good night(?=$|[.!])|see you(?: (?:later|soon|then|tomorrow|next time))?(?=$|[.!]))/i;
const offer = /\b(?:here you (?:go|are)|here(?:['’]s| (?:is|are)) (?:your|the|a|an|some)\b|i(?:'ll|’ll| will) (?:get|bring|give) you\b)/i;
const lateral = /\b(?:turn|take a|keep|bear) (?:to the )?(left|right)\b|\b(?:on|to) (?:your|the) (left|right)\b/i;
const directions = /\b(?:(?:go|walk|head) (?:straight|down|up|along|past|toward)|cross (?:the|main|center|harbor)\b|next to|across from|around the corner|over there)\b/i;
const uncertain = /\b(?:not sure|i (?:don't|don’t|do not) know|did you say|did you mean|let me (?:check|think)|i think|maybe|what was that|could you (?:say|repeat))\b/i;
const countable = /\b(one|two|three|[123])\s+(?:more\s+)?(?:tickets?|stops?|cups?|coffees?|lattes?|espressos?|sugars?|shots?|bags?|boxes|people|adults?|kids?|children|seats?|drinks?|items?|copies|rooms?|nights?|days?|blocks?|minutes?)\b/i;
const quantities: Record<string, 1 | 2 | 3> = { one: 1, two: 2, three: 3, 1: 1, 2: 2, 3: 3 };
const greeting = /^(?:hi|hey|hello|good (?:morning|afternoon|evening)|welcome|(?:nice|good|great) to (?:see|meet) you)\b/i;
const openQuestion = /(?:^|[.!]\s*|,\s*)(?:what|where|when|which|why|how|who|anything else)\b[^.!]*\?/i;

const roomReferences: Record<string, readonly [AnchorKind, RegExp][]> = {
  "visitor-center": [["map", /\bmap\b/i]],
  "sunny-cup": [["menu", /\b(?:menu|(?:chalk)?board)\b/i]],
  station: [["machine", /\b(?:ticket machine|the machine|kiosk)\b/i]],
};
const ticketHandoff = /\b(?:tickets?|change|receipt|student id|schedule|(?:credit |debit )?card|cash|here you (?:go|are))\b/i;

/** Classify the composed spoken line. Room references can accompany a head or hand cue. */
export function classifyTalk(say: string, room: string, opening: boolean, closing = false, replay = false): ClassifiedCue {
  if (replay) return { family: "repeat" };
  const text = say.trim();
  const handoff = offer.test(text);
  const anchor = roomReferences[room]?.find(([, match]) => match.test(text))?.[0] ??
    (handoff && (room === "sunny-cup" || (room === "station" && ticketHandoff.test(text))) ? "handoff" : undefined);
  if (goodbye.test(text) || (closing && (/^enjoy[.!]?$/i.test(text) || /\b(?:good night|enjoy your (?:drink|meal)|thanks? for (?:coming|stopping by))\b/i.test(text)))) return { family: "goodbye", anchor };
  if (handoff || /\b(?:would you like|want) (?:a|an|some)\b/i.test(text)) return { family: "offer", anchor };
  const turn = lateral.exec(text);
  if (turn) return { family: "point", side: (turn[1] ?? turn[2]).toLowerCase() === "left" ? -1 : 1, anchor };
  if (directions.test(text)) return { family: "point", anchor };
  if (uncertain.test(text)) return { family: "shrug", anchor };
  if (/^(?:yes|yeah|yep|sure|of course|no problem)\b/i.test(text)) return { family: "yes", anchor };
  if (/^(?:nope\b|no(?=\s*[,!.?]|$))/i.test(text)) return { family: "no", anchor };
  const quantity = countable.exec(text)?.[1];
  if (quantity) return { family: "count", quantity: quantities[quantity.toLowerCase()], anchor };
  if (opening && greeting.test(text)) return { family: "greeting", anchor };
  if (openQuestion.test(text)) return { family: "question", anchor };
  return { family: "rest", anchor };
}
