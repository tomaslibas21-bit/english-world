// Shared by the game and tools/build-audio.ts: the file name of a pre-generated voice clip.
export function audioKey(voice: string, speed: number, text: string): string {
  const s = `${voice}|${speed.toFixed(2)}|${text.trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let h2 = 0x9e3779b1;
  for (let i = s.length - 1; i >= 0; i--) { h2 ^= s.charCodeAt(i); h2 = Math.imul(h2, 0x85ebca6b) >>> 0; }
  return h.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0").slice(0, 4);
}

/** The player's name can't be pre-recorded, so a line like "Thanks, Rūta!" is voiced as "Thanks!".
 *  Only names used as a form of address are removed; returns null when nothing changed. */
export function withoutAddressedNames(text: string, names: string[]): string | null {
  let s = text;
  for (const raw of names) {
    const n = raw.trim();
    if (!n) continue;
    const N = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const title = "(?:(?:Mr|Ms|Mrs|Miss)\\.?\\s+)?";
    s = s
      .replace(new RegExp(`,\\s*${title}${N}(?=\\s*[.!?,])`, "g"), "")                       // "Thanks, Rūta!" / "So, Rūta, …"
      .replace(new RegExp(`^${title}${N},\\s*`), "")                                        // "Rūta, your coffee!"
      .replace(new RegExp(`\\b(hi|hey|hello|thanks|bye|welcome|morning)\\s+${title}${N}\\b`, "gi"), "$1"); // "Hi Rūta!"
  }
  if (s === text) return null;
  s = s.replace(/\s+([,.!?])/g, "$1").replace(/,\s*([.!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : null;
}
