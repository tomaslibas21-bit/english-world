import type { GyMoveId } from "@/content/gym";

export type { GyMoveId };
export const targetLang = "es-MX";
export const learnerLang = "en";

export const GYM_UI = {
  readyTitle: "Workout with Mónica",
  readyTouch: "Listen and tap the picture that matches.",
  readyKeys: "Listen and choose a move with an arrow key or 1–4.",
  start: "Start",
  progress: (current: number, total: number) => `Move ${current} of ${total}`,
  exit: "Leave workout",
  replay: "Listen again",
  reveal: "Show words",
  choices: "Choose a move",
  scoreTitle: "Workout complete",
  completed: "Moves completed",
  firstTry: "Right on the first try",
  again: "Again",
  done: "Back to the gym",
} as const;

export const GYM_MOVE_LABELS = {
  jacks: "Do jumping jacks",
  toes: "Touch your feet",
  squats: "Do a squat",
  circles: "Circle your arms",
  run: "Run in place",
  reach: "Raise your arms",
  lunges: "Do a lunge",
  pushups: "Do a push-up",
} as const satisfies Record<GyMoveId, string>;
