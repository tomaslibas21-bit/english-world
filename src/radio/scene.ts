// A talking scene that is not a conversation (the surf lesson; in Puerto Colibrí also the grotto, where the stones call)
// holds the radio for the whole of it, as a conversation does. Without this only each voice clip held it, so the music
// came back between the lines and dipped again at the next (owner, 27 Nov 2026). The usual resume applies after it.
import type { Radio } from "./radio";

/** Ties the "scene" hold to `running()`: checked now and whenever one of `sources` changes. */
export function holdForScenes(radio: Pick<Radio, "hold" | "release" | "setOpen">, running: () => boolean, sources: ((listener: () => void) => unknown)[]) {
  let held = false;
  const check = () => {
    const now = running();
    if (now === held) return;
    held = now;
    if (held) { radio.hold("scene"); radio.setOpen(false); } else radio.release("scene");
  };
  for (const subscribe of sources) subscribe(check);
  check();
}
