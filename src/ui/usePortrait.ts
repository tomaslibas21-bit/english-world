import { useEffect, useState } from "react";

/** The person's own face for the call screen: drawn once from their 3D figure (game/portrait.ts, loaded when first
 *  wanted); until it is there, and where it cannot be drawn, null (their initial is shown). */
export function usePortrait(npcId: string | null | undefined): string | null {
  const [face, setFace] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!npcId) return;
    let on = true;
    import("../game/portrait").then((m) => { if (on) setFace({ id: npcId, url: m.portrait(npcId) }); }, () => {});
    return () => { on = false; };
  }, [npcId]);
  return face && face.id === npcId ? face.url : null;
}
