export function portraitToolbarRows({ hasHelp, hasRadio, hasCourse }: { hasHelp: boolean; hasRadio: boolean; hasCourse: boolean }) {
  // Six town actions and LR are always visible when the drawer is open.
  const single = 7 + Number(hasHelp) + Number(hasRadio) + Number(hasCourse);
  return { single, split: Math.ceil(single / 2) };
}
