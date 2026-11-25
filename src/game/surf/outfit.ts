import type { Look } from "../../content/npcs";
import { useStore } from "../../state/store";
import { Character } from "../characters/Character";
import type { GameCharacter } from "../characters";

export function surfLook(look: Look): Look {
  const { backpack, carry, phone, ...identity } = look;
  return {
    ...identity,
    rash: true,
    sleeves: "short",
    swim: "trunks",
    shorts: false,
    skirt: false,
    flipflops: true,
    shoes: look.skin,
    acc: look.acc?.filter((a) => a === "beard" || a === "mustache" || a === "earrings" || a === "flower"),
  };
}

export class SurfOutfit {
  private original: GameCharacter | null = null;
  private surfPlayer: Character | null = null;
  private visible = true;

  constructor(private player: () => GameCharacter, private replace: (player: GameCharacter) => void) {}

  get active() { return this.original !== null && this.player() === this.surfPlayer && !!this.surfPlayer?.root.visible; }

  enter() {
    if (this.original) return;
    const profile = useStore.getState().progress.profile;
    if (!profile) return;
    // The town may use a styled character. Surf poses use the block rig.
    const next = this.surfPlayer ??= new Character(surfLook({ ...profile.look, female: profile.look.female ?? profile.gender === "f" }));
    this.original = this.player();
    this.visible = this.original.root.visible;
    next.fidgets = false;
    this.swap(this.original, next);
  }

  restore() {
    const original = this.original;
    if (!original) return;
    this.swap(this.player(), original);
    original.root.rotation.order = "XYZ";
    original.root.visible = this.visible;
    this.original = null;
  }

  dispose() {
    this.restore();
    this.surfPlayer?.dispose();
    this.surfPlayer = null;
  }

  private swap(before: GameCharacter, after: GameCharacter) {
    const parent = before.root.parent;
    after.root.position.copy(before.root.position);
    after.root.rotation.copy(before.root.rotation);
    after.root.scale.copy(before.root.scale);
    after.root.visible = true;
    after.setAnim(before.anim);
    before.root.removeFromParent();
    parent?.add(after.root);
    this.replace(after);
  }
}
