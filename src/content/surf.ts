// The surf lesson's words (the engine is src/game/surf/): which conversation holds the instructor's lines (its
// `lines` have one key "sg_<cue>" per cue of src/game/surf/logic.ts CUES, so the voices, the cards and every learner
// layer treat them as any conversation's lines) and who the instructor is.
export interface SurfContent {
  /** The conversation whose `lines` hold the cues, and the instructor (an id of NPCS). */
  situation: string;
  npc: string;
  /** The same lines by themselves (the conversation's own are used where it has them: a learner layer's text). */
  lines?: Record<string, import("./types").SentSrc[]>;
  /** A picture of what a cue asks for, where the edition has them (the lesson shows it beside her line): the folder
   *  under public/ and, per cue, the picture's file name without ".webp". An edition without pictures leaves it out. */
  pictures?: { dir: string; of: Record<string, string> };
}

/** Each move picture of Harbor Surf's lesson cards (public/scenes/x04-surf-game, the review round's pictures, the same
 *  stems as Puerto Colibrí's surf cards) and the cues it shows; the cues with none show her words alone. */
export const SURF_PICTURES: Record<string, string[]> = {
  boards: ["board_ask", "board_take_long", "board_take_short", "board_no", "board_yes", "b_long", "b_short", "b_sup"],
  lie: ["lie", "go_in"],
  paddle: ["paddle", "paddle_hard", "paddle_more", "paddle_long", "paddle_now", "almost"],
  duck: ["wave_duck", "duck_ok"],
  tumble: ["duck_miss", "wipeout", "missed", "you_ok", "what_happened", "nothing", "learn"],
  lineup: ["arrive", "wait", "look_horizon", "q_go", "prev_mine", "prev_yours"],
  small: ["not_this", "too_small", "let_pass", "not_that"],
  this_one: ["this_one", "coming", "turn", "turn_shore"],
  up: ["now_up", "up_ok", "hold", "first_wave", "shore", "slang1", "slang2", "slang3", "slang4"],
  left: ["lean_left", "left_short", "turn_left"],
  right: ["lean_right", "right_short", "turn_right"],
  knees: ["knees", "lower", "tip_knees"],
  eyes: ["look_front", "not_feet", "tip_feet"],
  speed: ["weight_fwd", "speed", "tip_back"],
  crest: ["up_face"],
  drop: ["down_face"],
  trick: ["trick", "tip_trick"],
};

export const SURF: SurfContent = {
  situation: "x04-surf", npc: "maren",
  pictures: { dir: "scenes/x04-surf-game", of: Object.fromEntries(Object.entries(SURF_PICTURES).flatMap(([pic, cues]) => cues.map((c) => [c, pic]))) },
};
