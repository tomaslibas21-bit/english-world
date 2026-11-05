// How the town works in this edition. The engine is shared with the Spanish edition (branch spanish-edition), whose
// file of this name has many more switches, all off for Maple Harbor, and whose src/editions/es/game/world/theme.ts
// sets them for Puerto Colibrí. Maple Harbor takes one of them, on: the conversation's camera (5 Nov 2026).

export interface TownTheme {
  /** The conversation's camera (Game.startSession). Off (null), it frames the player, the main speaker and the
   *  conversation's other speakers within 7 m of them from a set distance (2.6 times how far apart they stand, at
   *  least 6 m), which a phone's narrow picture can cut. With this, the speakers within `reach` m of the main one are
   *  framed, and the camera backs off (to at most `max` m) until every one of them, head and chest, is in the part of
   *  the picture the conversation panel leaves free, at any screen shape, with nothing in front of them outdoors
   *  (Game.ts `fitTalk`). */
  talkCamera: { reach: number; max: number } | null;
}

export const THEME: TownTheme = {
  // Every speaker in the picture, a phone's too (Mark at Sophie's party, Mrs. Lee at her flower stall, Greg and
  // Vanessa at the meeting…). Further than Puerto Colibrí's 12 m and 30 m, because Maple Harbor's people stand where
  // they always have (Puerto Colibrí brought its far ones nearer): Harold guards the gallery 13.1 m from Ben's ticket
  // desk (s70), and Rita, 10.3 m from Mr. Patel in the apartment, fits a phone's picture only with the camera 36 m out
  // (p29, started from the list of conversations).
  talkCamera: { reach: 14, max: 40 },
};
