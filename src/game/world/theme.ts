// How the town works in this edition. The engine is shared with the Spanish edition (branch spanish-edition), whose
// file of this name has many more switches, all off for Maple Harbor, and whose src/editions/es/game/world/theme.ts
// sets them for Puerto Colibrí. Maple Harbor takes two of them (5 Nov 2026): the conversation's camera, and the spots
// that bring far speakers into their conversation's picture.

export interface TownTheme {
  /** The conversation's camera (Game.startSession). Off (null), it frames the player, the main speaker and the
   *  conversation's other speakers within 7 m of them from a set distance (2.6 times how far apart they stand, at
   *  least 6 m), which a phone's narrow picture can cut. With this, the speakers within `reach` m of the main one are
   *  framed, and the camera backs off (to at most `max` m) until every one of them, head and chest, is in the part of
   *  the picture the conversation panel leaves free, at any screen shape, with nothing in front of them outdoors
   *  (Game.ts `fitTalk`). */
  talkCamera: { reach: number; max: number } | null;
  /** Where people stand in the rooms instead of where interiors.ts puts them, by room id and character (`ax`/`az`:
   *  where the player stands to talk to them): a conversation's other speaker near enough to share its picture. */
  roomSpots: Record<string, Record<string, { x: number; z: number; rot: number; ax?: number; az?: number }>>;
}

export const THEME: TownTheme = {
  // Every speaker in the picture, a phone's too (Mark at Sophie's party, Mrs. Lee at her flower stall, Greg and
  // Vanessa at the meeting…): the speakers within 12 m of the main one framed, the camera backing off to at most 30 m,
  // as in Puerto Colibrí
  talkCamera: { reach: 12, max: 30 },
  // and the two who stood too far away come nearer, where Puerto Colibrí's Don Arturo and Doña Lupita stand: Harold
  // watches over the statue by the gallery's entrance, near Ben's desk (s70: his "Please don't touch the paintings!"),
  // and Rita is in the hallway by the vacant apartment's door (s82: the new neighbor's door), with Mr. Patel just
  // inside it (s81), so that she can back the learner up from there on p29 (with him by the window, the door's leaf
  // hid her from a camera on his side)
  roomSpots: {
    museum: { harold: { x: -4.5, z: 0.3, rot: -0.53 } },
    apartments: { patel: { x: -1.2, z: 2.4, rot: 0.25 }, rita: { x: -4.4, z: 0.9, rot: 0.1, ax: -4.2, az: 3.1 } },
  },
};
