// Puerto Colibrí's surf lesson (replaces src/content/surf.ts): Nayeli's commands are the "sg_…" lines of x01-surf
// (surf-lines.ts), in the three Spanishes like every line; and a picture of her doing what each command asks for
// (public/scenes-es/x01-surf-game/, made 15 Nov 2026: docs/es/PICTURES.md section 10).
import type { SurfContent } from "@/content/surf";
import { SURF_LINES } from "./surf-lines";
export type { SurfContent } from "@/content/surf";

/** Each picture and the cues it shows (~/puerto-colibri-pictures/x-new3/build_manifests.py "x01-surf-game"). The cues
 *  with none (her greeting, praise, the answers about a fall, the turn-taking's replies) show her words alone. */
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

export const SURF: SurfContent | null = {
  situation: "x01-surf", npc: "surf", lines: SURF_LINES,
  pictures: { dir: "scenes-es/x01-surf-game", of: Object.fromEntries(Object.entries(SURF_PICTURES).flatMap(([pic, cues]) => cues.map((c) => [c, pic]))) },
};
