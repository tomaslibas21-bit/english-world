// Puerto Colibrí's batch 5 media (24 Nov 2026): Renata's album has a sticker for every thing to photograph and its
// own cover (public/photowalk/, the paths src/ui/PhotoWalk.tsx reads), the quest sounds are there, and every radio
// spot has its mixed recording in the clip list (g_radio_spot; the MP3s themselves are on R2).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTO_THINGS } from "../../src/editions/es/content/photo-walk-lines";
import { RADIO_SPOTS, RADIO_SPOT_VOICE } from "../../src/editions/es/content/radioSpots";
import { audioKey } from "../../src/audio-key";

const PUBLIC = join(import.meta.dirname, "../../public");

describe("Puerto Colibrí's quest and radio media", () => {
  it("has a small sticker for every photo-walk thing and the album cover", () => {
    for (const id of [...PHOTO_THINGS.map((t) => t.id), "cover"]) {
      const p = join(PUBLIC, "photowalk", `${id}.webp`);
      expect(existsSync(p), id).toBe(true);
      expect(statSync(p).size, id).toBeLessThan(90_000);
    }
  });
  it("has the quest sounds", () => {
    for (const f of ["shutter", "book-page", "sparkle", "arrive"]) expect(existsSync(join(PUBLIC, "sfx", `${f}.mp3`)), f).toBe(true);
  });
  it("lists a recording for every radio spot, jingles 4–8 s and ads 11–21 s", () => {
    const manifest: Record<string, number> = JSON.parse(readFileSync(join(PUBLIC, "audio-es/manifest.json"), "utf8"));
    expect(RADIO_SPOTS.length).toBe(12);
    for (const spot of RADIO_SPOTS) {
      const sec = manifest[audioKey(RADIO_SPOT_VOICE, 1, spot.id)];
      expect(sec, spot.id).toBeGreaterThan(spot.kind === "jingle" ? 4 : 11);
      expect(sec, spot.id).toBeLessThan(spot.kind === "jingle" ? 8 : 21);
    }
  });
});
