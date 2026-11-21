export type HelpLevel = 0 | 1 | 2;
export interface HelpProgress { level: HelpLevel; streak: number }

export function updateHelp(saved: HelpProgress | undefined, clean: boolean, successes = 3): HelpProgress {
  const { level, streak } = saved ?? { level: 0, streak: 0 };
  if (!clean) return { level: level === 2 ? 1 : 0, streak: 0 };
  if (level === 2) return { level, streak: 0 };
  return streak + 1 < successes
    ? { level, streak: streak + 1 }
    : { level: level === 0 ? 1 : 2, streak: 0 };
}

export function actionHelp(level: HelpLevel, elapsed: number, delay = 2) {
  return { gloss: level === 0, action: level === 0 || (level === 1 && elapsed >= delay) };
}
