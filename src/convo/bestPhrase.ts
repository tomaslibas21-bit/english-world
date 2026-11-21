export interface BestPhrase {
  en: string;
  nat: string;
  say: string;
  spoken: boolean;
  score: number;
}

export function bestPhrase(current: BestPhrase | null, answer: BestPhrase): BestPhrase {
  if (!current) return answer;
  if (answer.spoken !== current.spoken) return answer.spoken ? answer : current;
  return answer.score >= current.score ? answer : current;
}
