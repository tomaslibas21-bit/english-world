// Which expression a spoken line calls for (Character.express), from its words: the conversation gives each line its
// own. Cues in English and in Spanish (each edition's people speak one of them); a line with none is friendly when it
// is short or warm, neutral when it is long and plain (prices, directions).
import type { Mood } from "./Character";

const CONCERNED = /\b(sorry|afraid|unfortunately|apolog\w*|problem|trouble|wrong|worr\w+|lost|stolen|broken|hurts?|pain|sick|ill|fever|emergency|accident|careful|too late|delay\w*|cancel\w*|missed|sold out|can(?:no|')t|out of order|lo siento|perd[oó]n\w*|disculp\w+|lamento|lamentablemente|por desgracia|me temo|problemas?|preocup\w+|perdi\w*|perd[ií]\w*|rob\w+|rot[oa]s?|duele\w*|dolor|enferm\w+|fiebre|emergencia|accidente|cuidado|demasiado tarde|retras\w+|cancel\w+|agotad\w+|no se puede|no puedo|no funciona|qu[eé] pena|qu[eé] l[aá]stima)\b/i;
const SURPRISED = /(\breally\b|\bwow\b|\bno way\b|\boh my\b|\bwhat a surprise\b|\bseriously\b|\bare you (?:kidding|sure)\b|\bde verdad\b|\ben serio\b|\bno me digas\b|\bqu[eé] sorpresa\b|\bh[ií]jole\b|\bguau\b|\bc[oó]mo que\b|\?!|!\?|¿¡|¡¿)/i;
const FRIENDLY = /\b(hi|hello|hey|welcome|good (?:morning|afternoon|evening)|thanks?|thank you|great|perfect|wonderful|lovely|nice|glad|happy|enjoy|of course|sure|no problem|you're welcome|congratulations|have a (?:good|nice|great)|see you|take care|hola|bienvenid\w+|buen[oa]s? (?:d[ií]as?|tardes|noches)|gracias|genial|perfecto|estupendo|qu[eé] bien|qu[eé] gusto|encantad\w+|mucho gusto|con gusto|claro|por supuesto|de nada|felicidades|que (?:tenga|tengas|disfrute\w*|le vaya)|hasta (?:luego|pronto|ma[nñ]ana)|cu[ií]d[ae]\w*|buen provecho)\b/i;

export function moodOf(text: string): Mood {
  if (CONCERNED.test(text)) return "concerned";
  if (SURPRISED.test(text)) return "surprised";
  if (FRIENDLY.test(text) || text.includes("!") || text.length < 48) return "friendly";
  return "neutral";
}
